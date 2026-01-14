import { describe, it, expect } from 'vitest';
import { loadAllRoutes, airports } from './routes';
import type { Route } from './types';

describe('routes', () => {
	describe('loadAllRoutes', () => {
		it('should load all Southwest Airlines routes', () => {
			const routes = loadAllRoutes();
			expect(routes.length).toBe(1219);
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

		it('should include real Southwest routes like ABQ-BWI', () => {
			const routes = loadAllRoutes();
			const abqBwi = routes.find((r: Route) => r.id === 'ABQ-BWI');
			
			expect(abqBwi).toBeDefined();
			expect(abqBwi?.departure.vatsim_code).toBe('ABQ');
			expect(abqBwi?.arrival.vatsim_code).toBe('BWI');
		});
	});

	describe('airports', () => {
		it('should export an array of airports', () => {
			expect(Array.isArray(airports)).toBe(true);
			expect(airports.length).toBe(109);
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
