# QA visual de piezas Berel

> **Snapshot del 2026-11-02.** El QA mecánico lo escribe `composeBerel` en
> `brands/berel/compose/render.mjs`; el CLI `brands/berel/scripts/componer.mjs` lo guarda como
> `runs/<uuid>/qa.json`. El QA del corrector de color lo escribe `ajustar-muro.mjs` (ver
> `color-pipeline.md`); el del producto en escena, `producto-en-escena.mjs verificar` (§3 bis), y el del
> reel, `reel.mjs qa` (§3 ter). Nada de esto aprueba una pieza: aprueban personas.

## 1. Regla base: mirar el píxel real

`qa.json` mide lo que el motor sabe medir. No sabe si el marcador «se ve bien», si el remate de un
muro baja el estrato o si el titular compite con la foto. Por eso **cada pieza se abre al 100 % en
su formato final** (el webp del blog, el PNG social) antes de subirla o de declararla lista. Una
corrida sin advertencias tampoco prueba que la pieza esté bien.

## 2. Checklist de revisión del píxel

Revisa cada pieza, en este orden:

- [ ] **Marcador legible:** aro, guía, nombre y código nítidos; el tono (blanco o ink) se lee contra
      el muro a tamaño de pantalla de móvil.
- [ ] **Sin objetos:** ni bajo el marcador ni rozándolo (lámparas, cuadros, repisas, brazos de
      lámpara, plantas). Cita del operador: «Necesitamos reglas para que esto no se ponga sobre
      objetos así porque pierde limpieza y no se lee bien el texto».
- [ ] **Aire:** el marcador respira; no queda apretado entre objetos ni pegado al borde. Cita: «juegues
      con el aire con elegancia».
- [ ] **Titular (post, story):** ≤ 3 líneas, balanceado, sobre muro liso del cuadrante superior
      izquierdo, sin ventana, lámpara, concreto ni vidrio claro detrás; tono correcto (ink sobre muros
      claros, blanco sobre medios u oscuros). Marcador y titular no se apilan.
- [ ] **Logo en zona limpia:** el SVG oficial, un solo logo compuesto, blanco sobre foto o negro sobre
      papel, en su posición del formato y sobre una esquina calma (sin objetos detrás). La story no lleva
      logo. El logo impreso en la etiqueta de un producto en escena no cuenta: la firma se mantiene.
- [ ] **Producto en escena (si lo hay):** es el render oficial vigente (nunca una maqueta de
      `excludedRenders` ni una lata generada); se ve fotografiado (luz, sombra de contacto, reflejos) y no
      pegado; textos de la etiqueta correctos al 100 %; tamaño creíble para su contenido; no toca la banda
      del titular ni el logo; no lo corta un borde. Ver `photography.md` §6 bis.
- [ ] **Muro del color declarado:** el muro se ve del color del marcador. Si la foto pasó por el
      corrector, revisa también su máscara (sin costuras, sol y sombra conservados, objetos de tono
      parecido intactos).
- [ ] **Recoloreo a otro tono (franjas, variantes de color):** al 100 %, sin color viejo en las esquinas
      superiores ni en los bordes del muro, y sin halo del color original alrededor de marcos, macetas o
      muebles; los objetos de madera o barro conservan su color. Origen (2026-11-04, franjas N2 de Color a la
      Mexicana): las muescas en la zona dejaron halos rosas. Receta en `color-pipeline.md` §6.
- [ ] **Colores permitidos para el artículo:** ningún color con `2026:FRIDA KAHLO` en `sources` fuera de un
      artículo de Frida, ni un color de cartilla de línea fuera de un artículo de esa línea
      (`color-pipeline.md` §2). Un nombre de paleta distinto al del catálogo (Azul Campeón 432N) solo si está en
      `berel-color-aliases.json` con su fuente (`color-pipeline.md` §5 bis).
- [ ] **Remates terminados:** todo encuentro muro-plafón, viga, piso o vano con línea limpia y sombra
      de remate; nunca pintura terminando irregular contra concreto o piedra. Origen (2026-11-02,
      terraza): «Esto es un frizo mal terminado? si es así no se puede aprobar para Berel por el
      estrato».
