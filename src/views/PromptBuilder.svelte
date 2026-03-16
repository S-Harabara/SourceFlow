<script>
    import TopNav from '../components/PromptBuilder/TopNav.svelte';
    import Explorer from '../components/PromptBuilder/Explorer.svelte';
    import GenerationPanel from '../components/PromptBuilder/GenerationPanel.svelte';
    import { onMount } from 'svelte';

    let explorerWidth = 40; // percentage
    let isResizing = false;

    function startResizing() {
        isResizing = true;
    }

    function stopResizing() {
        isResizing = false;
    }

    function handleMouseMove(e) {
        if (!isResizing) return;
        const container = document.getElementById('prompt-builder-container');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        
        // Boundaries
        if (newWidth > 15 && newWidth < 70) {
            explorerWidth = newWidth;
        }
    }

    onMount(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', stopResizing);
        };
    });
</script>

<div class="flex flex-col flex-grow h-screen overflow-hidden" id="prompt-builder-container">
    <TopNav />
    <main class="flex flex-grow overflow-hidden p-4 gap-0 flex-row relative h-[calc(100vh-3.5rem)] select-none" class:cursor-col-resize={isResizing}>
        <div style="width: {explorerWidth}%" class="flex-shrink-0 relative overflow-hidden">
            <Explorer />
        </div>
        
        <!-- Draggable Resizer -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
            on:mousedown={startResizing}
            class="w-1.5 hover:w-2 group cursor-col-resize flex items-center justify-center transition-all bg-transparent hover:bg-blue-500/30 flex-shrink-0 z-10"
            class:bg-blue-500={isResizing}
        >
            <div class="w-[1px] h-8 bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-500 transition-colors"></div>
        </div>

        <div class="flex-grow relative overflow-hidden">
            <GenerationPanel />
        </div>
    </main>
</div>
