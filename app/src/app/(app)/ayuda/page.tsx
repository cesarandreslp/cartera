const SECTIONS = [
  {
    id: 'inicio',
    title: 'Primeros pasos',
    icon: '🚀',
    items: [
      { q: '¿Cómo creo un edificio?', a: 'Ve a Edificios → "+ Nuevo edificio" y completa código, nombre y NIT. El código debe ser único.' },
      { q: '¿Cómo emito mi primera factura?', a: 'Edificios creados → Facturas → "+ Nueva factura". Selecciona edificio, período (YYYY-MM), subtotal y demás valores. El total se calcula automáticamente.' },
      { q: '¿Cómo registro un pago?', a: 'Ve a Pagos → localiza la factura pendiente → botón "💳 Pagar". El estado de la factura se actualiza solo (PARTIAL / PAID).' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '📊',
    items: [
      { q: '¿Qué muestran los KPIs?', a: 'Facturado, recaudado, cartera pendiente, mora acumulada y año fiscal. Se calculan sobre el año seleccionado.' },
      { q: '¿Cómo cambio el año?', a: 'Usa el parámetro ?year=YYYY en la URL, o los selectores de Reportes/Facturas.' },
    ],
  },
  {
    id: 'cartera',
    title: 'Cartera y aging',
    icon: '📋',
    items: [
      { q: '¿Cómo se calculan los buckets?', a: 'VIG: aún no vence. 1-30, 31-60, 61-90, 90+ días según diferencia entre fecha de vencimiento y hoy.' },
      { q: '¿Por qué no aparece una factura?', a: 'Solo se listan facturas PENDING / PARTIAL / OVERDUE con saldo > 0. Las VOID y PAID quedan excluidas.' },
    ],
  },
  {
    id: 'fe',
    title: 'Facturación electrónica DIAN',
    icon: '⚡',
    items: [
      { q: '¿Qué ambientes hay?', a: 'HABILITACION (pruebas DIAN) y PRODUCCION. Se configura en Configuración → Facturación electrónica.' },
      { q: '¿Qué es el CUFE?', a: 'Código Único de Factura Electrónica. Hash SHA-384 calculado con datos de la factura + clave técnica DIAN.' },
      { q: '¿Cuándo se puede anular una factura?', a: 'Con notas crédito si ya se envió a DIAN. Si no ha sido enviada, puede anularse directamente.' },
    ],
  },
  {
    id: 'cierre',
    title: 'Cierre fiscal',
    icon: '🔒',
    items: [
      { q: '¿Cuándo puedo cerrar un año?', a: 'Cuando todas las facturas del año están en estado PAID o VOID. Si hay pendientes, el botón aparece bloqueado.' },
      { q: '¿Es reversible?', a: 'No. El cierre es definitivo y se audita. Revisa saldos y mora antes de confirmar.' },
    ],
  },
  {
    id: 'usuarios',
    title: 'Usuarios y roles',
    icon: '👥',
    items: [
      { q: '¿Qué roles existen?', a: 'ADMIN (acceso total), MANAGER (gestión), OPERATOR (operación diaria), VIEWER (solo lectura).' },
      { q: '¿Puedo eliminar mi propio usuario?', a: 'No. El API bloquea auto-eliminación. Pide a otro admin que te inactive.' },
    ],
  },
  {
    id: 'auditoria',
    title: 'Auditoría',
    icon: '🔍',
    items: [
      { q: '¿Qué se registra?', a: 'Cada create / update / delete en los módulos principales queda registrado con usuario, módulo, acción, detalle y fecha.' },
      { q: '¿Hasta cuándo se conservan los logs?', a: 'No hay purga automática. Quedan hasta que se implemente política de retención.' },
    ],
  },
]

export default function AyudaPage() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Centro de Ayuda</h2>
          <p>Guías, FAQs y soporte</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ position: 'sticky', top: 0 }}>
          <div className="card-body" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                style={{
                  padding: '8px 12px', borderRadius: 6,
                  fontSize: 12.5, fontWeight: 600, color: 'var(--gray-700)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                <span>{s.icon}</span> {s.title}
              </a>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SECTIONS.map((s) => (
            <div key={s.id} id={s.id} className="card" style={{ scrollMarginTop: 20 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">{s.icon} {s.title}</div>
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {s.items.map((it, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>
                      {it.q}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                      {it.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="card">
            <div className="card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32 }}>📧</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>¿Necesitas más ayuda?</h3>
              <p style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 4 }}>
                Escribe a <strong>soporte@gst.com.co</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
