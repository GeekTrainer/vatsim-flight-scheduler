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
	
	// Wait for VATSIM data to finish loading (observable result)
	await expect(page.getByTestId('loading-state')).not.toBeVisible();
}

/**
 * Sets up page with mocked VATSIM API returning active controllers
 */
export async function setupWithControllers(page: Page) {
	await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
		await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
	});
	await page.goto('/');
	
	// Wait for VATSIM data to finish loading (observable result)
	await expect(page.getByTestId('loading-state')).not.toBeVisible();
}
