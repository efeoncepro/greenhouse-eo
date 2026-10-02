# Componer una pieza por superficie con AXIS — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.4
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-28 por Claude (1.4: las 69 láminas del deck salen por la Ruta A (TASK-1928), la portada de brochure con la selección de Nexa (`document-selection`, AXIS 0.3.21), versiones de AXIS al día, cuándo escribir el `layout` y estado de la ruta productiva (TASK-1921, en curso). Antes, 1.3: cómo cambiar la foto, el copy o la sección de una lámina, con sus problemas comunes, y estado de cierre de TASK-1927. Antes, 1.2: portadas y contraportadas, brochure o propuesta completos con el comando de documento, códigos de documento y problemas nuevos, TASK-1927. Antes, 1.1: las recetas aprobadas se componen enteras con `pnpm brand:compose` en el Artifact Composer, TASK-1919)
> **Modulo:** Creative · marca propia de Efeonce (línea gráfica «La órbita»)
> **Ruta en portal:** no aplica — se compone con comandos locales en AXIS y en Greenhouse
> **Documentacion relacionada:** [Composición de decks y brochures (funcional)](../../documentation/creative/composicion-de-decks-y-brochures.md) · [Componer un deck con las recetas por lámina](./componer-deck-con-recetas.md) · [Norma de composición por superficie](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) · [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md#componer-por-superficie) · [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md) · [Compositor de piezas con CTA](./compositor-piezas-cta.md) · [Producir una foto de marca](../marketing/fotografia-de-marca-efeonce.md)

## Para qué sirve

Este manual explica cómo producir una pieza de la marca Efeonce **según dónde va a vivir**: un hero de sitio, un
letrero de vía pública (DOOH), una pantalla digital en la calle (pDOOH), una gráfica animada con foto, un video o una
lámina de deck. Cada superficie tiene sus recetas aprobadas, sus reservas, su escala de voces, su forma de firmar y
sus tiempos. Tú (o un agente) describes la pieza; AXIS devuelve un manifest con todo resuelto desde los tokens, y las
herramientas de Greenhouse la pintan, la firman y la miden. Si la receta está **aprobada y tiene plantilla**, un solo
comando de Greenhouse (`pnpm brand:compose`) hace todo el recorrido y entrega la pieza terminada (Ruta A); si no, se
compone por delegates (Ruta B). El mismo comando compone una **portada**, una **contraportada** o un **documento
completo** (un brochure o una propuesta en un solo PDF).

Sirve para el equipo creativo y para los agentes (Claude, Codex). No sirve para piezas de clientes ni para la
interfaz de Greenhouse.

## Antes de empezar

- **Abre la página de la superficie en el canvas del equipo:**
  [La órbita — superficies](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7) («DOOH · pDOOH»,
  «Web», «Motion», «Producción audiovisual», «Deck», «Firma y 1:1»). Empieza por la lámina guía de la izquierda
  de la página («Guía · cómo componer …»): resume la superficie en una lámina. Después parte de una pieza
  **aprobada**; las opciones no son canon.
- **Lee la sección de tu superficie** en la
  [norma](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#4-por-superficie).
- **Para la Ruta A basta Greenhouse:** el contrato `efeonce.surface-composition` 0.1.2 (`candidate`; un intent 0.1.0 o
  0.1.1 resuelve igual) viene en los paquetes AXIS que Greenhouse ya fija (`axis-ui-contracts` 0.3.19, `axis-tokens`
  0.3.21, AXIS `v0.3.21`). Corre `pnpm install` si acabas de traer cambios. **Para la Ruta B** necesitas además el repo de AXIS en
  `../axis-design-system` al día con `main` (ahí vive `pnpm surface:resolve`).
- **Carga las skills:** `efeonce-graphic-line` siempre; `deck-studio` para láminas; `motion-design-studio` para
  motion y video; `efeonce-advertising-creative` para DOOH, pDOOH y piezas con texto o CTA; `design-studio` para la
  foto.
- **Si vas a componer una portada de propuesta,** ten el logo del cliente en SVG o PNG y el nombre con el que lo vas a
  describir.
- **Si la pieza lleva foto,** prepara la ficha con `pnpm foto:prompt` y ten a mano el
  [lenguaje fotográfico](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md).
- **Si la pieza lleva una cifra,** ten la fuente a mano. Sin fuente, no hay cifra. Los precios van siempre como
  ejemplo.

## Paso a paso

### Paso 1 · Declara la superficie y el papel

Decide en una línea: superficie (`web`, `dooh`, `pdooh`, `motion`, `audiovisual` o `deck`), formato, papel de la pieza
en esa superficie (por ejemplo, `proposal` en un deck) y receta. Si la receta no está aprobada en la norma, dilo en
la entrega: es una opción.

Social, 1:1 y la firma de redes **no** son superficies de este contrato: siguen en el contrato de la órbita (canal
`social`). Para eso usa [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md).

### Paso 2 · Escribe el intent

Copia el ejemplo más cercano de `docs/examples/surfaces/<superficie>-<receta>-intent.json` en AXIS a la carpeta de
trabajo de la pieza y edítalo. Campos que suelen aplicar:

| Campo | Qué pones |
|---|---|
| `surface`, `format`, `role`, `recipe` | lo decidido en el paso 1 |
| `line`, `theme` | la línea de servicio (decide el acento y la voz de los íconos) y el fondo (`dark` por defecto) |
| `voice` | eyebrow, pregunta y respuesta de 1 a 3 palabras |
| `body`, `proof` | la bajada y la prueba **con su fuente** |
| `steps` | hasta cuatro pasos, cada uno con glifo, rótulo y nombre |
| `photo` | registro (`documental`, `puesta-en-escena`, `respuesta` o `cine`) y la placa |
| `selection` | qué toma la selección y el colaborador; `selection.anchor` elige la esquina del colaborador |
| `use` | para qué documento es la lámina: `proposal` o `brochure`. Si lo omites, AXIS toma el de la receta |
| `layout` | la composición de la receta (por ejemplo `service`, `hero` o `lines` en `proposal-cinematic`). No se deduce del contenido: **cópialo del ejemplo**. Si el ejemplo no lo trae, la receta tiene una sola composición o usa la de por defecto (`section-split` → `corner-top`, `section-cine` → `team`) |
| `column.topPx` | sólo en portadas con columna de voz: a qué altura empieza la columna (paso 3, «Portada o contraportada») |
| `clientLogo` | sólo en portadas de propuesta: el archivo del logo del cliente y su texto alternativo |
| `timeline`, `variants` | duración y cierre (motion, pDOOH, video); variantes por franja (pDOOH) |

**No pongas coordenadas ni tamaños.** Si sientes que te falta un número, es porque falta en el token: pídelo. La única
medida que el intent admite es `column.topPx`, y sólo dentro del rango que fija el token.

### Paso 3 · Ruta A — compón la pieza aprobada con el Artifact Composer

Úsala cuando la receta está aprobada y tiene plantilla ([norma §2.1](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#21-la-ruta-por-el-artifact-composer-desde-el-2026-09-27-task-1919)):
**las 69 láminas aprobadas del deck** (desde el 2026-09-28; el catálogo y cómo elegir cada una están en
[Componer un deck con las recetas por lámina](./componer-deck-con-recetas.md)), los cuatro heros web, el caminero, el
último cuadro del loop y el storyboard de motion, y las siete capas de video.

1. Parte del ejemplo de tu receta en `src/lib/brand-surfaces/examples/<superficie>-<receta>-intent.json` (en
   Greenhouse). La foto se declara en `photo.plateRef` (ruta al plate aprobado, que vive fuera de git en
   `ai-generations/**`) con su `alt`, que describe la escena, no el copy.
2. Compón:

   ```bash
   pnpm brand:compose -- --intent <ruta>/web-hero-lens-intent.json
   # opcional: --out <dir> (por defecto .captures/brand-surfaces/<id>/) y --artifact-id <id>
   ```

3. Revisa la salida: el PDF (deck) o el PNG (el resto; las capas de video, con fondo transparente),
   `<id>.surface-manifest.json` (el manifest de AXIS que gobernó la pieza) y `<id>.provenance.json` (con qué intent,
   qué fotos y qué versiones de AXIS se compuso). La consola dice `✓ <superficie>.<receta> → <catálogo>`.

Con la Ruta A saltas el paso 5: el comando pinta la órbita, la voz, la selección y los íconos. El paso 4 sólo aplica
si todavía no tienes el plate aprobado (hazlo antes de componer). Sigue en el paso 6. Si el comando se niega, lee el código del error en «Qué significan los estados».

#### Cambiar la foto, el copy o la sección de una lámina

La foto, el texto y el número de sección **no viven en la plantilla**: son datos del intent. Para cambiarlos, editas el
intent y vuelves a componer.

1. **Copia el intent de ejemplo a la carpeta de trabajo de tu pieza** y edita la copia. No edites un archivo de
   `src/lib/brand-surfaces/examples/`: esos ejemplos están vigilados por una prueba y cambiarlos la rompe.
2. **Cambia lo que necesitas:**

   | Quieres cambiar | Campo | Ten en cuenta |
   |---|---|---|
   | La foto | `photo.plateRef` y `photo.alt` | `plateRef` es la ruta del archivo; `alt` es obligatorio y describe la escena, no el copy |
   | El texto | `voice` y `body` | la respuesta sigue siendo de una a tres palabras |
   | La sección | `progress` | el número de la sección y el total de secciones |

3. **Confirma que la foto existe** en la ruta que escribiste. Los plates viven fuera de git, en `ai-generations/**`.
4. **Elige la foto pensando en el recorte.** El comando ajusta la foto al área de la receta, cubriéndola y centrada:
   lo que sobra por los bordes se pierde. En una lámina a sangre el área es el lienzo completo. En la sección partida
   es una franja más angosta, de unos dos tercios del ancho: el sujeto tiene que quedar dentro del centro de la foto.
5. **Si usas la composición `panel-end`, elige una foto sin texto ni logos legibles:** en esa composición la foto sale
   espejada.
6. **Compón de nuevo:**

   ```bash
   pnpm brand:compose -- --intent <ruta>/<tu-intent>.json
   ```

7. **Revisa la lámina compuesta.** Mira que el sujeto no quede cortado y, si lleva uniforme, que el isotipo se lea bien.
   En una portada con columna de voz, revisa `column.topPx`: se elige según dónde quedó el sujeto de la foto nueva.

Al cambiar la foto **no cambian** el panel, la esquina curva, el indicador ni la columna de voz: los fija la
composición que elegiste en `layout`. Si quieres otra disposición, cambia `layout`, no la foto.

#### Portada o contraportada

Elige la receta según el documento. **La regla que manda: si la portada lleva foto, la contraportada va sin foto, y al
revés.**

| Documento | Pieza | Receta | `layout` | ¿Foto? | Ejemplo para copiar (`src/lib/brand-surfaces/examples/`) |
|---|---|---|---|---|---|
| Brochure | portada general | `cover-brochure` | `document` | sí | `deck-cover-brochure-cine-orbit-intent.json` |
| Brochure | portada de una línea de servicio | `cover-brochure` | `line` | sí | `deck-cover-brochure-line-growth-intent.json` |
| Brochure | portada de cinco líneas con la selección de Nexa sobre «Crecer.» | `cover-brochure` | `document-selection` | sí | `deck-cover-brochure-cine-lines-selection-intent.json` |
| Brochure | contraportada | `close-brochure` | `orbit` | no | `deck-close-brochure-orbit-intent.json` |
| Brochure | contraportada | `close-brochure` | `photo` | sí | `deck-close-brochure-horizon-intent.json` |
| Propuesta | portada, órbita gigante | `cover-proposal` | `orbit` | no | `deck-cover-proposal-orbit-intent.json` |
| Propuesta | portada, amanecer | `cover-proposal` | `dawn` | no | `deck-cover-proposal-dawn-intent.json` |
| Propuesta | contraportada | `close-proposal` | — | sí | `deck-close-proposal-horizon-intent.json` |

La portada `document-selection` no lleva campo `selection` en el intent: la composición trae la selección de ocho
manijas sobre la respuesta y un solo cursor «Nexa». La respuesta baja un poco para dejarle lugar. Nunca va sobre la
persona.

Parejas que resultan: **brochure** = portada con foto + contraportada `orbit`; **propuesta** = portada sin foto +
contraportada con foto. La contraportada de brochure con foto (`photo`) sólo empareja con una portada sin foto, y hoy no
hay una portada de brochure sin foto aprobada.

1. Copia el ejemplo y cambia la voz. En la portada, `voice` lleva eyebrow, pregunta y respuesta; la contraportada de
   brochure lleva «¿Conversamos? Cuando quieras.» y la de propuesta **no lleva voz** (su mensaje es el eslogan).
2. Escribe la evidencia en `body`. Marca **una** palabra en negrita con `**palabra**`; si no marcas ninguna, va la
   primera. Los saltos de línea que escribas se respetan.
3. Si la portada lleva foto, ajusta `column.topPx` mirando la foto: sube o baja la columna hasta que ningún texto cruce
   al sujeto ni a la órbita. El valor tiene que caer dentro de la reserva del logo; si lo omites, va el valor por
   defecto. Parte del valor del ejemplo más parecido a tu foto.
4. Si es una portada de propuesta, declara el logo del cliente:

   ```json
   "clientLogo": { "path": "<ruta>/logo-del-cliente.svg", "alt": "Nombre del cliente" }
   ```

   El archivo va en SVG o PNG y el `alt` es obligatorio. Si no pones `clientLogo`, sale el marcador «Logo del cliente»,
   que sirve para una plantilla. El nombre del cliente va en la evidencia, no como título.
5. No escribas el contacto: el correo, los teléfonos y la dirección de la contraportada salen del registro de marca de
   Efeonce.
6. Compón con `pnpm brand:compose` como cualquier otra pieza.

#### Un brochure o una propuesta completos

Un documento es un solo archivo de intent que declara el uso una vez y lista sus páginas en orden.

1. Copia el ejemplo: `src/lib/brand-surfaces/examples/deck-brochure-document.json` (nueve páginas: portada, cuatro
   servicios, hero de Nexa, líneas de servicio, escalera del método y contraportada). Para una propuesta, parte de
   `deck-proposal-document.json` (siete páginas interiores).
2. Arriba, deja `version` en 0.1.2 (los documentos nacieron en esa versión), `surface`, `format`, `use` (`brochure` o
   `proposal`), la línea y el número de secciones. Cada página
   hereda eso: sólo escribe lo propio (receta, `layout`, voz, foto, pasos). Una página puede declarar su propia línea
   cuando presenta un servicio de otra línea.
3. Ordena las páginas. En un brochure la portada va primero, la contraportada al final y hay al menos una página de
   servicio. Portada y contraportada alternan foto y sin foto.
4. Revisa que cada foto exista en la ruta de su `photo.plateRef`. Si falta una sola, el comando se detiene antes de
   crear nada.
5. Compón:

   ```bash
   pnpm brand:compose -- --intent src/lib/brand-surfaces/examples/deck-brochure-document.json
   # opcional: --artifact-id <id> y --out <dir>
   ```

6. Revisa lo que entrega, en `.captures/brand-surfaces/<id>/`:

   | Archivo | Para qué sirve |
   |---|---|
   | `<id>.pdf` | el documento: un solo PDF 16:9 con todas las páginas |
   | `<id>.surface-document-manifest.json` | cómo resolvió AXIS el documento, página por página |
   | `<id>.provenance.json` | con qué intent, qué fotos y qué versiones de AXIS se compuso |
   | un PNG y un PDF por página | para revisar o reemplazar una lámina suelta |

   La consola dice `✓ documento <uso> · <n> páginas → graphic-line-deck`.

**Un solo error deja al documento sin salida.** Si una página falla, no sale ninguna, ni siquiera las que estaban bien:
corrige el intent y vuelve a componer. Los códigos están en «Qué significan los estados».

### Paso 3 · Ruta B — resuélvelo en AXIS

Para una receta sin plantilla (opción que el operador quiere ver, recurso de video animado, cierre de marca). Desde
`../axis-design-system`:

```bash
pnpm surface:resolve -- --input <ruta>/intent.json --out <ruta>/manifest.json
```

Abre el manifest y revisa `issues` primero. Si hay alguno, corrige el intent y repite. Si no hay, el manifest trae
el lienzo, las reservas, la escala de voces, la firma, los tiempos, las reglas de la receta, las referencias aprobadas
y los `delegates`.

### Paso 4 · Produce la foto (si la lleva)

Con la ficha que pide el manifest (registro y reservas):

```bash
pnpm foto:prompt …     # arma el prompt desde la ficha; nunca a mano
pnpm foto:generar …    # genera la toma nativa del formato
pnpm foto:validar …    # mide reservas y lecho
pnpm foto:emblema <plate.png>   # amplía la prenda para revisar el emblema al 100 %
```

Si la prenda lleva el isotipo, **pide la prenda lisa** y compón el isotipo oficial después, desde
`@efeoncepro/axis-brand-assets`. Nunca aceptes el que dibuja el modelo.

### Paso 5 · Entrega cada delegate a su compositor

| Delegate del manifest | Comando en Greenhouse |
|---|---|
| Órbita, lente, progreso, voz y firma | `pnpm creative:orbit:render -- --intent <delegate.json> --bindings <bindings.json> --out-dir <dir>` |
| Selección y colaboradores | la capa de selección de `pnpm creative:layout`, o `pnpm foto:componer:cta` si la pieza lleva CTA |
| Pieza con foto y voces en formato social o pauta | `pnpm foto:componer` |
| Íconos | `resolveIcon` en AXIS (`pnpm icons:export`); en la Ruta A los pinta el comando |
| Cierre de marca en video (reveal, sting) | `scripts/creative/brand-motion/` |

Para un deck completo, arma el deck con `deck-studio`; las 69 láminas de La órbita tienen plantilla y salen por la
Ruta A, sueltas o como documento (el documento acepta cualquiera de ellas como página).
En `method-staircase`, en las portadas de propuesta y en la contraportada `orbit` no hay paso 4: no llevan foto.

### Paso 6 · Revisa y entrega

- Corre los chequeos de cada compositor; `pnpm creative:orbit:render` sale con código 1 si falla uno.
- Mira la pieza al tamaño de uso: la paleta a la distancia real, el teléfono en sus tres anchos, el video completo con
  y sin movimiento reducido.
- En la Ruta A, mira la pieza contra la lámina aprobada del canvas: si difiere en algo que esté entre las preguntas
  abiertas del operador (lente del caminero, arco del super de dato, burbuja URL en las láminas de sección, contenido y
  tríptico, gris de la bajada web, paleta, cuánto barre el indicador de la sección partida), dilo en la entrega; no lo
  corrijas a mano.
- En portadas y contraportadas hay tres diferencias conocidas contra el prototipo del canvas: «Cuando quieras.» sale
  algo más grande, la burbuja URL es la horneada y la caja de selección queda algo más ajustada. No son errores.
- El operador dio la aprobación visual de las láminas compuestas el 2026-09-27 (las composiciones `hero` y `lines` y el
  brochure de nueve páginas; TASK-1927) y el 2026-09-28 la de las seis familias nuevas del deck y la portada con
  selección (TASK-1928). Una lámina con copy o foto nuevos se entrega como compuesta: esa aprobación no cubre cada
  pieza futura.
- La prueba visual automática (`pnpm composer:visual-gate`) cuida las plantillas, no tu pieza: correrla no es parte de
  componer. Tu pieza se revisa a ojo.
- Entrega el intent, el manifest, la pieza y la lista de lo que es opción (en el deck ya no hay: las 69 están
  aprobadas y con plantilla). Componer y medir **no** aprueba
  ni publica: la aprobación es del operador.

## Qué significan los estados

| Estado | Dónde aparece | Qué significa |
|---|---|---|
| **aprobado** | norma y canvas | el operador lo aprobó; se puede usar como canon |
| **opción** | norma y canvas | existe y se puede proponer, pero no es canon |
| **pendiente** | norma | el operador lo dejó abierto; no se usa todavía |
| **rechazado** | norma | no se usa ni como referencia |
| `candidate` | contrato AXIS | el contrato funciona, pero puede cambiar; todavía no es `stable` |
| `issues` vacío | manifest | el intent cumple las reglas del contrato; falta revisar la pieza |
| `issues` con errores | manifest | la pieza no sigue; corrige el intent (por ejemplo `steps-over-limit`, `recipe-not-for-role`, `cine-requires-nexa-or-proposal`, `question-not-allowed-at-distance`) |
| `recipe-not-approved` | `pnpm brand:compose` | la receta es opción o pendiente en AXIS (paleta DOOH, pDOOH): no tiene plantilla; usa la Ruta B y decláralo como opción. En el deck no hay opciones: si sale, revisa que la receta sea la de AXIS (la del ejemplo), no el id del catálogo |
| `recipe-outside-composer` | `pnpm brand:compose` | la receta es video (`audiovisual.close-reveal`): sale de los masters del reveal v1.1 o de `pnpm orbit:video` en AXIS, no del composer |
| `surface-issues` | `pnpm brand:compose` | el contrato de AXIS rechazó el intent; los códigos (los mismos de `issues`) salen listados debajo: corrige el intent |
| `missing-photo` | `pnpm brand:compose` | la receta lleva foto y el intent no trae `photo.plateRef` o su `alt` |
| `invalid-intent` | `pnpm brand:compose` | falta algo que la receta necesita (por ejemplo, la voz) o el intent tiene una forma antigua |
| `recipe-without-template` | `pnpm brand:compose` | la receta está aprobada pero todavía no tiene plantilla: avisa; es un hueco del catálogo. En el deck no debería pasar: revisa que la receta y el `layout` sean los del ejemplo |
| `selection-not-in-recipe` | `pnpm brand:compose` (bajo `surface-issues`) | pediste selección en una receta o composición que no la lleva (por ejemplo, `cover-brochure` con `document` o `line`) |
| `figure-source-required` | `pnpm brand:compose` (bajo `surface-issues`) | una cifra de `figures` no trae su fuente |
| `use-not-for-recipe` | `pnpm brand:compose` (bajo `surface-issues`) | pediste un uso que la receta no admite (por ejemplo, una portada de propuesta con `use: 'brochure'`) |
| `layout-invalid`, `layout-not-in-recipe` | `pnpm brand:compose` (bajo `surface-issues`) | el `layout` no existe en esa receta, o la receta no tiene composiciones |
| `sinValidar` | compositor con CTA, formato 1:1 | el 1:1 ajustado está aprobado en el canvas, pero el compositor todavía no lo certifica (se cierra con TASK-1918) |

### Códigos de un documento

Salen cuando compones un brochure o una propuesta. Con cualquiera de ellos, el documento no entrega nada.

| Código | Qué pasó | Qué hacer |
|---|---|---|
| `brochure-cover-first` | el brochure no empieza con su portada | pon la portada como primera página |
| `brochure-close-last` | el brochure no termina con su contraportada | pon la contraportada como última página |
| `brochure-needs-service-page` | el brochure no tiene ninguna página de servicio | agrega al menos una lámina de servicio (`proposal-cinematic`) |
| `document-line-mismatch` | la línea del documento y la de su portada o contraportada no coinciden | usa la misma línea en el documento y en el marco |
| `frame-photo-must-alternate` | portada y contraportada llevan foto las dos, o ninguna | cambia una: con portada con foto, contraportada sin foto, y al revés |
| `document-pages-required` | el documento no trae páginas | agrega la lista `pages` con al menos una lámina |
| `document-surface-invalid` | el documento pide una superficie que no admite documentos | usa `surface: 'deck'` |
| `page[i]:<código>` | falló una página; `i` dice cuál (la primera es la 0) y el código es el mismo que tendría la lámina sola | corrige esa página según su código |

## Qué no hacer

- **No escribas coordenadas, px, porcentajes ni tiempos** en un script o un intent. Salen del token
  `efeonceGraphicLine.surfaces.<superficie>`.
- **No elijas el canal del contrato de la órbita a mano** (`print`, `screen`, `social`): lo fija el delegate.
- **No uses el registro cine** fuera de piezas con Nexa protagonista, de la receta `proposal-cinematic` y de las
  excepciones del deck que fija la norma (secciones partidas, láminas «about» y el marco con foto). Nunca en social,
  web, publicidad ni láminas de contenido.
- **No edites un intent de ejemplo** de `src/lib/brand-surfaces/examples/` para producir una pieza: cópialo y edita la
  copia.
- **No uses en `panel-end` una foto con texto o logos legibles:** sale espejada.
- **No pongas a dos personas mirándose de cerca**: se lee como escena romántica.
- **No pongas el acento en textos de menos de 24 px** (como el rótulo del primer paso): va en blanco o en el suave.
- **No uses el isotipo que dibuja el modelo** ni el logo dentro de la toma de un video o una gráfica animada.
- **No generes la animación con un modelo de video** ni con paralaje falso sobre la foto.
- **No uses como referencia una opción del canvas** como si estuviera aprobada: la norma dice cuáles lo están.
- **No copies las cinco esferas ni los cinco acentos** de la lámina de líneas de servicio con Nexa en otra pieza: son
  una excepción de esa lámina (luz de la foto); en todo lo demás, una esfera y un acento por pieza.
- **No uses como referencia una pieza rechazada** (servicios creativos en plastilina, la carrera v1, Nexa con el
  director mirándose, líneas de servicio con Nexa sin fuerza).
- **No toques el código del compositor con CTA** para habilitar el 1:1: eso va por TASK-1918.
- **No retoques a mano un PNG o un PDF que salió de `brand:compose`** ni edites la plantilla para una pieza puntual: si
  algo no calza, es el intent, el token o un hueco del catálogo.
- **No pidas un video al composer:** entrega cuadros fijos y capas; la animación es de motion.
- **No subas una opción al catálogo** para poder componerla: una receta entra sólo cuando el operador la aprueba.
- **No pongas foto en portada y contraportada a la vez**, ni las dejes a las dos sin foto.
- **No uses el marco clásico** (la portada y el cierre anteriores del contrato): el operador no lo aprobó y no tiene
  plantilla.
- **No pongas el eslogan en la portada** ni «¿Conversamos?» en la contraportada de una propuesta.
- **No pidas selección en una portada de brochure** salvo con la composición `document-selection` (la de cinco
  líneas), que la trae sola sobre la respuesta. En la portada de propuesta, la selección va sólo sobre el logo del
  cliente.
- **No escribas el contacto de Efeonce en el intent** ni dejes el logo de un cliente sin texto alternativo.
- **No compongas un documento por partes para saltarte un error:** si el conjunto no pasa, el documento no está listo.

## Problemas comunes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `pnpm surface:resolve` no existe | tu copia de AXIS está atrasada (el comando entró a `main` el 2026-09-27) | actualiza `main` con `git pull`; si no existe, trabaja con la norma a mano y decláralo |
| El manifest trae `cine-requires-nexa-or-proposal` | pediste registro cine en otra receta | cambia el registro (documental, puesta en escena o respuesta) o la receta |
| El manifest trae `steps-over-limit` | más pasos de los que admite la receta | junta pasos o deja el resto para otra lámina |
| El manifest trae `question-not-allowed-at-distance` | la distancia de lectura sólo admite la respuesta | quita la pregunta o cambia de soporte |
| La cabeza se ve grande en la foto de cine | cámara pegada o lente corto | regenera con la cámara a unos 2 m y 85 mm, plano medio |
| El pecho sale con un cohete o un símbolo inventado | el modelo dibujó un emblema | pide la prenda lisa («NO emblem, NO logo, NO symbol») y compón el isotipo oficial |
| La lente de la LED no coincide con la maqueta del canvas | la receta del paquete y la pieza medida difieren | manda el token de superficie; avisa en la entrega (norma §6, fila 7) |
| El teléfono parece el escritorio achicado | se compuso desde el escritorio | recompón mobile-first, con toma vertical nativa |
| `No encuentro el plate …` | el plate vive fuera de git (`ai-generations/**`) y no está en tu equipo | genéralo o cópialo a la ruta de `photo.plateRef` antes de componer. En un documento basta que falte uno para que no salga nada: el comando se detiene antes de crear la carpeta |
| `missing-photo` después de cambiar la foto | el intent no trae `photo.plateRef`, o le falta `photo.alt` | escribe la ruta del archivo y un `alt` que describa la escena |
| El sujeto sale cortado en la sección partida | el recorte es centrado y la franja de foto es más angosta que el lienzo; esa receta no tiene control de foco | usa una foto con otro encuadre, con el sujeto al centro. Un control de foco exigiría cambios en AXIS y en Greenhouse, y hoy no existe |
| El texto o el logo de la foto sale al revés | la composición `panel-end` espeja la foto | elige una foto sin texto ni logos legibles, o usa `corner-top` o `corner-bottom` |
| El isotipo del uniforme se ve raro en `panel-end` | la foto va espejada y el isotipo se compone aparte | revísalo al 100 % sobre la lámina compuesta antes de entregar |
| Cambié la foto y el texto de la portada ahora cruza al sujeto | la columna de voz sigue a la altura de la foto anterior | ajusta `column.topPx` dentro del rango permitido |
| La prueba de los ejemplos falla después de tu cambio | editaste un intent de `src/lib/brand-surfaces/examples/` | devuelve el ejemplo a como estaba y trabaja en una copia fuera de esa carpeta |
| El mensaje dice que `column.topPx` «va entre … y … px» | la altura de la columna quedó fuera de la reserva del logo | usa un valor dentro del rango que indica el mensaje, o quita el campo para usar el valor por defecto |
| El mensaje dice que `clientLogo.alt` «nombra al cliente» | declaraste el logo del cliente sin texto alternativo | agrega `alt` con el nombre del cliente |
| `El archivo … no es SVG ni PNG` o `No encuentro el archivo …` | el logo del cliente está en otro formato o la ruta no existe | entrega el logo en SVG o PNG y corrige `clientLogo.path` |
| `surface-issues` con `use-not-for-recipe` | el uso no corresponde a la receta (una receta de propuesta pedida para brochure, o al revés) | cambia `use` o elige la receta del documento correcto (tabla de «Portada o contraportada») |
| `Cada toma del tríptico lleva una palabra, con su esfera.` | una toma del tríptico trae más de una palabra | deja una sola palabra por toma («Escucha», «Crea», «Mide») |
| `frame-photo-must-alternate` | portada y contraportada llevan foto las dos | en un brochure, cierra con la contraportada `orbit`; en una propuesta, abre con una portada sin foto |
| `La contraportada de propuesta no lleva voz…` | escribiste pregunta o respuesta en `close-proposal` | quita `voice`: el mensaje es el eslogan |
| `surface-issues` con `selection-not-in-recipe` en una portada de brochure | el intent trae `selection` con `document` o `line` | quítala; si quieres la portada con selección, usa `layout: "document-selection"` y parte de su ejemplo |
| La lámina no sale y el mensaje dice que un texto excede el máximo (`too_long`) | el texto pasa el largo máximo de su casilla; el compositor no recorta | acorta el texto; el largo de cada casilla está en el catálogo de recetas del deck |
| La capa de video sale con fondo negro | se abrió en un visor que no muestra el alfa | revísala en el editor de video o sobre un fondo de prueba: el PNG es transparente |

## Referencias técnicas

- Norma: [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md).
- Manual de la línea: [`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) §10.0 y §10.1.
- Movimiento: [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](../../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md).
- Foto: [`EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md`](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) (delta 2026-09-27, registro cine).
- Pendiente del 1:1: [TASK-1918](../../tasks/to-do/TASK-1918-photo-prompt-and-lens-checks-graphic-line.md).
- Ruta A: catálogos `src/lib/artifact-composer/catalogs/graphic-line-{deck,stills,overlays}/`, mapper
  `src/lib/brand-surfaces` (documento: `src/lib/brand-surfaces/document.ts`; portadas y contraportadas:
  `src/lib/brand-surfaces/recipes/frame.ts`), CLI `scripts/brand-surfaces/compose.ts`; ADR del composer (delta
  2026-09-27); gate `pnpm composer:visual-gate --catalog=graphic-line`
  ([runbook](../../operations/runbooks/composer-visual-gate.md)); ruta productiva (API, `artifact-worker`, MCP) en
  [TASK-1921](../../tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md), en curso y
  todavía no disponible.
- Integración del contrato 0.1.2: [TASK-1927](../../tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md)
  (`complete` el 2026-09-27, en `develop`). Recorte de la foto: `materializeAssets` en
  `scripts/brand-surfaces/compose.ts`; prueba de los ejemplos: `src/lib/brand-surfaces/__tests__/example-plans.test.ts`.
  Recetas restantes del deck y portada con selección: [TASK-1928](../../tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md)
  (`complete` el 2026-09-28, en `develop`; 69 de 69 recetas con plantilla, 50 plantillas).
- Documentación funcional del deck: [Composición de decks y brochures](../../documentation/creative/composicion-de-decks-y-brochures.md);
  arquitectura: [`GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`](../../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md).
- Contacto de marca: `EFEONCE_CONTACT` en `src/config/efeonce-brand.ts`.
- AXIS (en `main` desde el 2026-09-27; [página del Lab](https://axis.efeonce.org/references/surfaces/)):
  [guías por superficie](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surfaces/README.md),
  [schema del intent](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surface-composition-intent.schema.json),
  ejemplos en `docs/examples/surfaces/`, tokens `efeonceGraphicLine.surfaces`, Lab `/references/surfaces/`.
- Skills: `efeonce-graphic-line`, `deck-studio`, `motion-design-studio`, `efeonce-advertising-creative`, `design-studio`.
