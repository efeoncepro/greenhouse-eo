# TASK-2038 — Renderer de Growth Forms en AXIS

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

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
- Status real: `Diseno; decisión del operador 2026-10-15; enmienda de ADR pendiente como primer slice`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none para Slices 1–3; Slice 4 (publicación independiente) depende de TASK-1514 y TASK-1515`
- Branch: `Greenhouse develop y AXIS main existentes; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-10-18

- Retirar al portar: `creativa-source/host.css` dibuja los íconos de las tres preguntas del paso 1 (`mainBlocker`, `marketingTeamSize`, `startTimeline`) con `::before` + máscara SVG, porque el set de `presentation.icon` no tiene glifos de objetivo ni de equipo. Al sumar esos íconos al renderer, declararlos en el contrato y borrar esas reglas.

- El formulario de diagnóstico en dos pasos se publicó con el release de Greenhouse del 2026-10-18 (renderer con `ab622e958` en producción), no con esta task: `fver-7178aede-…` + política Meta revisión 2. El Slice 4 de esta task sólo debe verificar que el bundle de AXIS lo dibuje igual.

## Summary

El web component `<greenhouse-form>` (hoy `src/growth-forms-renderer/` en Greenhouse) pasa a vivir en el repo AXIS:
controles, tarjetas de opciones, pasos, estilos y build. Así un cambio visual de un formulario sale con un release de
AXIS hacia el delivery plane de EPIC-035, sin esperar un release de Greenhouse. Greenhouse conserva el contrato de
render, la API pública, la validación de servidor, el consentimiento autoritativo, los envíos, los destinos y la medición.

## Why This Task Exists

El 2026-10-15 un rediseño aprobado del formulario de diagnóstico de `/agencia-creativa/` (dos pasos, opciones visibles)
quedó detenido porque necesitaba un cambio chico en el renderer, y el renderer sólo llega a producción con una
publicación completa de Greenhouse (ese día, `develop` llevaba 3.864 commits por delante de `main`). EPIC-035 ya
resolvió desacoplar la *publicación* del release de la app, pero su ADR V2 deja la *fuente* en Greenhouse, y el ADR de
AXIS para Growth Forms (`GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1`) sólo comparte comportamiento de campos. Nadie es
dueño de mover la presentación del renderer a AXIS, que es la mitad que más cambia. El operador decidió (2026-10-15)
que la fuente del renderer viva en AXIS y que la publicación use el carril de EPIC-035 alimentado desde AXIS.

## Goal

- La fuente y el build del renderer de Growth Forms viven en AXIS, con la misma API pública del custom element.
- Un cambio visual del renderer se publica con un release de AXIS por el delivery plane de EPIC-035, sin release de Greenhouse.
- Greenhouse mantiene la autoridad de contrato, servidor, consentimiento, envíos, destinos y medición, sin duplicarla.
- Los cambios ya aprobados (tarjetas de opciones en cualquier estilo, enlace de privacidad legible, íconos SVG de
  etiqueta, formulario de diagnóstico en dos pasos) quedan dentro del renderer portado, sin perderse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md` (se enmienda en el Slice 1)
- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md`
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- AXIS `docs/architecture/FORM_PRIMITIVES_DECISION_V1.md` y `docs/architecture/PRODUCT_PRIMITIVES_DECISION_V1.md`

Reglas obligatorias:

- El render contract (`src/lib/growth/forms/contracts.ts` ↔ `src/growth-forms-renderer/contract.ts`) sigue teniendo una
  sola fuente de verdad del lado servidor; la copia del navegador se mantiene en paridad bidireccional probada, ahora
  entre dos repos.
- Validación autoritativa, Turnstile, consentimiento, cifrado de PII, envíos, destinos HubSpot y matching publicitario
  siguen en Greenhouse. El renderer de AXIS sólo pinta, valida en cliente y envía al API público.
- El renderer nunca carga GTM ni emite PII al dataLayer; la allowlist de telemetría `gh_form_*` no cambia.
- La API pública del custom element (`form-key`, `form`, `surface`, `locale`, `color-scheme`, `appearance`,
  `initial-values`, `inputBehaviors`) y las clases `.ghf-*` que los hosts estilan se conservan; cualquier cambio pasa
  por la matriz `remove | token/part | versioned compatibility` de TASK-1517.
- El delivery plane, la promoción build-once, el rollback y la procedencia son los de EPIC-035; esta task no crea un
  carril de publicación paralelo desde el Lab de AXIS.
- Cambio visual intencional sólo para lo ya aprobado (tarjetas, enlace legible, íconos SVG); todo lo demás, paridad de píxeles.

## Normative Docs

