# TASK-1319 — Growth Forms Success Card — Contract & Compiler (backend)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-07-02 (baseline recalibration pre-execution)

- Discovery confirmo passthrough total del compiler (`successBehavior: successParsed.data`, `policy-compiler.ts:189`) y GET que serializa el contrato completo (`route.ts:44`): **extender el schema fluye los campos al browser sin tocar el compiler**; el schema (bounds + `href` allowlist) ES el boundary. Slice 2 pasa a ser **solo tests** (compile fixture + reject unsafe), sin editar `policy-compiler.ts`.
- El **activation script + la extension de `verify-aeo-public-api-contract`** se mueven a **TASK-1320**: no son verificables en 1319 sin AEO publish + renderer live (el verifier live fallaria contra la AEO actual sin success-card). 1319 queda contrato puro, 100% unit-verificable (schema + compiler + telemetry + parity tests). Evidencia runtime del contrato = el consumidor AEO en TASK-1320.
- Open Q3 resuelta: eventos success card render-only → GTM/browser only (`GTM_EVENT_NAMES` + `RENDERER_GTM_EVENTS`), NUNCA `TELEMETRY_EVENT_NAMES` (evita phantom server events).

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|forms`
- Blocked by: `none`
- Branch: `task/TASK-1319-growth-forms-success-card-contract`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Extender el contrato publicado de Growth Forms para que `success_behavior_json` pueda gobernar una **Success / Thank You Card** browser-safe: la mitad **backend/contract** de la capacidad. Esta task NO dibuja la card — entrega el contrato de datos (schema + compiler + telemetry allowlist + activation primitive + verificador de contrato) que el renderer portable consume. La mitad visible (renderer DOM, estilos, motion, GVC, cutover AEO) vive en **TASK-1320** (ui-ux, bloqueada por esta).

## Why This Task Exists

Hoy `successBehaviorSchema` solo soporta `kind` + `message`/`messageCopyRef` + `redirectUrl`, y el renderer pinta un `div.ghf-status--success` plano tras borrar el formulario. Eso no alcanza el estandar enterprise para landings publicas de alta conversion: no estructura siguientes pasos, no permite un reward/accion gobernada y deja la tentacion de resolverlo con scripts host-specific.

La capacidad debe nacer dentro de Growth Forms porque `success_behavior_json` ya es parte del contrato publicado (Full API Parity). Se separa en dos tasks por disciplina de perfil de ejecucion: el contrato/data (backend, esta task) es la fundacion reusable y verificable a nivel API; la presentacion (UI, TASK-1320) es su consumidor visible. Split canonico "backend-data foundation → ui-ux consumer" del Task Authoring Contract.

## Goal

- Extender `successBehaviorSchema` (SoT) + su espejo de tipos del renderer para soportar una presentacion `success_card` browser-safe, backward-compatible.
- Compilar metadata de success card browser-safe en el `RenderContract` sin filtrar destination mapping, HubSpot internals, URLs privadas, PII, field values ni dispatcher state.
- Extender el contrato de telemetria (event enums + payload allowlist en ambos espejos) para que la view/accion de la success card sea MEDIBLE.
- Entregar el activation primitive (publicar una version con success-card metadata, dry-run + runtime-guard) y un verificador de contrato, dejando AEO como primer consumidor verificable a nivel API (el cutover visible es TASK-1320).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`

Reglas obligatorias:

