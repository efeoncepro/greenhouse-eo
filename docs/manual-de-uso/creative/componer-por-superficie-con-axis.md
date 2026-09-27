# Componer una pieza por superficie con AXIS — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude
> **Modulo:** Creative · marca propia de Efeonce (línea gráfica «La órbita»)
> **Ruta en portal:** no aplica — se compone con comandos locales en AXIS y en Greenhouse
> **Documentacion relacionada:** [Norma de composición por superficie](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) · [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md#componer-por-superficie) · [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md) · [Compositor de piezas con CTA](./compositor-piezas-cta.md) · [Producir una foto de marca](../marketing/fotografia-de-marca-efeonce.md)

## Para qué sirve

Este manual explica cómo producir una pieza de la marca Efeonce **según dónde va a vivir**: un hero de sitio, un
letrero de vía pública (DOOH), una pantalla digital en la calle (pDOOH), una gráfica animada con foto, un video o una
lámina de deck. Cada superficie tiene sus recetas aprobadas, sus reservas, su escala de voces, su forma de firmar y
sus tiempos. Tú (o un agente) describes la pieza; AXIS devuelve un manifest con todo resuelto desde los tokens, y las
herramientas de Greenhouse la pintan, la firman y la miden.

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
- **Ten el repo de AXIS** en `../axis-design-system` al día con `main` (desde el 2026-09-27). El contrato
  `efeonce.surface-composition` 0.1.0 está en `candidate` y ya está en `main`: si la rama no está, la
  composición por superficie no se puede resolver y se trabaja con las reglas de la norma a mano, marcándolo en la
  entrega.
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

### Paso 3 · Resuélvelo en AXIS

Desde `../axis-design-system`:

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
| Íconos | `resolveIcon` en AXIS (`pnpm icons:export`); Greenhouse todavía no consume `/icons` |
| Cierre de marca en video (reveal, sting) | `scripts/creative/brand-motion/` |

Para una lámina de deck, arma el deck con `deck-studio`. Las recetas `proposal-cinematic` (propuesta con foto de
cine) y `method-staircase` (el método como escalera, sin foto; aprobada con BeX) todavía no son catálogo del Artifact
Composer: se arman como maqueta de dirección leyendo el manifest y se declara así en la entrega. En
`method-staircase` no hay paso 4: no lleva foto.

### Paso 6 · Revisa y entrega

- Corre los chequeos de cada compositor; `pnpm creative:orbit:render` sale con código 1 si falla uno.
- Mira la pieza al tamaño de uso: la paleta a la distancia real, el teléfono en sus tres anchos, el video completo con
  y sin movimiento reducido.
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

## Referencias técnicas

- Norma: [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md).
- Manual de la línea: [`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) §10.0 y §10.1.
- Movimiento: [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](../../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md).
- Foto: [`EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md`](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) (delta 2026-09-27, registro cine).
- Pendiente del 1:1: [TASK-1918](../../tasks/to-do/TASK-1918-photo-prompt-and-lens-checks-graphic-line.md).
- AXIS (en `main` desde el 2026-09-27; [página del Lab](https://axis.efeonce.org/references/surfaces/)):
  [guías por superficie](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surfaces/README.md),
  [schema del intent](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surface-composition-intent.schema.json),
  ejemplos en `docs/examples/surfaces/`, tokens `efeonceGraphicLine.surfaces`, Lab `/references/surfaces/`.
- Skills: `efeonce-graphic-line`, `deck-studio`, `motion-design-studio`, `efeonce-advertising-creative`, `design-studio`.
