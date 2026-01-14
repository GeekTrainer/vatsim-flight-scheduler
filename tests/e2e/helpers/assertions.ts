import { expect, type Locator } from '@playwright/test';

/**
 * Asserts that an ATC badge has the expected online/offline status
 * 
 * @param badge - Locator for the ATC badge element
 * @param status - Expected status: 'online' or 'offline'
 */
export async function expectATCBadgeStatus(badge: Locator, status: 'online' | 'offline') {
	await expect(badge).toHaveAttribute('data-status', status);
}

/**
 * Asserts that a specific ATC position badge exists and has the expected status
 * 
 * @param container - Parent container element
 * @param position - ATC position (e.g., 'twr', 'gnd', 'del', 'app', 'ctr')
 * @param status - Expected status: 'online' or 'offline'
 */
export async function expectATCBadge(
	container: Locator,
	position: string,
	status: 'online' | 'offline'
) {
	const badge = container.locator(`[data-testid="atc-badge-${position}"]`);
	await expect(badge).toBeVisible();
	await expectATCBadgeStatus(badge, status);
}

/**
 * Asserts that multiple ATC badges have the expected statuses
 * 
 * @param container - Parent container element
 * @param statuses - Object mapping position to expected status
 */
export async function expectATCBadges(
	container: Locator,
	statuses: Record<string, 'online' | 'offline'>
) {
	for (const [position, status] of Object.entries(statuses)) {
		await expectATCBadge(container, position, status);
	}
}

/**
 * Asserts that an ATC level filter button has the expected active/inactive state
 * 
 * @param page - Playwright page object
 * @param testId - Test ID of the button (e.g., 'departure-atc-level-twr')
 * @param shouldBeActive - Expected state: true for active, false for inactive
 */
export async function expectATCLevelButtonActive(
	page: any,
	testId: string,
	shouldBeActive: boolean
) {
	const button = page.getByTestId(testId);
	const classAttr = await button.getAttribute('class');
	
	// Check if button has any active color class
	const isActive = classAttr?.includes('atc-ctr-active') ||
		classAttr?.includes('atc-app-active') ||
		classAttr?.includes('atc-twr-active') ||
		classAttr?.includes('atc-gnd-active') ||
		classAttr?.includes('atc-del-active');
	
	if (shouldBeActive) {
		expect(isActive).toBe(true);
	} else {
		expect(isActive).toBe(false);
	}
}
