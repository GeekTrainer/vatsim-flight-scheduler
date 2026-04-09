import { test, expect } from '@playwright/test';
import { mockVatsimDataEmpty } from './fixtures/vatsim-data';
import { mockFaaDatisPhx, mockFaaDatisDen } from './fixtures/faa-datis';
import { VATSIM_API_URL } from './fixtures/test-constants';

/**
 * Tests for split ATIS airports (separate arrival/departure ATIS).
 * Uses KDEN as the canonical example: arrivals on 34R/35L/35R, departures on 8/34L.
 * Verifies that the merge logic correctly assigns runways to arrival vs departure buckets.
 */
test.describe('Split ATIS - Separate Arrival/Departure', () => {
	test.beforeEach(async ({ page }) => {
		await Promise.all([
			// Empty VATSIM data so we test FAA D-ATIS only
			page.route(VATSIM_API_URL, async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVatsimDataEmpty) });
			}),
			// PHX has combined ATIS
			page.route('https://atis.info/api/KPHX', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFaaDatisPhx) });
			}),
			// DEN has split ATIS (arr + dep entries)
			page.route('https://atis.info/api/KDEN', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFaaDatisDen) });
			}),
			page.route('https://www.simbrief.com/api/**', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
			})
		]);
	});

	test('arrival airport should show correct arrival runways from arrival ATIS', async ({ page }) => {
		// KDEN is the arrival airport — its arrival ATIS lists 34R, 35L, 35R
		await page.goto('/flight/KPHX-KDEN');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Switch to Real World tab for the arrival section
		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KDEN');
		await expect(arrAtis).toBeVisible();
		await arrAtis.getByTestId('atis-tab-realworld').click();

		// Wait for ATIS content to load
		const atisContent = arrAtis.getByTestId('atis-content-realworld');
		await expect(atisContent).toBeVisible();

		// Verify the ATIS summary shows correct arrival runways (34R, 35L, 35R)
		const arrRunways = arrAtis.getByTestId('atis-summary-arrivals');
		await expect(arrRunways).toBeVisible();
		await expect(arrRunways).toContainText('34R');
		await expect(arrRunways).toContainText('35L');
		await expect(arrRunways).toContainText('35R');
	});

	test('arrival airport should show correct departure runways from departure ATIS', async ({ page }) => {
		// KDEN departure ATIS lists RWY 8 and RUNWAY 3 4 LEFT (→ 34L)
		await page.goto('/flight/KPHX-KDEN');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KDEN');
		await arrAtis.getByTestId('atis-tab-realworld').click();

		const depRunways = arrAtis.getByTestId('atis-summary-departures');
		await expect(depRunways).toBeVisible();
		await expect(depRunways).toContainText('8');
		await expect(depRunways).toContainText('34L');
	});

	test('arrival runways should NOT contain departure-only runways', async ({ page }) => {
		// The departure ATIS has RWY 8 — this should NOT appear in the arrival runway list
		await page.goto('/flight/KPHX-KDEN');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KDEN');
		await arrAtis.getByTestId('atis-tab-realworld').click();

		const arrRunways = arrAtis.getByTestId('atis-summary-arrivals');
		await expect(arrRunways).toBeVisible();
		// RWY 8 is departure-only — must not appear in arrivals
		await expect(arrRunways).not.toContainText(/\b8\b/);
	});

	test('departure runways should NOT contain arrival-only runways', async ({ page }) => {
		// 35L and 35R are in arrival ATIS but not departure ATIS
		await page.goto('/flight/KPHX-KDEN');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KDEN');
		await arrAtis.getByTestId('atis-tab-realworld').click();

		const depRunways = arrAtis.getByTestId('atis-summary-departures');
		await expect(depRunways).toBeVisible();
		// 35L and 35R are arrival-only — must not appear in departures
		await expect(depRunways).not.toContainText('35L');
		await expect(depRunways).not.toContainText('35R');
	});

	test('NOTAM runways should not appear in any runway list', async ({ page }) => {
		// Both ATIS texts contain "NOTICE TO AIRMEN. RWY 7/25 CLSD."
		// Neither 7 nor 25 should appear in any runway summary
		await page.goto('/flight/KPHX-KDEN');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KDEN');
		await arrAtis.getByTestId('atis-tab-realworld').click();

		// Get the full ATIS summary area
		const summary = arrAtis.getByTestId('atis-summary');
		await expect(summary).toBeVisible();
		// RWY 7/25 from NOTAM section should be excluded
		await expect(summary).not.toContainText(/\b7\b/);
		await expect(summary).not.toContainText(/\b25\b/);
	});

	test('combined ATIS airport should still work normally', async ({ page }) => {
		// PHX has combined ATIS — departure airport in this route
		await page.goto('/flight/KPHX-KDEN');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KPHX');
		await depAtis.getByTestId('atis-tab-realworld').click();

		const atisContent = depAtis.getByTestId('atis-content-realworld');
		await expect(atisContent).toBeVisible();

		// PHX has landing/departing 25L and 25R
		const arrRunways = depAtis.getByTestId('atis-summary-arrivals');
		await expect(arrRunways).toBeVisible();
		await expect(arrRunways).toContainText('25L');
		await expect(arrRunways).toContainText('25R');
	});
});

