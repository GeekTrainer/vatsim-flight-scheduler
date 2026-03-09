/**
 * Mock SimBrief plan data for E2E tests.
 * Contains plans with short and long routes to test RouteDisplay component.
 *
 * Structure matches SimBriefPlan from src/lib/types/simbrief.ts
 */

const basePlan = {
	fetch: { userid: '12345', static_id: '67890', status: 'Success', time: '0.1' },
	params: { request_id: '1', static_id: '67890', ofp_layout: 'LIDO', airac: '2413', units: 'LBS' },
	general: {
		release: '1', icao_airline: 'SWA', flight_number: '1234',
		is_etops: '0', dx_rmk: '', sys_rmk: '',
		route: 'PXR J80 TBC',
		route_navigraph: '', route_ifps: '',
		initial_altitude: '35000', stepclimb_string: '',
		avg_temp_dev: 'ISA', avg_tropopause: '36000',
		avg_wind_comp: '-25', avg_wind_dir: '270', avg_wind_spd: '35',
		gc_distance: '256', air_distance: '270', total_burn: '4500',
		cruise_tas: '450', cruise_mach: '0.78', costindex: '25',
		passengers: '160', cargo: '500', payload: '30000'
	},
	origin: {
		icao_code: 'KPHX', iata_code: 'PHX', faa_code: 'PHX',
		name: 'Phoenix Sky Harbor Intl', plan_rwy: '25R',
		metar: '', metar_time: '', taf: '', taf_time: ''
	},
	destination: {
		icao_code: 'KLAS', iata_code: 'LAS', faa_code: 'LAS',
		name: 'Harry Reid Intl', plan_rwy: '26L',
		metar: '', metar_time: '', taf: '', taf_time: ''
	},
	times: {
		est_time_enroute: '4500', sched_out: '1200', sched_off: '1210',
		sched_on: '1320', sched_in: '1330', sched_block: '4800',
		orig_timezone: '-0700', dest_timezone: '-0700'
	},
	fuel: {
		taxi: '200', enroute_burn: '4500', contingency: '250',
		alternate_burn: '1200', reserve: '600', etops: '0',
		extra: '0', min_takeoff: '6550', plan_takeoff: '6800',
		plan_ramp: '7000', plan_landing: '2300', avg_fuel_flow: '5200', max_tanks: '20000'
	},
	weights: {
		oew: '91300', pax_count: '160', pax_count_actual: '160',
		bag_count: '160', cargo: '500', payload: '30000',
		est_zfw: '121300', est_tow: '128100', est_ldw: '123600',
		max_zfw: '138300', max_tow: '174200', max_ldw: '146300'
	},
	aircraft: {
		icaocode: 'B738', iatacode: '738', base_type: 'B738',
		name: 'Boeing 737-800', reg: 'N8301J', selcal: 'ABCD'
	},
	files: {
		directory: 'https://www.simbrief.com/ofp/flightplans/',
		pdf: { name: 'test.pdf', link: 'https://example.com/test.pdf' }
	},
	navlog: { fix: [] }
};

/** Short route plan (3 tokens) - should display fully */
export const mockSimBriefShortRoute = {
	...basePlan,
	general: { ...basePlan.general, route: 'PXR J80 TBC' }
};

/** Long route plan (15 tokens) - should be abbreviated */
export const mockSimBriefLongRoute = {
	...basePlan,
	general: {
		...basePlan.general,
		route: 'FORPE4 KOOLY DCT BROAK J80 TROIT DCT KAYNO V394 EMMIE DCT SUNSS J6 PRFUM KEPEC3 SUNOL MMARS'
	}
};

/** Matching plan for KPHX→KLAS (same as basePlan, exported for load tests) */
export const mockSimBriefMatchingPlan = { ...basePlan };

/** Mismatched plan — origin/destination don't match KPHX→KLAS route */
export const mockSimBriefMismatchedPlan = {
	...basePlan,
	origin: {
		...basePlan.origin,
		icao_code: 'KJFK', iata_code: 'JFK', faa_code: 'JFK',
		name: 'John F Kennedy Intl'
	},
	destination: {
		...basePlan.destination,
		icao_code: 'KLAX', iata_code: 'LAX', faa_code: 'LAX',
		name: 'Los Angeles Intl'
	},
	general: {
		...basePlan.general,
		route: 'GREKI J60 BRISS J584 HOGGS'
	}
};
