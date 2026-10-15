# Agencia Creativa Elementor Modules V1

> **Tipo de documento:** Contrato técnico (public site)
> **Version:** 1.0
> **Creado:** 2026-10-15 por Claude (rollout de la landing Agencia Creativa)
> **Ultima actualizacion:** 2026-10-15 por Claude
> **Documentacion funcional:** [agencia-creativa.md](../../documentation/public-site/agencia-creativa.md)
> **Manual:** [operar-agencia-creativa.md](../../manual-de-uso/public-site/operar-agencia-creativa.md)
> **Audit del rollout:** [2026-10-15-agencia-creativa-elementor-rollout.md](../../audits/public-site/2026-10-15-agencia-creativa-elementor-rollout.md)

## Identidad y estado vigente

`https://efeoncepro.com/agencia-creativa/` es la página WordPress `249582`, publicada e indexada. El
2026-10-15 su cuerpo se reemplazó por el diseño de canvas aprobado por el operador, implementado como
15 widgets nativos de Elementor. Header y footer siguen siendo los canónicos de Ohio; no se tocaron.

`/agencia-creativa-v2/` (página `251279`) queda como satélite: no se editó, no redirige y no es la
landing vigente. La Home `251731` tampoco cambió (hash verificado antes y después).

| Dato | Valor |
| --- | --- |
| Página | `249582`, `publish`, indexable |
| Hash del documento antes | `cdc078d25a3ba71df65e3597ba8354f3aa3b826e061ebdf5dd61e31f90c01c90` |
| Hash del documento después | `3b8e8e03070a5ca22066dd78552ab3af96e64bba631fac463f0f7aca045a56ad` |
| Snapshot de rollback | opción `_gh_creativa_before_20261015_143257` (elements, settings, metas) |
| Commit runtime | `8ed6626` en `efeonce-public-site-runtime` (ver límite del loader abajo) |
| Commit Greenhouse | `c7aac361e` (compilador, fuente y carril de release) |
| Formulario | Growth Form `efeonce-creative-diagnostic`, módulo `diagnostico` |

## Alcance y decisión

El diseño aprobado se descompone en un widget semántico por sección, dentro del plugin existente
`eo-elementor-widgets`, siguiendo el mismo carril de [primitives públicas](PRIMITIVES.md) que la Home
([Agency contract](AGENCY_ELEMENTOR_MODULES_V1.md)). No es otra plataforma UI ni un plugin por página.

- 15 widgets `greenhouse_creativa_{hero,portafolio,rutas,formatos,marca,produccion,ia,equipo,studio,compra,control,prueba,diagnostico,preguntas,cierre}`.
- Un contenedor full-width por widget, con `css_classes` `gh-creativa-section` más
  `clb__dark_section` o `clb__light_section` según la banda.
- Cero widgets HTML. Ningún control acepta HTML, CSS ni JavaScript.
- No cambia un contrato compartido de plataforma: no requiere ADR nuevo.

## Contrato técnico

Runtime: `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`.

- Clases: `includes/widgets/class-eo-creativa-landing-base.php` y `class-eo-creativa-landing-widgets.php`.
- Schemas: `includes/creativa/schemas/<module>.json`, schema `creativaModule.v1`.
- Plantillas: `includes/creativa/templates/*.html`.
- CSS: `assets/css/creativa-landing.css`, generado y acotado a `.gh-creativa`; no hay overrides globales del tema.
- JS: `assets/js/creativa-landing.js`. Tabs por clic y flechas del teclado; marquee con copia de loop
  `aria-hidden`; pausa de videos con `prefers-reduced-motion`; re-inicialización en el editor Elementor.
- Media: `assets/img/creativa/` (WebP, MP4, SVG); 64 archivos en uso.
- Tipos de campo: `text`, `textarea`, `number`, `url`, `media` y `video` (control Media con
  `media_types` de video).
- Repeaters: filas del portafolio (`track_a`/`track_b`), rutas y formatos (partes tab + panel),
  pilares, ubicaciones, capacidades, ofertas, compromisos, `talent_benefits`, pasos y `faq_1`..`faq_4`.
  Cuando las filas no son homogéneas, el repeater ofrece variantes de layout, no HTML libre.
- **Defaults de controles Media/URL/video siempre son arrays**, también dentro de repeaters. Un default
  string hace que Elementor falle en `array_merge()` al registrar controles (ver incidente).
- Pruebas locales: `php tests/creativa-modules.test.php` cubre los 15 módulos, 188 checks de campos
  editables, agregar/quitar/reordenar filas de repeaters, escaping, saneo de URL, el medidor, el embed del
  formulario y su fallback. El stub de prueba rechaza defaults no-array en URL/Media, en raíz y en repeaters.

**Límite de versionado:** el registro del loader (`includes/class-eo-widgets-loader.php`) está desplegado
en vivo pero **no committeado**, porque ese archivo también carga WIP desplegado y sin commit de otras
sesiones. El commit `8ed6626` no basta para reconstruir el runtime vivo; antes de otro release del plugin,
exportar el baseline vivo.

