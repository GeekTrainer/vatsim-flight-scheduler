import { test, expect } from '@playwright/test';
import { mockVatsimDataEmpty, mockVatsimDataWithControllers } from './fixtures/vatsim-data';
import { mockFaaDatisPhx } from './fixtures/faa-datis';
import { mockMetarKeug, mockMetarEmpty } from './fixtures/metar-data';
import { VATSIM_API_URL, METAR_API_URL } from './fixtures/test-constants';

/**
 * Tests for METAR fallback when FAA D-ATIS is unavailable.
 * Uses KBUR→KEUG as the canonical test route:
 * - KBUR has D-ATIS available (larger airport)
 * - KEUG has no D-ATIS, so METAR is shown as fallback
 */
test.describe('METAR Fallback for Airports Without ATIS', () => {
	/**
	 * Standard setup: KBUR has D-ATIS, KEUG has no D-ATIS but has METAR
	 */
	async function setupMetarFallbackMocks(page: import('@playwright/test').Page) {
		await Promise.all([
			page.route(VATSIM_API_URL, async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVatsimDataEmpty) });
			}),
			// KBUR has D-ATIS
			page.route('https://atis.info/api/KBUR', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFaaDatisPhx) });
			}),
			// KEUG has no D-ATIS (404)
			page.route('https://atis.info/api/KEUG', async (route) => {
				await route.fulfill({ status: 404 });
			}),
			// KEUG METAR available via server proxy
			page.route(`${METAR_API_URL}/KEUG`, async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMetarKeug) });
			}),
			page.route('https://www.simbrief.com/api/**', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
			})
		]);
	}

	test('should show METAR badge and source label when D-ATIS is unavailable', async ({ page }) => {
		await setupMetarFallbackMocks(page);
		await page.goto('/flight/KBUR-KEUG');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// KEUG arrival should show METAR on the Real World tab
		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KEUG');
		await expect(arrAtis).toBeVisible();

		// Should auto-select Real World tab (no VATSIM ATIS)
		const realworldContent = arrAtis.getByTestId('atis-content-realworld');
		await expect(realworldContent).toBeVisible();

		// Should show METAR badge (not D-ATIS code)
		await expect(arrAtis.getByTestId('metar-badge-KEUG')).toBeVisible();
		await expect(arrAtis.getByTestId('metar-badge-KEUG')).toContainText('METAR');

		// Should show NOAA source label
		await expect(realworldContent).toContainText('Source: NOAA Aviation Weather');
	});

	test('should display wind and altimeter summary from METAR data', async ({ page }) => {
		await setupMetarFallbackMocks(page);
		await page.goto('/flight/KBUR-KEUG');

		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KEUG');
		await expect(arrAtis).toBeVisible();

		// Summary should show parsed wind and altimeter from METAR
		// METAR: 20008KT ... A2989
		const summary = arrAtis.getByTestId('atis-summary');
		await expect(summary).toBeVisible();
		await expect(arrAtis.getByTestId('atis-summary-wind')).toContainText('200°');
		await expect(arrAtis.getByTestId('atis-summary-wind')).toContainText('8kt');
		await expect(arrAtis.getByTestId('atis-summary-altimeter')).toContainText('29.89');
	});

	test('should display raw METAR text', async ({ page }) => {
		await setupMetarFallbackMocks(page);
		await page.goto('/flight/KBUR-KEUG');

		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KEUG');
		await expect(arrAtis.getByTestId('atis-text-KEUG')).toContainText('METAR KEUG 100054Z 20008KT');
	});

	test('should show observation time from METAR', async ({ page }) => {
		await setupMetarFallbackMocks(page);
		await page.goto('/flight/KBUR-KEUG');

		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KEUG');
		await expect(arrAtis.getByTestId('atis-content-realworld')).toContainText('Observed');
	});

	test('should still show D-ATIS normally for airports that have it', async ({ page }) => {
		await setupMetarFallbackMocks(page);
		await page.goto('/flight/KBUR-KEUG');

		// KBUR departure should show D-ATIS (not METAR)
		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KBUR');
		await expect(depAtis).toBeVisible();

		// Switch to Real World tab
		await depAtis.getByTestId('atis-tab-realworld').click();
		const realworldContent = depAtis.getByTestId('atis-content-realworld');
		await expect(realworldContent).toBeVisible();

		// Should show D-ATIS source label, not METAR
		await expect(realworldContent).toContainText('Source: FAA D-ATIS');
		// Should NOT have a METAR badge
		await expect(depAtis.getByTestId('metar-badge-KBUR')).not.toBeVisible();
	});

	test('should show green dot on Real World tab when METAR is available', async ({ page }) => {
		await setupMetarFallbackMocks(page);
		await page.goto('/flight/KBUR-KEUG');

		// The Real World tab for KEUG should be selected (auto-selected when no VATSIM ATIS)
		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KEUG');
		const realWorldTab = arrAtis.getByTestId('atis-tab-realworld');
		await expect(realWorldTab).toHaveAttribute('aria-selected', 'true');
	});
});

