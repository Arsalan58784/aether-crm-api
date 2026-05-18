'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import Sidebar, { ViewType } from '@/components/Sidebar';
import DashboardView from '@/components/DashboardView';
import ContactsView from '@/components/ContactsView';
import PipelineView from '@/components/PipelineView';
import TasksView from '@/components/TasksView';
import AnalyticsView from '@/components/AnalyticsView';
import AuthView from '@/components/AuthView';
import UsersView from '@/components/UsersView';
import ProfileView from '@/components/ProfileView';
import { 
  Bell, 
  Settings, 
  Database,
  CalendarDays,
  Sun,
  Moon
} from 'lucide-react';

export default function Home() {
  const { user, authLoading, theme, toggleTheme } = useCRM();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 1. Session Restoration Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#030712] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-slate-950 to-black flex flex-col items-center justify-center gap-4 text-slate-100 font-sans">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-slate-900"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-indigo-500 animate-spin"></div>
        </div>
        <div className="text-xs font-bold tracking-widest text-slate-400 uppercase animate-pulse">
          Authenticating Aether Portal...
        </div>
      </div>
    );
  }

  // 2. Auth Guard: Intercept routing and show AuthView if unauthenticated
  if (!user) {
    return <AuthView />;
  }

  // 3. Dynamic View Renderer
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={(view) => setCurrentView(view)} />;
      case 'contacts':
        return <ContactsView />;
      case 'pipeline':
        return <PipelineView />;
      case 'tasks':
        return <TasksView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'users':
        return user.role === 'Admin' ? (
          <UsersView />
        ) : (
          <DashboardView onNavigate={(view) => setCurrentView(view)} />
        );
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView onNavigate={(view) => setCurrentView(view)} />;
    }
  };

  // Get current date string
  const getCurrentDateString = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Header Title mapping
  const getHeaderTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Overview';
      case 'contacts':
        return 'Leads Directory';
      case 'pipeline':
        return 'Kanban Pipeline';
      case 'tasks':
        return 'Action Checklist';
      case 'analytics':
        return 'Analytics Hub';
      case 'users':
        return 'Team Administration';
      case 'profile':
        return 'Account Portfolio';
      default:
        return 'Management Hub';
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0b0f19] overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Management Toolbar */}
        <header className="h-20 border-b border-slate-800/40 bg-slate-950/20 backdrop-blur-md flex items-center justify-between px-8 shrink-0 select-none z-10">
          
          {/* Left Side: Current view indicator */}
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-300 tracking-wider uppercase">
              {getHeaderTitle()}
            </h2>
            <div className="h-4 w-px bg-slate-800"></div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{getCurrentDateString()}</span>
            </div>
          </div>

          {/* Right Side: Global controls, notification, and profile */}
          <div className="flex items-center gap-6">
            
            {/* Quick stats indicator */}
            {/* <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/40 px-3 py-1.5 rounded-full border border-slate-800/50">
              <Database className="h-3.5 w-3.5 text-indigo-400" />
              <span>Host: localhost</span>
            </div> */}

            {/* Icons */}
            <div className="flex items-center gap-3">
              {/* Sleek Theme Switcher Button */}
              <button 
                onClick={toggleTheme}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/40 border border-slate-800/30 transition cursor-pointer relative animate-fade-in"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4.5 w-4.5 text-amber-400 transition-transform duration-300 hover:rotate-45" />
                ) : (
                  <Moon className="h-4.5 w-4.5 text-indigo-500 transition-transform duration-300 hover:-rotate-12" />
                )}
              </button>

              <button 
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/40 border border-slate-800/30 transition cursor-pointer relative"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-indigo-500 rounded-full animate-ping"></span>
              </button>
              
              <button 
                onClick={() => setCurrentView('profile')}
                className={`p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/40 border transition cursor-pointer ${
                  currentView === 'profile' ? 'bg-slate-800/35 border-indigo-500/40 text-indigo-400 shadow-sm' : 'border-slate-800/30'
                }`}
                aria-label="Settings"
                title="Account Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {/* Dynamic Profile Avatar */}
            <div 
              onClick={() => setCurrentView('profile')}
              className={`flex items-center gap-3 border-l border-slate-800/60 pl-6 shrink-0 cursor-pointer hover:opacity-85 transition duration-150 ${
                currentView === 'profile' ? 'opacity-90' : ''
              }`}
              title="View Profile Settings"
            >
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-bold text-slate-200">{user.name}</span>
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">{user.role}</span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center border border-indigo-400/20 shadow-md shadow-indigo-500/10 shrink-0 select-none uppercase">
                {user.name.substring(0, 2)}
              </div>
            </div>

          </div>

        </header>

        {/* Dynamic View container */}
        <main className="flex-1 min-h-0 bg-[#0b0f19] p-8 overflow-y-auto">
          {renderView()}
        </main>

      </div>

    </div>
  );
}
