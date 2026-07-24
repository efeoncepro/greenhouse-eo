# Creative Studio (Efeonce Globe) — Arquitectura

> **Este es el hogar canónico de la documentación de arquitectura de Efeonce Globe / Creative Studio.**
> La documentación de Globe vive en **`greenhouse-eo`**, no en el repo hermano `efeonce-globe`.

## Por qué la doc vive acá y no en `efeonce-globe`

EPIC-028 fija la frontera del ecosistema:

> *Greenhouse es el único control plane operativo: registra `TASK-###`, dependencias, lifecycle,
> hooks, lint, QA, **cierre documental y handoff** incluso cuando los paths de implementación viven
> en el repositorio hermano. Globe posee **código, datos, infraestructura, ejecución creativa y
> evidencia técnica**.*

Traducción operativa:

| Vive en Greenhouse (`greenhouse-eo`) | Vive en Globe (`efeonce-globe`) |
|---|---|
| Arquitectura, ADRs, specs técnicas | Código (contracts, domain, adapters, app, SDK) |
| Runbooks operativos | Infraestructura (Terraform) |
| Documentación funcional + manuales | **Evidencia técnica** (bootstrap, QA audits, brand-shell evidence) |
| Handoff + changelog + lifecycle de tasks | Ejecución creativa + assets + runs |

Un agente que trabaja el **código** de Globe (en `efeonce-globe`) lee la arquitectura **desde acá**.
Nunca se crea documentación gobernante nueva en `efeonce-globe/docs/**`.

## Dónde vive cada capa de doc de Globe en Greenhouse

| Capa | Ubicación canónica |
|---|---|
| Arquitectura / specs técnicas / ADRs | **`docs/architecture/creative-studio/`** (este directorio) |
| Decisiones a nivel ecosistema | `docs/architecture/EFEONCE_CREATIVE_STUDIO_*` + índice `docs/architecture/DECISIONS_INDEX.md` |
| Runbooks operativos | `docs/operations/creative-studio/` |
| Documentación funcional (lenguaje simple) | `docs/documentation/creative-studio/` |
| Manuales de uso / runbooks operables | `docs/manual-de-uso/creative-studio/` |
| Modelo de negocio / créditos | `docs/business-models/creative-studio/` |
| Programa / EPIC | `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` |
| Continuidad + cronología | `Handoff.md` + `changelog.md` (modelo de contexto de Greenhouse) |

## Índice de arquitectura (repatriado — TASK-1492)

La arquitectura de Globe vive acá (repatriada de `efeonce-globe/docs/architecture/**` por TASK-1492;
la historia previa es auditable en el git log del repo hermano):

