import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { initDb, getSkills, addSkill, updateSkill, deleteSkill, incrementUsage, bulkAddSkills } from './db.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Disable CORS restrictions for skills.sh fetching
        }
    });

    if (process.argv.includes('--dev')) {
        // Wait briefly for Vite server to start before loading
        setTimeout(() => {
            win.loadURL('http://localhost:5173').catch(() => {
                setTimeout(() => win.loadURL('http://localhost:5173'), 1000);
            });
        }, 1000);
    } else {
        win.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
}

// IPC Handlers
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    const folderPath = result.filePaths[0];
    return {
        path: folderPath,
        name: path.basename(folderPath)
    };
});

ipcMain.handle('get-git-branches', async (event, projectPath) => {
    try {
        // Try to fetch latest branches, but don't fail if it doesn't work (e.g. no internet)
        await execAsync('git fetch --all --prune', { cwd: projectPath }).catch(() => {});
        
        const { stdout } = await execAsync('git branch -a --format="%(refname:short)"', { cwd: projectPath });
        const branches = stdout.split('\n')
            .map(b => b.trim())
            .filter(b => b && !b.includes('->'));
        return [...new Set(branches)]; // Unique branches
    } catch (error) {
        console.error('Error fetching git branches:', error);
        return [];
    }
});

ipcMain.handle('get-git-diff', async (event, { projectPath, source, target }) => {
    try {
        // Use -U1000 to get a lot of context, or just standard diff
        // Using space instead of .. and adding -- to avoid ambiguity with filenames
        const { stdout } = await execAsync(`git diff "${source}" "${target}" --`, { 
            cwd: projectPath,
            maxBuffer: 20 * 1024 * 1024 // 20MB
        });
        return stdout;
    } catch (error) {
        console.error('Error fetching git diff:', error);
        throw error;
    }
});

ipcMain.handle('check-branch-local', async (event, { projectPath, branch }) => {
    try {
        // Strict check: only branches in refs/heads/ are considered "Local"
        await execAsync(`git show-ref --verify "refs/heads/${branch}"`, { cwd: projectPath });
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('fetch-branch', async (event, { projectPath, branch }) => {
    try {
        let remote = 'origin';
        let remoteBranch = branch;
        let localBranch = branch;

        // Try to identify remote from prefix (e.g. origin/main -> remote=origin, branch=main)
        // Correct prefix detection depends on knowing existing remotes
        const { stdout: remotesOut } = await execAsync('git remote', { cwd: projectPath });
        const remotesArray = remotesOut.split('\n').map(r => r.trim()).filter(Boolean);
        
        for (const r of remotesArray) {
            if (branch.startsWith(`${r}/`)) {
                remote = r;
                remoteBranch = branch.replace(`${r}/`, '');
                localBranch = remoteBranch;
                break;
            }
        }

        console.log(`Executing: git fetch ${remote} "+${remoteBranch}":"${localBranch}"`);
        await execAsync(`git fetch ${remote} "+${remoteBranch}":"${localBranch}"`, { cwd: projectPath });
        return true;
    } catch (error) {
        console.error(`Error fetching branch ${branch}:`, error);
        throw error;
    }
});

class IgnoreMatcher {
    constructor(p = '') { 
        this.rules = p.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'))
            .map(r => { 
                let n = r.startsWith('!'); 
                if (n) r = r.slice(1); 
                // Basic conversion of gitignore-style glob to regex
                // This is a simplified version:
                let regexStr = r
                    .replace(/\./g, '\\.')
                    .replace(/\*\*/g, '(.+)')
                    .replace(/\*/g, '([^/]*)');
                
                if (r.endsWith('/')) {
                    regexStr += '(.*)';
                } else if (!r.includes('/')) {
                    // If it's just a name, match it anywhere
                    regexStr = '(.*/)?' + regexStr + '(/.*)?$';
                }

                try {
                    return { re: new RegExp(regexStr), isNeg: n };
                } catch (e) {
                    console.error('Invalid gitignore rule:', r, e);
                    return null;
                }
            }).filter(Boolean); 
    }
    ignores(p) { 
        // Always ignore .git and node_modules as per user request
        if (p === '.git' || p.startsWith('.git/') || p === 'node_modules' || p.startsWith('node_modules/')) {
            return true;
        }

        let ig = false; 
        this.rules.forEach(r => { 
            if (r.re.test(p)) ig = !r.isNeg; 
        }); 
        return ig; 
    }
}

const textExtensions = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.html', '.css', '.scss', '.less',
    '.json', '.md', '.txt', '.py', '.rb', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
    '.java', '.php', '.sh', '.yaml', '.yml', '.xml', '.sql', '.gradle', '.properties',
    '.ini', '.env', '.toml', '.lock', '.gitignore', '.dockerignore', '.editorconfig',
    '.babelrc', '.eslintrc', '.prettierrc'
]);

const textFilenames = new Set([
    'makefile', 'dockerfile', 'root', 'license', 'readme'
]);

function isTextFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (textExtensions.has(ext)) return true;
    const name = path.basename(filename).toLowerCase();
    if (textFilenames.has(name)) return true;
    return false;
}

