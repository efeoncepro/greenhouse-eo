# Public Website Elementor Discovery

> Fecha: 2026-06-14
> Sitio: `https://efeoncepro.com`
> Scope: discovery read-only para entender como Elementor guarda y renderiza la estructura del sitio publico antes de automatizar widgets/elementos desde Greenhouse.

## Resumen

`efeoncepro.com` usa Elementor como builder principal, pero no todas las paginas usan el mismo modelo estructural:

- `Home 2` (`page_id=2791`) usa el modelo moderno de **Elementor Containers**.
- `/blog` (`page_id=18456`) mezcla **sections/columns legacy** con **containers**.
- `/contacto` (`page_id=20729`) usa estructura **legacy sections/columns**, sin containers.

Esto implica que Greenhouse no debe asumir un unico layout model. La manipulacion segura debe operar sobre el arbol de Elementor (`_elementor_data`) con soporte para `container`, `section`, `column` y `widget`.

Inventario ampliado: el catalogo completo de widgets Ohio, templates de `elementor_library`, plugins visuales y gaps para futuras landings quedo documentado en `docs/documentation/public-site/wordpress-ohio-elementor-widget-inventory.md`; el playbook operativo vive en `docs/manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md`.

## Comandos ejecutados

Solo se ejecutaron comandos read-only:

```bash
curl -fsS https://efeoncepro.com/wp-json/ | jq -r '.routes | keys[] | select(test("elementor"; "i"))'

ssh -i /Users/jreye/.ssh/greenhouse_efeonce_kinsta_ed25519 \
  -o BatchMode=yes -o IdentitiesOnly=yes \
  -p 64805 efeoncegroup@161.153.204.166 \
  'cd /www/efeoncegroup_752/public && wp eval "<read-only inspection code>"'
```

No se ejecutaron writes, publish, cache clear ni modificaciones de meta.

## Storage Contract

Elementor guarda cada documento principalmente en post meta:

- `_elementor_edit_mode=builder`: marca que el post/page se edita con Elementor.
- `_elementor_template_type`: tipo de documento (`wp-page`, `page`, `section`, `kit`, `loop-item`, `container`, etc.).
- `_elementor_version` y `_elementor_pro_version`: version del editor al ultimo guardado del documento.
- `_elementor_data`: JSON del arbol editable.
- `_elementor_page_settings`: settings de pagina/documento.

Forma base del arbol:

```json
{
  "id": "d5804e3",
  "elType": "widget",
  "widgetType": "ohio_heading",
  "settings": {
    "title": "Creamos marcas que inspiran, venden y escalan.",
    "subtitle": "I'm subtitle"
  },
  "elements": []
}
```

Los nodos estructurales (`container`, `section`, `column`) tambien tienen `id`, `elType`, `settings` y `elements`. Los widgets agregan `widgetType`.

## Elementor APIs Observadas

El REST index del sitio expone rutas Elementor, entre ellas:

- `GET /wp-json/elementor/v1/documents`
- `GET /wp-json/elementor/v1/post`
- `GET /wp-json/elementor/v1/globals`
- `DELETE /wp-json/elementor/v1/cache`
- `POST /wp-json/elementor/v1/documents/(?P<id>\d+)/media/import`
- `GET /wp-json/wp/v2/elementor_library`

El endpoint `elementor/v1/documents` declara solo `GET`; no hay un endpoint publico estable para editar arbitrariamente el arbol de widgets. Para writes controlados conviene crear un bridge propio en WordPress que use APIs internas de Elementor con permisos/auditoria de Greenhouse.

## API Interna Relevante

El plugin instalado incluye `Elementor\Core\Base\Document::save( $data )`.

Hallazgo clave del codigo instalado:

- `save()` aplica filtro `elementor/document/save/data`.
- Verifica `is_editable_by_current_user()`.
- Guarda settings si vienen en `$data['settings']`.
- Guarda elementos si vienen en `$data['elements']`.
- Llama `save_template_type()` y `save_version()`.
- Borra el CSS del post (`Post_CSS::create(...)->delete()`).
- Borra cache del documento.
- Dispara `elementor/document/after_save`.

`save_elements()` serializa el arbol con `wp_json_encode`, aplica `wp_slash` y actualiza `_elementor_data`.

Conclusion: para editar Elementor desde Greenhouse, **no escribir `_elementor_data` crudo como camino principal**. El bridge debe cargar el documento y llamar:

