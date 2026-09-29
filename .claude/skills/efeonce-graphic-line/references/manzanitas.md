# Marketing con Manzanitas — registro complementario de La órbita (sólo piezas de MCM)

> **Verificado contra: greenhouse-eo@2c95e60b2 (`develop`) — 2026-09-29, tarde** (adopción de AXIS `v0.3.29`, leído en
> `node_modules`: sin decisiones abiertas, `closeCopy`, `teamPeople`, el eslogan desde el token y el roster del equipo;
> antes, greenhouse-eo@1050036e8: TASK-1939, catálogo `manzanitas` del Artifact Composer y `pnpm manzanitas:compose`,
> con AXIS `v0.3.28`) · **canvas v39 — 2026-09-28**
> («Marketing con Manzanitas · Línea v1», https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG; los tableros `Grafico-*` y
> `Texto-*` se leyeron en su fuente, con la lógica `renderVals()` de cada lámina) · inventarios de hechos de las sesiones
> del 2026-09-28 y del 2026-09-29 · [ledger.md](ledger.md) (filas del 2026-09-28 y del 2026-09-29) ·
> [criteria.md](criteria.md) §3.4 y §8.
>
> **Estado: APROBADO por el operador (2026-09-28)** sobre la versión 39 del canvas: «Me encantan, queda aprobada toda
> la línea gráfica». Cubre los formatos Pizarra, Escena, Lente y Recreo; la cabecera y la firma; la contraportada A;
> los acentos por línea; los 9 gráficos y las 3 láminas de texto denso. Si otra referencia de esta skill todavía llama
> «propuesta» a los gráficos o al texto denso, es anterior a esta aprobación.
>
> **Aprobada para usar como sub-línea (operador, 2026-09-29, verbatim):** «Ok manzanitas esta aprobado, pero ojo no
> sustituye a la orbita es una sublinea dentro del design system de la orbita igual que glitch». MCM es una **sub-línea
> dentro del sistema de La órbita, al mismo nivel que Glitch**; «registro complementario» (abajo y en el resto de esta
> referencia) nombra lo mismo. Lista para piezas de MCM con `pnpm manzanitas:compose`; el token y el contrato son **estables desde AXIS
> `v0.3.37`** (`canonical` / `stable`, 2026-09-29); sólo falta la ruta productiva (TASK-1921).
>
> **Canonización (operador, verbatim):** «esta línea gráfica no reemplaza The Orbit que es la /efeonce-graphic-line
> sino que la complementa con un nuevo registro para marketing con Manzanitas». **Complementa, no reemplaza:** La
> órbita sigue siendo la línea gráfica de Efeonce y manda en todo lo que este registro no dice. El registro suma
> reglas, estilos y piezas propias **sólo** para piezas de Marketing con Manzanitas.
>
> **Publicado en AXIS el 2026-09-28 (tag `v0.3.26`) y actualizado el 2026-09-29 dos veces: tag `v0.3.28` (siete
> decisiones del operador) y tag `v0.3.29` (las tres últimas y los hallazgos de TASK-1939; no queda ninguna abierta,
> §13).** Token `manzanitasRegister` (`@efeoncepro/axis-tokens` 0.3.29: `resolvedDecisions` con diez,
> `pendingDecisions: []`), contrato `efeonce.manzanitas-register` **0.3.0** (`stable` desde `v0.3.37`) (`@efeoncepro/axis-ui-contracts`
> 0.3.29; acepta intents 0.1.x y 0.2.0; `pnpm manzanitas:resolve`), gráficos `@efeoncepro/axis-graphic-line/charts`
> (0.11.0) y archivos `AXIS_MANZANITAS_ASSETS` (`@efeoncepro/axis-brand-assets` 0.4.1). Página y JSON: https://axis.efeonce.org/references/manzanitas/
> (`axis.manzanitas-register.v1`). **Manda el token**: los números de esta referencia son la medida del canvas v39, espejo
> humano; si difieren, gana el token (§10.3).
>
> **Desde el 2026-09-29 Greenhouse fija esas versiones y compone MCM con el Artifact Composer:**
> `pnpm manzanitas:compose -- --intent <pieza.json>` (§10.1; TASK-1939, `complete` el 2026-09-29: el operador
> aprobó los carruseles de ejemplo). Es el taller local: no publica ni agenda. La ruta productiva (TASK-1921)
> todavía no compone MCM.

**Nombre canónico:** «registro Marketing con Manzanitas» (abreviado «registro MCM» o «registro Manzanitas»). MCM es la
marca editorial evergreen del blog de Efeonce: marketing explicado simple.

## 0. Alcance — decide esto primero

- [ ] ¿La pieza es de **Marketing con Manzanitas** (carrusel, portada, lámina interior, contraportada, story, cabecera
      de blog o banner, miniatura de YouTube, portada de pódcast, cierre de video)? **Sí** → esta referencia **más** La
      órbita ([SKILL.md](../SKILL.md), [criteria.md](criteria.md), [qa-checklist.md](qa-checklist.md)). **No** → nada de
      aquí.
- [ ] ¿Es una pieza **de Efeonce** (deck, informe, social de marca, firma de correo, merch)? → sólo La órbita. Las
      recetas de gráficos de este registro están aprobadas **sólo para MCM** (decidido el 2026-09-29, §13).
- [ ] ¿Es de **Glitch** (magazine semanal o Glitch Flash)? → [glitch.md](glitch.md). Nunca esta referencia.
- [ ] ¿Cuál es el **tema**? Decide la línea (§2) antes de abrir un tablero: la línea cambia el acento de todo.

**Hermanos que no se mezclan.** La sub-línea de Glitch (token `glitchLine`, contrato `efeonce.glitch-line`) y este
registro son hermanos. Ninguno usa elementos del otro:

| Glitch (sólo Glitch) | Registro Manzanitas (sólo MCM) |
|---|---|
| La manzana **LLENA** como esfera | La manzana en **CONTORNO** con tres puntos (burbuja escribiendo); **no** es esfera |
| Verde Glitch `#6ec207` como acento | El acento de la **línea del tema** (§2) |
| La falla en bytes, Guttery | Nada de bytes ni Guttery |
| Cabecera «EDICIÓN #N» | Cabecera con el logo de MCM arriba a la izquierda (§3) |

**«Registro» tiene dos sentidos.** La órbita ya usa «registro» para la **fotografía** (documental, puesta en escena,
respuesta, cine). El registro Manzanitas es un registro de **marca editorial**; dentro de él, las fotos siguen usando
los registros fotográficos de Efeonce (en MCM, **cine**). Cuando aparezcan juntos, acláralo.

## 1. Hereda, propio y nunca

| Tema | Hereda de La órbita (sin cambios) | Propio del registro | Nunca |
|---|---|---|---|
| Voz | Pregunta + respuesta con `EfeonceOrbit.Voice`: anillo abierto antes de la pregunta, respuesta en Bricolage 760 con la esfera que cierra; respuesta ≤ 3 palabras y ≥ 3 veces la pregunta (`answer-dominates-3x`) | Tamaños por lámina (§8.1, §9) | Una respuesta que no domine a la pregunta |
| Esfera | **Una esfera por pieza** (`one-sphere-per-piece`) | En la medida y la tendencia la esfera **es el dato**: esas láminas no llevan la voz con su esfera | Dos esferas; un círculo suelto en un gráfico; leer los tres puntos del logo como esferas (son ventanas de la nave, ADN de familia) |
| Órbita | Una órbita por pieza (`one-orbit-per-piece`); ningún texto la cruza; la medida en la órbita (`trajectory.measure`) y la Lente (`EfeonceOrbit.Lens`) | En la Escena, **la luz de la foto es la órbita** de la pieza | Dona de partes; una órbita dibujada en una Escena; la Lente combinada con otra órbita o con el foco |
| Acento | Por línea desde `efeonceGraphicLine.lines`: `accentOnLight` sobre papel, `accentOnDark` sobre navy; ≥ 3:1 contra su fondo; nunca en texto < 24 px (`accent-text-min-size`) | La manzana, sus tres puntos, el gráfico y la cifra destacada van en el acento de la **línea del tema**, con un solo selector (§2) | El acento como superficie (a sangre); la manzana en color fijo o en el acento de otra línea |
| Superficies | Navy `color.dark` (`#001a33`) y papel `color.paper` (`#f7f8f6`); texto `color.navy` (`#023c70`) | El selector de línea no cambia la superficie | Un campo entero de acento |
| Tipografía | Bricolage Grotesque (respuesta y cifras, 760, tracking −0,035em); Poppins (pregunta 300; texto 400/500) | Rótulos de 24–26 px; cuerpo de texto denso 28–32 px | Texto en acento bajo 24 px |
| Cabecera | — | Logo de MCM siempre arriba a la izquierda (§3) | Recortar la manzana hasta que no se lea (§14) |
| Firma | Logo de Efeonce centrado abajo; la burbuja URL sólo reemplaza al logo si el logo ya está en la imagen | Una sola altura de firma en todo el carrusel: y 1202 (§6) | La burbuja URL sobre la mesa de la estratega (no pasa contraste) |
| Eslogan | «Empower your Growth \| Brand \| Engine \| Voice \| Revenue» **sólo cierra**, en bloque con el logo: eslogan debajo al 64 % del ancho del logo (`motion.layout.sloganOfLogo`), separado 1,35 veces su fuente (`sloganGapOfFont`) | Su palabra es la línea del tema y va en el acento sólo si el eslogan llega a 24 px (regla del 2026-09-29; con el logo de 400 px del cierre, sólo Voice llega: §6 y §10.1) | En portada, blog, miniatura o pódcast; como texto suelto; encima del logo o a un cuerpo fijo |
| Íconos | Sólo del catálogo de AXIS (`resolveIcon`), en reposo, con la voz de la línea (`icons.voiceByLine`) | La mano «Desliza» en un sitio fijo (§5) | Íconos sociales o botones simulados en la contraportada |
| Foto | Lenguaje fotográfico de Efeonce | Registro cine; lecho nativo; Escena y Lente como formatos (§4) | Lecho agregado; la foto cargando sola el argumento |
| Datos | El arco mide un dato real con fuente | Gráficos calculados desde su dato; «Ejemplo ilustrativo · Fuente: [FUENTE, AÑO]» hasta tener la real (§8) | Una cifra sin fuente; una barra dibujada a mano |

## 2. Acentos por línea

Regla del operador (2026-09-28, verbatim): «el marketing con manzanitas ajusta sus acentos como el color de la
manzana de los puntos de la orbita etc como dice la línea gráfica que es por linea de negocios».

