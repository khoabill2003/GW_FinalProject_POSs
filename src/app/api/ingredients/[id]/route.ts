import { NextRequest, NextResponse } from 'next/server';
import { IngredientService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

// GET single ingredient
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const ingredient = await IngredientService.getIngredientById(params.id);

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Nguyên liệu không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ingredient });
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    return NextResponse.json(
      { error: 'Lấy thông tin nguyên liệu thất bại' },
      { status: 500 }
    );
  }
}

// PUT update ingredient
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    const { name, unit, costPrice, stock, minStock } = await request.json();

    const ingredient = await IngredientService.updateIngredient(params.id, {
      name,
      unit,
      costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
      stock: stock !== undefined ? parseFloat(stock) : undefined,
      minStock: minStock !== undefined ? parseFloat(minStock) : undefined,
    });

    return NextResponse.json({ ingredient });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    const message = error instanceof Error ? error.message : 'Cập nhật nguyên liệu thất bại';
    const status = message.includes('không tồn tại') ? 404 :
                   message.includes('đã tồn tại') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// DELETE ingredient
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    await IngredientService.deleteIngredient(params.id);
    return NextResponse.json({ message: 'Xóa nguyên liệu thành công' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    const message = error instanceof Error ? error.message : 'Xóa nguyên liệu thất bại';
    const status = message.includes('không tồn tại') ? 404 :
                   message.includes('đang được sử dụng') ? 400 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
