import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const PASSWORD = 'correct horse battery staple';
const original = Buffer.from('hello from lockbox\n'.repeat(10_000)); // ~190 KB, several chunks

async function download(page: Page, click: () => Promise<void>) {
	const [d] = await Promise.all([page.waitForEvent('download'), click()]);
	return { name: d.suggestedFilename(), bytes: await readFile(await d.path()) };
}

async function encryptWithPassword(page: Page, files: { name: string; buffer: Buffer }[]) {
	await page.goto('/');
	await page.getByLabel('Files').setInputFiles(files.map((f) => ({ ...f, mimeType: 'application/octet-stream' })));
	await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
}

async function decrypt(page: Page, file: { name: string; bytes: Buffer }, password: string) {
	await page.goto('/decrypt');
	await page.getByLabel('Lockbox files').setInputFiles({ name: file.name, mimeType: 'application/octet-stream', buffer: file.bytes });
	await page.getByRole('textbox', { name: 'Password' }).fill(password);
}

for (const via of ['in-memory fallback', 'service worker'] as const) {
	test(`password round trip via ${via}`, async ({ browser }) => {
		const context = await browser.newContext({ serviceWorkers: via === 'service worker' ? 'allow' : 'block' });
		const page = await context.newPage();
		await page.goto('/');
		if (via === 'service worker') await page.waitForFunction(() => navigator.serviceWorker.ready);
		expect(await page.evaluate(() => !!navigator.serviceWorker?.controller)).toBe(via === 'service worker');
		await encryptWithPassword(page, [{ name: 'notes.txt', buffer: original }]);
		const sealed = await download(page, () => page.getByRole('button', { name: 'Encrypt' }).click());
		expect(sealed.name).toBe('notes.txt.lockbox');
		expect(sealed.bytes.subarray(0, 7).toString()).toBe('LOCKBOX');

		await decrypt(page, sealed, PASSWORD);
		const opened = await download(page, () => page.getByRole('button', { name: 'Decrypt' }).click());
		expect(opened.name).toBe('notes.txt');
		expect(opened.bytes.equals(original)).toBe(true);
		await context.close();
	});
}

test('wrong password shows an error and starts no download', async ({ page }) => {
	await encryptWithPassword(page, [{ name: 'notes.txt', buffer: original }]);
	const sealed = await download(page, () => page.getByRole('button', { name: 'Encrypt' }).click());

	await decrypt(page, sealed, 'not the password');
	let downloaded = false;
	page.on('download', () => (downloaded = true));
	await page.getByRole('button', { name: 'Decrypt' }).click();
	await expect(page.getByText('Wrong password or key')).toBeVisible({ timeout: 15_000 });
	expect(downloaded).toBe(false);
});

test('bundle produces one dated .zip.lockbox', async ({ page }) => {
	await encryptWithPassword(page, [
		{ name: 'a.txt', buffer: Buffer.from('a') },
		{ name: 'b.txt', buffer: Buffer.from('b') }
	]);
	await page.getByLabel('Bundle into one Lockbox file').check();
	const sealed = await download(page, () => page.getByRole('button', { name: 'Encrypt' }).click());
	expect(sealed.name).toMatch(/^lockbox-\d{4}-\d{2}-\d{2}\.zip\.lockbox$/);

	await decrypt(page, sealed, PASSWORD);
	const zip = await download(page, () => page.getByRole('button', { name: 'Decrypt' }).click());
	expect(zip.bytes.subarray(0, 2).toString()).toBe('PK');
});

test('key mode round trip with generated keys', async ({ page }) => {
	const keys = async () => {
		await page.goto('/keys');
		await page.getByRole('button', { name: /Generate/ }).click();
		const codes = page.locator('code');
		return { pub: await codes.nth(0).innerText(), priv: await codes.nth(2).innerText() };
	};
	const alice = await keys();
	const bob = await keys();

	await page.goto('/');
	await page.getByLabel('Files').setInputFiles({ name: 'secret.bin', mimeType: 'application/octet-stream', buffer: original });
	await page.getByLabel('Key', { exact: true }).check();
	await page.getByLabel('Your private key').fill(alice.priv);
	await page.getByLabel("Recipient's public key").fill(bob.pub);
	const sealed = await download(page, () => page.getByRole('button', { name: 'Encrypt' }).click());

	await page.goto('/decrypt');
	await page.getByLabel('Lockbox files').setInputFiles({ name: sealed.name, mimeType: 'application/octet-stream', buffer: sealed.bytes });
	await page.getByLabel('Your private key').fill(bob.priv);
	await page.getByLabel("Sender's public key").fill(alice.pub);
	const opened = await download(page, () => page.getByRole('button', { name: 'Decrypt' }).click());
	expect(opened.bytes.equals(original)).toBe(true);
});
