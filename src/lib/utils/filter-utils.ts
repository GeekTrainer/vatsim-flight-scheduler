import type { ControllerPosition } from '$lib/types/vatsim';

/**
 * Shared utility functions for filter state management
 * 
 * DRY Principle: These utilities prevent duplication of filter logic
 * across +page.svelte and RouteFilterPanel.svelte
 */

/**
 * Checks if any filters are currently active
 * Used to determine whether to show routes or the empty state
 * 
 * @param filters - Object containing all filter states
 * @returns true if at least one filter is active
 */
export function hasActiveFilters(filters: {
	selectedDeparture?: string | null;
	selectedArrival?: string | null;
	onlyDepartureWithATC?: boolean;
	onlyArrivalWithATC?: boolean;
	departureATCLevels?: ControllerPosition[];
	arrivalATCLevels?: ControllerPosition[];
}): boolean {
	return !!(
		filters.selectedDeparture ||
		filters.selectedArrival ||
		filters.onlyDepartureWithATC ||
		filters.onlyArrivalWithATC ||
		(filters.departureATCLevels && filters.departureATCLevels.length > 0) ||
		(filters.arrivalATCLevels && filters.arrivalATCLevels.length > 0)
	);
}

/**
 * Creates a filter state object for reuse across components
 * 
 * Type Safety: All 6 properties are required (not optional) to prevent
 * missing filter criteria bugs.
 */
export interface FilterState {
	selectedDeparture: string | null;
	selectedArrival: string | null;
	onlyDepartureWithATC: boolean;
	onlyArrivalWithATC: boolean;
	departureATCLevels: ControllerPosition[];
	arrivalATCLevels: ControllerPosition[];
}
