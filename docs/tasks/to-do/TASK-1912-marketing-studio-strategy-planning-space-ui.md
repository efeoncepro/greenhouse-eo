# TASK-1912 — Marketing Studio: UI del espacio de planificación estratégica

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
- Wireframe: `docs/ui/wireframes/TASK-1912-marketing-studio-strategy-planning-space.md`
- Flow: `docs/ui/flows/TASK-1912-marketing-studio-strategy-planning-space-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-09-26; dirección visual de planificación sin aprobar (el Slice 1 la produce)`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1895 (Sheet, ConfirmDialog, ConflictDialog, WriteGateNotice, cliente studio-api) · TASK-1907 (plan, en staging) · por sección: TASK-1905 (Audiencias), TASK-1908 (SEO/AEO), TASK-1909 (procedencia), TASK-1910 (progreso y chequeo de destino), TASK-1911 (Experimentos, Aprendizajes)`
- Branch: `efeonce-marketing-studio main (código, e2e) · Greenhouse develop (canvas, wireframe, flow, scorecard, docs); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye en `studio.efeonce.org` la cara visible de la capa de estrategia: la pestaña **Estrategia** del espacio de
campaña con secciones (Resumen, Metas, Audiencias, Mensajes, Contenidos, SEO/AEO, Medición, Experimentos), la
aprobación del plan en dos pasos (faltantes y diff, luego confirmación), el hueco de contenidos con vínculo a piezas
reales, la procedencia del contenido redactado con IA, la **biblioteca de aprendizajes** y la vista de **programas**.
Es cliente puro de las operaciones de TASK-1905/1907/1908/1909/1910/1911: no agrega endpoints ni reglas de negocio.

## Why This Task Exists

- El ADR de capa de estrategia deja la UI como consumidora de los mismos commands (§4.1): toda acción visible tiene su
  operación y su tool. Sin superficie, el plan sólo lo ven agentes y quien use la API.
- El valor principal del plan para el equipo es **ver** qué falta para aprobar y qué falta producir; eso es una
  experiencia, no un endpoint.
- La regla de tasks híbridas pide separar la base `backend-data` (TASK-1905…1911) del consumidor `ui-ux`. TASK-1895
  ya es grande (edición, revisión, métricas) y su flujo no contempla la capa de estrategia; sumarla ahí mezclaría
  contratos con dueños distintos, por eso esta task es propia y la dirección visual se diseña aparte.

## Goal

- Pestaña Estrategia con sus ocho secciones sobre la dirección `v4 · Estrategia` aprobada.
- Aprobación del plan con `dryRun`, faltantes enlazados, diff y confirmación; la versión aprobada se ve fija.
- Hueco de contenidos visible y cubrible desde la UI con vínculos a piezas, copys, anuncios y posts reales.
- Biblioteca de aprendizajes y vista de programa alcanzables por ⌘K y enlaces contextuales.
- Evidencia visual premium en 1440 y 390, claro y oscuro, sin scroll horizontal de página.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (§4.1 paridad, §4.4, §4.5,
  §4.6, §4.7, §5 niveles, §8)
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` (master flow: actores, resolución de superficie, reglas de
  affordance, copy, cobertura de evidencia)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§8 interfaz)
- `docs/ui/wireframes/TASK-1895-marketing-studio-editing-review-metrics.md` y su flow (superficies reusadas)

Reglas obligatorias:

- Sin lógica de negocio en el navegador: faltantes, hueco, comparaciones SEO/AEO, progreso de metas y permisos llegan
  resueltos del servidor.
- Toda escritura por `/api/v1` desde el cliente único `apps/web/src/client/studio-api.ts`; `T2` siempre por `dryRun` →
  confirmación; sin Server Actions.
- Una acción sin permiso se ve, es enfocable (`aria-disabled`) y explica su razón (regla del master flow).
- Snapshot de planificación y dato actual nunca comparten encabezado ni estilo; ausencia nunca se dibuja como «0».
- Dato competitivo con `.chip` «Interno» y nunca en una superficie para actores no internos.
- Rail global con 5 destinos (límite del master flow): aprendizajes y programas van por ⌘K y enlaces contextuales.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` (scorecard y umbrales; Studio aplica el mismo rigor)
- `.claude/skills/efeonce-marketing-studio/SKILL.md` (UI aprobada «v2 · Claro y oscuro», tokens AXIS)
- Skills de diseño: `info-architecture` (líder), `state-design`, `greenhouse-ux-writing`, `modern-ui`, `dataviz-design`, `product-design-loop`

