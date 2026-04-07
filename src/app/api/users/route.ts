import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

// GET all users
export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (user instanceof NextResponse) return user;

    const roleCheck = authorizeRoles(user, ['owner']);
    if (roleCheck) return roleCheck;

    const users = await UserService.getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Lấy danh sách người dùng thất bại' },
      { status: 500 }
    );
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner']);
    if (roleCheck) return roleCheck;

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
    const message = error instanceof Error ? error.message : 'Tạo người dùng thất bại';
    const status = message.includes('bắt buộc') ? 400 :
                   message.includes('đã được sử dụng') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

