import { test, expect } from '@playwright/test';
import { mockVatsimDataWithControllers } from './fixtures/vatsim-data';

const mockFaaDatis = [
{ airport: 'KPHX', type: 'combined', code: 'R', datis: 'PHX ATIS INFO R. 24010KT 10SM FEW250 A2990.' }
];

function setupMocks(page: import('@playwright/test').Page) {
return Promise.all([
page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVatsimDataWithControllers) });
}),
page.route('https://atis.info/api/*', async (route) => {
await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFaaDatis) });
})
]);
}

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
await setupMocks(page);
await page.goto('/');
await page.locator('a[href="/settings"]').first().click();
await expect(page).toHaveURL('/settings');
});
});

test.describe('SimBrief on Flight Page', () => {
test('should show setup link when no username configured', async ({ page }) => {
await setupMocks(page);
await page.goto('/flight/KPHX-KLAS');
await page.evaluate(() => localStorage.removeItem('simbrief_username'));
await page.reload();
await expect(page.getByTestId('simbrief-settings-link')).toBeVisible();
});

test('should show File button when username is configured', async ({ page }) => {
await setupMocks(page);
await page.goto('/flight/KPHX-KLAS');
await page.evaluate(() => localStorage.setItem('simbrief_username', 'testpilot'));
await page.reload();
await expect(page.getByTestId('simbrief-file-button')).toBeVisible();
});

test('should show gear icon in flight page header', async ({ page }) => {
await setupMocks(page);
await page.goto('/flight/KPHX-KLAS');
await expect(page.locator('a[href="/settings"]')).toBeVisible();
});
});
