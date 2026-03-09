import { describe, it, expect } from 'vitest';
import { filterRoutes } from './route-filter';
import { ControllerPosition } from '$lib/types/vatsim';
import {
	createMockAirport,
	createMockRoute,
	createMockController,
	createMockLocationControllers
} from '$lib/test-utils/mock-factories';
import type { FilterState } from './filter-utils';

// Use real airport codes so atc-utils airport lookups work
const PHX = createMockAirport({ icao: 'KPHX', vatsim_code: 'PHX', city: 'Phoenix', artcc: 'ZAB' });
const LAS = createMockAirport({ icao: 'KLAS', vatsim_code: 'LAS', city: 'Las Vegas', artcc: 'ZLA' });
const DEN = createMockAirport({ icao: 'KDEN', vatsim_code: 'DEN', city: 'Denver', artcc: 'ZDV' });
const BWI = createMockAirport({ icao: 'KBWI', vatsim_code: 'BWI', city: 'Baltimore', artcc: 'ZDC' });

const routes = [
	createMockRoute(PHX, LAS, { flight_time_minutes: 65 }),
	createMockRoute(PHX, DEN, { flight_time_minutes: 150 }),
	createMockRoute(LAS, BWI, { flight_time_minutes: 280 }),
	createMockRoute(DEN, PHX, { flight_time_minutes: 150 }),
];

function noFilters(): FilterState {
	return {
		selectedDeparture: null,
		selectedArrival: null,
		onlyDepartureWithATC: false,
		onlyArrivalWithATC: false,
		departureATCLevels: [],
		arrivalATCLevels: [],
		minFlightTime: null,
		maxFlightTime: null
	};
}

const emptyControllers = createMockLocationControllers([]);

