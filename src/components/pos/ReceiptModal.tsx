'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderNumber: number;
    table?: {
      id?: string;
      number: number;
      zone?: string | { id: string; name: string };
    };
    customer?: {
      name: string;
      phone?: string;
    };
    items: Array<{
      menuItem: {
        name: string;
      };
      quantity: number;
      price: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    createdAt: string;
    paymentMethod?: string;
  };
  restaurant?: {
    name: string;
    address?: string;
    phone?: string;
  };
}

interface RestaurantData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  order,
  restaurant: initialRestaurant,
}: ReceiptModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);

  // Fetch restaurant data from database
  useEffect(() => {
    if (!isOpen) return;

    const fetchRestaurant = async () => {
      try {
        const response = await fetch('/api/restaurants');
        if (response.ok) {
          const data = await response.json();
          setRestaurant(data.restaurant);
        }
      } catch (error) {
        console.error('Failed to fetch restaurant:', error);
        // Use initial restaurant if API fails
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (initialRestaurant) {
          setRestaurant(initialRestaurant as any);
        }
      }
    };

    fetchRestaurant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const currentRestaurant = restaurant || initialRestaurant || {
    name: 'Nhà hàng',
    address: '',
    phone: '',
  };

  const handlePrint = () => {
    setIsPrinting(true);
    const printWindow = window.open('', 'PRINT', 'height=800,width=500');

    if (printWindow) {
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

      const html = `
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
                margin: 0 auto;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 12px;
                margin-bottom: 12px;
              }
              .logo {
                font-size: 24px;
                margin-bottom: 5px;
              }
              .restaurant-name {
                font-size: 15px;
                font-weight: bold;
                margin-bottom: 3px;
                text-transform: uppercase;
              }
              .restaurant-info {
                font-size: 11px;
                line-height: 1.5;
                color: #333;
                margin-bottom: 2px;
              }
              .divider {
                border-bottom: 1px dashed #000;
                margin: 10px 0;
              }
              .section-title {
                font-weight: bold;
                font-size: 12px;
                text-transform: uppercase;
                margin-top: 10px;
                margin-bottom: 5px;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                margin-bottom: 4px;
                line-height: 1.4;
              }
              .info-label {
                min-width: 60px;
              }
              .info-value {
                text-align: right;
                flex: 1;
              }
              .item-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
                font-size: 12px;
              }
              .item-name {
                flex: 1;
              }
              .item-qty {
                text-align: center;
                width: 30px;
              }
              .item-price {
                text-align: right;
                width: 50px;
              }
              .totals {
                margin: 10px 0;
                border-top: 1px dashed #000;
                border-bottom: 2px solid #000;
                padding: 8px 0;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
                font-size: 12px;
              }
              .total-label {
                font-weight: bold;
              }
              .total-value {
                text-align: right;
              }
              .total-final {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                font-weight: bold;
                margin-top: 4px;
              }
              .payment-info {
                text-align: center;
                margin: 10px 0;
                font-size: 12px;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                margin-top: 15px;
                font-size: 11px;
                color: #666;
                line-height: 1.6;
              }
              .thank-you {
                text-align: center;
                margin-top: 10px;
                font-size: 13px;
                font-weight: bold;
                text-transform: uppercase;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                  width: 80mm;
                }
                .receipt {
                  max-width: 100%;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <div class="logo">🍽️</div>
                <div class="restaurant-name">${currentRestaurant.name}</div>
                ${currentRestaurant.address ? `<div class="restaurant-info">${currentRestaurant.address}</div>` : ''}
                ${currentRestaurant.phone ? `<div class="restaurant-info">☎️ ${currentRestaurant.phone}</div>` : ''}
              </div>

              <div class="section-title" style="text-align: center; margin: 8px 0; border-bottom: 1px dashed #000; padding-bottom: 8px;">
                HÓA ĐƠN THANH TOÁN
              </div>

              <div style="margin: 10px 0;">
                <div class="info-row">
                  <span class="info-label">Số HĐ:</span>
                  <span class="info-value">${String(order.orderNumber).padStart(4, '0')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Ngày:</span>
                  <span class="info-value">${formattedDate}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Giờ:</span>
                  <span class="info-value">${formattedTime}</span>
                </div>
                ${order.table ? `
                <div class="info-row">
                  <span class="info-label">Bàn:</span>
                  <span class="info-value">${order.table.number}${order.table.zone ? ` (${typeof order.table.zone === 'string' ? order.table.zone : order.table.zone.name})` : ''}</span>
                </div>
                ` : `
                <div class="info-row">
                  <span class="info-label">Loại:</span>
                  <span class="info-value">Mang về</span>
                </div>
                `}
                ${order.customer ? `
                <div class="info-row">
                  <span class="info-label">Khách:</span>
                  <span class="info-value">${order.customer.name}</span>
                </div>
                ` : ''}
              </div>

              <div class="divider"></div>

              <div class="section-title">Chi tiết hàng hóa</div>
              <div style="margin: 8px 0;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px; font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
                  <span>Tên món</span>
                  <span style="text-align: center; min-width: 30px;">SL</span>
                  <span style="text-align: right; min-width: 50px;">Thành tiền</span>
                </div>
                ${order.items.map(item => `
                <div class="item-row">
                  <span style="flex: 1;">${item.menuItem.name}</span>
                  <span style="text-align: center; width: 30px;">${item.quantity}</span>
                  <span style="text-align: right; width: 50px;">${formatCurrency(item.price * item.quantity)}</span>
                </div>
                `).join('')}
              </div>

              <div class="divider"></div>

              <div class="totals">
                <div class="total-row">
                  <span>Thành tiền:</span>
                  <span class="total-value">${formatCurrency(order.subtotal)}</span>
                </div>
                <div class="total-row">
                  <span>Khuyến mại:</span>
                  <span class="total-value">0đ</span>
                </div>
                <div class="total-row">
                  <span>Thuế (8%):</span>
                  <span class="total-value">${formatCurrency(order.tax)}</span>
                </div>
                <div class="total-final">
                  <span>TỔNG CỘNG:</span>
                  <span>${formatCurrency(order.total)}</span>
                </div>
              </div>

              ${order.paymentMethod ? `
              <div class="payment-info">
                Thanh toán: ${
                  order.paymentMethod === 'cash' ? 'TIỀN MẶT' :
                  order.paymentMethod === 'vnpay' ? 'VNPAY' :
                  order.paymentMethod.toUpperCase()
                }
              </div>
              ` : ''}

              <div class="thank-you">Cảm ơn quý khách!</div>
              <div class="footer">
                <p>Hân hạnh được phục vụ</p>
                <p style="margin-top: 8px; font-size: 10px;">(Vui lòng giữ lại hóa đơn này)</p>
              </div>
            </div>

            <script>
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      setIsPrinting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">🧾 HÓA ĐƠN</h2>

        {/* Receipt Preview */}
        <div className="bg-gray-50 border border-gray-300 rounded p-4 mb-4 max-h-96 overflow-y-auto text-sm font-mono">
          <div className="text-center mb-2">
            <p className="font-bold text-base">{currentRestaurant.name}</p>
            {currentRestaurant.address && <p className="text-xs">{currentRestaurant.address}</p>}
            {currentRestaurant.phone && <p className="text-xs">☎️ {currentRestaurant.phone}</p>}
          </div>

          <div className="border-b border-dashed border-gray-400 my-2"></div>

          <div className="text-center font-bold mb-2">HÓA ĐƠN THANH TOÁN</div>

          <div className="text-xs mb-2">
            <div className="flex justify-between">
              <span>Số HĐ:</span>
              <span>{String(order.orderNumber).padStart(4, '0')}</span>
            </div>
            <div className="flex justify-between">
              <span>Ngày:</span>
              <span>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Giờ:</span>
              <span>{new Date(order.createdAt).toLocaleTimeString('vi-VN')}</span>
            </div>
            {order.table && (
              <div className="flex justify-between">
                <span>Bàn:</span>
                <span>{order.table.number}{order.table.zone ? ` (${typeof order.table.zone === 'string' ? order.table.zone : order.table.zone.name})` : ''}</span>
              </div>
            )}
            {order.customer && (
              <div className="flex justify-between">
                <span>Khách:</span>
                <span>{order.customer.name}</span>
              </div>
            )}
          </div>

          <div className="border-b border-dashed border-gray-400 my-2"></div>

          <div className="text-xs mb-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.quantity}x {item.menuItem.name}</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-b border-dashed border-gray-400 my-2"></div>

          <div className="text-xs font-bold space-y-1">
            <div className="flex justify-between">
              <span>Tạm tính:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Thuế (8%):</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-400 pt-1 mt-1">
              <span>TỔNG CỘNG:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {order.paymentMethod && (
            <div className="text-center text-xs mt-2 font-bold">
              Thanh toán: {order.paymentMethod === 'cash' ? 'TIỀN MẶT' : 'VNPAY'}
            </div>
          )}

          <div className="text-center text-xs mt-2">
            <p>Cảm ơn quý khách!</p>
            <p className="text-gray-500">Hân hạnh được phục vụ</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            🖨️ In Hóa Đơn
          </button>
        </div>
      </div>
    </Modal>
  );
}
