import { prisma } from '@/lib/db'
import { fmt, fmtDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DocumentosPage() {
  const docs = await prisma.feDocument.findMany({
    include: {
      invoice: {
        include: { building: { select: { code: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Documentos Electrónicos</h2>
          <p>{docs.length} documentos DIAN · Últimos 200</p>
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          {docs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗂️</div>
              <h3>Sin documentos</h3>
              <p>Emite facturas electrónicamente para verlas aquí.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Tipo</th>
                  <th>Edificio</th>
                  <th>Total</th>
                  <th>CUFE / CUDE</th>
                  <th>DIAN</th>
                  <th>Firmada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.invoice.number}</strong></td>
                    <td>
                      {d.noteType
                        ? <span className={`badge ${d.noteType === 'CREDIT' ? 'badge-danger' : 'badge-warning'}`}>
                            {d.noteType === 'CREDIT' ? 'N.C.' : 'N.D.'}
                          </span>
                        : <span className="badge badge-primary">FACTURA</span>}
                    </td>
                    <td>{d.invoice.building.code} · {d.invoice.building.name}</td>
                    <td>{fmt(Number(d.invoice.total))}</td>
                    <td><code style={{ fontSize: 10 }}>{d.cufe?.slice(0, 20) ?? '—'}…</code></td>
                    <td><span className={`badge ${dianBadge(d.dianStatus)}`}>{d.dianStatus}</span></td>
                    <td>{fmtDate(d.signedAt)}</td>
                    <td>
                      {d.xmlUbl && (
                        <a
                          href={`data:application/xml;charset=utf-8,${encodeURIComponent(d.xmlUbl)}`}
                          download={`${d.invoice.number}.xml`}
                          className="btn-icon"
                          title="Descargar XML"
                        >📥</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function dianBadge(s: string): string {
  switch (s) {
    case 'ACCEPTED': return 'badge-success'
    case 'SENT': return 'badge-info'
    case 'SIGNED': return 'badge-primary'
    case 'REJECTED': return 'badge-danger'
    case 'VOID': return 'badge-gray'
    default: return 'badge-warning'
  }
}
