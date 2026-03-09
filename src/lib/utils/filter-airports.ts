import type { Airport, Route } from '$lib/types';
import type { ATCController } from '$lib/types/vatsim';
import { ControllerPosition } from '$lib/types/vatsim';
import { routeMatchesFilters } from './route-filter';
import type { FilterState } from './filter-utils';

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
 * Converts relative this/other criteria into an absolute FilterState.
 * Other-side ATC checks only apply when an other airport is selected,
 * preserving the dropdown behavior of showing all options when no
 * specific counterpart is chosen.
 */
function toFilterState(type: AirportSelector, criteria: FilterCriteria): FilterState {
	const isDeparture = type === 'departure';
	const hasOther = !!criteria.otherSelectedAirport;

	return isDeparture
		? {
			selectedDeparture: null,
			selectedArrival: criteria.otherSelectedAirport,
			onlyDepartureWithATC: criteria.onlyThisWithATC,
			departureATCLevels: criteria.thisATCLevels,
			onlyArrivalWithATC: hasOther && criteria.onlyOtherWithATC,
			arrivalATCLevels: hasOther ? criteria.otherATCLevels : [],
			minFlightTime: null,
			maxFlightTime: null,
		}
		: {
			selectedDeparture: criteria.otherSelectedAirport,
			selectedArrival: null,
			onlyDepartureWithATC: hasOther && criteria.onlyOtherWithATC,
			departureATCLevels: hasOther ? criteria.otherATCLevels : [],
			onlyArrivalWithATC: criteria.onlyThisWithATC,
			arrivalATCLevels: criteria.thisATCLevels,
			minFlightTime: null,
			maxFlightTime: null,
		};
}

/**
 * Filters available airports based on ATC coverage and route availability.
 * Delegates route matching to the shared routeMatchesFilters predicate.
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
	const filters = toFilterState(type, criteria);
	const isDeparture = type === 'departure';
	const airportSet = new Set<string>();

	for (const route of routes) {
		if (routeMatchesFilters(route, filters, criteria.locationControllers)) {
			const thisAirport = isDeparture ? route.departure : route.arrival;
			airportSet.add(thisAirport.vatsim_code);
		}
	}

	return airports
		.filter(airport => airportSet.has(airport.vatsim_code))
		.sort((a, b) => a.city.localeCompare(b.city));
}