```php
$document = \Elementor\Plugin::$instance->documents->get( $post_id );
$document->save([
  'elements' => $elements,
  'settings' => $settings,
]);
```

En contexto REST, el usuario tecnico debe tener permisos suficientes; antes de produccion hay que reducirlo desde `administrator` a capacidades minimas.

## Paginas Clave

### Home

- `page_id`: `2791`
- slug: `home-2`
- status: `publish`
- `_elementor_version`: `3.35.4`
- `_elementor_pro_version`: `3.35.1`
- `_elementor_data`: ~425 KB
- Elementos: 340
- Modelo: containers modernos

Conteo:

| elType | Count |
| --- | ---: |
| container | 157 |
| widget | 183 |

Widgets principales:

| widgetType | Count |
| --- | ---: |
| image | 37 |
| ohio_heading | 30 |
| ohio_service_table | 24 |
| ohio_icon_box | 17 |
| text-editor | 13 |
| ohio_badge | 12 |
| ohio_testimonial | 10 |
| ohio_button | 9 |
| ohio_clients_logo | 9 |
| spacer | 7 |

Nodos de referencia:

| Path | ID | Tipo | Widget | Identificador |
| --- | --- | --- | --- | --- |
| `0` | `55718ee3` | container | - | hero, `clb__dark_section`, fondo `#022A4E` |
| `0.3` | `d5804e3` | widget | `ohio_heading` | H1 hero |
| `0.4.0` | `49f623d` | widget | `ohio_button` | CTA `Descubre cómo` |
| `1` | `ac888b4` | container | - | carrusel/portfolio inicial |
| `16` | `6c516ae` | container | - | pre-footer oscuro |

CSS generado:

- `wp-content/uploads/elementor/css/post-2791.css`
- existe: si
- size observado: ~148 KB

### Blog

- `page_id`: `18456`
- slug: `blog`
- status: `publish`
- `_elementor_version`: `3.35.5`
- `_elementor_pro_version`: `3.35.1`
- `_elementor_data`: ~109 KB
- Modelo: mixto legacy + containers

Conteo:

| elType | Count |
| --- | ---: |
| section | 8 |
| column | 13 |
| container | 36 |
| widget | 61 |

Widgets principales:

| widgetType | Count |
| --- | ---: |
| ohio_heading | 14 |
| spacer | 10 |
| ohio_button | 9 |
| ohio_badge | 8 |
| text-editor | 6 |
| icon-box | 6 |
| ohio_recent_posts | 3 |
| divider | 3 |
| ohio_contact_form | 1 |
| lottie | 1 |

Nodos de referencia:

| Path | ID | Tipo | Widget | Identificador |
| --- | --- | --- | --- | --- |
| `0` | `499f828` | section | - | hero/content inicial, `layout=full_width` |
| `0.0.1` | `f4f2428` | widget | `ohio_heading` | `Marketing con manzanitas.` |
| `2` | `2ee4ef0` | container | - | newsletter block |
| `4` | `173baddf` | container | - | webinars |
| `8` | `4fc8dee` | container | - | tarjetas de categorias |
| `9` | `2f2b18af` | section | - | pre-footer oscuro |
| `9.0.0.1.1` | `776a2412` | widget | `ohio_button` | `🍏 Quiero recibir contenido útil` |

Settings relevantes:

- `_elementor_page_settings.custom_css` contiene un fix local:

```css
body div.page-container-full-w {
    padding-left: 0 !important;
    padding-right: 0 !important;
}
```

- Ohio meta corregido previamente:
  - `page_full_width_margins_size=16px`
  - `page_breadcrumbs_visibility=0`
  - `page_add_top_padding=0`

### Contacto

- `page_id`: `20729`
- slug: `contacto`
- status: `publish`
- `_elementor_version`: `3.31.5`
- `_elementor_pro_version`: `3.31.2`
- `_elementor_data`: ~9 KB
- Modelo: legacy sections/columns

Conteo:

| elType | Count |
| --- | ---: |
| section | 3 |
| column | 7 |
| widget | 14 |

Widgets:

| widgetType | Count |
| --- | ---: |
| spacer | 5 |
| ohio_heading | 3 |
| text-editor | 3 |
| divider | 1 |
| hubspot-form | 1 |
| ohio_contact_form | 1 |

Nodos de referencia:

