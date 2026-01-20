import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ restaurant });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch restaurant' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const restaurant = await prisma.restaurant.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        ...data,
      },
    });
    return NextResponse.json({ restaurant });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save restaurant' },
      { status: 500 }
    );
  }
}
