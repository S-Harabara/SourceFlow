import { 
    fileTreeData, 
    fileHandles, 
    selectedFiles, 
    folderName, 
    recentFolders,
    rootPath
} from '../promptStore.js';
import { buildFileTree, GitIgnore } from './fileScanner.js';
import { selectProjectFolder } from './gitUtils.js';

export async function selectFolder() {
    try {
        const result = await selectProjectFolder();
        if (!result) return;

        const { path: folderPath, name } = result;
        
        fileTreeData.set([]);
        fileHandles.set([]);
        selectedFiles.set(new Set());
        folderName.set(name);
        rootPath.set(folderPath);

        const { tree, handles } = await buildFileTree(folderPath);

        fileHandles.set(handles);
        fileTreeData.set([
            {
                name: name,
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
            let next = r.filter((x) => x.name !== name);
            next.unshift({ name, path: folderPath });
            if (next.length > 8) next.pop();
            return next;
        });
    } catch (e) {
        console.error(e);
    }
}

export function resetFolder() {
    fileTreeData.set([]);
    fileHandles.set([]);
    selectedFiles.set(new Set());
    folderName.set("");
}

