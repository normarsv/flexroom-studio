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
  defaultSpecial?: boolean
}

export default function SessionFormModal({ session, instructors, locale, onClose, onSaved, defaultSpecial = false }: Props) {
  const isNew = !session
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    date: session?.date || '',
    start_time: session?.start_time?.slice(0, 5) || '',
    duration_minutes: session?.duration_minutes || 50,
    class_type: session?.class_type || 'funcional' as ClassType,
    instructor_id: session?.instructor_id || instructors[0]?.id || '',
    capacity: session?.capacity || 5,
    is_special: session?.is_special || defaultSpecial,
    event_title: session?.event_title || '',
    event_description: session?.event_description || '',
    event_type_label: session?.event_type_label || '',
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

          {/* Special event toggle */}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, is_special: !f.is_special }))}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors text-sm font-medium ${
              form.is_special
                ? 'border-[#F4EF71] bg-[#F4EF71]/15 text-primary'
                : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/30'
            }`}
          >
            <span>✨ Evento especial</span>
            <span className={`w-9 h-5 rounded-full transition-colors relative ${form.is_special ? 'bg-primary' : 'bg-border'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_special ? 'left-4' : 'left-0.5'}`} />
            </span>
          </button>

          {/* Special event fields */}
          {form.is_special && (
            <div className="space-y-3 p-4 rounded-xl bg-[#F4EF71]/10 border border-[#F4EF71]/40">
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Nombre del evento *</label>
                <input
                  required={form.is_special}
                  value={form.event_title}
                  onChange={(e) => setForm((f) => ({ ...f, event_title: e.target.value }))}
                  placeholder="Ej: Taller de Pilates con invitada especial"
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Tipo de evento (opcional)</label>
                <input
                  value={form.event_type_label}
                  onChange={(e) => setForm((f) => ({ ...f, event_type_label: e.target.value }))}
                  placeholder="Ej: Taller, Retiro, Masterclass, Clase abierta..."
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Descripción (opcional)</label>
                <textarea
                  rows={3}
                  value={form.event_description}
                  onChange={(e) => setForm((f) => ({ ...f, event_description: e.target.value }))}
                  placeholder="Describe el evento, qué incluye, qué traer..."
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                />
              </div>
            </div>
          )}

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
