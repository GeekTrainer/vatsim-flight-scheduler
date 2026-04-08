/**
 * CTAF frequency cache using Netlify Blobs (production) or in-memory Map (development).
 * Provides a simple get/set interface for caching airport CTAF frequencies.
 */

interface CTAFCacheEntry {
	frequency: number | null;
	fetchedAt: string;
}

const STORE_NAME = 'ctaf-frequencies';

// In-memory fallback for development
const memoryCache = new Map<string, CTAFCacheEntry>();

function isNetlifyEnvironment(): boolean {
	return typeof process !== 'undefined' && !!process.env?.NETLIFY;
}

/**
 * Get a cached CTAF frequency for an airport.
 * Returns the frequency in MHz, null if cached as not found, or undefined if not cached.
 */
export async function getCTAF(icao: string): Promise<number | null | undefined> {
	const key = `ctaf:${icao}`;

	if (isNetlifyEnvironment()) {
		try {
			const { getStore } = await import('@netlify/blobs');
			const store = getStore(STORE_NAME);
			const entry = await store.get(key, { type: 'json' }) as CTAFCacheEntry | null;
			if (entry === null) return undefined;
			return entry.frequency;
		} catch (err) {
			console.warn(`Netlify Blobs read failed for ${icao}:`, err);
			return undefined;
		}
	}

	// Development fallback: in-memory cache
	const entry = memoryCache.get(key);
	if (entry === undefined) return undefined;
	return entry.frequency;
}

/**
 * Store a CTAF frequency in the cache.
 */
export async function setCTAF(icao: string, frequency: number | null): Promise<void> {
	const key = `ctaf:${icao}`;
	const entry: CTAFCacheEntry = {
		frequency,
		fetchedAt: new Date().toISOString()
	};

	if (isNetlifyEnvironment()) {
		try {
			const { getStore } = await import('@netlify/blobs');
			const store = getStore(STORE_NAME);
			await store.setJSON(key, entry);
		} catch (err) {
			console.warn(`Netlify Blobs write failed for ${icao}:`, err);
		}
		return;
	}

	// Development fallback: in-memory cache
	memoryCache.set(key, entry);
}

/**
 * Clear the in-memory cache (for testing purposes).
 */
export function clearMemoryCache(): void {
	memoryCache.clear();
}
