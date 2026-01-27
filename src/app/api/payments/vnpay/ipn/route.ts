import { NextRequest, NextResponse } from 'next/server';
import { verifyVNPaySignature, getVNPayErrorMessage } from '@/lib/vnpay';
import prisma from '@/lib/db';

/**
 * VNPay IPN (Instant Payment Notification) Handler
 * 
 * VNPay sẽ gọi endpoint này để thông báo kết quả thanh toán (server-to-server)
 * Đây là cách đáng tin cậy nhất để xác nhận thanh toán vì:
 * - Không phụ thuộc vào việc khách hàng quay lại trang web
 * - VNPay sẽ retry nếu không nhận được response đúng
 * 
 * Response format theo yêu cầu VNPay:
 * - RspCode: "00" = thành công, khác = lỗi
 * - Message: Mô tả kết quả
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Lấy tất cả params từ VNPay
    const vnpParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      vnpParams[key] = value;
    });

    console.log('VNPay IPN received:', vnpParams);

    const secureHash = vnpParams['vnp_SecureHash'];
    const responseCode = vnpParams['vnp_ResponseCode'];
    const txnRef = vnpParams['vnp_TxnRef'];
    const transactionNo = vnpParams['vnp_TransactionNo'];
    const amount = vnpParams['vnp_Amount'];
    const bankCode = vnpParams['vnp_BankCode'];
    const payDate = vnpParams['vnp_PayDate'];
    const transactionStatus = vnpParams['vnp_TransactionStatus'];

    // 1. Xác thực chữ ký
    if (!secureHash) {
      console.error('IPN: Missing secure hash');
      return NextResponse.json({ RspCode: '97', Message: 'Missing checksum' });
    }

    const isValidSignature = verifyVNPaySignature(vnpParams, secureHash);
    if (!isValidSignature) {
      console.error('IPN: Invalid signature');
      return NextResponse.json({ RspCode: '97', Message: 'Invalid checksum' });
    }

    // 2. Tìm order theo txnRef (format: orderNumber + 6 digits timestamp)
    // VD: 12345678123456 => orderNumber là 12345678 (bỏ 6 số cuối)
    const orderNumber = parseInt(txnRef.slice(0, -6));
    if (!orderNumber || isNaN(orderNumber)) {
      console.error('IPN: Invalid txnRef format:', txnRef);
      return NextResponse.json({ RspCode: '01', Message: 'Order not found' });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      console.error('IPN: Order not found:', orderNumber);
      return NextResponse.json({ RspCode: '01', Message: 'Order not found' });
    }

    // 3. Kiểm tra số tiền
    const expectedAmount = Math.round(order.total * 100);
    const receivedAmount = parseInt(amount);
    if (expectedAmount !== receivedAmount) {
      console.error('IPN: Amount mismatch:', { expected: expectedAmount, received: receivedAmount });
      return NextResponse.json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // 4. Kiểm tra trạng thái đơn hàng (tránh xử lý trùng lặp)
    if (order.paymentStatus === 'paid') {
      console.log('IPN: Order already paid:', orderNumber);
      return NextResponse.json({ RspCode: '00', Message: 'Order already confirmed' });
    }

    // 5. Xử lý theo kết quả thanh toán
    if (responseCode === '00' && transactionStatus === '00') {
      // Thanh toán thành công
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          paymentMethod: 'vnpay',
          status: 'completed',
          notes: order.notes 
            ? `${order.notes}\n[VNPay] Transaction: ${transactionNo}, Bank: ${bankCode}, Date: ${payDate}`
            : `[VNPay] Transaction: ${transactionNo}, Bank: ${bankCode}, Date: ${payDate}`,
        },
      });

      // Giải phóng bàn nếu có
      if (order.tableId) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'available' },
        });
      }

      console.log('IPN: Payment confirmed for order:', orderNumber);
      return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' });
    } else {
      // Thanh toán thất bại
      console.log('IPN: Payment failed for order:', orderNumber, 'Code:', responseCode);
      
      // Có thể cập nhật notes để ghi nhận lỗi
      await prisma.order.update({
        where: { id: order.id },
        data: {
          notes: order.notes 
            ? `${order.notes}\n[VNPay Failed] Code: ${responseCode}, Message: ${getVNPayErrorMessage(responseCode)}`
            : `[VNPay Failed] Code: ${responseCode}, Message: ${getVNPayErrorMessage(responseCode)}`,
        },
      });

      return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' });
    }
  } catch (error) {
    console.error('VNPay IPN error:', error);
    return NextResponse.json({ RspCode: '99', Message: 'Unknown error' });
  }
}

// POST cũng hỗ trợ cho trường hợp VNPay gọi POST
export async function POST(request: NextRequest) {
  return GET(request);
}
