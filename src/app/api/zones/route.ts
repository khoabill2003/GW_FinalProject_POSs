import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

// GET all zones (public)
export async function GET() {
  try {
    const zones = await ZoneService.getZones();
    return NextResponse.json({ zones });
  } catch (error) {
    console.error('Error fetching zones:', error);
    return NextResponse.json(
      { error: 'Lấy danh sách khu vực thất bại' },
      { status: 500 }
    );
  }
}

// POST create new zone
export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    const { name, description } = await request.json();

    const zone = await ZoneService.createZone({
      name,
      description,
    });

    return NextResponse.json(zone, { status: 201 });
  } catch (error) {
    console.error('Error creating zone:', error);
    const message = error instanceof Error ? error.message : 'Tạo khu vực thất bại';
    const status = message.includes('để trống') || message.includes('đã tồn tại') ? 400 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

