# TASK-108 - Admin Center Governance Shell

## Delta 2026-03-28

- `/admin` ya funciona como landing real de `Admin Center`.
- La navegación administrativa ya expone `Admin Center`, `Cloud & Integrations` y `Ops Health` como surfaces propias dentro de `/admin`.
- `Cloud & Integrations` y `Ops Health` reutilizan señal operacional real desde el runtime existente; no reemplazan `Agency > Operations`, pero sí dejan de depender solo de un deep link compartido.
- El shell ya expone acciones operativas manuales para replay reactivo, dispatch webhook, retry de failed emails y services sync usando helpers/admin routes canónicos.
- La explicación estructural de asistencia (`attendance_daily + leave_requests` y target `Microsoft Teams`) se movió a `Cloud & Integrations`; Payroll conserva solo las alertas funcionales que impactan el cálculo.

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Implementación`
- Rank: `TBD`
- Domain: `platform`

## Summary

Crear `Admin Center` como landing central de gobernanza del portal Greenhouse. La actual sección `Administración` deja de ser solo un redirect a tenants y pasa a organizar, con taxonomía clara, las superficies de identidad, acceso, delivery, AI governance, cloud/integrations observability y future ops surfaces sin romper las rutas existentes.

## Why This Task Exists

Hoy existen varias vistas admin ya materializadas, pero viven como páginas aisladas o agrupadas por herencia histórica:

- `Spaces`
- `Equipo`
- `Usuarios`
- `Roles y permisos`
- `Herramientas IA`
- `Correos`
- `Integrations` y observabilidad de sync/webhooks, hoy repartidas entre backend y surfaces sueltas

Eso funciona, pero ya no expresa bien el modelo operativo real. Greenhouse necesita un centro de gobernanza institucional que separe:

- surfaces de gobernanza
- surfaces operativas de uso
- surfaces futuras para métricas, economía y capacity
- surfaces de cloud e integraciones
- surfaces de llaves/API keys y secretos referenciados

Además, `Herramientas IA` tiene una doble vida:

- como superficie de administración para `ai_tooling_admin` y `efeonce_admin`
- como surface operativa propia para usuarios con acceso al dominio `ai_tooling`

Esta task formaliza esa separación sin eliminar ni romper rutas existentes.

El objetivo no es construir un mega-dashboard. El objetivo es tener un control plane escalable:

- cada dominio es una sección
- cada sección habla el mismo lenguaje de salud, estado, acciones y auditoría
- cada nueva capa futura puede enchufarse sin rediseñar toda la navegación

## Goal

- Reemplazar el redirect actual de `/admin` por un `Admin Center` landing real.
- Reagrupar la navegación admin por dominios de gobernanza.
- Mantener compatibilidad con las rutas actuales de administración y AI tools.
- Dejar explícito qué se absorbe en el centro y qué sigue como surface operativa separada.
- Definir una capa para `Cloud` e integraciones que agrupe health, queues, webhooks y syncs.
- Definir una entrada futura para llaves API y secretos por referencia, sin exponer valores crudos.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

Reglas obligatorias:

- `Admin Center` debe ser una capa de gobernanza, no un mega-dashboard de producto.
- `AI Tools` debe conservar su route group y acceso operativo propio para `ai_tooling_admin`.
- El centro debe modelar `control plane`, no solo páginas: health, state, actions y audit deben repetirse en cada superficie.
- Las rutas existentes no se rompen: primero se centraliza la entrada, luego se decide si hay aliases o redirects.
- Los secretos no se muestran en claro; cualquier gestión de llaves o API keys debe usar `secret_ref` o un equivalente.

## Dependencies & Impact

### Depends on

- `TASK-106` - Email Delivery Admin UI
- `TASK-095` - Centralized Email Delivery Layer
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

### Impacts to

- Navegación principal del portal
- `/admin` landing actual
- Jerarquía de `Administración`
- Posible taxonomía futura para métricas operacionales, economía y FTE/capacity
- Observabilidad de `greenhouse_sync` y sus colas/proyecciones
- Eventual espacio para integrar Cloud, webhooks e integración tracking
- Eventual espacio para acceso gobernado a API keys / secret refs

### Files owned

- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/admin/layout.tsx`
- `src/app/(dashboard)/admin/ai-tools/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `src/views/greenhouse/admin/**`
- `src/views/greenhouse/admin/integrations/**`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

## Current Repo State

### Ya existe

- El route group `admin` ya está protegido por layout-level guard.
- La página `/admin` actualmente redirige a `/admin/tenants`.
- Ya existen surfaces concretas bajo `admin`:
  - tenants
  - users
  - roles
  - team
  - email delivery
  - ai tools
- Ya existe observabilidad parcial de operaciones e integraciones en `src/app/api/agency/operations/route.ts`.
- Ya existe infraestructura de eventos, outbox, proyecciones reactivas y webhooks en `src/lib/sync/*` y `src/lib/webhooks/*`.
- El menú lateral ya diferencia `Administración` y `Herramientas IA`.
- `ai_tooling_admin` existe como rol explícito para gobernanza de AI tooling.

### Gap actual

- No existe una landing institucional de `Admin Center`.
- La taxonomía actual mezcla entrypoint, entidades y gobernanza operativa sin una capa central explícita.
- `AI Tools` no está expresado claramente como dominio dual:
  - governance admin
  - surface operativa de consumo
- No hay mapa de migración documentado para decidir qué se queda, qué se agrupa y qué se redirige.
- No existe una surface de monitoreo unificada para:
  - eventos reactivos
  - projection queues
  - webhook deliveries
  - sync health
  - integration auth/secret refs
- No existe una estrategia UI para exponer futuras API keys sin poner secretos en claro.

## Scope

### Slice 1 - Admin Center landing

- Crear una landing `/admin` con resumen ejecutivo de governance.
- Mostrar tarjetas o bloques para:
  - Spaces
  - Identity & Access
  - AI Governance
  - Delivery
  - Cloud & Integrations
  - Ops Health
- Mantener acceso inmediato a las sub-vistas ya existentes.

### Slice 2 - Governance taxonomy

- Reordenar la navegación para que `Equipo`, `Usuarios` y `Roles y permisos` vivan bajo una familia común de access governance.
- Mantener `Correos` como delivery governance.
- Mantener `Herramientas IA` como governance slice sin borrar su surface operativa propia.
- Definir una sección `Cloud & Integrations` para health de sync, outbox, projections, webhooks y jobs.

### Slice 3 - Compatibility and cutover

- Conservar rutas existentes y decidir aliases/redirects solo si ayudan al cutover.
- Documentar claramente qué superficies son admin governance y cuáles son operational product views.
- Dejar preparada la base para futuras secciones de operations, economics y FTE/capacity.

### Slice 4 - Secret and API key readiness

- Definir un patrón de UI para llaves API y credenciales gobernadas por `secret_ref`.
- Mostrar estado, owner, ámbito y fecha de rotación sin revelar valores.
- Dejar preparada la navegación para un futuro panel de credenciales.

### Slice 5 - Integrations observability

- Incorporar una vista o card de observabilidad para:
  - outbox
  - reactive projections
  - webhook deliveries
  - external sync jobs
  - integration auth health
- Reusar el lenguaje de salud: `ok`, `warning`, `failed`, `stale`.
- Usar esta base como espina dorsal para futuras integraciones nuevas sin duplicar UI.

## Admin Center Control Plane

`Admin Center` debe controlar surfaces de gobernanza y observabilidad del portal. El criterio es simple:

- si una vista administra alcance, acceso, delivery, estado, retries, syncs o contratos operativos, pertenece aquí
- si una vista existe principalmente para ejecutar trabajo de negocio o consumo diario, no pertenece aquí aunque tenga permisos altos

Dominios iniciales del control plane:

- `Spaces`
  - tenants, spaces, capability enablement, provisioning context
- `Identity & Access`
  - users, team, roles, scopes visibles, reconciliación de identidad
- `Delivery`
  - email delivery, subscriptions, retries, event-origin tracing
- `AI Governance`
  - catálogo, licencias, wallets, créditos, ledger administrativo
- `Cloud & Integrations`
  - sync health, webhooks, integration auth, secret refs, job status
- `Ops Health`
  - outbox, projection queue, stale refreshes, failed handlers
- `Future domains`
  - economics
  - capacity / FTE
  - operational metrics

## Incoming And Outgoing Signals

El centro no crea una segunda capa de eventos. Debe leer y operar sobre la infraestructura ya existente.

### Incoming signals

- `greenhouse_sync.outbox_events`
- `greenhouse_sync.projection_refresh_queue`
- `greenhouse_sync.outbox_reactive_log`
- `greenhouse_sync.webhook_inbox_events`
- `greenhouse_sync.webhook_deliveries`
- health endpoints y tablas de sync runtime

### Outgoing operational actions

- retry manual de email delivery fallido
- replay o refresh dirigido de proyecciones
- pause/resume de subscriptions o endpoints
- invalidación o re-disparo de syncs
- navegación profunda hacia surfaces especialistas existentes

Regla:

- `Admin Center` observa y dispara acciones operativas
- la mutación de dominio sigue viviendo en su módulo o helper canónico

## Reactive Events And Projections

La sección `Cloud & Integrations` debe poder exponer al menos el mapa inicial de eventos reactivos y consumers relevantes para gobernanza.

Eventos de entrada prioritarios:

- `payroll_period.exported`
- `payroll_entry.upserted`
- `compensation_version.created`
- `compensation_version.updated`
- `finance.economic_indicator.upserted`
- `finance.exchange_rate.upserted`
- `ico.materialization.completed`
- `identity.reconciliation.approved`
- `identity.profile.linked`
- `service.created`
- `member.*`
- `assignment.*`
- `ai.wallet.*`
- `ai.credits.*`

Proyecciones y consumers a monitorear:

- `notification_dispatch`
- `organization_360`
- `client_economics`
- `member_capacity_economics`
- `person_intelligence`
- `projected_payroll`
- `payroll_receipts_delivery`
- `payroll_export_ready_notification`

La UI no necesita mostrar un grafo exhaustivo en el MVP, pero sí debe poder responder:

- qué evento gatilló una actualización
- qué proyección quedó pending, completed o failed
- qué handler está degradado o stale
- qué acciones de retry/replay están disponibles

## UI Surfaces To Incorporate

### Capa sin UI propia hoy

Estas capas deben encontrar hogar en `Admin Center` aunque inicialmente entren como cards o vistas simples:

- `Ops Health`
  - outbox throughput
  - projection queue health
  - failed reactive handlers
  - stale serving refreshes
- `Cloud & Integrations`
  - inbound webhook health
  - outbound webhook delivery health
  - external sync health
  - integration auth status
- `Secrets / API Keys Readiness`
  - secret refs registrados
  - owner y scope
  - rotation metadata
  - enabled / paused / missing
- `Economics readiness`
  - freshness de indicadores económicos
  - última corrida / última fecha efectiva
- `Capacity / FTE readiness`
  - freshness del snapshot canónico
  - señales de desalineación entre serving y source

### Capa con UI existente que debe sumarse

- `Spaces`
- `Equipo`
- `Usuarios`
- `Roles y permisos`
- `Herramientas IA`
- `Correos`

Regla de absorción:

- si ya tiene UI, `Admin Center` la indexa, agrupa y contextualiza
- si no tiene UI, `Admin Center` le da primero una surface operacional mínima

## Cloud And Integrations

La sección `Cloud & Integrations` no debe intentar reemplazar GCP ni Vercel consoles. Su trabajo es mostrar el estado Greenhouse-relevante de la operación.

Debe cubrir:

- sync jobs críticos
- crons críticos
- webhook endpoints
- webhook subscriptions
- integration auth mode
- secret refs faltantes o inválidos
- servicios externos con dependencia activa

Primeras categorías sugeridas:

- `Syncs`
  - Notion
  - HubSpot
  - Nubox
  - Teams attendance
- `Webhooks`
  - inbound endpoints
  - outbound subscriptions
  - delivery failures
- `Jobs`
  - outbox publish
  - outbox react
  - cron retry workers
- `Secrets`
  - refs usadas por integraciones
  - estado de disponibilidad

No debe incluir:

- edición cruda de secretos
- dumps de logs extensos
- configuración cloud vendor-specific que no impacte el runtime del portal

## API Keys And Secret Access

En futuro cercano es razonable incorporar acceso gobernado a credenciales, pero el contrato debe ser seguro desde el diseño.

Principios:

- jamás mostrar secretos en claro en la UI
- persistir y exponer solo `secret_ref`, `owner`, `scope`, `rotation_status`, `last_verified_at`
- permitir acciones como:
  - verificar presencia
  - marcar rotación requerida
  - pausar consumo de una integración
  - validar formato o reachability
- cualquier creación o reemplazo de secreto debe pasar por un flujo controlado, no por edición libre en tabla

Superficies futuras:

- llaves de integraciones inbound
- bearer tokens outbound
- refs de Resend, HubSpot, Nubox, Teams y futuros providers

## Scalability Model

`Admin Center` debe escalar por dominios y por patrón visual, no por páginas sueltas.

Cada dominio debe poder ofrecer las mismas cinco vistas conceptuales:

- `Overview`
- `State`
- `Actions`
- `Audit`
- `Config`

Reglas de escalabilidad:

- toda nueva surface entra bajo un dominio existente o crea uno nuevo con owner explícito
- toda nueva surface debe declarar si es `governance`, `operational control`, o `specialist product view`
- toda acción de retry, replay o pause debe reutilizar helpers canónicos, no lógica inline de la página
- toda health card debe mapear a una fuente verificable: tabla, queue, endpoint o cron
- `Admin Center` no reemplaza módulos especialistas; los coordina y los hace observables

## Proposed Navigation Model

Nombre visible:

- `Admin Center`

Secciones iniciales:

- `Spaces`
- `Identity & Access`
- `Delivery`
- `AI Governance`
- `Cloud & Integrations`
- `Ops Health`

Secciones de expansión natural:

- `Economics`
- `Capacity & FTE`
- `Operational Metrics`

Decisión para `AI Tools`:

- `AI Governance` vive dentro de `Admin Center`
- la surface operativa de `AI Tools` puede seguir existiendo como dominio propio cuando el usuario no entra por governance

## Open Questions

- Si `Cloud & Integrations` vive enteramente bajo `/admin/cloud` o si parte de su contenido reaprovecha `/internal` como surface operativa.
- Si `Ops Health` merece sección propia o si es una sub-vista de `Cloud & Integrations`.
- Qué rol exacto verá `Cloud & Integrations`: solo `efeonce_admin` o también operadores específicos.

## Out of Scope

- Implementar las futuras vistas de métricas operacionales.
- Implementar las futuras vistas de indicadores económicos.
- Implementar las futuras vistas de FTE/capacity conversion.
- Reescribir los módulos de tenants, users, roles o AI tools desde cero.
- Mezclar el Admin Center con dashboards de producto para clientes.

## Acceptance Criteria

- [ ] `/admin` deja de ser un redirect ciego y muestra una landing de `Admin Center`.
- [ ] La navegación admin expresa una taxonomía clara de gobernanza.
- [ ] `AI Tools` queda documentado como dominio dual sin romper su acceso operativo actual.
- [ ] Las rutas existentes de admin siguen funcionando.
- [ ] La task deja documentado qué se mueve, qué se agrupa y qué se conserva.
- [ ] Existe una categoría explícita para `Cloud & Integrations` dentro del centro.
- [ ] Existe una estrategia documentada para monitorear eventos reactivos, proyecciones y webhooks.
- [ ] Existe una estrategia documentada para llaves API / credenciales sin exponer secretos.

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- Verificación manual en preview de:
  - `/admin`
  - `/admin/tenants`
  - `/admin/users`
  - `/admin/roles`
  - `/admin/team`
  - `/admin/ai-tools`
  - `/admin/email-delivery`
