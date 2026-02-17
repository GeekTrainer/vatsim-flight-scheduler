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

export interface VatsimData {
	general: VatsimGeneral;
	pilots: any[];
	controllers: VatsimController[];
	atis: VatsimATIS[];
	servers: any[];
	prefiles: any[];
	facilities: any[];
	ratings: any[];
	pilot_ratings: any[];
	military_ratings: any[];
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

