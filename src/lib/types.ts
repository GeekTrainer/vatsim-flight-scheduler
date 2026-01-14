export interface Airport {
	icao: string;        // Standard ICAO code (e.g., "KLAS") - used for DEL/GND/TWR/APP lookups
	vatsim_code: string; // VATSIM facility code (e.g., "LAS") - used for callsign matching
	city: string;        // City name (e.g., "Las Vegas")
	name: string;        // Airport name
	artcc: string;       // ARTCC code (e.g., "ZLA") - used for CTR (center) controller lookups
}

export interface Route {
	id: string;
	departure: Airport;
	arrival: Airport;
}

// Import types from vatsim module for type alias
import type { ATCController, ControllerPosition } from './types/vatsim';

/**
 * Map structure for storing controllers by location and position
 * Outer map: location code (e.g., "PHX", "ZLA") -> Inner map
 * Inner map: controller position (CTR, APP, TWR, GND, DEL) -> array of controllers
 */
export type LocationControllers = Map<string, Map<ControllerPosition, ATCController[]>>;
