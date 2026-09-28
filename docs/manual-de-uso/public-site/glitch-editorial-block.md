# Bloque editorial Glitch — operar, verificar y revertir

> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.2
> **Creado:** 2026-07-04 por Claude (TASK-1337)
> **Ultima actualizacion:** 2026-09-28 por Claude (el spec de Content Factory emite el bloque: `kind: 'glitchDrop'`)
> **Documentacion tecnica:** `docs/documentation/public-site/glitch-drop-gutenberg-block.md` · `docs/architecture/public-site/PRIMITIVES.md`

## Para que sirve

`Glitch` es un bloque de Gutenberg propio para el POV editorial de Efeonce dentro
de la serie `Glitch de la semana` en `efeoncepro.com/blog`. Se ve como **Glitch**
en el editor; técnicamente es `efeoncepro/glitch-drop`. Renderiza un `aside`
(no una cita), con el wordmark de Glitch y el comentario en cuerpo derecho.

## Antes de empezar

- El bloque ya está **desplegado y activo** en producción (WP 7.0, Kinsta).
- Vive en el plugin `efeonce-editorial-blocks` del runtime repo
  `efeoncepro/efeonce-public-site-runtime` (`wp-content/plugins/`).
- No migra ni toca posts históricos ni citas `core/quote` reales.
- La versión en vivo es la **v0.1.0** (callout v1: panel claro, barra navy, wordmark). El callout «DROP» v2 está
  **aprobado** (`docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` §6) pero requiere actualizar
  el plugin; el texto guardado en cada bloque no cambia con esa actualización.
