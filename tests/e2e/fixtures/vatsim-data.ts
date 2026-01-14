/**
 * Mock VATSIM API data fixtures for E2E testing
 * Prevents hitting VATSIM API rate limits during tests
 */

export const mockVatsimDataEmpty = {
	general: {
		version: 3,
		reload: 1,
		update: '2026-01-13T23:50:00.0000000Z',
		update_timestamp: '2026-01-13T23:50:00.0000000Z',
		connected_clients: 0,
		unique_users: 0
	},
	pilots: [],
	controllers: [],
	atis: [],
	servers: [],
	prefiles: [],
	facilities: [],
	ratings: [],
	pilot_ratings: []
};

export const mockVatsimDataWithControllers = {
	general: {
		version: 3,
		reload: 1,
		update: '2026-01-13T23:50:00.0000000Z',
		update_timestamp: '2026-01-13T23:50:00.0000000Z',
		connected_clients: 8,
		unique_users: 8
	},
	pilots: [],
	controllers: [
		// Phoenix Tower
		{
			cid: 1234567,
			name: 'Test Controller 1',
			callsign: 'PHX_TWR',
			frequency: '118.700',
			facility: 4, // Tower
			rating: 5,
			server: 'USA-EAST',
			visual_range: 100,
			text_atis: null,
			last_updated: '2026-01-13T23:30:00.0000000Z',
			logon_time: '2026-01-13T23:00:00.0000000Z'
		},
		// Phoenix Ground
		{
			cid: 1234568,
			name: 'Test Controller 2',
			callsign: 'PHX_GND',
			frequency: '121.900',
			facility: 3, // Ground
			rating: 5,
			server: 'USA-EAST',
			visual_range: 100,
			text_atis: null,
			last_updated: '2026-01-13T23:30:00.0000000Z',
			logon_time: '2026-01-13T23:00:00.0000000Z'
		},
		// Las Vegas Tower
		{
			cid: 1234569,
			name: 'Test Controller 3',
			callsign: 'LAS_TWR',
			frequency: '119.900',
			facility: 4, // Tower
			rating: 5,
			server: 'USA-WEST',
			visual_range: 100,
			text_atis: null,
			last_updated: '2026-01-13T23:30:00.0000000Z',
			logon_time: '2026-01-13T23:00:00.0000000Z'
		},
		// Seattle Tower
		{
			cid: 1234570,
			name: 'Test Controller 4',
			callsign: 'SEA_TWR',
			frequency: '120.600',
			facility: 4, // Tower
			rating: 5,
			server: 'USA-WEST',
			visual_range: 100,
			text_atis: null,
			last_updated: '2026-01-13T23:30:00.0000000Z',
			logon_time: '2026-01-13T23:00:00.0000000Z'
		},
		// Los Angeles Center
		{
			cid: 1234571,
			name: 'Test Controller 5',
			callsign: 'ZLA_85_CTR',
			frequency: '135.650',
			facility: 6, // Center
			rating: 7,
			server: 'USA-WEST',
			visual_range: 1500,
			text_atis: null,
			last_updated: '2026-01-13T23:30:00.0000000Z',
			logon_time: '2026-01-13T23:00:00.0000000Z'
		},
		// SOCAL Approach
		{
			cid: 1234572,
			name: 'Test Controller 6',
			callsign: 'SOCAL_APP',
			frequency: '124.300',
			facility: 5, // Approach
			rating: 7,
			server: 'USA-WEST',
			visual_range: 250,
			text_atis: null,
			last_updated: '2026-01-13T23:30:00.0000000Z',
			logon_time: '2026-01-13T23:00:00.0000000Z'
		},
		// Baltimore Delivery
		{
			cid: 1234573,
			name: 'Test Controller 7',
			callsign: 'BWI_DEL',
			frequency: '128.050',
			facility: 2, // Delivery
			rating: 3,
			server: 'USA-EAST',
			visual_range: 100,
			text_atis: null,
			last_updated: '2026-01-13T23:30:00.0000000Z',
			logon_time: '2026-01-13T23:00:00.0000000Z'
		},
		// Denver Ground
		{
			cid: 1234574,
			name: 'Test Controller 8',
			callsign: 'DEN_GND',
			frequency: '121.850',
			facility: 3, // Ground
			rating: 5,
			server: 'USA-CENTRAL',
			visual_range: 100,
			text_atis: null,
			last_updated: '2026-01-13T23:30:00.0000000Z',
			logon_time: '2026-01-13T23:00:00.0000000Z'
		}
	],
	atis: [],
	servers: [],
	prefiles: [],
	facilities: [],
	ratings: [],
	pilot_ratings: []
};
