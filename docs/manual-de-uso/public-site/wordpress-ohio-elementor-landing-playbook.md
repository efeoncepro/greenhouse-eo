# Public Site — Playbook de landings Ohio + Elementor

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-06-14 por Codex
> **Dominio:** Public Site
> **Inventario relacionado:** [Inventario Ohio + Elementor](../../documentation/public-site/wordpress-ohio-elementor-widget-inventory.md)
> **Layout relacionado:** [Operar layout Ohio + Elementor](./wordpress-ohio-elementor-layout.md)
> **Extensiones relacionadas:** [Custom Elementor Widgets y React](../../documentation/public-site/wordpress-custom-widgets-react-strategy.md)

## Objetivo

Guiar a agentes y operadores para crear o ajustar landings de `efeoncepro.com` usando las capacidades reales de Ohio + Elementor, sin hardcodear CSS cuando existe un control nativo del builder o del theme.

## Antes de tocar una landing

1. Identificar `post_id`, slug, status y template.
2. Leer `_elementor_data`, `_elementor_page_settings` y metas Ohio relevantes.
   - `greenhouse-wp-bridge` v0.1.0 ya esta desplegado/activo en Kinsta en modo read-only; usar primero `GET /wp-json/greenhouse-wp-bridge/v1/inspection/elementor-document/{id}` con autenticacion WordPress para obtener resumen de estructura, widgets, anchors `gh-*` y metas Ohio.
3. Determinar si la zona usa `container` moderno o `section/column` legacy.
4. Buscar anchors semanticos `gh-*`; si no existen, planear agregarlos en el patch.
5. Verificar si el problema es:
   - setting Elementor del nodo;
   - meta Ohio de pagina;
   - CSS del child theme;
   - cache/render;
   - plugin externo, como HubSpot o Essential Addons.
6. Si el cambio toca diseno visual, revisar tambien:
   - active kit Elementor y si el CSS generado realmente lo refleja;
   - Ohio global options (`--clb-*`);
   - colores/tipografia computados en navegador;
   - controles nativos de color, hover, border, shadow, radius y motion del widget.

## Decision rapida por sintoma

| Sintoma | Revisar primero | Camino preferido |
| --- | --- | --- |
| Contenido pegado a los bordes dentro de fondo full-width | `layout`, `content_width`, padding/gap de section/container | Para legacy section: `layout=boxed` + `content_width`. Para container: width/content controls equivalentes. |
| Franja entre hero y contenido | `page_breadcrumbs_visibility`, `page_add_top_padding`, template WordPress | Ajustar meta Ohio antes de CSS. |
| Linea lateral en full-width | `page_full_width_margins_size`, `--clb-grid-gutter`, wrapper | Alinear meta Ohio con gutter real. |
| Header/sidebar cambia color al cruzar secciones oscuras | `page_header_menu_style`, `.light-typo`, body classes | Evitar global. Solo page-scoped si el rail visual permanece claro. |
| Boton con hover incorrecto | Settings del widget (`ohio_button` o Elementor `button`) | Ajustar colores/hover del widget. CSS page-scoped solo si el control no existe. |
| Formulario no atribuye bien | Widget `hubspot-form` / CF7 + HubSpot mapping | Confirmar form ID, portal, UTM, campana y fallback. |
| Motion pesado o no visible | Widget usado, assets, reduced motion, mobile | Preferir motion sutil; validar performance/captura. |

## Checklist visual antes de editar

Usar este checklist para evitar parches de CSS cuando Elementor/Ohio ya tienen la perilla correcta.

### Color

1. Revisar si el elemento usa widget Ohio (`ohio_button`, `ohio_service_table`, `ohio_icon_box`, etc.).
2. Buscar controles del widget: `*_color`, `*_hover_color`, `background_color`, `bg_color`, `border_color`, `overlay_color`.
3. Validar la capa global real:
   - Ohio marca: `--clb-color-primary` / `options_global_page_brand_color`, observado como `#023c70`.
   - Links: `--clb-color-link-hover`, observado como `#024c8f`.
   - Footer: `#161519`.
