import { test, expect } from '@playwright/test';
import { setupWithControllers, setupWithEmptyVatsimData } from './helpers/setup';

test.describe('Mobile Experience', () => {
	test('page loads without horizontal overflow', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		const hasOverflow = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth;
		});
		expect(hasOverflow).toBe(false);
	});

	test('header displays correctly on mobile', async ({ page }) => {
		await setupWithControllers(page);

		// Title should be visible
		await expect(page.getByRole('heading', { name: 'VATSIM Flight Scheduler', level: 1 })).toBeVisible();

		// Network status should show controller count
		const networkStatus = page.getByTestId('network-status');
		await expect(networkStatus).toBeVisible();
		await expect(networkStatus).toContainText('controllers');
	});

	test('filter panel stacks vertically on mobile', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		const departureSelect = page.getByTestId('departure-airport-select');
		const arrivalSelect = page.getByTestId('arrival-airport-select');

		await expect(departureSelect).toBeVisible();
		await expect(arrivalSelect).toBeVisible();

		// On mobile, arrival select should be below departure (not side-by-side)
		const depBox = await departureSelect.boundingBox();
		const arrBox = await arrivalSelect.boundingBox();
		expect(depBox).not.toBeNull();
		expect(arrBox).not.toBeNull();
		expect(arrBox!.y).toBeGreaterThan(depBox!.y);
	});

	test('ATC level buttons wrap on mobile', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		// Check "Any ATC" to reveal ATC level buttons
		const anyATCCheckbox = page.locator('label:has-text("Any ATC online")').first().locator('input[type="checkbox"]');
		await anyATCCheckbox.check();

		// The ATC level grid should be visible
		const levelGrid = page.getByTestId('departure-atc-filtering-atc-levels');
		await expect(levelGrid).toBeVisible();

		// All 5 level buttons should be visible and not overflow
		const buttons = levelGrid.locator('button');
		await expect(buttons).toHaveCount(5);

		// Verify no button extends beyond viewport
		const viewportWidth = page.viewportSize()!.width;
		for (let i = 0; i < 5; i++) {
			const box = await buttons.nth(i).boundingBox();
			expect(box).not.toBeNull();
			expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
		}
	});

	test('route list is usable with ATC badges wrapping', async ({ page }) => {
		await setupWithControllers(page);

		// Select PHX departure to show routes
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Departure group should appear
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();

		// ATC badges should be visible and wrap (not overflow)
		const hasOverflow = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth;
		});
		expect(hasOverflow).toBe(false);

		// Expand button should be tappable
		const expandButton = page.getByTestId('expand-button-PHX');
		await expect(expandButton).toBeVisible();
		await expandButton.click();

		// Arrivals should be visible after expand
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
	});

	test('expand/collapse button has adequate tap target', async ({ page }) => {
		await setupWithControllers(page);

		await page.getByTestId('departure-airport-select').selectOption('PHX');
		const expandButton = page.getByTestId('expand-button-PHX');
		await expect(expandButton).toBeVisible();

		// The button itself should be large enough to tap (full-width header row)
		const box = await expandButton.boundingBox();
		expect(box).not.toBeNull();
		// Height should be at least 44px (Apple's minimum tap target)
		expect(box!.height).toBeGreaterThanOrEqual(44);
	});

	test('airport selection works on mobile', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		const departureSelect = page.getByTestId('departure-airport-select');
		await departureSelect.selectOption('PHX');
		await expect(departureSelect).toHaveValue('PHX');

		const arrivalSelect = page.getByTestId('arrival-airport-select');
		await arrivalSelect.selectOption('LAS');
		await expect(arrivalSelect).toHaveValue('LAS');
	});

	test('clear filters button is accessible on mobile', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		// Apply a filter first
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Clear button should appear and be tappable
		const clearButton = page.getByTestId('clear-all-filters');
		await expect(clearButton).toBeVisible();
		await clearButton.click();

		// Filter should be cleared
		await expect(page.getByTestId('departure-airport-select')).toHaveValue('');
	});
});
