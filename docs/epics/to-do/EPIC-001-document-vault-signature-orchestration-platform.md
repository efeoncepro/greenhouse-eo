# EPIC-001 — Document Vault + Signature Orchestration Platform

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño inicial`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-001-document-vault-signature-orchestration-platform`
- GitHub Issue: `none`

## Summary

Crear la primera plataforma documental transversal de Greenhouse para gestionar documentos privados, sus versiones, rendering, firma electrónica y acceso por dominio sin multiplicar soluciones ad hoc por módulo. El epic toma ZapSign como provider de firma, GCS + `greenhouse_core.assets` como foundation binaria y el webhook bus canónico como contrato de integración.

## Why This Epic Exists

Greenhouse ya tiene piezas reales pero fragmentadas: assets privados shared, cláusulas/MSAs con firma ZapSign en Finance, y una task histórica HR (`TASK-027`) que modela un vault laboral separado. Si seguimos creciendo por módulo, terminamos con varios mini-document-managers incompatibles, webhooks one-off y lógica de storage repetida.

El repo ya cruzó el umbral en que MSA/SOW, contratos laborales, anexos, órdenes de trabajo y documentos de compliance necesitan un lenguaje común: documento, versión, source asset, template, signature request, signer, retention, access policy y event trail. Este epic existe para fijar ese lenguaje como plataforma reutilizable.

## Outcome

- Greenhouse tiene un registry documental canónico reusable entre HR, Finance/Legal y futuros módulos.
- La firma electrónica vive detrás de una capa provider-neutral, con ZapSign como primer adapter soportado.
- El portal expone un gestor documental real con access model explícito (`views` + `entitlements`) y superficies compartidas.
- Las cadenas documentales de MSA/SOW, contratos laborales y work orders convergen sobre una misma base.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

## Child Tasks

- `TASK-489` — Foundation de registry documental, versiones y vínculos con assets privados.
- `TASK-490` — Modelo provider-neutral de signature orchestration y trail de signers/eventos.
- `TASK-491` — Adapter ZapSign + convergencia al webhook bus canónico + reconciliación operativa.
- `TASK-492` — Gestor documental, access model V2 y surfaces UI compartidas.
- `TASK-493` — Rendering documental y catálogo de templates desacoplado de la firma.
- `TASK-494` — Convergencia HR Document Vault sobre la plataforma común.
- `TASK-495` — Convergencia Finance/Legal document chain para MSA, SOW y work orders.

## Existing Related Work

- `docs/tasks/to-do/TASK-027-hris-document-vault.md`
- `docs/tasks/complete/TASK-461-msa-umbrella-clause-library.md`
- `docs/tasks/to-do/TASK-006-webhook-infrastructure-mvp.md`
- `docs/tasks/complete/TASK-125-webhook-activation-first-consumers.md`
- `docs/tasks/complete/TASK-129-in-app-notifications-via-webhook-bus.md`
- `src/lib/storage/greenhouse-assets.ts`
- `data/api_zapsign.txt` solo como evidencia local de validación manual del token; no forma parte del runtime

## Exit Criteria

- [ ] existe un agregado documental reusable y tenant-safe que no depende de URLs efímeras de provider como source of truth
- [ ] la firma electrónica ya no está modelada como lógica exclusiva de MSA ni de un solo módulo
- [ ] HR y Finance/Legal pueden leer/escribir documentos sobre una misma foundation con access model explícito
- [ ] la integración ZapSign usa webhooks/eventos canónicos y puede reemplazarse por otro provider sin reescribir el dominio documental

## Non-goals

- reemplazar GCS como storage binario por el provider de firma
- convertir este epic en una implementación única y monolítica
- mezclar redlining colaborativo o editor legal avanzado en este primer corte
- abrir documentos privados a clientes o sister platforms sin contratos de acceso dedicados

## Delta 2026-04-19

- Se crea la primera taxonomía `EPIC-###` del repo para distinguir programas cross-domain de una `umbrella task`.
- `TASK-027` y `TASK-461` quedan explícitamente referenciadas como trabajo relacionado/convergente dentro de este epic.
