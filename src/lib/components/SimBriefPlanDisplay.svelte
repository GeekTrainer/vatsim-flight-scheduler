<script lang="ts">
	import type { SimBriefPlan } from '$lib/types/simbrief';
	import { formatFlightTime, formatFuel, formatAltitude, buildVatsimPrefileUrl, validatePlanMatchesRoute } from '$lib/simbrief';

	interface Props {
		plan: SimBriefPlan;
		departureIcao: string;
		arrivalIcao: string;
		onRefile: () => void;
		onClear: () => void;
	}

	let { plan, departureIcao, arrivalIcao, onRefile, onClear }: Props = $props();

	const routeMatches = $derived(validatePlanMatchesRoute(plan, departureIcao, arrivalIcao));
	const vatsimPrefileUrl = $derived(buildVatsimPrefileUrl(plan));
</script>

<div data-testid="simbrief-plan-display" class="card-subtle overflow-hidden">
	<!-- Header -->
	<div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<span class="text-sm font-bold text-gray-200">📋 SimBrief Flight Plan</span>
			<span class="text-xs text-gray-500">{plan.aircraft.name}</span>
		</div>
		<div class="flex items-center gap-2">
			<a
				href={vatsimPrefileUrl}
				target="_blank"
				data-testid="vatsim-prefile-link"
				class="px-3 py-1 text-xs font-semibold bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
			>
				Pre-file on VATSIM
			</a>
			<button
				onclick={onRefile}
				class="px-3 py-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
			>
				Re-file
			</button>
			<button
				onclick={onClear}
				class="px-3 py-1 text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors"
			>
				Clear
			</button>
		</div>
	</div>

	{#if !routeMatches}
		<div data-testid="simbrief-route-mismatch" class="px-4 py-2 bg-yellow-900/20 border-b border-yellow-800/50 text-yellow-400 text-xs">
			⚠️ This plan is for {plan.origin.icao_code}→{plan.destination.icao_code}, not {departureIcao}→{arrivalIcao}.
			<button onclick={onRefile} class="underline ml-1">File a new plan?</button>
		</div>
	{/if}

	<div class="p-4 space-y-4">
		<!-- Route -->
		<div>
			<div class="text-xs text-gray-400 mb-1">Route</div>
			<div data-testid="simbrief-route" class="bg-gray-900/70 rounded-lg p-2 font-mono text-xs text-gray-200 leading-relaxed border border-gray-700/50 overflow-x-auto">
				{plan.general.route}
			</div>
		</div>

		<!-- Key Stats Grid -->
		<div class="grid grid-cols-3 gap-3">
			<div>
				<div class="text-xs text-gray-400">Cruise</div>
				<div data-testid="simbrief-altitude" class="text-sm font-semibold text-gray-200">{formatAltitude(plan.general.initial_altitude)}</div>
			</div>
			<div>
				<div class="text-xs text-gray-400">Distance</div>
				<div data-testid="simbrief-distance" class="text-sm font-semibold text-gray-200">{plan.general.air_distance} nm</div>
			</div>
			<div>
				<div class="text-xs text-gray-400">Est. Time</div>
				<div data-testid="simbrief-time" class="text-sm font-semibold text-gray-200">{formatFlightTime(plan.times.est_time_enroute)}</div>
			</div>
		</div>

		<!-- Fuel & Weights -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<div class="text-xs text-gray-400 mb-1">Fuel</div>
				<div class="space-y-0.5 text-xs">
					<div class="flex justify-between">
						<span class="text-gray-400">Block</span>
						<span data-testid="simbrief-fuel-block" class="text-gray-200 font-medium">{formatFuel(plan.fuel.plan_ramp)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">Trip</span>
						<span class="text-gray-200 font-medium">{formatFuel(plan.fuel.enroute_burn)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">Reserve</span>
						<span class="text-gray-200 font-medium">{formatFuel(plan.fuel.reserve)}</span>
					</div>
				</div>
			</div>
			<div>
				<div class="text-xs text-gray-400 mb-1">Weights</div>
				<div class="space-y-0.5 text-xs">
					<div class="flex justify-between">
						<span class="text-gray-400">ZFW</span>
						<span data-testid="simbrief-zfw" class="text-gray-200 font-medium">{formatFuel(plan.weights.est_zfw)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">TOW</span>
						<span class="text-gray-200 font-medium">{formatFuel(plan.weights.est_tow)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">LDW</span>
						<span class="text-gray-200 font-medium">{formatFuel(plan.weights.est_ldw)}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- PDF link -->
		{#if plan.files?.pdf?.link}
			<div class="text-center">
				<a
					href={plan.files.pdf.link}
					target="_blank"
					data-testid="simbrief-ofp-link"
					class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
				>
					View full OFP (PDF) →
				</a>
			</div>
		{/if}
	</div>
</div>
