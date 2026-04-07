import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET reservations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tableId = searchParams.get('tableId');

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;
    if (tableId) where.tableId = tableId;

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { reservationTime: 'asc' },
      include: {
        table: { select: { id: true, number: true, capacity: true, zone: { select: { name: true } } } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, image: true } },
          },
        },
      },
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

// POST - create reservation with pre-order items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, customerEmail, guests, tableId, reservationTime, notes, items } = body;

    if (!customerName || !customerPhone || !guests || !tableId || !reservationTime) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin: tên, SĐT, số khách, bàn và thời gian' },
        { status: 400 }
      );
    }

    // Validate table exists and is available
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return NextResponse.json({ error: 'Bàn không tồn tại' }, { status: 404 });
    }

    // Check capacity
    if (guests > table.capacity) {
      return NextResponse.json(
        { error: `Bàn chỉ chứa tối đa ${table.capacity} người` },
        { status: 400 }
      );
    }

    // Check if table already has a reservation at that time (within 2 hours window)
    const reservationDate = new Date(reservationTime);
    const twoHoursBefore = new Date(reservationDate.getTime() - 2 * 60 * 60 * 1000);
    const twoHoursAfter = new Date(reservationDate.getTime() + 2 * 60 * 60 * 1000);

    const conflicting = await prisma.reservation.findFirst({
      where: {
        tableId,
        status: { in: ['pending', 'confirmed'] },
        reservationTime: {
          gte: twoHoursBefore,
          lte: twoHoursAfter,
        },
      },
    });

    if (conflicting) {
      return NextResponse.json(
        { error: 'Bàn đã được đặt trong khoảng thời gian này' },
        { status: 409 }
      );
    }

    // Build reservation items if pre-ordering
    const reservationItems = [];
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
        if (!menuItem) {
          return NextResponse.json({ error: `Món ${item.menuItemId} không tồn tại` }, { status: 400 });
        }
        if (!menuItem.available) {
          return NextResponse.json({ error: `Món ${menuItem.name} hiện không có sẵn` }, { status: 400 });
        }
        reservationItems.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity || 1,
          notes: item.notes || null,
        });
      }
    }

    // Create the reservation
    const reservation = await prisma.reservation.create({
      data: {
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        guests,
        tableId,
        reservationTime: reservationDate,
        notes: notes || null,
        status: 'pending',
        items: {
          create: reservationItems,
        },
      },
      include: {
        table: { select: { id: true, number: true, capacity: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, image: true } },
          },
        },
      },
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
