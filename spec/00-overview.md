# Greenhouse Portal — Visión General del Sistema

> Versión: 2.0
> Fecha: 2026-03-22
> Audiencia: Desarrolladores, arquitectos, stakeholders técnicos
> Actualizado: Nuevas superficies (Organizations, ICO Engine, Services), Nubox integration, Identity Reconciliation

---

## Qué es Greenhouse

Greenhouse es el portal operativo multi-tenant de **Efeonce**, construido sobre Next.js (App Router) con una capa visual basada en Vuexy y Material UI. No es un CMS, no es un CRM, y no busca reemplazar Notion ni HubSpot. Su rol es **exponer lectura ejecutiva, contexto operativo y gobierno de acceso** sobre las fuentes de verdad reales de la operación.

El portal sirve a tres audiencias principales:

1. **Clientes** — Ejecutivos y managers de cuentas cliente que necesitan visibilidad sobre el estado de sus proyectos, entregas, equipo asignado y capacidades contratadas.
2. **Equipo interno Efeonce** — Operaciones, HR, finanzas, account managers y administradores que necesitan una vista transversal de la agencia: personas, capacidad, payroll, presupuesto, y salud de cuentas.
3. **Integraciones externas** — Sistemas como HubSpot que sincronizan datos de capabilities, contratos y contactos hacia y desde Greenhouse.

## Problema que resuelve

Antes de Greenhouse, la información operativa de Efeonce estaba dispersa entre Notion (gestión de proyectos), HubSpot (CRM), hojas de cálculo (payroll, finanzas) y comunicación ad-hoc. Esto generaba:

- Falta de visibilidad ejecutiva para clientes sobre sus proyectos
- Duplicidad y fragmentación de identidades (un mismo miembro del equipo existía en 3+ sistemas con datos distintos)
- Imposibilidad de calcular capacidad del equipo o utilización en tiempo real
- Procesos manuales de payroll sin trazabilidad
- Sin gobierno de acceso unificado

Greenhouse consolida estas fuentes en un modelo canónico (Person 360) y expone superficies especializadas para cada audiencia.

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.1 |
| Runtime | React | 19.2.3 |
| Lenguaje | TypeScript | 5.9.3 |
| UI Base | Material UI (MUI) | 7.3.6 |
| Shell/Tema | Vuexy | — |
| Autenticación | NextAuth.js | 4.24.13 |
| DB Analítica | Google BigQuery | 8.1.1 (SDK) |
| DB Transaccional | PostgreSQL (Cloud SQL) | 8.20.0 (pg) |
| AI/GenAI | Google Vertex AI (@google/genai) | 1.45.0 |
| State Management | Redux Toolkit + React Redux | 2.11.2 / 9.2.0 |
| Tablas | TanStack React Table | 8.21.3 |
| Gráficos | ApexCharts + Recharts | 3.49.0 / 3.6.0 |
| Forms | React Hook Form + Valibot | 7.69.0 / 1.2.0 |
| Deploy | Vercel | — |
| Package Manager | PNPM | — |
| CI/CD | GitHub Actions | — |

## Dependencias clave de infraestructura

- **Google Cloud Platform (GCP)**: BigQuery como data warehouse analítico, Cloud SQL (PostgreSQL) como store transaccional, Cloud Storage para media (logos, avatares), Vertex AI para el agente GenAI interno.
- **Vercel**: Plataforma de deploy con ambientes Production (`main`), Staging (`develop`) y Preview (branches).
- **HubSpot**: CRM externo — fuente de verdad para empresas, contactos y deals. Greenhouse sincroniza capabilities y contratos desde HubSpot vía un microservicio de integración.
- **Microsoft Entra ID (Azure AD)**: Proveedor SSO para usuarios internos y clientes con cuentas Microsoft.
- **Google OAuth**: Proveedor SSO adicional.
- **Notion**: Fuente de verdad para gestión de proyectos y tareas (datos leídos vía BigQuery, no API directa).

## Superficies del portal

Greenhouse organiza su UI en **superficies** — conjuntos cohesivos de rutas que sirven a un perfil de usuario y una necesidad operativa específica:

