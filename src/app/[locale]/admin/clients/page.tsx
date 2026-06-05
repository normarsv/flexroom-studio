import { createClient } from '@/lib/supabase/server'

export default async function AdminClientsPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, user_packages(id, expires_at, sessions_remaining, package:packages(name_es))')
    .eq('is_admin', false)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Clientes</h1>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-primary">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Correo</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Membresías activas</th>
                <th className="text-left px-4 py-3 font-medium text-primary">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(profiles || []).map((profile: any) => {
                const activePkgs = profile.user_packages?.filter(
                  (up: any) => new Date(up.expires_at) > new Date()
                ) || []
                return (
                  <tr key={profile.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">
                      {profile.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{profile.email}</td>
                    <td className="px-4 py-3">
                      {activePkgs.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Sin membresías</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {activePkgs.map((up: any) => (
                            <span key={up.id} className="text-xs bg-secondary text-primary px-2 py-0.5 rounded-full">
                              {up.package?.name_es}
                              {up.sessions_remaining !== null && ` (${up.sessions_remaining})`}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(profile.created_at).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!profiles || profiles.length === 0) && (
            <p className="text-center text-muted-foreground py-8">No hay clientes registrados</p>
          )}
        </div>
      </div>
    </div>
  )
}
