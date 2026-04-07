import { NextRequest, NextResponse } from 'next/server';
import { IngredientService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

// GET all ingredients
export async function GET(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const ingredients = await IngredientService.getIngredients();
    return NextResponse.json({ ingredients });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json(
      { error: 'Lấy danh sách nguyên liệu thất bại' },
      { status: 500 }
    );
  }
}

// POST create new ingredient
export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    const { name, unit, costPrice, stock, minStock } = await request.json();

    const ingredient = await IngredientService.createIngredient({
      name,
      unit,
      costPrice: parseFloat(costPrice),
      stock: parseFloat(stock || 0),
      minStock: parseFloat(minStock || 0),
    });

    return NextResponse.json({ ingredient }, { status: 201 });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    const message = error instanceof Error ? error.message : 'Tạo nguyên liệu thất bại';
    const status = message.includes('bắt buộc') ? 400 :
                   message.includes('đã tồn tại') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

