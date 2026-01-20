import { formatCurrency } from './utils';

interface ReceiptOrder {
  orderNumber: number;
  table?: {
    number: number;
    zone?: string;
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
  paymentStatus?: string;
}

interface RestaurantInfo {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  logo?: string;
}

export const generateReceipt = (order: ReceiptOrder, restaurant: RestaurantInfo) => {
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
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 12px;
            }
            .items-table th {
              border-bottom: 1px dashed #000;
              padding: 4px 0;
              text-align: left;
              font-weight: bold;
            }
            .items-table td {
              padding: 4px 0;
              border-bottom: 1px dotted #ccc;
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
            .item-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 12px;
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
            <!-- Header -->
            <div class="header">
              <div class="logo">🍽️</div>
              <div class="restaurant-name">${restaurant.name}</div>
              ${restaurant.address ? `<div class="restaurant-info">${restaurant.address}</div>` : ''}
              ${restaurant.phone ? `<div class="restaurant-info">☎️ ${restaurant.phone}</div>` : ''}
            </div>

            <!-- Hóa đơn title -->
            <div class="section-title" style="text-align: center; margin: 8px 0; border-bottom: 1px dashed #000; padding-bottom: 8px;">
              HÓA ĐƠN THANH TOÁN
            </div>

            <!-- Thông tin chung -->
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
                <span class="info-value">${order.table.number}${order.table.zone ? ` (${order.table.zone})` : ''}</span>
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

            <!-- Chi tiết hàng hóa -->
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

            <!-- Tóm tắt tiền -->
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

            <!-- Phương thức thanh toán -->
            ${order.paymentMethod ? `
            <div class="payment-info">
              Thanh toán: ${
                order.paymentMethod === 'cash' ? 'TIỀN MẶT' :
                order.paymentMethod === 'card' ? 'THẺ' :
                order.paymentMethod === 'transfer' ? 'CHUYỂN KHOẢN' :
                order.paymentMethod === 'vnpay' ? 'VNPAY' :
                order.paymentMethod.toUpperCase()
              }
            </div>
            ` : ''}

            <!-- Footer -->
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
  }
};
