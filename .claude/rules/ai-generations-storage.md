---
paths:
  - "ai-generations/**"
  - "scripts/foto/**"
  - "scripts/ai-generations/**"
  - "scripts/creative/**"
  - "src/lib/brand-surfaces/**"
  - "docs/operations/brand-graphic-line/**"
---

# `ai-generations/` — dónde vive cada archivo (auto-load por path)

SSOT: [`docs/operations/AI_GENERATIONS_STORAGE_V1.md`](../../docs/operations/AI_GENERATIONS_STORAGE_V1.md). Local =
lo protegido (derivado del lock, las recetas del deck y las citas en `src/**`/`scripts/**`) + lo nuevo; canon
`gs://efeonce-creative-canon` = lo sellado en `scripts/foto/assets.lock.json`; archivo `gs://efeonce-group-greenhouse-private-assets-prod`
= exploración, con su `artifacts.remote.json` (en git) como inventario. Comandos: `pnpm ai-gen:where|pull|protected|archive`.

1. Una ruta `ai-generations/...` citada en una skill o un doc es **LÓGICA**: si no está en disco,
   `pnpm ai-gen:where <ruta>` y `pnpm ai-gen:pull <carpeta>` **antes de componer**.
2. **NUNCA** regenerar, sustituir ni «aproximar» un plate, kit o referencia aprobada porque falta; **NUNCA** resellar
   `assets.lock.json` para tapar un faltante; **NUNCA** editar un `artifacts.remote.json` a mano.
3. **NUNCA** archivar a mano (`gcloud storage cp/rm`) ni borrar carpetas de `ai-generations/` fuera de
   `pnpm ai-gen:archive` (extiende `media:archive-ai-generation`); lo archivado nunca se borra.
4. Promover exploración a canónica = sellarla en el lock o citarla en la receta (eso la protege) **y** publicarla con
   `pnpm creative:assets:publish apply`. Citarla en un doc no basta.
