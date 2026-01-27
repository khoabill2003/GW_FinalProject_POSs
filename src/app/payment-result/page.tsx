'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';

// VNPay error messages
const vnpayErrorMessages: Record<string, string> = {
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

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Đang xử lý thanh toán...');
  const [orderInfo, setOrderInfo] = useState<{
    orderId: string;
    txnRef: string;
    amount: number;
    bankCode: string;
  } | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Get VNPay response parameters
        const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
        const vnp_TransactionNo = searchParams.get('vnp_TransactionNo');
        const vnp_TxnRef = searchParams.get('vnp_TxnRef');
        const vnp_Amount = searchParams.get('vnp_Amount');
        const vnp_BankCode = searchParams.get('vnp_BankCode');
        const vnp_TransactionStatus = searchParams.get('vnp_TransactionStatus');
        
        // Get orderId from sessionStorage
        const storedOrderId = sessionStorage.getItem('vnpay_order_id');
        
        if (!storedOrderId) {
          // Nếu không có trong session, thử lấy từ txnRef
          if (vnp_TxnRef) {
            // txnRef format: orderNumber + 6 digits (VD: 12345678123456)
            // Bỏ 6 số cuối để lấy orderNumber
            setOrderInfo({
              orderId: '',
              txnRef: vnp_TxnRef,
              amount: vnp_Amount ? parseInt(vnp_Amount) / 100 : 0,
              bankCode: vnp_BankCode || '',
            });
          }
        } else {
          setOrderInfo({
            orderId: storedOrderId,
            txnRef: vnp_TxnRef || '',
            amount: vnp_Amount ? parseInt(vnp_Amount) / 100 : 0,
            bankCode: vnp_BankCode || '',
          });
        }

        // Check response code và transaction status
        if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
          // Thanh toán thành công
          // IPN đã xử lý cập nhật order, ở đây chỉ hiển thị kết quả
          if (storedOrderId) {
            // Double check: cập nhật order (backup cho IPN)
            try {
              await fetch(`/api/orders/${storedOrderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentStatus: 'paid',
                  status: 'completed',
                  paymentMethod: 'vnpay',
                }),
              });
            } catch (e) {
              console.log('Order update via return URL (IPN should have handled this)');
            }
            
            // Clear sessionStorage
            sessionStorage.removeItem('vnpay_order_id');
            sessionStorage.removeItem('vnpay_order_data');
          }
          
          setStatus('success');
          setMessage('Thanh toán thành công!');
          
          // Redirect after 5 seconds
          setTimeout(() => {
            router.push('/');
          }, 5000);
        } else {
          // Thanh toán thất bại
          setStatus('failed');
          setMessage(
            vnpayErrorMessages[vnp_ResponseCode || '99'] || 
            `Thanh toán thất bại. Mã lỗi: ${vnp_ResponseCode || 'Không xác định'}`
          );
        }
      } catch (error) {
        setStatus('failed');
        setMessage(
          error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xử lý thanh toán'
        );
      }
    };

    processPayment();
  }, [searchParams, router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">{message}</h2>
            <p className="text-sm text-gray-600">Vui lòng không tắt cửa sổ này...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-4">
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-600">{message}</h2>
            
            {orderInfo && (
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                {orderInfo.orderId && (
                  <p className="text-sm text-gray-600">
                    Mã đơn hàng: <span className="font-medium text-gray-900">{orderInfo.orderId}</span>
                  </p>
                )}
                {orderInfo.txnRef && (
                  <p className="text-sm text-gray-600">
                    Mã giao dịch: <span className="font-medium text-gray-900">{orderInfo.txnRef}</span>
                  </p>
                )}
                {orderInfo.amount > 0 && (
                  <p className="text-sm text-gray-600">
                    Số tiền: <span className="font-medium text-green-600">{formatCurrency(orderInfo.amount)}</span>
                  </p>
                )}
                {orderInfo.bankCode && (
                  <p className="text-sm text-gray-600">
                    Ngân hàng: <span className="font-medium text-gray-900">{orderInfo.bankCode}</span>
                  </p>
                )}
              </div>
            )}
            
            <p className="text-xs text-gray-500">Tự động quay về màn hình chính trong 5 giây...</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Quay về ngay
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-red-100 rounded-full p-4">
                <svg
                  className="h-12 w-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-red-600">Thanh toán thất bại</h2>
            <p className="text-sm text-gray-600">{message}</p>
            
            {orderInfo?.txnRef && (
              <p className="text-xs text-gray-500">Mã giao dịch: {orderInfo.txnRef}</p>
            )}
            
            <div className="space-y-2">
              <Button onClick={() => router.push('/')} className="w-full">
                Quay về trang chủ
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="w-full"
              >
                Thử lại
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
