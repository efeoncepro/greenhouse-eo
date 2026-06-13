# Greenhouse UI Platform — Primitives

> Parte de **Greenhouse UI Platform**. Índice: [README.md](./README.md). Historial (deltas de cada primitive): [HISTORIAL.md](./HISTORIAL.md).
> Autoridad final = runtime (`src/components/greenhouse/primitives/**`); este doc es el catálogo + dónde vive el contrato de cada uno.

## Metodología canónica — Primitive + Variants + Kinds

UI reusable o platform-level se modela en tres niveles (NO componentes paralelos por surface):

- **Primitive** — componente estable que owns layout / a11y / responsive / motion / shell / state / GVC.
- **Variant** — un modo funcional **oficial** de la primitive (comportamiento, densidad, estados, footer/actions). No es un skin.
- **Kind** — el caso semántico de dominio/workflow; **debe mapear a una variant** vía un resolver idempotente `kind→variant`.

Shape canónico: `<Primitive variant='inspector' kind='contractReview' />`.

**ADR:** [GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md](../GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md).

## Catálogo de primitives canónicas (contrato → fuente)

Cada primitive tiene su contrato canónico en una ADR/spec dedicada o en su delta de HISTORIAL. Antes de crear un componente reusable nuevo, reusar/extender la primitive existente.

