import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import { EditOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n';

type DeviceType = 'link' | 'download';

type Device = {
  id: string;
  name: string;
  type: DeviceType;
  url?: string;
};

const STORAGE_KEY = 'deviceList';
const DEFAULT_DOWNLOAD_URL = 'https://sunlogin.oray.com/download?categ=personal/';

const createDefaultDevices = (t: (key: string) => string): Device[] => [
  {
    id: 'site-monitor',
    name: t('sidebar.siteMonitor'),
    type: 'link',
    url: 'https://v.dvr163.com/#/'
  },
  {
    id: 'desktop-monitor',
    name: t('sidebar.desktopMonitor'),
    type: 'download',
    url: DEFAULT_DOWNLOAD_URL
  }
];

const getDisplayName = (device: Device, t: (key: string) => string): string => {
  if (device.id === 'site-monitor') return t('sidebar.siteMonitor');
  if (device.id === 'desktop-monitor') return t('sidebar.desktopMonitor');
  return device.name;
};

function LeftSidebar() {
  const { t } = useI18n();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(DEFAULT_DOWNLOAD_URL);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<DeviceType>('link');
  const [newUrl, setNewUrl] = useState('');
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Device[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDevices(parsed);
          return;
        }
      } catch {
        // ignore parse error
      }
    }

    const defaults = createDefaultDevices(t);
    setDevices(defaults);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  }, [t]);

  const saveDevices = (next: Device[]) => {
    setDevices(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleDeviceClick = (device: Device) => {
    setSelectedDeviceId(device.id);
    if (device.type === 'link') {
      if (device.url) {
        window.open(device.url, '_blank');
      } else {
        alert(t('sidebar.missingLink'));
      }
      return;
    }
    setDownloadUrl(device.url || DEFAULT_DOWNLOAD_URL);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenAddDialog = () => {
    setEditingDeviceId(null);
    setNewName('');
    setNewType('link');
    setNewUrl('');
    setOpenAddDialog(true);
  };

  const handleEditDevice = (device: Device) => {
    setEditingDeviceId(device.id);
    setNewName(getDisplayName(device, t));
    setNewType(device.type);
    setNewUrl(device.url || '');
    setOpenAddDialog(true);
  };

  const handleDeleteDevice = (device: Device) => {
    const ok = window.confirm(t('sidebar.confirmDelete'));
    if (!ok) return;
    const next = devices.filter((item) => item.id !== device.id);
    saveDevices(next);
    if (selectedDeviceId === device.id) {
      setSelectedDeviceId(null);
    }
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setNewName('');
    setNewType('link');
    setNewUrl('');
  };

  const handleAddDevice = () => {
    const name = newName.trim();
    const url = newUrl.trim();
    if (!name) {
      alert(t('sidebar.enterDeviceName'));
      return;
    }
    if (newType === 'link' && !url) {
      alert(t('sidebar.enterDeviceLink'));
      return;
    }

    if (editingDeviceId) {
      const next = devices.map((item) =>
        item.id === editingDeviceId
          ? { ...item, name, type: newType, url: url || undefined }
          : item
      );
      saveDevices(next);
      handleCloseAddDialog();
      return;
    }

    const next: Device = {
      id: String(Date.now()),
      name,
      type: newType,
      url: url || undefined
    };
    saveDevices([...devices, next]);
    handleCloseAddDialog();
  };

  const isEditing = Boolean(editingDeviceId);

  return (
    <div className="left-sidebar">
      <div className="device-list">
        <h3>{t('sidebar.title')}</h3>
        <ul>
          {devices.map((device) => (
            <li
              key={device.id}
              onClick={() => handleDeviceClick(device)}
              className={`device-item ${selectedDeviceId === device.id ? 'selected' : ''}`}
            >
              <span className="device-item__name">{getDisplayName(device, t)}</span>
              <span className="device-item__actions">
                <Tooltip title={t('common.edit')} placement="top">
                  <button
                    type="button"
                    className="device-action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditDevice(device);
                    }}
                    aria-label={t('common.edit')}
                  >
                    <EditOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={t('common.delete')} placement="top">
                  <button
                    type="button"
                    className="device-action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDevice(device);
                    }}
                    aria-label={t('common.delete')}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3.75 7.5h16.5" />
                      <path d="M9.75 11.25v6" />
                      <path d="M14.25 11.25v6" />
                      <path d="M19.5 7.5l-.867 12.142A2.25 2.25 0 0116.39 21H7.61a2.25 2.25 0 01-2.243-2.358L4.5 7.5" />
                      <path d="M9 4.5h6a1.5 1.5 0 011.5 1.5v1.5h-9V6A1.5 1.5 0 019 4.5z" />
                    </svg>
                  </button>
                </Tooltip>
              </span>
            </li>
          ))}
        </ul>
        <button className="add-device-button" onClick={handleOpenAddDialog}>
          {t('sidebar.addDevice')}
        </button>
      </div>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            minWidth: { xs: 300, sm: 420 },
            minHeight: { xs: 250, sm: 310 }
          }
        }}
      >
        <DialogTitle
          sx={{
            px: 3,
            py: 2.5,
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)'
          }}
        >
          {t('sidebar.remoteTitle')}
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Typography sx={{ mb: 1 }}>{t('sidebar.remoteDesc1')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('sidebar.remoteDesc2')}
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
            gap: 1,
            '& .MuiButton-root': { minWidth: 140, borderRadius: 1, height: 40 }
          }}
        >
          <Button onClick={handleCloseDialog} variant="outlined">
            {t('common.close')}
          </Button>
          <Button
            component="a"
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
          >
            {t('common.download')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAddDialog} onClose={handleCloseAddDialog}>
        <DialogTitle>
          {isEditing ? t('sidebar.editDevice') : t('sidebar.addDeviceDialog')}
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <TextField
            autoFocus
            label={t('sidebar.deviceName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
            margin="dense"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="device-type-label">{t('sidebar.type')}</InputLabel>
            <Select
              labelId="device-type-label"
              value={newType}
              label={t('sidebar.type')}
              onChange={(e) => setNewType(e.target.value as DeviceType)}
            >
              <MenuItem value="link">{t('sidebar.linkType')}</MenuItem>
              <MenuItem value="download">{t('sidebar.downloadType')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={t('sidebar.link')}
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            fullWidth
            margin="dense"
            placeholder="https://"
            required={newType === 'link'}
            helperText={
              newType === 'link'
                ? t('sidebar.linkRequired')
                : t('sidebar.linkOptional')
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={handleCloseAddDialog} variant="outlined">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleAddDevice} variant="contained">
            {isEditing ? t('common.save') : t('common.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default LeftSidebar;
