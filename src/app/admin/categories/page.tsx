'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/types';

export default function CategoriesManagement() {
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategoryList(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          + Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryList.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">{category.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-500">Order: {category.order}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:text-primary-600">
                ✏️
              </button>
              <button className="p-2 text-gray-500 hover:text-red-600">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
