/**
 * SimBrief Integration Service
 * Handles dispatch URL building, OFP fetching, and plan validation.
 * No API key needed — uses public dispatch URL + fetcher endpoint.
 */

import type { SimBriefPlan } from './types/simbrief';

const SIMBRIEF_DISPATCH_URL = 'https://www.simbrief.com/system/dispatch.php';
const SIMBRIEF_FETCHER_URL = 'https://www.simbrief.com/api/xml.fetcher.php';

/**
 * Build a SimBrief dispatch URL with pre-filled origin/destination
 */
export function buildDispatchUrl(
	departureIcao: string,
	arrivalIcao: string,
	callbackUrl: string
): string {
	const fltnum = String(Math.floor(1000 + Math.random() * 9000));
	const params = new URLSearchParams({
		orig: departureIcao,
		dest: arrivalIcao,
		airline: 'SWA',
		fltnum,
		units: 'LBS',
		planformat: 'LIDO',
	});

	return `${SIMBRIEF_DISPATCH_URL}?${params}`;
}

/**
 * Fetch the latest SimBrief OFP for a given pilot ID
 */
export async function fetchSimBriefPlan(pilotId: string): Promise<SimBriefPlan | null> {
	try {
		const response = await fetch(`${SIMBRIEF_FETCHER_URL}?userid=${pilotId}&json=1`);
		if (!response.ok) return null;

		const data = await response.json();

		// Check for error response
		if (data?.fetch?.status && data.fetch.status.startsWith('Error')) {
			return null;
		}

		// Verify it has basic plan data
		if (!data?.general?.route) {
			return null;
		}

		return data as SimBriefPlan;
	} catch {
		return null;
	}
}

/**
 * Validate that a SimBrief plan matches the current flight route
 */
export function validatePlanMatchesRoute(
	plan: SimBriefPlan,
	departureIcao: string,
	arrivalIcao: string
): boolean {
	return (
		plan.origin?.icao_code === departureIcao &&
		plan.destination?.icao_code === arrivalIcao
	);
}

/**
 * Format seconds into "Xh Ym" display
 */
export function formatFlightTime(seconds: string | number): string {
	const secs = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
	if (isNaN(secs)) return '—';
	const hours = Math.floor(secs / 3600);
	const minutes = Math.floor((secs % 3600) / 60);
	return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Format fuel weight in lbs with commas
 */
export function formatFuel(lbs: string | number): string {
	const num = typeof lbs === 'string' ? parseInt(lbs, 10) : lbs;
	if (isNaN(num)) return '—';
	return `${num.toLocaleString()} lbs`;
}

/**
 * Format altitude as flight level
 */
export function formatAltitude(feet: string | number): string {
	const num = typeof feet === 'string' ? parseInt(feet, 10) : feet;
	if (isNaN(num)) return '—';
	if (num >= 18000) return `FL${Math.round(num / 100)}`;
	return `${num.toLocaleString()} ft`;
}

/**
 * Build a VATSIM prefile URL from a SimBrief plan
 */
export function buildVatsimPrefileUrl(plan: SimBriefPlan): string {
	const params = new URLSearchParams({
		callsign: `${plan.general.icao_airline}${plan.general.flight_number}`,
		aircraft: `${plan.aircraft.icaocode}/L`,
		from: plan.origin.icao_code,
		to: plan.destination.icao_code,
		cruise_tas: plan.general.cruise_tas,
		cruise_level: plan.general.initial_altitude,
		route: plan.general.route,
	});

	if (plan.alternate?.icao_code) {
		params.set('alternate', plan.alternate.icao_code);
	}

	return `https://my.vatsim.net/pilots/flightplan?${params}`;
}

// localStorage helpers
const PILOT_ID_KEY = 'simbrief_pilot_id';

export function getStoredPilotId(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(PILOT_ID_KEY);
}

export function storePilotId(id: string): void {
	localStorage.setItem(PILOT_ID_KEY, id);
}

export function clearStoredPilotId(): void {
	localStorage.removeItem(PILOT_ID_KEY);
}
