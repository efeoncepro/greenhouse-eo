# Content Factory — Ideación y Co-creación

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-03 por Claude
> **Modulo:** Public Site / AI Content Factory (EPIC-019, TASK-1123 Slice 8-9)
> **Documentacion tecnica:** `src/lib/public-site/content-factory/{article-authoring,article-ideation}.ts`

## Para qué sirve

Convierte una idea en un blogpost Gutenberg bien armado para `efeoncepro.com`, en
dos modos: **autónomo** (un agente produce solo) y **co-creativo** (tú vas y vienes
con Claude Code, Codex o Nexa hasta dejarlo como quieres). Los dos modos usan el
mismo lienzo compartido: la **`GutenbergArticleSpec`**.

## El lienzo compartido: la spec

Todo gira alrededor de un artefacto tipado, la `GutenbergArticleSpec`:

```
title · slug? · excerpt · seo{title, description, indexPolicy?}
intro[]                       ← párrafos antes del índice
sections[{ heading, level(2|3), blocks[] }]   ← párrafo, lista, quote, pullquote, separator, imagen o embed
cta?{ text: string | [{text, href?}] }
attribution?{ campaignId?, hubspotCampaignId?, utm? }
```

La spec es **producible por un LLM, editable por un humano y co-autorable por
cualquier agente**. De ahí se ensambla el draft con `authorGutenbergDraft`, que
garantiza la estructura correcta (headings anclados + TOC de Yoast poblado +
escaping + no inventa media). El contenido lo decide el autor; la estructura la
garantiza el ensamblado. Por eso la clase de defecto del TOC roto no puede volver.

Los párrafos, listas y el CTA aceptan segmentos de rich text estructurado para
enlaces inline. El renderer escapa texto y atributos y solo admite `http:`,
`https:` y `mailto:`. Una imagen exige `mediaId`, URL y ALT reales; la spec nunca
debe inventar assets ni IDs de WordPress.

## Modo autónomo

Un agente (o Nexa, o un cron) produce la spec desde una idea:

```bash
pnpm public-website:content-factory:ideate -- \
  --idea "tu idea" --audience "..." --keyword "..." --out spec.json
```

`ideateArticleSpec` llama al modelo (Claude vía el cliente canónico `src/lib/ai/`)
con las reglas editoriales de Efeonce embebidas (voz es-CL tuteo, estructura
intro→índice→secciones, ≥3 headings, ≥2 H2, enriquecimiento, **solo datos
públicos, sin inventar cifras ni media**, SEO con variables Yoast). Devuelve una
spec que ya pasa `authorGutenbergDraft` + validación.

## Modo co-creativo

Tú steering, el agente revisa, preservando lo que no tocas:

```bash
pnpm public-website:content-factory:ideate -- \
  --revise spec.json --instruction "agrega una sección sobre X y hazme el CTA más directo"
```

`reviseArticleSpec` toma la spec actual + tu instrucción y devuelve la spec
revisada. Iteras cuantas veces quieras. Es donde inyectas tu criterio y
conocimiento tácito — lo que ningún modelo tiene.

### Co-crear con Claude Code / Codex directamente

Cuando trabajas con un agente en sesión (Claude Code, Codex), **el agente ES el
LLM**: no necesita llamar al CLI. El loop es:

1. Le das la idea + tu ángulo.
2. El agente propone la spec (o secciones), componiendo `copywriting`,
   `digital-marketing` y `seo-aeo`.
3. Editas: cambias copy, reordenas, agregas tu criterio, marcas qué datos son
   reales.
4. El agente ajusta la spec.
5. Cuando te gusta, se ensambla con `authorGutenbergDraft` y se valida.

### Co-crear con Nexa

Nexa consume los mismos primitives (`ideateArticleSpec` / `reviseArticleSpec` /
`authorGutenbergDraft`) como cualquier consumer — no hay nada "Nexa-específico".
Reads directos; el write final (a WordPress) sigue el loop gobernado
`propose → confirm → execute`.

## Qué NO hace

- No publica como efecto del ideation/authoring. La spec puede llegar a un post privado por el write path gobernado,
  pero `publish` es una transicion posterior con autorizacion humana explicita, snapshot, rollback y QA live.
- No inventa imágenes/videos ni cifras: la media la agregas tú con un asset real.
- No reemplaza tu criterio: el modo autónomo es un punto de partida; el valor real
  aparece cuando co-creas.

El flujo completo, incluida la frontera entre `private` y `publish`, vive en
`docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`.

## Referencias técnicas

- Ensamblado determinista: `src/lib/public-site/content-factory/article-authoring.ts`
- Ideación LLM (ideate + revise): `src/lib/public-site/content-factory/article-ideation.ts`
- Bloques canónicos (anclas + TOC): `src/lib/public-site/content-factory/gutenberg-blocks.ts`
- Validación: `src/lib/public-site/content-factory/gutenberg-validator.ts`
- Recipes: `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
