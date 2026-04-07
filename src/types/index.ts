// TypeScript type definitions for the Restaurant POS system

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: Category;
  categoryId?: string;
  image?: string | null;
  available: boolean;
  type?: string;
  menuType?: string;
  ingredients?: MenuItemIngredient[];
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string | null;
  order?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPrice: number;
  stock?: number;
  minStock?: number;
}

export interface MenuItemIngredient {
  ingredientId: string;
  quantity: number;
  ingredient: Ingredient;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
}

export interface Table {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | string;
  zoneId?: string;
  zone?: Zone | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'served'
  | 'completed' 
  | 'cancelled';

export type PaymentStatus = 'paid' | 'unpaid' | 'refunded';

export type PaymentMethod = 
  | 'cash' 
  | 'card' 
  | 'mobile'
  | 'vnpay';

export type ItemStatus = 'confirmed' | 'pending_confirm';

export interface OrderItem {
  id: string;
  menuItemId?: string;
  menuItemName?: string;
  quantity: number;
  price?: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  status?: ItemStatus | string;
  menuItem: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}

export interface Order {
  id: string;
  orderNumber: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  table?: {
    id: string;
    number: number;
    name?: string;
    zone?: Zone | string;
  };
  tableId?: string;
  customer?: Customer;
  customerId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export type UserRole = 'owner' | 'manager' | 'waiter' | 'kitchen' | 'cashier';

// Role priority (higher number = more access)
export const ROLE_PRIORITY: Record<UserRole, number> = {
  owner: 100,
  manager: 50,
  waiter: 35,
  kitchen: 30,
  cashier: 25,
};

export type MenuType = 'single' | 'buffet' | 'set_menu';

export interface SelectedIngredient {
  ingredientId: string;
  quantity: number;
}

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
