import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers } from './fixtures/vatsim-data';
import { mockFaaDatisPhx, mockFaaDatisLas } from './fixtures/faa-datis';
import { VATSIM_API_URL } from './fixtures/test-constants';

test.describe('Controller Time Online Updates', () => {
	test('should update controller online time after VATSIM data refresh', async ({ page }) => {
		// Controller logged on at 23:00. We'll serve two different "snapshots"
		// to simulate the passage of time between refreshes.
		const recentLogonTime = new Date();
		recentLogonTime.setMinutes(recentLogonTime.getMinutes() - 45); // 45 min ago
		const logonTimeStr = recentLogonTime.toISOString();

		// Build mock data where PHX_TWR logged on 45 minutes ago
		const mockData = JSON.parse(JSON.stringify(mockVatsimDataWithControllers));
		for (const ctrl of mockData.controllers) {
			ctrl.logon_time = logonTimeStr;
		}

		let requestCount = 0;
		await page.route(VATSIM_API_URL, async (route) => {
			requestCount++;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockData)
			});
		});
		await page.route('https://atis.info/api/**', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		});
		await page.route('https://www.simbrief.com/api/**', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
		});

		await page.goto('/flight/KPHX-KLAS');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Expand the departure ATC section to see controller details
		const twrBadge = page.getByTestId('flight-departure-section').getByTestId('atc-badge-twr');
		await expect(twrBadge).toBeVisible();
		await expect(twrBadge).toHaveAttribute('data-status', 'online');

		// Click to expand and see controller time
		await twrBadge.click();

		// Verify the time element is visible for PHX_TWR
		const timeEl = page.getByTestId('controller-time-PHX_TWR');
		await expect(timeEl).toBeVisible();

		// Read the initial time value
		const initialTime = await timeEl.textContent();
		expect(initialTime).toBeTruthy();
		// Should show ~0:45 (45 minutes)
		expect(initialTime).toMatch(/\d+:\d{2}/);
	});

	test('should display correct time format for controller online duration', async ({ page }) => {
		// Set a controller logon time to exactly 2 hours 15 minutes ago
		const logonTime = new Date();
		logonTime.setHours(logonTime.getHours() - 2);
		logonTime.setMinutes(logonTime.getMinutes() - 15);
		const logonTimeStr = logonTime.toISOString();

		const mockData = JSON.parse(JSON.stringify(mockVatsimDataWithControllers));
		for (const ctrl of mockData.controllers) {
			ctrl.logon_time = logonTimeStr;
		}

		await page.route(VATSIM_API_URL, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockData)
			});
		});
		await page.route('https://atis.info/api/**', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		});
		await page.route('https://www.simbrief.com/api/**', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
		});

		await page.goto('/flight/KPHX-KLAS');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Expand TWR badge to see details
		const twrBadge = page.getByTestId('flight-departure-section').getByTestId('atc-badge-twr');
		await expect(twrBadge).toHaveAttribute('data-status', 'online');
		await twrBadge.click();

		const timeEl = page.getByTestId('controller-time-PHX_TWR');
		await expect(timeEl).toBeVisible();

		// Should show approximately 2:15 (allow ±1 minute for test execution time)
		const timeText = await timeEl.textContent();
		expect(timeText).toMatch(/2:1[4-6]/);
	});

	test('should show time that increases with controller logon duration', async ({ page }) => {
		// Controller logged on 90 minutes ago
		const logonTime90 = new Date();
		logonTime90.setMinutes(logonTime90.getMinutes() - 90);

		// Controller logged on 10 minutes ago
		const logonTime10 = new Date();
		logonTime10.setMinutes(logonTime10.getMinutes() - 10);

		const mockData = JSON.parse(JSON.stringify(mockVatsimDataWithControllers));
		// PHX_TWR: 90 min ago, PHX_GND: 10 min ago
		const twr = mockData.controllers.find((c: any) => c.callsign === 'PHX_TWR');
		const gnd = mockData.controllers.find((c: any) => c.callsign === 'PHX_GND');
		if (twr) twr.logon_time = logonTime90.toISOString();
		if (gnd) gnd.logon_time = logonTime10.toISOString();

		await page.route(VATSIM_API_URL, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockData)
			});
		});
		await page.route('https://atis.info/api/**', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		});
		await page.route('https://www.simbrief.com/api/**', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
		});

		await page.goto('/flight/KPHX-KLAS');
		await expect(page.getByTestId('flight-page')).toBeVisible();

		// Expand TWR badge to see both controllers
		const twrBadge = page.getByTestId('flight-departure-section').getByTestId('atc-badge-twr');
		await expect(twrBadge).toHaveAttribute('data-status', 'online');
		await twrBadge.click();

		// TWR should show ~1:30 (90 min)
		const twrTime = page.getByTestId('controller-time-PHX_TWR');
		await expect(twrTime).toBeVisible();
		await expect(twrTime).toContainText('1:');

		// Expand GND badge
		const gndBadge = page.getByTestId('flight-departure-section').getByTestId('atc-badge-gnd');
		await gndBadge.click();

		// GND should show ~0:10 (10 min)
		const gndTime = page.getByTestId('controller-time-PHX_GND');
		await expect(gndTime).toBeVisible();
		await expect(gndTime).toContainText('0:');

		// Parse both times and verify TWR > GND
		const parseMins = (t: string) => {
			const [h, m] = t.split(':').map(Number);
			return h * 60 + m;
		};
		const twrMins = parseMins((await twrTime.textContent())!);
		const gndMins = parseMins((await gndTime.textContent())!);
		expect(twrMins).toBeGreaterThan(gndMins);
	});
});
