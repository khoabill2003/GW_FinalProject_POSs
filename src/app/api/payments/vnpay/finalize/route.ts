import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyVNPaySignature } from '@/lib/vnpay';

interface FinalizeRequestBody {
  orderId: string;
  vnpParams: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FinalizeRequestBody;
    const { orderId, vnpParams } = body;

    if (!orderId || !vnpParams) {
      return NextResponse.json({ error: 'Thiếu dữ liệu xác thực thanh toán' }, { status: 400 });
    }

    const secureHash = vnpParams.vnp_SecureHash;
    const responseCode = vnpParams.vnp_ResponseCode;
    const transactionStatus = vnpParams.vnp_TransactionStatus;
    const txnRef = vnpParams.vnp_TxnRef;

    if (!secureHash || !txnRef) {
      return NextResponse.json({ error: 'Thiếu chữ ký hoặc mã giao dịch' }, { status: 400 });
    }

    const isValidSignature = verifyVNPaySignature(vnpParams, secureHash);
    if (!isValidSignature) {
      return NextResponse.json({ error: 'Chữ ký VNPay không hợp lệ' }, { status: 400 });
    }

    if (responseCode !== '00' || transactionStatus !== '00') {
      return NextResponse.json({ error: 'Giao dịch VNPay chưa thành công' }, { status: 400 });
    }

    if (txnRef.length <= 6) {
      return NextResponse.json({ error: 'Mã giao dịch không hợp lệ' }, { status: 400 });
    }

    const orderNumberFromTxnRef = parseInt(txnRef.slice(0, -6), 10);
    if (!orderNumberFromTxnRef || Number.isNaN(orderNumberFromTxnRef)) {
      return NextResponse.json({ error: 'Không đọc được mã đơn từ giao dịch' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại' }, { status: 404 });
    }

    if (order.orderNumber !== orderNumberFromTxnRef) {
      return NextResponse.json({ error: 'Mã đơn không khớp giao dịch VNPay' }, { status: 400 });
    }

    if (order.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Đơn đã hoàn tất trước đó' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'vnpay',
      },
    });

    if (updatedOrder.tableId) {
      await prisma.table.update({
        where: { id: updatedOrder.tableId },
        data: { status: 'available' },
      });
    }

    return NextResponse.json({ success: true, orderId: updatedOrder.id });
  } catch (error) {
    console.error('VNPay finalize error:', error);
    return NextResponse.json({ error: 'Không thể hoàn tất đơn hàng' }, { status: 500 });
  }
}