- Growth Forms es el source of truth de definiciones, versiones, render contract, submit contract, success behavior, consent y destinations.
- El browser nunca recibe HubSpot form GUIDs, property names, destination mapping, private app tokens, URLs privadas sin allowlist, PII de submission ni estado interno del dispatcher. `policy-compiler.ts` + `sanitizeRenderCopy` son el leak boundary — el no-leak test debe quedar verde.
- El success card confirma `accepted` por Greenhouse, no `delivered` por HubSpot ni generacion final de diagnostico/reporte.
- NUNCA editar una version publicada in-place: para activar AEO se clona → publica nueva version → depreca la anterior.
- El espejo de tipos del renderer (`src/growth-forms-renderer/contract.ts`) y el SoT (`src/lib/growth/forms/contracts.ts`) se mueven en lockstep (parity test); esta task toca ambos.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/context/00_INDEX.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/11_hubspot-bowtie.md`
- `.codex/skills/greenhouse-growth-forms/SKILL.md`

## Dependencies & Impact

### Depends on

- TASK-1318 (full-name split) + TASK-1297 (stable identity/render copy) + TASK-1294/1296 (Turnstile captcha token) ya en produccion — el contrato AEO v8 vigente es la base.
- Contratos y compiler actuales:
  - `src/lib/growth/forms/contracts.ts`
  - `src/lib/growth/forms/policy-compiler.ts`
  - `src/lib/growth/forms/store.ts`
  - `src/growth-forms-renderer/contract.ts` (espejo de tipos)
  - `src/growth-forms-renderer/telemetry.ts` (espejo de constantes de telemetria)
- Verificador publico: `scripts/public-website/verify-aeo-public-api-contract.ts`

### Blocks / Impacts

- **TASK-1320** (Growth Forms Success Card — Renderer, ui-ux) — consumidor visible directo; bloqueada por esta.
- Future lead magnets y gated resources que necesiten reward/download post-submit.
- Future Astro public site Growth Forms embeds.
- Cualquier admin authoring que luego exponga configuracion de success card.

### Files owned

- `src/lib/growth/forms/contracts.ts`
- `src/lib/growth/forms/policy-compiler.ts`
- `src/growth-forms-renderer/contract.ts`
- `src/growth-forms-renderer/telemetry.ts` (solo constantes espejo: `RENDERER_GTM_EVENTS` + `RENDERER_ALLOWED_PAYLOAD_KEYS`; NO los emit calls)
- `src/lib/growth/forms/__tests__/policy-compiler.test.ts`
- `src/lib/growth/forms/__tests__/renderer-contract-parity.test.ts` (mantener verde)
- `src/growth-forms-renderer/__tests__/telemetry.test.ts` (cobertura de las claves nuevas)
- (MOVIDOS a TASK-1320: `scripts/growth/activate-aeo-success-card-contract.ts`, `scripts/public-website/verify-aeo-public-api-contract.ts`)

## Current Repo State

### Already exists

- `success_behavior_json` se persiste por `form_version` y se compila al `RenderContract` publico.
- `successBehaviorSchema` (`contracts.ts:273`) acepta kinds: `inline_message`, `redirect`, `asset_access`, `review_pending`, `tokenized_report`; campos `kind` + `message` + `messageCopyRef` + `redirectUrl`.
- El espejo `RendererSuccessBehavior` (`contract.ts`) refleja los kinds pero solo tiene `kind/message/messageCopyRef/redirectUrl`.
- Telemetria: `gh_form_submission_accepted` (con `success_behavior`) y `gh_form_asset_accessed` (redirect) ya existen. `TELEMETRY_ALLOWED_PAYLOAD_KEYS` (SoT) y `RENDERER_ALLOWED_PAYLOAD_KEYS` (espejo) NO incluyen `action_kind`/`reward_kind`. `GTM_EVENT_NAMES`/`RENDERER_GTM_EVENTS` NO incluyen `gh_form_success_viewed`/`gh_form_success_action_clicked`.
- AEO v8 esta live y verificado con full-name split y mapping HubSpot.

### Gap

- No existe un contrato estructurado in-card de success card en `successBehaviorSchema`.
- No hay representacion browser-safe de first-class para rewards/assets/downloads post-submit.
- El compiler no compila (ni valida/rechaza) title/body/steps/reward/actions/supportingNote.
- No hay allowlist de URLs de reward/accion ni frontera explicita reward publico vs asset tokenizado/privado.
- Las claves de telemetria de la success card (`action_kind`/`reward_kind`) se dropean hoy en `sanitizeTelemetryPayload` (no allowlisted) → la metrica seria ciega.
- No hay activation primitive ni verificador de contrato para la success-card metadata.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_growth.form_version.success_behavior_json` y el `RenderContract` publico compilado
- Consumidores afectados: renderer (TASK-1320), WordPress/Astro/Next.js hosts, verificadores publicos, future admin authoring, future lead magnets
- Runtime target: `production` public API

### Contract surface

