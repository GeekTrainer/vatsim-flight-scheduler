import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let fetchMETAR: typeof import('./metar').fetchMETAR;
let getCachedFlightCategory: typeof import('./metar').getCachedFlightCategory;

global.fetch = vi.fn();

function mockFetchOk(data: unknown) {
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		status: 200,
		json: async () => data,
	});
}

function mockFetch204() {
	(global.fetch as any).mockResolvedValueOnce({
		ok: false,
		status: 204,
	});
}

function mockFetchError(status = 500) {
	(global.fetch as any).mockResolvedValueOnce({
		ok: false,
		status,
		statusText: 'Server Error',
	});
}

function mockFetchThrow() {
	(global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
}

const sampleMetar = {
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
	],
	name: 'Eugene/Mahlon Sweet Fld, OR, US',
};

describe('fetchMETAR', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.resetModules();
		const mod = await import('./metar');
		fetchMETAR = mod.fetchMETAR;
		getCachedFlightCategory = mod.getCachedFlightCategory;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('should return METAR data as ATISInfo with source metar', async () => {
		mockFetchOk([sampleMetar]);

		const result = await fetchMETAR('KEUG');

		expect(result).not.toBeNull();
		expect(result!.source).toBe('metar');
		expect(result!.text).toBe(sampleMetar.rawOb);
		expect(result!.lastUpdated).toBe(sampleMetar.reportTime);
		expect(global.fetch).toHaveBeenCalledWith('/api/metar/KEUG');
	});

	it('should return null on 204 No Content', async () => {
		mockFetch204();

		const result = await fetchMETAR('ZZZZ');
		expect(result).toBeNull();
	});

	it('should return null on HTTP error and cache empty result', async () => {
		mockFetchError(500);

		const result = await fetchMETAR('KBAD');
		expect(result).toBeNull();

		// Second call within cache window should not fetch again
		const result2 = await fetchMETAR('KBAD');
		expect(result2).toBeNull();
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should return null on network error and cache empty result', async () => {
		mockFetchThrow();

		const result = await fetchMETAR('KERR');
		expect(result).toBeNull();

		const result2 = await fetchMETAR('KERR');
		expect(result2).toBeNull();
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should return null for empty array response', async () => {
		mockFetchOk([]);

		const result = await fetchMETAR('KEMP');
		expect(result).toBeNull();
	});

	it('should use cached data within 5-minute window', async () => {
		const now = Date.now();
		vi.setSystemTime(now);

		mockFetchOk([sampleMetar]);

		const first = await fetchMETAR('KEUG');
		expect(first!.text).toBe(sampleMetar.rawOb);
		expect(global.fetch).toHaveBeenCalledTimes(1);

		// Advance 2 minutes — still within cache window
		vi.setSystemTime(now + 2 * 60 * 1000);
		const second = await fetchMETAR('KEUG');
		expect(second!.text).toBe(sampleMetar.rawOb);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should fetch fresh data after cache expires', async () => {
		const now = Date.now();
		vi.setSystemTime(now);

		mockFetchOk([sampleMetar]);
		const first = await fetchMETAR('KEUG');
		expect(first!.text).toBe(sampleMetar.rawOb);

		// Advance past 5-minute cache window
		vi.setSystemTime(now + 5 * 60 * 1000 + 1000);

		const updatedMetar = { ...sampleMetar, rawOb: 'METAR KEUG 100154Z 18012KT 10SM FEW080 21/12 A2992 RMK AO2' };
		mockFetchOk([updatedMetar]);
		const second = await fetchMETAR('KEUG');
		expect(second!.text).toBe(updatedMetar.rawOb);
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	it('should handle METAR with VRB wind direction', async () => {
		const vrbMetar = { ...sampleMetar, wdir: 'VRB', rawOb: 'METAR KEUG 100054Z VRB05KT 10SM SCT090 19/11 A2989' };
		mockFetchOk([vrbMetar]);

		const result = await fetchMETAR('KEUG');
		expect(result).not.toBeNull();
		expect(result!.text).toContain('VRB05KT');
	});
});

describe('getCachedFlightCategory', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.resetModules();
		const mod = await import('./metar');
		fetchMETAR = mod.fetchMETAR;
		getCachedFlightCategory = mod.getCachedFlightCategory;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('should return null when no data is cached', () => {
		expect(getCachedFlightCategory('KEUG')).toBeNull();
	});

	it('should return flight category after METAR is fetched', async () => {
		mockFetchOk([sampleMetar]);
		await fetchMETAR('KEUG');

		expect(getCachedFlightCategory('KEUG')).toBe('VFR');
	});
});