| Línea | Clave AXIS | Sobre papel (`accentOnLight`) | Sobre navy (`accentOnDark`) | Palabra del eslogan | Voz de «Desliza» |
|---|---|---|---|---|---|
| Growth | `growth` | `#0e8c82` | `#36c8bf` | Growth | Trazo `swipe` (D28) |
| Brand | `brand` | `#bb1954` | `#ff6500` | Brand | Plastilina `mano` (D29) |
| Engine | `engine` | `#0375db` | `#0375db` | Engine | Trazo `swipe` |
| Voice | `voice` | `#f83902` | `#f83902` | Voice | Trazo `swipe` (decidido el 2026-09-29; `swipe.lineOverrides.voice`) |
| Revenue (HubSpot) | `revenue-hubspot` | `#8e1b82` | `#e86bd0` | Revenue | Trazo `swipe` |
| Revenue (Salesforce) | `revenue-salesforce` | `#00739e` | `#2fb8ff` | Revenue | Trazo `swipe` |

Los hex son referencia medida; al construir, el valor se lee del token (`efeonceGraphicLine.lines[].accentOnLight` /
`accentOnDark`), nunca se transcribe. El selector del canvas ofrece `growth`, `brand`, `engine`, `voice` y `revenue`
(este último resuelve a `revenue-hubspot`). **Revenue por plataforma (decidido el 2026-09-29):** un tema de Salesforce
lleva `revenue-salesforce`; uno de HubSpot o genérico, `revenue-hubspot` (`topicLine.revenueByPlatform`). En el intent
del Composer, `topicLine` lleva la clave AXIS.

- **La línea la decide el TEMA, no la pieza.** Decididos: AEO / visibilidad en IA = **Engine**; creatividad = **Brand**
  (Creative Workflows). Para otro tema, la línea es la de servicio que lo trata (columna `scope` de
  `efeonceGraphicLine.lines`, en [package-and-tokens.md](package-and-tokens.md) §2.2); si cae entre dos, pregunta.
- **Un solo selector por lámina, «Línea del tema».** Al cambiarlo cambia todo a la vez: la manzana y los tres puntos
  (cabecera, portada, cierre), el arco, la esfera, la barra o la cifra destacada, la palabra del eslogan y la voz del
  ícono «Desliza». No cambian la superficie ni el texto del logo.
- **Texto del logo:** navy `#022a4e` (el del asset) sobre papel y blanco sobre navy. Es la **tinta compartida de la
  familia Manzanitas** (decidido el 2026-09-29; Glitch lo declara compartido en `glitchLine.scope.sharedWithEditorialFamily`):
  compartir esa tinta no autoriza ningún otro elemento de Glitch.
- **Neutros de los gráficos:** lo que no destaca va en navy `color.navy` (`#023c70`) y gris `#c9d2dc` (el `before` de
  la receta de deck `decision-chart`, en `efeonceGraphicLine.surfaces`). Sobre navy, lo que no destaca va en
  `rgba(207, 228, 250, 0.22)` y el texto suave en `#cfe4fa`; sobre papel, el texto suave es `#6d6777` (tinta suave del
  DS `EfeonceOrbit`). Estos neutros no tienen token propio todavía: son valores del canvas.
- **El acento es luz, gráfico y palabra, nunca superficie** (el acento a sangre fue rechazado, §7).

## 3. Cabecera

- El logo de MCM (manzana en contorno con tres puntos arriba + «Marketing con Manzanitas») va **siempre arriba a la
  izquierda**, en todos los formatos. En el carrusel 1080 × 1350: x 80, y 72, 200 × 90 px. Otras piezas usan
  160 × 72, 180 × 81 o 240 × 108 según formato.
- **Sin manzana** (sólo el texto «Marketing con Manzanitas») en la **portada Pizarra** y en la **contraportada**,
  porque ahí la manzana grande está en la lámina.
- En la portada con foto, la pregunta va en **una línea** para que la voz termine sobre la cabeza.
- **El SVG oficial tiene 25 trazos; los cuatro últimos son la manzana y los tres puntos**: esos toman el acento, el
  resto la tinta del logo.
- SVG oficiales en OneDrive `Alineación/5. Contenidos/13- Branding/SVG`. Usan `<style>`: **inlinea los fills antes de
  subir**. Inventario y nombres exactos (ojo al prefijo `mkt-` vs `marketing-`) en la
  [biblioteca de recursos de MCM](../../../../docs/operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md).
  La biblioteca trae además la manzana suelta en colores fijos (naranja, verde, azul…): en este registro ninguno se
  usa como color fijo; la manzana toma el acento de la línea del tema.
- **La manzana se lee completa:** dos lóbulos, hendidura, hoja y tallo. Puede sangrar un borde; un recorte de sólo hoja
  + tallo se leyó como «orejas de conejo» y se rechazó.

## 4. Formatos de lámina (tablero `Formatos`)

### 4.1 Pizarra («Diseñado»)

La línea v1 tal como está: papel o navy, la manzana, la voz y los pasos. Sirve para la portada, los pasos, el dato y
el cierre. **El dato con fuente y el cierre van siempre en Pizarra.** Es la **única** que lleva la manzana grande.
Todos los gráficos y el texto denso son Pizarra.

### 4.2 Escena («Foto completa»)

- Una fotografía a sangre, con la voz en su reserva y la firma sobre el lecho. **Registro cine.**
- Sin manzana grande ni órbita dibujada: **la luz de la foto es la órbita de la pieza**.
- **La foto dice lo que dice el texto**, y el lecho sale de ella: es lo que de verdad hay entre la cámara y el sujeto
  (la mesa donde Nexa revisa, la mesa del cliente, la silla del visitante), **nativo, nunca agregado**. La firma va
  dentro de su materia, con aire sobre su borde.
- **Rechazados como lecho:** mesa «matte black» en estudio vacío, cabezas del público, dorso de un portátil,
  «consola», piso que corta las piernas.
- El isotipo del traje de Nexa **se compone** y el modelo sólo lo termina sobre su silueta (método en
  `.claude/rules/brand-photography.md` y skill `design-studio`).
- Cine con Nexa protagonista es el caso probado. **Personas del equipo (decidido el 2026-09-29, decisión 6
  `cine-team-people-social`):** las fotos cine de MCM pueden mostrar a personas reales del **equipo actual**, sólo desde
  el [roster del equipo](../../../../docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md) que mantiene Greenhouse
  (token `manzanitasRegister.teamPeople = { allowed: true, rosterSource: 'greenhouse-team-roster', onlyCurrentTeam: true }`;
  **el token no nombra a nadie**, el Lab es público). Es el cuarto caso permitido del registro cine:
  [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md).
  - **Quién**: Julio, Andrés, Daniela, Melkin, Humberly y Valentina Hoyos (roster; Luis salió el 2026-09-29). María Fernanda ya no está en
    el equipo actual: su foto de `squad/` no se usa.
  - **Con qué ropa: la decide la línea de la pieza, no la persona** (operador, 2026-09-29, «por la personalidad de las
    líneas de negocio»): **hoodie** Efeonce en Servicios creativos (`brand`); **bomber o softshell** del uniforme
    corporativo en `growth`, `engine`, `voice`, `revenue-hubspot` y `revenue-salesforce`, con el polo debajo si se
    quiere (nunca el polo solo). Todo el equipo, Julio y Valentina incluidos. La ficha declara `"linea"` y la prenda en
    `objetos`; `pnpm foto:prompt` se detiene si no calzan (`validarVestuarioDeLinea`). Los plates piloto del
    2026-09-29 (hoodie) aprueban identidad, no vestuario.
  - **La identidad se declara en la ficha** (`"identidad": ["<clave>"]`; claves en `PERSONAS` de
    `scripts/foto/build-prompt.mjs`: `julio`, `andres`, `daniela`, `humberly`, `luis`, `melkin`, `valentina`) y se
    regenera con sus referencias (`pnpm foto:generar`); nunca se injerta una cara ni se describe de memoria.
  - **Las seis identidades nuevas están aprobadas por el operador el 2026-09-29 sobre la ronda piloto (`ai-generations/2026-09-29_manzanitas-equipo/`)**; una persona nueva en el equipo pasa por su propia ronda. De Humberly y Luis sólo hay retratos antiguos (falta su foto actual);
    la foto actual de Melkin es la de `squad/` (el retrato antiguo lo muestra con otro peinado).
  - La estratega de la Escena interior aprobada sigue siendo una persona por rol, generada.

### 4.3 Lente («Foto señalada»)

La foto apagada afuera y a color dentro del círculo, para señalar a una persona o un objeto (`EfeonceOrbit.Lens`).
**Sólo en láminas interiores** (la portada con foto es Escena). No se combina con otra órbita ni con el foco. La foto se
toma **para** la lente: la cara y el objeto caben en el círculo fijo del formato y **nadie mira al lente**.

### 4.4 Recreo (la mezcla del carrusel)

- Portada **Pizarra** → cerca de un tercio de las láminas lleva foto (≈ 2 de 7).
- Portada **Escena** → la foto ya es la promesa y el carrusel llega a casi la mitad (≈ 3 de 7).
- Nunca dos láminas con foto seguidas. Nunca más de tres Pizarras seguidas: **los gráficos, la lámina de dato y el
  texto denso no suman a la racha ni la cortan** (decidido el 2026-09-29, `recreo.pizarraRun`; el contrato falla con
  `pizarra-run-exceeded`).
- El dato con fuente y el cierre, siempre en Pizarra.
- Todas las fotos de un carrusel comparten registro y luz.
- La lámina que sigue a una foto retoma la voz: la foto nunca carga sola el argumento.

### 4.5 Story, blog y banner

- **Story y blog: una sola pieza** (Escena o Pizarra, nunca las dos).
- **Story con foto:** la voz en la banda alta y la firma centrada sobre la mesa, dentro de la zona segura. **Manda la
  zona segura de AXIS, el 87 %** (13 % arriba y abajo; decidido el 2026-09-29, `canvases['story-9x16'].safeArea`): la
  firma de la Escena story sube de y 1620 a y 1619. La story no lleva «Desliza». La story de cierre lleva el eslogan
  (§10.1) y **su voz, obligatoria** (`voice-missing`), con un texto de cierre que cambia con el contexto y cabe en su
  extensión (decidido el 2026-09-29; §7).
- **Blog y banner:** la foto se genera en 16:9 y se lleva a 1,9:1 (1200 × 630). La voz va en el lado oscuro; la firma
  puede ir abajo a la izquierda, cerrando la columna del texto. Sin eslogan.

### 4.6 YouTube y pódcast

- **Miniatura de YouTube:** Escena 16:9 (1280 × 720 en el canvas), cabecera de MCM arriba a la izquierda y el logo de
  Efeonce abajo a la izquierda (tablero `Escena-youtube`). Sin eslogan. El **cierre del video** sí lo lleva
  (`YouTube-cierre`).
- **Pódcast (1:1):** la cabecera del programa en grande (**420 px**), porque la portada se ve a 160 px (ahí queda en
  62 px). Sin eslogan.

## 5. La mano «Desliza» (sitio fijo)

- Mismo lugar en todas las láminas que la llevan (Pizarra, Escena, Lente): pegada al margen derecho (80 px). En
  1080 × 1350: x 936, 64 × 64 px, a **1033 px** del borde superior en la **portada** y a **985 px** en los
  **interiores**. En piezas de MCM manda este sitio fijo del registro.
