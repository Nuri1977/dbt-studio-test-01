import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';

interface UpdateInfo {
  currentVersion: string;
  newVersion: string;
  releaseNotes?: string;
}

export const UpdateDialog: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Check for updates when component mounts
    checkForUpdates();

    // Check every hour
    const interval = setInterval(checkForUpdates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('updates:check');
      if (result) {
        setUpdateInfo(result);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const handleUpdate = async () => {
    setIsDownloading(true);
    try {
      await window.electron.ipcRenderer.invoke('updates:download');
    } catch (error) {
      console.error('Error downloading update:', error);
      setIsDownloading(false);
    }
  };

  const handleReject = async () => {
    if (updateInfo) {
      await window.electron.ipcRenderer.invoke(
        'updates:reject-version',
        updateInfo.newVersion,
      );
      setUpdateInfo(null);
    }
  };

  if (!updateInfo) return null;

  return (
    <Dialog open={!!updateInfo} onClose={handleReject}>
      <DialogTitle>Update Available</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          A new version ({updateInfo.newVersion}) is available. You are running{' '}
          {updateInfo.currentVersion}.
        </Typography>
        {updateInfo.releaseNotes && (
          <Typography variant="body2" color="textSecondary">
            {updateInfo.releaseNotes}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReject} color="primary">
          Not Now
        </Button>
        <Button
          onClick={handleUpdate}
          color="primary"
          variant="contained"
          disabled={isDownloading}
          startIcon={isDownloading ? <CircularProgress size={16} /> : null}
        >
          {isDownloading ? 'Downloading...' : 'Update Now'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
