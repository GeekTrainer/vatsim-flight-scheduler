import airportsData from './data/airports.json';
import routesData from './data/routes.json';
import type { Airport, Route } from './types';

export const airports: Airport[] = airportsData;

// Create lookup map for fast airport retrieval
const airportsByIATA = new Map<string, Airport>(
	airports.map(airport => [airport.vatsim_code, airport])
);

/**
 * Loads all Southwest Airlines routes from real route data
 * Returns array of Route objects with departure and arrival airport details
 */
export function loadAllRoutes(): Route[] {
	const routes: Route[] = [];
	
	for (const routeData of routesData) {
		const departure = airportsByIATA.get(routeData.origin);
		const arrival = airportsByIATA.get(routeData.destination);
		
		if (departure && arrival) {
			routes.push({
				id: `${routeData.origin}-${routeData.destination}`,
				departure,
				arrival
			});
		} else {
			console.warn(`Missing airport data for route: ${routeData.origin}-${routeData.destination}`);
		}
	}
	
	return routes;
}
