# TASK-1995 — Efeonce Insights: decidir las fuentes que faltan (Bing, Core Web Vitals, indexación, piezas por canal o formato, redes y pauta)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `Diseño; inventario de tarjetas de Insights aprobado por el operador el 2026-10-03 (cifras «sin fuente»)`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El inventario de tarjetas aprobado el 2026-10-03 deja tres grupos de cifras **sin fuente**: Bing, Core Web Vitals e
indexación; piezas por canal o formato; y redes y pauta (alcance, interacción, inversión). Ninguna tarjeta se dibuja
sin un dato medido, así que primero hay que decidir, por grupo, de dónde sale el dato, qué dominio es dueño, si ya hay
una task que lo captura y si Insights lo consume como módulo nuevo o como hechos de uno existente. Esta task registra
esas decisiones con el operador y abre (o redirige) el trabajo de implementación; no implementa nada.

## Why This Task Exists

Tablero `Cifras-Canal-Inventario` del canvas <https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>, filas «Sin fuente»,
verificadas en el repo el 2026-10-03:

- **Bing, Core Web Vitals e indexación:** «No hay motor, CrUX ni URL Inspection en SV360». EPIC-022 ya dejó escrito
  que Core Web Vitals se resuelve con CrUX gratis (datos de campo) y congeló TASK-1281 (headless propio); URL
  Inspection e indexación están planificadas en TASK-1426 (Search Console multipropiedad). Bing no tiene task ni
  conector.
- **Piezas por canal o formato:** «Notion no trae canal ni formato de la pieza». Requiere una propiedad nueva en las
  bases de tareas de Notion y su sync (dominio Notion/delivery), antes de cualquier hecho ICO.
- **Redes y pauta:** «No hay módulo de Insights para estos canales». Existen piezas cercanas: TASK-1344 (primitive
  gobernado de Metricool para redes), TASK-1910 (Marketing Studio: lectura de Meta Ads y LinkedIn Ads) y TASK-1892
  (métricas de Marketing Studio). Ninguna alimenta Insights.

Si cada grupo se implementa por separado sin esta decisión, se arriesga un segundo conector de redes, una captura
paralela de Search Console o una propiedad de Notion sin dueño.

## Goal

- Una decisión registrada por grupo: fuente, dominio dueño, task dueña (existente o nueva), módulo de Insights que la
  consume y prioridad.
- Tasks hijas creadas sólo donde no haya dueña, y deltas en las dueñas existentes con el pedido de Insights.
- El inventario de AXIS (Lab, `/references/insights/#cifras-canal-inventario`) y el contrato de contenido
  (`presentation/content-contract.ts`) quedan coherentes con la decisión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§3 ownership, §15 contrato de contenido)
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-022-growth-seo-search-visibility-360-module.md` (decisión de CrUX y tasks congeladas)
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` (Notion sync)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- Insights consume readers de dominios dueños; nunca captura un proveedor por su cuenta.
- Una fuente nueva nace en su dominio (SEO, delivery/Notion, Marketing Studio o redes) con contrato gobernado.
- Ninguna tarjeta se dibuja con un dato que no existe: hasta decidir, el contrato de contenido declara `no_evidence`.

## Normative Docs

- `docs/tasks/to-do/TASK-1426-search-console-multi-property-discovery.md`
- `docs/tasks/to-do/TASK-1281-growth-ai-visibility-headless-probe-runtime.md`
- `docs/tasks/to-do/TASK-1344-metricool-social-scheduling-governed-integration.md`
- `docs/tasks/to-do/TASK-1910-marketing-studio-measurement-ad-readback-attribution-landing.md`
- `docs/tasks/to-do/TASK-1892-marketing-studio-greenhouse-metrics.md`

## Dependencies & Impact

### Depends on

- Disponibilidad del operador para decidir los tres grupos.

### Blocks / Impacts

- Tasks hijas que esta decisión abra (una por grupo con dueño nuevo).
- `TASK-1426`, `TASK-1344`, `TASK-1910`: reciben delta si la decisión los nombra como dueños.
- `TASK-1996`: las tarjetas de estos grupos siguen fuera del render hasta que exista su fuente.

### Files owned

- `docs/tasks/to-do/TASK-1995-efeonce-insights-missing-sources-decision.md`
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (sección de fuentes pendientes)

## Current Repo State

### Already exists

- Contrato de contenido con veredictos por pregunta y módulo (`src/lib/efeonce-insights/presentation/content-contract.ts`).
- Search Console web por organización (`src/lib/growth/search-console/api-client.ts`).
- Tasks dueñas candidatas: TASK-1426 (URL Inspection, multipropiedad), TASK-1344 (Metricool), TASK-1910 (Meta y
  LinkedIn Ads), TASK-1892 (métricas de Marketing Studio).

### Gap

- Ninguna fuente para Bing, CrUX, piezas por canal o formato, ni redes y pauta llega a Insights.
- No hay decisión de qué módulo de Insights consumiría redes y pauta.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `docs/tasks y docs/architecture (decisión documental, sin código)`
- Future candidate home: `remain-shared`
- Boundary: la decisión asigna cada fuente a su dominio dueño; Insights sólo consume readers
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Búsqueda: Bing, Core Web Vitals e indexación

