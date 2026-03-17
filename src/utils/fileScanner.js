const { ipcRenderer } = window.require('electron');

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

export async function buildFileTree(projectPath) {
    const tree = await ipcRenderer.invoke('scan-directory', { projectPath });
    
    // Flatten for fileHandles stores
    const handles = [];
    const flatten = (nodes) => {
        nodes.forEach(n => {
            if (n.kind === 'file') {
                // We wrap it in a mock handle that uses IPC to read file content
                handles.push({ 
                    p: n.path, 
                    s: n.size, 
                    n: n.name,
                    h: {
                        getFile: async () => ({
                            text: async () => await ipcRenderer.invoke('read-file', { filePath: n.path, projectPath })
                        })
                    }
                });
            } else if (n.children) {
                flatten(n.children);
            }
        });
    };
    flatten(tree);
    
    return { tree, handles };
}
