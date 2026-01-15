import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers } from './fixtures/vatsim-data';

test.describe('Route Expansion and Collapse', () => {
	test.beforeEach(async ({ page }) => {
		// Mock VATSIM API with controllers FIRST (before goto)
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
		});
		
		await page.goto('/');
		
		// Wait for user guide to be visible (observable result that loading is complete)
		await expect(page.getByTestId('user-guide')).toBeVisible();
		
		// Select "Any ATC online" to show multiple departure groups
		const anyATCCheckbox = page.getByTestId('any-atc-departure-atc-filtering');
		await anyATCCheckbox.check();
		await expect(anyATCCheckbox).toBeChecked();
		
		// Wait for at least one departure group to appear (observable result of filter being applied)
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();
	});

	test('should expand arrivals section when clicking departure group header', async ({ page }) => {
		// Verify PHX group is visible
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();

		// Arrivals section should NOT be visible initially (collapsed)
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).not.toBeVisible();

		// Click the departure group header to expand
		await page.getByTestId("expand-button-PHX").click({ force: true });

		// Arrivals section should now be visible
		await expect(arrivalsSection).toBeVisible();
		
		// Should show "Available Destinations" header
		await expect(arrivalsSection.getByText('Available Destinations')).toBeVisible();
	});

	test('should collapse arrivals section when clicking expanded departure group header', async ({ page }) => {
		const phxButton = page.getByTestId('expand-button-PHX');
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');

		// First expand it
		await phxButton.click({ force: true });
		await expect(arrivalsSection).toBeVisible();

		// Click again to collapse
		await phxButton.click({ force: true });

		// Arrivals section should be hidden
		await expect(arrivalsSection).not.toBeVisible();
	});

	test('should allow multiple departure groups to be expanded simultaneously', async ({ page }) => {
		// Get multiple departure groups
		const phxGroup = page.getByTestId('departure-group-PHX');
		const lasGroup = page.getByTestId('departure-group-LAS');
		const seaGroup = page.getByTestId('departure-group-SEA');

		// Verify all are visible
		await expect(phxGroup).toBeVisible();
		await expect(lasGroup).toBeVisible();
		await expect(seaGroup).toBeVisible();

		// Expand PHX
		await page.getByTestId("expand-button-PHX").click({ force: true });
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		// Expand LAS
		await page.getByTestId("expand-button-LAS").click({ force: true });
		await expect(page.getByTestId('arrivals-section-LAS')).toBeVisible();

		// Expand SEA
		await page.getByTestId("expand-button-SEA").click({ force: true });
		await expect(page.getByTestId('arrivals-section-SEA')).toBeVisible();

		// All three should still be expanded
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
		await expect(page.getByTestId('arrivals-section-LAS')).toBeVisible();
		await expect(page.getByTestId('arrivals-section-SEA')).toBeVisible();
	});

	test('should show chevron icon that indicates expansion state', async ({ page }) => {
		const phxGroup = page.getByTestId('departure-group-PHX');
		
		// Find the chevron SVG (it's in the button)
		const chevron = phxGroup.locator('svg').last();
		await expect(chevron).toBeVisible();

		// Expand the group
		await page.getByTestId("expand-button-PHX").click({ force: true });

		// Chevron should still be visible (just rotated via CSS)
		await expect(chevron).toBeVisible();
		
		// Collapse it
		await page.getByTestId("expand-button-PHX").click({ force: true });

		// Chevron should still be visible
		await expect(chevron).toBeVisible();
	});

	test('should maintain expansion state when other groups are toggled', async ({ page }) => {
		const phxButton = page.getByTestId('expand-button-PHX');
		const lasButton = page.getByTestId('expand-button-LAS');

		// Expand PHX
		await phxButton.click({ force: true });
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		// Expand LAS
		await lasButton.click({ force: true });
		await expect(page.getByTestId('arrivals-section-LAS')).toBeVisible();

		// PHX should still be expanded
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		// Collapse LAS
		await lasButton.click({ force: true });
		await expect(page.getByTestId('arrivals-section-LAS')).not.toBeVisible();

		// PHX should STILL be expanded
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
	});

	test('should show destination count in departure header', async ({ page }) => {
		const phxGroup = page.getByTestId('departure-group-PHX');

		// Should show number of destinations
		// Look for pattern like "49 destinations" or "1 destination"
		const destinationText = phxGroup.locator('text=/\\d+ destination/');
		await expect(destinationText).toBeVisible();
	});

	test('should expand/collapse with keyboard interaction', async ({ page }) => {
		// Get the departure group button (the clickable header)
		const phxButton = page.getByTestId('departure-group-PHX').locator('button').first();
		
		// Focus the button
		await phxButton.focus();
		
		// Press Enter to expand
		await phxButton.press('Enter');
		
		// Arrivals should be visible
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
		
		// Press Enter again to collapse
		await phxButton.press('Enter');
		
		// Arrivals should be hidden
		await expect(page.getByTestId('arrivals-section-PHX')).not.toBeVisible();
	});

	test('should show arrivals immediately when expanding', async ({ page }) => {
		const phxGroup = page.getByTestId('departure-group-PHX');
		
		// Click to expand
		await page.getByTestId("expand-button-PHX").click({ force: true });
		
		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).toBeVisible();
		
		// Should have arrival airports immediately visible (no loading state)
		// Look for airport codes
		const airportCodes = arrivalsSection.locator('text=/K[A-Z]{3}/');
		const count = await airportCodes.count();
		expect(count).toBeGreaterThan(0);
	});

	test('should collapse all expanded groups when changing filters', async ({ page }) => {
		// Expand multiple groups
		await page.getByTestId('departure-group-PHX').click();
		await page.getByTestId('departure-group-LAS').click();

		// Verify both are expanded
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
		await expect(page.getByTestId('arrivals-section-LAS')).toBeVisible();

		// Change filter - select a specific departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		// LAS group should not be visible anymore (filter changed)
		await expect(page.getByTestId('departure-group-LAS')).not.toBeVisible();
		
		// PHX group should be visible but collapsed (filter change resets state)
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();
		await expect(page.getByTestId('arrivals-section-PHX')).not.toBeVisible();
	});
});
