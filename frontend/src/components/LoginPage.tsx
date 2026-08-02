import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import '../styles/LoginPage.css';
import { useI18n } from '../i18n';

type LoginPageProps = {
  setIsLoggedIn: (value: boolean) => void;
  setCurrentUser: (value: string) => void;
};

export default function LoginPage({ setIsLoggedIn, setCurrentUser }: LoginPageProps) {
  const { t, toggleLanguage } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const loginBackgroundStyle = {
    backgroundImage: `url(${process.env.PUBLIC_URL}/派管家.PNG)`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover'
  } as const;

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error('Login failed');
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', data.username);
      setCurrentUser(data.username);
      setIsLoggedIn(true);
      navigate('/main', { replace: true });
    } catch {
      alert(t('login.invalidCredentials'));
    }
  };

  return (
    <div className="login-container" style={loginBackgroundStyle}>
      <form onSubmit={handleLogin} className="login-form">
        <div className="login-form-header">
          <h2>{t('login.title')}</h2>
          <button
            type="button"
            className="language-switch-btn login-language-switch-btn"
            onClick={toggleLanguage}
            aria-label={t('common.switchLanguageLabel')}
          >
            {t('common.switchLanguage')}
          </button>
        </div>
        <div className="input-group">
          <label htmlFor="username">{t('login.username')}</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">{t('login.password')}</label>
          <div className="password-input-container">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="eye-icon"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            >
              {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            </span>
          </div>
        </div>
        <button type="submit">{t('login.submit')}</button>
      </form>
    </div>
  );
}
