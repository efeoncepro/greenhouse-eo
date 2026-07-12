# TASK-1392 — Tender Proposal Studio F0: Aggregate, Asset Governance and Intake Foundation

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
- Backend impact: `migration`
- Epic: `EPIC-027`
- Status real: `Diseno`
- Rank: `TBD — predecessor obligatorio de TASK-1391`
- Domain: `commercial|data|ops`
- Blocked by: `none — ownership arbitrado 2026-07-12 (ADR GREENHOUSE_TENDER_DISCOVERY_OWNERSHIP_BOUNDARY_DECISION_V1.md, Accepted): el Studio es dueño de greenhouse_commercial.tenders; RESEARCH-007 de public_tender*; la promoción es un command human-gated, nunca un INSERT desde discovery. Slice 0 pasa de arbitrar a APLICAR el ADR (confirmar schema real, keys, FKs y contrato de handoff).`
- Branch: `task/TASK-1392-tender-proposal-studio-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializa F0 del Tender Proposal Studio como una **capability agentic gobernada**: aggregate `Tender` persistido, state machine append-only reforzada en DB, intake de RFP mediante el asset store canónico, contexto/tools agent-safe, propuestas estructuradas de intake y commands/readers con Full API Parity. Convierte el compositor actual de deck en una capability que por fin tiene un Tender dueño, sin construir todavía análisis profundo, pricing, UI ni renderer Cloud Run.

## Why This Task Exists

El dominio ya tiene el Deck Composer F4 shipped y una state machine TS pura, pero no existe `greenhouse_commercial.tenders`, `tender_state_transitions`, `tender_assets`, capabilities, API ni intake. Hoy el único consumer es un CLI local con un `DeckPlan` manual. Sin aggregate y assets gobernados, el render productivo de TASK-1391 no tiene fuente de verdad, boundary de acceso, audiencia ni lineage para asociar su PDF a una licitación.

Además, un CRUD no satisface la dirección del Studio: un agente debe poder leer el contexto permitido, proponer el intake y operar las mismas capabilities que UI/API/Nexa/MCP, pero nunca mutar directamente ni ejecutar análisis o submit por cuenta propia. F0 necesita por ello un **Tender Intake Agent Contract**: input estructurado → propuesta trazable → confirmación humana → command canónico. No se acepta agregar un SDK/agente paralelo o un prompt que escriba SQL/estado.

El riesgo principal es aplicar correctamente el source of truth ya decidido: RESEARCH-007 descubre oportunidades públicas y Tender Proposal Studio construye la oferta. El ADR Accepted fija que convergen por handoff —no por absorción ni tabla paralela—; la migración debe materializar esa decisión, sus claves y su idempotencia.

## Goal

- Tener un `Tender` canónico en `greenhouse_commercial` que referencia al cliente 360 y a fuentes comerciales existentes, sin recrear identidad, deal, quote ni contrato.
- Persistir las transiciones del ciclo en historial append-only y defender en DB/command las mismas reglas que hoy prueba `tender-state-machine.ts`.
- Ingerir RFPs y registrar deliverables mediante `greenhouse-assets`, con ownership, audiencia, versiones y estado que impidan filtrar munición interna al comprador.
- Exponer create/ingest/read/transition como primitives gobernadas, con capability/grant, auditoría, idempotencia y camino programático; dejar a TASK-1391 un `tenderId` y assets confiables.
- Exponer un agente de intake con contexto read-only y tools que delegan en esos primitives; produce `TenderIntakeProposal` estructurado y sólo el humano confirmado ejecuta los comandos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (leer §0 antes de todo; §§1–3 y F0)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (§5-bis y §5-ter: agente/tool-runner propio sobre clientes canónicos; no framework paralelo)
- `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **Un Tender no es una identidad:** referencia `client_id`/Cliente 360 y futuros deal/quote/contract; no replica organizaciones, personas ni pricing.
- **RESEARCH-007 descubre; el Studio construye.** Sólo puede existir una tabla canónica `greenhouse_commercial.tenders`; la promoción de una oportunidad pública es un handoff explícito y auditable.
- La state machine TS de `src/lib/commercial/tenders/tender-state-machine.ts` es la regla de aplicación; DB la refuerza con constraints/trigger append-only. Ninguna ruta actualiza estado o inserta historial por SQL ad hoc.
- Assets pasan por `src/lib/storage/greenhouse-assets.ts`, su scan/quarantine/ownership/audit. No crear bucket, uploader, URLs públicas ni carpeta suelta paralelos.
- `audience=internal|client_facing`, kind, status y versión viven en `tender_assets`; packaging sólo podrá usar entregables client-facing aprobados. Un agente nunca envía, firma ni declara en nombre de Efeonce.
- Cada command usa `propose → confirm → execute` cuando cruce un gate humano; capability nueva implica grant a al menos un rol real en el mismo PR.
- El agente usa exclusivamente `src/lib/ai/` y los mismos readers/commands/capabilities del dominio. Sus tools no acceden DB ni asset store directamente; propuesta ≠ ejecución y el trace/eval es parte del contrato.
- El render Chromium permanece fuera de scope: no Vercel, `ops-worker` ni `tender-worker` en esta task.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `.codex/skills/greenhouse-public-private-tenders/bid-construction-playbook.md` (Fases 0–1 y 10)
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- ADR `GREENHOUSE_TENDER_DISCOVERY_OWNERSHIP_BOUNDARY_DECISION_V1.md` (Accepted): aplicar el ownership `RESEARCH-007 public_tender* → Tender greenhouse_commercial.tenders` y su command de promoción human-gated antes de la migración.
- Composer y state machine ya materializados: `src/lib/commercial/tenders/deck/**`, `src/lib/commercial/tenders/tender-state-machine.ts`.
- Prior art de structured output/tool loop: `src/lib/ai/` y `src/lib/nexa/{providers,nexa-tools.ts,nexa-turn-telemetry.ts}`; confirmar adapter exacto en Plan Mode, sin crear SDK/framework de agentes paralelo.
- Asset store canónico y sus contextos/retention/scan: `src/lib/storage/greenhouse-assets.ts`, `src/types/assets.ts`.
- Patrones de state machine, audit y outbox del release control plane: `src/lib/release/state-machine.ts` y su store/commands [verificar paths exactos en Plan Mode].

