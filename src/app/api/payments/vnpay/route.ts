/**
 * ============================================================================
 * VNPAY PAYMENT API - Tạo URL thanh toán VNPay
 * ============================================================================
 * 
 * Endpoint: POST /api/payments/vnpay
 * 
 * REQUEST BODY:
 * {
 *   orderId: string,      // ID đơn hàng trong hệ thống
 *   orderNumber: number,  // Số đơn hàng hiển thị
 *   amount: number,       // Số tiền (VND)
 *   orderInfo?: string,   // Mô tả giao dịch
 *   bankCode?: string,    // Mã ngân hàng (VD: NCB, VNPAYQR)
 *   language?: string     // Ngôn ngữ (vn/en)
 * }
 * 
 * RESPONSE:
 * {
 *   paymentUrl: string    // URL redirect đến VNPay
 * }
 * 
 * FLOW:
 * 1. Validate request body
 * 2. Build VNPay params theo spec
 * 3. Sắp xếp + encode params (sortObject)
 * 4. Tạo chữ ký HMAC SHA512
 * 5. Build full URL và trả về client
 * 6. Client redirect user đến URL này
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import querystring from 'qs';
import { sortObject } from '@/lib/vnpay';

// ============================================================================
// VNPAY CONFIGURATION - Lấy từ environment variables
// ============================================================================
/**
 * CÁC BIẾN MÔI TRƯỜNG CẦN CÓ TRONG .env:
 * - VNP_TMN_CODE: Mã website của merchant (VNPay cấp)
 * - VNP_HASH_SECRET: Secret key để tạo chữ ký (BẢO MẬT!)
 * - VNP_API_URL: URL sandbox/production của VNPay
 * - VNP_RETURN_URL: URL redirect sau khi thanh toán
 */
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || '';
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || '';
const VNP_API_URL = process.env.VNP_API_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURN_URL = process.env.VNP_RETURN_URL || 'http://localhost:3000/payment-result';

// Interface cho request body
interface VNPayCreatePaymentRequest {
  orderId: string;
  orderNumber: number;
  amount: number;
  orderInfo?: string;
  bankCode?: string;
  language?: string;
}

/**
 * Format date theo chuẩn VNPay: yyyyMMddHHmmss
 * VÍ dụ: 2024-01-15 14:30:45 -> "20240115143045"
 */
function formatVNPayDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// ============================================================================
// POST HANDLER - Tạo URL thanh toán
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as VNPayCreatePaymentRequest;
    const { orderId, orderNumber, amount, orderInfo, bankCode, language } = body;

    // Validate required fields
    if (!orderId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and amount are required' },
        { status: 400 }
      );
    }

    // Kiểm tra config VNPay
    if (!VNP_TMN_CODE || !VNP_HASH_SECRET) {
      console.error('VNPay config missing:', { VNP_TMN_CODE, hasSecret: !!VNP_HASH_SECRET });
      return NextResponse.json(
        { error: 'VNPay configuration is missing. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Lấy IP address của client (cần cho VNPay)
    const ipAddr = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';

    // Set timezone Vietnam
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    
    // Tạo timestamp theo định dạng VNPay
    const createDate = formatVNPayDate(new Date());
    
    // Tạo mã giao dịch unique (orderNumber + 6 số cuối của timestamp)
    // Đảm bảo mỗi giao dịch có mã khác nhau, kể cả thanh toán lại
    const txnRef = `${orderNumber}${Date.now().toString().slice(-6)}`;

    // ========================================================================
    // BUILD VNPAY PARAMS - Theo đặc tả VNPay API
    // ========================================================================
    /**
     * CÁC PARAMS QUAN TRỌNG:
     * - vnp_Version: Phiên bản API (2.1.0)
     * - vnp_Command: Loại lệnh (pay = thanh toán)
     * - vnp_TmnCode: Mã merchant (VNPay cấp)
     * - vnp_Amount: Số tiền * 100 (VNPay quy định)
     * - vnp_TxnRef: Mã giao dịch unique
     * - vnp_ReturnUrl: URL redirect sau thanh toán
     * - vnp_IpAddr: IP của khách hàng
     */
    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNP_TMN_CODE,
      vnp_Locale: language || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${orderNumber}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(amount * 100), // QUAN TRỌNG: Nhân 100!
      vnp_ReturnUrl: VNP_RETURN_URL,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // Thêm bank code nếu user chọn sẵn ngân hàng
    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    // ========================================================================
    // TẠO CHỮ KÝ HMAC SHA512
    // ========================================================================
    /**
     * QUY TRÌNH:
     * 1. Sắp xếp params theo alphabet + encode (sortObject)
     * 2. Tạo query string từ params đã sort
     * 3. Hash chuỗi bằng HMAC SHA512 với secret key
     * 4. Thêm chữ ký vào params
     * 5. Build URL cuối cùng
     */
    const sortedParams = sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    
    // Tạo HMAC SHA512 signature
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    
    // Thêm chữ ký vào params
    sortedParams['vnp_SecureHash'] = signed;

    // Build URL thanh toán cuối cùng
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
