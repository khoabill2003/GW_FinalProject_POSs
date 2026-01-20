// Customer Service - Business logic cho khách hàng
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

// Lấy tất cả khách hàng
export async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

// Lấy khách hàng theo ID
export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

// Lấy khách hàng theo số điện thoại
export async function getCustomerByPhone(phone: string) {
  return prisma.customer.findUnique({
    where: { phone },
  });
}

// Tạo khách hàng mới
export async function createCustomer(input: CreateCustomerInput) {
  const { name, phone, email, address, notes } = input;

  if (!name) {
    throw new Error('Tên khách hàng là bắt buộc');
  }

  // Check phone unique
  if (phone) {
    const existingCustomer = await prisma.customer.findUnique({ where: { phone } });
    if (existingCustomer) {
      throw new Error('Số điện thoại đã tồn tại');
    }
  }

  const customer = await prisma.customer.create({
    data: {
      id: generateId(),
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
    },
  });

  return customer;
}

// Cập nhật khách hàng
export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const existingCustomer = await prisma.customer.findUnique({ where: { id } });

  if (!existingCustomer) {
    throw new Error('Khách hàng không tồn tại');
  }

  // Check phone unique if changing
  if (input.phone && input.phone !== existingCustomer.phone) {
    const phoneConflict = await prisma.customer.findUnique({ where: { phone: input.phone } });
    if (phoneConflict) {
      throw new Error('Số điện thoại đã tồn tại');
    }
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });

  return customer;
}

// Xóa khách hàng
export async function deleteCustomer(id: string) {
  const existingCustomer = await prisma.customer.findUnique({ where: { id } });

  if (!existingCustomer) {
    throw new Error('Khách hàng không tồn tại');
  }

  await prisma.customer.delete({ where: { id } });
  return true;
}
