import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Flex Room Studio',
  description: 'Tu segundo hogar — Pilates Reformer, Funcional y Barre en San Cristóbal de las Casas',
  manifest: '/manifest.json',
  themeColor: '#1a2e5c',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Flex Room',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={geist.variable}>
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  )
}
