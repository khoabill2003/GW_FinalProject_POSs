import { NextRequest, NextResponse } from 'next/server';
import * as OrderService from '@/lib/services/order.service';

// GET all orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;
    const today = searchParams.get('today') === 'true';

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

// POST create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const order = await OrderService.createOrder(body);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
