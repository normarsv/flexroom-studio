'use client'

import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass,
  faPlus,
  faBoxOpen,
  faXmark,
  faDownload,
  faUserPlus,
  faPencil,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
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
  package: { name_es: string } | null
}

interface ClientRow {
  id: string
  full_name: string | null
  email: string
  credit_sessions: number
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

  // Detail modal
  const [detailClient, setDetailClient] = useState<ClientRow | null>(null)
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null)

  // Edit client modal
  const [editClient, setEditClient] = useState<ClientRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Memberships modal
  const [membershipsClient, setMembershipsClient] = useState<ClientRow | null>(null)
  const [editingPackage, setEditingPackage] = useState<UserPackageEntry | null>(null)
  const [editPkgSessions, setEditPkgSessions] = useState('')
  const [editPkgExpiry, setEditPkgExpiry] = useState('')
  const [savingPackage, setSavingPackage] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [showAssignForm, setShowAssignForm] = useState(false)

  // Grant credit
  const [grantingId, setGrantingId] = useState<string | null>(null)

  // Add client modal
  const [addingClient, setAddingClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [clients, search])

  function updateClientInState(updated: Partial<ClientRow> & { id: string }) {
    setClients((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c))
    setDetailClient((prev) => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  async function handleGrantCredit(client: ClientRow) {
    setGrantingId(client.id)
    const res = await fetch(`/api/admin/clients/${client.id}/grant-credit`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      updateClientInState({ id: client.id, credit_sessions: data.credit_sessions })
      toast.success(`Crédito otorgado a ${client.full_name || client.email}`)
    } else {
      toast.error(data.error || 'Error al otorgar crédito')
    }
    setGrantingId(null)
  }

  async function handleSaveEdit() {
    if (!editClient) return
    setSavingEdit(true)
    const res = await fetch(`/api/admin/clients/${editClient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: editName, email: editEmail }),
    })
    const data = await res.json()
    if (res.ok) {
      updateClientInState({ id: editClient.id, full_name: data.full_name, email: data.email })
      toast.success('Cliente actualizado')
      setEditClient(null)
    } else {
      toast.error(data.error || 'Error al actualizar')
    }
    setSavingEdit(false)
  }

  async function handleDeletePackage(client: ClientRow, packageId: string) {
    setDeletingPackageId(packageId)
    const res = await fetch(`/api/admin/clients/${client.id}/packages/${packageId}`, { method: 'DELETE' })
    if (res.ok) {
      const updatedPkgs = client.user_packages.filter((p) => p.id !== packageId)
      updateClientInState({ id: client.id, user_packages: updatedPkgs })
      setMembershipsClient((prev) => prev?.id === client.id ? { ...prev, user_packages: updatedPkgs } : prev)
      setDetailClient((prev) => prev?.id === client.id ? { ...prev, user_packages: updatedPkgs } : prev)
      toast.success('Membresía eliminada')
    } else {
      const data = await res.json()
      toast.error(data.error || 'Error al eliminar membresía')
    }
    setDeletingPackageId(null)
  }

  async function handleEditPackage() {
    if (!membershipsClient || !editingPackage) return
    setSavingPackage(true)
    const res = await fetch(`/api/admin/clients/${membershipsClient.id}/packages/${editingPackage.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessions_remaining: editPkgSessions === '' ? null : Number(editPkgSessions),
        expires_at: new Date(editPkgExpiry).toISOString(),
      }),
    })
    const data = await res.json()
    if (res.ok) {
      const updatedPkgs = membershipsClient.user_packages.map((p) => p.id === editingPackage.id ? data : p)
      updateClientInState({ id: membershipsClient.id, user_packages: updatedPkgs })
      setMembershipsClient((prev) => prev ? { ...prev, user_packages: updatedPkgs } : prev)
      setEditingPackage(null)
      toast.success('Membresía actualizada')
    } else {
      toast.error(data.error || 'Error al actualizar')
    }
    setSavingPackage(false)
  }

  async function handleAssignPackage() {
    if (!membershipsClient || !selectedPackageId) return
    setAssigningId(membershipsClient.id)
    const res = await fetch(`/api/admin/clients/${membershipsClient.id}/assign-package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: selectedPackageId }),
    })
    const data = await res.json()
    if (res.ok) {
      const updatedPkgs = [...membershipsClient.user_packages, data]
      updateClientInState({ id: membershipsClient.id, user_packages: updatedPkgs })
      setMembershipsClient((prev) => prev ? { ...prev, user_packages: updatedPkgs } : prev)
      toast.success('Membresía asignada')
      setSelectedPackageId('')
      setShowAssignForm(false)
    } else {
      toast.error(data.error || 'Error al asignar membresía')
    }
    setAssigningId(null)
  }

  async function handleAddClient() {
    if (!newClientEmail.trim()) return
    setSavingClient(true)
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: newClientName.trim() || null, email: newClientEmail.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setClients((prev) => [data, ...prev])
      toast.success(`Cliente agregado. Se envió un correo de invitación a ${newClientEmail.trim()}.`)
      setAddingClient(false)
      setNewClientName('')
      setNewClientEmail('')
    } else {
      toast.error(data.error || 'Error al agregar cliente')
    }
    setSavingClient(false)
  }

  function exportCSV() {
    const headers = ['Nombre', 'Correo', 'Créditos', 'Total reservas', 'Última clase', 'Estado', 'Registro']
    const rows = clients.map((c) => {
      const lastB = c.bookings.length > 0
        ? c.bookings.reduce((a, b) => a.created_at > b.created_at ? a : b)
        : null
      const isActive = c.bookings.some((b) => new Date(b.created_at) > THIRTY_DAYS_AGO)
      return [
        c.full_name || '',
        c.email,
        c.credit_sessions,
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
                <th className="text-left px-4 py-3 font-medium text-primary">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Membresías activas</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Reservas</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Última clase</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Créditos</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((profile) => {
                const activePkgs = profile.user_packages?.filter(
                  (up) => new Date(up.expires_at) > new Date()
                ) || []
                const totalBookings = profile.bookings?.length ?? 0
                const lastBooking = profile.bookings?.length > 0
                  ? profile.bookings.reduce((a, b) => a.created_at > b.created_at ? a : b)
                  : null
                const isActive = profile.bookings.some(
                  (b) => new Date(b.created_at) > THIRTY_DAYS_AGO
                )

                return (
                  <tr key={profile.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        className="font-medium text-primary hover:underline text-left"
                        onClick={() => setDetailClient(profile)}
                      >
                        {profile.full_name || '—'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{profile.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {activePkgs.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Sin membresías</span>
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
                    <td className="px-4 py-3 text-center">
                      {totalBookings > 0 ? (
                        <button
                          className="font-medium text-primary hover:underline"
                          onClick={() => setDetailClient(profile)}
                        >
                          {totalBookings}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {lastBooking ? new Date(lastBooking.created_at).toLocaleDateString('es-MX') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {profile.credit_sessions > 0 ? (
                        <span className="text-xs font-semibold bg-[#F4EF71]/60 text-primary px-2 py-0.5 rounded-full">
                          {profile.credit_sessions}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGrantCredit(profile)}
                          disabled={grantingId === profile.id}
                          title="Otorgar 1 crédito"
                          className="text-xs h-7 px-2"
                        >
                          <FontAwesomeIcon icon={faPlus} className="w-3 h-3 mr-1" />
                          Crédito
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setMembershipsClient(profile); setShowAssignForm(false); setEditingPackage(null); setSelectedPackageId('') }}
                          title="Gestionar membresías"
                          className="text-xs h-7 px-2"
                        >
                          <FontAwesomeIcon icon={faBoxOpen} className="w-3 h-3 mr-1" />
                          Membresía
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditClient(profile); setEditName(profile.full_name || ''); setEditEmail(profile.email) }}
                          title="Editar cliente"
                          className="h-7 w-7 p-0"
                        >
                          <FontAwesomeIcon icon={faPencil} className="w-3 h-3" />
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

      {/* Client Detail Modal */}
      {detailClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold text-primary text-lg">{detailClient.full_name || 'Sin nombre'}</h2>
                <p className="text-sm text-muted-foreground">{detailClient.email}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{detailClient.bookings.length} reservas en total</span>
                  {detailClient.credit_sessions > 0 && (
                    <span className="bg-[#F4EF71]/60 text-primary px-2 py-0.5 rounded-full font-medium">
                      {detailClient.credit_sessions} crédito{detailClient.credit_sessions !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setDetailClient(null)} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Memberships */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Membresías</h3>
                {detailClient.user_packages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sin membresías</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailClient.user_packages.map((up) => {
                      const isActive = new Date(up.expires_at) > new Date()
                      return (
                        <div key={up.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border text-sm">
                          <div>
                            <span className={`font-medium ${isActive ? 'text-primary' : 'text-muted-foreground line-through'}`}>
                              {up.package?.name_es}
                            </span>
                            {up.sessions_remaining !== null && (
                              <span className="text-xs text-muted-foreground ml-2">{up.sessions_remaining} clases restantes</span>
                            )}
                            <span className="text-xs text-muted-foreground ml-2">
                              · vence {new Date(up.expires_at).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeletePackage(detailClient, up.id)}
                            disabled={deletingPackageId === up.id}
                            className="text-destructive hover:text-destructive/80 p-1 ml-2 shrink-0"
                            title="Eliminar membresía"
                          >
                            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Booking history */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Historial de reservas</h3>
                {detailClient.bookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sin reservas</p>
                ) : (
                  <div className="space-y-1.5">
                    {[...detailClient.bookings]
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
                                    {' · '}
                                    {session.start_time.slice(0, 5)}
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

            <div className="p-4 border-t border-border flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGrantCredit(detailClient)}
                disabled={grantingId === detailClient.id}
              >
                <FontAwesomeIcon icon={faPlus} className="w-3 h-3 mr-1.5" />
                Otorgar crédito
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setMembershipsClient(detailClient); setDetailClient(null); setShowAssignForm(false); setEditingPackage(null); setSelectedPackageId('') }}
              >
                <FontAwesomeIcon icon={faBoxOpen} className="w-3 h-3 mr-1.5" />
                Membresías
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-primary">Editar cliente</h2>
              <button onClick={() => setEditClient(null)} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
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
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEditClient(null)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  disabled={!editEmail.trim() || savingEdit}
                  onClick={handleSaveEdit}
                >
                  {savingEdit ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
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

      {/* Memberships Modal */}
      {membershipsClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold text-primary">Membresías</h2>
                <p className="text-sm text-muted-foreground">{membershipsClient.full_name || membershipsClient.email}</p>
              </div>
              <button onClick={() => { setMembershipsClient(null); setEditingPackage(null) }} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {membershipsClient.user_packages.length === 0 && !showAssignForm && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin membresías asignadas</p>
              )}

              {membershipsClient.user_packages.map((up) => {
                const isActive = new Date(up.expires_at) > new Date()
                const isEditing = editingPackage?.id === up.id

                return (
                  <div key={up.id} className="border border-border rounded-xl overflow-hidden">
                    {/* Row header */}
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
                          title="Editar"
                        >
                          <FontAwesomeIcon icon={isEditing ? faXmark : faPencil} className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePackage(membershipsClient, up.id)}
                          disabled={deletingPackageId === up.id}
                          className="text-destructive hover:text-destructive/80 p-1.5"
                          title="Eliminar"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline edit form */}
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

              {/* Assign new */}
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
                  <p className="text-xs text-muted-foreground">Se activa hoy sin cargo. La vigencia comienza desde este momento.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowAssignForm(false); setSelectedPackageId('') }}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground"
                      disabled={!selectedPackageId || assigningId === membershipsClient.id}
                      onClick={handleAssignPackage}
                    >
                      {assigningId === membershipsClient.id ? 'Asignando...' : 'Asignar'}
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
          </div>
        </div>
      )}
    </div>
  )
}
