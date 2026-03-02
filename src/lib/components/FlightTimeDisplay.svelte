<script lang="ts">
	interface Props {
		minutes: number;
		showDistance?: boolean;
		distanceNm?: number;
		compact?: boolean;
	}

	let { minutes, showDistance = false, distanceNm = 0, compact = false }: Props = $props();

	const formatted = $derived.by(() => {
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		if (h === 0) return `${m}m`;
		if (m === 0) return `${h}h`;
		return `${h}h ${m}m`;
	});
</script>

<span
	class="flight-time {compact ? 'compact' : ''}"
	data-testid="flight-time-display"
	title="{minutes} minutes{showDistance && distanceNm ? ` · ${distanceNm} nm` : ''}"
>
	<span class="time">{formatted}</span>
	{#if showDistance && distanceNm}
		<span class="distance">{distanceNm} nm</span>
	{/if}
</span>

<style>
	.flight-time {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-variant-numeric: tabular-nums;
	}
	.time {
		color: rgb(209 213 219); /* gray-300 */
		font-weight: 500;
	}
	.compact .time {
		font-size: 0.75rem;
	}
	.distance {
		color: rgb(156 163 175); /* gray-400 */
		font-size: 0.75rem;
	}
</style>
