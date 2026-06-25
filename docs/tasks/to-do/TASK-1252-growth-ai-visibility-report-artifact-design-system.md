# TASK-1252 — Growth AI Visibility: Report Artifact Design System

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui|communications`
- Blocked by: `TASK-1235, TASK-1239`
- Branch: `task/TASK-1252-growth-ai-visibility-report-artifact-design-system`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Define y disena el informe completo del AI Visibility Grader como un artefacto reusable: sistema visual, componentes, variantes por superficie y visuales aprobadas. Este informe alimenta la pagina publica, el portal cliente y el adjunto del email; no debe quedar implícito dentro de la task de delivery.

## Why This Task Exists

`TASK-1235/1239` ya entregan el contrato de datos (`PublicGraderReport` + snapshot tokenizado), `TASK-1241/1248` renderizaran el reporte en pantalla y `TASK-1250` lo enviara por email con adjunto. Falta una task explicita para decidir **como se ve y se compone el informe**: portada, resumen ejecutivo, score, dimensiones, gaps, recomendaciones, tendencia, disclaimers, estados parciales y version imprimible/adjunta.

Sin esta task, cada consumer podria inventar su propia representacion del mismo reporte, creando drift visual, copy duplicado, diferencias de disclosure y riesgo de fuga de datos public-safe.

## Goal

- Crear una direccion visual aprobada con Product Design para el informe completo del AI Visibility Grader.
- Definir un sistema de componentes reportables y reutilizables para web, portal cliente, admin preview y adjunto/email.
- Declarar variantes, estados, copy source, guardrails public-safe y criterios de verificacion visual antes de implementar `TASK-1241`, `TASK-1248` y el adjunto de `TASK-1250`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 public/internal report artifact, §9 public experience, §11 programmatic contract, §13 privacy/security.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive/contract, muchos consumers; la UI no reimplementa logica de reporte.
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` — base por defecto para superficies web nuevas que muestren el informe.
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md` — primitive + variants + kinds para componentes reusable.
- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md`
- `docs/tasks/complete/TASK-1239-growth-ai-visibility-public-report-snapshot-token-reader.md`

Reglas obligatorias:

