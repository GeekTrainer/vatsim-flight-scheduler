import { describe, it, expect } from 'vitest';
import { hasATCCoverage, hasSpecificATCLevel } from './atc-utils';
import { filterRoutes } from './utils/route-filter';
import { ControllerPosition } from './types/vatsim';
import type { Route } from './types';
import { createMockController, createMockAirport, createMockRoute, createMockLocationControllers } from './test-utils/mock-factories';

// Test data
const mockAirport1 = createMockAirport({
	icao: 'KBOS',
	name: 'Boston Logan International Airport',
	city: 'Boston',
	vatsim_code: 'BOS',
	artcc: 'ZBW'
});

const mockAirport2 = createMockAirport({
	icao: 'KLAX',
	name: 'Los Angeles International Airport',
	city: 'Los Angeles',
	vatsim_code: 'LAX',
	artcc: 'ZLA'
});

const mockAirport3 = createMockAirport({
	icao: 'KSEA',
	name: 'Seattle-Tacoma International Airport',
	city: 'Seattle',
	vatsim_code: 'SEA',
	artcc: 'ZSE'
});

const mockRoutes: Route[] = [
	createMockRoute(mockAirport1, mockAirport2, { distance_nm: 2200, flight_time_minutes: 370 }),
	createMockRoute(mockAirport2, mockAirport3, { distance_nm: 800, flight_time_minutes: 160 }),
	createMockRoute(mockAirport3, mockAirport1, { distance_nm: 2100, flight_time_minutes: 355 })
];

const mockController = createMockController({
	callsign: 'BOS_TWR',
	name: 'John Doe',
	frequency: '118.200',
	onlineTimeMinutes: 60,
	position: ControllerPosition.TWR
});

