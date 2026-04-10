import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const METAR_API_URL = 'https://aviationweather.gov/api/data/metar';

export const GET: RequestHandler = async ({ params }) => {
	const icao = params.icao.toUpperCase();

	if (!/^[A-Z]{1,4}[A-Z0-9]{0,4}$/.test(icao) || icao.length < 3 || icao.length > 4) {
		return json({ error: 'Invalid ICAO code' }, { status: 400 });
	}

	try {
		const response = await fetch(`${METAR_API_URL}?ids=${icao}&format=json`);

		if (!response.ok || response.status === 204) {
			return json([], { status: 200 });
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		console.error(`Failed to fetch METAR for ${icao}:`, err);
		return json([], { status: 502 });
	}
};
