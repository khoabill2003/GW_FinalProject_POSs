'use client';

import { MenuItem } from '@/types';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const { addItem } = useCart();

  return (
    <button
      onClick={() => addItem(item)}
      disabled={!item.available}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-left transition-all hover:shadow-md hover:border-primary-300 ${
        !item.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-4xl">
        🍽️
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 truncate">{item.name}</h3>
      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-primary-600">
          {formatCurrency(item.price)}
        </span>
        {!item.available && (
          <span className="text-xs text-red-500 font-medium">Unavailable</span>
        )}
      </div>
    </button>
  );
}
