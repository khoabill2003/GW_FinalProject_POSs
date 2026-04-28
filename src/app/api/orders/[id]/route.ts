import { NextRequest, NextResponse } from 'next/server';
import * as OrderService from '@/lib/services/order.service';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

// GET single order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const order = await OrderService.getOrderById(params.id);

    if (!order) {
      return NextResponse.json(
        { error: 'Order không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Lấy thông tin đơn hàng thất bại' },
      { status: 500 }
    );
  }
}

// PUT update order
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const body = await request.json();
    
    const isPaymentOperation = Boolean(body.paymentMethod || body.paymentStatus === 'paid');

    // Payment operations: cashier/manager/owner only
    if (isPaymentOperation) {
      const roleCheck = authorizeRoles(authUser, ['owner', 'manager', 'cashier']);
      if (roleCheck) return roleCheck;

      const order = await OrderService.updateOrder(params.id, body);
      return NextResponse.json({ order });
    }

    // Non-payment operations: waiter/kitchen/manager/owner
    const roleCheck = authorizeRoles(authUser, ['owner', 'manager', 'waiter', 'kitchen']);
    if (roleCheck) return roleCheck;
    
    // Nếu có items mới → thêm món vào order
    if (body.addItems && Array.isArray(body.addItems) && body.addItems.length > 0) {
      const order = await OrderService.addItemsToOrder(params.id, body.addItems);
      return NextResponse.json({ order });
    }
    
    // Nếu yêu cầu xác nhận món mới
    if (body.confirmItems === true) {
      const order = await OrderService.confirmOrderItems(params.id, body.itemIds);
      return NextResponse.json({ order });
    }
    
    // Cập nhật thông tin order
    const order = await OrderService.updateOrder(params.id, body);
    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error updating order:', error);
    const message = error instanceof Error ? error.message : 'Cập nhật đơn hàng thất bại';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

// DELETE order
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    // Authorization: Only owner and manager can delete orders
    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    await OrderService.deleteOrder(params.id);
    return NextResponse.json({ message: 'Xóa đơn hàng thành công' });
  } catch (error) {
    console.error('Error deleting order:', error);
    const message = error instanceof Error ? error.message : 'Xóa đơn hàng thất bại';
    const status = message.includes('không tồn tại') ? 404 : 400;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
