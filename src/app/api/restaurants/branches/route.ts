import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock storage (in production, use database)
let branches: any[] = [];

export async function GET() {
  try {
    return NextResponse.json({ branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newBranch = {
      id: Math.random().toString(36).substring(7),
      name: data.name,
      image: data.image || '',
    };
    branches.push(newBranch);
    return NextResponse.json(newBranch, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}
