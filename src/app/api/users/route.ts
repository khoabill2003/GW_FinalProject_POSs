import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services';

// GET all users
export async function GET() {
  try {
    const users = await UserService.getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json();

    const user = await UserService.createUser({
      name,
      email: email?.toLowerCase(),
      password,
      role,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    const message = error instanceof Error ? error.message : 'Failed to create user';
    const status = message.includes('bắt buộc') ? 400 :
                   message.includes('đã được sử dụng') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
