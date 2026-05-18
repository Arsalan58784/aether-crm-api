'use client';

import React, { useState, useMemo } from 'react';
import { useCRM, type Task, type TaskPriority, type TaskStatus } from '@/context/CRMContext';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  CheckSquare, 
  Square,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ListTodo
} from 'lucide-react';

export default function TasksView() {
  const { tasks, contacts, addTask, updateTask, deleteTask, isLoading } = useCRM();

  // Search & Filter State
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');

  // Inline Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newContactId, setNewContactId] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('Medium');
  const [newDueDate, setNewDueDate] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newTaskTitle.trim()) {
      setFormError('Task title is required.');
      return;
    }

    try {
      await addTask({
        title: newTaskTitle,
        contact_id: newContactId ? parseInt(newContactId) : null,
        priority: newPriority,
        status: 'Pending',
        due_date: newDueDate || null
      });

      // Reset
      setNewTaskTitle('');
      setNewContactId('');
      setNewPriority('Medium');
      setNewDueDate('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create task.');
    }
  };

  // Toggle Task completeness
  const handleToggleTask = async (task: Task) => {
    try {
      const nextStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      await updateTask(task.id, {
        status: nextStatus
      });
    } catch (err: any) {
      alert(err.message || 'Failed to toggle task completion.');
    }
  };

  // Handle Delete
  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete task.');
      }
    }
  };

  // Filter Logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });
  }, [tasks, statusFilter, priorityFilter]);

  // Task Completion Progress Metric
  const completionProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  // Priority Styles
  const getPriorityBadgeStyle = (priority: TaskPriority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  // Formatted date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Check if date is overdue
  const isOverdue = (dateStr: string | null, status: TaskStatus) => {
    if (!dateStr || status === 'Completed') return false;
    const due = new Date(dateStr);
    due.setHours(23, 59, 59, 999); // end of day
    return due.getTime() < Date.now();
  };

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-80px)]">
      
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 select-none shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Task Manager
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Delegate activities, check off action items, and link tasks to leads.
          </p>
        </div>

        {/* Dynamic Progress indicator */}
        <div className="w-full md:w-72 glass-panel border border-slate-800/60 p-4 rounded-2xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>Agenda Progress:</span>
            </span>
            <strong className="text-white">{completionProgress}% completed</strong>
          </div>
          <div className="bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800/40">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${completionProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Inline Task Builder */}
      <form onSubmit={handleCreateTask} className="glass-card p-6 rounded-2xl border border-slate-800/50">
        <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 select-none">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span>Quick-Add Agenda Task</span>
        </h3>
        
        {formError && (
          <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl mb-4 text-center">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          {/* Title input */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">Task Title</label>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Schedule enterprise discovery call..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Contact Assigner */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">Assign to Lead</label>
            <select
              value={newContactId}
              onChange={(e) => setNewContactId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none transition-all"
            >
              <option value="">General Task (Unassigned)</option>
              {contacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} ({contact.company || 'Private'})
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">Priority</label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none transition-all"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Due date */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">Due Date</label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer transition-all"
            />
          </div>

          {/* Button */}
          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full glow-btn h-[38px] flex items-center justify-center rounded-xl text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
              title="Add Task"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

        </div>
      </form>

      {/* Query Filters */}
      <div className="flex gap-4 select-none">
        
        {/* Status Tab triggers */}
        <div className="flex bg-slate-950/20 border border-slate-800/60 p-1.5 rounded-xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              statusFilter === 'Pending' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('Completed')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              statusFilter === 'Completed' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          className="pl-3 pr-8 py-2 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-200 text-xs focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Priorities</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>

      </div>

      {/* Task Checklist Rows */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const completed = task.status === 'Completed';
            const overdue = isOverdue(task.due_date, task.status);
            const priBadge = getPriorityBadgeStyle(task.priority);
            
            return (
              <div 
                key={task.id}
                onClick={() => handleToggleTask(task)}
                className={`glass-card p-4 rounded-xl flex items-center justify-between gap-4 cursor-pointer select-none transition border hover:bg-slate-900/20 ${
                  completed ? 'opacity-65 border-slate-900/40' : 'border-slate-800/40'
                }`}
              >
                
                {/* Left: Checkbox & title */}
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 transition shrink-0 cursor-pointer"
                  >
                    {completed ? (
                      <CheckSquare className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-600" />
                    )}
                  </button>

                  <div className="flex flex-col min-w-0 space-y-1">
                    <span className={`text-sm font-semibold truncate leading-relaxed ${
                      completed ? 'line-through text-slate-500' : 'text-slate-100'
                    }`}>
                      {task.title}
                    </span>
                    
                    {/* Tags line */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Priority */}
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border ${priBadge}`}>
                        {task.priority} Priority
                      </span>
                      
                      {/* Associated lead file */}
                      {task.contact_name && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-cyan-400 font-bold bg-cyan-950/20 border border-cyan-900/30 px-2 py-0.5 rounded">
                          <User className="h-2.5 w-2.5" />
                          <span>{task.contact_name} ({task.contact_company || 'Lead'})</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Date tag & delete */}
                <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Calendar / Overdue warnings */}
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                    completed ? 'text-slate-500 bg-slate-900/10 border-slate-900/30' :
                    overdue ? 'text-red-400 bg-red-950/15 border-red-900/30 animate-pulse' : 'text-slate-400 bg-slate-900/30 border-slate-800'
                  }`}>
                    {overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                    <span>{formatDate(task.due_date)}</span>
                    {overdue && <span className="text-[9px] uppercase tracking-wider text-red-500">Overdue</span>}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-2 rounded-lg border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center rounded-2xl flex flex-col items-center gap-3 select-none">
          <ListTodo className="h-10 w-10 text-slate-600 animate-pulse" />
          <h3 className="font-bold text-slate-300">All caught up!</h3>
          <p className="text-xs text-slate-500 max-w-sm">No items match your active filters. Write a new checklist item above to get started.</p>
        </div>
      )}

    </div>
  );
}
