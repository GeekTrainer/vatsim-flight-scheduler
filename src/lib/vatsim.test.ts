import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
	fetchVatsimData, 
	getLocationControllers
} from './vatsim';
import { ControllerPosition } from './types/vatsim';
import type { VatsimData, ATCController } from './types/vatsim';

// Mock fetch globally
global.fetch = vi.fn();

// Mock VATSIM data for testing
const mockVatsimData: VatsimData = {
	general: {
		version: 3,
		reload: 1,
		update: '20260104120000',
		update_timestamp: '2026-01-04T12:00:00Z',
		connected_clients: 10,
		unique_users: 10
	},
	pilots: [],
	controllers: [
		{
			cid: 1234567,
			name: 'John Doe',
			callsign: 'ABQ_TWR',
			frequency: '118.200',
			facility: 4, // Tower
			rating: 5,
			server: 'USA-EAST',
			visual_range: 100,
			last_updated: '2026-01-04T12:00:00Z',
			logon_time: '2026-01-04T11:00:00Z'
		},
		{
			cid: 1234568,
			name: 'Jane Smith',
			callsign: 'ABQ_GND',
			frequency: '121.900',
			facility: 3, // Ground
			rating: 4,
			server: 'USA-EAST',
			visual_range: 50,
			last_updated: '2026-01-04T12:00:00Z',
			logon_time: '2026-01-04T10:30:00Z'
		},
		{
			cid: 1234569,
			name: 'Bob Johnson',
			callsign: 'ZAB_CTR',
			frequency: '124.650',
			facility: 6, // Center
			rating: 7,
			server: 'USA-EAST',
			visual_range: 250,
			last_updated: '2026-01-04T12:00:00Z',
			logon_time: '2026-01-04T09:00:00Z'
		},
		{
			cid: 1234570,
			name: 'Alice Williams',
			callsign: 'SOCAL_APP',
			frequency: '125.200',
			facility: 5, // Approach
			rating: 6,
			server: 'USA-WEST',
			visual_range: 150,
			last_updated: '2026-01-04T12:00:00Z',
			logon_time: '2026-01-04T11:30:00Z'
		},
		{
			cid: 1234571,
			name: 'Charlie Brown',
			callsign: 'LAX_DEL',
			frequency: '121.650',
			facility: 2, // Delivery
			rating: 3,
			server: 'USA-WEST',
			visual_range: 20,
			last_updated: '2026-01-04T12:00:00Z',
			logon_time: '2026-01-04T11:45:00Z'
		}
	],
	atis: [],
	servers: [],
	prefiles: [],
	facilities: [],
	ratings: [],
	pilot_ratings: [],
	military_ratings: []
};

