# Greenhouse UI Platform — Historial (changelog cronológico)

> Archivo histórico **append-only** de la plataforma UI: las entradas datadas (`Delta YYYY-MM-DD`) que antes se acumulaban en el monolito `GREENHOUSE_UI_PLATFORM_V1.md`.
> El **estado vigente** NO vive acá — vive en los docs temáticos de [`ui-platform/`](./README.md) (STACK · PRIMITIVES · STATE · FORMS · TABLES · MOTION · I18N · PATTERNS · GOVERNANCE).
> Orden cronológico inverso aproximado (más reciente arriba), tal como estaban en el monolito. No tratar entradas antiguas como contrato vigente; son trazabilidad.

---

## Delta 2026-06-13h — Nexa FAB brand spectrum hover

El FAB global de Nexa adopta el `GreenhouseSpectrumBeam` en paleta Nexa como affordance de hover/focus:

- `NexaFloatingButton` reutiliza `GreenhouseSpectrumBeam` con `kind='promptDock'`, `variant='interactive'` y `spectrumPalette='nexa'` detrás del botón.
- El efecto está oculto y con animación pausada en idle; solo aparece en `hover`/`focus-within` cuando el panel no está abierto.
- Se preserva el mark animado del FAB en primer plano y la sombra navy del botón; el glow no se mueve al foreground.
- Reduced-motion conserva el fade mínimo sin transición larga.
- Scenario GVC actualizado: `nexa-floating-hover-glow`.

## Delta 2026-06-13g — GreenhouseBorderBeam primitive

Se creó `GreenhouseBorderBeam` para traer el patrón de borde perimetral animado al Design System sin copiar Tailwind/shadcn:

- Primitive nueva en `src/components/greenhouse/primitives/border-beam/`.
- `GreenhouseSpectrumBeam` extrae el efecto `spectrum` como primitive fina reutilizable (anillo completo + aura blur amplia) sin acoplarlo a un botón.
- `GreenhouseShinyBorder` trae el patrón `shiny-borders-button` como surface/CTA tokenizada (highlight radial superior, glow inferior y contenido elevado), sin copiar Tailwind ni HEX locales.
- `GreenhouseSpotlightCard` trae el patrón `spotlight-card` como card con spotlight atado al puntero; kinds iniciales `blue`, `purple`, `green`, `red`, `orange` y la familia Nexa `nexaBrand`, `nexaBrandCore`, `nexaBrandSignal`, `nexaBrandGlass`.
- Variants oficiales: `ambient`, `interactive`, `progress`.
- Kinds iniciales: `nexaSurface`, `promptDock`, `evidencePeek`, `approvalCard`, `asyncOperation`, `custom`.
- Effects oficiales: `beam` para línea perimetral focal y `spectrum` para el equivalente gobernado del prompt "rainbow borders button" (anillo completo + gradiente desplazado + aura blur amplia).
- Spectrum palettes oficiales: `axis` y `nexa`; `nexa` usa `GREENHOUSE_NEXA_BRAND_COLORS` para la variación con colores de marca.
- Los colores se resuelven desde `theme.axis.*` / `theme.palette.*`; no hay HEX inline ni extensión de `tailwind.config`.
- Motion: CSS `conic-gradient`/`linear-gradient` + `@property`/background-position con `prefers-reduced-motion` estático; el overlay es decorativo y respeta `border-radius: inherit`.
- Lab interno `/design-system/border-beam` + scenario GVC `design-system-border-beam`; incluye CTA `button with border beam`, CTA `shiny realism`, cards `spotlight-card`, matriz de cards Nexa brand, caja `Nexa glow box · spectrum` y variación `Nexa glow box · brand spectrum`.
- El specimen lab-only de la caja de envío Nexa vive en `/design-system/nexa-chat`, junto a `NexaComposer` y `NexaPromptDock`, porque el efecto spectrum ahí funciona como variación del composer y no como espécimen base del beam; inicia inactive/sin texto y cambia al estado activo cuando el usuario escribe.

## Delta 2026-06-13f — GreenhouseGradientBackground primitive

Se creó `GreenhouseGradientBackground` para traer fondos degradados al Design System sin copiar el componente shadcn/Tailwind:

- Primitive nueva en `src/components/greenhouse/primitives/gradient-background/`.
- Variants oficiales: `surfaceWash`, `heroAurora`, `brandField`.
- Kinds iniciales: `axisSurface`, `nexaAurora`, `efeonceBrand`, `insightPanel`, `calmBackdrop`, `custom`.
- Los colores se resuelven desde `theme.axis.*` / `theme.palette.*`; no hay HEX inline, OKLCH ni Tailwind.
- Motion: CSS `background-position` con duración gobernada y `prefers-reduced-motion` estático; no se instala `framer-motion` ni se importa motion vendor directo.
- Guardrail visual: usa bandas lineales tokenizadas, no blobs/orbs radiales.
- Lab interno `/design-system/gradients` + scenario GVC `design-system-gradients`.

## Delta 2026-06-13e — NexaPromptDock primitive

Se creó `NexaPromptDock` como composition primitive para el patrón dock compacto → prompt contextual de Nexa:

- Variants oficiales: `compactDock`, `inlinePanel`, `floatingPrompt`.
- Kinds iniciales: `quickAsk`, `knowledgeAsk`, `surfaceFollowUp`, `contextualAction`, `custom`.
- Reusa `GreenhouseNexaAnimatedMark`, `NexaComposer`, `NexaComposerInput` y `NexaComposerActionButton`; no copia shadcn/Tailwind/OKLCH/motion externo.
- Contrato de interacción: open controlado/no-controlado, foco al abrir, Escape, click-outside, submit por botón y `Cmd/Ctrl + Enter`, con success feedback temporal.
- Lab `/design-system/nexa-chat` suma specimen `data-capture='nexa-prompt-dock-specimen'` y el scenario GVC lo captura.

## Delta 2026-06-13d — Nexa bubble entrance microinteractions (TASK-1096)

Se agregó entrada suave a las bubbles de Nexa Answers:

- `NexaConversationBubble` usa entrada CSS tokenizada por variant: usuario desde la derecha leve; Nexa desde abajo/izquierda; system notice desde abajo casi imperceptible.
- `NexaAnswerBubble` usa entrada "settle" estable para superficies enriquecidas: `opacity + translate3d + scale(0.996)` con `motionCss.duration.long` y `motionCss.ease.emphasized`.
- `NexaCompactAnswerBubble` usa entrada más corta (`motionCss.duration.medium`) para turnos compactados.
- Motion budget: solo `opacity` y `transform`, sin blur, bounce, shadow pumping ni grandes desplazamientos.
- Accesibilidad: `@media (prefers-reduced-motion: reduce)` elimina animación, transform y `will-change`.
- Evidencia GVC: `.captures/2026-06-13T02-03-21_design-system-nexa-chat`.

## Delta 2026-06-13c — Nexa expressive text segments (TASK-1096)

Se agregó `NexaExpressiveText` como renderer compartido para que Nexa Answers pueda expresar énfasis tipográfico y emojis sin HTML libre ni estilos arbitrarios:

- Contrato serializable: `NexaExpressiveTextValue = string | NexaExpressiveTextSegment[]`.
- Segmentos oficiales: `plain`, `strong`, `emphasis`, `soft`, `metric`, `positive`, `warning`, `danger`, `emoji`, `break`.
- A11y: emojis pueden declarar `label`; sin label quedan decorativos. `getNexaExpressiveTextPlainText()` convierte segmentos a texto para `aria-label`, status y keys.
- Consumers: `NexaConversationBubble`, `NexaAnswerBubble`, `NexaCompactAnswerBubble` y `NexaAnswersCanvas` aceptan segmentos en `title`, `body`, `metaLabel`, points, trust cue, chart helper/title, metric summary y action plan copy.
- Constraint: la primitive decide la apariencia desde tokens Greenhouse; Nexa no puede enviar font-size, familia, HEX, className ni HTML.
- Evidencia GVC: `.captures/2026-06-13T01-55-30_design-system-nexa-chat`.

## Delta 2026-06-13b — NexaConversationBubble base variants (TASK-1096)

Se creó `NexaConversationBubble` como primitive hermana de `NexaAnswerBubble` para separar conversación base de respuestas enriquecidas:

- Variants oficiales: `userQuestion`, `assistantThinking`, `assistantText`, `assistantFollowUp`, `systemNotice`.
- Kinds iniciales: `surfaceUserQuestion`, `nexaThinking`, `nexaText`, `nexaFollowUp`, `contextLoaded`, `lowConfidence`, `staleData`, `policyFiltered`, `partialAnswer`, `custom`.
- Propósito: cubrir el hilo conversacional esencial de Nexa Answers sin forzar cada mensaje a ser una respuesta enriquecida.
- Reuso: las variantes assistant de `NexaConversationBubble` comparten la identidad aprobada de Nexa Chat (`NexaSenderMark` + wordmark inline Poppins); `assistantThinking` agrega `GreenhouseThinkingBeat kind='nexa' variant='inline' motion='wave' dotCount=5` alineado bajo la N del nombre; acciones usan `GreenhouseButton` por `kind`; tipografía usa variantes Greenhouse (`h6`, `body2`, `caption`).
- `NexaAnswersCanvas` suma renderer `conversationBubble` para render plans transversales y preserva `GreenhouseButton.kind` al mapear acciones.
- El lab `/design-system/nexa-chat` suma specimen `data-capture='nexa-conversation-bubble-specimen'`.
- Contrato visual: bubbles no accionables usan chrome mínimo (sin sombra, borde suave y sin cola); la identidad de Nexa vive fuera del contenido para que `assistantThinking`, `assistantText` y `assistantFollowUp` no rendericen nombres con estilos divergentes. La presencia visual más fuerte queda reservada para `assistantFollowUp` u otras bubbles con CTA. Geometría de chat: Nexa usa esquina superior izquierda recta; usuario usa solo esquina inferior derecha recta; no se dibujan puntas/colas.
- Evidencia GVC: `.captures/2026-06-13T01-45-02_design-system-nexa-chat`.

## Delta 2026-06-13 — NexaAnswerBubble `actionPlan` variant (TASK-1096)

Se extendió `NexaAnswerBubble` con la variante oficial `actionPlan`:

- Propósito: recomendación accionable cuando Nexa no solo explica una señal, sino que propone el próximo movimiento dentro de la surface.
- Kinds iniciales: `financeActionPlan`, `commercialActionPlan`, `agencyActionPlan`, `peopleActionPlan`, `surfaceActionPlan`.
- Contrato de datos: `NexaAnswerActionPlanSpec` con decisión sugerida, pasos recomendados, trade-offs y riesgos a vigilar.
- La variante mantiene answer-first: decisión clara arriba, plan operativo después, riesgos/trade-offs como contexto y proof bajo demanda en el trust row.
- Las acciones quedan como CTA de producto/surface; la evidencia no se duplica como acción primaria porque vive en el trust/proof contract compartido.
- El renderer de `NexaAnswersCanvas` puede recibir `actionPlan` en un bloque `answerBubble`, por lo que queda disponible para render plans transversales.
- El lab `/design-system/nexa-chat` suma specimen `data-capture='nexa-answer-bubble-action-plan-specimen'`.
- Contrato visual final: patrón **decision brief**. La tesis y la decisión sugerida viven arriba; el cuerpo se ordena en grupos neutros con rows, aire interno y divisores horizontales. Evitar barras laterales por aviso, alert cards tintadas, exceso de bordes o composición tipo dashboard comprimido.
- Tipografía: headings/labels usan variantes Greenhouse (`h6`, `body2`, `caption`) con peso moderado; cuerpos operativos en `body2`; metadata en `caption`; sin `fontSize`/`fontFamily` inline.
- Color: el color semántico aparece solo como dot/icono de señal. No se usa como stripe lateral ni como fondo dominante del aviso.
- Acciones: `NexaAnswerAction` admite `kind`; los CTAs deben pasar `GreenhouseButton` canónico (`primaryAction`, `secondaryAction` o `inlineAction`) y no crear botones locales dentro del bubble.
- Evidencia GVC final: `.captures/2026-06-13T00-30-32_design-system-nexa-chat`.

## Delta 2026-06-12i — NexaAnswerBubble `metricSummary` variant (TASK-1096)

Se extendió `NexaAnswerBubble` con la variante oficial `metricSummary`:

- Propósito: lectura ejecutiva compacta para 2-4 KPIs cuando Nexa necesita decir "qué cambió y cuánto importa" sin abrir un chart grande.
- Kinds iniciales: `financeMetricSummary`, `commercialMetricSummary`, `agencyMetricSummary`, `peopleMetricSummary`, `surfaceMetricSummary`.
- Contrato de datos: `NexaAnswerMetricSummarySpec` con `metrics[]`, valor, helper, delta semántico (`success`/`warning`/`error`/`info`/`neutral`) y mini trend por métrica.
- Color: sparklines y charts usan la paleta canónica `GH_COLORS.chart.categorical`/AXIS chart SoT; los tonos semánticos quedan reservados para la píldora de delta/estado, no para las series visualizadas.
- La variante conserva el mismo contrato de trust/proof/actions que `chart` y `explanation`.
- El renderer de `NexaAnswersCanvas` puede recibir `metricSummary` en un bloque `answerBubble`, por lo que la variante queda disponible para render plans transversales.
- El lab `/design-system/nexa-chat` suma specimen `data-capture='nexa-answer-bubble-metric-summary-specimen'`.

## Delta 2026-06-12h — NexaAnswersCanvas transversal (TASK-1096)

Se creó `NexaAnswersCanvas` como primitive transversal para contener la experiencia Nexa Answers sin acoplarla a Knowledge:

- Modos oficiales: `renderPlan` y `runtime`. `renderPlan` consume un plan tipado local (`nexa-answer-render-plan.v1`); `runtime` permite alojar un runtime headless/assistant-ui por slot sin pelear con el canvas visual.
- Variants iniciales: `embedded`, `sidecar`, `inline`; kinds iniciales: `knowledgeEmbedded`, `financeChartEmbedded`, `agencyInsightEmbedded`, `peopleInsightEmbedded`, `commercialInsightEmbedded`, `custom`.
- Estados iniciales: `idle`, `submitted`, `thinking`, `streaming`, `answered`, `proofOpen`, `followup`, `compacted`, `degraded`, `error`.
- El `surfaceContext` del canvas declara domain, placement, data reality, sensitivity, renderers permitidos y acciones permitidas; el canvas valida que el render plan no use renderers fuera de la allowlist.
- El renderer registry inicial soporta `answerBubble` y `compactAnswer`, delegando en `NexaAnswerBubble` y `NexaCompactAnswerBubble`.
- El canvas centraliza la coreografía: idle composer glow → pregunta burbuja → identidad Nexa + thinking → answer block → proof bajo demanda → composer descendido → follow-up/turnos compactados.
- `/knowledge/mockup/nexa-answers` consume el canvas en vez de ensamblar estados localmente; `/design-system/nexa-chat` suma specimen `data-capture='nexa-answers-canvas-specimen'`.

## Delta 2026-06-12g — NexaAnswerBubble primitive + chart variant (TASK-1096)

Se canonizó `NexaAnswerBubble` como primitive reusable de answer-turn para Nexa Answers:

- Variants oficiales iniciales: `explanation` y `chart`.
- Kinds iniciales: `knowledgeExplanationAnswer`, `knowledgeChartAnswer`, `financeChartAnswer`, `surfaceChartInsight`, `custom`.
- La variante `chart` es chart-first y compacta: prioriza Recharts con modos `trend` / `comparison` / `composition`, conserva un insight corto, un trust cue compacto y proof bajo demanda para no desplazar el composer conversacional en laptop.
- El contrato de chart queda genérico (`series[]`, `trend[]`, `composition[]`, `valueSuffix`) para que Knowledge no hardcodee métricas ICO dentro de la primitive y futuras surfaces puedan usar ARR, pipeline, tickets, personas o métricas operativas.
- `/knowledge/mockup/nexa-answers` deja de ser owner del bubble; ahora consume la primitive desde `@/components/greenhouse/primitives`.
- El lab `/design-system/nexa-chat` suma specimen `data-capture='nexa-answer-bubble-chart-specimen'`.

## Delta 2026-06-12f — Conversational Experience V2 discovery (TASK-1095/TASK-1096)

Se documentó el discovery profundo de la experiencia conversacional multi-surface:

- TASK-1095 queda como soporte de plataforma: `surfaceContext`, adapters, answer-turn contract, provenance/trust/proof layers, observability/evals y compatibilidad con Knowledge.
- TASK-1096 queda como experiencia producto/UI: **Nexa Answers** como surface contextual embebida, distinta de Nexa Chat y de un answer-turn aislado.
- `PATTERNS.md` deja de describir el idle viejo con trace/proof visible antes de preguntar y explicita el target V2: trust cue compacto + proof bajo demanda.
- Primer piloto real no-Knowledge recomendado: finance/chart explanation, después de fixtures/specimens y no dentro del foundation.

## Delta 2026-06-12e — AnswerSurface idle contract (TASK-1090 follow-up)

Se corrigió la promoción de Answer Trace para conservar el patrón tipo Google AI Mode:

- `NexaKnowledgeAnswerSurface` en `conversationStarted=false` renderiza solo el composer glow/entrada; no muestra respuesta, proof panel ni trace rail antes de una pregunta.
- Al preguntar, aparece la coreografía completa: pregunta-burbuja → identidad/avatar Nexa → respuesta → composer `inlineFollowUp` → proof panel.
- `showTraceRail?: boolean` queda opt-in y default `false`; las cards de intento/retrieval no interrumpen la conversación y la trazabilidad vive en `NexaEvidencePanel`.
- GVC `knowledge-answer-trace` ahora captura idle composer primero y conversation lane/proof panel solo después del submit.

## Delta 2026-06-12d — Knowledge lenses coherence (TASK-1090)

`/knowledge` adopta un shell común de lentes **Humano | Nexa | MCP** sin forkear AnswerSurface:

- `NexaKnowledgeAnswerSurface` suma `showModeSelector?: boolean` con default `true`. Esto preserva el mockup `/knowledge/mockup/answer-trace`; `/knowledge` lo pasa en `false` porque el selector común vive en la surface madre.
- `NexaEvidencePanel` y AnswerSurface endurecen mobile para títulos/fuentes largas: `minmax(0, 1fr)`, `minInlineSize: 0`, wrapping/truncation controlado y acciones responsive.
- Scenario GVC nuevo `knowledge-lenses`: Humano default → Nexa pregunta → MCP packet. Baseline protegido `knowledge-answer-trace` sigue verde.

Evidencia local: `.captures/2026-06-12T18-50-06_knowledge-lenses` y `.captures/2026-06-12T18-50-07_knowledge-answer-trace`.

## Delta 2026-06-12c — Conversational Evidence V1 (TASK-1093)

Se consolidó el gap real entre Nexa Chat y AnswerSurface sin crear una shell paralela:

- Nuevo contrato `ConversationalEvidencePacket` (`nexa-evidence.v1`) en `src/lib/nexa/conversational-evidence.ts`, con adapters desde `knowledge-search.v1` y `NexaToolResult`.
- Nueva primitive `NexaEvidencePanel` para renderizar trace, fuentes, confidence, freshness, filtered count y feedback desde el view-model común.
- `NexaToolRenderers` deja de derivar/renderizar Knowledge evidence localmente y consume `NexaEvidencePanel`.
- `NexaKnowledgeAnswerSurface` puede recibir `evidence` y renderizar el mismo panel en el proof slot; no consulta DB/API.
- `NexaComposer` suma `kind='inlineFollowUp'`; `NexaKnowledgeAnswerSurface` suma `variant='toolResult'` y `kind='knowledgeToolResult'`.
- `mapThreadMessagesToInitial()` rehidrata tool-calls persistidos para que threads históricos con `tool_invocations` recuperen evidence cards sin re-ejecutar tools; threads antiguos sin payload siguen como texto.

La shell multi-surface (`floatingChat`/`embeddedChat`/`sidecarLane` sobre `AdaptiveSidecarLayout variant='assistant'`) y `aiOverviewPanel` quedan diferidos hasta que TASK-1084/TASK-1079 aterricen como consumidores reales.

## Delta 2026-06-12b — NexaKnowledgeAnswerSurface (TASK-1089)

Se creó `NexaKnowledgeAnswerSurface` como **composition primitive transversal** para respuestas Nexa con evidencia, usando Primitive+Variants+Kinds:

- Variants: `conversationTrace` (pregunta-burbuja + respuesta Nexa + composer descendido + trace/proof) y `overviewPanel` (reservada para modo AI Overview compacto).
- Kind inicial: `knowledgeAnswerTrace` → `conversationTrace`.
- Primer consumer: `/knowledge/mockup/answer-trace`.

La superficie reusa atoms de Nexa (`NexaComposer kind='knowledgeAsk'`, `NexaSenderMark`, `GreenhouseThinkingBeat`) y conserva `Fuentes | Packet | Evals` como proof panel para humanos/agentes. Es props-only: no consulta tablas ni llama endpoints; el wiring real queda para `TASK-1085` sobre `knowledge-search.v1`. El lab `/design-system/nexa-chat` suma specimen `data-capture='nexa-knowledge-answer-surface-specimen'` y GVC tiene scenario `knowledge-answer-trace`.

## Delta 2026-06-12 — NexaComposer command variant + `knowledgeAsk` kind

`NexaComposer` deja de ser solo el composer de chat y gana contrato Primitive+Variants+Kinds explícito:

- Variant `chat`: mantiene el composer conversacional existente.
- Variant `command`: caja compacta con `NexaGlowBorder`, `GreenhouseNexaAnimatedMark kind='inlineMark'` al inicio y shortcut al final.
- Kinds oficiales: `floatingChat` → `chat`, `knowledgeAsk` → `command` con shortcut `↵` para preguntar sin chocar con el shell, `globalCommand` → `command` con shortcut `⌘ K`.

Primer consumer: `/knowledge/mockup/answer-trace`, que deja de ensamblar a mano `NexaGlowBorder` + mark + shortcut y usa `NexaComposer kind='knowledgeAsk'` + `NexaComposerInput kind='knowledgeAsk'`. El lab `/design-system/nexa-chat` suma specimen `data-capture='nexa-composer-command-variant'`.

## Delta 2026-06-11 — Nexa Insights pattern redesign + disclosure `nexaMark` + ThinkingBeat `dotSize` (TASK-1075 follow-up)

Iteración de producto sobre el pattern compuesto `NexaInsightsBlock` (`src/components/greenhouse/`), con dos extensiones a primitives y registro en el Design System.

**Primitives extendidas (aditivo, backward-safe):**

- `GreenhouseDisclosureTrigger` gana la variante **`nexaMark`** + kind `expandNexaInsights`. En vez de rotar un ícono, el isotipo de Nexa **morfa** (framer-motion): cerrado = mark completo (arco + spark), abierto = el arco se desvanece y el spark planea al centro. El SVG hereda `currentColor` → el contrato idle-gris→hover-azul del primitive tiñe el morph gratis. Reduced-motion → swap instantáneo. Discriminador `morph: 'iconRotation' | 'nexaMark'` en el controller.
- `GreenhouseThinkingBeat` gana el override opcional **`dotSize`** (px) para emparejar inline con texto más grande (ej. `body1`) sin escalar con transform.

**`NexaInsightsBlock` (cambios de pattern):**

- **Título** "Nexa Insights" (h3 usa `insights_title`, consistente con el estado non-ready).
- **Panel colapsable** como los hermanos: el toggle es el `nexaMark` (arriba a la derecha); body en `Collapse`; default abierto (`defaultExpanded`).
- **Rotating headline** — Nexa "narra en vivo": máquina de fases `writing → reading → thinking`. Typewriter + caret escribe una de **30 paráfrasis** (arrays `agent_headline_rotation_self` / `_observer` en `src/lib/copy/nexa.ts`), la deja leer (cadencia calma: write 48ms/char · read 7.6s · think 2.6s) y al terminar aparece el `GreenhouseThinkingBeat kind='nexa'` (decorative, `dotSize=6`) antes de pensar la próxima. Algunas frases usan `{name}` → primer nombre del usuario en sesión (nueva prop `viewerName`; si no hay nombre, esas frases se filtran). Reduced-motion → frase estática. Sin `aria-live` (no spamea SR; el dato real vive en chip + summary).
- **Segmented control** Recientes/Historial: track neutro + thumb blanco (`theme.greenhouseElevation.raised`) **deslizante** (framer-motion), texto/icono activo en primary, hover en inactivo. Padding generoso (`px 3.5 · py 1.25 · minHeight 44`, inset del thumb 6px) para que el segmento más ancho respire.
- **"Ver más"** progressive disclosure: cap a 4 observaciones + botón `GreenhouseButton variant='label' tone='primary'` armonizado lado a lado con el gateway "Ver todos los insights →".

**Ubicación ICO:** en `AgencyIcoEngineView` el `IcoAdvisoryBlock` (Nexa) se movió a **primero** (antes de KPIs/charts/scorecard/report).

**Design System:** nuevo lab `/design-system/nexa-insights` (`NexaInsightsLabView`, kind Pattern · status Hardening · owner `NexaInsightsBlock`) — live specimen, composición, matriz de estados (honest degradation) y nota Variants&Kinds (próximo). Registrado en `DesignSystemCatalogView`, breadcrumb shell y `route-reachability-manifest.ts`. Scenario GVC committeado `design-system-nexa-insights`.

## Delta 2026-06-10d — Disclosure primitives (trigger rotatorio + anchored disclosure)

TASK-1072. Se canonizaron dos primitives nuevas en `src/components/greenhouse/primitives/`:

- **`GreenhouseDisclosureTrigger`** — átomo: botón icono (wrappea MUI `IconButton`, `forwardRef`)
  que **rota para señalar abierto/cerrado**. Es el único motion (vía `theme.transitions` +
  reduced-motion horneado). Variants: `addToggle` (`+`→`×`, 45°), `expand` (chevron, 180°),
  `reveal` (kebab `⋮`→`⋯`, 90°). Kinds: `linkResource`·`addEntry` → addToggle,
  `expandSection`·`showFilters` → expand, `moreActions` → reveal. a11y: `ariaLabel` obligatorio +
  `aria-expanded`. Usable solo (acordeón, alternar) o como ancla de un disclosure.
