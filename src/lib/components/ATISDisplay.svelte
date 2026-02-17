<script lang="ts">
	import type { ATISInfo } from '$lib/types';
	import ATISSummary from './ATISSummary.svelte';
	import { parseATIS } from '$lib/utils/atis-parser';

	interface Props {
		vatsimAtis: ATISInfo | null;
		faaAtis: ATISInfo | null;
		otherVatsimAtis?: ATISInfo | null;
		otherFaaAtis?: ATISInfo | null;
		airportCode: string;
	}

	let { vatsimAtis, faaAtis, otherVatsimAtis = null, otherFaaAtis = null, airportCode }: Props = $props();

	let activeTab = $derived(vatsimAtis ? 'vatsim' as const : 'realworld' as const);
	let selectedTab = $state<'vatsim' | 'realworld' | null>(null);
	let currentTab = $derived(selectedTab ?? activeTab);

	// Parse ATIS text for summary display
	let currentAtis = $derived(currentTab === 'vatsim' ? vatsimAtis : faaAtis);
	let parsedAtis = $derived(currentAtis ? parseATIS(currentAtis.text) : null);

	// Other side's ATIS (only different for split ATIS airports)
	let currentOtherAtis = $derived(currentTab === 'vatsim' ? otherVatsimAtis : otherFaaAtis);
	let isSplitAtis = $derived(
		currentOtherAtis && currentAtis &&
		currentOtherAtis.atisType !== 'combined' &&
		currentOtherAtis.text !== currentAtis.text
	);
	let parsedOtherAtis = $derived(currentOtherAtis && isSplitAtis ? parseATIS(currentOtherAtis.text) : null);

	function atisTypeLabel(atis: ATISInfo): string | null {
		if (atis.atisType === 'arrival') return 'Arrival ATIS';
		if (atis.atisType === 'departure') return 'Departure ATIS';
		return null;
	}
</script>

