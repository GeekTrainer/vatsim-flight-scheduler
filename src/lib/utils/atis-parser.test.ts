import { describe, it, expect } from 'vitest';
import { parseATIS, parseWind, parseAltimeter, parseRunways, formatWind } from './atis-parser';
import type { ParsedWind } from './atis-parser';

describe('ATIS Parser', () => {
	describe('parseWind', () => {
		it('should parse standard wind', () => {
			const wind = parseWind('24016KT 10SM FEW250');
			expect(wind).toBeDefined();
			expect(wind!.direction).toBe(240);
			expect(wind!.speed).toBe(16);
			expect(wind!.gust).toBeUndefined();
			expect(wind!.calm).toBe(false);
		});

		it('should parse wind with gusts', () => {
			const wind = parseWind('24016G23KT 10SM');
			expect(wind!.direction).toBe(240);
			expect(wind!.speed).toBe(16);
			expect(wind!.gust).toBe(23);
		});

		it('should parse calm wind', () => {
			const wind = parseWind('00000KT 10SM');
			expect(wind!.calm).toBe(true);
			expect(wind!.speed).toBe(0);
		});

		it('should parse variable wind direction', () => {
			const wind = parseWind('04007KT 350V080 10SM');
			expect(wind!.direction).toBe(40);
			expect(wind!.speed).toBe(7);
			expect(wind!.variable).toEqual({ from: 350, to: 80 });
		});

		it('should parse VRB wind', () => {
			const wind = parseWind('VRB05KT 10SM');
			expect(wind!.direction).toBe('VRB');
			expect(wind!.speed).toBe(5);
		});

		it('should return undefined for no wind data', () => {
			expect(parseWind('NO WIND INFO AVAILABLE')).toBeUndefined();
		});
	});

	describe('parseAltimeter', () => {
		it('should parse standard altimeter', () => {
			expect(parseAltimeter('A2978')).toBe('29.78');
		});

		it('should parse altimeter from full ATIS', () => {
			expect(parseAltimeter('24016KT 10SM FEW250 35/12 A2990')).toBe('29.90');
		});

		it('should parse high altimeter', () => {
			expect(parseAltimeter('A3019')).toBe('30.19');
		});

		it('should return undefined for no altimeter', () => {
			expect(parseAltimeter('NO ALTIMETER DATA')).toBeUndefined();
		});
	});

	describe('parseRunways', () => {
		it('should parse ILS approach runway', () => {
			const { arrivals } = parseRunways('ILS RWY 24R APCH IN USE. DEPG RWY 24L.');
			expect(arrivals).toHaveLength(1);
			expect(arrivals[0]).toEqual({ runway: '24R', approachType: 'ILS' });
		});

		it('should parse visual approach runway', () => {
			const { arrivals } = parseRunways('VISUAL APPROACH RWY 6 IN USE.');
			expect(arrivals).toHaveLength(1);
			expect(arrivals[0]).toEqual({ runway: '6', approachType: 'Visual' });
		});

		it('should parse ILS or VIS approach', () => {
			const { arrivals } = parseRunways('ARR ACFT EXP ILS OR VIS APCH RWY 10.');
			expect(arrivals).toHaveLength(1);
			expect(arrivals[0].runway).toBe('10');
			expect(arrivals[0].approachType).toContain('ILS');
		});

		it('should parse multiple arrival runways', () => {
			const { arrivals } = parseRunways('ARRIVALS EXPECT ILS RWY 8R, RWY 9, RWY 12.');
			expect(arrivals).toHaveLength(3);
			expect(arrivals[0].runway).toBe('8R');
			expect(arrivals[1].runway).toBe('9');
			expect(arrivals[2].runway).toBe('12');
		});

		it('should preserve runway order', () => {
			const { arrivals } = parseRunways('ARRIVALS EXPECT ILS RWY 26L, RWY 8R.');
			expect(arrivals[0].runway).toBe('26L');
			expect(arrivals[1].runway).toBe('8R');
		});

		it('should parse departure runways', () => {
			const { departures } = parseRunways('DEPG RWYS 15R, 15L.');
			expect(departures).toHaveLength(2);
			expect(departures[0].runway).toBe('15R');
			expect(departures[1].runway).toBe('15L');
		});

		it('should parse departing runway', () => {
			const { departures } = parseRunways('DEPARTING RWY 25R.');
			expect(departures).toHaveLength(1);
			expect(departures[0].runway).toBe('25R');
		});

		it('should parse combined landing and departing', () => {
			const { arrivals, departures } = parseRunways('LANDING AND DEPARTING RWY 24.');
			expect(arrivals).toHaveLength(1);
			expect(arrivals[0].runway).toBe('24');
			expect(departures).toHaveLength(1);
			expect(departures[0].runway).toBe('24');
		});

		it('should parse RNAV approach', () => {
			const { arrivals } = parseRunways('RNAV RWY 14 APCH IN USE.');
			expect(arrivals).toHaveLength(1);
			expect(arrivals[0].approachType).toBe('RNAV');
		});

		it('should not include closed runways', () => {
			const { arrivals, departures } = parseRunways('RWY 19L, 1R CLSD. DEPG RY 1L.');
			expect(departures).toHaveLength(1);
			expect(departures[0].runway).toBe('1L');
			expect(arrivals).toHaveLength(0);
		});

		it('should handle real BWI ATIS', () => {
			const text = 'KBWI ATIS INFO Y 0054Z. 16003KT 5SM BR OVC013 03/01 A3019. ARR ACFT EXP ILS OR VIS APCH RWY 10, DEPG RWYS 15R, 15L.';
			const { arrivals, departures } = parseRunways(text);
			expect(arrivals.length).toBeGreaterThanOrEqual(1);
			expect(arrivals[0].runway).toBe('10');
			expect(departures.length).toBeGreaterThanOrEqual(1);
		});

		it('should handle real ATL arrival ATIS', () => {
			const text = 'ATL ARR INFO K 0052Z. 16004KT 10SM BKN250 16/04 A3015. SIMUL APCHS ARE IN PROGRESS, VISUAL APPROACH RWY 8L, VISUAL APPROACH RWY 9R.';
			const { arrivals } = parseRunways(text);
			expect(arrivals.length).toBeGreaterThanOrEqual(2);
			expect(arrivals[0].runway).toBe('8L');
			expect(arrivals[1].runway).toBe('9R');
			expect(arrivals[0].approachType).toBe('Visual');
		});

		it('should handle real ATL departure ATIS', () => {
			const text = 'ATL DEP INFO X 0052Z. 16004KT 10SM BKN250 16/04 A3015. SIMUL DEPS, DEPTG RWYS 8R, 9L.';
			const { departures } = parseRunways(text);
			expect(departures.length).toBeGreaterThanOrEqual(2);
			expect(departures[0].runway).toBe('8R');
			expect(departures[1].runway).toBe('9L');
		});

		it('should handle approach in use ILS RY pattern', () => {
			const { arrivals } = parseRunways('APPROACH IN USE ILS RY 22L. DEPG RY 22R.');
			expect(arrivals).toHaveLength(1);
			expect(arrivals[0]).toEqual({ runway: '22L', approachType: 'ILS' });
		});

		it('should parse inline approach type + runway pairs (VIS 8L, VIS 9R)', () => {
			const { arrivals } = parseRunways('SIMULTANEOUS APCHS IN USE VIS 8L, VIS 9R, VIS 10.');
			expect(arrivals).toHaveLength(3);
			expect(arrivals[0]).toEqual({ runway: '8L', approachType: 'Visual' });
			expect(arrivals[1]).toEqual({ runway: '9R', approachType: 'Visual' });
			expect(arrivals[2]).toEqual({ runway: '10', approachType: 'Visual' });
		});

		it('should parse inline ILS runway pairs (ILS 22L, ILS 22R)', () => {
			const { arrivals } = parseRunways('SIMUL APCHS IN USE ILS 22L, ILS 22R.');
			expect(arrivals).toHaveLength(2);
			expect(arrivals[0]).toEqual({ runway: '22L', approachType: 'ILS' });
			expect(arrivals[1]).toEqual({ runway: '22R', approachType: 'ILS' });
		});

		it('should return empty arrays for unparseable text', () => {
			const { arrivals, departures } = parseRunways('NOTAMS ONLY. BIRDS IN VICINITY.');
			expect(arrivals).toHaveLength(0);
			expect(departures).toHaveLength(0);
		});
	});

	describe('parseATIS (integration)', () => {
		it('should parse a full real-world ATIS', () => {
			const text = 'PHX ATIS INFO S. 24010KT 10SM FEW250 35/12 A2990. VISUAL APPROACHES IN USE. LANDING AND DEPARTING RWY 25L AND 25R.';
			const result = parseATIS(text);

			expect(result.wind).toBeDefined();
			expect(result.wind!.direction).toBe(240);
			expect(result.wind!.speed).toBe(10);
			expect(result.altimeter).toBe('29.90');
			expect(result.arrivalRunways.length).toBeGreaterThanOrEqual(1);
			expect(result.departureRunways.length).toBeGreaterThanOrEqual(1);
		});

		it('should handle empty text', () => {
			const result = parseATIS('');
			expect(result.wind).toBeUndefined();
			expect(result.altimeter).toBeUndefined();
			expect(result.arrivalRunways).toHaveLength(0);
			expect(result.departureRunways).toHaveLength(0);
		});
	});

	describe('formatWind', () => {
		it('should format calm wind', () => {
			const wind: ParsedWind = { direction: 0, speed: 0, calm: true, raw: '00000KT' };
			expect(formatWind(wind)).toBe('Calm');
		});

		it('should format standard wind', () => {
			const wind: ParsedWind = { direction: 240, speed: 16, calm: false, raw: '24016KT' };
			expect(formatWind(wind)).toBe('240° at 16kt');
		});

		it('should format gusting wind', () => {
			const wind: ParsedWind = { direction: 240, speed: 16, gust: 23, calm: false, raw: '24016G23KT' };
			expect(formatWind(wind)).toBe('240° at 16kt, gusting 23kt');
		});

		it('should format variable wind', () => {
			const wind: ParsedWind = { direction: 'VRB', speed: 5, calm: false, raw: 'VRB05KT' };
			expect(formatWind(wind)).toBe('Variable at 5kt');
		});

		it('should format wind with variable direction', () => {
			const wind: ParsedWind = { direction: 40, speed: 7, calm: false, variable: { from: 350, to: 80 }, raw: '04007KT' };
			expect(formatWind(wind)).toBe('40° at 7kt (variable 350°–80°)');
		});
	});
});
