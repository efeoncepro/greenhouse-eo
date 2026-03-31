# Handoff.md

## Uso

Este archivo es el snapshot operativo entre agentes. Debe priorizar claridad y continuidad.

## Sesión 2026-03-31 — TASK-173 foundation compartida de adjuntos + buckets GCP

### Objetivo

- Formalizar una lane propia para adjuntos/archivos compartidos del portal después de detectar que `leave` sigue con `attachmentUrl` manual y que `Document Vault`/`Expense Reports` estaban intentando resolver storage desde una óptica HR-first.

### Estado actual

- `TASK-173` quedó movida a `in-progress`.
- El repo ya quedó implementado para la foundation shared:
  - registry `greenhouse_core.assets`
  - access log `greenhouse_core.asset_access_log`
  - helper `src/lib/storage/greenhouse-assets.ts`
  - routes `/api/assets/private` y `/api/assets/private/[assetId]`
  - `GreenhouseFileUploader`
  - convergencia inicial en `leave`, `purchase orders`, `payroll receipts` y `payroll export packages`
- La auditoría ya contrastó:
  - arquitectura (`core`, `identity/access`, `data model`, `cloud/security`)
  - codebase real
  - PostgreSQL real en `greenhouse-pg-dev / greenhouse_app`
- Realidad confirmada:
  - `leave` es el único consumer HR runtime hoy
  - `Document Vault` y `Expense Reports` siguen sin runtime
  - `purchase_orders` ya persiste `attachment_url`
  - `payroll_receipts` y `payroll_export_packages` ya persisten `storage_bucket/storage_path`
  - no existe todavía un registry genérico de `assets/attachments` en PostgreSQL
  - las tablas runtime auditadas no tienen FKs físicas declaradas hacia sus anchors canónicos
- La spec se corrigió para que la primera ola real no sea solo HR:
  - `leave`
  - `purchase orders`
  - convergencia shared de `payroll receipts`
  - convergencia shared de `payroll export packages`

### Delta de ejecución

- Task movida y corregida en:
  - `docs/tasks/in-progress/TASK-173-shared-attachments-platform-gcp-governance.md`
- La task fija el baseline recomendado:
  - UI basada en `react-dropzone` + `AppReactDropzone`
  - registry compartido de assets/attachments en PostgreSQL
  - GCP gobernado por dos buckets principales:
    - `public media`
    - `private assets`
  - separación por prefixes/autorización antes que por proliferación de buckets por módulo
- Cross-impact documentado:
  - `TASK-170` queda con `attachmentUrl` como estado transicional
  - `TASK-027` y `TASK-028` pasan a leerse como consumers de la foundation shared, no como dueños del patrón base de storage/upload
- Índice de tasks y registry actualizados:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- Decisión arquitectónica posterior explicitada:
  - `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` y `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` ya fijan bucket topology y access model
  - baseline aprobado:
    - `public media` por entorno
    - `private assets` por entorno
  - `private assets` debe bajar siempre por control de acceso Greenhouse; signed URLs solo como mecanismo efímero, no como contrato persistido

### Validación ejecutada

- Revisión de arquitectura/task taxonomy y búsqueda de solapes en repo/docs
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`

### Limitación real

- El repo ya quedó implementado y validado, pero la sesión no pudo aplicar `pnpm setup:postgres:shared-assets` en Cloud SQL porque no hubo acceso al secreto `migrator`.
- Estado real:
  - foundation shared lista en código
  - docs/taxonomía alineadas
  - bootstrap remoto pendiente
- Siguiente paso operativo:
  - correr `pnpm setup:postgres:shared-assets` con perfil `migrator`
  - smoke autenticado de upload/download en `leave` y `purchase orders`

## Sesión 2026-03-31 — HR profile UI para fecha de ingreso

### Objetivo

- Cerrar la brecha operativa detectada después de `TASK-170`: el backend ya soportaba `hire_date`, pero RRHH no tenía una UI visible para editarla y eso debilitaba el uso real de vacaciones por antigüedad.

### Delta de ejecución

- `People > HR profile` ahora expone acción `Editar ingreso` en la card `Información laboral`.
- La tab abre un diálogo pequeño y guarda `hireDate` vía `PATCH /api/hr/core/members/[memberId]/profile`.
- La vista prioriza el valor devuelto por el profile HR recién guardado para que el cambio se refleje de inmediato aunque otro contexto de lectura todavía no se refresque.
- Esto deja operativa la captura del dato que `leave` ya usa para antigüedad/progresivos en vacaciones.
- Se deja explícito en arquitectura que este dato sigue siendo `BigQuery-first` para edición y no debe moverse todavía a `Postgres-first`.
- Corrección posterior: la edición visible quedó finalmente en la surface real `People > [colaborador] > Perfil > Datos laborales`; el primer intento había quedado en `PersonHrProfileTab`, componente hoy no montado por `PersonTabs`.

### Archivos de alto impacto

- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx`
- `src/views/greenhouse/people/tabs/PersonProfileTab.tsx`
- `src/views/greenhouse/people/tabs/PersonProfileTab.test.tsx`

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx`
- `pnpm exec vitest run src/views/greenhouse/people/tabs/PersonProfileTab.test.tsx src/views/greenhouse/people/PersonTabs.test.tsx`
- `pnpm exec eslint src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx`
- `pnpm exec eslint src/views/greenhouse/people/tabs/PersonProfileTab.tsx src/views/greenhouse/people/tabs/PersonProfileTab.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Limitación real

- El endpoint de edición sigue escribiendo por el carril HR legacy/profile y no corta todavía directo a `greenhouse_core.members` en Postgres.
- Una reejecución posterior de `next build` quedó colgada en `Running TypeScript` sin error explícito; como mitigación, el estado final volvió a pasar `vitest`, `eslint` y `tsc --noEmit`.
- Fix posterior 2026-03-31:
  - guardar solo `hireDate` estaba disparando también un `MERGE` innecesario contra `greenhouse.member_profiles`
  - eso exponía al runtime a `500` y además era riesgoso porque podía tocar campos suplementarios no editados
  - `updateMemberHrProfile()` ahora solo muta `member_profiles` cuando realmente vienen campos de ese subperfil
- Arquitectura actualizada:
  - `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` ahora enumera las reglas runtime vigentes de `leave`
  - incluye policy resolution, cálculo de días, validaciones de creación, balances, aprobación y baseline seed por tipo
  - deja explícito que saldo disponible no reemplaza reglas como `min_advance_days`

## Sesión 2026-03-31 — TASK-016 Business Units Canonical v2 Fase 1

### Objetivo

- Implementar Fase 1 de TASK-016: metadata canónica de business lines, helpers, API, admin UI y TenantContext enrichment.

### Delta de ejecución

- PG `service_modules` extendida con `module_kind` + `parent_module_code` (paridad con BigQuery)
- Nueva tabla `greenhouse_core.business_line_metadata`: metadata rica por module_code con colores de `GH_COLORS.service`
- Seed: 5 BLs (globe, efeonce_digital, reach, wave, crm_solutions)
- Type: `BusinessLineMetadata` + `BusinessLineMetadataSummary` en `src/types/business-line.ts`
- Helper: `loadBusinessLineMetadata()`, `updateBusinessLineMetadata()`, `getCachedBusinessLineSummaries()` en `src/lib/business-line/metadata.ts`
- API: `GET/PUT /api/admin/business-lines` y `/api/admin/business-lines/[moduleCode]`
- `TenantContext` extendido con `businessLineMetadata?: BusinessLineMetadataSummary[]` (cached server-side, no JWT)
- Componente `BusinessLineMetadataCard` + barrel export
- Admin page `/admin/business-lines` con `AdminBusinessLinesView` + `BusinessLineEditDialog`
- `brand-assets.ts`: added `crm_solutions` entry
- `helpers.ts`: added `getCapabilityPaletteFromMetadata()` (metadata-driven palette resolver)

Fase 2 completada:
- `greenhouse_conformed.dim_business_lines` creada y poblada en BigQuery (5 BLs)
- ETL `scripts/etl-business-lines-to-bigquery.ts` (PG → BQ full replace)
- Finance `/api/finance/dashboard/by-service-line` enriched con metadata (label, colorHex, loopPhase)
- Hallazgo: producción PG faltaban `efeonce_digital` y `reach` — insertados
- Todas las migraciones aplicadas contra `greenhouse-pg-dev` con `greenhouse_ops`

### Pendiente

- Fases 3-4: Notion BU property + sync, ICO metrics by BU

### Riesgos

- `.env.local` tiene `GOOGLE_APPLICATION_CREDENTIALS_JSON` malformado (literal \n). ETL requiere `GOOGLE_APPLICATION_CREDENTIALS_JSON=""` para caer a ADC
- `getCachedBusinessLineSummaries()` falla gracefully si tabla no existe (returns [])

---

## Sesión 2026-03-31 — TASK-170 leave flow canónico + calendario + impacto payroll

### Objetivo

- Reconciliar `TASK-170` contra arquitectura/runtime real y cerrar la lane operativa de permisos con calendario canónico, policies, outbox granular y wiring reactivo hacia payroll/costos/notificaciones.

### Delta de ejecución

- `TASK-170` se movió a `in-progress` y se reescribió para reflejar el baseline real del repo en vez de asumir un módulo inexistente.
- `leave` ahora deriva días hábiles desde la capa hija `src/lib/hr-core/leave-domain.ts`, apoyada en:
  - `src/lib/calendar/operational-calendar.ts`
  - `src/lib/calendar/nager-date-holidays.ts`
- El store Postgres de permisos quedó endurecido:
  - ya no confía en `requestedDays` enviado por el caller
  - calcula breakdown por año y valida overlap, ventana mínima, attachment y balance según policy
  - introduce `leave_policies`, progressive/carry-over/adjustment fields y calendar payloads
- Outbox/eventos:
  - nuevos eventos `leave_request.created`, `leave_request.escalated_to_hr`, `leave_request.approved`, `leave_request.rejected`, `leave_request.cancelled`, `leave_request.payroll_impact_detected`
  - notificaciones para revisión HR/supervisor, estado del solicitante y alertas payroll/finance
- Wiring reactivo:
  - `projected_payroll` refresca snapshots proyectados
  - nueva projection `leave_payroll_recalculation` recalcula nómina oficial para períodos no exportados
  - `staff_augmentation` vuelve a refrescar tras `accounting.commercial_cost_attribution.materialized`
- UI/API:
  - nueva route `GET /api/hr/core/leave/calendar`
  - `/api/my/leave` ahora entrega `requests` + `calendar`
  - `/hr/leave` suma tab de calendario y deja de pedir días manuales
  - `/my/leave` pasa a vista self-service con calendario, historial y solicitud compartida
  - nuevo componente `src/components/greenhouse/LeaveRequestDialog.tsx`
- DDL/documentación runtime:
  - `scripts/setup-postgres-hr-leave.sql`
  - `scripts/setup-postgres-person-360-contextual.sql`
- Validación y aplicación real en GCP / Cloud SQL:
  - `pg:doctor` pasó con `runtime`, `migrator` y `admin` vía connector contra `greenhouse-pg-dev`
  - `setup:postgres:hr-leave` quedó aplicado en `greenhouse_app`
  - `setup:postgres:person-360-contextual` quedó reaplicado y verificó que el carril `person_hr_360` sigue reproducible con `migrator`
  - lectura runtime posterior validada:
    - `leave_policies = 10`
    - `leave_types = 10`
    - `leave_balances = 4`
  - se detectó drift de ownership en objetos `greenhouse_hr.leave_*`; se usó el carril admin temporal para sanearlos y dejar `setup:postgres:hr-leave` pasando otra vez con `migrator`

### Archivos de alto impacto

- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/hr-core/leave-domain.ts`
- `src/lib/hr-core/service.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/sync/projections/projected-payroll.ts`
- `src/lib/sync/projections/leave-payroll-recalculation.ts`
- `src/lib/sync/projections/staff-augmentation.ts`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/views/greenhouse/my/MyLeaveView.tsx`
- `scripts/setup-postgres-hr-leave.sql`

### Validación ejecutada

- `pnpm exec eslint` focalizado sobre los archivos modificados de HR leave, projections, APIs y vistas
- `pnpm exec vitest run src/lib/hr-core/leave-domain.test.ts src/lib/sync/event-catalog.test.ts src/lib/sync/projections/notifications.test.ts src/lib/sync/projections/staff-augmentation.test.ts src/lib/sync/projections/leave-payroll-recalculation.test.ts`
- `pnpm build`
- `pnpm pg:doctor --profile=runtime` por connector contra `greenhouse-pg-dev`
- `pnpm pg:doctor --profile=migrator` por connector contra `greenhouse-pg-dev`
- `pnpm pg:doctor --profile=admin` por connector contra `greenhouse-pg-dev`
- `pnpm setup:postgres:hr-leave` aplicado en Cloud SQL
- `pnpm setup:postgres:person-360-contextual` aplicado en Cloud SQL

### Limitación real

- No hubo smoke manual autenticado de `/my/leave` ni `/hr/leave`.

## Sesión 2026-03-31 — Staff Aug create flow vuelve a drawer seguro

### Objetivo

- Recuperar la UX de `drawer` para `Crear placement` sin volver al carril de página-card ni reintroducir el freeze ya investigado.

### Delta de ejecución

- `Agency > Staff Augmentation` vuelve a abrir el alta en `drawer`.
- La ruta `/agency/staff-augmentation/create` ya no renderiza una página separada:
  - ahora renderiza el listado con el drawer abierto
  - el cierre vuelve al listado base
- La ruta legacy `?create=1&assignmentId=...` sigue soportada en `/agency/staff-augmentation`.
- Se eliminó el wrapper `CreatePlacementPageView` porque dejó de ser necesario al volver a un flujo route-driven sobre el listado.
- El shell de apertura ya no usa `Dialog`; ahora usa `Drawer` con mount perezoso y apertura controlada por ruta.

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx --reporter=verbose`
- `pnpm exec eslint 'src/app/(dashboard)/agency/staff-augmentation/page.tsx' 'src/app/(dashboard)/agency/staff-augmentation/create/page.tsx' src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-31 — Staff Aug Postgres baseline reparado en GCP para develop

### Objetivo

- Investigar el `500` persistente de `GET /api/agency/staff-augmentation/placements` y corregirlo en la base real detrás de `develop`.

### Delta de ejecución

- Se confirmó en Vercel que el `500` venía de `error: relation "greenhouse...` sobre `/api/agency/staff-augmentation/placements`.
- Verificación directa en GCP / Cloud SQL:
  - instancia: `greenhouse-pg-dev`
  - base: `greenhouse_app`
  - usuario runtime: `greenhouse_app`
  - las tablas de Staff Aug no existían realmente:
    - `greenhouse_delivery.staff_aug_placements`
    - `greenhouse_delivery.staff_aug_onboarding_items`
    - `greenhouse_delivery.staff_aug_events`
    - `greenhouse_serving.staff_aug_placement_snapshots`
- Se aplicó el bootstrap canónico `pnpm setup:postgres:staff-augmentation` contra Cloud SQL usando el perfil `migrator` vía connector.
- El problema no estaba en el código del endpoint sino en drift de schema en PostgreSQL para el entorno compartido.

### Validación ejecutada

- Confirmación previa del error en runtime logs de Vercel sobre `GET /api/agency/staff-augmentation/placements`.
- Consulta directa por Cloud SQL Connector antes del fix:
  - `to_regclass(...) = null` para las 4 tablas Staff Aug
- Ejecución exitosa de setup:
  - `pnpm setup:postgres:staff-augmentation`
- Consulta directa por Cloud SQL Connector después del fix:
  - `greenhouse_delivery.staff_aug_placements`
  - `greenhouse_delivery.staff_aug_onboarding_items`
  - `greenhouse_delivery.staff_aug_events`
  - `greenhouse_serving.staff_aug_placement_snapshots`
  - `COUNT(*) FROM greenhouse_delivery.staff_aug_placements = 0`

### Limitación real

- En esta pasada no hubo smoke autenticado final del listado contra `dev-greenhouse` después del repair de Cloud SQL porque el runner no conserva una sesión autenticada reutilizable del portal.
- Sí queda verificación directa sobre la base real de `develop` de que el schema faltante ya existe y es legible por el usuario runtime.

## Sesión 2026-03-31 — Staff Aug create placement moved to dedicated route after real freeze reproduction

### Objetivo

- Resolver el cuelgue real de `Crear placement` después de reproducirlo con sesión autenticada real en `dev-greenhouse`.

### Delta de ejecución

- Se confirmó que el freeze ocurría al hacer click real sobre `Crear placement` en la vista de listado.
- Replanteamiento aplicado:
  - `Agency > Staff Augmentation` ya no monta el create flow dentro del listado
  - el botón ahora navega a `/agency/staff-augmentation/create`
  - `?create=1&assignmentId=...` redirige server-side a la nueva ruta dedicada
  - el bridge desde `People` también apunta a la ruta dedicada con `assignmentId`
- Objetivo técnico:
  - sacar el formulario del árbol del listado, que era el carril donde el browser quedaba colgado al abrir
  - mantener intacto el contrato funcional de creación y el deep-link desde `People`
- Archivos tocados:
  - `src/app/(dashboard)/agency/staff-augmentation/page.tsx`
  - `src/app/(dashboard)/agency/staff-augmentation/create/page.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementPageView.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`
  - `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx`
  - tests asociados

### Validación ejecutada

- Reproducción real previa del freeze con sesión autenticada y click real sobre `Crear placement`
- `pnpm exec vitest run src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx --reporter=verbose`
- `pnpm exec eslint 'src/app/(dashboard)/agency/staff-augmentation/page.tsx' 'src/app/(dashboard)/agency/staff-augmentation/create/page.tsx' src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementPageView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-31 — Staff Aug create placement freeze replanteado inline

### Objetivo

- Sacar `Crear placement` del carril `MUI Dialog` porque el freeze siguió ocurriendo en `dev-greenhouse` aun después de simplificar búsqueda y focus handling.

### Delta de ejecución

- Replanteamiento del flujo:
  - `CreatePlacementDialog` ahora soporta modo `inline`
  - `StaffAugmentationListView` deja de abrir el create flow como modal y lo renderiza inline dentro de la misma página
- La búsqueda incremental, preselección por `assignmentId` y creación del placement se mantienen; lo que cambia es el shell de interacción para evitar el bloqueo al abrir.
- Contexto relevante:
  - el reporte manual del usuario en `dev-greenhouse` confirmó que el deployment previo seguía congelando Chrome al hacer click en `Crear placement`
  - por eso se descartó seguir endureciendo el modal y se movió el flujo fuera de `Dialog`
- Archivos tocados:
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx`

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx --reporter=verbose`
- `pnpm exec eslint src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Limitación real

- No hubo verificación autenticada end-to-end en `dev-greenhouse` desde el runner porque el portal exige sesión y no hay bypass reutilizable en Playwright dentro de este entorno.
- Sí queda evidencia local de que el click ya no monta `role="dialog"` y abre el formulario inline, que es precisamente el carril replanteado para evitar el cuelgue.

## Sesión 2026-03-31 — Staff Aug create placement freeze fallback simplification

### Objetivo

- Aplicar una mitigación más conservadora al cuelgue de `Crear placement` sin depender del stack `Dialog + Autocomplete`.

### Delta de ejecución

- Se reemplazó el selector `Autocomplete` del modal por un buscador incremental más simple:
  - input controlado
  - búsqueda remota debounceada
  - lista inline de resultados elegibles dentro del dialog
- Objetivo técnico:
  - sacar del carril crítico la combinación `MUI Dialog + Autocomplete + Popper`
  - mantener el contrato funcional del flujo sin volver al `select` masivo
- Ajuste adicional posterior:
  - `StaffAugmentationListView` ahora hace lazy-mount real del modal solo cuando `createOpen=true`
  - `CreatePlacementDialog` desactiva `auto/enforce/restore focus` del `Dialog` para reducir riesgo de freeze al abrir en Chrome
- Archivos tocados:
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx`

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx --reporter=verbose`
- `pnpm exec eslint src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Limitación real

- Se intentó verificación browser sobre `dev-greenhouse` pero quedó bloqueada por autenticación del portal dentro de Playwright.
- Sí se confirmó que el alias `dev-greenhouse.efeoncepro.com` apunta al deployment del commit `e3936909`; lo que faltó fue una sesión Greenhouse reutilizable dentro del runner para ejecutar el click autenticado.

## Sesión 2026-03-31 — Staff Aug create placement freeze hardening

### Objetivo

- Corregir el cuelgue visible al hacer click en `Crear placement` dentro de `/agency/staff-augmentation`.

### Delta de ejecución

- Se confirmó y corrigió el patrón de riesgo principal del modal:
  - antes cargaba y renderizaba todas las opciones elegibles en un `select`
  - ahora usa búsqueda incremental y acotada para assignments elegibles
- Cambios principales:
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx`
    - reemplaza `select` masivo por `Autocomplete`
    - no carga opciones al abrir salvo deep-link por `assignmentId`
    - busca remoto al escribir
  - `src/app/api/agency/staff-augmentation/placement-options/route.ts`
    - ahora acepta `search`, `assignmentId` y `limit`
  - `src/lib/staff-augmentation/store.ts`
    - mueve filtro y `LIMIT` al query Postgres para no traer todo el universo al modal
- Resultado esperado:
  - abrir `Crear placement` ya no debería congelar la página por render masivo de opciones

### Validación ejecutada

- `pnpm exec vitest run src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx`
- `pnpm exec eslint src/lib/staff-augmentation/store.ts src/app/api/agency/staff-augmentation/placement-options/route.ts src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- Faltante:
  - no hubo smoke browser autenticado en `dev-greenhouse` desde este turno; el fix quedó validado por contrato, tests y tipado

## Sesión 2026-03-31 — RESEARCH-002 Staff Aug enterprise module grounded in codebase

### Objetivo

- Seguir iterando el brief enterprise de `Staff Augmentation`, pero aterrizado contra el runtime actual del repo y no solo como diseño aspiracional.

### Delta de ejecución

- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md` ahora distingue con más fuerza:
  - baseline runtime ya confirmado
  - gaps reales vs target enterprise
- El brief ya deja explícito, con referencia a código y arquitectura vigente, que hoy ya existen:
  - `assignment` como pivote operativo
  - `placement` como entidad transaccional real
  - bridge `People -> assignment -> placement`
  - contexto `Space` / `organization` ya persistido en placements
  - snapshots económicos Staff Aug
  - reactividad con Payroll, Finance, Providers y Tooling
