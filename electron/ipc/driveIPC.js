const { ipcMain } = require('electron');
const { startOAuthFlow, disconnect, loadCredentials } = require('../services/drive/driveAuth');
const { triggerBackup, uploadImagesChunk, triggerRestore } = require('../services/drive/driveBackup');

function initDriveIPC() {
  // Connect flow
  ipcMain.handle('focora:drive-connect', async (event) => {
    try {
      const email = await startOAuthFlow();
      return { success: true, email };
    } catch (err) {
      console.error('focora/driveIPC: Connect failed', err);
      return { success: false, error: err.message };
    }
  });

  // Disconnect flow
  ipcMain.handle('focora:drive-disconnect', async (event) => {
    try {
      await disconnect();
      return { success: true };
    } catch (err) {
      console.error('focora/driveIPC: Disconnect failed', err);
      return { success: false, error: err.message };
    }
  });

  // Status check
  ipcMain.handle('focora:drive-status', async (event) => {
    try {
      const auth = loadCredentials();
      if (!auth) {
        return { connected: false };
      }
      return { connected: true, email: auth.email };
    } catch (err) {
      console.error('focora/driveIPC: Status check failed', err);
      return { connected: false, error: err.message };
    }
  });

  // Backup folders, pages, and analyze images
  ipcMain.handle('focora:drive-backup', async (event, payload) => {
    try {
      const res = await triggerBackup(payload, event.sender);
      return { success: true, ...res };
    } catch (err) {
      console.error('focora/driveIPC: Backup initialization failed', err);
      return { success: false, error: err.message };
    }
  });

  // Upload a chunk of raw ArrayBuffer images
  ipcMain.handle('focora:drive-upload-images', async (event, payload) => {
    const { chunk, imagesFolderId, currentCount, totalCount } = payload;
    try {
      await uploadImagesChunk(chunk, imagesFolderId, currentCount, totalCount, event.sender);
      return { success: true };
    } catch (err) {
      console.error('focora/driveIPC: Image chunk upload failed', err);
      return { success: false, error: err.message };
    }
  });

  // Download restore payload
  ipcMain.handle('focora:drive-restore', async (event) => {
    try {
      const res = await triggerRestore(event.sender);
      return { success: true, ...res };
    } catch (err) {
      console.error('focora/driveIPC: Restore failed', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = {
  initDriveIPC
};
