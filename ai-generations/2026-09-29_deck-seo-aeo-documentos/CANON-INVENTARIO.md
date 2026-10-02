# Deck SEO/AEO (Search Visibility 360): inventario de hechos para canonizar (2026-09-30)

**Aprobación:** el operador aprobó todo el set («esto está aprobado todo», 2026-09-30, sesión «SEO deck para brochure y
propuestas»). Este archivo es la fuente de hechos para los subagentes; lo que no está aquí se verifica en el código o se
pregunta. No inventar. Decisiones y pendientes: `DECISIONES.md` (leerlo entero).

- Canvas de revisión (Design): https://claude.ai/artifact/KDkuVM5nvX6uAyBeo3Td9n — páginas **Completo · 33**,
  **Brochure · 24**, **Propuesta · 29** y «Aprobadas 28-09» (las nueve de TASK-1934). Copia local de sus boards:
  `render-src/canvas-project/`.
- Láminas aprobadas exportadas (1920×1080, JPG q92): `out/slides/{completo,brochure,propuesta}/NN.jpg` (NN = posición en
  el deck). PDFs: `out/Efeonce-{Deck-SEO-AEO-Completo,Brochure-SEO-AEO,Propuesta-SEO-AEO}.pdf`.
- Cómo se produjo (reproducible):
  - `render-src/build.mjs` arma `render-src/{completo,brochure,propuesta}-{document,plan}.json` desde los intents de
    ejemplo del catálogo (`src/lib/brand-surfaces/examples`) cambiando sólo contenido. Validar con
    `pnpm brand:deck-plan -- --plan <plan>` y componer con `pnpm brand:compose -- --intent <document> --out <dir>
    --artifact-id seo-<doc>`.
  - Post-proceso que HOY hace fuera del compositor lo que las recetas todavía no saben (ver «Brechas»):
    `render-src/patch-eyebrow.cjs` (tapa el eyebrow de la AEO de cine con la franja de arriba) y
    `render-src/patch-team.cjs` (bajada del equipo sobre `section-cine-team`).
  - `render-src/bake.cjs` arma los PDF: superpone los logos de submarca (overlays por página) e inserta las láminas
    nativas (fuera del compositor): familia (`fam`), servicios (`srv`), Insights ×2 (`ins`), industrias + mercados
    (`ind`). `EXPORT=<dir>` exporta cada página.
  - Láminas nativas: `render-src/native/*.html` (+ `industrias-gen.mjs`, `mercados-gen.mjs`, `body-*.html` sin
    `<head>`, que es lo que va al canvas) y `render-src/shot.cjs` (Playwright 1920×1080).

## Recorrido aprobado

Ids: `C` completo, `B` brochure, `P` propuesta. «receta» = id del catálogo `EFEONCE_DECK_SLIDE_RECIPES_V1.json`;
**NUEVA** = no existe todavía; **uso** = receta existente con contenido/plate propio (va a `approvedUses`).

