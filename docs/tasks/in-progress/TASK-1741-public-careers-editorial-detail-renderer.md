# TASK-1741 — Public Careers Editorial Detail Renderer

## Delta 2026-08-17 (2) — Misma arquitectura para todas las vacantes

El renderer deja de decidir su arquitectura por cantidad de texto: toda vacante v2 sigue el mismo orden fijo y
los datos variables llenan esas regiones. `Efeonce en breve` y el charter global de beneficios son bloques
centrales heredados. Los cargos complejos pueden insertar, después de `El trabajo`, entre cero y tres bloques
tipados (`narrative|bullets|milestones`); nunca pueden mover secciones, crear componentes, elegir color o añadir
CTA. V1/legacy conserva fallback completo durante la migración. Este delta no toca el formulario.

## Delta 2026-08-17

- `TASK-1740` entrega `PublicOpeningContent` v2 completo: promise/intro/outcomes/workItems,
  essentials/preferred/learnables, evidenceAsk, workModel, collaboration, process, adiciones de beneficios,
  compensation y hasta tres additionalSections, más `remoteEligibleCountries`. V1 queda read-only con
  fallback legacy por sección. Fixture canónica para el renderer:
  `src/lib/hiring/public-careers/editorial-opening.fixture.ts` (`editorialOpeningFixture` +
  `legacyOpeningFixture`). Canonical + JSON-LD ya se emiten desde la page (schema detrás de
  `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED`, OFF); el renderer NO escribe schema ni metadata.
  La dependencia técnica quedó satisfecha con los Slices 1–3 de TASK-1740 y su auditoría
  independiente; el rollout de ambos trabajos sigue coordinado y TASK-1740 conserva lifecycle
  `in-progress` hasta esa evidencia conjunta.
- **Esta task NO necesita el flag de schema de TASK-1740 para desarrollarse**: `content` y
  `remoteEligibleCountries` viajan en el payload público SIEMPRE, sin flag. Pero sí hay una
  **precondición inversa que esta task desbloquea**: `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` no
  puede prenderse hasta que este renderer muestre el bloque estructurado en la página visible —
  el builder de JSON-LD ya consume `content` y el renderer todavía no, así que prender el schema
  antes emitiría a Google contenido no visible (guías de Google + invariante del dominio).
- **Dato ya en la base que este renderer debe mostrar**: las 2 vacantes publicadas
  (`EO-OPN-0009`, `EO-OPN-0061`) tienen contenido v1 con `remoteModel` poblado con la vía contractual
  (Chile contrato local / fuera de Chile internacional con pago directo de Efeonce). El resto de los
  campos del bloque está vacío: el renderer debe degradar esas secciones al fallback de prosa, y el
  contenido editorial completo se autora aparte (no lo inventa el renderer).
- **Corrección de contrato solicitada por el operador**: el seniority público deja de ser texto libre.
  El vocabulario candidate-facing es `Junior | Semi-senior | Senior | Lead`; `Intermedio` describe
  proficiency y `L1/L2/L3` permanecen internos. Título y nivel explícito deben coincidir. El guard
  vive en UI, IA, writer, reader fail-closed y CHECK de PostgreSQL; la migración calibra los dos
  valores legacy conocidos (`L2`/`Intermedio` → `Semi-senior`) sin alterar el nivel interno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1741-public-careers-editorial-detail-renderer.md`
- Flow: `docs/ui/flows/TASK-1741-public-careers-apply-continuity.md`
- Motion: `none`
- Backend impact: `schema|validation`
- Epic: `EPIC-011`
- Status real: `Code complete; migración aplicada; rollout de flags pendiente`
- Rank: `TBD`
- Domain: `hr|ui|content`
- Blocked by: `none`
- Branch: `develop (checkout compartido; sin worktrees)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Evolucionar el detalle público de Careers hacia una pieza editorial contemporánea, legible y orientada a conversión inbound. Reutiliza la ruta, el formulario y los dos CTA ya existentes; introduce una jerarquía visual de promesa, resultados, trabajo, condiciones y beneficios sin convertir la vacante en una landing genérica.

## Why This Task Exists

