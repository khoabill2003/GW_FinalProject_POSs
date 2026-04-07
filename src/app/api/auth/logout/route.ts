import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/middleware/auth';

export async function POST() {
  const response = NextResponse.json({ message: 'Đăng xuất thành công' });
  response.headers.set('Set-Cookie', clearAuthCookie());
  return response;
}
