# Editar solo una zona de una imagen (inpainting con mascara)

> **Tipo de documento:** Manual de uso
> **Version:** 2.1
> **Creado:** 2026-09-16 por Claude
> **Ultima actualizacion:** 2026-10-03 por Claude — (2.1, TASK-1965 + TASK-1973) nueva seccion «Para agentes»: arbol de decision por intencion con los ganadores medidos, lineas de comando, codigos de salida y que hacer con cada uno, regla del tope de costo y checklist de revision al 100 %; codigo 1 y tope de costo en la tabla de senales; tabla de tecnicas hermanas (borrar, expandir, mover, incorporar, fondo, detalle). Antes (2.0, TASK-1965) el flujo pasa a dos comandos: `pnpm ai:mask` arma y valida la mascara y `pnpm ai:inpaint image` recorta, genera, **recompone y verifica solo**: la zona protegida queda en delta maximo 0 o el comando sale con codigo 2. Los snippets de `node -e` y el codigo de recomposicion a mano quedan retirados. Nuevo: Sunburst con mascara devuelve un panel negro plano (3 de 3 pasadas medidas); el default es Flare y Sunburst edita sin mascara (`--provider-mask auto`). Antes (1.8) la mascara no sirve para mover material que ya esta en la foto; (1.7) GPT Image 2.5 regenera la imagen entera aunque reciba la mascara; (1.6) el halo para integrar un objeto real es la excepcion, no el default; (1.2) validacion de `--size`/`--background` y costo estimado antes de pedir.
> **Modulo:** AI Tooling / Asset Generation
> **Comandos:** `pnpm ai:mask`, `pnpm ai:inpaint image` (tecnicas hermanas: `pnpm ai:inpaint erase|expand|move|place|background`, `pnpm ai:layers`) (antes: `pnpm ai:image --image ... --mask ...`, que sigue funcionando pero no recompone), `pnpm ai:image:rmbg`
> **Documentacion relacionada:** [editar una zona de un video](editar-una-zona-de-un-video.md), [expandir, separar en capas, borrar, mover, incorporar y cambiar fondo](expandir-y-separar-en-capas.md), `docs/documentation/ai-tooling/generador-visual-assets.md`, `.claude/skills/greenhouse-ai-image-generator/SKILL.md`, `ai-generations/2026-10-02_task-1965-canary/`, `ai-generations/2026-10-03_task-1973-canary/`

## Para que sirve

Para cambiar **una zona concreta** de una imagen que ya existe y dejar el resto **identico**: poner un objeto sobre una
mesa vacia, reemplazar un elemento, corregir un detalle. La zona se marca con una **mascara**.

Lo que la mascara hace y no hace: le dice al modelo **donde** trabajar, pero ningun modelo devuelve el resto intacto
(GPT Image 2.5 cambio la zona protegida hasta 179/255, medido). Por eso `pnpm ai:inpaint image` vuelve a pegar **solo**
lo que la mascara abre sobre la original y **relee el archivo escrito** para verificar que fuera de la zona no cambio
ni un byte.

## Antes de empezar

### Elige el adaptador y el modelo

La guia canonica es [GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md).
Lo medido en el canario del 2026-10-02 (`ai-generations/2026-10-02_task-1965-canary/`):

| `--adapter` / `--model` | Cuando | Que tener en cuenta |
|---|---|---|
| `openai` · `gpt-image-2.5-flare` (**default**, `medium`) | Edicion con mascara de uso diario | Puso el objeto con luz y sombra correctas; ≈ USD 0,01 a 1536×1024 `medium` |
| `openai` · `gpt-image-2.5-sunburst` ★ | **El mas potente**: la pieza final de mayor impacto | **Con mascara devuelve la zona como un panel negro plano** (3 de 3 pasadas). Con `--provider-mask auto` (default) edita **sin mascara**, recibe la zona marcada en magenta como guia (imagen 2) y el comando recompone y corrige el color. Verificado 2026-10-02: planta dentro de la zona, sin rastro del magenta. Sin la guia puso la planta fuera de la zona |
| `fal:flux-pro-fill` | Rellenar una zona con algo nuevo; buena alternativa a OpenAI | Mascara blanca = editable; USD 0,05 por megapixel (redondeado arriba). Puso el objeto limpio en el canario |
| `fal:seedream5-pro-edit` / `fal:seedream5-lite-edit` | Edicion por instruccion de Seedream | No usan mascara: la mascara solo recompone. Canario Lite 2026-10-02: objeto dentro de la zona, pero **costura visible en superficies lisas** (cambia el tono local) e ignora `image_size`. No es la primera opcion para pieza final |