| Lámina | C | B | P | Receta | Qué la hace propia |
|---|---|---|---|---|---|
| Portada «¿Te encuentran Google y la IA? Visible.» | 01 | 01 | — | `cover-brochure-line-engine` (uso) | logo SV360 (sv360-logo-negative) en 140,790 h64; plate `WB1c` (polo del kit bordado, desde 2026-09-30; antes `WB1b`) |
| Portada propuesta «¿Qué movemos en 2027? Tu visibilidad.» | — | — | 01 | `cover-proposal-orbit` (uso) | logo SV360 en 140,880 h56 |
| «¿Dónde busca tu cliente? En la IA.» | 02 | 02 | 02 | `decision-ai-market` | sin cambios |
| «¿A quién recomienda la IA? A tu competencia.» | 03 | 03 | 03 | `decision-ai-answer` | cuerpo «…la **próxima** respuesta te nombre» |
| «¿Dónde termina el SEO? En ingresos.» | 04 | — | 04 | `decision-traffic-to-revenue` | sin cambios |
| «¿Quiénes somos? Un solo equipo.» | 05 | 04 | — | `section-cine-about` (uso) | plate QS1b; cifras +10 años / 5 países / 1 interlocutor verificadas en `docs/context/01_quienes-somos.md` |
| Sección «¿SEO o AEO? Ambos.» | 06 | 05 | 05 | `section-split` (uso, registro cine) | plate nuevo **SX4** (caja de búsqueda + composer de vidrio, haces que se unen); navegación por capítulos (5) |
| Familia de marcas «¿Qué hay dentro? Cuatro piezas.» | 07 | 06 | 06 | **NUEVA** `content-brand-family` | nativa: lockups SV360 + AEO Assessment, AI Visibility Report, Insights (logos oficiales) |
| «¿Qué mueve tu SEO? La base.» | 08 | — | — | `content-bullets` (uso) | `selected` 3 |
| Sección equipo «¿Quién ejecuta tu SEO? Este equipo.» | 09 | 07 | 08 | `section-cine-team` (uso + **slot opcional `body`**) | plate BR2b; bajada «Lo ejecutan **expertos multidisciplinarios**: copywriters, especialistas en SEO técnico, relacionistas públicos, diseñadores y creativos.» (hoy superpuesta, 22 px, top 900, ancho 540) |
| «¿Y qué hace ese equipo? Todo esto.» | 10 | 08 | 09 | **NUEVA** `content-service-mockups` | nativa estilo «vive»: 3 fichas con maquetas nativas (SEO técnico: anillo 98 + checks; Contenido SEO: cluster con pillar; PR y link building: +18 dominios + curva) + 3 chips (Landing pages, Banners optimizados, Despliegue multi-CMS), plataforma de luz, lockup SV360 |
| SEO de cine «¿Te encuentra Google? Y la IA.» | 11 | 09 | — | `proposal-cinematic-seo` | lockup SV360 superpuesto |
| Propuesta SEO sobria | — | — | 10 | `proposal-service-seo` | lockup SV360 |
| «¿Por qué te citaría la IA? Porque confía.» | 12 | 10 | 07 | `method-eeat` | sin cambios |
| AEO de cine «¿Te distingue la IA? Entre miles.» | 13 | 11 | — | `proposal-cinematic-aeo` (uso) | **sin eyebrow**: el lockup AEO ocupa su lugar (140,112 h40); hoy se tapa con `patch-eyebrow.cjs` |
| Propuesta AEO sobria | — | — | 11 | `proposal-service-aeo` | lockup AEO |
| «¿Te recomienda la IA? Capa por capa.» | 14 | — | — | `method-staircase` (uso) | eyebrow «Metodología BeX»; lockup AEO |
| «¿Cómo te ve la IA? Mídelo.» | 15 | — | — | `method-score-ring` (uso) | eyebrow «El diagnóstico»; lockup AEO Assessment |
| «¿Qué recibes primero? El mapa.» | 16 | 22 | 28 | `decision-diagnosis-map` (uso) | eyebrow «Tu primer entregable», kicker «Efeonce AI Visibility Report»; lockup AI Visibility Report |
| «¿Y si hay que tocar código? Lo hacemos.» | 17 | 13 | 12 | `proposal-cinematic-web` (uso) | plate nuevo **DV1** (ingeniera front-end de Efeonce, softshell del kit, landing holográfica); pasos React y Next.js · Liquid · Drupal y WordPress · HTML, CSS y schema; selección «Engine» |
| «¿Cómo se sostiene? En ciclo.» | 18 | 12 | 13 | `method-surround-cycle` | sin cambios |
| «¿Dónde ves lo que pasa? Todo junto.» | 19 | — | 14 | `content-day-tools` (uso) | Notion «Plan editorial», Frame.io «Revisas las landings»; panel Greenhouse SEO |
| Vívelo «¿Cómo avanza tu SEO? A la vista.» | 20 | 14 | 15 | `content-day-live-progress` (uso) | tablero del cluster (Guía de precios, Landing de precios…); landing «norte» ficticia (`render-src/native/plate-landing.html`) |
| «¿Cómo avanza? Cada mes.» | 21 | 15 | 16 | `content-day-live-results` (uso) | lockup Insights; «Tu edición del mes está lista» |
| «¿Cómo te llega? Como la necesites.» | 22 | 16 | 17 | **NUEVA** `content-report-formats` | nativa: informe vivo **en interfaz blanca** (3 KPIs, curva 6 meses vs sector, ranking de respuestas, «La lectura del mes») + 5 formatos con íconos (Correo, Web y celular, Presentación destacada, PDF A4, Deck 16:9) unidos por haces |
| «¿Y el PPT del comité? Ya está.» | 23 | 17 | 18 | **NUEVA** `content-committee-deck` | nativa: lámina de comité en perspectiva con 2 apiladas detrás, titular escrito por la IA, +38 %, curva anotada, barra «Modo presentación» + 3 fichas |
| «¿Cómo sabes que funciona? Lo medimos.» | 24 | — | — | `content-measure-formulas` (uso) | 5 métricas SEO/AEO |
| Caso «¿Qué cambió con BICECORP? Más visible.» | 25 | — | 19 | `decision-case` (uso) | logo BICECORP; plate **CS2** (clienta en terraza, Santiago al amanecer); selección AEO; **cifras de ejemplo** |
| Caso «¿Qué logró Banco BICE? Más cuentas.» | 26 | — | 20 | `decision-case` (uso) | logo Banco BICE; plate **CS1b** (tarjeta Banco BICE + búsqueda + composer; logo oficial compuesto); selección SEO; **cifras de ejemplo** |
| «¿Conocemos tu industria? Por dentro.» | 27 | 20 | 21 | **NUEVA** `content-industries` | nativa: 6 fichas de vidrio con la pregunta que ese comprador le hace a la IA + ícono Trazo `composer`; Banca y finanzas destacada |
| «¿Dónde operamos? Cinco países.» | 28 | 21 | 22 | **NUEVA** `content-markets` | plate nuevo **MK2** (Américas de noche desde la órbita, 5 nodos exactos); etiquetas de país compuestas sobre cada nodo |
| Caso «¿Qué cambió con Berel? Lo eligen.» | 29 | — | 23 | `decision-case` (uso) | logo Berel; plate **CS3b** (sesión del squad: líder de Berel + estratega de Efeonce con softshell, muestras de color); **cifras de ejemplo** |
| «¿Qué nos hace distintos? Lo puedes ver.» | 30 | 18 | 24 | `decision-difference` | sin cambios |
| «¿Quién confía en nosotros? Marcas líderes.» | 31 | 19 | — | `content-clients` (uso) | selección «SEO»; cifras publicadas Sky (+127 %) y Bresler (+180 %) |
| «¿Y si no funciona? Empiezas chico.» | — | — | 25 | `decision-risk` (uso, línea growth en papel) | 4 riesgos SEO/AEO |
| «¿Qué pasa al empezar? Movimiento.» | — | — | 26 | `decision-plan` (uso) | Fundación · Contenido · Evidencia |
| «¿Cómo se cotiza? Por capacidad.» | — | — | 27 | `content-pricing` (uso) | Fundación · SV360 · Operación; `[MONTO]` |
| Próximos pasos «¿Y ahora qué sigue? Empecemos.» | 32 | 23 | — | `decision-next-steps` (uso) | Efeonce AEO Assessment; Fundación y SV360; días 5–9 oct |
| Contraportada brochure | 33 | 24 | — | `close-brochure-orbit` | sin cambios |
| Contraportada propuesta «Empower your Engine» | — | — | 29 | `close-proposal-horizon` | sin cambios |

