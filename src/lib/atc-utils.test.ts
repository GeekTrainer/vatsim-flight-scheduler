import { describe, it, expect } from 'vitest';
import { hasATCCoverage, hasSpecificATCLevel } from './atc-utils';
import { filterRoutes } from './utils/route-filter';
import { ControllerPosition } from './types/vatsim';
import type { Route } from './types';
import type { ATCController } from './types/vatsim';

// Test data
const mockAirport1 = {
	icao: 'KBOS',
	name: 'Boston Logan International Airport',
	city: 'Boston',
	vatsim_code: 'BOS',
	artcc: 'ZBW'
};

const mockAirport2 = {
	icao: 'KLAX',
	name: 'Los Angeles International Airport',
	city: 'Los Angeles',
	vatsim_code: 'LAX',
	artcc: 'ZLA'
};

const mockAirport3 = {
	icao: 'KSEA',
	name: 'Seattle-Tacoma International Airport',
	city: 'Seattle',
	vatsim_code: 'SEA',
	artcc: 'ZSE'
};

const mockRoutes: Route[] = [
	{ id: 'KBOS-KLAX', departure: mockAirport1, arrival: mockAirport2 },
	{ id: 'KLAX-KSEA', departure: mockAirport2, arrival: mockAirport3 },
	{ id: 'KSEA-KBOS', departure: mockAirport3, arrival: mockAirport1 }
];

const mockController: ATCController = {
	callsign: 'BOS_TWR',
	name: 'John Doe',
	frequency: '118.200',
	onlineTimeMinutes: 60,
	position: ControllerPosition.TWR
};

