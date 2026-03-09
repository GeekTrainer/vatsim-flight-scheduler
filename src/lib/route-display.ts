/**
 * Route display utilities for abbreviating long SimBrief route strings.
 *
 * When a route has too many tokens to fit in the flight strip,
 * we show the first/last few tokens with a count badge in the middle.
 */

export interface AbbreviatedRoute {
	/** Tokens to display before the badge */
	head: string[];
	/** Number of hidden tokens (0 means no abbreviation) */
	hiddenCount: number;
	/** Tokens to display after the badge */
	tail: string[];
}

/**
 * Parse a route string into space-separated tokens.
 */
export function parseRouteTokens(route: string): string[] {
	return route.trim().split(/\s+/).filter(Boolean);
}

/**
 * Abbreviate a list of tokens to fit within a visible count.
 * Shows roughly half at the start, half at the end, with a count badge in the middle.
 *
 * If tokens fit within visibleCount, returns them all with hiddenCount = 0.
 */
export function abbreviateRoute(tokens: string[], visibleCount: number): AbbreviatedRoute {
	if (tokens.length <= visibleCount) {
		return { head: tokens, hiddenCount: 0, tail: [] };
	}

	const headCount = Math.ceil(visibleCount / 2);
	const tailCount = Math.floor(visibleCount / 2);

	return {
		head: tokens.slice(0, headCount),
		hiddenCount: tokens.length - headCount - tailCount,
		tail: tokens.slice(tokens.length - tailCount)
	};
}
