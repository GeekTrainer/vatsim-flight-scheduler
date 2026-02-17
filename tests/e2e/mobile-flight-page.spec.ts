import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers } from './fixtures/vatsim-data';

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

test.describe('Flight Page - Mobile Layout', () => {
	test('should show collapsible cards on mobile', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		// Both cards should be visible
		await expect(page.getByTestId('flight-card-departure')).toBeVisible();
		await expect(page.getByTestId('flight-card-arrival')).toBeVisible();
	});

	test('should have departure expanded by default', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		// Departure card should show ATIS content (expanded)
		const depCard = page.getByTestId('flight-card-departure');
		await expect(depCard.getByTestId('atis-display-KPHX')).toBeVisible();

		// Arrival card should NOT show ATIS content (collapsed)
		const arrCard = page.getByTestId('flight-card-arrival');
		await expect(arrCard.getByTestId('atis-display-KLAS')).not.toBeVisible();
	});

	test('should show compact summary on collapsed card', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		// Arrival card is collapsed - should show compact summary
		const arrCard = page.getByTestId('flight-card-arrival');
		await expect(arrCard.getByTestId('compact-wind')).toBeVisible();
		await expect(arrCard.getByTestId('compact-altimeter')).toBeVisible();
	});

	test('should toggle cards - only one expanded at a time', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		// Initially departure is expanded
		const depCard = page.getByTestId('flight-card-departure');
		const arrCard = page.getByTestId('flight-card-arrival');
		await expect(depCard.getByTestId('atis-display-KPHX')).toBeVisible();

		// Tap arrival to expand it
		await page.getByTestId('flight-card-toggle-arrival').click();

		// Now arrival should be expanded, departure collapsed
		await expect(arrCard.getByTestId('atis-display-KLAS')).toBeVisible();
		await expect(depCard.getByTestId('atis-display-KPHX')).not.toBeVisible();
	});

	test('should show ATC dots on collapsed card', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		// Arrival card is collapsed but should show ATC dot indicators
		const arrCard = page.getByTestId('flight-card-arrival');
		await expect(arrCard).toContainText('CTR');
		await expect(arrCard).toContainText('TWR');
	});
});