<div data-testid="atis-display-{airportCode}" class="card-subtle overflow-hidden">
	<!-- Tab Bar -->
	<div class="flex border-b border-gray-700" role="tablist">
		<button
			data-testid="atis-tab-vatsim"
			role="tab"
			aria-selected={currentTab === 'vatsim'}
			onclick={() => selectedTab = 'vatsim'}
			class="flex-1 px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2
				{currentTab === 'vatsim' ? 'bg-blue-900/40 text-blue-300 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}"
		>
			<span class="text-base">🌐</span>
			VATSIM ATIS
			{#if vatsimAtis}
				<span class="w-2 h-2 bg-green-400 rounded-full"></span>
			{/if}
		</button>
		<button
			data-testid="atis-tab-realworld"
			role="tab"
			aria-selected={currentTab === 'realworld'}
			onclick={() => selectedTab = 'realworld'}
			class="flex-1 px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2
				{currentTab === 'realworld' ? 'bg-blue-900/40 text-blue-300 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}"
		>
			<span class="text-base">✈️</span>
			Real World
			{#if faaAtis}
				<span class="w-2 h-2 bg-green-400 rounded-full"></span>
			{/if}
		</button>
	</div>

	<!-- Tab Content -->
	<div class="p-4">
		{#if currentTab === 'vatsim'}
			<div data-testid="atis-content-vatsim">
				{#if vatsimAtis}
					<div class="space-y-3">
						<div class="flex items-center gap-3 flex-wrap">
							{#if vatsimAtis.code}
								<span data-testid="atis-code-{airportCode}" class="badge bg-blue-900/50 text-blue-300 border-blue-700">
									Info {vatsimAtis.code}
								</span>
							{/if}
							{#if atisTypeLabel(vatsimAtis)}
								<span class="badge bg-gray-700/50 text-gray-300 border-gray-600 text-xs">
									{atisTypeLabel(vatsimAtis)}
								</span>
							{/if}
							{#if vatsimAtis.frequency}
								<span class="text-xs text-gray-400">📻 {vatsimAtis.frequency}</span>
							{/if}
							{#if vatsimAtis.lastUpdated}
								<span class="text-xs text-gray-500">Updated {new Date(vatsimAtis.lastUpdated).toLocaleTimeString()}</span>
							{/if}
						</div>
						{#if parsedAtis}
							<ATISSummary {parsedAtis} />
						{/if}
						<div data-testid="atis-text-{airportCode}" class="bg-gray-900/70 rounded-lg p-3 font-mono text-sm text-gray-200 leading-relaxed border border-gray-700/50">
							{vatsimAtis.text}
						</div>
						{#if isSplitAtis && otherVatsimAtis}
							<div data-testid="atis-other-side" class="border-t border-gray-700 pt-3 mt-3">
								<div class="flex items-center gap-3 flex-wrap mb-2">
									{#if otherVatsimAtis.code}
										<span class="badge bg-blue-900/30 text-blue-400 border-blue-800 text-xs">
											Info {otherVatsimAtis.code}
										</span>
									{/if}
									<span class="badge bg-gray-700/50 text-gray-300 border-gray-600 text-xs">
										{atisTypeLabel(otherVatsimAtis)}
									</span>
								</div>
								{#if parsedOtherAtis}
									<ATISSummary parsedAtis={parsedOtherAtis} />
								{/if}
								<div class="bg-gray-900/70 rounded-lg p-3 font-mono text-sm text-gray-200 leading-relaxed border border-gray-700/50 mt-2">
									{otherVatsimAtis.text}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div data-testid="atis-empty-{airportCode}" class="text-center py-6 text-gray-500">
						<p class="text-sm">No VATSIM ATIS available</p>
						<p class="text-xs mt-1">No controller is currently broadcasting ATIS for this airport on the network</p>
					</div>
				{/if}
			</div>
		{:else}
			<div data-testid="atis-content-realworld">
				{#if faaAtis}
					<div class="space-y-3">
						<div class="flex items-center gap-3 flex-wrap">
							{#if faaAtis.code}
								<span data-testid="atis-code-{airportCode}" class="badge bg-green-900/50 text-green-300 border-green-700">
									Info {faaAtis.code}
								</span>
							{/if}
							{#if atisTypeLabel(faaAtis)}
								<span class="badge bg-gray-700/50 text-gray-300 border-gray-600 text-xs">
									{atisTypeLabel(faaAtis)}
								</span>
							{/if}
							<span class="text-xs text-gray-400">Source: FAA D-ATIS</span>
						</div>
						{#if parsedAtis}
							<ATISSummary {parsedAtis} />
						{/if}
						<div data-testid="atis-text-{airportCode}" class="bg-gray-900/70 rounded-lg p-3 font-mono text-sm text-gray-200 leading-relaxed border border-gray-700/50">
							{faaAtis.text}
						</div>
						{#if isSplitAtis && otherFaaAtis}
							<div data-testid="atis-other-side" class="border-t border-gray-700 pt-3 mt-3">
								<div class="flex items-center gap-3 flex-wrap mb-2">
									{#if otherFaaAtis.code}
										<span class="badge bg-green-900/30 text-green-400 border-green-800 text-xs">
											Info {otherFaaAtis.code}
										</span>
									{/if}
									<span class="badge bg-gray-700/50 text-gray-300 border-gray-600 text-xs">
										{atisTypeLabel(otherFaaAtis)}
									</span>
									<span class="text-xs text-gray-400">Source: FAA D-ATIS</span>
								</div>
								{#if parsedOtherAtis}
									<ATISSummary parsedAtis={parsedOtherAtis} />
								{/if}
								<div class="bg-gray-900/70 rounded-lg p-3 font-mono text-sm text-gray-200 leading-relaxed border border-gray-700/50 mt-2">
									{otherFaaAtis.text}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div data-testid="atis-empty-{airportCode}" class="text-center py-6 text-gray-500">
						<p class="text-sm">No FAA D-ATIS available</p>
						<p class="text-xs mt-1">Real-world ATIS data is not currently available for this airport</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
