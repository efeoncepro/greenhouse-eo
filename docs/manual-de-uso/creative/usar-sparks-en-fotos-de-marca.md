# Usar los Sparks en fotos de marca — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-01 por Claude
> **Ultima actualizacion:** 2026-10-01 por Claude
> **Modulo:** Creative · marca propia de Efeonce (fotografía de marca, registro cine y puesta en escena)
> **Ruta en portal:** no aplica — se usa desde la ficha de toma de `pnpm foto:prompt` / `pnpm foto:generar`
> **Estado:** kit aprobado por el operador el 2026-10-01; sin publicar en AXIS
> **Documentacion relacionada:** [Canon de los Sparks](../../operations/brand-characters/SPARKS_V1.md) · [Registro cine](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) · [Lenguaje fotográfico](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Índice de fotografía de marca](../../operations/brand-photography/README.md) · [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md#delta-2026-10-01-b--los-sparks-los-agentes-de-efeonce)

## Para qué sirve

Este manual explica cómo poner a un **Spark** —uno de los agentes de Efeonce— en una foto de marca: cómo elegir el
Spark y su vista, cómo declararlo en la ficha de toma y qué hace la guarda de `foto:prompt` cuando algo no calza.

Los Sparks son el **único robot permitido** en una foto de Efeonce. Si una escena necesita agentes, se usan los
Sparks del kit; nunca se describe un robot a mano.

**No se usa** en el registro documental, en piezas de clientes ni en la interfaz de Greenhouse.

## Antes de empezar

- **Ten las imágenes del kit en disco.** Las referencias no se versionan: `foto:prompt` aborta si no encuentra el
  archivo. Corre `pnpm foto:assets:check`; si faltan, cópialas desde OneDrive
  (`Alineación/5. Contenidos/13- Branding/Sparks/`) a `ai-generations/2026-10-01_sparks/transparente/` (Spark base)
  y `ai-generations/2026-10-01_sparks/plantel-transparente/` (plantel).
- **Confirma el registro.** Los Sparks viven en **cine** o **puesta en escena**. Si la pieza es documental, no lleva
  Sparks.
- **Confirma que hay una persona.** Un Spark nunca aparece solo decidiendo. Si la pieza vende Agent Ops, la persona
  es del equipo humano, no sólo Nexa.

## Paso a paso

### Paso 1 · Elige el Spark

| Si la escena trata de… | Usa | Accesorio y gesto |
|---|---|---|
| Un agente en general, o necesitas un ángulo o una expresión concreta | `spark` (el Spark base) | Sin accesorio |
| Leer y resumir fuentes | `spark-investigacion` | Lupa al costado; examina de cerca |
| Proponer borradores | `spark-contenido` | Tarjeta con un trazo azul; la ofrece con las dos manos |
| Ordenar registros | `spark-crm-datos` | Pila de fichas; pone una más encima |
| Responder y derivar | `spark-servicio` | Burbuja de conversación con tres puntos; saluda |
| Medir y reportar | `spark-reportes` | Gráfico de tres barras; señala la más alta |
| Los cinco juntos | `sparks-plantel` | Cada uno con lo suyo |

### Paso 2 · Elige la vista

- **Spark base (`spark`), 26 vistas.** Giro: `frente`, `tres-cuartos-izq` (por defecto), `tres-cuartos-der`,
  `perfil`, `perfil-der`, `espalda`, `espalda-recta`, `trasero-izq`, `contrapicado`, `picado`, `mira-arriba`,
  `mira-abajo`. Expresiones: `atento`, `trabajando`, `pide-revision`, `listo`, `sorprendido`, `pensando`. Luz cine:
  `cine-frente`, `cine-tres-cuartos`, `cine-mira-arriba`. Acciones: `volando`, `senalando`, `presenta`,
  `entrega-tarjeta`. Y `grupo` (tres).
- **Cada Spark del plantel, 5 vistas:** `heroe` (por defecto), `frente`, `tres-cuartos-der`, `mira-arriba`, `cine`.
- **`sparks-plantel`:** `frente`.

Elige la vista más parecida a lo que pide la escena: si el Spark mira a la persona que tiene arriba, `mira-arriba`;
si la foto es de noche, una vista `cine`. Si un Spark del plantel no tiene el ángulo que necesitas, usa el Spark base.

### Paso 3 · Declara el Spark en la ficha

En `objetos`, junto con el resto de lo que va en la escena:

```json
"objetos": [
  { "objeto": "chaqueta-softshell-efeonce" },
  { "objeto": "spark-servicio", "vista": "heroe" }
]
```

En la `escena`, ubícalo respecto de la persona y dale una acción, pero **no lo describas como «robot»** con tus
palabras: el catálogo ya trae su forma exacta. Fichas de ejemplo con Nexa (hombro, palma, escritorio, entrega):
`ai-generations/2026-10-01_sparks/fichas/SPK-E1-hombro.json` a `SPK-E4-entrega.json`.

**Si la pieza es de una línea de negocio**, puedes pedir el Spark base con el LED en el acento de esa línea con el
campo `color`: `engine` (defecto, azul), `growth`, `brand`, `voice`, `revenue-hubspot` o `revenue-salesforce`. Por
ejemplo `{ "objeto": "spark", "vista": "mira-arriba", "color": "growth" }`. Brand y Voice (cálidos) pruébalos primero en
una foto oscura. Detalle en [`SPARKS_V1.md` §6.1](../../operations/brand-characters/SPARKS_V1.md).

### Paso 4 · Respeta la escala

Nunca más grande que la cabeza de la persona y siempre por encima de la cintura: sobre el hombro, junto a la cabeza,
sobre la palma o el antebrazo, sobre el escritorio o entregando algo en la mano. Y fuera de la reserva del texto.

### Paso 5 · Arma el prompt y revisa

```bash
pnpm foto:prompt <ficha.json> --batch <out.json>
```

Si pasa, genera como siempre. Al revisar la imagen: el Spark tiene la misma forma y color que el kit (esfera, visor
con dos ojos y sonrisa, chispa en la antena, anillo con su esfera, tres ventanas), el accesorio no tapa el visor y hay
una persona a cargo.

## Qué significan los estados

| Lo que ves | Qué significa |
|---|---|
| `foto:prompt` arma el prompt | El Spark está declarado, el registro es válido y las referencias están en disco |
| Error: «describe un robot (…) sin declarar un Spark» | La escena nombra un robot, droide o bot y la ficha no declara ningún Spark |
| Error: «los Sparks viven en el registro cine o de puesta en escena» | La ficha tiene `registro: "documental"` o una palanca documental (`escucha`, `manos`, `sombra`, `silueta`, `marcado`, `quien-sostiene`) |
| Error: «La vista "…" no existe para "…"» | Pediste una vista que ese Spark no tiene; el mensaje lista las que sí |

## Qué no hacer

- **No describir robots a mano** («small friendly robot agents…»): salen distintos en cada foto y parecidos a
  personajes ajenos. Es lo que la guarda frena.
- **No esquivar la guarda** escribiendo la escena sin la palabra «robot» para describir igual uno inventado.
- **No dejar al Spark solo decidiendo** ni ponerlo en lugar de una persona.
- **No vender Agent Ops con Sparks y sin el equipo humano** en la pieza.
- **No agrandarlo** ni ponerlo por debajo de la cintura.
- **No usarlo en el registro documental.**
- **No poner el accesorio delante del visor**, ni darle texto o cambiarle el color.
- **No espejar una vista** para tener el otro lado: el anillo se invierte. Usa `perfil-der` o `tres-cuartos-der`.
- **No llamarlo «Sparks» a secas en una pieza pública:** es «los Sparks de Efeonce», y no es nombre de producto.

## Problemas comunes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `foto:prompt` aborta con una ficha antigua que antes andaba | La escena describe robots a mano (pasa con 13 fichas históricas, como `NX3`–`NX5`, `RV1`, `WB1`, `AD2`, `AD4*`, `BR2`, `BR4` y `PH7`) | Reemplaza la descripción por un Spark del catálogo. Regenerar una pieza ya aprobada es decisión del operador |
| Aborta aunque la escena dice «no robots» | La negación está lejos de la palabra o en otra frase | Pon la negación justo antes: «no robots», «sin robots» |
| Aborta con un Spark declarado | La ficha es documental o usa una palanca documental | Pasa la pieza a puesta en escena o cine, o saca el Spark |
| Error de referencia que no existe en disco | Las imágenes del kit no están en tu copia del repo | Cópialas desde OneDrive (ver «Antes de empezar») y corre `pnpm foto:assets:check` |
| El Spark sale más grande que la cabeza | La escena no fija la escala o la cámara está muy cerca | Escríbelo en la escena («about the size of her head, never larger») y usa la cámara del registro cine (unos 2 m, 85 mm) |
| El Spark sale con otra forma o con piernas | El modelo se alejó de la referencia | Revisa que la vista pedida sea la más cercana a la pose; vuelve a generar desde la ficha, no corrijas a mano |
| Un recorte propio deja el cuerpo semitransparente | El blanco en sombra se confunde con el gris del fondo | Usa las vistas `transparente` del kit; si recortas una nueva, pasa antes la fuente a fondo gris medio `#7F7F7F` |

## Referencias técnicas

- Canon: [`SPARKS_V1.md`](../../operations/brand-characters/SPARKS_V1.md)
- Catálogo y guarda: `scripts/foto/build-prompt.mjs` (entradas `spark*` y `validarRobots`), pruebas en
  `scripts/foto/build-prompt.test.ts`
- Kit y fichas: `ai-generations/2026-10-01_sparks/` (LEEME y fichas en el repo; imágenes fuera de git)
- Copia del equipo: OneDrive `Alineación/5. Contenidos/13- Branding/Sparks/`
- Task: TASK-1941
