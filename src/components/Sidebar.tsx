'use client';

import React from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  LayoutDashboard, 
  Users, 
  GitMerge, 
  CheckSquare, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Shield,
  LogOut
} from 'lucide-react';

export type ViewType = 'dashboard' | 'contacts' | 'pipeline' | 'tasks' | 'analytics' | 'users' | 'profile';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ 
  currentView, 
  setCurrentView, 
  isCollapsed, 
  setIsCollapsed 
}: SidebarProps) {
  
  const { user, logout } = useCRM();

  // Dynamic Navigation builder based on roles
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contacts', label: 'Leads & Contacts', icon: Users },
    { id: 'pipeline', label: 'Sales Pipeline', icon: GitMerge },
    { id: 'tasks', label: 'Task Manager', icon: CheckSquare },
    { id: 'analytics', label: 'Analytics Suite', icon: BarChart3 },
  ];

  // Admins get administrative access controls
  if (user && user.role === 'Admin') {
    menuItems.push({ id: 'users', label: 'Team Admin', icon: Shield });
  }

  return (
    <aside 
      className={`relative h-screen glass-panel border-r border-slate-800/40 flex flex-col transition-all duration-300 ease-in-out z-20 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header Logo */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800/40 gap-3 overflow-hidden select-none">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white shrink-0 shadow-lg shadow-indigo-500/20">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-sans">
              AETHER
            </span>
            <span className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase -mt-1 font-sans">
              CRM Suite
            </span>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewType)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-gradient-to-r from-indigo-500/15 to-cyan-500/5 text-white border-l-2 border-indigo-500 font-medium' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30 border-l-2 border-transparent'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              
              {!isCollapsed && (
                <span className="text-sm tracking-wide transition-opacity duration-200">
                  {item.label}
                </span>
              )}

              {/* Hover tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-20 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md py-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap shadow-xl z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile dossier card */}
      {user && (
        <div className="p-4 border-t border-slate-850/60 flex flex-col gap-3">
          <div 
            onClick={() => setCurrentView('profile')}
            className={`flex items-center gap-3 overflow-hidden cursor-pointer hover:bg-slate-800/20 p-1.5 rounded-xl border transition duration-150 group ${
              currentView === 'profile' ? 'bg-slate-800/25 border-slate-800/60' : 'border-transparent hover:border-slate-850/40'
            }`}
            title="My Profile Settings"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-md group-hover:scale-105 transition-transform duration-150">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs text-slate-200 group-hover:text-white transition duration-150 truncate">{user.name}</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/10 uppercase tracking-widest mt-0.5 w-max">
                  {user.role}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed ? (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/15 hover:border-red-500/30 text-red-400 text-xs font-bold transition-all duration-200 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 animate-pulse" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center p-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/15 text-red-400 transition-all duration-200 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Footer / Collapse Trigger */}
      <div className="p-4 border-t border-slate-800/40 flex justify-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center p-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/50 hover:text-white text-slate-400 transition-all duration-200 cursor-pointer shadow-inner bg-slate-900/30"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
