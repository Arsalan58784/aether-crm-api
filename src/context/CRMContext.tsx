'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ContactStatus = 'Lead' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Pending' | 'Completed';
export type UserRole = 'Admin' | 'Manager' | 'Sales Rep';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  roles: string[];
  permissions: string[];
  created_at?: string;
}

export interface SystemRole {
  id: number;
  name: string;
  description: string;
  created_at?: string;
}

export interface SystemPermission {
  id: number;
  name: string;
  description: string;
  created_at?: string;
}

export interface RolePermissionMapping {
  role_id: number;
  permission_id: number;
  role_name: string;
  permission_name: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: ContactStatus;
  lead_score: number;
  source: string;
  deal_value: number;
  assigned_to: number | null;
  assignee_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  contact_id: number | null;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  assigned_to: number | null;
  created_at: string;
  contact_name?: string;
  contact_company?: string;
}

export interface Activity {
  id: number;
  contact_id: number | null;
  type: string;
  description: string;
  created_at: string;
  contact_name?: string;
  contact_company?: string;
}

export interface DashboardStats {
  summary: {
    totalContacts: number;
    activeLeads: number;
    openDealsValue: number;
    totalRevenue: number;
    conversionRate: number;
    completedTasks: number;
    pendingTasks: number;
  };
  pipeline: Array<{
    stage: ContactStatus;
    count: number;
    value: number;
  }>;
  leadSources: Array<{
    source: string;
    count: number;
    value: number;
  }>;
  monthlySalesTrend: Array<{
    month: string;
    revenue: number;
    pipeline: number;
  }>;
}

interface CRMContextType {
  contacts: Contact[];
  tasks: Task[];
  activities: Activity[];
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  
  // Authentication State & Operations
  user: User | null;
  authLoading: boolean;
  usersList: User[];
  rolesList: SystemRole[];
  permissionsList: SystemPermission[];
  rolePermissions: RolePermissionMapping[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  changeUserRole: (userId: number, role: string) => Promise<void>;
  refreshUsersList: () => Promise<void>;
  refreshRBACMatrix: () => Promise<void>;
  updateRolePermissions: (roleId: number, permissionIds: number[]) => Promise<void>;
  
  // Contact Actions
  addContact: (contact: Partial<Contact>) => Promise<Contact>;
  updateContact: (id: number, contact: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: number) => Promise<void>;
  
  // Task Actions
  addTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (id: number, task: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;

  // Dynamic Roles, Profile & Theme Actions
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  addSystemRole: (name: string, description: string) => Promise<void>;
  updateProfile: (name: string, email: string, currentPassword?: string, newPassword?: string) => Promise<void>;

  // Third-Party Integrations & Webhooks
  apiKey: string | null;
  webhooksList: any[];
  integrationLogs: any[];
  refreshIntegrationHub: () => Promise<void>;
  regenerateApiKey: () => Promise<void>;
  addWebhookSubscription: (url: string, eventType: string, secret?: string) => Promise<void>;
  deleteWebhookSubscription: (id: number) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [rolesList, setRolesList] = useState<SystemRole[]>([]);
  const [permissionsList, setPermissionsList] = useState<SystemPermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMapping[]>([]);

  // 1. Fetch CRM data (Contacts, Tasks, Logs, Aggregates)
  const refreshData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [contactsRes, tasksRes, activitiesRes, statsRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/tasks'),
        fetch('/api/activities'),
        fetch('/api/dashboard')
      ]);

      if (!contactsRes.ok || !tasksRes.ok || !activitiesRes.ok || !statsRes.ok) {
        throw new Error('Session validation failed or connection lost.');
      }

      const [contactsData, tasksData, activitiesData, statsData] = await Promise.all([
        contactsRes.json(),
        tasksRes.json(),
        activitiesRes.json(),
        statsRes.json()
      ]);

      setContacts(contactsData);
      setTasks(tasksData);
      setActivities(activitiesData);
      setStats(statsData);
    } catch (err: any) {
      console.error('refreshData error:', err);
      setError(err.message || 'An error occurred while fetching CRM data.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 2. Fetch Administrator scope Users directory
  const refreshUsersList = useCallback(async () => {
    if (!user || user.role !== 'Admin') return;
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load user directory:', err);
    }
  }, [user]);

  // Fetch the role and permission matrix dynamically
  const refreshRBACMatrix = useCallback(async () => {
    if (!user || user.role !== 'Admin') return;
    try {
      const [rolesRes, permsRes, matrixRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/permissions'),
        fetch('/api/roles/permissions')
      ]);
      
      if (rolesRes.ok && permsRes.ok && matrixRes.ok) {
        const [rolesData, permsData, matrixData] = await Promise.all([
          rolesRes.json(),
          permsRes.json(),
          matrixRes.json()
        ]);
        setRolesList(rolesData.roles || []);
        setPermissionsList(permsData.permissions || []);
        setRolePermissions(matrixData.rolePermissions || []);
      }
    } catch (err) {
      console.error('Failed to retrieve RBAC matrix:', err);
    }
  }, [user]);

