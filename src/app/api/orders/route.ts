/**
 * ============================================================================
 * ORDER API ROUTES - CRUD đơn hàng
 * ============================================================================
 * 
 * ENDPOINTS:
 * - GET  /api/orders       : Lấy danh sách đơn hàng (có filter)
 * - POST /api/orders       : Tạo đơn hàng mới
 * - PUT  /api/orders/{id}  : Cập nhật đơn hàng (file riêng)
 * - DELETE /api/orders/{id}: Xóa đơn hàng (file riêng)
 * 
 * KIẾN TRÚC:
 * - Route handler gọi tới Service layer (Order Service)
 * - Service layer chứa business logic + tương tác DB qua Prisma
 * - Tách biệt route và logic để dễ test và maintain
 * 
 * TẠI SAO DÙNG SERVICE LAYER?
 * - Dễ reuse logic giữa các routes
 * - Dễ viết unit tests
 * - Giữ route handlers ngắn gọn
 */
import { NextRequest, NextResponse } from 'next/server';
import * as OrderService from '@/lib/services/order.service';

// Force dynamic rendering (không cache static)
export const dynamic = 'force-dynamic';

// ============================================================================
// GET - Lấy danh sách đơn hàng
// ============================================================================
/**
 * QUERY PARAMS (all optional):
 * - status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed'
 * - paymentStatus: 'unpaid' | 'paid'
 * - today: 'true' để chỉ lấy đơn hôm nay
 * - tableId: Lấy đơn của bàn cụ thể
 * - activeOnly: 'true' để lấy đơn đang active của bàn
 * 
 * VÍ DỤ:
 * GET /api/orders?status=preparing&today=true
 * -> Lấy tất cả đơn đang chuẩn bị hôm nay
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query params từ URL
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;
    const today = searchParams.get('today') === 'true';
    const tableId = searchParams.get('tableId') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // SPECIAL CASE: Lấy order active của bàn (để nối đơn)
    if (tableId && activeOnly) {
      const order = await OrderService.getActiveOrderByTableId(tableId);
      return NextResponse.json({ order });
    }

    // NORMAL: Lấy danh sách orders theo filter
    const orders = await OrderService.getOrders({
      status,
      paymentStatus,
      today,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Tạo đơn hàng mới
// ============================================================================
/**
 * REQUEST BODY:
 * {
 *   items: [{ menuItemId, quantity, notes? }],
 *   tableId?: string,
 *   customerId?: string,
 *   notes?: string,
 *   paymentMethod?: 'cash' | 'card' | 'vnpay',
 *   paymentStatus?: 'unpaid' | 'paid'
 * }
 * 
 * FLOW:
 * 1. Validate request body
 * 2. Gọi OrderService.createOrder()
 * 3. Service tạo Order + OrderItems trong transaction
 * 4. Cập nhật Table status = 'occupied'
 * 5. Return order mới tạo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const order = await OrderService.createOrder(body);
    return NextResponse.json({ order }, { status: 201 }); // 201 = Created
  } catch (error) {
    console.error('Error creating order:', error);
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return NextResponse.json(
      { error: message },
      { status: 400 }  // 400 = Bad Request (client error)
    );
  }
}

