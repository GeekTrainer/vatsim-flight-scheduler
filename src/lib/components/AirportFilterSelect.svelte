<script lang="ts">
	import ATCLevelSelector from './ATCLevelSelector.svelte';
	import type { Airport } from '$lib/types';
	import type { ATCController } from '$lib/types/vatsim';
	import { ControllerPosition } from '$lib/types/vatsim';

	interface Props {
		type: 'departure' | 'arrival';
		selectedAirport: string | null;
		atcLevels: ControllerPosition[];
		anyATCChecked: boolean;
		availableAirports: Airport[];
		showNoMatchMessage?: boolean;
		onAirportChange: (value: string) => void;
	}

	let {
		type,
		selectedAirport = $bindable(),
		atcLevels = $bindable(),
		anyATCChecked = $bindable(),
		availableAirports,
		showNoMatchMessage = false,
		onAirportChange
	}: Props = $props();

	const label = $derived(type === 'departure' ? 'Departure' : 'Arrival');
	const selectId = $derived(`${type}-select`);
	const testId = $derived(`${type}-airport-select`);
	const atcLabel = $derived(type === 'departure' ? 'Departure ATC Filtering' : 'Arrival ATC Filtering');
</script>

<div class="stack-md h-full flex flex-col">
	<div class="label-md">
		{label}
	</div>
	
	<!-- ATC Level Selector -->
	<ATCLevelSelector
		bind:selectedLevels={atcLevels}
		bind:anyATCChecked={anyATCChecked}
		label={atcLabel}
	/>

	<select
		id={selectId}
		data-testid={testId}
		value={selectedAirport || ''}
		onchange={(e) => onAirportChange(e.currentTarget.value)}
		class="form-input"
	>
		<option value="">Any airport</option>
		{#each availableAirports as airport (airport.vatsim_code)}
			<option value={airport.vatsim_code}>
				{airport.city} ({airport.vatsim_code})
			</option>
		{/each}
	</select>
	{#if showNoMatchMessage}
		<p class="text-secondary mt-1">No airports match current filters</p>
	{/if}
</div>
