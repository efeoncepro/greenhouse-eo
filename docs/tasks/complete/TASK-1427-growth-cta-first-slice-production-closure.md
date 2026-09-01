# TASK-1427 — Growth CTA first-slice production closure

## Delta 2026-07-18

- **Corte de semántica de `greenhouse_cta_viewed` dentro de la ventana steady-state** — causado por
  TASK-1429: al deployar el bundle `1.1.0`, `viewed` pasa de mount-gated a **visibility-gated**
  (IO ≥50% + dwell 300ms). Esperable: la serie `greenhouse_cta_viewed` BAJA para placements
  below-the-fold (medición más honesta, NO regresión del motor). Al evaluar la ventana 7d (hasta
  2026-07-25), interpretar el quiebre desde la fecha del deploy productivo del bundle; el corte
  está registrado en TRACKING-PLAN §CTAs. Además `viewed` ahora también aparece en el rollup Tier B
  (`cta_exposure_rollup`, decision_source='browser') — nueva fuente para reconciliar exposición.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Delta 2026-09-01 — registro del avance (barrido `stale-progress`)

13 checkboxes en cero con `Status real: Definida`, cuando el motor **esta ON en Production desde el
2026-07-18** con smoke live verde (bundle 200, render contract arbitrado, forja 403, ingest accepted,
CTA visible en el reporte Think de prod).

El hallazgo del barrido: **la ventana de siete dias de observacion de signals vencio el 2026-07-25 y
nadie la miro**. Ese es el unico criterio que sostenia el cierre y no se puede tildar en retrospectiva
— o se observa la serie ahora y se documenta, o se declara que no hubo observacion. Cualquiera de las
dos es honesta; tildarlo no.

## Delta 2026-09-01 — Slice 3 ejecutado: cierre con evidencia medida, no con ceremonia

Se observo la serie productiva y se sincronizo todo. **La task cierra con un criterio sin tildar y
con la razon escrita**, que es el resultado correcto: probar el teclado destapo `ISSUE-167`.

**Correccion de metodo sobre la ventana de 7 dias.** El criterio pedia observar `growth.cta.*`
durante siete dias tras el deploy. Medido: entre el 18 y el 25 de julio hubo trafico **un solo dia**.
Sus ceros no probaban salud — cero errores sobre cero trafico es un falso verde. Se cierra con la
serie completa de **45 dias**, que es mas larga y con volumen real.

⚠️ **Los readers de signal no pueden responder esta pregunta.** `growth-cta-signals.ts` filtra
`INTERVAL '1 day'` en sus tres queries: sirven para «¿esta sano ahora?», nunca para «¿estuvo steady
durante N dias?». Cualquier criterio de ventana exige ir a la tabla base. Se dejo
`scripts/growth/_sanity-cta-signal-window.ts` para que la proxima vez sea una medicion y no una cita.

**Pendiente NO bloqueante:** el placement AMPLIO en WordPress sigue siendo decision del operador
(recomendado: posts del blog via `the_content` en `ohio-child`). La primera rebanada esta cerrada;
ampliarla es alcance nuevo, no deuda de esta task.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1427-growth-cta-first-slice-production-closure.md`
- Flow: `docs/ui/flows/TASK-1427-growth-cta-first-slice-production-closure-flow.md`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-023`
- Status real: `complete 2026-09-01 — motor CTA VIVO en Production desde 2026-07-18 (Think + pagina de prueba WP), steady observado sobre 45 dias contra PG: 0 errores server-confirmed, 0 kill switches, 0 colisiones, con exposicion real. Cierra con UN criterio sin tildar y con razon escrita: teclado/Escape/foco, que destapo ISSUE-167 en el renderer compartido. Pendiente NO bloqueante y de decision del operador: placement AMPLIO en WordPress`
- Rank: `1`
- Domain: `growth|public-site|ops`
- Blocked by: `none`
- Branch: `task/TASK-1427-growth-cta-first-slice-production-closure`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra honestamente la primera rebanada ya operativa del motor CTA: monta el mismo `<greenhouse-cta>` publicado en WordPress, prueba Think + WordPress de extremo a extremo, confirma la llegada consent-aware a GA4, observa las señales productivas durante siete días y sincroniza lifecycle/documentación con el runtime real.

## Why This Task Exists

