import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task, Employee } from '../types';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  RefreshCw,
  X,
  User,
  Calendar,
  Layers,
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const { isHR, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);

  // New Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'HIGH' as const,
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  });
  const [modalLoading, setModalLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      if (isHR) {
        const [t, emps] = await Promise.all([
          api.getAllTasks({
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
          }),
          api.getEmployees(),
        ]);
        setTasks(t);
        setEmployees(emps);
        if (!newTask.assigned_to && emps.length > 0) {
          setNewTask(prev => ({ ...prev, assigned_to: emps[0].id }));
        }
      } else {
        const t = await api.getMyTasks();
        setTasks(t);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, isHR]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      await api.createTask(newTask);
      setShowAddModal(false);
      setNewTask({
        title: '',
        description: '',
        assigned_to: employees[0]?.id || '',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      });
      fetchTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: any) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const kanbanColumns = [
    { id: 'TODO', title: 'To Do', color: 'border-slate-700' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-indigo-500' },
    { id: 'COMPLETED', title: 'Completed', color: 'border-emerald-500' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Workload & Task Management</h2>
          <p className="text-xs text-slate-400">
            Task completion metrics feed directly into the real-time 30% performance task score
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              List View
            </button>
          </div>

          {isHR && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" /> Create Task
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kanbanColumns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[500px]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.id === 'COMPLETED' ? 'bg-emerald-400' : col.id === 'IN_PROGRESS' ? 'bg-indigo-400' : 'bg-slate-400'}`} />
                    <h3 className="font-bold text-xs text-white uppercase tracking-wider">{col.title}</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-950 px-2 py-0.5 rounded-full text-slate-400 font-mono">
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks in column */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-600 italic">
                      No tasks in {col.title.toLowerCase()}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-indigo-500/40 transition shadow space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-white leading-tight">{task.title}</h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                              task.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                              task.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                              task.priority === 'MEDIUM' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                          {task.description}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-900">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-slate-500" /> Due: {task.due_date}
                          </span>
                          {task.assigned_to_name && (
                            <span className="text-slate-300 font-medium truncate max-w-[100px]">
                              {task.assigned_to_name}
                            </span>
                          )}
                        </div>

                        {/* Status change actions */}
                        <div className="flex items-center gap-1 pt-1">
                          {col.id !== 'TODO' && (
                            <button
                              onClick={() => handleUpdateStatus(task.id, 'TODO')}
                              className="text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-900 rounded hover:bg-slate-800 transition"
                            >
                              ← To Do
                            </button>
                          )}
                          {col.id !== 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 px-2 py-1 bg-indigo-950/40 rounded hover:bg-indigo-900/60 transition"
                            >
                              In Progress
                            </button>
                          )}
                          {col.id !== 'COMPLETED' && (
                            <button
                              onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-emerald-950/40 rounded hover:bg-emerald-900/60 transition ml-auto"
                            >
                              Complete ✓
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Task</th>
                  {isHR && <th className="py-3.5 px-4">Assigned To</th>}
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white text-xs">{task.title}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-sm">{task.description}</p>
                    </td>
                    {isHR && (
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {task.assigned_to_name || task.assigned_to}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        task.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                        task.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{task.due_date}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                        task.status === 'IN_PROGRESS' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        aria-label="Update task status"
                        value={task.status}
                        onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1 text-white focus:outline-none"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-base text-white">Create Work Item</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Implement OAuth SSO Flow"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Detailed deliverables and acceptance criteria..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Assign Employee *</label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="p-4 bg-slate-800/60 border-t border-slate-700 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition shadow disabled:opacity-50"
                >
                  {modalLoading ? 'Creating...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
