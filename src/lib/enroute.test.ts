import { describe, it, expect } from 'vitest';
import { getArtccName, getCenterControllers, detectEnrouteCenters, getBasicEnrouteCenters } from './enroute';
import type { LocationControllers } from './types';
import { ControllerPosition } from './types/vatsim';
import { createMockController, createMockLocationControllers } from './test-utils/mock-factories';

describe('enroute', () => {
	describe('getArtccName', () => {
		it('should return full name for known ARTCC', () => {
			expect(getArtccName('ZLA')).toBe('Los Angeles Center');
			expect(getArtccName('ZDV')).toBe('Denver Center');
			expect(getArtccName('ZAB')).toBe('Albuquerque Center');
		});

		it('should return fallback name for unknown ARTCC', () => {
			expect(getArtccName('ZZZ')).toBe('ZZZ Center');
			expect(getArtccName('FAKE')).toBe('FAKE Center');
		});
	});

	describe('getCenterControllers', () => {
		it('should return controllers for a known ARTCC', () => {
			const lc = createMockLocationControllers([
				['ZLA', [[ControllerPosition.CTR, [createMockController({ callsign: 'ZLA_85_CTR', frequency: '135.650', position: ControllerPosition.CTR })]]]]
			]);
			const result = getCenterControllers('ZLA', lc);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ callsign: 'ZLA_85_CTR', frequency: '135.650' });
		});

		it('should return empty array for ARTCC with no controllers', () => {
			const lc: LocationControllers = new Map();
			expect(getCenterControllers('ZLA', lc)).toEqual([]);
		});

		it('should return multiple controllers', () => {
			const lc = createMockLocationControllers([
				['ZDV', [[ControllerPosition.CTR, [
					createMockController({ callsign: 'ZDV_35_CTR', frequency: '132.450', position: ControllerPosition.CTR }),
					createMockController({ callsign: 'ZDV_90_CTR', frequency: '128.300', position: ControllerPosition.CTR })
				]]]]
			]);
			const result = getCenterControllers('ZDV', lc);
			expect(result).toHaveLength(2);
		});
	});

	describe('getBasicEnrouteCenters', () => {
		it('should return departure and arrival ARTCCs', () => {
			const lc: LocationControllers = new Map();
			const result = getBasicEnrouteCenters('ZLA', 'ZDV', lc);
			expect(result).toHaveLength(2);
			expect(result[0].artcc).toBe('ZLA');
			expect(result[1].artcc).toBe('ZDV');
		});

		it('should not duplicate when departure and arrival are same ARTCC', () => {
			const lc: LocationControllers = new Map();
			const result = getBasicEnrouteCenters('ZLA', 'ZLA', lc);
			expect(result).toHaveLength(1);
			expect(result[0].artcc).toBe('ZLA');
		});

		it('should mark centers as online when controllers exist', () => {
			const lc = createMockLocationControllers([
				['ZLA', [[ControllerPosition.CTR, [createMockController({ callsign: 'ZLA_85_CTR', frequency: '135.650', position: ControllerPosition.CTR })]]]]
			]);
			const result = getBasicEnrouteCenters('ZLA', 'ZDV', lc);
			expect(result[0].online).toBe(true);
			expect(result[0].controllerCount).toBe(1);
			expect(result[1].online).toBe(false);
			expect(result[1].controllerCount).toBe(0);
		});
	});

	describe('detectEnrouteCenters', () => {
		it('should always include departure ARTCC first', () => {
			const lc: LocationControllers = new Map();
			const result = detectEnrouteCenters([], 'ZLA', 'ZDV', lc);
			expect(result[0].artcc).toBe('ZLA');
		});

		it('should include arrival ARTCC at end', () => {
			const lc: LocationControllers = new Map();
			const result = detectEnrouteCenters([], 'ZLA', 'ZDV', lc);
			expect(result[result.length - 1].artcc).toBe('ZDV');
		});

		it('should not duplicate departure ARTCC if waypoints are in same center', () => {
			const lc: LocationControllers = new Map();
			// Waypoint near LA center
			const fixes = [
				{ pos_lat: '34.0', pos_long: '-117.0', ident: 'FIX1', name: 'Test', type: 'wpt', frequency: '', via_airway: '', is_sid_star: '0' }
			];
			const result = detectEnrouteCenters(fixes, 'ZLA', 'ZDV', lc);
			const zlaCount = result.filter(c => c.artcc === 'ZLA').length;
			expect(zlaCount).toBe(1);
		});

		it('should detect intermediate centers from waypoints', () => {
			const lc: LocationControllers = new Map();
			// Waypoints: LA area → Albuquerque area → Denver area
			const fixes = [
				{ pos_lat: '34.0', pos_long: '-117.0', ident: 'FIX1', name: '', type: 'wpt', frequency: '', via_airway: '', is_sid_star: '0' },
				{ pos_lat: '33.5', pos_long: '-109.0', ident: 'FIX2', name: '', type: 'wpt', frequency: '', via_airway: '', is_sid_star: '0' },
				{ pos_lat: '39.5', pos_long: '-105.0', ident: 'FIX3', name: '', type: 'wpt', frequency: '', via_airway: '', is_sid_star: '0' },
			];
			const result = detectEnrouteCenters(fixes, 'ZLA', 'ZDV', lc);
			const artccs = result.map(c => c.artcc);
			expect(artccs).toContain('ZAB');
		});

		it('should skip waypoints with invalid coordinates', () => {
			const lc: LocationControllers = new Map();
			const fixes = [
				{ pos_lat: 'invalid', pos_long: 'bad', ident: 'BAD', name: '', type: 'wpt', frequency: '', via_airway: '', is_sid_star: '0' },
			];
			const result = detectEnrouteCenters(fixes, 'ZLA', 'ZDV', lc);
			// Should still have at least dep and arr
			expect(result.length).toBeGreaterThanOrEqual(2);
			expect(result[0].artcc).toBe('ZLA');
		});

		it('should include controller counts for detected centers', () => {
			const lc = createMockLocationControllers([
				['ZLA', [[ControllerPosition.CTR, [createMockController({ callsign: 'ZLA_85_CTR', frequency: '135.650', position: ControllerPosition.CTR })]]]],
				['ZAB', [[ControllerPosition.CTR, [createMockController({ callsign: 'ZAB_CTR', frequency: '132.200', position: ControllerPosition.CTR }), createMockController({ callsign: 'ZAB_25_CTR', frequency: '128.100', position: ControllerPosition.CTR })]]]]
			]);
			const fixes = [
				{ pos_lat: '33.5', pos_long: '-109.0', ident: 'ABQ', name: '', type: 'wpt', frequency: '', via_airway: '', is_sid_star: '0' },
			];
			const result = detectEnrouteCenters(fixes, 'ZLA', 'ZDV', lc);
			const zla = result.find(c => c.artcc === 'ZLA');
			const zab = result.find(c => c.artcc === 'ZAB');
			expect(zla?.controllerCount).toBe(1);
			expect(zla?.online).toBe(true);
			expect(zab?.controllerCount).toBe(2);
			expect(zab?.online).toBe(true);
		});
	});
});