- [PLATFORM_FOUNDATION_V1.md](PLATFORM_FOUNDATION_V1.md) — invariantes de la plataforma (monorepo Node 24, boundary Globe↔Greenhouse, surfaces).
- [EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md](EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md) — el primer datastore durable de Globe (SPEC-007, TASK-1465): Cloud SQL `globe-pg` keyless (connector + IAM DB auth), role model `globe_owner` + gotcha PG16 restricted-superuser, 6 tablas tenant-scoped + `audit_log`, 5 stores durables detrás de sus ports (spend fence de **seguridad**, no el ledger comercial 1468). Desbloquea `maxScale > 1` (gate ADR-004).
- [EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md](EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md) — modos operativos y accountability explícita (SPEC-008, TASK-1466): snapshots append-only por workspace/run, commands/readers Full API Parity, idempotencia, optimistic concurrency y audit atómico; nunca concede membership/grants/capabilities. Desplegada y verificada internal-only; clientes externos/producción bloqueados.
- [EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md](EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md) — el esqueleto de contratos server-side (Full API Parity, trusted context, coverage matrix; TASK-1481).
- [EFEONCE_GLOBE_MODEL_LAB_V1.md](EFEONCE_GLOBE_MODEL_LAB_V1.md) — sandbox gobernado: spend fence, private-ingest, kill switch, provider seam (TASK-1457).
- [EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md](EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md) — golden briefs + rúbricas + verdict pending-human (TASK-1458).
- [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md) — arquitectura vigente del Producer: catálogo `1.2.0` con 10 rutas, contratos discriminados Image/Video/Audio, estimate/spend fence, BFF humano, lifecycle durable, GCS privado content-addressed, feed/viewer y Asset Governance. Estado internal-only: tres rutas promovidas y canariadas; siete continúan gated. La misma spec registra los gaps de sesión expirada, outbox stale, derivados, Range/streaming, visibilidad por governance y GC. Funcional: [`efeonce-globe-creative-producer.md`](../../documentation/creative-studio/efeonce-globe-creative-producer.md) · Manual: [`usar-creative-producer-globe.md`](../../manual-de-uso/creative-studio/usar-creative-producer-globe.md).
- [EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md](EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md) — **SPEC-010** (implementa ADR-008 build units 1-3, TASK-1528): 6 perfiles versionados de media (thumb/preview/poster/transcode/waveform/audio) producidos por el Job dedicado `apps/media-derivatives` (ffmpeg pinneado) + gateway autorizado `GET /v1/media/:sha256` con Range 200/206/416 nativo (passthrough a GCS, sin buffer) y media tickets principal-bound. Desplegado y verificado internal-only (canary 3 modalidades). Feed/viewer = TASK-1526; orphan GC = TASK-1529 (desbloqueada); comercial = TASK-1480. Funcional: [`efeonce-globe-media-derivatives.md`](../../documentation/creative-studio/efeonce-globe-media-derivatives.md) · Manual: [`operar-media-derivatives-globe.md`](../../manual-de-uso/creative-studio/operar-media-derivatives-globe.md).
- [EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md](EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md) — **ADR-007**, implementada internal-only: ingest privado y outputs generados comparten pipeline asíncrono durable. El Job keyless ejecuta malware → C2PA → rights, clasifica media válida sin manifest como `unverified` y recupera proyecciones terminales; private ingest y rollout comercial siguen gateados.
- [EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md](EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md) — **ADR-004**, la decisión que gobierna el front door (TASK-1506): para el release internal-only el shell web/BFF/SSO se queda en Cloud Run (servidor Node nativo; el target Next.js queda superseded para ese shell) y migrar a Vercel se rechaza porque no arregla el techo de HA; el **frontend cliente comercial sigue siendo una decisión diferida** (Vercel + Next.js candidato vivo). El custom domain se implementa vía Global External ALB + serverless NEG, nunca por domain mapping directo; `globe-api-internal` nunca recibe custom domain. URL interna, HA (TASK-1465) y Producción/externos (TASK-1480) son gates separados.
- [EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md](EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md) — el front door internal-only implementado (SPEC-009, TASK-1507): `globe.efeoncepro.com` sobre Global External ALB + serverless NEG (`southamerica-west1`) → `globe-studio-internal`, certificado administrado y redirect HTTP→HTTPS; por qué NEG y no domain mapping; frontera dura con `globe-api-internal`; el contrato de cutover (allowlist **antes** que env var) y la primitive de redirect allowlist; modelo de costo con fuente y fecha; rollback por slice. Runbook operable: [`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` § Front door internal-only](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md#front-door-internal-only-task-1507).
- [GREENHOUSE_CONNECTIVITY_V1.md](GREENHOUSE_CONNECTIVITY_V1.md) — identidad federada, WIF/ADC, auth de caller api-mode (ADR-001).
- [DECISIONS_INDEX.md](DECISIONS_INDEX.md) — índice de decisiones **scoped a Globe** (distinto del `docs/architecture/DECISIONS_INDEX.md` de Greenhouse).
- [GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md](GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md) — brecha diseño↔backend del Studio Workbench (fuente de TASK-1493…1499).

Runbooks operativos de Globe: [`docs/operations/creative-studio/`](../../operations/creative-studio/README.md).

## Decisiones canónicas ya en Greenhouse

- [EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md](../EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md)
- [EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md](../EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)
- [EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md](../EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md)
- Skill de arquitectura de Globe: `.claude/skills/greenhouse-globe/SKILL.md`
