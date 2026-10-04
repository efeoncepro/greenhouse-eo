# TASK-1672 — Efeonce Insights: especialización de auditoría técnica SEO

> Ajuste de alcance autorizado el 2026-10-04: informes pertenecen a EPIC-045; SEO conserva medición, readers y hallazgos. [Spec y deltas anteriores preservados íntegros](../../audits/insights/history/2026-10-04-seo-specialization/README.md), sin vigencia normativa. No se ha implementado la especialización.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1672-growth-seo-audit-report-artifact.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `Diseño reformulado 2026-10-04; edición especializada de auditoría técnica sin implementar. Insights ya genera/renderiza/distribuye informes; el adapter SEO no consume readSiteAuditReport y el request no liga una corrida explícita. TASK-1670/1671 complete; flag del worker ON y corrida con 2 hallazgos de sitio contrastados en auditoría 04/10. Falta binding, evidencia especializada, detalle y verificación del artefacto.`
- Rank: `TBD`
- Domain: `growth|ui`
- Blocked by: `TASK-1992` sólo Slice 6 (contrato/backend de auditoría por corrida); no espera los demás hechos ni la tarjeta de canal. Publicación conserva gates SEO/Insights.
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Una edición de Insights presenta una auditoría técnica SEO identificada por target, corrida y fecha: resumen ejecutivo de una página y detalle para quien ejecuta. Reutiliza snapshot, plan, catálogos A4/deck, web Think y ciclo de revisión/emisión existentes. No construye otro informe general, renderer ni una ruta de impresión SEO.

## Why This Task Exists

Un informe mensual de visibilidad y su tarjeta de salud no explican todos los hallazgos técnicos del crawl. El cliente necesita reenviar evidencia defendible: alcance de la muestra, qué afecta al sitio completo, páginas afectadas, prioridades y límites. La fecha y procedencia deben sobrevivir fuera de la plataforma.

## Goal