- El informe renderiza exclusivamente desde `PublicGraderReport` o desde el DTO cliente/admin autorizado; nunca desde raw provider observations ni desde `GraderReport` interno en superficies publicas.
- Los componentes de reporte no calculan score, gaps, tendencia ni recomendaciones; solo presentan campos del contrato ya construido.
- No exponer `providerFindings`, `accuracyFindings`, raw provider text, prompts, citation URLs crudas, IDs internos sensibles ni reclamos de ranking garantizado.
- **Lo compartido es el report MODEL, no un componente con variantes CSS (hallazgo de fondo — mismo patrón core/wrapper de TASK-1231):** web (React/MUI + ECharts + container queries + motion) y attachment (PDF/print-HTML: sin JS, sin ECharts runtime, sin `@container`, estilos inline, layout print) **no pueden compartir primitives de render**. El SoT reusable = (a) report model (orden de secciones + mapeo de campos), (b) disclosure matrix por audience/variant, (c) copy, (d) contrato de encoding/a11y. El RENDER es un **adapter por target** (web React/MUI vs print/PDF), NO una sola pieza MUI forzada a ser también email/PDF. No "estandarizar hacia abajo" la web a las limitaciones de print.
- **Charts en attachment = estáticos** (SVG/PNG server-rendered) o tabla; NUNCA ECharts vivo (no hay JS en PDF/email). El table-fallback de a11y dobla como representación del attachment.
- **Attachment ≠ email body:** el informe completo adjunto es un **documento standalone (PDF / print-HTML)** gobernado por constraints de print/PDF (sin JS, sin hover); el **cuerpo del email** (resumen breve) es el React Email de TASK-1250 con constraints de email-client (inline styles, tablas, sin flexbox Outlook). No confundir los dos sets de constraints.
- **Marca (artefacto cliente/público/PDF):** brand assets desde el SSOT `src/config/efeonce-brand.ts` (nunca hardcode); **NUNCA usar el `AxisWordmark`** — es solo del design system, prohibido en producto/portal cliente/PDF/email (regla dura CLAUDE.md). Tokens AXIS + tipografía vía SoT, no HEX/px inline.
- La variante web debe nacer responsive, accesible y compatible con GVC desktop/mobile.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/to-do/TASK-1241-growth-ai-visibility-public-lead-magnet-page.md`
- `docs/tasks/to-do/TASK-1248-growth-ai-visibility-client-report-ui.md`
- `docs/tasks/to-do/TASK-1250-growth-ai-visibility-email-report-delivery.md`
- `src/lib/growth/ai-visibility/report/contracts.ts`
- `src/lib/copy/growth.ts`

## Dependencies & Impact

### Depends on

- `TASK-1235` — contrato `GraderReport` / `PublicGraderReport`, recommendation pack, trend and public-safe leak tests.
- `TASK-1239` — snapshot publico inmutable y token reader; fuente congelada para consumidores publicos.
- Product Design visual exploration for this task — assets deben guardarse en `docs/assets/product-design/task-1252-ai-visibility-report-artifact-design-system/`.

### Blocks / Impacts

- Bloquea la parte de render de reporte de `TASK-1241` para evitar que la pagina publica invente componentes paralelos.
- Bloquea la parte de render de reporte de `TASK-1248` para que el portal cliente consuma el mismo sistema visual.
- Bloquea el diseno del adjunto completo de `TASK-1250`; el email puede usar resumen breve, pero el informe adjunto debe seguir este artefacto.
- Alimenta `TASK-1247` como referencia visual de preview public-safe en admin review.

### Files owned

- `docs/tasks/to-do/TASK-1252-growth-ai-visibility-report-artifact-design-system.md`
- `docs/assets/product-design/task-1252-ai-visibility-report-artifact-design-system/**`
- `src/components/growth/ai-visibility/report-artifact/**` (nuevo, si se implementa como feature-local component system)
- `src/components/greenhouse/primitives/**` (solo si el Plan decide promover una primitive platform-level; requiere Lab/docs UI Platform)
- `src/lib/copy/growth.ts` (extend-only para labels/copy reutilizable del informe)

## Current Repo State

### Already exists

- `src/lib/growth/ai-visibility/report/contracts.ts` define `PublicGraderReport`, `ReportHeadline`, `PublicReportDimension`, `PublicReportRecommendation`, `PublicPrimaryGap`, `CitationInsight`, `SentimentSummary`, `PositionSummary`, `ReportTrend`, `ReportProvenance` y `GraderReportGate`.
- `TASK-1235` implemento el report builder public-safe y `TASK-1239` congela snapshots publicos.
- `TASK-1241`, `TASK-1248` y `TASK-1250` ya declaran consumidores visibles del reporte, pero no comparten un sistema visual aprobado para el informe completo.
- `TASK-1250` ya tiene direccion visual aprobada para el email de entrega, no para el informe adjunto en si.

### Gap

- No existe visual aprobada del informe completo.
- No existe sistema de componentes para portada, score hero, breakdown, gaps, recomendaciones, tendencia, coverage/provenance y disclaimers.
- No existe contrato de variantes por superficie (`publicWeb`, `clientPortal`, `attachment`, `adminPreview`).
- No existe asset/version de referencia Product Design para implementar o revisar el informe.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: prospecto publico, cliente autenticado, operador interno revisando preview y recipient del email.
- Momento del flujo: despues de que un snapshot `PublicGraderReport` esta listo o parcialmente listo.
- Resultado perceptible esperado: el usuario entiende en menos de 30 segundos su score, brecha principal, evidencia agregada segura y proximo paso; el informe completo puede leerse en pantalla o como adjunto.
- Friccion que debe reducir: confusion entre score, diagnostico, evidencia, recomendacion y oferta comercial; riesgo de que cada superficie cuente una historia distinta.
- No-goals UX: cambiar scoring, recalibrar recomendaciones, crear un builder PDF tecnico, disenar newsletter/nurturing o crear una landing hero nueva.

### Surface & system decision

- Surface: sistema de componentes del informe para web + attachment/print + admin preview.
- Composition Shell: `aplica` para superficies web consumidoras (`TASK-1241`, `TASK-1248`, `TASK-1247`) porque el informe tiene regiones de resumen, detalle, recomendaciones y contexto.
- Primitive decision: `new` initially feature-local — el report model + componentes web `AiVisibilityReportArtifact` con variants/kinds; promover a `src/components/greenhouse/primitives/**` solo si el Plan demuestra reuse cross-domain (con protocolo completo: Lab `/admin/design-system`, GVC, route-reachability). El artefacto es **contenido de región**, no un Composition Shell en sí.
- Adaptive density / The Seam: `aplica` para cards/secciones del informe en web; cada bloque condensa por ancho propio sin overflow (`@container`, solo web — el attachment usa layout fijo print).
- Floating/Sidecar/Dialog decision: N/A en el artefacto base; admin preview puede usar sidecar en `TASK-1247`, pero esta task define el contenido reusable.
- Copy source: `src/lib/copy/growth.ts` (invocar `greenhouse-ux-writing`, es-CL).
- Access impact: `none` — esta task define representacion; acceso/token/capability vive en consumers backend.

**Contrato de encoding + a11y + copy (centralizado aquí — todos los consumers lo heredan, no lo re-deciden):**

- **Dataviz (skill `dataviz-design`):** score = big-number/gauge **con contexto/benchmark** (nunca número aislado), `tabular-nums`; dimensiones = horizontal bar **desde 0**; severidad **nombrada + ícono/forma, NUNCA color-only**; paleta **colorblind-safe** (probada en dark para web); `null≠0` explícito; trend con eje honesto + delta con período explícito.
- **A11y (skill `a11y-architect`) como parte del contrato, no solo verificación:** jerarquía de headings semántica, score como texto semántico (no solo visual), **charts con table fallback + `aria`/`role=img`** (el fallback dobla como representación de attachment), contraste AA en light/dark, links/anchors focusables en web. El path print-HTML preserva semántica/headings.
- **Copy/legal (skill `greenhouse-ux-writing` + review legal):** regla dura **"estimación, no garantía de ranking"** centralizada acá; disclaimer public-safe es-CL; el score NUNCA se enuncia como promesa. Todo en `src/lib/copy/growth.ts`.

### State inventory

- Default: reporte listo con score, headline, primary gap, dimensiones, recomendaciones, trend, provenance y disclaimer.
- Loading: no aplica al artefacto puro; consumers web manejan skeleton/poll.
- Empty: snapshot sin reporte no renderiza el artefacto; consumer muestra estado propio.
- Error: no aplica al artefacto puro; consumers manejan errores de lectura/token.
- Degraded / partial: reporte parcial debe mostrar coverage/provenance y next action sin precision falsa.
- Permission denied: no aplica al artefacto puro; token/capability vive fuera.
- Long content: recomendaciones y findings deben truncar/ordenar con jerarquia; attachment puede incluir mas detalle que el cuerpo del email.
- Mobile / compact: score, gap y CTA accionable deben seguir visibles sin scroll horizontal.
- Keyboard / focus: links/anchors del informe y acciones de descarga/abrir deben ser focusables en consumers.
- Reduced motion: attachment sin motion; web puede usar motion suave solo si reduced-motion degrada a instantaneo.

### Interaction contract

- Primary interaction: leer el informe, abrir secciones, descargar/adjuntar version completa o seguir CTA de recomendacion en consumer.
- Hover / focus / active: solo en web consumers; attachment no depende de hover.
- Pending / disabled: N/A en el artefacto base.
- Escape / click-away: N/A en el artefacto base.
- Focus restore: N/A en el artefacto base.
- Latency feedback: N/A en el artefacto base.
- Toast / alert behavior: N/A en el artefacto base.

### Motion & microinteractions

- Motion primitive: `Motion|framer layout|CSS` solo para web variants, `none` para attachment.
- Enter / exit: entrada sutil por secciones en web si aporta comprension.
- Layout morph: permitido entre summary/detail en web; prohibido en attachment.
- Stagger: opcional, corto, solo web.
- Timing / easing token: usar tokens motion existentes si hay motion.
- Reduced-motion fallback: obligatorio, sin perdida de contenido.
- Non-goal motion: animaciones decorativas, charts que dependan de motion para entenderse, GIFs en email/attachment.

### Visual verification

- GVC scenario: crear scenario dedicado para la vista runtime que implemente el informe; si esta task produce solo mockup/docs, registrar GVC como pendiente de implementacion.
- Viewports: desktop 1440px y mobile 390px como minimo.
- Required captures: report default, partial/degraded, long content, mobile compact.
- Required `data-capture` markers: `ai-visibility-report`, `ai-visibility-report-score`, `ai-visibility-report-recommendations`, `ai-visibility-report-provenance`.
- Scroll-width check: medir `scrollWidth === clientWidth` en desktop y mobile 390px para superficies web.
- Accessibility/focus checks: heading order, semantic score text, labels de charts, contrast, keyboard links.
- Before/after evidence: Product Design assets + GVC runtime cuando se implemente.
- Known visual debt: no existe renderer/preview PDF dedicado; si V1 usa HTML/print, documentar limite y follow-up PDF premium.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Product Design visual direction

- Generar 3 opciones visuales del informe completo con `@product-design`.
- Cubrir al menos: portada/resumen ejecutivo, score hero, dimensiones, primary gap, recomendaciones, trend, coverage/provenance, disclaimer y partial state.
- Guardar assets en `docs/assets/product-design/task-1252-ai-visibility-report-artifact-design-system/`.
- Documentar en esta task la direccion aprobada, igual que en `TASK-1241`, `TASK-1247`, `TASK-1248` y `TASK-1250`.

### Slice 2 — Report artifact component contract

- Definir el set de componentes feature-local o primitive-level:
  - `AiVisibilityReportArtifact`
  - `AiVisibilityReportCover`
  - `AiVisibilityScoreHero`
  - `AiVisibilityDimensionBreakdown`
  - `AiVisibilityPrimaryGapCard`
  - `AiVisibilityRecommendationList`
  - `AiVisibilityTrendPanel`
  - `AiVisibilityCoverageNotice`
  - `AiVisibilityProvenanceFooter`
- Definir variants: `publicWeb`, `clientPortal`, `attachment`, `adminPreview`.
- Definir kinds/slots si aplica: `leadMagnet`, `clientMonitor`, `emailAttachment`, `reviewPreview`.

### Slice 3 — State and disclosure matrix

- Mapear cada campo de `PublicGraderReport` a una seccion visual.
- Definir que se muestra/oculta por audience y variant.
- Documentar estados `ready`, `partial`, `insufficient_data`, `review_required` y expirado/token invalido como responsabilidad del consumer.
- Definir copy source y labels en `src/lib/copy/growth.ts`.

### Slice 4 — Implementation handoff

- Agregar criterios de consumo para `TASK-1241`, `TASK-1248` y `TASK-1250`.
- Si se decide implementar componentes en esta misma task, validar con GVC desktop/mobile y tests de no-leak visual.
- Si se decide que esta task queda como design+contract only, crear follow-up de implementacion antes de tomar `TASK-1241/1248/1250`.

## Out of Scope

- Cambiar `PublicGraderReport`, scoring, recommendation pack o snapshot schema.
- Implementar email delivery, idempotency o attachment builder de `TASK-1250`.
- Implementar la pagina publica completa de `TASK-1241`.
- Implementar portal cliente completo de `TASK-1248`.
- Exponer hallazgos internos, provider raw text, accuracy findings o evidencia cruda.
- Diseñar nurturing/marketing automation posterior.

## Detailed Spec

El informe debe leerse como un producto editorial operativo, no como dump de JSON ni como dashboard generico. La jerarquia base debe priorizar:

1. **Verdicto ejecutivo:** score, severidad nombrada, frame temporal y confianza/cobertura.
2. **Brecha principal:** `primaryGap` y `recommendedMotion` con accion clara.
3. **Diagnostico por dimensiones:** dimensiones public-safe con `null≠0` visible y explicable.
4. **Señales AEO agregadas:** citation share, sentiment, position y competitive share sin URLs/evidencia cruda.
5. **Tendencia:** si hay historico comparable, mostrar delta; si no, estado honesto.
6. **Recomendaciones:** lista priorizada con accion concreta y sin prometer ranking.
7. **Provenance/disclaimer:** as-of, prompt pack/score/report versions cuando corresponda, providers sampled como muestra agregada y disclaimer public-safe.

El asset visual aprobado debe contener una version amplia y una variante compacta/attachment. El objetivo no es solo verse bien: debe producir un contrato que los implementadores puedan llevar a React/MUI, React Email/PDF o print HTML sin inventar otra estructura.

### Approved visual direction

Product Design direction approved on 2026-06-25: **Executive Report Atlas**.

Use Option 1 as the implementation base because it is the strongest shared report artifact: it reads as a premium executive report, preserves the web/PDF bridge, and keeps score, dimensions, priority gap, AEO signals, recommendations, provenance and disclaimer in one clear hierarchy.

Blend these elements into the final report artifact system:

- Base from **Option 1 — Executive Report Atlas**: executive report reading order, score hero with coverage, priority gap, dimensions, AEO signals, recommendations and PDF preview.
- Add from **Option 2 — Signal Workbench Report**: explicit model/variant discipline (`publicWeb`, `clientPortal`, `attachment`, `adminPreview`), provenance inspector, readiness metadata and implementation tags for the component contract.
- Add from **Option 3 — Print-Native Signal Dossier**: PDF/print-first discipline for the attachment adapter, static charts/table fallback, standalone report cover and legal-safe disclosure tone.

Versioned visual assets:

- `docs/assets/product-design/task-1252-ai-visibility-report-artifact-design-system/executive-report-atlas.png`
- `docs/assets/product-design/task-1252-ai-visibility-report-artifact-design-system/signal-workbench-report.png`
- `docs/assets/product-design/task-1252-ai-visibility-report-artifact-design-system/print-native-signal-dossier.png`

Implementation guardrails:

- Treat **Executive Report Atlas** as the canonical visual target for the shared report model and web reading order.
- Treat **Signal Workbench Report** as the source for variant naming, section/component inventory and admin/client operational metadata.
- Treat **Print-Native Signal Dossier** as the source for the attachment/PDF adapter: static charts, print-safe spacing, standalone cover, no JS/runtime chart dependency.
- Keep the shared contract at the model/disclosure/copy/encoding layer; implement render adapters by target (`web React/MUI`, `print/PDF`, `email body` stays in `TASK-1250`).
- Keep all public/client/attachment surfaces public-safe: no `providerFindings`, `accuracyFindings`, raw provider text, prompt text, raw citation URLs, internal IDs or guaranteed ranking claims.
- Use Efeonce/Greenhouse brand sources and tokens; do not use `AxisWordmark` in public/client/PDF/email artifacts.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (visual direction) -> Slice 2 (component contract) -> Slice 3 (state/disclosure matrix) -> Slice 4 (handoff/implementation decision). No implementar consumers (`TASK-1241`, `TASK-1248`, attachment de `TASK-1250`) antes de tener aprobada la direccion visual y el disclosure matrix.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Drift visual entre public web, portal cliente y attachment | UI | medium | Un solo component contract con variants y assets aprobados | review visual/GVC detecta divergencia |
| Fuga de data interna en informe publico | privacy/legal | medium | Mapear solo `PublicGraderReport`; no-leak visual checklist | tests de leak + review de fields |
| Attachment imposible de renderizar por usar patrones web-only | communications | medium | Adapter de render separado (no un componente MUI forzado); charts estáticos (SVG/PNG/tabla), sin JS/motion/`@container` | fallo en preview/render de TASK-1250 |
| Forzar la web a constraints de print ("estandarizar hacia abajo") | UI/product | medium | Shared = report model + disclosure + copy; render por target; web mantiene ECharts/CQ/motion | web pobre vs el potencial del contrato |
| AxisWordmark u otro asset DS-only se filtra al artefacto cliente/PDF | brand | low | Brand desde `efeonce-brand.ts`; AxisWordmark prohibido fuera del design system | review de marca |
| Score se percibe como garantia de ranking | legal/commercial | medium | copy/disclaimer public-safe y lenguaje de estimacion | legal review / feedback comercial |
| Mobile con overflow o jerarquia rota | UI | medium | The Seam + GVC 390px + scrollWidth check | scrollWidth > clientWidth |

### Feature flags / cutover

- Sin flag en esta task si se limita a design/contract/assets.
- Consumers runtime (`TASK-1241`, `TASK-1248`, `TASK-1250`) declaran sus propios flags/cutover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Reemplazar direccion visual documentada antes de implementar consumers | <10 min | si |
| Slice 2 | Ajustar contrato de componentes antes de runtime | <15 min | si |
| Slice 3 | Ajustar disclosure matrix/copy antes de runtime | <15 min | si |
| Slice 4 | Reabrir task o crear follow-up si el handoff queda incompleto | <10 min | si |

### Production verification sequence

1. Validar Product Design assets y direccion aprobada con el operador.
2. Validar task lint/ops lint.
3. Durante implementacion runtime posterior: GVC desktop/mobile de los consumers y visual no-leak checklist.
4. Durante `TASK-1250`: preview/render de attachment contra fixtures `PublicGraderReport` ready + partial.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen 3 opciones visuales Product Design del informe completo y sus assets versionados.
- [ ] La direccion visual aprobada queda documentada en esta task.
- [ ] El component contract declara componentes, variants, kinds/slots y audience/disclosure boundaries.
- [ ] El contrato separa report MODEL compartido (secciones+mapeo+disclosure+copy+encoding/a11y) del RENDER por target (web React/MUI vs print/PDF); no es un componente MUI forzado a ser también email/PDF.
- [ ] Variante `attachment` definida con charts estáticos (SVG/PNG/tabla, sin ECharts vivo) y sin JS/motion/`@container`; disambiguada del email body de TASK-1250.
- [ ] El contrato centraliza encoding (score con contexto, bar desde 0, severidad no color-only, colorblind-safe), a11y (heading order, chart table fallback + aria) y copy ("estimación, no garantía"); los consumers lo heredan.
- [ ] Marca desde `efeonce-brand.ts`; sin `AxisWordmark` en el artefacto cliente/público/PDF.
- [ ] La task declara si el sistema nace feature-local o se promueve a primitive platform-level con Lab/docs.
- [ ] El mapping desde `PublicGraderReport` a secciones visuales esta documentado.
- [ ] Estados `ready`, `partial`, `insufficient_data`, `review_required`, long content y mobile/attachment quedan cubiertos o explicitamente delegados.
- [ ] Copy reusable queda planificado en `src/lib/copy/growth.ts`.
- [ ] No hay raw provider evidence, `providerFindings`, `accuracyFindings`, prompts, URLs crudas ni IDs internos sensibles en el contrato visual.
- [ ] `TASK-1241`, `TASK-1248` y `TASK-1250` quedan sincronizadas como consumers del report artifact design system.

## Verification

- `pnpm task:lint --task TASK-1252`
- `pnpm ops:lint --changed`
- Revision manual de los assets Product Design aprobados.
- GVC desktop/mobile cuando exista runtime o mockup ejecutable.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados si se implementa runtime o se aprueba direccion visual relevante
- [ ] `EPIC-020` child tasks/exit criteria sincronizados
- [ ] Consumers `TASK-1241`, `TASK-1248`, `TASK-1250` referencian esta task o su direccion aprobada

## Follow-ups

- Implementacion del sistema visual si esta task cierra solo design+contract.
- Renderer PDF premium si V1 se limita a HTML/print-safe.
- Admin report preview richer si `TASK-1247` necesita comparar interno vs publico.

## Open Questions

1. ¿El informe adjunto V1 sera PDF real o HTML/print-safe adjunto? `TASK-1250` mantiene la decision tecnica; esta task define la forma visual.
2. ¿El sistema de componentes nace feature-local o como primitive platform-level de report artifacts? Propuesta inicial: feature-local; promover solo si aparece reuse fuera de AI Visibility.
