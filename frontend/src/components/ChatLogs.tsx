import { useEffect, useState } from 'react';
import api from '../services/api';
import ServerMonitorPanel from './ServerMonitorPanel';
import { useI18n } from '../i18n';

export type TargetStatus = {
  name: string;
  url: string;
  ip: string;
  connected: boolean;
  httpOk: boolean;
  pingOk: boolean;
  pingMs?: number;
};

export type TailscaleStatus = {
  tangshan?: TargetStatus;
  beijing?: TargetStatus;
  error?: string;
};

type ChatLogsProps = {
  externalStatus?: TailscaleStatus | null;
  externalLoading?: boolean;
};

const STATUS_POLL_INTERVAL_MS = 3000;

function ChatLogs({ externalStatus, externalLoading }: ChatLogsProps) {
  const { t } = useI18n();
  const useExternal = externalStatus !== undefined || externalLoading !== undefined;
  const [status, setStatus] = useState<TailscaleStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (useExternal) {
      return;
    }

    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const res = await api.get('/api/tailscale/status');
        if (!isMounted) {
          return;
        }
        setStatus(res.data as TailscaleStatus);
      } catch {
        if (!isMounted) {
          return;
        }
        setStatus({ error: t('chatLogs.fetchFailed') });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchStatus();
    const timer = window.setInterval(fetchStatus, STATUS_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [t, useExternal]);

  const currentStatus = useExternal ? externalStatus ?? null : status;
  const currentLoading = useExternal ? Boolean(externalLoading) : isLoading;

  const renderStatusRow = (label: string, target?: TargetStatus) => {
    const connected = !!target?.connected;
    const statusLabel = currentLoading
      ? t('common.loadingDetecting')
      : connected
        ? t('common.connected')
        : t('common.disconnected');

    return (
      <div className="tailscale-status" key={label}>
        <span
          className={`status-dot ${
            currentLoading ? 'loading' : connected ? 'connected' : 'disconnected'
          }`}
        />
        <span className="status-text">
          {t('chatLogs.statusLine', { label, status: statusLabel })}
        </span>
        {connected && target?.pingMs != null ? (
          <span className="status-detail">Ping: {target.pingMs}ms</span>
        ) : null}
        {connected && target?.url ? (
          <span className="status-detail">({target.url})</span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="chatlogs-panel">
      <h3>{t('chatLogs.title')}</h3>
      <p>{t('chatLogs.intro')}</p>
      {renderStatusRow(t('chatLogs.tangshan'), currentStatus?.tangshan)}
      {renderStatusRow(t('chatLogs.beijing'), currentStatus?.beijing)}
      <ServerMonitorPanel />
    </div>
  );
}

export default ChatLogs;
