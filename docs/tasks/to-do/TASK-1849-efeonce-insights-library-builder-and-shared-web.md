# TASK-1849 — Efeonce Insights: biblioteca, creación y experiencia web compartida

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
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1849-efeonce-insights-library-builder-and-shared-web.md`
- Flow: `docs/ui/flows/TASK-1849-efeonce-insights-library-builder-and-shared-web-flow.md`
- Motion: `docs/ui/motion/TASK-1849-efeonce-insights-library-builder-and-shared-web-motion.md`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|agency`
- Blocked by: `TASK-1845, TASK-1846, TASK-1847, TASK-1848`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la biblioteca Insights por cliente/período/módulo, el encargo y revisión de ediciones, las tres salidas y la vista web por token. Consume commands/readers ya contratados y presenta envío/recurrencia sin otra lógica de negocio.

## Why This Task Exists

Una API de generación no permite al operador revisar y compartir con claridad ni al cliente leer un informe web. Las tres salidas deben tener continuidad de identidad y estado sin confundir generación, emisión y entrega.

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
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§1, 4–11 (source of truth del contrato de esta unidad).
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

- TASK-1845, TASK-1846, TASK-1847, TASK-1848.
- Contratos de EPIC-045 y arquitectura Insights; sources de la sección siguiente.

### Blocks / Impacts

- EPIC-045; consumers posteriores del grafo de la arquitectura §11.
- TASK-1672/1673 conservan auditoría SEO especializada; TASK-1644 conserva VisualProfile.
- Coordinación serial en manifiestos/copy/índices compartidos; no se autoriza multiagente ni cambio de branch.

### Files owned

- `src/views/greenhouse/insights/** (nuevo propuesto)`
- `src/components/insights/{library,builder,viewer}/** (nuevo propuesto; charts de TASK-1847)`
- `src/app/(dashboard)/insights/** y src/app/insights/shared/** (rutas propuestas)`
- `src/lib/copy/insights.ts y src/config/greenhouse-nomenclature.ts (claves Insights, serializadas)`
- `src/emails/insights-ready.tsx (presentación nueva propuesta sobre EmailLayout)`
- `registro de navegación y GVC para Insights; puntos exactos se verifican antes del JSX`

## Current Repo State

### Already exists

- `src/components/greenhouse/primitives/index.ts`.
- `src/components/growth/seo/report-artifact/web/SeoReportArtifact.tsx`.
- `src/emails/components/EmailLayout.tsx`.

### Gap

