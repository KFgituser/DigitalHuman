import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import MainPage from './components/MainPage';
import ChatLogs from './components/ChatLogs';
import AnalysisResults from './components/AnalysisResults';
import QARecordsDashboard from './components/QARecordsDashboard';
import './styles/App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('username') || '');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setCurrentUser('');
  };

  useEffect(() => {
    localStorage.setItem('isLoggedIn', String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('username', currentUser);
  }, [currentUser]);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route
            path="/login"
            element={<LoginPage setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} />}
          />
          <Route
            path="/main"
            element={
              isLoggedIn ? (
                <MainPage username={currentUser} handleLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/chat-logs"
            element={isLoggedIn ? <ChatLogs /> : <Navigate to="/login" />}
          />
          <Route
            path="/analysis"
            element={isLoggedIn ? <AnalysisResults /> : <Navigate to="/login" />}
          />
          <Route
            path="/qa-dashboard"
            element={isLoggedIn ? <QARecordsDashboard /> : <Navigate to="/login" />}
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
