import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import { AuthProvider } from '@/context/AuthContext'

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Restaurant POS System',
  description: 'Modern Point of Sale system for restaurants',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