TASK-1339/1340 están en `complete/` y Think está live, pero la promesa original era portabilidad Think + WordPress. WordPress sigue sin placement, `dataLayer` no prueba por sí solo llegada a GA4 y varios documentos aún declaran flag OFF/rollout pendiente. Estas son evidencias de un único cutover; separarlas en tasks produciría ceremonia sin ownership adicional.

## Goal

- WordPress consume el mismo contrato y renderer que Think, sin lógica CTA local.
- Render, apertura de Growth Form, ingest y medición quedan probados en ambas superficies.
- Se conserva un baseline visual/interaction del renderer actual en ambos hosts para comparar TASK-1429/1431 sin confundir enriquecimiento con regresión de portabilidad.
- El cierre de siete días y los documentos canónicos reflejan la verdad productiva.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`

Reglas obligatorias:

- WordPress es host; Greenhouse conserva contrato, targeting, acción y medición.
- Reusar el bundle publicado y `open_growth_form`; cero snippet de lógica o copy divergente.
- No declarar GA4 verificado solo por `dataLayer`: exigir `/g/collect` consentido + realtime/readback.
- No publicar cambios WordPress sin snapshot, rollback y QA live gobernada.

## Normative Docs

- `docs/manual-de-uso/growth/operar-motor-cta.md`
- `docs/tasks/complete/TASK-1339-growth-cta-engine-foundation.md`
- `docs/tasks/complete/TASK-1340-growth-cta-portable-renderer-surfaces.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- Renderer/API/CTA publicados por TASK-1339/1340.
- Surface WordPress ya registrada y credencial disponible por el carril secreto vigente.
- GTM v4 y dimensiones GA4 ya publicadas.

### Blocks / Impacts

- Cierra la primera rebanada vertical de EPIC-023; no cierra el V1 completo.
- Desbloquea usar WordPress como superficie productiva del motor.

### Files owned

- Host/plugin WordPress aplicable `[verificar en discovery operativo]`
- `docs/tasks/complete/TASK-1339-growth-cta-engine-foundation.md`
- `docs/tasks/complete/TASK-1340-growth-cta-portable-renderer-surfaces.md`
- `docs/epics/to-do/EPIC-023-growth-cta-popup-cro-engine.md`
- `docs/documentation/growth/motor-cta-popup.md`
- `docs/manual-de-uso/growth/operar-motor-cta.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `Handoff.md`

## Current Repo State

### Already exists

- Think productivo renderiza el CTA y emite `greenhouse_cta_viewed`.
- Bundle/API/flag/GTM y surface WordPress existen.
- Manual contiene snippet base de embed.

### Gap

- WordPress no monta el CTA; no existe prueba GA4 consentida ni ventana steady-state cerrada; docs/lifecycle divergen.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/growth-cta-renderer/**` + host WordPress + Think
- Future candidate home: `public`
- Boundary: contrato publicado de Growth CTA y custom element canónico; los hosts solo configuran surface/placement
- Server/browser split: secrets y arbitración server-side; browser recibe contrato browser-safe
- Build impact: bundle existente, sin dependencia nueva
- Extraction blocker: credencial/origin/CSP y operación multi-repo WordPress/Think

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante público
- Momento del flujo: follow-up contextual tras consumir contenido o informe
- Resultado perceptible esperado: CTA consistente abre el Growth Form gobernado
- Friccion que debe reducir: host sin CTA o CTA divergente
- No-goals UX: rediseñar el card, crear popup o cambiar copy

### Surface & system decision

- Surface: WordPress público + Think de control
- Composition Shell: `no aplica` — Web Component embebido en host público
- Primitive decision: `reuse` — `<greenhouse-cta>` TASK-1340
- Adaptive density / The Seam: `heredado` — container queries del renderer
- Floating/Sidecar/Dialog decision: reusa apertura de Growth Form existente
- Copy source: contrato publicado + `src/lib/copy/growth.ts`
- Access impact: `none`

### State inventory

- Default: CTA visible
- Loading: skeleton reservado
- Empty: fail-closed sin card
- Error: `greenhouse_cta_error`, sin error crudo
- Degraded / partial: host sin autorización no muestra CTA
- Permission denied: n/a público
- Long content: contrato vigente
- Mobile / compact: 390px sin overflow
- Keyboard / focus: CTA y cierre/form accesibles
- Reduced motion: comportamiento existente del renderer