- Adaptar un crawl terminado y autorizado a la evidencia y edición inmutables de Insights.
- Un resumen ejecutivo y un detalle técnico dentro de la misma edición, con fecha visible.
- Client-safe por construcción; sin declarar sano un sitio con hallazgos no verificados.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§2, 5, 6, 7–10: dueño de ediciones y distribución.
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`: decisión existente; no nuevo deployable.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`: dueño de métricas, gates y readers.
- `readSiteAuditReport(seoTargetId, auditRunId?)` es la fuente; admite corrida explícita tenant-safe.
- `groupAuditIssues` y la partición sitio/página mantienen taxonomía y orden canónicos.
- Insights no recalcula scoring ni ETV, no consulta tablas SEO directamente y no convierte ausencia en cero.
- Snapshot/plan/output emitidos no se actualizan con un crawl nuevo: una corrección crea otra versión.
- Sin crawl terminado elegible, sin evidencia de alcance o con gate SEO no satisfecho, no se genera un artefacto técnico publicable. Un crawl parcial elegible declara su cobertura.
- Si se incluye `message_alignment`, exige posicionamiento declarado y contrato vigente de TASK-1698. La auditoría técnica puede omitir esa dimensión AEO; no se bloquea por incluirla implícitamente.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`
- `docs/ui/wireframes/TASK-1672-growth-seo-audit-report-artifact.md` (diseño pendiente de mapping final)
- `.codex/skills/efeonce-insights/SKILL.md` y su espejo Claude

## Dependencies & Impact

### Depends on

- TASK-1845/1846/1847/1888/1889/1875: foundation, render, catálogos y web disponibles; no se reconstruyen.
- TASK-1304/1309/1670/1671: reader, agrupación, materialización y presentación sitio/página, complete. Revalidar evidencia de la corrida elegida y runtime al publicar.
- TASK-1992, Slice 6: backend de audit facts y binding exacto de corrida; bloqueante sólo para ese contrato. La tarjeta de canal puede esperar TASK-1990 sin bloquear el contrato básico de auditoría. No requiere entregar los otros siete slices de 1992.
- TASK-1849: entrypoint en biblioteca/portal cuando exista; se consume su superficie, sin una cuarta pestaña SEO obligatoria.

### Blocks / Impacts

- TASK-1673 depende de esta edición especializada; compartir no genera evidencia faltante.
- EPIC-022 conserva el contrato productor SEO; EPIC-045 posee esta task y su cierre.

### Files owned

- Evidencia/request/binding/backend son ownership de TASK-1992 Slice 6, no de esta task UI. Consumir ese DTO ya validado; sin editar adapter/readers/stores por este slice.
- `src/lib/efeonce-insights/editorial/**`, `render/**` y catálogos `insights-report`/`insights-deck`: extensión acotada de detalle técnico, sin segundo renderer.
- `src/lib/copy/insights.ts`; UI de Insights y proyección Think sólo donde el contrato especializado lo requiera.
- Paths anteriores son ownership propuesto; cada slice declara paths reales y gates antes de implementar.

## Current Repo State

### Already exists

- Foundation y render de Insights (1845/1846), catálogos premium (1847/1889), contrato editorial (1888), web compartida Think (1875) y sharing/delivery (1848).
- `src/lib/growth/seo/site-audit/reader.ts`: run explícito, findings, totals y comparación; autorización por target/run.
- `src/lib/efeonce-insights/adapters/seo-adapter.ts`: desempeño GSC/ranking/ETV/GA4 y oportunidades; no consume auditoría técnica. Inspección local 2026-10-04.
- Auditoría SEO 04/10: worker `ops-worker-00762-njg`, flag ON; corrida del 28/09 con 2 hallazgos de sitio. Esta evidencia no prueba exactitud bot por bot ni el render aún inexistente.

### Gap

- Binding explícito y validado de corrida→edición: `InsightRequestV1` actual no incluye audit run.
- Evidencia técnica, resumen y detalle dentro de los contratos de Insights.
- Mapping/paginación de hallazgos y URLs, privacidad y QA de outputs especializados.
- TASK-1992 sigue to-do: su tarjeta no está entregada ni sustituye este detalle.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/efeonce-insights/**` y consumers actuales de Insights
- Future candidate home: `remain-shared`
- Rationale del candidate home: especialización de un dominio de informes existente; sin extracción anticipada.
- Boundary: consume readers SEO dueños; edición, snapshot, plan y outputs son Insights.
- Server/browser split: resolución de corrida, autorización y evidencia server-side; proyección client-safe en web.
- Build impact: `none`; reutiliza el aislamiento del render y los catálogos.
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: quien decide y reenvía; quien ejecuta cambios técnicos.
- Momento del flujo: revisar una edición congelada, incluso semanas después del crawl.
- Resultado perceptible: magnitud, fecha, tres prioridades y detalle verificable.
- Fricción que reduce: copiar manualmente URLs y perder el alcance del diagnóstico.
- No-goals UX: editor libre, cotización o explorador que sustituya la auditoría operativa.

### Surface & system decision

- Surface: edición de Insights en sus superficies existentes; entrypoint de biblioteca coordinado con TASK-1849.
- Composition Shell: `aplica`; composición de edición existente.
- Primitive decision: `reuse`; catálogos, figuras, proyección de audiencia y web Insights. Extender sólo slots necesarios para hallazgos y detalle.
- Adaptive density / The Seam: resumen y detalle conservan el orden; móvil apila URLs y evita scroll horizontal.
- Superficies flotantes: las existentes del consumer Insights, sin paneles técnicos propios dentro del PDF.
- Copy source: `src/lib/copy/insights.ts` y vocabulario canónico SEO.
- Access impact: gates Insights de audiencia/módulo/capability más autorización del target/run productor; leer SEO no concede emitir.

### State inventory

- Crawl ausente/en curso/ineligible: rechazo explícito, sin documento técnico vacío.
- Crawl parcial: cobertura y limitaciones visibles en la edición.
- Sitio sin hallazgos: afirmación acotada a checks y muestra efectivamente verificados.
- Hallazgo no verificado: razón explícita, nunca «sano».
- Stale: política del reader y as-of visible; no sustituir por la última corrida después de sellar.
- Edición borrador/emitida/retirada y enlace expirado/revocado: estados actuales de Insights.
- Long content: techo de URLs propuesto en Discovery; no truncar silenciosamente hechos o afirmaciones.
- Mobile: orden equivalente, URLs en lista; PDF con paginación estable.
- Keyboard / focus / reduced motion: contrato del consumer Insights; severidad también en texto.

### Interaction contract

- Primary interaction: leer el resumen y consultar el detalle.
- Descarga/compartir/revisión: acciones del consumer Insights con sus permisos; 1673 integra distribución.
- Pending/disabled, focus restore, alerts y errores: reusar estados actuales, sin afirmar éxito antes de tener outputs validados.

### Motion & microinteractions

- Web: motion del consumer Insights existente y fallback reducido; no agregar animación técnica propia.
- PDF/deck: composición estática, legible en blanco y negro.

### Implementation mapping

El wireframe detalla regiones, evidenceRef/asOf y extensión de catálogos. No obliga a `ReportArtifactModel`, `variant` legacy, una ruta SEO separada ni `?print=1`.

### GVC scenario plan

Capturar una edición especializada en superficies Insights vigentes, desktop 1440 y móvil 390; inspeccionar también A4 final a color y gris. Los paths/markers finales se fijan con el mapping implementable.

### Design decision log

Una edición con dos densidades; hallazgos de sitio antes de páginas; fecha visible; procedencia junto al dato; reutilización del motor y acceso de Insights. Wireframe sigue pendiente de mapping final, no ready-for-implementation.

<!-- ZONE 2 — PLAN MODE: Discovery y plan al ejecutar, no implementado en este ajuste. -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Consumo del contrato de auditoría

- Consumir el DTO y binding compatibles de organización/target/run/versión/fecha de TASK-1992 Slice 6; no implementar otro request/backend.
- Mapear evidencia audit validada al plan editorial especializado, conservando referencias/alcance y hechos `site_health.*`.
- No persistir un segundo snapshot SEO ni decidir la identidad del crawl sólo por una ventana mensual. La separación backend/UI evita convertir esta task en híbrida.

### Slice 2 — Resumen y detalle

- Resumen de una plana: dominio, fecha, alcance, salud y tres prioridades.
- Hallazgos de sitio antes de los grupos de páginas; orden canónico, severidad textual y razón de no verificación.
- URLs con límites y omisiones declaradas; procedencia de puntaje, esfuerzo y carga de laboratorio.

### Slice 3 — Consumers Insights

- Mapear plan a catálogos existentes y proyección web. Extensión de contrato sólo donde faltan slots técnicos.
- Entry points existentes de edición/revisión/descarga; conservar gates y audiencia.

### Slice 4 — Verificación y cierre

- Pruebas de exactitud de corrida, privacidad, audiencia, ausencia/stale/partial y versión inmutable.
- GVC web desktop/móvil y QA del PDF final; evidencia productiva proporcional tras release autorizado.

## Out of Scope

- Compartir/enviar: TASK-1673 sobre TASK-1848.
- Otro renderer, print route, biblioteca, tabla de snapshots, token store o sender SEO.
- Nueva captura pagada, nuevos scores, cotización o ejecución editorial.
- Incorporar AEO message_alignment sin su contrato de posicionamiento.

## Detailed Spec

La corrida seleccionada es identidad del diagnóstico; la ventana Insights da contexto, no autoriza reemplazarla por «latest». La edición sella hechos, plan, audiencia y outputs. El lector público sirve esa edición exacta y nunca consulta de nuevo el crawl para actualizar lo emitido. Los detalles técnicos deben usar slots/contratos del motor existente; si requieren extensión, se declara y valida con el dueño, sin fallback a un renderer paralelo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Binding y evidencia → plan/detalle → consumers → verificación. No se emite antes del gate de materialización SEO y la validación de outputs Insights. Activación pasada del flag no exime de comprobar la corrida elegida.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Puntaje atribuido a sitio completo o no verificado | datos/reputación | high | Alcance, as-of, taxonomía sitio/página y pruebas de ausencia/partial | revisión de edición |
| Se comparte otro run u organización | acceso | medium | Binding explícito tenant-safe y snapshot inmutable | negativos tenant/run |
| Filtración de datos internos | cliente | medium | Allowlist; tests de costo, tier, cupo e IDs proveedor/check | test no-leak |
| Detalle excede el catálogo | render | medium | Validar slots/paginación y declarar omisiones | render rechazado/QA |

### Feature flags / cutover

Reutiliza gates SEO productor e Insights generation/render/issuance/sharing. Sin nuevo flag propio obligatorio; si un slice necesita gate adicional lo justifica y registra. Estado actual se consulta en ledger, no en deltas históricos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–3 | Deshabilitar especialización/revert compatible; conservar ediciones selladas y outputs | medir en staging | sí para nuevas ediciones; copias descargadas no |
| 4 | Corregir evidencia y versión, retirar emisión si corresponde | medir | no borrar historia |

### Production verification sequence

1. Local: corrida exacta, no-leak, límites y render especializado; inspección de archivo final.
2. Staging: org/run autorizado, dos tenants, stale/partial y salida web/A4 de la misma edición.
3. Release autorizado y readback del runtime; verificar corrida y gates del entorno objetivo.
4. Revisión humana previa a emisión; documentar evidencia sin enviar correo por este cierre.

### Out-of-band coordination required

Contrato y UI de Insights/Think cuando requieren extensión; producer SEO valida semántica. Release/emisión/distribución mantienen autorización propia.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Binding explícito organización/target/audit_run_id/fecha queda validado y sellado en una edición Insights; dos corridas no se confunden ni se muta una versión.
- [ ] Evidencia viene de `readSiteAuditReport` sin SQL productor directo ni snapshot/renderer paralelo; mapping comparte hechos con TASK-1992.
- [ ] Resumen de una plana contiene dominio, fecha del crawl, alcance real y tres prioridades canónicas.
- [ ] Hallazgos de sitio preceden páginas; severidad textual distingue recuperación y entrenamiento, con razón de no verificación.
- [ ] Gate de materialización SEO revalidado para la corrida y runtime usados, sin asumir exactitud a partir del flag ON o un collect vacío.
- [ ] `message_alignment` se omite o incluye sólo con posicionamiento declarado y contrato TASK-1698 vigente.
- [ ] Procedencia distingue puntaje del proveedor, esfuerzo estimado, carga de laboratorio y as-of.
- [ ] Allowlist y test de no-fuga excluyen costo, tier, cupo, IDs proveedor y códigos de checks internos.
- [ ] Crawl ausente/en curso/ineligible rechaza emisión; parcial y stale conservan sus límites; ausencia no se vuelve cero.
- [ ] Detalle y techo de URLs se mapean a catálogos/proyección actuales; omisiones declaradas, sin truncar afirmaciones.
- [ ] Acceso por org/audiencia y gates Insights verificados; leer el audit no concede emitir/distribuir.
- [ ] Web desktop/móvil y PDF final color/gris revisados con evidencia; UI ready sólo tras mapping/gates UI sin findings.

Todos permanecen abiertos: la infraestructura reutilizada no prueba la especialización pendiente. Evidencia heredada y límites: Current Repo State y [auditoría SEO 04/10](../../audits/seo/2026-10-04-epic-022-documentation-reconciliation.md).

## Verification

- `pnpm task:lint --task TASK-1672`
- `pnpm ui:wireframe-check --task TASK-1672`
- `pnpm ui:readiness-check --task TASK-1672`
- Implementación: tests focales Insights/SEO, checks UI y GVC especializados, QA A4 final.
- `pnpm docs:closure-check`; strict context gate después de la última edición documental.

## Closing Protocol

- [ ] Lifecycle/carpeta/Status real/acceptance sincronizados con evidencia proporcional.
- [ ] README/registry y EPIC-045 sincronizados; EPIC-022 conserva dependencia productora.
- [ ] Arquitectura, manual/funcional, skill espejo y Handoff/changelog reflejan disponibilidad real.
- [ ] Contratos UI/API/MCP, gates y outputs especializados verificados; no cierre por reparenting.

## Follow-ups

- TASK-1673 integra esta edición con distribución existente.
- Anexo técnico sólo si la evidencia de límites lo justifica; sin nueva task preventiva.

## Open Questions

- Mapping del contrato/backend TASK-1992 Slice 6 al plan/catálogos: fijar en Discovery; no hay código nuevo en este ajuste.
- Techo por grupo y paginación: fijar según catálogo y QA, con omisiones explícitas.
