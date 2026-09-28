# Artifact Composer — BASELINE_DELTAS (contrato de dos vías)

## 2026-09-28 (o) — TASK-1934: las nueve láminas SEO/AEO del deck

Las nueve láminas SEO/AEO aprobadas por el operador el 2026-09-28 componen en `graphic-line-deck` sobre AXIS 0.3.23
(`axis-tokens` 0.3.23, `axis-ui-contracts` 0.3.21; deltas (m) y (n) de AXIS). Siete plantillas nuevas y dos recetas sobre
plantillas existentes (`proposal-service-seo` sobre `ProposalService`, `proposal-cinematic-seo` sobre
`ProposalCinematic`). Compuestas con sus plates, logos e íconos reales, comparadas lado a lado contra sus referencias y
**aprobadas a ojo por el operador el 2026-09-28**. Diferencias con la referencia, todas decisión de norma: la respuesta a
120 px (3×) en DeckIARespuesta, DeckDiferencia y DeckEEAT, con la ventana «Hoy» de DeckIARespuesta en 860/450; la tarjeta
Efeonce blanca; el wordmark de McKinsey a 700; la esfera de la trayectoria con su brillo redondo. Los frames nuevos son
el probe de cada plantilla (assets de prueba), como todos los del catálogo.

- `templates-graphic-line-deck/DecisionAiAnswer.png` — 🆕 deck.decision-ai-answer: a quién recomienda la IA (motor genérico, datos de ejemplo marcados)
- `templates-graphic-line-deck/DecisionAiMarket.png` — 🆕 deck.decision-ai-market: tres cifras de mercado con su fuente
- `templates-graphic-line-deck/MethodSurroundCycle.png` — 🆕 deck.method-surround-cycle: el ciclo Surround Discovery sobre la órbita
- `templates-graphic-line-deck/DecisionDifference.png` — 🆕 deck.decision-difference: agencia commodity frente a método medible
- `templates-graphic-line-deck/MethodEeat.png` — 🆕 deck.method-eeat: las cuatro letras de E-E-A-T y el medidor
- `templates-graphic-line-deck/DecisionTrafficToRevenue.png` — 🆕 deck.decision-traffic-to-revenue: del tráfico calificado a los ingresos
- `templates-graphic-line-deck/DecisionDiagnosisMap.png` — 🆕 deck.decision-diagnosis-map: el mapa del diagnóstico (datos de muestra marcados)
- `templates-graphic-line-deck/ProposalCinematic.png` — ✏️ deck.proposal-cinematic: el probe suma la nota del pie («Sin promesas de ranking…»), que la AEO y la SEO cine aprobadas llevaban

## 2026-09-28 (n) — TASK-1928: la portada de brochure con la selección de Nexa

El operador relajó «sin selección en `cover-brochure`» el 2026-09-28 y AXIS 0.3.21 (delta (l), `axis-ui-contracts`
0.3.19) le da la composición `document-selection`: la receta aprobada `cover-brochure-cine-lines-selection` compone
con la plantilla `CoverBrochure`, que ahora marca la respuesta como objetivo y declara el slot opcional `selection`. El
probe del gate rellena todo slot no fijo, así que su frame suma el marco de ocho manijas y el cursor sobre la respuesta
(runbook §4bis); el resto de la lámina no cambia. Compuesta con el plate NX6b y comparada a ojo contra la referencia
`DeckPortadaPrincipal6Sel`: coincide (la burbuja URL de la referencia no está, igual que en la portada limpia de las
cinco líneas de TASK-1927: la firma de `cover-brochure` es el logo). Con ella, las 69 recetas del deck tienen plantilla.

- `templates-graphic-line-deck/CoverBrochure.png` — ✏️ deck.cover-brochure: el probe suma la selección sobre la respuesta

## 2026-09-27 (m) — TASK-1928: los largos del catálogo mandan

La paridad de slots receta ↔ plantilla (`recipe-map.json` → `slots`, test `recipe-slot-parity.test.ts`) alinea los
largos máximos de los `slots.json` de las 38 recetas con los de su receta en el catálogo de láminas. El ejemplo de la
bajada de la cotización en vivo medía 111 caracteres visibles contra los 110 de la receta: se acorta («Los montos se
definen en la propuesta.»), y su frame se re-promueve. Ningún otro frame cambia (los largos no se pintan).

- `templates-graphic-line-deck/ContentPricingLive.png` — ✏️ deck.content-pricing.live: la bajada del probe, una palabra menos

## 2026-09-27 (l) — TASK-1928: contenido y día a día

Sexta y última familia de las 38 recetas sin plantilla (`axis-tokens` 0.3.20, `axis-ui-contracts` 0.3.18, delta (k)
de AXIS): la hoja de contactos, el texto, las viñetas, el día a día en sus cuatro composiciones (el reloj, las
herramientas, el avance y los resultados en vivo) y la agenda. Compuestas con sus plates, isotipos y el panel de
Greenhouse reales y comparadas a ojo contra las ocho referencias: coinciden salvo las decisiones de la norma — el rótulo
«Revisamos contigo» y la etiqueta de la tarjeta en revisión en el texto claro (D1: iban en el acento a 13–20 px). El
recorte de la lente del reloj sigue el foco del plate (`photo.focus`, recorte dirigido en el compositor sólo cuando el
intent lo declara). Las interfaces del día a día son genéricas con el isotipo real de cada herramienta. El CSS nuevo está
acotado a `.gl-cs`, `.gl-ct`, `.gl-cb`, `.gl-cd`, `.gl-cdl` (`.gl-cdt`, `.gl-cdp`, `.gl-cdr`) y `.gl-ag`; el resolver nuevo
`gl-align` alinea los rótulos del reloj. Con esta familia las 69 recetas del deck tienen plantilla.

- `templates-graphic-line-deck/ContactSheet.png` — 🆕 deck.contact-sheet
- `templates-graphic-line-deck/ContentText.png` — 🆕 deck.content-text
- `templates-graphic-line-deck/ContentBullets.png` — 🆕 deck.content-bullets
- `templates-graphic-line-deck/ContentDay.png` — 🆕 deck.content-day
- `templates-graphic-line-deck/ContentDayTools.png` — 🆕 deck.content-day.tools
- `templates-graphic-line-deck/ContentDayProgress.png` — 🆕 deck.content-day.live-progress
- `templates-graphic-line-deck/ContentDayResults.png` — 🆕 deck.content-day.live-results
- `templates-graphic-line-deck/DecisionAgenda.png` — 🆕 deck.decision-agenda

## 2026-09-27 (k) — TASK-1928: secciones y quiénes somos

Quinta familia de las 38 recetas sin plantilla (`axis-tokens` 0.3.19, `axis-ui-contracts` 0.3.17, delta (j) de AXIS):
la sección con lente, la sección a sangre, la sección de cine en sus cuatro composiciones (equipo, servicios, quiénes
somos y por qué lo hacemos), el equipo y el stack. Compuestas con sus plates, fotos del squad e isotipos reales y
comparadas a ojo contra las ocho referencias: coinciden salvo las decisiones de la norma — sin el logo chico que
conservaban las secciones de cine (lámina interior con foto: el eyebrow vuelve al margen), sin el velo lateral de
quiénes somos y por qué lo hacemos, los rótulos de los pilares en blanco (D1), la fuente de las cifras de quiénes somos
visible y sin los pilares de luz del stack (la referencia nunca los pintó). La lente la pinta entera el motor de la
línea gráfica (asset `painted`: el plate lo inyecta quien compone). El CSS nuevo está acotado a `.gl-sec`, `.gl-tm`,
`.gl-stk` y `.gl-live-voice`; el hook del CTA suma las ocho manijas sobre texto (servicios) sin cambiar a los CTAs
previos, el indicador acepta su centro medido (la sangre) y el resolver nuevo `gl-item-role` marca la ficha al frente.

- `templates-graphic-line-deck/SectionLens.png` — 🆕 deck.section-lens
- `templates-graphic-line-deck/SectionBleed.png` — 🆕 deck.section-bleed
- `templates-graphic-line-deck/SectionCine.png` — 🆕 deck.section-cine (+ services)
- `templates-graphic-line-deck/SectionCineAbout.png` — 🆕 deck.section-cine.about
- `templates-graphic-line-deck/SectionCinePurpose.png` — 🆕 deck.section-cine.purpose
- `templates-graphic-line-deck/ContentTeam.png` — 🆕 deck.content-team
- `templates-graphic-line-deck/ContentStack.png` — 🆕 deck.content-stack

## 2026-09-27 (j) — TASK-1928: la familia prueba

Cuarta familia de las 38 recetas sin plantilla (`axis-tokens` 0.3.18, `axis-ui-contracts` 0.3.16, delta (i) de AXIS):
el foco sobre la prueba, los clientes con su muro de logos, los partners, el riesgo, el caso, el gráfico, el testimonio
y por qué elegirnos. Compuestas con sus plates y logos reales y comparadas a ojo contra las ocho referencias: coinciden
salvo las correcciones de la norma — las respuestas de partners y testimonio a 120 px (3× la pregunta; las referencias,
110 y 104), la fuente visible de las cifras de clientes, y la fuente real del foco (la referencia imprimía «Datos de
muestra»). Las cifras llegan por `figures` del contrato con su fuente; una barra sale de su número; los logos de
terceros se normalizan al componer (asset `logo`: un tono y el mismo peso óptico, con la excepción tonal de AXIS para
Aguas Andinas y la UC de Temuco). En el probe cada logo es el rótulo sintético `file:probe`. El CSS nuevo está acotado a
`.gl-cf`, `.gl-cc`, `.gl-cpt`, `.gl-dr`, `.gl-dc`, `.gl-dch`, `.gl-dt` y `.gl-dw`; el resolver nuevo `gl-figure-size`
sólo lo usa por qué elegirnos. Los hooks suman `selection.item` a seis plantillas y la frase del testimonio a la selección
sobre la respuesta, sin cambiar a las plantillas previas.

