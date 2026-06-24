# TASK-1226 — Growth AI Visibility Provider Adapter Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|integrations.ai|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1226-growth-ai-visibility-provider-adapter-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la primera fundacion backend-data del nuevo dominio `growth` para el AI Visibility Grader: schema/contratos base, provider adapter interface, adapters fake/no-op para tests, flags/secrets server-only, policy de ejecucion y harness de smoke/evals de bajo volumen para OpenAI, Perplexity y Gemini. Esta task NO lanza UI publica ni escribe en HubSpot; deja el motor listo para correr internamente con proveedores reales solo si las credenciales/flags existen.

## Why This Task Exists

El grader publico necesita mostrar evidencia de answer engines, pero conectar providers directamente desde la UI o desde un flujo de HubSpot crearia costo descontrolado, secretos expuestos, baja observabilidad y reportes dificiles de auditar. La arquitectura ya definio que `growth` debe ser el source of truth de prompt packs, runs, provider observations, normalized findings, scoring y reportes. Falta materializar el primer contrato ejecutable: una capa de adapters gobernada, testeable y flag-gated que produzca evidencia normalizada sin comprometer el lanzamiento publico.

## Goal

- Crear la raiz backend del dominio `growth.ai_visibility` con tipos, contratos y helpers para runs, prompt packs, provider policy y provider observations.
- Implementar una interface comun de providers y adapters iniciales para OpenAI, Perplexity y Gemini detras de flags, con fake/no-op adapter para local/test.
- Persistir o preparar la persistencia aditiva minima para `grader_profile`, `grader_run`, `prompt_pack` y `provider_observation` segun el patron de migrations del repo.
- Agregar tests/evals focales que validen normalizacion, errores canonicos, costo/latencia y comportamiento cuando faltan secrets o flags.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — arquitectura canonica del grader, provider connection contract, domain model, rollout y provider/access checklist.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md` — ADR del lead magnet/control-plane.
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md` — nuevo dominio `growth` y sus fronteras con `commercial`, public-site, Verk/Kortex/Nexa.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — full API parity y primitives server-side.
- `docs/architecture/DECISIONS_INDEX.md` — indice vigente de ADRs/decisiones.

Reglas obligatorias:

- Los providers se invocan solo server-side desde `growth.ai_visibility`; la UI publica, browser code y HubSpot no llaman providers AI/search.
- Las credenciales son server-only, por Secret Manager/Vercel sensitive env segun postura existente; no se loguean ni viajan al cliente.
- Esta task debe poder pasar en local sin secrets reales: fake/no-op adapter y tests deterministas son obligatorios.
- Provider outputs son evidencia no confiable: no disparan writes, syncs ni recomendaciones ejecutivas sin normalizacion/score posterior.
- Default OFF: todos los providers y el grader global quedan flag-gated hasta smoke interno.

## Normative Docs

- `.codex/skills/hubspot-greenhouse-bridge/SKILL.md` — disciplina de integraciones HubSpot/Greenhouse y handoff, aunque esta task no escribe HubSpot.
- `.codex/skills/software-architect-2026/SKILL.md` — criterios arquitectonicos para sistemas AI/integracion.
- `docs/context/00_INDEX.md` — cargar contexto GTM/producto aplicable antes de cambiar naming/copy/metricas.
- `docs/context/02_gtm.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/context/14_modelo-negocio-asaas.md`

## Dependencies & Impact

### Depends on

