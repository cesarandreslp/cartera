'use client'

import { usePathname } from 'next/navigation'
import { useAppStore } from '@/store/app'

const PAGE_META: Record<string, { title: string; sub: string; mod: string }> = {
  '/dashboard':   { title: 'Dashboard',              sub: 'Resumen general del sistema',              mod: 'INICIO' },
  '/edificios':   { title: 'Edificios & Clientes',   sub: 'Gestión de propiedades y clientes',        mod: 'GESTIÓN' },
  '/facturas':    { title: 'Facturas',                sub: 'Creación y administración de facturas',    mod: 'GESTIÓN' },
  '/facturacion': { title: 'Facturación Electrónica', sub: 'Emisión DIAN • UBL 2.1',                  mod: 'FE-DIAN' },
  '/pagos':       { title: 'Pagos',                   sub: 'Registro y aplicación de pagos',           mod: 'GESTIÓN' },
  '/cartera':     { title: 'Cartera',                 sub: 'Aging, saldos y estado de cuenta',         mod: 'GESTIÓN' },
  '/cobros':      { title: 'Cobros Automáticos',      sub: 'Configuración y ejecución de cobros',      mod: 'OPERACIONES' },
  '/reportes':    { title: 'Reportes',                sub: 'Exportación y análisis de datos',          mod: 'OPERACIONES' },
  '/gerencial':   { title: 'Vista Gerencial',         sub: 'Indicadores ejecutivos y análisis IA',     mod: 'OPERACIONES' },
  '/documentos':  { title: 'Documentos',              sub: 'Recibos, estados y documentos digitales',  mod: 'OPERACIONES' },
  '/cierre':      { title: 'Cierre Fiscal',           sub: 'Cierre contable de períodos anuales',      mod: 'ADMINISTRACIÓN' },
  '/auditoria':   { title: 'Auditoría',               sub: 'Log de acciones del sistema',              mod: 'ADMINISTRACIÓN' },
  '/usuarios':    { title: 'Usuarios',                sub: 'Gestión de accesos y permisos',            mod: 'ADMINISTRACIÓN' },
  '/config':      { title: 'Configuración',           sub: 'Parámetros del sistema',                   mod: 'ADMINISTRACIÓN' },
  '/ayuda':       { title: 'Centro de Ayuda',         sub: 'Guías, FAQs y soporte',                    mod: 'SOPORTE' },
}

export default function TopBar() {
  const pathname = usePathname()
  const { fiscalYear } = useAppStore()

  // Match longest prefix
  const meta = Object.entries(PAGE_META)
    .filter(([k]) => pathname.startsWith(k))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1]
    ?? { title: 'GST S.A.S', sub: 'Sistema de Cartera', mod: '' }

  const now = new Date().toLocaleDateString('es-CO', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <span className="top-bar-title">{meta.title}</span>
        <span className="top-bar-sub">{meta.sub}</span>
      </div>

      <div className="top-bar-right">
        {meta.mod && <span className="tb-mod-chip">{meta.mod}</span>}
        <span className="year-badge">Año {fiscalYear}</span>
        <div className="session-chip">
          <span className="dot" />
          {now}
        </div>
      </div>
    </header>
  )
}
