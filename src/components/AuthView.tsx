'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  Shield, 
  Mail, 
  Lock, 
  User, 
  Users, 
  ArrowRight, 
  Sparkles,
  Info
} from 'lucide-react';

export default function AuthView() {
  const { login, register } = useCRM();
  const [isLoginTab, setIsLoginTab] = useState(true);
  
  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick login handler
  const handleQuickLogin = async (demoEmail: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(demoEmail, 'Password123');
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (isLoginTab) {
        if (!email || !password) {
          throw new Error('Please fill in all credentials.');
        }
        await login(email, password);
      } else {
        if (!name || !email || !password) {
          throw new Error('Please provide your name, email, and password.');
        }
        await register(name, email, password);
        setSuccessMsg('Account registered successfully! Logging you in...');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-slate-950 to-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-75"></div>

      <div className="w-full max-w-5xl grid md:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Side: Product Branding & Philosophy */}
        <div className="md:col-span-5 space-y-6 text-left hidden md:block">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Enterprise CRM
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            AETHER <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              CRM SUITE
            </span>
          </h1>
          
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Experience absolute control over your organization's sales funnel, contact registries, and tasks dashboards, protected with advanced cryptographic role management.
          </p>

          <div className="border-t border-slate-800/80 pt-6 space-y-4">
            <div className="flex gap-3.5 items-start">
              <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-slate-200 font-semibold text-sm">Role-Based Encryption</h4>
                <p className="text-slate-400 text-xs mt-0.5">Strict database partitions segmenting Admin, Manager, and Sales Rep access.</p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-indigo-400 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-slate-200 font-semibold text-sm">Agile Sales Collaboration</h4>
                <p className="text-slate-400 text-xs mt-0.5">Assign, monitor, and promote pipeline leads seamlessly between sales agents.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Glassmorphic Auth Portal Card */}
        <div className="md:col-span-7 bg-[#0b0f19]/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl relative">
          
          {/* Active Tab Toggle */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-900 mb-6">
            <button
              onClick={() => { setIsLoginTab(true); setErrorMsg(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                isLoginTab 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In Account
            </button>
            <button
              onClick={() => { setIsLoginTab(false); setErrorMsg(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                !isLoginTab 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Team Registration
            </button>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1.5">
            {isLoginTab ? 'Welcome Back Officer' : 'Create Team Account'}
          </h2>
          <p className="text-slate-400 text-xs mb-6">
            {isLoginTab ? 'Please sign in to access your customized CRM workspace.' : 'Register as a sales representative to manage your portfolio.'}
          </p>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              {successMsg}
            </div>
          )}

          {/* Core Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginTab && (
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-semibold block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold block">Security Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
            >
              {isSubmitting ? 'Authenticating...' : isLoginTab ? 'Access Dashboard' : 'Register Member'}
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick-Fill Demonstration Panel */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold mb-3">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Demonstration: Quick-Fill Roles</span>
            </div>
            
            <p className="text-slate-500 text-[10px] leading-relaxed mb-3">
              Click any default seeded credential link below to sign in instantly with dynamic role properties and custom partitioned lead databases.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@aether.com')}
                disabled={isSubmitting}
                className="flex items-center justify-between p-2 rounded-xl bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-500/20 hover:border-indigo-500/40 text-left transition-all"
              >
                <div>
                  <h5 className="text-indigo-400 font-bold text-[10px]">Admin Account</h5>
                  <p className="text-slate-500 text-[9px]">Full administrative control</p>
                </div>
                <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@aether.com')}
                disabled={isSubmitting}
                className="flex items-center justify-between p-2 rounded-xl bg-violet-950/20 hover:bg-violet-950/40 border border-violet-500/20 hover:border-violet-500/40 text-left transition-all"
              >
                <div>
                  <h5 className="text-violet-400 font-bold text-[10px]">Manager Account</h5>
                  <p className="text-slate-500 text-[9px]">Global lead supervisor</p>
                </div>
                <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rep1@aether.com')}
                disabled={isSubmitting}
                className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 hover:border-emerald-500/40 text-left transition-all"
              >
                <div>
                  <h5 className="text-emerald-400 font-bold text-[10px]">Sales Rep One</h5>
                  <p className="text-slate-500 text-[9px]">Personal lead folder 1</p>
                </div>
                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rep2@aether.com')}
                disabled={isSubmitting}
                className="flex items-center justify-between p-2 rounded-xl bg-teal-950/20 hover:bg-teal-950/40 border border-teal-500/20 hover:border-teal-500/40 text-left transition-all"
              >
                <div>
                  <h5 className="text-teal-400 font-bold text-[10px]">Sales Rep Two</h5>
                  <p className="text-slate-500 text-[9px]">Personal lead folder 2</p>
                </div>
                <ArrowRight className="w-3 h-3 text-teal-400 shrink-0" />
              </button>
            </div>
            
            <div className="mt-2 text-center">
              <span className="text-[9px] text-slate-600">Seeded password for all: <code className="text-slate-500 font-mono">Password123</code></span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
