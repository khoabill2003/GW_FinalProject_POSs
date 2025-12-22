// Auth Middleware - Xác thực và phân quyền
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Password verification
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Nếu password chưa được hash (legacy), so sánh trực tiếp
  if (!hashedPassword.startsWith('$2')) {
    return password === hashedPassword;
  }
  return bcrypt.compare(password, hashedPassword);
}

// Role hierarchy
export const ROLE_LEVELS: Record<string, number> = {
  owner: 100,
  manager: 50,
  waiter: 35,
  kitchen: 30,
  cashier: 25,
};

// Check if user has required role
export function hasRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_LEVELS[userRole] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

// Check if user has any of the required roles
export function hasAnyRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

// Order status permissions
export const ORDER_STATUS_PERMISSIONS: Record<string, string[]> = {
  // status change: [allowed roles]
  'pending->confirmed': ['owner', 'manager', 'waiter'],
  'confirmed->preparing': ['owner', 'manager', 'kitchen'],
  'preparing->ready': ['owner', 'manager', 'kitchen'],
  'ready->served': ['owner', 'manager', 'waiter'],
  'served->completed': ['owner', 'manager', 'cashier'],
  'any->cancelled': ['owner', 'manager'],
};

// Check if user can change order status
export function canChangeOrderStatus(
  userRole: string,
  fromStatus: string,
  toStatus: string
): boolean {
  // Owner và Manager có thể làm mọi thứ
  if (userRole === 'owner' || userRole === 'manager') {
    return true;
  }

  // Check specific permission
  const permissionKey = toStatus === 'cancelled' 
    ? 'any->cancelled' 
    : `${fromStatus}->${toStatus}`;
  
  const allowedRoles = ORDER_STATUS_PERMISSIONS[permissionKey] || [];
  return allowedRoles.includes(userRole);
}

// Check if user can process payment
export function canProcessPayment(userRole: string): boolean {
  return ['owner', 'manager', 'cashier'].includes(userRole);
}

// Middleware to require authentication (placeholder - cần implement JWT/session)
export function requireAuth() {
  return (req: NextRequest) => {
    // TODO: Implement proper JWT/session validation
    // Hiện tại chỉ check header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return null; // Proceed
  };
}

// Middleware to require specific roles
export function requireRole(allowedRoles: string[]) {
  return (userRole: string) => {
    if (!hasAnyRole(userRole, allowedRoles)) {
      return NextResponse.json(
        { error: 'Forbidden - Không có quyền thực hiện' },
        { status: 403 }
      );
    }
    return null; // Proceed
  };
}
