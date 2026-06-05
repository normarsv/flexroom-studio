'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { ClassType } from '@/types'

interface Props {
  locale: string
  onClose: () => void
}

export default function RequestClassModal({ locale, onClose }: Props) {
  const t = useTranslations('classes')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    preferred_day: '',
    preferred_time: '',
    class_type: '' as ClassType | '',
    message: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/class-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(t('request_sent'))
        onClose()
      } else {
        toast.error('Error al enviar solicitud')
      }
    } finally {
      setLoading(false)
    }
  }

  const classTypes = Object.entries(CLASS_TYPE_LABELS) as [ClassType, { es: string; en: string }][]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-primary">
          <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
        </button>

        <h2 className="font-heading font-extrabold text-xl text-foreground mb-1">{t('request_class')}</h2>
        <p className="text-sm text-muted-foreground mb-5">{t('request_subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="text"
            placeholder={t('your_name')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            required
            type="email"
            placeholder={t('your_email')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={form.preferred_day}
            onChange={(e) => setForm({ ...form, preferred_day: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="">{t('preferred_day')}</option>
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input
            type="time"
            placeholder={t('preferred_time')}
            value={form.preferred_time}
            onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={form.class_type}
            onChange={(e) => setForm({ ...form, class_type: e.target.value as ClassType })}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="">{t('class_type')}</option>
            {classTypes.map(([type, labels]) => (
              <option key={type} value={type}>
                {locale === 'es' ? labels.es : labels.en}
              </option>
            ))}
          </select>
          <textarea
            placeholder={t('message')}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground">
              {loading ? 'Enviando...' : t('submit_request')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
