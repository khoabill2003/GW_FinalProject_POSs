import { NextRequest, NextResponse } from 'next/server';
import { MenuService } from '@/lib/services';

export const dynamic = 'force-dynamic';

// GET all menu items
export async function GET() {
  try {
    const menuItems = await MenuService.getMenuItems();
    return NextResponse.json({ menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}

// POST create new menu item
export async function POST(request: NextRequest) {
  try {
    const { name, description, price, categoryId, image, available, type, ingredients } = await request.json();

    const menuItem = await MenuService.createMenuItem({
      name,
      description,
      price: parseFloat(price),
      categoryId,
      image,
      available,
      type,
      ingredients,
    });

    return NextResponse.json({ menuItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    const message = error instanceof Error ? error.message : 'Failed to create menu item';
    const status = message.includes('bắt buộc') ? 400 : 
                   message.includes('không tồn tại') ? 404 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

