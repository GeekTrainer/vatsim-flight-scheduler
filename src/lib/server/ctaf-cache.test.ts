import { describe, it, expect, beforeEach } from 'vitest';
import { getCTAF, setCTAF, clearMemoryCache } from './ctaf-cache';

describe('CTAF Cache (in-memory fallback)', () => {
	beforeEach(() => {
		clearMemoryCache();
	});

	it('should return undefined for uncached airport', async () => {
		const result = await getCTAF('KPHX');
		expect(result).toBeUndefined();
	});

	it('should return cached frequency after storing', async () => {
		await setCTAF('KPHX', 118.7);
		const result = await getCTAF('KPHX');
		expect(result).toBe(118.7);
	});

	it('should cache different airports independently', async () => {
		await setCTAF('KPHX', 118.7);
		await setCTAF('KLAS', 119.9);

		expect(await getCTAF('KPHX')).toBe(118.7);
		expect(await getCTAF('KLAS')).toBe(119.9);
	});

	it('should clear cache correctly', async () => {
		await setCTAF('KPHX', 118.7);
		clearMemoryCache();
		expect(await getCTAF('KPHX')).toBeUndefined();
	});

	it('should cache null frequency for negative caching', async () => {
		await setCTAF('KXYZ', null);
		const result = await getCTAF('KXYZ');
		expect(result).toBeNull();
	});

	it('should overwrite existing cache entry', async () => {
		await setCTAF('KPHX', 118.7);
		await setCTAF('KPHX', 120.9);
		expect(await getCTAF('KPHX')).toBe(120.9);
	});
});
