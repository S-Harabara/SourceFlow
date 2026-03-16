<script>
    import { includeGoal, goalText, includeStructure, removeComments, minifyOutput, generatedOutput, isGenerating, previewSize, previewTokens, selectedFiles, fileTreeData, fileHandles } from '../../promptStore.js';

    function getProjectStructure() {
        let res = "PROJECT STRUCTURE:\n";
        const buildStr = (nodes, depth) => {
            nodes.sort((a,b) => a.kind==='directory' ? -1 : 1).forEach(n => {
                const icon = n.kind === 'directory' ? "📁 " : "📄 ";
                res += "  ".repeat(depth) + icon + n.name + "\n";
                if (n.kind === 'directory' && n.children) buildStr(n.children, depth + 1);
            });
        };
        buildStr($fileTreeData, 0);
        return res + "\n";
    }

    import { minify as terserMinify } from 'terser';
    import { minify as cssoMinify } from 'csso';
    import tippy from 'tippy.js';

    const cleanComments = (s) => {
        if (!s) return s;
        // 1. Remove multi-line comments
        let res = s.replace(/\/\*[\s\S]*?\*\//g, '');
        // 2. Remove single-line comments line by line
        return res.split('\n').map(line => {
            const index = line.indexOf('//');
            if (index !== -1) {
                const before = line.substring(0, index);
                if (!before.trim().endsWith('http:') && !before.trim().endsWith('https:')) {
                    return before.trimEnd();
                }
            }
            return line;
        }).join('\n');
    };

    const minifyHTML = (s) => {
        if (!s) return s;
        return s
            .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
            .replace(/>\s+</g, '><')          // Remove space between tags
            .replace(/\s+/g, ' ')             // Collapse other whitespace
            .trim();
    };

    const minifyCode = async (s, filename = '') => {
        if (!s) return s;
        const ext = filename.split('.').pop().toLowerCase();
        
        try {
            if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
                const result = await terserMinify(s, {
                    compress: true,
                    mangle: false,
                    format: { comments: false }
                });
                return result.code || s;
            } else if (['css', 'scss', 'less'].includes(ext)) {
                // csso is generally safe in browser
                return cssoMinify(s).css;
            } else if (['html', 'svelte', 'vue', 'svg'].includes(ext)) {
                // Avoiding html-minifier-terser as it requires Node 'path'
                return minifyHTML(s);
            }
        } catch (e) {
            console.warn(`Library minification failed for ${filename}, falling back to regex:`, e);
        }

        // Generic fallback
        const noComments = cleanComments(s);
        return noComments.replace(/\s+/g, ' ').trim();
    };

    async function generatePrompt() {
        if ($selectedFiles.size === 0 && !$includeStructure) {
            alert('Select files first');
            return;
        }

        isGenerating.set(true);
        try {
            let res = '';
            if ($includeGoal) res += `GOAL:\n${$goalText}\n\n`;
            if ($includeStructure) res += getProjectStructure();

            const paths = Array.from($selectedFiles);
            for (const p of paths) {
                const h = $fileHandles.find(x => x.p === p);
                if (h) {
                    const file = await h.h.getFile();
                    let txt = await file.text();
                    
                    if ($removeComments) txt = cleanComments(txt);
                    if ($minifyOutput) {
                        try {
                            txt = await minifyCode(txt, p);
                        } catch (err) {
                            console.error(`Minification failed for ${p}:`, err);
                        }
                    }
                    
                    res += `--- FILE: ${p} ---\n${txt}\n\n`;
                }
            }
            
            generatedOutput.set(res.trim());
        } catch (error) {
            console.error('Error in generatePrompt:', error);
            alert('An error occurred during generation. Check console for details.');
        } finally {
            isGenerating.set(false);
        }
    }

    function copyToClipboard(e) {
        navigator.clipboard.writeText($generatedOutput);
        tippy(e.currentTarget, {
            content: 'Copied!',
            showOnCreate: true,
            theme: 'onyx',
            onHidden: (instance) => instance.destroy(),
        });
    }

    function downloadFile() {
        const b = new Blob([$generatedOutput], { type: 'text/plain' });
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(b); 
        a.download = 'prompt.txt'; 
        a.click();
    }
