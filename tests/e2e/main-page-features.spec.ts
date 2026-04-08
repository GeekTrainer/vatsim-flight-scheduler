import { test, expect } from '@playwright/test';
import { setupWithEmptyVatsimData, setupWithControllers } from './helpers/setup';
import { mockVatsimDataWithControllers } from './fixtures/vatsim-data';
import { VATSIM_API_URL } from './fixtures/test-constants';

test.describe('Slider + Filter Combinations', () => {
	test('slider combined with departure airport filter', async ({ page }) => {
		await setupWithEmptyVatsimData(page);

		// Select PHX as departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		// Get initial route count with only airport filter
		const routeResults = page.getByTestId('route-results');
		await expect(routeResults).toBeVisible();
		const initialCount = Number(await routeResults.getAttribute('data-route-count'));
		expect(initialCount).toBeGreaterThan(0);

		// Move min slider to 150 min (2h 30m)
		const minSlider = page.getByTestId('flight-time-slider-min');
		await minSlider.fill('150');
		await minSlider.dispatchEvent('input');

		// Both filters active — route count should be equal or smaller
		const filteredCount = Number(await routeResults.getAttribute('data-route-count'));
		expect(filteredCount).toBeLessThanOrEqual(initialCount);
		expect(filteredCount).toBeGreaterThan(0);

		// Only PHX departure groups should be shown
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		// Tighten slider further
		await minSlider.fill('240');
		await minSlider.dispatchEvent('input');

		const tighterCount = Number(await routeResults.getAttribute('data-route-count'));
		expect(tighterCount).toBeLessThanOrEqual(filteredCount);
	});

	test('slider combined with ATC filter', async ({ page }) => {
		await setupWithControllers(page);

		// Enable "Any ATC online" for departure
		await page.getByTestId('any-atc-departure-atc-filtering').check();
		await expect(page.getByTestId('user-guide')).not.toBeVisible();

		// Get initial route count
		const routeResults = page.getByTestId('route-results');
		await expect(routeResults).toBeVisible();
		const initialCount = Number(await routeResults.getAttribute('data-route-count'));
		expect(initialCount).toBeGreaterThan(0);

		// Move min slider to restrict flight time
		const minSlider = page.getByTestId('flight-time-slider-min');
		await minSlider.fill('180');
		await minSlider.dispatchEvent('input');

		// Route count should decrease or stay the same
		const filteredCount = Number(await routeResults.getAttribute('data-route-count'));
		expect(filteredCount).toBeLessThanOrEqual(initialCount);
		expect(filteredCount).toBeGreaterThanOrEqual(0);
	});
});