- Contrato existente a respetar: `src/lib/growth/forms/contracts.ts`, `src/growth-forms-renderer/contract.ts`, `src/lib/growth/forms/policy-compiler.ts`
- Contrato nuevo o modificado: success card metadata dentro de `successBehavior` + compiled render contract + telemetry event/payload allowlist.
- Backward compatibility: `compatible` — `inline_message`, `redirect`, `asset_access`, `review_pending`, `tokenized_report` siguen parseando/compilando byte-compatible.
- Full API parity: hosts y UI consumen el MISMO render contract publicado; ningun success behavior WordPress-only o AEO-only.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_version.success_behavior_json` (JSON contract; sin cambio de schema DB esperado).
- Invariantes que no se pueden romper:
  - `presentation` (COMO se muestra: `inline_message` vs `success_card`) es ORTOGONAL a `kind` (QUE outcome se promete). El reward es sub-bloque, NO un repurpose del `kind='asset_access'`.
  - Versiones publicadas inmutables; activar AEO success card = publicar version nueva + deprecar la anterior.
  - El render contract browser-safe nunca expone destination mapping, HubSpot internals, private asset tokens, raw PII, field values ni dispatcher state.
  - Success card content confirma `accepted` unicamente, salvo que un contrato futuro verifique explicitamente readiness downstream.
  - Reward/action arrays acotados, tipados y con URL/action allowlisted; `href` rechaza `javascript:`, `data:`, non-HTTPS externas (salvo dev/test) y cualquier signed/private URL no aprobada explicitamente.
- Tenant/space boundary: superficie publica anonima; host surface allowlist + form key siguen siendo el boundary.
- Idempotency/concurrency: el activation script es dry-run por default e idempotente; publica por `form_key`.
- Audit/outbox/history: no se requiere outbox nuevo para el contrato; `growth.forms.submission_accepted` sigue siendo la evidencia del accepted.

### Migration, backfill and rollout

- Migration posture: `none` esperado; extension de contrato JSON. Si Discovery descubre un CHECK/schema DB, convertir en migracion aditiva y actualizar esta task antes de codear.
- Default state: contratos viejos compilan sin cambio; la success-card metadata solo aparece en versiones que la publiquen.
- Backfill plan: none.
- Rollback path: revertir el PR antes de activar; los contratos `inline_message` siguen funcionando. Post-publish AEO: publicar/deprecar version con inline message.
- External coordination: el cutover visible AEO (--apply + GVC) es TASK-1320 y requiere el renderer live; reward/asset privado requiere aprobacion de owner + decision de hosting (fuera de scope de esta task).

### Security and access

- Auth/access gate: politicas existentes de surface/CORS/embed/captcha/rate-limit.
- Sensitive data posture: solo copy publico; sin PII echo; sin submission id.
- Error contract: success behavior invalido bloquea publicacion/compile; el renderer degrada solo para copy opcional faltante safe (comportamiento de TASK-1320).
- Abuse/rate-limit posture: sin cambio para submit; la accion de reward no debe crear filtracion de archivo privado no autenticado.

### Runtime evidence

- Local checks: policy compiler tests, parity test, no-leak test, typecheck, lint.
- DB/runtime checks: leer el render contract AEO publicado (staging) y afirmar la success-card metadata tras activar (dry-run/apply gobernado por el guard de runtime).
- Integration checks: `pnpm public-website:verify-aeo-public-api-contract` afirma la metadata en el GET publico.
- Reliability signals/logs: `gh_form_submission_accepted` sigue; las nuevas claves de telemetria (allowlist) se validan por unit test.
- Production verification sequence: publicar version en staging con dry-run/apply, verificar contrato publico, y coordinar con TASK-1320 antes del cutover visible.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths/objetos reales.
- [ ] Invariantes de data, boundary tenant/access e idempotencia explicitos.
- [ ] Migration/backfill/rollback posture explicito y proporcional al riesgo.
- [ ] Runtime/DB evidence listada para todo cambio mas alla de docs/tooling.
- [ ] Dominios sensibles con canonical errors, audit/signal posture y sin raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Success behavior contract extension (SoT + type mirror)

- Extender `successBehaviorSchema` en `src/lib/growth/forms/contracts.ts` con una presentacion success card backward-compatible (ver `Detailed Spec`).
- Reflejar el shape en `src/growth-forms-renderer/contract.ts` (`RendererSuccessBehavior`) — solo tipos, sin logica.
- Mantener `renderer-contract-parity.test.ts` verde (server ↔ renderer asignables bidireccionalmente).
- Campos acotados: `presentation`, `title`/`titleCopyRef`, `body`/`bodyCopyRef`, `steps[]` (bounded), `reward` (metadata ebook/download/gift/surprise), `actions[]` (bounded), `supportingNote`/`supportingNoteCopyRef`.
- Mantener los kinds existentes validos y byte-compatibles salvo que un test pruebe que el comportamiento actual era inseguro.

### Slice 2 — Policy compiler tests (sin cambio de codigo)

- NOTA (Delta): el compiler ya hace passthrough (`successBehavior: successParsed.data`) y bloquea en `!successParsed.success`. NO requiere cambio de codigo; el schema (Slice 1/3) hace la validacion/rechazo.
- Agregar tests que compilen un fixture success-card valido y afirmen que el `renderContract.successBehavior` carga la metadata browser-safe.
- Agregar tests que RECHACEN shapes inseguros (title/body over-length, arrays fuera de cota, `href` no-allowlisted) via `safeParse` → publicacion bloqueada.
- Mantener el gate de no-leak: la metadata nunca lleva mapping/GUID/token/PII/field values (bounds + href allowlist en el schema).

### Slice 3 — Reward / action URL allowlist (contract layer)

- Invariante de ejes ortogonales: `presentation` ⟂ `kind`; el reward es sub-bloque de la success card, NO un repurpose del `kind='asset_access'`.
- Definir en el schema los action/reward kinds V1: `external_link`, `download`, `asset_access`, `schedule`, `none`.
- Regla `href` allowlist a nivel schema: rechaza `javascript:`, `data:`, non-HTTPS externas (salvo dev/test), y cualquier signed/private URL no aprobada. `target="_blank"` implica rel safe (contrato para el renderer).
- V1 solo URLs publicas allowlisted; el asset access tokenizado queda como follow-up gobernado (no bloquea).
- Tests: reward omitido, reward presente, reward inseguro rechazado.

### Slice 4 — Telemetry contract (events + payload allowlist)

- Extender los event enums en AMBOS espejos (lockstep con el parity/telemetry test):
  - SoT: `GTM_EVENT_NAMES` + `TELEMETRY_EVENT_NAMES` + `telemetryPolicySchema.allowedEvents` (`contracts.ts`).
  - renderer: `RENDERER_GTM_EVENTS` (`telemetry.ts`).
  - Nuevos: `gh_form_success_viewed`, `gh_form_success_action_clicked` (+ server-side equivalentes si aplica).
- Extender el payload allowlist en AMBOS espejos: `TELEMETRY_ALLOWED_PAYLOAD_KEYS` (SoT) + `RENDERER_ALLOWED_PAYLOAD_KEYS` (espejo) con `action_kind`, `reward_kind`. (Sin esto, `sanitizeTelemetryPayload` las dropea en silencio.)
- Extender el forbidden-keys test para cubrir el espacio negativo (nunca field values/email/name/phone/HubSpot IDs/private tokens en estos eventos).
- NOTA de boundary: esta task define las CONSTANTES (enums + allowlist). Los `telemetry.emit(...)` calls viven en `renderer.ts` = TASK-1320.

### Slice 5 — MOVIDO a TASK-1320 (recalibracion)

El activation script (publish de una version success-card por `form_key`, dry-run + runtime-guard) y la extension de `verify-aeo-public-api-contract` se movieron a **TASK-1320**: dependen del AEO publish + renderer live y no son verificables en 1319. Ver `## Delta 2026-07-02`. La evidencia de contrato de 1319 es unit (schema + compiler fixture + telemetry + parity).

