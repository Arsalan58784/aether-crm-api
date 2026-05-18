'use client';

import React from 'react';
import { useCRM, type Contact, type ContactStatus } from '@/context/CRMContext';
import { 
  DollarSign, 
  ArrowRight, 
  ArrowLeft,
  Users, 
  Briefcase, 
  Sparkles,
  MoveRight,
  TrendingUp
} from 'lucide-react';

export default function PipelineView() {
  const { contacts, updateContact, isLoading } = useCRM();

  const stages: ContactStatus[] = [
    'Lead',
    'Contacted',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost'
  ];

  // Group contacts by stage
  const contactsByStage = React.useMemo(() => {
    const groups: Record<ContactStatus, Contact[]> = {
      'Lead': [],
      'Contacted': [],
      'Proposal': [],
      'Negotiation': [],
      'Closed Won': [],
      'Closed Lost': []
    };
    
    contacts.forEach(contact => {
      if (groups[contact.status]) {
        groups[contact.status].push(contact);
      }
    });
    
    return groups;
  }, [contacts]);

  // Calculate sum of deal values for each stage
  const stageValues = React.useMemo(() => {
    const values: Record<ContactStatus, number> = {
      'Lead': 0,
      'Contacted': 0,
      'Proposal': 0,
      'Negotiation': 0,
      'Closed Won': 0,
      'Closed Lost': 0
    };
    
    contacts.forEach(contact => {
      if (values[contact.status] !== undefined) {
        values[contact.status] += Number(contact.deal_value || 0);
      }
    });
    
    return values;
  }, [contacts]);

  // Transfer deal to a new stage
  const handleMoveStage = async (contact: Contact, newStatus: ContactStatus) => {
    try {
      await updateContact(contact.id, {
        status: newStatus,
        deal_value: Number(contact.deal_value) // ensure numeric
      });
    } catch (err: any) {
      alert(err.message || 'Failed to shift deal stage.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Color mappings for column accents
  const getStageColorClasses = (stage: ContactStatus) => {
    switch (stage) {
      case 'Closed Won':
        return {
          border: 'border-emerald-500/20 hover:border-emerald-500/30',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          cardBorder: 'hover:border-emerald-500/20 hover:shadow-emerald-500/5',
          bullet: 'bg-emerald-400'
        };
      case 'Closed Lost':
        return {
          border: 'border-red-500/20 hover:border-red-500/30',
          badge: 'bg-red-500/10 text-red-400 border-red-500/20',
          cardBorder: 'hover:border-red-500/20 hover:shadow-red-500/5',
          bullet: 'bg-red-400'
        };
      case 'Negotiation':
        return {
          border: 'border-amber-500/20 hover:border-amber-500/30',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          cardBorder: 'hover:border-amber-500/20 hover:shadow-amber-500/5',
          bullet: 'bg-amber-400'
        };
      case 'Proposal':
        return {
          border: 'border-indigo-500/20 hover:border-indigo-500/30',
          badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          cardBorder: 'hover:border-indigo-500/20 hover:shadow-indigo-500/5',
          bullet: 'bg-indigo-400'
        };
      case 'Contacted':
        return {
          border: 'border-purple-500/20 hover:border-purple-500/30',
          badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          cardBorder: 'hover:border-purple-500/20 hover:shadow-purple-500/5',
          bullet: 'bg-purple-400'
        };
      default:
        return {
          border: 'border-slate-800/40 hover:border-slate-800/60',
          badge: 'bg-slate-850 text-slate-400 border-slate-800',
          cardBorder: 'hover:border-indigo-500/15 hover:shadow-indigo-500/5',
          bullet: 'bg-slate-400'
        };
    }
  };

  return (
    <div className="flex-1 p-8 space-y-8 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Sales Funnel Pipeline
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Visual Deal Kanban Board. Update sales stages instantly using visual triggers.
          </p>
        </div>
        
        {/* Aggregate pipeline metrics */}
        <div className="flex items-center gap-4 bg-slate-950/20 border border-slate-800/60 px-5 py-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-cyan-400" />
            <span className="text-xs text-slate-400">Total Deals Value:</span>
            <strong className="text-xs text-white">
              {formatCurrency(contacts.reduce((acc, curr) => acc + Number(curr.deal_value || 0), 0))}
            </strong>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-slate-400">Active Pipeline Leads:</span>
            <strong className="text-xs text-white">
              {contacts.filter(c => c.status !== 'Closed Won' && c.status !== 'Closed Lost').length}
            </strong>
          </div>
        </div>
      </div>

      {/* Kanban Board Container (Scrollable horizontally) */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex-1 flex gap-5 overflow-x-auto pb-4 items-stretch select-none pr-2">
          {stages.map((stage, idx) => {
            const list = contactsByStage[stage];
            const sumValue = stageValues[stage];
            const styles = getStageColorClasses(stage);
            
            return (
              <div 
                key={stage}
                className={`w-72 shrink-0 rounded-2xl flex flex-col kanban-column p-4 border transition-all duration-350 ${styles.border}`}
              >
                
                {/* Stage Header Info */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/30">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${styles.bullet}`}></span>
                    <h3 className="text-xs font-bold text-slate-200 tracking-wide">{stage}</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles.badge}`}>
                    {list.length}
                  </span>
                </div>
                
                {/* Column sum */}
                <div className="mb-4">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Stage Deal Total</span>
                  <span className="text-sm font-extrabold text-slate-100">{formatCurrency(sumValue)}</span>
                </div>

                {/* Column Cards (Scrollable vertically) */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                  {list.length > 0 ? (
                    list.map((contact) => (
                      <div 
                        key={contact.id}
                        className={`glass-card p-4 rounded-xl space-y-3 relative group transition-all duration-200 cursor-pointer border ${styles.cardBorder}`}
                      >
                        {/* Title & Score Indicator */}
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
                            {contact.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-medium truncate block">
                            {contact.company || 'Private Lead'}
                          </span>
                        </div>

                        {/* Deal metrics */}
                        <div className="flex justify-between items-center text-[10px] border-t border-slate-800/30 pt-3">
                          <div className="flex flex-col">
                            <span className="text-slate-500 uppercase tracking-wider">Value</span>
                            <span className="text-white font-extrabold">{formatCurrency(Number(contact.deal_value))}</span>
                          </div>
                          
                          <div className="flex flex-col items-end">
                            <span className="text-slate-500 uppercase tracking-wider">Lead Temp</span>
                            <span className={`font-bold ${
                              contact.lead_score >= 80 ? 'text-emerald-400' :
                              contact.lead_score >= 50 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {contact.lead_score >= 80 ? 'Hot' : contact.lead_score >= 50 ? 'Warm' : 'Cold'}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Info Bar: Source & Quick Shifters */}
                        <div className="flex justify-between items-center pt-2 text-[10px]">
                          <span className="text-slate-500 truncate bg-slate-900/40 px-2 py-0.5 rounded border border-slate-800/40">
                            {contact.source}
                          </span>
                          
                          {/* Transfer Stages Buttons */}
                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStage(contact, stages[idx - 1]);
                                }}
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-850 cursor-pointer transition"
                                title={`Shift back to ${stages[idx - 1]}`}
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                            )}
                            
                            {idx < stages.length - 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStage(contact, stages[idx + 1]);
                                }}
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-850 cursor-pointer transition"
                                title={`Promote to ${stages[idx + 1]}`}
                              >
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    ))
                  ) : (
                    <div className="h-full border border-dashed border-slate-800/40 rounded-xl flex items-center justify-center p-6 text-center select-none py-10 bg-slate-950/5">
                      <span className="text-[10px] text-slate-600 font-medium">No deals currently in this stage</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
