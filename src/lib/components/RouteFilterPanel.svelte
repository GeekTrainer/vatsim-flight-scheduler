<script lang="ts">
	import { loadAllRoutes, airports } from '$lib/routes';
	import AirportFilterSelect from './AirportFilterSelect.svelte';
	import { getAvailableAirports } from '$lib/utils/filter-airports';
	import { hasActiveFilters as checkActiveFilters } from '$lib/utils/filter-utils';
	import type { Airport, LocationControllers } from '$lib/types';
	import type { ATCController } from '$lib/types/vatsim';
	import { ControllerPosition } from '$lib/types/vatsim';

	interface Props {
		selectedDeparture: string | null;
		selectedArrival: string | null;
		onlyDepartureWithATC: boolean;
		onlyArrivalWithATC: boolean;
		departureATCLevels: ControllerPosition[];
		arrivalATCLevels: ControllerPosition[];
		locationControllers: LocationControllers;
	}

	let {
		selectedDeparture = $bindable(),
		selectedArrival = $bindable(),
		onlyDepartureWithATC = $bindable(),
		onlyArrivalWithATC = $bindable(),
		departureATCLevels = $bindable(),
		arrivalATCLevels = $bindable(),
		locationControllers
	}: Props = $props();

	const allRoutes = loadAllRoutes();

	const availableDepartureAirports = $derived(
		getAvailableAirports(allRoutes, airports, 'departure', {
			selectedAirport: selectedDeparture,
			otherSelectedAirport: selectedArrival,
			onlyThisWithATC: onlyDepartureWithATC,
			onlyOtherWithATC: onlyArrivalWithATC,
			thisATCLevels: departureATCLevels,
			otherATCLevels: arrivalATCLevels,
			locationControllers
		})
	);

	const availableArrivalAirports = $derived(
		getAvailableAirports(allRoutes, airports, 'arrival', {
			selectedAirport: selectedArrival,
			otherSelectedAirport: selectedDeparture,
			onlyThisWithATC: onlyArrivalWithATC,
			onlyOtherWithATC: onlyDepartureWithATC,
			thisATCLevels: arrivalATCLevels,
			otherATCLevels: departureATCLevels,
			locationControllers
		})
	);

	function clearFilters() {
		selectedDeparture = null;
		selectedArrival = null;
		onlyDepartureWithATC = false;
		onlyArrivalWithATC = false;
		departureATCLevels = [];
		arrivalATCLevels = [];
	}

	// Computed filter state object for hasActiveFilters check
	const filterState = $derived({
		selectedDeparture,
		selectedArrival,
		onlyDepartureWithATC,
		onlyArrivalWithATC,
		departureATCLevels,
		arrivalATCLevels
	});

	const hasActiveFilters = $derived(checkActiveFilters(filterState));
</script>

<div class="stack-lg">
	<!-- Airport Selectors with ATC Filters - Side by side layout -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-start">
		<!-- Departure Airport -->
		<AirportFilterSelect
			type="departure"
			bind:selectedAirport={selectedDeparture}
			bind:atcLevels={departureATCLevels}
			bind:anyATCChecked={onlyDepartureWithATC}
			availableAirports={availableDepartureAirports}
			showNoMatchMessage={availableDepartureAirports.length === 0 && (onlyDepartureWithATC || departureATCLevels.length > 0 || selectedArrival !== null)}
			onAirportChange={(value) => selectedDeparture = value || null}
		/>

		<!-- Arrival Airport -->
		<AirportFilterSelect
			type="arrival"
			bind:selectedAirport={selectedArrival}
			bind:atcLevels={arrivalATCLevels}
			bind:anyATCChecked={onlyArrivalWithATC}
			availableAirports={availableArrivalAirports}
			showNoMatchMessage={availableArrivalAirports.length === 0 && (onlyArrivalWithATC || arrivalATCLevels.length > 0 || selectedDeparture !== null)}
			onAirportChange={(value) => selectedArrival = value || null}
		/>
	</div>

	<!-- Clear Filters Button (shown when filters are active) -->
	{#if hasActiveFilters}
		<div class="flex justify-end">
			<button
				data-testid="clear-all-filters"
				onclick={clearFilters}
				class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
			>
				Clear all filters
			</button>
		</div>
	{/if}
</div>
