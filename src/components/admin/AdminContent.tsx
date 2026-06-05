'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CancellationPolicy } from '@/types'
import { toast } from 'sonner'

interface Props {
  policy: CancellationPolicy | null
  locale: string
}

export default function AdminContent({ policy, locale }: Props) {
  const [contentEs, setContentEs] = useState(policy?.content_es || '')
  const [contentEn, setContentEn] = useState(policy?.content_en || '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/content/cancellation-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_es: contentEs, content_en: contentEn }),
      })
      if (res.ok) {
        toast.success('Política actualizada')
      } else {
        toast.error('Error al guardar')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Contenido del sitio</h1>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Política de Cancelación</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Este texto aparecerá en el sitio cuando los usuarios quieran saber la política de cancelación.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-primary block mb-2">Español</label>
            <textarea
              value={contentEs}
              onChange={(e) => setContentEs(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono"
              placeholder="Política de cancelación en español..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-primary block mb-2">English</label>
            <textarea
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono"
              placeholder="Cancellation policy in English..."
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
