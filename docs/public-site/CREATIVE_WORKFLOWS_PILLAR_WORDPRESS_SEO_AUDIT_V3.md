# Creative Workflows Pillar: WordPress + SEO audit V3

> **Snapshot histórico:** este corte privado quedó supersedido por la
> [auditoría E-E-A-T V4](CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md). El estado vigente es `publish`,
> `index, follow`, con render público verificado.
>
> **Fecha:** 2026-07-15.
> **Post:** WordPress `251363`.
> **Estado:** `PASS PRIVATE / PASS SEO / PASS OPEN GRAPH / PENDING AUTHENTICATED RENDER`.
> **Spec:** [GutenbergArticleSpec V3](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V3.json).
> **Auditorías previas:** [Editorial V2](CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_AUDIT_V2.md) y
> [Visual V1](CREATIVE_WORKFLOWS_PILLAR_VISUAL_AUDIT_V1.md).

## 1. Operación aplicada

El post privado existente se actualizó mediante WordPress REST autenticado después de:

1. validar V3 con Content Factory;
2. tomar snapshot completo de V1;
3. preparar rollback automático para fallos del contrato central;
4. escribir contenido, extracto, categoría, featured media y meta Yoast;
5. ejecutar readback autenticado independiente;
6. comprobar que el permalink permanece `404` para una sesión anónima.

Snapshot de rollback local, gitignored:

```text
tmp/creative-workflows-post-251363-before-v3-2026-07-15T06-47-33.827Z.json
```

No se cambió el estado a `publish`, no se purgó caché y no se autorizó indexación.

## 2. Contrato editorial aplicado

| Campo | Valor verificado |
|---|---|
| Post ID | `251363` |
| Estado | `private` |
| Autor | `1` / Julio Reyes |
| H1/título editorial | `Creative Workflows: cómo escalar la creatividad sin automatizar el criterio` |
| Slug | `creative-workflows` |
| URL futura | `https://efeoncepro.com/creative/creative-workflows/` |
| Categoría | `Creative` (`193`) |
| Extracto | `Un Creative Workflow convierte decisiones creativas humanas en un sistema ejecutable para explorar, producir, revisar y aprender sin automatizar el criterio.` |
| Bloques | `101` |
| Imágenes de cuerpo | `3` (`251366–251368`) |
| Featured media | `251370` (`image/jpeg`, `1440×757`) |
| Acceso anónimo | `404` |

La categoría se corrigió desde `Uncategorized` a `Creative`. Esto alinea URL, breadcrumb y `articleSection` con
el territorio creativo existente y con el artículo hermano Creative Supply Chain.

## 3. SEO title, description y focus keyphrase

| Campo | Valor |
|---|---|
| Focus keyphrase | `Creative Workflows` |
| Yoast title raw | `Creative Workflows: qué son y cómo funcionan %%sep%% %%sitename%%` |
| Meta title renderizado | `Creative Workflows: qué son y cómo funcionan - Efeonce` |
| Meta description | `Descubre qué es un Creative Workflow, cómo combina creatividad humana, IA y automatización, y qué decisiones deben permanecer en manos de las personas.` |
| Robots actual | `noindex, follow` |

El H1 conserva la tesis editorial completa. El meta title responde la intención informacional primaria y añade
la entidad Efeonce mediante tokens de Yoast. La meta description tiene 151 caracteres y explicita los tres
componentes de la categoría sin prometer sustitución del criterio humano.

## 4. Open Graph y social preview

El JSON real generado por Yoast quedó:

| Propiedad | Valor verificado |
|---|---|
| `og:type` | `article` |
| `og:locale` | `es_ES` |
| `og:title` | `Creative Workflows: cómo escalar la creatividad sin automatizar el criterio` |
| `og:description` | misma meta description SEO |
| `og:url` | `https://efeoncepro.com/creative/creative-workflows/` |
| `og:site_name` | `Efeonce` |
| `og:image` | `creative-workflows-hero-featured-1440-v1.jpg` (`251370`) |
| Dimensiones | `1440×757` |
| MIME | `image/jpeg` |
| Twitter card | `summary_large_image` |

La imagen tiene una relación cercana a `1.91:1`, adecuada para Open Graph, y es el mismo featured media del
artículo. No depende del fallback global de la Home. El WebP original `251365` se conserva como fuente web;
el JPEG `251370` se asignó explícitamente para maximizar compatibilidad con previews sociales.

## 5. Schema y E-E-A-T observado

Yoast genera `Article/BlogPosting`, `WebPage`, `ImageObject`, `BreadcrumbList`, `WebSite`, `Organization` y
`Person`. El readback confirma:

- author `Julio Reyes`;
- `articleSection: Creative`;
- `primaryImageOfPage` y `thumbnailUrl` apuntando al hero JPEG `251370`;
- `accessibilityFeature: tableOfContents`;
- `inLanguage: es`;
- fecha de modificación actualizada;
- publisher Efeonce.

Riesgo fuera del post: el nodo global `Person` conserva un URL de Instagram mal formado
(`wwwinstagram.com/cesargrowth`) y `worksFor: Grupo Security`, dato histórico. El LinkedIn `cesargrowth` sí
corresponde al perfil público actual de Julio. Corregir la entidad de autor requiere una operación separada
sobre su perfil y confirmación de los valores personales vigentes; no se mezcló con este write.

## 6. Gates ejecutados

```bash
pnpm public-website:content-factory:run -- \
  --spec docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V3.json \
  --out tmp/creative-workflows-pillar-draft-v3.json

node tmp/apply-creative-workflows-v3.mjs
node tmp/read-creative-workflows-private-post.mjs
```

Resultados:

- Content Factory `PASS`, 101 bloques, `hasMedia=true`, cero findings;
- 13/13 checks centrales `true`;
- 8/8 checks Open Graph `true`;
- 6/6 checks SEO/schema `true`;
- segundo readback estable: 101 bloques, tres imágenes, featured `251370`, V3 presente y schema/OG en JPEG;
- acceso anónimo: `404`.

## 7. Estado de cierre

El artículo, su metadata y Open Graph están aplicados en WordPress. Falta una sesión autenticada para revisar el render del
tema Ohio en desktop/mobile y el preview visual del editor. Antes de publicar también se debe decidir canonical
único WordPress/Think, revisar enlaces internos/externos y confirmar la entidad global de autor.

Estado correcto: `private content complete; authenticated render and publication pending`.
