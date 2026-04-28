import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Public self-registration is DISABLED for security.
 * Only owner can create new users via the /api/users endpoint.
 * 
 * This endpoint returns 403 Forbidden.
 */
export async function POST(request: NextRequest) {
  try {
    // Self-registration is disabled
    return NextResponse.json(
      { 
        error: 'Tự đăng ký không được phép. Chỉ chủ nhà hàng (owner) mới có thể tạo tài khoản mới. Vui lòng liên hệ quản trị viên.' 
      },
      { status: 403 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Tự đăng ký không khả dụng' },
      { status: 403 }
    );
  }
}
