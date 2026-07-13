# TASK-1368 — Hiring Activation Lane Flow Contract

## Meta

- Task: `TASK-1368`
- Master flow: `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` — 1368 = **N11 (activación, cara People Ops)**. Backend = **TASK-770**.
- Wireframe: `docs/ui/wireframes/TASK-1368-hiring-activation-lane.md`
- Ruta: `src/app/(dashboard)/hr/onboarding/page.tsx` con query `?lane=hiring-activation` (NO `[lang]`); interno (route group `internal`); bilingüe.
- Estado: `code-complete local` (UI ready: yes; staging smoke post-push pendiente)

## Flow Brief

People Ops cierra el pipeline: llega desde Application 360 o entra directo a la lane, ve la cola de contrataciones aprobadas (handoffs `internal_hire` de 356, expuestos por 770) → abre el detalle → revisa el journey y el readiness → crea el colaborador (member con intake pendiente) → abre onboarding → resuelve blockers → **activa solo con readiness OK**. Todo vía commands de 770/1400 (propose→confirm); la UI no reimplementa activación.

## Surfaces Involved

| Surface | Ruta | Nodo |
|---|---|---|
| Application 360 bridge | `/agency/hiring/applications/[applicationId]` | N10→N11 |
| Activation lane (cola) | `/hr/onboarding?lane=hiring-activation` | N11 |
| Activation detail | mismo route con selección por `handoffId`/`applicationId` | N11 |
| People 360 (journey derivado) | `/people/[id]` (card) | N11-derivado |

## Flow Map

```
Application 360 selected/internal_hire ──handoff bridge──▶ Activation Lane deep link
                                                      │
                                                      ▼
Cola (listHiringActivationQueue) ──click/deep link──▶ Detalle (getHiringActivationDetail)
   │  (consume cola internal_hire de 356 vía 770)          │
   │                                    ┌──────────────────┼───────────────────┐
   │                                    ▼                  ▼                   ▼
   │                              Revisar            Crear colaborador     Abrir onboarding
   │                              (review)           (create-member →      (open-onboarding →
   │                                                  member pending_intake  ensureActivatedOnboardingCase
   │                                                  NO activo)             / createOnboardingInstance)
   │                                                        │
   │                                    ┌───────────────────┘
   │                                    ▼
   │                          Readiness checklist (resolveWorkforceActivationReadiness
   │                          + assessPersonLegalReadiness) — ✓/⚠/✗ por ítem
   │                                    │  ⚠/✗ → [Resolver] (drawer/dialog)
   │                                    ▼  (readiness OK)
   │                              Activar (complete → completeWorkforceMemberIntake path)
   │                                    │  confirmación
   ▼                                    ▼
KPIs / estado                    HiringHandoff → completed (770); People 360 refleja "activo"
```

## Interaction Triggers

- **Abrir desde Hiring Desk** (N10→N11): Application 360 muestra handoff real y CTA cuando la decisión es `selected` + `internal_hire`. Si el handoff está `pending` y el actor tiene `hiring.handoff.approve`, aprueba con `POST /api/hiring/handoffs/[id]/approve`; si está aprobado, abre `/hr/onboarding?lane=hiring-activation&applicationId=...&handoffId=...`.
- **Abrir detalle** (N11): click en fila de la cola o deep link por `handoffId`/`applicationId`.
- **Revisar** → `POST /review` (770).
- **Crear colaborador** → `POST /create-member` (770): member sobre el mismo `identity_profile_id`, **no activo `pending_intake`** (core source-neutral). Idempotente.
- **Abrir onboarding** → `POST /open-onboarding` (770): case/instance vía runtime existente; si no hay template → blocker auditado.
- **Resolver blocker**: dialog por blocker accionable; usa `POST /api/hr/hiring-activation/[id]/resolve-blocker` (TASK-1400). Blockers no resolubles muestran surface alternativa, sin simular éxito.
- **Activar** → `POST /complete` (770): solo con readiness OK; confirmación (`alertdialog`). Nunca `UPDATE active=true` directo (lo maneja 770 vía el path workforce). Marca handoff `completed`.
- **Reveal PII**: exige motivo → capability + audit (reusa person-legal-profile).

## State Machine (derivada del backend 770, la UI la refleja)

```
activation_request: pending_hr_review → member_created → onboarding_open → ready_to_activate → active
                    pending_hr_review|member_created|onboarding_open → blocked (con razón) → (resuelto) → …
                    * → cancelled
```

- **Activar** habilitado SOLO en `ready_to_activate` (readiness OK). En cualquier otro estado, disabled-con-motivo.
- **Idempotente:** reintentar create-member/activar retorna el request existente (770); la UI no duplica.
- **member incompatible** (`MemberIdentityDriftError`) → `blocked`, la UI muestra el conflicto, no fuerza merge.

