import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BookDataProvider } from '@/context/BookDataContext'
import { AdminProvider } from '@/context/AdminContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WhatIsJohnnyReading.com',
  description: 'Your personal library from Goodreads',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AdminProvider>
          <BookDataProvider>
            {children}
          </BookDataProvider>
        </AdminProvider>
      </body>
    </html>
  )
}