- `templates-graphic-line-deck/ContentFocus.png` — 🆕 deck.content-focus
- `templates-graphic-line-deck/ContentClients.png` — 🆕 deck.content-clients
- `templates-graphic-line-deck/ContentPartners.png` — 🆕 deck.content-partners
- `templates-graphic-line-deck/DecisionRisk.png` — 🆕 deck.decision-risk
- `templates-graphic-line-deck/DecisionCase.png` — 🆕 deck.decision-case
- `templates-graphic-line-deck/DecisionChart.png` — 🆕 deck.decision-chart
- `templates-graphic-line-deck/DecisionTestimonial.png` — 🆕 deck.decision-testimonial
- `templates-graphic-line-deck/DecisionWhyUs.png` — 🆕 deck.decision-why-us

## 2026-09-27 (i) — TASK-1928: cotización, próximos pasos y respiro

Tercera familia de las 38 recetas sin plantilla (`axis-tokens` 0.3.17, `axis-ui-contracts` 0.3.15, delta (h) de AXIS):
la cotización en sus tres composiciones (`table`, `stage` y `live`), los próximos pasos con la agenda del diagnóstico y
la lámina de respiro. Compuestas con su plate real y comparadas a ojo contra las cinco referencias: coinciden salvo las
correcciones de la norma — la respuesta de las cotizaciones a 120 px (3× la pregunta; las referencias, 118) y los
kickers chicos sobre el papel en navy (D1: «Recomendado», «Propuesta · Cotización», «01 · Diagnóstico · Sin costo»
iban en el acento a 14–15 px). Los montos se imprimen siempre como marcador y el contacto sale de `EFEONCE_CONTACT`.
El CSS nuevo está acotado a `.gl-br`, `.gl-ns`, `.gl-pt`, `.gl-pcs`, `.gl-pv` y `.gl-flow-voice` (la escena de la
cotización usa `gl-pcs`: `gl-ps` es la propuesta sobria, y compartir el prefijo movía su frame). Los hooks de selección
y del CTA suman el ítem recomendado y la cotización en vivo sin cambiar a las plantillas previas. La auditoría
renderizada (D1 y 3×, con las tres cotizaciones en la lista del 3×) pasa sobre los probes.

- `templates-graphic-line-deck/Breather.png` — 🆕 deck.breather
- `templates-graphic-line-deck/DecisionNextSteps.png` — 🆕 deck.decision-next-steps
- `templates-graphic-line-deck/ContentPricing.png` — 🆕 deck.content-pricing
- `templates-graphic-line-deck/ContentPricingStage.png` — 🆕 deck.content-pricing.stage
- `templates-graphic-line-deck/ContentPricingLive.png` — 🆕 deck.content-pricing.live

## 2026-09-27 (h) — TASK-1928: la familia método

Segunda familia de las 38 recetas sin plantilla (`axis-tokens` 0.3.16, `axis-ui-contracts` 0.3.14, delta (g) de
AXIS): la escalera tipográfica (`method-staircase` · `flat`), el plan como trayectoria (`decision-plan`, reemplaza la
órbita circular), el anillo del puntaje (`method-score-ring`) y la fuerza de trabajo híbrida con sus dos composiciones
(`ladder` con dos cursores sobre la respuesta; `scene` con dos selecciones medidas en la foto). Compuestas con su
plate real y comparadas a ojo contra las cinco referencias: coinciden salvo las correcciones de la norma — la
respuesta del plan a 3× la pregunta (120 px; la referencia, 112), la fuente de los pesos del anillo visible en el pie
y la ficha 3 del plan apoyada en la punta de su tallo (la referencia la dejaba 24 px arriba por un alto de ficha fijo).
La escalera de vidrio sale ahora de los tokens de AXIS con los mismos valores: su frame NO cambia. El hook de
selección mide el aire de la respuesta POR LÍNEA sólo cuando el slot lo pide (`textPad: 'per-line'`, la fuerza
híbrida, como su lámina aprobada); el resto de las láminas con selección sobre texto no cambia. El CSS nuevo está
acotado a `.gl-mf`, `.gl-dp`, `.gl-sr`, `.gl-hw` y `.gl-url-lum`. La auditoría renderizada (D1 y 3×, con
`deck.decision-plan` en la lista del 3×) pasa sobre los probes.

- `templates-graphic-line-deck/MethodStaircaseFlat.png` — 🆕 deck.method-staircase.flat
- `templates-graphic-line-deck/DecisionPlan.png` — 🆕 deck.decision-plan
- `templates-graphic-line-deck/MethodScoreRing.png` — 🆕 deck.method-score-ring
- `templates-graphic-line-deck/MethodHybridWorkforce.png` — 🆕 deck.method-hybrid-workforce
- `templates-graphic-line-deck/MethodHybridWorkforceScene.png` — 🆕 deck.method-hybrid-workforce.scene

## 2026-09-27 (g) — TASK-1923: Glitch entra al gate (26 plantillas, scope `--catalog=glitch`)

Glitch (sólo Glitch) suma una entrada de probe: los catálogos `glitch-carousel`, `glitch-stills` y `glitch-overlays`
comparten la carpeta `catalogs/glitch/`, así que el probe fotografía sus 26 plantillas una vez, en `templates-glitch/`.
Todas están aprobadas: las 7 del carrusel, los banners del blog A/B/C y sus versiones 1:1, el banner de noticia, la
portada del reel, la miniatura del vlog y los 10 overlays del reel y del vlog (el cuadro fijo del kit de motion). La
foto de cada hueco es un SVG sintético (`GLITCH_PROBE_ASSETS`, `photo:probe`): ISSUE-122 no aplica al probe; la falla
en bytes del probe es la del `example` de su slot (vacía). Los overlays se capturan sin alfa en el probe (fondo del
navegador); el PNG entregado por `pnpm glitch:compose` sí lleva alfa. Selftest de dos corridas: 26 frames a 0 px.
Ningún frame de otro catálogo cambia.

- `templates-glitch/BackCover.png` — 🆕 glitch.back
- `templates-glitch/BlogBannerMosaic.png` — 🆕 glitch.blog.banner.c
- `templates-glitch/BlogBannerPhoto.png` — 🆕 glitch.blog.banner.a
- `templates-glitch/BlogBannerType.png` — 🆕 glitch.blog.banner.b
- `templates-glitch/BlogNewsBanner.png` — 🆕 glitch.blog.news
- `templates-glitch/BlogSquareMosaic.png` — 🆕 glitch.blog.square.c
- `templates-glitch/BlogSquarePhoto.png` — 🆕 glitch.blog.square.a
- `templates-glitch/BlogSquareType.png` — 🆕 glitch.blog.square.b
- `templates-glitch/CoverMosaic.png` — 🆕 glitch.cover.c
- `templates-glitch/CoverPhoto.png` — 🆕 glitch.cover.a
- `templates-glitch/CoverType.png` — 🆕 glitch.cover.b
- `templates-glitch/Interior.png` — 🆕 glitch.interior
- `templates-glitch/InteriorLens.png` — 🆕 glitch.interior.lens
- `templates-glitch/InteriorOpening.png` — 🆕 glitch.interior.opening
- `templates-glitch/OverlayCtaReel.png` — 🆕 glitch.overlay.cta.reel
- `templates-glitch/OverlayCtaVlog.png` — 🆕 glitch.overlay.cta.vlog
- `templates-glitch/OverlayDropReel.png` — 🆕 glitch.overlay.drop.reel
- `templates-glitch/OverlayDropVlog.png` — 🆕 glitch.overlay.drop.vlog
- `templates-glitch/OverlayHeaderReel.png` — 🆕 glitch.overlay.header.reel
- `templates-glitch/OverlayHeaderVlog.png` — 🆕 glitch.overlay.header.vlog
- `templates-glitch/OverlayLowerThirdReel.png` — 🆕 glitch.overlay.lower-third.reel
- `templates-glitch/OverlayLowerThirdVlog.png` — 🆕 glitch.overlay.lower-third.vlog
- `templates-glitch/OverlayNewsReel.png` — 🆕 glitch.overlay.news.reel
- `templates-glitch/OverlayNewsVlog.png` — 🆕 glitch.overlay.news.vlog
- `templates-glitch/ReelCover.png` — 🆕 glitch.reel.cover
- `templates-glitch/VideoThumbnail.png` — 🆕 glitch.video.thumbnail

## 2026-09-27 (f) — TASK-1928: la propuesta de servicio sobria (`proposal-service`)

Primera familia de las 38 recetas aprobadas sin plantilla. Las cuatro láminas de la propuesta sobria (AEO, servicios
creativos, web y RevOps) comparten geometría y son UNA receta nueva de AXIS (`axis-tokens` 0.3.15, `axis-ui-contracts`
0.3.13, delta (f)): la foto en la lente arriba a la derecha (la única órbita: anillo en el halo, arco y esfera en el
acento, dibujados por el builder desde el token), la voz a la izquierda y tres o cuatro tarjetas sin íconos de ancho
derivado del contenido; la primera en papel, objetivo de la selección «Cliente». Compuestas con su plate real y
comparadas a ojo contra las cuatro referencias: coinciden salvo las dos correcciones de la norma, el kicker de la
primera tarjeta en navy (D1; la referencia lo tenía en el acento a 15 px) y la prueba de la creativa con su fuente
visible en el pie. El CSS nuevo está acotado a `.gl-ps`: los 32 frames previos no cambian. La auditoría renderizada
(D1 y 3×) del gate pasa sobre el probe.

- `templates-graphic-line-deck/ProposalService.png` — 🆕 deck.proposal-service

## 2026-09-27 (e) — TASK-1927: portadas y contraportadas aprobadas del brochure y de la propuesta

Las 17 referencias aprobadas del marco (decisión del operador, canvas Deck, 2026-09-27) pasan a plantillas del catálogo
`graphic-line-deck`: `cover-brochure` (composiciones `document` y `line`), `cover-proposal` (`orbit` y `dawn`),
`close-brochure` (`orbit` y `photo`) y `close-proposal`. El marco clásico (logo 230/220) no entra: el operador no lo
aprobó. `cover-brochure-cine-lines-selection` queda fuera: el contrato de AXIS no admite selección en esa portada.

Todas las medidas salen del manifest y de los tokens de AXIS (`axis-tokens` 0.3.14: columna de voz, eje del amanecer,
pintura de las órbitas de luz, estilo del contacto, caja del logo del cliente); las plantillas nuevas no declaran
respaldo. El contacto sale de `EFEONCE_CONTACT`. Compuestas con su plate real y comparadas a ojo contra las
referencias. Diferencias conocidas, a favor de AXIS o del SSOT: «Cuando quieras.» a 124 px (la referencia, 118),
dirección «71, of. 1105» y burbuja URL horneada. El CSS nuevo está acotado a `.gl-frame`: los 26 frames previos no
cambian. El probe usa la capa de órbita, el plate y el logo de cliente sintéticos de `GRAPHIC_LINE_PROBE_ASSETS`.

