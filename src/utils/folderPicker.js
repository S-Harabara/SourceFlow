/** @type {import('svelte/store').Writable<any[]>} */
import { 
    fileTreeData, 
    fileHandles, 
    selectedFiles, 
    folderName, 
    recentFolders 
} from '../promptStore.js';
import { buildFileTree, GitIgnore } from './fileScanner.js';

export async function selectFolder() {
    try {
        // @ts-ignore
        const handle = await window.showDirectoryPicker();
        fileTreeData.set([]);
        fileHandles.set([]);
        selectedFiles.set(new Set());
        folderName.set(handle.name);

        const ignoreFilter = new GitIgnore('.git\nnode_modules\n.next\ndist\nbuild\nout\n.cache');

        /** @type {any[]} */
        let handlesArray = [];
        const tree = await buildFileTree(handle, '', ignoreFilter, handlesArray);

        fileHandles.set(handlesArray);
        fileTreeData.set([
            {
                name: handle.name,
                kind: 'directory',
                path: 'root',
                children: tree,
                expanded: true,
                isRoot: true
            }
        ]);

        // Save recent
        recentFolders.update((r) => {
            /** @type {any[]} */
            let next = r.filter((x) => x.name !== handle.name);
            next.unshift({ name: handle.name, handle });
            if (next.length > 8) next.pop();
            return next;
        });
    } catch (e) {
        if (e && typeof e === 'object' && 'name' in e && e.name !== 'AbortError') {
            console.error(e);
        }
    }
}

export function resetFolder() {
    fileTreeData.set([]);
    fileHandles.set([]);
    selectedFiles.set(new Set());
    folderName.set("");
}

