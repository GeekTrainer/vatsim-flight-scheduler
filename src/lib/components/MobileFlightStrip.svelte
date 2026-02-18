<script lang="ts">
	import CenterTooltip from './CenterTooltip.svelte';
	import SimBriefButton from './SimBriefButton.svelte';
	import { formatFlightTime, formatFuel, formatAltitude, validatePlanMatchesRoute, buildVatsimPrefileUrl, checkVatsimFlightStatus } from '$lib/simbrief';
	import type { SimBriefPlan } from '$lib/types/simbrief';
	import type { EnrouteCenter } from '$lib/enroute';
	import type { LocationControllers } from '$lib/types';
	import type { VatsimFlightStatus } from '$lib/simbrief';

	interface Props {
		departureIcao: string;
		arrivalIcao: string;
		simbriefPlan: SimBriefPlan | null;
		enrouteCenters: EnrouteCenter[];
		locationControllers: LocationControllers;
		vatsimFlightStatus: VatsimFlightStatus;
		onPlanLoaded: (plan: SimBriefPlan) => void;
		onRefile: () => void;
		onClear: () => void;
	}

	let {
		departureIcao, arrivalIcao, simbriefPlan, enrouteCenters,
		locationControllers, vatsimFlightStatus,
		onPlanLoaded, onRefile, onClear
	}: Props = $props();

	let isExpanded = $state(false);

	const routeMatches = $derived(
		simbriefPlan ? validatePlanMatchesRoute(simbriefPlan, departureIcao, arrivalIcao) : true
	);
</script>

<div class="card-themed px-4 py-3 space-y-2">
	{#if simbriefPlan}
		<!-- With plan: header row -->
		<button
			onclick={() => isExpanded = !isExpanded}
			class="w-full"
		>
			<!-- Callsign + Route -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-sm">
					<span class="font-bold text-white">{simbriefPlan.general.icao_airline}{simbriefPlan.general.flight_number}</span>
					<span class="text-gray-500">·</span>
					<span class="text-gray-400 text-xs">{simbriefPlan.aircraft.icaocode}</span>
				</div>
				<div class="flex items-center gap-2 text-sm">
					<span class="font-bold text-blue-300">{departureIcao}</span>
					<span class="text-gray-500">→</span>
					<span class="font-bold text-green-400">{arrivalIcao}</span>
					<svg
						class="w-4 h-4 text-gray-500 transition-transform {isExpanded ? 'rotate-180' : ''}"
						fill="none" stroke="currentColor" viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</div>
			</div>
			<!-- Key stats + alternate -->
			<div class="flex items-center justify-between mt-1">
				<div class="flex items-center gap-3 text-xs text-gray-300">
					<span class="font-semibold">{formatAltitude(simbriefPlan.general.initial_altitude)}</span>
					<span>M{simbriefPlan.general.cruise_mach}</span>
					<span>{formatFlightTime(simbriefPlan.times.est_time_enroute)}</span>
				</div>
				{#if simbriefPlan.alternate?.icao_code}
					<span class="text-yellow-400/70 text-[10px]">ALTN: {simbriefPlan.alternate.icao_code}</span>
				{/if}
			</div>
		</button>

		<!-- Enroute centers (always visible) -->
		{#if enrouteCenters.length > 0}
			<div class="flex items-center gap-1">
				{#each enrouteCenters as center, i (center.artcc)}
					{#if i > 0}
						<div class="flex-1 border-t {center.online || enrouteCenters[i-1].online ? 'border-green-600/40' : 'border-gray-700/50'} min-w-[8px]"></div>
					{/if}
					<CenterTooltip {center} {locationControllers} />
				{/each}
			</div>
		{/if}

		<!-- Expanded detail -->
		{#if isExpanded}
			<div class="pt-2 border-t border-gray-700/50 space-y-2">
				<!-- Route -->
				<div class="font-mono text-[10px] text-gray-400 leading-relaxed break-all text-center">
					{simbriefPlan.general.route}
				</div>

				<!-- Fuel & Weights grid -->
				<div class="grid grid-cols-3 gap-2 text-xs text-center">
					<div>
						<div class="text-gray-500">Block</div>
						<div class="text-gray-200 font-semibold">{formatFuel(simbriefPlan.fuel.plan_ramp)}</div>
					</div>
					<div>
						<div class="text-gray-500">Trip</div>
						<div class="text-gray-200 font-semibold">{formatFuel(simbriefPlan.fuel.enroute_burn)}</div>
					</div>
					<div>
						<div class="text-gray-500">CI</div>
						<div class="text-gray-200 font-semibold">{simbriefPlan.general.costindex}</div>
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
				</div>

				{#if !routeMatches}
					<div class="text-xs text-yellow-400 bg-yellow-900/20 rounded px-2 py-1">
						⚠️ Plan is for {simbriefPlan.origin.icao_code}→{simbriefPlan.destination.icao_code}
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex items-center justify-center gap-2 pt-1">
					{#if vatsimFlightStatus === 'connected'}
						<span class="px-3 py-1.5 text-xs font-semibold bg-green-600/30 text-green-300 border border-green-700 rounded">✓ Connected</span>
					{:else if vatsimFlightStatus === 'prefiled'}
						<span class="px-3 py-1.5 text-xs font-semibold bg-blue-600/30 text-blue-300 border border-blue-700 rounded">✓ Filed</span>
					{:else}
						<a
							href={buildVatsimPrefileUrl(simbriefPlan)}
							target="_blank"
							class="px-3 py-1.5 text-xs font-semibold bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
						>
							Pre-file VATSIM
						</a>
					{/if}
					<button onclick={onRefile} class="text-xs text-blue-400">Re-file</button>
					<button onclick={onClear} class="text-xs text-gray-600">✕</button>
				</div>
			</div>
		{/if}
	{:else}
		<!-- No plan: show route + SimBrief buttons -->
		<div class="flex items-center justify-between">
			<div class="text-sm">
				<span class="font-bold text-blue-300">{departureIcao}</span>
				<span class="text-gray-500 mx-1">→</span>
				<span class="font-bold text-green-400">{arrivalIcao}</span>
			</div>
			<SimBriefButton {departureIcao} {arrivalIcao} onPlanLoaded={onPlanLoaded} />
		</div>

		<!-- Enroute centers -->
		{#if enrouteCenters.length > 0}
			<div class="flex items-center gap-1">
				{#each enrouteCenters as center, i (center.artcc)}
					{#if i > 0}
						<div class="flex-1 border-t {center.online || enrouteCenters[i-1].online ? 'border-green-600/40' : 'border-gray-700/50'} min-w-[8px]"></div>
					{/if}
					<CenterTooltip {center} {locationControllers} />
				{/each}
			</div>
		{/if}
	{/if}
</div>