Esta tabla vale para **agregar o cambiar** algo en una zona. Para **borrar** y para **expandir** los ganadores son
otros (canario del 2026-10-03): borrar → clean plate si hay capas, si no Sunburst; expandir → Flux Fill, nunca GPT
Image. Ver [expandir, separar en capas, borrar…](expandir-y-separar-en-capas.md).

### Preparacion

- La imagen original y una idea clara de la zona.
- La mascara mide **exactamente** lo mismo que la imagen; `pnpm ai:mask --base` la construye ya del tamaño correcto.
- La mascara debe cubrir el **objeto entero con margen**: lo que el modelo dibuje fuera de la zona se funde con la base
  y queda cortado (en el canario, las hojas de la planta que salian del borde quedaron difuminadas).

## Paso a paso

### 1. Arma la mascara

```bash
pnpm ai:mask --base base.png --rect 0.33,0.42,0.67,0.72 --feather 24 --out mascara.png
```

Fuentes (se unen entre si): `--rect` y `--polygon` en fracciones, `--from-alpha` (por defecto lo transparente es
editable), `--from-luma`, `--from-subject` (el sujeto con el matting local, gratis) y `--from-mask`. Operaciones, en
este orden: `--invert`, `--erode`, `--dilate`, `--feather`. El comando imprime el porcentaje editable, de borde y
protegido, y guarda `mascara-preview.png`: **mirala antes de gastar**.

Rechaza una mascara **0 % o 100 % editable**. La segunda es el sintoma de la trampa de sharp: un plano de 1 canal leido
como 3 sale todo transparente sin error y el modelo repinta la pieza entera. El comando verifica los canales en cada
lectura, asi que esa trampa ya no pasa en silencio.

Para revisar una mascara que ya tienes: `pnpm ai:mask --inspect mascara.png --base base.png`.

### 2. Prueba gratis

```bash
pnpm ai:inpaint image --image base.png --mask mascara.png --prompt "<que va en la zona>" --dry-run
```

Muestra si recorta (zona chica: genera solo la zona con contexto, a mas resolucion) o usa la imagen completa, el tamaño
que pide y el costo estimado. Escribe `mask-preview.png`, `provider-input.png` y `provider-mask.png` en la carpeta de
la corrida. No llama al proveedor.

### 3. Corre la edicion

```bash
pnpm ai:inpaint image --image base.png --mask mascara.png \
  --prompt "Que va en la zona. Keep everything else exactly the same." \
  --run ai-generations/2026-10-02_mi-pieza
```

Opciones utiles: `--count 3` (tres candidatos y `contact-sheet.png`; cada uno se paga), `--adapter fal:flux-pro-fill`,
`--model`, `--quality`, `--crop auto|on|off`, `--max-usd`/`--yes` (tope de confirmacion, default USD 1).

### 4. Lee lo que imprime

```
✂ recorte 1281x1281 en (0, 3219) → 1280x1280 · la zona con contexto ocupa 8.1 % de la imagen
$ costo estimado ≈ USD 0.063 · 1 × salida 1280x1280 high (...)
→ candidato 1/1 …
  ✓ PASS · zona protegida identica bit a bit · el modelo habia movido la zona protegida hasta 179/255 · salida USD 0.0103
✎ ./ai-generations/2026-10-02_mi-pieza/inpaint/e8f26fe6d7aa/manifest.json
```

Cada candidato deja `candidate-N.png` (final), `candidate-N-raw.png` (lo que devolvio el modelo) y `candidate-N-diff.png`
(diferencia ×8). El `manifest.json` guarda hashes, parametros, costo estimado y real, el veredicto por zona y la deriva
del modelo; nunca secretos ni URLs firmadas. **Repetir la misma entrada no vuelve a pagar**: reutiliza la corrida
(`--force` para regenerar).

### 5. Mira el resultado

