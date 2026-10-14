# TASK-2037 — Growth measurement configuration operator panel

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2037-measurement-policy.md`
- Flow: `docs/ui/flows/TASK-2037-measurement-policy-flow.md`
- Motion: `docs/ui/motion/TASK-2037-measurement-policy-motion.md`
- Backend impact: `none`
- Status real: `Publicado main9690efad, orquestador38591329633/manifest released; Server9 y watchdog6/6/drift0; API/CLI/UI y alta por datos verificados; tráfico real fuera de este cierre`
- Rank: `Now`
- Domain: `data|growth`
- Blocked by: `none`
- Branch: `develop; checkout compartido, sin worktrees`

## Summary

Growth measurement configuration operator panel. Unidad dependiente de TASK-2035, goal limitado aprobado14/10, un release final completo.

## Why This Task Exists

Reemplazar listas por datos publicados sin ampliar autoridad browser ni romper matching existente.

## Goal

- Configuración reusable y verificable sin releases por alta compatible.
- Conservar consentimiento, privacidad y fuente comercial de conversión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/tasks/plans/TASK-2035-plan.md` — aprobado por el operador14/10.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md`

## Current Repo State

El bloque Already exists/Gap conserva el snapshot de intake previo a implementar. El estado
vigente es Status real y el cierre publicado; no reejecutar estos gaps históricos.

### Already exists

Forms/Meetings, medición cifrada, dispatcher y cockpit publicados; CAPI corregida en develop.

### Gap

Las dos listas fijas impiden altas por datos; falta configuración versionada administrable.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/measurement` y cockpit Growth Forms existentes
- Future candidate home: `domain-package`
- Boundary: policy command/reader y DTO; fuente acepta, Measurement autoriza y entrega
- Server/browser split: SQL, autoridad y contactos server-only; browser sólo DTO administrativo
- Build impact: no dependencia nueva; renderer y worker existentes
- Extraction blocker: transacción de aceptación, auth y cola compartidas

## Dependencies & Impact

### Depends on

- TASK-2035, plan aprobado; TASK-2034 conserva reparación CAPI y evidencia real pendiente.
- TASK-2036 entrega el contrato consumido por esta UI.

### Blocks / Impacts

- Alta compatible de Forms/Meetings y release conjunto.

### Files owned

MeasurementPolicyPanel, GrowthFormsAdminCockpitView, copy y contratos UI; no stores ni reglas de negocio.

## Backend/Data Contract

Esta unidad es sólo consumer: Backend impact none, sin schema/commands/rutas propios.
Full API Parity la entrega TASK-2036; UI usa exclusivamente sus DTO/Product API y permissions.
No duplica autorización, validación, auditoría ni publicación. El backend tiene ownership y
verificación independientes en TASK-2036 y el plan aprobado.

## UI/UX Contract

### Experience brief

- User: operador interno de Growth
- Job: habilitar medición válida sin pedir cambios de código
- Decision: fuente/versión/surface, mapping tipado y destinos antes de publicar
- UI rigor: `ui-standard`
- Success: edición, validación, revisión, publicación y desactivación con recibo visible

### Surface & system decision

- Surface: sección Medición dentro del cockpit /admin/growth/forms
- Nav placement: none; no nuevo destino
- Recipe: inspector existente de AdaptiveSidecarLayout; detalle operable con controles MUI
- Primitive decision: reuse; GreenhouseButton/Chip y TextField/MenuItem/Switch/Alert
- Copy source: src/lib/copy/growth-measurement.ts

### State inventory

Loading, sin política, draft/review/published/disabled, bloqueo por campo/versión, conflicto,
permiso denegado, API fallida y éxito con revisión. Desktop y móvil390.

### Interaction contract

Elegir fuente/surface→mapear→guardar→validar/revisar→publicar; desactivar como acción separada.
Foco/teclado, labels persistentes y mensaje de conflicto conservan la edición.

### Motion & microinteractions

Feedback nativo MUI, sin motion nuevo; reduced-motion conserva el mismo significado.

### Visual verification

GVC premium1440/390, inspección de frames y estados, contraste, teclado y overflow medidos.
Wireframe/flow/dirección y decisiones completos; readiness se ejecuta antes de JSX.

### Implementation Mapping

GrowthFormsAdminCockpitView incorpora MeasurementPolicyPanel como consumidor de Product API.
Policy no se decide en UI; estado local nunca se confunde con revisión publicada.

### GVC Scenario Plan

