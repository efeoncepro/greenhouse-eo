# TASK-1396 — Adobe Express REST Target: Tagged Template Automation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-027`
- Status real: `Diseno`
- Rank: `TBD — posterior a TASK-1391 y TASK-1395; beta/evaluation-only hasta autorización de Adobe`
- Domain: `commercial|platform|ops|integration`
- Blocked by: `TASK-1393 (manifest/catalog), TASK-1391 (artifact job/audit/storage), TASK-1395 (prioridad de renderer editable general), acceso beta y credenciales Adobe Express REST`
- Branch: `task/TASK-1396-adobe-express-rest-target`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar `adobe-express-rest` como target server-to-server de variaciones de documentos Adobe Express
**preparados y etiquetados**. El adapter selecciona un template URN/versionado compatible, deriva
`tagMappings` desde el mismo `ResolvedCompositionManifest`, crea la variación por REST y registra su
provenance/retención junto al job de artefacto.

No es renderer estructural libre: la API sólo reemplaza tags texto/imagen/video. `TimelineFull` sólo se
acepta cuando unidad/duración, fases/ranges/hitos y posiciones coinciden con un template de la matriz.
Fuera de matriz falla cerrado; PDF/PPTX siguen siendo el camino flexible.

## Why This Task Exists

El operador requiere Adobe Express por API, no como Add-on de producto. La API beta oficial permite
documentos etiquetados, variaciones, renditions y status con OAuth/API key. Cada variación queda editable
en Express, pero no hay endpoint REST que cree formas/páginas ni redibuje un Gantt.

Tratar el API como HTML/PDF→Express prometería una capacidad inexistente. Debe ser automatización
de templates nativos con límites explícitos, idempotencia/audit y bloqueo de producción mientras Adobe
declara la beta sólo para testing/evaluación.

## Goal

- Implementar adapter REST server-to-server sin Add-on en el flujo Greenhouse/cliente final.
- Registrar URN/tag schemas/versiones/capacidades server-side y seleccionar sólo desde manifest.
- Ejecutar `generate variation → status → download/export` con idempotencia, 50 RPM, errores redactados
  y lineage por manifest/template/documento externo.
