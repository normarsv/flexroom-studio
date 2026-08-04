'use client'

import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass,
  faPlus,
  faXmark,
  faDownload,
  faUserPlus,
  faPencil,
  faTrash,
  faSliders,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { ClassType } from '@/types'

interface BookingEntry {
  created_at: string
  status: string
  session: { date: string; class_type: string; start_time: string } | null
}

interface UserPackageEntry {
  id: string
  expires_at: string
  sessions_remaining: number | null
  purchased_at: string
  package: { name_es: string; price_mxn: number } | null
}

interface CreditEntry {
  id: string
  class_type: string
}

interface ClientRow {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  credits: CreditEntry[]
  created_at: string
  user_packages: UserPackageEntry[]
  bookings: BookingEntry[]
}

interface PackageOption {
  id: string
  name_es: string
  session_count: number | null
  validity_days: number
}

type ManageTab = 'datos' | 'membresias' | 'creditos' | 'historial'

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

export default function AdminClientsTable({
  clients: initialClients,
  packages,
}: {
  clients: ClientRow[]
  packages: PackageOption[]
}) {
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')

  // Unified manage modal
  const [managingClient, setManagingClient] = useState<ClientRow | null>(null)
  const [manageTab, setManageTab] = useState<ManageTab>('datos')

  // Datos tab
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Membresías tab
  const [editingPackage, setEditingPackage] = useState<UserPackageEntry | null>(null)
  const [editPkgSessions, setEditPkgSessions] = useState('')
  const [editPkgExpiry, setEditPkgExpiry] = useState('')
  const [savingPackage, setSavingPackage] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [assigningPackage, setAssigningPackage] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null)

  // Créditos tab
  const [grantCreditType, setGrantCreditType] = useState('')
  const [grantCreditQty, setGrantCreditQty] = useState('1')
  const [savingCredit, setSavingCredit] = useState(false)
  const [removeCreditType, setRemoveCreditType] = useState('')
  const [removeCreditQty, setRemoveCreditQty] = useState('1')
  const [removingCredit, setRemovingCredit] = useState(false)
  const [editingCreditType, setEditingCreditType] = useState<string | null>(null)
  const [editingCreditCount, setEditingCreditCount] = useState('')
  const [savingCreditEdit, setSavingCreditEdit] = useState(false)

  // Add client modal
  const [addingClient, setAddingClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  // WhatsApp compose
  const [whatsappClient, setWhatsappClient] = useState<ClientRow | null>(null)
  const [whatsappMessage, setWhatsappMessage] = useState('')

  const WA_TEMPLATES = [
    'Hola, te informamos que tu clase ha sido cancelada. Disculpa los inconvenientes.',
    'Hola, hubo un cambio de horario en tu clase. Por favor contáctanos para más detalles.',
    'Hola, te recordamos que tienes una clase próximamente. ¡Te esperamos!',
  ]

  function openWhatsapp(client: ClientRow) {
    setWhatsappClient(client)
    setWhatsappMessage('')
  }

  function sendWhatsapp() {
    if (!whatsappClient?.phone || !whatsappMessage.trim()) return
    const digits = whatsappClient.phone.replace(/\D/g, '')
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage.trim())}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [clients, search])

  function openManage(client: ClientRow, tab: ManageTab = 'datos') {
    setManagingClient(client)
    setManageTab(tab)
    setEditName(client.full_name || '')
    setEditEmail(client.email)
    setEditPhone(client.phone || '')
    setEditingPackage(null)
    setShowAssignForm(false)
    setSelectedPackageId('')
    setGrantCreditType('')
    setGrantCreditQty('1')
    setRemoveCreditType('')
    setRemoveCreditQty('1')
    setEditingCreditType(null)
    setEditingCreditCount('')
  }

  function closeManage() {
    setManagingClient(null)
    setEditingPackage(null)
  }

  function updateClientInState(updated: Partial<ClientRow> & { id: string }) {
    setClients((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c))
    setManagingClient((prev) => prev?.id === updated.id ? { ...prev, ...updated } as ClientRow : prev)
  }

  async function handleSaveEdit() {
    if (!managingClient) return
    setSavingEdit(true)
    const res = await fetch(`/api/admin/clients/${managingClient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: editName, email: editEmail, phone: editPhone }),
    })
    const data = await res.json()
    if (res.ok) {
      updateClientInState({ id: managingClient.id, full_name: data.full_name, email: data.email, phone: data.phone })
      toast.success('Cliente actualizado')
    } else {
      toast.error(data.error || 'Error al actualizar')
    }
    setSavingEdit(false)
  }

  async function handleDeletePackage(packageId: string) {
    if (!managingClient) return
    setDeletingPackageId(packageId)
    const res = await fetch(`/api/admin/clients/${managingClient.id}/packages/${packageId}`, { method: 'DELETE' })
    if (res.ok) {
      const updatedPkgs = managingClient.user_packages.filter((p) => p.id !== packageId)
      updateClientInState({ id: managingClient.id, user_packages: updatedPkgs })
      toast.success('Membresía eliminada')
    } else {
      const data = await res.json()
      toast.error(data.error || 'Error al eliminar membresía')
    }
    setDeletingPackageId(null)
  }

  async function handleEditPackage() {
    if (!managingClient || !editingPackage) return
    setSavingPackage(true)
    const res = await fetch(`/api/admin/clients/${managingClient.id}/packages/${editingPackage.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessions_remaining: editPkgSessions === '' ? null : Number(editPkgSessions),
        expires_at: new Date(editPkgExpiry).toISOString(),
      }),
    })
    const data = await res.json()
    if (res.ok) {
      const updatedPkgs = managingClient.user_packages.map((p) => p.id === editingPackage.id ? data : p)
      updateClientInState({ id: managingClient.id, user_packages: updatedPkgs })
      setEditingPackage(null)
      toast.success('Membresía actualizada')
    } else {
      toast.error(data.error || 'Error al actualizar')
    }
    setSavingPackage(false)
  }

  async function handleAssignPackage() {
    if (!managingClient || !selectedPackageId) return
    setAssigningPackage(true)
    const res = await fetch(`/api/admin/clients/${managingClient.id}/assign-package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: selectedPackageId }),
    })
    const data = await res.json()
    if (res.ok) {
      updateClientInState({ id: managingClient.id, user_packages: [...managingClient.user_packages, data] })
      toast.success('Membresía asignada')
      setSelectedPackageId('')
      setShowAssignForm(false)
    } else {
      toast.error(data.error || 'Error al asignar membresía')
    }
    setAssigningPackage(false)
  }

  async function handleGrantCredit() {
    if (!managingClient || !grantCreditType) return
    setSavingCredit(true)
    const res = await fetch(`/api/admin/clients/${managingClient.id}/grant-credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classType: grantCreditType, quantity: Math.max(1, parseInt(grantCreditQty) || 1) }),
    })
    const data = await res.json()
    if (res.ok) {
      const qty = Math.max(1, parseInt(grantCreditQty) || 1)
      const newCredits: CreditEntry[] = Array.from({ length: qty }, () => ({
        id: crypto.randomUUID(),
        class_type: grantCreditType,
      }))
      updateClientInState({ id: managingClient.id, credits: [...(managingClient.credits ?? []), ...newCredits] })
      toast.success(`${qty} crédito${qty !== 1 ? 's' : ''} otorgado${qty !== 1 ? 's' : ''}`)
      setGrantCreditType('')
      setGrantCreditQty('1')
    } else {
      toast.error(data.error || 'Error al otorgar crédito')
    }
    setSavingCredit(false)
  }

  async function handleRemoveCredit() {
    if (!managingClient || !removeCreditType) return
    setRemovingCredit(true)
    const qty = Math.max(1, parseInt(removeCreditQty) || 1)
    const res = await fetch(`/api/admin/clients/${managingClient.id}/remove-credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classType: removeCreditType, quantity: qty }),
    })
    const data = await res.json()
    if (res.ok) {
      let removed = 0
      const updatedCredits = (managingClient.credits ?? []).filter((c) => {
        if (c.class_type === removeCreditType && removed < qty) { removed++; return false }
        return true
      })
      updateClientInState({ id: managingClient.id, credits: updatedCredits })
      toast.success(`${data.removed} crédito${data.removed !== 1 ? 's' : ''} eliminado${data.removed !== 1 ? 's' : ''}`)
      setRemoveCreditType('')
      setRemoveCreditQty('1')
    } else {
      toast.error(data.error || 'Error al quitar crédito')
    }
    setRemovingCredit(false)
  }

  async function handleUpdateCreditCount(classType: string, currentCount: number) {
    if (!managingClient) return
    const newCount = Math.max(0, parseInt(editingCreditCount) || 0)
    if (newCount === currentCount) { setEditingCreditType(null); return }
    setSavingCreditEdit(true)
    const diff = newCount - currentCount
    const url = `/api/admin/clients/${managingClient.id}/${diff > 0 ? 'grant' : 'remove'}-credit`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classType, quantity: Math.abs(diff) }),
    })
    const data = await res.json()
    if (res.ok) {
      let updated = managingClient.credits ?? []
      if (diff > 0) {
        const added: CreditEntry[] = Array.from({ length: diff }, () => ({ id: crypto.randomUUID(), class_type: classType }))
        updated = [...updated, ...added]
      } else {
        let removed = 0
        updated = updated.filter((c) => {
          if (c.class_type === classType && removed < Math.abs(diff)) { removed++; return false }
          return true
        })
      }
      updateClientInState({ id: managingClient.id, credits: updated })
      setEditingCreditType(null)
      toast.success('Créditos actualizados')
    } else {
      toast.error(data.error || 'Error al actualizar créditos')
    }
    setSavingCreditEdit(false)
  }

  async function handleDeleteAllCreditsOfType(classType: string, count: number) {
    if (!managingClient) return
    setRemovingCredit(true)
    const res = await fetch(`/api/admin/clients/${managingClient.id}/remove-credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classType, quantity: count }),
    })
    const data = await res.json()
    if (res.ok) {
      const updated = (managingClient.credits ?? []).filter((c) => c.class_type !== classType)
      updateClientInState({ id: managingClient.id, credits: updated })
      toast.success('Créditos eliminados')
    } else {
      toast.error(data.error || 'Error al eliminar créditos')
    }
    setRemovingCredit(false)
  }

  async function handleAddClient() {
    if (!newClientEmail.trim()) return
    setSavingClient(true)
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: newClientName.trim() || null, email: newClientEmail.trim(), phone: newClientPhone.trim() || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setClients((prev) => [data, ...prev])
      toast.success(`Invitación enviada a ${newClientEmail.trim()}.`)
      setAddingClient(false)
      setNewClientName('')
      setNewClientEmail('')
      setNewClientPhone('')
    } else {
      toast.error(data.error || 'Error al agregar cliente')
    }
    setSavingClient(false)
  }

  function exportCSV() {
    const headers = ['Nombre', 'Correo', 'Teléfono', 'Créditos', 'Total reservas', 'Última clase', 'Estado', 'Registro']
    const rows = clients.map((c) => {
      const lastB = c.bookings.length > 0
        ? c.bookings.reduce((a, b) => a.created_at > b.created_at ? a : b)
        : null
      const isActive = c.bookings.some((b) => new Date(b.created_at) > THIRTY_DAYS_AGO)
      return [
        c.full_name || '',
        c.email,
        c.phone || '',
        c.credits?.length ?? 0,
        c.bookings.length,
        lastB ? new Date(lastB.created_at).toLocaleDateString('es-MX') : '',
        isActive ? 'Activo' : 'Inactivo',
        new Date(c.created_at).toLocaleDateString('es-MX'),
      ]
    })
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Search + actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5 mr-1.5" />
          Exportar CSV
        </Button>
        <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => setAddingClient(true)}>
          <FontAwesomeIcon icon={faUserPlus} className="w-3.5 h-3.5 mr-1.5" />
          Agregar cliente
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-primary">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Correo</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Membresías activas</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Reservas</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Créditos</th>
                <th className="text-left px-4 py-3 font-medium text-primary"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((client) => {
                const activePkgs = client.user_packages?.filter(
                  (up) => new Date(up.expires_at) > new Date()
                ) || []
                const totalBookings = client.bookings?.length ?? 0
                const isActive = client.bookings.some((b) => new Date(b.created_at) > THIRTY_DAYS_AGO)
                const creditCount = client.credits?.length ?? 0

                return (
                  <tr key={client.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">{client.full_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client.phone || <span className="text-xs italic">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {activePkgs.length === 0 ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {activePkgs.map((up) => (
                            <span key={up.id} className="text-xs bg-secondary text-primary px-2 py-0.5 rounded-full">
                              {up.package?.name_es}
                              {up.sessions_remaining !== null && ` (${up.sessions_remaining})`}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{totalBookings || '—'}</td>
                    <td className="px-4 py-3">
                      {creditCount > 0 ? (
                        <span className="text-xs font-semibold bg-[#F4EF71]/60 text-primary px-2 py-0.5 rounded-full">
                          {creditCount}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {client.phone && (
                          <button
                            onClick={() => openWhatsapp(client)}
                            title="Enviar WhatsApp"
                            className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                          >
                            <FontAwesomeIcon icon={faWhatsapp} className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openManage(client)}
                        >
                          <FontAwesomeIcon icon={faSliders} className="w-3 h-3 mr-1.5" />
                          Gestionar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {search ? 'Sin resultados' : 'No hay clientes registrados'}
            </p>
          )}
        </div>
      </div>

      {/* ── MANAGE CLIENT MODAL ───────────────────────────── */}
      {managingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold text-primary text-lg">{managingClient.full_name || 'Sin nombre'}</h2>
                <p className="text-sm text-muted-foreground">{managingClient.email}</p>
                {managingClient.phone && <p className="text-sm text-muted-foreground">{managingClient.phone}</p>}
              </div>
              <button onClick={closeManage} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-5">
              {([
                { key: 'datos', label: 'Datos' },
                { key: 'membresias', label: 'Membresías' },
                { key: 'creditos', label: 'Créditos' },
                { key: 'historial', label: 'Historial' },
              ] as { key: ManageTab; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setManageTab(key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    manageTab === key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="overflow-y-auto flex-1 p-5">

              {/* ── DATOS ── */}
              {manageTab === 'datos' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-primary block mb-1.5">Nombre</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-primary block mb-1.5">Correo electrónico</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-primary block mb-1.5">Teléfono</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+52 967 123 4567"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground"
                    disabled={!editEmail.trim() || savingEdit}
                    onClick={handleSaveEdit}
                  >
                    {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              )}

              {/* ── MEMBRESÍAS ── */}
              {manageTab === 'membresias' && (
                <div className="space-y-3">
                  {managingClient.user_packages.length === 0 && !showAssignForm && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin membresías asignadas</p>
                  )}

                  {managingClient.user_packages.map((up) => {
                    const isActive = new Date(up.expires_at) > new Date()
                    const isEditing = editingPackage?.id === up.id

                    return (
                      <div key={up.id} className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <span className={`font-medium text-sm ${isActive ? 'text-primary' : 'text-muted-foreground line-through'}`}>
                              {up.package?.name_es}
                            </span>
                            {!isEditing && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {up.sessions_remaining !== null ? `${up.sessions_remaining} clases · ` : ''}
                                Vence {new Date(up.expires_at).toLocaleDateString('es-MX')}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                if (isEditing) { setEditingPackage(null) }
                                else {
                                  setEditingPackage(up)
                                  setEditPkgSessions(up.sessions_remaining !== null ? String(up.sessions_remaining) : '')
                                  setEditPkgExpiry(up.expires_at.slice(0, 10))
                                }
                              }}
                              className="text-muted-foreground hover:text-primary p-1.5"
                            >
                              <FontAwesomeIcon icon={isEditing ? faXmark : faPencil} className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePackage(up.id)}
                              disabled={deletingPackageId === up.id}
                              className="text-destructive hover:text-destructive/80 p-1.5"
                            >
                              <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="border-t border-border bg-secondary/30 px-4 py-3 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-primary block mb-1">Clases restantes</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editPkgSessions}
                                  onChange={(e) => setEditPkgSessions(e.target.value)}
                                  placeholder="Ilimitado"
                                  className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-primary block mb-1">Fecha de vencimiento</label>
                                <input
                                  type="date"
                                  value={editPkgExpiry}
                                  onChange={(e) => setEditPkgExpiry(e.target.value)}
                                  className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="w-full bg-primary text-primary-foreground"
                              disabled={savingPackage}
                              onClick={handleEditPackage}
                            >
                              {savingPackage ? 'Guardando...' : 'Guardar cambios'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {showAssignForm ? (
                    <div className="border border-border rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-primary">Agregar membresía</p>
                      <select
                        value={selectedPackageId}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Seleccionar membresía...</option>
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name_es}
                            {pkg.session_count !== null ? ` — ${pkg.session_count} clases` : ' — Ilimitado'}
                            {` (${pkg.validity_days} días)`}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">Se activa hoy sin cargo.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowAssignForm(false); setSelectedPackageId('') }}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-primary text-primary-foreground"
                          disabled={!selectedPackageId || assigningPackage}
                          onClick={handleAssignPackage}
                        >
                          {assigningPackage ? 'Asignando...' : 'Asignar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAssignForm(true)}
                      className="w-full border border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 mr-1.5" />
                      Agregar membresía
                    </button>
                  )}
                </div>
              )}

              {/* ── CRÉDITOS ── */}
              {manageTab === 'creditos' && (
                <div className="space-y-5">
                  {/* Current credits — editable list */}
                  <div>
                    <p className="text-sm font-medium text-primary mb-3">Créditos actuales</p>
                    {(managingClient.credits?.length ?? 0) === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin créditos disponibles.</p>
                    ) : (
                      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                        {(() => {
                          const byType: Record<string, number> = {}
                          for (const c of managingClient.credits ?? []) {
                            byType[c.class_type] = (byType[c.class_type] ?? 0) + 1
                          }
                          return Object.entries(byType).map(([type, count]) => {
                            const label = CLASS_TYPE_LABELS[type as ClassType]
                            const isEditing = editingCreditType === type
                            return (
                              <div key={type} className="flex items-center justify-between px-4 py-3">
                                <span className="text-sm text-primary">{label?.es || type}</span>
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={editingCreditCount}
                                        onChange={(e) => setEditingCreditCount(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-16 border border-border rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleUpdateCreditCount(type, count)}
                                        disabled={savingCreditEdit}
                                        className="text-green-600 hover:text-green-700 p-1"
                                      >
                                        <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingCreditType(null)}
                                        className="text-muted-foreground hover:text-primary p-1"
                                      >
                                        <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-sm font-bold text-primary w-6 text-center">{count}</span>
                                      <button
                                        onClick={() => { setEditingCreditType(type); setEditingCreditCount(String(count)) }}
                                        className="text-muted-foreground hover:text-primary p-1"
                                      >
                                        <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAllCreditsOfType(type, count)}
                                        disabled={removingCredit}
                                        className="text-destructive hover:text-destructive/70 p-1"
                                      >
                                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Grant credits */}
                  <div className="border-t border-border pt-5">
                    <p className="text-sm font-medium text-primary mb-3">Otorgar créditos</p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={grantCreditQty}
                          onChange={(e) => setGrantCreditQty(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-20 border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                        />
                        <select
                          value={grantCreditType}
                          onChange={(e) => setGrantCreditType(e.target.value)}
                          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">Tipo de clase...</option>
                          {Object.entries(CLASS_TYPE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label.es}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        className="w-full bg-primary text-primary-foreground"
                        disabled={!grantCreditType || savingCredit}
                        onClick={handleGrantCredit}
                      >
                        {savingCredit ? 'Otorgando...' : 'Otorgar créditos'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── HISTORIAL ── */}
              {manageTab === 'historial' && (() => {
                const totalSpent = managingClient.user_packages.reduce(
                  (sum, up) => sum + (up.package?.price_mxn ?? 0), 0
                )
                return (
                  <div className="space-y-5">
                    {/* Total spent */}
                    <div className="bg-[#F4EF71]/30 border border-[#F4EF71] rounded-xl p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">Total gastado</span>
                      <span className="text-lg font-bold text-primary">
                        ${totalSpent.toLocaleString('es-MX')} MXN
                      </span>
                    </div>

                    {/* Purchase history */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Membresías compradas</p>
                      {managingClient.user_packages.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Sin compras</p>
                      ) : (
                        <div className="space-y-1.5">
                          {[...managingClient.user_packages]
                            .sort((a, b) => b.purchased_at.localeCompare(a.purchased_at))
                            .map((up) => (
                              <div key={up.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border text-sm">
                                <div>
                                  <span className="font-medium text-primary">{up.package?.name_es ?? '—'}</span>
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    {new Date(up.purchased_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold text-primary">
                                  ${(up.package?.price_mxn ?? 0).toLocaleString('es-MX')}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Booking history */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reservas</p>
                      {managingClient.bookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Sin reservas</p>
                      ) : (
                        <div className="space-y-1.5">
                          {[...managingClient.bookings]
                            .sort((a, b) => b.created_at.localeCompare(a.created_at))
                            .map((booking, idx) => {
                              const session = booking.session
                              const label = session ? CLASS_TYPE_LABELS[session.class_type as ClassType]?.es : null
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm border ${
                                    booking.status === 'cancelled'
                                      ? 'border-border bg-secondary/30 opacity-60'
                                      : 'border-border bg-white'
                                  }`}
                                >
                                  <div>
                                    {session ? (
                                      <>
                                        <span className="font-medium text-primary">{label || session.class_type}</span>
                                        <span className="text-muted-foreground ml-2 text-xs">
                                          {new Date(session.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                          {' · '}{session.start_time.slice(0, 5)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">Clase eliminada</span>
                                    )}
                                  </div>
                                  {booking.status === 'cancelled' && (
                                    <Badge variant="destructive" className="text-xs">Cancelada</Badge>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── WHATSAPP COMPOSE MODAL ───────────────────────── */}
      {whatsappClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faWhatsapp} className="w-5 h-5 text-[#25D366]" />
                <h2 className="font-semibold text-primary">Enviar WhatsApp</h2>
              </div>
              <button onClick={() => setWhatsappClient(null)} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-primary">{whatsappClient.full_name || whatsappClient.email}</p>
                <p className="text-sm text-muted-foreground">{whatsappClient.phone}</p>
              </div>

              {/* Quick templates */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensajes rápidos</p>
                {WA_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setWhatsappMessage(tpl)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/50 transition-colors text-muted-foreground"
                  >
                    {tpl}
                  </button>
                ))}
              </div>

              {/* Message textarea */}
              <div>
                <label className="text-sm font-medium text-primary block mb-1.5">Mensaje</label>
                <textarea
                  rows={4}
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setWhatsappClient(null)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                  disabled={!whatsappMessage.trim()}
                  onClick={sendWhatsapp}
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="w-3.5 h-3.5 mr-1.5" />
                  Abrir en WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CLIENT MODAL ──────────────────────────────── */}
      {addingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-primary">Agregar cliente</h2>
              <button onClick={() => setAddingClient(false)} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-primary block mb-1.5">Nombre</label>
                <input
                  type="text"
                  placeholder="Nombre completo (opcional)"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-primary block mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddClient()}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-primary block mb-1.5">Teléfono (opcional)</label>
                <input
                  type="tel"
                  placeholder="+52 967 123 4567"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se enviará un correo de invitación para que el cliente establezca su contraseña.
              </p>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setAddingClient(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  disabled={!newClientEmail.trim() || savingClient}
                  onClick={handleAddClient}
                >
                  {savingClient ? 'Enviando...' : 'Agregar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