El renderer actual muestra correctamente el contenido pero lo aplana en listas y deriva secciones desde parsing de texto libre. El primer fold no demuestra con suficiente claridad qué hará la persona, cómo funciona el remoto ni qué recibirá; en móvil el resumen llega después de mucho contenido. Una mejora incremental debe mejorar esa comprensión sin alterar el journey de aplicación ni convertir el sitio de careers en un experimento visual pesado.

## Goal

- Construir una experiencia editorial de detalle para una vacante que permita a la persona autoevaluar encaje antes de postular.
- Conservar URL, formulario, recorrido de aplicación y los dos CTA actuales: uno en hero y uno en el resumen lateral; no añadir un CTA final ni otro botón de postulación.
- Mantener compatibilidad visual y semántica con openings legacy mientras se adopta el contrato de TASK-1740.
- Preservar el seniority público literalmente y bloquear códigos internos o contradicciones entre título y nivel.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- El formulario `/public/careers/[publicId]/apply` no se toca: ni campos, ni validación, ni submit, ni consentimiento, ni CTA propio.
- Se mantienen exactamente los dos enlaces de aplicación existentes: CTA verde del hero y CTA azul del resumen; no agregar CTA al final ni repetir botones dentro de secciones.
- El renderer es cliente de `PublicOpeningPayload`/view model; no lee DB, no reinterpreta datos privados y no introduce endpoints/client-side fetching.
- La mejora debe ser incremental y reversible detrás de un flag server-side existente o aprobado; campos nuevos son opcionales y la lectura legacy es un fallback explícito.
- No usar imágenes de stock, retratos de candidatos, arte IA decorativa, video, WebGL/canvas ni dependencia pesada. La modernidad nace de composición, tipografía, color, densidad, detalle y accesibilidad.

## Normative Docs

- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `DESIGN.md`
- `docs/context/05_voz-tono-estilo.md`
- `src/lib/copy/*`
- `docs/tasks/complete/TASK-354-public-careers-portal.md`
- `docs/tasks/in-progress/TASK-1740-public-vacancy-jobposting-foundation.md`

## Dependencies & Impact

### Depends on

- `TASK-1740` debe estabilizar el payload público estructurado, legacy fallback y JSON-LD antes de que este renderer active su variante editorial.
- `src/components/greenhouse/careers/CareersDetailView.tsx` y `src/components/greenhouse/careers/careers.module.css` son la surface existente que se extiende.

### Blocks / Impacts

- Impacta sólo `/public/careers/[publicId]`, desktop y móvil, más sus estados de contenido largo/legacy.
- El `applyUrl` sigue apuntando al mismo formulario y la aplicación no cambia de ruta ni contrato.
- No agrega destino ni capa emergente, y no incorpora una secuencia nueva; `Flow: none` es deliberado.

### Files owned

- `src/components/greenhouse/careers/CareersDetailView.tsx`
- `src/components/greenhouse/careers/careers.module.css`
- `src/lib/copy/**` si emerge copy reusable
- `tests/**` y escenarios GVC de Careers
- `docs/ui/wireframes/TASK-1741-public-careers-editorial-detail-renderer.md`

## Current Repo State

### Already exists

- La vista actual tiene hero navy, CTA verde de aplicación, contenido principal de listas y un aside con resumen/CTA azul; la misma URL sirve desktop y móvil.
- El aside es sticky en desktop y se reubica después del contenido en móvil. El hero mantiene acceso temprano al CTA móvil.
- Capture base staging: `.captures/2026-08-17T12-25-12_task354-careers-runtime-audit/` con desktop 1440 y móvil 390; cero findings de calidad/console/hydration en esa sesión.
- `src/app/public/careers/layout.tsx` es dinámico (`force-dynamic`), por lo que el render debe mantenerse ligero.

### Gap

