'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/types';

type ModalMode = 'create' | 'edit' | null;

export default function UsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isOwner = user?.role === 'owner';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
        setError('');
      } else {
        setError(data.error || 'Lấy danh sách người dùng thất bại');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
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

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('Tạo người dùng thành công!');
          fetchUsers();
          closeModal();
        } else {
          setFormError(data.error || 'Tạo người dùng thất bại');
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

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('Cập nhật người dùng thành công!');
          fetchUsers();
          closeModal();
        } else {
          setFormError(data.error || 'Cập nhật người dùng thất bại');
        }
      }
    } catch {
      setFormError('Lỗi mạng. Vui lòng thử lại.');
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

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Xóa người dùng thành công!');
        fetchUsers();
      } else {
        setError(data.error || 'Xóa người dùng thất bại');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
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

  if (authLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isOwner) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
        ⚠️ Chỉ chủ sở hữu mới có thể quản lý người dùng.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Người dùng</h1>
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
            + Thêm người dùng
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
          <p className="text-gray-500">Đang tải...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-gray-500">Chưa có người dùng nào</p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Tạo người dùng đầu tiên
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
                  Vai trò
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
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
                        Sửa
                      </button>
                      {user.role !== 'owner' && (
                        <button
                          onClick={() => setDeleteConfirmUser(user)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Xóa
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
          <p className="text-sm text-gray-500">Tổng người dùng</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Quản lý</p>
          <p className="text-2xl font-bold text-blue-600">
            {users.filter(u => u.role === 'manager').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Thu ngân</p>
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
              {modalMode === 'create' ? 'Tạo người dùng mới' : 'Sửa người dùng'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên
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
                  Mật khẩu {modalMode === 'edit' && <span className="text-gray-400">(để trống nếu không đổi)</span>}
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
                  Vai trò
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
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo' : 'Lưu thay đổi'}
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">Xóa người dùng</h2>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa <strong>{deleteConfirmUser.name}</strong>? Thao tác này không thể hoàn tác.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
