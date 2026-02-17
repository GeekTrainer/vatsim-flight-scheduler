<script lang="ts">
	import ATCStatusDisplay from '$lib/components/ATCStatusDisplay.svelte';
	import ATISDisplay from '$lib/components/ATISDisplay.svelte';
	import FlightAirportCard from '$lib/components/FlightAirportCard.svelte';
	import SimBriefButton from '$lib/components/SimBriefButton.svelte';
	import SimBriefPlanDisplay from '$lib/components/SimBriefPlanDisplay.svelte';
	import { fetchVatsimData, getLocationControllers, getVatsimATIS } from '$lib/vatsim';
	import { fetchFAADatis } from '$lib/atis';
	import { formatFlightTime, formatFuel, formatAltitude, validatePlanMatchesRoute, buildVatsimPrefileUrl, getStoredVatsimCid, checkVatsimFlightStatus } from '$lib/simbrief';
	import { detectEnrouteCenters, getBasicEnrouteCenters } from '$lib/enroute';
	import type { LocationControllers, ATISInfo } from '$lib/types';
	import type { VatsimATIS, VatsimData } from '$lib/types/vatsim';
	import type { SimBriefPlan } from '$lib/types/simbrief';

	let { data } = $props();

	let locationControllers = $state<LocationControllers>(new Map());
	let atisStations = $state<VatsimATIS[]>([]);
	let vatsimRawData = $state<{ pilots: any[]; prefiles: any[] }>({ pilots: [], prefiles: [] });
	let departureFaaAtis = $state<ATISInfo | null>(null);
	let arrivalFaaAtis = $state<ATISInfo | null>(null);
	let departureOtherFaaAtis = $state<ATISInfo | null>(null);
	let arrivalOtherFaaAtis = $state<ATISInfo | null>(null);
	let isLoading = $state(true);
	let vatsimCid = $state('');

	import { onMount } from 'svelte';
	onMount(() => {
		vatsimCid = getStoredVatsimCid() || '';
	});

	// Primary ATIS for each side (role-specific)
	let departureVatsimAtis = $derived(getVatsimATIS(atisStations, data.departure.icao, 'departure'));
	let arrivalVatsimAtis = $derived(getVatsimATIS(atisStations, data.arrival.icao, 'arrival'));

	// Other side's ATIS for situational awareness (only shown for split ATIS airports)
	let departureOtherVatsimAtis = $derived(getVatsimATIS(atisStations, data.departure.icao, 'arrival'));
	let arrivalOtherVatsimAtis = $derived(getVatsimATIS(atisStations, data.arrival.icao, 'departure'));

	// VATSIM flight status (prefiled / connected / not filed)
	let vatsimFlightStatus = $derived(
		vatsimCid ? checkVatsimFlightStatus(vatsimRawData, vatsimCid) : 'not-filed' as const
	);

	async function loadVatsimData() {
		try {
			const vatsimData = await fetchVatsimData();
			locationControllers = getLocationControllers(vatsimData.controllers);
			atisStations = vatsimData.atis;
			vatsimRawData = { pilots: vatsimData.pilots, prefiles: vatsimData.prefiles };
			isLoading = false;
		} catch (error) {
			console.error('Failed to load VATSIM data:', error);
			isLoading = false;
		}
	}

	$effect(() => {
		loadVatsimData();
		loadFaaAtis();
		const interval = setInterval(loadVatsimData, 30000);
		return () => clearInterval(interval);
	});

	async function loadFaaAtis() {
		const [depAtis, arrAtis, depOtherAtis, arrOtherAtis] = await Promise.all([
			fetchFAADatis(data.departure.icao, 'departure'),
			fetchFAADatis(data.arrival.icao, 'arrival'),
			fetchFAADatis(data.departure.icao, 'arrival'),
			fetchFAADatis(data.arrival.icao, 'departure')
		]);
		departureFaaAtis = depAtis;
		arrivalFaaAtis = arrAtis;
		departureOtherFaaAtis = depOtherAtis;
		arrivalOtherFaaAtis = arrOtherAtis;
	}

	// Mobile: independent expand/collapse, both collapsed by default
	let depExpanded = $state(false);
	let arrExpanded = $state(false);

	// SimBrief integration
	let simbriefPlan = $state<SimBriefPlan | null>(null);

	// Enroute centers: use SimBrief navlog when available, fallback to airport ARTCCs
	let enrouteCenters = $derived.by(() => {
		if (simbriefPlan?.navlog?.fix?.length) {
			return detectEnrouteCenters(
				simbriefPlan.navlog.fix,
				data.departure.artcc,
				data.arrival.artcc,
				locationControllers
			);
		}
		return getBasicEnrouteCenters(data.departure.artcc, data.arrival.artcc, locationControllers);
	});

	function handlePlanLoaded(plan: SimBriefPlan) {
		simbriefPlan = plan;
	}

	function handleRefile() {
		simbriefPlan = null;
	}

	function handleClearPlan() {
		simbriefPlan = null;
	}
