'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

type ModalMode = 'create' | 'edit' | null;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-100 text-amber-700 ring-2 ring-amber-300';
      case 'manager':
        return 'bg-blue-100 text-blue-700';
      case 'waiter':
        return 'bg-purple-100 text-purple-700';
      case 'kitchen':
        return 'bg-orange-100 text-orange-700';
      case 'cashier':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Chủ nhà hàng';
      case 'manager':
        return 'Quản lý';
      case 'waiter':
        return 'Phục vụ';
      case 'kitchen':
        return 'Bếp';
      case 'cashier':
        return 'Thu ngân';
      default:
        return role;
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '', email: '', password: '', role: 'waiter' });
    setFormError('');
    setModalMode('create');
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setFormError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (modalMode === 'create') {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('User created successfully!');
          fetchUsers();
          closeModal();
        } else {
          setFormError(data.error || 'Failed to create user');
        }
      } else if (modalMode === 'edit' && selectedUser) {
        const updateData: Record<string, string> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        
        if (formData.password) {
          updateData.password = formData.password;
        }

        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('User updated successfully!');
          fetchUsers();
          closeModal();
        } else {
          setFormError(data.error || 'Failed to update user');
        }
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmUser) return;

    try {
      const response = await fetch(`/api/users/${deleteConfirmUser.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('User deleted successfully!');
        fetchUsers();
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setDeleteConfirmUser(null);
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + Add User
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          ✅ {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          ❌ {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-500">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-gray-500">No users registered yet</p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create First User
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      {user.role !== 'owner' && (
                        <button
                          onClick={() => setDeleteConfirmUser(user)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Managers</p>
          <p className="text-2xl font-bold text-blue-600">
            {users.filter(u => u.role === 'manager').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Cashiers</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.role === 'cashier').length}
          </p>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {modalMode === 'create' ? 'Create New User' : 'Edit User'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {modalMode === 'edit' && <span className="text-gray-400">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  required={modalMode === 'create'}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  disabled={selectedUser?.role === 'owner'}
                >
                  <option value="waiter">Phục vụ (Waiter)</option>
                  <option value="kitchen">Bếp (Kitchen)</option>
                  <option value="cashier">Thu ngân (Cashier)</option>
                  <option value="manager">Quản lý (Manager)</option>
                  {selectedUser?.role === 'owner' && <option value="owner">Chủ nhà hàng (Owner)</option>}
                </select>
                {selectedUser?.role === 'owner' && (
                  <p className="text-xs text-amber-600 mt-1">Không thể thay đổi role Owner</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete User</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirmUser.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
