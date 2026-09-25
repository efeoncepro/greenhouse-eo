# TASK-1889 — Efeonce Insights: catálogos premium aprobados (informe A4 y deck)

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
- Wireframe: `docs/ui/wireframes/TASK-1889-efeonce-insights-premium-catalogs.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1888` (Slices 3–5 necesitan su contrato; Slices 1–2 pueden empezar cuando cierre TASK-1847)
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Lleva a los catálogos `insights-report` (A4) e `insights-deck` (16:9) el diseño de informe que el operador aprobó el
2026-09-25: portadas navy y blanca con variantes por módulo, contraportada institucional, aperturas de capítulo,
páginas de prosa, páginas de gráfico premium para las familias con productor, logos de canal y roles de color en los
datos. Incluye la verificación con ediciones internas reales de Berel y Sky y el release, para que cada informe
nuevo salga así sin intervención manual.

## Why This Task Exists

Los catálogos v1 de TASK-1847 están en producción desde el 2026-09-24, pero con el diseño anterior al canvas: 6
plantillas A4 y 4 composiciones de deck, sobrias y casi monocromas. El operador revisó el canvas página por página y
lo aprobó como el aspecto que debe tener todo informe. Hoy nada de eso llega a un PDF real:

- faltan plantillas: portada blanca, contraportada, apertura de capítulo, resumen, lectura y plan;
- el catálogo tiene la paleta AXIS pero no los **roles** de dato (actual, anterior, oportunidad, ausencia);
- los isotipos de canal no están en ningún catálogo, y los datos de contacto de la contraportada están escritos a mano
  dentro de `catalogs/deck-axis/back-cover-full.html`, no en el SSOT de marca;
- las páginas de gráfico no tienen cifra principal ni panel de cierre, porque el contrato v1 no los trae (TASK-1888).

EPIC-045 prohíbe abrir una task sólo para QA o rollout, por eso la verificación con datos reales y el release viven
dentro de esta task.

## Goal

- Cada informe nuevo (A4 y deck) sale con el diseño aprobado, desde datos reales, sin pasos manuales.
- La portada (navy o blanca, con o sin canales) se dibuja según lo que TASK-1888 selló en la edición.
- Las familias con productor se dibujan con su página premium; ninguna familia sin evidencia aparece.
- Ediciones internas reales de Berel y Sky revisadas por el operador antes de compartir algo con un cliente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` — §6 y §14.7 (estado de TASK-1847)
- `docs/architecture/GREENHOUSE_ARTIFACT_VERTICAL_PAGINATION_DECISION_V1.md`
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (reglas del Artifact Composer: sin HEX
  ni fuentes literales, render hermético, gate visual a cero píxeles)
- `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`
- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`

Reglas obligatorias:

- Sin HEX, px de color ni familias tipográficas literales en plantillas: todo sale del brand pack compilado.
- `deck-axis` recompila byte-idéntico; Proposal no cambia.
- Los catálogos sólo dibujan: no deciden familia, portada ni texto; eso llega sellado del plan y la edición.
- Ninguna página muestra datos de ejemplo; el canvas es referencia visual, no fuente de cifras.
- Pie y folio son slots de plantilla, nunca post-proceso del PDF.
- Rebaseline visual sólo de frames Insights y declarado; los frames de `deck-axis` y SKY no se tocan (ISSUE-122).

## Normative Docs

