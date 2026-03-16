<script>
    import { slide } from 'svelte/transition';
    import { savedSkills, selectedSkillsForPrompt, togglePromptSelection } from '../../skillsStore.js';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    let isExpanded = false;

    $: sortedSkills = [...$savedSkills].sort((a,b) => a.name.localeCompare(b.name));
</script>

<div class="flex flex-col w-full">
    <button
        on:click={() => isExpanded = !isExpanded}
        class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border dark:border-dark-border"
    >
        <div class="flex items-center gap-2">
            <i class="fas fa-book-sparkles text-indigo-500 text-xs"></i>
            <span class="text-[11px] font-bold uppercase tracking-wider">Skills ({$selectedSkillsForPrompt.length})</span>
        </div>
        <i class="fas fa-chevron-down text-[10px] transition-transform duration-300" class:rotate-180={isExpanded}></i>
    </button>

    {#if isExpanded}
        <div transition:slide={{ duration: 300 }} class="mt-2 flex flex-col gap-1.5 p-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-dashed dark:border-dark-border max-h-40 overflow-y-auto custom-scrollbar">
            {#if sortedSkills.length === 0}
                <div class="text-[10px] text-gray-500 font-medium text-center py-2 flex flex-col gap-1 items-center">
                    <i class="fas fa-box-open opacity-50 mb-1 text-sm"></i>
                    Library is empty.
                </div>
            {:else}
                {#each sortedSkills as skill}
                    <label class="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-dark-card border dark:border-dark-border rounded-md cursor-pointer hover:shadow-sm transition-all" title={skill.description}>
                        <input 
                            type="checkbox" 
                            checked={$selectedSkillsForPrompt.includes(skill.id)} 
                            on:change={() => {
                                togglePromptSelection(skill.id);
                                dispatch('change');
                            }} 
                            class="w-3.5 h-3.5 border-gray-300 dark:border-dark-border"
                        >
                        <span class="text-[10px] font-bold truncate flex-grow">{skill.name}</span>
                    </label>
                {/each}
            {/if}
        </div>
    {/if}
</div>
