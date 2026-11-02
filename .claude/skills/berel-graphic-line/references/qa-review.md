# QA visual de piezas Berel

> **Snapshot del 2026-11-02.** El QA mecánico lo escribe `composeBerel` en
> `brands/berel/compose/render.mjs`; el CLI `brands/berel/scripts/componer.mjs` lo guarda como
> `runs/<uuid>/qa.json`. El QA del corrector de color lo escribe `ajustar-muro.mjs` (ver
> `color-pipeline.md`). Nada de esto aprueba una pieza: aprueban personas.

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
- [ ] **Logo en zona limpia:** el SVG oficial, uno solo, blanco sobre foto o negro sobre papel, en su
      posición del formato y sobre una esquina calma (sin objetos detrás). La story no lleva logo.
- [ ] **Muro del color declarado:** el muro se ve del color del marcador. Si la foto pasó por el
      corrector, revisa también su máscara (sin costuras, sol y sombra conservados, objetos de tono
      parecido intactos).
- [ ] **Remates terminados:** todo encuentro muro-plafón, viga, piso o vano con línea limpia y sombra
      de remate; nunca pintura terminando irregular contra concreto o piedra. Origen (2026-11-02,
      terraza): «Esto es un frizo mal terminado? si es así no se puede aprobar para Berel por el
      estrato».
- [ ] **Estrato:** la escena se ve de estrato medio-alto a alto según su registro; nunca
      fraccionamiento genérico, aluminio blanco, laminado, plástico o desorden. Ver `photography.md`.
- [ ] **Blog sin texto:** sin titular, píldora ni CTA en banners de blog.
- [ ] **Nada de Efeonce** ni texto o logos dentro de la foto.
- [ ] **Recortes verticales:** en post, story y Pinterest no entran elementos que el horizontal
      escondía (en la terraza, la viga entraba completa y la píldora caía encima).

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
pnpm gates
git diff --name-only   # todo cambio Berel dentro de brands/berel/** o projects/berel/**
```

- 16 pruebas al 2026-11-02 (12 del compositor, 2 del builder de prompts, 2 del corrector neutral).
  Las del compositor **se saltan** sin Gotham Rounded y el catálogo en
  `clients/berel/.resources-local/`: `skipped` no es verde. En una máquina sin recursos, di que no se
  verificaron.
- `pnpm gates` corre `managed-drift`, `hygiene`, `piezas` y `native-policy` (`gates/run-all.mjs`).
- Si `git diff --name-only` muestra archivos fuera de `brands/berel/**` o `projects/berel/**`, detente:
  la advertencia del operador es explícita («cuidado dañas el flujo que usamos para efeonce»).
