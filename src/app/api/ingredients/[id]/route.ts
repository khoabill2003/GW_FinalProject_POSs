import { NextRequest, NextResponse } from 'next/server';
import { IngredientService } from '@/lib/services';

// GET single ingredient
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ingredient = await IngredientService.getIngredientById(params.id);

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ingredient });
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredient' },
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
    const message = error instanceof Error ? error.message : 'Failed to update ingredient';
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
    await IngredientService.deleteIngredient(params.id);
    return NextResponse.json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete ingredient';
    const status = message.includes('không tồn tại') ? 404 :
                   message.includes('đang được sử dụng') ? 400 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
