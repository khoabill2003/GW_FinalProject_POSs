// Category Service - Business logic cho danh mục
import prisma from '@/lib/db';

export interface CreateCategoryInput {
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  order?: number;
}

// Lấy tất cả danh mục
export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { menuItems: true },
      },
    },
  });
}

// Lấy danh mục theo ID
export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: {
      menuItems: true,
    },
  });
}

// Tạo danh mục mới
export async function createCategory(input: CreateCategoryInput) {
  const { name, description, order } = input;

  if (!name || name.trim() === '') {
    throw new Error('Tên danh mục không được để trống');
  }

  // Check name unique
  const existingCategory = await prisma.category.findFirst({
    where: { name: name.trim() },
  });

  if (existingCategory) {
    throw new Error('Tên danh mục đã tồn tại');
  }

  // Get max order if not provided
  let categoryOrder = order;
  if (categoryOrder === undefined) {
    const maxOrder = await prisma.category.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    categoryOrder = (maxOrder?.order || 0) + 1;
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      description: description || null,
      order: categoryOrder,
    },
  });

  return category;
}

// Cập nhật danh mục
export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existingCategory = await prisma.category.findUnique({ where: { id } });

  if (!existingCategory) {
    throw new Error('Danh mục không tồn tại');
  }

  // Check name unique if changing
  if (input.name && input.name !== existingCategory.name) {
    const nameConflict = await prisma.category.findFirst({
      where: {
        name: input.name.trim(),
        id: { not: id },
      },
    });
    if (nameConflict) {
      throw new Error('Tên danh mục đã tồn tại');
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.order !== undefined && { order: input.order }),
    },
  });

  return category;
}

// Xóa danh mục
export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { menuItems: true } },
    },
  });

  if (!category) {
    throw new Error('Danh mục không tồn tại');
  }

  if (category._count.menuItems > 0) {
    throw new Error(`Không thể xóa danh mục đang có ${category._count.menuItems} món`);
  }

  await prisma.category.delete({ where: { id } });
  return true;
}
