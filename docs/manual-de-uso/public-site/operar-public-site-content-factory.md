# Operar Public Site y Content Factory

> **Tipo de documento:** Manual de uso
> **Version:** 3.0
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-07-15 por Codex (primer ciclo agentic end to end publicado)
> **Modulo:** Public Site / Content Factory / Astro binding
> **Comandos/API:** `pnpm public-website:content-factory:{ideate,author,run,validate,plan}`, `pnpm public-website:*`, `GET /api/admin/public-site/binding`
> **Documentacion relacionada:** `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`, `docs/documentation/public-site/content-factory-ideation-and-cocreation.md`, `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`, `docs/documentation/public-site/wordpress-blog-content-hub-search.md`, `docs/documentation/public-site/public-site-content-factory-end-to-end.md`

## Antes de empezar

Asume modo no mutante hasta que exista una instruccion explicita. El sitio publico no se toca por accidente. El pipeline de creacion es DRY por default; `--send` escribe un post privado, no lo publica. La transicion a `publish` es otra operacion y exige autorizacion humana explicita, snapshot y rollback.

## Crear y publicar un articulo de blog (pipeline ideate → co-crear → publicar)

Este es el flujo operador para llevar una idea a un post del blog `efeoncepro.com`,
bien armado con bloques Gutenberg y firmado por ti. El pipeline produce un **borrador
privado**. La publicacion siempre es una decision humana final; el operador puede ejecutarla en WP-Admin o pedirle al agente que la aplique por el write path sancionado y verifique el resultado.

### Modo 1 — autonomo (el agente produce solo)

1. Da una idea con contexto:

   ```bash
   pnpm public-website:content-factory:ideate -- \
     --idea "tu idea" --audience "a quien le hablas" --keyword "keyword primaria" \
     --out spec.json
   ```

   Genera una `spec.json` (el articulo estructurado) y la valida. Requiere
   `ANTHROPIC_API_KEY`/`_SECRET_REF`.

2. Revisa la `spec.json`. Si algo no te gusta, pasa al modo co-creativo.

### Modo 2 — co-creativo (tu + un agente iteran)

- Con el CLI, steering una spec existente:

  ```bash
  pnpm public-website:content-factory:ideate -- \
    --revise spec.json --instruction "agrega una seccion sobre X y haz el CTA mas directo" \
    --out spec.json
  ```

  Itera cuantas veces quieras. Aqui inyectas tu criterio y conocimiento que ningun
  modelo tiene.

- Trabajando con Claude Code / Codex / Nexa en sesion: el agente ES el modelo, te
  propone la spec, la editas, ajusta, y cuando te gusta se ensambla. La spec es el
  lienzo compartido.

### Ensamblar, validar y (opcional) escribir

3. Ensambla + valida sin escribir (DRY):

   ```bash
   pnpm public-website:content-factory:run -- --spec spec.json
   ```

   `validation: pass` = listo. `warning`/`block` = revisa los findings antes de seguir.

4. Escribe el borrador privado firmado por ti (paso gobernado, requiere tu OK):

   ```bash
   pnpm public-website:content-factory:run -- --spec spec.json --send --author-id 1
   ```

   Crea un post `private` (no visible al publico) con `post_author` = tu usuario
   WordPress (ID `1`, `jreysgo`). Idempotente: re-correr con el mismo `--manifest` no
   duplica. Te devuelve un `edit_url`.

5. **Completar el gate privado:** antes de publicar, confirma categoria, slug/permalink,
   tags solo si aportan una taxonomia real, featured/OG, ALT/captions, excerpt, meta title,
   meta description, canonical, robots, schema, CTA, links, fuentes, permisos de casos y
   entidad del autor. Haz readback autenticado y revisa desktop/mobile.

6. **Autorizar la publicacion:** la instruccion debe ser explicita para la version y URL
   concretas. `validation=pass`, `--send`, "me gusta" o una revision parcial no equivalen
   a autorizacion para publicar.

7. **Publicar por separado:** toma un snapshot completo del post privado y aplica
   `private → publish` mediante WP-Admin o un write path REST/WP-CLI sancionado. Si lo
   ejecuta un agente, la operacion debe revertir a `private` ante cualquier fallo central.

8. **Verificar como publico:** comprueba `HTTP 200`, canonical unico, `index, follow`,
   `Article` schema, Open Graph/Twitter, imagen social `200`, TOC y anchors, links, imagenes,
   consola y overflow en desktop/mobile. Comprueba tambien que WordPress/Think no sirvan una
   segunda copia indexable.

### Que significan los estados

- `stage: dry` — se produjo y valido, NO se escribio. Es lo esperado sin `--send`.
- `validation.status`: `pass` (listo) / `warning` (revisable, `--send` exige
  `--allow-warnings`) / `block` (hard stop, `--send` se rehusa).
- `readback.outcome`: `created` (escribio) / `already_exists` (idempotencia:
  ya existia ese manifest) / `error` (revisa `message`).
