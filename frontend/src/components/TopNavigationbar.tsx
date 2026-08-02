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

  const handleChatLogsClick = () => {
    const qaUrl = `${process.env.PUBLIC_URL}/ragflow_qa_tangshan.html`;
    const newWindow = window.open(qaUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null;
    }
  };

  const handleBeijingChatLogsClick = () => {
    const qaUrl = `${process.env.PUBLIC_URL}/qa北京校区.html`;
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
        <button onClick={handleChatLogsClick}>{t('topNav.tangshanLogs')}</button>
        <button onClick={handleBeijingChatLogsClick}>{t('topNav.beijingLogs')}</button>
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
