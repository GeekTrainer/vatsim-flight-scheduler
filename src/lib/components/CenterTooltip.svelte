<script lang="ts">
	import type { EnrouteCenter } from '$lib/enroute';
	import { getCenterControllers } from '$lib/enroute';
	import type { LocationControllers } from '$lib/types';

	interface Props {
		center: EnrouteCenter;
		locationControllers: LocationControllers;
	}

	let { center, locationControllers }: Props = $props();

	let showTooltip = $state(false);
	let tooltipEl: HTMLDivElement | undefined = $state();

	const controllers = $derived(getCenterControllers(center.artcc, locationControllers));

	function handleClick(e: Event) {
		e.stopPropagation();
		showTooltip = !showTooltip;
	}

	function handleClickOutside(e: Event) {
		if (tooltipEl && !tooltipEl.contains(e.target as Node)) {
			showTooltip = false;
		}
	}

	$effect(() => {
		if (showTooltip) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative flex items-center gap-1 shrink-0 cursor-pointer select-none"
	onmouseenter={() => showTooltip = true}
	onmouseleave={() => showTooltip = false}
	onclick={handleClick}
	bind:this={tooltipEl}
>
	<!-- Badge -->
	<span class="w-1.5 h-1.5 rounded-full {center.online ? 'bg-green-400' : 'bg-gray-600'}"></span>
	<span class="text-[10px] font-semibold {center.online ? 'text-green-300' : 'text-gray-500'}">{center.artcc}</span>
	{#if center.controllerCount > 1}
		<span class="text-[9px] text-gray-400">({center.controllerCount})</span>
	{/if}

	<!-- Tooltip -->
	{#if showTooltip}
		<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
			<div class="bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-3 py-2 min-w-[180px] pointer-events-auto">
				<!-- Center name -->
				<div class="text-xs font-bold text-gray-100">{center.name}</div>
				<div class="text-[10px] text-gray-400">{center.artcc}</div>

				<!-- Status -->
				{#if center.online}
					<div class="text-[10px] text-green-400 mt-1">
						{center.controllerCount} controller{center.controllerCount > 1 ? 's' : ''} online
					</div>

					<!-- Controller list -->
					{#if controllers.length > 0}
						<div class="mt-1.5 pt-1.5 border-t border-gray-700 space-y-1">
							{#each controllers as ctrl (ctrl.callsign)}
								<div class="flex justify-between gap-3 text-[10px]">
									<span class="text-gray-300 font-medium">{ctrl.callsign}</span>
									<span class="text-gray-400 font-mono">{ctrl.frequency}</span>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="text-[10px] text-gray-500 mt-1">No controllers online</div>
				{/if}
			</div>
			<!-- Arrow -->
			<div class="w-2 h-2 bg-gray-800 border-r border-b border-gray-600 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
		</div>
	{/if}
</div>
