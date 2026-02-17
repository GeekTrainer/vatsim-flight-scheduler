<script lang="ts">
	import {
		buildDispatchUrl,
		fetchSimBriefPlan,
		getStoredUsername,
		storeUsername,
		clearStoredUsername
	} from '$lib/simbrief';
	import type { SimBriefPlan } from '$lib/types/simbrief';

	interface Props {
		departureIcao: string;
		arrivalIcao: string;
		onPlanLoaded: (plan: SimBriefPlan) => void;
	}

	let { departureIcao, arrivalIcao, onPlanLoaded }: Props = $props();

	let username = $state(getStoredUsername() || '');
	let showUsernamePrompt = $state(!getStoredUsername());
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let usernameInput = $state('');

	function openSimBrief() {
		if (!username) {
			showUsernamePrompt = true;
			return;
		}

		error = null;
		const callbackUrl = `${window.location.origin}/simbrief/callback`;
		const url = buildDispatchUrl(departureIcao, arrivalIcao, callbackUrl);

		const popup = window.open(url, 'simbrief', 'width=1000,height=750');
		if (!popup) {
			error = 'Popup blocked! Please allow popups for this site.';
			return;
		}

		isLoading = true;

		// Poll for plan completion (fallback if postMessage doesn't fire)
		const pollInterval = setInterval(async () => {
			if (popup.closed) {
				clearInterval(pollInterval);
				await loadPlan();
			}
		}, 2000);

		// Also listen for postMessage from callback page
		const handler = async (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return;
			if (event.data?.type === 'simbrief-plan-ready') {
				window.removeEventListener('message', handler);
				clearInterval(pollInterval);
				await loadPlan();
			}
		};
		window.addEventListener('message', handler);
	}

	async function loadPlan() {
		isLoading = true;
		error = null;

		const plan = await fetchSimBriefPlan(username);
		isLoading = false;

		if (!plan) {
			error = 'Could not fetch your SimBrief plan. Check your SimBrief username.';
			return;
		}

		onPlanLoaded(plan);
	}

	function saveUsername() {
		const trimmed = usernameInput.trim();
		if (!trimmed) return;
		storeUsername(trimmed);
		username = trimmed;
		showUsernamePrompt = false;
		openSimBrief();
	}

	function changeUsername() {
		showUsernamePrompt = true;
		usernameInput = username;
	}

	function clearUsername() {
		clearStoredUsername();
		username = '';
		showUsernamePrompt = true;
		usernameInput = '';
	}
</script>

<div data-testid="simbrief-section" class="space-y-3">
	{#if showUsernamePrompt}
		<!-- Username prompt -->
		<div data-testid="simbrief-username-prompt" class="card-subtle p-4 space-y-3">
			<div>
				<h3 class="text-sm font-semibold text-gray-200">Connect SimBrief</h3>
				<p class="text-xs text-gray-400 mt-1">
					Enter your SimBrief username to generate and load flight plans.
					Find it at <a href="https://www.dispatch.simbrief.com" target="_blank" class="text-blue-400 hover:text-blue-300">SimBrief</a>.
				</p>
			</div>
			<div class="flex gap-2">
				<input
					data-testid="simbrief-username-input"
					type="text"
					bind:value={usernameInput}
					placeholder="SimBrief username"
					class="form-input text-sm flex-1"
					onkeydown={(e) => e.key === 'Enter' && saveUsername()}
				/>
				<button
					data-testid="simbrief-save-username"
					onclick={saveUsername}
					class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
				>
					Connect & File
				</button>
			</div>
			<p class="text-xs text-gray-600">
				Don't have SimBrief? <a href="https://www.simbrief.com/home/?page=register" target="_blank" class="text-blue-400 hover:text-blue-300">Create a free account</a>
			</p>
		</div>
	{:else}
		<!-- Connected state -->
		<div class="flex items-center gap-3 flex-wrap">
			<button
				data-testid="simbrief-file-button"
				onclick={openSimBrief}
				disabled={isLoading}
				class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
			>
				{#if isLoading}
					<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
					Loading plan...
				{:else}
					📋 File with SimBrief
				{/if}
			</button>
			<span class="text-xs text-gray-500">
				Username: {username}
				<button onclick={changeUsername} class="text-blue-400 hover:text-blue-300 ml-1">change</button>
				<button onclick={clearUsername} class="text-gray-600 hover:text-gray-400 ml-1">clear</button>
			</span>
		</div>
	{/if}

	{#if error}
		<div data-testid="simbrief-error" class="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3">
			{error}
		</div>
	{/if}
</div>
