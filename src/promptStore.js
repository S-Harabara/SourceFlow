import { writable, derived } from 'svelte/store';
import { getTokenCount } from './utils/tokenizer.js';

// Folder state
export const folderName = writable("");
export const rootPath = writable(""); // Absolute path for git/node operations
export const fileHandles = writable([]);
export const selectedFiles = writable(new Set()); // set of paths
export const fileTreeData = writable([]);
export const recentFolders = writable([]);

// UI State
export const explorerFilter = writable('');
export const includeGoal = writable(false);
export const goalText = writable('');
export const includeStructure = writable(false);
export const removeComments = writable(false);
export const minifyOutput = writable(false);

// Generation State
export const generatedOutput = writable('');
export const isGenerating = writable(false);

export const activeModalFile = writable(null); // { name, content }

// Computed stats
export const totalSelectedSize = derived(
    [fileHandles, selectedFiles],
    ([$fileHandles, $selectedFiles]) => {
        let size = 0;
        for (const path of $selectedFiles) {
            const h = $fileHandles.find(f => f.p === path);
            if (h) size += h.s;
        }
        return size;
    }
);

export const totalSelectedTokens = derived(
    totalSelectedSize,
    ($size) => Math.ceil($size / 4) // Selection is still estimation due to async nature of files
);

export const previewSize = derived(
    generatedOutput,
    ($out) => new Blob([$out]).size
);

export const previewTokens = derived(
    generatedOutput,
    ($out) => getTokenCount($out)
);

