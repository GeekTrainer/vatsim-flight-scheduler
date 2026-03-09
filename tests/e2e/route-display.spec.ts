import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers } from './fixtures/vatsim-data';
import { mockFaaDatisPhx, mockFaaDatisLas } from './fixtures/faa-datis';
import { mockSimBriefShortRoute, mockSimBriefLongRoute } from './fixtures/simbrief-data';
import { VATSIM_API_URL } from './fixtures/test-constants';

/**
 * Set up flight page mocks with a specific SimBrief plan
 */
async function setupFlightPage(page: import('@playwright/test').Page, simbriefPlan: object) {
	// Set SimBrief username in localStorage before navigating
	await page.addInitScript(() => {
		localStorage.setItem('simbrief_username', 'testuser');
	});

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
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(simbriefPlan) });
		})
	]);

	await page.goto('/flight/KPHX-KLAS');
	await expect(page.getByTestId('flight-page')).toBeVisible();
}

test.describe('Route Display', () => {
	test('should show abbreviated route with badge for long routes on desktop', async ({ page }) => {
		await setupFlightPage(page, mockSimBriefLongRoute);

		// Click the Load button on the desktop flight strip
		const loadButton = page.getByTestId('simbrief-load-button');
		await expect(loadButton).toBeVisible();
		await loadButton.click();

		// Wait for the route display to appear
		const routeDisplay = page.getByTestId('route-display').first();
		await expect(routeDisplay).toBeVisible();

		// Long route should show the abbreviation badge
		const badge = page.getByTestId('route-badge').first();
		await expect(badge).toBeVisible();

		// Badge should show a positive count
		const badgeText = await badge.textContent();
		expect(badgeText).toMatch(/\+\d+/);
	});

	test('should show full route without badge for short routes on desktop', async ({ page }) => {
		await setupFlightPage(page, mockSimBriefShortRoute);

		// Click the Load button
		const loadButton = page.getByTestId('simbrief-load-button');
		await expect(loadButton).toBeVisible();
		await loadButton.click();

		// Wait for the route display to appear
		const routeDisplay = page.getByTestId('route-display').first();
		await expect(routeDisplay).toBeVisible();

		// Short route should NOT show the badge
		const badge = page.getByTestId('route-badge').first();
		await expect(badge).not.toBeVisible();

		// Should display the full route text
		await expect(routeDisplay).toContainText('PXR');
		await expect(routeDisplay).toContainText('TBC');
	});

	test('should show tooltip with full route on hover when abbreviated', async ({ page }) => {
		await setupFlightPage(page, mockSimBriefLongRoute);

		// Load the plan
		const loadButton = page.getByTestId('simbrief-load-button');
		await expect(loadButton).toBeVisible();
		await loadButton.click();

		// Wait for route display
		const routeDisplay = page.getByTestId('route-display').first();
		await expect(routeDisplay).toBeVisible();

		// Tooltip should not be visible initially
		const tooltip = page.getByTestId('route-tooltip').first();
		await expect(tooltip).not.toBeVisible();

		// Hover over the route display
		await routeDisplay.hover();

		// Tooltip should appear with full route text
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toContainText('FORPE4');
		await expect(tooltip).toContainText('MMARS');
	});
});
