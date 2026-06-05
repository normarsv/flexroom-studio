'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { ClassSession, ClassType, Instructor } from '@/types'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  session: ClassSession | null
  instructors: Instructor[]
  locale: string
  onClose: () => void
  onSaved: () => void
}

export default function SessionFormModal({ session, instructors, locale, onClose, onSaved }: Props) {
  const isNew = !session
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    date: session?.date || '',
    start_time: session?.start_time?.slice(0, 5) || '',
    duration_minutes: session?.duration_minutes || 50,
    class_type: session?.class_type || 'funcional' as ClassType,
    instructor_id: session?.instructor_id || instructors[0]?.id || '',
    capacity: session?.capacity || 5,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const url = isNew ? '/api/admin/sessions' : `/api/admin/sessions/${session!.id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(isNew ? 'Clase creada' : 'Clase actualizada')
        onSaved()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al guardar')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-primary">
          <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-primary mb-5">
          {isNew ? 'Nueva clase' : 'Editar clase'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Fecha</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Hora</label>
              <input
                type="time"
                required
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-primary block mb-1">Tipo de clase</label>
            <select
              value={form.class_type}
              onChange={(e) => setForm({ ...form, class_type: e.target.value as ClassType })}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Object.entries(CLASS_TYPE_LABELS).map(([type, labels]) => (
                <option key={type} value={type}>{labels.es}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-primary block mb-1">Instructora</label>
            <select
              value={form.instructor_id}
              onChange={(e) => setForm({ ...form, instructor_id: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Duración (min)</label>
              <input
                type="number"
                min={30}
                max={120}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Capacidad</label>
              <input
                type="number"
                min={1}
                max={50}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground">
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