El veredicto garantiza lo que **no** se toca; **no** dice si el pedido se cumplio. En el canario, una pasada salio
`PASS` sin la planta. Abre `candidate-N.png` y mira la union al 100 %.

### Otras tecnicas sobre el mismo pipeline (TASK-1973)

Todas comparten la misma garantia (lo que no se edita queda identico, verificado sobre el archivo escrito) y se
explican en [expandir, separar en capas, borrar, mover, incorporar y cambiar fondo](expandir-y-separar-en-capas.md):

| Quiero… | Comando |
|---|---|
| Borrar un objeto | `pnpm ai:inpaint erase` |
| Llevar la escena a otro formato (4:5 → 9:16, 1:1 → 1,91:1) | `pnpm ai:inpaint expand` |
| Separar la foto en elementos con nombre (mascaras exactas y clean plate) | `pnpm ai:layers` |
| Mover o escalar un objeto | `pnpm ai:inpaint move` |
| Incorporar un objeto de otra foto | `pnpm ai:inpaint place` |
| Cambiar el fondo dejando al sujeto intacto | `pnpm ai:inpaint background` |
| Rehacer un detalle a mas resolucion (manos, una textura) | `pnpm ai:inpaint image --zone-resolution 2048` |

## Editar con un boceto y referencias (como el Markup de ChatGPT)

En ChatGPT se dibuja sobre la foto (Edit → Markup) y se escribe la instruccion; para incorporar un objeto se le pasa su
imagen. En la API **no existe un parametro de boceto**: el dibujo viaja como una imagen de entrada mas, y la guia de
OpenAI pide numerar el rol de cada imagen («Place the X from image 2 into image 1… Do not change anything else»).
`pnpm ai:inpaint image` lo hace asi:

```bash
pnpm ai:inpaint image --image base.png --sketch boceto.png --reference lampara.png \
  --model gpt-image-2.5-sunburst --prompt "Add the lamp from the reference where the sketch marks it." \
  --run ai-generations/<fecha>_<pieza> --dry-run
```

- **`--sketch`**: del mismo tamaño que la base. Puede ser un PNG con fondo transparente y solo los trazos, o la foto con
  los trazos dibujados encima (se detectan por diferencia con la base). Dibuja con un color que no exista en la foto
  (magenta): silueta, caja o flecha de donde va, que tamaño tiene y, si importa, la linea de apoyo.
- **Sin `--mask`**, la mascara para recomponer sale de la **caja del trazo** con 40 px de holgura (`--sketch-margin`) y
  despues **crece hasta cubrir el objeto que el modelo dibujo** (`--grow-mask auto`, default): en el canario Sunburst
  hizo el helecho mas grande que el trazo y la caja sola le cortaba las hojas. Una `--mask` explicita nunca crece.
- **`--reference`** (repetible): imagen del objeto o elemento a incorporar, idealmente recortado sobre fondo neutro.
- El comando antepone el rol de cada imagen (1 = la foto, 2 = el boceto como guia que no se reproduce, 3.. = las
  referencias) y cierra con lo que se preserva. El `manifest.json` guarda tu prompt tal cual y el prompt enviado.
- Funciona con OpenAI (la imagen 1 recibe la mascara si el modelo la acepta; con Sunburst, sin mascara) y con
  `fal:seedream5-*-edit`. `fal:flux-pro-fill` no acepta referencias.

**Estado:** verificado en vivo el 2026-10-02 con Sunburst (boceto + referencia de un helecho): el objeto de la referencia
quedo en la posicion del trazo, sin rastro del magenta, con la zona protegida en delta 0. OpenAI no documenta que un
trazo funcione como guia sin reproducirse: sigue siendo algo a mirar en cada pieza.

## Otro uso de la mascara: integrar un objeto real en una escena (**es la excepcion, no el default**)

