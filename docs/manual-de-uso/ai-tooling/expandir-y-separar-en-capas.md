# Expandir, separar en capas, borrar, mover, incorporar, cambiar fondo y rehacer detalle

> **Tipo de documento:** Manual de uso
> **Version:** 1.2
> **Creado:** 2026-10-03 por Claude (TASK-1973)
> **Ultima actualizacion:** 2026-10-03 por Claude — (1.2) seccion «Para agentes» (arbol de decision con los ganadores medidos, lineas de comando, codigos de salida, regla del tope de costo y checklist al 100 %); resultados medidos por tecnica con costo; expandir: Flux Fill vs GPT Image con la banca inventada en 9:16; Layerize cobra la base como una capa (USD 0,03375 c/u); seleccion de capa: el nombre gana sobre la descripcion; `foto:expandir` → TASK-1925. Antes (1.1) canario real: clean plate con las demas capas, sombra proyectada, `place`
> **Modulo:** AI Tooling / Asset Generation
> **Comandos:** `pnpm ai:layers`, `pnpm ai:mask --from-layer`, `pnpm ai:inpaint expand|erase|move|place|background`, `pnpm ai:inpaint image --zone-resolution`
> **Documentacion relacionada:** [editar una zona de una imagen](editar-una-zona-de-una-imagen.md), [editar una zona de un video](editar-una-zona-de-un-video.md), [guia de seleccion de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md), [generador visual](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)

## Para que sirve

Son tecnicas de edicion construidas sobre el mismo pipeline de `pnpm ai:inpaint`. Todas comparten su garantia: lo que
no se edita queda **identico** a la original y el comando lo verifica sobre el archivo escrito. Si un solo punto
cambio fuera de lo que se debia tocar, sale con codigo 2.

| Quiero… | Comando |
|---|---|
| Llevar una escena a otro formato sin regenerarla (4:5 → 9:16, 1:1 → 1,91:1) | `pnpm ai:inpaint expand` |
| Separar una foto en elementos con nombre (mascaras exactas y un clean plate) | `pnpm ai:layers` |
| La mascara de un elemento concreto (la taza, el sujeto) | `pnpm ai:mask --from-layer` |
| Borrar un objeto | `pnpm ai:inpaint erase` |
| Mover o escalar un objeto | `pnpm ai:inpaint move` |
| Incorporar un objeto de una foto en OTRA | `pnpm ai:inpaint place` |
| Cambiar el fondo dejando al sujeto intacto | `pnpm ai:inpaint background` |
| Rehacer un detalle a mas resolucion (manos, una textura) | `pnpm ai:inpaint image --zone-resolution 2048` |

## Antes de empezar

- Lo que sabes del pipeline base aplica igual: dry-run gratis, tope de costo con `--yes`, cache (repetir la misma
  entrada no paga), guarda de marca y `manifest.json`. Lee [editar una zona de una imagen](editar-una-zona-de-una-imagen.md).
- **Logos y marcas nunca se generan, borran, mueven ni reconstruyen con IA**: se componen con el arte oficial. La guarda
  mira tu prompt y tambien el nombre de la capa elegida.
- Elige el modelo con la guia de seleccion. El ganador depende de la tecnica (canario del 2026-10-03): **borrar** →
  clean plate si hay capas, si no Sunburst; **expandir** → Flux Fill, nunca GPT Image; **agregar o cambiar** en una
  zona → Flare para el dia a dia y Sunburst (el mas potente, edita sin mascara y recibe la zona como guia) para la pieza
  final. Los defaults de cada comando ya siguen esa regla.

## Separar en capas: `pnpm ai:layers`

```bash
pnpm ai:layers --image foto.png --run ai-generations/<fecha>_<pieza> --dry-run   # cota de costo, gratis
pnpm ai:layers --image foto.png --run ai-generations/<fecha>_<pieza>
pnpm ai:layers --list ai-generations/<fecha>_<pieza>/layers/<id>/layers.json    # que capas salieron
```