- También quedó explicitado qué falta todavía para una task enterprise nueva:
  - `Placement 360` completo
  - profitability desk
  - renewal/risk desk
  - talent coverage
  - governance placement-first con provider/tooling

### Validación ejecutada

- Relectura de arquitectura:
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- Contraste manual contra runtime:
  - `src/lib/staff-augmentation/store.ts`
  - `src/lib/staff-augmentation/snapshots.ts`
  - `src/lib/sync/projections/staff-augmentation.ts`
  - `src/lib/agency/space-360.ts`
  - `src/lib/people/get-person-detail.ts`
  - `src/lib/person-360/get-person-finance.ts`
  - `src/lib/providers/provider-tooling-snapshots.ts`

## Sesión 2026-03-31 — TASK-169 Staff Aug bridge + create placement hardening

### Objetivo

- Corregir el cuelgue real de `Crear placement` y consolidar el bridge vigente entre `People`, `Assignments` y `Staff Augmentation`.

### Delta de ejecución

- `CreatePlacementDialog` ya no usa `/api/team/capacity-breakdown`.
- Nueva route liviana:
  - `src/app/api/agency/staff-augmentation/placement-options/route.ts`
  - reusa `listStaffAugPlacementOptions()` desde `src/lib/staff-augmentation/store.ts`
- El modal ahora:
  - carga assignments elegibles livianos
  - muestra contexto `organization + contract type + pay regime + costo base`
  - acepta `initialAssignmentId` para deep-link desde `People`
- `StaffAugmentationListView` ya entiende `?create=1&assignmentId=...` para abrir el modal con preselección.
- `People 360` ahora expone el bridge real:
  - `src/lib/people/get-person-detail.ts` agrega `assignmentType`, `placementId`, `placementStatus`
  - `src/types/people.ts` refleja esas señales
  - `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx` ahora muestra:
    - chip `Staff Aug` / `Interno`
    - CTA `Crear placement` si existe assignment elegible
    - CTA `Abrir placement` si ya existe
- Consolidación documental iniciada:
  - nueva `docs/tasks/in-progress/TASK-169-staff-aug-placement-bridge-hris-runtime-consolidation.md`
  - deltas en `TASK-019`, `TASK-038`, `TASK-041`
  - `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y `project_context.md` alineados al bridge real

### Validación ejecutada

- `pnpm exec vitest run src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/app/api/agency/staff-augmentation/placements/route.test.ts src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Cierre

