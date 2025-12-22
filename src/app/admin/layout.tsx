import Link from 'next/link';
import AdminGuard from '@/components/admin/AdminGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-100">
        {/* Admin Header */}
        <header className="bg-gray-900 text-white h-16 flex items-center justify-between px-6 shadow-md">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">🍽️ Restaurant POS - Admin</h1>
          </div>
          
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              POS Terminal
            </Link>
          </nav>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-64px)]">
            <nav className="p-4 space-y-2">
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                📊 Tổng quan
              </Link>
              <Link
                href="/admin/orders"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                📋 Order
              </Link>
              <Link
                href="/admin/tables"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                🪑 Bàn
              </Link>
              
              {/* Thực Đơn với submenu */}
              <div className="space-y-1">
                <Link
                  href="/admin/menu"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  🍽️ Thực Đơn
                </Link>
                <div className="pl-8 space-y-1">
                  <Link
                    href="/admin/menu?type=single"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    • Món lẻ
                  </Link>
                  <Link
                    href="/admin/menu?type=buffet"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    • Buffet
                  </Link>
                  <Link
                    href="/admin/menu?type=set_menu"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    • Set Menu
                  </Link>
                </div>
              </div>

              <Link
                href="/admin/categories"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                📁 Danh mục
              </Link>
              <Link
                href="/admin/ingredients"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                🥬 Nguyên liệu
              </Link>
              <Link
                href="/admin/customers"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                👤 Khách Hàng
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                👥 Nhân viên
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                ⚙️ Cài đặt
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
