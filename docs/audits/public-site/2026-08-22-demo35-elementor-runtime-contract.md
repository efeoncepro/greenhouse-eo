# Demo 35 Elementor Runtime Contract — 2026-08-22

> **Tipo:** auditoría técnica read-only y contrato operativo
> **Sitio:** `https://efeoncepro.com`
> **Página:** `Demo 35: Blog Magazine`, WordPress `225984`
> **URL:** `https://efeoncepro.com/homedemo35-elementor/`
> **Objetivo:** entender el documento Elementor completo antes de adaptarlo como
> home del blog sin perder su composición.

## Resultado

Demo 35 sí puede servir como base de la home editorial, pero debe seguir siendo
una página Elementor normal. No se debe asignar como `page_for_posts`: WordPress
ignoraría el contenido de la página y entregaría el archivo de entradas del tema
Ohio. El runtime conserva `show_on_front=page`, `page_on_front=2791` y
`page_for_posts=0`.

La aparente fragilidad del layout no proviene de los containers. Catorce de las
quince instancias de `ohio_recent_posts` seleccionan contenido por IDs fijos y
cinco referencias son attachments, no posts. Cuatro widgets ya renderizan con
altura cero. Si se borran los posts demo antes de recablear cada widget, la
retícula conserva sus containers, pero pierde tarjetas y parece desarmarse.

No se hicieron cambios en WordPress, Elementor, Kinsta, formularios ni caché.

## Evidencia y baseline

Inspección WP-CLI read-only y navegador autenticado ejecutada el 2026-08-22:

| Señal | Valor |
| --- | --- |
| WordPress | `7.1` |
| Tema | `ohio-child 1.0.0`, parent `Ohio 3.7.0` |
| Elementor / Pro | `4.2.3` / `4.2.2` |
| Ohio Extra / Contact Form 7 | `3.7.0` / `6.1.7` |
| Elementor active kit | `7` |
| Estado / tipo / template | `publish` / `page` / `default` |
| Última modificación GMT | `2025-03-07 08:04:40` |
| Árbol | 7 raíces, 113 nodos, 55 containers, 58 widgets |
| Hash `_elementor_data` | `e63a70342e2cb83fae341637968ac05ccb30d0679438e143b8a8f3b047537394` |
| Hash settings Elementor | `36761a168eb691d20edf88ace3d06fb63ec9112f257ac2f20fce1afdc331b40b` |
| Hash `post_content` | `d6fbc58cb7bedca6a5c9a623dcd76d4cd7a6cfb0fcaa6a73598fa6410f4af4f4` |

Los hashes son guards de diagnóstico del documento fuente. Una copia creada por
Elementor tendrá IDs y hashes distintos; allí se valida por tipo, path,
fingerprint y conteos esperados, no copiando IDs a ciegas.

Metas que participan en el render:

- `_elementor_edit_mode=builder`, `_elementor_template_type=wp-page` y
  `_wp_page_template=default`;
- `page_header_title_visibility=0`, `page_breadcrumbs_visibility=0` y
  `page_add_top_padding=0`;
- wrapper, header, menú, logo, footer, dark mode y sidebar heredan Ohio;
- los assets registrados incluyen AOS, headings Ohio, recent posts Ohio y el
  widget Ohio de Contact Form 7.

Copiar solo `_elementor_data` no reproduce necesariamente el shell. La ruta
actual `/blog/` (`page_id=18456`) usa otra variante Ohio (`with-header-6` y
sidebar), mientras Demo 35 renderiza `with-header-3`. El corte debe preservar o
definir también las metas Ohio de página.

## Árbol y layout

| Raíz | Función | Configuración relevante |
| --- | --- | --- |
| `f4e20e4` | Hero | dos columnas; padding inferior `8vh`; texto con margen móvil |
| `6c7ed5e` | Top Headlines | ancla `top_headlines`; rail 75/25; gap de posts `12px` |
| `b800f9b` | Feature Science | full width; fondo `oh__demo35__02.webp`; center/cover; `8vh` vertical |
| `51f2ec7` | Categories + In Brief + Staff Picks | bloque editorial compuesto; fondo classic; `8vh` vertical |
| `59f0fbb` | Feature Goal Setting | full width; fondo `oh__demo35__29.webp`; motion translateY, velocidad 2 |
| `1a02c7d` | Don't Miss It | grilla y rail 75/25; `8vh` vertical |
| `449646c` | Suscripción | full width; `#D4CBA8`; clase `clb__dark_mode_light`; `8vh` vertical |

Estructura interna de mayor impacto:

- Hero: texto y post destacado ocupan el ancho disponible; H1 `5vw` desktop y
  `3.5em` mobile, line-height `0.96em`.
- Top Headlines: contenido principal `75%`, rail `25%`; el rail recibe
  `margin-top: 8vh` en mobile.
- Feature Science: contenido interno `38%` sobre imagen de fondo.
- Popular Categories: cuatro banners con `gap: 24px`; cambia de fila a columna
  en mobile.
- In Brief: `75%` + `25%`; Staff Picks usa fila con `gap: 24px`.
- Don't Miss It: `75%` + `25%`; rail móvil con `margin-top: 8vh`.
- Suscripción: el área de formulario usa `70%` del container interno.

En `1440x1100` el documento mide 1440 px de ancho y no desborda. El container
Ohio central mide 1238.4 px (86vw) y los bloques full-bleed ocupan 1440 px. En
`390x900`, las grillas y banners se apilan a 350 px con gutters de 20 px. La
sesión autenticada reportó `scrollWidth=440` únicamente por `#wpadminbar` y el
menú mobile fuera de lienzo; los containers Elementor medidos permanecieron en
350/390 px. Una auditoría anónima anterior confirmó 390/390.

