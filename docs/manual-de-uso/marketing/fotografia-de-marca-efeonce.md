# Manual: producir una foto de marca Efeonce

> **Tipo de documento:** Manual de uso (operador)
> **Versión:** 1.1
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-10-03 por Claude (1.1: elenco de marca y grupos de 3 a 5, ropa elegida según quién la viste y cómo está parada, las 25 expresiones de Nexa, `pnpm foto:rostro`, referencias que se bajan solas del canon y qué hacer al sumar algo nuevo)
> **Documentación relacionada:** [Índice de fotografía de marca](../../operations/brand-photography/README.md) · [Lenguaje fotográfico (maestro)](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Firma](../../operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [Colorimetría](../../operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md) · [Cámaras, lentes y ángulos](../../operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [Bloques de prompt y pipeline](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [Personas](../../operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) · [Elenco de marca](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md) · [Selección de referencias de marca](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) · [Almacenamiento de `ai-generations/`](../../operations/AI_GENERATIONS_STORAGE_V1.md) · [Explicación funcional: elenco y referencias](../../documentation/creative/elenco-y-referencias-de-fotografia.md)

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
| `gcloud` con sesión | Las referencias aprobadas (caras, prendas, expresiones) se bajan solas del bucket canon al armar el prompt; para eso `gcloud storage` tiene que funcionar. No necesitas tenerlas en disco de antemano |

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

### 3b. Si en la foto sale gente: a quién pides y cómo

Las personas se piden en `identidad`. Hay tres fuentes y se piden igual:

| Quién | Clave | Para qué |
|---|---|---|
| **Equipo real** (roster) | la de su ficha, p. ej. `julio` | La persona real, en su rol real |
| **Elenco de marca** (ficticio) | `hum`, `karo`, `sophia`, `isabella`, `antonio` | Interpretar el rol de su línea de servicio en campaña, social, deck y propuestas |
| **Nexa** | `nexa` | El personaje de marca, con su Character Bible |

```json
"identidad": [{ "persona": "karo", "vista": "45-der" }]
```

Las vistas del elenco son `frente`, `elegida`, `cuerpo`, `45-izq`, `45-der`, `perfil-izq`, `perfil-der` y `manos`.

**Quién es quién en el elenco** (detalle en el [Elenco de marca](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md)):

| Clave | Personaje | Línea | Rol |
|---|---|---|---|
| `hum` | Hum, 33, venezolana | `growth` | Estratega de crecimiento y medición |
| `karo` | Karolyne «Karo», 28, venezolana | `brand` | Directora de arte y creadora de contenido |
| `sophia` | Sophia, 31, venezolana (hermana mayor de Karo) | `engine` | Estratega SEO/AEO y analítica web |
| `isabella` | Isabella, 27, colombiana (Barranquilla) | `voice` | Especialista de medios pagados y distribución |
| `antonio` | Antonio, 35, mexicano (CDMX) | `revenue-hubspot` / `revenue-salesforce` | Líder de RevOps y CRM |

El elenco se usa **cuando hace falta** (fotos de varias personas o de equipo), no es obligatorio que salga alguien
del elenco. En palabras del operador: «debe usarse el elenco si es necesaria su inclusión».

**Cuántas personas caben:**

| Caso | Regla |
|---|---|
| Una o dos personas | Cualquier combinación |
| Grupo de **3 a 5** | Cualquier combinación de personajes del elenco, Nexa y Julio. Cada persona lleva una referencia frontal y la luz de las referencias no viaja a la foto: la luz la pone la escena |
| Tres o más con otra persona del roster | No está medido: el comando lo rechaza. Divide la pieza |
| La misma persona dos veces | Error («aparece dos veces»): cada persona va una sola vez |

`vista` y `expresion` juntas sólo se combinan con **una persona sola** en la toma.

**Julio** tiene 37 años con canas prematuras. El comando pide conservar su edad aparente exactamente como en las
referencias, sin rejuvenecerlo ni envejecerlo. Si sale distinto, es una falla de la toma, no algo que se arregle
describiéndolo en la escena.

### 3c. Nexa: elige la expresión por la escena

Nexa tiene **25 expresiones casi de frente**, aprobadas por el operador el 2026-10-03. Se piden así:

```json
"identidad": [{ "persona": "nexa", "expresion": "concentracion" }]
```

| Grupo de uso | Claves |
|---|---|
| Éxito | `euforia` (cabeza atrás, puños arriba) · `alivio` · `orgullo-sereno` · `te-lo-dije` |
| El «antes» del problema | `hartazgo` · `agobio` · `alarma` · `confusion` |
| Foco | `concentracion` · `determinacion` · `explicando` |
| Social | `bienvenida` · `mirada-lateral` (mira a la **derecha** del cuadro) · `mirada-lateral-izq` (mira a la **izquierda**) |
| Base | `carcajada` · `risa-elegante` · `sorprendida` · `esceptica` · `pensativa` · `neutra` · `preocupada` · `conviccion` · `escucha-empatica` · `curiosa` · `complicidad` |

Siguen disponibles las ocho del Character Bible (`the-spark`, `the-read`, `the-point`…).

Qué hace el comando: el **ancla frontal de Nexa va siempre primero** y la expresión detrás, sólo para el gesto. La
pose y el giro de la cabeza los da la escena: descríbelos ahí. En un **grupo** (una referencia por persona) la
expresión no viaja: el gesto de Nexa también lo da la escena. `foto:prompt` avisa si traes a Nexa sin `expresion` ni
`vista`.

Para revisar que la cara no salió afinada, mide con `pnpm foto:rostro` (paso 3f).

### 3d. La ropa corporativa: la vista puesta se elige sola

Cuando alguien viste el bomber, la softshell, el polo, el hoodie o la gorra, declara la prenda en `objetos` y di
**quién la viste**. `foto:prompt` elige la vista del kit que corresponde según:

- **quién la viste** (hombre o mujer): con `persona` en el objeto o, si hay una sola persona en `identidad`, esa;
- **cómo está parada**: el giro sale de la vista de identidad (`45-*` → 45°, `perfil-*` → 70°) o de `giro`;
- **la cámara**: `camara: "baja"` elige la vista desde abajo;
- **qué tapa la marca**: `tapa: "mano" | "cruza" | "objeto" | "brazos"` elige la vista con esa oclusión. Con una
  sola persona, el comando lo infiere de la escena.

```json
"objetos": [
  { "objeto": "polo-efeonce", "persona": "isabella", "tapa": "cruza" },
  { "objeto": "chaqueta-bomber-efeonce", "persona": "karo", "giro": "espalda-45-izq", "camara": "baja" }
]
```

Valores de `giro`: `frente`, `45-izq`, `45-der`, `70-izq`, `70-der`, `espalda`, `espalda-45-izq`, `espalda-45-der`,
`espalda-70-izq`, `espalda-70-der`. **De espaldas, `giro` es obligatorio.** El lado dice hacia qué borde del cuadro
apunta la nariz.

Si no existe la vista exacta, el comando baja por una cadena de respaldo (oclusión → cámara baja → giro → 45° del
mismo lado → frente o espalda), probando primero la de la silueta, y te avisa. El ángulo pesa más que la silueta.
Para forzar una vista concreta, usa `puesta` en el objeto.

En un **grupo**, pon `persona` en **cada prenda**: sin ella, la prenda va de frente y el comando avisa.

El kit trae 126 vistas puestas (bomber, softshell, polo y hoodie, hombre y mujer: frente, 45° y 70° a cada lado,
cámara baja, espalda, y las oclusiones mano, taza, tablet y brazos cruzados; la gorra, frente, 45° y 70°). El
macro del bordado viaja con la prenda; la gorra no lleva macro.

Si una mano tapa la marca, lo correcto es que se vea **sólo la parte que la mano no tapa**, a su tamaño real. Si la
toma salió con la marca inventada y hay que componer la oficial, `pnpm foto:isotipo` la pone **por detrás** de la
mano. Si no queda limpio, se rehace la toma; nunca se compone una marca más chica al lado de la mano.

### 3e. Las referencias se bajan solas del canon

No necesitas tener las imágenes de referencia en disco. Al correr `pnpm foto:prompt` o `pnpm foto:generar`, cada
referencia aprobada se revisa contra su huella sellada:

- si **falta** en disco, se baja del bucket canon;
- si está pero **no es la aprobada** (hay una versión más nueva), se baja la aprobada y tu copia queda **aparte** con
  el nombre `<archivo>.local-<huella>.<ext>`. Nunca se pisa: puede ser trabajo nuevo tuyo.

Los archivos pasan por tu máquina como caché, no como copia permanente del repo. Para trabajar sin red o con copias
locales a propósito: `FOTO_SIN_CANON=1 pnpm foto:prompt …`.

Lo que no se aprobó (exploración, descartes) no va al canon: se **archiva** con `pnpm ai-gen:archive` y se recupera
con `pnpm ai-gen:pull <carpeta>`. Archivar no es borrar. Detalle en
[Recuperar y archivar `ai-generations/`](../creative/recuperar-y-archivar-ai-generations.md).

### 3f. Revisa la proporción de la cara con `pnpm foto:rostro`

```bash
pnpm foto:rostro <plate.png> --persona nexa
```

Mide el largo contra el ancho de la cara (de los ojos al mentón, contra el ancho de la mandíbula) y lo compara con el
canon de la persona (Nexa: 0,81 ± 0,02). Sólo funciona en macOS. No mide caras giradas, con la boca abierta ni con
los ojos cerrados. Úsalo cuando sospeches que la cara salió afinada o alargada.

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

### La línea `·` de cada prenda (`foto:prompt`)

Por cada prenda puesta, `foto:prompt` imprime una línea así:

```text
· A1: "polo-efeonce" para isabella → vista puesta «…» (motivo). Otras: …; fuerza otra con "puesta".
```

| Parte | Qué te dice |
|---|---|
| `para isabella` | De quién tomó la silueta |
| `vista puesta «…»` | La vista del kit que va a viajar al modelo |
| `(motivo)` | Por qué la eligió: giro, cámara, oclusión o respaldo |
| `Otras: …` | Todas las vistas de esa prenda. Si la elegida no te sirve, copia una en `puesta` |

Si avisa que no existe la vista exacta, mira la alternativa que eligió antes de gastar.

### Referencias del canon (`foto:prompt` / `foto:generar`)

| Señal | Qué significa |
|---|---|
| `⇣ <ruta> (canon)` | Faltaba en disco y se bajó del canon, con la huella verificada |
| `↺ <ruta>: la copia local no era la aprobada; quedó aparte en …` | Tenías una versión distinta: se bajó la aprobada y la tuya quedó al lado con `.local-<huella>` |
| `⚠ <ruta>: no se pudo traer del canon (…)` | Falló la descarga (normalmente `gcloud` sin sesión). Autentícate y vuelve a correr |

### Proporción de la cara (`foto:rostro`)

| Salida | Qué significa |
|---|---|
| Sale con 0 | Las caras casi frontales están dentro del canon |
| Sale con 1 | Alguna cara frontal quedó fuera: afinada o alargada. Regenera |
| Sale con 2 | No pudo medir (cara girada, boca abierta, ojos cerrados o sin cara) |

Con los ojos en blanco (`hartazgo`) mide un poco más alto sin estar afinada: en ese caso, mira a ojo.

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
- **No** uses al elenco como si fuera el equipo real (página de equipo, firmas, LinkedIn), como cliente o testimonio,
  ni pongas su nombre en pantalla salvo en una narrativa declarada como ficción. Tampoco le cambies el rol ni la línea.
- **No** obligues a que salga alguien del elenco: se suma cuando la foto lo necesita.
- **No** pidas a la misma persona dos veces en `identidad`, ni grupos de tres o más con personas del roster que no
  sean Julio.
- **No** describas a mano la prenda ni el ángulo de la marca: di quién la viste y cómo está parada; si quieres otra
  vista, usa `puesta`.
- **No** compongas una marca más chica al lado de una mano. Si `foto:isotipo` no la deja limpia, rehaz la toma.
- **No** borres una copia `.local-<huella>` sin mirarla: puede ser trabajo tuyo que nadie selló.
- **No** borres exploración a mano: archívala con `pnpm ai-gen:archive` para que se pueda recuperar.

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
| Nexa sale siempre con la misma pose (cabeza ladeada, media sonrisa) | La ficha no declara expresión y copia «confident half-smile» | Declarar `{ "persona": "nexa", "expresion": "…" }` (una de las 25) o una `vista`, y describir la pose en la escena; `foto:prompt` avisa si falta |
| Nexa sale con la cara demasiado fina o alargada | Se usaba una referencia frontal más estrecha que el resto | Ya corregido (ancla frontal v2). Si vuelve a pasar, mide con `pnpm foto:rostro --persona nexa` y regenera |
| Error «aparece dos veces» | La misma persona está dos veces en `identidad` | Déjala una vez; su vista o expresión va en esa entrada |
| Error «Más de dos personas con identidad … no está medido» | Grupo de tres o más con alguien del roster que no es Julio, o más de cinco | Usa elenco, Nexa y Julio, o divide la pieza |
| En un grupo, una prenda salió de frente cuando la persona estaba girada | La prenda no dice quién la viste | Agrega `persona` en cada prenda del grupo |
| La marca salió rotada o cortada en una prenda de espaldas | Falta `giro` o no existe esa vista | Declara `giro`; revisa la línea `·` y fuerza con `puesta` si hace falta |
| `⚠ … no se pudo traer del canon` | `gcloud` sin sesión o sin red | Autentícate con gcloud y repite; para trabajar sin red, `FOTO_SIN_CANON=1` |
| Apareció un archivo `.local-<huella>` junto a una referencia | Tu copia local no era la aprobada | Revísala: si era trabajo nuevo, súmalo con el procedimiento de «Al sumar algo nuevo» |
| `pnpm ai:image` con varias `--image` en una variable falla | zsh no divide la variable | `pnpm ai:image ${=R} …` |
| Un `cp` con `*` aborta entero | Glob sin coincidencias en zsh | `setopt nullglob` |
| Las imágenes del lote aparecen en `public/images/generated` | Versión antigua del CLI | Actualizar el repo (arreglado en el commit `5946f14a0`) y pasar `--out <carpeta>` |
| La edición de pantalla deja una persona «fantasma» | Máscara rectangular | Máscara desde el verde, con `extractChannel(0)` |
| El logo parece sello o marca de agua | Lecho, posición o doble presencia de marca | Revisa la composición y conserva el ancho aprobado de 20 %; evita firmar si otro emblema ya protagoniza la foto |
| La foto se ve genérica | Reunión sin obra ni dato | Volver a la ficha: ¿qué oficio se ve trabajando? |

## Al sumar algo nuevo

Lo aprobado sólo cuenta cuando está **sellado y publicado en el canon**. Resumen por caso (detalle en
[selección de referencias de marca](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md),
[elenco](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md) y el `LEEME.md` de cada carpeta):

| Si sumas… | Pasos |
|---|---|
| **A. Una vista nueva de una prenda** | Genera **editando** una vista puesta aprobada (con el macro), revisa al 100 % con `pnpm foto:emblema` (esfera arriba, ventanas horizontales, letras exactas), copia a `final/` con la convención de nombre, declárala en `usoPorVista` con su clave `<giro>[-<tapa>\|-bajo][-mujer]`, agrégala al manifiesto del kit (`cuando_usarla`) y su prompt a `brief/` |
| **B. Un personaje nuevo del elenco** | Ficha en el elenco, candidatos con piel real, el operador elige, vistas por edición desde la elegida, cuerpo entero a escala medida, carpeta `_identidad-elenco/<clave>/` con los 8 archivos y entrada en `ELENCO` |
| **C. Una expresión nueva de Nexa** | Método A2 (ancla frontal + la causa de la expresión), medir con `pnpm foto:rostro --persona nexa`, copiar a `_identidad-nexa/5-expresiones-frente/nexa-expr-NN-<clave>.png` y entrada en `expresiones` de Nexa |
| **D. Una persona nueva con proporción declarada** | Medir con `pnpm foto:rostro` sobre sus imágenes aprobadas casi frontales y declarar `rostro: { largoAncho, tolerancia }` |

Y en todos los casos, al final:

```bash
pnpm foto:assets:lock                 # sella la huella
pnpm creative:assets:publish apply    # publica al canon
pnpm exec vitest run scripts/foto     # pruebas de foto
pnpm ai-gen:archive apply --folder <carpeta-de-exploración>
```

Documenta el cambio en el `LEEME.md` de la carpeta. No cites rutas de corridas en comentarios de código: una carpeta
citada queda protegida y no se puede archivar.

## Referencias técnicas

| Tema | Documento |
|---|---|
| Principios, idea y decisiones | [Lenguaje fotográfico V1](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) |
| Primer plano y logo | [Firma](../../operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) |
| Color y métricas | [Colorimetría](../../operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md) |
| Tomas y lentes | [Catálogo](../../operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) |
| Prompts, comandos, scripts, QA, costos | [Pipeline](../../operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) |
| Julio, Nexa y uniforme | [Personas](../../operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) |
| Elenco de marca (personajes, fichas, cómo se construyen) | [Elenco](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md) |
| Nexa: identidad, proporción y expresiones | [Ficha del Character Bible](../../operations/brand-photography/NEXA_CHARACTER_BIBLE_FICHA_V1.md) · `ai-generations/_identidad-nexa/LEEME.md` |
| Vistas puestas del uniforme y elección automática | [Selección de referencias](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) · `ai-generations/2026-10-03_uniforme-vistas/LEEME.md` · `elegirPuesta` en `scripts/foto/build-prompt.mjs` |
| Canon y archivo | [Almacenamiento de `ai-generations/`](../../operations/AI_GENERATIONS_STORAGE_V1.md) · `scripts/foto/canon-sync.mjs` |
| Medidor de proporción de la cara | `scripts/foto/rostro.mjs` (`pnpm foto:rostro`) |
| Producir una foto cine sin consultar a nadie | [Producir una foto de marca en registro cine](../creative/producir-foto-cine-de-marca.md) · [Casebook](../../operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md) |
| Nexa cine con Nano Banana 2.1 explícito, 4K/high | [Desvío de generación](../creative/producir-foto-cine-de-marca.md#generar-con-nano-banana-21-cuando-lo-elige-el-operador) · [Prueba y comparación con Sunburst](../../audits/ai-tooling/2026-10-06-nexa-cine-nano-banana-2-1-vs-sunburst.md); mismos gates, sin cambio de defaults ni alta de receta |
| Nexa con su traje biónico y lentes (sólo cine) | [Usar el traje biónico de Nexa en fotos](../creative/usar-traje-bionico-de-nexa-en-fotos.md) |
| Evidencia (prompts y scripts) | `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/` |
| CLI de imagen | `scripts/ai/generate-image.ts` (`pnpm ai:image --help`) |


## Si en la foto aparece ropa, el lanyard, el logo 3D o una mascota

🔴 **No le pidas al modelo que dibuje la marca.** No la sostiene: medido, cuatro pasadas sobre la misma
pieza dieron cuatro logotipos distintos, y tres prendas dieron tres emblemas de los que ninguno era el
de Efeonce.

**Hay 279 archivos en 10 kits (inventario del 2026-09-21; el 2026-10-03 se sumaron 126 vistas puestas).** La vista que necesitas casi seguro ya existe; el trabajo es elegirla:

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
