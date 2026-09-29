# Registro Marketing con Manzanitas — registro complementario de «La órbita» — Decision V1

> **⚠️ Alcance: esta decisión aplica SÓLO a piezas de Marketing con Manzanitas (MCM)**, la marca editorial evergreen
> del blog de Efeonce. No reemplaza ni modifica la línea gráfica de Efeonce ([ADR «La órbita»](./EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)),
> no se aplica a otras piezas de Efeonce y no se mezcla con la [sub-línea de Glitch](./GLITCH_GRAPHIC_LINE_DECISION_V1.md).
>
> **Tipo de documento:** ADR (decisión de marca y de composición)
> **Estado:** **Accepted** (2026-09-28) — aprobado por el operador (Julio Reyes): toda la línea del canvas v39 y su
> canonización como registro complementario de La órbita (citas en [Contexto](#contexto)). El [plan de AXIS](#plan-en-axis-ejecutado-el-2026-09-28)
> **se ejecutó y se publicó el 2026-09-28** (tag `v0.3.26`; ver [Delta 2026-09-28](#delta-2026-09-28--publicado-en-axis)).
> El **2026-09-29** el operador decidió **las 10 pendientes** en dos rondas: 7 publicadas en AXIS `v0.3.28` (contrato
> 0.2.0; ver [Delta 2026-09-29](#delta-2026-09-29--decisiones-del-operador-y-catálogo-del-artifact-composer)) y las 3
> últimas esa tarde, publicadas en AXIS `v0.3.29` (contrato 0.3.0; ver
> [Delta 2026-09-29 (b)](#delta-2026-09-29-b--sin-decisiones-abiertas-axis-v0329-y-el-equipo-real-en-la-fotografía)).
> **No queda ninguna abierta.** Greenhouse compone MCM con el Artifact Composer (`pnpm manzanitas:compose`, TASK-1939
> `in-progress`).
> **Fecha:** 2026-09-28
> **Owner:** Marca Efeonce (operador: Julio Reyes). Greenhouse guarda el canon humano; AXIS es el dueño de los
> valores y del contrato desde el 2026-09-28.
> **Alcance técnico:** este ADR, la norma operativa y la referencia para agentes de la skill `efeonce-graphic-line`. En
> AXIS, **publicados**: token `manzanitasRegister`, contrato `efeonce.manzanitas-register`, `assets/manzanitas/`, módulo
> `charts` de `axis-graphic-line` y Lab `/references/manzanitas/`. En Greenhouse, desde el 2026-09-29: los pins de AXIS
> (`axis-tokens` 0.3.28, `axis-ui-contracts` 0.3.28, `axis-graphic-line` 0.10.1, `axis-brand-assets` 0.4.1), los catálogos
> `manzanitas-carousel` y `manzanitas-stills` del Artifact Composer y el comando local `pnpm manzanitas:compose`
> (TASK-1939); desde esa tarde, los pins de `v0.3.29` (`axis-tokens` 0.3.29, `axis-ui-contracts` 0.3.29,
> `axis-graphic-line` 0.11.0, `axis-brand-assets` 0.4.1) y el [roster del equipo](../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md)
> para la fotografía. La ruta productiva (API, `artifact-worker`, MCP) todavía no compone MCM (TASK-1921).
> **Reversibilidad:** `two-way` (documentación, piezas y un catálogo local; ver [Reversibilidad](#reversibilidad)).
> **Confianza:** `high` en la decisión (aprobación y canonización explícitas del operador) y en su publicación en AXIS.
> **Validado al:** 2026-09-29 — valores medidos en el canvas v39, publicados en AXIS `v0.3.26`, `v0.3.28` (`2bfe206`) y
> `v0.3.29` (`main` `f722a6f`, workflow «Release UI packages v0.3.29» y CI de `main` en verde) y compuestos por el
> catálogo de Greenhouse (commits `1050036e8` y `2c95e60b2`, gate visual a 0 px).
> **Creado:** 2026-09-28 por Claude, a pedido del operador (Julio Reyes)
> **Última actualización:** 2026-09-29 por Claude (delta (b): las tres últimas decisiones, AXIS `v0.3.29` y su adopción
> en Greenhouse; antes, el delta de las siete decisiones y el catálogo del Artifact Composer, TASK-1939)
> **Norma operativa:** [`MANZANITAS_REGISTER_V1.md`](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md)
> **Referencia para agentes:** `.claude/skills/efeonce-graphic-line/references/manzanitas.md` (skill `efeonce-graphic-line`)
> **Línea madre:** [`EFEONCE_GRAPHIC_LINE_V1.md`](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) ·
> [ADR «La órbita»](./EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)
> **Hermana (no se mezcla):** [ADR de la sub-línea de Glitch](./GLITCH_GRAPHIC_LINE_DECISION_V1.md)
> **Relacionadas:** [Biblioteca de recursos de MCM](../operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md) ·
> [ADR del Artifact Composer](./GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md) ·
> [TASK-1939, catálogo del Artifact Composer](../tasks/in-progress/TASK-1939-manzanitas-artifact-composer-catalog.md) ·
> [Roster del equipo en la fotografía](../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md)
> **Canvas de referencia (privado):** [«Marketing con Manzanitas · Línea v1»](https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG), versión 39
> **Sistema de diseño de referencia (privado):** [«Efeonce — La órbita»](https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc)


## Delta 2026-09-29 (b) — sin decisiones abiertas: AXIS `v0.3.29` y el equipo real en la fotografía

### (a) Las tres últimas decisiones del operador

La misma tarde del 2026-09-29 el operador respondió las tres pendientes que quedaban (5, 6 y 7). Con ellas,
`manzanitasRegister.pendingDecisions` queda **vacío** y `resolvedDecisions` suma diez (las siete del
[Delta 2026-09-29](#delta-2026-09-29--decisiones-del-operador-y-catálogo-del-artifact-composer) más estas tres).

| # | Pendiente | Decisión (operador, verbatim) | Dónde vive en el token |
|---|---|---|---|
| 5 | El copy de cierre de la story | «El texto de cierre tiene que variar dependiendo el contexto, no puede quedar fijo, lo que sí puedes normalizar es su extensión para que no rompa el diseño.» El cierre cambia con el contexto y nunca queda fijo; se normaliza su extensión en la contraportada A y en la story de cierre: pregunta ≤ 44 caracteres, respuesta ≤ 10, bajada ≤ 56. El contrato devuelve `close-copy-too-long` y exige la voz de la story de cierre (`voice-missing`). El «Guárdala» provisional queda retirado | `closeCopy` (`varies: 'by-context'`, `fixed: false`, `pieces: ['back-cover-a', 'story-close']`, `maxChars`); decisión `story-close-copy` |
| 6 | El registro cine con personas del equipo en redes | «Las personas del equipo todas están en el repo, tienes que ponerlas sin la foto de María Fernanda, en sustitución de María Fernanda está Valentina Hoyos, ella entrega sus fotos si no las encuentras en el público del repo.» Las fotos cine de MCM pueden mostrar a personas reales del **equipo actual**, sólo desde las fotos del equipo que mantiene Greenhouse. El token **no nombra a nadie** (el Lab es público): la lista vive en el [roster del equipo](../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md) | `teamPeople = { allowed: true, rosterSource: 'greenhouse-team-roster', onlyCurrentTeam: true }`; decisión `cine-team-people-social` |
| 7 | Los Trazo candidatos `republicar` y `enviar` | «Los íconos de republicar y enviar tienes autorización de crearlos.» Entran al catálogo: `republicar` en modo `replace` (la punta de la flecha de arriba se vuelve la esfera; aire 0,500) y `enviar`, un avión de papel, en modo `complete` (la esfera aparece donde llega el envío; aire 1,389). Los dos pasan `pnpm icons:check`. El set queda en **39 Trazo + 49 Plastilina = 88** (`ICON_CATALOG`) | `@efeoncepro/axis-graphic-line/icons` 0.11.0; decisión `stroke-republicar-enviar` |

Sobre el vestuario del equipo, el operador precisó: «Esos retratos son viejos, hoy todos a excepción de Valentina y de mí
salen con Hoodie Efeonce.»

### (b) El patch de AXIS: `v0.3.29`

Publicado con la autorización del operador («Te autorizo a publicar el patch de axis que indicas»): tag `v0.3.29`, `main`
en `f722a6f`, workflow «Release UI packages v0.3.29» y CI de `main` en verde.

| Paquete | Versión | Qué trae |
|---|---|---|
| `@efeoncepro/axis-tokens` | **0.3.29** | las tres decisiones en `resolvedDecisions` y `pendingDecisions: []`; `manzanitasRegister.closeCopy` y `teamPeople`; `efeonceGraphicLine.slogan.widthEmByWord` (Growth 11,586 · Brand 10,903 · Engine 11,263 · Voice 10,641 · Revenue 12,278 em); `slogan.closeLockup` sin `sloganPx` (`{ logoPx: 400, blockEndsY: 1253, byCanvas: { 'youtube-16x9': { logoPx: 260, align: 'center' } } }`); `backCover.phone390` sin cuerpo fijo de eslogan; la órbita del paso en `pieces['step-pizarra'].orbit = { cx: 640, cy: 500, r: 324 }` |
| `@efeoncepro/axis-ui-contracts` | **0.3.29** | contrato `efeonce.manzanitas-register` **0.3.0** (acepta intents 0.1.x y 0.2.0): `close-copy-too-long`; la voz obligatoria en la story de cierre; los rótulos del gráfico (`caption`, `figureLabel`, `columnLabels`, `keyLabels`, `rateHeader`) con `chart-labels-invalid`; el eslogan resuelto en el manifiesto (`slogan.px`, `gapPx`, `widthEm`, `wordInAccent`, `wordColor` —acento o tinta— y `position: 'below-logo'`) |
| `@efeoncepro/axis-graphic-line` | **0.11.0** | los Trazo `republicar` y `enviar`; `manzanitasChartSvg` lee los rótulos del dato (una opción explícita manda) |
| `@efeoncepro/axis-brand-assets` · `axis-ui-registry` | 0.4.1 · 0.3.1 | sin cambios |

Con el mismo release se cerraron los seis hallazgos del
[Delta 2026-09-29 (d)](#d-consecuencias-y-seguimiento-hallazgos-para-un-patch-de-axis): los ejemplos corregidos («Todavía
no» → «Aún no», «Quién responde» → «Quién cita», la pregunta de «De cada 100» sin «leads»; todos declaran 0.3.0);
`sloganPx` retirado y el ancho del eslogan en el token; los rótulos del gráfico en el contrato; la órbita del paso en el
token; el largo del texto de cierre en el contrato (`closeCopy`; las reglas de una línea de las demás piezas siguen en las
plantillas de Greenhouse), y el Lab: la contraportada recompuesta con el eslogan nuevo (desde el Composer de Greenhouse),
la sección «Decisiones del operador» sin abiertas, el JSON con `closeCopy`, `teamPeople` y la regla del eslogan, y la
iconografía con 88 glifos. ADR de AXIS: delta (d) en `MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`; iconografía:
delta 2026-09-29 en `ICONOGRAPHY_DECISION_V1.md`.

### (c) Adopción en Greenhouse

Commit `2c95e60b2` en `develop`:

1. **Pins:** `axis-tokens` 0.3.29, `axis-ui-contracts` 0.3.29 y `axis-graphic-line` 0.11.0 (con `axis-brand-assets`
   0.4.1). `brand:tokens`, `glitch:tokens` y `manzanitas:tokens` regenerados y `--check` sin drift; gate visual a 0 px en
   manzanitas (18 frames), glitch (32) y graphic-line (73).
2. **Catálogo `manzanitas`:** el ancho del eslogan sale del token (`sloganEmOf`, desde `widthEmByWord`); la medición con
   fontkit queda como prueba de drift (las fuentes del catálogo miden lo mismo que AXIS). La órbita del paso sale del
   token. Los slots de `BackCover` y `StoryClose` usan los límites de `closeCopy.maxChars` (44/10/56) y una prueba lo
   exige. Una prueba de render compara el cuerpo del eslogan que pinta la plantilla con el `slogan.px` del manifiesto del
   contrato (diferencia menor a 0,05 px). Los rótulos del gráfico dejan de ser campos extra del intent.
3. **El equipo en la fotografía** (decisión 6):
   - Roster nuevo, [`EFEONCE_TEAM_ROSTER_V1.md`](../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md) (fila 12 del
     índice del canon). Equipo actual: Julio (identidad aprobada); Andrés, Daniela y Melkin (su foto actual, con hoodie,
     está en `src/lib/artifact-composer/catalogs/deck-axis/assets/squad/`); Humberly y Luis (sólo hay retratos antiguos
     en `public/images/greenhouse/team/`, falta su foto actual), y Valentina Hoyos. María Fernanda no está en el equipo
     actual: su foto de `squad/` no se usa.
   - **El vestuario lo decide la línea de la pieza** (decisión del operador, 2026-09-29, noche: «para todas las líneas de
     negocio sea la bomber y/o softshell de los uniformes corporativos, y para los servicios creativos sea el hoodie,
     esto por la "personalidad" de las líneas de negocio»): hoodie en `brand`; bomber o softshell, con el polo debajo si
     se quiere, en `growth`, `engine`, `voice`, `revenue-hubspot` y `revenue-salesforce`. Todo el equipo, Julio y
     Valentina incluidos; reemplaza la ropa por persona (Julio con polo, Valentina con su ropa). `pnpm foto:prompt` lo
     exige cuando la ficha declara `linea` (`validarVestuarioDeLinea`).
   - Seis personas nuevas en `PERSONAS` de `scripts/foto/build-prompt.mjs` (`andres`, `daniela`, `humberly`, `luis`,
     `melkin`, `valentina`), con su bloque IDENTITY verbatim también en el canon §3.6
     (`EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`) y sus referencias selladas en `scripts/foto/assets.lock.json`
     (157). Identidades aprobadas por el operador el 2026-09-29 sobre la ronda piloto (`ai-generations/2026-09-29_manzanitas-equipo/`).
   - El [registro cine](../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) suma su cuarto caso
     permitido, «Fotos de Marketing con Manzanitas», con el equipo real (y el delta de su §7.2).
   - Ronda piloto: seis tomas de la Escena interior (la ficha aprobada MC2h del canvas v39, con la identidad y el
     vestuario del roster) en `ai-generations/2026-09-29_manzanitas-equipo/`, para que el operador apruebe cada
     identidad.

### (d) Consecuencias

- **Ninguna decisión del registro queda abierta.** Una pregunta nueva se lleva al operador; no se decide en una pieza.
- **Siguen esperando al operador aprobaciones, no decisiones:** la aprobación visual de los carruseles de ejemplo
  (TASK-1939), la consecuencia del eslogan en los cierres (con el logo de 400 px sólo Voice lleva la palabra en el acento)
  Las identidades del equipo quedaron aprobadas el mismo día; una persona nueva en el equipo pasa por su propia ronda.
- **Los Trazo nuevos no cambian la contraportada:** entrar al catálogo no autoriza íconos sociales ni botones simulados
  en ella (una sola conversión, `backCover.simulatedButtons: false`).
- La ruta productiva sigue siendo TASK-1921.

## Delta 2026-09-29 — decisiones del operador y catálogo del Artifact Composer

### (a) Siete pendientes decididas, tres abiertas; publicadas en AXIS `v0.3.28`

El 2026-09-29 el operador decidió siete de las diez [pendientes](#pendientes-del-operador). AXIS las publicó con el tag
`v0.3.28` (commit `2bfe206` en `main`): `axis-tokens` 0.3.28 (`manzanitasRegister.resolvedDecisions`, cada una con
`decidedOn: '2026-09-29'`), `axis-ui-contracts` 0.3.28 (contrato `efeonce.manzanitas-register` **0.2.0**, que acepta
intents 0.1.x) y `axis-graphic-line` 0.10.1. Greenhouse fija esas versiones, con `axis-brand-assets` 0.4.1.

| # | Pendiente | Decisión (2026-09-29) | Dónde vive en el token |
|---|---|---|---|
| 1 | Voz de «Desliza» en la línea Voice | **Trazo.** Es decisión del registro: la voz de ícono de Voice en La órbita sigue sin definir | `swipe.lineOverrides.voice` |
| 2 | ¿Los gráficos cuentan para «nunca más de tres Pizarras seguidas»? | **No.** Los gráficos, la lámina de dato y el texto denso no suman a la racha y tampoco la cortan (la recomendación era «sí») | `recreo.pizarraRun` |
| 3 | Portada Pizarra con la mano en respuesta (dos esferas) | **Excepción registrada**, sólo en esa portada | pieza `cover-pizarra-swipe-response` |
| 4 | Zona segura de la story | **El 87 % de AXIS** (13 % arriba y abajo); la firma de la Escena story sube de y 1620 a y 1619 | `canvases['story-9x16'].safeArea` |
| 8 | ¿Las recetas de gráficos pasan a La órbita? | **No por ahora:** siguen aprobadas sólo para MCM; llevarlas a La órbita es otra decisión | — |
| 9 | El navy `#022a4e` del texto del logo | **Tinta compartida de la familia Manzanitas.** Glitch lo declaró compartido (Greenhouse `c1e0ddfae`); nada más de Glitch se comparte | `glitchLine.scope.sharedWithEditorialFamily` |
| 10 | Acento de un tema de Revenue en Salesforce | Un tema de **Salesforce** lleva `revenue-salesforce`; uno de HubSpot o genérico, `revenue-hubspot` | `topicLine.revenueByPlatform` |

**Siguen abiertas** (`pendingDecisions`): **5**, el copy de cierre de la story (provisional, «Guárdala»); **6**, el
registro cine con personas del equipo en redes (ningún ejemplo usa personas reales); **7**, los Trazo `republicar` y
`enviar` (no entran al catálogo). *(Decididas esa misma tarde y publicadas en `v0.3.29`: ver
[Delta 2026-09-29 (b)](#delta-2026-09-29-b--sin-decisiones-abiertas-axis-v0329-y-el-equipo-real-en-la-fotografía).)*

### (b) Implementación en Greenhouse: el Artifact Composer compone MCM (TASK-1939)

TASK-1939 (`in-progress`, commit `1050036e8` en `develop`) llevó el registro al Artifact Composer. Decisiones de la
implementación:

1. **Un comando local:** `pnpm manzanitas:compose -- --intent <pieza.json> [--out <dir>] [--only carousel,stills]`. El
   intent es el del contrato 0.2.0 más, por lámina, `photo.path` (la foto real) y los rótulos del gráfico. Es el taller:
   no publica ni agenda, y la pieza sale para revisión humana. La ruta productiva es TASK-1921 (la familia `manzanitas`
   se suma ahí después).
2. **Dos catálogos delgados sobre una carpeta** (`src/lib/artifact-composer/catalogs/manzanitas/`):
   `manzanitas-carousel` (`pdf-merged`, el documento del carrusel) y `manzanitas-stills` (`png-set`, las láminas sueltas y
   las piezas únicas). La misma pieza sale en dos destinos y un catálogo declara un solo destino; el motor no cambia. La
   pertenencia de cada plantilla y su aprobación son dato del `registry.json`, y la hacen cumplir tres validadores que
   fallan cerrados: `manzanitas.catalog-membership`, `manzanitas.piece-approval` y `manzanitas.single-line`.
3. **18 plantillas para las 26 piezas aprobadas** de `manzanitasRegister.pieces`: los siete gráficos con voz comparten
   `ChartVoice`; la medida y la tendencia, `ChartQuestion` (sólo la pregunta: la esfera es el dato); las dos portadas
   Pizarra, `CoverPizarra`. Story, blog, YouTube y pódcast sólo están en `manzanitas-stills`. Un test compara el registry
   con el token (cada pieza aprobada la pinta exactamente una plantilla, con la misma aprobación).
4. **El autor nunca elige plantilla, coordenadas ni colores:** el contrato resuelve pieza, superficie, «Desliza», cabecera
   y firma; el mapper `planManzanitasIntent` decide el `contentType`, y el selector del catálogo, la plantilla.
5. **Painter de gráficos inyectado.** El catálogo no importa paquetes (frontera del motor): quien compone le inyecta
   `manzanitasChartSvg` (`@efeoncepro/axis-graphic-line/charts`) y `runManzanitasChartChecks`. Sin painter, o con un
   chequeo en rojo, la lámina falla cerrada: un gráfico nunca se dibuja a mano.
6. **Assets precoloreados por línea.** `pnpm manzanitas:tokens` compila el token a `manzanitas-tokens.css` y a 47 assets:
   el logo con manzana y la manzana grande se pintan por línea (sólo el grupo `[data-axis-accent="topic-line"]`), porque
   un `<img>` no hereda el acento de la página; los wordmarks y los logos de Efeonce son copias byte a byte de
   `@efeoncepro/axis-brand-assets`, y la mano «Desliza» sale por línea con la voz de su línea.
7. **La Lente y la órbita del paso son SVG de `@efeoncepro/axis-graphic-line`:** la foto se incrusta en la Lente de La
   órbita (`lensRecipe('post')`) y la órbita del paso se pinta con `orbitSvg` sobre el círculo medido en el canvas v39
   (cx 640, cy 500, r 324), que el token todavía no publica.
8. **Reglas que fallan cerradas, medidas por el motor.** El texto nunca se recorta ni se parte: si no cabe, el motor
   falla con `SlideGeometryError` («no cabe en su lienzo … Acorta el copy»). La respuesta va en una línea (la esfera
   nunca queda sola en la siguiente); donde el «Desliza» comparte la línea de la respuesta, la respuesta le deja su
   espacio; donde hay contenido fijo bajo la voz, la pregunta va en una línea. Las prueba
   `manzanitas-fit.test.ts` con `measureSlideFit`.
9. **Reproducible:** el PDF lleva fechas internas fijas y se verifica contra los límites de LinkedIn para documentos
   (100 MB, 300 páginas, un solo tamaño de página; si no, `carousel-too-heavy`); la procedencia
   (`manzanitas.piece-provenance.v1`) no lleva reloj: el mismo intent produce el mismo archivo.
10. **Gate visual:** `pnpm composer:visual-gate --catalog=manzanitas`, 18 frames (el probe de cada plantilla, con foto
    sintética) congelados en la sección `2026-09-29 (r)` de `BASELINE_DELTAS.md`. Seis ejemplos versionados en
    `src/lib/manzanitas-composition/examples/` usan fotos sintéticas y nunca se publican.

### (c) El eslogan de los cierres sigue la regla del 2026-09-29

La regla del operador del 2026-09-29 (el eslogan es un elemento gráfico que acompaña la marca, no un texto) se aplica a
los tres cierres (contraportada A, story de cierre y cierre de YouTube): el eslogan va **siempre debajo** del logo de
Efeonce, en bloque, al 64 % de su ancho (`sloganOfLogo`) y separado 1,35 veces su cuerpo (`sloganGapOfFont`); cuerpo =
ancho del logo × 0,64 ÷ el ancho del eslogan en em de su línea. La palabra de la línea va en el acento sólo si el cuerpo
llega a 24 px; si no, en la tinta de la superficie. Lo decide un hook que mide después del layout.

- Con el logo de 400 px de la contraportada A y de la story de cierre, el eslogan mide Growth 22,1 px, Brand 23,5,
  Engine 22,7, **Voice 24,06** y Revenue 20,9: **sólo Voice conserva la palabra en el acento.** Con el logo de 260 px del
  cierre de YouTube, el eslogan queda entre 13,6 y 15,6 px según la línea y la palabra va en blanco. Para la palabra en
  el acento, el logo tendría que medir ≥ ~435 px en Growth y ≥ ~460 px en Revenue.
- Por eso la frase de §4.5 «el logo mide 400 px para que el eslogan llegue a 24 px» **queda superada**: con el eslogan
  al 64 % del ancho del logo, 400 px sólo alcanzan los 24 px en Voice. Es la consecuencia visible de la regla y **se le
  presenta al operador**.
- El cierre de YouTube del canvas v39 tenía el eslogan **encima** del logo, a 64 px; ahora va debajo (la regla del
  2026-09-29 es posterior y dice «siempre debajo»).

### (d) Consecuencias y seguimiento: hallazgos para un patch de AXIS

Publicarlo es una mutación externa y requiere la autorización del operador. Mientras, Greenhouse falla cerrado donde
corresponde. *(Los seis se cerraron con AXIS `v0.3.29`, publicado con esa autorización: ver
[Delta 2026-09-29 (b)](#delta-2026-09-29-b--sin-decisiones-abiertas-axis-v0329-y-el-equipo-real-en-la-fotografía).)*

1. **Ejemplos de AXIS con copy que no cabe en la geometría aprobada:** la portada «Todavía no»
   (`carrusel-revops-salesforce`, `carrusel-voz-revenue-hubspot`), el concepto «Quién responde»
   (`carrusel-texto-denso-growth`) y la pregunta de «De cada 100» «¿Cuántos leads llegan ya informados?»
   (`carrusel-voz-revenue-hubspot`). El contrato los acepta; el render de Greenhouse los rechaza. Los ejemplos de
   Greenhouse usan «Aún no», «Quién cita» y «¿Cuántos llegan ya informados?».
2. `slogan.closeLockup.sloganPx` (24) quedó superado por la regla del eslogan del 2026-09-29: AXIS debe retirarlo.
3. Los rótulos de los gráficos (`caption`, `figureLabel`, `columnLabels`, `keyLabels`, `rateHeader`) no están en el tipo
   ni en el schema del contrato: Greenhouse los lee como campos extra del intent.
4. La órbita del paso (cx 640, cy 500, r 324) no está en el token.
5. El contrato no declara largos máximos por pieza: las reglas de una línea viven en las plantillas de Greenhouse.
6. El Lab de AXIS (`/references/manzanitas/`, contraportada A) todavía pinta el eslogan a 24 px con la palabra de la
   línea en el acento; con la regla del 2026-09-29 va al 64 % del ancho del logo y la palabra en la tinta bajo 24 px.

**Estado:** código completo y verificado en local. Pendiente: la aprobación visual del operador de los carruseles de
ejemplo (el baseline se congeló como guarda de regresión; si pide cambios, van en una sección nueva de
`BASELINE_DELTAS.md`), la ruta productiva (TASK-1921) y las tres decisiones abiertas.

## Delta 2026-09-28 — publicado en AXIS

TASK-1936 llevó el registro a AXIS con autorización explícita del operador («Ejecuta todo tu plan entonces», «Coordinate
con las peer session y avanza con todo» y, al ver qué salía, «Empuja todo junto»). `main` de AXIS quedó en `06cb62d`, con
CI verde; el tag `v0.3.26` (commit `aca07c2`) publicó, con `release-packages.yml` verde:

| Paquete | Versión | Qué trae |
|---|---|---|
| `@efeoncepro/axis-tokens` | `0.3.26` | `manzanitasRegister` (top-level, `status: 'candidate'`, fuera de `axisTokens`) |
| `@efeoncepro/axis-ui-contracts` | `0.3.24` → **`0.3.27`** (tag `v0.3.27`) | `efeonce.manzanitas-register` 0.1.0 → **0.1.1** (`candidate`; 0.1.1 exige que el carrusel empiece con su portada y termine con su contraportada, y acepta intents 0.1.0): `validateManzanitasRegisterIntent`, `resolveManzanitasRegisterIntent`, `resolveManzanitasChart`; 45 códigos es-CL; falla cerrado y devuelve `pending-decision` cuando la regla depende de una pendiente |
| `@efeoncepro/axis-brand-assets` | `0.4.1` | `AXIS_MANZANITAS_ASSETS`: `manzanitas-logo-{positive,negative}`, `manzanitas-wordmark-{positive,negative}`, `manzanitas-apple`; la manzana y los puntos en `[data-axis-accent="topic-line"]` |
| `@efeoncepro/axis-graphic-line` | `0.10.0` | `/charts` (no se exporta desde la raíz): `manzanitasChartSvg`, una función por receta, `runManzanitasChartChecks` |

En el mismo push salió el release de Glitch que otra sesión había dejado en local (`v0.3.25`: `axis-tokens` 0.3.25 y
`axis-ui-contracts` 0.3.23). Página y JSON: [axis.efeonce.org/references/manzanitas/](https://axis.efeonce.org/references/manzanitas/)
(`axis.manzanitas-register.v1`). Guía para agentes, schema y 16 ejemplos (9 válidos, 7 inválidos) en AXIS:
`docs/agent-composition/manzanitas.md`, `docs/agent-composition/manzanitas-register-intent.schema.json`,
`docs/examples/manzanitas/`. ADR de AXIS: `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`.

Decisiones de la ejecución (en el ADR de AXIS): claves de datos en inglés (`rows`, `parts`, `tasks`, `stages`); la
paridad con el canvas es **geométrica** (largos, posiciones, esfera y destacado), no de píxeles, porque el canvas maqueta
el texto en HTML y el paquete pinta SVG; en el Embudo, con empate, se destaca el primer paso; el Ranking dice «1 vez»
cuando tu marca lidera; los nombres del plan `channels` y `close` salieron como `canvases` y `slogan`/`backCover`.

**Sigue abierto:** ninguna de las pendientes se decidió; las diez están en `manzanitasRegister.pendingDecisions`
(incluida `masthead-ink-navy`, el navy `#022a4e` del logo). Greenhouse todavía **no** fija estas versiones ni tiene un
catálogo `manzanitas` en el Artifact Composer: son follow-ups de TASK-1936 (siete pendientes se decidieron y el catálogo
existe desde el 2026-09-29: ver [Delta 2026-09-29](#delta-2026-09-29--decisiones-del-operador-y-catálogo-del-artifact-composer)).

## Contexto

Marketing con Manzanitas (MCM, «marketing explicado simple») es la marca editorial evergreen del blog de Efeonce. Sale
en carruseles de LinkedIn, stories, banners del blog, miniaturas de YouTube y portadas de pódcast, con un logo propio: la
manzana en contorno con tres puntos arriba y el texto «Marketing con Manzanitas».

La órbita es la línea gráfica de Efeonce y ya fija la voz, la esfera, la medida, la lente, los acentos por línea, la
firma, el eslogan, la iconografía y la tipografía. Lo que no fija son las decisiones propias de una marca editorial
recurrente: de qué color va su manzana, dónde va su cabecera, cómo se alternan foto y lámina diseñada en un carrusel,
dónde va el «Desliza», cómo cierra una contraportada que pide conversación y con qué gráficos se explica un dato. La
exploración se hizo en el canvas «Marketing con Manzanitas · Línea v1».

El 2026-09-28, sobre la versión 39 del canvas, el operador aprobó:

> «Me encantan, queda aprobada toda la línea gráfica»

La aprobación cubre los formatos Pizarra, Escena, Lente y Recreo, la cabecera y la firma, la contraportada A, los
acentos por línea, los 9 gráficos y las 3 láminas de texto denso. Acto seguido precisó su naturaleza (verbatim):

> «esta línea gráfica no reemplaza The Orbit que es la /efeonce-graphic-line sino que la complementa con un nuevo
> registro para marketing con Manzanitas»

Esa segunda frase es la que canoniza: lo aprobado no es una línea gráfica nueva, sino un **registro** de La órbita.

## Decisión

### 1. Registro complementario, no línea nueva

1. **MCM es un registro complementario de La órbita**, no una línea nueva ni un reemplazo.
2. La órbita («The Orbit», skill `efeonce-graphic-line`) **sigue siendo la línea gráfica de Efeonce y manda en todo lo
   que el registro no dice**.
3. El registro **suma** reglas, estilos y piezas propias **sólo para piezas de MCM**. No cambia ninguna regla de La
   órbita ni se aplica a otra pieza de Efeonce.

### 2. Nombre canónico

- El nombre canónico es **«registro Marketing con Manzanitas»**; abreviado, «registro MCM» o «registro Manzanitas».
- **«Registro» aquí no es un registro fotográfico.** La órbita y el lenguaje fotográfico de Efeonce ya llaman «registro»
  a los modos de la foto (documental, puesta en escena, respuesta, cine). El registro Manzanitas es un registro de marca
  editorial; dentro de él, las fotos siguen usando los registros fotográficos de Efeonce (en MCM, **cine**). Cuando los
  dos términos aparezcan juntos, hay que aclararlo.

### 3. Qué hereda de La órbita (sin cambios)

- **La voz** pregunta + respuesta (`EfeonceOrbit.Voice`): anillo abierto antes de la pregunta, respuesta en Bricolage
  760 con la esfera que cierra; la respuesta ≤ 3 palabras y ≥ 3 veces la pregunta (`answer-dominates-3x`).
- **Una esfera por pieza** (`one-sphere-per-piece`) y **una órbita por pieza** (`one-orbit-per-piece`); ningún texto
  cruza la órbita.
- **La medida en la órbita**: esfera en valor × 360° desde las 12, en sentido horario, con estela corta de 50°
  (`efeonceGraphicLine.trajectory.measure`). **La Lente** (`EfeonceOrbit.Lens`).
- **Acentos por línea de servicio** desde `efeonceGraphicLine.lines` (Growth, Brand, Engine, Voice, Revenue):
  `accentOnLight` sobre papel y `accentOnDark` sobre navy. El valor vive en el token y nunca se transcribe al construir;
  referencia medida:

  | Línea | `accentOnLight` | `accentOnDark` |
  |---|---|---|
  | Growth | `#0e8c82` | `#36c8bf` |
  | Brand | `#bb1954` | `#ff6500` |
  | Engine | `#0375db` | `#0375db` |
  | Voice | `#f83902` | `#f83902` |
  | Revenue (HubSpot) | `#8e1b82` | `#e86bd0` |

- **La regla del acento:** ≥ 3:1 contra su fondo en gráfico y en texto ≥ 24 px; **nunca en texto de menos de 24 px**
  (`accent-text-min-size`). El acento es luz, gráfico y palabra, **nunca superficie**.
- **El eslogan** («Empower your Growth | Brand | Engine | Voice | Revenue») **sólo cierra**, en bloque con el logo de
  Efeonce: logo arriba, eslogan debajo al 64 % del ancho del logo (`efeonceGraphicLine.motion.layout.sloganOfLogo`),
  separado 1,35 veces su fuente (`sloganGapOfFont`).
- **La firma:** logo de Efeonce centrado abajo; la burbuja URL sólo reemplaza al logo si el logo ya está en la imagen.
- **Íconos** sólo del catálogo de AXIS (`resolveIcon`), en reposo, con la voz de la línea
  (`efeonceGraphicLine.icons.voiceByLine`: Brand = Plastilina; Growth, Engine y Revenue = Trazo; Voice = sin definir).
- **Superficies:** navy `efeonceGraphicLine.color.dark` (`#001a33`) y papel `color.paper` (`#f7f8f6`); texto navy
  `#023c70`.
- **Tipografía:** Bricolage Grotesque (respuesta y cifras, peso 760, tracking −0,035em) y Poppins (pregunta 300; texto
  400/500).
- **Lenguaje fotográfico** de Efeonce, en registro cine.

### 4. Qué es propio del registro

Las medidas de esta sección son la referencia del canvas v39. El detalle vive en la
[norma operativa](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md); cuando AXIS las publique,
mandan los tokens (ver [Consecuencias](#consecuencias)).

#### 4.1 Acentos por la línea del tema

Decisión del operador (2026-09-28, verbatim): «el marketing con manzanitas ajusta sus acentos como el color de la manzana
de los puntos de la orbita etc como dice la línea gráfica que es por linea de negocios».

- La manzana y sus tres puntos (en la cabecera, la portada y el cierre), el arco, la esfera, la barra o la cifra
  destacada van en el acento de la **línea del tema**.
- **La línea la decide el TEMA, no la pieza**: AEO / visibilidad en IA = Engine; creatividad = Brand.
- El texto del logo queda en navy (`#022a4e`, el del asset) sobre papel y en blanco sobre navy. Desde el 2026-09-29 ese
  navy es la tinta compartida de la familia Manzanitas (pendiente 9, decidida).
- Una lámina tiene **un solo selector, «Línea del tema»**: al cambiarlo cambia todo a la vez (manzana, puntos, gráfico,
  palabra del eslogan y la voz del ícono «Desliza»).
- Nunca la manzana en un color fijo ni en el acento de otra línea.

#### 4.2 Cabecera

- El logo de MCM (manzana en contorno con tres puntos arriba + «Marketing con Manzanitas») va **siempre arriba a la
  izquierda**, en todos los formatos. En el carrusel 1080 × 1350: x 80, y 72, 200 × 90 px; otras piezas usan 160 × 72,
  180 × 81 o 240 × 108 según formato.
- **Sin manzana** (sólo el texto «Marketing con Manzanitas») en la portada Pizarra y en la contraportada, porque ahí la
  manzana grande está en la lámina.
- En la portada con foto, la pregunta va en una línea para que la voz termine sobre la cabeza.
- El SVG oficial del logo tiene 25 trazos; los cuatro últimos son la manzana y los tres puntos, y esos toman el acento.
  Los SVG oficiales están en OneDrive `Alineación/5. Contenidos/13- Branding/SVG` y usan `<style>`: hay que inlinear los
  fills antes de subirlos.
- La manzana va siempre con su silueta completa legible (dos lóbulos, hendidura, hoja y tallo); puede sangrar un borde.
- Los tres puntos son ADN de familia (las ventanas de la nave), **no esferas**.

#### 4.3 Formatos de lámina y Recreo

- **Pizarra** («Diseñado»): papel o navy, la manzana, la voz y los pasos. Sirve para la portada, los pasos, el dato y el
  cierre. **El dato con fuente y el cierre van siempre en Pizarra.** Es la única que lleva la manzana grande.
- **Escena** («Foto completa»): una fotografía a sangre, con la voz en su reserva y la firma sobre el lecho, en registro
  cine. Sin manzana grande ni órbita dibujada: **la luz de la foto es la órbita de la pieza**. La foto dice lo que dice
  el texto y el lecho sale de ella: es lo que de verdad hay entre la cámara y el sujeto (la mesa donde Nexa revisa, la
  mesa del cliente, la silla del visitante), nativo, nunca agregado; la firma va dentro de su materia, con aire sobre su
  borde. El isotipo del traje de Nexa se compone y el modelo sólo lo termina sobre su silueta. Desde el 2026-09-29
  (pendiente 6, decidida) puede mostrar a personas reales del equipo actual, sólo desde el
  [roster del equipo](../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md) (`teamPeople`).
- **Lente** («Foto señalada»): la foto apagada afuera y a color dentro del círculo, para señalar a una persona o un
  objeto (`EfeonceOrbit.Lens`). Sólo en láminas interiores (la portada con foto es Escena). No se combina con otra órbita
  ni con el foco. La foto se toma para la lente: la cara y el objeto caben en el círculo fijo del formato y nadie mira al
  lente.
- **Recreo** (la mezcla): con portada Pizarra, cerca de un tercio de las láminas lleva foto (≈ 2 de 7); con portada
  Escena, la foto ya es la promesa y el carrusel llega a casi la mitad (≈ 3 de 7). Reglas: nunca dos láminas con foto
  seguidas; nunca más de tres Pizarras seguidas (los gráficos, la lámina de dato y el texto denso no suman a la racha ni
  la cortan: pendiente 2, decidida el 2026-09-29); el dato con fuente y el cierre, siempre en Pizarra; todas las fotos de
  un carrusel comparten registro y luz; la lámina que sigue a una foto retoma la voz (la foto nunca carga sola el
  argumento).
- **Story y blog:** una sola pieza, Escena o Pizarra, nunca las dos. Story con foto: la voz en la banda alta y la firma
  centrada sobre la mesa, dentro de la zona segura; la story de cierre lleva su voz, con el texto de cierre de la
  pieza (pendiente 5, decidida: cambia con el contexto, con la extensión de `closeCopy`). Blog y banner: la foto se genera en 16:9 y se lleva a 1,9:1
  (1200 × 630); la voz va en el lado oscuro y la firma puede ir abajo a la izquierda, cerrando la columna del texto.
- **YouTube:** la miniatura es una Escena 16:9 con el logo abajo a la izquierda.
- **Pódcast (1:1):** la cabecera del programa en grande (420 px), porque la portada se ve a 160 px.

#### 4.4 La mano «Desliza»

- Mismo lugar en todas las láminas que la llevan (Pizarra, Escena, Lente): pegada al margen derecho (80 px); en
  1080 × 1350, a **1033 px** del borde superior en la portada y a **985 px** en los interiores (x 936, 64 × 64 px).
- Nunca junto a la voz cuando la voz va arriba, nunca en la fila de la firma, nunca sobre el sujeto (la foto se toma con
  ese rincón en calma; si el sujeto lo ocupa, se rehace la toma).
- Va en reposo. No va en la última lámina ni en la story.
- Voz del ícono por línea: Brand = Plastilina `mano` (D29); Growth, Engine y Revenue = Trazo `swipe` (D28); Voice =
  Trazo (pendiente 1, decidida el 2026-09-29; `swipe.lineOverrides.voice`).

#### 4.5 Firma y eslogan

- **Una sola altura de firma** en todo el carrusel: el logo de Efeonce arriba en **y 1202** (de 1350; 216 × 51 px, a
  97 px del borde inferior), en Pizarra, Escena y Lente. En la Escena queda dentro de la mesa.
- El eslogan sólo cierra: el cierre del carrusel, la story de cierre y el cierre del video; su palabra es la línea del
  tema. **Nunca** en la portada, el blog, la miniatura ni el pódcast.
- En el cierre, el logo mide 400 px para que el eslogan llegue a 24 px (el mínimo para que la palabra vaya en su
  acento); el bloque termina en la línea de firma (y 1253). **Superado el 2026-09-29** por la regla del eslogan (al 64 %
  del ancho del logo, siempre debajo): con 400 px sólo Voice llega a 24 px y las demás líneas llevan la palabra en la
  tinta (ver [Delta 2026-09-29](#delta-2026-09-29--decisiones-del-operador-y-catálogo-del-artifact-composer) (c)).
- La burbuja URL sobre la mesa de la estratega **no pasa** (1 % peor 3,80:1): esa lámina sigue con el logo.

#### 4.6 Contraportada A («A a escala», aprobada el 2026-09-28)

- Es una pieza social, no una hoja: pide **una sola conversión**, el comentario ligado a una acción que el lector hace
  hoy. La voz: pregunta + respuesta accionable + bajada en una línea «En los comentarios: …». Engine: «¿Te nombra la
  IA? Pregúntale.» + «En los comentarios: cuéntanos si te nombró.». Brand (Creative Workflows): bajada «En los
  comentarios: el primer ingrediente de tu receta.».
- La manzana de la portada vuelve **3,8 veces más grande**, recortada por arriba y por la derecha: su cuerpo con los tres
  puntos queda como una burbuja escribiendo, en el acento de la línea, sin astilla del tallo en el borde. 100 px de aire
  bajo la manzana y 120 px sobre el logo. La cabecera va sin manzana.
- **Nada simula un botón** (post orgánico): guardar, compartir y enviar se piden en el copy del post cuando hacen falta,
  nunca los cuatro a la vez. No van íconos sociales: una conversión por carrusel, los botones ya existen en la interfaz
  de LinkedIn y un comentario con sustancia pesa más.
- Se mide en Metricool: comentarios con sustancia, guardados, envíos y clics al grader por UTM cuando aplique.
- **El texto del cierre cambia con el contexto y nunca queda fijo** (pendiente 5, decidida el 2026-09-29): lo que se
  normaliza es su extensión (`closeCopy.maxChars`: pregunta 44, respuesta 10 y bajada 56 caracteres), igual en la story
  de cierre.

#### 4.7 Gráficos y texto denso

Nueve láminas interiores con gráficos y tres láminas de texto denso, aprobadas el 2026-09-28. Su gramática es parte de
esta decisión: ver [Gramática de los gráficos](#gramática-de-los-gráficos).

### 5. Qué nunca

- La manzana en un color fijo o en el acento de otra línea; la línea la decide el tema.
- La manzana recortada a sólo hoja + tallo, o sin su silueta completa legible.
- El acento como superficie (a sangre) o en texto de menos de 24 px.
- El hex de un acento o de una superficie transcrito al construir: sale del token.
- El eslogan en la portada, el blog, la miniatura o el pódcast.
- Dos láminas con foto seguidas o más de tres Pizarras seguidas; el dato con fuente o el cierre fuera de Pizarra.
- La Lente en la portada, o combinada con otra órbita o con el foco.
- Un lecho agregado en la Escena: el lecho es nativo de la foto.
- «Desliza» en la última lámina o en la story, junto a la voz cuando va arriba, en la fila de la firma o sobre el sujeto.
- Algo que simule un botón, o íconos sociales, en la contraportada.
- En un gráfico: una dona de partes, un círculo suelto, una barra dibujada a mano, más de un acento o una cifra sin
  fuente.
- Cualquier elemento de Glitch en una pieza de MCM, o del registro en una pieza de Glitch (ver punto 6).

### 6. Relación con Glitch

- Glitch (el magazine semanal) tiene su **propia sub-línea**: norma [`GLITCH_GRAPHIC_LINE_V1.md`](../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md),
  referencia de la skill `glitch.md`, token `glitchLine` y contrato `efeonce.glitch-line`.
- El registro Manzanitas y la sub-línea de Glitch son **hermanos: los dos complementan La órbita y no se mezclan**.
  - **Glitch** usa la manzana **llena** como esfera, el verde `#6ec207`, la falla en bytes, Guttery y la cabecera
    «EDICIÓN #N».
  - **MCM** usa la manzana **en contorno con tres puntos** (una burbuja escribiendo) y el acento de la línea del tema.
- Ninguno usa elementos del otro.

### 7. Piezas aprobadas (2026-09-28)

Aprobadas por el operador sobre el canvas v39: los formatos **Pizarra, Escena, Lente y Recreo**; la **cabecera y la
firma**; la **contraportada A**; los **acentos por línea**; los **9 gráficos**; y las **3 láminas de texto denso**.

No es canon la contraportada B (queda como prueba). La portada Pizarra con la mano en respuesta, que estaba en estudio,
es desde el 2026-09-29 una **excepción registrada** (pieza `cover-pizarra-swipe-response`, pendiente 3). El registro cine
con personas del equipo en MCM (pendiente 6) y los Trazo `republicar` y `enviar` (pendiente 7), que no eran canon,
quedaron decididos esa tarde (ver [Delta 2026-09-29 (b)](#delta-2026-09-29-b--sin-decisiones-abiertas-axis-v0329-y-el-equipo-real-en-la-fotografía)).

## Alcance

- **Aplica** a toda pieza de MCM: carrusel de LinkedIn (1080 × 1350), story, banner del blog, miniatura de YouTube,
  portada de pódcast y el cierre del video.
- **No aplica** a ninguna otra pieza de Efeonce (siguen sólo La órbita) ni a Glitch (sigue su sub-línea).
- Las recetas de gráficos quedan **aprobadas sólo para MCM**. El 2026-09-29 el operador decidió que siguen así por
  ahora (pendiente 8); llevarlas a La órbita para piezas de Efeonce es otra decisión.

## Gramática de los gráficos

Reglas comunes de las 9 láminas con gráficos, a nivel de decisión (el detalle de medidas vive en la norma):

1. **La dona de la línea es la medida de la órbita.** No hay dona de partes: tres segmentos en un anillo serían un
   arco que se llena, y la órbita recorre, nunca se llena. Las partes (hasta 3) van en una barra al 100 %.
2. **Una esfera por pieza.** En la medida y en la tendencia la esfera ES el dato, así que esas dos no llevan la voz con
   su esfera: llevan la pregunta arriba (Poppins 300). Las otras siete cierran con la voz (`EfeonceOrbit.Voice`).
3. **Ningún círculo suelto** en un gráfico: el conteo va en cuadrados y el Venn en discos translúcidos sin anillo, para
   que nada se lea como esfera ni como órbita.
4. **Un acento, sólo donde está la idea.** El resto va en navy `#023c70` y gris `#c9d2dc` (el `before` de la receta de
   deck `decision-chart`); sobre navy, lo que no destaca va en `rgba(207, 228, 250, 0.22)` y el texto suave en
   `#cfe4fa`. El texto en acento, sólo desde 24 px.
5. **Las barras salen de su número** (`bars-from-values`) y parten de cero; ninguna se dibuja a mano.
6. **Cifras con fuente** (`figures-with-source`): sin fuente, la cifra no sale.
7. **Datos de muestra marcados** (`illustrative-data-marked`): la línea al pie dice «Ejemplo ilustrativo · Fuente:
   [FUENTE, AÑO]» hasta tener la real.
8. **Se calculan desde su dato.** La lógica de la lámina recibe `datos` (arreglo u objeto) o `valor` (entero 0–100) y
   calcula largos, posiciones, la esfera, el destacado y la respuesta cuando es un número. La plantilla sólo pinta. Las
   respuestas en palabras son texto y se editan en la lámina; las numéricas salen del dato.
9. **Todas son Pizarra** (papel o navy), 1080 × 1350, con cabecera, «Desliza» en 985 y firma en 1202. Rótulos de
   24–26 px y cifras en Bricolage 760.

Los nueve gráficos aprobados:

| # | Gráfico | Pregunta que responde | Dato | Respuesta | Superficie |
|---|---|---|---|---|---|
| 1 | Medida en la órbita | ¿Qué parte del total? | `valor` 0–100 | la cifra (sin voz) | navy |
| 2 | Ranking | ¿Quién va primero y cuánto nos separa? | `datos` [{label, v, rol}] | «N veces» = líder ÷ tu marca | papel |
| 3 | Antes y después | ¿Cuánto cambió? | `datos` {antes, despues} (índice, antes = 100) | en palabras | papel |
| 4 | Tendencia | ¿Hacia dónde va? | `datos` 12 valores mensuales | el último valor (sin voz) | navy |
| 5 | Partes de un todo | ¿De qué está hecho? | `datos` hasta 3 partes | «1 de N» | papel |
| 6 | De cada 100 | ¿Cuántos de cada 100? | `valor` 0–100 | «N de 100» | navy |
| 7 | Venn de tres | ¿Dónde se cruzan tres cosas? | concepto, sin dato ni fuente | en palabras | papel |
| 8 | Matriz 2 × 2 | ¿Qué hago primero? | `datos` [{label, esfuerzo, impacto, foco?}] | en palabras | navy |
| 9 | Embudo | ¿Dónde se pierde? | `datos` [{label, v}] en orden | en palabras | papel |

La geometría de la medida (1) sale de `measureSvg` de AXIS y se verificó contra él en 5 valores (0,05 / 0,38 / 0,62 /
0,9 / 1).

Las tres láminas de texto denso (para explicar un concepto complejo: la voz arriba y el texto debajo): **Concepto y tres
puntos** (papel), **Comparación en dos columnas** (navy) y **Paso a paso** (papel), con la cifra o el encabezado
destacado en el acento.

## Consecuencias

- Toda pieza de MCM sigue La órbita más el registro. Toda pieza de Efeonce que no es de MCM ignora lo propio del
  registro. Glitch sigue su sub-línea y no toma nada del registro.
- **La norma operativa** [`MANZANITAS_REGISTER_V1.md`](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md)
  guarda el detalle y las medidas para personas. **La referencia para agentes**
  `.claude/skills/efeonce-graphic-line/references/manzanitas.md` es la que carga un agente al componer una pieza de
  MCM, junto con la skill `efeonce-graphic-line`.
- **Hasta que AXIS publicó** (2026-09-28), las medidas vivían como referencia en el canvas v39 y en la norma, sin
  validador ni resolver.
- **Desde que AXIS publicó** (`v0.3.26`), rige la regla de La órbita: los valores son tokens, no copias. Como en Glitch, los números de
  la norma pasan a ser una referencia humana espejada del token y, si difieren, gana el token.
- Las recetas de gráficos no se usan en piezas de Efeonce fuera de MCM (pendiente 8, decidida el 2026-09-29).
- La Escena con personas del equipo en MCM está permitida desde el 2026-09-29 (pendiente 6), sólo con el equipo actual
  del [roster](../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md); las seis identidades están aprobadas (2026-09-29). La estratega de la Escena interior es una persona por rol, generada.
- Después de AXIS, en Greenhouse y en tareas aparte: subir los pins de AXIS, crear el catálogo `manzanitas` del Artifact
  Composer para componer carruseles desde datos y hacer que la skill consuma el paquete. Los pins y el catálogo los hizo
  TASK-1939 el 2026-09-29 (ver [Delta 2026-09-29](#delta-2026-09-29--decisiones-del-operador-y-catálogo-del-artifact-composer)); la ruta productiva es TASK-1921.

### Fuente de verdad vigente

| Qué | Desde el 2026-09-28 (publicado en AXIS) | Antes |
|---|---|---|
| Decisión y alcance | este ADR | este ADR |
| Detalle y medidas | token `manzanitasRegister` (`axis-tokens` 0.3.26; 0.3.28 desde el 2026-09-29, con `resolvedDecisions`; **0.3.29** desde esa tarde, con `pendingDecisions` vacío, `closeCopy` y `teamPeople`); la [norma](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) lo espeja y, si difieren, gana el token | canvas v39 + norma |
| Reglas verificables | contrato `efeonce.manzanitas-register` 0.1.1 (`axis-ui-contracts` 0.3.27); 0.2.0 (`axis-ui-contracts` 0.3.28) y **0.3.0** (`axis-ui-contracts` 0.3.29) desde el 2026-09-29; `pnpm manzanitas:resolve` en AXIS | criterio humano; skill `efeonce-graphic-line` |
| Gráficos | `@efeoncepro/axis-graphic-line/charts` (0.10.0; 0.10.1 y **0.11.0** desde el 2026-09-29): `manzanitasChartSvg` + `runManzanitasChartChecks` | dibujados en el canvas |
| Personas del equipo en las fotos | [roster del equipo](../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md) + `PERSONAS` de `scripts/foto/build-prompt.mjs` (desde el 2026-09-29); el token (`teamPeople`) sólo lo permite y no nombra a nadie | no permitido |
| Componentes heredados | DS «Efeonce — La órbita» (`EfeonceOrbit.Voice`, `Measure`, `Lens`, `Slogan`), por referencia desde el token | los mismos |
| Logo y manzana | `AXIS_MANZANITAS_ASSETS` en `@efeoncepro/axis-brand-assets` 0.4.1 (trazos idénticos a los SVG oficiales) | SVG oficiales en OneDrive (`13- Branding/SVG`) |
| Composición en Greenhouse | desde el 2026-09-29: catálogos `manzanitas-carousel` y `manzanitas-stills` del Artifact Composer, `pnpm manzanitas:compose` (TASK-1939); la ruta productiva, TASK-1921 | el canvas v39 |

## Plan en AXIS (ejecutado el 2026-09-28)

> **Ejecutado y publicado** (ver [Delta 2026-09-28](#delta-2026-09-28--publicado-en-axis)); lo que sigue es el plan tal como se
> aprobó, útil como registro. Se ejecutó por [TASK-1936](../tasks/complete/TASK-1936-manzanitas-register-axis-token-contract-charts-lab.md), que fija el orden: ADR, token, assets, **contrato antes que gráficos** (`axis-graphic-line` depende de `axis-ui-contracts`), Lab y release. Plan visual y maqueta del Lab: https://claude.ai/artifact/WdEJAsC6HGkKdvyNvkDbvk.

> Era la propuesta para llevar el registro a código, siguiendo el precedente de
> Glitch: ADR de Greenhouse [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](./GLITCH_GRAPHIC_LINE_DECISION_V1.md) + norma
> `glitch/GLITCH_GRAPHIC_LINE_V1.md` → ADR de AXIS `docs/architecture/GLITCH_LINE_TOKEN_CONTRACT_DECISION_V1.md`, token
> top-level `glitchLine`, contrato `efeonce.glitch-line` con validador y resolver que falla cerrado,
> `pnpm glitch:resolve`, ejemplos `docs/examples/glitch/*.json`, assets en `assets/glitch/` sellados fuera de
> `AXIS_BRAND_ASSETS`, Lab `/references/glitch/` + `glitch.json` → Greenhouse TASK-1922/1923/1924.

1. **ADR de AXIS** `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`.
2. **Token top-level `manzanitasRegister`** en `@efeoncepro/axis-tokens`, no rama de `efeonceGraphicLine`. Hereda por
   **referencia** (test de identidad) las líneas, las superficies, la voz, la trayectoria y el eslogan. Test de
   aislamiento contra `glitchLine` y contra `efeonceGraphicLine`: nada de La órbita referencia al registro. Contenido:
   cabecera (tamaños, trazos de acento), formatos, piezas aprobadas, «Desliza», firma, contraportada, Recreo, gráficos y
   texto denso, pendientes.
3. **Assets** en `@efeoncepro/axis-brand-assets`: `assets/manzanitas/` (logo con el grupo manzana + puntos como atributo
   de color, texto solo, manzana en contorno), sellados como `MANZANITAS_ASSET_SEALS` y declarados en
   `AXIS_MANZANITAS_ASSETS`, fuera de `AXIS_BRAND_ASSETS`. Colores como atributos, nunca `<style>`.
4. **Módulo `charts`** en `@efeoncepro/axis-graphic-line` con las 9 recetas (dato → SVG + manifiesto; la medida
   reutiliza `measureSvg`) y sus chequeos: barras desde el valor, un acento, una esfera, fuente, marca de ejemplo,
   ≤ 3 partes, sin dona de partes, texto en acento ≥ 24 px. Genérico por línea; aprobado sólo para MCM (pendiente 8).
5. **Contrato `efeonce.manzanitas-register` 0.1.0 (`candidate`)** en `@efeoncepro/axis-ui-contracts`: intent (pieza,
   formato, línea del tema, superficie, datos), validador que acumula issues con mensaje es-CL y resolver que falla
   cerrado; `pnpm manzanitas:resolve`; ejemplos válidos e inválidos en `docs/examples/manzanitas/`.
6. **Lab `/references/manzanitas/`** + `/references/manzanitas.json` (datos del token y del contrato). Secciones:
   alcance «complementa, no reemplaza», acentos por línea con selector, cabecera y firma, formatos y Recreo, «Desliza»,
   contraportada, gráficos en vivo desde datos, texto denso, nunca, para agentes y pendiente. Con tests unitarios y e2e
   y entrada en la navegación.
7. **Release:** versiones nuevas de tokens, contracts, graphic-line y brand-assets con tag; `pnpm design:check`.
8. **Después, en Greenhouse** (tareas aparte): subir los pins de AXIS, catálogo `manzanitas` del Artifact Composer para
   componer carruseles desde datos y que la skill consuma el paquete.

**Coordinación:** el checkout de AXIS es compartido. Hoy lo usa la sesión de Insights (rama `docs/insights-lab`) y hay
una rama local `docs/glitch-flash-composer` con 2 commits de otra sesión. El trabajo de MCM va en rama propia desde
`main` cuando el checkout se libere, y los releases se secuencian para no chocar versiones. **Empujar a `main` de AXIS y
crear tags es una mutación externa: requiere autorización explícita del operador.**

## Pendientes del operador

No se deciden por cuenta propia. **Estado al 2026-09-29: las diez están decididas.** El operador decidió 1–4 y 8–10
(publicadas en AXIS `v0.3.28`; detalle en el
[Delta 2026-09-29](#delta-2026-09-29--decisiones-del-operador-y-catálogo-del-artifact-composer)) y, esa misma tarde, 5, 6 y
7 (publicadas en AXIS `v0.3.29`; detalle en el
[Delta 2026-09-29 (b)](#delta-2026-09-29-b--sin-decisiones-abiertas-axis-v0329-y-el-equipo-real-en-la-fotografía)).
`manzanitasRegister.pendingDecisions` queda vacío. La numeración se conserva porque otros documentos la citan.

1. ~~La voz del ícono «Desliza» en la línea Voice~~ — **decidida (2026-09-29):** Trazo (`swipe.lineOverrides.voice`).
2. ~~Si los gráficos cuentan para «nunca más de tres Pizarras seguidas»~~ — **decidida (2026-09-29):** no; los gráficos,
   la lámina de dato y el texto denso no suman a la racha ni la cortan (`recreo.pizarraRun`).
3. ~~La portada Pizarra con la mano en respuesta (dos esferas)~~ — **decidida (2026-09-29):** excepción registrada
   (`cover-pizarra-swipe-response`).
4. ~~La zona segura de la story~~ — **decidida (2026-09-29):** manda el 87 % de AXIS (13 % arriba y abajo); la firma de la
   Escena story sube a y 1619.
5. ~~El copy de cierre de la story~~ — **decidida (2026-09-29):** cambia con el contexto y nunca queda fijo; se normaliza
   su extensión (`closeCopy.maxChars`: 44/10/56, contraportada A y story de cierre); el «Guárdala» provisional se retira.
6. ~~El registro cine con personas del equipo en redes~~ — **decidida (2026-09-29):** permitido en las fotos de MCM, sólo
   con el equipo actual y desde el [roster](../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md) (`teamPeople`).
7. ~~Los Trazo candidatos `republicar` y `enviar`~~ — **decidida (2026-09-29):** entran al catálogo (`axis-graphic-line`
   0.11.0; 39 Trazo + 49 Plastilina = 88).
8. ~~Si las recetas de gráficos pasan a La órbita~~ — **decidida (2026-09-29):** siguen aprobadas sólo para MCM; llevarlas
   a La órbita es otra decisión.
9. ~~El navy `#022a4e` del texto del logo de MCM~~ — **decidida (2026-09-29):** es la tinta compartida de la familia
   Manzanitas; Glitch dejó de declararlo exclusivo (`glitchLine.scope.sharedWithEditorialFamily`, Greenhouse `c1e0ddfae`).
10. ~~El acento de un tema de Revenue en Salesforce~~ — **decidida (2026-09-29):** un tema de Salesforce lleva
    `revenue-salesforce`; uno de HubSpot o genérico, `revenue-hubspot` (`topicLine.revenueByPlatform`).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Tratar MCM como una línea gráfica nueva | Contradice la canonización del operador: la línea de MCM «no reemplaza The Orbit … sino que la complementa». La órbita sigue siendo la línea de Efeonce y manda en lo que el registro no dice |
| Aplicar lo propio de MCM a otras piezas de Efeonce | El registro es sólo para piezas de MCM; extenderlo convertiría un registro en un reemplazo de La órbita |
| Modelar el registro en AXIS como rama de `efeonceGraphicLine` | Todo consumidor de La órbita recibiría reglas que sólo valen para MCM. Igual que `glitchLine`, se propone un token top-level (`manzanitasRegister`) que hereda de La órbita por referencia, con test de identidad, y tests de aislamiento: nada de La órbita referencia al registro y el registro no toca `glitchLine` |
| Mezclar MCM con la sub-línea de Glitch (las dos usan una manzana) | Son hermanos que no se mezclan: la manzana llena como esfera, el verde `#6ec207`, la falla en bytes, Guttery y «EDICIÓN #N» son de Glitch; MCM usa la manzana en contorno con tres puntos y el acento de la línea del tema |
| Contraportada C (acento a sangre) | Rechazada por el operador: «Logo azul Efeonce acá??? … muchísima saturación». El acento nunca es superficie y el logo positivo trae el isotipo azul |
| Contraportada B (órbita, más sutil) | No se eligió; queda como prueba, no es canon |
| Recortar la manzana a sólo hoja + tallo | Se leyó como «orejas de conejo»; la manzana va siempre con su silueta completa legible |
| Íconos sociales o botones simulados en la contraportada | Una conversión por carrusel; los botones ya existen en la interfaz de LinkedIn; un comentario con sustancia pesa más |
| Lechos agregados en la Escena (mesa «matte black» en estudio vacío, cabezas del público, dorso de un portátil, «consola», piso que corta las piernas) | Rechazados: el lecho es lo que de verdad hay entre la cámara y el sujeto, nativo de la foto |
| Burbuja URL sobre la mesa de la estratega | No pasa el contraste (1 % peor 3,80:1); esa lámina sigue con el logo |
| Dona de partes | Tres segmentos en un anillo serían un arco que se llena; la órbita recorre, nunca se llena. Las partes van en una barra al 100 % |
| Círculos en el conteo o Venn con anillo | Se leerían como esfera u órbita; el conteo va en cuadrados y el Venn en discos translúcidos sin anillo |

## Reversibilidad

Alta (`two-way`). El registro es documentación, piezas y, desde el 2026-09-29, un catálogo local del Artifact Composer;
ninguna ruta productiva de Greenhouse depende todavía de él (TASK-1921). Revertir la decisión es retirar la norma y volver
a componer MCM sólo con La órbita. En AXIS, revertir es deprecar el token, el contrato y `AXIS_MANZANITAS_ASSETS` en una
versión nueva (lo publicado no se borra), como en Glitch. En Greenhouse, es retirar los catálogos `manzanitas-carousel` y
`manzanitas-stills`, el comando `pnpm manzanitas:compose` y sus frames del gate visual. El costo de revertir crece cuando la familia `manzanitas` entre a la ruta productiva.

## Revisar cuando

- El operador decida llevar las recetas de gráficos a La órbita, que cambia el alcance, o abra una pregunta nueva sobre
  el registro (hoy no queda ninguna [pendiente](#pendientes-del-operador)).
- El operador apruebe (o pida cambios en) los carruseles de ejemplo del Artifact Composer, o responda a la consecuencia
  del eslogan en los cierres (con el logo de 400 px, sólo Voice lleva la palabra en el acento).
- Entre una persona nueva al equipo (su ronda de identidad), o el operador cambie el equipo actual
  (el [roster](../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md) se actualiza en el mismo cambio).
- La familia `manzanitas` entre a la ruta productiva (TASK-1921).
- AXIS publique el token y el contrato: se registra en un Delta la versión, el tag y el paso de la fuente de verdad al
  token.
- El contrato `efeonce.manzanitas-register` deje de ser `candidate`.
- Una pieza de MCM necesite algo que ni La órbita ni el registro resuelven.

## Referencias

- **Canvas** «Marketing con Manzanitas · Línea v1», versión 39: https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG
  (tableros `Grafico-1…9`, `Texto-1…3`, `Graficos-resumen` «cómo funcionan», `Graficos-lineas` «acentos por línea»,
  `Formatos`, `Cierre-acciones`, `CW-*`, `Escena-*`, `Lente-interior`, `Story-cierre`, `Podcast-1x1`, `YouTube-cierre`).
- **Sistema de diseño** «Efeonce — La órbita»: https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc (componentes
  `EfeonceOrbit.Voice`, `Measure`, `Lens`, `Slogan`).
- **Composición en Greenhouse (TASK-1939):** comando `scripts/manzanitas/compose.ts` (`pnpm manzanitas:compose`), tokens
  `scripts/manzanitas/compile-tokens.ts` (`pnpm manzanitas:tokens`), catálogos
  `src/lib/artifact-composer/catalogs/manzanitas/`, mapper `src/lib/manzanitas-composition/` (ejemplos en `examples/`) y
  baseline `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md` §`2026-09-29 (r)`.
- **Norma operativa del registro:** [`MANZANITAS_REGISTER_V1.md`](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md).
- **Referencia para agentes:** `.claude/skills/efeonce-graphic-line/references/manzanitas.md`; skill
  `efeonce-graphic-line` (criteria §3.4 y §8, ledger 2026-09-28).
- **Biblioteca de recursos de MCM:** [`MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md`](../operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md).
- **SVG oficiales del logo:** OneDrive `Alineación/5. Contenidos/13- Branding/SVG`.
- **La órbita:** [ADR](./EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) · [manual](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md).
- **Glitch (hermana, precedente del plan de AXIS):** [ADR](./GLITCH_GRAPHIC_LINE_DECISION_V1.md) ·
  [norma](../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) · ADR de AXIS
  `docs/architecture/GLITCH_LINE_TOKEN_CONTRACT_DECISION_V1.md` (repo `efeoncepro/axis-design-system`).
