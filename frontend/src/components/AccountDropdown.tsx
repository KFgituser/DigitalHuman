import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AccountDropdown.css';
import { useI18n } from '../i18n';

type AccountDropdownProps = {
  username: string;
  handleLogout: () => void;
};

function AccountDropdown({ username, handleLogout }: AccountDropdownProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleAccountManagement = () => {
    alert(t('account.accountManagementTodo'));
  };

  const handleSettings = () => {
    alert(t('account.settingsTodo'));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (
        dropdownRef.current &&
        target instanceof Node &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="account-dropdown" ref={dropdownRef}>
      <button className="account-btn" onClick={toggleDropdown}>
        {username} <span>▼</span>
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <button onClick={handleAccountManagement}>
            {t('account.accountManagement')}
          </button>
          <button onClick={handleSettings}>{t('account.settings')}</button>
          <button
            onClick={() => {
              handleLogout();
              navigate('/login', { replace: true });
            }}
          >
            {t('account.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountDropdown;
