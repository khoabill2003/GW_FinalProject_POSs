import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const VNP_TMN_CODE = process.env.VNP_TMN_CODE || 'TMNCODE';
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || 'SECRET';
const VNP_API_URL = process.env.VNP_API_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURN_URL = process.env.VNP_RETURN_URL || 'http://localhost:3001/payment-result';

interface VNPayCreatePaymentRequest {
  orderId: string;
  orderNumber: number;
  amount: number;
  customerName?: string;
  customerPhone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VNPayCreatePaymentRequest;
    const { orderId, orderNumber, amount, customerName, customerPhone } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // VNPay expects amount in Vietnamese Dong (multiplied by 100)
    const amountInDong = Math.round(amount * 100);
    const timestamp = new Date();
    const createDate = timestamp
      .toISOString()
      .replace(/[-:T.]/g, '')
      .substring(0, 14);
    const transactionNo = `${orderNumber}-${Date.now()}`;
    const ipAddr = request.ip || '127.0.0.1';

    // Build VNPay request params
    const vnp_Params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNP_TMN_CODE,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: transactionNo,
      vnp_OrderInfo: `Thanh toan don hang #${orderNumber}${
        customerName ? ' - ' + customerName : ''
      }`,
      vnp_OrderType: 'other',
      vnp_Amount: amountInDong.toString(),
      vnp_ReturnUrl: VNP_RETURN_URL,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // Sort params alphabetically and create signature
    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = vnp_Params[key];
        return acc;
      }, {} as Record<string, string>);

    const signData = Object.values(sortedParams).join('|');
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // Build payment URL
    const paymentUrl = new URL(VNP_API_URL);
    Object.entries(sortedParams).forEach(([key, value]) => {
      paymentUrl.searchParams.append(key, value);
    });
    paymentUrl.searchParams.append('vnp_SecureHash', signed);

    // Store transaction info in request for verification later
    return NextResponse.json({
      success: true,
      paymentUrl: paymentUrl.toString(),
      orderId,
      transactionNo,
    });
  } catch (error) {
    console.error('VNPay payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment request' },
      { status: 500 }
    );
  }
}
