'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BRAND } from '@/lib/constants'

export default function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('auth')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error(t('passwords_dont_match'))
      return
    }
    setLoading(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success(t('password_updated'))
      const { locale } = await params
      router.push(`/${locale}/login`)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-secondary/30">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">{BRAND.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('update_password')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              placeholder={t('new_password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="password"
              placeholder={t('confirm_password')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? 'Cargando...' : t('update_password')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