test.describe('METAR Fallback - No Data Available', () => {
	test('should show empty state when neither D-ATIS nor METAR is available', async ({ page }) => {
		await Promise.all([
			page.route(VATSIM_API_URL, async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVatsimDataEmpty) });
			}),
			// No D-ATIS
			page.route('https://atis.info/api/KBUR', async (route) => {
				await route.fulfill({ status: 404 });
			}),
			page.route('https://atis.info/api/KEUG', async (route) => {
				await route.fulfill({ status: 404 });
			}),
			// No METAR either
			page.route(`${METAR_API_URL}/*`, async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMetarEmpty) });
			}),
			page.route('https://www.simbrief.com/api/**', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
			})
		]);

		await page.goto('/flight/KBUR-KEUG');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Both airports should show empty state on Real World tab
		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KEUG');
		const realworldContent = arrAtis.getByTestId('atis-content-realworld');
		await expect(realworldContent).toBeVisible();
		await expect(arrAtis.getByTestId('atis-empty-KEUG')).toContainText('No weather data available');
	});

	test('should handle METAR API failure gracefully', async ({ page }) => {
		await Promise.all([
			page.route(VATSIM_API_URL, async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVatsimDataEmpty) });
			}),
			// No D-ATIS
			page.route('https://atis.info/api/*', async (route) => {
				await route.fulfill({ status: 404 });
			}),
			// METAR API errors
			page.route(`${METAR_API_URL}/*`, async (route) => {
				await route.fulfill({ status: 502 });
			}),
			page.route('https://www.simbrief.com/api/**', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
			})
		]);

		await page.goto('/flight/KBUR-KEUG');

		// Page should still render without crashing
		await expect(page.getByTestId('flight-page')).toBeVisible();
		await expect(page.getByTestId('flight-departure-code')).toContainText('KBUR');
		await expect(page.getByTestId('flight-arrival-code')).toContainText('KEUG');
	});
});

test.describe('METAR Fallback - VATSIM ATIS Takes Priority', () => {
	test('should show VATSIM ATIS tab when available, even with METAR fallback on Real World', async ({ page }) => {
		await Promise.all([
			page.route(VATSIM_API_URL, async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVatsimDataWithControllers) });
			}),
			// KPHX has D-ATIS
			page.route('https://atis.info/api/KPHX', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFaaDatisPhx) });
			}),
			// KEUG has no D-ATIS
			page.route('https://atis.info/api/KEUG', async (route) => {
				await route.fulfill({ status: 404 });
			}),
			// KEUG has METAR
			page.route(`${METAR_API_URL}/KEUG`, async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMetarKeug) });
			}),
			page.route('https://www.simbrief.com/api/**', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
			})
		]);

		await page.goto('/flight/KPHX-KEUG');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Departure (KPHX) should show VATSIM ATIS by default (it has VATSIM ATIS in mock data)
		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KPHX');
		await expect(depAtis.getByTestId('atis-content-vatsim')).toBeVisible();
		await expect(depAtis.getByTestId('atis-text-KPHX')).toContainText('PHX ATIS INFO S');

		// Arrival (KEUG) should show Real World tab with METAR (no VATSIM ATIS for KEUG)
		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KEUG');
		await expect(arrAtis.getByTestId('atis-content-realworld')).toBeVisible();
		await expect(arrAtis.getByTestId('metar-badge-KEUG')).toBeVisible();
	});
});
