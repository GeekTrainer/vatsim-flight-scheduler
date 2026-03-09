import { test, expect } from '@playwright/test';
import { setupWithEmptyVatsimData, setupWithControllers } from './helpers/setup';
import { expectATCLevelButtonActive } from './helpers/assertions';

test.describe('ATC Filtering - Consolidated', () => {
	test.beforeEach(async ({ page }) => {
		await setupWithControllers(page);
	});

	// ========== Core "Any ATC online" Tests ==========
	
	test('should show only departures with ATC when "Any ATC online" is checked', async ({ page }) => {
		const departureATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await departureATCCheckbox.check();

		await expect(page.getByTestId('clear-all-filters')).toBeVisible();

		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();

		// Should include PHX (has TWR+GND), LAS (has TWR), SEA (has TWR), DEN (has GND), BWI (has DEL)
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('LAS');
		expect(departureOptions.join(',')).toContain('SEA');
		expect(departureOptions.join(',')).toContain('DEN');
		expect(departureOptions.join(',')).toContain('BWI');
	});

	test('should show only arrivals with ATC when "Any ATC online" is checked', async ({ page }) => {
		const arrivalATCCheckbox = page.getByTestId('any-atc-arrival-atc-filtering');
		await arrivalATCCheckbox.check();

		const arrivalSelect = page.getByTestId('arrival-airport-select');
		const arrivalOptions = await arrivalSelect.locator('option').allTextContents();

		expect(arrivalOptions.join(',')).toContain('PHX');
		expect(arrivalOptions.join(',')).toContain('LAS');
		expect(arrivalOptions.join(',')).toContain('SEA');
		expect(arrivalOptions.join(',')).toContain('DEN');
		expect(arrivalOptions.join(',')).toContain('BWI');
	});

	test('should combine departure ATC filter with specific airport selection', async ({ page }) => {
		await page.getByTestId('any-atc-departure-atc-filtering').check();
		await expect(page.getByTestId('clear-all-filters')).toBeVisible();
		
		await page.getByTestId('departure-airport-select').selectOption('PHX');
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'online');
		await expect(phxGroup.getByTestId('atc-badge-gnd')).toHaveAttribute('data-status', 'online');
		
		await expect(phxGroup.getByTestId('controller-callsign-PHX_TWR')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-callsign-PHX_GND')).toBeVisible();
	});

	test('should show both departure and arrival airports with ATC when both filters active', async ({ page }) => {
		await page.getByTestId('any-atc-departure-atc-filtering').check();
		await page.getByTestId('any-atc-arrival-atc-filtering').check();

		const departureSelect = page.getByTestId('departure-airport-select');
		const arrivalSelect = page.getByTestId('arrival-airport-select');

		const departureOptions = await departureSelect.locator('option').allTextContents();
		const arrivalOptions = await arrivalSelect.locator('option').allTextContents();

		expect(departureOptions.join(',')).toContain('PHX');
		expect(arrivalOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('SEA');
		expect(arrivalOptions.join(',')).toContain('SEA');
	});

	// ========== Specific ATC Level Filtering ==========

	test('should filter departures by Tower level only', async ({ page }) => {
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);

		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		
		// Should include PHX (has TWR), LAS (has TWR), SEA (has TWR)
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('LAS');
		expect(departureOptions.join(',')).toContain('SEA');
		
		// Should NOT include BWI (only has DEL), DEN (only has GND)
		expect(departureOptions.join(',')).not.toContain('BWI');
	});

	test('should filter departures by Ground level only', async ({ page }) => {
		await page.getByTestId('departure-atc-level-gnd').click({ force: true });

		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		
		// Should include PHX (has GND), DEN (has GND)
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('DEN');
		
		// Should NOT include BWI (only has DEL), LAS (only has TWR)
		expect(departureOptions.join(',')).not.toContain('BWI');
	});

	test('should filter departures by Delivery level only', async ({ page }) => {
		await page.getByTestId('departure-atc-level-del').click({ force: true });

		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		
		// Should include BWI (has DEL)
		expect(departureOptions.join(',')).toContain('BWI');
	});

	test('should filter arrivals by Tower level only', async ({ page }) => {
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });

		const arrivalSelect = page.getByTestId('arrival-airport-select');
		const arrivalOptions = await arrivalSelect.locator('option').allTextContents();
		
		expect(arrivalOptions.join(',')).toContain('PHX');
		expect(arrivalOptions.join(',')).toContain('LAS');
		expect(arrivalOptions.join(',')).toContain('SEA');
	});

	test('should combine multiple ATC levels for departure (Tower + Delivery)', async ({ page }) => {
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		await page.getByTestId('departure-atc-level-del').click({ force: true });

		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-del', true);

		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		
		// Should include PHX (has TWR), BWI (has DEL), LAS (has TWR), SEA (has TWR)
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('BWI');
		expect(departureOptions.join(',')).toContain('LAS');
		expect(departureOptions.join(',')).toContain('SEA');
	});

	test('should combine departure and arrival level filters independently', async ({ page }) => {
		// Check Tower for departures, Delivery for arrivals
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		await page.getByTestId('arrival-atc-level-del').click({ force: true });

		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-del', true);

		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('LAS');

		const arrivalSelect = page.getByTestId('arrival-airport-select');
		const arrivalOptions = await arrivalSelect.locator('option').allTextContents();
		expect(arrivalOptions.join(',')).toContain('BWI');
	});

	// ========== Combining Filters ==========

	test('should uncheck "Any ATC online" when toggling off a specific level', async ({ page }) => {
		const anyATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await anyATCCheckbox.check();
		await expect(anyATCCheckbox).toBeChecked();
		
		// All levels should be active
		await expectATCLevelButtonActive(page, 'departure-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-del', true);

		// Toggle off Tower
		await page.getByTestId('departure-atc-level-twr').click({ force: true });

		// "Any ATC online" should be unchecked
		await expect(anyATCCheckbox).not.toBeChecked();
		
		// Tower inactive, others still active
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', false);
		await expectATCLevelButtonActive(page, 'departure-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-del', true);
	});

	test('should select all specific levels when checking "Any ATC online"', async ({ page }) => {
		// First check specific levels
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		await page.getByTestId('departure-atc-level-gnd').click({ force: true });

		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-gnd', true);

		// Now check "Any ATC online"
		const anyATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await anyATCCheckbox.check();

		// All specific levels should now be active
		await expectATCLevelButtonActive(page, 'departure-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-del', true);
		
		await expect(anyATCCheckbox).toBeChecked();
	});

	test('should auto-check "Any ATC online" when all levels are manually selected', async ({ page }) => {
		const anyATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await expect(anyATCCheckbox).not.toBeChecked();
		
		// Manually select all 5 levels
		await page.getByTestId('departure-atc-level-ctr').click({ force: true });
		await page.getByTestId('departure-atc-level-app').click({ force: true });
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		await page.getByTestId('departure-atc-level-gnd').click({ force: true });
		await page.getByTestId('departure-atc-level-del').click({ force: true });
		
		// "Any ATC online" should auto-check
		await expect(anyATCCheckbox).toBeChecked();
		
		await expect(page.getByTestId('departure-atc-level-ctr')).toHaveClass(/atc-ctr-active/);
		await expectATCLevelButtonActive(page, 'departure-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-del', true);
	});

	// ========== Edge Cases ==========

	test('should handle no ATC coverage with empty VATSIM data', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		const departureATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await departureATCCheckbox.check();

		await expect(page.getByTestId('no-airports-match').first()).toBeVisible();

		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').all();
		expect(departureOptions.length).toBe(1); // Only "Any airport"
	});

	test('should show no airports when filtering by level with no online controllers', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);

		await expect(page.getByTestId('no-airports-match').first()).toBeVisible();

		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').all();
		expect(departureOptions.length).toBe(1); // Only "Any airport"
	});

	test('should toggle specific levels on and off', async ({ page }) => {
		const towerCheckbox = page.getByTestId('departure-atc-level-twr');

		// Check Tower
		await towerCheckbox.click({ force: true });
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);

		// Uncheck Tower
		await towerCheckbox.click({ force: true });
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', false);

		// No departure groups shown (no filters active)
		const departureGroups = page.locator('[data-testid^="departure-group-"]');
		await expect(departureGroups).toHaveCount(0);
	});
});
