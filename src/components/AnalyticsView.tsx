'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Sparkles, 
  PieChart as PieIcon, 
  Target,
  Percent,
  Award
} from 'lucide-react';

export default function AnalyticsView() {
  const { stats, contacts, isLoading } = useCRM();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute local metrics dynamically for detailed analytics
  const computedMetrics = useMemo(() => {
    if (contacts.length === 0) return null;

    // 1. Average deal value
    const totalDeals = contacts.length;
    const totalValue = contacts.reduce((acc, curr) => acc + Number(curr.deal_value || 0), 0);
    const avgDealValue = totalValue / totalDeals;

    // 2. Sourcing statistics
    const sourcesMap: Record<string, { count: number; won: number; value: number; totalValue: number }> = {};
    contacts.forEach(c => {
      const source = c.source || 'Website';
      if (!sourcesMap[source]) {
        sourcesMap[source] = { count: 0, won: 0, value: 0, totalValue: 0 };
      }
      sourcesMap[source].count++;
      sourcesMap[source].totalValue += Number(c.deal_value || 0);
      if (c.status === 'Closed Won') {
        sourcesMap[source].won++;
        sourcesMap[source].value += Number(c.deal_value || 0);
      }
    });

    const sourcingTable = Object.entries(sourcesMap).map(([source, item]) => {
      const conversionRate = item.count > 0 ? Math.round((item.won / item.count) * 100) : 0;
      return {
        source,
        totalLeads: item.count,
        wonDeals: item.won,
        conversionRate,
        wonValue: item.value,
        totalValue: item.totalValue
      };
    }).sort((a, b) => b.wonValue - a.wonValue);

    // 3. Highest yielding channel
    const highestChannel = sourcingTable[0] ? sourcingTable[0].source : 'Website';

    // 4. Hot leads count (score >= 80, excluding closed)
    const hotLeads = contacts.filter(c => c.lead_score >= 80 && c.status !== 'Closed Won' && c.status !== 'Closed Lost').length;

    return {
      avgDealValue,
      sourcingTable,
      highestChannel,
      hotLeads
    };
  }, [contacts]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 text-sm">Aggregating analytical trends...</span>
        </div>
      </div>
    );
  }

  if (!stats || !computedMetrics) {
    return (
      <div className="flex-1 p-8 text-center text-slate-500">
        Analytics suite failed to load stats
      </div>
    );
  }

  const { pipeline, leadSources } = stats;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const BAR_COLORS = ['#6366f1', '#4f46e5', '#3b82f6', '#06b6d4', '#10b981', '#ef4444'];

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-80px)]">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Analytics Suite
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Funnel distributions, acquisition sourcing conversions, and financial performance audits.
          </p>
        </div>
      </div>

      {/* 3 Executive Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Average Deal Value */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group select-none">
          <div className="absolute top-0 right-0 h-20 w-20 bg-indigo-500/5 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Average Deal Value</span>
              <h3 className="text-2xl font-extrabold text-white tracking-tight">{formatCurrency(computedMetrics.avgDealValue)}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/30 text-indigo-400">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
            Mean average valuation across all recorded deals in the CRM funnel.
          </p>
        </div>

        {/* Highest Performing Channel */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group select-none">
          <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500/5 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Top Sourcing Channel</span>
              <h3 className="text-2xl font-extrabold text-white tracking-tight">{computedMetrics.highestChannel}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-400">
              <Award className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
            Acquisition stream generating the highest Closed Won revenue yield.
          </p>
        </div>

        {/* Hot Leads */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group select-none">
          <div className="absolute top-0 right-0 h-20 w-20 bg-amber-500/5 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Active Hot Leads</span>
              <h3 className="text-2xl font-extrabold text-white tracking-tight">{computedMetrics.hotLeads} Leads</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/30 text-amber-400">
              <Target className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
            Leads with a qualification score ≥ 80 currently working through the pipeline.
          </p>
        </div>

      </div>

      {/* Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Funnel Stage Value Chart */}
        <div className="glass-card p-6 rounded-2xl flex flex-col h-[380px]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Funnel Stage Distribution</h3>
            <p className="text-xs text-slate-400">Analyzing deal volume distributions per pipeline status stage</p>
          </div>
          
          <div className="flex-1 w-full min-h-0">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipeline}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis 
                    dataKey="stage" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
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
                    formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Total Deals Value']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {pipeline.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Source Acquisition Yield */}
        <div className="glass-card p-6 rounded-2xl flex flex-col h-[380px]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Acquisition Sourcing Yield</h3>
            <p className="text-xs text-slate-400">Comparing financial deal yields across sourcing streams</p>
          </div>

          <div className="flex-1 w-full min-h-0">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={leadSources}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <XAxis 
                    type="number" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="source" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Deals Value']}
                  />
                  <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Sourcing Channels Deep Table */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-sm font-bold text-white">Acquisition Channel Audit</h3>
            <p className="text-xs text-slate-400">Comparative breakdown of sourcing efficiency and conversion percentages.</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/40">
          <table className="glass-table min-w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none bg-slate-900/30">
                <th className="px-6 py-4 rounded-tl-xl">Sourcing Channel</th>
                <th className="px-6 py-4 text-center">Total Lead Volume</th>
                <th className="px-6 py-4 text-center">Closed Won Deals</th>
                <th className="px-6 py-4 text-center">Conversion Ratio</th>
                <th className="px-6 py-4 text-right">Potential Value</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Won Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/10">
              {computedMetrics.sourcingTable.map((item) => (
                <tr key={item.source}>
                  <td className="px-6 py-4 font-bold text-slate-200">{item.source}</td>
                  <td className="px-6 py-4 text-center text-slate-300 font-semibold">{item.totalLeads}</td>
                  <td className="px-6 py-4 text-center text-slate-300 font-semibold">{item.wonDeals}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      item.conversionRate >= 50 ? 'text-emerald-400 bg-emerald-950/15 border-emerald-900/30' : 
                      item.conversionRate >= 20 ? 'text-amber-400 bg-amber-950/15 border-amber-900/30' : 'text-slate-400 bg-slate-900/30 border-slate-800'
                    }`}>
                      <Percent className="h-3 w-3" />
                      <span>{item.conversionRate}%</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400 font-medium">{formatCurrency(item.totalValue)}</td>
                  <td className="px-6 py-4 text-right font-extrabold text-emerald-400">{formatCurrency(item.wonValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
