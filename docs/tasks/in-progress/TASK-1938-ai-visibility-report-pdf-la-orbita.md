# TASK-1938 — Informe PDF del Grader de visibilidad en IA con «La órbita»

## Delta 2026-10-03 (noche) — el ops-worker no compilaba con el manifest de assets

- Desde `6ebf3d519`, `report-pdf-primitives.tsx` importa `public/branding/pdf/ai-visibility-assets.manifest.json`, que
  esbuild resuelve en el stage builder del ops-worker; ese stage no copiaba `public/`, y cuatro deploys de `develop`
  fallaron con «Could not resolve». Corregido en `f31f57d86` (`services/ops-worker/Dockerfile` copia el manifest al
  builder; el runtime ya copiaba `public/branding`). Si el manifest cambia de ruta, actualizar esa línea. — por trabajo
  en TASK-1975

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1938-ai-visibility-report-pdf-la-orbita.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `En producción desde el release 9a906a164677 (2026-10-04): Vercel en main y ops-worker-00763-6fv en a74fc50ab, que contiene 6ebf3d519 y f31f57d86. Verificado 2026-10-04 descargando por la ruta pública de producción el PDF de un informe real vigente de Efeonce Group (HTTP 200, 6 páginas, 252 KB, diseño La órbita); la descarga usa el mismo renderer que el adjunto del correo. Pendiente: abrir el adjunto del primer correo real enviado. Antes: code complete local 2026-10-03. Refresh react-pdf validado en 10 PDFs sintéticos; seis variantes ES/EN/PT-BR × cliente/prospecto, estados null/0/100 y texto largo. 108 tests focales PASS, TypeScript PASS, build PASS y recursos trazados completos. Suite general anterior: 18.148 PASS; su único fallo Manzanitas fue corregido con autorización del operador (metadata 0.4.10 → 0.4.15), check de 49 archivos y siete tests PASS; suite completa no repetida. Dossier y evidencia en docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/README.md. Sin push/envíos ni publicación; verificar adjunto real después de rollout autorizado.`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Seguimiento de anotaciones PDF — 2026-10-03

Identificador interno del puntaje retirado del texto público: versión legible, sin fallback a IDs desconocidos, preservando la procedencia del modelo. Chip de fecha centrado con contenedor independiente. Pie contrastado con la fuente aprobada: organización/período + burbuja URL + folio, sin Insights. Diez PDFs reexportados; cuatro suites / 49 tests PASS y lint focal PASS. Evidencia actualizada en el dossier; build final repetido y PASS antes del commit (`.next-local/build-20261003223513-37388`); la suite global del Status real conserva su corte histórico.

## Summary

El informe PDF del Grader de visibilidad en IA pasa al lenguaje visual de Efeonce Insights y de «La órbita», en dos
versiones: para no clientes (diagnóstico, cierra con «Agenda una reunión», que lleva a la agenda) y para clientes (parte del servicio: sin
oferta, cierra con su equipo y el próximo informe). Portada con la órbita que mide, veredicto como hallazgo y escala;
interiores en orden «respuesta primero» (qué hacer, por qué, dónde, mercado y fuentes). Sin lockup de Insights y sin
cambiar el motor de render (react-pdf).

## Delta 2026-09-29 — submarcas SEO/AEO y paleta Engine

- El operador aprobó las submarcas de producto SEO/AEO de Efeonce (SV360, AEO, AEO Assessment y AI Visibility Report;
  «la órbita vive en la O») y las canonizó en `@efeoncepro/axis-brand-assets` `0.4.2` (script
  `scripts/brand/build-seo-aeo-logos.mjs`, Lab `/references/seo-aeo/`). El documento **es** el Efeonce AI Visibility
  Report: sus portadas y encabezados llevan el lockup oficial `ai-visibility-report-lockup-*`, y bajo el veredicto va
  el lockup `aeo-lockup-*` con «Resultado del AEO Assessment».
- **Paleta de la línea Engine** (SEO y medición), aprobada con la aplicación «portada del AI Visibility Report»: fondo
  oscuro `#091951` (`efeonceGraphicLine.lines.engine.darkBg`) y acento `#0375db` (`accentOnDark`) en la órbita que mide,
  el anillo de la pregunta y la esfera de la respuesta; el eslogan de cierre es «Empower your Engine», al 64 % del logo.
  Reemplaza al turquesa de Growth de la propuesta anterior.
- Canvas actualizado: «Correo de Efeonce Insights», página «Informe del Grader (PDF)».

## Delta 2026-09-29 (b) — tres idiomas

El operador pidió «exactamente el mismo informe» en inglés y en portugués. El canvas tiene las tres versiones (páginas
«Informe del Grader (PDF)», «(inglés)» y «(portugués)»), cada una en sus dos audiencias. El PDF se renderiza en el idioma
del informe: `es` (es-CL, tuteo), `en` (en-US) y `pt-BR` (você). El intake público ya guarda `locale`
(`src/lib/growth/ai-visibility/public-intake/contracts.ts`) y el mercado del informe trae `market.locale`
(`report/contracts.ts`); hoy el renderer sólo sabe español. Reglas de la traducción aprobada: porcentajes sin espacio en
`en` y `pt-BR` («32%»); fechas en el formato de cada idioma; en `en` los niveles usan sólo el nombre del marco («Be Found»,
«Be Readable»…), en `es` y `pt-BR` el nombre local seguido del inglés; «Empower your Engine» y el lockup no se traducen.

## Delta 2026-09-29 (c) — diseño aprobado y órbita con color de gravedad

- El operador cerró el diseño y pidió canonizarlo. Las 24 hojas aprobadas (8 por idioma) están en
  `docs/ui/visual-directions/TASK-1938-ai-visibility-report-pdf-la-orbita/paginas/`, con la dirección en
  `TASK-1938-ai-visibility-report-pdf-la-orbita-direction.md` y las fuentes del canvas empaquetadas. Con esto quedan
  hechas la exportación y la dirección del Slice 1.
