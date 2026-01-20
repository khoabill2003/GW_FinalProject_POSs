// Menu Service - Business logic cho menu
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';

export interface CreateMenuItemInput {
  name: string;
  description?: string;
  price: number;
  image?: string;
  categoryId: string;
  available?: boolean;
  type?: string;
  ingredients?: {
    ingredientId: string;
    quantity: number;
  }[];
}

export interface UpdateMenuItemInput {
  name?: string;
  description?: string;
  price?: number;
  image?: string;
  categoryId?: string;
  available?: boolean;
  type?: string;
  ingredients?: {
    ingredientId: string;
    quantity: number;
  }[];
}

// Lấy tất cả menu items
export async function getMenuItems(filters?: { categoryId?: string; available?: boolean }) {
  const whereClause: Record<string, unknown> = {};

  if (filters?.categoryId) {
    whereClause.categoryId = filters.categoryId;
  }

  if (filters?.available !== undefined) {
    whereClause.available = filters.available;
  }

  return prisma.menuItem.findMany({
    where: whereClause,
    include: {
      category: {
        select: { id: true, name: true }
      },
    },
    orderBy: { name: 'asc' },
  });
}

// Lấy menu item theo ID
export async function getMenuItemById(id: string) {
  return prisma.menuItem.findUnique({
    where: { id },
    include: {
      category: {
        select: { id: true, name: true }
      },
    },
  });
}

// Tạo menu item mới
export async function createMenuItem(input: CreateMenuItemInput) {
  const { name, description, price, image, categoryId, available, type, ingredients } = input;

  if (!name || !price || !categoryId) {
    throw new Error('Tên, giá và danh mục là bắt buộc');
  }

  // Check category exists
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new Error('Danh mục không tồn tại');
  }

  const menuItem = await prisma.menuItem.create({
    data: {
      id: generateId(),
      name,
      description: description || null,
      price,
      image: image || null,
      categoryId,
      available: available ?? true,
      type: type || 'single',
      ...(ingredients && ingredients.length > 0 && {
        ingredients: {
          create: ingredients.map((ing) => ({
            id: generateId(),
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
          })),
        },
      }),
    },
    include: {
      category: {
        select: { id: true, name: true }
      },
    },
  });

  return menuItem;
}

// Cập nhật menu item
export async function updateMenuItem(id: string, input: UpdateMenuItemInput) {
  const existingItem = await prisma.menuItem.findUnique({ where: { id } });

  if (!existingItem) {
    throw new Error('Món không tồn tại');
  }

  // If updating ingredients, delete existing and create new
  if (input.ingredients !== undefined) {
    await prisma.menuItemIngredient.deleteMany({
      where: { menuItemId: id },
    });
  }

  const menuItem = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.image !== undefined && { image: input.image }),
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.available !== undefined && { available: input.available }),
      ...(input.type && { type: input.type }),
      ...(input.ingredients && input.ingredients.length > 0 && {
        ingredients: {
          create: input.ingredients.map((ing) => ({
            id: generateId(),
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
          })),
        },
      }),
    },
    include: {
      category: {
        select: { id: true, name: true }
      },
    },
  });

  return menuItem;
}

// Xóa menu item
export async function deleteMenuItem(id: string) {
  const existingItem = await prisma.menuItem.findUnique({ where: { id } });

  if (!existingItem) {
    throw new Error('Món không tồn tại');
  }

  // Delete ingredient relations first
  await prisma.menuItemIngredient.deleteMany({
    where: { menuItemId: id },
  });

  await prisma.menuItem.delete({ where: { id } });
  return true;
}

// Tính giá vốn của món
export async function calculateItemCost(id: string): Promise<number> {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      ingredients: {
        include: { ingredient: true },
      },
    },
  });

  if (!menuItem) {
    throw new Error('Món không tồn tại');
  }

  let totalCost = 0;
  for (const menuIngredient of menuItem.ingredients) {
    totalCost += menuIngredient.quantity * menuIngredient.ingredient.costPrice;
  }

  return totalCost;
}