describe('vatsim', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('fetchVatsimData', () => {
		it('should fetch data from VATSIM API', async () => {
			vi.clearAllMocks();
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockVatsimData
			});

			const data = await fetchVatsimData();
			
			expect(global.fetch).toHaveBeenCalled();
			expect(data).toEqual(mockVatsimData);
		});

		it('should throw error when API request fails', async () => {
			vi.clearAllMocks();
			vi.useFakeTimers();
			// Advance time to ensure cache is expired
			vi.advanceTimersByTime(35000);
			
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				statusText: 'Internal Server Error'
			});

			await expect(fetchVatsimData()).rejects.toThrow('Failed to fetch VATSIM data: Internal Server Error');
			vi.useRealTimers();
		});

		it('should cache data for 30 seconds', async () => {
			vi.clearAllMocks();
			vi.useFakeTimers();
			const now = Date.now();
			vi.setSystemTime(now);

			(global.fetch as any).mockResolvedValue({
				ok: true,
				json: async () => mockVatsimData
			});

			// First call
			await fetchVatsimData();
			const firstCallCount = (global.fetch as any).mock.calls.length;
			
			// Second call within cache duration (advance only 10 seconds)
			vi.setSystemTime(now + 10000);
			await fetchVatsimData();
			
			// Should still be using cache (no new fetch)
			expect((global.fetch as any).mock.calls.length).toBe(firstCallCount);
			
			// Advance beyond cache duration (31 seconds total)
			vi.setSystemTime(now + 31000);
			await fetchVatsimData();
			
			// Should have made a new fetch
			expect((global.fetch as any).mock.calls.length).toBe(firstCallCount + 1);

			vi.useRealTimers();
		});

		it('should deduplicate concurrent fetches into a single request', async () => {
			vi.clearAllMocks();
			vi.useFakeTimers();
			// Set time far ahead to expire any prior cache
			vi.setSystemTime(Date.now() + 120000);

			let resolveResponse!: (value: any) => void;
			(global.fetch as any).mockReturnValueOnce(
				new Promise(resolve => { resolveResponse = resolve; })
			);

			// Launch two concurrent fetches before the first resolves
			const promise1 = fetchVatsimData();
			const promise2 = fetchVatsimData();

			// Resolve the single in-flight request
			resolveResponse({ ok: true, json: async () => mockVatsimData });

			const [result1, result2] = await Promise.all([promise1, promise2]);

			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(result1).toEqual(mockVatsimData);
			expect(result2).toEqual(mockVatsimData);

			vi.useRealTimers();
		});
	});

	describe('getLocationControllers', () => {
		it('should organize controllers by location and position', () => {
			const locationControllers = getLocationControllers(mockVatsimData.controllers);
			
			// Check ABQ airport has TWR and GND
			const abqControllers = locationControllers.get('KABQ');
			expect(abqControllers).toBeDefined();
			expect(abqControllers?.has(ControllerPosition.TWR)).toBe(true);
			expect(abqControllers?.has(ControllerPosition.GND)).toBe(true);
		});

		it('should extract center controllers with ARTCC codes', () => {
			const locationControllers = getLocationControllers(mockVatsimData.controllers);
			
			// Check ZAB center
			const zabControllers = locationControllers.get('ZAB');
			expect(zabControllers).toBeDefined();
			expect(zabControllers?.has(ControllerPosition.CTR)).toBe(true);
			
			const ctrControllers = zabControllers?.get(ControllerPosition.CTR);
			expect(ctrControllers).toHaveLength(1);
			expect(ctrControllers?.[0].callsign).toBe('ZAB_CTR');
		});

		it('should handle consolidated TRACON facilities', () => {
			const locationControllers = getLocationControllers(mockVatsimData.controllers);
			
			// SOCAL_APP should appear for multiple airports (LAX, SAN, SNA, etc.)
			const laxControllers = locationControllers.get('KLAX');
			expect(laxControllers).toBeDefined();
			
			const appControllers = laxControllers?.get(ControllerPosition.APP);
			expect(appControllers).toBeDefined();
			expect(appControllers?.some(c => c.callsign === 'SOCAL_APP')).toBe(true);
		});

		it('should calculate online time in minutes', () => {
			const locationControllers = getLocationControllers(mockVatsimData.controllers);
			
			const abqControllers = locationControllers.get('KABQ');
			const twrControllers = abqControllers?.get(ControllerPosition.TWR);
			
			expect(twrControllers?.[0].onlineTimeMinutes).toBeGreaterThan(0);
		});

		it('should skip non-ATC positions', () => {
			const controllersWithObserver = [
				...mockVatsimData.controllers,
				{
					cid: 9999999,
					name: 'Observer',
					callsign: 'OBS_123',
					frequency: '199.998',
					facility: 1, // Observer
					rating: 1,
					server: 'USA-EAST',
					visual_range: 0,
					last_updated: '2026-01-04T12:00:00Z',
					logon_time: '2026-01-04T11:00:00Z'
				}
			];

			const locationControllers = getLocationControllers(controllersWithObserver);
			
			// Should not include observer
			const allControllers = Array.from(locationControllers.values()).flatMap(
				posMap => Array.from(posMap.values()).flat()
			);
			expect(allControllers.some(c => c.callsign === 'OBS_123')).toBe(false);
		});

		it('should deduplicate controllers on the same frequency (training sessions)', () => {
			const controllersWithTrainee = [
				{
					cid: 1000001,
					name: 'Primary Controller',
					callsign: 'ATL_TWR',
					frequency: '119.100',
					facility: 4,
					rating: 5,
					server: 'USA-EAST',
					visual_range: 100,
					last_updated: '2026-01-04T12:00:00Z',
					logon_time: '2026-01-04T11:00:00Z'
				},
				{
					cid: 1000002,
					name: 'Trainee Controller',
					callsign: 'ATL_1_TWR',
					frequency: '119.100',
					facility: 4,
					rating: 3,
					server: 'USA-EAST',
					visual_range: 100,
					last_updated: '2026-01-04T12:00:00Z',
					logon_time: '2026-01-04T11:30:00Z'
				}
			];

			const locationControllers = getLocationControllers(controllersWithTrainee);
			const atlTwr = locationControllers.get('KATL')?.get(ControllerPosition.TWR);

			// Should only have one controller (the primary, no number in callsign)
			expect(atlTwr).toHaveLength(1);
			expect(atlTwr![0].callsign).toBe('ATL_TWR');
		});

		it('should keep controllers on different frequencies at same position', () => {
			const controllersMultiFreq = [
				{
					cid: 1000001,
					name: 'Controller A',
					callsign: 'ATL_TWR',
					frequency: '119.100',
					facility: 4,
					rating: 5,
					server: 'USA-EAST',
					visual_range: 100,
					last_updated: '2026-01-04T12:00:00Z',
					logon_time: '2026-01-04T11:00:00Z'
				},
				{
					cid: 1000002,
					name: 'Controller B',
					callsign: 'ATL_S_TWR',
					frequency: '123.850',
					facility: 4,
					rating: 5,
					server: 'USA-EAST',
					visual_range: 100,
					last_updated: '2026-01-04T12:00:00Z',
					logon_time: '2026-01-04T11:30:00Z'
				}
			];

			const locationControllers = getLocationControllers(controllersMultiFreq);
			const atlTwr = locationControllers.get('KATL')?.get(ControllerPosition.TWR);

			// Both should remain since they're on different frequencies
			expect(atlTwr).toHaveLength(2);
		});
	});
});