| Familia | Primitive(s) | Contrato canónico |
|---|---|---|
| **Adaptive Sidecar** (asistencia/inspección/review/preview/edición contextual que preserva contexto) | `AdaptiveSidecarLayout`, `ContextualSidecar`, `adaptive-sidecar-controller` | [GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md](../GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md) + [GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md](../GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md) |
| **Floating Surface** (popovers, action menus, rich tooltips, evidence peeks, inline editors, validation bubbles, command previews) | `GreenhouseFloatingSurface`, `floating-surface-controller` — chrome depth via el rol semántico `theme.greenhouseElevation.floating` (NO `elevation={n}`) | [GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md](../GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md) + HISTORIAL Deltas 2026-06-06b / 2026-06-07j / 2026-06-07k |
| **Disclosure** (trigger rotatorio + disclosure anclado) | `GreenhouseDisclosureTrigger` (botón icono que señala estado; variants `addToggle` +→× 45° / `expand` chevron 180° / `reveal` kebab 90° / **`nexaMark`** — el isotipo de Nexa **morfa** vía framer-motion: cerrado = mark completo (arco+spark), abierto = solo el spark planeando al centro; kinds `linkResource`·`addEntry`·`expandSection`·`showFilters`·`moreActions`·`expandNexaInsights`) + `GreenhouseAnchoredDisclosure` (higher-order: **compone** trigger + `GreenhouseFloatingSurface` + slot `companion`; variants `contextualEditor`/`actionMenu`/`quickPeek`; kinds `figmaNodeLink`·`quickAdd`·`contextualOptions`·`evidence`). Motion = rotación tokenizada (icon variants) o morph spring (`nexaMark`) + reduced-motion (swap instantáneo); el SVG `nexaMark` hereda `currentColor` → idle-gris→hover-azul gratis; a11y `aria-expanded` + `ariaLabel` obligatorio. NO forkea FloatingSurface | HISTORIAL Delta 2026-06-10d (TASK-1072) + 2026-06-11 (nexaMark) · lab `/design-system/disclosure` · AXIS Figma node pendiente |
| **Elevation / shadow tokens** (roles semánticos `none`/`raised`/`floating`/`overlay`/`modal`/`overflow` reservado) | `theme.greenhouseElevation.<role>` (SoT `src/components/theme/elevation-tokens.ts`) — las primitives leen un rol, no `Paper elevation={n}` / `theme.shadows[n]` | [GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md](../GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md) + HISTORIAL Delta 2026-06-07k · lab `/admin/design-system/elevation` |
| **Floating Action Dock** (acciones persistentes ancladas al viewport) | `NexaFloatingButton`, `ScrollToTop` + safe-area CSS vars; Nexa FAB usa mark animado + aura hover detrás del botón | HISTORIAL Deltas 2026-06-06c / 2026-06-09h |
| **Efeonce brand motion** | `EfeonceOrbitalLogoMark` (variants `static` / `orbitalSignature` / `ambient`, kinds `institutionalWordmark` / `motionSpecimen`) | HISTORIAL Delta 2026-06-09i · lab `/admin/design-system/efeonce-brand` · experimental asset copy `public/branding/experiments/efeonce-logo-full-orbit-motion-copy.svg` |
| **Gradient backgrounds** | `GreenhouseGradientBackground` (variants `surfaceWash` / `heroAurora` / `brandField`; kinds `axisSurface` / `nexaAurora` / `efeonceBrand` / `insightPanel` / `calmBackdrop`; intensities `subtle` / `medium` / `strong`; tokenizado con `theme.axis.*` + `theme.palette.*`, motion CSS reduced-motion, bandas lineales — no blobs/orbs radiales, no Tailwind, no framer directo) | HISTORIAL Delta 2026-06-13f · lab `/design-system/gradients` |
| **Border beam / spectrum aura** | `GreenhouseBorderBeam` (effects `beam` / `spectrum`) + `GreenhouseSpectrumBeam` (primitive fina del efecto spectrum); variants `ambient` / `interactive` / `progress`; spectrum palettes `axis` / `nexa`; kinds `nexaSurface` / `promptDock` / `evidencePeek` / `approvalCard` / `asyncOperation`; intensities `subtle` / `medium` / `strong`; overlay decorativo con radio heredado, colores AXIS/MUI/brand SSOT y reduced-motion; no Tailwind config ni HEX locales | HISTORIAL Delta 2026-06-13g · lab `/design-system/border-beam` |
| **Nexa brand marks** | `GreenhouseNexaBrandMark` (kinds `askNexaBadge` / `badgeIcon` / `inlineMark` / `monoMark`) + `GreenhouseNexaAnimatedMark` (Rive/GSAP fallback) + `GreenhouseNexaAnimatedAskBadge` | HISTORIAL Deltas 2026-06-09d / 2026-06-09h · lab `/admin/design-system/nexa-brand` · assets `public/images/nexa-mark/*` |
| **Nexa chat atoms / answer surfaces** (átomos del patrón Nexa Chat + respuestas trazables) | `NexaGlowBorder` (borde "línea de luz" del composer: 2 anillos enmascarados + beam + `focusRingColor`) + `NexaComposer` (unidad: glow + input + acción interna send/stop/disclaimer o command input; variants `chat` / `command`; kinds `floatingChat` / `knowledgeAsk` / `globalCommand` / `inlineFollowUp`; `knowledgeAsk` incluye Nexa mark + shortcut `↵` para preguntar sin chocar con el shell; `inlineFollowUp` es el composer conversacional descendido bajo una respuesta; `globalCommand` conserva `⌘ K`; partes `NexaComposerInput` —caja Vuexy anulada → el glow pinta todo; `actionAdornment` compone shortcut+acción dentro del glow— y `NexaComposerActionButton` variants `send` navy↔teal / `stop` navy↔gris + iconos semánticos `send`/`search`; presentacional, la consumer cablea assistant-ui vía `asChild`) + `NexaPromptDock` (composition primitive para dock compacto → panel de pregunta contextual; variants `compactDock` / `inlinePanel` / `floatingPrompt`; kinds `quickAsk` / `knowledgeAsk` / `surfaceFollowUp` / `contextualAction`; controla open/focus/Escape/click-outside/submit `Cmd/Ctrl+Enter`, reusa `NexaComposer` + `GreenhouseNexaAnimatedMark`, sin shadcn/Tailwind/OKLCH/motion externo) + `NexaKnowledgeAnswerSurface` (composition primitive transversal para respuestas con evidencia: variants `conversationTrace` / `overviewPanel` / `toolResult`, kinds `knowledgeAnswerTrace` / `knowledgeToolResult`; idle limpio estilo Google AI Mode con solo composer glow → pregunta-burbuja → respuesta Nexa → composer descendido → proof panel lateral/inline; puede consumir `ConversationalEvidencePacket`, sin DB/API; `showModeSelector` default `true` permite que una surface madre con lentes propios oculte el selector interno sin cambiar la coreografía; `showTraceRail` default `false`, porque trace/retrieval vive en proof panel salvo opt-in explícito) + `NexaAnswersCanvas` (primitive transversal de Nexa Answers: modes `renderPlan` / `runtime`; variants `embedded` / `sidecar` / `inline`; kinds `knowledgeEmbedded` / `financeChartEmbedded` / `agencyInsightEmbedded` / `peopleInsightEmbedded` / `commercialInsightEmbedded`; states `idle`→`thinking`→`answered`→`proofOpen`→`followup`; valida `surfaceContext.allowedRenderers`, renderiza blocks vía registry y conserva slots para assistant-ui/headless runtime, proof y composer) + `NexaExpressiveText` (renderer serializable para voz Nexa: `string | segments[]`; estilos cerrados `plain|strong|emphasis|soft|metric|positive|warning|danger`, `emoji` con label accesible y `break`; sin HTML/style/className/font-size/HEX) + `NexaConversationBubble` (primitive de conversación base; variants `userQuestion` / `assistantThinking` / `assistantText` / `assistantFollowUp` / `systemNotice`; kinds `surfaceUserQuestion` / `nexaThinking` / `nexaText` / `nexaFollowUp` / `contextLoaded` / `lowConfidence` / `staleData` / `policyFiltered` / `partialAnswer`; usa `NexaSenderMark`, `GreenhouseThinkingBeat`, `NexaExpressiveText` y `GreenhouseButton` canónico para no sobrecargar `NexaAnswerBubble`) + `NexaAnswerBubble` (primitive del answer-turn enriquecido; variants `explanation` / `chart` / `metricSummary` / `actionPlan`; kinds `knowledgeExplanationAnswer` / `knowledgeChartAnswer` / `financeChartAnswer` / `financeMetricSummary` / `commercialMetricSummary` / `agencyMetricSummary` / `peopleMetricSummary` / `surfaceMetricSummary` / `financeActionPlan` / `commercialActionPlan` / `agencyActionPlan` / `peopleActionPlan` / `surfaceActionPlan` / `surfaceChartInsight`; `chart` usa Recharts con modos `trend` / `comparison` / `composition`; `metricSummary` muestra 2-4 KPIs compactos con delta semántico, mini trend e interpretación ejecutiva; `actionPlan` muestra decisión sugerida, pasos, trade-offs, riesgos y CTAs de surface; las variantes mantienen trust/proof compacto y aceptan `NexaExpressiveTextValue` en títulos/cuerpo/copy para conservar conversación expresiva) + `NexaEvidencePanel` (renderer compartido de evidencia versionada `nexa-evidence.v1`: trace, fuentes, freshness, confidence, filtered count y feedback, usado por chat `search_knowledge` y AnswerSurface; mobile-safe con `minmax(0, 1fr)`/wrapping para títulos largos) + `NexaFace` (avatar cara real, variants `hero` 76 / `header` 44 borde teal / `message`; single source `NEXA_FACE_SRC`) + `NexaPresenceMark` (header "En línea" ↔ "Pensando…" crossfade + elipsis animada, reduced-motion horneado) + `NexaSenderMark` (avatar por-mensaje: disco navy + anillo teal + glyph arco teal/sparkle blanco inline; `size` escala disco+anillo+glyph; NO se sustituye por `tabler-sparkles` suelto). Tokens AXIS + brand Nexa SSOT (`GREENHOUSE_NEXA_BRAND_COLORS`) + escala SoT; cero hardcode. | HISTORIAL Delta 2026-06-11 (TASK-1078) + Delta 2026-06-12/13 (TASK-1089/TASK-1093/TASK-1090/TASK-1096) · lab `/design-system/nexa-chat` (specimen vivo) · patrón en [PATTERNS.md](./PATTERNS.md) "Nexa Chat Pattern" |
| **Nexa greetings** | `GreenhouseNexaGreeting` (variants `hero` / `compactContextual`; kinds `homeOperatorGreeting` / `funnelStageAdvisor` / `custom`; compact badge variant via `askBadgeVariant`) | HISTORIAL Deltas 2026-06-09f / 2026-06-09h · labs `/admin/design-system/charts` + `/admin/design-system/nexa-brand` |
| **Motion** (cinemático/orquestado/scroll) | `<Motion>`, `useGreenhouseGSAP` | [GREENHOUSE_MOTION_PRIMITIVE_V1.md](../GREENHOUSE_MOTION_PRIMITIVE_V1.md) → ver [MOTION.md](./MOTION.md) |
| **Microinteraction** | `GreenhouseThinkingBeat`, `GreenhouseAsyncActionButton`, `GreenhouseCommandFeedback`, `GreenhouseStateTransition`, `GreenhouseInlineValidation`, `GreenhouseFieldProvenancePeek`, `GreenhouseStepperProgressMicro`, `GreenhouseEvidenceAttachmentDropzone`, `GreenhouseInlineDecisionPrompt` | HISTORIAL Deltas 2026-06-09e / 2026-06-06e / 2026-06-06 |
| **Loading Surface** | `GreenhouseLoadingSurface` + variants nombradas (`GreenhouseDocumentPipelineLoader`, `GreenhouseExternalHandoffLoader`, …) | HISTORIAL Delta 2026-06-06d (TASK-1037) |
| **Chart cards** | `GreenhouseChartCard`, `GreenhouseStackedDistributionChartCard`, `GreenhouseMetricBreakdownChartCard`, `GreenhouseFunnelChartCard` + zone primitives (`GreenhouseFunnelHeaderControls`, `GreenhouseFunnelKpiStrip`, `GreenhouseFunnelStageRail`, `GreenhouseFunnelStageSegment`, `GreenhouseFunnelDiagnosticsGrid`), `MetricTrendCard`; Apex runtime via `AppReactApexCharts` | HISTORIAL Deltas 2026-06-09f / 2026-06-09c / 2026-06-07 / 2026-06-02 / 2026-06-07l → ver también `dataviz-design` |
| **Health signal charts** | `GreenhouseHealthSignalChart` (`variant='segmentedDonut'`, kinds `teamHealth`/`talentHealth`/`capacityHealth`) | HISTORIAL Delta 2026-06-09b · lab `/admin/design-system/charts` |
| **Talent profile dossier** | `GreenhouseTalentProfileDossier` (`variant='enterpriseCard'`, kinds `assignedTeamTalent`/`candidateTalent`/`deliveryTalent`) | HISTORIAL Delta 2026-06-09b · lab `/admin/design-system/talent-profile` |
| **Verification badges** | `GreenhouseVerificationBadge` (kinds `efeonce` / `talentVerified`) | HISTORIAL Delta 2026-06-09b · lab `/admin/design-system/talent-profile` |
| **Breadcrumbs** | `GreenhouseBreadcrumbs` (variants `default` / `compact`, kinds `pageHierarchy` / `workbenchHierarchy` / `designSystemSpecimen` / `legacy`) + legacy wrapper `Breadcrumb` | HISTORIAL Delta 2026-06-10a · lab `/admin/design-system/breadcrumbs` · AXIS Figma node `205:234905` |
| **Chips** | `GreenhouseChip` (AXIS; `label` variant tonal AA vía `theme.greenhouseSemantic`) | HISTORIAL Deltas 2026-06-07c / 2026-06-08 (TASK-1053 Fase B) |
| **Feedback atoms** | `GreenhouseKpiDelta` (delta KPI inline: signo + flecha + color AA, variants text/tonal, `invert`), `GreenhouseStatusDot` (dot de estado + label/ariaLabel obligatorio, `pulse`/`halo`) — color nunca solo; consumen `theme.greenhouseSemantic` | HISTORIAL Delta 2026-06-08 (TASK-1053 Fase B Slice B2) |
| **Buttons** | `GreenhouseButton` (AXIS) + `GreenhouseAsyncActionButton` (compone Button) + `GreenhouseFigmaNodeButton` (compone Button; abre el nodo AXIS desde `nodeId`, `disabled`+tooltip "créalo y enlázalo" cuando no hay nodo) | HISTORIAL Deltas 2026-06-07d / 06-07e / 2026-06-10b |
| **Utilities** | `GreenhouseActivityTimeline` | HISTORIAL Delta 2026-06-07b |
| **Summary / Quote builder** | `EntitySummaryDock`, `CardHeaderWithBadge`, `FormSectionAccordion`, `ContextChipStrip`, `TotalsLadder` | HISTORIAL Deltas 2026-05-05 / 2026-04-19 / 2026-04-20 |

