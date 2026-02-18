/**
 * Enroute Center Detection
 * 
 * Determines which ARTCC centers a flight passes through by matching
 * SimBrief navlog waypoints against online VATSIM center controllers.
 * Falls back to departure/arrival ARTCCs when no navlog is available.
 */

import type { SimBriefNavlogFix } from './types/simbrief';
import type { LocationControllers } from './types';
import { ControllerPosition } from './types/vatsim';

// Known US ARTCC centers and their approximate center positions (lat/lon)
// Used for distance-based matching when we have navlog waypoints
const ARTCC_CENTERS: Record<string, { lat: number; lon: number; radius: number; name: string }> = {
	ZAB: { lat: 33.5, lon: -109.0, radius: 400, name: 'Albuquerque Center' },
	ZAU: { lat: 41.8, lon: -88.5, radius: 300, name: 'Chicago Center' },
	ZBW: { lat: 42.5, lon: -71.5, radius: 300, name: 'Boston Center' },
	ZDC: { lat: 39.0, lon: -77.5, radius: 300, name: 'Washington Center' },
	ZDV: { lat: 39.5, lon: -105.0, radius: 350, name: 'Denver Center' },
	ZFW: { lat: 31.5, lon: -98.5, radius: 350, name: 'Fort Worth Center' },
	ZHU: { lat: 29.5, lon: -95.0, radius: 350, name: 'Houston Center' },
	ZID: { lat: 39.5, lon: -84.5, radius: 300, name: 'Indianapolis Center' },
	ZJX: { lat: 30.5, lon: -81.5, radius: 350, name: 'Jacksonville Center' },
	ZKC: { lat: 38.5, lon: -95.5, radius: 350, name: 'Kansas City Center' },
	ZLA: { lat: 34.0, lon: -117.0, radius: 350, name: 'Los Angeles Center' },
	ZLC: { lat: 41.0, lon: -112.0, radius: 400, name: 'Salt Lake City Center' },
	ZMA: { lat: 26.0, lon: -80.5, radius: 350, name: 'Miami Center' },
	ZME: { lat: 35.0, lon: -90.0, radius: 350, name: 'Memphis Center' },
	ZMP: { lat: 45.0, lon: -93.5, radius: 400, name: 'Minneapolis Center' },
	ZNY: { lat: 40.7, lon: -74.0, radius: 250, name: 'New York Center' },
	ZOA: { lat: 37.5, lon: -121.5, radius: 350, name: 'Oakland Center' },
	ZOB: { lat: 41.0, lon: -82.0, radius: 300, name: 'Cleveland Center' },
	ZSE: { lat: 47.5, lon: -122.0, radius: 400, name: 'Seattle Center' },
	ZTL: { lat: 33.8, lon: -84.5, radius: 300, name: 'Atlanta Center' },
};

export interface EnrouteCenter {
	artcc: string;
	name: string;
	controllerCount: number;
	online: boolean;
}

/**
 * Get the full name of an ARTCC
 */
export function getArtccName(artcc: string): string {
	return ARTCC_CENTERS[artcc]?.name || `${artcc} Center`;
}

/**
 * Get CTR controllers for an ARTCC from the location controllers map
 */
export function getCenterControllers(
	artcc: string,
	locationControllers: LocationControllers
): { callsign: string; frequency: string }[] {
	const posMap = locationControllers.get(artcc);
	if (!posMap) return [];
	const controllers = posMap.get(ControllerPosition.CTR) || [];
	return controllers.map(c => ({ callsign: c.callsign, frequency: c.frequency }));
}

/**
 * Detect enroute centers from SimBrief navlog waypoints.
 * Returns an ordered list of ARTCCs the flight passes through.
 */
export function detectEnrouteCenters(
	navlogFixes: SimBriefNavlogFix[],
	depArtcc: string,
	arrArtcc: string,
	locationControllers: LocationControllers
): EnrouteCenter[] {
	// Collect ARTCCs along the route in order
	const routeArtccs: string[] = [];
	const seen = new Set<string>();

	// Always start with departure ARTCC
	routeArtccs.push(depArtcc);
	seen.add(depArtcc);

	// Check each waypoint against ARTCC center positions
	for (const fix of navlogFixes) {
		const lat = parseFloat(fix.pos_lat);
		const lon = parseFloat(fix.pos_long);
		if (isNaN(lat) || isNaN(lon)) continue;

		const closest = findClosestArtcc(lat, lon);
		if (closest && !seen.has(closest)) {
			routeArtccs.push(closest);
			seen.add(closest);
		}
	}

	// Ensure arrival ARTCC is included at the end
	if (!seen.has(arrArtcc)) {
		routeArtccs.push(arrArtcc);
	}

	// Build result with controller counts
	return routeArtccs.map(artcc => {
		const count = getControllerCount(artcc, locationControllers);
		return {
			artcc,
			name: getArtccName(artcc),
			controllerCount: count,
			online: count > 0
		};
	});
}

/**
 * Fallback: just show departure and arrival ARTCCs
 */
export function getBasicEnrouteCenters(
	depArtcc: string,
	arrArtcc: string,
	locationControllers: LocationControllers
): EnrouteCenter[] {
	const centers: EnrouteCenter[] = [];
	const depCount = getControllerCount(depArtcc, locationControllers);
	centers.push({ artcc: depArtcc, name: getArtccName(depArtcc), controllerCount: depCount, online: depCount > 0 });

	if (arrArtcc !== depArtcc) {
		const arrCount = getControllerCount(arrArtcc, locationControllers);
		centers.push({ artcc: arrArtcc, name: getArtccName(arrArtcc), controllerCount: arrCount, online: arrCount > 0 });
	}

	return centers;
}

/**
 * Find the closest ARTCC to a given lat/lon
 */
function findClosestArtcc(lat: number, lon: number): string | null {
	let closest: string | null = null;
	let minDist = Infinity;

	for (const [artcc, center] of Object.entries(ARTCC_CENTERS)) {
		const dist = haversineDistance(lat, lon, center.lat, center.lon);
		if (dist < center.radius && dist < minDist) {
			minDist = dist;
			closest = artcc;
		}
	}

	return closest;
}

/**
 * Count CTR controllers for an ARTCC
 */
function getControllerCount(artcc: string, locationControllers: LocationControllers): number {
	const posMap = locationControllers.get(artcc);
	if (!posMap) return 0;
	return posMap.get(ControllerPosition.CTR)?.length ?? 0;
}

/**
 * Haversine distance in nautical miles
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 3440.065; // Earth radius in nautical miles
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
