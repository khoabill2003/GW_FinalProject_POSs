# Restaurant POS System

A modern Restaurant Point of Sale (POS) system with an admin panel built using Next.js 14, TypeScript, and Tailwind CSS.

![Restaurant POS](https://via.placeholder.com/800x400?text=Restaurant+POS+System)

## Features

### POS Terminal
- 🍽️ **Menu Display** - Browse menu items by category
- 🛒 **Cart Management** - Add, remove, and update items in cart
- 💰 **Quick Checkout** - Fast payment processing
- 📱 **Responsive Design** - Works on tablets and desktops

### Admin Panel
- 📊 **Dashboard** - View daily sales, orders, and top-selling items
- 🍔 **Menu Management** - Add, edit, and manage menu items
- 📁 **Categories** - Organize menu items by category
- 📋 **Order Management** - Track and update order status
- 📈 **Reports** - Generate sales reports
- ⚙️ **Settings** - Configure restaurant details and tax rates

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma with SQLite (dev) / PostgreSQL (prod)
- **State Management**: React Context API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Restaurant_POS
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── (pos)/           # POS terminal pages
│   │   ├── admin/           # Admin panel pages
│   │   │   ├── categories/  # Category management
│   │   │   ├── customers/   # Customer management
│   │   │   ├── ingredients/ # Ingredient management
│   │   │   ├── menu/        # Menu item management
│   │   │   ├── orders/      # Order management
│   │   │   ├── reports/     # Sales reports
│   │   │   ├── settings/    # System settings
│   │   │   ├── tables/      # Table management
│   │   │   ├── users/       # User management
│   │   │   └── zones/       # Zone management
│   │   ├── api/             # API routes (thin controllers)
│   │   ├── login/           # Login page
│   │   └── register/        # Register page
│   ├── components/
│   │   ├── pos/             # POS-specific components
│   │   ├── admin/           # Admin panel components
│   │   └── ui/              # Shared UI components (Button, Modal, Input, Badge, Spinner)
│   ├── context/             # React Context providers (Auth, Cart)
│   ├── lib/
│   │   ├── db/              # Database - Prisma client singleton
│   │   ├── middleware/      # Auth middleware (password hashing, role checks)
│   │   └── services/        # Business logic layer
│   │       ├── category.service.ts
│   │       ├── customer.service.ts
│   │       ├── ingredient.service.ts
│   │       ├── menu.service.ts
│   │       ├── order.service.ts
│   │       ├── table.service.ts
│   │       ├── user.service.ts
│   │       └── zone.service.ts
│   └── types/               # TypeScript type definitions
├── prisma/                  # Database schema and migrations
└── public/                  # Static assets
```

## Architecture

Dự án sử dụng **Service Layer Pattern** để tách biệt:
- **API Routes** (`app/api/`): Thin controllers, xử lý HTTP request/response
- **Services** (`lib/services/`): Business logic, validation, data transformations
- **Database** (`lib/db/`): Prisma client singleton
- **Middleware** (`lib/middleware/`): Authentication, authorization helpers

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |

## Environment Variables

Copy `.env.example` to `.env` and update the values:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Usage

### POS Terminal (/)
1. Đăng nhập với tài khoản nhân viên
2. Chọn bàn trước khi tạo đơn
3. Thêm món ăn vào giỏ hàng
4. Tạo đơn - đơn sẽ ở trạng thái "Chờ xác nhận"

### Admin Panel (/admin)
1. Dashboard: Thống kê doanh thu, đơn hàng
2. Quản lý đơn hàng: Thay đổi trạng thái theo quyền
3. Quản lý menu, nguyên liệu, bàn, khu vực
4. Quản lý người dùng và phân quyền

## Role System

| Role | Level | Permissions |
|------|-------|-------------|
| Owner | 100 | Full access, không thể xóa |
| Manager | 50 | Quản lý tất cả, bao gồm hoàn tiền |
| Waiter | 35 | Nhận đơn, phục vụ |
| Kitchen | 30 | Xác nhận, chuẩn bị món |
| Cashier | 25 | Thanh toán, hoàn tất đơn |

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| owner@restaurant.com | owner123 | Owner |
| manager@restaurant.com | manager123 | Manager |
| waiter@restaurant.com | waiter123 | Waiter |
| kitchen@restaurant.com | kitchen123 | Kitchen |
| cashier@restaurant.com | cashier123 | Cashier |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
