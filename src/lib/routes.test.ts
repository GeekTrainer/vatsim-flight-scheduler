import { describe, it, expect, vi } from 'vitest';
import { loadAllRoutes, airports } from './routes';
import type { Route } from './types';

describe('routes', () => {
	describe('loadAllRoutes', () => {
		it('should load all Virtual SWA routes', () => {
			const routes = loadAllRoutes();
			expect(routes.length).toBe(1327);
		});

		it('should return the same cached reference on subsequent calls', () => {
			const routes1 = loadAllRoutes();
			const routes2 = loadAllRoutes();
			expect(routes1).toBe(routes2); // same reference, not just equal
		});

		it('should generate routes with valid departure and arrival airports', () => {
			const routes = loadAllRoutes();
			
			routes.slice(0, 10).forEach((route: Route) => {
				expect(route.id).toBeDefined();
				expect(route.departure).toBeDefined();
				expect(route.arrival).toBeDefined();
				expect(route.departure.icao).toBeDefined();
				expect(route.arrival.icao).toBeDefined();
			});
		});

		it('should not create routes with same departure and arrival', () => {
			const routes = loadAllRoutes();
			
			routes.forEach((route: Route) => {
				expect(route.departure.icao).not.toBe(route.arrival.icao);
			});
		});

		it('should generate unique route IDs', () => {
			const routes = loadAllRoutes();
			const ids = routes.map((r: Route) => r.id);
			const uniqueIds = new Set(ids);
			
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('should use airports from the imported airports data', () => {
			const routes = loadAllRoutes();
			
			routes.slice(0, 10).forEach((route: Route) => {
				const depExists = airports.some(a => a.icao === route.departure.icao);
				const arrExists = airports.some(a => a.icao === route.arrival.icao);
				
				expect(depExists).toBe(true);
				expect(arrExists).toBe(true);
			});
		});

		it('should include Virtual SWA routes like ABQ-BWI', () => {
			const routes = loadAllRoutes();
			const abqBwi = routes.find((r: Route) => r.id === 'ABQ-BWI');
			
			expect(abqBwi).toBeDefined();
			expect(abqBwi?.departure.vatsim_code).toBe('ABQ');
			expect(abqBwi?.arrival.vatsim_code).toBe('BWI');
		});

		it('should include distance and flight time for each route', () => {
			const routes = loadAllRoutes();
			
			routes.slice(0, 10).forEach((route: Route) => {
				expect(route.distance_nm).toBeGreaterThan(0);
				expect(route.flight_time_minutes).toBeGreaterThan(0);
				expect(route.flight_time_minutes % 5).toBe(0); // rounded to 5 min
			});
		});

		it('should have positive distance and flight time for ALL routes', () => {
			const routes = loadAllRoutes();

			for (const route of routes) {
				expect(route.distance_nm).toBeGreaterThan(0);
				expect(route.flight_time_minutes).toBeGreaterThan(0);
			}
		});

		it('should generate route IDs in CODE-CODE format', () => {
			const routes = loadAllRoutes();
			const pattern = /^[A-Z]{3}-[A-Z]{3}$/;

			for (const route of routes) {
				expect(route.id).toMatch(pattern);
			}
		});

		it('should warn on missing airport data', async () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.resetModules();
			vi.doMock('./data/routes.json', () => ({
				default: [
					{ origin: 'PHX', destination: 'FAKE', distance_nm: 100, flight_time_minutes: 30 }
				]
			}));

			const { loadAllRoutes: loadFresh } = await import('./routes');
			const routes = loadFresh();

			expect(routes).toHaveLength(0);
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Missing airport data for route: PHX-FAKE')
			);

			warnSpy.mockRestore();
			vi.doUnmock('./data/routes.json');
		});
	});

	describe('airports', () => {
		it('should export an array of airports', () => {
			expect(Array.isArray(airports)).toBe(true);
			expect(airports.length).toBe(111);
		});

		it('should have valid airport structure', () => {
			airports.slice(0, 5).forEach(airport => {
				expect(airport.icao).toBeDefined();
				expect(airport.name).toBeDefined();
				expect(airport.city).toBeDefined();
				expect(airport.vatsim_code).toBeDefined();
				expect(airport.artcc).toBeDefined();
				expect(typeof airport.icao).toBe('string');
				expect(typeof airport.name).toBe('string');
			});
		});

		it('should include both US and international airports', () => {
			const usAirport = airports.find(a => a.icao === 'KPHX');
			const intlAirport = airports.find(a => a.icao === 'TJSJ');
			
			expect(usAirport).toBeDefined();
			expect(intlAirport).toBeDefined();
			expect(usAirport?.city).toBe('Phoenix');
			expect(intlAirport?.city).toBe('San Juan');
		});
	});
});
