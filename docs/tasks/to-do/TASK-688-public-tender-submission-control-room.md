# TASK-688 — Public Tender Submission Control Room Without API-Side Posting

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-684`, `TASK-686`
- Branch: `task/TASK-688-public-tender-submission-control-room`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crea un control room interno para preparar postulaciones sin afirmar que Greenhouse postula por API: checklist, documentos requeridos, responsables, estado manual en Mercado Publico, evidencias y vencimientos. Es el puente operativo mientras la postulacion oficial siga siendo portal/manual.

## Why This Task Exists

La API Mercado Publico no expone postulacion publica estable. Aun asi, Greenhouse puede coordinar el trabajo interno y reducir riesgo operativo: que se prepare la oferta, se suban documentos en el portal oficial y quede evidencia.

## Goal

- Modelar readiness de postulacion y checklist interno.
- Registrar evidencia/manual status de envio.
- Conectar quote/deal/documentos con pasos de preparacion.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Copy/UI debe decir claramente que el envio externo ocurre en Mercado Publico, no por API Greenhouse.
- No almacenar credenciales de usuarios Mercado Publico.
- Usar `greenhouse-agent`, `greenhouse-ui-orchestrator`, `greenhouse-ux-content-accessibility`; API routes usan `vercel:nextjs`.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Dependencies & Impact

### Depends on

- `TASK-684`
- `TASK-686`

### Blocks / Impacts

- `TASK-689`
- Futuro proposal assistant.

### Files owned

- `migrations/`
- `src/lib/commercial/public-procurement/`
- `src/app/api/commercial/`
- `src/views/greenhouse/commercial/`

## Current Repo State

### Already exists

- Workbench y bridge quedan definidos por tasks previas.

### Gap

- No hay control operativo de postulacion/preparacion.

## Scope

### Slice 1 — Submission Readiness Model

- Crear checklist/status por oportunidad.
- Modelar responsables, due dates, evidence y manual external status.

### Slice 2 — Commands And UI

- Agregar acciones para completar pasos, adjuntar evidencia y marcar enviado manualmente.
- Mostrar blockers y readiness.

### Slice 3 — Audit And Notifications

- Registrar audit trail.
- Emitir alertas de blockers/deadlines.

## Out of Scope

- Automatizar clicks en Mercado Publico.
- Guardar credenciales Mercado Publico.
- Extension Chrome.

## Acceptance Criteria

- [ ] La UI no promete postulacion automatica por API.
- [ ] Checklist y evidencia quedan auditables.
- [ ] Estados manuales tienen usuario/fecha/rationale.
- [ ] Permisos controlan update/mark submitted.

## Verification

- `pnpm migrate:up`
- Tests de commands.
- `pnpm lint`
- `pnpm build`
- Verificacion manual del flujo.

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] Docs funcionales actualizadas.

## Follow-ups

- `TASK-689`