- **`GreenhouseAnchoredDisclosure`** — higher-order primitive: **compone** el trigger +
  `GreenhouseFloatingSurface` + un slot `companion` (acción a la derecha). NO forkea FloatingSurface;
  cada variant resuelve a un par (surface variant + trigger variant): `contextualEditor` →
  inlineEditor+addToggle, `actionMenu` → actionMenu+reveal, `quickPeek` → evidencePeek+reveal. Kinds:
  `figmaNodeLink` → contextualEditor, `quickAdd`·`contextualOptions` → actionMenu, `evidence` → quickPeek.

`FigmaNodeLinkAffordance` (TASK-1072) se refactorizó para **consumir** `GreenhouseAnchoredDisclosure
kind='figmaNodeLink'` (deja de ser impl paralela). Controllers con resolver `kind→variant` + config
frozen (tests). Lab interno `/design-system/disclosure` (registrado en el catálogo, route-reachability,
scenario GVC `design-system-disclosure`, breadcrumb label). Nodo AXIS Figma pendiente (el botón Figma
del shell aparece inactivo en esa página — señal para crearlo). Tokenizado (radius CSS length, colores
de tema, motion tokens); cero hardcode. GVC desktop+mobile mirada.

## Delta 2026-06-10c — Design System breadcrumbs shell

El Design System interno hereda breadcrumbs canónicos en todas sus páginas y
mockups internos.

- `src/app/(dashboard)/admin/design-system/layout.tsx` envuelve todo el subtree
  con `DesignSystemBreadcrumbShell`.
- El shell compone `GreenhouseBreadcrumbs kind='pageHierarchy'` y resuelve la
  jerarquía `Admin / Design System / Página`, con parent real para
  `Typography / Typography Mockup`.
- Las rutas nuevas bajo `/admin/design-system` quedan cubiertas por fallback de
  label, pero deben agregarse al mapa del shell cuando necesiten nombre
  editorial o parent específico.
- Como consecuencia del shell, los labs y mockups del Design System no deben
  renderizar CTAs locales de retorno al catálogo (`Design System`, `Volver al
  sistema`, `Volver al catálogo`) en el header o secciones de reglas; ese
  retorno vive en el breadcrumb global. Se conservan solo links no redundantes
  como nodos Figma, links entre labs o specimens de botones.

## Delta 2026-06-10b — Radius token sx gotcha

Se documenta una trampa recurrente del stack MUI/Vuexy: `borderRadius` numérico
en `sx` se transforma como multiplicador de `theme.shape.borderRadius`, no como
px directo.

- `theme.shape.customBorderRadius.*` guarda números en px (`2/4/6/8/10`), pero
  dentro de `sx` deben emitirse como CSS length (`'4px'`, `'6px'`, etc.).
- Queda prohibido presentar `borderRadius:
  theme.shape.customBorderRadius.*` como ejemplo correcto dentro de `sx`, porque
  puede inflar el radio visual.
- `DESIGN.md`, `ui-platform/STACK.md` y las skills locales de Codex/Claude se
  sincronizan para que agentes no repitan el error en labs, mockups o primitives.

## Delta 2026-06-10a — GreenhouseBreadcrumbs primitive

La navegación jerárquica de Greenhouse deja de depender de usos MUI crudos y
queda canonizada como primitive AXIS/Greenhouse.

- `GreenhouseBreadcrumbs` vive en `src/components/greenhouse/primitives/` y
  envuelve MUI Breadcrumbs para preservar semántica `nav`/links/`aria-current`.
- Variants oficiales: `default` (port del componente AXIS Figma
  `Breadcrumbs Greenhouse`, node `205:234905`) y `compact` (headers densos,
  inspectors y workbenches).
- Kinds oficiales: `pageHierarchy`, `workbenchHierarchy`,
  `designSystemSpecimen`, `legacy` y `custom`, resueltos por
  `greenhouse-breadcrumbs-controller.ts`.
- Separators oficiales: `slash` (default AXIS) y `chevron` (compat legacy).
  El wrapper viejo `Breadcrumb` delega en la primitive con `kind='legacy'`.
- Hoja viva interna: `/admin/design-system/breadcrumbs`; catálogo DS y
  route-reachability actualizados; scenario GVC:
  `design-system-breadcrumbs`.
- Regla de uso: no duplicar breadcrumbs con botones "volver"; ancestors son
  links reales y el último item es current page con `aria-current='page'`.

## Delta 2026-06-09i — Efeonce orbital signature lab

La identidad institucional de Efeonce suma un lab interno de motion para probar
una firma orbital del wordmark sin tocar el asset principal.

- `public/branding/logo-full.svg` permanece intacto como asset canónico.
- Se creó una copia experimental con IDs semánticos en
  `public/branding/experiments/efeonce-logo-full-orbit-motion-copy.svg` para
  iteración visual.
- `EfeonceOrbitalLogoMark` queda como primitive de hardening para motion de
  marca institucional: variants `static`, `orbitalSignature` y `ambient`;
  kinds `institutionalWordmark` y `motionSpecimen`.
- La animación usa `useGreenhouseGSAP` y respeta reduced-motion. El círculo
  superior (`#efeonce-orbiting-satellite-circle`) recorre el óvalo que forma la
  O/nave; `#efeonce-orbit-top-bridge` completa la pista superior cuando el punto
  abandona su posición original.
- Hoja viva: `/admin/design-system/efeonce-brand`; scenario GVC:
  `design-system-efeonce-brand`.

## Delta 2026-06-09h — Nexa animated mark + animated ask badge canon

El mark de Nexa queda formalizado como familia canónica de primitives de marca
y microinteracción, no como variantes locales por surface.

- `GreenhouseNexaBrandMark` sigue siendo la primitive estática base de
  identidad Nexa. Kinds oficiales: `askNexaBadge`, `badgeIcon`,
  `inlineMark`, `monoMark`.
- `GreenhouseNexaAnimatedMark` agrega dos capacidades oficiales:
  reproducción Rive cuando existe un `.riv` exportado desde Rive Editor, y
  fallback GSAP tokenizado cuando no existe asset Rive o se necesita motion
  ligero. Props canónicas: `autoBlink`, `blinkCadence`,
  `ambientMoments`, `ambientMoment`, `chrome`, `tone`, `decorative`.
- Momentos GSAP oficiales: `autoBlink` para presencia viva ocasional,
  `arcSparklePlay` para juego arco-sparkle y `signalCatch` para captura de
  señal. El scheduler evita solapes y respeta reduced-motion.
- `GreenhouseNexaAnimatedAskBadge` es la versión animada oficial del badge
  `Pregúntale a Nexa`. No reemplaza el kind estático `askNexaBadge`; se usa
  solo cuando un entry point debe sentirse vivo sin convertirse en loader.
- `NexaGreetingsCard` expone `askBadgeVariant='static' | 'animated'`; el
  default es `static`. `GreenhouseFunnelChartCard` activa
  `askBadgeVariant='animated'` para
  `GreenhouseNexaGreeting kind='funnelStageAdvisor'`.
- El FAB global de Nexa usa `GreenhouseNexaAnimatedMark` con `autoBlink` +
  `ambientMoments`; su hover/focus usa `GreenhouseSpectrumBeam` en paleta Nexa
  detrás del botón, pausado en idle, y no debe lavarle el mark.
- Evidencia canónica: micro GVC del badge animado en lab Nexa
  `.captures/2026-06-09T20-52-25_micro-admin-design-system-nexa-brand-data-capture-nexa-brand-animated-ask-badge-hero`,
  micro GVC del consumer en charts
  `.captures/2026-06-09T20-57-11_micro-admin-design-system-charts-data-capture-nexa-ask-badge-animated`,
  ambient moments
  `.captures/2026-06-09T20-24-18_micro-admin-design-system-nexa-brand-data-capture-nexa-brand-arc-sparkle-specimen`
  /
  `.captures/2026-06-09T20-24-19_micro-admin-design-system-nexa-brand-data-capture-nexa-brand-signal-catch-specimen`
  y hover aura `.captures/2026-06-09T20-46-22_nexa-floating-hover-glow`.

## Delta 2026-06-09g — Funnel Analysis Pattern

La familia del funnel queda nombrada como **Funnel Analysis Pattern** en la capa
de patrones de UI Platform.

- Pattern: `Funnel Analysis Pattern`.
- Composition oficial: `GreenhouseFunnelChartCard`.
- Zone primitives: `GreenhouseFunnelHeaderControls`,
  `GreenhouseFunnelKpiStrip`, `GreenhouseFunnelStageRail`,
  `GreenhouseFunnelStageSegment`, `GreenhouseFunnelDiagnosticsGrid`.
- Asistencia contextual: `GreenhouseNexaGreeting kind='funnelStageAdvisor'`.
- Kinds iniciales: `cscPipeline`, `commercialLifecycle`, `quoteToCash`,
  `onboardingActivation`, `custom`.
- Regla de gobierno: nuevos workflows entran como `kind` y resuelven a una
  `variant`; las zonas se extienden solo cuando cambia una responsabilidad
  local. No copiar geometría del rail ni crear charts paralelos para el mismo
  análisis.
- Hoja viva: `/admin/design-system/charts`, sección
  `data-capture='funnel-primitive-anatomy'`.

## Delta 2026-06-09f — Funnel chart anatomy primitives + Nexa stage advisor kind

`GreenhouseFunnelChartCard` deja de ser una composición monolítica para quedar
como una familia de primitives de zona reutilizables, manteniendo el chart
completo como entrypoint oficial.

- Chart completo: `GreenhouseFunnelChartCard`.
- Zone primitives exportadas desde el mismo módulo:
  `GreenhouseFunnelHeaderControls`, `GreenhouseFunnelKpiStrip`,
  `GreenhouseFunnelStageRail`, `GreenhouseFunnelStageSegment` y
  `GreenhouseFunnelDiagnosticsGrid`.
- Variants oficiales del funnel: `operationalPipeline`,
  `conversionPipeline`, `lifecyclePipeline`.
- Mapping inicial de kinds:
  `cscPipeline -> operationalPipeline`,
  `quoteToCash -> conversionPipeline`,
  `commercialLifecycle/onboardingActivation -> lifecyclePipeline`.
- `GreenhouseFunnelStageRail` concentra la geometría sensible: SVG rail,
  fills por etapa, separadores internos, borde exterior único, scroll mobile,
  selection/focus/tooltip y summary accesible. No copiar el rail en consumers.
- `GreenhouseNexaGreeting` nace como facade primitive sobre el greeting
  existente de Nexa. Kinds iniciales: `homeOperatorGreeting`,
  `funnelStageAdvisor`, `custom`; el funnel usa
  `kind='funnelStageAdvisor'` para interpretar la etapa activa.
- `/admin/design-system/charts` documenta la anatomía del funnel y el scenario
  `design-system-charts` captura `funnel-primitive-anatomy`.

## Delta 2026-06-09e — Thinking Beat microinteraction primitive

Greenhouse suma **`GreenhouseThinkingBeat`** como primitive canónica para los
tres dots de pensamiento/actividad breve que empezaron en el prompt compacto de
Nexa dentro de `GreenhouseFunnelChartCard`.

- Runtime: `src/components/greenhouse/primitives/GreenhouseThinkingBeat.tsx`.
- Controller: `greenhouse-thinking-beat-controller.ts` gobierna variants,
  kinds y timings; no copiar dots/timings por consumer.
- Variants oficiales: `inline`, `cluster`, `standalone`.
- Kinds semánticos: `nexa`, `assistant`, `sync`, `neutral`.
- A11y: por defecto anuncia `role='status'` con `aria-label`; cuando vive
  dentro de una frase legible debe usarse `decorative` para no duplicar el
  mensaje en screen readers.
- Reduced motion: la primitive apaga el pulso y deja dots estáticos.
- Frontera: no reemplaza `GreenhouseLoadingSurface` ni loaders de procesos
  largos; comunica un beat corto entre mensajes, respuestas o syncs compactos.
- Hoja viva: `/admin/design-system/microinteractions`, scenario
  `design-system-microinteractions` captura `thinking-beat-lab`.

## Delta 2026-06-09d — Nexa brand mark primitive

La capa UI Platform suma **`GreenhouseNexaBrandMark`** en
`src/components/greenhouse/primitives/` para representar la identidad de Nexa
sin componer iconos sueltos por surface.

- Kinds iniciales: `askNexaBadge` (badge Midnight Navy con label
  `Pregúntale a Nexa`), `badgeIcon`, `inlineMark` y `monoMark`.
- Variante animada separada: `GreenhouseNexaAnimatedAskBadge` renderiza el
  mismo badge `Pregúntale a Nexa` con `GreenhouseNexaAnimatedMark` y el blink
  del FAB, sin sustituir el kind estático `askNexaBadge` por defecto.
- Source visual: `public/images/nexa-mark/nexa-mark.svg`,
  `nexa-mark-mono.svg`, `nexa-badge.svg` y spec
  `public/images/nexa-mark/nexa-icon-spec.md`.
- Regla de marca: la unidad mínima es arco + sparkle. No usar
  `tabler-sparkles` solo como representación de Nexa porque la chispa aislada
  puede leerse como proveedor AI, no como Nexa.
- Hoja viva: `/admin/design-system/nexa-brand` (gate
  `administracion.design_system`) muestra specimen principal, matriz de kinds,
  sizes y reglas de uso/cambio antes de agregar nuevas variantes.
- Primer consumer: `NexaGreetingsCard variant='compactContextual'` dentro de
  `GreenhouseFunnelChartCard`, donde el badge vive encima del input de chat sin
  agregar elevation ni competir con el gráfico.
- Evidencia: GVC `design-system-nexa-brand` local
  `.captures/2026-06-09T17-17-52_design-system-nexa-brand`
  (desktop/mobile, `qualityFindings=[]`) + GVC `design-system-charts`
  `.captures/2026-06-09T18-35-44_design-system-charts` para el primer consumer
  + micro evidence
  `.captures/2026-06-09T20-52-25_micro-admin-design-system-nexa-brand-data-capture-nexa-brand-animated-ask-badge-hero`
  para el badge animado.

## Delta 2026-06-09c — Greenhouse Funnel Chart primitive

La familia de chart primitives suma **`GreenhouseFunnelChartCard`** en
`src/components/greenhouse/primitives/` con `variant='operationalPipeline'` y
kinds iniciales `cscPipeline` / `commercialLifecycle` / `quoteToCash` /
`onboardingActivation` / `custom`.

- V1 implementa el funnel operativo horizontal como rail interactivo custom
  dentro de la primitive: etapas con icono, volumen, SLA, retención, selección
  keyboard-accessible, grid de diagnóstico (bloqueos, owner, freshness),
  insight lateral, reduced motion y summary accesible.
- El upgrade de robustez separa color de proceso y salud operativa: `stageRole`
  gobierna la rampa visual de etapas (`intake` → `delivery`), mientras
  `health`/diagnostics gobiernan dots, chips y explicación. La primitive
  normaliza valores inválidos, degrada a empty state honesto sin etapas y usa
  `NexaGreetingsCard variant='compactContextual'` para interpretación asistida:
  prompt dock blanco y centrado, guía contextual en primera persona rotando
  lentamente sobre un input estable con `GreenhouseThinkingBeat kind='nexa'`
  antes del cambio, título/foco en tooltip y sin elevation/shadow; owner y
  freshness viven en la tabla de diagnóstico para evitar duplicidad. La voz de
  Nexa se mantiene técnica con un toque incisivo y se ancla a la cadena ICO
  (retención, caídas, Cycle Time, TTM, FTR/RpA).
- Recharts sigue siendo la librería canónica para charts reales y queda
  reservado para futuras variants verticales basadas en `FunnelChart/Funnel`;
  la variante horizontal no fuerza esa geometría porque el contrato visual es un
  pipeline de proceso con microinteracciones ricas.
- El lab interno `/admin/design-system/charts` ahora muestra el specimen
  `cscPipeline` y el scenario GVC `design-system-charts` captura full-page +
  clip de la primitive desktop/wide/mobile.
- Responsive/layout: el rail se dibuja en una sola capa SVG detrás del contenido
  para mantener lectura de pipeline continuo sin solapes DOM ni texto dentro de
  máscaras. Cada segmento reserva padding para el chevron, los fills light usan
  `color-mix(...)` sólido para evitar puntas más oscuras por alpha compuesto, y
  `rail.cornerRadius` redondea levemente el rail sin perder dirección
  operacional. La geometría final usa stage paths sin stroke, separadores
  internos clippeados con apex suavizado y un único borde exterior SVG
  redondeado; no hay líneas superiores duplicadas ni strokes compitiendo en los
  caps externos. El strip superior usa layout determinístico de KPIs separado
  del rail por divider tokenizado para no truncar ni solapar texto. Los labels
  de rol (`Entrada`, `Producción`, etc.) quedan fuera del rail visual
  porque el título de etapa ya nombra el paso; el rol permanece en `aria-label`
  y summary accesible. El overflow horizontal queda como fallback mobile del
  rail, no como scroll de página/Lab.
- Guardrails: nuevos kinds deben entrar primero al Charts Lab con
  `data-capture`, contrato de etapas ordenadas, retención calculada por domain
  reader y estados que no dependan solo de color.

## Delta 2026-06-09b — Assigned Team health chart, talent dossier y verification primitives

El mockup aprobado de `Equipo asignado` promovió tres piezas route-locales a
primitives canónicas de UI Platform:

- **`GreenhouseHealthSignalChart`** — chart SVG segmentado para salud/cobertura/continuidad (`variant='segmentedDonut'`, kinds `teamHealth`/`talentHealth`/`capacityHealth`). Vive en `/admin/design-system/charts` con specimen, mini reglas de uso/cambio y GVC dedicado.
- **`GreenhouseTalentProfileDossier`** — card enterprise de perfil verificable (`variant='enterpriseCard'`, kinds `assignedTeamTalent`/`candidateTalent`/`deliveryTalent`) para dossier de talento, stack verificado, métricas compactas, cobertura y última señal.
- **`GreenhouseVerificationBadge`** queda formalizada como primitive de verificación con kinds `efeonce` y `talentVerified`; el lab vivo `/admin/design-system/talent-profile` muestra badges + dossier y documenta reglas de uso/cambio.

Regla: nuevas variants/kinds deben aparecer primero en el lab correspondiente
con `data-capture`, GVC desktop/mobile y contrato de datos explícito; no crear
badges, dossiers ni health donuts route-locales paralelos.

## Delta 2026-06-08 — Disclosure text typography token

La escala tipográfica suma `disclosureText` / `disclosure-text` como variante
semántica para avisos compactos de IA, legales, seguridad o confianza escritos
como oración. Cierra el caso del disclaimer de Nexa en Home sin volver a un
`fontSize` inline ni al microtexto de 8px.

- SoT/runtime: `typographyScale.disclosureText` → `theme.typography.disclosureText`.
- Uso permitido: disclosures compactos tipo "Nexa usa IA generativa. Verifica la información importante."
- Uso prohibido: metadata común (`caption`), labels uppercase (`overline`) o
  cualquier reducción local de `fontSize`.
- Evidencia: GVC Home `.captures/2026-06-08T21-47-31_inline-home` y typography canonical `.captures/2026-06-08T21-46-38_typography-canonical`.

## Delta 2026-06-08 — Feedback tonal sub-valores + atoms (TASK-1053 Fase B)

Tonal-by-default para feedback (aprobado en Restraint v1). Tres capas nuevas:

- **Sub-valores semánticos** (`axisSemanticSubValues` en `@core/theme/axis-semantic.ts`): `ink`/`tint`/`border`/`darkFg` por rol (info/success/warning/error), 16 hexes curados AA-verificados. Factory mode-aware `theme.greenhouseSemantic.<role>` (`src/components/theme/greenhouse-semantic-tokens.ts`, espejo de `greenhouseElevation`) compone el triple tonal por modo (light: tint/ink/border · dark: darkFg + `color-mix`). Gates: `greenhouse-semantic-drift.test.ts` + `axis-semantic-contrast.test.ts`. Surfaceado en `/admin/design-system/colors` (card SemanticTonalCard) + DESIGN.md §Color + V1 §8.1.quater.
- **GreenhouseChip** `label` (tonal) variant consume el triple para tonos feedback → arregla bug AA real (`warning.main` amber como texto era ilegible; ahora ink `#8a5a00` 5.41:1). Rollout **primitive-scoped** (decisión operador): los `<Chip>`/`<Alert>` MUI crudos NO cambian.
- **Feedback atoms (Slice B2)**: `GreenhouseKpiDelta` (delta KPI inline — signo + flecha + color AA, variants text/tonal, `invert`, `neutralThreshold`; migra HomeRunwayStrategic) + `GreenhouseStatusDot` (dot de estado + label/ariaLabel obligatorio, `pulse`/`halo`; migra HomeReliabilityRibbon). Color nunca solo (WCAG 1.4.1). Showcase en el lab de chips. GVC light+dark.

## Delta 2026-06-08 — Surface Hero Title token

- La escala tipográfica suma `surfaceHeroTitle` / `surface-hero-title`: Poppins 600, `2.125rem` desktop/tablet, `1.75rem` mobile, `lineHeight=surfaceHero(1.15)`.
- Uso permitido: título primario de surface full-page/workbench o header de identidad principal. Máximo uno por surface.
- Uso prohibido: cards, tablas, listas, drawers, modals, dashboards, rows repetidas, headings genéricos o marketing heroes. No reemplaza `h1-h4`; evita usar `fontSize` inline para recrear el look.
- Consumers iniciales: `/people/mockup/daniela-workforce` en el nombre de Daniela y `/agency/organizations/mockup` en el título `Organizaciones`. GVC local: `.captures/2026-06-08T09-32-36_person-daniela-workforce-profile`; referencia canónica: `.captures/2026-06-08T09-32-37_typography-canonical`.

## Delta 2026-06-07l — ApexCharts wrapper sin doble dynamic (ISSUE-085)

`AppReactApexCharts` queda canonizado como el único wrapper dueño del `next/dynamic(..., { ssr:false })` hacia `react-apexcharts`.

- Se eliminó el indirection legacy `src/libs/ApexCharts.tsx`.
- Los consumers que envolvían `AppReactApexCharts` con `dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr:false })` ahora importan el wrapper directo.
- Causa raíz: con doble dynamic, Turbopack dev generaba `react-loadable-manifest.json` apuntando a chunks `react-apexcharts_min_*.js` que no existían en `.next/dev/static/chunks`, produciendo 404, Fast Refresh en rebuild permanente y `Compiling...` infinito en local.
- Guardrail: nueva lint rule `greenhouse/no-dynamic-app-react-apexcharts` (`error`) bloquea reintroducir el dynamic nested y el import legacy `@/libs/ApexCharts`.
- Aprendizaje operativo: para `Compiling...` local con CPU alto, diagnosticar chunks/manifests con browser real antes de limpiar cache; `pnpm clean` es confirmación, no causa raíz.
- Verificación: Playwright local `/home` + `/admin/design-system/colors` sin cuelgue, consola 0 errores, chunk `react-apexcharts` 200 OK; `pnpm test:lint-rules`, `tsc`, `pnpm lint` y `pnpm build`.

## Delta 2026-06-07k — Elevation / shadow token system semántico (TASK-1049)

Greenhouse gana un SoT semántico de elevación. Las primitives dejan de leer índices MUI (`Paper elevation={6}` → `theme.shadows[6]`) o `customShadows` a ojo, y leen un **rol** servido por el theme.

- **SoT** `src/components/theme/elevation-tokens.ts` — factory mode-aware (`elevationTokens(mode)`) sobre el canal canónico `var(--mui-mainColorChannels-${mode}Shadow)` (AXIS-aware, NO reusa `customShadows.md/lg`, NO OKLCH). 6 roles: `none` · `raised` · `floating` · `overlay` · `modal` · `overflow` (reservado, sin valor runtime hasta tener consumidor).
- **Runtime** `theme.greenhouseElevation.<role>` (inyectado en `mergedTheme.ts`, augmentado en `types.ts`). Cada token: `boxShadow` + `borderColor` (obligatorio en floating/overlay/modal) + `surfaceColor` + `intendedUse`.
- **Receta 2026**: dos capas suaves + borde hairline 1px (GitHub Primer / shadcn / Linear / Vercel Geist). Techo anti-dated: ningún rol supera `0 8px 24px rgba(0,0,0,0.1)`. Dark usa alpha más alto; el **borde** carga la separación bajo `forced-colors` (el navegador elimina `box-shadow`).
- **Primer consumidor**: `GreenhouseFloatingSurface` deja `elevation={6}` → `elevation={0}` + `theme.greenhouseElevation.floating` (boxShadow + border). 6 variants comparten `floating` (sin campo `elevationRole` en el controller — restraint; se agrega solo si un variant lo necesita).
- **Drift-guard** `src/components/theme/elevation-drift.test.ts` — paridad `runtime ≡ SoT ≡ DESIGN.md §Elevation ≡ V1 §6` (role-set) + value parity runtime≡SoT + techo + border. `DESIGN.md §Elevation` y `V1 §6` reescritos a roles (la tabla numérica queda como §6.1 legacy/compat).
- **Lab vivo** `/admin/design-system/elevation` (interno, gate `administracion.design_system`, alcanzable por nav TASK-982) — specimens vivos desde el theme, light/dark, nota forced-colors.
- ADR: [GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md](../GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md). Verificado GVC local (lab + floating-surface-primitives). drift 27/27 · floating-surface 24/24 · design:lint 0/0.

## Delta 2026-06-07j — Floating Surface anchored motion hardening

`GreenhouseFloatingSurface` moderniza su entrada visual sin convertir los popovers/menus/tooltips en motion cinematica.

- La primitive deja el contrato `motion: fade` y adopta `motion: anchored`: la animacion deriva del placement resuelto de Floating UI (`top/right/bottom/left`) para entrar desde el borde del anchor, con travel corto y snap suave de escala; al cerrar, sale de vuelta hacia el anchor con fade/scale mas rapido.
- La animacion usa CSS Tier 1 + tokens canonicos (`motionCss.duration.standard`, `motionCss.ease.emphasized`); no usa `<Motion>` ni `useGreenhouseGSAP` porque esos contratos se reservan para entrance/stagger/scrollReveal/timeline.
- El transform animado vive en el `Paper` interno; el wrapper mantiene `refs.setFloating` + `floatingStyles` para no pelear con el transform de posicionamiento de Floating UI. En salida, el wrapper queda montado hasta terminar el token `exitDuration`.
- `prefers-reduced-motion` elimina animacion/transform y deja el estado final estable.
- El lab `/admin/design-system/floating-surfaces` expone el chip `motion: anchored` por variant.
- Verificado con tests focales de controller/component y GVC desktop+mobile en `.captures/2026-06-07T15-54-46_floating-surface-primitives`.


