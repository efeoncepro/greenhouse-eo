# ISSUE-183 — El portafolio público indexa 44 entradas demo del tema Ohio

## Ambiente

producción, `efeoncepro.com` (WordPress en Kinsta, tema Ohio + `ohio-child`), tipo de contenido `ohio_portfolio` del
plugin Ohio Portfolio / `ohio-extra`, URLs `/project/<slug>/` y `/portfolio-category/<slug>/`.

## Detectado

2026-10-23, auditoría del portafolio con curl sobre el sitio en vivo y la API REST
(`GET /wp-json/wp/v2/ohio_portfolio?per_page=50&_embed`, `X-WP-Total: 59`), pedida por el operador al revisar el
rediseño del portafolio (PDR-028). Evidencia descargada en el scratchpad de la sesión (`audit-live/`, no versionada).

## Síntoma

- El tipo `ohio_portfolio` tiene **59 entradas publicadas; sólo 15 son trabajo de Efeonce**. Las otras **44 son
  contenido demo del tema Ohio**: 21 casos de estudio demo con cliente «Envato», enlace «Open Project» al afiliado
  `https://1.envato.market/5Q25j` y videos de relleno (Vimeo `356065748`, YouTube `t67_zAg5vvI`), y 23 entradas del
  catálogo de demos (`about-ver1…6`, `contact-ver1…6`, `hamburger-menu-*`, `corporate`, `digital-agency`, etc.) con
  cuerpo vacío y una captura de 900×514.
- Las 59 son públicas, `index, follow` y aparecen en `https://efeoncepro.com/ohio_portfolio-sitemap.xml`.
- **Las entradas reales llevan a los demos.** La cadena «Next Project» recorre las 15 reales y sigue con las 44 demo
  (Big House → Única Bowls…); los archivos de categoría (`/portfolio-category/branding/`, etc.) mezclan reales y demo.
- **Restos del demo en las 15 entradas reales:**
  - Bloque en inglés «Let's Collaborate / Got a project? / Get a Quote» con enlace a
    `https://ohio.clbthemes.com/contact-us-ver4/` y un texto sobre fin-tech.
  - «Open Project» de Bresler, Flick y Ghamadent apunta al afiliado de Envato.
  - Beebot y Big House renderizan el caso de estudio demo completo, con imágenes de
    `colabrio.ams3.cdn.digitaloceanspaces.com`.
  - 10 entradas muestran la fecha por defecto «junio 3, 2020» o «junio 23, 2020», aunque sean de 2025.
- La taxonomía `ohio_portfolio_category` tiene 42 términos, casi todos del demo.
- Los comentarios están abiertos en las 59 entradas.

## Causa raíz

- La importación del demo de Ohio nunca se limpió: sus entradas quedaron publicadas junto al trabajo real.
- El tipo de contenido del tema se usó como portafolio de Efeonce sin un inventario de qué entradas eran propias, así
  que sitemap, archivos de categoría y navegación entre proyectos trataron igual a reales y demos.
- La plantilla de las entradas reales se duplicó desde un demo y heredó su bloque de contenido y sus enlaces.

## Impacto

- **Marca:** un visitante o un buscador encuentra «Envato» como cliente de Efeonce y casos en inglés que no son
  nuestros, alcanzables desde cualquier proyecto real.
- **Comercial y legal:** enlaces de afiliado de terceros en páginas propias y un CTA que lleva al sitio del tema.
- **SEO:** 44 URLs de contenido ajeno o vacío indexadas bajo el dominio; categorías contaminadas.
- No hay pérdida de datos ni riesgo de seguridad conocido.

## Solución

1. **Ahora:** `TASK-2046` despublica las 44 demos (borrador, sin borrar), responde 410 en sus URLs, las saca del
   sitemap, cierra comentarios y quita de las 15 entradas reales el afiliado de Envato y los bloques del demo.
2. **Programa:** [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md) y
   [EPIC-056](../../epics/to-do/EPIC-056-eo-portfolio.md) reemplazan el tipo de Ohio por el portafolio propio
   (`TASK-2047`…`TASK-2049`).

## Verificación

- `curl -s https://efeoncepro.com/ohio_portfolio-sitemap.xml` no lista ningún slug demo.
- `curl -sI` de cada URL demo responde `410`.
- Las 15 entradas reales responden `200` y su HTML no contiene `1.envato.market`, `ohio.clbthemes.com` ni
  `colabrio.ams3.cdn.digitaloceanspaces.com`.
- Comentarios cerrados en todo `ohio_portfolio`.

## Estado

open — remediación planificada en `TASK-2046`; sin cambios aplicados todavía.

## Relacionado

- `TASK-2046` — limpieza de los demos (remedia este issue).
- `PDR-028`, `EPIC-056`, `TASK-2047`…`TASK-2049`.
- `docs/public-site/LA_ORBITA_SITE_MIGRATION_PLAN_V1.md` §Oleada 5.

## Delta 2026-10-23 — inventario de TASK-2046

- Confirmado por WP-CLI: 59 entradas `ohio_portfolio`, 15 reales y 44 demo, todas publicadas con comentarios abiertos.
- Search Console (16 meses): las 44 URLs demo suman 0 clics y 81 impresiones.
- Hallazgo adicional: `cms.efeoncepro.com` también está indexado con URLs `/project/` (`contact-ver3`,
  `beebot-social-media`). Es un segundo host del mismo WordPress; se revisa aparte (canonical o redirección del host).
