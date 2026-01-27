// VNPay Utilities - Helper functions cho thanh toán VNPay
import crypto from 'crypto';
import querystring from 'qs';

const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || '';

// Hàm sắp xếp và encode object theo chuẩn VNPay
export function sortObject(obj: Record<string, string | number>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const str: string[] = [];
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  
  str.sort();
  
  for (let i = 0; i < str.length; i++) {
    const key = str[i];
    const originalKey = decodeURIComponent(key);
    sorted[key] = encodeURIComponent(String(obj[originalKey])).replace(/%20/g, '+');
  }
  
  return sorted;
}

// Hàm xác thực chữ ký từ VNPay
export function verifyVNPaySignature(params: Record<string, string>, secureHash: string): boolean {
  // Clone và xóa các trường signature
  const vnpParams: Record<string, string> = { ...params };
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  // Sắp xếp và encode theo chuẩn VNPay
  const sortedParams = sortObject(vnpParams);
  
  // Tạo chuỗi ký với encode: false (vì đã encode trong sortObject)
  const signData = querystring.stringify(sortedParams, { encode: false });
  
  // Tạo chữ ký HMAC SHA512
  const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

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
