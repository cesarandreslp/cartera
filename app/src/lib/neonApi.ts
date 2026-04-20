/**
 * Neon API wrapper for automatic database provisioning.
 * Each tenant gets their own Neon project (isolated PostgreSQL DB).
 *
 * Neon API docs: https://api-docs.neon.tech/reference
 */

const NEON_API = 'https://console.neon.tech/api/v2'
const NEON_API_KEY = process.env.NEON_API_KEY!
const NEON_REGION = process.env.NEON_REGION ?? 'aws-us-east-1'

interface NeonProject {
  id: string
  name: string
  connectionUri: string   // pooled connection string (pgbouncer)
  directUri: string       // direct connection (for Prisma migrations)
}

/**
 * Provisions a new Neon project (database) for a tenant.
 * Returns both pooled and direct connection URIs.
 */
export async function createTenantDatabase(slug: string): Promise<NeonProject> {
  const res = await fetch(`${NEON_API}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NEON_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      project: {
        name: `gst-tenant-${slug}`,
        region_id: NEON_REGION,
        pg_version: 16,
        default_branch_name: 'main',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Neon API error creating project for ${slug}: ${err}`)
  }

  const data = await res.json()
  const project = data.project
  const uris: Array<{ connection_uri: string; pooler_enabled?: boolean }> =
    data.connection_uris ?? []

  // Neon returns both pooled and direct URIs
  const pooled = uris.find(u => u.pooler_enabled)?.connection_uri
    ?? uris[0]?.connection_uri
  const direct = uris.find(u => !u.pooler_enabled)?.connection_uri
    ?? uris[0]?.connection_uri

  return {
    id:            project.id,
    name:          project.name,
    connectionUri: pooled + '&sslmode=require',
    directUri:     direct + '&sslmode=require',
  }
}

/**
 * Deletes a Neon project. Called when a tenant is permanently removed.
 */
export async function deleteTenantDatabase(projectId: string): Promise<void> {
  const res = await fetch(`${NEON_API}/projects/${projectId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${NEON_API_KEY}` },
  })
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Neon API error deleting project ${projectId}: ${err}`)
  }
}

/**
 * Lists all tenant Neon projects (for admin use).
 */
export async function listTenantDatabases(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${NEON_API}/projects?limit=100`, {
    headers: { 'Authorization': `Bearer ${NEON_API_KEY}` },
  })
  if (!res.ok) throw new Error('Failed to list Neon projects')
  const data = await res.json()
  return (data.projects ?? []).map((p: any) => ({ id: p.id, name: p.name }))
}
