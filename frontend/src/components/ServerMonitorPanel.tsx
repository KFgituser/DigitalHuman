import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../i18n';
import type { Language } from '../i18n';

type MonitorSession = {
  sessionId: string;
  connectionName: string;
  host: string;
  port: number;
  username: string;
  connectedAt: string;
};

type ProcessInfo = {
  pid: number;
  parentPid: number;
  cpuPercent: number;
  memoryPercent: number;
  elapsedTime: string;
  state: string;
  command: string;
};

type DiskUsage = {
  filesystem: string;
  mountPoint: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercent: number;
};

type GpuMetrics = {
  index: number;
  name: string;
  temperatureCelsius: number | null;
  fanSpeedPercent: number | null;
  utilizationPercent: number | null;
  memoryUsedMiB: number | null;
  memoryTotalMiB: number | null;
  powerDrawWatts: number | null;
  powerLimitWatts: number | null;
};

type TemperaturePoint = {
  label: string;
  temperatureCelsius: number | null;
};

type PowerStatus = {
  name: string | null;
  type: string | null;
  status: string | null;
  online: boolean | null;
  reading: string | null;
  unit: string | null;
  detail: string | null;
};

type SystemMetrics = {
  timestamp: string;
  sessionId: string;
  connectionName: string;
  targetHost: string;
  hostname: string;
  cpu: {
    logicalCores: number;
    usagePercent: number;
    temperatureLabel: string | null;
    temperatureCelsius: number | null;
  };
  cpuHardware: {
    modelName: string | null;
    sockets: number | null;
    physicalCores: number | null;
    logicalThreads: number | null;
    currentFrequencyMHz: number | null;
    maxFrequencyMHz: number | null;
    coreTemperatures: TemperaturePoint[];
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    availableBytes: number;
    usagePercent: number;
  };
  load: {
    oneMinute: number;
    fiveMinutes: number;
    fifteenMinutes: number;
  };
  uptime: {
    seconds: number;
  };
  processCount: number;
  powerSupplies: PowerStatus[];
  gpus: GpuMetrics[];
  disks: DiskUsage[];
  topProcesses: ProcessInfo[];
};

type ConnectionForm = {
  connectionName: string;
  host: string;
  port: string;
  username: string;
  password: string;
};

type ServerSlot = {
  slotId: string;
  title: string;
  form: ConnectionForm;
  session: MonitorSession | null;
  metrics: SystemMetrics | null;
  connecting: boolean;
  loading: boolean;
  error: string;
};

type Translate = (key: string, params?: Record<string, string | number>) => string;

const POLL_INTERVAL_MS = 10000;
const PROCESS_LIMIT = 6;

function createInitialSlots(t: Translate): ServerSlot[] {
  return [
    {
      slotId: 'server-1',
      title: t('monitor.server1'),
      form: {
        connectionName: t('monitor.server1'),
        host: '',
        port: '22',
        username: '',
        password: ''
      },
      session: null,
      metrics: null,
      connecting: false,
      loading: false,
      error: ''
    },
    {
      slotId: 'server-2',
      title: t('monitor.server2'),
      form: {
        connectionName: t('monitor.server2'),
        host: '',
        port: '22',
        username: '',
        password: ''
      },
      session: null,
      metrics: null,
      connecting: false,
      loading: false,
      error: ''
    }
  ];
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDuration(totalSeconds: number, t: Translate) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return t('monitor.daysHours', { days, hours });
  }
  if (hours > 0) {
    return t('monitor.hoursMinutes', { hours, minutes });
  }
  return t('monitor.minutes', { minutes });
}

function formatTimestamp(timestamp: string | undefined, language: Language) {
  if (!timestamp) {
    return '--';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString(language, { hour12: false });
}

function formatMetricValue(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }
  return `${value}${suffix}`;
}

function formatGpuMemoryUsage(usedMiB: number | null | undefined, totalMiB: number | null | undefined) {
  if (usedMiB === null || usedMiB === undefined || totalMiB === null || totalMiB === undefined) {
    return '--';
  }
  return `${usedMiB} / ${totalMiB} MiB`;
}

