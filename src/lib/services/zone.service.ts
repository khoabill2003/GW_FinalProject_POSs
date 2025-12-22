// Zone Service - Business logic cho khu vực
import prisma from '@/lib/db';

export interface CreateZoneInput {
  name: string;
  description?: string;
}

export interface UpdateZoneInput {
  name?: string;
  description?: string;
}

// Lấy tất cả khu vực
export async function getZones() {
  return prisma.zone.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { tables: true },
      },
    },
  });
}

// Lấy khu vực theo ID
export async function getZoneById(id: string) {
  return prisma.zone.findUnique({
    where: { id },
    include: {
      tables: true,
    },
  });
}

// Tạo khu vực mới
export async function createZone(input: CreateZoneInput) {
  const { name, description } = input;

  if (!name || name.trim() === '') {
    throw new Error('Tên khu vực không được để trống');
  }

  // Check name unique
  const existingZone = await prisma.zone.findUnique({
    where: { name: name.trim() },
  });

  if (existingZone) {
    throw new Error('Tên khu vực đã tồn tại');
  }

  const zone = await prisma.zone.create({
    data: {
      name: name.trim(),
      description: description || null,
    },
  });

  return zone;
}

// Cập nhật khu vực
export async function updateZone(id: string, input: UpdateZoneInput) {
  const existingZone = await prisma.zone.findUnique({ where: { id } });

  if (!existingZone) {
    throw new Error('Khu vực không tồn tại');
  }

  // Check name unique if changing
  if (input.name && input.name !== existingZone.name) {
    const nameConflict = await prisma.zone.findUnique({
      where: { name: input.name.trim() },
    });
    if (nameConflict) {
      throw new Error('Tên khu vực đã tồn tại');
    }
  }

  const zone = await prisma.zone.update({
    where: { id },
    data: {
      name: input.name?.trim() || existingZone.name,
      description: input.description !== undefined ? input.description : existingZone.description,
    },
  });

  return zone;
}

// Xóa khu vực
export async function deleteZone(id: string) {
  const zone = await prisma.zone.findUnique({
    where: { id },
    include: {
      _count: { select: { tables: true } },
    },
  });

  if (!zone) {
    throw new Error('Khu vực không tồn tại');
  }

  if (zone._count.tables > 0) {
    throw new Error(`Không thể xóa khu vực đang có ${zone._count.tables} bàn`);
  }

  await prisma.zone.delete({ where: { id } });
  return true;
}
