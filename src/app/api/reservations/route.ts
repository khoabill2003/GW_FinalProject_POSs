import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const PHONE_REGEX = /^(?:\+?84|0)\d{9,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const {
      customerName,
      customerPhone,
      customerEmail,
      guests,
      tableId,
      reservationTime,
      notes,
      items,
    } = body;

    const normalizedName = String(customerName || '').trim();
    const normalizedPhone = String(customerPhone || '').trim().replace(/[\s.-]/g, '');
    const normalizedEmail = String(customerEmail || '').trim();
    const normalizedNotes = String(notes || '').trim();
    const parsedGuests = Number(guests);

    if (!normalizedName || !normalizedPhone || !parsedGuests || !tableId || !reservationTime) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin: tên, SĐT, số khách, bàn và thời gian' },
        { status: 400 }
      );
    }

    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return NextResponse.json({ error: 'Tên khách hàng phải từ 2 đến 80 ký tự' }, { status: 400 });
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 });
    }

    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }

    if (!Number.isInteger(parsedGuests) || parsedGuests < 1 || parsedGuests > 50) {
      return NextResponse.json({ error: 'Số khách phải là số nguyên từ 1 đến 50' }, { status: 400 });
    }

    if (normalizedNotes.length > 500) {
      return NextResponse.json({ error: 'Ghi chú tối đa 500 ký tự' }, { status: 400 });
    }

    const reservationDate = new Date(reservationTime);
    if (Number.isNaN(reservationDate.getTime())) {
      return NextResponse.json({ error: 'Thời gian đặt bàn không hợp lệ' }, { status: 400 });
    }

    const now = new Date();
    const minTime = new Date(now.getTime() + 10 * 60 * 1000);
    if (reservationDate < minTime) {
      return NextResponse.json({ error: 'Thời gian đặt bàn phải sau thời điểm hiện tại ít nhất 10 phút' }, { status: 400 });
    }

    // Validate table exists and is available
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return NextResponse.json({ error: 'Bàn không tồn tại' }, { status: 404 });
    }

    if (table.status !== 'available') {
      return NextResponse.json({ error: 'Bàn hiện không khả dụng để đặt trước' }, { status: 400 });
    }

    // Check capacity
    if (parsedGuests > table.capacity) {
      return NextResponse.json(
        { error: `Bàn chỉ chứa tối đa ${table.capacity} người` },
        { status: 400 }
      );
    }

    // Check if table already has a reservation at that time (within 2 hours window)
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
      if (items.length > 50) {
        return NextResponse.json({ error: 'Số món đặt trước vượt quá giới hạn cho phép' }, { status: 400 });
      }

      const quantityByMenuItem = new Map<string, number>();
      for (const item of items) {
        const menuItemId = String(item?.menuItemId || '').trim();
        const quantity = Number(item?.quantity);
        const itemNotes = String(item?.notes || '').trim();

        if (!menuItemId) {
          return NextResponse.json({ error: 'Thiếu mã món trong danh sách đặt trước' }, { status: 400 });
        }

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
          return NextResponse.json({ error: 'Số lượng mỗi món phải là số nguyên từ 1 đến 20' }, { status: 400 });
        }

        if (itemNotes.length > 200) {
          return NextResponse.json({ error: 'Ghi chú cho mỗi món tối đa 200 ký tự' }, { status: 400 });
        }

        quantityByMenuItem.set(menuItemId, (quantityByMenuItem.get(menuItemId) || 0) + quantity);

        if ((quantityByMenuItem.get(menuItemId) || 0) > 20) {
          return NextResponse.json({ error: 'Tổng số lượng của một món không được vượt quá 20' }, { status: 400 });
        }

        const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
        if (!menuItem) {
          return NextResponse.json({ error: `Món ${menuItemId} không tồn tại` }, { status: 400 });
        }
        if (!menuItem.available) {
          return NextResponse.json({ error: `Món ${menuItem.name} hiện không có sẵn` }, { status: 400 });
        }
        reservationItems.push({
          menuItemId,
          quantity,
          notes: itemNotes || null,
        });
      }
    }

    // Create the reservation
    const reservation = await prisma.reservation.create({
      data: {
        customerName: normalizedName,
        customerPhone: normalizedPhone,
        customerEmail: normalizedEmail || null,
        guests: parsedGuests,
        tableId,
        reservationTime: reservationDate,
        notes: normalizedNotes || null,
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