## Brechas de receta (hoy resueltas fuera del compositor; hay que llevarlas a slots)

1. **Logo de submarca** (`sv360-lockup-negative`, `aeo-lockup-negative`, `aeo-assessment-lockup-negative`,
   `ai-visibility-report-lockup-negative`, `insights-lockup-negative`, `sv360-logo-negative`; `@efeoncepro/axis-brand-assets`
   0.4.5, sin editar): slot opcional nuevo (p. ej. `productMark`) en las recetas donde va: portada de línea (140,790 h64),
   portada de propuesta (140,880 h56), `content-text`, `proposal-cinematic` (seo/aeo), `proposal-service` (seo/aeo),
   `method-staircase`, `method-score-ring`, `decision-diagnosis-map`, `content-day-live-results` (140,44 h40). Overlays
   exactos por página: `render-src/bake.cjs` (`ov`).
2. **`proposal-cinematic` sin eyebrow con el lockup en su lugar** (AEO: 140,112 h40). Hoy el contrato exige el eyebrow.
3. **`section-cine-team` con `body` opcional** (la bajada del equipo).
4. **Seis láminas nativas** → recetas nuevas con plantilla (arriba). Sus HTML están en `render-src/native/` y las
   copias del canvas en `render-src/canvas-project/`.
5. **Navegación por capítulos:** `progress.sections` = 5 capítulos en todo el documento (`build.mjs`, `CH`); el
   contrato de documento exige el mismo `sections` en todas las páginas (`document-progress-inconsistent`).

