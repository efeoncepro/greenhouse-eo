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
| **Elevation / shadow tokens** (roles semánticos `none`/`raised`/`floating`/`overlay`/`modal`/`overflow` reservado) | `theme.greenhouseElevation.<role>` (SoT `src/components/theme/elevation-tokens.ts`) — las primitives leen un rol, no `Paper elevation={n}` / `theme.shadows[n]` | [GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md](../GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md) + HISTORIAL Delta 2026-06-07k · lab `/admin/design-system/elevation` |
| **Floating Action Dock** (acciones persistentes ancladas al viewport) | `NexaFloatingButton`, `ScrollToTop` + safe-area CSS vars; Nexa FAB usa mark animado + aura hover detrás del botón | HISTORIAL Deltas 2026-06-06c / 2026-06-09h |
| **Efeonce brand motion** | `EfeonceOrbitalLogoMark` (variants `static` / `orbitalSignature` / `ambient`, kinds `institutionalWordmark` / `motionSpecimen`) | HISTORIAL Delta 2026-06-09i · lab `/admin/design-system/efeonce-brand` · experimental asset copy `public/branding/experiments/efeonce-logo-full-orbit-motion-copy.svg` |
| **Nexa brand marks** | `GreenhouseNexaBrandMark` (kinds `askNexaBadge` / `badgeIcon` / `inlineMark` / `monoMark`) + `GreenhouseNexaAnimatedMark` (Rive/GSAP fallback) + `GreenhouseNexaAnimatedAskBadge` | HISTORIAL Deltas 2026-06-09d / 2026-06-09h · lab `/admin/design-system/nexa-brand` · assets `public/images/nexa-mark/*` |
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
| **Buttons** | `GreenhouseButton` (AXIS) + `GreenhouseAsyncActionButton` (compone Button) | HISTORIAL Deltas 2026-06-07d / 06-07e |
| **Utilities** | `GreenhouseActivityTimeline` | HISTORIAL Delta 2026-06-07b |
| **Summary / Quote builder** | `EntitySummaryDock`, `CardHeaderWithBadge`, `FormSectionAccordion`, `ContextChipStrip`, `TotalsLadder` | HISTORIAL Deltas 2026-05-05 / 2026-04-19 / 2026-04-20 |

> **Nota de límites:** Adaptive Sidecar ≠ Floating Surface ≠ Dialog. Sidecar = lane in-flow full-height que preserva el contexto; Floating Surface = UI contextual anclada y transitoria; `Dialog` modal sigue obligatorio para decisiones destructivas/irreversibles/legales/financieras. Floating Action Dock cubre acciones persistentes ancladas al viewport, distinto de Floating Surface. Floating Surface usa `motion: anchored` con CSS Tier 1 + tokens; no usa la Motion Primitive GSAP porque no es motion cinemática/orquestada.

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
- `GreenhouseThinkingBeat` es la primitive canónica para los tres dots de pensamiento/actividad breve. Variants oficiales: `inline`, `cluster`, `standalone`; kinds semánticos: `nexa`, `assistant`, `sync`, `neutral`. Usar cuando una superficie ya tiene el contexto visible y solo necesita comunicar que el asistente/sistema está preparando el siguiente mensaje. No reemplaza `GreenhouseLoadingSurface` para procesos largos, page/panel loading ni pipelines con pasos. Si vive dentro de una frase legible, usar `decorative`; si vive solo, mantener `role='status'` con `aria-label`. Nuevos colores/timings deben cambiarse en `greenhouse-thinking-beat-controller.ts`, no copiando dots locales.
- `GreenhouseTalentProfileDossier` se usa cuando una superficie necesita revisar o decidir sobre cobertura de una persona. No poblarlo con señales sin source-of-truth, freshness y política de visibilidad. Nuevos bloques/métricas deben entrar como prop explícito y degradar honestamente.
- `GreenhouseVerificationBadge` solo representa verificación real o una política aprobada de verificación. Nuevos labels, marcas o lockups deben entrar como kind oficial con copy bilingüe, `aria-label`, revisión de marca y GVC en `/admin/design-system/talent-profile`.
- `GreenhouseBreadcrumbs` es la primitive canónica para jerarquía de navegación. Todo breadcrumb nuevo debe importarse desde `@/components/greenhouse/primitives`; no crear breadcrumbs locales con MUI directo, links sueltos ni botones "volver" paralelos. Usar `kind='pageHierarchy'` para headers de página y `kind='workbenchHierarchy'` para superficies densas; el último item debe ser current page (`aria-current='page'`) y los ancestros deben ser links reales. El separator default es `/` según AXIS Figma; el wrapper legacy `Breadcrumb` conserva chevron compacto solo para compatibilidad y también delega en la primitive. No duplicar breadcrumbs con botones "volver" en la misma zona.
