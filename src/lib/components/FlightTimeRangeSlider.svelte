<script lang="ts">
	interface Props {
		min: number;
		max: number;
		currentMin: number | null;
		currentMax: number | null;
		step?: number;
		onchange?: (min: number | null, max: number | null) => void;
	}

	let {
		min,
		max,
		currentMin = $bindable(),
		currentMax = $bindable(),
		step = 30,
		onchange
	}: Props = $props();

	// Internal values track slider positions (always numbers)
	let internalMin = $state(0);
	let internalMax = $state(0);

	// Sync internal values when props change
	$effect(() => {
		internalMin = currentMin ?? min;
		internalMax = currentMax ?? max;
	});

	function formatTime(minutes: number): string {
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		if (h === 0) return `${m}m`;
		if (m === 0) return `${h}h`;
		return `${h}h ${m}m`;
	}

	function handleMinChange(e: Event) {
		const val = parseInt((e.target as HTMLInputElement).value);
		internalMin = Math.min(val, internalMax - step);
		emitChange();
	}

	function handleMaxChange(e: Event) {
		const val = parseInt((e.target as HTMLInputElement).value);
		internalMax = Math.max(val, internalMin + step);
		emitChange();
	}

	function emitChange() {
		const newMin = internalMin <= min ? null : internalMin;
		const newMax = internalMax >= max ? null : internalMax;
		currentMin = newMin;
		currentMax = newMax;
		onchange?.(newMin, newMax);
	}

	const isFiltering = $derived(currentMin != null || currentMax != null);

	// Friendly display of current range for the header
	const rangeDescription = $derived.by(() => {
		const hasMin = currentMin != null;
		const hasMax = currentMax != null;
		if (!hasMin && !hasMax) return '';
		if (hasMin && !hasMax) return `${formatTime(internalMin)}+`;
		if (!hasMin && hasMax) return `Under ${formatTime(internalMax)}`;
		return `${formatTime(internalMin)} – ${formatTime(internalMax)}`;
	});

	// Generate tick marks for the track
	const ticks = $derived.by(() => {
		const result = [];
		for (let t = min; t <= max; t += step) {
			result.push(t);
		}
		return result;
	});

	// Calculate fill bar position (percentage)
	const fillLeft = $derived(((internalMin - min) / (max - min)) * 100);
	const fillRight = $derived(((max - internalMax) / (max - min)) * 100);
</script>

<div class="range-slider" data-testid="flight-time-range-slider">
	<div class="header">
		<span class="label">Flight Time</span>
		{#if isFiltering}
			<span class="range-label" data-testid="flight-time-range-label">
				{rangeDescription}
			</span>
		{/if}
	</div>

	<div class="slider-container">
		<div class="track">
			<div class="track-fill" style="left: {fillLeft}%; right: {fillRight}%;"></div>
			{#each ticks as tick (tick)}
				{@const pct = ((tick - min) / (max - min)) * 100}
				{#if tick % 60 === 0}
					<div class="tick major" style="left: {pct}%;"></div>
				{/if}
			{/each}
		</div>
		<input
			type="range"
			data-testid="flight-time-slider-min"
			{min}
			{max}
			{step}
			value={internalMin}
			oninput={handleMinChange}
			class="thumb thumb-min"
		/>
		<input
			type="range"
			data-testid="flight-time-slider-max"
			{min}
			{max}
			{step}
			value={internalMax}
			oninput={handleMaxChange}
			class="thumb thumb-max"
		/>
	</div>

	<div class="labels">
		<span>&lt; {formatTime(min)}</span>
		<span>&gt; {formatTime(max)}</span>
	</div>
</div>

<style>
	.range-slider {
		width: 100%;
	}
	.header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		margin-bottom: 0.5rem;
	}
	.label {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgb(156 163 175);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.range-label {
		font-size: 0.75rem;
		color: rgb(96 165 250);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.slider-container {
		position: relative;
		height: 2rem;
	}
	.track {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 4px;
		background: rgb(55 65 81);
		border-radius: 2px;
		transform: translateY(-50%);
	}
	.track-fill {
		position: absolute;
		top: 0;
		bottom: 0;
		background: rgb(59 130 246);
		border-radius: 2px;
	}
	.tick {
		position: absolute;
		top: -3px;
		width: 1px;
		height: 10px;
		background: rgb(75 85 99);
	}
	.tick.major {
		height: 10px;
		background: rgb(107 114 128);
	}
	.thumb {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		pointer-events: none;
		margin: 0;
	}
	.thumb::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: rgb(59 130 246);
		border: 2px solid rgb(30 64 175);
		cursor: pointer;
		pointer-events: all;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		transition: transform 0.1s;
	}
	.thumb::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}
	.thumb::-webkit-slider-thumb:active {
		transform: scale(1.2);
		background: rgb(96 165 250);
	}
	.thumb::-moz-range-thumb {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: rgb(59 130 246);
		border: 2px solid rgb(30 64 175);
		cursor: pointer;
		pointer-events: all;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}
	.labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.625rem;
		color: rgb(107 114 128);
		margin-top: 0.125rem;
	}

	/* Larger thumb targets on mobile */
	@media (max-width: 768px) {
		.thumb::-webkit-slider-thumb {
			width: 1.5rem;
			height: 1.5rem;
		}
		.thumb::-moz-range-thumb {
			width: 1.5rem;
			height: 1.5rem;
		}
		.slider-container {
			height: 2.5rem;
		}
	}
</style>
