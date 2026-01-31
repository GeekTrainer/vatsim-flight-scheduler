import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
	test('should handle API 500 error gracefully', async ({ page }) => {
		// Mock VATSIM API returning 500
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ 
				status: 500, 
				body: 'Internal Server Error',
				headers: { 'Content-Type': 'text/plain' }
			});
		});

		await page.goto('/');

		// Page should still load
		await expect(page.getByRole('heading', { name: 'VATSIM Flight Scheduler', level: 1 })).toBeVisible();

		// User guide should be visible
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Application should still be functional for basic interactions
		const departureSelect = page.getByTestId('departure-airport-select');
		await departureSelect.selectOption('PHX');
		await expect(departureSelect).toHaveValue('PHX');
	});

	test('should handle network timeout gracefully', async ({ page }) => {
		// Mock VATSIM API with long delay (simulating timeout)
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			// Don't fulfill the route - let it timeout
			// In a real timeout scenario, Playwright will eventually fail the request
			await new Promise(resolve => setTimeout(resolve, 100));
			await route.abort('timedout');
		});

		await page.goto('/');

		// Page should still load despite timeout
		await expect(page.getByRole('heading', { name: 'VATSIM Flight Scheduler', level: 1 })).toBeVisible();

		// User guide should be visible (no data loaded)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Filter controls should be interactive
		await expect(page.getByTestId('departure-airport-select')).toBeEnabled();
	});

	test('should handle malformed JSON response gracefully', async ({ page }) => {
		// Mock VATSIM API returning invalid JSON
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ 
				status: 200, 
				body: '{ invalid json here }',
				headers: { 'Content-Type': 'application/json' }
			});
		});

		await page.goto('/');

		// Page should still load
		await expect(page.getByRole('heading', { name: 'VATSIM Flight Scheduler', level: 1 })).toBeVisible();

		// User guide should be visible (data failed to parse)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Application should still allow user interactions
		await page.getByTestId('departure-airport-select').selectOption('PHX');
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();
	});
});