- `TASK-169` queda cerrada como baseline mínimo del bridge `People -> assignment -> placement`.
- `TASK-038` y `TASK-041` quedan cerradas administrativamente como documentos históricos absorbidos; la próxima iteración del módulo enterprise de Staff Aug debe nacer como task nueva, no reabrir estos briefs.
- Validación adicional completada después de este delta:
  - `pnpm exec vitest run src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/app/api/agency/staff-augmentation/placements/route.test.ts`
  - `pnpm exec eslint src/lib/staff-augmentation/store.ts src/app/api/agency/staff-augmentation/placement-options/route.ts src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/lib/people/get-person-detail.ts src/types/people.ts src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `git diff --check`

## Sesión 2026-03-30 — cierre de TASK-142 Agency Space 360

### Objetivo

- Cerrar `TASK-142` end-to-end: runtime, API, UI, pruebas y documentación viva.

### Delta de ejecución

- `/agency/spaces/[id]` ya no redirige a `/admin/tenants/*`.
- Nueva agregación canónica:
  - `src/lib/agency/space-360.ts`
  - resuelve `clientId` como clave operativa y la enriquece con `space_id`, organización, Finance, ICO, Team, Services, Staff Aug y outbox activity
- Nueva surface:
  - `src/views/greenhouse/agency/space-360/Space360View.tsx`
  - tabs `Overview`, `Team`, `Services`, `Delivery`, `Finance`, `ICO`
- Nueva route:
  - `src/app/api/agency/spaces/[id]/route.ts`
- Governance:
  - la page usa `getTenantContext()` + `hasAuthorizedViewCode('gestion.spaces')`
- Impacto cruzado ya documentado:
  - `TASK-146`, `TASK-150`, `TASK-151`, `TASK-158`, `TASK-159`

### Validación ejecutada

- `pnpm exec vitest run 'src/app/api/agency/spaces/[id]/route.test.ts' 'src/views/greenhouse/agency/space-360/Space360View.test.tsx' src/lib/agency/space-360.test.ts`
- `pnpm exec eslint 'src/app/api/agency/spaces/[id]/route.ts' 'src/app/api/agency/spaces/[id]/route.test.ts' 'src/app/(dashboard)/agency/spaces/[id]/page.tsx' 'src/lib/agency/space-360.ts' 'src/lib/agency/space-360.test.ts' 'src/views/greenhouse/agency/space-360/Space360View.tsx' 'src/views/greenhouse/agency/space-360/Space360View.test.tsx' 'src/views/greenhouse/agency/space-360/shared.ts' 'src/views/greenhouse/agency/space-360/tabs/*.tsx'`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm pg:doctor --profile=runtime` intentado al inicio, pero bloqueado por variables faltantes:
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD` / secret ref

### Lifecycle

- `TASK-142` debe quedar en `docs/tasks/complete/`
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `project_context.md` y `changelog.md` quedan actualizados

## Sesión 2026-03-30 — inicio de TASK-142 Agency Space 360

### Objetivo

- Reconciliar `TASK-142` con la arquitectura real y reemplazar el redirect de `/agency/spaces/[id]` por una vista `Space 360` operativa sobre el baseline actual de Agency.

### Contexto clave

- `TASK-142` estaba desalineada:
  - asumía `BigQuery-first`
  - asumía que el route param ya era `space_id` puro
  - dejaba implícito que el health/risk engine ya existía
- Estado real confirmado:
  - el listado Agency navega hoy por `clientId` como proxy del Space
  - el runtime sí tiene `greenhouse_core.spaces`, `services`, `operational_pl_snapshots`, `member_capacity_economics`, `staff_aug_*` y `outbox_events` para componer una 360 útil
  - la emisión específica de eventos Agency sigue siendo follow-on de `TASK-148`, no un bloqueo para esta vista
- `pnpm pg:doctor --profile=runtime` fue intentado y falló por variables faltantes:
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD` / secret ref

### Delta de ejecución

- `TASK-142` movida a `docs/tasks/in-progress/`
- `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` alineados a `in-progress`
- La task ya quedó corregida con delta explícito:
  - `clientId` como key operativa actual con resolución posterior a `space_id`
  - consumo preferente de serving/projections existentes
  - health/risk como heurística transicional en esta lane

## Sesión 2026-03-30 — cierre de TASK-019 Staff Augmentation

### Objetivo

- Reconciliar `TASK-019` contra arquitectura/modelo de datos/codebase/cloud y cerrarla completa con runtime, outbox/projections, consumers Agency y documentación viva.

### Delta de ejecución

- Baseline Staff Aug cerrado sobre `client_team_assignments`:
  - `assignment_type` ya forma parte del flujo operativo
  - nuevo bootstrap en `scripts/setup-postgres-staff-augmentation.sql` + `setup-postgres-staff-augmentation.ts`
  - tablas vigentes:
    - `greenhouse_delivery.staff_aug_placements`
    - `greenhouse_delivery.staff_aug_onboarding_items`
    - `greenhouse_delivery.staff_aug_events`
    - `greenhouse_serving.staff_aug_placement_snapshots`
- Runtime nuevo:
  - `src/lib/staff-augmentation/store.ts`
  - `src/lib/staff-augmentation/snapshots.ts`
  - `src/lib/sync/projections/staff-augmentation.ts`
  - eventos `staff_aug.*` en `src/lib/sync/event-catalog.ts`
- Surface nueva en Agency:
  - `/agency/staff-augmentation`
  - `/agency/staff-augmentation/[placementId]`
  - navegación/gobernanza:
    - `gestion.staff_augmentation`
    - `GH_AGENCY_NAV.staffAugmentation`
    - sidebar de Agency
- Consumer actualizado:
  - `src/app/api/team/capacity-breakdown/route.ts` ahora expone `assignmentType`, `placementId` y `placementStatus`
  - `src/views/agency/AgencyTeamView.tsx` muestra chip Staff Aug y CTA al placement
- Drilldowns del placement:
  - `/agency/team`
  - `/hr/payroll`
  - `/admin/ai-tools?tab=catalog&providerId=<id>`
- Consistencia corregida:
  - onboarding limpia `verified_at` / `verified_by_user_id` al salir de `done`
  - latest snapshot del detail se normaliza a camelCase
  - KPI cards del listado usan summary real del backend, no solo la página visible
  - creación redirige al `Placement 360` recién creado

### Validación ejecutada

- `pnpm exec vitest run src/app/api/team/capacity-breakdown/route.test.ts src/lib/sync/projections/staff-augmentation.test.ts src/lib/sync/event-catalog.test.ts src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.test.tsx`
- `pnpm exec eslint src/lib/staff-augmentation/store.ts src/lib/staff-augmentation/snapshots.ts src/lib/sync/projections/staff-augmentation.ts src/lib/sync/event-catalog.ts src/app/api/team/capacity-breakdown/route.ts src/app/api/team/capacity-breakdown/route.test.ts src/views/agency/AgencyTeamView.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.tsx src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.test.tsx 'src/app/(dashboard)/agency/layout.tsx' 'src/app/(dashboard)/agency/staff-augmentation/page.tsx' 'src/app/(dashboard)/agency/staff-augmentation/[placementId]/page.tsx' src/components/layout/vertical/VerticalMenu.tsx src/config/greenhouse-nomenclature.ts src/lib/admin/view-access-catalog.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Impacto documental

- `TASK-019` movida a `docs/tasks/complete/`
- `docs/tasks/README.md` debe quedar con `TASK-019` cerrada y con `TASK-038`/`TASK-041` reinterpretadas como follow-ons/documentos históricos
- `TASK-038` y `TASK-041` ya tienen delta aclarando el baseline real
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`, `project_context.md` y `changelog.md` quedaron reconciliados con el runtime actual

## Sesión 2026-03-30 — cierre end-to-end UI/tests de TASK-059

### Objetivo

- Cerrar el remanente operativo de `TASK-059` después del carril reactivo y del aterrizaje inicial en Finanzas.

### Delta de ejecución

- `Provider 360` quedó navegable de verdad:
  - `src/views/greenhouse/finance/SupplierProviderToolingTab.tsx` ahora expone drilldowns a:
    - `/finance/expenses?supplierId=<id>`
    - `/admin/ai-tools?tab=catalog&providerId=<id>`
    - `/admin/ai-tools?tab=licenses&providerId=<id>`
    - `/hr/payroll`
- `src/views/greenhouse/ai-tools/AiToolingDashboard.tsx` ahora acepta `providerId` y `tab` por query string y filtra client-side catálogo/licencias/wallets para sostener ese drilldown desde Finanzas.
- Cobertura nueva agregada:
  - `src/app/api/finance/suppliers/[id]/route.test.ts`
  - `src/views/greenhouse/finance/SupplierProviderToolingTab.test.tsx`
  - `src/lib/providers/provider-tooling-snapshots.test.ts` ahora cubre también `getLatestProviderToolingSnapshot()`

### Validación ejecutada

- `pnpm exec vitest run src/lib/providers/provider-tooling-snapshots.test.ts 'src/app/api/finance/suppliers/[id]/route.test.ts' src/views/greenhouse/finance/SupplierProviderToolingTab.test.tsx src/lib/sync/projections/provider-tooling.test.ts src/lib/sync/event-catalog.test.ts`
- `pnpm exec eslint src/lib/providers/provider-tooling-snapshots.ts src/lib/providers/provider-tooling-snapshots.test.ts 'src/app/api/finance/suppliers/[id]/route.ts' 'src/app/api/finance/suppliers/[id]/route.test.ts' src/views/greenhouse/finance/SupplierDetailView.tsx src/views/greenhouse/finance/SupplierProviderToolingTab.tsx src/views/greenhouse/finance/SupplierProviderToolingTab.test.tsx src/views/greenhouse/finance/SuppliersListView.tsx src/views/greenhouse/ai-tools/AiToolingDashboard.tsx src/lib/providers/monthly-snapshot.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`
- Smoke local intentado con `pnpm dev`:
  - `HEAD /finance/suppliers` respondió `307 -> /login`
  - `HEAD /admin/ai-tools?tab=catalog&providerId=anthropic` respondió `307 -> /login`
  - conclusión: el entorno local respondió sano, pero no hubo browser QA autenticado desde este turno por barrera de auth
- Residual no bloqueante confirmado:
  - `src/lib/providers/monthly-snapshot.ts` queda como stack legacy sin consumers activos detectados fuera de su propio archivo; no bloquea el cierre de `TASK-059`

## Sesión 2026-03-30 — aterrizaje UI de TASK-059 en Finance Suppliers

### Objetivo

- Llevar la lectura canónica `provider 360` al módulo correcto de Finanzas, sin duplicar la consola táctica de `AI Tooling`.

### Delta de ejecución

- `Finance > Suppliers` ahora expone explícitamente la sinergia supplier/provider:
  - `src/views/greenhouse/finance/SuppliersListView.tsx` muestra cobertura `Provider 360` y estado de vínculo canónico por fila
  - `src/views/greenhouse/finance/SupplierDetailView.tsx` agrega chip de vínculo canónico y nuevo tab `Provider 360`
  - nuevo componente route-local `src/views/greenhouse/finance/SupplierProviderToolingTab.tsx`
- `GET /api/finance/suppliers/[id]` ahora devuelve además `providerTooling` cuando el supplier ya está enlazado a `providerId`
- `src/lib/providers/provider-tooling-snapshots.ts` suma helper de lectura puntual del último snapshot por provider para surfaces de UI
- La UX queda deliberadamente separada:
  - `Finance > Suppliers` como home canónica del objeto provider/supplier
  - `Admin > AI Tooling` como consola operativa de catálogo, licencias, wallets y consumo

### Validación ejecutada

- `pnpm exec eslint src/lib/providers/monthly-snapshot.ts 'src/app/api/finance/suppliers/[id]/route.ts' src/lib/providers/provider-tooling-snapshots.ts src/views/greenhouse/finance/SupplierDetailView.tsx src/views/greenhouse/finance/SupplierProviderToolingTab.tsx src/views/greenhouse/finance/SuppliersListView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — cierre reactivo de TASK-059 Provider canónico cross-module

### Objetivo

- Corregir `TASK-059` contra la arquitectura vigente e implementar el carril provider-centric faltante entre tooling, Finance, costos y Payroll.

### Delta de ejecución

- `TASK-059` quedó reconciliada y cerrada:
  - se descarta la propuesta vieja de `tool_providers`
  - el ancla vigente queda reafirmada en `greenhouse_core.providers`
  - `greenhouse_finance.suppliers` se preserva como extensión Finance
  - `greenhouse_ai.*` se preserva como runtime transaccional de tooling
- Nuevo wiring reactivo cerrado:
  - `src/lib/providers/postgres.ts` ahora publica `provider.upserted`
  - `src/lib/finance/postgres-store.ts` ahora publica `finance.supplier.created` / `finance.supplier.updated`
  - nueva materialización `src/lib/providers/provider-tooling-snapshots.ts`
  - nueva proyección `src/lib/sync/projections/provider-tooling.ts`
  - nueva tabla `greenhouse_serving.provider_tooling_snapshots`
  - nueva vista `greenhouse_serving.provider_tooling_360`
  - nuevo evento saliente `provider.tooling_snapshot.materialized`
- Consumer ya absorbido:
  - `GET /api/finance/analytics/trends?type=tools` ahora lee el snapshot provider-centric y deja de agrupar por labels legacy de supplier/description
- Documentación viva actualizada:
  - `project_context.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - lifecycle de `TASK-059` en `docs/tasks/*`

### Validación ejecutada

- `pnpm exec vitest run src/lib/providers/provider-tooling-snapshots.test.ts src/lib/sync/projections/provider-tooling.test.ts src/lib/sync/event-catalog.test.ts`
- `pnpm exec eslint src/lib/providers/provider-tooling-snapshots.ts src/lib/providers/provider-tooling-snapshots.test.ts src/lib/providers/postgres.ts src/lib/finance/postgres-store.ts src/lib/sync/projections/provider-tooling.ts src/lib/sync/projections/provider-tooling.test.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts src/app/api/finance/analytics/trends/route.ts`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-30 — verificación staging Finance + reconciliación TASK-164

### Objetivo

- Confirmar que los flujos visibles de Finance ya cargan en `staging` y dejar `TASK-164` alineada al estado real del repo.

### Delta de ejecución

- Verificación manual asistida con browser en `staging`:
  - `https://dev-greenhouse.efeoncepro.com/finance/income/INC-NB-26639047` carga como `Ingreso — Greenhouse`
  - `https://dev-greenhouse.efeoncepro.com/finance/clients` carga como `Clientes — Greenhouse`
  - los únicos errores observados en consola son de `vercel.live` embed/CSP y no del runtime funcional del módulo
- `docs/tasks/complete/TASK-164-purchase-orders-module.md` quedó reconciliada con su estado real:
  - ya no debe leerse como plan pendiente
  - los slices/checklists pasan a ser contexto histórico del diseño original

### Validación ejecutada

- Browser verification en `staging`
- `git diff --check`

## Sesión 2026-03-30 — smoke visual de Purchase Orders, HES y Finance Intelligence en staging

### Objetivo

- Verificar que las surfaces nuevas/cerradas de Finance cargan realmente en `staging` después de los últimos cortes.

### Delta de ejecución

- Verificación manual asistida con browser:
  - `https://dev-greenhouse.efeoncepro.com/finance/purchase-orders` carga como `Órdenes de compra`
  - `https://dev-greenhouse.efeoncepro.com/finance/hes` carga como `Hojas de entrada de servicio`
  - `https://dev-greenhouse.efeoncepro.com/finance/intelligence` carga como `Economía operativa — Greenhouse`
- Requests relevantes observados:
  - `GET /api/cost-intelligence/periods?limit=12` → `200`
  - `GET /api/notifications/unread-count` → `200`
- Consola:
  - se mantiene ruido conocido de `vercel.live` / CSP report-only
  - en `finance/intelligence` apareció además `OPTIONS /dashboard -> 400` durante prefetch; no bloqueó render ni las llamadas principales del módulo

### Validación ejecutada

- Browser verification en `staging`

## Sesión 2026-03-30 — hardening de OPTIONS en page routes del portal

### Objetivo

- Eliminar el `OPTIONS /dashboard -> 400` observado durante prefetch en `finance/intelligence` sin tocar el comportamiento de las APIs.

### Delta de ejecución

- `src/proxy.ts` ahora responde `204` a `OPTIONS` sobre page routes no-API.
- El cambio preserva el comportamiento normal de `/api/**`, que no queda short-circuiteado por el proxy.
- Tests reforzados en `src/proxy.test.ts`:
  - page route `OPTIONS` → `204`
  - api route `OPTIONS` → no interceptado como página

### Validación ejecutada

- `pnpm exec vitest run src/proxy.test.ts`
- `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — cierre del ruido `vercel.live` en CSP report-only

### Objetivo

- Cerrar el ruido residual de consola en `staging/preview` sin relajar la postura de `production`.

### Delta de ejecución

- `src/proxy.ts` ahora construye la CSP report-only según entorno:
  - `production` conserva `frame-src` limitado a las fuentes originales
  - `preview/staging` permiten además `https://vercel.live` en `frame-src`
- El cambio es deliberadamente acotado al canal report-only y no modifica la política efectiva de runtime de `production`.
- Tests reforzados en `src/proxy.test.ts`:
  - `vercel.live` presente fuera de `production`
  - `vercel.live` ausente en `production`

### Validación ejecutada

- `pnpm exec vitest run src/proxy.test.ts`
- `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — reconciliación documental final Finance/Nubox

### Objetivo

- Cerrar el drift documental que quedaba después de los últimos cutovers de Finance Clients, BigQuery fail-closed y Nubox enrichment.

### Delta de ejecución

- `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md` quedó degradado explícitamente a historial de migración; ya no debe leerse como estado operativo vigente.
- `docs/tasks/complete/TASK-163-finance-document-type-separation.md` quedó alineada a estado `complete`, dejando claro que el problema original fue absorbido por el runtime actual.
- `docs/tasks/complete/TASK-165-nubox-full-data-enrichment.md` quedó alineada a estado implementado real y al hardening reciente de PDF/XML en Income detail.
- La fuente viva para el estado actual de Finance queda reafirmada en:
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/tasks/complete/TASK-166-finance-bigquery-write-cutover.md`
  - `docs/tasks/complete/TASK-050-finance-client-canonical-runtime-cutover.md`

### Validación ejecutada

- `git diff --check`

## Sesión 2026-03-30 — fix de descarga PDF/XML Nubox en Finance income detail

### Objetivo

- Resolver el incidente visible en `staging` donde el detalle de ingreso mostraba `Nubox PDF download failed with 401`.

### Delta de ejecución

- Se verificó contra Nubox real que `/sales/{id}`, `/sales/{id}/pdf?template=TEMPLATE_A4` y `/sales/{id}/xml` responden `200` con credenciales válidas.
- El detalle de ingreso ya no fuerza siempre el proxy `/api/finance/income/[id]/dte-pdf|xml`:
  - ahora prioriza `nuboxPdfUrl` / `nuboxXmlUrl` directos cuando el sync ya los dejó en el record
  - conserva fallback al proxy cuando esos links no existen
- `src/lib/nubox/client.ts` ahora:
  - hace `trim()` de `NUBOX_API_BASE_URL` y `NUBOX_X_API_KEY`
  - envía `Accept` explícito para PDF/XML
- Test reforzado en `src/lib/nubox/client.test.ts`.

### Validación ejecutada

- `pnpm exec vitest run src/lib/nubox/client.test.ts`
- `pnpm exec eslint src/lib/nubox/client.ts src/lib/nubox/client.test.ts src/views/greenhouse/finance/IncomeDetailView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — hardening del drift de lectura en income y expenses

### Objetivo

- Reducir el drift residual de identidad financiera en lectura sin romper compatibilidad histórica de `income`.

### Delta de ejecución

- `GET /api/finance/income` ahora resuelve `clientId` / `clientProfileId` / `hubspotCompanyId` contra el contexto canónico antes de consultar Postgres o BigQuery fallback.
- `src/lib/finance/postgres-store-slice2.ts` ya no mezcla `clientProfileId` con `hubspot_company_id` en una sola comparación ad hoc; el filtro usa anclas canónicas separadas.
- Se dejó un shim transicional explícito para no romper callers legacy de `income`: si `clientProfileId` se usaba como alias de `hubspotCompanyId`, el handler reintenta esa lectura solo para esa compatibilidad histórica.
- `GET /api/finance/expenses` ahora acepta filtros por `clientProfileId` y `hubspotCompanyId`, resolviéndolos a `clientId` canónico sin cambiar el modelo operativo del expense runtime.
- Cobertura reforzada en `src/app/api/finance/identity-drift-payloads.test.ts`.

### Validación ejecutada

- `pnpm exec vitest run src/app/api/finance/identity-drift-payloads.test.ts src/lib/finance/canonical.test.ts src/app/api/finance/bigquery-write-cutover.test.ts src/app/api/finance/clients/read-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec eslint src/app/api/finance/income/route.ts src/app/api/finance/income/[id]/route.ts src/app/api/finance/expenses/route.ts src/app/api/finance/expenses/[id]/route.ts src/app/api/finance/identity-drift-payloads.test.ts src/lib/finance/postgres-store-slice2.ts src/lib/finance/canonical.ts src/lib/finance/canonical.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-30 — agregaciones financieras con client_id canónico

### Objetivo

- Cortar el bridge legacy donde `client_economics` y `operational_pl` seguían tratando `client_profile_id` como si fuera `client_id`.

### Delta de ejecución

- `src/lib/finance/postgres-store-intelligence.ts` ya no agrega revenue por `COALESCE(client_id, client_profile_id)`.
- `computeClientEconomicsSnapshots()` ahora resuelve `client_id` canónico desde `greenhouse_finance.client_profiles` cuando un income histórico viene solo con `client_profile_id`.
- `src/lib/cost-intelligence/compute-operational-pl.ts` quedó alineado al mismo criterio para snapshots de margen operativo.
- Tests nuevos/reforzados:
  - `src/lib/finance/postgres-store-intelligence.test.ts`
  - `src/lib/cost-intelligence/compute-operational-pl.test.ts`

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/postgres-store-intelligence.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec eslint src/lib/finance/postgres-store-intelligence.ts src/lib/finance/postgres-store-intelligence.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-30 — cierre de residuals canon client_id en Finance Clients y Campaigns

### Objetivo

- Cerrar los últimos consumers obvios que seguían tratando `client_profile_id` como si fuera `client_id`.

### Delta de ejecución

- `src/app/api/finance/clients/route.ts` ya calcula receivables por `client_id` canónico en Postgres y BigQuery fallback.
- `src/app/api/finance/clients/[id]/route.ts` ya consulta invoices y summary con la misma traducción canónica vía `client_profiles`.
- `src/lib/campaigns/campaign-extended.ts` ya reancla revenue al `client_id` canónico antes de calcular `CampaignFinancials`.
- Tests nuevos/reforzados:
  - `src/app/api/finance/clients/read-cutover.test.ts`
  - `src/lib/campaigns/campaign-extended.test.ts`

### Validación ejecutada

- `pnpm exec vitest run src/app/api/finance/clients/read-cutover.test.ts src/lib/campaigns/campaign-extended.test.ts src/lib/finance/postgres-store-intelligence.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec eslint src/app/api/finance/clients/route.ts src/app/api/finance/clients/[id]/route.ts src/app/api/finance/clients/read-cutover.test.ts src/lib/campaigns/campaign-extended.ts src/lib/campaigns/campaign-extended.test.ts src/lib/finance/postgres-store-intelligence.ts src/lib/finance/postgres-store-intelligence.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — cierre formal de TASK-166 Finance BigQuery write cutover

### Objetivo

- Cerrar el lifecycle real de `FINANCE_BIGQUERY_WRITE_ENABLED` como guard operativo de Finance y dejar el remanente clasificado explícitamente.

### Delta de ejecución

- Guard operativo extendido a:
  - `POST /api/finance/accounts`
  - `PUT /api/finance/accounts/[id]`
  - `POST /api/finance/exchange-rates`
  - `POST /api/finance/suppliers`
  - `PUT /api/finance/suppliers/[id]`
  - `POST /api/finance/expenses/bulk`
- `suppliers` ya no escribe primariamente a BigQuery:
  - `POST` y `PUT` usan `seedFinanceSupplierInPostgres()`
- Test nuevo:
  - `src/app/api/finance/bigquery-write-cutover.test.ts`
- Lifecycle cerrado:
  - `docs/tasks/complete/TASK-166-finance-bigquery-write-cutover.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- Delta cruzado:
  - `docs/tasks/complete/TASK-139-finance-module-hardening.md` ahora explicita que el remanente del flag quedó absorbido y cerrado por `TASK-166`

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/bigquery-write-flag.test.ts src/app/api/finance/bigquery-write-cutover.test.ts`
- `pnpm exec eslint src/lib/finance/bigquery-write-flag.ts src/lib/finance/bigquery-write-flag.test.ts src/app/api/finance/bigquery-write-cutover.test.ts src/app/api/finance/accounts/route.ts src/app/api/finance/accounts/[id]/route.ts src/app/api/finance/exchange-rates/route.ts src/app/api/finance/suppliers/route.ts src/app/api/finance/suppliers/[id]/route.ts src/app/api/finance/expenses/bulk/route.ts src/app/api/finance/income/route.ts src/app/api/finance/expenses/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Residual explícito

- Siguen clasificados fuera de `TASK-166`:
  - reads legacy de `Finance Clients` que aún consultan BigQuery por compatibilidad
- El criterio vigente es tratarlos como lanes o follow-ons localizados, no como bloqueo del flag operativo core.

## Sesión 2026-03-30 — expansión final del guard sobre core + reconciliation + clients

### Objetivo

- Extender el guard operativo más allá del bloque master-data inicial para que el remanente sensible de Finance tampoco pueda reabrir writes legacy con el flag apagado.

### Delta de ejecución

- El guard se extendió a:
  - `income/[id]`
  - `expenses/[id]`
  - `income/[id]/payment`
  - `clients` create/update
  - `reconciliation` create/update/match/unmatch/exclude/statements/auto-match
- `economic-indicators.ts` y `exchange-rates.ts` ahora lanzan `FINANCE_BQ_WRITE_DISABLED` antes del write BigQuery fallback cuando PostgreSQL falla y el flag está apagado.
- Las rutas `sync` ya propagan ese `code` en la respuesta.
- Apoyo de subagentes utilizado:
  - un worker cerró `clients`
  - otro worker endureció `exchange-rates`/sync helpers
  - un explorer auditó el bloque `core + reconciliation` para reducir riesgo antes del cambio

### Validación ejecutada

- `pnpm exec vitest run src/app/api/finance/bigquery-write-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec eslint ...` del bloque expandido
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — clients write path Postgres-first

### Objetivo

- Cortar el residual real que quedaba después del fail-closed: `clients/sync` y el writer canónico de `Finance Clients`.

### Delta de ejecución

- Nuevo baseline shared en `src/lib/finance/postgres-store-slice2.ts`:
  - `getFinanceClientProfileFromPostgres()`
  - `upsertFinanceClientProfileInPostgres()`
  - `syncFinanceClientProfilesFromPostgres()`
- `Finance Clients` write path ya opera Postgres-first en:
  - `src/app/api/finance/clients/route.ts`
  - `src/app/api/finance/clients/[id]/route.ts`
  - `src/app/api/finance/clients/sync/route.ts`
- Compatibilidad preservada:
  - si PostgreSQL no está disponible y `FINANCE_BIGQUERY_WRITE_ENABLED=true`, las rutas todavía conservan fallback BigQuery transicional
  - si el flag está apagado, responden `503` con `FINANCE_BQ_WRITE_DISABLED`
- Apoyo de subagentes utilizado:
  - explorer para confirmar el estado real de `Finance Clients`
  - worker de tests para el carril `clients`

### Validación ejecutada

- `pnpm exec vitest run src/app/api/finance/bigquery-write-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec eslint src/app/api/finance/bigquery-write-cutover.test.ts src/app/api/finance/clients/route.ts 'src/app/api/finance/clients/[id]/route.ts' src/app/api/finance/clients/sync/route.ts src/lib/finance/postgres-store-slice2.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Residual explícito

- El remanente de `Finance Clients` ya no es write path:
  - solo queda fallback transicional de compatibilidad cuando el carril Postgres no está disponible
  - `TASK-050` ya no queda abierta por request path principal

## Sesión 2026-03-30 — cierre del read path de Finance Clients

### Objetivo

- Cortar `GET /api/finance/clients` y `GET /api/finance/clients/[id]` al grafo Postgres-first para dejar `Finance Clients` realmente alineado con `TASK-050`.

### Delta de ejecución

- `GET /api/finance/clients` ya intenta resolver primero desde:
  - `greenhouse_core.clients`
  - `greenhouse_finance.client_profiles`
  - `greenhouse_crm.companies`
  - `greenhouse_core.v_client_active_modules`
  - `greenhouse_finance.income`
- `GET /api/finance/clients/[id]` ya intenta resolver primero desde:
  - `greenhouse_core.clients`
  - `greenhouse_finance.client_profiles`
  - `greenhouse_crm.companies`
  - `greenhouse_crm.deals`
  - `greenhouse_core.v_client_active_modules`
  - `greenhouse_finance.income`
- BigQuery queda solo como fallback explícito cuando el read-path Postgres no está disponible.
- Apoyo de subagentes utilizado:
  - explorer para mapear el drift real del read path
  - worker para sugerir cobertura de tests del cutover

### Validación ejecutada

- `pnpm exec eslint src/app/api/finance/clients/route.ts 'src/app/api/finance/clients/[id]/route.ts' src/app/api/finance/clients/sync/route.ts src/lib/finance/postgres-store-slice2.ts src/app/api/finance/bigquery-write-cutover.test.ts`
- `pnpm exec vitest run src/app/api/finance/bigquery-write-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Residual explícito

- `Finance Clients` conserva fallback BigQuery transicional por compatibilidad.
- El request path principal ya no depende de BigQuery; el remanente dejó de ser blocker arquitectónico.

## Sesión 2026-03-30 — hardening del resolver canónico Finance Clients

### Objetivo

- Evitar que `resolveFinanceClientContext()` tape errores arbitrarios del carril canónico detrás de fallback BigQuery.

### Delta de ejecución

- `src/lib/finance/canonical.ts` ahora consulta `shouldFallbackFromFinancePostgres()` antes de caer a BigQuery.
- Nuevo test canónico:
  - `src/lib/finance/canonical.test.ts`
- Comportamiento fijado:
  - Postgres-first cuando el carril está sano
  - fallback BigQuery solo para errores permitidos de readiness/conectividad
  - errores no permitidos ya no se esconden detrás de compatibilidad legacy

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/bigquery-write-cutover.test.ts src/app/api/finance/clients/read-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec eslint src/lib/finance/canonical.ts src/lib/finance/canonical.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-30 — arranque de TASK-166 Finance BigQuery write cutover

### Objetivo

- Empezar el cutover real del write fallback legacy de Finance sin big bang, usando `FINANCE_BIGQUERY_WRITE_ENABLED` como guard operativo verdadero.

### Delta de ejecución

- Nueva task activa:
  - `docs/tasks/complete/TASK-166-finance-bigquery-write-cutover.md`
- Helper nuevo:
  - `src/lib/finance/bigquery-write-flag.ts`
- Primer slice runtime:
  - `POST /api/finance/income`
  - `POST /api/finance/expenses`
  - si PostgreSQL falla y el flag está apagado, responden `503` con `FINANCE_BQ_WRITE_DISABLED`

### Pendiente inmediato

- expandir el inventario/wiring a writes secundarios:
  - `expenses/bulk`
  - `accounts`
  - `suppliers`
  - `exchange-rates`
- validar manualmente en staging con `FINANCE_BIGQUERY_WRITE_ENABLED=false`

## Sesión 2026-03-30 — reconciliación final de TASK-138 + TASK-139

### Objetivo

- Contrastar ambas tasks ya cerradas contra el repo real y resolver el remanente técnico auténtico sin reabrir lanes artificialmente.

### Delta de ejecución

- `TASK-138`:
  - se confirmó que el repo actual ya absorbió la adopción UI/runtime que el doc seguía marcando como “pendiente”
  - el drift quedó saneado en la task markdown
- `TASK-139`:
  - `src/lib/finance/dte-emission-queue.ts` ahora preserva `dte_type_code`
  - `src/app/api/cron/dte-emission-retry/route.ts` ya llama `emitDte()` real, no stub
  - `src/app/api/finance/income/[id]/emit-dte/route.ts` y `src/app/api/finance/income/batch-emit-dte/route.ts` encolan fallos retryable
  - nuevo test:
    - `src/app/api/cron/dte-emission-retry/route.test.ts`

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/dte-emission-queue.test.ts src/app/api/cron/dte-emission-retry/route.test.ts`
- `pnpm exec eslint src/lib/finance/dte-emission-queue.ts src/lib/finance/dte-emission-queue.test.ts src/app/api/cron/dte-emission-retry/route.ts src/app/api/cron/dte-emission-retry/route.test.ts 'src/app/api/finance/income/[id]/emit-dte/route.ts' 'src/app/api/finance/income/batch-emit-dte/route.ts'`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — cierre formal de TASK-162

### Objetivo

- Ejecutar el último cut técnico sobre consumers residuales del bridge legacy y cerrar `TASK-162` como baseline institucional.

### Delta de ejecución

- Residual runtime cortado:
  - `src/lib/person-360/get-person-finance.ts`
  - `Person Finance` ya usa `greenhouse_serving.commercial_cost_attribution` para explain por miembro/período
- Residual técnico secundario cortado:
  - `src/lib/finance/payroll-cost-allocation.ts`
  - ahora resume `readCommercialCostAttributionByClientForPeriod()`
- Test nuevo:
  - `src/lib/person-360/get-person-finance.test.ts`
- Lifecycle cerrado:
  - `docs/tasks/complete/TASK-162-canonical-commercial-cost-attribution.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- Documentación viva alineada:
  - `project_context.md`
  - `changelog.md`

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/payroll-cost-allocation.test.ts src/lib/person-360/get-person-finance.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/commercial-cost-attribution/insights.test.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec eslint src/lib/finance/payroll-cost-allocation.ts src/lib/finance/payroll-cost-allocation.test.ts src/lib/person-360/get-person-finance.ts src/lib/person-360/get-person-finance.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — consolidación arquitectónica de TASK-162

### Objetivo

- Dejar la estrategia de cutover de `commercial cost attribution` consolidada en arquitectura canónica, no solo en la task operativa.

### Delta de ejecución

- Se actualizaron las fuentes canónicas:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- Quedó explícito que:
  - `greenhouse_serving.commercial_cost_attribution` es la truth layer canónica
  - `operational_pl_snapshots` y `member_capacity_economics` siguen siendo serving derivado por consumer
  - `client_labor_cost_allocation` queda como bridge/input histórico y no como contrato consumidor nuevo

### Validación ejecutada

- `git diff --check`

## Sesión 2026-03-30 (session 2) — TASK-165 + TASK-164 + ISSUE-002

### Objetivo

- Implementar completamente TASK-165 (Nubox Full Data Enrichment) y TASK-164 (Purchase Orders & HES).
- Cerrar ISSUE-002 (Nubox sync data integrity).

### Delta de ejecución

- **TASK-165** cerrada — 33 archivos, 2,746 líneas:
  - Schema: 16 columnas nuevas en income + 16 en expenses + tabla `income_line_items`
  - Sync: mappers conformed capturan TODOS los campos Nubox, sync migrado de DELETE-all a upsert selectivo
  - Cron: `/api/cron/nubox-balance-sync` cada 4h con detección de divergencias
  - Events: `finance.sii_claim.detected`, `finance.balance_divergence.detected`
  - Cross-module: PnL filtra annulled expenses, 2 data quality checks nuevos
  - UI: PDF/XML links en income, SII chips + annulled badge en expenses
- **TASK-164** implementada — 19 archivos nuevos:
  - `purchase_orders`: CRUD + reconciliación de saldo + auto-expire
  - `service_entry_sheets`: lifecycle draft→submitted→approved/rejected
  - 9 API routes, 7 event types, 4 notification mappings
  - `PurchaseOrdersListView` con progress bars, `HesListView` con status chips
- **ISSUE-002** cerrada — los 3 fixes aplicados

### DDL ejecutados

- `scripts/setup-nubox-enrichment.sql` — ejecutado en Cloud SQL (greenhouse_app)
- `scripts/setup-postgres-purchase-orders.sql` — ejecutado en Cloud SQL (greenhouse_app)
- GRANTs corregidos a `greenhouse_runtime` (el DDL original decía `runtime`)

### Pendiente inmediato

- Re-ejecutar Nubox sync para poblar los campos enriquecidos con los nuevos datos
- Verificar visualmente en staging que las nuevas columnas aparecen en las vistas

### Validación ejecutada

- `npx tsc --noEmit` — sin errores
- `pnpm test` — 138/139 test files passed (1 pre-existing failure)
- `pnpm build` — exitoso
- Committed y pushed a `develop`

## Sesión 2026-03-30 — TASK-141 contrato canónico + bridge inicial en /admin/views

### Objetivo

- Convertir `TASK-141` desde contrato endurecido a primer slice real de implementación, sin romper carriles reactivos ni llaves operativas.

### Delta de ejecución

- Nueva fuente canónica del contrato:
  - `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- Nuevo baseline shared:
  - `src/lib/identity/canonical-person.ts`
  - `src/lib/identity/canonical-person.test.ts`
- Contrato runtime que ya expone el resolver:
  - `identityProfileId`
  - `memberId`
  - `userId`
  - `canonicalEmail`
  - `portalAccessState`
  - `resolutionSource`
- Primer consumer adoptado:
  - `src/lib/admin/get-admin-view-access-governance.ts`
  - `src/lib/admin/view-access-store.ts`
  - `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- Postura aplicada en el cut:
  - `/admin/views` ahora muestra `identityProfileId`, `memberId`, `portalAccessState` y `resolutionSource`
  - overrides y auditoría siguen `userId`-scoped
  - no se tocaron payloads de outbox, webhook envelopes ni serving member-scoped
- Documentación viva actualizada:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
  - `docs/tasks/in-progress/TASK-141-canonical-person-identity-consumption.md`
  - `docs/tasks/to-do/TASK-140-admin-views-person-first-preview.md`
  - `docs/tasks/to-do/TASK-134-notification-identity-model-hardening.md`
  - `docs/tasks/in-progress/TASK-162-canonical-commercial-cost-attribution.md`
  - `docs/tasks/README.md`
  - `project_context.md`
  - `changelog.md`

### Validación ejecutada

- `pnpm exec vitest run src/lib/identity/canonical-person.test.ts`
- `pnpm exec eslint src/lib/identity/canonical-person.ts src/lib/identity/canonical-person.test.ts src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- `TASK-140`:
  - mover el universo base del preview desde principal portal a persona previewable real
- `TASK-134`:
  - terminar de alinear notifications y callers legacy sobre el contrato shared
- `TASK-162`:
  - ya puede apoyarse en este contrato sin reabrir persona/member/user, preservando `member_id` como llave operativa de costo

## Sesión 2026-03-30 — cierre formal de `TASK-141` en `develop`

### Objetivo

- Cerrar la lane institucional sin mover de rama y sin mezclar el trabajo paralelo de Finance ya abierto en `develop`.

### Delta de ejecución

- `TASK-141` se reclasificó de `in-progress` a `complete`.
- El archivo canónico quedó en:
  - `docs/tasks/complete/TASK-141-canonical-person-identity-consumption.md`
- Se actualizaron:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `project_context.md`
  - `changelog.md`
- Criterio de cierre explicitado:
  - la lane queda cerrada por contrato institucional + resolver shared + primera adopción real
  - la adopción restante se delega formalmente a `TASK-140`, `TASK-134` y `TASK-162`

### Validación ejecutada

- `git diff --check`

### Riesgo / coordinación

- `develop` mantiene además cambios paralelos sin commitear en Finance:
  - `src/app/api/finance/dashboard/pnl/route.ts`
  - `src/app/api/finance/dashboard/summary/route.ts`
  - `src/app/api/finance/income/route.ts`
  - `src/lib/finance/postgres-store-slice2.ts`
  - `src/views/greenhouse/finance/IncomeListView.tsx`
- No se deben mezclar en este cierre de `TASK-141`; stage/commit selectivo solamente.

## Sesión 2026-03-30 — `TASK-140` slice 1 persona-first en `/admin/views`

### Objetivo

- Empezar implementación real de `TASK-140` sin reabrir `TASK-141` y sin romper overrides, auditoría ni `authorizedViews`.

### Delta de ejecución

- Nueva pieza shared:
  - `src/lib/admin/admin-preview-persons.ts`
  - `src/lib/admin/admin-preview-persons.test.ts`
- `getAdminViewAccessGovernance()` y `view-access-store` ya construyen el universo previewable agrupando por:
  - `identityProfileId` cuando existe
  - fallback `user:<userId>` cuando todavía no hay bridge persona completo
- `/admin/views` ya cambió el selector y el framing del preview:
  - ahora habla de `persona previewable`
  - muestra si el caso es `persona canónica` o `principal portal`
  - conserva el principal portal compatible para guardar overrides
- Guardrail preservado:
  - `user_view_overrides`, `view_access_log`, `authorizedViews` y la resolución runtime siguen `userId`-scoped

### Validación ejecutada

- `pnpm exec vitest run src/lib/admin/admin-preview-persons.test.ts`
- `pnpm exec eslint src/lib/admin/admin-preview-persons.ts src/lib/admin/admin-preview-persons.test.ts src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Validación manual visual en `/admin/views` para confirmar copy, chips y casos borde.
- Decidir si un siguiente slice debe abrir el universo a personas sin principal portal persistible o si ese caso queda fuera del preview editable.
- UX hardening ya aplicado en este mismo carril:
  - copy del panel alineado a `persona previewable`
  - alertas explícitas para `active`, `inactive`, `missing_principal` y `degraded_link`
  - roadmap tab ya refleja los remanentes reales de `TASK-140`

## Sesión 2026-03-30 — cierre formal de `TASK-140`

### Objetivo

- Cerrar el consumer `/admin/views` como adopción real de la policy persona-first sin reabrir `TASK-141` ni romper el runtime user-scoped existente.

### Delta de ejecución

- `TASK-140` se movió de `in-progress` a `complete`.
- El archivo canónico quedó en:
  - `docs/tasks/complete/TASK-140-admin-views-person-first-preview.md`
- Se actualizaron:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `changelog.md`
- Criterio de cierre explicitado:
  - el selector y preview ya son persona-first cuando existe `identityProfileId`
  - `userId` quedó preservado como llave operativa de compatibilidad para overrides, auditoría y `authorizedViews`
  - el remanente pasa a policy/validación continua, no a gap estructural del consumer

### Validación ejecutada

- `git diff --check`

## Sesión 2026-03-30 — `TASK-134` slice 1 shared recipients en Notifications

### Objetivo

- Empezar implementación real de `TASK-134` sin tocar llaves `userId`-scoped de inbox/preferences/dedupe y sin romper el carril reactivo webhook/projections.

### Delta de ejecución

- `TASK-134` ya quedó en `in-progress`.
- Nuevo helper shared:
  - `src/lib/notifications/person-recipient-resolver.ts`
    - `getRoleCodeNotificationRecipients(roleCodes)`
- Adopción inicial en callers legacy/duplicados:
  - `src/lib/sync/projections/notifications.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
- Efecto del slice:
  - recipients role-based ya no repiten mapping ad hoc desde `greenhouse_serving.session_360`
  - projections y webhook consumers ya comparten el mismo shape persona/member/user/email/fullName
  - `NotificationService`, `notification_preferences`, `notifications` y `notification_log` siguen intactos en su semántica `userId`-scoped / recipient-key-scoped

### Validación ejecutada

- `pnpm exec vitest run src/lib/notifications/person-recipient-resolver.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint src/lib/notifications/person-recipient-resolver.ts src/lib/notifications/person-recipient-resolver.test.ts src/lib/webhooks/consumers/notification-recipients.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/sync/projections/notifications.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Cerrar el resto de callers legacy de Notifications que todavía no consuman el contrato shared.
- Documentar el contrato transversal final de Notifications para poder cerrar `TASK-134` sin mover las fronteras `userId`-scoped del sistema.

## Sesión 2026-03-30 — cierre formal de `TASK-134`

### Objetivo

- Cerrar la lane de hardening de identidad en Notifications sin cambiar la semántica `userId`-scoped del sistema.

### Delta de ejecución

- `TASK-134` se movió a `complete`.
- La institucionalización final quedó reflejada en:
  - `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/tasks/to-do/TASK-128-webhook-consumers-roadmap.md`
- Criterio de cierre explicitado:
  - recipient resolution `person-first` ya es shared en projections y webhook consumers
  - `identity_profile` es la raíz humana, pero `userId` sigue siendo la llave operativa de inbox/preferences/audit/dedupe
  - no queda gap estructural abierto del recipient model; los remanentes futuros pasan a consumers de dominio, no a la base transversal de Notifications

### Validación ejecutada

- `pnpm exec vitest run src/lib/notifications/person-recipient-resolver.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint src/lib/notifications/person-recipient-resolver.ts src/lib/notifications/person-recipient-resolver.test.ts src/lib/webhooks/consumers/notification-recipients.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/sync/projections/notifications.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — hardening urgente de Postgres por incidentes TLS en cron

### Objetivo

- Cortar la cascada de fallos repetidos en `outbox-publish` y `webhook-dispatch` ante errores TLS/SSL transitorios de PostgreSQL en `production`.

### Diagnóstico

- Slack mostró errores repetidos `SSL routines:ssl3_read_bytes:sslv3 alert bad certificate`.
- Verificación operativa local:
  - `production` sí tiene `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
  - Cloud SQL sigue con `sslMode=ENCRYPTED_ONLY`
  - el runtime usa Cloud SQL Connector por diseño; no hay evidencia de que el issue venga de falta de env del connector
- Riesgo detectado en código:
  - `src/lib/postgres/client.ts` cacheaba `__greenhousePostgresPoolPromise` incluso si la creación del pool fallaba una vez
  - un fallo TLS/handshake podía quedar pegado en el runtime caliente y repetir alertas hasta el próximo cold start

### Delta de ejecución

- `src/lib/postgres/client.ts` ahora:
  - normaliza envs boolean/number con `trim()`
  - resetea el pool global si `buildPool()` falla
  - cierra pool/connector ante errores emitidos por `pg`
  - reintenta una vez queries y transacciones cuando detecta fallos retryable de conexión/TLS

### Validación ejecutada

- `pnpm exec eslint src/lib/postgres/client.ts`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Desplegar este hardening para observar si desaparece el spam de cron failures en `production`.
- Si reaparece el mismo error después del deploy, revisar ya a nivel infra/Cloud SQL Connector rotation y runtime logs productivos.

## Sesión 2026-03-30 — Hardening canónico de atribución comercial para Cost Intelligence

### Objetivo

- Contrastar `TASK-162` contra la arquitectura y el código real para decidir si la lane ya estaba lista o si necesitaba endurecerse antes del cutover.

### Delta de ejecución

- El contraste confirmó drift semántico real:
  - `computeOperationalPl()` mezcla `client_labor_cost_allocation` para labor y `member_capacity_economics` para overhead
  - `client_economics` y `organization-economics` todavía dependen del bridge histórico
  - `auto-allocation-rules.ts` mantenía heurísticas locales de clasificación
- Se endureció la fuente canónica del dominio:
  - `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `TASK-162` se movió a `in-progress` con slice 1 explícito:
  - `docs/tasks/in-progress/TASK-162-canonical-commercial-cost-attribution.md`
- Primer módulo shared implementado:
  - `src/lib/commercial-cost-attribution/assignment-classification.ts`
  - `src/lib/commercial-cost-attribution/assignment-classification.test.ts`
- Slice 2 ya implementado:
  - `src/lib/commercial-cost-attribution/member-period-attribution.ts`
  - `src/lib/commercial-cost-attribution/member-period-attribution.test.ts`
  - combina `member_capacity_economics` + `client_labor_cost_allocation` por `member_id + período`
  - expone costo base, labor comercial, internal load y overhead comercialmente atribuible
- Primer consumer ya cortado a la capa intermedia:
  - `src/lib/cost-intelligence/compute-operational-pl.ts`
  - `src/lib/cost-intelligence/compute-operational-pl.test.ts`
- Consumers adicionales ya alineados:
  - `src/lib/finance/postgres-store-intelligence.ts`
  - `src/lib/account-360/organization-economics.ts`
  - ambos dejaron de depender directamente de `computeClientLaborCosts()`
- Slice 4 ya implementado:
  - `src/lib/commercial-cost-attribution/store.ts`
  - `src/lib/commercial-cost-attribution/store.test.ts`
  - tabla `greenhouse_serving.commercial_cost_attribution`
  - `member-period-attribution.ts` ahora hace read serving-first con fallback
  - `materializeOperationalPl()` rematerializa primero `commercial_cost_attribution`
- Slice 5 ya implementado:
  - `src/lib/sync/projections/commercial-cost-attribution.ts`
  - `src/lib/sync/projections/commercial-cost-attribution.test.ts`
  - `src/lib/sync/projections/index.ts`
  - `src/lib/sync/event-catalog.ts`
  - la capa ya tiene refresh reactivo dedicado y evento `accounting.commercial_cost_attribution.materialized`
- Slice 6 ya implementado:
  - `src/lib/commercial-cost-attribution/insights.ts`
  - `src/lib/commercial-cost-attribution/insights.test.ts`
  - `src/app/api/cost-intelligence/commercial-cost-attribution/health/route.ts`
  - `src/app/api/cost-intelligence/commercial-cost-attribution/explain/[year]/[month]/[clientId]/route.ts`
  - `src/app/api/cron/materialization-health/route.ts`
  - la capa ya tiene health semántico por período, explain por cliente y freshness visible en materialization health
- Adopción inicial sin big bang:
  - `src/lib/team-capacity/internal-assignments.ts` ahora reexporta la regla shared
  - `src/lib/finance/auto-allocation-rules.ts` ya filtra assignments con el classifier shared
- Guardrail aplicado:
  - no se tocó todavía `client_labor_cost_allocation`
  - no se tocó serving de `operational_pl`
  - no se mezcló con los cambios paralelos abiertos en Finance/Nubox

### Validación ejecutada

- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.test.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/team-capacity/internal-assignments.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.ts src/lib/finance/auto-allocation-rules.test.ts`
- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/sync/projections/operational-pl.test.ts src/lib/sync/projections/client-economics.test.ts src/lib/sync/event-catalog.test.ts`
- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/commercial-cost-attribution/insights.test.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/sync/projections/operational-pl.test.ts src/lib/sync/projections/client-economics.test.ts src/lib/sync/event-catalog.test.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/finance/postgres-store-intelligence.ts src/lib/account-360/organization-economics.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/finance/postgres-store-intelligence.ts src/lib/account-360/organization-economics.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/sync/projections/commercial-cost-attribution.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/finance/postgres-store-intelligence.ts src/lib/account-360/organization-economics.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/commercial-cost-attribution/insights.ts src/lib/commercial-cost-attribution/insights.test.ts src/lib/sync/projections/commercial-cost-attribution.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts src/app/api/cost-intelligence/commercial-cost-attribution/health/route.ts src/app/api/cost-intelligence/commercial-cost-attribution/explain/[year]/[month]/[clientId]/route.ts src/app/api/cron/materialization-health/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Limitación de validación

- `pnpm exec tsc --noEmit --pretty false` falla por cambios paralelos ajenos:
  - `src/app/(dashboard)/finance/hes/page.tsx`
  - `src/app/(dashboard)/finance/purchase-orders/page.tsx`
  - faltan views `HesListView` y `PurchaseOrdersListView`
- La lane `TASK-162` no introdujo ese fallo.

### Pendiente inmediato

- Siguiente slice de `TASK-162`:
  - revisar si hace falta projection domain propio o si `cost_intelligence` basta como partición operativa
  - decidir si el explain surface necesita UI en `/finance/intelligence`
  - luego evaluar cierre formal del bridge legacy como contrato interno en vez de consumer API

### Objetivo

- Corregir la divergencia entre la FTE visible en `Agency > Team` / Person 360 y la atribución comercial usada por Finance / Cost Intelligence.
- Dejar la regla documentada para que no vuelva a bifurcarse por consumer.

### Delta de ejecución

- Se creó una regla shared en:
  - `src/lib/team-capacity/internal-assignments.ts`
- Esa regla ya se reutiliza en:
  - `src/app/api/team/capacity-breakdown/route.ts`
  - `src/lib/sync/projections/member-capacity-economics.ts`
  - `src/lib/finance/auto-allocation-rules.ts`
  - `scripts/setup-postgres-finance-intelligence-p2.sql`
  - `src/lib/cost-intelligence/compute-operational-pl.ts`
- Semántica consolidada:
  - `space-efeonce`, `efeonce_internal` y `client_internal` siguen siendo válidos para carga operativa interna
  - no participan como cliente comercial en labor attribution, auto-allocation ni snapshots de `operational_pl`
- También se endureció el serving runtime:
  - `greenhouse_runtime` requiere `DELETE` acotado sobre `greenhouse_serving.operational_pl_snapshots`
  - el materializador lo usa solo para purgar scopes obsoletos de la misma revisión antes del upsert

### Pendiente inmediato

- Reaplicar `setup-postgres-cost-intelligence.sql`
- Re-materializar `operational_pl` y verificar que filas stale de `Efeonce` desaparezcan del período afectado
- Cerrar con validación + documentación final + commit/push

## Sesión 2026-03-30 — Documentación de la capa canónica de commercial cost attribution

### Objetivo

- Dejar explícito en docs que la consolidación pendiente ya no debe pensarse como “más lógica dentro de Cost Intelligence”, sino como una capa canónica nueva de plataforma ya decidida.

### Delta de ejecución

- Se documentó que la capa de `commercial cost attribution` debe ubicarse entre:
  - Payroll / Team Capacity / Finance base
  - y Finance / Cost Intelligence / Agency / People / Home / Nexa
- `TASK-162` queda como la lane institucional para esa capa.

### Pendiente inmediato

- Mover `TASK-162` a `in-progress` cuando empecemos implementación real.
- Usarla como prerequisito semántico antes de profundizar más `Agency Economics`, `Service P&L` y scorecards financieros.

## Sesión 2026-03-30 — TASK-071 slice 1-3 consumers distribuidos

### Objetivo

- Ejecutar el primer corte real de `TASK-071` contrastando primero arquitectura, consumers y serving ya implementado del módulo Cost Intelligence.

### Delta de ejecución

- Agency:
  - `src/lib/agency/agency-finance-metrics.ts` ya no calcula este consumer desde `greenhouse_finance.income` / `expenses`; ahora lee `greenhouse_serving.operational_pl_snapshots`.
  - `src/components/agency/SpaceCard.tsx` ya puede mostrar período del snapshot y si el margen corresponde a cierre efectivo.
- Organization 360:
  - `src/lib/account-360/organization-economics.ts` ya es serving-first para `organization` y breakdown `client`, con fallback al compute legacy si falta snapshot.
  - `src/views/greenhouse/organizations/tabs/OrganizationEconomicsTab.tsx` ya muestra chips de cierre por período y badge del período actual.
- People 360:
  - `src/lib/person-360/get-person-finance.ts` ahora publica `latestCostSnapshot`.
  - `src/views/greenhouse/people/tabs/PersonFinanceTab.tsx` suma card `Costo total del período` con desglose y badge de cierre.
  - `src/app/api/people/[memberId]/finance-impact/route.ts` y `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx` ya muestran período + closure awareness.
- Home:
  - `src/lib/home/get-home-snapshot.ts` ahora resuelve `financeStatus` para roles internos/finance.
  - `src/views/greenhouse/home/HomeView.tsx` reemplaza placeholders por estado real de cierre/margen.

### Validación ejecutada

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/agency/agency-finance-metrics.ts src/lib/account-360/organization-economics.ts src/views/greenhouse/organizations/tabs/OrganizationEconomicsTab.tsx src/types/people.ts src/lib/person-360/get-person-finance.ts 'src/app/api/people/[memberId]/finance-impact/route.ts' src/views/greenhouse/people/tabs/PersonFinanceTab.tsx src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx src/types/home.ts src/lib/home/get-home-snapshot.ts src/app/api/home/snapshot/route.ts src/views/greenhouse/home/HomeView.tsx`

### Limitación de validación

- `pnpm build` quedó inestable en esta sesión por locks/artifacts de `.next` (`Unable to acquire lock` y luego `ENOENT` sobre `_buildManifest.js.tmp`), incluso después de limpiar `.next`.
- No apareció error de tipos del slice después de `tsc`; el ruido observado fue del runtime/build workspace de Next en esta máquina.

### Pendiente inmediato

- Validación visual real del slice en Agency / Organization 360 / People / Home.
- Nexa ya recibe el mismo `financeStatus` resumido en `lightContext`; el remanente ya no es funcional sino de validación/cierre formal.

## Sesión 2026-03-30 — TASK-070 validación visual + fix de fecha operativa

### Objetivo

- Validar visualmente `/finance/intelligence` con sesión local admin.
- Confirmar que el “último día hábil” realmente venga del calendario operativo y no quede roto en UI.

### Delta de ejecución

- Se usó sesión local firmada vía `scripts/mint-local-admin-jwt.js` para entrar al portal en dev y validar `/finance/intelligence`.
- Resultado:
  - la API `/api/cost-intelligence/periods?limit=12` ya devolvía períodos correctos y `lastBusinessDayOfTargetMonth` calculado desde el calendario operativo
  - el bug estaba en display: la UI parseaba `YYYY-MM-DD` con `new Date(...)` y corría la fecha por timezone
- Fix aplicado:
  - `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx`
  - `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx`
- Validación visual adicional:
  - la tabla de períodos, el expandible inline de P&L y el diálogo de cierre funcionan con datos reales
  - Home ya muestra `financeStatus` usable
  - People 360 ya muestra `latestCostSnapshot` y closure awareness
  - Organization 360 no pudo validarse bien en este entorno por falta de datos
  - Agency no mostró issue técnico; el consumer financiero está en `SpaceCard`, no en cualquier tabla listada

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx`
- `pnpm exec eslint src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Seguir validación visual de Agency/Organization 360 con dataset más representativo.
- Decidir si el lifecycle de `TASK-070` y `TASK-071` se normaliza en docs, porque hoy sus archivos viven en `complete/` pero varias notas todavía las describen como lanes abiertas.

## Sesión 2026-03-30 — Consolidación documental de Cost Intelligence

### Objetivo

- Dejar el módulo documentado a todo nivel antes del siguiente corte funcional.

### Delta de ejecución

- Arquitectura master actualizada:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Arquitectura especializada actualizada:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- Índice de docs actualizado:
  - `docs/README.md`
- Pipeline de tasks reconciliado:
  - `docs/tasks/README.md`
  - `docs/tasks/in-progress/TASK-070-cost-intelligence-finance-ui.md`
- Contexto vivo actualizado:
  - `project_context.md`

### Estado real tras la consolidación

- Cost Intelligence ya debe leerse como módulo operativo distribuido.
- Finance sigue siendo owner del motor financiero central.
- Cost Intelligence ya sirve:
  - `/finance/intelligence`
  - Agency
  - Organization 360
  - People 360
  - Home
  - Nexa

### Pendiente inmediato

- Validación visual final de `TASK-070` y `TASK-071`.
- Cierre formal de fallbacks legacy donde todavía existen por resiliencia.

## Sesión 2026-03-30 — TASK-069 cerrada + arquitectura del módulo endurecida

### Objetivo

- Cerrar formalmente `TASK-069`.
- Dejar el módulo de Cost Intelligence documentado de forma más completa en arquitectura.

### Delta de ejecución

- `TASK-069` pasó de `in-progress` a `complete`.
- Motivo:
  - `operational_pl` ya materializa snapshots por `client`, `space` y `organization`
  - APIs de lectura ya están expuestas
  - smoke reactivo E2E ya quedó validado
  - la UI principal de Finance ya consume este serving como contrato estable
- Arquitectura endurecida en:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- Lo documentado ahora incluye:
  - estado implementado por lanes `067-070`
  - serving canónico
  - invariantes operativos
  - authorization vigente
  - consumers pendientes (`TASK-071`)

### Pendiente inmediato

- `TASK-070` sigue abierta solo por validación visual final y decisión sobre `ClientEconomicsView`.
- El siguiente carril funcional natural ya es `TASK-071`.

## Sesión 2026-03-30 — TASK-070 surface principal de Finance Intelligence implementada

### Objetivo

- Ejecutar `TASK-070` después de contrastarla con:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - APIs reales de `period closure` y `operational_pl`
- Confirmar el orden operativo:
  - `TASK-070` antes de `TASK-071`

### Delta de ejecución

- `TASK-070` pasó a `in-progress`.
- `/finance/intelligence` ya dejó de renderizar `ClientEconomicsView` como portada y ahora usa:
  - `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx`
- La nueva surface ya incluye:
  - hero de cierre operativo
  - KPIs agregados de readiness
  - tabla de 12 períodos con semáforos por pata
  - expandible inline de P&L por cliente
  - diálogo de cierre con summary agregado
  - reapertura con razón obligatoria
- Gating aplicado en UI:
  - cierre para `finance_manager` y `efeonce_admin`
  - reapertura solo para `efeonce_admin`

### Validación ejecutada

- `pnpm exec eslint 'src/app/(dashboard)/finance/intelligence/page.tsx' 'src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx'`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Validación visual real del flujo en local/preview antes de cerrar `TASK-070`.
- Decidir si `ClientEconomicsView`:
  - se reubica a otra route/surface de analytics, o
  - queda como legacy candidate para retiro en un follow-on.

## Sesión 2026-03-30 — TASK-069 slice 1 materializado

### Objetivo

- Abrir `TASK-069` con contraste previo duro contra:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - motor canónico de `src/app/api/finance/dashboard/pnl/route.ts`
  - serving actual (`client_labor_cost_allocation`, `member_capacity_economics`, `period_closure_status`)

### Delta de ejecución

- `TASK-069` pasó a `in-progress`.
- Slice implementado:
  - `src/lib/cost-intelligence/pl-types.ts`
  - `src/lib/cost-intelligence/compute-operational-pl.ts`
  - `src/lib/sync/projections/operational-pl.ts`
  - `src/app/api/cost-intelligence/pl/route.ts`
  - `src/app/api/cost-intelligence/pl/[scopeType]/[scopeId]/route.ts`
  - tests:
    - `src/lib/cost-intelligence/compute-operational-pl.test.ts`
    - `src/lib/sync/projections/operational-pl.test.ts`
- Integraciones mínimas cerradas en el mismo slice:
  - registro de `operational_pl` en `src/lib/sync/projections/index.ts`
  - `accounting.margin_alert.triggered` entra al carril reactivo
  - `notification_dispatch` ya lo consume
  - `materialization-health` ya revisa `greenhouse_serving.operational_pl_snapshots`

### Decisiones semánticas aplicadas

- `operational_pl` no redefine el P&L de Finance:
  - revenue cliente = `total_amount_clp - partner_share`
  - costo laboral = `client_labor_cost_allocation`
  - overhead = `member_capacity_economics`
  - `period_closed` / `snapshot_revision` = `period_closure_status`
- Para evitar doble conteo, el carril `direct_expense` excluye `expenses.payroll_entry_id`.
- El primer slice ya materializa `client -> space -> organization`; todavía no reemplaza consumers on-read existentes como `organization-economics.ts`.

### Validación ejecutada

- `pnpm exec vitest run src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/sync/projections/operational-pl.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/sync/projections/operational-pl.ts src/lib/sync/projections/operational-pl.test.ts src/app/api/cost-intelligence/pl/route.ts 'src/app/api/cost-intelligence/pl/[scopeType]/[scopeId]/route.ts' src/lib/sync/projections/notifications.ts src/app/api/cron/materialization-health/route.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts`
- `pnpm build`

### Pendiente inmediato

- Siguiente corte sano:
  - smoke reactivo E2E de `operational_pl`
  - consumers downstream (`TASK-071`)
  - decidir si el cron dedicado `outbox-react-cost-intelligence` ya merece scheduling propio o si seguimos temporalmente con catch-all

## Sesión 2026-03-30 — TASK-069 smoke reactivo E2E validado

### Objetivo

- Cerrar el remanente técnico más claro de `TASK-069`: demostrar que `operational_pl` ya procesa el carril reactivo real, no solo tests y build.

### Delta de ejecución

- Nuevo smoke script:
  - `scripts/smoke-cost-intelligence-operational-pl.ts`
  - comando: `pnpm smoke:cost-intelligence:operational-pl`
- El smoke:
  - detecta un período real con actividad
  - inserta un evento sintético `finance.income.updated`
  - lo publica de forma aislada
  - procesa solo `cost_intelligence`
  - valida reactive log + snapshots materializados + eventos salientes `accounting.pl_snapshot.materialized`

### Evidencia obtenida

- `periodId=2026-03`
- `eventsProcessed=5`
- `eventsFailed=0`
- `projectionsTriggered=6`
- `snapshotCount=3`
- `publishedEventsCount=10`
- handler validado:
  - `operational_pl:finance.income.updated`

### Validación ejecutada

- `pnpm smoke:cost-intelligence:operational-pl`
- `pnpm exec eslint scripts/smoke-cost-intelligence-operational-pl.ts package.json`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El remanente principal de `TASK-069` ya no es de wiring base.
- Siguiente corte lógico:
  - consumers downstream (`TASK-071`)
  - decidir si el cron dedicado de `cost_intelligence` ya merece scheduling propio

## Sesión 2026-03-30 — TASK-068 cerrada

### Completado

- `TASK-068` pasó de `in-progress` a `complete`.
- Criterio de cierre validado:
  - checker de readiness operativo
  - close/reopen operativos
  - projection `period_closure_status` registrada
  - alineación con calendario operativo aplicada
  - smoke reactivo E2E validado
- Chequeo de impacto cruzado ejecutado:
  - `TASK-069` ya no queda bloqueada por remanentes de `TASK-068`
  - `TASK-070` y `TASK-071` pasan a depender solo de `TASK-069`

### Archivos tocados

- `docs/tasks/complete/TASK-068-period-closure-status-projection.md`
- `docs/tasks/README.md`
- `docs/tasks/to-do/TASK-069-operational-pl-projection.md`
- `docs/tasks/to-do/TASK-070-cost-intelligence-finance-ui.md`
- `docs/tasks/to-do/TASK-071-cost-intelligence-cross-module-consumers.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Validación ejecutada

- `pnpm smoke:cost-intelligence:period-closure`
- `pnpm exec vitest run src/lib/cost-intelligence/check-period-readiness.test.ts src/lib/sync/projections/period-closure-status.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint scripts/smoke-cost-intelligence-period-closure.ts src/lib/cost-intelligence/check-period-readiness.ts src/lib/cost-intelligence/check-period-readiness.test.ts`
- `pnpm build`

### Pendiente inmediato

- La continuación natural del carril ya es `TASK-069`.

## Sesión 2026-03-30 — TASK-068 smoke reactivo E2E validado

### Objetivo

- Cerrar el remanente real de `TASK-068` verificando el circuito reactivo del domain `cost_intelligence` con evidencia de runtime, no solo tests unitarios.

### Contexto operativo

- Antes de implementarlo se recontrastó `TASK-068` contra:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - projection registry, outbox consumer y reactive consumer del codebase
- Hallazgo clave:
  - la tarea sí estaba alineada con arquitectura y modelo de datos
  - el único gap real restante era demostrar la cadena `outbox -> reactive -> serving`

### Delta de ejecución

- Se agregó el smoke script:
  - `scripts/smoke-cost-intelligence-period-closure.ts`
  - comando: `pnpm smoke:cost-intelligence:period-closure`
- El smoke inserta un evento sintético `finance.expense.updated`, lo publica de forma aislada y procesa solo `cost_intelligence` con `batchSize: 1`.
- Evidencia obtenida:
  - `periodId=2026-03`
  - `eventsProcessed=1`
  - `eventsFailed=0`
  - `projectionsTriggered=1`
  - row materializada en `greenhouse_serving.period_closure_status`
  - row reactiva registrada en `greenhouse_sync.outbox_reactive_log`

### Validación ejecutada

- `pnpm smoke:cost-intelligence:period-closure`
- `pnpm exec vitest run src/lib/cost-intelligence/check-period-readiness.test.ts src/lib/sync/projections/period-closure-status.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El remanente de `TASK-068` ya no es de wiring técnico.
- Solo queda decidir si vale la pena endurecer `income_status` / `expense_status` a un `partial` más rico cuando Finance exponga señales de completitud más finas.

## Sesión 2026-03-30 — TASK-068 alineada al calendario operativo

### Objetivo

- Evitar que `period closure` nazca como lógica de mes calendario puro y alinearlo al calendario operativo ya existente en Payroll.

### Contexto operativo

- La implementación inicial de `TASK-068` ya estaba en `develop` y validada.
- Se revisaron explícitamente:
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
  - `src/lib/calendar/operational-calendar.ts`
  - `src/lib/calendar/nager-date-holidays.ts`
  - `src/lib/payroll/auto-calculate-payroll.ts`
  - `src/lib/payroll/current-payroll-period.ts`
- Hallazgo clave:
  - Cost Intelligence ya estaba documentado como consumidor potencial del calendario operativo; convenía alinearlo ahora y no más tarde.

### Delta de ejecución

- `src/lib/cost-intelligence/check-period-readiness.ts` ahora:
  - resuelve contexto operativo con `resolveOperationalCalendarContext()`
  - hidrata feriados vía `loadNagerDateHolidayDateSet()`
  - calcula `currentOperationalMonthKey`, `inCurrentCloseWindow` y `lastBusinessDayOfTargetMonth`
  - expone ese bloque en `operationalCalendar`
- `listRecentClosurePeriods()` ahora asegura presencia del mes operativo actual aunque aún no existan señales materializadas del período.
- `src/lib/cost-intelligence/check-period-readiness.test.ts` ganó cobertura para el bloque `operationalCalendar`.

### Validación ejecutada

- `pnpm exec vitest run src/lib/cost-intelligence/check-period-readiness.test.ts src/lib/sync/projections/period-closure-status.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Sigue pendiente el smoke reactivo end-to-end del domain `cost_intelligence` para cerrar `TASK-068`.

## Sesión 2026-03-30 — TASK-068 Period Closure Status iniciada

### Objetivo

- Implementar el primer slice operativo de Cost Intelligence después de `TASK-067`:
  - checker de readiness mensual
  - projection `period_closure_status`
  - base de APIs close/reopen para ceremonia de cierre

### Contexto operativo

- `TASK-068` ya fue movida a `in-progress`.
- Esta lane se ejecuta apoyándose en:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- Restricción arquitectónica explícita:
  - el readiness y el cierre deben conversar con el lifecycle canónico de Payroll/Finance
  - no inventar semánticas paralelas para el período financiero

### Pendiente inmediato

- mapear columnas canónicas de `payroll_periods`, `income`, `expenses`, `exchange_rates`
- implementar helper `check-period-readiness`
- registrar projection reactiva y su scope `finance_period`

### Delta de ejecución

- El slice principal ya quedó materializado:
  - `src/lib/cost-intelligence/check-period-readiness.ts`
  - `src/lib/cost-intelligence/close-period.ts`
  - `src/lib/cost-intelligence/reopen-period.ts`
  - `src/lib/sync/projections/period-closure-status.ts`
  - rutas `GET/POST` bajo `/api/cost-intelligence/periods/**`
- Decisiones semánticas implementadas:
  - income mensual se lee por `invoice_date`
  - expenses mensuales se leen por `COALESCE(document_date, payment_date)`
  - FX mensual se considera por `rate_date`
  - payroll gating usa `payroll_periods.status`, con `exported` como condición default de readiness
- Validación pasada:
  - tests del carril `cost-intelligence`
  - `tsc --noEmit`
  - `pnpm build`
- Remanente inmediato:
  - smoke reactivo E2E del projection domain
  - evaluar si Finance amerita una semántica `partial` más rica para income/expenses antes de cerrar `TASK-068`

## Sesión 2026-03-30 — TASK-067 Cost Intelligence Foundation iniciada

### Objetivo

- bootstrap técnico de Cost Intelligence:
  - schema `greenhouse_cost_intelligence`
  - serving tables base
  - eventos `accounting.*`
  - domain `cost_intelligence` en projections
  - cron route dedicada

### Contexto operativo

- Esta lane se ejecuta después de revisar:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- Hay un cambio ajeno ya abierto y no mezclado en:
  - `src/app/api/finance/dashboard/summary/route.ts`

### Pendiente inmediato

- ninguno dentro del alcance de `TASK-067`; la continuation natural es `TASK-068` / `TASK-069`

### Delta de ejecución

- El bootstrap ya quedó implementado y validado:
  - `pnpm setup:postgres:cost-intelligence`
  - `pnpm pg:doctor --profile=runtime`
  - `pnpm pg:doctor --profile=migrator`
  - `pnpm exec eslint ...`
  - `pnpm build`
- Resultado:
  - schema `greenhouse_cost_intelligence` visible para runtime y migrator
  - route `outbox-react-cost-intelligence` compila y entra al build
  - `supportedDomains` ya incluye `cost_intelligence`
- El remanente del smoke local ya quedó resuelto:
  - raíz del problema: `GOOGLE_APPLICATION_CREDENTIALS_JSON` podía traer `private_key` PEM colapsada en una sola línea
  - fix aplicado en `src/lib/google-credentials.ts` reconstruyendo los saltos de línea del PEM antes de instanciar `google-auth-library`
  - cobertura agregada en `src/lib/google-credentials.test.ts`
  - smoke local autenticado de `/api/cron/outbox-react-cost-intelligence` ya responde `200`
- Decisión operativa vigente:
  - `TASK-067` queda cerrada para su alcance
  - la cron dedicada en `vercel.json` puede seguir diferida mientras `068/069` aún no registran projections reales; ya no por bloqueo OpenSSL/JWT
- Alineación nueva obligatoria para el siguiente slice:
  - `TASK-068` y `TASK-069` deben respetar también `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `TASK-069` no redefine el P&L; materializa y distribuye por scope la semántica financiera canónica ya documentada por Finance

## Sesión 2026-03-30 — hardening documental para `TASK-141` sin romper reactive lanes

### Completado

- Se revisaron explícitamente los carriles sensibles antes de profundizar el cutover `person-first`:
  - `src/lib/sync/publish-event.ts`
  - `src/lib/webhooks/dispatcher.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
  - `src/lib/notifications/person-recipient-resolver.ts`
  - `src/lib/notifications/notification-service.ts`
  - `src/lib/sync/projections/notifications.ts`
  - `src/lib/sync/projections/client-economics.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `src/lib/sync/projections/person-intelligence.ts`
- Se dejó explícito en arquitectura y en `TASK-141` que:
  - persona canónica no reemplaza a ciegas `member_id` ni `user_id`
  - notificaciones siguen necesitando `userId` para inbox/preferencias cuando aplique
  - ICO, finance y serving por colaborador siguen necesitando `member_id` como clave operativa
  - cualquier cutover futuro debe ser gradual, observable y con compatibilidad transicional

### Archivos tocados

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/tasks/to-do/TASK-141-canonical-person-identity-consumption.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Validación ejecutada

- revisión documental/manual del contrato
- lectura explícita de outbox, webhook dispatcher, recipient resolution y projections sensibles

### Pendiente inmediato

- si se implementa `TASK-141`, el primer slice debería crear o endurecer el resolver shared sin cambiar todavía recipient keys ni payloads reactivos
- consumers de notifications, finance e ICO deben verificarse con evidencia antes de cualquier cutover más agresivo

## Sesión 2026-03-30 — documentación arquitectónica del modelo de views

### Completado

- El modelo de gobernanza por vistas ya quedó documentado en arquitectura, no solo en tasks/handoff:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
  - `project_context.md`
- Quedó explícito que:
  - `routeGroups` siguen como boundary broad
  - `authorizedViews` + `view_code` son la capa fina
  - `/admin/views` es la superficie oficial para operar matrix, overrides, expiración, auditoría y preview

### Validación ejecutada

- Validación documental/manual del delta en arquitectura

### Pendiente inmediato

- Si en el siguiente corte nacen más superficies gobernables, ya no deberían documentarse solo en la task; deben actualizar también la arquitectura canónica.

## Sesión 2026-03-30 — decisión explícita: `/home` queda fuera de `view_code`

### Completado

- Se revisó el rol arquitectónico de `/home` y se dejó la decisión documentada en:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
  - `project_context.md`
  - `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- Decisión vigente:
  - `/home` no entra al catálogo gobernable
  - sigue siendo landing transversal interna resuelta por `portalHomePath`

### Razón corta

- Gobernar `/home` como vista revocable hoy metería riesgo innecesario en el punto de entrada base de internos.

## Sesión 2026-03-30 — TASK-136 cierra capability modules cliente y mejora bulk ops en la matrix

### Completado

- Se agregó `cliente.modulos` al catálogo gobernable para cubrir `/capabilities/**`.
- El menú cliente ya no expone `Módulos` solo por `routeGroups`; ahora exige `authorizedViews` vía `cliente.modulos`.
- El layout dinámico `src/app/(dashboard)/capabilities/[moduleId]/layout.tsx` ahora aplica:
  - guard broad por `view_code` (`cliente.modulos`)
  - guard fino por módulo (`verifyCapabilityModuleAccess`)
- `/admin/views` ganó acciones masivas por rol sobre el set filtrado actual:
  - conceder filtradas
  - revocar filtradas
  - restablecer filtradas

### Archivos tocados

- `src/lib/admin/view-access-catalog.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/app/(dashboard)/capabilities/[moduleId]/layout.tsx`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `project_context.md`
- `changelog.md`

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/capabilities/[moduleId]/layout.tsx src/components/layout/vertical/VerticalMenu.tsx src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm build`

### Limitación observada

- `pnpm exec tsc --noEmit --pretty false` falló por drift ajeno en una ruta nueva ya presente en el árbol:
  - `src/app/api/people/[memberId]/finance-impact/route.ts`
- El build completo sí pasó, incluyendo `/capabilities/[moduleId]` y `/admin/views`.

### Pendiente inmediato

- El remanente fino de `TASK-136` ya se parece más a cleanup/cobertura residual que a un gap estructural:
  - decidir si más access points transversales merecen `view_code` propio
  - cerrar rutas profundas que aún hereden por layouts amplios

## Sesión 2026-03-30 — TASK-136 cerrada

### Completado

- `TASK-136` pasó de `in-progress` a `complete`.
- Se validó el criterio de cierre:
  - catálogo gobernable por `view_code` activo
  - persistencia role/user activa
  - expiración, auditoría y notificación reactiva activas
  - `authorizedViews` integrado a sesión, menú y guards
  - `/admin/views` ya funciona como superficie operativa real
- Chequeo de impacto cruzado ejecutado:
  - no se detectaron otras tasks activas o `to-do` que requieran delta inmediato por este cierre
  - el remanente futuro debe abrirse como follow-on, no reabrir artificialmente `TASK-136`

### Archivos tocados

- `docs/tasks/complete/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`

### Validación ejecutada

- Validación documental/manual del cierre y del índice de tasks

## Sesión 2026-03-30 — TASK-136 cierra más rutas terciarias y completa la operabilidad de `/admin/views`

### Completado

- Se ampliaron superficies gobernables client-facing en `view_registry`:
  - `cliente.campanas`
  - `cliente.notificaciones`
- Nuevos guards por layout activos en:
  - `src/app/(dashboard)/campaigns/layout.tsx`
  - `src/app/(dashboard)/campanas/layout.tsx`
  - `src/app/(dashboard)/notifications/layout.tsx`
- `/admin/views` ya no se comporta solo como matrix editable básica:
  - resumen de cambios pendientes vs estado persistido
  - foco sobre vistas que siguen en fallback hardcoded
  - preview con baseline visible, overrides activos, grants extra y revokes efectivos
  - filtro del panel de overrides por `impact / overrides / visibles / todas`
  - lectura más clara de vistas ocultas por revoke

### Archivos tocados

- `src/lib/admin/view-access-catalog.ts`
- `src/app/(dashboard)/campaigns/layout.tsx`
- `src/app/(dashboard)/campanas/layout.tsx`
- `src/app/(dashboard)/notifications/layout.tsx`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `changelog.md`

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/campaigns/layout.tsx src/app/'(dashboard)'/campanas/layout.tsx src/app/'(dashboard)'/notifications/layout.tsx src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- `home` y algunos access points transversales siguen sin `view_code` propio porque todavía conviene decidir si deben ser superficies gobernables o rutas base siempre disponibles para sesión autenticada.
- Quedan cambios ajenos en el árbol fuera de este carril:
  - `src/lib/operations/get-operations-overview.ts`
  - `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
  - `src/lib/finance/dte-emission-queue.test.ts`

## Sesión 2026-03-30 — TASK-136 agrega notificación reactiva al usuario afectado

### Completado

- Los overrides por usuario de `/admin/views` ya no quedan solo en persistencia + auditoría:
  - `saveUserViewOverrides()` ahora compara acceso efectivo antes/después del save
  - cuando el set real de vistas cambia, publica un evento outbox `access.view_override_changed`
- Los overrides expirados ya no quedan como deuda silenciosa:
  - `getPersistedUserOverrides()` limpia overrides vencidos de forma oportunista
  - registra `expire_user` en `greenhouse_core.view_access_log`
  - publica el mismo evento reactivo si la expiración cambia el acceso efectivo del usuario
- El dominio `notifications` ya consume ese evento y notifica al usuario afectado con:
  - resumen de vistas concedidas
  - resumen de vistas revocadas
  - deep-link preferente a la vista recién habilitada o fallback `/dashboard`
- Se agregó cobertura unitaria del projection reactivo para este caso.

### Archivos tocados

- `src/lib/admin/view-access-store.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/sync/projections/notifications.test.ts`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `changelog.md`

### Validación ejecutada

- `pnpm exec vitest run src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint src/lib/admin/view-access-store.ts src/lib/sync/event-catalog.ts src/lib/sync/projections/notifications.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El evento hoy notifica solo cuando cambia el acceso efectivo; ajustes de razón sin cambio de vistas no notifican al usuario, por diseño.
- El siguiente cierre fuerte de `TASK-136` pasa por:
  - modelar más rutas terciarias con `view_code` propio donde todavía exista herencia amplia
  - decidir si conviene exponer en UI un historial más rico de expiraciones/cleanup automático

## Sesión 2026-03-30 — baseline moderna de UI/UX y skills locales

### Completado

- Se auditó la capa local de skills UI de Greenhouse y se confirmó drift operativo:
  - el repo dependía demasiado de skills globales y de una lectura vieja de Vuexy
  - `greenhouse-ui-orchestrator` referenciaba heurísticas no alineadas con el estado actual
- Se agregó `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` como referencia canónica para:
  - first-fold hierarchy
  - densidad y ritmo visual
  - estados empty/partial/warning/error
  - UX writing
  - accessibility baseline
- Se reforzaron las skills locales:
  - `.codex/skills/greenhouse-agent/SKILL.md`
  - `.codex/skills/greenhouse-vuexy-ui-expert/SKILL.md`
  - `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
  - `.codex/skills/greenhouse-ui-orchestrator/SKILL.md`
- Nueva skill creada:
  - `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`

### Fuentes externas sintetizadas

- Android Developers / Material guidance para layouts adaptativos y list-detail
- GOV.UK Design System
- US Web Design System
- Atlassian content design
- W3C WAI / WCAG quick reference

### Pendiente inmediato

- No hay validación de build necesaria por ser un cambio documental/skills, pero conviene probar en los siguientes trabajos UI que la selección automática de skills ya priorice la baseline local.

## Sesión 2026-03-30 — TASK-136 iniciada con slice UI de gobernanza de vistas

### Completado

- `TASK-136` pasó a `in-progress`.
- Se abrió el primer corte real del módulo en `/admin/views` para probar la nueva baseline UI/UX en una superficie compleja de admin governance.
- El slice actual implementa:
  - hero y KPIs de contexto
  - matriz de acceso por vista × rol
  - filtros por sección y tipo de rol
  - preview por usuario de la navegación efectiva
  - cards de siguiente slice para overrides, persistencia configurable y auditoría
- Integración inicial aplicada en:
  - `Admin Center` landing
  - sidebar admin
- Decisión deliberada del slice:
  - la pantalla usa el baseline real actual (`roles` + `routeGroups`) sin fingir todavía `view_registry` persistido
  - esto deja honesto el estado parcial de la lane y permite validar UX antes del cambio fuerte de backend

### Archivos tocados

- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `src/app/(dashboard)/admin/views/page.tsx`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

### Pendiente inmediato

- Validar `lint` del slice nuevo.
- Evaluar si el helper actual debe endurecer la simulación de acceso de admin para empatar exactamente todos los casos especiales del menú vigente.
- Siguiente salto funcional de la task:
  - persistencia `view_registry` / `role_view_assignments`
  - overrides por usuario
  - auditoría y save real

## Sesión 2026-03-30 — TASK-137 iniciada con activación real de la foundation UI

### Completado

- `TASK-137` pasó a `in-progress`.
- Se activó un slice inicial real de la capa UI transversal:
  - `react-hook-form` en `Login`
  - `react-hook-form` en `Forgot Password`
  - `GreenhouseDatePicker`
  - `GreenhouseCalendar`
  - `GreenhouseDragList`
- Primera vista de calendario en repo:
  - `/admin/operational-calendar`
- Primer uso real de drag-and-drop:
  - reorder local de domain cards en `Admin Center`
- Arquitectura UI actualizada para reflejar activación real en:
  - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

### Archivos tocados

- `src/lib/forms/greenhouse-form-patterns.ts`
- `src/views/Login.tsx`
- `src/app/(blank-layout-pages)/auth/forgot-password/page.tsx`
- `src/components/greenhouse/GreenhouseDatePicker.tsx`
- `src/components/greenhouse/GreenhouseCalendar.tsx`
- `src/components/greenhouse/GreenhouseDragList.tsx`
- `src/components/greenhouse/index.ts`
- `src/lib/calendar/get-admin-operational-calendar-overview.ts`
- `src/views/greenhouse/admin/AdminOperationalCalendarView.tsx`
- `src/app/(dashboard)/admin/operational-calendar/page.tsx`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `docs/tasks/in-progress/TASK-137-ui-foundation-activation.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

### Pendiente inmediato

- Correr validación local del slice (`eslint`, `tsc`, `build`, `test`).
- Confirmar si el wrapper de date picker necesita endurecer integración explícita con `Controller` para forms complejos futuros.

## Sesión 2026-03-30 — TASK-136 avanza a persistencia inicial por rol

### Completado

- `/admin/views` ya soporta save real de la matriz role × view.
- Nuevo slice persistido implementado:
  - store Postgres para catálogo de vistas y assignments
  - API admin `POST /api/admin/views/assignments`
  - matrix editable en UI con guardar/restablecer
  - fallback seguro al baseline hardcoded cuando la capa persistida no está lista
- Infra aplicada en dev con:
  - `pnpm setup:postgres:view-access`

### Archivos tocados

- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/view-access-store.ts`
- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `src/app/api/admin/views/assignments/route.ts`
- `scripts/setup-postgres-view-access.sql`
- `scripts/setup-postgres-view-access.ts`
- `package.json`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`

### Validación ejecutada

- `pnpm pg:doctor`
- `pnpm setup:postgres:view-access`
- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/lib/admin/view-access-store.ts src/lib/admin/get-admin-view-access-governance.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/app/api/admin/views/assignments/route.ts scripts/setup-postgres-view-access.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Conectar esta persistencia al runtime de sesión (`TenantContext`, `NextAuth`, guards y menú) para que las vistas guardadas gobiernen acceso real y no solo la matrix administrativa.
- Activar overrides por usuario y auditoría visible en la misma pantalla.

## Sesión 2026-03-30 — TASK-136 integra authorizedViews en sesión y navegación

### Completado

- `TenantAccessRecord` ahora resuelve `authorizedViews` desde la capa persistida de view access cuando existe.
- `NextAuth` y `TenantContext` ya propagan:
  - `authorizedViews`
  - `routeGroups` derivados de las vistas autorizadas
- `VerticalMenu` ya usa `authorizedViews` para filtrar items clave de:
  - Gestión
  - Finanzas
  - HR
  - Administración
  - AI tooling

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-store.ts src/lib/tenant/access.ts src/lib/auth.ts src/lib/tenant/get-tenant-context.ts src/types/next-auth.d.ts src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Los guards broad por layout ya heredan `routeGroups` derivados, pero aún no existe enforcement page-level exhaustivo por `view_code` en todas las rutas del portal.
- El warning OpenSSL/JWT durante `build` sigue apareciendo en static generation de `/admin/views`; el artefacto termina bien y cae a fallback hardcoded durante esa fase.

## Sesión 2026-03-30 — TASK-136 cierra el primer enforcement page-level por view_code

### Completado

- Se agregó `hasAuthorizedViewCode()` en `src/lib/tenant/authorization.ts` para resolver autorización por vista usando:
  - `tenant.authorizedViews`
  - fallback explícito a `routeGroups` cuando el catálogo persistido aún no gobierna ese usuario
- Ya hay enforcement page-level o nested layout específico para superficies catalogadas clave:
  - `/dashboard`, `/settings`
  - `/proyectos/**`, `/sprints/**`
  - `/agency`, `/agency/organizations/**`, `/agency/services/**`
  - `/people/**`, `/hr/payroll/**`
  - `/finance`, `/finance/income/**`, `/finance/expenses/**`, `/finance/reconciliation/**`
  - `/admin`, `/admin/roles`, `/admin/views`, `/admin/ops-health`, `/admin/ai-tools`, `/admin/tenants/**`, `/admin/users/**`
  - `/my/profile`, `/my/payroll`

### Archivos tocados

- `src/lib/tenant/authorization.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/proyectos/layout.tsx`
- `src/app/(dashboard)/sprints/layout.tsx`
- `src/app/(dashboard)/agency/page.tsx`
- `src/app/(dashboard)/agency/organizations/layout.tsx`
- `src/app/(dashboard)/agency/services/layout.tsx`
- `src/app/(dashboard)/people/layout.tsx`
- `src/app/(dashboard)/hr/payroll/layout.tsx`
- `src/app/(dashboard)/finance/page.tsx`
- `src/app/(dashboard)/finance/income/layout.tsx`
- `src/app/(dashboard)/finance/expenses/layout.tsx`
- `src/app/(dashboard)/finance/reconciliation/layout.tsx`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/admin/roles/page.tsx`
- `src/app/(dashboard)/admin/views/page.tsx`
- `src/app/(dashboard)/admin/ops-health/page.tsx`
- `src/app/(dashboard)/admin/ai-tools/page.tsx`
- `src/app/(dashboard)/admin/tenants/layout.tsx`
- `src/app/(dashboard)/admin/users/layout.tsx`
- `src/app/(dashboard)/my/profile/page.tsx`
- `src/app/(dashboard)/my/payroll/page.tsx`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `changelog.md`

### Validación ejecutada

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/tenant/authorization.ts src/app/'(dashboard)'/agency/page.tsx src/app/'(dashboard)'/agency/organizations/layout.tsx src/app/'(dashboard)'/agency/services/layout.tsx src/app/'(dashboard)'/dashboard/page.tsx src/app/'(dashboard)'/finance/page.tsx src/app/'(dashboard)'/finance/income/layout.tsx src/app/'(dashboard)'/finance/expenses/layout.tsx src/app/'(dashboard)'/finance/reconciliation/layout.tsx src/app/'(dashboard)'/hr/payroll/layout.tsx src/app/'(dashboard)'/people/layout.tsx src/app/'(dashboard)'/admin/page.tsx src/app/'(dashboard)'/admin/roles/page.tsx src/app/'(dashboard)'/admin/views/page.tsx src/app/'(dashboard)'/admin/ops-health/page.tsx src/app/'(dashboard)'/admin/ai-tools/page.tsx src/app/'(dashboard)'/admin/tenants/layout.tsx src/app/'(dashboard)'/admin/users/layout.tsx src/app/'(dashboard)'/my/profile/page.tsx src/app/'(dashboard)'/my/payroll/page.tsx src/app/'(dashboard)'/settings/page.tsx src/app/'(dashboard)'/proyectos/layout.tsx src/app/'(dashboard)'/sprints/layout.tsx`
- `pnpm build`

### Pendiente inmediato

- Extender el mismo enforcement a rutas todavía no catalogadas en `view_registry` para reducir los últimos escapes por subpath.
- Decidir si algunos módulos amplios deben endurecerse con layouts más altos en el árbol una vez que el catálogo de vistas cubra todos los descendants.

## Sesión 2026-03-30 — TASK-136 amplía enforcement sobre layouts amplios y páginas vecinas

### Completado

- `src/lib/tenant/authorization.ts` ahora también expone `hasAnyAuthorizedViewCode()`.
- Los layouts amplios ya respetan catálogo persistido cuando existe:
  - `src/app/(dashboard)/admin/layout.tsx`
  - `src/app/(dashboard)/finance/layout.tsx`
  - `src/app/(dashboard)/hr/layout.tsx`
  - `src/app/(dashboard)/my/layout.tsx` nuevo
- Páginas vecinas no catalogadas todavía quedaron amarradas al `view_code` más cercano:
  - `src/app/(dashboard)/hr/leave/page.tsx` → `equipo.permisos`
  - `src/app/(dashboard)/admin/team/page.tsx` → `administracion.usuarios`
  - `src/app/(dashboard)/admin/operational-calendar/page.tsx` → `administracion.admin_center`
  - `src/app/(dashboard)/admin/cloud-integrations/page.tsx` → `administracion.ops_health`
  - `src/app/(dashboard)/admin/email-delivery/page.tsx` → `administracion.ops_health`
  - `src/app/(dashboard)/admin/notifications/page.tsx` → `administracion.ops_health`
  - `src/app/(dashboard)/finance/intelligence/page.tsx` → `finanzas.resumen`
  - `src/app/(dashboard)/finance/cost-allocations/page.tsx` → `finanzas.resumen`

### Validación ejecutada

- `pnpm exec eslint src/lib/tenant/authorization.ts src/app/'(dashboard)'/admin/layout.tsx src/app/'(dashboard)'/finance/layout.tsx src/app/'(dashboard)'/hr/layout.tsx src/app/'(dashboard)'/my/layout.tsx src/app/'(dashboard)'/hr/leave/page.tsx src/app/'(dashboard)'/admin/team/page.tsx src/app/'(dashboard)'/admin/operational-calendar/page.tsx src/app/'(dashboard)'/admin/email-delivery/page.tsx src/app/'(dashboard)'/admin/notifications/page.tsx src/app/'(dashboard)'/admin/cloud-integrations/page.tsx src/app/'(dashboard)'/finance/intelligence/page.tsx src/app/'(dashboard)'/finance/cost-allocations/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El enforcement ya cubre mejor navegación y descendencia visible, pero el catálogo `view_registry` sigue sin modelar cada superficie secundaria del portal.
- El siguiente paso saludable es expandir `view_registry` antes de seguir repartiendo ownership de subpaths ambiguos por inferencia.

## Sesión 2026-03-30 — TASK-136 empieza el cierre del cuello de modelo en Admin + Finance

### Completado

- `src/lib/admin/view-access-catalog.ts` sumó nuevos `view_code` explícitos:
  - `finanzas.clientes`
  - `finanzas.proveedores`
  - `finanzas.inteligencia`
  - `finanzas.asignaciones_costos`
  - `administracion.cloud_integrations`
  - `administracion.email_delivery`
  - `administracion.notifications`
  - `administracion.calendario_operativo`
  - `administracion.equipo`
- Se alinearon guards directos con esos códigos nuevos en:
  - `src/app/(dashboard)/admin/team/page.tsx`
  - `src/app/(dashboard)/admin/operational-calendar/page.tsx`
  - `src/app/(dashboard)/admin/email-delivery/page.tsx`
  - `src/app/(dashboard)/admin/notifications/page.tsx`
  - `src/app/(dashboard)/admin/cloud-integrations/page.tsx`
  - `src/app/(dashboard)/finance/intelligence/page.tsx`
  - `src/app/(dashboard)/finance/cost-allocations/page.tsx`
  - `src/app/(dashboard)/finance/clients/layout.tsx`
  - `src/app/(dashboard)/finance/suppliers/layout.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` ya filtra también esos accesos nuevos en sidebar.
- Hardening clave del resolver:
  - `src/lib/admin/view-access-store.ts` ya no apaga por defecto un `view_code` nuevo cuando un rol tiene assignments persistidos parciales
  - si falta la combinación `role_code + view_code`, se usa fallback por vista hasta que se persista explícitamente

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/lib/admin/view-access-store.ts src/components/layout/vertical/VerticalMenu.tsx src/app/'(dashboard)'/finance/clients/layout.tsx src/app/'(dashboard)'/finance/suppliers/layout.tsx src/app/'(dashboard)'/admin/team/page.tsx src/app/'(dashboard)'/admin/operational-calendar/page.tsx src/app/'(dashboard)'/admin/email-delivery/page.tsx src/app/'(dashboard)'/admin/notifications/page.tsx src/app/'(dashboard)'/admin/cloud-integrations/page.tsx src/app/'(dashboard)'/finance/intelligence/page.tsx src/app/'(dashboard)'/finance/cost-allocations/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Repetir la misma expansión de modelo en `Agency`, `HR`, `My` y otras superficies secundarias para quitar más inferencias del catálogo.
- Luego de eso, recién tiene sentido abrir con fuerza los overrides por usuario y la auditoría fina desde `/admin/views`.

## Sesión 2026-03-30 — TASK-136 extiende el catálogo a Agency, HR y My

### Completado

- `src/lib/admin/view-access-catalog.ts` sumó nuevos `view_code` explícitos en:
  - Agency: `gestion.spaces`, `gestion.economia`, `gestion.equipo`, `gestion.delivery`, `gestion.campanas`, `gestion.operaciones`
  - HR: `equipo.departamentos`, `equipo.asistencia`
  - My: `mi_ficha.mi_inicio`, `mi_ficha.mis_asignaciones`, `mi_ficha.mi_desempeno`, `mi_ficha.mi_delivery`, `mi_ficha.mis_permisos`, `mi_ficha.mi_organizacion`
- Se alinearon guards concretos en:
  - `src/app/(dashboard)/agency/layout.tsx`
  - `src/app/(dashboard)/agency/spaces/page.tsx`
  - `src/app/(dashboard)/agency/economics/page.tsx`
  - `src/app/(dashboard)/agency/team/page.tsx`
  - `src/app/(dashboard)/agency/delivery/page.tsx`
  - `src/app/(dashboard)/agency/campaigns/page.tsx`
  - `src/app/(dashboard)/agency/operations/page.tsx`
  - `src/app/(dashboard)/hr/departments/page.tsx`
  - `src/app/(dashboard)/hr/attendance/page.tsx`
  - `src/app/(dashboard)/my/layout.tsx`
  - `src/app/(dashboard)/my/page.tsx`
  - `src/app/(dashboard)/my/assignments/page.tsx`
  - `src/app/(dashboard)/my/delivery/page.tsx`
  - `src/app/(dashboard)/my/performance/page.tsx`
  - `src/app/(dashboard)/my/leave/page.tsx`
  - `src/app/(dashboard)/my/organization/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` ya filtra también `Agency`, `HR` y `Mi Ficha` con esos `view_code` nuevos.

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/agency/layout.tsx src/app/'(dashboard)'/agency/spaces/page.tsx src/app/'(dashboard)'/agency/economics/page.tsx src/app/'(dashboard)'/agency/team/page.tsx src/app/'(dashboard)'/agency/delivery/page.tsx src/app/'(dashboard)'/agency/campaigns/page.tsx src/app/'(dashboard)'/agency/operations/page.tsx src/app/'(dashboard)'/hr/departments/page.tsx src/app/'(dashboard)'/hr/attendance/page.tsx src/app/'(dashboard)'/my/layout.tsx src/app/'(dashboard)'/my/page.tsx src/app/'(dashboard)'/my/assignments/page.tsx src/app/'(dashboard)'/my/delivery/page.tsx src/app/'(dashboard)'/my/performance/page.tsx src/app/'(dashboard)'/my/leave/page.tsx src/app/'(dashboard)'/my/organization/page.tsx src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El mayor remanente ya queda en rutas secundarias que no están directamente en menú o que representan tabs/flows internos más finos.
- El siguiente paso útil puede ser:
  - expandir catálogo a superficies secundarias restantes, o
  - empezar overrides por usuario y auditoría visible apoyados en el catálogo ya bastante más completo.

## Sesión 2026-03-30 — TASK-136 alinea portal cliente y access points secundarios

### Completado

- `src/lib/admin/view-access-catalog.ts` sumó:
  - `gestion.capacidad`
  - `cliente.equipo`
  - `cliente.analytics`
  - `cliente.revisiones`
  - `cliente.actualizaciones`
- Se alinearon guards en:
  - `src/app/(dashboard)/agency/capacity/page.tsx`
  - `src/app/(dashboard)/hr/page.tsx`
  - `src/app/(dashboard)/equipo/page.tsx`
  - `src/app/(dashboard)/analytics/page.tsx`
  - `src/app/(dashboard)/reviews/page.tsx`
  - `src/app/(dashboard)/updates/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` ahora filtra también la navegación primaria cliente con `authorizedViews`.

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/agency/capacity/page.tsx src/app/'(dashboard)'/hr/page.tsx src/app/'(dashboard)'/equipo/page.tsx src/app/'(dashboard)'/analytics/page.tsx src/app/'(dashboard)'/reviews/page.tsx src/app/'(dashboard)'/updates/page.tsx src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El remanente más claro ahora está en superficies terciarias, redirects/tabs internas y algunas páginas genéricas no modeladas como vistas gobernables.
- Ya empieza a tener sentido abrir el siguiente gran bloque: overrides por usuario y auditoría visible, o bien hacer una última pasada de catálogo fino en rutas profundas.

## Sesión 2026-03-30 — TASK-136 activa overrides por usuario

### Completado

- Nuevo endpoint:
  - `src/app/api/admin/views/overrides/route.ts`
- `src/lib/admin/view-access-store.ts` ahora:
  - lee overrides activos desde `greenhouse_core.user_view_overrides`
  - guarda overrides por usuario
  - aplica `grant/revoke` al resolver final de `authorizedViews`
- `src/lib/tenant/access.ts` ya pasa `userId` al resolver para que la sesión reciba la lectura efectiva final.
- `src/lib/admin/get-admin-view-access-governance.ts` y `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx` ya exponen y usan `userOverrides`.
- El tab `Preview` de `/admin/views` ahora permite:
  - alternar cada vista entre `inherit`, `grant` y `revoke`
  - guardar overrides permanentes con razón
  - ver el resultado efectivo en la sidebar simulada y el detalle de vistas

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/lib/tenant/access.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/app/api/admin/views/overrides/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Este slice inicial ya hace el trabajo útil, pero aún faltan:
  - reasons por vista más finas
  - evento/notificación al usuario afectado cuando cambie su acceso

## Sesión 2026-03-30 — TASK-136 suma expiración opcional y auditoría visible

### Completado

- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx` ahora soporta:
  - expiración opcional por batch de overrides del usuario seleccionado
  - feed de auditoría reciente por usuario en el tab `Preview`
- `src/lib/admin/get-admin-view-access-governance.ts` y `src/lib/admin/view-access-store.ts` ahora exponen `auditLog` desde `greenhouse_core.view_access_log`.
- Para sostener el repo verde durante el cierre se corrigió un drift de tipos en:
  - `src/app/api/finance/income/reconcile-payments/route.ts`
  - el handler usaba `newAmountPaid`, pero el contrato actual del ledger expone `amountPaid`

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/app/api/finance/income/reconcile-payments/route.ts`
- `pnpm build`

### Pendiente inmediato

- El remanente más valioso de `TASK-136` ya es:
  - reasons por vista más finas
  - expiración individual por override, no solo por batch
  - notificación/evento al usuario afectado

## Sesión 2026-03-30 — hardening Sentry incident reader

### Completado

- Se aisló el incidente visible en `staging` desde `/admin/ops-health`: el bloque `Incidentes Sentry` degradaba con `HTTP 403 {"detail":"You do not have permission to perform this action."}`.
- La causa raíz es de permisos/token, no de UI:
  - el runtime estaba usando `SENTRY_AUTH_TOKEN` para leer issues de Sentry
  - ese token puede servir para build/source maps y aun así no tener permisos de lectura de incidentes
- `src/lib/cloud/observability.ts` ahora:
  - resuelve `SENTRY_INCIDENTS_AUTH_TOKEN` / `SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF` como credencial preferida
  - mantiene fallback a `SENTRY_AUTH_TOKEN` solo como compatibilidad transicional
  - cuando Sentry responde `401/403`, proyecta un warning accionable en vez de un fallo genérico

### Archivos tocados

- `src/lib/cloud/observability.ts`
- `src/lib/cloud/observability.test.ts`
- `.env.example`
- `project_context.md`
- `docs/tasks/complete/TASK-133-ops-health-sentry-incident-surfacing.md`
- `changelog.md`

### Pendiente inmediato

- Correr validación local (`vitest`, `eslint`, `tsc`, `build`).
- Sembrar en `staging` un `SENTRY_INCIDENTS_AUTH_TOKEN` con permisos reales de lectura de incidentes si se quiere recuperar el bloque con data real.

## Sesión 2026-03-29 — Notifications endurecida a person-first

### Completado

- Se confirmó y corrigió el drift de identidad del sistema de notificaciones:
  - antes coexistían rutas `member-first`, `client_user-first` y `userId-first`
  - ahora el resolver compartido nace desde `identity_profile` / `member`
- Nuevo helper canónico:
  - `src/lib/notifications/person-recipient-resolver.ts`
- `NotificationService.dispatch()` ahora resuelve recipients a través de ese helper antes de elegir canales.
- `notification-recipients.ts` (webhook bus) ya quedó alineado al mismo contrato.
- `notification-dispatch.ts` ya dedupea por recipient key efectiva, no solo `userId`.
- `TASK-117` quedó revalidada con notificaciones reales para Julio y Humberly.
- Se creó `TASK-134` para el follow-on transversal de governance del modelo Notifications.

### Validación ejecutada

- `pnpm exec vitest run src/lib/notifications/person-recipient-resolver.test.ts src/lib/notifications/notification-service.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/webhooks/consumers/notification-dispatch.test.ts src/lib/webhooks/consumers/notification-mapping.test.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint ...` sobre notifications + webhook consumers + reactive projection
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- El inbox y las preferencias siguen `userId`-scoped por diseño; no reabrir eso sin un corte de schema/policy explícito.
- Si se sigue esta línea, el siguiente slice natural es `TASK-134`.

## Sesión 2026-03-29 — TASK-117 cerrada con auto-cálculo mensual de payroll

### Completado

- `TASK-117` pasó a `complete`.
- Payroll ya formaliza el hito mensual de cálculo con:
  - `getLastBusinessDayOfMonth()` / `isLastBusinessDayOfMonth()`
  - `getPayrollCalculationDeadlineStatus()`
  - `calculation readiness` separado de `approval readiness`
  - `runPayrollAutoCalculation()` + `GET /api/cron/payroll-auto-calculate`
  - auto-creación del período mensual cuando falta
  - consumer reactivo `payroll_period.calculated` con categoría `payroll_ops`
- `PayrollPeriodTab` ahora muestra deadline, estado operativo y cumplimiento del cálculo.
- `approve/route` consume la rama `approval` del readiness en vez del readiness legacy mezclado.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/calendar/operational-calendar.test.ts src/lib/payroll/current-payroll-period.test.ts src/lib/payroll/payroll-readiness.test.ts src/lib/payroll/auto-calculate-payroll.test.ts src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx`
  - `pnpm exec eslint ...` sobre calendario, payroll, cron y UI
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato

- No queda blocker abierto dentro del alcance de `TASK-117`; los follow-ons que resten son de policy/UX futura o de adopción operativa en ambientes.

## Sesión 2026-03-29 — TASK-133 cerrada con surfacing fail-soft de incidentes Sentry

### Completado

- `TASK-133` pasó a `complete`.
- `src/lib/cloud/observability.ts` ahora separa:
  - `getCloudObservabilityPosture()`
  - `getCloudSentryIncidents()`
- `getOperationsOverview()` ya proyecta:
  - `cloud.observability.posture`
  - `cloud.observability.incidents`
- `GET /api/internal/health` ya expone también `sentryIncidents`.
- UI conectada:
  - `AdminOpsHealthView` muestra incidentes Sentry con status, summary, release, environment, ocurrencia y deep-link
  - `AdminCloudIntegrationsView` resume el estado de incidentes y deriva a `Ops Health`
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/webhooks/target-url.test.ts`
  - `pnpm exec eslint ...` sobre cloud/ops/admin views
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato

- No queda blocker de repo para el surfacing; la validación runtime adicional en ambiente queda como smoke operativo, no como gap de implementación.

## Sesión 2026-03-29 — TASK-133 iniciada con surfacing fail-soft de incidentes Sentry

### Completado

- `TASK-133` pasó a `in-progress`.
- `src/lib/cloud/observability.ts` ahora separa:
  - `getCloudObservabilityPosture()`
  - `getCloudSentryIncidents()`
- Nuevo contrato canónico en `src/lib/cloud/contracts.ts`:
  - `CloudSentryIncident`
  - `CloudSentryIncidentsSnapshot`
- `getOperationsOverview()` ya proyecta:
  - `cloud.observability.posture`
  - `cloud.observability.incidents`
- `GET /api/internal/health` ya expone también `sentryIncidents` sin mezclar incidentes con el health runtime base.
- UI conectada:
  - `AdminOpsHealthView` muestra incidentes Sentry con status, summary, release, environment, ocurrencia y deep-link
  - `AdminCloudIntegrationsView` resume el estado de incidentes y deriva a `Ops Health`
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/webhooks/target-url.test.ts`
  - `pnpm exec eslint src/lib/cloud/contracts.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/operations/get-operations-overview.ts src/app/api/internal/health/route.ts src/views/greenhouse/admin/AdminOpsHealthView.tsx src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx src/lib/webhooks/target-url.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
- Drift incidental corregido:
  - `src/lib/webhooks/target-url.test.ts` ahora pasa `NODE_ENV: 'test'` para respetar el contrato tipado actual de `ProcessEnv`

### Pendiente inmediato

- Superado por el cierre posterior de `TASK-133` en esta misma fecha.

## Sesión 2026-03-29 — TASK-129 promovida a production y validada end-to-end

### Completado

- `develop` fue promovida a `main` vía PR `#22`:
  - merge commit `95a03a7266c60b07e0eeb93977137b5ffaff0cff`
- `production` absorbió el deployment:
  - `https://greenhouse-efjxg8r0x-efeonce-7670142f.vercel.app`
  - alias productivo activo: `https://greenhouse.efeoncepro.com`
- Validación real en `production`:
  - `POST /api/internal/webhooks/notification-dispatch` respondió `200`
  - payload result:
    - `mapped=true`
    - `recipientsResolved=1`
    - `sent=1`
  - `greenhouse_notifications.notifications` persistió la fila:
    - `eventId=evt-prod-final-1774830739019`
    - `user_id=user-efeonce-admin-julio-reyes`
    - `category=assignment_change`
    - `status=unread`
- Conclusión:
  - `TASK-129` ya no queda solo validada en `staging`; el carril webhook notifications quedó operativo también en `production`

### Pendiente inmediato

- El draft PR `#21` (`release/task-129-prod-promo`) ya quedó redundante después de promover `develop -> main`; puede cerrarse por higiene cuando convenga.
- El check `Preview` del PR individual falló por drift de env/build (`NEXTAUTH_SECRET` durante page-data collection), pero no bloqueó el rollout real porque la promoción completa de `develop` a `main` sí quedó validada en `production`.

## Sesión 2026-03-29 — Rollout de production intentado para TASK-129, bloqueado por drift de branch

### Completado

- `production` ya tiene `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`.
- Se confirmó que `production` no conserva `WEBHOOK_NOTIFICATIONS_SECRET` crudo; el fallback legacy ya no está presente en Vercel para este carril.
- Se ejecutó redeploy seguro de la build productiva existente:
  - source deployment previo: `https://greenhouse-pcty6593d-efeonce-7670142f.vercel.app`
  - nuevo deployment: `https://greenhouse-j35lx1ock-efeonce-7670142f.vercel.app`
  - target: `production`

### Bloqueo real

- El smoke firmado contra `production` no llegó al consumer `notification-dispatch`; devolvió HTML del portal en vez de JSON del route handler.
- La causa observada en el build productivo es branch drift:
  - el deployment de `main` (`commit: fbe21a3`) no incluye `/api/internal/webhooks/notification-dispatch` en el artefacto compilado
  - sí incluye `/api/internal/webhooks/canary`, pero no el consumer de `TASK-129`
- Conclusión operativa:
  - `production` ya está lista a nivel de secretos
  - el rollout funcional de `TASK-129` en `production` queda bloqueado hasta que el código del consumer llegue a `main`

### Pendiente inmediato

- Promover a `main` el slice real de `TASK-129` antes de repetir validación productiva.
- Una vez `main` incluya la route, repetir:
  - redeploy/redeploy seguro de `production`
  - smoke firmado
  - verificación de persistencia en `greenhouse_notifications.notifications`

## Sesión 2026-03-29 — TASK-129 hardening final en staging con Secret Manager-only

### Completado

- `staging` ya no conserva `WEBHOOK_NOTIFICATIONS_SECRET` crudo en Vercel.
- Se forzó redeploy del entorno `Staging` después del retiro del env legacy.
- Validación real posterior al redeploy:
  - `POST /api/internal/webhooks/notification-dispatch` respondió `200`
  - `assignment.created` volvió a crear notificación visible para `user-efeonce-admin-julio-reyes`
  - la resolución efectiva quedó servida por `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF -> webhook-notifications-secret`
- Hardening adicional en repo:
  - `src/lib/secrets/secret-manager.ts` ahora sanitiza también secuencias literales `\\n` / `\\r` en `*_SECRET_REF`
  - esto evita depender de formatos tolerados al importar/pullar env vars desde Vercel

### Pendiente inmediato

- El mismo retiro del env legacy puede replicarse en cualquier otro ambiente que todavía conserve fallback crudo.
- Siguiente lane sugerida sin blocker técnico de `TASK-129`:
  - `TASK-133` para surfacing de incidentes Sentry en `Ops Health`

## Sesión 2026-03-29 — TASK-129 iniciada sobre webhook bus con convivencia explícita

### Completado

- `TASK-129` deja `to-do` y pasa a `in-progress`.
- Estrategia elegida para evitar duplicados y mantener la arquitectura vigente:
  - `src/lib/sync/projections/notifications.ts` se mantiene para eventos legacy internos
  - el nuevo consumer webhook toma solo eventos UX-facing con payload estable
- Ownership inicial por `eventType`:
  - `reactive`: `service.created`, `identity.reconciliation.approved`, `finance.dte.discrepancy_found`, `identity.profile.linked`
  - `webhook notifications`: `assignment.created`, `assignment.updated`, `assignment.removed`, `compensation_version.created`, `member.created`, `payroll_period.exported`
- Contrato nuevo en implementación:
  - `POST /api/internal/webhooks/notification-dispatch`
  - `POST /api/admin/ops/webhooks/seed-notifications`
  - `WEBHOOK_NOTIFICATIONS_SECRET`
  - `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`
  - `WEBHOOK_NOTIFICATIONS_VERCEL_PROTECTION_BYPASS_SECRET`

### Criterio operativo

- No eliminar el dominio reactivo `notifications`.
- No tocar `payroll_export_ready_notification`; el correo operativo downstream sigue fuera del alcance de `TASK-129`.
- El consumer nuevo debe apoyar su dedupe en metadata JSONB de `greenhouse_notifications.notifications`, evitando migración schema-first salvo que resulte impracticable.

## Sesión 2026-03-29 — TASK-129 endurecida y env rollout listo en Vercel

### Completado

- El consumer webhook de notificaciones quedó endurecido:
  - `POST /api/internal/webhooks/notification-dispatch` ahora exige firma HMAC cuando `WEBHOOK_NOTIFICATIONS_SECRET` resuelve a un secreto real
  - el dedupe ya no mira solo `greenhouse_notifications.notifications`; también usa `notification_log` para cubrir casos `email-only`
- `staging` y `production` ya tienen cargada en Vercel la ref:
  - `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`
- `staging` conserva además `WEBHOOK_NOTIFICATIONS_SECRET` como fallback transicional, lo que deja la migración fail-soft mientras se confirma GCP.
- El secret `webhook-notifications-secret` ya fue creado/verificado en GCP Secret Manager y el consumer smoke firmado responde `200` en `staging`.
- El subscriber `wh-sub-notifications` quedó corregido en DB para usar el alias estable:
  - `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notification-dispatch?...`
- Se alineó el dataset de `staging` para recipients internos:
  - `greenhouse_core.client_users.member_id` quedó enlazado por match exacto de nombre para usuarios internos activos
- Se corrigió también el drift operativo de los seed routes:
  - ahora prefieren el host real del request sobre `VERCEL_URL`
  - sanitizan `\n`/`\r` literales en bypass secrets para no persistir `%5Cn` en `target_url`
- Se creó `TASK-133` para surfacing de incidentes Sentry en `Ops Health`.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/webhooks/consumers/notification-mapping.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/webhooks/consumers/notification-dispatch.test.ts src/app/api/internal/webhooks/notification-dispatch/route.test.ts src/lib/webhooks/notification-target.test.ts src/lib/notifications/notification-service.test.ts`
  - `pnpm exec eslint src/views/greenhouse/admin/AdminNotificationsView.tsx src/lib/notifications/schema.ts src/lib/notifications/notification-service.ts src/lib/webhooks/consumers/notification-dispatch.ts src/app/api/internal/webhooks/notification-dispatch/route.ts src/app/api/internal/webhooks/notification-dispatch/route.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
  - `pnpm exec vitest run src/lib/webhooks/notification-target.test.ts src/lib/webhooks/canary-target.test.ts src/lib/webhooks/target-url.test.ts src/app/api/internal/webhooks/notification-dispatch/route.test.ts`
  - `pnpm exec eslint src/lib/webhooks/target-url.ts src/lib/webhooks/target-url.test.ts src/lib/webhooks/notification-target.ts src/lib/webhooks/canary-target.ts src/app/api/admin/ops/webhooks/seed-notifications/route.ts src/app/api/admin/ops/webhooks/seed-canary/route.ts`
  - `pnpm pg:doctor --profile=runtime` usando `.env.staging.pull`
  - smoke firmado contra `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notification-dispatch`
  - evidencia funcional:
    - `assignment.created` visible en campanita para `user-efeonce-admin-julio-reyes`
    - `payroll_period.exported` creó 4 notificaciones `payroll_ready` para recipients resolubles del período `2026-03`

### Pendiente inmediato

- `TASK-129` ya queda lista para cierre documental.
- Siguiente follow-on razonable:
  - retirar el fallback crudo `WEBHOOK_NOTIFICATIONS_SECRET` de `staging` cuando se confirme que Secret Manager queda como única fuente
  - decidir si el enlace `client_users.member_id` interno observado en `staging` debe formalizarse como backfill/lane de identidad separada

## Sesión 2026-03-29 — TASK-131 cerrada: health separa runtime vs tooling posture

### Completado

- `TASK-131` ya no está solo documentada; quedó implementada en la capa `cloud/*`.
- Corrección aplicada:
  - `src/lib/cloud/secrets.ts` clasifica secretos tracked entre `runtime` y `tooling`
  - `src/lib/cloud/health.ts` evalúa `postureChecks.secrets` solo con la porción runtime-crítica
  - `postgresAccessProfiles` mantiene la visibilidad separada de `runtime`, `migrator` y `admin`
- Esto corrige el warning residual observado en `production`:
  - `overallStatus=degraded`
  - runtime `postgres/bigquery/observability` sanos
  - gap real concentrado en perfiles Postgres `migrator/admin` no cargados en el runtime del portal
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/health.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/postgres.test.ts`
  - `pnpm exec eslint src/lib/cloud/contracts.ts src/lib/cloud/health.ts src/lib/cloud/secrets.ts src/lib/cloud/postgres.ts src/lib/cloud/health.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/postgres.test.ts src/app/api/internal/health/route.ts`
  - `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Validar el nuevo contrato en `staging` y `production` después del siguiente deploy de `develop/main`.
- No cargar `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` ni `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` en el runtime productivo como workaround del health.

## Sesión 2026-03-29 — TASK-125 cerrada con validación E2E real en staging

### Completado

- `TASK-125` ya quedó validada end-to-end en `staging`.
- Se confirmó que el proyecto ya tenía `Protection Bypass for Automation` activo en Vercel.
- `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET` quedó cargado en `staging`.
- La canary subscription `wh-sub-canary` quedó apuntando al deployment protegido con `x-vercel-protection-bypass`.
- Validación real:
  - `eventsMatched=1`
  - `deliveriesAttempted=1`
  - `succeeded=1`
  - `HTTP 200` en el canary
  - `webhook_delivery_id=wh-del-b9dc275a-f5b5-4104-adcd-d9519fa3794c`
- Ajustes de baseline dejados en repo:
  - `seed-canary` usa `finance.income.nubox_synced` como familia activa observada en `staging`
  - el dispatcher ya prioriza eventos `published` más recientes para no hambrear subscriptions nuevas

## Sesión 2026-03-29 — TASK-125 canary soporta bypass opcional de Vercel

### Completado

- `POST /api/admin/ops/webhooks/seed-canary` ya puede registrar el target del canary con bypass opcional de `Deployment Protection`.
- Contrato soportado:
  - `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET`
  - fallback a `VERCEL_AUTOMATION_BYPASS_SECRET`

## Sesión 2026-03-29 — TASK-125 casi cerrada, bloqueada por Vercel Deployment Protection

### Completado

- `WEBHOOK_CANARY_SECRET_SECRET_REF` quedó cargado en Vercel `staging`.
- El schema de webhooks quedó provisionado en la base usada por `develop/staging`; antes solo existía `outbox_events`.
- Se activó `wh-sub-canary` en DB y se validó el dispatcher con tráfico real:
  - `eventsMatched=3`
  - `deliveriesAttempted=3`
  - attempts registrados en `greenhouse_sync.webhook_delivery_attempts`
- Se verificó también que la base usada por `production/main` ya ve las tablas de webhooks provisionadas.

### Bloqueo real

- El self-loop a `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/canary` no falla por firma ni por schema.
- Falla por `Vercel Deployment Protection`: los attempts reciben `401 Authentication Required` antes de llegar al route handler.
- El remanente real de `TASK-125` ya no es repo ni Postgres; es definir el mecanismo de bypass/target para que el canary pueda atravesar la protección de Vercel en entornos compartidos.

## Sesión 2026-03-29 — TASK-125 canary alineada a Secret Manager

### Completado

- `src/lib/webhooks/signing.ts` ya no resuelve secretos solo por env plano; ahora usa el helper canónico de Secret Manager.
- Impacto práctico:
  - inbound webhooks
  - outbound deliveries
  - `POST /api/internal/webhooks/canary`
    ya soportan `*_SECRET_REF` además del env legacy.
- `TASK-125` ya no requiere exponer `WEBHOOK_CANARY_SECRET` crudo en Vercel si el secreto ya existe en Secret Manager.

## Sesión 2026-03-29 — TASK-127 creada como follow-on de consolidación Cloud

### Completado

- Se creó `TASK-127` para capturar la siguiente necesidad institucional del dominio Cloud:
  - scorecard semáforo por dominio
  - cleanup de drift documental residual
  - plan corto de “next hardening wave”
- La task no reabre lanes ya cerradas; sirve para consolidar la lectura post-baseline después de `TASK-096`, `TASK-098`, `TASK-099`, `TASK-102`, `TASK-103`, `TASK-124` y `TASK-126`.

## Sesión 2026-03-29 — TASK-102 cerrada

### Completado

- Se completó el restore test end-to-end con el clone efímero `greenhouse-pg-restore-test-20260329d`.
- Verificación SQL real sobre el clone:
  - `payroll_entries=6`
  - `identity_profiles=40`
  - `outbox_events=1188`
  - schemata presentes: `greenhouse_core`, `greenhouse_payroll`, `greenhouse_sync`
- El clone fue eliminado después de validar datos y `gcloud sql instances list` volvió a mostrar solo `greenhouse-pg-dev`.
- `TASK-102` ya no queda abierta:
  - PITR y WAL retention verificados
  - slow query logging con evidencia real en Cloud Logging
  - runtime health confirmado en `staging` y `production`
  - restore verification ya documentada de punta a punta

## Sesión 2026-03-29 — TASK-102 validación externa casi cerrada

### Completado

- Se confirmó postura real de `greenhouse-pg-dev` en GCP:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
  - `sslMode=ENCRYPTED_ONLY`
- `pnpm pg:doctor --profile=runtime` y `pnpm pg:doctor --profile=migrator` pasaron por connector contra `greenhouse-pg-dev`.
- Slow query logging ya quedó verificada con evidencia real en Cloud Logging:
  - `duration: 1203.206 ms`
  - `statement: SELECT pg_sleep(1.2)`
- `staging` y `production` también quedaron revalidadas por `vercel curl /api/internal/health`:
  - `postgres.status=ok`
  - `usesConnector=true`
  - `sslEnabled=true`
  - `maxConnections=15`

### Pendiente inmediato

- En ese momento, el único remanente real de `TASK-102` era el restore test end-to-end.
- Dos clones efímeros fueron creados y limpiados:
  - `greenhouse-pg-restore-test-20260329b`
  - `greenhouse-pg-restore-test-20260329c`
- El primero se eliminó antes de completar la verificación SQL y el segundo quedó demasiado tiempo en `PENDING_CREATE`; ese remanente ya quedó resuelto después con el clone `greenhouse-pg-restore-test-20260329d`.

## Sesión 2026-03-29 — TASK-099 cerrada con `CSP-Report-Only`

### Completado

- `TASK-099` queda cerrada para su baseline segura y reversible.
- `src/proxy.ts` ahora agrega también `Content-Security-Policy-Report-Only` con allowlist amplia para no romper:
  - login `Azure AD` / `Google`
  - MUI / Emotion
  - observabilidad (`Sentry`)
  - assets y uploads
- Validación local ejecutada:
  - `pnpm exec vitest run src/proxy.test.ts`
  - `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Decisión explícita

- La task no intenta endurecer a `Content-Security-Policy` enforce.
- Cualquier tightening posterior (`Report-Only` tuning, nonces, eliminación de `unsafe-*`) queda como mejora futura y ya no bloquea el hardening baseline.
- Esa mejora futura ya quedó registrada como `TASK-126`.

## Sesión 2026-03-29 — TASK-099 re-acotada al baseline real

### Completado

- Se revisó `TASK-099` contra el estado real de `src/proxy.ts` y `src/proxy.test.ts`.
- Hallazgo consolidado:
  - el repo ya tiene validado el baseline de headers estáticos
  - la task seguía abierta con criterios mezclados de un lote futuro de `Content-Security-Policy`
- Se re-acotó la task para reflejar correctamente el slice actual:
  - `Status real` pasa a `Slice 1 validado`
  - `CSP` queda explícitamente como follow-on pendiente
  - el baseline ya no exige en falso login/uploads/dashboard bajo `CSP`

### Pendiente inmediato

- Decidir si `CSP` se implementa todavía dentro de `TASK-099` como `Report-Only` o si conviene derivarla a una task nueva para no inflar esta lane.

## Sesión 2026-03-29 — TASK-096 cerrada

### Completado

- `TASK-096` deja de seguir `in-progress` y pasa a `complete`.
- Razón de cierre:
  - baseline WIF-aware ya validada en `preview`, `staging` y `production`
  - hardening externo de Cloud SQL ya aplicado
  - la Fase 3 de Secret Manager ya quedó absorbida y cerrada por `TASK-124`
- La task queda como referencia histórica del track cloud, no como lane activa.

## Sesión 2026-03-29 — TASK-098 cerrada en `production`

### Completado

- `production` recibió el merge `main <- develop` en `bcbd0c3`.
- Se cargaron las variables externas de observabilidad en `production`:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Hubo que reescribir `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF` en `production` y redeployar para corregir drift de la ref.
- Deployment validado:
  - `dpl_5fyHqra7AgV865QmHSuZ2iqYWcYk`
  - `GET /api/internal/health` con `postureChecks.observability.status=ok`
  - `GET /api/auth/session` con respuesta `{}`
- `TASK-098` ya puede moverse a `complete`.

### Pendiente no bloqueante

- Rotar el webhook de Slack expuesto en una captura previa.

## Sesión 2026-03-29 — TASK-098 validación end-to-end en `staging`

### Completado

- Se confirmó que `staging` ya no tiene solo postura configurada, sino observabilidad operativa real:
  - `vercel curl /api/internal/health --deployment dpl_G5L2467CPUF6T2GxEaoB3tWhB41K`
  - `observability.summary=Sentry runtime + source maps listos · Slack alerts configuradas`
  - `postureChecks.observability.status=ok`
- Smoke real de Slack:
  - envío con el webhook resuelto desde `greenhouse-slack-alerts-webhook`
  - respuesta `HTTP 200`
- Smoke real de Sentry:
  - se emitió `task-098-staging-sentry-smoke-1774792462445`
  - el issue quedó visible en el dashboard del proyecto `javascript-nextjs`
- Hallazgo importante:
  - el único remanente operativo de `TASK-098` ya no está en `develop/staging`
  - queda concentrado en `main/production`

### Pendiente inmediato

- Replicar en `production`:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Validar `main/production` con smoke equivalente antes de mover `TASK-098` a `complete`
- Rotar el webhook de Slack expuesto en una captura previa cuando se decida hacerlo

## Sesión 2026-03-29 — TASK-098 Secret Manager slice para Slack alerts

### Completado

- Se abrió `feature/codex-task-098-observability-secret-refs` desde `develop`.
- `SLACK_ALERTS_WEBHOOK_URL` quedó alineado al helper canónico:
  - valor legacy `SLACK_ALERTS_WEBHOOK_URL`
  - ref opcional `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
  - resolución efectiva `Secret Manager -> env fallback`
- `GET /api/internal/health` ahora refleja esta resolución real tanto en `observability` como en `secrets`.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/alerts/slack-notify.test.ts src/lib/cloud/observability.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec eslint src/lib/alerts/slack-notify.ts src/lib/alerts/slack-notify.test.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/cloud/secrets.ts src/lib/cloud/secrets.test.ts src/app/api/internal/health/route.ts`
  - `pnpm exec tsc --noEmit --pretty false`

### Decisión explícita

- `CRON_SECRET` sigue `env-only`:
  - moverlo a Secret Manager haría asíncrono `requireCronAuth()` y abriría un cambio transversal en múltiples routes
- `SENTRY_AUTH_TOKEN` sigue `env-only`:
  - hoy se consume en `next.config.ts` durante build
- `SENTRY_DSN` también se deja fuera de este slice:
  - el path client (`NEXT_PUBLIC_SENTRY_DSN`) lo vuelve config pública/operativa, no un secreto crítico prioritario

## Sesión 2026-03-29 — TASK-098 validada en `develop/staging`

### Completado

- `develop` absorbió el slice mínimo de Sentry en `ac11287`.
- El deployment compartido `dev-greenhouse.efeoncepro.com` quedó `READY` sobre ese commit.
- Validación autenticada de `GET /api/internal/health`:
  - `version=ac11287`
  - Postgres `ok`
  - BigQuery `ok`
  - `observability.summary=Observabilidad externa no configurada`
- Hallazgo importante:
  - el repo ya tiene el adapter `src/lib/alerts/slack-notify.ts`
  - los hooks de `alertCronFailure()` ya existen en `outbox-publish`, `webhook-dispatch`, `sync-conformed`, `ico-materialize` y `nubox-sync`
  - por lo tanto el cuello de botella actual de `TASK-098` ya no es de código repo, sino de configuración externa en Vercel

### Pendiente inmediato

- Cargar en Vercel las variables externas de observabilidad:
  - `SENTRY_DSN` o `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL`
- Revalidar `GET /api/internal/health` y confirmar que `postureChecks.observability` deje de salir `unconfigured`.

## Sesión 2026-03-29 — TASK-098 retoma Sentry mínimo sobre branch dedicada

### Completado

- Se retomó `TASK-098` desde `feature/codex-task-098-sentry-resume` sobre una base donde `develop` ya absorbió el baseline de `TASK-098` y `TASK-099`.
- Quedó reconstruido y validado el wiring mínimo de Sentry para App Router:
  - `next.config.ts` con `withSentryConfig`
  - `src/instrumentation.ts`
  - `src/instrumentation-client.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
- La postura de observabilidad quedó endurecida para distinguir:
  - DSN runtime total
  - DSN público (`NEXT_PUBLIC_SENTRY_DSN`)
  - auth token
  - org/project
  - readiness de source maps
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec eslint next.config.ts src/instrumentation.ts src/instrumentation-client.ts sentry.server.config.ts sentry.edge.config.ts src/lib/cloud/contracts.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato

- Push de esta branch para obtener Preview Deployment y validar que `/api/internal/health` refleje la postura nueva de Sentry.
- Solo después de esa verificación, decidir si este slice pasa a `develop`.

## Sesión 2026-03-29 — TASK-099 iniciada sobre `develop`

### Completado

- `develop` absorbió el baseline sano de `TASK-098` (`4167650`, `4d485f4`) y el fix de compatibilidad `3463dc8`.
- Se abrió `feature/codex-task-099-security-headers` desde ese `develop` ya integrado.
- `TASK-099` pasa a `in-progress` con un primer slice mínimo:
  - nuevo `src/proxy.ts`
  - headers estáticos cross-cutting
  - matcher conservador para no tocar `_next/*` ni assets
  - `Strict-Transport-Security` solo en `production`

### Pendiente inmediato

- validar lint, tests, `tsc` y `build` del middleware
- decidir si el siguiente slice de `TASK-099` introduce CSP en `Report-Only` o la difiere hasta después de retomar `TASK-098`

## Sesión 2026-03-29 — TASK-098 iniciada con slice seguro de postura

### Completado

- `TASK-098` pasó a `in-progress`.
- Se eligió un primer slice sin integraciones externas para no romper el runtime ya estabilizado:
  - nuevo `src/lib/cloud/observability.ts`
  - `GET /api/internal/health` ahora incluye `observability`
  - el payload proyecta si existen `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` y `SLACK_ALERTS_WEBHOOK_URL`
- El contrato de `GET /api/internal/health` quedó separado en:
  - `runtimeChecks` para dependencias que sí definen `200/503`
  - `postureChecks` para hallazgos operativos que degradan señal pero no cortan tráfico
  - `overallStatus` y `summary` como resumen estable para futuras integraciones
- `GET /api/internal/health` ahora expone también `postgresAccessProfiles`:
  - `runtime`
  - `migrator`
  - `admin`
    manteniendo `postgres` solo para postura runtime del portal
- `.env.example` quedó alineado con esas variables.

### Pendiente inmediato

- Instalar y configurar `@sentry/nextjs`
- decidir si el siguiente slice conecta primero Slack alerts o Sentry
- validar este contrato nuevo en preview antes de cablear integraciones externas

## Sesión 2026-03-29 — TASK-124 validada en `staging`

### Completado

- Se armó una integración mínima desde `origin/develop` para no arrastrar el resto de `feature/codex-task-096-wif-baseline`.
- `develop` quedó promovido a `497cb19` con los tres slices de `TASK-124`:
  - helper canónico `src/lib/secrets/secret-manager.ts`
  - postura de secretos en `GET /api/internal/health`
  - migración de `NUBOX_BEARER_TOKEN`, Postgres secret refs y auth/SSO (`NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`)
- Validación local sobre la base integrada:
  - `pnpm exec eslint ...`
  - `pnpm exec vitest run src/lib/secrets/secret-manager.test.ts src/lib/cloud/secrets.test.ts src/lib/nubox/client.test.ts src/lib/postgres/client.test.ts scripts/lib/load-greenhouse-tool-env.test.ts src/lib/auth-secrets.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm pg:doctor --profile=runtime`
- Rollout externo ya preparado:
  - secretos nuevos creados en GCP Secret Manager para `staging` y `production`
  - `*_SECRET_REF` cargados en Vercel `staging` y `production`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/secretmanager.secretAccessor` sobre los secretos nuevos
- Validación compartida en `staging`:
  - `dev-greenhouse.efeoncepro.com/api/internal/health` respondió `200`
  - `version=497cb19`
  - `GREENHOUSE_POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET` y `NUBOX_BEARER_TOKEN` reportan `source=secret_manager`
- Ajuste externo mínimo posterior:
  - el secreto heredado `greenhouse-pg-dev-app-password` no tenía IAM para el runtime service account
  - se agregó `roles/secretmanager.secretAccessor` para `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  - luego de ese binding, `GREENHOUSE_POSTGRES_PASSWORD` pasó también a `source=secret_manager` en `staging`

### Pendiente inmediato

- `production` sigue pendiente de validación real; no se promovió a `main` en esta sesión.
- El remanente ya no es de código en `staging`, sino de rollout/control:
  - decidir cuándo retirar env vars legacy
  - decidir si `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` deben quedar proyectados en el health runtime del portal

## Sesión 2026-03-29 — TASK-096 WIF-aware baseline en progreso

### Completado

- `TASK-096` pasó a `in-progress` sobre el estado actual del repo.
- El repo ya quedó WIF-aware sin romper el runtime actual:
  - `src/lib/google-credentials.ts` resuelve `wif | service_account_key | ambient_adc`
  - el helper ahora también sabe pedir el token OIDC desde runtime Vercel con `@vercel/oidc`, no solo desde `process.env.VERCEL_OIDC_TOKEN`
  - `src/lib/bigquery.ts`, `src/lib/postgres/client.ts`, `src/lib/storage/greenhouse-media.ts` y `src/lib/ai/google-genai.ts` consumen el helper canónico
  - `src/lib/ai/google-genai.ts` ya no usa temp file para credenciales
- Scripts con parsing manual de `GOOGLE_APPLICATION_CREDENTIALS_JSON` quedaron alineados al helper central:
  - `check-ico-bq`
  - `backfill-ico-to-postgres`
  - `materialize-member-metrics`
  - `backfill-task-assignees`
  - `backfill-postgres-payroll`
  - `admin-team-runtime-smoke`
- Arquitectura y docs vivas alineadas:
  - `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
  - `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `project_context.md`
  - `changelog.md`
- Rollout externo ya avanzado y validado sin bigbang:
  - existe Workload Identity Pool `vercel` y provider `greenhouse-eo` en `efeonce-group`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` ya tiene bindings `roles/iam.workloadIdentityUser` para `development`, `preview`, `staging` y `production`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_SERVICE_ACCOUNT_EMAIL` ya quedaron cargadas en Vercel
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` quedó cargada en Vercel para preparar el cutover hacia Cloud SQL Connector
  - validación local con OIDC + WIF:
    - BigQuery respondió OK sin SA key
    - Cloud SQL Connector respondió `SELECT 1` sin SA key usando `runGreenhousePostgresQuery()`
  - validación real en preview Vercel:
    - se completó el env set mínimo de la branch `feature/codex-task-096-wif-baseline`
    - se forzó redeploy del preview
    - `greenhouse-i3cak6akh-efeonce-7670142f.vercel.app/api/internal/health` respondió `200 OK`
    - posture observada:
      - `auth.mode=wif`
      - BigQuery reachable
      - Cloud SQL reachable con connector e `instanceConnectionName=efeonce-group:us-east4:greenhouse-pg-dev`

### Validación

- `pnpm exec eslint src/lib/google-credentials.ts src/lib/google-credentials.test.ts src/lib/bigquery.ts src/lib/postgres/client.ts src/lib/storage/greenhouse-media.ts src/lib/ai/google-genai.ts scripts/check-ico-bq.ts scripts/backfill-ico-to-postgres.ts scripts/materialize-member-metrics.ts scripts/backfill-task-assignees.ts scripts/backfill-postgres-payroll.ts scripts/admin-team-runtime-smoke.ts`
- `pnpm exec vitest run src/lib/google-credentials.test.ts src/lib/cloud/gcp-auth.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- Smoke adicional externo:
  - BigQuery con `VERCEL_OIDC_TOKEN` y WIF sin SA key
  - Cloud SQL Connector con `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev` y query `SELECT 1::int as ok`

### Pendiente inmediato

- Limpiar drift de Vercel env antes del endurecimiento final:
  - las variables activas del rollout WIF/conector ya fueron corregidas en Vercel
  - el paso pendiente ya no es el formato, sino cerrar el baseline WIF final en `develop/staging`
- Aclarar y corregir el mapa de ambientes Vercel:
  - `dev-greenhouse.efeoncepro.com` ya quedó confirmado como `target=staging`
  - tras redeploy del staging activo respondió `version=7a2ecec`, `auth.mode=mixed` y `usesConnector=true`
- Camino seguro elegido:
  - no desplegar la feature branch al entorno compartido `staging`
  - mantener el flujo `feature -> preview -> develop/staging -> main`
- Validar el entorno compartido con WIF final después de mergear a `develop`, antes de retirar `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Cerrar Fase 1 externa de Cloud SQL:
  - remover `0.0.0.0/0`
  - pasar `sslMode` a `ENCRYPTED_ONLY`
  - activar `requireSsl=true`
- No declarar `TASK-096` cerrada todavía: el repo quedó listo, pero la postura cloud real sigue transicional.

## Sesión 2026-03-29 — TASK-115 Nexa UI Completion (4 slices)

### Completado

- **Slice A**: Edit inline de mensajes user — pencil hover button + EditComposer con ComposerPrimitive (Guardar/Cancelar)
- **Slice B**: Follow-up suggestions (chips clicables desde `suggestions` del backend) + feedback thumbs (👍/👎 fire-and-forget a `/api/home/nexa/feedback`)
- **Slice C**: Nexa floating portal-wide — FAB sparkles fixed bottom-right, panel 400×550 en desktop, Drawer bottom en mobile, hidden en `/home`
- **Slice D**: Thread history sidebar (Drawer izquierdo, lista agrupada por fecha, new/select thread) + threadId tracking en adapter + NexaPanel.tsx eliminado

### Archivos nuevos

- `src/views/greenhouse/home/components/NexaThreadSidebar.tsx`
- `src/components/greenhouse/NexaFloatingButton.tsx`

### Archivos modificados

- `src/views/greenhouse/home/components/NexaThread.tsx` — edit inline, feedback, suggestions, compact mode, history toggle
- `src/views/greenhouse/home/HomeView.tsx` — threadId tracking, suggestions state, sidebar integration
- `src/app/(dashboard)/layout.tsx` — NexaFloatingButton montado

### Archivos eliminados

- `src/views/greenhouse/home/components/NexaPanel.tsx` (legacy)

## Sesión 2026-03-29 — TASK-122 desarrollada y cerrada

### Completado

- `TASK-122` quedó desarrollada y cerrada como base documental del dominio Cloud.
- Se creó `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` como operating model canónico para institucionalizar `Cloud` como capa interna de platform governance.
- Se agregó una baseline real de código en `src/lib/cloud/*`:
  - `contracts.ts` para checks y snapshots
  - `health.ts` para checks compartidos de Postgres y BigQuery
  - `bigquery.ts` para cost guards base (`maximumBytesBilled`)
  - `cron.ts` para postura mínima de control plane sobre `CRON_SECRET`
- El documento deja explícito:
  - boundary entre `Admin Center`, `Cloud & Integrations` y `Ops Health`
  - control families del dominio Cloud
  - qué debe vivir en UI, qué en code/helpers y qué en runbooks/config
  - el framing operativo de `TASK-100`, `TASK-101`, `TASK-102` y `TASK-103`
- `TASK-100` a `TASK-103` quedaron actualizadas para referenciar esta base, evitando redecidir ownership y scope en cada ejecución.
- `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` quedaron alineados con `TASK-122` en `complete`.
- La conexión con la UI ya es total:
  - `getOperationsOverview()` ahora expone `cloud`
  - `Admin Center`, `Cloud & Integrations` y `Ops Health` consumen el snapshot institucional del dominio Cloud
  - la UI deja de reflejar solo integrations/ops aislados y pasa a mostrar runtime health, cron posture y BigQuery guard

### Pendiente inmediato

- La base ya está lista para ejecutar `TASK-100` a `TASK-103` con framing consistente del dominio Cloud

## Sesión 2026-03-29 — TASK-100 CI test step en progreso

### Completado

- `TASK-100` pasó a `in-progress` como primera lane activa del bloque Cloud hardening.
- `.github/workflows/ci.yml` ahora ejecuta `pnpm test` entre `Lint` y `Build`, con `timeout-minutes: 5`.
- La validación local previa confirmó que la suite actual es apta para CI:
  - `99` archivos de test
  - `488` pruebas verdes
  - runtime total `6.18s`

### Pendiente inmediato

- Confirmar la primera corrida real en GitHub Actions en el próximo push.
- Mantener el commit aislado de `TASK-115`, porque el árbol sigue teniendo cambios paralelos en `Home/Nexa` no relacionados con CI.

## Sesión 2026-03-29 — TASK-100 y TASK-101 cerradas

### Completado

- `TASK-100` quedó cerrada:
  - `.github/workflows/ci.yml` ahora ejecuta `pnpm test` entre `Lint` y `Build`
  - el step de tests tiene `timeout-minutes: 5`
- `TASK-101` quedó cerrada:
  - nuevo helper `src/lib/cron/require-cron-auth.ts`
  - `src/lib/cloud/cron.ts` ahora expone estado del secret y detección reusable de Vercel cron
  - migración de `19` rutas scheduler-driven sin auth inline
  - los endpoints `POST` de Finance preservan fallback a `requireFinanceTenantContext()` cuando no vienen como cron autorizado
- Validación de cierre:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

### Pendiente inmediato

- La siguiente lane del bloque solicitado queda en `TASK-102`, con `TASK-103` después.
- El árbol sigue teniendo cambios paralelos de `TASK-115` en Home/Nexa; no mezclar esos archivos al stage del lote Cloud.

## Sesión 2026-03-29 — Cloud layer robustness expansion

### Completado

- La capa `src/lib/cloud/*` quedó reforzada antes de entrar a `TASK-096`:
  - `src/lib/cloud/gcp-auth.ts` modela la postura runtime GCP (`wif`, `service_account_key`, `mixed`, `unconfigured`)
  - `src/lib/cloud/postgres.ts` modela la postura Cloud SQL (`connector`, `ssl`, `pool`, riesgos)
  - `src/app/api/internal/health/route.ts` expone health institucional para deploy/runtime validation
  - `src/lib/alerts/slack-notify.ts` deja listo el adapter base para alertas operativas
- `getOperationsOverview()` ahora proyecta también posture de auth GCP y posture de Cloud SQL.
- Se agregaron hooks de `alertCronFailure()` a los crons críticos:
  - `outbox-publish`
  - `webhook-dispatch`
  - `sync-conformed`
  - `ico-materialize`
  - `nubox-sync`

### Pendiente inmediato

- `TASK-096` ya puede apoyarse en una postura GCP explícita en código en vez de partir solo desde env vars sueltas.
- `TASK-098` ya no necesita inventar desde cero el health endpoint ni el adapter Slack.
- En ese momento `TASK-099`, `TASK-102` y `TASK-103` seguían abiertas, pero hoy solo queda `TASK-103` como remanente del bloque cloud baseline.

## Sesión 2026-03-29 — TASK-102 en progreso

### Completado

- Cloud SQL `greenhouse-pg-dev` quedó con:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
- `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` quedó aplicado y verificado en:
  - `Production`
  - `staging`
  - `Preview (develop)`
- El repo quedó alineado:
  - `src/lib/postgres/client.ts` ahora usa `15` como fallback por defecto
  - `.env.example` documenta `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15`
- Validación ejecutada:
  - `pnpm pg:doctor --profile=runtime`
  - `pnpm pg:doctor --profile=migrator`
  - `gcloud sql instances describe greenhouse-pg-dev`
  - `vercel env pull` por entorno para confirmar el valor efectivo

### Pendiente inmediato

- Terminar el restore test:
  - clone iniciado: `greenhouse-pg-restore-test-20260329`
  - seguía en `PENDING_CREATE` al cierre de esta actualización
- Cuando el clone quede `RUNNABLE`:
  - verificar tablas críticas
  - documentar resultado
- Este remanente ya quedó resuelto después con el clone `greenhouse-pg-restore-test-20260329d`.
  - eliminar la instancia efímera

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
- **Cierre final 2026-03-31**: tests UI dedicados en `AdminCenterView.test.tsx`, `AdminCenterSpacesTable.test.tsx` y `src/app/(dashboard)/admin/loading.test.tsx`; además se corrigió un re-render loop en `AdminCenterView` memoizando `buildDomainCards`
- **Validación de cierre**:
  - `pnpm exec vitest run src/views/greenhouse/admin/AdminCenterView.test.tsx src/views/greenhouse/admin/AdminCenterSpacesTable.test.tsx 'src/app/(dashboard)/admin/loading.test.tsx'`
  - `pnpm exec eslint src/views/greenhouse/admin/AdminCenterView.tsx src/views/greenhouse/admin/AdminCenterView.test.tsx src/views/greenhouse/admin/AdminCenterSpacesTable.test.tsx 'src/app/(dashboard)/admin/loading.test.tsx'`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
  - `git diff --check`

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

| Prioridad | Task              | Qué falta                                                                           |
| --------- | ----------------- | ----------------------------------------------------------------------------------- |
| 1         | TASK-110 Slice 1b | EditComposer inline, FollowupSuggestions (requiere backend), deprecar NexaPanel.tsx |
| 2         | TASK-110 Slice 4  | Nexa flotante portal-wide (AssistantModalPrimitive)                                 |
| 5         | TASK-119          | Rollout final de `/home`, `portalHomePath`, sidebar y cutover de `Control Tower`    |
| 6         | TASK-120          | Role scoping fino y verification bundle de `Admin Center`                           |

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

### Sesión 2026-03-31 — incidente `HR > Permisos` + TASK-173

- Incidente observado en `dev-greenhouse.efeoncepro.com/hr/leave`: banner `Unable to load leave requests.` y tabla vacía en staging.
- Causa raíz confirmada en Cloud SQL:
  - el deploy `c96cf284` ya lee `greenhouse_hr.leave_requests.attachment_asset_id`
  - `shared-assets-platform-v1` todavía no estaba aplicado
  - en runtime faltaban `greenhouse_core.assets`, `greenhouse_core.asset_access_log` y la columna `greenhouse_hr.leave_requests.attachment_asset_id`
- Mitigación remota aplicada por GCP/ADC con perfil `migrator`:
  - creación de `greenhouse_core.assets`
  - creación de `greenhouse_core.asset_access_log`
  - `ALTER TABLE greenhouse_hr.leave_requests ADD COLUMN attachment_asset_id`
  - FK `greenhouse_leave_requests_attachment_asset_fk`
  - índice `leave_requests_attachment_asset_idx`
  - grants a `greenhouse_app`, `greenhouse_runtime` y `greenhouse_migrator`
- Verificación remota:
  - `attachment_asset_id` ya existe en `greenhouse_hr.leave_requests`
  - `greenhouse_core.assets` y `greenhouse_core.asset_access_log` ya existen
  - query directa sobre `greenhouse_hr.leave_requests` volvió a devolver filas
- Hardening en repo:
  - `src/lib/hr-core/service.ts` ahora trata `undefined_column` / `relation does not exist` (`42703` / `42P01`) como fallback recuperable a BigQuery para evitar que `leave requests` tire la UI completa por schema drift
  - test nuevo en `src/lib/hr-core/service.test.ts`
- Validación local:
  - `pnpm vitest run src/lib/hr-core/service.test.ts`
  - `pnpm eslint src/lib/hr-core/service.ts src/lib/hr-core/service.test.ts`
  - `pnpm lint`
  - `pnpm build`
- Estado real de `TASK-173` tras esta mitigación:
  - `leave` quedó restaurado en staging
  - `purchase orders` y `payroll receipts` ya quedaron endurecidos en repo para convivir con schema legacy:
    - `src/lib/finance/purchase-order-store.ts` detecta `attachment_asset_id` antes de escribir
    - `src/lib/payroll/payroll-receipts-store.ts` detecta `asset_id` antes de persistir/regenerar
    - ambos tienen tests focalizados nuevos
  - validación local posterior:
    - `pnpm exec vitest run src/lib/finance/purchase-order-store.test.ts src/lib/payroll/payroll-receipts-store.test.ts src/lib/hr-core/service.test.ts`
    - `pnpm exec eslint src/lib/finance/purchase-order-store.ts src/lib/finance/purchase-order-store.test.ts src/lib/payroll/payroll-receipts-store.ts src/lib/payroll/payroll-receipts-store.test.ts src/lib/hr-core/service.ts src/lib/hr-core/service.test.ts`
    - `pnpm lint`
    - `pnpm build`
  - el bootstrap full sigue incompleto porque `greenhouse_finance.purchase_orders` y `greenhouse_payroll.payroll_receipts` continúan owned por `postgres`
  - verificación explícita: con credenciales runtime, `ALTER TABLE greenhouse_finance.purchase_orders ...` falla con `must be owner of table purchase_orders`
  - falta resolver acceso/owner `postgres` para cerrar completamente la task en GCP
