import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks, useTaskStats } from '../../hooks/useApi';
import { HiOutlinePlus, HiOutlineCheck, HiOutlineClock, HiOutlineExclamation } from 'react-icons/hi';

export default function Tasks() {
  const { canEdit } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // API hooks
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
  });
  const { data: stats } = useTaskStats();

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return <HiOutlineCheck className="w-5 h-5 text-green-500" />;
    if (status === 'in_progress') return <HiOutlineClock className="w-5 h-5 text-yellow-500" />;
    return <HiOutlineExclamation className="w-5 h-5 text-gray-400" />;
  };

  // Loading state
  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Tasks & Checklist</h1>
        {canEdit && (
          <button className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Stats */}
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

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`card flex items-center gap-4 ${
              task.status === 'completed' ? 'opacity-60' : ''
            }`}
          >
            {/* Checkbox */}
            <button
              disabled={!canEdit}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                task.status === 'completed'
                  ? 'bg-green-500 border-green-500'
                  : `border-gray-300 ${canEdit ? 'hover:border-gold-500 cursor-pointer' : 'cursor-default'}`
              }`}
            >
              {task.status === 'completed' && (
                <HiOutlineCheck className="w-4 h-4 text-white" />
              )}
            </button>

            {/* Priority Indicator */}
            <div className={`w-2 h-8 rounded-full ${getPriorityColor(task.priority)}`} />

            {/* Task Content */}
            <div className="flex-1">
              <div className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                {task.title}
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                <span>Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {task.assigned_to && <span>Assigned: {task.assigned_to}</span>}
                {task.events?.name && <span className="text-gold-600">{task.events.name}</span>}
              </div>
            </div>

            {/* Status & Priority Badges */}
            <div className="flex items-center gap-2">
              <span className={`badge ${
                task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
            </div>

            {/* Status Icon */}
            {getStatusIcon(task.status)}
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="card text-center py-8 text-gray-500">
            No tasks found
          </div>
        )}
      </div>
    </div>
  );
}
