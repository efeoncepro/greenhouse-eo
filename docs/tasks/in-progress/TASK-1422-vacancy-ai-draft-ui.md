# TASK-1422 — Vacancy AI Draft UI (propose→confirm en el Publication Desk)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1422-vacancy-ai-draft-drawer.md`
- Flow: `docs/ui/flows/TASK-1422-vacancy-ai-draft-flow.md`
- Motion: `docs/ui/motion/TASK-1422-vacancy-ai-draft-motion.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency|hr|ai`
- Blocked by: `none` (TASK-1385 complete — el contrato backend ya existe)
- Branch: `task/TASK-1422-vacancy-ai-draft-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

UI del desk para la redacción asistida del aviso público (TASK-1385): en el **Publication Desk** (`/agency/hiring/publication`), un CTA `✨ Redactar con IA` en la columna pública del diff abre un **drawer propose→confirm** — template opcional → la IA redacta (progreso honesto) → formulario editable prefilled → el humano aplica (confirm vía `hiring.opening.write`) o descarta. El diff se refresca y el publish (acción humana existente) se habilita. Cliente delgado del contrato 1385: **cero endpoints nuevos**.

## Why This Task Exists

TASK-1385 dejó la capability completa pero solo operable por API: el Publication Desk hoy **no tiene ningún formulario de copy público** (el `edit: 'Editar contenido'` del copy nunca se usó) y el publish queda bloqueado por el gate 422 hasta que alguien redacte los `public_*` a mano por API. Esta UI cierra el loop del nodo N-publish del master flow EPIC-011 y convierte la capability en una herramienta que el reclutador usa sin salir del desk.

## Goal

- CTA gated por flag+capability que abre el drawer de borrador IA (o retoma un borrador pendiente del ledger).
- Estados honestos de todo el ciclo: generate → proposing (10–30 s de LLM) → review editable → confirming → applied/discarded, con degradación del provider y errores canónicos es-CL.
- GVC en loop desktop+mobile+reduced-motion hasta nivel enterprise; cero scroll horizontal; a11y AA.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Delta 2026-07-16 TASK-1385 — el contrato que esta UI consume; §Delta TASK-1371 publish estructurado)
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (master flow — esta superficie extiende el nodo N-publish; reglas transversales "IA propone, humano confirma" + es-CL + a11y)
- `docs/ui/wireframes/TASK-355-hiring-desk.md` (contrato de fidelidad del canvas del desk: chrome global intacto, patrón drawer/dialog/toast del desk)
- Reglas: la UI es **cliente delgado** (Full API Parity — la lógica vive en 1385); NO marca Nexa (IA de dominio, frontera 1361 — sparkles neutral como 1363); flag `HIRING_VACANCY_AI_ENABLED` gobierna el propose (CTA disabled+tooltip con flag OFF); el confirm nunca se gatea.

## Normative Docs

- `docs/tasks/complete/TASK-1385-ai-assisted-vacancy-public-copy.md` (contrato backend + endpoints)
- `docs/tasks/complete/TASK-355-hiring-desk.md` [verificar carpeta] (superficie base + patrón visual aprobado)
- `docs/tasks/complete/TASK-1363-assessment-taking-review-surface.md` (precedente UI "IA sugiere · humano confirma": Alert `tabler-sparkles` + confirm flow)

## Dependencies & Impact

### Depends on

- TASK-1385 (complete): `POST /api/hiring/openings/[id]/ai/propose-public-copy` + confirm por kind + tipos.
- TASK-355 (complete): `PublicationDeskView` + `HiringDeskFrame` + copy `hiringDesk`.

### Blocks / Impacts

- Habilita el smoke staging de 1385 desde el desk (hoy solo API) → acelera el flip del flag.
- TASK-354/careers: mejor copy → mejor conversión (indirecto).

### Files owned

- `src/views/greenhouse/hiring/PublicationDeskView.tsx` (CTA + selector de vacante + wiring)
- `src/views/greenhouse/hiring/VacancyAiDraftDrawer.tsx` (nuevo, route-local)
- `src/app/(dashboard)/agency/hiring/publication/page.tsx` (props server: flag + capabilities + pendiente)
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` + type (namespace `publication.vacancyAi`)
- `scripts/frontend/scenarios/task1422-vacancy-ai-draft.yaml` (GVC)
- Docs UI de esta task (wireframe/flow/motion) + delta al master flow EPIC-011

