import { NextRequest, NextResponse } from 'next/server';
import { CustomerService } from '@/lib/services';
import { authenticateRequest } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

// GET all customers (public - cần cho POS và đặt bàn)
export async function GET() {
  try {
    const customers = await CustomerService.getCustomers();
    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Lấy danh sách khách hàng thất bại' },
      { status: 500 }
    );
  }
}

// POST create new customer
export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const { name, phone, email, address, notes } = await request.json();

    const customer = await CustomerService.createCustomer({
      name,
      phone,
      email,
      address,
      notes,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    const message = error instanceof Error ? error.message : 'Tạo khách hàng thất bại';
    const status = message.includes('bắt buộc') ? 400 :
                   message.includes('đã tồn tại') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

