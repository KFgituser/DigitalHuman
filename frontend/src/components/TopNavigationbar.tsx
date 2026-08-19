import AccountDropdown from './AccountDropdown';
import '../styles/logo.css';
import { useI18n } from '../i18n';

type TopNavigationbarProps = {
  handleClick: (view: string) => void;
  username?: string;
  handleLogout: () => void;
};

function TopNavigationbar({
  handleClick,
  username,
  handleLogout
}: TopNavigationbarProps) {
  const { t, toggleLanguage } = useI18n();
  const displayName =
    username || localStorage.getItem('username') || t('common.usernameFallback');

  const handleBeijingChatLogsClick = () => {
    const qaUrl = `${window.location.origin}/qa-dashboard?source=beijing`;
    const newWindow = window.open(qaUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null;
    }
  };

  const handleRagflowRecordsClick = () => {
    const qaUrl = `${window.location.origin}/qa-dashboard?source=ragflowTangshan`;
    const newWindow = window.open(qaUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null;
    }
  };

  return (
    <div className="top-header">
      <div className="logo-container">
        <img src="/交小才logo.png" alt={t('topNav.logoAlt')} className="logo" />
      </div>
      <div className="nav-buttons">
        <button onClick={handleBeijingChatLogsClick}>{t('topNav.beijingLogs')}</button>
        <button onClick={handleRagflowRecordsClick}>{t('topNav.ragflowRecords')}</button>
        <button onClick={() => handleClick('details')}>{t('topNav.details')}</button>
      </div>
      <div className="top-header-actions">
        <button
          type="button"
          className="language-switch-btn"
          onClick={toggleLanguage}
          aria-label={t('common.switchLanguageLabel')}
        >
          {t('common.switchLanguage')}
        </button>
        <div className="account-dropdown">
          <AccountDropdown username={displayName} handleLogout={handleLogout} />
        </div>
      </div>
    </div>
  );
}

export default TopNavigationbar;
