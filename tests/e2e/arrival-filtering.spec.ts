import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { expectATCLevelButtonActive } from './helpers/assertions';
import { setupWithControllers } from './helpers/setup';

test.describe('Destination (Arrival) Filtering', () => {
	test.beforeEach(async ({ page }) => {
		await setupWithControllers(page);
	});

	test('should filter routes by arrival airport with ATC coverage using "Any ATC online"', async ({ page }) => {
		await page.getByTestId('any-atc-arrival-atc-filtering').check();
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).toBeVisible();
		await expect(arrivalsSection.getByText('Available Destinations')).toBeVisible();
		
		const airportCodes = arrivalsSection.locator('text=/K[A-Z]{3}/');
		const count = await airportCodes.count();
		expect(count).toBeGreaterThan(0);
	});

	test('should filter routes by specific arrival ATC level (Tower)', async ({ page }) => {
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', true);

		await page.getByTestId('departure-airport-select').selectOption('PHX');

		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		await expect(page.getByTestId('arrivals-section-PHX')).toBeVisible();

		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		const hasLAS = await arrivalsSection.getByText('KLAS').count();
		expect(hasLAS).toBeGreaterThan(0);
	});

	test('should combine multiple arrival ATC levels (Tower + Ground)', async ({ page }) => {
		await page.getByTestId('arrival-atc-level-twr').click({ force: true });
		await page.getByTestId('arrival-atc-level-gnd').click({ force: true });

		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);

		await page.getByTestId('departure-airport-select').selectOption('SEA');

		const seaGroup = page.getByTestId('departure-group-SEA');
		await expect(seaGroup).toBeVisible();
		await seaGroup.click();

		await expect(page.getByTestId('arrivals-section-SEA')).toBeVisible();
	});

	test('should filter arrival dropdown options based on arrival ATC filter', async ({ page }) => {
		await page.getByTestId('any-atc-arrival-atc-filtering').check();

		const arrivalSelect = page.getByTestId('arrival-airport-select');
		const options = await arrivalSelect.locator('option').allTextContents();

		expect(options.join(',')).toContain('PHX');
		expect(options.join(',')).toContain('LAS');
		expect(options.join(',')).toContain('SEA');
		expect(options.join(',')).toContain('DEN');
		expect(options.join(',')).toContain('BWI');
	});

	test('should combine arrival airport selection with arrival ATC filter', async ({ page }) => {
		await page.getByTestId('any-atc-arrival-atc-filtering').check();
		await page.getByTestId('arrival-airport-select').selectOption('LAS');
		await page.getByTestId('departure-airport-select').selectOption('PHX');

		await expect(page.getByTestId('departure-group-PHX')).toBeVisible();

		const phxGroup = page.getByTestId('departure-group-PHX');
		await expect(phxGroup).toBeVisible();
		await phxGroup.click();

		const arrivalsSection = page.getByTestId('arrivals-section-PHX');
		await expect(arrivalsSection).toBeVisible();
		
		await expect(arrivalsSection.getByText('KLAS')).toBeVisible();
		await expect(arrivalsSection.getByText('Las Vegas')).toBeVisible();
	});

	test('should toggle arrival ATC levels independently from departure', async ({ page }) => {
		await page.getByTestId('departure-atc-level-twr').click({ force: true });
		await page.getByTestId('arrival-atc-level-gnd').click({ force: true });

		// Verify independence
		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', true);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-twr', false);
		
		await expectATCLevelButtonActive(page, 'departure-atc-level-gnd', false);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);

		await page.getByTestId('departure-atc-level-twr').click({ force: true });

		await expectATCLevelButtonActive(page, 'departure-atc-level-twr', false);
		await expectATCLevelButtonActive(page, 'arrival-atc-level-gnd', true);
	});
});

