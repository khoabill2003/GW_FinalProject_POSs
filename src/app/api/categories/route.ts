import { NextResponse } from 'next/server';
import { CategoryService } from '@/lib/services';

// GET all categories
export async function GET() {
  try {
    const categories = await CategoryService.getCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