- Arquitectura y ADR ya aceptados:
  - `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md`
  - `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- Acceso a providers real solo para smoke opcional:
  - OpenAI Responses API con web search.
  - Perplexity Sonar.
  - Gemini API con Google Search grounding o Vertex equivalente.

### Blocks / Impacts

- Bloquea la UI/admin del grader, el report builder y el lanzamiento publico.
- Habilita tasks posteriores de scoring deterministico, reportes, HubSpot handoff y admin control plane.
- Impacta observabilidad/costo de AI provider calls bajo el namespace `growth.ai_visibility.*`.

### Files owned

Paths esperados; el agente debe verificar patrones reales durante Discovery:

- `src/lib/growth/ai-visibility/**`
- `src/lib/growth/ai-visibility/providers/**`
- `src/lib/growth/ai-visibility/prompt-packs/**`
- `src/lib/growth/ai-visibility/run-engine/**`
- `src/lib/growth/ai-visibility/__tests__/**`
- `src/app/api/admin/growth/ai-visibility/**` solo si hace falta un endpoint interno read/smoke; no crear UI.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` si el contract descubre drift.
- Migrations/seeds bajo el directorio canonico del repo, a identificar en Discovery.

## Current Repo State

### Already exists

- Documentos canonicos de arquitectura/ADR del AI Visibility Grader y del dominio `growth`.
- Integraciones HubSpot existentes y disciplina de bridge; esta task no debe duplicarlas.
- Patrones de readers/commands/capabilities, errores canonicos, signals y migrations en otros dominios del repo.

### Gap

- No existe raiz `src/lib/growth/ai-visibility/`.
- No existe schema Postgres `greenhouse_growth` ni tablas del grader.
- No existe provider adapter comun ni policy para OpenAI/Perplexity/Gemini.
- No existe harness de eval/smoke para answer-engine visibility.
- No existen flags/secrets documentados en runtime para este grader.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: nuevo dominio `growth.ai_visibility`, schema planificado `greenhouse_growth`, provider observation ledger.
- Consumidores afectados: future public API, admin readers, report builder, HubSpot handoff, Nexa/MCP future consumers.
- Runtime target: `local` y `staging`; real provider calls opcionales y low-volume si existen secrets/flags.

### Contract surface

- Contrato existente a respetar: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` secciones 7, 8, 13, 15, 16, 17 y 22.
- Contrato nuevo o modificado: TypeScript provider adapter contract, provider policy resolver, normalized provider observation type, run lifecycle helpers, optional migration/schema `greenhouse_growth`.
- Backward compatibility: `not applicable` para runtime existente; todo es aditivo y flag-gated.
- Full API parity: la futura UI/admin/public page/Nexa consumen los mismos commands/readers server-side. Esta task no crea click-handlers ni rutas ad hoc; si expone un endpoint, delega en primitives `src/lib/growth/ai-visibility/**`.

### Data model and invariants

- Entidades/tablas/views afectadas:
  - `greenhouse_growth.grader_profiles` o equivalente.
  - `greenhouse_growth.grader_runs` o equivalente.
  - `greenhouse_growth.prompt_packs` y `prompt_pack_prompts` o equivalente.
  - `greenhouse_growth.provider_observations` o equivalente.
- Invariantes que no se pueden romper:
  - Provider evidence no es business truth; score/report se derivan despues bajo versionado.
  - Prompt packs activos son inmutables; cualquier cambio crea nueva version.
  - Cada provider call queda asociada a `run_id`, `prompt_id`, `provider`, `model`, `provider_policy_version` y `prompt_pack_version`.
  - Secrets y raw provider payloads no aparecen en logs, responses publicas ni errores crudos.
  - Falta de secret/flag produce `skipped` o error canonico, no crash no controlado.
- Tenant/space boundary: V1 internal/pre-tenant; no mezclar datos de clientes Greenhouse. Public submissions futuras generan `public_lead_id`/profile separado antes de cualquier tenant linkage.
- Idempotency/concurrency: run creation y provider execution deben soportar idempotency key por profile/input/prompt_pack/run_kind; provider retries no duplican observations exitosas para la misma combinacion.
- Audit/outbox/history: append-only provider observation ledger + reliability/cost signal por intento; no outbox externo en esta task.

### Migration, backfill and rollout

- Migration posture: `additive` si se crean tablas; `none` si Discovery decide postergar DB y dejar contract/types primero, con justificacion.
- Default state: `flag OFF`; fake/no-op provider default para local/test.
- Backfill plan: N/A, no hay datos historicos.
- Rollback path: flags off + revert PR; si hay migration aditiva, dejar tablas sin uso o rollback migration segun patron del repo.
- External coordination: provisionar `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY` o secret refs solo para smoke controlado; no requerido para tests locales.

### Security and access

- Auth/access gate: internal command/reader only; si hay API admin, usar session/capability existente y no endpoint publico.
- Sensitive data posture: PII minima en esta task; prompts no deben incluir email, telefono ni datos personales del submitter.
- Error contract: canonical errors y `captureWithDomain('growth')` o patron equivalente existente; nunca raw provider errors al cliente.
- Abuse/rate-limit posture: cost budget guard, provider kill switches, max prompts/providers por policy, retry bounds y timeout por call.

### Runtime evidence

- Local checks: unit tests para policy, fake provider, error mapping, prompt input sanitization y observation normalization.
- DB/runtime checks: migration verify/read smoke si se crean tablas.
- Integration checks: provider smoke low-volume opcional por flag/env; debe saltarse limpiamente si faltan secrets.
- Reliability signals/logs:
  - `growth.ai_visibility.provider_error_rate`
  - `growth.ai_visibility.provider_latency_p95`
  - `growth.ai_visibility.cost_budget_used`
  - `growth.ai_visibility.provider_call_skipped`
- Production verification sequence: N/A para public launch; esta task solo habilita internal/staging foundation con providers OFF por defecto.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes de evidence/run/prompt pack, tenant boundary e idempotencia explicitos en codigo/tests/docs.
- [ ] Migration/rollback posture explicita y proporcional.
- [ ] Evidence runtime o DB listada para cualquier cambio mas alla de types puros.
- [ ] Errores canonicos, signals y no raw data leaks cubiertos.

## Hybrid Execution Justification

No aplica: `UI impact: none`. La UI publica, admin control plane y report visual deben vivir en tasks `ui-ux` separadas que consuman estos primitives.

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

### Slice 1 — Growth AI Visibility contract skeleton

- Crear `src/lib/growth/ai-visibility/` con barrel y contracts base para profile/run/prompt/provider observation.
- Definir enums/constantes para `run_kind`, lifecycle status, provider ids, execution modes y provider error classes.
- Agregar tests puros para lifecycle/status transitions y serialization de provider observations.

### Slice 2 — Provider policy + adapter interface

- Implementar `ProviderAdapter` comun con `runPrompt(input)` y metadata de capabilities.
- Implementar provider policy resolver para `light`, `full` e `internal_audit`.
- Implementar fake/no-op adapter deterministico para local/test.
- Mapear errores canonicos y timeouts sin filtrar raw provider errors.

### Slice 3 — Real provider adapters behind flags

- Implementar adapters iniciales para OpenAI, Perplexity y Gemini detras de flags/provider config.
- Cada adapter debe devolver `ProviderObservation` normalizada con citations/usage/latency cuando el provider lo soporte.
- Si falta secret o flag, devolver skip controlado o error canonico segun policy; nunca fallar todo el proceso por configuracion ausente.
- No enviar email/telefono/contact PII a providers.

### Slice 4 — Persistence and runtime signals

- Crear migration aditiva para `greenhouse_growth` y tablas minimas, o documentar decision de diferir DB si el repo requiere primero contract-only.
- Agregar writer/reader interno para guardar provider observations append-only.
- Emitir signals/logs de provider attempt, latency, skipped, error class y cost/usage cuando exista.

### Slice 5 — Smoke/eval harness

- Crear script o test harness low-volume para correr un prompt pack minimo contra fake adapter y, opcionalmente, providers reales si flags/secrets existen.
- Incluir golden fixtures para al menos Efeonce/Greenhouse y una marca neutra.
- Documentar comandos de smoke, expected skip behavior sin secrets y criterio de no-regresion.

## Out of Scope

- Public landing/page del grader.
- Admin UI o evidencia visual.
- Deterministic scoring completo y report builder publico.
- HubSpot contact/company/deal writes o custom properties.
- Nexa/MCP tools.
- CAPTCHA, public rate-limit definitivo y report tokenization.
- Provisioning real de secrets en Vercel/GCP como requisito de cierre; solo contrato y smoke opcional.

## Detailed Spec

### Provider adapter contract

El contrato final puede ajustar nombres segun patrones del repo, pero debe conservar esta semantica:

```ts
type GrowthAiVisibilityProviderId = 'openai' | 'perplexity' | 'gemini'

type GrowthAiVisibilityExecutionMode = 'light' | 'full' | 'internal_audit'

type ProviderPromptInput = {
  runId: string
  promptId: string
  promptText: string
  locale: string
  market: string
  brandName: string
  websiteUrl: string
  competitorsDeclared: string[]
  mode: GrowthAiVisibilityExecutionMode
}

type ProviderObservation = {
  observationId: string
  runId: string
  promptId: string
  provider: GrowthAiVisibilityProviderId
  model: string
  status: 'succeeded' | 'failed' | 'rate_limited' | 'skipped'
  answerTextHash: string | null
  answerExcerpt: string | null
  citations: Array<{
    url: string
    domain: string
    title?: string
    sourceType?: 'owned' | 'earned' | 'social' | 'directory' | 'marketplace' | 'news' | 'unknown'
  }>
  usage: Record<string, unknown>
  latencyMs: number
  providerRequestHash: string
  rawEvidencePointer: string | null
  errorCode: string | null
  createdAt: string
}
```

### Feature flags and env concepts

- `GROWTH_AI_VISIBILITY_GRADER_ENABLED` — global kill switch, default `false`.
- `GROWTH_AI_VISIBILITY_OPENAI_ENABLED` — OpenAI adapter enabled, default `false`.
- `GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED` — Perplexity adapter enabled, default `false`.
- `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` — Gemini adapter enabled, default `false`.
- `OPENAI_API_KEY` or secret ref — server-only.
- `PERPLEXITY_API_KEY` or secret ref — server-only.
- `GEMINI_API_KEY` or Vertex/GCP credential strategy — server-only.

### Provider-specific notes

- OpenAI adapter: use Responses API with web search where available; capture search/citation metadata if returned; do not claim parity with ChatGPT consumer UI.
- Perplexity adapter: prioritize citation normalization and source-domain extraction.
- Gemini adapter: use Google Search grounding or Vertex equivalent; preserve grounding metadata.
- All adapters: low timeout, bounded retries, bounded excerpt retention, provider request hash, no secret logs.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract skeleton) -> Slice 2 (policy/interface/fake adapter) -> Slice 3 (real adapters behind flags) -> Slice 4 (persistence/signals) -> Slice 5 (smoke/eval harness).
- Slice 3 must not merge with providers enabled by default.
- Slice 4 persistence must be additive only; no public API depends on it until later tasks.
- Slice 5 real provider smoke is optional and must skip cleanly when secrets/flags are absent.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Provider costs spike during testing | integrations.ai / cost | medium | global/provider flags OFF default, prompt/provider caps, optional smoke only | `growth.ai_visibility.cost_budget_used` |
| Secrets leak through logs/errors | security / integrations.ai | low | server-only config, canonical error mapping, no raw provider error responses | Sentry/log scrub review |
| Public or HubSpot flow starts using incomplete evidence | product / crm | low | no public routes/writes in scope, primitives internal-only | no public endpoint created |
| Provider output is treated as fact | data quality | medium | evidence ledger semantics, status/confidence, no scoring/report release in this task | normalized tests reject unsupported certainty |
| Migration creates schema drift | db / migration | low | additive migration only, verify read smoke, rollback documented | migration verify failure |
| Adapter API changes break runtime | integrations.ai | medium | adapter isolation, fake tests, provider smoke optional, error class fallback | `growth.ai_visibility.provider_error_rate` |

### Feature flags / cutover

- All provider flags default `false`.
- Global `GROWTH_AI_VISIBILITY_GRADER_ENABLED` default `false`.
- Local/test uses fake/no-op adapter unless explicitly configured.
- Cutover for real smoke: enable one provider at a time in staging/internal only, run bounded prompt pack, then turn off if errors/cost exceed threshold.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (types/contracts only) | <5 min | si |
| Slice 2 | revert PR or switch policy to fake adapter | <5 min | si |
| Slice 3 | flags off + revert adapter code if needed | <5 min | si |
| Slice 4 | flags off + revert PR; additive tables may remain unused or use reverse migration if repo requires | <15 min | si |
| Slice 5 | remove/skip smoke harness; no production state | <5 min | si |

### Production verification sequence

1. Run local tests with fake adapter.
2. Apply/verify migration in local or staging if Slice 4 creates DB schema.
3. Deploy to staging with global/provider flags OFF; verify no provider calls are made.
4. Enable one provider in staging/internal with one bounded prompt and verify observation, signal and no secret leakage.
5. Repeat provider-by-provider only if credentials exist and operator approves smoke.
6. Keep production public launch out of scope; production providers remain OFF unless a later rollout task changes that.

### Out-of-band coordination required

- Optional provider secret provisioning in GCP Secret Manager/Vercel env for staging smoke.
- No HubSpot property creation.
- No public-site deployment.
- No legal/privacy copy approval required in this task because no public surface ships.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `src/lib/growth/ai-visibility/` con contracts base, provider ids, execution modes, lifecycle/status helpers y tests.
- [ ] Existe `ProviderAdapter` comun + policy resolver + fake/no-op adapter deterministico.
- [ ] Adapters OpenAI/Perplexity/Gemini existen detras de flags y manejan missing secret/disabled provider sin crash.
- [ ] Provider observations normalizadas incluyen provider/model/status/usage/latency/citations/error class/request hash.
- [ ] Ningun adapter envia email/telefono/contact PII a providers.
- [ ] Si hay migration, es aditiva y verificada; si se difiere DB, la decision queda documentada en la task/delta.
- [ ] Signals/logs de provider attempt, skipped, error, latency y cost/usage quedan implementados o explicitamente stubbeados con follow-up.
- [ ] Smoke/eval harness corre con fake adapter y salta providers reales cuando faltan secrets.
- [ ] No se crea UI publica, public API, HubSpot write ni custom properties en esta task.

## Verification

- `pnpm task:lint --task TASK-1226`
- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm typecheck`
- Tests focales de `src/lib/growth/ai-visibility/**`.
- Migration verify/read smoke si se crean tablas.
- Provider smoke staging/internal opcional, uno por proveedor, solo si secrets/flags existen.
- `pnpm docs:closure-check` al cerrar si se actualizan docs/arquitectura/handoff.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado si cambia el estado.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] se ejecuto chequeo de impacto cruzado sobre tasks futuras del grader.
- [ ] provider access/secrets reales usados durante smoke quedaron documentados sin revelar valores.

## Follow-ups

- Task backend-data separada para deterministic scoring + report builder.
- Task ui-ux separada para admin control plane interno.
- Task ui-ux/public-site separada para landing/public report.
- Task backend-data separada para HubSpot handoff/properties, con mapping aprobado.
- Task backend-data/Nexa separada para exponer reads/actions a Nexa/MCP cuando el dominio este estable.

## Delta 2026-06-24

Re-secuenciamiento tras revisión arquitectónica (arch-architect) del programa del grader. Cambios materiales — el agente que tome esta task DEBE respetarlos:

- **Precursor `TASK-1228` (Discovery & Eval Spike):** valida empíricamente el modelo de medición ANTES de hornearlo y produce dos inputs para esta task: (a) un **cost ceiling por modo** (`light`/`full`) y costo/run real, y (b) un **prompt pack V1** versionado. Las **Slices 1–2 (contract skeleton + policy + fake adapter) pueden avanzar en paralelo** con 1228 (no dependen de su evidencia). Pero **el provider policy/caps de costo y el smoke harness (Slice 5) DEBEN consumir el cost ceiling y el prompt pack V1 de 1228** en vez de inventar prompt count/caps. Por eso `Blocked by` se mantiene `none` pero esta task NO debe fijar caps de costo ni el prompt pack del smoke sin el output de 1228.
- **Split recomendado de Slice 3 (real adapters):** integrar **un solo provider primero** (probar el loop end-to-end completo: contract → policy → adapter → observation normalizada → signal/cost) y recién después los otros dos. Tres APIs distintas (OpenAI Responses+web search, Perplexity Sonar, Gemini grounding) en un solo golpe es alto riesgo; probar el pipeline con uno reduce blast radius antes de triplicar.
- **Resuelve parcialmente la Open Question #1:** 1228 no decide DB, pero su golden set/prompt pack ayudan a definir si conviene persistir observations desde esta task o seguir contract-only; mantener la decisión en Discovery con ese input.

## Open Questions

1. En la primera implementacion, ¿conviene crear tablas Postgres desde esta task o empezar contract-only con fake provider y agregar DB en el mismo PR tras Discovery?
2. ¿El runtime usara OpenAI API key directa, Vertex para Gemini o ambos via Secret Manager refs existentes?
3. ¿El primer smoke real debe usar solo Efeonce/Greenhouse o incluir una marca neutra para detectar bias/citation behavior?
