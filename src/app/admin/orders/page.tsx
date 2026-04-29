'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { formatOrderNumber, formatCurrency } from '@/lib/utils';
import { OrderStatus, PaymentStatus, Order, OrderItem } from '@/types';

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  served: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  ready: 'Sẵn sàng',
  served: 'Đã phục vụ',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  unpaid: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kitchen'>('list');

  // Role-based permissions
  const userRole = user?.role || 'cashier';
  const isKitchen = userRole === 'kitchen';
  const isWaiter = userRole === 'waiter';
  const isCashier = userRole === 'cashier';
  const isManager = userRole === 'manager';
  const isOwner = userRole === 'owner';

  // Quyền thao tác theo role
  // Owner/Manager: Tất cả
  // Waiter: Xác nhận (pending → confirmed), Phục vụ (ready → served)
  // Kitchen: Chuẩn bị (confirmed → preparing → ready)
  // Cashier: Thanh toán (served → completed + paid)
  const canConfirmOrder = isOwner || isManager || isWaiter;
  const canPrepareOrder = isOwner || isManager || isKitchen;
  const canServeOrder = isOwner || isManager || isWaiter;
  const canCompletePayment = isOwner || isManager || isCashier;

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      // Thu Ngân chỉ thấy đơn cần thanh toán (đã phục vụ, chưa thanh toán)
      if (isCashier) {
        params.append('status', 'served');
        params.append('paymentStatus', 'unpaid');
      } else {
        if (filterStatus !== 'all') params.append('status', filterStatus);
        if (filterPayment !== 'all') params.append('paymentStatus', filterPayment);
      }
      
      const response = await fetch(`/api/orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        setError('Không thể tải danh sách đơn hàng');
      }
    } catch {
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPayment, isCashier]);

  useEffect(() => {
    fetchOrders();
    // Auto refresh every 30 seconds for kitchen view
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
        setSelectedOrder(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Không thể cập nhật trạng thái');
      }
    } catch {
      setError('Lỗi kết nối');
    }
  };

  const updatePaymentStatus = async (orderId: string, newStatus: PaymentStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
        setSelectedOrder(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Không thể cập nhật thanh toán');
      }
    } catch {
      setError('Lỗi kết nối');
    }
  };

  // Xác nhận các món mới thêm vào order
  const handleConfirmNewItems = async (orderId: string) => {
    if (!canConfirmOrder) {
      setError('Không có quyền xác nhận món gọi thêm');
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmItems: true }),
      });

      if (response.ok) {
        const data = await response.json();
        // Cập nhật order trong state
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: data.order.items } : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, items: data.order.items } : null);
        }
        setSuccessMsg('✅ Đã xác nhận món mới!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Không thể xác nhận món');
      }
    } catch {
      setError('Lỗi kết nối');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa đơn hàng này?')) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccessMsg('✅ Xóa đơn hàng thành công!');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchOrders();
        setSelectedOrder(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Không thể xóa đơn hàng');
      }
    } catch {
      setError('Lỗi kết nối');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Kitchen View - Card layout for easy status updates
  const renderKitchenView = () => {
    const activeOrders = orders.filter(o => 
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
    );

    const groupedOrders = {
      // 'pending' orders that have pending_confirm items = customer added more after being served
      pending: activeOrders.filter(o => o.status === 'pending' && o.items.some(i => i.status === 'pending_confirm')),
      confirmed: activeOrders.filter(o => o.status === 'confirmed'),
      preparing: activeOrders.filter(o => o.status === 'preparing'),
      ready: activeOrders.filter(o => o.status === 'ready'),
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Pending new items column - orders reset from 'served' when customer adds more */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
            Gọi thêm món ({groupedOrders.pending.length})
          </h3>
          <div className="space-y-4">
            {groupedOrders.pending.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-400">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-lg">#{formatOrderNumber(order.orderNumber)}</span>
                    {order.table && (
                      <span className="ml-2 text-sm text-gray-600">Bàn {order.table.number}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                </div>
                <div className="space-y-1 mb-3">
                  {order.items.filter(i => i.status === 'pending_confirm').map(item => (
                    <div key={item.id} className="flex justify-between text-sm bg-yellow-50 px-2 py-1 rounded">
                      <span>
                        <span className="font-medium">{item.quantity}x</span> {item.menuItem.name}
                        <span className="ml-1 text-yellow-600 text-xs">★ Mới</span>
                      </span>
                    </div>
                  ))}
                </div>
                {canConfirmOrder ? (
                  <button
                    onClick={() => handleConfirmNewItems(order.id)}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    ✅ Xác nhận món mới
                  </button>
                ) : (
                  <div className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg font-medium text-center text-sm">
                    Chỉ quản lý/chủ quán/phục vụ được xác nhận
                  </div>
                )}
              </div>
            ))}
            {groupedOrders.pending.length === 0 && (
              <p className="text-center text-yellow-600 py-4 text-sm">Không có món gọi thêm</p>
            )}
          </div>
        </div>

        {/* Confirmed Column */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
            Đã xác nhận ({groupedOrders.confirmed.length})
          </h3>
          <div className="space-y-4">
            {groupedOrders.confirmed.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-bold text-lg">#{formatOrderNumber(order.orderNumber)}</span>
                    {order.table && (
                      <span className="ml-2 text-sm text-gray-600">
                        Bàn {order.table.number}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        <span className="font-medium">{item.quantity}x</span> {item.menuItem.name}
                      </span>
                      {item.notes && (
                        <span className="text-orange-600 text-xs">📝 {item.notes}</span>
                      )}
                    </div>
                  ))}
                </div>
                {order.notes && (
                  <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded mb-3">
                    📝 {order.notes}
                  </div>
                )}
                <button
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  🍳 Bắt đầu nấu
                </button>
              </div>
            ))}
            {groupedOrders.confirmed.length === 0 && (
              <p className="text-center text-blue-600 py-4">Không có đơn mới</p>
            )}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="bg-orange-50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
            Đang nấu ({groupedOrders.preparing.length})
          </h3>
          <div className="space-y-4">
            {groupedOrders.preparing.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-bold text-lg">#{formatOrderNumber(order.orderNumber)}</span>
                    {order.table && (
                      <span className="ml-2 text-sm text-gray-600">
                        Bàn {order.table.number}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        <span className="font-medium">{item.quantity}x</span> {item.menuItem.name}
                      </span>
                      {item.notes && (
                        <span className="text-orange-600 text-xs">📝 {item.notes}</span>
                      )}
                    </div>
                  ))}
                </div>
                {order.notes && (
                  <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded mb-3">
                    📝 {order.notes}
                  </div>
                )}
                <button
                  onClick={() => updateOrderStatus(order.id, 'ready')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  ✅ Hoàn thành
                </button>
              </div>
            ))}
            {groupedOrders.preparing.length === 0 && (
              <p className="text-center text-orange-600 py-4">Không có món đang nấu</p>
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            Sẵn sàng phục vụ ({groupedOrders.ready.length})
          </h3>
          <div className="space-y-4">
            {groupedOrders.ready.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-bold text-lg">#{formatOrderNumber(order.orderNumber)}</span>
                    {order.table && (
                      <span className="ml-2 text-sm text-gray-600">
                        Bàn {order.table.number}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className="space-y-2">
                  {order.items.map(item => (
                    <div key={item.id} className="text-sm">
                      <span className="font-medium">{item.quantity}x</span> {item.menuItem.name}
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-green-100 rounded-lg text-center">
                  <span className="text-green-800 font-medium">🔔 Chờ phục vụ</span>
                </div>
              </div>
            ))}
            {groupedOrders.ready.length === 0 && (
              <p className="text-center text-green-600 py-4">Không có món sẵn sàng</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Cashier View - Card layout for quick payment
  const renderCashierView = () => {
    const pendingPaymentOrders = orders.filter(o => 
      o.status === 'served' && o.paymentStatus === 'unpaid'
    );

    const handlePayment = async (orderId: string, method: string) => {
      try {
        // Update payment status và order status
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            paymentStatus: 'paid',
            paymentMethod: method,
            status: 'completed'
          }),
        });

        if (response.ok) {
          fetchOrders();
          setSelectedOrder(null);
        } else {
          const data = await response.json();
          setError(data.error || 'Không thể xử lý thanh toán');
        }
      } catch {
        setError('Lỗi kết nối');
      }
    };

    if (pendingPaymentOrders.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Không có đơn chờ thanh toán</h3>
          <p className="text-gray-500">Tất cả đơn hàng đã được thanh toán</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingPaymentOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-orange-200">
            {/* Header */}
            <div className="bg-orange-500 text-white p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-2xl font-bold">#{formatOrderNumber(order.orderNumber)}</span>
                  {order.table && (
                    <span className="ml-3 bg-white/20 px-2 py-1 rounded text-sm">
                      Bàn {order.table.number}
                    </span>
                  )}
                </div>
                <div className="text-right text-sm opacity-90">
                  {formatDate(order.createdAt)}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="p-4 border-b max-h-48 overflow-y-auto">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{item.quantity}x</span> {item.menuItem.name}
                  </span>
                  <span className="text-gray-600">{formatCurrency(item.quantity * (item.price || item.unitPrice))}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="p-4 bg-gray-50">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Tạm tính</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Thuế</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Tổng cộng</span>
                <span className="text-orange-600">{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="p-4 bg-gray-100 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handlePayment(order.id, 'cash')}
                  className="py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  💵 Tiền mặt
                </button>
                <button
                  onClick={() => handlePayment(order.id, 'card')}
                  className="py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  💳 Thẻ
                </button>
                <button
                  onClick={() => handlePayment(order.id, 'mobile')}
                  className="py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  📱 Ví điện tử
                </button>
              </div>
              <button
                onClick={() => setSelectedOrder(order)}
                className="w-full py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors text-gray-600"
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // List View - Table layout for management
  const renderListView = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Đơn hàng
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bàn / Khách
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Món
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tổng tiền
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trạng thái
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thanh toán
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thời gian
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-medium">#{formatOrderNumber(order.orderNumber)}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm">
                  {order.table && (
                    <div className="font-medium">Bàn {order.table.number}</div>
                  )}
                  {order.customer && (
                    <div className="text-gray-500">{order.customer.name}</div>
                  )}
                  {!order.table && !order.customer && (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx}>
                      {item.quantity}x {item.menuItem.name}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <span className="text-gray-500">
                      +{order.items.length - 2} món khác
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-medium">{formatCurrency(order.total)}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${paymentStatusColors[order.paymentStatus || 'unpaid']}`}>
                  {paymentStatusLabels[order.paymentStatus || 'unpaid']}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(order.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="text-primary-600 hover:text-primary-900"
                >
                  Chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Không có đơn hàng nào</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isKitchen ? '👨‍🍳 Bếp - Quản lý Order' : 
             isCashier ? '� Thu Ngân - Thanh toán' :
             '�📋 Quản lý Đơn hàng'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isKitchen 
              ? 'Cập nhật trạng thái món ăn'
              : isCashier
              ? 'Các đơn hàng chờ thanh toán'
              : 'Theo dõi và quản lý tất cả đơn hàng'
            }
          </p>
        </div>

        {/* View Toggle & Filters */}
        <div className="flex flex-wrap gap-3">
          {!isKitchen && !isCashier && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 Danh sách
              </button>
              <button
                onClick={() => setViewMode('kitchen')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'kitchen' ? 'bg-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👨‍🍳 Bếp
              </button>
            </div>
          )}
          
          {/* Nút làm mới cho Thu Ngân */}
          {isCashier && (
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              🔄 Làm mới
            </button>
          )}
        </div>
      </div>

      {/* Filters - Ẩn với Thu Ngân */}
      {viewMode === 'list' && !isKitchen && !isCashier && (
        <div className="flex flex-wrap gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Tất cả thanh toán</option>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <button
            onClick={fetchOrders}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄 Làm mới
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError('')}
            className="float-right text-red-700 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMsg}
          <button
            onClick={() => setSuccessMsg('')}
            className="float-right text-green-700 hover:text-green-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      {isCashier 
        ? renderCashierView()
        : isKitchen || viewMode === 'kitchen' 
          ? renderKitchenView() 
          : renderListView()
      }

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">Đơn hàng #{formatOrderNumber(selectedOrder.orderNumber)}</h2>
                  <p className="text-gray-500 text-sm">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Bàn</p>
                  <p className="font-medium">
                    {selectedOrder.table ? `Bàn ${selectedOrder.table.number}` : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Khách hàng</p>
                  <p className="font-medium">
                    {selectedOrder.customer?.name || '-'}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="border rounded-lg overflow-hidden mb-6">
                <div className="bg-gray-50 px-4 py-2 font-medium flex justify-between items-center">
                  <span>Danh sách món</span>
                  {selectedOrder.items.some(item => item.status === 'pending_confirm') && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      ⏳ Có món chờ xác nhận
                    </span>
                  )}
                </div>
                <div className="divide-y">
                  {selectedOrder.items.map((item) => (
                    <div 
                      key={item.id} 
                      className={`px-4 py-3 flex justify-between items-center ${
                        item.status === 'pending_confirm' ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.menuItem?.image && (
                          <img
                            src={item.menuItem.image}
                            alt={item.menuItem?.name || item.menuItemName}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.menuItem?.name || item.menuItemName}</p>
                            {item.status === 'pending_confirm' && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                Mới
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">x{item.quantity}</p>
                          {item.notes && (
                            <p className="text-sm text-orange-600">📝 {item.notes}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Nút xác nhận món mới */}
                {selectedOrder.items.some(item => item.status === 'pending_confirm') && (
                  <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          ⏳ {selectedOrder.items.filter(item => item.status === 'pending_confirm').length} món mới cần xác nhận
                        </p>
                        <p className="text-xs text-yellow-600">Khách hàng đã gọi thêm món qua QR</p>
                      </div>
                      {canConfirmOrder ? (
                        <button
                          onClick={() => handleConfirmNewItems(selectedOrder.id)}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                        >
                          ✅ Xác nhận tất cả
                        </button>
                      ) : (
                        <span className="text-xs text-yellow-700 font-medium">
                          Chỉ quản lý/chủ quán/phục vụ được xác nhận
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Totals */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tạm tính</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thuế</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                {(selectedOrder.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá</span>
                    <span>-{formatCurrency(selectedOrder.discount ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Tổng cộng</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                  <p className="text-sm font-medium text-yellow-800">Ghi chú:</p>
                  <p className="text-yellow-700">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Status Update - Phân quyền theo role */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái đơn hàng
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {/* Waiter: Xác nhận (pending → confirmed) */}
                    {selectedOrder.status === 'pending' && canConfirmOrder && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                      >
                        ✓ Xác nhận đơn
                      </button>
                    )}

                    {/* Kitchen: Bắt đầu chuẩn bị (confirmed → preparing) */}
                    {selectedOrder.status === 'confirmed' && canPrepareOrder && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
                      >
                        🍳 Bắt đầu chuẩn bị
                      </button>
                    )}

                    {/* Kitchen: Hoàn thành chuẩn bị (preparing → ready) */}
                    {selectedOrder.status === 'preparing' && canPrepareOrder && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                      >
                        ✅ Sẵn sàng phục vụ
                      </button>
                    )}

                    {/* Waiter: Phục vụ (ready → served) */}
                    {selectedOrder.status === 'ready' && canServeOrder && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'served')}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
                      >
                        🍽️ Đã phục vụ
                      </button>
                    )}

                    {/* Cashier: Hoàn thành (served + paid → completed) */}
                    {selectedOrder.status === 'served' && selectedOrder.paymentStatus === 'paid' && canCompletePayment && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                      >
                        🎉 Hoàn thành đơn
                      </button>
                    )}

                    {/* Owner/Manager: Hủy đơn (chỉ khi chưa hoàn thành) */}
                    {!['completed', 'cancelled'].includes(selectedOrder.status) && (isOwner || isManager) && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                      >
                        ✕ Hủy đơn
                      </button>
                    )}

                    {/* Hiển thị trạng thái hiện tại */}
                    <span className={`px-4 py-2 rounded-lg font-medium ${statusColors[selectedOrder.status]}`}>
                      {statusLabels[selectedOrder.status]}
                    </span>
                  </div>
                </div>

                {/* Thanh toán - Chỉ Cashier/Manager/Owner */}
                {canCompletePayment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thanh toán
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.paymentStatus === 'unpaid' && selectedOrder.status === 'served' && (
                        <button
                          onClick={() => updatePaymentStatus(selectedOrder.id, 'paid')}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                        >
                          💰 Xác nhận thanh toán
                        </button>
                      )}
                      {selectedOrder.paymentStatus === 'paid' && (isOwner || isManager) && (
                        <button
                          onClick={() => updatePaymentStatus(selectedOrder.id, 'refunded')}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                        >
                          ↩️ Hoàn tiền
                        </button>
                      )}
                      <span className={`px-4 py-2 rounded-lg font-medium ${paymentStatusColors[selectedOrder.paymentStatus || 'unpaid']}`}>
                        {paymentStatusLabels[selectedOrder.paymentStatus || 'unpaid']}
                      </span>
                    </div>
                    {selectedOrder.paymentStatus === 'unpaid' && selectedOrder.status !== 'served' && (
                      <p className="text-sm text-gray-500 mt-2">
                        ⏳ Đơn hàng cần được phục vụ trước khi thanh toán
                      </p>
                    )}
                  </div>
                )}

                {/* Hiển thị thông báo cho các role không có quyền */}
                {!canCompletePayment && (
                  <div className="bg-gray-100 p-3 rounded-lg text-gray-600 text-sm">
                    💡 Chỉ Thu ngân hoặc Quản lý mới có thể xử lý thanh toán
                  </div>
                )}

                {/* Delete Order - Chỉ Owner/Manager */}
                {(isOwner || isManager) && (
                  <div className="border-t pt-4 mt-4">
                    <button
                      onClick={() => deleteOrder(selectedOrder.id)}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                    >
                      🗑️ Xóa đơn hàng
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
