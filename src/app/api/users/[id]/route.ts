import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services';

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await UserService.getUserById(params.id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, email, password, role } = await request.json();

    const user = await UserService.updateUser(params.id, {
      name,
      email: email?.toLowerCase(),
      password,
      role,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    const message = error instanceof Error ? error.message : 'Failed to update user';
    const status = message.includes('không tồn tại') ? 404 :
                   message.includes('đã được sử dụng') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await UserService.deleteUser(params.id);
    return NextResponse.json({ message: 'Xoá người dùng thành công' });
  } catch (error) {
    console.error('Error deleting user:', error);
    const message = error instanceof Error ? error.message : 'Xoá người dùng thất bại';
    const status = message.includes('không tồn tại') ? 404 :
                   message.includes('Owner') ? 403 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
