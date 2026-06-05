'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { GalleryImage } from '@/types'

interface Props {
  images: GalleryImage[]
  locale: string
}

export default function GalleryGrid({ images, locale }: Props) {
  const t = useTranslations('gallery')
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {images.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No hay imágenes todavía</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setLightbox(img)}
              className="relative aspect-square rounded-xl overflow-hidden group"
            >
              <Image
                src={img.url}
                alt={locale === 'es' ? img.alt_es : img.alt_en}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/70"
            onClick={() => setLightbox(null)}
          >
            <FontAwesomeIcon icon={faXmark} className="w-8 h-8" />
          </button>
          <div className="relative max-w-3xl max-h-[80vh] w-full h-full">
            <Image
              src={lightbox.url}
              alt={locale === 'es' ? lightbox.alt_es : lightbox.alt_en}
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
