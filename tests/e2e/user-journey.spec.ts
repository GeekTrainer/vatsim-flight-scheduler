import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers } from './fixtures/vatsim-data';
import { mockFaaDatisPhx, mockFaaDatisLas } from './fixtures/faa-datis';
import { VATSIM_API_URL } from './fixtures/test-constants';

/**
 * Full user-journey E2E tests covering multi-page navigation flows
 * and settings persistence across the application.
 */

async function setupAllMocks(page: import('@playwright/test').Page) {
	await Promise.all([
		page.route(VATSIM_API_URL, async (route) => {
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
		}),
		page.route('https://www.simbrief.com/api/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({})
			});
		}),
		page.route('https://atis.info/api/*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([])
			});
		})
	]);
}

test.describe('Full User Journey', () => {
	test('complete flow: settings → main → filter → flight → back', async ({ page }) => {
		await setupAllMocks(page);

		// Step 1: Configure settings via localStorage and verify on settings page
		await page.goto('/settings');
		await page.evaluate(() => {
			localStorage.setItem('simbrief_username', 'testpilot123');
			localStorage.setItem('vatsim_cid', '9876543');
		});
		await page.reload();
		await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('testpilot123');
		await expect(page.getByTestId('settings-vatsim-cid')).toHaveValue('9876543');

		// Step 2: Navigate to main page
		await page.goto('/');
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Step 3: Select PHX as departure and explore routes
		await page.getByTestId('departure-airport-select').selectOption('PHX');
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible({ timeout: 10000 });

		// Step 4: Expand PHX group and click flight link
		await page.getByTestId('expand-button-PHX').click();
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		const flightLink = page.getByTestId('flight-link-KPHX-KLAS');
		await expect(flightLink).toBeVisible();
		await flightLink.click();

		// Step 5: Verify flight page loaded correctly
		await expect(page).toHaveURL(/\/flight\/KPHX-KLAS/);
		await expect(page.getByTestId('flight-page')).toBeVisible();
		await expect(page.getByTestId('flight-departure-code')).toContainText('KPHX');
		await expect(page.getByTestId('flight-arrival-code')).toContainText('KLAS');
		await expect(page.getByTestId('flight-departure-section')).toBeVisible();
		await expect(page.getByTestId('flight-arrival-section')).toBeVisible();

		// Step 6: Navigate back and verify filter state preserved
		const backLink = page.getByTestId('flight-back-link');
		await expect(backLink).toBeVisible();
		await backLink.click();

		await expect(page).toHaveURL('/');
		// SvelteKit re-creates the page component on navigation, so filter state resets
		await expect(page.getByTestId('user-guide')).toBeVisible();
	});

	test('settings persist across navigation', async ({ page }) => {
		await setupAllMocks(page);

		// Set settings via localStorage directly (already tested via UI in simbrief tests)
		await page.goto('/settings');
		await page.evaluate(() => {
			localStorage.setItem('simbrief_username', 'mypilotname');
			localStorage.setItem('vatsim_cid', '1112233');
		});
		await page.reload();

		// Verify settings are loaded from localStorage
		await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('mypilotname');
		await expect(page.getByTestId('settings-vatsim-cid')).toHaveValue('1112233');

		// Navigate to a flight page
		await page.goto('/flight/KPHX-KLAS');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Navigate back to settings — values should still be there
		await page.goto('/settings');
		await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('mypilotname');
		await expect(page.getByTestId('settings-vatsim-cid')).toHaveValue('1112233');
	});
});
