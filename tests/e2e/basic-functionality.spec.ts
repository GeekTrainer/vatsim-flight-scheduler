import { test, expect } from '@playwright/test';
import { setupWithEmptyVatsimData } from './helpers/setup';

test.describe('VATSIM Flight Scheduler - Basic Functionality', () => {
	test.beforeEach(async ({ page }) => {
		await setupWithEmptyVatsimData(page);
	});

	test('Page loads and shows main heading', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'VATSIM Flight Scheduler', level: 1 })).toBeVisible();
	});

	test('User guide is visible by default when no filters active', async ({ page }) => {
		// User guide should be visible
		const userGuide = page.getByTestId('user-guide');
		await expect(userGuide).toBeVisible();
		
		// Check for heading and key content
		await expect(page.getByRole('heading', { name: 'How to Use' })).toBeVisible();
		await expect(page.getByText(/Select filters above/i)).toBeVisible();
	});

	test('Filter panel is visible with all controls', async ({ page }) => {
		// Check departure airport select
		await expect(page.getByTestId('departure-airport-select')).toBeVisible();
		
		// Check arrival airport select
		await expect(page.getByTestId('arrival-airport-select')).toBeVisible();
	});

	test('Departure "Any ATC online" checkbox can be checked', async ({ page }) => {
		const anyATCCheckbox = page.locator('label:has-text("Any ATC online")').first().locator('input[type="checkbox"]');
		
		// Initially unchecked
		await expect(anyATCCheckbox).not.toBeChecked();
		
		// Check the checkbox
		await anyATCCheckbox.check();
		
		// Should now be checked
		await expect(anyATCCheckbox).toBeChecked();
	});

	test('Airport selection works', async ({ page }) => {
		const departureSelect = page.getByTestId('departure-airport-select');
		const arrivalSelect = page.getByTestId('arrival-airport-select');
		
		// Select Phoenix departure
		await departureSelect.selectOption('PHX');
		await expect(departureSelect).toHaveValue('PHX');
		
		// Select Las Vegas arrival
		await arrivalSelect.selectOption('LAS');
		await expect(arrivalSelect).toHaveValue('LAS');
	});

	test('User guide disappears when filter is applied', async ({ page }) => {
		// Initially guide should be visible
		const userGuide = page.getByTestId('user-guide');
		await expect(userGuide).toBeVisible();
		
		// Apply a filter
		const departureSelect = page.getByTestId('departure-airport-select');
		await departureSelect.selectOption('PHX');
		
		// Guide should disappear
		await expect(userGuide).not.toBeVisible();
	});
});