> **Nota de límites:** Adaptive Sidecar ≠ Floating Surface ≠ Dialog. Sidecar = lane in-flow full-height que preserva el contexto; Floating Surface = UI contextual anclada y transitoria; `Dialog` modal sigue obligatorio para decisiones destructivas/irreversibles/legales/financieras. Floating Action Dock cubre acciones persistentes ancladas al viewport, distinto de Floating Surface. Floating Surface usa `motion: anchored` con CSS Tier 1 + tokens; no usa la Motion Primitive GSAP porque no es motion cinemática/orquestada.

## NexaPromptDock

`NexaPromptDock` es la composition primitive para un entrypoint compacto que se abre a un prompt contextual de Nexa. Toma la intención del patrón "ask AI dock → input panel", pero la implementa con primitives Greenhouse/Nexa: `GreenhouseNexaAnimatedMark`, `NexaComposer`, `NexaComposerInput` y `NexaComposerActionButton`.

Variants oficiales:

- `compactDock`: dock mínimo para asistencia rápida en superficies con poco espacio.
- `inlinePanel`: panel contextual embebido en una surface o lab, con más ancho de lectura.
- `floatingPrompt`: prompt flotante de bajo riesgo donde el contexto principal sigue visible.

Kinds iniciales:

- `quickAsk`: pregunta rápida general.
- `knowledgeAsk`: consulta de corpus/documento.
- `surfaceFollowUp`: follow-up descendido desde una respuesta o módulo.
- `contextualAction`: preparación de una acción contextual no destructiva.

