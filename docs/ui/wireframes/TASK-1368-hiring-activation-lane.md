# TASK-1368 — Hiring Activation Lane Wireframe

## Meta

- Task: `TASK-1368`
- Superficie: **Activation lane "Contrataciones listas"** dentro de `HR > Onboarding & Offboarding` (`(dashboard)`, interno) — extiende `HrOnboardingView`/`(dashboard)/hr/workforce/activation`, NO surface nueva.
- Nodo del master flow: **N11 (activación, cara People Ops)** — ver `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`. Backend = **TASK-770**.
- Mockup aprobado (SoT visual): **TASK-763** (`docs/mockups/onboarding-module-mockup.html`) — preservar first-fold dominante, lanes reales, list-detail, copy operacional honesta, motion mínima.
- Ruta: `src/app/(dashboard)/hr/workforce/activation/**` (o lane en `hr/onboarding`). NO `[lang]`. Marca **Greenhouse** (app interna).
- Locale: bilingüe es-CL + en-US vía `getMicrocopy(locale)` (dictionaries `hiringActivation`).
- Estado: `ready for implementation` (UI ready: yes; loop GVC obligatorio durante ejecución)
- Skills: `greenhouse-talent-people-operator` · `greenhouse-ux` · `info-architecture` · `state-design` · `forms-ux` · `a11y-architect` · `arch-architect`

## Brief

La cara People Ops del cierre del pipeline de Hiring: un/a HR/People Ops ve las **contrataciones aprobadas listas para activar** (handoffs `internal_hire` de TASK-356), revisa cada caso, crea/promueve el colaborador (member sobre el mismo `identity_profile_id`, **no activo**, `pending_intake`), abre onboarding y activa **solo cuando readiness queda completo**. Es cliente delgado de los readers/commands de **TASK-770**; no reimplementa activación. Fairness/seguridad: el member nace excluido de payroll; nada se activa por side effect; PII masked por default.

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
| Acciones | botones + dialogs (`react-hook-form`) | `POST /api/hr/hiring-activation/[id]/(review\|create-member\|open-onboarding\|complete)` (770) | Activar gated por readiness |
| People 360 | card derivada | `getHiringJourneyForPerson` (770) | sin card paralela |

Copy `getMicrocopy(locale).hiringActivation`; tokens AXIS; motion mínima (mockup 763).

## GVC Scenario Plan

- `hiring-activation-lane` (loaded / empty / blocked / error).
- `hiring-activation-detail` (journey + readiness ✓/⚠/✗ + acciones con Activar disabled-con-motivo).
- `hiring-activation-resolve-blocker` (drawer/dialog).
- `people-360-hiring-journey` (card derivada, sin duplicar).
- Checks: `scrollWidth==clientWidth` (1440 + 390), consola limpia, reduced-motion, a11y (tabs, dialogs, Activar no-mudo), foco. Datos reales vía 770 (contra 356/353).

## Design Decision Log

- **Extiende superficie existente** (`HrOnboardingView`/`hr/workforce/activation`), NO surface nueva; alineada al mockup aprobado 763 (first-fold dominante, lanes reales, list-detail, motion mínima).
- **Cliente delgado de 770:** cero lógica de activación en la UI; readiness/activación reusan primitives workforce.
- **Activar disabled-con-motivo** (nunca botón mudo); readiness ✓/⚠/✗ honesto.
- **member nace no-activo `pending_intake`** — la UI refleja "creado, no activo"; nada se activa por side effect.
- **People 360 card derivada** (sin identidad paralela ni card duplicada).
- **PII masked/reveal** (capability+reason+audit); bilingüe es-CL + en-US.

## Acceptance Checklist

- [ ] Lane "Contrataciones listas" en `HR > Onboarding & Offboarding` (o `hr/workforce/activation`); deep link; bilingüe; extiende la view existente.
- [ ] Cola (`listHiringActivationQueue`) list-detail + KPIs `LaneCard`; empty/error honestos.
- [ ] Detalle: journey + readiness checklist (reusa `resolveWorkforceActivationReadiness`/`assessPersonLegalReadiness`) + acciones (770 commands).
- [ ] **Activar** solo habilitado con readiness OK (disabled-con-motivo, no botón mudo); confirmación accesible.
- [ ] Resolver-blocker drawer/dialog (forms-ux) accesible.
- [ ] People 360 muestra journey derivado sin card paralela.
- [ ] Readers anti silent-catch; PII masked/reveal.
- [ ] GVC desktop+mobile mirado; `scrollWidth==clientWidth`; consola limpia.
- [ ] `UI ready: yes` solo con lo anterior + `pnpm task:lint --task TASK-1368` sin findings.