## Compilador y fuente

La fuente editable es el canvas aprobado `scripts/public-website/creativa-source/Main.dc.html`.
`scripts/public-website/compile-creativa-elementor-source.cjs` lo lee y genera schemas, plantillas y CSS,
expandiendo las partes dinámicas del canvas a contenido estático editable:

- Rutas y formatos → tabs + paneles estáticos.
- Pantallas de Creative Studio → capturas (pantalla frontal en tema claro, trasera en oscuro).
- Formulario → tarjeta host de Growth Forms (el renderer pone los campos).
- Medidor orbital de Sky (94 %) → número editable que se dibuja en el servidor; el extremo del arco se
  calcula desde el valor.

Archivos de apoyo en `creativa-source/`:

| Archivo | Rol |
| --- | --- |
| `assets.json` | Blob del canvas → nombre de asset |
| `used-assets.json` | Assets realmente usados |
| `host.css` | Resets Ohio, estados de tabs, tokens del host del formulario, motion off, clamps de tamaño en teléfono, oculta la etiqueta decorativa del cursor en teléfono |
| `page-custom.css` | CSS full-bleed de la página (mismo patrón que la Home `251731`) más un selector fuerte que anula el `left:16px` de Ohio sobre `.e-con-full.e-parent` |

`scripts/public-website/prepare-creativa-assets.cjs` convierte la media una sola vez.

## Carril de release

Todo pasa por SSH/WP-CLI después de `pnpm public-website:ssh-check`, con
`pnpm public-website:wpcli -- --eval-file ... --input-file ... --wp-user 12`.

1. **Baseline vivo:** `pnpm public-website:export-live-code -- --output <dir>`.
2. **Paquete:** `node scripts/public-website/build-creativa-elementor-package.cjs <baseline>`.
3. **Deploy de archivos:** `deploy-creativa-elementor-package.php`. Contrato
   `creativa-elementor-release.v1`, allowlist de paths, guard de drift contra el SHA vivo anterior, backup
   tar en `/tmp`, loader escrito al final y purga de caché.
4. **Publicación del documento:** `publish-creativa-elementor-page.php`. Guard de hash del contenido;
   **preflight de controles y render de los 15 widgets antes de cualquier escritura**; snapshot en opción;
   `Document::save`; metas Ohio; restauración de `_thumbnail_id=249672`; verificación de hash de Home y v2;
   chequeo del chrome global; rebuild del indexable Yoast; purga.

No desplegar todo el checkout runtime: contiene WIP ajeno.

### Metas y settings de página

Mismo contrato que Home y v2:

| Meta | Valor |
| --- | --- |
| `page_header_title_visibility` | `0` |
| `page_breadcrumbs_visibility` | `0` |
| `page_add_wrapper` | `0` |
| `page_add_top_padding` | `0` |
| `page_full_width_margins_size` | `0px` |
| `page_header_logo_style` | `light_variant` |
| `page_header_menu_style_settings` | `custom` |
| `page_header_menu_text_typo` | `{"color":"rgba(255,255,255,0.78)"}` (string JSON) |

Page settings de Elementor: `hide_title=yes`, `custom_css` = contenido de `page-custom.css`.
Yoast no se tocó: sigue el título «Agencia Creativa en LATAM» y la descripción con «más de 120 marcas».
Su actualización está pendiente de decisión del operador.

## Formulario Growth Forms

El módulo `diagnostico` incrusta:

```html
<greenhouse-form form-key="e913d958-2ad7-48a5-8015-dbff53eca4a3" surface="fhsf-efeonce-creative-diagnostic"
  locale="es-CL" color-scheme="light" appearance="bare"></greenhouse-form>
```

