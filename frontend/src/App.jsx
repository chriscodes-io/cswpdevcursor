import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Auth from './pages/Auth';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import SEOAudit from './pages/SEOAudit';
import Settings from './pages/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import { authAPI } from './lib/api';
import './App.css';

// Protected app shell - renders sidebar + topbar around child routes
const AppShell = ({
  currentUser,
  onLogout,
  theme,
  onThemeToggle,
  sidebarCollapsed,
  onSidebarToggle,
  searchQuery,
  setSearchQuery,
  children,
}) => {
  const location = useLocation();
  if (!currentUser) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="app-container">
      <Sidebar collapsed={sidebarCollapsed} onToggle={onSidebarToggle} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          theme={theme}
          onThemeToggle={onThemeToggle}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentUser={currentUser}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-[1440px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

// Main App component
const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Validate session with backend before trusting localStorage
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    if (!token && !savedUser) {
      setAuthChecked(true);
      return;
    }

    authAPI
      .getMe()
      .then((user) => {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
      .catch(() => {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        setCurrentUser(null);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // Apply theme preference
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const handleLogin = useCallback((user, token) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Logout API call failed:', err);
      }
    }
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    setCurrentUser(null);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const protectedRoute = (Component) => (
    <AppShell
      currentUser={currentUser}
      onLogout={handleLogout}
      theme={theme}
      onThemeToggle={toggleTheme}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarToggle={toggleSidebar}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      <Component currentUser={currentUser} />
    </AppShell>
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/auth"
            element={
              currentUser ? <Navigate to="/dashboard" replace /> : <Auth onLogin={handleLogin} />
            }
          />

          {/* Protected routes (require login) */}
          <Route path="/dashboard" element={protectedRoute(Dashboard)} />
          <Route path="/clients" element={protectedRoute(Clients)} />
          <Route path="/projects" element={protectedRoute(Projects)} />
          <Route path="/tasks" element={protectedRoute(Tasks)} />
          <Route path="/seo-audit" element={protectedRoute(SEOAudit)} />
          <Route path="/settings" element={protectedRoute(Settings)} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