Una API de generación no permite al operador revisar y compartir con claridad ni al cliente leer un informe web. Las tres salidas deben tener continuidad de identidad y estado sin confundir generación, emisión y entrega. Evidencia local 2026-09-08; disponibilidad live no verificada en esta planificación.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/insights/** (nuevo propuesto)` dentro del checkout Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: dominio Insights y puertos de la arquitectura §3/7; Composer y Email mantienen sus autoridades.
- Server/browser split: DTO y presentación puros en browser; stores, secrets, authz y providers sólo server-side.
- Build impact: render/font/catalog aislados del grafo browser; sin nuevos SDK pesados en rutas web.
- Extraction blocker: contexto de organización, transacciones y release actuales; sin nuevo deployable ni paquetes anticipados.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Efeonce y lector cliente autorizado.
- Momento del flujo: crear, revisar, compartir y leer una edición.
- Resultado perceptible esperado: evidencia clara y consistente entre formatos, con marca premium y estado honesto.
- Friccion que debe reducir: reconstruir manualmente cifras, versiones y explicaciones.
- No-goals UX: editor libre, métricas inventadas ni pantallas de otros módulos.

### Surface & system decision

- Surface: biblioteca, builder, detalle de edición y vista web compartida.
- Nav placement: `sidebar` — Insights dentro de zona operativa existente, sin primer nivel nuevo ni duplicación.
- Composition Shell: aplica a biblioteca/builder/detalle; shared usa composición editorial sin chrome privado.
- Primitive decision: `extend` — catálogos/ChartSpec y primitives canónicas; lookup obligatorio antes de JSX.
- Adaptive density / The Seam: ancho disponible en web; paginación física explícita en PDF.
- Floating/Sidecar/Dialog decision: AdaptiveSidecar para previsualización y confirmaciones canónicas, descritas en flow.
- Copy source: `src/lib/copy/insights.ts` propuesto y nomenclatura canónica; números sólo del snapshot.
- Access impact: views + entitlements, consume policy de tasks backend sin modificarla.

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

- Primary interaction: crear encargo, revisar, emitir y compartir mediante commands.
- Hover / focus / active: estados canónicos, sin depender sólo del color.
- Pending / disabled: impedir doble acción durante request; idempotencia real vive en backend.
- Escape / click-away: cierre de superficie reversible; dirty state requiere confirmación.
- Focus restore: al invocador al cerrar sidecar/confirmación.
- Latency feedback: texto de estado, sin bloquear contenido ya disponible.
- Toast / alert behavior: alert persistente ante fallo material; éxito sólo con readback.

### Motion & microinteractions

- Motion primitive: `Motion`
- Enter / exit: wrappers canónicos del shell; contrato motion enlazado.
- Layout morph: no nuevo sistema; baseline del shell si aplica.
- Stagger: ninguno añadido.
- Timing / easing token: tokens canónicos, sin valores literales.
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

- Scenario file: nuevo escenario propuesto insights-journey; registrar ruta real durante implementación.
- Route: harness o rutas propuestas del wireframe.
- Viewports: desktop 1440 y mobile 390px; PDF a tamaño físico.
- Quality profile: premium.
- Required steps: estados default/empty/partial/error/denied, contenido largo y navegación soportada.
- Required captures: cada composición y estado crítico; PDF todas las páginas.
- Required data-capture markers: insights-root, insights-evidence, insights-output-state.
- Assertions: identidad, valores y estados correctos; sin datos internos.
- Scroll-width checks: scrollWidth === clientWidth en desktop y 390px.
- Reduced-motion / focus evidence: recorrido con teclado y prefers-reduced-motion.
- Review dossier: docs/ui/reviews/TASK-1849-efeonce-insights-library-builder-and-shared-web/ propuesto, con capturas observadas.
- Baseline decision / surface ID: nueva baseline Insights sólo después de review, sin congelar WIP ajeno.

### Design decision log

- Decision: composición editorial analítica con tokens institucionales.
- Alternatives considered: dashboard de tarjetas; documento editorial; reutilización literal de deck comercial.
- Why this pattern: lectura autónoma y evidencia comparable requieren densidad y narrativa propias.
- Reuse / extend / new primitive: reuse/extend; una primitive nueva requiere prueba de brecha y contrato canónico.
- Open risks: PDF denso y legibilidad móvil; UI ready sigue no hasta primer fold y revisión.

### Visual verification

- GVC scenario: insights-journey, nuevo propuesto.
- Viewports: 1440, 390px y PDF tamaño físico.
- Required captures: first fold, gráfico, tabla densa, partial/denied y cierre.
- Required data-capture markers: insights-root, insights-evidence, insights-output-state.
- Scroll-width check: obligatorio en página web y harness.
- Accessibility/focus checks: teclado, contraste, tablas equivalentes y reduced motion.
- Before/after evidence: baseline nueva, comparada con fuentes institucionales reales.
- Known visual debt: sin implementación ni evidencia visual aún.
- Visual scorecard: docs/ui/reviews/TASK-1849-efeonce-insights-library-builder-and-shared-web.scorecard.json (a producir durante ejecución).
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

### Slice 1 — Dirección, navegación y contrato

- Fijar dirección premium repo-native, comparar biblioteca editorial vs dashboard de KPIs y adoptar CompositionShell. Registrar navigation budget, wireframe/flow/motion, mapping y copy/state ledger; sin duplicar destinos.

### Slice 2 — Biblioteca, encargo y revisión

- Cliente/período/módulo, outputs y brand opcional; validación/preflight, estado por fase/target, historial de versiones y acciones de revisar/emitir/reintentar/cancelar por commands. Detalle conserva identity y aprobación exacta.

### Slice 3 — Web, compartir y entrega

- Vista token responsive por capítulos y gráficos accesibles sobre datos congelados; controles de grants/downloadPolicy/expiry/revoke y envío/recurrencia con consecuencias visibles. Presentación del email sobre componentes existentes, sin implementar transporte.

### Slice 4 — Recorrido y cierre integrado

- GVC premium desktop+390px, teclado, reduced motion, links expirados/revocados/unknown y parciales; mismo ID/cifras en web/deck/A4. E2E creación API y MCP visibles en UI, y creación UI visible por readers; producción sólo tras gate de release.

## Out of Scope

- Métricas nuevas o fórmulas duplicadas, refresh facturable automático, PPTX/DOCX, editor libre y migración general del Grader.
- Otras unidades de EPIC-045 y perfiles visuales de TASK-1644; no cambios ajenos ni nuevas ramas/worktrees.

## Detailed Spec

El contrato exigible está en `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§1, 4–11. Esta task materializa sólo su ownership.
Sin DDL ni commands nuevos; consume contratos de TASK-1845/1846/1848.
Nuevos paths son propuestas explícitas; confirmar los puntos de integración en Discovery y registrar cambios materiales.
La compactación en cinco unidades no elimina pruebas ni autoriza omitir un módulo/formato por conveniencia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4. No activar el consumer antes de su contrato y pruebas.
Respetar Blocked by; sólo preparación documental puede anteceder dependencias.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI muestra listo aunque un target o la entrega falló | Insights | medium | Estados por edición/output/delivery consumidos del reader; fixture de fallo parcial | insights_ui_contract_mismatch (propuesta) |
| Fuga entre clientes o evidencia interna | Access | medium | Allowlist, org boundary y pruebas negativas | insights_access_denied (propuesta) |

### Feature flags / cutover

Consume gates backend y entitlement Insights; ruta shared no habilita biblioteca ni otras acciones. Sin nueva regla de negocio en UI. Registrar flags/env/DB policy con dueño y consumidores reales; no interpretar NODE_ENV como entorno.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 2 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 3 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 4 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |

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

- [ ] Biblioteca organiza por cliente/período/módulo y presenta ID/versión/output/estado; una misma edición reúne web/deck/A4 y cada archivo se identifica.
- [ ] Form de encargo valida ventana/comparación/módulos/brand/outputs vía command; ninguna query ni cálculo de negocio vive en UI.
- [ ] UI ready no hasta contratos completos; wireframe/flow/motion existen y gates pasan; source durable, mapping, decision log y GVC premium documentados.
- [ ] CompositionShell y primitives canónicas se reusan/expanden con rationale; nav dentro de zona y nav:budget/reachability pasan sin destino duplicado.
- [ ] Edición nueva/revisión/emisión/retirada se distinguen; cambios de contenido o destinatarios invalidan aprobación visible; progreso por fase sin porcentaje inventado.
- [ ] Web tiene capítulos, gráficos interactivos accesibles y tablas equivalentes; selección local no consulta otra ventana ni filtra evidencia interna.
- [ ] Unknown/expired/revoked/denied no revelan cliente; sharing muestra descarga, expiración y revocación por enlace; adjunto advierte irrevocabilidad.
- [ ] Correo preview usa EmailLayout/contexto canónico, branding Efeonce y link autorizado; no token en tracking; no sender nuevo.
- [ ] Estados loading/empty/error/partial/denied/long/mobile, teclado/foco/reduced motion y copy reusable canónico verificados; no scroll horizontal de página a 390px.
- [ ] E2E API/MCP/UI conserva edición y valores entre tres formatos, niega otro tenant y revoke; GVC observado, QA/gates y rollback de superficies probado.

## Verification

- `pnpm task:lint --task TASK-1849`: template=1, legacy=0, errors=0, warnings=0.
- `pnpm qa:gates --changed` durante implementación; lint/typecheck y tests focales por diff.
- `pnpm ui:wireframe-check --task TASK-1849`; GVC observado y export real según contrato.
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
