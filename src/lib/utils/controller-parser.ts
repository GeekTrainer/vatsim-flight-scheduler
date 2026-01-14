/**
 * Controller Parsing Utilities
 * 
 * Extracts airport/location codes and position types from VATSIM controller callsigns.
 * Handles consolidated facilities (TRACONs), ARTCC centers, and standard airport positions.
 */

import { ControllerPosition } from '$lib/types/vatsim';
import { airports } from '$lib/routes';
import { CONSOLIDATED_APPROACH_FACILITIES } from '$lib/constants/consolidated-facilities';

/**
 * Extracts airport/location code and position from a controller callsign.
 * 
 * CRITICAL LOGIC for developers:
 * 1. Facility codes (2-6) determine position type (DEL/GND/TWR/APP/CTR)
 * 2. For APP controllers, check CONSOLIDATED_APPROACH_FACILITIES first (e.g., SOCAL covers LAX/SAN)
 * 3. For CTR controllers, extract ARTCC code (e.g., ZLA, ZSE) from callsign
 * 4. For other positions, use vatsim_code matching with fallback to ICAO codes
 * 
 * Examples:
 * - "BOS_TWR" (facility 4) → icao: "KBOS", position: TWR
 * - "SOCAL_APP" (facility 5) → icao: "KLAX", position: APP, coveredAirports: [KLAX, KSAN, ...]
 * - "ZLA_CTR" (facility 6) → icao: "ZLA", position: CTR
 * 
 * @param callsign - Controller callsign (e.g., BOS_TWR, SAN_GND, SEA_161_CTR, SOCAL_APP)
 * @param facility - Facility type code from VATSIM (2-6)
 * @returns Object with ICAO/ARTCC code, position type, and consolidated facility info, or null if not applicable
 */
export function extractController(
callsign: string,
facility: number
): { icao: string; position: ControllerPosition; coveredAirports?: string[]; isConsolidated?: boolean } | null {
// Map facility types to controller positions
// 2 = Delivery, 3 = Ground, 4 = Tower, 5 = Approach, 6 = Center
let position: ControllerPosition;

switch (facility) {
case 2:
position = ControllerPosition.DEL;
break;
case 3:
position = ControllerPosition.GND;
break;
case 4:
position = ControllerPosition.TWR;
break;
case 5:
position = ControllerPosition.APP;
break;
case 6:
position = ControllerPosition.CTR;
break;
default:
return null; // Not an ATC position we care about
}

// Extract airport code from callsign
// Patterns: BOS_TWR, SAN_GND, KBOS_DEL, EDDF_N_APP, SEA_161_CTR, SOCAL_APP, etc.
const parts = callsign.split('_');
if (parts.length < 2) return null;

const airportCode = parts[0];

// Check for consolidated approach facilities (e.g., SOCAL_APP, NORCAL_APP, N90_APP)
if (position === ControllerPosition.APP) {
const consolidatedKey = airportCode.toUpperCase();
if (CONSOLIDATED_APPROACH_FACILITIES[consolidatedKey]) {
const coveredAirports = CONSOLIDATED_APPROACH_FACILITIES[consolidatedKey];
// Return the first airport as the primary ICAO, but include all covered airports
return {
icao: coveredAirports[0],
position,
coveredAirports,
isConsolidated: true
};
}
}

// For center (CTR) controllers, map to their ARTCC coverage area
if (position === ControllerPosition.CTR) {
// Extract the facility code from center callsigns (e.g., ZLA_CTR, ZSE_12_CTR)
const centerMatch = callsign.match(/^([A-Z]{2,4})(?:_\d+)?_CTR$/);
if (centerMatch) {
const facilityCode = centerMatch[1];

// If it starts with Z, it's an ARTCC code (ZLA, ZSE, ZDC, etc.)
if (facilityCode.startsWith('Z')) {
// Return the ARTCC code for center position lookups
return { icao: facilityCode, position };
}

// Otherwise, look up the airport to get its associated ARTCC
const airport = airports.find(a => a.vatsim_code === facilityCode);
if (airport) {
return { icao: airport.artcc, position };
}
}
return null;
}

// For all other positions (DEL, GND, TWR, APP), find the airport
const airport = airports.find(
(apt) =>
apt.vatsim_code === airportCode ||
apt.icao === airportCode ||
apt.icao === `K${airportCode}`
);

if (!airport) return null;

return { icao: airport.icao, position };
}
