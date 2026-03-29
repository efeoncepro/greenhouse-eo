# Handoff.md

## Uso

Este archivo es el snapshot operativo entre agentes. Debe priorizar claridad y continuidad.

## Sesión 2026-03-29 — TASK-122 documentada

### Completado
- Se creó `TASK-122` en `to-do` para institucionalizar `Cloud` como capa interna de platform governance.
- La task nace para agrupar y dar framing institucional al track `TASK-096`, `TASK-098` a `TASK-103`, sin convertirlo en un módulo client-facing nuevo.
- `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` quedaron alineados:
  - `TASK-121` ya se reconoce como ocupada por `Admin Center Hardening & Scalability`
  - `TASK-122` queda reservada para `Cloud Governance Layer Institutionalization`

### Pendiente inmediato
- decidir si `TASK-122` entra solo como umbrella documental o si en una segunda pasada deriva mini-tasks de surface para `Admin Center`

## Sesión 2026-03-29 — TASK-114 backend Nexa + cierre TASK-119/TASK-120

### Completado
- `TASK-114` quedó implementada y cerrada:
  - nuevo store server-only `src/lib/nexa/store.ts`
  - validación de readiness para `greenhouse_ai.nexa_threads`, `greenhouse_ai.nexa_messages`, `greenhouse_ai.nexa_feedback`
  - migración canónica `scripts/migrations/add-nexa-ai-tables.sql` ya aplicada con perfil `migrator`
  - endpoints:
    - `POST /api/home/nexa/feedback`
    - `GET /api/home/nexa/threads`
    - `GET /api/home/nexa/threads/[threadId]`
  - `/api/home/nexa` ahora persiste conversación, retorna `threadId` y genera `suggestions` dinámicas
- `TASK-119` cerrada:
  - verificación manual confirmada para `login -> /auth/landing -> /home`
  - fallback interno y sesiones legadas ya normalizan a `/home`
  - `Control Tower` deja de operar como home y el pattern final queda absorbido por `Admin Center`
- `TASK-120` cerrada por absorción:
  - `/internal/dashboard` redirige a `/admin`
  - el follow-on separado ya no era necesario como lane autónoma
- `TASK-115` quedó actualizada con delta para reflejar que su backend ya está disponible
- `GREENHOUSE_DATA_MODEL_MASTER_V1.md` ya reconoce `nexa_threads`, `nexa_messages` y `nexa_feedback` dentro de `greenhouse_ai`

### Validación
- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `pnpm exec tsx scripts/run-migration.ts scripts/migrations/add-nexa-ai-tables.sql --profile=migrator`
- `pnpm exec eslint src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/lib/nexa/nexa-service.test.ts src/lib/nexa/store.ts src/app/api/home/nexa/route.ts src/app/api/home/nexa/feedback/route.ts src/app/api/home/nexa/threads/route.ts src/app/api/home/nexa/threads/[threadId]/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/nexa/nexa-service.test.ts`
- verificación runtime directa de `greenhouse_ai.nexa_threads`, `greenhouse_ai.nexa_messages` y `greenhouse_ai.nexa_feedback` bajo perfil `runtime`

### TASK-121 Admin Center Hardening (5 slices cerrados)
- **Slice 1**: Sorting por todas las columnas en AdminCenterSpacesTable (TableSortLabel)
- **Slice 2**: `loading.tsx` skeleton para `/admin` (hero, KPIs, tabla 8 filas, domain cards)
- **Slice 3**: Health real en domain cards — Cloud & Integrations y Ops Health consumen `getOperationsOverview`
- **Slice 4**: Deep-link con `searchParams` — `/admin?filter=attention&q=empresa` funciona
- **Slice 5**: Bloque "Requiere atencion" con alertas consolidadas cross-dominio

### Pendiente inmediato
- `TASK-115` pasa a ser la siguiente lane natural de Nexa UI porque ya tiene backend real para feedback, suggestions y thread history
- Si se quiere endurecer `TASK-114` más adelante:
  - agregar tests específicos para `src/lib/nexa/store.ts`
  - decidir si el route principal de Nexa debe responder `404/400` en `threadId` inválido en vez de caer al handler genérico
  - agregar smoke o tests de route para ownership y feedback