## Out of Scope

- Renderer DOM de la success card, estilos, motion, reduced-motion, GVC, focus — TASK-1320.
- El cutover visible AEO (`--apply`) + `verify-aeo-live-contract` + GVC desktop/mobile — TASK-1320.
- Los `telemetry.emit(...)` calls de los nuevos eventos (viven en `renderer.ts`) — TASK-1320.
- Thank You page separada; DAM/file hosting; admin UI de authoring; tokenized/personalized report; echo de valores enviados.
- Cambiar fields AEO, mapping HubSpot o name split de TASK-1318.

## Detailed Spec

### Proposed contract shape

Shape objetivo (finalizar en Discovery); `presentation?` es ortogonal a `kind`:

```ts
type SuccessPresentation = 'inline_message' | 'success_card'
type SuccessActionKind = 'external_link' | 'download' | 'asset_access' | 'schedule'
type SuccessRewardKind = 'none' | 'ebook' | 'guide' | 'template' | 'report_preview' | 'surprise'

interface SuccessCardAction {
  kind: SuccessActionKind
  label?: string
  labelCopyRef?: string
  href?: string
  target?: '_self' | '_blank'
  telemetryKey?: string
}

interface SuccessCardReward {
  kind: SuccessRewardKind
  title?: string; titleCopyRef?: string
  body?: string; bodyCopyRef?: string
  action?: SuccessCardAction
}

interface SuccessBehavior {
  kind: 'inline_message' | 'redirect' | 'asset_access' | 'review_pending' | 'tokenized_report'
  presentation?: SuccessPresentation
  message?: string; messageCopyRef?: string
  title?: string; titleCopyRef?: string
  body?: string; bodyCopyRef?: string
  steps?: Array<{ label?: string; copyRef?: string }>
  reward?: SuccessCardReward
  actions?: SuccessCardAction[]
  supportingNote?: string; supportingNoteCopyRef?: string
  redirectUrl?: string
}
```

