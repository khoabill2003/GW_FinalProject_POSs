'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [orderInfo, setOrderInfo] = useState<{
    orderId: string;
    txnRef: string;
    amount: number;
    bankCode: string;
  } | null>(null);
  const [vnpayParams, setVnpayParams] = useState<Record<string, string>>({});
  const printIframeRef = useRef<HTMLIFrameElement>(null);

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

        const rawParams: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          rawParams[key] = value;
        });
        setVnpayParams(rawParams);
        
        // Get orderId from query/sessionStorage
        const queryOrderId = searchParams.get('orderId');
        const storedOrderId = sessionStorage.getItem('vnpay_order_id');
        const resolvedOrderId = storedOrderId || queryOrderId || '';
        
        if (!resolvedOrderId) {
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
            orderId: resolvedOrderId,
            txnRef: vnp_TxnRef || '',
            amount: vnp_Amount ? parseInt(vnp_Amount) / 100 : 0,
            bankCode: vnp_BankCode || '',
          });
        }

        // Check response code và transaction status
        if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
          // Thanh toán thành công: chỉ hiển thị trạng thái thành công.
          // Không auto completed tại đây; cashier sẽ xác nhận in biên lai/hoàn tất ở bước kế tiếp.
          if (resolvedOrderId) {
            try {
              await fetch('/api/payments/vnpay/confirm-return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'mark_paid',
                  orderId: resolvedOrderId,
                  params: rawParams,
                }),
              });
            } catch {
              // IPN là nguồn chính; return URL chỉ là phương án dự phòng
            }
          }
          
          setStatus('success');
          setMessage('Thanh toán thành công! Vui lòng chọn bước hoàn tất đơn hàng.');
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

  const buildReceiptHtml = (orderData: any) => {
    const date = new Date(orderData.createdAt);
    const formattedDate = date.toLocaleDateString('vi-VN');
    const formattedTime = date.toLocaleTimeString('vi-VN');

    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Hoa don #${orderData.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; width: 80mm; margin: 0 auto; padding: 10px; font-size: 12px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .total { border-top: 1px solid #000; margin-top: 8px; padding-top: 8px; font-weight: bold; }
            .footer { text-align: center; margin-top: 10px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><strong>RESTAURANT POS</strong></div>
            <div>Hoa don #${String(orderData.orderNumber).padStart(6, '0')}</div>
          </div>
          <div class="row"><span>Ngay:</span><span>${formattedDate}</span></div>
          <div class="row"><span>Gio:</span><span>${formattedTime}</span></div>
          ${orderData.table ? `<div class="row"><span>Ban:</span><span>${orderData.table.number}</span></div>` : ''}
          <div style="border-bottom:1px dashed #000; margin:8px 0;"></div>
          ${(orderData.items || []).map((item: any) => `
            <div class="row">
              <span>${item.quantity}x ${item.menuItem?.name || item.menuItemName || 'Mon an'}</span>
              <span>${formatCurrency(item.totalPrice || item.quantity * (item.unitPrice || 0))}</span>
            </div>
          `).join('')}
          <div class="total">
            <div class="row"><span>Tam tinh:</span><span>${formatCurrency(orderData.subtotal || 0)}</span></div>
            <div class="row"><span>Thue:</span><span>${formatCurrency(orderData.tax || 0)}</span></div>
            <div class="row"><span>Tong cong:</span><span>${formatCurrency(orderData.total || 0)}</span></div>
          </div>
          <div class="footer">Cam on quy khach!</div>
        </body>
      </html>`;
  };

  const finalizeOrder = async (printReceipt: boolean) => {
    if (!orderInfo?.orderId) {
      setIsFinalized(true);
      setMessage('Đã ghi nhận thao tác. Không tìm thấy mã đơn để tự hoàn tất.');
      return;
    }

    setIsFinalizing(true);
    try {
      if (printReceipt) {
        const orderRes = await fetch(`/api/orders/${orderInfo.orderId}`);
        if (orderRes.ok) {
          const data = await orderRes.json();
          const html = buildReceiptHtml(data.order);
          const iframeWindow = printIframeRef.current?.contentWindow;
          if (iframeWindow) {
            iframeWindow.document.open();
            iframeWindow.document.write(html);
            iframeWindow.document.close();
            setTimeout(() => iframeWindow.print(), 250);
          }
        }
      }

      const response = await fetch('/api/payments/vnpay/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderInfo.orderId,
          vnpParams: vnpayParams,
        }),
      });

      sessionStorage.removeItem('vnpay_order_id');
      sessionStorage.removeItem('vnpay_order_data');
      setIsFinalized(true);
      if (response.ok) {
        setMessage('Đã ghi nhận và hoàn tất đơn hàng thành công.');
      } else if (response.status === 401 || response.status === 403) {
        setMessage('Đã ghi nhận thao tác. Chưa có quyền hoàn tất tự động, vui lòng hoàn tất đơn ở màn hình POS.');
      } else {
        setMessage('Đã ghi nhận thao tác. Hiện chưa thể hoàn tất tự động, vui lòng hoàn tất đơn ở POS.');
      }
    } catch (error) {
      sessionStorage.removeItem('vnpay_order_id');
      sessionStorage.removeItem('vnpay_order_data');
      setIsFinalized(true);
      setMessage('Đã ghi nhận thao tác. Có lỗi khi đồng bộ hoàn tất đơn, vui lòng kiểm tra ở POS.');
    } finally {
      setIsFinalizing(false);
    }
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
            
            <p className="text-sm text-gray-600">Bạn muốn in biên lai trước khi hoàn tất đơn không?</p>
            <div className="space-y-2">
              <Button
                onClick={() => void finalizeOrder(true)}
                className="w-full"
                disabled={isFinalizing || isFinalized}
              >
                {isFinalizing ? 'Đang xử lý...' : '🖨️ In biên lai và hoàn tất'}
              </Button>
              <Button
                onClick={() => void finalizeOrder(false)}
                variant="outline"
                className="w-full"
                disabled={isFinalizing || isFinalized}
              >
                {isFinalizing ? 'Đang xử lý...' : '✓ Hoàn tất không in'}
              </Button>
              {isFinalized && (
                <Button onClick={() => router.push('/')} className="w-full">
                  Quay về màn hình chính
                </Button>
              )}
            </div>
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
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="Print Receipt" />
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
