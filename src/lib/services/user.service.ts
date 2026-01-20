// User Service - Business logic cho người dùng
import prisma from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/middleware/auth';
import { generateId } from '@/lib/utils';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// Lấy tất cả users
export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Lấy user theo ID
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Lấy user theo email
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

// Tạo user mới
export async function createUser(input: CreateUserInput) {
  const { email, password, name, role } = input;

  // Validate
  if (!email || !password || !name) {
    throw new Error('Email, password và tên là bắt buộc');
  }

  // Check email exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email đã được sử dụng');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      id: generateId(),
      email,
      password: hashedPassword,
      name,
      role: role || 'waiter',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

// Cập nhật user
export async function updateUser(id: string, input: UpdateUserInput) {
  const existingUser = await prisma.user.findUnique({ where: { id } });

  if (!existingUser) {
    throw new Error('User không tồn tại');
  }

  // Check email unique
  if (input.email && input.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailExists) {
      throw new Error('Email đã được sử dụng');
    }
  }

  // Hash password if provided
  let hashedPassword: string | undefined;
  if (input.password) {
    hashedPassword = await hashPassword(input.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.email && { email: input.email }),
      ...(hashedPassword && { password: hashedPassword }),
      ...(input.name && { name: input.name }),
      ...(input.role && { role: input.role }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

// Xóa user
export async function deleteUser(id: string) {
  const existingUser = await prisma.user.findUnique({ where: { id } });

  if (!existingUser) {
    throw new Error('User không tồn tại');
  }

  // Prevent deleting owner
  if (existingUser.role === 'owner') {
    throw new Error('Không thể xóa tài khoản Owner');
  }

  await prisma.user.delete({ where: { id } });
  return true;
}

// Login
export async function login(input: LoginInput) {
  const { email, password } = input;

  if (!email || !password) {
    throw new Error('Email và password là bắt buộc');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Email hoặc password không đúng');
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('Email hoặc password không đúng');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
