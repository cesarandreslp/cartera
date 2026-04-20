# GST S.A.S — Sistema de Cartera & Facturación Electrónica

Sistema web para la gestión de cartera de edificios, facturación electrónica DIAN y pagos. Desarrollado con **Next.js 16**, **Prisma 7**, **Neon** y **Vercel Blob**.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router), React 19 |
| Base de datos | Neon (PostgreSQL serverless) + Prisma 7 |
| Almacenamiento | Vercel Blob |
| Autenticación | NextAuth v5 |
| Estado global | Zustand |
| Deploy | Vercel |

## Módulos

- **Dashboard** — KPIs de cartera, gráficas y semáforo por edificio
- **Edificios** — Directorio de clientes/propiedades
- **Facturas** — Registro, control de estado, soporte en Blob
- **Facturación Electrónica** — Integración DIAN (XML UBL, CUFE, firma)
- **Pagos** — Registro de abonos y conciliación
- **Cartera Vigente** — Aging y estado de deudas
- **Cobros Automáticos** — Envío masivo por email
- **Reportes / Gerencial** — Informes ejecutivos
- **Documentos** — Repositorio de archivos en Vercel Blob
- **Configuración** — Parámetros del sistema
- **Cierre Fiscal** — Cierre de año contable
- **Auditoría** — Registro de acciones de usuarios
- **Usuarios** — Gestión de roles y permisos

## Instalación Local

```bash
cd app
cp .env.example .env
# Edita .env con tus credenciales
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

## Variables de Entorno Requeridas

```
DATABASE_URL       → Neon PostgreSQL URL (con pooling)
BLOB_READ_WRITE_TOKEN → Vercel Blob token
NEXTAUTH_SECRET    → Secret aleatorio (openssl rand -base64 32)
NEXTAUTH_URL       → URL base de la app
```

## Scripts

```bash
npm run dev         # Servidor de desarrollo
npm run build       # Build de producción
npm run db:push     # Sincronizar schema con la DB
npm run db:seed     # Poblar con datos de prueba
npm run db:migrate  # Migraciones (producción)
```
