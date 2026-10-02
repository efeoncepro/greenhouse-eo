# EPIC-031 — Glitch Agentic Editorial Pipeline

## Delta 2026-09-27

- **El motor de video de Glitch ya existe y es una CLI:** motion, sonido (versión B) y música aprobados, en el repo
  taller `efeonce-brand-workshop`, `tools/glitch-motion` (TASK-1924). Con un archivo de edición y las imágenes de las
  fuentes entrega apertura, pre-roll, tarjeta final, kit de overlays, WAV y música para el editor
  ([norma de Glitch §13 y §13.13](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1313-referencia-de-comandos-y-argumentos)).
- **El paso que falta para este pipeline** es que el dominio de ediciones (TASK-1442) produzca ese archivo de edición
  y dispare el render. Hoy cada edición la corre una persona en su máquina (repo taller, `gh`, ffmpeg, HyperFrames y
  Guttery instalados; el kit completo tarda ≈ 4 min), sin autoservicio. Cómo se dispara el render desde el pipeline
  (el taller no tiene despliegue ni runtime, según su ADR) queda por decidir.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-031-glitch-agentic-editorial-pipeline`
- GitHub Issue: `none`

## Summary

Convierte la operación editorial Glitch —Daily, Flash y Weekly— en un pipeline agéntico gobernado dentro de Greenhouse. Conserva el juicio editorial y la cadencia de Notion, pero mueve estado, idempotencia, integración, observabilidad y borradores WordPress al control plane canónico.

## Why This Epic Exists

El flujo cruza doctrina editorial, skills, datos, API, Notion, scheduler/worker, Content Factory, WordPress, QA y aprobación humana. No cabe responsablemente en una task vertical ni debe resolverse copiando el starter local de Claude Cowork.

## Outcome

- Glitch #16 sirve como primer piloto controlado sin arriesgar la fecha editorial.
- Greenhouse conserva candidatas, ediciones, runs, evidencia y mappings con contratos idempotentes.
- Un agente editorial único opera Daily, Flash y Weekly con evals y golden examples.
- Notion y WordPress funcionan como adapters gobernados; el draft llega a `private` y el publish sigue humano.
- La operación semanal corre con scheduler, recovery, señales y kill switch documentados.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`

## Child Tasks

- `TASK-1440` — formaliza y acepta arquitectura, producto y gobierno editorial.
- `TASK-1441` — ejecuta Glitch #16 como piloto agéntico controlado.
- `TASK-1442` — crea la foundation de dominio, persistencia y API.
- `TASK-1443` — crea la skill editorial y su suite de evals.
- `TASK-1444` — implementa adapters Notion + Content Factory/WordPress privado.
- `TASK-1445` — implementa scheduler, orquestación y reliability.
- `TASK-1446` — ejecuta rollout gradual y cierre operativo/documental.
- `TASK-1447` — crea Glitch Desk como workbench humano de supervisión, evidencia y recovery.
- `TASK-1448` — formaliza promoción gobernada de candidata Daily/Flash a `glitchFlash` publicable.
- `TASK-1922` — Glitch en AXIS: token de franquicia `glitchLine`, archivos oficiales y contrato `efeonce.glitch-line` (composición visual; sub-línea gráfica sólo de Glitch).
- `TASK-1923` — Glitch en el Artifact Composer: catálogos `glitch-carousel` (PDF LinkedIn), `glitch-stills` y `glitch-overlays` (PNG), selector de rotación y validadores; consume el manifiesto de edición que a futuro produce `TASK-1442`.
- `TASK-1924` — Glitch en movimiento: overlays del reel/vlog, apertura y tarjeta final con HyperFrames, video con alfa por edición.

## Existing Related Work

- `TASK-1123` — Greenhouse AI Content Factory Agent Kit.
- `TASK-1337` — bloque Gutenberg `efeoncepro/glitch-drop`.
- `TASK-1323` — auto-publish guardrails; relacionado pero explícitamente fuera del camino crítico.
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`.
- `/Users/jreye/Documents/glitch-context/` — export editorial y corpus histórico de discovery.

## Exit Criteria

- [ ] ADR aceptado y PDR-003 actualizado sin duplicar arquitectura.
- [ ] Piloto #16 produce ficha Notion completa y un único draft WordPress `private`, con aprobación pública humana.
- [ ] Foundation, skill, adapters y scheduler cumplen idempotencia, audit, recovery y Full API Parity.
- [ ] Daily/Flash permanecen internos; sólo Weekly y promociones `glitchFlash` confirmadas pueden producir drafts privados.
- [ ] Glitch Desk permite inspeccionar decisiones, evidencia, runs y promociones sin duplicar lógica de negocio.
- [ ] Shadow runs y golden evals demuestran calidad editorial suficiente para activar Daily/Weekly.
- [ ] Runbook, manual, documentación funcional, changelog y handoff quedan sincronizados.

## Non-goals

- Auto-publicación pública de Glitch.
- Cockpit/editor visual nuevo en Greenhouse.
- Migración automática de Gutenberg histórico #12/#13.
- Reemplazar Notion como calendario del equipo.
- Resolver el rediseño completo de la categoría pública Glitch.