</script>

<svelte:head>
	<title>{data.departure.icao} → {data.arrival.icao} | VATSIM Flight Scheduler</title>
</svelte:head>

<div data-testid="flight-page" class="min-h-screen bg-gray-950">
	<!-- Header -->
	<header class="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1 sm:py-1.5">
			<div class="flex items-center gap-3">
				<a
					href="/"
					data-testid="flight-back-link"
					class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 shrink-0"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</a>
				<h1 class="text-sm font-bold text-white truncate flex-1">
					{data.departure.icao}
					<span class="text-gray-500 mx-1">→</span>
					{data.arrival.icao}
				</h1>
				<a href="/settings" class="text-gray-400 hover:text-gray-200 transition-colors shrink-0" title="Settings">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</a>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
		{#if isLoading}
			<div class="flex flex-col items-center justify-center py-12 gap-4">
				<div class="spinner"></div>
				<p class="text-xs text-gray-700">For VATSIM simulation use only. Not for real-world flight planning or navigation.</p>
			</div>
		{:else}
			<!-- Flight Strip -->
			<div class="hidden md:block">
				<div class="card-themed px-5 py-3">
					<div class="flex items-center gap-4">
						<!-- Callsign -->
						{#if simbriefPlan}
							<div class="shrink-0">
								<div class="text-sm font-bold text-white">{simbriefPlan.general.icao_airline}{simbriefPlan.general.flight_number}</div>
								<div class="text-[10px] text-gray-500">{simbriefPlan.aircraft.icaocode}</div>
							</div>
							<div class="w-px h-10 bg-gray-700"></div>
						{/if}

						<!-- Departure -->
						<div class="text-center min-w-[100px]">
							<div class="text-2xl font-bold text-blue-300" data-testid="flight-departure-code">{data.departure.icao}</div>
							<div class="text-[10px] text-gray-500 truncate">{data.departure.city}</div>
						</div>

						<!-- Arrow + Route info -->
						<div class="flex-1 flex items-center gap-3">
							<svg class="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
							{#if simbriefPlan}
								<div class="flex items-center gap-4 text-xs text-gray-300 flex-1 min-w-0">
									<span class="font-mono text-gray-400 truncate flex-1" title={simbriefPlan.general.route}>
										{simbriefPlan.general.route}{#if simbriefPlan.alternate?.icao_code} &nbsp; <span class="text-yellow-400/70">(ALTN: {simbriefPlan.alternate.icao_code})</span>{/if}
									</span>
									<span class="shrink-0 font-semibold">{formatAltitude(simbriefPlan.general.initial_altitude)}</span>
									<span class="shrink-0">M{simbriefPlan.general.cruise_mach}</span>
									<span class="shrink-0">{formatFlightTime(simbriefPlan.times.est_time_enroute)}</span>
								</div>
							{:else}
								<div class="flex-1 border-t border-dashed border-gray-700"></div>
							{/if}
						</div>

						<!-- Arrival -->
						<div class="text-center min-w-[100px]">
							<div class="text-2xl font-bold text-green-400" data-testid="flight-arrival-code">{data.arrival.icao}</div>
							<div class="text-[10px] text-gray-500 truncate">{data.arrival.city}</div>
						</div>

						<!-- Divider -->
						<div class="w-px h-10 bg-gray-700"></div>

						<!-- SimBrief Actions -->
						<div class="shrink-0">
							{#if simbriefPlan}
								<div class="flex items-center gap-2">
									{#if vatsimFlightStatus === 'connected'}
										<span data-testid="vatsim-status" class="px-3 py-1.5 text-xs font-semibold bg-green-600/30 text-green-300 border border-green-700 rounded">
											✓ Connected
										</span>
									{:else if vatsimFlightStatus === 'prefiled'}
										<span data-testid="vatsim-status" class="px-3 py-1.5 text-xs font-semibold bg-blue-600/30 text-blue-300 border border-blue-700 rounded">
											✓ Filed
										</span>
									{:else}
										<a
											href={buildVatsimPrefileUrl(simbriefPlan)}
											target="_blank"
											data-testid="vatsim-prefile-link"
											class="px-3 py-1.5 text-xs font-semibold bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
										>
											Pre-file VATSIM
										</a>
									{/if}
									<button onclick={handleRefile} class="text-xs text-blue-400 hover:text-blue-300">Re-file</button>
									<button onclick={handleClearPlan} class="text-xs text-gray-600 hover:text-gray-400">✕</button>
								</div>
							{:else}
								<SimBriefButton
									departureIcao={data.departure.icao}
									arrivalIcao={data.arrival.icao}
									onPlanLoaded={handlePlanLoaded}
								/>
							{/if}
						</div>
					</div>

					{#if simbriefPlan}
						<!-- Enroute Centers -->
						{#if enrouteCenters.length > 0}
							<div class="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-1">
								<span class="text-[10px] text-gray-500 uppercase tracking-wide mr-1 shrink-0">Enroute</span>
								{#each enrouteCenters as center, i (center.artcc)}
									{#if i > 0}
										<div class="flex-1 border-t {center.online || enrouteCenters[i-1].online ? 'border-green-600/40' : 'border-gray-700/50'} min-w-[16px]"></div>
									{/if}
									<div class="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded {center.online ? 'bg-green-900/30' : ''}">
										<span class="w-1.5 h-1.5 rounded-full {center.online ? 'bg-green-400' : 'bg-gray-600'}"></span>
										<span class="text-xs font-semibold {center.online ? 'text-green-300' : 'text-gray-500'}">{center.artcc}</span>
										{#if center.controllerCount > 1}
											<span class="text-[10px] text-gray-400">({center.controllerCount})</span>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<!-- Fuel & Weights -->
						<div class="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-6 gap-3 text-xs text-center">
							<div>
								<div class="text-gray-500">Block Fuel</div>
								<div class="text-gray-200 font-semibold">{formatFuel(simbriefPlan.fuel.plan_ramp)}</div>
							</div>
							<div>
								<div class="text-gray-500">Trip Fuel</div>
								<div class="text-gray-200 font-semibold">{formatFuel(simbriefPlan.fuel.enroute_burn)}</div>
							</div>
							<div>
								<div class="text-gray-500">ZFW</div>
								<div class="text-gray-200 font-semibold">{formatFuel(simbriefPlan.weights.est_zfw)}</div>
							</div>
							<div>
								<div class="text-gray-500">TOW</div>
								<div class="text-gray-200 font-semibold">{formatFuel(simbriefPlan.weights.est_tow)}</div>
							</div>
							<div>
								<div class="text-gray-500">LDW</div>
								<div class="text-gray-200 font-semibold">{formatFuel(simbriefPlan.weights.est_ldw)}</div>
							</div>
							<div>
								<div class="text-gray-500">Cost Index</div>
								<div class="text-gray-200 font-semibold">CI {simbriefPlan.general.costindex}</div>
							</div>
						</div>
						{#if !validatePlanMatchesRoute(simbriefPlan, data.departure.icao, data.arrival.icao)}
							<div data-testid="simbrief-route-mismatch" class="mt-2 text-xs text-yellow-400 bg-yellow-900/20 rounded px-3 py-1.5">
								⚠️ This plan is for {simbriefPlan.origin.icao_code}→{simbriefPlan.destination.icao_code}, not this route.
								<button onclick={handleRefile} class="underline ml-1">File a new plan?</button>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Mobile: Stacked collapsible cards -->
			<div class="md:hidden space-y-3">
				<FlightAirportCard
					airport={data.departure}
					role="departure"
					{locationControllers}
					vatsimAtis={departureVatsimAtis}
					faaAtis={departureFaaAtis}
					otherVatsimAtis={departureOtherVatsimAtis}
					otherFaaAtis={departureOtherFaaAtis}
					isExpanded={depExpanded}
					onToggle={() => depExpanded = !depExpanded}
				/>
				<FlightAirportCard
					airport={data.arrival}
					role="arrival"
					{locationControllers}
					vatsimAtis={arrivalVatsimAtis}
					faaAtis={arrivalFaaAtis}
					otherVatsimAtis={arrivalOtherVatsimAtis}
					otherFaaAtis={arrivalOtherFaaAtis}
					isExpanded={arrExpanded}
					onToggle={() => arrExpanded = !arrExpanded}
				/>
			</div>

			<!-- Desktop: Two-column grid with aligned rows -->
			<div data-testid="desktop-layout" class="hidden md:grid grid-cols-2 gap-x-6 gap-y-4" style="grid-template-rows: auto auto;">
				<!-- Row 1: ATC Coverage -->
				<div class="card-subtle p-4" data-testid="flight-departure-section">
					<h3 class="text-sm font-semibold text-gray-300 mb-3">ATC Coverage — {data.departure.icao}</h3>
					<ATCStatusDisplay
						icao={data.departure.icao}
						artcc={data.departure.artcc}
						{locationControllers}
					/>
				</div>
				<div class="card-subtle p-4" data-testid="flight-arrival-section">
					<h3 class="text-sm font-semibold text-gray-300 mb-3">ATC Coverage — {data.arrival.icao}</h3>
					<ATCStatusDisplay
						icao={data.arrival.icao}
						artcc={data.arrival.artcc}
						{locationControllers}
					/>
				</div>

				<!-- Row 3: ATIS Information -->
				<div>
					<h3 class="text-sm font-semibold text-gray-300 mb-3">ATIS Information</h3>
					<ATISDisplay
						vatsimAtis={departureVatsimAtis}
						faaAtis={departureFaaAtis}
						otherVatsimAtis={departureOtherVatsimAtis}
						otherFaaAtis={departureOtherFaaAtis}
						airportCode={data.departure.icao}
					/>
				</div>
				<div>
					<h3 class="text-sm font-semibold text-gray-300 mb-3">ATIS Information</h3>
					<ATISDisplay
						vatsimAtis={arrivalVatsimAtis}
						faaAtis={arrivalFaaAtis}
						otherVatsimAtis={arrivalOtherVatsimAtis}
						otherFaaAtis={arrivalOtherFaaAtis}
						airportCode={data.arrival.icao}
					/>
				</div>
			</div>
		{/if}

		<!-- Footer -->
		<div class="text-center text-xs text-gray-600 pt-4">
			<p>VATSIM data refreshes every 30 seconds. Real World ATIS sourced from FAA D-ATIS.</p>
			<p class="mt-1 text-gray-700">For VATSIM simulation use only. Not for real-world flight planning or navigation.</p>
		</div>
	</main>
</div>
