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
- `TASK-868` — Payroll Receipt Documents aggregate dedicado (mirror TASK-863 V1.5.2) + registry link como `kind='linked'` `document_type='payroll_receipt'`.

## Implementation Order (canonical sequencing)

Orden derivado de dependency graph + 4-pillar scoring + value-to-business priority. Fases ejecutables en paralelo cuando dependencies lo permiten.

### Dependency graph

```text
TASK-489 (Foundation Registry)
    ├──> TASK-490 (Signature Orchestration)
    │       └──> TASK-491 (ZapSign Adapter)
    ├──> TASK-492 (UI Manager + Access Model)
    │       ├──> TASK-494 (HR Vault Convergence)
    │       └──> TASK-495 (Finance/Legal MSA/SOW)
    ├──> TASK-493 (Template Rendering)
    └──> TASK-868 (Payroll Receipts Aggregate)
            └──(visible via)──> TASK-494 (HR Vault)
```

### Phase 1 — Foundation (P0, blocking, single-path)

**`TASK-489` SOLO** — sin paralelismo. Foundation registry. Bloquea TODO el resto del epic. Effort estimate `Alto` (~22-30h), 4 slices canonical:

- Slice 0: Architecture spec dedicada + DDL skeleton review
- Slice 1: Migration + types Kysely + V1 seed (8 document_types: 7 + payroll_receipt cuando TASK-868 Slice 1 emerja)
- Slice 2: Runtime helpers + state machine + audit
- Slice 3: Outbox events v1 + reliability signals + capabilities registry + 4-pillar score

**Exit criteria Phase 1**:

- 9 tables creadas (catalog + documents + versions + 4 bridges + 2 audit logs)
- 9 outbox events versionados v1 registrados
- 6 reliability signals con steady=0
- 6 capabilities granulares en `capabilities_registry` con parity test runtime↔DB
- Live PG tests verdes
- TASK-494/492/490/493/868 desbloqueadas

### Phase 2 — Parallel execution post-foundation (P1)

Una vez TASK-489 cierre, **4 tasks pueden arrancar en paralelo** (sin dependencies cruzadas):

- **`TASK-868`** — Payroll Receipt Documents aggregate. Independent path (consume foundation pero NO depende de UI). 4 slices ~13-17h. Patrón fuente TASK-863 V1.5.2 verbatim. **Recomendado arrancar primero en paralelo** porque entrega valor operacional inmediato (cada `payroll_period.exported` genera receipts persistidos con state machine + audit, reusable desde TASK-494 cuando emerja).
- **`TASK-492`** — Document Manager UI + Access Model. UI foundation que TASK-494/495 consumen. 3 slices (access model + shared UI components + shared routes). **Recomendado segundo** porque desbloquea las 2 convergencias verticales (HR + Finance/Legal).
- **`TASK-490`** — Signature Orchestration (provider-neutral). Independent path. **Defer hasta que emerja caso real** que requiera firma vía Greenhouse (hoy ZapSign cubre Finance MSAs directo; no urgent).
- **`TASK-493`** — Template Rendering catalog. Independent path. **Defer hasta que emerja necesidad de templates centralizados** (hoy finiquito + recibo tienen render dedicado; aplicaría a futuro contratos laborales / addenda / NDAs si emerge volumen).

**Recomendación de orden Phase 2** (basada en value-to-business + dependency depth):

1. **TASK-868** (independent, valor operacional inmediato post-foundation, patrón ya canonizado)
2. **TASK-492** (desbloquea HR + Finance/Legal verticals)
3. **TASK-490** + **TASK-493** (defer hasta caso real)

### Phase 3 — Vertical convergences (P1, post Phase 2 partial)

- **`TASK-494`** — HR Document Vault Convergence. Bloqueada por TASK-489 + TASK-492. Consume aggregates linked (TASK-868 receipts + TASK-863 finiquitos + native types V1). Entrega `/my/documents`, `/hr/documents` y Colaborador 360 facet. **P1 alto** — usuario explicit interest en surfacing uniforme. ~Effort `Alto`.
- **`TASK-495`** — Finance/Legal Document Chain (MSA/SOW/work orders). Bloqueada por TASK-489 + TASK-492. Convergencia paralela a TASK-494. **P1 medio** — emerge cuando volumen MSA/SOW lo justifique. ~Effort `Alto`.
- **`TASK-491`** — ZapSign Adapter. Bloqueada por TASK-490. Defer hasta que TASK-490 cierre.

