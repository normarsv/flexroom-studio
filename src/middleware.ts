import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  // First handle Supabase auth session
  const authResponse = await updateSession(request)

  // If auth redirected, return that
  if (authResponse.status === 307 || authResponse.status === 302) {
    return authResponse
  }

  // Then handle i18n routing
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/',
    '/(es|en)/:path*',
  ],
}
