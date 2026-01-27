/**
 * ============================================================================
 * VNPAY UTILITIES - Helper functions cho tích hợp thanh toán VNPay
 * ============================================================================
 * 
 * VNPay (Vietnam Payment) - Cổng thanh toán trực tuyến phổ biến tại VN
 * 
 * FLOW THANH TOÁN:
 * 1. Client gọi API tạo payment URL
 * 2. Server build params, sắp xếp, encode, tạo chữ ký HMAC SHA512
 * 3. Redirect user đến VNPay với URL có chữ ký
 * 4. User thanh toán trên VNPay
 * 5. VNPay redirect về Return URL + gọi IPN (server-to-server)
 * 6. Server verify chữ ký, cập nhật order
 * 
 * BẢO MẬT:
 * - HMAC SHA512: Đảm bảo params không bị thay đổi giữa đường
 * - Hash Secret: Chỉ server và VNPay biết, không expose ra client
 */
import crypto from 'crypto';
import querystring from 'qs';

// Secret key để tạo/verify chữ ký (lấy từ .env, KHÔNG commit lên git)
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || '';

// ============================================================================
// SORT OBJECT - Sắp xếp và encode params theo chuẩn VNPay
// ============================================================================
/**
 * VNPay yêu cầu params phải:
 * 1. Sắp xếp theo thứ tự alphabet của KEY
 * 2. Encode theo chuẩn URL (encodeURIComponent)
 * 3. Thay thế %20 bằng + (space encoding)
 * 
 * VÍ DỤ:
 * Input:  { vnp_Amount: 1000000, vnp_TxnRef: 'ABC123' }
 * Output: { vnp_Amount: '1000000', vnp_TxnRef: 'ABC123' }
 * (đã sắp xếp và encode)
 * 
 * TẠI SAO CẦN LÀM VẬY?
 * - Chữ ký HMAC phụ thuộc vào thứ tự và format của chuỗi
 * - Nếu sai thứ tự hoặc encode khác, chữ ký sẽ không khớp
 * - VNPay sẽ báo lỗi "Sai chữ ký"
 * 
 * @param obj - Object chứa params VNPay
 * @returns Object đã sắp xếp và encode
 */
export function sortObject(obj: Record<string, string | number>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const str: string[] = [];
  
  // Bước 1: Lấy tất cả keys và encode
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  
  // Bước 2: Sắp xếp keys theo alphabet
  str.sort();
  
  // Bước 3: Build object mới với key và value đã encode
  for (let i = 0; i < str.length; i++) {
    const key = str[i];  // Key đã encode
    const originalKey = decodeURIComponent(key);  // Key gốc để lấy value
    // Encode value và thay %20 thành + (chuẩn VNPay)
    sorted[key] = encodeURIComponent(String(obj[originalKey])).replace(/%20/g, '+');
  }
  
  return sorted;
}

// ============================================================================
// VERIFY SIGNATURE - Xác thực chữ ký từ VNPay
// ============================================================================
/**
 * Khi VNPay redirect/callback về server, họ gửi kèm chữ ký
 * Ta cần verify để đảm bảo:
 * 1. Params không bị thay đổi giữa đường (integrity)
 * 2. Request thực sự đến từ VNPay (authentication)
 * 
 * FLOW VERIFY:
 * 1. Tách vnp_SecureHash ra khỏi params
 * 2. Sắp xếp và encode lại params còn lại
 * 3. Tạo chữ ký mới từ params
 * 4. So sánh với vnp_SecureHash từ VNPay
 * 5. Nếu khớp -> Hợp lệ, xử lý tiếp
 *    Nếu không khớp -> Có thể bị tấn công, reject
 * 
 * @param params - Object params từ VNPay (query string parsed)
 * @param secureHash - Chữ ký vnp_SecureHash từ VNPay
 * @returns true nếu chữ ký hợp lệ
 */
export function verifyVNPaySignature(params: Record<string, string>, secureHash: string): boolean {
  // Bước 1: Clone params và xóa các trường signature
  const vnpParams: Record<string, string> = { ...params };
  delete vnpParams['vnp_SecureHash'];      // Chữ ký gốc
  delete vnpParams['vnp_SecureHashType'];  // Loại hash (SHA512)

  // Bước 2: Sắp xếp và encode theo chuẩn VNPay
  const sortedParams = sortObject(vnpParams);
  
  // Bước 3: Tạo chuỗi query string
  // encode: false vì đã encode trong sortObject rồi
  const signData = querystring.stringify(sortedParams, { encode: false });
  
  // Bước 4: Tạo chữ ký HMAC SHA512
  // HMAC = Hash-based Message Authentication Code
  // SHA512 = Secure Hash Algorithm 512-bit
  const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Bước 5: So sánh chữ ký
  return secureHash === signed;
}

// Helper function để lấy message lỗi VNPay
export function getVNPayErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.',
    '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
    '11': 'Đã hết hạn chờ thanh toán.',
    '12': 'Thẻ/Tài khoản bị khóa.',
    '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Khách hàng hủy giao dịch.',
    '51': 'Tài khoản không đủ số dư.',
    '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Lỗi không xác định.',
  };
  return errorMessages[code] || `Lỗi không xác định (Mã: ${code})`;
}