- Funciona con **cualquier imagen**, no solo con las que genero Seedream.
- Devuelve la **imagen base** y hasta 16 capas, cada una con nombre, descripcion, alfa y caja. Todo queda en
  `layers.json`. **Ojo: la base saca TODO, tambien las superficies** (medido 2026-10-03: en una foto de mesa con taza y
  cuaderno salieron tres capas —mesa, taza, cuaderno— y la base era la pared sola). Por eso `erase`, `move` y `place`
  nunca usan la base sola: el *clean plate* de un elemento es la base **con las demas capas recompuestas encima**.
- `--prompt "<que separar>"` y `--bbox x0,y0,x1,y1` (fracciones, repetible; viaja como `<bbox>` 0–1000) apuntan a
  elementos concretos. `--image-size auto|auto_1K|auto_1.5K|auto_2K` fija la resolucion de base y capas (default `auto`).
- Acepta imagenes desde 512×512 hasta 6000×6000.
- **Costo:** se cobra por capa (USD 0,03375 hasta 1536², 0,0675 por encima) **y la base se cobra como una capa mas**
  (medido con el saldo de fal: 4 capas + base = USD 0,17). El numero de capas lo decide el modelo y varia entre
  corridas (la misma foto dio 3 y 4). El comando estima con una **cota** de 16 capas + base y pide `--yes` sobre el
  tope; despues registra lo que costo.
- **Las capas son contenido regenerado**: el modelo vuelve a dibujar cada elemento. Por eso se usan solo como
  **mascara** y como **clean plate**; los pixeles que no se editan siempre salen de tu original.

Mascara de un elemento:

```bash
pnpm ai:mask --base foto.png --from-layer <layers.json> --layer "mug" --feather 8 --out mascara-taza.png
```

`--layer` acepta el indice `#3`, el nombre exacto o un fragmento sin ambiguedad. **El nombre gana sobre la
descripcion**: la descripcion solo se usa si ningun nombre coincide, porque Layerize describe cada capa citando a las
demas (en el canario, «mug» aparecia en la descripcion de las tres). Si hay duda, usa el indice. Repetible para unir
varias capas.

## Borrar: `pnpm ai:inpaint erase`

```bash
pnpm ai:inpaint erase --image foto.png --layers <layers.json> --layer "mug"                    # clean plate, gratis
pnpm ai:inpaint erase --image foto.png --mask mascara.png --fill model          # Sunburst, por instruccion
```

- **Zona:** `--mask` (explicita: nunca se altera) o `--layers` + `--layer`, que se agranda `--grow` px (default 16)
  para llevarse el borde.
- **Sombra proyectada** (`--shadow auto`, default con capas): la capa de la superficie viene sin sombras, asi que la
  sombra del objeto se mide comparando la foto con el clean plate y se suma a la zona. Crece desde el objeto, nunca
  toma la sombra de un vecino y nunca pisa otro objeto. `--shadow off` la deja.
- **Relleno:** `--fill plate` (default con capas: el clean plate sin ese elemento, sin proveedor ni gasto, con
  correccion de color) o `--fill model` (un modelo reconstruye el fondo; por defecto Sunburst).
- Despues de verificar, **mide si el objeto sigue ahi**: que la zona haya cambiado y, con capas, que el resultado se
  parezca al fondo limpio y no a otro objeto. Si en ningun candidato quedo el fondo, sale con codigo 3 (revisar).
