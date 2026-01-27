import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import querystring from 'qs';
import { sortObject } from '@/lib/vnpay';

// VNPay Configuration
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || '';
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || '';
const VNP_API_URL = process.env.VNP_API_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURN_URL = process.env.VNP_RETURN_URL || 'http://localhost:3000/payment-result';

interface VNPayCreatePaymentRequest {
  orderId: string;
  orderNumber: number;
  amount: number;
  orderInfo?: string;
  bankCode?: string;
  language?: string;
}

// Format date theo VNPay: yyyyMMddHHmmss
function formatVNPayDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// POST - Tạo URL thanh toán VNPay
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VNPayCreatePaymentRequest;
    const { orderId, orderNumber, amount, orderInfo, bankCode, language } = body;

    if (!orderId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and amount are required' },
        { status: 400 }
      );
    }

    if (!VNP_TMN_CODE || !VNP_HASH_SECRET) {
      console.error('VNPay config missing:', { VNP_TMN_CODE, hasSecret: !!VNP_HASH_SECRET });
      return NextResponse.json(
        { error: 'VNPay configuration is missing. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Lấy IP address
    const ipAddr = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';

    // Timezone Vietnam
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    
    // Tạo timestamp theo định dạng VNPay
    const createDate = formatVNPayDate(new Date());
    
    // Mã giao dịch unique
    const txnRef = `${orderNumber}${Date.now().toString().slice(-6)}`;

    // Build VNPay params (chưa encode)
    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNP_TMN_CODE,
      vnp_Locale: language || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${orderNumber}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(amount * 100), // VNPay yêu cầu nhân 100
      vnp_ReturnUrl: VNP_RETURN_URL,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // Thêm bank code nếu có
    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    // Sắp xếp và encode params theo chuẩn VNPay
    const sortedParams = sortObject(vnpParams);

    // Tạo chuỗi ký (encode: false vì đã encode trong sortObject)
    const signData = querystring.stringify(sortedParams, { encode: false });
    
    // Tạo chữ ký HMAC SHA512
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    
    // Thêm chữ ký vào params
    sortedParams['vnp_SecureHash'] = signed;

    // Build URL thanh toán (encode: false vì đã encode trong sortObject)
    const paymentUrl = VNP_API_URL + '?' + querystring.stringify(sortedParams, { encode: false });

    console.log('VNPay payment created:', { orderId, txnRef, amount });

    return NextResponse.json({
      success: true,
      paymentUrl,
      orderId,
      txnRef,
    });
  } catch (error) {
    console.error('VNPay payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment request' },
      { status: 500 }
    );
  }
}