### Phase 4 — Late bindings (P2, deferred)

Future tasks (no abiertas hoy, candidatos a TASK siguiente del epic):

- **Member Certifications surfacing** — agregar `member_certification` linked type al registry + bridge + reactive consumer. Mismo patrón TASK-868. Out of scope V1.
- **Member Evidence surfacing** — agregar `member_evidence` linked type. Mismo patrón. Out of scope V1.
- **Person Identity Documents surfacing** — agregar `person_identity_document` linked type. Mismo patrón. Out of scope V1 (TASK-784 ya tiene UI propia `/my/legal-profile`).
- **Bulk migration de docs legacy** — script CLI idempotent para migrar contratos legacy en GCS sin metadata canónica.
- **Cross-tenant share** (cliente↔cliente, e.g. MSA tripartito) — requires `document_tenant_share` table o RLS específico.
- **Full-text search** sobre titles + descriptions — GIN index + Search endpoint.
- **OCR / extraction** para AI context (TASK-413 integration).

### Critical path canonical

```text
Phase 1: TASK-489 (~22-30h)
   ↓
Phase 2 (parallel): TASK-868 (~13-17h) + TASK-492 (~Alto)
   ↓
Phase 3: TASK-494 (~Alto) + TASK-495 (~Alto)
```

**Critical path total estimate**: TASK-489 → TASK-492 → TASK-494 = ~Alto+Alto+Alto = ~6-8 sprints (sequential). Con paralelismo TASK-868 || TASK-492, se acorta al menos 1 sprint.

### Decision drivers per phase

| Phase | Decision driver | Trigger condition |
| --- | --- | --- |
| Phase 1 → Phase 2 | TASK-489 cierra Slice 3 (4-pillar score completo) | live PG tests verdes + capabilities parity test passes |
| Phase 2 (TASK-868) | Receipts surfacing necesario en `/my/documents` | TASK-494 acerca o emerge demand operacional |
| Phase 2 (TASK-492) | UI foundation necesaria para verticals | TASK-494 + TASK-495 arrancan |
| Phase 2 (TASK-490) | Firma cross-domain emerge | Caso real fuera de Finance MSAs (e.g. NDAs HR digitales) |
| Phase 2 (TASK-493) | Template rendering centralizado emerge | Contratos laborales necesitan template engine (hoy ad-hoc) |
| Phase 3 (TASK-494) | TASK-492 cierra Slice 2 (Shared UI) | HR demand operacional para `/my/documents` |
| Phase 3 (TASK-495) | TASK-492 cierra + volumen MSA justifica | Finance demand operacional |
| Phase 3 (TASK-491) | TASK-490 cierra Slice 3 | ZapSign integration ZapSign canónica |

### Why this order beats alternatives

**Alternativa rechazada A**: empezar TASK-494 (HR Vault) primero porque "es la más visible al usuario".

- ❌ Bloqueada por TASK-489 + TASK-492. No es ejecutable.
- ❌ Si se empieza sin foundation, inventaría tabla paralela = re-trabajo cuando TASK-489 cierre.

**Alternativa rechazada B**: empezar TASK-868 (recibos) en paralelo con TASK-489.

- ❌ TASK-868 depende de TASK-489 V2.1 schema (linked aggregate pattern, bridge, reactive consumer framework). Sin foundation primero, TASK-868 inventaría pattern propio.
- ⚠️ Posible si TASK-489 Slice 1 cierra primero (migration aplicada) — TASK-868 Slice 1 podría arrancar paralelo a TASK-489 Slice 2/3. Trade-off de complejidad coordinada.

**Alternativa rechazada C**: empezar TASK-490 (signature) primero porque "ZapSign ya está integrado".

- ❌ ZapSign actual está acoplado a MSA Finance. TASK-490 lo abstrae a provider-neutral; sin foundation registry, el modelo de signature_request no tiene `document_id` canónico a referenciar.
- ❌ Re-trabajo cuando TASK-489 + TASK-492 emerjan.

**La secuencia canónica preserva**:

- **Safety**: foundation primero → cero re-trabajo + cero polymorphic FK inventados ad-hoc.
- **Robustness**: state machine + audit + outbox events v1 establecidos antes de consumers.
- **Resilience**: reliability signals + reactive consumer framework canonizados antes de aggregates linked.
- **Scalability**: pattern reusable (`linked` type) deja extensible sin schema migration para futuros aggregates.

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
