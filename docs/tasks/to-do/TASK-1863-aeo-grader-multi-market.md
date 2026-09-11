# TASK-1863 — AEO Grader multi-mercado: una marca, N mercados, selección múltiple y matriz comparativa

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-11 — la puerta pública conserva un mercado por defecto, declarado

- **Formulario público sin cambios obligatorios.** Verificado contra el contrato publicado en producción
  (`GET /api/public/growth/forms/b120566a-dd1a-43c8-956a-4e0121e805b8`, 2026-09-10): `country` es un `select`
  con Chile, Colombia, México y Perú, y `mainCompetitor` es un único campo de texto. La puerta pública sigue
  siendo de un mercado (el país elegido) y un competidor; esta task sólo muda el mapeo
  (`AEO_MARKET_BY_COUNTRY`, `public-intake/aeo-form-grader-adapter.ts:46-56`) al catálogo, con resultado idéntico
  para esas cuatro opciones. Sin versión nueva del formulario, sin WordPress, sin HubSpot.
- **Corrección de una contradicción de esta spec.** El invariante "ningún país desconocido cae a otro" aplica a
  providers (ubicación) y a perfiles/mercados configurados. En la puerta pública, `resolveAeoMarketLocale` cae a
  Chile si el país llega vacío o desconocido (sólo posible manipulando el envío, porque el selector es cerrado).
  Ese default **se conserva, pero declarado**: el run registra el origen del mercado (`marketSource`:
  `form_selected` | `form_default` | `profile` | `operator`) en `matching_snapshot`, y la señal
  `growth.ai_visibility.market_unresolved` cuenta los `form_default`. Criterio de aceptación adicional: un envío
  público con país vacío produce un run CL con `marketSource = 'form_default'` visible (test).
- **Opcional, después del Slice 6:** sumar Argentina, Brasil, Uruguay, España o Estados Unidos al selector es una
  versión nueva del formulario por el ciclo de vida de Growth Forms (`/aeo-2/` renderiza `<greenhouse-form>`
  desde el contrato). Antes de que existan los prompts `pt-BR`, un lead brasileño se mediría en español.
