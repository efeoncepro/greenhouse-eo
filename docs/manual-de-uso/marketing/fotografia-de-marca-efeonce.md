# Manual: producir una foto de marca Efeonce

> **Tipo de documento:** Manual de uso (operador)
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-20
> **Documentación relacionada:** [Índice de fotografía de marca](../../operations/brand-photography/README.md) · [Lenguaje fotográfico (maestro)](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Firma](../../operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [Colorimetría](../../operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md) · [Cámaras, lentes y ángulos](../../operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [Bloques de prompt y pipeline](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [Personas](../../operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md)

## Lo más corto que funciona

```bash
pnpm foto:doctor                                  # 0. ¿esta máquina puede generar? (no cuesta nada)
pnpm foto:prompt --ficha-ejemplo > ficha.json     # 1. plantilla; edita escena, lecho y reservas
pnpm foto:prompt ficha.json --batch batch.json    # 2. arma el prompt (imprime el ai:image exacto)
pnpm ai:image --batch batch.json --out <dir> --model gpt-image-2.5-flare --quality high --size <el que imprimió>
pnpm foto:validar <dir>/<archivo>-plate.png       # 3. ¿sirve? con números, no a ojo
pnpm foto:emblema <plate.png>                     # 4. si hay prenda: amplía el bordado para mirarlo
```

Tres reglas que ahorran plata:

1. **No escribas el prompt a mano.** El comando resuelve el formato, el porcentaje del lecho y el límite de
   sujetos desde una tabla. Armarlo a mano fue la vía por la que un valor de 4:5 terminó dentro de un bloque que
   corría en todos los formatos, sin que nadie lo viera.
2. **Valida antes de componer.** Si el plate no pasa, se **regenera**; no se parcha con un scrim ni al componer.
3. **Piloto antes de la tanda.** Tres plates cuestan USD 0,15 y te dicen si el prompt sirve. Cincuenta cuestan
   USD 2,50 y te dejan cincuenta imágenes que alguien tiene que mirar.


## Para qué sirve

Para producir fotos de la **marca propia de Efeonce** (redes, web, presentaciones, propuestas) que se reconozcan como
nuestras por su luz, su color y su firma, y que **no parezcan hechas con IA**. El lenguaje lo aprobó Julio Reyes el
2026-09-19.

Qué hace una foto Efeonce, en una línea: **se ve el oficio trabajando** (obra, dato o sistema, y personas decidiendo),
con **color natural**, el **azul `#0375DB`** siempre presente, **un** acento (naranja = la idea, lima = el
resultado) y, abajo, un **primer plano desenfocado planeado** donde va el logo.

No sirve para piezas de clientes ni para trendjacking que toma prestada una estética ajena.

## Antes de empezar

| Necesitas | Detalle |
|---|---|
| Repo local | `/Users/jreye/Documents/greenhouse-eo` con `pnpm install` hecho |
| Acceso a generación | `pnpm ai:image` funcionando (el secreto de OpenAI se resuelve solo; si falla, ver problemas comunes) |
| Leer 10 minutos | La tabla de principios de [Colorimetría §1](../../operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md#1-principios-en-una-tabla) y el catálogo de tomas |
| Presupuesto | ≈ USD 0,05 por imagen en `high`; ≈ USD 0,09 en `xhigh`; ediciones ≈ USD 0,07–0,10 |
| Una idea concreta | Qué servicio se ve trabajando, en qué industria **que no sea de un cliente real** y en qué ciudad |

## Paso a paso

### 1. Crea tu carpeta de trabajo

```bash
cd /Users/jreye/Documents/greenhouse-eo
RUN=ai-generations/$(date +%F)_tema
mkdir -p $RUN/rondas/r1 $RUN/scripts
cp ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/{medir.mjs,metricas.cjs,componer.mjs} $RUN/scripts/
```

Trabaja siempre en `ai-generations/`, nunca en `.captures/` (se borra) ni en `public/`.

### 2. Llena la ficha de la toma

Una ficha por foto. Plantilla completa en
[pipeline §2](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#2-ficha-de-toma-plantilla).
Lo mínimo:

1. **Servicio y obra:** ¿qué se está haciendo? (una prueba de KV, un pipeline que se gana, un rodaje).
2. **Toma:** elige una del [catálogo](../../operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md)
   (asiento en la mesa, tilt-shift, tele 200, ojo de pez, reflejo…).
3. **Luz y momento:** haz de sol, persianas, hora dorada, contraluz o noche; y el pico de la acción.
4. **Azul:** cómo aparece naturalmente en la composición (luz, reflejo, material, superficie o relación entre planos). No hace falta añadir un objeto azul.
5. **Acento:** naranja **o** lima, y cómo se integra a la situación. Puede ser una relación cromática de la escena; nunca un adorno puesto para completar la paleta.
6. **Primer plano (lecho) y su tono:** la herramienta o superficie más cercana a la cámara, **oscura** o **muy clara**.

### 3. Arma el prompt

Parte de `pnpm foto:prompt --ficha-ejemplo` y completa la ficha JSON. Declara escena, fuente de luz, momento,
materia y tono del lecho, formato y reservas. Cuando aplique, agrega `identidad` con la vista, `objetos`, una sola
`palanca`, `atmosfera` con su haz y `suspendido` con la dosis de la serie. `foto:prompt` incorpora los bloques
canónicos, el formato, el porcentaje del lecho y el límite de sujetos; **no concatenes bloques a mano**.
Detalle de cada campo y sus guardas en el [pipeline §4.2](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md).

### 4. Genera

Para varias fotos, guarda las fichas en un JSON y deja que `foto:prompt` arme el lote:

```bash
pnpm foto:prompt $RUN/rondas/r1/fichas.json --batch $RUN/rondas/r1/batch.json
# Ejecuta el comando pnpm ai:image que imprime foto:prompt: modelo, tamaño y referencias dependen de la ficha.
```

- Con **Julio o Nexa** (referencias de identidad): usa `--model gpt-image-2.5-sunburst` y el procedimiento de
  [Personas](../../operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md).
- `--out` en modo lote es la **carpeta**, sin extensión.
- `xhigh` sólo para el master final aprobado.

### 5. Revisa en grupo

Abre todas las fotos juntas. Descarta las que se vean genéricas (reunión sin obra), sucias, con marcas de terceros o
con el mismo objeto azul que otra pieza de la serie.

### 6. Mide el primer plano

```bash
cd $RUN
node scripts/medir.mjs rondas/r1/A1-plate.png '{"lecho":[0.30,0.87,0.70,0.995]}'
```

Buscas: `max` ≤ ~25, `p99` ≤ ~20 y `lum media` **oscura (≤ ~60) o muy clara (≥ ~180)**. Si no, regenera (paso 4) con
el arreglo de la tabla de problemas comunes.

### 7. Si hay una pantalla, cúrala (no la pegues)

Pide la pantalla en verde puro (`#00FF00`) al generar, prepara la UI de referencia y edítala con máscara. Receta
completa en [pipeline §6](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#6-curación-generativa-de-pantallas).

### 8. Firma

```bash
LOGO=0.20 node scripts/componer.mjs rondas/r1/A1-plate.png rondas/r1/A1-final.png
```

Usa **`LOGO=0.20`** para hacer explícita la decisión vigente; el script también usa 20 % por defecto. El script elige blanco o navy y te
dice el contraste: debe ser **≥ 4,5:1**. Para la selección con cursores (1 de cada 3 piezas, aprox.) ver
[pipeline §7](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#7-composición-de-la-firma-y-selección-axis-componermjs).

No firmes cuando el emblema bordado del polo se lee grande o cuando la nave/logo 3D es protagonista: una sola marca
por foto.

### 9. Mide el color

```bash
node scripts/metricas.cjs A1=rondas/r1/A1-plate.png
```

Compara con los rangos de [Colorimetría §7.4](../../operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md#74-rangos-objetivo-por-contexto).

### 10. QA al zoom y entrega

Recorre el checklist de
[pipeline §8](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#8-qa-final-checklist)
al 200 %: manos, caras, identidad, emblemas letra por letra, marcas de terceros, texto fantasma. Entrega en PNG.

## Qué significan las señales

### Nitidez del primer plano (`medir.mjs`)

| Señal | Valor bueno | Qué significa si falla |
|---|---|---|
| `max` | ≤ ~25 | Hay un borde nítido bajo el logo |
| `p99` | ≤ ~20 | El lecho no está desenfocado; parecerá una banda puesta |
| `lum media` | ≤ ~60 u ≥ ~180 | Tono medio (≈ 100–175): el logo no tendrá contraste ni en blanco ni en navy |

### Contraste del logo (`componer.mjs`)

| Señal | Valor | Acción |
|---|---|---|
| `blanco 18.82:1` / `navy 8.89:1` | ≥ 4,5:1 | OK |
| < 4,5:1 | Falla | Regenera con el lecho más oscuro o más claro; no retoques la foto |

### Color (`metricas.cjs`)

| Columna | Lectura simple | Valor habitual |
|---|---|---|
| `quemado` | % de blancos sin textura | ≤ 1 % (contraluz ≤ 3 %) |
| `aplastado` | % de negros sin detalle | ≤ 5 % (noche ≤ 8 %) |
| `contraste` | Rango de luces a sombras | 70–90 en piezas de impacto |
| `bAltas` | Temperatura de las luces (+ cálido, − azulado) | +2 a +12 (dorada hasta +21) |
| `bSombras` | Tinte de las sombras (− = azules) | −3 a +3 |
| `azul` | % de azul en el cuadro | 1–7 % (acento) o ≥ 18 % (campo). **10–18 % en una prenda = mal** |
| `naranja` / `lima` | % del acento | Pequeño; sirve para ver exceso |
| `dispTono` | Cuántas familias de color hay | ≤ 30° en piezas monocromas; más es normal con piel y azul |
| `piel` | Luminosidad/saturación de piel | L 44–61, C 18–31 |

## Qué no hacer

- **No** apliques filtros, LUT ni «grade»: el color es natural. Si el color falla, regenera.
- **No** pegues interfaces, logos ni textos sobre la foto (salvo el logo de la firma con `componer.mjs`).
- **No** uses la categoría de un cliente real (p. ej. pintura, que es Berel) ni etiquetes cursores con nombres de
  clientes. «Nosotros NO somos Berel».
- **No** vistas de navy al equipo sobre un set azul; **no** pongas navy en pared + ropa + logo a la vez.
- **No** pongas el azul en una prenda grande; o es un punto o es un campo.
- **No** pongas dos acentos (naranja **y** lima) en la misma foto.
- **No** pidas suciedad para «que parezca real»: realismo = personas, luz y materiales.
- **No** repitas el mismo objeto azul (la taza) en varias piezas de una serie.
- **No** publiques una foto con personas generadas como si fueran el equipo real sin decidirlo con el operador: para
  publicar, el equipo real es la base; la IA sirve para explorar, espacios, objetos y 3D.
- **No** llames «activo distintivo» a este lenguaje todavía: falta la prueba de reconocimiento.

## Problemas comunes

| Problema | Causa | Arreglo |
|---|---|---|
| El logo no pasa 4,5:1 | Lecho de madera de tono medio | Declarar «DARK near black» o «VERY LIGHT, … almost white, the brightest surface in the lower frame» |
| El primer plano sale nítido (latas, botellas) | El modelo no lo acercó al lente | «the lens is almost touching … shot wide open at f/1.4 … no shapes, highlights, edges or details at all» |
| Blancos azulados | Balance frío | Bloque de balance de blancos y exposición |
| Mesa de luz o ventanas quemadas | Exposición para las sombras | «Exposed for the highlights»; «backlight dimmed to a soft glow»; «highlights keep detail (no pure white areas)» |
| Noche con negros planos | Sombras sin información | Regla de noche («shadows deep but ALWAYS with visible texture») |
| Aparece una marca en una cámara o botella | Marca de terceros | «completely unbranded, generic … no brand names, no text, no logos anywhere on the body» + revisar al zoom |
| La cara de Julio o Nexa cambió | Referencias sin rol o modelo Flare | Sunburst + bloque IDENTITY + «Images 1-3 are Julio (identity only…)» |
| `pnpm ai:image` con varias `--image` en una variable falla | zsh no divide la variable | `pnpm ai:image ${=R} …` |
| Un `cp` con `*` aborta entero | Glob sin coincidencias en zsh | `setopt nullglob` |
| Las imágenes del lote aparecen en `public/images/generated` | Versión antigua del CLI | Actualizar el repo (arreglado en el commit `5946f14a0`) y pasar `--out <carpeta>` |
| La edición de pantalla deja una persona «fantasma» | Máscara rectangular | Máscara desde el verde, con `extractChannel(0)` |
| El logo parece sello o marca de agua | Lecho, posición o doble presencia de marca | Revisa la composición y conserva el ancho aprobado de 20 %; evita firmar si otro emblema ya protagoniza la foto |
| La foto se ve genérica | Reunión sin obra ni dato | Volver a la ficha: ¿qué oficio se ve trabajando? |

## Referencias técnicas

| Tema | Documento |
|---|---|
| Principios, idea y decisiones | [Lenguaje fotográfico V1](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) |
| Primer plano y logo | [Firma](../../operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) |
| Color y métricas | [Colorimetría](../../operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md) |
| Tomas y lentes | [Catálogo](../../operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) |
| Prompts, comandos, scripts, QA, costos | [Pipeline](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) |
| Julio, Nexa y uniforme | [Personas](../../operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) |
| Evidencia (prompts y scripts) | `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/` |
| CLI de imagen | `scripts/ai/generate-image.ts` (`pnpm ai:image --help`) |


## Si en la foto aparece ropa, el lanyard, el logo 3D o una mascota

🔴 **No le pidas al modelo que dibuje la marca.** No la sostiene: medido, cuatro pasadas sobre la misma
pieza dieron cuatro logotipos distintos, y tres prendas dieron tres emblemas de los que ninguno era el
de Efeonce.

**Hay 279 archivos en 10 kits.** La vista que necesitas casi seguro ya existe; el trabajo es elegirla:

| Si vas a… | Pásale al modelo |
|---|---|
| Vestir a alguien o poner la pieza en la escena | la **pieza en uso**: la vista `puesto`, la prueba en persona del kit, o el conjunto terminado |
| Construir un armado o un bodegón | la **pieza aislada** sobre transparente |
| Producir una vista nueva del kit | el **arte plano** |

**Antes del prompt, abre el `LEEME.md` y el manifiesto del kit**: dicen `cuando_usarla` por vista. Y si
el kit trae **prueba en persona**, empieza por ahí: ya resolvió calce, orientación y legibilidad.

Para armar una pieza con marca desde cero —un lanyard con el carnet de alguien— el comando es:

```bash
pnpm foto:lanyard --nombre "<Nombre>" --cargo "<Cargo>" --foto <retrato.png> --generar
```

Arma la pieza determinísticamente y le pide al modelo **sólo el acabado**: tejido, relieve, plástico,
metal, sombras. Si el retrato es de cuerpo entero, recorta cabeza y hombros antes o la cara queda
diminuta en el carnet.

Contrato completo, con el inventario y los casos medidos:
[selección de referencias de marca](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md).
