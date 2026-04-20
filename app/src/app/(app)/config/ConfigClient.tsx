'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app'

type Cfg = {
  'company.name'?: string
  'company.nit'?: string
  'company.address'?: string
  'company.phone'?: string
  'company.email'?: string
  'fe.prefix'?: string
  'fe.consecutive'?: number
  'fe.testMode'?: boolean
  'fe.environment'?: string
  'billing.defaultTaxRate'?: number
  'billing.defaultDueDays'?: number
  'billing.moraRate'?: number
}

export default function ConfigClient({ initial }: { initial: Cfg }) {
  const router = useRouter()
  const { addToast } = useAppStore()
  const [cfg, setCfg] = useState<Cfg>(initial)
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()

  function set<K extends keyof Cfg>(k: K, v: Cfg[K]) {
    setCfg((c) => ({ ...c, [k]: v }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al guardar')
      return
    }
    addToast('success', 'Configuración actualizada')
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Configuración</h2>
          <p>Parámetros generales del sistema</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : '💾 Guardar cambios'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card title="Empresa" sub="Información del emisor">
          <Field label="Razón social">
            <input className="form-control" value={cfg['company.name'] ?? ''}
              onChange={(e) => set('company.name', e.target.value)} />
          </Field>
          <Field label="NIT">
            <input className="form-control" value={cfg['company.nit'] ?? ''}
              onChange={(e) => set('company.nit', e.target.value)} />
          </Field>
          <Field label="Dirección">
            <input className="form-control" value={cfg['company.address'] ?? ''}
              onChange={(e) => set('company.address', e.target.value)} />
          </Field>
          <div className="form-row">
            <Field label="Teléfono">
              <input className="form-control" value={cfg['company.phone'] ?? ''}
                onChange={(e) => set('company.phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input type="email" className="form-control" value={cfg['company.email'] ?? ''}
                onChange={(e) => set('company.email', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="Facturación electrónica" sub="Configuración DIAN">
          <div className="form-row">
            <Field label="Prefijo FE">
              <input className="form-control" value={cfg['fe.prefix'] ?? ''}
                onChange={(e) => set('fe.prefix', e.target.value)} placeholder="SETP" />
            </Field>
            <Field label="Consecutivo actual">
              <input type="number" className="form-control" value={cfg['fe.consecutive'] ?? 0}
                onChange={(e) => set('fe.consecutive', Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Ambiente DIAN">
            <select className="form-control" value={cfg['fe.environment'] ?? 'HABILITACION'}
              onChange={(e) => set('fe.environment', e.target.value)}>
              <option value="HABILITACION">Habilitación (pruebas)</option>
              <option value="PRODUCCION">Producción</option>
            </select>
          </Field>
          <Field label="Modo pruebas">
            <select className="form-control" value={cfg['fe.testMode'] ? '1' : '0'}
              onChange={(e) => set('fe.testMode', e.target.value === '1')}>
              <option value="1">Activado</option>
              <option value="0">Desactivado</option>
            </select>
          </Field>
        </Card>

        <Card title="Facturación" sub="Valores por defecto">
          <Field label="IVA por defecto (%)">
            <input type="number" step="0.01" className="form-control" value={cfg['billing.defaultTaxRate'] ?? 19}
              onChange={(e) => set('billing.defaultTaxRate', Number(e.target.value))} />
          </Field>
          <Field label="Días para vencimiento">
            <input type="number" className="form-control" value={cfg['billing.defaultDueDays'] ?? 30}
              onChange={(e) => set('billing.defaultDueDays', Number(e.target.value))} />
          </Field>
          <Field label="Tasa de mora mensual (%)">
            <input type="number" step="0.01" className="form-control" value={cfg['billing.moraRate'] ?? 1.5}
              onChange={(e) => set('billing.moraRate', Number(e.target.value))} />
          </Field>
        </Card>

        <Card title="Información" sub="Datos del sistema">
          <div style={{ display: 'grid', gap: 10, fontSize: 12.5 }}>
            <Info k="Versión" v="GST v6.0" />
            <Info k="Zona horaria" v="America/Bogota" />
            <Info k="Moneda" v="COP (Peso colombiano)" />
            <Info k="Locale" v="es-CO" />
          </div>
        </Card>
      </div>
    </>
  )
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-sub">{sub}</div>
        </div>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--gray-50)', borderRadius: 6 }}>
      <span style={{ color: 'var(--gray-500)' }}>{k}</span>
      <strong>{v}</strong>
    </div>
  )
}
