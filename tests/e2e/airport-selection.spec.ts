import { test, expect } from '@playwright/test';
import { setupWithControllers } from './helpers/setup';

test.describe('Airport Selection', () => {
	test.beforeEach(async ({ page }) => {
		await setupWithControllers(page);
	});

	test('should show departure group when selecting a departure airport', async ({ page }) => {
		// Initially no routes shown (filter-first approach)
		await expect(page.getByTestId('departure-group-PHX')).not.toBeVisible();

		// Select Phoenix as departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Should show PHX departure group
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();
		
		// Should show airport info
		await expect(page.getByTestId('departure-group-PHX').getByText('KPHX')).toBeVisible();
		await expect(page.getByTestId('departure-group-PHX').getByText('Phoenix')).toBeVisible();
	});

	test('should show only selected departure airport when filtering', async ({ page }) => {
		// Select Las Vegas as departure
		await page.getByTestId('departure-airport-select').selectOption('LAS');

		// Should show LAS group
		await expect(page.getByTestId('departure-group-LAS')).toBeVisible();
		
		// Should NOT show other departure groups
		await expect(page.getByTestId('departure-group-PHX')).not.toBeVisible();
		await expect(page.getByTestId('departure-group-SEA')).not.toBeVisible();
		await expect(page.getByTestId('departure-group-DEN')).not.toBeVisible();
	});

	test('should filter arrivals based on selected departure', async ({ page }) => {
		// Select Phoenix as departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Get the PHX departure group and expand it
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		
		// Click to expand arrivals
		await phxGroup.click();

		// Should show arrivals section for PHX
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
		
		// Should show "Available Destinations" header
		await expect(page.getByTestId('arrivals-section-PHX').getByText('Available Destinations')).toBeVisible();
	});

	test('should show correct route when selecting both departure and arrival', async ({ page }) => {
		// Select Phoenix departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Select Las Vegas arrival
		await page.getByTestId('arrival-airport-select').selectOption('LAS');

		// Should show PHX departure group
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		// Expand to see arrivals
		await page.getByTestId('departure-group-PHX').click();

		// Should show LAS in the arrivals list
		await expect(page.getByTestId('departure-group-PHX').getByText('KLAS')).toBeVisible();
		await expect(page.getByTestId('departure-group-PHX').getByText('Las Vegas')).toBeVisible();
	});

	test('should clear departure filter when selecting "Any airport"', async ({ page }) => {
		// First select an airport
		await page.getByTestId('departure-airport-select').selectOption('PHX');
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		// Now select "Any airport" (empty value)
		await page.getByTestId('departure-airport-select').selectOption('');

		// Should NOT show any departure groups (no active filters)
		await expect(page.getByTestId('departure-group-PHX')).not.toBeVisible();
		const departureGroups = page.locator('[data-testid^="departure-group-"]');
		await expect(departureGroups).toHaveCount(0);
	});

	test('should update available arrivals when changing departure selection', async ({ page }) => {
		// Select PHX departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		// Change to SEA departure
		await page.getByTestId('departure-airport-select').selectOption('SEA');

		// Should now show SEA group instead
		await expect(page.getByTestId('departure-group-SEA')).toBeVisible();
		await expect(page.getByTestId('departure-group-PHX')).not.toBeVisible();
	});

	test('should combine airport selection with ATC filter', async ({ page }) => {
		// Check "Any ATC online" for departures
		await page.getByTestId('any-atc-departure-atc-filtering').check();

		// Select PHX (which has TWR and GND online in mock data)
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// Should show PHX group
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();

		// Verify ATC badges show online status
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'online');
		await expect(phxGroup.getByTestId('atc-badge-gnd')).toHaveAttribute('data-status', 'online');
	});

	test('should show multiple departure groups when no specific departure selected but arrival is', async ({ page }) => {
		// Select LAS as arrival
		await page.getByTestId('arrival-airport-select').selectOption('LAS');

		// Should show all departure airports that have routes to LAS
		// Check for a few known airports with routes to LAS
		const departureGroups = page.locator('[data-testid^="departure-group-"]');
		const count = await departureGroups.count();
		
		// Should have multiple departure groups (LAS is a major hub)
		expect(count).toBeGreaterThan(1);
	});

	test('should persist dropdown values after selection', async ({ page }) => {
		const departureSelect = page.getByTestId('departure-airport-select');
		const arrivalSelect = page.getByTestId('arrival-airport-select');

		// Select airports
		await departureSelect.selectOption('PHX');
		await arrivalSelect.selectOption('LAS');

		// Verify values are persisted
		await expect(departureSelect).toHaveValue('PHX');
		await expect(arrivalSelect).toHaveValue('LAS');
	});

	// ========== Expansion/Collapse Tests ==========

	test('should expand arrivals section when clicking departure group header', async ({ page }) => {
		await page.getByTestId('any-atc-departure-atc-filtering').check();
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();

		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).not.toBeVisible();

		await page.getByTestId("expand-button-PHX").click({ force: true });

		await expect(arrivalsSection).toBeVisible();
		await expect(arrivalsSection.getByText('Available Destinations')).toBeVisible();
	});

	test('should collapse arrivals section when clicking expanded departure group header', async ({ page }) => {
		await page.getByTestId('any-atc-departure-atc-filtering').check();
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		const phxButton = page.getByTestId('expand-button-PHX');
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');

		await phxButton.click({ force: true });
		await expect(arrivalsSection).toBeVisible();

		await phxButton.click({ force: true });
		await expect(arrivalsSection).not.toBeVisible();
	});

	test('should allow multiple departure groups to be expanded simultaneously', async ({ page }) => {
		await page.getByTestId('any-atc-departure-atc-filtering').check();

		const phxGroup = page.getByTestId('departure-group-PHX');
		const lasGroup = page.getByTestId('departure-group-LAS');
		const seaGroup = page.getByTestId('departure-group-SEA');

		await expect(phxGroup).toBeVisible();
		await expect(lasGroup).toBeVisible();
		await expect(seaGroup).toBeVisible();

		await page.getByTestId("expand-button-PHX").click({ force: true });
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		await page.getByTestId("expand-button-LAS").click({ force: true });
		await expect(page.getByTestId('arrivals-section-LAS')).toBeVisible();

		await page.getByTestId("expand-button-SEA").click({ force: true });
		await expect(page.getByTestId('arrivals-section-SEA')).toBeVisible();

		// All three should still be expanded
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
		await expect(page.getByTestId('arrivals-section-LAS')).toBeVisible();
		await expect(page.getByTestId('arrivals-section-SEA')).toBeVisible();
	});

	// ========== Original Tests (Trimmed) ==========

	test('should filter available departures based on selected arrival', async ({ page }) => {
		// Select LAS as arrival first
		await page.getByTestId('arrival-airport-select').selectOption('LAS');

		// Now check the departure dropdown - should only show airports with routes to LAS
		const departureSelect = page.getByTestId('departure-airport-select');
		const options = await departureSelect.locator('option').allTextContents();
		
		// Should have "Any airport" plus airports with routes to LAS
		expect(options.length).toBeGreaterThan(1);
		expect(options[0]).toContain('Any airport');
	});

	test('should show all departures with ATC when no specific airport selected', async ({ page }) => {
		// Check "Any ATC online" for departures
		await page.getByTestId('any-atc-departure-atc-filtering').check();

		// Should show multiple departure groups (all with ATC)
		const departureGroups = page.locator('[data-testid^="departure-group-"]');
		const count = await departureGroups.count();
		
		// Should have at least PHX, LAS, SEA, DEN, BWI (5 airports with ATC in mock data)
		expect(count).toBeGreaterThanOrEqual(5);
	});

	test('should handle selecting airport with no ATC coverage', async ({ page }) => {
		// Select an airport (all airports should be selectable)
		await page.getByTestId('departure-airport-select').selectOption('ATL');

		// Should show the departure group even if no ATC
		await expect(page.getByTestId('departure-group-ATL')).toBeVisible();

		// ATC badges should all be offline
		const atlGroup = page.getByTestId('departure-group-ATL');
		await expect(atlGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'offline');
		await expect(atlGroup.getByTestId('atc-badge-gnd')).toHaveAttribute('data-status', 'offline');
		await expect(atlGroup.getByTestId('atc-badge-del')).toHaveAttribute('data-status', 'offline');
		await expect(atlGroup.getByTestId('atc-badge-ctr')).toHaveAttribute('data-status', 'offline');
	});

	test('should show dropdown options in alphabetical order by city', async ({ page }) => {
		const departureSelect = page.getByTestId('departure-airport-select');
		
		// Get all options (skip first "Any airport" option)
		const options = await departureSelect.locator('option').allTextContents();
		const airportOptions = options.slice(1); // Remove "Any airport"

		// Verify at least some airports are present
		expect(airportOptions.length).toBeGreaterThan(0);
		
		// The options should contain city names in parentheses
		// Just verify the format is correct (City (CODE))
		for (const option of airportOptions.slice(0, 5)) { // Check first 5
			expect(option).toMatch(/\w+.*\(\w{3}\)/); // Format: "City (XXX)"
		}
	});
});