Contrato:

- La primitive controla `open` controlado/no-controlado, foco al abrir, `Escape`, click-outside, submit por botón y `Cmd/Ctrl + Enter`.
- Reusa `NexaComposer`; no crea inputs, glows ni botones paralelos.
- No reemplaza `AdaptiveSidecar` para lanes full-height, `Nexa Chat` para conversación larga ni `Dialog` para decisiones sensibles.
- El submit solo entrega `onSubmit(value)`. La ejecución de negocio debe vivir en commands/readers/runtime gobernados, no en la UI.

Specimen vivo: `/design-system/nexa-chat`, `data-capture='nexa-prompt-dock-specimen'`.

## GreenhouseBorderBeam

`GreenhouseBorderBeam` es la primitive canónica para patrones de borde perimetral animado inspirados en "border beam" y "rainbow borders button". `GreenhouseSpectrumBeam` es la primitive fina del efecto `spectrum`: anillo completo animado + aura blur amplia, sin poseer el botón, card o caja que lo usa. Toman la intención visual del prompt shadcn/Tailwind, pero la implementan como overlay decorativo Greenhouse: MUI `sx`, colores desde `theme.axis.*` / `theme.palette.*`, radio heredado, `prefers-reduced-motion` y sin extender Tailwind.

Effects oficiales:

- `beam`: línea perimetral focal que recorre el borde; útil para surfaces, evidencia y progreso.
- `spectrum`: anillo completo con gradiente desplazado + aura blur amplia, equivalente gobernado del "rainbow borders button". Usar vía `GreenhouseSpectrumBeam` cuando solo se necesita el efecto. Reservar para CTAs especiales, milestones o entrypoints de alto énfasis.

Spectrum palettes:

- `axis`: paleta spectrum expresiva basada en AXIS + semánticos; default para specimens exploratorios.
- `nexa`: variación restringida a marca Nexa (`GREENHOUSE_NEXA_BRAND_COLORS` + blanco) para cajas glow, CTAs o entrypoints de Nexa donde la marca debe sentirse más propia.

