export class GitIgnore {
    constructor(p) { 
        this.rules = p.split('\n').filter(l => l && !l.startsWith('#')).map(r => { 
            let n = r.startsWith('!'); 
            if (n) r = r.slice(1); 
            return { re: new RegExp(r.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')), isNeg: n }; 
        }); 
    }
    ignores(p) { 
        let ig = false; 
        this.rules.forEach(r => { if (r.re.test(p)) ig = !r.isNeg; }); 
        return ig || p.includes('node_modules') || p.includes('.git'); 
    }
}

export function isTextFile(n) { 
    return ['.vue', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.json', '.md', '.py', '.go', '.rs', '.php', '.rb', '.txt', '.sh', '.yaml', '.yml', '.lock', '.toml', '.svelte'].some(e => n.toLowerCase().endsWith(e)) || ['Makefile', 'Dockerfile', 'root'].includes(n); 
}

export async function buildFileTree(handle, pathPrefix = '', ignoreFilter = null, fileHandlesArray = []) {
    const list = []; 
    for await (const e of handle.values()) list.push(e);
    list.sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1);

    const nodes = [];
    for (const e of list) {
        const fullPath = pathPrefix ? `${pathPrefix}/${e.name}` : e.name;
        if (ignoreFilter && ignoreFilter.ignores(fullPath)) continue;

        if (e.kind === 'directory') {
            const dirHandle = await handle.getDirectoryHandle(e.name);
            const children = await buildFileTree(dirHandle, fullPath, ignoreFilter, fileHandlesArray);
            nodes.push({ name: e.name, kind: 'directory', path: fullPath, children, expanded: false });
        } else {
            const isText = isTextFile(e.name);
            let size = 0;
            if (isText) {
                const fileHandle = await handle.getFileHandle(e.name);
                const file = await fileHandle.getFile();
                size = file.size;
                fileHandlesArray.push({ h: fileHandle, p: fullPath, s: size, n: e.name });
                nodes.push({ name: e.name, kind: 'file', path: fullPath, size, isText: true });
            } else {
                nodes.push({ name: e.name, kind: 'file', path: fullPath, size: 0, isText: false });
            }
        }
    }
    return nodes;
}
