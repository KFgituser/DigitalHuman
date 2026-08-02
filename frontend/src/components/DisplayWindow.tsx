import React from 'react';
import ChatLogs from './ChatLogs';
import AnalysisResults from './AnalysisResults';
import DigitalHumanDetails from './DigitalHumanDetails';
import type { TailscaleStatus } from './ChatLogs';

type DisplayWindowProps = {
  selectedView: string;
  onBackToChatLogs?: () => void;
  mainContentRef?: React.RefObject<HTMLElement | null>;
  tailscaleStatus?: TailscaleStatus | null;
  tailscaleLoading?: boolean;
};

function DisplayWindow({
  selectedView,
  onBackToChatLogs,
  mainContentRef,
  tailscaleStatus,
  tailscaleLoading
}: DisplayWindowProps) {
  return (
    <div className="display-window">
      {selectedView === 'chatLogs' && (
        <ChatLogs externalStatus={tailscaleStatus} externalLoading={tailscaleLoading} />
      )}
      {selectedView === 'analysis' && <AnalysisResults />}
      {selectedView === 'details' && (
        <DigitalHumanDetails onBack={onBackToChatLogs} mainContentRef={mainContentRef} />
      )}
    </div>
  );
}

export default DisplayWindow;
