<script>
    import { fileHandles, selectedFiles } from '../../promptStore.js';
    
    export let node;
    export let depth = 0;
    
    let expanded = node.expanded === undefined ? true : node.expanded;

    function toggle() {
        expanded = !expanded;
    }

    function toggleSelection(e) {
        const checked = e.target.checked;
        if (node.kind === 'directory') {
            const setChildren = (n, state) => {
                if (n.kind === 'file' && n.isText) {
                    if (state) $selectedFiles.add(n.path);
                    else $selectedFiles.delete(n.path);
                } else if (n.kind === 'directory') {
                    n.children.forEach(c => setChildren(c, state));
                }
            };
            setChildren(node, checked);
            selectedFiles.set($selectedFiles);
        } else if (node.isText) {
            if (checked) $selectedFiles.add(node.path);
            else $selectedFiles.delete(node.path);
            selectedFiles.set($selectedFiles);
        }
    }

    async function viewFile() {
        if (!node.isText) return;
        const handle = $fileHandles.find(f => f.p === node.path);
        if (handle) {
            const file = await handle.h.getFile();
            const text = await file.text();
            import('../../promptStore.js').then(store => {
                store.activeModalFile.set({ name: node.path, content: text });
            });
        }
    }
</script>

<div class="tree-line mb-0.5" data-filename={node.name.toLowerCase()}>
    {#if node.kind === 'directory'}
        <div class="flex items-center gap-1 hover:bg-gray-200/50 dark:hover:bg-gray-800/20 rounded px-1 transition-colors">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span class="folder-toggle w-4 inline-flex items-center justify-center text-[8px] text-gray-500 {expanded ? '' : '-rotate-90'}" on:click={toggle}>
                <i class="fas fa-chevron-down"></i>
            </span>
            <input type="checkbox" class="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600" on:change={toggleSelection}>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span class="font-bold py-1 cursor-pointer dark:text-gray-300 flex items-center gap-1.5 whitespace-nowrap" on:click={toggle}>
                <i class="fas fa-folder text-blue-500"></i> {node.name} 
                {#if node.isRoot}<span class="text-[9px] text-blue-500 opacity-60">(ROOT)</span>{/if}
            </span>
        </div>
        
        {#if expanded && node.children}
            <div class="folder-content tree-indent ml-4 border-l border-gray-200 dark:border-gray-800">
                {#each node.children as child}
                    <svelte:self node={child} depth={depth + 1} />
                {/each}
            </div>
        {/if}
    {:else}
        <div class="flex items-center gap-1 hover:bg-gray-200/50 dark:hover:bg-gray-800/20 rounded px-1 pl-4 transition-colors overflow-hidden text-ellipsis whitespace-nowrap">
            {#if node.isText}
                <input type="checkbox" class="w-3 h-3 rounded border-gray-300 dark:border-gray-600 flex-shrink-0" 
                    checked={$selectedFiles.has(node.path)} 
                    on:change={toggleSelection}>
            {:else}
                <div class="w-3 h-3 flex-shrink-0"></div>
            {/if}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span class="py-0.5 whitespace-nowrap {node.isText ? 'dark:text-gray-400 cursor-pointer hover:text-blue-500' : 'text-gray-400 opacity-50'}"
                  on:click={viewFile}>
                <i class="far fa-{node.isText ? 'file-code' : 'file'} scale-90"></i> {node.name} 
                <span class="text-[9px] opacity-40 ml-1">({(node.size / 1024).toFixed(1)}K)</span>
            </span>
        </div>
    {/if}
</div>
