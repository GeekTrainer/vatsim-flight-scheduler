import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Focuses on core user flows with mocked VATSIM API
 */
export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'list',
	
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			testIgnore: /mobile.*\.spec\.ts/,
		},
		{
			name: 'mobile',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 390, height: 844 },
				isMobile: true,
			},
			testMatch: /mobile.*\.spec\.ts/,
		},
	],

	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
	},
});
