# Usar el traje biónico de Nexa en fotos — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-02 por Claude
> **Ultima actualizacion:** 2026-10-02 por Claude
> **Modulo:** Creative · marca propia de Efeonce (fotografía de marca, registro cine)
> **Ruta en portal:** no aplica — se usa desde la ficha de toma de `pnpm foto:prompt` / `pnpm foto:generar`
> **Estado:** kit aprobado por el operador el 2026-10-02 (TASK-1940); escena de referencia `NX7d` aprobada el mismo día. Publicado en AXIS el 2026-10-02: `@efeoncepro/axis-brand-assets` 0.4.13 (`AXIS_NEXA_SUIT`, `findNexaSuitAsset`) y la página del Lab [/references/nexa-suit/](https://axis.efeonce.org/references/nexa-suit/) con su [JSON](https://axis.efeonce.org/references/nexa-suit.json); masters, vistas puestas y la escena en `gs://efeonce-group-axis-public-media/nexa-suit/v1/`
> **Documentacion relacionada:** [Kit del traje (LEEME)](../../../ai-generations/2026-10-01_traje-bionico-nexa/LEEME.md) · [Registro cine](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) · [Personas, identidad y vestuario](../../operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) · [Ficha de Nexa](../../operations/brand-photography/NEXA_CHARACTER_BIBLE_FICHA_V1.md) · [Prompts y pipeline](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [Usar los Sparks](./usar-sparks-en-fotos-de-marca.md) · [Índice de fotografía de marca](../../operations/brand-photography/README.md) · [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md#delta-2026-10-02--el-traje-biónico-de-nexa-y-su-escena-con-los-sparks)

## Para qué sirve

Este manual explica cómo vestir a **Nexa con su traje biónico y sus lentes biónicos** en una foto de marca: cómo
declararlos en la ficha de toma, cómo elegir su expresión, cómo revisar que las marcas del traje salieron bien, cómo
armar una escena con Sparks y cómo reproducir o actualizar el kit.

El traje es un **body navy de punto técnico** con placas blancas mate (hombros, pecho, brazos, antebrazos y una placa
en la espalda), costuras de luz azul y cinturón navy. Lleva dos marcas: el **isotipo incrustado** en la pechera, del
lado izquierdo de quien lo lleva, y el **logo completo «efeonce» serigrafiado** entre los omóplatos. Los lentes son
una mica transparente envolvente, apenas azul, con una línea de luz en el borde superior y sin logo.

**Regla de uso: sólo Nexa y sólo en el registro cine.** Nunca en una persona del equipo, nunca en el registro
documental ni en puesta en escena, nunca en piezas de clientes.

## Antes de empezar

- **Ten las imágenes del kit en disco.** Los PNG del kit no se versionan: viven en el canon
  (`gs://efeonce-creative-canon`) y su huella está sellada en `scripts/foto/assets.lock.json`. Corre
  `pnpm foto:assets:check`; si falta alguno, recupéralo con `pnpm ai-gen:where <ruta>` y `pnpm ai-gen:pull <carpeta>`
  ([recuperar archivos de `ai-generations/`](./recuperar-y-archivar-ai-generations.md)). Nunca lo regeneres para tapar
  el faltante.
- **Confirma que la pieza es de registro cine.** Nexa protagonista, la receta de deck `proposal-cinematic`, las
  excepciones aprobadas del deck o las portadas sociales: los casos están en el
  [registro cine §2](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#2-cuándo-se-usa--y-cuándo-no).
  Si la pieza no está ahí, Nexa va con el uniforme de su registro de escena.
- **Confirma que Nexa es la única persona con identidad en la ficha.** El traje no se mezcla con personas del equipo.
- **Abre el `LEEME.md` y el manifiesto del kit** (`final/efeonce-traje-bionico-nexa-manifiesto.json`): dicen qué vista
  corresponde a cada uso (`cuando_usarla`) y con qué medidas se armó cada marca.

## Paso a paso

### Paso 1 · Declara el traje, los lentes y el registro en la ficha

```json
{
  "id": "NX8-ejemplo",
  "formato": "16:9",
  "registro": "cine",
  "impacto": true,
  "identidad": [{ "persona": "nexa", "expresion": "conviccion" }],
  "objetos": [
    { "objeto": "traje-bionico-nexa" },
    { "objeto": "lentes-bionicos-nexa" }
  ]
}
```

- **`"registro": "cine"` es obligatorio** con el traje o los lentes. Sin él, `foto:prompt` aborta.
- **Sin `vista`, el traje llega PUESTO** en Nexa (la vista 13, recortada bajo el mentón para que el modelo no copie su
  gesto). Si la toma es de espaldas, pide `{ "objeto": "traje-bionico-nexa", "puesta": "espalda" }`: llega la vista 14,
  con el logo de la espalda a la vista. Las vistas aisladas (`"vista": "frente"`, `"tres-cuartos-izq"`,
  `"tres-cuartos-der"`, `"lateral"`, `"espalda"`) son para **construir** vistas nuevas del kit, no para escenas.
- **Los lentes** llegan en tres cuartos por defecto; si Nexa mira de frente al lente, `{ "objeto":
  "lentes-bionicos-nexa", "vista": "frente" }`.
- El macro de la pechera (vista 10) viaja solo en toda escena: no lo declares.

### Paso 2 · Elige la expresión de Nexa (o el ángulo)

Declara una de estas dos cosas en su entrada de `identidad`, o **las dos juntas** si Nexa está sola en la toma (el
ángulo sale de la vista y el gesto de la expresión: `{ "persona": "nexa", "vista": "45-izq", "expresion": "curiosa" }`,
medido en `NX7j`). Con dos personas, una sola:

| Quieres fijar… | Campo | Valores |
|---|---|---|
| El gesto de la cara | `expresion` | 12 fotográficas: `carcajada`, `risa-elegante`, `sorprendida`, `esceptica`, `pensativa`, `neutra`, `preocupada`, `conviccion`, `escucha-empatica`, `curiosa`, `complicidad`, `mirada-lateral`. También las ocho del Bible (`the-spark`, `the-read`, `the-point`…) |
| El ángulo de la cabeza | `vista` | Las vistas de Nexa (`45-izq`, `perfil-der`, `espalda`…); la lista sale en el error si pides una que no existe |

Las 12 expresiones comparten el **mismo tres cuartos**: aportan sólo ojos, cejas y boca, no el giro. **La pose la
describe la escena** («her head almost frontal, both eyes visible, looking straight into the lens…»). No copies
«confident half-smile» de una ficha a otra: es lo que hacía que todas las fotos salieran con la misma cara.

### Paso 3 · Escribe la escena sin describir el traje

En la `escena`, di sólo que lo lleva y dónde está la marca, **sin describir su diseño**. Frase aprobada en `NX7d`:

```text
She wears the bionic suit exactly as in its reference, WITH the small navy Efeonce isotype inlaid on her chest
plate on her left side exactly as in the reference and the macro (no other logo, no lettering), the bionic glasses
exactly as in their reference.
```

Con esa frase la ficha cumple también la regla de declarar el vestuario cuando hay identidad (el detector reconoce
`wears`, `suit` y `bodysuit`). El resto de la escena sigue la receta del registro cine: cámara a unos 2 m con 85 mm,
una fuente de luz con carácter, bruma, la reserva de texto a la izquierda y el lecho.

### Paso 4 · Si la escena lleva Sparks

Receta de la escena aprobada `NX7d` («Nexa despliega a su squad»):

1. **Dos Sparks con referencia como máximo**, los del plano cercano (por ejemplo `spark-reportes` y
   `spark-investigacion`, con `"vista": "cine"`).
2. **El resto, sin imagen propia**: nómbralos como «the same figures as the two Spark references», lejos (4 a 6 m),
   chicos y **fuera de foco**.
3. **Declara el conteo total**: «EXACTLY THREE more Sparks (FIVE in total, never more)». Si pides sólo «three more»,
   salen cuatro.
4. **Profundidad con distancias**: cerca nítido, a ~1 m casi nítido, a 4–6 m desenfocado, con la apertura (f/1.8).
5. **Contacto físico**: un Spark posado en su hombro, una mano sobre la placa.
6. **Una fuente con tamaño cerca de la cara** (el núcleo de luz en su palma) como la única luz principal, sin relleno.
7. **Geografía para la reserva**: nombra el elemento iluminado más a la izquierda y niega todo lo que quede a su
   izquierda.

Ficha completa: `ai-generations/2026-10-01_traje-bionico-nexa/fichas/NX7d-nexa-despliega-squad.json`. Las reglas de
los Sparks están en [usar los Sparks](./usar-sparks-en-fotos-de-marca.md).

### Paso 5 · Arma el prompt y genera

```bash
pnpm foto:prompt <ficha.json>                               # compila; lee el prompt y los avisos
pnpm foto:generar <ficha.json> --quality high --out <dir>   # genera con las referencias que la ficha declara
```

Lee los avisos de `foto:prompt` antes de gastar (ver «Qué significan los estados y avisos»).

### Paso 6 · Revisa las marcas al 100 %

```bash
pnpm foto:emblema <plate.png>
```

Compara el pecho con el macro `10-detalle-placa-isotipo`: la nave mirando a la derecha, las tres ventanas, la órbita
con sus cortes y el planeta arriba, en navy, al ras de la placa y del tamaño de un cuarto de la pechera. Si la toma es
de espaldas, revisa que el logo «efeonce» esté completo y bien escrito.

**Si la marca difiere o falta**, recompónla con el archivo oficial y deja que el modelo la termine:

```bash
# Pecho: isotipo incrustado
pnpm foto:isotipo <plate.png> --centro x,y --ancho w --prenda clara --acabado

# Espalda: logo completo serigrafiado
pnpm foto:isotipo <plate.png> --marca logotipo --centro x,y --ancho w --prenda clara --acabado \
  --tecnica "screen-printed with a slightly metallic navy ink, as on an aerospace metal panel"
```

`--centro` y `--ancho` van en fracciones del plate. Los comandos y las medidas con que se armó cada vista del kit
están en el manifiesto (`tecnica_de_marca`); úsalos como punto de partida. Después de `foto:isotipo`, **vuelve a mirar
al 100 %** el resultado: la limpieza puede tapar algo vecino.

### Paso 7 · Reproducir o ampliar el kit (sólo si cambia el diseño)

Una vista nueva del traje **se edita** desde una vista aprobada, nunca se genera de cero. Para entregar:

```bash
node ai-generations/2026-10-01_traje-bionico-nexa/entrega.mjs            # out/ → final/ en 1600×1600 y 1200×1600
pnpm ai:image:rmbg final/<vista>-fondo-estudio.png final/<vista>-transparente.png
node ai-generations/2026-10-01_traje-bionico-nexa/entrega.mjs --opacar   # opaca las placas del traje; nunca los lentes
```

`--opacar` existe porque el recorte deja las placas blancas semitransparentes (se confunden con el fondo gris); no se
aplica a los lentes, cuyo vidrio sí es translúcido.

### Paso 8 · Sellar y publicar al canon

```bash
pnpm foto:assets:lock                 # resella las huellas de lo que el catálogo declara
pnpm foto:assets:check                # confirma que catálogo y lock coinciden
pnpm creative:assets:publish plan     # muestra qué subiría al canon, sin subir
pnpm creative:assets:publish apply    # sube al canon (gs://efeonce-creative-canon)
```

Commitea el lock junto con el cambio del catálogo. Publicar al canon no publica la foto en ninguna red: es el
almacenamiento de referencias del equipo.

## Qué significan los estados y avisos

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| `foto:prompt` arma el prompt sin avisos | El traje está declarado, el registro es cine, Nexa tiene expresión o ángulo y las referencias están en disco | Generar |
| Error: «pide traje-bionico-nexa … con *persona* en cuadro» o «sin Nexa en `identidad`» | El traje o los lentes se pidieron para otra persona o en una ficha sin Nexa | Saca a la otra persona o viste a Nexa con el uniforme |
| Error: «pide … fuera del registro cine (declaraste `registro: …`)» | Falta `"registro": "cine"` o la ficha declara otro registro | Declara `"registro": "cine"` si la pieza está en los casos del cine; si no, usa el uniforme |
| Error: «se pidió `vista` y `expresion` a la vez … Elige una» | Las dos ocupan la misma referencia | Deja una: la expresión para el gesto, la vista para el ángulo |
| Error: «La expresion "…" no existe para Nexa» | Nombre mal escrito | El mensaje lista las disponibles |
| Error: «"traje-bionico-nexa" no tiene vista PUESTA "…"» | Pediste una `puesta` que no existe | La única puesta con nombre es `espalda`; sin `puesta`, llega la de frente |
| Aviso ⚠: «trae a Nexa sin `expresion` ni `vista`» | Sale con el gesto por defecto y la serie se repite | Agrega una `expresion` (o una `vista`) |
| Aviso ⚠: «no declara el VESTUARIO y hay identidad» | La escena no dice qué lleva Nexa | Agrega la frase del Paso 3 |

## Qué no hacer

- **No describas el traje ni los lentes en la escena** («a sleek bionic suit with white plates…»): el modelo lo
  redibuja distinto en cada corrida; así salió un cohete en la pechera.
- **No pidas la pechera lisa** para componer la marca después: las dos primeras escenas salieron sin logo. La marca
  viaja armada en la referencia.
- **No vistas con el traje a una persona del equipo**, ni lo uses fuera del registro cine.
- **No pidas `expresion` y `vista` a la vez**, ni copies la misma frase de gesto entre fichas.
- **No metas más de dos Sparks con referencia** en una toma cine: se ven como stickers.
- **No generes una vista nueva del kit desde cero**: edita desde una vista aprobada.
- **No apliques `--opacar` a los lentes.**
- **No resuelvas un archivo faltante regenerándolo** ni reselles el lock para tapar la falta.

## Problemas comunes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| La escena salió sin el isotipo en el pecho | La referencia o el macro no viajaron, o la escena pidió la pechera lisa | Revisa que la ficha declare `traje-bionico-nexa` sin `vista` y que la escena no niegue la marca; si igual falta, `foto:isotipo` (Paso 6) |
| Nexa sale siempre con la misma cara ladeada | La ficha no declara expresión y la escena repite «half-smile» | Declara `expresion` y describe la pose en la escena |
| Pedí una expresión y el ángulo no cambió | Las 12 expresiones comparten el mismo tres cuartos y aportan sólo el gesto | El ángulo se pide con `vista`, no con `expresion` |
| Los aretes salen dorados | Las vistas puestas del kit y las anclas los traen dorados | El operador aprobó las vistas del kit así. En la escena puedes pedirlos de plata (como hace la ficha de `NX7d`) y revisar al 100 %; si el smartwatch y el anillo van con el traje sigue sin decidir |
| Salió un Spark de más | La escena pidió «three more» sin el total | Declara «EXACTLY THREE more (FIVE in total, never more)» |
| Los Sparks del fondo se ven nítidos y del mismo tamaño | Llevan referencia propia | Deja referencia sólo a los dos del plano cercano |
| La versión con titular no pasa la columna de texto o el lecho | `NX7d` mide columna 0,38 (pide 0,42) y lecho 2,98:1 | Con titular, Nexa cerca del 70 % del ancho y la consola del lecho en negro mate no reflectante, fuera de la luz del núcleo |
| La placa blanca queda gris o transparente en el PNG recortado | El recorte confunde el blanco mate con el fondo de estudio | `entrega.mjs --opacar` sobre las vistas del traje |
| `foto:prompt` dice que falta un archivo del kit | Los PNG no están en tu copia local | `pnpm ai-gen:where` y `pnpm ai-gen:pull`; luego `pnpm foto:assets:check` |

## Referencias técnicas

- Catálogo y guarda: `scripts/foto/build-prompt.mjs` (entradas `traje-bionico-nexa` y `lentes-bionicos-nexa`,
  `validarTrajeNexa`, `PIEZAS_SOLO_NEXA_CINE`, `auditarExpresion`, expresiones de `nexa`); pruebas en
  `scripts/foto/build-prompt.test.ts`
- Composición de marcas: `scripts/foto/isotipo.mjs` (`--marca isotipo|logotipo`, `--tecnica`, `--acabado`); pruebas en
  `scripts/foto/isotipo.test.ts`
- Kit: `ai-generations/2026-10-01_traje-bionico-nexa/` (`LEEME.md`, `entrega.mjs`, `brief/`, `fichas/`, `prompts/`,
  `final/` con el manifiesto); imágenes fuera de git, selladas en `scripts/foto/assets.lock.json`
- Publicación al canon: `scripts/creative-workbench/assets-publish.mjs`; contrato
  [`AI_GENERATIONS_STORAGE_V1.md`](../../operations/AI_GENERATIONS_STORAGE_V1.md)
- Canon: [registro cine §7.1 y delta 2026-10-02](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) ·
  [prompts y pipeline, delta 2026-10-02](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) ·
  [selección de referencias de marca](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md)
- Task: TASK-1940
- Pendiente fuera del repo: copia del kit en OneDrive `5. Contenidos/13- Branding/` (la hace el operador)
