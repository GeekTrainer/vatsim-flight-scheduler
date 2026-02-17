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
const ARTCC_CENTERS: Record<string, { lat: number; lon: number; radius: number }> = {
	ZAB: { lat: 33.5, lon: -109.0, radius: 350 },
	ZAU: { lat: 41.8, lon: -88.5, radius: 250 },
	ZBW: { lat: 42.5, lon: -71.5, radius: 250 },
	ZDC: { lat: 39.0, lon: -77.5, radius: 250 },
	ZDV: { lat: 39.5, lon: -105.0, radius: 300 },
	ZFW: { lat: 32.8, lon: -97.0, radius: 300 },
	ZHU: { lat: 29.5, lon: -95.5, radius: 300 },
	ZID: { lat: 39.5, lon: -84.5, radius: 250 },
	ZJX: { lat: 30.5, lon: -81.5, radius: 300 },
	ZKC: { lat: 38.5, lon: -94.5, radius: 300 },
	ZLA: { lat: 34.0, lon: -118.0, radius: 300 },
	ZLC: { lat: 41.0, lon: -112.0, radius: 350 },
	ZMA: { lat: 26.0, lon: -80.5, radius: 300 },
	ZME: { lat: 35.5, lon: -90.0, radius: 300 },
	ZMP: { lat: 45.0, lon: -93.5, radius: 350 },
	ZNY: { lat: 40.7, lon: -74.0, radius: 200 },
	ZOA: { lat: 37.5, lon: -122.0, radius: 300 },
	ZOB: { lat: 41.0, lon: -82.0, radius: 250 },
	ZSE: { lat: 47.5, lon: -122.5, radius: 350 },
	ZTL: { lat: 33.8, lon: -84.5, radius: 250 },
};

export interface EnrouteCenter {
	artcc: string;
	controllerCount: number;
	online: boolean;
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
	centers.push({ artcc: depArtcc, controllerCount: depCount, online: depCount > 0 });

	if (arrArtcc !== depArtcc) {
		const arrCount = getControllerCount(arrArtcc, locationControllers);
		centers.push({ artcc: arrArtcc, controllerCount: arrCount, online: arrCount > 0 });
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