- `templates-graphic-line-deck/CoverBrochure.png` — 🆕 deck.cover-brochure
- `templates-graphic-line-deck/CoverProposalOrbit.png` — 🆕 deck.cover-proposal
- `templates-graphic-line-deck/CoverProposalDawn.png` — 🆕 deck.cover-proposal.dawn
- `templates-graphic-line-deck/CloseBrochure.png` — 🆕 deck.close-brochure
- `templates-graphic-line-deck/CloseBrochurePhoto.png` — 🆕 deck.close-brochure.photo
- `templates-graphic-line-deck/CloseProposal.png` — 🆕 deck.close-proposal

## 2026-09-27 (d) — TASK-1927: la sección partida sube por la izquierda y gana dos composiciones

Corrección explícita del operador (canvas Deck, 2026-09-27; regla `split-indicator-rises-start` de AXIS): el indicador
de la sección partida nace abajo a la izquierda (≈ las 8) y sube por la IZQUIERDA en sentido horario, con la esfera
arriba a la izquierda en la 2 de 5. La versión que subía por la derecha queda rechazada. El arco sale del token
(`progress.startFromTopDeg` −115, `sweep.rule: 'sections-completed'`, `axis-tokens` 0.3.13) y barre las secciones ya
recorridas, como las tres referencias aprobadas; la pregunta «¿unificar a n / N?» sigue abierta en el token. La capa ya
no se voltea.

Las tres composiciones comparten `section-split.html`; cada una tiene su contrato de slots y su frame. Comparadas a
ojo con el plate real contra `section-split`, `section-split-corner-bottom` y `section-split-panel-end`. El probe del
gate usa una capa de órbita sintética (el arco real lo pinta AXIS al componer), así que `SectionSplit.png` **no
cambia**: byte-idéntico al baseline.

- `templates-graphic-line-deck/SectionSplitCornerBottom.png` — 🆕 deck.section-split.corner-bottom
- `templates-graphic-line-deck/SectionSplitPanelEnd.png` — 🆕 deck.section-split.panel-end

## 2026-09-27 (c) — TASK-1927: el tríptico pasa a una palabra por toma, cada una con su esfera

Decisión del operador (canvas Deck, 2026-09-27), ya en el token de AXIS: `triptych.voice.sphere: 'per-panel'`,
`wordsPerPanel: 1`, regla `triptych-word-per-panel` (la excepción aprobada a «una esfera por pieza»). La plantilla deja
de esconder la esfera de las dos primeras tomas y el probe pasa de «Escucha, / crea / y mide» a «Escucha / Crea /
Mide». Comparado a ojo con el plate real contra la referencia aprobada `triptych`. Ningún otro frame cambia.

- `templates-graphic-line-deck/Triptych.png` — ✏️ deck.triptych: una palabra por toma y una esfera por toma

## 2026-09-27 (b) — TASK-1927: composiciones `hero` y `lines` de `proposal-cinematic` (`efeonce.surface-composition` 0.1.2)

Greenhouse fija el contrato 0.1.2 de AXIS (tag `v0.3.11`). El bump **no movió ningún píxel**: los 22 frames del scope
`graphic-line` quedaron a 0 px antes de tocar una plantilla, y el plan de los intents publicados es idéntico al previo
(snapshot en `src/lib/brand-surfaces/__tests__/example-plans.test.ts`).

`proposal-cinematic` gana una plantilla por composición en vez de ramas dentro de la existente: así
`ProposalCinematic.png` (composición `service`) **no cambia**. El CSS nuevo está acotado a `.gl-pl`; `hero` reutiliza
el molde de la voz sin modificarlo. Comparadas a ojo con el plate real contra las referencias aprobadas
(`proposal-cinematic-nexa` y `proposal-cinematic-nexa-lines`): mismas posiciones y cuerpos; la caja de la selección
sale del pintor canónico de Greenhouse y queda unos px más ajustada que en el prototipo.

- `templates-graphic-line-deck/ProposalCinematicHero.png` — 🆕 deck.proposal-cinematic.hero
- `templates-graphic-line-deck/ProposalCinematicLines.png` — 🆕 deck.proposal-cinematic.lines

## 2026-09-27 — TASK-1919: los catálogos de «La órbita» entran al gate (scope `graphic-line`)

Tres catálogos nuevos (`graphic-line-deck`, `graphic-line-stills`, `graphic-line-overlays`) con las 20 recetas
aprobadas de la línea gráfica por superficie; el teléfono tiene una plantilla por ancho (22 frames). Scope propio,
`pnpm composer:visual-gate --catalog=graphic-line`, para no rebaselinar frames ajenos. El probe no es el sintético
genérico: cada contrato declara como `example` el plan real de su pieza aprobada, y la foto, los íconos y las capas
de la órbita llegan como SVG sintéticos y deterministas (`GRAPHIC_LINE_PROBE_ASSETS` en `visual-gate.ts`), así que
ISSUE-122 no aplica. Las capas audiovisuales transparentes se congelan con su alfa. Determinismo verificado en cuatro
corridas `--selftest` (0 px). Los 60 frames de `deck-axis`/SKY/Insights que hoy difieren por pocos píxeles NO se
tocan: la misma lista y las mismas cuentas aparecen con el `render.ts` anterior (deriva de entorno, ISSUE-122).

- `templates-graphic-line-deck/ProposalCinematic.png` — 🆕 deck.proposal-cinematic
- `templates-graphic-line-deck/SectionClassic.png` — 🆕 deck.section-classic
- `templates-graphic-line-deck/SectionSplit.png` — 🆕 deck.section-split
- `templates-graphic-line-deck/ContentMeasure.png` — 🆕 deck.content-measure
- `templates-graphic-line-deck/Triptych.png` — 🆕 deck.triptych
- `templates-graphic-line-deck/MethodStaircase.png` — 🆕 deck.method-staircase
- `templates-graphic-line-stills/HeroLens.png` — 🆕 web.hero-lens
- `templates-graphic-line-stills/HeroBleed.png` — 🆕 web.hero-bleed
- `templates-graphic-line-stills/HeroUniformTablet.png` — 🆕 web.hero-uniform-tablet
- `templates-graphic-line-stills/HeroMobileNative360.png` — 🆕 web.hero-mobile-native.phone-360
- `templates-graphic-line-stills/HeroMobileNative390.png` — 🆕 web.hero-mobile-native.phone-390
- `templates-graphic-line-stills/HeroMobileNative430.png` — 🆕 web.hero-mobile-native.phone-430
- `templates-graphic-line-stills/CamineroLens.png` — 🆕 dooh.caminero-lens
- `templates-graphic-line-stills/MotionStoryboard.png` — 🆕 motion.storyboard
- `templates-graphic-line-stills/LoopLensReveal.png` — 🆕 motion.loop-lens-reveal
- `templates-graphic-line-overlays/Cartela.png` — 🆕 audiovisual.cartela
- `templates-graphic-line-overlays/Zocalo.png` — 🆕 audiovisual.zocalo
- `templates-graphic-line-overlays/CalloutSelection.png` — 🆕 audiovisual.callout-selection
- `templates-graphic-line-overlays/DataSuper.png` — 🆕 audiovisual.data-super
- `templates-graphic-line-overlays/SplitScreen.png` — 🆕 audiovisual.split-screen
- `templates-graphic-line-overlays/Subtitles.png` — 🆕 audiovisual.subtitles
- `templates-graphic-line-overlays/ShotPlan.png` — 🆕 audiovisual.shot-plan

## 2026-09-25 (k) — TASK-1889: la tabla de respaldo con datos reales

Revisión del operador sobre Berel y Sky: la tabla comparaba unidades distintas en una sola escala y titulaba con «la
fila más alta». Ahora la cifra principal es el hallazgo del capítulo (opcional: sin hallazgo, no hay cifra), las
filas de unidades distintas no llevan barras sino una columna de variación con dirección (triángulo en la píldora;
en una posición, bajar de número es subir) y la leyenda sólo existe si hay barras. El probe dibuja la píldora de la
fila sin dirección (neutra).

- `templates-insights-report/ReportTablePage.png` — píldora de variación con triángulo

## 2026-09-25 (j) — TASK-1889 Slice 5: la capitular de la narrada sólo con cuerpo que la sostenga

Las ediciones reales de Berel y Sky mostraron una capitular suelta («V isibilidad en IA: 0.») en narradas de
afirmaciones cortas. La capitular ahora la enciende un hook sólo cuando el primer párrafo compuesto ocupa tres
líneas o más; el probe (texto corto) queda sin capitular. La fidelidad de las narradas del canvas no cambia.

- `templates-insights-report/ReportNarrativePage.png` — sin capitular con texto corto

## 2026-09-25 (i) — TASK-1889 Slice 4: se retiran las páginas de gráfico v1; la zona de metas sale del dato

Los mappers ya componen cada gráfico del plan en su página de figura premium, y salen del catálogo la página
analítica v1 y la lámina de evidencia v1 (1920×1080), con sus moldes v1. La zona de atención de las metas deja
de ser un umbral escrito a mano (0,85 × meta): se dibuja sólo desde `band`, el límite de atención del
registro dueño (hecho de referencia de TASK-1888); sin banda, la pista es una sola. Con «menos es mejor», lo
oscuro queda sobre el límite. El probe ejerce la banda con su `example`.

- `templates-insights-report/ReportAnalysisPage.png` — retirada
- `templates-insights-deck/InsightsEvidenceSlide.png` — retirada
- `templates-insights-report/ReportFigureTargetsPage.png` — zona desde `band`
- `templates-insights-deck/InsightsFigureTargetsSlide.png` — zona desde `band`

## 2026-09-25 (h) — TASK-1889 Slice 4: páginas de figura premium

