<script lang="ts">
	import { loadAllRoutes, airports } from '$lib/routes';
	import AirportFilterSelect from './AirportFilterSelect.svelte';
	import FlightTimeRangeSlider from './FlightTimeRangeSlider.svelte';
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
		minFlightTime: number | null;
		maxFlightTime: number | null;
		locationControllers: LocationControllers;
	}

	let {
		selectedDeparture = $bindable(),
		selectedArrival = $bindable(),
		onlyDepartureWithATC = $bindable(),
		onlyArrivalWithATC = $bindable(),
		departureATCLevels = $bindable(),
		arrivalATCLevels = $bindable(),
		minFlightTime = $bindable(),
		maxFlightTime = $bindable(),
		locationControllers
	}: Props = $props();

	const allRoutes = loadAllRoutes();

	// Fixed slider bounds: < 90min on the low end, > 6h on the high end
	const flightTimeMin = 90;
	const flightTimeMax = 360;

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
		minFlightTime = null;
		maxFlightTime = null;
	}

	// Computed filter state object for hasActiveFilters check
	const filterState = $derived({
		selectedDeparture,
		selectedArrival,
		onlyDepartureWithATC,
		onlyArrivalWithATC,
		departureATCLevels,
		arrivalATCLevels,
		minFlightTime,
		maxFlightTime
	});

	const hasActiveFilters = $derived(checkActiveFilters(filterState));
</script>

<div class="space-y-2 sm:space-y-4">
	<!-- Airport Selectors with ATC Filters - Side by side layout -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 md:items-start">
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

	<!-- Flight Time Range Slider -->
	<FlightTimeRangeSlider
		min={flightTimeMin}
		max={flightTimeMax}
		bind:currentMin={minFlightTime}
		bind:currentMax={maxFlightTime}
	/>

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
