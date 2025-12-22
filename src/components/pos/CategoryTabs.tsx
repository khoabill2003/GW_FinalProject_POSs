'use client';

import { Category } from '@/types';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export default function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => onSelectCategory(null)}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            selectedCategory === null
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🍽️ All Items
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
