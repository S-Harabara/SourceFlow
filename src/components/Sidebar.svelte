<script>
	import { currentView } from '../store.js';
	export let isDark = false;

	let isCollapsed = false;

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}
</script>

<aside
	class="w-64 border-r dark:border-dark-border bg-white dark:bg-dark-card flex flex-col p-4 gap-6 shrink-0 z-40 transition-all {isCollapsed
		? 'collapsed'
		: ''}"
	id="sidePanel"
>
	<div class="flex items-center gap-2 mb-4">
		<div class="bg-blue-600 p-1.5 rounded text-white text-sm">
			<i class="fas fa-microchip"></i>
		</div>
		<h1
			class="font-black tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400"
		>
			SourceFlow
		</h1>
	</div>

	<div class="space-y-4">
		<h3 class="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Navigation</h3>
		<button
			class="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors font-bold text-sm
            {$currentView === 'promptBuilder'
				? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
				: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}"
			on:click={() => ($currentView = 'promptBuilder')}
		>
			<i class="fas fa-hammer w-5 text-center"></i> Prompt Builder
		</button>
		<button
			class="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors font-bold text-sm
            {$currentView === 'skillsLibrary'
				? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
				: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}"
			on:click={() => ($currentView = 'skillsLibrary')}
		>
			<i class="fa-solid fa-splotch w-5 text-center"></i> Skills Library
		</button>
		<button
			class="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors font-bold text-sm
            {$currentView === 'codeReview'
				? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
				: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}"
			on:click={() => ($currentView = 'codeReview')}
		>
			<i class="fas fa-code-pull-request w-5 text-center"></i> Code Review
		</button>
	</div>

	<!-- Extra Space for Views specific settings, but we keep it global mostly or inject it. 
         Wait, PromptBuilder actually had File Type Filters and Recent Folders in the sidebar.
         We can render a `<slot />` or conditionally render based on the view. -->

	{#if $currentView === 'promptBuilder'}
		<div class="flex-grow flex flex-col gap-6 overflow-hidden">
			<div id="sidebar-filters-slot"></div>
			<div id="sidebar-recent-slot" class="flex-grow overflow-hidden flex flex-col"></div>
		</div>
	{/if}

	<div class="space-y-4 mt-auto border-t dark:border-dark-border pt-4">
		<h3 class="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Settings</h3>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
			on:click={toggleTheme}
		>
			<span class="text-sm font-bold flex items-center gap-2">
				<i class="fas fa-moon text-blue-500"></i> Theme
			</span>
			<i class={isDark ? 'fas fa-moon text-blue-500' : 'fas fa-sun text-yellow-500'}></i>
		</div>
	</div>
</aside>
