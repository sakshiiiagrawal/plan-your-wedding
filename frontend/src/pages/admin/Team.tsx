/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers, useCreateUser, useDeleteUser } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { HiOutlineTrash, HiOutlineUserAdd, HiOutlineX } from 'react-icons/hi';
import { Navigate, useParams } from 'react-router-dom';
import type { TeamMember } from '../../hooks/useApi';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-maroon-100 text-maroon-800',
  family: 'bg-blue-100 text-blue-800',
  friends: 'bg-green-100 text-green-700',
};

interface AddMemberModalProps {
  onClose: () => void;
}

function AddMemberModal({ onClose }: AddMemberModalProps) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'family' });
  const [showPassword, setShowPassword] = useState(false);
  const createUser = useCreateUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser.mutateAsync(form);
      toast.success(`${form.name}'s account created!`);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create user');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-maroon-800 text-lg">Add Team Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="their@email.com"
              required
            />
          </div>

          <div>
            <label className="label">Role *</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="family">Family (view all, read-only)</option>
              <option value="friends">Friends (view all except finance, read-only)</option>
            </select>
          </div>

          <div>
            <label className="label">Temporary Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-12"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Share this password with them directly.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="btn-primary flex-1 py-2.5 disabled:opacity-50"
            >
              {createUser.isPending ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Team() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAdmin } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (!isAdmin) return <Navigate to={`/${slug}/admin`} replace />;

  const handleDelete = async (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.name}'s access? This cannot be undone.`)) return;
    setDeleting(member.id);
    try {
      await deleteUser.mutateAsync(member.id);
      toast.success(`${member.name} removed.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  const teamMembers = users.filter((u) => u.id !== user?.id);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-maroon-800 mb-1">Team Access</h1>
        <p className="text-gray-500 text-sm mb-6">Manage who can access the wedding planner.</p>

        <div className="bg-white rounded-2xl border border-gold-200 p-5">
          <h2 className="font-display font-semibold text-gray-700 mb-3">Your Account</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-maroon-800 font-bold">{user?.name?.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
            {user?.role && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role] ?? ''}`}
              >
                {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-gray-700">
            Team Members {!isLoading && `(${teamMembers.length})`}
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <HiOutlineUserAdd className="w-4 h-4" />
            Add Member
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gold-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : teamMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-4xl mb-3">👥</p>
              <p className="font-medium">No team members yet.</p>
              <p className="text-sm mt-1">
                Add family or friends so they can view the wedding planner.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-cream border-b border-gold-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Added
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-maroon-800 text-sm font-medium">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800 text-sm">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell">
                      {member.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[member.role] ?? ''}`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400 hidden md:table-cell">
                      {new Date(member.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(member)}
                        disabled={deleting === member.id}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Remove access"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && <AddMemberModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
