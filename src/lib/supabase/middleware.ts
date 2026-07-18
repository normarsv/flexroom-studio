import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protect admin routes
  const isAdminPath = pathname.includes('/admin')
  if (isAdminPath) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/es/login'
      return NextResponse.redirect(url)
    }
    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = '/es'
      return NextResponse.redirect(url)
    }
  }

  // Coming soon redirect — skip admin, login, api, auth, the page itself, and preview holders
  const hasPreviewAccess = request.cookies.get('preview_access')?.value === '1'
  const isExcluded = hasPreviewAccess || pathname.includes('/admin') || pathname.includes('/login') || pathname.includes('/coming-soon')
  if (!isExcluded) {
    const { data: settings } = await supabase
      .from('studio_settings')
      .select('coming_soon_enabled')
      .eq('id', 1)
      .single()

    if (settings?.coming_soon_enabled) {
      const url = request.nextUrl.clone()
      url.pathname = '/coming-soon'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