- `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md` y sus hojas en
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/`.
- `docs/ui/wireframes/TASK-1889-efeonce-insights-premium-catalogs.md`
- `docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md` (nodos que entregan `report_pdf` y `deck_pdf`)
- `docs/operations/runbooks/composer-visual-gate.md`
- `.claude/skills/efeonce-insights/SKILL.md` (espejo `.codex/`)

## Dependencies & Impact

### Depends on

- `TASK-1888` — contrato de 15 familias, lectura por figura, cifra principal, entrada de capítulo, hechos esenciales,
  `channelId` y portada sellada.
- `TASK-1847` (in-progress, en producción) — catálogos v1, geometría y gate visual scoped; debe cerrar antes de tocar
  sus archivos.
- `TASK-1846` (complete) — render en el Job `artifact-worker`.

### Blocks / Impacts

- `TASK-1849` y `TASK-1875` — la vista web de la edición debe mantener los mismos roles de color y la misma lectura
  (sus propias tasks).
- `TASK-1672` — la auditoría SEO sobre el catálogo hereda plantillas nuevas.
- `deck-axis` / Proposal — sin cambios; se verifica con recompilación byte-idéntica.

### Files owned

- `src/lib/artifact-composer/catalogs/insights-report/**`
- `src/lib/artifact-composer/catalogs/insights-deck/**`
- `src/lib/efeonce-insights/render/report-mapper.ts`
- `src/lib/efeonce-insights/render/insights-deck-mapper.ts`
- `src/lib/efeonce-insights/render/figure-pages.ts`
- `src/lib/copy/insights.ts` (copy visible de las páginas nuevas)
- `src/config/efeonce-brand.ts` (datos de contacto de la contraportada)
- `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs*`
- `docs/ui/wireframes/TASK-1889-efeonce-insights-premium-catalogs.md`
- `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/` (dossier)
- baseline de frames Insights del gate visual del Composer

## Current Repo State

### Already exists

- `catalogs/insights-report/`: plantillas `report-cover`, `report-index`, `report-narrative`, `report-analysis`,
  `report-table`, `report-limits`; molde, tokens compilados, font pack local y assets `url-lum.svg` y
  `assets/contact/{map-point,phone-calling}-bold.svg`.
- `catalogs/insights-deck/`: `insights-cover`, `insights-narrative`, `insights-evidence`, `insights-limits`; logo
  negativo y URL bubble.
- Mappers de render en `src/lib/efeonce-insights/render/` y figuras de barras, líneas, porciones y dispersión.
- Geometría de 15 familias en `src/lib/artifact-composer/chart-geometry.ts`.
- Tokens AXIS para casi todos los colores del canvas (ver tabla de la dirección); faltan los grises de filete,
  etiqueta y borde punteado y los roles de dato.
- Isotipos de canal en `public/images/greenhouse/SVG/icon-google.svg` y `public/images/logos/axis/*`.
- Íconos de redes y contacto en `catalogs/deck-axis/assets/{social,contact}/`.
- `scripts/insights/preview-edition.ts` para renderizar localmente una edición real.
- `pnpm composer:visual-gate --catalog=insights` con 10 frames congelados.

### Gap

- Plantillas nuevas y rehechas según el wireframe.
- Roles de dato como tokens semánticos.
- Registro de logos de canal en ambos catálogos.
- Contraportada con datos desde el SSOT de marca.
- Portada, apertura y contraportada del deck (no diseñadas en el canvas; se derivan de A4).
- Baseline visual, dossier y scorecard de las páginas nuevas.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/artifact-composer/catalogs/insights-{report,deck}/**` (compuestos en el Job `artifact-worker`)
  + mappers en `src/lib/efeonce-insights/render/**`
- Future candidate home: `domain-package`
- Boundary: catálogos del Artifact Composer consumidos sólo vía `ResolvedCompositionManifest`; mappers reciben el
  plan y la edición sellados de TASK-1888.
- Server/browser split: catálogos y mappers corren en el worker; ningún secreto, store ni SDK en plantillas.
- Build impact: assets SVG nuevos dentro de los catálogos (isotipos, redes, contacto); sin dependencias nuevas.
- Extraction blocker: `none` nuevo.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente que recibe el informe (director de marketing o de marca) y equipo interno de Efeonce que lo
  revisa y emite.
- Momento del flujo: lectura del informe mensual en PDF (A4) o en presentación (deck).
- Resultado perceptible esperado: un informe que se entiende en dos minutos (cifra, conclusión, qué hacer) y se ve de
  agencia premium, idéntico al canvas aprobado.
- Fricción que debe reducir: gráficos sin lectura, color sin significado y portadas que no funcionan con el logo del
  cliente.
- No-goals UX: interacción, animación, edición libre, dashboards impresos.

### Surface & system decision

- Surface: documentos PDF `report_pdf` y `deck_pdf`.
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — documento físico, no pantalla del portal.
- Primitive decision: `extend` — catálogos v1 y geometría domain-free; sin librería de gráficos nueva.
- Adaptive density / The Seam: `no aplica` — el lienzo es fijo (A4 y 16:9).
- Floating/Sidecar/Dialog decision: ninguno.
- Copy source: `src/lib/copy/*`
- Access impact: `none`

### State inventory

- Default: páginas completas con datos sellados.
- Loading: no aplica al documento; la edición muestra su fase en la biblioteca (TASK-1849).
- Empty: una familia sin evidencia no se emite; un capítulo sin páginas no se abre.
- Error: el ajuste que no cabe falla y se reporta; nunca se trunca con «…».
- Degraded / partial: serie ausente con rayado y nota; plan v1 sin panel de cierre.
- Permission denied: no aplica al archivo; el acceso lo gobiernan TASK-1848/1849.
- Long content: presupuestos de slot; títulos y leads largos fallan el ajuste en test.
- Mobile / compact: no aplica (PDF a tamaño físico).
- Keyboard / focus: no aplica (sin controles); enlaces del índice reales.
- Reduced motion: no aplica (sin animación).

### Interaction contract

- Primary interaction: lectura; enlaces del índice y de folios de evidencia.
- Hover / focus / active: no aplica.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: ninguno.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: no aplica.
- Reduced-motion fallback: no aplica: documento estático.
- Non-goal motion: cualquier animación.

### Implementation mapping

- Route / surface: outputs `report_pdf` y `deck_pdf`; sin ruta de portal.
- Primitive / variant / kind: plantillas de catálogo por `contentType` (ver wireframe, «Desktop Target»).
- Component candidates: portada navy, portada blanca (con y sin canales), contraportada, apertura de capítulo, resumen,
  lectura, plan, página de gráfico por familia, índice, tabla densa, límites; equivalentes 16:9.
- Copy source: `src/lib/copy/insights.ts`; contacto desde `src/config/efeonce-brand.ts`.
- Data reader / command: plan y edición sellados de TASK-1888 vía los mappers de render.
- API parity: no aplica: sin acción de negocio; el render lo dispara el command existente.
- Access / capability: sin cambios.
- States to implement: los de «State inventory».

### GVC scenario plan

- Scenario file: no aplica: GVC exige ruta de portal; el harness es `pnpm composer:visual-gate --catalog=insights`.
- Route: ninguna.
- Viewports: A4 794×1123 y 16:9 1280×720.
- Quality profile: `premium`
- Required steps: render de fixtures por plantilla + render de ediciones internas reales de Berel y Sky.
- Required captures: cada plantilla nueva o rehecha, en color y en gris.
- Required `data-capture` markers: `data-slot` de cada región del wireframe.
- Assertions: cifras iguales al snapshot, fuentes embebidas, sin identificadores internos ni datos de ejemplo.
- Scroll-width checks: el harness verifica que ningún bloque desborde el lienzo.
- Reduced-motion / focus evidence: no aplica.
- Review dossier: `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/`
- Baseline decision / surface ID: rebaseline declarado de frames Insights; resto intacto.

### Design decision log

- Decision: adoptar el canvas aprobado como dirección `source-led`; una portada con variantes por módulo; roles de color
  en los datos; contacto al SSOT de marca; deck de estructura derivado de A4 con revisión del operador.
- Alternatives considered: recolor de v1 (rechazado por el operador) y una portada por servicio (rechazada: un informe
  mixto no tendría portada).
- Why this pattern: la identidad del informe es una; lo que cambia entre servicios es lo que mide.
- Reuse / extend / new primitive: `extend` de catálogos y geometría existentes.
- Open risks: portada, apertura y contraportada del deck sin diseño previo; grises sin token todavía.

### Visual verification

- GVC scenario: no aplica: harness del Composer.
- Viewports: A4 y 16:9 a tamaño físico.
- Required captures: ver GVC scenario plan.
- Required `data-capture` markers: `data-slot` por región.
- Scroll-width check: desborde de lienzo en el harness.
- Accessibility/focus checks: contraste AA medido y lectura en gris.
- Before/after evidence: v1 (baseline actual) contra v2 por plantilla.
- Known visual debt: ninguna declarada al crear la task.
- Visual scorecard: `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

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

### Slice 1 — Tokens y assets

- Roles de dato como tokens semánticos del brand pack (`actual`, `anterior`, `oportunidad`, `ausencia` × papel/navy)
  y los grises faltantes con rol; compilación para ambos catálogos; `deck-axis` byte-idéntico.
- Isotipos de canal, íconos de redes y de contacto copiados a los assets de ambos catálogos; registro por `channelId`.
- Datos de contacto (correo, teléfonos, dirección) en `src/config/efeonce-brand.ts`.

### Slice 2 — Páginas de estructura y prosa

- A4: portada navy, contraportada, apertura de capítulo, resumen, lectura, plan, e índice/tabla/límites con el estilo
  nuevo. Deck: resumen, lectura y plan; portada, apertura y contraportada derivadas de A4.

### Slice 3 — Portada blanca por módulo

- Portada blanca con bloque navy, satélites de canal cuando hay `channelId` y variante sin canales; línea «Qué mide
  este informe» por módulo; selección desde la portada sellada por TASK-1888.

### Slice 4 — Páginas de gráfico premium

- Plantilla base (cabecera, cifra principal, conclusión, gráfico, procedencia, panel de cierre, pie) en A4 y deck.
- Figura por cada familia con productor según la matriz de TASK-1888, con color por rol, tabla equivalente y las
  invariantes de geometría; medidor con remates compensados y valor centrado; Venn de dos conjuntos; UpSet ordenado.

### Slice 5 — Verificación con datos reales y release

- Frames nuevos en el gate visual, dossier y scorecard.
- Ediciones internas reales de Berel (`seo`,`aeo`) y Sky (`ico`) en staging; revisión del operador de cada PDF.
- Release por el control plane junto con el flag de TASK-1888; edición interna en producción; recién entonces se
  permite compartir con clientes.

## Out of Scope

- Contrato, planner, `channelId` y resolución de portada: `TASK-1888`.
- UI del builder, biblioteca y vista web: `TASK-1849` / `TASK-1875`.
- Sangrado y marcas de corte de imprenta (documentado como nota en el canvas; sólo si se decide imprimir).
- Páginas de familias sin evidencia (se agregan cuando exista el productor).
- PPTX/DOCX, `deck-axis`, Proposal Studio y `VisualProfile` (TASK-1644).

## Detailed Spec

El detalle región por región, estados y copy está en el wireframe; la dirección y el mapeo de tokens, en la dirección
visual. Dos reglas que no se repiten allí:

- **Selección de portada:** el mapper lee el tema sellado de la edición (`dark` | `light`) y el catálogo elige la
  plantilla; la variante blanca con o sin canales se decide por la presencia de `channelId` en las series de la
  edición. El catálogo nunca consulta la organización ni el logo en vivo.
- **Folio total:** «NN / total» sale del plan de páginas de `paginateFlow()` de la misma composición; nunca un número
  fijo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- Slices 3 y 4 requieren TASK-1888 en `develop`; Slices 1–2 pueden avanzar antes.
- Slice 5 no promueve a producción sin el flag de TASK-1888 listo para prenderse en el mismo release.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ediciones ya emitidas cambian de aspecto al re-renderizar | worker / PDF al cliente | medium | los outputs sellados componen con su catálogo sellado; test de re-render de una edición v1 | diferencia en re-render |
| Un cambio de tokens altera `deck-axis` | Proposal | low | recompilación byte-idéntica en test | `composer:brand-pack --check` |
| Rebaseline arrastra frames ajenos | gate visual | low | `--catalog=insights` scoped | gate global |
| Logo del cliente invisible en portada | PDF al cliente | medium | portada sellada por TASK-1888 + revisión del operador antes de compartir | revisión del operador |
| Página con datos de ejemplo en producción | PDF al cliente | low | assertions del harness + fixtures separados | test de no-fuga |
| Deck de estructura no aprobado | PDF al cliente | medium | revisión del operador antes del baseline | revisión del operador |

### Feature flags / cutover

- Sin flag propio: los catálogos rehechos entran con el flag de TASK-1888 (`INSIGHTS_EDITORIAL_V2_ENABLED`). Una
  edición generada con el flag OFF sigue usando el contrato v1 y compone con las plantillas que ese contrato alimenta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; `deck-axis` intacto por construcción | < 15 min | si |
| Slice 2–4 | revert PR + redeploy del worker por el control plane | < 30 min | si |
| Slice 5 | flag de TASK-1888 OFF; release anterior por el control plane | < 15 min | si |

### Production verification sequence

1. Local: `scripts/insights/preview-edition.ts` con Berel y Sky; inspección de todas las páginas en color y en gris.
2. Staging: ediciones internas con el flag ON; PDFs revisados por el operador.
3. Gate visual scoped verde y baseline congelado junto al catálogo en el mismo commit.
4. Producción por el control plane; flag ON; una edición interna real en producción revisada antes de compartir.

### Out-of-band coordination required

- Revisión y aprobación del operador de los PDFs de Berel y Sky, y de la portada/apertura/contraportada del deck.
- Carga de logos de cliente aptos para fondo oscuro (operador, vía TASK-1888).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: layout`; `Wireframe` existe; `UI ready` permanece `no`
  hasta completar mapping, dossier y scorecard.
- [ ] Las plantillas del wireframe existen en ambos catálogos y componen desde fixtures y desde ediciones reales.
- [ ] Ninguna plantilla contiene HEX, px de color ni familias tipográficas literales; `deck-axis` recompila
  byte-idéntico.
- [ ] Los roles de dato existen como tokens y ninguna pareja de series se distingue sólo por color (lectura en gris).
- [ ] La portada dibujada coincide con el tema sellado en la edición; la blanca muestra canales sólo con `channelId`.
- [ ] La contraportada toma correo, teléfonos y dirección de `src/config/efeonce-brand.ts`.
- [ ] Cada familia con productor tiene su página A4 y su lámina; ninguna familia sin evidencia aparece.
- [ ] Un plan v1 compone sin panel de cierre y sin errores.
- [ ] El folio muestra el total real de páginas.
- [ ] El copy visible reusable vive en `src/lib/copy/insights.ts`.
- [ ] `pnpm composer:visual-gate --catalog=insights` pasa a cero píxeles con los frames nuevos declarados.
- [ ] Dossier y scorecard con promedio ≥ 4,5 y piso ≥ 4 sobre el render real.
- [ ] El operador aprobó los PDFs internos de Berel y Sky y la estructura del deck.
- [ ] En producción, una edición interna real compone con el diseño nuevo antes de compartir con clientes.

## Verification

- `pnpm local:check`
- `pnpm test` (suite completa al cierre) y `pnpm build` con autorización del operador
- `pnpm composer:brand-pack --check` y tests del Artifact Composer
- `pnpm composer:visual-gate --catalog=insights`
- `scripts/insights/preview-edition.ts --edition=<id> --org=<org>` con Berel y Sky
- `pnpm task:lint --task TASK-1889`, `pnpm ui:wireframe-check --task TASK-1889`, `pnpm design-contract:lint`,
  `pnpm ui:quality --task TASK-1889`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada y espejada a `.codex/` con `pnpm skills:mirrors` verde.
- [ ] Arquitectura §14, documentación funcional y manual de uso de Insights actualizados.
- [ ] EPIC-045 actualizado con el estado real de la unidad.

## Follow-ups

- Sangrado y marcas de corte en el render de producción, sólo si se decide imprimir en imprenta.
- Páginas de las familias hoy sin evidencia, cuando su productor exista (Follow-ups de TASK-1888).

## Open Questions

- Diseño final de portada, apertura y contraportada del deck: se deriva de A4 y lo aprueba el operador en Slice 2.