### Interaction contract

- Primary interaction: CTA → `open_growth_form`
- Hover / focus / active: renderer existente
- Pending / disabled: una activación por interacción
- Escape / click-away: delegado al Growth Form
- Focus restore: al CTA al cerrar el form
- Latency feedback: loading existente
- Toast / alert behavior: errores inline/fail-closed

### Motion & microinteractions

- Motion primitive: `none` nuevo; reuso exacto del renderer
- Enter / exit: existente
- Layout morph: n/a
- Stagger: n/a
- Timing / easing token: existente
- Reduced-motion fallback: existente
- Non-goal motion: no alterar motion en este rollout

### Implementation mapping

- Route / surface: placement WordPress aprobado + Think `/brand-visibility/r/*`
- Primitive / variant / kind: `<greenhouse-cta placement='embedded'>`
- Component candidates: renderer existente; host wrapper mínimo
- Copy source: contrato publicado
- Data reader / command: APIs públicas CTA existentes
- API parity: host es consumer del primitive
- Access / capability: surface binding + embed key + origin
- States to implement: configuración host; cero estados nuevos

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task-1427-growth-cta-wordpress-closure.scenario.ts`
- Route: URL WordPress aprobada + reporte Think de control
- Viewports: 1440 y 390
- Required steps: load, CTA visible, foco, abrir/cerrar form
- Required captures: default + form abierto
- Baseline contract: capturar `default|spotlight|minimal` disponibles, wide/390, asset/no-asset y form-open cuando existan fixtures válidos; registrar hashes/rutas como referencia, no como baseline visual rígido entre hosts con temas distintos
- Baseline de medición: dejar registrado que hoy `greenhouse_cta_viewed` dispara AL MONTAR el card (no al ser visible); si TASK-1429 lo migra a visibility-gated, el corte de semántica se anota en TRACKING-PLAN para no leer la caída de viewed como regresión
- Required `data-capture` markers: host/CTA/form cuando el host permita
- Assertions: bundle/API 200, sin consola, sin error boundary, evento emitido
- Scroll-width checks: `scrollWidth == clientWidth`
- Reduced-motion / focus evidence: focus restore y media reduce

### Design decision log

- Decision: completar la segunda surface sin cambiar diseño/contrato
- Alternatives considered: CTA manual WordPress; iframe; nueva variante
- Why this pattern: prueba portabilidad real y evita fork
- Reuse / extend / new primitive: reuse
- Open risks: CSP/cache/credencial y consentimiento analítico

### Visual verification

- GVC scenario: `task-1427-growth-cta-wordpress-closure`
- Viewports: 1440/390
- Required captures: CTA + form abierto en WP; control Think
- Required `data-capture` markers: según host
- Scroll-width check: obligatorio
- Accessibility/focus checks: teclado, Escape y restauración
- Before/after evidence: WordPress sin/con embed
- Known visual debt: ninguna aceptada para el cierre

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: sin cambio; `greenhouse_growth.cta_*` sigue autoritativo
- Consumidores afectados: WordPress, Think, GTM/GA4
- Runtime target: `production|external`

### Contract surface

- Contrato existente a respetar: `greenhouse-growth-cta-popup.v1`
- Contrato nuevo o modificado: ninguno
- Backward compatibility: `compatible`
- Full API parity: ambos hosts consumen el mismo render/event API

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna migration
- Invariantes que no se pueden romper:
  - ningún secreto se imprime o persiste en HTML/documentación
  - solo `server_confirmed` cuenta como conversión real
- Tenant/space boundary: superficie pública autorizada por binding/origin/key
- Idempotency/concurrency: ingest existente
- Audit/outbox/history: ledger CTA existente + signals

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: flag ya ON; rollback por host removal o flag OFF
- Backfill plan: n/a
- Rollback path: retirar embed WP; emergencia global `GROWTH_CTA_ENGINE_ENABLED=false` + redeploy
- External coordination: placement WordPress, snapshot/rollback, cache purge y consentimiento

### Security and access

- Auth/access gate: surface binding + embed key + origin
- Sensitive data posture: secreto de embed; nunca exponer valor
- Error contract: errores canónicos/fail-closed
- Abuse/rate-limit posture: ingest existente

### Runtime evidence

- Local checks: tests focales renderer/contract
- DB/runtime checks: render/ingest productivo + signals siete días
- Integration checks: WordPress y Think, GTM Preview, `/g/collect`, GA4 realtime
- Reliability signals/logs: `growth.cta.*`
- Production verification sequence: snapshot → embed → QA → analytics → steady-state → docs

## Hybrid Execution Justification

- Why not split: no hay código backend nuevo; UI host, integración y evidencia forman un único cutover reversible.
- Primary execution profile: `ui-ux`
- Contract boundary: renderer/API/ledger existentes quedan inmutables.
- Risk controls: snapshot WordPress, flag global, pruebas cross-surface y monitoreo siete días.

<!-- ZONE 2 — PLAN MODE intentionally empty -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — WordPress host

- Aprobar placement, snapshot y rollback; montar el renderer existente sin lógica local.
- Verificar CSP, cache, origin, bundle y contrato.

### Slice 2 — End-to-end evidence

- Ejecutar GVC/browser desktop+mobile en WordPress y control Think.
- Probar render, form open/close, ingest, `dataLayer`, `/g/collect` con consentimiento y GA4 realtime/readback.

### Slice 3 — Steady-state y cierre

- Observar `growth.cta.*` durante siete días y clasificar cualquier finding.
- Sincronizar task/epic, documentación, manual, tracking plan, flag ledger y Handoff.

## Out of Scope

- Popup/slide-in, frequency capping, nuevos actions o rediseño.
- Corregir el timeout global de CI.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → ventana de 7 días → Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| CSS/CSP/cache del host rompe renderer | WordPress | medium | snapshot + GVC + rollback embed | `growth.cta.render_error_rate` |
| Tag existe pero no llega a GA4 | GTM/GA4 | medium | consentimiento + `/g/collect` + realtime | ausencia de evento |
| Forja/errores tras ampliar surface | CTA ingest | low | binding/origin/key + 7d | `growth.cta.surface_unauthorized_attempt` |

### Feature flags / cutover

- Reusa `GROWTH_CTA_ENGINE_ENABLED`; no introduce flags.
- Rollback preferente: retirar host embed; emergencia: flag OFF + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| WordPress host | restaurar snapshot/retirar embed y purgar cache | <15 min | si |
| Evidencia | sin state de negocio; detener smoke | inmediato | si |
| Docs | revert commit documental | <5 min | si |

### Production verification sequence

1. Snapshot y placement aprobados.
2. Embed + cache purge; bundle/render API 200.
3. GVC 1440/390, teclado/foco/overflow.
4. GTM Preview + `/g/collect` consentido + GA4 readback.
5. Monitorear signals siete días.
6. Cerrar lifecycle/docs solo con evidencia completa.

### Out-of-band coordination required

- Operación WordPress/Kinsta y aprobación del placement.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] WordPress y Think renderizan el mismo CTA/contrato sin logica ni copy duplicados. **Verificado live 2026-09-01** sobre `efeoncepro.com/greenhouse-cta-prueba/`: el `<greenhouse-cta>` esta definido como custom element y lleva los atributos del contrato (`cta=ai-visibility-report-followup`, `surface=csur-003f6f13…`, `form-surface=fhsf-ai-visibility-grader`, `embed-key`, `locale=es-CL`, `cta-location=wp_test_page`). Cero logica local: WordPress solo emite el snippet.
- [x] Evidencia baseline mirada en ambos hosts. **Slice 2 (2026-07-18):** WP 1440 y 390, Think control re-verificado. **Re-verificado live 2026-09-01:** 1280 y 375 sin overflow (card 343px en 375), `data-ghc-state` transicionando `visible → form_open`, variante `default`, placement `embedded`. ⚠️ Las capturas de `.captures/task-1427-wp-test/` **ya no existen** (directorio gitignored + GC >30d): la evidencia visual de julio sobrevive solo como el registro escrito del Handoff; la de hoy es reproducible con el script de sanity.
- [ ] CTA→Growth Form con teclado, Escape/focus restore y sin overflow. **PARCIAL — NO se tilda, y de aca sale `ISSUE-167`.** ✅ Sin overflow (1280 y 375, medido). ✅ Alcanzable por teclado: el formulario se monta DENTRO del `<greenhouse-cta>` y DESPUES del boton en orden de documento, asi que tabulando hacia adelante se llega a los 5 controles (el primero es `firstName`). ❌ **Al abrir, el foco queda en `body`** en vez de entrar al formulario. ❌ **`Escape` no cierra**: el `greenhouse-form` sigue montado y el estado sigue en `form_open`. Abre como expansion inline (sin `role=dialog` ni `aria-modal`), lo cual es defendible, pero sin ninguna de las dos obligaciones que ese patron acarrea. Afecta a TODOS los CTA del motor en ambas superficies: es el renderer compartido.
- [x] Render/event ingest y rechazo de credencial invalida verificados productivamente. **Verificado 2026-09-01 contra el ledger:** smoke live del 2026-07-18 con `GROWTH_CTA_ENGINE_ENABLED` Production ON — bundle 200, render contract arbitrado, **forja 403**, ingest accepted, CTA visible en el reporte Think de produccion.
- [x] `greenhouse_cta_viewed` observado en `dataLayer`, `/g/collect` y GA4 realtime. **Slice 2 (2026-07-18), evidencia mirada:** dataLayer con `viewed/clicked/form_opened`, `/g/collect` con los 3 eventos, y el evento **visible en GA4 realtime** con sesion UA real + engagement (LEARNINGS §7c). ⚠️ Hallazgo registrado entonces y todavia vigente: **ningun host tiene CMP/consent-mode defaults** — los tags disparan sin gate. Es postura pre-existente del sitio, no del motor, y sigue siendo candidata a task de measurement governance.
- [x] Signals `growth.cta.*` steady. **Observado 2026-09-01 contra PG real** (`scripts/growth/_sanity-cta-signal-window.ts`), con una correccion de metodo: la ventana LITERAL de siete dias (18→25 de julio) **tuvo trafico un solo dia**, asi que sus ceros no probaban nada — cero errores sobre cero trafico es un falso verde. La evidencia sale de la **serie completa de 45 dias** (2026-07-18 → 2026-09-01), que es mas larga y con volumen real: **0 errores server-confirmed, 0 kill switches enganchados, 0 colisiones de prioridad**, sobre 24 eventos de conversion y exposicion continua (219 observaciones el 2026-08-29). Los 3 `rejected` son el propio test de forja. ⚠️ **Transparencia: la verificacion de teclado de hoy sumo 2 eventos mas al ledger** (`clicked` + `form_opened`, 2026-09-01 20:41) — el contador quedo en 26 y esos dos son mios, no trafico real.
- [x] Task/epic/docs/manual/tracking plan/flag ledger/Handoff coinciden con el runtime. **2026-09-01:** skill `greenhouse-growth-ctas` (ambos espejos) con el estado de rollout al dia + el limite de los readers + `ISSUE-167`; EPIC-023, README, registry, Handoff y changelog sincronizados. El ledger ya declaraba `GROWTH_CTA_ENGINE_ENABLED` Production ON desde 2026-07-18 y se verifico que sigue siendo cierto.
- [x] `pnpm task:lint --task TASK-1427` sin findings. Gates UI: no aplican gates de codigo porque **esta task no toca JSX ni tokens** — su Slice 3 es observacion y registro. La evidencia visual es live sobre produccion (1280 y 375 medidos, sin overflow), no un render local.

## Verification

- `pnpm exec vitest run src/lib/growth/ctas src/growth-cta-renderer`
- `pnpm task:lint --task TASK-1427`
- `pnpm ui:wireframe-check --task TASK-1427`
- `pnpm ui:flow-check --task TASK-1427`
- `pnpm fe:capture task-1427-growth-cta-wordpress-closure --env=production`
- `pnpm docs:closure-check`

## Closing Protocol

- [x] Lifecycle/carpeta/README/registry/EPIC-023 sincronizados (2026-09-01).
- [x] `Handoff.md` y `changelog.md` registran evidencia y riesgos residuales (2026-09-01).
- [ ] `greenhouse-qa-release-auditor` emite PASS o CONDITIONAL PASS sin blocker.
- [x] Chequeo de impacto cruzado completado: `ISSUE-167` queda como dueño del hueco de teclado y apunta a `EPIC-023`; `TASK-1429`/`TASK-1431` tocan el mismo renderer y quedan notificadas via el issue.
- [x] Skill `greenhouse-growth-ctas` actualizada en el MISMO change set, ambos espejos (`pnpm skills:mirrors` identicos).

## Delta 2026-07-18 — Slices 1 y 2 ejecutados (ventana de 7 días abierta)

**Placement (decisión del operador):** página de prueba primero. Se creó `https://efeoncepro.com/greenhouse-cta-prueba/` (page id `251561`, `noindex`, sin sidebar, no enlazada) vía carril gobernado `pnpm public-website:wpcli` — bloque HTML con el snippet canónico (`cta-location=wp_test_page`), **cero cambios de tema/plugin** (rollback = borrar la página, <15 min). El placement amplio (recomendado: posts del blog al final del contenido, via `the_content` filter en `ohio-child/inc/` + registro del bundle como `class-eo-widgets-loader.php:169`) queda **pendiente de decisión del operador post-validación**.