</script>

<section class="flex-grow flex flex-col gap-4 overflow-hidden h-full">
    <div class="bg-white dark:bg-dark-card rounded-2xl border dark:border-dark-border p-4 shadow-sm flex flex-col gap-4 overflow-hidden h-full">
        <div class="flex items-center justify-between pb-2 border-b dark:border-dark-border shrink-0">
            <h2 class="font-bold flex items-center gap-2">
                <i class="fas fa-terminal text-emerald-500"></i> Generation
            </h2>

            <div class="flex items-center gap-4 text-[10px] font-bold uppercase text-gray-400">
                <div class="flex items-center gap-1.5">
                    <span>Preview:</span>
                    <span class="text-emerald-500 font-mono">{($previewSize / 1024).toFixed(1)} KB</span>
                </div>
                <div class="flex items-center gap-1.5 border-l dark:border-dark-border pl-4">
                    <span>Tokens:</span>
                    <span class="text-blue-500 font-mono">{$previewTokens.toLocaleString()}</span>
                </div>
            </div>
        </div>

        <div class="flex flex-wrap gap-4 items-start shrink-0">
            <div class="flex flex-col gap-2 w-full md:w-[48%]">
                <div class="flex items-center justify-between">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" bind:checked={$includeGoal} class="w-4 h-4 rounded border-gray-300">
                        <span class="text-xs font-bold py-1">Include Project Goal</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" bind:checked={$includeStructure} class="w-4 h-4 rounded border-gray-300">
                        <span class="text-xs font-bold py-1">Include Structure</span>
                    </label>
                </div>
                {#if $includeGoal}
                    <textarea bind:value={$goalText}
                        class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-xs p-2 h-14 outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="What should the AI achieve?"></textarea>
                {/if}
            </div>
            <div class="w-full md:w-[48%] flex flex-col gap-2">
                <div class="flex items-center justify-between text-[11px] font-bold">
                    <div class="flex items-center gap-2"><i class="fas fa-magic text-yellow-500 scale-75"></i> Transformation</div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <input type="checkbox" bind:checked={$removeComments} on:change={generatePrompt} class="scale-90">
                        <span class="text-[10px] whitespace-nowrap">No Comments</span>
                    </label>
                    <label class="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <input type="checkbox" bind:checked={$minifyOutput} on:change={generatePrompt} class="scale-90">
                        <span class="text-[10px] whitespace-nowrap">Minify</span>
                    </label>
                </div>
            </div>
        </div>

        <div class="flex-grow flex flex-col relative overflow-hidden bg-gray-100 dark:bg-gray-900/40 rounded-xl p-1 w-full min-h-[100px]">
            {#if $isGenerating}
                <div class="absolute inset-0 bg-white/50 dark:bg-dark-bg/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span class="text-xs font-bold text-blue-600">Processing...</span>
                    </div>
                </div>
            {/if}
            <textarea bind:value={$generatedOutput}
                class="w-full h-full bg-transparent border-none p-4 font-mono text-[11px] outline-none custom-scrollbar resize-none absolute inset-0 pb-1"
                readonly placeholder="Output will appear here..."></textarea>
        </div>

        <div class="flex items-center justify-between gap-4 pt-1 shrink-0">
            <button on:click={generatePrompt}
                class="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-blue-500/20 transform transition-all active:scale-95 flex items-center justify-center gap-3 text-sm">
                <i class="fas fa-bolt"></i> GENERATE PROMPT
            </button>
            <div class="flex gap-2">
                <button on:click={(e) => copyToClipboard(e)}
                    class="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-all">
                    <i class="fas fa-copy text-blue-500"></i> COPY
                </button>
                <button on:click={downloadFile}
                    class="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-all">
                    <i class="fas fa-download text-indigo-500"></i> DOWNLOAD
                </button>
            </div>
        </div>
    </div>
</section>