## Dependencies & Impact

### Depends on

- `TASK-1895`: `Sheet`, `ConfirmDialog`, `ConflictDialog`, `WriteGateNotice`, `studio-api.ts`, región `aria-live`, pestaña Brief.
- `TASK-1907`: operaciones del plan y del programa (bloqueante para Slices 2–4).
- `TASK-1905`: modelo de cliente y canales (sección Audiencias).
- `TASK-1908`: SEO/AEO; `TASK-1909`: procedencia y aceptación; `TASK-1910`: progreso y chequeo de destino; `TASK-1911`: experimentos y aprendizajes (cada sección se construye cuando su backend está en staging).

### Blocks / Impacts

- Cierre del Exit Criteria de EPIC-049 «toda operación de la UI tiene su endpoint» para la capa de estrategia.
- Master flow de EPIC-049: nodos `MS-N3.10`, `MS-N11`, `MS-N12`.

### Files owned

- Repo Studio: `apps/web/src/app/campaigns/[campaignId]/page.tsx` (pestaña `strategy`), `apps/web/src/app/learnings/**` [nuevo], `apps/web/src/app/programs/**` [nuevo], `apps/web/src/components/strategy/**` [nuevo], `apps/web/src/components/{SectionRail,MatrixGrid,ReadinessList,ProvenanceBadge}.tsx` [nuevos], `apps/web/src/components/CommandPalette.tsx` (entradas «Ir a aprendizajes», «Ir a programas»), `apps/web/src/copy.ts` (namespaces `strategy`, `learnings`, `programs`), `apps/web/src/copy.test.ts`, `apps/web/e2e/task-1912-strategy.visual.ts` [nuevo]
- Greenhouse: `docs/ui/wireframes/TASK-1912-marketing-studio-strategy-planning-space.md`, `docs/ui/flows/TASK-1912-marketing-studio-strategy-planning-space-flow.md`, `docs/ui/reviews/TASK-1912-marketing-studio-strategy-planning-space.scorecard.json` [nuevo], manual de uso de Studio

## Current Repo State

### Already exists

- Espacio de campaña con hero, pista de tres estados y pestañas (TASK-1887, en vivo en modo `open`).
- Diseño de edición y superficies de TASK-1895 (en diseño; `v3 · Edición`).
- Canvas «Efeonce Marketing Studio» con `v2 · Claro y oscuro` aprobado.
- Wireframe y flow de esta task (creados 2026-09-26).

### Gap

- No hay artboards de planificación (`v4 · Estrategia`).
- No hay pestaña Estrategia, biblioteca de aprendizajes ni vista de programa.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `efeonce-marketing-studio/apps/web` (Next.js de Studio)
- Future candidate home: `remain-shared`
- Boundary: componentes de UI que consumen `/api/v1`; ninguna regla de dominio en el cliente
- Server/browser split: páginas como Server Components que leen con los readers del dominio; hojas y diálogos en cliente llamando `/api/v1`
- Build impact: `none` (sin librerías nuevas de UI; tablas y listas con HTML semántico)
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: dueño de campaña (`.campaign.write`) y aprobador (`.campaign.approve`) de Efeonce
- Momento del flujo: entre el brief y la producción; y durante la campaña para revisar metas, hueco e hipótesis
- Resultado perceptible esperado: la versión del plan y lo que falta para aprobarla visibles en el primer pliegue; el hueco de contenidos cubrible sin salir de la campaña
- Friccion que debe reducir: estrategia en documentos sueltos que nadie mira después de producir
- No-goals UX: editar catálogos, conexiones publicitarias o el modelo de cliente; ejecutar rastreos; lanzar pauta

### Surface & system decision

