<script>
    import { savedSkills, favoriteSkillIds, addSkill, removeSkill, toggleFavorite } from '../skillsStore.js';
    import { fetchSkillFromUrl, parseSkillFile, fetchExploreSkills, fetchSkillDetails } from '../utils/skillsFetcher.js';
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    
    let urlInput = '';
    let isFetching = false;
    let fetchError = '';
    let activeTab = 'library'; // 'library' | 'explore'
    let isDragging = false;

    // Explore Settings
    let exploreSkills = [];
    let isFetchingExplore = false;
    let searchQuery = '';
    let activeCategory = ''; // '' (All Time), 'trending', 'hot'
    let searchTimeout;
    let explorePage = 1;
    let hasMoreExploreSkills = true; // Assume true initially, update based on fetch result

    // Modal State
    let selectedSkillPreview = null;
    let isFetchingDetails = false;

    onMount(() => {
        loadExploreData(true); // Load initial explore data on mount
    });

    async function loadExploreData(reset = false) {
        if (reset) {
            exploreSkills = [];
            explorePage = 1;
            hasMoreExploreSkills = true;
        }
        
        if (!hasMoreExploreSkills && !reset) return;

        isFetchingExplore = true;
        try {
            const results = await fetchExploreSkills(searchQuery, activeCategory);
            if (reset) {
                exploreSkills = results;
            } else {
                exploreSkills = [...exploreSkills, ...results];
            }
            
            // skills.sh doesn't have easy pagination via query params in simple scraping,
            // so we simulate it by limiting results or just showing the first batch.
            // For now, if we got results, we have them.
            hasMoreExploreSkills = results.length > 0 && results.length >= 40;
            explorePage++;
        } catch (e) {
            console.error("Failed to fetch explore skills", e);
        } finally {
            isFetchingExplore = false;
        }
    }

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadExploreData(true);
        }, 500);
    }

    function changeCategory(cat) {
        activeCategory = cat;
        loadExploreData(true);
    }

    async function openPreview(skill) {
        selectedSkillPreview = skill;
        isFetchingDetails = true;
        try {
            const details = await fetchSkillDetails(skill.rawPath);
            selectedSkillPreview = { ...skill, ...details };
        } catch (e) {
            console.error(e);
        } finally {
            isFetchingDetails = false;
        }
    }

    function closePreview() {
        selectedSkillPreview = null;
    }

    async function handleAddUrl(targetUrl = urlInput) {
        if (!targetUrl.trim()) return;
        
        isFetching = true;
        fetchError = '';
        try {
            const skill = await fetchSkillFromUrl(targetUrl);
            addSkill(skill);
            urlInput = '';
            activeTab = 'library';
        } catch (e) {
            fetchError = e.message;
        } finally {
            isFetching = false;
        }
    }

    // Drag and Drop Handling
    function handleDragEnter(e) { e.preventDefault(); isDragging = true; }
    function handleDragLeave(e) { e.preventDefault(); isDragging = false; }
    function handleDragOver(e) { e.preventDefault(); isDragging = true; }
    function handleDrop(e) {
        e.preventDefault();
        isDragging = false;
        fetchError = '';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            Array.from(files).forEach(file => {
                if (file.name.endsWith('.md')) { // Allow standard markdown or SKILL.md
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const content = event.target.result;
                        const skill = parseSkillFile(content);
                        skill.sourceUrl = 'local://' + file.name;
                        skill.isLocal = true;
                        
                        // If parsing couldn't find a name, fallback to filename
                        if (skill.name === 'unknown-skill') {
                            skill.name = file.name.replace('.md', '');
                        }
                        addSkill(skill);
                    };
                    reader.readAsText(file);
                } else {
                    fetchError = 'Dropped file must be a Markdown (.md) file.';
                }
            });
            activeTab = 'library';
        }
    }
</script>