4. No copiar colores desde `post-7.css` sin validar: el active kit conserva defaults de Elementor (`#6EC1E4`, `#61CE70`, Roboto) que no representan la marca actual.
5. Para CTAs verdes, usar el verde como acento de luz, no como nueva base dominante. El azul debe seguir mandando.

### Tipografia

1. Confirmar computed CSS antes de cambiar: body/parrafos heredan `Inter`; titulos y botones Ohio heredan `DM Sans`.
2. Si un bloque se ve ajeno, revisar si usa widgets core de Elementor (`heading`, `button`) con defaults del kit.
3. Preferir corregir typography desde widget settings o Ohio global options antes de CSS.
4. No introducir familias nuevas en una landing sin decision de marca.

### Botones y hover

1. Para `ohio_button`, revisar primero `title_color`, `button_color`, `border_color`, `title_hover_color`, `button_hover_color`, `border_hover_color`, `border_radius`, `drop_shadow`.
2. Hover enterprise esperado:
   - cambio perceptible pero sutil;
   - contraste AA razonable;
   - sin saltos a azul electrico o colores no brand;
   - transicion corta (`0.18s` a `0.35s`) y sin layout shift.
3. Si el boton es core Elementor o EAEL, identificar el widget exacto antes de copiar el patron de Ohio.

### Motion y microinteracciones

1. Preferir motion nativo solo si el widget lo soporta: `tilt_effect`, `drop_shadow`, `card_effect`, `highlighted_animation`, `autoplay`, `loop`, `drag_scroll`, `mousewheel_scroll`, `type_speed`.
2. En B2B enterprise, usar motion como feedback o profundidad, no como adorno constante.
3. Si se requiere fondo tipo aurora o motion custom, hacerlo con guardrail `prefers-reduced-motion`, versionarlo en child/bridge y verificar performance.
4. No activar `marquee`, `vertical_slider`, autoplay o mousewheel sin smoke desktop/mobile.

## Seleccion de widgets por modulo

| Modulo | Widget recomendado |
| --- | --- |
| Hero | `ohio_heading`, `ohio_button`, background de section/container, `ohio_video` si aplica |
| Beneficios | `ohio_service_table`, `ohio_icon_box` |
| Metricas | `ohio_counter`, `ohio_circle_progress_bar`, `ohio_progress_bar` |
| Prueba social | `ohio_clients_logo`, `ohio_testimonial`, `ohio_recent_projects` |
| CTA | `ohio_button`, `ohio_call_to_action`, `ohio_banner` |
| FAQ | `ohio_accordion`, `ohio_tabs` |
| Pricing | `ohio_pricing_table`, `ohio_pricing_list` |
| Formulario | `hubspot-form` para CRM; `ohio_contact_form` solo si el flujo es CF7 |
| Agenda | `hubspot-meeting` |
| Contenido dinamico | `ohio_recent_posts`, `ohio_recent_projects` |
| Galeria/casos visuales | `ohio_gallery`, `ohio_compare`, `ohio_carousel` |

## Como editar sin hardcodear