- **La órbita de la portada toma el color de la gravedad del puntaje.** Estela, esfera, halo y el punto de la etiqueta
  van en rojo, ámbar o verde según los umbrales de `recommendations.ts`. El anillo, la marca de partida y la cifra no
  cambian, y la etiqueta en texto acompaña siempre al color.
  - Sobre `#091951` los colores son `axisRamp.error[400]`, `axisRamp.warning[500]` y `axisRamp.success[400]`, todos
    ≥ 4,5:1.
  - Sin dato: anillo solo, «—» y la etiqueta «Sin dato».
  - Es una excepción acotada a la regla de estado sin semáforo de La órbita (skill `efeonce-graphic-line`, §3.4 y
    §3.10). Lámina: `portada-estados-de-la-orbita.png`.
- El canvas (versión 17) muestra las tres filas de idioma en la página «Informe del Grader (PDF)»; ya no hay páginas
  separadas por idioma.

## Delta 2026-09-29 (d) — canonizado en AXIS

El operador pidió llevar el informe a AXIS. AXIS lo publicó el mismo día: `main` `26097c5`, tag `v0.3.30`, registro
verificado. Desde aquí los valores y las reglas del documento salen de AXIS, no del canvas ni de esta task.

| Paquete | Versión publicada | Qué trae para este informe |
|---|---|---|
| `@efeoncepro/axis-tokens` | `0.3.30` | export nuevo `aiVisibilityReport` (anatomía: paleta, página, orden, capítulos, audiencias, geometría de la órbita de portada, encabezado y pie, contraportada, locales y `never`) y `efeonceGraphicLine.measureSeverity` |
| `@efeoncepro/axis-ui-contracts` | `0.3.30` | contrato nuevo `efeonce.ai-visibility-report` `0.1.0` (`candidate`): intent → manifiesto de seis páginas, 22 códigos de issue y 9 checks del adapter; `efeonce.graphic-line-orbit` pasa de `0.3.1` a `0.4.0` (medida con `severity`, `severityLabel`, `scaleVisible` y `glow`) |
| `@efeoncepro/axis-graphic-line` | `0.12.0` | `/report`: `aiVisibilityReportOrbitSvg` y `aiVisibilityReportSeverityColor` |
| `@efeoncepro/axis-brand-assets` | `0.4.3` | órbitas estáticas re-selladas; el dibujo no cambia |
| `@efeoncepro/axis-ui-registry` | `0.3.2` | registro al día |

- **`measureSeverity`:** sólo un puntaje con escala publicada puede colorear estela, esfera y halo. Sobre oscuro:
  `error[400]`, `warning[500]` y `success[400]`, cada uno ≥ 4,5:1 sobre `#091951`; sobre claro: `error[600]`,
  `warning[900]` y `success[500]`, cada uno ≥ 3:1. Anillo, partida y cifra conservan su color; la etiqueta es
  obligatoria y la escala, visible. Los umbrales son del productor (aquí, `recommendations.ts`): AXIS recibe la
  gravedad ya resuelta. Sin dato, sólo el anillo y «—». La marca de estado sigue sin semáforo.
- **Referencias:** Lab <https://axis.efeonce.org/references/ai-visibility-report/> (y `.json`); ADR de AXIS
  `docs/architecture/AI_VISIBILITY_REPORT_COMPOSITION_DECISION_V1.md` y guía `docs/agent-composition/ai-visibility-report.md`
  en el repo `axis-design-system`; en AXIS, `pnpm report:resolve` compone el manifiesto desde un intent.
- **Greenhouse todavía no fija este juego.** `develop` fija `axis-tokens` y `axis-ui-contracts` `0.3.29`,
  `axis-graphic-line` `0.11.0`, `axis-brand-assets` `0.4.1` y `axis-ui-registry` `0.3.1` (`package.json`, 2026-09-29).
  El renderer (`src/components/growth/ai-visibility/report-artifact/pdf/**`) no cambió. La adopción es el Slice 1.
- **Efecto del bump fuera del PDF:** el adapter de la órbita de Greenhouse
  (`scripts/creative/layout-compiler/graphic-line.mjs`) acepta sólo el contrato `efeonce.graphic-line-orbit` `0.3.1`
  (`SUPPORTED_CONTRACT_VERSION`) y lanza un error con cualquier otra versión. Con `axis-ui-contracts` `0.3.30` el
  contrato es `0.4.0`, así que el bump tiene que llevar el soporte de `0.4.0` en el mismo commit.

## Delta 2026-09-29 (e) — la órbita de la portada dibuja el recorrido y el juego sube a `v0.3.38`

- **Decidido por el operador (2026-09-29, «aplícalo en todas»):** toda órbita que mide dibuja además el **recorrido**,
  el arco desde las 12 hasta la esfera, bajo la estela y en su mismo color. En la portada: **3 px** (0,75 × la estela de
  4 px) al **60 %** de opacidad; al 100 % es el anillo completo y en 0 no existe. Con color de gravedad, el recorrido toma
  ese color. Cierra la Open Question del recorrido.
- **Canon en AXIS `v0.3.38`** (`main` `c92160b`, publicado y verificado el 2026-09-29):
  `efeonceGraphicLine.trajectory.measure.travelledPath` y `aiVisibilityReport.cover.orbit.travelled`
  (`axis-tokens` `0.3.38`); contrato `efeonce.graphic-line-orbit` `0.5.0` (`axis-ui-contracts` `0.3.38`); la receta
  `aiVisibilityReportOrbitSvg` ya lo pinta (`axis-graphic-line` `0.13.0`); órbitas estáticas re-selladas
  (`axis-brand-assets` `0.4.6`); `axis-ui-registry` `0.3.3`. El mismo release publicó los módulos de correo (TASK-1944).
- **El destino del bump cambia:** el Slice 1 fija el juego `v0.3.38` en vez del `v0.3.30`.
- **Estado real de Greenhouse (2026-09-29):** `develop` ya no fija `0.3.29`. Fija `axis-tokens` y `axis-ui-contracts`
  `0.3.37`, `axis-graphic-line` `0.11.0`, `axis-brand-assets` `0.4.5` y `axis-ui-registry` `0.3.1`. Con ese juego el
  contrato de la órbita ya es `0.4.0`, y el adapter `scripts/creative/layout-compiler/graphic-line.mjs` sigue aceptando
  sólo `0.3.1`: `node --test scripts/creative/layout-compiler/graphic-line.test.mjs` da 0 de 7 («Unsupported AXIS graphic
  line contract 0.4.0»). El contrato `0.4.0` entró con `9289cab0c`, y la suite no corre en CI. **El adapter tiene que
  aceptar `0.5.0`** en el mismo commit del bump.
