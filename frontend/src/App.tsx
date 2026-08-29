import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { User } from './types';
import { getMeApi } from './services/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check if token is in URL (Google OAuth Redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      localStorage.setItem('reachinbox_token', tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Fetch authenticated user profile
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('reachinbox_token');
        if (token) {
          const user = await getMeApi();
          if (user) {
            setUser(user);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLoginSuccess = (loggedInUser: User, token?: string) => {
    setUser(loggedInUser);
    if (token) {
      localStorage.setItem('reachinbox_token', token);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('reachinbox_token');
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading session...</div>;
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <DashboardPage user={user} onLogout={handleLogout} />;
};

export default App;
