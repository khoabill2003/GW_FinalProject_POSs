'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

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
  category: { id: string; name: string };
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
  zone?: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  status?: string; // confirmed, pending_confirm
  menuItem?: {
    id: string;
    name: string;
    image?: string;
  };
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  total: number;
  items: OrderItem[];
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  createdAt: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export default function TableOrderingPage() {
  const params = useParams();
  const tableNumber = params?.number ? parseInt(params.number as string) : null;

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [table, setTable] = useState<Table | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Order states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'order'>('menu');

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch categories
      const categoriesRes = await fetch('/api/categories');
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      }

      // Fetch menu items
      const menuRes = await fetch('/api/menu');
      if (menuRes.ok) {
        const data = await menuRes.json();
        setMenuItems(Array.isArray(data) ? data : data.menuItems || []);
      }

      // Fetch customers
      const customersRes = await fetch('/api/customers');
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(Array.isArray(data) ? data : data.customers || []);
      }

      // Fetch table info
      if (tableNumber) {
        const tablesRes = await fetch('/api/tables');
        if (tablesRes.ok) {
          const allTables = await tablesRes.json();
          const tablesList = Array.isArray(allTables) ? allTables : allTables.tables || [];
          const foundTable = tablesList.find((t: Table) => t.number === tableNumber);
          if (foundTable) {
            setTable(foundTable);
            
            // Fetch active order for this table
            const orderRes = await fetch(`/api/orders?tableId=${foundTable.id}&activeOnly=true`);
            if (orderRes.ok) {
              const orderData = await orderRes.json();
              if (orderData.order) {
                setActiveOrder(orderData.order);
                setActiveTab('order');
              }
            }
          } else {
            setError('Không tìm thấy bàn.');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Lỗi khi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [tableNumber]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh order mỗi 15 giây
  useEffect(() => {
    if (!table?.id) return;
    
    const interval = setInterval(async () => {
      try {
        const orderRes = await fetch(`/api/orders?tableId=${table.id}&activeOnly=true`);
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setActiveOrder(orderData.order || null);
        }
      } catch (err) {
        console.error('Error refreshing order:', err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [table?.id]);

  // Set default category on load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const filteredMenuItems = selectedCategory
    ? menuItems.filter((item) => item.categoryId === selectedCategory && item.available)
    : menuItems.filter((item) => item.available);

  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((ci) => ci.menuItem.id === item.id);
      if (existingItem) {
        return prevCart.map((ci) =>
          ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      } else {
        return [...prevCart, { menuItem: item, quantity: 1, notes: '' }];
      }
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.menuItem.id !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(menuItemId);
    } else {
      setCart((prevCart) =>
        prevCart.map((ci) =>
          ci.menuItem.id === menuItemId ? { ...ci, quantity: newQuantity } : ci
        )
      );
    }
  };

  const updateNotes = (menuItemId: string, notes: string) => {
    setCart((prevCart) =>
      prevCart.map((ci) =>
        ci.menuItem.id === menuItemId ? { ...ci, notes } : ci
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert('Vui lòng nhập tên khách hàng');
      return;
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomerName,
          phone: newCustomerPhone || undefined,
        }),
      });

      if (response.ok) {
        const newCustomer = await response.json();
        setCustomers((prev) => [...prev, newCustomer]);
        setSelectedCustomer(newCustomer);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setShowCustomerModal(false);
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      alert('Lỗi khi tạo khách hàng');
    }
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      alert('Vui lòng chọn ít nhất một món');
      return;
    }

    if (!table) {
      alert('Không tìm thấy bàn');
      return;
    }

    setIsSubmitting(true);

    try {
      // Nếu có order active → thêm món vào order đó
      if (activeOrder) {
        const response = await fetch(`/api/orders/${activeOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addItems: cart.map((item) => ({
              menuItemId: item.menuItem.id,
              quantity: item.quantity,
              notes: item.notes,
            })),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setActiveOrder(data.order);
          setSuccessMessage('✅ Đã thêm món vào đơn hàng! Nhân viên sẽ phục vụ bạn ngay.');
          setCart([]);
          setActiveTab('order');
          setTimeout(() => setSuccessMessage(''), 5000);
        } else {
          const err = await response.json();
          alert(`Lỗi: ${err.error}`);
        }
      } else {
        // Tạo order mới
        let customerId = selectedCustomer?.id;
        if (!customerId && newCustomerName) {
          const customerRes = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newCustomerName,
              phone: newCustomerPhone || undefined,
            }),
          });

          if (customerRes.ok) {
            const data = await customerRes.json();
            const newCustomer = data.customer || data;
            customerId = newCustomer.id;
          }
        }

        // Submit order
        const orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId: table.id,
            customerId: customerId,
            items: cart.map((item) => ({
              menuItemId: item.menuItem.id,
              quantity: item.quantity,
              notes: item.notes,
              price: item.menuItem.price,
            })),
          }),
        });

        if (orderRes.ok) {
          const data = await orderRes.json();
          setActiveOrder(data.order);
          setSuccessMessage('✅ Đơn hàng đã được gửi! Nhân viên sẽ phục vụ bạn ngay.');
          setCart([]);
          setSelectedCustomer(null);
          setNewCustomerName('');
          setNewCustomerPhone('');
          setActiveTab('order');
          setTimeout(() => setSuccessMessage(''), 5000);
        } else {
          const err = await orderRes.json();
          alert(`Lỗi: ${err.error}`);
        }
      }
    } catch (err) {
      console.error('Error submitting order:', err);
      alert('Lỗi khi gửi đơn hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { text: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
      preparing: { text: 'Đang chuẩn bị', color: 'bg-orange-100 text-orange-800' },
      ready: { text: 'Sẵn sàng', color: 'bg-green-100 text-green-800' },
      completed: { text: 'Hoàn thành', color: 'bg-gray-100 text-gray-800' },
    };
    const badge = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="text-gray-600 font-medium">Đang tải menu...</p>
        </div>
      </div>
    );
  }

  if (!table || !tableNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bàn không hợp lệ</h1>
          <p className="text-gray-600">Vui lòng quét mã QR hợp lệ từ bàn của bạn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🍽️ Menu Nhà Hàng</h1>
              <p className="text-gray-600 text-sm">Bàn {table.number}</p>
            </div>
            <div className="text-right">
              {activeOrder && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Đơn #{String(activeOrder.orderNumber).padStart(4, '0')}</span>
                  {getStatusBadge(activeOrder.status)}
                </div>
              )}
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'menu'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📋 Menu {cart.length > 0 && `(${cart.length})`}
            </button>
            <button
              onClick={() => setActiveTab('order')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'order'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🧾 Đơn của bàn {activeOrder && `(${activeOrder.items.length})`}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {successMessage}
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Section */}
          <div className="lg:col-span-2 space-y-6">

            {/* Category Tabs */}
            {categories.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-2 flex gap-2 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMenuItems.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 text-lg">Không có món nào trong danh mục này</p>
                </div>
              ) : (
                filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addToCart(item)}
                  >
                    <div className="aspect-square bg-gray-200 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-lg font-bold text-primary-600">
                          {formatCurrency(item.price)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                        >
                          ➕ Thêm
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-24 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">🛒 Đơn hàng của bạn</h2>

              {/* Customer Selection */}
              <div className="border-b pb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Thông tin khách hàng</p>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                    <span className="text-sm font-medium text-green-700">{selectedCustomer.name}</span>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      ✕ Đổi
                    </button>
                  </div>
                ) : newCustomerName ? (
                  <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">{newCustomerName}</span>
                    <button
                      onClick={() => {
                        setNewCustomerName('');
                        setNewCustomerPhone('');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ✕ Đổi
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    👤 Chọn khách hàng
                  </button>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm">Giỏ hàng trống</p>
                    <p className="text-xs mt-1">Chọn món từ menu</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.menuItem.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {item.menuItem.name}
                          </p>
                          <p className="text-sm text-primary-600 font-semibold">
                            {formatCurrency(item.menuItem.price)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.menuItem.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-sm flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="flex-1 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-sm flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>

                      {/* Notes */}
                      <input
                        type="text"
                        placeholder="Ghi chú món"
                        value={item.notes}
                        onChange={(e) => updateNotes(item.menuItem.id, e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />

                      {/* Subtotal */}
                      <div className="flex justify-between text-xs text-gray-600 pt-1 border-t border-gray-200">
                        <span>Tổng:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(item.menuItem.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary */}
              {cart.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Tổng cộng:</span>
                    <span className="text-primary-600">{formatCurrency(calculateTotal())}</span>
                  </div>

                  <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isSubmitting 
                      ? '⏳ Đang gửi...' 
                      : activeOrder 
                        ? '➕ Thêm vào đơn' 
                        : '✅ Gọi nhân viên'
                    }
                  </button>

                  <button
                    onClick={() => setCart([])}
                    className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    🗑️ Xóa tất cả
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Order Tab - Hiển thị đơn hàng hiện tại của bàn */}
        {activeTab === 'order' && (
          <div className="max-w-2xl mx-auto">
            {activeOrder ? (
              <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      🧾 Đơn hàng #{String(activeOrder.orderNumber).padStart(4, '0')}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {new Date(activeOrder.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {getStatusBadge(activeOrder.status)}
                </div>

                {activeOrder.customer && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">
                      👤 Khách hàng: <span className="font-medium text-gray-900">{activeOrder.customer.name}</span>
                      {activeOrder.customer.phone && ` • ${activeOrder.customer.phone}`}
                    </p>
                  </div>
                )}

                {/* Order Items */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Các món đã gọi:</h3>
                  {activeOrder.items.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex justify-between items-center py-3 border-b border-gray-100 ${
                        item.status === 'pending_confirm' ? 'bg-yellow-50 -mx-2 px-2 rounded-lg border border-yellow-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                          {item.menuItem?.image ? (
                            <img src={item.menuItem.image} alt={item.menuItemName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">🍽️</div>
                          )}
                          {item.status === 'pending_confirm' && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                              <span className="text-xs">⏳</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{item.menuItemName}</p>
                            {item.status === 'pending_confirm' && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                Chờ xác nhận
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                          {item.notes && <p className="text-xs text-gray-500 italic">📝 {item.notes}</p>}
                        </div>
                      </div>
                      <p className="font-semibold text-primary-600">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  ))}
                  
                  {/* Thông báo nếu có món chờ xác nhận */}
                  {activeOrder.items.some(item => item.status === 'pending_confirm') && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      <p className="font-medium">⏳ Có món mới đang chờ nhân viên xác nhận</p>
                      <p className="text-xs mt-1">Món sẽ được chuẩn bị sau khi nhân viên xác nhận</p>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính:</span>
                    <span>{formatCurrency(activeOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Thuế ({activeOrder.subtotal > 0 ? Math.round((activeOrder.tax / activeOrder.subtotal) * 1000) / 10 : 0}%):</span>
                    <span>{formatCurrency(activeOrder.tax)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                    <span>Tổng cộng:</span>
                    <span className="text-primary-600">{formatCurrency(activeOrder.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors"
                  >
                    ➕ Gọi thêm món
                  </button>
                  <button
                    onClick={() => fetchData()}
                    className="py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    🔄 Làm mới
                  </button>
                </div>

                <div className="text-center text-sm text-gray-500">
                  💳 Thanh toán tại quầy khi kết thúc
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa có đơn hàng</h2>
                <p className="text-gray-600 mb-6">Bàn này chưa có đơn hàng nào. Hãy gọi món ngay!</p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="py-3 px-6 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors"
                >
                  📋 Xem Menu
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">👤 Chọn khách hàng</h2>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Existing Customers */}
            {customers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Khách hàng hiện có:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerModal(false);
                      }}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-colors"
                    >
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            {customers.length > 0 && <div className="border-t" />}

            {/* Create New Customer */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Hoặc tạo khách hàng mới:</p>
              <input
                type="text"
                placeholder="Tên khách hàng *"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="tel"
                placeholder="Số điện thoại (tuỳ chọn)"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleCreateCustomer}
                  className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                >
                  ✅ Tạo
                </button>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