- Nunca junto a la voz cuando la voz va arriba, nunca en la fila de la firma, **nunca sobre el sujeto**: la foto se
  toma con ese rincón en calma; si el sujeto lo ocupa, se rehace la toma.
- **En reposo.** No va en la última lámina ni en la story.
- Voz por línea: Brand = Plastilina `mano` (D29); Growth, Engine y Revenue = Trazo `swipe` (D28); Voice = Trazo
  (decidido el 2026-09-29 para el registro: `swipe.lineOverrides.voice`; en La órbita la voz de Voice sigue sin
  definir). Se pinta con `resolveIcon({ glyph, size: 64, surface, label: 'Desliza' })` de
  `@efeoncepro/axis-graphic-line/icons`; en el registro, la voz sale de `manzanitasSwipeGlyphOf(línea)`
  (`@efeoncepro/axis-ui-contracts`), que suma la decisión de Voice a la de La órbita. Nunca un ícono dibujado a mano.
  En el Composer la mano ya viene compilada por línea (§10.1).
- **Excepción registrada (decidido el 2026-09-29):** la portada Pizarra puede llevar la mano **en respuesta** (dos
  esferas), sólo como la pieza `cover-pizarra-swipe-response`. En el resto, en reposo.

## 6. Firma y eslogan

- **Una sola altura de firma** en todo el carrusel: el logo de Efeonce arriba en **y 1202** (de 1350), 216 × 51 px, a
  97 px del borde inferior, en Pizarra, Escena y Lente (la Lente del sistema firma ahí). En la Escena queda dentro de
  la mesa.
- **El eslogan sólo cierra:** el cierre del carrusel, la story de cierre y el cierre del video. Su palabra es la línea
  del tema. **Nunca** en la portada, el blog, la miniatura ni el pódcast.
- **Regla del operador del 2026-09-29 (manda sobre el canvas v39):** el eslogan es un elemento gráfico que acompaña la
  marca, no un texto. Va **siempre debajo** del logo de Efeonce, en bloque, al **64 % del ancho del logo**
  (`sloganOfLogo`) y separado 1,35 veces su cuerpo (`sloganGapOfFont`); su cuerpo sale del logo, nunca se elige. La
  palabra de la línea va en el acento **sólo si el cuerpo llega a 24 px**; si no, en la tinta de la superficie (blanco
  sobre navy). Números por línea y cómo lo aplica el Composer: §10.1, «El eslogan de los cierres».
- En el cierre el logo mide **400 px** y el bloque termina en la línea de firma (**y 1253**). La frase del canvas «400 px
  para que el eslogan llegue a 24 px» quedó superada: al 64 % del ancho del logo, con 400 px **sólo Voice** llega a
  24 px. Es una consecuencia que se le presenta al operador: no subas el logo ni el cuerpo por tu cuenta. (El
  componente `EfeonceOrbit.Slogan` del DS pinta la palabra siempre en el acento, ver [criteria.md](criteria.md) §5: en
  MCM manda la regla del 2026-09-29.)
- El eslogan acompaña al logo, no es texto suelto: nunca como una línea más de la columna de texto, encima del logo ni
  a un cuerpo fijo.
- **La burbuja URL sobre la mesa de la estratega no pasa** (1 % peor 3,80:1): esa lámina sigue con el logo.

## 7. Contraportada (aprobada: «A a escala», 2026-09-28)

- **Es una pieza social, no una hoja.** Pide **una sola conversión**: el comentario ligado a una acción que el lector
  hace hoy.
- **Voz:** pregunta + respuesta accionable + bajada en una línea «En los comentarios: …».
  - Engine: «¿Te nombra la IA? **Pregúntale.**» + «En los comentarios: cuéntanos si te nombró.»
  - Brand (Creative Workflows): bajada «En los comentarios: el primer ingrediente de tu receta.»
- **El texto del cierre cambia con el contexto, nunca queda fijo** (decisión 5, operador, 2026-09-29, verbatim: «El texto
  de cierre tiene que variar dependiendo el contexto, no puede quedar fijo, lo que sí puedes normalizar es su extensión
  para que no rompa el diseño»). Los ejemplos de arriba no son una fórmula. Lo que se normaliza es la **extensión**:
  `manzanitasRegister.closeCopy = { varies: 'by-context', fixed: false, pieces: ['back-cover-a', 'story-close'],
  maxChars: { question: 44, answer: 10, sub: 56 } }`. El contrato devuelve **`close-copy-too-long`** y exige la voz de la
  story de cierre (`voice-missing`). El «Guárdala» provisional quedó retirado.
- **La manzana de la portada vuelve 3,8 veces más grande**, recortada por arriba y por la derecha: su cuerpo con los
  tres puntos queda como una burbuja escribiendo, en el acento de la línea, **sin astilla del tallo en el borde**.
  100 px de aire bajo la manzana y 120 px sobre el logo. La cabecera va sin manzana.
- **Nada simula un botón** (post orgánico). Guardar, compartir y enviar se piden en el copy del post cuando hacen
  falta, nunca los cuatro a la vez. Por qué no van los íconos sociales: una conversión por carrusel; los botones ya
  existen en la interfaz de LinkedIn; un comentario con sustancia pesa más.
- **Los Trazo `republicar` y `enviar` entraron al catálogo** (decisión 7, 2026-09-29; [iconography.md](iconography.md) §13),
  pero no cambian esta regla: la contraportada sigue sin íconos sociales ni botones simulados
  (`backCover.simulatedButtons: false`).
- Se mide en Metricool: comentarios con sustancia, guardados, envíos y clics al grader por UTM cuando aplique.
- En el teléfono (390 px): respuesta 69 px, bajada 11 px, logo 144 px (`backCover.phone390`). El eslogan ya no tiene un
  cuerpo fijo: sale del logo (§6); el canvas lo medía en 9 px con el eslogan de 24 px anterior a la regla.
- **Descartados:** B (órbita, más sutil) quedó como prueba. **C (acento a sangre) rechazada** («Logo azul Efeonce
  acá??? … muchísima saturación»): el acento nunca es superficie y el logo positivo trae el isotipo azul.

## 8. Gráficos: cómo usarlos (9 láminas, aprobadas 2026-09-28)

### 8.1 Gramática común

- Todas son **Pizarra** (papel o navy), 1080 × 1350, con cabecera, «Desliza» en y 985 y firma en y 1202.
- **Se calculan desde su dato:** la lógica de la lámina (`renderVals()`) recibe `datos` (arreglo u objeto) o `valor`
  (entero 0–100) y calcula largos, posiciones, la esfera, el destacado y la respuesta cuando es un número. **La
  plantilla sólo pinta.**
- **Un acento, sólo donde está la idea.** El resto va en navy y gris (§2).
- **Las barras salen de su número** (`bars-from-values`) y parten de cero; ninguna se dibuja a mano.
- **Cifras con fuente** (`figures-with-source`) y datos de muestra marcados (`illustrative-data-marked`): la línea al
  pie dice «Ejemplo ilustrativo · Fuente: [FUENTE, AÑO]» (Poppins 500, 24 px, x 80, ancho 820, en texto suave; la
  fuente en negrita) hasta tener la real. **Sin fuente, la cifra no sale.**
- **Una esfera por pieza.** En la **medida** y la **tendencia** la esfera ES el dato: no llevan la voz con su esfera;
  llevan la pregunta arriba (Poppins 300, 44 px, x 80, y 222, ancho 900) y la fuente en y 1002. Las otras siete cierran
  con la voz (`EfeonceOrbit.Voice`, respuesta 150 px, pregunta 45 px, x 80, y 842, ancho 820); las que imprimen cifras
  llevan la fuente en y 1068. El Venn y la matriz no imprimen cifras y en el canvas no llevan línea de fuente.
- **No hay dona de partes:** tres segmentos en un anillo serían un arco que se llena (la órbita recorre, nunca se
  llena). La dona de la línea es la medida de la órbita. Las partes (hasta 3) van en una barra al 100 %.
- **Ningún círculo suelto** en un gráfico: el conteo va en cuadrados; el Venn en discos translúcidos sin anillo, para
  que nada se lea como esfera ni como órbita.
- Rótulos de 24–26 px, cifras en Bricolage 760; el texto en acento sólo desde 24 px.
- **Las respuestas en palabras son texto** y se editan en la lámina; **las numéricas salen del dato**. Numéricas:
  medida y tendencia (la cifra), ranking («N veces»), partes («1 de N»), de cada 100 («N de 100»). En palabras: antes y
  después, Venn, matriz, embudo. **Si cambias el dato, relee la respuesta en palabras: no se recalcula.**

### 8.2 Elige por la pregunta

| La pregunta de la lámina | Gráfico | Dato | Superficie | ¿Voz? |
|---|---|---|---|---|
| ¿Qué parte del total? | 1 · Medida en la órbita | `valor` 0–100 | navy | no (la esfera es el dato) |
| ¿Quién va primero y cuánto nos separa? | 2 · Ranking | `datos` [{label, v, rol}] | papel | sí |
| ¿Cuánto cambió? | 3 · Antes y después | `datos` {antes, despues} | papel | sí |
| ¿Hacia dónde va? | 4 · Tendencia | `datos` 12 valores mensuales | navy | no (la esfera es el dato) |
| ¿De qué está hecho? | 5 · Partes de un todo | `datos` hasta 3 [{label, v, tono}] | papel | sí |
| ¿Cuántos de cada 100? | 6 · De cada 100 | `valor` 0–100 | navy | sí |
| ¿Dónde se cruzan tres cosas? | 7 · Venn de tres | concepto, sin dato ni fuente | papel | sí |
| ¿Qué hago primero? | 8 · Matriz 2 × 2 | `datos` [{label, esfuerzo, impacto, foco?}] | navy | sí |
| ¿Dónde se pierde? | 9 · Embudo | `datos` [{label, v}] en orden | papel | sí |

Si la pregunta no está en la tabla, no fuerces un gráfico: la lámina va con voz y texto (Pizarra o texto denso, §9).

### 8.3 Fichas

Los ejemplos de cada ficha son los datos de muestra del canvas; sirven para comprobar tu cálculo, nunca para publicar.

**1 · Medida en la órbita** — tablero `Grafico-1`
- **Pregunta:** «¿Qué parte del total?» (muestra: «¿En cuántas respuestas de IA sobre tu categoría aparece tu marca?»).
- **Sí:** una sola proporción de un total, con fuente. **No:** para comparar actores (→ 2), la composición del total
  (→ 5), la evolución en el tiempo (→ 4).
- **Dato:** `valor` entero 0–100 (la lógica lo acota a 0–100).
- **Acento:** arco (estela) y esfera, en `accentOnDark`.
- **Respuesta:** la cifra es la respuesta: Bricolage 230 px (170 px al 100 %) + «te nombran» 32 px, dentro del anillo.
- **Superficie:** navy. Sin voz.
- **Medidas:** anillo r 300, centro (540, 680). La geometría (anillo `#72ded8` al 16 %, trazo 2,38; arco 3,81; esfera
  r 8,33; marca de partida al 60 %) sale de `measureSvg` de AXIS (sonda en Engine sobre oscuro).