> **Antes de leer esto, descarta el camino normal.** Para poner una forma exacta de marca —el render 3D del logo de
> Efeonce, la nave, una mascota 3D— dentro de una escena generada, el camino por defecto **no es esta mascara**: es una
> **pasada directa**, entregando el render como **referencia de forma** (imagen 1) y poniendo la **intencion** en el
> prompt (material, montaje, escena, camara, atmosfera). El modelo resuelve material, luz, sombra montada y atmosfera
> mucho mejor que pegar el objeto y repintarle un halo; pegado conserva el material y la luz del kit y **se ve falso**
> en la escena. Metodo y evidencia:
> [§Forma exacta de marca](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) y la
> [bitacora del kit 3D](../../operations/social/2026-09-17-efeonce-logo-3d-reference-kit-production-method.md).
>
> **Esta mascara se usa solo si se cumplen las dos condiciones a la vez:** el objeto debe conservar **exactamente el
> material y la luz del kit** (no hay cambio de material) **y** es chico en cuadro o tiene detalle fino. Si cambia el
> material (acero, aluminio, vidrio, neon, madera) o la escena tiene atmosfera fuerte (larga exposicion, neon,
> contraluz, lluvia), usa la pasada directa.

El caso de arriba abre un hueco para que el modelo **invente** algo. Este es el contrario: ya tienes un objeto exacto
y lo que quieres del modelo es **solo la integracion**: la sombra de contacto, el reflejo en la superficie y el fundido
de bordes. Ni el objeto ni la escena deben cambiar, y como el modelo igual los redibuja, **al final recompones las dos
zonas protegidas** desde la base: `pnpm ai:inpaint image` lo hace solo.

La forma de conseguirlo es una mascara que **protege dos zonas** y deja editable **solo un halo** alrededor del objeto.
Dentro de ese caso acotado se justifica porque pasar el objeto suelto al modelo deforma el detalle fino aunque el
prompt lo prohiba (medido: una orbita se encogio a un lazo dos veces seguidas).

### Pasos

1. **Genera la escena sin el objeto**, declarando en el prompt el espacio libre donde va a ir.
2. **Arma la base**: pega el objeto exacto sobre esa escena en su posicion final, **sin sombra**.
3. **Arma la mascara**, opaca (protegida) en el interior del objeto —con una erosion de unos 8 px hacia adentro— y
   opaca tambien en **todo el resto de la escena**. Transparente (editable) solo en un halo de ~140 px alrededor del
   objeto.
4. **Corre una pasada** pidiendo unicamente integracion:

```bash
pnpm ai:inpaint image --image BASE.png --mask MASCARA-HALO.png --convention alpha-transparent-editable \
  --model gpt-image-2.5-flare \
  --prompt "Add only contact shadow, surface reflection and bounce light around the object, matching the scene light direction, and blend the edges with the depth of field. Keep the object and the rest of the scene exactly the same." \
  --run ai-generations/<fecha>_<pieza>
```

5. La recomposicion y la verificacion las hace el comando: con `pnpm ai:inpaint image --image BASE.png --mask
   MASCARA-HALO.png --convention alpha-transparent-editable …` la zona protegida queda en delta maximo 0 o sale con
   codigo 2.

### Verifica los pixeles protegidos antes de gastar

`pnpm ai:mask --inspect MASCARA-HALO.png --base BASE.png` imprime el porcentaje protegido y editable; si dice 100 %
editable, la mascara esta mal. `pnpm ai:inpaint image` la rechaza de todos modos antes de gastar.

### Como saber si funciono

Compara el resultado con la base **midiendo por zona**, no en promedio global:

- **Antes de recomponer**, la diferencia media sirve solo para saber si la mascara orienta al modelo: del orden de
  **4/255** en la zona protegida (objeto + escena) contra **40/255** en el halo, donde aparecieron la sombra y el
  reflejo. Si la zona protegida se parece al halo, la mascara no oriento nada: revisala. Una media de ~4/255 **no**
  significa intacta: en la corrida del 2026-09-17 una media de 4,85 escondia un delta maximo de **221/255**.
- **Despues de recomponer**, la zona protegida debe dar **delta maximo 0** contra la base: es el veredicto `PASS` del
  comando.

### Que no hacer aqui

- **No omitas la parte de la mascara que protege la escena.** Si solo proteges el objeto, el modelo conserva el objeto
  pero **redibuja la escena completa**: cambia props y encuadre (medido: IoU de silueta 0,72 por desplazamiento y
  escala).