describe('atc-utils', () => {
	describe('hasATCCoverage', () => {
		it('should return true when airport has tower controller using VATSIM code', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			const bosControllers = new Map<ControllerPosition, ATCController[]>();
			bosControllers.set(ControllerPosition.TWR, [mockController]);
			locationControllers.set('KBOS', bosControllers);

			// Test with VATSIM/IATA code
			const result = hasATCCoverage('BOS', 'ZBW', locationControllers);
			expect(result).toBe(true);
		});

		it('should return true when airport has tower controller using ICAO code', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			const bosControllers = new Map<ControllerPosition, ATCController[]>();
			bosControllers.set(ControllerPosition.TWR, [mockController]);
			locationControllers.set('KBOS', bosControllers);

			// Test with ICAO code directly
			const result = hasATCCoverage('KBOS', 'ZBW', locationControllers);
			expect(result).toBe(true);
		});

		it('should return true when ARTCC has center controller', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			const zbwControllers = new Map<ControllerPosition, ATCController[]>();
			zbwControllers.set(ControllerPosition.CTR, [{
				...mockController,
				callsign: 'ZBW_CTR',
				position: ControllerPosition.CTR
			}]);
			locationControllers.set('ZBW', zbwControllers);

			const result = hasATCCoverage('BOS', 'ZBW', locationControllers);
			expect(result).toBe(true);
		});

		it('should return false when no controllers are active', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();

			const result = hasATCCoverage('BOS', 'ZBW', locationControllers);
			expect(result).toBe(false);
		});

		it('should return false for unknown airport code', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			const bosControllers = new Map<ControllerPosition, ATCController[]>();
			bosControllers.set(ControllerPosition.TWR, [mockController]);
			locationControllers.set('KBOS', bosControllers);

			const result = hasATCCoverage('INVALID', 'ZBW', locationControllers);
			expect(result).toBe(false);
		});
	});

	describe('filterRoutes', () => {
		it('should return all routes when no filters applied', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			
			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: []
			}, locationControllers);
			
			expect(filtered).toHaveLength(3);
			expect(filtered).toEqual(mockRoutes);
		});

		it('should filter by departure ATC availability', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			const bosControllers = new Map<ControllerPosition, ATCController[]>();
			bosControllers.set(ControllerPosition.TWR, [mockController]);
			locationControllers.set('KBOS', bosControllers);

			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: null,
				onlyDepartureWithATC: true,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: []
			}, locationControllers);
			
			// Only route with KBOS departure should be included
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KBOS-KLAX');
		});

		it('should filter by arrival ATC availability', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			const laxControllers = new Map<ControllerPosition, ATCController[]>();
			laxControllers.set(ControllerPosition.TWR, [mockController]);
			locationControllers.set('KLAX', laxControllers);

			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: true,
				departureATCLevels: [],
				arrivalATCLevels: []
			}, locationControllers);
			
			// Only route with KLAX arrival should be included
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KBOS-KLAX');
		});

		it('should filter by both departure and arrival ATC', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			const bosControllers = new Map<ControllerPosition, ATCController[]>();
			bosControllers.set(ControllerPosition.TWR, [mockController]);
			locationControllers.set('KBOS', bosControllers);
			
			const laxControllers = new Map<ControllerPosition, ATCController[]>();
			laxControllers.set(ControllerPosition.TWR, [mockController]);
			locationControllers.set('KLAX', laxControllers);

			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: null,
				onlyDepartureWithATC: true,
				onlyArrivalWithATC: true,
				departureATCLevels: [],
				arrivalATCLevels: []
			}, locationControllers);
			
			// Only route with both endpoints having ATC
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KBOS-KLAX');
		});

		it('should filter by selected departure airport', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			
			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: 'SEA',
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: []
			}, locationControllers);
			
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KSEA-KBOS');
		});

		it('should filter by selected arrival airport', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			
			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: null,
				selectedArrival: 'BOS',
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: []
			}, locationControllers);
			
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KSEA-KBOS');
		});

		it('should apply multiple filters together', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			const bosControllers = new Map<ControllerPosition, ATCController[]>();
			bosControllers.set(ControllerPosition.TWR, [mockController]);
			locationControllers.set('KBOS', bosControllers);

			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: 'BOS',
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: []
			}, locationControllers);
			
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('KBOS-KLAX');
		});

		it('should return empty array when no routes match filters', () => {
			const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
			
			const filtered = filterRoutes(mockRoutes, {
				selectedDeparture: 'ORD',
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: []
			}, locationControllers);
			
			expect(filtered).toHaveLength(0);
		});
	});

	describe('ATC Level Filtering (TDD)', () => {
		describe('hasSpecificATCLevel', () => {
			it('should return true when airport has requested DEL controller', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const bosControllers = new Map<ControllerPosition, ATCController[]>();
				bosControllers.set(ControllerPosition.DEL, [{
					...mockController,
					callsign: 'BOS_DEL',
					position: ControllerPosition.DEL
				}]);
				locationControllers.set('KBOS', bosControllers);

				const result = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.DEL], locationControllers);
				expect(result).toBe(true);
			});

			it('should return true when airport has any of multiple requested levels (OR logic)', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const bosControllers = new Map<ControllerPosition, ATCController[]>();
				bosControllers.set(ControllerPosition.TWR, [mockController]);
				locationControllers.set('KBOS', bosControllers);

				// Requesting TWR OR APP - should match TWR
				const result = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.TWR, ControllerPosition.APP], locationControllers);
				expect(result).toBe(true);
			});

			it('should return true when center is requested and online', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const zbwControllers = new Map<ControllerPosition, ATCController[]>();
				zbwControllers.set(ControllerPosition.CTR, [{
					...mockController,
					callsign: 'ZBW_CTR',
					position: ControllerPosition.CTR
				}]);
				locationControllers.set('ZBW', zbwControllers);

				const result = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.CTR], locationControllers);
				expect(result).toBe(true);
			});

			it('should return false when none of the requested levels are online', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const bosControllers = new Map<ControllerPosition, ATCController[]>();
				bosControllers.set(ControllerPosition.TWR, [mockController]);
				locationControllers.set('KBOS', bosControllers);

				// Requesting GND OR DEL, but only TWR is online
				const result = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.GND, ControllerPosition.DEL], locationControllers);
				expect(result).toBe(false);
			});

			it('should return false when empty levels array is provided', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const bosControllers = new Map<ControllerPosition, ATCController[]>();
				bosControllers.set(ControllerPosition.TWR, [mockController]);
				locationControllers.set('KBOS', bosControllers);

				const result = hasSpecificATCLevel('BOS', 'ZBW', [], locationControllers);
				expect(result).toBe(false);
			});

			it('should work with both VATSIM and ICAO codes', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const bosControllers = new Map<ControllerPosition, ATCController[]>();
				bosControllers.set(ControllerPosition.APP, [{
					...mockController,
					callsign: 'BOS_APP',
					position: ControllerPosition.APP
				}]);
				locationControllers.set('KBOS', bosControllers);

				const resultVatsim = hasSpecificATCLevel('BOS', 'ZBW', [ControllerPosition.APP], locationControllers);
				const resultIcao = hasSpecificATCLevel('KBOS', 'ZBW', [ControllerPosition.APP], locationControllers);
				
				expect(resultVatsim).toBe(true);
				expect(resultIcao).toBe(true);
			});

			it('should handle all 5 position types correctly', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const bosControllers = new Map<ControllerPosition, ATCController[]>();
				
				// Add all 5 positions
				bosControllers.set(ControllerPosition.DEL, [{ ...mockController, position: ControllerPosition.DEL }]);
				bosControllers.set(ControllerPosition.GND, [{ ...mockController, position: ControllerPosition.GND }]);
				bosControllers.set(ControllerPosition.TWR, [{ ...mockController, position: ControllerPosition.TWR }]);
				bosControllers.set(ControllerPosition.APP, [{ ...mockController, position: ControllerPosition.APP }]);
				locationControllers.set('KBOS', bosControllers);
				
				const zbwControllers = new Map<ControllerPosition, ATCController[]>();
				zbwControllers.set(ControllerPosition.CTR, [{ ...mockController, position: ControllerPosition.CTR }]);
				locationControllers.set('ZBW', zbwControllers);

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
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const bosControllers = new Map<ControllerPosition, ATCController[]>();
				bosControllers.set(ControllerPosition.TWR, [mockController]);
				locationControllers.set('KBOS', bosControllers);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [ControllerPosition.TWR],
					arrivalATCLevels: []
				}, locationControllers);

				// Only route with KBOS departure should be included
				expect(filtered).toHaveLength(1);
				expect(filtered[0].id).toBe('KBOS-KLAX');
			});

			it('should filter by specific arrival ATC levels', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const laxControllers = new Map<ControllerPosition, ATCController[]>();
				laxControllers.set(ControllerPosition.APP, [{
					...mockController,
					callsign: 'SOCAL_APP',
					position: ControllerPosition.APP
				}]);
				locationControllers.set('KLAX', laxControllers);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [],
					arrivalATCLevels: [ControllerPosition.APP]
				}, locationControllers);

				// Only route with KLAX arrival should be included
				expect(filtered).toHaveLength(1);
				expect(filtered[0].id).toBe('KBOS-KLAX');
			});

			it('should filter by multiple ATC levels using OR logic', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const bosControllers = new Map<ControllerPosition, ATCController[]>();
				bosControllers.set(ControllerPosition.TWR, [mockController]);
				locationControllers.set('KBOS', bosControllers);

				const seaControllers = new Map<ControllerPosition, ATCController[]>();
				seaControllers.set(ControllerPosition.GND, [{
					...mockController,
					callsign: 'SEA_GND',
					position: ControllerPosition.GND
				}]);
				locationControllers.set('KSEA', seaControllers);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [ControllerPosition.TWR, ControllerPosition.GND],
					arrivalATCLevels: []
				}, locationControllers);

				// Both KBOS (TWR) and KSEA (GND) should match
				expect(filtered).toHaveLength(2);
				expect(filtered.map(r => r.id).sort()).toEqual(['KBOS-KLAX', 'KSEA-KBOS']);
			});

			it('should combine ATC level filtering with airport selection', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();
				const bosControllers = new Map<ControllerPosition, ATCController[]>();
				bosControllers.set(ControllerPosition.TWR, [mockController]);
				locationControllers.set('KBOS', bosControllers);

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: 'BOS',
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [ControllerPosition.TWR],
					arrivalATCLevels: []
				}, locationControllers);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].id).toBe('KBOS-KLAX');
			});

			it('should return empty when ATC levels specified but none online', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [ControllerPosition.TWR, ControllerPosition.APP],
					arrivalATCLevels: []
				}, locationControllers);

				expect(filtered).toHaveLength(0);
			});

			it('should allow empty ATC levels array (no filtering)', () => {
				const locationControllers = new Map<string, Map<ControllerPosition, ATCController[]>>();

				const filtered = filterRoutes(mockRoutes, {
					selectedDeparture: null,
					selectedArrival: null,
					onlyDepartureWithATC: false,
					onlyArrivalWithATC: false,
					departureATCLevels: [],
					arrivalATCLevels: []
				}, locationControllers);

				// Should return all routes when levels array is empty
				expect(filtered).toHaveLength(3);
			});
		});
	});
});