- TASK-1944 hace el mismo bump y la misma subida del adapter. La que llegue primero lo hace y la otra lo verifica.

## Why This Task Exists

El Grader es lo primero que ve un prospecto de Efeonce y Efeonce Insights es lo que recibe cuando ya es cliente, pero
hoy se ven como dos marcas. El PDF del Grader (TASK-1273, pulido en TASK-1329) usa la paleta anterior (navy `#023c70` +
azul `#0375db`) con Geist y Poppins, y su portada dibuja el puntaje con un arco que se llena en proporción al valor:
el indicador de carga que «La órbita» prohíbe (un dato es la posición de la esfera sobre el anillo, con estela corta).
El operador pidió homologarlo (2026-09-29) y diseñarlo primero en el canvas.

## Goal

- Que el PDF del Grader se reconozca como la misma familia que los informes de Efeonce Insights.
- Que el puntaje se lea con la órbita que mide, la única órbita del documento.
- Que el documento cierre con contacto y eslogan, como las demás piezas de marca, sin tocar el correo ni el modelo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md` (nodos S3 y S14: esta task es el render PDF del report artifact)
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (reglas de la órbita: una por pieza, mide un dato
  real, nunca se llena como un indicador de carga, ningún texto la cruza)
- `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md` (familia visual de los informes)
- `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md` (tipografía y SSOT de marca)

Reglas obligatorias:

- Colores sólo desde `efeonceGraphicLine` (`@efeoncepro/axis-tokens`) y `axisSemanticHex`, mapeados una vez en
  `report-pdf-tokens.ts`; ningún HEX nuevo escrito en el componente.
- Logo de Efeonce y burbuja URL desde `@efeoncepro/axis-brand-assets`; redes desde `EFEONCE_SOCIAL_LINKS`
  (`src/config/efeonce-brand.ts`); nunca copias a mano ni URLs repetidas.
- Sin el lockup de Efeonce Insights: el Grader no es una edición de Insights.
- Una cifra ausente nunca se dibuja como cero (puntaje, nivel o dimensión `null` → «—» y «Sin dato»).
- Copy nuevo específico del PDF en `src/lib/copy/ai-visibility-report-pdf.ts`; `growth.ts` conserva el canon de plantillas reconocidas para no cambiar web, email ni snapshots históricos.

## Normative Docs

- `docs/ui/wireframes/TASK-1938-ai-visibility-report-pdf-la-orbita.md`
- Canvas de la propuesta: <https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd>, página «Informe del Grader (PDF)».
- Canon en AXIS (`v0.3.30`; recorrido de la órbita en `v0.3.38`): Lab <https://axis.efeonce.org/references/ai-visibility-report/>; contrato
  `efeonce.ai-visibility-report` `0.1.0` y guía `docs/agent-composition/ai-visibility-report.md` en el repo
  `axis-design-system`. Donde el canvas y AXIS difieran, se reporta; no se copia el valor del canvas.
- `.claude/skills/efeonce-graphic-line/SKILL.md` y `references/criteria.md`
- Memoria operativa de react-pdf: un `<Svg>` sobre `Page.backgroundColor` corrompe el render; el alpha del trazo se
  pierde sobre navy (ver el comentario de `gaugeTrackOnNavy` en `report-pdf-tokens.ts`).

## Dependencies & Impact

### Depends on

- Aprobación del operador de la propuesta del canvas (bloqueante de la implementación, no de la planificación).
- `@efeoncepro/axis-tokens` y `@efeoncepro/axis-brand-assets` ya instalados en Greenhouse, pero en un juego anterior:
  `develop` fija `axis-tokens` `0.3.37` y `axis-brand-assets` `0.4.5` (`package.json`, 2026-09-29). El juego de AXIS
  `v0.3.38`, que trae el informe con el recorrido de la órbita, se fija en el Slice 1 (Delta (e)).

### Blocks / Impacts

- Correo del informe del Grader (TASK-1250): recibe el mismo adjunto con otro diseño; su contrato no cambia.
- `report-artifact/web` y `report-artifact/print` (TASK-1252) quedan con el diseño anterior hasta su follow-up: el
  master flow EPIC-020 pide lenguaje visual compartido entre web, print y PDF.
- TASK-1672 (report artifact de auditoría SEO) y TASK-1861 (operabilidad MCP del Grader): sin cambio de contrato.

### Files owned

- `src/components/growth/ai-visibility/report-artifact/pdf/AiVisibilityReportPdf.tsx`
- `src/components/growth/ai-visibility/report-artifact/pdf/report-pdf-tokens.ts`
- `src/lib/finance/pdf/register-fonts.ts` (sólo si se agregan instancias de Bricolage)
- `src/lib/copy/growth.ts` (copy nuevo de pie y contraportada)
- `docs/ui/wireframes/TASK-1938-ai-visibility-report-pdf-la-orbita.md`
- `docs/ui/visual-directions/TASK-1938-ai-visibility-report-pdf-la-orbita*`
- `docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/`

## Current Repo State

### Already exists

- Renderer react-pdf de 4 páginas A4: `src/components/growth/ai-visibility/report-artifact/pdf/AiVisibilityReportPdf.tsx`
  (portada navy con `Gauge`, niveles + canales, brecha + dimensiones + señales, mercado + plan + procedencia).
- Tokens PDF-locales: `report-pdf-tokens.ts` (paleta anterior + `axisSemanticHex` para gravedad).
- Entrada pública del renderer: `render-ai-visibility-report-pdf.ts`, consumida por
  `src/lib/growth/ai-visibility/public-delivery/email/build-report-attachment.ts`.
- Test anti-fuga del PDF: `report-artifact/__tests__/report-artifact-pdf-no-leak.test.tsx`.
- Fixture del modelo: `report-artifact/fixtures.ts`.
- Fuentes registradas: Geist y Poppins en `src/lib/finance/pdf/register-fonts.ts`; Bricolage sólo como TTF variable
  (`src/assets/fonts/BricolageGrotesque-Variable.ttf`).
- Propuesta visual aprobada en el canvas (seis páginas por variante, cifras ilustrativas del fixture) y canonizada en AXIS `v0.3.30`.

### Gap

- La portada dibuja el puntaje con un arco que se llena (`Gauge`), contra la regla de la órbita.
- La paleta y la tipografía no son las de «La órbita» ni las de los informes de Insights.
- No hay contraportada: el contacto es una línea de texto en la portada.
- react-pdf no elige ejes de una fuente variable: si se adopta Bricolage hacen falta instancias estáticas por peso.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/components/growth/ai-visibility/report-artifact/pdf/**` (render server-only dentro del portal y
  del consumer del correo)
