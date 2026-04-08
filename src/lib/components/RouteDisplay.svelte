<!--
	RouteDisplay.svelte

	Displays a SimBrief route string on the flight strip.
	Auto-detects overflow and progressively abbreviates the route
	by showing first/last tokens with a count badge in the middle.
	Hover tooltip shows the full route.

	Props:
	- route: The full route string from SimBrief
	- alternate: Optional alternate airport ICAO code
-->
<script lang="ts">
	import { parseRouteTokens, abbreviateRoute } from '$lib/route-display';

	let { route, alternate = '' }: { route: string; alternate?: string } = $props();

	let containerEl = $state<HTMLElement | null>(null);
	let showTooltip = $state(false);

	const tokens = $derived(parseRouteTokens(route));

	let visibleCount = $state(Infinity);
	const abbreviated = $derived(abbreviateRoute(tokens, visibleCount));

	/**
	 * Measure text widths off-screen to find the right abbreviation level.
	 * Uses a temporary hidden span that inherits the container's font metrics.
	 */
	function computeVisibleCount() {
		if (!containerEl || tokens.length === 0) return;
		const containerWidth = containerEl.clientWidth;
		if (containerWidth === 0) return;

		const textEl = containerEl.querySelector('[data-route-text]');
		if (!textEl) return;
		const style = getComputedStyle(textEl);

		const m = document.createElement('span');
		m.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none;font:${style.font};letter-spacing:${style.letterSpacing}`;
		document.body.appendChild(m);

		const altText = alternate ? `  (ALTN: ${alternate})` : '';

		// Check if full route fits
		m.textContent = tokens.join(' ') + altText;
		if (m.offsetWidth <= containerWidth) {
			visibleCount = tokens.length;
			document.body.removeChild(m);
			return;
		}

		// Badge has ~24px of padding/border beyond its text
		const BADGE_OVERHEAD = 24;

		for (let count = tokens.length - 1; count >= 2; count--) {
			const abbr = abbreviateRoute(tokens, count);
			m.textContent = abbr.head.join(' ') + ' +' + abbr.hiddenCount + ' ' + abbr.tail.join(' ') + altText;
			if (m.offsetWidth + BADGE_OVERHEAD <= containerWidth) {
				visibleCount = count;
				document.body.removeChild(m);
				return;
			}
		}

		visibleCount = 2;
		document.body.removeChild(m);
	}

	$effect(() => {
		if (!containerEl) return;
		tokens; // re-run when route changes

		computeVisibleCount();

		const observer = new ResizeObserver(() => computeVisibleCount());
		observer.observe(containerEl);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={containerEl}
	class="relative overflow-hidden min-w-0"
	data-testid="route-display"
	role="img"
	aria-label="Flight route: {route}"
	onmouseenter={() => showTooltip = true}
	onmouseleave={() => showTooltip = false}
>
	<!-- Route text -->
	<span data-route-text class="font-mono text-gray-400 whitespace-nowrap text-xs">
		{#if abbreviated.hiddenCount > 0}
			{abbreviated.head.join(' ')}
			<span
				class="inline-flex items-center mx-1 px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-800 border border-gray-700 rounded"
				data-testid="route-badge"
			>+{abbreviated.hiddenCount}</span>
			{abbreviated.tail.join(' ')}
		{:else}
			{tokens.join(' ')}
		{/if}
		{#if alternate}
			&nbsp;<span class="text-yellow-400/70">(ALTN: {alternate})</span>
		{/if}
	</span>

	<!-- Tooltip with full route on hover -->
	{#if showTooltip && abbreviated.hiddenCount > 0}
		<div
			class="absolute left-0 top-full mt-1 z-50 max-w-md px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl font-mono text-xs text-gray-300 whitespace-normal break-words pointer-events-none"
			data-testid="route-tooltip"
		>
			{route}
			{#if alternate}
				<span class="text-yellow-400/70 ml-1">(ALTN: {alternate})</span>
			{/if}
		</div>
	{/if}
</div>
