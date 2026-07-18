import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Toaster } from '@/components/ui/sonner'
import { createClient } from '@/lib/supabase/server'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'es' | 'en')) {
    notFound()
  }

  const [messages, supabase] = await Promise.all([getMessages(), createClient()])
  const { data: settings } = await supabase.from('studio_settings').select('*').eq('id', 1).single()

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex flex-col min-h-screen">
        <Navbar locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
        <Toaster richColors position="top-center" />
      </div>
    </NextIntlClientProvider>
  )
}
