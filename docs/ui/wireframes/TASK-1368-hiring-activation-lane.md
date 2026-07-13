# TASK-1368 — Hiring Activation Lane Wireframe

## Meta

- Task: `TASK-1368`
- Superficie: **Activation lane "Contrataciones listas"** dentro de `HR > Onboarding & Offboarding` (`(dashboard)`, interno) — extiende `HrOnboardingView` vía `/hr/onboarding?lane=hiring-activation`, NO surface nueva.
- Nodo del master flow: **N11 (activación, cara People Ops)** — ver `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`. Backend = **TASK-770**.
- Mockup aprobado (SoT visual): **TASK-763** (`docs/mockups/onboarding-module-mockup.html`) — preservar first-fold dominante, lanes reales, list-detail, copy operacional honesta, motion mínima.
- Ruta: `src/app/(dashboard)/hr/onboarding/page.tsx` + `HrOnboardingView` con query `?lane=hiring-activation`; deep link opcional `applicationId`/`handoffId`. NO `[lang]`. Marca **Greenhouse** (app interna).
- Locale: bilingüe es-CL + en-US vía `getMicrocopy(locale)` (dictionaries `hiringActivation`).
- Estado: `code-complete local`; staging smoke post-push pendiente antes de cierre lifecycle.
- Skills: `greenhouse-talent-people-operator` · `greenhouse-ux` · `info-architecture` · `state-design` · `forms-ux` · `a11y-architect` · `arch-architect`

## Brief

La cara People Ops del cierre del pipeline de Hiring: un/a HR/People Ops llega desde Application 360 o entra a la lane, ve las **contrataciones aprobadas listas para activar** (handoffs `internal_hire` de TASK-356), revisa cada caso, crea/promueve el colaborador sobre el mismo `identity_profile_id` con intake pendiente, abre onboarding, resuelve blockers y activa **solo cuando readiness queda completo**. Es cliente delgado de los readers/commands de **TASK-770** y del resolver **TASK-1400**; no reimplementa activación. Fairness/seguridad: payroll/capacity dependen del intake, nada se activa por side effect y PII va masked por default.

## Layout Skeleton

### Lane dentro de `HR > Onboarding & Offboarding` (patrón `LaneCard` + list-detail existente)

```
┌─ Greenhouse (dashboard) · HR > Onboarding & Offboarding ───────────┐
│  [Onboarding] [Offboarding] [Contrataciones listas ●3]  (es/en)    │  tab nueva (deep link)
├───────────────────────────────────────────────────────────────────┤
│  LaneCards:  [Listas 3] [Bloqueadas 1·warning] [En onboarding 2]   │  KPIs (reusa LaneCard)
│              [Activadas (30d) 5·success]                            │
├──────────────────────────────┬────────────────────────────────────┤
│  COLA (list)                 │  DETALLE (detail)                    │
│  · {Persona} · {Rol}         │  {Persona}  ·  {Rol}  ·  destino:    │
│    estado: pending_hr_review │   internal_hire                      │
│  · {Persona} · bloqueada ⚠   │  ─ Journey ───────────────────────── │
│  · {Persona} · en onboarding │   selección → handoff aprobado →     │  timeline honesto
│  …                           │   member(pending_intake) → onboarding│
│                              │   → readiness → activo               │
│                              │  ─ Checklist de readiness ────────── │  reusa resolveWorkforceActivationReadiness
│                              │   ✓ identidad resuelta               │   ✓/⚠/✗ por ítem
│                              │   ✓ legal entity                     │   (assessPersonLegalReadiness)
│                              │   ⚠ contrato pendiente [Resolver]    │   CTA por blocker
│                              │   ✗ template onboarding faltante     │
│                              │  ─ Acciones ──────────────────────── │
│                              │   [Revisar] [Crear colaborador]      │  CTAs gateadas por capability
│                              │   [Abrir onboarding] [Activar]       │   (770 commands; Activar disabled
│                              │                                      │    hasta readiness OK)
└──────────────────────────────┴────────────────────────────────────┘
   Resolver-blocker abre drawer/dialog (forms-ux) · Activar = confirmación
```

