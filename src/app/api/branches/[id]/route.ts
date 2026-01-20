import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
    });
    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ branch });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch branch' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json();
    const branch = await prisma.branch.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ branch });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update branch' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.branch.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete branch' },
      { status: 500 }
    );
  }
}
