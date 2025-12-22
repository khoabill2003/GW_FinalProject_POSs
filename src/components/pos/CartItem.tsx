'use client';

import { CartItem as CartItemType } from '@/types';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const { menuItem, quantity } = item;

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{menuItem.name}</h4>
          <p className="text-sm text-gray-500">{formatCurrency(menuItem.price)}</p>
        </div>
        <button
          onClick={() => removeItem(menuItem.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateQuantity(menuItem.id, quantity - 1)}
            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            −
          </button>
          <span className="w-8 text-center font-medium">{quantity}</span>
          <button
            onClick={() => updateQuantity(menuItem.id, quantity + 1)}
            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            +
          </button>
        </div>
        <span className="font-semibold text-gray-900">
          {formatCurrency(menuItem.price * quantity)}
        </span>
      </div>
    </div>
  );
}