- Future candidate home: `undecided`
  (el follow-up de motor podría moverlo a un catálogo del Artifact Composer; esta task no toma esa decisión)
- Boundary: `renderAiVisibilityReportPdf({ model, header, context? })`; `context` es metadata visual opcional, no amplía disclosure ni modifica el modelo. Consumidor autorizado: `build-report-attachment.ts`.
- Server/browser split: el renderer es `server-only`; ningún Client Component lo importa
- Build impact: `none` (sin dependencia nueva; a lo sumo archivos de fuente estáticos en `src/assets/fonts/`)
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: prospecto, lead o cliente que recibe el informe del Grader por correo; operador comercial que lo reenvía.
- Momento del flujo: después de pedir el diagnóstico público o de que el operador lo envíe (nodos S3/S14 de EPIC-020).
- Resultado perceptible esperado: el documento se ve de la misma familia que un informe de Efeonce Insights y el
  puntaje se entiende de un vistazo.
- Friccion que debe reducir: la discontinuidad visual entre el diagnóstico gratuito y el producto para clientes.
- No-goals UX: sumar métricas o datos, cambiar web/print o el flujo de envío. El orden narrativo de seis páginas es el aprobado.

### Surface & system decision

- Surface: documento PDF A4 adjunto al correo del informe.
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — no es una vista del portal.
- Primitive decision: `extend` — el renderer react-pdf existente; sin primitive nueva.
- Adaptive density / The Seam: `no aplica` — página de tamaño fijo.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `src/lib/copy/ai-visibility-report-pdf.ts`; plantillas reconocidas desde `growth.ts`.
- Access impact: `none`.

### State inventory

- Default: informe completo en seis páginas (portada, cuatro interiores y contraportada).
- Loading: no aplica (el PDF se genera en el servidor antes del envío).
- Empty: puntaje `null` → anillo sin arco ni esfera y «—»; secciones sin datos no se dibujan.
- Error: si el render falla, el correo sigue el camino de error actual de `build-report-attachment.ts` (sin cambio).
- Degraded / partial: motores sin respuesta → «N de M motores respondieron» si ambos conteos están verificados; legacy sin responded declara cobertura no verificada. Dimensión sin dato → «Sin dato».
- Permission denied: fuera del PDF; token expirado/inexistente conserva 404 indistinto, rate limit 429; flag/consent/report gates de envío intactos. No se emite un documento de error.
- Long content: nombres largos ajustan línea; nunca «…».
- Mobile / compact: 390 px no aplica a documento A4 fijo; lectura mediante visor/zoom. Informe responsive web fuera del scope.
- Keyboard / focus: no aplica; enlaces reales en la contraportada.
- Reduced motion: no aplica (documento estático).

### Interaction contract

- Primary interaction: leer; los enlaces de URL y redes abren su destino.
- Hover / focus / active: no aplica.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no aplica.
- Layout morph: no aplica.
- Stagger: no aplica.
- Timing / easing token: no aplica.
- Reduced-motion fallback: no aplica (sin motion).
- Non-goal motion: no se anima la órbita.

### Implementation mapping

- Route / surface: PDF de `renderAiVisibilityReportPdf`.
- Primitive / variant / kind: renderer react-pdf existente (`extend`).
- Component candidates: `Gauge` → órbita que mide; nueva página de contraportada; encabezado y pie corridos; disco de
  logo de motor; ícono del Trazo (SVG de `resolveIcon` convertido a primitivas `Svg` de react-pdf).
- Copy source: `src/lib/copy/ai-visibility-report-pdf.ts`; copy histórico desconocido se conserva literalmente.
- Data reader / command: `ReportArtifactModel` sin cambios de forma; `report/pdf-presentation-context.ts` lee metadata visual después de la autorización existente.
- API parity: sin acción de negocio nueva; el adjunto sigue saliendo del mismo contrato.
- Access / capability: sin cambios.
- States to implement: los de la tabla de State Copy del wireframe.

### GVC scenario plan

- Scenario file: no aplica (sin ruta de portal).
- Route: no aplica.
- Viewports: desktop documental A4 a 96 dpi, 794×1123 px; 390 px mobile no aplicable a PDF fijo, sin ruta de portal.
- Quality profile: `premium`.
- Required steps: render local con fixtures sintéticos y abrir cada página; informe real de staging sólo como verificación pendiente de rollout autorizado, nunca consulta/envío real para QA local.
- Required captures: cada página en color y en escala de grises, lado a lado con la hoja aprobada del canvas.
- Required `data-capture` markers: no aplica.
- Assertions: cifras iguales al modelo; fuentes embebidas; test anti-fuga verde.
- Scroll-width checks: no aplica a PDF.
- Reduced-motion / focus evidence: no aplica.
- Review dossier: `docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/README.md`, en preparación por root; no equivale a evidencia entregada.
- Baseline decision / surface ID: `growth.ai-visibility.report-pdf`; renderer anterior de cuatro páginas en `.captures/task-1938/baseline.pdf` como regresión de datos, 24 hojas aprobadas como referencia de fidelidad. Baseline nueva sólo tras aceptación visual.

### Design decision log

- Decision: homologar al lenguaje visual de Insights y «La órbita» sin el lockup de Insights, manteniendo react-pdf.
- Alternatives considered: migrar ya al Artifact Composer (descartado para esta task: render de a una salida cada 2
  minutos y el correo adjunta el PDF en el momento); sólo cambiar la paleta (descartado: dejaría el indicador de carga).
- Why this pattern: continuidad prospecto → cliente con el menor riesgo operativo.
- Reuse / extend / new primitive: `extend` del renderer.
- Open risks: instancias estáticas reproducibles de Bricolage; fidelidad del halo en PDF real; contexto de presentación comercial distinto del audience de disclosure. Resolución y límites: plan TASK-1938.

