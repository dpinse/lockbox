import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const PASSWORD = 'correct horse battery staple';
const original = Buffer.from('hello from lockbox\n'.repeat(10_000)); // ~190 KB, several chunks
type Upload = { name: string; buffer: Buffer };

/** Clicks `click`, then takes the file either from the streamed download or, on the in-memory path, from Save. */
async function download(page: Page, click: () => Promise<void>) {
	const streamed = page.waitForEvent('download', { timeout: 30_000 });
	await click();
	const save = page.getByRole('link', { name: /^Save/ }).first();
	const first = await Promise.race([streamed.then(() => 'download' as const), save.waitFor().then(() => 'save' as const)]);
	const d = first === 'download' ? await streamed : (await Promise.all([page.waitForEvent('download'), save.click()]))[0];
	return { name: d.suggestedFilename(), buffer: await readFile(await d.path()) };
}

const choose = (page: Page, files: Upload[]) =>
	page.getByLabel('Browse files').setInputFiles(files.map((f) => ({ ...f, mimeType: 'application/octet-stream' })));
const next = (page: Page) => page.getByRole('button', { name: 'Next' }).click();
const passwordBox = (page: Page) => page.getByRole('textbox', { name: 'Password' });

async function encryptWithPassword(page: Page, files: Upload[], { bundle = false } = {}) {
	await page.goto('/');
	await choose(page, files);
	if (bundle) await page.getByLabel('Bundle into one lockbox file').check();
	await next(page);
	await passwordBox(page).fill(PASSWORD);
	await next(page);
}

async function decryptWithPassword(page: Page, file: Upload, password: string) {
	await page.goto('/decrypt');
	await choose(page, [file]);
	await next(page);
	await passwordBox(page).fill(password);
	await next(page);
}

const encryptButton = (page: Page) => page.getByRole('button', { name: /^Encrypt (file|bundle|\d+ files)$/ });
const decryptButton = (page: Page) => page.getByRole('button', { name: /^Decrypt (file|\d+ files)$/ });

for (const via of ['in-memory fallback', 'service worker'] as const) {
	test(`password round trip via ${via}`, async ({ browser }) => {
		const context = await browser.newContext({ serviceWorkers: via === 'service worker' ? 'allow' : 'block' });
		const page = await context.newPage();
		await page.goto('/');
		if (via === 'service worker') await page.waitForFunction(() => navigator.serviceWorker.ready);
		expect(await page.evaluate(() => !!navigator.serviceWorker?.controller)).toBe(via === 'service worker');

		await encryptWithPassword(page, [{ name: 'notes.txt', buffer: original }]);
		const sealed = await download(page, () => encryptButton(page).click());
		expect(sealed.name).toBe('notes.txt.lockbox');
		expect(sealed.buffer.subarray(0, 7).toString()).toBe('LOCKBOX');
		await expect(page.locator('.seal-list li[data-state="sealed"]')).toBeVisible();

		await decryptWithPassword(page, sealed, PASSWORD);
		const opened = await download(page, () => decryptButton(page).click());
		expect(opened.name).toBe('notes.txt');
		expect(opened.buffer.equals(original)).toBe(true);
		await expect(page.locator('.seal-list li[data-state="intact"]')).toBeVisible();
		await context.close();
	});
}

test('wrong password shows an error and starts no download', async ({ page }) => {
	await encryptWithPassword(page, [{ name: 'notes.txt', buffer: original }]);
	const sealed = await download(page, () => encryptButton(page).click());

	await decryptWithPassword(page, sealed, 'not the password');
	let downloaded = false;
	page.on('download', () => (downloaded = true));
	await decryptButton(page).click();
	await expect(page.getByText('Wrong password or key')).toBeVisible({ timeout: 15_000 });
	expect(downloaded).toBe(false);
});

test('a tampered file shows a broken seal', async ({ page }) => {
	await encryptWithPassword(page, [{ name: 'notes.txt', buffer: original }]);
	const sealed = await download(page, () => encryptButton(page).click());
	const tampered = Buffer.from(sealed.buffer);
	tampered[tampered.length - 100] ^= 1; // inside the last chunk, after the first chunk verified

	await decryptWithPassword(page, { name: sealed.name, buffer: tampered }, PASSWORD);
	await decryptButton(page).click();
	await expect(page.getByText('Seal broken')).toBeVisible({ timeout: 15_000 });
});

test('bundle produces one dated .zip.lockbox', async ({ page }) => {
	await encryptWithPassword(
		page,
		[
			{ name: 'a.txt', buffer: Buffer.from('a') },
			{ name: 'b.txt', buffer: Buffer.from('b') }
		],
		{ bundle: true }
	);
	const sealed = await download(page, () => encryptButton(page).click());
	expect(sealed.name).toMatch(/^lockbox-\d{4}-\d{2}-\d{2}\.zip\.lockbox$/);

	await decryptWithPassword(page, sealed, PASSWORD);
	const zip = await download(page, () => decryptButton(page).click());
	expect(zip.buffer.subarray(0, 2).toString()).toBe('PK');
});

