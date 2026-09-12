# TASK-1874 — Application 360: aviso de enlace no legible en «Perfil del candidato» (consumer de TASK-1873)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `copy`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1874-application-360-discarded-link-notice.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseño — wireframe y copy propuestos; sin JSX; bloqueada hasta que TASK-1873 exponga intakeWarnings`
- Rank: `TBD`
- Domain: `hr|ui`
- Blocked by: `TASK-1873`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Application 360 (tab Resumen) muestra en la tarjeta «Perfil del candidato» un aviso informativo cuando la postulación
trae `intakeWarnings` con `url_discarded`: «Envió un enlace de LinkedIn/portafolio que no pudimos leer; pídelo en el
primer contacto». El bloque «Portafolio y enlaces» deja de decir «Sin enlaces públicos informados» cuando el candidato
sí informó uno ilegible. Consume el contrato de lectura `HiringApplication.intakeWarnings` que entrega `TASK-1873`; copy
en `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`; `Alert info` reutilizado, sin primitive nueva ni cambio de
layout fuera de la tarjeta.

## Why This Task Exists

- Desde `ISSUE-172` el intake descarta en silencio un enlace ilegible y la postulación sigue; el reclutador lee «Sin
  enlaces públicos informados» y no pide el enlace en el primer contacto porque cree que no existió. La revisión de
  dominio (talento) del 2026-09-12 lo marcó como follow-up importante: Application 360 debe decirlo.
- El dato correcto (hecho «informó y no pudimos leerlo», sin el raw) lo aporta `TASK-1873`; sin superficie visible el
  contrato no cambia ninguna decisión humana.
- El copy visible del bloque de enlaces es hoy un literal en JSX (`Application360View.tsx` L1059) sin test; al tocarlo
  se tokeniza (regla `no-untokenized-copy`, touch-it/fix-it).

## Goal

- El aviso aparece sólo con `intakeWarnings` de tipo `url_discarded`, con el copy correcto para LinkedIn, portafolio o
  ambos; sin warnings la tarjeta queda idéntica a hoy.
- El empty state de «Portafolio y enlaces» distingue «no informó» de «informó y no pudimos leerlo».
- Copy en los dos diccionarios de Hiring Desk con paridad de claves; ningún literal nuevo en JSX.
- Evidencia GVC desktop + 390 px con el aviso real y scorecard registrado; `pnpm ui:code-lint` y
  `design-contract:lint` verdes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` — contrato de lectura de la postulación y privacidad.
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` y `docs/architecture/ui-platform/README.md` —
  primitives, densidad adaptable, un solo momento visual dominante.
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md` — Real-Artifact loop para features visuales.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` — card-on-card es `BLOCK`; scorecard mínimo.
- `DESIGN.md`

Reglas obligatorias:

- **NUNCA** renderizar ni interpolar el enlace crudo: no existe en el contrato (`TASK-1873` persiste sólo
  `{ code, field }`) y no debe reconstruirse desde ningún otro origen.
- **NUNCA** un botón o acción en el aviso: no hay acción in-app posible; la acción real es pedir el enlace en el primer
  contacto.
- **NUNCA** una segunda tarjeta dentro de «Perfil del candidato» (card-on-card = `BLOCK`); el aviso es una fila más.
- **NUNCA** un literal de copy en JSX: todo va a `application.*` de los diccionarios es-CL y en-US, validado con
  `greenhouse-ux-writing`.
- **SIEMPRE** derivar el render de `item.application.intakeWarnings`, nunca de `linkedinUrl === null`.
- **SIEMPRE** capturar y mirar desktop + 390 px antes de cerrar (Real-Artifact loop) y comparar contra el baseline
  `hiring-application-360-v1`.

## Normative Docs

- `docs/ui/wireframes/TASK-1874-application-360-discarded-link-notice.md` — contrato de esta superficie (regiones,
  estados, copy ledger, mapping, plan GVC, decision log).
- `docs/ui/wireframes/TASK-1688-careers-application-contact-completeness.md` — baseline de la tarjeta y del bloque
  «Portafolio y enlaces».
- `docs/issues/resolved/ISSUE-172-talent-pool-public-id-lpad-truncation-collision.md` — §Follow-ups de la revisión de
  dominio (origen del aviso).
- `docs/manual-de-uso/hr/operar-hiring-desk.md` y `docs/documentation/hr/hiring-desk.md` — reciben el delta funcional.
- `.claude/skills/greenhouse-ux-writing/SKILL.md` — validación del copy.

## Dependencies & Impact

### Depends on

