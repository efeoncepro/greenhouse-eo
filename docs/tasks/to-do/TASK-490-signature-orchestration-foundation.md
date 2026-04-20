# TASK-490 — Signature Orchestration Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-489`
- Branch: `task/TASK-490-signature-orchestration-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la capa provider-neutral de firma electrónica para que Greenhouse modele requests, signers, estados, eventos y artifacts firmados sin acoplar la semántica del negocio a ZapSign o a un flujo exclusivo de MSA.

## Why This Task Exists

La firma ya apareció en Finance con ZapSign, pero todavía como una necesidad de MSA. Eso no escala a contratos laborales, anexos, work orders o cualquier otro documento que requiera signers múltiples, reintentos, cancelación o auditoría. Esta task separa el dominio "signature orchestration" del provider.

## Goal

- Introducir `signature_request` como agregado transversal del repo.
- Modelar signers, estados y trail de eventos con semántica neutral.
- Permitir que el documento firmado vuelva al registry canónico como nueva versión.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

Reglas obligatorias:

- la orquestación no debe depender de un provider único
- la auditoría de eventos debe sobrevivir a retries, callbacks tardíos y reconciliaciones
- el documento firmado final vuelve a Greenhouse como asset/version canónica

## Dependencies & Impact

### Depends on

- `TASK-489`
- `src/lib/storage/greenhouse-assets.ts`
- webhook bus canónico

### Blocks / Impacts

- `TASK-491`
- `TASK-495`
- futuros flujos HR y Legal

### Files owned

- `migrations/**`
- `src/lib/signatures/**`
- `src/app/api/**` si nacen routes shared
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- primer uso de ZapSign en TASK-461
- asset pipeline para PDFs privados
- webhook infrastructure canónica documentada

### Gap

- no existe modelo común de `signature_request`
- signers y estados viven implícitos en payloads de provider
- no hay contrato para múltiples dominios consumidores

## Scope

### Slice 1 — Schema

- `signature_requests`
- `signature_request_signers`
- `signature_request_events`

### Slice 2 — Runtime

- create/cancel/reconcile signature request
- attach signer list
- publish domain events reutilizables

### Slice 3 — Document bridge

- cuando la firma se complete, registrar artifact firmado como nueva versión documental

## Out of Scope

- adapter específico de ZapSign
- UI final de seguimiento
- plantillas/rendering

## Acceptance Criteria

- [ ] existe un agregado reusable para firma electrónica independiente del provider
- [ ] el trail de eventos soporta conciliación y callbacks fuera de orden
- [ ] el artifact firmado se integra con el registry documental canónico

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- tests unitarios sobre state transitions

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado

