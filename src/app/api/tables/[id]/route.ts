import { NextRequest, NextResponse } from 'next/server';
import { TableService } from '@/lib/services';

// GET single table
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const table = await TableService.getTableById(params.id);

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table' },
      { status: 500 }
    );
  }
}

// PUT update table
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { number, name, capacity, status, zoneId } = await request.json();
    
    const table = await TableService.updateTable(params.id, {
      number: number ? parseInt(number) : undefined,
      name,
      capacity: capacity ? parseInt(capacity) : undefined,
      status,
      zoneId,
    });

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error updating table:', error);
    const message = error instanceof Error ? error.message : 'Failed to update table';
    const status = message.includes('không tồn tại') ? 404 : 
                   message.includes('đã tồn tại') ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// DELETE table
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await TableService.deleteTable(params.id);
    return NextResponse.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete table';
    const status = message.includes('không tồn tại') ? 404 : 
                   message.includes('đang có đơn hàng') ? 400 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
