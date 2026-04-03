# Greenhouse Portal — Visión General del Sistema

> Versión: 2.1
> Fecha: 2026-04-02
> Audiencia: Desarrolladores, arquitectos, stakeholders técnicos
> Actualizado: Stack completo v2.1, 11 schemas, nuevas superficies (My, HR Core, Campaigns, Staff Augmentation, Cost Intelligence, Notifications, SCIM, Developers API), 55 lib modules, 324 API routes, React Email + Resend, webhook architecture

---

## Qué es Greenhouse

Greenhouse es el portal operativo multi-tenant de **Efeonce**, construido sobre Next.js 16 (App Router) con una capa visual basada en Vuexy y Material UI 7.x. No es un CMS, no es un CRM, y no busca reemplazar Notion ni HubSpot. Su rol es **exponer lectura ejecutiva, contexto operativo y gobierno de acceso** sobre las fuentes de verdad reales de la operación.

El portal sirve a cuatro audiencias principales:

1. **Clientes** — Ejecutivos y managers de cuentas cliente que necesitan visibilidad sobre el estado de sus proyectos, entregas, equipo asignado, capacidades contratadas y costos atribuidos.
2. **Equipo interno Efeonce** — Operaciones, HR, finanzas, account managers, inteligencia de costos y administradores que necesitan una vista transversal de la agencia: personas, capacidad, payroll, presupuesto, salud de cuentas e inteligencia de entregas.
3. **Personal interno** — Colaboradores que acceden a su portal personal (My): asignaciones, entregas, permisos, nómina, performance y perfil.
4. **Integraciones externas** — Sistemas como HubSpot que sincronizan datos de capabilities, contratos y contactos. Provisioning SCIM 2.0 para SSO. APIs de desarrolladores para extensiones personalizadas.

## Problema que resuelve

Antes de Greenhouse, la información operativa de Efeonce estaba dispersa entre Notion (gestión de proyectos), HubSpot (CRM), hojas de cálculo (payroll, finanzas), comunicación ad-hoc y sistemas de costo desconectados. Esto generaba:

- Falta de visibilidad ejecutiva para clientes sobre sus proyectos y costos atribuidos
- Duplicidad y fragmentación de identidades (un mismo miembro del equipo existía en 3+ sistemas con datos distintos)
- Imposibilidad de calcular capacidad del equipo, utilización y costos de delivery en tiempo real
- Procesos manuales de payroll, finanzas y notificaciones sin trazabilidad
- Sin gobierno de acceso unificado ni provisioning automatizado (SCIM)
- Dashboards de costo e inteligencia de delivery fragmentados

Greenhouse consolida estas fuentes en un modelo canónico (Person 360, Account 360) y expone superficies especializadas para cada audiencia con automatización transaccional y notificaciones.

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.1.1 |
| **Runtime** | React | 19.2.3 |
| **Lenguaje** | TypeScript | 5.9.3 |
| **Query Builder** | Kysely | 0.28.15 |
| **UI Base** | Material UI (MUI) | 7.3.6 |
| **Shell/Tema** | Vuexy | — |
| **Autenticación** | NextAuth.js | 4.24.13 |
| **Email transaccional** | React Email + Resend | 1.x / 3.x |
| **Generación PDF** | @react-pdf/renderer | 3.x |
| **Exportación Excel** | ExcelJS | 4.x |
| **Monitoreo** | Sentry (@sentry/nextjs) | 8.x |
| **Chat AI/UI** | @assistant-ui/react | 1.x |
| **DB Analítica** | Google BigQuery | 8.1.1 (SDK) |
| **DB Transaccional** | PostgreSQL (Cloud SQL) | 16.x |
| **AI/GenAI** | Google Vertex AI (@google/genai) | 1.45.0 |
| **State Management** | Redux Toolkit + React Redux | 2.11.2 / 9.2.0 |
| **Tablas** | TanStack React Table | 8.21.3 |
| **Gráficos** | ApexCharts + Recharts | 3.49.0 / 3.6.0 |
| **Forms** | React Hook Form + Valibot | 7.69.0 / 1.2.0 |
| **Testing** | Vitest | 4.1.0 |
| **Test Utils** | Testing Library + jsdom | — |
| **Deploy** | Vercel | — |
| **Package Manager** | PNPM | — |
| **CI/CD** | GitHub Actions | — |

## Dependencias clave de infraestructura

