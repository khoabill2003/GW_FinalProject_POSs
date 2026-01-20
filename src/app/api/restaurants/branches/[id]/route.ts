import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    // In production, delete from database
    // For now, just return success
    return NextResponse.json({ success: true, message: 'Branch deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { error: 'Failed to delete branch' },
      { status: 500 }
    );
  }
}