describe('atc-utils', () => {
	describe('hasATCCoverage', () => {
		it('should return true when airport has tower controller using VATSIM code', () => {
			const locationControllers = createMockLocationControllers([
				['KBOS', [[ControllerPosition.TWR, [mockController]]]]
			]);

			// Test with VATSIM/IATA code
			const result = hasATCCoverage('BOS', 'ZBW', locationControllers);
			expect(result).toBe(true);
		});

		it('should return true when airport has tower controller using ICAO code', () => {
			const locationControllers = createMockLocationControllers([
				['KBOS', [[ControllerPosition.TWR, [mockController]]]]
			]);

			// Test with ICAO code directly
			const result = hasATCCoverage('KBOS', 'ZBW', locationControllers);
			expect(result).toBe(true);
		});

		it('should return true when ARTCC has center controller', () => {
			const locationControllers = createMockLocationControllers([
				['ZBW', [[ControllerPosition.CTR, [createMockController({ callsign: 'ZBW_CTR', position: ControllerPosition.CTR })]]]]
			]);

			const result = hasATCCoverage('BOS', 'ZBW', locationControllers);
			expect(result).toBe(true);
		});

		it('should return false when no controllers are active', () => {
			const locationControllers = createMockLocationControllers([]);

			const result = hasATCCoverage('BOS', 'ZBW', locationControllers);
			expect(result).toBe(false);
		});

		it('should return false for unknown airport code', () => {
			const locationControllers = createMockLocationControllers([
				['KBOS', [[ControllerPosition.TWR, [mockController]]]]
			]);

			const result = hasATCCoverage('INVALID', 'ZBW', locationControllers);
			expect(result).toBe(false);
		});
	});

	describe('filterRoutes', () => {
		it('should return all routes when no filters applied', () => {
			const locationControllers = createMockLocationControllers([]);
			
			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
			}, locationControllers);
			
			expect(filtered).toHaveLength(3);
			expect(filtered).toEqual(mockRoutes);
		});

		it('should filter by departure ATC availability', () => {
			const locationControllers = createMockLocationControllers([
				['KBOS', [[ControllerPosition.TWR, [mockController]]]]
			]);

			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: null,
				onlyDepartureWithATC: true,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
			}, locationControllers);
			
			// Only route with KBOS departure should be included
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KBOS-KLAX');
		});

		it('should filter by arrival ATC availability', () => {
			const locationControllers = createMockLocationControllers([
				['KLAX', [[ControllerPosition.TWR, [mockController]]]]
			]);

			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: true,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
			}, locationControllers);
			
			// Only route with KLAX arrival should be included
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KBOS-KLAX');
		});

		it('should filter by both departure and arrival ATC', () => {
			const locationControllers = createMockLocationControllers([
				['KBOS', [[ControllerPosition.TWR, [mockController]]]],
				['KLAX', [[ControllerPosition.TWR, [mockController]]]]
			]);

			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: null,
				onlyDepartureWithATC: true,
				onlyArrivalWithATC: true,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
			}, locationControllers);
			
			// Only route with both endpoints having ATC
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KBOS-KLAX');
		});

		it('should filter by selected departure airport', () => {
			const locationControllers = createMockLocationControllers([]);
			
			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: 'SEA',
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
			}, locationControllers);
			
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KSEA-KBOS');
		});

		it('should filter by selected arrival airport', () => {
			const locationControllers = createMockLocationControllers([]);
			
			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: 'BOS',
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
			}, locationControllers);
			
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KSEA-KBOS');
		});

		it('should apply multiple filters together', () => {
			const locationControllers = createMockLocationControllers([
				['KBOS', [[ControllerPosition.TWR, [mockController]]]]
			]);

			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: 'BOS',
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
			}, locationControllers);
			
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KBOS-KLAX');
		});

		it('should return empty array when no routes match filters', () => {
			const locationControllers = createMockLocationControllers([]);
			
			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: 'ORD',
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
			}, locationControllers);
			
			expect(filtered).toHaveLength(0);
		});
	});

	describe('ATC Level Filtering (TDD)', () => {
		describe('hasSpecificATCLevel', () => {
			it('should return true when airport has requested DEL controller', () => {
				const locationControllers = createMockLocationControllers([
					['KBOS', [[ControllerPosition.DEL, [createMockController({ callsign: 'BOS_DEL', position: ControllerPosition.DEL })]]]]
				]);

				const result = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.DEL], locationControllers);
				expect(result).toBe(true);
			});

			it('should return true when airport has any of multiple requested levels (OR logic)', () => {
				const locationControllers = createMockLocationControllers([
					['KBOS', [[ControllerPosition.TWR, [mockController]]]]
				]);

				// Requesting TWR OR APP - should match TWR
				const result = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.TWR, ControllerPosition.APP], locationControllers);
				expect(result).toBe(true);
			});

			it('should return true when center is requested and online', () => {
				const locationControllers = createMockLocationControllers([
					['ZBW', [[ControllerPosition.CTR, [createMockController({ callsign: 'ZBW_CTR', position: ControllerPosition.CTR })]]]]
				]);

				const result = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.CTR], locationControllers);
				expect(result).toBe(true);
			});

			it('should return false when none of the requested levels are online', () => {
				const locationControllers = createMockLocationControllers([
					['KBOS', [[ControllerPosition.TWR, [mockController]]]]
				]);

				// Requesting GND OR DEL, but only TWR is online
				const result = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.GND, ControllerPosition.DEL], locationControllers);
				expect(result).toBe(false);
			});

			it('should return false when empty levels array is provided', () => {
				const locationControllers = createMockLocationControllers([
					['KBOS', [[ControllerPosition.TWR, [mockController]]]]
				]);

				const result = hasSpecificATCLevel('BOS', 'ZBW', [], locationControllers);
				expect(result).toBe(false);
			});

			it('should work with both VATSIM and ICAO codes', () => {
				const locationControllers = createMockLocationControllers([
					['KBOS', [[ControllerPosition.APP, [createMockController({ callsign: 'BOS_APP', position: ControllerPosition.APP })]]]]
				]);

				const resultVatsim = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.APP], locationControllers);
				const resultIcao = hasSpecificATCLevel('KBOS', 'ZBW', [ControllerPosition.APP], locationControllers);
				
				expect(resultVatsim).toBe(true);
				expect(resultIcao).toBe(true);
			});

			it('should handle all 5 position types correctly', () => {
				const locationControllers = createMockLocationControllers([
					['KBOS', [
						[ControllerPosition.DEL, [createMockController({ callsign: 'BOS_DEL', position: ControllerPosition.DEL })]],
						[ControllerPosition.GND, [createMockController({ callsign: 'BOS_GND', position: ControllerPosition.GND })]],
						[ControllerPosition.TWR, [mockController]],
						[ControllerPosition.APP, [createMockController({ callsign: 'BOS_APP', position: ControllerPosition.APP })]]
					]],
					['ZBW', [[ControllerPosition.CTR, [createMockController({ callsign: 'ZBW_CTR', position: ControllerPosition.CTR })]]]]
				]);

				// Test each position individually
				expect(hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.DEL], locationControllers)).toBe(true);
				expect(hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.GND], locationControllers)).toBe(true);
				expect(hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.TWR], locationControllers)).toBe(true);
				expect(hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.APP], locationControllers)).toBe(true);
				expect(hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.CTR], locationControllers)).toBe(true);
			});
		});

		describe('filterRoutes with ATC level filtering', () => {
			it('should filter by specific departure ATC levels', () => {
				const locationControllers = createMockLocationControllers([
					['KBOS', [[ControllerPosition.TWR, [mockController]]]]
				]);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [ControllerPosition.TWR],
					arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
				}, locationControllers);

				// Only route with KBOS departure should be included
				expect(filtered).toHaveLength(1);
				expect(filtered[0].id).toBe('KBOS-KLAX');
			});

			it('should filter by specific arrival ATC levels', () => {
				const locationControllers = createMockLocationControllers([
					['KLAX', [[ControllerPosition.APP, [createMockController({ callsign: 'SOCAL_APP', position: ControllerPosition.APP })]]]]
				]);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [],
					arrivalATCLevels: [ControllerPosition.APP],
				minFlightTime: null,
				maxFlightTime: null
				}, locationControllers);

				// Only route with KLAX arrival should be included
				expect(filtered).toHaveLength(1);
				expect(filtered[0].id).toBe('KBOS-KLAX');
			});

			it('should filter by multiple ATC levels using OR logic', () => {
				const locationControllers = createMockLocationControllers([
					['KBOS', [[ControllerPosition.TWR, [mockController]]]],
					['KSEA', [[ControllerPosition.GND, [createMockController({ callsign: 'SEA_GND', position: ControllerPosition.GND })]]]]
				]);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [ControllerPosition.TWR, ControllerPosition.GND],
					arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
				}, locationControllers);

				// Both KBOS (TWR) and KSEA (GND) should match
				expect(filtered).toHaveLength(2);
				expect(filtered.map(r => r.id).sort()).toEqual(['KBOS-KLAX', 'KSEA-KBOS']);
			});

			it('should combine ATC level filtering with airport selection', () => {
				const locationControllers = createMockLocationControllers([
					['KBOS', [[ControllerPosition.TWR, [mockController]]]]
				]);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: 'BOS',
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [ControllerPosition.TWR],
					arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
				}, locationControllers);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].id).toBe('KBOS-KLAX');
			});

			it('should return empty when ATC levels specified but none online', () => {
				const locationControllers = createMockLocationControllers([]);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [ControllerPosition.TWR, ControllerPosition.APP],
					arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
				}, locationControllers);

				expect(filtered).toHaveLength(0);
			});

			it('should allow empty ATC levels array (no filtering)', () => {
				const locationControllers = createMockLocationControllers([]);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [],
					arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
				}, locationControllers);

				// Should return all routes when levels array is empty
				expect(filtered).toHaveLength(3);
			});
		});
	});
});