| Path | ID | Tipo | Widget | Identificador |
| --- | --- | --- | --- | --- |
| `0` | `5ab4ec26` | section | - | wrapper inicial, `layout=full_width`, fondo `#9690A20F` |
| `0.0.1.0.0` | `55a890be` | widget | `ohio_heading` | `Podemos conversar cara a cara...` |
| `0.0.1.1.0` | `65735565` | widget | `ohio_heading` | `Nuestra oficina en Santiago:` |
| `0.0.3.0.0` | `7b3c6b68` | widget | `ohio_heading` | `¿En qué podemos ayudarte?` |
| `0.0.3.1.0` | `57e8416` | widget | `hubspot-form` | formulario HubSpot |
| `0.0.3.1.1` | `630aa83b` | widget | `ohio_contact_form` | formulario Ohio |

Ohio meta corregido previamente:

- `page_breadcrumbs_visibility=0`
- `page_add_top_padding=0`

## Widget Controls Observados

Los widgets Ohio son clases PHP del tema/plugin Ohio Extra.

Ejemplos:

| widgetType | Clase | Controls relevantes |
| --- | --- | --- |
| `ohio_heading` | `Ohio_Elementor_Heading_Widget` | `title`, `heading_tag`, `add_highlighted`, `title_before`, `title_highlighted`, `title_after`, `subtitle`, `divider_position`, `_css_classes` |
| `ohio_button` | `Ohio_Elementor_Button_Widget` | `block_type_layout`, `button_position`, `title`, `link`, `button_size`, `button_use_brand_color`, `drop_shadow`, `inline_button`, `full_width`, `use_icon`, `icon_position`, `icon_type`, `icon_icon`, `icon_image`, `icon_html`, `_css_classes` |
| `image` | `Elementor\Widget_Image` | `image`, `image_size`, `image_custom_dimension`, `caption_source`, `caption`, `link_to`, `link`, `open_lightbox`, `_css_classes` |

Essential Addons agrega muchos controls globales `eael_*` a casi todos los nodos. No usarlos como anclas semanticas.

## Estrategia Recomendada para Greenhouse

### 1. No manipular DOM ni CSS como fuente primaria

Los selectores visuales cambian por breakpoint, Elementor wrappers, Ohio theme y cache. El source of truth editable es el arbol `_elementor_data` + settings del documento + metas del theme.

### Caso aplicado: `servicios-contratar-hubspot` partner section

El 2026-06-14 se corrigio en runtime una seccion de `https://efeoncepro.com/servicios-contratar-hubspot/` que estaba demasiado pegada a los margenes. La pagina usa Elementor legacy en esa zona:

- `page_id`: `244079`
- titulo: `Empodera tu crecimiento con HubSpot + Efeonce`
- slug: `servicios-contratar-hubspot`
- `_elementor_data`: ~140 KB
- modelo mixto observado: `section`, `column`, `widget` y `container`

La zona visual "Efeonce tu Partner certificado / HubSpot x efeonce / cards de respaldo" no es un solo contenedor moderno, sino tres legacy sections consecutivas:

| Path | ID | Tipo | Rol |
| --- | --- | --- | --- |
| `8` | `83d3781` | `section` | Intro dark, `layout=full_width`, fondo `#022A4E` |
| `9` | `ebe0037` | `section` | Cards de respaldo, `structure=30`, `gap=narrow`, fondo `#022A4E` |
| `10` | `5b75db1` | `section` | `Stack ampliado`, dark, `layout=full_width` |

La solucion correcta no fue agregar CSS page-scoped ni tocar el DOM. El problema era que la section `ebe0037` no tenia control nativo de ancho aplicado, y el Elementor Kit activo tenia `container_width` en `initial`. Se uso el control nativo de legacy section:

```json
{
  "id": "ebe0037",
  "elType": "section",
  "settings": {
    "layout": "boxed",
    "content_width": {
      "unit": "px",
      "size": 1560,
      "sizes": []
    }
  }
}
```

Esto mantiene el fondo de la section full-width y solo limita el `.elementor-container` interno. Elementor regenero `wp-content/uploads/elementor/css/post-244079.css` con:

```css
.elementor-244079 .elementor-element.elementor-element-ebe0037 > .elementor-container {
  max-width: 1560px;
}
```

Se aplico con `Document::save()` desde WP-CLI, no con `update_post_meta` crudo. Backup previo:

```text
/www/efeoncegroup_752/public/wp-content/uploads/greenhouse-backups/page-244079-elementor-before-partner-cards-width-20260614095038.json
```

Verificacion visual/cache-bypass:

