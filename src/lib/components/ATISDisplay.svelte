<script lang="ts">
	import type { ATISInfo } from '$lib/types';

	interface Props {
		vatsimAtis: ATISInfo | null;
		faaAtis: ATISInfo | null;
		airportCode: string;
	}

	let { vatsimAtis, faaAtis, airportCode }: Props = $props();

	let activeTab = $derived(vatsimAtis ? 'vatsim' as const : 'realworld' as const);
	let selectedTab = $state<'vatsim' | 'realworld' | null>(null);
	let currentTab = $derived(selectedTab ?? activeTab);
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
							{#if vatsimAtis.frequency}
								<span class="text-xs text-gray-400">📻 {vatsimAtis.frequency}</span>
							{/if}
							{#if vatsimAtis.lastUpdated}
								<span class="text-xs text-gray-500">Updated {new Date(vatsimAtis.lastUpdated).toLocaleTimeString()}</span>
							{/if}
						</div>
						<div data-testid="atis-text-{airportCode}" class="bg-gray-900/70 rounded-lg p-3 font-mono text-sm text-gray-200 leading-relaxed border border-gray-700/50">
							{vatsimAtis.text}
						</div>
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
							<span class="text-xs text-gray-400">Source: FAA D-ATIS</span>
						</div>
						<div data-testid="atis-text-{airportCode}" class="bg-gray-900/70 rounded-lg p-3 font-mono text-sm text-gray-200 leading-relaxed border border-gray-700/50">
							{faaAtis.text}
						</div>
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