- Se usa en la edición semanal (8 drops por edición desde la #14) y en el Glitch Flash (uno por pieza).

## Cómo se usa (editor)

1. En un post de Glitch, después de resumir la noticia, agrega un bloque nuevo.
2. Busca **Glitch** en el inserter (categoría *Texto*).
3. Escribe el POV de Efeonce en 1–4 frases cortas, separadas con salto de línea. El editor permite negrita,
   cursiva y enlace, pero la convención editorial es **sin enlaces dentro del drop**: el enlace va en el párrafo
   siguiente.
4. Guarda. El bloque se ve como un `aside` con el wordmark arriba.

Cuándo usarlo: interpretación propia de Efeonce sobre una noticia. Cuándo **no**:
citas textuales externas (esas siguen siendo `core/quote`).

## Cómo insertarlo desde un agente (Content Factory)

Desde el 2026-09-28 el agente escribe el drop **dentro del spec**, en el lugar exacto donde va, con el tipo
`glitchDrop`:

```json
{
  "heading": "El modelo del medio dejó de ser el plan B",
  "level": 2,
  "blocks": [
    { "kind": "glitchDrop", "lines": [
      "Durante mucho tiempo la regla fue sencilla: si la tarea importaba, ibas al modelo más grande.",
      "La pregunta ya no es «¿cuál es el mejor modelo?», sino «¿para qué tarea necesito de verdad el más caro?»."
    ] },
    { "kind": "paragraph", "text": [
      { "text": "Es la misma conversación que abrimos con " },
      { "text": "GPT-5.6 y ChatGPT Work", "href": "https://efeoncepro.com/glitch/gpt-5-6-y-chatgpt-work-openai/" },
      { "text": ": no se trata de elegir un modelo, sino de repartir el trabajo entre niveles de inteligencia." }
    ] }
  ]
}
```

Paso a paso:

1. Escribe de 1 a 4 líneas de texto plano. Nada de enlaces, direcciones web, HTML ni saltos de línea dentro de una
   línea: el enlace va en el párrafo siguiente. Si algo de eso aparece, Content Factory se detiene con un código
   `content_factory_article_glitch_drop_*` antes de armar el borrador.
2. Corre el borrador en seco y revisa la validación:
   `pnpm public-website:content-factory:run -- --spec <spec.json> --out <draft.json>`.
3. Si aparece el aviso `glitch_drop_redundant_with_neighbor`, el párrafo anterior o el siguiente repite una línea o
   una frase del drop (el aviso dice cuál). Reescribe uno de los dos y vuelve a correr; es exactamente el error que la
   QA encontró a mano en el Glitch Flash 251941.
4. Con `validation=pass`, crea el post **privado** como siempre:
   `pnpm public-website:content-factory:run -- --spec <spec.json> --send --author-id <id>`.
5. Si el post ya está publicado: purga la caché (`wp cache flush` + `kinsta cache purge --all`) y revisa en vivo que
   cada `aside.gh-glitch-drop` se vea (`offsetHeight > 0`) a 1280 y 390 px.
6. Haz igual la lectura humana del drop junto a sus vecinos: el aviso automático detecta repeticiones literales o casi
   literales, no una idea repetida con otras palabras.

Content Factory guarda el bloque tal como lo guarda WordPress (`<!-- wp:efeoncepro/glitch-drop {"content":"…"} /-->`,
con las líneas unidas por `<br>`). Nunca escribas ese comentario a mano.

### Receta anterior (histórica / fallback)

Antes del 2026-09-28 el drop se insertaba después del write con un párrafo marcador `__GLITCH_DROP__` y un eval PHP
gobernado (`parse_blocks` → reemplazo → `serialize_blocks` → `wp_update_post(wp_slash(...))`, con snapshot previo).
Sólo se usa ya para meter un drop en un post que **no** se regenera desde su spec. Detalle:
`.claude/skills/efeonce-public-site-wordpress/references/content-factory-gutenberg.md` (§Glitch Drop por marcador y
§Extensión de GutenbergArticleSpec).

## Cómo verificar en runtime (WP-CLI gobernado)

Desde `greenhouse-eo`, sin browser, contra el WordPress vivo:

```bash
# Inspección read-only (versión WP, si el bloque está registrado)
pnpm public-website:wpcli -- --eval-file ./ruta/inspect.php
```

Un script de verificación end-to-end (registro → post privado con el bloque →
`parse_blocks` sin invalid block → `do_blocks` rinde `aside` → borrar el post)
está documentado en la spec técnica. La verificación 2026-07-04 pasó completa.

## Qué significan las señales

- `BLOCK_REGISTERED: yes` → el plugin cargó y registró el bloque.
- `PARSE_BLOCKS_RECOGNIZED: yes` → no hay "Invalid block".
- `RENDER_HAS_ASIDE: yes` + `RENDER_NO_BLOCKQUOTE: yes` → semántica correcta.

## Activar / desactivar / revertir

El plugin se desplegó por SSH (scp) al filesystem de Kinsta y se activó con
`activate_plugin()` vía `pnpm public-website:wpcli`. Para revertir:

```bash
# Desactivar (deja los archivos; quita el bloque del inserter y del front-end)
#   eval-file: deactivate_plugins('efeonce-editorial-blocks/efeonce-editorial-blocks.php')
pnpm public-website:wpcli -- --eval-file ./ruta/deactivate.php

# Rollback total (SSH): borrar el directorio del plugin
#   rm -rf "$WP/wp-content/plugins/efeonce-editorial-blocks"
```

- Desactivar es reversible e inofensivo: ningún post público usa el bloque hasta
  que un editor lo inserte. Los posts que ya lo tuvieran mostrarían el bloque
  como no disponible hasta reactivar (dynamic block, el contenido no se pierde).
- Tras cualquier cambio de archivos/plugin en producción, **purgar la caché de
  Kinsta** y verificar el render en el browser.

## Qué no hacer

- No editar el plugin directo en Kinsta sin backportear al runtime repo (evita
  drift; el repo es la fuente de verdad).
- No usar el bloque para citas externas reales.
- No publicar en una edición de Glitch en vivo sin revisión editorial.
- No escribir el markup del bloque a mano ni meterlo en el spec como `core/html`.
- No poner enlaces dentro del drop ni repetir su frase en el párrafo de al lado.

## Problemas comunes

- **"Invalid block" en el editor:** confirma que el plugin está activo y que
  `block.json`/`index.js`/`render.php` están presentes; el bloque es dinámico y
  el contenido vive en el delimitador del comentario.
- **El wordmark no aparece:** falta `glitch-mark.svg` o la caché de Kinsta sirve
  CSS viejo. Verifica el archivo y purga caché.
- **El estilo no aplica en el front-end:** la caché de Kinsta. Purga y revalida.
- **El bloque no se ve en un post publicado (aunque el HTML lo trae):** el tema
  Ohio oculta todo `<aside>` en posts individuales
  (`.single-post aside { display: none !important }`). El bloque ya trae un
  override defensivo (`.gh-glitch-drop.wp-block-efeoncepro-glitch-drop { display: block !important }`);
  si un cambio de estilos lo pierde, el bloque desaparece. Tras editar CSS,
  **redeploy + purgar caché de Kinsta** (el CSS del bloque va inline en el HTML
  cacheado). Verifica con browser real que `offsetHeight > 0`.
- **Content Factory se detiene con `content_factory_article_glitch_drop_*`:** una línea trae enlace, URL, HTML,
  salto de línea o barra invertida, o hay más de 4 líneas / ninguna. El sufijo `:<n>` indica la línea (desde 0).
- **Aviso `glitch_drop_redundant_with_neighbor`:** el párrafo de al lado repite una línea o frase del drop (≥ 60 % de
  coincidencia o 8 palabras seguidas). Reescribe uno de los dos.
- **El bloque sale anidado dentro de una cita / duplicado:** en el editor,
  saca el bloque Glitch fuera del bloque `core/quote` (déjalo a nivel raíz) y
  borra el quote redundante.

## Referencias técnicas

- Contrato: `docs/documentation/public-site/glitch-drop-gutenberg-block.md`
- Builder y validación: `src/lib/public-site/content-factory/gutenberg-glitch-drop.ts`,
  `article-authoring.ts` (`kind: 'glitchDrop'`), `gutenberg-validator.ts`
- Registry: `docs/architecture/public-site/PRIMITIVES.md`
- Recetas de authoring: `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- Task: `docs/tasks/**/TASK-1337-glitch-gutenberg-block.md`
