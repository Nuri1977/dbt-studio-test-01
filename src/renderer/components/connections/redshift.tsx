import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  CircularProgress,
  useTheme,
  FormControlLabel,
  Checkbox,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Visibility, VisibilityOff, FolderOpen, InfoOutlined } from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  RedshiftConnection,
  RedshiftDBTConnection,
} from '../../../types/backend';
import connectionIcons from '../../../../assets/connectionIcons';
import {
  useConfigureConnection,
  useTestConnection,
  useGetSelectedProject,
  useFilePicker,
} from '../../controllers';
import ConnectionHeader from './connection-header';

type Props = {
  onCancel: () => void;
};

export const Redshift: React.FC<Props> = ({ onCancel }) => {
  const { data: project } = useGetSelectedProject();
  const navigate = useNavigate();
  const theme = useTheme();

  const { mutate: getFiles } = useFilePicker();

  const existingConnection: RedshiftDBTConnection | undefined =
    React.useMemo(() => {
      if (project) {
        return project.dbtConnection as RedshiftDBTConnection;
      }
      return undefined;
    }, [project]);

  const [formState, setFormState] = React.useState<RedshiftConnection>({
    type: existingConnection?.type ?? 'redshift',
    name: project?.name || 'Redshift Connection',
    host: existingConnection?.host ?? '',
    port: existingConnection?.port ?? 5439,
    database: existingConnection?.database ?? '',
    schema: existingConnection?.schema ?? 'public',
    username: existingConnection?.username ?? '',
    password: existingConnection?.password ?? '',
    ssl: existingConnection?.ssl ?? true,
    sslrootcert: existingConnection?.sslrootcert ?? '',
  });

  const [showPassword, setShowPassword] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<
    'idle' | 'success' | 'failed'
  >('idle');
  const [infoModalOpen, setInfoModalOpen] = React.useState(false);

  const { mutate: configureConnection } = useConfigureConnection({
    onSuccess: () => {
      toast.success('Redshift connection configured successfully!');
      navigate(`/app/project-details`);
    },
    onError: (error) => {
      toast.error(`Configuration failed: ${error}`);
    },
  });

  const { mutate: testConnection } = useTestConnection({
    onMutate: () => {
      setIsTesting(true);
      setConnectionStatus('idle');
    },
    onSettled: () => setIsTesting(false),
    onSuccess: (success) => {
      setIsTesting(false);
      if (success) {
        toast.success('Connection test successful!');
        setConnectionStatus('success');
        return;
      }
      toast.error('Connection test failed');
      setConnectionStatus('failed');
    },
    onError: (error) => {
      setIsTesting(false);
      toast.error(`Test failed: ${error.message}`);
      setConnectionStatus('failed');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'port' ? Number(value) : value,
    }));

    setConnectionStatus('idle');
  };

  const handleCertificateSelect = async () => {
    try {
      getFiles(
        {
          properties: ['openFile'],
        },
        {
          onSuccess: (filePaths) => {
            if (filePaths && filePaths.length > 0) {
              setFormState(prev => ({
                ...prev,
                sslrootcert: filePaths[0]
              }));
            }
          },
          onError: () => {
            toast.error('Failed to select certificate file');
          }
        }
      );
    } catch (error) {
      toast.error('Failed to select certificate file');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) return;
    configureConnection({
      projectId: project.id,
      connection: formState,
    });
  };

  const handleTest = () => {
    setIsTesting(true);
    testConnection(formState);
  };

  const getIndicatorColor = () => {
    switch (connectionStatus) {
      case 'success':
        return theme.palette.success.main;
      case 'failed':
        return theme.palette.error.main;
      default:
        return '#9e9e9e';
    }
  };

  const getButtonStartIcon = () => {
    if (isTesting) {
      return <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />;
    }
    return null;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        p: 3,
      }}
    >
      <ConnectionHeader
        title={project?.name || 'Redshift Connection'}
        imageSource={connectionIcons.images.redshift}
        onClose={onCancel}
        onSave={handleSubmit}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: '500px',
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <TextField
          label="Connection Name"
          name="name"
          value={formState.name}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />

        <TextField
          label="Host"
          name="host"
          value={formState.host}
          onChange={handleChange}
          fullWidth
          required
          placeholder="your-cluster.region.redshift.amazonaws.com"
        />

        <TextField
          label="Port"
          name="port"
          type="number"
          value={formState.port}
          onChange={handleChange}
          fullWidth
          required
        />

        <TextField
          label="Database"
          name="database"
          value={formState.database}
          onChange={handleChange}
          fullWidth
          required
        />

        <TextField
          label="Schema"
          name="schema"
          value={formState.schema}
          onChange={handleChange}
          fullWidth
          required
        />

        <TextField
          label="Username"
          name="username"
          value={formState.username}
          onChange={handleChange}
          fullWidth
          required
        />

        <TextField
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formState.password}
          onChange={handleChange}
          fullWidth
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* SSL Configuration Section */}
        <Box sx={{ mt: 2, mb: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formState.ssl || false}
                onChange={handleChange}
                name="ssl"
              />
            }
            label="Use SSL Mode (Recommended)"
          />
        </Box>

        {formState.ssl && (
          <TextField
            label="SSL Root Certificate Path (Optional)"
            name="sslrootcert"
            value={formState.sslrootcert || ''}
            onChange={handleChange}
            fullWidth
            placeholder="/path/to/redshift-ca-bundle.crt"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleCertificateSelect}
                    edge="end"
                    title="Browse for certificate file"
                    sx={{ mr: 1 }}
                  >
                    <FolderOpen />
                  </IconButton>
                  <IconButton
                    onClick={() => setInfoModalOpen(true)}
                    edge="end"
                    title="SSL certificate information"
                    sx={{ color: theme.palette.info.main }}
                  >
                    <InfoOutlined fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText="Leave empty to use default SSL settings, or provide path to custom certificate"
          />
        )}

        <Box
          sx={{
            mt: 3,
            display: 'flex',
            justifyContent: 'flex-start',
          }}
        >
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={handleTest}
            disabled={isTesting}
            sx={{
              mr: 2,
              position: 'relative',
              paddingRight: '32px',
              minWidth: '150px',
            }}
            startIcon={getButtonStartIcon()}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}

            <Box
              sx={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getIndicatorColor(),
                border: `1px solid ${theme.palette.primary.contrastText}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Button>
        </Box>
      </Box>

      {/* SSL Certificate Information Modal */}
      <Dialog
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxWidth: '600px',
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            How to get Redshift SSL Certificate
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
              1. Download from AWS Documentation:
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, ml: 2 }}>
              Visit the official AWS Redshift SSL documentation:
              <br />
              <strong>https://docs.aws.amazon.com/redshift/latest/mgmt/connecting-ssl-support.html</strong>
            </Typography>

            <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
              2. Direct Download Link:
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, ml: 2 }}>
              You can directly download the certificate bundle:
              <br />
              <strong>https://s3.amazonaws.com/redshift-downloads/redshift-ca-bundle.crt</strong>
            </Typography>

            <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
              3. Regional Certificates:
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, ml: 2 }}>
              • <strong>US East (N. Virginia):</strong> redshift-ca-bundle.crt
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, ml: 2 }}>
              • <strong>Other AWS regions:</strong> Check the AWS documentation for region-specific certificates
            </Typography>

            <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
              4. Installation Steps:
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, ml: 2 }}>
              • Download the certificate file to your local machine
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, ml: 2 }}>
              • Save it in a secure location (e.g., ~/.ssl/redshift-ca-bundle.crt)
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, ml: 2 }}>
              • Use the "Browse" button to select the downloaded certificate file
            </Typography>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.main', color: 'info.contrastText', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Note:</strong> SSL certificates are required for secure connections to Redshift clusters.
                The certificate ensures that your connection is encrypted and authenticated.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoModalOpen(false)} variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