### Visual verification

- GVC scenario: no aplica; evidencia por PDF real.
- Viewports: A4.
- Required captures: seis páginas por variante, en color y en gris.
- Required `data-capture` markers: no aplica.
- Scroll-width check: no aplica.
- Accessibility/focus checks: contraste AA en papel y en tinta; gravedad nunca sólo por color.
- Before/after evidence: PDF actual vs PDF nuevo con el mismo fixture.
- Known visual debt: web y print siguen con el diseño anterior hasta su follow-up.
- Visual scorecard: `docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

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

### Delta de ejecución 2026-10-03

El plan aprobado de `docs/tasks/plans/TASK-1938-plan.md` actualiza los supuestos siguientes: no se bajan los paquetes instalados; la órbita usa primitivas SVG con los tokens actuales y la anatomía editorial adicional sale de una proyección generada de AXIS. El adapter de campañas ajeno queda fuera. El contexto visual de cliente es aditivo en renderer/consumers y no altera el modelo ni los gates o efectos del envío. La tendencia continúa bajo la política vigente de attachment. El eslogan Engine usa 11.263 em. Estas resoluciones prevalecen sobre las versiones y restricciones de implementación históricas en los slices y AC. UI mapping, escenarios PDF y decisiones cerrados en este plan; readiness documental validada con task:lint, no equivale a aceptación visual.

#### Avance del slice de presentación y contexto

- `report-pdf-presentation.ts` proyecta los datos públicos existentes sin mutar `ReportArtifactModel`: porcentaje crudo de `viewFacts.sharePct`, etiquetas porcentuales enteras, cobertura sin confundir cero con ausencia y las cuatro categorías de sentimiento. `resolveSeverity` resuelve sólo las etiquetas PDF con 40/70; el puntaje general conserva la gravedad del productor. El umbral 45 anterior del modelo compartido queda fuera del refresh.
- `ai-visibility-report-pdf.ts` centraliza los tres idiomas y el default único de Julio Reyes. Traduce sólo plantillas de headline, brecha, acción y disclaimer reconocidas por igualdad; texto histórico o personalizado desconocido permanece literal. La proyección mantiene `trend: null` por disclosure del attachment y distingue histórico oculto de primera medición.
- `pdf-presentation-context.ts` verifica `run → profile → organización` y usa `getOrganizationCommercialFacts`; un vínculo por sí solo no prueba que sea cliente. Operator reutiliza sus facts sólo si coinciden con la organización vinculada. `snapshot.asOf` y `snapshot.publicReport.provenance.market.locale` son la primera procedencia de fecha/idioma; si falta locale, usa run, perfil y finalmente `es`.
- Logo sólo desde el byte reader de sistema existente: asset adjunto de tipo `organization_logo`, ownership exacto, MIME permitido y máximo 2 MiB. Se normaliza a PNG con límite de píxeles y bytes; sin logo o ante fallo se conserva nombre/audiencia y se registra sólo un error redactado. `purpose` distingue Insights de AI Visibility sin modificar los controles. El logo ordinario requiere lecho claro; no se recolorea.
- Identidad contradictoria o ausente falla cerrado por los caminos de error existentes. No es un fallback a prospecto: los snapshots válidos heredados ya tienen FK obligatorias a run/perfil; run antiguo sin organización sigue siendo prospecto. La ausencia de una fecha de entrega acordada omite «Próximo informe» y nunca reutiliza `recurringRegradeNextAt`.
- Adjunto, descarga, dispatch y operator transportan únicamente contexto visual opcional. Flag, consentimiento, estado del reporte, claim, destinatarios, idempotencia y efectos de email/CRM conservan su lógica. No hay consulta histórica, consulta a proveedores, persistencia nueva ni cambio de API pública.
- Evidencia local del slice: 7 suites / 71 pruebas PASS (presentación, reader, dispatch, descarga, ejecución operator, command original y lector de logo). IO mockeada, sin DB/correos reales; ESLint de los archivos del slice y `git diff --check` PASS. Esto no acredita los píxeles, el PDF exportado ni el rollout.

### Slice 1 — Dirección aprobada y sellada

- Fijar en Greenhouse el juego de AXIS `v0.3.38` (Delta (e)): `@efeoncepro/axis-tokens` y
  `@efeoncepro/axis-ui-contracts` `0.3.38`, `@efeoncepro/axis-graphic-line` `0.13.0`, `@efeoncepro/axis-brand-assets`
  `0.4.6` y `@efeoncepro/axis-ui-registry` `0.3.3` (reemplaza al juego `v0.3.30` de la versión anterior de este
  slice). Se instala con una credencial efímera autorizada por el operador, según
  `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`. Los lockups se leen desde el paquete.
- En el mismo commit del bump:
  - Llevar el adapter `scripts/creative/layout-compiler/graphic-line.mjs` al contrato `efeonce.graphic-line-orbit`
    `0.5.0` (medida con gravedad y recorrido), porque hoy rechaza toda versión distinta de `0.3.1` y ya está rojo con
    el juego fijado.
  - Correr `pnpm brand:tokens`, `pnpm glitch:tokens` y `pnpm manzanitas:tokens`, con sus `--check`, como exige la regla
    de todo bump de `axis-tokens` (runbook, Delta 2026-09-28 (g)).
- Corregir `report-artifact/fixtures.ts` para que la gravedad coincida con los umbrales de `recommendations.ts`.
- ~~Exportar las hojas aprobadas del canvas y escribir la dirección~~: hecho el 2026-09-29 (24 hojas en tres idiomas y
  `TASK-1938-ai-visibility-report-pdf-la-orbita-direction.md`); el wireframe está al día.

### Slice 2 — Tokens y fuentes

- Reescribir `report-pdf-tokens.ts` con la paleta de «La órbita» desde `efeonceGraphicLine` y la gravedad desde
  `axisSemanticHex`.
- Leer de `@efeoncepro/axis-tokens` `0.3.38` la anatomía del documento (`aiVisibilityReport`: paleta, página, orden,
  capítulos, audiencias, encabezado y pie, contraportada y locales) y el color de gravedad de la órbita
  (`efeonceGraphicLine.measureSeverity`). `report-pdf-tokens.ts` sigue siendo el único mapa hacia el renderer.
- La órbita de la portada tiene dos caminos, y el slice elige uno:
  - Tomar el SVG de `aiVisibilityReportOrbitSvg` (`@efeoncepro/axis-graphic-line/report` `0.13.0`, ya con el
    recorrido) y rasterizarlo o convertirlo antes del render, porque react-pdf no recibe un string SVG.
  - Reproducirla con primitivas `Svg` de react-pdf desde `aiVisibilityReport.cover.orbit`, con el color de
    `aiVisibilityReportSeverityColor` o `measureSeverity`.
- En los dos casos la geometría y el color salen del paquete; ningún valor se copia a mano.
- La composición del documento se puede validar contra `resolveAiVisibilityReportIntent`
  (`@efeoncepro/axis-ui-contracts` `0.3.38`), con un intent armado desde el modelo. Un `status: 'invalid'` significa que
  el documento no cumple el contrato. Cómo lo trata el renderer (test, guarda en runtime o ambos) se decide en el plan.
- Si se aprueba Bricolage: generar instancias estáticas por peso, registrarlas en `register-fonts.ts` y documentar su
  procedencia junto a `BricolageGrotesque-SOURCE.md`.

### Slice 3 — Audiencia y portadas

- Entrada de audiencia (`prospect | client`) en `renderAiVisibilityReportPdf`, resuelta antes del render desde el
  vínculo del informe con una organización cliente (ver Open Questions); logo del cliente y responsable de la cuenta
  cuando existen.
- Dos portadas: rótulo, identidad («Preparado para» + logo en la de cliente) y tendencia según la audiencia.
- Reemplazar `Gauge` por la órbita que mide (esfera en `score × 3,6°`, estela de 50°, recorrido desde las 12 de 3 px al
  60 %, halo) con el estado `null`.
- Escala con los umbrales de `recommendations.ts` y veredicto como hallazgo (reglas sobre los datos, con
  `headline.frame` de respaldo).
- Firma con el logo de Efeonce desde `axis-brand-assets`.

### Slice 4 — Páginas interiores y contraportada

- Logos de los motores en disco (portada y «Canales de respuesta»), con la lupa de Google AI Mode para Google AI
  Overview; copias de ChatGPT y Claude con color literal.
- Íconos del Trazo de AXIS en niveles, dimensiones, cifras de calidad, procedencia y encabezados.

- Encabezado y pie corridos; cuatro interiores en orden «respuesta primero»: 02 qué hacer (brecha con evidencia +
  plan con la dimensión que mueve y su peso), 03 por qué (dimensiones con peso, barras navy, gravedad en etiquetas; y
  calidad), 04 dónde (niveles con su eje y su puntaje calculado desde sus dimensiones; motores), 05 mercado (participación
  de voz en %, fuentes que sostienen la respuesta, procedencia).
- Nombres de las dimensiones en español en `src/lib/copy/growth.ts`.
- Dos contraportadas con la voz de la línea: prospecto con «Agenda una reunión» (a `/contacto/`), burbuja URL y redes de
  `EFEONCE_SOCIAL_LINKS`; cliente con responsable de la cuenta y próximo informe, sin oferta. Bloque de marca al 64 %.

### Slice 4b — Tres idiomas

- Diccionarios de copy del informe en `es`, `en` y `pt-BR` (en `src/lib/copy/growth.ts` o su equivalente por locale),
  con el texto aprobado en el canvas; el renderer elige el idioma desde el locale del informe [verificar la fuente:
  `market.locale` del informe o `locale` del intake] y cae a `es` si no hay uno soportado.
- Fechas y porcentajes con el formato de cada idioma (`Intl`), nunca armados a mano.

### Slice 5 — Evidencia y documentación

- PDF con el fixture y con un informe real de staging, en color y en gris, lado a lado con las hojas aprobadas;
  dossier y scorecard.
- Actualizar la documentación funcional del informe del Grader y el master flow EPIC-020 (nota de que web/print
  quedan pendientes).

## Out of Scope

- Migrar el render al Artifact Composer (follow-up de motor).
- Rediseñar `report-artifact/web` y `report-artifact/print` (follow-up de paridad).
- Cambiar el modelo `ReportArtifactModel`, el correo del informe o su lógica de envío.
- Agregar secciones, métricas o recomendaciones nuevas.
- Usar el lockup de Efeonce Insights o presentar el Grader como una edición de Insights.

## Detailed Spec

El detalle región por región, los estados y el mapeo visual viven en el wireframe
`docs/ui/wireframes/TASK-1938-ai-visibility-report-pdf-la-orbita.md`.

Geometría de la órbita que mide (misma regla que el correo y el informe live de Insights): anillo de radio `r`, marca a
las 12, ángulo del valor `θ = score × 3,6°` en sentido horario desde las 12, esfera en
`(cx + r·sin θ, cy − r·cos θ)`, arco de estela desde `θ − 50°` hasta `θ`, halo radial en la esfera. Bajo la estela va el recorrido: arco desde las 12
hasta `θ`, en el color de la estela, de 3 px al 60 % (`aiVisibilityReport.cover.orbit.travelled`). Con `score = 100`
la esfera queda a las 12 y el recorrido es el anillo completo; con `score = null` no hay arco, recorrido ni esfera.

En react-pdf, dibujar el fondo de la portada con un `View` y no con `Page.backgroundColor` (el `Svg` sobre fondo de
página se corrompe), y usar colores opacos premezclados para trazos translúcidos sobre fondo oscuro.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (dirección aprobada) → Slice 2 (tokens y fuentes) → Slices 3 y 4 → Slice 5.
- Ningún slice de código empieza antes de la aprobación del operador: sin ella no hay contrato de fidelidad.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| react-pdf dibuja mal la órbita o el halo sobre fondo oscuro | UI (PDF) | medium | fondo con `View`, colores opacos premezclados, halo con gradiente radial probado o círculos concéntricos | revisión visual del PDF real |
| Bricolage variable se ve en un solo peso | UI (PDF) | high si se adopta | instancias estáticas por peso | revisión visual; test que verifica la fuente embebida |
| El PDF crece de 4 a 6 páginas y pesa más en el adjunto | email | low | medir el tamaño antes y después; fuentes con subconjunto | tamaño del buffer en el test |
| Web y print quedan con otro diseño que el PDF | UI | high (esperado) | follow-up de paridad declarado; nota en el master flow | revisión del master flow |
| Falla el render y el correo no sale | email | low | el camino de error de `build-report-attachment.ts` no cambia; test del renderer con el fixture y con estados `null` | errores del consumer reactivo del correo |

### Feature flags / cutover

- Sin flag: el cambio es visual sobre el mismo contrato y se revierte con un revert del PR. Si el operador quiere
  comparar en producción, se puede sumar un flag temporal en el renderer y registrarlo en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir el commit de documentación | minutos | sí |
| Slice 2 | revert del PR (tokens y fuentes) | < 15 min + deploy | sí |
| Slice 3 | revert del PR | < 15 min + deploy | sí |
| Slice 4 | revert del PR | < 15 min + deploy | sí |
| Slice 5 | revertir el commit de documentación | minutos | sí |

### Production verification sequence

1. Render local con el fixture y los estados `null`; revisar las seis páginas.
2. En staging, pedir un informe real del Grader y abrir el PDF adjunto página por página.
3. Promover con el release normal; en producción, abrir el adjunto del primer informe enviado.

### Out-of-band coordination required

- Aprobación del operador de la propuesta del canvas y de las tres decisiones abiertas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El operador aprobó la propuesta del canvas y las hojas quedaron en `docs/ui/visual-directions/` (2026-09-29: 24 hojas nativas en `es`, `en` y `pt-BR`, más la lámina de estados de la órbita).
- [x] `UI ready: yes` acredita dirección aprobada, implementation mapping, plan de evidencia y decision log; no acredita aceptación visual. El wireframe explicita PDF A4 desktop, 390 px mobile no aplicable y estados externos preservados. `pnpm task:lint --task TASK-1938` debe quedar sin hallazgos después de actualizar el mapping.
- [x] La portada dibuja el puntaje con la esfera en `score × 3,6°` y estela de 50°; sin disco relleno ni gauge de carga; el recorrido aprobado conserva su arco semántico.
- [x] Bajo la estela, la portada dibuja el recorrido desde las 12 hasta la esfera, en el color de la estela, de 3 px al
  60 % de opacidad (`aiVisibilityReport.cover.orbit.travelled`): anillo completo con 100 y nada con 0 o sin dato.
- [x] Con puntaje `null` la portada muestra el anillo sin arco ni esfera, «—» sin «de 100» y la etiqueta «Sin dato».
- [x] Estela, esfera, halo y punto de la etiqueta de la portada toman el color de la gravedad del puntaje, con los umbrales de `recommendations.ts` y los colores `axisRamp.error[400]`, `axisRamp.warning[500]` y `axisRamp.success[400]`. El anillo, la marca de partida y la cifra no cambian, y la etiqueta en texto siempre acompaña al color. Cada estado coincide con `portada-estados-de-la-orbita.png`.
- [x] Ningún nivel ni dimensión sin dato se muestra como 0.
- [x] `report-pdf-tokens.ts` toma fondo y acento de la línea Engine (`efeonceGraphicLine.lines.engine`) y la gravedad de `efeonceGraphicLine.measureSeverity`; ningún HEX escrito a mano.
- [x] Portadas y encabezados usan el lockup oficial `ai-visibility-report-lockup-*` y la línea del AEO Assessment el `aeo-lockup-*`, leídos de `@efeoncepro/axis-brand-assets` `0.4.15`; el cierre dice «Empower your Engine».
- [x] El documento no usa el lockup de Efeonce Insights.
- [x] La contraportada toma las redes de `EFEONCE_SOCIAL_LINKS` y el logo y la burbuja de `axis-brand-assets`.
- [x] El eslogan va en bloque debajo del logo de Efeonce, al 64 % de su ancho (cuerpo = 0,64 × logo ÷ 11,263 em (Engine)), separado 1,35 veces su cuerpo; nunca como texto a cuerpo fijo.
- [x] Cada motor evaluado (ChatGPT, Claude, Gemini, Perplexity, Google AI Overview) aparece con su logo oficial en la portada y en «Canales de respuesta»; Google AI Overview usa la lupa de Google AI Mode de AXIS, nunca el logo de Gemini.
- [x] Los íconos son del Trazo de AXIS (`resolveIcon`), en reposo, y cada grupo pasa `auditIconGroup`; ninguno dibujado a mano.
- [x] El copy nuevo específico del PDF vive en `src/lib/copy/ai-visibility-report-pdf.ts`, incluidos los nombres de dimensiones en los tres idiomas. Evidencia: proyección y tests de locale/copy; el texto histórico desconocido permanece literal.
- [x] El PDF exportado sale en `es`, `en` y `pt-BR` según el locale del informe, con texto reconocido aprobado, fechas y porcentajes enteros formateados con `Intl`, y cae a `es` cuando no está soportado. Evidencia: seis PDFs y metadata en el dossier, más prueba de fallback de locale.
- [x] Existen dos versiones exportadas por audiencia comercial verificada; cliente sin CTA comercial/redes/oferta, prospecto con «Agenda una reunión» y UTM hacia `efeoncepro.com/contacto/`. Evidencia: seis contraportadas, enlaces extraídos y tests de reader/dispatch/operator.
- [x] La contraportada de cliente muestra al responsable desde un único valor configurable (Julio Reyes, Managing Director & GTM). Evidencia: tres PDFs cliente, copy central y test del default.
- [x] La tipografía es la canónica de «La órbita» (Bricolage 760 + Poppins), registrada en `register-fonts.ts` con instancias estáticas por peso.
- [x] La gravedad de puntaje, niveles, dimensiones y motores sale de los umbrales de `recommendations.ts` (< 40 crítico, < 70 atención) y la portada muestra esa escala.
- [x] El PDF conserva exactamente el puntaje de cada nivel del modelo vigente, sin recalcular métricas (límite autorizado 03/10); un nivel sin dimensiones medidas muestra «Sin dato» y el de operabilidad sin probes «En cobertura».
- [x] Sin histórico la portada dice «Primera medición» y nunca «▲ 0»; con histórico excluido por la política de attachment no se inventa primera medición ni delta. Evidencia: test de la proyección y exportaciones; attachment no expone histórico oculto.
- [x] Las barras son navy y la gravedad va en etiquetas con punto de color.
- [x] El pie de cada página interior queda dentro de la hoja (medido en el PDF real).
- [x] La página 05 muestra la participación de voz en porcentaje y las fuentes citadas de `citationSourceBreakdown`.
- [x] `renderAiVisibilityReportPdf` y `build-report-attachment.ts` conservan compatibilidad con `{ model, header }` y reciben `context?` aditivo. Evidencia: contratos de descarga/dispatch/operator y diez exports auditados con hash del modelo sin mutación.
- [x] `report-artifact-pdf-no-leak.test.tsx` sigue verde.
- [x] Se conserva el juego instalado de AXIS: tokens `0.3.41`, contracts `0.3.40`, graphic-line `0.11.0`, brand-assets `0.4.15`, registry `0.3.1`. El Delta 03/10 sustituye el bump histórico: no se degradan versiones ni se modifica el adapter de campañas. La anatomía editorial faltante sale del productor AXIS local, exportada con hashes; publicación/adopción del paquete equivalente queda como continuidad.
- [x] Sincronización Manzanitas corregida por autorización explícita del operador (03/10): `pnpm manzanitas:tokens` sólo cambia `source.versions.@efeoncepro/axis-brand-assets` de `0.4.10` a `0.4.15`. `--check` PASS sobre 49 archivos; siete tests de sincronización PASS. Sin cambios en CSS, logos, íconos, compiler ni dependencias. La suite general no se repitió por este ajuste de metadata.
- [x] El renderer lee la anatomía del documento de `aiVisibilityReport` y el color de gravedad de
  `efeonceGraphicLine.measureSeverity` (`axis-tokens` `0.3.41` más extensión editorial generada y sellada), sin HEX ni medidas copiadas del canvas.
- [x] La órbita de la portada sale de `aiVisibilityReportOrbitSvg` o se reproduce desde `aiVisibilityReport.cover.orbit`,
  con geometría canónica probada y exports crítico, atención, óptimo y sin dato.
- [x] Un intent armado desde el modelo resuelve `status: 'resolved'` con `resolveAiVisibilityReportIntent`
  (`axis-ui-contracts` `0.3.40`, estados representables sin ampliar disclosure) para las dos audiencias y los tres idiomas del fixture, verificado por un test.
- [x] El dossier tiene las ocho hojas de cada idioma en color y en gris, lado a lado con las hojas aprobadas, y el scorecard.

Evidencia común de los criterios locales: [dossier](../../ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/README.md), manifest, diez PDFs, 24 comparaciones color/gris, scorecard y 108 pruebas focales. Los criterios de rollout no se tildan por evidencia local.

## Verification

Estado de comandos y límites: [verificación](../../ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/verification.md).

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/components/growth/ai-visibility`
- `pnpm test` completo y `pnpm build` antes de cerrar
- PDF real de staging abierto página por página

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] El master flow `EPIC-020-AEO-PROGRAM-UI-FLOW.md` registra que web y print siguen con el diseño anterior.