Usar el wrapper canonico para inspecciones o patches aprobados:

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/patch.php --wp-user 12
```

Para cambios Elementor:

1. Cargar documento con `\Elementor\Plugin::$instance->documents->get($post_id)`.
2. Trabajar sobre una copia de `get_elements_data()`.
3. Encontrar nodos por `element.id` + `elType` + `widgetType` + fingerprint.
4. Modificar `settings`.
5. Guardar con:

```php
$document->save([
  'elements' => $elements,
  'settings' => $settings,
]);
```

No usar como camino normal:

```php
update_post_meta($post_id, '_elementor_data', ...);
```

## Pattern: seccion full-width con contenido respirando

Para legacy sections con fondo full-width y contenido pegado:

```json
{
  "settings": {
    "layout": "boxed",
    "content_width": { "unit": "px", "size": 1560, "sizes": [] },
    "padding": {
      "unit": "px",
      "top": "32",
      "right": "24",
      "bottom": "34",
      "left": "24",
      "isLinked": false
    }
  }
}
```

Este patron ya fue aplicado en `page_id=244079` para el modulo `gh-section-hubspot-partner-proof`.

## Anchors semanticos Greenhouse

Cuando Greenhouse gobierne o corrija un modulo, agregar clases semanticas al nodo estructural:

```text
gh-owned
gh-section-hero
gh-section-proof
gh-section-hubspot-partner-proof
gh-partner-proof-cards
gh-widget-primary-cta
gh-slot-hubspot-form
```

Reglas:

- Conservar clases existentes de Ohio/Elementor.
- Usar prefijo `gh-`.
- No usar paths como contrato.
- No usar clases visuales como source of truth de negocio si el nodo tiene `id`.

## QA minimo antes de cerrar

1. Renderizar la URL publica o preview.
2. Verificar desktop y mobile.
3. Confirmar que no se rompio header/sidebar/footer/hero.
4. Confirmar que Elementor regenero o puede regenerar CSS.
5. Documentar backup y rollback.
6. Si el cambio toca forms/meetings, verificar HubSpot.

## Cuando no avanzar

No ejecutar writes si:

- No se identifico `post_id`.
- El usuario tecnico no esta autorizado para el alcance.
- No hay backup previo de `_elementor_data` y metas afectadas.
- La pagina esta publicada y el cambio no fue pedido como live fix.
- El fix requiere cache Kinsta y todavia no hay token/procedimiento confirmado.
- El widget es poco usado (`ohio_marquee`, `ohio_vertical_slider`, `ohio_simple_products`, pricing/Woo) y no hay smoke previo.

## Que falta para automatizar desde Greenhouse

- Ability `inspect-elementor-document` y contrato signed futuro; el endpoint REST read-only ya existe en `greenhouse-wp-bridge`.
- Ability `inspect-ohio-widget-catalog` y contrato signed futuro; el endpoint REST read-only ya existe en `greenhouse-wp-bridge`.
- Endpoint/ability `validate-elementor-patch`.
- Endpoint/ability `duplicate-elementor-document`.
- Endpoint/ability `patch-elementor-document` draft/private.
- Registry de templates aprobadas.
- Mapping HubSpot form/meeting/UTM.
- Captura visual repetible para Public Site.
- Kinsta cache/backups automation.

## Cuando crear widgets custom

Antes de crear un widget custom, confirmar que no basta con un widget Ohio maduro o con controles nativos de Elementor/Ohio. Si el modulo sera reutilizable, necesita tracking/props Greenhouse, o requiere un contrato estable de clases `gh-*`, usar un plugin propio versionado en `efeoncepro/efeonce-public-site-runtime`.

La estrategia canonica vive en [Custom Elementor Widgets y React](../../documentation/public-site/wordpress-custom-widgets-react-strategy.md). Regla breve: widgets custom de Elementor para modulos visuales reutilizables; React solo para admin/editor/bloques o interacciones frontend acotadas con Interactivity API. No usar React ni CSS hardcodeado para resolver problemas de wrappers, margins, breadcrumbs o page headline.

## Posts Gutenberg vs landings Elementor

No todo el Public Site usa Elementor. Los posts editoriales recientes de Efeonce usan Gutenberg blocks: el bridge `greenhouse-wp-bridge` v0.2.0 expone `GET /wp-json/greenhouse-wp-bridge/v1/inspection/block-document/{id}` para leer `post_content` con `parse_blocks()` y resumir `blockName`.

Regla operativa:

- si el objeto es post/blog o `hasBlocks=true`, usar inspeccion de bloques;
- si el objeto tiene `_elementor_data`/`_elementor_edit_mode=builder`, usar inspeccion Elementor;
- tratar `blockName` y `widgetType` como dos dialectos del mismo concepto de modulo builder, sin mezclarlos al escribir patches.