- **Google Cloud Platform (GCP)**: BigQuery como data warehouse analítico, Cloud SQL (PostgreSQL 16) como store transaccional, Cloud Storage para media (logos, avatares), Vertex AI para el agente GenAI interno, Secret Manager para credenciales de integración.
- **Vercel**: Plataforma de deploy con ambientes Production (`main`), Staging (`develop`) y Preview (branches).
- **HubSpot**: CRM externo — fuente de verdad para empresas, contactos y deals. Greenhouse sincroniza capabilities y contratos desde HubSpot vía microservicio de integración.
- **Microsoft Entra ID (Azure AD)**: Proveedor SSO para usuarios internos y clientes con cuentas Microsoft. SCIM 2.0 para provisioning automatizado.
- **Google OAuth**: Proveedor SSO adicional.
- **Notion**: Fuente de verdad para gestión de proyectos y tareas (datos leídos vía BigQuery, no API directa).
- **Resend**: Servicio de email transaccional para notificaciones, confirmaciones e invitaciones.

## Superficies del portal

Greenhouse organiza su UI en **superficies** — conjuntos cohesivos de rutas que sirven a un perfil de usuario y una necesidad operativa específica:

| Superficie | Audiencia | Propósito | Rutas |
|-----------|-----------|-----------|-------|
| **My** | Personal interno Efeonce | *(nuevo)* Portal personal: mis asignaciones, entregas, permisos, nómina, performance, perfil | `/my/*` |
| **Cliente** | Ejecutivos y managers de cuenta | Dashboard ejecutivo, proyectos, sprints, settings, capabilities, costos atribuidos | `/(dashboard)/dashboard`, `/(dashboard)/proyectos`, etc. |
| **People** | Ops internos, HR | Directorio de equipo, perfil 360, asignaciones, métricas | `/(dashboard)/people` |
| **HR Core** | HR managers | *(nuevo)* Leave management, attendance, departments, aprobaciones de permisos | `/(dashboard)/hr/leave`, `/(dashboard)/hr/attendance`, `/(dashboard)/hr/departments` |
| **HR Payroll** | HR/Finance | Períodos de nómina, compensaciones, cálculo Chile, exportación | `/(dashboard)/hr/payroll` |
| **Finance** | Finance team | Ingresos, egresos, proveedores, reconciliación, dashboard financiero, intelligence | `/(dashboard)/finance/*` |
| **Agency** | Leadership, ops | Vista transversal de salud de cuentas, capacidad, pulse | `/(dashboard)/agency/*` |
| **Organizations** | Ops internos, leadership | Account 360: organizaciones, spaces, memberships, servicios | `/(dashboard)/agency/organizations` |
| **Campaigns** | Marketing, sales, ops | *(nuevo)* Gestión de campañas, outreach, engagement tracking | `/(dashboard)/campaigns/*` |
| **Staff Augmentation** | Ops, HR, leadership | *(nuevo)* Bolsa de disponibilidad, asignaciones temporales, skill matching | `/(dashboard)/staff-augmentation/*` |
| **Cost Intelligence** | Finance, leadership, ops | *(nuevo)* Dashboards de costo por cliente/proyecto/línea de negocio, análisis de margen | `/(dashboard)/cost-intelligence/*` |
| **Notifications** | Admins, ops | *(nuevo)* Admin de notificaciones, alertas, escalaciones, templates | `/(dashboard)/admin/notifications` |
| **Admin** | Admins Efeonce | Gestión de tenants, usuarios, roles, AI tools, team | `/(dashboard)/admin/*` |
| **Internal** | Equipo Efeonce | Dashboard interno, métricas operativas | `/(dashboard)/internal/*` |
| **Capabilities** | Clientes | Módulos de capacidad contratados por tenant | `/(dashboard)/capabilities/*` |
| **SCIM** | Integradores SSO | *(nuevo)* Provisioning SCIM 2.0: users, groups | `/api/scim/v2/*` |
| **Developers API** | Desarrolladores externos | *(nuevo)* APIs de Greenhouse, documentación, webhooks | `/(blank-layout-pages)/developers/api` |
| **Integrations** | Sistemas externos | APIs para sincronización de tenants, capabilities, webhooks | `/api/integrations/v1/*` |

## Modelo de datos dual

Greenhouse opera con dos capas de datos complementarias:

1. **BigQuery (lectura analítica)**: Fuente principal para dashboards, reportes y consultas de lectura masiva. Los datos de Notion (proyectos, tareas, sprints), HubSpot (deals, contacts) y Nubox (facturas, impuestos) se consolidan aquí. Las queries viven server-side; el browser nunca consulta BigQuery directamente.

2. **PostgreSQL (escritura transaccional)**: Cloud SQL aloja el modelo canónico con identidades estables y schemas de dominio. Cada módulo transaccional (payroll, finance, HR, AI tools, notificaciones, inteligencia) opera contra PostgreSQL como store primario, con fallback a BigQuery cuando Postgres no está disponible.

