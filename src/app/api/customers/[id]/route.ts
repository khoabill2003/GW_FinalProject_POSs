import { NextRequest, NextResponse } from 'next/server';
import { CustomerService } from '@/lib/services';

// GET single customer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await CustomerService.getCustomerById(params.id);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
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
    const message = error instanceof Error ? error.message : 'Failed to update customer';
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
    await CustomerService.deleteCustomer(params.id);
    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete customer';
    const status = message.includes('không tồn tại') ? 404 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
