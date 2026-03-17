<script>
    import { onMount } from 'svelte';
    import { 
        sourceBranch, 
        targetBranch, 
        branchesList, 
        codeReviewProjectName, 
        codeReviewProjectPath 
    } from '../../codeReviewStore.js';
    import { rootPath, folderName as globalFolderName } from '../../promptStore.js';
    import { getGitBranches, selectProjectFolder } from '../../utils/gitUtils.js';

    async function handleSelectFolder() {
        const result = await selectProjectFolder();
        if (result) {
            codeReviewProjectPath.set(result.path);
            codeReviewProjectName.set(result.name);
            refreshBranches();
        }
    }

    async function refreshBranches() {
        if ($codeReviewProjectPath) {
            const list = await getGitBranches($codeReviewProjectPath);
            branchesList.set(list);
            if (list.length > 0) {
                if (!$sourceBranch) sourceBranch.set(list[0]);
                if (!$targetBranch) targetBranch.set(list[0]);
            }
        }
    }

    // Sync with global folder if exists
    onMount(() => {
        if ($rootPath && !$codeReviewProjectPath) {
            codeReviewProjectPath.set($rootPath);
            codeReviewProjectName.set($globalFolderName);
            refreshBranches();
        }
    });
</script>

<div class="h-full flex flex-col gap-4">
    <div class="bg-white dark:bg-dark-card rounded-2xl border dark:border-dark-border p-4 shadow-sm flex flex-col gap-4">
        <div class="flex items-center justify-between border-b dark:border-dark-border pb-3">
            <h2 class="font-bold flex items-center gap-2 text-sm">
                <i class="fas fa-code-branch text-purple-500"></i> Git Branches
            </h2>
            <button 
                on:click={handleSelectFolder}
                class="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider"
            >
                { $codeReviewProjectName ? 'Change Project' : 'Select Project' }
            </button>
        </div>

        {#if $codeReviewProjectName}
            <div class="space-y-4 animate__animated animate__fadeIn">
                <div class="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-dark-border">
                    <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Active Project</div>
                    <div class="text-xs font-mono truncate">{$codeReviewProjectName}</div>
                </div>

                <div class="grid grid-cols-1 gap-4">
                    <div class="space-y-1.5">
                        <label class="text-[10px] uppercase font-bold text-gray-400 block px-1">Source Branch</label>
                        <select 
                            bind:value={$sourceBranch}
                            class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            {#each $branchesList as branch}
                                <option value={branch}>{branch}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="flex justify-center -my-2 opacity-50">
                        <i class="fas fa-arrow-down text-[10px] text-gray-400"></i>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] uppercase font-bold text-gray-400 block px-1">Target Branch</label>
                        <select 
                            bind:value={$targetBranch}
                            class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            {#each $branchesList as branch}
                                <option value={branch}>{branch}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <button 
                    on:click={refreshBranches}
                    class="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all uppercase"
                >
                    <i class="fas fa-sync-alt mr-1.5"></i> Refresh Branches
                </button>
            </div>
        {:else}
            <div 
                on:click={handleSelectFolder}
                class="flex-grow min-h-[200px] border-2 border-dashed border-gray-200 dark:border-dark-border rounded-xl flex flex-col items-center justify-center p-6 text-center gap-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
            >
                <div class="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i class="fas fa-folder-open text-blue-500/50 text-xl"></i>
                </div>
                <div>
                    <div class="text-sm font-bold text-gray-500 dark:text-gray-400">No project selected</div>
                    <div class="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Select a git repository to compare branches</div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    select {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 0.5rem center;
        background-repeat: no-repeat;
        background-size: 1.5em 1.5em;
        padding-right: 2.5rem;
    }
</style>
