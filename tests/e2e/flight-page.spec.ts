import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers, mockVatsimDataEmpty } from './fixtures/vatsim-data';

const mockFaaDatisPhx = [
	{
		airport: 'KPHX',
		type: 'combined',
		code: 'R',
		datis: 'PHX ATIS INFO R 2350Z. 24010KT 10SM FEW250 35/12 A2990. VISUAL APPROACHES IN USE. LANDING AND DEPARTING RWY 25L AND 25R. ADVS YOU HAVE INFO R.'
	}
];

const mockFaaDatisLas = [
	{
		airport: 'KLAS',
		type: 'combined',
		code: 'B',
		datis: 'LAS ATIS INFO B 2345Z. 21008KT 10SM CLR 30/08 A2985. ILS APPROACHES IN USE. LANDING RWY 26L AND 26R. ADVS YOU HAVE INFO B.'
	}
];

function setupMocks(page: import('@playwright/test').Page) {
	return Promise.all([
		page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockVatsimDataWithControllers)
			});
		}),
		page.route('https://atis.info/api/KPHX', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockFaaDatisPhx)
			});
		}),
		page.route('https://atis.info/api/KLAS', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockFaaDatisLas)
			});
		})
	]);
}

test.describe('Flight Detail Page', () => {
	test('should navigate to flight page when clicking arrival airport', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/');

		// Wait for page to finish loading (user guide appears when no filters active)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select PHX as departure to show routes
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Wait for departure group to appear after filter is applied
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible({ timeout: 10000 });

		// Expand PHX departure group
		await page.getByTestId('expand-button-PHX').click();

		// Wait for arrivals section to expand
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).toBeVisible();

		// Click on a Las Vegas arrival link
		const flightLink = page.getByTestId('flight-link-KPHX-KLAS');
		await expect(flightLink).toBeVisible();
		await flightLink.click();

		await expect(page).toHaveURL(/\/flight\/KPHX-KLAS/);
	});

	test('should display both airports on flight page', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		await expect(page.getByTestId('flight-page')).toBeVisible();
		await expect(page.getByTestId('flight-departure-code')).toContainText('KPHX');
		await expect(page.getByTestId('flight-arrival-code')).toContainText('KLAS');
	});

	test('should display ATC status for both airports', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		// Departure section should have ATC display
		const depSection = page.getByTestId('flight-departure-section');
		await expect(depSection).toBeVisible();

		// Arrival section should have ATC display
		const arrSection = page.getByTestId('flight-arrival-section');
		await expect(arrSection).toBeVisible();
	});

	test('should show VATSIM ATIS by default', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		// VATSIM tab should be active by default for departure
		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KPHX');
		await expect(depAtis).toBeVisible();

		const vatsimContent = depAtis.getByTestId('atis-content-vatsim');
		await expect(vatsimContent).toBeVisible();

		// Should show ATIS text from VATSIM mock data
		await expect(depAtis.getByTestId('atis-text-KPHX')).toContainText('PHX ATIS INFO S');
		await expect(depAtis.getByTestId('atis-code-KPHX')).toContainText('Info S');
	});

	test('should show arrival VATSIM ATIS', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KLAS');
		await expect(arrAtis).toBeVisible();

		await expect(arrAtis.getByTestId('atis-text-KLAS')).toContainText('LAS ATIS INFO A');
		await expect(arrAtis.getByTestId('atis-code-KLAS')).toContainText('Info A');
	});

	test('should switch to Real World ATIS tab', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KPHX');
		await expect(depAtis).toBeVisible();

		// Click Real World tab
		await depAtis.getByTestId('atis-tab-realworld').click();

		// Should show Real World content area with mocked FAA data
		const realworldContent = depAtis.getByTestId('atis-content-realworld');
		await expect(realworldContent).toBeVisible();
		await expect(depAtis.getByTestId('atis-text-KPHX')).toContainText('PHX ATIS INFO R');
		await expect(depAtis.getByTestId('atis-code-KPHX')).toContainText('Info R');

		// VATSIM content should be hidden
		await expect(depAtis.getByTestId('atis-content-vatsim')).not.toBeVisible();
	});

	test('should switch tabs back to VATSIM', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KPHX');

		// Switch to Real World then back
		await depAtis.getByTestId('atis-tab-realworld').click();
		await expect(depAtis.getByTestId('atis-content-realworld')).toBeVisible();

		await depAtis.getByTestId('atis-tab-vatsim').click();
		await expect(depAtis.getByTestId('atis-content-vatsim')).toBeVisible();
	});

	test('should navigate back to routes page', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		const backLink = page.getByTestId('flight-back-link');
		await expect(backLink).toBeVisible();
		await backLink.click();

		await expect(page).toHaveURL('/');
	});

	test('should default to Real World tab when no VATSIM ATIS available', async ({ page }) => {
		// Use empty VATSIM data (no ATIS stations)
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockVatsimDataEmpty)
			});
		});
		// Mock FAA D-ATIS with data so Real World tab has content
		await page.route('https://atis.info/api/KPHX', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockFaaDatisPhx)
			});
		});
		await page.route('https://atis.info/api/KLAS', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockFaaDatisLas)
			});
		});

		await page.goto('/flight/KPHX-KLAS');

		// With no VATSIM ATIS, should default to Real World tab
		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KPHX');
		await expect(depAtis.getByTestId('atis-content-realworld')).toBeVisible();
		await expect(depAtis.getByTestId('atis-text-KPHX')).toContainText('PHX ATIS INFO R');

		// Switching to VATSIM tab should show empty state
		await depAtis.getByTestId('atis-tab-vatsim').click();
		await expect(depAtis.getByTestId('atis-content-vatsim')).toBeVisible();
		await expect(depAtis.getByTestId('atis-empty-KPHX')).toContainText('No VATSIM ATIS available');
	});

	test('should have correct page title', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		await expect(page).toHaveTitle(/KPHX.*KLAS.*VATSIM Flight Scheduler/);
	});

	test('should display ATIS summary with wind and altimeter', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KPHX');
		await expect(depAtis).toBeVisible();

		// Summary should show parsed wind and altimeter from mock data
		const summary = depAtis.getByTestId('atis-summary');
		await expect(summary).toBeVisible();
		await expect(depAtis.getByTestId('atis-summary-wind')).toContainText('240°');
		await expect(depAtis.getByTestId('atis-summary-wind')).toContainText('10kt');
		await expect(depAtis.getByTestId('atis-summary-altimeter')).toContainText('29.90');
	});

	test('should display runway info in ATIS summary', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KPHX');
		await expect(depAtis).toBeVisible();

		// PHX mock has "LANDING AND DEPARTING RWY 25L AND 25R"
		await expect(depAtis.getByTestId('atis-summary-arrivals')).toContainText('25L');
		await expect(depAtis.getByTestId('atis-summary-departures')).toContainText('25L');
	});

	test('should show arrival runway info with approach type', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		const arrAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KLAS');
		await expect(arrAtis).toBeVisible();

		// LAS mock has "ILS APPROACHES IN USE" and "LANDING RWY 26L AND 26R"
		await expect(arrAtis.getByTestId('atis-summary-arrivals')).toContainText('26L');
	});

	test('should show summary on Real World tab too', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		const depAtis = page.getByTestId('desktop-layout').getByTestId('atis-display-KPHX');
		await depAtis.getByTestId('atis-tab-realworld').click();

		// Real World tab should also show a summary card
		await expect(depAtis.getByTestId('atis-content-realworld')).toBeVisible();
		await expect(depAtis.getByTestId('atis-summary')).toBeVisible();
		await expect(depAtis.getByTestId('atis-summary-altimeter')).toBeVisible();
	});
});