TASK-2037: estado vacío, draft, bloqueos, review, published, disabled, error/denied/conflict;
Quality profile: premium. Desktop 1440/mobile 390, axe/keyboard/scrollWidth y frames revisados.

### Design Decision Log

Reusar inspector contextual; se descarta nueva pantalla y editor JSON por duplicación/carga.
No card grid, KPI decorativo, navegación nueva ni rediseño del cockpit.

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

### Slice 1 — Contrato

Autoridad, estado y mapeo declarados; decisiones en ADR/plan y fuente existente.

### Slice 2 — Implementación y verificación

Primitive/API o consumer según ownership; pruebas de destino/consentimiento y cierre runtime.

## Out of Scope

CRO, abandono, newsletter, CRM/outcomes, campañas, infraestructura nueva y cambios ajenos.

## Detailed Spec

Plan aprobado docs/tasks/plans/TASK-2035-plan.md y ADR de policy.

## Rollout Plan & Risk Matrix

Cambio additive y corte coordinado con el release completo. No infraestructura nueva.

### Slice ordering hard rule

ADR/schema→policy/API→captura/worker/Client→consumer UI→verificación→release/cutover.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Policy incompatible | matching | medium | validación/default OFF/snapshot | clase segura por destino |
| Client/runtime distintos | CAPI | medium | pausa captura y corte con readback | HTTP/ack/manifest |
| Scope o campo inválido | privacidad | low | autorización fina y tipos cerrados | bloqueo de publicación |

### Feature flags / cutover

Conservar GROWTH_MEASUREMENT_CAPTURE_ENABLED/META_ENABLED/GOOGLE_UPD_ENABLED/RETENTION_ENABLED.
Captura se reactiva sólo tras runtime, migración, policies equivalentes y Client compatibles.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Foundation | disable policy/flags; conservar registros | minutos | sí |
| UI | revert consumidor sin alterar policies | minutos | sí |
| Runtime | release previo y Client compatible, sin dos senders | minutos | sí |

### Production verification sequence

CI/Deep→release completo/worker→migración/seed→Preview/publish Client→flags→Test Events y hosts.

### Out-of-band coordination required

GTM/Meta/hosts existentes con autorización de esta corrida; sin nuevas credenciales/permisos/gasto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Wireframe/flow/dirección/mapping/readiness pasan antes de JSX; UI ready sólo entonces yes — task/ui-readiness gate0 errores antes de implementar el first fold.
- [x] Primitive reuse y copy canónico, sin lógica de autorización en UI — inspector nativo, GH_GROWTH_MEASUREMENT y shared HTTP client; mismas capabilities server/CLI.
- [x] Loading/empty/error/denied/conflict y lifecycle cubiertos, reduced-motion equivalente —24 pruebas UI/agentes/red,12 estados y GVC final1440/390; mocks de presentación explícitos.
- [x] GVC premium desktop/390 revisado, sin overflow/overlaps; API real y release verificados — scorecard4.51/floor4.3, captura14:46Z y release9690efad.

## Verification

Tests/lint focales, CI completo y gates de policy/DB o UI según perfil. Task lint/closure/context strict.

## Closing Protocol

- [x] Lifecycle/carpeta/índices reflejan runtime real y evidencias por criterio — cierre publicado14/10; registry/README sincronizados.
- [x] Docs/skills espejos/handoff/changelog sincronizados; WIP ajeno preservado mediante staging explícito/parcial.
- [x] Un release completo y recibos — PR255/orch38591329633; TASK-2034 conserva tráfico comercial/EMQ pendiente.

## Follow-ups

TASK-2035 conserva los demás slices; TASK-2034 conserva la primera conversión comercial real.

## Open Questions

Ninguna bloqueante: decisiones del plan aprobadas14/10; los detalles quedan en ADR antes de código.

## Evidence — 2026-10-14

Readiness/wireframe/flow/motion aprobados por gates. First fold usa panel contextual real, campos
select tipados, copy central y primitivas nativas. Ninguna captura local acredita aceptación:
compilación lenta, reinicios por límite de memoria y assets404/reset. La captura con Times/overlay
fue rechazada; no se bajó el estándar. Se valida la composición en staging y después se conectan
mutaciones completas. Sin release de producción por este checkpoint.


### Cierre publicado14/10

[release y evidencia](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md). El cierre cubre configuración/CAPI y cliente agente; ningún fixture demuestra conversión comercial real ni EMQ.
