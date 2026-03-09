import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use dynamic import via resetModules to get a fresh cache for each test
let fetchFAADatis: typeof import('./atis').fetchFAADatis;

// Mock fetch globally
global.fetch = vi.fn();

function mockFetchOk(data: unknown) {
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => data,
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

describe('fetchFAADatis', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		// Reset the module to clear the internal atisCache between tests
		vi.resetModules();
		const mod = await import('./atis');
		fetchFAADatis = mod.fetchFAADatis;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('should return combined ATIS data for a successful fetch', async () => {
		mockFetchOk([
			{ airport: 'KPHX', type: 'combined', code: 'A', datis: 'PHX ATIS INFO ALPHA' },
		]);

		const result = await fetchFAADatis('KPHX');

		expect(result).not.toBeNull();
		expect(result!.source).toBe('faa');
		expect(result!.atisType).toBe('combined');
		expect(result!.code).toBe('A');
		expect(result!.text).toBe('PHX ATIS INFO ALPHA');
	});

	it('should return role-specific arrival entry when split ATIS exists', async () => {
		mockFetchOk([
			{ airport: 'KATL', type: 'arr', code: 'B', datis: 'ATL ARRIVAL ATIS BRAVO' },
			{ airport: 'KATL', type: 'dep', code: 'C', datis: 'ATL DEPARTURE ATIS CHARLIE' },
		]);

		const result = await fetchFAADatis('KATL', 'arrival');

		expect(result!.atisType).toBe('arrival');
		expect(result!.text).toBe('ATL ARRIVAL ATIS BRAVO');
	});

	it('should return role-specific departure entry when split ATIS exists', async () => {
		mockFetchOk([
			{ airport: 'KATL', type: 'arr', code: 'B', datis: 'ATL ARRIVAL ATIS BRAVO' },
			{ airport: 'KATL', type: 'dep', code: 'C', datis: 'ATL DEPARTURE ATIS CHARLIE' },
		]);

		const result = await fetchFAADatis('KATL', 'departure');

		expect(result!.atisType).toBe('departure');
		expect(result!.code).toBe('C');
		expect(result!.text).toBe('ATL DEPARTURE ATIS CHARLIE');
	});

	it('should fall back to combined when role-specific not found', async () => {
		mockFetchOk([
			{ airport: 'KPHX', type: 'combined', code: 'A', datis: 'PHX COMBINED ATIS' },
		]);

		const result = await fetchFAADatis('KPHX', 'departure');

		expect(result!.atisType).toBe('combined');
		expect(result!.text).toBe('PHX COMBINED ATIS');
	});

	it('should return null on HTTP error and cache empty result', async () => {
		mockFetchError(500);

		const result = await fetchFAADatis('KBAD');
		expect(result).toBeNull();

		// Second call within cache window should not fetch again
		const result2 = await fetchFAADatis('KBAD');
		expect(result2).toBeNull();
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should return null on network error and cache empty result', async () => {
		mockFetchThrow();

		const result = await fetchFAADatis('KERR');
		expect(result).toBeNull();

		// Second call should use cached empty data
		const result2 = await fetchFAADatis('KERR');
		expect(result2).toBeNull();
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should return null for empty array response', async () => {
		mockFetchOk([]);

		const result = await fetchFAADatis('KEMP');
		expect(result).toBeNull();
	});

	it('should use cached data within 60-second window', async () => {
		const now = Date.now();
		vi.setSystemTime(now);

		mockFetchOk([
			{ airport: 'KCCH', type: 'combined', code: 'A', datis: 'CACHED ATIS' },
		]);

		const first = await fetchFAADatis('KCCH');
		expect(first!.text).toBe('CACHED ATIS');
		expect(global.fetch).toHaveBeenCalledTimes(1);

		// Advance 30s — still within cache window
		vi.setSystemTime(now + 30_000);
		const second = await fetchFAADatis('KCCH');
		expect(second!.text).toBe('CACHED ATIS');
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should fetch fresh data after cache expires', async () => {
		const now = Date.now();
		vi.setSystemTime(now);

		mockFetchOk([
			{ airport: 'KEXP', type: 'combined', code: 'A', datis: 'OLD ATIS' },
		]);
		const first = await fetchFAADatis('KEXP');
		expect(first!.text).toBe('OLD ATIS');

		// Advance past 60s cache window
		vi.setSystemTime(now + 61_000);

		mockFetchOk([
			{ airport: 'KEXP', type: 'combined', code: 'B', datis: 'NEW ATIS' },
		]);
		const second = await fetchFAADatis('KEXP');
		expect(second!.text).toBe('NEW ATIS');
		expect(second!.code).toBe('B');
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	it('should return null for cached empty data', async () => {
		mockFetchOk([]);
		const first = await fetchFAADatis('KNUL');
		expect(first).toBeNull();

		// Second call uses cached empty — should still return null, no fetch
		const second = await fetchFAADatis('KNUL');
		expect(second).toBeNull();
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should return undefined code when code is empty string', async () => {
		mockFetchOk([
			{ airport: 'KPHX', type: 'combined', code: '', datis: 'NO CODE ATIS' },
		]);
		const result = await fetchFAADatis('KPHX');
		expect(result!.code).toBeUndefined();
	});
});
