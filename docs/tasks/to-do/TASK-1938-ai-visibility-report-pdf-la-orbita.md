# TASK-1938 — Informe PDF del Grader de visibilidad en IA con «La órbita»

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1938-ai-visibility-report-pdf-la-orbita.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno — propuesta en canvas pendiente de aprobación del operador`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `aprobación del operador de la propuesta del canvas (página «Informe del Grader (PDF)»)`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

El informe PDF del Grader de visibilidad en IA pasa al lenguaje visual de Efeonce Insights y de «La órbita», en dos
versiones: para no clientes (diagnóstico, cierra con «Agenda una reunión», que lleva a la agenda) y para clientes (parte del servicio: sin
oferta, cierra con su equipo y el próximo informe). Portada con la órbita que mide, veredicto como hallazgo y escala;
interiores en orden «respuesta primero» (qué hacer, por qué, dónde, mercado y fuentes). Sin lockup de Insights y sin
cambiar el motor de render (react-pdf).

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
- Copy visible en `src/lib/copy/growth.ts`, validado con `greenhouse-ux-writing`.

## Normative Docs

- `docs/ui/wireframes/TASK-1938-ai-visibility-report-pdf-la-orbita.md`
- Canvas de la propuesta: <https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd>, página «Informe del Grader (PDF)».
- `.claude/skills/efeonce-graphic-line/SKILL.md` y `references/criteria.md`
- Memoria operativa de react-pdf: un `<Svg>` sobre `Page.backgroundColor` corrompe el render; el alpha del trazo se
  pierde sobre navy (ver el comentario de `gaugeTrackOnNavy` en `report-pdf-tokens.ts`).

## Dependencies & Impact

### Depends on

- Aprobación del operador de la propuesta del canvas (bloqueante de la implementación, no de la planificación).
- `@efeoncepro/axis-tokens` y `@efeoncepro/axis-brand-assets` ya instalados en Greenhouse [verificar versión de
  `axis-brand-assets`: el Lab de AXIS indica que Greenhouse fija 0.3.5].

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
- Propuesta visual en el canvas (5 páginas, cifras ilustrativas del fixture).

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
- Boundary: `renderAiVisibilityReportPdf(model, header)`; consumidor autorizado: `build-report-attachment.ts`
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
- No-goals UX: cambiar el orden narrativo del informe, sumar secciones o datos, cambiar el web/print.

### Surface & system decision

- Surface: documento PDF A4 adjunto al correo del informe.
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — no es una vista del portal.
- Primitive decision: `extend` — el renderer react-pdf existente; sin primitive nueva.
- Adaptive density / The Seam: `no aplica` — página de tamaño fijo.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `src/lib/copy/growth.ts`.
- Access impact: `none`.

### State inventory

- Default: informe completo en cinco páginas.
- Loading: no aplica (el PDF se genera en el servidor antes del envío).
- Empty: puntaje `null` → anillo sin arco ni esfera y «—»; secciones sin datos no se dibujan.
- Error: si el render falla, el correo sigue el camino de error actual de `build-report-attachment.ts` (sin cambio).
- Degraded / partial: motores sin respuesta → «N de M motores respondieron»; dimensión sin dato → «Sin dato».
- Permission denied: no aplica.
- Long content: nombres largos ajustan línea; nunca «…».
- Mobile / compact: no aplica (documento A4).
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
- Copy source: `src/lib/copy/growth.ts`.
- Data reader / command: `ReportArtifactModel` sin cambios de forma.
- API parity: sin acción de negocio nueva; el adjunto sigue saliendo del mismo contrato.
- Access / capability: sin cambios.
- States to implement: los de la tabla de State Copy del wireframe.

### GVC scenario plan

- Scenario file: no aplica (sin ruta de portal).
- Route: no aplica.
- Viewports: A4 a tamaño físico.
- Quality profile: `premium`.
- Required steps: render con el fixture y con un informe real de staging; abrir cada página.
- Required captures: cada página en color y en escala de grises, lado a lado con la hoja aprobada del canvas.
- Required `data-capture` markers: no aplica.
- Assertions: cifras iguales al modelo; fuentes embebidas; test anti-fuga verde.
- Scroll-width checks: no aplica a PDF.
- Reduced-motion / focus evidence: no aplica.
- Review dossier: `docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/`.
- Baseline decision / surface ID: `growth.ai-visibility.report-pdf`, baseline nuevo tras la aprobación.

### Design decision log

- Decision: homologar al lenguaje visual de Insights y «La órbita» sin el lockup de Insights, manteniendo react-pdf.
- Alternatives considered: migrar ya al Artifact Composer (descartado para esta task: render de a una salida cada 2
  minutos y el correo adjunta el PDF en el momento); sólo cambiar la paleta (descartado: dejaría el indicador de carga).
- Why this pattern: continuidad prospecto → cliente con el menor riesgo operativo.
- Reuse / extend / new primitive: `extend` del renderer.
- Open risks: tipografía sin decidir; fuente variable en react-pdf; halo radial en react-pdf.

### Visual verification

- GVC scenario: no aplica; evidencia por PDF real.
- Viewports: A4.
- Required captures: cinco páginas en color y en gris.
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

### Slice 1 — Dirección aprobada y sellada

- Resolver con el operador lo que queda abierto (palabra del eslogan).
- Corregir `report-artifact/fixtures.ts` para que la gravedad coincida con los umbrales de `recommendations.ts`.
- Exportar las ocho hojas aprobadas (dos portadas, cuatro interiores, dos contraportadas) del canvas a `docs/ui/visual-directions/TASK-1938-ai-visibility-report-pdf-la-orbita/`
  y escribir la dirección `TASK-1938-ai-visibility-report-pdf-la-orbita-direction.md`; actualizar el wireframe.

### Slice 2 — Tokens y fuentes

- Reescribir `report-pdf-tokens.ts` con la paleta de «La órbita» desde `efeonceGraphicLine` y la gravedad desde
  `axisSemanticHex`.
- Si se aprueba Bricolage: generar instancias estáticas por peso, registrarlas en `register-fonts.ts` y documentar su
  procedencia junto a `BricolageGrotesque-SOURCE.md`.

### Slice 3 — Audiencia y portadas

- Entrada de audiencia (`prospect | client`) en `renderAiVisibilityReportPdf`, resuelta antes del render desde el
  vínculo del informe con una organización cliente (ver Open Questions); logo del cliente y responsable de la cuenta
  cuando existen.
- Dos portadas: rótulo, identidad («Preparado para» + logo en la de cliente) y tendencia según la audiencia.
- Reemplazar `Gauge` por la órbita que mide (esfera en `score × 3,6°`, estela de 50°, halo) con el estado `null`.
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
`(cx + r·sin θ, cy − r·cos θ)`, arco de estela desde `θ − 50°` hasta `θ`, halo radial en la esfera. Con `score = 100`
la esfera queda a las 12; con `score = null` no hay arco ni esfera.

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
| El PDF crece de 4 a 5 páginas y pesa más en el adjunto | email | low | medir el tamaño antes y después; fuentes con subconjunto | tamaño del buffer en el test |
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

1. Render local con el fixture y los estados `null`; revisar las cinco páginas.
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

- [ ] El operador aprobó la propuesta del canvas y las hojas quedaron en `docs/ui/visual-directions/`.
- [ ] `UI ready` permanece `no` hasta que el wireframe y el `## UI/UX Contract` tengan implementation mapping, GVC
  scenario plan y design decision log cerrados; si pasa a `yes`, `pnpm task:lint --task TASK-1938` queda sin hallazgos.