- **No vuelvas a pegar el render suelto del objeto encima del resultado** para "corregirlo": con su borde duro
  reintroduce el aspecto de recorte pegado y los bordes sucios que la pasada acababa de resolver. Esto **no** es lo
  mismo que la recomposicion del comando: ahi se trae desde la base solo lo que la mascara protegio (el interior erosionado del objeto y
  la escena) con el alfa de la misma mascara, y la franja de ~8 px del borde mas el halo se quedan con lo que hizo el
  modelo. La union cae dentro del halo; mirala al 100 % (esta recomposicion en el caso del halo es inferida del
  metodo, no medida todavia en una pieza de logo).
- Artefacto conocido: un **brillo sucio donde el halo toca el borde del objeto**. Se corrige bajando el ancho del halo
  o la erosion.

## Que significan las senales

| Senal | Que significa |
|---|---|
| `--mask requires --image` | Pasaste mascara sin imagen base. Sin ese corte, el pedido habria salido como una imagen nueva ignorando la mascara. |
| `OpenAI image mask must use the same format as the first image input` | La mascara y la imagen tienen formatos distintos (por ejemplo JPEG y PNG). |
| Error de dimensiones | La mascara no mide exactamente lo mismo que la imagen base. |
| `usage` con `img 0` | No viajo ninguna imagen: fue una generacion desde cero, no una edicion. |
| `--size "…" no es válido…` / `"<modelo>" sólo acepta 1024x1024, 1536x1024, 1024x1536, auto…` | El tamaño no cumple la grilla del modelo. Se detuvo antes de gastar. |
| `--background "…" no es válido…` / `--format "…" no es válido…` | Valor fuera de `auto|opaque|transparent` o de `png|jpeg|webp`. |
| `$ costo estimado ≈ USD X (…)` | Estimación previa del output; la entrada suma aparte. No se cobró nada todavía. |
| `⚠ --count N: son N pedidos separados…` | Vas a pagar N pedidos. |
| `✓ PASS` / `✗ FAIL` (codigo 2) en `ai:inpaint image` | La zona protegida quedo identica / cambio. Con FAIL no uses el candidato. |
| `⚠ … volvio negra y plana` (`suspectFlatPanel`) | El modelo devolvio un panel en vez de la edicion (la trampa de Sunburst con mascara). Descarta el candidato. |
| `⚠ la zona editable casi no cambio` | El modelo probablemente ignoro el pedido. Reescribe el prompt o agranda la mascara. |
| `⚠ el modelo movio la zona protegida en promedio …` | Puede haber corrido el encuadre: la costura se notara. Mira la union al 100 %. |
| `↺ misma entrada ya generada` | Cache: no se paga de nuevo. `--force` para regenerar. |
| `⚠ el modelo REENCUADRO (…)` (`suspectMisaligned`) | El detector de bordes vio la escena corrida o escalada: la zona pegada no corresponde a lo generado. |
| `⚠ REVISAR (codigo 3)` | Todos los candidatos pasaron la verificacion, pero ninguno muestra la edicion pedida (panel negro, reencuadre o zona sin cambio). |
| `La estimación (USD X) supera el tope de USD Y. Repite con --yes o ajusta --max-usd.` (codigo 1) | El costo estimado pasa el tope de confirmacion (default USD 1). No se gasto nada. Confirma el monto antes de repetir con `--yes`. |
| `FATAL: …` (codigo 1) | Error de entrada (falta un flag, mascara invalida, archivo inexistente) o del proveedor. Lee el mensaje; no es un resultado. |
| `★ usando gpt-image-2.5-flare (default…)` | Recordatorio: para la pieza final, `--model gpt-image-2.5-sunburst`. |
| `El prompt nombra "logo"…` | Guarda de marca: compone el SVG oficial despues; `--allow-brand` si la edicion solo toca el contexto. |

## Que no hacer

- **No uses Sunburst con mascara** (`--provider-mask on`): devolvio la zona como un panel negro plano en 3 de 3
  pasadas. Deja `--provider-mask auto` o usa Flare.
- **No uses la mascara para mover material que ya esta en la foto** (subir un lecho, correr un objeto). Medido el
  2026-09-23 con GPT Image 2.5 Sunburst sobre la franja de primer plano oscuro y desenfocado de una story: los dos
  candidatos llenaron **toda** la zona transparente con un panel plano de borde superior recto, justo en el limite de
  la mascara, y borraron el apoyabrazos que habia ahi, aunque el prompt pedia conservar lo que quedaba sobre el nuevo
  borde. Se leia como un velo. Lo que funciono fue mover la materia de la propia foto sin IA; el caso y el metodo estan
  en `.claude/rules/brand-photography.md` («Si el lecho no alcanza la caja»).
