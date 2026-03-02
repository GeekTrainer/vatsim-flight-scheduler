import { type Page, expect } from '@playwright/test';

/**
 * Collapse the filter panel on mobile (it starts expanded)
 */
export async function collapseFilters(page: Page) {
	const toggle = page.getByTestId('filter-toggle');
	await toggle.click();
	await expect(page.getByTestId('filter-panel-content')).not.toBeVisible();
}

/**
 * Expand the filter panel on mobile (if collapsed)
 */
export async function expandFilters(page: Page) {
	const toggle = page.getByTestId('filter-toggle');
	await toggle.click();
	await expect(page.getByTestId('filter-panel-content')).toBeVisible();
}
