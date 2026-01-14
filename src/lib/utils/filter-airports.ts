import type { Airport, Route } from '$lib/types';
import type { ATCController } from '$lib/types/vatsim';
import { ControllerPosition } from '$lib/types/vatsim';
import { hasATCCoverage, hasSpecificATCLevel } from '$lib/atc-utils';

interface FilterCriteria {
	selectedAirport: string | null;
	otherSelectedAirport: string | null;
	onlyThisWithATC: boolean;
	onlyOtherWithATC: boolean;
	thisATCLevels: ControllerPosition[];
	otherATCLevels: ControllerPosition[];
	locationControllers: Map<string, Map<ControllerPosition, ATCController[]>>;
}

type AirportSelector = 'departure' | 'arrival';

/**
 * Filters available airports based on ATC coverage and route availability.
 * 
 * @param routes - All available routes
 * @param airports - All airports
 * @param type - Whether filtering for departure or arrival airports
 * @param criteria - Filter criteria including ATC levels and selected airports
 * @returns Filtered and sorted array of airports
 */
export function getAvailableAirports(
	routes: Route[],
	airports: Airport[],
	type: AirportSelector,
	criteria: FilterCriteria
): Airport[] {
	const {
		selectedAirport,
		otherSelectedAirport,
		onlyThisWithATC,
		onlyOtherWithATC,
		thisATCLevels,
		otherATCLevels,
		locationControllers
	} = criteria;

	const airportSet = new Set<string>();
	const isDeparture = type === 'departure';

	for (const route of routes) {
		const thisAirport = isDeparture ? route.departure : route.arrival;
		const otherAirport = isDeparture ? route.arrival : route.departure;

		// If other side is selected, only show routes connected to it
		if (otherSelectedAirport && otherAirport.vatsim_code !== otherSelectedAirport) {
			continue;
		}

		// If other side ATC filter is on and other side is selected, check if it has ATC
		if (onlyOtherWithATC && otherSelectedAirport) {
			const airport = airports.find(a => a.vatsim_code === otherSelectedAirport);
			if (airport && !hasATCCoverage(airport.vatsim_code, airport.artcc, locationControllers)) {
				continue;
			}
		}

		// Check other side ATC levels if specified and other side is selected
		if (otherATCLevels.length > 0 && otherSelectedAirport) {
			const airport = airports.find(a => a.vatsim_code === otherSelectedAirport);
			if (airport && !hasSpecificATCLevel(airport.vatsim_code, airport.artcc, otherATCLevels, locationControllers)) {
				continue;
			}
		}

		// If this side ATC filter is on, check if this airport has ATC
		if (onlyThisWithATC && !hasATCCoverage(thisAirport.vatsim_code, thisAirport.artcc, locationControllers)) {
			continue;
		}

		// Check this side ATC levels if specified
		if (thisATCLevels.length > 0 && !hasSpecificATCLevel(thisAirport.vatsim_code, thisAirport.artcc, thisATCLevels, locationControllers)) {
			continue;
		}

		airportSet.add(thisAirport.vatsim_code);
	}

	return airports
		.filter(airport => airportSet.has(airport.vatsim_code))
		.sort((a, b) => a.city.localeCompare(b.city));
}
