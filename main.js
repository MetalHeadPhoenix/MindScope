const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

// Suppress GPU warnings
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu');

if (app.isPackaged) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

// Simple storage using fs
const userDataPath = path.join(app.getPath('userData'), 'mindscope-settings.json');

function readSettings() {
    try {
        if (fs.existsSync(userDataPath)) {
            return JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading settings:', error);
    }
    return {
        theme: 'light',
        autoSave: true,
        minimizeToTray: false,
        zoomLevel: 1,
        windowBounds: { width: 1400, height: 900 }
    };
}

function writeSettings(settings) {
    try {
        fs.writeFileSync(userDataPath, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Error writing settings:', error);
    }
}

function getSetting(key, defaultValue) {
    const settings = readSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
}

function setSetting(key, value) {
    const settings = readSettings();
    settings[key] = value;
    writeSettings(settings);
}

let mainWindow;
let tray;
let isQuitting = false;

function getAssetPath(filename) {
    const isDev = !app.isPackaged;
    if (isDev) {
        return path.join(__dirname, 'assets', filename);
    }
    return path.join(process.resourcesPath, 'assets', filename);
}

function createWindow() {
    const windowBounds = getSetting('windowBounds', { width: 1400, height: 900 });
    
    mainWindow = new BrowserWindow({
        width: windowBounds.width,
        height: windowBounds.height,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        backgroundColor: '#f0f2f5',
        show: false,
        frame: true,
        title: 'MindScope'
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        const zoomLevel = getSetting('zoomLevel', 1);
        if (zoomLevel && zoomLevel !== 1) {
            mainWindow.webContents.setZoomFactor(zoomLevel);
        }
    });

    mainWindow.on('resize', () => {
        if (!mainWindow.isMaximized()) {
            const bounds = mainWindow.getBounds();
            setSetting('windowBounds', { width: bounds.width, height: bounds.height });
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('minimize', (event) => {
        if (getSetting('minimizeToTray', false)) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    if (process.argv.includes('--dev') && !app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }
}

function createTray() {
    const trayIconPath = getAssetPath('tray-icon.png');
    
    if (!fs.existsSync(trayIconPath)) {
        return;
    }
    
    tray = new Tray(trayIconPath);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show MindScope',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                }
            }
        },
        {
            label: 'Hide',
            click: () => {
                if (mainWindow) {
                    mainWindow.hide();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);
    
    tray.setToolTip('MindScope');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        }
    });
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Export Data',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('export-data');
                        }
                    }
                },
                {
                    label: 'Import Data',
                    accelerator: 'CmdOrCtrl+I',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('import-data');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        isQuitting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: 'Redo', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
                { type: 'separator' },
                { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        if (mainWindow) {
                            const currentZoom = mainWindow.webContents.getZoomFactor();
                            const newZoom = Math.min(currentZoom + 0.1, 2.5);
                            mainWindow.webContents.setZoomFactor(newZoom);
                            setSetting('zoomLevel', newZoom);
                        }
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        if (mainWindow) {
                            const currentZoom = mainWindow.webContents.getZoomFactor();
                            const newZoom = Math.max(currentZoom - 0.1, 0.3);
                            mainWindow.webContents.setZoomFactor(newZoom);
                            setSetting('zoomLevel', newZoom);
                        }
                    }
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.setZoomFactor(1);
                            setSetting('zoomLevel', 1);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Toggle Full Screen',
                    accelerator: 'F11',
                    role: 'togglefullscreen'
                },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.reload();
                        }
                    }
                },
                {
                    label: 'Developer Tools',
                    accelerator: 'CmdOrCtrl+Shift+I',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.openDevTools();
                        }
                    }
                }
            ]
        },
        {
            label: 'Window',
            role: 'window',
            submenu: [
                { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
                { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'GitHub Repository',
                    click: () => {
                        shell.openExternal('https://github.com/MetalHeadPhoenix/MindScope');
                    }
                },
                {
                    label: 'Report Issue',
                    click: () => {
                        shell.openExternal('https://github.com/MetalHeadPhoenix/MindScope/issues');
                    }
                },
                { type: 'separator' },
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'About MindScope',
                            message: 'MindScope',
                            detail: `Version: ${app.getVersion()}\n\nOrganize your learning journey across all areas of life.\n\nCreated with Electron ❤️`,
                            buttons: ['OK']
                        });
                    }
                }
            ]
        }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-settings', () => {
    return readSettings();
});

ipcMain.handle('set-setting', (event, key, value) => {
    setSetting(key, value);
    if (key === 'theme' && mainWindow) {
        mainWindow.webContents.send('theme-changed', value);
    }
    return true;
});

// Fixed Export handler - saves clean JSON
ipcMain.handle('export-data', async (event, userData) => {
    try {
        // Make sure we're stringifying an object, not a string
        let dataToExport = userData;
        if (typeof userData === 'string') {
            try {
                dataToExport = JSON.parse(userData);
            } catch (e) {
                dataToExport = userData;
            }
        }
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const defaultPath = `mindscope_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        
        const { filePath, canceled } = await dialog.showSaveDialog({
            defaultPath: defaultPath,
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (canceled || !filePath) {
            return { success: false, error: 'Export cancelled' };
        }
        
        fs.writeFileSync(filePath, dataStr, 'utf8');
        return { success: true, path: filePath };
    } catch (error) {
        console.error('Export error:', error);
        return { success: false, error: error.message };
    }
});

// Fixed Import handler - handles both string and object data
ipcMain.handle('import-data', async () => {
    try {
        const { filePaths, canceled } = await dialog.showOpenDialog({
            title: 'Import Data',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });
        
        if (canceled || !filePaths || filePaths.length === 0) {
            return { success: false, error: 'Import cancelled' };
        }
        
        const filePath = filePaths[0];
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Try to parse the content
        let data;
        try {
            // First attempt: direct parse
            data = JSON.parse(content);
        } catch (firstError) {
            // Second attempt: try to clean the string if it's double-escaped
            try {
                // Remove outer quotes if present
                let cleaned = content;
                if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                    cleaned = cleaned.slice(1, -1);
                    // Unescape the string
                    cleaned = cleaned.replace(/\\"/g, '"');
                    cleaned = cleaned.replace(/\\n/g, '\n');
                    cleaned = cleaned.replace(/\\\\/g, '\\');
                    data = JSON.parse(cleaned);
                } else {
                    throw firstError;
                }
            } catch (secondError) {
                console.error('Both parse attempts failed:', secondError);
                return { success: false, error: 'Invalid JSON file format. Please make sure the file contains valid JSON.' };
            }
        }
        
        // Validate the data structure
        if (!data || typeof data !== 'object') {
            return { success: false, error: 'Invalid data format: not an object' };
        }
        
        // Ensure it has fields property
        if (!data.fields) {
            data.fields = [];
        }
        
        return { success: true, path: filePath, data: data };
    } catch (error) {
        console.error('Import error:', error);
        return { success: false, error: error.message };
    }
});

// App event handlers
app.whenReady().then(() => {
    createWindow();
    createMenu();
    
    const theme = getSetting('theme', 'light');
    if (theme === 'dark') {
        nativeTheme.themeSource = 'dark';
    } else if (theme === 'light') {
        nativeTheme.themeSource = 'light';
    } else {
        nativeTheme.themeSource = 'system';
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !isQuitting) {
        app.quit();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (!error.message.includes('GetVSyncParametersIfAvailable')) {
        dialog.showErrorBox('An unexpected error occurred', error.message);
    }
});

module.exports = { createWindow, app };