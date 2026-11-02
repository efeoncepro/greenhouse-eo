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
  Nano Banana Pro (`docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`).
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

Mirar las vistas. Si falla: foco, o regenerar con HERO SPACE (cuenta como intento).

## 5. Exportar

```bash
node brands/sky-airline/blog/scripts/exportar.mjs projects/sky/<pieza>/salidas/img1-maestro.png \
  --nombre <nombre-de-la-spec> --focal 0.5,0.5 --portada --out projects/sky/<pieza>/salidas/entrega
```

Interiores sin `--portada`. Revisar og y cuadrado por separado.

## 6. Banner de ruta (si la spec lo pide)

Verificar la ruta el mismo día en skyairline.com y anotar la fuente. Escribir `projects/sky/<pieza>/jobs/<slug>.json`
([route-banners.md](route-banners.md)) y:

```bash
node brands/sky-airline/blog/scripts/componer-ruta.mjs projects/sky/<pieza>/jobs/<slug>.json --out projects/sky/<pieza>/runs
```

## 7. QA, revisión y entrega

[qa-review.md](qa-review.md): píxel al 100 %, secuencia del artículo, registro en la ficha. Subir a Frame.io, cambiar el
estado en Notion, entregar en OneDrive `SKY Blog SEO › 04 Entregables` la última versión aprobada; WordPress con ALT
literal, portada sin lazy.

## 8. Qué va a Git

| Va | No va |
|---|---|
| Contratos, compose, scripts, pruebas, `brief.md`, `pieza.json`, jobs JSON | Maestros, WebP, fotos de referencia, vistas, Metric (todo bajo `salidas/` o `runs/`, ignorados) |

Cambios de runtime (contratos, scripts): rama `claude/sky-blog-<tema>` en el Workbench, `node --test
brands/sky-airline/blog/test/*.test.mjs`, `node --test brands/sky-airline/test/*.test.mjs`, `pnpm gates`, commit.
Push y PR sólo con indicación del operador (el guard bloquea push a `main`).