### Blocks / Impacts

- **Bloquea directamente TASK-1391:** éste no puede crear job de render/artefacto productivo sin `Tender`, `tender_assets`, audience, versioning y comandos persistidos.
- Desbloquea F1 (análisis/admisibilidad), F2 (producción), F3 (quote adapter) y F5 (UI/Nexa/MCP) del Studio, sin implementarlos.
- Da a RESEARCH-007 un handoff destino canónico, sin absorción de discovery ni mutación del radar público.

### Files owned

- `src/lib/commercial/tenders/tender-state-machine.ts` y `src/lib/commercial/tenders/__tests__/tender-state-machine.test.ts` (sólo para mantener paridad DB/TS si hace falta)
- `src/lib/commercial/tenders/**` (aggregate types, store, commands, readers, agent contract/tools/proposals, errors y tests nuevos; nombres exactos se fijan en Plan Mode)
- `src/lib/storage/greenhouse-assets.ts`, `src/types/assets.ts` y tests sólo para añadir contextos Tender compatibles
- `migrations/*-task-1392-tender-proposal-studio-foundation.sql` (nuevo additive)
- capability registry/grants/API Platform y rutas server-side [verificar paths canónicos en Plan Mode]
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`, `docs/research/RESEARCH-007-commercial-public-tenders-module.md` y runbook/documentación funcional si cambia el handoff real

## Current Repo State

### Already exists

- Deck Composer F4 shipped y único consumer CLI: `src/lib/commercial/tenders/deck/**` + `scripts/commercial/compose-tender-deck.ts`.
- State machine TS con 12 estados, estados terminales, matriz de transición y tres gates humanos; tiene tests, pero no DB.
- Asset store privado canónico con ownership scopes, attach guard, scan/quarantine, retention, dedupe/audit y helpers de system-generated assets.
- Arquitectura ya define `greenhouse_commercial.tenders`, `tender_state_transitions` y `tender_assets` como objetivo, además del principio de audience y la frontera RESEARCH-007 → Studio.

### Gap

- No existen tabla, constraints, trigger append-only, reader/store, command, API/capability/grant, outbox ni contract/tool surface del Tender Intake Agent.
- `GreenhouseAssetContext` no tiene contexto Tender ni el asset store conoce los prefixes/retention permitidos para RFPs/outputs de licitación.
- No hay vínculo entre assets físicos y el deliverable semántico `tender_assets` (kind/status/audience/version).
- El ownership ya está decidido en arquitectura, pero todavía no está materializado en runtime como FK/command/idempotencia de promoción; omitirlo reabriría el riesgo de source of truth paralelo.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/commercial/tenders/**`, migraciones y asset store canónico en el monolito actual
- Future candidate home: `domain-package`
- Boundary: aggregate/commands/readers/tools `Tender`; consumers autorizados: API Platform, Tender Intake Agent, future UI/Nexa/MCP, RESEARCH-007 handoff, TASK-1391 renderer; ninguno accede tablas directamente.
- Server/browser split: contracts DTO browser-safe sólo si un reader los necesita; DB, asset store, scan, commands, outbox y capabilities son server-only.
- Build impact: migración additive y posible extensión del asset store; sin nueva dependencia pesada, worker, filesystem runtime ni deployable.
- Extraction blocker: las transacciones entre Tender, asset store, API command ledger y outbox permanecen en el monolito; el handoff RESEARCH-007 sólo cruza por command/contrato, no por tablas compartidas.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_commercial.tenders` + historial/asset linkage a crear; Cliente 360 y `greenhouse-assets` permanecen fuentes existentes.
- Consumidores afectados: commands/readers/API Platform, Tender Intake Agent, RESEARCH-007 handoff, asset store, TASK-1391, futuros UI/Nexa/MCP.
- Runtime target: `local + staging + production`.

### Contract surface

- Contrato existente a respetar: `TenderState`/`assertValidTenderStateTransition`, asset store, Cliente 360, API Platform command ledger, capability/grant registry y outbox existentes.
- Contrato nuevo o modificado: `Tender` aggregate, `createTender`, `ingestTenderRfp`, `transitionTenderState`, reader de Tender/intake/assets, `TenderAgentContext`, `TenderIntakeProposal`, tool registry y handoff público-discovery → Tender [nombres finales sujetos al Plan Mode].
- Backward compatibility: `additive and gated`; no hay Tender API/UI previa que romper y el CLI composer sigue aceptando un `DeckPlan` local.
- Full API parity: command/read primitives consumidos por endpoint programático/CLI, Tender Intake Agent y luego UI/Nexa/MCP; no formularios, prompts, queries o botones que escriban tablas de Tender por fuera del primitive.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_commercial.tenders`, `tender_state_transitions`, `tender_assets`; extensión de `greenhouse_assets` por contextos/ownership si el asset store lo exige. `tender_requirements` queda F1, salvo que el ownership gate requiera declararlo sin funcionalidad.
- Invariantes que no se pueden romper:
  - Un Tender apunta al cliente 360 existente; jamás crea identidad comercial paralela.
  - Transiciones permitidas en DB = matriz TS; terminales no reabren; cada transición queda append-only y auditada.
  - Gates `fit_review→producing|declined` y `ready_to_submit→submitted` requieren actor/confirmación humana; un LLM nunca los ejecuta.
  - Todo RFP/deliverable físico es asset privado del store canónico y su fila `tender_assets` conserva kind, audience, status, versión y lineage.
  - Sólo assets `client_facing` y aprobados pueden ser candidatos a packaging; interno nunca se promueve por default.
  - Reintentar create/ingest/attach no duplica Tender, asset link ni transición; locks/uniques se deciden explícitamente antes de escribir.
  - El agente sólo produce una propuesta estructurada con fuentes/inputs permitidos; no guarda Tender, adjunta RFP, cruza gate humano ni llama SQL/Cloud Storage directo.
- Tenant/space boundary: command deriva actor, `client_id`, space/tenant y ownership desde contexto autorizado; un asset sólo se adjunta si su scope/scan/owner es compatible con el Tender.
- Idempotency/concurrency: command ledger + claves por external/public opportunity o input idempotency; transiciones con lock/versión de estado; attach dedup por asset/hash + aggregate; la DB es la última defensa ante doble request.
- Audit/outbox/history: historial append-only de state transitions, command ledger, eventos de creación/ingestión/transición/asset attach y trace/telemetría del agente (input allowlisted, propuesta, tool calls, outcome/costo); señales `commercial.tender.stuck_in_state`/`commercial.tender.deadline_at_risk` cuando el aggregate tenga los campos necesarios.

### Migration, backfill and rollout

- Migration posture: `additive`; tablas, FKs, checks, indexes, trigger append-only y contextos de assets nuevos. No se borra ni reinterpreta dato existente.
- Default state: capabilities/commands y agent runtime OFF o internal-only hasta staging smoke; sin UI pública, análisis autónomo ni ejecución automática de render.
- Backfill plan: `none`; la licitación SKY se importa sólo mediante command explícito si el operador lo aprueba, como evidencia controlada.
- Rollback path: flags/capabilities OFF y revert PR; migraciones additive/historial se conservan si hay comandos/audit aplicados, nunca DELETE manual de transiciones/assets.
- External coordination: owner de RESEARCH-007/arquitectura para validar la aplicación del handoff Accepted; staging migration; revisión de roles/capabilities; operador comercial confirma asset client-facing y, si importa SKY, los inputs permitidos.

### Security and access

- Auth/access gate: capability fina por command/read/tool, grants a rol real, tenant context y ownership guard del asset store; cero endpoint anónimo. El agente hereda permisos del actor/contexto, no los amplía.
- Sensitive data posture: RFPs, anexos y ofertas son confidenciales; bucket privado, URLs firmadas sólo mediante helper canónico, metadatos/logs redaccionados y no se registra contenido de documentos en errores.
- Error contract: errores tipados/sanitizados para not-found, transition inválida, gate humano ausente, asset incompatible/quarantined, audience/status inválidos e idempotency conflict; raw errors sólo a `captureWithDomain('commercial')`.
- Abuse/rate-limit posture: commands internal/capability-gated, upload size/MIME/scan del asset store, idempotency and attach limits; no upload endpoint o proxy de storage paralelo.

### Runtime evidence

- Local checks: tests de state-machine/store/commands/readers/assets, contract/tools/proposals del agente, migration tests, eval fixture determinista y `pnpm vitest run src/lib/commercial/tenders`.
- DB/runtime checks: migración aplicada en dev, checks/FKs/trigger append-only e idempotencia probados vía `pnpm pg:connect`; transition ilegal y asset interno→client-facing no autorizado fallan cerrados.
- Integration checks: staging command de create + ingest RFP de fixture permitido + read/attach/retry; propuesta agentic de intake sobre contexto allowlisted → confirmación humana → mismo command; verificar scan/ownership, audit/outbox, tool trace y capabilities/grants.
- Reliability signals/logs: state transition/audit rows, outbox delivery, `commercial.tender.stuck_in_state` y `commercial.tender.deadline_at_risk` sólo cuando sus inputs/thresholds estén materializados; no declarar señales verdes sin datos.
- Production verification sequence: migration additive + flags OFF → staging commands/readers → revisar DB/audit/asset access → enable interno limitado → Tender controlado con human confirmation → revisar outbox/signals → decidir import SKY/expandir.

### Acceptance criteria additions

- [ ] Source of truth, handoff RESEARCH-007→Studio y contract surface están aprobados con paths/objetos reales antes de la migración.
- [ ] Invariantes de identidad, state machine, audience/asset ownership, idempotencia y gates humanos se prueban en TS y DB.
- [ ] Migración additive, backfill/rollback y acceso a RFPs/deliverables privados están explícitos y verificados en staging.
- [ ] API/CLI consumen commands/readers canónicos; no hay writes a tablas/asset store por consumer ad hoc.
- [ ] Errores, audit/outbox y señales no filtran contenido comercial confidencial.

### Capability Definition of Done — Full API Parity gate

- [ ] Las reglas viven en `src/lib/commercial/tenders/**`; UI, endpoint, CLI y worker no duplican negocio.
- [ ] `Tender` y sus comandos se modelan como aggregate/capability, no como click-handler o tabla expuesta.
- [ ] Create/ingest/transition tienen command, autorización fina, idempotencia, audit/outbox, errores sanitizados y reader de estado.
- [ ] Capability y grant a ≥1 rol real se agregan en el mismo PR con coverage.
- [ ] Camino programático de API Platform/CLI queda documentado; UI/Nexa/MCP heredan el mismo primitive cuando se incorporen.
- [ ] Los writes sensibles respetan `propose → confirm → execute`; no se implementa envío/firma de oferta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Se completa sólo al tomar la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Aplicar el ADR de ownership y fijar el contrato F0

> ✅ **El arbitraje YA ocurrió** — ADR `GREENHOUSE_TENDER_DISCOVERY_OWNERSHIP_BOUNDARY_DECISION_V1.md` (Accepted 2026-07-12). Este slice **ya no decide**: **aplica**. El Studio es dueño de `greenhouse_commercial.tenders`; RESEARCH-007 de `public_tender*`; la promoción es `createTender(origin='public_discovery', public_opportunity_id)` con confirmación humana (el GO del bid/no-bid, TASK-684), **nunca** un INSERT desde discovery; `origin=manual` **sin FK** es válido (SKY/Wherex). **NUNCA** guardar estado del bid en `public_tender*` (un re-sync lo pisaría).

- Materializar el contrato del ADR en el schema: `origin` (enum), `public_opportunity_id` nullable + FK, y la unicidad/idempotencia del command de promoción (una oportunidad no puede generar dos Tenders por retry).
- Confirmar schema real de Cliente 360, API Platform/capabilities/outbox y asset store; fijar keys, FKs, retention contexts y contract de handoff antes de migrar.

### Slice 1 — Schema additive + state machine persistida

- Crear migración additive para `tenders`, `tender_state_transitions` y `tender_assets`, con constraints, FKs/indexes, version/audience/status, checks de state y trigger append-only.
- Implementar store/commands/readers que delegan en `tender-state-machine.ts`; probar paridad TS/DB, terminales, locks/idempotencia y gates humanos.

### Slice 2 — Intake de RFP y asset governance

- Extender el asset store sólo con contextos Tender mínimos y retention/prefix/scan compatibles; no crear storage paralelo.
- Implementar create + ingest/attach RFP idempotentes, asset links privados, audience/status/version y read projection; emitir audit/outbox sin contenido sensible.

### Slice 3 — API parity, staging y handoff a renderer

- Registrar capabilities/grants y el adaptador programático/CLI; probar que consumers usan primitives canónicos.
- Implementar `TenderAgentContext` y tools read-only/command-proposal que consumen los readers/primitives F0; una propuesta estructurada de intake cita sus inputs y no ejecuta writes.
- Conectar confirmación humana de `TenderIntakeProposal` al mismo command idempotente, registrar trace/tool calls/outcome y un eval fixture antes de habilitar el agente internal-only.
- Aplicar staging smoke sobre Tender controlado, propuesta→confirmación→command, asset scan/ownership, historial/outbox y recovery; documentar el contract que TASK-1391 consume (`tenderId`, asset/version/audience, snapshot de requirements cuando F1 exista).

## Out of Scope

- Parsing/IA profunda del RFP, requisito-set/admisibilidad, fit score, pricing/quote adapter, HubSpot deal, producción de copy/squad/diagnóstico o submit. El agente F0 propone intake estructurado; el fan-out lector pertenece a F1.
- Cloud Run Job, outbox dispatcher de render, Chromium, cola, previews/PDF productivos y artifact pipeline (TASK-1391).
- UI, Figma, wireframes, GVC, Nexa/MCP UI, generación de imágenes o ContextualVisualSlot runtime.
- Generalizar el Deck Composer como plataforma de carruseles/posts/stories o crear un renderer/media runtime compartido: la composición cross-format es un slice futuro de Efeonce Creative Studio (EPIC-028). Esta task sólo preserva el seam de Tender para un handoff versionado, sin enviar RFPs o material interno fuera de Greenhouse.
- Absorber RESEARCH-007, reimplementar Cliente 360, cotizador, asset store o crear un bucket/storage/identity paralelos.

## Detailed Spec

F0 establece el mínimo confiable para que una licitación exista como objeto de negocio y como capability agentic: `Tender` creado en `intake`, assets RFP registrados privados y vinculados, historial de cambios defensible, una proyección legible y un contexto/tool surface que el agente puede consumir sin inventar estado. El `Tender Intake Agent` recibe sólo metadata/asset manifest/actor autorizados y devuelve un `TenderIntakeProposal` tipado con referencias a esos inputs; la confirmación humana invoca el mismo `createTender`/`ingestTenderRfp` que usarían API o CLI. No debe intentar simular el resto del pipeline cambiando estados sin evidencia. El estado `intake` sólo representa el baseline inicial; F1 agrega análisis/requisitos y F2/F4 producen outputs.

El agente reusa el cliente canónico `src/lib/ai/` y el patrón tool-use/telemetría de Nexa; no introduce LangChain, LangGraph, Agents SDK ni memoria mutable propia. El handoff desde RESEARCH-007 debe transportar la referencia a la oportunidad descubierta y su evidencia, no copiar entidades ni inventar datos. La migración queda bloqueada si el owner de ambas arquitecturas no puede demostrar una única escritura/lectura canónica de `tenders`.

El seam de formatos se limita a referencias portables que el dominio ya necesita (`asset` versionado,
`audience`, provenance, purpose y snapshot de entrega). No se introducen en Tender `format_spec`,
`composition_spec` ni `artifact_manifest` como modelos propios: Creative Studio los definirá en EPIC-028 y
un eventual bridge deberá ser explícito, versionado y minimizar los inputs compartidos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 MUST cerrar antes de crear `tenders` o extender `GreenhouseAssetContext`.
- Slice 1 MUST cerrar antes de Slice 2: ningún RFP se adjunta a un aggregate sin FK/state/history canónicos.
- Slice 2 MUST cerrar antes de Slice 3: API/agente no expone intake sin ownership, scan y audience gobernados.
- No habilitar TASK-1391 hasta que el handoff documentado de Slice 3 esté verificado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicar ownership de oportunidad/Tender | commercial/RESEARCH-007 | high | arbitraje/ADR Slice 0 + FK/handoff único | review bloquea migración; duplicate ownership audit |
| Saltar o reabrir estados contractuales | DB/state machine | medium | parity TS/DB, trigger append-only, lock/idempotency | invalid transition/audit anomaly |
| Filtrar un RFP o output interno | asset store/access | medium | private scope, scan, audience/status gate, capability | access-denied/quarantine/audience violation |
| Duplicar intake/assets por retry | commands/DB | medium | command ledger + unique keys + transactional attach | idempotency conflict/duplicate attach |
| Agente inventa o muta estado sin confirmación | agent/tools | medium | contexto allowlisted, output schema, eval fixture, tools sobre primitives y propose→confirm→execute | proposal/tool trace anomaly, failed confirmation |
| Romper asset store transversal | storage | medium | context additive, tests shared + focal, no cambio global de defaults | scan/attach guard regression |

### Feature flags / cutover

- Capabilities Tender, adapters programáticos y Tender Intake Agent default OFF/internal-only hasta staging evidence; nombre/ledger/eval fixture se definen en Slice 0.
- No hay UI ni automatización de análisis/render. El agente sólo propone; crear/ingerir un Tender requiere confirmación de actor y command autorizado.
- Cutover: migration additive → staging smoke → enable interno limitado → Tender controlado → validar audit/assets/outbox → expandir por decisión humana.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | Mantener task bloqueada/documentar ADR; no DB | inmediato | sí |
| 1 | Flags OFF + revert PR; tablas/audit additive se conservan si hubo writes | < 10 min | parcial |
| 2 | Flags OFF + bloquear attach Tender; assets privados existentes se preservan/auditan | < 10 min | parcial |
| 3 | Revocar grants/disable adapters; no borrar historial, Tender ni assets | < 10 min | sí |

### Production verification sequence

1. Confirmar que la migración/command aplica el ownership Accepted RESEARCH-007→Tender y el capability/access model.
2. Aplicar migration staging con commands OFF; inspeccionar schema/constraints/FKs/triggers.
3. Producir propuesta del Tender Intake Agent sobre contexto allowlisted y confirmar el intake de control; verificar que usa el mismo command, scan, ownership, asset link/audience/version y read projection.
4. Probar retry/concurrencia, transiciones ilegales/terminales y gates humanos; confirmar audit/outbox sin secretos/contents.
5. Verificar grants/API/CLI, signals cuando haya datos y rollback de flag/grant.
6. Obtener sign-off antes de enable limitado y antes de desbloquear TASK-1391.

### Out-of-band coordination required

- Owner de RESEARCH-007/Tender architecture: validar que schema/command implementan el handoff Accepted de `greenhouse_commercial.tenders`.
- Operador comercial: confirma Tender de control, RFP permitido y clasificación internal/client-facing.
- Owner agent/Nexa: revisa tool contract, propuesta estructurada, trace/eval fixture y el gate humano; no habilita ejecución autónoma.
- Operaciones DB/Cloud: migration staging, asset scanning/retention y observabilidad/outbox.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Ownership de `greenhouse_commercial.tenders` y handoff RESEARCH-007→Studio se aprueban/documentan antes de crear la tabla.
- [ ] `Tender`, `tender_state_transitions` y `tender_assets` existen como schema additive con FKs/checks/indexes/trigger append-only y paridad con `tender-state-machine.ts`.
- [ ] Create/ingest/attach/read/transition son commands/readers capability-gated, idempotentes, auditados y consumibles programáticamente; no hay writes ad hoc.
- [ ] Tender Intake Agent consume sólo contexto allowlisted y tools sobre los mismos readers/commands; emite propuesta tipada con trace/eval y nunca muta estado, assets ni gates humanos directamente.
- [ ] RFPs y deliverables usan únicamente el asset store canónico, siguen scan/ownership privado y preservan kind/status/audience/version/lineage.
- [ ] Transiciones terminales, saltos de estado, gates humanos, asset quarantined/incompatible y promoción interna no autorizada fallan cerrados.
- [ ] Staging verifica migration, command retry/concurrencia, asset intake/read, audit/outbox, grants y rollback; no se declara producción sin esa evidencia.
- [ ] TASK-1391 recibe un contrato documentado y testeado, o permanece bloqueada con la dependencia explícita.

## Verification

- Antes de implementar: `pnpm codex:task-hook TASK-1392`, `pnpm task:lint --task TASK-1392`, `pnpm qa:gates --changed --agent codex`.
- Durante: `pnpm vitest run src/lib/commercial/tenders`, tests de asset store/capability/agent tools-proposals, eval fixture, migration checks y `pnpm pg:connect` staging/dev según corresponda.
- Antes de cerrar: `pnpm qa:gates --changed --agent codex`, `pnpm docs:closure-check`, smoke staging de commands/assets/outbox, revisión humana de acceso/audience y lifecycle/registry sincronizados.

## Closing Protocol

- No mover a `complete/` si falta aplicar/validar el ADR RESEARCH-007, migration staging, asset access/scan, capability/grant, audit/outbox o evidencia de rollback.
- Si schema o command contradicen el ADR Accepted, dejar la task `to-do` bloqueada y corregir el contrato antes de migrar; no crear una tabla paralela ni improvisar sobre `public_tenders`.
- No cerrar como "agentic" si sólo existe un prompt: debe existir contexto tipado, tool contract sobre primitives, propuesta trazable, eval y confirmación humana real.
- Cerrar con changelog/Handoff, docs de arquitectura/método si el runtime cambia el handoff y actualización explícita de TASK-1391.

## Follow-ups

- TASK-1391 — Tender Deck Renderer Cloud Run Job, una vez que F0 provea Tender/assets/audience/versioning.
- F1 — análisis estructurado de RFP, requisito-set, matriz de admisibilidad y fit gate.
- F5 — UI/Nexa/MCP consumer de las capabilities F0+.

## Delta 2026-07-12 — el aggregate es `Proposal`, no `Tender` (ADR Accepted)

**ADR `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (Accepted 2026-07-12) manda sobre esta task.** Tres cambios **antes** de escribir la migracion — hoy cuestan cero porque la tabla no existe; despues cuestan una migracion con propuestas activas:

1. **`tenders` → `proposals`.** La tabla, el aggregate y los commands nacen como **`Proposal`**, con `origin ∈ {public_tender, private_rfp, direct_sales}`. Razon: **no toda propuesta es una licitacion** — el mismo motor sirve para cualquier propuesta tecnica de venta, y la state machine ya generaliza sola (los 12 estados mapean 1:1 a una venta directa). Se **rechaza `TechnicalProposal`**: nombra **UNA de las TRES partes** (tecnica/economica/administrativa) para referirse al todo. **NUNCA** agregar un `kind` que duplique `origin`. Renombrar tambien `tender_state_transitions`/`tender_assets`/`tender_requirements` a `proposal_*`.
2. **Nace multi-tenant (ASaaS-ready).** Toda lectura/escritura del `Proposal` y sus assets va **scopeada por org** desde la **primera** migracion (un `WHERE org_id` agregado tarde **siempre** deja un reader sin filtrar), y la capability se gatea por **entitlement per-ORG** (`module_assignments`), **NUNCA** por rol: un rol no se factura, un modulo si.
3. **El ADR de ownership sigue vigente tal cual**: RESEARCH-007 sigue dueño de `public_tender*`; la promocion ahora crea un **`Proposal` con `origin=public_tender`**.

**Correccion de routing:** la nota *"la composicion cross-format queda en Creative Studio/EPIC-028"* queda **superseded**. El motor de composicion es un **primitive de Greenhouse** (`src/lib/artifact-composer/**`, **TASK-1393**), y Creative Studio sera un **consumer del paquete**, **nunca** una reimplementacion. Creative Studio **compone flujos de generacion** (pixel); el Composer **compone frames** (layout determinista) — son cosas distintas y **no se fusionan**.

## Open Questions

- ¿RESEARCH-007 escribe `tenders` directamente mediante el command F0 o emite un handoff/outbox que Tender consume? Resolverlo en Slice 0 con una sola escritura canónica.
- ¿Cuáles contextos exactos de `GreenhouseAssetContext` y retention/prefix deben añadirse para RFP fuente y outputs, sin proliferar tipos por deliverable?
- ¿Qué rol(es) internos reciben los grants iniciales de create/ingest/read/transition y cuáles gates requieren capability separada?
