'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPencil, faTrash, faUpload } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Instructor, ClassType } from '@/types'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  instructors: Instructor[]
  locale: string
}

const CLASS_TYPES = Object.keys(CLASS_TYPE_LABELS) as ClassType[]

const empty = {
  name: '',
  bio: '',
  photo_url: '',
  specialties: [] as ClassType[],
}

export default function AdminInstructors({ instructors: initial, locale }: Props) {
  const [instructors, setInstructors] = useState(initial)
  const [editing, setEditing] = useState<Instructor | null | 'new'>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  function openNew() { setForm(empty); setEditing('new') }
  function openEdit(i: Instructor) {
    setForm({ name: i.name, bio: i.bio || '', photo_url: i.photo_url || '', specialties: i.specialties || [] })
    setEditing(i)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `instructors/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('media').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      setForm((prev) => ({ ...prev, photo_url: data.publicUrl }))
    } catch {
      toast.error('Error al subir foto')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const isNew = editing === 'new'
      const url = isNew ? '/api/admin/instructors' : `/api/admin/instructors/${(editing as Instructor).id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(isNew ? 'Instructor creado' : 'Instructor actualizado')
        setEditing(null)
        window.location.reload()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar instructor?')) return
    const res = await fetch(`/api/admin/instructors/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setInstructors((prev) => prev.filter((i) => i.id !== id))
      toast.success('Instructor eliminado')
    }
  }

  const toggleSpec = (type: ClassType) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(type)
        ? prev.specialties.filter((t) => t !== type)
        : [...prev.specialties, type],
    }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Instructores</h1>
        <Button size="sm" onClick={openNew} className="bg-primary text-primary-foreground">
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-1" />
          Nuevo instructor
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {instructors.map((instructor) => (
          <div key={instructor.id} className="bg-white rounded-xl border border-border shadow-sm p-4 flex items-start gap-3">
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-secondary shrink-0">
              {instructor.photo_url ? (
                <Image src={instructor.photo_url} alt={instructor.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                  {instructor.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary">{instructor.name}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(instructor.specialties || []).map((t) => (
                  <span key={t} className="text-xs bg-secondary text-primary px-1.5 py-0.5 rounded-full">
                    {CLASS_TYPE_LABELS[t]?.es}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => openEdit(instructor)}><FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(instructor.id)} className="text-destructive hover:text-destructive"><FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-primary mb-5">
              {editing === 'new' ? 'Nuevo instructor' : 'Editar instructor'}
            </h2>
            <div className="space-y-3">
              {/* Photo */}
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-secondary">
                  {form.photo_url ? (
                    <Image src={form.photo_url} alt="foto" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/40">
                      <FontAwesomeIcon icon={faUpload} className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="text-sm text-primary font-medium hover:underline">
                    {uploading ? 'Subiendo...' : 'Subir foto'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
                </label>
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Bio</label>
                <textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-2">Especialidades</label>
                <div className="flex flex-wrap gap-2">
                  {CLASS_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleSpec(type)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${form.specialties.includes(type) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                    >
                      {CLASS_TYPE_LABELS[type].es}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} disabled={loading} className="flex-1 bg-primary text-primary-foreground">
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
