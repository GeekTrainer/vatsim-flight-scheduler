/**
 * SimBrief OFP response types
 * Based on the JSON response from xml.fetcher.php?json=1
 */

export interface SimBriefFetchError {
	fetch: {
		userid: string;
		static_id: string;
		status: string;
		time: string;
	};
}

export interface SimBriefPlan {
	fetch: {
		userid: string;
		static_id: string;
		status: string;
		time: string;
	};
	params: {
		request_id: string;
		static_id: string;
		ofp_layout: string;
		airac: string;
		units: string;
	};
	general: {
		release: string;
		icao_airline: string;
		flight_number: string;
		is_etops: string;
		dx_rmk: string;
		sys_rmk: string;
		route: string;
		route_navigraph: string;
		route_ifps: string;
		initial_altitude: string;
		stepclimb_string: string;
		avg_temp_dev: string;
		avg_tropopause: string;
		avg_wind_comp: string;
		avg_wind_dir: string;
		avg_wind_spd: string;
		gc_distance: string;
		air_distance: string;
		total_burn: string;
		cruise_tas: string;
		cruise_mach: string;
		costindex: string;
		passengers: string;
		cargo: string;
		payload: string;
	};
	origin: {
		icao_code: string;
		iata_code: string;
		faa_code: string;
		name: string;
		plan_rwy: string;
		metar: string;
		metar_time: string;
		taf: string;
		taf_time: string;
	};
	destination: {
		icao_code: string;
		iata_code: string;
		faa_code: string;
		name: string;
		plan_rwy: string;
		metar: string;
		metar_time: string;
		taf: string;
		taf_time: string;
	};
	alternate?: {
		icao_code: string;
		iata_code: string;
		name: string;
		plan_rwy: string;
	};
	times: {
		est_time_enroute: string;
		sched_out: string;
		sched_off: string;
		sched_on: string;
		sched_in: string;
		sched_block: string;
		orig_timezone: string;
		dest_timezone: string;
	};
	fuel: {
		taxi: string;
		enroute_burn: string;
		contingency: string;
		alternate_burn: string;
		reserve: string;
		etops: string;
		extra: string;
		min_takeoff: string;
		plan_takeoff: string;
		plan_ramp: string;
		plan_landing: string;
		avg_fuel_flow: string;
		max_tanks: string;
	};
	weights: {
		oew: string;
		pax_count: string;
		pax_count_actual: string;
		bag_count: string;
		cargo: string;
		payload: string;
		est_zfw: string;
		est_tow: string;
		est_ldw: string;
		max_zfw: string;
		max_tow: string;
		max_ldw: string;
	};
	aircraft: {
		icaocode: string;
		iatacode: string;
		base_type: string;
		name: string;
		reg: string;
		selcal: string;
	};
	files: {
		directory: string;
		pdf: { name: string; link: string };
	};
	navlog: {
		fix: SimBriefNavlogFix[];
	};
	// Additional fields exist but these are the key ones
	[key: string]: unknown;
}

export interface SimBriefNavlogFix {
	ident: string;
	name: string;
	type: string;
	frequency: string;
	pos_lat: string;
	pos_long: string;
	stage: string;
	via_airway: string;
	is_sid_star: string;
	distance: string;
	track_true: string;
	track_mag: string;
	heading_true: string;
	heading_mag: string;
	altitude_feet: string;
	ind_airspeed: string;
	true_airspeed: string;
	mach: string;
	groundspeed: string;
	wind_component: string;
	wind_dir: string;
	wind_spd: string;
	oat: string;
	time_leg: string;
	time_total: string;
	fuel_flow: string;
	fuel_leg: string;
	fuel_totalused: string;
	fuel_plan_onboard: string;
}