Los dos stores se sincronizan mediante un patrón de **outbox events**: todas las escrituras en PostgreSQL publican eventos a `greenhouse_sync.outbox_events`, que un consumer periódico (cron cada 5 minutos) publica hacia BigQuery para consistencia eventual.

## Schemas PostgreSQL activos (11 total)

| Schema | Propósito | Tablas |
|--------|-----------|--------|
| `greenhouse_core` | Identidades canónicas: members, clients, client_users, departments, providers, organizations, spaces, person_memberships, services | 18+ |
| `greenhouse_ai` | *(nuevo)* Wallets de crédito, ledger de consumo, catálogo de tools, licencias, custom agents | 7+ |
| `greenhouse_crm` | *(nuevo)* Campañas, leads, outreach tracking, engagement, conversiones | 6+ |
| `greenhouse_delivery` | *(nuevo)* Entregas, milestones, quality metrics, bottleneck analysis, stuck assets | 8+ |
| `greenhouse_notifications` | *(nuevo)* Notificaciones, alertas, templates, preferences, delivery log | 5+ |
| `greenhouse_cost_intelligence` | *(nuevo)* Cost allocation, cost drivers, margin analysis, benchmarking | 6+ |
| `greenhouse_hr` | Leave requests, balances, policies, attendance, departments | 8+ |
| `greenhouse_payroll` | Compensaciones, períodos, liquidaciones, config de bonos, deductions, deducciones Chile | 16+ |
| `greenhouse_finance` | Cuentas, ingresos, egresos, proveedores, reconciliación, income_payments, bank_statement_rows | 14+ |
| `greenhouse_serving` | Vistas de lectura optimizadas: member_leave_360, member_payroll_360, person_360, organizations_360 | 8+ |
| `greenhouse_sync` | Outbox de eventos para sync async a BigQuery, webhooks dispatcher, retry log | 4+ |

**Total: 119+ tablas en 11 schemas activos**

## Principios de diseño

1. **Portal, no reemplazo**: Greenhouse lee de fuentes de verdad (Notion, HubSpot, Nubox, BigQuery) y expone contexto operativo. No busca ser el sistema de registro primario para gestión de proyectos ni CRM. Postgres es store primario para transacciones.

2. **Multi-tenant real**: Cada request se resuelve en un contexto de tenant (client, internal, admin). Los datos están aislados por clientId, spaceId, organizationId y los accesos gobernados por roles y route groups.

3. **Identidad canónica 360**: Una persona = un `identity_profile`. Los facets (member, user, CRM contact, delivery performer) extienden la identidad canónica vía FK, nunca la redefinen. Account 360 es el contexto de organizaciones, spaces y servicios.

4. **Postgres-first con fallback**: Los módulos transaccionales operan sobre PostgreSQL como store primario. Cuando Postgres no está disponible, los módulos caen automáticamente a BigQuery para lecturas.

5. **Composición sobre abstracción**: Los componentes de Greenhouse se componen sobre Vuexy y MUI, no crean un design system paralelo. Las vistas se construyen combinando cards, sections y layouts existentes.

6. **Lectura ejecutiva**: Las superficies cliente están diseñadas para consumo ejecutivo — KPIs, semáforos, tendencias, riesgos, costos. No son herramientas de trabajo operativo.

7. **Eventos y webhooks**: Todos los cambios significativos (payroll closed, member hired, cost anomaly detected) publican eventos vía outbox que alimentan webhooks salientes a integraciones externas y notificaciones internas.

8. **Email transaccional**: React Email + Resend para notificaciones, confirmaciones e invitaciones. Templates tipadas, no hardcoded.

9. **Automatización de provisioning**: SCIM 2.0 para sincronización bidireccional de usuarios y grupos desde Azure AD / Google Workspace.

## Operación

### Calendario operativo canónico

- Timezone: `America/Santiago` (IANA, runtime)
- Feriados: Nager.Date + overrides persistidos en `greenhouse_core.holidays`
- Ventana de cierre payroll: Semanal (viernes) + extracciones puntuales
- Ventana de cierre financiero: Mensual (últimos 3 días de mes)

### Arquitectura de eventos

- **Outbox pattern**: Todas las escrituras en Postgres publican a `greenhouse_sync.outbox_events`
- **Consumer cron**: Cada 5 minutos, dispatcher de outbox → BigQuery, webhooks, notificaciones
- **Webhooks**: Inbound (HubSpot, Notion, Nubox) + outbound (integraciones cliente)
- **Retry logic**: Exponential backoff, max 5 intentos, alertas en Slack si falla

### Observabilidad

- **Sentry** (@sentry/nextjs): Error tracking, performance monitoring, session replay
- **Logs**: Cloud Logging de GCP, indexados por trace_id
- **Métricas**: Custom metrics en BigQuery (query latency, webhook delivery, cost anomalies)