- **Que modelo borra** (canario del 2026-10-03, la misma taza):

  | Metodo | Resultado | Costo |
  |---|---|---|
  | Clean plate (con capas) | ✓ limpio | 0 |
  | **Sunburst** (default de `--fill model`) | ✓ limpio | ≈ 0,01 |
  | Seedream 5 Pro Edit | casi: queda un fantasma del asa en la pared | ≈ 0,07 |
  | Flare con mascara | ✗ dejo media taza | ≈ 0,01 |
  | Flux Fill | ✗ dibujo otra taza (dos veces) | ≈ 0,10 |

  Los que **llenan una mascara** (Flare con mascara, Flux Fill) ven la silueta del objeto y la rellenan con lo que
  sugiere: otro objeto. Los que **editan por instruccion** (Sunburst, Seedream) entienden «quita la taza». El detector
  atrapo los dos fallos con codigo 3; un fantasma tenue como el de Seedream no lo detecta: mira el resultado al 100 %.

## Mover o escalar: `pnpm ai:inpaint move`

```bash
pnpm ai:inpaint move --image foto.png --layers <layers.json> --layer "notebook" --dx -300 --dy 40 --scale 0.9
```

1. El hueco que deja el elemento —con su sombra, salvo `--shadow off`— se rellena con el clean plate sin ese elemento.
   El hueco nunca pisa a otro objeto.
2. El elemento se **recorta de tu original** con el alfa de su capa y se pega en la posicion nueva (la escala es
   alrededor de su centro).
3. `--harmonize auto` (default) hace una pasada **solo de sombra de contacto y reflejo** en un halo alrededor; `off`
   deja el compuesto sin IA ni gasto.
4. Verifica que todo lo demas quede identico a la original y lo deja en `move.json`.

## Incorporar en otra imagen: `pnpm ai:inpaint place`

```bash
pnpm ai:layers --image origen.png --run ai-generations/<fecha>_<pieza>
pnpm ai:inpaint place --image destino.png --from origen.png --layers <layers.json> --layer "mug" --at 0.22,0.47 --width 0.17
```

1. El elemento se **recorta de la imagen de origen** con el alfa de su capa.
2. Se pega en el destino con su centro en `--at` (fracciones x,y) y el ancho `--width` (fraccion del ancho del
   destino; sin `--width`, el mismo tamano en pixeles).
3. El modelo lo **termina**: `--finish halo` (default) pone solo sombra de contacto, reflejo y borde alrededor;
   `element` ademas lo relumina para que tome la luz de la escena (su forma puede variar: miralo al 100 %); `off` deja
   el pegado sin IA ni gasto.
4. Verifica que el destino quede identico fuera de lo pegado y de su acabado, y lo deja en `place.json`.

La escala y la perspectiva las decides tu: el comando no sabe que tan grande deberia verse el objeto en otra escena.

## Expandir a otro formato: `pnpm ai:inpaint expand`

```bash
pnpm ai:inpaint expand --image escena-4x5.png --to 9:16 --prompt "the same office continues above and below"
pnpm ai:inpaint expand --image escena-1x1.png --canvas 2048x1072 --scale 0.8 --anchor right --prompt "..."
```

- `--to` crece el lienzo en un solo eje; `--canvas` lo fija; `--scale` achica la escena dentro del lienzo (zoom out: la
  escena se re-muestrea); `--anchor` la apoya en un lado.
- Editable = el area nueva + una franja de fundido (`--blend`, default 24 px; 80–140 si el borde corta objetos) solo en
  los bordes que dan al area nueva. El interior de la escena queda en delta 0.
- El area nueva se rellena antes con **espejo de los bordes** (`--prefill mirror`, default; `neutral` usa su color
  medio); un relleno solido invita al modelo a inventar un panel.
- **Modelo: Flux Fill por defecto** (`fal:flux-pro-fill`, ≈ USD 0,05 por megapixel: 1,91:1 ≈ 0,10 y 9:16 ≈ 0,15).
  Es un modelo de relleno puro: sale al tamano de la entrada y continua la escena. Canario del 2026-10-03, misma foto y
  prompt: Flux continuo mesa, ventana y techo sin costura en 1,91:1 y 9:16; **Flare** achico la escena (escala
  0,88–0,90) y **Sunburst** copio el relleno en espejo como contenido (ventana y canto de mesa reflejados). Si eliges un
  modelo de OpenAI, el comando avisa.
