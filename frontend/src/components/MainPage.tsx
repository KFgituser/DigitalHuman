import React, { useEffect, useRef, useState } from 'react';
import TopNavigationbar from './TopNavigationbar';
import LeftSidebar from './LeftSidebar';
import DisplayWindow from './DisplayWindow';
import FloatingChatbot from './FloatingChatbot';
import api from '../services/api';
import type { TailscaleStatus } from './ChatLogs';
import { useI18n } from '../i18n';

type MainPageProps = {
  username: string;
  handleLogout: () => void;
};

const STATUS_POLL_INTERVAL_MS = 3000;

function MainPage({ username, handleLogout }: MainPageProps) {
  const { t } = useI18n();
  const [selectedView, setSelectedView] = useState<string>('chatLogs');
  const [tailscaleStatus, setTailscaleStatus] = useState<TailscaleStatus | null>(null);
  const [tailscaleLoading, setTailscaleLoading] = useState(true);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const res = await api.get('/api/tailscale/status');
        if (!mounted) return;
        setTailscaleStatus(res.data as TailscaleStatus);
      } catch {
        if (!mounted) return;
        setTailscaleStatus(null);
      } finally {
        if (mounted) setTailscaleLoading(false);
      }
    };

    void fetchStatus();
    const timer = window.setInterval(fetchStatus, STATUS_POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const campusLabel = (() => {
    if (tailscaleLoading) return t('campus.detecting');
    const tangshanConnected = !!tailscaleStatus?.tangshan?.connected;
    const beijingConnected = !!tailscaleStatus?.beijing?.connected;
    if (beijingConnected && tangshanConnected) return t('campus.both');
    if (beijingConnected) return t('campus.beijing');
    if (tangshanConnected) return t('campus.tangshan');
    return t('campus.disconnected');
  })();

  const handleClick = (view: string) => {
    setSelectedView(view);
  };

  return (
    <div className="app-container">
      <TopNavigationbar
        handleClick={handleClick}
        username={username}
        handleLogout={handleLogout}
      />
      <div className="content-container">
        <LeftSidebar />
        <div className="main-content" ref={mainContentRef}>
          <DisplayWindow
            selectedView={selectedView}
            onBackToChatLogs={() => setSelectedView('chatLogs')}
            mainContentRef={mainContentRef}
            tailscaleStatus={tailscaleStatus}
            tailscaleLoading={tailscaleLoading}
          />
        </div>
      </div>
      <FloatingChatbot campusLabel={campusLabel} tailscaleStatus={tailscaleStatus} />
    </div>
  );
}

export default MainPage;
