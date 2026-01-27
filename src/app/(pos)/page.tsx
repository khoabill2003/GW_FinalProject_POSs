'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency, formatOrderNumber } from '@/lib/utils';
import ReceiptModal from '@/components/pos/ReceiptModal';
import RestaurantInfo from '@/components/ui/RestaurantInfo';

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: {
    id: string;
    name: string;
  };
  categoryId: string;
  available: boolean;
  menuType: string;
}

interface Table {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: string;
  zone?: string | { id: string; name: string };
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  table?: {
    id: string;
    number: number;
    zone?: string | { id: string; name: string };
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    status?: string;
    menuItem: {
      id: string;
      name: string;
      image?: string;
    };
  }[];
}

// Helper function to get zone name safely
const getZoneName = (zone?: string | { id: string; name: string }): string => {
  if (!zone) return '';
  return typeof zone === 'string' ? zone : zone?.name || '';
};

export default function POSPage() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { state, addItem, removeItem, updateQuantity, clearCart, setTaxRate } = useCart();
  const router = useRouter();

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurant, setRestaurant] = useState<{
    name: string;
    address?: string;
    phone?: string;
    image?: string;
    taxRate?: number;
  } | null>(null);

  // Selection states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderNotes, setOrderNotes] = useState('');

  // UI states
  const [showTableModal, setShowTableModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(null);
  const [paidOrder, setPaidOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [activeTab, setActiveTab] = useState<'taking' | 'management'>('taking');

  // New customer form
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [catRes, menuRes, tableRes, custRes, orderRes, restRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/menu'),
        fetch('/api/tables'),
        fetch('/api/customers'),
        fetch('/api/orders'),
        fetch('/api/restaurants/settings'),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        // Ensure categories is always an array
        if (Array.isArray(catData.categories)) {
          setCategories(catData.categories);
        } else if (Array.isArray(catData)) {
          setCategories(catData);
        } else {
          setCategories([]);
        }
      }
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (Array.isArray(menuData.menuItems)) {
          setMenuItems(menuData.menuItems);
        } else if (Array.isArray(menuData)) {
          setMenuItems(menuData);
        } else {
          setMenuItems([]);
        }
      }
      if (tableRes.ok) {
        const tableData = await tableRes.json();
        if (Array.isArray(tableData.tables)) {
          setTables(tableData.tables);
        } else if (Array.isArray(tableData)) {
          setTables(tableData);
        } else {
          setTables([]);
        }
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        if (Array.isArray(custData.customers)) {
          setCustomers(custData.customers);
        } else if (Array.isArray(custData)) {
          setCustomers(custData);
        } else {
          setCustomers([]);
        }
      }
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        if (Array.isArray(orderData.orders)) {
          setOrders(orderData.orders);
        } else if (Array.isArray(orderData)) {
          setOrders(orderData);
        } else {
          setOrders([]);
        }
      }
      if (restRes.ok) {
        const restData = await restRes.json();
        setRestaurant({
          name: restData.restaurantName || 'Nhà hàng',
          address: restData.mainBranch?.address,
          phone: restData.mainBranch?.phone,
          image: restData.mainBranch?.image,
          taxRate: restData.taxRate || 8.0,
        });
        // Set tax rate from restaurant settings
        if (restData.taxRate) {
          setTaxRate(restData.taxRate);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, [setTaxRate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, isLoading, router, fetchData]);

  // Auto-refresh tax rate and customer data every 30 seconds to catch any updates from admin
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        // Fetch latest restaurant settings for tax rate
        const restRes = await fetch('/api/restaurants/settings');
        if (restRes.ok) {
          const restData = await restRes.json();
          if (restData.taxRate) {
            setTaxRate(restData.taxRate);
          }
        }

        // Fetch latest customers for order count updates
        const custRes = await fetch('/api/customers');
        if (custRes.ok) {
          const custData = await custRes.json();
          if (Array.isArray(custData.customers)) {
            setCustomers(custData.customers);
          } else if (Array.isArray(custData)) {
            setCustomers(custData);
          }
        }
      } catch (error) {
        console.error('Failed to auto-refresh data:', error);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, setTaxRate]);

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    if (!item.available) return false;
    if (selectedCategory && item.categoryId !== selectedCategory) return false;
    return true;
  });

  // Filter customers by search
  const filteredCustomers = customers.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchCustomer.toLowerCase()) ||
    c.phone?.includes(searchCustomer)
  );

  // Handle add to cart
  const handleAddItem = (item: MenuItem) => {
    addItem(item as any);
  };

  // Handle checkout - Luôn tạo đơn chưa thanh toán
  const handleCheckout = async () => {
    if (state.items.length === 0) return;
    if (!selectedTable) {
      alert('⚠️ Vui lòng chọn bàn trước khi tạo đơn');
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = {
        items: state.items.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          price: item.menuItem.price,
          notes: '',
        })),
        tableId: selectedTable.id,
        customerId: selectedCustomer?.id,
        notes: orderNotes,
        subtotal: state.subtotal,
        tax: state.tax,
        discount: 0,
        total: state.total,
        paymentStatus: 'unpaid',
        paymentMethod: null,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const data = await response.json();
        const order = data.order;
        alert(`✅ Tạo đơn thành công!\n\nMã đơn: #${formatOrderNumber(order.orderNumber)}\nBàn: ${selectedTable.number}\nTổng tiền: ${formatCurrency(state.total)}\n\n⏳ Đơn đang chờ xác nhận`);
        clearCart();
        setSelectedTable(null);
        setSelectedCustomer(null);
        setOrderNotes('');
        setShowCheckoutModal(false);
        fetchData(); // Refresh tables
      } else {
        const error = await response.json();
        alert(`❌ Lỗi: ${error.error}`);
      }
    } catch {
      alert('❌ Không thể tạo đơn hàng');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create new customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name) return;

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });

      if (response.ok) {
        const customer = await response.json();
        setCustomers(prev => [...prev, customer]);
        setSelectedCustomer(customer);
        setNewCustomer({ name: '', phone: '', email: '' });
        setShowCustomerModal(false);
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Handle payment for cashier
  const handlePayment = async (orderId: string, paymentMethod: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      if (paymentMethod === 'vnpay') {
        // VNPay redirect payment
        const response = await fetch('/api/payments/vnpay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            orderNumber: order.orderNumber,
            amount: order.total,
            customerName: order.customer?.name,
            customerPhone: order.customer?.phone,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Store order ID in sessionStorage to process after return
          sessionStorage.setItem('vnpay_order_id', orderId);
          sessionStorage.setItem('vnpay_payment_method', paymentMethod);
          // Redirect to VNPay
          window.location.href = data.paymentUrl;
        } else {
          const error = await response.json();
          alert(`❌ Lỗi: ${error.error || 'Không thể tạo yêu cầu thanh toán'}`);
        }
        return;
      }

      // Cash payment - direct process
      const payResponse = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: paymentMethod,
          status: 'ready' // Keep as 'ready' until receipt is closed
        }),
      });

      if (payResponse.ok) {
        const result = await payResponse.json();
        const paidOrderData = result.order;
        
        // Store paid order and show receipt modal
        setPaidOrder(paidOrderData);
        setShowReceiptModal(true);
        setShowCheckoutModal(false);

        // Refresh orders
        fetchData();
      } else {
        const error = await payResponse.json();
        alert(`❌ Lỗi: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to process payment:', error);
      alert('❌ Không thể xử lý thanh toán');
    }
  };

  // Handle order status update for waiter
  const handleOrderStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        alert(`✅ Cập nhật trạng thái đơn hàng thành công!`);
        fetchData(); // Refresh orders
      } else {
        const error = await response.json();
        alert(`❌ Lỗi: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('❌ Không thể cập nhật trạng thái đơn hàng');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Determine UI mode based on role
  const isCashier = user?.role === 'cashier';
  const isWaiter = user?.role === 'waiter';
  const isKitchen = user?.role === 'kitchen';
  const isOwnerOrManager = ['owner', 'manager'].includes(user?.role || '');

  // Filter orders based on role
  const cashierOrders = orders.filter(order => 
    order.paymentStatus === 'unpaid' && 
    (order.status === 'ready' || order.status === 'completed')
  );
  const waiterOrders = orders.filter(order => ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status));
  const kitchenOrders = orders.filter(order => ['pending', 'confirmed', 'preparing'].includes(order.status));

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-primary-600 text-white h-16 flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">🍽️ Restaurant POS</h1>

          {/* Display current table selection - Only for waiter and owner/manager */}
          {!isCashier && !isKitchen && selectedTable && (
            <span className="px-4 py-2 rounded-lg bg-green-500 text-white flex items-center gap-2">
              🪑 Bàn {selectedTable.number}
            </span>
          )}

          {/* Role-specific indicators */}
          {isCashier && (
            <span className="text-sm bg-primary-700 px-3 py-1 rounded-full">
              💰 {cashierOrders.length} đơn chờ thanh toán
            </span>
          )}
          {isWaiter && (
            <span className="text-sm bg-primary-700 px-3 py-1 rounded-full">
              🍽️ {waiterOrders.length} đơn cần xử lý
            </span>
          )}
          {isKitchen && (
            <span className="text-sm bg-primary-700 px-3 py-1 rounded-full">
              👨‍🍳 {kitchenOrders.length} đơn cần chuẩn bị
            </span>
          )}
        </div>

        <nav className="flex items-center gap-4">
          {/* Admin Panel - Only for owner and manager */}
          {isOwnerOrManager && (
            <a
              href="/admin"
              className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 transition-colors"
            >
              Admin Panel
            </a>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-800 flex items-center justify-center">
              👤
            </div>
            <div className="text-sm">
              <p className="font-medium">{user?.name || 'User'}</p>
              <p className="text-primary-200 text-xs capitalize">{user?.role || 'Cashier'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm bg-primary-800 hover:bg-primary-900 rounded-lg transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Right side - Order Management (waiter) or Cart (owner/manager) */}
        {!isCashier && (
          <div className="w-96 bg-white shadow-lg flex flex-col order-2 flex-shrink-0">
            {isWaiter ? (
              
              <>
                {/* Tabs for Waiter */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('taking')}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                      activeTab === 'taking'
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    📝 Tạo đơn hàng
                  </button>
                  <button
                    onClick={() => setActiveTab('management')}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                      activeTab === 'management'
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    📋 Quản lý ({waiterOrders.length})
                  </button>
                </div>

                {activeTab === 'taking' ? (
                  /* Cart for creating orders */
                  <>
                    {/* Cart Header */}
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Đơn hàng hiện tại</h2>
                        {state.items.length > 0 && (
                          <button
                            onClick={clearCart}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            Xóa tất cả
                          </button>
                        )}
                      </div>
                      {(selectedTable || selectedCustomer) && (
                        <div className="flex gap-2 mt-2 text-sm">
                          {selectedTable && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                              🪑 Bàn {selectedTable.number}
                            </span>
                          )}
                          {selectedCustomer && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              👤 {selectedCustomer.name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {state.items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <span className="text-5xl mb-4">🛒</span>
                          <p>Chưa có món nào</p>
                          <p className="text-sm">Chọn món từ thực đơn</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {state.items.map((item) => (
                            <div
                              key={item.menuItem.id}
                              className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                            >
                              <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                {item.menuItem.image ? (
                                  <img
                                    src={item.menuItem.image}
                                    alt={item.menuItem.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">🍽️</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">{item.menuItem.name}</h4>
                                <p className="text-sm text-primary-600">{formatCurrency(item.menuItem.price)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(item.menuItem.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cart Summary */}
                    <div className="border-t border-gray-200 p-4 space-y-3">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Tạm tính</span>
                        <span>{formatCurrency(state.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Thuế ({(state.taxRate * 100).toFixed(1)}%)</span>
                        <span>{formatCurrency(state.tax)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                        <span>Tổng cộng</span>
                        <span>{formatCurrency(state.total)}</span>
                      </div>

                      <button
                        onClick={() => setShowCheckoutModal(true)}
                        disabled={state.items.length === 0}
                        className="w-full py-4 bg-secondary-500 text-white font-semibold rounded-xl hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        💳 Tạo đơn hàng {formatCurrency(state.total)}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Order Management */
                  <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-lg font-semibold mb-4">📋 Quản lý đơn hàng</h3>

                    {waiterOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <span className="text-4xl mb-4">📋</span>
                        <p>Không có đơn hàng nào</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {waiterOrders.map((order) => (
                          <div key={order.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">#{formatOrderNumber(order.orderNumber)}</h4>
                                <p className="text-sm text-gray-600">
                                  Bàn {order.table ? order.table.number : '---'} {order.table && getZoneName(order.table.zone) ? `· ${getZoneName(order.table.zone)}` : ''}
                                </p>
                              </div>
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                                order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status === 'pending' ? 'Chờ xác nhận' :
                                 order.status === 'confirmed' ? 'Đã xác nhận' :
                                 order.status === 'preparing' ? 'Đang chuẩn bị' :
                                 order.status === 'ready' ? 'Sẵn sàng' :
                                 order.status}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleOrderStatusUpdate(order.id, 'confirmed')}
                                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                >
                                  ✅ Xác nhận
                                </button>
                              )}
                              {order.status === 'confirmed' && (
                                <button
                                  onClick={() => handleOrderStatusUpdate(order.id, 'preparing')}
                                  className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                                >
                                  👨‍🍳 Chuẩn bị
                                </button>
                              )}
                              {order.status === 'preparing' && (
                                <button
                                  onClick={() => handleOrderStatusUpdate(order.id, 'ready')}
                                  className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                                >
                                  ✅ Sẵn sàng
                                </button>
                              )}
                              {order.status === 'ready' && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                  ⏳ Chờ thanh toán
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Owner/Manager View - Cart */
              <>
                {/* Cart Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Đơn hàng hiện tại</h2>
                    {state.items.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>
                  {(selectedTable || selectedCustomer) && (
                    <div className="flex gap-2 mt-2 text-sm">
                      {selectedTable && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                          🪑 Bàn {selectedTable.number}
                        </span>
                      )}
                      {selectedCustomer && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          👤 {selectedCustomer.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                  {state.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <span className="text-5xl mb-4">🛒</span>
                      <p>Chưa có món nào</p>
                      <p className="text-sm">Chọn món từ thực đơn</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {state.items.map((item) => (
                        <div
                          key={item.menuItem.id}
                          className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                        >
                          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {item.menuItem.image ? (
                              <img
                                src={item.menuItem.image}
                                alt={item.menuItem.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">🍽️</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{item.menuItem.name}</h4>
                            <p className="text-sm text-primary-600">{formatCurrency(item.menuItem.price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.menuItem.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Summary */}
                <div className="border-t border-gray-200 p-4 space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tạm tính</span>
                    <span>{formatCurrency(state.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Thuế ({(state.taxRate * 100).toFixed(1)}%)</span>
                    <span>{formatCurrency(state.tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(state.total)}</span>
                  </div>

                  <button
                    onClick={() => setShowCheckoutModal(true)}
                    disabled={state.items.length === 0 || !selectedTable}
                    className="w-full py-4 bg-secondary-500 text-white font-semibold rounded-xl hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📋 Tạo đơn hàng {formatCurrency(state.total)}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Left side - Tables/Menu/Orders */}
        <div className={`flex flex-col overflow-hidden ${isCashier || isKitchen ? 'w-full' : 'flex-1'} order-1`}>
          {isCashier || isKitchen ? (
            /* Cashier/Kitchen View - Orders */
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-6">{isCashier ? '💰 Đơn hàng chờ thanh toán' : '👨‍🍳 Đơn hàng cần chuẩn bị'}</h2>

              {(isCashier ? cashierOrders : kitchenOrders).length === 0 ? (
                <div className="bg-white rounded-lg p-12 shadow-sm">
                  <div className="text-center">
                    <span className="text-6xl mb-4 block">{isCashier ? '💰' : '👨‍🍳'}</span>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">{isCashier ? 'Không có đơn hàng nào chờ thanh toán' : 'Không có đơn hàng nào cần chuẩn bị'}</h3>
                    <p className="text-gray-500">{isCashier ? 'Các đơn hàng đã sẵn sàng sẽ xuất hiện ở đây' : 'Các đơn hàng mới sẽ xuất hiện ở đây'}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {(isCashier ? cashierOrders : kitchenOrders).map((order) => (
                    <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">#{formatOrderNumber(order.orderNumber)}</h3>
                          <p className="text-sm text-gray-600">
                            {order.table ? `Bàn ${order.table.number} ${getZoneName(order.table.zone) ? `· ${getZoneName(order.table.zone)}` : ''}` : 'Mang về'}
                          </p>
                          {order.customer && (
                            <p className="text-sm text-gray-600">👤 {order.customer.name}</p>
                          )}
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary-600">{formatCurrency(order.total)}</p>
                          <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Chờ thanh toán
                          </span>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Chi tiết đơn hàng:</h4>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div 
                              key={item.id} 
                              className={`flex justify-between text-sm ${item.status === 'pending_confirm' ? 'bg-yellow-100 px-2 py-1 rounded' : ''}`}
                            >
                              <span>
                                {item.quantity}x {item.menuItem.name}
                                {item.status === 'pending_confirm' && (
                                  <span className="ml-2 text-xs text-yellow-700 font-medium">
                                    ⏳ Chờ xác nhận
                                  </span>
                                )}
                              </span>
                              <span>{formatCurrency(item.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                        {/* Nút xác nhận món mới nếu có món pending */}
                        {order.items.some(item => item.status === 'pending_confirm') && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/orders/${order.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ confirmItems: true }),
                                });
                                if (res.ok) {
                                  fetchData();
                                }
                              } catch (error) {
                                console.error('Error confirming items:', error);
                              }
                            }}
                            className="mt-3 w-full bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                          >
                            ✅ Xác nhận {order.items.filter(item => item.status === 'pending_confirm').length} món mới gọi thêm
                          </button>
                        )}
                      </div>

                      {/* Payment/Kitchen Actions */}
                      <div className="flex flex-col gap-2">
                        {isCashier ? (
                          /* Payment Methods for Cashier */
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handlePayment(order.id, 'cash')}
                                className="bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                              >
                                💵 Tiền mặt
                              </button>
                              <button
                                onClick={() => handlePayment(order.id, 'vnpay')}
                                className="bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                💳 VNPay
                              </button>
                            </div>
                          </>
                        ) : (
                          /* Kitchen - Only confirm pending items & serve */
                          <>
                            {order.items.some(item => item.status === 'pending_confirm') && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/orders/${order.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ confirmItems: true }),
                                    });
                                    if (res.ok) {
                                      fetchData();
                                    }
                                  } catch (error) {
                                    console.error('Error confirming items:', error);
                                  }
                                }}
                                className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors font-medium mb-2"
                              >
                                ⏳ Xác nhận {order.items.filter(item => item.status === 'pending_confirm').length} món mới
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <button
                                onClick={() => handleOrderStatusUpdate(order.id, 'served')}
                                className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
                              >
                                ✅ Phục vụ xong
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Waiter View - Tables and Menu */
            <>
              {/* Show either Tables Grid or Menu Grid */}
              {!selectedTable ? (
                /* Tables Grid View */
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Restaurant Info */}
                  {restaurant && (
                    <div className="mb-8">
                      <RestaurantInfo
                        name={restaurant.name}
                        address={restaurant.address}
                        phone={restaurant.phone}
                        image={restaurant.image}
                      />
                    </div>
                  )}
                  <h2 className="text-2xl font-bold mb-6">🪑 Chọn bàn để đặt hàng</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {/* Mang về option */}
                    <button
                      onClick={() => {
                        const takeaway: Table = {
                          id: 'takeaway',
                          number: 0,
                          capacity: 0,
                          status: 'available',
                        };
                        setSelectedTable(takeaway);
                        setShowCustomerModal(true);
                      }}
                      className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all p-4 text-center text-white font-bold"
                    >
                      <div className="text-4xl mb-2">📦</div>
                      <h3 className="text-base">Mang về</h3>
                    </button>

                    {/* Tables */}
                    {tables.map((table) => {
                      const zoneName = getZoneName(table.zone);
                      const initials = zoneName
                        ? zoneName.substring(0, 2).toUpperCase()
                        : 'T' + table.number;
                      
                      const colors = [
                        'bg-blue-500',
                        'bg-yellow-500',
                        'bg-green-500',
                        'bg-red-500',
                        'bg-purple-500',
                        'bg-pink-500',
                        'bg-indigo-500',
                        'bg-cyan-500',
                      ];
                      const colorIndex = table.number % colors.length;
                      const bgColor = colors[colorIndex];

                      return (
                        <button
                          key={table.id}
                          onClick={() => {
                            if (table.status === 'available') {
                              setSelectedTable(table);
                              setShowCustomerModal(true);
                            }
                          }}
                          disabled={table.status !== 'available'}
                          className={`rounded-xl shadow-lg transition-all p-4 text-center ${
                            table.status === 'available'
                              ? 'bg-gray-900 hover:shadow-xl hover:scale-105 cursor-pointer border border-gray-800'
                              : 'bg-gray-800 opacity-50 cursor-not-allowed border border-gray-700'
                          }`}
                        >
                          {/* Header with table number and status */}
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-white text-sm">Bàn {table.number}</h3>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              table.status === 'available'
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}>
                              {table.status === 'available' ? '✓' : '✕'}
                            </span>
                          </div>

                          {/* Avatar */}
                          <div className={`${bgColor} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold text-lg shadow-md`}>
                            {initials}
                          </div>

                          {/* Seats */}
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Seats: {table.capacity}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Menu Grid View - after table selected */
                <>
                  {/* Go Back Button */}
                  <div className="bg-white shadow-sm border-b p-4">
                    <button
                      onClick={() => {
                        setSelectedTable(null);
                        clearCart();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      ← Quay lại
                    </button>
                  </div>

                  {/* Category Tabs */}
                  <div className="bg-white shadow-sm">
                    <div className="flex overflow-x-auto p-2 gap-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                          selectedCategory === null
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Tất cả
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                            selectedCategory === cat.id
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Menu Grid */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleAddItem(item)}
                          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-4 text-left group"
                        >
                          <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">
                                🍽️
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                          <p className="text-sm text-gray-500 truncate">{item.category.name}</p>
                          <p className="text-primary-600 font-bold mt-1">
                            {formatCurrency(item.price)}
                          </p>
                        </button>
                      ))}
                    </div>

                    {filteredItems.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <span className="text-5xl mb-4">🍽️</span>
                        <p>Không có món ăn nào</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Modals - Only for non-cashier and non-kitchen */}
        {!isCashier && !isKitchen && (
          <>
            {/* Table Selection Modal */}
            {showTableModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">🪑 Chọn bàn</h2>
                      <button
                        onClick={() => setShowTableModal(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      <button
                        onClick={() => {
                          setSelectedTable(null);
                          setShowTableModal(false);
                        }}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          !selectedTable
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">📦</div>
                        <p className="font-medium">Mang về</p>
                      </button>

                      {tables.map((table) => (
                        <div
                          key={table.id}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            selectedTable?.id === table.id
                              ? 'border-primary-500 bg-primary-50'
                              : table.status === 'available'
                              ? 'border-gray-200 hover:border-gray-300'
                              : 'border-gray-200 bg-gray-100 opacity-50'
                          }`}
                        >
                          <div className="text-2xl mb-2">
                            {table.status === 'available' ? '🪑' : '🔴'}
                          </div>
                          <p className="font-medium">Bàn {table.number}</p>
                          <p className="text-xs text-gray-500">
                            {table.capacity} người
                            {getZoneName(table.zone) && ` · ${getZoneName(table.zone)}`}
                          </p>
                          {table.status !== 'available' && (
                            <p className="text-xs text-red-500 mt-1">Đang sử dụng</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => {
                                if (table.status === 'available') {
                                  setSelectedTable(table);
                                  setShowTableModal(false);
                                }
                              }}
                              disabled={table.status !== 'available'}
                              className={`flex-1 px-3 py-1 rounded text-sm font-medium transition-colors ${
                                table.status === 'available'
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Chọn
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTableForQR(table);
                                setShowQRModal(true);
                              }}
                              className="px-3 py-1 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700"
                              title="Hiển thị mã QR cho bàn này"
                            >
                              🔗 QR
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Selection Modal */}
            {showCustomerModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">👤 Chọn khách hàng</h2>
                      <button
                        onClick={() => setShowCustomerModal(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Search */}
                    <input
                      type="text"
                      placeholder="Tìm theo tên hoặc SĐT..."
                      value={searchCustomer}
                      onChange={(e) => setSearchCustomer(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                    />

                    {/* Customer List */}
                    <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedCustomer(null);
                          setShowCustomerModal(false);
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          !selectedCustomer
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium">Khách vãng lai</p>
                      </button>

                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerModal(false);
                          }}
                          className={`w-full p-3 rounded-lg border text-left transition-colors ${
                            selectedCustomer?.id === customer.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-medium">{customer.name}</p>
                          {customer.phone && (
                            <p className="text-sm text-gray-500">{customer.phone}</p>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* New Customer Form */}
                    <div className="border-t pt-4">
                      <h3 className="font-medium mb-3">➕ Thêm khách hàng mới</h3>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Tên khách hàng *"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="tel"
                          placeholder="Số điện thoại"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          onClick={handleCreateCustomer}
                          disabled={!newCustomer.name}
                          className="w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                          Thêm khách hàng
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Checkout Modal - For waiter and owner/manager */}
            {(!isCashier && !isKitchen) && showCheckoutModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-md w-full">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold"> 📋 Tạo đơn hàng</h2>
                      <button
                        onClick={() => setShowCheckoutModal(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="space-y-2">
                        {state.items.map((item) => (
                          <div key={item.menuItem.id} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.menuItem.name}</span>
                            <span>{formatCurrency(item.menuItem.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t mt-3 pt-3 space-y-1">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Tạm tính</span>
                          <span>{formatCurrency(state.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Thuế</span>
                          <span>{formatCurrency(state.tax)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                          <span>Tổng cộng</span>
                          <span className="text-primary-600">{formatCurrency(state.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Info */}
                    <div className="space-y-3 mb-6">
                      {selectedTable && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>🪑</span>
                          <span>Bàn {selectedTable.number}</span>
                        </div>
                      )}
                      {selectedCustomer && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>👤</span>
                          <span>{selectedCustomer.name}</span>
                        </div>
                      )}
                      <textarea
                        placeholder="Ghi chú đơn hàng..."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      {!selectedTable && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm text-center">
                          ⚠️ Vui lòng chọn bàn trước khi tạo đơn
                        </div>
                      )}
                      <button
                        onClick={() => handleCheckout()}
                        disabled={isProcessing || !selectedTable}
                        className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? 'Đang xử lý...' : '💳 Tạo đơn hàng'}
                      </button>
                      <button
                        onClick={() => setShowCheckoutModal(false)}
                        className="w-full py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && selectedTableForQR && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-md w-full">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">🔗 Mã QR - Bàn {selectedTableForQR.number}</h2>
                      <button
                        onClick={() => {
                          setShowQRModal(false);
                          setSelectedTableForQR(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="bg-gray-100 rounded-lg p-6 flex items-center justify-center mb-4">
                      <svg
                        className="w-64 h-64 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 11h8V3H3v8zm10 0h8V3h-8v8zM3 21h8v-8H3v8zm10 0h8v-8h-8v8z" />
                      </svg>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600">
                        <strong>📱 Cách sử dụng:</strong>
                      </p>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1">
                        <li>✓ Khách hàng quét mã QR này</li>
                        <li>✓ Xem menu và đặt hàng từ điện thoại</li>
                        <li>✓ Đơn hàng sẽ gửi tới bếp ngay lập tức</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          // Generate QR code for order
                          const qrUrl = `${window.location.origin}/order?table=${selectedTableForQR.id}`;
                          const printWindow = window.open('', '', 'height=400,width=600');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                              <head>
                                <title>Mã QR - Bàn ${selectedTableForQR.number}</title>
                              </head>
                              <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Arial;">
                                <h2>Bàn ${selectedTableForQR.number}</h2>
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}" />
                                <p>Quét mã để đặt hàng</p>
                              </body>
                              </html>
                            `);
                            printWindow.document.close();
                            printWindow.focus();
                            printWindow.print();
                          }
                        }}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        🖨️ In mã QR
                      </button>
                      <button
                        onClick={() => {
                          // Copy link to clipboard
                          const qrUrl = `${window.location.origin}/order?table=${selectedTableForQR.id}`;
                          navigator.clipboard.writeText(qrUrl);
                          alert('Đã sao chép link vào clipboard!');
                        }}
                        className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                      >
                        📋 Sao chép link
                      </button>
                      <button
                        onClick={() => {
                          setShowQRModal(false);
                          setSelectedTableForQR(null);
                        }}
                        className="w-full py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Receipt Modal */}
        {paidOrder && (
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={async () => {
              // Update order to 'completed' when receipt is closed (for cashier role)
              if (isCashier && paidOrder.paymentStatus === 'paid') {
                try {
                  await fetch(`/api/orders/${paidOrder.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      status: 'completed'
                    }),
                  });
                } catch (err) {
                  console.error('Failed to update order status:', err);
                }
              }
              setShowReceiptModal(false);
              setPaidOrder(null);
              clearCart();
              fetchData(); // Refresh to remove completed order
            }}
            order={paidOrder}
            restaurant={{
              name: 'Nhà hàng',
              address: 'Địa chỉ nhà hàng',
              phone: '0123456789',
            }}
          />
        )}
      </div>
    </div>
  );
}

