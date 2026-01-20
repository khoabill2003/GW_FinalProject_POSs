// Ingredient Service - Business logic cho nguyên liệu
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';

export interface CreateIngredientInput {
  name: string;
  unit: string;
  costPrice: number;
  stock?: number;
  minStock?: number;
}

export interface UpdateIngredientInput {
  name?: string;
  unit?: string;
  costPrice?: number;
  stock?: number;
  minStock?: number;
}

// Lấy tất cả nguyên liệu
export async function getIngredients() {
  return prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
  });
}

// Lấy nguyên liệu theo ID
export async function getIngredientById(id: string) {
  return prisma.ingredient.findUnique({
    where: { id },
  });
}

// Tạo nguyên liệu mới
export async function createIngredient(input: CreateIngredientInput) {
  const { name, unit, costPrice, stock, minStock } = input;

  if (!name || !unit || costPrice === undefined) {
    throw new Error('Tên, đơn vị và giá là bắt buộc');
  }

  // Check name unique
  const existingIngredient = await prisma.ingredient.findFirst({
    where: { name },
  });

  if (existingIngredient) {
    throw new Error('Tên nguyên liệu đã tồn tại');
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      id: generateId(),
      name,
      unit,
      costPrice,
      stock: stock || 0,
      minStock: minStock || 0,
    },
  });

  return ingredient;
}

// Cập nhật nguyên liệu
export async function updateIngredient(id: string, input: UpdateIngredientInput) {
  const existingIngredient = await prisma.ingredient.findUnique({ where: { id } });

  if (!existingIngredient) {
    throw new Error('Nguyên liệu không tồn tại');
  }

  // Check name unique if changing
  if (input.name && input.name !== existingIngredient.name) {
    const nameConflict = await prisma.ingredient.findFirst({
      where: {
        name: input.name,
        id: { not: id },
      },
    });
    if (nameConflict) {
      throw new Error('Tên nguyên liệu đã tồn tại');
    }
  }

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.unit && { unit: input.unit }),
      ...(input.costPrice !== undefined && { costPrice: input.costPrice }),
      ...(input.stock !== undefined && { stock: input.stock }),
      ...(input.minStock !== undefined && { minStock: input.minStock }),
    },
  });

  return ingredient;
}

// Xóa nguyên liệu
export async function deleteIngredient(id: string) {
  const existingIngredient = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      menuItems: true,
    },
  });

  if (!existingIngredient) {
    throw new Error('Nguyên liệu không tồn tại');
  }

  // Check if ingredient is used in any menu items
  if (existingIngredient.menuItems.length > 0) {
    throw new Error('Không thể xóa nguyên liệu đang được sử dụng trong món ăn');
  }

  await prisma.ingredient.delete({ where: { id } });
  return true;
}

// Cập nhật số lượng tồn kho
export async function updateStock(id: string, quantity: number, type: 'add' | 'subtract') {
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });

  if (!ingredient) {
    throw new Error('Nguyên liệu không tồn tại');
  }

  const newStock = type === 'add' 
    ? ingredient.stock + quantity 
    : ingredient.stock - quantity;

  if (newStock < 0) {
    throw new Error('Số lượng tồn kho không thể âm');
  }

  return prisma.ingredient.update({
    where: { id },
    data: { stock: newStock },
  });
}

// Lấy nguyên liệu sắp hết hàng
export async function getLowStockIngredients() {
  return prisma.ingredient.findMany({
    where: {
      stock: {
        lte: prisma.ingredient.fields.minStock,
      },
    },
    orderBy: { stock: 'asc' },
  });
}