- **No asumas que editar es mas barato que generar.** Es al reves: medido el 2026-09-16 en calidad baja,
  editar costo **2,3 veces** lo que costo generar. El modelo devuelve la imagen **completa** aunque la
  mascara acote el cambio, asi que la salida se cobra igual, y ademas se suma leer la imagen original.
  El sobrecosto se diluye al subir calidad (~1,15x en `high`, ~1,04x en `max`).
- **No uses una edicion para quitar un fondo.** Para eso esta `pnpm ai:image:rmbg`, que corre local y no le
  cobra nada al proveedor. Pedirselo al modelo cuesta como una imagen nueva.
  Desde 2026-09-17 el recorte **rellena por defecto los huecos internos** que el matting deja transparentes
  por error (ojos, visores, glifos): la salida muestra `huecos internos rellenados=<px>/<componentes>`. Un hueco
  cuyo color se parece al fondo de estudio se respeta y sigue transparente. Usa `--no-fill-holes` solo si el sujeto
  tiene huecos reales que deben quedar transparentes y **no** se parecen al fondo (por ejemplo, un fondo de otro
  color visible a traves de un aro). Verifica siempre el recorte sobre un fondo oscuro (navy): ahi se ven los huecos
  y los halos que sobre blanco pasan desapercibidos.
- **Objeto claro sobre fondo oscuro: agrega `--key-background`.** El matting puede dejar opacos los huecos por los
  que se ve el fondo (ventanas, cortes de una orbita): `pnpm ai:image:rmbg <in.png> <out.png> --key-background`
  los vacia (defaults `42 30`: umbral de distancia al color de fondo y tamaño minimo del hueco). Si el fondo es claro
  y desenfocado o es un macro, sube el tamaño minimo (`--key-background 30 800`). La salida muestra
  `huecos de fondo vaciados=<px>/<componentes>`. No lo uses si el sujeto tiene zonas del mismo color que el fondo:
  tambien se borrarian. Revisa el resultado sobre un fondo de contraste fuerte (por ejemplo terracota) con zoom al
  100 %; el gris azulado no deja ver restos de navy.
- **No pagues por la mascara**: no cuesta nada. El `usage` es identico con y sin ella. Lo que se cobra es
  la imagen base.
- No uses `--input-fidelity` con GPT Image 2 ni 2.5: desde el 2026-09-27 el comando **lo rechaza antes de gastar**. La preservacion se pide por prompt.

## Brechas conocidas del comando (2026-09-16)

Corregidas el 2026-09-16 (commit `17196ead1`): `--size` se valida antes de gastar (GPT Image 2 y 2.5: `auto` o
ANCHOxALTO con lados múltiplos de 16, borde ≤ 3840, relación ≤ 3:1 y área entre 655.360 y 8.294.400 px; modelos
anteriores: sólo `1024x1024`, `1536x1024`, `1024x1536` o `auto`); `--background` se valida; existe
`--format png|jpeg|webp`; el comando avisa que `--count N` son N pedidos pagados y estima el costo antes de pedir.
Lo que sigue abierto:

- **`--count N` sigue haciendo N pedidos separados de 1 imagen y pagas N veces** (ahora con aviso).
- La estimación no pide confirmación ni suma la imagen de entrada; no hay control de compresión.
- No hay `--moderation`. (`--input-fidelity` con 2 o 2.5 ya no se ignora en silencio: se rechaza antes de gastar.)
- Sin `--out` ni `--out-dir`, guarda en `public/images/generated/`: para exploraciones usa `--out` a
  `ai-generations/` o al scratchpad.

## Problemas comunes

- **El modelo cambio cosas fuera de la zona.** Es lo esperado: 2.5 redibuja la imagen entera. `pnpm ai:inpaint image`
  ya lo recompone. Si `pnpm ai:image --mask` es el que usaste, ese comando no recompone: pasa a `ai:inpaint`.
- **No se ve ningun cambio.** Confirma que el `usage` muestre `img` distinto de cero; si es cero, el comando
  corrio como generacion y la mascara no viajo.
