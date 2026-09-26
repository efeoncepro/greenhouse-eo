# TASK-1894 — Marketing Studio: puerta de ingreso de originales, commands de escritura y corte de autoridad

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — Re-scope por el ADR de fuente de verdad e ingreso (Accepted 2026-09-26)

- **Decisión que gobierna esta task:**
  [`EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md).
  La fuente de verdad es la base de Studio (metadatos, derechos, aprobaciones, evidencia) más el bucket privado
  `efeonce-marketing-studio-originals` (finales direccionados por sha256). OneDrive/SharePoint queda como **taller**:
  un final existe sólo cuando entró a Studio. No se planifica espejo con Microsoft Graph (a lo sumo un backfill único).
- **Qué cambió en esta task:** el primer entregable ya no es el conjunto completo de commands del catálogo, sino la
  **puerta de ingreso de originales**: subida en dos pasos con URL firmada, verificación en el worker,
  `createAssetVersion`, CLI `pnpm studio:upload`, derechos mínimos al subir e inferencia desde el nombre del archivo
  (Entregable A, Slices 1–3). Después vienen los commands que la task ya tenía (revisión y tres estados, campaña,
  brief, concepto, pieza, copy, anuncio, plan, calendario), reordenados (Entregable B, Slices 4–7), y al final la
  mecánica del corte por campaña con fecha declarada, la señal «pieza aprobada sin original en Studio» y el retiro de
  `media:ingest` (Entregable C, Slices 8–10).
- **Un command, tres puertas:** CLI (`pnpm studio:upload`, esta task), herramientas MCP de escritura (federación en
  `TASK-1899`) y UI de Studio (`TASK-1895`). Las tres llaman al mismo command; los binarios nunca viajan por MCP.
- **Alineado con el ADR:** la URL firmada apunta al nombre final `originals/sha256/<2 primeros hex>/<sha256>` (forma
  canónica de `originalObjectName`, TASK-1893) con `ifGenerationMatch=0`; el import real es `pnpm import:catalog`;
  subir exige `marketing_studio.asset.write` (roles `efeonce_admin`, `efeonce_account`, `efeonce_operations`,
  `designer`) y aprobar exige `marketing_studio.campaign.approve` (`efeonce_admin`, `efeonce_account`,
  `efeonce_operations`).
- **Scopes de bearer que fija esta task** (el ADR pide «un scope de escritura de assets» sin nombrarlo):
  `studio:assets:write` para la puerta de ingreso (espejo de `studio:assets:download`) y `studio:write` para el resto
  de las escrituras del catálogo, que usan la capability `marketing_studio.campaign.write`. Ningún scope de bearer
  autoriza aprobar: un `api_client` de máquina nunca aprueba. Tabla completa en Detailed Spec §«Operaciones y tools».
- **Preguntas abiertas del ADR que esta task resuelve** (ADR §11.3 y §11.4, y el nombre del estado):
  - **Dónde se recalcula el sha256:** en el worker de medios, con confirmación asíncrona. La confirmación
    (`createAssetVersion`) deja la subida en `pending_verification` y responde `202`; el worker, al recibir el
    `OBJECT_FINALIZE` del objeto, recalcula sha256, tamaño y firma de bytes y **sólo entonces** crea la versión (y en
    la misma corrida sus derivados). Invariante fijo: **no existe ninguna fila de `studio.asset_version` cuyo sha256 no
    haya sido recalculado sobre los bytes**; el estado pendiente vive en la subida (`studio.asset_upload`), nunca en
    una versión.
  - **Limpieza de subidas sin confirmar:** la subida vence a las 24 h (`expired`); el barrido horario del worker borra
    —con precondición de generación— todo objeto de `originals/` con más de 24 h que no tenga `media_object` ni
    subida viva; un objeto que no pasa la verificación se borra en el acto. No se usa lifecycle para esto (el bucket
    no sabe qué objetos tienen fila).
  - **Nombre del estado de revisión:** `pending_review` (luego `approved` o `changes_requested`); las versiones que
    vienen del catálogo quedan `imported`.
- **Reparto con TASK-1899 (commiteada 2026-09-26):** esta task siembra `marketing_studio.asset.write` y
  `marketing_studio.campaign.write` con `allowed_actions = ['create','update']` y declara en el manifiesto la acción de
  `can()` de cada tool (`capabilityAction`); el manifiesto exporta por tool de escritura `method`, `class`,
  `requiresPerson`, `destructive` y el transporte de cada argumento (ruta, `Idempotency-Key`, `If-Match`, query,
  cuerpo). TASK-1899 siembra `marketing_studio.campaign.approve`, implementa el `proposalDigest` sobre el punto de
  extensión `confirmation` que deja este kernel, y el actor delegado sobre el puerto de autoridad que aquí niega por
  defecto.
- `Blocked by` pasa a `none`: TASK-1890, TASK-1893 y TASK-1896 están complete.

## Delta 2026-09-26 — TASK-1893 y TASK-1896 cerradas

- **TASK-1896 complete:** la precondición de producción está cumplida. Ensayo de restauración verde contra
  `marketing_studio` (paridad 18 tablas, job 49 s), falla forzada probada en staging, scheduler del ensayo activo,
  Sentry, uptime y señal `platform.marketing_studio.health` en producción. Las brechas que quedaron (reglas de alerta
  propias de Sentry, error forzado, caída simulada, mensaje real a Teams) están en sus Follow-ups y no bloquean esta
  task.
- **TASK-1893 complete:** hereda el almacén de originales en producción (`studio.media_object`, bucket
  `efeonce-marketing-studio-originals`, objeto por sha256 con `ifGenerationMatch=0`), la descarga firmada
  (`issueOriginalDownload`, 10 min, auditada), los derechos por versión (`setAssetVersionRights`, CLI) y
  `studio.worker_run`. El worker genera derivados por la notificación `OBJECT_FINALIZE` del prefijo `originals/`.
  24 imágenes de CMP-002 siguen sólo en OneDrive por falta de sha256 en el catálogo.

## Delta 2026-09-26

- TASK-1896: los commands de escritura heredan `captureWithDomain` y `logEvent` de `@studio/observability` (nunca
  `Sentry.captureException` suelto), el id de request de `handle()` (`X-Correlation-Id`, usado como `correlation_id`
  de `audit_event`) y el health profundo.

## Delta 2026-09-25

- TASK-1899 pide: cada aprobación como command y tool propios con `requiresPerson` (`brief.approve`, `creative.approve`, `media_authorization.authorize`, `budget_line.approve`); las tools genéricas rechazan destinos aprobatorios. **El `proposalDigest` (428 sin él, 409 alterado, por toda puerta) lo implementa TASK-1899** (ADR §9); esta task sólo deja en el kernel el punto de extensión `confirmation` que el `dryRun` de las operaciones `requiresPerson` o `destructive` invoca después de calcular el diff (en esta task devuelve el diff sin digest). Capability `marketing_studio.campaign.approve` separada de `write` y sembrada por TASK-1899, con grant a `efeonce_admin`, `efeonce_account` y `efeonce_operations` (decisión del operador 2026-09-25; `designer` escribe pero no aprueba).
- Regla del operador: todo lo de la UI se puede por API y por MCP, **incluidas las aprobaciones**. Toda aprobación exige un actor **persona** (sesión, identidad delegada verificable u operador en terminal); un `api_client` de máquina sin persona recibe `approval_requires_person` (403).
- Decisiones del operador: escriben `efeonce_admin`, `efeonce_operations`, `efeonce_account` y `designer`; el brief es entidad estructurada propia (Detailed Spec §«Brief como entidad»).
- TASK-1895 (UI consumidora) pide: (1) proyección de permisos en el reader de campaña — `writable`, `lockReason` (`open_mode` | `missing_capability` | `authority_onedrive`), transiciones permitidas por estado y `revision`; (2) actor de prueba local y campaña sandbox en staging. Ambas quedan en el Slice 7.
- (TASK-1890/1891) Cada command nace en el registro único `packages/contracts/src/operations.ts` con su tool o exclusión con razón; `pnpm mcp:manifest:generate` y el test de paridad handlers ↔ registro lo exigen. Tras cada cambio del manifiesto, el gateway corre `pnpm studio:manifest:sync` o su guard bidireccional falla.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-049`
- Status real: `Diseno — re-scope 2026-09-26 por el ADR de fuente de verdad e ingreso; ningún slice empezado; la puerta de ingreso (Slices 1–3) es el primer entregable a producción`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (2026-09-26: TASK-1890, TASK-1893 y TASK-1896 complete)
- Branch: `Greenhouse develop (capabilities, docs) · efeonce-marketing-studio main (código, migraciones, worker, infra); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte a Marketing Studio en la fuente de verdad escribible de las campañas, empezando por los archivos finales.
Primero abre **una sola puerta de ingreso de originales** (`createAssetVersion`): el cliente pide una URL firmada,
sube el archivo directo a GCS y confirma; el worker recalcula tamaño, tipo y sha256 y sólo entonces crea la versión en
`pending_review`, con actor, derechos mínimos y auditoría, y genera sus derivados. La CLI `pnpm studio:upload` es la
primera puerta y deduce campaña, concepto, pieza y proporción desde el nombre del archivo. Después agrega los commands del catálogo (revisión
de versiones, tres estados, campaña, brief, concepto, pieza, copy, anuncio, plan, calendario) con idempotencia,
`If-Match` y auditoría. Al final corta la autoridad campaña por campaña con fecha declarada, publica la señal «pieza
aprobada sin original en Studio» y retira `media:ingest` y el `apply` del catálogo de OneDrive.

## Why This Task Exists

Studio sólo lee. Los finales siguen naciendo en OneDrive y entran por `pnpm media:ingest`, que copia a GCS sólo lo que
el catálogo ya registró con sha256 (24 imágenes de CMP-002 no entraron por eso). El catálogo sigue viviendo en
`CATALOGO-DATOS.json` y entra por el importador idempotente. Mientras sea así:

- No existe una forma gobernada de que un final entre a Studio: sin actor, sin derechos declarados, sin revisión.
  El ADR aceptado el 2026-09-26 decide que un final existe sólo cuando entró a Studio; falta la puerta.
- Nadie (persona, CLI ni agente) puede corregir un copy, mover un estado o registrar una versión desde Studio; todo
  cambio se hace a mano en OneDrive y se reimporta, sin actor ni auditoría por cambio.
- Si alguien escribiera directo en `studio.*`, el siguiente reimport lo pisaría en silencio: no existe la noción de
  «esta pieza o esta campaña ya la gobierna Studio».
- Los invariantes del dominio (tres estados independientes; propuesto ≠ aprobado ≠ real; copy literal; programado ≠
  publicado; `null` = ausente) hoy sólo los protege el importador.
- Sin escrituras, un agente autorizado no puede operar Studio (Full API Parity) y la UI de edición (TASK-1895) y la
  federación de escritura (TASK-1899) no tienen qué consumir.

## Goal

- Existe una única puerta de ingreso de originales (`requestAssetVersionUpload` → PUT a GCS → `createAssetVersion`), con sha256/tamaño/tipo recalculados en el worker antes de que exista la versión, dedup por contenido, derechos mínimos obligatorios, versión nueva en `pending_review`, actor y `audit_event`; la CLI `pnpm studio:upload` la usa en producción.
- Cada entidad escribible de `studio.*` tiene un command canónico en `packages/domain/src/commands` con `Idempotency-Key`, `If-Match`/revisión, actor, auditoría y errores canónicos; API, CLI y MCP lo consumen sin lógica paralela.
- Los tres estados de campaña y la revisión de versiones transicionan sólo por su matriz legal; las aprobaciones exigen persona.
- Cada campaña pasa a Studio con fecha de corte declarada y reversible; el importador y `media:ingest` se niegan a pisarla; la señal «pieza aprobada sin original en Studio» está en el health profundo y en Greenhouse; al final `media:ingest` y el `apply` del catálogo quedan retirados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (**gobernante**, Accepted 2026-09-26; §4.2 un command y tres puertas, §4.4 aprobación humana, §4.5 corte, §8 invariantes)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 invariantes, §4 contrato, §5 acceso, §7 import y corte, §7.2 originales y worker, §9 observabilidad)
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (§Contrato obligatorio; §Futuro consumer Efeonce MCP)
- `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md` y `docs/campaigns/` (CDRs: qué es una campaña y sus estados)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (loop `propose → confirm → execute`)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Toda escritura pasa por un command de `packages/domain/src/commands` ejecutado por el kernel (`runCommand`). Los route handlers, la CLI y el worker validan transporte y actor, y delegan; nunca escriben tablas.
- **Un command, tres puertas.** `createAssetVersion` es el único camino por el que nace una versión desde Studio; la CLI, las tools MCP y la UI lo invocan igual. Los bytes viajan sólo del cliente a GCS por URL firmada; nunca por la API de Studio ni por MCP.
- **Ninguna versión sin sha256 recalculado.** Una fila de `asset_version` (y su `media_object`) sólo nace después de que el worker recalculó sha256, tamaño y firma de bytes del objeto y los comparó con lo declarado; si no coinciden, el objeto se borra (precondición de generación) y la subida queda `rejected`. La función web nunca lee los bytes: sólo firma la URL y registra la confirmación.
- Las versiones nacidas en Studio empiezan en `pending_review`; sólo una persona (operador en terminal, sesión con capability o identidad delegada verificable) las aprueba. Un `api_client` de máquina nunca aprueba.
- Tres estados independientes (`creative_state`, `media_authorization_state`, `launch_state`): cada uno con su matriz legal y su command; un command nunca mueve dos estados ni deriva uno del otro.
- `budget_line.kind ∈ {proposed, approved, actual}`: ningún command, reader ni export suma líneas de `kind` distinto; `actual` no se escribe por command de operador ni agente.
- Copy literal: se guarda byte a byte; el command rechaza en vez de «arreglar».
- `scheduled_post` programado ≠ publicado: ningún command marca un post como publicado.
- `null` = ausente: un `PATCH` distingue «campo omitido» de «campo en `null`» y nunca inventa defaults.
- `anonymous_open` nunca escribe, aunque `STUDIO_ACCESS_MODE=open`.
- Capability nueva ⇒ grant a ≥1 rol real en `src/lib/entitlements/runtime.ts` en el mismo commit (`capability-grant-coverage.test.ts`).
- El importador y `media:ingest` nunca pisan una pieza con versiones de origen `studio` ni una campaña con `source_of_truth = 'studio'`.
- Sin SQL contra la base de Greenhouse; sin restaurar ni clonar la instancia Cloud SQL compartida.

## Normative Docs

- `.claude/skills/efeonce-marketing-studio/SKILL.md` y sus `references/` (ledger, mapa de arquitectura, contratos, operación, lecciones): **contrato de mantenimiento obligatorio al cerrar**.
- `.claude/skills/efeonce-mcp-platform/SKILL.md` y la skill `mcp-craft` (nombres, descripciones y anotaciones de tools de escritura).
- `.claude/skills/greenhouse-backend/SKILL.md` (command semantics, errores canónicos, idempotencia).
- `AGENTS.md` y `CLAUDE.md` del repo `efeonce-marketing-studio` (comandos vigentes, gates `absolute-path-gate`, `domain-boundary-gate`, `dependency-catalog-gate`).
- `docs/tasks/complete/TASK-1890-marketing-studio-agent-ready-contract.md` (manifiesto, bearer, semántica), `docs/tasks/complete/TASK-1893-marketing-studio-original-asset-store-media-worker.md` (almacén, worker, matriz IAM) y `docs/tasks/complete/TASK-1896-marketing-studio-observability-restore.md` (health profundo, `ops_run`/`worker_run`): esta task los extiende, no los redefine.
- `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` (runtime vivo y runbooks).

## Dependencies & Impact

### Depends on

- `TASK-1890` (complete): registro de operaciones, manifiesto con guard de paridad, bearer `api_client`, organización canónica y capability `marketing_studio.campaign.read`.
- `TASK-1893` (complete): bucket de originales por ambiente, `studio.media_object`, `originalObjectName`, `classifyOriginal`, `MAX_ORIGINAL_BYTES` (1 GiB), firma V4 por IAM `signBlob` (`apps/web/src/server/downloads.ts`), worker `marketing-studio-media-worker[-staging]` con `OBJECT_FINALIZE` sobre `originals/` y respuesta 503 `media_object_pending`, `setAssetVersionRights` y `LICENSE_KINDS`.
- `TASK-1896` (complete): `@studio/observability`, `handle()` con `X-Correlation-Id`, health profundo `HealthDeep` con `freshness[]` y señal `platform.marketing_studio.health` en Greenhouse.
- ADR `EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` en `Accepted`.

### Blocks / Impacts

- `TASK-1895` (UI de edición): consume `requestAssetVersionUpload`, `createAssetVersion`, la revisión de versiones, los demás commands y la proyección de permisos (Slice 7). Sin esta task se detiene en su Slice 1.
- `TASK-1899` (MCP de escritura y aprobaciones): federa las tools de clase `write`/`approve` de este manifiesto, siembra `marketing_studio.campaign.approve` e implementa el puerto de autoridad del actor delegado.
- `TASK-1898` (login): implementa el puerto de autoridad del actor `user`; no reescribe commands.
- `TASK-1892`: sin impacto directo (lecturas de métricas).
- Operación de campañas `CMP-001…CMP-005`: tras el corte, sus finales y su catálogo sólo cambian en Studio.
- Gateway `efeonce-mcp`: cada cambio del manifiesto exige `pnpm studio:manifest:sync` (sin federar escrituras hasta TASK-1899).

### Files owned

- Repo Studio — dominio: `packages/domain/src/commands/**` (nuevo: `kernel.ts`, `idempotency.ts`, `authority.ts`, `asset-version.ts`, `asset-review.ts`, `campaign.ts`, `brief.ts`, `concept.ts`, `asset.ts`, `copy.ts`, `ad.ts`, `media-plan.ts`, `calendar.ts`, `state-transitions.ts`, `cutover.ts`), `packages/domain/src/state-machines/**`, `packages/domain/src/media/upload.ts` [nuevo], `packages/domain/src/media/filename-convention.ts` [nuevo], `packages/domain/src/media/ports.ts`, `packages/domain/src/rights/rights.ts` (extraer validación reutilizable), `packages/domain/src/readers/campaigns.ts` y `packages/domain/src/readers/overview.ts` (versión vigente, permisos, señal), `packages/domain/src/health/**` (frescura nueva), `packages/domain/src/import/catalog.ts` (guardas de autoridad), `packages/domain/src/export/catalog-export.ts` [nuevo], `packages/domain/src/auth/api-client.ts` (scopes nuevos), `packages/domain/src/errors.ts`, `packages/domain/src/index.ts`
- Repo Studio — contrato y base: `packages/contracts/src/operations.ts`, `packages/contracts/src/dto.ts`, `packages/contracts/src/commands.ts` [nuevo], `packages/contracts/src/errors.ts`, `packages/contracts/src/health.ts`, `packages/contracts/src/semantics.ts`, `packages/contracts/src/openapi.ts`, `packages/contracts/src/tool-manifest.ts`, `packages/contracts/generated/**` (sólo por `pnpm mcp:manifest:generate`), `packages/database/migrations/*_asset-ingest-door.sql` [nuevo], `packages/database/migrations/*_catalog-write-commands.sql` [nuevo], `packages/database/migrations/*_campaign-authority-cutover.sql` [nuevo], `packages/database/src/schema.ts`, `packages/database/src/storage.ts` (firma V4 de subida), `packages/database/src/storage-write.ts` (borrado con precondición de generación, sólo worker)
- Repo Studio — adaptadores: `apps/web/src/app/api/v1/**` (rutas `POST`/`PATCH` nuevas), `apps/web/src/server/api.ts`, `apps/web/src/server/runtime.ts`, `apps/web/src/server/uploads.ts` [nuevo], `apps/web/src/server/operations-parity.test.ts`, `apps/worker/src/handlers.ts`, `apps/worker/src/server.ts`, `apps/worker/src/config.ts`, `apps/worker/deploy.sh`, `scripts/studio-upload.ts` [nuevo], `scripts/studio-write.ts` [nuevo], `scripts/cutover-campaign.ts` [nuevo], `scripts/export-catalog.ts` [nuevo], `scripts/import-catalog.ts`, `scripts/media-ingest.ts`, `scripts/api-client.ts`, `scripts/gates/domain-boundary-gate.mjs`, `scripts/ops/infra/media-originals.sh`, `package.json` (scripts nuevos)
- Greenhouse: `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`, `migrations/*marketing-studio-asset-write-capability*` [nuevo], `migrations/*marketing-studio-campaign-write-capability*` [nuevo], `src/lib/reliability/queries/marketing-studio-health.ts` (sólo si la frescura nueva exige cambio de severidad), `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`, `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md`, `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md`, `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, `docs/manual-de-uso/marketing-studio/**`, `docs/documentation/marketing-studio/efeonce-marketing-studio.md`, `docs/mcp/skills/marketing-studio/SKILL.md`, `.claude/skills/efeonce-marketing-studio/**` (+ espejo `.codex/`)

## Current Repo State

### Already exists

- Schema `studio` (migraciones `1758800000000_studio-foundation.sql`, `1758830000000_asset-renditions.sql`, `1790362617534_organization-canonical.sql`, `1790409193629_media-originals.sql`, `1790409464603_ops-run.sql`): `campaign` con tres estados, `revision` y `updated_at`; `concept`; `asset` (`asset_id` texto, `concept_id`, `title`, `kind`, `aspect_ratio ~ '^[0-9]+x[0-9]+$'`, **sin** `revision`); `asset_version` (`version_no`, `storage_provider ∈ {onedrive_provenance, gcs}`, `sha256`, `provenance jsonb`, columnas `rights_*`, `media_object_sha256` con CHECK `(storage_provider = 'gcs') = (media_object_sha256 IS NOT NULL)`, `UNIQUE (asset_id, version_no)`, **sin** estado de revisión ni actor); `copy_variant` con `revision`; `media_object` (PK sha256, CHECK `object_name = 'originals/sha256/<aa>/<sha256>'`); `audit_event` append-only; `api_client`; `worker_run`; `ops_run`.
- `packages/domain/src/media/originals.ts`: `classifyOriginal` (extensión + firma de bytes; rechaza formatos de trabajo), `ORIGINAL_MIME_TYPES`, `originalObjectName`, `MAX_ORIGINAL_BYTES = 1 GiB`, `downloadFilename`.
- `packages/domain/src/media/ingest.ts`: `ingestOriginals` / `revertOriginalProvider` (sólo `operator_cli`; enlaza versiones existentes de OneDrive tras verificar sha256 contra el catálogo).
- `packages/domain/src/media/download.ts` + `apps/web/src/server/downloads.ts`: firma V4 de lectura por IAM `signBlob` con la SA del runtime; `STUDIO_ORIGINAL_DOWNLOADS_ENABLED`.
- `packages/domain/src/rights/rights.ts`: `LICENSE_KINDS`, `rightsOf`, `rightsStatusOf`, `setAssetVersionRights` (sólo CLI hoy, `pnpm media:rights`).
- `packages/domain/src/auth/api-client.ts`: `API_SCOPES = ['studio:read', 'studio:health', 'studio:assets:download']`, `resolveApiClientActor`, `requireScope`, `narrowToOrganization`.
- `packages/domain/src/actor.ts`: `anonymous_open | api_client | user | operator_cli`, `actorLabel`.
- `packages/contracts/src/operations.ts`: 18 operaciones, todas `GET` (`method: 'GET'` literal; `ToolSpec.writes: false` literal); 13 tools + 5 exclusiones; API 1.2.0.
- `apps/worker/src/handlers.ts`: `handleOriginalFinalized` (ignora objetos fuera de `originals/sha256/…`; 503 si falta `media_object`), `handleReconcileDerivatives` (cada hora), `handleMetricoolReadback`.
- Readers: la versión «vigente» es hoy `ORDER BY version_no DESC LIMIT 1` en `packages/domain/src/readers/overview.ts` (dos lugares) y `packages/domain/src/readers/campaigns.ts` (tres lugares).
- `scripts/gates/domain-boundary-gate.mjs`: `apps/web` no puede importar `@studio/database/storage-write`, `@studio/domain/worker`, `@studio/domain/media-toolkit` ni `sharp`.
- Health profundo (`packages/contracts/src/health.ts`): `HEALTH_FRESHNESS_NAMES` con seis entradas; Greenhouse proyecta `degraded` a `warning` sin conocer nombres (`src/lib/reliability/queries/marketing-studio-health.ts` acepta cualquier `name` válido).
- Greenhouse: capabilities `marketing_studio.campaign.read` y `marketing_studio.asset.download` con grant a `efeonce_admin`, `efeonce_account`, `efeonce_operations` (`src/lib/entitlements/runtime.ts`).
- Convención real de nombres de finales en OneDrive (verificada 2026-09-26): `…/03. Finales/CMP-002 - …/01 - Imagenes/4x5/CMP002-06 - La IA es un gasto - 4x5.png`; los archivos de taller llevan sufijos (`CMP001-04 - Sales tu - 9x16_pre-AXIS-2026-09-23.png`). Ids reales: concepto `CMP002-06`, `CMP004-C01`, `CMP005-S01`; pieza `CMP001-01-imagen-4x5`, `CMP003-01-video-9x16`.

### Gap

- Ninguna puerta de ingreso: no hay URL firmada de subida, ni verificación de subida, ni creación de versión desde Studio, ni CLI de subida.
- `asset_version` no tiene estado de revisión, origen, actor ni nombre original; `asset` no tiene `revision`.
- Ningún command de escritura; ninguna ruta `POST`/`PATCH`; el registro de operaciones no admite métodos distintos de `GET` ni tools de escritura.
- Sin idempotencia persistida, sin matriz de transiciones legales, sin autoridad por pieza ni por campaña.
- Sin export inverso, sin runbook de corte, sin señal de piezas aprobadas sin original.
- El brief no tiene contenido propio (sólo `brief_ref`).
- Sin capabilities de escritura en Greenhouse ni scopes de escritura en Studio.
- La SA del runtime web no puede firmar subidas (no tiene `storage.objects.create`); ninguna SA puede borrar objetos de originales (ni rechazados ni huérfanos); `handleOriginalFinalized` no verifica sha256 ni crea versiones; el bucket no tiene CORS para subidas desde el navegador.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeonce-marketing-studio (packages/domain commands y media, packages/contracts, packages/database migraciones y adaptadores de storage, apps/web rutas /api/v1, apps/worker, scripts CLI e infra) + Greenhouse (capabilities, señal y documentación)`
- Future candidate home: `api`
- Boundary: `los commands de packages/domain/src/commands son el único camino de escritura sobre studio.*; apps/web (HTTP), las CLIs de operador, el worker, el importador y la futura federación MCP son adaptadores; el manifiesto de packages/contracts es la única fuente del inventario de tools; los bytes van del cliente a GCS por URL firmada y sólo el worker los lee para verificarlos`
- Server/browser split: `commands, idempotencia, firma de URLs y verificación de bearer sólo server-side; al navegador llegan DTOs y una URL firmada de un solo objeto (el nombre por contenido del archivo bajo originals/sha256, con ifGenerationMatch=0) que vence en 30 min; nunca credenciales ni nombre de bucket fuera de la URL`
- Build impact: `none sobre greenhouse-eo salvo capabilities y docs; en Studio no entra dependencia nueva (zod, kysely y el cliente de GCS ya están en el catálogo pnpm)`
- Extraction blocker: `none — Studio ya es repo y runtime propios; cada transacción cruza tablas de un mismo schema`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `schema studio (versiones de pieza con su original, luego todas las entidades escribibles) + bucket efeonce-marketing-studio-originals; la autoridad pasa de OneDrive a Studio primero por pieza (primera versión de origen studio) y luego por campaña (corte declarado)`
- Consumidores afectados: `API /api/v1, CLI de operador (studio:upload, studio:write, cutover:campaign, export:catalog), worker de medios, importador de catálogo, media:ingest, manifiesto de tools y gateway (TASK-1899), UI de edición (TASK-1895), actor user (TASK-1898), señal de Greenhouse`
- Runtime target: `production (Vercel de studio.efeonce.org, worker Cloud Run marketing-studio-media-worker, bucket de originales, base marketing_studio) y Greenhouse (capabilities, señal)`

### Contract surface

- Contrato existente a respetar: `OpenAPI v1 de Studio; errores { error, code, actionable }; tool-manifest y guard de paridad de TASK-1890; health profundo de TASK-1896; almacén y descarga de TASK-1893; MCP_TOOL_SURFACE_INVARIANTS; ADR API-first; ADR de fuente de verdad e ingreso`
- Contrato nuevo o modificado: `operaciones requestAssetVersionUpload y createAssetVersion (Entregable A); reviewAssetVersion y demás commands (Entregable B, tabla del Detailed Spec); cabeceras Idempotency-Key (obligatoria en todo POST/PATCH) e If-Match (obligatoria en mutación de entidad existente); ETag en lecturas de entidad; tools de clase write/approve con requiresPerson; scopes studio:assets:write y studio:write; capabilities marketing_studio.asset.write y marketing_studio.campaign.write; DTO de versión con reviewState, origin y createdBy; frescura approved_without_original; columna source_of_truth + cutover_on; export inverso`
- Backward compatibility: `compatible — rutas y tools nuevas; las lecturas agregan campos; la versión «vigente» cambia de «la última» a «la última aprobada o importada», que es idéntica para todo dato existente (todas las filas actuales quedan imported)`
- Full API parity: `cada escritura es un command con contrato; HTTP, CLI, MCP y UI son adaptadores del mismo command; el guard de paridad del manifiesto exige tool o exclusión para cada operación nueva`

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.asset_upload [nueva], studio.idempotency_record [nueva], studio.asset (+revision), studio.asset_version (+origin, +review_state, +created_by, +original_filename, +reviewed_by, +reviewed_at, +review_note), studio.media_object (inserción por el worker tras verificar; o por el camino de dedup, sobre un objeto ya verificado), studio.audit_event, studio.api_client (scopes nuevos); después: studio.campaign (+source_of_truth, +cutover_on, +cutover_by), studio.campaign_brief + campaign_brief_audience + campaign_brief_kpi [nuevas], studio.concept, studio.copy_variant, studio.ad_configuration, studio.media_flight, studio.budget_line, studio.scheduled_post, studio.import_run (conteos de salto)`
- Invariantes que no se pueden romper:
  - **No existe ninguna fila de `asset_version` ni de `media_object` cuyo sha256 no se haya recalculado sobre los bytes.** La versión la crea el worker después de recalcular sha256, tamaño y tipo (extensión + firma de bytes, `classifyOriginal`) y compararlos con la subida; el camino de dedup sólo enlaza un `media_object` ya existente (verificado cuando nació). Un objeto que no coincide se borra con precondición de generación y la subida queda `rejected`.
  - Una versión de origen `studio` nace siempre con `review_state = 'pending_review'`, `created_by` = actor, `original_filename` y derechos con al menos `rights_license_kind`; nunca nace aprobada.
  - `review_state = 'imported'` ⟺ `origin = 'catalog_import'` (CHECK); `pending_review → approved | changes_requested` son las únicas transiciones; `approved` y `changes_requested` son terminales para esa versión (la corrección es una versión nueva).
  - `asset_version` es append-only: `version_no = max + 1` bajo bloqueo de la fila de `asset`; nunca se reemplaza ni borra una versión.
  - Dedup por contenido: el mismo sha256 en la misma pieza no crea versión (responde el duplicado); el mismo sha256 en otra pieza comparte un único `media_object`.
  - La versión «vigente» de una pieza es la de mayor `version_no` con `review_state ∈ {imported, approved}`; una versión `pending_review` o `changes_requested` nunca se muestra como vigente.
  - Toda escritura exitosa inserta exactamente un `audit_event` en la misma transacción, con actor, operación, entidad, `correlation_id` y `detail` (antes/después de los campos cambiados, sin copys completos de otras entidades).
  - `anonymous_open` nunca llega a un command: `403 write_not_allowed` antes de abrir transacción.
  - Un `api_client` escribe sólo con el scope de la operación y sobre campañas de sus `organization_ids`; fuera de ellas, `404` anti-oráculo. Nunca aprueba (`403 approval_requires_person`).
  - El importador no crea, modifica ni renumera versiones de una pieza que tenga alguna versión de origen `studio`, ni toca una campaña con `source_of_truth = 'studio'` ni sus hijos; lo reporta en `import_run`.
  - Los tres estados sólo cambian por su command de transición y dentro de su matriz legal; una transición ilegal devuelve `409 invalid_state_transition` sin escribir.
  - Ningún command, reader ni export suma `budget_line` de `kind` distinto; `actual` no se escribe por command.
  - El copy se persiste byte a byte; ningún command marca un post como publicado; `PATCH` distingue omitido de `null`.
- Write-target allowlist: `N/A — Studio no tiene boundary test de destinos de escritura por tabla; el domain-boundary-gate se extiende (Slice 1) para que sólo packages/domain/src/commands/**, packages/domain/src/media/upload.ts, packages/domain/src/media/ingest.ts, packages/domain/src/media/derivatives.ts, packages/domain/src/media/worker-run.ts, packages/domain/src/rights/**, packages/domain/src/auth/** e packages/domain/src/import/** escriban en studio.* [verificar la lista contra los escritores actuales]; apps/web sigue sin poder importar @studio/database/storage-write`
- Tenant/space boundary: `organización canónica de Greenhouse en campaign.organization_id; api_client se intersecta con organization_ids; operator_cli ve todo; user (TASK-1898) y el actor delegado (TASK-1899) pasan por el puerto de autoridad, que en esta task niega por defecto`
- Idempotency/concurrency: `Idempotency-Key obligatoria en todo POST/PATCH (studio.idempotency_record, PK (actor, operation_id, idempotency_key), request_sha256, respuesta terminal, expires_at = 24 h): misma llave + mismo cuerpo ⇒ misma respuesta sin reescribir; misma llave + cuerpo distinto ⇒ 422 idempotency_key_reused; sólo se guardan respuestas terminales (201/200/4xx de negocio), nunca 202 ni 5xx. Concurrencia optimista: If-Match con la revisión vigente de la entidad (campaign.revision, asset.revision, copy_variant.revision, …); distinta ⇒ 412 revision_conflict sin escribir; ausente en mutación ⇒ 428 precondition_required. UPDATE … WHERE revision = $expected; revision = revision + 1. Numeración de versiones con SELECT … FOR UPDATE sobre studio.asset + UNIQUE (asset_id, version_no) como guarda de carrera`
- Audit/outbox/history: `audit_event append-only en la misma transacción (operaciones asset_upload.requested, asset_upload.confirmed, asset_upload.rejected, asset_upload.expired, asset_version.created, asset_version.approved, asset_version.changes_requested y las del Entregable B); worker_run de la verificación dentro de kind original_finalized (conteos versions_created, uploads_rejected) y del barrido en reconcile_derivatives (uploads_expired, orphans_deleted); sin outbox (Studio no tiene consumidores reactivos); import_run registra los saltos por autoridad`

### Migration, backfill and rollout

- Migration posture: `additive — tablas nuevas (asset_upload, idempotency_record, campaign_brief*), columnas con DEFAULT (asset.revision DEFAULT 1; asset_version.origin DEFAULT 'catalog_import'; asset_version.review_state DEFAULT 'imported'; campaign.source_of_truth DEFAULT 'onedrive'), CHECK nuevos, bloque DO de verificación post-DDL en cada migración; sin DROP`
- Default state: `STUDIO_UPLOADS_ENABLED=false (Vercel de Studio) y MEDIA_WORKER_UPLOAD_VERIFY_ENABLED=false (worker) al desplegar; ningún api_client tiene studio:assets:write ni studio:write; todas las campañas en source_of_truth = 'onedrive'`
- Backfill plan: `las filas existentes de asset_version quedan origin = 'catalog_import' y review_state = 'imported' por DEFAULT; asset.revision = 1 por DEFAULT; campañas en 'onedrive' por DEFAULT; el corte de cada campaña es un comando explícito, no un backfill; las 24 imágenes de CMP-002 entran por studio:upload (backfill único, Slice 10)`
- Rollback path: `puerta de ingreso: flags a false + revert; las versiones ya creadas quedan auditadas y se corrigen con una versión nueva o una revisión changes_requested; commands: revocar scopes de escritura + revert; corte: cutover:campaign --revert por campaña; migraciones: down sólo mientras ninguna fila use las columnas nuevas`
- External coordination: `IAM de la SA del runtime (crear en originals/sha256/ para firmar) y del worker (borrar en originals/sha256/ con precondición) con condiciones por prefijo y CORS del bucket (scripts/ops/infra/media-originals.sh); flags en Vercel de Studio y apps/worker/deploy.sh; filas en FEATURE_FLAG_STATE_LEDGER; release de Greenhouse para las capabilities; gateway studio:manifest:sync; aviso a quienes editan CATALOGO-DATOS.json antes de cada corte`

### Security and access

- Auth/access gate: `Entregable A: operator_cli (CLI local, impersonando la SA de ingesta del ambiente) o api_client con studio:assets:write + organización permitida; Entregable B: studio:write; aprobaciones: sólo persona (operator_cli hoy; user y delegado por el puerto de autoridad de TASK-1898/1899 con marketing_studio.campaign.approve). En Greenhouse: marketing_studio.asset.write y marketing_studio.campaign.write, que el gateway verificará por persona al federar (TASK-1899)`
- Sensitive data posture: `finales creativos y derechos de uso (sensibilidad comercial interna), presupuestos y copys; sin PII personal más allá del actor; tokens sólo como sha256; la URL firmada de subida sólo crea un objeto (el de su sha256, si no existe) y vence en 30 min; nunca se loggea la URL firmada ni el cuerpo`
- Error contract: `{ error (es-CL), code, actionable } del ERROR_CATALOG; códigos nuevos en el Detailed Spec §«Errores»; nunca SQL, stack, bucket ni ruta de objeto al cliente; captureWithDomain + logEvent`
- Abuse/rate-limit posture: `sólo actores con scope explícito; tope de 20 subidas abiertas (awaiting_upload/pending_verification) por actor; tope de tamaño 1 GiB (MAX_ORIGINAL_BYTES) validado al pedir la URL y al verificar; la subida vence en 24 h y el barrido horario borra objetos huérfanos; un objeto que no pasa la verificación se borra en el acto; idempotency_record con expiración`

### Runtime evidence

- Local checks: `pnpm check en Studio (tests de kernel, idempotencia, inferencia de nombres con los nombres reales de OneDrive, verificación de subida, dedup, derechos obligatorios, vigente vs pendiente, guardas del importador, matrices, copy literal, regla de kind, paridad y leak del manifiesto); pnpm local:check y pnpm test src/lib/entitlements en Greenhouse`
- DB/runtime checks: `tras migrar: tablas, columnas y CHECK presentes en staging y producción (information_schema + bloque DO); filas existentes con origin = catalog_import / review_state = imported; audit_event sigue rechazando UPDATE/DELETE`
- Integration checks: `pnpm studio:upload contra staging y producción con un archivo real: URL firmada → PUT 200 → confirmación 202 → worker_run original_finalized succeeded con versión creada → versión v(n+1) pending_review → derivados en la misma corrida; repetición: duplicado sin versión nueva; bytes distintos de los declarados: rejected sha256_mismatch y el objeto borrado; curl: sin bearer 403, sin scope 403, organización ajena 404`
- Reliability signals/logs: `worker_run kind original_finalized con conteos versions_created/uploads_rejected y kind reconcile_derivatives con uploads_expired/orphans_deleted; frescura approved_without_original en /api/v1/health?deep=1 y en platform.marketing_studio.health; logs con correlationId por escritura; import_run con skipped_studio_owned_asset y skipped_studio_owned_campaign`
- Production verification sequence: `ver Rollout Plan`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive: cada escritura vive en `packages/domain/src/commands` (o `media/upload.ts` para la verificación), no en handlers, CLI ni worker.
- [ ] Modelada como command por aggregate (versión de pieza, campaña, brief, pieza, copy, plan de medios, post), no como click-handler.
- [ ] Cada command con authorization fina (scope + organización + capability Greenhouse + puerto de autoridad para personas), idempotencia, auditoría, errores canónicos sanitizados y `correlationId`.
- [ ] Capabilities `marketing_studio.asset.write` y `marketing_studio.campaign.write` + grant a roles reales en el mismo commit que las usa, con coverage test verde.
- [ ] Camino programático declarado: `/api/v1` + CLIs de operador + tools de clase `write`/`approve` en el manifiesto; la federación MCP es `TASK-1899` y la UI es `TASK-1895`.
- [ ] Writes aptos para `propose → confirm → execute`: cada tool de escritura admite `dryRun` que devuelve el diff (o la inferencia) sin escribir.
- [ ] Un primitive, muchos consumers: HTTP, CLI, worker e importador invocan los mismos commands y primitives.
- [ ] Parity check = SÍ para cada operación nueva (guard del manifiesto verde).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

La task se entrega en tres entregables, cada uno desplegable a producción por sí solo. **El Entregable A es el primero
que llega a producción**; el B no empieza a exponerse hasta que A está verde en producción.

### Entregable A — Puerta de ingreso de originales

#### Slice 1 — Kernel de command, migración de ingreso y contrato de escritura

- Migración `packages/database/migrations/<ts>_asset-ingest-door.sql` (crear con node-pg-migrate del paquete `@studio/database`; `-- Up Migration` exacto; bloque `DO` que aborta si falta cualquier objeto):
  - `studio.asset_upload` (ver Detailed Spec §«Tablas nuevas»).
  - `studio.idempotency_record`.
  - `studio.asset`: `revision integer NOT NULL DEFAULT 1`.
  - `studio.asset_version`: `origin`, `review_state`, `created_by`, `original_filename`, `reviewed_by`, `reviewed_at`, `review_note` + CHECK `asset_version_origin_review_chk` (`(origin = 'catalog_import') = (review_state = 'imported')`).
  - `GRANT` al rol de la app (`marketing_studio_app`) y al rol del worker, mismo patrón que `1790409193629_media-originals.sql`.
- `packages/database/src/schema.ts`: tipos de las tablas y columnas nuevas.
- `packages/domain/src/commands/kernel.ts`: `runCommand(deps, spec, input)` — (1) rechaza `anonymous_open` con `write_not_allowed`; (2) valida scope (`requireScope`) y organización (404 anti-oráculo); (3) consulta el puerto `WriteAuthority`/`ApprovalAuthority` (`commands/authority.ts`: permite `operator_cli` y `api_client` con scope; niega `user` con `forbidden` hasta TASK-1898; niega aprobaciones de `api_client` con `approval_requires_person`); (4) resuelve idempotencia (`commands/idempotency.ts`); (5) abre transacción (`inTransaction`), verifica revisión, ejecuta, inserta `audit_event` y guarda la respuesta terminal; (6) en `dryRun` ejecuta validaciones y devuelve el diff sin abrir escritura, y para operaciones `requiresPerson` o `destructive` invoca el punto de extensión `confirmation` (en esta task no agrega nada; TASK-1899 lo usa para `proposalDigest`). Ningún command se escribe fuera de este ejecutor.
- `packages/contracts/src/errors.ts`: códigos nuevos (Detailed Spec §«Errores»).
- `packages/domain/src/auth/api-client.ts`: `API_SCOPES` += `studio:assets:write`, `studio:write`; `pnpm api-client:create --scope` los acepta.
- `packages/contracts/src/operations.ts`: `method` admite `'POST' | 'PATCH' | 'PUT' | 'DELETE'`; `ToolSpec` pasa a unión: lectura (`writes: false`, como hoy) o escritura (`writes: true`, `class: 'write' | 'approve'`, `requiresPerson`, `destructive`, `idempotent: true`, `capability`, `capabilityAction` (`create` | `update` | `approve`), `apiScope` (`null` en `approve`)). Cada operación de escritura declara su **transporte**: `pathParams`, cabecera `Idempotency-Key` desde el argumento `idempotencyKey` (siempre obligatoria), cabecera `If-Match` desde `expectedRevision` (`required` | `optional` | `none`), `dryRun` en la query y el resto del input en el cuerpo JSON. `packages/contracts/src/tool-manifest.ts` exporta, por tool de escritura, `method`, `path`, `class`, `requiresPerson`, `destructive`, `idempotent`, `capability`, `capabilityAction`, `apiScope` y el bloque `transport` (requisito de TASK-1899 para construir la petición sin adivinar); el input schema de la tool incluye `idempotencyKey`, `expectedRevision` (si aplica) y `dryRun`. `openapi.ts` documenta cuerpos, cabeceras y códigos por operación. `pnpm mcp:manifest:check` y el leak test cubren los campos nuevos.
- `scripts/gates/domain-boundary-gate.mjs` + su test: sólo los módulos listados en «Write-target allowlist» escriben en `studio.*` (detección por `insertInto|updateTable|deleteFrom` sobre `studio.`); `apps/web` sigue sin poder importar `@studio/database/storage-write` (la web sólo firma).
- Tests: kernel (anónimo 403, scope 403, organización 404, idempotencia replay/reuse, revisión 412/428, un `audit_event` por escritura, `dryRun` sin filas nuevas).

#### Slice 2 — Solicitud de subida, confirmación y creación verificada en el worker

- `packages/domain/src/media/filename-convention.ts`: `inferPieceFromFilename(filename)` (pura) y `resolveInference(db, campaignId, inference, mime)` (resuelve contra el catálogo). Reglas en Detailed Spec §«Inferencia desde el nombre». Tests con los nombres reales listados en «Already exists», incluido el de taller con sufijo (debe dar `unmatched`).
- `packages/domain/src/media/ports.ts`: puerto `UploadSigner` (firma PUT V4 simple o inicio de sesión reanudable para un `objectName` que cumpla `SHA256_OF_OBJECT`) y, en `DerivativeStorage`, `deleteOriginalIfGeneration(objectName, generation)` y `listOriginals({ createdBefore })` para el barrido.
- `packages/database/src/storage.ts`: `signUploadUrlV4` (firma `content-type`, `x-goog-if-generation-match: 0` y `x-goog-meta-sha256`; modo reanudable con `x-goog-resumable: start`), reutilizando `iamBlobSigner`. `packages/database/src/storage-write.ts` (sólo worker): `deleteObjectIfGeneration` y `listObjects` del prefijo `originals/sha256/`.
- `packages/domain/src/media/upload.ts`:
  - `requestAssetVersionUpload(db, actor, body, deps)` — el paso que **propone**: valida tamaño (1..`MAX_ORIGINAL_BYTES`), tipo por extensión (`classifyOriginal` con cabecera vacía se evalúa sólo por extensión; la firma de bytes la verifica el worker), forma del sha256, derechos mínimos (Detailed Spec §«Derechos al subir») y, si la pieza existe, `If-Match` = `asset.revision`; resuelve la inferencia; aplica el tope de 20 subidas abiertas por actor; si el sha256 ya es una versión de esa pieza responde `duplicate` sin URL ni fila. Crea `studio.asset_upload` con **todo** lo que la versión necesitará (pieza o `newAsset`, derechos, nota, actor, revisión esperada, nombre original) en `awaiting_upload` (vence en 24 h); si el sha256 ya tiene `media_object` en el bucket del ambiente, la crea en `awaiting_confirmation` y no firma URL (`alreadyStored: true`); si no, firma la URL para `originalObjectName(sha256)` (30 min). `audit_event asset_upload.requested`. Devuelve `AssetUploadTicket`.
  - `completeAssetVersionFromUpload(tx, upload, verified)` — crea la versión (mismo código para el worker y para el camino de dedup): re-verifica `asset.revision` contra la esperada (si cambió ⇒ `rejected` con `revision_conflict`), numera `version_no = max + 1` con `SELECT … FOR UPDATE` sobre `studio.asset` (o crea la pieza `newAsset`), inserta `asset_version` (`origin = 'studio'`, `review_state = 'pending_review'`, `storage_provider = 'gcs'`, `media_object_sha256`, `created_by` = actor de la subida, `original_filename`, derechos), incrementa `asset.revision`, pasa la subida a `completed` con `asset_version_id` y escribe `audit_event asset_version.created` con el actor de la subida (la persona, nunca el worker).
  - `verifyUploadedOriginal(deps, objectName, bytes, generation)` (worker): para cada subida de ese sha256 en `pending_verification`, recalcula sha256 y tamaño sobre los bytes y clasifica la cabecera con `classifyOriginal(original_filename, head)`; comprueba la proporción probada (`MediaProbe`) contra `asset.aspect_ratio` (tolerancia 1 %). Si todo coincide: upsert de `media_object` (dimensiones, duración, páginas, `crc32c`, `generation`) y `completeAssetVersionFromUpload` en una transacción por subida. Si el sha256 o el tamaño no coinciden: borra el objeto con precondición de generación y marca todas sus subidas `rejected` (`sha256_mismatch` | `size_mismatch`); si el tipo o la proporción fallan: marca esa subida `rejected` (`type_rejected` | `aspect_ratio_mismatch`) y borra el objeto sólo si no queda otra subida ni `media_object` que lo use. `audit_event asset_upload.rejected` con el motivo.
  - `sweepUploads(deps, now)` (barrido horario): `awaiting_upload`/`awaiting_confirmation` vencidas ⇒ `expired`; `pending_verification` con objeto presente y más de 15 min sin resolver (evento perdido o en DLQ) ⇒ ejecuta `verifyUploadedOriginal`; objetos de `originals/sha256/` con más de 24 h, sin `media_object` y sin subida viva ⇒ borrado con precondición de generación (`orphans_deleted`).
- `packages/domain/src/commands/asset-version.ts` — `createAssetVersion` (la **confirmación**), vía kernel, con `uploadId` e `Idempotency-Key`:
  - `awaiting_upload` ⇒ pasa a `pending_verification` (`audit_event asset_upload.confirmed`) y responde `202` `{ status: 'pending_verification', uploadId }` con `Retry-After: 5`.
  - `pending_verification` ⇒ `202` igual (sin escribir de nuevo).
  - `awaiting_confirmation` (sha256 ya almacenado y, por lo tanto, ya recalculado cuando nació su `media_object`) ⇒ `completeAssetVersionFromUpload` en la misma transacción ⇒ `201`.
  - `completed` ⇒ `201` con la versión creada (replay). `rejected` ⇒ `422 upload_rejected` con `reason`. `expired` ⇒ `410 upload_expired`.
  - Los `202` no se guardan en `idempotency_record`; los `201`/`4xx` sí. `dryRun` devuelve lo que la subida creará, sin cambiar su estado.
- Worker (`apps/worker/src/handlers.ts`): `handleOriginalFinalized` gana un paso previo a los derivados, detrás de `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED`: si existen subidas de ese sha256 en `pending_verification` ⇒ `verifyUploadedOriginal` y luego los derivados de las versiones recién creadas **en la misma corrida**; si sólo existen en `awaiting_upload` (el cliente aún no confirmó) ⇒ `503 upload_awaiting_confirmation` para que Pub/Sub reintente (backoff 10–600 s); sin subidas ni `media_object` ⇒ el 503 `media_object_pending` actual. `handleReconcileDerivatives` suma `sweepUploads`. `apps/worker/src/config.ts` + `apps/worker/deploy.sh`: `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` (default `false`). Conteos en `worker_run`: `versions_created`, `uploads_rejected`, `uploads_expired`, `orphans_deleted`.
- Readers (`readers/overview.ts`, `readers/campaigns.ts`): «vigente» = mayor `version_no` con `review_state ∈ {imported, approved}`; el DTO de versión (`packages/contracts/src/dto.ts`) agrega `origin`, `reviewState`, `createdBy` (etiqueta, sin id de cliente), `createdAt`; el DTO de pieza agrega `pendingVersionNo` (`null` si no hay).
- Guarda de autoridad por pieza en el importador (`packages/domain/src/import/catalog.ts`): si la pieza tiene alguna versión `origin = 'studio'`, `pnpm import:catalog` no inserta, adopta ni renumera versiones de esa pieza y suma `skipped_studio_owned_asset` en `import_run`; `ingestOriginals` ignora versiones `origin = 'studio'`. Test de regresión: import tras una subida no toca la pieza.
- Infra (`scripts/ops/infra/media-originals.sh --env <env> [--wiring] [--apply]`, dry-run por defecto): CORS del bucket (`PUT`, `POST`, origen `https://studio.efeonce.org` en producción y los dominios de preview en staging; `content-type`, `x-goog-if-generation-match`, `x-goog-meta-sha256`, `x-goog-resumable` permitidas; `location` expuesta para la sesión reanudable); IAM con **condiciones por prefijo** (Detailed Spec §«IAM»). La notificación `OBJECT_FINALIZE` de `originals/` ya existe y no cambia.

#### Slice 3 — Puertas: API, CLI `pnpm studio:upload`, manifiesto, capability y rollout del Entregable A

- Rutas (`apps/web/src/app/api/v1/**`, vía `handle()`; `apps/web/src/server/uploads.ts` arma las dependencias; flag `STUDIO_UPLOADS_ENABLED` — si falta flag, bucket o firmante ⇒ `403 upload_disabled`, nunca a medias):
  - `POST /api/v1/campaigns/{campaignId}/uploads` → `requestAssetVersionUpload`.
  - `POST /api/v1/campaigns/{campaignId}/asset-versions` → `createAssetVersion`.
- Registro (`operations.ts`): ambas con tool de clase `write`, capability `marketing_studio.asset.write`, scope `studio:assets:write`, `requiresPerson: false` (Detailed Spec §«Operaciones y tools»); `pnpm mcp:manifest:generate`; `API_VERSION` 1.3.0.
- CLI `scripts/studio-upload.ts` (`pnpm studio:upload <archivo…> [--campaign CMP-###] [--asset <assetId>] [--new-asset] [--license <kind>] [--reference <texto>] [--from AAAA-MM-DD] [--until AAAA-MM-DD] [--territory XX] [--channel <canal>] [--note <texto>] [--dry-run] [--resume <uploadId>]`): corre como `operator_cli` (impersonando la SA de ingesta del ambiente, como `media:ingest`) e invoca los **mismos** primitives: calcula sha256 en stream, pide la subida, hace PUT (reanudable para video o > 32 MiB) con reintentos (un `412` del PUT significa que el objeto ya existe: se confirma igual y el worker lo verifica), confirma con `createAssetVersion` y repite la misma llamada con la misma `Idempotency-Key` mientras reciba `202` (tope 10 min; si vence, informa `pendiente de verificación` con el `uploadId` para retomarlo con `--resume <uploadId>`). Deduce todo lo posible del nombre y **pregunta sólo lo que falta** (TTY: pregunta interactiva; sin TTY: sale con código 2 y la lista exacta de lo que falta). `--dry-run` muestra inferencia, pieza destino, versión resultante y derechos sin subir. Salida: una línea por archivo (`creado v4 · pendiente de revisión`, `duplicado de v3`, `rechazado: sha256_mismatch`).
- Greenhouse: capability `marketing_studio.asset.write` en `src/config/entitlements-catalog.ts` (`module: 'marketing_studio'`, `actions: ['create', 'update']`, `defaultScope: 'tenant'`, convención de las capabilities `.write` del catálogo) + migración seed en `capabilities_registry` (`allowed_actions = ARRAY['create','update']`, `allowed_scopes = ARRAY['tenant']`, patrón de `20260926075619118_task-1893-marketing-studio-asset-download-capability.sql`) + grant en `src/lib/entitlements/runtime.ts` de ambas acciones a `efeonce_admin`, `efeonce_account`, `efeonce_operations` y `designer` (verificar contra `src/config/role-codes.ts`); `capability-grant-coverage.test.ts` verde. Release por el control plane.
- Gateway (`efeonce-mcp`, PR): `pnpm studio:manifest:sync`; las tools de escritura quedan fuera de la superficie federada por el guard `write_tool_without_scope_class` hasta `TASK-1899` (verificar en Discovery que el guard excluye y no rompe el arranque; si lo rompe, el sync espera a TASK-1899 y el gateway sigue con el manifiesto anterior, lo que el runbook debe decir).
- Docs: §7.2 de la arquitectura (puerta de ingreso), runbook (`MARKETING_STUDIO_RUNTIME_HANDOFF.md` §Subidas), manual `docs/manual-de-uso/marketing-studio/` («Subir un final a Studio»), filas nuevas en `FEATURE_FLAG_STATE_LEDGER.md`, ledger y contratos de la skill.

### Entregable B — Commands del catálogo (reordenados)

#### Slice 4 — Revisión de versiones y máquinas de los tres estados

- `packages/domain/src/state-machines/`: matriz legal por estado (`creative_state`, `media_authorization_state`, `launch_state`) y por `review_state`, tabla-driven y exportada para el manifiesto y el manual.
- `packages/domain/src/commands/asset-review.ts`: `approveAssetVersion` (clase `approve`, persona obligatoria) y `requestAssetVersionChanges` (clase `write`, nota obligatoria), ambos sobre `pending_review` con `If-Match` = `asset.revision`.
- `packages/domain/src/commands/state-transitions.ts`: `transitionCreativeState`, `transitionMediaAuthorization`, `transitionLaunchState` (nota obligatoria, `decision_refs` opcional). Los destinos aprobatorios (`creative_state → approved`, `media_authorization_state → authorized`) sólo por sus commands de aprobación con persona (`approveCreative`, `authorizeMedia`); las transiciones genéricas los rechazan con `422 approval_requires_dedicated_command`.
- Tests exhaustivos: toda transición legal pasa, toda ilegal da `409` sin escribir; ningún command toca dos estados; `api_client` no aprueba.

#### Slice 5 — Campaña, brief, concepto, pieza y derechos por API

- `createCampaign` (nace con `source_of_truth = 'studio'`), `updateCampaign` (campos descriptivos; nunca estados), `upsertCampaignBrief` + `approveCampaignBrief` (persona), `createConcept`, `updateConcept`, `createAsset`, `updateAsset`, `setAssetVersionRights` expuesto por API (reusa `rights.ts`).
- Migración `<ts>_catalog-write-commands.sql`: `studio.campaign_brief`, `campaign_brief_audience`, `campaign_brief_kpi` (Detailed Spec §«Brief como entidad»), `revision` + `updated_at` en toda tabla escribible que no los tenga [verificar tabla por tabla].
- Toda escritura del catálogo sobre una campaña en `source_of_truth = 'onedrive'` responde `409 campaign_not_studio_owned`, salvo `createCampaign`, la puerta de ingreso (autoridad por pieza) y la revisión de versiones.

#### Slice 6 — Copy, anuncios, plan de medios y calendario

- `createCopyVariant`, `updateCopyVariant` (literal, test byte a byte con `\n\n`, mención `@[urn:li:organization:…]`, comillas tipográficas y espacio final).
- `createAdConfiguration`, `updateAdConfiguration` (pieza, copy y audiencia de la misma campaña; la pieza debe tener versión vigente).
- `createMediaFlight`, `updateMediaFlight`, `setBudgetLine` (un `kind` por llamada; sólo `proposed`), `approveBudgetLine` (persona; crea la línea `approved` con referencia obligatoria), `removeBudgetLine` (sólo `proposed`, destructiva).
- `createScheduledPost`, `updateScheduledPost`, `cancelScheduledPost` (destructiva; nunca estado publicado).

#### Slice 7 — Exposición del Entregable B y lo que pide TASK-1895

- Rutas `POST`/`PATCH` para cada command de Slices 4–6, tools en el registro (tabla del Detailed Spec), `ETag` en lecturas de entidad, `dryRun=true`; CLI `scripts/studio-write.ts` (`pnpm studio:write <command> --file payload.json`) como `operator_cli`.
- Proyección de permisos en `getCampaign` (DTO `CampaignDetail.permissions`): `writable`, `lockReason ∈ {open_mode, missing_capability, authority_onedrive, null}`, `allowedTransitions` por estado para el actor, `canApprove`, `revision`. Se calcula en el dominio con el mismo puerto de autoridad que usan los commands.
- Campaña sandbox `CMP-900` en la base de staging (organización Efeonce, `source_of_truth = 'studio'`, datos sintéticos) creada por `createCampaign`, y un `api_client` de staging con `studio:write` + `studio:assets:write` para las pruebas de TASK-1895 (token directo a Secret Manager de staging, nunca impreso).
- Greenhouse: capability `marketing_studio.campaign.write` (`actions: ['create', 'update']`, `allowed_actions = ARRAY['create','update']`, scope `tenant`; catálogo + seed + grant de ambas acciones a `efeonce_admin`, `efeonce_operations`, `efeonce_account`, `designer`), release.
- `pnpm mcp:manifest:generate`, `API_VERSION` 1.4.0, gateway `studio:manifest:sync`.

### Entregable C — Corte de autoridad por campaña, señal y retiro de OneDrive

#### Slice 8 — Mecánica de corte por campaña

- Migración `<ts>_campaign-authority-cutover.sql`: `campaign.source_of_truth text NOT NULL DEFAULT 'onedrive' CHECK (source_of_truth IN ('onedrive','studio'))`, `cutover_on date`, `cutover_by text`, CHECK `(source_of_truth = 'studio') = (cutover_on IS NOT NULL)` salvo campañas nacidas en Studio (`createCampaign` fija `cutover_on` = fecha de creación).
- Guarda del importador a nivel campaña: `source_of_truth = 'studio'` ⇒ la campaña y todos sus hijos se saltan (`skipped_studio_owned_campaign` en `import_run`); `media:ingest` también la salta.
- Export inverso `scripts/export-catalog.ts` (`pnpm export:catalog --out <CATALOGO-DATOS.json> [--campaign CMP-###]`, primitive `packages/domain/src/export/catalog-export.ts`): produce el formato que consume el importador; test de ida y vuelta (import → export → import en dry-run sin diferencias).
- `scripts/cutover-campaign.ts` (`pnpm cutover:campaign --campaign CMP-### --on AAAA-MM-DD [--dry-run|--apply|--revert]`, command `cutoverCampaign`): precondiciones — último import de la campaña sin diff pendiente, export de ida y vuelta sin diferencias y **toda versión vigente con original en Studio** (`storage_provider = 'gcs'`); si falta alguno, `--apply` falla listando las piezas, salvo `--accept-missing-originals <assetId,…>` explícito que queda en el `audit_event`. Registra `cutover_on`/`cutover_by`. `--revert` devuelve a `onedrive` (sólo si no hubo escrituras de catálogo posteriores o tras exportarlas).

#### Slice 9 — Señal «pieza aprobada sin original en Studio»

- `packages/contracts/src/health.ts`: `HEALTH_FRESHNESS_NAMES` += `approved_without_original`; reader en `packages/domain/src/health/**`: cuenta piezas cuya versión vigente (`imported` o `approved`) sigue en `onedrive_provenance`, en campañas con `source_of_truth = 'studio'` o con `creative_state = 'approved'`; `state = degraded` si el conteo de campañas cortadas es > 0, `ok` si es 0; `count` = piezas afectadas (sin ids).
- Atención (`getAttention`): un ítem por campaña afectada («N piezas aprobadas sin original en Studio») con enlace a la campaña.
- Greenhouse: la señal `platform.marketing_studio.health` ya proyecta cualquier frescura `degraded` a `warning`; verificar con un test del reader que el nombre nuevo se acepta y aparece en la evidencia; cambiar `src/lib/reliability/queries/marketing-studio-health.ts` sólo si el test demuestra que hace falta.

#### Slice 10 — Corte de las campañas activas y retiro de OneDrive como fuente

- Backfill único de las 24 imágenes de CMP-002 sin sha256 por `pnpm studio:upload` (el sha256 lo calcula la CLI desde el archivo; la verificación, el worker), cada una revisada por persona.
- Corte campaña por campaña (`CMP-001…CMP-005`) con fecha declarada, en el orden del runbook, cada uno con `--dry-run` previo y aviso a quienes editan `CATALOGO-DATOS.json`.
- Cuando no queda ninguna campaña activa en `onedrive`: `import:catalog --apply` rechaza con mensaje claro (sólo `--dry-run` para auditoría histórica) y `pnpm media:ingest` se retira (el script sale con código 2 y apunta a `studio:upload`); `revertOriginalProvider` se conserva sólo como herramienta de rollback documentada.
- Docs: arquitectura (§7 y §7.2), runbook de corte, `EFEONCE_CAMPAIGN_REGISTRY_V1.md`, manual, documentación funcional, manual servido por MCP (`docs/mcp/skills/marketing-studio/SKILL.md`, sección de escritura), Handoff, changelog, EPIC-049 y la skill (contrato de mantenimiento).

## Out of Scope

- **Espejo o sincronización con Microsoft Graph / SharePoint / OneDrive:** explícitamente no planificado por el ADR; sólo el backfill único de Slice 10 con la CLI.
- **Federación MCP** de las tools de escritura y aprobación, scopes de clase del gateway, actor delegado y `proposalDigest`: `TASK-1899`.
- **UI de edición y subida** en `studio.efeonce.org`: `TASK-1895` (consume estos commands; esta task no escribe JSX).
- Login de personas y puerto de autoridad del actor `user`: `TASK-1898`.
- Siembra de `marketing_studio.campaign.approve`: la hace la task que cablee primero el puerto de autoridad de personas que la verifica (`TASK-1899`, que ya declara esa migración, o `TASK-1898`), con grant en el mismo PR como pide el ADR §5. Esta task sólo usa el puerto y `approval_requires_person`; `operator_cli` aprueba como persona en terminal.
- Escribir `budget_line.kind = 'actual'`, `launch_state = live_observed` o `paused`, o marcar posts publicados: sólo desde fuentes observadas.
- Publicar posts o lanzar anuncios en proveedores: Studio no publica.
- Borrado físico de cualquier entidad o versión (sólo archivado, cancelación o `changes_requested`, auditados). El único borrado es de **objetos** del bucket que nunca tuvieron fila: rechazados por la verificación o huérfanos de más de 24 h, siempre con precondición de generación.
- Salidas de Globe como puerta de ingreso (ADR §11.5) y fechas de corte de cada campaña (ADR §11.1): decisiones del operador; esta task entrega la mecánica, no las fechas.
- Derivados nuevos (forma de onda de audio, miniatura de PDF): follow-up de TASK-1893.
- Metadatos técnicos del original que el `MediaProbe` actual no extrae (espacio de color, códec): fuera.

## Detailed Spec

### Subida en dos pasos con verificación asíncrona (resuelve ADR §11.3 y §11.4)

```text
cliente                        Studio web (Vercel)                 GCS (bucket de originales)          worker de medios
   │ nombre, sha256, tamaño,  ─▶ requestAssetVersionUpload
   │ tipo, derechos, pieza       valida + infiere + If-Match
   │                             asset_upload = awaiting_upload
   │ ◀── URL firmada 30 min ─────┘ (o alreadyStored ⇒ awaiting_confirmation, sin URL)
   │ PUT bytes ──────────────────────────────────────────────▶ originals/sha256/<aa>/<sha256>
   │                                                           (ifGenerationMatch=0; 412 = ya existe)
   │ createAssetVersion ───────▶ awaiting_upload ⇒ pending_verification
   │ ◀── 202 + Retry-After ──────┘                              OBJECT_FINALIZE ─────────────────▶ handleOriginalFinalized
   │                                                                                               ├─ subida aún awaiting_upload ⇒ 503 (reintenta)
   │                                                                                               ├─ recalcula sha256, tamaño, firma, proporción
   │                                                                                               ├─ OK ⇒ media_object + asset_version(pending_review)
   │                                                                                               │       + audit_event (actor = persona) + derivados
   │                                                                                               └─ falla ⇒ borra el objeto (precondición de generación),
   │                                                                                                         asset_upload = rejected
   │ createAssetVersion (misma llave) ─▶ completed ⇒ 201 { versionNo } · rejected ⇒ 422 · expired ⇒ 410
```

- **Por qué un solo diseño, subida directa al nombre final y no una zona intermedia:** el ADR fija la URL firmada
  hacia `originals/sha256/<2 primeros hex>/<sha256>` con `ifGenerationMatch=0`. El riesgo de una zona intermedia
  (derivados sobre bytes no verificados) no existe aquí porque el `OBJECT_FINALIZE` de un objeto no verificado no
  produce nada: `handleOriginalFinalized` verifica **antes** de crear `media_object` y versión, y los derivados se
  generan por versión, que sólo existe tras la verificación. Una zona intermedia sumaría una copia en servidor, permisos
  de escritura para la web y un segundo evento, sin cambiar el invariante.
- **Dónde se recalcula el sha256:** en el worker (Cloud Run, 2 GiB, 900 s), que ya lee el original completo para los
  derivados; una función de Vercel nunca lee los bytes. **Invariante:** ninguna fila de `asset_version` ni de
  `media_object` existe con un sha256 no recalculado; lo pendiente vive en `asset_upload.state = 'pending_verification'`.
- **Por qué la versión la crea el worker y no la confirmación web:** los derivados se generan por versión
  (`renditions/<asset_version_id>/…`) y se disparan con el `OBJECT_FINALIZE`. Si la versión naciera después del
  evento, sus derivados esperarían al barrido horario. Por eso el worker espera la confirmación (503 reintentable,
  backoff 10–600 s, DLQ tras 5 intentos) y crea versión y derivados en una sola corrida. Si el evento se agota en la
  DLQ, el barrido horario retoma toda subida `pending_verification` con objeto presente.
- **Camino de dedup (`alreadyStored`):** el sha256 ya tiene `media_object` (recalculado cuando nació); la confirmación
  crea la versión en la web, sin leer bytes. Sus derivados los produce el barrido horario (≤ 1 h), porque no hay
  evento nuevo; el reader muestra «Generando miniaturas…» mientras tanto.
- **Objeto ocupado con bytes falsos:** si un cliente sube bytes que no corresponden al sha256 del nombre, el worker
  lo borra con precondición de generación (el bucket es versionado y conserva la versión no vigente 30 días) y el
  nombre queda libre; las subidas de ese sha256 quedan `rejected` y deben pedirse de nuevo.
- **Limpieza de subidas sin confirmar:** la subida vence a las 24 h (`expired`, barrido horario). El barrido borra,
  con precondición de generación, todo objeto de `originals/sha256/` con más de 24 h que no tenga `media_object` ni
  subida viva (`awaiting_upload`, `awaiting_confirmation`, `pending_verification`). No se usa una regla de lifecycle:
  el bucket no puede saber qué objetos tienen fila.
- **Subida reanudable:** para `video/*` o `byteSize > 32 MiB` la URL firmada inicia una sesión (`POST` con
  `x-goog-resumable: start`); el cliente sube por bloques de 8 MiB a la sesión devuelta y puede reanudarla mientras
  no venza. Los límites por tipo (ADR §11.2) quedan en 1 GiB para todos (`MAX_ORIGINAL_BYTES`) hasta que el operador
  fije otros.

### Tablas nuevas (Entregable A)

`studio.asset_upload`

| Columna | Tipo | Regla |
|---|---|---|
| `upload_id` | `uuid PK DEFAULT gen_random_uuid()` | — |
| `campaign_id` | `text NOT NULL FK campaign` | organización del actor |
| `asset_id` | `text NULL FK asset` | `NULL` si será pieza nueva |
| `new_asset` | `jsonb NULL` | `{ conceptId, title, kind, aspectRatio }`; `(asset_id IS NULL) = (new_asset IS NOT NULL)` |
| `expected_asset_revision` | `integer NULL` | `If-Match` recibido; `NULL` sólo con `new_asset` |
| `requested_by` | `text NOT NULL` | `actorLabel` de la persona o cliente |
| `original_filename` | `text NOT NULL CHECK (length BETWEEN 1 AND 255)` | nombre tal cual |
| `byte_size` | `bigint NOT NULL CHECK (byte_size BETWEEN 1 AND 1073741824)` | — |
| `mime_type` | `text NOT NULL` | mismo CHECK que `media_object.mime_type` |
| `sha256` | `text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$')` | declarado por el cliente |
| `rights` | `jsonb NOT NULL` | validado por `validateRightsInput`; se copia a las columnas `rights_*` de la versión |
| `note` | `text NULL CHECK (length <= 1000)` | nota de la versión |
| `state` | `text NOT NULL CHECK (state IN ('awaiting_upload','awaiting_confirmation','pending_verification','completed','rejected','expired'))` | — |
| `reject_code` | `text NULL CHECK (reject_code IN ('sha256_mismatch','size_mismatch','type_rejected','aspect_ratio_mismatch','revision_conflict'))` | `(state = 'rejected') = (reject_code IS NOT NULL)` |
| `asset_version_id` | `uuid NULL FK asset_version` | `(state = 'completed') = (asset_version_id IS NOT NULL)` |
| `expires_at`, `created_at`, `updated_at` | `timestamptz NOT NULL` | vence a las 24 h |

Índices: `(sha256) WHERE state IN ('awaiting_upload','awaiting_confirmation','pending_verification')` (lo usa el
worker) y `(requested_by) WHERE state IN (…mismos…)` (tope de 20 abiertas por actor).

`studio.idempotency_record`: `actor text`, `operation_id text`, `idempotency_key text CHECK (length BETWEEN 8 AND 128)`,
`request_sha256 text`, `response_status int`, `response_body jsonb`, `created_at`, `expires_at`; PK
`(actor, operation_id, idempotency_key)`. Barrido de expirados en el job horario del worker.

### Inferencia desde el nombre

- Patrón: `^(?<concept>CMP(?<cmp>\d{3,})-(?<seq>[A-Z]?\d{2})) - (?<title>.+?) - (?<ratio>\d+x\d+)\.(?<ext>[a-z0-9]+)$`
  (insensible a mayúsculas en la extensión). Ejemplo: `CMP002-06 - La IA es un gasto - 4x5.png` ⇒ campaña `CMP-002`,
  concepto `CMP002-06`, título «La IA es un gasto», proporción `4x5`, tipo por mime (`image` ⇒ `imagen`,
  `video` ⇒ `video`), pieza `CMP002-06-imagen-4x5`.
- Resolución contra el catálogo: (1) campaña visible para el actor; (2) concepto existente en esa campaña; (3) pieza
  existente ⇒ versión nueva (`asset_id`); pieza inexistente ⇒ `newAsset` propuesto, que exige confirmación explícita
  (`--new-asset` en la CLI, `newAsset` en el cuerpo).
- Resultado `inference.status ∈ {matched, new_asset, unmatched, conflict}`; `unmatched` (p. ej. sufijos de taller como
  `_pre-AXIS-2026-09-23`) o `conflict` (la campaña del nombre ≠ `campaignId` de la ruta) exigen `assetId` explícito:
  sin él ⇒ `422 filename_not_inferable` con los campos que faltan.
- Lo que nunca se infiere: derechos, nota de la versión, confirmación de pieza nueva.

### Derechos al subir

- Obligatorio: `rights.licenseKind ∈ LICENSE_KINDS` (`owned`, `client_supplied`, `stock`, `talent`, `music`,
  `ai_generated`, `mixed`).
- Obligatorio además `rights.reference` (≤ 500) para `client_supplied`, `stock`, `talent`, `music` y `mixed`.
- Opcionales: `usageStartsOn`, `usageEndsOn` (inclusive, fecha de Santiago, `ends ≥ starts`), `territories`,
  `channels`. Validación reutilizada de `rights.ts` (extraer `validateRightsInput`; `setAssetVersionRights` y
  `requestAssetVersionUpload` la comparten). Los derechos se declaran al pedir la subida: una confirmación nunca los
  cambia.
- Sin lo obligatorio ⇒ `422 rights_required` (`actionable: true`) con la lista de campos.

### Contratos (DTO en `packages/contracts/src/commands.ts`)

```ts
// POST /api/v1/campaigns/{campaignId}/uploads
// Cabeceras: Idempotency-Key (obligatoria); If-Match = asset.revision cuando el destino es una pieza existente.
type RequestAssetVersionUploadBody = {
  filename: string; byteSize: number; mimeType: OriginalMimeType; sha256: string
  assetId?: string                                                  // obligatorio si la inferencia no resuelve
  newAsset?: { conceptId: string; title: string; kind: 'image' | 'video'; aspectRatio: string } // confirmación explícita
  rights: { licenseKind: LicenseKind; reference?: string; usageStartsOn?: string; usageEndsOn?: string;
            territories?: string[]; channels?: string[] }
  note?: string; dryRun?: boolean
}
type AssetUploadTicket = {
  status: 'awaiting_upload' | 'awaiting_confirmation' | 'duplicate' | 'dry_run'
  uploadId: string | null                                           // null en duplicate y dry_run
  inference: { status: 'matched' | 'new_asset' | 'unmatched' | 'conflict'; campaignId: string; conceptId: string | null;
               assetId: string | null; title: string | null; aspectRatio: string | null; kind: 'image' | 'video' | null;
               nextVersionNo: number | null; missing: string[] }
  duplicateOf: { assetId: string; versionNo: number } | null
  upload: { mode: 'single' | 'resumable'; method: 'PUT' | 'POST'; url: string; headers: Record<string, string>;
            expiresAt: string } | null                              // null salvo en awaiting_upload
}

// POST /api/v1/campaigns/{campaignId}/asset-versions   (Idempotency-Key obligatoria)
type CreateAssetVersionBody = { uploadId: string; dryRun?: boolean }
type CreateAssetVersionResult =
  | { status: 'created'; assetId: string; versionNo: number; reviewState: 'pending_review'; revision: number } // 201
  | { status: 'pending_verification'; uploadId: string }                                                       // 202 + Retry-After
```

### Operaciones y tools

| operationId | Método y ruta | Tool | Clase | Capability (persona) / scope (`api_client`) | Persona |
|---|---|---|---|---|---|
| `requestAssetVersionUpload` | `POST /api/v1/campaigns/{campaignId}/uploads` | `studio.asset.upload.request` | write | `marketing_studio.asset.write` / `studio:assets:write` | no |
| `createAssetVersion` | `POST /api/v1/campaigns/{campaignId}/asset-versions` | `studio.asset.version.create` | write | `marketing_studio.asset.write` / `studio:assets:write` | no |
| `approveAssetVersion` | `POST /api/v1/assets/{assetId}/versions/{versionNo}/approve` | `studio.asset.version.approve` | approve | `marketing_studio.campaign.approve` / ninguno (un `api_client` nunca aprueba) | sí |
| `requestAssetVersionChanges` | `POST /api/v1/assets/{assetId}/versions/{versionNo}/request-changes` | `studio.asset.version.request_changes` | write | `marketing_studio.campaign.write` / `studio:write` | no |
| `setAssetVersionRights` | `PATCH /api/v1/assets/{assetId}/versions/{versionNo}/rights` | `studio.asset.version.rights.set` | write | `marketing_studio.asset.write` / `studio:assets:write` | no |
| `transitionCreativeState` · `transitionMediaAuthorization` · `transitionLaunchState` | `POST /api/v1/campaigns/{campaignId}/states/{creative\|media-authorization\|launch}` | `studio.campaign.{creative_state,media_authorization,launch_state}.transition` | write | `marketing_studio.campaign.write` / `studio:write` | no |
| `approveCreative` · `authorizeMedia` | `POST /api/v1/campaigns/{campaignId}/states/creative/approve` · `…/media-authorization/authorize` | `studio.campaign.creative.approve` · `studio.campaign.media.authorize` | approve | `marketing_studio.campaign.approve` / ninguno | sí |
| `createCampaign` · `updateCampaign` | `POST /api/v1/campaigns` · `PATCH /api/v1/campaigns/{campaignId}` | `studio.campaign.create` · `studio.campaign.update` | write | `marketing_studio.campaign.write` / `studio:write` | no |
| `upsertCampaignBrief` · `approveCampaignBrief` | `PATCH /api/v1/campaigns/{campaignId}/brief` · `POST …/brief/approve` | `studio.campaign.brief.upsert` · `studio.campaign.brief.approve` | write · approve | `.campaign.write` / `studio:write` · `.campaign.approve` / ninguno | no · sí |
| `createConcept` · `updateConcept` | `POST …/concepts` · `PATCH /api/v1/concepts/{conceptId}` | `studio.concept.create` · `.update` | write | `.campaign.write` / `studio:write` | no |
| `createAsset` · `updateAsset` | `POST …/assets` · `PATCH /api/v1/assets/{assetId}` | `studio.asset.create` · `.update` | write | `.campaign.write` / `studio:write` | no |
| `createCopyVariant` · `updateCopyVariant` | `POST …/copies` · `PATCH /api/v1/copies/{copyId}` | `studio.copy.create` · `.update` | write | `.campaign.write` / `studio:write` | no |
| `createAdConfiguration` · `updateAdConfiguration` | `POST …/ads` · `PATCH /api/v1/ads/{adId}` | `studio.ad.create` · `.update` | write | `.campaign.write` / `studio:write` | no |
| `createMediaFlight` · `updateMediaFlight` | `POST …/plan/flights` · `PATCH /api/v1/flights/{flightId}` | `studio.media_plan.flight.create` · `.update` | write | `.campaign.write` / `studio:write` | no |
| `setBudgetLine` · `approveBudgetLine` · `removeBudgetLine` | `PUT …/plan/budget-lines` · `POST …/budget-lines/{lineId}/approve` · `DELETE …/budget-lines/{lineId}` | `studio.media_plan.budget_line.set` · `.approve` · `.remove` | write · approve · write (destructiva) | `.campaign.write` / `studio:write` (approve: `.campaign.approve` / ninguno) | no · sí · no |
| `createScheduledPost` · `updateScheduledPost` · `cancelScheduledPost` | `POST …/posts` · `PATCH /api/v1/posts/{postId}` · `POST …/posts/{postId}/cancel` | `studio.calendar.post.create` · `.update` · `.cancel` | write (cancel destructiva) | `.campaign.write` / `studio:write` | no |

- **Acción de `can()` por tool (`capabilityAction` del manifiesto):** `create` para `requestAssetVersionUpload`,
  `createAssetVersion` y todo `create*`; `update` para `update*`, `upsert*`, `set*`, `transition*`,
  `requestAssetVersionChanges`, `removeBudgetLine` y `cancelScheduledPost`; `approve` para toda tool de clase `approve`
  (capability `marketing_studio.campaign.approve`, `allowed_actions = ['approve']`, sembrada por TASK-1899). Como
  `create` y `update` se conceden juntas a los mismos cuatro roles, un canje que verifique una sola acción por
  capability (tabla de contratos de TASK-1899) usa `update` sin cambiar la autoridad efectiva; si un día se separan,
  el canje debe pasar a leer `capabilityAction` de la tool.
- En esta task, la capability de la columna la verifica Greenhouse sólo cuando el actor es una persona por sesión o
  delegación (puerto de autoridad de TASK-1898/1899); `operator_cli` escribe y aprueba como persona en terminal; un
  `api_client` escribe con el scope indicado y nunca aprueba.
- Exclusiones con razón (operador por CLI, no tools): `cutover:campaign`, `export:catalog`, `api-client:*`,
  `import:catalog`. Rutas y nombres finales se confirman con `mcp-craft` en el Slice 1 (Entregable A) y en el Slice 7
  (Entregable B); cualquier cambio de nombre se refleja aquí antes de implementar.

### Errores (nuevos en `ERROR_CATALOG`, prosa es-CL)

| code | HTTP | actionable | Cuándo |
|---|---|---|---|
| `write_not_allowed` | 403 | false | actor anónimo del modo `open` |
| `upload_disabled` | 403 | false | flag, bucket o firmante ausentes |
| `approval_requires_person` | 403 | false | un `api_client` intenta aprobar |
| `precondition_required` | 428 | true | falta `If-Match` en una mutación |
| `revision_conflict` | 412 | true | `If-Match` desactualizado |
| `idempotency_key_reused` | 422 | false | misma llave, cuerpo distinto |
| `validation_failed` | 422 | true | cuerpo con forma válida y valores inválidos |
| `rights_required` | 422 | true | faltan derechos mínimos |
| `filename_not_inferable` | 422 | true | nombre sin patrón o en conflicto y sin `assetId` |
| `upload_rejected` | 422 | false | la verificación rechazó el archivo (`reason` = `reject_code` en el cuerpo) |
| `upload_expired` | 410 | true | la subida venció; pedir una nueva |
| `payload_too_large` | 413 | false | > 1 GiB |
| `unsupported_media_type` | 415 | false | tipo fuera de la allowlist o formato de trabajo por extensión |
| `too_many_open_uploads` | 429 | true | más de 20 subidas abiertas del actor |
| `invalid_state_transition` | 409 | false | transición fuera de la matriz |
| `approval_requires_dedicated_command` | 422 | false | destino aprobatorio por la transición genérica |
| `campaign_not_studio_owned` | 409 | false | escritura de catálogo en campaña aún en OneDrive |
| `budget_kind_violation` | 422 | false | mezcla o escritura de `kind` no permitida |

`202 pending_verification` no es error: es el estado de la confirmación mientras el worker recalcula, con
`Retry-After`. `duplicate` tampoco: es un `200` del paso de solicitud.

### IAM (condiciones por prefijo; aplicar con `scripts/ops/infra/media-originals.sh`, dry-run primero)

| Service account | Hoy (TASK-1893) | Agrega esta task |
|---|---|---|
| `marketing-studio-runtime@` / `-stg@` (Vercel) | `objectViewer` en originales + `signBlob` sobre sí misma | `storage.objects.create` con condición `resource.name.startsWith("projects/_/buckets/<bucket>/objects/originals/sha256/")` (la URL firmada hereda el permiso del firmante); sin `delete` ni `update` |
| `marketing-studio-worker@` / `-worker-stg@` | `objectViewer` en originales, `objectCreator` + `objectViewer` en media | rol personalizado con sólo `storage.objects.delete` (+ `storage.objects.list` si `objectViewer` no lo cubre), condicionado al mismo prefijo; se usa siempre con `ifGenerationMatch` |
| `marketing-studio-ingest@` / `-ingest-stg@` (CLI) | `objectCreator` + `objectViewer` en originales | nada (la CLI sube por URL firmada como las demás puertas; `media:ingest` se retira en el Slice 10) |

Ninguna SA gana `storage.objectAdmin`, `storage.admin` ni permisos a nivel de proyecto. Verificar en Discovery si el
proyecto ya tiene roles personalizados y si `roles/storage.objectViewer` incluye `list` (sí lo incluye hoy).

### Brief como entidad

`studio.campaign_brief` (1:1 con campaña, `revision`, `approved_by`, `approved_at`, `approval_ref`): objetivo,
problema, insight, mensaje central, presupuesto envolvente (monto + moneda, **propuesto**, nunca sumado al plan),
ventana (inicio, fin), canales (`text[]`), mandatorios (`text[]`), aprobadores (`text[]`, etiquetas de persona).
`studio.campaign_brief_audience` (n por brief: nombre, descripción, referencia a `studio.audience` opcional) y
`studio.campaign_brief_kpi` (n por brief: métrica, meta, unidad, fuente esperada). El texto del brief es literal
(misma regla que el copy). Editar un brief aprobado lo devuelve a borrador en la misma transacción (auditado).

### Matrices de transición (confirmar contra los CDRs de `docs/campaigns/` en el Slice 4)

| Estado | Transiciones legales |
|---|---|
| `review_state` (versión) | `pending_review → approved` (persona), `pending_review → changes_requested` (nota obligatoria) |
| `creative_state` | `unknown → in_production`, `in_production → final_available`, `final_available → approved` (persona, command propio), `final_available → in_production`, `approved → in_production` (reapertura, nota obligatoria) |
| `media_authorization_state` | `unknown → pending`, `unknown → not_applicable`, `pending → authorized` (persona, command propio), `pending → blocked`, `blocked → pending`, `authorized → blocked` (nota obligatoria) |
| `launch_state` | `not_launched → launch_unverified`, `launch_unverified → not_launched`, `launch_unverified → ended`, `paused → ended`; `live_observed` y `paused` sólo desde observación |

Ningún estado depende del valor de otro: `approved` creativo no implica autorización ni lanzamiento.

### Forma común de un command

```ts
type CommandInput<T> = {
  actor: Actor
  idempotencyKey: string
  expectedRevision?: number // obligatorio en mutaciones de entidad existente
  correlationId: string
  dryRun?: boolean
  payload: T
}

type CommandResult<R> = { entity: R; revision: number; auditEventId: string | null; replayed: boolean }
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 (Entregable A completo en producción) → Slice 4 → (Slice 5 ∥ Slice 6) → Slice 7 → Slice 8 → Slice 9 → Slice 10.
- La guarda del importador por pieza (Slice 2) se despliega **en el mismo deploy** que `createAssetVersion`, nunca después: una versión nacida en Studio sin guarda puede chocar con `UNIQUE (asset_id, version_no)` o ser adoptada por el siguiente import.
- La IAM y el CORS (Slice 2) se aplican en staging, se prueban con `studio:upload` real y sólo entonces en producción; `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` se prende **antes** que `STUDIO_UPLOADS_ENABLED` (si la web acepta subidas con el worker apagado, las subidas quedan `pending_verification` hasta vencer y sus objetos terminan borrados por el barrido).
- La capability `marketing_studio.asset.write` (Greenhouse) se libera antes de dar `studio:assets:write` a cualquier `api_client` distinto del de pruebas.
- La exposición HTTP de los commands del Entregable B (Slice 7) no se despliega sin Slices 4–6 con tests verdes.
- La guarda del importador por campaña y el export inverso (Slice 8) se despliegan antes del primer `cutover:campaign --apply`.
- El retiro de `media:ingest` y del `apply` del catálogo (Slice 10) ocurre sólo con todas las campañas activas en `studio` y la señal `approved_without_original` en `ok`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Objeto con bytes falsos ocupa un nombre por contenido | storage | medium | el worker recalcula sha256 antes de crear filas y borra el objeto con precondición de generación; el nombre queda libre | `asset_upload.rejected` con `sha256_mismatch`; objeto en `originals/` sin `media_object` > 24 h |
| Una versión nace con sha256 no recalculado | data | low | la web nunca crea versión salvo en dedup sobre un `media_object` ya verificado; test que confirma sin evento y verifica cero filas nuevas | `asset_version` `origin = 'studio'` sin `worker_run` ni dedup que la explique |
| El worker espera una confirmación que no llega | worker | medium | 503 reintentable, luego DLQ; la subida vence a las 24 h y el barrido borra el objeto | mensajes en la DLQ del topic de originales; `uploads_expired` > 0 sostenido |
| Una SA escribe o borra fuera de su prefijo | IAM | low | condiciones por prefijo; runtime sin `delete`; worker con rol de sólo borrado; prueba negativa en staging (crear en `renditions/` y borrar en `renditions/` fallan) | registros de auditoría de GCS con escrituras de la SA fuera de `originals/sha256/` |
| Subidas abandonadas acumulan costo | storage | medium | expiración de la subida a 24 h + barrido horario de huérfanos + tope de 20 abiertas por actor | `orphans_deleted` en `worker_run`; objetos sin `media_object` > 24 h |
| Derivados no aparecen tras la versión | worker | low | camino existente (`OBJECT_FINALIZE` + 503 reintentable) + barrido horario | versión `gcs` sin rendition > 1 h en `pending_renditions` |
| Reimport pisa o renumera versiones nacidas en Studio | data | medium | guarda por pieza en el mismo deploy + test de regresión | `import_run` sin `skipped_studio_owned_asset` para una pieza con versión `studio` |
| Versión aprobada por una máquina | identity | low | clase `approve` + `approval_requires_person` en el kernel + test | `audit_event asset_version.approved` con actor `api_client:*` (debe ser cero) |
| Escritura anónima por el modo `open` | identity | low | kernel bloquea `anonymous_open` antes de la transacción + test HTTP sin bearer | `audit_event` con actor `anonymous_open` (debe ser cero) |
| Pérdida de actualización concurrente | data | medium | `If-Match` obligatorio + `UPDATE … WHERE revision` + `FOR UPDATE` en numeración | tasa de `412 revision_conflict` en logs |
| Reintentos duplican entidades o versiones | data | medium | `Idempotency-Key` obligatoria + dedup por sha256 | dos versiones con el mismo sha256 en una pieza (debe ser cero; test) |
| Presupuestos sumados entre `kind` | data | low | helper único + test | total mostrado ≠ líneas por `kind` |
| Copy alterado al guardar | content | low | test byte a byte | diferencia entre enviado y leído |
| Corte sin originales deja finales fuera de Studio | data | medium | precondición de `cutover:campaign` + señal `approved_without_original` | frescura `approved_without_original` `degraded` |
| Export inverso incompleto impide el rollback | data | medium | prueba de ida y vuelta obligatoria antes de cada corte | dry-run de reimport con diff |
| Un agente escribe sin confirmación humana | MCP | low | tools de escritura fuera de la superficie federada hasta TASK-1899; `dryRun` disponible | tool `write` visible en el gateway antes de TASK-1899 |
| Manifiesto nuevo rompe el gateway | MCP | low | `studio:manifest:sync` en PR con tests; verificar comportamiento del guard | gateway sin arrancar tras el sync |
| Capability sin grant | entitlements | low | `capability-grant-coverage.test.ts` | CI rojo |

### Feature flags / cutover

- `STUDIO_UPLOADS_ENABLED` (Vercel de Studio; default `false`): apaga `requestAssetVersionUpload` y `createAssetVersion` con `403 upload_disabled`. Fila espejo en `FEATURE_FLAG_STATE_LEDGER.md`.
- `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` (Cloud Run de Studio; SoT `apps/worker/deploy.sh`; default `false`): apagado, `handleOriginalFinalized` omite el paso de verificación y se comporta como hoy (los derivados de la ingesta siguen funcionando); un objeto subido por la puerta queda sin fila, su subida en `pending_verification` hasta vencer, y el barrido lo borra. Por eso se prende antes que la web y se apaga después. Cambiar sólo en `deploy.sh` + commit + redeploy (nunca `--update-env-vars` suelto). Fila espejo en el ledger.
- Los commands del Entregable B se controlan por el scope `studio:write` (ningún `api_client` lo tiene al desplegar) y por el puerto de autoridad; no llevan flag propio.
- El corte de autoridad es por campaña en base (`source_of_truth`, `cutover_on`), cambiado sólo por `cutover:campaign` con dry-run previo y reversible con `--revert`.
- El retiro de OneDrive como fuente es un cambio de código (rechazo de `apply` y de `media:ingest`), reversible con revert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | migración down (tablas y columnas nuevas, sólo sin filas de origen `studio`) + revert | minutos | sí |
| Slice 2 | `STUDIO_UPLOADS_ENABLED=false` primero, luego `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED=false` + revert; IAM y CORS con el script en modo inverso | < 15 min | sí; las versiones creadas quedan auditadas (se corrigen con `changes_requested` o una versión nueva) |
| Slice 3 | flag web `false` + redeploy; revocar `studio:assets:write`; revert de la capability (sin uso) | < 10 min | sí |
| Slice 4–6 | revert (sin exposición HTTP todavía) | minutos | sí |
| Slice 7 | revocar `studio:write` de todo `api_client` + revert del deploy | < 5 min | sí |
| Slice 8 | `cutover:campaign --revert` tras llevar el export inverso a OneDrive | < 30 min por campaña | sí mientras el export valide |
| Slice 9 | revert del reader de frescura | minutos | sí |
| Slice 10 | revert del importador y de `media:ingest`; recorte de campañas con `--revert` | < 30 min | sí |

### Production verification sequence

1. Migración de Slice 1 en staging: tablas, columnas y CHECK presentes; bloque `DO` verde; filas existentes `catalog_import`/`imported`; `UPDATE` sobre `audit_event` sigue fallando. Luego producción.
2. Infra de Slice 2 en staging (dry-run → apply): CORS e IAM; pruebas negativas (la SA del runtime no puede crear en `renditions/` ni borrar; la del worker no puede borrar fuera de `originals/sha256/`).
3. Worker de staging con `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED=true`; preview de Studio (base de staging) con `STUDIO_UPLOADS_ENABLED=true`.
4. `pnpm studio:upload` contra staging con `CMP002-06 - La IA es un gasto - 4x5.png`: inferencia `matched`, confirmación `202`, `worker_run original_finalized succeeded` con `versions_created = 1`, versión `pending_review` con derivados de la misma corrida, `audit_event asset_version.created` con actor `operator_cli:<persona>`. Repetición ⇒ `duplicado`. Bytes distintos del sha256 declarado ⇒ `rejected sha256_mismatch` y el objeto borrado. Sin derechos ⇒ `rights_required`. Subida sin confirmar ⇒ `expired` a las 24 h y objeto borrado por el barrido (en staging, con el vencimiento acortado por variable de prueba). Import en dry-run ⇒ `skipped_studio_owned_asset`.
5. `curl` contra preview: sin bearer 403 `write_not_allowed`; bearer sin `studio:assets:write` 403; organización ajena 404; misma `Idempotency-Key` con otro cuerpo 422.
6. Release de Greenhouse con `marketing_studio.asset.write`.
7. Producción: infra, worker, web (en ese orden) y la misma secuencia 4–5 con una pieza real elegida por el operador; revisión humana de la versión por CLI cuando exista el Slice 4.
8. Entregable B en staging con la campaña sandbox `CMP-900`, luego producción; gateway `studio:manifest:sync`.
9. Entregable C: guarda por campaña + export de ida y vuelta en producción; corte de la primera campaña real (`--dry-run`, luego `--apply`); editar un copy por CLI; reimport en dry-run la salta; export la refleja; señal `approved_without_original` en `ok`.
10. Resto de campañas, backfill de CMP-002, retiro de `media:ingest` y del `apply` del catálogo.

### Out-of-band coordination required

- Operador: elegir la primera pieza real para el smoke de producción y revisarla; aprobar el orden y las fechas de corte de `CMP-001…CMP-005`.
- Avisar a quienes editan `CATALOGO-DATOS.json` y las carpetas `03. Finales` antes de cada corte: desde la fecha declarada, los finales de esa campaña entran sólo por Studio.
- Secretos: tokens de `api_client` de pruebas directo a Secret Manager (scalar crudo, nunca impreso).
- Release de Greenhouse por el control plane (capabilities y manual servido); PR del gateway con `studio:manifest:sync` y dispatch manual de `deploy.yml` sólo si el guard lo exige.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

Entregable A — puerta de ingreso:

- [ ] `pnpm studio:upload` sobre un final real en producción crea exactamente una versión `origin = 'studio'`, `review_state = 'pending_review'`, `storage_provider = 'gcs'`, con `created_by` = la persona, `original_filename`, derechos y un `audit_event asset_version.created`; la versión y sus derivados nacen en la misma corrida del worker (`versions_created = 1`).
- [ ] Repetir la misma subida sobre la misma pieza responde duplicado y no crea versión ni objeto.
- [ ] Confirmar una subida sin que el worker la haya verificado responde `202 pending_verification` y no crea ninguna fila en `asset_version` ni en `media_object` (test de dominio + consulta en staging): no existe versión con sha256 no recalculado.
- [ ] Unos bytes cuyo sha256 no coincide con el declarado terminan en `rejected sha256_mismatch`, el objeto queda borrado (precondición de generación) y ninguna fila nueva existe.
- [ ] Un formato de trabajo (`.psd`, o un PSD renombrado a `.png`) se rechaza (`415` al pedir o `type_rejected` al verificar).
- [ ] Sin `rights.licenseKind` (o sin `reference` cuando es obligatoria), `requestAssetVersionUpload` responde `422 rights_required`, no crea la subida y no firma URL.
- [ ] La inferencia resuelve los nombres reales de OneDrive listados en «Already exists» y devuelve `unmatched` para el archivo de taller con sufijo; `unmatched` sin `assetId` responde `422 filename_not_inferable`.
- [ ] Una proporción probada distinta de la de la pieza deja la subida `rejected aspect_ratio_mismatch` y la confirmación responde `422 upload_rejected`.
- [ ] Una subida sin confirmar vence a las 24 h (`expired`) y el barrido horario borra su objeto si no tiene `media_object` (conteo `orphans_deleted`).
- [ ] Sin bearer 403 `write_not_allowed`; bearer sin `studio:assets:write` 403; organización ajena 404; misma `Idempotency-Key` con otro cuerpo 422; `If-Match` viejo 412; sin `If-Match` sobre pieza existente 428.
- [ ] Una versión `pending_review` nunca aparece como vigente en los readers; las filas importadas siguen siendo vigentes como antes.
- [ ] Tras una subida, `pnpm import:catalog` (dry-run y apply) no inserta, adopta ni renumera versiones de esa pieza y reporta `skipped_studio_owned_asset`.
- [ ] La SA del runtime web no puede crear objetos fuera de `originals/sha256/` ni borrar objetos; la SA del worker no puede borrar fuera de `originals/sha256/` (pruebas negativas registradas).
- [ ] `marketing_studio.asset.write` existe en catálogo TS y `capabilities_registry` con `allowed_actions = ['create','update']`, scope `tenant` y grant de ambas acciones a `efeonce_admin`, `efeonce_account`, `efeonce_operations` y `designer` (coverage test verde).
- [ ] Las dos operaciones figuran en el manifiesto como tools de clase `write` con su scope y capability; guard de paridad y leak test verdes; gateway sincronizado sin federarlas.
- [ ] El manifiesto generado exporta, por cada tool de escritura, `method`, `path`, `class`, `requiresPerson`, `destructive`, `idempotent`, `capability`, `capabilityAction`, `apiScope` y `transport` (`pathParams`, `Idempotency-Key` desde `idempotencyKey`, `If-Match` desde `expectedRevision` con su obligatoriedad, `dryRun` en query, resto en cuerpo); un test falla si una tool de escritura no lo declara.
- [ ] La respuesta de `requestAssetVersionUpload` expone `inference` con lo deducido del nombre y `missing` con lo que falta preguntar.
- [ ] `STUDIO_UPLOADS_ENABLED` y `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` tienen fila en `FEATURE_FLAG_STATE_LEDGER.md` con su estado real por runtime.

Entregable B — commands del catálogo:

- [ ] Existe un command en `packages/domain/src/commands` por cada operación de la tabla del Detailed Spec, y el `domain-boundary-gate` falla si otro módulo escribe en `studio.*`.
- [ ] `approveAssetVersion`, `approveCreative`, `authorizeMedia`, `approveCampaignBrief` y `approveBudgetLine` rechazan a un `api_client` con `403 approval_requires_person`; las transiciones genéricas rechazan destinos aprobatorios.
- [ ] Toda transición legal pasa y toda ilegal devuelve `409 invalid_state_transition` sin escribir; un test verifica que ningún command modifica dos estados.
- [ ] `setBudgetLine` escribe sólo `proposed`; ningún reader ni export suma `kind` distintos (test).
- [ ] Un copy guardado y leído es idéntico byte a byte al enviado; ningún command deja un post publicado; `PATCH` omitido ≠ `null`.
- [ ] `getCampaign` devuelve `permissions` (`writable`, `lockReason`, `allowedTransitions`, `canApprove`, `revision`) calculados con el mismo puerto de autoridad que los commands.
- [ ] La campaña sandbox `CMP-900` y el `api_client` de pruebas existen en staging.
- [ ] `marketing_studio.campaign.write` existe con `allowed_actions = ['create','update']`, scope `tenant` y grant de ambas acciones a `efeonce_admin`, `efeonce_operations`, `efeonce_account` y `designer` (coverage test verde).
- [ ] El `dryRun` de toda operación `requiresPerson` o `destructive` pasa por el punto de extensión `confirmation` del kernel (probado con un doble en test), listo para el `proposalDigest` de TASK-1899.
- [ ] Cada escritura exitosa deja exactamente un `audit_event` con actor, operación, entidad y `correlation_id`.

Entregable C — corte, señal y retiro:

- [ ] El importador y `media:ingest` saltan toda campaña con `source_of_truth = 'studio'` y lo registran en `import_run`.
- [ ] Import → export → import en dry-run no produce diferencias para las campañas reales.
- [ ] `cutover:campaign` tiene `--dry-run`, `--apply` y `--revert`, exige fecha declarada y falla si alguna versión vigente no tiene original en Studio (salvo `--accept-missing-originals` auditado).
- [ ] `/api/v1/health?deep=1` incluye `approved_without_original` y `platform.marketing_studio.health` lo muestra en su evidencia; Atención lista las campañas afectadas.
- [ ] Las 24 imágenes de CMP-002 están en Studio con original, o figuran en el reporte con su causa.
- [ ] Todas las campañas activas quedan en `source_of_truth = 'studio'`; `import:catalog --apply` y `pnpm media:ingest` quedan retirados con mensaje que apunta a `studio:upload`.
- [ ] Arquitectura de Studio, runbooks, registro de campañas, manual, documentación funcional, manual servido por MCP, Handoff, changelog, EPIC-049 y la skill `efeonce-marketing-studio` (con espejo `.codex/`) actualizados.

## Verification

- `pnpm check` en Studio (gates, lint, `mcp:manifest:check`, typecheck, tests de kernel, subida, inferencia, verificación, commands, matrices, guardas y paridad)
- `pnpm local:check` y `pnpm test src/lib/entitlements` en Greenhouse; `pnpm test src/lib/reliability/queries/marketing-studio-health.test.ts`
- `pnpm studio:upload` y `curl` contra preview/staging y producción según la Production verification sequence
- Consultas de solo lectura sobre `studio.asset_upload`, `studio.asset_version`, `studio.audit_event`, `studio.worker_run` e `studio.import_run` tras cada smoke
- `pnpm task:lint --task TASK-1894`, `pnpm docs:closure-check` y `pnpm skills:mirrors` al cerrar

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] EPIC-049 actualizado con la puerta de ingreso, el corte de autoridad y el estado de OneDrive
- [ ] `TASK-1899` recibe un `## Delta` con las tools de clase `write`/`approve` disponibles y el puerto de autoridad que debe implementar
- [ ] `TASK-1895` recibe un `## Delta` con las operaciones, DTOs y códigos reales del OpenAPI desplegado
- [ ] Skill `efeonce-marketing-studio` actualizada según su contrato de mantenimiento (ledger, mapa, contratos, operación, lecciones) y espejada

## Follow-ups

- Federación MCP de escritura y aprobaciones (`TASK-1899`).
- Ingesta de observaciones (`actual`, `live_observed`, `paused`, publicado) desde Meta y Metricool.
- Derivados de audio y PDF (heredado de TASK-1893).
- Purga periódica de `studio.idempotency_record` y `studio.asset_upload` terminales si el volumen lo pide.
- Si las salidas de Globe entran por esta misma puerta o por una integración propia (ADR §11.5): decisión del operador, fuera de esta task.

## Open Questions

- ~~¿El brief se modela como tabla?~~ Resuelto 2026-09-25: sí (Detailed Spec §«Brief como entidad»).
- ~~¿Dónde vive el upload firmado?~~ Resuelto 2026-09-25/26: en esta task, en dos pasos sobre el almacén de TASK-1893.
- ~~Roles con escritura~~ Resuelto 2026-09-25: `efeonce_admin`, `efeonce_operations`, `efeonce_account` y `designer` (también para `marketing_studio.asset.write`).
- ~~Nombre de la capability de ingreso~~ Resuelto por el ADR 2026-09-26: `marketing_studio.asset.write`; scope de bearer `studio:assets:write` fijado por esta task.
- ~~Dónde se recalcula el sha256 de archivos grandes (ADR §11.3)~~ Resuelto en esta task: en el worker, con confirmación asíncrona (`202 pending_verification`); ninguna versión existe sin sha256 recalculado (Detailed Spec §«Subida en dos pasos»).
- ~~Limpieza de subidas sin confirmar (ADR §11.4)~~ Resuelto en esta task: vencimiento a 24 h + barrido horario del worker que borra huérfanos con precondición de generación; sin regla de lifecycle.
- ~~Nombre del estado «pendiente de revisión»~~ Resuelto en esta task: `pending_review` (luego `approved` | `changes_requested`; `imported` para lo que vino del catálogo).
- Límites de tamaño por tipo y umbral de subida reanudable (ADR §11.2): esta task usa 1 GiB para todo y reanudable para video o > 32 MiB; el operador puede fijar otros antes del Slice 2.
- Matrices de transición: confirmar con el operador y los CDRs las reaperturas permitidas (`approved → in_production`, `authorized → blocked`).
- ¿`request_changes` sobre una versión exige persona? Esta task asume que no (es clase `write`); confirmar con el operador en el Slice 4.
- ¿El export inverso debe incluir las versiones de origen `studio` (ruta de trabajo inexistente en OneDrive) o sólo su referencia? Decidir en el Slice 8 con la prueba de ida y vuelta.
- ¿La señal `approved_without_original` debe contar también campañas en `onedrive` con creatividad `approved` (hoy CMP-002 la pondría en `degraded` antes de su corte)? Esta task las cuenta en Atención pero sólo las cortadas cambian el estado; confirmar con el operador.
