import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: 'default' },
    });
    
    const branchesData = await prisma.branch.findMany();
    
    return NextResponse.json({
      restaurantName: restaurant?.name || 'Nhà Hàng',
      mainBranch: {
        address: restaurant?.address || '',
        image: restaurant?.logo || '',
      },
      branches: branchesData.map(b => ({
        id: String(b.id),
        name: String(b.name),
        address: String(b.address || ''),
        image: String(b.image || ''),
        phone: String(b.phone || ''),
      })),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const restaurant = await prisma.restaurant.upsert({
      where: { id: 'default' },
      update: {
        name: data.restaurantName,
        address: data.mainBranch?.address,
        logo: data.mainBranch?.image,
      },
      create: {
        id: 'default',
        name: data.restaurantName,
        address: data.mainBranch?.address,
        logo: data.mainBranch?.image,
      },
    });
    
    const branches = await prisma.branch.findMany();
    
    return NextResponse.json({
      restaurantName: restaurant.name,
      mainBranch: {
        address: restaurant.address || '',
        image: restaurant.logo || '',
      },
      branches: branches.map(b => ({
        id: b.id,
        name: b.name,
        address: b.address,
        image: b.image,
      })),
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