- Flux genera el area nueva a menor resolucion en lienzos grandes (9:16 de 1536×2730 → 1088×1904) y la escala; la
  escena original conserva la suya. Puede **inventar elementos** en el area nueva (en el 9:16 agrego una banca): si
  molesta, describe en el prompt que hay alrededor y repite.
- `pnpm foto:expandir` sigue existiendo para el flujo de marca de CMP-004 (Sunburst, redibuja: es otro contrato) y no
  se delego a este nucleo; su migracion quedo en TASK-1925.
- Pendiente: comparar con FLUX Outpainting y FLUX Erase de Black Forest Labs (API propia, no esta en fal); requiere
  una cuenta BFL del operador y el secreto `greenhouse-bfl-api-key`.

Comparacion medida (canario del 2026-10-03, misma foto 1536×1024 y mismo prompt):

| Formato | Modelo | Resultado | Costo USD |
|---|---|---|---|
| 1,91:1 | **Flux Fill** (default) | ✓ PASS, codigo 0: mesa, ventana y alfeizar continuan; uniones invisibles al 100 % | 0,10 |
| 1,91:1 | Sunburst `high` (sin mascara + guia) | ⚠ codigo 3: copio el relleno en espejo (ventana en V, canto de mesa reflejado) | 0,036 |
| 1,91:1 | Flare | ⚠ codigo 3: reencuadro (escala 0,88), costura vertical a ambos lados | 0,009 |
| 9:16 | **Flux Fill** (default) | ✓ PASS, codigo 0: techo, ventana y patas coherentes; generado a 1088×1904 y escalado; **invento una banca** en primer plano | 0,15 |
| 9:16 | Flare | ⚠ codigo 3: reencuadro (escala 0,90) | 0,014 |

## Cambiar el fondo: `pnpm ai:inpaint background`

```bash
pnpm ai:inpaint background --image foto.png --prompt "a bright minimal studio with a white wall"
pnpm ai:inpaint background --image foto.png --layers <layers.json> --layer "person" --prompt "..."
```

El sujeto (matting local o capas) queda en delta 0; el fondo es su inverso. `--edge` (default 3 px) es la franja del
borde que el modelo rehace contra el fondo nuevo: el comando reporta su costura. **Miralo al 100 %** (pelo,
transparencias). Con personas reales del equipo rigen las reglas de identidad de fotografia de marca.

## Rehacer un detalle: `--zone-resolution`

```bash
pnpm ai:inpaint image --image foto.png --mask manos.png --zone-resolution 2048 --prompt "natural relaxed hands" --model gpt-image-2.5-sunburst
```

Genera la zona recortada a ese lado largo (512–4096) y la devuelve a su lugar. Avisa si el proveedor topa mas abajo.
**Es una reinterpretacion, no un escalado**: en el canario, Flare redibujo una taza y le quito el pie aunque el prompt
pedia la misma forma. Para conservar la forma exacta, usa un escalador; esto sirve para rehacer (manos, una textura).

## Resultados medidos por tecnica (canario del 2026-10-03)

Foto de prueba: mesa de roble, taza, cuaderno y ventana (1536×1024). Gasto total de TASK-1973 ≈ USD 0,98. Evidencia:
`ai-generations/2026-10-03_task-1973-canary/README.md`.

