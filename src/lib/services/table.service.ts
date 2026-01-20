// Table Service - Business logic cho bàn
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';

export interface CreateTableInput {
  number: number;
  name?: string;
  capacity?: number;
  zoneId?: string;
}

export interface UpdateTableInput {
  number?: number;
  name?: string;
  capacity?: number;
  status?: string;
  zoneId?: string;
}

// Lấy tất cả bàn
export async function getTables(filters?: { zoneId?: string; status?: string }) {
  const whereClause: Record<string, unknown> = {};

  if (filters?.zoneId) {
    whereClause.zoneId = filters.zoneId;
  }

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  return prisma.table.findMany({
    where: whereClause,
    include: {
      zone: {
        select: { id: true, name: true }
      },
    },
    orderBy: { number: 'asc' },
  });
}

// Lấy bàn theo ID
export async function getTableById(id: string) {
  return prisma.table.findUnique({
    where: { id },
    include: {
      zone: {
        select: { id: true, name: true }
      },
    },
  });
}

// Tạo bàn mới
export async function createTable(input: CreateTableInput) {
  const { number, name, capacity, zoneId } = input;

  if (!number) {
    throw new Error('Số bàn là bắt buộc');
  }

  // Check table number exists
  const existingTable = await prisma.table.findUnique({ where: { number } });
  if (existingTable) {
    throw new Error('Số bàn đã tồn tại');
  }

  // Validate zone if provided
  if (zoneId) {
    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      throw new Error('Khu vực không tồn tại');
    }
  }

  const table = await prisma.table.create({
    data: {
      id: generateId(),
      number,
      name: name || null,
      capacity: capacity || 4,
      status: 'available',
      zoneId: zoneId || null,
    },
    include: {
      zone: {
        select: { id: true, name: true }
      }
    },
  });

  return table;
}

// Cập nhật bàn
export async function updateTable(id: string, input: UpdateTableInput) {
  const existingTable = await prisma.table.findUnique({ where: { id } });

  if (!existingTable) {
    throw new Error('Bàn không tồn tại');
  }

  // Check number unique if changing
  if (input.number !== undefined && input.number !== existingTable.number) {
    const numberConflict = await prisma.table.findFirst({
      where: {
        number: input.number,
        id: { not: id },
      },
    });
    if (numberConflict) {
      throw new Error('Số bàn đã tồn tại');
    }
  }

  const table = await prisma.table.update({
    where: { id },
    data: {
      ...(input.number !== undefined && { number: input.number }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.status && { status: input.status }),
      ...(input.zoneId !== undefined && { zoneId: input.zoneId }),
    },
    include: {
      zone: {
        select: { id: true, name: true }
      }
    },
  });

  return table;
}

// Xóa bàn
export async function deleteTable(id: string) {
  const existingTable = await prisma.table.findUnique({
    where: { id },
    include: {
      orders: {
        where: {
          status: {
            notIn: ['completed', 'cancelled'],
          },
        },
      },
    },
  });

  if (!existingTable) {
    throw new Error('Bàn không tồn tại');
  }

  // Check if table has active orders
  if (existingTable.orders.length > 0) {
    throw new Error('Không thể xóa bàn đang có đơn hàng');
  }

  await prisma.table.delete({ where: { id } });
  return true;
}

// Cập nhật trạng thái bàn
export async function updateTableStatus(id: string, status: string) {
  const validStatuses = ['available', 'occupied', 'reserved', 'unavailable'];
  if (!validStatuses.includes(status)) {
    throw new Error('Trạng thái không hợp lệ');
  }

  return prisma.table.update({
    where: { id },
    data: { status },
    include: {
      zone: {
        select: { id: true, name: true }
      }
    },
  });
}
