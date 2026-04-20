# PROYECTO: GST S.A.S — Sistema de Cartera & Facturación Electrónica

## CONTEXTO BASE
El desarrollo se basa en el HTML proporcionado, el cual contiene:
- UI completa (login, dashboard, módulos, ayuda)
- Componentes visuales (KPIs, tablas, modales, charts)
- Flujo funcional frontend ya definido
- Estructura modular (Dashboard, Edificios, Facturas, Pagos, etc.)

El objetivo es llevar este HTML a una arquitectura escalable usando Cloud Code.

---

## REGLAS DE INTERACCIÓN (OBLIGATORIAS)

1. NO saludar.
2. NO hacer resúmenes antes de iniciar una fase.
3. SIEMPRE ejecutar directamente la fase solicitada.
4. SOLO hacer resumen al finalizar la fase.
5. Al finalizar cada fase:
   - Mostrar resumen claro
   - Mostrar checklist de avance
   - Indicar lo pendiente

---

## ARQUITECTURA OBJETIVO

### Frontend
- Basado en el HTML suministrado
- Separación por componentes
- Manejo de estado (store)

### Backend (Cloud Code)
- API REST o funciones serverless
- Manejo de autenticación
- Lógica de negocio:
  - Facturación electrónica
  - Cartera
  - Pagos
  - Reportes

### Base de Datos
- Usuarios
- Edificios
- Facturas
- Pagos
- Logs / Auditoría

---

## FASES DEL DESARROLLO

---

### FASE 1 — ANÁLISIS Y DESCOMPOSICIÓN DEL HTML

#### Objetivo
Convertir el HTML en módulos funcionales.

#### Tareas
- Identificar módulos principales
- Separar vistas
- Detectar componentes reutilizables
- Mapear eventos JS actuales
- Identificar datos simulados vs reales

#### Entregables
- Mapa de módulos
- Lista de componentes
- Flujo de navegación

---

### FASE 2 — DISEÑO DE ARQUITECTURA

#### Objetivo
Definir cómo se estructura el sistema en cloud.

#### Tareas
- Definir estructura de carpetas
- Definir endpoints API
- Definir modelos de datos
- Definir autenticación

---

### FASE 3 — SETUP CLOUD CODE

#### Objetivo
Preparar entorno backend.

#### Tareas
- Inicializar proyecto
- Configurar base de datos
- Crear endpoints base
- Configurar auth

---

### FASE 4 — MIGRACIÓN FRONTEND

#### Objetivo
Convertir HTML en frontend funcional.

#### Tareas
- Separar componentes
- Integrar con backend
- Manejar estado

---

### FASE 5 — LÓGICA DE NEGOCIO

#### Objetivo
Implementar reglas reales del sistema.

#### Tareas
- Facturación electrónica
- Cálculo de cartera
- Gestión de pagos
- Automatizaciones

---

### FASE 6 — TESTING Y AJUSTES

#### Objetivo
Validar sistema completo.

#### Tareas
- Pruebas funcionales
- Pruebas de flujo
- Corrección de errores

---

## FORMATO DE EJECUCIÓN DE FASES

Cada fase debe seguir este formato:

### Ejecución
- Desarrollo directo sin introducción

### Cierre de fase (OBLIGATORIO)
- Resumen
- Checklist:
  - [x] Completado
  - [ ] Pendiente

---

## CHECKLIST GLOBAL DEL PROYECTO

- [ ] Fase 1 — Análisis HTML
- [ ] Fase 2 — Arquitectura
- [ ] Fase 3 — Backend Cloud
- [ ] Fase 4 — Frontend
- [ ] Fase 5 — Lógica negocio
- [ ] Fase 6 — Testing

---

## NOTAS IMPORTANTES

- No modificar diseño original sin justificación
- Mantener consistencia visual
- Priorizar escalabilidad
- Evitar lógica en frontend que deba ir en backend