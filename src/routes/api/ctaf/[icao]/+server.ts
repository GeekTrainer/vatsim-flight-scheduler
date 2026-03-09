import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCTAF, setCTAF } from '$lib/server/ctaf-cache';
import { fetchCTAFFromOurAirports } from '$lib/server/ourairports';

export const GET: RequestHandler = async ({ params }) => {
	const icao = params.icao.toUpperCase();

	// Validate ICAO format (2-4 letter prefix + alphanumeric)
	if (!/^[A-Z]{1,4}[A-Z0-9]{0,4}$/.test(icao) || icao.length < 3 || icao.length > 4) {
		return json({ frequency: null, error: 'Invalid ICAO code' }, { status: 400 });
	}

	// Check cache first
	const cached = await getCTAF(icao);
	if (cached !== undefined) {
		return json({ frequency: cached, source: 'cache' });
	}

	// Cache miss — fetch from OurAirports
	try {
		const frequency = await fetchCTAFFromOurAirports(icao);

		// Cache the result (including null for negative caching)
		await setCTAF(icao, frequency);
		return json({ frequency, source: 'ourairports' });
	} catch (err) {
		console.error(`Failed to fetch CTAF for ${icao}:`, err);
		return json({ frequency: null, error: 'Fetch failed' }, { status: 502 });
	}
};
