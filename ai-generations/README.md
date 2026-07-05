# AI Image Generations

Registro navegable de **assets visuales generados con IA** en Greenhouse — para poder verlos, comparar iteraciones y reutilizar los prompts sin re-descubrir el pipeline cada vez.

> No confundir con `public/images/generated/` (assets de producto ya integrados) ni con `.captures/` (efímero, gitignoreado, GC>30d). Esta carpeta es **durable y versionada**: es el cuaderno de bitácora de generación.

## Convención

Cada corrida de generación vive en su propia subcarpeta con **nombre semántico + fecha**:

```
ai-generations/
  README.md                                  # este archivo
  INDEX.md                                    # índice de todas las corridas
  YYYY-MM-DD_<nombre-semantico>/
    README.md                                 # propósito, fuente, motor, prompts verbatim
    manifest.json                             # metadata estructurada de la corrida
    <asset>.png                               # los resultados (opaco + transparente)
```

Al agregar una corrida nueva: crear la subcarpeta `YYYY-MM-DD_<slug>/`, poblar `README.md` + `manifest.json`, y agregar una fila a [`INDEX.md`](./INDEX.md).

## Pipeline canónico (cómo se generan)

Tooling sancionado (no scripts ad-hoc):

1. **Generar / editar** — `pnpm ai:image` (`scripts/ai/generate-image.ts`, helper `src/lib/ai/openai-image.ts`, key vía Secret Manager).
   - Desde cero: `pnpm ai:image --prompt "…" --out …`
   - **Edit con referencia** (consistencia de personaje/estilo/logo): `pnpm ai:image --image ref.png --prompt "keep this exact …, change only <delta>" --out …`
2. **Remover fondo** (si el motor devolvió fondo plano opaco) — `pnpm ai:image:rmbg <in.png> <out.png>` (`scripts/ai/remove-bg.ts`): matting AI local → transparente, con bordes suaves para pelo/personajes. No usa servicios de pago.
3. **(Opcional) Re-estampar** un logo/isotipo exacto por composición cuando se requiera fidelidad pixel-perfect.

Doctrina, motores y prompts detallados: skill **`greenhouse-ai-image-generator`** (`.claude/skills/` y `.codex/skills/`) + `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`.
