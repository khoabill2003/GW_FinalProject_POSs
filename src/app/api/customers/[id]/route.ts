import { NextRequest, NextResponse } from 'next/server';
import { CustomerService } from '@/lib/services';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET single customer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const customer = await CustomerService.getCustomerById(params.id);

    if (!customer) {
      return NextResponse.json(
        { error: 'Khách hàng không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Lấy thông tin khách hàng thất bại' },
      { status: 500 }
    );
  }
}

// PUT update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const { name, phone, email, address, notes } = await request.json();

    const customer = await CustomerService.updateCustomer(params.id, {
      name,
      phone,
      email,
      address,
      notes,
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error updating customer:', error);
    const message = error instanceof Error ? error.message : 'Cập nhật khách hàng thất bại';
    const status = message.includes('không tồn tại') ? 404 :
                   message.includes('đã tồn tại') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// DELETE customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    await CustomerService.deleteCustomer(params.id);
    return NextResponse.json({ message: 'Xóa khách hàng thành công' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    const message = error instanceof Error ? error.message : 'Xóa khách hàng thất bại';
    const status = message.includes('không tồn tại') ? 404 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