Nacen las páginas de figura del canvas aprobado, una por familia con productor: comparación de períodos por
métrica (`Premium-Evidencia` / `Deck-Comparacion`), columnas agrupadas sobre un eje compartido
(`Premium-Agrupadas` / `Deck-Agrupadas`), metas (bullet, `Premium-Metas` / `Deck-Metas`) y tendencia en
líneas (`Premium-Lineas` / `Deck-Lineas`). Columnas y líneas las dibuja un hook desde la geometría pura
compartida (`insights-shared/figure-svg.ts`). El probe las ejerce con el `example` que declara cada contrato
(regla nueva del sintetizador: una figura cuya geometría sale de cifras no se prueba con texto de relleno).

- `templates-insights-report/ReportFigureComparisonPage.png` — nueva
- `templates-insights-report/ReportFigureColumnsPage.png` — nueva
- `templates-insights-report/ReportFigureTargetsPage.png` — nueva
- `templates-insights-report/ReportFigureTrendPage.png` — nueva
- `templates-insights-deck/InsightsFigureComparisonSlide.png` — nueva
- `templates-insights-deck/InsightsFigureColumnsSlide.png` — nueva
- `templates-insights-deck/InsightsFigureTargetsSlide.png` — nueva
- `templates-insights-deck/InsightsFigureTrendSlide.png` — nueva

## 2026-09-25 (g) — TASK-1889 Slice 3: portada blanca y logo del cliente

Nace la portada blanca (`Premium-Portada-Clara` / `-Creativo`: satélites por canal o arco corto, según el
dato). Las portadas navy ganan el logo del cliente (variante `on_dark`), que el plan sella como
`asset-ref:org-logo:<id>` y el worker entrega autorizado (`ComposeOptions.externalAssets`). El probe dibuja
el asset del catálogo en ese campo (regla nueva del sintetizador para campos `asset`).

- `templates-insights-report/ReportCoverLightPage.png` — nueva
- `templates-insights-report/ReportCoverPage.png` — «Preparado para» con logo
- `templates-insights-deck/InsightsCoverSlide.png` — «Preparado para» con logo

## 2026-09-25 (f) — TASK-1889: narrada y límites con la misma crítica

La narrada sigue la anatomía de «Nuestra lectura»: se retira el número en contorno decorativo y el filete
redundante; la columna lateral pasa a ser útil (frase clave + «En este capítulo»/«En este informe» con folio
real) y cierra con el panel navy cuando el plan trae decisión o lectura. Los límites ganan cuerpo por fila.

- `templates-insights-report/ReportNarrativePage.png` — columna lateral útil + cierre navy opcional
- `templates-insights-report/ReportLimitsPage.png` — filas con más cuerpo

## 2026-09-25 (e) — TASK-1889: la tabla vuelve a la anatomía de la evidencia aprobada

Crítica de diseño (operador: «no se ve premium»): la versión anterior cargaba navy arriba (cabecera y
fila líder) y dejaba vacío el último tercio; las barras pálidas detrás del texto leían como interfaz. Se
rehace con la anatomía de `Premium-Evidencia`: cifra de la fila más alta y tesis sobre papel, barras finas
con el valor al final, segunda columna en pastilla, procedencia y panel navy de cierre (si el plan trae la
lectura). El navy aparece sólo en el cierre.

- `templates-insights-report/ReportTablePage.png` — anatomía de evidencia

## 2026-09-25 (d) — TASK-1889: la tabla de respaldo gana punch

Pedido del operador («la tabla necesita más punch»). Cabecera navy con la cifra contada en teal, tablero de
barras (cada fila con su barra detrás, desde el dato) y la fila que alcanza el máximo de la tabla completa
como banda navy. El ranking continúa entre páginas (`rankOffset`), antes volvía a 01.

- `templates-insights-report/ReportTablePage.png` — tablero de barras con cabecera navy y fila líder

## 2026-09-25 (c) — TASK-1889: narrada, tabla y límites elevadas al nivel del canvas

Pedido del operador («muy sencillas para lo premium del diseño V2»). Las cinco piezas sin página propia en
el canvas pasan a la gramática aprobada: momento dominante (capitular o cifra protagonista contada del dato),
columna lateral o lista numerada, y cierre (panel navy o franja). La barra de la tabla sale del dato
(`report-table-bar`, escala de la tabla completa).

- `templates-insights-report/ReportNarrativePage.png` — capitular + columna lateral (frase clave o marca del capítulo)
- `templates-insights-report/ReportTablePage.png` — cifra contada, ranking, barra desde el dato, procedencia
- `templates-insights-report/ReportLimitsPage.png` — cifra contada, límites numerados, metodología en panel navy
- `templates-insights-deck/InsightsNarrativeSlide.png` — gramática de «Lectura» del deck + franja «En una frase»
- `templates-insights-deck/InsightsLimitsSlide.png` — cifra de 132 px, lista numerada, franja «Cómo se midió»

## 2026-09-25 (b) — TASK-1889: las plantillas editoriales REEMPLAZAN a las v1

Decisión del operador: las v2 no conviven con las v1; ningún agente debe poder componer con una v1
cuando existe su v2. Cada v2 toma el nombre y el contentType canónicos de la v1 que reemplaza, y la
v1 se borra del catálogo. Los mappers componen desde el plan actual con las plantillas nuevas. Única
excepción declarada: las páginas de gráfico (`ReportAnalysisPage`, `InsightsEvidenceSlide`, status
`legacy` con `replacedBy`) hasta el Slice 4. Guarda: `__tests__/insights-catalogs-v2-only.test.ts`.

**Frames que cambian (v1 → diseño editorial):**

- `templates-insights-report/ReportCoverPage.png` — ahora la portada navy (antes `ReportCoverNavyPage`)
- `templates-insights-report/ReportIndexPage.png` — índice editorial (antes `ReportContentsPage`)
- `templates-insights-report/ReportTablePage.png` — tabla densa editorial (antes `ReportDenseTablePage`)
- `templates-insights-report/ReportLimitsPage.png` — límites editoriales (antes `ReportLimitsV2Page`)
- `templates-insights-report/ReportNarrativePage.png` — narrativa editorial nueva (sin página en el canvas)
- `templates-insights-deck/InsightsCoverSlide.png` — portada navy 1280×720 (antes `InsightsCoverNavySlide`)
- `templates-insights-deck/InsightsNarrativeSlide.png` — narrativa editorial 1280×720 (sin página en el canvas)
- `templates-insights-deck/InsightsLimitsSlide.png` — límites editoriales 1280×720 (sin página en el canvas)

**Frames retirados (nombres de transición, vivieron sólo en el commit anterior):**
`templates-insights-report/ReportCoverNavyPage.png`, `templates-insights-report/ReportContentsPage.png`,
`templates-insights-report/ReportDenseTablePage.png`, `templates-insights-report/ReportLimitsV2Page.png`,
`templates-insights-deck/InsightsCoverNavySlide.png`.

La narrativa (A4 y deck) y los límites del deck son piezas derivadas, en revisión del operador.

## 2026-09-25 — TASK-1889: plantillas editoriales de Insights (canvas aprobado)

Nacen las plantillas del diseño premium aprobado por el operador el 2026-09-25. **Todas son
plantillas NUEVAS con contentType propio.** Las v1 de TASK-1847 siguen intactas porque las ediciones
v1 (flag de TASK-1888 apagado) componen con ellas: sus 10 frames se verificaron **byte-idénticos** al
baseline después del cambio de pack (Poppins 500 y extensión editorial, opt-in de los catálogos
Insights; `deck-axis` no los recibe y su CSS compilado queda byte-idéntico).

La fidelidad al canvas se mide aparte (`pnpm insights:canvas-fidelity`): 11 páginas con referencia,
todas ≤ 0,05 % de píxeles distintos (seis en 0 px). Estos frames son el probe sintético de siempre, el
guard de regresión del molde y los slots, no la prueba de fidelidad.

**Frames declarados para promoción (15 nuevos):**

- `templates-insights-report/ReportCoverNavyPage.png` — portada navy (`Premium-Portada`)
- `templates-insights-report/ReportBackCoverPage.png` — contraportada (`Premium-Contraportada`)
- `templates-insights-report/ReportChapterPage.png` — apertura de capítulo (`Premium-Capitulo*`)
- `templates-insights-report/ReportSummaryPage.png` — resumen ejecutivo (`Premium-Resumen`)
- `templates-insights-report/ReportReadingPage.png` — nuestra lectura (`Premium-Lectura`)
- `templates-insights-report/ReportPlanPage.png` — plan de acción (`Premium-Plan`)
- `templates-insights-report/ReportContentsPage.png` — índice editorial (sin página en el canvas)
- `templates-insights-report/ReportDenseTablePage.png` — tabla densa editorial (sin página en el canvas)
- `templates-insights-report/ReportLimitsV2Page.png` — límites editoriales (sin página en el canvas)
- `templates-insights-deck/InsightsSummarySlide.png` — resumen (`Deck-Resumen`, 1280×720)
- `templates-insights-deck/InsightsReadingSlide.png` — lectura (`Deck-Lectura`)
- `templates-insights-deck/InsightsPlanSlide.png` — plan (`Deck-Plan`)
- `templates-insights-deck/InsightsCoverNavySlide.png` — portada del deck, derivada de la A4
- `templates-insights-deck/InsightsChapterSlide.png` — apertura del deck, derivada de la A4
- `templates-insights-deck/InsightsBackCoverSlide.png` — contraportada del deck, derivada de la A4

⚠️ Las tres últimas no tienen diseño en el canvas y están **en revisión del operador**. Si cambian,
se re-declaran aquí y se re-promueven; no se edita el PNG a mano.

## 2026-09-24 — Declaración del set de Insights con el índice A4

La ampliación de TASK-1847 agrega `ReportIndexPage.png` al set visual. El índice se deriva del plan
de páginas y muestra los folios físicos calculados antes del render; el probe confirma el molde y los
slots, mientras las pruebas del mapper verifican el contenido y la numeración. La revisión en grises
también llevó el énfasis y las marcas principales del informe al token oscuro `--axis-deck-teal-750`,
sin cambiar el pack compartido ni el catálogo comercial.

**Frames declarados para promoción (10 nuevos):** nueve plantillas de deck/informe declaradas el
2026-09-21 más el nuevo `ReportIndexPage`. En tres ejecuciones frescas previas al índice y tres
posteriores, los frames ya existentes del catálogo y del deck SKY coincidieron con su baseline; el
único delta observado fue el nacimiento de las plantillas Insights. Se declaran esos diez frames para su primera
promoción, sin rebaselinear las plantillas ajenas.