- **Cálculo:** barrido = valor ÷ 100 × 360°, desde las 12 en sentido horario; la esfera en (540 + 300 · sen barrido,
  680 − 300 · cos barrido); la estela = min(50°, barrido) detrás de la esfera (50° = `trajectory.measure.trailDeg`).
  0 %: la esfera en la partida, sin estela. 100 %: vuelve arriba y se queda. Verificado contra `measureSvg` en 0,05 /
  0,38 / 0,62 / 0,9 / 1 (el generador del canvas se detiene si no coincide). Muestra: 38 → «38 %».

**2 · Ranking** — tablero `Grafico-2`
- **Pregunta:** «¿Quién va primero y cuánto nos separa?» (muestra: rótulo «Menciones en respuestas de IA, % del
  total»; voz «¿Cuánto más nombran al líder?»).
- **Sí:** varios actores medidos con la misma vara, con un líder y tu marca. **No:** si no hay tu marca o no hay
  líder, la respuesta «N veces» no tiene sentido; un solo actor → 1.
- **Dato:** `datos` [{label, v, rol: 'lider' | 'tu'}]; `v` en % del total.
- **Acento:** tu marca (barra y cifra en el acento, rótulo en negrita); el líder en navy; el resto gris.
- **Respuesta:** «N veces» = líder ÷ tu marca, redondeado.
- **Superficie:** papel.
- **Medidas:** barras de 44 px, largo máx. 760, rótulo de 26 px sobre cada barra, cifra Bricolage 40 a su derecha.
- **Cálculo:** largo = v ÷ máx × 760 (mínimo visible 4 px). Sin `rol: 'lider'`, toma el primero como líder; sin
  `rol: 'tu'`, el último como tu marca. «N» = redondeo de líder ÷ tu marca, mínimo 1. Muestra: 46, 31, **12**, 7, 4 →
  «4 veces».

**3 · Antes y después** — tablero `Grafico-3`
- **Pregunta:** «¿Cuánto cambió?» (muestra: «¿Y si la IA te entiende?»).
- **Sí:** un solo indicador en dos momentos. **No:** una serie de muchos momentos (→ 4).
- **Dato:** `datos` {antes, despues} en índice (antes = 100).
- **Acento:** la llave que marca la diferencia y su anotación («+140 %», Bricolage 96).
- **Respuesta:** en palabras («Te citan»).
- **Superficie:** papel.
- **Medidas:** dos columnas de 240 px (x 80 y x 360), alto máx. 400, base en y 740; antes gris, después navy; cifras
  Bricolage 56 sobre cada columna; «Antes» / «Después» a 28 px.
- **Cálculo:** alto = valor ÷ máx(antes, después) × 400; diferencia = (después − antes) ÷ antes × 100, redondeada, con
  «+» si es ≥ 0. Muestra: 100 → 240 → «+140 %».

**4 · Tendencia** — tablero `Grafico-4`
- **Pregunta:** «¿Hacia dónde va?» (muestra: «¿Cómo crece tu marca en las respuestas de IA?»).
- **Sí:** una serie mensual de un indicador. **No:** dos momentos (→ 3); varias series.
- **Dato:** `datos` 12 valores mensuales. **Los rótulos de mes salen fijos de «ene» a «dic»**: la serie tiene que ir
  de enero a diciembre o los rótulos mienten.
- **Acento:** el último tramo como estela, la esfera y el último valor (Bricolage 110). El primero va suave (40).
- **Respuesta:** la cifra del último punto. Sin voz.
- **Superficie:** navy.
- **Medidas:** sin rejilla, sólo la base; la línea en blanco al 90 % con el doble del trazo del arco (7,62); la esfera
  al doble de la de la órbita (r 16,66); meses de 24 px.
- **Cálculo:** x repartida de 180 a 900; y = 900 − v ÷ máx × 420 (el eje parte de cero). El último tramo (del
  penúltimo al último punto) es la estela en el acento y termina en la esfera, en el último punto. Muestra: 12 → 38.

**5 · Partes de un todo** — tablero `Grafico-5`
- **Pregunta:** «¿De qué está hecho?» (muestra: «¿Cuánto tráfico te trae la IA?»).
- **Sí:** hasta 3 partes que suman un todo. **No:** más de tres (la lógica sólo pinta las tres primeras: la
  agrupación es una decisión editorial, no de la lámina); una dona (no existe en el registro).
- **Dato:** `datos` hasta 3 [{label, v, tono: 'navy' | 'gris' | 'acento'}].
- **Acento:** la parte con `tono: 'acento'` (su barra y su cifra).
- **Respuesta:** «1 de N» = total ÷ la parte destacada.
- **Superficie:** papel.
- **Medidas:** barra al 100 % de 220 px de alto (920 de ancho) con 6 px entre partes; leyenda en 3 columnas (muestra
  de 28 px + cifra Bricolage 72 + rótulo 26).
- **Cálculo:** ancho = v ÷ total × (920 − 6 × (partes − 1)); cifra = v ÷ total × 100; «N» = redondeo de total ÷ parte
  destacada (sin `tono: 'acento'`, la última). Muestra: 62 / 26 / **12** → «1 de 8».

**6 · De cada 100** — tablero `Grafico-6`
- **Pregunta:** «¿Cuántos de cada 100?» (muestra: «¿Cuántas búsquedas no dan clic?»).
- **Sí:** una proporción que se entiende mejor contada. **No:** cuando lo que importa es la parte de un total sobre
  la órbita (→ 1).
- **Dato:** `valor` 0–100.
- **Acento:** las celdas llenas.
- **Respuesta:** «N de 100».
- **Superficie:** navy.
- **Medidas:** 10 × 10 cuadrados redondeados de 44 px con 10 px entre ellos (cuadrados, nunca círculos); clave «sin
  clic» (acento) / «con clic» (tenue) debajo.
- **Cálculo:** las celdas 1 a `valor` se llenan en el acento **por filas** (de izquierda a derecha, de arriba abajo);
  el resto en `rgba(207, 228, 250, 0.22)`. Muestra: 58 → «58 de 100».

**7 · Venn de tres** — tablero `Grafico-7`
- **Pregunta:** «¿Dónde se cruzan tres cosas?» (muestra: «¿Dónde te nombra la IA?»; rótulos «Lo que tu cliente
  pregunta», «Lo que publicas», «Lo que la IA sabe de ti»).
- **Sí:** un concepto. **No:** cuando hay cifras (no las lleva y no lleva fuente).
- **Dato:** ninguno.
- **Acento:** el centro triple.
- **Respuesta:** en palabras («Al centro»).
- **Superficie:** papel.
- **Medidas:** tres discos de r 190 en navy al 12 % (multiplicar), sin anillo; rótulos fuera de los discos (26 px).

**8 · Matriz 2 × 2** — tablero `Grafico-8`
- **Pregunta:** «¿Qué hago primero?» (muestra: «¿Qué conviene hacer primero?»).
- **Sí:** priorizar tareas por esfuerzo e impacto, con una recomendada. **No:** sin una tarea `foco`, la lámina no
  responde.
- **Dato:** `datos` [{label, esfuerzo 0..1, impacto 0..1, foco?}] (la lógica acota a 0..1).
- **Acento:** el cuadrante «Hazlo ya» (Bricolage 40) y la píldora de `foco` (fondo en el acento, texto navy oscuro
  `color.dark` `#001a33` en negrita). Las demás píldoras, fondo `rgba(207, 228, 250, 0.14)` y texto blanco.
- **Respuesta:** en palabras («Las FAQ»).
- **Superficie:** navy.
- **Medidas:** ejes al centro (x 540, y 505); cuadrantes «Hazlo ya» (arriba a la izquierda: poco esfuerzo, mucho
  impacto), «Planifícalo», «Si sobra tiempo», «Evítalo»; tareas en píldoras de 26 px.
- **Cálculo:** posición x = 170 + esfuerzo × 740; y = 330 + (1 − impacto) × 380 (centro de la píldora). Muestra: «FAQ
  con datos» (foco) en esfuerzo 0,2 e impacto 0,84.

**9 · Embudo** — tablero `Grafico-9`
- **Pregunta:** «¿Dónde se pierde?» (muestra: «¿Dónde se te caen los clientes?»).
- **Sí:** etapas en orden, cada una contenida en la anterior. **No:** etapas sin orden o que no se contienen (→ 2).
- **Dato:** `datos` [{label, v}] en orden.
- **Acento:** el paso con peor conversión (su barra y su %).
- **Respuesta:** en palabras («Al comprar»); tiene que nombrar el paso destacado.
- **Superficie:** papel.
- **Medidas:** barras centradas (máx. 760, alto 70) con su rótulo y valor encima; columna «Pasa» a la derecha con la
  conversión de cada paso (Bricolage 48).
- **Cálculo:** ancho = v ÷ máx × 760 (mínimo 6 px); conversión de cada etapa = etapa ÷ anterior (la primera no lleva
  %); se destaca la etapa con la menor conversión. Muestra: 1.000 → 420 → 190 → 60 = 42 %, 45 %, **32 %** → «Al
  comprar».

### 8.4 Reglas comunes de la lógica (trampas)

- **Dato inválido = muestra en silencio (en el canvas).** Si `datos` no es un arreglo (o el objeto no trae `antes`), la
  lámina pinta **los datos de muestra** sin avisar. Comprueba que las cifras en pantalla son las tuyas. En el Composer
  no pasa: el contrato falla cerrado con `chart-data-invalid` (§10.1).
- Porcentajes redondeados al entero con **espacio duro antes de «%»**; miles en formato es-CL («1.000»).
- Mínimo visible: 4 px en las barras (6 px en el embudo), para que un valor chico no desaparezca.
- La geometría de la órbita (medida) y el trazo y la esfera de la tendencia se leen de `measureSvg`; nunca se
  escriben a mano.

## 9. Texto denso (3 láminas, aprobadas 2026-09-28)

Para explicar un concepto complejo: la voz arriba (y 216, respuesta 130 px) y el texto debajo. En un teléfono de 390 px
el cuerpo queda en 10 a 11,5 px (28 a 32 px en la lámina) y los rótulos en 9 px (24 px).

| Lámina | Superficie | Composición | Ejemplo |
|---|---|---|---|
| `Texto-1` · Concepto y tres puntos | papel | párrafo de 32 px + 3 puntos (cifra Bricolage 56 en el acento, título 30/600, cuerpo 28) | «¿Qué es el AEO? Que te citen.» |
| `Texto-2` · Comparación en dos columnas | navy | encabezados Bricolage 60 (el segundo en el acento), 4 filas (rótulo 24/600 suave + celdas 30) y un remate de 28 px | «¿SEO o AEO? Las dos.» — «Sin SEO, la IA no te encuentra. Sin AEO, no te cita.» |
| `Texto-3` · Paso a paso | papel | 4 pasos (cifra en el acento 56 + título 30 + cuerpo 28) | «¿Cómo empiezo con el AEO? En 4 pasos.» |

