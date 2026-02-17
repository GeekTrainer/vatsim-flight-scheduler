/**
 * VATSIM API Integration Module
 * 
 * Handles fetching and parsing live controller data from VATSIM network.
 * Implements 30-second caching to avoid rate limiting and reduce network calls.
 */

import type { VatsimData, ATCController, VatsimATIS } from './types/vatsim';
import { ControllerPosition } from './types/vatsim';
import { extractController } from './utils/controller-parser';
import type { ATISInfo } from './types';

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

	// Deduplicate controllers sharing the same frequency at each position
	// (common during training sessions, e.g., ATL_TWR and ATL_1_TWR on same freq)
	for (const positionMap of locationControllers.values()) {
		for (const [pos, controllers] of positionMap) {
			positionMap.set(pos, deduplicateByFrequency(controllers));
		}
	}

	return locationControllers;
}

/**
 * Removes duplicate controllers on the same frequency, keeping the primary
 * (no number in callsign, or lowest number). Training sessions often have
 * two controllers on the same frequency (e.g., ATL_TWR and ATL_1_TWR).
 */
function deduplicateByFrequency(controllers: ATCController[]): ATCController[] {
	const byFreq = new Map<string, ATCController>();

	for (const controller of controllers) {
		const existing = byFreq.get(controller.frequency);
		if (!existing) {
			byFreq.set(controller.frequency, controller);
		} else {
			// Keep the one with no number or the lowest number in callsign
			const existingNum = extractCallsignNumber(existing.callsign);
			const newNum = extractCallsignNumber(controller.callsign);
			if (newNum < existingNum) {
				byFreq.set(controller.frequency, controller);
			}
		}
	}

	return Array.from(byFreq.values());
}

/**
 * Extracts the numeric suffix from a callsign (e.g., ATL_1_TWR → 1, ATL_TWR → 0)
 */
function extractCallsignNumber(callsign: string): number {
	const parts = callsign.split('_');
	for (const part of parts) {
		const num = parseInt(part, 10);
		if (!isNaN(num)) return num;
	}
	return 0;
}

/**
 * Looks up VATSIM ATIS for a specific airport, respecting split arrival/departure ATIS.
 * Split ATIS airports (e.g., ATL, MIA) have separate _A_ATIS and _D_ATIS callsigns.
 * The role parameter selects the correct one for each side of the flight page.
 */
export function getVatsimATIS(atisStations: VatsimATIS[], icao: string, role: 'departure' | 'arrival' = 'arrival'): ATISInfo | null {
	// Find all ATIS entries for this airport
	const matches = atisStations.filter(a => {
		const callsignPrefix = a.callsign.split('_')[0];
		return callsignPrefix === icao && a.callsign.includes('ATIS');
	});

	if (matches.length === 0) return null;

	// Classify each match
	const roleSpecific = matches.find(a => {
		if (role === 'departure') return /_D_ATIS/.test(a.callsign);
		return /_A_ATIS/.test(a.callsign);
	});

	// Prefer role-specific, fall back to combined (plain _ATIS)
	const combined = matches.find(a => !/_[AD]_ATIS/.test(a.callsign));
	const best = roleSpecific || combined || matches[0];

	if (!best || !best.text_atis || best.text_atis.length === 0) {
		return null;
	}

	let atisType: 'combined' | 'arrival' | 'departure' = 'combined';
	if (/_A_ATIS/.test(best.callsign)) atisType = 'arrival';
	else if (/_D_ATIS/.test(best.callsign)) atisType = 'departure';

	return {
		source: 'vatsim',
		atisType,
		code: best.atis_code || undefined,
		text: best.text_atis.join(' '),
		frequency: best.frequency,
		lastUpdated: best.last_updated
	};
}
