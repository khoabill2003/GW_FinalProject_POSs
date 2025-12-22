'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CartItem, MenuItem } from '@/types';

interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: MenuItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'UPDATE_NOTES'; payload: { itemId: string; notes: string } }
  | { type: 'CLEAR_CART' };

const TAX_RATE = 0.08; // 8% tax rate

const calculateTotals = (items: CartItem[]) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        (item) => item.menuItem.id === action.payload.id
      );

      let newItems: CartItem[];
      if (existingItemIndex > -1) {
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...state.items, { menuItem: action.payload, quantity: 1 }];
      }

      return { ...state, items: newItems, ...calculateTotals(newItems) };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(
        (item) => item.menuItem.id !== action.payload
      );
      return { ...state, items: newItems, ...calculateTotals(newItems) };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items
        .map((item) =>
          item.menuItem.id === action.payload.itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
        .filter((item) => item.quantity > 0);
      return { ...state, items: newItems, ...calculateTotals(newItems) };
    }

    case 'UPDATE_NOTES': {
      const newItems = state.items.map((item) =>
        item.menuItem.id === action.payload.itemId
          ? { ...item, notes: action.payload.notes }
          : item
      );
      return { ...state, items: newItems };
    }

    case 'CLEAR_CART':
      return { items: [], subtotal: 0, tax: 0, total: 0 };

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
  clearCart: () => void;
} | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
  });

  const addItem = (item: MenuItem) => dispatch({ type: 'ADD_ITEM', payload: item });
  const removeItem = (itemId: string) => dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  const updateQuantity = (itemId: string, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  const updateNotes = (itemId: string, notes: string) =>
    dispatch({ type: 'UPDATE_NOTES', payload: { itemId, notes } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  return (
    <CartContext.Provider
      value={{ state, dispatch, addItem, removeItem, updateQuantity, updateNotes, clearCart }}
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