- `templates-insights-deck/InsightsCoverSlide.png`
- `templates-insights-deck/InsightsEvidenceSlide.png`
- `templates-insights-deck/InsightsNarrativeSlide.png`
- `templates-insights-deck/InsightsLimitsSlide.png`
- `templates-insights-report/ReportCoverPage.png`
- `templates-insights-report/ReportIndexPage.png`
- `templates-insights-report/ReportNarrativePage.png`
- `templates-insights-report/ReportAnalysisPage.png`
- `templates-insights-report/ReportTablePage.png`
- `templates-insights-report/ReportLimitsPage.png`

Las seis corridas pertenecen a la misma sesión de septiembre 24. Estos frames siguen declarados y sin promover:
`--freeze` requiere el commit atómico con los cambios de catálogo.

## 2026-09-21 — Dos catálogos nuevos entran al gate: `insights-deck` (16:9) e `insights-report` (A4)

**Qué cambia y qué no.** El gate pasa de fotografiar UN catálogo a fotografiar tres, cada uno en su
propia carpeta de frames. Los de `deck-axis` conservan su ruta histórica (`templates/`) y su
baseline **no se toca**: siguen en cero diffs después del cambio, que es la verificación de que
generalizar el harness no movió nada ajeno.

**Nueve frames nuevos, todos de plantillas que nacen en TASK-1847.** No son cambios de una lámina
existente: son composiciones que antes no existían, así que su primera promoción es su nacimiento.

| Frame | Qué es |
|---|---|
| `templates-insights-deck/InsightsCoverSlide.png` | 🆕 portada del deck Insights — reemplaza a `CoverFull`, que imprime «Propuesta Técnica» (vocabulario de oferta comercial, no de informe) |
| `templates-insights-deck/InsightsEvidenceSlide.png` | 🆕 ficha de evidencia: una conclusión por lámina, con la figura que la prueba y su procedencia |
| `templates-insights-deck/InsightsNarrativeSlide.png` | 🆕 capítulo cuya evidencia no alcanzó para una figura — se narra, NO se omite |
| `templates-insights-deck/InsightsLimitsSlide.png` | 🆕 cierre: lo que la edición no puede afirmar |
| `templates-insights-report/ReportCoverPage.png` | 🆕 portada A4, con pie institucional completo (el estándar lo exige también en la portada) |
| `templates-insights-report/ReportNarrativePage.png` | 🆕 capítulo narrado y resumen ejecutivo del informe |
| `templates-insights-report/ReportAnalysisPage.png` | 🆕 página analítica: afirmación, figura y marginalia con unidad, fuente y cobertura |
| `templates-insights-report/ReportTablePage.png` | 🆕 tabla densa con cabecera propia — el reparto de filas lo hace `paginateFlow()` antes de imprimir |
| `templates-insights-report/ReportLimitsPage.png` | 🆕 cierre del informe, cada límite con su causa |

**⚠️ DECLARADOS, NO PROMOVIDOS (2026-09-21).** Estos nueve frames **no tienen baseline todavía**, y
es deliberado: `--freeze` exige declarar *todos* los frames cambiados, y en este repo los de
`deck-axis` difieren entre corridas por el no-determinismo de ISSUE-122. Congelar los nuevos
obligaría a rebaselinear de paso los ajenos con el entorno de quien corre — exactamente el
«rebaseline silencioso» que este archivo existe para impedir. La promoción queda pendiente de la
mitigación de ISSUE-122.

**Un acoplamiento del probe que esto destapó y quedó corregido.** `synthesizeProbeSlots` decidía si
un campo de geometría recibía un número consultando una LISTA DE NOMBRES de resolvers, escrita con
los de `deck-axis`. Un catálogo nuevo caía al fallback y recibía `10` mientras su etiqueta decía
`"1%"` — es decir, **el probe generaba un par incoherente y la guarda anti-fabricación lo rechazaba,
correctamente**. El catálogo fallaba el gate por hacer lo correcto. Ahora la condición se deriva del
contrato (`type: 'number'` → `1`), no de una lista que hay que editar por catálogo.

Se verificó que ese cambio **no movió ningún frame de `deck-axis`**: los dos únicos campos
`type: 'number'` del catálogo (`case-study-split.barScale`, `chart-split.valuePct`) declaran
resolvers que ya estaban en la lista previa, que se evalúa antes; y los frames que difieren entre
corridas no tienen campos numéricos. La diferencia es el drift de ISSUE-122, no el probe.


## 2026-08-13 — Dos slots opcionales que el probe rellena: `partnerBadge` y el `heroAsset` que llevaba 13 días sin declarar

Ambas láminas driftean por **la misma mecánica**, la del runbook §4bis: el gate no renderiza la
plantilla cruda, la compone con **slots sintéticos** (`synthesizeProbeSlots`) que rellenan **todo**
slot no-`fixed-` — incluidos los opcionales — y para cualquier `asset` el placeholder es
`assets/url-lum.svg`. Declarar un slot mueve el frame del probe aunque ningún deck lo use.

**Frames re-promovidos (2):**

- `templates/BackCoverFull.png` — **slot nuevo `partnerBadge`** (credencial de partner, clave cerrada
  `partner-badge-asset`). El probe pinta la burbuja de URL en la caja del badge, arriba a la derecha.
  En un render real el slot no declarado hace que el renderer **borre el nodo**: la contraportada sin
  credencial queda idéntica a la de siempre. 1.787 px.
- `templates/NarrativeSplit.png` — **deuda, no cambio de hoy.** El slot opcional `heroAsset` entró el
  2026-07-31 en `f7761988f` (*Brightcell tender*) y **nadie re-congeló**: el gate quedó rojo 13 días
  con ~59k px de diff, y el ruido se leía como regresión de quien pasara por ahí. Se declara y se
  promueve ahora, con la causa escrita para que no vuelva a interpretarse mal.

**Verificado antes de congelar:** ninguna otra lámina difiere (el WIP de deck ANAM en el árbol
—`comparison-split.*`— renderiza byte-idéntico al baseline, así que la promoción no sella trabajo
ajeno a medias). `git log` confirma que `narrative-split.html` está commiteada y limpia.

---

## 2026-07-15 (b) — Muro de clientes: +Grupo Berel (caballo de batalla MX) → grilla 3×3

**Feedback del operador (mismo día):** faltaba **Grupo Berel** (cliente clave de México) en el muro. Se
agrega como **9º logo**, en el **centro del 3×3** (el spot más prominente tras SKY). El grid pasa de 4×2
a **3×3** (9 entra simétrico). Sizing **por peso óptico**: los logos compactos/apilados (`berel`,
`marca-chile`, `universidad-temuco`) reciben `max-height` mayor vía selector `[data-client]` — un lockup
cuadrado a 46px se ve diminuto al lado de un wordmark ancho. `berel.svg` internalizado (allowlist
`client-logo-asset` +1); `maxItems` del muro 8→9. Berel queda **doblemente representado**: su lámina de
referencia (`berel`, "Grupo Berel ya lo compra vía Wherex") + el muro de confianza. PDF regenerado y
re-entregado a OneDrive (deadline mismo día).

**Frames re-promovidos (2):**

- `sky/23-clientes.png` — muro con Berel + grilla 3×3
- `templates/ClientLogosFull.png` — probe del molde (grid 3-col)

---

## 2026-07-15 — Deck SKY 26 → 28: muro de clientes + testimonios del equipo de SKY (prueba social)

**Aprobación del operador (sesión 2026-07-15):** dos plantillas reutilizables de prueba social entran
en el cluster de cierre, entre `berel` y `seguro`. El deck pasa de 26 a 28 láminas. Ambos moldes son
**domain-free** (cualquier propuesta los consume desde su `deck-plan`); SKY no queda embebido en la
plantilla.

**Plantilla `ClientLogosFull` (nueva):** panel claro cohesivo con hasta 8 logos de clientes **a color**
(resolver cerrado `client-logo-asset` + allowlist `CLIENT_LOGO`), alineados por altura, grilla de
hairlines. Exactamente un logo lleva `emphasis='primary'` (resolver `client-logo-emphasis`, DATO del
plan — no hardcode): en SKY su celda va en **navy con la versión dark del logo** + anillo teal + chip
"Cliente" (el prospecto que ya es cliente). Banda de amplitud **"+90 empresas en Chile, Colombia, México
y Perú"** — cifra **verificada** del sitio público, no fabricada. Superficie navy = recipe canónica
`rich-content`; **cero gradientes literales, cero HEX** (color-ledger + gradient-inventory verdes sin
tocar el inventario).

**Plantilla `TestimonialsFull` (nueva):** dos tarjetas de cita **verbatim** de terceros reales + enlace a
la muestra viva. Validador semántico `testimonials-sourced`: exige atribución nombrada + `proofLink` con
href absoluto (la fuente verificable). El testimonio NO se pule el tono (sería fabricación). Framing
honesto: **relación/confianza de un año, NUNCA "resultados de nuestro SEO"** (las citas hablan de
automatizaciones/herramientas/procesos).

**Assets del catálogo (allowlist `client-logo-asset`):** internalizados `carozzi/marca-chile/
gobierno-santiago/bresler/aguas-andinas/universidad-temuco/anam.svg`. `sky.svg` → versión dark (letras
blancas + chevron verde) con viewBox recortado (venía con espacio en blanco que lo achicaba).
`aguas-andinas.svg` → desenmascarado (traía una máscara de luminancia VACÍA que ocultaba todo el logo —
SVG roto de export) + wordmark recoloreado a navy para el panel claro.

**Frames nuevos promovidos (4):**

- `templates/ClientLogosFull.png` — probe del molde reutilizable
- `templates/TestimonialsFull.png` — probe del molde reutilizable
- `sky/23-clientes.png` — muro de clientes real del deck SKY
- `sky/24-testimonios.png` — testimonios reales del equipo de SKY

**Renumerados por la inserción (+2, sólo desplazamiento, contenido sin cambio):**

- `sky/25-seguro.png` (era `23-seguro`) · `sky/26-cumplimiento.png` (era `24-cumplimiento`) ·
  `sky/27-economica.png` (era `25-economica`) · `sky/28-contraportada.png` (era `26-contraportada`)

**Retirados por el corrimiento** (su contenido vive ahora en el número +2): `sky/23-seguro.png`,
`sky/24-cumplimiento.png`, `sky/25-economica.png`, `sky/26-contraportada.png`.