function formatFrequencyMHz(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} GHz`;
  }
  return `${value.toFixed(0)} MHz`;
}

function formatOnlineState(
  online: boolean | null | undefined,
  status: string | null | undefined,
  t: Translate
) {
  if (status) {
    return status;
  }
  if (online === true) {
    return t('monitor.online');
  }
  if (online === false) {
    return t('monitor.offline');
  }
  return '--';
}

function formatPowerReading(reading: string | null | undefined, unit: string | null | undefined) {
  if (!reading) {
    return '--';
  }
  return unit ? `${reading} ${unit}` : reading;
}

function formatCpuSummary(cpu: SystemMetrics['cpu'], t: Translate) {
  const coreText = t('monitor.cpuCores', { count: cpu.logicalCores });
  if (cpu.temperatureCelsius === null || cpu.temperatureCelsius === undefined) {
    return coreText;
  }
  return `${coreText} \u00B7 ${cpu.temperatureCelsius.toFixed(1)}\u00B0C`;
}

function hasCpuHardwareInfo(metrics: SystemMetrics) {
  return Boolean(metrics.cpuHardware.modelName)
    || metrics.cpu.temperatureCelsius !== null
    || metrics.cpuHardware.physicalCores !== null
    || metrics.cpuHardware.logicalThreads !== null
    || metrics.cpuHardware.currentFrequencyMHz !== null
    || metrics.cpuHardware.maxFrequencyMHz !== null;
}

function getDiskTooltip(mountPoint: string, t: Translate) {
  if (mountPoint === '/') {
    return t('monitor.rootDiskTooltip');
  }
  if (mountPoint === '/sys/firmware/efi/efivars') {
    return t('monitor.efiVarsTooltip');
  }
  if (mountPoint === '/boot/efi') {
    return t('monitor.bootEfiTooltip');
  }

  return '';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = error as { response?: { data?: { message?: string } } };
    const responseMessage = maybeResponse.response?.data?.message;
    if (responseMessage) {
      return responseMessage;
    }
  }

  return fallback;
}

function ServerMonitorPanel() {
  const { t, language } = useI18n();
  const [slots, setSlots] = useState<ServerSlot[]>(() => createInitialSlots(t));
  const slotsRef = useRef(slots);
  const inFlightRequestsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    setSlots((current) =>
      current.map((slot, index) => {
        const translatedTitle = index === 0 ? t('monitor.server1') : t('monitor.server2');
        const defaultZh = index === 0 ? '服务器 1' : '服务器 2';
        const defaultEn = index === 0 ? 'Server 1' : 'Server 2';
        const syncTitle = slot.title === defaultZh || slot.title === defaultEn;
        const syncConnectionName =
          slot.form.connectionName === defaultZh || slot.form.connectionName === defaultEn;

        return {
          ...slot,
          title: syncTitle ? translatedTitle : slot.title,
          form: {
            ...slot.form,
            connectionName: syncConnectionName
              ? translatedTitle
              : slot.form.connectionName
          }
        };
      })
    );
  }, [t]);

  const sessionSignature = useMemo(
    () => slots.map((slot) => slot.session?.sessionId ?? 'none').join('|'),
    [slots]
  );

  const updateSlot = useCallback((slotId: string, updater: (slot: ServerSlot) => ServerSlot) => {
    setSlots((current) =>
      current.map((slot) => (slot.slotId === slotId ? updater(slot) : slot))
    );
  }, []);

  const handleFieldChange = (slotId: string, field: keyof ConnectionForm, value: string) => {
    updateSlot(slotId, (slot) => ({
      ...slot,
      form: {
        ...slot.form,
        [field]: value
      }
    }));
  };

  const fetchMetricsForSession = useCallback(async (slotId: string, sessionId: string) => {
    if (inFlightRequestsRef.current[slotId]) {
      return;
    }

    inFlightRequestsRef.current[slotId] = true;

    try {
      const res = await api.get('/api/system-monitor/overview', {
        params: {
          sessionId,
          processLimit: PROCESS_LIMIT
        }
      });

      const metrics = res.data as SystemMetrics;
      updateSlot(slotId, (slot) => ({
        ...slot,
        metrics,
        loading: false,
        error: ''
      }));
    } catch (error) {
      updateSlot(slotId, (slot) => ({
        ...slot,
        loading: false,
        error: getErrorMessage(error, t('monitor.readError'))
      }));
    } finally {
      inFlightRequestsRef.current[slotId] = false;
    }
  }, [t, updateSlot]);

  const handleConnect = async (slotId: string) => {
    const slot = slotsRef.current.find((item) => item.slotId === slotId);
    if (!slot) {
      return;
    }

    updateSlot(slotId, (current) => ({
      ...current,
      connecting: true,
      loading: true,
      error: ''
    }));

    try {
      const res = await api.post('/api/system-monitor/sessions', {
        connectionName: slot.form.connectionName.trim() || slot.title,
        host: slot.form.host.trim(),
        port: Number(slot.form.port) || 22,
        username: slot.form.username.trim(),
        password: slot.form.password
      });

      const session = res.data as MonitorSession;
      updateSlot(slotId, (current) => ({
        ...current,
        session,
        connecting: false,
        loading: true,
        error: '',
        form: {
          ...current.form,
          connectionName: session.connectionName,
          host: session.host,
          port: String(session.port),
          username: session.username,
          password: ''
        }
      }));

      await fetchMetricsForSession(slotId, session.sessionId);
    } catch (error) {
      updateSlot(slotId, (current) => ({
        ...current,
        connecting: false,
        loading: false,
        error: getErrorMessage(error, t('monitor.connectError'))
      }));
    }
  };

  const handleDisconnect = async (slotId: string) => {
    const slot = slotsRef.current.find((item) => item.slotId === slotId);
    if (!slot?.session) {
      return;
    }

    try {
      await api.delete(`/api/system-monitor/sessions/${slot.session.sessionId}`);
    } catch {
      // Ignore disconnect errors and clear UI state anyway.
    }

    updateSlot(slotId, (current) => ({
      ...current,
      session: null,
      metrics: null,
      connecting: false,
      loading: false,
      error: '',
      form: {
        ...current.form,
        password: ''
      }
    }));
  };

  useEffect(() => {
    const hasConnectedSessions = slotsRef.current.some((slot) => slot.session);
    if (!hasConnectedSessions) {
      return;
    }

    let active = true;

    const pollMetrics = async () => {
      const currentSlots = slotsRef.current.filter((slot) => slot.session);
      await Promise.all(
        currentSlots.map(async (slot) => {
          if (!active || !slot.session) {
            return;
          }
          await fetchMetricsForSession(slot.slotId, slot.session.sessionId);
        })
      );
    };

    const timer = window.setInterval(() => {
      void pollMetrics();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [fetchMetricsForSession, sessionSignature]);

  const connectedSlots = slots.filter((slot) => slot.session);

  return (
    <section className="monitor-panel">
      <div className="monitor-panel__header">
        <div>
          <span className="monitor-panel__eyebrow">Dynamic SSH Monitor</span>
          <h3>{t('monitor.title')}</h3>
          <p>{t('monitor.intro')}</p>
        </div>
      </div>

      <div className="monitor-connection-grid">
        {slots.map((slot) => (
          <section className="monitor-card monitor-connection-card" key={slot.slotId}>
            <div className="monitor-card__header">
              <div>
                <h4>{slot.title}</h4>
                <p>
                  {slot.session
                    ? `${slot.session.connectionName} · ${t('monitor.connectedSuffix')}`
                    : t('monitor.waitingInput')}
                </p>
              </div>
              <span className={`monitor-connection-status ${slot.session ? 'connected' : 'idle'}`}>
                {slot.connecting
                  ? t('monitor.connecting')
                  : slot.session
                    ? t('monitor.online')
                    : t('monitor.pending')}
              </span>
            </div>

            <div className="monitor-connection-form">
              <label className="monitor-field">
                <span>{t('monitor.displayName')}</span>
                <input
                  value={slot.form.connectionName}
                  onChange={(event) => handleFieldChange(slot.slotId, 'connectionName', event.target.value)}
                  placeholder={t('monitor.displayNamePlaceholder')}
                />
              </label>

              <label className="monitor-field">
                <span>{t('monitor.host')}</span>
                <input
                  value={slot.form.host}
                  onChange={(event) => handleFieldChange(slot.slotId, 'host', event.target.value)}
                  placeholder={t('monitor.hostPlaceholder')}
                />
              </label>

              <label className="monitor-field">
                <span>{t('monitor.port')}</span>
                <input
                  value={slot.form.port}
                  onChange={(event) => handleFieldChange(slot.slotId, 'port', event.target.value)}
                  placeholder="22"
                />
              </label>

              <label className="monitor-field">
                <span>{t('monitor.username')}</span>
                <input
                  value={slot.form.username}
                  onChange={(event) => handleFieldChange(slot.slotId, 'username', event.target.value)}
                />
              </label>

              <label className="monitor-field monitor-field--full">
                <span>{t('monitor.password')}</span>
                <input
                  type="password"
                  value={slot.form.password}
                  onChange={(event) => handleFieldChange(slot.slotId, 'password', event.target.value)}

                />
              </label>
            </div>

            {slot.error ? <div className="monitor-connection-error">{slot.error}</div> : null}

            <div className="monitor-connection-actions">
              <button
                type="button"
                className="monitor-action-button"
                onClick={() => void handleConnect(slot.slotId)}
                disabled={slot.connecting}
              >
                {slot.session ? t('monitor.reconnect') : t('monitor.connectAndVerify')}
              </button>
              <button
                type="button"
                className="monitor-action-button secondary"
                onClick={() => void handleDisconnect(slot.slotId)}
                disabled={!slot.session && !slot.connecting}
              >
                {t('monitor.disconnect')}
              </button>
            </div>
          </section>
        ))}
      </div>

      {connectedSlots.length === 0 ? (
        <div className="monitor-panel__empty">{t('monitor.emptyAfterConnect')}</div>
      ) : (
        <div className="monitor-runtime-grid">
          {slots.map((slot) => (
            <section className="monitor-card monitor-runtime-card" key={`${slot.slotId}-runtime`}>
              <div className="monitor-card__header">
                <div>
                  <h4>{slot.session?.connectionName || slot.title}</h4>
                  <p>
                    {slot.metrics
                      ? `${slot.metrics.hostname || slot.metrics.targetHost} \u00B7 ${slot.metrics.targetHost}`
                      : t('monitor.noMetricsYet')}
                  </p>
                </div>
                <span className="monitor-runtime-updated">
                  {slot.metrics
                    ? t('monitor.updatedAt', {
                        time: formatTimestamp(slot.metrics.timestamp, language)
                      })
                    : '--'}
                </span>
              </div>

              {!slot.session ? (
                <div className="monitor-empty-hint">{t('monitor.noServerConnected')}</div>
              ) : slot.loading && !slot.metrics ? (
                <div className="monitor-empty-hint">{t('monitor.loadingMetrics')}</div>
              ) : slot.metrics ? (
                <>
                  <div className="monitor-inline-metrics">
                    <div className="monitor-inline-metric">
                      <span>{t('monitor.cpuUsage')}</span>
                      <strong>{slot.metrics.cpu.usagePercent.toFixed(1)}%</strong>
                      <small>{formatCpuSummary(slot.metrics.cpu, t)}</small>
                    </div>
                    <div className="monitor-inline-metric">
                      <span>{t('monitor.memoryUsage')}</span>
                      <strong>{slot.metrics.memory.usagePercent.toFixed(1)}%</strong>
                      <small>
                        {formatBytes(slot.metrics.memory.usedBytes)} / {formatBytes(slot.metrics.memory.totalBytes)}
                      </small>
                    </div>
                    <div className="monitor-inline-metric">
                      <span>{t('monitor.uptime')}</span>
                      <strong>{formatDuration(slot.metrics.uptime.seconds, t)}</strong>
                      <small>{t('monitor.processes', { count: slot.metrics.processCount })}</small>
                    </div>
                    <div className="monitor-inline-metric">
                      <span>{t('monitor.loadAverage')}</span>
                      <strong>{slot.metrics.load.oneMinute.toFixed(2)}</strong>
                      <small>
                        5m {slot.metrics.load.fiveMinutes.toFixed(2)} / 15m {slot.metrics.load.fifteenMinutes.toFixed(2)}
                      </small>
                    </div>
                  </div>

                  <>
                    {hasCpuHardwareInfo(slot.metrics) ? (
                      <section className="monitor-cpu-hardware">
                        <div className="monitor-cpu-hardware__summary">
                          <div className="monitor-cpu-hardware__summary-head">
                            <strong>{t('monitor.cpuHardwareInfo')}</strong>
                            <span>{slot.metrics.cpuHardware.modelName || t('monitor.cpuModelLoading')}</span>
                          </div>
                          <div className="monitor-cpu-hardware__summary-grid">
                            <div>
                              <span>{t('monitor.packageTemperature')}</span>
                              <b>{formatMetricValue(slot.metrics.cpu.temperatureCelsius, '\u00B0C')}</b>
                              <small>{slot.metrics.cpu.temperatureLabel || 'Package'}</small>
                            </div>
                            <div>
                              <span>{t('monitor.physicalCoresThreads')}</span>
                              <b>
                                {slot.metrics.cpuHardware.physicalCores ?? '--'} / {slot.metrics.cpuHardware.logicalThreads ?? '--'}
                              </b>
                              <small>{t('monitor.cpuSockets', { count: slot.metrics.cpuHardware.sockets ?? '--' })}</small>
                            </div>
                            <div>
                              <span>{t('monitor.currentFrequency')}</span>
                              <b>{formatFrequencyMHz(slot.metrics.cpuHardware.currentFrequencyMHz)}</b>
                              <small>{t('monitor.maxFrequency', { value: formatFrequencyMHz(slot.metrics.cpuHardware.maxFrequencyMHz) })}</small>
                            </div>
                          </div>
                        </div>
                      </section>
                    ) : null}

                    {slot.metrics.gpus.length > 0 ? (
                      <div className="monitor-gpu-grid">
                        {slot.metrics.gpus.map((gpu) => (
                          <div className="monitor-gpu-card" key={`${slot.slotId}-gpu-${gpu.index}`}>
                            <div className="monitor-gpu-card__header">
                              <strong>GPU {gpu.index}</strong>
                              <span>{gpu.name}</span>
                            </div>
                            <div className="monitor-gpu-card__metrics">
                              <div>
                                <span>{t('monitor.temperature')}</span>
                                <b>{formatMetricValue(gpu.temperatureCelsius, '\u00B0C')}</b>
                              </div>
                              <div>
                                <span>{t('monitor.fan')}</span>
                                <b>{formatMetricValue(gpu.fanSpeedPercent, '%')}</b>
                              </div>
                              <div>
                                <span>{t('monitor.utilization')}</span>
                                <b>{formatMetricValue(gpu.utilizationPercent, '%')}</b>
                              </div>
                              <div>
                                <span>{t('monitor.gpuMemory')}</span>
                                <b>{formatGpuMemoryUsage(gpu.memoryUsedMiB, gpu.memoryTotalMiB)}</b>
                              </div>
                              <div>
                                <span>{t('monitor.power')}</span>
                                <b>
                                  {gpu.powerDrawWatts !== null && gpu.powerDrawWatts !== undefined
                                    ? `${gpu.powerDrawWatts}W / ${formatMetricValue(gpu.powerLimitWatts, 'W')}`
                                    : '--'}
                                </b>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {slot.metrics.powerSupplies.some((power) => power.name === 'System Power') ? (
                      <div className="monitor-extra-section">
                        <div className="monitor-extra-section__title">{t('monitor.powerStatusTitle')}</div>
                        {slot.metrics.powerSupplies
                          .filter((power) => power.name === 'System Power')
                          .map((power) => (
                            <section className="monitor-power-summary" key={`${slot.slotId}-power-summary`}>
                              <div className="monitor-power-summary__head">
                                <strong>{power.name || 'System Power'}</strong>
                                <span>{power.type || t('monitor.powerSummaryType')}</span>
                              </div>
                              <div className="monitor-power-summary__grid">
                                <div>
                                  <span>{t('monitor.status')}</span>
                                  <b>{formatOnlineState(power.online, power.status, t)}</b>
                                  <small>{t('monitor.systemPowerStatus')}</small>
                                </div>
                                {power.reading ? (
                                  <div>
                                    <span>{t('monitor.reading')}</span>
                                    <b>{formatPowerReading(power.reading, power.unit)}</b>
                                    <small>{t('monitor.currentPowerReading')}</small>
                                  </div>
                                ) : null}
                                {power.detail ? (
                                  <div className="monitor-power-summary__detail">
                                    <span>{t('monitor.detail')}</span>
                                    <b>{power.detail}</b>
                                    <small>{t('monitor.powerDetailHint')}</small>
                                  </div>
                                ) : null}
                              </div>
                            </section>
                          ))}
                      </div>
                    ) : null}

                    {slot.metrics.powerSupplies.some((power) => power.name !== 'System Power' && (power.status || power.reading || power.detail)) ? (
                      <div className="monitor-extra-section">
                        <div className="monitor-extra-section__title">{t('monitor.psuStatusTitle')}</div>
                        <div className="monitor-extra-grid">
                          {slot.metrics.powerSupplies
                            .filter((power) => power.name !== 'System Power' && (power.status || power.reading || power.detail))
                            .map((power, index) => (
                            <div className="monitor-extra-card" key={`${slot.slotId}-power-${power.name ?? index}`}>
                              <div className="monitor-extra-card__header">
                                <strong>{power.name || `PSU ${index + 1}`}</strong>
                                <span>{power.type || t('monitor.powerSupplyType')}</span>
                              </div>
                              <div className="monitor-extra-card__metrics">
                                {power.status ? (
                                  <div>
                                    <span>{t('monitor.status')}</span>
                                    <b>{formatOnlineState(power.online, power.status, t)}</b>
                                  </div>
                                ) : null}
                                {power.reading ? (
                                  <div>
                                    <span>{t('monitor.reading')}</span>
                                    <b>{formatPowerReading(power.reading, power.unit)}</b>
                                  </div>
                                ) : null}
                                {power.detail ? (
                                  <div className="monitor-extra-card__metrics--full">
                                    <span>{t('monitor.detail')}</span>
                                    <b>{power.detail}</b>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="monitor-disk-list">
                      {slot.metrics.disks.map((disk) => (
                        <div className="monitor-disk-item" key={`${slot.slotId}-${disk.filesystem}-${disk.mountPoint}`}>
                          <div className="monitor-disk-item__top">
                            <div>
                              <div className="monitor-disk-item__title">
                                <strong>{disk.mountPoint}</strong>
                                {getDiskTooltip(disk.mountPoint, t) ? (
                                  <span
                                    className="monitor-tooltip"
                                    title={getDiskTooltip(disk.mountPoint, t)}
                                    aria-label={getDiskTooltip(disk.mountPoint, t)}
                                  >
                                    ?
                                  </span>
                                ) : null}
                              </div>
                              <span>{disk.filesystem}</span>
                            </div>
                            <b>{disk.usagePercent.toFixed(1)}%</b>
                          </div>
                          <div className="monitor-progress monitor-progress--disk">
                            <span style={{ width: `${Math.min(disk.usagePercent, 100)}%` }} />
                          </div>
                          <div className="monitor-disk-item__meta">
                            <span>{t('monitor.used', { value: formatBytes(disk.usedBytes) })}</span>
                            <span>{t('monitor.available', { value: formatBytes(disk.availableBytes) })}</span>
                            <span>{t('monitor.total', { value: formatBytes(disk.totalBytes) })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>

                  <div className="monitor-table-wrapper">
                    <div className="monitor-table-caption">
                      {t('monitor.processCaption')}
                    </div>
                    <table className="monitor-process-table">
                      <thead>
                        <tr>
                          <th>PID</th>
                          <th>{t('monitor.processName')}</th>
                          <th>{t('monitor.cpuPercent')}</th>
                          <th>{t('monitor.memoryPercent')}</th>
                          <th>{t('monitor.elapsedTime')}</th>
                          <th>{t('monitor.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slot.metrics.topProcesses.map((process) => (
                          <tr key={`${slot.slotId}-${process.pid}-${process.command}`}>
                            <td>{process.pid}</td>
                            <td title={process.command}>{process.command}</td>
                            <td>{process.cpuPercent.toFixed(1)}%</td>
                            <td>{process.memoryPercent.toFixed(1)}%</td>
                            <td>{process.elapsedTime}</td>
                            <td>{process.state}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="monitor-empty-hint">{t('monitor.emptyAfterConnect')}</div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

export default ServerMonitorPanel;



