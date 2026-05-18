'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  User as UserIcon, 
  Mail, 
  Key, 
  Shield, 
  CheckCircle, 
  Save, 
  RefreshCw, 
  Lock,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function ProfileView() {
  const { user, updateProfile } = useCRM();

  // State maps for credentials editor
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Feedbacks states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-slate-400">
        Authentication record unavailable.
      </div>
    );
  }

  // Define descriptive labels for granular permissions
  const getPermissionLabel = (perm: string) => {
    const labels: Record<string, string> = {
      'contacts:read': 'View client portfolios and lead details',
      'contacts:create': 'Create new contact portfolios',
      'contacts:update': 'Modify status, score, or owners of lead folders',
      'contacts:delete': 'Permanently delete client portfolios (Restricted)',
      'tasks:read': 'View team or individual task items',
      'tasks:create': 'Create and assign action items',
      'tasks:update': 'Change task titles, statuses, and due dates',
      'tasks:delete': 'Remove task cards from system registers',
      'activities:read': 'View global systems activity audit trail',
      'roles:manage': 'Configure user roles & permission matrices (Administrative)'
    };
    return labels[perm] || 'Authorized system operation code';
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateProfile(
        name.trim(), 
        email.trim(), 
        currentPassword !== '' ? currentPassword : undefined, 
        newPassword !== '' ? newPassword : undefined
      );

      setSuccessMsg('Account profile successfully synchronized and saved.');
      setCurrentPassword('');
      setNewPassword('');
      
      // Auto clear alert
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Profile modification failed. Verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* 1. Header Profile Banner Card */}
      <div className="glass-card p-8 rounded-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden select-none">
        
        {/* Colorful backdrop pulse */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/10 to-cyan-500/5 blur-3xl pulse-glow pointer-events-none"></div>
        
        {/* Dynamic Avatar circular gradient */}
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 text-white font-extrabold flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/20 border border-white/10 uppercase select-none">
            {user.name.substring(0, 2)}
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950"></span>
          </span>
        </div>

        {/* User Metadata */}
        <div className="flex-1 text-center md:text-left min-w-0 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight truncate">
              {user.name}
            </h1>
            <div className="flex gap-2 justify-center">
              <span className="text-[10px] px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/15 uppercase tracking-wider">
                {user.role} badge
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/15 uppercase tracking-wider">
                Security clearance: Active
              </span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-x-6 gap-y-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <Mail className="h-3.5 w-3.5 text-cyan-400" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              <span>Authorized Portal Member</span>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Double Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Panel: Profile Credentials Form */}
        <div className="glass-card p-8 rounded-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-md font-bold text-slate-200">Account Credentials</h2>
              <p className="text-xs text-slate-400">Modify your authentication and profile details</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            
            {/* Success Alert */}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-xs rounded-xl animate-shake">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Error Alert */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/15 text-red-400 text-xs rounded-xl animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Full Display Name
              </label>
              <input
                id="fullName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                placeholder="Sarah Jenkins"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="emailAddress" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Email Address
              </label>
              <input
                id="emailAddress"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                placeholder="sarah.jenkins@aether.com"
              />
            </div>

            {/* Password section header */}
            <div className="pt-2 pb-1 border-t border-slate-800/40 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-slate-300">Rotate Password</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-bold uppercase ml-auto">Optional</span>
            </div>

            {/* Current Password */}
            <div className="space-y-1.5">
              <label htmlFor="currPassword" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Password
              </label>
              <input
                id="currPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                placeholder="••••••••"
              />
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                New Secured Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                placeholder="••••••••"
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl glow-btn text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Synchronizing Portal Accounts...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Account Details</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* Right Panel: Live Security Clearance Audits */}
        <div className="glass-card p-8 rounded-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-md font-bold text-slate-200">System Permissions Audit</h2>
              <p className="text-xs text-slate-400">Review your dynamically allocated roles and operations capabilities</p>
            </div>
          </div>

          {/* User's assigned database roles */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Assigned Custom & Default Roles
            </span>
            <div className="flex flex-wrap gap-2.5">
              {user.roles && user.roles.map((role) => (
                <div 
                  key={role} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-200 text-xs font-semibold"
                >
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400 animate-pulse"></span>
                  <span>{role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic permissions clearance list */}
          <div className="space-y-3 border-t border-slate-800/40 pt-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Verified Capabilities ({user.permissions?.length || 0})
            </span>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {user.permissions && user.permissions.map((perm) => (
                <div 
                  key={perm} 
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/20 border border-slate-800/45 hover:border-slate-800 transition duration-150"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-xs text-indigo-400 font-bold tracking-tight">
                      {perm}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {getPermissionLabel(perm)}
                    </span>
                  </div>
                </div>
              ))}
              
              {(!user.permissions || user.permissions.length === 0) && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No explicit permissions loaded for this role.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
