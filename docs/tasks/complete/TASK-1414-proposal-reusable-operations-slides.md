# TASK-1414 — Láminas reutilizables de operación para propuestas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Complete · tres patrones canonizados · SKY deck v5 adjunto como draft`
- Rank: `TBD`
- Domain: `commercial|content|platform`
- Blocked by: `none`
- Branch: `develop` (excepción local-first documentada; sin push)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear tres patrones de lámina reutilizables para propuestas comerciales y licitaciones: `stack operativo`,
`día a día` y `anatomía del Content Hub`. El primer consumidor será el deck SKY Blog 2026, pero el
resultado debe vivir como contenido/plantilla slot-driven del Artifact Composer, no como láminas
hardcodeadas a SKY.

La task debe incorporar el stack real de operación de Efeonce: Notion, Frame.io, Teams/Slack,
Microsoft 365, Semrush, Ahrefs, Screaming Frog, Brand Visibility Grader, Adobe Creative Cloud,
Adobe Express, bancos licenciados y suites de IA creativa como Adobe Firefly, Higgsfield y Magnific.

## Why This Task Exists

El deck actual de SKY ya defiende diagnóstico, metodología, equipo, cumplimiento y economía, pero no
muestra con suficiente claridad **cómo se opera el servicio en el día a día** ni qué sistema de trabajo
recibe el cliente. Esa falta obliga al evaluador a inferir el modelo operativo desde varias láminas.

También hay un riesgo de craft: una lámina de "herramientas" puede volverse un cementerio de logos. El
composer necesita patrones que ordenen las herramientas por trabajo, muestren el flujo de colaboración y
enseñen el Content Hub como artefacto operable, con comentarios, versionamiento y trazabilidad SEO/AEO.

## Goal

- Agregar tres patrones reutilizables, slot-driven y client-facing para explicar la operación Efeonce en
  propuestas.
- Insertarlos en el deck SKY como primer consumidor sin quemar `SKY`, textos de prototipo ni proveedores
  como constantes dentro del catálogo.
- Mantener el contrato del Artifact Composer: catálogo cerrado, fail-closed, anti-fuga de prototipo,
  agenda derivada, enlaces preservados y revisión visual de todos los frames.
