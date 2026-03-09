<script lang="ts">
	import { getStoredUsername, storeUsername, clearStoredUsername, getStoredVatsimCid, storeVatsimCid, clearStoredVatsimCid } from '$lib/simbrief';
	import { onMount } from 'svelte';

	let username = $state('');
	let vatsimCid = $state('');
	let saved = $state(false);

	onMount(() => {
		username = getStoredUsername() || '';
		vatsimCid = getStoredVatsimCid() || '';
	});

	function save() {
		const trimmedUsername = username.trim();
		if (trimmedUsername) {
			storeUsername(trimmedUsername);
		} else {
			clearStoredUsername();
		}

		const trimmedCid = vatsimCid.trim();
		if (trimmedCid) {
			storeVatsimCid(trimmedCid);
		} else {
			clearStoredVatsimCid();
		}

		saved = true;
		setTimeout(() => saved = false, 2000);
	}

	function clear() {
		clearStoredUsername();
		clearStoredVatsimCid();
		username = '';
		vatsimCid = '';
		saved = true;
		setTimeout(() => saved = false, 2000);
	}
</script>

<svelte:head>
	<title>Settings | VATSIM Flight Scheduler</title>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<header class="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
			<div class="flex items-center gap-4">
				<button
					onclick={() => history.back()}
					class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 shrink-0"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</button>
				<h1 class="text-sm font-bold text-white">Settings</h1>
			</div>
		</div>
	</header>

	<main class="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-8">
		<!-- SimBrief Section -->
		<section class="space-y-4">
			<div>
				<h2 class="text-lg font-bold text-gray-200">SimBrief</h2>
				<p class="text-sm text-gray-400 mt-1">Connect your SimBrief account to generate and load flight plans directly from the flight page.</p>
			</div>

			<div class="card-subtle p-4 space-y-4">
				<div>
					<label for="simbrief-username" class="text-sm font-semibold text-gray-300 block mb-1">SimBrief Username</label>
					<p class="text-xs text-gray-500 mb-2">
						Your SimBrief username — the same one you use to log in at
						<a href="https://dispatch.simbrief.com" target="_blank" class="text-blue-400 hover:text-blue-300">dispatch.simbrief.com</a>.
					</p>
					<div class="flex gap-2">
						<input
							id="simbrief-username"
							data-testid="settings-simbrief-username"
							type="text"
							bind:value={username}
							placeholder="Enter your SimBrief username"
							class="form-input text-sm flex-1"
							onkeydown={(e) => e.key === 'Enter' && save()}
						/>
						<button
							data-testid="settings-simbrief-save"
							onclick={save}
							class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
						>
							Save
						</button>
						{#if username}
							<button
								data-testid="settings-clear"
								onclick={clear}
								class="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-300 transition-colors"
							>
								Clear
							</button>
						{/if}
					</div>
					{#if saved}
						<p data-testid="settings-saved-message" class="text-xs text-green-400 mt-2">✓ Saved</p>
					{/if}
				</div>

				<div class="text-xs text-gray-600 border-t border-gray-700 pt-3">
					Don't have SimBrief? <a href="https://www.simbrief.com/home/?page=register" target="_blank" class="text-blue-400 hover:text-blue-300">Create a free account</a> — it's the most popular flight planning tool for flight simulation.
				</div>
			</div>
		</section>

		<!-- VATSIM Section -->
		<section class="space-y-4">
			<div>
				<h2 class="text-lg font-bold text-gray-200">VATSIM</h2>
				<p class="text-sm text-gray-400 mt-1">Your VATSIM CID lets us check your flight plan filing status in real time.</p>
			</div>

			<div class="card-subtle p-4 space-y-4">
				<div>
					<label for="vatsim-cid" class="text-sm font-semibold text-gray-300 block mb-1">VATSIM CID</label>
					<p class="text-xs text-gray-500 mb-2">
						Your numeric VATSIM ID — find it at
						<a href="https://my.vatsim.net" target="_blank" class="text-blue-400 hover:text-blue-300">my.vatsim.net</a>.
					</p>
					<div class="flex gap-2">
						<input
							id="vatsim-cid"
							data-testid="settings-vatsim-cid"
							type="text"
							bind:value={vatsimCid}
							placeholder="e.g. 1234567"
							class="form-input text-sm flex-1"
							onkeydown={(e) => e.key === 'Enter' && save()}
						/>
						<button
							data-testid="settings-vatsim-save"
							onclick={save}
							class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
						>
							Save
						</button>
					</div>
					{#if saved}
						<p class="text-xs text-green-400 mt-2">✓ Saved</p>
					{/if}
				</div>
			</div>
		</section>

		<!-- About Section -->
		<section class="space-y-2">
			<h2 class="text-lg font-bold text-gray-200">About</h2>
			<div class="text-xs text-gray-500 space-y-1">
				<p>VATSIM Flight Scheduler — an unofficial tool for VATSIM virtual pilots.</p>
				<p>Not affiliated with Southwest Airlines or VATSIM. For simulation use only.</p>
				<p>All settings are stored locally in your browser.</p>
			</div>
		</section>
	</main>
</div>
