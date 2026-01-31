import { describe, it, expect } from 'vitest';
import { extractController } from './controller-parser';
import { ControllerPosition } from '$lib/types/vatsim';

describe('controller-parser', () => {
	describe('extractController', () => {
		describe('facility type mapping', () => {
			it('should map all facility types to correct positions', () => {
				expect(extractController('ABQ_DEL', 2)?.position).toBe(ControllerPosition.DEL);
				expect(extractController('ABQ_GND', 3)?.position).toBe(ControllerPosition.GND);
				expect(extractController('ABQ_TWR', 4)?.position).toBe(ControllerPosition.TWR);
				expect(extractController('ABQ_APP', 5)?.position).toBe(ControllerPosition.APP);
				expect(extractController('ZAB_CTR', 6)?.position).toBe(ControllerPosition.CTR);
			});

			it('should return null for invalid facility types', () => {
				expect(extractController('ABQ_TWR', 1)).toBeNull(); // Observer
				expect(extractController('ABQ_TWR', 99)).toBeNull(); // Unknown
			});
		});

		describe('consolidated TRACON handling', () => {
			it('should handle consolidated TRACON facilities (SOCAL, N90)', () => {
				// Test SOCAL
				const socal = extractController('SOCAL_APP', 5);
				expect(socal?.isConsolidated).toBe(true);
				expect(socal?.coveredAirports).toContain('KLAX');
				expect(socal?.coveredAirports).toContain('KSAN');

				// Test N90 (NYC area)
				const n90 = extractController('N90_APP', 5);
				expect(n90?.isConsolidated).toBe(true);
				expect(n90?.coveredAirports).toContain('KJFK');
				expect(n90?.coveredAirports).toContain('KLGA');
			});

			it('should not mark non-consolidated APP as consolidated', () => {
				const result = extractController('PHX_APP', 5);
				expect(result?.isConsolidated).toBeUndefined();
				expect(result?.coveredAirports).toBeUndefined();
			});
		});

		describe('ARTCC extraction for CTR controllers', () => {
			it('should extract ARTCC codes from center callsigns', () => {
				expect(extractController('ZLA_CTR', 6)?.icao).toBe('ZLA');
				expect(extractController('ZSE_CTR', 6)?.icao).toBe('ZSE');
			});

			it('should handle numbered center positions', () => {
				expect(extractController('ZSE_12_CTR', 6)?.icao).toBe('ZSE');
				expect(extractController('ZLA_161_CTR', 6)?.icao).toBe('ZLA');
			});

			it('should return null for invalid ARTCC codes', () => {
				expect(extractController('XXX_CTR', 6)).toBeNull();
			});
		});

		describe('airport code matching', () => {
			it('should match airports by VATSIM code and ICAO code', () => {
				expect(extractController('ABQ_TWR', 4)?.icao).toBe('KABQ');
				expect(extractController('KABQ_TWR', 4)?.icao).toBe('KABQ');
				expect(extractController('BOS_TWR', 4)?.icao).toBe('KBOS');
			});

			it('should return null for unknown airport codes', () => {
				expect(extractController('UNKNOWN_TWR', 4)).toBeNull();
			});
		});

		describe('edge cases', () => {
			it('should return null for malformed callsigns', () => {
				expect(extractController('ABQTWR', 4)).toBeNull(); // No underscore
				expect(extractController('ABQ', 4)).toBeNull(); // Single part
				expect(extractController('', 4)).toBeNull(); // Empty
			});

			it('should handle complex callsigns with multiple underscores', () => {
				const result = extractController('BOS_N_TWR', 4);
				expect(result?.icao).toBe('KBOS');
			});

			it('should be case-sensitive for callsigns', () => {
				expect(extractController('abq_twr', 4)).toBeNull();
			});
		});
	});
});
