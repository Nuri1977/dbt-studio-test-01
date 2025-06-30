import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { toast } from 'react-toastify';

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
      toast.success('Update downloaded. The app will restart to install.');
    } catch (error) {
      console.error('Error downloading update:', error);
      toast.error('Failed to download update.');
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

  const handleClose = () => {
    setUpdateInfo(null);
  };

  return (
    <Dialog open={!!updateInfo} onClose={handleClose}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Update Available
        <IconButton
          aria-label="close"
          onClick={handleClose}
          edge="end"
          size="small"
          sx={{ ml: 2 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          A new version ({updateInfo.newVersion}) is available. You are running{' '}
          {updateInfo.currentVersion}.
        </Typography>
        {updateInfo.releaseNotes && (
          <Typography 
            variant="body2" 
            color="textSecondary"
            dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReject} color="primary" disabled={isDownloading}>
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
