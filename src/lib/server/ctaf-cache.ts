/**
 * CTAF frequency cache using Netlify Blobs (production) or in-memory Map (development).
 * Provides a simple get/set interface for caching airport CTAF frequencies.
 */

interface CTAFCacheEntry {
	frequency: number;
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
 * Returns the frequency in MHz or null if not cached.
 */
export async function getCTAF(icao: string): Promise<number | null> {
	const key = `ctaf:${icao}`;

	if (isNetlifyEnvironment()) {
		try {
			const { getStore } = await import('@netlify/blobs');
			const store = getStore(STORE_NAME);
			const entry = await store.get(key, { type: 'json' }) as CTAFCacheEntry | null;
			return entry?.frequency ?? null;
		} catch (err) {
			console.warn(`Netlify Blobs read failed for ${icao}:`, err);
			return null;
		}
	}

	// Development fallback: in-memory cache
	const entry = memoryCache.get(key);
	return entry?.frequency ?? null;
}

/**
 * Store a CTAF frequency in the cache.
 */
export async function setCTAF(icao: string, frequency: number): Promise<void> {
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
