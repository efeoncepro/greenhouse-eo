# TASK-1362 — Candidate Document Capture

## Delta 2026-07-08 — Revisión 3-lentes (arch-architect + talent/people-ops + product-design)

Hechos verificados contra el repo real. La task está bien encuadrada (reusar, no recrear); ajustes:

- **Sustrato confirmado real:** `createPrivatePendingAsset`/`attachAssetToAggregate`/`canTenantAccessAsset`/`downloadPrivateAsset` existen en `src/lib/storage/greenhouse-assets.ts`; `CONTEXT_RETENTION_CLASS`/`CONTEXT_PREFIX` son `Record<GreenhouseAssetContext, …>` exhaustivos (la red anti-olvido de authz es real). `person_identity_documents.evidence_asset_id` existe (migración TASK-784, FK a `greenhouse_core.assets`). El enfoque reuse-not-recreate está bien fundado.
- **OVERLAP con TASK-1367 (complete) — recalibrar Slice 2:** `candidate_facet` **YA tiene `portfolio_url` + `linkedin_url`** (los agregó 1367 en el apply intake). El Slice 2 proponía una columna nueva `portfolio_links` → **drift redundante**. El portafolio-**enlace** ya está resuelto (1367). 1362 owns el portafolio-**archivo** (asset context `hiring_candidate_portfolio_file`) + el **resolver unificado** de documentos del candidato. **NO** agregar `portfolio_links` salvo que se justifique explícitamente soportar *múltiples* enlaces (1367 da uno + LinkedIn); si se justifica, es una decisión declarada, no una segunda columna silenciosa.
- **Scan/quarantine net-new confirmado:** no existe scan de malware de assets. El único patrón de quarantine en el repo es `context_document_quarantine` (dominio `structured-context`) — reusable como **referencia de forma** del registro de quarantine, pero el escaneo antivirus real (ClamAV/GCP) es net-new (sigue siendo la Open Question + el mayor riesgo). `backend-critical` + gatear el upload público de 354 detrás del Slice 4 es correcto.
- **Retención/borrado de PII de candidatos rechazados (elevar de follow-up a riesgo):** guardar CV/identidad de personas que NO se contrataron es una obligación de protección de datos (Ley 21.719) — dejar la policy de retención/borrado como invariante declarado + riesgo, no solo follow-up.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-353`
- Branch: `task/TASK-1362-candidate-document-capture`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar la carga de documentos de candidato reutilizando plataformas existentes: CV/portafolio (archivo) sobre la plataforma de assets privados con contextos hiring nuevos; portafolio-enlace como campo en `candidate_facet`; y documento de identidad reutilizando `person_identity_documents` (masked/reveal). Agrega quarantine/scan para uploads públicos. Sin esto, el apply público (TASK-354) y el desk (TASK-355) no pueden manejar CV, portafolio ni identidad de forma segura.

## Why This Task Exists

TASK-353 dejó `candidate_facet`/`hiring_application` pero sin carga de documentos. Operación necesita CV, enlaces de portafolio y documento de identidad. El error a evitar es crear un bucket/tabla de documentos paralela: ya existe la plataforma de assets privados (`greenhouse_core.assets` + `GREENHOUSE_PRIVATE_ASSETS_BUCKET`) y la tabla de documentos de identidad con reveal/audit (`person_identity_documents`, TASK-784). Falta el wiring hiring-aware (anclaje por candidato que no tiene `member`) y quarantine/scan para uploads públicos (no existe hoy en la plataforma de assets).

## Goal

- Permitir subir CV/muestras de trabajo de un candidato como assets privados anclados a la postulación/persona.
- Capturar el enlace de portafolio y (post-decisión) el documento de identidad con el rigor de PII existente.
- Agregar quarantine/scan a los uploads que vienen de la web pública.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§`Delta 2026-07-08` — document capture)
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (§person legal profile / identity documents)
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- NUNCA crear bucket ni tabla de documentos nueva: reutilizar `greenhouse_core.assets` (archivos) + `person_identity_documents` (identidad).
- Anclar assets/identity-docs de candidato por `identity_profile_id`/`candidate_facet_id`/`application_id` — el candidato NO tiene `member`, NUNCA anclar por `member_id`.
- Documento de identidad: patrón enmascarado/revelar + capability `person.legal_profile.reveal_sensitive` + audit; NUNCA loggear `value_full`/PII.
- Identity docs se capturan **post-decisión** (no en el apply público); CV/portafolio sí en el apply.
- Uploads públicos: allowlist MIME/tamaño + quarantine/scan + consentimiento (contrato del apply público de TASK-354).

## Normative Docs

- `docs/tasks/to-do/TASK-354-public-careers-landing-apply-intake.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md` (§`Delta 2026-07-08`)

## Dependencies & Impact

### Depends on

- `TASK-353` (`candidate_facet`, `hiring_application`)
- `TASK-1367` (complete) — ya agregó `candidate_facet.portfolio_url`/`linkedin_url`; 1362 los consume, NO los duplica
- `src/lib/storage/greenhouse-assets.ts` (plataforma de assets privados)
- `src/app/api/assets/private/route.ts` + `src/app/api/assets/private/[assetId]/route.ts`
- `src/types/assets.ts` (`GreenhouseAssetContext` + mapas por-contexto)
- `greenhouse_core.person_identity_documents` + `src/lib/person-legal-profile/**` (TASK-784 — complete)

### Blocks / Impacts

- `TASK-354` (apply público sube CV/portafolio)
- `TASK-355` (desk muestra documentos)
- `TASK-356` (identity docs cerca de la decisión/handoff)

### Files owned

- `src/types/assets.ts` (solo agregar contextos `hiring_application_cv` / `hiring_candidate_portfolio` / `hiring_candidate_identity_doc`)
- `src/lib/storage/greenhouse-assets.ts` (solo agregar los contextos a los 3 mapas + `canAccessHiringAsset`)
- `src/app/api/assets/private/route.ts` (solo agregar los contextos a la allowlist + guard)
- `src/lib/hiring/documents/**` (helpers hiring-aware: linkear asset a application/facet, resolver docs de un candidato)
- `migrations/<ts>_task-1362-candidate-document-scan.sql` (wiring quarantine/scan; **NO** columna portafolio — ya existe por 1367, salvo justificar array multi-enlace)
- `src/lib/storage/asset-scan/**` (quarantine/scan — net-new; referencia de forma: patrón `context_document_quarantine` de `structured-context`)
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- Plataforma de assets privados: `createPrivatePendingAsset` / `attachAssetToAggregate` / `canTenantAccessAsset` / `downloadPrivateAsset`, bucket `GREENHOUSE_PRIVATE_ASSETS_BUCKET`, allowlist MIME/tamaño + dedup por hash + `asset_access_log` append-only.
- `person_identity_documents` (TASK-784 — complete, store `src/lib/person-legal-profile/**`) anclado a `identity_profile_id`, masked/reveal + capability `person.legal_profile.reveal_sensitive` + audit, con `evidence_asset_id` → assets.
- `candidate_facet` con columnas de consentimiento (TASK-353).

### Gap

- Los contextos de asset son un `Record` exhaustivo por enum sin entradas hiring; falta el anclaje por candidato (no member).
- No hay helper hiring-aware para linkear/resolver documentos de un candidato.
- No existe quarantine/scan de virus en la plataforma de assets (necesario para uploads públicos).
- `candidate_facet` no tiene campo de portafolio-enlace.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (PII de identidad + uploads públicos = superficie de abuso)
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_core.assets` (archivos), `person_identity_documents` (identidad), `candidate_facet` (portafolio-enlace)
- Consumidores afectados: apply público (TASK-354), desk (TASK-355), handoff (TASK-356)
- Runtime target: `local` → `staging` → `production`

### Contract surface

- Contrato existente a respetar: `greenhouse-assets.ts` API + `person-legal-profile` reveal/mask + `canTenantAccessAsset`
- Contrato nuevo: contextos hiring + `canAccessHiringAsset` + helpers `src/lib/hiring/documents/**` + scan hook
- Backward compatibility: `compatible` (additive: contextos nuevos, campo nuevo)
- Full API parity: la resolución de documentos de candidato vive en `src/lib/hiring/documents/**`; UI y Nexa son clientes

### Data model and invariants

- Entidades/tablas afectadas: `greenhouse_core.assets` (nuevos contextos), `candidate_facet` (**reusa `portfolio_url`/`linkedin_url` de 1367 — NO columna nueva**), `person_identity_documents` (linking, sin cambio estructural)
- Invariantes que no se pueden romper:
  - candidato se ancla por `identity_profile_id`/`candidate_facet_id`/`application_id`, NUNCA `member_id`
  - `value_full` de identity docs nunca se loggea ni sale sin reveal (capability + reason + audit)
  - identity docs NO se piden en el apply público (post-decisión)
  - uploads públicos pasan por quarantine/scan antes de quedar `attached`
  - **retención/borrado:** los documentos de candidatos NO contratados/rechazados están sujetos a policy de retención (Ley 21.719); definir borrado/expiración auditable — no acumular PII de personas fuera del proceso indefinidamente
- Tenant/space boundary: `canAccessHiringAsset` autoriza por capability hiring + ownership del candidato; identity docs por capability HR
- Idempotency/concurrency: upload 2-fases existente (pending → attached); dedup por hash; scan idempotente
- Audit/outbox/history: `asset_access_log` (existe) + audit de identity docs (existe); evento `hiring.document.attached`

### Migration, backfill and rollout

- Migration posture: `additive` (columna portafolio + wiring scan)
- Default state: `enabled` para linking interno; uploads públicos gateados por el contrato de TASK-354 (consent + rate-limit + scan)
- Backfill plan: `none`
- Rollback path: `revert PR` + drop columna portafolio; contextos son additive (revert enum)
- External coordination: definir el servicio de scan (GCP/ClamAV/provider) — posible coordinación de infra

### Security and access

- Auth/access gate: `canAccessHiringAsset` (capability hiring + ownership); identity docs = capability `person.legal_profile.reveal_sensitive` (HR); `client_*` NUNCA
- Sensitive data posture: PII (identity docs) — masked default, reveal auditado; CV = privado, nunca público
- Error contract: `toHiringErrorResponse` + `captureWithDomain`; respuesta pública genérica sin leak
- Abuse/rate-limit posture: quarantine/scan + allowlist MIME/tamaño + rate-limit del apply público (TASK-354)

### Runtime evidence

- Local checks: unit test de `canAccessHiringAsset` (ancla por candidato, no member; niega `client_*`); test de que identity docs no se piden en el path público
- DB/runtime checks: smoke — subir CV como pending → attach a application → descargar con capability → negar sin capability
- Integration checks: smoke del scan (archivo limpio pasa, archivo marcado queda en quarantine)
- Reliability signals/logs: `asset_access_log`; signal de scan fallido/quarantine
- Production verification sequence: migrate staging → smoke upload/scan/download → verify negativas → prod

### Acceptance criteria additions

- [ ] Source of truth (assets, identity docs, candidate_facet) + contract surface + consumers nombrados.
- [ ] Anclaje por candidato (no member) + PII posture (masked/reveal/audit) explícitos y con test.
- [ ] Quarantine/scan additive con rollback; uploads públicos gateados.
- [ ] Evidencia DB/runtime: upload → attach → download autorizado/negado + scan.
- [ ] Sin leak de `value_full`; errores canónicos; identity docs post-decisión.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica de resolución de documentos en `src/lib/hiring/documents/**`, no en UI.
- [ ] Modelada como recurso/command (attach asset, resolve candidate docs), no click-handler.
- [ ] Read = readers canónicos; write (attach/scan) = command con capability + idempotencia + audit.
- [ ] Reutiliza capabilities existentes (`hiring.application.*`, `person.legal_profile.reveal_sensitive`); si agrega alguna hiring nueva, grant + coverage test mismo PR.
- [ ] Camino programático: `/api/assets/private/**` (extendido) + helpers hiring; Nexa por construcción.
- [ ] Write apto para governed runtime.
- [ ] Un primitive (assets/identity docs), muchos consumers sin duplicar.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Hiring asset contexts + authorization

- Agregar contextos `hiring_application_cv`, `hiring_candidate_portfolio_file` a `GreenhouseAssetContext` + los 3 mapas (`CONTEXT_RETENTION_CLASS`, `CONTEXT_PREFIX`, draft upload) + allowlist en la route.
- `canAccessHiringAsset` (ancla por `application_id`/`candidate_facet_id`/`identity_profile_id`; capability hiring; niega `client_*`).
- Helpers `src/lib/hiring/documents/**` para attach/resolve.

### Slice 2 — Candidate document resolver (portafolio-enlace ya existe)

- **NO agregar columna nueva:** `candidate_facet.portfolio_url` + `linkedin_url` ya existen (TASK-1367, complete). El resolver los consume tal cual. Solo agregar una columna nueva si Discovery justifica *múltiples* portafolio-enlaces (array) — decisión declarada, no drift silencioso.
- Reader unificado que resuelve todos los documentos de un candidato: CV/portafolio-**archivo** (assets), portafolio/LinkedIn-**enlace** (`portfolio_url`/`linkedin_url` de 1367), identity docs (masked).

### Slice 3 — Identity document linking (post-decisión)

- Wiring del `candidate_facet.identity_profile_id` a `person_identity_documents` (reutiliza el store de TASK-784): capturar/enlazar documento de identidad con masked/reveal + capability `person.legal_profile.reveal_sensitive` + audit.
- Guardrail: el path de captura de identidad NO se expone en el apply público.

### Slice 4 — Upload quarantine / scan

- Hook de scan en el path de upload público (pending → scan → attached | quarantined).
- Signal de scan fallido/quarantine; contrato para que TASK-354 lo consuma.

## Out of Scope

- La UI de subir/ver documentos (apply público TASK-354, desk TASK-355).
- El adjunto en respuestas de assessment (referencia el mismo contexto pero el wiring es de TASK-1360/1363).
- Verificación legal del documento de identidad (verify flow es de la legal profile / HR).

## Detailed Spec

Los mapas por-contexto de `greenhouse-assets.ts` son `Record` exhaustivos sobre el enum → TypeScript obliga a completar `CONTEXT_RETENTION_CLASS`, `CONTEXT_PREFIX` y el `switch` de `canTenantAccessAsset` al agregar contextos (red de seguridad anti-olvido de autorización). El identity doc reutiliza `person_identity_documents` sin tabla nueva; la imagen escaneada va como `evidence_asset_id`. El scan puede apoyarse en un servicio GCP o ClamAV en Cloud Run — decidir en Discovery.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contexts + authz) → Slice 2 (portfolio + resolver) → Slice 3 (identity linking) → Slice 4 (scan).
- Slice 4 (scan) MUST ship antes de que TASK-354 habilite upload público de archivos; sin scan, el upload público queda deshabilitado o con compensating control documentado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Asset de candidato anclado por member (candidato sin member) | data / access | medium | Anclaje por profile/facet/application + test de `canAccessHiringAsset` | test rojo; 500 en resolver |
| `value_full` de identidad filtrado | identity / PII | low | Reuso masked/reveal + capability + audit; nunca loggear | audit de reveal; captureWithDomain |
| Malware subido por el path público | security | medium | Quarantine/scan antes de attach + allowlist MIME | signal scan/quarantine |
| Identity docs pedidos en el apply público (compliance) | legal | medium | Guardrail: path de identidad separado del apply | review del apply flow |
| PII de candidatos rechazados acumulada sin retención (Ley 21.719) | legal / data | medium | Policy de retención/borrado auditable de docs de no-contratados | doc de retención + signal de expiración |
| Segunda columna de portafolio (drift vs 1367) | data | medium | Reusar `portfolio_url`/`linkedin_url` de 1367; columna nueva solo si multi-enlace justificado | review de migración |

### Feature flags / cutover

- Sin flag para el linking interno (additive). El upload público de archivos se habilita en TASK-354 solo tras Slice 4 (scan). Razón: el linking interno no tiene superficie pública; el riesgo vive en el upload público.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-2 | revert PR (contextos additive; sin columna nueva — reusa 1367) | <15 min | si |
| Slice 3 | revert wiring (identity docs siguen siendo de la legal profile) | <10 min | si |
| Slice 4 | deshabilitar upload público (compensating control) | <10 min | si |

### Production verification sequence

1. Migrate staging + verify contextos hiring (portafolio-enlace ya existe por 1367).
2. Smoke: subir CV pending → attach a application → download con capability → negar sin capability y a `client_*`.
3. Smoke identity: enlazar doc → masked por default → reveal exige capability + reason + audit.
4. Smoke scan: archivo limpio pasa, archivo marcado queda quarantined.
5. Repetir en prod vía release pipeline.

### Out-of-band coordination required

- Definir/provisionar el servicio de scan (GCP/ClamAV/provider) — coordinación de infra si es net-new.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] CV/muestras se suben como assets privados anclados por `application_id`/`candidate_facet_id`/`identity_profile_id` (NUNCA `member_id`).
- [ ] `canAccessHiringAsset` autoriza por capability hiring + ownership y niega `client_*`; test verde.
- [ ] Existe un resolver unificado que devuelve todos los documentos de un candidato (CV/portafolio-archivo assets + `portfolio_url`/`linkedin_url` de 1367 + identidad masked); NO se agrega columna de portafolio nueva salvo justificación de multi-enlace.
- [ ] La policy de retención/borrado de documentos de candidatos no contratados queda definida (o declarada como follow-up con owner + condición), no PII acumulada indefinidamente.
- [ ] Documento de identidad reutiliza `person_identity_documents` con masked/reveal + capability `person.legal_profile.reveal_sensitive` + audit; NO se pide en el apply público.
- [ ] Uploads públicos pasan por quarantine/scan antes de quedar attached; signal de quarantine.
- [ ] Sin leak de `value_full`; errores canónicos es-CL; respuesta pública genérica.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Smoke DB/runtime: upload → attach → download autorizado/negado + reveal auditado + scan
- `pnpm pg:connect:status` + verify columna/contextos

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-354/355/356)
- [ ] delta en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` si el contrato final difiere

## Follow-ups

- Verify flow del documento de identidad de candidato (si aplica antes del handoff).
- Retención/borrado de documentos de candidatos rechazados según policy de datos.

## Open Questions

- ¿Servicio de scan: GCP-native, ClamAV en Cloud Run, o provider? Decidir en Discovery por costo/latencia.
- ¿El portafolio-enlace se valida (URL sanitize + allowlist de hosts) o se guarda tal cual con sanitize mínimo? Preferir sanitize + no fetch server-side.
