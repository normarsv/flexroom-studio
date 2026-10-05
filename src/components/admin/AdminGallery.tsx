'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faTrash } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { GalleryImage } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface Props {
  images: GalleryImage[]
  locale: string
}

export default function AdminGallery({ images: initial, locale }: Props) {
  const [images, setImages] = useState(initial)
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)

    let successCount = 0
    let lastError = ''

    try {
      const supabase = createClient()
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        // Get signed upload URL from server (uses service role, bypasses storage RLS)
        const urlRes = await fetch('/api/admin/gallery/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        })
        if (!urlRes.ok) {
          const { error } = await urlRes.json()
          lastError = error || 'Error al generar URL de subida'
          continue
        }
        const { signedUrl } = await urlRes.json()

        // Upload directly to Supabase Storage via signed URL
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!uploadRes.ok) {
          lastError = `Error al subir ${file.name}`
          continue
        }

        // Get the public URL and save the record
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
        const res = await fetch('/api/admin/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: publicUrl, alt_es: '', alt_en: '', sort_order: images.length + successCount }),
        })
        if (res.ok) {
          const { image } = await res.json()
          setImages((prev) => [...prev, image])
          successCount++
        } else {
          const { error } = await res.json()
          lastError = error || 'Error al guardar imagen'
        }
      }

      if (successCount > 0) toast.success(`${successCount} imagen${successCount > 1 ? 'es' : ''} subida${successCount > 1 ? 's' : ''}`)
      if (lastError) toast.error(lastError)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar imagen?')) return
    const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.id !== id))
      toast.success('Imagen eliminada')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Galería</h1>
        <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
          {uploading ? 'Subiendo...' : 'Subir fotos'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {images.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-border p-16 text-center">
          <p className="text-muted-foreground">No hay imágenes. Sube las primeras fotos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group">
              <Image src={img.url} alt={img.alt_es || 'Galería'} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(img.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
