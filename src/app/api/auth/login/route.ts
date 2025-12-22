import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const user = await UserService.login({
      email: email?.toLowerCase(),
      password,
    });

    return NextResponse.json({
      user,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred during login';
    const status = message.includes('bắt buộc') ? 400 :
                   message.includes('không đúng') ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
