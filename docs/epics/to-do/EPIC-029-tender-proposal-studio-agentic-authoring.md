# EPIC-029 — Tender Proposal Studio: plataforma agéntica de construcción de propuestas

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Foundation shipped (F0+F4+render+portal+chapter-author); coordinando el fan-out de autoría + los nodos §5-ter restantes + F1`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-029-tender-proposal-studio-agentic-authoring`
- GitHub Issue: `n/a`

## Summary

Coordina el programa del **Tender Proposal Studio**: la plataforma agéntica con la que Efeonce construye propuestas comerciales (licitación pública, RFP privado o venta directa) dentro de Greenhouse, con el método `bid-construction-playbook` como spec funcional y el caso SKY como primer vertical real. La foundation ya está shipped (aggregate `Proposal` + composer domain-free + render pipeline gobernado + versionado/portal + Nexa actions + **motor de chapter-authors servicio-agnóstico**); este epic agrupa lo construido y ordena lo que falta: la superficie de parity del chapter-author (Nexa/MCP), los authors productivos por servicio, los otros dos nodos de juicio de `§5-ter` (orquestador + verifier) y la F1 canónica (análisis + admisibilidad del RFP).

## Why This Epic Exists

El Studio creció como un programa multi-task sin épica ancla: 8 tasks completas (`TASK-1391/1392/1393/1399/1412/1413/1414/1415`) colgaban contextualmente de `EPIC-027` (que gobierna la frontera de deployables, no el producto). Con el fan-out que viene — un chapter-author por línea de servicio, dos nodos agénticos nuevos, la fase de admisibilidad — la coordinación (orden, dependencias, criterios de salida del programa, decisión de flags acoplados) no cabe en ninguna task individual. La decisión de crear el epic la tomó el operador el 2026-07-16 (Open Question declarada en `TASK-1415`).

## Outcome

- Una propuesta se construye end-to-end por la plataforma: intake → análisis/admisibilidad (F1) → autoría por capítulos (chapter-authors) → verificación → render gobernado → entrega, con gates humanos en cada cruce.
- El motor de chapter-authors opera desde Nexa/MCP (Full API Parity) y tiene un author productivo por línea de servicio activa, cada uno con su eval baseline.
- Los 3 nodos de juicio de `§5-ter` (orquestador · chapter-authors · verifier) existen y están probados en aislamiento y en conjunto.
- Los flags del Studio (`ARTIFACT_RENDER_JOBS_ENABLED` · `NEXA_PROPOSAL_ACTIONS_ENABLED` · `TENDER_CHAPTER_AUTHOR_ENABLED` + los que nazcan) tienen una decisión de rollout coherente (están acoplados por el flujo, no por el código).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` — el spec maestro (§5-bis stack de agentes · §5-ter topología Accepted · §9 fases F0-F5)
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` — el composer como primitive de plataforma (catálogos = dato)
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md` — render gobernado (`artifact-worker`)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` — los 3 principios raíz + invariantes por sub-sistema
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — cada capability nace con contrato gobernado (UI/Nexa/MCP por construcción)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` — el dominio es candidato a package bajo `EPIC-027`; trabajo nuevo nace extraction-ready

## Child Tasks

- `TASK-1416` — Governed action Nexa + tool MCP del chapter-author (la 3ª y 4ª pata de parity del motor)
- `TASK-1417` — Chapter-author económico (fuente: motor de pricing/cotizador → lámina `pricing`)
- `TASK-1418` — Chapter-author de equipo/squad (fuente: roster real de members → lámina `team-gallery`, fotos reales allowlist)
- `TASK-1419` — Orquestador del deck (§5-ter nodo 1: outline de capítulos + fan-out determinista sobre los authors)
- `TASK-1420` — Verifier del deck (§5-ter nodo 3: veredicto estructurado de integridad/registro/coherencia + gate humano)
- `TASK-1421` — F1 canónica: análisis + admisibilidad del RFP (requisito-set + matriz de admisibilidad + fit score → gate humano)

Los chapter-authors restantes (creativo, social media, web/CRM, HubSpot, contenido) se crean como tasks hijas nuevas **cuando su fuente de datos canónica exista** — un author sin fuente estructurada real sería un stub especulativo (regla de robustez del task-planner). El molde para crearlos: la costura "Un chapter-author nuevo" del companion `proposal-studio-runtime.md`.

## Existing Related Work

- `TASK-1392` (complete) — F0: aggregate `Proposal` + state machine + gates humanos + entitlement per-ORG + intake agent
- `TASK-1393` (complete) — Artifact Composer extraído como primitive domain-free + catálogo `deck-axis`
- `TASK-1391` (complete) — render pipeline gobernado (`proposal_render_jobs` + `artifact-worker` Cloud Run Job + render agent)
- `TASK-1399` (complete) — 4 acciones gobernadas de Nexa + tool `proposal_status` (flag OFF)
- `TASK-1412` (complete) — versionado derivado de artefactos + contrato de descarga
- `TASK-1413` (complete) — superficie de portal `/admin/commercial/proposals` (ver/descargar)
- `TASK-1414` (complete) — láminas de operaciones reusables del deck
- `TASK-1415` (complete) — **motor de chapter-authors servicio-agnóstico** + diagnóstico (SEO/AEO) + prueba de agnosticismo (credenciales)
- Skill `greenhouse-public-private-tenders` (método 10-fases + companion `proposal-studio-runtime.md`)
- `EPIC-027` — gobierna la frontera de deployables (el `artifact-worker` fue su excepción documentada); este epic NO autoriza deployables nuevos

## Exit Criteria

- [ ] `TASK-1416…1421` completas (o explícitamente re-scopeadas con delta documentado).
- [ ] Una propuesta real (el siguiente caso comercial vivo) atraviesa intake → F1 → autoría por chapter-authors → verifier → render → entrega usando la plataforma, con evidencia en el task/Handoff.
- [ ] Cada author productivo tiene eval baseline verde en CI y su corrida real documentada.
- [ ] Decisión de rollout de los flags del Studio tomada y ejecutada (ON en prod, o explícitamente diferida con razón por el operador).
- [ ] El arch doc `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` refleja el estado real al cierre (sin "mentiras de estado").

## Non-goals

- **UI de autoría del Studio** (F5 write) — la lectura/descarga ya existe (TASK-1413); una UI de autoría se decide después del loop Nexa probado.
- **Discovery público de oportunidades** (RESEARCH-007 / `public_tenders*`) — programa aparte; la frontera es el command de promoción con confirmación humana.
- **Deployables/paquetes nuevos** — la frontera física la gobierna `EPIC-027`; trabajo nuevo declara Modular Placement y nace extraction-ready, sin anticipar `apps/*`/`packages/*`.
- **Prender flags en producción como parte del epic** — cada flip es decisión explícita del operador con su gate (release control plane cuando aplique).
- **Renderers nuevos (PPTX nativo, Adobe Express)** — tienen su propio ADR de dirección; entran al programa sólo si el operador los prioriza.
