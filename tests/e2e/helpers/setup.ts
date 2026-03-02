import { type Page, expect } from '@playwright/test';
import { mockVatsimDataEmpty, mockVatsimDataWithControllers } from '../fixtures/vatsim-data';
import { mockFaaDatisPhx, mockFaaDatisLas } from '../fixtures/faa-datis';
import { VATSIM_API_URL } from '../fixtures/test-constants';

/**
 * Sets up page with mocked VATSIM API returning no controllers
 */
export async function setupWithEmptyVatsimData(page: Page) {
await page.route(VATSIM_API_URL, async (route) => {
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
await page.route(VATSIM_API_URL, async (route) => {
await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
});
await page.goto('/');

// Wait for user guide to be visible (observable result that loading is complete)
// User guide appears when isLoading=false AND hasActiveFilters=false
await expect(page.getByTestId('user-guide')).toBeVisible();
}

/**
 * Sets up page with mocked VATSIM API + FAA D-ATIS for flight detail pages
 */
export async function setupWithFlightPageMocks(page: Page) {
await Promise.all([
page.route(VATSIM_API_URL, async (route) => {
await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVatsimDataWithControllers) });
}),
page.route('https://atis.info/api/KPHX', async (route) => {
await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFaaDatisPhx) });
}),
page.route('https://atis.info/api/KLAS', async (route) => {
await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFaaDatisLas) });
}),
page.route('https://www.simbrief.com/api/**', async (route) => {
await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
})
]);
}
