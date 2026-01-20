import { NextRequest, NextResponse } from 'next/server';
import { IngredientService } from '@/lib/services';

export const dynamic = 'force-dynamic';

// GET all ingredients
export async function GET() {
  try {
    const ingredients = await IngredientService.getIngredients();
    return NextResponse.json({ ingredients });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}

// POST create new ingredient
export async function POST(request: NextRequest) {
  try {
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
    const message = error instanceof Error ? error.message : 'Failed to create ingredient';
    const status = message.includes('bắt buộc') ? 400 :
                   message.includes('đã tồn tại') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