## Widgets y parámetros usados

| Widget | Cantidad | Contrato usado en Demo 35 |
| --- | ---: | --- |
| `ohio_recent_posts` | 15 | `posts`, layout, metro, cantidad, gap, card effect, boxed y descripción |
| `ohio_heading` | 14 | title/subtitle, heading tag, tipografía y color por widget |
| `divider` | 10 | separador del patrón heading + CTA + divider |
| `ohio_button` | 8 | tamaño, posición, link, icono y animación |
| `ohio_banner` | 4 | imagen, copy, link, overlay, altura igual, scale y botón |
| `text-editor` | 4 | copy de hero/features/suscripción |
| `ohio_badge` | 2 | etiquetas Science/Goal Setting |
| `ohio_contact_form` | 1 | selector de formulario CF7, setting `form=5` |

Los cuatro banners usan `inner`, `equal_height=yes`, `card_effect=scale`,
`use_link=yes`, botón large/flat, overlay `#2C2A2480` y texto blanco. Sus enlaces
`/demo35/category/tech|podcasts|social|careers/` responden `404`.

El patrón de cabecera de sección combina `ohio_heading`, `ohio_button` y
`divider`. Los cinco botones “See More” no tienen `link` configurado y renderizan
`href="#"`. Las dos features conservan CTAs a `ohio.clbthemes.com`.

El hero usa:

- `ohio_heading#f10dd3b`, H1 “Stories, inspiration, and advice.”;
- `ohio_button#a4bf131`, large, icono a la derecha y link
  `#top_headlines`;
- `ohio_recent_posts#abd5d75`, layout `blog_grid_2`, post `226618`, efecto
  scale y clase `_double_post`.

La suscripción usa `ohio_contact_form#7740c26`. Aunque el setting Elementor es
`form=5`, el HTML público resuelve Contact Form 7 `242255`, acción
`/homedemo35-elementor/#wpcf7-f242255-o1`, email requerido y checkbox de
consentimiento. No se probó envío.

## Mapa de `ohio_recent_posts`

| Path / widget | Referencias | Layout / efecto | Estado |
| --- | --- | --- | --- |
| `0.1.0` / `abd5d75` | post `226618` | grid 2, scale, 1 | visible |
| `1.0.1.0` / `1757589` | `224093,226368,226369` | grid 2, metro, 3, gap 12 | visible |
| `1.0.1.1` / `e711472` | `17954,224084,224094` | default, metro, 3 | visible |
| `1.1.1` / `6890894` | `224095` | grid 4, fondo `#FF934752` | visible |
| `1.1.2` / `ae9c70c` | `224092` | grid 4 | visible |
| `1.1.3` / `c9979a1` | `224083` | default | visible |
| `3.2.0.1.0.0` / `bec16ae` | attachment `226408` | grid 2 | vacío, altura 0 |
| `3.2.0.1.1.0` / `b238727` | post `224094` | grid 4 | visible |
| `3.2.0.1.2.0` / `cb38ece` | attachment `226411` | grid 2 | vacío, altura 0 |
| `3.2.1.1` / `e9ec236` | post `226369` | grid 4, fondo `#FF934752` | visible |
| `3.3.1.0.0` / `39ce29e` | attachment `226414` | grid 2, gap 0 | vacío, altura 0 |
| `3.3.1.1.0` / `3bd665e` | `224083,224084` + attachment `226446` | grid 6, boxed, 3 | pierde un slot |
| `5.0.1.0` / `0e874e4` | `224092,224095` + attachment `226433` | grid 2, 3 | pierde un slot |
| `5.1.1` / `0042dab` | sin IDs | grid 4, 1, fondo `#FF934752` | query fallback, muestra post reciente |
| `5.1.2` / `d5477e5` | attachment `226411` | grid 4 | vacío, altura 0 |

Antes de borrar contenido demo, cada fila debe decidir uno de tres estados:
`manual` con IDs editoriales reales, `query` con taxonomía/orden explícitos o
`remove` preservando la intención de la sección. No existe una sustitución
global segura.

## Secuencia segura para una adaptación futura

1. Mantener Demo 35 publicada e intacta como referencia y crear una copia/draft
   gobernada. Tomar snapshot tanto de `225984` como de `/blog/` `18456`.
2. No asignar la copia como `page_for_posts`; mantener `page_for_posts=0`.
3. Preservar las siete raíces y mapear widgets por path/tipo/fingerprint. Los
   IDs sirven para diagnosticar la fuente, no como identidad durable del clon.
4. Resolver los quince `ohio_recent_posts` antes de retirar posts o attachments
   demo. Comprobar que ninguna referencia de post termina apuntando a media.
5. Reemplazar copy, imágenes, categorías, enlaces `#`, CTAs externos y el
   contrato de suscripción. Definir tracking y consentimiento antes de enviar.
6. Guardar el documento con Elementor `Document::save([elements, settings])`;
   no escribir `_elementor_data` directo. Preservar/reaplicar metas Ohio fuera
   del árbol y regenerar CSS.
7. Para el corte, decidir de forma explícita si se reemplaza el contenido de la
   página `18456` o si se hace un swap controlado de slug. Mantener una sola URL
   canónica `/blog/`, sus redirects, menú, Yoast y rollback.
8. Purgar caché solo tras una mutación autorizada. Verificar anónimo en 1440 y
   390 px: `200`, ancho, secciones, tarjetas, consola, enlaces internos, header,
   footer, formulario, reduced motion y `scrollWidth === clientWidth`.

## Alcance pendiente

Esta investigación no decide la taxonomía final, curaduría de cada slot,
priorización mobile, sistema de suscripción ni el mecanismo exacto de cutover.
Esas decisiones deben tomarse antes de escribir sobre la página final.

