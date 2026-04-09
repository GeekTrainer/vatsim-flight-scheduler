import { describe, it, expect } from 'vitest';
import { parseATIS, parseWind, parseAltimeter, parseRunways, formatWind, mergeSplitAtis } from './atis-parser';
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

		it('should parse compound sentence with different approach types (ILS + VIS)', () => {
			const text = 'ILS RWY 4R APCH AND VIS APCH TO RWY 4L IN USE, DEPTG RWY 9.';
			const { arrivals, departures } = parseRunways(text);
			expect(arrivals).toHaveLength(2);
			expect(arrivals[0]).toEqual({ runway: '4R', approachType: 'ILS' });
			expect(arrivals[1]).toEqual({ runway: '4L', approachType: 'Visual' });
			expect(departures).toHaveLength(1);
			expect(departures[0].runway).toBe('9');
		});

		it('should handle real BOS ATIS with mixed approach types', () => {
			const text = 'BOSTON LOGAN AIRPORT ATIS INFORMATION B. 2154Z. 12011KT 10SM FEW250 03/M05 A3059 (THREE ZERO FIVE NINER). APCHS ARE BEING CONDUCTED TO PARALLEL RWYS. ILS RWY 4R APCH AND VIS APCH TO RWY 4L IN USE, DEPTG RWY 9. RWY 33R IS APPROVED FOR TURN OFF AFTER LDG. READBACK ALL HOLD SHORT INSTRUCTIONS AND ASSIGNED ALTITUDES. NUMEROUS CRANES IN BOSTON AREA AND IN THE VICINITY OF LOGAN AIRPORT. ...ADVS YOU HAVE INFO B';
			const { arrivals, departures } = parseRunways(text);
			expect(arrivals).toHaveLength(2);
			expect(arrivals[0]).toEqual({ runway: '4R', approachType: 'ILS' });
			expect(arrivals[1]).toEqual({ runway: '4L', approachType: 'Visual' });
			expect(departures).toHaveLength(1);
			expect(departures[0].runway).toBe('9');
		});

		it('should return empty arrays for unparseable text', () => {
			const { arrivals, departures } = parseRunways('NOTAMS ONLY. BIRDS IN VICINITY.');
			expect(arrivals).toHaveLength(0);
			expect(departures).toHaveLength(0);
		});

		it('should truncate at NOTICE TO AIRMEN and not parse NOTAM runway references', () => {
			const text = 'LANDING RWYS 26L AND 19R. DEPG RWYS 26R, 19R AND 19L. NOTICE TO AIRMEN. CHECK DENSITY ALTITUDE. RWY 1L CLSD.';
			const { arrivals, departures } = parseRunways(text);
			expect(arrivals.map(r => r.runway)).toEqual(['26L', '19R']);
			expect(departures.map(r => r.runway)).toEqual(['26R', '19R', '19L']);
		});

		it('should truncate at NOTAMS abbreviation', () => {
			const text = 'ILS APCH RWY 34L. DEPG RWY 34R. NOTAMS... RY 34C CLSD. TWY P CLSD.';
			const { arrivals, departures } = parseRunways(text);
			expect(arrivals.map(r => r.runway)).toEqual(['34L']);
			expect(departures.map(r => r.runway)).toEqual(['34R']);
		});

		it('should parse DEPS EXP RWYS pattern (KORD style)', () => {
			const text = 'ARR EXP VECTORS ILS RWY 27C APCH, VISUAL APCH RWY 27R. DEPS EXP RWYS 22L 27L FROM T T 9960 FT AVL.';
			const { arrivals, departures } = parseRunways(text);
			expect(arrivals.map(r => r.runway)).toContain('27C');
			expect(arrivals.map(r => r.runway)).toContain('27R');
			expect(departures.map(r => r.runway)).toContain('22L');
			expect(departures.map(r => r.runway)).toContain('27L');
		});

		it('should normalize FAA D-ATIS spaced runway designators (KDEN style)', () => {
			const text = 'DEPG RWY8, RUNWAY 3 4 LEFT. NOTICE TO AIRMEN.';
			const { departures } = parseRunways(text);
			expect(departures.map(r => r.runway)).toEqual(['8', '34L']);
		});

		it('should normalize both spaced LEFT and RIGHT designators', () => {
			const text = 'DEPG RWY 3 4 RIGHT, RUNWAY 3 4 LEFT.';
			const { departures } = parseRunways(text);
			expect(departures.map(r => r.runway)).toEqual(['34R', '34L']);
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

		it('should infer departure runways when only arrivals are found', () => {
			const text = 'CMH ATIS INFO D. 00000KT 1 1/2SM BR BKN005 03/03 A3010. ILS, RWY 28L, AND, ILS, RWY 28R, SIMUL APCH IN USE.';
			const result = parseATIS(text);
			expect(result.arrivalRunways).toHaveLength(2);
			expect(result.arrivalRunways[0]).toEqual({ runway: '28L', approachType: 'ILS' });
			// Departures inferred from arrivals (without approach type)
			expect(result.departureRunways).toHaveLength(2);
			expect(result.departureRunways[0]).toEqual({ runway: '28L' });
			expect(result.departureRunways[1]).toEqual({ runway: '28R' });
		});

		it('should infer arrival runways when only departures are found', () => {
			const text = 'DEP INFO N. 14004KT 10SM BKN250 A3015. DEPG RWYS 8R, 9L.';
			const result = parseATIS(text);
			expect(result.departureRunways).toHaveLength(2);
			// Arrivals inferred from departures
			expect(result.arrivalRunways).toHaveLength(2);
			expect(result.arrivalRunways[0]).toEqual({ runway: '8R' });
		});

		it('should correctly parse KDEN split ATIS - arrival side', () => {
			const arrText = 'DEN ARR INFO Z 2353Z. 05015KT 10SM SCT090 BKN150 BKN220 16/M01 A2999. EXPC ILS, RNAV, OR VISUAL APCH, SIMUL APCHS IN USE, RWY 34R, RWY 35L, RWY 35R. NOTICE TO AIRMEN. RWY 7/25 CLSD.';
			const result = parseATIS(arrText);
			// Arrival ATIS should find arrival runways with approach types
			expect(result.arrivalRunways.map(r => r.runway)).toEqual(['34R', '35L', '35R']);
			// NOTAM runways (7/25 CLSD) should NOT appear
		});

		it('should correctly parse KDEN split ATIS - departure side with spaced digits', () => {
			const depText = 'DEN DEP INFO M 2353Z. 05015KT 10SM SCT090 16/M01 A2999. DEPG RWY8, RUNWAY 3 4 LEFT. NOTICE TO AIRMEN. RWY 7/25 CLSD.';
			const result = parseATIS(depText);
			// Departure ATIS should find departure runways, normalizing "3 4 LEFT" → "34L"
			expect(result.departureRunways.map(r => r.runway)).toEqual(['8', '34L']);
		});

		it('should keep arrival and departure runways separate when both are explicit', () => {
			// Simulates a combined ATIS that has both explicit arrival and departure info
			const text = 'LAS ATIS INFO B 2356Z. 07010KT 10SM FEW140 A2979. LANDING RWYS 26L AND 19R. DEPG RWYS 26R, 19R AND 19L.';
			const result = parseATIS(text);
			expect(result.arrivalRunways.map(r => r.runway)).toEqual(['26L', '19R']);
			expect(result.departureRunways.map(r => r.runway)).toEqual(['26R', '19R', '19L']);
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

	describe('mergeSplitAtis', () => {
		const arrAtisText = 'DEN ARR INFO Z 2353Z. 05015KT 10SM SCT090 BKN150 16/M01 A2999. EXPC ILS APCH, SIMUL APCHS IN USE, RWY 34R, RWY 35L, RWY 35R. NOTICE TO AIRMEN. RWY 7/25 CLSD.';
		const depAtisText = 'DEN DEP INFO M 2353Z. 05015KT 10SM SCT090 16/M01 A2999. DEPG RWY8, RUNWAY 3 4 LEFT. NOTICE TO AIRMEN. RWY 7/25 CLSD.';

		it('should use arrival ATIS for arrival runways when primary is arrival', () => {
			const result = mergeSplitAtis(arrAtisText, 'arrival', depAtisText, 'departure');
			expect(result.arrivalRunways.map(r => r.runway)).toEqual(['34R', '35L', '35R']);
		});

		it('should use departure ATIS for departure runways when primary is arrival', () => {
			const result = mergeSplitAtis(arrAtisText, 'arrival', depAtisText, 'departure');
			expect(result.departureRunways.map(r => r.runway)).toEqual(['8', '34L']);
		});

		it('should use departure ATIS for departure runways when primary is departure', () => {
			const result = mergeSplitAtis(depAtisText, 'departure', arrAtisText, 'arrival');
			expect(result.departureRunways.map(r => r.runway)).toEqual(['8', '34L']);
		});

		it('should use arrival ATIS for arrival runways when primary is departure', () => {
			const result = mergeSplitAtis(depAtisText, 'departure', arrAtisText, 'arrival');
			expect(result.arrivalRunways.map(r => r.runway)).toEqual(['34R', '35L', '35R']);
		});

		it('should not cross-contaminate arrival runways into departures', () => {
			const result = mergeSplitAtis(arrAtisText, 'arrival', depAtisText, 'departure');
			expect(result.departureRunways.map(r => r.runway)).not.toContain('35L');
			expect(result.departureRunways.map(r => r.runway)).not.toContain('35R');
		});

		it('should not cross-contaminate departure runways into arrivals', () => {
			const result = mergeSplitAtis(depAtisText, 'departure', arrAtisText, 'arrival');
			expect(result.arrivalRunways.map(r => r.runway)).not.toContain('8');
		});

		it('should use wind and altimeter from primary ATIS', () => {
			const result = mergeSplitAtis(arrAtisText, 'arrival', depAtisText, 'departure');
			expect(result.wind?.direction).toBe(50);
			expect(result.wind?.speed).toBe(15);
			expect(result.altimeter).toBe('29.99');
		});

		it('should fall through to plain parseATIS when other is combined', () => {
			const combinedText = 'PHX ATIS INFO R. 24010KT 10SM A2990. LANDING AND DEPARTING RWY 25L AND 25R.';
			const result = mergeSplitAtis(arrAtisText, 'arrival', combinedText, 'combined');
			// Falls back to plain parse — inference fills both buckets from arrival ATIS
			expect(result.arrivalRunways.length).toBeGreaterThan(0);
			expect(result.departureRunways.length).toBeGreaterThan(0);
		});

		it('should fall through to plain parseATIS when other is null', () => {
			const result = mergeSplitAtis(arrAtisText, 'arrival', null, undefined);
			// Falls back to plain parse — inference fills departures from arrivals
			expect(result.arrivalRunways.map(r => r.runway)).toEqual(['34R', '35L', '35R']);
			expect(result.departureRunways.length).toBe(3);
		});

		it('should fall through when both texts are identical', () => {
			const result = mergeSplitAtis(arrAtisText, 'arrival', arrAtisText, 'departure');
			expect(result.arrivalRunways.map(r => r.runway)).toEqual(['34R', '35L', '35R']);
		});

		it('should exclude NOTAM runways from both sides', () => {
			const result = mergeSplitAtis(arrAtisText, 'arrival', depAtisText, 'departure');
			const allRunways = [...result.arrivalRunways, ...result.departureRunways].map(r => r.runway);
			expect(allRunways).not.toContain('7');
			expect(allRunways).not.toContain('25');
		});
	});
});
