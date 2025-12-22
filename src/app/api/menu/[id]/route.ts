import { NextRequest, NextResponse } from 'next/server';
import { MenuService } from '@/lib/services';

// GET single menu item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const menuItem = await MenuService.getMenuItemById(params.id);

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ menuItem });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu item' },
      { status: 500 }
    );
  }
}

// PUT update menu item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, description, price, categoryId, image, available, type, ingredients } = await request.json();

    const menuItem = await MenuService.updateMenuItem(params.id, {
      name,
      description,
      price: price !== undefined ? parseFloat(price) : undefined,
      categoryId,
      image,
      available,
      type,
      ingredients,
    });

    return NextResponse.json({ menuItem });
  } catch (error) {
    console.error('Error updating menu item:', error);
    const message = error instanceof Error ? error.message : 'Failed to update menu item';
    const status = message.includes('không tồn tại') ? 404 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// DELETE menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await MenuService.deleteMenuItem(params.id);
    return NextResponse.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete menu item';
    const status = message.includes('không tồn tại') ? 404 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
