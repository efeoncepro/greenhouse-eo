# TASK-494 — HR Document Vault Convergence

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-489`, `TASK-492`
- Branch: `task/TASK-494-hr-document-vault-convergence`
- Legacy ID: `TASK-027`
- GitHub Issue: `none`

## Summary

Rebaselinar el HR Document Vault sobre la plataforma documental común para que `/my/documents`, `/hr/documents` y People 360 usen el mismo registry, access model y asset pipeline del epic, sin reabrir una solución paralela solo para HR.

## Why This Task Exists

`TASK-027` ya detectó correctamente la necesidad de un vault laboral, pero antes de EPIC-001 seguía siendo razonable pensarlo como un dominio casi autónomo. Ahora el camino robusto es convergerlo al lenguaje documental shared y dejar la especialización HR solo donde realmente aporta: taxonomía, reglas de confidencialidad y lifecycle laboral.

## Goal

- Absorber el objetivo funcional de `TASK-027` sobre la plataforma documental común.
- Entregar surfaces HR y self-service reales.
- Mantener la frontera clara entre documentos laborales, certificaciones y evidencia reputacional.

## Architecture Alignment

- `docs/tasks/to-do/TASK-027-hris-document-vault.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

## Dependencies & Impact

### Depends on

- `TASK-489`
- `TASK-492`
- `TASK-027`

### Blocks / Impacts

- `/my/documents`
- `/hr/documents`
- People 360 documents tab

### Files owned

- `src/lib/hr-core/**`
- `src/app/(dashboard)/my/**`
- `src/app/(dashboard)/hr/**`
- `src/views/greenhouse/people/**`

## Current Repo State

### Already exists

- spec rebaselined de `TASK-027`
- shared asset foundation

### Gap

- la UX y runtime HR siguen sin existir
- todavía no convergen al programa documental transversal

## Scope

### Slice 1 — Domain mapping HR

- taxonomía y reglas HR sobre document registry shared

### Slice 2 — UI/Routes

- `/my/documents`
- `/hr/documents`
- People 360 tab

### Slice 3 — Lifecycle HR

- verificación, expiración, confidencialidad y alerts operativos

## Out of Scope

- rendering genérico de templates
- firma provider-specific
- portal cliente externo

## Acceptance Criteria

- [ ] el alcance funcional de `TASK-027` queda absorbido por la plataforma común
- [ ] HR y colaboradores usan surfaces reales sobre el mismo registry documental
- [ ] no se duplican storage, uploads ni readers fuera de la base shared

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- smoke manual de rutas HR/My/People

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `TASK-027` queda explícitamente cerrada o absorbida con delta documental