## Delta 2026-06-07i — Utilities Lab y Activity Timeline token hardening

`/admin/design-system/utilities` y `GreenhouseActivityTimeline` se alinean al contrato tokenizado del Design System, manteniendo `ActivityTimeline` como primitive reusable y no como composición visual route-local.

- Nuevo controller `greenhouse-activity-timeline-controller.ts` con `GREENHOUSE_ACTIVITY_TIMELINE_TOKENS` para card widths, rail/dot geometry, icon/avatar sizing, opacidades, sombras, motion timing y spacing del shell.
- `GreenhouseActivityTimeline` consume ese controller para chrome/motion; timestamps pasan a `monoId`, labels/personas/adjuntos usan variants canónicas (`h6`/`button`) y los colores/sombras se resuelven desde `theme.palette` + `alpha`.
- Se retira el peso `500` del título de item y los overrides inline `700/800` de labels/títulos/avatars; la primitive queda dentro del ladder vigente `400/600/700/800` sin roles ad-hoc.
- `UtilitiesLabView` compone `GreenhouseButton`, `GreenhouseChip`, `DESIGN_SYSTEM_LAB_TOKENS` y `GREENHOUSE_ACTIVITY_TIMELINE_TOKENS`; ya no usa MUI `Button`/`Chip` crudos ni `rgba`/type literals route-locales para documentar la primitive.
- Se agrega test focal para el controller y evidencia GVC desktop+mobile en `.captures/2026-06-07T14-43-31_design-system-utilities`.


## Delta 2026-06-07h — Charts Lab y chart primitives token hardening

`/admin/design-system/charts` y las chart card primitives se conectan al contrato tokenizado del Design System en vez de mantener literals visuales route-locales o por-card.

- Nuevo controller `greenhouse-chart-controller.ts` con `GREENHOUSE_CHART_CHROME_TOKENS` para card widths, tooltip markers, icon sizes, chart heights/bar sizes/radius y opacidades semánticas.
- `GreenhouseChartCard`, `GreenhouseMetricBreakdownChartCard` y `GreenhouseStackedDistributionChartCard` consumen ese controller para chrome/sizing; valores numéricos usan variants `monoId`/`monoAmount`/`kpiValue`; el delta semanal usa `GreenhouseChip`.
- `GreenhouseChartCard` deriva los `LabelList` de Recharts desde `getChartTypographyFromTheme()`; `AppRecharts` deja de declarar rems fijos y usa `theme.typography.caption.fontSize`.
- Se retiró el HEX hardcodeado del tone `ink` en `GreenhouseStackedDistributionChartCard` y se resolvió desde `theme.palette.text.primary` / `theme.palette.grey`.
- `ChartsLabView` usa `GreenhouseButton`, `DESIGN_SYSTEM_LAB_TOKENS` y `GREENHOUSE_CHART_CHROME_TOKENS`.


## Delta 2026-06-07g — Floating Surface Lab tokenizado

`/admin/design-system/floating-surfaces` deja de usar literals visuales route-locales para documentar la primitive y se conecta al vocabulario vivo del Design System.

- El lab compone `GreenhouseButton`, `GreenhouseChip` y `GreenhouseFloatingSurface`; ya no usa MUI `Button`/`Chip` crudos para los ejemplos de variants.
- La tipografía de labels/menu/input/specimens deriva de `typographyScale`; motion deriva de `motionCss`.
- Layout, opacidades, focus ring, sombra e icon specimen viven en `DESIGN_SYSTEM_LAB_TOKENS` (`src/views/greenhouse/admin/design-system/design-system-lab-tokens.ts`) para evitar números visuales dispersos en views del museo.
- La primitive mantiene sus tokens propios en `floating-surface-controller` (`FLOATING_SURFACE_CHROME_TOKENS`, `FLOATING_SURFACE_MOTION_TOKENS`); el namespace del lab no sustituye el contrato de la primitive.


## Delta 2026-06-07f — FieldProvenance usa Floating Surface canonica

`GreenhouseFieldProvenancePeek` deja de mantener un popover ad-hoc sobre `@floating-ui/react` y compone `GreenhouseFloatingSurface variant='evidencePeek' kind='fieldProvenance'`.

- La API pública de `GreenhouseFieldProvenancePeek` se mantiene intacta (`source`, `confidence`, `freshness`, `variant`, `triggerLabel`, `dataCapture`).
- El trigger conserva su affordance visual y metadata (`data-source`, `data-variant`, `data-capture`), mientras positioning/focus/dismissal/portal/role pasan a la primitive canónica.
- Cierra el follow-up anotado en el Delta 2026-06-06b.


## Delta 2026-06-07e — Greenhouse Button + AsyncAction composition

`GreenhouseAsyncActionButton` compone `GreenhouseButton` como base canonical. La frontera queda:

- `GreenhouseButton` gobierna emphasis visual, variant (`solid/label/outlined/text`), tone, size, kind, icon slots, focus ring y hooks GVC.
- `GreenhouseAsyncActionButton` gobierna comportamiento de command temporal: estados `idle/loading/success/error`, double-submit guard, spinner, success/error icons, scan/progress affordance, `aria-busy`, `aria-live` y live region.
- Compatibilidad legacy: AsyncAction conserva `variant='contained'|'tonal'|'outlined'|'text'` y `color='primary'|'secondary'|'error'|'warning'|'info'|'success'`; internamente traduce a `GreenhouseButton` (`contained→solid`, `tonal→label`, `outlined→outlined`, `text→text`) y `tone`.
- Escape canonical: AsyncAction acepta `greenhouseVariant` y `tone` para que nuevos consumers puedan declarar el contrato Greenhouse directo sin depender del mapping legacy.
- A11y: el status live region vive fuera del `<button>` para no duplicar el accessible name del control.


## Delta 2026-06-07d — Greenhouse Button Primitive

Greenhouse adopta `GreenhouseButton` como primitive canonical para botones de producto basada en AXIS Figma (`Design System | Vuexy → AXIS`, node `324:32923`). El objetivo no es duplicar MUI Button ni reskinear Vuexy: es gobernar el contrato reusable de comandos, emphasis, placement de iconos, sizes, tones y states desde una capa Greenhouse verificable.

Docs canonicos:

- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseButton.tsx`
- Controller/tokens: `src/components/greenhouse/primitives/greenhouse-button-controller.ts`
- Visual lab interno: `/admin/design-system/buttons`
- Scenario GVC: `design-system-buttons`

Contrato:

- Variants oficiales V1: `solid`, `label`, `outlined`, `text`. `label` conserva el nombre AXIS/Figma y se traduce internamente a `variant='tonal'` de Vuexy/MUI; `solid` se traduce a `contained`.
- Tones oficiales V1: `primary`, `secondary`, `error`, `warning`, `info`, `success`.
- Sizes oficiales V1: `large` (48px), `medium` (38px) y `small` (30px). El label size se deriva del SoT tipografico via `controlText.lg/md/sm`; el lab expone estos tokens en cada board.
- Kinds semanticos V1: `primaryAction`, `secondaryAction`, `destructiveAction`, `inlineAction`, `navigation`, `filter`, `custom`.
- Resolver canonico: `resolveGreenhouseButtonVariant({ kind, variant })` y `resolveGreenhouseButtonTone({ kind, tone })` aplican defaults seguros sin dejar que un kind maneje layout directo. Ejemplos: `primaryAction→solid/primary`, `secondaryAction→label/secondary`, `destructiveAction→solid/error`, `inlineAction→text/primary`.
- Props principales: `children`, `variant`, `tone`, `size`, `kind`, `leadingIcon`, `leadingIconClassName`, `trailingIcon`, `trailingIconClassName`, `dataCapture`, `reserveInlineSize`.
- La primitive consume el runtime MUI/Vuexy existente (`MuiButton` overrides, `tonal`, ButtonBase/ripple config, theme palette AXIS) y agrega `data-variant`, `data-tone`, `data-kind`, focus ring, reduced-motion fallback local, icon sizing por token y hooks GVC. No crea un theme paralelo.
- `GreenhouseAsyncActionButton` sigue siendo la primitive para estados async (`idle/loading/success/error`) y ya compone `GreenhouseButton`; cuando un boton requiere command feedback temporal, usar AsyncAction, y cuando no requiere estado temporal usar `GreenhouseButton`.
- Product consumers deben preferir `GreenhouseButton` para botones nuevos/reusables de plataforma. Raw `<Button>` sigue permitido para adapters legacy, Vuexy internals o callsites no tocados; migrar por slices, no por sweep cosmetico.
- Nuevas variants no pueden ser skins de color/radio/sombra; deben cambiar emphasis, action model, density o state contract. Nuevos kinds deben mapear a una variant existente antes de crear `FooButton` locales.


## Delta 2026-06-07c — Greenhouse Chip Primitive

Greenhouse adopta `GreenhouseChip` como primitive canonical para chips compactos basada en AXIS Figma (`Design System | Vuexy → AXIS`, node `369:92030`). El objetivo es cortar la proliferacion de chips route-locales cuando el caso es reusable: estados, atributos, filtros, entradas removibles, identidad compacta y metadatos operativos.

Docs canonicos:

- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseChip.tsx`
- Visual lab interno: `/admin/design-system/chips`
- Scenario GVC: `design-system-chips`
- Avatar de referencia DS: `public/images/greenhouse/design-system/axis-avatar-greenhouse.png`, exportado desde AXIS Figma `Avatar/Greenhouse` (node `369:72301`). Es solo asset de documentacion visual; los avatares productivos siguen resolviendose con `resolveAvatarUrl()`.

Contrato:

- Variants oficiales V1: `solid`, `label`, `outlined`. `label` conserva el nombre AXIS/Figma y se traduce internamente al affordance tonal de Vuexy/MUI.
- Tones oficiales V1: `default`, `primary`, `secondary`, `error`, `warning`, `info`, `success`.
- Sizes oficiales V1: `medium` (32px) y `small` (24px), alineados al nodo Figma.
- Kinds semanticos V1: `status`, `attribute`, `input`, `action`, `identity`, `filter`, `metric`, `custom`.
- Props principales: `label`, `variant`, `tone`, `size`, `kind`, `avatarSrc/avatarInitials/avatarNode`, `iconClassName`, `closable`, `onDelete`, `closeLabel`, `dataCapture`.
- La primitive owns altura, border radius AXIS, avatar/delete icon sizing, focus ring, hover/pressed state, delete-icon affordance, reduced-motion fallback, `data-variant`, `data-tone`, `data-kind`, `data-capture` y estados disabled/clickable.
- Product consumers deben preferir `GreenhouseChip` cuando el chip tenga semantica reusable o de plataforma. `@core/components/mui/Chip` y `@mui/material/Chip` siguen permitidos para adapters legacy o componentes Vuexy internos mientras se migra por slice.
- Nuevas variants no pueden ser skins de color/radio; deben cambiar contrato funcional, densidad, interaccion o state model. Nuevos kinds deben mapear un uso semantico hacia una variant existente antes de crear componentes locales como `FooStatusChip`.


## Delta 2026-06-07b — Greenhouse Utilities / Activity Timeline Primitive

Greenhouse adopta `GreenhouseActivityTimeline` como primera primitive de utilities basada en AXIS Figma (`Design System | Vuexy → AXIS`, node `6678:105154`) para timelines de actividad, auditoria ligera, handoffs y documentos.

Docs canonicos:

- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseActivityTimeline.tsx`
- Visual lab interno: `/admin/design-system/utilities`
- Scenario GVC: `design-system-utilities`

Contrato:

- Variants oficiales V1: `card`, `embedded`, `compact`.
- Kinds semanticos V1: `activityTimeline`, `auditTrail`, `handoffTimeline`, `documentTimeline`, `custom`.
- Props principales: `title`, `subtitle`, `items`, `variant`, `kind`, `icon`, `actionLabel`, `onAction`, `ariaLabel`, `dataCapture`.
- `items` modela entradas ordenadas con `id`, `title`, `timestamp`, `description`, `tone` y bloques opcionales `attachment`, `person`, `avatars`.
- La primitive owns lista ordenada accesible, timeline rail, dots semanticos, timestamps, attachment pill, person row, avatar group, responsive stacking, `data-variant`, `data-kind`, `data-capture` y reduced-motion.
- Los clusters de equipo reutilizan `TeamAvatarGroup` (`src/components/greenhouse/TeamAvatarGroup.tsx`) para conservar tooltip, fallback de iniciales y microinteraccion `pull-up`; no crear otro avatar group dentro de consumers del timeline.
- Library choice V1: Framer Motion via `@/libs/FramerMotion` + `useReducedMotion`. Se eligio sobre GSAP porque este diseño necesita mount transitions y crecimiento sutil de conectores; GSAP queda para timelines complejas, SVG/path/text, ScrollTrigger o motion medido.
- Boundary: no reemplaza auditoria legal completa, event sourcing UI, sidecars de evidencia, maker-checker ni readers/commands de dominio. Los dominios calculan/filtran eventos, permisos, evidencia y URLs; la primitive gobierna shell visual, a11y, responsive y motion.
- Toda nueva variant utility debe aparecer primero en `/admin/design-system/utilities` con `data-capture`, GVC desktop+mobile y test focal antes de migrar consumers productivos.


## Delta 2026-06-07 — Greenhouse Chart Card Primitives

Greenhouse adopta tres primitives iniciales para chart cards enterprise de la familia Design System / AXIS:

- `GreenhouseChartCard`: primer kind `earningReports`, primera variant oficial `monthlyBar`, adaptada desde AXIS Figma (`Design System | Vuexy → AXIS`, node `6717:214469`) al stack Greenhouse.
- `GreenhouseStackedDistributionChartCard`: primer kind `vehiclesOverview`, primera variant oficial `stackedStatus`, adaptada desde AXIS Figma (`Design System | Vuexy → AXIS`, node `6717:215195`) al stack Greenhouse.
- `GreenhouseMetricBreakdownChartCard`: primer kind `earningReports`, primera variant oficial `weeklyBarSummary`, adaptada desde AXIS Figma (`Design System | Vuexy → AXIS`, node `6717:211725`) al stack Greenhouse para KPI hero + delta + serie semanal + metric meters.

Docs canonicos:

- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseChartCard.tsx`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseStackedDistributionChartCard.tsx`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseMetricBreakdownChartCard.tsx`
- Visual lab interno: `/admin/design-system/charts`
- Scenario GVC: `design-system-charts`

Contrato:

- Library choice V1: Recharts. Se eligio para esta primitive porque tabs semanticos, labels, tooltip, hover state, responsive behavior y fallback accesible permanecen bajo React/MUI. ApexCharts sigue vigente para dashboards existentes y charts donde su wrapper ya sea suficiente.
- Props principales: `title`, `subtitle`, `tabs`, `variant`, `kind`, `activeTabId/defaultActiveTabId`, `onActiveTabChange`, `onAddMetric`, `maxValue`, `yAxisTicks`, `valueFormatter`, `chartAriaLabel`, `dataCapture`.
- `tabs` modela cada metrica con `id`, `label`, `icon`, `data`, `tone` y `highlightedIndex`. La primitive solo renderiza visualizacion; readers, commands, autorizacion, audit/outbox y API parity viven en adapters de dominio.
- `GreenhouseStackedDistributionChartCard` modela distribuciones apiladas con `segments[]` (`id`, `label`, `value`, `detail`, `icon`, `tone`) y usa Recharts para la barra apilada + MUI para rows operativas. El dominio calcula los porcentajes/tiempos; la primitive gobierna layout, tooltip, responsive y a11y.
- `GreenhouseMetricBreakdownChartCard` modela snapshots compactos con `heroValue`, `deltaLabel`, descripcion, `series[]` semanal y `metrics[]` (`id`, `label`, `value`, `icon`, `tone`, `progress`). Recharts gobierna la serie; MUI gobierna los meters. El dominio calcula valores/progreso; la primitive conserva shell, responsive, tooltip y a11y.
- A11y: el plot expone `role='img'`, nombre conciso via `aria-label` y resumen de datos via `aria-describedby`. No usa tabla sr-only grande: el fallback visualmente oculto es una caja 1x1 para evitar layout phantom en mobile.
- Responsive: tabs pueden scrollear horizontalmente si la cantidad de metricas supera el ancho; el chart debe escalar en mobile sin quedar cortado.
- Extension futura: nuevas variants deben cambiar comportamiento de visualizacion, densidad, interaccion o contrato de datos; no se aceptan variants que solo cambien color, sombra o radio. Nuevos kinds deben mapear un uso semantico de dominio hacia una variant oficial antes de que el consumer pinte layout propio.
- Toda variant chart nueva debe aparecer primero en `/admin/design-system/charts` con `data-capture`, GVC desktop+mobile y test focal antes de migrar consumers productivos.


## Delta 2026-06-06e — Greenhouse Microinteraction Primitives V1/V1.1

Greenhouse adopta `GreenhouseAsyncActionButton`, `GreenhouseCommandFeedback`, `GreenhouseStateTransition`, `GreenhouseInlineValidation`, `GreenhouseFieldProvenancePeek`, `GreenhouseStepperProgressMicro`, `GreenhouseEvidenceAttachmentDropzone` y `GreenhouseInlineDecisionPrompt` como primitives V1/V1.1 de microinteracciones. Cubren commands puntuales, resultados post-accion, cambios de estado visibles, validacion local/async, procedencia de datos, progreso operativo compacto, evidencia/upload verificado y decisiones inline de riesgo controlado.

Docs canonicos:

- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseAsyncActionButton.tsx`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseCommandFeedback.tsx`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseStateTransition.tsx`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseInlineValidation.tsx`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseFieldProvenancePeek.tsx`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseStepperProgressMicro.tsx`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseEvidenceAttachmentDropzone.tsx`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseInlineDecisionPrompt.tsx`
- Visual lab interno: `/admin/design-system/microinteractions`
- Scenario GVC: `design-system-microinteractions`

Canon V1/V1.1:

| Primitive | Job funcional | States / tones | Variants oficiales | No reemplaza |
| --- | --- | --- | --- | --- |
| `GreenhouseAsyncActionButton` | Command puntual localizado | `idle`, `loading`, `success`, `error` | Compone `GreenhouseButton`; acepta legacy `contained/tonal/outlined/text` y canonical `solid/label/outlined/text` via `greenhouseVariant` | Confirmaciones destructivas, procesos largos |
| `GreenhouseCommandFeedback` | Resultado persistente post-accion | `success`, `error`, `warning`, `info`, `retrying` | `compact` como density secundaria | Alerts bloqueantes, toast global unico |
| `GreenhouseStateTransition` | Cambio visible de estado en row/card/panel | `success`, `warning`, `error`, `info`, `neutral` | `surface`, `inline` | Timeline/audit history completo |
| `GreenhouseInlineValidation` | Validacion local/async cerca del campo o seccion | `idle`, `checking`, `valid`, `warning`, `error`, `blocked` | `field`, `section`, `summary`, `asyncCheck` | Summary legal completo, bloqueos maker-checker |
| `GreenhouseFieldProvenancePeek` | Procedencia, confianza y frescura de un dato | source: `integration`, `manual`, `calculated`, `override`, `seeded`, `fallback`, `system`; confidence/freshness | `icon`, `chip`, `inline` | Auditoria completa, lineage explorer, sidecar de evidencia |
| `GreenhouseStepperProgressMicro` | Progreso compacto de 3-5 pasos operativos | `pending`, `active`, `complete`, `warning`, `error`, `blocked` | `horizontal`, `vertical`, `compact` | Wizard largo, loader de pagina, timeline permanente |
| `GreenhouseEvidenceAttachmentDropzone` | Adjuntar/verificar evidencia con estados reales | `idle`, `dragging`, `uploading`, `scanning`, `verified`, `rejected`, `disabled` | `panel`, `compact` | Adapter de upload, vault, malware scan, asset service |
| `GreenhouseInlineDecisionPrompt` | Decision inline contextual de riesgo controlado | states `idle`, `reviewing`, `submitting`, `confirmed`, `blocked`; tones `info`, `warning`, `error`, `success`, `neutral` | `choice`, `confirmation`, `impact` | Dialog destructivo/legal/financiero, maker-checker |

Contrato especifico:

- Estados oficiales: `idle`, `loading`, `success`, `error`.
- Props principales: `children`, `loadingLabel`, `successLabel`, `errorLabel`, `state`, `startIcon`, `disableWhileLoading`, `reserveWidth`, `statusLabel`.
- La primitive owns `aria-live='polite'`, `aria-busy` en loading, `data-state`, proteccion contra doble submit por default y reduced-motion para la microinteraccion visual.
- Usar para commands puntuales: guardar, enviar, aprobar, generar, validar, refrescar, reintentar.
- `GreenhouseCommandFeedback` cubre el resultado persistente post-accion con tonos `success`, `error`, `warning`, `info`, `retrying`, `role='status'` o `role='alert'` para errores, CTA opcional, timestamp y reference id.
- Usar `CommandFeedback` cuando el usuario necesita saber que ocurrio, que referencia quedo registrada, o que hacer si falla/reintenta. No reemplaza un toast global; lo complementa cuando el resultado debe permanecer visible en el contexto.
- `GreenhouseStateTransition` cubre cambios visibles de estado con tonos `success`, `warning`, `error`, `info`, `neutral`; variants funcionales `surface` e `inline`; `fromLabel`, `toLabel`, title, description, timestamp/reference id, `role='status'` o `role='alert'` para errores, `aria-live` y reduced-motion.
- Usar `StateTransition` cuando un row, card, inspector o panel cambia de estado y el usuario necesita ver de donde venia, donde quedo y con que referencia/timing. No reemplaza timelines de auditoria completos ni historiales permanentes.
- `GreenhouseInlineValidation` cubre feedback cerca del campo/seccion/resumen con estados `idle`, `checking`, `valid`, `warning`, `error`, `blocked`; variants funcionales `field`, `section`, `summary`, `asyncCheck`; `role='status'` o `role='alert'` para error/blocked, `aria-live`, progress bar para asyncCheck y reduced-motion.
- Usar `InlineValidation` cuando una regla local o async cambia el estado de un campo, seccion o formulario y el usuario necesita saber si puede continuar, corregir, reintentar o esperar. No usar como reemplazo de validacion server-side, maker-checker ni evidencia/auditoria completa.
- `GreenhouseFieldProvenancePeek` cubre campos cuya confianza depende de fuente, sync, override, seed, calculo o fallback. Usa Floating UI dentro de la primitive, trigger accesible, popover no-modal, focus return, confidence/freshness/source signals y notas/reference id. Product views no deben reimplementar popovers de procedencia por dominio salvo adapter thin sobre esta primitive.
- `GreenhouseStepperProgressMicro` cubre procesos cortos dentro de panels/cards/sidecars: validar -> renderizar -> empaquetar -> enviar, readiness payroll, handoffs externos o callbacks. Debe mantener contexto; no reemplaza `GreenhouseLoadingSurface` para route/page/panel loading ni stepper wizard para formularios largos.
- `GreenhouseEvidenceAttachmentDropzone` cubre el estado visual del adjunto: idle/dragging/uploading/scanning/verified/rejected/disabled, file summary, progress y acciones de buscar/reemplazar/quitar. La primitive no ejecuta negocio: endpoints, vault, malware scan, audit trail y ownership viven en adapters de dominio.
- `GreenhouseInlineDecisionPrompt` cubre decisiones no destructivas o de riesgo controlado que deben quedarse inline: elegir fuente, propagar un cambio, mantener override, revisar impacto. Si la accion es destructiva, legalmente sensible, financieramente irreversible, maker-checker o requiere firma/approval, usar `Dialog`/sidecar/runbook y luego feedback de command.
- Extension futura:
  - Nuevas **variants** deben cambiar comportamiento, densidad, state model, action placement o contrato de microinteraccion. No se aceptan variants que solo cambien color, icono, radio o sombra.
  - Nuevos **kinds** deben mapear un caso semantico de dominio hacia una variant oficial antes de decidir layout. Ejemplos esperados: `contractSignaturePipeline -> GreenhouseStepperProgressMicro variant='horizontal'`, `paymentEvidence -> GreenhouseEvidenceAttachmentDropzone variant='panel'`, `bankAccountOverride -> GreenhouseFieldProvenancePeek variant='chip'`, `propagatePaymentProfileChange -> GreenhouseInlineDecisionPrompt variant='impact'`.
  - Si un dominio necesita copy, endpoints, commands o readers propios, crear un adapter thin alrededor de la primitive. La primitive conserva layout/a11y/responsive/motion/state; el dominio conserva negocio, autorizacion, audit/outbox y API parity.
  - Toda variant/kind nueva debe aparecer primero en `/admin/design-system/microinteractions` con `data-capture`, GVC desktop+mobile y tests focales antes de migrar consumers productivos.
- No usar para procesos largos multi-step: usar `GreenhouseLoadingSurface`/loader nombrado, sidecar, drawer o progress rail segun contexto.
- No usar para confirmaciones destructivas/legales/financieras que requieren decision explicita: usar `Dialog`/maker-checker y luego el boton async dentro de la accion confirmada.
- Product consumers deben reemplazar patrones locales `startIcon={submitting ? <CircularProgress /> : ...}` por esta primitive cuando el boton modela un command puntual.
- Nuevas variants visuales, states o kinds semanticos deben iterarse dentro de estas primitives y en el Microinteractions Lab antes de crear `FooSubmitButton`, `FooValidation`, `FooStatusPulse`, `FooFeedbackCard` o componentes locales equivalentes. Una variant nueva debe cambiar comportamiento, densidad, state model, action placement o microinteraction contract; nunca solo color/radius/icono.


## Delta 2026-06-06d — Greenhouse Loading Surface

Greenhouse adopta `GreenhouseLoadingSurface` como primitive inicial para loading states modernos, evitando que cada ruta o view vuelva a resolver el problema con `CircularProgress`, `Skeleton` o copy local sin criterio de plataforma.

Docs canonicos:

- Implementacion/task: `docs/tasks/in-progress/TASK-1037-greenhouse-loading-primitive-system.md`
- Runtime primitive: `src/components/greenhouse/primitives/GreenhouseLoadingSurface.tsx`
- Visual lab interno: `/admin/design-system/loaders` (`Loading Lab`, client-visible blocked by `administracion.design_system`)

Contrato:

