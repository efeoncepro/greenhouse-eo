# TASK-614 — People / Payroll Economy Facet & Entitlements Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `—`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-614-people-payroll-economy-facet-entitlements-hardening`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Endurecer la convergencia ya existente entre `People` y `Payroll` para que la faceta económica del colaborador deje de depender tanto de `roleCodes`, reduzca mezcla conceptual dentro del tab `economy`, y termine de apoyarse en readers canónicos `person-360` en vez de helpers transitorios/deprecated.

## Why This Task Exists

`People` y `Payroll` ya muestran un patrón bastante sano:

- `People` es la surface canónica del colaborador
- `/hr/payroll/member/[memberId]` ya redirige a `/people/[memberId]?tab=payroll`
- la persona ya expone contexto económico/finance/payroll dentro de su detail

O sea: a diferencia de `Organizaciones/Clientes`, aquí no hay dos experiencias rivales compitiendo por el mismo objeto.

Pero todavía quedan gaps de hardening importantes:

- la visibilidad de tabs y subfacets sigue muy anclada a `roleCodes`
- el tab `economy` mezcla payroll, compensation y finance como una bolsa demasiado amplia
- existen readers transitorios (`getPersonFinanceOverviewFromPostgres`) marcados como deprecated y pendientes de convergencia a `person-complete-360`
- el modelo de capabilities finas todavía no expresa con precisión quién puede ver qué parte del contexto económico del colaborador

Sin esta lane, la UX sigue siendo usable, pero el access model y la arquitectura de readers quedan a medio consolidar y dificultan escalar People como workspace enterprise.

## Goal

- Formalizar permisos finos para la faceta económica del colaborador.
- Reducir la mezcla conceptual del tab `economy` sin romper el patrón actual `Payroll -> People`.
- Converger readers deprecated hacia la capa `person-360`/`person-complete-360`.
- Dejar una base más robusta para futuras surfaces HR/Finance sobre persona.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

Reglas obligatorias:

- `People` sigue siendo la surface canónica del colaborador; esta task no debe crear un detail paralelo dentro de Payroll.
- `Payroll` puede seguir teniendo entrypoints operativos propios, pero el detalle persona-céntrico debe mantenerse en `People`.
- La autorización fina no debe seguir creciendo solo con `roleCodes`; debe converger hacia capabilities más explícitas.
- La semántica económica de persona no puede recalcular negocio inline si ya existe o debe existir un reader canónico en `person-360`.
- Cualquier separación interna de `economy` debe preservar compatibilidad URL y no romper deep-links existentes sin transición explícita.

## Normative Docs

- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`
- `docs/tasks/in-progress/TASK-274-account-complete-360-federated-serving-layer.md`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/people/PersonView.tsx`
- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/people/helpers.ts`
- `src/lib/people/permissions.ts`
- `src/lib/people/get-person-finance-overview.ts`
- `src/lib/person-360/get-person-finance.ts`
- `src/app/api/people/[memberId]/finance/route.ts`
- `src/app/(dashboard)/hr/payroll/member/[memberId]/page.tsx`

### Blocks / Impacts

- future hardening de People 360 como workspace enterprise
- surfaces HR/Finance que consumen el contexto económico del colaborador
- follow-ups de permisos finos en People / Payroll / HR

### Files owned

- `src/views/greenhouse/people/PersonView.tsx`
- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/people/helpers.ts`
- `src/lib/people/permissions.ts`
- `src/lib/people/get-person-finance-overview.ts`
- `src/lib/person-360/get-person-finance.ts`
- `src/app/api/people/[memberId]/finance/route.ts`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

## Current Repo State

### Already exists

- `People` ya es el owner visual del detalle de colaborador.
- `Payroll` ya redirige el detail del miembro hacia `People`.
- existe una faceta/tab económica consolidada dentro de `PersonTabs`.
- existe un reader/API específico para `person finance overview`.

### Gap

- los permisos siguen demasiado ligados a `roleCodes`
- `economy` mezcla payroll, finance y compensation sin contrato más fino
- persisten readers/deprecations transitorias fuera del `person-complete-360`
- no existe una proyección enterprise más explícita de la faceta económica del colaborador

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

### Slice 1 — Economy facet access model hardening

- Definir capabilities finas o un bridge explícito para distinguir:
  - compensation
  - payroll
  - finance
  dentro de la faceta económica del colaborador.
- Reconciliar esa granularidad con el runtime actual de `People` sin romper acceso existente.

### Slice 2 — Economy facet composition cleanup

- Separar internamente la semántica de `economy` para que no siga siendo una bolsa plana.
- Evaluar si la UI final sigue siendo un solo tab con sub-secciones, o tabs/subtabs internos, manteniendo compatibilidad razonable.

### Slice 3 — Reader convergence to person-360

- Reducir dependencia en readers deprecated/transitorios.
- Reanclar `get-person-finance-overview` al contrato canónico `person-360` / `person-complete-360` donde ya sea viable.

### Slice 4 — Payroll entrypoint hardening

- Preservar explícitamente el patrón `Payroll -> People`.
- Validar que nuevos entrypoints o acciones operativas de payroll no reintroduzcan un detail paralelo.

### Slice 5 — Tests and docs

- Cubrir permisos/tab visibility y la convergencia mínima de readers.
- Actualizar arquitectura/documentación para que la convergencia quede institucionalizada.

## Out of Scope

- Rehacer completo el módulo Payroll.
- Abrir un segundo workspace de persona en HR o Finance.
- Cambiar startup policy o navegación broad del portal.
- Mezclar esta lane con `EPIC-008` de organizaciones/clientes.

## Detailed Spec

La intención de esta task no es desmontar la convergencia actual, sino endurecerla.

La decisión canónica que debe quedar explícita es:

- `People` = workspace canónico del colaborador
- `Payroll` = superficie operativa especializada con entrypoints propios cuando haga falta
- `economy` = faceta del colaborador, no un segundo objeto

El resultado ideal es que el runtime pueda distinguir con más precisión:

- quién puede ver compensation
- quién puede ver payroll
- quién puede ver finance impact

sin depender solo de `if role === ...`, y sin romper el patrón actual de redirección desde Payroll al detail de People.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una definición más fina del acceso a la faceta económica del colaborador, sin depender únicamente de `roleCodes`.
- [ ] La semántica de `economy` queda más explícita internamente y deja de mezclar compensation/payroll/finance sin contrato claro.
- [ ] Los readers transitorios de finance/payroll de persona convergen parcial o totalmente a `person-360` sin regresión funcional.
- [ ] Se mantiene el patrón canónico `Payroll -> People` para el detail de colaborador.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual en `/people/[memberId]` y `/hr/payroll/member/[memberId]`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `Greenhouse_HRIS_Architecture_v1.md` y el contrato de access model quedaron alineados con la decisión final

## Follow-ups

- split adicional de subfacets en `People` si el runtime demuestra que `economy` sigue siendo demasiado ancha
- convergencia de más readers legacy hacia `person-complete-360`
