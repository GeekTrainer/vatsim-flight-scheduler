import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { airports, loadAllRoutes } from '$lib/routes';
import type { Airport } from '$lib/types';

const airportsByIcao = new Map(airports.map(a => [a.icao, a]));
const allRoutes = loadAllRoutes();
const routesByIdMap = new Map(allRoutes.map(r => [r.id, r]));

function stripCoords(airport: Airport): Airport {
	const { icao, vatsim_code, city, name, artcc } = airport;
	return { icao, vatsim_code, city, name, artcc };
}

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

	const routeId = `${departure.vatsim_code}-${arrival.vatsim_code}`;
	const route = routesByIdMap.get(routeId);

	return {
		departure: stripCoords(departure),
		arrival: stripCoords(arrival),
		distance_nm: route?.distance_nm ?? 0,
		flight_time_minutes: route?.flight_time_minutes ?? 0
	};
};