## Sesión 2026-03-29 — Admin Center + Control Tower unificado

### Completado
- **Admin Center landing redesign v2**: Control Tower absorbido como sección dentro de `/admin`
  - Hero (gradiente purple→cyan) → 4 ExecutiveMiniStatCards → Torre de control (tabla MUI limpia 5 cols, sin scroll horizontal) → Mapa de dominios (outlined cards ricos con avatar, bullets, CTA)
  - Nuevo componente `AdminCenterSpacesTable.tsx`: MUI Table size='small', 5 columnas (Space, Estado, Usuarios, Proyectos, Actividad), paginación 8 filas, filter chips + search + export
  - `/internal/dashboard` redirige a `/admin` (backward compat)
  - Sidebar: removido item "Torre de control" de Gestión; UserDropdown apunta a `/admin`
- `TASK-119` movida a `in-progress`.
- Se aplicó el cutover base de landing para internos/admin:
  - fallback de `portalHomePath` ahora cae en `/home` en vez de `/internal/dashboard`
  - `Home` pasa a ser la entrada principal interna en sidebar y dropdown
  - `Control Tower` queda preservado como surface especialista dentro de `Gestión` y en sugerencias globales
- Se corrigió el drift que seguía mandando a algunos usuarios a `'/internal/dashboard'`:
  - `resolvePortalHomePath()` ahora normaliza también el valor legado en `NextAuth jwt/session`
  - si la sesión trae `'/internal/dashboard'` como home histórico para un interno/admin, el runtime lo reescribe a `'/home'` sin depender de un relogin manual
- Se mantuvieron intactos los landings especializados:
  - `hr_*` sigue cayendo en `/hr/payroll`
  - `finance_*` sigue cayendo en `/finance`
  - `collaborator` puro sigue cayendo en `/my`

### Validación
- `pnpm exec eslint src/lib/tenant/access.ts src/config/greenhouse-nomenclature.ts src/components/layout/vertical/VerticalMenu.tsx src/components/layout/shared/UserDropdown.tsx src/components/layout/shared/search/DefaultSuggestions.tsx src/app/auth/landing/page.tsx src/app/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/auth.ts src/lib/tenant/access.ts src/lib/tenant/resolve-portal-home-path.ts src/lib/tenant/resolve-portal-home-path.test.ts`
- `pnpm exec vitest run src/lib/tenant/resolve-portal-home-path.test.ts`

### Pendiente inmediato
- drift documental resuelto en la sesión posterior: `TASK-119` y `TASK-120` ya no quedan abiertas

## Sesión 2026-03-28 — Resumen

### Completado
- **TASK-104**: Payroll export email redesign (subject español, desglose por régimen, plain text profesional)
- **TASK-106**: Email delivery admin UI en Control Tower (historial + suscripciones + retry)
- **TASK-009 Slice A+B**: Fix del freeze de Home Nexa (timeouts, try/catch, error boundary)
- **TASK-009 Slice E**: NexaPanel migrado a `@assistant-ui/react` con LocalRuntime
- **TASK-009 Home Redesign**: UX prompt-first tipo Notion AI (NexaHero + NexaThread + QuickAccess + OperationStatus)
- **TASK-110**: Spec completo de Nexa assistant-ui feature adoption (29 componentes catalogados)
- **TASK-110 Lane A**: Nexa backend operativo con tool calling real a payroll, OTD, emails, capacidad y facturas; `/api/home/nexa` devuelve `toolInvocations` y Home renderiza cards mínimas inline
- **GREENHOUSE_NEXA_ARCHITECTURE_V1.md**: Doc canónico de Nexa creado
- **TASK-095**: Spec completo (Codex implementó la capa)
- **TASK-111**: Secret ref governance UI — tabla con dirección, auth, owner, scope, estado governance en `/admin/cloud-integrations`
- **TASK-112**: Integration health/freshness UI — tabla con LinearProgress, stale thresholds (6h/24h/48h) en `/admin/cloud-integrations`
- **TASK-113**: Ops audit trail UI — ActivityTimeline con actor, resultado, follow-up en `/admin/ops-health`
- **TASK-110 Lane B / Slice 1**: NexaThread con ActionBar Copy+Reload, Send/Cancel toggle, ScrollToBottom, error UI, animaciones; NexaHero con suggestions self-contained; adapter con throw errors