## Follow-ups

- Paridad de `report-artifact/web` y `report-artifact/print` con el nuevo diseño (continuidad cross-surface de EPIC-020),
  incluida la corrección del logo de Google AI Overview en el web (hoy usa el de Gemini).
- Cuando la página de agenda renovada esté publicada, cambiar el destino del botón de `/contacto/` a esa página
  (idealmente con un enlace que abra el agendamiento directo).
- Responsable de cuenta por cliente: reemplazar el valor único por la asignación real cuando exista.
- Motor: evaluar pasar el informe del Grader a un catálogo del Artifact Composer cuando el render admita más de una
  salida por ciclo o el correo pueda enviar el enlace primero y el PDF después (task `backend-data` aparte).

## Open Questions

- Resuelta (operador, 2026-09-29): tipografía **canónica de «La órbita»** (`efeonceGraphicLine.type`): Bricolage
  Grotesque 760 para respuesta, titulares y cifras; Poppins 300 para la pregunta y 400/500 para el texto. No Geist.
- Resuelta en la propuesta 2026-09-29: el turquesa no va en texto sobre papel; «Tu marca» y las barras van en navy.
- Resuelta (operador, 2026-09-29): **el Grader ya identifica al cliente cuando el informe viene de uno**, con su país y
  su logo: el perfil guarda organización, país y mercado (`src/lib/growth/ai-visibility/provision-profile.ts`) y el
  store resuelve el logo de la organización (`resolveOrganizationLogoUrl`, `src/lib/growth/ai-visibility/store.ts`).
  La audiencia se deriva de ese vínculo; no hace falta una task de backend.