- **La zona quedo bien pero el estilo no calza.** Sube la calidad un escalon; el costo del output sube pero
  el de la imagen base no cambia.

## Para agentes

Esta seccion es para un agente (Claude, Codex u otro) que opera el pipeline sin supervision continua. El contrato de
cada comando es su `--help` (`pnpm ai:inpaint image --help`, `… erase --help`, `pnpm ai:mask --help`,
`pnpm ai:layers --help`): si algo de aqui difiere del `--help`, gana el `--help`.

### Arbol de decision: que comando y que modelo

Ganadores medidos en los canarios del 2026-10-02 y 2026-10-03 (`ai-generations/2026-10-02_task-1965-canary/`,
`ai-generations/2026-10-03_task-1973-canary/`):

```text
¿La edicion toca un logo, una marca o un texto legal?
└─ si → NO con IA. Se compone el arte oficial despues. (--allow-brand solo si la edicion toca el CONTEXTO del logo)

¿Que quieres hacer?
├─ Agregar o cambiar algo en una zona ............................ pnpm ai:inpaint image
│   ├─ uso diario, con mascara ........... default: --adapter openai (gpt-image-2.5-flare, quality medium)
│   ├─ pieza final de mayor impacto ...... --model gpt-image-2.5-sunburst (el mas potente; edita SIN mascara y
│   │                                      recibe la zona marcada como guia: lo hace --provider-mask auto, default)
│   ├─ relleno puro, alternativa ......... --adapter fal:flux-pro-fill
│   └─ "dibujo donde va" / objeto dado ... --sketch boceto.png [--reference objeto.png] --model gpt-image-2.5-sunburst
├─ Rehacer un detalle a mas resolucion ............................ image --zone-resolution 2048 (REINTERPRETA, no escala)
├─ Borrar un objeto .............................................. pnpm ai:inpaint erase
│   ├─ hay capas (pnpm ai:layers) ........ --layers <layers.json> --layer "<nombre>"  → clean plate, USD 0
│   └─ no hay capas ...................... --mask mascara.png → Sunburst por instruccion (default de --fill model)
│                                          NUNCA Flare con mascara ni Flux Fill: rellenan la silueta con otro objeto
├─ Mover o escalar un objeto ..................................... pnpm ai:inpaint move   (necesita capas)
├─ Incorporar un objeto de OTRA foto ............................. pnpm ai:inpaint place  (capas de la foto de origen)
├─ Llevar la escena a otro formato ............................... pnpm ai:inpaint expand (default fal:flux-pro-fill;
│                                                                  NUNCA GPT Image: Flare reescala, Sunburst copia el espejo)
├─ Cambiar el fondo .............................................. pnpm ai:inpaint background
├─ Separar en capas / mascara exacta de un elemento .............. pnpm ai:layers + pnpm ai:mask --from-layer
├─ Editar una zona de un video ................................... pnpm ai:inpaint video (default fal:flux3-edit)
└─ Reiluminar una foto ........................................... NO hay relight conectado. Lo unico cercano:
                                                                   place --finish element relumina solo el elemento pegado
```

### Lineas de comando

```bash
# 1. Mascara + revision (gratis)
pnpm ai:mask --base base.png --rect 0.33,0.42,0.67,0.72 --feather 24 --out mascara.png
pnpm ai:mask --inspect mascara.png --base base.png

# 2. Siempre primero el dry-run (gratis: mascara, recorte, payload y costo)
pnpm ai:inpaint image --image base.png --mask mascara.png --prompt "<que va en la zona>" --run ai-generations/<fecha>_<pieza> --dry-run

# 3. La corrida real (Flare por defecto)
pnpm ai:inpaint image --image base.png --mask mascara.png --prompt "<que va en la zona>. Keep everything else exactly the same." --run ai-generations/<fecha>_<pieza>

# Pieza final con Sunburst (sin mascara al proveedor + guia de zona + correccion de color: automatico)
pnpm ai:inpaint image --image base.png --mask mascara.png --model gpt-image-2.5-sunburst --prompt "..." --run ai-generations/<fecha>_<pieza>

# Boceto + referencia
pnpm ai:inpaint image --image base.png --sketch boceto.png --reference objeto.png --model gpt-image-2.5-sunburst --prompt "Add the X from the reference where the sketch marks it." --run ai-generations/<fecha>_<pieza>
```

