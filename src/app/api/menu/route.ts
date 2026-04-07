import { NextRequest, NextResponse } from 'next/server';
import { MenuService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

// GET all menu items (public - cho POS và khách xem menu)
export async function GET() {
  try {
    const menuItems = await MenuService.getMenuItems();
    return NextResponse.json({ menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Lấy danh sách món thất bại' },
      { status: 500 }
    );
  }
}

// POST create new menu item
export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

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
    const message = error instanceof Error ? error.message : 'Tạo món thất bại';
    const status = message.includes('bắt buộc') ? 400 : 
                   message.includes('không tồn tại') ? 404 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