**`sky/02-agenda.png` re-derivado:** el hook de agenda deriva números de página REALES del plan; al
insertar 2 láminas, el capítulo «La inversión» corre su página `economica` de 25 → 27. No es cambio de
molde: es la agenda haciendo su trabajo (páginas derivadas, no autoradas).

Iteración de logos aprobada por el operador: color en panel claro cohesivo (no cajas ni monocromo),
SKY destacado con celda navy + logo dark.

---

## 2026-07-15 — `CoverFull` canonizada: lockup centrado, marca principal ampliada y cliente on-dark nativo

**Aprobación del operador (sesión 2026-07-15):** la portada conserva la composición centrada y reduce
el primer vistazo a lo esencial: Efeonce, marca cliente, tipo de propuesta y URL Bubble. El wordmark
Efeonce crece de 650px a 840px; la marca cliente se sirve como asset `native-on-dark` aprobado, sin
filtros CSS; y la recipe `cover-hero` concentra el halo cyan/teal detrás del lockup con presencia
violeta controlada. La URL Bubble no cambia.

**Contrato reutilizable:** no se agregan slots ni copy propio de SKY al molde. `CoverFull` sigue
resolviendo el logo de cada cliente y el tipo de propuesta desde el `deck-plan`; cada cliente debe
entregar una variante on-dark canónica. Para SKY se incorpora `sky-on-dark.svg`, derivado de la
geometría y el verde del SVG oficial, con el componente violeta llevado a blanco para fondos oscuros.

**Frames aprobados (exactamente 2):**

- `templates/CoverFull.png` — nuevo lockup y recipe canónica del molde reutilizable.
- `sky/01-portada.png` — consumo del asset oficial on-dark de SKY en el deck real.

---

## 2026-07-15 — Deck SKY 23 → 26: operación reusable + anatomía antes de la prueba viva

**Aprobación del operador (sesión 2026-07-15):** las tres plantillas reutilizables se integran en la
narrativa existente, sin crear una segunda Radiografía. `ToolStackFull` entra después de los cuatro
frentes; `DailyOpsHubFull`, después del ciclo mensual; y `ContentHubAnatomyFull`, entre la capacidad
SEO/AEO y el showcase vivo. La lámina `muestra` conserva `ArtifactShowcaseFull`: sólo cambia su rótulo
a **LA PRUEBA VIVA** y el lead recibe explícitamente el relevo de las tres capas anteriores.

**Cambios canónicos:**

- `ContentHubAnatomyFull` entra al catálogo como molde slot-driven para research, artículo y capa
  machine-readable, con `proofLink` autorado por propuesta y URL Bubble centrado.
- El deck SKY pasa de 23 a 26 páginas. La agenda deriva nuevamente sus páginas reales.
- La captura y el enlace de la Radiografía existente se conservan; no se duplica el artefacto.
- El PDF compuesto pesa 12.2 MB y conserva 11 anotaciones `/Link`: 6 `GoTo` de agenda y 5 `/URI`.
- `TeamGalleryFull` elimina anchos fraccionarios y el clip redondeado del contenedor padre: gaps de
  24px producen tarjetas enteras con 4/5 integrantes y el radio vive en la foto. El self-test del
  set completo pasa dos renders consecutivos con cero píxeles distintos.

**Frames promovidos o renumerados:**

`templates/ContentHubAnatomyFull.png` · `templates/TeamGalleryFull.png` ·
`sky/02-agenda.png` · `sky/11-stack-operativo.png` · `sky/12-ciclo.png` ·
`sky/13-dia-a-dia.png` · `sky/14-arranque.png` · `sky/15-lineas.png` ·
`sky/16-seo-aeo.png` · `sky/17-content-hub-anatomy.png` · `sky/18-muestra.png` ·
`sky/19-portal.png` · `sky/20-portal-vista.png` · `sky/21-equipo.png` ·
`sky/22-berel.png` · `sky/23-seguro.png` · `sky/24-cumplimiento.png` ·
`sky/25-economica.png` · `sky/26-contraportada.png`

---

## 2026-07-15 — Stack operativo + día a día: dos plantillas reutilizables de operación

**Aprobación del operador (sesión 2026-07-15):** se canonizan como dos argumentos distintos y
complementarios. `ToolStackFull` explica **con qué sistema se trabaja**; `DailyOpsHubFull` muestra
**cómo se vive el trabajo diario** dentro de un artefacto compartido. SKY consume ambos moldes desde
JSON de propuesta, pero ni el cliente, ni su artículo, ni sus capturas quedan embebidos en la plantilla.

**Plantilla `ToolStackFull`:** sistema operativo de cinco etapas con herramientas identificadas por
isotipo y nombre, más una capa transversal de colaboración, comentarios, versionamiento, licencias y
fuentes aprobadas. Las placas de contraste son parte del contrato del resolver para que logos claros y
oscuros sigan siendo legibles sin parches por marca.

**Plantilla `DailyOpsHubFull`:** escena de trabajo viva en un solo workspace: conversación Teams/Slack,
artículo y research en Notion, revisión visual en Frame.io y rail de seis estados. El wordmark Efeonce
vive en el chrome del producto y el asset de revisión es un slot; la captura SKY existe sólo en el
preview consumidor.

**Frames nuevos promovidos (2):**

- `templates/ToolStackFull.png` — molde canónico del stack operativo reutilizable
- `templates/DailyOpsHubFull.png` — molde canónico del día a día colaborativo

**Re-promociones colaterales auditadas (2):**

- `templates/DualTextSplit.png` — el probe sintético materializa los íconos resolver-backed de ambos
  conceptos después de generalizar el llenado de colecciones anidadas; coincide con el contrato ya
  declarado para esta plantilla.
- `sky/22-economica.png` — el segundo plan vuelve a mostrar su estado `PROPUESTO`; antes el resolver
  del segundo elemento no se ejecutaba por el bug de paths anidados que este cambio corrige de raíz.

**Manifiesto literal de la promoción:**

`templates/ToolStackFull.png` · `templates/DailyOpsHubFull.png` · `templates/DualTextSplit.png` ·
`sky/22-economica.png`

**Residual fuera de esta promoción:** durante el freeze cambió concurrentemente el copy de
`sky/10-operacion.png`, por lo que ese frame no se atribuye a esta aprobación. Además,
`pnpm composer:visual-gate --selftest` detectó 54 píxeles no deterministas en el borde superior de
los avatares de `sky/18-equipo.png`. Ninguno afecta a los dos moldes nuevos, que sí compararon a cero
píxeles en la corrida posterior; el umbral global no se relaja.

---

## 2026-07-15 — Fotos del squad: los avatares CANÓNICOS de Entra reemplazan a los recortes

**Feedback del operador (deck SKY, lámina equipo):** los recortes sobre fondo claro no se veían bien;
el equipo YA tiene un set uniforme de avatares (Entra/Greenhouse: hoodie azul Efeonce sobre degradado
violeta→naranja vibrante; Julio con su propio degradado azul coherente). Se usan TAL CUAL —
cuadrados, full-bleed, el degradado viene EN la foto (raster), no en CSS (gradient-inventory intacto).

**Assets (allowlist `squad-person` sin cambios de claves):** `squad-julio/maria-fernanda/daniela/
melkin/andres.png` reemplazados por los avatares canónicos servidos por `/api/media/users/*/avatar`
(source of truth de la foto de cada persona — la misma que ve todo el portal).

**Template `team-gallery-full.html`:** `object-position: center bottom → center` (avatares centrados,
no recortes anclados al piso) + comentario actualizado (el lavado ice queda como fallback para
transparencias). Cero cambios de color/gradiente CSS.

**Frames re-promovidos (2, exactamente los esperados):**

- `templates/TeamGalleryFull.png` — probe con fotos nuevas
- `sky/18-equipo.png` — lámina real del deck SKY

---

## 2026-07-14 (2ª promoción) — Feedback del operador: deck SKY 22 → 23 + agenda funcional + showcases vivos

**Motor:** los `layoutHooks` del catálogo ganan acceso opcional al `deckPlan` completo
(`CatalogLayoutHook` 3er parámetro) — chrome que depende de OTRAS láminas (el número de página real
de un capítulo) se DERIVA, nunca se autora. Render standalone sin plan → el hook no pinta.

**templates/:**

- `AgendaFull.png` — **sin cambio de píxel** (el hook de páginas no pinta sin plan; sólo CSS nuevo `.pg`)
- `DualTextSplit.png` — los glifos de texto (• / ✓) pasan a **SVG resolvibles** (`dual-concept-icon`:
  search/ai/data/users/target → Solar); el probe sintético llena el `icon` opcional → glifo nuevo
- `TeamGalleryFull.png` — lavado ice detrás de las fotos (los recortes flotando sobre blanco puro se
  veían inconclusos — feedback del operador) + `object-position: bottom`
- `ArtifactShowcaseFull.png` — `lead` pasa a rich-string (`em/strong/a`); el probe llena texto plano
  → **sin cambio de píxel esperado**

**sky/ (22 → 23):**

| Frame | Qué pasó |
|---|---|
| `08-informe` | 🆕 ArtifactShowcaseFull — **el informe del grader como artefacto**: screenshot real (gauge 61 + dimensiones + motores con logos) con chrome de navegador y la URL tokenizada horneada + **enlace clickeable** en el lead. Pedido explícito del operador (no estaba en la PPT) |
| `15-muestra` | de HighlightWave a **ArtifactShowcaseFull**: el x-ray real (artículo \| capa de máquina, con chrome + URL) — «ese layout no le hacía justicia al X-ray» (operador) |
| `18-equipo` | mapeo CONFIRMADO por el operador: Julio (Responsable de Cuenta 12%) · **María Fernanda (SEO Copywriter 50%** — foto encontrada en OneDrive Kit media, fondo removido vía Adobe, allowlist +1) · Daniela (Creative Operations Lead 12%) · Melkin (Senior Visual Designer 30%) · Andrés (SEO Specialist 25%). **Sale Valentina.** + lavado ice tras las fotos |
| `02-agenda` | **números de página reales por capítulo** (hook derivado del plan: pág. 04/09/10/12/18/22→ posiciones vivas) — «la agenda no está fungiendo como agenda» (operador) |
| `09-terreno` | íconos con semántica: buscador → lupa (magnifer), IA → cpu — el bullet genérico no decía nada (operador) |
| renombres byte-idénticos | los 18 frames restantes verificados con `shasum -a 256` contra su baseline previo (18/18 idénticos, sólo desplazamiento por la inserción de `informe` en la posición 8) |