Variants oficiales:

- `ambient`: presencia suave siempre visible para una surface especial.
- `interactive`: beam pensado para hover/focus/estado activo de una surface ya interactiva.
- `progress`: beam más corto y explícito para operaciones breves en curso; no reemplaza loaders largos.

Kinds iniciales:

- `nexaSurface`: superficies asistidas por Nexa.
- `promptDock`: entradas contextuales y prompt docks.
- `evidencePeek`: peeks de evidencia, fuentes o trazabilidad.
- `approvalCard`: cards donde el usuario revisa y decide.
- `asyncOperation`: acción corta en proceso.

Reglas:

- Usar como overlay dentro de un host con `position: relative`, `overflow: hidden` y radio estable.
- Para botones, componer `GreenhouseButton` dentro de un host inline y montar `GreenhouseBorderBeam` como overlay; no crear `RainbowButton`, `BeamButton` ni botones paralelos.
- Para cajas tipo Nexa glow con aura spectrum, usar `GreenhouseSpectrumBeam` con children y `contentSx`; no forkear `NexaGlowBorder`.
- No usarlo como única señal de estado; acompañar con texto, icono o progreso cuando comunica estado.
- No pegar `keyframes`, gradientes ni colores locales en views. Si aparece una intención repetible, agregar un kind al resolver.
- No reemplaza `NexaGlowBorder` para el composer/chat de Nexa ni `GreenhouseLoadingSurface` para procesos largos.

Patrón aprobado — button with border beam:

```tsx
<Box sx={{ position: 'relative', display: 'inline-flex', overflow: 'hidden', borderRadius: '6px' }}>
  <GreenhouseButton kind='primaryAction' leadingIconClassName='tabler-sparkles'>
    Pregúntale a Nexa
  </GreenhouseButton>
  <GreenhouseSpectrumBeam kind='promptDock' variant='interactive' intensity='strong' active />
</Box>
```

Specimens vivos: `/design-system/border-beam`, `data-capture='border-beam-button-specimen'`, `data-capture='border-beam-nexa-spectrum-box'` y `data-capture='border-beam-nexa-brand-spectrum-box'`. Las variaciones lab-only de composer que usan `GreenhouseSpectrumBeam` viven con los otros composer en `/design-system/nexa-chat`: `data-capture='nexa-composer-spectrum-inactive'` y `data-capture='nexa-composer-spectrum-with-text'` (no aplicado al chat runtime).

## NexaConversationBubble

`NexaConversationBubble` es la primitive de conversación base para Nexa Answers. Vive separada de `NexaAnswerBubble` para que una pregunta, un thinking state, una respuesta textual simple o un aviso de confianza no tengan que disfrazarse de respuesta enriquecida.

Variants oficiales:

- `userQuestion`: pregunta del usuario alineada al borde de lectura derecho.
- `assistantThinking`: presencia breve de preparación con el patrón aprobado de Nexa Chat: `NexaSenderMark`, wordmark inline Poppins y `GreenhouseThinkingBeat kind='nexa' variant='inline' motion='wave' dotCount={5}` alineado debajo de la N del nombre.
- `assistantText`: respuesta simple de Nexa, sin chart, KPIs ni plan estructurado.
- `assistantFollowUp`: sugerencia conversacional para continuar o promover a otra surface.
- `systemNotice`: aviso compacto de contexto, frescura, confianza, policy o respuesta parcial.

Reglas:

- Usar esta primitive para el hilo conversacional esencial; usar `NexaAnswerBubble` solo cuando la respuesta necesita un canvas enriquecido.
- Acciones internas deben usar `GreenhouseButton` por `kind`; no crear botones locales.
- Tipografía: `h6` para títulos cortos, `body2` para cuerpo operativo y `caption` para metadata.
- `assistantThinking` no reemplaza loaders largos ni pipelines; solo comunica que Nexa prepara el siguiente mensaje.
- Las bubbles no accionables deben permanecer minimalistas: sin sombra, borde suave y sin cola. Las variantes assistant (`assistantThinking`, `assistantText`, `assistantFollowUp`) comparten una identidad de emisor única fuera del contenido: `NexaSenderMark` + wordmark inline Poppins. `assistantThinking` no es una bubble enmarcada ni muestra texto de estado visible; solo agrega el beat de 5 dots bajo el wordmark. La superficie con mayor presencia se reserva para mensajes accionables como `assistantFollowUp`. Geometría de chat: mensajes de Nexa usan esquina superior izquierda recta; mensajes del usuario usan solo esquina inferior derecha recta; el resto de puntas se mantiene redondeado.
- Microinteracciones de entrada: `NexaConversationBubble` entra con `opacity + translate3d + scale` tokenizado por `motionCss`; usuario se desplaza desde la derecha leve, Nexa desde abajo/izquierda y notices desde abajo. Reduced-motion apaga la animación.
- El renderer `conversationBubble` queda disponible en `NexaAnswersCanvas` y debe declararse en `surfaceContext.allowedRenderers`.

