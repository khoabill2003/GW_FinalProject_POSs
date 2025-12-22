'use client';

import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import CartItem from './CartItem';
import { useState } from 'react';

export default function Cart() {
  const { state, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (state.items.length === 0) return;
    
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    alert(`Order placed successfully!\nTotal: ${formatCurrency(state.total)}`);
    clearCart();
    setIsProcessing(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Cart Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Current Order</h2>
          {state.items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {state.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <span className="text-5xl mb-4">🛒</span>
            <p>No items in cart</p>
            <p className="text-sm">Add items from the menu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.items.map((item) => (
              <CartItem key={item.menuItem.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(state.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Tax (8%)</span>
          <span>{formatCurrency(state.tax)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
          <span>Total</span>
          <span>{formatCurrency(state.total)}</span>
        </div>
        
        <button
          onClick={handleCheckout}
          disabled={state.items.length === 0 || isProcessing}
          className="w-full py-4 bg-secondary-500 text-white font-semibold rounded-xl hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : `Pay ${formatCurrency(state.total)}`}
        </button>
      </div>
    </div>
  );
}
