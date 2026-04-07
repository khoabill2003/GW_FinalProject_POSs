import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services';
import { signJWT, createAuthCookie } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate password length
    if (password && password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    const user = await UserService.createUser({
      name,
      email: email?.toLowerCase(),
      password,
      role: 'waiter', // Default role for new registrations
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
      message: 'Đăng ký thành công',
    });

    // Set httpOnly cookie
    response.headers.set('Set-Cookie', createAuthCookie(token));

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi đăng ký';
    const status = message.includes('bắt buộc') ? 400 :
                   message.includes('đã được sử dụng') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
