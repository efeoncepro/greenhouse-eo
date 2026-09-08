# TASK-1847 — Efeonce Insights: gráficos y catálogos premium para deck e informe vertical

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs-motion.md`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `TASK-1845`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entrega la biblioteca visual analítica y dos catálogos del Composer: deck horizontal e informe A4 vertical. Barras, líneas, circular/donut y dispersión derivan de ChartSpec y evidencia; marca Efeonce y cliente opcional, composición editorial y QA de cada página.

## Why This Task Exists

ChartSplit admite 2–4 barras porcentuales y el catálogo actual no resuelve un informe vertical multipágina. Hace falta un sistema editorial y cuantitativo que no deforme datos ni copie slides a una hoja A4.

## Goal

- Entregar el alcance de esta unidad con evidencia funcional y aislamiento por cliente.
- Conservar fuentes canónicas y paridad UI/API/MCP donde hay capacidades.
- Cerrar con runtime/rollout honesto, sin confundir documento, código y disponibilidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`.
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§5–6, 10 (source of truth del contrato de esta unidad).
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

Reglas: métricas en su dueño; un snapshot por edición; acceso por org; ninguna mutación de una edición emitida.
El ADR acepta planificación, no acredita implementación. Rutas/tablas nuevas son propuestas hasta materializarse.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`.
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`.

## Dependencies & Impact

### Depends on

- TASK-1845.
- Contratos de EPIC-045 y arquitectura Insights; sources de la sección siguiente.
- TASK-1846 es dependencia de integración final PDF, no del diseño de catálogos/fixtures.

### Blocks / Impacts

- EPIC-045; consumers posteriores del grafo de la arquitectura §11.
- TASK-1672/1673 conservan auditoría SEO especializada; TASK-1644 conserva VisualProfile.
- Coordinación serial en manifiestos/copy/índices compartidos; no se autoriza multiagente ni cambio de branch.

### Files owned

- `src/lib/artifact-composer/catalogs/{insights-deck,insights-report}/** (nuevos propuestos)`
- `src/components/insights/charts/** (presentación pura browser-safe propuesta, sin queries)`
- `src/lib/copy/insights.ts (claves visuales; coordinar TASK-1849)`
- `docs/ui/wireframes/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.md`

## Current Repo State

### Already exists

- `src/lib/artifact-composer/catalogs/deck-axis/chart-split.slots.json`.
- `src/lib/artifact-composer/brand-packs/axis`.
- `src/components/growth/seo/report-artifact/print/SeoReportPrint.tsx`.

### Gap

