'use client';

import React, { useState, useMemo } from 'react';
import { useCRM, type Contact, type ContactStatus } from '@/context/CRMContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Building2, 
  TrendingUp, 
  Edit2, 
  Trash2, 
  X,
  Target,
  Sparkles,
  UserCheck
} from 'lucide-react';

export default function ContactsView() {
  const { 
    contacts, 
    addContact, 
    updateContact, 
    deleteContact, 
    isLoading, 
    error,
    user,
    usersList 
  } = useCRM();
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'Lead' as ContactStatus,
    lead_score: 50,
    source: 'Website',
    deal_value: 0.00,
    assigned_to: ''
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      status: 'Lead',
      lead_score: 50,
      source: 'Website',
      deal_value: 0,
      assigned_to: ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      company: contact.company || '',
      status: contact.status,
      lead_score: contact.lead_score,
      source: contact.source,
      deal_value: Number(contact.deal_value),
      assigned_to: contact.assigned_to ? String(contact.assigned_to) : ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Name and Email are required.');
      return;
    }

    // Convert string-based form assignment to number | null for exact typings
    const payload = {
      ...formData,
      assigned_to: formData.assigned_to === '' ? null : parseInt(formData.assigned_to)
    };

    try {
      if (editingContact) {
        await updateContact(editingContact.id, payload);
      } else {
        await addContact(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error saving contact information');
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (user?.role !== 'Admin') {
      alert('Access Denied. Deleting contacts is restricted strictly to Admin roles.');
      return;
    }

    if (confirm('Are you sure you want to delete this contact and all associated tasks? This will record an Admin audit trace.')) {
      try {
        await deleteContact(id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete contact.');
      }
    }
  };

  // Filter and Search Logic
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = 
        contact.name.toLowerCase().includes(search.toLowerCase()) ||
        contact.email.toLowerCase().includes(search.toLowerCase()) ||
        (contact.company && contact.company.toLowerCase().includes(search.toLowerCase())) ||
        (contact.phone && contact.phone.includes(search));
        
      const matchesStatus = statusFilter === 'ALL' || contact.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [contacts, search, statusFilter]);

  // Pill styling for statuses
  const getStatusBadgeStyle = (status: ContactStatus) => {
    switch (status) {
      case 'Closed Won':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Closed Lost':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Negotiation':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Proposal':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Contacted':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/15 border-emerald-900/30';
    if (score >= 50) return 'text-amber-400 bg-amber-950/15 border-amber-900/30';
    return 'text-red-400 bg-red-950/15 border-red-900/30';
  };

  // Render initials avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 select-none animate-fade-in text-slate-100">
      
      {/* Title & Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0f1d]/40 backdrop-blur-md border border-slate-900 p-6 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Target className="w-5.5 h-5.5 text-indigo-400 animate-pulse" />
            <span>Leads & Client Dossiers</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Maintain client directories, lead engagement metrics, and financial pipeline aggregates.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/10 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Lead</span>
        </button>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, company, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-[#0b0f19]/40 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-[#0b0f19]/40 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
          >
            <option value="ALL">All Stages (Funnel Filter)</option>
            <option value="Lead">Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Proposal">Proposal</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Closed Won">Closed Won</option>
            <option value="Closed Lost">Closed Lost</option>
          </select>
        </div>

        {/* Dynamic counter */}
        <div className="flex items-center px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/20 text-xs text-slate-400 select-none">
          <Sparkles className="h-4 w-4 text-indigo-400 mr-2 shrink-0" />
          <span>Showing <strong className="text-white">{filteredContacts.length}</strong> of <strong className="text-white">{contacts.length}</strong> records</span>
        </div>

      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredContacts.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-900 bg-[#0b0f19]/25 shadow-2xl">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-950/30 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 rounded-tl-2xl">Contact Detail</th>
                <th className="py-4 px-6">Company & Phone</th>
                <th className="py-4 px-6 text-center">Pipeline Stage</th>
                <th className="py-4 px-6 text-center">Lead Score</th>
                <th className="py-4 px-6 text-center">Lead Source</th>
                <th className="py-4 px-6 text-right">Deal Value</th>
                <th className="py-4 px-6 text-center rounded-tr-2xl w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50 text-xs">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-950/15 transition-colors">
                  {/* Name & Initials */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600/35 to-blue-600/15 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-md">
                        {getInitials(contact.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-200 truncate">{contact.name}</span>
                        <div className="flex items-center gap-2 mt-0.5 select-none">
                          <span className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-600" />
                            {contact.email}
                          </span>
                          {contact.assignee_name && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/10 uppercase tracking-wider">
                              {contact.assignee_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="py-4 px-6">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-350 truncate">{contact.company || 'Private Lead'}</span>
                      {contact.phone && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-600" />
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeStyle(contact.status)}`}>
                      {contact.status}
                    </span>
                  </td>

                  {/* Lead Score */}
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getScoreColor(contact.lead_score)}`}>
                      <Target className="h-3 w-3" />
                      <span>{contact.lead_score}/100</span>
                    </span>
                  </td>

                  {/* Source */}
                  <td className="py-4 px-6 text-center text-slate-400 font-medium">
                    {contact.source}
                  </td>

                  {/* Deal Value */}
                  <td className="py-4 px-6 text-right font-extrabold text-white">
                    {formatCurrency(Number(contact.deal_value))}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(contact)}
                        className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all cursor-pointer"
                        title="Edit Contact"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className={`p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all cursor-pointer ${
                          user?.role !== 'Admin' ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title={user?.role === 'Admin' ? "Delete Contact" : "Deletion locked (Admin only)"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl flex flex-col items-center gap-3 bg-[#0a0f1d]/20 border border-slate-900">
          <Search className="h-10 w-10 text-slate-600 animate-pulse" />
          <h3 className="font-bold text-slate-350 text-sm">No leads matched your search query</h3>
          <p className="text-xs text-slate-500 max-w-sm">Try modifying your query or funnel filters to locate the client file.</p>
        </div>
      )}

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b0f19]/90 border border-slate-850 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-slide-up duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-900">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>{editingContact ? 'Modify Lead File' : 'Register New Lead Profile'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg border border-slate-800 hover:bg-slate-800/40 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl text-center">
                    {formError}
                  </div>
                )}

                {/* Form fields */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600 animate-none"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="sarah@acme.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 019-2834"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                    />
                  </div>

                  {/* Company */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Name</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Acme Corp"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                    />
                  </div>

                  {/* Source */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acquisition Source</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
                    >
                      <option value="Website">Website Inbound</option>
                      <option value="LinkedIn">LinkedIn Outreach</option>
                      <option value="Referral">Client Referral</option>
                      <option value="Cold Email">Cold Email Campaign</option>
                      <option value="Cold Call">Cold Calling</option>
                    </select>
                  </div>

                  {/* Pipeline Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sales Stage</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ContactStatus }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
                    >
                      <option value="Lead">Lead</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Proposal">Proposal</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Closed Won">Closed Won</option>
                      <option value="Closed Lost">Closed Lost</option>
                    </select>
                  </div>

                  {/* Deal Value */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deal Value (USD)</label>
                    <input
                      type="number"
                      value={formData.deal_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, deal_value: parseFloat(e.target.value) || 0 }))}
                      placeholder="15000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                    />
                  </div>

                  {/* Assigned Representative Selection (For Administrator delegation) */}
                  {user?.role === 'Admin' && (
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-indigo-400" />
                        <span>Assigned Representative</span>
                      </label>
                      <select
                        value={formData.assigned_to}
                        onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
                      >
                        <option value="">Unassigned (Claimable Lead)</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Lead Score */}
                  <div className="col-span-2 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Qualification Score ({formData.lead_score}/100)</label>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        formData.lead_score >= 80 ? 'text-emerald-400 border-emerald-900/30 bg-emerald-550/5' : 
                        formData.lead_score >= 50 ? 'text-amber-400 border-amber-900/30 bg-amber-550/5' : 'text-red-400 border-red-900/30 bg-red-550/5'
                      }`}>
                        {formData.lead_score >= 80 ? 'Hot Lead' : formData.lead_score >= 50 ? 'Warm Lead' : 'Cold Lead'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.lead_score}
                      onChange={(e) => setFormData(prev => ({ ...prev, lead_score: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-900 bg-slate-950/10 flex justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                >
                  <span>{editingContact ? 'Apply Changes' : 'Confirm Registration'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
