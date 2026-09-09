'use client'

import { useState } from 'react'

export default function AdminHelpPage() {
  const [tab, setTab] = useState<'clients' | 'admin' | 'tech'>('clients')

  return (
    <div className="max-w-3xl space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-primary">Manual de Usuario</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Guía de cómo funciona el sitio y el panel de administración.
        </p>
      </div>

      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {([
          { key: 'clients', label: 'Sitio web para clientes' },
          { key: 'admin', label: 'Panel de Administración' },
          { key: 'tech', label: 'Detalles técnicos' },
        ] as { key: typeof tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === key ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'clients' && (
        <div className="space-y-6">
          <ManualCard title="Cómo reservar una clase">
            <p>Los clientes reservan desde la página <strong>Clases</strong>. El proceso varía según el tipo de usuario:</p>
            <ul>
              <li><strong>Con membresía activa:</strong> selecciona la clase → elige la membresía a usar → confirma. La sesión se descuenta automáticamente y reciben un correo de confirmación.</li>
              <li><strong>Sin membresía:</strong> puede pagar la clase individual con tarjeta al momento de reservar.</li>
              <li><strong>Como invitado:</strong> ingresa nombre y correo, sin necesidad de cuenta. Solo puede reservar clases individuales, no puede usar membresías.</li>
            </ul>
          </ManualCard>

          <ManualCard title="Cómo comprar una membresía">
            <ol>
              <li>Ir a la página <strong>Membresías</strong></li>
              <li>Elegir el paquete y hacer clic en <em>Comprar</em></li>
              <li>Completar el pago con tarjeta</li>
              <li>La membresía aparece automáticamente en su cuenta</li>
              <li>Reciben un correo de confirmación con los detalles</li>
            </ol>
            <Note>Para comprar una membresía se requiere tener cuenta. Los invitados solo pueden pagar clases individuales.</Note>
          </ManualCard>

          <ManualCard title="Cancelar una reserva">
            <p>Desde <strong>Mi Cuenta → Mis Reservas</strong>, el cliente puede cancelar cualquier clase próxima:</p>
            <ul>
              <li><strong>Con más de 12 horas de anticipación:</strong> recibe un crédito para usar en otra clase.</li>
              <li><strong>Con menos de 12 horas:</strong> la reserva se cancela pero no se devuelve la sesión ni el pago.</li>
            </ul>
            <Note>El límite de horas es configurable en Configuración → Cancelaciones.</Note>
          </ManualCard>

          <ManualCard title="Mi Cuenta">
            <ul>
              <li><strong>Mis Reservas:</strong> muestra las próximas clases con opción de cancelar, y el historial de clases pasadas.</li>
              <li><strong>Mis Membresías:</strong> muestra los paquetes activos con sesiones restantes y fecha de vencimiento.</li>
            </ul>
          </ManualCard>
        </div>
      )}

      {tab === 'admin' && (
        <div className="space-y-6">
          <ManualCard title="Clases (Horario)">
            <p>Aquí se gestiona el calendario de clases que los clientes ven en el sitio.</p>
            <ul>
              <li><strong>Crear clase:</strong> botón "+" para agregar una clase — define tipo, instructora, fecha, hora, duración y cupo máximo.</li>
              <li><strong>Editar clase:</strong> clic en el ícono de lápiz sobre cualquier clase para modificar sus detalles, incluyendo el cupo.</li>
              <li><strong>Cancelar clase:</strong> marca la clase como cancelada. Aparece tachada en el sitio y los clientes con reserva no pierden su sesión.</li>
            </ul>
            <Note>Las clases pasadas aparecen en gris y no son editables.</Note>
          </ManualCard>

          <ManualCard title="Membresías">
            <p>Gestiona los paquetes que se venden en el sitio.</p>
            <ul>
              <li><strong>Crear paquete:</strong> define nombre, precio en MXN, número de sesiones, días de vigencia y tipos de clase permitidos.</li>
              <li><strong>Editar / eliminar:</strong> disponible desde cada tarjeta de paquete.</li>
            </ul>
            <Note>Los cambios son inmediatos en el sitio y no afectan membresías que los clientes ya compraron.</Note>
          </ManualCard>

          <ManualCard title="Instructores">
            <p>Gestiona las instructoras que aparecen en la página <strong>Coaches</strong> del sitio.</p>
            <ul>
              <li>Agrega, edita o elimina instructoras.</li>
              <li>Cada instructora tiene nombre, foto, especialidades y descripción en español e inglés.</li>
              <li>El orden en la lista refleja el orden en que aparecen en el sitio.</li>
            </ul>
          </ManualCard>

          <ManualCard title="Galería">
            <p>Sube y organiza las fotos que aparecen en la página <strong>Galería</strong>.</p>
            <ul>
              <li><strong>Subir:</strong> selecciona una imagen desde tu dispositivo. Se guarda automáticamente.</li>
              <li><strong>Eliminar:</strong> ícono de basura en cada foto.</li>
            </ul>
            <Note>Formato recomendado: JPG o PNG, mínimo 800 px de ancho.</Note>
          </ManualCard>

          <ManualCard title="Clientes">
            <p>Vista de todos los usuarios registrados en la plataforma.</p>
            <ul>
              <li><strong>Buscar:</strong> por nombre o correo electrónico.</li>
              <li><strong>Ver detalle:</strong> reservas activas y membresías de cada cliente.</li>
              <li><strong>Asignar membresía manualmente:</strong> útil para clientes que pagaron en efectivo o por transferencia.</li>
              <li><strong>Otorgar crédito:</strong> agrega una sesión de crédito a la cuenta del cliente, equivalente a una clase gratis.</li>
            </ul>
          </ManualCard>

          <ManualCard title="Métricas">
            <p>Dashboard con estadísticas del negocio en tiempo real:</p>
            <ul>
              <li>Total de reservas por período</li>
              <li>Ingresos recaudados vía Stripe</li>
              <li>Tipos de clase más populares</li>
              <li>Horarios con mayor demanda</li>
            </ul>
          </ManualCard>

          <ManualCard title="Cupones">
            <p>Crea códigos de descuento para compartir con clientes.</p>
            <ul>
              <li><strong>Crear cupón:</strong> define el código, descuento (porcentaje o monto fijo en MXN), límite de usos y fecha de vencimiento.</li>
              <li><strong>Ver uso:</strong> cuántas veces se ha usado cada cupón.</li>
              <li>Los cupones vencidos o agotados se desactivan automáticamente.</li>
            </ul>
            <p className="mt-2">Los clientes ingresan el código al pagar una membresía o clase individual.</p>
          </ManualCard>

          <ManualCard title="Configuración">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-primary text-sm">Página de inicio</p>
                <p>Edita los textos e imágenes que aparecen en la página principal: título, subtítulo, imagen del hero y sección "Nosotros". Cada campo tiene versión en español e inglés.</p>
              </div>
              <div>
                <p className="font-medium text-primary text-sm">Footer</p>
                <p>Edita el slogan, dirección, Instagram, correo y teléfono que aparecen en el pie de página.</p>
              </div>
              <div>
                <p className="font-medium text-primary text-sm">Cancelaciones</p>
                <ul>
                  <li><strong>Horas límite:</strong> define cuántas horas antes de la clase puede cancelarse con crédito. Por defecto: 12 horas.</li>
                  <li><strong>Política de cancelación:</strong> texto visible en el sitio que explica las reglas, editable en español e inglés.</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-primary text-sm">Correos</p>
                <p>Personaliza el texto de los correos automáticos que reciben los clientes: confirmación de reserva y confirmación de membresía. Cada uno es editable en español e inglés.</p>
              </div>
              <div>
                <p className="font-medium text-primary text-sm">Usuarios</p>
                <ul>
                  <li><strong>Admin:</strong> acceso completo al panel de administración.</li>
                  <li><strong>Coach:</strong> rol de instructora.</li>
                  <li>Para agregar: ingresa correo, nombre y rol. Para quitar: botón "Quitar".</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-primary text-sm">Próximamente</p>
                <ul>
                  <li><strong>Activar/desactivar:</strong> cuando está activa, todos los visitantes son redirigidos a una página de cuenta regresiva en lugar del sitio.</li>
                  <li><strong>Contraseña de acceso anticipado:</strong> permite que personas de confianza vean el sitio antes del lanzamiento.</li>
                  <li><strong>Fecha de lanzamiento:</strong> controla la cuenta regresiva visible en esa página.</li>
                </ul>
                <Note>El panel de admin siempre es accesible, sin importar si "Próximamente" está activado.</Note>
              </div>
            </div>
          </ManualCard>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-primary border-b border-border pb-2">
              Notas importantes
            </h2>
            <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-3 text-sm text-muted-foreground">
              <p>• <strong className="text-primary">Capacidad de clases:</strong> se define al crear o editar cada clase desde el panel de Clases. Cada clase puede tener un cupo diferente.</p>
              <p>• <strong className="text-primary">Pagos:</strong> todos los pagos van directamente a tu cuenta de Stripe. El sitio no almacena información de tarjetas.</p>
              <p>• <strong className="text-primary">Zona horaria:</strong> todas las fechas y horarios están en hora de México (UTC-6).</p>
              <p>• <strong className="text-primary">Idioma:</strong> los clientes pueden cambiar entre español e inglés desde el menú de navegación.</p>
              <p>• <strong className="text-primary">Correos automáticos:</strong> se envían desde reservas@flexroomstudio.com. Si no aparecen, revisar la carpeta de spam.</p>
            </div>
          </div>
        </div>
      )}
      {tab === 'tech' && (
        <div className="space-y-6">

          <ManualCard title="🌐 Dominio">
            <ul>
              <li><strong>Proveedor:</strong> GoDaddy</li>
              <li><strong>Dominio:</strong> flexroomstudio.com</li>
              <li><strong>Acceso:</strong> godaddy.com → iniciar sesión con la cuenta registrada</li>
              <li><strong>DNS:</strong> administrado desde GoDaddy. Aquí se configuran los registros de correo (SPF, DKIM, DMARC para Resend) y cualquier subdominio.</li>
            </ul>
            <Note>Si algún día se cambia de proveedor de hosting o correo, los cambios se hacen en los DNS de GoDaddy.</Note>
          </ManualCard>

          <ManualCard title="🚀 Hosting del sitio web">
            <ul>
              <li><strong>Proveedor:</strong> Vercel (vercel.com)</li>
              <li><strong>URL de producción:</strong> https://www.flexroomstudio.com</li>
              <li><strong>Repositorio:</strong> GitHub — normarsv/flexroom-studio</li>
              <li><strong>Deploy automático:</strong> cada vez que se sube un cambio a la rama <code>main</code> de GitHub, Vercel despliega automáticamente en 1–2 minutos.</li>
              <li><strong>Variables de entorno:</strong> administradas en Vercel → Project Settings → Environment Variables. Incluyen las claves de Supabase, Stripe y Resend.</li>
            </ul>
            <Note>Nunca compartir las variables de entorno. Si alguna clave se compromete, regenerarla desde el panel del proveedor correspondiente y actualizarla en Vercel.</Note>
          </ManualCard>

          <ManualCard title="🗄️ Base de datos y autenticación">
            <ul>
              <li><strong>Proveedor:</strong> Supabase (supabase.com)</li>
              <li><strong>Proyecto:</strong> uhshqakbtiuafxmndwfe</li>
              <li><strong>Acceso:</strong> supabase.com → iniciar sesión → seleccionar el proyecto</li>
              <li><strong>Base de datos:</strong> PostgreSQL. Toda la información del sitio (clientes, reservas, clases, membresías, etc.) se guarda aquí.</li>
              <li><strong>Autenticación:</strong> Supabase Auth maneja los inicios de sesión (correo + contraseña, Google). Los correos de autenticación (confirmar cuenta, restablecer contraseña) se envían a través de Resend vía SMTP.</li>
              <li><strong>Storage:</strong> bucket <code>fs-media</code> — almacena las imágenes del sitio (galería, hero, coaches).</li>
            </ul>
          </ManualCard>

          <ManualCard title="📧 Correos electrónicos">
            <ul>
              <li><strong>Proveedor de envío:</strong> Resend (resend.com)</li>
              <li><strong>Dirección de envío:</strong> reservas@flexroomstudio.com</li>
              <li><strong>Correos transaccionales</strong> (confirmaciones de reserva, membresía, cancelación, lista de espera): enviados directamente desde el código del sitio a través de Resend.</li>
              <li><strong>Correos de autenticación</strong> (confirmar cuenta, restablecer contraseña): enviados por Supabase usando Resend como SMTP personalizado.</li>
              <li><strong>Plantillas editables:</strong> Admin → Configuración → Correos. Solo aplica a confirmación de reserva y membresía.</li>
              <li><strong>Reenvío de respuestas:</strong> los correos que los clientes respondan a reservas@flexroomstudio.com llegan al correo personal configurado en ImprovMX o Cloudflare Email Routing.</li>
            </ul>
            <Note>Si los correos dejan de llegar, verificar primero el panel de Resend (resend.com/emails) para ver si hay errores de entrega.</Note>
          </ManualCard>

          <ManualCard title="💳 Pagos">
            <ul>
              <li><strong>Proveedor:</strong> Stripe (stripe.com)</li>
              <li><strong>Moneda:</strong> MXN (pesos mexicanos)</li>
              <li><strong>Modo actual:</strong> Sandbox (pruebas) — los pagos no son reales hasta activar el modo de producción.</li>
              <li><strong>Webhook:</strong> https://www.flexroomstudio.com/api/webhooks/stripe — notifica al sitio cuando un pago se completa. Configurado en Stripe → Developers → Webhooks.</li>
              <li><strong>Los ingresos</strong> van directamente a la cuenta bancaria conectada en Stripe. El sitio nunca almacena datos de tarjetas.</li>
            </ul>
            <Note>Para activar pagos reales, ir a Stripe y completar la verificación de identidad y cuenta bancaria. Luego actualizar las claves en Vercel de modo sandbox a modo live.</Note>
          </ManualCard>

          <ManualCard title="🔑 Dónde están las claves y credenciales">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-primary text-sm">Vercel (variables de entorno del sitio)</p>
                <p>vercel.com → proyecto flexroom-studio → Settings → Environment Variables</p>
              </div>
              <div>
                <p className="font-medium text-primary text-sm">Supabase (base de datos)</p>
                <p>supabase.com → proyecto → Settings → API → service_role key y anon key</p>
              </div>
              <div>
                <p className="font-medium text-primary text-sm">Stripe (pagos)</p>
                <p>stripe.com → Developers → API Keys</p>
              </div>
              <div>
                <p className="font-medium text-primary text-sm">Resend (correos)</p>
                <p>resend.com → API Keys</p>
              </div>
              <div>
                <p className="font-medium text-primary text-sm">GitHub (código fuente)</p>
                <p>github.com/normarsv/flexroom-studio — repositorio privado con todo el código del sitio</p>
              </div>
            </div>
          </ManualCard>

          <ManualCard title="🛠️ ¿Qué hacer si algo deja de funcionar?">
            <div className="space-y-2">
              <p><strong>El sitio está caído:</strong> revisar vercel.com → proyecto → Deployments. Si el último deploy falló, se puede revertir al anterior con un clic.</p>
              <p><strong>Los correos no llegan:</strong> revisar resend.com/emails — muestra todos los correos enviados y si hubo errores. Verificar también la carpeta de spam del destinatario.</p>
              <p><strong>Los pagos no funcionan:</strong> revisar stripe.com → Events — muestra los intentos de pago y errores del webhook.</p>
              <p><strong>Error de base de datos:</strong> revisar supabase.com → proyecto → Logs.</p>
              <p><strong>Algo en el código necesita cambiarse:</strong> contactar al desarrollador o abrir una sesión con Claude Code.</p>
            </div>
          </ManualCard>

        </div>
      )}
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