| Tecnica | Resultado | Costo USD |
|---|---|---|
| Separar en capas | ✓ 3 capas (mesa, taza, cuaderno); en otra corrida 4 + base | ≈ 0,10 (3 capas) · 0,17 medido (4 + base) |
| Borrar con clean plate | ✓ PASS: taza y su sombra fuera, la mesa continua, el cuaderno intacto | 0 |
| Borrar con Sunburst | ✓ PASS, sin marcas | ≈ 0,01 |
| Mover | ✓ PASS: cuaderno en su lugar nuevo con sombra de contacto; la taza conserva su base y su sombra | ≈ 0,01 |
| Incorporar en otra imagen (`place`) | ✓ PASS, destino en delta 0 | 0 sin acabado · ≈ 0,01 con halo |
| Cambiar fondo | ✓ PASS, costura media 10,6/255 | ≈ 0,01 |
| Rehacer detalle (`--zone-resolution 2048`) | ✓ PASS mecanico, pero Flare redibujo la taza (le quito el pie) | ≈ 0,022 |
| Expandir | ver la tabla de la seccion Expandir | 0,10–0,15 con Flux Fill |

## Que significan las senales

| Senal | Significado |
|---|---|
| `$ costo estimado ≤ USD X · cota…` | Layerize: maximo posible (16 capas + base). Lo real se registra en `layers.json` |
| `↺ esta imagen ya se separo…` | Cache: no se vuelve a pagar (`--force` para repetir) |
| `"X" coincide con varias capas` | Elige por indice (`#3`): evita editar la capa equivocada |
| `⚠ candidato N: la zona casi no cambio … el objeto puede seguir ahi` | `erase` no vio cambio en el nucleo de la zona |
| `⚠ candidato N: la zona cambio pero no se parece al fondo (semejanza a objeto …)` | `erase` con capas: el modelo dibujo otra cosa en vez de borrar |
| `⚠ REVISAR (codigo 3): en ningun candidato quedo el fondo…` | Todos los candidatos de `erase` quedaron con residuo: usa el clean plate o Sunburst |
| `◫ relleno: clean plate de Layerize sin #N…` | `erase` rellena con la base + las demas capas: sin proveedor ni gasto |
| `· costura en el borde del sujeto…` | `background`: cuanto cambio la franja del borde; revisala al 100 % |
| `◐ sombra proyectada incluida: N px` | `erase`/`move` sumaron la sombra del objeto a la zona |
| `⚠ el modelo REENCUADRO` / codigo 3 | La escena generada no calza con la original: no uses el resultado (al expandir, prueba Flux Fill) |
| `✗ FAIL` (codigo 2) | Algo fuera de lo que se debia tocar cambio: no uses el resultado |
| `La estimación (USD X) supera el tope…` / `La cota (USD X) supera el tope…` (codigo 1) | El costo estimado (o la cota de Layerize) pasa el tope de USD 1: no se gasto nada; confirma el monto y repite con `--yes` |

## Que no hacer

- **No uses una capa como pixeles finales** de lo que no editas: es una reconstruccion.
- **No borres, muevas ni regeneres logos o marcas** con estas herramientas.
- **No subas el tope de costo de Layerize a ciegas**: la cota supone 16 capas; mira `--dry-run` primero.
- **No confies solo en el `PASS`**: garantiza que lo protegido no cambio, no que el resultado se vea bien.

## Problemas comunes

- **Layerize no separo el objeto que querias:** repite con `--prompt` describiendolo o con `--bbox` sobre su region.
- **El clean plate deja una mancha:** usa `erase --fill model` sobre la misma mascara.
- **Queda la sombra del objeto borrado:** sube `--grow` o revisa que corriste con capas (la sombra solo se mide con
  `--layers`); con una mascara explicita, dibujala incluyendo la sombra.
- **Al borrar o mover se llevo parte de otro objeto:** no deberia pasar; si pasa, corre con `--shadow off` y reporta
  el `manifest.json`.
- **Al expandir aparece un panel liso:** prueba `--prefill mirror` (default) y un prompt que describa que hay alrededor.

## Para agentes

Para un agente que opera estas tecnicas sin supervision continua. El contrato de cada comando es su `--help`
(`pnpm ai:inpaint erase|expand|move|place|background --help`, `pnpm ai:layers --help`, `pnpm ai:mask --help`): si algo
de aqui difiere, gana el `--help`.