| Superficie | Audiencia | Propósito |
|-----------|-----------|-----------|
| **Cliente** | Ejecutivos y managers de cuenta | Dashboard ejecutivo, proyectos, sprints, settings, capabilities |
| **People** | Ops internos, HR | Directorio de equipo, perfil 360, asignaciones, métricas |
| **HR Core** | HR managers | Leave management, attendance, departments |
| **HR Payroll** | HR/Finance | Períodos de nómina, compensaciones, cálculo Chile, exportación |
| **Finance** | Finance team | Ingresos, egresos, proveedores, reconciliación, dashboard financiero, intelligence |
| **Agency** | Leadership, ops | Vista transversal de salud de cuentas, capacidad, pulse |
| **Organizations** | Ops internos, leadership | *(nuevo)* Account 360: organizaciones, spaces, memberships, servicios |
| **ICO Engine** | Agency, ops | *(nuevo)* Delivery intelligence: métricas materializadas, stuck assets, trends |
| **Admin** | Admins Efeonce | Gestión de tenants, usuarios, roles, AI tools, team |
| **Internal** | Equipo Efeonce | Dashboard interno, métricas operativas |
| **Capabilities** | Clientes | Módulos de capacidad contratados por tenant |
| **Integrations** | Sistemas externos | APIs para sincronización de tenants y capabilities |
| **Nubox** | Finance team | *(nuevo)* Sync de documentos tributarios chilenos (3-phase pipeline) |

## Modelo de datos dual

Greenhouse opera con dos capas de datos complementarias:

1. **BigQuery (lectura analítica)**: Fuente principal para dashboards, reportes y consultas de lectura masiva. Los datos de Notion (proyectos, tareas, sprints) y HubSpot (deals, contacts) se consolidan aquí. Las queries viven server-side; el browser nunca consulta BigQuery directamente.

2. **PostgreSQL (escritura transaccional)**: Cloud SQL aloja el modelo canónico con identidades estables y schemas de dominio. Cada módulo transaccional (payroll, finance, HR, AI tools) opera contra PostgreSQL como store primario, con fallback a BigQuery cuando Postgres no está disponible.

Los dos stores se sincronizan mediante un patrón de **outbox events**: todas las escrituras en PostgreSQL publican eventos a `greenhouse_sync.outbox_events`, que un consumer periódico (cron cada 5 minutos) publica hacia BigQuery para consistencia eventual.

## Schemas PostgreSQL activos

| Schema | Propósito |
|--------|-----------|
| `greenhouse_core` | Identidades canónicas: members, clients, client_users, departments, providers, **organizations, spaces, person_memberships, services** |
| `greenhouse_hr` | Leave requests, balances, policies |
| `greenhouse_payroll` | Compensaciones, períodos, liquidaciones, config de bonos |
| `greenhouse_finance` | Cuentas, ingresos, egresos, proveedores, reconciliación, **income_payments, bank_statement_rows** |
| `greenhouse_serving` | Vistas de lectura optimizadas (member_leave_360, member_payroll_360, **person_360**) |
| `greenhouse_sync` | Outbox de eventos para sync async a BigQuery |

## Principios de diseño

1. **Portal, no reemplazo**: Greenhouse lee de fuentes de verdad (Notion, HubSpot, BigQuery) y expone contexto operativo. No busca ser el sistema de registro primario para gestión de proyectos ni CRM.

2. **Multi-tenant real**: Cada request se resuelve en un contexto de tenant (client, internal, admin). Los datos están aislados por clientId y los accesos gobernados por roles y route groups.

3. **Identidad canónica**: Una persona = un `identity_profile`. Los facets (member, user, CRM contact) extienden la identidad canónica vía FK, nunca la redefinen. Esto es el modelo Person 360.

4. **Postgres-first con fallback**: Los módulos transaccionales migran progresivamente de BigQuery a PostgreSQL. Cuando Postgres no está disponible, los módulos caen automáticamente a BigQuery.

5. **Composición sobre abstracción**: Los componentes de Greenhouse se componen sobre Vuexy y MUI, no crean un design system paralelo. Las vistas se construyen combinando cards, sections y layouts existentes.

6. **Lectura ejecutiva**: Las superficies cliente están diseñadas para consumo ejecutivo — KPIs, semáforos, tendencias, riesgos. No son herramientas de trabajo operativo.
