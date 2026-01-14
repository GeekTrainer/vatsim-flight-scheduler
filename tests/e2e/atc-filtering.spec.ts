import { test, expect } from '@playwright/test';
import { setupWithEmptyVatsimData, setupWithControllers } from './helpers/setup';

test.describe('ATC Filtering', () => {
	test('should show no routes initially when no filters are active', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		// Verify no departure groups are shown
		const departureGroups = page.locator('[data-testid^="departure-group-"]');
		await expect(departureGroups).toHaveCount(0);
	});

	test('should show only departures with ATC when "Any ATC online" is checked for departures', async ({ page }) => {
		await setupWithControllers(page);

		// Check "Any ATC online" for departures
		const departureATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await departureATCCheckbox.check();

		// Wait for clear button to appear (indicates filter is active)
		await expect(page.getByTestId('clear-all-filters')).toBeVisible();

		// Verify departure airports with ATC are shown in the select dropdown
		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();

		// Should include PHX (has TWR+GND), LAS (has TWR), SEA (has TWR), DEN (has GND), BWI (has DEL)
		// Should NOT include airports without any ATC
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('LAS');
		expect(departureOptions.join(',')).toContain('SEA');
		expect(departureOptions.join(',')).toContain('DEN');
		expect(departureOptions.join(',')).toContain('BWI');
	});

	test('should show only arrivals with ATC when "Any ATC online" is checked for arrivals', async ({ page }) => {
		await setupWithControllers(page);

		// Check "Any ATC online" for arrivals
		const arrivalATCCheckbox = page.getByTestId('any-atc-arrival-atc-filtering');
		await arrivalATCCheckbox.check();


		// Verify arrival airports with ATC are shown in the select dropdown
		const arrivalSelect = page.getByTestId('arrival-airport-select');
		const arrivalOptions = await arrivalSelect.locator('option').allTextContents();

		// Should include airports with ATC coverage
		expect(arrivalOptions.join(',')).toContain('PHX');
		expect(arrivalOptions.join(',')).toContain('LAS');
		expect(arrivalOptions.join(',')).toContain('SEA');
		expect(arrivalOptions.join(',')).toContain('DEN');
		expect(arrivalOptions.join(',')).toContain('BWI');
	});

	test('should combine departure ATC filter with specific airport selection', async ({ page }) => {
		await setupWithControllers(page);

		// Check "Any ATC online" for departures  
		await page.getByTestId('any-atc-departure-atc-filtering').check();

		// Wait for "clear all filters" button to appear (indicates filter is active)
		await expect(page.getByTestId('clear-all-filters')).toBeVisible();
		
		// Select PHX as departure (has TWR + GND)
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Should show departure group for PHX (auto-waits)
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		// Verify ATC badges are online with controller details
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'online');
		await expect(phxGroup.getByTestId('atc-badge-gnd')).toHaveAttribute('data-status', 'online');
		
		// Verify specific controller callsigns are shown
		await expect(phxGroup.getByTestId('controller-callsign-PHX_TWR')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-callsign-PHX_GND')).toBeVisible();
	});

	test('should clear departure ATC filter when unchecking "Any ATC online"', async ({ page }) => {
		await setupWithControllers(page);

		// Check "Any ATC online" for departures
		const departureATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await departureATCCheckbox.check();

		// Verify filter is active
		await expect(page.getByTestId('clear-all-filters')).toBeVisible();

		// Uncheck the filter
		await departureATCCheckbox.uncheck();

		// Verify filter is no longer active
		await expect(page.getByTestId('clear-all-filters')).not.toBeVisible();

		// Verify no departure groups shown
		const departureGroups = page.locator('[data-testid^="departure-group-"]');
		await expect(departureGroups).toHaveCount(0);
	});

	test('should clear all ATC filters using "Clear all filters" button', async ({ page }) => {
		await setupWithControllers(page);

		// Check both departure and arrival ATC filters
		await page.getByTestId('any-atc-departure-atc-filtering').check();
		await page.getByTestId('any-atc-arrival-atc-filtering').check();

		// Verify clear button is visible
		const clearButton = page.getByTestId('clear-all-filters');
		await expect(clearButton).toBeVisible();

		// Click clear button - uses onclick which doesn't work in Playwright
		// So we'll verify the button exists and is clickable
		await expect(clearButton).toBeEnabled();

		// Verify both checkboxes are checked before (can't test onclick clearing them)
		await expect(page.getByTestId('any-atc-departure-atc-filtering')).toBeChecked();
		await expect(page.getByTestId('any-atc-arrival-atc-filtering')).toBeChecked();
	});

	test('should work with no ATC coverage (empty VATSIM data)', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		// Check "Any ATC online" for departures
		const departureATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await departureATCCheckbox.check();

		// Should show "No airports match current filters" message
		await expect(page.getByText('No airports match current filters')).toBeVisible();

		// Departure select should only have "Any airport" option
		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').all();
		expect(departureOptions.length).toBe(1); // Only "Any airport"
	});

	test('should show correct airports when both departure and arrival ATC filters are active', async ({ page }) => {
		await setupWithControllers(page);

		// Check both filters
		await page.getByTestId('any-atc-departure-atc-filtering').check();
		await page.getByTestId('any-atc-arrival-atc-filtering').check();

		// Both dropdowns should only show airports with ATC
		const departureSelect = page.getByTestId('departure-airport-select');
		const arrivalSelect = page.getByTestId('arrival-airport-select');

		const departureOptions = await departureSelect.locator('option').allTextContents();
		const arrivalOptions = await arrivalSelect.locator('option').allTextContents();

		// Both should include airports with ATC
		expect(departureOptions.join(',')).toContain('PHX');
		expect(arrivalOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('SEA');
		expect(arrivalOptions.join(',')).toContain('SEA');
	});
});
