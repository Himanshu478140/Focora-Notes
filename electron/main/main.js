const { app, BrowserWindow, Menu, protocol, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDriveIPC } = require('../../src/Drivebackup/ipc/driveIPC');

// Display error dialog if an unhandled error occurs on Windows
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Focora Notes - Startup Error', error?.stack || error?.message || String(error));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  dialog.showErrorBox('Focora Notes - Promise Error', String(reason));
});

// Disable hardware acceleration and sandbox switches to prevent GPU/Sandbox crashes on Windows updates
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

// Register privileged custom scheme before app ready
if (!isDev) {
  try {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'app',
        privileges: {
          standard: true,
          secure: true,
          allowServiceWorkers: true,
          supportFetchAPI: true,
          corsEnabled: true,
          codeCache: true,
        }
      }
    ]);
  } catch (err) {
    console.error('Failed to register privileged scheme:', err);
  }
}

// Initialize Google Drive IPC listeners
initDriveIPC();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Focora Notes',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#7C5CFC',
      height: 32
    },
    backgroundColor: '#0c0c0e',
    show: false,
    icon: path.join(__dirname, '../../public/focora-notes_newlogo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Smoothly display window only after initial paint to eliminate white flash
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Set application menu to null for a cleaner, modern interface
  Menu.setApplicationMenu(null);

  if (isDev) {
    // In development, load the Next.js dev server URL
    mainWindow.loadURL('http://localhost:3000').catch((err) => {
      console.error('Failed to load local URL, retrying in 2 seconds...', err);
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.loadURL('http://localhost:3000').catch((e) => console.error('Retry failed:', e));
        }
      }, 2000);
    });
    // DevTools automatically opened in development (Disabled)
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, load static Next.js export served via custom app protocol
    mainWindow.loadURL('app://-/index.html').catch((err) => {
      console.error('Failed to load production static assets:', err);
      dialog.showErrorBox('Load Error', 'Failed to load static assets: ' + (err.stack || err.message));
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock to prevent opening multiple app windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.warn('Focora Notes is already running in the background. Quitting new instance.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('ready', async () => {
    if (!isDev) {
      try {
        session.defaultSession.protocol.handle('app', async (request) => {
          try {
            const url = new URL(request.url);
            let relativePath = decodeURIComponent(url.pathname);
            if (relativePath === '/' || relativePath === '') {
              relativePath = '/index.html';
            }

            const outDir = path.join(app.getAppPath(), 'out');
            let filePath = path.join(outDir, relativePath);

            if (!fs.existsSync(filePath) && !path.extname(filePath)) {
              if (fs.existsSync(filePath + '.html')) {
                filePath = filePath + '.html';
              } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
                filePath = path.join(filePath, 'index.html');
              }
            }

            const data = await fs.promises.readFile(filePath);
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
              '.html': 'text/html',
              '.js': 'text/javascript',
              '.css': 'text/css',
              '.json': 'application/json',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.svg': 'image/svg+xml',
              '.webp': 'image/webp',
              '.gif': 'image/gif',
              '.woff': 'font/woff',
              '.woff2': 'font/woff2',
              '.ttf': 'font/ttf',
              '.ico': 'image/x-icon',
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            return new Response(data, {
              status: 200,
              headers: { 'Content-Type': contentType }
            });
          } catch (err) {
            console.error('Failed to serve asset:', request.url, err);
            return new Response('Not Found', { status: 404 });
          }
        });
      } catch (err) {
        console.error('Failed to register app protocol handler:', err);
      }
    }

    createWindow();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
