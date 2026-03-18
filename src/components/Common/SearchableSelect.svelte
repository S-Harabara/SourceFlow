<script>
    import { createEventDispatcher, onMount } from 'svelte';
    
    /** @type {string} */
    export let value = "";
    /** @type {string[]} */
    export let options = [];
    /** @type {string} */
    export let placeholder = "Search...";
    /** @type {string} */
    export let label = "";
    /** @type {boolean} */
    export let disabled = false;

    const dispatch = createEventDispatcher();
    let isOpen = false;
    let searchTerm = "";
    /** @type {HTMLDivElement} */
    let container;

    $: filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    /** @param {string} opt */
    function selectOption(opt) {
        value = opt;
        isOpen = false;
        searchTerm = "";
        dispatch('change', opt);
    }

    function toggleOpen() {
        if (disabled) return;
        isOpen = !isOpen;
        if (isOpen) {
            searchTerm = "";
        }
    }

    /** @param {MouseEvent} event */
    function handleClickOutside(event) {
        if (container && !container.contains(/** @type {Node} */(event.target))) {
            isOpen = false;
        }
    }

    function handleKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            toggleOpen();
        } else if (e.key === 'Escape') {
            isOpen = false;
        }
    }

    onMount(() => {
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    });
</script>

<div class="relative w-full" bind:this={container}>
    {#if label}
        <div class="text-[10px] uppercase font-bold text-gray-400 block px-1 mb-1.5">{label}</div>
    {/if}
    
    <div 
        role="button"
        tabindex="0"
        class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-3 text-xs flex items-center justify-between cursor-pointer transition-all {disabled ? 'opacity-50 cursor-not-allowed' : 'hover:ring-1 hover:ring-blue-500/50'}"
        on:click={toggleOpen}
        on:keydown={handleKeydown}
    >
        <span class="truncate {value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}">
            {value || placeholder}
        </span>
        <i class="fas fa-chevron-down text-[10px] text-gray-400 transition-transform {isOpen ? 'rotate-180' : ''}"></i>
    </div>

    {#if isOpen}
        <div class="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border dark:border-dark-border rounded-xl shadow-xl overflow-hidden animate__animated animate__fadeIn animate__faster">
            <div class="p-2 border-b dark:border-dark-border">
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400"></i>
                    <input 
                        type="text" 
                        bind:value={searchTerm}
                        placeholder="Search branches..."
                        class="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        on:click|stopPropagation
                    />
                </div>
            </div>
            
            <div class="max-h-60 overflow-y-auto custom-scrollbar">
                {#if filteredOptions.length === 0}
                    <div class="p-4 text-center text-xs text-gray-400 italic">No matches found</div>
                {:else}
                    {#each filteredOptions as opt}
                        <div 
                            role="option"
                            aria-selected={value === opt}
                            tabindex="0"
                            class="px-4 py-2.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors flex items-center justify-between {value === opt ? 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 font-bold' : ''}"
                            on:click|stopPropagation={() => selectOption(opt)}
                            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectOption(opt)}
                        >
                            <span class="truncate">{opt}</span>
                            {#if value === opt}
                                <i class="fas fa-check text-[10px]"></i>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>
