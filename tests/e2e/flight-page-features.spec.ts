import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers, mockVatsimDataEmpty } from './fixtures/vatsim-data';
import { mockFaaDatisPhx, mockFaaDatisLas } from './fixtures/faa-datis';
import { mockSimBriefMatchingPlan } from './fixtures/simbrief-data';
import { VATSIM_API_URL } from './fixtures/test-constants';

/**
 * Custom VATSIM data with a connected pilot (CID 1234567)
 */
const mockVatsimDataWithPilot = {
	...mockVatsimDataWithControllers,
	pilots: [
		{
			cid: 1234567,
			name: 'Test Pilot',
			callsign: 'SWA1234',
			server: 'USA-EAST',
			pilot_rating: 1,
			latitude: 33.434,
			longitude: -112.012,
			altitude: 1135,
			groundspeed: 0,
			transponder: '1200',
			heading: 250,
			qnh_i_hg: 29.92,
			qnh_mb: 1013,
			flight_plan: null,
			logon_time: '2026-01-13T23:00:00.0000000Z',
			last_updated: '2026-01-13T23:50:00.0000000Z'
		}
	],
	prefiles: []
};

/**
 * Custom VATSIM data with a prefiled flight plan (CID 1234567)
 */
const mockVatsimDataWithPrefile = {
	...mockVatsimDataWithControllers,
	pilots: [],
	prefiles: [
		{
			cid: 1234567,
			name: 'Test Pilot',
			callsign: 'SWA1234',
			flight_plan: {
				flight_rules: 'I',
				aircraft: 'B738',
				departure: 'KPHX',
				arrival: 'KLAS',
				alternate: '',
				cruise_tas: '460',
				altitude: 'FL350',
				route: 'PXR J80 TBC'
			}
		}
	]
};

/**
 * Sets up all mocks for the flight page with custom VATSIM data
 */
async function setupFlightPageWithVatsimData(
	page: import('@playwright/test').Page,
	vatsimData: object,
	options?: { failFaa?: boolean; simbriefPlan?: object }
) {
	await page.route(VATSIM_API_URL, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(vatsimData)
		});
	});

	if (options?.failFaa) {
		await page.route('https://atis.info/api/*', async (route) => {
			await route.fulfill({ status: 500 });
		});
	} else {
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
		// Catch any other ATIS requests
		await page.route('https://atis.info/api/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([])
			});
		});
	}

	const plan = options?.simbriefPlan ?? {};
	await page.route('https://www.simbrief.com/api/**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(plan)
		});
	});
}

test.describe('Flight Page - Enroute Center Display', () => {
	test('should display enroute center badges with correct online/offline status', async ({
		page
	}) => {
		// Set up SimBrief username so Load button appears
		await page.goto('/settings');
		await page.evaluate(() => localStorage.setItem('simbrief_username', 'testpilot'));

		await setupFlightPageWithVatsimData(page, mockVatsimDataWithControllers, {
			simbriefPlan: mockSimBriefMatchingPlan
		});

		await page.goto('/flight/KPHX-KLAS');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Load SimBrief plan to display enroute centers
		await page.getByTestId('simbrief-load-button').first().click();

		// Wait for enroute centers container to appear (scope to desktop layout)
		const centersContainer = page.getByTestId('enroute-centers').first();
		await expect(centersContainer).toBeVisible();

		// PHX is in ZAB (Albuquerque Center) — no ZAB controller in mock → offline
		const zabCenter = centersContainer.getByTestId('enroute-center-ZAB');
		await expect(zabCenter).toBeVisible();
		await expect(zabCenter).toHaveAttribute('data-status', 'offline');

		// LAS is in ZLA (Los Angeles Center) — ZLA_85_CTR is online in mock → online
		const zlaCenter = centersContainer.getByTestId('enroute-center-ZLA');
		await expect(zlaCenter).toBeVisible();
		await expect(zlaCenter).toHaveAttribute('data-status', 'online');
	});
});

