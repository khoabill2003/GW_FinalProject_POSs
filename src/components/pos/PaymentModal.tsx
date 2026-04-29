'use client';

import { useState, useRef, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';

interface PaymentModalProps {
  isOpen: boolean;
  order: Order;
  onClose: () => void;
  onPaymentFinalized: () => void;
  restaurant?: {
    name: string;
    address?: string;
    phone?: string;
    image?: string;
    taxRate?: number;
  } | null;
}

export default function PaymentModal({
  isOpen,
  order,
  onClose,
  onPaymentFinalized,
  restaurant,
}: PaymentModalProps) {
  const [step, setStep] = useState<'method' | 'cash' | 'change' | 'vnpay' | 'confirm' | 'success'>('method');
  const [cashReceived, setCashReceived] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paidOrder, setPaidOrder] = useState<Order | null>(null);
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  const amount = order.total;
  const change = cashReceived - amount;

  useEffect(() => {
    if (!isOpen) {
      setStep('method');
      setCashReceived(0);
      setError('');
      setIsProcessing(false);
      setPaidOrder(null);
    }
  }, [isOpen]);

  const handleCashPayment = () => {
    setError('');
    if (cashReceived < amount) {
      setError(`Tiền nhận chưa đủ. Còn thiếu ${formatCurrency(amount - cashReceived)}`);
      return;
    }
    if (change > 0) {
      setStep('change');
      return;
    }
    setStep('confirm');
  };

  const handleConfirmCash = async () => {
    setIsProcessing(true);
    setError('');
    try {
      // Call payment confirmation API - Only update paymentStatus, keep status as 'served'
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'cash',
          paymentStatus: 'paid',
          // Note: NOT setting status to 'completed' yet - will be done after receipt modal closes
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Xác nhận thanh toán thất bại');
      }

      const data = await response.json();
      setPaidOrder(data.order);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hệ thống');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVNPayPayment = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const response = await fetch('/api/payments/vnpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.total,
          orderInfo: `Thanh toan don hang ${order.orderNumber}`,
          customerName: order.customer?.name,
          customerPhone: order.customer?.phone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Tạo URL thanh toán VNPay thất bại');
      }

      const data = await response.json();
      if (data.paymentUrl) {
        // Lưu order ID vào session để verify sau
        sessionStorage.setItem('vnpay_order_id', order.id);
        sessionStorage.setItem('vnpay_order_data', JSON.stringify(order));
        // Redirect to VNPay
        window.location.href = data.paymentUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hệ thống');
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    if (!printIframeRef.current) return;
    
    // Generate bill HTML
    const date = new Date(order.createdAt);
    const formattedDate = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const billHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Hóa đơn ${order.orderNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 13px;
              width: 80mm;
              margin: 0 auto;
              padding: 10px;
              background: white;
              color: #333;
            }
            .receipt {
              width: 100%;
              max-width: 80mm;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .restaurant-name {
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .divider {
              border-bottom: 1px dashed #000;
              margin: 10px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 3px;
            }
            .section-title {
              font-weight: bold;
              font-size: 12px;
              margin-top: 10px;
              margin-bottom: 5px;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 3px;
            }
            .total-section {
              border-top: 2px solid #000;
              margin-top: 10px;
              padding-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 11px;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="restaurant-name">${restaurant?.name || 'Nhà hàng'}</div>
              ${restaurant?.address ? `<div style="font-size: 11px; margin-top: 3px;">${restaurant.address}</div>` : ''}
              ${restaurant?.phone ? `<div style="font-size: 11px;">${restaurant.phone}</div>` : ''}
            </div>

            <div class="info-row">
              <span>Mã: #${order.orderNumber.toString().padStart(6, '0')}</span>
              <span>${formattedDate}</span>
            </div>
            <div class="info-row">
              <span>Giờ: ${formattedTime}</span>
            </div>
            ${order.table ? `<div class="info-row"><span>Bàn: ${order.table.number}</span></div>` : ''}

            <div class="divider"></div>

            <div class="section-title">CHI TIẾT ĐƠN HÀNG</div>
            ${order.items?.map((item) => `
              <div class="item-row">
                <span>${item.menuItem?.name || 'Sản phẩm'} x${item.quantity}</span>
                <span>${formatCurrency(item.totalPrice || (item.quantity * (item.unitPrice || item.price || 0)))}</span>
              </div>
            `).join('') || ''}

            <div class="divider"></div>

            <div class="total-section">
              <div class="info-row">
                <span>Cộng tiền hàng:</span>
                <span>${formatCurrency(order.subtotal || 0)}</span>
              </div>
              ${order.tax ? `
                <div class="info-row">
                  <span>Thuế (${restaurant?.taxRate || 8}%):</span>
                  <span>${formatCurrency(order.tax)}</span>
                </div>
              ` : ''}
              <div class="total-row">
                <span>TỔNG CỘNG:</span>
                <span>${formatCurrency(order.total)}</span>
              </div>
              <div class="info-row">
                <span>Hình thức:</span>
                <span>${order.paymentMethod === 'cash' ? 'Tiền mặt' : order.paymentMethod === 'vnpay' ? 'VNPay' : 'Khác'}</span>
              </div>
            </div>

            <div class="footer">
              <div>Cảm ơn quý khách!</div>
              <div style="margin-top: 5px; font-size: 10px;">Vui lòng giữ lại hoá đơn</div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Write to iframe and print
    const iframeWindow = printIframeRef.current.contentWindow;
    if (iframeWindow) {
      iframeWindow.document.open();
      iframeWindow.document.write(billHTML);
      iframeWindow.document.close();
      setTimeout(() => {
        iframeWindow.print();
      }, 250);
    }
  };

  const handleCompletePayment = async () => {
    const finalOrder = paidOrder || order;

    setIsProcessing(true);
    setError('');
    try {
      const response = await fetch(`/api/orders/${finalOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          paymentStatus: 'paid',
          paymentMethod: finalOrder.paymentMethod || 'cash',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Không thể hoàn thành đơn hàng');
      }

      onPaymentFinalized();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hệ thống');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💳 Thanh toán đơn hàng">
      <div className="space-y-4 min-h-96">
        {/* ORDER INFO */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Số đơn hàng</p>
              <p className="text-xl font-bold">#{order.orderNumber.toString().padStart(6, '0')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng tiền</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(order.total)}</p>
            </div>
          </div>
        </div>

        {/* PAYMENT METHOD SELECTION */}
        {step === 'method' && (
          <div className="space-y-3">
            <p className="font-semibold text-gray-900">Chọn hình thức thanh toán:</p>
            <button
              onClick={() => setStep('cash')}
              className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
            >
              <p className="font-semibold text-gray-900">💰 Tiền mặt</p>
              <p className="text-sm text-gray-600">Thanh toán bằng tiền mặt</p>
            </button>
            <button
              onClick={() => setStep('vnpay')}
              className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition text-left"
            >
              <p className="font-semibold text-gray-900">🌐 VNPay</p>
              <p className="text-sm text-gray-600">Thanh toán qua cổng VNPay</p>
            </button>
          </div>
        )}

        {/* CASH PAYMENT */}
        {step === 'cash' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiền khách đưa (đ)
              </label>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => {
                  setCashReceived(Math.max(0, Number(e.target.value)));
                  setError('');
                }}
                placeholder="Nhập số tiền nhận được"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono"
                autoFocus
              />
            </div>

            {cashReceived >= 0 && (
              <div className={`p-4 rounded-lg text-center ${
                change >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <p className="text-sm text-gray-600">
                  {change >= 0 ? 'Tiền thối' : 'Còn thiếu'}
                </p>
                <p className={`text-2xl font-bold font-mono ${
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(Math.abs(change))}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('method')}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                ◀ Quay lại
              </button>
              <button
                onClick={handleCashPayment}
                disabled={cashReceived < amount || isProcessing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
              >
                {isProcessing ? '⏳ Đang xử lý...' : change > 0 ? 'Xác nhận thối tiền →' : 'Tiếp tục →'}
              </button>
            </div>
          </div>
        )}

        {/* CONFIRM CHANGE */}
        {step === 'change' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <p className="text-sm text-amber-900 mb-3">Xác nhận đã thối tiền cho khách:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng tiền:</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Khách đưa:</span>
                  <span className="font-medium">{formatCurrency(cashReceived)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Tiền thối:</span>
                  <span className="font-medium text-green-600">{formatCurrency(change)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('cash')}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                ◀ Quay lại
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium"
              >
                ✓ Đã thối tiền
              </button>
            </div>
          </div>
        )}

        {/* CONFIRM CASH PAYMENT + PRINT */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-gray-700 mb-3">✓ Xác nhận thông tin:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng tiền:</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiền nhận:</span>
                  <span className="font-medium">{formatCurrency(cashReceived)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Tiền thối:</span>
                  <span className="font-medium text-green-600">{formatCurrency(change)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('cash')}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                ◀ Sửa lại
              </button>
              <button
                onClick={handleConfirmCash}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
              >
                {isProcessing ? '⏳ Đang xử lý...' : '✓ Xác nhận thanh toán'}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS + PRINT */}
        {step === 'success' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-semibold text-green-900">Thanh toán thành công!</p>
              <p className="text-sm text-green-700 mt-2">Đơn hàng #{order.orderNumber.toString().padStart(6, '0')}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">In biên lai?</p>
              <button
                onClick={() => {
                  handlePrint();
                  setTimeout(() => {
                    void handleCompletePayment();
                  }, 400);
                }}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? '⏳ Đang xử lý...' : '🖨️ In biên lai và hoàn thành'}
              </button>
              <button
                onClick={() => void handleCompletePayment()}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? '⏳ Đang xử lý...' : '✓ Hoàn thành không in'}
              </button>
            </div>
          </div>
        )}

        {/* VNPAY */}
        {step === 'vnpay' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <p className="text-sm text-orange-900">
                ⚠️ Khách sẽ được chuyển hướng đến cổng thanh toán VNPay. 
                Xác nhận để tiếp tục.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('method')}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                ◀ Quay lại
              </button>
              <button
                onClick={handleVNPayPayment}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
              >
                {isProcessing ? '⏳ Đang tải...' : 'Thanh toán VNPay →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden iframe for printing */}
      <iframe
        ref={printIframeRef}
        style={{ display: 'none' }}
        title="Print Receipt"
      />
    </Modal>
  );
}
