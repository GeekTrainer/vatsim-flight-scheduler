/**
 * VATSIM API Integration Module
 * 
 * Handles fetching and parsing live controller data from VATSIM network.
 * Implements 30-second caching to avoid rate limiting and reduce network calls.
 */

import type { VatsimData, ATCController } from './types/vatsim';
import { ControllerPosition } from './types/vatsim';
import { extractController } from './utils/controller-parser';

const VATSIM_API_URL = 'https://data.vatsim.net/v3/vatsim-data.json';
const CACHE_DURATION = 30 * 1000; // 30 seconds in milliseconds

interface CachedData {
	data: VatsimData;
	timestamp: number;
}

let cache: CachedData | null = null;

/**
 * Fetches VATSIM network data with 30-second caching
 * @returns Promise with VATSIM data including controllers, pilots, etc.
 */
export async function fetchVatsimData(): Promise<VatsimData> {
	const now = Date.now();

	// Return cached data if it's still fresh
	if (cache && now - cache.timestamp < CACHE_DURATION) {
		return cache.data;
	}

	// Fetch fresh data
	const response = await fetch(VATSIM_API_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch VATSIM data: ${response.statusText}`);
	}

	const data: VatsimData = await response.json();

	// Update cache
	cache = {
		data,
		timestamp: now
	};

	return data;
}

/**
 * Gets controller details for all active locations organized by position type
 * Processes all ATC positions: delivery (2), ground (3), tower (4), approach (5), and center (6)
 * 
 * Data Structure: Nested Map for efficient lookups
 * - Outer Map: location code (ICAO for airports like "KLAX", ARTCC for centers like "ZLA") → position map
 * - Inner Map: ControllerPosition → array of controllers at that position
 * 
 * Consolidated Facilities: When a consolidated facility (e.g., SOCAL_APP) is detected,
 * the controller is added to ALL airports it covers (KLAX, KSAN, KSNA, etc.)
 * 
 * @param controllers - Array of online controllers from VATSIM data
 * @returns Nested map: location → position → array of controllers
 */
export function getLocationControllers(
	controllers: VatsimData['controllers']
): Map<string, Map<ControllerPosition, ATCController[]>> {
	const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
	const now = new Date();

	for (const controller of controllers) {
		// Only process ATC positions (facility 2-6)
		if (controller.facility < 2 || controller.facility > 6) {
			continue;
		}

		const extracted = extractController(controller.callsign, controller.facility);
		if (extracted) {
			const { icao, position, coveredAirports, isConsolidated } = extracted;

			const logonTime = new Date(controller.logon_time);
			const onlineTimeMinutes = Math.floor((now.getTime() - logonTime.getTime()) / 60000);

			const controllerData: ATCController = {
				callsign: controller.callsign,
				name: controller.name,
				frequency: controller.frequency,
				onlineTimeMinutes,
				position
			};

			// If this is a consolidated facility, add to all covered airports
			const airportsToUpdate = isConsolidated && coveredAirports ? coveredAirports : [icao];

			for (const airportIcao of airportsToUpdate) {
				// Initialize location if needed
				if (!locationControllers.has(airportIcao)) {
					locationControllers.set(airportIcao, new Map());
				}

				const positionMap = locationControllers.get(airportIcao)!;

				// Initialize position array if needed
				if (!positionMap.has(position)) {
					positionMap.set(position, []);
				}

				const controllers = positionMap.get(position)!;
				
				// Add consolidated controller at the beginning, airport-specific at the end
				if (isConsolidated) {
					controllers.unshift(controllerData);
				} else {
					controllers.push(controllerData);
				}
			}
		}
	}

	return locationControllers;
}
