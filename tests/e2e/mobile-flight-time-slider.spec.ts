import { test, expect } from '@playwright/test';
import { setupWithEmptyVatsimData } from './helpers/setup';
import { collapseFilters, expandFilters } from './helpers/mobile';

test.describe('Mobile Flight Time Slider', () => {
	test.beforeEach(async ({ page }) => {
		await setupWithEmptyVatsimData(page);
	});

	test('slider is visible and functional on mobile', async ({ page }) => {
		const slider = page.getByTestId('flight-time-range-slider');
		await expect(slider).toBeVisible();
		await expect(slider).toContainText('Flight Time');
		await expect(slider).toContainText('< 1h 30m');
		await expect(slider).toContainText('> 6h');
	});

	test('slider does not cause horizontal overflow', async ({ page }) => {
		const hasOverflow = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth;
		});
		expect(hasOverflow).toBe(false);
	});

	test('moving slider activates filter on mobile', async ({ page }) => {
		const minSlider = page.getByTestId('flight-time-slider-min');

		await minSlider.fill('180');
		await minSlider.dispatchEvent('input');

		const rangeLabel = page.getByTestId('flight-time-range-label');
		await expect(rangeLabel).toBeVisible();
		await expect(rangeLabel).toContainText('3h');

		await expect(page.getByTestId('user-guide')).not.toBeVisible();
	});

	test('slider thumb has adequate tap target on mobile', async ({ page }) => {
		const minSlider = page.getByTestId('flight-time-slider-min');
		const box = await minSlider.boundingBox();
		expect(box).not.toBeNull();
		// Slider input should have reasonable height for touch interaction
		expect(box!.height).toBeGreaterThanOrEqual(20);
	});

	test('slider is accessible when filter panel is collapsed and reopened', async ({ page }) => {
		// Collapse filter panel
		await collapseFilters(page);

		// Reopen
		await expandFilters(page);

		// Slider should still work
		const slider = page.getByTestId('flight-time-range-slider');
		await expect(slider).toBeVisible();

		const maxSlider = page.getByTestId('flight-time-slider-max');
		await maxSlider.fill('240');
		await maxSlider.dispatchEvent('input');

		await expect(page.getByTestId('flight-time-range-label')).toBeVisible();
	});

	test('flight time filter shows in collapsed summary on mobile', async ({ page }) => {
		const minSlider = page.getByTestId('flight-time-slider-min');
		// Set flight time filter
		await minSlider.fill('180');
		await minSlider.dispatchEvent('input');
		await expect(page.getByTestId('user-guide')).not.toBeVisible();

		// Collapse filter panel
		await collapseFilters(page);

		// Active filter summary should show on mobile
		const summary = page.getByTestId('filter-summary');
		await expect(summary).toBeVisible();
		await expect(summary).toContainText('Time filter');

		// Filter count badge should show
		await expect(page.getByTestId('filter-count-badge')).toBeVisible();
	});
});