## Current Repo State

### Already exists

- Contrato backend completo (1385): propose flag-gated + ledger kind `opening_public_copy` + confirm con `publicCopyOverride` (capability `hiring.opening.write`) + `GET /api/hiring/openings/[id]`.
- `PublicationDeskView` con diff público↔interno, acciones publish/pause/close, dialog+toast; muestra SOLO `openings[0]` (sin selector — gap que esta task corrige).
- Patrón drawer del desk (DemandDeskView "Nueva demanda") + keyframes `ghHiring*` con guard reduced-motion en `HiringDeskFrame`.
- Precedente visual IA (1363): Alert `tabler-sparkles` "Sugerencia de IA · revísala antes de confirmar" + confirm con spinner.
- Cliente HTTP del dominio `hiringRequest` (`HiringClientError` con message+code es-CL).
- `GET /api/hiring/assessments/templates` (picker) [verificar shape de respuesta en Discovery].

### Gap

- Ningún trigger de propose en UI (Application360 solo consume proposals existentes); ningún formulario de copy público; sin manejo UI del 409 `vacancy_ai_disabled`; sin selector de vacante en Publication.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/views/greenhouse/hiring/** (route-local del desk) + page (dashboard)/agency/hiring/publication`
- Future candidate home: `portal`
- Boundary: la UI consume readers/commands de `src/lib/hiring/**` vía API routes existentes; el drawer NO contiene lógica de negocio (validación mínima de requeridos es UX, el backend re-valida)
- Server/browser split: page server resuelve flag/capabilities/pendiente (server-only config nunca cruza al cliente — solo booleans/props); el drawer es Client Component sin stores/DB/secrets
- Build impact: nulo (sin deps nuevas)
- Extraction blocker: ninguno

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: reclutador/hiring manager interno (tier operador hiring)
- Momento del flujo: opening en borrador con copy público incompleto; publish bloqueado por gate
- Resultado perceptible esperado: en ~1 minuto el diff público pasa de "No informado" a un aviso completo revisado por el humano; publish habilitado
- Friccion que debe reducir: redactar título/resumen/descripción/requisitos desde cero (hoy imposible en UI)
- No-goals UX: publicar; editar verdad interna; simular streaming del texto IA; marca Nexa

### Surface & system decision

- Surface: Publication Desk existente + drawer lateral route-local (sin ruta nueva)
- Composition Shell: `no aplica` — el canvas del desk tiene su frame aprobado (TASK-355, contrato de fidelidad); no se introduce shell paralelo
- Primitive decision: `reuse` — MUI Drawer + `ghHiringDrawer`, `GreenhouseButton`/`GreenhouseChip`, `CustomTextField`/`CustomAutocomplete`/`CustomChip`, Alert `tabler-sparkles` (1363), Skeleton/LinearProgress; `VacancyAiDraftDrawer` es composición one-off del desk, tokenizada, fuera del registry
- Adaptive density / The Seam: `no aplica` — drawer de formulario, no card de datos
- Floating/Sidecar/Dialog decision: drawer right 480px desktop / fullWidth mobile + Dialog de descarte (patrón desk)
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` → `publication.vacancyAi.*` (nuevo namespace tipado)
- Access impact: `none` (viewCode y capabilities existentes; la UI solo decide affordances con props server)

### State inventory

- Default: CTA `Redactar con IA` en columna pública; si hay proposal `proposed` en el ledger → `Revisar borrador pendiente`
- Loading: paso `proposing` (LinearProgress + skeleton shape-of-form + `role=status`); spinner en botones al confirmar/rechazar
- Empty: sin openings → estado existente `noOpening`; sin templates → picker vacío con placeholder
- Error: Alert error es-CL (HiringClientError) dentro del drawer; el form CONSERVA lo editado; 409 `vacancy_ai_disabled` post-load manejado
- Degraded / partial: provider `not_configured|provider_error|schema_invalid` → Alert warning `degraded` + Reintentar (NUNCA se finge éxito)
- Permission denied: sin `hiring.opening.ai_assist` → CTA no se renderiza; sin `hiring.opening.write` → Aplicar disabled con tooltip
- Long content: descripción/requisitos multiline con scroll interno del drawer; textos clampados en el diff (existente)
- Mobile / compact: drawer fullWidth; columnas del diff apiladas (existente); CTA full-width
- Keyboard / focus: foco inicial al primer control del paso; Esc cierra (no en confirming); foco restaurado al CTA
- Reduced motion: guard existente `ghHiring*`; skeleton sin shimmer; swaps instantáneos

### Interaction contract

- Primary interaction: CTA → drawer → (template? → Generar) → revisar/editar → Aplicar
- Hover / focus / active: theme MUI/Vuexy estándar; focus rings instantáneos
- Pending / disabled: Generar/Aplicar con spinner leadingIcon + disabled (patrón desk); CTA disabled+tooltip con flag OFF
- Escape / click-away: cierran en generate/review/degraded; bloqueados en confirming/rejecting
- Focus restore: al CTA de origen
- Latency feedback: `proposing` honesto (copy + progreso + skeleton); "Seguir en segundo plano" documenta que el borrador quedará pendiente
- Toast / alert behavior: Snackbar existente para applied/discarded; Alerts inline para errores (persistentes)

### Motion & microinteractions

- Motion primitive: `CSS` (keyframes route-local `ghHiring*` existentes + transiciones MUI)
- Enter / exit: drawer `ghHiringDrawer` in / MUI leave; dialog `ghHiringPop`+`ghHiringFade`
- Layout morph: ninguno
- Stagger: ninguno (revelación del review en una sola pasada `ghHiringUp`)
- Timing / easing token: escala del frame (160–340 ms, curva emphasized del desk)
- Reduced-motion fallback: guard existente; significado preservado por progreso semántico + copy
- Non-goal motion: typing effect, sparkles animados, pulsos en el CTA pendiente

### Implementation mapping

- Route / surface: `/agency/hiring/publication` (page existente) + `PublicationDeskView` + `VacancyAiDraftDrawer` (nuevo client component route-local)
- Primitive / variant / kind: `GreenhouseButton kind='secondaryAction'` (CTA) / `kind='primaryAction'` (Generar/Aplicar); `GreenhouseChip` estado pendiente; sin kinds nuevos
- Component candidates: MUI Drawer/Dialog/Snackbar/Alert/Skeleton/LinearProgress; `CustomTextField`/`CustomAutocomplete`/`CustomChip`
- Copy source: `getMicrocopy(locale).hiringDesk.publication.vacancyAi` (es-CL + en-US + type)
- Data reader / command: server props = `isHiringVacancyAiEnabled()` + `can(ai_assist)` + `can(opening.write)` + `listAiProposals({kind:'opening_public_copy',status:'proposed'})`; client = `hiringRequest` → propose / confirm(`publicCopyOverride`) / reject / `GET openings/[id]` / `GET assessments/templates` / `GET proposals?...` (re-resolver al cambiar vacante)
- API parity: cero endpoints nuevos — cliente delgado del contrato 1385
- Access / capability: viewCode `gestion.hiring_publication` (existente); `hiring.opening.ai_assist` (propose) + `hiring.opening.write` (confirm) re-enforzadas server-side
- States to implement: los 10 del State inventory + máquina del flow doc (closed/generate/proposing/review/dirty/confirming/applied/rejecting/degraded/error)

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1422-vacancy-ai-draft.yaml`
- Route: `/agency/hiring/publication` (dev local, `HIRING_VACANCY_AI_ENABLED=true`, proposal `proposed` sembrada para review determinista — sin LLM en captura)
- Viewports: 1440×900 + 390×844
- Required steps: base con CTA → abrir drawer review → editar campo → dialog descarte → cerrar (foco restaurado) → variante generate → mobile → re-run reduced-motion
- Required captures: `base-diff-with-cta` · `drawer-review` · `drawer-generate` · `drawer-discard-dialog` · `mobile-drawer` · `reduced-motion`
- Required `data-capture` markers: `hiring-vacancy-ai-cta` · `hiring-vacancy-ai-drawer` · `hiring-publication-diff`
- Assertions: consola limpia; CTA visible flag ON; form prefilled; foco correcto
- Scroll-width checks: `scrollWidth==clientWidth` base y drawer, 1440 + 390
- Reduced-motion / focus evidence: captura dedicada reduce + frames del ciclo de foco

### Design decision log

- Decision: drawer route-local espejo de "Nueva demanda" + lenguaje IA de 1363; CTA vive en la columna pública del diff (dueño semántico de lo que redacta)
- Alternatives considered: edición inline del diff (rompe la claridad anti-leak); página dedicada (sobre-navegación); modal (form largo); `<Motion>` GSAP global (mezcla de motores en el canvas del desk)
- Why this pattern: cero vocabulario visual nuevo; el usuario ya conoce drawer+dialog+toast del desk y el patrón "IA sugiere · tú confirmas" de 1363
- Reuse / extend / new primitive: reuse total; `VacancyAiDraftDrawer` = one-off tokenizado del desk
- Open risks: latencia LLM (mitigada: progreso honesto + segundo plano + pendiente persistente); carrera multi-operador (terminal-once del backend + mensaje claro); guard reduced-motion del skeleton (verificar en GVC)

### Visual verification

- GVC scenario: `task1422-vacancy-ai-draft`
- Viewports: 1440×900 + 390×844
- Required captures: las 6 del plan
- Required `data-capture` markers: los 3 declarados
- Scroll-width check: sí (base + drawer, ambos viewports)
- Accessibility/focus checks: foco inicial/Esc/restore + tooltip accesible del CTA locked
- Before/after evidence: `pnpm fe:capture:diff` contra captura base del Publication Desk actual
- Known visual debt: la vista sigue mostrando 1 vacante activa a la vez (el selector la cambia, no hay lista); aceptado — rediseño de Publication a lista es otra task

## Capability Definition of Done — Full API Parity gate

- [ ] La UI no implementa lógica de negocio: propose/confirm/reject viven en el contrato 1385 (cero endpoints nuevos).
- [ ] Affordances gated por capability resueltas server-side; el backend re-enforza.
- [ ] Parity check = SÍ (esta task ES el consumer UI del primitive; Nexa opera el mismo contrato).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION LOG (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Copy + props server + selector de vacante

Namespace `publication.vacancyAi` en dictionaries es-CL/en-US + type `HiringDeskCopy`; page server resuelve `vacancyAi` props (flag, capabilities, pendiente por opening); selector de vacante (`CustomAutocomplete`) en el header card cuando hay >1 opening.

### Slice 2 — `VacancyAiDraftDrawer` + wiring

Client component con la máquina de estados del flow doc (generate/proposing/review/confirming + degraded/error), template picker lazy, form editable prefilled, confirm/reject vía `hiringRequest`, refetch del opening, CTA en la columna pública con variantes ready/locked/pending.

### Slice 3 — GVC loop + a11y + cierre

Scenario `task1422-vacancy-ai-draft` + seed de proposal para captura determinista; **loop capturar→mirar→ajustar→re-capturar hasta enterprise** (desktop+mobile+reduced-motion); checks scroll-width/foco/consola; docs (delta master flow EPIC-011 + manual de uso) + gates.

## Out of Scope

- Publicación automática o cambios al publish flow existente.
- Edición manual del copy público sin IA (form directo al PATCH) — follow-up.
- Rediseño del Publication Desk a lista de openings.
- Polling automático del borrador en segundo plano (V1 = re-resolver al recargar/reabrir).
- Nexa actionKey (follow-up de 1385).
- Traducción en-US del AVISO generado (la UI sí es bilingüe; el aviso es es-CL).

## Detailed Spec

Implementar DESDE los tres docs UI (wireframe/flow/motion) — son el contrato de diseño; no re-decidir arquitectura. Máquina de estados y failure paths exactos en el flow doc. Copy ledger completo en el wireframe (validado con `greenhouse-ux-writing`). El drawer replica el patrón visual del drawer "Nueva demanda" y el Alert IA de 1363. El page server pasa SOLO booleans/props (nunca el config server-only). La validación de requeridos (título/resumen/descripción) es UX onBlur; el backend re-valida en el confirm (`vacancy_ai_incomplete_copy`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

S1 (copy/props/selector) → S2 (drawer) → S3 (GVC loop + cierre). El CTA queda oculto sin capability y disabled sin flag — la UI puede mergear con el flag OFF sin efecto visible para quien no tiene la capability.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| UI promete IA con flag OFF | UX/confianza | Media | locked state honesto (disabled+tooltip); 409 manejado | GVC + review |
| Operador aplica borrador sin leer | legal/marca | Media | banner "revísalo antes de aplicar" + caption anti-sesgo + form editable (fricción deliberada mínima) | review humano |
| Latencia LLM percibida como cuelgue | UX | Media | progreso honesto + skeleton + segundo plano | GVC |
| Regresión del Publication Desk existente | UI | Baja | cambios aditivos; GVC diff before/after | `fe:capture:diff` |

### Feature flags / cutover

Reusa `HIRING_VACANCY_AI_ENABLED` (1385, OFF; ledger ya registrado — esta task NO crea flags). El cutover visible = flip del flag (dueño: rollout de 1385).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-3 | revert PR (aditivo; sin migraciones) | ~min | Sí |

### Production verification sequence

Merge con flag OFF (CTA locked) → flip staging (1385) → smoke desde el desk: propose real → review → confirm → publish gate pasa → GVC staging → prod tras revisión del primer aviso real.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: flow` segun el alcance real.
- [ ] `UI ready: yes` con `pnpm task:lint --task TASK-1422` sin findings; wireframe/flow/motion existen y son robustos.
- [ ] CTA con variantes ready/locked(flag OFF: disabled+tooltip)/pending(borrador en ledger); oculto sin capability.
- [ ] Drawer completo: generate (template opcional) → proposing honesto → review editable prefilled → Aplicar (confirm con `publicCopyOverride`) / Descartar (reject con dialog); degraded del provider y errores es-CL sin perder lo editado.
- [ ] Tras Aplicar: diff refrescado + toast + publish habilitado; el LLM nunca escribió el opening (solo el confirm).
- [ ] Copy 100% en `hiringDesk.publication.vacancyAi` (es-CL + en-US); cero literals en JSX; validado con `greenhouse-ux-writing`.
- [ ] Estados loading/empty/error/degraded/permission/mobile cubiertos; motion con reduced-motion fallback.
- [ ] GVC desktop + mobile + reduced-motion capturado y MIRADO en loop hasta enterprise; `scrollWidth==clientWidth` en 1440 y 390 (base y drawer); consola limpia.
- [ ] Selector de vacante funcional con >1 opening (re-resuelve pendiente).
- [ ] `pnpm local:check:ui` + `pnpm test` focal verdes.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm local:check:ui`
- `pnpm task:lint --task TASK-1422` + `pnpm ui:wireframe-check --task TASK-1422` + `pnpm ui:flow-check --task TASK-1422` + `pnpm ui:motion-check --task TASK-1422`
- `pnpm fe:capture task1422-vacancy-ai-draft` en loop (desktop+mobile+reduced-motion) + `pnpm fe:capture:diff` before/after

## Closing Protocol

- [ ] Lifecycle/carpeta; README + registry; Handoff + changelog.
- [ ] Delta en `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (extensión del nodo N-publish).
- [ ] Delta en TASK-355 wireframe si cambia el layout del Publication Desk (selector).
- [ ] Manual de uso: delta en `docs/manual-de-uso/hr/operar-hiring-desk.md` (redactar aviso con IA).
- [ ] Evidencia GVC referenciada en la task + wireframe.

## Follow-ups

- Edición manual del copy público sin IA (form directo al PATCH del opening).
- Polling/notificación del borrador generado en segundo plano.
- Nexa actionKey del confirm (follow-up 1385).
