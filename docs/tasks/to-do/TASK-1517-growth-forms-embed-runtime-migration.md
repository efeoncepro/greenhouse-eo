# TASK-1517 — Growth Forms Embed Runtime Migration

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-035`
- Status real: `Release/compatibility prep inicia tras TASK-1514; consumer cutover bloqueado por TASK-1515/1516`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1514 para release prep; TASK-1515 y TASK-1516 para consumer cutover`
- Branch: `task/TASK-1517-growth-forms-embed-runtime-migration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Migra Growth Forms desde el mutable `greenhouse.efeoncepro.com/growth-forms/renderer-latest.js` al runtime neutral,
preservando WordPress/Think, Turnstile, CORS, consent, telemetry y submission truth. Mantiene shim legacy hasta cerrar
la ventana de compatibilidad y elimina el stable artifact como efecto colateral del Greenhouse prebuild.

## Why This Task Exists

Forms sigue acoplado al release de la app: cada prebuild copia un bundle mutable que hosts externos tratan como stable.
Es una fuente de drift y hace que una mejora estética dependa de un release completo. La migración debe probar submits
reales y origen/abuse controls; comparar sólo que el JS carga sería insuficiente.

## Goal

- Publicar Forms como producto independiente bajo el protocolo Embed Runtime V1.
- Cortar WordPress y todos los docks Think sin cambiar render/submission behavior.
- Retirar el ownership estable de Greenhouse prebuild tras una ventana legacy observada.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Greenhouse conserva submit API, consent, validation y accepted-submission ledger.
- Turnstile/origin/CORS se prueban en ambos hosts; nunca se relajan para facilitar CDN.
- Renderer no carga GTM; eventos host-owned y sin PII.
- No cambio visual intencional ni deep selector nuevo.
- Los deep selectors existentes se inventarían por host y se clasifican `remove | token/part | versioned compatibility`;
  no se cambia markup interno hasta cerrar esa matriz.

## Normative Docs

- `docs/epics/to-do/EPIC-035-efeonce-embed-runtime.md`

## Dependencies & Impact

### Depends on

- `TASK-1514` protocol/fixtures.
- `TASK-1515` selected delivery plane para cutover.
- `TASK-1516` cutover/rollback pattern probado; no bloquea Slice 1 después de `TASK-1514`.

### Blocks / Impacts

- Bloquea el composition cutover de `TASK-1518`, porque CTA compone Forms; CTA release/registry prep puede avanzar.
- Afecta plugin WordPress y tres docks Forms de Think.

### Files owned

- `scripts/build-growth-forms-renderer.mjs`
- `src/growth-forms-renderer/`
- `../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/includes/class-eo-widgets-loader.php`
- `../efeonce-think/src/components/BrandVisibilityFormDock.astro`
- `../efeonce-think/src/components/WebAgenticaFormDock.astro`
- `../efeonce-think/src/components/SurroundDiscoveryFormDock.astro`
- `.github/workflows/embed-runtime-release.yml`

## Current Repo State

### Already exists

- Renderer portable, contracts/tests, Turnstile, telemetry y hosts reales.
- API/ledger autoritativos separados del bundle.
- Delivery plane seleccionado y protocolo probados por tasks anteriores al cutover.

### Gap

- Bundle stable mutable se produce en Greenhouse prebuild.
- WordPress/Think consumen URL Greenhouse directa.
- No hay Forms release/channel/rollback independiente ni legacy usage signal.
- Los hosts conservan styling acoplado a clases internas `.ghf-*`; el inventario cross-renderer halló 123 referencias
  `.ghf-*`/`.ghc-*`/`.ghm-*`, por lo que el contrato de compatibilidad es parte del cutover y no cleanup opcional.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/growth-forms-renderer + build script + WordPress/Think adapters`
- Future candidate home: `public`
- Boundary: `forms renderer protocol; submit API y domain logic permanecen en Greenhouse`
- Server/browser split: `renderer/contracts browser-safe; validation authority/Turnstile/ledger server-side`
- Build impact: `prebuild deja de controlar stable; preview local puede seguir construyéndose`
- Extraction blocker: `host allowlists, Turnstile y API compatibility coordinan tres runtimes`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Forms stable artifact/channel; submission truth no cambia`
- Consumidores afectados: `WordPress, Think/Astro, CTA future composition`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `growth forms renderer + public submit API`
- Contrato nuevo o modificado: `Forms protocol V1 release/channel + neutral loader`
- Backward compatibility: `gated con shim legacy`
- Full API parity: `sin cambio; renderer sigue consumiendo API/primitive canónica`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna migration; submission ledger sólo se verifica`
- Invariantes que no se pueden romper:
  - `accepted submission server-side es única conversión truth`
  - `consent/Turnstile/origin se revalidan server-side`
  - `renderer nunca emite valores PII a dataLayer`
- Tenant/space boundary: `form_host_surface/origin policy vigente`
- Idempotency/concurrency: `submission idempotency intacta; promotion serializada`
- Audit/outbox/history: `release receipt + submission readback permitido/sanitizado`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `shadow` — dual-publish Forms
- Backfill plan: `N/A`
- Rollback path: `legacy renderer URL + previous selected-provider release`
- External coordination: `WordPress/Think deploys, controlled submission, release approval`

