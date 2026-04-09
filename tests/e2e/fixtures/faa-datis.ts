/**
 * Mock FAA D-ATIS data fixtures for E2E testing
 */
export const mockFaaDatisPhx = [
	{
		airport: 'KPHX',
		type: 'combined',
		code: 'R',
		datis: 'PHX ATIS INFO R 2350Z. 24010KT 10SM FEW250 35/12 A2990. VISUAL APPROACHES IN USE. LANDING AND DEPARTING RWY 25L AND 25R. ADVS YOU HAVE INFO R.'
	}
];

export const mockFaaDatisLas = [
	{
		airport: 'KLAS',
		type: 'combined',
		code: 'B',
		datis: 'LAS ATIS INFO B 2345Z. 21008KT 10SM CLR 30/08 A2985. ILS APPROACHES IN USE. LANDING RWY 26L AND 26R. ADVS YOU HAVE INFO B.'
	}
];

/**
 * Mock FAA D-ATIS for KDEN — split arrival/departure ATIS
 * Tests spaced runway designators ("RUNWAY 3 4 LEFT" → 34L) and NOTAM cutoff
 */
export const mockFaaDatisDen = [
	{
		airport: 'KDEN',
		type: 'arr',
		code: 'Z',
		datis: 'DEN ARR INFO Z 2353Z. 05015KT 10SM SCT090 BKN150 BKN220 16/M01 A2999 (TWO NINER NINER NINER). EXPC ILS, RNAV, OR VISUAL APCH, SIMUL APCHS IN USE, RWY 34R, RWY 35L, RWY 35R. NOTICE TO AIRMEN. RWY 7/25 CLSD. RWY 26 PAPI OTS. BIRD ACTIVITY VICINITY ARPT. ...ADVS YOU HAVE INFO Z.'
	},
	{
		airport: 'KDEN',
		type: 'dep',
		code: 'M',
		datis: 'DEN DEP INFO M 2353Z. 05015KT 10SM SCT090 BKN150 BKN220 16/M01 A2999 (TWO NINER NINER NINER). DEPG RWY8, RUNWAY 3 4 LEFT. NOTICE TO AIRMEN. RWY 7/25 CLSD. BIRD ACTIVITY VICINITY ARPT. ...ADVS YOU HAVE INFO M.'
	}
];
