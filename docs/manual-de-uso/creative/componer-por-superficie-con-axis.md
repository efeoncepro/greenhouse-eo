# Componer una pieza por superficie con AXIS — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude (1.1: las recetas aprobadas se componen enteras con `pnpm brand:compose` en el Artifact Composer, TASK-1919)
> **Modulo:** Creative · marca propia de Efeonce (línea gráfica «La órbita»)
> **Ruta en portal:** no aplica — se compone con comandos locales en AXIS y en Greenhouse
> **Documentacion relacionada:** [Norma de composición por superficie](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) · [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md#componer-por-superficie) · [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md) · [Compositor de piezas con CTA](./compositor-piezas-cta.md) · [Producir una foto de marca](../marketing/fotografia-de-marca-efeonce.md)

## Para qué sirve

Este manual explica cómo producir una pieza de la marca Efeonce **según dónde va a vivir**: un hero de sitio, un
letrero de vía pública (DOOH), una pantalla digital en la calle (pDOOH), una gráfica animada con foto, un video o una
lámina de deck. Cada superficie tiene sus recetas aprobadas, sus reservas, su escala de voces, su forma de firmar y
sus tiempos. Tú (o un agente) describes la pieza; AXIS devuelve un manifest con todo resuelto desde los tokens, y las
herramientas de Greenhouse la pintan, la firman y la miden. Si la receta está **aprobada**, un solo comando de
Greenhouse (`pnpm brand:compose`) hace todo el recorrido y entrega la pieza terminada (Ruta A); si no, se compone por
delegates (Ruta B).

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
- **Para la Ruta A basta Greenhouse:** el contrato `efeonce.surface-composition` 0.1.1 (`candidate`, acepta intents
  0.1.0) viene en los paquetes AXIS que Greenhouse ya fija (`axis-ui-contracts` 0.3.7, `axis-tokens` 0.3.8). Corre
  `pnpm install` si acabas de traer cambios. **Para la Ruta B** necesitas además el repo de AXIS en
  `../axis-design-system` al día con `main` (ahí vive `pnpm surface:resolve`).
- **Carga las skills:** `efeonce-graphic-line` siempre; `deck-studio` para láminas; `motion-design-studio` para
  motion y video; `efeonce-advertising-creative` para DOOH, pDOOH y piezas con texto o CTA; `design-studio` para la
  foto.
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
| `selection` | qué toma la selección y el colaborador |
| `timeline`, `variants` | duración y cierre (motion, pDOOH, video); variantes por franja (pDOOH) |

**No pongas coordenadas ni tamaños.** Si sientes que te falta un número, es porque falta en el token: pídelo.

### Paso 3 · Ruta A — compón la pieza aprobada con el Artifact Composer

Úsala cuando la receta es una de las 20 aprobadas con plantilla ([norma §2.1](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#21-la-ruta-por-el-artifact-composer-desde-el-2026-09-27-task-1919)):
las seis del deck, los cuatro heros web, el caminero, el último cuadro del loop y el storyboard de motion, y las siete
capas de video.

1. Parte del ejemplo de tu receta en `src/lib/brand-surfaces/examples/<superficie>-<receta>-intent.json` (en
   Greenhouse). La foto se declara en `photo.plateRef` (ruta al plate aprobado, que vive fuera de git en
   `ai-generations/**`) con su `alt`, que describe la escena, no el copy.
2. Compón:

   ```bash
   pnpm brand:compose -- --intent <ruta>/web-hero-lens-intent.json
   # opcional: --out <dir> (por defecto .captures/brand-surfaces/<id>/) y --artifact-id <id>
   ```

3. Revisa la salida: el PDF (deck) o el PNG (el resto; las capas de video, con fondo transparente) y
   `<id>.surface-manifest.json`, el manifest de AXIS que gobernó la pieza. La consola dice
   `✓ <superficie>.<receta> → <catálogo>`.

Con la Ruta A saltas el paso 5: el comando pinta la órbita, la voz, la selección y los íconos. El paso 4 sólo aplica
si todavía no tienes el plate aprobado (hazlo antes de componer). Sigue en el paso 6. Si el comando se niega, lee el código del error en «Qué significan los estados».

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

Para un deck completo, arma el deck con `deck-studio`; las seis láminas aprobadas de La órbita (entre ellas
`proposal-cinematic` y `method-staircase`) salen por la Ruta A. En `method-staircase` no hay paso 4: no lleva foto.

### Paso 6 · Revisa y entrega

- Corre los chequeos de cada compositor; `pnpm creative:orbit:render` sale con código 1 si falla uno.
- Mira la pieza al tamaño de uso: la paleta a la distancia real, el teléfono en sus tres anchos, el video completo con
  y sin movimiento reducido.
- En la Ruta A, mira la pieza contra la lámina aprobada del canvas: si difiere en algo que esté entre las preguntas
  abiertas del operador (lente del caminero, arco del super de dato, burbuja URL en las láminas de sección, contenido y
  tríptico, gris de la bajada web, paleta), dilo en la entrega; no lo corrijas a mano.
- Entrega el intent, el manifest, la pieza y la lista de lo que es opción o maqueta. Componer y medir **no** aprueba
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
| `recipe-not-approved` | `pnpm brand:compose` | la receta es opción o pendiente en AXIS (paleta DOOH, pDOOH, opciones del deck): no tiene plantilla; usa la Ruta B y decláralo como opción |
| `recipe-outside-composer` | `pnpm brand:compose` | la receta es video (`audiovisual.close-reveal`): sale de los masters del reveal v1.1 o de `pnpm orbit:video` en AXIS, no del composer |
| `surface-issues` | `pnpm brand:compose` | el contrato de AXIS rechazó el intent; los códigos (los mismos de `issues`) salen listados debajo: corrige el intent |
| `missing-photo` | `pnpm brand:compose` | la receta lleva foto y el intent no trae `photo.plateRef` o su `alt` |
| `invalid-intent` | `pnpm brand:compose` | falta algo que la receta necesita (por ejemplo, la voz) o el intent tiene una forma antigua |
| `recipe-without-template` | `pnpm brand:compose` | la receta está aprobada pero todavía no tiene plantilla: avisa; es un hueco del catálogo |
| `sinValidar` | compositor con CTA, formato 1:1 | el 1:1 ajustado está aprobado en el canvas, pero el compositor todavía no lo certifica (se cierra con TASK-1918) |

## Qué no hacer

- **No escribas coordenadas, px, porcentajes ni tiempos** en un script o un intent. Salen del token
  `efeonceGraphicLine.surfaces.<superficie>`.
- **No elijas el canal del contrato de la órbita a mano** (`print`, `screen`, `social`): lo fija el delegate.
- **No uses el registro cine** fuera de piezas con Nexa protagonista o de la receta `proposal-cinematic`.
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
| `No encuentro el plate …` | el plate vive fuera de git (`ai-generations/**`) y no está en tu equipo | genéralo o cópialo a la ruta de `photo.plateRef` antes de componer |
| La capa de video sale con fondo negro | se abrió en un visor que no muestra el alfa | revísala en el editor de video o sobre un fondo de prueba: el PNG es transparente |

## Referencias técnicas

- Norma: [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md).
- Manual de la línea: [`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) §10.0 y §10.1.
- Movimiento: [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](../../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md).
- Foto: [`EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md`](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) (delta 2026-09-27, registro cine).
- Pendiente del 1:1: [TASK-1918](../../tasks/to-do/TASK-1918-photo-prompt-and-lens-checks-graphic-line.md).
- Ruta A: catálogos `src/lib/artifact-composer/catalogs/graphic-line-{deck,stills,overlays}/`, mapper
  `src/lib/brand-surfaces`, CLI `scripts/brand-surfaces/compose.ts`; ADR del composer (delta 2026-09-27); gate
  `pnpm composer:visual-gate --catalog=graphic-line` ([runbook](../../operations/runbooks/composer-visual-gate.md));
  ruta productiva en [TASK-1921](../../tasks/to-do/TASK-1921-brand-surface-pieces-governed-production-route.md).
- AXIS (en `main` desde el 2026-09-27; [página del Lab](https://axis.efeonce.org/references/surfaces/)):
  [guías por superficie](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surfaces/README.md),
  [schema del intent](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surface-composition-intent.schema.json),
  ejemplos en `docs/examples/surfaces/`, tokens `efeonceGraphicLine.surfaces`, Lab `/references/surfaces/`.
- Skills: `efeonce-graphic-line`, `deck-studio`, `motion-design-studio`, `efeonce-advertising-creative`, `design-studio`.
