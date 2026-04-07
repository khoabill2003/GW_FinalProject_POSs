import { NextRequest, NextResponse } from 'next/server';
import { TableService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

// GET single table (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const table = await TableService.getTableById(params.id);

    if (!table) {
      return NextResponse.json(
        { error: 'Bàn không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json(
      { error: 'Lấy thông tin bàn thất bại' },
      { status: 500 }
    );
  }
}

// PUT update table
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const { number, name, capacity, status, zoneId } = await request.json();
    
    const table = await TableService.updateTable(params.id, {
      number: number ? parseInt(number) : undefined,
      name,
      capacity: capacity ? parseInt(capacity) : undefined,
      status,
      zoneId,
    });

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error updating table:', error);
    const message = error instanceof Error ? error.message : 'Cập nhật bàn thất bại';
    const status = message.includes('không tồn tại') ? 404 : 
                   message.includes('đã tồn tại') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// DELETE table
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    await TableService.deleteTable(params.id);
    return NextResponse.json({ message: 'Xóa bàn thành công' });
  } catch (error) {
    console.error('Error deleting table:', error);
    const message = error instanceof Error ? error.message : 'Xóa bàn thất bại';
    const status = message.includes('không tồn tại') ? 404 : 
                   message.includes('đang có đơn hàng') ? 400 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
