# TASK-394 — Management Accounting Scope Expansion: BU, Legal Entity & Intercompany

## Delta 2026-04-28 — Subordinada al programa Member Loaded Cost Model

Esta task aporta dimensiones **business_unit** y **legal_entity** al programa canónico `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`. Es ortogonal al modelo dimensional (Provider × Tool × Member × Client × Period × Expense): agrega dos ejes adicionales sobre los facts ya definidos. Mantiene scope completo (intercompany, FX policy, multi-entity consolidation) pero ahora se entiende como **enrichment cross-cutting**, no como spec independiente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno estructural`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-392`
- Branch: `task/TASK-394-management-accounting-scope-expansion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Management Accounting no puede quedarse en organization/client solamente. Esta task formaliza el programa para expandir el scope a business units, entidades legales y relaciones intercompany / related-party, de forma que el modulo pueda soportar consolidacion, eliminaciones y lectura ejecutiva multi-scope sin inventar cortes laterales.

## Why This Task Exists

La arquitectura ya necesita mirar economics por organizacion, cliente y BU, pero un modulo enterprise tambien tiene que responder por entidad legal, por holding y por transacciones entre partes relacionadas. Si el programa no ordena este crecimiento ahora, terminaran apareciendo filtros sueltos y calculos duplicados en vez de un modelo dimensional gobernado.

## Goal

- Formalizar la hoja de ruta de scopes analiticos de Management Accounting
- Coordinar BU, legal entity e intercompany bajo un contrato comun
- Definir que consolidaciones y eliminaciones pertenecen a este modulo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Los scopes nuevos deben colgar de dimensiones canonicas, no de labels UI o nombres libres
- Intercompany no se resuelve con "ajustes manuales invisibles"; requiere identificacion, eliminacion y explicabilidad
- Un numero consolidado debe poder desagregarse por scope sin ambiguedad

## Normative Docs

- `docs/tasks/to-do/TASK-167-operational-pl-organization-scope.md`
- `docs/tasks/to-do/TASK-177-operational-pl-business-unit-scope.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-392`
- `TASK-167`
- `TASK-177`
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`

### Blocks / Impacts

- `TASK-395`
- `TASK-396`
- `TASK-397`
- reporting ejecutivo y futuras vistas de consolidacion

### Files owned

- `docs/tasks/to-do/TASK-167-operational-pl-organization-scope.md`
- `docs/tasks/to-do/TASK-177-operational-pl-business-unit-scope.md`
- `docs/tasks/to-do/TASK-394-management-accounting-scope-expansion-bu-legal-entity-intercompany.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- Scope organizacional en roadmap
- Scope BU en roadmap
- Arquitectura de business lines y relaciones de entidad legal

### Gap

- No existe programa unificado para crecimiento multi-scope
- Intercompany y eliminaciones todavia no estan aterrizados como backlog ejecutable
- No hay taxonomia formal de lecturas: statutory, management, consolidated, entity-only

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Scope map canonico

- Definir niveles de lectura: organization, BU, client, legal entity, consolidated, intercompany-adjusted
- Declarar dimensiones y jerarquias minimas para soportarlos

### Slice 2 — Programa de expansion

- Integrar `TASK-177` dentro del programa multi-scope
- Diseñar backlog derivado para legal entity views, eliminaciones intercompany y rollups consolidados

### Slice 3 — Contrato de consolidacion

- Definir reglas minimas para eliminaciones, tagging related-party y explicabilidad de ajustes
- Formalizar que datos deben quedar visibles en management accounting versus statutory accounting

## Out of Scope

- Implementar toda la capa de consolidacion en esta task
- Resolver contabilidad legal / tributaria completa
- Forecasting y budget detallado por todos los scopes

## Detailed Spec

La salida de esta task es un mapa estable de scopes y consolidaciones. Debe dejar claro:

- que scopes son obligatorios para V1 / V2
- que relaciones intercompany deben modelarse desde el origen
- que ajustes se eliminan a nivel consolidado y cuales siguen visibles a nivel entidad

## Acceptance Criteria

- [ ] Existe taxonomia formal de scopes para Management Accounting
- [ ] BU, legal entity e intercompany quedaron amarrados a backlog ejecutable
- [ ] Se definio la frontera entre lectura consolidada y lectura por entidad
- [ ] La arquitectura refleja estas decisiones

## Verification

- Revision manual de arquitectura y backlog
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se documentaron los scopes minimos por release del modulo

## Follow-ups

- `TASK-395`
- `TASK-396`
- `TASK-397`
