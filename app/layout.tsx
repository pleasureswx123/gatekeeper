import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Suspense } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import './globals.css'

export const metadata: Metadata = {
  title: '明鉴财法风控系统',
  description: '智能合同审核、发票验证、报销审批一体化平台',
  generator: 'v0.app',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh">
      <body className="font-sans antialiased bg-background">
        <Suspense fallback={null}>
          <AuthGuard>{children}</AuthGuard>
        </Suspense>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

