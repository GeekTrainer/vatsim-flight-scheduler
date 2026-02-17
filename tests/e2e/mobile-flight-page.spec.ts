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

	test('should have both cards collapsed by default', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		// Both cards should NOT show ATIS content (collapsed)
		const depCard = page.getByTestId('flight-card-departure');
		await expect(depCard.getByTestId('atis-display-KPHX')).not.toBeVisible();

		const arrCard = page.getByTestId('flight-card-arrival');
		await expect(arrCard.getByTestId('atis-display-KLAS')).not.toBeVisible();
	});

	test('should show compact summary on collapsed card', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		// Both collapsed - should show compact summary
		const depCard = page.getByTestId('flight-card-departure');
		await expect(depCard.getByTestId('compact-wind')).toBeVisible();
		await expect(depCard.getByTestId('compact-altimeter')).toBeVisible();
	});

	test('should expand and collapse cards independently', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/flight/KPHX-KLAS');

		const depCard = page.getByTestId('flight-card-departure');
		const arrCard = page.getByTestId('flight-card-arrival');

		// Expand departure
		await page.getByTestId('flight-card-toggle-departure').click();
		await expect(depCard.getByTestId('atis-display-KPHX')).toBeVisible();
		await expect(arrCard.getByTestId('atis-display-KLAS')).not.toBeVisible();

		// Expand arrival too — both should be open
		await page.getByTestId('flight-card-toggle-arrival').click();
		await expect(depCard.getByTestId('atis-display-KPHX')).toBeVisible();
		await expect(arrCard.getByTestId('atis-display-KLAS')).toBeVisible();

		// Collapse departure — arrival stays open
		await page.getByTestId('flight-card-toggle-departure').click();
		await expect(depCard.getByTestId('atis-display-KPHX')).not.toBeVisible();
		await expect(arrCard.getByTestId('atis-display-KLAS')).toBeVisible();
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