describe('filterRoutes', () => {
	describe('no filters active', () => {
		it('should return all routes when no filters are set', () => {
			const result = filterRoutes(routes, noFilters(), emptyControllers);
			expect(result).toHaveLength(4);
		});
	});

	describe('departure airport filter', () => {
		it('should filter by departure airport', () => {
			const filters = { ...noFilters(), selectedDeparture: 'PHX' };
			const result = filterRoutes(routes, filters, emptyControllers);
			expect(result).toHaveLength(2);
			expect(result.every(r => r.departure.vatsim_code === 'PHX')).toBe(true);
		});

		it('should return empty when no routes match departure', () => {
			const filters = { ...noFilters(), selectedDeparture: 'BWI' };
			const result = filterRoutes(routes, filters, emptyControllers);
			// Only LAS-BWI has BWI as arrival, not departure
			expect(result).toHaveLength(0);
		});
	});

	describe('arrival airport filter', () => {
		it('should filter by arrival airport', () => {
			const filters = { ...noFilters(), selectedArrival: 'PHX' };
			const result = filterRoutes(routes, filters, emptyControllers);
			expect(result).toHaveLength(1);
			expect(result[0].arrival.vatsim_code).toBe('PHX');
		});
	});

	describe('combined departure + arrival filter', () => {
		it('should filter by both departure and arrival', () => {
			const filters = { ...noFilters(), selectedDeparture: 'PHX', selectedArrival: 'LAS' };
			const result = filterRoutes(routes, filters, emptyControllers);
			expect(result).toHaveLength(1);
			expect(result[0].departure.vatsim_code).toBe('PHX');
			expect(result[0].arrival.vatsim_code).toBe('LAS');
		});

		it('should return empty when departure/arrival combo has no match', () => {
			const filters = { ...noFilters(), selectedDeparture: 'LAS', selectedArrival: 'DEN' };
			const result = filterRoutes(routes, filters, emptyControllers);
			expect(result).toHaveLength(0);
		});
	});

	describe('departure ATC coverage filter', () => {
		it('should only include routes where departure has any ATC', () => {
			const controllers = createMockLocationControllers([
				['KPHX', [[ControllerPosition.TWR, [createMockController({ callsign: 'PHX_TWR' })]]]]
			]);
			const filters = { ...noFilters(), onlyDepartureWithATC: true };
			const result = filterRoutes(routes, filters, controllers);
			// PHX-LAS and PHX-DEN have PHX departure with TWR
			expect(result).toHaveLength(2);
			expect(result.every(r => r.departure.vatsim_code === 'PHX')).toBe(true);
		});

		it('should include routes when departure has center coverage', () => {
			const controllers = createMockLocationControllers([
				['ZLA', [[ControllerPosition.CTR, [createMockController({ callsign: 'ZLA_CTR' })]]]]
			]);
			const filters = { ...noFilters(), onlyDepartureWithATC: true };
			const result = filterRoutes(routes, filters, controllers);
			// LAS (artcc=ZLA) has center coverage
			expect(result.some(r => r.departure.vatsim_code === 'LAS')).toBe(true);
		});
	});

	describe('arrival ATC coverage filter', () => {
		it('should only include routes where arrival has any ATC', () => {
			const controllers = createMockLocationControllers([
				['KPHX', [[ControllerPosition.TWR, [createMockController({ callsign: 'PHX_TWR' })]]]]
			]);
			const filters = { ...noFilters(), onlyArrivalWithATC: true };
			const result = filterRoutes(routes, filters, controllers);
			// PHX-DEN→DEN no, PHX-LAS→LAS no, LAS-BWI→BWI no, DEN-PHX→PHX yes
			expect(result).toHaveLength(1);
			expect(result[0].arrival.vatsim_code).toBe('PHX');
		});
	});

	describe('departure ATC level filter', () => {
		it('should filter by specific ATC level at departure', () => {
			const controllers = createMockLocationControllers([
				['KPHX', [
					[ControllerPosition.TWR, [createMockController({ callsign: 'PHX_TWR' })]],
					[ControllerPosition.GND, [createMockController({ callsign: 'PHX_GND' })]]
				]]
			]);
			const filters = { ...noFilters(), departureATCLevels: [ControllerPosition.GND] };
			const result = filterRoutes(routes, filters, controllers);
			expect(result).toHaveLength(2);
			expect(result.every(r => r.departure.vatsim_code === 'PHX')).toBe(true);
		});

		it('should use OR logic across multiple levels', () => {
			const controllers = createMockLocationControllers([
				['KPHX', [[ControllerPosition.TWR, [createMockController({ callsign: 'PHX_TWR' })]]]],
				['KLAS', [[ControllerPosition.GND, [createMockController({ callsign: 'LAS_GND' })]]]]
			]);
			const filters = { ...noFilters(), departureATCLevels: [ControllerPosition.TWR, ControllerPosition.GND] };
			const result = filterRoutes(routes, filters, controllers);
			// PHX has TWR, LAS has GND — both match
			expect(result).toHaveLength(3);
		});

		it('should not filter when departureATCLevels is empty', () => {
			const filters = { ...noFilters(), departureATCLevels: [] };
			const result = filterRoutes(routes, filters, emptyControllers);
			expect(result).toHaveLength(4);
		});
	});

	describe('flight time range filter', () => {
		it('should filter by minimum flight time', () => {
			const filters = { ...noFilters(), minFlightTime: 100 };
			const result = filterRoutes(routes, filters, emptyControllers);
			// 150, 280, 150 pass; 65 fails
			expect(result).toHaveLength(3);
			expect(result.every(r => r.flight_time_minutes! >= 100)).toBe(true);
		});

		it('should filter by maximum flight time', () => {
			const filters = { ...noFilters(), maxFlightTime: 150 };
			const result = filterRoutes(routes, filters, emptyControllers);
			// 65, 150, 150 pass; 280 fails
			expect(result).toHaveLength(3);
			expect(result.every(r => r.flight_time_minutes! <= 150)).toBe(true);
		});

		it('should filter by both min and max flight time', () => {
			const filters = { ...noFilters(), minFlightTime: 100, maxFlightTime: 200 };
			const result = filterRoutes(routes, filters, emptyControllers);
			// 150, 150 pass; 65 too short, 280 too long
			expect(result).toHaveLength(2);
		});

		it('should handle edge case of exact boundary values', () => {
			const filters = { ...noFilters(), minFlightTime: 65, maxFlightTime: 65 };
			const result = filterRoutes(routes, filters, emptyControllers);
			// Only PHX-LAS at exactly 65 min
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('KPHX-KLAS');
		});
	});

	describe('combined filters', () => {
		it('should apply all filters together', () => {
			const controllers = createMockLocationControllers([
				['KPHX', [[ControllerPosition.TWR, [createMockController({ callsign: 'PHX_TWR' })]]]]
			]);
			const filters: FilterState = {
				selectedDeparture: 'PHX',
				selectedArrival: null,
				onlyDepartureWithATC: true,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: 100,
				maxFlightTime: null
			};
			const result = filterRoutes(routes, filters, controllers);
			// PHX departure + ATC + >=100 min → only PHX-DEN (150 min)
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('KPHX-KDEN');
		});
	});
});
