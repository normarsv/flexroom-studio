'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  onAccept: () => void
}

export default function WaiverModal({ onAccept }: Props) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [waiverText, setWaiverText] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/waiver/text')
      .then((r) => r.json())
      .then((d) => setWaiverText(d.text))
      .catch(() => setWaiverText(null))
  }, [])

  async function handleAccept() {
    if (!checked) return
    setLoading(true)
    try {
      const res = await fetch('/api/waiver/accept', { method: 'POST' })
      if (!res.ok) { toast.error('Error al guardar tu aceptación'); return }
      onAccept()
    } catch {
      toast.error('Error al guardar tu aceptación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold text-primary mb-1">Carta responsiva</h2>
          <p className="text-xs text-muted-foreground">Léela con atención antes de continuar.</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4 text-sm text-foreground leading-relaxed max-h-64 overflow-y-auto">
          {waiverText === null ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            waiverText.split('\n\n').map((para, i) => (
              <p key={i} className={i > 0 ? 'mt-3' : ''}>{para}</p>
            ))
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary shrink-0"
          />
          <span className="text-sm text-foreground">
            He leído y acepto la carta responsiva de Flex Room Studio.
          </span>
        </label>

        <Button
          onClick={handleAccept}
          disabled={!checked || loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {loading ? 'Guardando...' : 'Aceptar y continuar'}
        </Button>
      </div>
    </div>
  )
}
