<script lang="ts">
	import { loadAllRoutes, airports } from '$lib/routes';
	import { fetchVatsimData, getLocationControllers } from '$lib/vatsim';
	import { filterRoutes } from '$lib/utils/route-filter';
	import { hasActiveFilters as checkActiveFilters } from '$lib/utils/filter-utils';
	import DepartureGroupedList from '$lib/components/DepartureGroupedList.svelte';
	import RouteFilterPanel from '$lib/components/RouteFilterPanel.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import NetworkStatus from '$lib/components/NetworkStatus.svelte';
	import type { LocationControllers } from '$lib/types';
	import { ControllerPosition } from '$lib/types/vatsim';

	// Load all routes from real data
	const allRoutes = loadAllRoutes();
	
	let locationControllers = $state<LocationControllers>(new Map());
	let lastUpdate = $state('');
	let onlineControllers = $state(0);
	let isLoading = $state(true);
	
	// Filter states
	let selectedDeparture = $state<string | null>(null);
	let selectedArrival = $state<string | null>(null);
	let onlyDepartureWithATC = $state(false);
	let onlyArrivalWithATC = $state(false);
	let departureATCLevels = $state<ControllerPosition[]>([]);
	let arrivalATCLevels = $state<ControllerPosition[]>([]);

	async function loadVatsimData() {
		try {
			const data = await fetchVatsimData();
			locationControllers = getLocationControllers(data.controllers);
			
			// Count only controllers at our Southwest network airports
			const ourAirportCodes = new Set(airports.map(a => a.vatsim_code));
			const ourARTCCs = new Set(airports.map(a => a.artcc));
			
			onlineControllers = data.controllers.filter(c => {
				// Only count DEL/GND/TWR/APP/CTR (facility 2-6)
				if (c.facility < 2 || c.facility > 6) return false;
				
				// Extract location code from callsign (e.g., "PHX_TWR" -> "PHX", "ZLA_CTR" -> "ZLA")
				const locationCode = c.callsign.split('_')[0];
				
				// Include if it's one of our airports OR one of our ARTCCs
				return ourAirportCodes.has(locationCode) || ourARTCCs.has(locationCode);
			}).length;
			
			lastUpdate = new Date(data.general.update_timestamp).toLocaleTimeString();
			isLoading = false;
		} catch (error) {
			console.error('Failed to load VATSIM data:', error);
			isLoading = false;
		}
	}

	/**
	 * Auto-refresh VATSIM data every 30 seconds
	 * Uses Svelte 5 $effect() for reactive side effects with proper cleanup
	 */
	$effect(() => {
		loadVatsimData();
		// Refresh data every 30 seconds
		const interval = setInterval(loadVatsimData, 30000);
		return () => clearInterval(interval);
	});

	// Computed filter state object
	const filterState = $derived({
		selectedDeparture,
		selectedArrival,
		onlyDepartureWithATC,
		onlyArrivalWithATC,
		departureATCLevels,
		arrivalATCLevels
	});

	// Check if any filters are active
	const hasActiveFilters = $derived(checkActiveFilters(filterState));

	/**
	 * Filter routes based on selected criteria
	 * Only show routes if at least one filter is active (filter-first approach)
	 * 
	 * Key Design Decision: We return empty array when no filters are active to encourage
	 * users to actively select their criteria rather than being overwhelmed by 1,219 routes.
	 * This improves UX by making the tool purpose-driven rather than exploratory.
	 */
	const filteredRoutes = $derived.by(() => {
		if (!hasActiveFilters) {
			return [];
		}
		return filterRoutes(allRoutes, filterState, locationControllers);
	});

</script>

<svelte:head>
	<title>VATSIM Flight Scheduler - Virtual Southwest</title>
	<meta name="description" content="Find Southwest Airlines routes with active VATSIM ATC coverage" />
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Header -->
	<header class="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-white">
						VATSIM Flight Scheduler
					</h1>
					<p class="mt-0.5 text-sm text-gray-400">
						Virtual Southwest Airlines Routes
					</p>
				</div>
				<div class="flex items-center space-x-3">
					<NetworkStatus 
						{onlineControllers}
						{lastUpdate}
						{isLoading}
					/>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

		<!-- Routes Section -->
		<section class="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-800">
				<!-- Filter Controls -->
				<RouteFilterPanel 
					bind:selectedDeparture
					bind:selectedArrival
					bind:onlyDepartureWithATC
					bind:onlyArrivalWithATC
					bind:departureATCLevels
					bind:arrivalATCLevels
					{locationControllers}
				/>
			</div>

			<div class="p-6">
				{#if isLoading}
					<LoadingState />
				{:else if !hasActiveFilters}
					<!-- User Guide - Default View -->
					<div class="bg-blue-950/30 border border-blue-800/50 rounded-lg p-6" data-testid="user-guide">
						<h2 class="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
							</svg>
							How to Use
						</h2>
						<div class="text-sm text-gray-300 space-y-3">
							<p>
								<strong class="text-white">Select filters above</strong> to find Southwest Airlines routes with active VATSIM ATC coverage:
							</p>
							<ul class="list-disc list-inside space-y-1 ml-4 text-gray-400">
								<li><strong class="text-gray-300">Airports:</strong> Choose a departure or arrival airport to narrow down routes</li>
								<li><strong class="text-gray-300">ATC Coverage:</strong> Filter by airports with any online controllers, or select specific positions (Center, Approach, Tower, Ground, Delivery)</li>
								<li><strong class="text-gray-300">Live Data:</strong> Controller information updates automatically every 30 seconds from the VATSIM network</li>
							</ul>
							<div class="mt-4 pt-4 border-t border-blue-800/50">
								<p class="text-xs text-gray-500">
									<strong>Disclaimer:</strong> This is an unofficial tool for VATSIM virtual pilots. 
									It has no affiliation with Southwest Airlines and should not be used for real-world flight planning. 
									All route data is for simulation purposes only on the VATSIM network.
								</p>
							</div>
						</div>
					</div>
				{:else if filteredRoutes.length === 0}
					<EmptyState 
						title="No routes match your filters"
						subtitle="Try adjusting your filter settings or clearing some filters"
					/>
				{:else}
					<DepartureGroupedList routes={filteredRoutes} {locationControllers} />
				{/if}
			</div>
		</section>

		<!-- Footer Note -->
		<div class="mt-8 text-center text-sm text-gray-500">
			<p>
				{allRoutes.length} Southwest Airlines routes across {airports.length} airports 
				with live ATC status from VATSIM.
			</p>
			<p class="mt-2 text-xs text-gray-600">
				This is an unofficial tool for VATSIM virtual pilots. Not affiliated with Southwest Airlines.
			</p>
		</div>
	</main>
</div>