## 10. Cómo se compone hoy

Desde el 2026-09-29 una pieza de MCM se compone con el **Artifact Composer** (§10.1). AXIS guarda los valores, el
contrato y los gráficos (§10.3). El canvas de la línea queda como la referencia de diseño aprobada (§10.4).

### 10.1 Componer con el Artifact Composer (TASK-1939)

**Estado:** TASK-1939 `complete` (2026-09-29; código en `1050036e8`, en `develop`): código completo y verificado (la suite
del Composer, 564 pruebas en 37 archivos, y el gate visual, en verde). Desde el commit `2c95e60b2` fija AXIS `v0.3.29`
(`axis-tokens` 0.3.29, `axis-ui-contracts` 0.3.29, `axis-graphic-line` 0.11.0): tokens regenerados sin drift y gate
visual a 0 px (manzanitas 18, glitch 32, graphic-line 73). El operador **aprobó los carruseles de ejemplo** («Los
carruseles de ejemplo están aprobados sí») y `pnpm test` completo y `pnpm build` pasaron sobre `814255694`. Es el **taller local**: no publica ni agenda, y la pieza sale para revisión humana; publicar lo
decide el operador. La ruta productiva (API + `artifact-worker` + MCP) es TASK-1921, `in-progress` en otra sesión: la
familia `manzanitas` se suma ahí después y **no la cites como disponible**. `pnpm brand:compose` y `pnpm glitch:compose`
no componen MCM.

#### El comando

```bash
pnpm manzanitas:compose -- --intent <pieza.json> [--out <dir>] [--only carousel,stills]

# probar con un ejemplo versionado
pnpm manzanitas:compose -- --intent src/lib/manzanitas-composition/examples/carrusel-recreo-engine.example.json
```

| Salida (por omisión en `.captures/manzanitas/<artifactId>/`, fuera de git) | Qué es |
|---|---|
| `carrusel/` | Sólo en el canal carrusel: el PNG y el PDF de cada lámina y el manifest resuelto |
| `<artifactId>-carrusel.pdf` | El documento del carrusel, con fechas internas fijas y verificado contra los límites de LinkedIn para documentos (100 MB, 300 páginas, un solo tamaño de página); si no los cumple, falla con `carousel-too-heavy` |
| `sueltas/` | El PNG de cada lámina, o de la pieza única de story, blog, YouTube o pódcast |
| `<artifactId>.provenance.json` | La procedencia (`manzanitas.piece-provenance.v1`): artifactId, canal, línea, hash del intent, versiones de AXIS, assets (hash de la fuente y del procesado) y salidas con su hash. Sin reloj: el mismo intent produce el mismo archivo |

`--only carousel` entrega sólo el documento; `--only stills`, sólo las sueltas.

#### El intent

- Es el del contrato `efeonce.manzanitas-register` **0.3.0** (`@efeoncepro/axis-ui-contracts` 0.3.29; acepta también
  0.1.x y 0.2.0): `register: "marketing-con-manzanitas"`, `channel` (`carousel`, `story`, `blog`, `youtube` o `podcast`),
  `topicLine` (la clave AXIS de la línea del tema, §2) y `slides[]`. Cada lámina declara su `piece` (un id de
  `manzanitasRegister.pieces`), su `voice` (`question`, `answer`), `swipe` y, según la pieza, `chart` (el dato con claves
  en inglés, más `source` e `illustrative`; §10.3), `denseText` o `photo` (`register: "cine"`, `lightId`, `subject`,
  `alt`). Schema y ejemplos del contrato, en AXIS: `docs/agent-composition/manzanitas-register-intent.schema.json` y
  `docs/examples/manzanitas/`.
- **Campo que agrega Greenhouse** (el contrato no lo declara): por lámina, `photo.path` (la foto real, relativa al
  archivo del intent; con `photo.alt` obligatorio).
- **Los rótulos del gráfico son del contrato desde la 0.3.0:** dentro de `chart`, `caption`, `figureLabel` y
  `rateHeader` (una cadena) y `columnLabels` y `keyLabels` (dos); si no tienen esa forma, `chart-labels-invalid`.
  `manzanitasChartSvg` los lee del dato y una opción explícita manda.
- **El texto de cierre** (`back-cover-a`, `story-close`) cabe en `closeCopy.maxChars`: pregunta 44, respuesta 10 y bajada
  56 caracteres (§7); si no, `close-copy-too-long`.
- `artifactId` es opcional; si falta, `MCM-<canal>-<línea>`.
- **Nunca eliges plantilla, coordenadas ni colores.** El contrato resuelve la pieza, la superficie, el «Desliza», la
  cabecera y la firma; el mapper `planManzanitasIntent` (`src/lib/manzanitas-composition/index.ts`) decide el
  `contentType`, y el selector del catálogo, la plantilla.
- **Texto denso** (`denseText`) con forma fija: el concepto lleva `paragraph` y 3 `points`; la comparación, 2
  `columns`, 4 `rows` y `closer`; el paso a paso, 4 `steps`. Cada punto o paso lleva `title` y `body`. El párrafo admite
  énfasis con `**así**`.

Forma mínima (recortada del ejemplo `carrusel-recreo-engine`; el ejemplo completo lleva siete láminas, y un carrusel
real pasa además por las reglas de Recreo del contrato). Los ejemplos de Greenhouse todavía declaran `"version": "0.2.0"`,
que el contrato 0.3.0 acepta; los de AXIS declaran 0.3.0:

```json
{
  "contract": "efeonce.manzanitas-register",
  "version": "0.2.0",
  "register": "marketing-con-manzanitas",
  "channel": "carousel",
  "topicLine": "engine",
  "artifactId": "MCM-mi-pieza-engine",
  "slides": [
    { "piece": "cover-pizarra", "voice": { "question": "¿Qué revisa una IA antes de recomendarte?", "answer": "5 cosas" }, "swipe": true },
    { "piece": "interior-escena", "voice": { "question": "¿Qué prueba lo que dices?", "answer": "Evidencia" }, "swipe": true,
      "photo": { "register": "cine", "lightId": "sesion-1", "subject": "Una persona revisa fichas de producto en su escritorio",
                 "alt": "Persona revisando fichas de producto con luz de tarde", "path": "fotos/escena-4x5.svg" } },
    { "piece": "chart-ranking", "voice": { "question": "¿Cuánto más nombran al líder?", "answer": "4 veces" }, "swipe": true,
      "chart": { "rows": [{ "label": "Líder de la categoría", "value": 46, "role": "leader" }, { "label": "Tu marca", "value": 12, "role": "you" }],
                 "source": "[FUENTE, AÑO]", "illustrative": true } },
    { "piece": "back-cover-a", "slogan": true, "conversions": 1,
      "voice": { "question": "¿Te nombra la IA?", "answer": "Pregúntale", "sub": "En los comentarios: cuéntanos si te nombró." } }
  ]
}
```

#### Ejemplos versionados

`src/lib/manzanitas-composition/examples/*.example.json`: seis intents con **fotos sintéticas** en SVG
(`examples/fotos/`), nunca una persona real; llevan `"example": true` y **nunca se publican**. Los prueba la suite del
mapper. Para una pieza real, parte de una copia en tu propio intent (fuera de `examples/`), con tus fotos reales, tu
dato con su fuente real y tu copy.

| Ejemplo | Canal | Línea | Piezas |
|---|---|---|---|
| `carrusel-recreo-engine` | carrusel | Engine | portada Pizarra, paso, Escena, ranking, Lente, medida, contraportada A |
| `carrusel-texto-denso-growth` | carrusel | Growth | portada Escena, concepto, comparación, Lente, dato en manzanas, partes, Escena, matriz 2 × 2, contraportada A |
| `carrusel-graficos-brand` | carrusel | Brand | portada Pizarra, antes y después, Escena, embudo, Lente, tendencia, paso a paso, contraportada A |
| `carrusel-voz-revenue-hubspot` | carrusel | Revenue (HubSpot) | portada Pizarra, de cada 100, Venn, Escena, paso, contraportada A |
| `story-escena` | story | Engine | story Escena |
| `podcast-portada` | pódcast | Voice | portada del pódcast |

#### Códigos de error

| Código | Cuándo | Qué haces |
|---|---|---|
| `intent-invalid` | El archivo no es JSON válido | Corrige el archivo |
| `contract-issues` | El contrato no resuelve el intent (lista sus códigos: `slogan-not-allowed`, `chart-source-required`, `pizarra-run-exceeded`, `photo-slides-adjacent`, `close-copy-too-long`, `chart-labels-invalid`…), falla una regla del catálogo (`manzanitas.catalog-membership`, `manzanitas.single-line`) o un gráfico no pasa sus chequeos | Corrige lo que dice cada código; nunca lo esquives cambiando de pieza |
| `photo-missing` | Una lámina con foto no trae `photo.path` o `photo.alt`, o el archivo no existe | Declara la foto real y su texto alternativo |
| `dense-text-invalid` | El texto denso no tiene su forma (arriba) | Completa la forma |
| `piece-not-approved` | La plantilla está en propuesta (validador `manzanitas.piece-approval`) | No se compone como canon hasta que el operador la apruebe |
| `carousel-too-heavy` | El PDF pasa los límites de LinkedIn para documentos | Revisa el peso de las fotos y el número de láminas |
| `SlideGeometryError` («no cabe en su lienzo … Acorta el copy») | Un texto no cabe en su lámina | **Acorta el copy.** El motor nunca recorta ni parte el texto |

#### Reglas que fallan cerradas (el motor mide; el render es el juez)

El texto nunca se recorta ni se parte: el motor mide el recorte con `measureSlideFit` (el detector con el que
`composeArtifact` falla cerrado) y cada slot de texto declara su máximo y rechaza el desborde. Las tres reglas propias
de este catálogo, probadas en `src/lib/artifact-composer/catalogs/manzanitas/__tests__/manzanitas-fit.test.ts`:

1. **La respuesta va en UNA línea:** la esfera nunca queda sola en la línea siguiente.
2. **Donde el «Desliza» comparte la línea de la respuesta** (portada Pizarra, paso, dato en manzanas, gráficos con voz,
   Lente), la respuesta le deja espacio: llega hasta la x del «Desliza» − la x de la voz − la mitad de su tamaño.
3. **Donde hay contenido fijo bajo la voz** (gráficos con voz, Lente, paso, las tres láminas de texto denso, pódcast),
   **la pregunta va en UNA línea**: una segunda línea empujaría la respuesta sobre la fuente, la firma o el contenido.

Del contrato, el único largo máximo es el del texto de cierre (`closeCopy.maxChars`): los slots de `BackCover` y
`StoryClose` usan esos límites (44/10/56) y `manzanitas-templates.test.ts` lo exige. Fuera de los cierres, que el
contrato acepte un copy no prueba que quepa: hasta `v0.3.29`, tres ejemplos de AXIS traían copy que Greenhouse rechaza
([lessons.md](lessons.md), 2026-09-29); en `v0.3.29` se corrigieron.

