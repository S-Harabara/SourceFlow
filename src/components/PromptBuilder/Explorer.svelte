<script>
	import { fileTreeData, selectedFiles } from '../../promptStore.js';
	import FileTreeItem from './FileTreeItem.svelte';
	import { selectFolder, resetFolder } from '../../utils/folderPicker.js';

	function selectAll() {
		const getAll = (nodes, set) => {
			nodes.forEach((n) => {
				if (n.kind === 'file' && n.isText) set.add(n.path);
				else if (n.kind === 'directory' && n.children) getAll(n.children, set);
			});
		};
		getAll($fileTreeData, $selectedFiles);
		selectedFiles.set($selectedFiles);
	}
</script>

<section class="h-full flex flex-col gap-4 overflow-hidden" style="width: 100%;">
	<div class="bg-white dark:bg-dark-card rounded-2xl border dark:border-dark-border flex flex-col h-full overflow-hidden shadow-sm">
		<div class="p-4 border-b dark:border-dark-border flex items-center justify-between bg-white dark:bg-dark-card z-10 shrink-0">
			<h2 class="font-bold flex items-center gap-2">
				<i class="fas fa-sitemap text-blue-500"></i> Explorer
			</h2>
			<div class="flex gap-2">
				<button
					on:click={selectFolder}
					title="Open Folder"
					class="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-blue-500"
				>
					<i class="fas fa-folder-open"></i>
				</button>
				<button
					on:click={resetFolder}
					title="Reset Folder"
					class="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-red-500"
				>
					<i class="fas fa-rotate-left"></i>
				</button>
				<button
					on:click={selectAll}
					class="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-[10px] font-bold text-blue-500 dark:text-blue-400"
				>
					<i class="fas fa-check-double"></i> SELECT ALL
				</button>
			</div>
		</div>

		<div class="p-4 space-y-4 flex-grow flex flex-col overflow-hidden">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				role="button"
				tabindex="0"
				on:click={() => $fileTreeData.length === 0 && selectFolder()}
				class="flex-grow overflow-auto custom-scrollbar bg-gray-50 dark:bg-gray-800/30 rounded-xl p-2 font-mono text-[11px] relative select-none w-full min-h-0 {$fileTreeData.length ===
				0
					? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all border-2 border-dashed border-transparent hover:border-blue-500/30'
					: ''}"
			>
				{#if $fileTreeData.length === 0}
					<div class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-3">
						<div class="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-2">
							<i class="fas fa-folder-plus text-3xl text-blue-500/50"></i>
						</div>
						<span class="text-sm font-bold text-gray-500 dark:text-gray-400">Project Explorer is Empty</span>
						<span class="text-xs text-gray-400 dark:text-gray-500 max-w-[200px]">Click anywhere in this area to open a project folder</span>
					</div>
				{:else}
					<div class="pb-10 min-w-max">
						{#each $fileTreeData as node}
							<FileTreeItem {node} />
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</section>
