<!--
	EmptyState.svelte
	
	Empty state message display.
	Shows a message when no items match the current criteria.
	
	Props:
	- title: Main message to display
	- subtitle: Optional secondary message with additional context
-->
<script lang="ts">
	let { 
		title,
		subtitle
	}: {
		title: string;
		subtitle?: string;
	} = $props();
</script>

<div class="flex items-center justify-center py-12">
	<div class="text-center">
		<p class="text-gray-400 text-lg">{title}</p>
		{#if subtitle}
			<p class="text-gray-500 text-sm mt-2">{subtitle}</p>
		{/if}
	</div>
</div>
