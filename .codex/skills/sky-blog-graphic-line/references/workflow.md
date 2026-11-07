# Flujo punta a punta

Rutas relativas al Workbench salvo que se diga otra cosa. `W=/Users/jreye/Documents/creative-workbench`,
`G=/Users/jreye/Documents/greenhouse-eo`.

## 0. Arranque

1. Leer `$W/AGENTS.md`, `$W/brands/sky-airline/blog/AGENTS.md` y la skill `efeonce-creative-workbench`
   (`references/state-continuity.md`).
2. `git -C $W status --short` y rama actual: preservar archivos ajenos. Antes de commit: `pnpm git:identidad --check`.
3. Una pieza por artículo: `pnpm pieza:nueva sky blog-n<art>-<slug>` (o reutilizar la existente). Completar `brief.md`.

## 1. Spec (Notion)

- Leer el **callout de spec dentro del artículo** (manda sobre la ficha; si difieren, se corrige la ficha) y la ficha
  de la tarea: tipo A–H, registro D/E, escena, hora, clima, REF, ALT, nombre de archivo, prohibiciones.
- La tarea debe estar en `Brief listo`. `Bloqueado` o `Pendiente aprobación interna` = no se genera.
- Lugar identificable sin REF-01 real = se pide antes de generar.

## 2. Prompt

```bash
cd $W
node brands/sky-airline/blog/scripts/prompt-plate.mjs --registro D --tipo A --portada \
  --lugar "…" --escena "…" --hora "…" --clima "…" \
  --primer-plano "…" --borde "lower-left corner" --ref-lugar "…" \
  > $G/ai-generations/<fecha>_sky-blog-n<art>/prompt-img1.txt
```

Leer el prompt completo antes de pagar. Para un lote: `--json specs.json` por pieza y un `run.sh` que recorra el JSON.

## 3. Generar el maestro (Greenhouse)

```bash
cd $G
D=ai-generations/<fecha>_sky-blog-n<art>
gtimeout 900 pnpm -s ai:image --openai-key personal \
  --prompt-file "$D/prompt-img1.txt" \
  --model gpt-image-2.5-sunburst --quality max --size 3840x2160 \
  --format png --out "$D/img1-maestro.png"
```

- Con REF-01 real: `--image "$D/refs/ref-01.jpg"` (modo edición). Para un lugar identificable el motor preferido es
  el mismo `gpt-image-2.5-sunburst` en modo edición. Nano Banana Pro está excluido (Julio, 2026-11-05).
- `--model` siempre explícito: desde el 2026-11-05 el default de `pnpm ai:image` es `gpt-image-2.5-flare`.
- Un maestro max 3840×2160 cuesta ≈ USD 0,40 estimado (13 342 tokens de salida; la entrada suma aparte). El log
  imprime la estimación, el motor, la resolución y la clave usada («clave personal»): guardarlo.
- `--openai-key personal` sólo para generación creativa operada por agente mientras quede crédito
  (`docs/manual-de-uso/ai-tooling/alternar-clave-openai.md`); nunca como default.
- Una intención por corrida: si sale mal, leer por qué, corregir el prompt y recién ahí volver a pagar. Nada de
  `--count` > 1 «por si acaso». Máximo tres intentos por pieza.
- Las carpetas `ai-generations/` no se versionan; copiar el maestro aprobado a `$W/projects/sky/<pieza>/salidas/`.

## 4. Medir (portada)

```bash
cd $W
node brands/sky-airline/blog/scripts/medir-portada.mjs projects/sky/<pieza>/salidas/img1-maestro.png \
  --sujeto u0,v0,u1,v1 --focal 0.5,0.5 --vista projects/sky/<pieza>/salidas/vistas
```

Mirar las vistas. La caja `--sujeto` empieza en la coronilla (pelo, sombrero), nunca en los hombros. Si falla: foco;
si el sujeto quedó bajo, alejar la cámara por expansión ([hero-and-export.md](hero-and-export.md) §7); si no, regenerar
con HERO SPACE (cuenta como intento).

## 5. Exportar