Reglas:

- Backward-compatible: `kind='inline_message'` + `presentation='success_card'` es el primer path.
- Arrays acotados: max 4 steps, max 2 actions, max 1 reward block en V1. Strings con max length estricto en schema.
- `href` allowlist rechaza `javascript:`/`data:`/non-HTTPS externas (salvo dev/test) y signed/private URL no aprobada.

### Copy principles (contract-level)

- Semantica `accepted`: "Recibimos..." / "Quedo registrado...". NUNCA "enviado a HubSpot", "diagnostico listo", "reporte generado" ni "te contactaremos en X" salvo que el contrato lo pruebe.
- El wording final visible es-CL lo valida TASK-1320 con `greenhouse-ux-writing`; esta task solo garantiza que el contrato PUEDE transportar copy honesto y acotado.

### Telemetry principles

- `gh_form_submission_accepted` se mantiene.
- Los eventos `gh_form_success_viewed`/`gh_form_success_action_clicked` + las claves `action_kind`/`reward_kind` DEBEN quedar allowlisted en SoT y espejo (Slice 4) para que la metrica de conversion sea observable.
- Payloads permitidos: `success_behavior`, `action_kind`, `reward_kind`, `form_key`, `surface_id`, `form_version_id`. Prohibido: field values, email, name, phone, PII en query params, HubSpot IDs, private tokens.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract) → Slice 2 (compiler) → Slice 3 (reward safety) → Slice 4 (telemetry) → Slice 5 (activation/verifier).
- Slice 5 NO corre `--apply` en AEO: el cutover visible + GVC es TASK-1320 tras renderer live.
- Reward/private asset NO ship con URLs privadas directas sin modelo token/asset gobernado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Contrato publico expone URL/token inseguro en reward | public API / security | medium | Zod estricto, URL allowlist, tests, sin private URL directa en V1 | contract verifier failure / Sentry |
| Claves de telemetria nuevas se dropean por no allowlist | analytics | medium | Extender allowlist en ambos espejos + unit test | telemetry unit test |
| Espejo renderer↔SoT desincronizado | contract integrity | medium | `renderer-contract-parity.test.ts` rompe primero | parity test rojo |
| AEO publica success-card antes de runtime | release | medium | Activation runtime guard, dry-run default, coordinacion con TASK-1320 | activation script FAIL |
| Copy del contrato promete delivery downstream | UX / legal | low | Copy `accepted`-only; acceptance prohibe `delivered` sin prueba | review manual |

### Feature flags / cutover

- Sin feature flag global. Cutover por published form version via `success_behavior_json` (reversible por publish/deprecate).
- Activation scripts dry-run por default.
- Si el contrato se despliega antes del renderer (TASK-1320), los forms viejos mantienen inline behavior y ninguna version publica success-card hasta el cutover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR; contratos viejos siguen parseando | <30 min | yes |
| Slice 2 | Revert compiler PR | <30 min | yes |
| Slice 3 | Rechazar reward en el schema/version | <15 min | yes |
| Slice 4 | Revert enums/allowlist; eventos no emiten | <15 min | yes |
| Slice 5 | No publicar; o publicar version legacy inline | <30 min | yes |

