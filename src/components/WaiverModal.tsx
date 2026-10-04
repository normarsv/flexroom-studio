'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  onAccept: () => void
}

export default function WaiverModal({ onAccept }: Props) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

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

        <div className="bg-secondary/50 rounded-xl p-4 text-sm text-foreground leading-relaxed max-h-64 overflow-y-auto space-y-3">
          <p>
            Al utilizar los servicios de <strong>Flex Room Studio</strong>, el/la participante
            acepta voluntariamente los riesgos inherentes a las actividades físicas impartidas en
            el estudio, incluyendo pero no limitándose a ejercicio funcional, pilates en reformer
            y barre.
          </p>
          <p>
            El/la participante declara encontrarse en condiciones físicas adecuadas para realizar
            actividad física, y en caso de tener alguna condición médica, lesión previa o
            limitación, se compromete a informarlo al instructor antes de la clase.
          </p>
          <p>
            Flex Room Studio y su personal no serán responsables por lesiones, accidentes o daños
            que pudieran ocurrir durante la práctica de las actividades, salvo que sean causados por
            negligencia directa del estudio.
          </p>
          <p>
            Esta carta responsiva tiene vigencia indefinida y aplica a todas las clases y
            actividades realizadas en Flex Room Studio.
          </p>
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
