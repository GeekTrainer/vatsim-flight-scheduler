/**
 * NOAA METAR Service
 * Fetches real-world METAR data via server-side proxy (NOAA doesn't support CORS)
 * Used as fallback when FAA D-ATIS is unavailable (e.g., smaller airports like KEUG)
 * Client-side fetch through /api/metar/[icao] so Playwright can mock it in E2E tests
 */

import type { ATISInfo } from './types';

export interface NOAAMetarResponse {
	icaoId: string;
	rawOb: string;
	reportTime: string;
	temp: number;
	dewp: number;
	wdir: number | string;
	wspd: number;
	wgst?: number;
	visib: string;
	altim: number;
	fltCat: string;
	clouds: { cover: string; base: number }[];
	name: string;
}

interface CachedMETAR {
	data: NOAAMetarResponse | null;
	timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const metarCache = new Map<string, CachedMETAR>();

/**
 * Fetches METAR data via server-side proxy for a given ICAO code.
 * Returns ATISInfo with source='metar' so it flows through existing display pipeline.
 */
export async function fetchMETAR(icao: string): Promise<ATISInfo | null> {
	const now = Date.now();
	const cached = metarCache.get(icao);

	if (cached && now - cached.timestamp < CACHE_DURATION) {
		return cached.data ? metarToAtisInfo(cached.data) : null;
	}

	try {
		const response = await fetch(`/api/metar/${icao}`);

		if (!response.ok || response.status === 204) {
			metarCache.set(icao, { data: null, timestamp: now });
			return null;
		}

		const data: NOAAMetarResponse[] = await response.json();
		if (!Array.isArray(data) || data.length === 0) {
			metarCache.set(icao, { data: null, timestamp: now });
			return null;
		}

		const metar = data[0];
		metarCache.set(icao, { data: metar, timestamp: now });
		return metarToAtisInfo(metar);
	} catch {
		metarCache.set(icao, { data: null, timestamp: now });
		return null;
	}
}

/**
 * Converts NOAA METAR response to ATISInfo for display through existing pipeline.
 * The raw METAR text is compatible with atis-parser.ts (wind like 20008KT, altimeter like A2989).
 */
function metarToAtisInfo(metar: NOAAMetarResponse): ATISInfo {
	return {
		source: 'metar',
		text: metar.rawOb,
		lastUpdated: metar.reportTime,
	};
}

/**
 * Extracts flight category from cached METAR data for display (VFR, MVFR, IFR, LIFR).
 * Returns null if no METAR data is cached for this ICAO.
 */
export function getCachedFlightCategory(icao: string): string | null {
	const cached = metarCache.get(icao);
	if (!cached?.data) return null;
	return cached.data.fltCat || null;
}