Assets nuevos del catálogo: `assets/squad/squad-maria-fernanda.png` (recorte real) ·
`assets/product/radiografia-sky-xray.png` · `assets/product/informe-grader-sky.png` (capturas en vivo
2026-07-14 con chrome + URL horneada).

Aprobado por el operador en sesión 2026-07-14 (feedback sobre los 6 frentes, con mapeo de nombres dictado).

**Manifiesto literal (nombres completos para el matcher del freeze):**

`templates/DualTextSplit.png` · `templates/TeamGalleryFull.png` · `templates/ArtifactShowcaseFull.png` ·
`templates/AgendaFull.png` ·
`sky/02-agenda.png` · `sky/08-terreno.png` · `sky/08-informe.png` · `sky/09-operacion.png` ·
`sky/09-terreno.png` · `sky/10-ciclo.png` · `sky/10-operacion.png` · `sky/11-arranque.png` ·
`sky/11-ciclo.png` · `sky/12-arranque.png` · `sky/12-lineas.png` · `sky/13-lineas.png` ·
`sky/13-seo-aeo.png` · `sky/14-muestra.png` · `sky/14-seo-aeo.png` · `sky/15-muestra.png` ·
`sky/15-portal.png` · `sky/16-portal.png` · `sky/16-portal-vista.png` · `sky/17-equipo.png` ·
`sky/17-portal-vista.png` · `sky/18-berel.png` · `sky/18-equipo.png` · `sky/19-berel.png` ·
`sky/19-seguro.png` · `sky/20-cumplimiento.png` · `sky/20-seguro.png` · `sky/21-cumplimiento.png` ·
`sky/21-economica.png` · `sky/22-contraportada.png` · `sky/22-economica.png` · `sky/23-contraportada.png`

## 2026-07-14 — Deck SKY 19 → 22 + TeamGalleryFull + enlaces clickeables (iteración de la oferta, licitación Wherex)

**Motor (afecta render, no baseline per-se):** el sanitizador de rich-strings admite `<a href>`
(sólo `https://` o ancla), `deck-mold.css` estila el anchor (color heredado + subrayado — el default
UA azul era ilegible sobre navy), y `mergeSlidePdfs` porta las anotaciones `/Link → /URI` que
`copyPages` de pdf-lib descartaba (medido: Chromium emite 2, el merge llegaba con 0). El PDF final
lleva 4 anotaciones vivas (informe del grader en `diagnostico`, Radiografía en `muestra`).

**templates/ (27 → 28):**

- `TeamGalleryFull.png` — **NUEVO**. Materializa el `personaAssetContract` pre-declarado en
  quote-split/narrative-split: roster de FOTOS REALES del squad vía resolver `squad-person`
  (allowlist cerrada de 7; nombre desconocido → `UnknownResolverValueError`). Canvas navy de
  TimelineFull (gradientes declarados en `gradient-inventory.json`, 3/4 hashes ya aprobados).

**sky/ (19 → 22) — la iteración completa de la oferta (cifras del run publicado EO-GRUN-00046):**