Specimen vivo: `/design-system/nexa-chat`, `data-capture='nexa-conversation-bubble-specimen'`. Evidencia GVC: `.captures/2026-06-13T02-03-21_design-system-nexa-chat`.

## NexaAnswerBubble — Variant `actionPlan`

`actionPlan` es la variante de recomendación accionable para Nexa Answers. Se usa cuando Nexa transforma una señal en un próximo movimiento dentro de una surface, no cuando solo explica un dato ni cuando necesita ejecutar una acción irreversible.

**Use when**

- Nexa propone una decisión operativa o comercial que el usuario puede revisar y convertir en acción.
- La respuesta necesita mostrar una tesis, una decisión sugerida, 2-4 pasos, costos de la decisión y riesgos antes del CTA.
- La surface necesita una recomendación embebida en contexto, con proof bajo demanda y sin enviar al usuario a Nexa Chat.

**Do not use when**

- La respuesta es chart-first; usar `chart`.
- La respuesta es lectura ejecutiva de KPIs sin plan de acción; usar `metricSummary`.
- La acción es destructiva, legal, financiera irreversible o requiere aprobación formal; `actionPlan` puede recomendar, pero la confirmación debe vivir en el workflow/modal/command gobernado correspondiente.
- La recomendación necesita historial global o colaboración multi-turn larga; promover a Nexa Chat.

**Contrato de datos**

- `NexaAnswerActionPlanSpec.decisionLabel`, `decisionTitle`, `decisionBody`: decisión sugerida en lenguaje de negocio.
- `steps[]`: próximos movimientos, con título corto y cuerpo operativo.
- `tradeOffs[]`: costo/beneficio visible antes del CTA.
- `risks[]`: condiciones que pueden invalidar o degradar la recomendación.
- `actions[]`: CTAs de producto/surface modelados como `NexaAnswerAction`.

**Contrato visual y tipográfico**

- Patrón **decision brief**: tesis arriba, decisión sugerida después, cuerpo agrupado en panels neutros.
- Los grupos usan rows con divisores horizontales, no alert cards apiladas ni barras laterales de color.
- El color semántico queda restringido a dots/iconos de señal; no domina el fondo ni el borde.
- Headings/labels usan variantes Greenhouse (`h6`, `body2`, `caption`) con peso moderado; cuerpos operativos en `body2`; metadata en `caption`.
- No usar `fontSize`/`fontFamily` inline ni estilos locales que compitan con AXIS/Vuexy.
- Debe conservar aire interno suficiente en desktop/laptop y colapsar a una columna legible en mobile.

**Acciones y proof**

- Los CTAs usan `GreenhouseButton` por `kind` canónico (`primaryAction`, `secondaryAction`, `inlineAction`) desde `NexaAnswerAction.kind`.
- La evidencia/fuentes/freshness no se duplica como CTA primaria dentro del plan; vive en el trust/proof row compartido.
- `NexaAnswersCanvas` puede renderizar esta variante mediante un block `answerBubble` con `variant='actionPlan'` o un kind que resuelva a esa variant.
- Entrada: `NexaAnswerBubble` usa un reveal estable con `motionCss.duration.long` y `motionCss.ease.emphasized`; `NexaCompactAnswerBubble` usa `duration.medium`. Solo animan `opacity`/`transform` y respetan `prefers-reduced-motion`.

**Specimen/GVC**

- Lab: `/design-system/nexa-chat`.
- Capture selector: `data-capture='nexa-answer-bubble-action-plan-specimen'`.
- Evidencia aprobada: `.captures/2026-06-13T00-30-32_design-system-nexa-chat`.

## ApexCharts Runtime Wrapper

`AppReactApexCharts` (`src/libs/styles/AppReactApexCharts.tsx`) es el wrapper canónico para charts Apex legacy/productivos. El wrapper owns la única frontera `next/dynamic(..., { ssr:false })` hacia `react-apexcharts`; los consumers lo importan directo.

Reglas:

- NO envolver `AppReactApexCharts` con otro `dynamic(() => import('@/libs/styles/AppReactApexCharts'))`.
- NO importar `@/libs/ApexCharts`; ese indirection legacy fue retirado.
- Si un chart necesita SSR-off, se resuelve en el wrapper común, no en cada consumer.
- Guardrail: `greenhouse/no-dynamic-app-react-apexcharts` (`error`).

Motivo: el doble dynamic produjo manifests/chunks huérfanos en Turbopack dev (`react-apexcharts_min_*.js` 404), dejando Fast Refresh en rebuild permanente y el portal local en `Compiling...` (ISSUE-085).

Diagnóstico rápido para casos similares: si local queda en `Compiling...`, revisar CPU/proceso, comparar `curl -I` vs browser real y usar Playwright console/network filtrando `_next/static/chunks`, HMR y 404. Si aparece un chunk huérfano, comparar `.next/dev/**/react-loadable-manifest.json` con `.next/dev/static/chunks` y buscar fronteras `dynamic()`/imports nested en wrappers compartidos. `pnpm clean` solo confirma; el fix vive en el owner canónico del wrapper.

