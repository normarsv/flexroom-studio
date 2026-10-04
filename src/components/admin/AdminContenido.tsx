'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Discipline, HomepageContent, StudioSettings, GalleryImage } from '@/types'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons'
import AdminGallery from './AdminGallery'

interface Props {
  homepage: HomepageContent | null
  settings: StudioSettings | null
  locale: string
  images: GalleryImage[]
  disciplines: Discipline[]
}

type Tab = 'homepage' | 'footer' | 'galeria'

export default function AdminContenido({ homepage, settings, locale, images, disciplines: initialDisciplines }: Props) {
  const [tab, setTab] = useState<Tab>('homepage')

  // Homepage state
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

  // Disciplines state
  const [disciplines, setDisciplines] = useState<Discipline[]>(initialDisciplines)
  const [discSaving, setDiscSaving] = useState<string | null>(null)
  const [discDeleting, setDiscDeleting] = useState<string | null>(null)
  const [addingDisc, setAddingDisc] = useState(false)
  const discImgRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Footer state
  const [footerTaglineEs, setFooterTaglineEs] = useState(settings?.footer_tagline_es ?? '')
  const [footerTaglineEn, setFooterTaglineEn] = useState(settings?.footer_tagline_en ?? '')
  const [footerAddress, setFooterAddress] = useState(settings?.footer_address ?? '')
  const [footerInstagram, setFooterInstagram] = useState(settings?.footer_instagram ?? '')
  const [footerEmail, setFooterEmail] = useState(settings?.footer_email ?? '')
  const [footerPhone, setFooterPhone] = useState(settings?.footer_phone ?? '')
  const [footerLoading, setFooterLoading] = useState(false)

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

  function updateDisc(id: string, field: keyof Discipline, value: string) {
    setDisciplines((prev) => prev.map((d) => d.id === id ? { ...d, [field]: value } : d))
  }

  async function handleSaveDisc(disc: Discipline) {
    setDiscSaving(disc.id)
    try {
      const res = await fetch(`/api/admin/disciplines/${disc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_es: disc.title_es,
          title_en: disc.title_en,
          desc_es: disc.desc_es,
          desc_en: disc.desc_en,
          image_url: disc.image_url,
        }),
      })
      if (res.ok) toast.success('Disciplina guardada')
      else toast.error('Error al guardar')
    } finally {
      setDiscSaving(null)
    }
  }

  async function handleDeleteDisc(id: string) {
    if (!confirm('¿Eliminar esta disciplina del sitio?')) return
    setDiscDeleting(id)
    try {
      const res = await fetch(`/api/admin/disciplines/${id}`, { method: 'DELETE' })
      if (res.ok) setDisciplines((prev) => prev.filter((d) => d.id !== id))
      else toast.error('Error al eliminar')
    } finally {
      setDiscDeleting(null)
    }
  }

  async function handleAddDisc() {
    setAddingDisc(true)
    try {
      const res = await fetch('/api/admin/disciplines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title_es: 'Nueva disciplina', title_en: 'New discipline', desc_es: '', desc_en: '', image_url: null }),
      })
      const data = await res.json()
      if (res.ok) setDisciplines((prev) => [...prev, data])
      else toast.error('Error al crear')
    } finally {
      setAddingDisc(false)
    }
  }

  async function handleDiscImageUpload(e: React.ChangeEvent<HTMLInputElement>, discId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file, `discipline-${discId}`)
    if (!url) return
    setDisciplines((prev) => prev.map((d) => d.id === discId ? { ...d, image_url: url } : d))
  }

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Contenido</h1>

      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {([
          { key: 'homepage', label: 'Página de inicio' },
          { key: 'footer', label: 'Footer' },
          { key: 'galeria', label: 'Galería' },
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

      {/* ── HOMEPAGE ──────────────────────────────────────── */}
      {tab === 'homepage' && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-primary">Página de inicio</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Edita los textos e imágenes que aparecen en la página principal del sitio.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Hero</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Título (ES)</label>
                <input type="text" value={heroTitleEs} onChange={(e) => setHeroTitleEs(e.target.value)} placeholder="flexroom." className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Título (EN)</label>
                <input type="text" value={heroTitleEn} onChange={(e) => setHeroTitleEn(e.target.value)} placeholder="flexroom." className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Subtítulo (ES)</label>
                <textarea value={heroSubtitleEs} onChange={(e) => setHeroSubtitleEs(e.target.value)} rows={3} placeholder="Texto descriptivo debajo del título..." className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Subtítulo (EN)</label>
                <textarea value={heroSubtitleEn} onChange={(e) => setHeroSubtitleEn(e.target.value)} rows={3} placeholder="Descriptive text below the title..." className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-2">Imagen del hero</label>
              <div className="flex items-start gap-4">
                {heroImageUrl ? (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border shrink-0">
                    <Image src={heroImageUrl} alt="Hero" fill className="object-cover" />
                    <button onClick={() => setHeroImageUrl('')} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80">
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
                  <Button variant="outline" size="sm" onClick={() => heroImgRef.current?.click()} className="rounded-lg">
                    <FontAwesomeIcon icon={faUpload} className="w-3 h-3 mr-2" />
                    {heroImageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Recomendado: 800×800 px o más.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Nosotros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Título (ES)</label>
                <input type="text" value={aboutTitleEs} onChange={(e) => setAboutTitleEs(e.target.value)} placeholder="Nosotros" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Título (EN)</label>
                <input type="text" value={aboutTitleEn} onChange={(e) => setAboutTitleEn(e.target.value)} placeholder="About us" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Texto (ES)</label>
                <textarea value={aboutTextEs} onChange={(e) => setAboutTextEs(e.target.value)} rows={5} placeholder="Texto de la sección nosotros..." className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Texto (EN)</label>
                <textarea value={aboutTextEn} onChange={(e) => setAboutTextEn(e.target.value)} rows={5} placeholder="About section text..." className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-2">Imagen de nosotros</label>
              <div className="flex items-start gap-4">
                {aboutImageUrl ? (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border shrink-0">
                    <Image src={aboutImageUrl} alt="About" fill className="object-cover" />
                    <button onClick={() => setAboutImageUrl('')} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80">
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
                  <Button variant="outline" size="sm" onClick={() => aboutImgRef.current?.click()} className="rounded-lg">
                    <FontAwesomeIcon icon={faUpload} className="w-3 h-3 mr-2" />
                    {aboutImageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Recomendado: 800×600 px o más.</p>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveHomepage} disabled={homepageLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {homepageLoading ? 'Guardando...' : 'Guardar página de inicio'}
          </Button>
        </div>
      )}

      {/* ── DISCIPLINAS ───────────────────────────────────── */}
      {tab === 'homepage' && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">Disciplinas</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Agrega, edita o elimina las disciplinas que aparecen en la página de inicio.</p>
            </div>
            <Button size="sm" onClick={handleAddDisc} disabled={addingDisc} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <FontAwesomeIcon icon={faPlus} className="w-3 h-3 mr-2" />
              {addingDisc ? 'Agregando...' : 'Nueva disciplina'}
            </Button>
          </div>

          <div className="space-y-4">
            {disciplines.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No hay disciplinas. Agrega una.</p>
            )}
            {disciplines.map((d) => (
              <div key={d.id} className="border border-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary">{d.title_es || 'Sin título'}</p>
                  <button
                    onClick={() => handleDeleteDisc(d.id)}
                    disabled={discDeleting === d.id}
                    className="text-xs text-destructive hover:opacity-70 disabled:opacity-40"
                  >
                    {discDeleting === d.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>

                {/* Image */}
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border border-border bg-secondary/50 shrink-0">
                    {d.image_url ? (
                      <>
                        <Image src={d.image_url} alt={d.title_es} fill className="object-cover" />
                        <button
                          onClick={() => updateDisc(d.id, 'image_url', '')}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3 text-white" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faUpload} className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={(el) => { discImgRefs.current[d.id] = el }}
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleDiscImageUpload(e, d.id)}
                    />
                    <Button variant="outline" size="sm" onClick={() => discImgRefs.current[d.id]?.click()} className="rounded-lg text-xs h-7 px-3">
                      {d.image_url ? 'Cambiar imagen' : 'Subir imagen'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Cuadrada, 200×200 px o más</p>
                  </div>
                </div>

                {/* Titles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-primary block mb-1">Título (ES)</label>
                    <input type="text" value={d.title_es} onChange={(e) => updateDisc(d.id, 'title_es', e.target.value)} placeholder="Funcional" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-primary block mb-1">Título (EN)</label>
                    <input type="text" value={d.title_en} onChange={(e) => updateDisc(d.id, 'title_en', e.target.value)} placeholder="Functional" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-primary block mb-1">Descripción (ES)</label>
                    <textarea value={d.desc_es} onChange={(e) => updateDisc(d.id, 'desc_es', e.target.value)} rows={3} placeholder="Descripción de la disciplina..." className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-primary block mb-1">Descripción (EN)</label>
                    <textarea value={d.desc_en} onChange={(e) => updateDisc(d.id, 'desc_en', e.target.value)} rows={3} placeholder="Discipline description..." className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
                  </div>
                </div>

                <Button size="sm" onClick={() => handleSaveDisc(d)} disabled={discSaving === d.id} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {discSaving === d.id ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <input type="text" value={footerTaglineEs} onChange={(e) => setFooterTaglineEs(e.target.value)} placeholder="Tu segundo hogar" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Slogan (EN)</label>
              <input type="text" value={footerTaglineEn} onChange={(e) => setFooterTaglineEn(e.target.value)} placeholder="Your second home" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-primary block mb-1">Dirección</label>
            <input type="text" value={footerAddress} onChange={(e) => setFooterAddress(e.target.value)} placeholder="Calle, Colonia, Ciudad, Estado" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Instagram (URL completa)</label>
              <input type="url" value={footerInstagram} onChange={(e) => setFooterInstagram(e.target.value)} placeholder="https://www.instagram.com/flexroomstudio" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Correo electrónico</label>
              <input type="email" value={footerEmail} onChange={(e) => setFooterEmail(e.target.value)} placeholder="hola@flexroomstudio.com" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Teléfono (opcional)</label>
              <input type="tel" value={footerPhone} onChange={(e) => setFooterPhone(e.target.value)} placeholder="+52 967 000 0000" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <Button onClick={handleSaveFooter} disabled={footerLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {footerLoading ? 'Guardando...' : 'Guardar footer'}
          </Button>
        </div>
      )}

      {/* ── GALERÍA ───────────────────────────────────────── */}
      {tab === 'galeria' && (
        <AdminGallery images={images} locale={locale} />
      )}
    </div>
  )
}