### Production verification sequence

1. Correr policy-compiler + parity + no-leak + telemetry tests locales.
2. Correr el contract verifier contra una version fixture/nueva en dry-run.
3. Desplegar el contrato por el release path normal.
4. Publicar version success-card en staging (dry-run → apply gobernado por runtime guard).
5. `pnpm public-website:verify-aeo-public-api-contract` afirma la metadata en el GET.
6. Handoff a TASK-1320 para render + GVC + cutover AEO visible.

### Out-of-band coordination required

- Coordinar el cutover visible AEO con TASK-1320 (renderer live primero).
- Si el primer reward es ebook/download, confirmar owner del asset, hosting public/private, URL allowlist y copy legal/brand antes de publicar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `success_behavior_json` soporta una presentacion success card browser-safe sin romper `inline_message`, `redirect`, `asset_access`, `review_pending` ni `tokenized_report`. (test "legacy siguen compilando byte-compatible")
- [x] `presentation` queda ORTOGONAL a `kind`; el reward es sub-bloque, no un repurpose de `asset_access`. (test "redirect + success_card coexisten")
- [x] El compiler compila la metadata browser-safe y RECHAZA shapes inseguros (over-length, arrays fuera de cota, `href` no-allowlisted, reward con token/URL privada). (schema `safeParse` → `success_behavior_invalid` blocking; tests de href/cotas)
- [x] El render contract nunca expone mapping/GUID/token/PII/field values/dispatcher state (no-leak test verde). (`render_contract — browser-safe` describe verde; success metadata = author copy acotado + href allowlisted)
- [x] `action_kind`/`reward_kind` quedan allowlisted en `TELEMETRY_ALLOWED_PAYLOAD_KEYS` (SoT) + `RENDERER_ALLOWED_PAYLOAD_KEYS` (espejo); `gh_form_success_viewed`/`gh_form_success_action_clicked` en `GTM_EVENT_NAMES`/`RENDERER_GTM_EVENTS`.
- [x] `renderer-contract-parity.test.ts` verde tras extender el contrato (server ↔ renderer en lockstep; typecheck valida la aserción compile-time).
- [~] Activation script dry-run + guard → **MOVIDO a TASK-1320** (Delta 2026-07-02; requiere renderer live).
- [~] `verify-aeo-public-api-contract` afirma la metadata → **MOVIDO a TASK-1320** (requiere AEO publish).
- [x] Source of truth, contract surface, invariantes, boundary de acceso y migration/rollback posture explicitos. (Backend/Data Contract)
- [x] Documentation, task lifecycle y handoff sincronizados al cierre.

## Verification

- `pnpm task:lint --task TASK-1319`
- `pnpm exec vitest run src/lib/growth/forms` (incluye gates load-bearing: `renderer-contract-parity.test.ts` + policy-compiler + no-leak test)
- `pnpm exec vitest run src/growth-forms-renderer` (parity de tipos/telemetria del espejo)
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm qa:gates --changed --agent codex --task TASK-1319 --runtime --api --docs`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] chequeo de impacto cruzado sobre TASK-1320 y otras tasks afectadas
- [ ] `project_context.md` actualizado si la capacidad de contrato queda disponible transversalmente

## Follow-ups

- TASK-1320 — renderer presentation (ui-ux), consumidor visible; bloqueada por esta.
- Governed private asset/tokenized download primitive si V1 necesita ebooks/reportes no publicos.
- Admin authoring UI para success cards si operadores necesitan configurarlas sin scripts.

## Open Questions

1. Para V1, ¿las recompensas seran solo URLs publicas allowlisted o necesitamos desde ya un asset access route tokenizado?
   - Recomendacion: V1 solo URLs publicas allowlisted (`https`, sin `javascript:`/`data:`/signed-url). El asset access tokenizado es follow-up gobernado, no bloquea la capacidad.
2. ¿El contrato necesita un `presentation` explicito nuevo o basta gatear por presencia de `title`/`steps`/`reward`? (Preferencia: `presentation` explicito para claridad de contrato y verificacion.)
3. ¿Los eventos nuevos necesitan equivalentes server-side en `TELEMETRY_EVENT_NAMES` o solo GTM/browser?