- Resuelta (operador, 2026-09-29): **responsable de la cuenta, de momento Julio Reyes, Managing Director & GTM
  (`jreyes@efeoncepro.com`)** para todos los clientes, hasta que el operador asigne responsables por cuenta. El valor
  se declara en un solo lugar (configuración o copy), nunca repetido en el renderer, para reemplazarlo sin tocar diseño.
- Resuelta (operador, 2026-09-29): el botón **lleva a la agenda, no al correo**. Mientras la página de agenda se
  renueva, el destino es `https://efeoncepro.com/contacto/`, que abre el pop up de agendamiento (HubSpot Meetings con
  el estilo propio de Efeonce), con UTM `utm_source=ai-visibility-grader&utm_medium=pdf&utm_campaign=grader-report&utm_content=contraportada`.
  El texto es «Agenda una reunión» (el brief de contacto no fija duración; «30 minutos» se retiró).
- Decidida en la task: el ejemplo del informe (`report-artifact/fixtures.ts`) marca AI Visibility 72 como «atención»,
  pero la regla real (≥ 70) lo hace óptimo; se corrige el ejemplo para que coincida con las reglas del modelo.
- Resuelta (operador, 2026-09-29): la línea es Engine y el eslogan de cierre es «Empower your Engine».
- **Resuelta (operador, 2026-09-29, «aplícalo en todas»):** un 62 % con sólo la estela corta se leía como menos de lo
  que es, y el recorrido desde las 12 pasa a ser regla de toda órbita que mide, incluida la portada de este informe:
  3 px al 60 %, bajo la estela y en su color. Canon en AXIS `v0.3.38` (Delta (e)).