### Seam desde Application 360 (N10→N11)

```
┌─ Application 360 · Decisión ───────────────────────────────────────┐
│ selected · destino internal_hire                                    │
│ Handoff bridge: pending/approved/blocked/completed                   │
│ [Aprobar handoff] (si pending + capability)   [Abrir Activation Lane]│
│ Destino: /hr/onboarding?lane=hiring-activation&applicationId=...     │
│          &handoffId=...                                              │
└─────────────────────────────────────────────────────────────────────┘
```

Si el handoff todavía no existe o no está aprobado, la lane no debe seleccionar el primer caso como fallback; muestra "aún no está en la cola" y explica que N10 debe materializar/aprobar el handoff.

### People 360 — estado derivado (sin duplicar cards)

```
┌─ People 360 · {Persona} ───────────────────────────────────────────┐
│  Journey de contratación: seleccionado → onboarding abierto → activo│  reader getHiringJourneyForPerson (770)
│  (una sola card derivada; NO card paralela de "candidato")          │
└───────────────────────────────────────────────────────────────────┘
```

## Copy Ledger (bilingüe — dictionaries `src/lib/copy/dictionaries/{es-CL,en-US}/hiringActivation.ts`)

| id | es-CL | Dónde |
|---|---|---|
| `hiringActivation.tab` | Contrataciones listas | Tab |
| `hiringActivation.kpi.ready` | Listas para activar | LaneCard |
| `hiringActivation.kpi.blocked` | Bloqueadas | LaneCard |
| `hiringActivation.action.createMember` | Crear colaborador | Detalle |
| `hiringActivation.action.openOnboarding` | Abrir onboarding | Detalle |
| `hiringActivation.action.activate` | Activar colaborador | Detalle |
| `hiringActivation.readiness.blocked` | Falta {ítem} para activar | Checklist |
| `hiringActivation.blocker.resolve` | Resolver | CTA blocker |
| `hiringActivation.confirm.activate` | Confirmar activación | Dialog |
| `hiringActivation.empty` | No hay contrataciones pendientes de activar | Empty |
| `hiringDesk.application.handoff.openActivation` | Abrir Activation Lane | CTA Application 360 |

## State Copy (por superficie)

| Región | Estados |
|---|---|
| Cola | loading (skeletons) · loaded · **empty** ("Sin contrataciones pendientes") · error |
| Detalle | loading · loaded · **degradado honesto** (facet/journey que falla, sin `catch(()=>[])`) |
| Readiness checklist | por ítem: `success` (✓) · `warning` (⚠ pendiente) · `error` (✗ faltante/bloqueante) · `partial` |
| Acciones | idle · enviando ("Creando…"/"Activando…") · éxito · error canónico; **Activar disabled hasta readiness OK** (con motivo visible, no botón mudo) |
| Resolver blocker | drawer/dialog: idle · validación inline · enviando · éxito · error |

## Accessibility Contract (WCAG 2.2 AA)

- Tabs = APG tabs pattern; foco al `<h1>` al abrir el detalle.
- **Activar NO es disabled-mudo:** si readiness incompleto, el botón explica por qué (forms-ux: "Falta contrato" en vez de botón gris sin motivo) o valida on-click y enfoca el primer blocker (`aria-live`).
- Resolver-blocker + Activar = dialog accesible (foco atrapado, Esc, foco de retorno, `role=alertdialog` para activación).
- Readiness checklist: estado ✓/⚠/✗ anunciado por texto + icono + color (no solo color).
- PII masked/revealed anunciado; reveal exige motivo (capability+reason+audit, reusa person-legal-profile).
- Reflow 320/200%; target ≥24px; `prefers-reduced-motion`.

## Implementation Mapping