Identidad, versión, destino HubSpot y medición Meta viven en el
[contrato runtime](../growth-public-forms-runtime-contract.md#diagnóstico-creativo-agencia-creativa)
(commit `fa62b4fdd`). Reparto: el renderer es dueño de campos, consentimiento y envío; el host es dueño
del chrome de la tarjeta (título, badge de 45 min, línea de confianza) y del fallback sin JS. Un
`form-key` inválido degrada al texto de fallback.

**Regla de tokens:** las variantes de estilo re-declaran `--ghf-*` en `.ghf-root[data-ghf-style-variant]`.
Un override sólo sobre `greenhouse-form` no gana (el botón vivo salió teal `#36c8bf`). El override debe
apuntar a `greenhouse-form :is(.ghf-scope,.ghf-root[data-ghf-style-variant])`; con eso el CTA quedó
`#0375db`, como en el canvas.

**Brecha de fidelidad conocida (verificada en código y en vivo).** El formulario vivo se ve en una sola
columna, con selects donde el canvas tenía chips («¿Qué te frena hoy?», «¿Cuándo quieres partir?»), sin
iconos por etiqueta, con el checkbox de consentimiento propio del renderer y el enlace de privacidad como
URL cruda. **La mayor parte es configuración, no límite del renderer:**

| Diferencia | Causa | Cómo se cierra |
| --- | --- | --- |
| Selects en vez de opciones visibles | La versión publicada (`scripts/growth/publish-creative-diagnostic-form.ts`) declara `select` para `mainBlocker` y `startTimeline` | El renderer ya soporta `type: 'radio'` como tarjetas de opción (`ghf-choice-group--cards`); publicar versión nueva con radio, **conservando los mismos valores de opción** porque el mapping HubSpot ya existe |
| Sin iconos por etiqueta | La versión publicada no declara iconos | `presentation.icon` ya existe: `user`, `mail`, `phone`, `link`, `linkedin`, `briefcase`, `calendar`, `clock`, `message`, `file`, `globe` |
| Una sola columna | Las dos columnas se activan con `@container (min-width: 520px)`; en vivo el formulario midió 516 px dentro de la tarjeta host de 588 px (36 px de padding) | Reducir el padding de la tarjeta o ensanchar la columna del host |
| Privacidad como URL cruda | Copy del formulario | Ajustar el copy en la versión publicada |

Brechas reales del renderer (extensión como follow-up): el look exacto de chip/pill frente a las tarjetas
de opción, el estilo AXIS `axis-choice` del checkbox y un listbox custom más allá de
`presentation.control: 'country_select'`. Nada de esto se resuelve con CSS page-scoped.

**Remediación pendiente (no ejecutada):** publicar una versión nueva con radio + iconos mediante el
publisher gobernado, ajustar padding/ancho de la tarjeta host en `host.css` y re-verificar en vivo.

## Mutación y rollback

Guardar sólo con `Document::save()` mediante el publisher. Para revertir el rollout:

1. Guardar primero el estado actual (snapshot nuevo).
2. Leer la opción `_gh_creativa_before_20261015_143257`.
3. Restaurar elements + settings con `Document::save`.
4. Restaurar después las metas y `_thumbnail_id=249672`.
5. Purgar caché y verificar `/agencia-creativa/`, Home y v2.

Los archivos del plugin se revierten desde el tar de `/tmp` del deploy, restaurando sólo los paths del
manifest. Los tar remotos son temporales: no son almacenamiento durable.

## Lecciones del incidente (2026-10-15)

El primer intento de publicación murió con `TypeError: array_merge(): Argument #2 must be of type array,
string given` en `elementor/includes/managers/controls.php:846` (módulos `portafolio` y `equipo`): un campo
media/video de repeater ausente de la fila 1 recibió un default string. Detalle y línea de tiempo en el
[audit](../../audits/public-site/2026-10-15-agencia-creativa-elementor-rollout.md).

- `Document::save` escribe **settings antes que elements**: un error de control deja la página a medio
  escribir (settings nuevos sobre el layout viejo, `_thumbnail_id` borrado, `_elementor_controls_usage`
  perdido, `_elementor_data` intacto).
- Hacer preflight de controles y render **antes** de escribir. El publisher ahora lo hace por widget.
- Elementor borra `_thumbnail_id` al guardar: restaurarlo siempre.
- La clase base fuerza defaults array para media/video y el stub de prueba rechaza defaults no-array.

## Evidencia y límites

Verificado en vivo: desktop 1440 y móvil 390 con `scrollWidth == clientWidth`; los 15 módulos renderizan con
media; tabs por clic y flechas; copias del marquee presentes; formulario renderizado desde el contrato
gobernado; reduced motion → animaciones `none` y 0 de 15 videos reproduciéndose; un solo `h1`; Home, v2 y
chrome global sin cambios.

**Pendientes:**

- Primer envío humano real desde navegador (Turnstile bloquea la automatización) para confirmar
  `form_destination_attempt=succeeded`; después actualizar la fila del TRACKING-PLAN.
- Validación del operador sobre contenido: cifra Sky 94 % (el caso publicado dice 88 %; la nota al pie
  dice «caso publicado de Sky Airline, métricas de entrega de 12 meses»); permisos de uso de trabajo de
  clientes (Sky, Berel, GORE, Bresler, Eusari, Marca Chile, Pabellón) y de la imagen/videos del avión Sky;
  claims de FAQ/cierre («nada más que firmar», «aunque no trabajemos juntos», «Sin compromiso»).
- Decisión sobre Yoast (título y descripción).
- Commit del registro del loader cuando el WIP ajeno del archivo se resuelva.
- Brecha de fidelidad del formulario: versión nueva con radio + iconos y ajuste de la tarjeta host
  (configuración); chip/pill, checkbox AXIS y listbox custom como extensión del renderer.
- Prueba de edición + guardado + recarga desde la interfaz Elementor: no ejecutada; las pruebas del
  renderer y del publisher no la sustituyen.