### Pendiente inmediato

| Prioridad | Task | Qué falta |
|-----------|------|-----------|
| 1 | TASK-110 Slice 1b | EditComposer inline, FollowupSuggestions (requiere backend), deprecar NexaPanel.tsx |
| 2 | TASK-110 Slice 4 | Nexa flotante portal-wide (AssistantModalPrimitive) |
| 5 | TASK-119 | Rollout final de `/home`, `portalHomePath`, sidebar y cutover de `Control Tower` |
| 6 | TASK-120 | Role scoping fino y verification bundle de `Admin Center` |

### Notas de staging
- `dev-greenhouse.efeoncepro.com/home` funcional (Gemini responde, Home carga)
- Chat UI ahora tiene Copy, Reload, Cancel, ScrollToBottom, error states y animaciones (Lane B / Slice 1)
- CI falla por lint debt preexistente (TASK-105), no por cambios de esta sesión
- Playwright MCP registrado en `~/.claude/settings.json`

### Prioridad operativa vigente — hardening `TASK-098` a `TASK-103`
- Orden recomendado: `TASK-100` → `TASK-101` → `TASK-098` → `TASK-099` → `TASK-102` → `TASK-103`.
- Rationale corto: primero guardrails baratos y transversales, luego cron auth, después observabilidad, middleware, resiliencia DB y finalmente costos.

### Prioridad operativa vigente — HRIS `TASK-025` a `TASK-031`
- Orden recomendado: `TASK-026` → `TASK-030` → `TASK-027` → `TASK-028` → `TASK-029` → `TASK-031` → `TASK-025`.
- Rationale corto: primero consolidar el modelo canónico de contratación que desbloquea elegibilidad y branches futuras; luego onboarding/offboarding y document vault como valor operativo inmediato; después expenses, goals y evaluaciones; `TASK-025` se mantiene al final porque sigue en `deferred`.

### Prioridad operativa vigente — Staff Aug `TASK-038` y `TASK-041`
- `TASK-038` se mantiene importante como línea comercial, pero posterior al bloque HRIS operativo y siempre implementada sobre la baseline moderna de Staff Aug, no sobre el brief original.
- `TASK-041` se trata como addendum de integración entre Staff Aug y HRIS; no compite como lane inmediata y debería entrar solo después de `TASK-026` y del baseline efectivo de Staff Aug.

### Prioridad operativa vigente — backlog global `to-do`
- Top ROI ahora: `TASK-100` → `TASK-101` → `TASK-072` → `TASK-098` → `TASK-026` → `TASK-109` → `TASK-117` → `TASK-030`.
- Siguiente ola: `TASK-027` → `TASK-028` → `TASK-116` → `TASK-067` → `TASK-068` → `TASK-070` → `TASK-011` → `TASK-096`.
- Estratégicas pero caras: `TASK-008` → `TASK-005` → `TASK-069` → `TASK-118` → `TASK-018` → `TASK-019`.
- Later / oportunistas: `TASK-029` → `TASK-031` → `TASK-015` → `TASK-016` → `TASK-020` → `TASK-115` → `TASK-107` → `TASK-099` → `TASK-102` → `TASK-103` → `TASK-021` → `TASK-032` → `TASK-053` → `TASK-054` → `TASK-055` → `TASK-058` → `TASK-059` → `TASK-071`.
- No gastar tokens ahora: `TASK-025`, `TASK-033` a `TASK-038`, `TASK-039`, `TASK-041`.

### Hallazgo de backlog
- `TASK-106` ya quedó movida formalmente a `complete`; `TASK-108` puede seguir tratándola como dependencia cerrada dentro de `Admin Center`.