- URL usada: `https://efeoncepro.com/servicios-contratar-hubspot/?gh_check=partner_cards_width_20260614`
- captura: `.captures/public-site-hubspot-section-20260614/servicios-contratar-hubspot-partner-section.png`
- viewport 2048px: section `width=2048`; container `x=244`, `width=1560`, `right=1804`; cards `520px` cada una.

Aprendizaje reutilizable: cuando el fondo de una seccion debe ser full-width pero sus widgets se ven pegados al borde, revisar primero los controles nativos de Elementor (`layout=boxed` + `content_width` para sections legacy, o width/content controls equivalentes para containers modernos). No resolver con padding CSS global ni con selectores de frontend si el control existe en el arbol editable.

Iteracion posterior de product design:

- Las tres sections `83d3781`, `ebe0037` y `5b75db1` quedaron como un modulo coherente mediante clases semanticas:
  - `gh-section-hubspot-partner-proof`
  - `gh-partner-proof-intro`
  - `gh-partner-proof-cards`
  - `gh-partner-proof-stack`
- Las tres comparten `layout=boxed`, `content_width=1560px` y padding lateral `24px`.
- La section de cards `ebe0037` usa padding vertical `32px/34px`.
- Backup previo a esta iteracion:

```text
/www/efeoncegroup_752/public/wp-content/uploads/greenhouse-backups/page-244079-elementor-before-partner-proof-module-20260614100340.json
```

Verificacion con URL publica normal:

- capturas:
  - `.captures/public-site-hubspot-section-20260614/servicios-contratar-hubspot-partner-proof-desktop.png`
  - `.captures/public-site-hubspot-section-20260614/servicios-contratar-hubspot-partner-proof-mobile.png`
- metricas:
  - desktop 2048px: secciones full-width `2048px`; contenedores internos `1560px`, `x=244`.
  - mobile 390px: contenedores internos `342px`, `x=24`; cards apiladas a 1 columna.

Nota operativa: `Document::save()` borra el CSS generado del post y cache del documento. No asumir que `wp-content/uploads/elementor/css/post-244079.css` existe inmediatamente despues de guardar. Primero renderizar la URL publica o usar cache APIs de Elementor, y luego verificar con navegador/captura.

## WP-CLI Remote Tooling Lesson

