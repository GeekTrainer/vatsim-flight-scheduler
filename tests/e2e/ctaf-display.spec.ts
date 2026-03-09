import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers, mockVatsimDataEmpty } from './fixtures/vatsim-data';

/**
 * Mock CTAF API response helper
 */
function mockCTAFEndpoint(page: import('@playwright/test').Page, responses: Record<string, number | null>) {
	return page.route('**/api/ctaf/**', async (route) => {
		const url = route.request().url();
		const icao = url.split('/api/ctaf/')[1]?.split('?')[0]?.toUpperCase();
		const frequency = responses[icao] ?? null;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ frequency, source: frequency ? 'cache' : 'ourairports' })
		});
	});
}

test.describe('CTAF Frequency Display', () => {
	test.beforeEach(async ({ page }) => {
		// Mock VATSIM API
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockVatsimDataWithControllers)
			});
		});
		// Mock FAA DATIS to avoid external calls
		await page.route('https://datis.clowd.io/api/*', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		});
	});

	test('should show CTAF badge when no upper coverage and CTAF is available', async ({ page }) => {
		// BWI has only DEL controller - no CTR (ZDC), no APP, no TWR
		await mockCTAFEndpoint(page, { 'KBWI': 119.4 });

		await page.goto('/flight/KBWI-KPHX');

		// BWI has no upper ATC coverage (no CTR, no APP, no TWR) - should show CTAF
		const depSection = page.getByTestId('flight-departure-section');
		await expect(depSection).toBeVisible();

		// Find the TWR badge in departure section - it should show CTAF
		const twrBadge = depSection.getByTestId('atc-badge-twr');
		await expect(twrBadge).toHaveAttribute('data-status', 'ctaf');
		await expect(twrBadge.getByTestId('ctaf-frequency')).toContainText('119.4');
	});

	test('should show normal TWR badge when tower is online (not CTAF)', async ({ page }) => {
		// PHX has TWR controller in the fixture
		await mockCTAFEndpoint(page, { 'KPHX': 118.7 });

		await page.goto('/flight/KPHX-KLAS');

		// PHX has tower online - should show normal TWR badge, not CTAF
		const depSection = page.getByTestId('flight-departure-section');
		await expect(depSection).toBeVisible();

		const twrBadge = depSection.getByTestId('atc-badge-twr');
		await expect(twrBadge).toHaveAttribute('data-status', 'online');
	});

	test('should show CTAF when no upper coverage (CTR/APP/TWR) even with GND/DEL online', async ({ page }) => {
		// DEN has only GND in fixture - no TWR. Should still show CTAF
		await mockCTAFEndpoint(page, { 'KDEN': 132.75 });

		await page.goto('/flight/KDEN-KPHX');

		const depSection = page.getByTestId('flight-departure-section');
		await expect(depSection).toBeVisible();

		const twrBadge = depSection.getByTestId('atc-badge-twr');
		await expect(twrBadge).toHaveAttribute('data-status', 'ctaf');
		await expect(twrBadge.getByTestId('ctaf-frequency')).toContainText('132.75');
	});

	test('should NOT show CTAF when center provides top-down coverage', async ({ page }) => {
		// BUR has no TWR/GND/DEL controllers, but ZLA CTR and SOCAL APP are online
		// With top-down coverage, CTR covers TWR responsibilities — no CTAF needed
		await mockCTAFEndpoint(page, { 'KBUR': 121.9 });

		await page.goto('/flight/KBUR-KPHX');

		const depSection = page.getByTestId('flight-departure-section');
		await expect(depSection).toBeVisible();

		// BUR has ZLA CTR coverage — TWR badge should be offline, NOT CTAF
		const twrBadge = depSection.getByTestId('atc-badge-twr');
		await expect(twrBadge).toHaveAttribute('data-status', 'offline');
	});

	test('should show offline badge when CTAF API returns null', async ({ page }) => {
		// BWI has no tower, and CTAF API returns null
		await mockCTAFEndpoint(page, { 'KBWI': null });

		await page.goto('/flight/KBWI-KPHX');

		const depSection = page.getByTestId('flight-departure-section');
		await expect(depSection).toBeVisible();

		const twrBadge = depSection.getByTestId('atc-badge-twr');
		await expect(twrBadge).toHaveAttribute('data-status', 'offline');
	});

	test('should handle CTAF API failure gracefully', async ({ page }) => {
		// Mock API to return 502
		await page.route('**/api/ctaf/**', async (route) => {
			await route.fulfill({ status: 502, body: '{"error":"Fetch failed"}' });
		});

		await page.goto('/flight/KBWI-KPHX');

		// Should still show the page without crashing - TWR badge offline
		const depSection = page.getByTestId('flight-departure-section');
		await expect(depSection).toBeVisible();

		const twrBadge = depSection.getByTestId('atc-badge-twr');
		await expect(twrBadge).toHaveAttribute('data-status', 'offline');
	});
});