- La jerarquía visible no hace suficientemente escaneables la promesa, el trabajo real, los outcomes, la modalidad operativa, las skills esenciales/learnable, el proceso y los beneficios.
- Secciones derivadas desde texto libre crean límites de formato y un ritmo de lectura uniforme; la pagina no tiene una variante editorial moderna con compatibilidad legacy declarada.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/components/greenhouse/careers/CareersDetailView.tsx`.
- Future candidate home: `public`
- Boundary: `CareersDetailView` consume sólo el view model público de TASK-1740; `applyUrl` conserva el contrato de navegación existente.
- Server/browser split: el route resuelve payload/metadata en servidor; el renderer no usa stores, DB, secretos ni SDKs externos en Client Components.
- Build impact: `none` — CSS/React y primitives existentes, sin paquetes visuales pesados.
- Extraction blocker: la vista está acoplada a la taxonomía y shell de Careers existente; no hay frontera reusable demostrada que justifique un paquete nuevo.

## Hybrid Execution Justification

El perfil principal sigue siendo `ui-ux`: TASK-1740 posee el contrato público y TASK-1741 lo consume. El
backend impact apareció por una corrección explícita del operador durante la ejecución: impedir que
`Intermedio` o `L1/L2/L3` vuelvan a cruzar como seniority público. Separarlo dejaría temporalmente una UI
capaz de seleccionar el vocabulario correcto sobre un writer/reader/DB que todavía aceptarían datos
contradictorios. Por eso esta task incorpora un delta acotado y atómico: helper canónico, guards del writer y
reader, enum de IA/UI y un CHECK/backfill gobernado. No modifica el modelo de assessment ni amplía el payload
editorial. Orden: validación y migración primero → renderer consumidor → rollout conjunto. Si el vocabulario
crece o nace una taxonomía de carrera, deberá tener una task backend-data y ADR propias.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: profesional que evalúa una vacante de Efeonce desde cualquier país y decide si postular con su portafolio/experiencia.
- Momento del flujo: página individual de una vacante ya publicada, antes del formulario.
- Resultado perceptible esperado: en el primer scroll entiende rol, modalidad y motivo para considerar la vacante; al avanzar puede evaluar resultados, trabajo, encaje y beneficios sin cazar datos entre listas.
- Friccion que debe reducir: incertidumbre de scope, remoto, elegibilidad, proceso y valor ofrecido; cansancio de leer un aviso plano antes de saber si encaja.
- No-goals UX: rehacer el form, añadir captación secundaria, explicar la compañía antes del rol, crear una landing de marca, aumentar la cantidad de CTA o usar animación decorativa.

### Surface & system decision

- Surface: detalle público `/public/careers/[publicId]`.
- Nav placement: `none` — no hay nuevo destino ni navegación persistente.
- Composition Shell: `no aplica` — es una ruta pública editorial, no una pantalla operativa autenticada.
- Primitive decision: `extend` — evolucionar la composición/variants de la vista Careers existente y primitives tipográficos/tags/links del sistema; no crear una card library paralela.
- Adaptive density / The Seam: `aplica` — rail estructurado en desktop, secuencia editorial lineal y hero con CTA existente en 390 px.
- Floating/Sidecar/Dialog decision: conservar aside estático/sticky actual en desktop; no agregar sidecar, dialog ni surface flotante.
- Copy source: `src/lib/copy/*` para etiquetas reutilizables; contenido de la vacante llega del payload público.
- Access impact: `none` — es lectura pública con el mismo gate de publicación existente.

### State inventory

- Default: opening publicado con contenido estructurado completo y ambas CTA existentes.
- Loading: SSR actual; no agregar skeleton client-side ni shift deliberado.
- Empty: si un bloque estructurado no existe, se omite sin placeholder; si no hay contenido nuevo se presenta la sección legacy equivalente.
- Error: `notFound` actual de publicación; no filtrar motivo interno de falta.
- Degraded / partial: data legacy o campos de TASK-1740 incompletos preservan intro/listas existentes y no dejan bandas vacías.
- Permission denied: no aplica a lectura pública; opening no publicado es `notFound`.
- Long content: ancho de lectura contenido, listas con espacio semántico, rail independiente sin ocultar CTA.
- Mobile / compact: 390 px sin overflow horizontal; hero mantiene CTA verde existente; aside no duplica un botón ni desplaza el CTA inicial.
- Keyboard / focus: orden DOM lógico, focus visible de los dos links y landmarks/headings consecutivos; no traps.
- Reduced motion: sin motion no trivial; hover/focus CSS no debe depender de transición ni impedir lectura.

### Interaction contract

- Primary interaction: los dos enlaces existentes llevan a `applyUrl` sin cambio de parámetros, historial o formulario.
- Hover / focus / active: usar estados de link/button del sistema, foco visible AA y no depender sólo de color.
- Pending / disabled: no aplica en detalle estático; el form conserva su propio contrato.
- Escape / click-away: no aplica — no hay overlays.
- Focus restore: no aplica — navegación normal a la ruta apply existente.
- Latency feedback: SSR/route existente; no introducir loading client-only.
- Toast / alert behavior: none.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: none.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: sólo transiciones existentes del sistema si son necesarias para hover/focus; no nuevo movimiento perceptible.
- Reduced-motion fallback: no animación nueva; respetar la media query/global policy existente.
- Non-goal motion: no scroll reveal, parallax, animated counters, Lottie, Framer/GSAP ni cambios temporales de layout.

### Implementation mapping

- Route / surface: `src/app/public/careers/[publicId]/page.tsx` → `src/components/greenhouse/careers/CareersDetailView.tsx`.
- Primitive / variant / kind: hero editorial + datos rápidos/tag primitives existentes + composición de rail/sections; decidir clases/tokens canónicos durante discovery UI.
- Component candidates: extender `CareersDetailView` y extraer secciones presentacionales locales sólo si reducen complejidad sin ocultar la semántica del payload.
- Copy source: labels estables a `src/lib/copy/`; texto de vacante y beneficios sólo desde `PublicOpeningPayload` de TASK-1740.
- Data reader / command: `src/lib/hiring/public-careers/view-model.ts`; proyecta compensación,
  `workModel`, colaboración, proceso, bloques adicionales y países elegibles; ningún command desde la página.
- API parity: no expone acción de negocio nueva; `applyUrl` reutiliza el journey existente.
- Access / capability: el reader público conserva publicación/visibilidad; no hay capacidad nueva.
- States to implement: structured complete, legacy fallback, partial sections, long content, 1440 desktop y 390 mobile, 404 existente.

### GVC scenario plan

- Scenario file: crear/actualizar escenario Careers dedicado bajo el patrón vigente de `gvc/scenarios/` tras discovery; no reutilizar una captura puntual como test permanente sin fixture estable.
- Route: una opening publicada estable de staging, con estado autenticado sólo si staging lo exige; también la misma URL mobile.
- Viewports: `1440×1200` y `390×844`.
- Quality profile: `premium` para `ui-standard`.
- Required steps: cargar first fold, capturar página completa, tabular los dos CTA, navegar con uno a apply sólo para verificar URL y volver; no interactuar/modificar el formulario.
- Required captures: before/after 1440 y 390, hero, sección de outcomes/work, benefits/process y rail/CTA; revisión visible de página completa.
- Required `data-capture` markers: marcar hero, main content, outcomes, work, essentials, benefits, process y career-summary sólo si el harness los necesita; no usar markers como contrato de producto.
- Assertions: dos `href` de apply conservan URL; no existe tercer CTA de apply; headings ordenados; contenido legacy visible cuando faltan campos estructurados; no errores de console/hydration/HTTP.
- Scroll-width checks: `scrollWidth === clientWidth` a 1440 y 390.
- Reduced-motion / focus evidence: foco visible de ambos CTA, tab order lógico, captura con reduced motion cuando el harness lo permita.
- Review dossier: baseline staging de 2026-08-17 + capturas nuevas, diferencias clasificadas por mejora/defecto/regresión.
- Baseline decision / surface ID: `public-careers-detail`; baseline se congela antes de flag on y se revisa visualmente, no sólo por diff de píxeles.

### Design decision log

- Decision: dirección `Editorial dossier` (hero sobrio, promesa y facts; cuerpo de lectura con outcomes/work; banda de beneficios; rail de aplicación existente).
- Alternatives considered: `Data-dense marketplace` (rechazada: normaliza el aviso como job board y reduce voz/aspiración); `Cinematic agency` (rechazada: requiere assets/motion pesados y aumenta riesgo visual/performance sin ayudar a decidir).
- Why this pattern: presenta el rol como trabajo concreto y opportunity, no como manifiesto corporativo; es escaneable, tiene densidad controlada y funciona con contenido variable.
- Reuse / extend / new primitive: extender composición Careers y tokens existentes; no crear primitive global ni surface de CTA nueva.
- Open risks: calidad de datos incomplete de TASK-1740, copy legado demasiado largo, orientación contract/country no aprobada y posible CSS specificity del renderer actual.

### Visual verification

- GVC scenario: detalle Careers publicado con fixture estable.
- Viewports: `1440×1200`, `390×844`.
- Required captures: first fold + full page antes/después para ambas viewports; focus de CTA; estado legacy parcial.
- Required `data-capture` markers: hero/detail-main/career-summary y secciones editoriales si el scenario los necesita.
- Scroll-width check: `scrollWidth === clientWidth` en desktop y mobile.
- Accessibility/focus checks: landmarks, jerarquía `h1`→`h2`, contraste AA, foco visible, teclado y reduced motion.
- Before/after evidence: baseline `.captures/2026-08-17T12-25-12_task354-careers-runtime-audit/` y captura nueva versionada por task.
- Known visual debt: medición real de performance y copy final depende de fixture; no prometer mejora de FCP sin medición comparable.
- Visual scorecard: `docs/ui/reviews/TASK-1741-public-careers-editorial-detail-renderer.scorecard.json`
- Quality threshold: `average >= 4.5; no dimension < 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5`

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

### Slice 1 — Baseline and content mapping

- Capturar/revisar el renderer actual en desktop y móvil con una fixture estable y mapear cada campo legado al contrato de TASK-1740 o a fallback explícito.
- Confirmar tokens, primitives y límites de CSS existentes antes de JSX; conservar ambos CTA y apply URL.

### Slice 2 — Editorial renderer behind rollout control

- Implementar el hero/contexto, secciones de outcomes/work/skills y banda de beneficios/proceso con el patrón `Editorial dossier` y compatibilidad legacy.
- Mantener rail/summary y sus CTA existentes; no añadir botón/CTA final ni tocar `CareersApplyClient`/`CareersNativeGrowthFormClient`.

### Slice 3 — Responsive, semantic and regression hardening

- Resolver long content, partial/legacy data, 390 px, keyboard/focus, contraste, preferencia de reducir movimiento y scroll width.
- Añadir pruebas de paridad de contenido y GVC premium before/after; validar JSON-LD/canonical sólo como consumer de TASK-1740, sin editarlo.
- Cerrar el seniority público con vocabulario canónico, selector humano, schema/sanitizer de IA,
  writer/reader fail-closed, coherencia con el título y constraint/backfill gobernado.

### Slice 4 — Staged rollout and evidence

- Activar primero staging, comparar con baseline y corregir regressions; habilitar producción sólo con evidencia aprobada.
- Dejar el flag como rollback inmediato y registrar cualquier campo de copy pendiente para People/Growth, no rellenarlo artificialmente.

## Out of Scope

- Cambiar o rediseñar el formulario de postulación, su CTA o su ruta.
- Añadir un tercer CTA, CTA al final de la vacante, formulario embebido, talent-pool opt-in o contacto alternativo.
- Cambios a `JobPosting`, canonical, sitemap o Indexing API (TASK-1740). La única migración incorporada
  es el constraint/backfill de seniority público aprobado durante la ejecución.
- Un rebrand de Careers, nueva navegación global, efectos temporales no triviales, imágenes/vídeo decorativos o dependencia pesada.
- Cambiar beneficios o condiciones de empleo: sólo se muestran datos aprobados por el contrato público de TASK-1740.

## Detailed Spec

La primera pantalla responde al trabajo, no a una introducción corporativa: título estándar SEO, promesa/contenido factual, trabajo/modalidad/área y CTA hero ya existente. El cuerpo usa ritmo editorial: outcomes primero, luego trabajo/entregables, evidencia/skills, modelo remoto y una banda de beneficios/proceso cuando exista contenido aprobado. El rail conserva facts y el CTA azul existentes. Para legacy, secciones existentes se mantienen y el cambio no puede esconder requisitos, responsabilidad, proceso o condiciones disponibles.

La variante se activa sólo tras revisar el mecanismo de flags existente. El layout no usa valores visuales literales ni propone un sistema paralelo; el agente debe mapear color, espaciado, tipografía y estados a tokens/primitives vigentes. Cualquier copy reusable/copy de UI vive en `src/lib/copy/*`; el copy de negocio sigue en el payload público.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1740 Slice 2/3 debe estar disponible antes de Slice 2 de esta task.
- Slice 1 → Slice 2 con flag OFF → Slice 3 GVC/a11y → staging flag ON → producción flag ON.
- Nunca activar la variante sin fallback legacy, baseline 1440/390 y prueba de que los dos CTA conservan `applyUrl`.

### Risk matrix

| Riesgo                                             | Sistema        | Probabilidad | Mitigation                                                            | Signal de alerta                                     |
| -------------------------------------------------- | -------------- | ------------ | --------------------------------------------------------------------- | ---------------------------------------------------- |
| Regresión de lectura/apply                         | UI pública     | medium       | conservar DOM/action links, paridad de datos, GVC y revisión keyboard | CTA href cambia, tercer CTA o contenido ausente      |
| Overflow/mala jerarquía mobile                     | UI pública     | medium       | wireframe 390, CSS responsive, `scrollWidth` y screen review          | overflow, headings/focus fallan                      |
| Contenido nuevo incompleto rompe layout            | UI / data      | high         | secciones opcionales + fallback legacy sin bandas vacías              | GVC partial/legacy defect                            |
| Seniority interno o contradictorio llega a Careers | Hiring / trust | medium       | vocabulario único en UI+IA+writer+DB; reader fail-closed              | `L2`, `Intermedio` o título/nivel discordante        |
| Regresión visual de Careers                        | UX/brand       | medium       | baseline, flag, revisión desktop/full-page y scorecard                | diferencia no intencional o score bajo               |
| Peso/performance excesivo                          | public runtime | low          | CSS/React existente, cero assets/dependencias pesadas                 | cambio material de requests/transfer/FCP comparables |

### Feature flags / cutover

- Usar un flag server-side de variante editorial, con default OFF, nombre y owner definidos en Discovery siguiendo el registro existente (candidato: `CAREERS_DETAIL_EDITORIAL_V2_ENABLED`, no crear sin confirmar patrón).
- Rollout: local/fixture → staging ON → evidencia GVC/HTML → producción ON. El schema requiere
  técnicamente ambos flags ON. Revert: apagar primero `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED`,
  luego `CAREERS_DETAIL_EDITORIAL_V2_ENABLED`, y redesplegar; el renderer legacy y `applyUrl` continúan disponibles.

### Rollback plan per slice

| Slice | Rollback                                                                                                    | Tiempo             | Reversible? |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| 1     | Sólo evidencia/doc; no cambia runtime                                                                       | inmediato          | sí          |
| 2     | Flag OFF y revert del componente si hace falta; payload/forma intactos                                      | < 15 min + deploy  | sí          |
| 3     | Revert de CSS/markup específico o flag OFF; conservar tests/capturas                                        | < 15 min + deploy  | sí          |
| 4     | Schema flag OFF → renderer flag OFF en staging/producción; registrar defecto, sin tocar formulario ni datos | < 5 min + redeploy | sí          |

### Production verification sequence

1. Capturar baseline de una vacancy publicada estable (1440/390; first fold/full-page) con renderer legacy.
2. Desplegar variante con flag OFF; comprobar HTML/CTA/form ruta y ausencia de errores.
3. Activar staging, ejecutar GVC premium, teclado/preferencia de movimiento reducido/scroll-width y comparar evidencia visual.
4. Revisar una fixture estructurada, una legacy y una parcial; validar que no se añade CTA.
5. Activar producción con flag reversible, repetir smoke de rutas/CTA y monitorizar errores de render.

### Out-of-band coordination required

- People/Growth debe aprobar el contenido factual de la primera vacancy y beneficios/condiciones que se hagan visibles.
- No se requiere coordinación externa para la UI; SEO valida el schema producido por TASK-1740 antes de producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La página de detalle adopta el patrón editorial acordado y mejora la jerarquía de rol, outcomes, trabajo, encaje, condiciones y beneficios sin una introducción corporativa genérica como primer bloque.
- [x] La hoja completa conserva navegación, header/footer, seniority, metadatos, contenido público, rail, responsive y exactamente los dos CTA actuales; no hay pérdida de datos ni tercer CTA.
- [x] El formulario y su ruta quedan fuera del cambio funcional; sólo se comprueba que ningún selector CSS compartido los afectó accidentalmente.
- [x] `publicSeniority` sólo acepta `Junior | Semi-senior | Senior | Lead`; UI e IA no admiten texto libre, el writer/DB bloquean otros valores, título/nivel coinciden y el renderer muestra `Senior` literalmente.
- [x] Una vacante legacy o parcial muestra todos los datos disponibles mediante fallback legible, sin huecos, overflow ni pérdida de requisitos/proceso.
- [x] El renderer cumple 1440/390, teclado, foco visible, landmarks/headings, contraste, preferencia de reducir movimiento y `scrollWidth === clientWidth`.
- [x] GVC premium before/after y scorecard documentan que el cambio es una mejora incremental y no una regresión visual.
- [x] El renderer sólo consume el payload público de TASK-1740 y no modifica el formulario, JSON-LD, canonical ni el comando de publicación.
- [x] Todas las vacantes v2 muestran el mismo orden de regiones y los bloques corporativo/beneficios centrales; ausencia de datos obligatorios se bloquea antes del publish, no se disfraza con placeholder.
- [x] Se renderizan como máximo tres `additionalSections` en la única zona reservada después de `El trabajo`, con semántica narrativa/lista/hitos y sin HTML, CTA ni estilos arbitrarios.
- [x] `preferred` se muestra como `Deseable, no excluyente`, `learnables` sólo como aprendizaje real y la colaboración explicita equipo, reporte, idioma, solapamiento y ritmo.
- [x] Tests y GVC cubren v2 completo, v1 parcial, legacy y contenido largo en 1440/390 sin cambiar los dos enlaces de postulación.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- tests focales de `CareersDetailView`/view model y assertions de CTA/fallback
- `pnpm fe:capture <scenario> --env=staging` para 1440 y 390 + revisión GVC premium
- teclado, foco, preferencia de movimiento reducido, `scrollWidth`, console/hydration/HTTP y compare before/after

### Evidencia local 2026-08-17

- Build productivo y typecheck con heap de 8 GB: PASS.
- Suite focal del contrato, renderer, schema, publicación y seniority: 88 tests PASS; refuerzo posterior de
  fuente editorial única: 35 tests PASS.
- GVC premium local completo: `.captures/2026-08-17T16-19-21_task1741-careers-editorial-detail/`,
  1440 px + 390 px, cero errores de runtime y exactamente dos enlaces de postulación.
- Scorecard: `docs/ui/reviews/TASK-1741-public-careers-editorial-detail-renderer.scorecard.json`, promedio
  4,66 y piso 4,5.
- El quick-create de Hiring queda sólo en borrador; el writer rechaza ediciones legacy sobre una vacante v2
  si el command no incluye `publicContent`. El publish canónico sigue siendo
  `pnpm hiring:publish-vacancy --file <brief.json>`/API compartida.
- Migración `20260817160000000_task-1741-public-seniority-canonical` aplicada en Cloud SQL dev/staging;
  `pnpm pg:connect:status` confirma `No migrations to run!` y el tipo Kysely regenerado conserva el comentario
  canónico de `public_seniority`.
- Estado honesto: code complete; la activación de flags y GVC/smoke desplegado siguen pendientes.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] La evidencia visual tiene baseline, captures desktop/mobile, scorecard y decisión explícita de rollout/rollback.

## Follow-ups

- Instrumentación gobernada de view → apply si People/Growth aprueba una política de analytics/consentimiento.
- Iterar la plantilla de benefits/copy sólo a través del charter y publicación de TASK-1740; no introducir texto por componente.

## Open Questions

- ¿Cuál es el flag/ledger canónico para una variante server-side de Careers?
- ¿Qué fixture estable de staging puede usar GVC sin depender de datos sintéticos ambiguos?
- ¿Se debe mover el rail hacia antes del contenido en mobile o el hero CTA actual ya satisface acceso temprano? Validar con evidencia, no con una CTA nueva.