- [ ] La portada dibuja el puntaje con la esfera en `score × 3,6°` y estela de 50°; no queda ningún arco que se llene.
- [ ] Con puntaje `null` la portada muestra el anillo sin arco ni esfera y «—».
- [ ] Ningún nivel ni dimensión sin dato se muestra como 0.
- [ ] `report-pdf-tokens.ts` no contiene el azul `#0375db` y sus colores salen de `efeonceGraphicLine` y `axisSemanticHex`.
- [ ] El documento no usa el lockup de Efeonce Insights.
- [ ] La contraportada toma las redes de `EFEONCE_SOCIAL_LINKS` y el logo y la burbuja de `axis-brand-assets`.
- [ ] El eslogan va en bloque debajo del logo de Efeonce, al 64 % de su ancho (cuerpo = 0,64 × logo ÷ 11,586 em), separado 1,35 veces su cuerpo; nunca como texto a cuerpo fijo.
- [ ] Cada motor evaluado (ChatGPT, Claude, Gemini, Perplexity, Google AI Overview) aparece con su logo oficial en la portada y en «Canales de respuesta»; Google AI Overview usa la lupa de Google AI Mode de AXIS, nunca el logo de Gemini.
- [ ] Los íconos son del Trazo de AXIS (`resolveIcon`), en reposo, y cada grupo pasa `auditIconGroup`; ninguno dibujado a mano.
- [ ] El copy nuevo vive en `src/lib/copy/growth.ts`, incluidos los nombres de las dimensiones en español.
- [ ] Existen dos versiones del documento por audiencia, derivada del cliente que el Grader ya identifica; la de cliente no tiene CTA comercial, redes ni oferta del Grader, y la de no cliente cierra con «Agenda una reunión», que enlaza a `efeoncepro.com/contacto/` con UTM (sin correo comercial).
- [ ] La contraportada de cliente muestra al responsable de la cuenta desde un único valor configurable (hoy Julio Reyes, Managing Director & GTM).
- [ ] La tipografía es la canónica de «La órbita» (Bricolage 760 + Poppins), registrada en `register-fonts.ts` con instancias estáticas por peso.
- [ ] La gravedad de puntaje, niveles, dimensiones y motores sale de los umbrales de `recommendations.ts` (< 40 crítico, < 70 atención) y la portada muestra esa escala.
- [ ] El puntaje de cada nivel es el promedio ponderado de sus dimensiones medidas; un nivel sin dimensiones medidas muestra «Sin dato» y el de operabilidad sin probes «En cobertura».
- [ ] Sin histórico la portada dice «Primera medición» y nunca «▲ 0».
- [ ] Las barras son navy y la gravedad va en etiquetas con punto de color.
- [ ] El pie de cada página interior queda dentro de la hoja (medido en el PDF real).
- [ ] La página 05 muestra la participación de voz en porcentaje y las fuentes citadas de `citationSourceBreakdown`.
- [ ] `renderAiVisibilityReportPdf` conserva su firma y `build-report-attachment.ts` no cambia.
- [ ] `report-artifact-pdf-no-leak.test.tsx` sigue verde.
- [ ] El dossier tiene las ocho hojas en color y en gris, lado a lado con las hojas aprobadas, y el scorecard.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/components/growth/ai-visibility`
- `pnpm test` completo y `pnpm build` antes de cerrar
- PDF real de staging abierto página por página

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] El master flow `EPIC-020-AEO-PROGRAM-UI-FLOW.md` registra que web y print siguen con el diseño anterior.

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
- ¿Qué palabra del eslogan corresponde al Grader («Growth» en la propuesta)?