test('key mode round trip with generated keys', async ({ page }) => {
	const keys = async () => {
		await page.goto('/keys');
		await page.getByRole('button', { name: /Create a/ }).click();
		const shown = page.locator('p.key');
		return { pub: await shown.nth(0).innerText(), priv: await shown.nth(1).innerText() };
	};
	const alice = await keys();
	const bob = await keys();

	await page.goto('/');
	await choose(page, [{ name: 'secret.bin', buffer: original }]);
	await next(page);
	await page.getByRole('radiogroup', { name: 'Encrypt with' }).getByText('Key', { exact: true }).click();
	await page.getByRole('textbox', { name: 'Your private key' }).fill(alice.priv);
	await page.getByRole('textbox', { name: "Recipient's public key" }).fill(bob.pub);
	await next(page);
	const sealed = await download(page, () => encryptButton(page).click());

	await page.goto('/decrypt');
	await choose(page, [sealed]);
	await next(page);
	await page.getByRole('textbox', { name: 'Your private key' }).fill(bob.priv);
	await page.getByRole('textbox', { name: "Sender's public key" }).fill(alice.pub);
	await next(page);
	const opened = await download(page, () => decryptButton(page).click());
	expect(opened.buffer.equals(original)).toBe(true);
});

test('memory-held results are guarded until saved', async ({ browser }) => {
	const context = await browser.newContext({ serviceWorkers: 'block' });
	const page = await context.newPage();
	await encryptWithPassword(page, [
		{ name: 'a.txt', buffer: Buffer.from('a') },
		{ name: 'b.txt', buffer: Buffer.from('b') }
	]);
	await encryptButton(page).click();
	await expect(page.getByRole('button', { name: 'Save all (2)' })).toBeVisible({ timeout: 30_000 });

	// Starting over with unsaved files asks first instead of discarding them.
	await page.getByRole('button', { name: 'Encrypt more files' }).click();
	await expect(page.getByText('2 files are not saved yet.')).toBeVisible();

	// Save all downloads both and clears the warning.
	const downloads: string[] = [];
	page.on('download', (d) => downloads.push(d.suggestedFilename()));
	await page.getByRole('button', { name: 'Save all' }).click();
	await expect(page.locator('.seal-list').getByText('Saved to your downloads')).toHaveCount(2);
	await expect.poll(() => downloads.sort()).toEqual(['a.txt.lockbox', 'b.txt.lockbox']);
	await expect(page.getByText('not saved yet')).toHaveCount(0);

	// Once everything is saved, starting over needs no confirmation.
	await page.getByRole('button', { name: 'Encrypt more files' }).click();
	await expect(page.getByRole('heading', { name: 'Choose files' })).toBeVisible();
	await expect(page.getByLabel('Browse files')).toBeAttached();
	await context.close();
});

test('steps work from the keyboard and move focus to the opened step', async ({ page }) => {
	await page.goto('/');
	await choose(page, [{ name: 'notes.txt', buffer: original }]);
	await page.getByRole('button', { name: 'Next' }).focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('heading', { name: 'Choose a password or key' })).toBeFocused();

	// Enter in the password field submits the step, but only once the password is long enough.
	await passwordBox(page).fill('too short');
	await passwordBox(page).press('Enter');
	await expect(page.getByRole('heading', { name: 'Choose a password or key' })).toBeVisible();
	await passwordBox(page).fill(PASSWORD);
	await passwordBox(page).press('Enter');
	await expect(page.getByRole('heading', { name: 'Encrypt and save' })).toBeFocused();
});

test('a small file that will not open stays in step 3 with a retry', async ({ page }) => {
	await encryptWithPassword(page, [{ name: 'tiny.txt', buffer: Buffer.from('a short note') }]);
	const sealed = await download(page, () => encryptButton(page).click());
	const tampered = Buffer.from(sealed.buffer);
	tampered[tampered.length - 5] ^= 1; // single chunk: indistinguishable from a wrong password

	await decryptWithPassword(page, { name: sealed.name, buffer: tampered }, PASSWORD);
	await decryptButton(page).click();
	await expect(page.locator('.seal-list li[data-state="locked"]')).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText('or the file was changed after sealing')).toBeVisible();

	await page.getByRole('button', { name: 'Try another password' }).click();
	await expect(page.getByRole('heading', { name: 'Enter the password' })).toBeFocused();
	await expect(page.getByText('1 file', { exact: true })).toBeVisible(); // the chosen file is kept
});
