'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function PaymentResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Đang xử lý thanh toán...');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Get VNPay response parameters
        const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
        const vnp_TransactionNo = searchParams.get('vnp_TransactionNo');
        
        // Get orderId from sessionStorage
        const storedOrderId = sessionStorage.getItem('vnpay_order_id');
        
        if (!storedOrderId) {
          throw new Error('Không tìm thấy mã đơn hàng');
        }

        setOrderId(storedOrderId);

        // Check response code
        if (vnp_ResponseCode === '00') {
          // Payment successful - update order status
          const response = await fetch(`/api/orders/${storedOrderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentStatus: 'paid',
              status: 'completed',
              paymentMethod: 'vnpay',
              transactionId: vnp_TransactionNo,
            }),
          });

          if (response.ok) {
            setStatus('success');
            setMessage('Thanh toán thành công!');
            
            // Clear sessionStorage
            sessionStorage.removeItem('vnpay_order_id');
            sessionStorage.removeItem('vnpay_order_data');
            
            // Redirect after 3 seconds
            setTimeout(() => {
              router.push('/');
            }, 3000);
          } else {
            throw new Error('Không thể cập nhật trạng thái đơn hàng');
          }
        } else {
          // Payment failed
          setStatus('failed');
          
          const errorMessages: { [key: string]: string } = {
            '07': 'Trị lỗi - Xác nhận lần thứ 2 không thành công',
            '09': 'Lỗi xác thực chữ ký khong hợp lệ',
            '10': 'Mã đơn vị không tồn tại',
            '11': 'Hết hạn chờ thanh toán',
            '12': 'URL không hợp lệ - Quý khách vui lòng rời khỏi trang',
            '13': 'Mã lỗi không xác định từ VNPAY',
            '14': 'Sai Secret Key',
            '15': 'Ký giao dịch không thành công',
            '17': 'Không xác thực được địa chỉ IP',
            '20': 'Ngoại lệ không xác định',
            '99': 'Người dùng hủy giao dịch',
          };
          
          setMessage(
            errorMessages[vnp_ResponseCode || ''] || 
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
            <p className="text-sm text-gray-600">Đơn hàng #{orderId} đã được xử lý</p>
            <p className="text-xs text-gray-500">Tự động quay về màn hình chính trong 3 giây...</p>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
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
            {orderId && (
              <p className="text-xs text-gray-500">Đơn hàng #{orderId}</p>
            )}
            <div className="space-y-2">
              <Button
                onClick={() => router.push('/')}
                className="w-full"
              >
                Quay về trang chủ
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="w-full"
              >
                Quay lại
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
