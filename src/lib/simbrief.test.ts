import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	buildDispatchUrl,
	fetchSimBriefPlan,
	validatePlanMatchesRoute,
	formatFlightTime,
	formatFuel,
	formatAltitude,
	buildVatsimPrefileUrl,
	checkVatsimFlightStatus
} from './simbrief';
import type { SimBriefPlan } from './types/simbrief';

global.fetch = vi.fn();

// Minimal mock plan for testing
const mockPlan: SimBriefPlan = {
	fetch: { userid: '123', static_id: '456', status: 'Success', time: '0.1' },
	params: { request_id: '1', static_id: '456', ofp_layout: 'LIDO', airac: '2413', units: 'LBS' },
	general: {
		release: '1', icao_airline: 'SWA', flight_number: '1234', is_etops: '0',
		dx_rmk: '', sys_rmk: '', route: 'PXR J80 TBC', route_navigraph: 'PXR J80 TBC',
		route_ifps: '', initial_altitude: '35000', stepclimb_string: '',
		avg_temp_dev: '0', avg_tropopause: '36000', avg_wind_comp: '-15',
		avg_wind_dir: '270', avg_wind_spd: '25', gc_distance: '236', air_distance: '256',
		total_burn: '5200', cruise_tas: '450', cruise_mach: '0.78', costindex: '25',
		passengers: '145', cargo: '200', payload: '30000'
	},
	origin: {
		icao_code: 'KPHX', iata_code: 'PHX', faa_code: 'PHX', name: 'Phoenix Sky Harbor',
		plan_rwy: '25R', metar: '', metar_time: '', taf: '', taf_time: ''
	},
	destination: {
		icao_code: 'KLAS', iata_code: 'LAS', faa_code: 'LAS', name: 'Harry Reid Intl',
		plan_rwy: '26L', metar: '', metar_time: '', taf: '', taf_time: ''
	},
	alternate: {
		icao_code: 'KLAX', iata_code: 'LAX', name: 'Los Angeles Intl', plan_rwy: '25L'
	},
	times: {
		est_time_enroute: '3120', sched_out: '1400', sched_off: '1410',
		sched_on: '1502', sched_in: '1510', sched_block: '70',
		orig_timezone: '-7', dest_timezone: '-8'
	},
	fuel: {
		taxi: '400', enroute_burn: '5200', contingency: '260', alternate_burn: '3200',
		reserve: '1100', etops: '0', extra: '500', min_takeoff: '10260',
		plan_takeoff: '10760', plan_ramp: '11160', plan_landing: '5560',
		avg_fuel_flow: '2600', max_tanks: '20000'
	},
	weights: {
		oew: '41000', pax_count: '145', pax_count_actual: '145', bag_count: '145',
		cargo: '200', payload: '30000', est_zfw: '71000', est_tow: '82160',
		est_ldw: '76560', max_zfw: '78000', max_tow: '85000', max_ldw: '80000'
	},
	aircraft: {
		icaocode: 'B738', iatacode: '738', base_type: 'B738',
		name: 'Boeing 737-800', reg: 'N8301J', selcal: ''
	},
	files: {
		directory: '/files/',
		pdf: { name: 'ofp.pdf', link: 'https://www.simbrief.com/ofp/flightplans/pdf/123.pdf' }
	},
	navlog: { fix: [] }
};