### Release channels y changelog client-facing
- Se documento la policy canonica de releases en `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`.
- Greenhouse operara releases principalmente por modulo/feature visible, con canal opcional de plataforma y disponibilidad separada por `internal | pilot | selected_tenants | general`.
- El esquema de versionado quedo ajustado a modelo hibrido: `CalVer + canal` para modulos/producto visible y `SemVer` solo para APIs o contratos tecnicos versionados.
- Se creo `docs/changelog/CLIENT_CHANGELOG.md` como fuente curada para cambios client-facing; `changelog.md` raiz sigue siendo tecnico-operativo.
- La policy ya incluye una baseline inicial por modulo con version/canal/tag sugerido a `2026-03-29`; los tags reales quedaron pendientes hasta cerrar un commit limpio que represente ese snapshot.

### Nueva task documentada
- `TASK-117` creada en `to-do`: policy de Payroll para dejar el período oficial en `calculated` el último día hábil del mes operativo, reutilizando la utility de calendario y sin alterar el lifecycle base `draft -> calculated -> approved -> exported`.
- La task también deja explícito que `payroll_period.calculated` debería notificar a Julio Reyes y Humberly Henríquez vía `NotificationService`/email delivery, idealmente como consumer reactivo del dominio `notifications`.

### Cierre administrativo de tasks cercanas
- `TASK-009` quedó en `complete` como baseline principal de `Home + Nexa v2`.
- Lo pendiente de `TASK-009` se repartió así:
  - `TASK-119` para rollout final de `/home`, `portalHomePath`, sidebar y cutover de `Control Tower`
  - `TASK-110` sigue como owner de la evolución funcional y visual de Nexa
- `TASK-108` quedó en `complete` como baseline del shell de `Admin Center`.
- Lo pendiente de `TASK-108` se deriva a `TASK-120` para role scoping fino, convivencia con surfaces especialistas y verificación manual consolidada.
- Drift documental corregido en pipeline:
  - `TASK-074` ya no debe tratarse como activa
  - `TASK-110` se trata como `in-progress`
  - `TASK-111`, `TASK-112` y `TASK-113` se tratan como `complete`

### Sesión 2026-03-28 — TASK-110 Lane A
- Archivos tocados: `src/lib/nexa/nexa-tools.ts`, `src/lib/nexa/nexa-service.ts`, `src/app/api/home/nexa/route.ts`, `src/views/greenhouse/home/HomeView.tsx`, `src/views/greenhouse/home/components/NexaToolRenderers.tsx`, docs de task/handoff/changelog.
- Decisión de implementación: mantener la UI actual de `/home`, exponer `toolInvocations` desde backend y mapearlos a `tool-call` parts de assistant-ui. Lane B puede reemplazar el renderer mínimo sin rehacer contratos ni lógica.
- Ajuste adicional de esta sesión: Nexa ya soporta selección de modelo en UI con allowlist segura usando IDs reales de Vertex: `google/gemini-2.5-flash@default`, `google/gemini-2.5-pro@default`, `google/gemini-3-flash-preview@default`, `google/gemini-3-pro-preview@default` y `google/gemini-3.1-pro-preview@default`.
- Claude en Vertex quedó verificado como disponibilidad de plataforma, pero no está conectado al runtime de Nexa; requerirá provider/capa de integración separada.
- Validación ejecutada:
  - `pnpm exec eslint src/app/api/home/nexa/route.ts src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/lib/nexa/nexa-service.test.ts src/lib/nexa/nexa-tools.ts src/views/greenhouse/home/HomeView.tsx src/views/greenhouse/home/components/NexaToolRenderers.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm exec vitest run src/lib/nexa/nexa-service.test.ts`
- Validación adicional del switch:
  - `pnpm exec eslint src/config/nexa-models.ts src/config/nexa-models.test.ts src/lib/ai/google-genai.ts src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/app/api/home/nexa/route.ts src/views/greenhouse/home/HomeView.tsx src/views/greenhouse/home/components/NexaHero.tsx src/views/greenhouse/home/components/NexaThread.tsx src/views/greenhouse/home/components/NexaModelSelector.tsx`
  - `pnpm exec vitest run src/config/nexa-models.test.ts src/lib/nexa/nexa-service.test.ts`
- No se tocó `.env.staging-check`.