### Arbol de decision: que tecnica y que modelo

Ganadores medidos en el canario del 2026-10-03:

```text
¿Toca un logo, una marca o un texto legal?  → NO con IA (la guarda mira el prompt Y el nombre de la capa). Se compone el arte oficial.

¿Necesitas capas? (borrar con clean plate, mover, incorporar, mascara exacta de un elemento)
└─ pnpm ai:layers --dry-run  → revisar la cota → pnpm ai:layers → pnpm ai:layers --list <layers.json>

Borrar un objeto
├─ con capas ..... erase --layers <layers.json> --layer "#N"           (clean plate, USD 0; sombra incluida por defecto)
└─ sin capas ..... erase --mask mascara.png                             (Sunburst por instruccion, default de --fill model)
   NUNCA: Flare con mascara (dejo media taza) ni fal:flux-pro-fill (dibujo otra taza, dos veces).
   Seedream 5 Pro Edit: casi, pero deja un fantasma que el detector no ve.

Mover o escalar ........ move --layers … --layer "#N" --dx … --dy … [--scale 0.2–3]    (harmonize auto = halo con IA)
Incorporar de otra foto  place --image destino --from origen --layers <capas del ORIGEN> --layer "#N" --at x,y [--width f]
                         --finish halo (default) · element (relumina; la forma puede variar) · off (USD 0)
Otro formato ........... expand --to 9:16|4:5|1:1|1.91:1|16:9|3:4|2:3|3:2 (o --canvas WxH)
                         default fal:flux-pro-fill. NUNCA GPT Image (Flare reescala 0,88–0,90; Sunburst copia el espejo)
Cambiar fondo .......... background [--layers … --layer …] --prompt "<fondo nuevo>"   (sin capas: matting local)
Rehacer un detalle ..... image --mask zona.png --zone-resolution 2048 --model gpt-image-2.5-sunburst   (reinterpreta)
Reiluminar ............. no hay relight conectado; place --finish element relumina solo el elemento pegado
```

### Lineas de comando

```bash
RUN=ai-generations/<fecha>_<pieza>

# Capas (cota gratis primero; la base se cobra como una capa)
pnpm ai:layers --image foto.png --run $RUN --dry-run
pnpm ai:layers --image foto.png --run $RUN
pnpm ai:layers --list $RUN/layers/<id>/layers.json

# Borrar
pnpm ai:inpaint erase --image foto.png --layers $RUN/layers/<id>/layers.json --layer "#2" --run $RUN
pnpm ai:inpaint erase --image foto.png --mask mascara.png --run $RUN --dry-run

# Mover e incorporar
pnpm ai:inpaint move  --image foto.png --layers <layers.json> --layer "#3" --dx -560 --dy 70 --run $RUN
pnpm ai:inpaint place --image destino.png --from origen.png --layers <layers.json> --layer "#2" --at 0.22,0.47 --width 0.17 --run $RUN

# Expandir (siempre --dry-run antes: el costo crece con los megapixeles)
pnpm ai:inpaint expand --image escena.png --to 9:16 --prompt "<que hay alrededor>" --run $RUN --dry-run

# Fondo y detalle
pnpm ai:inpaint background --image foto.png --prompt "<fondo nuevo>" --run $RUN --dry-run
pnpm ai:inpaint image --image foto.png --mask zona.png --zone-resolution 2048 --prompt "..." --run $RUN --dry-run
```

En `erase`, el prompt por defecto ya es el correcto para cada familia: los modelos de relleno con mascara (Flux Fill)
reciben uno que **describe el fondo**; los editores por instruccion (Sunburst, Seedream) reciben «quita el objeto». No
lo reemplaces salvo que el fondo necesite una descripcion concreta.

### Codigos de salida y que hacer con cada uno

