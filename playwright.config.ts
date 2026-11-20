import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	timeout: 60_000,
	retries: process.env.CI ? 1 : 0,
	use: { baseURL: 'http://localhost:4173', acceptDownloads: true },
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	],
	webServer: { command: 'npm run build && npm run preview', port: 4173, reuseExistingServer: !process.env.CI }
});
