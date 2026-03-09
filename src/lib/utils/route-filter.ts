import type { Route } from '$lib/types';
import type { ATCController } from '$lib/types/vatsim';
import type { ControllerPosition } from '$lib/types/vatsim';
import { hasATCCoverage, hasSpecificATCLevel } from '$lib/atc-utils';
import type { FilterState } from './filter-utils';

/**
 * Centralized route filtering logic with DRY principles
 * Filters routes based on all available filter criteria
 * 
 * Architecture Note: This function was extracted from +page.svelte to follow DRY
 * principles and centralize filtering logic that was previously duplicated.
 * 
 * Airport Code Pattern (CRITICAL for developers):
 * - Use `vatsim_code` (e.g., "PHX") for airport selection/comparison
 * - Use `icao` (e.g., "KPHX") for DEL/GND/TWR/APP controller lookups
 * - Use `artcc` (e.g., "ZAB") for CTR (center) controller lookups
 * 
 * @param routes - Array of all routes
 * @param filters - Filter state object with all criteria
 * @param locationControllers - Map of active ATC controllers by location and position
 * @returns Filtered array of routes matching all active criteria
 */
/**
 * Shared predicate: does a single route match the given filters?
 * Used by filterRoutes (route list) and getAvailableAirports (airport dropdown).
 */
export function routeMatchesFilters(
	route: Route,
	filters: FilterState,
	locationControllers: Map<string, Map<ControllerPosition, ATCController[]>>
): boolean {
	// Departure airport filter
	if (filters.selectedDeparture && route.departure.vatsim_code !== filters.selectedDeparture) {
		return false;
	}

	// Arrival airport filter
	if (filters.selectedArrival && route.arrival.vatsim_code !== filters.selectedArrival) {
		return false;
	}

	// Departure ATC coverage filter
	if (filters.onlyDepartureWithATC && !hasATCCoverage(route.departure.vatsim_code, route.departure.artcc, locationControllers)) {
		return false;
	}

	// Departure specific ATC levels filter
	if (filters.departureATCLevels?.length > 0 && !hasSpecificATCLevel(route.departure.vatsim_code, route.departure.artcc, filters.departureATCLevels, locationControllers)) {
		return false;
	}

	// Arrival ATC coverage filter
	if (filters.onlyArrivalWithATC && !hasATCCoverage(route.arrival.vatsim_code, route.arrival.artcc, locationControllers)) {
		return false;
	}

	// Arrival specific ATC levels filter
	if (filters.arrivalATCLevels?.length > 0 && !hasSpecificATCLevel(route.arrival.vatsim_code, route.arrival.artcc, filters.arrivalATCLevels, locationControllers)) {
		return false;
	}

	// Flight time range filter
	if (filters.minFlightTime != null) {
		if (route.flight_time_minutes == null || route.flight_time_minutes < filters.minFlightTime) {
			return false;
		}
	}
	if (filters.maxFlightTime != null) {
		if (route.flight_time_minutes == null || route.flight_time_minutes > filters.maxFlightTime) {
			return false;
		}
	}

	return true;
}

export function filterRoutes(
	routes: Route[],
	filters: FilterState,
	locationControllers: Map<string, Map<ControllerPosition, ATCController[]>>
): Route[] {
	return routes.filter(route => routeMatchesFilters(route, filters, locationControllers));
}
