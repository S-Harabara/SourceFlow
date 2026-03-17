import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
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

app.whenReady().then(() => {
    // 1. Grant general file system access
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'fileSystem') {
            callback(true); 
        } else {
            callback(true); 
        }
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        if (permission === 'fileSystem') return true;
        return true;
    });

    // 2. CRITICAL FIX: Handle restricted paths that cause the "File picker already active" bug
    session.defaultSession.on('file-system-access-restricted', (event, details, callback) => {
        // Automatically allow access to protected folders (Desktop, Downloads, etc.)
        // This forces the Promise to resolve and frees up the file picker lock.
        callback('allow'); 
    });

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