- Dejar documentación suficiente para reutilizar los tres patrones en futuros decks de venta, QBR,
  licitaciones o propuestas ASaaS.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/documentation/proposal-studio/el-motor-de-composicion.md`
- `docs/documentation/comercial/tender-deck-composer.md`

Reglas obligatorias:

- El deck se compone desde catálogo cerrado. Si una intención no cabe, se abre gap de catálogo; no se
  dibuja freehand.
- El resultado son **patrones reutilizables**, no tres slides one-off. Si `CardGridFull`,
  `ProcessStepsFull`, `MaturityLadderFull` u otra plantilla existente cubren el trabajo, reutilizar y
  registrar esa decisión antes de crear una plantilla nueva.
- El `DeckPlan` declara `contentType` + `slots`; el selector conserva autoridad sobre la plantilla.
- No hardcodear `SKY`, URLs, textos de prototipo ni assets de un cliente dentro de HTML/slots del
  catálogo. El probe required-only debe limpiar opcionales.
- No usar logos de terceros en el PDF client-facing salvo que el asset/fuente/derecho de uso esté
  documentado. Si no, usar nombres, categorías e iconografía neutral del catálogo.
- Todo claim de herramienta, banco de fotos, IA creativa, SEO/AEO o workflow debe poder leerse como
  capacidad operativa, no como promesa de resultado automático.

## Normative Docs

- `.codex/skills/deck-studio/SKILL.md`
- `.codex/skills/deck-studio/composition.md`
- `.codex/skills/greenhouse-public-private-tenders/SKILL.md`
- `.codex/skills/greenhouse-public-private-tenders/proposal-studio-runtime.md`
- `.codex/skills/greenhouse-public-private-tenders/deck-visual-system.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/manual-de-uso/comercial/componer-deck-de-licitacion.md`
- `docs/manual-de-uso/proposal-studio/generar-el-deck-de-una-propuesta.md`
- `docs/commercial/tenders/sky-blog-2026/README.md`
- `docs/commercial/tenders/sky-blog-2026/SESSION-BRIEF.md`
- `docs/commercial/tenders/sky-blog-2026/oferta-tecnica.md`
- `docs/commercial/tenders/sky-blog-2026/deck-plan.json`

## Dependencies & Impact

### Depends on

- `TASK-1393` / `TASK-1394` completas: el Artifact Composer vive en `src/lib/artifact-composer/**` y
  el catálogo `deck-axis` está componible, con anti-fuga y visual gate.
- `TASK-1412` / `TASK-1413` completas: el Proposal Studio ya versiona y descarga artefactos; esta task
  no toca esa UI ni el contrato de descarga.
- `TASK-1410` completa: la Radiografía AEO ya existe como muestra viva; esta task sólo explica el sistema
  operativo alrededor del contenido.

### Blocks / Impacts

- Impacta el deck SKY Blog 2026 como primer consumidor: `docs/commercial/tenders/sky-blog-2026/deck-plan.json`.
- Impacta el catálogo `deck-axis` sólo si Discovery concluye que las plantillas existentes no bastan.
- Puede impactar el baseline visual del composer y sus deltas documentados.
- Deja patrones reutilizables para futuras propuestas de SEO/AEO, contenido, social media, QBR y ASaaS.

### Files owned

- `docs/tasks/complete/TASK-1414-proposal-reusable-operations-slides.md`
- `docs/commercial/tenders/sky-blog-2026/deck-plan.json`
- `src/lib/artifact-composer/catalogs/deck-axis/registry.json`
- `src/lib/artifact-composer/catalogs/deck-axis/*.html`
- `src/lib/artifact-composer/catalogs/deck-axis/*.slots.json`
- `src/lib/artifact-composer/catalogs/deck-axis/resolvers.ts`
- `src/lib/artifact-composer/catalogs/deck-axis/semantic-validators.ts`
- `src/lib/artifact-composer/__tests__/template-composability.test.ts`
- `src/lib/artifact-composer/__tests__/selector.test.ts`
- `scripts/frontend/baselines/artifact-composer/**`
- `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`
- `docs/documentation/proposal-studio/el-motor-de-composicion.md`
- `docs/documentation/comercial/tender-deck-composer.md`
- `docs/manual-de-uso/comercial/componer-deck-de-licitacion.md`

## Current Repo State

### Already exists

- El deck SKY actual se compone desde `docs/commercial/tenders/sky-blog-2026/deck-plan.json`.
- El catálogo `deck-axis` ya tiene plantillas reutilizables como `CardGridFull`, `ProcessStepsFull`,
  `MaturityLadderFull`, `ArtifactShowcaseFull`, `DualTextSplit` y `FourPillarsFull`.
- El composer ya preserva enlaces externos `https://`, agenda navegable derivada del plan, visual gate
  y probes required-only anti-fuga.
- El PDF vigente del proposal está versionado en Proposal Studio; el portal ya permite verlo/descargarlo.

### Gap

- No existe una lámina reusable que explique el stack de herramientas por función operativa.
- No existe una lámina reusable que explique el día a día con Efeonce: conversaciones, proyecto en
  Notion, Content Hub, comentarios, Frame.io, versionamiento y aprobación.
- No existe una lámina reusable que muestre la anatomía de un artículo en el Content Hub: brief,
  KW mining, intención, estructura H1/H2/H3, metadata, schema, fuentes, checklist, texto y comentarios.
- El deck SKY puede quedar convincente en diagnóstico y precio, pero débil en cómo se vivirá la
  operación mensual con el equipo adjudicado.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/artifact-composer/catalogs/deck-axis/` (catálogo) + `docs/commercial/tenders/sky-blog-2026/deck-plan.json` (primer consumidor).
- Future candidate home: `remain-shared`
- Boundary: patrones de slide del catálogo `deck-axis`, consumidos por `pnpm deck:compose`, Proposal
  Studio/artifact-worker y futuros DeckPlans; ninguna ruta UI, API o dominio de negocio importa HTML de
  plantilla directamente.
- Server/browser split: `n/a` — el composer corre en Node/Chromium; el PDF/PNG son artefactos derivados.
- Build impact: `none` salvo nuevos baselines PNG y posible incremento de peso del PDF; sin dependencias
  nuevas ni deployables.
- Extraction blocker: `none` — mantener templates/slots/resolvers dentro del catálogo y no acoplarlos a
  SKY ni a runtime de Proposal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Execution Plan / Audit — 2026-07-15

- Excepción de goal preflight: el operador ordenó `planea ... y luego ejecuta de inmediato` sin un
  `/goal` explícito; se ejecutó en el mismo turno y se documenta aquí en vez de detener la iteración.
- Decisión de catálogo: tres content types y tres plantillas nuevas. Los moldes existentes no cubrían
  marcas reales por etapa, colaboración simultánea ni la anatomía interna de un entregable editorial.
- Slices 1-4: construidos y compuestos de forma aislada. `ToolStackFull`, `DailyOpsHubFull` y
  `ContentHubAnatomyFull` son domain-free; SKY vive sólo en DeckPlans consumidores.
- Slice 5: completado. Las láminas entraron como páginas 11, 13 y 17; la Radiografía existente quedó en
  la 18 y conserva su enlace vivo. El deck recompone en 26 páginas y quedó adjunto como versión 5 draft
  en Proposal Studio sin reemplazar v1-v4.
- Gate de determinismo: `TeamGalleryFull` reveló antialias no determinista por anchos fraccionales y
  clipping de radios. Se corrigió la geometría del template antes de promover el baseline; no se relajó
  el umbral ni se aceptó drift.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Decisión de reutilización del catálogo

- Revisar las plantillas existentes y decidir, por escrito en el plan, si los tres patrones se resuelven
  con templates actuales, con nuevos `contentType` sobre templates existentes o con plantillas nuevas.
- Si se crea un `contentType` nuevo, actualizar `registry.json`, selector/tests y slots con nombres
  genéricos; no usar `sky-*`.
- Si se crea plantilla nueva, seguir protocolo del catálogo: `.html`, `.slots.json`, registry, fixture,
  required-only probe, visual baseline y documentación.

### Slice 2 — Lámina `stack operativo`

- Construir una lámina reusable que agrupe herramientas por trabajo, no por logo:
  investigación/medición, coordinación, producción editorial, diseño/audiovisual, revisión/aprobación,
  activos licenciados e IA creativa.
- Incluir como slots de contenido: Notion, Frame.io, Adobe Illustrator, Photoshop, Premiere Pro, After
  Effects, Adobe Express, Microsoft 365, Semrush, Ahrefs, Screaming Frog, Brand Visibility Grader,
  Teams/Slack, Shutterstock, Adobe Stock, Envato Elements, Adobe Firefly, Higgsfield y Magnific.
- Evitar un cementerio de logos: el action title debe afirmar que el valor es un sistema de operación,
  no la suma de herramientas.

### Slice 3 — Lámina `el día a día con Efeonce`

- Construir una lámina reusable de workflow que muestre cómo el cliente colabora: reuniones o
  conversaciones en Teams/Slack, proyecto completo en Notion, Content Hub editorial, comentarios,
  Frame.io para imágenes/video, versionamiento y aprobación.
- Mostrar el flujo de iteración de artículo: research SEO/AEO, redacción, revisión, assets visuales,
  comentarios y publicación/medición.
- El contenido debe aceptar variantes por cliente: Teams o Slack, frecuencia de reunión, actores y
  rutas de aprobación.

### Slice 4 — Lámina `anatomía del Content Hub`

- Construir una lámina reusable que muestre qué contiene una página/artículo en Notion: brief, keyword
  principal/secundarias, intención, estructura H1/H2/H3, meta title/description, schema/JSON-LD,
  fuentes, SEO/AEO checklist, texto completo, comentarios y estado de aprobación.
- Incluir la idea de que el cliente puede comentar sobre el mismo artefacto operativo donde se documenta
  el research, no sobre un PDF muerto.
- Mantener el texto como ejemplo genérico o slots del DeckPlan; ningún contenido de SKY queda quemado
  en el template.

### Slice 5 — Integración en SKY, QA visual y documentación

- Insertar las tres láminas en `docs/commercial/tenders/sky-blog-2026/deck-plan.json` en el punto de la
  narrativa que mejor refuerce operación y seguridad de adjudicación.
- Actualizar agenda/capítulos desde el plan, no a mano.
- Componer el deck local, verificar page count, enlaces externos/internos, peso, assets y frames.
- Actualizar baseline visual del composer sólo si los cambios son intencionales, declarando el delta.
- Actualizar docs/manuales del Composer si nace un patrón nuevo o una regla de uso reusable.

## Out of Scope

- BAFO, descuentos, walk-away price o carta interna de negociación.
- Cambios en oferta técnica/económica, matriz de admisibilidad o pricing.
- UI nueva del portal Proposal Studio.
- Nuevos endpoints, DB, migrations, workers, flags o cambios en el asset store.
- Implementar integración real con Notion, Frame.io, Adobe, Shutterstock, Envato, Semrush, Ahrefs,
  Higgsfield o Magnific.
- Licenciar imágenes o comprar créditos de stock/IA desde Greenhouse.
- PPTX nativo o Adobe Express REST; esos caminos viven en `TASK-1395` y `TASK-1396`.

## Detailed Spec

### Patrón 1 — `stack operativo`

La lámina debe comunicar: **Efeonce opera el blog con un stack profesional, gobernado y trazable**.
Agrupar por familias:

- Investigación y medición: `Semrush`, `Ahrefs`, `Screaming Frog`, `Brand Visibility Grader`.
- Coordinación y documentación: `Notion`, `Microsoft 365`, `Teams/Slack`.
- Producción editorial: `Notion Content Hub`, `Microsoft 365`.
- Diseño y audiovisual: `Illustrator`, `Photoshop`, `Premiere Pro`, `After Effects`, `Adobe Express`.
- Revisión y aprobación: `Frame.io`, comentarios en Notion, versionamiento.
- Activos licenciados e IA creativa: `Shutterstock`, `Adobe Stock`, `Envato Elements`, `Adobe Firefly`,
  `Higgsfield`, `Magnific`.

Frase de control sugerida para el DeckPlan, editable por el operador:

> Usamos bancos licenciados para asegurar derechos de uso y suites de IA creativa para exploración,
> variaciones y producción asistida, siempre con curaduría humana y control de marca.

### Patrón 2 — `día a día`

La lámina debe comunicar: **el cliente no recibe piezas sueltas; entra a un sistema de trabajo visible**.
Flujo base:

1. Conversación o reunión en `Teams/Slack`.
2. Priorización y estado del proyecto en `Notion`.
3. Research SEO/AEO documentado: KW mining, intención, estructura, schema, fuentes.
4. Redacción del artículo dentro del Content Hub.
5. Comentarios del cliente sobre el mismo artefacto.
6. Imágenes/video en `Frame.io`, con comentarios, versiones y aprobación.
7. Publicación, medición y aprendizaje para el siguiente ciclo.

### Patrón 3 — `Content Hub`

La lámina debe comunicar: **cada artículo nace con su research y su capa de máquina, no sólo con texto**.
El layout debe permitir ver el artefacto como una "ficha viva": columna de brief/research, estructura del
artículo, checklist técnico y zona de comentarios/aprobación.

Cuando una propuesta cuenta con una Radiografía/X-ray viva, el pairing canónico es
`ContentHubAnatomyFull → ArtifactShowcaseFull`: la primera explica cómo se construye la evidencia y la
segunda la demuestra con el artefacto real. `proofLink` entrega el relevo narrativo y la URL vive siempre
en los slots del DeckPlan; el template no hardcodea dominios ni enlaces de cliente.

### Reusability hard rules

- `contentType` y slots deben aceptar otros clientes y otras propuestas sin cambiar HTML ni resolver.
- El renderer debe abortar si un required slot falta o un array excede la capacidad declarada.
- Los opcionales omitidos se limpian; nunca quedan textos de SKY o del prototipo.
- La familia de herramientas se expresa como datos del DeckPlan, con labels editables; el template no
  decide qué herramienta usa cada cliente.
- Cualquier logo externo necesita fuente/derecho documentado; si no existe, se usa nombre + iconografía
  neutral.

## Rollout Plan & Risk Matrix

Cambio aditivo de catálogo/contenido, sin runtime productivo nuevo. El primer rollout es local-first y
derivado: recomponer PDF y, si se aprueba, adjuntarlo/versionarlo por el pipeline existente de Proposal
Studio.

### Slice ordering hard rule

- Slice 1 (decisión de reutilización) bloquea todos los demás slices.
- Slice 2, Slice 3 y Slice 4 pueden construirse en paralelo sólo después de cerrar el contrato de
  plantilla/slots.
- Slice 5 no empieza hasta que las tres láminas compongan aisladas sin prototipo leakage.
- Ninguna baseline se promueve sin mirar todos los frames afectados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La lámina de tools parece catálogo de logos sin argumento | Deck | medium | Agrupar por trabajo + action title afirmativo + revisión deck-studio | Frame visual sin jerarquía o lectura tipo inventario |
| Uso indebido de logos de terceros | Legal/IP | medium | Documentar fuente/derecho o usar texto/iconos neutrales | Assets externos sin procedencia |
| Fuga de copy SKY en patrón reusable | Composer | medium | Required-only probes y revisión de slots opcionales | Texto SKY en render sintético |
| Aumenta el PDF sobre límite del RFP | Admisibilidad | low | Gate de peso y optimización de assets | PDF supera constraint del proposal |
| Agenda o enlaces quedan desfasados al insertar slides | PDF | low | Agenda derivada + verificación pdf-lib de anotaciones | GoTo/URI faltantes o páginas equivocadas |

### Feature flags / cutover

Sin flag — cambio aditivo de catálogo/DeckPlan. La publicación productiva, si aplica, usa el pipeline
existente de Proposal Studio y sus gates.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir decisión en plan antes de código | <5 min | sí |
| Slice 2-4 | retirar contentType/templates y DeckPlan entries; revertir baselines | <15 min | sí |
| Slice 5 | volver al PDF/DeckPlan anterior versionado | <15 min | sí |

### Production verification sequence

1. Componer localmente `docs/commercial/tenders/sky-blog-2026/deck-plan.json` con `pnpm deck:compose`.
2. Revisar todos los frames del PDF resultante, no sólo las tres láminas nuevas.
3. Verificar anotaciones internas/externas con API `pdf-lib`, page count, peso y ausencia de assets rotos.
4. Ejecutar visual gate y tests focales del composer.
5. Sólo después de aprobación humana, generar/adjuntar la nueva versión productiva por el pipeline
   existente de Proposal Studio.

### Out-of-band coordination required

- Confirmación humana del operador sobre orden de las tres láminas y copy final.
- Confirmación de si la variante SKY debe decir `Teams`, `Slack` o ambos.
- Decisión de uso de logos: logos con derechos/fuente documentada o versión textual con iconografía
  neutral.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La task documenta una decisión explícita de reuse/extend/new-template para cada una de las tres
  láminas.
- [x] Existen tres patrones reutilizables: `stack operativo`, `día a día con Efeonce` y `anatomía del
  Content Hub`.
- [x] Los patrones son slot-driven y no contienen `SKY`, URLs, textos de cliente ni herramientas
  hardcodeadas fuera del DeckPlan.
- [x] La lámina de tools incluye todas las familias y herramientas pedidas: Notion, Frame.io, Adobe
  Illustrator, Photoshop, Premiere Pro, After Effects, Adobe Express, Microsoft 365, Semrush, Ahrefs,
  Brand Visibility Grader, Screaming Frog, Shutterstock, Adobe Stock, Envato Elements, Adobe Firefly,
  Higgsfield, Magnific y Teams/Slack.
- [x] La lámina de día a día cubre reuniones/conversaciones, Notion como proyecto, Content Hub,
  comentarios, Frame.io, versionamiento y aprobación.
- [x] La lámina de Content Hub cubre research SEO/AEO, KW mining, estructura, schema, texto del artículo,
  checklist, fuentes, comentarios y estado de aprobación.
- [x] El deck SKY recompone con las tres láminas insertadas, agenda derivada correcta y sin enlaces rotos.
- [x] Required-only probes o tests equivalentes prueban que no hay fuga de prototipo.
- [x] Todos los frames afectados se revisan visualmente y el delta queda registrado en
  `BASELINE_DELTAS.md` si se promueve baseline.
- [x] La documentación/manual del Composer se actualiza si nace contentType, plantilla o regla reusable.

## Verification

- `pnpm task:lint --task TASK-1414`
- `pnpm ops:lint --changed`
- `pnpm vitest run src/lib/artifact-composer`
- `pnpm deck:compose docs/commercial/tenders/sky-blog-2026/deck-plan.json --out .captures/sky-bid-task1414`
- `pnpm composer:visual-gate`
- Verificación manual: mirar todos los frames del deck recompuesto, incluyendo las láminas nuevas y las
  que cambiaron de numeración.
- Verificación PDF: contar páginas, peso, assets cargados y anotaciones `/URI` + `GoTo` con API `pdf-lib`.

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [x] Archivo movido a la carpeta correcta (`to-do/`, `in-progress/`, `complete/`).
- [x] `docs/tasks/README.md` sincronizado.
- [x] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [x] `Handoff.md` actualizado si la task deja aprendizaje reusable del composer o decisión de placement.
- [x] `changelog.md` actualizado si cambia catálogo, baselines o docs funcionales.
- [x] Cierre documental con `greenhouse-documentation-governor` si se modifica arquitectura/manuales.

## Follow-ups

- Evaluar si estos patrones deben formar parte de un "proposal operations pack" reusable para QBR y salas
  de venta futuras.
- Si se requiere mostrar capturas reales de Notion o Frame.io, abrir task separada de asset sourcing,
  redacción de datos dummy y revisión de privacidad.

## Open Questions

- Ninguna para el cierre de esta task. La variante SKY usa Teams/Slack, assets autocontenidos con fuente
  documentada y placement 11/13/17 dentro de la narrativa operativa.