#### El eslogan de los cierres (regla del operador del 2026-09-29)

- Sólo en la contraportada A, la story de cierre y el cierre de YouTube (`slogan.only`), con las plantillas `BackCover`,
  `StoryClose` y `YoutubeClose`.
- Va **siempre debajo** del logo de Efeonce, en bloque, al **64 %** del ancho del logo (`sloganOfLogo`), separado 1,35
  veces su cuerpo (`sloganGapOfFont`). Cuerpo = ancho del logo × 0,64 ÷ `--mcm-slogan-em` (el ancho del eslogan en em de
  su línea). **Desde AXIS `v0.3.29` ese ancho sale del token**, `efeonceGraphicLine.slogan.widthEmByWord`, vía
  `sloganEmOf` (`scripts/manzanitas/manzanitas-tokens.ts`); la medición con fontkit sobre las fuentes del catálogo
  («Empower » en Poppins 800 itálica, «your » en 800 y la palabra en 900 itálica) queda como prueba de drift: miden lo
  mismo que AXIS.
- La palabra de la línea va en el acento **sólo si el cuerpo llega a 24 px** (`--mcm-accent-min-text-px`, de
  `manzanitasRegister.accent.contrast.largeTextMinPx`); si no, en la tinta de la superficie (blanco sobre navy). Lo
  decide un hook que mide después del layout (`slogan-hook.ts`), no la plantilla.

| Línea | `--mcm-slogan-em` | Cuerpo con el logo de 400 px (contraportada A, story de cierre) | Palabra | Logo para llegar a 24 px (cálculo) |
|---|---|---|---|---|
| Growth | 11,586 | 22,1 px | tinta | ≈ 435 px |
| Brand | 10,903 | 23,5 px | tinta | ≈ 409 px |
| Engine | 11,263 | 22,7 px | tinta | ≈ 422 px |
| Voice | 10,641 | 24,06 px | **acento** | ≈ 399 px |
| Revenue (HubSpot y Salesforce) | 12,278 | 20,9 px | tinta | ≈ 460 px |

- **Cierre de YouTube:** logo de 260 px, así que el eslogan queda entre 13,6 y 15,6 px y la palabra va en blanco. El
  canvas v39 tenía el eslogan **encima** del logo, a 64 px; ahora va debajo (la regla del 2026-09-29 es posterior).
- `manzanitasRegister.slogan.closeLockup.sloganPx` (24) quedó superado por la regla y **AXIS lo retiró en 0.3.29**:
  `closeLockup = { logoPx: 400, blockEndsY: 1253, byCanvas: { 'youtube-16x9': { logoPx: 260, align: 'center' } } }`.
- El manifiesto del contrato 0.3.0 trae el eslogan resuelto: `slogan.px`, `gapPx`, `widthEm`, `wordInAccent`, `wordColor`
  (el acento o la tinta) y `position: 'below-logo'`. Una prueba de render (`manzanitas-fit.test.ts`) compara el cuerpo
  que pinta la plantilla con ese `slogan.px` (diferencia menor a 0,05 px).
- Con el logo de 400 px, sólo Voice lleva la palabra en el acento: es la consecuencia visible de la regla y **se le
  presenta al operador**. No agrandes el logo ni fijes el cuerpo por tu cuenta.

#### Gráficos, Lente y órbita del paso

- **Gráficos:** el dato viaja en el slot `chart` y lo pinta el painter que inyecta quien compone
  (`scripts/manzanitas/painters.ts`: `manzanitasChartSvg` + `runManzanitasChartChecks`); el catálogo no importa
  paquetes (frontera del motor). Sin painter, o con un chequeo en rojo, la lámina falla cerrada. Los siete gráficos con
  voz usan `ChartVoice`; la medida y la tendencia, `ChartQuestion` (sólo la pregunta: la esfera es el dato). El dato pasa
  por el contrato (`chart-data-invalid`, `chart-source-required`…): en el Composer no cae a la muestra como en el canvas
  (§8.4).
- **Lente:** `materializeManzanitasAssets` (`src/lib/manzanitas-composition/materialize.ts`) lleva la foto al tamaño
  exacto del lienzo y la incrusta en la Lente de La órbita (`lensRecipe('post')`).
- **Órbita del paso:** `orbitSvg` sobre el círculo medido en el canvas v39, que desde `v0.3.29` sale del token:
  `manzanitasRegister.pieces['step-pizarra'].orbit = { cx: 640, cy: 500, r: 324 }` (`MANZANITAS_STEP_ORBIT`).

#### Tokens, assets y fuentes compilados

- `pnpm manzanitas:tokens [--check]` (`scripts/manzanitas/compile-tokens.ts`) escribe 49 salidas en
  `src/lib/artifact-composer/catalogs/manzanitas/`: `manzanitas-tokens.css` (custom properties `--mcm-*` y clases
  `.mcm-line-<línea>`), `manzanitas-tokens.json` (snapshot para las pruebas) y 47 assets. `--check` no escribe y sale 1
  si AXIS publicó y nadie recompiló: tras subir un pin de AXIS, recompila y verifica.
- **Assets:** los wordmarks de MCM y los logos de Efeonce son copias byte a byte de `@efeoncepro/axis-brand-assets`. El
  logo con manzana y la manzana grande salen **precoloreados por línea** (sólo se pinta el grupo
  `[data-axis-accent="topic-line"]`), porque un `<img>` no hereda el acento de la página. La mano «Desliza» sale por
  línea desde `iconSvg`, con la voz de su línea (reposo sobre papel y navy; respuesta sobre navy).
- **Fuentes:** extensión `manzanitas` del brand pack `axis` (Bricolage variable 200–800; Poppins 400 y 500; la base
  aporta Poppins 300 y 600–900 con itálicas). `pnpm composer:brand-pack` las sincroniza.

#### Gate visual y pruebas

- `pnpm composer:visual-gate --catalog=manzanitas`: 18 frames (el probe de cada plantilla, con una foto sintética,
  nunca una real), congelados en la sección `2026-09-29 (r)` de
  `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`. Tiene que quedar a 0 px (con AXIS `v0.3.29` sigue
  a 0 px, igual que glitch, 32, y graphic-line, 73).
- Pruebas: 22 del catálogo (`manzanitas-catalogs`, `manzanitas-templates`, `manzanitas-fit`; cuatro renderizan; desde `2c95e60b2`, una exige los límites de `closeCopy` en los slots de cierre y la de render compara el eslogan con el `slogan.px` del contrato), 12 del
  mapper (`plan.test.ts`, incluye los ejemplos) y 10 de tokens, painter y errores (`scripts/manzanitas/__tests__/`).
  Además, en verde: `pnpm composer:color-ledger`, `pnpm composer:brand-pack --check` y `pnpm manzanitas:tokens --check`.

#### Añadir o cambiar una plantilla

En este orden; ningún paso se salta:

1. **AXIS primero**, si cambia un valor o una pieza (token `manzanitasRegister` o contrato). Publicar en AXIS requiere la
   autorización del operador; luego se sube el pin en Greenhouse. Una pieza nueva compone sólo si el token la declara
   aprobada: el registry copia su `approval` y un test de drift lo compara.
2. **Tokens:** `pnpm manzanitas:tokens` y `--check`; si cambian las fuentes, `pnpm composer:brand-pack`.
3. **Plantilla** `.html` en `src/lib/artifact-composer/catalogs/manzanitas/`: los valores sólo desde `--mcm-*`,
   `.mcm-line-<línea>` y `manzanitas.css`. Ningún HEX, `rgb()`, familia literal, animación ni elemento de Glitch (lo
   prueba `manzanitas-templates.test.ts`).
4. **Slots** `<plantilla>.slots.json`: cada slot de texto declara su máximo y rechaza el desborde; los `example` de los
   slots alimentan el probe del gate.
5. **Registry** `registry.json`: `contentTypes`, `catalogs` (`carousel`, `stills` o los dos), `pieces` y `approval`, más
   su entrada en `selector.map`. Una pieza nueva suma su `contentType` y sus campos de tema en el mapper
   (`CONTENT_TYPE` y `THEME_FIELDS` en `src/lib/manzanitas-composition/index.ts`); un cierre nuevo con eslogan, su
   nombre en `MANZANITAS_SLOGAN_TEMPLATES`.
6. **Pruebas:** las del catálogo y del mapper; si la plantilla tiene una regla de una línea o el eslogan, su caso en
   `manzanitas-fit.test.ts`.
7. **Gate:** declara cada frame que cambia en una **sección nueva, sin sellar**, de `BASELINE_DELTAS.md` (qué frame, qué
   cambió, por qué y quién lo aprobó) **antes** de `pnpm composer:visual-gate --catalog=manzanitas --freeze`, y vuelve
   a correr el gate a 0 px. **Nunca edites el baseline a mano** ni te apoyes en una sección sellada: `--freeze` se niega
   a promover lo que no está declarado.
8. **Docs:** fila en [ledger.md](ledger.md), esta referencia y, si cambia una decisión, el ADR con su delta.

Cambiar el **contenido** de una pieza (foto, copy, dato) no es cambiar una plantilla: se edita el intent propio y se
vuelve a componer.

### 10.2 Una pieza nueva, paso a paso

1. **Tema → línea** (§2). Si no está decidida para ese tema, pregunta.
2. **Plan del carrusel** con Recreo (§4.4): portada (Pizarra o Escena), interiores, el dato con fuente y el cierre en
   Pizarra, contraportada A (§7).
3. **Por lámina**, elige la pieza que responde su pregunta (§8.2); carga el dato real y su fuente real; reescribe las
   respuestas en palabras para que digan lo que el dato dice.
4. **Fotos** (Escena, Lente): registro cine, lecho nativo, reserva de la voz y el rincón de «Desliza» en calma; en la
   Lente, cara u objeto dentro del círculo y nadie mirando al lente. Dirección y generación con `design-studio` y
   `.claude/rules/brand-photography.md`.
5. **Escribe el intent** (§10.1) y compón con `pnpm manzanitas:compose -- --intent <pieza.json>`. Si falla, corrige lo
   que dice el código; si un texto no cabe, acórtalo.
6. **Revisa los PNG y el PDF** de `.captures/manzanitas/<artifactId>/`, a tamaño real y a 390 px, y pasa el QA (§12).
   La superficie (papel o navy) la resuelve el contrato por pieza: no se cambia a mano.
7. Aprobar la línea no autoriza publicar una pieza: la publicación la decide el operador.

### 10.3 En AXIS (publicado el 2026-09-28; decisiones del 2026-09-29 en `v0.3.28` y `v0.3.29`)

Se ejecutó por [TASK-1936](../../../../docs/tasks/complete/TASK-1936-manzanitas-register-axis-token-contract-charts-lab.md)
con autorización explícita del operador; `main` de AXIS en `06cb62d`, tag `v0.3.26`. Las siete primeras decisiones del
2026-09-29 salieron con el tag `v0.3.28` (commit `2bfe206` en `main`); las tres últimas y los hallazgos de TASK-1939, con
el tag `v0.3.29` (`main` en `f722a6f`, workflow «Release UI packages v0.3.29» y CI de `main` en verde; el operador lo
autorizó: «Te autorizo a publicar el patch de axis que indicas»). ADR de AXIS:
`docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`; guía para agentes: `docs/agent-composition/manzanitas.md`.