| Región | Componente (primitive → Vuexy `Custom*` → MUI) | Reader/Command (770) | Notas |
|---|---|---|---|
| Shell/tab | `CompositionShell` + tabs de `HrOnboardingView` | — | extiende surface existente |
| KPIs | `LaneCard` (ya existe en la view) | `listHiringActivationQueue` agregados | tono success/warning |
| Cola | list-detail (patrón existente onboarding) | `listHiringActivationQueue` (770) | server-side |
| Journey | timeline | `getHiringActivationDetail` / `getHiringJourneyForPerson` (770) | honesto, anti silent-catch |
| Readiness checklist | lista ✓/⚠/✗ | `resolveWorkforceActivationReadiness` + `assessPersonLegalReadiness` (reuse) | no reimplementar |
| Seam Application 360 | bridge card + CTA | `getHiringHandoffByApplicationId` + `POST /api/hiring/handoffs/[id]/approve` | sólo selected/internal_hire |
| Acciones | botones + dialogs (`react-hook-form`) | `POST /api/hr/hiring-activation/[id]/(review\|create-member\|open-onboarding\|complete)` (770) | Activar gated por readiness |
| Resolver blocker | dialog | `POST /api/hr/hiring-activation/[id]/resolve-blocker` (1400) | retry gobernado o surface alternativa |
| People 360 | card derivada | `getHiringJourneyForPerson` (770) | sin card paralela |

Copy `getMicrocopy(locale).hiringActivation`; tokens AXIS; motion mínima (mockup 763).

## GVC Scenario Plan

- `hiring-activation-lane` (loaded / empty / blocked / error).
- `hiring-activation-detail` (journey + readiness ✓/⚠/✗ + acciones con Activar disabled-con-motivo).
- `hiring-activation-resolve-blocker` (drawer/dialog).
- `people-360-hiring-journey` (card derivada, sin duplicar).
- `application-360-handoff-bridge` (selected/internal_hire → CTA Activation Lane).
- Checks: `scrollWidth==clientWidth` (1440 + 390), consola limpia, reduced-motion, a11y (tabs, dialogs, Activar no-mudo), foco. Datos reales vía 770/1400 (contra 356/353).

## Design Decision Log

- **Extiende superficie existente** (`HrOnboardingView`/`/hr/onboarding?lane=hiring-activation`), NO surface nueva; alineada al mockup aprobado 763 y al HTML fuente de Hiring Activation (canvas/microinteracciones sin reemplazar chrome global).
- **Cliente delgado de 770:** cero lógica de activación en la UI; readiness/activación reusan primitives workforce.
- **Seam N10→N11 desde el master flow:** Application 360 expone handoff real, aprobación gobernada y deep link a la lane; la lane soporta `handoffId`/`applicationId` y estado target-miss honesto.
- **Resolver blocker real:** consume TASK-1400; blockers manuales no prometen éxito falso.
- **Activar disabled-con-motivo** (nunca botón mudo); readiness ✓/⚠/✗ honesto.
- **member nace no-activo `pending_intake`** — la UI refleja "creado, no activo"; nada se activa por side effect.
- **People 360 card derivada** (sin identidad paralela ni card duplicada).
- **PII masked/reveal** (capability+reason+audit); bilingüe es-CL + en-US.

## Acceptance Checklist

- [x] Lane "Contrataciones listas" en `HR > Onboarding & Offboarding` (`/hr/onboarding?lane=hiring-activation`); deep link; bilingüe; extiende la view existente.
- [x] Application 360 bridge para selected/internal_hire con approve + CTA a N11.
- [x] Cola (`listHiringActivationQueue`) list-detail + KPIs `LaneCard`; empty/error honestos.
- [x] Detalle: journey + readiness checklist (reusa `resolveWorkforceActivationReadiness`/`assessPersonLegalReadiness`) + acciones (770 commands).
- [x] **Activar** solo habilitado con readiness OK (disabled-con-motivo, no botón mudo); confirmación accesible.
- [x] Resolver-blocker dialog accesible contra TASK-1400.
- [x] People 360 muestra journey derivado sin card paralela.
- [x] Readers anti silent-catch; PII masked/reveal.
- [x] GVC desktop+mobile local mirado; `scrollWidth==clientWidth`; consola limpia.
- [x] `UI ready: yes` con `pnpm task:lint --task TASK-1368` sin findings.
- [ ] Staging smoke post-push con flags ON sobre deploy del commit.
