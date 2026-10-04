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

type Tab = 'cancellation_settings' | 'emails' | 'station_map' | 'stripe' | 'waiver'

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
    if (tab === 'stripe') loadStripeStatus()
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

  // Stripe mode
  const [stripeLive, setStripeLive] = useState(settings?.stripe_live_mode ?? false)
  const [stripeStatus, setStripeStatus] = useState<{
    testKeySet: boolean; liveKeySet: boolean; testWebhookSet: boolean; liveWebhookSet: boolean
  } | null>(null)
  const [stripeLoading, setStripeLoading] = useState(false)

  async function loadStripeStatus() {
    const res = await fetch('/api/admin/stripe-status')
    if (res.ok) setStripeStatus(await res.json())
  }

  async function handleToggleStripeMode() {
    const goingLive = !stripeLive
    if (goingLive) {
      let status = stripeStatus
      if (!status) {
        const res = await fetch('/api/admin/stripe-status')
        if (res.ok) { status = await res.json(); setStripeStatus(status) }
      }
      if (!status?.liveKeySet || !status?.liveWebhookSet) {
        toast.error('Agrega primero STRIPE_SECRET_KEY_LIVE y STRIPE_WEBHOOK_SECRET_LIVE en Vercel.')
        return
      }
      if (!confirm('¿Activar modo LIVE? A partir de ahora los pagos serán con tarjetas REALES.')) return
    } else {
      if (!confirm('¿Volver a modo Sandbox? Los pagos volverán a ser de prueba.')) return
    }
    setStripeLoading(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripe_live_mode: goingLive }),
      })
      if (res.ok) {
        setStripeLive(goingLive)
        toast.success(goingLive ? '✅ Modo LIVE activado — pagos con tarjetas reales.' : 'Modo Sandbox activado.')
      } else {
        toast.error('Error al cambiar el modo')
      }
    } finally {
      setStripeLoading(false)
    }
  }

  // Cancellation policy
  const [contentEs, setContentEs] = useState(policy?.content_es || '')
  const [contentEn, setContentEn] = useState(policy?.content_en || '')
  const [policyLoading, setPolicyLoading] = useState(false)

  // Studio settings
  const [cancellationHours, setCancellationHours] = useState(settings?.cancellation_hours_limit ?? 12)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Waiver text
  const [waiverText, setWaiverText] = useState(settings?.waiver_text ?? '')
  const [waiverLoading, setWaiverLoading] = useState(false)

  async function handleSaveWaiver() {
    setWaiverLoading(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiver_text: waiverText }),
      })
      if (res.ok) toast.success('Carta responsiva actualizada')
      else toast.error('Error al guardar')
    } finally {
      setWaiverLoading(false)
    }
  }

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
      <div className="flex gap-1 bg-secondary rounded-lg p-1 overflow-x-auto">
        {([
          { key: 'cancellation_settings', label: 'Cancelaciones' },
          { key: 'station_map', label: 'Mapa' },
          { key: 'waiver', label: 'Carta responsiva' },
          { key: 'emails', label: 'Correos' },
          { key: 'stripe', label: 'Stripe' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === key ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

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

      {/* ── CARTA RESPONSIVA ──────────────────────────────── */}
      {tab === 'waiver' && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-primary mb-1">Carta responsiva</h2>
            <p className="text-sm text-muted-foreground">
              Este texto se muestra a los usuarios antes de su primera reserva o compra. Usa líneas en blanco para separar párrafos.
            </p>
          </div>
          <textarea
            value={waiverText}
            onChange={(e) => setWaiverText(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            placeholder="Escribe el texto de la carta responsiva aquí..."
          />
          <Button
            onClick={handleSaveWaiver}
            disabled={waiverLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {waiverLoading ? 'Guardando...' : 'Guardar carta responsiva'}
          </Button>
        </div>
      )}

      {/* ── STRIPE ────────────────────────────────────────── */}
      {tab === 'stripe' && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-primary">Stripe</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Los pagos usan siempre las llaves Live configuradas en Vercel.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-800 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              LIVE — Pagos reales
            </span>
          </div>
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
            Todos los pagos se procesan en modo Live. Para cambiar las llaves, ve a Vercel → Settings → Environment Variables y actualiza <code className="bg-green-100 px-1 rounded">STRIPE_SECRET_KEY_LIVE</code> y <code className="bg-green-100 px-1 rounded">STRIPE_WEBHOOK_SECRET_LIVE</code>.
          </div>
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline underline-offset-2 hover:opacity-70"
          >
            Abrir Stripe Dashboard →
          </a>
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