test.describe('Flight Page - VATSIM Flight Status Badge', () => {
	test('should show Connected status when CID is in pilots array', async ({ page }) => {
		// Configure CID and SimBrief username
		await page.goto('/settings');
		await page.evaluate(() => {
			localStorage.setItem('vatsim_cid', '1234567');
			localStorage.setItem('simbrief_username', 'testpilot');
		});

		// Mock with pilot data and SimBrief plan
		await setupFlightPageWithVatsimData(page, mockVatsimDataWithPilot, {
			simbriefPlan: mockSimBriefMatchingPlan
		});

		await page.goto('/flight/KPHX-KLAS');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Load SimBrief plan (status badge only shows when plan is loaded)
		await page.getByTestId('simbrief-load-button').first().click();

		// Verify Connected status badge
		const statusBadge = page.getByTestId('vatsim-status');
		await expect(statusBadge).toBeVisible();
		await expect(statusBadge).toContainText('Connected');
	});

	test('should show Filed status when CID is in prefiles array', async ({ page }) => {
		await page.goto('/settings');
		await page.evaluate(() => {
			localStorage.setItem('vatsim_cid', '1234567');
			localStorage.setItem('simbrief_username', 'testpilot');
		});

		await setupFlightPageWithVatsimData(page, mockVatsimDataWithPrefile, {
			simbriefPlan: mockSimBriefMatchingPlan
		});

		await page.goto('/flight/KPHX-KLAS');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		await page.getByTestId('simbrief-load-button').first().click();

		const statusBadge = page.getByTestId('vatsim-status');
		await expect(statusBadge).toBeVisible();
		await expect(statusBadge).toContainText('Filed');
	});

	test('should not show status badge when no CID is configured', async ({ page }) => {
		await page.goto('/settings');
		await page.evaluate(() => {
			localStorage.removeItem('vatsim_cid');
			localStorage.setItem('simbrief_username', 'testpilot');
		});

		await setupFlightPageWithVatsimData(page, mockVatsimDataWithControllers, {
			simbriefPlan: mockSimBriefMatchingPlan
		});

		await page.goto('/flight/KPHX-KLAS');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Load plan
		await page.getByTestId('simbrief-load-button').first().click();

		// Status badge should not be visible (no CID → not-filed → prefile link instead)
		await expect(page.getByTestId('vatsim-status')).not.toBeVisible();

		// Prefile link should be visible instead
		await expect(page.getByTestId('vatsim-prefile-link')).toBeVisible();
	});

	test('should show prefile link when plan loaded but CID not filed on VATSIM', async ({
		page
	}) => {
		// CID is set but not found in pilots or prefiles
		await page.goto('/settings');
		await page.evaluate(() => {
			localStorage.setItem('vatsim_cid', '9999999');
			localStorage.setItem('simbrief_username', 'testpilot');
		});

		// Mock with standard controllers data (no pilots/prefiles with CID 9999999)
		await setupFlightPageWithVatsimData(page, mockVatsimDataWithControllers, {
			simbriefPlan: mockSimBriefMatchingPlan
		});

		await page.goto('/flight/KPHX-KLAS');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		await page.getByTestId('simbrief-load-button').first().click();

		// Status badge should not be visible (CID not found → not-filed)
		await expect(page.getByTestId('vatsim-status')).not.toBeVisible();

		// Prefile link should be visible
		const prefileLink = page.getByTestId('vatsim-prefile-link');
		await expect(prefileLink).toBeVisible();
		await expect(prefileLink).toHaveAttribute('href', /my\.vatsim\.net\/pilots\/flightplan/);
	});
});

test.describe('Flight Page - Consolidated TRACON Visibility', () => {
	test('should show SOCAL_APP as online approach for LAX arrival', async ({ page }) => {
		// Navigate to a route with LAX as arrival (SOCAL covers LAX)
		await page.route(VATSIM_API_URL, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockVatsimDataWithControllers)
			});
		});
		// Mock FAA ATIS for both airports
		await page.route('https://atis.info/api/KPHX', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockFaaDatisPhx)
			});
		});
		await page.route('https://atis.info/api/KLAX', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						airport: 'KLAX',
						type: 'combined',
						code: 'C',
						datis:
							'LAX ATIS INFO C 2350Z. 25010KT 10SM FEW250 28/15 A2992. ILS APPROACHES IN USE. LANDING RWY 24L AND 24R. ADVS YOU HAVE INFO C.'
					}
				])
			});
		});
		await page.route('https://atis.info/api/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([])
			});
		});
		await page.route('https://www.simbrief.com/api/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({})
			});
		});

		await page.goto('/flight/KPHX-KLAX');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// The arrival section (KLAX) should have an online APP badge from SOCAL_APP
		const arrivalSection = page.getByTestId('flight-arrival-section');
		await expect(arrivalSection).toBeVisible();

		const appBadge = arrivalSection.getByTestId('atc-badge-app');
		await expect(appBadge).toBeVisible();
		await expect(appBadge).toHaveAttribute('data-status', 'online');

		// Verify SOCAL_APP callsign is displayed in the badge
		await expect(
			arrivalSection.getByTestId('controller-callsign-SOCAL_APP')
		).toBeVisible();
	});
});

test.describe('Flight Page - Double API Failure', () => {
	test('should render page gracefully when both VATSIM and FAA ATIS APIs fail', async ({
		page
	}) => {
		// Mock VATSIM API returning 500
		await page.route(VATSIM_API_URL, async (route) => {
			await route.fulfill({
				status: 500,
				body: 'Internal Server Error',
				headers: { 'Content-Type': 'text/plain' }
			});
		});

		// Mock FAA ATIS API returning 500
		await page.route('https://atis.info/api/*', async (route) => {
			await route.fulfill({ status: 500 });
		});

		// Mock SimBrief API (still functional)
		await page.route('https://www.simbrief.com/api/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({})
			});
		});

		await page.goto('/flight/KPHX-KLAS');

		// Page should still render without crashing
		await expect(page.getByTestId('flight-page')).toBeVisible();
		await expect(page.getByTestId('flight-departure-code')).toContainText('KPHX');
		await expect(page.getByTestId('flight-arrival-code')).toContainText('KLAS');

		// ATC sections should still be present (even if showing offline)
		await expect(page.getByTestId('flight-departure-section')).toBeVisible();
		await expect(page.getByTestId('flight-arrival-section')).toBeVisible();
	});
});
