import type { ATCController } from '$lib/types/vatsim';
import { ControllerPosition } from '$lib/types/vatsim';
import type { Airport, Route, LocationControllers } from '$lib/types';

/**
 * Shared mock factories for unit tests.
 * Centralizes test data creation to reduce duplication across test files.
 */

export function createMockController(
	overrides: Partial<ATCController> & { callsign: string } = { callsign: 'TST_TWR' }
): ATCController {
	return {
		callsign: overrides.callsign,
		name: overrides.name ?? 'Test Controller',
		frequency: overrides.frequency ?? '118.000',
		position: overrides.position ?? ControllerPosition.TWR,
		onlineTimeMinutes: overrides.onlineTimeMinutes ?? 60,
		...overrides
	};
}

export function createMockAirport(
	overrides: Partial<Airport> & { icao: string; vatsim_code: string }
): Airport {
	return {
		icao: overrides.icao,
		name: overrides.name ?? `${overrides.icao} Airport`,
		city: overrides.city ?? overrides.icao,
		vatsim_code: overrides.vatsim_code,
		artcc: overrides.artcc ?? 'ZZZ',
		...overrides
	};
}

export function createMockRoute(
	departure: Airport,
	arrival: Airport,
	overrides?: Partial<Route>
): Route {
	return {
		id: overrides?.id ?? `${departure.icao}-${arrival.icao}`,
		departure,
		arrival,
		distance_nm: overrides?.distance_nm ?? 500,
		flight_time_minutes: overrides?.flight_time_minutes ?? 120,
		...overrides
	};
}

export function createMockLocationControllers(
	entries: [string, [ControllerPosition, ATCController[]][]][]
): LocationControllers {
	const map: LocationControllers = new Map();
	for (const [location, positions] of entries) {
		const posMap = new Map<ControllerPosition, ATCController[]>();
		for (const [pos, controllers] of positions) {
			posMap.set(pos, controllers);
		}
		map.set(location, posMap);
	}
	return map;
}
