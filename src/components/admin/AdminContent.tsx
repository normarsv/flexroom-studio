'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CancellationPolicy, StudioSettings } from '@/types'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface Props {
  policy: CancellationPolicy | null
  settings: StudioSettings | null
  locale: string
}

type Tab = 'cancellation_settings' | 'coming_soon' | 'emails' | 'station_map'

interface EmailTemplate {
  id: string
  subject_es: string
  subject_en: string
  body_es: string
  body_en: string
}

export default function AdminContent({ policy, settings, locale }: Props) {
  const [tab, setTab] = useState<Tab>('cancellation_settings')

  // Email templates tab
  const [emailTemplates, setEmailTemplates] = useState<Record<string, EmailTemplate>>({})
  const [emailsLoading, setEmailsLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)

  async function openPreview(id: string) {
    setPreviewType(id)
    setPreviewLoading(true)
    setPreviewHtml('')
    const res = await fetch(`/api/admin/email-preview?type=${id}`)
    if (res.ok) setPreviewHtml(await res.text())
    setPreviewLoading(false)
  }

  useEffect(() => {
    if (tab === 'emails' && Object.keys(emailTemplates).length === 0) fetchEmailTemplates()
  }, [tab])

  async function fetchEmailTemplates() {
    setEmailsLoading(true)
    try {
      const res = await fetch('/api/admin/email-templates')
      if (res.ok) {
        const list: EmailTemplate[] = await res.json()
        setEmailTemplates(Object.fromEntries(list.map((t) => [t.id, t])))
      }
    } finally {
      setEmailsLoading(false)
    }
  }

  function updateTemplate(id: string, field: keyof EmailTemplate, value: string) {
    setEmailTemplates((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function handleSaveTemplate(id: string) {
    setSavingTemplate(id)
    try {
      const t = emailTemplates[id]
      const res = await fetch('/api/admin/email-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t),
      })
      if (res.ok) toast.success('Plantilla guardada')
      else toast.error('Error al guardar')
    } finally {
      setSavingTemplate(null)
    }
  }

  // Waitlist
  const [waitlist, setWaitlist] = useState<{ id: string; email: string; created_at: string }[]>([])
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistSubject, setWaitlistSubject] = useState('')
  const [waitlistBody, setWaitlistBody] = useState('')
  const [waitlistSending, setWaitlistSending] = useState(false)

  async function loadWaitlist() {
    setWaitlistLoading(true)
    try {
      const res = await fetch('/api/admin/waitlist')
      if (res.ok) setWaitlist(await res.json())
    } finally {
      setWaitlistLoading(false)
    }
  }

  async function handleSendWaitlistEmail() {
    if (!waitlistSubject.trim() || !waitlistBody.trim()) {
      toast.error('Asunto y mensaje son requeridos')
      return
    }
    if (!confirm(`¿Enviar correo a ${waitlist.length} personas en la lista de espera?`)) return
    setWaitlistSending(true)
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: waitlistSubject, body: `<p>${waitlistBody.replace(/\n/g, '</p><p>')}</p>` }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Correo enviado a ${data.sent} personas`)
        setWaitlistSubject('')
        setWaitlistBody('')
      } else {
        toast.error(data.error || 'Error al enviar')
      }
    } finally {
      setWaitlistSending(false)
    }
  }

  function exportWaitlistCSV() {
    const csv = 'Email,Fecha de registro\n' + waitlist.map(w =>
      `${w.email},${new Date(w.created_at).toLocaleDateString('es-MX')}`
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lista-de-espera.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Coming soon settings
  const [comingSoonEnabled, setComingSoonEnabled] = useState(settings?.coming_soon_enabled ?? false)
  const [comingSoonPassword, setComingSoonPassword] = useState(settings?.coming_soon_password ?? 'flexroom2026')
  const [comingSoonLaunchDate, setComingSoonLaunchDate] = useState(settings?.coming_soon_launch_date ?? '')
  const [comingSoonLoading, setComingSoonLoading] = useState(false)

  async function handleSaveComingSoon() {
    setComingSoonLoading(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coming_soon_enabled: comingSoonEnabled,
          coming_soon_password: comingSoonPassword || 'flexroom2026',
          coming_soon_launch_date: comingSoonLaunchDate || null,
        }),
      })
      if (res.ok) toast.success('Página "Próximamente" actualizada')
      else toast.error('Error al guardar')
    } finally {
      setComingSoonLoading(false)
    }
  }

  // Cancellation policy
  const [contentEs, setContentEs] = useState(policy?.content_es || '')
  const [contentEn, setContentEn] = useState(policy?.content_en || '')
  const [policyLoading, setPolicyLoading] = useState(false)

  // Studio settings
  const [cancellationHours, setCancellationHours] = useState(settings?.cancellation_hours_limit ?? 12)
  const [settingsLoading, setSettingsLoading] = useState(false)

  async function handleSaveSettings() {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_hours_limit: cancellationHours }),
      })
      if (res.ok) toast.success('Configuración guardada')
      else toast.error('Error al guardar')
    } finally {
      setSettingsLoading(false)
    }
  }

  // Station map
  const stationMapRef = useRef<HTMLInputElement>(null)
  const [stationMapUrl, setStationMapUrl] = useState(settings?.station_map_url || '')
  const [stationMapLoading, setStationMapLoading] = useState(false)

  async function handleStationMapUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `homepage/station-map-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fs-media').upload(path, file)
    if (error) { console.error('Upload error:', error); toast.error('Error al subir imagen'); return }
    const { data: { publicUrl } } = supabase.storage.from('fs-media').getPublicUrl(path)
    setStationMapUrl(publicUrl)
  }

  async function handleSaveStationMap() {
    setStationMapLoading(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station_map_url: stationMapUrl || null }),
      })
      if (res.ok) toast.success('Imagen guardada')
      else toast.error('Error al guardar')
    } finally {
      setStationMapLoading(false)
    }
  }

  async function handleSavePolicy() {
    setPolicyLoading(true)
    try {
      const res = await fetch('/api/admin/content/cancellation-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_es: contentEs, content_en: contentEn }),
      })
      if (res.ok) toast.success('Política actualizada')
      else toast.error('Error al guardar')
    } finally {
      setPolicyLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Configuración</h1>

      {/* ── TABS ──────────────────────────────────────────── */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {([
          { key: 'cancellation_settings', label: 'Cancelaciones' },
          { key: 'station_map', label: 'Mapa de estaciones' },
          { key: 'emails', label: 'Correos' },
          { key: 'coming_soon', label: 'Próximamente' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === key ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── COMING SOON ───────────────────────────────────── */}
      {tab === 'coming_soon' && (
        <div className="space-y-6">
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-primary">Página "Próximamente"</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configura la página de cuenta regresiva. Disponible en{' '}
              <a href="/coming-soon" target="_blank" className="underline text-primary">/coming-soon</a>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked={comingSoonEnabled}
              onClick={() => setComingSoonEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${comingSoonEnabled ? 'bg-primary' : 'bg-border'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${comingSoonEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-primary font-medium">
              {comingSoonEnabled ? 'Activada — redirige visitantes a /coming-soon' : 'Desactivada — muestra el sitio normal'}
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-primary block mb-1">Contraseña de acceso anticipado</label>
            <input
              type="text"
              value={comingSoonPassword}
              onChange={(e) => setComingSoonPassword(e.target.value)}
              placeholder="flexroom2026"
              className="w-full max-w-sm px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground mt-1">Usa esta contraseña en el botón "Preview access" para ver el sitio antes del lanzamiento.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-primary block mb-1">Fecha de lanzamiento</label>
            <input
              type="date"
              value={comingSoonLaunchDate}
              onChange={(e) => setComingSoonLaunchDate(e.target.value)}
              className="w-full max-w-sm px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground mt-1">Controla la cuenta regresiva. Si se deja vacío, cuenta 30 días desde hoy.</p>
          </div>

          <Button
            onClick={handleSaveComingSoon}
            disabled={comingSoonLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {comingSoonLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>

        {/* Waitlist */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">Lista de espera</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Personas que se registraron en la página de próximamente.</p>
            </div>
            <div className="flex gap-2">
              {waitlist.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportWaitlistCSV}>
                  Exportar CSV
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadWaitlist} disabled={waitlistLoading}>
                {waitlistLoading ? 'Cargando...' : waitlist.length === 0 ? 'Cargar lista' : 'Actualizar'}
              </Button>
            </div>
          </div>

          {waitlist.length > 0 && (
            <>
              <p className="text-sm font-medium text-primary">{waitlist.length} registros</p>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {waitlist.map((w) => (
                  <div key={w.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-primary">{w.email}</span>
                    <span className="text-muted-foreground text-xs">{new Date(w.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-sm font-medium text-primary">Enviar correo a todos</p>
                <input
                  type="text"
                  placeholder="Asunto del correo"
                  value={waitlistSubject}
                  onChange={(e) => setWaitlistSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <textarea
                  placeholder="Cuerpo del correo (texto plano, cada línea se convierte en párrafo)"
                  value={waitlistBody}
                  onChange={(e) => setWaitlistBody(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <Button
                  onClick={handleSendWaitlistEmail}
                  disabled={waitlistSending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {waitlistSending ? 'Enviando...' : `Enviar a ${waitlist.length} personas`}
                </Button>
              </div>
            </>
          )}
        </div>
        </div>
      )}

      {/* ── CANCELLATION SETTINGS ─────────────────────────── */}
      {tab === 'cancellation_settings' && <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-primary mb-1">Configuración de cancelaciones</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Define cuántas horas antes de la clase puede cancelarse con crédito. Cancelaciones después de ese límite no reciben crédito.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={72}
              value={cancellationHours}
              onChange={(e) => setCancellationHours(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-lg border border-border text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-sm text-muted-foreground">horas antes de la clase</span>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={settingsLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {settingsLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Actualmente: si el usuario cancela con <strong>{cancellationHours}h</strong> o más de anticipación, recibe crédito para otra clase. Si cancela después, pierde la clase y el pago.
        </p>
      </div>}

      {tab === 'cancellation_settings' && <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-primary mb-1">Política de Cancelación</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Este texto aparecerá cuando los usuarios quieran conocer la política de cancelación.
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
          onClick={handleSavePolicy}
          disabled={policyLoading}
          className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {policyLoading ? 'Guardando...' : 'Guardar política'}
        </Button>
      </div>}

      {/* ── STATION MAP IMAGE ─────────────────────────────── */}
      {tab === 'station_map' && <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-primary">Mapa de estaciones (Reformer)</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sube la imagen del plano de estaciones que verán los clientes al reservar una clase de Reformer.
          </p>
        </div>
        {stationMapUrl && (
          <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-border">
            <Image src={stationMapUrl} alt="Mapa de estaciones" width={480} height={320} className="w-full h-auto object-contain" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <input ref={stationMapRef} type="file" accept="image/*" className="hidden" onChange={handleStationMapUpload} />
          <Button variant="outline" onClick={() => stationMapRef.current?.click()}>
            {stationMapUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </Button>
          {stationMapUrl && (
            <Button
              onClick={handleSaveStationMap}
              disabled={stationMapLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {stationMapLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </div>
        {stationMapUrl && (
          <p className="text-xs text-muted-foreground">
            Haz clic en "Guardar" después de subir una nueva imagen.
          </p>
        )}
      </div>}

      {/* ── EMAIL TEMPLATES ───────────────────────────────── */}
      {tab === 'emails' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-primary">Plantillas de correo</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Personaliza los correos automáticos que reciben los clientes. Usa <code className="bg-secondary px-1 rounded text-xs">{'{{variable}}'}</code> para insertar datos dinámicos.
            </p>
          </div>

          {emailsLoading ? (
            <p className="text-sm text-muted-foreground">Cargando plantillas...</p>
          ) : (
            [
              {
                id: 'booking_confirmation',
                title: 'Confirmación de reserva',
                description: 'Se envía cuando un cliente reserva una clase.',
                vars: ['{{name}}', '{{className}}', '{{date}}', '{{instructor}}', '{{duration}}'],
              },
              {
                id: 'package_confirmation',
                title: 'Confirmación de membresía',
                description: 'Se envía cuando un cliente compra una membresía vía Stripe.',
                vars: ['{{name}}', '{{packageName}}', '{{sessionsRemaining}}', '{{expiresAt}}'],
              },
            ].map(({ id, title, description, vars }) => {
              const t = emailTemplates[id]
              if (!t) return null
              return (
                <div key={id} className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5">
                  <div>
                    <h3 className="text-base font-semibold text-primary">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Variables disponibles:{' '}
                      {vars.map((v) => (
                        <code key={v} className="bg-secondary px-1 rounded text-xs mr-1">{v}</code>
                      ))}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-primary block mb-1">Asunto (ES)</label>
                      <input type="text" value={t.subject_es} onChange={(e) => updateTemplate(id, 'subject_es', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-primary block mb-1">Asunto (EN)</label>
                      <input type="text" value={t.subject_en} onChange={(e) => updateTemplate(id, 'subject_en', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-primary block mb-1">Cuerpo (ES)</label>
                      <textarea value={t.body_es} onChange={(e) => updateTemplate(id, 'body_es', e.target.value)} rows={8} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-primary block mb-1">Cuerpo (EN)</label>
                      <textarea value={t.body_en} onChange={(e) => updateTemplate(id, 'body_en', e.target.value)} rows={8} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openPreview(id)}>Vista previa</Button>
                    <Button onClick={() => handleSaveTemplate(id)} disabled={savingTemplate === id} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {savingTemplate === id ? 'Guardando...' : 'Guardar plantilla'}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── EMAIL PREVIEW MODAL ───────────────────────────── */}
      {previewType !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <p className="font-semibold text-primary text-sm">Vista previa del correo</p>
              <button onClick={() => setPreviewType(null)} className="text-muted-foreground hover:text-primary p-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden rounded-b-2xl">
              {previewLoading ? (
                <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Cargando...</div>
              ) : (
                <iframe srcDoc={previewHtml} className="w-full h-full min-h-[500px] border-0" title="Email preview" sandbox="allow-same-origin" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
