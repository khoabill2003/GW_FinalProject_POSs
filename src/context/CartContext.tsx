/**
 * ============================================================================
 * CART CONTEXT - Quản lý giỏ hàng (State Management)
 * ============================================================================
 * 
 * PATTERN: useReducer + Context
 * - useReducer: Phù hợp cho state phức tạp với nhiều action types
 * - Context: Share state giữa các components không cần prop drilling
 * 
 * TẠI SAO DÙNG useReducer THAY VÌ useState?
 * - State có nhiều properties liên quan (items, subtotal, tax, total)
 * - Nhiều loại actions khác nhau (add, remove, update, clear)
 * - Logic tính toán phức tạp cần tập trung 1 chỗ
 * - Dễ debug và test hơn
 * 
 * FLOW:
 * Component dispatch action -> Reducer xử lý -> State cập nhật -> Re-render
 * 
 * VÍ DỤ:
 * dispatch({ type: 'ADD_ITEM', payload: menuItem })
 * -> Reducer kiểm tra item đã có chưa
 * -> Nếu có: tăng quantity
 * -> Nếu chưa: thêm mới
 * -> Tính lại subtotal, tax, total
 */
'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CartItem, MenuItem } from '@/types';

// ============================================================================
// TYPESCRIPT INTERFACES - Định nghĩa kiểu dữ liệu
// ============================================================================

/**
 * CartState - Trạng thái giỏ hàng
 * @property items - Mảng các món trong giỏ
 * @property subtotal - Tổng tiền trước thuế
 * @property tax - Tiền thuế (subtotal * taxRate)
 * @property total - Tổng tiền cuối (subtotal + tax)
 * @property taxRate - Tỷ lệ thuế (decimal, VD: 0.08 = 8%)
 */
interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
}

/**
 * CartAction - Các action types cho reducer
 * Sử dụng Union Type để TypeScript biết chính xác payload của mỗi action
 * 
 * | Action Type     | Payload           | Mô tả                    |
 * |-----------------|-------------------|---------------------------|
 * | ADD_ITEM        | MenuItem          | Thêm món vào giỏ         |
 * | REMOVE_ITEM     | string (itemId)   | Xóa món khỏi giỏ         |
 * | UPDATE_QUANTITY | {itemId, quantity}| Cập nhật số lượng        |
 * | UPDATE_NOTES    | {itemId, notes}   | Cập nhật ghi chú         |
 * | SET_TAX_RATE    | number (%)        | Đặt thuế (VD: 8 cho 8%)  |
 * | CLEAR_CART      | (none)            | Xóa toàn bộ giỏ          |
 */
type CartAction =
  | { type: 'ADD_ITEM'; payload: MenuItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'UPDATE_NOTES'; payload: { itemId: string; notes: string } }
  | { type: 'SET_TAX_RATE'; payload: number }
  | { type: 'CLEAR_CART' };

// Thuế mặc định 8% (lưu dạng decimal 0.08)
const DEFAULT_TAX_RATE = 0.08; // 8% default tax rate

// ============================================================================
// HELPER FUNCTION - Tính toán tổng tiền
// ============================================================================
/**
 * Tính subtotal, tax, total từ danh sách items
 * 
 * CÔNG THỨC:
 * - subtotal = Σ(price × quantity) cho mỗi item
 * - tax = subtotal × taxRate
 * - total = subtotal + tax
 * 
 * @param items - Mảng CartItem trong giỏ
 * @param taxRate - Tỷ lệ thuế (decimal, VD: 0.08)
 * @returns {subtotal, tax, total}
 */
const calculateTotals = (items: CartItem[], taxRate: number) => {
  // reduce: Duyệt qua mảng và tích lũy tổng
  const subtotal = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0  // Giá trị khởi tạo
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

// ============================================================================
// CART REDUCER - Xử lý các actions
// ============================================================================
/**
 * Reducer Pattern:
 * - Pure function: (currentState, action) => newState
 * - Không mutate state trực tiếp, return state mới
 * - Switch case cho mỗi action type
 */
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    // ======================================================================
    // ADD_ITEM - Thêm món vào giỏ
    // ======================================================================
    /**
     * Logic:
     * 1. Tìm xem món đã có trong giỏ chưa (theo menuItem.id)
     * 2. Nếu có: tăng quantity lên 1
     * 3. Nếu chưa: thêm item mới với quantity = 1
     * 4. Tính lại totals
     */
    case 'ADD_ITEM': {
      // Tìm index của item nếu đã tồn tại
      const existingItemIndex = state.items.findIndex(
        (item) => item.menuItem.id === action.payload.id
      );

      let newItems: CartItem[];
      if (existingItemIndex > -1) {
        // ĐÃ CÓ: Map qua array và tăng quantity của item đó
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }  // Immutable update
            : item
        );
      } else {
        // CHƯA CÓ: Spread array cũ + thêm item mới
        newItems = [...state.items, { menuItem: action.payload, quantity: 1 }];
      }

      // Trả về state mới với items và totals đã cập nhật
      return { ...state, items: newItems, ...calculateTotals(newItems, state.taxRate) };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(
        (item) => item.menuItem.id !== action.payload
      );
      return { ...state, items: newItems, ...calculateTotals(newItems, state.taxRate) };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items
        .map((item) =>
          item.menuItem.id === action.payload.itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
        .filter((item) => item.quantity > 0);
      return { ...state, items: newItems, ...calculateTotals(newItems, state.taxRate) };
    }

    case 'UPDATE_NOTES': {
      const newItems = state.items.map((item) =>
        item.menuItem.id === action.payload.itemId
          ? { ...item, notes: action.payload.notes }
          : item
      );
      return { ...state, items: newItems };
    }

    // ======================================================================
    // SET_TAX_RATE - Cập nhật tỷ lệ thuế
    // ======================================================================
    /**
     * QUAN TRỌNG: Chuyển đổi từ % sang decimal
     * - Input: 8 (8%)
     * - Lưu: 0.08 (decimal để tính toán)
     * 
     * Sau đó tính lại totals với taxRate mới
     */
    case 'SET_TAX_RATE': {
      const newTaxRate = action.payload / 100; // 8 -> 0.08
      return { ...state, taxRate: newTaxRate, ...calculateTotals(state.items, newTaxRate) };
    }

    // ======================================================================
    // CLEAR_CART - Xóa toàn bộ giỏ hàng
    // ======================================================================
    /**
     * Reset về trạng thái ban đầu
     * GIỮ LẠI taxRate vì đó là setting của nhà hàng
     */
    case 'CLEAR_CART':
      return { items: [], subtotal: 0, tax: 0, total: 0, taxRate: state.taxRate };

    default:
      return state;
  }
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  setTaxRate: (rate: number) => void;
  clearCart: () => void;
} | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    taxRate: DEFAULT_TAX_RATE,
  });

  const addItem = (item: MenuItem) => dispatch({ type: 'ADD_ITEM', payload: item });
  const removeItem = (itemId: string) => dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  const updateQuantity = (itemId: string, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  const updateNotes = (itemId: string, notes: string) =>
    dispatch({ type: 'UPDATE_NOTES', payload: { itemId, notes } });
  const setTaxRate = (rate: number) =>
    dispatch({ type: 'SET_TAX_RATE', payload: rate });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  return (
    <CartContext.Provider
      value={{ state, dispatch, addItem, removeItem, updateQuantity, updateNotes, setTaxRate, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
