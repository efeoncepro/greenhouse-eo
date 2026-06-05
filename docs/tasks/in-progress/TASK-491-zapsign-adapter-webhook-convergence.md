# TASK-491 — ZapSign Adapter + Webhook Convergence

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-490`
- Branch: `task/TASK-491-zapsign-adapter-webhook-convergence`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir la integración actual de ZapSign en un adapter canónico de la nueva capa de firma, alineado al webhook bus del repo, con reconciliación operativa, secretos managed y captura del artifact firmado hacia el registry documental.

## Why This Task Exists

El token ya fue validado y TASK-461 demostró que ZapSign sirve para producción. Lo que falta es robustecer la integración para que no sea una lane aislada de MSA: callbacks canónicos, adapter formal, reconciliación y persistencia del artifact final dentro de Greenhouse.

## Goal

- Formalizar ZapSign como primer provider soportado.
- Converger sus callbacks al modelo canónico de webhooks del repo.
- Asegurar que los signed docs entren al registry/versioning común.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/tasks/complete/TASK-461-msa-umbrella-clause-library.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

Reglas obligatorias:

- no crear rutas webhook one-off fuera del contrato canónico salvo bridge temporal explícito
- secretos y base URLs salen de env/Secret Manager, nunca de `data/`
- el adapter debe tolerar retries, duplicados y reconciliación por polling si el webhook falla

## Dependencies & Impact

### Depends on

- `TASK-490`
- `src/lib/integrations/zapsign/client.ts`
- `data/api_zapsign.txt` solo como evidencia manual local

### Blocks / Impacts

- `TASK-495`
- futuros documentos HR o laborales con firma

### Files owned

- `src/lib/integrations/zapsign/**`
- `src/lib/webhooks/**`
- `src/app/api/webhooks/**`
- `src/lib/signatures/**`

## Current Repo State

### Already exists

- cliente ZapSign funcional
- token operativo validado en producción
- secreto publicado en Secret Manager y refs sembradas en Vercel

### Gap

- la integración no está reexpresada como adapter de plataforma
- falta reconciliación y normalización de webhook events
- el path hacia artifact/document version común no está cerrado

## Scope

### Slice 1 — Provider adapter

- traducir create/status/download/cancel a la API neutral de signatures

### Slice 2 — Webhook convergence

- registrar endpoint canónico, mapping de eventos, dedupe y persistencia inbox

### Slice 3 — Reconciliation

- job/manual action para resync de requests y artifacts incompletos

## Out of Scope

- segundo provider de firma
- gestor documental UI
- template rendering

## Acceptance Criteria

- [ ] ZapSign queda encapsulado detrás de un adapter provider-neutral
- [ ] los eventos entrantes usan el webhook contract canónico del repo
- [ ] la descarga del signed doc alimenta la capa documental común

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- smoke contra API real o sandbox disponible

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con secretos/riesgos/runtime notes

