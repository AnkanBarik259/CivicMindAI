import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, Monitor, Map as MapIcon, Home, PlusCircle, LayoutDashboard, LogOut, User, Loader2, Navigation as NavIcon } from 'lucide-react';
import { useAuthStore } from './store';

const MapComponent = lazy(() => import('./components/global/MapComponent'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MyReports = lazy(() => import('./pages/MyReports'));
const ReportIssue = lazy(() => import('./pages/ReportIssue'));
const ReportDetails = lazy(() => import('./pages/ReportDetails'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AIChat = lazy(() => import('./pages/AIChat'));

type Theme = 'light' | 'dark' | 'system';

function getInitialTheme(): Theme {
  try {
    return (localStorage.getItem('theme') as Theme) || 'system';
  } catch (e) {
    return 'system';
  }
}

function GlobalLayout({ children, theme, toggleTheme }: { children: React.ReactNode, theme: Theme, toggleTheme: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans flex flex-col transition-colors duration-300">
      <header className="bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 px-6 py-3 flex items-center justify-between z-10 relative shadow-sm">
        <Link to="/" className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <span className="bg-blue-600 text-white rounded-md p-1">
            <Monitor className="w-5 h-5" />
          </span>
          CivicMind AI
        </Link>
        <nav className="flex gap-1 sm:gap-2 text-sm font-medium items-center">
          <Link to="/" className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Home className="w-4 h-4 hidden sm:block" /> Home
          </Link>
          <Link to="/map" className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <MapIcon className="w-4 h-4 hidden sm:block" /> Map
          </Link>
          
          {user ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <LayoutDashboard className="w-4 h-4 hidden sm:block" /> Dashboard
              </Link>
              <Link to="/my-reports" className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <MapIcon className="w-4 h-4 hidden sm:block" /> My Reports
              </Link>
              <Link to="/report" className="flex items-center gap-1 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm ml-2">
                <PlusCircle className="w-4 h-4" /> Report
              </Link>
              
              <div className="relative group ml-2">
                <button className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{user.name || user.email.split('@')[0]}</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/auth" className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 ml-2">
                Sign In
              </Link>
              <Link to="/auth" className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm ml-2">
                Get Started
              </Link>
            </>
          )}
          
          <button 
            onClick={toggleTheme} 
            className="ml-2 p-2 rounded-full border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-600 dark:text-slate-400"
            title={`Current theme: ${theme}`}
          >
            {theme === 'light' ? <Sun className="w-4 h-4" /> : 
             theme === 'dark' ? <Moon className="w-4 h-4" /> : 
             <Monitor className="w-4 h-4" />}
          </button>
        </nav>
      </header>
      <main className="flex-1 flex flex-col relative h-[calc(100vh-65px)] overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // Ignore if localStorage is blocked
    }
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const toggleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <BrowserRouter>
      <GlobalLayout theme={theme} toggleTheme={toggleTheme}>
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/map" element={<div className="flex-1 h-full w-full p-0 flex flex-col"><MapComponent /></div>} />
            <Route path="/report" element={<ReportIssue />} />
            <Route path="/reports/:id" element={<ReportDetails />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/chat" element={<AIChat />} />
          </Routes>
        </Suspense>
      </GlobalLayout>
    </BrowserRouter>
  );
}
