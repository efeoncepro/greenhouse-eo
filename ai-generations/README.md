# AI Image Generations

Registro navegable de **corridas visuales generadas con IA** en Greenhouse — para poder ver propósito, prompts, metadata, decisiones y rutas publicadas sin re-descubrir el pipeline cada vez.

> No confundir con `public/images/generated/` (assets de producto ya integrados) ni con `.captures/` (efímero, gitignoreado, GC>30d). Esta carpeta es **durable y versionada**: es el cuaderno de bitácora de generación.
>
> Regla de peso vigente: los binarios pesados generados (`png`, `jpg`, `webp`, `mp4`, `webm`, `mov`, etc.) son artefactos locales o de runtime/CDN, no source del portal Greenhouse. El repo versiona manifiestos, prompts, scripts reproducibles, README e índices. Los assets aprobados para sitios públicos viven en el runtime WordPress/CDN correspondiente y se referencian desde la documentación.

## Convención

Cada corrida de generación vive en su propia subcarpeta con **nombre semántico + fecha**:

```
ai-generations/
  README.md                                  # este archivo
  INDEX.md                                    # índice de todas las corridas
  YYYY-MM-DD_<nombre-semantico>/
    README.md                                 # propósito, fuente, motor, prompts verbatim
    manifest.json                             # metadata estructurada de la corrida
    prompts/*.md|*.txt                         # prompts y storyboards versionables
    render-*.mjs                               # scripts reproducibles, si aplica
    review/                                    # previews locales, gitignoreadas si son imagen/video
```

Al agregar una corrida nueva: crear la subcarpeta `YYYY-MM-DD_<slug>/`, poblar `README.md` + metadata/prompts/scripts livianos, y agregar una fila a [`INDEX.md`](./INDEX.md). No usar `git add -f` para binarios de generación salvo aprobación explícita y justificación de tamaño.

## Archivo Pesado

Cuando una corrida produzca frames, masters, exports o contact sheets pesados,
archivarlos en GCS y dejar sólo el manifest liviano:

```bash
pnpm media:archive-ai-generation -- --run ai-generations/<run> --apply
```

Esto crea `artifacts.remote.json` con `gs://`, tamaño y SHA-256 por archivo.
El bucket por defecto es privado:

```text
gs://efeonce-group-greenhouse-private-assets-prod/ai-generations/<run>/
```

Los binarios dentro de `ai-generations/` están gitignoreados y la carpeta queda
excluida del upload Vercel mediante `.vercelignore`.

## Pipeline canónico (cómo se generan)

Tooling sancionado (no scripts ad-hoc):

1. **Generar / editar** — `pnpm ai:image` (`scripts/ai/generate-image.ts`, helper `src/lib/ai/openai-image.ts`, key vía Secret Manager).
   - Desde cero: `pnpm ai:image --prompt "…" --out …`
   - **Edit con referencia** (consistencia de personaje/estilo/logo): `pnpm ai:image --image ref.png --prompt "keep this exact …, change only <delta>" --out …`
2. **Remover fondo** (si el motor devolvió fondo plano opaco) — `pnpm ai:image:rmbg <in.png> <out.png>` (`scripts/ai/remove-bg.ts`): matting AI local → transparente, con bordes suaves para pelo/personajes. No usa servicios de pago.
3. **(Opcional) Re-estampar** un logo/isotipo exacto por composición cuando se requiera fidelidad pixel-perfect.

Doctrina, motores y prompts detallados: skill **`greenhouse-ai-image-generator`** (`.claude/skills/` y `.codex/skills/`) + `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`.
