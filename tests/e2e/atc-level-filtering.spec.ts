import { test, expect, type Page } from '@playwright/test';
import { mockVatsimDataEmpty, mockVatsimDataWithControllers } from './fixtures/vatsim-data';
import { expectATCLevelButtonActive } from './helpers/assertions';

test.describe('ATC Level Filtering', () => {
	test.beforeEach(async ({ page }) => {
		// Mock VATSIM API with controllers
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
		});
		
		await page.goto('/');
		
		// Wait for VATSIM data to finish loading (observable result)
		await expect(page.getByTestId('loading-state')).not.toBeVisible();
	});

	test('should filter departures by Tower level only', async ({ page }) => {
		// Click the Tower level checkbox for departure filtering
		await page.getByTestId('departure-atc-level-twr').click({ force: true });

		// Verify Tower checkbox is checked
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);

		// Verify departure select shows only airports with Tower online
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
		// Check the Ground level for departure filtering
		const groundCheckbox = page.getByTestId('departure-atc-level-gnd');
		await groundCheckbox.click({ force: true });

		// Verify departure select shows only airports with Ground online
		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		
		// Should include PHX (has GND), DEN (has GND)
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('DEN');
		
		// Should NOT include BWI (only has DEL), LAS (only has TWR)
		expect(departureOptions.join(',')).not.toContain('BWI');
	});

	test('should filter departures by Delivery level only', async ({ page }) => {
		// Check the Delivery level for departure filtering
		const deliveryCheckbox = page.getByTestId('departure-atc-level-del');
		await deliveryCheckbox.click({ force: true });

		// Verify departure select shows only airports with Delivery online
		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		
		// Should include BWI (has DEL)
		expect(departureOptions.join(',')).toContain('BWI');
		
		// Should NOT include PHX (has TWR+GND but no DEL)
		// BWI should be the only one with DEL in our mock data
	});

	test('should filter arrivals by Tower level only', async ({ page }) => {
		// Use the arrival Tower checkbox
		const arrivalTowerCheckbox = page.getByTestId('arrival-atc-level-twr');
		await arrivalTowerCheckbox.click({ force: true });

		// Verify arrival select shows only airports with Tower online
		const arrivalSelect = page.getByTestId('arrival-airport-select');
		const arrivalOptions = await arrivalSelect.locator('option').allTextContents();
		
		// Should include airports with Tower
		expect(arrivalOptions.join(',')).toContain('PHX');
		expect(arrivalOptions.join(',')).toContain('LAS');
		expect(arrivalOptions.join(',')).toContain('SEA');
	});

	test('should combine multiple ATC levels for departure (Tower + Delivery)', async ({ page }) => {
		// Check both Tower and Delivery for departures
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		await page.getByTestId('departure-atc-level-del').click({ force: true });

		// Verify both are checked
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-del', true);

		// Verify departure select shows airports with EITHER Tower OR Delivery
		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		
		// Should include PHX (has TWR), BWI (has DEL), LAS (has TWR), SEA (has TWR)
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('BWI');
		expect(departureOptions.join(',')).toContain('LAS');
		expect(departureOptions.join(',')).toContain('SEA');
	});

	test('should combine multiple ATC levels for departure (Ground + Delivery)', async ({ page }) => {
		// Check both Ground and Delivery for departures
		await page.getByTestId('departure-atc-level-gnd').click({ force: true });
		await page.getByTestId('departure-atc-level-del').click({ force: true });

		// Verify departure select shows airports with EITHER Ground OR Delivery
		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		
		// Should include PHX (has GND), DEN (has GND), BWI (has DEL)
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('DEN');
		expect(departureOptions.join(',')).toContain('BWI');
	});

	test('should uncheck "Any ATC online" when toggling off a specific level', async ({ page }) => {
		// First check "Any ATC online" - this should select all levels
		const anyATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await anyATCCheckbox.check();
		await expect(anyATCCheckbox).toBeChecked();
		
		// All levels should now be active
		await expectATCLevelButtonActive(page, 'departure-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-del', true);

		// Now toggle off Tower
		await page.getByTestId('departure-atc-level-twr').click({ force: true });

		// "Any ATC online" should now be unchecked
		await expect(anyATCCheckbox).not.toBeChecked();
		
		// Tower should be inactive, others still active
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

		// Verify they're checked
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
		
		// "Any ATC online" should be checked
		await expect(anyATCCheckbox).toBeChecked();
	});

	test('should auto-check "Any ATC online" when all levels are manually selected', async ({ page }) => {
		const anyATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		
		// Initially, "Any ATC online" should not be checked
		await expect(anyATCCheckbox).not.toBeChecked();
		
		// Manually select all 5 levels one by one
		await page.getByTestId('departure-atc-level-ctr').click({ force: true });
		await expect(anyATCCheckbox).not.toBeChecked(); // Not all selected yet
		
		await page.getByTestId('departure-atc-level-app').click({ force: true });
		await expect(anyATCCheckbox).not.toBeChecked(); // Not all selected yet
		
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		await expect(anyATCCheckbox).not.toBeChecked(); // Not all selected yet
		
		await page.getByTestId('departure-atc-level-gnd').click({ force: true });
		await expect(anyATCCheckbox).not.toBeChecked(); // Not all selected yet
		
		// Click the 5th and final level
		await page.getByTestId('departure-atc-level-del').click({ force: true });
		
		// Now "Any ATC online" should auto-check and all badges should become active
		await expect(anyATCCheckbox).toBeChecked();
		
		// Wait for badges to update to active state after checkbox is checked
		await expect(page.getByTestId('departure-atc-level-ctr')).toHaveClass(/atc-ctr-active/);
		await expectATCLevelButtonActive(page, 'departure-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'departure-atc-level-del', true);
	});

	test('should filter by specific departure level and show correct routes', async ({ page }) => {
		// Check Tower level for departures
		await page.getByTestId('departure-atc-level-twr').click({ force: true });

		// Select PHX as departure (has Tower)
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Should show departure group for PHX
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();

		// Verify PHX has Tower online
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'online');
	});

	test('should combine departure and arrival level filters', async ({ page }) => {
		// Check Tower for departures
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		
		// Check Delivery for arrivals
		await page.getByTestId('arrival-atc-level-del').click({ force: true });

		// Verify both filters are active
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-del', true);

		// Departure should show airports with Tower
		const departureSelect = page.getByTestId('departure-airport-select');
		const departureOptions = await departureSelect.locator('option').allTextContents();
		expect(departureOptions.join(',')).toContain('PHX');
		expect(departureOptions.join(',')).toContain('LAS');

		// Arrival should show airports with Delivery
		const arrivalSelect = page.getByTestId('arrival-airport-select');
		const arrivalOptions = await arrivalSelect.locator('option').allTextContents();
		expect(arrivalOptions.join(',')).toContain('BWI');
	});

	test('should show no airports when filtering by level with no online controllers', async ({ page }) => {
		// Mock empty VATSIM data
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataEmpty) });
		});
		await page.reload();
		
		// Wait for VATSIM data to finish loading after reload (observable result)
		await expect(page.getByTestId('loading-state')).not.toBeVisible();

		// Check Tower level
		const towerCheckbox = page.getByTestId('departure-atc-level-twr');
		await towerCheckbox.click({ force: true });
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);

		// Should show "No airports match current filters"
		await expect(page.getByText('No airports match current filters')).toBeVisible();

		// Departure select should only have "Any airport" option
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

		// Verify no departure groups shown (no filters active)
		const departureGroups = page.locator('[data-testid^="departure-group-"]');
		await expect(departureGroups).toHaveCount(0);
	});
});
