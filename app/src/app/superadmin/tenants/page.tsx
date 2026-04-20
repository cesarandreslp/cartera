import TenantsClient from './TenantsClient'

export const metadata = { title: 'Tenants — Superadmin GST' }

export default function TenantsPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Gestión de Tenants</h2>
          <p>Administra todas las empresas registradas en la plataforma</p>
        </div>
      </div>
      <TenantsClient />
    </div>
  )
}
