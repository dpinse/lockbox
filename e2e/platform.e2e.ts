import { expect, test } from '@playwright/test';

test('pages load with no CSP violations', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (m) => {
		if (/Content[- ]Security[- ]Policy|CSP/i.test(m.text())) violations.push(m.text());
	});
	await page.addInitScript(() =>
		document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`))
	);
	for (const path of ['/', '/decrypt', '/keys']) {
		await page.goto(path);
		await expect(page.locator('main h1')).toBeVisible();
	}
	await page.getByRole('button', { name: 'Create a key pair' }).click();
	await page.getByRole('button', { name: 'QR code' }).click();
	await expect(page.locator('.qr svg')).toBeVisible();
	expect(violations).toEqual([]);
});

test('works offline after the first visit', async ({ page, context, browserName }) => {
	test.skip(browserName !== 'chromium', 'offline emulation with service workers is only reliable in Chromium');
	await page.goto('/');
	await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => !!navigator.serviceWorker.controller));
	await context.setOffline(true);
	for (const path of ['/', '/decrypt', '/keys']) {
		await page.goto(path);
		await expect(page.locator('main h1')).toBeVisible();
	}
	await context.setOffline(false);
});
