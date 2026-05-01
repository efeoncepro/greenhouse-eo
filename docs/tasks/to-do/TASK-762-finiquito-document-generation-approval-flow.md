# TASK-762 — Finiquito Document Generation + Approval Flow

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-010`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-760`, `TASK-761`
- Branch: `task/TASK-762-finiquito-document-generation-approval-flow`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Genera el documento formal del finiquito y su workflow de revisión, aprobación y emisión a partir del settlement final calculado. Esta task convierte el cálculo en un artefacto/documento operable y trazable dentro de Greenhouse, con capacidad de revisión humana antes de su emisión final.

## Why This Task Exists

Aunque Greenhouse pueda calcular un settlement final, el valor real para HR/operación está incompleto si no existe:

- documento formal
- historial de revisiones
- aprobación interna
- emisión controlada
- storage y audit trail

Sin eso, el cálculo sigue siendo una simulación interna y no una capacidad real de cierre laboral.

## Goal

- Generar documento de finiquito desde settlement aprobado.
- Integrarlo a workflow de aprobación/revisión.
- Persistir artefacto en storage/document layer canónica.
- Exponer surface de emisión y seguimiento del documento.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

## Child Dependencies

- `TASK-760`
- `TASK-761`

## Scope

### Slice 1 — Document model

- Template/document aggregate del finiquito
- Versioning + storage
- Metadata mínima del caso y settlement

### Slice 2 — Approval flow

- Review / approve / issue
- Audit trail
- Hooks para firma/document orchestration futura si aplica

### Slice 3 — Surface

- Vista de documento dentro del offboarding case
- Historial y estado de emisión

## Non-goals

- No implementar firma electrónica full en esta misma task si requiere foundation mayor.
- No cubrir todos los tipos de documentos laborales.

## Acceptance Criteria

- [ ] Existe documento de finiquito versionado y trazable.
- [ ] El documento nace desde un settlement aprobado, no desde inputs libres.
- [ ] Existe workflow mínimo de revisión/aprobación/emisión.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- Validación manual del flujo create review approve issue