describe('SimBrief Service', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('buildDispatchUrl', () => {
		it('should build URL with origin and destination', () => {
			const url = buildDispatchUrl('KPHX', 'KLAS', 'https://example.com/callback');
			expect(url).toContain('https://www.simbrief.com/system/dispatch.php?');
			expect(url).toContain('orig=KPHX');
			expect(url).toContain('dest=KLAS');
			expect(url).toContain('airline=SWA');
			expect(url).toContain('units=LBS');
		});

		it('should include a random flight number', () => {
			const url = buildDispatchUrl('KPHX', 'KLAS', 'https://example.com/callback');
			const match = url.match(/fltnum=(\d+)/);
			expect(match).toBeTruthy();
			const fltnum = parseInt(match![1], 10);
			expect(fltnum).toBeGreaterThanOrEqual(1000);
			expect(fltnum).toBeLessThan(10000);
		});
	});

	describe('fetchSimBriefPlan', () => {
		it('should fetch and return a valid plan', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockPlan)
			});

			const result = await fetchSimBriefPlan('testuser');
			expect(result).toBeTruthy();
			expect(result!.general.route).toBe('PXR J80 TBC');
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('username=testuser&json=1')
			);
		});

		it('should return null for error response', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					fetch: { status: 'Error: Unknown UserID' }
				})
			});

			const result = await fetchSimBriefPlan('baduser');
			expect(result).toBeNull();
		});

		it('should return null for empty plan', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ fetch: { status: 'Success' } })
			});

			const result = await fetchSimBriefPlan('noplan');
			expect(result).toBeNull();
		});

		it('should return null on network error', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

			const result = await fetchSimBriefPlan('testuser');
			expect(result).toBeNull();
		});

		it('should return null on non-ok response', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

			const result = await fetchSimBriefPlan('testuser');
			expect(result).toBeNull();
		});
	});

	describe('validatePlanMatchesRoute', () => {
		it('should return true for matching route', () => {
			expect(validatePlanMatchesRoute(mockPlan, 'KPHX', 'KLAS')).toBe(true);
		});

		it('should return false for mismatched departure', () => {
			expect(validatePlanMatchesRoute(mockPlan, 'KJFK', 'KLAS')).toBe(false);
		});

		it('should return false for mismatched arrival', () => {
			expect(validatePlanMatchesRoute(mockPlan, 'KPHX', 'KLAX')).toBe(false);
		});
	});

	describe('formatFlightTime', () => {
		it('should format seconds to hours and minutes', () => {
			expect(formatFlightTime('3120')).toBe('0h 52m');
		});

		it('should handle multi-hour flights', () => {
			expect(formatFlightTime('7200')).toBe('2h 00m');
		});

		it('should handle numeric input', () => {
			expect(formatFlightTime(5400)).toBe('1h 30m');
		});

		it('should return dash for invalid input', () => {
			expect(formatFlightTime('abc')).toBe('—');
		});
	});

	describe('formatFuel', () => {
		it('should format with commas and lbs', () => {
			expect(formatFuel('11160')).toBe('11,160 lbs');
		});

		it('should handle numeric input', () => {
			expect(formatFuel(5200)).toBe('5,200 lbs');
		});

		it('should return dash for invalid input', () => {
			expect(formatFuel('abc')).toBe('—');
		});
	});

	describe('formatAltitude', () => {
		it('should format as flight level for high altitudes', () => {
			expect(formatAltitude('35000')).toBe('FL350');
		});

		it('should format as feet for low altitudes', () => {
			expect(formatAltitude('5000')).toBe('5,000 ft');
		});

		it('should handle FL180 boundary', () => {
			expect(formatAltitude('18000')).toBe('FL180');
		});

		it('should return dash for invalid input', () => {
			expect(formatAltitude('abc')).toBe('—');
		});
	});

	describe('buildVatsimPrefileUrl', () => {
		it('should build URL with plan data', () => {
			const url = buildVatsimPrefileUrl(mockPlan);
			expect(url).toContain('https://my.vatsim.net/pilots/flightplan?');
			expect(url).toContain('callsign=SWA1234');
			expect(url).toContain('from=KPHX');
			expect(url).toContain('to=KLAS');
			expect(url).toContain('route=PXR+J80+TBC');
			expect(url).toContain('aircraft=B738');
		});

		it('should include alternate when present', () => {
			const url = buildVatsimPrefileUrl(mockPlan);
			expect(url).toContain('alternate=KLAX');
		});

		it('should omit alternate when not present', () => {
			const planNoAlt = { ...mockPlan, alternate: undefined };
			const url = buildVatsimPrefileUrl(planNoAlt);
			expect(url).not.toContain('alternate');
		});
	});

	describe('checkVatsimFlightStatus', () => {
		it('should return connected when CID is in pilots', () => {
			const data = { pilots: [{ cid: 1234567 }], prefiles: [] };
			expect(checkVatsimFlightStatus(data, '1234567')).toBe('connected');
		});

		it('should return prefiled when CID is in prefiles', () => {
			const data = { pilots: [], prefiles: [{ cid: 1234567 }] };
			expect(checkVatsimFlightStatus(data, '1234567')).toBe('prefiled');
		});

		it('should return not-filed when CID is not found', () => {
			const data = { pilots: [], prefiles: [] };
			expect(checkVatsimFlightStatus(data, '1234567')).toBe('not-filed');
		});

		it('should prefer connected over prefiled', () => {
			const data = { pilots: [{ cid: 1234567 }], prefiles: [{ cid: 1234567 }] };
			expect(checkVatsimFlightStatus(data, '1234567')).toBe('connected');
		});

		it('should return not-filed for invalid CID', () => {
			const data = { pilots: [{ cid: 1234567 }], prefiles: [] };
			expect(checkVatsimFlightStatus(data, 'abc')).toBe('not-filed');
		});

		it('should return not-filed for empty CID', () => {
			const data = { pilots: [], prefiles: [] };
			expect(checkVatsimFlightStatus(data, '')).toBe('not-filed');
		});

		it('should not match different CIDs', () => {
			const data = { pilots: [{ cid: 9999999 }], prefiles: [{ cid: 8888888 }] };
			expect(checkVatsimFlightStatus(data, '1234567')).toBe('not-filed');
		});
	});
});