## Routing Contract

- `src/app/(dashboard)/hr/onboarding/page.tsx` + `HrOnboardingView` con `?lane=hiring-activation` (NUNCA `[lang]`). Extiende la surface HR existente; el detalle vive en la lane y se selecciona por estado local/deep link.
- Query params soportados: `handoffId` y `applicationId`. Si hay match, la lane selecciona ese caso; si no hay match pero el target fue provisto, muestra estado honesto de "todavía no está en la cola" y no cae al primer caso por accidente.
- Ruta de retorno: el detalle ofrece `Ver postulación 360` hacia `/agency/hiring/applications/[applicationId]`.
- Si la lane introduce una ruta nueva alcanzable, declararla en `route-reachability-manifest` (TASK-982) + viewCode si aplica con seed mismo PR (TASK-827).
- Bilingüe es-CL + en-US vía `getLocale()` + `getMicrocopy(locale)`; sin segmento de URL de locale.

## Focus & Accessibility

- Tabs (lane) = APG tabs; foco al `<h1>` del detalle al abrir.
- **Activar no-mudo:** si no está `ready_to_activate`, el botón explica el blocker / valida on-click y enfoca el primer ítem faltante (`aria-live`).
- Resolver-blocker + Activar = dialog accesible (foco atrapado, Esc, retorno).
- Readiness ✓/⚠/✗ por texto+icono+color (no solo color). Reflow 320/200%; reduced-motion (motion mínima, mockup 763).

## Data & Command Boundaries

| Acción | Contrato | Owner |
|---|---|---|
| Listar cola | `listHiringActivationQueue` | TASK-770 |
| Detalle + journey | `getHiringActivationDetail` / `getHiringJourneyForPerson` | TASK-770 |
| Readiness | `resolveWorkforceActivationReadiness` + `assessPersonLegalReadiness` | workforce / TASK-784 (reuse) |
| Crear/promover member | `POST /create-member` → core source-neutral | TASK-770 |
| Abrir onboarding | `POST /open-onboarding` → runtime existente | TASK-770 / TASK-030 |
| Activar | `POST /complete` → `completeWorkforceMemberIntake` path | TASK-770 / workforce |
| Resolver blocker | `POST /api/hr/hiring-activation/[id]/resolve-blocker` | TASK-1400 |

- La UI consume commands/readers gobernados; cero lógica de activación propia. Nexa opera los mismos commands por parity.

## Failure Paths

| Falla | Qué ve People Ops | Mitigación |
|---|---|---|
| Crear member con identidad ambigua | blocker "identidad ambigua" (no fuerza) | `MemberIdentityDriftError` → blocked |
| Activar sin readiness | botón disabled-con-motivo + checklist ✗ | readiness gate |
| Template onboarding faltante | blocker auditado + CTA | fallar cerrado |
| Journey/facet falla (PG blip) | bloque degradado honesto | anti silent-catch |
| Reveal sin capability | affordance oculto + motivo | capability+audit |

## GVC Scenario Plan

- `hiring-activation-lane` (loaded/empty/blocked/error) · `hiring-activation-detail` (journey + readiness + Activar disabled-con-motivo) · `hiring-activation-resolve-blocker` · `people-360-hiring-journey` · Application 360 handoff bridge.
- Checks: `scrollWidth==clientWidth` (1440+390), consola limpia, reduced-motion, a11y (tabs/dialogs/Activar no-mudo), foco. Datos reales vía 770/1400.

## Design Decision Log

- Extiende surface existente (`HR > Onboarding & Offboarding`); Application 360 sólo enlaza cuando el master flow llegó a N10; cliente delgado de 770/1400; Activar gated por readiness (no-mudo); People 360 derivado; bilingüe; PII masked/reveal.

## Acceptance Checklist

- [x] N11 implementado con sus estados; cola consume el contrato de 356 vía 770.
- [x] Application 360 cablea N10→N11 por handoff real, con approve command cuando aplica.
- [x] Crear/activar vía commands de 770 (idempotente, gobernado); Activar solo con readiness OK.
- [x] Resolver blocker consume TASK-1400 (`resolve-blocker`) sin simulación client-side.
- [x] Readiness reusa `resolveWorkforceActivationReadiness`/`assessPersonLegalReadiness` (no reimplementa).
- [x] Ruta alcanzable por `/hr/onboarding?lane=hiring-activation`; no ocupa `/hr/workforce/activation`.
- [x] a11y (tabs, dialogs, Activar no-mudo) + GVC desktop+mobile local.
- [x] `## Delta` al master flow (N11) si cambia un nodo/regla.
- [ ] Staging smoke post-push con flags ON sobre build desplegado.
