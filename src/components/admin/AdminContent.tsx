'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CancellationPolicy, HomepageContent } from '@/types'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faTrash } from '@fortawesome/free-solid-svg-icons'

interface Props {
  policy: CancellationPolicy | null
  homepage: HomepageContent | null
  locale: string
}

export default function AdminContent({ policy, homepage, locale }: Props) {
  // Cancellation policy
  const [contentEs, setContentEs] = useState(policy?.content_es || '')
  const [contentEn, setContentEn] = useState(policy?.content_en || '')
  const [policyLoading, setPolicyLoading] = useState(false)

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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-primary">Contenido del sitio</h1>

      {/* ── HOMEPAGE CONTENT ──────────────────────────────── */}
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

      {/* ── CANCELLATION POLICY ───────────────────────────── */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
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
      </div>
    </div>
  )
}