- [ ] **Estrato:** la escena se ve de estrato medio-alto a alto según su registro; nunca
      fraccionamiento genérico, aluminio blanco, laminado, plástico o desorden. Ver `photography.md`.
      Si el comentario es «que se vea de mayor poder adquisitivo», la corrección es regenerar en registro
      `alto` (`photography.md` §2), no cambiar muebles sobre el mismo plate (2026-11-04).
- [ ] **Blog sin texto:** sin titular, píldora ni CTA en banners de blog.
- [ ] **Nada de Efeonce** ni texto o logos generados dentro de la foto (el producto oficial en escena, con su etiqueta, sí;
      y la pieza mantiene su firma).
- [ ] **Recortes verticales:** en post, story y Pinterest no entran elementos que el horizontal
      escondía (en la terraza, la viga entraba completa y la píldora caía encima).
- [ ] **Piezas sociales con el título del artículo** (2026-11-05): post, story y reel llevan el mismo título del
      artículo; la story funciona como story (profundidad, objeto focal, titular en muro calmo, aire abajo para
      stickers), nunca una superficie plana llenando el cuadro (`photography.md` §6).
- [ ] **Co-branding con un tercero (si lo hay):** escudo compuesto desde el SVG oficial y terminado por el modelo (no se ve
      «puesto»); sin patrocinadores, marcador, gráficos de televisora ni firmas reales; nada histórico que la fuente no
      respalde (`photography.md` §6 ter).
- [ ] **Objeto agregado sobre un patrón:** el patrón (franjas, azulejo) sigue continuo detrás y alrededor del objeto;
      la caja del objeto no corta su marco; 0 píxeles distintos fuera de objeto + sombra (`photography.md` §6 quater).

Si un punto falla, no se «acepta con nota»: se corrige el plate, el foco (`photo.focal`), el titular
o el color, y se vuelve a componer.

## 3. Cómo leer `qa.json`

| Campo | Qué dice | Qué revisar |
|---|---|---|
| `recipe`, `format`, `width`, `height` | Receta y medida compuestas | Que coincidan con la ficha |
| `markers[]` | Marcadores colocados | Ver tabla siguiente |
| `droppedMarkers[]` | Marcadores eliminados `{ name, code, why }` | Un color de la ficha sin marcador: decide si se acepta o se corrige la foto (ver `marker-grid.md` §7) |
| `warnings[]` | Avisos del compositor | **Cada aviso se mira en el píxel.** No se borra ni se ignora |
| `titleTone` | `light` (blanco) o `dark` (ink) | Que el titular se lea |
| `titleBackground` | Densidad de bordes bajo el titular (sin desenfoque) | > 6 es fondo cargado; muro limpio 1,5–4,4 |
| `webpQuality` | Calidad webp final (86 → 62) | Calidades bajas pueden ensuciar el muro: míralo |
| `underWeight` | `true` si el webp quedó ≤ 200 KB | `false` = no cumple la Spec; no se entrega |
| `bytes`, `sha256`, `overlaySha256` | Peso y huellas del archivo y de la capa vectorial | Trazabilidad entre corridas |
| `approval` | Siempre `pending-human-and-pixel-review` | Nunca cambia solo |
| `file` | Nombre del archivo en la corrida (lo añade el CLI) | |

Cada elemento de `markers[]`:

| Campo | Significado |
|---|---|
| `name`, `code` | Par del catálogo validado |
| `x`, `y` | Centro del aro en el cuadro final (para revisión; nunca se copian a un job) |
| `cell` | `[columna, fila]` de la grilla del formato |
| `tone` | `light` (blanco) o `dark` (ink), por contraste 3:1 |
| `side` | Lado del texto (`right` = texto a la derecha del aro) |
| `air` | Bordes en el margen de 6 % alrededor; ≤ 3,5 en primer nivel |
| `busy` | Peor tramo de bordes bajo el marcador; ≤ 3 siempre |
| `wall` | Peor tramo de la fracción de píxeles del muro de su color; ≥ 0,85 |
| `score` | Puntaje de la celda elegida (menor = mejor) |
| `fallback` | Solo si salió del segundo nivel: `la franja de la píldora, sobre el titular` o `apretado entre objetos (aire X > 3.5)` |

Avisos posibles en `warnings[]`:

