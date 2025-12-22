'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatOrderNumber } from '@/lib/utils';

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  monthSales: number;
  monthOrders: number;
  yearSales: number;
  yearOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  totalCustomers: number;
  totalTables: number;
  todayCost: number;
  monthCost: number;
  yearCost: number;
}

interface TopItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  table?: { number: number };
  items?: { 
    menuItemId: string; 
    menuItemName: string;
    quantity: number; 
    unitPrice: number;
    totalPrice: number;
    costPrice?: number; 
    menuItem: { id: string; name: string };
  }[];
}

// Simple Pie Chart Component
function PieChart({ data, title }: { data: { label: string; value: number; color: string }[], title: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const createPath = (startAngle: number, endAngle: number, color: string) => {
    const start = polarToCartesian(50, 50, 40, startAngle);
    const end = polarToCartesian(50, 50, 40, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    
    return (
      <path
        key={startAngle}
        d={`M 50 50 L ${start.x} ${start.y} A 40 40 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`}
        fill={color}
        className="hover:opacity-80 transition-opacity cursor-pointer"
      />
    );
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const paths = data.map((item) => {
    if (item.value === 0) return null;
    const angle = (item.value / total) * 360;
    const path = createPath(currentAngle, currentAngle + angle, item.color);
    currentAngle += angle;
    return path;
  });

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        {total > 0 ? paths : (
          <circle cx="50" cy="50" r="40" fill="#e5e7eb" />
        )}
      </svg>
      <div className="mt-3 space-y-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
            <span className="text-gray-600">{item.label}: {formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bar Chart for Top Items
function TopItemsChart({ items }: { items: TopItem[] }) {
  const maxQuantity = Math.max(...items.map(i => i.quantity), 1);
  
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-3">
          <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
            {idx + 1}
          </span>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-900">{item.name}</span>
              <span className="text-gray-500">{item.quantity} phần</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(item.quantity / maxQuantity) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Doanh thu: {formatCurrency(item.revenue)}
            </p>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-center text-gray-500 py-4">Chưa có dữ liệu</p>
      )}
    </div>
  );
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusLabels: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  ready: 'Sẵn sàng',
  served: 'Đã phục vụ',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  served: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    monthSales: 0,
    monthOrders: 0,
    yearSales: 0,
    yearOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    totalCustomers: 0,
    totalTables: 0,
    todayCost: 0,
    monthCost: 0,
    yearCost: 0,
  });
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'month' | 'year'>('today');

  useEffect(() => {
    fetchDashboardData();
    // Auto refresh every minute
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats from API
      const [ordersRes, customersRes, tablesRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/customers'),
        fetch('/api/tables'),
      ]);

      const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] };
      const customersData = customersRes.ok ? await customersRes.json() : { customers: [] };
      const tablesData = tablesRes.ok ? await tablesRes.json() : { tables: [] };

      const orders = ordersData.orders || [];
      const customers = customersData.customers || [];
      const tables = tablesData.tables || [];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // Calculate stats
      const todayOrders = orders.filter((o: RecentOrder) => new Date(o.createdAt) >= todayStart);
      const monthOrders = orders.filter((o: RecentOrder) => new Date(o.createdAt) >= monthStart);
      const yearOrders = orders.filter((o: RecentOrder) => new Date(o.createdAt) >= yearStart);

      // Chỉ tính doanh thu từ đơn đã hoàn thành VÀ đã thanh toán
      const calculateSales = (orderList: RecentOrder[]) => 
        orderList
          .filter((o: RecentOrder) => o.status === 'completed' && o.paymentStatus === 'paid')
          .reduce((sum: number, o: RecentOrder) => sum + (o.total || 0), 0);

      // Tính giá vốn thực tế từ costPrice đã lưu trong OrderItem
      const calculateCost = (orderList: RecentOrder[]) =>
        orderList
          .filter((o: RecentOrder) => o.status === 'completed' && o.paymentStatus === 'paid')
          .reduce((sum: number, o: RecentOrder) => {
            const orderCost = o.items?.reduce((itemSum: number, item: { costPrice?: number }) => 
              itemSum + (item.costPrice || 0), 0) || 0;
            return sum + orderCost;
          }, 0);

      const todayCost = calculateCost(todayOrders);
      const monthCost = calculateCost(monthOrders);
      const yearCost = calculateCost(yearOrders);

      setStats({
        todaySales: calculateSales(todayOrders),
        todayOrders: todayOrders.length,
        monthSales: calculateSales(monthOrders),
        monthOrders: monthOrders.length,
        yearSales: calculateSales(yearOrders),
        yearOrders: yearOrders.length,
        pendingOrders: orders.filter((o: RecentOrder) => o.status === 'pending').length,
        preparingOrders: orders.filter((o: RecentOrder) => o.status === 'preparing').length,
        totalCustomers: customers.length,
        totalTables: tables.length,
        todayCost,
        monthCost,
        yearCost,
      });

      // Get recent orders (last 5)
      setRecentOrders(
        orders
          .sort((a: RecentOrder, b: RecentOrder) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );

      // Calculate top items (chỉ từ đơn hoàn thành và đã thanh toán)
      const itemStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
      const completedPaidOrders = orders.filter((o: RecentOrder) => 
        o.status === 'completed' && o.paymentStatus === 'paid'
      );
      completedPaidOrders.forEach((order: { items?: { menuItem: { id: string; name: string }; quantity: number; price: number }[] }) => {
        order.items?.forEach((item: { menuItem: { id: string; name: string }; quantity: number; price: number }) => {
          const id = item.menuItem.id;
          if (!itemStats[id]) {
            itemStats[id] = { name: item.menuItem.name, quantity: 0, revenue: 0 };
          }
          itemStats[id].quantity += item.quantity;
          itemStats[id].revenue += item.price * item.quantity;
        });
      });

      const sortedItems = Object.entries(itemStats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setTopItems(sortedItems);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSalesByFilter = () => {
    switch (timeFilter) {
      case 'today': return stats.todaySales;
      case 'month': return stats.monthSales;
      case 'year': return stats.yearSales;
    }
  };

  const getOrdersByFilter = () => {
    switch (timeFilter) {
      case 'today': return stats.todayOrders;
      case 'month': return stats.monthOrders;
      case 'year': return stats.yearOrders;
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">📊 Tổng quan</h1>
          <p className="text-gray-500 mt-1">Thống kê hoạt động kinh doanh</p>
        </div>
        
        {/* Time Filter */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeFilter === 'today' ? 'bg-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeFilter === 'month' ? 'bg-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tháng
          </button>
          <button
            onClick={() => setTimeFilter('year')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeFilter === 'year' ? 'bg-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Năm
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Doanh thu</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(getSalesByFilter())}</p>
              <p className="text-green-100 text-xs mt-2">
                {timeFilter === 'today' ? 'Hôm nay' : timeFilter === 'month' ? 'Tháng này' : 'Năm nay'}
              </p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              💰
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Số đơn hàng</p>
              <p className="text-2xl font-bold mt-1">{getOrdersByFilter()}</p>
              <p className="text-blue-100 text-xs mt-2">
                {timeFilter === 'today' ? 'Hôm nay' : timeFilter === 'month' ? 'Tháng này' : 'Năm nay'}
              </p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              📋
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Đơn chờ xử lý</p>
              <p className="text-2xl font-bold mt-1">{stats.pendingOrders + stats.preparingOrders}</p>
              <p className="text-orange-100 text-xs mt-2">
                {stats.pendingOrders} chờ · {stats.preparingOrders} đang nấu
              </p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              ⏳
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Khách hàng</p>
              <p className="text-2xl font-bold mt-1">{stats.totalCustomers}</p>
              <p className="text-purple-100 text-xs mt-2">
                {stats.totalTables} bàn trong hệ thống
              </p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              👥
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Pie Charts */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 So sánh doanh thu</h2>
          <div className="flex justify-around">
            <PieChart
              title="Theo thời gian"
              data={[
                { label: 'Hôm nay', value: stats.todaySales, color: '#10B981' },
                { label: 'Tháng', value: stats.monthSales - stats.todaySales, color: '#3B82F6' },
                { label: 'Năm', value: stats.yearSales - stats.monthSales, color: '#8B5CF6' },
              ]}
            />
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🏆 Món bán chạy nhất</h2>
          <TopItemsChart items={topItems} />
        </div>
      </div>

      {/* Recent Orders & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📋 Đơn hàng gần đây</h2>
            <a href="/admin/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Xem tất cả →
            </a>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                    {order.table ? '🪑' : '📋'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">#{formatOrderNumber(parseInt(order.orderNumber))}</p>
                    <p className="text-sm text-gray-500">
                      {order.table ? `Bàn ${order.table.number}` : 'Mang về'} · {formatTime(order.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(order.total)}</p>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="text-center text-gray-500 py-8">Chưa có đơn hàng nào</p>
            )}
          </div>
        </div>

        {/* Quick Actions & Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Truy cập nhanh</h2>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/admin/orders"
              className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <span className="text-2xl">📋</span>
              <div>
                <p className="font-medium text-gray-900">Đơn hàng</p>
                <p className="text-sm text-gray-500">{stats.pendingOrders} chờ xử lý</p>
              </div>
            </a>
            <a
              href="/admin/tables"
              className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-2xl">🪑</span>
              <div>
                <p className="font-medium text-gray-900">Bàn</p>
                <p className="text-sm text-gray-500">{stats.totalTables} bàn</p>
              </div>
            </a>
            <a
              href="/admin/menu"
              className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-2xl">🍽️</span>
              <div>
                <p className="font-medium text-gray-900">Thực đơn</p>
                <p className="text-sm text-gray-500">Quản lý món</p>
              </div>
            </a>
            <a
              href="/admin/customers"
              className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span className="text-2xl">👥</span>
              <div>
                <p className="font-medium text-gray-900">Khách hàng</p>
                <p className="text-sm text-gray-500">{stats.totalCustomers} khách</p>
              </div>
            </a>
          </div>

          {/* Daily Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">📊 Tóm tắt hôm nay</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Doanh thu</p>
                <p className="font-bold text-green-600">{formatCurrency(stats.todaySales)}</p>
              </div>
              <div>
                <p className="text-gray-500">Số đơn</p>
                <p className="font-bold text-blue-600">{stats.todayOrders} đơn</p>
              </div>
              <div>
                <p className="text-gray-500">Trung bình/đơn</p>
                <p className="font-bold text-purple-600">
                  {stats.todayOrders > 0 
                    ? formatCurrency(stats.todaySales / stats.todayOrders)
                    : formatCurrency(0)
                  }
                </p>
              </div>
              <div>
                <p className="text-gray-500">Đang chờ</p>
                <p className="font-bold text-orange-600">{stats.pendingOrders + stats.preparingOrders} đơn</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
