/**
 * Client-side CTAF frequency fetcher with session caching.
 * Calls the /api/ctaf/[icao] endpoint and caches results in memory
 * to avoid repeated requests during the same browser session.
 */

// In-memory cache: ICAO → frequency (null means we tried and found nothing)
const sessionCache = new Map<string, number | null>();

// Track in-flight requests to avoid duplicate fetches
const pendingRequests = new Map<string, Promise<number | null>>();

/**
 * Fetch the CTAF frequency for an airport.
 * Returns the frequency in MHz, or null if unavailable.
 * Results are cached for the duration of the browser session.
 */
export async function fetchCTAF(icao: string): Promise<number | null> {
	// Return cached result if we've already fetched this airport
	if (sessionCache.has(icao)) {
		return sessionCache.get(icao) ?? null;
	}

	// If there's already a pending request for this ICAO, wait for it
	const pending = pendingRequests.get(icao);
	if (pending) {
		return pending;
	}

	// Start a new fetch
	const request = doFetch(icao);
	pendingRequests.set(icao, request);

	try {
		const result = await request;
		sessionCache.set(icao, result);
		return result;
	} finally {
		pendingRequests.delete(icao);
	}
}

async function doFetch(icao: string): Promise<number | null> {
	try {
		const response = await fetch(`/api/ctaf/${encodeURIComponent(icao)}`);
		if (!response.ok) return null;

		const data = await response.json();
		return data.frequency ?? null;
	} catch {
		return null;
	}
}

/**
 * Clear the session cache (for testing purposes).
 */
export function clearCTAFCache(): void {
	sessionCache.clear();
	pendingRequests.clear();
}
