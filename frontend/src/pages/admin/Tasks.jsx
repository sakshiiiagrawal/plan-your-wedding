import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlinePlus, HiOutlineCheck, HiOutlineClock, HiOutlineExclamation } from 'react-icons/hi';

const mockTasks = [
  { id: 1, title: 'Finalize caterer menu', priority: 'high', status: 'in_progress', due_date: '2026-08-01', assigned_to: 'Mummy', event: 'All', category: 'vendor' },
  { id: 2, title: 'Order wedding invitations', priority: 'high', status: 'pending', due_date: '2026-09-01', assigned_to: 'Sakshi', event: null, category: 'invitation' },
  { id: 3, title: 'Book mehendi artist', priority: 'medium', status: 'pending', due_date: '2026-09-15', assigned_to: 'Sakshi', event: 'Mehendi', category: 'vendor' },
  { id: 4, title: 'Finalize wedding venue booking', priority: 'urgent', status: 'completed', due_date: '2026-06-01', assigned_to: 'Papa', event: 'Wedding', category: 'venue' },
  { id: 5, title: 'Book photographer', priority: 'high', status: 'completed', due_date: '2026-07-01', assigned_to: 'Ayush', event: 'All', category: 'vendor' },
  { id: 6, title: 'Arrange hotel rooms', priority: 'high', status: 'pending', due_date: '2026-10-01', assigned_to: 'Papa', event: null, category: 'accommodation' },
  { id: 7, title: 'Buy wedding lehenga', priority: 'urgent', status: 'pending', due_date: '2026-08-01', assigned_to: 'Sakshi', event: 'Wedding', category: 'shopping' },
  { id: 8, title: 'Finalize pandit ji', priority: 'high', status: 'pending', due_date: '2026-10-01', assigned_to: 'Papa', event: 'Wedding', category: 'ritual' },
];

const stats = {
  total: 85,
  pending: 25,
  in_progress: 8,
  completed: 48,
  overdue: 4
};

export default function Tasks() {
  const { canEdit } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredTasks = mockTasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

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
          <div className="text-2xl font-bold text-maroon-800">{stats.total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
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
        {filteredTasks.map((task) => (
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
                <span>Due: {task.due_date}</span>
                <span>Assigned: {task.assigned_to}</span>
                {task.event && <span className="text-gold-600">{task.event}</span>}
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
      </div>
    </div>
  );
}
