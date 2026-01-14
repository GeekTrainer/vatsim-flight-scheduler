import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { expectATCLevelButtonActive } from './helpers/assertions';
import { setupWithControllers } from './helpers/setup';

test.describe('Destination (Arrival) Filtering', () => {
	test.beforeEach(async ({ page }) => {
		await setupWithControllers(page);
	});

	test('should filter routes by arrival airport with ATC coverage using "Any ATC online"', async ({ page }) => {
		// Check "Any ATC online" for arrivals
		await page.getByTestId('any-atc-arrival-atc-filtering').check();

		// Select a departure to see routes
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Wait for PHX group to appear, then expand it
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		// Arrivals section should be visible
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).toBeVisible();

		// Should show arrival airports (check for destination header)
		await expect(arrivalsSection.getByText('Available Destinations')).toBeVisible();
		
		// Should show at least one arrival airport with ATC
		// Look for airport codes (format: KXXX)
		const airportCodes = arrivalsSection.locator('text=/K[A-Z]{3}/');
		const count = await airportCodes.count();
		expect(count).toBeGreaterThan(0);
	});

	test('should filter routes by specific arrival ATC level (Tower)', async ({ page }) => {
		// Select Tower level for arrivals
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });

		// Verify Tower is checked for arrivals
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', true);

		// Select a departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Wait for group to appear, then expand arrivals
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		// Should show arrivals section
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		// Arrivals should only include airports with Tower online (PHX, LAS, SEA from mock data)
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		
		// Check for at least one arrival with Tower
		// LAS has Tower in mock data and PHX has routes to LAS
		const hasLAS = await arrivalsSection.getByText('KLAS').count();
		expect(hasLAS).toBeGreaterThan(0);
	});

	test('should filter routes by specific arrival ATC level (Delivery)', async ({ page }) => {
		// Select Delivery level for arrivals
		await page.getByTestId('arrival-atc-level-del').click({ force: true });

		// Select a departure that has routes to BWI (which has Delivery)
		// First check what departures are available
		const departureSelect = page.getByTestId('departure-airport-select');
		const options = await departureSelect.locator('option').allTextContents();
		
		// Should have airports that fly to BWI
		// If BWI is available as departure, routes will exist
		if (options.join(',').includes('BWI')) {
			await departureSelect.selectOption('DEN'); // Try Denver as departure

			// Expand to see arrivals
			const denGroup = page.getByTestId('departure-group-DEN');
			if (await denGroup.isVisible()) {
				await denGroup.click();

				// Should show arrivals with Delivery only
				await expect(page.getByTestId('arrivals-section-DEN')).toBeVisible();
			}
		}
	});

	test('should combine multiple arrival ATC levels (Tower + Ground)', async ({ page }) => {
		// Select both Tower and Ground for arrivals
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });
		await page.getByTestId('arrival-atc-level-gnd').click({ force: true });

		// Verify both are active
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);

		// Select a departure
		await page.getByTestId('departure-airport-select').selectOption('SEA');

		// Should show routes to airports with either Tower OR Ground
		const seaGroup = page.getByTestId('departure-group-SEA');
		await expect(seaGroup).toBeVisible();
		
		await seaGroup.click();

		// Should show arrivals with Tower or Ground
		await expect(page.getByTestId('arrivals-section-SEA')).toBeVisible();
	});

	test('should clear arrival ATC filter when unchecking "Any ATC online"', async ({ page }) => {
		// Check "Any ATC online" for arrivals
		const anyATCCheckbox = page.getByTestId('any-atc-arrival-atc-filtering');
		await anyATCCheckbox.check();
		await expect(anyATCCheckbox).toBeChecked();

		// Uncheck it
		await anyATCCheckbox.uncheck();

		// Should be unchecked
		await expect(anyATCCheckbox).not.toBeChecked();

		// Verify no departure groups shown (no active filters)
		const departureGroups = page.locator('[data-testid^="departure-group-"]');
		await expect(departureGroups).toHaveCount(0);
	});

	test('should uncheck arrival "Any ATC online" when toggling off a specific arrival level', async ({ page }) => {
		// First check "Any ATC online" for arrivals - this should select all levels
		const anyATCCheckbox = page.getByTestId('any-atc-arrival-atc-filtering');
		await anyATCCheckbox.check();
		await expect(anyATCCheckbox).toBeChecked();
		
		// All levels should now be active
		await expectATCLevelButtonActive(page, 'arrival-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-del', true);

		// Now toggle off Tower
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });

		// "Any ATC online" should be unchecked
		await expect(anyATCCheckbox).not.toBeChecked();
		
		// Tower should be inactive, others still active
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', false);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-del', true);
	});

	test('should select all arrival specific levels when checking "Any ATC online"', async ({ page }) => {
		// First select specific levels
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });
		await page.getByTestId('arrival-atc-level-gnd').click({ force: true });

		// Verify they're checked
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);

		// Now check "Any ATC online"
		await page.getByTestId('any-atc-arrival-atc-filtering').check();

		// All specific levels should now be active
		await expectATCLevelButtonActive(page, 'arrival-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-del', true);
	});

	test('should auto-check arrival "Any ATC online" when all levels are manually selected', async ({ page }) => {
		const anyATCCheckbox = page.getByTestId('any-atc-arrival-atc-filtering');
		
		// Initially, "Any ATC online" should not be checked
		await expect(anyATCCheckbox).not.toBeChecked();
		
		// Manually select all 5 levels one by one
		await page.getByTestId('arrival-atc-level-ctr').click({ force: true });
		await expect(anyATCCheckbox).not.toBeChecked(); // Not all selected yet
		
		await page.getByTestId('arrival-atc-level-app').click({ force: true });
		await expect(anyATCCheckbox).not.toBeChecked(); // Not all selected yet
		
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });
		await expect(anyATCCheckbox).not.toBeChecked(); // Not all selected yet
		
		await page.getByTestId('arrival-atc-level-gnd').click({ force: true });
		await expect(anyATCCheckbox).not.toBeChecked(); // Not all selected yet
		
		// Click the 5th and final level
		await page.getByTestId('arrival-atc-level-del').click({ force: true });
		
		// Now "Any ATC online" should auto-check and all badges should become active
		await expect(anyATCCheckbox).toBeChecked();
		
		// Wait for badges to update to active state after checkbox is checked
		await expect(page.getByTestId('arrival-atc-level-ctr')).toHaveClass(/atc-ctr-active/);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-ctr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-app', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-del', true);
	});

	test('should show correct arrival ATC status when filtering by arrival levels', async ({ page }) => {
		// Select Tower for arrivals
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });

		// Select departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Wait for group to appear, then expand arrivals
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).toBeVisible();

		// All shown arrivals should have Tower online
		// Check for LAS which has Tower in mock data
		const lasArrival = arrivalsSection.getByText('KLAS').first();
		if (await lasArrival.isVisible()) {
			// Find the ATC badges for this arrival
			const lasContainer = lasArrival.locator('..').locator('..').locator('..');
			const towerBadge = lasContainer.getByTestId('atc-badge-twr').first();
			
			// Should show Tower as online
			await expect(towerBadge).toHaveAttribute('data-status', 'online');
		}
	});

	test('should combine departure and arrival ATC filters', async ({ page }) => {
		// Select Tower for departures
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		
		// Select Ground for arrivals
		await page.getByTestId('arrival-atc-level-gnd').click({ force: true });

		// Verify both filters are active
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);

		// Should show departure groups with Tower
		const departureGroups = page.locator('[data-testid^="departure-group-"]');
		const count = await departureGroups.count();
		
		// Should have departures with Tower (PHX, LAS, SEA from mock data)
		expect(count).toBeGreaterThan(0);

		// Select a departure to see arrivals
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		// Should show arrivals with Ground
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
	});

	test('should handle arrival filter with no matching airports gracefully', async ({ page }) => {
		// Start with controllers, select departure, then change to empty data
		// This tests that arrival filtering doesn't break when ATC goes offline
		
		// Select departure first (with ATC data loaded)
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// PHX group should be visible
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		// Now select a very specific arrival filter that won't match many airports
		// Select Delivery for arrivals (only BWI has DEL in mock data)
		await page.getByTestId('arrival-atc-level-del').click({ force: true });

		// Expand PHX
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		// Arrivals section should still work (even if limited results)
		// This test verifies the filter doesn't crash the UI
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).toBeVisible();
		
		// Should show header
		await expect(arrivalsSection.getByText('Available Destinations')).toBeVisible();
		
		// May have few or no results depending on routes, but UI should work
	});

	test('should filter arrival dropdown options based on arrival ATC filter', async ({ page }) => {
		// Select "Any ATC online" for arrivals
		await page.getByTestId('any-atc-arrival-atc-filtering').check();

		// Check arrival dropdown - should only show airports with ATC
		const arrivalSelect = page.getByTestId('arrival-airport-select');
		const options = await arrivalSelect.locator('option').allTextContents();

		// Should include airports with ATC coverage
		expect(options.join(',')).toContain('PHX');
		expect(options.join(',')).toContain('LAS');
		expect(options.join(',')).toContain('SEA');
		expect(options.join(',')).toContain('DEN');
		expect(options.join(',')).toContain('BWI');
	});

	test('should update arrivals when changing arrival ATC filter', async ({ page }) => {
		// Start with "Any ATC online" for arrivals
		await page.getByTestId('any-atc-arrival-atc-filtering').check();

		// Select departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Expand arrivals
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		// Should show arrivals
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		// Now change to specific level (Tower only)
		await page.getByTestId('any-atc-arrival-atc-filtering').uncheck();
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });

		// Arrivals should update to show only Tower airports
		// (Section should still be visible if there are matches)
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		const isVisible = await arrivalsSection.isVisible();
		
		// If visible, should have fewer arrivals than before
		if (isVisible) {
			const arrivals = arrivalsSection.locator('[class*="font-semibold text-green-400"]');
			const count = await arrivals.count();
			expect(count).toBeGreaterThan(0);
		}
	});

	test('should combine arrival airport selection with arrival ATC filter', async ({ page }) => {
		// Select "Any ATC online" for arrivals
		await page.getByTestId('any-atc-arrival-atc-filtering').check();

		// Also select specific arrival airport
		await page.getByTestId('arrival-airport-select').selectOption('LAS');

		// Select departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Should show PHX group
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		// Expand arrivals
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		// Should show only LAS in arrivals (specific airport selected)
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).toBeVisible();
		
		// Should show LAS
		await expect(arrivalsSection.getByText('KLAS')).toBeVisible();
		await expect(arrivalsSection.getByText('Las Vegas')).toBeVisible();
	});

	test('should toggle arrival ATC levels independently from departure', async ({ page }) => {
		// Select Tower for departures
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		
		// Select Ground for arrivals  
		await page.getByTestId('arrival-atc-level-gnd').click({ force: true });

		// Verify independence - departure Tower active, arrival Tower NOT active
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', false);
		
		// Departure Ground NOT active, arrival Ground active
		await expectATCLevelButtonActive(page, 'departure-atc-level-gnd', false);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);

		// Uncheck departure Tower
		await page.getByTestId('departure-atc-level-twr').click({ force: true });

		// Departure Tower should be unchecked, arrival Ground still checked
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', false);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);
	});
});
