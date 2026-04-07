import { NextRequest, NextResponse } from 'next/server';
import { MenuService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

// GET single menu item (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const menuItem = await MenuService.getMenuItemById(params.id);

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Món không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({ menuItem });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return NextResponse.json(
      { error: 'Lấy thông tin món thất bại' },
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
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

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
    const message = error instanceof Error ? error.message : 'Cập nhật món thất bại';
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
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    await MenuService.deleteMenuItem(params.id);
    return NextResponse.json({ message: 'Xóa món thành công' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    const message = error instanceof Error ? error.message : 'Xóa món thất bại';
    const status = message.includes('không tồn tại') ? 404 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
