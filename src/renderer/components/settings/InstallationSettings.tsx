import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Download,
  CheckCircle,
  Update,
  Info,
} from '@mui/icons-material';

interface UpdateInfo {
  currentVersion: string;
  newVersion: string;
  releaseNotes?: string;
}

interface InstallationSettingsProps {
  // You can add props here if needed
}

const InstallationSettings: React.FC<InstallationSettingsProps> = () => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // Get current version on component mount
  useEffect(() => {
    getCurrentVersion();
    getSystemInfo();
  }, []);

  const getCurrentVersion = async () => {
    try {
      // For now, we'll use a hardcoded version - you can implement the IPC call later
      setCurrentVersion('1.0.6');
    } catch (error) {
      console.error('Error getting current version:', error);
      setCurrentVersion('1.0.6');
    }
  };

  const getSystemInfo = async () => {
    try {
      const userAgent = navigator.userAgent;
      
      // Detect OS
      let os = 'Unknown';
      if (userAgent.includes('Mac')) os = 'macOS';
      else if (userAgent.includes('Win')) os = 'Windows';
      else if (userAgent.includes('Linux')) os = 'Linux';

      // Detect architecture from user agent
      let arch = 'Unknown';
      if (userAgent.includes('Intel')) arch = 'Intel';
      else if (userAgent.includes('arm64') || userAgent.includes('ARM64')) arch = 'ARM64';
      else if (userAgent.includes('x86_64') || userAgent.includes('x64')) arch = 'x64';
      else if (userAgent.includes('i386') || userAgent.includes('x86')) arch = 'x86';

      // Extract versions from user agent
      const chromeMatch = userAgent.match(/Chrome\/([0-9.]+)/);
      const electronMatch = userAgent.match(/Electron\/([0-9.]+)/);
      
      setSystemInfo({
        platform: os,
        arch: arch,
        electronVersion: electronMatch ? electronMatch[1] : 'Unknown',
        nodeVersion: 'Available in main process',
        chromeVersion: chromeMatch ? chromeMatch[1] : 'Unknown',
        userAgent: userAgent
      });
    } catch (error) {
      console.error('Error getting system info:', error);
      setSystemInfo({
        platform: 'Unknown',
        arch: 'Unknown',
        electronVersion: 'Unknown',
        nodeVersion: 'Unknown',
        chromeVersion: 'Unknown'
      });
    }
  };

  const checkForUpdates = async () => {
    setIsCheckingForUpdates(true);
    try {
      const result = await window.electron.ipcRenderer.invoke('updates:check');
      setUpdateInfo(result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo) return;
    
    setIsUpdating(true);
    try {
      await window.electron.ipcRenderer.invoke('updates:download');
      // The app will restart automatically after download
    } catch (error) {
      console.error('Error downloading update:', error);
      setIsUpdating(false);
    }
  };

  const isUpdateAvailable = updateInfo && updateInfo.currentVersion !== updateInfo.newVersion;

  return (
    <Box sx={{ maxWidth: 600, width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Installation Information
      </Typography>
      
      {/* Current Version Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Info color="primary" />
            <Typography variant="h6">Current Installation</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="body1">Version:</Typography>
            <Chip 
              label={currentVersion} 
              color="primary" 
              variant="outlined"
              icon={<CheckCircle />}
            />
          </Box>
          
          <Typography variant="body2" color="textSecondary">
            Rosetta dbt Studio - Turn Raw Data into Business Insights
          </Typography>
        </CardContent>
      </Card>

      {/* Update Check Section */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Update color="primary" />
            <Typography variant="h6">Updates</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              onClick={checkForUpdates}
              disabled={isCheckingForUpdates}
              startIcon={
                isCheckingForUpdates ? (
                  <CircularProgress size={16} />
                ) : (
                  <Download />
                )
              }
            >
              {isCheckingForUpdates ? 'Checking...' : 'Check for Updates'}
            </Button>
            
            {lastChecked && (
              <Typography variant="body2" color="textSecondary">
                Last checked: {lastChecked.toLocaleString()}
              </Typography>
            )}
          </Box>

          {updateInfo && (
            <>
              <Divider sx={{ my: 2 }} />
              
              {isUpdateAvailable ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    A new version ({updateInfo.newVersion}) is available!
                  </Typography>
                  
                  {updateInfo.releaseNotes && (
                    <Box sx={{ mt: 1, mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Release Notes:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ mt: 1 }}
                        dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
                      />
                    </Box>
                  )}
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    startIcon={
                      isUpdating ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Download />
                      )
                    }
                    sx={{ mt: 1 }}
                  >
                    {isUpdating ? 'Downloading...' : 'Download and Install'}
                  </Button>
                </Alert>
              ) : (
                <Alert severity="success">
                  <Typography variant="body1">
                    You are running the latest version ({currentVersion})
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Information
          </Typography>
          
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="textSecondary">
                Operating System:
              </Typography>
              <Typography variant="body2">
                {systemInfo?.platform || 'Loading...'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="textSecondary">
                Architecture:
              </Typography>
              <Typography variant="body2">
                {systemInfo?.arch || 'Loading...'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="textSecondary">
                Electron Version:
              </Typography>
              <Typography variant="body2">
                {systemInfo?.electronVersion || 'Loading...'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="textSecondary">
                Chrome Version:
              </Typography>
              <Typography variant="body2">
                {systemInfo?.chromeVersion || 'Loading...'}
              </Typography>
            </Box>
            
            {systemInfo?.userAgent && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  User Agent:
                </Typography>
                <Typography variant="caption" sx={{ wordBreak: 'break-all', display: 'block' }}>
                  {systemInfo.userAgent}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export { InstallationSettings };