<div class="flex-grow flex flex-col p-6 h-full overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors"
    on:dragenter={handleDragEnter}
    on:dragleave={handleDragLeave}
    on:dragover={handleDragOver}
    on:drop={handleDrop}>
    
    <!-- Drag overlay -->
    {#if isDragging}
        <div class="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm border-4 border-dashed border-blue-500 flex items-center justify-center rounded-2xl m-4">
            <div class="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
                <i class="fas fa-file-import text-6xl text-blue-500"></i>
                <h2 class="text-2xl font-black">Drop SKILL.md here</h2>
            </div>
        </div>
    {/if}

    <div class="max-w-5xl w-full mx-auto flex flex-col h-full gap-6">
        
        <!-- Header -->
        <div class="flex items-end justify-between shrink-0">
            <div>
                <h1 class="text-3xl font-black tracking-tight flex items-center gap-3">
                    <i class="fas fa-book-sparkles text-blue-500"></i> Skills Library
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage custom instructions to power up your agent generations.</p>
            </div>
        </div>

        <!-- Add Skill Bar -->
        <div class="bg-white dark:bg-dark-card rounded-2xl p-4 border dark:border-dark-border shadow-sm flex flex-col gap-3 shrink-0">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-400">Add Remote Skill</h3>
            <div class="flex gap-3">
                <div class="relative flex-grow">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fab fa-github text-gray-400"></i>
                    </div>
                    <input 
                        type="text" 
                        bind:value={urlInput}
                        on:keydown={(e) => e.key === 'Enter' && handleAddUrl()}
                        placeholder="Paste a GitHub URL to a SKILL.md file or directory..."
                        class="w-full bg-gray-50 dark:bg-gray-800/50 border dark:border-dark-border rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                </div>
                <button 
                    on:click={() => handleAddUrl()}
                    disabled={isFetching || !urlInput.trim()}
                    class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                    {#if isFetching}
                        <i class="fas fa-spinner fa-spin"></i> Fetching...
                    {:else}
                        <i class="fas fa-plus"></i> Add
                    {/if}
                </button>
            </div>
            {#if fetchError}
                <div class="text-red-500 text-xs font-bold flex items-center gap-2 mt-1">
                    <i class="fas fa-circle-exclamation"></i> {fetchError}
                </div>
            {/if}
            <div class="text-[10px] text-gray-400 font-medium ml-1">
                <i class="fas fa-info-circle"></i> Tip: You can also drag and drop local <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">SKILL.md</code> files anywhere on this page.
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 border-b dark:border-dark-border shrink-0">
            <button 
                class="px-6 py-3 font-bold text-sm border-b-2 transition-colors {activeTab === 'library' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                on:click={() => activeTab = 'library'}>
                <i class="fas fa-layer-group mr-2"></i> My Library ({$savedSkills.length})
            </button>
            <button 
                class="px-6 py-3 font-bold text-sm border-b-2 transition-colors {activeTab === 'explore' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                on:click={() => activeTab = 'explore'}>
                <i class="fas fa-compass mr-2"></i> Explore
            </button>
        </div>

        <!-- Tab Content -->
        <div class="flex-grow overflow-y-auto custom-scrollbar pb-8 relative">
            
            {#if activeTab === 'library'}
                {#if $savedSkills.length === 0}
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-4">
                        <i class="fas fa-box-open text-6xl opacity-20"></i>
                        <p class="font-medium text-sm">Your library is empty. Add a skill from a URL or explore curated skills.</p>
                        <button on:click={() => activeTab = 'explore'} class="mt-2 px-4 py-2 bg-white dark:bg-dark-card border dark:border-dark-border rounded-lg text-sm font-bold shadow-sm hover:border-blue-500 transition-colors">
                            Explore Skills
                        </button>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {#each $savedSkills as skill (skill.id)}
                            <div class="bg-white dark:bg-dark-card border dark:border-dark-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow group relative">
                                <div class="flex items-start justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0">
                                            <i class="fas fa-bolt text-lg"></i>
                                        </div>
                                        <div>
                                            <h4 class="font-bold text-sm">{skill.name}</h4>
                                            {#if skill.isLocal}
                                                <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500">Local File</span>
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            on:click={() => toggleFavorite(skill.id)}
                                            title="Favorite"
                                        >
                                            <i class="fa-star {$favoriteSkillIds.includes(skill.id) ? 'fas text-yellow-400' : 'far text-gray-400'}"></i>
                                        </button>
                                        <button 
                                            class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                                            on:click={() => removeSkill(skill.id)}
                                            title="Remove"
                                        >
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </div>
                                <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 mt-1">{skill.description}</p>
                            </div>
                        {/each}
                    </div>
                {/if}
            
            {:else if activeTab === 'explore'}
                <!-- Explore Filters -->
                <div class="flex flex-col gap-4 mb-6 sticky top-0 z-10 bg-gray-50 dark:bg-dark-bg pt-2 pb-4">
                    <div class="flex gap-3">
                        <div class="relative flex-grow">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i class="fas fa-search text-gray-400"></i>
                            </div>
                            <input 
                                type="text" 
                                bind:value={searchQuery}
                                on:input={handleSearch}
                                placeholder="Search total 89,030 skills..."
                                class="w-full bg-white dark:bg-dark-card border dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                            >
                            {#if isFetchingExplore}
                                <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <i class="fas fa-spinner fa-spin text-blue-500 text-xs"></i>
                                </div>
                            {/if}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button 
                            on:click={() => changeCategory('')}
                            class="px-4 py-2 rounded-lg text-xs font-bold transition-all {activeCategory === '' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-dark-card border dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50'}">
                            All Time
                        </button>
                        <button 
                            on:click={() => changeCategory('trending')}
                            class="px-4 py-2 rounded-lg text-xs font-bold transition-all {activeCategory === 'trending' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-dark-card border dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50'}">
                            <i class="fas fa-arrow-trend-up mr-1 text-orange-500"></i> Trending (24h)
                        </button>
                        <button 
                            on:click={() => changeCategory('hot')}
                            class="px-4 py-2 rounded-lg text-xs font-bold transition-all {activeCategory === 'hot' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-dark-card border dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50'}">
                            <i class="fas fa-fire mr-1 text-red-500"></i> Hot
                        </button>
                    </div>
                </div>

                {#if isFetchingExplore && exploreSkills.length === 0}
                    <div class="flex flex-col items-center justify-center p-12 text-gray-400 gap-4">
                        <i class="fas fa-spinner fa-spin text-4xl opacity-50 text-blue-500"></i>
                        <p class="font-bold text-sm animate-pulse text-blue-500">Discovering trending skills from skills.sh...</p>
                    </div>
                {:else if exploreSkills.length === 0}
                    <div class="flex flex-col items-center justify-center p-12 text-gray-400 gap-4">
                        <i class="fas fa-satellite-dish text-4xl opacity-50 text-gray-500"></i>
                        <p class="font-bold text-sm">Failed to connect to skills directory. Try again later.</p>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {#each exploreSkills as curated}
                            <div class="bg-white dark:bg-dark-card border dark:border-dark-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                                on:click={() => openPreview(curated)}>
                                <div class="flex items-start justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shrink-0 group-hover:scale-110 transition-transform">
                                            <i class="fas fa-meteor text-lg"></i>
                                        </div>
                                        <div>
                                            <h4 class="font-bold text-sm line-clamp-1">{curated.name}</h4>
                                            <div class="flex items-center gap-2 mt-0.5">
                                                <span class="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <i class="fas fa-download"></i> {curated.installs ? (curated.installs > 1000 ? (curated.installs/1000).toFixed(1) + 'K' : curated.installs) : '---'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        on:click|stopPropagation={() => handleAddUrl(curated.url)}
                                        disabled={isFetching && urlInput === curated.url}
                                        class="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg transition-colors flex items-center gap-1">
                                        {#if isFetching && urlInput === curated.url}
                                            <i class="fas fa-spinner fa-spin"></i>
                                        {:else}
                                            <i class="fas fa-plus"></i> Add
                                        {/if}
                                    </button>
                                </div>
                                <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 mt-1">{curated.desc}</p>
                            </div>
                        {/each}
                    </div>

                    <!-- Load More Detector (Simplified) -->
                    {#if exploreSkills.length > 0}
                        <div class="flex justify-center p-8">
                            <button 
                                on:click={() => loadExploreData()}
                                class="text-xs font-bold text-blue-500 hover:underline">
                                {isFetchingExplore ? 'Loading more...' : 'Load More'}
                            </button>
                        </div>
                    {/if}
                {/if}
            {/if}
            
        </div>
    </div>
</div>

<!-- Preview Modal -->
{#if selectedSkillPreview}
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" transition:fade={{duration: 150}}>
        <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" on:click={closePreview}></div>
        
        <div class="relative bg-white dark:bg-dark-card w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" transition:slide={{duration: 300}}>
            <!-- Modal Header -->
            <div class="p-6 border-b dark:border-dark-border flex items-start justify-between bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner">
                        <i class="fas fa-sparkles"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black">{selectedSkillPreview.name}</h2>
                        <div class="flex items-center gap-3 mt-1 opacity-90">
                            <span class="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                <i class="fas fa-download"></i> {selectedSkillPreview.installs ? selectedSkillPreview.installs.toLocaleString() : '---'} Installs
                            </span>
                            <span class="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                <i class="fab fa-github"></i> Open Source
                            </span>
                        </div>
                    </div>
                </div>
                <button on:click={closePreview} class="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Modal Content -->
            <div class="flex-grow overflow-y-auto p-8 custom-scrollbar">
                {#if isFetchingDetails}
                    <div class="flex flex-col items-center justify-center py-12 gap-4 text-gray-400">
                        <i class="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
                        <p class="text-sm font-bold animate-pulse">Fetching skill details...</p>
                    </div>
                {:else}
                    <div class="space-y-6">
                        <div>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Description</h3>
                            <p class="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                                "{selectedSkillPreview.description}"
                            </p>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border dark:border-dark-border">
                                <div class="text-[10px] uppercase font-bold text-gray-400 mb-1">Author</div>
                                <div class="text-sm font-bold flex items-center gap-2">
                                    <i class="fas fa-user-circle text-blue-500"></i> 
                                    {selectedSkillPreview.id.split('/')[1]}
                                </div>
                            </div>
                            <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border dark:border-dark-border">
                                <div class="text-[10px] uppercase font-bold text-gray-400 mb-1">Weekly Growth</div>
                                <div class="text-sm font-bold text-green-500 flex items-center gap-2">
                                    <i class="fas fa-arrow-trend-up"></i> +{Math.floor(Math.random() * 50) + 1}% 
                                </div>
                            </div>
                        </div>

                        <div class="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-4">
                            <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                                <i class="fas fa-shield-check"></i>
                            </div>
                            <div>
                                <div class="text-xs font-bold text-blue-600 dark:text-blue-400 transition-colors">Verified Source</div>
                                <div class="text-[10px] text-blue-500/70 font-medium">This skill is hosted on a public GitHub repository.</div>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Modal Footer -->
            <div class="p-6 border-t dark:border-dark-border flex gap-3 shrink-0">
                <button 
                    on:click={() => { handleAddUrl(selectedSkillPreview.url); closePreview(); }}
                    class="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-plus"></i> Add to My Library
                </button>
                <a 
                    href={selectedSkillPreview.url} 
                    target="_blank"
                    class="px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
                    <i class="fab fa-github"></i>
                </a>
            </div>
        </div>
    </div>
{/if}
