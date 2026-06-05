'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Package, ClassType } from '@/types'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  packages: Package[]
  locale: string
}

const CLASS_TYPES = Object.keys(CLASS_TYPE_LABELS) as ClassType[]

const emptyForm = {
  name_es: '',
  name_en: '',
  description_es: '',
  description_en: '',
  price_mxn: 0,
  session_count: 1 as number | null,
  validity_days: 14,
  allowed_class_types: [] as ClassType[],
  is_active: true,
  sort_order: 0,
}

export default function AdminPackages({ packages: initial, locale }: Props) {
  const [packages, setPackages] = useState(initial)
  const [editing, setEditing] = useState<Package | null | 'new'>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [unlimited, setUnlimited] = useState(false)

  function openNew() {
    setForm(emptyForm)
    setUnlimited(false)
    setEditing('new')
  }

  function openEdit(pkg: Package) {
    setForm({
      name_es: pkg.name_es,
      name_en: pkg.name_en,
      description_es: pkg.description_es,
      description_en: pkg.description_en,
      price_mxn: pkg.price_mxn,
      session_count: pkg.session_count || 1,
      validity_days: pkg.validity_days,
      allowed_class_types: pkg.allowed_class_types || [],
      is_active: pkg.is_active,
      sort_order: pkg.sort_order,
    })
    setUnlimited(pkg.session_count === null)
    setEditing(pkg)
  }

  async function handleSave() {
    setLoading(true)
    const payload = { ...form, session_count: unlimited ? null : form.session_count }
    try {
      const isNew = editing === 'new'
      const url = isNew ? '/api/admin/packages' : `/api/admin/packages/${(editing as Package).id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(isNew ? 'Membresía creada' : 'Membresía actualizada')
        setEditing(null)
        window.location.reload()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al guardar')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(pkg: Package) {
    if (!confirm('¿Eliminar esta membresía?')) return
    const res = await fetch(`/api/admin/packages/${pkg.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Membresía eliminada')
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id))
    }
  }

  const toggleType = (type: ClassType) => {
    setForm((prev) => ({
      ...prev,
      allowed_class_types: prev.allowed_class_types.includes(type)
        ? prev.allowed_class_types.filter((t) => t !== type)
        : [...prev.allowed_class_types, type],
    }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Membresías</h1>
        <Button size="sm" onClick={openNew} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" />
          Nueva membresía
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-primary">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Precio</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Sesiones</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Vigencia</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Estado</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium text-primary">{pkg.name_es}</td>
                  <td className="px-4 py-3">${pkg.price_mxn.toLocaleString('es-MX')}</td>
                  <td className="px-4 py-3">{pkg.session_count ?? 'Ilimitado'}</td>
                  <td className="px-4 py-3">{pkg.validity_days} días</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-secondary text-muted-foreground'}`}>
                      {pkg.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(pkg)} className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-primary mb-5">
              {editing === 'new' ? 'Nueva membresía' : 'Editar membresía'}
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Nombre (ES)</label>
                  <input value={form.name_es} onChange={(e) => setForm({ ...form, name_es: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Nombre (EN)</label>
                  <input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Descripción (ES)</label>
                <textarea rows={2} value={form.description_es} onChange={(e) => setForm({ ...form, description_es: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Descripción (EN)</label>
                <textarea rows={2} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Precio (MXN)</label>
                  <input type="number" min={0} value={form.price_mxn} onChange={(e) => setForm({ ...form, price_mxn: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Sesiones</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} value={unlimited ? '' : (form.session_count || '')} disabled={unlimited} onChange={(e) => setForm({ ...form, session_count: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50" />
                  </div>
                  <label className="flex items-center gap-1 mt-1 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
                    Ilimitado
                  </label>
                </div>
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Vigencia (días)</label>
                  <input type="number" min={1} value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-2">Tipos de clase permitidos (vacío = todos)</label>
                <div className="flex flex-wrap gap-2">
                  {CLASS_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${form.allowed_class_types.includes(type) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                    >
                      {CLASS_TYPE_LABELS[type].es}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Activa (visible para clientes)
              </label>
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
