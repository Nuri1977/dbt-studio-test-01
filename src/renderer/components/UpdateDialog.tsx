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
  Alert,
  Collapse,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface UpdateInfo {
  currentVersion: string;
  newVersion: string;
  releaseNotes?: string;
}

export const UpdateDialog: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showRestartButton, setShowRestartButton] = useState(false);

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
      setIsDownloading(false);
      setShowSuccessAlert(true);
      setShowRestartButton(true);
    } catch (error) {
      console.error('Error downloading update:', error);
      setIsDownloading(false);
    }
  };

  const handleRestart = async () => {
    await window.electron.ipcRenderer.invoke('updates:restart');
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
      {/* Success Alert */}
      <Collapse in={showSuccessAlert}>
        <Alert
          severity="success"
          onClose={() => setShowSuccessAlert(false)}
          sx={{ mb: 2 }}
          action={
            showRestartButton && (
              <Button color="inherit" size="small" onClick={handleRestart}>
                Restart Now
              </Button>
            )
          }
        >
          Update downloaded. The update will be installed after you restart the app.
        </Alert>
      </Collapse>
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
