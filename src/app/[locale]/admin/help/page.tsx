export default function AdminHelpPage() {
  return (
    <div className="max-w-3xl space-y-10 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-primary">Manual de Usuario</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Guía completa de cómo funciona el sitio y el panel de administración.
        </p>
      </div>

      {/* ── SECCIÓN CLIENTES ─────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-primary border-b border-border pb-2">
          Sitio web para clientes
        </h2>

        <ManualCard title="Cómo reservar una clase">
          <p>Los clientes reservan desde la página <strong>Clases</strong>. El proceso varía según el tipo de usuario:</p>
          <ul>
            <li><strong>Con membresía activa:</strong> selecciona la clase → elige membresía → confirma. La sesión se descuenta automáticamente y reciben un correo de confirmación.</li>
            <li><strong>Sin membresía:</strong> puede pagar la clase individual con tarjeta al momento de reservar (Stripe).</li>
            <li><strong>Como invitado:</strong> ingresa nombre y correo, sin necesidad de cuenta. Solo puede reservar clases individuales, no usa membresías.</li>
          </ul>
        </ManualCard>

        <ManualCard title="Cómo comprar una membresía">
          <ol>
            <li>Ir a la página <strong>Membresías</strong></li>
            <li>Elegir el paquete y hacer clic en <em>Comprar</em></li>
            <li>Completar el pago en Stripe (tarjeta de crédito/débito)</li>
            <li>La membresía aparece automáticamente en su cuenta</li>
            <li>Reciben un correo de confirmación con los detalles</li>
          </ol>
        </ManualCard>

        <ManualCard title="Cancelar una reserva">
          <p>Desde <strong>Mi Cuenta → Mis Reservas</strong>:</p>
          <ul>
            <li><strong>Con más de 12 horas de anticipación:</strong> recibe un crédito para usar en otra clase.</li>
            <li><strong>Con menos de 12 horas:</strong> la reserva se cancela pero no se devuelve la sesión ni el pago.</li>
          </ul>
          <Note>El límite de horas es configurable en Configuración → Cancelaciones.</Note>
        </ManualCard>

        <ManualCard title="Mi Cuenta">
          <ul>
            <li><strong>Mis Reservas:</strong> próximas clases con opción de cancelar, e historial de clases pasadas.</li>
            <li><strong>Mis Membresías:</strong> paquetes activos, sesiones restantes y fecha de vencimiento.</li>
          </ul>
        </ManualCard>
      </section>

      {/* ── SECCIÓN ADMIN ────────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-primary border-b border-border pb-2">
          Panel de Administración
        </h2>

        <ManualCard title="Clases (Horario)">
          <ul>
            <li><strong>Ver horario:</strong> muestra todas las clases programadas.</li>
            <li><strong>Crear clase:</strong> botón "+" para agregar una clase individual — tipo, instructora, duración y cupo.</li>
            <li><strong>Editar clase:</strong> clic sobre cualquier clase para modificar detalles.</li>
            <li><strong>Cancelar clase:</strong> marca la clase como cancelada. Los clientes con reserva no pierden su sesión.</li>
          </ul>
          <Note>Las clases pasadas aparecen en gris y no son editables.</Note>
        </ManualCard>

        <ManualCard title="Membresías">
          <ul>
            <li><strong>Ver paquetes:</strong> lista con nombre, precio, sesiones incluidas y vigencia.</li>
            <li><strong>Crear paquete:</strong> define nombre (ES/EN), precio en MXN, número de sesiones, días de vigencia y tipos de clase permitidos.</li>
            <li><strong>Editar / eliminar:</strong> desde cada tarjeta de paquete.</li>
          </ul>
          <Note>Los cambios son inmediatos en el sitio y no afectan membresías ya compradas.</Note>
        </ManualCard>

        <ManualCard title="Instructores">
          <ul>
            <li>Agrega, edita o elimina las instructoras que aparecen en la página <strong>Coaches</strong>.</li>
            <li>Cada instructora tiene nombre, foto, especialidades y descripción en ES/EN.</li>
            <li>El orden en la lista refleja el orden en el sitio.</li>
          </ul>
        </ManualCard>

        <ManualCard title="Galería">
          <ul>
            <li><strong>Subir imagen:</strong> selecciona una foto desde tu dispositivo. Se guarda automáticamente.</li>
            <li><strong>Eliminar:</strong> ícono de basura en cada imagen.</li>
          </ul>
          <Note>Formato recomendado: JPG o PNG, mínimo 800 px de ancho.</Note>
        </ManualCard>

        <ManualCard title="Clientes">
          <ul>
            <li><strong>Buscar:</strong> por nombre o correo electrónico.</li>
            <li><strong>Ver detalle:</strong> reservas activas y membresías de cada cliente.</li>
            <li><strong>Asignar membresía manualmente:</strong> para clientes que pagaron en efectivo o por transferencia.</li>
            <li><strong>Otorgar crédito:</strong> agrega una sesión de crédito a su cuenta (equivale a una clase gratis).</li>
          </ul>
        </ManualCard>

        <ManualCard title="Métricas">
          <ul>
            <li>Reservas por período (semana / mes)</li>
            <li>Ingresos recaudados vía Stripe</li>
            <li>Tipos de clase más populares</li>
            <li>Horarios pico</li>
          </ul>
          <Note>Los datos se actualizan en tiempo real.</Note>
        </ManualCard>

        <ManualCard title="Cupones">
          <ul>
            <li><strong>Crear cupón:</strong> define el código, tipo de descuento (porcentaje o monto fijo en MXN), límite de usos y fecha de vencimiento.</li>
            <li><strong>Ver uso:</strong> cuántas veces se ha utilizado cada cupón.</li>
            <li>Los cupones vencidos o agotados se marcan automáticamente como inactivos.</li>
          </ul>
          <p className="mt-2">Los clientes ingresan el código al pagar una membresía o clase individual.</p>
        </ManualCard>

        <ManualCard title="Configuración">
          <div className="space-y-4">
            <div>
              <p className="font-medium text-primary text-sm">Página de inicio</p>
              <p>Edita los textos e imágenes del hero y la sección "Nosotros". Cada campo tiene versión en español e inglés.</p>
            </div>
            <div>
              <p className="font-medium text-primary text-sm">Footer</p>
              <p>Edita el slogan, dirección, Instagram, correo y teléfono del pie de página.</p>
            </div>
            <div>
              <p className="font-medium text-primary text-sm">Cancelaciones</p>
              <ul>
                <li><strong>Horas límite:</strong> cuántas horas antes puede cancelarse con crédito (por defecto: 12 h).</li>
                <li><strong>Política de cancelación:</strong> texto visible en el sitio, editable en ES/EN.</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-primary text-sm">Correos</p>
              <p>Personaliza los correos automáticos. Disponibles:</p>
              <ul>
                <li><strong>Confirmación de reserva:</strong> se envía al reservar una clase.</li>
                <li><strong>Confirmación de membresía:</strong> se envía al comprar un paquete vía Stripe.</li>
              </ul>
              <p className="mt-2">Variables disponibles por plantilla:</p>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-primary">Variable</th>
                      <th className="text-left px-3 py-2 font-medium text-primary">Qué inserta</th>
                      <th className="text-left px-3 py-2 font-medium text-primary">Plantilla</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ['{{name}}', 'Nombre del cliente', 'Ambas'],
                      ['{{className}}', 'Tipo de clase (ej. Pilates Reformer)', 'Reserva'],
                      ['{{date}}', 'Fecha y hora de la clase', 'Reserva'],
                      ['{{instructor}}', 'Nombre de la instructora', 'Reserva'],
                      ['{{duration}}', 'Duración en minutos', 'Reserva'],
                      ['{{packageName}}', 'Nombre de la membresía', 'Membresía'],
                      ['{{sessionsRemaining}}', 'Sesiones incluidas', 'Membresía'],
                      ['{{expiresAt}}', 'Fecha de vencimiento', 'Membresía'],
                    ].map(([v, desc, tmpl]) => (
                      <tr key={v}>
                        <td className="px-3 py-2 font-mono text-primary">{v}</td>
                        <td className="px-3 py-2 text-muted-foreground">{desc}</td>
                        <td className="px-3 py-2 text-muted-foreground">{tmpl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="font-medium text-primary text-sm">Usuarios</p>
              <ul>
                <li><strong>Admin:</strong> acceso completo al panel de administración.</li>
                <li><strong>Coach:</strong> rol de instructora para funciones futuras.</li>
                <li>Para agregar: ingresa correo, nombre y rol. Para quitar: botón "Quitar".</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-primary text-sm">Próximamente</p>
              <ul>
                <li><strong>Activar/desactivar:</strong> si está activa, los visitantes son redirigidos a la página de cuenta regresiva.</li>
                <li><strong>Contraseña de acceso anticipado:</strong> permite ver el sitio antes del lanzamiento.</li>
                <li><strong>Fecha de lanzamiento:</strong> controla la cuenta regresiva.</li>
              </ul>
              <Note>El panel de admin siempre es accesible, sin importar si "Próximamente" está activado.</Note>
            </div>
          </div>
        </ManualCard>
      </section>

      {/* ── NOTAS GENERALES ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary border-b border-border pb-2">
          Notas importantes
        </h2>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-3 text-sm text-muted-foreground">
          <p>• <strong className="text-primary">Capacidad de clases:</strong> configurada en 5 personas por clase. Para cambiarla, contacta a tu desarrolladora.</p>
          <p>• <strong className="text-primary">Pagos:</strong> todos los pagos van directamente a tu cuenta de Stripe. El sitio no almacena información de tarjetas.</p>
          <p>• <strong className="text-primary">Zona horaria:</strong> todas las fechas y horarios están en hora de México (UTC-6).</p>
          <p>• <strong className="text-primary">Idioma:</strong> los clientes pueden cambiar entre español e inglés desde el menú de navegación.</p>
          <p>• <strong className="text-primary">Correos automáticos:</strong> se envían desde <code className="bg-secondary px-1 rounded text-xs">reservas@flexroomstudio.com</code>. Revisa spam si no aparecen.</p>
        </div>
      </section>
    </div>
  )
}

function ManualCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-3">
      <h3 className="text-base font-semibold text-primary">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_strong]:text-primary">
        {children}
      </div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs bg-secondary/60 border border-border rounded-lg px-3 py-2 text-muted-foreground">
      <strong className="text-primary">Nota:</strong> {children}
    </p>
  )
}
