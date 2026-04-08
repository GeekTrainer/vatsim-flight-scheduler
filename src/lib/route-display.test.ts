import { describe, it, expect } from 'vitest';
import { parseRouteTokens, abbreviateRoute } from './route-display';

describe('parseRouteTokens', () => {
	it('splits a route string into tokens', () => {
		expect(parseRouteTokens('DCT KAYNO J80 TBC')).toEqual(['DCT', 'KAYNO', 'J80', 'TBC']);
	});

	it('handles extra whitespace', () => {
		expect(parseRouteTokens('  DCT   KAYNO  J80  ')).toEqual(['DCT', 'KAYNO', 'J80']);
	});

	it('returns empty array for empty string', () => {
		expect(parseRouteTokens('')).toEqual([]);
		expect(parseRouteTokens('   ')).toEqual([]);
	});

	it('handles single token', () => {
		expect(parseRouteTokens('DCT')).toEqual(['DCT']);
	});
});

describe('abbreviateRoute', () => {
	const shortRoute = ['DCT', 'KAYNO', 'J80', 'TBC'];
	const longRoute = ['DCT', 'KAYNO', 'J80', 'SYR', 'V2', 'BOSTN', 'DCT', 'METSS', 'DCT', 'MERIT'];

	it('returns all tokens when count fits', () => {
		const result = abbreviateRoute(shortRoute, 7);
		expect(result.head).toEqual(shortRoute);
		expect(result.hiddenCount).toBe(0);
		expect(result.tail).toEqual([]);
	});

	it('returns all tokens when exactly at limit', () => {
		const result = abbreviateRoute(shortRoute, 4);
		expect(result.head).toEqual(shortRoute);
		expect(result.hiddenCount).toBe(0);
		expect(result.tail).toEqual([]);
	});

	it('abbreviates when tokens exceed visible count', () => {
		const result = abbreviateRoute(longRoute, 6);
		expect(result.head).toEqual(['DCT', 'KAYNO', 'J80']);
		expect(result.hiddenCount).toBe(4);
		expect(result.tail).toEqual(['METSS', 'DCT', 'MERIT']);

		// Verify: head(3) + hidden(4) + tail(3) = 10 total
		expect(result.head.length + result.hiddenCount + result.tail.length).toBe(longRoute.length);
	});

	it('abbreviates aggressively with small visible count', () => {
		const result = abbreviateRoute(longRoute, 2);
		expect(result.head).toEqual(['DCT']);
		expect(result.hiddenCount).toBe(8);
		expect(result.tail).toEqual(['MERIT']);
	});

	it('handles visible count of 1', () => {
		const result = abbreviateRoute(longRoute, 1);
		expect(result.head).toEqual(['DCT']);
		expect(result.hiddenCount).toBe(9);
		expect(result.tail).toEqual([]);
	});

	it('handles odd visible count correctly', () => {
		const result = abbreviateRoute(longRoute, 5);
		// ceil(5/2)=3 head, floor(5/2)=2 tail
		expect(result.head).toEqual(['DCT', 'KAYNO', 'J80']);
		expect(result.tail).toEqual(['DCT', 'MERIT']);
		expect(result.hiddenCount).toBe(5);
	});

	it('returns empty head and tail for empty array', () => {
		const result = abbreviateRoute([], 4);
		expect(result).toEqual({ head: [], hiddenCount: 0, tail: [] });
	});

	it('returns single token with visibleCount=1', () => {
		const result = abbreviateRoute(['DIRECT'], 1);
		expect(result).toEqual({ head: ['DIRECT'], hiddenCount: 0, tail: [] });
	});

	it('handles single token with visibleCount=0', () => {
		const result = abbreviateRoute(['DIRECT'], 0);
		// tokens.length(1) > visibleCount(0): head=ceil(0)=0, tail=floor(0)=0
		expect(result.head).toEqual([]);
		expect(result.tail).toEqual([]);
		expect(result.hiddenCount).toBe(1);
	});

	it('handles very long route with visibleCount=4', () => {
		const tokens = Array.from({ length: 22 }, (_, i) => `WPT${i}`);
		const result = abbreviateRoute(tokens, 4);
		// ceil(4/2)=2 head, floor(4/2)=2 tail
		expect(result.head).toEqual(['WPT0', 'WPT1']);
		expect(result.tail).toEqual(['WPT20', 'WPT21']);
		expect(result.hiddenCount).toBe(18);
		expect(result.head.length + result.hiddenCount + result.tail.length).toBe(22);
	});

	it('handles visibleCount=0 with multiple tokens', () => {
		const result = abbreviateRoute(longRoute, 0);
		expect(result.head).toEqual([]);
		expect(result.tail).toEqual([]);
		expect(result.hiddenCount).toBe(10);
	});
});