```bash
node brands/sky-airline/blog/scripts/exportar.mjs projects/sky/<pieza>/salidas/img1-maestro.png \
  --nombre <nombre-de-la-spec> --focal 0.5,0.5 --portada --out projects/sky/<pieza>/salidas/entrega
```

Interiores sin `--portada`. Revisar og y cuadrado por separado. Si falla por peso (follaje, manglar), exportar desde una
copia del maestro con desenfoque leve ([hero-and-export.md](hero-and-export.md) §5).

Antes de exportar, cualquier letra legible dentro de la foto se retoca con máscara ([qa-review.md](qa-review.md) §1).

## 6. Banner de ruta (si la spec lo pide)

Verificar la ruta el mismo día en skyairline.com y anotar la fuente. En el lote del 2026-11-05 la fuente fue el
catálogo de Notion «Precios y Rutas SKY» (sólo filas 🟢 Activa del mercado del lector), con la nota de volver a
verificar en skyairline.com el día de publicación. Escribir `projects/sky/<pieza>/jobs/<slug>.json`
([route-banners.md](route-banners.md)) y:

```bash
node brands/sky-airline/blog/scripts/componer-ruta.mjs projects/sky/<pieza>/jobs/<slug>.json --out projects/sky/<pieza>/runs
```

## 7. QA, revisión y entrega

[qa-review.md](qa-review.md): píxel al 100 %, secuencia del artículo, registro en la ficha. Subir a Frame.io, cambiar el
estado en Notion, entregar en OneDrive `SKY Blog SEO › 04 Entregables` la última versión aprobada; WordPress con ALT
literal, portada sin lazy.

**Entrega versionada.** La entrega vive en `04 Entregables/<mes>/<NN> - <artículo>/`, con un CSV índice del mes. La
sincronización copia por hash: sólo cambia lo que cambió en la fuente y toma la corrida de banners más reciente.

Cuando una ronda de revisión reemplaza archivos ya entregados:

- la carpeta del artículo se divide en `V1/` (la entrega original) y `V2/` (lo vigente), y las carpetas sin cambios
  no se tocan;
- el índice suma la columna «Versión»;
- después se verifica que V2 sea idéntica a lo vigente.

Procedimiento y conteos del lote de noviembre: [lessons.md](lessons.md), 2026-11-05.

## 8. Qué va a Git

| Va | No va |
|---|---|
| Contratos, compose, scripts, pruebas, `brief.md`, `pieza.json`, jobs JSON | Maestros, WebP, fotos de referencia, vistas, Metric (todo bajo `salidas/` o `runs/`, ignorados) |

Cambios de runtime (contratos, scripts): rama `claude/sky-blog-<tema>` en el Workbench, `node --test
brands/sky-airline/blog/test/*.test.mjs`, `node --test brands/sky-airline/test/*.test.mjs`, `pnpm gates`, commit.
Push y PR sólo con indicación del operador (el guard bloquea push a `main`).

## 9. Lote de varios artículos

Caso fuente: 54 artículos del 2026-11-05, pieza `projects/sky/blog-lote-2026-11/` (commits del Workbench `d74319e`,
`b81e0df`, `e8b2098` en `claude/sky-blog-visual-system`). Los maestros y logs viven en
`$G/ai-generations/2026-11-05_sky-blog-lote/{portadas,escenas}/` (sin versionar). Expediente y conteos:
`$G/docs/services/sky-blog-seo/LOTE_NOVIEMBRE_2026_PRODUCCION_IMAGENES.md`; paso a paso para el operador:
`$G/docs/manual-de-uso/growth/producir-imagenes-lote-blog-sky.md`.

> Los scripts de `tools/imagenes/` son la copia de lo que corrió esa sesión: tienen rutas absolutas y algunos leen
> archivos del scratchpad de la sesión (`runzoom2.sh` llama a `zoomout.mjs` desde el scratchpad, `assign3.py` lee
> `plan3.json` de ahí). Antes de reutilizarlos, apuntar las rutas a la pieza nueva; no son CLIs del harness.