- Mantener flag OFF y sólo POC/evaluación hasta autorización escrita de Adobe para producción/comercial.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md`
- `docs/tasks/to-do/TASK-1395-pptx-native-editable-renderer.md`
- [Adobe Express authentication](https://developer.adobe.com/firefly-services/docs/express-api/getting-started/)
- [Adobe Express limitations](https://developer.adobe.com/firefly-services/docs/express-api/getting-started/usage/)
- [Adobe Express beta FAQ](https://developer.adobe.com/firefly-services/docs/express-api/getting-started/support/FAQ/)

Reglas obligatorias:

- `adobe-express-rest` es REST sobre templates Express nativos etiquetados; no HTML→Express,
  PDF→Express ni Add-on productivo.
- Tag Elements se puede usar una vez por autor Adobe para preparar/taggear templates porque Adobe lo
  exige; no se instala ni ejecuta en Greenhouse ni por el usuario final.
- Sólo se cambian tags allowlisted texto/imagen/video. Ranges, tamaños y cardinalidad variable no se
  aproximan con una segunda geometría.
- API beta es testing/evaluación: ningún output se publica, vende o marca client-facing hasta que Adobe
  autorice el uso comercial y exista una nueva aprobación interna.

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- `TASK-1393` — manifest, catalog snapshot y registry de targets.
- `TASK-1391` — job persistente, command/capability, audience, artifact lineage, outbox y worker. Esta
  task lo extiende; no crea otro deployable.
- `TASK-1395` — renderer editable general y disciplina matrix/fail-closed.
- Adobe beta: access aprobado, Developer Console, OAuth server-to-server, technical account con sharing
  de templates/assets y revisión de términos.

### Blocks / Impacts

- Bloquea salida REST Adobe honesta para configuraciones cubiertas por matriz.
- Afecta adapter de target del artifact worker, ledger de flags, secretos/runbook y registro de artefacto;
  no cambia Composer, PDF ni UI Proposal Studio.

### Files owned

- `src/lib/artifact-composer/**` post-TASK-1393 (contratos target y registry server-only)
- `src/lib/commercial/proposals/**` post-TASK-1392/1391, sólo si el job contract lo requiere
- `services/artifact-worker/**` post-TASK-1391 (client REST y consumer)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` y runbook Adobe creado en docs canónicos

## Current Repo State

### Already exists

- Composer actual produce sólo PDF/PNG localmente; no hay credencial Adobe, HTTP client, worker ni
  documento Express.
- TASK-1393 reserva target extensible y TASK-1391 el worker, ambos `to-do`.
- Adobe Express REST beta tiene tagged-documents, details, generate variation, export rendition y status;
  50 RPM por client, documentos generados expiran a los 30 días.

### Gap

- No hay registry URN/tag/capacidad, auth Adobe, policy assets compatible, mapper manifest, job
  idempotente ni auditoría de documento externo.
- No se puede enviar URL GCS por suposición: Adobe admite URLs firmadas desde AWS, Dropbox o Azure
  `windows.net` para tags de imagen/video.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/artifact-composer/**` y `services/artifact-worker/**` post-TASK-1391; sin
  deployable nuevo.
- Future candidate home: `worker`
- Boundary: `AdobeExpressRestTarget` server-only + registry versionado; consumers son command/job
  Proposal Artifacts, artifact-worker y tests de contrato.
- Server/browser split: URN/matriz sólo DTO sanitizado; OAuth, secret, token, URLs firmadas y requests
  Adobe server-only. Nunca llegan a browser/UI.
- Build impact: cliente HTTP/OAuth, Secret Manager/env vars y asset bridge permitido; sin SDK Add-on.
- Extraction blocker: beta/uso comercial, technical account con sharing y asset host permitido.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `ResolvedCompositionManifest`, job/artefacto TASK-1391 y registry de
  templates Adobe versionados.
- Consumidores afectados: Proposal artifact command, artifact-worker, storage/audit y operador Adobe.
- Runtime target: `staging|worker|external`

### Contract surface

- Contrato existente a respetar: manifest TASK-1393 y command/job de TASK-1391.
- Contrato nuevo o modificado: `adobe-express-rest`, registry
  `{ documentUrn, revision, tagSchema, capabilityMatrix, ownerOrgId }`, mapper manifest→tagMappings,
  provider client, metadata external y errores Adobe normalizados.
- Backward compatibility: `gated`; PDF/PNG/PPTX no cambian y target Adobe OFF por default.
- Full API parity: el mismo command de artefactos selecciona target; no botón/webhook/endpoint ad hoc.
  Agente sólo propone; confirmación humana invoca command de TASK-1391.

### Data model and invariants

- Entidades/tablas/views afectadas: job/artefacto/auditoría materializados por TASK-1391; sólo metadata
  aditiva si falta target revision, document URN/ID, template revision, manifest hash, actor, expiración
  y error normalizado.
- Invariantes que no se pueden romper:
  - sólo URN/template registry allowlisted y tag schema exacto se seleccionan;
  - tag mappings derivan de slot/asset allowlisted, nunca valores libres del request;
  - template cubre unidad/range/fase/hito de TimelineFull antes de llamar Adobe; fuera de matriz aborta;
  - beta jamás marca output client-facing; retención 30d/URLs temporales se registran.
- Tenant/space boundary: `proposalId`, audience, owner org y actor provienen de TASK-1391; template/asset
  bridge scoped a owner org. Technical account no accede a assets de otra org.
- Idempotency/concurrency: key de TASK-1391 incluye `manifestHash + targetRevision + templateRevision +
  proposalId + artifactPurpose`; retry consulta job/status, no crea variación duplicada.
- Audit/outbox/history: registrar request ID Adobe, URN/revision, document ID/URL con expiración, hashes,
  actor, estado/error; logs/Sentry sin copy ni URL firmada.

### Migration, backfill and rollout

- Migration posture: `additive` sólo si TASK-1391 no tiene metadata externa requerida.
- Default state: `flag OFF` (`ADOBE_EXPRESS_REST_ENABLED=false`) y sandbox mientras beta/evaluation-only.
- Backfill plan: `N/A — no reintentar/backfillear documentos expirados`; sólo regenerar desde mismo manifest.
- Rollback path: flag OFF, detener dispatch, revocar credencial, conservar audit/job y seguir PDF/PPTX.
- External coordination: beta access, Developer Console/product profile, OAuth S2S, sharing/Storage Admin,
  template tagging, legal/comercial y asset bridge.

### Security and access

- Auth/access gate: OAuth server-to-server + client secret Secret Manager + API key; capability/
  confirmación humana TASK-1391. Nunca token user/browser ni secreto git.
- Sensitive data posture: licitación/assets/URLs firmadas son sensibles; mapping mínimo, TLS, logs
  redactados y retención documentada.
- Error contract: `adobe_express_disabled`, `adobe_express_template_unsupported`,
  `adobe_express_tag_schema_mismatch`, `adobe_express_asset_host_unsupported`,
  `adobe_express_rate_limited`, `adobe_express_provider_failed`, `adobe_express_beta_not_permitted`.
- Abuse/rate-limit posture: cola worker, 50 RPM máximo, retry backoff/jitter sólo reintentables,
  circuit breaker y `x-request-id` correlacionado.

### Runtime evidence

- Local checks: mapper/registry/error/idempotency, HTTP mock y negativas tags/estructura/asset host.
- DB/runtime checks: migración aditiva/unique job key en dev/staging después de TASK-1391.
- Integration checks: cuenta sandbox, listar/validar URN, generar variación allowlisted, esperar status y
  descargar rendition temporal; revisar audit sin publicar/compartir con cliente.
- Reliability signals/logs: `artifact.adobe_express.request_failed`, `rate_limited`,
  `template_mismatch`, `document_expiring` y `beta_dispatch_blocked` con IDs redactados.
- Production verification sequence: prohibida durante beta/evaluation-only; cierre `code complete, rollout bloqueado por proveedor`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Se completa al tomar la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

In scope:

- Target `adobe-express-rest` server-to-server, registry de template URN/tag schema/capacidad, mapper
  manifest→tags, idempotencia/audit y sandbox POC.
- Templates Express nativos etiquetados que cubran exactamente su matrix de duración/fases/rangos/hitos.

No cambia la fuente de verdad ni crea un renderer estructural: configuraciones fuera de matriz abortan
antes de contactar Adobe.

## Detailed Spec

### Slice 0 — Gate proveedor, inventario y seguridad

- Confirmar access/términos, S2S, product profile, technical account, sharing y prohibición comercial.
- Inventariar templates, taggearlos una vez con herramienta Adobe requerida y registrar URN/revision/schema/
  capacidad. No desarrollar Add-on de usuario ni usarlo en runtime.
- Resolver asset bridge explícitamente; si no hay URL firmada permitida, bloquear tag. No exponer GCS.

### Slice 1 — Registry, preflight y adapter REST

- Crear registry/preflight manifest→template: canvas, contentType, unidades, phase/range/milestone capacity
  y tag schema antes del request.
- Implementar OAuth S2S, `X-API-KEY`, `x-request-id`, generate variation, status polling acotado,
  download/export, errores/rate limit.
- Sólo tags allowlisted texto/imagen/video; bar width/posición/hito fuera de template = unsupported.

### Slice 2 — Job/audit y POC restringido

- Extender job TASK-1391 con idempotencia, metadata, expiración y señales; no duplicar variaciones.
- POC sandbox de fixture compatible, verificar editabilidad Express y rendition versus tags/template.
- Dejar flag OFF y no producción/client-facing. Cambio de términos requiere Delta/ADR antes de enablement.

## Out of Scope

- Add-on como experiencia Greenhouse/cliente o Document Model API runtime.
- HTML/PDF/PNG → Express.
- Gantt con duración/rangos/fases/hitos arbitrarios fuera de template compatible.
- Uso comercial/producción durante beta/evaluation-only.
- Sync bidireccional de ediciones Express a Greenhouse.
- Crear proxy/bucket AWS/Azure o deployable sin task/ADR específica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. No código/secret Adobe hasta validar beta/términos/template ownership/account sharing.
2. Registry/preflight/negativas antes de `generate variation`.
3. Idempotencia/audit/rate limit antes de sandbox dispatch.
4. Producción bloqueada durante beta/evaluation-only, aun con tests verdes.

| Riesgo | Sistema | Probabilidad | Mitigación | Señal |
| --- | --- | --- | --- | --- |
| Se promete Gantt libre con tags fijos | propuesta | high | matrix + preflight fail-closed | `template_unsupported` |
| Credencial/template expone otra org | Adobe/assets | medium | S2S scoped + sharing allowlist | URN fuera owner org |
| Asset URL filtra contenido | integración | medium | AWS/Azure/Dropbox only; sin proxy improvisado | `asset_host_unsupported` |
| Retry duplica documento | job | medium | unique key + status lookup | duplicado |
| Beta llega a cliente | compliance | medium | flag OFF + gate legal | `beta_dispatch_blocked` |

### Feature flags / cutover

Registrar `ADOBE_EXPRESS_REST_ENABLED=false` en ledger. Sólo sandbox allowlist; el flag no habilita
producción mientras proveedor prohíba uso comercial. Futuro cambio exige terms, ADR Delta, aprobación
humana y staging green.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
| --- | --- | --- | --- |
| 0–1 | No registrar template/secret; revertir adapter/registry | minutos | sí |
| 2 sandbox | Flag OFF + revocar credencial + detener dispatch; conservar audit | minutos | sí |
| futuro rollout | Flag OFF + retirar grants/secrets y fallback PDF/PPTX | minutos | sí |

### Production verification sequence

1. Producción sin llamadas mientras beta/evaluation-only.
2. Si Adobe autoriza: validar términos y crear Delta arquitectura/seguridad.
3. Staging flag OFF → sandbox allowlist → smoke/audit/expiración.
4. Piloto aprobado con cooldown, métricas y rollback probado.

### Out-of-band coordination required

- Adobe beta access y confirmación de uso permitido.
- Developer Console/product profile, OAuth S2S y technical account con assets/templates autorizados.
- Autor Adobe etiqueta templates nativos con herramienta exigida.
- Legal/comercial/seguridad aprueban retención, contenido y asset bridge.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `adobe-express-rest` funciona sólo desde command/job server-side TASK-1391; no Add-on de producto ni secreto browser.
- [ ] Registry tiene URN, revision, tags, owner org y matrix; request no suministra URN/tags/template libres.
- [ ] Manifest compatible mapea sólo tags allowlisted; estructura TimelineFull fuera de matriz aborta antes de Adobe.
- [ ] OAuth/API key/50 RPM/request ID/retry/error tienen tests sin copy/URL firmada en logs.
- [ ] Idempotencia/audit preservan manifest/template/target/document/actor/expiración sin duplicar.
- [ ] POC sandbox genera variación editable/rendition y no publica/vende/marca client-facing.
- [ ] Flag OFF figura en ledger y producción bloqueada hasta autorización Adobe.
- [ ] Source of truth/access/migration/asset host/rollback explícitos y evidenciados.

## Verification

- `pnpm task:lint --task TASK-1396`
- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Tests adapter/registry/job y negativas tags/asset host/rate limit/idempotencia
- Sandbox smoke Adobe después de gates externos

## Closing Protocol

- [ ] Lifecycle/carpeta declara `code complete, rollout bloqueado por proveedor` mientras beta no autorice comercial.
- [ ] Flag ledger, runbook, arquitectura, changelog, Handoff y docs reflejan matrix REST/límites.
- [ ] Secretos sólo Secret Manager/env gestionado; no tokens/URN sensibles git/logs/fixtures/cliente.
- [ ] TASK-1391 registra target/metadata sin bifurcar command/job/audience.
- [ ] `pnpm qa:gates --changed --agent codex` antes de cierre de código.

## Follow-ups

- Ampliar templates sólo con nueva matrix/evidencia; no inferir variación estructural.
- Reabrir producción cuando Adobe retire restricción beta/evaluation-only y legal autorice.
- Resolver variantes externas/conflictos si edición humana necesita volver a Greenhouse.

## Open Questions

- Confirmar si technical account S2S puede conservar/operar documentos más allá de 30 días sin intervención humana.
