import { NextResponse } from 'next/server';
import { CategoryService } from '@/lib/services';

export const dynamic = 'force-dynamic';

// GET all categories (public - cho POS và khách xem menu)
export async function GET() {
  try {
    const categories = await CategoryService.getCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Lấy danh sách danh mục thất bại' },
      { status: 500 }
    );
  }
}
