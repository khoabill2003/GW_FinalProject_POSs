import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services';
import { signJWT, createAuthCookie } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const user = await UserService.login({
      email: email?.toLowerCase(),
      password,
    });

    // Tạo JWT token
    const token = signJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      user,
      token,
      message: 'Đăng nhập thành công',
    });

    // Set httpOnly cookie
    response.headers.set('Set-Cookie', createAuthCookie(token));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi đăng nhập';
    const status = message.includes('bắt buộc') ? 400 :
                   message.includes('không đúng') ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
