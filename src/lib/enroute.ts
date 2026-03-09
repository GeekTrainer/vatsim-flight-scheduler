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
import artccCentersJson from './data/artcc-centers.json';

interface ArtccCenterEntry {
	artcc: string;
	name: string;
	lat: number;
	lon: number;
	radius_nm: number;
}

// Build lookup from JSON config
const ARTCC_CENTERS: Record<string, { lat: number; lon: number; radius: number; name: string }> =
	Object.fromEntries(
		(artccCentersJson as ArtccCenterEntry[]).map(c => [
			c.artcc,
			{ lat: c.lat, lon: c.lon, radius: c.radius_nm, name: c.name }
		])
	);

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
