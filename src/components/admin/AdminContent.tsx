'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CancellationPolicy, HomepageContent, StudioSettings } from '@/types'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faTrash } from '@fortawesome/free-solid-svg-icons'

interface Props {
  policy: CancellationPolicy | null
  homepage: HomepageContent | null
  settings: StudioSettings | null
  locale: string
}

type Tab = 'homepage' | 'footer' | 'coming_soon' | 'cancellation_settings'

export default function AdminContent({ policy, homepage, settings, locale }: Props) {
  const [tab, setTab] = useState<Tab>('homepage')

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

  // Footer settings
  const [footerTaglineEs, setFooterTaglineEs] = useState(settings?.footer_tagline_es ?? '')
  const [footerTaglineEn, setFooterTaglineEn] = useState(settings?.footer_tagline_en ?? '')
  const [footerAddress, setFooterAddress] = useState(settings?.footer_address ?? '')
  const [footerInstagram, setFooterInstagram] = useState(settings?.footer_instagram ?? '')
  const [footerEmail, setFooterEmail] = useState(settings?.footer_email ?? '')
  const [footerPhone, setFooterPhone] = useState(settings?.footer_phone ?? '')
  const [footerLoading, setFooterLoading] = useState(false)

  async function handleSaveFooter() {
    setFooterLoading(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          footer_tagline_es: footerTaglineEs,
          footer_tagline_en: footerTaglineEn,
          footer_address: footerAddress,
          footer_instagram: footerInstagram,
          footer_email: footerEmail,
          footer_phone: footerPhone || null,
        }),
      })
      if (res.ok) toast.success('Footer actualizado')
      else toast.error('Error al guardar')
    } finally {
      setFooterLoading(false)
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

  // Homepage text
  const [heroTitleEs, setHeroTitleEs] = useState(homepage?.hero_title_es || '')
  const [heroTitleEn, setHeroTitleEn] = useState(homepage?.hero_title_en || '')
  const [heroSubtitleEs, setHeroSubtitleEs] = useState(homepage?.hero_subtitle_es || '')
  const [heroSubtitleEn, setHeroSubtitleEn] = useState(homepage?.hero_subtitle_en || '')
  const [heroImageUrl, setHeroImageUrl] = useState(homepage?.hero_image_url || '')
  const [aboutTitleEs, setAboutTitleEs] = useState(homepage?.about_title_es || '')
  const [aboutTitleEn, setAboutTitleEn] = useState(homepage?.about_title_en || '')
  const [aboutTextEs, setAboutTextEs] = useState(homepage?.about_text_es || '')
  const [aboutTextEn, setAboutTextEn] = useState(homepage?.about_text_en || '')
  const [aboutImageUrl, setAboutImageUrl] = useState(homepage?.about_image_url || '')
  const [homepageLoading, setHomepageLoading] = useState(false)

  const heroImgRef = useRef<HTMLInputElement>(null)
  const aboutImgRef = useRef<HTMLInputElement>(null)

  async function uploadImage(file: File, prefix: string): Promise<string | null> {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `homepage/${prefix}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fs-media').upload(path, file)
    if (error) { console.error('Upload error:', error); toast.error('Error al subir imagen'); return null }
    const { data: { publicUrl } } = supabase.storage.from('fs-media').getPublicUrl(path)
    return publicUrl
  }

  async function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file, 'hero')
    if (url) setHeroImageUrl(url)
  }

  async function handleAboutImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file, 'about')
    if (url) setAboutImageUrl(url)
  }

  async function handleSaveHomepage() {
    setHomepageLoading(true)
    try {
      const res = await fetch('/api/admin/content/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_title_es: heroTitleEs,
          hero_title_en: heroTitleEn,
          hero_subtitle_es: heroSubtitleEs,
          hero_subtitle_en: heroSubtitleEn,
          hero_image_url: heroImageUrl || null,
          about_title_es: aboutTitleEs,
          about_title_en: aboutTitleEn,
          about_text_es: aboutTextEs,
          about_text_en: aboutTextEn,
          about_image_url: aboutImageUrl || null,
        }),
      })
      if (res.ok) toast.success('Página de inicio actualizada')
      else toast.error('Error al guardar')
    } finally {
      setHomepageLoading(false)
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
          { key: 'homepage', label: 'Página de inicio' },
          { key: 'footer', label: 'Footer' },
          { key: 'cancellation_settings', label: 'Cancelaciones' },
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

      {/* ── HOMEPAGE CONTENT ──────────────────────────────── */}
      {tab === 'homepage' && <>
      <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Página de inicio</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edita los textos e imágenes que aparecen en la página principal del sitio.
          </p>
        </div>

        {/* Hero section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            Hero
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Título (ES)</label>
              <input
                type="text"
                value={heroTitleEs}
                onChange={(e) => setHeroTitleEs(e.target.value)}
                placeholder="flexroom."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Título (EN)</label>
              <input
                type="text"
                value={heroTitleEn}
                onChange={(e) => setHeroTitleEn(e.target.value)}
                placeholder="flexroom."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Subtítulo (ES)</label>
              <textarea
                value={heroSubtitleEs}
                onChange={(e) => setHeroSubtitleEs(e.target.value)}
                rows={3}
                placeholder="Texto descriptivo debajo del título..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Subtítulo (EN)</label>
              <textarea
                value={heroSubtitleEn}
                onChange={(e) => setHeroSubtitleEn(e.target.value)}
                rows={3}
                placeholder="Descriptive text below the title..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>

          {/* Hero image */}
          <div>
            <label className="text-xs font-medium text-primary block mb-2">Imagen del hero</label>
            <div className="flex items-start gap-4">
              {heroImageUrl ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border shrink-0">
                  <Image src={heroImageUrl} alt="Hero" fill className="object-cover" />
                  <button
                    onClick={() => setHeroImageUrl('')}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <FontAwesomeIcon icon={faUpload} className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1">
                <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={handleHeroImageUpload} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => heroImgRef.current?.click()}
                  className="rounded-lg"
                >
                  <FontAwesomeIcon icon={faUpload} className="w-3 h-3 mr-2" />
                  {heroImageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  La imagen aparecerá junto al texto del hero. Recomendado: 800×800 px o más.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* About section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            Nosotros
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Título (ES)</label>
              <input
                type="text"
                value={aboutTitleEs}
                onChange={(e) => setAboutTitleEs(e.target.value)}
                placeholder="Nosotros"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Título (EN)</label>
              <input
                type="text"
                value={aboutTitleEn}
                onChange={(e) => setAboutTitleEn(e.target.value)}
                placeholder="About us"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Texto (ES)</label>
              <textarea
                value={aboutTextEs}
                onChange={(e) => setAboutTextEs(e.target.value)}
                rows={5}
                placeholder="Texto de la sección nosotros..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Texto (EN)</label>
              <textarea
                value={aboutTextEn}
                onChange={(e) => setAboutTextEn(e.target.value)}
                rows={5}
                placeholder="About section text..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
            </div>
          </div>

          {/* About image */}
          <div>
            <label className="text-xs font-medium text-primary block mb-2">Imagen de nosotros</label>
            <div className="flex items-start gap-4">
              {aboutImageUrl ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border shrink-0">
                  <Image src={aboutImageUrl} alt="About" fill className="object-cover" />
                  <button
                    onClick={() => setAboutImageUrl('')}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <FontAwesomeIcon icon={faUpload} className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1">
                <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={handleAboutImageUpload} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => aboutImgRef.current?.click()}
                  className="rounded-lg"
                >
                  <FontAwesomeIcon icon={faUpload} className="w-3 h-3 mr-2" />
                  {aboutImageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  La imagen aparecerá junto al texto de la sección. Recomendado: 800×600 px o más.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSaveHomepage}
          disabled={homepageLoading}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {homepageLoading ? 'Guardando...' : 'Guardar página de inicio'}
        </Button>
      </div>

      </>}

      {/* ── FOOTER ────────────────────────────────────────── */}
      {tab === 'footer' && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-primary">Footer</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Información de contacto y texto que aparece en el pie de página del sitio.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Slogan (ES)</label>
              <input
                type="text"
                value={footerTaglineEs}
                onChange={(e) => setFooterTaglineEs(e.target.value)}
                placeholder="Tu segundo hogar"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Slogan (EN)</label>
              <input
                type="text"
                value={footerTaglineEn}
                onChange={(e) => setFooterTaglineEn(e.target.value)}
                placeholder="Your second home"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-primary block mb-1">Dirección</label>
            <input
              type="text"
              value={footerAddress}
              onChange={(e) => setFooterAddress(e.target.value)}
              placeholder="Calle, Colonia, Ciudad, Estado"
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Instagram (URL completa)</label>
              <input
                type="url"
                value={footerInstagram}
                onChange={(e) => setFooterInstagram(e.target.value)}
                placeholder="https://www.instagram.com/flexroomstudio"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Correo electrónico</label>
              <input
                type="email"
                value={footerEmail}
                onChange={(e) => setFooterEmail(e.target.value)}
                placeholder="hola@flexroomstudio.com"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Teléfono (opcional)</label>
              <input
                type="tel"
                value={footerPhone}
                onChange={(e) => setFooterPhone(e.target.value)}
                placeholder="+52 967 000 0000"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveFooter}
            disabled={footerLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {footerLoading ? 'Guardando...' : 'Guardar footer'}
          </Button>
        </div>
      )}

      {/* ── COMING SOON ───────────────────────────────────── */}
      {tab === 'coming_soon' && (
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

      {/* ── CANCELLATION POLICY ───────────────────────────── */}
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
    </div>
  )
}
