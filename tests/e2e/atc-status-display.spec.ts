import { test, expect } from '@playwright/test';
import { mockVatsimDataEmpty, mockVatsimDataWithControllers } from './fixtures/vatsim-data';

test.describe('ATC Status Display', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should show all ATC positions as offline when no controllers online', async ({ page }) => {
		// Mock VATSIM API with no controllers
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataEmpty) });
		});
		
		// Wait for user guide to be visible (observable result that loading is complete)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select any departure to show a route
		const departureSelect = page.getByTestId('departure-airport-select');
		await departureSelect.selectOption('PHX');

		// Expand the departure group (if needed)
		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();

		// All ATC badges should be offline
		await expect(phxGroup.getByTestId('atc-badge-ctr')).toHaveAttribute('data-status', 'offline');
		await expect(phxGroup.getByTestId('atc-badge-app')).toHaveAttribute('data-status', 'offline');
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'offline');
		await expect(phxGroup.getByTestId('atc-badge-gnd')).toHaveAttribute('data-status', 'offline');
		await expect(phxGroup.getByTestId('atc-badge-del')).toHaveAttribute('data-status', 'offline');
	});

	test('should show specific positions as online when controllers are active', async ({ page }) => {
		// Mock VATSIM API with controllers
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
		});
		
		// Wait for user guide to be visible (observable result that loading is complete)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select PHX departure (has TWR and GND online)
		const departureSelect = page.getByTestId('departure-airport-select');
		await departureSelect.selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');

		// PHX has TWR and GND online
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'online');
		await expect(phxGroup.getByTestId('atc-badge-gnd')).toHaveAttribute('data-status', 'online');

		// PHX does NOT have CTR, APP, DEL online
		await expect(phxGroup.getByTestId('atc-badge-ctr')).toHaveAttribute('data-status', 'offline');
		await expect(phxGroup.getByTestId('atc-badge-app')).toHaveAttribute('data-status', 'offline');
		await expect(phxGroup.getByTestId('atc-badge-del')).toHaveAttribute('data-status', 'offline');
	});

	test('should display controller callsign, frequency, and time for online positions', async ({ page }) => {
		// Mock VATSIM API with controllers
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
		});
		
		// Wait for user guide to be visible (observable result that loading is complete)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select PHX departure
		const departureSelect = page.getByTestId('departure-airport-select');
		await departureSelect.selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');

		// Verify PHX_TWR controller details
		await expect(phxGroup.getByTestId('controller-callsign-PHX_TWR')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-callsign-PHX_TWR')).toHaveText('PHX_TWR');
		await expect(phxGroup.getByTestId('controller-frequency-PHX_TWR')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-frequency-PHX_TWR')).toHaveText('118.700');
		await expect(phxGroup.getByTestId('controller-time-PHX_TWR')).toBeVisible();

		// Verify PHX_GND controller details
		await expect(phxGroup.getByTestId('controller-callsign-PHX_GND')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-callsign-PHX_GND')).toHaveText('PHX_GND');
		await expect(phxGroup.getByTestId('controller-frequency-PHX_GND')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-frequency-PHX_GND')).toHaveText('121.900');
		await expect(phxGroup.getByTestId('controller-time-PHX_GND')).toBeVisible();
	});

});
