// Auth Middleware - Xác thực và phân quyền
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ============================================================================
// JWT CONFIG
// ============================================================================
const JWT_SECRET = process.env.JWT_SECRET || 'restaurant-pos-default-secret-change-in-production';
const JWT_EXPIRES_IN = 24 * 60 * 60; // 24 giờ (giây)
const COOKIE_NAME = 'pos_token';

// ============================================================================
// JWT UTILITIES
// ============================================================================

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

/** Tạo JWT token */
export function signJWT(payload: { id: string; email: string; name: string; role: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = { ...payload, iat: now, exp: now + JWT_EXPIRES_IN };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/** Xác thực JWT token, trả về payload hoặc null */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    // Timing-safe comparison
    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as JWTPayload;

    // Kiểm tra hết hạn
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Tạo Set-Cookie header cho JWT */
export function createAuthCookie(token: string): string {
  const maxAge = JWT_EXPIRES_IN;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

/** Tạo Set-Cookie header để xóa JWT cookie */
export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ============================================================================
// REQUEST AUTHENTICATION
// ============================================================================

/**
 * Xác thực request từ JWT cookie hoặc Authorization header.
 * Trả về user payload nếu hợp lệ, null nếu không.
 */
export function getAuthUser(req: NextRequest): JWTPayload | null {
  // 1. Thử đọc từ cookie
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) {
    const payload = verifyJWT(cookieToken);
    if (payload) return payload;
  }

  // 2. Thử đọc từ Authorization header (Bearer token)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyJWT(token);
    if (payload) return payload;
  }

  return null;
}

/**
 * Xác thực request - trả về user hoặc Response 401.
 * Dùng trong API routes: const user = authenticateRequest(req); if (user instanceof NextResponse) return user;
 */
export function authenticateRequest(req: NextRequest): JWTPayload | NextResponse {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Chưa đăng nhập. Vui lòng đăng nhập lại.' },
      { status: 401 }
    );
  }
  return user;
}

/**
 * Kiểm tra quyền - trả về null nếu OK, hoặc Response 403.
 */
export function authorizeRoles(user: JWTPayload, allowedRoles: string[]): NextResponse | null {
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Không có quyền thực hiện thao tác này' },
      { status: 403 }
    );
  }
  return null;
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

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

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

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