| Qué | Dónde | Cómo se usa |
|---|---|---|
| Valores | `manzanitasRegister` (`@efeoncepro/axis-tokens` 0.3.29; top-level, fuera de `axisTokens`) | lo heredado de La órbita es **referencia** a `efeonceGraphicLine` (prueba de identidad); nunca apunta a `glitchLine`. Grupos: `accent`, `surfaces`, `type`, `masthead`, `formats`, `recreo`, `swipe`, `signature`, `slogan`, `backCover`, `voice`, `charts`, `denseText`, `canvases`, `pieces`, `pendingDecisions` (vacío desde 0.3.29), `resolvedDecisions` (desde 0.3.28; diez desde 0.3.29) y, desde 0.3.29, `closeCopy` y `teamPeople`. El ancho del eslogan por línea vive en La órbita: `efeonceGraphicLine.slogan.widthEmByWord` |
| Reglas | contrato `efeonce.manzanitas-register` **0.3.0** `stable` desde `v0.3.37` (`@efeoncepro/axis-ui-contracts` 0.3.37; acepta intents 0.1.x y 0.2.0) | `resolveManzanitasRegisterIntent(intent)` con el carrusel entero (`register`, `channel`, `topicLine`, `slides[]`; empieza con su portada y termina con su contraportada, nunca con una Lente); falla cerrado (47 códigos es-CL en 0.3.0; 45 hasta la 0.2.0) y devuelve `pending-decision` si la regla depende de una pendiente. En AXIS: `pnpm manzanitas:resolve -- --input <intent.json> --out <manifest.json>` (manifest `axis.manzanitas-register-composition.v1`); schema `docs/agent-composition/manzanitas-register-intent.schema.json`; ejemplos en `docs/examples/manzanitas/` (11 válidos y 7 inválidos en `main`) |
| Gráficos | `@efeoncepro/axis-graphic-line/charts` (0.11.0; **no** se exporta desde la raíz) | `manzanitasChartSvg(receta, dato, { line, caption? })` (desde 0.11.0 lee los rótulos del dato; una opción explícita manda) → `{ svg, manifest }` (`axis.manzanitas-chart.v1`); una función por receta (`rankingChartSvg`…); `runManzanitasChartChecks(resultado)` debe quedar sin fallas. Datos con claves en inglés: `rows` (`role: 'leader' \| 'you'`), `parts` (`tone`), `tasks`, `stages`, `value`, `series`, `labels`, más `source` e `illustrative` |
| Archivos | `AXIS_MANZANITAS_ASSETS` (`@efeoncepro/axis-brand-assets` 0.4.1) | `manzanitas-logo-{positive,negative}`, `manzanitas-wordmark-{positive,negative}`, `manzanitas-apple`; la manzana y los puntos en `[data-axis-accent="topic-line"]` (`AXIS_MANZANITAS_ACCENT_SELECTOR`); trazos idénticos a los SVG oficiales |
| Referencia | https://axis.efeonce.org/references/manzanitas/ + `.json` | selector de línea en vivo y editor del dato de los gráficos |

Decisiones de la ejecución: la paridad con el canvas es **geométrica** (largos, posiciones, esfera, destacado), no de
píxeles; en el Embudo, con empate, se destaca el primer paso; el Ranking dice «1 vez» cuando tu marca lidera. El
2026-09-29 las diez pendientes pasaron a `resolvedDecisions` (§13): siete en 0.3.28 y tres en 0.3.29;
`pendingDecisions` queda vacío.

**Hallazgos de TASK-1939: cerrados en `v0.3.29`** (el ADR de AXIS los registra en su delta (d) de
`MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`; la iconografía, en el delta 2026-09-29 de `ICONOGRAPHY_DECISION_V1.md`):

1. **Ejemplos corregidos:** «Todavía no» → «Aún no», «Quién responde» → «Quién cita» y la pregunta de «De cada 100» sin
   «leads»; todos declaran 0.3.0.
2. **Eslogan:** `efeonceGraphicLine.slogan.widthEmByWord` publica el ancho por línea; `slogan.closeLockup.sloganPx` se
   retiró (`closeLockup = { logoPx: 400, blockEndsY: 1253, byCanvas: { 'youtube-16x9': { logoPx: 260, align: 'center' } } }`);
   el manifiesto del contrato trae `slogan.px`, `gapPx`, `widthEm`, `wordInAccent`, `wordColor` y
   `position: 'below-logo'`; `backCover.phone390` ya no tiene cuerpo fijo de eslogan.
3. **Rótulos del gráfico en el contrato** (`caption`, `figureLabel`, `columnLabels`, `keyLabels`, `rateHeader`;
   `chart-labels-invalid`).
4. **La órbita del paso en el token:** `pieces['step-pizarra'].orbit = { cx: 640, cy: 500, r: 324 }`.
5. **Largos máximos:** el contrato normaliza el texto de cierre (`closeCopy`); las reglas de una línea de las demás
   piezas siguen en las plantillas de Greenhouse.
6. **Lab:** la contraportada A recompuesta con el eslogan nuevo (desde el Composer de Greenhouse), la sección «Decisiones
   del operador» sin abiertas, el JSON con `closeCopy`, `teamPeople` y la regla del eslogan, y la iconografía con 88
   glifos.

**Todavía no:** la ruta productiva (TASK-1921) y que esta skill consuma el paquete en vez de copiar valores. Nunca cites
esos pasos como disponibles.

### 10.4 En el canvas de la línea (referencia de diseño)

El canvas «Marketing con Manzanitas · Línea v1» (https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG, v39) es la
referencia de diseño aprobada: ahí se exploran piezas nuevas antes de llevarlas a AXIS y al Composer, montando los
componentes del DS «Efeonce — La órbita» (https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc): `EfeonceOrbit.Voice`,
`EfeonceOrbit.Measure`, `EfeonceOrbit.Lens` y `EfeonceOrbit.Slogan`. **Una pieza para publicar se compone con el
Composer (§10.1), no en el canvas.** Donde el canvas y una regla posterior difieren (el eslogan de los cierres, §6),
manda la regla.

- **Tableros canónicos:** `Grafico-1…9`, `Texto-1…3`, `Graficos-resumen` («Gráficos · cómo funcionan»),
  `Graficos-lineas` («Gráficos · acentos por línea»), `Formatos`, `Cierre-acciones`, `CW-*` (Creative Workflows, en
  Brand), `Escena-*`, `Lente-interior`, `Story-cierre`, `Podcast-1x1`, `YouTube-cierre`. Los `Antes-*` y `Prueba-*`
  quedan como historia: nunca partas de ellos.
- **Props de cada lámina:** `line` (selector «Línea del tema»: `growth`, `brand`, `engine`, `voice`, `revenue`) y el
  dato en la sección «Dato (de muestra)»: `valor` (medida, de cada 100) o `datos` (el resto). La lógica devuelve el
  acento claro y oscuro, la clave AXIS, la palabra del eslogan y la voz del ícono.
- **La voz se monta así:** `<x-import component-from-global-scope="EfeonceOrbit.Voice" question="…" answer="…"
  line="<clave AXIS>" surface="light|dark" answer-size="150">` (130 en texto denso).
- **El logo de MCM** se pinta en línea con sus 25 trazos: los cuatro últimos en el acento de la línea, el resto en la
  tinta del logo (§3).

## 11. NUNCA

