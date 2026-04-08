export interface VatsimController {
	cid: number;
	name: string;
	callsign: string;
	frequency: string;
	facility: number;
	rating: number;
	server: string;
	visual_range: number;
	text_atis?: string[];
	last_updated: string;
	logon_time: string;
}

export interface VatsimGeneral {
	version: number;
	reload: number;
	update: string;
	update_timestamp: string;
	connected_clients: number;
	unique_users: number;
}

export interface VatsimATIS {
	cid: number;
	name: string;
	callsign: string;
	frequency: string;
	facility: number;
	atis_code: string;
	text_atis: string[];
	last_updated: string;
	logon_time: string;
}

export interface VatsimFlightPlan {
	flight_rules: string;
	aircraft: string;
	aircraft_faa: string;
	aircraft_short: string;
	departure: string;
	arrival: string;
	alternate: string;
	cruise_tas: string;
	altitude: string;
	deptime: string;
	enroute_time: string;
	fuel_time: string;
	remarks: string;
	route: string;
}

export interface VatsimPilot {
	cid: number;
	name: string;
	callsign: string;
	server: string;
	pilot_rating: number;
	latitude: number;
	longitude: number;
	altitude: number;
	groundspeed: number;
	transponder: string;
	heading: number;
	qnh_i_hg: number;
	qnh_mb: number;
	flight_plan: VatsimFlightPlan | null;
	logon_time: string;
	last_updated: string;
}

export interface VatsimPrefile {
	cid: number;
	name: string;
	callsign: string;
	flight_plan: VatsimFlightPlan | null;
	last_updated: string;
}

export interface VatsimData {
	general: VatsimGeneral;
	pilots: VatsimPilot[];
	controllers: VatsimController[];
	atis: VatsimATIS[];
	servers: unknown[];
	prefiles: VatsimPrefile[];
	facilities: unknown[];
	ratings: unknown[];
	pilot_ratings: unknown[];
	military_ratings: unknown[];
}

export enum ControllerPosition {
	DEL = 'DEL',
	GND = 'GND',
	TWR = 'TWR',
	APP = 'APP',
	CTR = 'CTR'
}

export interface ATCController {
	callsign: string;
	name: string;
	frequency: string;
	onlineTimeMinutes: number;
	position: ControllerPosition;
}

