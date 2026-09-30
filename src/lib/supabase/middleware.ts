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
    const localeMatch = pathname.match(/^\/(es|en)\//)
    const locale = localeMatch?.[1] ?? 'es'

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/login`
      return NextResponse.redirect(url)
    }
    // Check admin or coach role
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_coach')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.is_admin === true
    const isCoach = profile?.is_coach === true

    if (!isAdmin && !isCoach) {
      // Neither admin nor coach — block entirely
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}`
      return NextResponse.redirect(url)
    }

    if (!isAdmin && isCoach && !pathname.includes('/admin/schedule')) {
      // Coach-only users can only access the schedule
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/admin/schedule`
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
