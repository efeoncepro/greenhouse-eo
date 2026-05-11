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

## Delta 2026-05-11 — Patrones canónicos referenciados (5 tasks post-EPIC-001)

Desde la creación del epic (2026-04-19), Greenhouse canonizó 5 patrones que el epic debe consumir explícitamente cuando arranque ejecución. El skill `arch-architect` (Greenhouse overlay) revisó el chain de tasks (TASK-489/492/494) y aplicó Deltas individuales. Aprendizajes meta para el epic:

- **TASK-742 (Auth Resilience 7-layer)** — Defense-in-depth template aplicable a cualquier surface crítica del epic (upload privado, reveal sensitive, signature request). Documentos legales tienen blast radius alto: contrato roto en producción = riesgo legal real.
- **TASK-611/612/613 (Organization Workspace shell + Capabilities Registry)** — El document manager visible (`TASK-492`) y los gestores per-org (`/agency/organizations/[id]?facet=documents`, `/finance/clients/[id]?facet=documents`) viven como facets registrados en `FACET_REGISTRY`. Cero composición ad-hoc. Capabilities granulares declaradas + reflejadas en `greenhouse_core.capabilities_registry` con parity test runtime↔DB.
- **TASK-771/773 (Outbox + Reactive Consumer + Cloud Scheduler)** — Toda projection downstream del epic (BQ snapshots, search index, notifications, signature provider sync) usa outbox `pending → publishing → published | failed → dead_letter` + reactive consumer en `ops-worker` Cloud Run. NO inline sync en route handlers. Vercel cron solo para tooling.
- **TASK-784 (Person Legal Profile)** — Pattern canónico de reveal-sensitive: 6 capabilities granulares + masking server-side + reveal helper con reason>=20 + audit log append-only + outbox `revealed_sensitive` event + reliability signal `reveal_anomaly_rate` (>=3/24h por actor). Aplicable a TODO documento confidencial del epic (NDAs, licencias médicas, contratos con cláusulas sensibles).
- **TASK-863 V1.1→V1.5.2 (Final Settlement + Real-Artifact Verification Loop + Lifecycle PDF defense-in-depth)** — 3 patrones derivados:
  - **Lifecycle PDF defense-in-depth**: cuando un documento tiene estados (rendered/in_review/approved/issued/signed/etc), el PDF persistido refleja `documentStatus` actual de DB via helper canónico + asset metadata `documentStatusAtRender` + reliability signal `pdf_status_drift` + test anti-regresión que enforce regen en TODAS las transitions. Aplicable a TASK-490 (signature orchestration) + TASK-493 (template rendering) + TASK-494 (HR vault con verificación).
  - **Real-Artifact Iterative Verification Loop**: para documentos firmados/notarizados/auditados externamente, NO declarar `complete` sin emitir 1 caso real → captura artefacto → 3-skill audit (dominio + UX writing es-CL formal-legal + modern-ui) → iterar V1.x hasta zero blockers. Métodologia canonizada en CLAUDE.md.
  - **Semantic Column Invariants**: cuando un layout renderiza datos en N columnas representando entidades distintas (parte A vs parte B), spacer canónico en columna que no aplica. Aplicable a TODO PDF/email transaccional/dashboard que tenga "partes" (contrato → empresa vs colaborador; MSA → cliente vs proveedor; signature request → signer 1 vs signer 2).

Estos patrones son **prerequisito de implementación** del epic. Cualquier sub-task debe declarar 4-pillar score (Safety/Robustness/Resilience/Scalability) al cerrar slices.

**Frontera con dominios documentales adjacentes** (NO migrar al registry transversal; coexisten via bridges):

- `final_settlement_documents` (TASK-863) — finiquitos con state machine propio + watermark + helper canónico.
- `person_identity_documents` (TASK-784) — identidad legal personal con reveal pattern.
- `member_certifications` (TASK-313) — certificaciones profesionales.
- `member_evidence` — portfolio/reputacional.

El registry de TASK-489 agrupa via bridges (`document_*_link` tables); NO duplica el contenido.