| Paso | Qué se hace | Herramienta |
|---|---|---|
| 1. Specs | `specs/<id>.json` por artículo + `MANIFEST.json` (lo escribe la sesión editorial de `sky-blog-seo-editorial`; si difiere de Notion, manda Notion) | — |
| 2. Plates | Entradas de `prompt-plate` por imagen: portadas en `plates/portadas-*.json`, escenas en `plates/escenas-img23.json` | — |
| 3. Brandlift | Bloque de colorimetría y bokeh de la hoja 15 de Daniela Ferreira + lente por tipo, en el campo `extra` | `plates/brandlift.json` |
| 4. REF-01 | Buscar, mirar en hojas de contacto, leer descripción, licenciar en lote, anotar procedencia | [sources.md](sources.md) §5 |
| 5. Prompts | `buildPlatePrompt` por entrada; con REF, `refLugar` sale del texto de fidelidad del spec | `tools/imagenes/mkprompts.mjs` (portadas), `mkprompts23.mjs` (escenas) |
| 6. Generar | Varias tandas en segundo plano, cada una con su log; salta lo que ya existe | `tools/imagenes/run4.sh` (portadas), `gen23.sh` (escenas) |
| 7. Mirar | Hojas de contacto con miniaturas etiquetadas antes del gate | `tools/imagenes/sheet*.mjs`, `esheet.mjs`, `allsheet.mjs` |
| 8. Portada | `medir-portada` con caja desde la coronilla; si el sujeto quedó bajo, expansión | `tools/imagenes/zoomout.mjs` + `runzoom2.sh` |
| 9. Retoque | Letras legibles con `ai:mask` + `ai:inpaint` Flare | [qa-review.md](qa-review.md) §1 |
| 10. Exportar | `exportar.mjs` (`--portada` en IMG 1); desenfoque leve si no baja de 200 KB | [hero-and-export.md](hero-and-export.md) §5 |
| 11. Banners | Un job por formato (`jobs/<id>-ruta.json`, `jobs/<id>-ruta-movil.json`) → `componer-ruta.mjs` | [route-banners.md](route-banners.md) |

Generación de una tanda de escenas (prompts en `escenas/prompts/<id>.txt`, REF opcional en `escenas/refs/<id>-ref.jpg`):

```bash
cd $W
node projects/sky/blog-lote-2026-11/tools/imagenes/mkprompts23.mjs \
  projects/sky/blog-lote-2026-11/plates/escenas-img23.json \
  $G/ai-generations/<fecha>_sky-blog-lote/escenas/prompts \
  $G/ai-generations/<fecha>_sky-blog-lote/escenas/refs/refs23.json
bash projects/sky/blog-lote-2026-11/tools/imagenes/gen23.sh gen-a.log <id> <id> …   # una tanda por log
```

`gen23.sh` corre por cada id: `pnpm -s ai:image --openai-key personal --prompt-file … [--image <ref>] --model
gpt-image-2.5-sunburst --quality max --size 3840x2160 --format png --timeout 600000 --out …/maestros/<id>-maestro.png`.
El 2026-11-05 corrieron seis tandas (`gen-a.log` … `gen-f.log`) con 93 escenas.

Reglas del lote:

- **Bloqueos antes de pagar.** Spec `Bloqueado`, artículo sin aprobación del tema, lugar identificable sin REF válida o
  banner sin ruta 🟢 Activa: no se genera ni se compone; se deja el motivo en el expediente.
- **Una sesión produce.** Julio pidió producir en la sesión que ya tenía el contexto («¿Y si produces tú las
  imágenes?», 2026-11-05), en vez de derivar a otra sesión.
- **Estimar el costo desde los logs sin contar dos veces:** sumar las líneas `costo estimado ≈ USD` de cada log una
  sola vez (un glob que incluye el mismo log por dos caminos lo duplica; ver [lessons.md](lessons.md)).
- **Nada se sube** a Frame.io, Notion ni WordPress sin la revisión humana; `pieza.json` queda en `en-produccion` y
  `approval: pending-human-and-pixel-review`.

