import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ControllerPosition } from '$lib/types/vatsim';
import {
	createMockAirport,
	createMockRoute,
	createMockLocationControllers
} from '$lib/test-utils/mock-factories';

// Mock atc-utils so we control what hasATCCoverage/hasSpecificATCLevel return
vi.mock('$lib/atc-utils', () => ({
	hasATCCoverage: vi.fn(() => false),
	hasSpecificATCLevel: vi.fn(() => false)
}));

import { getAvailableAirports } from '$lib/utils/filter-airports';
import { hasATCCoverage, hasSpecificATCLevel } from '$lib/atc-utils';

const mockedHasATCCoverage = vi.mocked(hasATCCoverage);
const mockedHasSpecificATCLevel = vi.mocked(hasSpecificATCLevel);

// Test airports (cities chosen to verify sort order)
const PHX = createMockAirport({ icao: 'KPHX', vatsim_code: 'PHX', city: 'Phoenix', artcc: 'ZAB' });
const LAS = createMockAirport({ icao: 'KLAS', vatsim_code: 'LAS', city: 'Las Vegas', artcc: 'ZLA' });
const LAX = createMockAirport({ icao: 'KLAX', vatsim_code: 'LAX', city: 'Los Angeles', artcc: 'ZLA' });
const DEN = createMockAirport({ icao: 'KDEN', vatsim_code: 'DEN', city: 'Denver', artcc: 'ZDV' });

const airports = [PHX, LAS, LAX, DEN];

// Routes: PHX<->LAS, PHX<->LAX, LAS<->DEN
const routes = [
	createMockRoute(PHX, LAS),
	createMockRoute(PHX, LAX),
	createMockRoute(LAS, DEN),
	createMockRoute(DEN, PHX)
];

const emptyControllers = createMockLocationControllers([]);

function defaultCriteria(overrides: Record<string, unknown> = {}) {
	return {
		selectedAirport: null as string | null,
		otherSelectedAirport: null as string | null,
		onlyThisWithATC: false,
		onlyOtherWithATC: false,
		thisATCLevels: [] as ControllerPosition[],
		otherATCLevels: [] as ControllerPosition[],
		locationControllers: emptyControllers,
		...overrides
	};
}

describe('getAvailableAirports', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return all departure airports when no filters applied', () => {
		const result = getAvailableAirports(routes, airports, 'departure', defaultCriteria());

		const codes = result.map((a) => a.vatsim_code);
		expect(codes).toContain('PHX');
		expect(codes).toContain('LAS');
		expect(codes).toContain('DEN');
	});

	it('should return all arrival airports when no filters applied', () => {
		const result = getAvailableAirports(routes, airports, 'arrival', defaultCriteria());

		const codes = result.map((a) => a.vatsim_code);
		expect(codes).toContain('LAS');
		expect(codes).toContain('LAX');
		expect(codes).toContain('DEN');
		expect(codes).toContain('PHX');
	});

	it('should filter departure airports by other (arrival) selected airport', () => {
		// Only routes arriving at LAS: PHX->LAS
		const result = getAvailableAirports(
			routes,
			airports,
			'departure',
			defaultCriteria({ otherSelectedAirport: 'LAS' })
		);

		const codes = result.map((a) => a.vatsim_code);
		expect(codes).toEqual(['PHX']); // Only PHX departs to LAS
	});

	it('should filter arrival airports by other (departure) selected airport', () => {
		// Only routes departing from PHX: PHX->LAS, PHX->LAX
		const result = getAvailableAirports(
			routes,
			airports,
			'arrival',
			defaultCriteria({ otherSelectedAirport: 'PHX' })
		);

		const codes = result.map((a) => a.vatsim_code);
		expect(codes).toEqual(['Las Vegas', 'Los Angeles'].map((_c, i) => ['LAS', 'LAX'][i]));
		expect(codes).toContain('LAS');
		expect(codes).toContain('LAX');
		expect(codes).not.toContain('DEN');
	});

	it('should filter by onlyThisWithATC', () => {
		// Only PHX has ATC
		mockedHasATCCoverage.mockImplementation((code) => code === 'PHX');

		const result = getAvailableAirports(
			routes,
			airports,
			'departure',
			defaultCriteria({ onlyThisWithATC: true })
		);

		const codes = result.map((a) => a.vatsim_code);
		expect(codes).toEqual(['PHX']);
	});

	it('should filter by onlyOtherWithATC with otherSelectedAirport set', () => {
		// otherSelectedAirport=LAS, onlyOtherWithATC=true, LAS has NO ATC
		mockedHasATCCoverage.mockReturnValue(false);

		const result = getAvailableAirports(
			routes,
			airports,
			'departure',
			defaultCriteria({ otherSelectedAirport: 'LAS', onlyOtherWithATC: true })
		);

		// LAS has no ATC so all routes to LAS are filtered out
		expect(result).toHaveLength(0);
	});

	it('should pass through routes when onlyOtherWithATC is true and other airport has ATC', () => {
		mockedHasATCCoverage.mockImplementation((code) => code === 'LAS');

		const result = getAvailableAirports(
			routes,
			airports,
			'departure',
			defaultCriteria({ otherSelectedAirport: 'LAS', onlyOtherWithATC: true })
		);

		const codes = result.map((a) => a.vatsim_code);
		expect(codes).toEqual(['PHX']); // PHX->LAS route passes since LAS has ATC
	});

	it('should filter by specific ATC levels on this side', () => {
		mockedHasSpecificATCLevel.mockImplementation((code) => code === 'DEN');

		const result = getAvailableAirports(
			routes,
			airports,
			'departure',
			defaultCriteria({ thisATCLevels: [ControllerPosition.TWR] })
		);

		const codes = result.map((a) => a.vatsim_code);
		expect(codes).toEqual(['DEN']);
	});

	it('should filter by specific ATC levels on other side', () => {
		mockedHasSpecificATCLevel.mockImplementation((code) => code === 'LAS');

		const result = getAvailableAirports(
			routes,
			airports,
			'departure',
			defaultCriteria({ otherSelectedAirport: 'LAS', otherATCLevels: [ControllerPosition.APP] })
		);

		// LAS has the required ATC level, so routes arriving at LAS pass
		const codes = result.map((a) => a.vatsim_code);
		expect(codes).toEqual(['PHX']);
	});

	it('should return results sorted by city name', () => {
		const result = getAvailableAirports(routes, airports, 'departure', defaultCriteria());

		const cities = result.map((a) => a.city);
		const sorted = [...cities].sort((a, b) => a.localeCompare(b));
		expect(cities).toEqual(sorted);
	});

	it('should return empty array when no routes match criteria', () => {
		const result = getAvailableAirports(
			routes,
			airports,
			'departure',
			defaultCriteria({ otherSelectedAirport: 'SFO' }) // No route goes to SFO
		);

		expect(result).toEqual([]);
	});

	it('should handle combination of otherSelectedAirport + ATC filtering', () => {
		// otherSelectedAirport=LAS, onlyThisWithATC=true, only PHX has ATC on this side
		mockedHasATCCoverage.mockImplementation((code) => code === 'PHX');

		const result = getAvailableAirports(
			routes,
			airports,
			'departure',
			defaultCriteria({ otherSelectedAirport: 'LAS', onlyThisWithATC: true })
		);

		// PHX->LAS is the only route to LAS, and PHX has ATC
		const codes = result.map((a) => a.vatsim_code);
		expect(codes).toEqual(['PHX']);
	});
});