Durante esta discovery se repitio un problema operativo: ejecutar PHP multilinea por SSH inline es fragil por quoting y por diferencias entre flags `ssh`/`scp`. El repositorio ahora tiene wrapper canonico:

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/patch.php --wp-user 12
```

Contrato:

- carga `.env.local` y `.env`;
- usa `PUBLIC_WEBSITE_KINSTA_SSH_*` y `PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH`;
- sube el PHP local a `/tmp` por `scp` usando `-P`;
- ejecuta `wp eval-file` remoto por `ssh` usando `-p`;
- limpia el temporal remoto;
- evita imprimir secretos.

Usar este wrapper para inspecciones y mutaciones WordPress aprobadas. No volver a improvisar PHP heredoc dentro de comandos SSH largos.

### 2. Identificar nodos por contrato semantico

Para contenido ya existente:

- usar `post_id`
- usar `element.id`
- verificar `elType` + `widgetType`
- verificar un fingerprint liviano (`title`, `_css_classes`, `css_classes`, parent path)

Para landings Greenhouse-owned:

- crear clases semanticas en `settings.css_classes` / `settings._css_classes`, por ejemplo:
  - `gh-owned`
  - `gh-section-hero`
  - `gh-widget-primary-cta`
  - `gh-slot-hubspot-form`

`path` sirve para diagnostico, pero no como identificador permanente; cambia si se reordena el arbol.

### 3. Crear un bridge con dry-run y patch operations

El bridge WordPress deberia exponer abilities/endpoints draft-only como:

- `greenhouse/inspect-elementor-document`
- `greenhouse/validate-elementor-patch`
- `greenhouse/patch-elementor-document`
- `greenhouse/duplicate-elementor-document`

Shape recomendado:

```json
{
  "postId": 2791,
  "mode": "dryRun",
  "operations": [
    {
      "op": "setSetting",
      "selector": {
        "elementId": "49f623d",
        "elType": "widget",
        "widgetType": "ohio_button"
      },
      "path": "settings.title",
      "value": "Agenda una reunión"
    }
  ]
}
```

El bridge debe:

1. Resolver el documento.
2. Leer y respaldar `_elementor_data`, `_elementor_page_settings` y metas Ohio afectadas.
3. Validar que el nodo existe y que `widgetType` coincide.
4. Validar setting contra controls conocidos cuando sea posible.
5. Aplicar patch sobre una copia del arbol.
6. Ejecutar `Document::save([ 'elements' => $elements, 'settings' => $settings ])`.
7. Registrar audit log con before/after hash, no con JSON completo si contiene copy sensible.
8. Devolver diff estructural y preview URL.

### 4. Regeneracion y cache

`Document::save()` elimina el CSS del post y cache del documento. Para cambios globales o problemas de CSS compilado, Elementor tambien tiene:

```php
\Elementor\Plugin::$instance->files_manager->clear_cache();
```

Esto borra archivos Elementor en uploads y meta cache. Usarlo con cuidado. Kinsta edge cache sigue siendo otro plano; no asumir cache clear Kinsta hasta tener token/API o procedimiento manual confirmado.

### 5. Draft-only primero

Antes de tocar paginas publish:

- duplicar documento a draft/private
- aplicar patch al draft
- generar preview
- validar visualmente
- recien despues disenar flujo de publish con rollback/cache/audit

## Delta 2026-06-14 — Fundaciones visuales Ohio + Elementor

El inventario se amplio para cubrir no solo ancho/layout sino tambien color, tipografia, hover y motion.

Artifacts read-only locales:

```text
.captures/public-site-ohio-inventory-20260614/design-foundations.json
.captures/public-site-ohio-inventory-20260614/css-signals.json
.captures/public-site-ohio-inventory-20260614/computed-design-samples.json
.captures/public-site-ohio-inventory-20260614/button-hover-samples.json
.captures/public-site-ohio-inventory-20260614/widget-design-control-summary.json
```

Hallazgos:

- Elementor active kit es `7`, pero `post-7.css` conserva defaults de Elementor (`#6EC1E4`, `#61CE70`, Roboto). No debe tratarse como source of truth de marca sin computed-style.
- Ohio global efectivo usa `--clb-color-primary=#023c70`, `--clb-color-link-hover=#024c8f`, footer `#161519`, `--clb-grid-gutter=1rem`, `--clb-container-width=86vw` y `--clb-container-side-gutter=1rem`.
- Tipografia efectiva: body/parrafos `Inter`; titulos y botones Ohio `DM Sans`.
- Los widgets Ohio exponen suficientes controles nativos para evitar CSS en la mayoria de ajustes visuales:
  - `ohio_button`: 9 controles de color y 5 de hover/motion.
  - `ohio_service_table`: 16 controles de color y 4 de motion/hover.
  - `ohio_recent_projects`: 16 controles de color y 24 de motion/nav/pagination/filter.
  - `ohio_recent_posts`: 13 controles de color y 13 de motion/pagination.
  - `ohio_gallery`: 12 controles de color y 11 de motion/pagination.
- Los hovers correctos observados son sutiles: azul marca estable o verde luz controlado, no saltos a colores electricos ni azul sobre negro.
- No se encontro un contrato consistente de `prefers-reduced-motion` dentro de los widgets Ohio. Motion custom tipo aurora debe tener guardrail propio, performance check y QA visual.

Regla nueva: para cualquier cambio visual de landing, inspeccionar primero widget/settings + Ohio globals + computed CSS. El CSS page-scoped queda como ultimo recurso.

## Riesgos

- El usuario tecnico WordPress sigue con rol `administrator`; hay que reducir privilegios antes de produccion.
- La Application Password pegada en chat debe rotarse antes de producción.
- Kinsta API token sigue pendiente.
- El sitio mezcla Elementor moderno y legacy; tooling debe soportar ambos.
- Muchos widgets son Ohio-specific; no son portables a WordPress limpio.
- `Essential Addons` inyecta settings `eael_*` masivamente; no deben ser usados como señales de negocio.
- Algunos assets del home aun apuntan a demos externas de Ohio (`ohio.clbthemes.com`) y conviene auditarlos antes de automatizar landings.

## Proximo Paso Recomendado

Crear el primer slice de `TASK-1116` como bridge read/draft-only:

1. Endpoint/ability `inspect-elementor-document` que devuelva arbol resumido, widgets, settings keys, hashes y warnings.
2. Endpoint/ability `validate-elementor-patch` sin writes.
3. Endpoint/ability `duplicate-elementor-document` a draft/private.
4. Endpoint/ability `patch-elementor-document` solo sobre drafts/private owned by Greenhouse.

Con esto Greenhouse puede empezar a manipular widgets con conocimiento de causa sin hardcodear CSS ni editar paginas publicadas directamente.
