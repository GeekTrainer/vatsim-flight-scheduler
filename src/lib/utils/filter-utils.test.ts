import { describe, it, expect } from 'vitest';
import { hasActiveFilters } from '$lib/utils/filter-utils';
import { ControllerPosition } from '$lib/types/vatsim';

describe('hasActiveFilters', () => {
	it('should return false for empty object', () => {
		expect(hasActiveFilters({})).toBe(false);
	});

	it('should return false when all values are falsy', () => {
		expect(
			hasActiveFilters({
				selectedDeparture: null,
				selectedArrival: null,
				onlyDepartureWithATC: false,
				onlyArrivalWithATC: false,
				departureATCLevels: [],
				arrivalATCLevels: [],
				minFlightTime: null,
				maxFlightTime: null
			})
		).toBe(false);
	});

	it('should return true when selectedDeparture is set', () => {
		expect(hasActiveFilters({ selectedDeparture: 'PHX' })).toBe(true);
	});

	it('should return true when selectedArrival is set', () => {
		expect(hasActiveFilters({ selectedArrival: 'LAS' })).toBe(true);
	});

	it('should return true when onlyDepartureWithATC is true', () => {
		expect(hasActiveFilters({ onlyDepartureWithATC: true })).toBe(true);
	});

	it('should return true when onlyArrivalWithATC is true', () => {
		expect(hasActiveFilters({ onlyArrivalWithATC: true })).toBe(true);
	});

	it('should return true when departureATCLevels has items', () => {
		expect(hasActiveFilters({ departureATCLevels: [ControllerPosition.TWR] })).toBe(true);
	});

	it('should return true when arrivalATCLevels has items', () => {
		expect(
			hasActiveFilters({ arrivalATCLevels: [ControllerPosition.APP, ControllerPosition.CTR] })
		).toBe(true);
	});

	it('should return true when minFlightTime is set (including 0)', () => {
		expect(hasActiveFilters({ minFlightTime: 0 })).toBe(true);
		expect(hasActiveFilters({ minFlightTime: 60 })).toBe(true);
	});

	it('should return true when maxFlightTime is set (including 0)', () => {
		expect(hasActiveFilters({ maxFlightTime: 0 })).toBe(true);
		expect(hasActiveFilters({ maxFlightTime: 180 })).toBe(true);
	});

	it('should return false when ATCLevels arrays are empty', () => {
		expect(
			hasActiveFilters({
				departureATCLevels: [],
				arrivalATCLevels: []
			})
		).toBe(false);
	});

	it('should return true when multiple filters active simultaneously', () => {
		expect(
			hasActiveFilters({
				selectedDeparture: 'PHX',
				onlyArrivalWithATC: true,
				departureATCLevels: [ControllerPosition.TWR],
				maxFlightTime: 120
			})
		).toBe(true);
	});
});
