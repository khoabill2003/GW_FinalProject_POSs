import { NextRequest, NextResponse } from 'next/server';
import * as OrderService from '@/lib/services/order.service';

// GET single order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      { error: 'Failed to fetch order' },
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
    const body = await request.json();
    
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
    const message = error instanceof Error ? error.message : 'Failed to update order';
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
    await OrderService.deleteOrder(params.id);
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete order';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
