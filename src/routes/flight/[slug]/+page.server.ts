import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { airports } from '$lib/routes';
import { fetchFAADatis } from '$lib/atis';

const airportsByIcao = new Map(airports.map(a => [a.icao, a]));

export const load: PageServerLoad = async ({ params }) => {
	const parts = params.slug.split('-');

	if (parts.length !== 2) {
		error(404, 'Invalid flight route format. Expected: KXXX-KXXX');
	}

	const [departureIcao, arrivalIcao] = parts;
	const departure = airportsByIcao.get(departureIcao);
	const arrival = airportsByIcao.get(arrivalIcao);

	if (!departure) {
		error(404, `Unknown departure airport: ${departureIcao}`);
	}
	if (!arrival) {
		error(404, `Unknown arrival airport: ${arrivalIcao}`);
	}

	// Fetch FAA D-ATIS for both airports in parallel
	const [departureFaaAtis, arrivalFaaAtis] = await Promise.all([
		fetchFAADatis(departureIcao),
		fetchFAADatis(arrivalIcao)
	]);

	return {
		departure,
		arrival,
		departureFaaAtis,
		arrivalFaaAtis
	};
};
