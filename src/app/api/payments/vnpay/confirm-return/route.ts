import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyVNPaySignature, getVNPayErrorMessage } from '@/lib/vnpay';

interface ConfirmReturnBody {
  action: 'mark_paid' | 'complete';
  orderId?: string;
  params: Record<string, string>;
}

function parseOrderNumberFromTxnRef(txnRef: string | undefined): number | null {
  if (!txnRef || txnRef.length <= 6) return null;
  const orderNumber = parseInt(txnRef.slice(0, -6), 10);
  return Number.isNaN(orderNumber) ? null : orderNumber;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConfirmReturnBody;
    const { action, orderId, params } = body;

    if (!action || !params || typeof params !== 'object') {
      return NextResponse.json({ error: 'Thiếu dữ liệu xác nhận thanh toán' }, { status: 400 });
    }

    const secureHash = params.vnp_SecureHash;
    const responseCode = params.vnp_ResponseCode;
    const transactionStatus = params.vnp_TransactionStatus;
    const txnRef = params.vnp_TxnRef;

    if (!secureHash) {
      return NextResponse.json({ error: 'Thiếu chữ ký bảo mật VNPay' }, { status: 400 });
    }

    const isValidSignature = verifyVNPaySignature(params, secureHash);
    if (!isValidSignature) {
      return NextResponse.json({ error: 'Chữ ký VNPay không hợp lệ' }, { status: 400 });
    }

    if (!(responseCode === '00' && transactionStatus === '00')) {
      return NextResponse.json(
        { error: getVNPayErrorMessage(responseCode || '99') },
        { status: 400 }
      );
    }

    let order = null;
    if (orderId) {
      order = await prisma.order.findUnique({ where: { id: orderId } });
    }

    if (!order) {
      const orderNumber = parseOrderNumberFromTxnRef(txnRef);
      if (!orderNumber) {
        return NextResponse.json({ error: 'Không xác định được đơn hàng từ giao dịch VNPay' }, { status: 400 });
      }
      order = await prisma.order.findUnique({ where: { orderNumber } });
    }

    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    const noteSuffix = `[VNPay Return] Txn: ${params.vnp_TransactionNo || ''}, Bank: ${params.vnp_BankCode || ''}, Date: ${params.vnp_PayDate || ''}`;

    if (action === 'mark_paid') {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          paymentMethod: 'vnpay',
          notes: order.notes ? `${order.notes}\n${noteSuffix}` : noteSuffix,
        },
      });

      return NextResponse.json({ success: true, order: updated });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'vnpay',
        notes: order.notes ? `${order.notes}\n${noteSuffix}` : noteSuffix,
      },
    });

    if (updated.tableId) {
      await prisma.table.update({
        where: { id: updated.tableId },
        data: { status: 'available' },
      });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('VNPay confirm return error:', error);
    return NextResponse.json({ error: 'Xử lý xác nhận VNPay thất bại' }, { status: 500 });
  }
}
