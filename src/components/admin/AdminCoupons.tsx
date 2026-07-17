'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTag,
  faPlus,
  faToggleOn,
  faToggleOff,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Coupon } from '@/types'
import { toast } from 'sonner'

interface Props {
  coupons: Coupon[]
}

const CLASS_TYPE_OPTIONS = [
  { value: 'funcional', label: 'Funcional' },
  { value: 'barre', label: 'Barre' },
  { value: 'pilates_reformer', label: 'Pilates Reformer' },
  { value: 'pilates_mat', label: 'Pilates Mat' },
  { value: 'reformer_restaurativo', label: 'Reformer Restaurativo' },
]

const APPLIES_TO_LABELS: Record<string, string> = {
  both: 'Clases y paquetes',
  packages: 'Paquetes',
  classes: 'Clases',
}

interface CouponForm {
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  applies_to: 'packages' | 'classes' | 'both'
  usage_limit: string
  per_user_limit: string
  allowed_class_types: string[]
  first_time_only: boolean
  expires_at: string
  is_active: boolean
}

const defaultForm: CouponForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  applies_to: 'both',
  usage_limit: '',
  per_user_limit: '1',
  allowed_class_types: [],
  first_time_only: false,
  expires_at: '',
  is_active: true,
}

export default function AdminCoupons({ coupons: initialCoupons }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CouponForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function handleFormChange(field: keyof CouponForm, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleClassType(value: string) {
    setForm((prev) => ({
      ...prev,
      allowed_class_types: prev.allowed_class_types.includes(value)
        ? prev.allowed_class_types.filter((t) => t !== value)
        : [...prev.allowed_class_types, value],
    }))
  }

  async function handleCreate() {
    if (!form.code.trim()) {
      toast.error('El código es obligatorio')
      return
    }
    if (!form.discount_value || isNaN(Number(form.discount_value))) {
      toast.error('Ingresa un valor de descuento válido')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          description: form.description || null,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          applies_to: form.applies_to,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          per_user_limit: Number(form.per_user_limit) || 1,
          allowed_class_types: form.allowed_class_types.length > 0 ? form.allowed_class_types : null,
          first_time_only: form.first_time_only,
          expires_at: form.expires_at || null,
          is_active: form.is_active,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Error al crear el cupón')
        return
      }

      const created = await res.json()
      setCoupons((prev) => [created, ...prev])
      setShowModal(false)
      setForm(defaultForm)
      toast.success('Cupón creado correctamente')
    } catch {
      toast.error('Error al crear el cupón')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(coupon: Coupon) {
    setTogglingId(coupon.id)
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })

      if (!res.ok) {
        toast.error('Error al actualizar el cupón')
        return
      }

      const updated = await res.json()
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? updated : c)))
    } catch {
      toast.error('Error al actualizar el cupón')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cupón? Esta acción no se puede deshacer.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        toast.error('Error al eliminar el cupón')
        return
      }

      setCoupons((prev) => prev.filter((c) => c.id !== id))
      toast.success('Cupón eliminado')
    } catch {
      toast.error('Error al eliminar el cupón')
    } finally {
      setDeletingId(null)
    }
  }

  function formatDiscount(coupon: Coupon) {
    if (coupon.discount_type === 'percentage') return `${coupon.discount_value}%`
    return `$${coupon.discount_value} MXN`
  }

  function formatUsage(coupon: Coupon) {
    if (coupon.usage_limit === null) return `${coupon.usage_count} usos`
    return `${coupon.usage_count}/${coupon.usage_limit} usos`
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faTag} className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-primary">Cupones</h1>
        </div>
        <Button
          onClick={() => { setForm(defaultForm); setShowModal(true) }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Nuevo cupón
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {coupons.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No hay cupones todavía. Crea el primero.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Descuento</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Aplica a</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Usos</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Vence</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground">Solo nuevos</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground">Activo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono font-bold text-foreground">{coupon.code}</p>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{coupon.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {formatDiscount(coupon)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {APPLIES_TO_LABELS[coupon.applies_to]}
                      {coupon.allowed_class_types && coupon.allowed_class_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {coupon.allowed_class_types.map((t) => (
                            <span key={t} className="text-xs bg-secondary px-1.5 py-0.5 rounded-full">
                              {CLASS_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatUsage(coupon)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {coupon.expires_at
                        ? new Date(coupon.expires_at).toLocaleDateString('es-MX')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {coupon.first_time_only ? (
                        <span className="inline-block text-xs bg-[#F4EF71] text-[#1E1E1E] font-semibold px-2 py-0.5 rounded-full">
                          Sí
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        disabled={togglingId === coupon.id}
                        className="text-2xl disabled:opacity-50 transition-colors"
                        title={coupon.is_active ? 'Desactivar' : 'Activar'}
                      >
                        <FontAwesomeIcon
                          icon={coupon.is_active ? faToggleOn : faToggleOff}
                          className={coupon.is_active ? 'text-green-500' : 'text-muted-foreground'}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        disabled={deletingId === coupon.id}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors"
                        title="Eliminar"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-primary"
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-primary mb-5">Nuevo cupón</h2>

            <div className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Código <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                  placeholder="VERANO20"
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Descuento de verano"
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Discount type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tipo de descuento
                </label>
                <div className="flex gap-4">
                  {(['percentage', 'fixed'] as const).map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="discount_type"
                        value={t}
                        checked={form.discount_type === t}
                        onChange={() => handleFormChange('discount_type', t)}
                        className="accent-primary"
                      />
                      {t === 'percentage' ? 'Porcentaje (%)' : 'Monto fijo (MXN)'}
                    </label>
                  ))}
                </div>
              </div>

              {/* Discount value */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Valor del descuento <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {form.discount_type === 'percentage' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.discount_value}
                    onChange={(e) => handleFormChange('discount_value', e.target.value)}
                    placeholder={form.discount_type === 'percentage' ? '20' : '100'}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Applies to */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Aplica a
                </label>
                <select
                  value={form.applies_to}
                  onChange={(e) => handleFormChange('applies_to', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option value="both">Clases y paquetes</option>
                  <option value="packages">Solo paquetes</option>
                  <option value="classes">Solo clases</option>
                </select>
              </div>

              {/* Allowed class types (only when applies_to is 'classes' or 'both') */}
              {(form.applies_to === 'classes' || form.applies_to === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Tipos de clase permitidos
                    <span className="text-muted-foreground font-normal ml-1">(vacío = todos)</span>
                  </label>
                  <div className="space-y-1.5">
                    {CLASS_TYPE_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={form.allowed_class_types.includes(opt.value)}
                          onChange={() => toggleClassType(opt.value)}
                          className="accent-primary"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage limit */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Límite de usos totales
                  <span className="text-muted-foreground font-normal ml-1">(vacío = ilimitado)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.usage_limit}
                  onChange={(e) => handleFormChange('usage_limit', e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Per user limit */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Usos por usuario
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.per_user_limit}
                  onChange={(e) => handleFormChange('per_user_limit', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* First time only */}
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.first_time_only}
                  onChange={(e) => handleFormChange('first_time_only', e.target.checked)}
                  className="accent-primary"
                />
                <span className="font-medium text-foreground">Solo para nuevos clientes</span>
              </label>

              {/* Expiry date */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Fecha de vencimiento
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => handleFormChange('expires_at', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Active */}
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => handleFormChange('is_active', e.target.checked)}
                  className="accent-primary"
                />
                <span className="font-medium text-foreground">Activo desde el inicio</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? 'Guardando...' : 'Crear cupón'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