## Tipografía, tokens y color de las primitives

Las primitives consumen el SoT, nunca valores inline:

- **Tipografía** → variantes/tokens del SoT (`typography-design` skill + [GREENHOUSE_DESIGN_TOKENS_V1.md](../GREENHOUSE_DESIGN_TOKENS_V1.md) §3). Nunca `fontSize`/`fontFamily` inline.
- **Color / tokens** → `theme.palette.*` / `theme.axis.*` + `DESIGN.md`. Ver `design-system-governance`.
- **Motion** → [MOTION.md](./MOTION.md).

## Mini reglas — Health signal, dossier y verificación

- `GreenhouseHealthSignalChart` se usa solo para salud/cobertura/continuidad con score o segmentos reales. No es un icono decorativo, de sentimiento o "favorito". Cualquier kind nuevo debe aparecer primero en `/admin/design-system/charts`, con `data-capture`, GVC desktop/mobile y labels accesibles por segmento.
- `GreenhouseFunnelChartCard` es la composition oficial del **Funnel Analysis Pattern** ([PATTERNS.md](./PATTERNS.md#funnel-analysis-pattern)) para workflows secuenciales donde volumen, retención, SLA, bloqueos, owner y frescura deben leerse juntos. Variants oficiales: `operationalPipeline`, `conversionPipeline`, `lifecyclePipeline`; kinds iniciales: `cscPipeline`, `commercialLifecycle`, `quoteToCash`, `onboardingActivation`, `custom`. El chart completo compone zone primitives exportadas: `GreenhouseFunnelHeaderControls` (título/tooltip/metric-view controls), `GreenhouseFunnelKpiStrip` (KPIs superiores), `GreenhouseFunnelStageRail` (geometría SVG, scroll y a11y summary), `GreenhouseFunnelStageSegment` (contenido/tooltip/focus/selección por etapa) y `GreenhouseFunnelDiagnosticsGrid` (bloqueos/owner/freshness). Crear nuevos kinds debe extender data/copy/variant mapping, no copiar JSX del rail.
- `GreenhouseFunnelStageRail` usa renderer custom dentro de la primitive porque el contrato visual es un rail horizontal interactivo; Recharts queda reservado para futuras variants verticales (`FunnelChart`) sin forzar la geometría del pipeline. El rail debe renderizarse como fills por etapa + separadores internos con apex suavizado + un borde exterior único, no como strokes completos por segmento, para evitar artefactos en caps redondeados y uniones diagonales sin perder la redondez de las puntas del chevron. El color del rail representa `stageRole` (`intake`, `production`, `quality`, `rework`, `delivery`, `activation`); la salud operativa vive aparte en `health`/diagnostics y nunca depende solo del color. El `stageRole` no debe duplicarse como label visible dentro del segmento cuando el título de etapa ya nombra el paso; debe mantenerse en `aria-label`/summary accesible.
- Para interpretación asistida de la etapa seleccionada, usar `GreenhouseNexaGreeting kind='funnelStageAdvisor'`: prompt dock blanco y centrado, badge `GreenhouseNexaAnimatedAskBadge` vía `askBadgeVariant='animated'`, guía contextual en primera persona que rota lentamente con `GreenhouseThinkingBeat kind='nexa'`, input estable, título/foco en tooltip y cero duplicación de owner/freshness ya visibles en la tabla. Otros greetings compactos mantienen `askBadgeVariant='static'` por defecto.
- `GreenhouseNexaBrandMark` es la primitive canónica para el mark de Nexa. La unidad mínima visual es arco + sparkle; nunca usar `tabler-sparkles` solo como sustituto de Nexa. `kind='askNexaBadge'` renderiza el badge Midnight Navy con label `Pregúntale a Nexa` para entradas conversacionales; el texto usa tipografía de control (`button`/label-md) para tener presencia sin convertirse en headline. `badgeIcon`, `inlineMark` y `monoMark` cubren usos más compactos.
- `GreenhouseNexaAnimatedMark` es la primitive canónica de motion del mark. Usa Rive cuando exista `.riv` exportado desde Rive Editor (`riveSrc`, `artboard`, `animation`, `stateMachine`) y cae a GSAP tokenizado cuando no existe asset o se piden microinteracciones ligeras. Props oficiales: `autoBlink`, `blinkCadence='ambient|attentive'`, `ambientMoments`, `ambientMoment='random|arcSparklePlay|signalCatch'`, `chrome='none|badge'`, `tone='onNavy|fullColor|mono'` y `decorative`. El scheduler no solapa blink/momentos, respeta reduced-motion y no debe usarse como loader, error ni confirmación.
- `GreenhouseNexaAnimatedAskBadge` es la primitive canónica para la versión animada del badge `Pregúntale a Nexa`. Es un componente separado, no un nuevo kind ni un reemplazo de `GreenhouseNexaBrandMark kind='askNexaBadge'`. Úsalo solo en entry points donde la presencia de Nexa debe sentirse viva: V1 consumer oficial `GreenhouseFunnelChartCard` mediante `askBadgeVariant='animated'`; el lab `/admin/design-system/nexa-brand` debe mostrar cualquier nuevo uso antes de migrarlo a producto. El mark interno va `decorative` para evitar semántica `img` duplicada.
- `NexaFloatingButton` consume `GreenhouseNexaAnimatedMark` como FAB global dentro de `ShellFloatingActionDock`. Su hover/focus aura teal vive en un wrapper detrás del FAB, con fade-out lento y reduced-motion sin transición larga; no mover el glow al foreground ni mezclarlo con la sombra navy del botón.
- `GreenhouseThinkingBeat` es la primitive canónica para los tres dots de pensamiento/actividad breve. Variants oficiales: `inline`, `cluster`, `standalone`; kinds semánticos: `nexa`, `assistant`, `sync`, `neutral`. Usar cuando una superficie ya tiene el contexto visible y solo necesita comunicar que el asistente/sistema está preparando el siguiente mensaje. No reemplaza `GreenhouseLoadingSurface` para procesos largos, page/panel loading ni pipelines con pasos. Si vive dentro de una frase legible, usar `decorative`; si vive solo, mantener `role='status'` con `aria-label`. Para emparejar inline con texto más grande (ej. `body1`), usar el override opcional `dotSize` (px) en vez de escalar con transform. Nuevos colores/timings deben cambiarse en `greenhouse-thinking-beat-controller.ts`, no copiando dots locales.
- **Nexa Insights** (`NexaInsightsBlock`, `src/components/greenhouse/`) es el **pattern compuesto** canónico del panel donde Nexa lee un período y resalta lo que más mueve los resultados. Renderizado en 5 superficies (Home, MyPerformance, Space360, PersonActivity, Finance) + ICO vía `IcoAdvisoryBlock`. Compone primitives gobernados, no reinventa: **disclosure** (`GreenhouseDisclosureTrigger variant='nexaMark'` colapsa el panel; el bloque ready arranca abierto vía `defaultExpanded`), **rotating headline** (Nexa "narra en vivo": typewriter + caret escribe una de 30 paráfrasis, la deja leer, y al terminar aparece el `GreenhouseThinkingBeat kind='nexa'` antes de pensar la próxima; algunas frases usan `viewerName` → primer nombre del usuario en sesión; reduced-motion → frase estática), **segmented control** Recientes/Historial (track neutro + thumb blanco `elevation raised` deslizante, solo con timeline) e **insight rows** severity-led con causa raíz colapsable, acción sugerida y drill a `/nexa/insights/[id]` (cap a 4 + "Ver más" armonizado con el gateway al full list). Copy en `src/lib/copy/nexa.ts`. Estado derivado server-side (`dataStatus`) con honest degradation. Variants/kinds de dominio = follow-up (Primitive+Variants+Kinds sobre esta base, sin forkear superficies). Lab `/design-system/nexa-insights`.
- `GreenhouseTalentProfileDossier` se usa cuando una superficie necesita revisar o decidir sobre cobertura de una persona. No poblarlo con señales sin source-of-truth, freshness y política de visibilidad. Nuevos bloques/métricas deben entrar como prop explícito y degradar honestamente.
- `GreenhouseVerificationBadge` solo representa verificación real o una política aprobada de verificación. Nuevos labels, marcas o lockups deben entrar como kind oficial con copy bilingüe, `aria-label`, revisión de marca y GVC en `/admin/design-system/talent-profile`.
- `GreenhouseBreadcrumbs` es la primitive canónica para jerarquía de navegación. Todo breadcrumb nuevo debe importarse desde `@/components/greenhouse/primitives`; no crear breadcrumbs locales con MUI directo, links sueltos ni botones "volver" paralelos. Usar `kind='pageHierarchy'` para headers de página y `kind='workbenchHierarchy'` para superficies densas; el último item debe ser current page (`aria-current='page'`) y los ancestros deben ser links reales. El separator default es `/` según AXIS Figma; el wrapper legacy `Breadcrumb` conserva chevron compacto solo para compatibilidad y también delega en la primitive. No duplicar breadcrumbs con botones "volver" en la misma zona.
- `GreenhouseFigmaNodeButton` es la primitive canónica para "abrir el nodo AXIS en Figma". Compone `GreenhouseButton` (no reinventa el base); construye la URL canónica desde `nodeId` (acepta `205:234905` o `205-234905`; default file `yyMksCoijfMaIoYplXKZaR` vía `AXIS_FILE_KEY`) y abre en pestaña nueva. **Sin `nodeId` renderiza `disabled` + tooltip "créalo y enlázalo"** — señal deliberada de que la surface aún necesita un nodo AXIS. El registro route→nodo del Design System vive en `src/views/greenhouse/admin/design-system/design-system-figma-nodes.ts`; el `DesignSystemBreadcrumbShell` lo resuelve por ruta y muestra el botón en todas las páginas DS (activo donde hay nodo, inactivo donde falta). No transcribir URLs Figma crudas en views — usar el primitive (o `buildFigmaNodeUrl`).