## Fotos nuevas (fichas `fichas/`, plates `plates/`; PNG fuera de git)

| Plate | Receta | Cómo se generó | QA |
|---|---|---|---|
| `SX4-busqueda-y-respuesta.png` (1:1) | `section-split` | `pnpm foto:generar fichas/SX4-busqueda-y-respuesta.json --quality high` | sin marcas ni texto |
| `DV1-lo-hacemos.png` (16:9, 1792×1024) | `proposal-cinematic-web` | `pnpm foto:generar fichas/DV1-lo-hacemos.json` (softshell del kit, `linea: engine`) | `DV1-emblema-al-100.png`: nave, órbita, esfera, 3 ventanas |
| `CS1b-bice-tarjeta.png` (1:1) | `decision-case` Banco BICE | `pnpm ai:image --prompt-file fichas/CS1b-bice-tarjeta.prompt.txt` → tarjeta en blanco (`-plate.png`) + logo oficial Banco BICE blanco compuesto con sharp (rotado 4,22°, opacidad 0,93, en 520,372, ancho 236) | logo oficial, no generado |
| `CS2-banco-bice.png` (1:1) | `decision-case` BICECORP | `pnpm foto:generar fichas/CS2-banco-bice.json` | sin marcas |
| `CS3b-berel-squad.png` (1:1) | `decision-case` Berel | `pnpm ai:image --image <softshell del kit> --prompt-file fichas/CS3b-berel-squad.prompt.txt` | `CS3b-emblema-al-100.png` OK |
| `MK2-mercados.png` (1536×1024) | `content-markets` | `pnpm ai:image --prompt-file fichas/MK2-mercados.prompt.txt` (5 nodos exactos) | nodos medidos: Miami 1112,215 · CDMX 958,283 · Bogotá 1132,405 · Lima 1098,567 · Santiago 1181,773 |
| Descartes (no canonizar) | — | `SX1-seo-o-aeo`, `SX1c-seo-o-aeo-cine` (reemplazados por SX4), `SX3-a-otra-marca` (rechazado: «ataca al cliente»), `CS1-bicecorp` (Santiago, reemplazado), `CS3-berel` (pintor, reemplazado), `MK1-mercados` (sexto nodo en Brasil) | — |

## Logos de clientes nuevos (`logos/`, procedencia en `logos/PROCEDENCIA.txt`)

- `banco-bice.svg` (navy #023C70) y `banco-bice-blanco.svg`: SVG oficial de banco.bice.cl (CDN modyo), sólo recoloreado.
- `bicecorp.svg`: bicecorp.com publica una imagen 534×60 dentro de un SVG; se trazó con potrace (sin redibujar). El
  original corta la «P» por la derecha y el trazo lo conserva.
- Berel: ya existía (`src/lib/artifact-composer/catalogs/deck-axis/assets/clients/berel.svg`).
- Cuidado: `Bice-logo.svg` de Wikimedia es del BICE **argentino** (Banco Argentino de Desarrollo). Descartado.
