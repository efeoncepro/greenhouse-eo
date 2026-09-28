---
name: efeonce-graphic-line
description: The Efeonce graphic line «La órbita» end to end (living skill) — everything available in AXIS (tokens efeonceGraphicLine, contracts efeonce.graphic-line-orbit / collaboration-selection / email-signature, the @efeoncepro/axis-graphic-line package with its recipes, brand assets and the Lab), how to compose every piece (orbit, measure/trajectory, progress/deck, lens, spotlight, family map, state, voice question+answer, logo inline, slogan per service line, signature and URL bubble, email signature, merch, office, video), the motion language (the orbit alone and the three approved logo animations reveal/apertura/sting, values in efeonceGraphicLine.motion) and its convergence with the Efeonce photographic language, which stays in force. It routes composition BY SURFACE (web, DOOH, pDOOH, motion, audiovisual video, deck: contract efeonce.surface-composition 0.1.2, integrated in Greenhouse by TASK-1927 on 2026-09-27 (uses proposal/brochure, proposal-cinematic layouts service/hero/lines, the approved covers and back covers cover-brochure / cover-proposal / close-brochure / close-proposal — cover-classic and close-classic are superseded and never used —, and the multi-page brochure or proposal document), tokens efeonceGraphicLine.surfaces, pnpm surface:resolve in AXIS, the approved deck recipes — all 69 slides of the canvas «Deck» approved on 2026-09-27, each with a per-slide recipe in docs/operations/brand-graphic-line/deck-recipes/ (JSON efeonce.deck-slide-recipes.v1: use/avoid/prefer-instead, pairs, Composer data slots, fixed elements, photo and composition prompt; pnpm brand:deck-recipes) — and the cinema register proposal-cinematic allows (plus the approved exception for deck section and «about» slides), where the line's light counts as the piece's one orbit) and its Greenhouse production route: the recipes with a template are Artifact Composer templates (catalogs graphic-line-deck PDF, graphic-line-stills PNG, graphic-line-overlays PNG with alpha) composed end to end with pnpm brand:compose from an intent, including a whole brochure or proposal document as one PDF (mapper src/lib/brand-surfaces; options/pending fail with recipe-not-approved, video stays in motion; all 69 deck recipes have a template — the last one, cover-brochure-cine-lines-selection, composes since 2026-09-28 with the cover-brochure layout document-selection (AXIS 0.3.21); catalog lengths are enforced and the composer rejects overflowing text). It also holds the Glitch sub-line (Efeonce's weekly magazine — covers A/B/C, LinkedIn carousel, blog banners and callout, vlog and reel overlays — and the Glitch Flash, the breaking-news format without edition number, composed with pnpm glitch:compose and a manifest with edition.kind "flash") — the apple as sphere, Glitch green, byte glitch, Guttery and the «EDICIÓN #N» masthead apply ONLY to Glitch; load references/glitch.md for any Glitch piece. It also owns the line's canonical iconography (two voices: Trazo for what is measured, Plastilina for what is created; the sphere as a rest/response state; the skewed orbit; @efeoncepro/axis-graphic-line/icons with resolveIcon, auditIconGroup, skewedOrbitHeroSvg and pnpm icons:export|check|vectorize in AXIS). Use for ANY piece, surface, code or doc that uses the orbit, the lens, the spotlight, the sphere as a full stop, the «Empower your …» slogan, the Efeonce signature, the logo animations or the axis-graphic-line package; for any icon or icon row in an Efeonce-brand piece (deck, report, social post, sticker, cover) and for creating a new glyph; before composing with AXIS or the Greenhouse compilers (creative:orbit, creative:layout graphic_line, foto:componer:cta marcaEnEscena, brand-motion); and when a human asks what is available or how something is built. Every session that changes the line, its tokens, contracts, package, Lab, motion or its photographic convergence MUST update this skill (see Skill Maintenance Contract).
---

# Efeonce «La órbita» — línea gráfica (skill viva)

La órbita es la forma propia de Efeonce: **anillo fino + arco con la esfera en la punta + halo**, nacida del isotipo.
Hace tres trabajos: **rodea** (una palabra, una lente, un objeto), **mide** (el arco es un dato real con fuente) y
**enfoca** (la lente y el foco, «Te hacemos visible»). Convive con el **lenguaje fotográfico de Efeonce**, que sigue
vigente: la foto muestra el oficio, la órbita señala lo que importa, y cada uno hace mejor al otro.

Esta skill sabe todo lo disponible y cómo componerlo. Los tokens guardan los números; **el criterio** —cuándo y cómo
usar cada elemento, con qué y por qué— está en [criteria.md](references/criteria.md), y pesa tanto como la API.
**Nunca inventes una API, un valor o una regla:** si no está en estas referencias o en el código, no existe; dilo y
propón agregarlo.

## Alcance

- **Sí:** marca propia Efeonce y su familia (Globe, Wave, Reach, RevOps, Greenhouse como marca), piezas sociales,
  deck, informes, firma de correo, merch, oficina, eventos, video de marca.
- **No:** trabajo de clientes, la interfaz del producto Greenhouse, piezas de otra marca. La órbita no es un adorno
  genérico.

### Glitch: sub-línea sólo para Glitch

Glitch (el magazine semanal de Efeonce) tiene una **sub-línea complementaria** de La órbita. Si la pieza es de Glitch
(portada, carrusel, contraportada, blog, vlog o reel), carga [references/glitch.md](references/glitch.md) además de
esta skill: ahí están lo que hereda, sus valores, el sistema de portada A/B/C aprobado y qué es propuesta. Glitch tiene
**dos formatos** (2026-09-28): la edición semanal («EDICIÓN #N», los lunes) y el **Glitch Flash** (una noticia puntual,
sin número: «NO ESPERA AL LUNES» + «FLASH»), lanzado en producción el 2026-09-28, publicado en AXIS
(`glitchLine.editions.flash` y piezas `flash-*` en `axis-tokens` 0.3.24; contrato `efeonce.glitch-line` 0.2.0 en
`axis-ui-contracts` 0.3.22) y compuesto en local con `pnpm glitch:compose` y un manifiesto `edition.kind: "flash"`
([glitch.md §14](references/glitch.md)); la ruta productiva (TASK-1921) todavía sólo conoce la edición semanal. **Nunca** uses
la manzana, el verde Glitch, la falla en bytes, Guttery ni la cabecera «EDICIÓN #N» en una pieza de Efeonce, y nunca
dos esferas en una pieza (manzana + lente u órbita).

## Por dónde empezar (carga selectiva)

| Necesitas… | Lee |
|---|---|
| **Componer un deck, un brochure o una propuesta HOY** (portada, contraportada, páginas de servicio, documento completo en un PDF): qué recetas tienen plantilla, con qué `layout`, y los campos del intent | [applications.md §L, «Componer el deck hoy»](references/applications.md) + skill `deck-studio` §«Componer hoy con `pnpm brand:compose`» |
| **Añadir o modificar una receta del deck de punta a punta** (token y release en AXIS → builder, plantilla, slots, registro, mapa y ejemplo en Greenhouse → paridad → gate y ledger) | [applications.md §L, «Añadir o modificar una receta del deck»](references/applications.md) + [lessons.md](references/lessons.md) (2026-09-27/28) + [qa-checklist.md §8d](references/qa-checklist.md) |
| **Cambiar la foto, el copy o la sección de una lámina ya compuesta** (qué campo del intent, recorte, espejo en `panel-end`, sección partida sin control de foco) | [applications.md §L, «Cambiar la foto, el copy o la sección»](references/applications.md) + [manual de uso](../../../docs/manual-de-uso/creative/componer-por-superficie-con-axis.md) + [qa-checklist.md §8d](references/qa-checklist.md) |
| **Elegir o armar una lámina de deck de marca propia** (brochure, propuesta, pitch, QBR): cuál de las 69 aprobadas usa cada documento, cuándo sí y cuándo no, pares, slots, foto y prompt | [catálogo de recetas por lámina](../../../docs/operations/brand-graphic-line/deck-recipes/README.md) + [norma §4.6, «Recetas por lámina»](../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) + [manual](../../../docs/manual-de-uso/creative/componer-deck-con-recetas.md) + skill `deck-studio` |
| **Planificar un deck entero y validarlo antes de componer** (plan de ids de receta, `pnpm brand:deck-plan -- --plan`, códigos de error y aviso, propuesta del agente con `--propose --context`) | skill `deck-studio` §«Plan del deck» + [applications.md §L, «Componer el deck hoy»](references/applications.md) + [qa-checklist.md §8d](references/qa-checklist.md) |
| **Una pieza para una superficie concreta** — hero web, DOOH (caminero, paleta), pDOOH (LED, mupi, spot, variantes), gráfica animada con foto, video (cartela, zócalo, super, subtítulos) o lámina de deck (incluida la propuesta de cine `proposal-cinematic`): recetas aprobadas, opciones, pendientes, rechazos, firma por soporte y cómo se compone con AXIS | [norma de composición por superficie](../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) + [applications.md §L](references/applications.md) + guías AXIS `docs/agent-composition/surfaces/` (en `main` de AXIS; [Lab](https://axis.efeonce.org/references/surfaces/)) + la página de la superficie en el [canvas](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7) (empieza por su lámina «Guía · cómo componer …»). **Receta aprobada → `pnpm brand:compose`** ([norma §2.1](../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#21-la-ruta-por-el-artifact-composer-desde-el-2026-09-27-task-1919), [manual de uso](../../../docs/manual-de-uso/creative/componer-por-superficie-con-axis.md)) |
| **El criterio**: qué significa cada elemento (anillo, arco, esfera, halo, lente, foco, voces, eslogan, firma), cuándo usar la órbita y cuándo no, con qué se combina y qué delata que no se entendió la línea — **léelo primero** | [references/criteria.md](references/criteria.md) |
| Saber qué existe: tokens, contratos, funciones del paquete, assets, comandos, versiones, el mapa del Lab | [references/package-and-tokens.md](references/package-and-tokens.md) |
| **Una aplicación concreta**: post, story, banner de LinkedIn, ads, deck, informe, firma de correo (personal y de equipo), oficina y uso del espacio, objetos, merch, vestir, credenciales, papelería, eventos, video — qué elementos van, dónde y cómo se produce | [references/applications.md](references/applications.md) |
| Decidir qué forma o receta usar y componer la pieza, con ejemplos completos | [references/composition.md](references/composition.md) |
| Una pieza con foto, o briefear una foto que llevará la órbita | [references/photography-convergence.md](references/photography-convergence.md) |
| Animar (la órbita sola o las animaciones del logo) | [references/motion.md](references/motion.md) |
| **Sonido de la marca**: logo sonoro, motion con sonido y etiqueta con voz (identidad **recomendada**, no canon; el sonido de Glitch es aparte: [glitch.md §13](references/glitch.md)) | [references/motion.md](references/motion.md) §Sonido · [canon](../../../docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md) · skill `audio-studio` · AXIS `/references/sonic-brand.json` |
| Dónde está cada doc, archivo, medio y repositorio | [references/sources-and-assets.md](references/sources-and-assets.md) |
| **Íconos**: las dos voces canónicas (Trazo y Plastilina), la esfera como estado, cuándo responde, la órbita sesgada y cómo dar de alta un glifo nuevo. **Fuente de verdad en AXIS**: `efeonceGraphicLine.icons` + `@efeoncepro/axis-graphic-line/icons` (`resolveIcon`, `auditIconGroup`) y `pnpm icons:*` | [references/iconography.md](references/iconography.md) |
| **Un objeto protagonista en volumen** (Plastilina en volumen, D24): la tercera capa, arcilla mate inflada derivada del vector aprobado; portada, KV, social de un objeto, escenario, merch. PNG con alfa de `@efeoncepro/axis-brand-assets` (`volumeIconUrl(glyph)`), tokens `efeonceGraphicLine.icons.volume`, alta con `pnpm icons:volume` en AXIS | [references/iconography.md §12](references/iconography.md) + [criteria.md §3.14](references/criteria.md) |
| Revisar antes de entregar | [references/qa-checklist.md](references/qa-checklist.md) |
| Qué decidió el operador, qué está pendiente, qué versiones hay | [references/ledger.md](references/ledger.md) |
| Trampas que ya costaron tiempo | [references/lessons.md](references/lessons.md) |
| **Una pieza de Glitch** (magazine semanal): portada A/B/C, carrusel, blog, vlog/reel — sub-línea sólo para Glitch; un **Glitch Flash** (noticia puntual, sin número de edición; se compone con `pnpm glitch:compose -- --manifest <flash.json>`) | [references/glitch.md](references/glitch.md) (Flash: §14; manifiesto y salidas: §9.1 y §14.4) |
| **Motion de Glitch** (APROBADO 2026-09-27; sólo Glitch): apertura y tarjeta final v2, pre-roll de la intro, kit de overlays, transición de bytes (entre piezas y entre escenas, exclusiva de Glitch) y héroe; se produce con HyperFrames en el taller (`pnpm -C ../efeonce-brand-workshop --filter glitch-motion doctor\|render\|kit\|transiciones\|heroe`), que entrega sonido B y música con cada pieza; nunca se anima a mano | [references/glitch.md §12](references/glitch.md) + norma §13.13 (comandos y argumentos) |
| **Sonido de Glitch** (APROBADO, versión B, 2026-09-27; sólo Glitch, nunca Efeonce): WAV sidecar por `.mov` del motion, archivos en `glitch/sound/v1/` del bucket de AXIS, motor migrado al taller (`tools/glitch-motion/src/sound.mjs` sobre `tools/brand-sound`, commit `2d411b8`): regenerar = correr el mismo comando de `glitch-motion` | [references/glitch.md §13](references/glitch.md) |
| **Música de Glitch** (APROBADA 2026-09-27; sólo Glitch): tema B (intro, cortina, salida) y cama post-punk bajo la noticia; másteres por URL + sha256 en `glitch/music/v1/` del bucket de AXIS, nunca regenerados; cama 15 dB bajo la voz con ducking, sin recortar medios y sólo bajo las noticias; integrada al taller (`tools/glitch-motion/src/music.mjs`, pre-roll de la intro, `--music off`) y en producción en AXIS (`#musica`, `glitch.json → music`); único pendiente: la mezcla con la voz real del host | [references/glitch.md §13.7](references/glitch.md) |

## Reglas duras (las más caras de romper)

1. **Ningún texto cruza la órbita.** Una órbita o una lente por pieza, nunca patrón.
2. **El arco mide un dato real con fuente** o no existe. Un dato es la posición de la esfera (parte a las 12, sentido
   horario, valor × 360°) con estela corta: la órbita **recorre**, nunca se llena como un loader. Al 100 % la esfera
   se queda.
3. **Un solo anillo alrededor del contenido**; las órbitas interiores sólo en una órbita vacía (el contrato lo rechaza:
   `inner-orbits-never-around-content`).
4. **La lente lleva arco y esfera** (nunca un disco suelto). **El foco siempre lleva su anillo**, concéntrico con la luz.
5. **Las piezas de formato fijo se reproducen, no se derivan**: `efeonceGraphicLine.pieces` y `portrait` guardan cada
   pieza medida del canvas; las recetas del paquete las pintan tal cual.
6. **La esfera que cierra el texto es parte del texto**: guías, marcas de corte, selección y cursores la incluyen.
7. **Efeonce firma todo**: logo centrado abajo; la burbuja `efeoncepro.com` sólo reemplaza al logo si el logo ya
   aparece en la imagen, y nunca va como texto. **El logo va dentro de la órbita sólo en cierres de marca** (cierre del
   deck, cierre de video, muro de recepción), con su resguardo X fuera del anillo; en todo lo demás, nunca.
8. **La línea de servicio decide el acento y la palabra del eslogan** («Empower your Growth | Brand | Engine | Voice |
   Revenue»). El eslogan sólo cierra, sin esfera ni mayúsculas, **nunca en la portada** (operador, 2026-09-27): en la
   contraportada de una propuesta comercial es el mensaje principal («Empower your Growth»); en la de un brochure firma
   debajo de «¿Conversamos? Cuando quieras.» (norma `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6). **El acento mide ≥ 3:1 contra su fondo** en gráfico y en
   texto ≥ 24 px, y **nunca va en texto de menos de 24 px** (ahí navy sobre claro, blanco sobre oscuro).
9. **La órbita no sustituye la composición fotográfica**: se declara a propósito y nunca cubre sujeto, reservas, lecho
   ni firma (chequeo `orbit-never-over-subject-or-reserves`).
10. **Valores sólo desde tokens** (`efeonceGraphicLine`, `axisMotion`): nunca HEX, px, grados o tiempos transcritos
    de un doc, el canvas o un comentario. Archivos de marca sólo desde `@efeoncepro/axis-brand-assets`.
11. **Movimiento:** la órbita sola sale del paquete; las animaciones del logo (reveal, apertura, sting) siguen el
    lenguaje de movimiento y sus valores de `efeonceGraphicLine.motion`. Nunca se generan con un modelo de video.
12. **Íconos sólo del catálogo de AXIS** (canónicos, D16–D22): **nunca dibujes un ícono a mano dentro de una pieza**;
    se pinta con `resolveIcon` (`@efeoncepro/axis-graphic-line/icons`), con la voz de la línea de la pieza, en reposo por
    defecto; responde **uno solo** y sólo si la pieza no tiene otra esfera, y el grupo pasa `auditIconGroup` antes de
    entregar. Un glifo nuevo se da de alta en AXIS con `pnpm icons:check` (Plastilina, antes `icons:vectorize`) **y** la
    aprobación del operador: el control mide el peso, no el carácter. **Plastilina en volumen** (D24): sólo el PNG de
    `@efeoncepro/axis-brand-assets` (`volumeIconUrl(glyph)`), uno por pieza, protagonista y desde 160 px; nunca se
    genera de nuevo dentro de una pieza, nunca en listas, contenido de deck, dashboards ni UI, y nunca junto al plano o
    al Trazo en un mismo grupo.
13. **Se compone por superficie** (2026-09-27): fuera de social, 1:1 y firma (que siguen en el contrato de la órbita),
    la pieza se declara con superficie, formato, papel y receta en `efeonce.surface-composition` y se resuelve con
    `pnpm surface:resolve` en AXIS; los `delegates` del manifest van a los compositores de Greenhouse. **Nunca
    coordenadas ni canal elegidos a mano.** El registro cine sólo con Nexa protagonista, en `proposal-cinematic` y, por
    excepción aprobada el 2026-09-27, en las láminas de **sección y «about»** del deck (nunca en social, web, publicidad
    ni contenido; [registro cine](../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md), delta
    (c)); **ahí la luz de la
    línea es un fenómeno fotográfico (anillo, esfera, moño, esferas de acento) y cuenta como órbita: una sola órbita por
    pieza**, así que no se agrega otra gráfica encima. Contrato vigente: 0.1.2 (usos, marco de portadas y
    contraportadas, layouts de `proposal-cinematic`, documento; [applications.md §L](references/applications.md));
    Greenhouse compone sobre la 0.1.2 desde TASK-1927 (2026-09-27) y un intent 0.1.0 o 0.1.1 resuelve igual.
    **Una receta aprobada se compone con `pnpm brand:compose`** (Artifact Composer, TASK-1919), no como maqueta: sólo
    las aprobadas tienen plantilla (el resto falla con `recipe-not-approved`) y el composer **nunca anima** (entrega
    cuadros fijos, el último cuadro del loop y capas con alfa; `audiovisual.close-reveal` falla con
    `recipe-outside-composer`). Una receta nueva entra al catálogo sólo tras la aprobación del operador, con su
    plantilla bajo `pnpm composer:visual-gate --catalog=graphic-line`. **Deck (2026-09-27): las 69 láminas están
    aprobadas y cada una tiene su receta** en `docs/operations/brand-graphic-line/deck-recipes/`
    (`efeonce.deck-slide-recipes.v1`); una lámina de marca propia se **elige** del catálogo de recetas, no se inventa,
    y se **compone** con el intent de AXIS; **antes de componer un deck, su plan (ids de receta) pasa por
    `pnpm brand:deck-plan -- --plan plan.json`** sin errores (TASK-1929; detalle en `deck-studio` §«Plan del deck»). **Las 69 componen con `brand:compose`** sobre 50 plantillas (mapa
    receta → `contentType` → plantilla en la skill `deck-studio`, `composition.md` §«Mapa receta → plantilla»); la
    portada `cover-brochure-cine-lines-selection` compone desde el 2026-09-28 con el layout `document-selection` (AXIS
    0.3.21; el operador relajó «sin selección en cover-brochure» sólo para ella). Las plantillas hornean las decisiones
    de norma de TASK-1928 (acento nunca bajo 24 px, respuesta ≥ 3× la pregunta, cifras con fuente visible, sin logo ni
    velo en láminas interiores con foto, burbuja URL en partners, logos de terceros normalizados; detalle en
    [ledger.md](references/ledger.md)) y **los largos del catálogo son el límite**: el compositor rechaza el texto que
    se pasa. **`cover-classic` y `close-classic` no se usan** (el operador no las aprobó; en AXIS quedan
    `supersededBy`). **El contenido de una lámina es dato del intent** (foto, copy, sección, cifras, selección): se
    edita un intent propio —nunca un ejemplo de `src/lib/brand-surfaces/examples/`, ni la plantilla, ni la salida— y
    se vuelve a componer ([applications.md §L](references/applications.md), «Cambiar la foto, el copy o la sección»).
    **Añadir o cambiar una receta** es otra cosa: AXIS primero, luego Greenhouse, paridad y gate
    ([applications.md §L](references/applications.md), «Añadir o modificar una receta del deck»). **Estado
    (2026-09-28):** TASK-1927 y TASK-1928 `complete`, aprobadas por el operador y en `origin/develop`; la ruta
    productiva (TASK-1921) está `in-progress` en otra sesión y **no** está disponible; el validador del plan (TASK-1929)
    está `complete` en `develop`.
14. **Estado honesto:** la órbita es un sistema consistente, **no** un activo distintivo demostrado; la prueba sin
    logo va antes de cualquier pauta con la órbita. «Te hacemos visible» no sale a pauta sin revisión legal.

## Cómo se trabaja

1. Lee el pedido y decide con `criteria.md` si la órbita corresponde (¿rodea, mide o enfoca algo concreto?). Si no, la
   pieza va sin órbita: la fotografía y la tipografía bastan.
2. Elige la forma o la receta con el árbol de `composition.md`. Si la pieza vive en una superficie (web, DOOH, pDOOH,
   motion, video, deck), parte de la norma de composición por superficie y de su página del canvas. Si hay foto, aplica
   `photography-convergence.md` antes de componer.
3. Compón **por intención** (contrato) o con la **receta** del paquete; en Greenhouse, con los compiladores
   (`pnpm creative:orbit:render`, `pnpm creative:layout`, `pnpm foto:componer:cta`). **Si la pieza es una receta
   aprobada por superficie, `pnpm brand:compose -- --intent <intent.json>`** la entrega entera (ejemplos en
   `src/lib/brand-surfaces/examples/`). Los íconos, con `resolveIcon` de `@efeoncepro/axis-graphic-line` (Greenhouse lo
   usa en `src/lib/brand-surfaces`; fuera de esa ruta, `pnpm icons:export` en AXIS).
4. Corre los chequeos del adapter y el QA de `qa-checklist.md` sobre los píxeles finales.
5. Si aprendiste algo, actualiza esta skill (abajo).

## Skills vecinas

- `efeonce-brand-studio` — estrategia y gobierno de marca; decide el papel de la marca en la pieza.
- `design-studio` — dirección de arte, fotografía generada y QA de imagen; dueña del lenguaje fotográfico operativo.
- `efeonce-advertising-creative` — piezas con texto, CTA y selección colaborativa.
- `motion-design-studio` — oficio de video; para la marca Efeonce carga la norma de movimiento.
- `axis-design-system` — releases, paquetes y consumo privado de AXIS.
- `deck-studio`, `report-studio`, `social-media-studio` — formatos; esta skill les dice cómo entra la órbita.

## Skill Maintenance Contract (documento vivo, obligatorio)

Esta skill es la memoria operativa de la línea. **Un cambio a la línea no está terminado hasta que la skill lo
refleja**, en el mismo commit o en el inmediato siguiente. Aplica a Claude, Codex y cualquier agente, y a toda sesión
que toque: tokens `efeonceGraphicLine` (incluido `efeonceGraphicLine.icons`) o `axisMotion`; contratos
`graphic-line-orbit`, `collaboration-selection` o `email-signature`; el paquete `axis-graphic-line` (incluido `/icons`)
o `axis-brand-assets`; el Lab de la línea; los compiladores o el motion
de Greenhouse; los catálogos `graphic-line-*` del Artifact Composer o `src/lib/brand-surfaces` (y el contrato
`efeonce.surface-composition`); el manual, el ADR, la norma de movimiento o el lenguaje fotográfico.

**Qué se actualiza y dónde:**

0. `references/criteria.md` — todo criterio nuevo o corregido del operador (qué significa un elemento, cuándo va y
   cuándo no, qué combina, qué error delata), con el ejemplo y la razón. Las correcciones del operador son la fuente más
   valiosa: se registran en el momento, con fecha.
1. `references/package-and-tokens.md` — todo token, campo de contrato, código de error, chequeo, función, atributo,
   comando o versión que aparezca, cambie o se retire.
1b. `references/applications.md` — toda aplicación nueva o regla de uso del espacio, con su tarjeta completa.
2. `references/composition.md` — toda forma, receta o regla de composición nueva, con un ejemplo real.
3. `references/photography-convergence.md` — todo cambio del lenguaje fotográfico o de la línea que afecte cómo
   conviven (y la sección recíproca de ambos docs canónicos).
4. `references/motion.md` — piezas, tiempos, entregables, comandos o destinos de medios.
4b. `references/iconography.md` — voces, glifos del catálogo, reglas de respuesta, órbita sesgada, comandos de alta y
   pendientes de la iconografía (el detalle vive en AXIS; aquí el criterio y la historia).
5. `references/qa-checklist.md` — todo chequeo nuevo o umbral medido.
6. `references/ledger.md` — **toda** decisión del operador (con fecha) y toda versión publicada; mover a «vigentes» un
   pendiente que el operador decida.
7. `references/lessons.md` — toda trampa que costó más de 15 minutos: fecha, síntoma, causa y regla. Se escribe en el
   momento, no al cierre.
8. `SKILL.md` — la descripción si cambió la superficie de disparo; una regla dura sólo si nació un invariante
   verificado en código o decidido por el operador.
9. Actualizar el sello «Verificado contra: repo@sha — fecha» de cada referencia que tocaste.

**Cómo se verifica:**

- AXIS: `pnpm build && pnpm test && pnpm typecheck && pnpm lint && pnpm design:check`; Lab
  `pnpm --filter @efeonce/axis-design-system-lab build && … test:e2e`.
- Greenhouse: `pnpm creative:layout:test`; motion: storyboard antes/después comparado byte a byte si se tocó el motor;
  composer por superficie: tests de `src/lib/brand-surfaces` y de los catálogos, `pnpm brand:tokens --check` y
  `pnpm composer:visual-gate --catalog=graphic-line` a 0 px (un bump de AXIS mueve píxeles: se declara en
  una sección nueva de `BASELINE_DELTAS.md`; `--freeze` sólo acepta los frames que esa sección nombra). **Todo bump
  de `@efeoncepro/axis-tokens` corre `pnpm brand:tokens` y `pnpm glitch:tokens`, y los dos con `--check`, antes del
  commit** (el CI de `53002b352` falló por regenerar sólo los de Glitch; [lessons.md](references/lessons.md),
  2026-09-28). Glitch: tests de `src/lib/glitch-composition` y `pnpm composer:visual-gate --catalog=glitch` a 0 px.
- Skill: espejo `.claude/skills/efeonce-graphic-line/` → `.codex/skills/efeonce-graphic-line/`
  (`rsync -a --delete .claude/skills/efeonce-graphic-line/ .codex/skills/efeonce-graphic-line/`) y `pnpm skills:mirrors`.
  Se edita `.claude/` y se espeja; nunca al revés.
- Docs: `pnpm docs:context-check` y, si cambió algo de marca, el manual y el ADR con su delta.

**Frescura:** si una referencia tiene un sello de más de 30 días o el código no coincide con lo que dice, se revisa
contra el código antes de usarla, y se corrige la referencia.
