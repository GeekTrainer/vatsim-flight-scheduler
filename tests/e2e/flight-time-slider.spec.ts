import { test, expect } from '@playwright/test';
import { setupWithEmptyVatsimData } from './helpers/setup';

test.describe('Flight Time Range Slider', () => {
	test.beforeEach(async ({ page }) => {
		await setupWithEmptyVatsimData(page);
	});

	test('slider is visible with default labels', async ({ page }) => {
		const slider = page.getByTestId('flight-time-range-slider');
		await expect(slider).toBeVisible();
		await expect(slider).toContainText('Flight Time');
		await expect(slider).toContainText('< 1h 30m');
		await expect(slider).toContainText('> 6h');
	});

	test('no range label shown when slider is at defaults', async ({ page }) => {
		await expect(page.getByTestId('flight-time-range-label')).not.toBeVisible();
	});

	test('moving min slider shows range label and activates filter', async ({ page }) => {
		const minSlider = page.getByTestId('flight-time-slider-min');

		// Move min slider to 150 (2h 30m)
		await minSlider.fill('150');
		await minSlider.dispatchEvent('input');

		const rangeLabel = page.getByTestId('flight-time-range-label');
		await expect(rangeLabel).toBeVisible();
		await expect(rangeLabel).toContainText('2h 30m');

		// User guide should disappear since filter is now active
		await expect(page.getByTestId('user-guide')).not.toBeVisible();
	});

	test('moving max slider shows range label and activates filter', async ({ page }) => {
		const maxSlider = page.getByTestId('flight-time-slider-max');

		// Move max slider to 240 (4h)
		await maxSlider.fill('240');
		await maxSlider.dispatchEvent('input');

		const rangeLabel = page.getByTestId('flight-time-range-label');
		await expect(rangeLabel).toBeVisible();
		await expect(rangeLabel).toContainText('Under 4h');

		await expect(page.getByTestId('user-guide')).not.toBeVisible();
	});

	test('moving both sliders shows combined range label', async ({ page }) => {
		const minSlider = page.getByTestId('flight-time-slider-min');
		const maxSlider = page.getByTestId('flight-time-slider-max');

		await minSlider.fill('150');
		await minSlider.dispatchEvent('input');
		await maxSlider.fill('270');
		await maxSlider.dispatchEvent('input');

		const rangeLabel = page.getByTestId('flight-time-range-label');
		await expect(rangeLabel).toBeVisible();
		await expect(rangeLabel).toContainText('2h 30m');
		await expect(rangeLabel).toContainText('4h 30m');
	});

	test('slider filters routes by flight time', async ({ page }) => {
		// Move min slider to activate the flight time filter
		const minSlider = page.getByTestId('flight-time-slider-min');
		await minSlider.fill('180');
		await minSlider.dispatchEvent('input');

		// Flight time filter alone should activate routing display
		await expect(page.getByTestId('user-guide')).not.toBeVisible();

		// Routes should be visible (filtered by 3h+ flight time)
		const routeResults = page.getByTestId('route-results');
		await expect(routeResults).toBeVisible();

		const initialCount = Number(await routeResults.getAttribute('data-route-count'));
		expect(initialCount).toBeGreaterThan(0);

		// Now tighten the max slider to reduce results
		const maxSlider = page.getByTestId('flight-time-slider-max');
		await maxSlider.fill('210');
		await maxSlider.dispatchEvent('input');

		// Route count should be strictly less after tightening the filter
		const filteredCount = Number(await routeResults.getAttribute('data-route-count'));
		expect(filteredCount).toBeLessThan(initialCount);
		expect(filteredCount).toBeGreaterThan(0);
	});

	test('resetting slider to bounds removes filter', async ({ page }) => {
		const minSlider = page.getByTestId('flight-time-slider-min');

		// Activate filter
		await minSlider.fill('180');
		await minSlider.dispatchEvent('input');
		await expect(page.getByTestId('flight-time-range-label')).toBeVisible();
		await expect(page.getByTestId('user-guide')).not.toBeVisible();

		// Reset to minimum bound
		await minSlider.fill('90');
		await minSlider.dispatchEvent('input');

		// Range label should disappear (no longer filtering)
		await expect(page.getByTestId('flight-time-range-label')).not.toBeVisible();
		// User guide returns since no other filters active
		await expect(page.getByTestId('user-guide')).toBeVisible();
	});

	test('flight time filter combines with other filters', async ({ page }) => {
		// Set flight time filter
		const minSlider = page.getByTestId('flight-time-slider-min');
		await minSlider.fill('180');
		await minSlider.dispatchEvent('input');
		await expect(page.getByTestId('user-guide')).not.toBeVisible();

		// Also enable ATC filter
		await page.getByTestId('any-atc-departure-atc-filtering').check();

		// Both filters active — empty state expected (no controllers in mock)
		await expect(page.getByTestId('empty-state')).toBeVisible();
	});
});