async function walkDir(dir, baseDir, ignoreFilter, onProgress) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const files = await fs.readdir(dir, { withFileTypes: true });
    const nodes = [];

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (ignoreFilter && ignoreFilter.ignores(relativePath)) continue;

        if (file.isDirectory()) {
            const children = await walkDir(fullPath, baseDir, ignoreFilter, onProgress);
            nodes.push({
                name: file.name,
                kind: 'directory',
                path: relativePath,
                children,
                expanded: false
            });
        } else {
            if (onProgress) onProgress();

            const stats = await fs.stat(fullPath);
            nodes.push({
                name: file.name,
                kind: 'file',
                path: relativePath,
                size: stats.size,
                isText: isTextFile(file.name)
            });
        }
    }
    return nodes.sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1);
}

ipcMain.handle('scan-directory', async (event, { projectPath }) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    let ignoreRules = '';
    try {
        const gitignorePath = path.join(projectPath, '.gitignore');
        ignoreRules = await fs.readFile(gitignorePath, 'utf8');
    } catch (e) {
        // No .gitignore found
    }

    const matcher = new IgnoreMatcher(ignoreRules);
    
    let scannedCount = 0;
    const onProgress = () => {
        scannedCount++;
        if (scannedCount % 50 === 0) {
            event.sender.send('scan-progress', scannedCount);
        }
    };

    const tree = await walkDir(projectPath, projectPath, matcher, onProgress);
    event.sender.send('scan-progress', scannedCount); // Final count
    return tree;
});

ipcMain.handle('read-file', async (event, { filePath, projectPath }) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
    return await fs.readFile(fullPath, 'utf8');
});

// Database IPC Handlers
ipcMain.handle('db:get-skills', async (event, { sortField, sortOrder }) => {
    return getSkills(sortField, sortOrder);
});

ipcMain.handle('db:add-skill', async (event, skill) => {
    return addSkill(skill);
});

ipcMain.handle('db:update-skill', async (event, { id, patch }) => {
    return updateSkill(id, patch);
});

ipcMain.handle('db:delete-skill', async (event, id) => {
    return deleteSkill(id);
});

ipcMain.handle('db:increment-usage', async (event, id) => {
    return incrementUsage(id);
});

ipcMain.handle('db:bulk-add-skills', async (event, skills) => {
    return bulkAddSkills(skills);
});

app.whenReady().then(() => {
    // // 1. Grant general file system access
    // session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    //     if (permission === 'fileSystem') {
    //         callback(true); 
    //     } else {
    //         callback(true); 
    //     }
    // });

    // session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    //     if (permission === 'fileSystem') return true;
    //     return true;
    // });

    // // 2. CRITICAL FIX: Handle restricted paths that cause the "File picker already active" bug
    // session.defaultSession.on('file-system-access-restricted', (event, details, callback) => {
    //     // Automatically allow access to protected folders (Desktop, Downloads, etc.)
    //     // This forces the Promise to resolve and frees up the file picker lock.
    //     callback('allow'); 
    // });

    initDb();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
