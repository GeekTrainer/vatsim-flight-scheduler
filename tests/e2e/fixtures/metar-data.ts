/**
 * Mock NOAA METAR data fixture for E2E testing
 * Used for airports where FAA D-ATIS is unavailable (e.g., KEUG)
 */
export const mockMetarKeug = [
	{
		icaoId: 'KEUG',
		rawOb: 'METAR KEUG 100054Z 20008KT 10SM SCT090 BKN110 BKN200 19/11 A2989 RMK AO2',
		reportTime: '2026-04-10T01:00:00.000Z',
		temp: 18.9,
		dewp: 10.6,
		wdir: 200,
		wspd: 8,
		visib: '10+',
		altim: 1012.3,
		fltCat: 'VFR',
		clouds: [
			{ cover: 'SCT', base: 9000 },
			{ cover: 'BKN', base: 11000 },
			{ cover: 'BKN', base: 20000 }
		],
		name: 'Eugene/Mahlon Sweet Fld, OR, US'
	}
];

export const mockMetarEmpty: never[] = [];
