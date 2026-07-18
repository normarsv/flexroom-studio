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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Flex Room',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${dmSans.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        {/* Light mode favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" media="(prefers-color-scheme: light)" />
        {/* Dark mode favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-dark-32.png" media="(prefers-color-scheme: dark)" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-dark-16.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  )
}
