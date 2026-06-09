# 04 · Greenhouse — El Producto Hoy

> Este es el archivo de referencia para trabajar dentro de Greenhouse. Describe lo que existe, el stack real, cómo se conectan los datos, y dónde está el roadmap. Para nombres de métricas, ver `06`.

## Qué es

Greenhouse es la **plataforma operativa de Efeonce Group**: reúne en un solo portal web finanzas, RRHH, nómina, delivery de proyectos, gestión de cuentas e IA, que antes vivían dispersos en hojas de cálculo y sistemas externos.

Es **multi-tenant**: cada organización cliente tiene su workspace aislado (métricas, proyectos, equipo); el equipo interno de Efeonce tiene una vista consolidada (**Agency**) que cruza todas las cuentas.

**Dos audiencias en una app:** el cliente (transparencia de su operación) y Efeonce (operación interna + gestión de cuentas). Toda feature debe ser clara sobre a cuál de las dos sirve y respetar el aislamiento entre tenants.

---

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Framework | Next.js App Router (React Server Components) |
| UI | MUI v5 + Vuexy starter-kit + tema Greenhouse custom |
| BD primaria | PostgreSQL (Cloud SQL) |
| Data warehouse | Google BigQuery (analytics + fallback de lectura) |
| Auth | NextAuth.js — Credenciales, Microsoft SSO, Google SSO |
| Charts | ApexCharts |
| Deploy | Vercel |
| Tests | Vitest + React Testing Library |

**En números:** 40+ páginas · 150–162 rutas API · 100+ componentes UI · ~1.800 archivos TypeScript · 8 módulos · 3 providers de auth · 4 cron jobs · 6 schemas PostgreSQL (`core`, `finance`, `hr`, `payroll`, `sync`, `serving`).

**Cron jobs (4):** ICO Engine · Nubox sync · Outbox (event publishing a BigQuery) · Sync general. Corren ~03:00–03:30.

---

## Módulos (8)

Cada módulo es accesible por ruta y controlado por **capability flags por tenant** (un tenant puede tener módulos habilitados/deshabilitados).

### 1. Dashboard del Cliente
Resumen ejecutivo en tiempo real. KPIs: **RpA**, tareas completadas (30d), **OTD%**, presión de feedback. Visualizaciones: donut de estados de activos, cadencia semanal (12 sem), RpA por proyecto, tendencia OTD mensual, heatmap de capacidad del equipo, wallet de créditos AI, proyectos que requieren atención, salud del portafolio.

### 2. Proyectos y Sprints
Portfolio con tarjetas (estado, progreso, RpA promedio). Detalle: timeline, equipo, roadmap de sprints, historial, KPIs de calidad. Sprints con burndown, velocidad, RpA y OTD. CRUD de tareas.

### 3. Finanzas
El módulo más profundo. Dashboard financiero (flujo de caja, P&L, aging AR, ingresos por línea). Facturación con **emisión DTE (Chile) y consulta de estado ante el SII**. Gastos (con candidatos a nómina). Proveedores. **Reconciliación bancaria con auto-match (AI)** que sugiere pares transacción↔factura/gasto con score de confianza. **Inteligencia Financiera** (revenue/costo/margen por cliente, allocations) → alimenta Revenue Enabled. Clientes financieros con sync desde Nubox. Cuentas + tipos de cambio multi-moneda.

### 4. RRHH y Nómina
Asistencia (con webhook de Microsoft Teams). Licencias/permisos (workflow de aprobación). Departamentos (árbol org). **Nómina con cálculo Chile** (4 tabs: período actual, compensaciones, historial, gasto de personal). Detalle por colaborador con liquidación PDF. **Integración con ICO Engine: los KPIs de OTD% y RpA por persona alimentan los bonos variables; los snapshots se congelan en cada entry de payroll para auditoría.**

### 5. People (Directorio + Perfil 360°)
Perfil 360° con tabs: Identidad (SSO links), HR, Finanzas, Delivery, **ICO** (OTD%, RpA score, tendencias, comparación vs equipo), Memberships.

### 6. Agency (interno Efeonce)
**Pulse Dashboard** (KPIs globales + salud por cliente → detección de cross-sell y riesgo). **Account 360** (organizaciones con sync HubSpot bidireccional). Servicios (catálogo con SLA/KPI). **Spaces** (contenedores de trabajo por cliente; integran Notion, Frame.io). Capacidad (utilización, forecast, alertas de sobre-asignación).

### 7. Administración
Tenants (capability flags, logo por tenant, **View-As** para testear como tenant). Usuarios (invitación, SSO, roles). **RBAC**. Team (roster interno). **AI Tools** (catálogo, licencias por tenant, wallets de créditos, consumo). Reconciliación de identidad (merge de duplicados con score).