| Codigo | Significa | Que hace el agente |
|---|---|---|
| `0` PASS | Lo que no se edita quedo identico bit a bit (y, en `erase`/`expand`/`background`, al menos un candidato no es sospechoso) | Revision al 100 % (checklist de abajo) antes de entregar |
| `2` FAIL | Algo fuera de lo que se debia tocar cambio | **Nunca usar el resultado.** Leer `manifest.json` (o `move.json`/`place.json`) y reportar |
| `3` REVISAR | Lo protegido esta intacto, pero todos los candidatos son sospechosos: reencuadre, panel plano, zona sin cambio o residuo de borrado (`erase`) | Leer el aviso: reencuadre al expandir → Flux Fill; residuo al borrar → clean plate con capas o Sunburst; zona sin cambio → reescribir el prompt. No entregar sin ojos humanos. `move` y `place` solo devuelven 0 o 2 |
| `1` error | Entrada invalida, capa ambigua, tope de costo superado sin `--yes`, error del proveedor (`FATAL: …`) | Leer el mensaje; con el tope de costo, detenerse y pedir autorizacion |

### Regla del tope de costo

1. **`--dry-run` siempre primero** (gratis). En `ai:layers` imprime una **cota** (16 capas + base), no el costo real.
2. Tope: `--max-usd` o `AI_COST_CONFIRM_USD` (default USD 1). Sobre el tope el comando sale con codigo 1 sin gastar.
3. `--yes` o subir `--max-usd` **solo con autorizacion humana explicita del monto en el chat**. El agente no sube el
   tope ni la variable de entorno por su cuenta.
4. Lo que no paga: clean plate, `move --harmonize off`, `place --finish off`, cache de la misma entrada. `--force`
   vuelve a pagar: solo con una razon.

### Revision visual al 100 % (obligatoria con PASS)

- [ ] **Costuras**: la franja de fundido de `expand` (`--blend`), el borde del sujeto en `background` (`--edge`) y el
      halo de `move`/`place` no muestran linea, cambio de tono ni halo.
- [ ] **Fantasmas**: tras `erase`, ningun resto tenue del objeto ni de su sombra (el asa de Seedream: el detector no la vio).
- [ ] **Elementos inventados**: nada nuevo que nadie pidio en el area editable (otra taza al borrar con Flux Fill; una
      banca al expandir a 9:16).
- [ ] **Reencuadre**: la escena original calza con lo generado alrededor, misma escala y sin desplazamiento.
- [ ] **Vecinos intactos**: al borrar o mover no se llevo la base, la sombra o el borde de otro objeto.
- [ ] **Escala y perspectiva** del elemento incorporado con `place` creibles en la escena nueva (el comando no las decide).
- [ ] **Forma conservada**: `--zone-resolution` y `place --finish element` pueden cambiar la forma.
- [ ] **Sin logos ni texto generados**; personas reales con su identidad intacta (reglas de fotografia de marca).

Si un punto falla, no se entrega aunque el codigo sea 0.

## Referencias tecnicas

- Codigo: `scripts/ai/inpaint/layers.ts`, `adapters/layerize-fal.ts`, `layers-cli.ts`, `erase.ts`, `techniques.ts`,
  `move.ts`, `place.ts`, `expand.ts`, `expand-run.ts`, `background.ts`; CLI `scripts/ai/inpaint/cli.ts` (su `--help` es
  el contrato).
- Catalogo y precios de fal: `src/lib/ai/fal-capabilities.ts` (`flux-pro-fill`, `seedream5-pro-layerize`) y `src/lib/ai/fal-pricing.ts`.
- Task: `docs/tasks/complete/TASK-1973-ai-inpaint-editing-techniques.md`.
- Canario real: `ai-generations/2026-10-03_task-1973-canary/README.md`.
- Contrato de Layerize: OpenAPI de fal leido el 2026-10-03 (`bounding_box.absolute` en pixeles de la base).
- Spec: [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) §Pipeline de inpainting.