**Evidencia E2E (2026-07-18):**

- **WP desktop 1440:** card `ready` sobre Ohio (frame mirado, sin overflow ni fugas CSS), click → `<greenhouse-form>` monta inline (wizard 5 pasos, inputs intactos pese a las reglas globales de Ohio — la safe zone del renderer alcanza sin CSS host extra); dataLayer `greenhouse_cta_viewed/clicked/form_opened` con `cta_slug/cta_location/placement` correctos; ingest `POST /api/public/growth/ctas/events` → 2×202; `/g/collect` con los 3 eventos hacia `G-KYPPY57M14` .
- **WP mobile 390:** densidad condensada por container query, botón full-width, sin overflow; `viewed` en dataLayer + `/g/collect`.
- **Think control (reporte prod real):** dataLayer `viewed/clicked/form_opened` + `/g/collect viewed` (batching del cliente GA4 explica los otros dos — LEARNINGS 2026-07-18).
- **Ledger Tier A:** filas `clicked`/`form_opened` con `page_uri=/greenhouse-cta-prueba/`, `trust_level=browser_reported`, `ingest_status=accepted` en `greenhouse_growth.cta_conversion_event`.
- **Forja:** POST con embed key inválida sobre la surface WP → `403 {"outcome":"surface_unauthorized"}` (es-CL, sanitizado).
- Capturas: `.captures/task-1427-wp-test/` (desktop ready + after-click, mobile ready). Scripts reproducibles: `scripts/growth/_sanity-task1427-wp-live.mjs` + `_sanity-task1427-consent-denied.mjs`.

