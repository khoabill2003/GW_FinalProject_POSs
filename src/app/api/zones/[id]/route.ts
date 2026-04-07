import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

// GET single zone (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const zone = await ZoneService.getZoneById(params.id);

    if (!zone) {
      return NextResponse.json(
        { error: 'Không tìm thấy khu vực' },
        { status: 404 }
      );
    }

    return NextResponse.json(zone);
  } catch (error) {
    console.error('Error fetching zone:', error);
    return NextResponse.json(
      { error: 'Lấy thông tin khu vực thất bại' },
      { status: 500 }
    );
  }
}

// PUT update zone
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    const { name, description } = await request.json();

    const zone = await ZoneService.updateZone(params.id, {
      name,
      description,
    });

    return NextResponse.json(zone);
  } catch (error) {
    console.error('Error updating zone:', error);
    const message = error instanceof Error ? error.message : 'Cập nhật khu vực thất bại';
    const status = message.includes('không tồn tại') ? 404 :
                   message.includes('đã tồn tại') ? 400 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// DELETE zone
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    await ZoneService.deleteZone(params.id);
    return NextResponse.json({ message: 'Đã xóa khu vực' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    const message = error instanceof Error ? error.message : 'Xóa khu vực thất bại';
    const status = message.includes('không tồn tại') ? 404 :
                   message.includes('đang có') ? 400 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