- «`«<nombre>» sin celda de primer nivel: <fallback>; revísalo o acorta el titular / cambia el foco`».
- «`«<nombre>» sin marcador: <razón>`».
- «`titular sobre fondo cargado (bordes X > 6): reserva el cuadrante superior izquierdo del plate o cambia el foco`».
  Si persiste con todo foco razonable (fachada N1 de Color a la Mexicana, 2026-11-04: bordes 9–17 de 0.15 a 0.85),
  la salida permitida es componer el post con otra escena del mismo artículo y declararlo en el handoff
  (`photography.md` §6); no se acepta el aviso.

Lecturas conocidas que **no** son error (2026-11-04):

- En `blog.franjas`, un color de la ficha eliminado con la razón «el muro de ese color no aparece libre» cuando el
  muro sí está: suele ser el nombre largo, cuya caja más su respiro no cabe en el muro libre de la franja (con una
  puerta centrada quedan ≈ 270 px por franja de un tercio). Detalle y salidas en `marker-grid.md` §10.
- En el corrector, `⚠ el muro detectado cubre menos del 5 %` al corregir una superficie chica (una puerta) es
  esperado; se revisa la máscara igual.

`qa.logoBed` (contraste del logo blanco contra el 1 % más claro de su caja y nitidez p99) aparece siempre como
dato; solo avisa («logo sin lecho: …») si el job declara `photo.lecho` (opcional, apagado por defecto). Umbrales
en `foreground.measure` del contrato de fotografía (contraste 4,5:1, nitidez ≤ 25).

## 3 bis. `qa.json` del producto en escena (`verificar`)

Lo escribe `producto-en-escena.mjs verificar --dir <salida>`; sale con código 1 si falla.

| Campo | Qué dice | Umbral |
|---|---|---|
| `heightRatio` | Alto del producto redibujado ÷ el colocado | 0,88–1,12 |
| `shiftX` | Corrimiento horizontal del producto (px) | ≤ 30 |
| `sceneDiff` | Diferencia media de la escena fuera del producto (/255) | ≤ 8 |
| `ocr` / `textosNoLeidos` | Textos clave leídos por OCR local (Vision `.fast`) | Aviso: no lee el logotipo «Berel» ni todo texto estilizado |
| `ok`, `fallas`, `approval` | Veredicto mecánico; `approval` siempre `pending-human-and-pixel-review` | — |

Si un texto clave quedó mal, el respaldo es `restituir` (etiqueta desde el render; fidelidad ≥ 0,95). Mira siempre la
etiqueta al 100 %: el texto diminuto sale aproximado.

## 3 ter. QA del reel (`reel.mjs qa`)

Escribe `<modelo>-qa.json` y `<modelo>-hoja.jpg` junto al clip; sale con código 1 si falla
(`contracts/berel-video-reels.json` → `qa`, snapshot 2026-11-02):

| Campo | Qué mide | Umbral |
|---|---|---|
| `deltaE` | ΔE CIE76 del muro en el último cuadro contra el cuadro después, sobre la máscara del muro (o `--zona`) | ≤ 4 |
| `fluidez.saltoMax` | % del cambio total que ocurre en el salto más brusco entre dos cuadros | ≤ 5 |
| `fluidez.cuadrosMitadCambio`, `tSaltoMax` | Cuántos saltos concentran la mitad del cambio y cuándo ocurre el mayor | Informativos |

Lo que no mide y se mira en la hoja y en el clip: muebles que entran semitransparentes, objetos flotando, un círculo
de pintura artificial, cámara que se mueve. En el reel armado revisa además que el marcador (2,5 s) y el titular
(4,5 s) caigan sobre muro limpio, que la tapa entre limpia a los 8 s y que la música no tape los efectos de la tapa.
Detalle en `video.md`.

**Salto buscado (2026-11-05, reel de Rayados).** `fluidez` falló en el destello de la tele al encenderse: es el golpe
pedido en el prompt, no un defecto. El color pasó (ΔE 2,2). Un `salto` que coincide con un efecto intencional se acepta
solo después de mirar el clip y se declara en el handoff; el ΔE del muro nunca se relaja.

## 4. Hoja de contacto antes de subir

