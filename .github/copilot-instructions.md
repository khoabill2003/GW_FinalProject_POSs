# Restaurant POS System - Copilot Instructions

## Project Overview
A modern Restaurant Point of Sale (POS) system with an admin panel built using Next.js 14, TypeScript, and Tailwind CSS.

## Tech Stack
- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State Management**: React Context API
- **Database**: Prisma with SQLite (development) / PostgreSQL (production)

## Project Structure
```
├── src/
│   ├── app/
│   │   ├── (pos)/           # POS terminal pages
│   │   ├── admin/           # Admin panel pages
│   │   └── api/             # API routes
│   ├── components/
│   │   ├── pos/             # POS-specific components
│   │   ├── admin/           # Admin panel components
│   │   └── ui/              # Shared UI components
│   ├── lib/                 # Utility functions
│   ├── types/               # TypeScript type definitions
│   └── context/             # React Context providers
├── prisma/                  # Database schema and migrations
└── public/                  # Static assets
```

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint


# DATABASE
DATABASE_URL="file:C:/Users/Admin/Desktop/Restaurant_POS/prisma/dev.db"

# NEXT.JS
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# VNPAY PAYMENT GATEWAY (Sandbox for testing)
VNP_TMN_CODE=HR1I3T0P
VNP_HASH_SECRET=JCWWMDOW32WVY1EAM0ER97XQHTGEPLEZ
VNP_API_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:3000/payment-result
VNP_IPN_URL=http://localhost:3000/api/payments/vnpay/ipn

# AUTHENTICATION
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL=http://localhost:3000