import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';

function generateId() {
  return randomBytes(12).toString('hex');
}

export async function GET(req: NextRequest) {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ branches });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const branch = await prisma.branch.create({
      data: {
        id: generateId(),
        name: data.name,
        address: data.address,
        phone: data.phone || '',
        image: data.image || '',
      },
    });
    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    console.error('Branch creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}
