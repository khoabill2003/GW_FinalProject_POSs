'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';

const PHONE_REGEX = /^(?:\+?84|0)\d{9,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  categoryId: string;
  category: { id: string; name: string };
  available: boolean;
}

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: string;
  zone?: { id: string; name: string };
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

interface RestaurantInfo {
  restaurantName: string;
  mainBranch?: {
    address?: string;
    phone?: string;
    image?: string;
  };
}

export default function BookingPage() {
  const [step, setStep] = useState<'info' | 'table' | 'menu' | 'confirm' | 'success'>('info');
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Booking info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [guests, setGuests] = useState(2);
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reservationResult, setReservationResult] = useState<{ orderNumber?: number; tableNumber?: number } | null>(null);

  const getReservationDateTime = useCallback(() => {
    if (!reservationDate || !reservationTime) return null;
    const dateTime = new Date(`${reservationDate}T${reservationTime}:00`);
    return Number.isNaN(dateTime.getTime()) ? null : dateTime;
  }, [reservationDate, reservationTime]);

  const validateBookingInfo = useCallback(() => {
    const normalizedName = customerName.trim();
    const normalizedPhone = customerPhone.trim().replace(/[\s.-]/g, '');
    const normalizedEmail = customerEmail.trim();
    const normalizedNotes = notes.trim();

    if (!normalizedName || !normalizedPhone || !reservationDate || !reservationTime) {
      return 'Vui lòng điền đầy đủ thông tin bắt buộc (*)';
    }

    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return 'Tên khách hàng phải từ 2 đến 80 ký tự';
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      return 'Số điện thoại không hợp lệ';
    }

    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      return 'Email không hợp lệ';
    }

    if (!Number.isInteger(guests) || guests < 1 || guests > 50) {
      return 'Số khách phải là số nguyên từ 1 đến 50';
    }

    if (normalizedNotes.length > 500) {
      return 'Ghi chú tối đa 500 ký tự';
    }

    const reservationDateTime = getReservationDateTime();
    if (!reservationDateTime) {
      return 'Ngày giờ đặt bàn không hợp lệ';
    }

    const minTime = new Date(Date.now() + 10 * 60 * 1000);
    if (reservationDateTime < minTime) {
      return 'Thời gian đặt bàn phải sau hiện tại ít nhất 10 phút';
    }

    return null;
  }, [customerName, customerPhone, customerEmail, notes, reservationDate, reservationTime, guests, getReservationDateTime]);

  const fetchData = useCallback(async () => {
    try {
      const [restRes, tableRes, catRes, menuRes] = await Promise.all([
        fetch('/api/restaurants/settings'),
        fetch('/api/tables'),
        fetch('/api/categories'),
        fetch('/api/menu'),
      ]);

      if (restRes.ok) {
        const data = await restRes.json();
        setRestaurant(data);
      }
      if (tableRes.ok) {
        const data = await tableRes.json();
        setTables(Array.isArray(data.tables) ? data.tables : Array.isArray(data) ? data : []);
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(Array.isArray(data.categories) ? data.categories : Array.isArray(data) ? data : []);
      }
      if (menuRes.ok) {
        const data = await menuRes.json();
        setMenuItems((Array.isArray(data.menuItems) ? data.menuItems : Array.isArray(data) ? data : []).filter((i: MenuItem) => i.available));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (selectedTable && selectedTable.capacity < guests) {
      setSelectedTable(null);
    }
  }, [guests, selectedTable]);

  // Set default date to today
  useEffect(() => {
    const today = new Date();
    setReservationDate(today.toISOString().split('T')[0]);
    setReservationTime('18:00');
  }, []);

  const filteredItems = menuItems.filter(item => !selectedCategory || item.categoryId === selectedCategory);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.menuItem.id !== itemId));
  };

  const updateCartQty = (itemId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(itemId);
    setCart(prev => prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: qty } : c));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);

  const availableTables = tables.filter(t => t.status === 'available' && t.capacity >= guests);

  const handleSubmit = async () => {
    const validationError = validateBookingInfo();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!selectedTable) {
      setError('Vui lòng chọn bàn trước khi xác nhận đặt bàn');
      return;
    }

    const isSelectedTableStillAvailable = availableTables.some((table) => table.id === selectedTable.id);
    if (!isSelectedTableStillAvailable) {
      setError('Bàn đã chọn không còn khả dụng, vui lòng chọn lại');
      setStep('table');
      return;
    }

    const reservationDateTime = getReservationDateTime();
    if (!reservationDateTime) {
      setError('Ngày giờ đặt bàn không hợp lệ');
      return;
    }

    if (cart.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
      setError('Số lượng món đặt trước không hợp lệ');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim().replace(/[\s.-]/g, ''),
          customerEmail: customerEmail.trim(),
          guests,
          tableId: selectedTable.id,
          reservationTime: reservationDateTime.toISOString(),
          notes: notes.trim(),
          items: cart.map(c => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
            notes: c.notes?.trim() || '',
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReservationResult({
          tableNumber: data.reservation.table.number,
        });
        setStep('success');
      } else {
        const data = await res.json();
        setError(data.error || 'Không thể đặt bàn');
      }
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍽️</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{restaurant?.restaurantName || 'Nhà Hàng'}</h1>
              {restaurant?.mainBranch?.address && (
                <p className="text-sm text-gray-500">📍 {restaurant.mainBranch.address}</p>
              )}
            </div>
          </div>
          {restaurant?.mainBranch?.phone && (
            <a href={`tel:${restaurant.mainBranch.phone}`} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              📞 {restaurant.mainBranch.phone}
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Đặt bàn & Gọi món trước
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Tiết kiệm thời gian - Đặt bàn ngay, gọi món sẵn, đến là được phục vụ!
          </p>

          {/* Progress Steps */}
          {step !== 'success' && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {['info', 'table', 'menu', 'confirm'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step === s ? 'bg-orange-500 text-white scale-110 shadow-lg' :
                    ['info', 'table', 'menu', 'confirm'].indexOf(step) > i ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {['info', 'table', 'menu', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
                  </div>
                  {i < 3 && <div className={`w-8 h-0.5 ${
                    ['info', 'table', 'menu', 'confirm'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'
                  }`} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 pb-16">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 font-bold">✕</button>
          </div>
        )}

        {/* Step 1: Customer Info */}
        {step === 'info' && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold mb-6">📝 Thông tin đặt bàn</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="0901234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="email@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số khách *</label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                      <option key={n} value={n}>{n} người</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày *</label>
                  <input
                    type="date"
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ đến *</label>
                  <input
                    type="time"
                    value={reservationTime}
                    onChange={(e) => setReservationTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Dị ứng, yêu cầu đặc biệt..."
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const validationError = validateBookingInfo();
                if (validationError) {
                  setError(validationError);
                  return;
                }
                setError('');
                setStep('table');
              }}
              className="w-full mt-8 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl"
            >
              Tiếp tục chọn bàn →
            </button>
          </div>
        )}

        {/* Step 2: Table Selection */}
        {step === 'table' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">🪑 Chọn bàn ({guests} khách)</h3>
              <button onClick={() => setStep('info')} className="text-gray-500 hover:text-gray-700">← Quay lại</button>
            </div>

            {availableTables.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <span className="text-5xl block mb-4">😔</span>
                <p className="text-lg">Không có bàn trống phù hợp cho {guests} khách</p>
                <p className="text-sm mt-2">Vui lòng thay đổi số khách hoặc thời gian</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {availableTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`p-6 rounded-xl border-2 transition-all text-center ${
                      selectedTable?.id === table.id
                        ? 'border-orange-500 bg-orange-50 shadow-lg scale-105'
                        : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-3xl mb-2">🪑</div>
                    <h4 className="font-bold text-lg">Bàn {table.number}</h4>
                    <p className="text-sm text-gray-500">{table.capacity} chỗ</p>
                    {table.zone && <p className="text-xs text-gray-400 mt-1">{table.zone.name}</p>}
                    {selectedTable?.id === table.id && (
                      <span className="inline-block mt-2 px-3 py-1 bg-orange-500 text-white text-xs rounded-full font-medium">
                        ✓ Đã chọn
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                if (!selectedTable) {
                  setError('Vui lòng chọn bàn');
                  return;
                }
                setError('');
                setStep('menu');
              }}
              disabled={!selectedTable}
              className="w-full mt-8 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp tục chọn món →
            </button>
          </div>
        )}

        {/* Step 3: Pre-order Menu */}
        {step === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Menu */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">📋 Gọi món trước (tùy chọn)</h3>
                <button onClick={() => setStep('table')} className="text-gray-500 hover:text-gray-700">← Quay lại</button>
              </div>

              {/* Categories */}
              <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                    !selectedCategory ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-gray-50 rounded-xl p-4 text-left hover:shadow-md transition-all group"
                  >
                    <div className="aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                    <p className="text-orange-600 font-bold">{formatCurrency(item.price)}</p>
                    {cart.find(c => c.menuItem.id === item.id) && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                        x{cart.find(c => c.menuItem.id === item.id)?.quantity}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Sidebar */}
            <div className="bg-white rounded-2xl shadow-xl p-6 lg:sticky lg:top-24 h-fit">
              <h3 className="text-lg font-bold mb-4">🛒 Món đã chọn ({cart.length})</h3>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <span className="text-4xl block mb-2">🍽️</span>
                  <p className="text-sm">Chưa chọn món nào</p>
                  <p className="text-xs mt-1">Bạn có thể bỏ qua và gọi món khi đến</p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {cart.map((c) => (
                    <div key={c.menuItem.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{c.menuItem.name}</h4>
                        <p className="text-xs text-orange-600">{formatCurrency(c.menuItem.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateCartQty(c.menuItem.id, c.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm">-</button>
                        <span className="w-6 text-center text-sm font-medium">{c.quantity}</span>
                        <button onClick={() => updateCartQty(c.menuItem.id, c.quantity + 1)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm">+</button>
                      </div>
                      <button onClick={() => removeFromCart(c.menuItem.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <div className="border-t pt-3 mb-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Tạm tính</span>
                    <span className="text-orange-600">{formatCurrency(cartTotal)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">* Thuế sẽ được tính khi thanh toán tại nhà hàng</p>
                </div>
              )}

              <button
                onClick={() => {
                  const validationError = validateBookingInfo();
                  if (validationError) {
                    setError(validationError);
                    setStep('info');
                    return;
                  }
                  if (!selectedTable) {
                    setError('Vui lòng chọn bàn trước khi xác nhận');
                    setStep('table');
                    return;
                  }
                  setError('');
                  setStep('confirm');
                }}
                className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all"
              >
                {cart.length > 0 ? 'Xác nhận đặt bàn & món →' : 'Chỉ đặt bàn (không gọi trước) →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">✅ Xác nhận đặt bàn</h3>
              <button onClick={() => setStep('menu')} className="text-gray-500 hover:text-gray-700">← Quay lại</button>
            </div>

            <div className="space-y-4">
              <div className="bg-orange-50 rounded-xl p-4">
                <h4 className="font-bold text-orange-800 mb-2">👤 Thông tin khách</h4>
                <p className="text-sm"><strong>Tên:</strong> {customerName}</p>
                <p className="text-sm"><strong>SĐT:</strong> {customerPhone}</p>
                {customerEmail && <p className="text-sm"><strong>Email:</strong> {customerEmail}</p>}
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 mb-2">📅 Chi tiết đặt bàn</h4>
                <p className="text-sm"><strong>Ngày:</strong> {new Date(reservationDate).toLocaleDateString('vi-VN')}</p>
                <p className="text-sm"><strong>Giờ:</strong> {reservationTime}</p>
                <p className="text-sm"><strong>Số khách:</strong> {guests} người</p>
                <p className="text-sm"><strong>Bàn:</strong> {selectedTable?.number} ({selectedTable?.capacity} chỗ)</p>
                {notes && <p className="text-sm"><strong>Ghi chú:</strong> {notes}</p>}
              </div>

              {cart.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-bold text-green-800 mb-2">🍽️ Món đã gọi trước</h4>
                  <div className="space-y-1">
                    {cart.map((c) => (
                      <div key={c.menuItem.id} className="flex justify-between text-sm">
                        <span>{c.quantity}x {c.menuItem.name}</span>
                        <span className="text-gray-600">{formatCurrency(c.menuItem.price * c.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                    <span>Tạm tính</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full mt-8 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? '⏳ Đang xử lý...' : '🎉 Xác nhận đặt bàn'}
            </button>
          </div>
        )}

        {/* Success */}
        {step === 'success' && reservationResult && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-3xl font-bold text-green-600 mb-2">Đặt bàn thành công!</h3>
            <p className="text-gray-600 mb-6">
              Bàn <strong>{reservationResult.tableNumber}</strong> đã được đặt cho <strong>{guests}</strong> khách
            </p>

            <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
              <h4 className="font-bold mb-3">📋 Thông tin đặt bàn</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Tên:</strong> {customerName}</p>
                <p><strong>SĐT:</strong> {customerPhone}</p>
                <p><strong>Ngày giờ:</strong> {new Date(reservationDate).toLocaleDateString('vi-VN')} lúc {reservationTime}</p>
                <p><strong>Bàn:</strong> {reservationResult.tableNumber}</p>
                <p><strong>Số khách:</strong> {guests} người</p>
                {cart.length > 0 && (
                  <p><strong>Món đặt trước:</strong> {cart.length} món</p>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              💡 Khi đến nhà hàng, quét mã QR tại bàn để xem món đã đặt và gọi thêm nếu cần.
              <br />Thanh toán tại quầy khi kết thúc.
            </p>

            <button
              onClick={() => {
                setStep('info');
                setCart([]);
                setSelectedTable(null);
                setCustomerName('');
                setCustomerPhone('');
                setCustomerEmail('');
                setNotes('');
                setReservationResult(null);
                fetchData();
              }}
              className="px-8 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all"
            >
              Đặt bàn mới
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center">
        <p className="text-sm">© {new Date().getFullYear()} {restaurant?.restaurantName || 'Restaurant'}. All rights reserved.</p>
        <p className="text-xs mt-1">Powered by Restaurant POS System</p>
      </footer>
    </div>
  );
}
