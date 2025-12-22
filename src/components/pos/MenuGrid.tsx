'use client';

import { MenuItem } from '@/types';
import MenuItemCard from './MenuItemCard';

interface MenuGridProps {
  items: MenuItem[];
}

export default function MenuGrid({ items }: MenuGridProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
      {items.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No items found in this category
        </div>
      )}
    </div>
  );
}
