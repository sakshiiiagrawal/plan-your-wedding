/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import {
  useTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import {
  HiOutlinePlus,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlinePencil,
  HiOutlineTrash,
} from 'react-icons/hi';

interface TaskFormData {
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: string;
  event_id: string | null;
}

const DEFAULT_FORM: TaskFormData = {
  title: '',
  description: '',
  due_date: '',
  priority: 'medium',
  status: 'pending',
  assigned_to: '',
  event_id: null,
};

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>(DEFAULT_FORM);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useTasks({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
  });
  const { data: stats } = useTaskStats();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const updateStatusMutation = useUpdateTaskStatus();
  const deleteMutation = useDeleteTask();

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingTask(null);
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      due_date: task.due_date || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      assigned_to: task.assigned_to || '',
      event_id: task.event_id || null,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await updateMutation.mutateAsync({ id: editingTask.id, ...formData });
        toast.success('Task updated successfully!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Task created successfully!');
      }
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to save task';
      toast.error(errorMessage);
    }
  };

  const handleToggleStatus = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateStatusMutation.mutateAsync({ id: task.id, status: newStatus });
      toast.success(`Task marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update task status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Task deleted successfully!');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500',
    };
    return colors[priority] ?? 'bg-gray-500';
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Tasks & Checklist</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-maroon-800">{stats?.total || 0}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-600">{stats?.pending || 0}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats?.in_progress || 0}</div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{stats?.overdue || 0}</div>
          <div className="text-sm text-gray-500">Overdue</div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`card flex flex-col sm:flex-row sm:items-center gap-3 ${task.status === 'completed' ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => handleToggleStatus(task)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                  task.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-gold-500 cursor-pointer'
                }`}
              >
                {task.status === 'completed' && <HiOutlineCheck className="w-4 h-4 text-white" />}
              </button>

              <div className={`w-2 h-8 rounded-full shrink-0 ${getPriorityColor(task.priority)}`} />

              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}
                >
                  {task.title}
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                  {task.due_date && (
                    <span>
                      Due:{' '}
                      {new Date(task.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                  {task.assigned_to && <span>Assigned: {task.assigned_to}</span>}
                  {(task as any).events?.name && (
                    <span className="text-gold-600">{(task as any).events.name}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 pl-9 sm:pl-0">
              <span
                className={`badge ${
                  task.priority === 'urgent'
                    ? 'bg-red-100 text-red-700'
                    : task.priority === 'high'
                      ? 'bg-orange-100 text-orange-700'
                      : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                }`}
              >
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(task)}
                  className="p-2 hover:bg-gold-50 rounded-lg text-gold-600"
                  title="Edit task"
                >
                  <HiOutlinePencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(task.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                  title="Delete task"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="card text-center py-8 text-gray-500">No tasks found</div>
        )}
      </div>

      {showAddModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl font-display font-bold text-maroon-800">
                  {editingTask ? 'Edit Task' : 'Add New Task'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="label">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    placeholder="Task title"
                    required
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="Task description..."
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Assigned To</label>
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="input"
                      placeholder="Person name"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="input"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </form>

              <div className="flex gap-3 p-6 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingTask
                      ? 'Update Task'
                      : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {deleteConfirm && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md">
              <h3 className="text-lg font-bold text-maroon-800 mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1">
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex-1 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
