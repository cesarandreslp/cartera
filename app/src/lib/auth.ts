import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { getTenantDb }    from '@/lib/tenantDb'
import { controlDb }      from '@/lib/controlDb'
import bcrypt             from 'bcryptjs'
import { headers }        from 'next/headers'

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages:   { signIn: '/login' },
  providers: [
    // ── Tenant user login ──────────────────────────────────────────────────
    Credentials({
      id:   'tenant',
      name: 'Tenant Credentials',
      credentials: {
        email:    { label: 'Email',     type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantId) {
          return null
        }

        const tenantId = credentials.tenantId as string

        try {
          const db   = await getTenantDb(tenantId)
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          })

          if (!user || !user.active) return null

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash,
          )
          if (!valid) return null

          return {
            id:          user.id,
            name:        user.name,
            email:       user.email,
            role:        user.role,
            permissions: user.permissions,
            tenantId,
          }
        } catch {
          return null
        }
      },
    }),

    // ── Superadmin login ───────────────────────────────────────────────────
    Credentials({
      id:   'superadmin',
      name: 'SuperAdmin',
      credentials: {
        email:    { label: 'Email',     type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const admin = await controlDb.superAdmin.findUnique({
          where: { email: credentials.email as string },
        })

        if (!admin || !admin.active) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          admin.passwordHash,
        )
        if (!valid) return null

        return {
          id:       admin.id,
          name:     admin.name,
          email:    admin.email,
          role:     'SUPERADMIN',
          tenantId: null,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id          = user.id
        token.role        = (user as any).role
        token.permissions = (user as any).permissions
        token.tenantId    = (user as any).tenantId ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id          = token.id as string
        ;(session.user as any).role        = token.role
        ;(session.user as any).permissions = token.permissions
        ;(session.user as any).tenantId    = token.tenantId
      }
      return session
    },
  },
})
