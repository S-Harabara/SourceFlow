<script>
    import { savedSkills, favoriteSkillIds, addSkill, removeSkill, toggleFavorite } from '../skillsStore.js';
    import { fetchSkillFromUrl, parseSkillFile, fetchExploreSkills } from '../utils/skillsFetcher.js';
    import { onMount } from 'svelte';
    
    let urlInput = '';
    let isFetching = false;
    let fetchError = '';
    let activeTab = 'library'; // 'library' | 'explore'
    let isDragging = false;

    let exploreSkills = [];
    let isFetchingExplore = false;

    onMount(async () => {
        isFetchingExplore = true;
        try {
            exploreSkills = await fetchExploreSkills();
        } catch (e) {
            console.error("Failed to fetch explore skills", e);
        } finally {
            isFetchingExplore = false;
        }
    });

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
                {#if isFetchingExplore}
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
                            <div class="bg-white dark:bg-dark-card border dark:border-dark-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                                <div class="flex items-start justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shrink-0">
                                            <i class="fas fa-meteor text-lg"></i>
                                        </div>
                                        <h4 class="font-bold text-sm">{curated.name}</h4>
                                    </div>
                                    <button 
                                        on:click={() => handleAddUrl(curated.url)}
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
                {/if}
            {/if}
            
        </div>
    </div>
</div>
