import { test, expect } from '@playwright/test';
import { setupWithFlightPageMocks } from './helpers/setup';
import { mockSimBriefMatchingPlan, mockSimBriefMismatchedPlan } from './fixtures/simbrief-data';

test.describe('Settings Page', () => {
test('should load settings page with SimBrief section', async ({ page }) => {
await page.goto('/settings');
await expect(page.getByRole('heading', { name: 'SimBrief' })).toBeVisible();
await expect(page.getByTestId('settings-simbrief-username')).toBeVisible();
await expect(page.getByTestId('settings-simbrief-save')).toBeVisible();
});

test('should read stored username from localStorage on load', async ({ page }) => {
await page.goto('/settings');
await page.evaluate(() => localStorage.setItem('simbrief_username', 'mypilot'));
await page.reload();
await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('mypilot');
});

test('should show empty input when no username stored', async ({ page }) => {
await page.goto('/settings');
await page.evaluate(() => localStorage.removeItem('simbrief_username'));
await page.reload();
await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('');
});

test('should be accessible from main page gear icon', async ({ page }) => {
await setupWithFlightPageMocks(page);
await page.goto('/');
await page.locator('a[href="/settings"]').first().click();
await expect(page).toHaveURL('/settings');
});

test('should have VATSIM CID field', async ({ page }) => {
await page.goto('/settings');
await expect(page.getByTestId('settings-vatsim-cid')).toBeVisible();
});

test('should read stored VATSIM CID from localStorage', async ({ page }) => {
await page.goto('/settings');
await page.evaluate(() => localStorage.setItem('vatsim_cid', '1234567'));
await page.reload();
await expect(page.getByTestId('settings-vatsim-cid')).toHaveValue('1234567');
});

test('should persist username after save and reload', async ({ page }) => {
await page.goto('/settings');
// Pre-set a value and reload to ensure hydration is complete
await page.evaluate(() => localStorage.setItem('simbrief_username', 'old'));
await page.reload();
const input = page.getByTestId('settings-simbrief-username');
await expect(input).toHaveValue('old');

// Now fill new value and save
await input.fill('testpilot123');
await page.getByTestId('settings-simbrief-save').click({ force: true });
await expect(page.getByTestId('settings-saved-message')).toBeVisible();
await page.reload();
await expect(input).toHaveValue('testpilot123');
});

test('should persist VATSIM CID after save and reload', async ({ page }) => {
await page.goto('/settings');
// Pre-set a value and reload to ensure hydration is complete
await page.evaluate(() => localStorage.setItem('vatsim_cid', '0000000'));
await page.reload();
const input = page.getByTestId('settings-vatsim-cid');
await expect(input).toHaveValue('0000000');

// Now fill new value and save
await input.fill('9876543');
await page.getByTestId('settings-vatsim-save').click({ force: true });
await expect(page.getByTestId('settings-saved-message')).toBeVisible();
await page.reload();
await expect(input).toHaveValue('9876543');
});

test('should clear all stored data when Clear is clicked', async ({ page }) => {
await page.goto('/settings');
await page.evaluate(() => {
	localStorage.setItem('simbrief_username', 'pilottoclear');
	localStorage.setItem('vatsim_cid', '1111111');
});
await page.reload();
await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('pilottoclear');
await expect(page.getByTestId('settings-vatsim-cid')).toHaveValue('1111111');

// Click Clear
await page.getByTestId('settings-clear').click({ force: true });
await expect(page.getByTestId('settings-saved-message')).toBeVisible();

// Verify inputs are empty
await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('');
await expect(page.getByTestId('settings-vatsim-cid')).toHaveValue('');

// Reload and verify localStorage was cleared
await page.reload();
await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('');
await expect(page.getByTestId('settings-vatsim-cid')).toHaveValue('');
});

test('should show saved message after clicking save', async ({ page }) => {
await page.goto('/settings');
// Pre-set a value and reload to ensure hydration is complete
await page.evaluate(() => localStorage.setItem('simbrief_username', 'hydrate'));
await page.reload();
await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('hydrate');

await expect(page.getByTestId('settings-saved-message')).not.toBeVisible();
await page.getByTestId('settings-simbrief-save').click({ force: true });
await expect(page.getByTestId('settings-saved-message')).toBeVisible();
});

test('should clear stored value when saving empty username', async ({ page }) => {
await page.goto('/settings');
await page.evaluate(() => localStorage.setItem('simbrief_username', 'pilot'));
await page.reload();
await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('pilot');

// Clear the input and save via Enter
await page.getByTestId('settings-simbrief-username').fill('');
await page.getByTestId('settings-simbrief-username').press('Enter');
await expect(page.getByTestId('settings-saved-message')).toBeVisible();

// Reload to verify cleared
await page.reload();
await expect(page.getByTestId('settings-simbrief-username')).toHaveValue('');
});
});