- `TASK-1873` (`HiringApplication.intakeWarnings`, `HiringIntakeWarning`, códigos cerrados) — bloqueante.
- `src/views/greenhouse/hiring/Application360View.tsx`: `CandidateContextCard` (L200-247) y bloque «Portafolio y
  enlaces» (L1054-1060).
- `src/lib/copy/dictionaries/es-CL/hiringDesk.ts` (namespace `application.*`, L118+) y `en-US/hiringDesk.ts` (L98+),
  con `src/lib/copy/hiring-desk-stage-locale-parity.test.ts` como guardia de paridad.
- `src/types/hiring.ts` (`HiringDeskApplicationSummary` L413; el campo viaja en `application`).
- GVC: `scripts/frontend/scenarios/task355-hiring-application-360.scenario.ts` (baseline) y `pnpm fe:capture`.

### Blocks / Impacts

- `docs/manual-de-uso/hr/operar-hiring-desk.md` y `docs/documentation/hr/hiring-desk.md`: qué significa el aviso y qué
  hacer.
- `TASK-1733` (People 360 longitudinal, `to-do`): recibe `## Delta` con las claves de copy por si decide mostrar el
  mismo hecho.
- Ninguna otra superficie cambia.

### Files owned

- `src/views/greenhouse/hiring/Application360View.tsx` (sólo `CandidateContextCard` y el bloque «Portafolio y enlaces»)
- `src/views/greenhouse/hiring/application-intake-warning.test.tsx` (nuevo)
- `src/lib/copy/dictionaries/es-CL/hiringDesk.ts`, `src/lib/copy/dictionaries/en-US/hiringDesk.ts`
- `scripts/frontend/scenarios/task1874-application-intake-warning.scenario.ts` (nuevo)
- `docs/ui/wireframes/TASK-1874-application-360-discarded-link-notice.md`
- `docs/ui/reviews/TASK-1874-application-360-discarded-link-notice.scorecard.json` (al cerrar)
- `docs/manual-de-uso/hr/operar-hiring-desk.md`, `docs/documentation/hr/hiring-desk.md` (delta)

## Current Repo State

### Already exists

- `CandidateContextCard` (`Application360View.tsx` L200-247): `Paper outlined` + `Stack` con filas etiqueta/valor
  (vacante, fuente, postulación, email enmascarado, teléfono, país) y el bloque condicional «Mensaje del candidato»
  (`data-capture='application-candidate-message'`), separado por `borderBlockStart` + `pt: 2.25`. Usa
  `useContainerDensity('auto')` y `isCardDensityAtLeast(density, 'condensed')`.
- Bloque «Portafolio y enlaces» (L1054-1060): botones `Portafolio`/`LinkedIn` si hay url; literal «Sin enlaces públicos
  informados.» si no hay ninguna.
- `Alert severity='info'` en el mismo overview (L1036) como patrón de aviso explicativo.
- Diccionarios `application.*` con `notProvided`, `candidateMessageTitle`, `phoneLabel`, `residenceCountryLabel`;
  en-US redefine por spread + claves propias; test de paridad de locales.
- GVC baseline `task355-hiring-application-360` con `readiness` sobre `[data-capture="hiring-application"]`,
  rubric enterprise y viewports 1440/390.
- Icono `tabler-link-off` ya usado en el portal (6 ocurrencias).

### Gap