/**
 * Tests split ATIS when KDEN is the DEPARTURE airport (KDEN-KPHX route).
 * The departure section should show departure ATIS as primary, with
 * arrival runways sourced from the arrival ATIS.
 */
test.describe('Split ATIS - KDEN as Departure', () => {
	test.beforeEach(async ({ page }) => {
		await Promise.all([
			page.route(VATSIM_API_URL, async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVatsimDataEmpty) });
			}),
			page.route('https://atis.info/api/KDEN', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFaaDatisDen) });
			}),
			page.route('https://atis.info/api/KPHX', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFaaDatisPhx) });
			}),
			page.route('https://www.simbrief.com/api/**', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
			})
		]);
	});

	test('departure airport should show correct departure runways from departure ATIS', async ({ page }) => {
		// KDEN is the departure — its departure ATIS lists RWY 8 and RUNWAY 3 4 LEFT (→ 34L)
		await page.goto('/flight/KDEN-KPHX');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KDEN');
		await depAtis.getByTestId('atis-tab-realworld').click();

		const depRunways = depAtis.getByTestId('atis-summary-departures');
		await expect(depRunways).toBeVisible();
		await expect(depRunways).toContainText('8');
		await expect(depRunways).toContainText('34L');
	});

	test('departure airport should show correct arrival runways from arrival ATIS', async ({ page }) => {
		// KDEN arrival ATIS lists 34R, 35L, 35R
		await page.goto('/flight/KDEN-KPHX');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KDEN');
		await depAtis.getByTestId('atis-tab-realworld').click();

		const arrRunways = depAtis.getByTestId('atis-summary-arrivals');
		await expect(arrRunways).toBeVisible();
		await expect(arrRunways).toContainText('34R');
		await expect(arrRunways).toContainText('35L');
		await expect(arrRunways).toContainText('35R');
	});

	test('departure side should not cross-contaminate arrival runways into departures', async ({ page }) => {
		await page.goto('/flight/KDEN-KPHX');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KDEN');
		await depAtis.getByTestId('atis-tab-realworld').click();

		// 35L and 35R are arrival-only — must not appear in departures
		const depRunways = depAtis.getByTestId('atis-summary-departures');
		await expect(depRunways).toBeVisible();
		await expect(depRunways).not.toContainText('35L');
		await expect(depRunways).not.toContainText('35R');

		// RWY 8 is departure-only — must not appear in arrivals
		const arrRunways = depAtis.getByTestId('atis-summary-arrivals');
		await expect(arrRunways).toBeVisible();
		await expect(arrRunways).not.toContainText(/\b8\b/);
	});
});