test.describe('SimBrief on Flight Page', () => {
test('should show setup link when no username configured', async ({ page }) => {
await setupWithFlightPageMocks(page);
await page.goto('/flight/KPHX-KLAS');
await page.evaluate(() => localStorage.removeItem('simbrief_username'));
await page.reload();
await expect(page.getByTestId('simbrief-settings-link').first()).toBeVisible();
});

test('should show File button when username is configured', async ({ page }) => {
await setupWithFlightPageMocks(page);
await page.goto('/flight/KPHX-KLAS');
await page.evaluate(() => localStorage.setItem('simbrief_username', 'testpilot'));
await page.reload();
await expect(page.getByTestId('simbrief-file-button').first()).toBeVisible();
});

test('should show gear icon in flight page header', async ({ page }) => {
await setupWithFlightPageMocks(page);
await page.goto('/flight/KPHX-KLAS');
await expect(page.locator('a[href="/settings"]')).toBeVisible();
});

test('should load and display SimBrief plan when Load button is clicked', async ({ page }) => {
// Set up username before navigating
await page.goto('/settings');
await page.evaluate(() => localStorage.setItem('simbrief_username', 'testpilot'));

// Mock APIs — override SimBrief to return matching plan
await setupWithFlightPageMocks(page);
await page.route('https://www.simbrief.com/api/**', async (route) => {
	await route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify(mockSimBriefMatchingPlan)
	});
});

await page.goto('/flight/KPHX-KLAS');
await expect(page.getByTestId('simbrief-load-button').first()).toBeVisible();
await page.getByTestId('simbrief-load-button').first().click();

// After loading, plan data should be displayed (route, fuel info)
await expect(page.getByText('PXR J80 TBC')).toBeVisible();
await expect(page.getByText('Block Fuel')).toBeVisible();
await expect(page.getByText('Trip Fuel')).toBeVisible();
});

test('should show route mismatch warning for wrong plan', async ({ page }) => {
await page.goto('/settings');
await page.evaluate(() => localStorage.setItem('simbrief_username', 'testpilot'));

await setupWithFlightPageMocks(page);
await page.route('https://www.simbrief.com/api/**', async (route) => {
	await route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify(mockSimBriefMismatchedPlan)
	});
});

await page.goto('/flight/KPHX-KLAS');
await page.getByTestId('simbrief-load-button').first().click();

// Mismatch warning should appear since plan is JFK→LAX but route is PHX→LAS
await expect(page.getByTestId('simbrief-route-mismatch')).toBeVisible();
await expect(page.getByTestId('simbrief-route-mismatch')).toContainText('KJFK');
await expect(page.getByTestId('simbrief-route-mismatch')).toContainText('KLAX');
});

test('should show VATSIM prefile link after loading valid plan', async ({ page }) => {
await page.goto('/settings');
await page.evaluate(() => {
	localStorage.setItem('simbrief_username', 'testpilot');
	localStorage.removeItem('vatsim_cid');
});

await setupWithFlightPageMocks(page);
await page.route('https://www.simbrief.com/api/**', async (route) => {
	await route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify(mockSimBriefMatchingPlan)
	});
});

await page.goto('/flight/KPHX-KLAS');
await page.getByTestId('simbrief-load-button').first().click();

// Pre-file link should appear with correct VATSIM URL
const prefileLink = page.getByTestId('vatsim-prefile-link');
await expect(prefileLink).toBeVisible();
await expect(prefileLink).toHaveAttribute('href', /my\.vatsim\.net\/pilots\/flightplan/);
});
});
