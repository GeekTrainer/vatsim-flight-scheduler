/**
 * FAA D-ATIS Service
 * Fetches real-world Digital ATIS from the FAA via datis.clowd.io
 * Client-side fetch so Playwright can mock it in E2E tests
 */

import type { ATISInfo } from './types';

interface FAADatisResponse {
	airport: string;
	type: string;
	code: string;
	datis: string;
}

interface CachedATIS {
	data: FAADatisResponse[];
	timestamp: number;
}

const DATIS_API_URL = 'https://datis.clowd.io/api';
const CACHE_DURATION = 60 * 1000; // 60 seconds

const atisCache = new Map<string, CachedATIS>();

/**
 * Fetches FAA D-ATIS for a US airport, selecting the correct entry for the role.
 * Split ATIS airports return multiple entries (type: 'arr', 'dep').
 * Combined airports return a single entry (type: 'combined').
 */
export async function fetchFAADatis(icao: string, role: 'departure' | 'arrival' = 'arrival'): Promise<ATISInfo | null> {
	const now = Date.now();
	const cached = atisCache.get(icao);
	let entries: FAADatisResponse[];

	if (cached && now - cached.timestamp < CACHE_DURATION) {
		entries = cached.data;
	} else {
		try {
			const response = await fetch(`${DATIS_API_URL}/${icao}`);
			if (!response.ok) {
				atisCache.set(icao, { data: [], timestamp: now });
				return null;
			}

			const data: FAADatisResponse[] = await response.json();
			if (!Array.isArray(data) || data.length === 0) {
				atisCache.set(icao, { data: [], timestamp: now });
				return null;
			}

			entries = data;
			atisCache.set(icao, { data: entries, timestamp: now });
		} catch {
			atisCache.set(icao, { data: [], timestamp: now });
			return null;
		}
	}

	if (entries.length === 0) return null;

	// Select the right entry based on role
	const roleType = role === 'departure' ? 'dep' : 'arr';
	const roleSpecific = entries.find(d => d.type === roleType);
	const combined = entries.find(d => d.type === 'combined');
	const entry = roleSpecific || combined || entries[0];

	let atisType: 'combined' | 'arrival' | 'departure' = 'combined';
	if (entry.type === 'arr') atisType = 'arrival';
	else if (entry.type === 'dep') atisType = 'departure';

	return {
		source: 'faa',
		atisType,
		code: entry.code || undefined,
		text: entry.datis,
	};
}