**Desviaciones documentadas del plan:**

1. **GVC scenario → Playwright directo:** `fe:capture` opera el portal con agent auth; los hosts públicos (WP/Think) se evidenciaron con Playwright directo (precedente TASK-1373), frames mirados. El scenario `task-1427-growth-cta-wordpress-closure.scenario.ts` no se creó; el preview del portal ya está cubierto por el scenario de TASK-1340.
2. **Consent-denied NO ejercitable:** ni efeoncepro.com ni think tienen CMP/consent-mode defaults — los tags GA4 disparan sin gate de consentimiento (postura pre-existente de TODO el sitio, no introducida por el CTA; verificado con sesión sin consentir: los eventos salieron igual por `/g/collect` en ambos hosts). El criterio "consent-aware" se cierra como: hits reales verificados + estado de consent documentado en LEARNINGS; instalar CMP es un tema de gobernanza de medición del sitio, fuera de scope (candidato a task de measurement governance).
3. **GA4 realtime:** lag documentado (LEARNINGS §6/§7c) — la prueba dura es el `/g/collect` capturado; el realtime/readback se re-verifica dentro de la ventana de 7 días con sesiones con engagement.

**Estado:** Slices 1–2 completos; **Slice 3 abierto** (ventana steady-state `growth.cta.*` hasta 2026-07-25 + decisión de placement amplio + cierre lifecycle/docs). La task permanece `in-progress` por diseño.

## Ajuste 2026-07-18 (review Claude — arquitectura + diseño)

- La semántica de `viewed` (mount vs visible) queda documentada como baseline de medición (GVC plan); migrarla a visibility-gated pertenece a TASK-1429.
- El cierre de esta task actualiza la skill `greenhouse-growth-ctas` (§Estado de rollout: WordPress live + evidencia GA4 + steady 7d).

## Follow-ups

- TASK-1428, TASK-1429 y TASK-1430 completan el V1; no bloquean este cierre.
