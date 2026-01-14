import type { Route, Airport } from './types';
import type { ATCController } from './types/vatsim';
import { ControllerPosition } from './types/vatsim';
import { airports } from './routes';

/**
 * ATC Utility Functions
 * 
 * Centralized business logic for ATC controller checking and filtering.
 * Extracted from components to follow separation of concerns and DRY principles.
 */

/**
 * Checks if an airport has specific ATC levels online
 * Uses OR logic - returns true if ANY of the requested levels are online
 * 
 * @param airportCode - Airport code (VATSIM/IATA like "PHX" or ICAO like "KPHX")
 * @param artcc - ARTCC code (e.g., "ZAB")
 * @param levels - Array of controller positions to check for
 * @param locationControllers - Map of controllers by location and position
 * @returns true if any of the requested ATC levels are online
 */
export function hasSpecificATCLevel(
	airportCode: string,
	artcc: string,
	levels: ControllerPosition[],
	locationControllers: Map<string, Map<ControllerPosition, ATCController[]>>
): boolean {
	// Empty levels array means no filtering
	if (!levels || levels.length === 0) {
		return false;
	}

	// Find the airport to get its ICAO code
	const airport = airports.find(a => a.vatsim_code === airportCode || a.icao === airportCode);
	if (!airport) return false;

	// Check each requested level (OR logic)
	for (const level of levels) {
		if (level === ControllerPosition.CTR) {
			// Check center controllers using ARTCC
			const centerControllers = locationControllers.get(artcc);
			if (centerControllers?.has(ControllerPosition.CTR)) {
				return true;
			}
		} else {
			// Check airport-level controllers (DEL, GND, TWR, APP) using ICAO
			const airportControllers = locationControllers.get(airport.icao);
			if (airportControllers?.has(level)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Checks if an airport has any active controllers
 * Accepts either VATSIM code (IATA) or ICAO code
 * 
 * @param airportCode - Airport code (VATSIM/IATA like "PHX" or ICAO like "KPHX")
 * @param artcc - ARTCC code (e.g., "ZAB")
 * @param locationControllers - Map of controllers by location and position
 * @returns true if any controllers are active for this airport
 */
export function hasATCCoverage(
	airportCode: string,
	artcc: string,
	locationControllers: Map<string, Map<ControllerPosition, ATCController[]>>
): boolean {
	// Find the airport to get its ICAO code
	const airport = airports.find(a => a.vatsim_code === airportCode || a.icao === airportCode);
	if (!airport) return false;
	
	// Check for airport-level controllers (DEL, GND, TWR, APP) using ICAO
	const airportControllers = locationControllers.get(airport.icao);
	
	// Check for center controllers using ARTCC
	const centerControllers = locationControllers.get(artcc);
	
	return !!(airportControllers?.size || centerControllers?.size);
}
