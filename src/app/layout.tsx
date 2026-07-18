import type { Metadata } from 'next'
import { Nunito, DM_Sans } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
})

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Flex Room Studio',
  description: 'Tu segundo hogar — Pilates Reformer, Funcional y Barre en San Cristóbal de las Casas',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Flex Room',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${dmSans.variable} ${nunito.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  )
}