  // Dynamic Theme Management State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('aether-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('aether-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Dynamic system role addition callback
  const addSystemRole = useCallback(async (name: string, description: string) => {
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create system role.');
      }

      await refreshRBACMatrix();
    } catch (err: any) {
      console.error('addSystemRole error:', err);
      throw err;
    }
  }, [refreshRBACMatrix]);

  // Dynamic credentials updater
  const updateProfile = useCallback(async (name: string, email: string, currentPassword?: string, newPassword?: string) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, currentPassword, newPassword })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update user profile.');
      }

      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }

      // Re-hydrate local views dynamically
      await refreshData();
      await refreshUsersList();
    } catch (err: any) {
      console.error('updateProfile error:', err);
      throw err;
    }
  }, [refreshData, refreshUsersList]);

  // Third-Party Integrations & Webhooks State & Operations
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [webhooksList, setWebhooksList] = useState<any[]>([]);
  const [integrationLogs, setIntegrationLogs] = useState<any[]>([]);

  const refreshIntegrationHub = useCallback(async () => {
    if (!user || user.role !== 'Admin') return;
    try {
      const [keyRes, webhooksRes, logsRes] = await Promise.all([
        fetch('/api/integration/key'),
        fetch('/api/webhooks'),
        fetch('/api/integration/logs')
      ]);

      if (keyRes.ok && webhooksRes.ok && logsRes.ok) {
        const [keyData, webhooksData, logsData] = await Promise.all([
          keyRes.json(),
          webhooksRes.json(),
          logsRes.json()
        ]);
        setApiKey(keyData.apiKey);
        setWebhooksList(webhooksData.webhooks || []);
        setIntegrationLogs(logsData.logs || []);
      }
    } catch (err) {
      console.error('Failed to refresh Integration Hub data:', err);
    }
  }, [user]);

  const regenerateApiKey = useCallback(async () => {
    if (!user || user.role !== 'Admin') return;
    try {
      const res = await fetch('/api/integration/key', {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to rotate integration API Key.');
      }
      const data = await res.json();
      setApiKey(data.apiKey);
      
      // Async re-hydrate logs
      fetch('/api/integration/logs')
        .then(r => r.json())
        .then(d => setIntegrationLogs(d.logs || []));
    } catch (err: any) {
      console.error('regenerateApiKey error:', err);
      throw err;
    }
  }, [user]);

  const addWebhookSubscription = useCallback(async (url: string, eventType: string, secret?: string) => {
    if (!user || user.role !== 'Admin') return;
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, event_type: eventType, secret })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to register webhook subscription.');
      }

      const data = await res.json();
      setWebhooksList(prev => [data.webhook, ...prev]);

      // Async re-hydrate logs
      fetch('/api/integration/logs')
        .then(r => r.json())
        .then(d => setIntegrationLogs(d.logs || []));
    } catch (err: any) {
      console.error('addWebhookSubscription error:', err);
      throw err;
    }
  }, [user]);

  const deleteWebhookSubscription = useCallback(async (id: number) => {
    if (!user || user.role !== 'Admin') return;
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete webhook subscription.');
      }

      setWebhooksList(prev => prev.filter(w => w.id !== id));

      // Async re-hydrate logs
      fetch('/api/integration/logs')
        .then(r => r.json())
        .then(d => setIntegrationLogs(d.logs || []));
    } catch (err: any) {
      console.error('deleteWebhookSubscription error:', err);
      throw err;
    }
  }, [user]);

  // 3. Mount-level Session Restoration
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
      } finally {
        setAuthLoading(false);
      }
    }
    restoreSession();
  }, []);

  // 4. Reactive State Syncer: re-fetches when current account changes, purges on logout
  useEffect(() => {
    if (user) {
      refreshData();
      if (user.role === 'Admin') {
        refreshUsersList();
        refreshRBACMatrix();
        refreshIntegrationHub();
      }
    } else {
      setContacts([]);
      setTasks([]);
      setActivities([]);
      setStats(null);
      setUsersList([]);
      setRolesList([]);
      setPermissionsList([]);
      setRolePermissions([]);
      setApiKey(null);
      setWebhooksList([]);
      setIntegrationLogs([]);
    }
  }, [user, refreshData, refreshUsersList, refreshRBACMatrix, refreshIntegrationHub]);

  // 5. Auth operations
  const login = async (email: string, password: string) => {
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Authentication failed.');
    }

    const data = await res.json();
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Failed to call signout endpoint:', err);
    } finally {
      setUser(null);
    }
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed.');
    }

    const data = await res.json();
    // If Admin registered a user, just refresh users list
    if (user && user.role === 'Admin') {
      await refreshUsersList();
    } else {
      // Direct self-signup logs user in
      setUser(data.user);
    }
  };

  const changeUserRole = async (userId: number, role: string) => {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to modify team permissions.');
    }

    // Synchronize latest team list
    await refreshUsersList();
    
    Promise.all([
      fetch('/api/activities').then(r => r.json()).then(setActivities),
      fetch('/api/dashboard').then(r => r.json()).then(setStats)
    ]);
  };

  const updateRolePermissions = async (roleId: number, permissionIds: number[]) => {
    const res = await fetch('/api/roles/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId, permissionIds }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to sync role permissions.');
    }

    await refreshRBACMatrix();

    Promise.all([
      fetch('/api/activities').then(r => r.json()).then(setActivities),
      fetch('/api/dashboard').then(r => r.json()).then(setStats)
    ]);
  };

  // Contact Mutators
  const addContact = async (contactData: Partial<Contact>): Promise<Contact> => {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create contact');
    }

    const newContact = await res.json();
    setContacts(prev => [newContact, ...prev]);
    // Asynchronously update activities & stats
    Promise.all([
      fetch('/api/activities').then(r => r.json()).then(setActivities),
      fetch('/api/dashboard').then(r => r.json()).then(setStats)
    ]);
    return newContact;
  };

  const updateContact = async (id: number, contactData: Partial<Contact>): Promise<Contact> => {
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update contact');
    }

    const updatedContact = await res.json();
    setContacts(prev => prev.map(c => c.id === id ? updatedContact : c));
    // Asynchronously update activities, tasks, & stats
    Promise.all([
      fetch('/api/tasks').then(r => r.json()).then(setTasks),
      fetch('/api/activities').then(r => r.json()).then(setActivities),
      fetch('/api/dashboard').then(r => r.json()).then(setStats)
    ]);
    return updatedContact;
  };

  const deleteContact = async (id: number): Promise<void> => {
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete contact');
    }

    setContacts(prev => prev.filter(c => c.id !== id));
    // Asynchronously update activities, tasks, & stats
    Promise.all([
      fetch('/api/tasks').then(r => r.json()).then(setTasks),
      fetch('/api/activities').then(r => r.json()).then(setActivities),
      fetch('/api/dashboard').then(r => r.json()).then(setStats)
    ]);
  };

  // Task Mutators
  const addTask = async (taskData: Partial<Task>): Promise<Task> => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create task');
    }

    const newTask = await res.json();
    setTasks(prev => [newTask, ...prev]);
    // Asynchronously update activities & stats
    Promise.all([
      fetch('/api/activities').then(r => r.json()).then(setActivities),
      fetch('/api/dashboard').then(r => r.json()).then(setStats)
    ]);
    return newTask;
  };

  const updateTask = async (id: number, taskData: Partial<Task>): Promise<Task> => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update task');
    }

    const updatedTask = await res.json();
    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
    // Asynchronously update activities & stats
    Promise.all([
      fetch('/api/activities').then(r => r.json()).then(setActivities),
      fetch('/api/dashboard').then(r => r.json()).then(setStats)
    ]);
    return updatedTask;
  };

  const deleteTask = async (id: number): Promise<void> => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete task');
    }

    setTasks(prev => prev.filter(t => t.id !== id));
    // Asynchronously update activities & stats
    Promise.all([
      fetch('/api/activities').then(r => r.json()).then(setActivities),
      fetch('/api/dashboard').then(r => r.json()).then(setStats)
    ]);
  };

  return (
    <CRMContext.Provider
      value={{
        contacts,
        tasks,
        activities,
        stats,
        isLoading,
        error,
        refreshData,
        user,
        authLoading,
        usersList,
        rolesList,
        permissionsList,
        rolePermissions,
        login,
        logout,
        register,
        changeUserRole,
        refreshUsersList,
        refreshRBACMatrix,
        updateRolePermissions,
        addContact,
        updateContact,
        deleteContact,
        addTask,
        updateTask,
        deleteTask,
        theme,
        toggleTheme,
        addSystemRole,
        updateProfile,
        apiKey,
        webhooksList,
        integrationLogs,
        refreshIntegrationHub,
        regenerateApiKey,
        addWebhookSubscription,
        deleteWebhookSubscription
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (context === undefined) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
}