- Post `status=private` + HTTP 404 anonimo = correcto (borrador no publico).
- Post `status=publish` + HTTP 200 anonimo no basta: canonical, robots, schema, OG, media,
  links y render deben pasar antes de cerrar.

## Inspeccionar el sitio

1. Ejecuta discovery read-only si necesitas inventario.
2. Usa inspect o inspect-post-deep para una pagina/post especifico.
3. Revisa fingerprints, bloques, SEO, assets y layout notes.
4. Guarda evidencia versionada si la decision importa.

Para trabajo de content hub/blog, carga tambien
`docs/documentation/public-site/wordpress-blog-content-hub-search.md` y
`docs/manual-de-uso/public-site/operar-wordpress-blog-content-hub-search.md`.
La categoria forma parte del permalink de posts (`/%category%/%postname%/`), por
lo que retaxonomizar contenido publicado requiere mapa de URL/canonical/redirect.

## Leer el binding Astro/Vercel desde Greenhouse

1. Usa `GET /api/admin/public-site/binding` con sesion admin de Greenhouse.
2. Verifica `contractVersion="public-site-astro-binding.v1"`.
3. Revisa `status`, `confidence` y `degradedSources[]` antes de confiar en el estado live.
4. Compara `github.commits[]` con `vercel.deployments[]` cuando necesites saber si el deploy production coincide con `main`.
5. Si GitHub o Vercel degradan por token/scope, no inventes credenciales ni cambies env vars sin task; documenta el blocker y mantiene el cierre como parcial para esa fuente.

Este reader es solo lectura. No dispara builds, deploys, rollback, alias, DNS ni cambios en WordPress/Kinsta.

## Preparar contenido

1. Crea o recibe un brief.
2. Genera un plan/draft local.
3. Valida el draft.
4. Si el caso es editar contenido existente, genera refresh plan y patch plan.
5. Revisa que el plan diga que no muta published source.

## Preparar draft en WordPress

1. Verifica que el bridge draft-only este disponible.
2. Usa flujo de draft/private clone.
3. Revisa el draft creado.
4. No publiques como parte de la preparacion.

## Que no hacer

- No publicar desde `ideate`, `author` o `run --send`: el write termina en `private`; la publicacion es una operacion separada y autorizada.
- No usar el usuario de servicio (`12`, `Greenhouse INTEGRATION`) como autor; el autor es tu usuario (`1`, `jreysgo`).
- No escribir markup Gutenberg a mano: usa los CLIs / la spec (evita el TOC roto y acentos mal codificados).
- No correr `--send` sin `validation=pass` ni sin `--author-id`.
- No usar WP admin manual para saltarse manifests.
- No editar published source sin clone/backup/aprobacion.
- No limpiar cache ni publicar si la instruccion no lo pide. Despues de una mutacion autorizada, limpia cache solo por el mecanismo sancionado y repite el readback.
- No usar el binding reader como permiso implicito para tocar Vercel/GitHub.
- No meter secrets en prompts o docs.
- No asumir que un plan local ya esta publicado.

## Problemas comunes

### `ideate` falla o no devuelve JSON

Falta `ANTHROPIC_API_KEY`/`_SECRET_REF`, o la autenticacion GCP esta desalineada. Ejecuta ambos flujos
`gcloud auth login` y `gcloud auth application-default login`, y reintenta. `author`/`run --spec` NO necesitan
LLM; solo `ideate`.

### El TOC sale vacio o los acentos se rompen

No pasa si usas el pipeline: el generador emite el TOC de Yoast poblado + headings anclados, y el write usa UTF-8 crudo. Si ves esto, es porque alguien escribio markup a mano — vuelve a los CLIs.

### `run --send` responde `already_exists`

Es la idempotencia: ya existe un post con ese `--manifest`. Es correcto. Si quieres un post nuevo, cambia el `--manifest` (o el slug de la spec).

### El post no aparece en el sitio

Si quedo `private`, el `404` anonimo es correcto. Completa el gate y obten autorizacion antes de publicar. Si ya
esta `publish`, revisa permalink, categoria, cache y readback; no repitas writes a ciegas.

### El layout se rompe

Revisa docs Ohio/Elementor, page meta, containers y CSS page-scoped. No metas CSS global sin diagnostico.

### El bridge no permite escribir

Puede estar en modo draft-only o sin rollout. Eso es correcto; documenta blocker y owner. El pipeline de creacion usa la via `wpcli eval-file` (sancionada), no el bridge `/v1/drafts`.

## Referencias tecnicas

- Skill owner: `.claude/skills/efeonce-public-site-wordpress/references/content-factory-gutenberg.md`
- Documentacion funcional: `docs/documentation/public-site/content-factory-ideation-and-cocreation.md`
- Recipes de bloques: `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- Runbook agentic completo: `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- Caso de referencia: `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md`
- Codigo: `src/lib/public-site/content-factory/{article-ideation,article-authoring,gutenberg-blocks,draft-write-eval,gutenberg-validator}.ts`
- Spec/task: `docs/tasks/in-progress/TASK-1123-greenhouse-ai-content-factory-agent-kit.md` (Slices 8-9)
