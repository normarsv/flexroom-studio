'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencil } from '@fortawesome/free-solid-svg-icons'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  is_coach: boolean
}

export default function AdminAdmins() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'coach'>('admin')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserPasswordConfirm, setNewUserPasswordConfirm] = useState('')
  const [addingUser, setAddingUser] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editIsAdmin, setEditIsAdmin] = useState(false)
  const [editIsCoach, setEditIsCoach] = useState(false)
  const [editPassword, setEditPassword] = useState('')
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('')
  const [savingUser, setSavingUser] = useState(false)

  useEffect(() => {
    fetchAdminUsers()
  }, [])

  async function fetchAdminUsers() {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) setAdminUsers(await res.json())
    } finally {
      setUsersLoading(false)
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserEmail) return
    if (newUserPassword && newUserPassword !== newUserPasswordConfirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (newUserPassword && newUserPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setAddingUser(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          full_name: newUserName,
          role: newUserRole,
          password: newUserPassword || undefined,
        }),
      })
      if (res.ok) {
        const user = await res.json()
        setAdminUsers((prev) => {
          const exists = prev.find((u) => u.id === user.id)
          return exists ? prev.map((u) => u.id === user.id ? user : u) : [...prev, user]
        })
        setShowAddUser(false)
        setNewUserEmail('')
        setNewUserName('')
        setNewUserRole('admin')
        setNewUserPassword('')
        setNewUserPasswordConfirm('')
        toast.success('Usuario agregado')
      } else {
        const { error } = await res.json()
        toast.error(error || 'Error al agregar usuario')
      }
    } finally {
      setAddingUser(false)
    }
  }

  function openEditUser(u: AdminUser) {
    setEditingUser(u)
    setEditName(u.full_name || '')
    setEditIsAdmin(u.is_admin)
    setEditIsCoach(u.is_coach)
    setEditPassword('')
    setEditPasswordConfirm('')
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    if (editPassword && editPassword !== editPasswordConfirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (editPassword && editPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setSavingUser(true)
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editName,
          is_admin: editIsAdmin,
          is_coach: editIsCoach,
          password: editPassword || undefined,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        if (!updated.is_admin && !updated.is_coach) {
          setAdminUsers((prev) => prev.filter((u) => u.id !== updated.id))
          toast.success('Usuario movido a cliente')
        } else {
          setAdminUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
          toast.success('Usuario actualizado')
        }
        setEditingUser(null)
      } else {
        const { error } = await res.json()
        toast.error(error || 'Error al actualizar')
      }
    } finally {
      setSavingUser(false)
    }
  }

  async function handleRemoveUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAdminUsers((prev) => prev.filter((u) => u.id !== id))
      toast.success('Rol eliminado')
    } else {
      const { error } = await res.json()
      toast.error(error || 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Admins y Coaches</h1>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Usuarios con acceso especial</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Administradores y coaches con acceso al panel.</p>
          </div>
          <Button onClick={() => setShowAddUser(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            + Agregar usuario
          </Button>
        </div>

        {/* Add user modal */}
        {showAddUser && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <form onSubmit={handleAddUser} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
              <h3 className="font-semibold text-primary">Agregar usuario</h3>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Nombre completo</label>
                <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nombre Apellido" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Correo electrónico *</label>
                <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="correo@ejemplo.com" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Rol</label>
                <div className="flex gap-2">
                  {(['admin', 'coach'] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setNewUserRole(r)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${newUserRole === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-muted-foreground border-border hover:border-primary'}`}>
                      {r === 'admin' ? 'Admin' : 'Coach'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Contraseña</label>
                <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {newUserPassword && (
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Confirmar contraseña</label>
                  <input type="password" value={newUserPasswordConfirm} onChange={(e) => setNewUserPasswordConfirm(e.target.value)} placeholder="Repite la contraseña" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary">Cancelar</button>
                <button type="submit" disabled={addingUser} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
                  {addingUser ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit user modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <form onSubmit={handleSaveUser} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
              <h3 className="font-semibold text-primary">Editar usuario</h3>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Nombre completo</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre Apellido" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Rol</label>
                <select value={editIsAdmin ? 'admin' : editIsCoach ? 'coach' : 'client'} onChange={(e) => { setEditIsAdmin(e.target.value === 'admin'); setEditIsCoach(e.target.value === 'coach') }} className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="admin">Admin</option>
                  <option value="coach">Coach</option>
                  <option value="client">Cliente</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Nueva contraseña <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Dejar vacío para no cambiar" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {editPassword && (
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Confirmar contraseña</label>
                  <input type="password" value={editPasswordConfirm} onChange={(e) => setEditPasswordConfirm(e.target.value)} placeholder="Repite la contraseña" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary">Cancelar</button>
                <button type="submit" disabled={savingUser} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
                  {savingUser ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users list */}
        {usersLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : adminUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay administradores ni coaches registrados.</p>
        ) : (
          <div className="divide-y divide-border">
            {adminUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-primary">{u.full_name || '—'}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {u.is_admin && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Admin</span>
                  )}
                  {u.is_coach && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Coach</span>
                  )}
                  <button onClick={() => openEditUser(u)} className="text-muted-foreground hover:text-primary ml-2">
                    <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleRemoveUser(u.id)} className="text-xs text-red-500 hover:text-red-700">
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
