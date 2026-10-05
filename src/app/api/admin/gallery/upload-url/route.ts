import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { path } = await request.json()
  if (!path) return NextResponse.json({ error: 'Path requerido' }, { status: 400 })

  const adminClient = createAdminClient()

  // Ensure the bucket exists — create it if not
  const { data: buckets } = await adminClient.storage.listBuckets()
  const bucketExists = buckets?.some((b: any) => b.name === 'media')
  if (!bucketExists) {
    const { error: createError } = await adminClient.storage.createBucket('media', { public: true })
    if (createError) return NextResponse.json({ error: `No se pudo crear el bucket: ${createError.message}` }, { status: 500 })
  }

  const { data, error } = await adminClient.storage.from('media').createSignedUploadUrl(path)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token })
}
