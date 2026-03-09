import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchCTAF, clearCTAFCache } from './ctaf';

describe('fetchCTAF client helper', () => {
	beforeEach(() => {
		clearCTAFCache();
		vi.restoreAllMocks();
	});

	it('should return frequency from API response', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ frequency: 118.7, source: 'cache' })
		});

		const result = await fetchCTAF('KPHX');
		expect(result).toBe(118.7);
		expect(global.fetch).toHaveBeenCalledWith('/api/ctaf/KPHX');
	});

	it('should return null when API returns null frequency', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ frequency: null, source: 'ourairports' })
		});

		const result = await fetchCTAF('KXYZ');
		expect(result).toBeNull();
	});

	it('should return null on API error', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 502
		});

		const result = await fetchCTAF('KPHX');
		expect(result).toBeNull();
	});

	it('should return null on network failure', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

		const result = await fetchCTAF('KPHX');
		expect(result).toBeNull();
	});

	it('should cache results and not re-fetch', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ frequency: 118.7, source: 'cache' })
		});

		await fetchCTAF('KPHX');
		await fetchCTAF('KPHX');

		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should cache null results too', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ frequency: null })
		});

		await fetchCTAF('KXYZ');
		await fetchCTAF('KXYZ');

		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should deduplicate concurrent requests for the same airport', async () => {
		let resolveCount = 0;
		global.fetch = vi.fn().mockImplementation(() => {
			resolveCount++;
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ frequency: 118.7 })
			});
		});

		// Fire two requests simultaneously
		const [result1, result2] = await Promise.all([
			fetchCTAF('KPHX'),
			fetchCTAF('KPHX')
		]);

		expect(result1).toBe(118.7);
		expect(result2).toBe(118.7);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should fetch different airports independently', async () => {
		global.fetch = vi.fn().mockImplementation((url: string) => {
			const freq = url.includes('KPHX') ? 118.7 : 119.9;
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ frequency: freq })
			});
		});

		const [phx, las] = await Promise.all([
			fetchCTAF('KPHX'),
			fetchCTAF('KLAS')
		]);

		expect(phx).toBe(118.7);
		expect(las).toBe(119.9);
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	it('should clear cache and allow re-fetching', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ frequency: 118.7 })
		});

		await fetchCTAF('KPHX');
		clearCTAFCache();
		await fetchCTAF('KPHX');

		expect(global.fetch).toHaveBeenCalledTimes(2);
	});
});