test.describe('ATC Badge Expansion on Main Page', () => {
	test('ATC badge shows controller details in departure group', async ({ page }) => {
		await setupWithControllers(page);

		// Select PHX departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();

		// TWR badge should be online with controller details visible
		const twrBadge = phxGroup.getByTestId('atc-badge-twr');
		await expect(twrBadge).toHaveAttribute('data-status', 'online');
		await expect(phxGroup.getByTestId('controller-callsign-PHX_TWR')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-callsign-PHX_TWR')).toHaveText('PHX_TWR');
		await expect(phxGroup.getByTestId('controller-frequency-PHX_TWR')).toHaveText('118.700');
		await expect(phxGroup.getByTestId('controller-time-PHX_TWR')).toBeVisible();
	});

	test('clicking expand button shows arrivals then collapses on second click', async ({
		page
	}) => {
		await setupWithControllers(page);

		await page.getByTestId('departure-airport-select').selectOption('PHX');
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		// Arrivals section not visible initially
		await expect(page.getByTestId('arrivals-section-PHX')).not.toBeVisible();

		// Click expand
		await page.getByTestId('expand-button-PHX').click({ force: true });
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		// Click again to collapse
		await page.getByTestId('expand-button-PHX').click({ force: true });
		await expect(page.getByTestId('arrivals-section-PHX')).not.toBeVisible();
	});

	test('multiple departure groups can be independently expanded', async ({ page }) => {
		await setupWithControllers(page);

		// Enable ATC filter to show multiple departure groups
		await page.getByTestId('any-atc-departure-atc-filtering').check();
		await expect(page.getByTestId('user-guide')).not.toBeVisible();

		// Both PHX and LAS should be visible (they have controllers online)
		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();
		await expect(page.getByTestId('departure-group-LAS')).toBeVisible();

		// Expand PHX
		await page.getByTestId('expand-button-PHX').click({ force: true });
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		// Expand LAS
		await page.getByTestId('expand-button-LAS').click({ force: true });
		await expect(page.getByTestId('arrivals-section-LAS')).toBeVisible();

		// Both should still be expanded independently
		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();
		await expect(page.getByTestId('arrivals-section-LAS')).toBeVisible();
	});
});

test.describe('Multi-Controller Display', () => {
	test('multiple controllers at same position show in badge', async ({ page }) => {
		const mockMultiController = {
			...mockVatsimDataWithControllers,
			controllers: [
				...mockVatsimDataWithControllers.controllers,
				// Second PHX tower on different frequency
				{
					cid: 1234590,
					name: 'Controller PHX2',
					callsign: 'PHX_S_TWR',
					frequency: '120.900',
					facility: 4,
					rating: 5,
					server: 'USA-WEST',
					visual_range: 100,
					text_atis: null,
					last_updated: '2026-01-13T23:30:00.0000000Z',
					logon_time: '2026-01-13T23:00:00.0000000Z'
				}
			]
		};

		await page.route(VATSIM_API_URL, async (route) => {
			await route.fulfill({ status: 200, body: JSON.stringify(mockMultiController) });
		});
		await page.goto('/');
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select PHX departure
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');

		// TWR badge should be online
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute('data-status', 'online');

		// Both controller callsigns should be visible
		await expect(phxGroup.getByTestId('controller-callsign-PHX_TWR')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-callsign-PHX_S_TWR')).toBeVisible();

		// Both frequencies should be visible
		await expect(phxGroup.getByTestId('controller-frequency-PHX_TWR')).toHaveText('118.700');
		await expect(phxGroup.getByTestId('controller-frequency-PHX_S_TWR')).toHaveText('120.900');

		// Both times should be visible
		await expect(phxGroup.getByTestId('controller-time-PHX_TWR')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-time-PHX_S_TWR')).toBeVisible();
	});
});

test.describe('Main Page Auto-Refresh', () => {
	test('data refreshes after 30 seconds with updated controllers', async ({ page }) => {
		const mockFirstData = { ...mockVatsimDataWithControllers };
		const mockSecondData = {
			...mockVatsimDataWithControllers,
			controllers: [
				...mockVatsimDataWithControllers.controllers,
				// New DEL controller appears after refresh
				{
					cid: 1234599,
					name: 'New DEL Controller',
					callsign: 'PHX_DEL',
					frequency: '118.100',
					facility: 2,
					rating: 3,
					server: 'USA-EAST',
					visual_range: 100,
					text_atis: null,
					last_updated: '2026-01-13T23:55:00.0000000Z',
					logon_time: '2026-01-13T23:50:00.0000000Z'
				}
			]
		};

		// Install fake clock to control setInterval timing precisely
		await page.clock.install({ time: new Date('2026-01-13T23:50:00Z') });

		let callCount = 0;
		await page.route(VATSIM_API_URL, async (route) => {
			callCount++;
			if (callCount <= 1) {
				await route.fulfill({ status: 200, body: JSON.stringify(mockFirstData) });
			} else {
				await route.fulfill({ status: 200, body: JSON.stringify(mockSecondData) });
			}
		});

		await page.goto('/');
		await expect(page.getByTestId('user-guide')).toBeVisible();

		// Select PHX departure to see ATC badges
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');

		// Initial state: DEL should be offline, TWR should be online
		await expect(phxGroup.getByTestId('atc-badge-del')).toHaveAttribute(
			'data-status',
			'offline'
		);
		await expect(phxGroup.getByTestId('atc-badge-twr')).toHaveAttribute(
			'data-status',
			'online'
		);

		// Fast-forward past the 30s refresh interval + cache expiry
		await page.clock.fastForward(35_000);

		// The interval fires, cache is expired, fresh data is fetched (callCount=2)
		await expect(phxGroup.getByTestId('atc-badge-del')).toHaveAttribute(
			'data-status',
			'online',
			{ timeout: 5_000 }
		);

		// Verify the new controller details appeared
		await expect(phxGroup.getByTestId('controller-callsign-PHX_DEL')).toBeVisible();
		await expect(phxGroup.getByTestId('controller-frequency-PHX_DEL')).toHaveText('118.100');
	});
});