- `docs/epics/to-do/EPIC-035-efeonce-embed-runtime.md`
- `docs/tasks/to-do/TASK-1517-growth-forms-embed-runtime-migration.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md` (deltas del 2026-10-15 sobre el formulario)

## Dependencies & Impact

### Depends on

- AXIS `packages/primitives` (Forms) y su release `.github/workflows/release-packages.yml` en el repo AXIS.
- `TASK-1514` (protocolo V1 y fixtures de host) y `TASK-1515` (delivery plane elegido) para el Slice 4.
- Commit Greenhouse `ab622e958` (radio como tarjetas en cualquier estilo, enlace de privacidad legible, íconos SVG):
  es la línea base que se porta.

### Blocks / Impacts

- `TASK-1517`: su Slice 1 (Forms independent release) publica desde la fuente AXIS en vez de `scripts/build-growth-forms-renderer.mjs`; ver su `## Delta 2026-10-15`.
- `TASK-1518`: CTA compone Forms; consume el renderer publicado desde AXIS.
- `TASK-1359` (instrumentación multi-step): la telemetría vive en el renderer portado.
- Formulario `efeonce-creative-diagnostic` en dos pasos: `scripts/growth/activate-creative-diagnostic-two-step.ts`
  publica cuando el renderer con `ab622e958` (o su port) esté en producción.
- Hosts: plugin WordPress `eo-elementor-widgets` y los tres docks Forms de Think.

### Files owned

- AXIS: paquete nuevo del renderer de formularios bajo `packages/` [verificar nombre en Discovery] y su build/release.
- `src/growth-forms-renderer/` (se reduce a contrato/compatibilidad o se retira según el Slice 3)
- `scripts/build-growth-forms-renderer.mjs`
- `src/lib/growth/forms/contracts.ts` (sólo la prueba de paridad cross-repo, no el schema)
- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md` (enmienda)
- `docs/architecture/GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md` (delta)

## Current Repo State

### Already exists

- Renderer portable en Greenhouse: `src/growth-forms-renderer/` (`element.ts`, `renderer.ts`, `styles.ts`, `contract.ts`,
  `copy.ts`, `telemetry.ts`, `turnstile.ts`, `validation.ts`, `input-behavior-adapter.ts`), 10 suites de tests.
- Build `scripts/build-growth-forms-renderer.mjs` → `public/growth-forms/renderer-<channel>.js` + alias `renderer-latest.js`
  (gitignored; se genera en el `prebuild` de Greenhouse y se sirve desde `greenhouse.efeoncepro.com`).
- Adaptador opt-in de AXIS (`inputBehaviors`, `createAxisGrowthInputFactory`) y verificador `scripts/verify-growth-axis-inputs.mjs`.
- AXIS: primitives Forms (`packages/primitives/src/forms*.ts`), contratos y release de paquetes propios.
- Commit `ab622e958`: `radio` como tarjetas en cualquier estilo, enlace de privacidad legible, íconos SVG de etiqueta.
- Script `scripts/growth/activate-creative-diagnostic-two-step.ts` con guarda de release del renderer.

### Gap

- No hay paquete del renderer en AXIS ni build/release que lo produzca.
- La paridad de contrato es intra-repo; falta su versión cross-repo.
- El ADR V2 del Embed Runtime declara la fuente en Greenhouse.
- No hay ruta de publicación del renderer que no pase por el release de Greenhouse.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `src/growth-forms-renderer + scripts/build-growth-forms-renderer.mjs (Greenhouse prebuild)`
- Future candidate home: `ui-package`
- Boundary: `renderer de presentación en AXIS; render contract, submit API, consentimiento autoritativo, destinos y medición en Greenhouse`
- Server/browser split: `el paquete AXIS completo es browser-only; validación autoritativa, Turnstile verify, ledger y PII cifrada server-side en Greenhouse`
- Build impact: `el prebuild de Greenhouse deja de producir el renderer estable; AXIS añade un build de bundle IIFE/ESM`
- Extraction blocker: `paridad cross-repo del render contract y la ventana de compatibilidad .ghf-* con los hosts`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `fuente del renderer estable; la verdad de envíos no cambia`
- Consumidores afectados: `WordPress (eo-elementor-widgets), Think/Astro (tres docks), CTA (TASK-1518), preview interno de Greenhouse`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `render contract + API pública de Growth Forms + API del custom element <greenhouse-form>`
- Contrato nuevo o modificado: `paquete del renderer en AXIS + prueba de paridad cross-repo del render contract`
- Backward compatibility: `misma API del custom element y clases .ghf-*; shim del URL legacy por TASK-1517`
- Full API parity: `sin cambio; el renderer sigue siendo cliente de la API pública`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna migration`
- Invariantes que no se pueden romper:
  - `el envío aceptado server-side es la única verdad de conversión`
  - `consentimiento, Turnstile y origen se revalidan server-side`
  - `el renderer nunca emite PII al dataLayer ni a logs`
  - `formGuid de HubSpot y mappings nunca llegan al navegador`