| Frame | Qué pasó |
|---|---|
| `06-citas` | ❌ **MUERTA** — su claim («no aparece ni una sola vez») contradecía el informe público que la lámina invitaba a abrir (skyairline.com = fuente #1, 15 citas). Redundante con `diagnostico` |
| `04-near-miss` | 🆕 MetricsSplit — las 4 páginas atascadas (Antofagasta 110k/pos12…), evidencia Semrush |
| `05-capa-tecnica` | 🆕 DualListSplit — no hay capa de SEO técnico instalada (verificado sobre el código fuente 2026-07-14) vs lo que la operación instala |
| `17-equipo` | 🆕 TeamGalleryFull — 5 fotos reales con rol+nombre+dedicación (⚠️ mapeo persona↔rol = propuesta; lo confirma el operador). Reemplaza al TeamSplit de glifos |
| `18-berel` | 🆕 HighlightWave — Grupo Berel como referencia verificable (nombre autorizado por el operador 2026-07-14; sin métrica inventada) |
| `19-seguro` | 🆕 QuoteSplit — penalidades aceptadas íntegras «porque el servicio está diseñado para no gatillarlas» |
| `02-agenda` | targets re-apuntados (cap 01 → near-miss) + cap 03 «El método» → «La operación» |
| `03-entendimiento` | el anillo pasa de Estrategia/Producción/Medición al método real de la técnica §4: Base técnica / Autoridad / Entidad (E-E-A-T) |
| `06-diagnostico` | cifras del run 46: LATAM 17→**16**, «Despegar y TripAdvisor» → fuentes reales (Trustpilot/Wikipedia/Instagram), claim nuevo = **citabilidad propia 0%** (dato publicado del informe) + **enlace clickeable** al informe |
| `07-escalera` | labels alineados al informe público («Que te encuentre»… antes «Ser encontrada»…) |
| `08-terreno` | «ningún blog de aerolínea» → «ningún contenido editorial de viaje» (defendible contra el informe) |
| `09-operacion` | ex-`metodo`: sectionLabel «EL MÉTODO» → «LA OPERACIÓN» (el método de 3 capas vive en `entendimiento`; los 4 frentes son la operación) |
| `10-ciclo` | «doble» → «triple» control de calidad (alineado con técnica §5: QA editorial + posicionamiento + marca). Atrapado por el shasum de renombre |
| `11-arranque` | fase 1 «Diagnóstico y quick wins» → «Capa técnica y quick wins» |
| `14-muestra` | la URL de la Radiografía ahora es **enlace clickeable** (subrayado del molde) |
| `20-cumplimiento` | summary honesto: «100%» → «9 de 9 · Los nueve, uno a uno, en la §13 de la Oferta Técnica» (mostraba 5 afirmando el total) |
| `21-economica` | ad-hoc a $260.000 **eliminado** (dominaba al plan ampliado: base+4 ad-hoc = 6,24M < 6,9M; y publicaba el precio unitario — regla dura #2 de pricing). 2 opciones excluyentes + ad-hoc «dentro de la capacidad» en condiciones |
| renombres byte-idénticos | `portada`(=01) · `ciclo`→10 *(ver arriba)* · `lineas`→12 · `seo-aeo`→13 · `portal`→15 · `portal-vista`→16 · `contraportada`→22 — verificados con `shasum -a 256` contra su baseline previo (6/7 idénticos; ciclo declarado) |

Aprobado por el operador en sesión 2026-07-14 (Berel con nombre · gap del catálogo · href al motor).

**Manifiesto literal de la promoción** (el gate matchea el nombre completo del frame; el renombre
19→22 desplaza casi toda la numeración — cada nombre viejo que desaparece y cada nombre nuevo que
aparece está cubierto por la tabla de arriba):

`templates/TeamGalleryFull.png` ·
`sky/02-agenda.png` · `sky/03-entendimiento.png` · `sky/04-diagnostico.png` · `sky/04-near-miss.png` ·
`sky/05-escalera.png` · `sky/05-capa-tecnica.png` · `sky/06-citas.png` · `sky/06-diagnostico.png` ·
`sky/07-terreno.png` · `sky/07-escalera.png` · `sky/08-metodo.png` · `sky/08-terreno.png` ·
`sky/09-ciclo.png` · `sky/09-operacion.png` · `sky/10-arranque.png` · `sky/10-ciclo.png` ·
`sky/11-lineas.png` · `sky/11-arranque.png` · `sky/12-seo-aeo.png` · `sky/12-lineas.png` ·
`sky/13-muestra.png` · `sky/13-seo-aeo.png` · `sky/14-portal.png` · `sky/14-muestra.png` ·
`sky/15-portal-vista.png` · `sky/15-portal.png` · `sky/16-equipo.png` · `sky/16-portal-vista.png` ·
`sky/17-cumplimiento.png` · `sky/17-equipo.png` · `sky/18-economica.png` · `sky/18-berel.png` ·
`sky/19-contraportada.png` · `sky/19-seguro.png` · `sky/20-cumplimiento.png` · `sky/21-economica.png` ·
`sky/22-contraportada.png`

<!-- manifest-digest: 41737352f675efc66e5c707fe33240cc191914282bc984bff39796cae8c02697 -->

Este ledger existe porque **un rebaseline silencioso es peor que no tener gate**: el gate se
"arregla" promoviendo el baseline y nadie se entera.

**El contrato:**

- Todo cambio de píxel INTENCIONAL se declara acá, **lámina por lámina** (qué frame, qué cambió,
  por qué, quién lo aprobó) **ANTES** de correr `pnpm composer:visual-gate --freeze`.
- `--freeze` se niega a promover un frame cambiado que no esté declarado en este archivo.
- El marcador `manifest-digest` lo sella la promoción; el gate lo verifica. Editar el manifest o
  los PNG a mano, sin pasar por la promoción declarada, **también falla el gate**.
- El baseline se re-promueve **en el mismo PR** que declara el delta.

## 2026-07-12 — Baseline inicial (TASK-1393 · Slice 0)

- Congelado sobre el commit pre-refactor: 25 plantillas del catálogo (payload sintético compartido
  con `template-composability.test.ts`) + 15 láminas reales del deck SKY
  (`docs/commercial/tenders/sky-blog-2026/deck-plan.json`).
- Sin deltas: es la fotografía de partida que todo el refactor debe conservar a CERO píxeles.

## 2026-07-14 — Deck SKY: entra la lámina de la muestra (TASK-1410 · licitación Wherex)

**Qué cambió:** el deck SKY pasa de **15 a 16 láminas**. Se inserta `sky/12-muestra.png`
(`contentType: highlight` → `HighlightWave`, derivado por el selector — el plan **no** declara
`template`), justo después de `11-seo-aeo`: la 11 declara la capacidad AEO y la 12 la prueba,
enlazando la Radiografía publicada (`think.efeoncepro.com/muestras/sky-carretera-austral-…`).

**Por qué por ENLACE y no por captura:** el catálogo no tiene hoy ninguna plantilla capaz de mostrar
una captura de UI — el único slot de imagen (`leftVisual`, en `StatSplit`) está dimensionado para las
ilustraciones clay3d y reduciría la radiografía a una miniatura ilegible. Y de fondo: la pieza es
**interactiva** (su tesis es el acoplamiento al pasar el cursor), así que un PNG estático mata justo
lo que viene a demostrar. Aprobado por el operador, 2026-07-14.

**Frames afectados — CERO cambios de píxel:**

| Frame | Delta |
| --- | --- |
| `sky/12-muestra.png` | **nuevo** — la lámina de la muestra |
| `sky/13-equipo.png` | **solo renumeración** — era `sky/12-equipo.png` |
| `sky/14-cumplimiento.png` | **solo renumeración** — era `sky/13-cumplimiento.png` |
| `sky/15-economica.png` | **solo renumeración** — era `sky/14-economica.png` |
| `sky/16-contraportada.png` | **solo renumeración** — era `sky/15-contraportada.png` |

Frames retirados por el corrimiento (su contenido vive ahora en el número siguiente):
`sky/12-equipo.png`, `sky/13-cumplimiento.png`, `sky/14-economica.png`, `sky/15-contraportada.png`.

Los cuatro renumerados se verificaron **byte-idénticos** (`shasum -a 256`) contra su baseline previo
**antes** de promover: el renombre no esconde ninguna regresión. Ninguna plantilla cambió.

> 🔴 **Bug del propio `--freeze` (detectado acá, 2026-07-14):** la promoción **borra esta sección**.
> `visual-gate.ts:421` reescribe el ledger desde `INITIAL_DELTAS` cuando no puede releer el previo, y
> solo conserva el `manifest-digest` — es decir, **la promoción destruye la declaración que ella misma
> exigió**, que es exactamente el "rebaseline silencioso" que este archivo existe para impedir. Esta
> sección se restauró a mano después del `--freeze` (el digest sella el *manifest*, no la prosa, así
> que reponerla es seguro). **Hasta que se arregle: después de todo `--freeze`, verifica que tu
> declaración siga acá.**

**Follow-up abierto:** falta una plantilla de *artifact showcase* (captura a sangre + copy). La
Radiografía no va a ser el último artefacto que mostremos en un deck. No se construyó ahora por estar
a un día del cierre de la licitación.

---

## 2026-07-14 · `MaturityLadderFull` — plantilla NUEVA (el catálogo topaba en 4 y nuestros frameworks son de 5)

Ningún `contentType` podía afirmar una escalera de madurez: los tres candidatos topan en **4 items**
(`several-kpis` `maxItems:4` · `chart` 4 series · `four-pillars` 4 pilares) y la escalera son **5**.
Los 4 salieron de *lo que cabía en el layout*; los 5 salen de *la doctrina*. (Las **5 superficies** de
Surround Discovery van a topar igual.)

Aplanarla a 5 KPIs habría dicho *«sacó mala nota en 3 de 5 cosas»* (**boletín**) en vez de *«está
trabado abajo, y por eso lo de arriba no rinde»* (**diagnóstico con alcance**). Subir un `maxItems` de
4 a 5 habría pasado el gate y perdido la venta.

**Domain-free:** la plantilla no conoce AEO ni ningún framework. Es *«N etapas ordenadas y
acumulativas, con score, severidad y usted-está-aquí»*. **El score es la única verdad:** severidad,
peldaño destacado y ancho de barra se **derivan** — el autor no puede rotular "óptimo" un 37 ni marcar
dos peldaños como "el próximo". Umbrales idénticos a `severityFromScore` del informe de AI Visibility.

| Frame | Delta |
| --- | --- |
| `templates/MaturityLadderFull.png` | **nuevo** — la plantilla 26 |

---

## 2026-07-14 (b) · La escalera entra al deck de SKY — y renumera lo que va detrás

La lámina 4 traía la escalera **aplanada dentro de sus `goals`** (el boletín que la plantilla existe
para evitar). Ahora carga **tres hechos verificados** (0 citas del blog en 35 respuestas · LATAM 17 vs
JetSMART 9 · ~40.000 visitas orgánicas/mes) y la escalera vive donde tiene forma.

| Frame | Delta |
| --- | --- |
| `templates/MaturityLadderFull.png` | **corregido** — el primer freeze congeló una versión con banda muerta. Se detectó **mirando el frame**, no con un test |
| `sky/04-diagnostico.png` | **contenido nuevo** |
| `sky/05-escalera.png` | **nueva** |
| `sky/06-citas.png` | **solo renumeración** — era `sky/05-citas.png`, byte-idéntico |
| `sky/07-terreno.png` | **solo renumeración** — era `sky/06-terreno.png`, byte-idéntico |
| `sky/08-metodo.png` | **solo renumeración** — era `sky/07-metodo.png`, byte-idéntico |
| `sky/09-ciclo.png` | **solo renumeración** — era `sky/08-ciclo.png`, byte-idéntico |
| `sky/10-arranque.png` | **solo renumeración** — era `sky/09-arranque.png`, byte-idéntico |
| `sky/11-lineas.png` | **solo renumeración** — era `sky/10-lineas.png`, byte-idéntico |
| `sky/12-seo-aeo.png` | **solo renumeración** — era `sky/11-seo-aeo.png`, byte-idéntico |
| `sky/13-muestra.png` | **solo renumeración** — era `sky/12-muestra.png`, byte-idéntico |
| `sky/14-equipo.png` | **solo renumeración** — era `sky/13-equipo.png`, byte-idéntico |
| `sky/15-cumplimiento.png` | **solo renumeración** — era `sky/14-cumplimiento.png`, byte-idéntico |
| `sky/16-economica.png` | **solo renumeración** — era `sky/15-economica.png`, byte-idéntico |
| `sky/17-contraportada.png` | **solo renumeración** — era `sky/16-contraportada.png`, byte-idéntico |

**Retirados:** `sky/05-citas.png`, `sky/06-terreno.png`, `sky/07-metodo.png`, `sky/08-ciclo.png`, `sky/09-arranque.png`, `sky/10-lineas.png`, `sky/11-seo-aeo.png`, `sky/12-muestra.png`, `sky/13-equipo.png`, `sky/14-cumplimiento.png`, `sky/15-economica.png`, `sky/16-contraportada.png`.

Los 12 renumerados se verificaron **byte-idénticos** (`shasum -a 256`) antes de promover. 0 regresiones.

---

## 2026-07-14 (c) · El portal en vivo (`comparison`) — sin plantilla nueva

Faltaba el diferenciador más grande y **no estaba en ninguna pieza**: el acceso a **Greenhouse**, el
portal de clientes. La landing de SEO lo promete textual (*«acceso a Greenhouse […] con la misma verdad
que vemos nosotros»*) y la oferta técnica sólo ofrecía *«un informe dentro de los primeros 10 días
hábiles»*. **El deck no sobre-prometía: la oferta omitía un entregable que el servicio presta.** §9 se
sincronizó en la misma pasada.

Es además la lámina de *«por qué es seguro»* que el oficio exige: el portal no es una feature, es
**quitarle riesgo al comité** (*no tienen que confiar: lo ven*).

| Frame | Delta |
| --- | --- |
| `sky/14-portal.png` | **nueva** |

---

## 2026-07-14 (d) · `ArtifactShowcaseFull` — plantilla NUEVA: el portal se MUESTRA, no se describe

El mockup del tablero **ya existía** en la landing (`.gh-greenhouse-browser`) — no había que
reinventarlo. Se abrió la plantilla que faltaba desde el follow-up de la Radiografía:
**`artifact-showcase`** (captura a sangre + copy), **domain-free**: sirve para cualquier artefacto real
que una propuesta muestre.

**Va como ASSET, no como markup portado.** El HTML del portal son 18k de Elementor + 81k de CSS con
clases y HEX ajenos: meterlo al catálogo rompería su disciplina de tokens. Y hay una razón más fuerte:
**ese tablero es un demo por naturaleza** — volver sus cifras en slots implicaría que son datos reales,
lo cual sería **peor**. Captura a 2160×1290 (2×).

**🔴 El slot `caption` es OBLIGATORIO por contrato.** Una captura de producto con cifras adentro
**AFIRMA** algo: sin rótulo, un evaluador puede leer los números del demo (Domain authority 42, y unas
keywords que son las NUESTRAS) como si fueran los de SKY. **Eso es fabricación.** Misma disciplina que
el crédito de una fotografía — la lección que la Radiografía ya cobró.

| Frame | Delta |
| --- | --- |
| `templates/ArtifactShowcaseFull.png` | **nueva** — la plantilla 27 |
| `templates/MaturityLadderFull.png` | gradiente del peldaño destacado `.20` → `.28` (declarado en el inventario) |
| `sky/15-portal-vista.png` | **nueva** — el tablero, mostrado |
| `sky/16-equipo.png` | **solo renumeración** — era `sky/15-equipo.png`, byte-idéntico |
| `sky/17-cumplimiento.png` | **solo renumeración** — era `sky/16-cumplimiento.png`, byte-idéntico |
| `sky/18-economica.png` | **solo renumeración** — era `sky/17-economica.png`, byte-idéntico |
| `sky/19-contraportada.png` | **solo renumeración** — era `sky/18-contraportada.png`, byte-idéntico |

**Retirados:** `sky/15-equipo.png`, `sky/16-cumplimiento.png`, `sky/17-economica.png`,
`sky/18-contraportada.png`. Verificados byte-idénticos. **0 regresiones.** El deck queda en **19 láminas**.

---

## 🔴 Bug del propio `--freeze` — ENCONTRADO Y ARREGLADO (2026-07-14)

`--freeze` **rebobinaba este archivo entero a `INITIAL_DELTAS`**, llevándose puestas declaraciones ya
commiteadas. Mordió **4 veces** en un día antes de que alguien mirara la causa.

**La causa:** el ledger **vive dentro de `BASELINE_DIR`**, y la promoción hacía
`fs.rm(BASELINE_DIR, {recursive:true})` **antes** de leerlo. El `readFile` posterior fallaba, caía al
`.catch(() => INITIAL_DELTAS)`, y reescribía el ledger desde cero. **El guardián se comía su propia
evidencia** — el "rebaseline silencioso" que este archivo existe para impedir, cometido por el gate.

**El fix** (`visual-gate.ts`): leer el ledger **antes** del `rm`. Una línea.