- Ningún render del hecho «informó y no pudimos leerlo»; el empty state miente cuando hay un enlace descartado.
- Sin claves de copy para el aviso; el literal del empty state no está tokenizado.
- Sin test de la tarjeta para estos estados; sin escenario GVC focal.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/views/greenhouse/hiring/Application360View.tsx` (portal interno, ruta `/agency/hiring/applications/{applicationId}`) y diccionarios de copy en `src/lib/copy/dictionaries/**`
- Future candidate home: `portal`
- Boundary: la vista consume `HiringDeskApplicationSummary.application.intakeWarnings` entregado por el page server (`getHiringApplicationById` + `getHiringDeskSnapshot`); no hay reader ni command nuevo; el helper de copy es una función pura sin IO
- Server/browser split: el view model llega resuelto desde el page server; el Client Component sólo renderiza copy y no importa stores, DB ni secretos
- Build impact: none — sin dependencias nuevas
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite`
- Usuario / rol: reclutador / hiring manager / People Ops con `hiring.application.read`.
- Momento del flujo: lectura de la Application 360 (tab Resumen) antes del primer contacto.
- Resultado perceptible esperado: el operador sabe que debe pedir el LinkedIn/portafolio porque el candidato lo envió
  y no se pudo leer.
- Friccion que debe reducir: asumir «no tiene enlaces» cuando sí los informó; contactar sin pedir el material.
- No-goals UX: mostrar el enlace crudo; acción in-app; rediseño de la tarjeta; tocar otros tabs.

### Surface & system decision

- Surface: tarjeta «Perfil del candidato» (`data-capture='application-contact-summary'`) + bloque «Portafolio y
  enlaces» en el overview de Application 360.
- Nav placement: `none` — no agrega destino.
- Composition Shell: `no aplica` — cambio de copy dentro de una tarjeta existente.
- Primitive decision: `reuse` — MUI `Alert` (`severity='info'`, `variant='outlined'`, `role='status'`) + `AlertTitle`
  + icono `tabler-link-off`; `Typography body2` para el empty state.
- Adaptive density / The Seam: `aplica` — hereda `useContainerDensity('auto')` de la tarjeta; el aviso no fija anchos.
- Floating/Sidecar/Dialog decision: ninguno.
- Copy source: `src/lib/copy/dictionaries/es-CL/hiringDesk.ts` + `en-US/hiringDesk.ts` (`application.*`).
- Access impact: `none`.

### State inventory

- Default: sin warnings → tarjeta idéntica a hoy; con warnings → aviso + empty state coherente (tabla en el wireframe).
- Loading: no aplica (server-rendered; sin skeleton nuevo).
- Empty: «Sin enlaces públicos informados.» sólo cuando no hay urls NI warnings.
- Error: comportamiento de página existente; sin cambio.
- Degraded / partial: warnings con código desconocido no llegan (los filtra el reader); nada que degradar.
- Permission denied: guard de página existente (`/401`).
- Long content: copy fijo y corto; `overflowWrap: 'anywhere'`.
- Mobile / compact: una columna; aviso a ancho completo; icono visible.
- Keyboard / focus: sin elementos interactivos nuevos; orden de tabulación intacto.
- Reduced motion: no se agrega animación; el `Alert` no anima.

### Interaction contract

- Primary interaction: ninguna (lectura).
- Hover / focus / active: no aplica.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: aviso estático `role='status'`; no se auto-cierra ni se descarta.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: sin animación de entrada; el aviso viene con el render inicial.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: no aplica.
- Reduced-motion fallback: idéntico (no hay animación que reducir).
- Non-goal motion: cualquier realce animado del aviso.

### Implementation mapping

- Route / surface: `/agency/hiring/applications/[applicationId]?tab=overview` → `CandidateContextCard` + bloque
  «Portafolio y enlaces».
- Primitive / variant / kind: MUI `Alert` `severity='info'` `variant='outlined'` + `AlertTitle`; `Typography body2`.
- Component candidates: `CandidateContextCard` (modificado); helper puro `resolveIntakeWarningCopy(warnings, copy)`.
- Copy source: `application.intakeWarningTitle`, `intakeWarningLinkedin`, `intakeWarningPortfolio`,
  `intakeWarningBoth`, `linksNotReadable`, `noPublicLinks` (es-CL + en-US).
- Data reader / command: `getHiringApplicationById` → `HiringApplication.intakeWarnings` (`TASK-1873`); sin command.
- API parity: sólo lectura; el hecho ya está en el contrato canónico de la postulación.
- Access / capability: `gestion.hiring_application_detail` + `hiring.application.read` (sin cambio).
- States to implement: los 5 estados con warnings + default sin warnings (tabla del wireframe).

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1874-application-intake-warning.scenario.ts`.
- Route: Application 360 de una postulación de prueba con `intake_warnings` no vacío (vacante de prueba con
  `data_origin` no real; nunca una persona real).
- Viewports: 1440×900 y 390×844.
- Quality profile: `premium`.
- Required steps: `press Escape`, `sleep 1000`, `mark application-overview`, `mark application-intake-warning`
  (clip), `mark application-links-empty` (clip del bloque de enlaces).
- Required captures: overview desktop + mobile; aviso recortado; bloque de enlaces recortado.
- Required `data-capture` markers: `application-contact-summary` (existente), `application-intake-warning` (nuevo),
  `application-public-links` (nuevo).
- Assertions: `noLoginRedirect`, `noErrorBoundary`, sin errores de consola, layout sin scroll horizontal, rubric
  enterprise sobre `[data-capture="hiring-application"]`.
- Scroll-width checks: `scrollWidth === clientWidth` en página y tarjeta, ambos viewports.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` idéntica; recorrido con Tab sin cambios.
- Review dossier: `.captures/<ISO>_task1874-application-intake-warning/` + `pnpm fe:capture:review`.
- Baseline decision / surface ID: `hiring-application-360-v1` (dossier `TASK-1688`); sólo el delta del aviso y del
  empty state.

### Design decision log

- Decision: aviso informativo como fila de «Perfil del candidato» + empty state coherente en «Portafolio y enlaces»;
  sin botón.
- Alternatives considered: sólo cambiar el empty state (queda fuera de la lectura de contacto); chip de estado
  (suena a defecto del candidato, no cabe en móvil); mostrar el raw (prohibido por contrato).
- Why this pattern: el `Alert info outlined` ya es el vocabulario del overview para explicar una ausencia; una fila
  más mantiene un solo momento visual dominante.
- Reuse / extend / new primitive: `reuse`.
- Open risks: `AlertTitle` nuevo en la desk; si en revisión hace ruido, dejar sólo el cuerpo.

### Visual verification

- GVC scenario: `task1874-application-intake-warning`.
- Viewports: 1440×900 y 390×844.
- Required captures: overview + aviso + bloque de enlaces.
- Required `data-capture` markers: `application-intake-warning`, `application-public-links`, `application-contact-summary`.
- Scroll-width check: página y tarjeta, ambos viewports.
- Accessibility/focus checks: `role='status'`, icono `aria-hidden`, contraste con tokens `info`, orden de Tab intacto.
- Before/after evidence: baseline `task355-hiring-application-360` vs captura focal.
- Known visual debt: los títulos «Perfil del candidato» y «Portafolio y enlaces» siguen como literales en JSX (fuera de
  alcance; se registra).
- Visual scorecard: `docs/ui/reviews/TASK-1874-application-360-discarded-link-notice.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

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

### Slice 1 — Copy

- Seis claves nuevas en `application.*` de `es-CL/hiringDesk.ts` y `en-US/hiringDesk.ts` (tabla del wireframe),
  validadas con `greenhouse-ux-writing`; el literal «Sin enlaces públicos informados.» pasa a `application.noPublicLinks`.
- Helper puro `resolveIntakeWarningCopy(warnings, copy): { title, body } | null` con test de los cuatro casos
  (LinkedIn, portafolio, ambos, ninguno).

### Slice 2 — Render

- `CandidateContextCard`: `Alert` condicional entre las filas de contacto y «Mensaje del candidato», con
  `data-capture='application-intake-warning'`, `role='status'`, icono `tabler-link-off` `aria-hidden`.
- Bloque «Portafolio y enlaces»: `data-capture='application-public-links'`; empty state elige `linksNotReadable` vs
  `noPublicLinks`.
- `application-intake-warning.test.tsx`: los cinco estados con warnings + default sin warnings; asserción de que el
  DOM no contiene ningún texto fuera del diccionario para este bloque.

### Slice 3 — Evidencia y docs

- Escenario GVC focal, capturas 1440/390, `pnpm fe:capture:review`, scorecard; comparación con el baseline.
- Delta en `docs/manual-de-uso/hr/operar-hiring-desk.md` y `docs/documentation/hr/hiring-desk.md`; `## Delta` en
  `TASK-1733`; `UI ready` a `yes` sólo si `pnpm task:lint --task TASK-1874` queda sin hallazgos.

## Out of Scope

- Cualquier cambio en el contrato de datos (`TASK-1873`).
- Mostrar el enlace crudo o permitir corregirlo desde el portal (`TASK-1729`).
- Tokenizar los títulos «Perfil del candidato» y «Portafolio y enlaces» (deuda registrada, otra pasada).
- Otros tabs, People 360, packet MCP, correos al candidato.

## Detailed Spec

- Render en `CandidateContextCard`:

```tsx
const warningCopy = resolveIntakeWarningCopy(item.application.intakeWarnings, copy.application)

{warningCopy ? (
  <Alert
    severity='info'
    variant='outlined'
    role='status'
    icon={<i aria-hidden='true' className='tabler-link-off' />}
    data-capture='application-intake-warning'
    sx={{ mt: 2.25 }}
  >
    <AlertTitle>{warningCopy.title}</AlertTitle>
    {warningCopy.body}
  </Alert>
) : null}
```

- `resolveIntakeWarningCopy`: filtra `code === 'url_discarded'`; con `linkedinUrl` y `portfolioUrl` → `intakeWarningBoth`;
  sólo uno → la clave del campo; vacío → `null`.
- Bloque de enlaces: `!item.portfolioUrl && !item.linkedinUrl` → `hasWarnings ? copy.application.linksNotReadable :
  copy.application.noPublicLinks`.
- Escenario GVC: clonar la cabecera de `task355-hiring-application-360.scenario.ts` (readiness, quality, viewports) con
  `route` apuntando a la postulación de prueba y los tres `mark` del contrato.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (copy) → Slice 2 (render) → Slice 3 (evidencia y docs). Nada se toma hasta que `TASK-1873` esté en `complete/`
  y su columna viva en la instancia: sin datos con warnings no hay artefacto real que capturar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El aviso se dispara por `linkedinUrl === null` en vez de por `intakeWarnings` y aparece en postulaciones sin enlace | UI | low | helper puro con test; regla explícita en Architecture Alignment | captura GVC del caso «sin warnings» idéntica al baseline |
| Literal nuevo en JSX o claves sin paridad en-US | UI / copy | low | `no-untokenized-copy` + `hiring-desk-stage-locale-parity.test.ts` + test del bloque | lint rojo |
| Card-on-card o cambio incidental de layout | UI | low | el aviso es una fila del `Stack`; comparación contra baseline `hiring-application-360-v1` | scorecard < 4 en economía de superficies |

### Feature flags / cutover

- Sin flag — additive UI change, no production runtime impact fuera de la vista; cutover inmediato con el deploy de
  Vercel.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR (claves de copy) | minutos | si |
| Slice 2 | revert del PR + redeploy Vercel | 10 min | si |
| Slice 3 | revert de docs/escenario | minutos | si |

### Production verification sequence

1. `TASK-1873` completa y verificada en la instancia.
2. Localhost (`pnpm dev`) con la postulación de prueba: URL exacta entregada al operador antes de pedir push.
3. GVC 1440/390 + review + scorecard; comparación contra baseline.
4. Push a `develop` → staging (misma base): captura de la misma postulación con persona agente.
5. Release por el control plane; smoke de la ruta.

### Out-of-band coordination required

- Ninguna fuera del repo; la postulación de prueba se crea por la ruta pública sobre una vacante de prueba con
  `data_origin` no real, nunca sobre una persona real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux`, `UI impact: copy` y el wireframe existe en `docs/ui/wireframes/`.
- [ ] `UI ready` permanece `no` hasta completar mapping, plan GVC y decision log en el contrato y el wireframe; si pasa
      a `yes`, `pnpm task:lint --task TASK-1874` queda sin hallazgos.
- [ ] Las seis claves de copy existen en es-CL y en-US; `hiring-desk-stage-locale-parity.test.ts` y
      `no-untokenized-copy` verdes; ningún literal nuevo en JSX.
- [ ] El aviso se renderiza sólo con `intakeWarnings` de tipo `url_discarded`, con el copy correcto para LinkedIn,
      portafolio o ambos (test de los cuatro casos del helper + test del componente).
- [ ] Sin warnings, la tarjeta y el empty state quedan idénticos a hoy (test + captura comparada con baseline).
- [ ] El empty state de «Portafolio y enlaces» dice `linksNotReadable` sólo cuando no hay urls y hay warnings.
- [ ] El DOM del aviso nunca contiene un enlace crudo (no existe en el contrato; asserción en el test).
- [ ] `role='status'`, icono `aria-hidden`, sin elementos interactivos nuevos; orden de Tab intacto.
- [ ] GVC 1440 y 390 capturados y mirados; sin scroll horizontal de página; scorecard con promedio ≥ 4.2, piso ≥ 3 y
      fidelidad/resistencia a template ≥ 4.
- [ ] `design-contract:lint`, `ui:code-lint`, `ui:visual-gate` y `ui:quality` verdes.
- [ ] Manual y doc funcional de Hiring Desk con el delta; `TASK-1733` con `## Delta`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/views/greenhouse/hiring/application-intake-warning.test.tsx src/lib/copy/hiring-desk-stage-locale-parity.test.ts`
- `pnpm dev` + URL localhost exacta de la postulación de prueba
- `pnpm fe:capture task1874-application-intake-warning --env=staging` + `pnpm fe:capture:review`
- `pnpm design:lint`, `pnpm design-contract:lint`, `pnpm ui:code-lint`, `pnpm ui:visual-gate`, `pnpm ui:quality`
- `pnpm local:check:ui`
- `pnpm test` completo + `pnpm build` (autorización del operador: el build consume ~30 GB) antes de mover a `complete/`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Scorecard en `docs/ui/reviews/` y capturas referenciadas en la task
- [ ] `TASK-1733` con `## Delta`

## Follow-ups

- Tokenizar los títulos «Perfil del candidato» y «Portafolio y enlaces» (deuda de copy preexistente).
- Si `TASK-1729` deja al candidato corregir su enlace, el aviso podría enlazar a esa capacidad; no antes.

## Open Questions

- ¿Conservar el `AlertTitle` o dejar sólo el cuerpo? Se decide mirando la captura real (Real-Artifact loop), no antes.