### 8. ICO Engine (motor de delivery)
Materializa métricas de calidad/eficiencia desde datos de Notion. Corre como cron de materialización que procesa Notion, conforma datos y calcula métricas por proyecto, por persona y a nivel agencia. **Alimenta:** dashboard del cliente + Person 360 + bonos de nómina. Métricas materializadas hoy: RpA, OTD%, FTR, Cycle Time, Stuck Assets (ver `06`).

> El sistema ICO completo es más amplio que lo que el Engine materializa hoy: 4 dimensiones (Production, Concept, Outcome, Anticipation) con un **modelo de pesos por rol** que es la base del cálculo de bonos en payroll, y un set extendido de siglas (incl. SEO/AEO: OTL, ACR, MOR, OPC…). Si tocas scoring de bonos o el tab ICO de Person 360, lee `06` sección D antes. Las **cláusulas de excepción** (force majeure algorítmico, tracking degradado, bloqueo del cliente) congelan/redistribuyen métricas y deben respetarse en el cálculo.

---

## Integraciones (7)

| Sistema | Tipo | Uso |
|---|---|---|
| **Nubox** | Contabilidad (Chile) | Sync bidireccional de clientes, facturas, gastos, movimientos bancarios. Emisión DTE. Cron diario. |
| **Notion** | Gestión de proyectos | Source de tareas, activos, sprints. Pipeline de conformación que alimenta ICO Engine. |
| **HubSpot** | CRM | Sync de organizaciones/companies, contact provisioning, enlace por cuenta (Account 360). Portal `48713323`. |
| **Microsoft 365** | SSO + Teams | Azure AD. Webhook de asistencia desde Teams. |
| **Google Workspace** | SSO | OAuth, identity linking. |
| **BigQuery** | Data warehouse | Analytics, fallback de lectura, event publishing vía outbox. |
| **Frame.io** | Revisión creativa | Review embebido en el ecosistema de spaces. |

---

## Capa de IA: Nexa

Greenhouse incorpora **Nexa** como capa de inteligencia del producto:
- **Nexa Insights** — análisis proactivo de métricas (detecta anomalías/oportunidades sin que el usuario pregunte).
- **Nexa Chat** — conversación reactiva sobre los datos del portal.

> Nota de naming: **Nexa ≠ "Nexus".** "Nexus" es una sub-marca **deprecada** que no se debe referenciar. Nexa es la capa AI de Greenhouse.

---

## Roadmap ASaaS de Greenhouse

| Fase | Estado |
|---|---|
| **Herramienta interna** | ✅ Completada (operación interna completa). |
| **Plataforma de cliente** | Q2 2026 — exponer el portal a clientes. **Primer login activo** (= KPI GTM 0%→100%). |
| **Inteligencia** | Q4 2026 — exponer inteligencia financiera + AI Tools (Nexa) al cliente. |
| **Producto standalone** | 2027 — tier pricing + API abierta + white-label. |

---

## Gaps declarados (= dónde aportar)

1. **Self-service del cliente** — aprobar, solicitar y mandar briefs desde el portal. **Gap principal.** Hoy esa interacción vive fuera de Greenhouse.
2. **Test coverage 3.3%** en módulos críticos. Deuda técnica que frena iteración.
3. **Reactividad cross-module** — expandir el sistema de eventos (outbox) para que los módulos reaccionen entre sí sin depender de cron.
4. **ICO Engine ↔ Person 360** — integración profunda de métricas por persona.
5. **Sinergias cross-module y corrección de cálculos financieros** — backlog activo.

---

## Principios de diseño de producto (derivados de la estrategia)

- **Construye memoria, no pantallas.** Si una feature no deja historial acumulable, no genera switching cost (ver `00`).
- **Expón la operación, no la escondas.** Transparencia radical es la promesa de marca. Self-service > "te mando el reporte".
- **Conecta a Revenue Enabled.** Toda métrica debería poder rastrearse hacia pipeline/revenue, no quedarse en actividad.
- **Respeta el multi-tenant.** Aislamiento por `space_id`, capability flags por tenant, nunca asumas un solo cliente.
- **Datos compartidos por BigQuery + REST.** No acoples Greenhouse al runtime de Kortex/Verk; consume sus datos (ver `03`).
- **El cliente que decide es el CEO (BP3).** El portal tiene que verse como un sistema serio y vivo, no como un MVP.

---

*Fuente: Greenhouse — Capacidades del Producto + Análisis Técnico + Product Ecosystem v1.0. Recordatorio: el producto se llama **Greenhouse**, nunca "Greenhouse EO".*