- Variants oficiales V1/V1.1: `pageSkeleton`, `panelSkeleton`, `tableSkeleton`, `inlineAction`, `brandSplash`, `aiThinking`, `progressRail`, `documentPipeline`, `externalHandoff`, `secureAction`, `uploadVerification`, `reconciliationMatching`.
- Cada variant representa un job funcional, no una skin: route-level skeleton, panel/sidebar, table/list loading, accion inline, transicion branded, IA reasoning, proceso por checkpoints, generacion de documentos, handoff a proveedor, accion sensible, verificacion de evidencia y conciliacion/matching.
- Componentes nombrados oficiales:
  - `GreenhousePageSkeletonLoader`
  - `GreenhousePanelSkeletonLoader`
  - `GreenhouseTableSkeletonLoader`
  - `GreenhouseInlineActionLoader`
  - `GreenhouseWorkspaceBootLoader`
  - `GreenhouseNexaReasoningLoader`
  - `GreenhouseCheckpointRailLoader`
  - `GreenhouseDocumentPipelineLoader`
  - `GreenhouseExternalHandoffLoader`
  - `GreenhouseSecureActionLoader`
  - `GreenhouseUploadVerificationLoader`
  - `GreenhouseReconciliationMatchingLoader`
- Product consumers should prefer the named component when the job is known. Use `<GreenhouseLoadingSurface variant='...' />` for abstract registries, labs, or factories.
- Variant iteration happens inside the named component + base variant pair first. If a consumer needs a materially different behavior, propose a new official variant or kind mapping before creating a local loader.
- La primitive owns `role='status'`, `aria-busy='true'`, `aria-live='polite'`, reduced-motion handling, `data-capture` hooks y estructura visual responsive.
- Reutilizar el stack Greenhouse no significa limitarse a los loaders existentes: Framer Motion/CSS/MUI/AXIS son el chasis, pero las implementations visuales deben subir el nivel antes de migrar consumers.
- Product views deben preferir esta primitive antes de introducir nuevos loaders locales. `CircularProgress` queda aceptable para casos puntuales inline mientras se migra, pero no debe convertirse en la solucion default de route/panel/IA.
- `Lottie` o `GSAP` solo deben entrar en una variant o consumer si el Loading Lab demuestra que aportan valor claro y conservan reduced-motion.
- GVC requerido para variants nuevas o cambios visuales materiales; el scenario `design-system-loaders` captura desktop + mobile.


## Delta 2026-06-06c — Dashboard Floating Action Dock

Greenhouse adopta **Dashboard Floating Action Dock** como primitive shell para acciones flotantes persistentes ancladas al viewport. El dock gobierna la columna bottom-right del dashboard y evita que cada accion global defina `position: fixed`, `bottom`, `right` y `z-index` por separado.

Docs canonicos:

- Implementacion/task: `docs/tasks/in-progress/TASK-1035-dashboard-floating-action-dock-shell-collision-model.md`
- Runtime primitive: `src/components/greenhouse/primitives/ShellFloatingActionDock.tsx`

Contrato:

- El dashboard layout debe montar acciones persistentes del viewport dentro de `ShellFloatingActionDock`.
- V1 consumers: `NexaFloatingButton` y `ScrollToTop`.
- El dock publica variables CSS canonicas:
  - `--gh-floating-actions-inline-offset`
  - `--gh-floating-actions-bottom`
  - `--gh-floating-actions-gap`
  - `--gh-floating-actions-trigger-size`
  - `--gh-floating-actions-stack-size`
  - `--gh-floating-actions-safe-inline-size`
  - `--gh-floating-actions-safe-block-size`
- Sticky footers/action bars que puedan quedar tapados por acciones globales deben reservar espacio con `--gh-floating-actions-safe-inline-size` o `--gh-floating-actions-safe-block-size`, no con hardcodes locales.
- Este dock cubre acciones persistentes del viewport. No reemplaza `GreenhouseFloatingSurface` (`TASK-1033`) para popovers/tooltips/menus anclados, ni `AdaptiveSidecar` para carriles contextuales full-height, ni `Dialog` para decisiones destructivas/legales/financieras.
- Mobile debe respetar `env(safe-area-inset-bottom)` y mantener el fallback drawer de los consumers que lo requieran.
- Toda accion persistente nueva debe declarar si pertenece al dock; no puede agregar otro fixed bottom-right global sin revisar el collision model.


## Delta 2026-06-06b — Greenhouse Floating Surface

Greenhouse adopta **Floating UI** como engine canonico para superficies contextuales ancladas: popovers, menus, rich tooltips, evidence peeks, inline editors, validation bubbles y command previews.

Docs canonicos:

- ADR: `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- Implementacion futura: `docs/tasks/to-do/TASK-1033-greenhouse-floating-surface-primitive.md`

Contrato:

- Floating UI es engine interno de posicionamiento; product views deben consumir primitives Greenhouse, no importar `@floating-ui/react` ad-hoc.
- Primitive futura: `GreenhouseFloatingSurface`, exportada desde `@/components/greenhouse/primitives`.
- V1 variants oficiales: `richTooltip`, `actionMenu`, `evidencePeek`, `inlineEditor`, `validationBubble`, `commandPreview`.
- Kinds semanticos como `costProvenance`, `rowActions`, `fieldValidation`, `commandResultPreview` deben resolver a una variant antes de decidir role, foco, dismissal y density.
- Defaults canonicos: `autoUpdate`, `offset(8)`, `flip({ fallbackAxisSideDirection: 'end' })`, `shift({ padding: 16 })`, `FloatingPortal`, `FloatingFocusManager modal={false}`, `useDismiss`, `useRole`, `useInteractions`.
- Floating Surface cubre UI anclada, transiente y contextual. Para carriles full-height usar `AdaptiveSidecar`; para destructivo/legal/financiero/maker-checker usar `Dialog`; para workflows largos usar sidecar/drawer/stepper segun dominio.
- Toda adopcion visible debe verificar keyboard, Escape/outside dismissal, focus return, collision near viewport edge y scroll containment con tests + GVC.


## Delta 2026-06-06 — Primitive + Variants + Kinds methodology

Greenhouse adopta **Primitive + Variants + Kinds** como metodologia canonica para desarrollar UI reusable de producto.

Docs canonicos:

- ADR: `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- Product UI operating model: `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`

Contrato:

- **Primitive**: contrato estable de implementacion. Owns layout, accesibilidad, responsive fallback, motion, shell integration, state plumbing y hooks GVC.
- **Variant**: modo funcional oficial. Cambia comportamiento, densidad, estado, footer/actions y microinteracciones. No es skin visual.
- **Kind**: caso semantico del consumidor. Puede ser dominio/workflow/alias legacy, pero debe resolver a una variant oficial antes de decidir layout o behavior.
- Canonical shape: `<Primitive variant='inspector' kind='contractReview' />`.
- Nuevas primitives o ampliaciones de primitives deben declarar sus variants oficiales, mapear kinds relevantes y validar cada variant con GVC cuando la UI sea visible.
- No crear familias paralelas (`FooDrawer`, `FooInspector`, `FooAssistant`) si una primitive + variants cubre el problema.
- No introducir variants que solo cambian color/radius/icono.


## Delta 2026-06-05 — Adaptive Sidecar UI Platform

Greenhouse adopta **Adaptive Sidecar** como capacidad UI platform canonica para superficies contextuales que deben convivir con el flujo principal: Nexa/assistant, inspectores, review panels, previews y formularios contextuales de bajo riesgo. Nexa es un consumidor posible, no el owner del patron.

Docs canonicos:

- ADR: `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`
- Arquitectura: `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`
- Implementacion: `docs/tasks/in-progress/TASK-1028-adaptive-sidecar-ui-platform.md`

Contratos:

- Primitive canonica: `AdaptiveSidecarLayout` + `ContextualSidecar` + `adaptive-sidecar-controller`, exportados desde `@/components/greenhouse/primitives`.
- Desktop preferente: sidecar in-flow que reserva espacio y hace reflow del main content.
- Mobile/tablet: Drawer temporal con focus trap.
- Sidecar in-flow no es modal: no usar `role='dialog'` ni `aria-modal='true'`.
- Idempotencia: usar `reduceAdaptiveSidecarState()` para open/close/dirty/replace cuando el consumer tenga estado local; dirty close/replacement se bloquean salvo `force`.
- Layout enterprise: lanes desktop deben ocupar el alto util del canvas de trabajo, no el alto de una card aislada; usar `minHeight` y medir ancho real del contenedor.
- Dialog modal sigue siendo obligatorio para confirmaciones destructivas, irreversibles, legales, financieras o maker-checker.
- La sidecar no implementa business logic; consume primitives/readers/commands/API canonicos y preserva Full API parity.
- La primitive debe validar multiples variants: assistant, inspector, form, preview y review, con al menos un camino no-Nexa.
- Bajo la metodologia Primitive + Variants + Kinds, Adaptive Sidecar tiene 6 variants oficiales: `inspector`, `composer`, `assistant`, `reconciler`, `evidence` y `runbook`. Kinds como `form`, `review`, `preview`, reconciliacion, procedencia/evidencia o ejecucion guiada son casos semanticos que deben mapear a una variant oficial antes de comportamiento/chrome.
- V1 no requiere libreria nueva de motion: usar CSS/MUI transitions, `@/libs/FramerMotion`, View Transition helpers existentes y GSAP solo para excepciones avanzadas.
- Toda adopcion debe declarar URL mode (`ephemeral`/`addressable`), Back behavior, collision model, dirty guard, scroll containment, AI redaction si aplica e instrumentation hooks.
- Toda adopcion runtime requiere GVC desktop closed/open + mobile temporary mode.


## Delta 2026-06-02 — `MetricTrendCard` primitive (KPI trend chart reutilizable)

`MetricTrendCard` (`src/components/greenhouse/primitives/MetricTrendCard.tsx`,
exportado desde el barrel `@/components/greenhouse/primitives`) es la primitive
canónica para mostrar una métrica con su **tendencia month-over-month** en una
card. Es **data-agnostic**: recibe props genéricas, no depende de ningún dominio
(ICO, finanzas, etc.) → reutilizable para cualquier serie temporal.

**Por qué Recharts y no ApexCharts**: para sparklines en KPI cards la política de
charts sanciona Recharts (`docs/tasks/to-do/TASK-518`). Además su `<Tooltip>` es
React-event-driven → hoverable, keyboard-reachable y **verificable por GVC**,
mientras que el tooltip SVG de ApexCharts no se dispara con eventos sintéticos
(Playwright/GVC) por el check de `interactionModality`. (`StatsWithAreaChart`
sigue siendo el sparkline Apex **decorativo sin tooltip**; `MetricTrendCard` es la
trend card **funcional** con valores on-hover.)

**API**:

```tsx
import { MetricTrendCard } from '@/components/greenhouse/primitives'

<MetricTrendCard
  title='OTD%'                                   // código de métrica (prominente, h5)
  metricName='On-Time Delivery'                  // nombre completo (gris, al lado)
  periodLabel='Mensual · May 2026'               // cadencia + período explícito
  value={100}                                    // hero (mes ancla)
  series={[{ label: 'Feb', value: 98.2 }, /* … */]}  // oldest → newest, value|null
  tone='success'                                 // success | warning | error (semáforo)
  format='percentage'                            // percentage | integer | decimal
  deltaUnit='pts'
  menuOptions={[/* OptionMenu items */]}         // 3-dot opcional
  dataCapture='person-trend-otd'                 // hook GVC opcional
/>
```

**Contratos canónicos**:

- **Tipografía** (TASK-566): `kpiValue` + tabular-nums para el número; Poppins solo display h1–h4; nunca hardcodear font-family.
- **Color = semáforo real** (`tone`) y **nunca el único signal**: valor + chip de delta con flecha + tooltip + tabla sr-only. La línea usa el shade `.dark` para cumplir WCAG 1.4.11 (3:1).
- **Layout edge-to-edge**: la línea/área llega a los bordes vía edge-anchors invisibles (x=0/x=1), mientras los dots y los labels de mes quedan inset y alineados (los markers no tocan las puntas, los labels no se pegan al borde).
- **a11y**: `role='img'` + aria-label en el plot + `<table>` visually-hidden (fallback canónico de charts).
- **Microinteracciones reduced-motion aware**: draw-in del área on mount, tooltip + crosshair + active marker on hover, hover-lift + accent border, count-up del número (`AnimatedCounter`).

**Reglas duras**:

- **NUNCA** re-implementar una KPI trend card con `Box` + chart propio. Usar `MetricTrendCard`.
- **NUNCA** pasar el tipo `ThresholdZone` de ICO directo: mapealo a `tone` (`success/warning/error`) en el consumer — la primitive es data-agnostic.
- **NUNCA** derivar el `tone` de un período distinto al que muestra el hero (bug class GVC: el color debe salir del valor mostrado, no del mes en curso).

**Verificación GVC**: escenario `person-activity-trend-microinteractions` (`scripts/frontend/scenarios/`) captura tooltip OTD/FTR, hover-lift y semáforo. **Primer consumer**: Person 360 → Activity (`PersonActivityTab.tsx`), OTD%/FTR% month-over-month.


## Delta 2026-05-08 — Organization Workspace Shell (TASK-612)

Materializa el contrato canónico shell-vs-content (§4.5 spec
`GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`) que TASK-611 dejó como
foundation. Patrón reusable por múltiples entrypoints organization-first
(Agency hoy, Finance via TASK-613, futuros entrypoints).

**Componentes nuevos** (`src/components/greenhouse/organization-workspace/`):

- `OrganizationWorkspaceShell.tsx` — chrome-only client component. Renderiza
  header (logo + name + status chip + breadcrumb + admin actions slot), KPI
  strip 4 cards (Revenue / Margen bruto / Equipo / Spaces), tab container
  (consume `projection.visibleTabs` + `activeFacet` controlled), drawer slot.
  Render-prop API: `<OrganizationWorkspaceShell {...} >{(facet, ctx) => ...}</...>`.
  **NO renderiza facet content** — ese es responsabilidad del children.
  Degraded mode honest cuando `projection.degradedMode=true`: 3 reasons
  enumerados con copy es-CL tuteo, sin tabs ni acciones.
- `FacetContentRouter.tsx` — registry lazy-loaded de los 9 facets canónicos
  via `dynamic(() => import('@/views/greenhouse/organizations/facets/<Name>Facet'),
  { ssr: false })`. Suspense fallback con label es-CL. Defense-in-depth guard
  contra facets desconocidos.
- `types.ts` — `FacetContentProps` (organizationId, entrypointContext,
  relationship, fieldRedactions[facet], projection completa read-only),
  `OrganizationWorkspaceHeader`, `OrganizationWorkspaceKpis`. Re-exports de
  TASK-611 projection types.

**Facet content components** (`src/views/greenhouse/organizations/facets/`):

6 wrapping facets que consumen `useOrganizationDetail` hook + delegan a tabs
legacy intactos (cero modificación a los tabs originales):

- `IdentityFacet` → wraps `OrganizationIntegrationsTab`
- `SpacesFacet` → tabla de `OrganizationSpace[]`
- `TeamFacet` → wraps `OrganizationPeopleTab + OrganizationProjectsTab`
- `EconomicsFacet` → wraps `OrganizationEconomicsTab`
- `DeliveryFacet` → wraps `OrganizationIcoTab + OrganizationOverviewTab`
- `FinanceFacet` → wraps `OrganizationFinanceTab`

3 honest empty-state facets (V2 wireará vista dedicada):

- `CrmFacet`, `ServicesFacet`, `StaffAugFacet` — cada uno renderiza
  `<FacetEmptyState>` con icon + título + descripción es-CL via
  `GH_ORGANIZATION_WORKSPACE.facets.empty.*`.

**Rollout flag platform extension** (TASK-612 Slice 4):

- Migration `20260508132302091_task-612-extend-home-rollout-flag-keys-workspace-shell.sql`:
  extiende `home_rollout_flags_key_check` para incluir
  `organization_workspace_shell_agency` + `organization_workspace_shell_finance`.
  Seed inicial global=FALSE (staged rollout).
- Helper canónico `src/lib/workspace-rollout/index.ts`:
  `isWorkspaceShellEnabledForSubject(subject, scope: 'agency' | 'finance')`.
  Wrappea `resolveHomeRolloutFlag` con el flag_key correspondiente. Server-only.
  Cache TTL 30s + scope precedence heredados de TASK-780.

**Decisión arquitectónica V1**: extender `home_rollout_flags` CHECK en lugar
de generalizar a `feature_rollout_flags` separada. Cuando emerja una 4a flag
fuera del scope home/workspace, evaluar como follow-up TASK derivada. Patrón
source: TASK-611 V1.1 que difiere generalizaciones hasta que duela.

**Agency adoption (Slice 5)**:

- `src/app/(dashboard)/agency/organizations/[id]/page.tsx` reescrito
  server-side: requireServerSession + isWorkspaceShellEnabledForSubject deciden
  V2 vs legacy. Si V2 → resolveOrganizationWorkspaceProjection (TASK-611) +
  render `<AgencyOrganizationWorkspaceClient>`. Si V1 → render legacy
  `<OrganizationView>`. Resilient default: flag falla → fallback legacy.
- `AgencyOrganizationWorkspaceClient.tsx` ('use client'): wrapper que monta
  shell + FacetContentRouter, sync URL `?facet=` deep-link, fetch detail/KPIs
  mirror legacy pattern, AdminActions wireados (HubSpot sync + Edit), drawer
  slot wired.

**Hard rules canonizadas**:

- **NUNCA** renderizar contenido específico de facet dentro del shell. Render-prop
  o registry — siempre.
- **NUNCA** consumir `projection.degradedMode` en consumers downstream sin honest
  copy. La projection ya distingue 3 reasons enumerados; el shell mismo trae el
  copy es-CL tuteo via `GH_ORGANIZATION_WORKSPACE.shell.degraded.reasons`.
- **NUNCA** computar visibility de facet en cliente. La projection es server-only
  (TASK-611) y se pasa al shell ya resuelto.
- **NUNCA** branchear UI por `projection.relationship.kind` inline. La projection
  ya filtró — el shell solo lee `visibleFacets` / `allowedActions`.
- **NUNCA** asumir que un facet siempre tendrá vista dedicada. Cuando emerja un
  facet sin contenido aún, render `<FacetEmptyState>` honest, NO blank.
- **SIEMPRE** que un nuevo entrypoint organization-first emerja, reusar el shell
  junto con `FacetContentRouter` via `entrypointContext`. Cero composición ad-hoc.

**Spec canónica**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`
V1.1 (Delta 2026-05-08 recalibración pre-execution).


## Delta 2026-05-06c — TASK-430 i18n runtime activation

El runtime i18n del App Router ya está activo.

Artefactos canónicos:

- `next.config.ts` compone `next-intl/plugin` con `withSentryConfig`.
- `src/i18n/request.ts` es el request config de `next-intl`.
- `src/i18n/resolve-locale.ts` resuelve locale con cookie `gh_locale`, header `Accept-Language` y fallback `es-CL`.
- `src/i18n/messages.ts` expone messages shared serializables para `NextIntlClientProvider`; no serializa funciones de `emails` ni `time`.
- `src/components/Providers.tsx` envuelve el portal con `NextIntlClientProvider`.
- `src/app/layout.tsx` usa el locale efectivo en `<html lang>`.
- `src/config/greenhouse-navigation-copy.ts` entrega navegación de shell en `es-CL`/`en-US` sin mover product marks ni rutas.
- `src/lib/copy/dictionaries/en-US/*` contiene traducciones reales para `actions`, `states`, `loading`, `empty`, `months`, `aria`, `errors`, `feedback` y `time`.

Reglas nuevas:

- No crear `middleware.ts` para i18n del portal privado.
- No agregar locale prefixes a rutas privadas ni APIs.
- Consumers nuevos que necesiten locale runtime deben usar `next-intl` o helpers bajo `src/i18n/*`; consumers legacy pueden seguir con `getMicrocopy()` hasta su rollout.
- No pasar `getMicrocopy(locale)` completo como messages al cliente: el dictionary contiene funciones en `emails` y `time`.
- Emails y background jobs siguen fuera del provider App Router; se mantienen en `src/lib/email/locale-resolver.ts` + dictionaries/core APIs hasta su rollout.
- `TASK-431` sigue siendo el owner de persistencia user/tenant y de exponer `effectiveLocale` en sesión.

Access model: sin cambios en `routeGroups`, `views`, `entitlements` ni startup policy.


## Delta 2026-05-06b — TASK-428 i18n architecture decision

La arquitectura i18n canónica vive en [`GREENHOUSE_I18N_ARCHITECTURE_V1.md`](./GREENHOUSE_I18N_ARCHITECTURE_V1.md).

Decisiones vigentes:

- `next-intl` es la librería elegida para el runtime App Router.
- El portal privado mantiene URLs sin prefijo de locale por defecto; el locale se resuelve por sesión/cookie/header y se aplica por provider/layout.
- Prefixes de locale quedan reservados para rutas públicas, SEO o entrypoints localizados explícitos. No se aplican a `/api/*`, NextAuth callbacks ni staging automation.
- `es-CL` sigue siendo default; `en-US` es el primer locale de activación; `pt-BR` queda planned first-class detrás de cobertura de dictionary y validación comercial.
- `src/lib/format/` sigue siendo la primitive canónica para fechas, moneda, números, porcentajes y pluralización visible. i18n no reemplaza TASK-429.
- React Email y background jobs no dependen del provider App Router; consumen dictionaries/core APIs y el bridge `src/lib/email/locale-resolver.ts`.
- TASK-431 debe normalizar/absorber `greenhouse_core.client_users.locale` legacy antes de materializar `identity_profiles.preferred_locale` o tenant defaults.

Access model: sin cambios en `routeGroups`, `views`, `entitlements` ni startup policy. Locale es preferencia de presentación, no autorización.


## Delta 2026-05-06 — TASK-811 nomenclature domain microcopy trim

`src/config/greenhouse-nomenclature.ts` deja de ser el contenedor de domain microcopy. Su contrato activo queda acotado a:

- navegación y labels institucionales de shell (`GH_CLIENT_NAV`, `GH_INTERNAL_NAV`, `GH_*_NAV`)
- product nomenclature estable (`GH_NEXA`, `GH_PIPELINE_COMMERCIAL`)
- tokens visuales transicionales (`GH_COLORS`, out of scope de TASK-811 hasta su absorción final en theme)

El microcopy reutilizable de dominios vive ahora en módulos type-safe bajo `src/lib/copy/`:

| Módulo | Exports |
| --- | --- |
| `src/lib/copy/agency.ts` | `GH_AGENCY` |
| `src/lib/copy/client-portal.ts` | `GH_LABELS`, `GH_TEAM`, `GH_MESSAGES` |
| `src/lib/copy/admin.ts` | `GH_INTERNAL_MESSAGES` |
| `src/lib/copy/pricing.ts` | `GH_PRICING`, `GH_PRICING_GOVERNANCE` |
| `src/lib/copy/workforce.ts` | `GH_SKILLS_CERTS`, `GH_TALENT_DISCOVERY`, `GH_CLIENT_TALENT` |
| `src/lib/copy/finance.ts` | `GH_MRR_ARR_DASHBOARD` |
| `src/lib/copy/payroll.ts` | `GH_PAYROLL_PROJECTED_ARIA` |

Reglas nuevas:

- No agregar nuevo domain microcopy a `greenhouse-nomenclature.ts`.
- Si una surface necesita copy de dominio reutilizado en varias superficies, crear o extender un módulo domain-specific dentro de `src/lib/copy/`.
- Si el texto es CTA/estado/loading/empty/aria/mes shared, usar `getMicrocopy()` y sus namespaces existentes.
- Si el texto es único de una pantalla, puede vivir cerca del dominio, pero no debe duplicar shared copy.
- `GH_COMPENSATION` fue eliminado por orphan real (0 importers runtime).

Guardrail runtime/mockup:

- Una ruta o surface runtime no debe importar módulos bajo `/mockup/`.
- Si una experiencia aprobada debe promocionarse a runtime, extraer primero un shell compartido fuera de `/mockup/`; el mockup importa ese shell con datos/copy de mockup y el runtime lo importa con datos/copy productivos.
- ESLint bloquea regresiones con `greenhouse/no-runtime-mockup-import`.


## Delta 2026-05-07 — Operational UI primitives para dashboards y health surfaces

Las surfaces operativas que combinan KPIs, paneles de salud, señales, riesgos o runbooks deben reutilizar primitives compartidas antes de crear shells locales con `Box` + bordes + chips. La familia canónica vive en `src/components/greenhouse/primitives/`:

| Primitive | Uso |
| --- | --- |
| `OperationalPanel` | Secciones operativas con `Card + CardHeader + CardContent`, icon slot, acción y padding/radius del theme. |
| `MetricSummaryCard` | KPIs operativos con valor honesto, fallback textual para datos nulos, icon slot y badge de estado opcional. |
| `OperationalStatusBadge` | Badge pequeño para estados reales (`Estable`, `Sin muestra`, `Requiere revisión`); no reemplaza contenedores. |
| `OperationalSignalList` | Señales/riesgos/runbooks como lista o grid sobrio con padding interno suficiente, código técnico opcional y acción recomendada. |

Reglas:

- No crear mini-cards redondeadas dentro de panels cuando una lista operacional comunica mejor el estado.
- Full pill (`9999`) queda reservado para chips pequeños; contenedores grandes usan `theme.shape.customBorderRadius.*`.
- Copy visible de señales debe venir de `src/lib/copy/*` o del reader/adapter canonizado del dominio; no mezclar `steady/stale/outcome/threshold` visibles en runtime es-CL.
- Estados nulos no se renderizan como `0`, `0%` o `$0` salvo que el cero sea dato real confirmado.


## Delta 2026-05-05 — Quote Builder primitives extraction Sprint 3 (TASK-498)

El Quote Builder publicó 4 capacidades nuevas al registry canónico de primitives. Hoy las consume sólo el quote builder; mañana las consumen invoice builder, PO builder, contract builder, finiquito generator y cualquier entity-form que necesite el mismo chasis sticky-bottom + section accordion + card-header-with-badge + chip-strip overflow.

```
src/components/greenhouse/primitives/
├── EntitySummaryDock.tsx        # nuevo (TASK-498)
├── CardHeaderWithBadge.tsx      # nuevo (TASK-498)
├── FormSectionAccordion.tsx     # nuevo (TASK-498)
├── ContextChipStrip.tsx         # extendido (TASK-498)  — `overflowAfter` prop
├── …                            # primitives previos (TASK-487, TASK-505, TASK-507, TASK-509)
└── index.ts
```

### `EntitySummaryDock`

Generic sticky-bottom cockpit primitive. Chasis canónico de cualquier builder enterprise (quote, invoice, purchase order, contract, finiquito, statement of work). Layout 3-zona Grid 3/6/3 en md+, single-column en xs.

```tsx
import {
  EntitySummaryDock,
  TotalsLadder,
  type EntitySummaryDockSaveState
} from '@/components/greenhouse/primitives'

<EntitySummaryDock
  ariaLabel='Resumen de la cotización'
  saveState={{ kind: 'dirty', changeCount: 2 }}
  marginIndicator={{ classification: 'healthy', marginPct: 0.494, tierRange: null }}
  centerSlot={
    <TotalsLadder
      subtotal={2923500}
      factor={1.15}
      ivaAmount={558345}
      total={3921845}
      currency='CLP'
    />
  }
  emptyStateMessage='Agrega ítems para ver el total.' /* fallback cuando centerSlot=null */
  simulationError='Error al simular precios.'        /* opcional, alert top */
  primaryCta={{
    label: 'Guardar y emitir',
    onClick: () => handleSubmit(),
    iconClassName: 'tabler-file-check',
    loading: submitting,
    disabled: notReady,
    disabledReason: 'Faltan ítems en la cotización.'
  }}
  secondaryCta={{ label: 'Guardar borrador', onClick: () => handleDraft() }}