- **Fuera de alcance:** selección de varios mercados en el formulario público (puerta gratuita, modo `light`,
  presupuesto global diario de USD 25). La selección múltiple es para operador y clientes contratados.

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
- Backend impact: `migration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El AI Visibility / AEO Grader mide **un solo mercado por organización**: el run toma el perfil activo más
reciente, interpola el mercado crudo en los prompts ("en CL"), sólo tiene prompts en `es-CL` y el provider de
Google AI cae a Estados Unidos para cualquier país fuera de cinco. Esta task separa **marca** de **mercado**:
una marca con N mercados (país + idioma + competidores + cadencia), runs siempre de un mercado, **lotes que
seleccionan varios mercados a la vez**, catálogo único de mercados de Growth, prompts localizados (incluido
`pt-BR`), ubicación nativa en los motores que la soportan, alias de marca y competidores, y una **matriz
comparativa entre mercados** que nunca promedia países en un número inventado. Sky Airline (Chile, Perú,
Argentina, Brasil, Uruguay, Colombia) es el primer tenant.

## Why This Task Exists

Discovery 2026-09-10 sobre código y PostgreSQL real:

1. **Una organización = un mercado.** `getGraderProfileForOrganization` hace `ORDER BY created_at DESC LIMIT 1`
   (`src/lib/growth/ai-visibility/store.ts:258-269`). No existe forma de medir "Sky Chile" y "Sky Brasil" a la
   vez; un segundo perfil de la misma organización simplemente reemplaza al primero en silencio.
2. **El mercado entra crudo al prompt.** `resolvePromptInputs` interpola `market: vars.market` sin etiqueta
   (`src/lib/growth/ai-visibility/prompt-pack.ts:41-47`). Evidencia en base: el run `EO-GRUN-00030` de Sky
   preguntó *"¿Qué agencias de Aerolineas de pasajeros ayudan a empresas en CL?"*.
3. **Sólo hay prompts en `es-CL`.** `prompt-pack-v1.ts:36` y `archetypes/baseline-packs.ts:117` declaran
   `locale: 'es-CL'`; no hay pack `pt-BR` ni `en`. Brasil se mediría en español.
4. **Cuatro mapas de mercado desconectados**, ninguno completo:
   - `MARKET_BY_COUNTRY` (`provision-profile.ts:8-12`): MX, CL, US; el resto cae a `{market: <código>, locale: 'es'}`.
   - `GOOGLE_AI_MODE_MARKET_LOCATION_CODES` (`providers/google-ai-overview-adapter.ts:292-300`): CL, MX, CO, PE, US;
     **cualquier otro país cae a `location_code` de Estados Unidos**.
   - `AEO_MARKET_BY_COUNTRY` / `resolveAeoMarketLocale` (`public-intake/aeo-form-grader-adapter.ts:60-73`).
   - `PROSPECT_MARKETS` (`src/lib/growth/seo/prospect/contracts.ts:40-56`): CL, MX, CO, PE, AR, ES, US.
   Brasil (`2076`) y Uruguay (`2858`) no están en ninguno.
5. **El mercado persistido está sucio.** `grader_profiles.market` (medido 2026-09-10): `CL` ×12, `Chile` ×6,
   `US` ×1, `United States` ×1, `MX` ×1; `locale` mezcla `es-CL`, `en-US` y `en`.
6. **Sólo Google AI recibe el país.** Los adapters de OpenAI, Anthropic, Perplexity y Gemini no referencian
   mercado, locale ni ubicación (`providers/*-adapter.ts`); para ellos el país existe sólo si el texto del
   prompt lo nombra, y el informe no declara esa diferencia.
7. **Competidores y marca por coincidencia literal, sin alias, leídos en vivo.** Un competidor cuenta sólo si
   está en `competitors_declared` y su string exacto aparece como palabra
   (`normalization/normalizer.ts:61-71,164-171`); el prompt de alternativas usa sólo `competitorsDeclared[0]`
   y se descarta si la lista está vacía (`prompt-pack.ts:52`). La marca sale de `profile.brandName`
   (`scoring/command.ts:110,118`): el perfil canónico de Sky se llama "Sky Airlines" y no reconoce "SKY Airline".
   Además la normalización lee el perfil **en vivo**: re-puntuar un run viejo después de cambiar competidores
   cambia su resultado sin dejar rastro.
8. **El regrade recurrente vive en el perfil** (`grader_profiles.recurring_regrade_*`, TASK-1270), así que su
   cadencia no puede diferir por mercado.
9. **El precedente correcto ya existe en el mismo dominio Growth:** `seo_targets` es UNIQUE(org, root_domain,
   location, language) y corregir un mercado es crear un target nuevo, nunca un `UPDATE` in-place (ISSUE-152:
   Berel acumuló un año de mediciones de Chile siendo marca mexicana). El grader no tiene esa disciplina.

## Goal

- Una marca (`grader_profiles`, una activa por organización) con N **mercados** (`grader_profile_markets`):
  país ISO-2, locale BCP-47, estado, mercado primario, competidores versionados y cadencia de regrade propia.
- Un run mide exactamente un mercado; un **lote** (`grader_run_batches`) selecciona uno, varios o todos los
  mercados activos de una marca y los encola de forma atómica, con costo y entitlement validados por el total.
- Un **catálogo único de mercados de Growth** reemplaza los cuatro mapas; ningún país desconocido cae a otro.
- Prompts con la etiqueta del país en su idioma, packs `es` / `pt-BR` / `en`, y prompt sets autorados por mercado.
- Ubicación nativa enviada a cada motor que la soporte, con `geoMode` persistido y declarado en el informe.
- Alias de marca y de competidores con modo de coincidencia, y cada run guarda la foto de lo que midió.
- Una **matriz entre mercados** (último run reportable por mercado) sin score combinado inventado.
- Sky configurada con sus seis mercados y un primer lote verificado de punta a punta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §6, §7.1 (`grader_profile`),
  §7.2 (`grader_run`), §7.3 (`prompt_pack`), §7.5–7.7, §8.1–8.3 (prompts, providers, normalización), §17.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — `seo_targets` (§ tablas) e ISSUE-152: el
  precedente de mercado por target y "cambiar mercado = fila nueva".
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (migraciones, markers, tipos)
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **Un run = un mercado.** Nunca un run que mezcle países; la selección múltiple es un lote de runs.
- **Nunca promediar mercados** en un overall sin pesos declarados; la matriz muestra cada país lado a lado.
- **Cambiar el país o el idioma de un mercado = fila nueva** + pausa de la vieja; `market_code` y `locale` son
  inmutables por trigger (lección ISSUE-152).
- **Un run es autodescriptivo:** guarda la foto de marca, alias, set de competidores, mercado, locale y geoMode;
  normalizar o re-puntuar ese run nunca lee el perfil en vivo.
- **Ningún país desconocido cae a otro:** un mercado sin configuración en el catálogo bloquea con error explícito.
- **Boundary SEO↔AEO:** el catálogo de mercados es dato de referencia puro (TS, sin tablas); compartirlo no
  habilita JOIN/VIEW/FK entre `seo_*` y `grader_*`. Las listas de mercados **habilitados** siguen siendo
  decisiones de cada producto (el prospecto SEO conserva su allowlist, ahora referenciando el catálogo).
- **Expand antes del release, contract después:** columnas legadas (`grader_profiles.market`, `locale`,
  `competitors_declared`, `recurring_regrade_*`) quedan como espejo del mercado primario hasta un release
  posterior; su retiro va a `docs/tasks/pending-migrations/`, nunca en esta task (ISSUE-161).
- **Un primitive, muchos consumers:** portal cliente, puerta operador, intake público, regrade, MCP (TASK-1861)
  y Nexa usan los mismos commands/readers de mercado.

## Normative Docs

- `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`
- `docs/epics/AEO_PROGRAM_STATUS.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/to-do/TASK-1861-aeo-grader-mcp-operability.md` (consumer MCP; recibe Delta)
- `docs/tasks/in-progress/TASK-1270-growth-ai-visibility-recurring-sov-regrade.md` (regrade; recibe Delta)
- CLAUDE.md §"SQL embebido en TS" (alias en `ORDER BY`, collation de keyset) y §"Database — Migration markers"

## Dependencies & Impact

### Depends on

- `TASK-1288` / `TASK-1289` / `TASK-1290` (complete) — categoría canónica, `business_model`, packs por arquetipo
  y prompt sets autorados. Esta task los hace conscientes de mercado y locale.
- `TASK-1277` / `TASK-1286` (complete) — chokepoint de run, entitlement por organización (`module_assignments`
  `ai_visibility_v1` + `metadata_json.aeo_tier`) y aprovisionamiento de perfil.
- `TASK-1390` (complete) — normalización v2 same-site; esta task agrega alias y foto por run sin cambiar la fórmula.
- `TASK-1652` (complete) — traducción ISO-2 → `location_code` en el adapter de Google AI; se muda al catálogo.

### Blocks / Impacts

- `TASK-1861` — sus tools nacen multi-mercado (parámetros `market` / `marketIds`, tools de configuración). Delta.
- `TASK-1270` — el regrade recurrente pasa a ser por mercado. Delta.
- `TASK-1717` — la superficie de consumidor también se ejecuta por mercado (`geoMode` y locale por observación).
- `TASK-1698` — el posicionamiento declarado puede variar por mercado; su command debe aceptar mercado.
- `TASK-1311` — la atribución de citas por URL debe declarar mercado.
- `EPIC-022` — el catálogo único de mercados lo consume también el prospecto SEO (`PROSPECT_MARKETS`).
- Follow-up `ui-ux` (sin ID hasta tener dirección de Product Design): selector de mercados en el cockpit
  operador y en el informe cliente, y matriz multi-mercado visible.
- Follow-up `efeonce-think`: informe público multi-mercado (un link, N países) sobre el reader de matriz.

### Files owned

- `migrations/<timestamp>_task-1863-grader-multi-market-schema.sql` (vía `pnpm migrate:create`)
- `migrations/<timestamp>_task-1863-grader-market-capability.sql`
- `src/lib/growth/markets/registry.ts` + `src/lib/growth/markets/registry.test.ts` (nuevos)
- `src/lib/growth/ai-visibility/markets/{store,commands,readers,contracts}.ts` (nuevos)
- `src/lib/growth/ai-visibility/competitor-sets.ts` (nuevo)
- `src/lib/growth/ai-visibility/run-batches.ts` (nuevo)
- `src/lib/growth/ai-visibility/{store,request-run,run-engine,commands,provision-profile,prompt-pack,entitlement}.ts` (modifica)
- `src/lib/growth/ai-visibility/normalization/normalizer.ts` y `scoring/{command,store}.ts` (modifica: foto por run, alias)
- `src/lib/growth/ai-visibility/prompt-packs/**` (modifica: packs `es` neutro / `pt-BR` / `en`, etiqueta de mercado)
- `src/lib/growth/ai-visibility/prompt-packs/authoring/**` y `prompt-set-{store,command}.ts` (modifica: por mercado)
- `src/lib/growth/ai-visibility/providers/*-adapter.ts` + `types.ts` (modifica: geo nativa + `geoMode`)
- `src/lib/growth/ai-visibility/regrade/scheduler.ts` (modifica: por mercado)
- `src/lib/growth/ai-visibility/public-intake/aeo-form-grader-adapter.ts` (modifica: consume el catálogo)
- `src/lib/growth/seo/prospect/contracts.ts` (modifica: `PROSPECT_MARKETS` referencia el catálogo)
- `src/lib/growth/seo/gap/read-seo-aeo-gap.ts` (modifica: elige el run del mercado del target SEO)
- `src/app/api/admin/growth/ai-visibility/organizations/[organizationId]/markets/**/route.ts` (nuevas)
- `src/app/api/admin/growth/ai-visibility/batches/**/route.ts` (nuevas)
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capability nueva + grant)
- `src/lib/api/canonical-error-response.ts` + `src/lib/copy/growth.ts` (códigos y copy)
- `src/lib/reliability/queries/growth-ai-visibility-market-*.ts` (señales nuevas)
- `scripts/growth/backfill-grader-markets.ts` (nuevo, dry-run por defecto)
- `docs/documentation/growth/aeo-grader-multi-mercado.md` y `docs/manual-de-uso/growth/configurar-mercados-aeo.md` (nuevos)

## Current Repo State

### Already exists

- Perfil de marca `greenhouse_growth.grader_profiles` con `market`, `locale`, `competitors_declared`, categoría
  canónica, `business_model`, `organization_id` y `recurring_regrade_*`; índice `grader_profiles_organization_id_idx`
  sin unicidad (`migrations/20260626121608544_task-1243-grader-profile-organization-binding.sql:35`).
- Tablas que cuelgan del perfil: `grader_runs`, `grader_prompt_sets`, `grader_brand_intelligence`,
  `grader_business_model_history`, `grader_leads` (verificado en `information_schema`).
- Chokepoints `requestGraderRunForOrganization` / `requestGraderRunAsOperator` (`request-run.ts:111,267`) con
  `buildRunInputFromProfile` fijo en `mode: 'light'`, `runKind: 'public_diagnostic'` (`:71-88`).
- Snapshot público inmutable por run (`grader_reports`, token `grt-*`) y PDF on-demand por token.
- Tendencia por perfil y versión de score (`getPreviousComparableScore`, `scoring/store.ts:177`).
- Entitlement por organización `resolveAeoEntitlement` (`entitlement.ts:135-146`) con `runs per month` por tier
  (`flags.ts:321-332`) y presupuesto por tier (`budget.ts`, en shadow).
- Precedente multi-mercado en SEO: `seo_targets` + `resolveSeoTargetForMarket` (`src/lib/growth/seo/resolve-target.ts:53`).

### Gap

- No hay entidad de mercado ni lote; no hay selección de varios mercados.
- Cuatro mapas de mercado incompletos y divergentes; fallback silencioso a Estados Unidos.
- Mercado crudo en los prompts; sin packs `pt-BR` / `en`; prompt sets sin mercado.
- Sin geo nativa en cuatro de cinco motores y sin declaración de `geoMode`.
- Sin alias; competidores y marca por string literal; normalización lee el perfil en vivo.
- Regrade por perfil; entitlement sin noción de mercados incluidos.
- Datos de mercado sucios en perfiles existentes.
- Sin matriz entre mercados ni tendencia por mercado.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: dominio en `src/lib/growth/ai-visibility/**` (Vercel + `ops-worker`, que ejecuta, normaliza y
  puntúa); catálogo compartido en `src/lib/growth/markets/`; rutas admin en `src/app/api/admin/growth/ai-visibility/**`.
- Future candidate home: `domain-package`
- Boundary: commands `addGraderMarket`, `pauseGraderMarket`, `setGraderPrimaryMarket`,
  `setGraderMarketCompetitors`, `setGraderBrandAliases`, `requestGraderRunBatch`; readers
  `readGraderMarkets`, `readGraderMarketMatrix`, `readGraderRunBatch`; catálogo puro `GROWTH_MARKET_REGISTRY`.
  Consumers autorizados: puerta operador, portal cliente, intake público, regrade, lanes/MCP de TASK-1861, Nexa,
  prospecto SEO (sólo el catálogo).
- Server/browser split: commands, readers y stores server-only; el catálogo es TS puro sin secretos ni
  `server-only`, apto para compartir contratos con clientes, sin lógica de negocio.
- Build impact: sin dependencias nuevas; el `ops-worker` se redeploya porque normalización y scoring cambian.
- Extraction blocker: el store del grader vive en el PostgreSQL compartido y el ciclo ejecuta/normaliza/puntúa
  cruza Vercel y `ops-worker`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (migración con backfill mutante sobre la instancia compartida staging/prod,
  cambio de fuente de verdad del mercado, normalización en el worker, gasto multiplicado por mercado).
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.grader_profile_markets` (nuevo SoT del mercado),
  `grader_competitor_sets`, `grader_run_batches`, columnas nuevas de `grader_runs` y `grader_prompt_sets`,
  `grader_profiles.brand_aliases`.
- Consumidores afectados: puerta operador, portal cliente, intake público, regrade (`ops-worker`), normalización
  y scoring (`ops-worker`), readers de informe y cockpit, `readSeoAeoGap`, TASK-1861.
- Runtime target: `staging` → `production` (Vercel + `ops-worker`).

### Contract surface

- Contrato existente a respetar: `RequestRunResult`, `GraderProfileRow`, `ExecuteGraderRunInput`,
  `NormalizationContext`, `PersistedGraderScore`, `GraderReport`/`PublicGraderReport`, `ProviderAdapter`.
- Contrato nuevo o modificado:
  - Tablas `grader_profile_markets`, `grader_competitor_sets`, `grader_run_batches` (Detailed Spec §2).
  - `grader_runs` + `market_id`, `market_code`, `locale`, `batch_id`, `competitor_set_id`, `matching_snapshot`.
  - `grader_prompt_sets` + `market_id`; `provider_observations` [verificar nombre] + `geo_mode`, `geo_country`.
  - `grader_profiles` + `brand_aliases`; UNIQUE parcial de una marca activa por organización.
  - `GROWTH_MARKET_REGISTRY` (catálogo) y `resolveGrowthMarket(code, locale?)`.
  - Commands y readers de Boundary; rutas admin (Detailed Spec §6).
  - Chokepoints aceptan `marketId?` (default: mercado primario) → retrocompatibles.
  - `GraderReport` y DTOs de run/score ganan `market { code, locale, label }` y `geoModes`.
  - Capability `growth.ai_visibility.market.manage`; evento `growth.ai_visibility.market_configured` v1 y
    `growth.ai_visibility.run_batch.requested` v1.
- Backward compatibility: `gated` — sin mercado explícito todo camino usa el mercado primario y se comporta
  igual que hoy; lotes de más de un mercado detrás de `GROWTH_AI_VISIBILITY_MULTI_MARKET_ENABLED`.
- Full API parity: rutas admin + commands consumidos por la UI futura, por TASK-1861 (MCP) y por Nexa; cero
  lógica de mercado en rutas o componentes.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_profiles`, `grader_profile_markets` (nueva),
  `grader_competitor_sets` (nueva), `grader_run_batches` (nueva), `grader_runs`, `grader_prompt_sets`,
  observaciones del provider, `grader_scores` [verificar nombre], `greenhouse_client_portal.module_assignments`
  (sólo lectura de `metadata_json`).
- Invariantes que no se pueden romper:
  - A lo sumo una marca `active` por organización (UNIQUE parcial).
  - A lo sumo un mercado primario por marca; toda marca activa con mercados tiene exactamente uno.
  - `(profile_id, market_code, locale)` único; `market_code` y `locale` inmutables.
  - A lo sumo un set de competidores `active` por mercado; los sets son inmutables salvo `active → superseded`.
  - Todo run nuevo tiene `market_id`, `market_code`, `locale` y `matching_snapshot`.
  - Normalizar o re-puntuar un run usa su `matching_snapshot`; los runs legados sin foto usan el perfil (paridad
    bit-for-bit con hoy).
  - La tendencia sólo compara runs del mismo mercado y la misma `score_version`; si el set de competidores
    cambió, `competitive_sov` se marca incomparable.
  - Un lote encola todos sus runs o ninguno.
  - Ningún mercado sin configuración en el catálogo se ejecuta; nunca fallback a otro país.
- Write-target allowlist: `N/A — el dominio growth/ai-visibility no tiene boundary test de destinos de escritura [verificar]; si existe, declarar las tres tablas nuevas con su justificación en el mismo PR`.
- Tenant/space boundary: todo cuelga de `grader_profiles.organization_id`; comandos de puerta cliente sólo sobre
  la organización de la sesión y sólo los mercados incluidos en su tier; puerta operador por capability.
- Idempotency/concurrency: lote con llave de idempotencia con scope por organización (mismo esquema que TASK-1861);
  enqueue del lote en una transacción; `set_*` de competidores y alias con `pg_advisory_xact_lock` por mercado/marca
  y no-op idempotente si el contenido no cambia; backfill idempotente (re-ejecutable).
- Audit/outbox/history: sets de competidores versionados (historia completa), historia de alias append-only,
  outbox `market_configured` y `run_batch.requested`, `requested_by` en lotes.

### Migration, backfill and rollout

- Migration posture: `additive` + `backfill`. Tablas y columnas nuevas nullable; triggers de inmutabilidad;
  UNIQUE parciales; capability seed. Sin DROP ni cambio de tipo.
- Default state: flag `GROWTH_AI_VISIBILITY_MULTI_MARKET_ENABLED` OFF (lotes >1 y commands de mercado nuevo);
  el mercado primario opera siempre.
- Backfill plan: `scripts/growth/backfill-grader-markets.ts` — dry-run por defecto, `--apply` explícito:
  (1) normaliza `grader_profiles.market`/`locale` contra el catálogo (`Chile`→`CL`, `United States`→`US`,
  `en`→`en-US`) y lista lo que no resuelve sin tocarlo; (2) crea un mercado primario por marca; (3) crea el set v1
  de competidores desde `competitors_declared`; (4) copia `recurring_regrade_*` al mercado primario; (5) enlaza
  `grader_runs` y `grader_prompt_sets` al mercado. Verifica conteos antes/después y aborta si alguna marca
  activa queda sin primario.
- Rollback path: flag OFF; los consumers leen el mercado primario (espejo legado intacto); revert PR; las tablas
  nuevas pueden quedar sin uso (`-- Down Migration` las elimina si hace falta).
- External coordination: redeploy del `ops-worker` (normalización/scoring/regrade); verificación de códigos
  DataForSEO para BR/UY contra el apéndice gratuito; confirmación comercial de los sets de competidores de Sky.

### Security and access

- Auth/access gate: rutas admin con `requireInternalTenantContext` + `can(tenant,'growth.ai_visibility.market.manage',…)`
  para configurar; `run.operator` / `run.portal` para lotes según puerta.
- Sensitive data posture: sin PII; configuración comercial (competidores declarados) interna.
- Error contract: códigos canónicos nuevos `aeo_market_not_configured` (409), `aeo_market_not_included` (403),
  `aeo_locale_unsupported` (409), `aeo_market_unknown` (400), `aeo_primary_market_required` (409); copy es-CL.
- Abuse/rate-limit posture: el costo de un lote es la suma de sus runs y se valida entero contra allowance,
  presupuesto y el tope diario de TASK-1861 antes de encolar.

### Runtime evidence

- Local checks: tests del catálogo (paridad con los cuatro mapas previos, sin fallback), del normalizer con alias
  y modos, de la foto por run (re-puntuar tras cambiar competidores no altera un run viejo), de la tendencia por
  mercado, del lote atómico y de los commands.
- DB/runtime checks: `pnpm migrate:up` + verificación en `information_schema`/`pg_constraint`/`pg_indexes`;
  backfill dry-run y apply con conteos; readers ejercitados contra PG real.
- Integration checks: códigos de ubicación verificados contra DataForSEO; lote de Sky en staging con los seis
  mercados en modo `light`; un run `pt-BR` de Brasil con prompts en portugués y `location_code` de Brasil.
- Reliability signals/logs: `growth.ai_visibility.market_unresolved` (perfiles/mercados sin catálogo),
  `growth.ai_visibility.market_primary_missing`, `growth.ai_visibility.run_batch_partial` (lotes con runs fallidos),
  y las existentes `run_execution_lag`, `cost_budget_used`.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] La lógica de mercados, lotes, alias y competidores vive en `src/lib/growth/ai-visibility/**` y el catálogo en `src/lib/growth/markets/`.
- [ ] Modelada como aggregates (marca, mercado, set de competidores, lote), no como handlers de pantalla.
- [ ] Reads como readers canónicos; writes como commands con capability fina, idempotencia, audit/outbox y errores canónicos.
- [ ] Capability `growth.ai_visibility.market.manage` + grant a ≥1 rol real + coverage test en el mismo PR.
- [ ] Camino programático: rutas admin ahora; lanes y tools en TASK-1861 (Delta registrado).
- [ ] Writes aptos para `propose → confirm → execute`.
- [ ] Un primitive, muchos consumers: portal, operador, intake, regrade, MCP y Nexa usan los mismos commands.
- [ ] Parity check = SÍ.

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

### Slice 1 — Catálogo único de mercados de Growth

- `src/lib/growth/markets/registry.ts`: `GROWTH_MARKET_REGISTRY` indexado por ISO-3166-1 alpha-2 con
  `labels {es, pt, en}`, `defaultLocale`, `supportedLocales`, `dataforseoLocationCode`, `languageCode` y
  `promptLabel` por locale; `resolveGrowthMarket(input)` acepta ISO-2, nombre (`Chile`, `United States`,
  `Brasil`, `Brazil`) o `location_code` y devuelve el mercado o `null` — nunca otro país.
- Mercados iniciales: CL, PE, AR, BR, UY, CO, MX, ES, US. Los códigos `2076` (BR) y `2858` (UY) se verifican
  contra `GET /v3/serp/google/locations/{cc}` de DataForSEO (apéndice gratuito) antes de entrar, con evidencia
  en el PR.
- Migrar los cuatro mapas a derivaciones del catálogo: `MARKET_BY_COUNTRY`, `GOOGLE_AI_MODE_MARKET_LOCATION_CODES`
  (sin fallback a US: mercado sin código → la observación queda `skipped:market_unsupported` con captura),
  `AEO_MARKET_BY_COUNTRY` y `PROSPECT_MARKETS` (conserva su allowlist comercial como subconjunto).
- Tests de paridad: cada entrada previa resuelve igual que antes; el fallback a US desaparece con test que lo prueba.

### Slice 2 — Esquema: marca, mercados, sets de competidores, lotes

- Migración `task-1863-grader-multi-market-schema` (Detailed Spec §2) con bloques `DO` de verificación.
- UNIQUE parcial de marca activa por organización: antes de crearlo, la migración cuenta duplicados y aborta con
  mensaje explícito si existen [verificar: el discovery 2026-09-10 no midió duplicados por organización].
- Triggers de inmutabilidad (`market_code`/`locale`; sets de competidores salvo `status`).
- Capability `growth.ai_visibility.market.manage` (registry + catálogo TS + grant a `efeonce_admin`,
  `efeonce_account` y `efeonce_operations` + coverage test) en migración aparte.
- `pnpm db:generate-types`.

### Slice 3 — Backfill de marcas existentes

- `scripts/growth/backfill-grader-markets.ts` (dry-run por defecto, `--apply`): normalización de mercado/locale,
  mercado primario, set v1 de competidores, regrade al primario, enlace de runs y prompt sets.
- Reporte de filas no resueltas (sin tocarlas) y conteos antes/después; aborta si una marca activa queda sin primario.
- Evidencia: dry-run y apply en la instancia compartida con conteos pegados en la task.

### Slice 4 — Commands de configuración

- `addGraderMarket({organizationId, marketCode, locale?, actor})`: valida catálogo y locale soportado por los packs;
  crea el mercado (primario si es el primero); idempotente.
- `pauseGraderMarket` / `archiveGraderMarket` / `setGraderPrimaryMarket` (el primario no se pausa sin designar otro).
- `setGraderMarketCompetitors({marketId, competitors: [{name, aliases?, matchMode?}], actor, reason})`: nueva versión
  del set (la anterior pasa a `superseded`), no-op si el contenido es idéntico; posición 1 = ancla del prompt de
  alternativas; tope de 10 competidores por set.
- `setGraderBrandAliases({profileId, aliases: [{name, matchMode}], actor, reason})`: historia append-only.
- Rutas admin (Detailed Spec §6), outbox `market_configured`, errores canónicos, copy es-CL.
- Flags: los commands que crean un segundo mercado o un lote >1 requieren `GROWTH_AI_VISIBILITY_MULTI_MARKET_ENABLED`.

### Slice 5 — Runs por mercado y lotes

- `requestGraderRunBatch({organizationId, markets: 'primary' | 'all_active' | string[], mode, actor, channel,
  idempotencyKey})`: resuelve mercados de la marca, valida por mercado (`assertSubjectGradeable`, locale soportado,
  mercado incluido en el tier), calcula el costo total (N × techo del modo) y lo valida contra allowance/presupuesto/
  tope diario, y encola todos los runs en una transacción. Un run individual es un lote de uno.
- Los chokepoints existentes aceptan `marketId?` y delegan en el lote (default: primario).
- Entitlement: `metadata_json.aeo_markets_included` en `module_assignments` (default: trial 1, pilot 1,
  contracted = los mercados declarados en el assignment); `resolveAeoEntitlement` lo expone.
- `grader_runs` graba mercado, locale, `batch_id`, `competitor_set_id` y `matching_snapshot`.
- Normalizer y scoring leen `matching_snapshot` (fallback al perfil sólo para runs legados); coincidencia con alias
  y `matchMode` (`word_ci` insensible a mayúsculas y acentos; `word_cs` sensible a mayúsculas para tokens ambiguos
  como "Gol"); `competitorsMentioned` usa el nombre canónico, nunca el alias.
- Reader `readGraderRunBatch({batchRef})` con estado derivado de sus runs (nunca almacenado).

### Slice 6 — Prompts localizados y autoría por mercado

- Interpolación de `{{market}}` con `promptLabel` del catálogo en el locale del mercado.
- Packs por familia de idioma: `es` (neutro, con etiqueta del país), `pt-BR` y `en` para el pack base y los packs
  por arquetipo; la no-regresión del caso agencia en `es-CL` se mantiene bit-for-bit.
- `grader_prompt_sets.market_id`; la autoría (`authorPromptSet`) recibe mercado y locale y genera preguntas del
  mercado (ciudades, rutas, jugadores locales); un set activo por (marca, mercado).
- Guard: locale sin pack → `blocked: locale_unsupported`, nunca prompts en otro idioma.

### Slice 7 — Ubicación nativa por motor

- Cada adapter declara `geoMode`: `native` cuando envía el país al proveedor, `prompt_only` cuando sólo el texto lo
  expresa. Candidatos a `native` [verificar en la documentación vigente de cada API antes de implementar]:
  búsqueda web de OpenAI (`user_location`), web search de Anthropic (`user_location`), Perplexity
  (`web_search_options.user_location`), DataForSEO (`location_code`, ya nativo). Gemini queda `prompt_only` salvo
  evidencia contraria.
- La observación persiste `geo_mode` y `geo_country`; el informe y la matriz lo declaran por motor.
- Tests: el país viaja en el request de cada adapter `native`; ninguno inventa ubicación.

### Slice 8 — Readers de mercado, matriz y regrade por mercado

- `readGraderMarkets({organizationId})`: mercados, estado, primario, locale, set activo (versión + miembros),
  alias de marca, último run y próximo regrade.
- `readGraderMarketMatrix({organizationId, markets?})`: último run reportable por mercado → overall, 7 dimensiones,
  ejes de readiness, SoV contra su propio set, peldaño de madurez, `scoreVersion`, `competitorSetVersion`,
  `geoModes`, `asOf`. Sin overall combinado; marca las celdas no comparables (versión de score distinta).
- Tendencia (`getPreviousComparableScore`) acotada por mercado; `competitive_sov` incomparable si cambió el set.
- `GraderReport` y snapshot público incluyen el mercado (etiqueta y locale) en el header.
- Regrade (`regrade/scheduler.ts`) itera mercados vencidos; cadencia por mercado.
- `readSeoAeoGap` elige el run del mercado que corresponde al target SEO (hoy toma el último de la organización).
- Señales `market_unresolved`, `market_primary_missing`, `run_batch_partial` cableadas en el overview.

### Slice 9 — Documentación, Sky como primer tenant y rollout

- Docs: arquitectura del grader (§7.1–7.3, §8 y nueva sección "Mercados"), funcional
  `docs/documentation/growth/aeo-grader-multi-mercado.md`, manual `docs/manual-de-uso/growth/configurar-mercados-aeo.md`,
  `GREENHOUSE_EVENT_CATALOG_V1.md`, ledger del flag.
- Sky (`org-b9977f96-f7ef-4afb-bb26-7355d78c981f`): alias de marca, seis mercados (CL primario, PE, AR, BR, UY, CO)
  con locales `es-CL`, `es-PE`, `es-AR`, `pt-BR`, `es-UY`, `es-CO` y sus sets de competidores (contenido
  confirmado por el operador, ver Open Questions), vía los commands de Slice 4 — nunca por SQL.
- Primer lote de Sky en staging (`light`, seis mercados) verificado de punta a punta.
- Contract posterior de columnas legadas registrado en `docs/tasks/pending-migrations/`.

## Out of Scope

- UI: selector de mercados en cockpit operador e informe cliente, matriz visible (follow-up `ui-ux`).
- Informe público multi-mercado en `efeonce-think` (un link con N países): follow-up sobre el reader de matriz.
- Score combinado entre mercados con pesos declarados.
- Propiedades HubSpot por mercado (los resúmenes de organización usan el mercado primario).
- Idiomas fuera de `es`, `pt-BR` y `en`; granularidad por ciudad o región.
- Cambios a la fórmula de score, pesos o `score_version`.
- Tools MCP (las agrega TASK-1861 sobre estos commands).
- Retiro de columnas legadas (migración de contract posterior al release).

## Detailed Spec

### 1. Modelo

```text
organizations 1 ─── 1 grader_profiles (marca activa: nombre, alias, categoría, business_model, website)
                          │
                          ├── N grader_profile_markets (país, locale, estado, primario, cadencia de regrade)
                          │        │
                          │        ├── N grader_competitor_sets (versión; 1 activa)
                          │        ├── N grader_prompt_sets (por mercado; 1 activo)
                          │        └── N grader_runs (1 mercado cada uno; foto de matching)
                          │
                          └── N grader_run_batches (selección de mercados; estado derivado de sus runs)
```

### 2. Esquema (forma de referencia; el agente ajusta nombres a la convención del schema)

```sql
CREATE TABLE greenhouse_growth.grader_profile_markets (
  market_id            TEXT PRIMARY KEY DEFAULT 'gpmk-' || gen_random_uuid(),
  profile_id           TEXT NOT NULL REFERENCES greenhouse_growth.grader_profiles(profile_id),
  market_code          TEXT NOT NULL CHECK (market_code ~ '^[A-Z]{2}$'),
  locale               TEXT NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  is_primary           BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_regrade_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_regrade_cadence   TEXT NOT NULL DEFAULT 'monthly',
  recurring_regrade_next_at   TIMESTAMPTZ NULL,
  recurring_regrade_last_run_id TEXT NULL,
  recurring_regrade_last_at   TIMESTAMPTZ NULL,
  created_by           TEXT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, market_code, locale)
);
CREATE UNIQUE INDEX grader_profile_markets_one_primary
  ON greenhouse_growth.grader_profile_markets (profile_id) WHERE is_primary AND status = 'active';

CREATE TABLE greenhouse_growth.grader_competitor_sets (
  competitor_set_id    TEXT PRIMARY KEY DEFAULT 'gcset-' || gen_random_uuid(),
  market_id            TEXT NOT NULL REFERENCES greenhouse_growth.grader_profile_markets(market_id),
  version              INTEGER NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('active','superseded')),
  members_json         JSONB NOT NULL,   -- [{name, aliases[], matchMode, position}]
  reason               TEXT NULL,
  created_by           TEXT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (market_id, version)
);
CREATE UNIQUE INDEX grader_competitor_sets_one_active
  ON greenhouse_growth.grader_competitor_sets (market_id) WHERE status = 'active';

CREATE TABLE greenhouse_growth.grader_run_batches (
  batch_id             TEXT PRIMARY KEY DEFAULT 'grbt-' || gen_random_uuid(),
  public_id            TEXT UNIQUE,      -- EO-GRBT-00001 (misma convención que los runs)
  profile_id           TEXT NOT NULL REFERENCES greenhouse_growth.grader_profiles(profile_id),
  organization_id      TEXT NULL,
  market_ids           TEXT[] NOT NULL,
  mode                 TEXT NOT NULL,
  requested_by_user_id TEXT NULL,
  request_channel      TEXT NULL,
  idempotency_key      TEXT UNIQUE,
  cost_ceiling_total_usd NUMERIC(10,4) NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE greenhouse_growth.grader_runs
  ADD COLUMN market_id TEXT NULL REFERENCES greenhouse_growth.grader_profile_markets(market_id),
  ADD COLUMN market_code TEXT NULL,
  ADD COLUMN locale TEXT NULL,
  ADD COLUMN batch_id TEXT NULL REFERENCES greenhouse_growth.grader_run_batches(batch_id),
  ADD COLUMN competitor_set_id TEXT NULL REFERENCES greenhouse_growth.grader_competitor_sets(competitor_set_id),
  ADD COLUMN matching_snapshot JSONB NULL;  -- {brand:{name,aliases}, competitors:[...], setVersion}

ALTER TABLE greenhouse_growth.grader_prompt_sets
  ADD COLUMN market_id TEXT NULL REFERENCES greenhouse_growth.grader_profile_markets(market_id);

ALTER TABLE greenhouse_growth.grader_profiles
  ADD COLUMN brand_aliases JSONB NOT NULL DEFAULT '[]'::jsonb;  -- [{name, matchMode}]
```

Si `TASK-1861` ya agregó `requested_by_user_id`/`request_channel` a `grader_runs`, no se duplican.

### 3. Catálogo de mercados (forma)

```ts
export interface GrowthMarket {
  code: 'CL' | 'PE' | 'AR' | 'BR' | 'UY' | 'CO' | 'MX' | 'ES' | 'US'
  labels: { es: string; pt: string; en: string }
  defaultLocale: string          // 'pt-BR' para BR
  supportedLocales: string[]
  dataforseoLocationCode: number // verificado contra el apéndice de DataForSEO
  languageCode: 'es' | 'pt' | 'en'
}
```

`promptLabel(market, locale)` devuelve el nombre del país en el idioma del prompt ("Chile", "Brasil"/"Brazil").

### 4. Coincidencia de nombres

- `word_ci`: límites de palabra, insensible a mayúsculas y acentos (`Perú` = `Peru`).
- `word_cs`: límites de palabra, sensible a mayúsculas; para tokens que son palabras comunes en el idioma del
  mercado (`Gol`, `Sky`).
- Cada nombre y alias ≥2 caracteres; el resultado reporta el nombre canónico.
- La marca coincide por `brandName` o cualquier alias; la cita del dominio sigue siendo la señal fuerte.

### 5. Matriz entre mercados (DTO)

```json
{
  "organizationId": "org-…",
  "brand": { "name": "SKY Airline", "aliases": ["SKY", "Sky Airline"] },
  "markets": [
    {
      "market": { "code": "CL", "locale": "es-CL", "label": "Chile", "isPrimary": true },
      "latestRun": { "runPublicId": "EO-GRUN-…", "asOf": "…", "status": "succeeded" },
      "scoreVersion": "ai_visibility_score_v2",
      "overall": 61,
      "dimensions": { "ai_visibility": 70, "competitive_sov": 44, "…": null },
      "shareOfVoice": { "brand": 0.22, "competitors": { "LATAM": 0.41, "JetSMART": 0.28 } },
      "competitorSetVersion": 1,
      "maturityLevel": "readable",
      "geoModes": { "google_ai_overview": "native", "gemini": "prompt_only" },
      "comparableWith": ["PE", "AR"]
    }
  ],
  "blendedOverall": null
}
```

### 6. Rutas admin

| Método y path | Command/reader | Capability |
|---|---|---|
| `GET /api/admin/growth/ai-visibility/organizations/{orgId}/markets` | `readGraderMarkets` | `report.read_operator` read |
| `POST …/markets` | `addGraderMarket` | `market.manage` execute |
| `POST …/markets/{marketId}/pause` · `/archive` · `/primary` | commands de estado | `market.manage` execute |
| `POST …/markets/{marketId}/competitors` | `setGraderMarketCompetitors` | `market.manage` execute |
| `POST …/brand-aliases` | `setGraderBrandAliases` | `market.manage` execute |
| `GET …/matrix?markets=` | `readGraderMarketMatrix` | `report.read_operator` read |
| `POST /api/admin/growth/ai-visibility/batches` | `requestGraderRunBatch` | `run.operator` execute |
| `GET /api/admin/growth/ai-visibility/batches/{batchRef}` | `readGraderRunBatch` | `report.read_operator` read |

### 7. Costo

El costo máximo de un lote es `N mercados × techo del modo` (`light` USD 0,50; `full` USD 2). Sky con seis mercados:
hasta USD 3 en `light` y USD 12 en `full` por ronda. El drain procesa 1 run cada 5 minutos, así que un lote de seis
tarda ≥30 minutos; el reader del lote expone el avance.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (catálogo) → Slice 2 (esquema) → Slice 3 (backfill) → Slice 4 (commands) → Slice 5 (runs y lotes).
- 🔴 Slice 3 DEBE aplicarse y verificarse ANTES de desplegar Slice 5: los chokepoints nuevos resuelven el mercado
  primario; una marca sin primario bloquearía todos sus runs.
- 🔴 El `ops-worker` se despliega con Slice 5 (normalización con foto y alias) antes de encolar runs con
  `matching_snapshot`; un worker viejo ignoraría la foto y usaría el perfil en vivo.
- Slices 6 y 7 pueden correr en paralelo después de Slice 5; Slice 8 después de 5–7.
- Slice 9 al final; la configuración de Sky usa exclusivamente los commands de Slice 4.
- TASK-1861 consume estos commands; si se ejecuta antes, sus tools nacen con `market` opcional y se extienden aquí.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Backfill deja una marca activa sin mercado primario y bloquea sus runs | Datos / grader | medium | Dry-run con conteos; el script aborta si queda alguna marca sin primario; flag OFF hasta verificar | `growth.ai_visibility.market_primary_missing` |
| Normalizar mercados sucios asigna el país equivocado | Datos | medium | Catálogo con alias explícitos; lo que no resuelve se lista y no se toca | `growth.ai_visibility.market_unresolved` |
| Re-puntuar runs viejos cambia resultados publicados | Scoring | medium | Foto por run; fallback al perfil sólo para runs legados; test de estabilidad | test de regresión del scoring |
| Ruptura del caso agencia al localizar packs | Prompts | low | No-regresión bit-for-bit del pack `es-CL` agencia | tests de packs |
| Fallback silencioso a Estados Unidos persiste en algún camino | Providers | medium | Eliminarlo en el catálogo; `skipped:market_unsupported` + captura | `provider_call_skipped` por motivo |
| Un lote multiplica el gasto sin control | Gasto | medium | Costo total validado antes de encolar; `aeo_markets_included` por tier; tope diario de TASK-1861 | `cost_budget_used` |
| Cola saturada por lotes grandes | Worker | medium | Reader de lote con avance; follow-up de throughput | `run_execution_lag` |
| UNIQUE de marca activa falla por duplicados existentes | Migración | low | Conteo previo en la migración con mensaje explícito | falla del `DO` de verificación |
| `word_cs` deja pasar menos menciones de las esperadas | Normalización | low | Alias adicionales por marca/competidor; revisión de evidencia del primer lote | revisión manual del primer lote de Sky |
| Worker desplegado sin el código nuevo | `ops-worker` | medium | Orden de slices + verificación de revisión activa del worker | `observation_yield` |
| Instancia PG compartida staging/prod | Datos | high (por diseño) | Backfill idempotente y dry-run; apply una sola vez con evidencia | conteos antes/después |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_MULTI_MARKET_ENABLED` (default `false`; runtimes Vercel y `ops-worker`): habilita segundo
  mercado, lotes >1 y regrade por mercado. Con OFF, todo opera sobre el mercado primario.
- La foto por run, el catálogo y los alias no llevan flag: son correcciones con paridad bit-for-bit para lo existente.
- Fila en `FEATURE_FLAG_STATE_LEDGER.md` con ambos runtimes; declarado también en `services/ops-worker/deploy.sh`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR (el catálogo reemplaza mapas con paridad) | < 15 min | sí |
| Slice 2 | `-- Down Migration` elimina tablas/columnas nuevas (sin datos productivos antes de Slice 3) | < 30 min | sí |
| Slice 3 | Script `--rollback` elimina mercados/sets creados por el backfill (marcados con `created_by = 'backfill:task-1863'`) y des-enlaza runs | < 30 min | sí (verificado en staging antes del apply) |
| Slice 4 | Flag OFF + revert PR; configuraciones creadas quedan inertes | < 15 min | sí |
| Slice 5 | Flag OFF (lotes >1 dejan de aceptarse); revert PR; worker redeploy con la revisión previa | < 30 min | sí |
| Slice 6 | Revert PR (packs previos) | < 15 min | sí |
| Slice 7 | Revert PR; `geo_mode` queda como dato histórico | < 15 min | sí |
| Slice 8 | Revert PR; regrade vuelve a leer el espejo del perfil | < 20 min | sí |
| Slice 9 | Pausar mercados de Sky vía command | < 5 min | sí |

### Production verification sequence

1. Slice 1 en staging: tests de paridad del catálogo + un run `light` de una marca CL existente sin cambios observables.
2. Migración en la instancia compartida + verificación de tablas, índices, triggers y capability.
3. Backfill dry-run → revisión de no resueltos → `--apply` → conteos: toda marca activa con primario; runs enlazados.
4. Deploy de Vercel + `ops-worker` con flag OFF: run de marca existente idéntico (score y findings) al comportamiento previo.
5. Flag ON en staging: configurar Sky (6 mercados) por commands; lote `light` de 6 mercados; verificar prompts en
   `pt-BR` para BR, `location_code` correcto por mercado, `geoMode` por motor, matriz con 6 filas y sin overall combinado.
6. Producción por el release control plane con flag OFF; luego flag ON y repetir 5 con un lote.
7. Monitorear `market_unresolved`, `market_primary_missing`, `run_batch_partial`, `run_execution_lag` 7 días.

### Out-of-band coordination required

- Verificación de códigos DataForSEO de BR y UY (apéndice gratuito, sin gasto).
- Confirmación comercial de los sets de competidores de Sky por mercado.
- Redeploy del `ops-worker` coordinado con el release (el `deploy.sh` es el SoT de sus env vars).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GROWTH_MARKET_REGISTRY` es la única fuente de mercados del grader, del form público y del prospecto SEO; los cuatro mapas previos derivan de él.
- [ ] Un mercado sin código en el catálogo produce `skipped:market_unsupported` y nunca una consulta con ubicación de Estados Unidos (test).
- [ ] `grader_profile_markets`, `grader_competitor_sets` y `grader_run_batches` existen con sus UNIQUE, triggers y bloques de verificación, comprobados contra PG real.
- [ ] El backfill deja cada marca activa con exactamente un mercado primario y cada run con `market_id` (conteos antes/después en la task).
- [ ] Cambiar `market_code` o `locale` de un mercado falla por trigger.
- [ ] Un lote de N mercados encola N runs en una transacción o ninguno, y rechaza el lote entero si el costo total supera el presupuesto o el tope.
- [ ] Un run sin mercado explícito usa el mercado primario y produce el mismo resultado que hoy (test de paridad).
- [ ] Re-puntuar un run viejo después de cambiar los competidores del mercado no altera su resultado (test).
- [ ] "LATAM" declarado con alias cuenta respuestas que dicen "LATAM" y "LATAM Airlines"; "Gol" en `word_cs` no cuenta la palabra "gol" en minúsculas (tests).
- [ ] Un run de Brasil usa prompts en `pt-BR` con "Brasil"/"Brazil" y `location_code` de Brasil (staging).
- [ ] Ningún prompt de un run nuevo contiene un código ISO crudo como nombre de país (test sobre los packs).
- [ ] Cada observación persiste `geo_mode`; los adapters `native` envían el país (tests por adapter).
- [ ] `readGraderMarketMatrix` devuelve una fila por mercado con `scoreVersion` y `blendedOverall: null`.
- [ ] La tendencia sólo compara runs del mismo mercado y marca `competitive_sov` incomparable tras un cambio de set.
- [ ] El regrade programa y ejecuta por mercado.
- [ ] Capability `growth.ai_visibility.market.manage` con grant y coverage test verde.
- [ ] Sky queda con seis mercados configurados por commands y un lote de seis verificado en staging.
- [ ] Fila del flag en el ledger y `pnpm docs:closure-check` verde.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (suite completa)
- `pnpm build` (con autorización del operador)
- `pnpm migration-marker-gate`
- `pnpm migrate:up` + verificación en `information_schema`, `pg_constraint`, `pg_indexes`
- `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-grader-markets.ts` (dry-run) y `--apply`
- `pnpm task:lint --task TASK-1863` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check` y `pnpm flags:audit --strict --no-vercel`
- Lote de Sky en staging según la secuencia de verificación

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Deltas de cierre en `TASK-1861`, `TASK-1270`, `TASK-1717`, `TASK-1698` y `TASK-1311`.
- [ ] Contract de columnas legadas registrado en `docs/tasks/pending-migrations/`.
- [ ] Skills `seo-aeo` (overlay `efeonce/AI_VISIBILITY_GRADER.md`) y `dataforseo-operator` actualizadas con el catálogo de mercados.
- [ ] `docs/epics/AEO_PROGRAM_STATUS.md` actualizado.

## Follow-ups

- Task `ui-ux`: selector de mercados y matriz en cockpit operador e informe cliente (requiere dirección de Product Design).
- Informe público multi-mercado en `efeonce-think` sobre `readGraderMarketMatrix`.
- Score combinado con pesos declarados por mercado (decisión de producto).
- Throughput del drain para lotes grandes.
- Idiomas adicionales y granularidad por ciudad.

## Delta 2026-09-10

- Task creada a pedido del operador tras confirmar los seis mercados de Sky y decidir que la capacidad
  multi-mercado nazca con selección múltiple. Evidencia de discovery en `## Why This Task Exists`.

## Open Questions

1. **Sets de competidores de Sky por mercado.** Base confirmada: LATAM, JetSMART, Avianca y Gol. Pendiente decidir si
   cada mercado suma su aerolínea local (Aerolíneas Argentinas y Flybondi en Argentina, Azul en Brasil, Wingo en
   Colombia) y el ancla (posición 1) de cada mercado.
2. **Mercados incluidos por tier.** Propuesto: trial 1, pilot 1, contracted según el assignment. ¿Sky contratado
   incluye los seis?
3. **Perfil libre `EO-GAVP-0021`** (Sky, sin organización, `blog.skyairline.com`, runs `00043`–`00048`): ¿se archiva
   o se conserva como histórico sin enlazar? No se mezcla con la serie del perfil canónico.
4. **Alias de Sky.** Propuesto: nombre "SKY Airline"; alias "Sky Airline", "Sky Airlines" (`word_ci`) y "SKY" (`word_cs`).
