// TypeScript type definitions for the Restaurant POS system

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  tableNumber?: number;
  customerName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'completed' 
  | 'cancelled';

export type PaymentMethod = 
  | 'cash' 
  | 'card' 
  | 'mobile';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export type UserRole = 'owner' | 'manager' | 'waiter' | 'kitchen' | 'cashier';

// Role priority (higher number = more access)
// owner: Chủ nhà hàng - toàn quyền
// manager: Quản lý - quản lý + admin panel
// waiter: Phục vụ - tạo đơn, xác nhận, phục vụ
// kitchen: Bếp - chuẩn bị món
// cashier: Thu ngân - CHỈ thanh toán
export const ROLE_PRIORITY: Record<UserRole, number> = {
  owner: 100,
  manager: 50,
  waiter: 35,
  kitchen: 30,
  cashier: 25,
};

export interface SalesReport {
  date: Date;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topSellingItems: TopSellingItem[];
}

export interface TopSellingItem {
  menuItemId: string;
  menuItemName: string;
  quantitySold: number;
  revenue: number;
}
