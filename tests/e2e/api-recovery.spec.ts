import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers, mockVatsimDataEmpty } from './fixtures/vatsim-data';
import { VATSIM_API_URL } from './fixtures/test-constants';

/**
 * E2E tests verifying the application handles VATSIM API failures
 * gracefully and recovers when the API comes back online.
 */

test.describe('API Recovery', () => {
	test('VATSIM API fails then recovers on next auto-refresh', async ({ page }) => {
		// This test waits for the 30s refresh cycle
		test.setTimeout(90000);

		let requestCount = 0;
		await page.route(VATSIM_API_URL, async (route) => {
			requestCount++;
			if (requestCount === 1) {
				await route.fulfill({ status: 500 });
			} else {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(mockVatsimDataWithControllers)
				});
			}
		});

		await page.goto('/');

		// After first (failed) load, isLoading becomes false → user-guide shows
		await expect(page.getByTestId('user-guide')).toBeVisible({ timeout: 10000 });

		// Select PHX as departure to show routes
		await page.getByTestId('departure-airport-select').selectOption('PHX');
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible({ timeout: 10000 });

		// Expand PHX to see ATC badges
		await page.getByTestId('expand-button-PHX').click();
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		// Initially, ATC badges should be offline (no controller data from failed request)
		const phxDepartureGroup = page.getByTestId('departure-group-PHX');
		const twrBadge = phxDepartureGroup.locator('[data-testid="atc-badge-twr"]').first();
		await expect(twrBadge).toHaveAttribute('data-status', 'offline');

		// Wait for the 30s auto-refresh cycle to recover with valid data.
		// The badge should transition from offline → online once the second request succeeds.
		await expect(twrBadge).toHaveAttribute('data-status', 'online', { timeout: 45000 });
	});

	test('page remains functional after API error', async ({ page }) => {
		// Mock VATSIM API to always return 500
		await page.route(VATSIM_API_URL, async (route) => {
			await route.fulfill({ status: 500 });
		});

		await page.goto('/');

		// After API error, isLoading becomes false → user-guide shows
		await expect(page.getByTestId('user-guide')).toBeVisible({ timeout: 10000 });

		// Filter controls should still be usable
		const departureSelect = page.getByTestId('departure-airport-select');
		await expect(departureSelect).toBeVisible();

		// Can select an airport (routes are loaded statically, not from VATSIM)
		await departureSelect.selectOption('PHX');
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible({ timeout: 10000 });

		// Arrival select should also work
		const arrivalSelect = page.getByTestId('arrival-airport-select');
		await expect(arrivalSelect).toBeVisible();
	});
});
