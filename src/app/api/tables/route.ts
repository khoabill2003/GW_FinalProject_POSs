import { NextRequest, NextResponse } from 'next/server';
import * as TableService from '@/lib/services/table.service';

export const dynamic = 'force-dynamic';

// GET all tables
export async function GET() {
  try {
    const tables = await TableService.getTables();
    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Lấy danh sách bàn thất bại' },
      { status: 500 }
    );
  }
}

// POST create new table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const table = await TableService.createTable({
      number: parseInt(body.number),
      name: body.name,
      capacity: body.capacity ? parseInt(body.capacity) : undefined,
      zoneId: body.zoneId,
    });
    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error('Error creating table:', error);
    const message = error instanceof Error ? error.message : 'Tạo bàn thất bại';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

