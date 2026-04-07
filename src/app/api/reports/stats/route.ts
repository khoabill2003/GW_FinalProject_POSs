import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

// GET /api/reports/stats - Thống kê doanh thu
export async function GET(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    const stats = await OrderService.getOrderStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return NextResponse.json(
      { error: 'Lấy thống kê thất bại' },
      { status: 500 }
    );
  }
}