- Surface: pestaña `?tab=strategy` del espacio de campaña + `/learnings` + `/programs` + `/programs/[programId]`
- Nav placement: `command-palette` — dos destinos nuevos («Aprendizajes», «Programas») por ⌘K y enlaces contextuales; el rail no crece (límite de 5)
- Composition Shell: `no aplica` — Studio es una app propia con su `Shell`; se respeta su composición vigente
- Primitive decision: `extend` — reusa superficies de TASK-1895; nuevas locales `SectionRail`, `MatrixGrid`, `ReadinessList`, `ProvenanceBadge`
- Adaptive density / The Seam: `aplica` — `MatrixGrid` y tablas cambian a lista bajo 860 px; tarjetas de metas se reordenan en una columna
- Floating/Sidecar/Dialog decision: `Sheet` para editar, `ConfirmDialog` para `T2`, popover no modal para `ReadinessList` desde el contador
- Copy source: `local one-off` — `apps/web/src/copy.ts` de Studio (única fuente de copy del repo de Studio, con test)
- Access impact: `entitlements` — la UI consume la proyección de permisos (`.campaign.write`, `.campaign.approve`) resuelta en servidor

### State inventory

- Default: pestaña con secciones y acciones según proyección
- Loading: esqueleto del encabezado y la sección activa; «Cargando…» para lectores de pantalla
- Empty: «Esta campaña todavía no tiene estrategia» con `Crear borrador`; vacío por sección
- Error: `error` es-CL del contrato; `Reintentar` sólo si `actionable`
- Degraded / partial: modelo de cliente no disponible (ids visibles); SEO/AEO actual no disponible (snapshot visible)
- Permission denied: `WriteGateNotice` con razón (`open_mode`, `missing_capability`, `authority_onedrive`, `noApprove`)
- Long content: mensajes y pruebas literales con `pre-wrap`; tablas con scroll contenido
- Mobile / compact: selector de secciones, matriz como lista, contenidos como tarjetas, hojas a pantalla completa
- Keyboard / focus: rail con flechas; celdas y filas como botones; foco atrapado y devuelto
- Reduced motion: se respeta la preferencia; sin movimiento propio

### Interaction contract

- Primary interaction: aprobar el plan en dos pasos (`dryRun` → confirmación)
- Hover / focus / active: estados vigentes de `.btn`, filas y celdas con `:focus-visible` de `--action`
- Pending / disabled: «Guardando…», «Calculando…», «Aprobando…» con `aria-busy`; sin permiso `aria-disabled` con razón
- Escape / click-away: cierra salvo `dirty` (confirma) o envío en curso (bloqueado)
- Focus restore: al disparador o al `h2` «Estrategia» si desapareció
- Latency feedback: `dryRun` muestra «Calculando…» y no ofrece confirmar hasta tener digest
- Toast / alert behavior: anuncio en la región `aria-live` del `Shell`; toasts breves de TASK-1895

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: el de las superficies de TASK-1895, sin cambios
- Layout morph: ninguno
- Stagger: ninguno
- Timing / easing token: heredados
- Reduced-motion fallback: heredado (sin desplazamientos)
- Non-goal motion: gráficos o contadores animados de metas

### Implementation mapping

- Route / surface: ver wireframe §«Implementation Mapping»
- Primitive / variant / kind: `SectionRail layout=rail|seg`, `MatrixGrid layout=table|list`, `ProvenanceBadge state=ai_pending|ai_accepted|human`, `ReadinessList`
- Component candidates: los del wireframe
- Copy source: `apps/web/src/copy.ts` (namespaces `strategy`, `learnings`, `programs`)
- Data reader / command: los del flow §«Data & Command Boundaries»
- API parity: todas las acciones mapean a operaciones registradas con `riskTier`; ninguna acción sin operación
- Access / capability: proyección de permisos del reader
- States to implement: los de «State inventory» y la máquina del flow

### GVC scenario plan

- Scenario file: `apps/web/e2e/task-1912-strategy.visual.ts` (repo de Studio)
- Route: `/campaigns/CMP-900?tab=strategy&section=…`, `/learnings`, `/programs`, `/programs/{programId}` (staging)
- Viewports: 1440×1000 y 390×844, claro y oscuro
- Quality profile: `premium`
- Required steps: recorrido completo del wireframe + 412 y 409 provocados
- Required captures: cada estado del inventario y de la máquina del flow
- Required `data-capture` markers: los del wireframe
- Assertions: aprobar pasa por `dry-run`; snapshot ≠ actual; ausencia ≠ «0»; «Interno» sólo en filas competitivas; `aria-disabled` explica
- Scroll-width checks: `scrollWidth <= clientWidth` en todas las capturas
- Reduced-motion / focus evidence: pasada con `reducedMotion: 'reduce'` + axe + recorrido por teclado
- Review dossier: capturas, video corto de la aprobación, scorecard en `docs/ui/reviews/`
- Baseline decision / surface ID: línea base tras aprobar `v4 · Estrategia`; surface `studio-strategy`