/>
```

Props clave:

- `centerSlot: ReactNode` — totales, KPIs, métricas. Cuando `null/undefined` y hay `emptyStateMessage`, se renderiza la leyenda con icono.
- `saveState`, `marginIndicator`, `leftSlotExtra` — composiciones declarativas de la zona izquierda. Usan los primitives existentes (`SaveStateIndicator`, `MarginHealthChip`).
- `primaryCta` / `secondaryCta` — objetos canónicos `{ label, onClick, loading?, disabled?, iconClassName?, disabledReason? }`. El primary CTA encapsula el patrón Tooltip-on-disabled + `aria-describedby` + visuallyHidden id.
- `simulationError: ReactNode | string | null` — Alert inline en la parte superior del dock.

A11y: `<aside role='status' aria-live='polite'>` consolidada en el root. Cuando `disabled && disabledReason`, el primary CTA se envuelve en Tooltip + `<span sx={visuallyHidden} id="${id}-cta-reason">` con la razón completa.

### `CardHeaderWithBadge`

Card header con title + badge inline. Pattern enterprise (Linear / Notion / Stripe Billing): identifica la sección y comunica scale (count) en un solo phrase visual.

```tsx
import { CardHeaderWithBadge } from '@/components/greenhouse/primitives'

<CardHeaderWithBadge
  title='Ítems de la cotización'
  badgeValue={draftLines.length}
  badgeColor={draftLines.length === 0 ? 'secondary' : 'primary'}
  subheader='Agrega ítems vendibles desde el catálogo o crea una línea manual.'
  avatarIcon='tabler-list-details'
  action={headerAction}
/>
```

Props:

- `title: string | ReactNode` — string compone canónicamente `<Stack>{h6}{badge}</Stack>`. ReactNode lo respeta tal cual y omite el badge default.
- `badgeValue: string | number` — valor stringificado para el chip.
- `badgeColor` (default `primary`), `badgeVariant` (default `tonal`), `badgeAriaLabel?` — control fino del chip.
- `subheader`, `avatarIcon`, `avatarIconColor`, `action` — passthrough estándar de `CardHeader`.

Reglas de uso: el consumer decide `badgeColor` semánticamente (no se deriva automáticamente de `count`).

### `FormSectionAccordion`

Accordion canónico para secciones de formulario colapsables. Aplica el patrón Greenhouse: border 1px divider + `customBorderRadius.lg`, suprime `:before` divider, mantiene márgenes consistentes en estado expanded.

```tsx
import { FormSectionAccordion } from '@/components/greenhouse/primitives'

<FormSectionAccordion
  id='quote-detail'
  title='Detalle y notas'
  iconClassName='tabler-notes'
  defaultExpanded={description.length > 0}
  summaryCount={attachments.length || null}
>
  <CustomTextField multiline label='Descripción' value={description} onChange={…} />
</FormSectionAccordion>
```

Props:

- `title`, `iconClassName?`, `defaultExpanded?`, `summaryCount?`, `summaryCountColor?`
- `expanded` + `onChange` para modo controlado
- `id` deriva ARIA bindings (`${id}-header` ↔ `${id}-content`)

### `ContextChipStrip` overflow extension

`ContextChipStrip` gana prop `overflowAfter?: number | null`. Cuando `Children.count(children) > overflowAfter`, renderiza inline solo los primeros N y agrupa el resto en un dropdown menu accionable por chip "+M más" — pattern de overflow de Linear / GitHub repo header / Stripe Billing filtros.

```tsx
import { ContextChipStrip, ContextChip } from '@/components/greenhouse/primitives'

<ContextChipStrip ariaLabel='Filtros de cotización' overflowAfter={6}>
  {fields.map(f => <ContextChip key={f.id} {...f} />)}
</ContextChipStrip>
```

Props nuevas:

- `overflowAfter?: number | null` — límite. `null/undefined` = comportamiento default (todos inline).
- `overflowMoreLabel?: string` — copy localizable. Default `'más'`.
- `overflowMenuAriaLabel?: string` — default `${ariaLabel} — opciones adicionales`.

A11y: el chip overflow tiene `aria-haspopup='menu' aria-expanded` + `aria-controls`. El menu usa `dense` MenuList con cada child en un `MenuItem` (preserva el rendering del child sin ripple).

### Migración Quote Builder (Slice 5)

- `QuoteSummaryDock` → adapter thin sobre `EntitySummaryDock`. Conserva la API pública (subtotal/factor/ivaAmount/total/addons/marginPct/saveState) y mapea a los slots genéricos. Cero cambio para el consumer (`QuoteBuilderShell`).
- `QuoteLineItemsEditor` (vista editable) → consume `CardHeaderWithBadge` directamente. La vista readonly permanece con `CardHeader` MUI por simplicidad (sin badge).
- `QuoteBuilderShell` → "Detalle y notas" Accordion inline reemplazado por `<FormSectionAccordion id='quote-detail' …>`.

Reusable platform-wide. Sin domain logic. Tokens canónicos (`customBorderRadius.lg`, `theme.palette.divider`, `theme.zIndex.appBar - 2`). Apto para Quote / Invoice / Purchase Order / Contract / Reconciliation Workbench / HR Profile / Settings.


## Delta 2026-05-04 — Quick Access Shortcuts Platform (TASK-553)

Tres capas canónicas reemplazan los arrays de shortcuts hardcodeados que vivían en `vertical/NavbarContent.tsx` y `horizontal/NavbarContent.tsx`. Home y header ahora resuelven shortcuts desde la misma fuente autorizada.

### Capas

| Capa | Fuente | Persistencia | Visibilidad |
|------|--------|--------------|-------------|
| **Recommended** | Top-N (default 4) ordenado por `audienceKey` desde `AUDIENCE_SHORTCUT_ORDER` | No | Filtrado por acceso real |
| **Available** | Catálogo completo filtrado por dual-plane gate | No | Drives flujo `+ Agregar acceso` |
| **Pinned** | `greenhouse_core.user_shortcut_pins` (per-user) | PG, CASCADE on user delete | Revalidado server-side en cada lectura |

### Componentes canónicos

- `src/lib/shortcuts/catalog.ts` — `CanonicalShortcut` + `SHORTCUT_CATALOG` (13 entradas iniciales) + `AUDIENCE_SHORTCUT_ORDER` per `HomeAudienceKey` + helpers `getShortcutByKey` / `isKnownShortcutKey`. Para registrar un shortcut nuevo, agregar entry acá. **NO hardcodear** arrays en componentes.
- `src/lib/shortcuts/resolver.ts` — `resolveAvailableShortcuts(subject)`, `resolveRecommendedShortcuts(subject, limit?)`, `validateShortcutAccess(subject, key)` (write-path boolean), `projectShortcutForHome(shortcut)` (legacy projection bridge para `HomeRecommendedShortcut`).
- `src/lib/shortcuts/pins-store.ts` — persistence helpers: `listUserShortcutPins`, `pinShortcut` (idempotent), `unpinShortcut` (idempotent), `reorderUserShortcutPins` (atomic), `listDistinctPinnedShortcutKeys` (signal helper).
- `src/components/layout/shared/ShortcutsDropdown.tsx` — self-contained header dropdown. `useSession` + lazy fetch en primer open. View mode (pinned o recommended fallback) + Add mode (available − pinned). Ya **no acepta props** — los `NavbarContent` lo renderizan vacío.

### Dual-plane access gate

Cada `CanonicalShortcut` declara como mínimo `module: GreenhouseEntitlementModule` (gate `canSeeModule`). Opcionalmente:

```ts
viewCode?: string                        // user.authorizedViews.includes(viewCode)
requiredCapability?: {                   // can(subject, capability, action, scope)
  capability: EntitlementCapabilityKey
  action: EntitlementAction
  scope?: EntitlementScope
}
```

Las tres dimensiones se AND-ean. La `validateShortcutAccess` retorna `false` para llaves desconocidas (catálogo retirado) y para cualquier fallo de plano.

### API canónica

| Method | Path | Propósito |
|--------|------|----------|
| GET    | `/api/me/shortcuts` | `{ recommended, available, pinned }` para el usuario actual |
| POST   | `/api/me/shortcuts` | Pin idempotente. Body: `{ shortcutKey }`. Valida acceso server-side |
| DELETE | `/api/me/shortcuts/[shortcutKey]` | Unpin idempotente (sin gate de acceso — un usuario puede siempre quitar lo que pineó) |
| PUT    | `/api/me/shortcuts/order` | Reorder atómico. Body: `{ orderedKeys: string[] }` |

Auth: `getServerAuthSession` + capability `home.shortcuts:read` + `validateShortcutAccess` server-side antes de cualquier write. Errores sanitizados con `redactErrorForResponse` + `captureWithDomain('home', ...)`.

### Reliability signal

`home.shortcuts.invalid_pins` (kind `drift`, severity `warning` si > 0). Detecta llaves pineadas que ya no existen en el catálogo TS. UX no se rompe (lectura las filtra), pero ops queda enterado del drift y puede limpiar / restaurar.

### Reglas duras

- **NUNCA** declarar shortcuts hardcodeados en un layout o NavbarContent. La fuente única es `src/lib/shortcuts/catalog.ts`.
- **NUNCA** decidir visibilidad de un shortcut desde el cliente. El cliente lee `/api/me/shortcuts` que ya devuelve solo lo autorizado.
- **NUNCA** persistir un pin sin pasar por `validateShortcutAccess` server-side. El POST handler lo enforce.
- **NUNCA** mostrar un shortcut pineado sin re-validar su acceso al render. El reader del API ya lo filtra; cualquier consumer alternativo (futuras superficies) debe pasar por el resolver.
- **NUNCA** mezclar el shape de header (`{key, label, subtitle, route, icon, module}`) con el legacy de Home (`{id, label, route, icon, module}`). Use `projectShortcutForHome` cuando necesite el shape legacy.
- Cuando emerja una surface nueva (Mi Greenhouse, command palette, settings personales) que necesite shortcuts adaptativos, debe consumir el resolver — no copiar el catálogo.


## Delta 2026-05-02 — Copy System Contract (TASK-265)

Toda string visible al usuario en Greenhouse EO vive en una de **dos capas canónicas**, separadas por propósito y locale-aware desde día uno. Cualquier hardcode en JSX es drift y será bloqueado por la rule ESLint `greenhouse/no-untokenized-copy` (modo `error` post cierre TASK-408).

### Las dos capas

| Capa | Path | Propósito | Locale-aware |
|---|---|---|---|
| **Product nomenclature** | `src/config/greenhouse-nomenclature.ts` | Lenguaje propio del producto: Pulse, Spaces, Ciclos, Mi Greenhouse, Torre de control. Navegación. Labels institucionales del shell. | No (es-CL only por design) |
| **Functional shared microcopy** | `src/lib/copy/` (TASK-265) | CTAs base, estados operativos, loading/processing, empty states, meses, aria-labels, errores genéricos, feedback toasts, tiempo relativo, copy institucional de emails. | Sí (`es-CL` default, `en-US` stub para TASK-266) |

### API pública del módulo de microcopy

Documentos operativos:

- Funcional: [`docs/documentation/plataforma/microcopy-shared-dictionary.md`](../documentation/plataforma/microcopy-shared-dictionary.md)
- Manual operativo: [`docs/manual-de-uso/plataforma/microcopy-shared-dictionary.md`](../manual-de-uso/plataforma/microcopy-shared-dictionary.md)

```ts
import { getMicrocopy } from '@/lib/copy'

const t = getMicrocopy() // default 'es-CL'

// CTAs
<Button>{t.actions.save}</Button>           // 'Guardar'
<Button variant='outlined'>{t.actions.cancel}</Button>  // 'Cancelar'

// Estados
<Chip label={t.states.pending} />           // 'Pendiente'
<Chip label={t.states.approved} />          // 'Aprobado'

// Loading
{isLoading && <Typography>{t.loading.saving}</Typography>}  // 'Guardando...'

// Empty states
<EmptyState
  title={t.empty.firstUseTitle}             // 'Aún no hay nada por aquí'
  hint={t.empty.firstUseHint}               // 'Empieza creando tu primer registro'
/>

// aria-labels
<IconButton aria-label={t.aria.closeDialog}>  {/* 'Cerrar diálogo' */}
  <i className='ri-close-line' />
</IconButton>

// Meses
const monthLabel = t.months.short[monthIndex] // 'Ene' .. 'Dic'
const fullMonth = t.months.long[monthIndex]   // 'Enero' .. 'Diciembre'

// Tiempo relativo (functions)
<span>{t.time.minutesAgo(5)}</span>          // 'Hace 5 minutos'
<span>{t.time.minutesAgo(1)}</span>          // 'Hace 1 minuto'

// Emails institucionales (TASK-408 Slice 0)
const subject = t.emails.subjects.payrollExport('Marzo 2026', 4)
```

### Decision tree (donde escribir copy nuevo)

```
¿Es product nomenclature (Pulse, Spaces, Ciclos, Mi Greenhouse, Torre de control)?
  → src/config/greenhouse-nomenclature.ts

¿Es navegación o label institucional del shell?
  → src/config/greenhouse-nomenclature.ts

¿Es subject/footer/copy institucional compartido de email o categoría de notificación?
  → src/lib/copy/dictionaries/es-CL/emails.ts (TASK-408)

¿Es microcopy funcional reusada en >3 surfaces (CTAs, estados, loading, empty, aria)?
  → src/lib/copy/dictionaries/es-CL/<namespace>.ts
  → Si namespace no existe, agregalo a types.ts + dictionaries/es-CL/index.ts

¿Es copy de dominio específico (e.g., un empty state propio de payroll)?
  → Cerca del dominio (helper o componente) pero PASA por skill greenhouse-ux-writing para validar tono.
```

### Error surfaces y variantes creativas

Las surfaces 404, 401, access denied, coming soon, maintenance y rutas no disponibles deben tratarse como microcopy funcional de producto, no como texto decorativo. La regla canonica es brand + recuperacion: el mensaje puede tener personalidad, pero siempre debe dejar claro que paso y que camino tomar.

Contrato:
- guardar variantes reutilizables en `src/lib/copy/dictionaries/<locale>/...` y tiparlas en `src/lib/copy/types.ts`
- usar 3 a 5 variantes curadas cuando la surface lo amerite; seleccionarlas una vez al entrar a la pantalla
- no rotar mensajes mientras el usuario lee ni cambiar CTAs por variante
- mantener estable la arquitectura de recuperacion: primary CTA, secondary CTA cuando aplique, aria-labels y semantica
- dividir mensajes largos en status, detalle y recuperacion cuando mejore escaneabilidad
- validar con GVC si cambia layout, jerarquia, personaje, microcopy visible o responsive

### Casos por tipo

**1. Product nomenclature** — `greenhouse-nomenclature.ts`

```ts
import { GH_NAVIGATION, GH_NEXA, GH_PRICING } from '@/config/greenhouse-nomenclature'

<MenuItem>{GH_NAVIGATION.spaces}</MenuItem>
```

**2. Shared microcopy** — `src/lib/copy/`

```tsx
import { getMicrocopy } from '@/lib/copy'

const t = getMicrocopy()

<TextField label='Nombre del proyecto' />  // ❌ drift — disparará la rule
<TextField label={t.actions.save} />        // ❌ drift semántico — el label NO es 'Guardar' acá
<TextField label={GH_NAVIGATION.projectName} />  // ✅ si es nomenclature
<TextField label='Nombre del proyecto' />  // ✅ válido si es domain-specific Y pasa por skill greenhouse-ux-writing
```

**3. Domain-specific copy** — cerca del dominio

```ts
// src/lib/payroll/copy.ts (ejemplo)
import type { ChileEmployeeKind } from './types'

