export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Định dạng mã đơn hàng: 0001, 0002, ..., 9999, 10000, ...
export function formatOrderNumber(num: number): string {
  if (num < 10000) {
    return num.toString().padStart(4, '0');
  }
  return num.toString();
}

export function generateOrderNumber(): number {
  return Math.floor(Math.random() * 9000) + 1000;
}
