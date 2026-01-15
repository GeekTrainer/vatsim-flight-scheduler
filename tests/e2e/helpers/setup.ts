import { type Page, expect } from '@playwright/test';
import { mockVatsimDataEmpty, mockVatsimDataWithControllers } from '../fixtures/vatsim-data';

/**
 * Sets up page with mocked VATSIM API returning no controllers
 */
export async function setupWithEmptyVatsimData(page: Page) {
	await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
		await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataEmpty) });
	});
	await page.goto('/');
	
	// Wait for user guide to be visible (observable result that loading is complete)
	// User guide appears when isLoading=false AND hasActiveFilters=false
	await expect(page.getByTestId('user-guide')).toBeVisible();
}

/**
 * Sets up page with mocked VATSIM API returning active controllers
 */
export async function setupWithControllers(page: Page) {
	await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
		await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
	});
	await page.goto('/');
	
	// Wait for user guide to be visible (observable result that loading is complete)
	// User guide appears when isLoading=false AND hasActiveFilters=false
	await expect(page.getByTestId('user-guide')).toBeVisible();
}
