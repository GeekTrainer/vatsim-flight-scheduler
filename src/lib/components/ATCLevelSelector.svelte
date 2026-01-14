<script lang="ts">
	import { ControllerPosition } from '$lib/types/vatsim';

	interface Props {
		selectedLevels: ControllerPosition[];
		anyATCChecked: boolean;
		label: string;
	}

	let {
		selectedLevels = $bindable(),
		anyATCChecked = $bindable(),
		label
	}: Props = $props();

	// Generate unique prefix from label (e.g., "departure" or "arrival")
	const testIdPrefix = $derived(label.toLowerCase().includes('departure') ? 'departure' : 'arrival');

	// ATC levels in hierarchical order with matching badge colors
	const atcLevels = [
		{ 
			position: ControllerPosition.CTR, 
			label: 'Center', 
			activeClass: 'atc-ctr-active',
			inactiveClass: 'atc-inactive'
		},
		{ 
			position: ControllerPosition.APP, 
			label: 'Approach', 
			activeClass: 'atc-app-active',
			inactiveClass: 'atc-inactive'
		},
		{ 
			position: ControllerPosition.TWR, 
			label: 'Tower', 
			activeClass: 'atc-twr-active',
			inactiveClass: 'atc-inactive'
		},
		{ 
			position: ControllerPosition.GND, 
			label: 'Ground', 
			activeClass: 'atc-gnd-active',
			inactiveClass: 'atc-inactive'
		},
		{ 
			position: ControllerPosition.DEL, 
			label: 'Delivery', 
			activeClass: 'atc-del-active',
			inactiveClass: 'atc-inactive'
		}
	];

	function toggleLevel(position: ControllerPosition) {
		if (selectedLevels.includes(position)) {
			// Remove level
			selectedLevels = selectedLevels.filter(l => l !== position);
			// If a level is toggled off, uncheck "Any ATC"
			anyATCChecked = false;
		} else {
			// Add level
			selectedLevels = [...selectedLevels, position];
			
			// If all levels are now selected, check "Any ATC"
			if (selectedLevels.length === atcLevels.length) {
				anyATCChecked = true;
				selectedLevels = [];
			}
		}
	}

	function handleAnyATCChange(e: Event) {
		const checked = (e.target as HTMLInputElement).checked;
		anyATCChecked = checked;
		
		// If "Any ATC" is checked, select all specific levels visually
		if (checked) {
			selectedLevels = atcLevels.map(l => l.position);
		} else {
			selectedLevels = [];
		}
	}

	function getButtonClasses(level: typeof atcLevels[0]): string {
		const isActive = anyATCChecked || selectedLevels.includes(level.position);
		return isActive ? level.activeClass : level.inactiveClass;
	}

	const hasAnySelection = $derived(anyATCChecked || selectedLevels.length > 0);
</script>

<div class="stack-sm">
	<!-- Any ATC Checkbox -->
	<label class="flex items-center space-x-3 p-3 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-800 transition-colors">
		<input
			type="checkbox"
			data-testid="any-atc-{label.toLowerCase().replace(/\s+/g, '-')}"
			checked={anyATCChecked}
			onchange={handleAnyATCChange}
			class="form-checkbox w-4 h-4"
		/>
		<span class="text-sm font-medium text-gray-200">Any ATC online</span>
	</label>

	<!-- Specific ATC Levels -->
	<div class="space-y-1">
		<div class="text-secondary px-2">Or select specific levels:</div>
		<div class="grid grid-cols-5 gap-2" data-testid="{label.toLowerCase().replace(/\s+/g, '-')}-atc-levels">
			{#each atcLevels as level}
				<button
					type="button"
					data-testid="{testIdPrefix}-atc-level-{level.position.toLowerCase()}"
					onclick={() => toggleLevel(level.position)}
					class="badge-sm btn-hover {getButtonClasses(level)}"
				>
					{level.label}
				</button>
			{/each}
		</div>
	</div>
</div>
