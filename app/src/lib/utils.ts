/**
 * Client-safe utilities — no imports from server-only modules.
 * Safe to import from both Server and Client Components.
 */

export type Module =
  | 'dashboard' | 'edificios' | 'facturas' | 'facturacion'
  | 'pagos' | 'cartera' | 'cobros' | 'reportes' | 'gerencial'
  | 'documentos' | 'cierre' | 'auditoria' | 'usuarios' | 'config' | 'ayuda'

export function hasPermission(
  permissions: Record<string, any>,
  module: Module,
  action: 'view' | 'create' | 'edit' | 'delete' = 'view'
): boolean {
  return permissions?.[module]?.[action] === true
}

export function fmt(n: number | string | null | undefined): string {
  if (n == null) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(n))
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