- Tenant/space boundary: `form_host_surface + allowlist de orígenes vigentes`
- Idempotency/concurrency: `idempotencia de envíos intacta; promoción serializada por EPIC-035`
- Audit/outbox/history: `recibo de release con SHA de AXIS y digest del bundle`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `shadow` — el bundle de AXIS se publica en paralelo y se compara contra el de Greenhouse antes del corte
- Backfill plan: `ninguno; no hay datos que mover`
- Rollback path: `volver el alias estable al último release de Greenhouse; luego a la versión previa de AXIS`
- External coordination: `release de AXIS, promoción por EPIC-035, despliegues WordPress/Think`

### Security and access

- Auth/access gate: `superficie pública: origen, Turnstile y rate limits vigentes`
- Sensitive data posture: `PII sólo en la API de envío y el ledger; nunca en el bundle, recibos ni telemetría`
- Error contract: `errores canónicos de Growth Forms; sin detalle crudo de proveedor`
- Abuse/rate-limit posture: `sin relajar captcha, origen ni rate limits`

### Runtime evidence

- Local checks: `suites del renderer portadas en AXIS + paridad cross-repo del contrato + tests de Greenhouse`
- DB/runtime checks: `readback sanitizado de un envío aceptado por formulario aprobado`
- Integration checks: `envío válido/inválido en WordPress y Think con el bundle de AXIS; Turnstile y CORS negativos`
- Reliability signals/logs: `señales actuales de carga/envío/entrega + tráfico del URL legacy`
- Production verification sequence: `shadow → paridad de píxeles → envío controlado → corte → simulacro de rollback`

### Acceptance criteria additions

- [ ] Paridad de contrato cross-repo probada en CI de ambos repos.
- [ ] Invariantes de envío, consentimiento y abuso verificados en hosts reales con el bundle de AXIS.
- [ ] Rollback al release previo ensayado.

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

### Slice 1 — Enmienda de arquitectura

- Enmendar `GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md`: para Forms, la fuente del renderer es AXIS y el
  delivery plane de EPIC-035 publica desde el release de AXIS; Greenhouse conserva contrato, API y servidor.
- Delta en `GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md` y en `DECISIONS_INDEX.md`.
- Revisar con `arch-architect` el límite cliente/servidor y la paridad cross-repo antes de escribir código.

### Slice 2 — Paquete del renderer en AXIS

- Portar `src/growth-forms-renderer/` (desde la línea base `ab622e958`) a un paquete de AXIS con build de bundle y sus
  tests; los estilos pasan a usar tokens y primitives Forms de AXIS donde ya existen, sin cambio visual no aprobado.
- Prueba de paridad del render contract entre `src/lib/growth/forms/contracts.ts` y el paquete, en CI de ambos repos.

### Slice 3 — Greenhouse consume el paquete

- El preview interno de Greenhouse y `scripts/build-growth-forms-renderer.mjs` consumen la versión exacta publicada del
  paquete; `src/growth-forms-renderer/` queda reducido a compatibilidad o se retira.
- Paridad de píxeles del bundle AXIS contra el actual en los formularios publicados (AEO, Contacto, diagnóstico creativo, Careers).

### Slice 4 — Publicación independiente

- Con TASK-1514/1515 cerradas, el carril de EPIC-035 promueve el bundle desde el release de AXIS (build-once, recibo
  con SHA de AXIS, rollback). TASK-1517 ejecuta el corte de hosts con esta fuente.
- Publicar el formulario de diagnóstico en dos pasos (`activate-creative-diagnostic-two-step.ts --apply`) y revincular
  su política publicitaria, si no se hizo antes con un release de Greenhouse.

## Out of Scope

- Mover a AXIS la validación autoritativa, Turnstile verify, cifrado de PII, destinos HubSpot o el matching publicitario.
- Elegir el delivery plane o construir la promoción (TASK-1515 / TASK-1514).
- Cortar los hosts al loader neutral (TASK-1517) y migrar CTAs (TASK-1518).
- Rediseñar formularios fuera de lo ya aprobado el 2026-10-15.
- Migrar Meetings.

## Detailed Spec

Línea base visual aprobada: canvas «Formulario.dc.html» del artifact de la landing Agencia Creativa (2026-10-15) y la
vista previa del renderer local sobre `/agencia-creativa-v2/` registrada en
`docs/architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md`. El CSS de host del módulo `diagnostico`
(`scripts/public-website/creativa-source/host.css`) ya está publicado y es compatible hacia adelante: pinta tarjetas y
píldoras en cuanto el formulario publique campos `radio`.

