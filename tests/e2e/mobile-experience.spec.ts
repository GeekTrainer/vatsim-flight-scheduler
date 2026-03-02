import { test, expect } from '@playwright/test';
import { setupWithControllers, setupWithEmptyVatsimData } from './helpers/setup';
import { collapseFilters } from './helpers/mobile';

test.describe('Mobile Experience', () => {
	test('page loads without horizontal overflow', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		const hasOverflow = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth;
		});
		expect(hasOverflow).toBe(false);
	});

	test('header is compact and network status is in footer on mobile', async ({ page }) => {
		await setupWithControllers(page);

		await expect(page.getByRole('heading', { name: 'VATSIM Scheduler', level: 1 })).toBeVisible();

		// Network status should be in footer on mobile, not header
		const footerStatus = page.locator('main').getByTestId('network-status');
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await expect(footerStatus).toBeVisible();
		await expect(footerStatus).toContainText('controllers');
	});

	test('filter panel is expanded by default on mobile', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		// Toggle button should be visible
		await expect(page.getByTestId('filter-toggle')).toBeVisible();

		// Filter content should be visible by default
		await expect(page.getByTestId('filter-panel-content')).toBeVisible();

		// Airport selects should be visible
		await expect(page.getByTestId('departure-airport-select')).toBeVisible();
	});

	test('filter panel expands and collapses on toggle', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		const toggle = page.getByTestId('filter-toggle');

		// Should start expanded
		await expect(page.getByTestId('filter-panel-content')).toBeVisible();

		// Collapse
		await toggle.click();
		await expect(page.getByTestId('filter-panel-content')).not.toBeVisible();

		// Expand again
		await toggle.click();
		await expect(page.getByTestId('filter-panel-content')).toBeVisible();
		await expect(page.getByTestId('departure-airport-select')).toBeVisible();
	});

	test('filter panel stacks vertically on mobile', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		const departureSelect = page.getByTestId('departure-airport-select');
		const arrivalSelect = page.getByTestId('arrival-airport-select');

		await expect(departureSelect).toBeVisible();
		await expect(arrivalSelect).toBeVisible();

		// On mobile, arrival select should be below departure
		const depBox = await departureSelect.boundingBox();
		const arrBox = await arrivalSelect.boundingBox();
		expect(depBox).not.toBeNull();
		expect(arrBox).not.toBeNull();
		expect(arrBox!.y).toBeGreaterThan(depBox!.y);
	});

	test('ATC level buttons fit in 5 columns on mobile', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		const anyATCCheckbox = page.locator('label:has-text("Any ATC online")').first().locator('input[type="checkbox"]');
		await anyATCCheckbox.check();

		const levelGrid = page.getByTestId('departure-atc-filtering-atc-levels');
		await expect(levelGrid).toBeVisible();

		const buttons = levelGrid.locator('button');
		await expect(buttons).toHaveCount(5);

		// Verify buttons use abbreviated labels
		await expect(buttons.nth(0)).toHaveText('CTR');
		await expect(buttons.nth(1)).toHaveText('APP');
		await expect(buttons.nth(2)).toHaveText('TWR');
		await expect(buttons.nth(3)).toHaveText('GND');
		await expect(buttons.nth(4)).toHaveText('DEL');
	});

	test('active filter summary shown when collapsed', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		// Select a departure airport
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Collapse filters
		await page.getByTestId('filter-toggle').click();

		// Summary should show the active filter
		const summary = page.getByTestId('filter-summary');
		await expect(summary).toBeVisible();
		await expect(summary).toContainText('PHX');

		// Badge count should show
		await expect(page.getByTestId('filter-count-badge')).toBeVisible();
	});

	test('route list is usable with ATC badges', async ({ page }) => {
		await setupWithControllers(page);

		await page.getByTestId('departure-airport-select').selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();

		const hasOverflow = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth;
		});
		expect(hasOverflow).toBe(false);

		const expandButton = page.getByTestId('expand-button-PHX');
		await expect(expandButton).toBeVisible();
		await expandButton.click();
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
	});

	test('expand/collapse button has adequate tap target', async ({ page }) => {
		await setupWithControllers(page);

		await page.getByTestId('departure-airport-select').selectOption('PHX');
		const expandButton = page.getByTestId('expand-button-PHX');
		await expect(expandButton).toBeVisible();

		const box = await expandButton.boundingBox();
		expect(box).not.toBeNull();
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

		await page.getByTestId('departure-airport-select').selectOption('PHX');

		const clearButton = page.getByTestId('clear-all-filters');
		await expect(clearButton).toBeVisible();
		await clearButton.click();

		await expect(page.getByTestId('departure-airport-select')).toHaveValue('');
	});
});