### Design decision log

- Decision: pestaña con secciones + destinos suplementarios por ⌘K; aprobación en dos pasos
- Alternatives considered: destino global en el rail; ruta propia; página larga única; aprobar por sección (ver wireframe)
- Why this pattern: conserva el hub de campaña, pone la aprobación y sus faltantes arriba y reutiliza superficies probadas
- Reuse / extend / new primitive: reuse de TASK-1895; cuatro primitives locales nuevas
- Open risks: dirección `v4 · Estrategia` pendiente; dependencias backend por sección

### Visual verification

- GVC scenario: `task-1912-strategy` (Playwright en el repo de Studio)
- Viewports: 1440×1000 y 390×844
- Required captures: ver GVC scenario plan
- Required `data-capture` markers: ver wireframe
- Scroll-width check: obligatorio en cada captura
- Accessibility/focus checks: axe sin violaciones serias; foco atrapado y devuelto
- Before/after evidence: no aplica before (superficie nueva); after completo
- Known visual debt: ninguna declarada al crear
- Visual scorecard: `docs/ui/reviews/TASK-1912-marketing-studio-strategy-planning-space.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5` (estándar premium)

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

### Slice 1 — Dirección visual `v4 · Estrategia`

- En el canvas «Efeonce Marketing Studio», página `v4 · Estrategia` con los artboards listados en el wireframe (claro y
  oscuro, desktop y móvil), con `greenhouse-ai-design-studio`/`product-design-loop`; comparación de 2–3 direcciones para
  la matriz y el diálogo de aprobación; aprobación del operador; conciliar wireframe y flow; `UI ready: yes` sólo con
  `pnpm task:lint --task TASK-1912` sin hallazgos.

### Slice 2 — Pestaña, encabezado, secciones y Resumen/Metas/Mensajes

- Pestaña `strategy`, `StrategyHeader`, `SectionRail`, `ReadinessList`, secciones Resumen, Metas y Mensajes con sus hojas;
  copy en `copy.ts`.

### Slice 3 — Audiencias y Contenidos

- `MatrixGrid` (tabla y lista), hoja de celda, cambio de versión del modelo de cliente; tabla de contenidos con hueco,
  filtros y hoja de ítem con vínculo.

### Slice 4 — Aprobación y versiones

- Diálogo de aprobación en dos pasos, descarte de borrador, lectura de versión aprobada (`&version=`), conflicto y
  digest desactualizado.

### Slice 5 — SEO/AEO, Medición y procedencia

- Sección SEO/AEO (snapshot vs actual, propuestas, copiar referencia), Medición (UTM, eventos, chequeo de destino),
  `ProvenanceBadge` y hoja de procedencia con aceptar/rechazar.

### Slice 6 — Experimentos, Aprendizajes y Programas

- Sección Experimentos (lista, hoja, capturar, concluir), `/learnings` (filtros, validar, retirar), `/programs` y
  `/programs/[programId]`, chip de programa en el hero, entradas de ⌘K.

### Slice 7 — Evidencia y cierre

- Escenario Playwright + axe completo, scorecard, manual de uso de Studio («Planificar una campaña»), docs funcionales,
  master flow conciliado, skill `efeonce-marketing-studio`.

## Out of Scope

- Catálogo de canales, reglas de voz, conexiones publicitarias y modelo de cliente en la UI (follow-up).
- Ejecutar rastreos de palabras clave o cualquier gasto desde Studio.
- Endpoints nuevos: si una operación falta, se detiene la sección y se reporta a la task backend dueña.

## Detailed Spec

El detalle de regiones, copy, estados, accesibilidad y mapeo vive en el wireframe y el flow declarados en `## Status`;
no se duplica aquí. Reglas de ejecución:

- Cada sección se construye sólo cuando su backend está en staging; mientras tanto la sección muestra el estado
  «Disponible pronto» (copy `studio.strategy.section.unavailable`) y no finge datos.
