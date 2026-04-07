import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest, authorizeRoles } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

// GET single reservation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      include: {
        table: { select: { id: true, number: true, capacity: true, zone: { select: { name: true } } } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, image: true } },
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json({ error: 'Failed to fetch reservation' }, { status: 500 });
  }
}

// PUT - update reservation status (confirm, seat, cancel)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const body = await request.json();
    const { status } = body;

    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                ingredients: { include: { ingredient: true } },
              },
            },
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // If confirming → mark table as reserved
    if (status === 'confirmed') {
      await prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'reserved' },
      });
    }

    // If seating the customer → create an order from pre-ordered items
    if (status === 'seated') {
      // Create or find a customer
      let customer = await prisma.customer.findFirst({
        where: { phone: reservation.customerPhone },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            id: 'cust-' + Date.now().toString(36) + Math.random().toString(36).substring(2),
            name: reservation.customerName,
            phone: reservation.customerPhone,
            email: reservation.customerEmail,
          },
        });
      }

      // Generate order number
      const lastOrder = await prisma.order.findFirst({ orderBy: { orderNumber: 'desc' } });
      const orderNumber = (lastOrder?.orderNumber || 0) + 1;

      // Calculate totals from pre-ordered items
      let subtotal = 0;
      const orderItems = [];

      for (const item of reservation.items) {
        const itemTotal = item.menuItem.price * item.quantity;
        subtotal += itemTotal;

        let costPerItem = 0;
        for (const mi of item.menuItem.ingredients) {
          costPerItem += mi.quantity * mi.ingredient.costPrice;
        }

        orderItems.push({
          id: 'item-' + Date.now().toString(36) + Math.random().toString(36).substring(2),
          menuItemId: item.menuItem.id,
          menuItemName: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: item.menuItem.price,
          totalPrice: itemTotal,
          costPrice: costPerItem * item.quantity,
          notes: item.notes || null,
          status: 'confirmed',
        });
      }

      // Get tax rate
      const restaurant = await prisma.restaurant.findUnique({ where: { id: 'default' } });
      const taxRate = (restaurant?.taxRate ?? 8.0) / 100;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      // Create the order if there are pre-ordered items
      if (orderItems.length > 0) {
        await prisma.order.create({
          data: {
            id: 'order-' + Date.now().toString(36) + Math.random().toString(36).substring(2),
            orderNumber,
            subtotal,
            tax,
            total,
            status: 'confirmed',
            paymentStatus: 'unpaid',
            tableId: reservation.tableId,
            customerId: customer.id,
            notes: `Đặt bàn trước - ${reservation.customerName} (${reservation.customerPhone})`,
            items: { create: orderItems },
          },
        });
      }

      // Update table status to occupied
      await prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'occupied' },
      });
    }

    // If cancelling → free the table if it was reserved for this booking
    if (status === 'cancelled') {
      const currentTable = await prisma.table.findUnique({ where: { id: reservation.tableId } });
      if (currentTable?.status === 'reserved') {
        await prisma.table.update({
          where: { id: reservation.tableId },
          data: { status: 'available' },
        });
      }
    }

    const updated = await prisma.reservation.update({
      where: { id: params.id },
      data: { status },
      include: {
        table: { select: { id: true, number: true, capacity: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, image: true } },
          },
        },
      },
    });

    return NextResponse.json({ reservation: updated });
  } catch (error) {
    console.error('Error updating reservation:', error);
    return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 });
  }
}

// DELETE reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;
    const roleCheck = authorizeRoles(authUser, ['owner', 'manager']);
    if (roleCheck) return roleCheck;

    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Free the table if it was reserved
    const table = await prisma.table.findUnique({ where: { id: reservation.tableId } });
    if (table?.status === 'reserved') {
      await prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'available' },
      });
    }

    await prisma.reservation.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Reservation deleted' });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 });
  }
}
