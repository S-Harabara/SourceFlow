import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

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
        // Check if refs/heads/<branch> exists
        await execAsync(`git rev-parse --verify "refs/heads/${branch}"`, { cwd: projectPath });
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('fetch-branch', async (event, { projectPath, branch }) => {
    try {
        // Try to fetch the specific branch from origin and create a local tracking branch
        // If it's already local, this might fail or do nothing depending on the command
        // We use fetch origin <branch>:<branch> to create/update local branch from remote
        await execAsync(`git fetch origin "${branch}":"${branch}"`, { cwd: projectPath });
        return true;
    } catch (error) {
        console.error(`Error fetching branch ${branch}:`, error);
        throw error;
    }
});

async function walkDir(dir, baseDir, ignoreFilter) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const files = await fs.readdir(dir, { withFileTypes: true });
    const nodes = [];

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (ignoreFilter && ignoreFilter.ignores(relativePath)) continue;

        if (file.isDirectory()) {
            const children = await walkDir(fullPath, baseDir, ignoreFilter);
            nodes.push({
                name: file.name,
                kind: 'directory',
                path: relativePath,
                children,
                expanded: false
            });
        } else {
            const stats = await fs.stat(fullPath);
            nodes.push({
                name: file.name,
                kind: 'file',
                path: relativePath,
                size: stats.size,
                isText: true // We can add more logic here if needed
            });
        }
    }
    return nodes.sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1);
}

ipcMain.handle('scan-directory', async (event, { projectPath, ignoreRules }) => {
    // Basic ignore logic if not passed
    const rules = ignoreRules || '.git\nnode_modules\n.next\ndist\nbuild\nout\n.cache';
    // We reuse the GitIgnore-like logic from main or just pass it
    // For simplicity, let's just do a basic check here or implement it
    
    // Actually, it's better to implement the ignore logic in the renderer or pass a filter
    const { stdout } = await execAsync('ls -R', { cwd: projectPath }).catch(() => ({ stdout: '' })); // just a placeholder
    
    // Let's use fs.readdir instead
    return await walkDir(projectPath, projectPath, null); 
});

ipcMain.handle('read-file', async (event, { filePath, projectPath }) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
    return await fs.readFile(fullPath, 'utf8');
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
