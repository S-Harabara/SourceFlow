<script>
    import BranchSelector from '../components/CodeReview/BranchSelector.svelte';
    import GenerationPanel from '../components/CodeReview/GenerationPanel.svelte';
    import { onMount } from 'svelte';

    let selectorWidth = 33; // percentage
    let isResizing = false;

    function startResizing() {
        isResizing = true;
    }

    function stopResizing() {
        isResizing = false;
    }

    function handleMouseMove(e) {
        if (!isResizing) return;
        const container = document.getElementById('code-review-container');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        
        // Boundaries
        if (newWidth > 20 && newWidth < 60) {
            selectorWidth = newWidth;
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

<div class="flex flex-col flex-grow h-screen overflow-hidden" id="code-review-container">
    <main class="flex flex-grow overflow-hidden p-4 gap-0 flex-row relative h-full select-none" class:cursor-col-resize={isResizing}>
        <div style="width: {selectorWidth}%" class="flex-shrink-0 relative overflow-hidden">
            <BranchSelector />
        </div>
        
        <!-- Draggable Resizer -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
            on:mousedown={startResizing}
            class="w-1.5 hover:w-2 group cursor-col-resize flex items-center justify-center transition-all bg-transparent hover:bg-purple-500/30 flex-shrink-0 z-10"
            class:bg-purple-500={isResizing}
        >
            <div class="w-[1px] h-8 bg-gray-300 dark:bg-gray-700 group-hover:bg-purple-500 transition-colors"></div>
        </div>

        <div class="flex-grow relative overflow-hidden">
            <GenerationPanel />
        </div>
    </main>
</div>
