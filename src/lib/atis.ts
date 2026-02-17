/**
 * FAA D-ATIS Service
 * Fetches real-world Digital ATIS from the FAA via datis.clowd.io
 * Server-side only to avoid CORS issues
 */

import type { ATISInfo } from './types';

interface FAADatisResponse {
	airport: string;
	type: string;
	code: string;
	datis: string;
}

interface CachedATIS {
	data: ATISInfo | null;
	timestamp: number;
}

const DATIS_API_URL = 'https://datis.clowd.io/api';
const CACHE_DURATION = 60 * 1000; // 60 seconds

const atisCache = new Map<string, CachedATIS>();

/**
 * Fetches FAA D-ATIS for a US airport
 * Returns null gracefully on any error
 */
export async function fetchFAADatis(icao: string): Promise<ATISInfo | null> {
	const now = Date.now();
	const cached = atisCache.get(icao);

	if (cached && now - cached.timestamp < CACHE_DURATION) {
		return cached.data;
	}

	try {
		const response = await fetch(`${DATIS_API_URL}/${icao}`);
		if (!response.ok) {
			atisCache.set(icao, { data: null, timestamp: now });
			return null;
		}

		const data: FAADatisResponse[] = await response.json();

		if (!Array.isArray(data) || data.length === 0) {
			atisCache.set(icao, { data: null, timestamp: now });
			return null;
		}

		// Prefer 'combined' type if available, otherwise take first
		const entry = data.find(d => d.type === 'combined') || data[0];

		const result: ATISInfo = {
			source: 'faa',
			code: entry.code || undefined,
			text: entry.datis,
		};

		atisCache.set(icao, { data: result, timestamp: now });
		return result;
	} catch {
		atisCache.set(icao, { data: null, timestamp: now });
		return null;
	}
}