- Elementos de Glitch en una pieza de MCM (manzana llena, verde `#6ec207`, bytes, Guttery, «EDICIÓN #N»), ni elementos
  de MCM en Glitch o en una pieza de Efeonce.
- La manzana en un color fijo, en el acento de otra línea o recortada hasta no leerse.
- El acento como superficie (a sangre) o en texto de menos de 24 px.
- Dos esferas en una pieza: la voz con su esfera en la medida o la tendencia; la mano en respuesta fuera de la
  excepción registrada (`cover-pizarra-swipe-response`, §5).
- Una dona de partes, un círculo suelto en un gráfico, una barra dibujada a mano, una cifra sin fuente.
- Un dato de muestra publicado como real.
- El eslogan en la portada, el blog, la miniatura o el pódcast; el eslogan separado del logo, encima de él o a un cuerpo
  fijo; la palabra en el acento con el eslogan bajo 24 px.
- La burbuja URL sobre la mesa de la estratega.
- Botones o íconos sociales simulados en la contraportada; pedir las cuatro acciones a la vez.
- «Desliza» en la última lámina, en la story, junto a la voz de arriba, en la fila de la firma o sobre el sujeto.
- Dos láminas con foto seguidas; más de tres Pizarras seguidas; el dato con fuente o el cierre fuera de Pizarra.
- La Lente en la portada o combinada con otra órbita o con el foco.
- Un lecho agregado (estudio vacío, cabezas del público, dorso de un portátil, «consola», piso que corta las piernas).
- Una persona del equipo que no esté en el roster del equipo actual, la foto de alguien que ya no está (María
  Fernanda), otra ropa que la de su fila, una cara injertada o una persona nueva en el equipo sin su ronda de identidad aprobada (§4.2).
- Un texto de cierre fijo, repetido de pieza en pieza, o más largo que `closeCopy.maxChars` (§7).
- Íconos sociales en la contraportada porque `republicar` y `enviar` ya existen en el catálogo (§7).
- Elegir a mano la plantilla, las coordenadas o los colores de una lámina del Composer; editar un ejemplo versionado,
  una plantilla o una salida para cambiar el contenido de una pieza (se edita el intent propio y se vuelve a componer).
- Recortar o partir un texto para que quepa, o pedir una excepción al motor: si no cabe, se acorta el copy (§10.1).
- Editar a mano el baseline del gate visual, o promoverlo sin una sección nueva y sin sellar en `BASELINE_DELTAS.md`.
- Publicar un ejemplo versionado (sus fotos son sintéticas) o citar la ruta productiva (TASK-1921) como disponible.
- Copiar a mano un valor heredado de La órbita (acento, superficie, geometría de la órbita): se lee del token o de
  `measureSvg`.

## 12. QA antes de entregar (además de [qa-checklist.md](qa-checklist.md))

- [ ] Es una pieza de MCM (§0) y la línea del tema está decidida (§2).
- [ ] Un solo selector: la manzana, los puntos, el gráfico, la palabra del eslogan y la voz de «Desliza» están en la
      misma línea.
- [ ] Una esfera en la pieza (cuenta la de la voz antes de poner otra) y una órbita.
- [ ] La manzana se lee completa; la cabecera va sin manzana en la portada Pizarra y en la contraportada.
- [ ] Recreo: sin dos fotos seguidas, sin más de tres Pizarras seguidas, dato con fuente y cierre en Pizarra, todas
      las fotos con el mismo registro y luz.
- [ ] Gráficos: las cifras en pantalla son **tus** datos (no la muestra, §8.4); las barras salen del número; la línea de
      fuente dice la fuente real o «Ejemplo ilustrativo»; las respuestas en palabras siguen diciendo lo que el dato
      dice; en la tendencia, la serie va de enero a diciembre.
- [ ] Acento ≥ 3:1 contra su fondo y ningún texto en acento bajo 24 px, medido sobre los píxeles finales.
- [ ] «Desliza» en su sitio fijo (y 1033 portada, y 985 interiores), en reposo, con la voz de la línea; ausente en la
      última lámina y en la story.
- [ ] Firma en y 1202 en todo el carrusel; el eslogan sólo en los cierres, **debajo** del logo y al 64 % de su ancho,
      con la palabra en el acento sólo si el eslogan llega a 24 px (con el logo de 400 px, sólo Voice).
- [ ] Contraportada: una sola conversión, bajada «En los comentarios: …», manzana 3,8× sin astilla del tallo, nada que
      simule un botón.
- [ ] Texto de cierre (contraportada A y story de cierre): propio de la pieza, no fijo; pregunta ≤ 44, respuesta ≤ 10 y
      bajada ≤ 56 caracteres; la story de cierre lleva su voz.
- [ ] Personas del equipo, si las hay: están en el roster, con la prenda de la línea (hoodie en `brand`; bomber o
      softshell en las líneas de negocio), `linea` e identidad declaradas en la ficha y la hoja de contacto aprobada por
      el operador.
- [ ] Escena: lecho nativo, firma dentro de su materia con aire, rincón de «Desliza» libre; Lente sólo en interiores.
- [ ] Compuesta con `pnpm manzanitas:compose` sin errores (§10.1) y revisada en sus PNG y su PDF, a tamaño real y a
      390 px. Si una lámina se explora en el canvas, en papel y en navy, con la lógica `renderVals()` corriendo.
- [ ] Ninguna foto sintética ni ningún ejemplo versionado en una pieza para publicar; la procedencia
      (`<artifactId>.provenance.json`) acompaña la entrega.

## 13. Pendientes del operador (no los decidas por tu cuenta)

**Estado al 2026-09-29, tarde: no queda ninguna abierta** (`manzanitasRegister.pendingDecisions: []`). El operador
decidió las diez en dos rondas: siete publicadas en `v0.3.28` (contrato 0.2.0) y las tres últimas en `v0.3.29`
(contrato 0.3.0). Todas viven en `resolvedDecisions`. La numeración se conserva porque otros documentos la citan. Si
surge una pregunta nueva, llévasela al operador: no la decidas en una pieza.

**Decididas el 2026-09-29** (ya no las preguntes; dónde viven en el token):

- **1.** La voz de «Desliza» en la línea Voice: **Trazo** (`swipe.lineOverrides.voice`; en La órbita, Voice sigue sin
  voz).
- **2.** Los gráficos, la lámina de dato y el texto denso **no suman** a «nunca más de tres Pizarras seguidas» **ni
  cortan** la racha (`recreo.pizarraRun`).
- **3.** La portada Pizarra con la mano en respuesta es una **excepción registrada** (`cover-pizarra-swipe-response`).
- **4.** La zona segura de la story es **el 87 % de AXIS** (`canvases['story-9x16'].safeArea`); la firma sube a y 1619.
- **8.** Las recetas de gráficos siguen **sólo para MCM**; llevarlas a La órbita es otra decisión.
- **9.** El navy `#022a4e` del texto del logo es **tinta compartida de la familia Manzanitas**
  (`glitchLine.scope.sharedWithEditorialFamily`).
- **10.** Un tema de **Salesforce** lleva `revenue-salesforce`; uno de HubSpot o genérico, `revenue-hubspot`
  (`topicLine.revenueByPlatform`).
- **5.** El texto de cierre **cambia con el contexto y nunca queda fijo**; se normaliza su extensión
  (`closeCopy.maxChars`: pregunta 44, respuesta 10, bajada 56; contraportada A y story de cierre; decisión
  `story-close-copy`). El «Guárdala» provisional quedó retirado (§7).
- **6.** Las fotos cine de MCM pueden mostrar a **personas reales del equipo actual**, sólo desde el roster que mantiene
  Greenhouse (`teamPeople`; decisión `cine-team-people-social`; §4.2).
- **7.** Los Trazo **`republicar`** y **`enviar`** entran al catálogo (`axis-graphic-line` 0.11.0; 39 Trazo + 49
  Plastilina = 88; decisión `stroke-republicar-enviar`; [iconography.md](iconography.md) §13).

**Por presentar o aprobar (no son decisiones del token):** la consecuencia del eslogan en los cierres (con el logo de 400 px, sólo Voice lleva la palabra en
el acento; §10.1). Los carruseles de ejemplo del Composer y las identidades del equipo quedaron aprobados el
2026-09-29 (TASK-1939 cerrada; §4.2).

## 14. Lecciones de esta sesión (no las repitas)

- **La manzana completa y legible.** Un recorte de sólo hoja + tallo se leyó como «orejas de conejo». Puede sangrar un
  borde, pero los dos lóbulos, la hendidura, la hoja y el tallo tienen que leerse.
- **El acento nunca es superficie.** La contraportada C (acento a sangre) se rechazó por saturación y porque el logo
  positivo de Efeonce trae su isotipo azul, que choca sobre un campo de color.
- **La burbuja URL no pasa sobre la mesa de la estratega** (1 % peor 3,80:1). Mide sobre los píxeles de la foto real,
  no sobre la paleta; si no pasa, firma el logo.
- **Un renderizador local que no ejecuta `renderVals()` no sirve para gráficos calculados:** pinta la plantilla sin
  largos, posiciones ni respuestas. Sólo vale uno que ejecute la lógica de la lámina (el de la sesión, v2, lo hacía);
  si no, revisa en el canvas.
- **Cuenta la esfera de la voz antes de poner otra.** La medida y la tendencia no llevan la voz porque su esfera ya es
  el dato; la mano en respuesta de la portada suma una segunda, y por eso es una excepción registrada, sólo en
  `cover-pizarra-swipe-response` (§5).
- **La firma se unifica en la altura del sistema, no al revés:** bajar las Pizarras a y 1237 no unificaba, porque la
  Lente del sistema firma en y 1202 y no se mueve desde el tablero.
- **La contraportada es la de un post social, no una hoja de documento:** una conversión, conversacional, sin botones
  falsos.
- **Tres partes en un anillo son un arco que se llena:** por eso no hay dona de partes.
- **El dato inválido cae a la muestra sin avisar** y **los meses de la tendencia son fijos**: verifica las cifras en
  pantalla contra tu fuente (§8.4).
- **Los SVG oficiales usan `<style>`:** inlinea los fills antes de subir; y los cuatro últimos trazos del logo son los
  que toman el acento.
- **(2026-09-29) El contrato no es el juez del copy; el render sí.** Tres ejemplos de AXIS («Todavía no», «Quién
  responde», «¿Cuántos leads llegan ya informados?») resuelven con el contrato y no caben en la geometría aprobada. Si
  el motor dice que no cabe, se acorta el copy ([lessons.md](lessons.md), 2026-09-29).
- **(2026-09-29) Un `<img>` no hereda el acento:** por eso el logo con manzana y la manzana grande se compilan
  precoloreados por línea (§10.1).

## 15. Fuentes

- Canvas de la línea: «Marketing con Manzanitas · Línea v1», https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG
  (versión 39, aprobada 2026-09-28).
- DS «Efeonce — La órbita»: https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc (`EfeonceOrbit.Voice`, `Measure`,
  `Lens`, `Slogan`).
- [ledger.md](ledger.md), filas del 2026-09-28 (Manzanitas: cine y lecho; firma, cabecera, canales y eslogan;
  contraportada social; contraportada A; acentos por línea, gráficos y texto denso) y del 2026-09-29 (el eslogan como
  elemento gráfico; las siete decisiones de MCM y su catálogo del Artifact Composer; las tres últimas decisiones y AXIS
  `v0.3.29`), y sus pendientes.
- [criteria.md](criteria.md) §3.4 (estela; la lámina de gráficos), §5 (eslogan en bloque; acento a sangre) y §8
  (Manzanitas toma el acento de la línea del tema).
- [iconography.md](iconography.md) §13 (D28 `swipe`, D29 `mano`; `republicar` y `enviar`, 2026-09-29).
- [package-and-tokens.md](package-and-tokens.md) §2.2 (`efeonceGraphicLine.lines`) e `icons.voiceByLine`.
- Biblioteca de recursos de MCM:
  [`MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md`](../../../../docs/operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md).
- Canon social de la contraportada (una conversión, ningún botón falso):
  [`2026-07-28-carousel-storytelling-platform-research.md`](../../../../docs/audits/social/2026-07-28-carousel-storytelling-platform-research.md).
- Registro cine: [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md);
  método del isotipo de Nexa: `.claude/rules/brand-photography.md`. Equipo en las fotos:
  [`EFEONCE_TEAM_ROSTER_V1.md`](../../../../docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md), `PERSONAS` de
  `scripts/foto/build-prompt.mjs` y los bloques IDENTITY del canon §3.6
  ([`EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md)).
- Sub-línea hermana (no se mezcla): [glitch.md](glitch.md).
- ADR del registro, [Delta 2026-09-29](../../../../docs/architecture/MANZANITAS_REGISTER_DECISION_V1.md#delta-2026-09-29--decisiones-del-operador-y-catálogo-del-artifact-composer)
  (decisiones del operador y catálogo del Artifact Composer).
- TASK-1939: [`TASK-1939-manzanitas-artifact-composer-catalog.md`](../../../../docs/tasks/in-progress/TASK-1939-manzanitas-artifact-composer-catalog.md).
- Código del Composer: `scripts/manzanitas/` (`compose.ts`, `compile-tokens.ts`, `painters.ts`, `errors.ts`),
  `src/lib/artifact-composer/catalogs/manzanitas/` (plantillas, `registry.json`, validadores y hooks) y
  `src/lib/manzanitas-composition/` (mapper, `materialize.ts`, ejemplos).
- Manual de uso: [`componer-piezas-de-marketing-con-manzanitas.md`](../../../../docs/manual-de-uso/creative/componer-piezas-de-marketing-con-manzanitas.md).
- AXIS `v0.3.28` (commit `2bfe206`): `manzanitasRegister.resolvedDecisions` y contrato `efeonce.manzanitas-register` 0.2.0.
- AXIS `v0.3.29` (`main` `f722a6f`): `pendingDecisions: []`, `closeCopy`, `teamPeople`, `slogan.widthEmByWord`, la órbita
  del paso, contrato 0.3.0 y los Trazo `republicar` y `enviar` (`axis-graphic-line` 0.11.0). ADR del registro,
  [Delta 2026-09-29 (b)](../../../../docs/architecture/MANZANITAS_REGISTER_DECISION_V1.md#delta-2026-09-29-b--sin-decisiones-abiertas-axis-v0329-y-el-equipo-real-en-la-fotografía).
