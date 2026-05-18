'use client';

import React, { useEffect, useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Target, 
  Activity as ActivityIcon,
  CheckCircle,
  Clock,
  Briefcase,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

export default function DashboardView({ onNavigate }: { onNavigate: (view: any) => void }) {
  const { stats, activities, isLoading, error } = useCRM();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 text-sm">Syncing CRM dashboard metrics...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 p-8">
        <div className="glass-card border-red-500/20 p-6 rounded-2xl bg-red-950/10 flex flex-col items-center text-center gap-3">
          <ShieldCheck className="h-12 w-12 text-red-500" />
          <h3 className="text-lg font-bold text-red-400">Database Connection Failed</h3>
          <p className="text-slate-400 max-w-md text-sm">
            {error || 'Could not fetch CRM statistics from MySQL server. Please ensure XAMPP Apache and MySQL are running.'}
          </p>
        </div>
      </div>
    );
  }

  const { summary, pipeline, leadSources, monthlySalesTrend } = stats;

  // Format currencies
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Color Palette for Pie Chart
  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  // Helper for activity icons
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Deal Closed':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'Stage Changed':
        return <TrendingUp className="h-4 w-4 text-indigo-400" />;
      case 'Lead Created':
        return <Users className="h-4 w-4 text-cyan-400" />;
      case 'Task Completed':
        return <CheckCircle className="h-4 w-4 text-indigo-400" />;
      case 'Lead Deleted':
        return <Clock className="h-4 w-4 text-red-400" />;
      default:
        return <ActivityIcon className="h-4 w-4 text-slate-400" />;
    }
  };

  // Formatted date helper
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-80px)]">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Executive Summary
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time pipeline analytics, lead conversion ratios, and recent operations.
          </p>
        </div>
        {/* <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-xs text-slate-400 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>MySQL Connection Active</span>
          </div>
        </div> */}
      </div>

      {/* 4 KPI Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Revenue */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Sales Revenue</span>
              <h3 className="text-3xl font-bold text-white tracking-tight">{formatCurrency(summary.totalRevenue)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-indigo-300">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            <span>Completed sales funnel earnings</span>
          </div>
        </div>

        {/* Sales Pipeline Value */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Deals Pipeline</span>
              <h3 className="text-3xl font-bold text-white tracking-tight">{formatCurrency(summary.openDealsValue)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-cyan-300">
            <ArrowUpRight className="h-4 w-4 text-cyan-400" />
            <span>Value of unclosed pipeline deals</span>
          </div>
        </div>

        {/* Active Leads */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Raw Leads</span>
              <h3 className="text-3xl font-bold text-white tracking-tight">{summary.activeLeads}</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300">
            <Target className="h-4 w-4 text-emerald-400" />
            <span>Leads waiting for qualification</span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Lead Conversion Rate</span>
              <h3 className="text-3xl font-bold text-white tracking-tight">{summary.conversionRate}%</h3>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-purple-300">
            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${summary.conversionRate}%` }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Revenue Trend (2/3 width) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Monthly Sales Growth</h3>
              <p className="text-xs text-slate-400">Comparing active pipeline value vs realized earnings</p>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-0">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlySalesTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    stroke="#475569" 
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value || 0)), undefined]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Closed Won Revenue"
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pipeline" 
                    name="Pipeline Value"
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPipeline)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Side: Lead Source Breakdown (1/3 width) */}
        <div className="glass-card p-6 rounded-2xl flex flex-col h-[400px]">
          <div>
            <h3 className="text-base font-bold text-white">Lead Sourcing Breakdown</h3>
            <p className="text-xs text-slate-400">Where are your highest value deals originating?</p>
          </div>
          
          <div className="flex-1 w-full min-h-0 flex items-center justify-center py-4 relative">
            {isMounted && leadSources.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSources}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="source"
                  >
                    {leadSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: any) => [formatCurrency(Number(value || 0)), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-500 text-xs">No sourcing data loaded</span>
            )}
          </div>
          
          {/* Custom legend grid */}
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/40 pt-4">
            {leadSources.slice(0, 4).map((source, idx) => (
              <div key={source.source} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-slate-400 truncate">{source.source}</span>
                <span className="text-white font-bold ml-auto">{source.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Grid: Recent Activity Feed & Task Quickview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Recent Activity (2/3 width) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Live Activity Feed</h3>
              <p className="text-xs text-slate-400">Instant logs of status changes, closures, and tasks.</p>
            </div>
            <button 
              onClick={() => onNavigate('contacts')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer select-none"
            >
              <span>Manage Contacts</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {activities.length > 0 ? (
              activities.slice(0, 6).map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-900/30 transition-all border border-transparent hover:border-slate-800/30">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/60 shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-semibold text-slate-200 truncate">{activity.type}</h4>
                      <span className="text-[10px] text-slate-500 shrink-0 font-medium">{formatTime(activity.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {activity.description}
                    </p>
                    {activity.contact_name && (
                      <span className="inline-flex items-center text-[10px] text-cyan-400 font-semibold mt-1 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-900/30">
                        {activity.contact_name} ({activity.contact_company || 'Lead'})
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm gap-2">
                <ActivityIcon className="h-8 w-8 text-slate-600 animate-pulse" />
                <span>No activities recorded yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Task Status & Quick Action */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Action Center</h3>
              <p className="text-xs text-slate-400">Current agenda checklist status</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-indigo-950/10 border border-indigo-900/20 text-center">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Pending Tasks</span>
                <span className="text-3xl font-extrabold text-white block mt-1">{summary.pendingTasks}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-900/20 text-center">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Completed</span>
                <span className="text-3xl font-extrabold text-white block mt-1">{summary.completedTasks}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick CRM Actions</h4>
              <div className="space-y-2">
                <button 
                  onClick={() => onNavigate('pipeline')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/20 hover:bg-slate-800/40 text-slate-200 text-xs text-left cursor-pointer transition-all duration-200 group"
                >
                  <span className="font-semibold">Review Kanban Sales Stages</span>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
                <button 
                  onClick={() => onNavigate('tasks')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/20 hover:bg-slate-800/40 text-slate-200 text-xs text-left cursor-pointer transition-all duration-200 group"
                >
                  <span className="font-semibold">Open CRM Task Checklist</span>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/40 pt-4 mt-6">
            <button
              onClick={() => onNavigate('contacts')}
              className="w-full py-3 px-4 rounded-xl glow-btn text-white text-xs font-semibold text-center block cursor-pointer"
            >
              Add New Lead Record
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