La guarda de release de `activate-creative-diagnostic-two-step.ts` busca en el bundle de producción el selector
`.ghf-root:not([data-ghf-style-variant="hubspot_pillar"]) label.ghf-choice`. Si el port cambia ese CSS, actualizar el
marcador del script en el mismo cambio o la publicación quedará bloqueada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (enmienda) → Slice 2 (paquete AXIS) → Slice 3 (consumo en Greenhouse + paridad de píxeles) → Slice 4.
- Slice 4 no corre sin TASK-1514 y TASK-1515 cerradas y sin paridad de píxeles verde del Slice 3.
- Ningún host cambia de URL en esta task fuera del corte que ejecuta TASK-1517.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El contrato del navegador diverge del servidor entre repos | release | medium | prueba de paridad en CI de ambos repos | test de paridad rojo |
| Cambio visual no aprobado en hosts que estilan `.ghf-*` | UI | medium | paridad de píxeles por formulario publicado + matriz de TASK-1517 | diff visual en el gate |
| Pérdida de envíos o del consentimiento tras el corte | release | low | shadow + envío controlado + rollback ensayado | señales de envío/entrega existentes |
| Telemetría o PII filtrada en el bundle nuevo | data | low | allowlist `gh_form_*` portada con sus tests | test de telemetría rojo |
| Turnstile/CORS relajados para servir desde otro origen | release | low | sin cambio de política; pruebas negativas por host | rechazos de captcha/origen |

### Feature flags / cutover

- Sin flag nuevo: el corte es el alias estable que promueve EPIC-035. Mientras tanto Greenhouse sigue sirviendo
  `renderer-latest.js` como hoy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir la enmienda del ADR | minutos | si |
| Slice 2 | sin consumidores todavía; no se publica el paquete | inmediato | si |
| Slice 3 | volver `scripts/build-growth-forms-renderer.mjs` a la fuente local | un release de Greenhouse | si |
| Slice 4 | promover el release anterior por el carril de EPIC-035 | según TASK-1515 | si |

### Production verification sequence

1. Paridad de contrato y suites del renderer verdes en AXIS y Greenhouse.
2. Bundle de AXIS en shadow; paridad de píxeles contra producción por formulario publicado.
3. Envío controlado en WordPress y Think con el bundle de AXIS; readback sanitizado del envío aceptado.
4. Corte por TASK-1517; observar señales de envío y entrega; simulacro de rollback.

### Out-of-band coordination required

- Release del paquete en AXIS y aprobación de la promoción de EPIC-035.
- Despliegues de WordPress y Think los coordina TASK-1517.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El ADR V2 del Embed Runtime declara AXIS como fuente del renderer de Forms y `DECISIONS_INDEX.md` lo refleja.
- [ ] Existe un paquete del renderer en AXIS con sus tests y un build de bundle reproducible.
- [ ] La paridad del render contract corre en CI de AXIS y de Greenhouse y falla ante una divergencia.
- [ ] El build de Greenhouse consume la versión exacta publicada del paquete, no una copia local del código.
- [ ] La paridad de píxeles del bundle AXIS pasa para AEO, Contacto, diagnóstico creativo y Careers, salvo los cambios aprobados el 2026-10-15.
- [ ] Un cambio visual del renderer se publica sin release de Greenhouse (evidencia: recibo de promoción con SHA de AXIS).
- [x] El formulario `efeonce-creative-diagnostic` corre en dos pasos en `/agencia-creativa/` y `/agencia-creativa-v2/`, con la política publicitaria revinculada a su versión.
- [ ] Ningún test de telemetría ni de PII se relaja en el port.

## Verification

- `pnpm vitest run src/growth-forms-renderer src/lib/growth/forms`
- Suites del paquete en AXIS y su gate de CI
- `pnpm local:check`
- `pnpm public-website:verify-aeo-live-contract`
- Paridad de píxeles por formulario publicado y envío controlado en WordPress y Think

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] skill `greenhouse-growth-forms` (espejos `.claude` y `.codex`) describe dónde vive el renderer y cómo se publica

## Follow-ups

- Adoptar `inputBehaviors` contra el paquete publicado (decisión `GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1`).
- Evaluar el mismo traslado para el renderer de CTAs dentro de TASK-1518.

## Open Questions

- Nombre y forma del paquete en AXIS (paquete propio o subpath de `primitives`); se decide en el Slice 1 con `arch-architect`.
- Si el formulario de diagnóstico en dos pasos sale antes con un release de Greenhouse, el Slice 4 sólo verifica.
