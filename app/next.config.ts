import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'pg',
    '@prisma/adapter-pg',
    '@prisma/client',
    'bcryptjs',
    'nodemailer',
  ],
}

export default nextConfig