### Security and access

- Auth/access gate: `public surface origin/Turnstile/rate limits existentes`
- Sensitive data posture: `PII sólo en submit API/ledger; nunca artifacts/telemetry/receipts`
- Error contract: `Forms canonical errors; no raw provider/Turnstile detail`
- Abuse/rate-limit posture: `sin relajación de captcha, origin o rate limits`

### Runtime evidence

- Local checks: `forms renderer + contract parity tests`
- DB/runtime checks: `accepted submission readback sanitizado para booking/form aprobado`
- Integration checks: `valid/invalid submit en WordPress y Think, Turnstile/CORS negativos`
- Reliability signals/logs: `loader/submit/delivery existing signals + legacy URL traffic`
- Production verification sequence: `dual-publish → host shadow → controlled submit → cutover → rollback drill`

### Acceptance criteria additions

- [ ] Submission/consent/abuse invariants se verifican en hosts reales.
- [ ] Rollback y shim legacy son explícitos.
- [ ] No se filtra PII.

<!-- ZONE 2 — PLAN MODE -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Independent Forms release

- Emitir manifest/release/channel V1 y dual-publish sin cambiar consumers.
- Separar stable artifact de Greenhouse prebuild; conservar preview para Design System/local.
- Inventariar deep selectors WordPress/Think y cerrar su matriz `remove | token/part | versioned compatibility` antes
  de cualquier markup interno.

### Slice 2 — Host migration and real submissions

- Migrar WordPress + tres Think docks al neutral loader.
- Probar valid/invalid submit, consent, Turnstile, CORS y telemetry en hosts reales.

### Slice 3 — Cutover, rollback and legacy window

- Promover stable, ejecutar rollback y restaurar.
- Mantener shim/usage signal; retirar mutable latest sólo tras cero uso en la ventana declarada.

## Out of Scope

- Rediseñar forms, copy, fields o validation policy.
- Cambiar HubSpot destination o submission schema.
- Migrar CTA antes de cerrar Forms.

## Detailed Spec

El loader neutral recibe `api-base-url` explícito y no deriva endpoints desde su propio origin. El adapter legacy puede
redirigir o cargar el release neutral, pero conserva telemetry para medir uso. La retirada de `renderer-latest.js`
requiere demostrar que ningún host inventariado lo consume durante la ventana acordada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Release independiente → hosts shadow → submits controlados → cutover/rollback → retirement por evidence.

### Risk matrix

| Riesgo                             | Sistema   | Probabilidad | Mitigation                   | Signal de alerta          |
| ---------------------------------- | --------- | ------------ | ---------------------------- | ------------------------- |
| Turnstile/CORS rechaza host        | forms API | medium       | negativos/positivos por host | submit 403/422 inesperado |
| Deep CSS selector rompe render     | host UI   | medium       | inventory + GVC              | visual diff/overflow      |
| Prebuild vuelve a controlar stable | release   | medium       | CI assertion                 | latest muta en app deploy |

### Feature flags / cutover

Host loader/channel actúa como switch; shim legacy permanece hasta cero uso observado.

### Rollback plan per slice

| Slice | Rollback                                         | Tiempo  | Reversible? |
| ----- | ------------------------------------------------ | ------- | ----------- |
| 1     | detener publish nuevo; latest Greenhouse intacto | <15 min | sí          |
| 2     | revert host adapters al legacy URL               | <30 min | sí          |
| 3     | previous release/legacy loader                   | <15 min | sí          |

### Production verification sequence

1. Hash/manifest parity y preview host.
2. Valid/invalid submits con consent states.
3. Turnstile/CORS/origin negativos.
4. Cutover, telemetry y ledger readback.
5. Rollback drill, restore y legacy traffic observation.

### Out-of-band coordination required

- Acceso/release de WordPress y Think.
- Submission real requiere datos de prueba aprobados y cleanup conforme al runbook.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Forms tiene release/channel/rollback independiente bajo el protocolo V1.
- [ ] Greenhouse app deploy ya no puede mutar Forms stable.
- [ ] WordPress y todos los docks Think usan el origen neutral.
- [ ] Valid/invalid submit, consent, Turnstile y CORS pasan en ambos hosts.
- [ ] Telemetry no contiene PII y ledger confirma accepted submission.
- [ ] GVC no muestra regresión, overflow ni fallo teclado/reduced motion.
- [ ] No queda deep selector no inventariado: cada dependencia tiene contrato, reemplazo o evidencia de retiro.
- [ ] Rollback funciona y legacy retirement depende de uso observado.

## Verification

- Suites `src/growth-forms-renderer/__tests__` y contract parity.
- Host GVC 2048/1440/820/390, teclado, foco, reduced motion, `scrollWidth === clientWidth`.
- `pnpm local:check`, `pnpm task:lint --task TASK-1517`, `pnpm docs:closure-check`.

## Closing Protocol

- [ ] Lifecycle/carpeta e índices sincronizados.
- [ ] Docs Forms y host adapters actualizados.
- [ ] Release/rollback/submission evidence sin PII enlazada.
- [ ] QA release auditor y documentation governor revisan cierre.

## Follow-ups

- `TASK-1518` — CTA migration and fleet closure.