Antes de subir un lote al canvas, arma una hoja de contacto local con todas las piezas (una fila por
espacio, cuatro formatos por fila: portada, post, story, Pinterest) para revisar el lote de un
vistazo: consistencia de marcadores, titulares, logos y estrato entre espacios. En la sesión del
2026-11-02 se armó con `sharp` para las 40 piezas; **no hay script versionado** para esto en
`brands/berel/scripts/` (verificado el 2026-11-02), así que se genera en el scratchpad de la sesión,
fuera de Git y fuera del Workbench. La hoja es para revisar, no se entrega.

Después de la hoja, igual se mira cada pieza al 100 %: la miniatura esconde objetos finos bajo el
marcador.

## 5. Revisión en el canvas de Claude Design

- La revisión humana del lote ocurre en el canvas de Claude Design, con artboards por espacio
  (portada, post, story, Pinterest). Canvas de revisión: `https://claude.ai/artifact/DTJR1QxZDtamvRQQRqY7zW`;
  Design System Berel: `https://claude.ai/artifact/NbL96tUf9snkpRAsgQ81s8`. Ambos son **privados**;
  se comparten con Daniela, Andrés y Melkin.
- Subida (detalle en `workflow.md`): assets webp con Artifact `asset: true` (≤ 25 por llamada),
  reemplazar cada `/_blob/<id>` en el `.dc.html` por la URL devuelta y publicar con `root`.
- **Comentarios:** llegan como hilos del artifact. Se responden **en el hilo**, no en el chat. Antes de
  corregir, separa error comprobable, ajuste visual medible y preferencia; luego corrige, vuelve a
  componer, mira el píxel y responde en el hilo qué cambió y con qué evidencia (por ejemplo, ΔE antes
  y después, o la nueva celda del marcador).
- Si un comentario revela una regla nueva (como el frizo de la terraza), la regla va al contrato del
  Workbench, a esta skill y a `lessons.md` en el mismo trabajo.

## 6. Estados de una pieza

| Estado | Qué significa | Quién lo pone |
|---|---|---|
| **Preparado** | Compuesto por el CLI: existe `runs/<uuid>/` con pieza, `job.json` y `qa.json` | El agente |
| **Validado** | `qa.json` revisado (avisos y eliminados entendidos), `underWeight` en `true` en blog, corrector con ΔE ≤ 3 si aplica, pruebas y gates en verde | El agente |
| **Revisado** | Píxel mirado al 100 % con el checklist del §2, hoja de contacto y subida al canvas | El agente, con evidencia |
| **Aprobado** | Aprobación de diseño de Daniela, Andrés o Melkin, y luego de Berel | Solo personas |

Estos cuatro estados son el vocabulario de esta skill para reportar avance; no existen como campo en `qa.json` ni en el Workbench.

**Nada se aprueba solo.** Un agente puede llegar hasta «revisado» y debe decirlo así. `qa.approval`
queda en `pending-human-and-pixel-review` aunque la pieza esté aprobada por personas: la aprobación
vive en la revisión humana, no en el archivo. Berel sigue `gated` en `clients/brands.json`.

## 7. Gates

Antes de declarar validado un cambio de código, contrato o lote:

```bash
cd /Users/jreye/Documents/creative-workbench
node --test brands/berel/test/*.test.mjs test/surface-color.test.mjs
npm run gates
git diff --name-only   # todo cambio Berel dentro de brands/berel/** o projects/berel/**
```

- 37 pruebas al 2026-11-02: 12 del compositor, 9 del builder de prompts, 5 del producto en escena, 3 del lecho,
  6 del reel y 2 del corrector neutral. Al 2026-11-05, con la prueba de alias de paleta en `compose.test.mjs`
  (`berel-color-aliases.json`): 37 PASS, 0 saltadas, con los recursos locales presentes.
  Las del compositor **se saltan** sin Gotham Rounded y el catálogo en
  `clients/berel/.resources-local/`: `skipped` no es verde. En una máquina sin recursos, di que no se
  verificaron.
- `npm run gates` corre `managed-drift`, `hygiene`, `piezas` y `native-policy` (`gates/run-all.mjs`).
- Si `git diff --name-only` muestra archivos fuera de `brands/berel/**` o `projects/berel/**`, detente:
  la advertencia del operador es explícita («cuidado dañas el flujo que usamos para efeonce»).
