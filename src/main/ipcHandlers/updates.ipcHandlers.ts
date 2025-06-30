import { BrowserWindow, ipcMain } from 'electron';
import UpdateManager from '../services/update.service';
import { autoUpdater } from 'electron-updater';

const registerUpdateHandlers = (mainWindow: BrowserWindow) => {
  ipcMain.handle('updates:check', async () => {
    return UpdateManager.checkForUpdates(mainWindow);
  });

  ipcMain.handle('updates:check-settings', async () => {
    return UpdateManager.checkForSettingsUpdates(mainWindow);
  });

  ipcMain.handle('updates:download', async () => {
    return UpdateManager.downloadAndInstall();
  });

  ipcMain.handle('updates:reject-version', async (_event, version: string) => {
    return UpdateManager.rejectVersion(version);
  });

  ipcMain.handle('updates:restart', async () => {
    autoUpdater.quitAndInstall();
  });
};

export default registerUpdateHandlers;