export const PAYROLL_DOMAIN_COPY: Record<ChileEmployeeKind, string> = {
  dependent: 'Trabajador dependiente',
  honorarios: 'Boleta a honorarios',
  international: 'Colaborador internacional'
}
```

Esto es válido pero requiere review por skill `greenhouse-ux-writing` para tono.

### Reglas duras

- **NUNCA** duplicar texto entre `greenhouse-nomenclature.ts` y `src/lib/copy/`. Si una string es nomenclatura, vive solo en nomenclature; si es microcopy funcional, vive solo en copy.
- **NUNCA** importar `src/lib/copy/` con `import 'server-only'`. La capa debe ser usable client-side también.
- **NUNCA** agregar namespaces nuevos a `src/lib/copy/` sin que >3 surfaces los reusen.
- **NUNCA** escribir copy nuevo sin invocar la skill `greenhouse-ux-writing` para validar tono es-CL.
- **SIEMPRE** mantener paridad de claves entre todos los locales (`es-CL`, `en-US`). Cuando TASK-266 active i18n real, esa paridad permite traducción sin tocar consumers.

### Enforcement mecánico

ESLint rule `greenhouse/no-untokenized-copy` (TASK-265 Slice 5a) detecta:

| Pattern | Mensaje accionable |
|---|---|
| `aria-label='X'` literal | Use `getMicrocopy().aria.<key>` |
| `{ label: 'Pendiente' }` en status maps | Use `getMicrocopy().states.<key>` |
| `'Cargando...'` / `'Guardando...'` literales | Use `getMicrocopy().loading.<key>` |
| `'Sin datos'` / `'Sin resultados'` literales | Use `getMicrocopy().empty.<key>` |
| `label`/`placeholder`/`helperText`/`title`/`subtitle` literales en JSX | Use `getMicrocopy()` o `greenhouse-nomenclature.ts` |

Excluidos por scope: `src/components/theme/**`, `src/@core/**`, `src/app/global-error.tsx`, `src/app/public/**`, `src/emails/**`, `src/lib/finance/pdf/**`, tests.

Modo: `warn` durante TASK-265 + sweeps TASK-407/408. Promueve a `error` al cierre TASK-408.

### Delta 2026-05-06 — TASK-407 sweep shared shell/componentes

TASK-407 extendio el gate `greenhouse/no-untokenized-copy` para cubrir arrays de meses y CTAs JSX text, agrego `buildStatusMap()` en `src/lib/copy/` y migro el copy shared de `src/views`, `src/components` y `src/app` fuera de literals inline.

Estado canonico post-sweep:

- 0 warnings `greenhouse/no-untokenized-copy` en `src/views`, `src/components` y `src/app`.
- 0 disables de `greenhouse/no-untokenized-copy` en `src/`.
- Meses, CTAs base, aria-labels, empty states, secondary props compartidas y status maps reutilizables consumen `src/lib/copy/`.
- `TASK-408` mantiene ownership de notifications/emails y promueve la rule a `error` al cierre.

### Delta 2026-05-06 — TASK-408 Slice 0 emails foundation

TASK-408 Slice 0 agrega el namespace `emails` a `src/lib/copy/`, el helper server-side `src/lib/email/locale-resolver.ts` y snapshot baseline de los 17 templates React Email antes de migrar copy.

Reglas canonicas para emails:

- La personalizacion vive en `src/lib/email/tokens.ts` + el merge de `src/lib/email/delivery.ts`. No mover nombres, montos, periodos, cliente, links o unsubscribe al dictionary como valores fijos.
- El dictionary `emails` solo almacena copy institucional reusable: footer, disclaimers, labels y subject builders que reciben tokens como argumentos.
- Los callers siguen mandando contexto de negocio (`fullName`, `periodLabel`, `netTotal`, `clientName`, `shareUrl`, etc.). Durante la migracion, los snapshots deben probar que esos tokens siguen presentes.
- `resolveEmailLocale()` normaliza `es|en|es-CL|en-US` sin cambiar el contrato actual de templates (`locale?: 'es' | 'en'`).

### Delta 2026-05-06 — TASK-408 Slice 1 notification categories

`src/config/notification-categories.ts` mantiene ownership del contrato operativo de notificaciones: `code`, `defaultChannels`, `audience`, `priority` e `icon`. Desde Slice 1, el copy visible (`label`, `description`) vive en `getMicrocopy().emails.notificationCategories`.

Reglas canonicas:

- No cambiar `code` para migraciones de copy. Los codes conectan preferencias, dispatch, logs, projections, webhooks y consumidores downstream.
- No tocar `NotificationService`, outbox, event types, retries, webhooks ni `sendEmail` para migrar labels/descriptions.
- Toda categoria nueva debe agregar entrada en `EmailsCopy.notificationCategories`; `src/config/notification-categories.test.ts` valida paridad y metadata estable.
- Los accesos dinamicos deben pasar por `isNotificationCategoryCode()` antes de indexar el catalogo.
- `subjectKey` solo debe agregarse cuando exista un consumer activo y testeado. Metadata muerta en el catalogo introduce drift y no protege delivery.

### Delta 2026-05-06 — TASK-408 Slice 2A EmailLayout

`src/emails/components/EmailLayout.tsx` consume `getMicrocopy().emails.layout` para el shell institucional en español: `logoAlt`, `tagline`, `automatedDisclaimer` y `unsubscribe`.

Reglas canonicas:

- El shell puede leer copy institucional compartido, pero no debe resolver ni mutar tokens de personalizacion.
- `en` conserva fallback legacy mientras `en-US` siga siendo mirror de `es-CL`; no degradar correos internacionales para cumplir una migracion mecanica.
- `EmailButton` no debe crecer API de copy hasta que exista un consumer activo. Hoy recibe `children`; los CTAs de dominio se migran por template en Slice 3.
- Cualquier cambio al shell debe correr `src/emails/EmailTemplateBaseline.test.tsx` para proteger los 17 templates.

### Delta 2026-05-06 — TASK-408 Slice 3A template copy selector

`src/lib/email/template-copy.ts` introduce `selectEmailTemplateCopy(locale, platformCopy, legacyEnglishCopy)`.

Reglas canonicas:

- Mientras `en-US` sea mirror de `es-CL`, un template migrado debe usar dictionary para `es` y fallback legacy para `en`.
- El fallback `en` es temporal y local al template migrado; se retira cuando TASK-266 entregue dictionary `en-US` real.
- La primitive no toca delivery, subjects, URL generation, tokens ni render context. Solo selecciona copy.
- Cada template migrado debe mantener snapshot estable y cubrir su output en `EmailTemplateBaseline.test.tsx` o test focal equivalente.

### Coordinación con i18n (TASK-266)

`src/lib/copy/` está locale-aware desde día uno (`Locale = 'es-CL' | 'en-US'`). Cuando TASK-266 / TASK-430 active i18n real:

1. Traducir las claves en `src/lib/copy/dictionaries/en-US/<namespace>.ts` (hoy re-exporta es-CL como semilla)
2. Conectar `getMicrocopy(locale)` a la fuente de locale (sesión user, persistencia tenant per TASK-431)
3. La API pública NO cambia → consumers no reescriben nada

### Formatting Locale-Aware (TASK-429)

`src/lib/format/` es la primitive canónica para formateo visible y exportable:

Documentacion relacionada:

- Funcional: [`docs/documentation/plataforma/formateo-locale-aware.md`](../documentation/plataforma/formateo-locale-aware.md)
- Manual operativo: [`docs/manual-de-uso/plataforma/formateo-locale-aware.md`](../manual-de-uso/plataforma/formateo-locale-aware.md)

- `formatDate`, `formatDateTime`, `formatTime`, `formatISODateKey`
- `formatCurrency`, `formatAccountingCurrency`
- `formatNumber`, `formatInteger`, `formatPercent`
- `formatRelative`, `selectPlural`

Reglas:

- El locale default inicial es `es-CL`; `Locale` se reutiliza desde `src/lib/copy/types.ts` y acepta overrides BCP 47 para transiciones (`pt-BR`, etc.).
- La timezone operacional sigue siendo `America/Santiago`; no confundir locale de presentación con timezone de payroll/finance.
- Fechas date-only `YYYY-MM-DD` se formatean desde UTC noon para evitar drift de día.
- Horas visibles sin fecha deben usar `formatTime`, no `toLocaleTimeString` directo.
- Keys operacionales `YYYY-MM-DD` deben usar `formatISODateKey`, no `toISOString().slice(...)` ni `Intl.DateTimeFormat('en-CA')` inline.
- Monedas visibles deben pasar por `formatCurrency`; `formatAccountingCurrency` es opt-in para negative accounting.
- Los helpers aceptan tanto `formatDate(value, options, locale)` como el atajo `formatDate(value, locale)` cuando no se requieren opciones.
- No usar `new Intl.*` ni `toLocaleString` / `toLocaleDateString` / `toLocaleTimeString` directo en surfaces visibles. ESLint rule `greenhouse/no-raw-locale-formatting` corre en modo `warn` sobre `src/views`, `src/components` y `src/app`; el baseline del portal queda en 0 warnings desde el sweep 2026-05-06.

### Coordinación con Kortex (Slice 4 — exploratorio)

La separación capas (product nomenclature vs functional microcopy) habilita extracción futura del copy institucional reusable a un paquete compartible con Kortex sin arrastrar lenguaje de producto Greenhouse:

- **Reusable para Kortex** (cuando confirme consumo): `src/lib/copy/` (microcopy funcional shared) + capa institucional de `greenhouse-nomenclature.ts` (login, brand neutral, common actions, categorías genéricas).
- **NO reusable**: metáforas de producto Greenhouse, navegación específica, labels de módulos exclusivos (Pulse, Spaces, Ciclos, Mi Greenhouse, Torre de control).

Esta task (TASK-265) NO crea adapter ejecutable para Kortex; solo deja la separación conceptual y el namespace de microcopy listo para extracción cuando Kortex confirme roadmap de consumo.

### Foundation (TASK-265 entregables)

- `src/lib/copy/types.ts` — tipos canónicos (Locale, MicrocopyDictionary, namespaces)
- `src/lib/copy/dictionaries/es-CL/` — dictionary completo es-CL (9 namespaces seed)
- `src/lib/copy/dictionaries/en-US/` — stub (re-exporta es-CL hasta TASK-266)
- `src/lib/copy/index.ts` — API pública (`getMicrocopy`)
- `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs` — gate ESLint
- `~/.claude/skills/greenhouse-ux-writing/skill.md` — skill governance (tono, anti-patterns, decision tree)


## Delta 2026-05-01 — Operational Data Table Density Contract (TASK-743)

Toda tabla operativa con celdas editables inline o > 8 columnas vive bajo el contrato de densidad canonico. Resuelve el overflow horizontal contra `compactContentWidth: 1440` de manera declarativa, robusta y escalable.

- **Spec canonica**: [`GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`](./GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md).
- **Doc funcional**: `docs/documentation/plataforma/tablas-operativas.md`.
- **Primitivas**:
  - `src/components/greenhouse/data-table/density.ts` — tokens de las 3 densidades (`compact` / `comfortable` / `expanded`).
  - `src/components/greenhouse/data-table/useTableDensity.tsx` — hook + provider que resuelve densidad efectiva.
  - `src/components/greenhouse/data-table/DataTableShell.tsx` — wrapper canonico con container queries, sticky-first column, scroll fade.
  - `src/components/greenhouse/primitives/InlineNumericEditor.tsx` — primitiva editable canonica (reemplaza `BonusInput`).
- **Lint gate**: `greenhouse/no-raw-table-without-shell`.
- **Visual regression**: `e2e/visual/payroll-table-density.spec.ts`.

Reglas duras estan en `CLAUDE.md` y `AGENTS.md` (seccion "Operational Data Table Density Contract").


## Delta 2026-04-26b — ESLint 9 flat config (TASK-514)

Migramos `eslint 8.57.1` (legacy `.eslintrc.js`) a **`eslint 9.39.4` con flat config (`eslint.config.mjs`)**. ESLint 8 entró en maintenance mode en 2024; flat config es el default desde 2024 y todos los plugins modernos convergieron a él (`typescript-eslint 8.59`, `eslint-plugin-import 2.32`, `eslint-config-next 16`, `eslint-config-prettier 10`).

### Foundation

- `eslint.config.mjs` reemplaza a `.eslintrc.js` como **única fuente de configuración** del linter.
- Stack actualizado:
  - `eslint@9.39.4`
  - `@eslint/js@9.39.4`
  - `@eslint/eslintrc@^3.3.5` (FlatCompat — disponible para casos edge, no usado en producción).
  - `typescript-eslint@8.59.0` (metapackage flat-ready) + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`.
  - `eslint-config-next@16.2.4` (provee config flat nativo en `eslint-config-next/core-web-vitals`).
  - `eslint-plugin-import@2.32.0`, `eslint-config-prettier@10.1.8`, `eslint-import-resolver-typescript@4.4.4`.
- Scripts simplificados:
  - `"lint": "eslint ."` (drop `--ext` flag — flat config controla files vía `files` en cada bloque).
  - `"lint:fix": "eslint . --fix"`.

### Reglas custom preservadas 1:1

Las convenciones del repo siguen vigentes sin cambios semánticos:

- `padding-line-between-statements` (var/const/let → blank line; consts → multiline-block-like → blank line; etc.).
- `lines-around-comment` (comment block precedido por blank line; allowBlockStart, allowObjectStart, allowArrayStart).
- `newline-before-return`.
- `import/newline-after-import: { count: 1 }`.
- `import/order` con groups, pathGroups (`react`, `next/**`, `~/**` external before; `@/**` internal).
- `@typescript-eslint/consistent-type-imports: error`.
- `@typescript-eslint/no-unused-vars: error`.
- `jsx-a11y/alt-text`, `react/display-name`, `react/no-children-prop`, `@next/next/no-img-element`, `@next/next/no-page-custom-font`: off (legacy).

### Reglas explícitamente desactivadas (out-of-scope para esta migración)

`eslint-config-next 16` agrega el bundle del **React Compiler / React 19** que introduce reglas estrictas nuevas (pertenecientes a `react-hooks/*`):

- `react-hooks/set-state-in-effect`
- `react-hooks/incompatible-library`
- `react-hooks/refs`
- `react-hooks/preserve-manual-memoization`
- `react-hooks/immutability`
- `react-hooks/static-components`, `component-hook-factories`, `error-boundaries`, `gating`, `globals`, `purity`, `unsupported-syntax`, `use-memo`, `config`, `fbt`, `fire`, `todo`

Quedan **`off`** porque la spec exige migración 1:1 (mismo baseline pre/post). Adoptarlas requiere refactors per-componente coordinados — abrir task aparte cuando el equipo apunte al React Compiler.

`react-hooks/rules-of-hooks` y `react-hooks/exhaustive-deps` (las clásicas) siguen activas como antes.

`import/no-anonymous-default-export` también queda off (nuevo en `eslint-plugin-import 2.32` que dispara sobre `eslint.config.mjs` y otros bundlers config files).

### Composición del config flat

```js
// eslint.config.mjs (resumen)
export default [
  { ignores: [/* generated, vendored, docs, etc. */] },
  ...nextCoreWebVitals,           // Next 16 + react-hooks + jsx-a11y + import (registered)
  ...tseslint.configs.recommended, // typescript-eslint metapackage
  { rules: { /* convenciones del portal */ } },
  { files: ['**/*.ts', '**/*.tsx', 'src/iconify-bundle/**'], rules: { /* TS-only overrides */ } },
  prettierConfig                    // disable rules conflicting with prettier (last)
]
```

**Por qué NO se importa `eslint-plugin-import` directo**: `eslint-config-next/core-web-vitals` ya lo registra. Importarlo otra vez dispara `Cannot redefine plugin "import"`. Las reglas `import/*` (incluido `import/order` y `import/newline-after-import`) viven en el bloque de reglas custom y se evalúan correctamente porque el plugin ya está disponible.

### Files

- `package.json` — bump deps + scripts.
- `eslint.config.mjs` (NUEVO).
- `.eslintrc.js` — DELETED.

### Adopción

- Cualquier nuevo dev override va al objeto custom rules de `eslint.config.mjs` (no agregar archivos `.eslintrc.*` nuevos).
- Para overrides per-directorio, usar bloques flat con `files: ['src/foo/**']` + `rules: { ... }`.
- Para temporalmente silenciar una regla en un archivo concreto, mantener `// eslint-disable-next-line <rule>` (sin cambios — flat config respeta la sintaxis).


## Delta 2026-04-26 — Server state con React Query (TASK-513)

Adoptamos **`@tanstack/react-query` 5.x** como capa canónica de server state del portal. Es el cache layer estándar 2024-2026 (Vercel, Linear, Stripe, Ramp, Notion, Resend, shadcn). Reemplaza progresivamente el patrón `useState + useEffect + fetch` disperso por una cache global con invalidación coordinada, refetch on focus, dedup automático y devtools.

### Foundation

- **Mount canónico**: `src/components/providers/QueryClientProvider.tsx` instancia un `QueryClient` por árbol cliente y monta `ReactQueryDevtools` solo cuando `NODE_ENV !== 'production'`. Lo envuelve `src/components/Providers.tsx` adentro del `ThemeProvider`.
- **Defaults sanos**:
  - `staleTime: 30s` — evita refetch en cada mount.
  - `gcTime: 5min` — libera memoria pero conserva cache mientras navegamos.
  - `refetchOnWindowFocus: true` — vuelta al tab = datos frescos sin ceremonia.
  - `retry: 1` — segunda chance en errores transitorios sin spam.
  - `throwOnError: false` — los consumers renderizan su propio error UI con `query.error` (estilo del portal).
- **Devtools**: solo en development; botón en `bottom-left` para no chocar con el builder dock (top-right) ni con el sonner Toaster.

### Query keys factory

Todos los query keys viven en `src/lib/react-query/keys.ts` siguiendo la convención oficial de TanStack: tuplas tipadas `as const`, una rama por dominio (`finance`, `people`, ...), con `all`, `lists()`, `list(filters)`, `details()`, `detail(id)`. Consumers importan vía:

```ts
import { qk } from '@/lib/react-query'

useQuery({
  queryKey: qk.finance.quotes.list({ status: 'draft' }),
  queryFn: () => fetchQuotes({ status: 'draft' })
})

queryClient.invalidateQueries({ queryKey: qk.finance.quotes.all })
```

**Regla dura**: no inventar query keys ad-hoc en hooks de consumer. La invalidación coordinada depende de tener un solo lugar canónico donde se declaren los keys de cada recurso.

### Hooks canónicos (custom)

Cada recurso server-side tiene su hook custom en `src/hooks/use<Resource>.ts` que envuelve `useQuery` con su queryKey, queryFn y overrides apropiados de cache. Tres ejemplos shipping en V1:

| Hook | Endpoint | Override |
|---|---|---|
| `useQuotesList(filters)` | `/api/finance/quotes` | defaults |
| `usePricingConfig()` | `/api/finance/quotes/pricing/config` | `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false` (catalog data) |
| `usePeopleList()` | `/api/people` | defaults |

### Migration cheatsheet

Antes:

```tsx
const [data, setData] = useState<X | null>(null)
const [loading, setLoading] = useState(true)

const load = useCallback(async () => {
  const res = await fetch('/api/x')
  if (res.ok) setData(await res.json())
}, [])

useEffect(() => { void load(); setLoading(false) }, [load])
```

Después:

```tsx
import useX from '@/hooks/useX'

const { data, isPending: loading } = useX()
```

Mutaciones (crear, actualizar, borrar) invalidan el query desde el callback:

```tsx
const queryClient = useQueryClient()

await fetch('/api/x', { method: 'POST', ... })
void queryClient.invalidateQueries({ queryKey: qk.x.all })
```

### Reglas de adopción

- **No migrar todo de un golpe** — adopción es progresiva, slice por slice. Esta task ship 3 ejemplos y deja el patrón documentado.
- **Custom hook por recurso** — no exponer `useQuery` crudo en consumers. El custom hook centraliza el queryKey, queryFn, types y los overrides de cache que el recurso amerita.
- **Invalidación, no refetch manual** — al mutar un recurso, llamar `queryClient.invalidateQueries({ queryKey: qk.<resource>.all })` desde el `onSuccess` de la mutación (no via prop callback al child).
- **`isPending` cubre el "loading inicial"** — cuando ya hay data en cache, el query es "background refresh" y `isFetching` lo refleja sin tumbar el UI.
- **Errores en el consumer** — leer `query.error`; el provider mantiene `throwOnError: false` para no forzar Error Boundaries.
- **Para CRUD optimistic, usar `useMutation`** con `onMutate` + `onSettled` + `setQueryData` — patrón canónico de TanStack.
- **No reintroducir Redux Toolkit / RTK Query** — `@reduxjs/toolkit` y `react-redux` quedan installed pero unused (legacy del Vuexy starter); son candidatos a remover en un follow-up cuando se confirme que ningún flujo del portal los consume.

### Files

- `package.json` — add `@tanstack/react-query@^5.100.5` + `@tanstack/react-query-devtools@^5.100.5`.
- `src/components/providers/QueryClientProvider.tsx` (NUEVO).
- `src/components/Providers.tsx` — wrap children con QueryClientProvider.
- `src/lib/react-query/keys.ts` (NUEVO).
- `src/lib/react-query/index.ts` (NUEVO).
- `src/hooks/useQuotesList.ts` (NUEVO).
- `src/hooks/usePricingConfig.ts` (NUEVO).
- `src/hooks/usePeopleList.ts` (NUEVO).
- `src/views/greenhouse/finance/QuotesListView.tsx` — consume `useQuotesList`.
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` — consume `usePricingConfig`.
- `src/views/greenhouse/people/PeopleList.tsx` — consume `usePeopleList` + `invalidateQueries` desde `CreateMemberDrawer onSuccess`.

### Follow-ups documentados

- SSR hydration patterns (Next 16 App Router + react-query) cuando emerja un consumer que se beneficie del prefetch desde el server component.
- Audit y eventual remoción de `@reduxjs/toolkit` + `react-redux` del `package.json`.
- Migración progresiva del resto de fetches (~100+ lugares) en olas por dominio: finance, hr, agency, admin.
- `useMutation` canónico para los flujos save/issue del Quote Builder con optimistic updates.


## Delta 2026-04-25c — `react-toastify` → `sonner` (TASK-512)

Reemplazamos `react-toastify 11.0.5` por **sonner 2.0** como librería canónica de toasts del portal. Sonner es el estándar 2024-2026 que usan Vercel, Linear, Resend y shadcn: stack visual moderno (pinch effect tipo iOS notifications), bundle ~4 KB (vs ~30 KB de react-toastify), `toast.promise()` integrado, swipe dismiss en mobile, keyboard shortcut `Alt+T`, y theme bridge con CSS vars.

### Mount canónico

`src/components/Providers.tsx` monta `<Toaster />` una sola vez con la configuración global del portal:

```tsx
import { Toaster } from 'sonner'

<Toaster
  position='top-right'
  richColors
  closeButton
  theme='system'
  duration={4000}
/>
```

- `position='top-right'` preserva el placement convención del portal (mismo que tenía `react-toastify` desde antes).
- `richColors` activa el tinted background semántico (success, error, warning, info), alineado con la paleta usada en TASK-505 (summary dock primitives) y TASK-615 (quote builder).
- `closeButton` ofrece dismiss visible.
- `theme='system'` deja a sonner adoptar light/dark según `prefers-color-scheme`.
- `duration={4000}` es el default; consumers individuales sobreescriben con `duration: <ms>` cuando necesitan más o menos tiempo.

### API consumer (95% compatible)

Los 60 consumers existentes solo cambiaron la línea de import:

```diff
- import { toast } from 'react-toastify'
+ import { toast } from 'sonner'
```

`toast.success`, `toast.error`, `toast.info`, `toast.warning` y `toast(...)` siguen funcionando idénticos. Diferencias relevantes con la API de `react-toastify`:

- **`autoClose: <ms>` → `duration: <ms>`** — sonner usa `duration`. Cinco callsites en `QuoteBuilderShell.tsx` migrados.
- **`position` por toast NO existe** — la posición se define globalmente en `<Toaster />`. Los cinco overrides `position: 'bottom-right'` se eliminaron; toda toast usa el placement global `top-right`.
- **`hideProgressBar` no aplica** — sonner no tiene barra de progreso.
- **`toast.promise(fn, { loading, success, error })`** existe nativo en sonner — preferirlo a flujos manuales loading/success/error cuando el async work tiene latencia visible.
- **`toast.dismiss(id?)`** y **`toast.loading(...)`** existen — usar para cancelaciones o estados pendientes.

### Reglas

- **Nunca instalar otro toast container** — el mount global de Providers.tsx es el único.
- **Nunca importar de `react-toastify`** — el package fue removido de `package.json` (TASK-512).
- **Para tests**, mockear `'sonner'` en lugar de `'react-toastify'`:
  ```ts
  vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }
  }))
  ```
- **Theme integration**: sonner respeta CSS vars. No reintroducir wrapper styled como el viejo `AppReactToastify` — `richColors` cubre el caso semántico y el resto fluye con el `<Toaster theme='system' />`.
- **Custom JSX dentro del toast**: `toast.message('título', { description: 'cuerpo' })` reemplaza al `toast.info(<div>...)` con JSX. Evitar JSX inline en toasts.

### Files

- `package.json` — drop `react-toastify@11.0.5`, add `sonner@^2.0.7`.
- `src/components/Providers.tsx` — mount Toaster sonner.
- `src/libs/styles/AppReactToastify.tsx` — DELETED.
- 59 archivos de `src/views/*` — codemod del import.
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` — `autoClose` → `duration`, drop `position` (5 callsites).
- `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx` — mock `'sonner'`.


## Delta 2026-04-25 — Navigation transitions con View Transitions API (TASK-525)

Activamos la **CSS View Transitions API** nativa del browser para transiciones de ruta same-document en App Router. Cero bundle adicional — es API del browser. Es el patrón 2024-2026 que usan Vercel Geist, Astro, Next docs y GitHub Issues redesign.

### Activación

- `next.config.ts` declara `experimental: { viewTransition: true }`. Next 16 expone el flag a App Router para que las navegaciones same-document corran dentro de `document.startViewTransition()` automáticamente.
- Browser support: Chrome 111+ / Edge 111+ / Safari 18+. Firefox sin soporte aún → cae a navegación instantánea sin error.
- `prefers-reduced-motion: reduce` está honrado en dos capas:
  1. `globals.css` aplica `animation: none !important` a todos los `::view-transition-*` cuando reduced-motion está activo.
  2. El helper `startViewTransition` también revisa `matchMedia` antes de invocar al browser, así callers con update functions costosas no pagan ni el snapshot.

### Helper canónico

`src/lib/motion/view-transition.ts` exporta `startViewTransition(update)`:

```ts
import { startViewTransition } from '@/lib/motion/view-transition'

await startViewTransition(() => {
  router.push(`/finance/quotes/${quoteId}`)
})
```

- SSR-safe: detecta `typeof document === 'undefined'`.
- Feature-detection: si `document.startViewTransition` no existe, ejecuta `update()` directo.
- Reduced-motion: short-circuit antes de tomar el snapshot.
- Errores en `update` no propagan al caller (los swallow para no romper la navegación).

### Hook + Link drop-in

- `src/hooks/useViewTransitionRouter.ts` — wrapper de `useRouter()` que envuelve `push`, `replace` y `back` con el helper. Drop-in para handlers programáticos (`onClick={() => router.push(...)}`).
- `src/components/greenhouse/motion/ViewTransitionLink.tsx` — drop-in para `next/link` que intercepta el click izquierdo simple y delega a `router.push` dentro del transition. Modifier-clicks (cmd/ctrl/shift/middle), `target=_blank` y hrefs no-string caen al comportamiento Link nativo.

### Patterns implementados v1

1. **Finance quotes list → detail**: `QuotesListView` aplica `viewTransitionName: 'quote-identity-{quoteId}'` al número de cotización y `quote-client-{quoteId}` al nombre del cliente; `QuoteDetailView` aplica los mismos nombres a su header. El número y el cliente "viajan" de la fila al header.
2. **Quote detail → edit mode**: el botón "Editar" pasa por `useViewTransitionRouter().push` para que el header del detalle se transforme suavemente en el shell del builder.
3. **People list → detail**: `PeopleListTable` aplica `person-avatar-{memberId}` y `person-identity-{memberId}` al avatar 38px y al nombre; `PersonProfileHeader` reusa los mismos nombres en el avatar 80px y el `Typography variant='h5'` del nombre. El browser hace el morph cross-size automáticamente.

### Reglas de adopción

- **No global**: aplicar `viewTransitionName` solo en patterns donde la continuidad visual aporta — list→detail con identidad compartida, header→edit, modal/drawer open. Cualquier click no necesita transition.
- **Nombres únicos**: `viewTransitionName` debe ser único en el documento al momento del snapshot. Usar siempre `{kind}-{id}` con un identificador estable.
- **Programmatic nav**: usar `useViewTransitionRouter` cuando la fila/CTA navega por `onClick={() => router.push(...)}`.
- **Declarative nav**: cambiar `next/link` por `ViewTransitionLink` solo cuando el destino tiene un elemento con `viewTransitionName` que matchee el origen. Para Links sin morph queda `next/link`.
- **No reabrir framer-motion** para esto: View Transitions actúa al nivel del documento; framer-motion sigue siendo válido para microinteracciones dentro del DOM ya nuevo (counters, layout transitions internas).

### Files

- `next.config.ts` — flag `experimental.viewTransition`.
- `src/lib/motion/view-transition.ts` — helper.
- `src/hooks/useViewTransitionRouter.ts` — hook.
- `src/components/greenhouse/motion/ViewTransitionLink.tsx` — Link drop-in.
- `src/app/globals.css` — keyframes `greenhouse-view-transition-fade-{in,out}` + reduced-motion guard.


## Delta 2026-06-06 — Greenhouse Floating Surface primitive (TASK-1033)

La capa de plataforma que el Delta 2026-04-20b anticipaba (Floating UI como engine, wrapper Greenhouse pendiente) ya existe. El contrato Floating UI dejó de vivir duplicado en cada consumer: ahora hay una primitive canónica.

ADR: `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md` (Accepted 2026-06-06).

### Qué se shippeó

- **`GreenhouseFloatingSurface`** (`@/components/greenhouse/primitives`) — primitive client-side sobre `@floating-ui/react`. Centraliza el contrato canónico (`autoUpdate` + `offset` + `flip({ fallbackAxisSideDirection: 'end' })` + `shift({ padding: 16 })` + `FloatingPortal` + `FloatingFocusManager modal={false}` + `useDismiss` + `useRole`). Open controlled/uncontrolled, render-props `anchor`/`content`, hooks GVC (`data-gh-floating-surface`, `data-gh-floating-anchor`, `data-state`, `data-capture`), reduced-motion.
- **`floating-surface-controller.ts`** — fuente única (pura, testeable) de los unions `variant`/`kind`, el contrato congelado por variant (`FLOATING_SURFACE_VARIANT_CONFIG`) y el resolver idempotente `resolveFloatingSurfaceVariant({ variant?, kind? })`.
- **6 variants oficiales V1** con contrato de a11y por variant:

  | variant | role | interaction | focus managed | outside dismiss | placement |
  |---|---|---|---|---|---|
  | `richTooltip` | tooltip | hover + focus | no | sí | top |
  | `actionMenu` | menu | click | sí (+ return) | sí | bottom-start |
  | `evidencePeek` | dialog | click | sí (+ return) | sí | bottom-start |
  | `inlineEditor` | dialog | click | sí (+ return) | **no** (dirty seguro) | bottom-start |
  | `validationBubble` | tooltip | hover + focus | no | sí | bottom-start |
  | `commandPreview` | tooltip | hover + focus | no | sí | right-start |

- **Shape canónica**: `<GreenhouseFloatingSurface variant='evidencePeek' kind='costProvenance' />` (metodología Primitive + Variants + Kinds).

### Regla canónica de consumo

- Los **views de producto NO importan `@floating-ui/react` directamente**. Consumen `GreenhouseFloatingSurface`. La excepción son las primitives mismas y la infraestructura legacy de menús Vuexy (`FloatingTree`).
- **Enforced mecánicamente**: lint rule `greenhouse/no-direct-floating-ui-in-views` (modo `error` desde commit-1, cero violaciones hoy). Activa sobre `src/views|app|components`; exime por path `src/components/greenhouse/primitives/**` (la familia de primitives, incl. `GreenhouseFieldProvenancePeek`) e infra Vuexy (`src/@menu|@core|@layout`). Cubre import estático + `import()` dinámico + `require()`.
- Floating Surface es para **UI contextual anclada y transitoria**. NO reemplaza `AdaptiveSidecar` (lanes full-height) ni MUI `Dialog` (decisiones destructivas/legales/financieras/maker-checker).
- Sin lógica de negocio dentro de la primitive.

### Consumers migrados (pilotos)

- `CostProvenancePopover` → `evidencePeek` / `costProvenance` (API pública intacta).
- `TotalsLadder` (segmento de addons) → `evidencePeek` / `totalsAddons` (prop `addonsSegment` intacta).

Ambos dejaron de importar `@floating-ui/react`; paridad visual + focus preservada.

### Verificación

- 19 tests focales (`floating-surface-controller.test.ts` + `GreenhouseFloatingSurface.test.tsx`) + RuleTester de la lint rule (`no-direct-floating-ui-in-views.test.mjs`).
- Lab interno `/admin/design-system/floating-surfaces` (`FloatingSurfaceLabView`) + scenario GVC `floating-surface-primitives` (desktop + mobile, open/close, keyboard, collision near-edge).

`GreenhouseFieldProvenancePeek` sigue usando Floating UI ad-hoc (es primitive/infra, no view de producto) — candidato a adoptar la primitive en un follow-up.


## Delta 2026-04-20b — Floating UI como stack oficial de popovers (TASK-509 / TASK-510)

### Decisión de plataforma

`@floating-ui/react` (v0.27+) pasa a ser el stack canónico para cualquier popover nuevo en el portal. Reemplaza progresivamente a `@mui/material/Popper` (basado en popper.js v2, legacy 2019). Es el stack que usan en 2024-2026 Linear, Stripe, Vercel, Radix, shadcn, Notion.

**Motivación**:
- Recuperación de stale-anchor vía `autoUpdate` (ResizeObserver + IntersectionObserver + MutationObserver).
- Middleware composable: `offset`, `flip`, `shift`, `size`, `arrow`, `hide`.
- A11y hooks integrados: `useRole`, `useDismiss`, `useClick`, `useHover`, `useFocus`.
- `FloatingFocusManager` con `returnFocus` — reemplaza boilerplate manual.
- `FloatingPortal` — render al document.body evitando stacking context issues.

### Regla canónica

Un primitive con popover interno **es dueño** del state del popover (anchor + open + dismiss + focus). Consumers pasan solo el contenido como `ReactNode`. Never leak state/anchor across component boundaries.

### Pattern estándar para popover primitive

```tsx
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from '@floating-ui/react'

const MyPopoverPrimitive = ({ content, ...triggerProps }) => {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ fallbackAxisSideDirection: 'end' }), shift({ padding: 16 })]
  })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context, { outsidePress: true, escapeKey: true }),
    useRole(context, { role: 'dialog' })
  ])

  return (
    <>
      <Trigger ref={refs.setReference} {...getReferenceProps()} {...triggerProps} />
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} returnFocus>
            <Paper ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
              {content}
            </Paper>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  )
}
```

### Middleware defaults

Para popovers enterprise del portal:
- `offset(8)` — separación de 8px entre reference y floating.
- `flip({ fallbackAxisSideDirection: 'end' })` — si no cabe top-start, cae a bottom-end antes que centrar.
- `shift({ padding: 16 })` — mantiene 16px de viewport padding al hacer shift.

Para tooltips (TASK-510 futuro): agregar `hide()` middleware y `useHover` interaction.

### Convivencia temporal

Hasta que TASK-510 complete la migración platform-wide, `@mui/material/Popper` sigue vigente en: `ContextChip`, `AddLineSplitButton`, `AjustesPopover` (del QuoteLineItemsEditor), `QuoteShortcutPalette`. TASK-510 los absorbe uno por uno.

### Consumers actuales (2026-04-20)

- `TotalsLadder` (TASK-509) — segmento inline de addons.


## Delta 2026-04-20 — TotalsLadder `addonsSegment` prop (TASK-507)

Extensión del primitive `TotalsLadder` para soportar un segmento interactivo inline dentro de la ladder de ajustes. Pattern observado en Notion / Linear / Stripe Billing: cuando un ajuste es **clickeable** (abre un detalle), debe vivir con los otros ajustes, no flotar como chip aparte.

### API extendida

```tsx
import { TotalsLadder, type TotalsLadderAddonsSegment } from '@/components/greenhouse/primitives'

<TotalsLadder
  subtotal={2923500}
  factor={1.15}
  ivaAmount={558345}
  total={3921845}
  currency='CLP'
  addonsSegment={{
    count: 1,
    amount: 196134,
    onClick: event => openAddonsPopover(event),
    ariaExpanded: popoverOpen
  }}
/>
```

### Render

El segmento se inserta en la ladder entre `Subtotal` y `Factor`:

```
Total CLP
$3.921.845
Subtotal $2.923.500  ·  ✨ 1 addon $196.134  ·  Factor ×1,15  ·  IVA $558.345
                          ↑ button: hover primary + underline
```

Affordance de botón:
- Hover → `color: primary.main` + `textDecoration: underline` (150ms).
- Focus-visible → outline primary, offset 2px.
- `aria-expanded` refleja el popover state.
- `aria-haspopup='dialog'`.
- `aria-label` full-sentence: `"N addon{s} aplicado{s} por ${formatMoney(amount)}. Abrir detalle."`.

### Copy del segmento

- `count > 0, amount > 0` → `N addon{s} ${formatMoney(amount)}`.
- `count > 0, amount === 0` → `N addon{s}` (sin amount, caso de addons sugeridos sin aplicar).
- `count === 0` → no renderiza (el segmento se omite de la ladder).

### Consumers
- `QuoteSummaryDock` (TASK-507) — reemplaza el chip redondo de zone 3 por este segmento inline.
- Patrón aplicable a: invoice dock, purchase order footer, contract summary — cualquier dock con total + ajustes clickeables.


## Delta 2026-04-19 — Summary dock primitives extraction (TASK-505)

El rediseño del `QuoteSummaryDock` (sticky-bottom del Quote Builder) extrae 3 primitives reusables al registry canónico de primitives del platform:

```
src/components/greenhouse/primitives/
├── ContextChip.tsx              # pre-existente (TASK-487)
├── ContextChipStrip.tsx         # pre-existente (TASK-487)
├── SaveStateIndicator.tsx       # nuevo (TASK-505)
├── MarginHealthChip.tsx         # nuevo (TASK-505)
├── TotalsLadder.tsx             # nuevo (TASK-505)
└── index.ts
```

### `SaveStateIndicator`

Indicador de save lifecycle para docks sticky-bottom o footers de forms enterprise. Render: dot semantic (8 px) + label principal (`body2`) + caption opcional con contexto.

```tsx
import { SaveStateIndicator, type SaveStateKind } from '@/components/greenhouse/primitives'

<SaveStateIndicator
  state='dirty'                    // 'clean' | 'dirty' | 'saving' | 'saved'
  changeCount={2}                  // opcional, solo para 'dirty'
  lastSavedAt={new Date()}         // opcional, solo para 'saved'
/>
```

Estados y color del dot:
- `clean` — gris `action.disabled`.
- `dirty` — `warning.main`. Caption muestra `N cambios`.
- `saving` — `info.main` + `@keyframes save-dot-pulse` 1200ms infinite. Respeta `prefers-reduced-motion` (cae a opacidad fija).
- `saved` — `success.main`. Caption muestra `ahora` / `hace 12s` / `hace 5m` / fecha corta.

A11y: `aria-live="polite"` en el root + `aria-label` full-sentence que combina label principal + caption.

### `MarginHealthChip`

Status chip semantic con 3 niveles (healthy / warning / critical) para KPIs de health (margen de cotización, contract profitability, pipeline margin, etc.). Pattern enterprise Stripe/Ramp: color + icon + label textual + valor + status word en un solo phrase.

```tsx
import { MarginHealthChip, type MarginClassification } from '@/components/greenhouse/primitives'

<MarginHealthChip
  classification='healthy'         // 'healthy' | 'warning' | 'critical'
  marginPct={0.494}                // 0.0–1.0
  tierRange={{ min: 0.4, opt: 0.5, max: 0.6, tierLabel: 'Tier 3' }}  // opcional
/>
```

Render: `Margen · 49,4% · Óptimo` / `Margen · 32,1% · Atención` / `Margen · 12,5% · Crítico`. Background `alpha(color, 0.12)` + border `alpha(color, 0.28)`. Tooltip con tier range al hover si se pasa `tierRange`. Transitions 150 ms emphasized decelerate.

A11y: `aria-label` con full sentence + tier range legible.

### `TotalsLadder`

Total prominent + adaptive ladder para docks de cotización, invoice, purchase order, contract summary. Single source of truth para "monto grande + ajustes opcionales debajo".

```tsx
import { TotalsLadder, type TotalsLadderCurrency } from '@/components/greenhouse/primitives'

<TotalsLadder
  subtotal={2923500}
  factor={1.15}                    // factor país
  ivaAmount={558345}               // IVA calculado
  total={3921845}
  currency='CLP'
  loading={false}
  totalLabel='Total CLP'           // override opcional
/>
```

Render adaptive:
- Si `total === subtotal && factor ∈ {null, 1} && !ivaAmount` → solo el Total.
- Si hay al menos un ajuste → overline `Total {currency}` + `h4` monto (text.primary, tabular-nums, fontWeight 600) + caption muted one-liner: `Subtotal $X · Factor ×1,15 · IVA $Y`.

Loading: `Skeleton variant='text' width=180 height=40`. Respeta `useReducedMotion()` — con reduced motion el total se renderiza estático en vez de con `AnimatedCounter`.

### Regla de primitives

Componentes bajo `src/components/greenhouse/primitives/`:
1. **Sin domain logic** — no importan de `@/lib/finance`, `@/lib/hr`, `@/lib/commercial`. Toman primitivos tipados y renderizan UI.
2. **Tipos se exportan desde `index.ts`** — consumers importan `{ SaveStateIndicator, type SaveStateKind }` del barrel.
3. **Accessible-by-default** — aria-label, aria-live, prefers-reduced-motion.
4. **Tokens canónicos** — no raw hex, no raw px. `theme.shape.customBorderRadius.*`, `theme.palette.*`, `theme.transitions.*`.
5. **Reusables platform-wide** — nombrar en general, no `Quote*`. Si nace Quote-specific, vive en `src/components/greenhouse/pricing/`.

Esta regla se formaliza con TASK-505 y aplica desde TASK-498 (Sprint 3) en adelante.


## Delta 2026-04-11 — Professional profile patterns and certificate preview (TASK-313)

### SkillsCertificationsTab (shared component, dual-mode)

`src/views/greenhouse/hr/certifications/SkillsCertificationsTab.tsx` is a shared tab component used in both self-service (`/my/profile`) and admin (`/people/:slug`) contexts.

| Mode | Trigger | Capabilities |
|------|---------|-------------|
| `self` | User views own profile | Add/edit/delete own certifications, upload certificate file |
| `admin` | HR/admin views a member | All of the above + verification workflow (verify/reject) |

Mode is resolved at render time via props, not via route. The same component renders in both contexts with conditional actions.

### CertificatePreviewDialog

`src/views/greenhouse/hr/certifications/CertificatePreviewDialog.tsx` — dialog for inline preview of uploaded certificate files.

| File type | Render strategy |
|-----------|----------------|
| PDF (`application/pdf`) | `<iframe>` with `src={signedUrl}` inside `DialogContent` |
| Image (`image/*`) | `<img>` with `object-fit: contain` |
| Other | Download link fallback |

Pattern: `Dialog maxWidth='md' fullWidth` with `DialogContent sx={{ minHeight: 400 }}`. The signed URL is fetched on dialog open, not pre-fetched.

### ProfessionalLinksCard and AboutMeCard

Two sidebar cards for the professional profile section of My Profile and Person Detail:

- **ProfessionalLinksCard** — renders social/professional links (LinkedIn, GitHub, Behance, Dribbble, portfolio, Twitter, Threads) as icon buttons. Only links with a non-empty URL are rendered. Edit mode shows `TextField` inputs per link.
- **AboutMeCard** — renders the `about_me` free-text field as a read-only card with an edit dialog. Markdown is not supported; plain text with line breaks.

Both cards reuse `CustomAvatar`, `CustomIconButton`, and the Card+CardContent Vuexy pattern.

### Reuse of VerifiedByEfeonceBadge and BrandLogo

`VerifiedByEfeonceBadge` — compact badge (`Chip` variant) used in certification cards to indicate verification status. States: `verified` (success), `pending_review` (warning), `rejected` (error), `self_declared` (default/muted).

`BrandLogo` — resolves issuer name to a known brand logo. Used in certification cards to display a recognizable issuer icon alongside the certification name. Falls back to a generic certificate icon when the issuer is not in the known-brands catalog.

### Key files

| File | Purpose |
|------|---------|
| `src/views/greenhouse/hr/certifications/SkillsCertificationsTab.tsx` | Shared certifications tab (self/admin) |
| `src/views/greenhouse/hr/certifications/CertificatePreviewDialog.tsx` | PDF/image inline preview dialog |
| `src/views/greenhouse/hr/certifications/CertificationCard.tsx` | Individual certification card with status badge |
| `src/views/greenhouse/people/cards/ProfessionalLinksCard.tsx` | Social/professional links sidebar card |
| `src/views/greenhouse/people/cards/AboutMeCard.tsx` | About me free-text sidebar card |


## Delta 2026-04-10 — Org chart explorer visual stack (TASK-329)

### Decisión de librería

- `@xyflow/react` queda materializado como engine canónico para el organigrama de HR.
- `dagre` queda materializado como layout jerárquico inicial para distribuir nodos del árbol.
- `ApexCharts` se mantiene para charts numéricos; no debe usarse para simular organigramas con nodos React ricos.

### Regla operativa

- El organigrama es una surface de lectura con zoom, pan, foco y quick actions.
- La edición de jerarquía sigue viviendo fuera del canvas, en `HR > Jerarquía`.
- Los nodos deben reutilizar primitives Greenhouse/Vuexy/MUI del portal antes de crear una estética paralela al resto de HR.


## Delta 2026-04-05 — Permission Sets UI patterns (TASK-263)

### Keyboard-accessible interactive cards

Pattern para cards clickeables que abren un panel de detalle. Usado en la lista de sets de permisos.

```tsx
<Card
  role='button'
  tabIndex={0}
  aria-label={`Ver detalle de ${set.setName}`}
  onClick={() => selectItem(set.id)}
  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectItem(set.id) } }}
  sx={{
    cursor: 'pointer',
    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
    '&:hover': { boxShadow: theme => theme.shadows[4] }
  }}
>
```

Regla: toda `<Card>` con `onClick` debe incluir `role="button"`, `tabIndex={0}`, `onKeyDown` y `focus-visible`.

### Confirmation dialogs para acciones destructivas

Pattern estandar para confirmacion antes de eliminar o revocar:

```tsx
<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth='xs' fullWidth aria-labelledby='confirm-title'>
  <DialogTitle id='confirm-title'>¿Eliminar «{itemName}»?</DialogTitle>
  <DialogContent>
    <DialogContentText>Esta acción no se puede deshacer. [consecuencia específica].</DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
    <Button variant='contained' color='error' onClick={handleConfirm}>Eliminar [objeto]</Button>
  </DialogActions>
</Dialog>
```

Reglas:
- Titulo como pregunta con nombre del objeto entre comillas latinas (« »)
- Body describe la consecuencia, no repite el titulo
- Boton destructivo: `variant='contained' color='error'`, label especifico ("Eliminar set", "Revocar acceso")
- Boton cancelar: sin variant (default), siempre "Cancelar"

### Toast feedback pattern (react-toastify)

```tsx
import { toast } from 'react-toastify'

// Success — auto-dismiss
toast.success('Cambios guardados.')
toast.success('Set de permisos creado.')

// Error — persistent
toast.error('No se pudo guardar. Intenta de nuevo.')
```

Regla: toda operacion de escritura exitosa muestra toast de exito. Copy en espanol, sin exclamaciones, confirma que se hizo.

### Autocomplete user picker

Pattern para asignar usuarios desde un buscador en vez de IDs crudos:

```tsx
<Autocomplete
  multiple
  options={availableUsers}
  getOptionLabel={opt => `${opt.fullName} (${opt.email})`}
  isOptionEqualToValue={(opt, val) => opt.userId === val.userId}
  renderInput={params => <TextField {...params} label='Buscar usuarios' placeholder='Escribe un nombre...' size='small' />}
  renderTags={(value, getTagProps) => value.map((opt, i) => <Chip {...getTagProps({ index: i })} key={opt.userId} label={opt.fullName} size='small' />)}
  noOptionsText='No se encontraron usuarios disponibles'
/>
```

Fuente: `GET /api/admin/views/sets/:setId/users?scope=assignable` retorna lista de usuarios activos.

### SECTION_ACCENT shared constant

Mapa de colores por seccion de governance, exportado desde `src/lib/admin/view-access-catalog.ts`:

```tsx
export const SECTION_ACCENT: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'secondary'> = {
  gestion: 'info', equipo: 'success', finanzas: 'warning', ia: 'secondary',
  administracion: 'primary', mi_ficha: 'secondary', cliente: 'success'
}
```

Importar desde `@/lib/admin/view-access-catalog` en vez de duplicar en cada componente.

### Archivos clave

| Archivo | Proposito |
|---------|-----------|
| `src/views/greenhouse/admin/permission-sets/PermissionSetsTab.tsx` | Tab CRUD de sets de permisos |
| `src/views/greenhouse/admin/users/UserAccessTab.tsx` | Tab "Accesos" en detalle de usuario |
| `src/lib/admin/permission-sets.ts` | CRUD + resolucion de Permission Sets |
| `src/lib/admin/view-access-catalog.ts` | VIEW_REGISTRY, GOVERNANCE_SECTIONS, SECTION_ACCENT |


## Delta 2026-04-05 — Vuexy User View Pattern: sidebar profile + tabs (referencia para Mi Perfil)

Patron enterprise de detalle de usuario extraido del full-version de Vuexy (`apps/user/view`). Aplicable a vistas self-service ("Mi *") donde el usuario ve su propia informacion.

### Estructura en Vuexy full-version

```
# Ubicacion: vuexy-admin-v10.11.1/nextjs-version/typescript-version/full-version/

src/app/[lang]/(dashboard)/(private)/apps/user/view/
  page.tsx                          ← entry point: Grid lg=4/lg=8

src/views/apps/user/view/
  user-left-overview/
    index.tsx                       ← contenedor: UserDetails + UserPlan
    UserDetails.tsx                 ← card: avatar 120px, stats, key-value details, Edit/Suspend
    UserPlan.tsx                    ← card: plan info (no aplica a Greenhouse)
  user-right/
    index.tsx                       ← TabContext + CustomTabList pill style
    overview/
      index.tsx                     ← ProjectListTable + UserActivityTimeline + InvoiceListTable
      ProjectListTable.tsx          ← @tanstack/react-table con fuzzy search
      UserActivityTimeline.tsx      ← MUI Lab Timeline
      InvoiceListTable.tsx          ← tabla de facturas
    security/                       ← ChangePassword, RecentDevice, TwoStepVerification
    billing-plans/                  ← CurrentPlan, PaymentMethod, BillingAddress
    notifications/                  ← tabla de notificaciones
    connections/                    ← conexiones sociales
```

### Patron: Sidebar Profile + Tabbed Content

```
┌────────────────┬──────────────────────────────────────────┐
│  SIDEBAR (4)   │  TABS (8)                                │
│                │  [Overview] [Security] [Billing] [...]    │
│  Avatar 120px  ├──────────────────────────────────────────┤
│  Name          │                                          │
│  Role Chip     │  Tab content                             │
│                │  (dynamic() lazy loaded)                 │
│  Stats:        │                                          │
│  ✓ 1.23k tasks │                                          │
│  ✓ 568 projects│                                          │
│                │                                          │
│  Details:      │                                          │
│  Email: ...    │                                          │
│  Phone: ...    │                                          │
│  Status: ...   │                                          │
│                │                                          │
│  [Edit][Suspend]│                                         │
└────────────────┴──────────────────────────────────────────┘
```

### Decisiones de diseno

| Decision | Justificacion |
|----------|---------------|
| Sidebar 4 + Tabs 8 | Identidad siempre visible; content area maximizada para tablas y forms |
| `CustomTabList pill='true'` | Tabs con pill style coherente con el resto del portal |
| `dynamic()` en cada tab | Lazy loading — solo carga el tab activo, mejor performance |
| Stats con `CustomAvatar` + Typography | Patron reusable de Vuexy: icon avatar + numero + label |
| Key-value details con `Typography font-medium` | Patron consistente: label bold + value regular |
| `OpenDialogOnElementClick` para acciones | Dialogs modales para edit/delete/suspend sin navegacion |

### Diferencia con Person Detail View (TASK-168)

| Aspecto | Person Detail View | User View (Mi Perfil) |
|---------|-------------------|----------------------|
| Layout | Horizontal header full-width + tabs below | Sidebar left + tabs right |
| Uso | Admin ve a otro usuario | Usuario ve su propio perfil |
| Actions | OptionMenu con acciones admin | Edit dialog (o read-only) |
| Stats | `CardStatsSquare` en header | Stats inline en sidebar |
| Tabs | 5 tabs domain-oriented (Profile, Economy, Delivery, Assignments, Activity) | Tabs self-service (Resumen, Seguridad, Mi Nomina, Mi Delivery) |

### Cuando aplicar cada patron

- **Person Detail View (horizontal header)**: cuando un admin o manager ve el perfil de OTRA persona. Necesita max content area para tablas de datos ajenos.
- **User View (sidebar + tabs)**: cuando el usuario ve SU PROPIA informacion. La identidad fija en sidebar refuerza contexto personal.

### Componentes core reutilizables (ya migrados)

| Componente | Archivo | Rol en User View |
|-----------|---------|------------------|
| `CustomAvatar` | `src/@core/components/mui/Avatar.tsx` | Avatar 120px rounded en sidebar |
| `CustomTabList` | `src/@core/components/mui/TabList.tsx` | Tabs con pill style |
| `CustomTextField` | `src/@core/components/mui/TextField.tsx` | Inputs en dialogs de edicion |
| `CustomChip` | `src/@core/components/mui/Chip.tsx` | Chip de rol/estado en sidebar |
| `OpenDialogOnElementClick` | `src/components/dialogs/OpenDialogOnElementClick.tsx` | Edit dialog trigger |
| `CardStatsSquare` | `src/components/card-statistics/CardStatsSquare.tsx` | KPIs compactos |
| `TablePaginationComponent` | `src/components/TablePaginationComponent.tsx` | Paginacion en tablas de tabs |

### Task de implementacion

TASK-257 aplica este patron a Mi Perfil (`/my/profile`).


## Delta 2026-04-04 — TanStack React Table: componentes avanzados extraídos de Vuexy full-version

Se extrajeron los patrones avanzados de tabla del full-version de Vuexy como componentes reutilizables.

### Componentes disponibles

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| `EditableCell` | `src/components/EditableCell.tsx` | Celda editable inline con `onBlur` → `table.options.meta.updateData()` |
| `ColumnFilter` | `src/components/ColumnFilter.tsx` | Filtro por columna: texto (búsqueda) o numérico (min/max range) |
| `DebouncedInput` | `src/components/DebouncedInput.tsx` | Input con debounce 500ms para búsqueda global |
| `TablePaginationComponent` | `src/components/TablePaginationComponent.tsx` | Paginación MUI integrada con TanStack |
| `fuzzyFilter` | `src/components/tableUtils.ts` | Fuzzy filter via `@tanstack/match-sorter-utils` |
| `buildSelectionColumn` | `src/components/tableUtils.ts` | Column definition de checkbox para row selection |
| `getToggleableColumns` | `src/components/tableUtils.ts` | Helper para obtener columnas que pueden ocultarse |
| `getColumnFacetedRange` | `src/components/tableUtils.ts` | Helper para obtener min/max de una columna numérica |

### Patrón de tabla full-featured

```tsx
import { fuzzyFilter, buildSelectionColumn, getToggleableColumns } from '@/components/tableUtils'
import EditableCell from '@/components/EditableCell'
import ColumnFilter from '@/components/ColumnFilter'
import DebouncedInput from '@/components/DebouncedInput'
import TablePaginationComponent from '@/components/TablePaginationComponent'

const table = useReactTable({
  data,
  columns: [buildSelectionColumn<MyRow>(), ...myColumns],
  filterFns: { fuzzy: fuzzyFilter },
  globalFilterFn: fuzzyFilter,
  enableRowSelection: true,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  getFacetedMinMaxValues: getFacetedMinMaxValues(),
  getPaginationRowModel: getPaginationRowModel(),
  meta: {
    updateData: (rowIndex, columnId, value) => {
      setData(old => old.map((row, i) => i === rowIndex ? { ...row, [columnId]: value } : row))
    }
  }
})
```

### TableMeta augmentation

`tableUtils.ts` augmenta `TableMeta` con `updateData` para que `EditableCell` funcione sin type errors:
```typescript
declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void
  }
}
```


## Delta 2026-04-04 — PeriodNavigator: componente reutilizable de navegación de período

**Archivo**: `src/components/greenhouse/PeriodNavigator.tsx`

Componente compartido para navegación de período mensual (año + mes). Consolida 3 patrones que estaban duplicados en 7+ vistas.

### Variantes

| Variante | Render | Caso de uso |
|----------|--------|-------------|
| `arrows` (default) | `< [Hoy] Abril 2026 >` | Header de cards, vistas de detalle |
| `dropdowns` | `[Año ▼] [Mes ▼] [Hoy]` | Filtros de período en dashboards |
| `compact` | `< Abr 2026 >` | Inline en tablas o espacios reducidos |

### Props

```typescript
interface PeriodNavigatorProps {
  year: number
  month: number
  onChange: (period: { year: number; month: number }) => void
  variant?: 'arrows' | 'dropdowns' | 'compact'  // default: 'arrows'
  minYear?: number          // default: 2024
  maxYear?: number          // default: currentYear + 1
  showToday?: boolean       // default: true
  todayLabel?: string       // default: 'Hoy'
  size?: 'small' | 'medium' // default: 'small'
  disabled?: boolean
}
```

### Uso

```tsx
import PeriodNavigator from '@/components/greenhouse/PeriodNavigator'

<PeriodNavigator
  year={year}
  month={month}
  onChange={({ year, month }) => { setYear(year); setMonth(month) }}
  variant='arrows'
/>
```

### Vistas candidatas a migrar

Las siguientes vistas usan selectores duplicados que deberían migrarse a `PeriodNavigator`:
- `CostAllocationsView` (dropdowns inline)
- `ProjectedPayrollView` (arrows inline)
- `OrganizationEconomicsTab` (dropdowns inline)
- `OrganizationFinanceTab` (dropdowns inline)
- `OrganizationIcoTab` (dropdowns inline)
- `ClientEconomicsView` (dropdowns inline)
- `PersonActivityTab` (dropdowns inline)

### Accesibilidad

- Botones prev/next tienen `aria-label` ("Mes anterior" / "Mes siguiente")
- Tooltips descriptivos en cada control
- Botón "Hoy" indica si ya estás en el período actual
- `disabled` prop deshabilita todos los controles


## Delta 2026-04-03 — Cost Intelligence Dashboard (cost-allocations redesign)

La vista `/finance/cost-allocations` fue rediseñada de un CRUD vacío a un dashboard de inteligencia de costos:

- Tab 1 "Atribución comercial" (default): KPIs con comparativa vs mes anterior + tabla de clientes con drill-down + donut de composición
- Tab 2 "Ajustes manuales": CRUD original preservado para overrides

Patrón aplicado: fetch paralelo de health actual + health período anterior para computar deltas. Las 4 KPI cards usan `HorizontalWithSubtitle` con `trend`/`trendNumber`/`statusLabel`/`footer` siguiendo el patrón canónico documentado abajo.

Para costos: aumento = `'negative'` (rojo), disminución = `'positive'` (verde). Para conteos (clientes, personas): aumento = `'positive'`.


## Delta 2026-04-03 — GreenhouseFunnelCard: componente reutilizable de embudo

**Archivo**: `src/components/greenhouse/GreenhouseFunnelCard.tsx`

Componente de visualización de embudo/funnel para procesos secuenciales con etapas. Usa Recharts `FunnelChart` + `Funnel` (ya instalado, v3.6).

### Props

```typescript
interface FunnelStage {
  name: string
  value: number
  color?: string                                    // Override de color por etapa
  status?: 'success' | 'warning' | 'error'          // Semáforo override
}

interface GreenhouseFunnelCardProps {
  title: string
  subtitle?: string
  avatarIcon?: string                               // Default: 'tabler-filter'
  avatarColor?: ThemeColor                          // Default: 'primary'
  data: FunnelStage[]
  height?: number                                   // Default: 280
  showConversionBadges?: boolean                    // Default: true
  showFooterSummary?: boolean                       // Default: true
  onStageClick?: (stage: FunnelStage, index: number) => void
}
```

### Paleta secuencial por defecto (cuando no hay semáforo)

| Posición | Token | Hex | Razón |
|----------|-------|-----|-------|
| Etapa 1 (tope) | `primary` | `#7367F0` | Punto de entrada |
| Etapa 2 | `info` | `#00BAD1` | Calificación |
| Etapa 3 | `warning` | `#ff6500` | Punto de decisión |
| Etapa 4 | `error` | `#bb1954` | Punto crítico de conversión |
| Etapa 5+ (fondo) | `success` | `#6ec207` | Completación |

### Footer inteligente

Auto-genera dos insights:
1. **Conversión total**: `lastStage.value / firstStage.value × 100`
2. **Etapa crítica**: la etapa con mayor caída % vs anterior. Si todas ≥ 80% → "Flujo saludable"

### Accesibilidad

- `<figure role="img" aria-label="...">` con `<figcaption class="sr-only">` detallando cada etapa
- Respeta `prefers-reduced-motion` desactivando animaciones
- Cada trapezoide tiene 24px mínimo de altura (target de interacción)
- Labels de texto en cada etapa (no depende solo de color)
- Si `onStageClick` presente: etapas focusables con `tabIndex={0}` y `role="button"`

### Casos de uso

- Pipeline CSC (Delivery): Briefing → Producción → Revisión → Cambios → Entrega
- Pipeline CRM: Leads → Calificados → Propuesta → Negociación → Cierre
- Onboarding: Contacto → Propuesta → Contrato → Setup → Activo
- Cualquier proceso secuencial con `FunnelStage[]`


## Delta 2026-04-03 — Helpers canónicos de comparativa + patrones de KPI cards

### Helpers reutilizables de comparativa

Dos archivos canónicos para cualquier vista que necesite mostrar deltas entre períodos o monedas:

**`src/lib/finance/currency-comparison.ts`** — funciones puras, importable desde client Y server:

| Función | Propósito | Ejemplo de uso |
|---------|-----------|----------------|
| `consolidateCurrencyEquivalents(totals, usdToClp)` | Convierte multi-currency `{ USD, CLP }` a totales consolidados CLP y USD | Cards de Nómina, Finance |
| `computeCurrencyDelta(current, compare, rate, label)` | Computa `grossDeltaPct`, `netDeltaPct`, `compareLabel`, `grossReference`, `netReference` | Cards con "vs oficial" o "vs 2026-03" |
| `payrollTrendDirection(deltaPct)` | Para costos: subir = `'negative'`, bajar = `'positive'` | Prop `trend` de `HorizontalWithSubtitle` |
| `formatDeltaLabel(deltaPct, label)` | `"5% vs 2026-03"` | Prop `trendNumber` de `HorizontalWithSubtitle` |

**`src/lib/payroll/period-comparison.ts`** — server-only, queries PostgreSQL:

| Función | Propósito |
|---------|-----------|
| `getPreviousOfficialPeriodTotals(beforePeriodId)` | Último período oficial (`approved`/`exported`) anterior al dado |
| `getOfficialPeriodTotals(periodId)` | Oficial del mismo período |

Patrón de uso en API routes:
```typescript
import { consolidateCurrencyEquivalents } from '@/lib/finance/currency-comparison'
import { getPreviousOfficialPeriodTotals } from '@/lib/payroll/period-comparison'

const previousOfficial = await getPreviousOfficialPeriodTotals(periodId)
const consolidated = consolidateCurrencyEquivalents(totals, usdToClp)
```

Patrón de uso en views (client):
```typescript
import { computeCurrencyDelta, payrollTrendDirection, formatDeltaLabel } from '@/lib/finance/currency-comparison'

const delta = computeCurrencyDelta(current, compareSource, fxRate, 'vs 2026-03')
// → { grossDeltaPct: 5, netDeltaPct: 3, compareLabel: 'vs 2026-03', grossReference: 3120000, netReference: 2800000 }

<HorizontalWithSubtitle
  trend={payrollTrendDirection(delta.grossDeltaPct)}      // 'negative' (costo subió)
  trendNumber={formatDeltaLabel(delta.grossDeltaPct, delta.compareLabel)}  // "5% vs 2026-03"
  footer={`Anterior: ${formatCurrency(delta.grossReference, 'CLP')}`}
/>
```

### Helpers de tendencia para ICO/Delivery

**`trendDelta()`** en `AgencyDeliveryView.tsx` — helper local para comparativas mes-a-mes en trend arrays:

```typescript
// trendDelta(trend, field) → { text, number, direction, prevLabel } | null
// - text: "+3pp vs Mar" (formatted for display)
// - number: "3pp" (absolute delta for HorizontalWithSubtitle.trendNumber)
// - direction: 'positive' | 'negative' | 'neutral'
// - Para RPA (lower is better), direction is INVERTED: decrease = positive
```

### Patrones de cards Vuexy para data storytelling

1. **Hero KPI** (BarChartRevenueGrowth pattern): `Card` con KPI `h3` grande + `CustomChip` trend + mini bar chart ApexCharts. Usar para la métrica principal de cada vista.
2. **Rich KPI** (`HorizontalWithSubtitle` con todas las props): `trend` + `trendNumber` + `statusLabel`/`statusColor`/`statusIcon` + `footer`. Usar para métricas secundarias con comparativa.
3. **Attention card** (accent left border): `Card` con `borderLeft: 4px solid` color semáforo. Usar para items que requieren acción.

### Regla

Toda vista que muestre métricas operativas debe incluir comparativa vs período anterior. No mostrar números aislados sin contexto.


## Delta 2026-03-31 — Shared uploader pattern

`TASK-173` ya deja un patrón canónico de upload para el portal:
- componente shared `src/components/greenhouse/GreenhouseFileUploader.tsx`
- base visual y funcional:
  - `react-dropzone`
  - `src/libs/styles/AppReactDropzone.ts`

Regla de plataforma:
- si una surface del portal necesita adjuntos, debe intentar reutilizar `GreenhouseFileUploader` antes de crear un uploader propio
- la personalización por módulo debe vivir en props, labels, allowed mime types y aggregate context
- no copiar el demo de Vuexy inline en cada módulo


## Delta 2026-03-30 — View Governance UI ya es parte de la plataforma

`/admin/views` ya no debe leerse como experimento aislado.

La plataforma UI ahora asume un patrón explícito de gobernanza de vistas:
- catálogo de superficies gobernables por `view_code`
- matrix por rol como superficie de administración
- preview por usuario con lectura efectiva
- enforcement page-level/layout-level por `view_code`
- auditoría y overrides como parte del mismo módulo

Esto convierte `Admin Center > Vistas y acceso` en un componente de plataforma, no en una pantalla ad hoc.


## Delta 2026-03-30 — capability modules cliente entran al modelo gobernable

La sección `Módulos` del portal cliente ya no debe tratarse como navegación libre derivada solo desde `routeGroups`.

Estado vigente:
- `cliente.modulos` es el access point gobernable del carril `/capabilities/**`
- el menú solo debe exponer capability modules cuando la sesión conserve esa vista
- el acceso al layout dinámico debe pasar dos checks:
  - `view_code` broad del carril (`cliente.modulos`)
  - autorización específica del módulo (`verifyCapabilityModuleAccess`)

Esto deja explícito que los capability modules son parte del modelo de gobierno del portal y no un apéndice fuera de `/admin/views`.


## Delta 2026-03-31 — Person Detail View: Enterprise Redesign Pattern (TASK-168)

La vista de detalle de persona (`/people/:slug`) fue rediseñada como referencia canónica de un patrón enterprise aplicable a cualquier entity detail view del portal.

### Patrón: Horizontal Profile Header + Consolidated Tabs

Reemplaza el patrón anterior de sidebar izquierdo + contenido derecho con:

```
┌──────────────────────────────────────────────────────────────────┐
│  PROFILE HEADER (full-width Card)                                │
│  Avatar(80px) + Name + Role + Email + Integration Chips          │
│  3x CardStatsSquare (FTE, Hrs, Spaces) + Status Chip + ⚙ Admin  │
├──────────────────────────────────────────────────────────────────┤
│  [Tab1] [Tab2] [Tab3] [Tab4] [Tab5]  ← máx 5-6 tabs, sin scroll │
├──────────────────────────────────────────────────────────────────┤
│  Tab content (full-width, Accordion sections)                    │
└──────────────────────────────────────────────────────────────────┘
```

### Decisiones de diseño validadas (research enterprise UX 2026)

| Decisión | Justificación |
|----------|---------------|
| Header horizontal > sidebar | Top-rail layout maximiza content area ([Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)) |
| Tabs consolidados (9→5) | Máx 5-6 tabs evitan overflow; agrupar por dominio lógico |
| Progressive disclosure (Accordion) | "Carefully sequencing when users encounter features" ([FuseLab 2026](https://fuselabcreative.com/enterprise-ux-design-guide-2026-best-practices/)) |
| Campos vacíos omitidos | Reducir ruido: no renderizar "—" dashes en DOM |
| Admin actions en OptionMenu | Quick actions accesibles desde cualquier tab, sin clutterear la UI |
| Integration status con chips | Texto + icon + color (no solo ✓/✗) para WCAG 2.2 AA |
| Legacy URL redirects | Backward-compatible: `?tab=compensation` → `?tab=economy` |

### Componentes del patrón

| Componente | Archivo | Rol |
|-----------|---------|-----|
| `PersonProfileHeader` | `views/greenhouse/people/PersonProfileHeader.tsx` | Header horizontal con avatar, KPIs, admin OptionMenu |
| `PersonProfileTab` | `views/greenhouse/people/tabs/PersonProfileTab.tsx` | 3 Accordion sections: datos laborales, identidad, actividad |
| `PersonEconomyTab` | `views/greenhouse/people/tabs/PersonEconomyTab.tsx` | Compensación card + nómina accordion + costos accordion |
| `CardStatsSquare` | `components/card-statistics/CardStatsSquare.tsx` | KPI pill compacto en headers |

### Cuándo aplicar este patrón

Usar para **cualquier entity detail view** que tenga:
- Identidad (avatar, nombre, estado)
- 4+ secciones de contenido
- Acciones admin contextuales
- Múltiples dominios de datos (HR, Finance, Delivery, etc.)

Candidatos: Organization Detail, Space Detail, Client Detail, Provider Detail.

### Reglas de Accordion en detail views

- `defaultExpanded` solo para la primera sección (la más usada)
- Secciones sin datos no se renderizan (no empty states dentro de accordions)
- Cada accordion header: `Avatar variant='rounded' skin='light'` + `Typography h6` + subtitle
- Divider entre summary y details
- `disableGutters elevation={0}` en el Accordion interno, Card wrapper con border


## Delta 2026-04-06 — Mi Perfil rich view: Vuexy user-profile pattern (TASK-272)

### Patron aplicado

`/my/profile` implementa el patron de user-profile de Vuexy (`full-version/src/views/pages/user-profile/`) adaptado a un contexto read-only con datos reales del portal.

Se copiaron y adaptaron 9 componentes del full-version en `src/views/greenhouse/my/my-profile/`:

```
src/views/greenhouse/my/my-profile/
  MyProfileView.tsx                 ← orchestrator: fetch paralelo + transformacion + tabs
  MyProfileHeader.tsx               ← gradient banner + avatar + nombre/cargo/departamento
  profile/
    AboutOverview.tsx               ← tab Perfil: "Sobre mi" + contacto + actividad + equipos + colegas
    ActivityTimeline.tsx            ← styled MUI Timeline con solicitudes de permisos
    ConnectionsTeams.tsx            ← cards de equipo y colegas
  teams/                            ← tab Equipos: espacios/clientes asignados
  projects/                         ← tab Proyectos: TanStack table con fuzzy search
  connections/                      ← tab Colegas: miembros del departamento/organizacion
```

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  PROFILE HEADER (full-width)                                     │
│  Gradient banner + Avatar + Nombre + Cargo + Departamento        │
│  Fecha de ingreso + Badges (FTE, equipo, etc.)                   │
├──────────────────────────────────────────────────────────────────┤
│  [Perfil] [Equipos] [Proyectos] [Colegas] [Seguridad]           │
├──────────────────────────────────────────────────────────────────┤
│  Tab content (full-width)                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Tabs

| Tab | Contenido | Componente |
|-----|-----------|------------|
| Perfil | Sobre mi, Contacto, Actividad reciente (timeline), Equipos, Colegas | `AboutOverview` + `ActivityTimeline` + `ConnectionsTeams` |
| Equipos | Espacios/clientes donde esta asignado | teams components |
| Proyectos | Proyectos con progreso y detalle (TanStack table + fuzzy search) | projects components |
| Colegas | Miembros del mismo departamento/organizacion | connections components |
| Seguridad | Configuracion de seguridad (pendiente) | placeholder |

### Data fetching

4 APIs en paralelo desde `MyProfileView.tsx`:

| API | Datos |
|-----|-------|
| `GET /api/my/profile` | person_360: nombre, cargo, departamento, fecha ingreso, contacto |
| `GET /api/my/assignments` | asignaciones activas a espacios/clientes |
| `GET /api/my/leave` | solicitudes de permisos (para activity timeline) |
| `GET /api/my/organization/members` | miembros del departamento/organizacion |

La capa de transformacion en `MyProfileView.tsx` mapea las respuestas de API a props compatibles con los componentes Vuexy adaptados.

### Patron de adaptacion Vuexy → Greenhouse

1. **Copiar** componentes del full-version (`src/views/pages/user-profile/`)
2. **Adaptar** con datos reales del portal (reemplazar datos mock)
3. **Traducir** labels a espanol
4. **Remover** features interactivas no aplicables (connect/disconnect, OptionMenu) para contexto read-only
5. **Preservar** la estructura visual y patrones de MUI/Vuexy

### Componentes Vuexy reutilizados

| Componente Vuexy | Uso en Mi Perfil |
|-------------------|------------------|
| `CustomAvatar` | Avatar en header |
| `CustomChip` | Badges de estado, departamento |
| `CustomTabList` | Tabs con pill style |
| MUI `Timeline` (Lab) | Activity timeline con solicitudes |
| TanStack `useReactTable` + `fuzzyFilter` | Tabla de proyectos con busqueda |

### Diferencia con Person Detail View (TASK-168)

| Aspecto | Person Detail View | Mi Perfil (TASK-272) |
|---------|-------------------|---------------------|
| Layout | Horizontal header + accordions | Gradient banner header + tabs |
| Modelo Vuexy | `apps/user/view` (sidebar + tabs) | `pages/user-profile` (banner + tabs) |
| Uso | Admin ve perfil de OTRA persona | Usuario ve SU propio perfil |
| Interacciones | OptionMenu con acciones admin | Read-only, sin acciones admin |
| Datos | person_360 completo (admin scope) | person_360 propio + asignaciones + permisos |


---

## Version log del front-matter (monolito original)

Registro de versiones que vivía en el front-matter de `GREENHOUSE_UI_PLATFORM_V1.md` (v1.0 → v1.29). Preservado para trazabilidad.

> **Version:** 1.29
> **Created:** 2026-03-30
> **Updated:** 2026-06-07 — v1.29: `GreenhouseAsyncActionButton` ahora compone `GreenhouseButton` como base canonical de button emphasis/variant/tone/size/icon slots, preservando su API legacy MUI (`variant/color`) mediante adapter interno hacia `solid/label/outlined/text` + `tone`.
> **Updated:** 2026-06-07 — v1.28: Greenhouse agrega `GreenhouseButton` como primitive canonical de botones basada en AXIS Figma `Buttons` (`yyMksCoijfMaIoYplXKZaR`, node `324:32923`) con variants `solid/label/outlined/text`, tones semanticos, sizes `large/medium/small`, kinds semanticos y resolver `kind→variant/tone`. Lab interno: `/admin/design-system/buttons`.
> **Updated:** 2026-06-07 — v1.27: Greenhouse agrega `GreenhouseChip` como primitive canonical de chips basada en AXIS Figma `Chip` (`yyMksCoijfMaIoYplXKZaR`, node `369:92030`) con variants `solid/label/outlined`, tones semanticos, sizes `medium/small`, avatar y close affordance. Lab interno: `/admin/design-system/chips`.
> **Updated:** 2026-06-07 — v1.26: Greenhouse agrega `GreenhouseActivityTimeline` como primera primitive de utilities para timelines de actividad/auditoria ligera/handoffs/documentos, adaptada desde AXIS Figma `Activity Timeline` (`yyMksCoijfMaIoYplXKZaR`, node `6678:105154`) con Framer Motion reduced-motion-safe y Utilities Lab interno en `/admin/design-system/utilities`.
> **Updated:** 2026-06-07 — v1.25: Greenhouse agrega `GreenhouseMetricBreakdownChartCard` como tercera primitive canonical de charts para snapshots con KPI hero + serie semanal + metric meters (`variant='weeklyBarSummary'`, primer kind `earningReports`) basada en Recharts + meters MUI.
> **Updated:** 2026-06-07 — v1.24: Greenhouse agrega `GreenhouseStackedDistributionChartCard` como segunda primitive canonical de charts para distribuciones apiladas operativas (`variant='stackedStatus'`, primer kind `vehiclesOverview`) basada en Recharts + rows MUI.
> **Updated:** 2026-06-07 — v1.23: Greenhouse agrega `GreenhouseChartCard` como primitive reusable inicial para chart cards enterprise basadas en Recharts, con tabs de metrica, tooltip accesible, `aria-describedby` compacto, responsive mobile y Charts Lab interno en `/admin/design-system/charts`.
> **Updated:** 2026-06-06 — v1.22: Greenhouse expande microinteracciones V1.1 con `GreenhouseFieldProvenancePeek`, `GreenhouseStepperProgressMicro`, `GreenhouseEvidenceAttachmentDropzone` y `GreenhouseInlineDecisionPrompt` para procedencia de datos, progreso operativo compacto, evidencia/upload verificado y decisiones inline de riesgo controlado.
> **Updated:** 2026-06-06 — v1.21: Greenhouse canoniza el set V1 de primitives de microinteraccion (`GreenhouseAsyncActionButton`, `GreenhouseCommandFeedback`, `GreenhouseStateTransition`, `GreenhouseInlineValidation`) con states/variants oficiales e iteracion obligatoria en el lab antes de crear componentes paralelos.
> **Updated:** 2026-06-06 — v1.20: Greenhouse agrega `GreenhouseStateTransition` como primitive de microinteraccion para cambios de estado visibles en rows, cards y panels (`from -> to`, tonos semanticos, live region, reduced-motion). Lab interno: `/admin/design-system/microinteractions`.
> **Updated:** 2026-06-06 — v1.19: Greenhouse agrega `GreenhouseAsyncActionButton` y `GreenhouseCommandFeedback` como primitives de microinteraccion para commands puntuales: progreso del command + resultado persistente post-accion. Lab interno: `/admin/design-system/microinteractions`.
> **Updated:** 2026-06-06 — v1.18b: cada variant oficial de `GreenhouseLoadingSurface` queda expuesta tambien como componente nombrado reusable (`GreenhouseDocumentPipelineLoader`, `GreenhouseExternalHandoffLoader`, etc.) para migrar consumers sin depender de strings de variant.
> **Updated:** 2026-06-06 — v1.18: `GreenhouseLoadingSurface` agrega variants enterprise orientadas a workflows operativos: `documentPipeline`, `externalHandoff`, `secureAction`, `uploadVerification` y `reconciliationMatching`, y refina `aiThinking` con checkpoints internos. Implementacion: `TASK-1037`.
> **Updated:** 2026-06-06 — v1.17: Greenhouse agrega `GreenhouseLoadingSurface` como primitive canonica inicial para loading states modernos y abre el **Loading Lab** interno como child route de design system en `/admin/design-system/loaders`. Variants V1: `pageSkeleton`, `panelSkeleton`, `tableSkeleton`, `inlineAction`, `brandSplash`, `aiThinking`, `progressRail`. Implementacion: `TASK-1037`.
> **Updated:** 2026-06-06 — v1.16: Greenhouse adopta **Dashboard Floating Action Dock** como primitive shell para acciones persistentes ancladas al viewport (`NexaFloatingButton`, `ScrollToTop` y futuros items). Publica safe-area CSS vars para footers/sticky bars y separa este contrato de `GreenhouseFloatingSurface` (`TASK-1033`), que cubre superficies contextuales ancladas.
> **Updated:** 2026-06-06 — v1.15: Greenhouse adopta Floating UI como engine canonico de posicionamiento para superficies contextuales ancladas, expuesto via primitive futura **Greenhouse Floating Surface**. ADR: `GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`; implementacion futura: `TASK-1033`.
> **Updated:** 2026-06-06 — v1.14: Greenhouse canoniza la metodologia **Primitive + Variants + Kinds** para UI reusable. Una primitive estable owns layout/a11y/responsive/motion/shell; `variant` representa un modo funcional oficial; `kind` representa el caso semantico de consumidor y debe mapear a una variant. ADR: `GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`.
> **Updated:** 2026-06-06 — v1.13: TASK-1028 promoted Adaptive Sidecar from architecture to reusable runtime primitive. Canonical exports live in `src/components/greenhouse/primitives/`: `AdaptiveSidecarLayout`, `ContextualSidecar`, and `adaptive-sidecar-controller` (`resolveAdaptiveSidecarMode`, URL helpers, telemetry helper, idempotent `reduceAdaptiveSidecarState`). Future contextual assistance/inspection/review/preview/low-risk edit surfaces must reuse this primitive before creating custom drawers/modals.
> **Updated:** 2026-06-05 — v1.12: Greenhouse adopta `Adaptive Sidecar` como capacidad UI platform canonica, no Nexa-only, para asistencia, inspeccion, review, preview y edicion contextual que debe preservar el contexto de trabajo. ADR: `GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`; arquitectura: `GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`; implementacion: `TASK-1028`. Desktop preferente = in-flow push/reflow; mobile/tablet = Drawer temporal; Dialog modal sigue obligatorio para acciones destructivas/irreversibles/legales/financieras. Ver Delta 2026-06-05 abajo.
> **Updated:** 2026-06-02 — v1.11: `MetricTrendCard` primitive nueva (`src/components/greenhouse/primitives/`). KPI card con área interactiva month-over-month en **Recharts**: tooltip on-hover + crosshair, semáforo por `tone` (success/warning/error), línea **edge-to-edge** con dots/labels inset y alineados (técnica edge-anchor), draw-in + hover-lift reduced-motion aware, tabla sr-only a11y. Data-agnostic (recibe `series`/`value`/`tone`) → reutilizable para cualquier métrica de tendencia. Primer consumer: Person 360 → Activity (OTD%/FTR%). Ver Delta 2026-06-02 abajo.
> **Updated:** 2026-06-01 — v1.10: TASK-982 Navigation Reachability Governance. Contrato canónico: toda ruta `(dashboard)` debe ser alcanzable (link interno / child route declarada / dinámica). Gate `route-reachability-gate.mjs` (espejo navegacional de TASK-827) + manifest SSOT `src/lib/navigation/route-reachability-manifest.ts`. Patrón header primary-action ("Nuevo X" en workbench, 1 primary + N tonal). Doctrina IA de dominio multi-superficie (hub-por-audiencia + tabs + drawers + ⌘K). Ver Delta 2026-06-01 abajo.
> **Updated:** 2026-05-08 — v1.9: TASK-612 entrega Organization Workspace Shell (chrome) + FacetContentRouter + 9 facet content components, gated por flag `organization_workspace_shell_agency` (extensión de `home_rollout_flags` per V1.1). Patron canónico shell-vs-content (§4.5 spec V1) materializado: shell owns chrome, domain owns facet content via render-prop + lazy registry. Ver Delta 2026-05-08 abajo.
> **Updated:** 2026-05-06 — v1.8: TASK-430 activa el runtime `next-intl` sin prefijar el portal privado. `src/i18n/*` resuelve locale con cookie `gh_locale` + `Accept-Language` + fallback `es-CL`, el App Router queda envuelto por `NextIntlClientProvider`, `<html lang>` usa locale efectivo y `en-US` ya cubre shell navigation + namespaces shared serializables. Ver Delta 2026-05-06c abajo.
> **Updated:** 2026-05-06 — v1.7: TASK-428 publica `GREENHOUSE_I18N_ARCHITECTURE_V1.md`: `next-intl` como librería App Router, portal privado state-only sin locale prefix por defecto, `en-US` como primera activación, `pt-BR` planned, y TASK-431 debe absorber `client_users.locale` legacy. Ver Delta 2026-05-06b abajo.
> **Updated:** 2026-05-06 — v1.6: TASK-811 recorta `src/config/greenhouse-nomenclature.ts` a navegación/product nomenclature + tokens visuales transicionales. Domain microcopy reutilizable se extrae a módulos type-safe en `src/lib/copy/*` (`agency`, `client-portal`, `admin`, `pricing`, `workforce`, `finance`, `payroll`). Ver Delta 2026-05-06 abajo.
> **Updated:** 2026-05-05 — v1.5: Quote Builder primitives extraction Sprint 3 (TASK-498). Tres primitives nuevos en `src/components/greenhouse/primitives/` (`EntitySummaryDock`, `CardHeaderWithBadge`, `FormSectionAccordion`) habilitan invoice / PO / contract / finiquito builders sin re-implementar el chasis. `ContextChipStrip` recibe `overflowAfter` con dropdown "+M más" canónico. Quote Builder migrado: `QuoteSummaryDock` queda como adapter thin sobre `EntitySummaryDock`, conservando API histórica. Ver Delta 2026-05-05 abajo.
> **Updated:** 2026-05-04 — v1.4: Quick Access Shortcuts Platform (TASK-553). Catálogo canónico `src/lib/shortcuts/catalog.ts` + resolver dual-plane (`module` + opcional `viewCode` + opcional `requiredCapability`) compartido entre Home `recommendedShortcuts` y header `<ShortcutsDropdown />`. Persistencia per-usuario en `greenhouse_core.user_shortcut_pins` vía `/api/me/shortcuts`. Ver Delta 2026-05-04 abajo.
> **Updated:** 2026-04-20 — v1.3: Floating UI (`@floating-ui/react` 0.27) introducido como stack oficial de positioning para popovers (TASK-509). Primer consumer: `TotalsLadder`. TASK-510 backlog migra el resto. Ver Delta 2026-04-20b abajo.
> **Updated:** 2026-04-20 — v1.2: `TotalsLadder` primitive extiende su API con `addonsSegment?: { count, amount, onClick, ariaExpanded } | null` (TASK-507) para renderizar un segmento interactivo inline dentro de la ladder de ajustes. Pattern: acciones contextuales viven con sus datos, no como chips flotantes separados. Ver Delta 2026-04-20 abajo.
> **Updated:** 2026-04-19 — v1.1: registry de primitives `src/components/greenhouse/primitives/` gana 3 componentes nuevos extraídos de `QuoteSummaryDock` (TASK-505). Ver Delta 2026-04-19 abajo.
## Delta 2026-06-07 — TASK-1050 Geometry foundations

Se agrego la referencia viva interna `/admin/design-system/geometry` para spacing/radius base. La pagina renderiza AXIS `Gap/Padding 1..16 + 25` desde `theme.spacing(N)`, AXIS `Border-Radius xs..xl` desde `theme.shape.customBorderRadius`, `Border-Round` como `9999px`/`50%`, y la extension Greenhouse `xxl=12` / `display=16` para superficies grandes. `xxl/display` viven en el theme y tipos MUI; no son valores AXIS upstream ni deben aplicarse a tablas, inputs, menus o cards densas. Scenario GVC: `design-system-geometry`.