### Codigos de salida y que hacer con cada uno

| Codigo | Significa | Que hace el agente |
|---|---|---|
| `0` PASS | La zona protegida quedo identica bit a bit y al menos un candidato no es sospechoso | Hacer la revision al 100 % (checklist de abajo) antes de entregar. PASS no prueba que el pedido se cumplio |
| `2` FAIL | Algo fuera de la zona cambio en el archivo escrito | **Nunca usar el candidato.** No reintentar a ciegas: leer `manifest.json` (veredicto por zona) y reportar |
| `3` REVISAR | Lo protegido esta intacto, pero todos los candidatos son sospechosos: panel plano, reencuadre, residuo de borrado o zona casi sin cambio | Leer el aviso impreso: panel negro → no forzar `--provider-mask on`, volver a `auto` o usar Flare; reencuadre → cambiar de modelo (al expandir, Flux Fill); zona sin cambio → reescribir el prompt o agrandar la mascara; residuo de borrado → clean plate con capas o Sunburst. No entregar sin ojos humanos |
| `1` error | Entrada invalida, tope de costo superado sin `--yes`, error del proveedor (`FATAL: …`) | Leer el mensaje. Si es el tope de costo, **detenerse y pedir autorizacion** (regla de abajo) |

### Regla del tope de costo

1. **Siempre `--dry-run` primero.** Es gratis e imprime el costo estimado.
2. El tope de confirmacion es `--max-usd` o la variable `AI_COST_CONFIRM_USD` (default USD 1). Si la estimacion lo
   supera, el comando sale con codigo 1 sin gastar.
3. `--yes` (o subir `--max-usd`) **solo con autorizacion humana explicita del monto en el chat**. Un agente no sube el
   tope por su cuenta ni cambia la variable de entorno.
4. `--count N` son N pedidos pagados. Repetir la misma entrada no paga (cache por hash); `--force` vuelve a pagar:
   usalo solo con una razon.

### Revision visual al 100 % (obligatoria con PASS)

El detector mide lo que no se toca y algunos sintomas; no ve todo. Abrir `candidate-N.png` (o el `final`) al 100 %,
no la miniatura, y revisar:

- [ ] **El pedido se cumplio**: el objeto esta, completo, sin cortes en el borde de la mascara.
- [ ] **Costuras**: el borde de la zona no muestra cambio de tono, linea recta ni halo (el canario de Seedream Lite dejo
      costura en una pared lisa).
- [ ] **Fantasmas**: no quedan restos tenues de lo que se quito (el asa que dejo Seedream Pro Edit al borrar: el
      detector **no** la vio).
- [ ] **Elementos inventados**: el modelo no agrego objetos que nadie pidio (otra taza al borrar con Flux Fill; una
      banca al expandir a 9:16).
- [ ] **Reencuadre**: la escena pegada calza con lo generado, sin desplazamiento ni cambio de escala, aunque no haya
      aviso.
- [ ] **Forma conservada** cuando se pidio la misma forma (`--zone-resolution` redibujo una taza y le quito el pie).
- [ ] **Sin rastro del magenta** de la guia de zona o del boceto.
- [ ] **Sin logos ni texto generados**; personas reales con su identidad intacta.

Si un punto falla, el resultado no se entrega aunque el codigo sea 0.

## Referencias tecnicas

- Guía canónica de selección de modelos: `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`
- Contrato del proveedor: `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`
- Cliente canonico: `src/lib/ai/openai-image.ts` (`editOpenAIImage`)
- Pipeline: `scripts/ai/inpaint/` (`mask.ts`, `recompose.ts`, `crop.ts`, `sketch.ts`, `pipeline-image.ts`, `adapters/`); CLI `scripts/ai/inpaint/cli.ts` y `mask-cli.ts` (su `--help` es el contrato)
- CLI legado sin recomposicion: `scripts/ai/generate-image.ts`
- Canarios: `ai-generations/2026-10-02_task-1965-canary/README.md` (pipeline) y `ai-generations/2026-10-03_task-1973-canary/README.md` (tecnicas)
- Spec: [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) §Pipeline de inpainting
- Medicion de costo con evidencia: `ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/`
