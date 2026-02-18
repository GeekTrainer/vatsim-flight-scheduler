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
	let filtersExpanded = $state(true);

	async function loadVatsimData() {
		try {
			const data = await fetchVatsimData();
			locationControllers = getLocationControllers(data.controllers);
			
			// Count only controllers at our swa network airports
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

	// Count active filters and build summary for collapsed mobile view
	const activeFilterCount = $derived.by(() => {
		let count = 0;
		if (selectedDeparture) count++;
		if (selectedArrival) count++;
		if (onlyDepartureWithATC) count++;
		if (onlyArrivalWithATC) count++;
		if (departureATCLevels.length > 0) count++;
		if (arrivalATCLevels.length > 0) count++;
		return count;
	});

	const filterSummary = $derived.by(() => {
		const parts: string[] = [];
		if (selectedDeparture) parts.push(`From: ${selectedDeparture}`);
		if (selectedArrival) parts.push(`To: ${selectedArrival}`);
		if (onlyDepartureWithATC) parts.push('Dep ATC');
		if (onlyArrivalWithATC) parts.push('Arr ATC');
		if (departureATCLevels.length > 0) parts.push(`Dep: ${departureATCLevels.join(', ')}`);
		if (arrivalATCLevels.length > 0) parts.push(`Arr: ${arrivalATCLevels.join(', ')}`);
		return parts.join(' • ');
	});

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
	<title>VATSIM Flight Scheduler - Virtual SWA</title>
	<meta name="description" content="Find Virtual SWA Airlines routes with active VATSIM ATC coverage" />
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Header -->
	<header class="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-3">
			<div class="flex items-center justify-between gap-4">
				<h1 class="text-base sm:text-2xl font-bold text-white">
					<span class="sm:hidden">VATSIM Scheduler</span>
					<span class="hidden sm:inline">VATSIM Flight Scheduler</span>
				</h1>
				<!-- Network status: hidden on mobile, shown on sm+ -->
				<div class="hidden sm:flex items-center space-x-3">
					<NetworkStatus 
						{onlineControllers}
						{lastUpdate}
						{isLoading}
					/>
					<a href="/settings" class="text-gray-400 hover:text-gray-200 transition-colors" title="Settings">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</a>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-2 sm:py-4">

		<!-- Routes Section -->
		<section class="bg-gray-900 sm:border sm:border-gray-800 sm:rounded-lg overflow-hidden">
			<div class="px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-800">
				<!-- Mobile: Toggle button for filters -->
				<button
					data-testid="filter-toggle"
					onclick={() => filtersExpanded = !filtersExpanded}
					class="sm:hidden w-full flex items-center justify-between py-1 text-left"
				>
					<div class="flex items-center gap-2">
						<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
						</svg>
						<span class="text-sm font-semibold text-gray-200">Filter Routes</span>
						{#if activeFilterCount > 0}
							<span class="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" data-testid="filter-count-badge">
								{activeFilterCount}
							</span>
						{/if}
					</div>
					<svg
						class="w-5 h-5 text-gray-400 transition-transform {filtersExpanded ? 'rotate-180' : ''}"
						fill="none" stroke="currentColor" viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				<!-- Mobile: Active filter summary when collapsed -->
				{#if !filtersExpanded && hasActiveFilters}
					<div class="sm:hidden text-xs text-gray-400 mt-1 truncate" data-testid="filter-summary">
						{filterSummary}
					</div>
				{/if}

				<!-- Filter Controls: always visible on sm+, toggled on mobile -->
				<div class="{filtersExpanded ? '' : 'hidden'} sm:block" data-testid="filter-panel-content">
					<div class="mt-1 sm:mt-0">
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
				</div>
			</div>

			<div class="p-3 sm:p-6">
				{#if isLoading}
					<LoadingState />
				{:else if !hasActiveFilters}
					<!-- User Guide - Default View -->
					<div class="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3 sm:p-6" data-testid="user-guide">
						<h2 class="text-base sm:text-lg font-semibold text-blue-300 mb-2 sm:mb-3 flex items-center gap-2">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
							</svg>
							How to Use
						</h2>
						<div class="text-xs sm:text-sm text-gray-300 space-y-2 sm:space-y-3">
							<p>
								<strong class="text-white">Select filters above</strong> to find Virtual SWA routes with active VATSIM ATC coverage:
							</p>
							<ul class="list-disc list-inside space-y-0.5 sm:space-y-1 sm:ml-4 text-gray-400">
								<li><strong class="text-gray-300">Airports:</strong> Choose a departure or arrival airport to narrow down routes</li>
								<li><strong class="text-gray-300">ATC Coverage:</strong> Filter by airports with any online controllers, or select specific positions (CTR, APP, TWR, GND, DEL)</li>
								<li><strong class="text-gray-300">Live Data:</strong> Controller information updates automatically every 30 seconds from the VATSIM network</li>
							</ul>
							<div class="mt-4 pt-4 border-t border-blue-800/50">
								<p class="text-xs text-gray-500">
									<strong>Disclaimer:</strong> This is an unofficial tool for VATSIM virtual pilots. 
									It has no affiliation with Southwest Airlines, and not to be used for real-world flight planning. 
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
			<!-- Network status on mobile -->
			<div class="sm:hidden flex justify-center mb-3">
				<NetworkStatus 
					{onlineControllers}
					{lastUpdate}
					{isLoading}
				/>
			</div>
			<p>
				{allRoutes.length} Virtual SWA routes across {airports.length} airports 
				with live status from VATSIM.
			</p>
			<p class="mt-2 text-xs text-gray-600">
				This is an unofficial tool for VATSIM virtual pilots. Not affiliated with Southwest Airlines or VATSIM.
			</p>
		</div>
	</main>
</div>