- Decisión documentada: CrUX (API pública de campo) como fuente de Core Web Vitals en el dominio SEO; indexación por
  URL Inspection dentro de TASK-1426; Bing Webmaster Tools sí o no, con su costo de conexión por cliente.
- Delta en TASK-1426 si Insights consume su indexación; task hija en EPIC-022 para CrUX y, si se decide, para Bing.

### Slice 2 — Piezas por canal o formato

- Decisión documentada: propiedad nueva en las bases de tareas de Notion (nombre, valores cerrados, quién la llena),
  su sync y el reader ICO. Task hija en el dominio Notion/delivery si se aprueba.

### Slice 3 — Redes y pauta

- Decisión documentada: módulo nuevo de Insights (por ejemplo `social`) o hechos dentro de uno existente; fuentes
  (Metricool para redes orgánicas, lectura de Meta Ads y LinkedIn Ads de Marketing Studio para pauta) y su orden.
- Deltas en TASK-1344/TASK-1910 con el pedido de Insights; task hija en EPIC-045 para el adapter si se aprueba.

### Slice 4 — Registro

- Sección de fuentes pendientes en la arquitectura de Insights con la decisión por grupo y sus tasks; README de tasks
  y registry actualizados con las hijas.

## Out of Scope

- Implementar conectores, capturas, propiedades de Notion o adapters.
- Dibujar tarjetas de estos grupos.

## Detailed Spec

Tabla de decisión que esta task completa con el operador (una fila por cifra del inventario):

| Cifra | Fuente candidata | Dominio dueño | Task dueña candidata | Consumo en Insights |
|---|---|---|---|---|
| Bing | Bing Webmaster Tools API (conexión por cliente) | SEO (EPIC-022) | nueva, si se aprueba | hechos del adapter SEO con canal `bing` |
| Core Web Vitals | CrUX API (datos de campo, gratis) | SEO (EPIC-022) | nueva; TASK-1281 sigue congelada | hechos del adapter SEO, glifo `web` |
| Indexación | URL Inspection de Search Console | SEO (EPIC-022) | TASK-1426 | hechos del adapter SEO con canal `google_search_console` |
| Piezas por canal o formato | propiedad nueva en las bases de tareas de Notion + sync | Notion / delivery | nueva, si se aprueba | hechos del adapter ICO con canal de la red |
| Alcance e interacción en redes | Metricool | redes (primitive de TASK-1344) | TASK-1344 + adapter nuevo | módulo nuevo de Insights o hechos de uno existente |
| Inversión y resultados de pauta | lectura de Meta Ads y LinkedIn Ads | Marketing Studio (EPIC-049) | TASK-1910 | mismo módulo que redes |

## Rollout Plan & Risk Matrix

Impact-only: esta task no cambia runtime.

### Slice ordering hard rule

- Slices 1, 2 y 3 son independientes; Slice 4 registra lo decidido. Ninguna task hija se crea sin decisión registrada.

### Risk matrix

N/A operationally safe — decisión documental sin runtime. El riesgo que mitiga es organizacional: un segundo conector
o una propiedad sin dueño si los grupos se implementan sin decidir.

### Feature flags / cutover

- Sin flag — decisión documental, sin cambio de runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–4 | revertir el documento y retirar las tasks hijas no tomadas | < 15 min | si |

### Production verification sequence

- N/A — no hay despliegue; la verificación es la revisión del operador de cada decisión.

### Out-of-band coordination required

- Decisión del operador por grupo; para piezas por canal o formato, acuerdo con el equipo de delivery sobre la
  propiedad de Notion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Hay una decisión registrada, con fecha y autor, para cada uno de los tres grupos (fuente, dominio dueño, task dueña, módulo de Insights).
- [ ] Cada grupo aprobado tiene una task dueña: delta en la existente o task hija nueva registrada en registry y README.
- [ ] Cada grupo rechazado o diferido queda como `no_evidence` en el contrato de contenido con su causa.
- [ ] La arquitectura de Insights tiene la sección de fuentes pendientes enlazada a las tasks.

## Verification

- Revisión manual del operador.
- `pnpm task:lint --task TASK-1995` y, para cada task hija, `pnpm task:lint --task TASK-###`.
- `pnpm ops:lint --changed`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Inventario del Lab de AXIS coherente con la decisión (pedido a la sesión de AXIS si cambia el texto).

## Follow-ups

- Tasks hijas por grupo, según la decisión.

## Open Questions

- ¿Bing aporta lo suficiente en Chile y LATAM para justificar una conexión por cliente? Propuesta: medir antes la
  participación de Bing en las sesiones orgánicas de GA4 de Berel y Sky.
- ¿Redes y pauta van en Insights o se quedan en Marketing Studio con un enlace desde el informe? Propuesta: módulo
  nuevo de Insights que consume los readers de Marketing Studio, para no tener dos informes del mismo cliente.
