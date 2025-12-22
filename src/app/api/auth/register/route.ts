import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate password length
    if (password && password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const user = await UserService.createUser({
      name,
      email: email?.toLowerCase(),
      password,
      role: 'waiter', // Default role for new registrations
    });

    return NextResponse.json({
      user,
      message: 'Registration successful',
    });
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred during registration';
    const status = message.includes('bắt buộc') ? 400 :
                   message.includes('đã được sử dụng') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
