import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner']);
    if (roleCheck) return roleCheck;

    const user = await UserService.getUserById(params.id);

    if (!user) {
      return NextResponse.json(
        { error: 'Người dùng không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Lấy thông tin người dùng thất bại' },
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
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner']);
    if (roleCheck) return roleCheck;

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
    const message = error instanceof Error ? error.message : 'Cập nhật người dùng thất bại';
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
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner']);
    if (roleCheck) return roleCheck;

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
