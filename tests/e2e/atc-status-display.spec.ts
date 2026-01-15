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

	test('should display different ATC positions for different airports', async ({ page }) => {
		// Mock VATSIM API with controllers
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
		});
		
		// Wait for user guide to be visible (observable result that loading is complete)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select BWI departure (has only DEL online)
		const departureSelect = page.getByTestId('departure-airport-select');
		await departureSelect.selectOption('BWI');

		const bwiGroup = page.getByTestId('departure-group-BWI');

		// BWI has only DEL online
		await expect(bwiGroup.getByTestId('atc-badge-del')).toHaveAttribute('data-status', 'online');
		await expect(bwiGroup.getByTestId('controller-callsign-BWI_DEL')).toBeVisible();
		await expect(bwiGroup.getByTestId('controller-callsign-BWI_DEL')).toHaveText('BWI_DEL');

		// All other positions offline
		await expect(bwiGroup.getByTestId('atc-badge-ctr')).toHaveAttribute('data-status', 'offline');
		await expect(bwiGroup.getByTestId('atc-badge-app')).toHaveAttribute('data-status', 'offline');
		await expect(bwiGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'offline');
		await expect(bwiGroup.getByTestId('atc-badge-gnd')).toHaveAttribute('data-status', 'offline');
	});

	test('should show all 5 ATC position badges regardless of online status', async ({ page }) => {
		// Mock VATSIM API with controllers
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
		});
		
		// Wait for user guide to be visible (observable result that loading is complete)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select any departure
		const departureSelect = page.getByTestId('departure-airport-select');
		await departureSelect.selectOption('LAS');

		const lasGroup = page.getByTestId('departure-group-LAS');

		// All 5 positions should be present (CTR, APP, TWR, GND, DEL)
		await expect(lasGroup.getByTestId('atc-badge-ctr')).toBeVisible();
		await expect(lasGroup.getByTestId('atc-badge-app')).toBeVisible();
		await expect(lasGroup.getByTestId('atc-badge-twr')).toBeVisible();
		await expect(lasGroup.getByTestId('atc-badge-gnd')).toBeVisible();
		await expect(lasGroup.getByTestId('atc-badge-del')).toBeVisible();
	});

	test('should update ATC status when VATSIM data changes', async ({ page }) => {
		// Start with no controllers
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataEmpty) });
		});
		
		// Wait for user guide to be visible (observable result that loading is complete)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select PHX
		const departureSelect = page.getByTestId('departure-airport-select');
		await departureSelect.selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();

		// Initially all offline
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'offline');
		await expect(phxGroup.getByTestId('atc-badge-gnd')).toHaveAttribute('data-status', 'offline');

		// Update route to return controllers
		await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockVatsimDataWithControllers) });
		});

		// Force a page reload to simulate data refresh
		await page.reload();
		
		// Wait for user guide to be visible after reload (observable result that loading is complete)
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select PHX again
		await departureSelect.selectOption('PHX');
		
		// Wait for PHX group to be visible again after reload
		await expect(phxGroup).toBeVisible();

		// Now TWR and GND should be online
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'online');
		await expect(phxGroup.getByTestId('atc-badge-gnd')).toHaveAttribute('data-status', 'online');
		await expect(phxGroup.getByTestId('controller-callsign-PHX_TWR')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-callsign-PHX_GND')).toBeVisible();
	});
});
