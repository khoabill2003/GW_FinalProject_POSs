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

## Setup Checklist
- [x] Create copilot-instructions.md
- [x] Scaffold the Project
- [x] Customize the Project
- [x] Install Required Extensions (none required)
- [x] Compile the Project
- [x] Create and Run Task
- [x] Launch the Project
- [x] Ensure Documentation is Complete
