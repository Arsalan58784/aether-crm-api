'use client';

import React, { useState } from 'react';
import { useCRM, type User, type UserRole } from '@/context/CRMContext';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  User as UserIcon,
  Mail,
  Lock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Plus,
  KeyRound,
  ShieldAlert,
  Shield,
  Fingerprint,
  Webhook,
  Code,
  Copy,
  RefreshCw,
  ExternalLink,
  Terminal,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Globe
} from 'lucide-react';

export default function UsersView() {
  const { 
    user, 
    usersList, 
    changeUserRole, 
    register,
    rolesList,
    permissionsList,
    rolePermissions,
    updateRolePermissions,
    addSystemRole
  } = useCRM();
  
  // Tab Management state
  const [activeTab, setActiveTab] = useState<'directory' | 'permissions' | 'integrations'>('directory');

  // Registration Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('Sales Rep');
  
  // UI Indicators
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Role Form State
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Integrations State & Operation Handlers
  const { 
    apiKey, 
    webhooksList, 
    integrationLogs, 
    regenerateApiKey, 
    addWebhookSubscription, 
    deleteWebhookSubscription 
  } = useCRM();

  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvent, setNewWebhookEvent] = useState('*');
  const [newWebhookSecret, setNewWebhookSecret] = useState('');
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsCreatingWebhook(true);

    try {
      if (!newWebhookUrl.trim()) {
        throw new Error('Please specify a valid webhook receiver URL.');
      }
      await addWebhookSubscription(newWebhookUrl.trim(), newWebhookEvent, newWebhookSecret.trim());
      setSuccessMsg(`Outbound Webhook subscription registered successfully!`);
      setNewWebhookUrl('');
      setNewWebhookSecret('');
      setNewWebhookEvent('*');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register outbound webhook subscription.');
    } finally {
      setIsCreatingWebhook(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('WARNING: Regenerating the Integration API Key will immediately void the active key. Any third-party scripts or applications currently using the old key will fail. Are you sure you want to proceed?')) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsRotatingKey(true);

    try {
      await regenerateApiKey();
      setSuccessMsg(`Secure Integration API Key successfully rotated!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to rotate integration credentials.');
    } finally {
      setIsRotatingKey(false);
    }
  };

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Micro-loading indicators for permission toggling
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);
  const [updatingPermId, setUpdatingPermId] = useState<number | null>(null);

  // Custom system role registration submit handler
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmittingRole(true);

    try {
      if (!newRoleName.trim()) {
        throw new Error('Please specify a unique title for the custom role.');
      }
      await addSystemRole(newRoleName.trim(), newRoleDesc.trim());
      setSuccessMsg(`Successfully registered and populated custom role "${newRoleName.trim()}"!`);
      setNewRoleName('');
      setNewRoleDesc('');
      setIsAddingRole(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register custom system role.');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Submit Handler to Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (!name || !email || !password) {
        throw new Error('Please fill in all team member credentials.');
      }
      await register(name, email, password, selectedRole);
      setSuccessMsg(`Team member ${name} registered successfully as ${selectedRole}!`);
      setName('');
      setEmail('');
      setPassword('');
      setSelectedRole('Sales Rep');
      setIsAdding(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create team member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role promotion handler
  const handleRoleChange = async (targetUserId: number, targetName: string, newRole: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await changeUserRole(targetUserId, newRole);
      setSuccessMsg(`Successfully updated ${targetName}'s role to ${newRole}.`);
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to update ${targetName}'s role.`);
    }
  };

  // Permission matrix toggle handler
  const handleTogglePermission = async (roleId: number, permId: number, isCurrentlyAssigned: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setUpdatingRoleId(roleId);
    setUpdatingPermId(permId);

    try {
      const currentRolePerms = rolePermissions
        .filter(rp => rp.role_id === roleId)
        .map(rp => rp.permission_id);

      const updatedPermIds = isCurrentlyAssigned
        ? currentRolePerms.filter(id => id !== permId)
        : [...currentRolePerms, permId];

      await updateRolePermissions(roleId, updatedPermIds);
      setSuccessMsg(`Successfully updated and synchronized organizational permissions matrix.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to modify role privileges.');
    } finally {
      setUpdatingRoleId(null);
      setUpdatingPermId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0a0f1d]/40 backdrop-blur-md border border-slate-900 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5.5 h-5.5 text-blue-400" />
            <span>Team & Access Privilege Administration</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Audit team access levels, govern system-wide role permissions, and register new representatives.
          </p>
        </div>

        {/* Tab Selection Capsule */}
        <div className="flex bg-[#0a0f1d]/60 p-1 rounded-xl border border-slate-900/60 shadow-inner w-full sm:w-auto shrink-0 select-none">
          <button
            onClick={() => {
              setActiveTab('directory');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'directory' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            Team Directory
          </button>
          <button
            onClick={() => {
              setActiveTab('permissions');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'permissions' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            Role & Permission Matrix
          </button>
          <button
            onClick={() => {
              setActiveTab('integrations');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'integrations' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            Integrations & API
          </button>
        </div>
      </div>

      {/* Dynamic Feedback alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2.5 items-center animate-shake">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2.5 items-center">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* RENDER TAB 1: TEAM DIRECTORY */}
      {activeTab === 'directory' && (
        <>
          {/* Add New Team Member Toggle Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setIsAdding(!isAdding);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/10 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              {isAdding ? 'Close Invite Panel' : 'Register New Agent'}
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add New Team Member Form Card */}
          {isAdding && (
            <div className="bg-[#0b0f19]/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6 shadow-2xl animate-slide-down">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>New Agent Registration Portal</span>
              </h3>

              <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-bold block">Agent Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Enter full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-bold block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-bold block">Temp Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-7 space-y-1.5">
                    <label className="text-slate-400 text-[10px] font-bold block">Access Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
                    >
                      {rolesList.map((r) => (
                        <option key={r.id} value={r.name} className="bg-slate-950">{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="col-span-5 w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-bold shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1 transition-all disabled:opacity-50 h-[38px] cursor-pointer"
                  >
                    {isSubmitting ? 'Registering...' : 'Register'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Directory Grid */}
          <div className="bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/40 border-b border-slate-900/60 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300">Registered Agency Directory</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/20">
                {usersList.length} Accounts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/20 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Officer & Profile</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6">Registration Date</th>
                    <th className="py-4 px-6">Roles (Assigned)</th>
                    <th className="py-4 px-6 text-right">Role Modifier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/50 text-xs">
                  {usersList.map((item) => {
                    const isSelf = item.id === user?.id;
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-950/15 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-xs text-blue-400 group-hover:border-blue-500/30 transition-colors">
                              {item.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                {item.name}
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-bold border border-blue-500/10 uppercase">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500">ID: #{item.id}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-600" />
                            {item.email}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-600" />
                            {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {item.roles && item.roles.length > 0 ? (
                              item.roles.map((r, rIdx) => {
                                let badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                                if (r === 'Admin') badgeColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                                if (r === 'Manager') badgeColor = 'text-violet-400 bg-violet-500/10 border-violet-500/20';
                                
                                return (
                                  <span key={rIdx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                                    {r === 'Admin' && <ShieldCheck className="w-3 h-3" />}
                                    {r === 'Manager' && <UserCheck className="w-3 h-3" />}
                                    {r === 'Sales Rep' && <Users className="w-3 h-3" />}
                                    {r}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                                <Users className="w-3 h-3" />
                                {item.role}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          {isSelf ? (
                            <span className="text-[10px] text-slate-600 italic">Self modifications restricted</span>
                          ) : (
                            <select
                              value={item.role}
                              onChange={(e) => handleRoleChange(item.id, item.name, e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500/80 transition-colors h-7 cursor-pointer"
                            >
                              {rolesList.map((r) => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* RENDER TAB 2: ROLE & PERMISSION MATRIX */}
      {activeTab === 'permissions' && (
        <div className="bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900 rounded-2xl overflow-hidden shadow-xl animate-slide-up">
          
          {/* Matrix Header bar */}
          <div className="p-5 bg-slate-950/40 border-b border-slate-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Organizational Access Privilege Matrix</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Govern dynamic capability associations per system role. Toggling privileges updates active users instantly.
              </p>
            </div>
            
            <div className="flex items-center gap-3.5 ml-auto flex-wrap sm:flex-nowrap">
              <button
                onClick={() => {
                  setIsAddingRole(!isAddingRole);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{isAddingRole ? 'Close Drawer' : 'Add Custom Role'}</span>
                <Plus className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-semibold bg-cyan-500/5 border border-cyan-500/10 px-3 py-1.5 rounded-xl w-fit shrink-0">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                <span>Safety Rule: Administrative permissions are permanently locked.</span>
              </div>
            </div>
          </div>

          {/* Add Custom Role Drawer */}
          {isAddingRole && (
            <div className="p-6 bg-slate-950/20 border-b border-slate-900/60 animate-slide-down">
              <form onSubmit={handleAddRole} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end max-w-4xl">
                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider">Role Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marketing Representative"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500/80 transition-colors"
                  />
                </div>
                
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider">Brief Capability Scope Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Manage marketing pipeline and campaign leads"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500/80 transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmittingRole}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-bold shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1 transition-all disabled:opacity-50 h-[38px] cursor-pointer"
                  >
                    {isSubmittingRole ? 'Creating...' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/20 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <th className="py-4 px-6 w-5/12">Capability Name & Scope Description</th>
                  {rolesList.map(role => (
                    <th key={role.id} className="py-4 px-6 text-center">{role.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-xs">
                {permissionsList.map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-950/10 transition-all duration-150 group">
                    
                    {/* Permission Title & Scope */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-200 text-xs font-mono flex items-center gap-1.5">
                          <Fingerprint className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400/80 transition-colors" />
                          <span>{perm.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">{perm.description}</p>
                      </div>
                    </td>

                    {/* Role Permission Toggles */}
                    {rolesList.map((role) => {
                      const isAssigned = rolePermissions.some(
                        rp => rp.role_id === role.id && rp.permission_id === perm.id
                      );
                      const isUpdating = updatingRoleId === role.id && updatingPermId === perm.id;
                      const isAdmin = role.name === 'Admin';

                      return (
                        <td key={`${role.id}-${perm.id}`} className="py-4 px-6">
                          <div className="flex justify-center">
                            <button
                              disabled={isAdmin || isUpdating}
                              onClick={() => handleTogglePermission(role.id, perm.id, isAssigned)}
                              className={`relative flex items-center justify-center p-1 rounded-xl transition-all duration-200 select-none ${
                                isAdmin 
                                  ? 'opacity-60 cursor-not-allowed' 
                                  : 'cursor-pointer hover:bg-slate-800/40 hover:scale-105 active:scale-95'
                              }`}
                              title={
                                isAdmin 
                                  ? "Administrator roles are locked with full security privileges." 
                                  : `Toggle "${perm.name}" for "${role.name}"`
                              }
                            >
                              {isUpdating ? (
                                <div className="w-10 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                  <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              ) : isAssigned || isAdmin ? (
                                <div className="relative w-10 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 transition-all flex items-center pl-1">
                                  <span className="absolute right-1.5 text-[6px] text-emerald-400 font-extrabold select-none tracking-widest uppercase">ON</span>
                                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow shadow-emerald-500/50 transform translate-x-0"></div>
                                </div>
                              ) : (
                                <div className="relative w-10 h-5 rounded-full bg-slate-950 border border-slate-800 transition-all flex items-center justify-end pr-1">
                                  <span className="absolute left-1.5 text-[6px] text-slate-600 font-extrabold select-none tracking-widest uppercase">OFF</span>
                                  <div className="w-3 h-3 rounded-full bg-slate-650 transform translate-x-0"></div>
                                </div>
                              )}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENDER TAB 3: INTEGRATIONS HUB */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 animate-slide-up">
          
          {/* Header Description */}
          <div className="bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Webhook className="w-4 h-4 text-indigo-400" />
                <span>Connected Integration Portals & Webhook Engine</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Broadcast core CRM lead updates in real-time, subscribe outward webhook handlers, and import leads securely from third-party systems.
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-semibold bg-indigo-500/5 border border-indigo-500/10 px-3 py-1.5 rounded-xl shrink-0">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-time Dynamic Integrations Engine</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: API Key & Outbound Form (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* API Credentials Card */}
              <div className="bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <span>Incoming Lead Import API Settings</span>
                  </h4>
                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">Active Key</span>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Use this secret Bearer token to authorize external services (like custom Webflow, React landing pages, or Typeform) to register leads directly into your database.
                </p>

                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 font-mono text-[11px] text-slate-300 break-all select-all flex items-center justify-between gap-2 min-h-[38px]">
                    <span className="text-emerald-400">{apiKey || 'aether_api_loading_key_token_syncing...'}</span>
                  </div>

                  <button
                    onClick={handleCopyKey}
                    disabled={!apiKey}
                    className="shrink-0 p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 hover:text-white border border-slate-850 text-slate-400 transition-all flex items-center justify-center cursor-pointer"
                    title="Copy API Token to Clipboard"
                  >
                    <Copy className={`w-4 h-4 ${copiedKey ? 'text-emerald-400' : ''}`} />
                  </button>

                  <button
                    onClick={handleRegenerateKey}
                    disabled={isRotatingKey}
                    className="shrink-0 p-2.5 rounded-xl bg-red-600/15 hover:bg-red-600 border border-red-500/10 text-red-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                    title="Rotate & Regenerate Integration API Key"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRotatingKey ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* curl Sandbox */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Developer Copy-Paste Sandbox</span>
                  <div className="bg-slate-955 rounded-xl border border-slate-900 p-3.5 relative group overflow-hidden">
                    <pre className="text-[9.5px] text-indigo-300 font-mono overflow-x-auto leading-normal whitespace-pre-wrap select-all pr-8">
                      {`curl -X POST http://localhost:3000/api/integration/leads \\\n  -H "Authorization: Bearer ${apiKey || 'aether_api_token'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "name": "Jane Miller",\n    "email": "jane.miller@apex.co",\n    "company": "Apex Ventures",\n    "deal_value": 45000,\n    "source": "Landing Page API"\n  }'`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Webhook Registration Card */}
              <div className="bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 shadow-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Subscribe Outbound Webhook Receiver</span>
                </h4>

                <form onSubmit={handleCreateWebhook} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 block">Target Event Subscribed</label>
                      <select
                        value={newWebhookEvent}
                        onChange={(e) => setNewWebhookEvent(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-900 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition-colors cursor-pointer min-h-[36px]"
                      >
                        <option value="*">All Events (*)</option>
                        <option value="contact:create">Lead Captured (contact:create)</option>
                        <option value="contact:update">Lead Folder Updated (contact:update)</option>
                        <option value="contact:delete">Lead Dossier Deleted (contact:delete)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 block">HMAC Signature Secret (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. zapier_hmac_secret_key"
                        value={newWebhookSecret}
                        onChange={(e) => setNewWebhookSecret(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-900 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500/80 transition-colors min-h-[36px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 block">Outbound Webhook Destination URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        placeholder="https://api.zapier.com/hooks/catch/..."
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        className="flex-1 bg-slate-950/70 border border-slate-900 rounded-xl py-2.5 px-4 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500/80 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={isCreatingWebhook}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 text-xs font-bold shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1 transition-all disabled:opacity-50 min-h-[38px] shrink-0 cursor-pointer"
                      >
                        {isCreatingWebhook ? 'Subscribing...' : 'Subscribe'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

            </div>

            {/* Right Column: Subscribed Webhooks list (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 shadow-xl h-full flex flex-col space-y-4">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 shrink-0">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Subscribed Webhook Receiver URLs</span>
                </h4>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
                  {webhooksList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl bg-slate-950/10">
                      <Webhook className="w-7 h-7 text-slate-600 animate-pulse" />
                      <span className="text-[10px] text-slate-500">No outbound webhook destinations registered.</span>
                    </div>
                  ) : (
                    webhooksList.map((webhook: any) => (
                      <div key={webhook.id} className="bg-slate-950/30 border border-slate-900 p-3 rounded-xl flex items-center justify-between gap-3 group hover:border-slate-800/80 transition-all duration-150">
                        <div className="space-y-1.5 overflow-hidden">
                          <p className="text-[10px] font-mono text-slate-300 truncate w-full" title={webhook.url}>
                            {webhook.url}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-bold font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-1.5 py-0.5 rounded">
                              {webhook.event_type}
                            </span>
                            {webhook.secret ? (
                              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <KeyRound className="w-2 h-2 text-emerald-400" />
                                Signed
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-slate-500 bg-slate-800/10 px-1.5 py-0.5 rounded">
                                Unsigned
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (window.confirm('Delete this outbound webhook subscription?')) {
                              deleteWebhookSubscription(webhook.id);
                            }
                          }}
                          className="shrink-0 p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/5 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Row: Integration Audit Trail Logs (12 cols) */}
          <div className="bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
            
            {/* logs header */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-900/60 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                <span>Dynamic Integration Audit logs</span>
              </h3>
              <span className="text-[9px] text-cyan-400 font-bold bg-cyan-500/5 border border-cyan-500/10 px-2 py-0.5 rounded">Live transaction audits</span>
            </div>

            <div className="divide-y divide-slate-900/40 max-h-[350px] overflow-y-auto">
              {integrationLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                  <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
                  <span className="text-[10px] text-slate-500">No integration transactions recorded yet. Submit a test lead to generate audits!</span>
                </div>
              ) : (
                integrationLogs.map((log: any) => {
                  const isExpanded = expandedLogId === log.id;
                  const isIncoming = log.direction === 'incoming';
                  const isSuccess = log.status_code >= 200 && log.status_code < 300;
                  
                  return (
                    <div key={log.id} className="hover:bg-slate-950/15 transition-all">
                      
                      {/* Log Summary Line */}
                      <div
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-3.5 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none text-[11px]"
                      >
                        <div className="flex items-center gap-3 min-w-[200px]">
                          {/* Chevron */}
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          )}

                          {/* Direction badge */}
                          {isIncoming ? (
                            <span className="flex items-center gap-1 font-bold text-[8.5px] uppercase tracking-wider text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                              <span>↓ Incoming</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-bold text-[8.5px] uppercase tracking-wider text-purple-400 bg-purple-500/5 border border-purple-500/10 px-2 py-0.5 rounded-full shrink-0">
                              <span>↑ Outgoing</span>
                            </span>
                          )}

                          {/* Endpoint / URL */}
                          <span className="font-mono text-slate-300 truncate max-w-[280px]" title={log.url}>
                            {log.url}
                          </span>
                        </div>

                        {/* Event type */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-slate-400 font-bold bg-slate-800/20 px-2 py-0.5 rounded border border-slate-800/40">
                            {log.event_type}
                          </span>

                          {/* Status code */}
                          <span className={`font-bold font-mono text-[9px] px-2 py-0.5 rounded border ${
                            isSuccess 
                              ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' 
                              : 'text-red-400 bg-red-500/5 border-red-500/10'
                          }`}>
                            {log.status_code} {log.status_message}
                          </span>
                        </div>

                        {/* Timestamp */}
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Expanded Raw JSON block */}
                      {isExpanded && (
                        <div className="px-4 pb-4 animate-slide-down">
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-900/60 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Captured Payload JSON Object</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(log.payload);
                                }}
                                className="text-[9px] font-bold text-slate-400 hover:text-white bg-slate-850 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                Copy Payload
                              </button>
                            </div>
                            <pre className="text-[10px] text-indigo-300 font-mono overflow-x-auto whitespace-pre leading-normal leading-relaxed select-all">
                              {JSON.stringify(JSON.parse(log.payload), null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