- Toda llamada `T2` usa el mismo patrón del diálogo de aprobación (Sub-flujo A del flow).
- `copy.test.ts` falla si un texto visible de estas superficies no está en `COPY`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (dirección aprobada) → Slices 2–6 (cada uno tras su backend en staging) → Slice 7.
- Nada llega a producción de Studio antes de que TASK-1907 esté en producción con su flag ON.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI calcula algo que el servidor debería decidir | integridad | medium | revisión por test estático de imports de dominio en componentes; readers como única fuente | revisión de PR |
| Aprobación accidental | datos | low | dos pasos con digest; foco inicial en «Cancelar» | canary |
| Scroll horizontal por la matriz | UI | medium | scroll contenido + lista en móvil | assert de `scrollWidth` |
| Filtración de dato competitivo | confidencialidad | low | la UI muestra lo que el reader entrega; test del chip «Interno» | assert |

### Feature flags / cutover

- Sin flag propio: la pestaña se muestra cuando `STUDIO_STRATEGY_PLAN_ENABLED` (TASK-1907) está ON; cada sección sigue el
  flag de su backend (`STUDIO_SEO_PLAN_ENABLED`, `STUDIO_AI_DRAFTS_ENABLED`, `STUDIO_EXPERIMENTS_ENABLED`) y muestra
  «Disponible pronto» si está OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | no aplica (diseño) | — | sí |
| Slices 2–6 | apagar el flag del backend correspondiente o `vercel rollback` de Studio | < 5 min | sí |
| Slice 7 | revert de docs | < 15 min | sí |

### Production verification sequence

1. Staging: escenario completo verde en ambos viewports y temas.
2. Production de Studio con flags ON por sección, tras el backend en producción; revisión visual por el operador.

### Out-of-band coordination required

- Aprobación del operador de los artboards `v4 · Estrategia`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: flow`.
- [ ] `UI ready` permanece `no` hasta que wireframe y `## UI/UX Contract` tengan mapeo, plan de evidencia y decision log conciliados con `v4 · Estrategia` aprobada; si pasa a `yes`, `pnpm task:lint --task TASK-1912` queda sin hallazgos.
- [ ] Wireframe y flow declarados existen y están conciliados con la dirección aprobada.
- [ ] Toda acción visible corresponde a una operación registrada con `riskTier`; ninguna regla de negocio en componentes.
- [ ] La task reusa las superficies de TASK-1895 y declara las cuatro primitives nuevas.
- [ ] Todo texto visible vive en `apps/web/src/copy.ts` y `copy.test.ts` lo verifica.
- [ ] Estados loading, empty, error, degradado, permiso y móvil cubiertos.
- [ ] Aprobar el plan exige el diálogo de dos pasos; una versión aprobada no ofrece edición directa.
- [ ] Snapshot de planificación y dato actual nunca comparten encabezado; ausencia nunca se muestra como «0».
- [ ] Evidencia 1440 y 390, claro y oscuro, con `scrollWidth <= clientWidth` en todas las capturas.
- [ ] Preferencia de movimiento reducido respetada (pasada con `reducedMotion: 'reduce'`).
- [ ] Scorecard premium en `docs/ui/reviews/` con promedio ≥ 4.5 y piso ≥ 4.
- [ ] Aprendizajes y programas alcanzables por ⌘K en 390 px sin escribir la URL.

## Verification

- Studio: `pnpm check`, `pnpm build`, escenario `apps/web/e2e/task-1912-strategy.visual.ts` + axe.
- Greenhouse: `pnpm task:lint --task TASK-1912`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Master flow de EPIC-049 conciliado con los nodos `MS-N3.10`, `MS-N11`, `MS-N12`.
- [ ] Skill `efeonce-marketing-studio` actualizada y espejada; `EPIC-049` refleja el estado.

## Follow-ups

- UI de catálogo de canales, reglas de voz, conexiones publicitarias y modelo de cliente (Greenhouse).
- Vista comparada de planes dentro de un programa.

## Delta 2026-09-26

- ADR de operación híbrida con agentes aceptado (TASK-1913…1916, sólo backend). Sus superficies visibles quedan como
  follow-up consumidor de esta task o de TASK-1895, sin wireframe todavía: work items por campaña y bandeja «mis
  asignaciones» con revisión (TASK-1913), roles de agente con versiones, modos y kill switch (TASK-1914), corridas y
  programas con estado, costo y causa de fallo (TASK-1915), y panel de evaluaciones y métricas por rol (TASK-1916).

## Open Questions

- ¿«Estrategia» debe ser la pestaña por defecto de campañas sin piezas todavía? Por defecto no (Piezas sigue siendo la predeterminada); confirmar con el operador al aprobar `v4 · Estrategia`.