ChartSplit admite 2–4 barras porcentuales y el catálogo actual no resuelve un informe vertical multipágina. Hace falta un sistema editorial y cuantitativo que no deforme datos ni copie slides a una hoja A4. Evidencia local 2026-09-08; disponibilidad live no verificada en esta planificación.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/artifact-composer/catalogs/{insights-deck,insights-report}/** (nuevos propuestos)` dentro del checkout Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: dominio Insights y puertos de la arquitectura §3/7; Composer y Email mantienen sus autoridades.
- Server/browser split: DTO y presentación puros en browser; stores, secrets, authz y providers sólo server-side.
- Build impact: render/font/catalog aislados del grafo browser; sin nuevos SDK pesados en rutas web.
- Extraction blocker: contexto de organización, transacciones y release actuales; sin nuevo deployable ni paquetes anticipados.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Efeonce y lector cliente autorizado.
- Momento del flujo: lectura de documentos exportados.
- Resultado perceptible esperado: evidencia clara y consistente entre formatos, con marca premium y estado honesto.
- Friccion que debe reducir: reconstruir manualmente cifras, versiones y explicaciones.
- No-goals UX: editor libre, métricas inventadas ni pantallas de otros módulos.

### Surface & system decision

- Surface: catálogos deck/A4 y harness visual local.
- Nav placement: `none` — documentos, sin destino nuevo de navegación.
- Composition Shell: no aplica al canvas físico PDF; harness existente para inspección.
- Primitive decision: `extend` — catálogos/ChartSpec y primitives canónicas; lookup obligatorio antes de JSX.
- Adaptive density / The Seam: ancho disponible en web; paginación física explícita en PDF.
- Floating/Sidecar/Dialog decision: no aplica en documento estático.
- Copy source: `src/lib/copy/insights.ts` propuesto y nomenclatura canónica; números sólo del snapshot.
- Access impact: none; recibe proyección previamente autorizada.

### State inventory

- Default: edición identificada y contenido consistente.
- Loading: progreso real del reader, nunca cifras temporales inventadas.
- Empty: sin evidencia, indicar siguiente acción.
- Error: causa sanitizada y recuperación soportada.
- Degraded / partial: límites y outputs incompletos explícitos.
- Permission denied: sin datos del cliente.
- Long content: contenido continuado/paginado, nunca cortado.
- Mobile / compact: 390px sin scroll horizontal de página; gráfico con tabla equivalente.
- Keyboard / focus: orden semántico y controles accesibles; PDF conserva lectura lógica verificable.
- Reduced motion: información siempre visible; ninguna animación necesaria para comprender.

### Interaction contract

- Primary interaction: lectura y enlaces del documento.
- Hover / focus / active: estados canónicos, sin depender sólo del color.
- Pending / disabled: impedir doble acción durante request; idempotencia real vive en backend.
- Escape / click-away: no aplica al PDF.
- Focus restore: orden de lectura; sin overlays.
- Latency feedback: texto de estado, sin bloquear contenido ya disponible.
- Toast / alert behavior: alert persistente ante fallo material; éxito sólo con readback.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: sin animación; PDF y harness estáticos.
- Layout morph: no nuevo sistema; baseline del shell si aplica.
- Stagger: ninguno añadido.
- Timing / easing token: no aplica a render estático.
- Reduced-motion fallback: inmediato, contenido/foco conservados.
- Non-goal motion: contadores y gráficos animados, autoplay y parallax.

### Implementation mapping

- Route / surface: paths propuestos en Files owned, sujetos a reachability y lookup antes de implementación.
- Primitive / variant / kind: extend existentes; decisión concreta se sella en wireframe antes de UI ready yes.
- Component candidates: CompositionShell, GreenhouseBreadcrumbs y wrappers de inputs; catálogos Composer para PDF.
- Copy source: src/lib/copy/insights.ts.
- Data reader / command: contratos de TASK-1845/1846/1848; no escribir backend en esta task.
- API parity: consume lo ya expuesto por esas tasks; cualquier gap vuelve a su dueña.
- Access / capability: Insights reader y grants de target; token sólo para edición compartida.
- States to implement: todos los declarados arriba, con fixtures.

### GVC scenario plan

- Scenario file: nuevo escenario propuesto insights-catalogs; registrar ruta real durante implementación.
- Route: harness o rutas propuestas del wireframe.
- Viewports: desktop 1440 y mobile 390px; PDF a tamaño físico.
- Quality profile: premium.
- Required steps: estados default/empty/partial/error/denied, contenido largo y navegación soportada.
- Required captures: cada composición y estado crítico; PDF todas las páginas.
- Required data-capture markers: insights-root, insights-evidence, insights-output-state.
- Assertions: identidad, valores y estados correctos; sin datos internos.
- Scroll-width checks: scrollWidth === clientWidth en desktop y 390px.
- Reduced-motion / focus evidence: recorrido con teclado y prefers-reduced-motion.
- Review dossier: docs/ui/reviews/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs/ propuesto, con capturas observadas.
- Baseline decision / surface ID: nueva baseline Insights sólo después de review, sin congelar WIP ajeno.

### Design decision log

- Decision: composición editorial analítica con tokens institucionales.
- Alternatives considered: dashboard de tarjetas; documento editorial; reutilización literal de deck comercial.
- Why this pattern: lectura autónoma y evidencia comparable requieren densidad y narrativa propias.
- Reuse / extend / new primitive: reuse/extend; una primitive nueva requiere prueba de brecha y contrato canónico.
- Open risks: PDF denso y legibilidad móvil; UI ready sigue no hasta primer fold y revisión.

### Visual verification

- GVC scenario: insights-catalogs, nuevo propuesto.
- Viewports: 1440, 390px y PDF tamaño físico.
- Required captures: first fold, gráfico, tabla densa, partial/denied y cierre.
- Required data-capture markers: insights-root, insights-evidence, insights-output-state.
- Scroll-width check: obligatorio en página web y harness.
- Accessibility/focus checks: teclado, contraste, tablas equivalentes y reduced motion.
- Before/after evidence: baseline nueva, comparada con fuentes institucionales reales.
- Known visual debt: sin implementación ni evidencia visual aún.
- Visual scorecard: docs/ui/reviews/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.scorecard.json (a producir durante ejecución).
- Quality threshold: average >= 4.2; floor >= 3; fidelity/template resistance >= 4, evaluado con evidencia.

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

### Slice 1 — Dirección y contrato visual

- Comparar deck-axis extendido vs catálogo editorial analítico; fijar fuente durable, tokens, primitive lookup y ChartSpec de TASK-1845. Preparar portada, lámina analítica y página densa antes del resto; UI ready no hasta completar los gates.

### Slice 2 — Gráficos y catálogos

- Barras agrupadas/apiladas, líneas, circular/donut y dispersión con escala, fuente y tabla equivalente. Crear layouts deck y A4 con paginación por contenido, captions, índice, tablas repetidas y footer institucional; co-branding opcional sin VisualProfile paralelo.

### Slice 3 — Prueba de exportación

- Integrar con TASK-1846 para PDF final; fijar catálogo/brand/font. Pruebas cero/null/negativos/textos largos, tipografía, geometría, legibilidad e índice/enlaces; inspeccionar todas las páginas y publicar dossier visual con fixtures.

## Out of Scope

- Métricas nuevas o fórmulas duplicadas, refresh facturable automático, PPTX/DOCX, editor libre y migración general del Grader.
- Otras unidades de EPIC-045 y perfiles visuales de TASK-1644; no cambios ajenos ni nuevas ramas/worktrees.

## Detailed Spec

El contrato exigible está en `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§5–6, 10. Esta task materializa sólo su ownership.
Sin tablas nuevas. Consume EvidenceSnapshot/EditorialPlan/ChartSpec y brand packs; no cambia business commands.
Nuevos paths son propuestas explícitas; confirmar los puntos de integración en Discovery y registrar cambios materiales.
La compactación en cinco unidades no elimina pruebas ni autoriza omitir un módulo/formato por conveniencia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. No activar el consumer antes de su contrato y pruebas.
El render final integrado depende de TASK-1846; diseño y fixtures no requieren un worker activo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un gráfico correcto en pantalla pierde etiquetas o paginación al exportar | Insights | medium | Fixtures densos + PDF real + revisión de todas las páginas | insights_output_visual_rejected (propuesta) |
| Fuga entre clientes o evidencia interna | Access | medium | Allowlist, org boundary y pruebas negativas | insights_access_denied (propuesta) |

### Feature flags / cutover

Catálogos versionados consumidos sólo por el gate Insights; promoción de versión tras QA visual, sin cambiar Proposal. Registrar flags/env/DB policy con dueño y consumidores reales; no interpretar NODE_ENV como entorno.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 2 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 3 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |

### Production verification sequence

1. Local: contratos, fixtures y gates focales antes de gastar CI/cloud.
2. Staging: schema/flags/worker readback cuando aplica; canary sintético dos orgs y fallo parcial.
3. Verificar recovery y rollback; documentar evidencia y activar sólo por release autorizado.
4. Producción: comprobar SHA/config/commands/readers/outputs del lane; no inferir desde documentos.
5. Cohorte cliente consentida sólo después de certificación técnica; actualizar acceptance/status con evidencia real.

### Out-of-band coordination required

Release, activación externa y correo real tienen autorización propia; esta creación documental no los ejecuta.
No solicitar otra cuenta, secreto ni acción del cliente para pruebas técnicas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Barras, líneas, circular/donut y dispersión se renderizan desde el mismo ChartSpec validado en HTML/SVG/PDF; valores y geometría coinciden con evidencia.
- [ ] Pie/donut rechaza totales incompatibles; dispersión rechaza pares ausentes; nulos y negativos no se ocultan ni deforman.
- [ ] Deck 16:9 e informe A4 vertical tienen composiciones propias, fuentes/brand pack reales, logo opcional cliente y ID/versión/período visibles.
- [ ] A4 soporta 30 páginas, índice real, cabeceras repetidas y cortes legibles; deck soporta 25 slides sin truncado silencioso ni minificar cuerpo para encajar.
- [ ] Texto seleccionable, fuentes incrustadas, enlaces/índice, folios y pies se verifican en el PDF final; se inspeccionaron todas las páginas exportadas.
- [ ] No se crea registry VisualProfile paralelo a TASK-1644 ni se altera el catálogo Proposal; cualquier primitive genérica necesaria se devuelve a TASK-1846.
- [ ] UI ready permanece no hasta mapping/GVC/design log completos; wireframe existe y ui:wireframe-check pasa.
- [ ] Reuso/extend documentado, copy reusable canónico, estados partial/empty/error y reduced motion sin pérdida de información; no se introducen animaciones.
- [ ] GVC premium desktop y 390px del harness observado, scrollWidth igual a clientWidth; páginas PDF se validan a tamaño físico y en escala de grises.
- [ ] Regresión visual del Composer y test cuantitativo funcional pasan; rollout de catálogo versionado con worker se verifica antes de declarar formatos disponibles.

## Verification

- `pnpm composer:visual-gate`; antes de baseline/freeze leer `docs/operations/runbooks/composer-visual-gate.md`.
- `pnpm composer:brand-pack --check` y tests de Composer; baseline sólo serializado y con ownership claro.

- `pnpm task:lint --task TASK-1847`: template=1, legacy=0, errors=0, warnings=0.
- `pnpm qa:gates --changed` durante implementación; lint/typecheck y tests focales por diff.
- `pnpm ui:wireframe-check --task TASK-1847`; GVC observado y export real según contrato.
- Verificar runtime por capa; no usar guardas textuales para certificar comportamiento.
- `pnpm docs:closure-check` y, después de toda edición de contexto, `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] Lifecycle, carpeta, Status real y acceptance actualizados con evidencia; sin rollout no se declara complete.
- [ ] TASK_ID_REGISTRY, README y EPIC-045 sincronizados; remover blockers obsoletos en dependientes.
- [ ] Arquitectura técnica, documentación funcional y manual/runbook actualizados proporcionalmente.
- [ ] Handoff/changelog y contratos UI/API/MCP reflejan disponibilidad real.
- [ ] Regresiones, señales, rollback y gates documentales pasan; no commit/push/deploy automático.

## Follow-ups

PPTX/DOCX y gráficos adicionales se evalúan por demanda; no crear tasks preventivas. Los gaps dentro de esta
unidad se resuelven en sus slices. TASK-1672/1673 conservan la integración especializada SEO.

## Open Questions

Sin preguntas que bloqueen el registro. Confirmar límites, rutas y mapping propuestos en Discovery contra
código/runtime; no inventar disponibilidad. Antes de implementar, /goal explícito y codex:task-hook.
