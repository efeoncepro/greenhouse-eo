# Public Site WordPress — Custom Elementor Widgets y React

> **Tipo de documento:** Documentacion funcional / arquitectura operativa
> **Version:** 1.0
> **Creado:** 2026-06-14 por Codex
> **Dominio:** Public Site
> **Sitio:** `https://efeoncepro.com`
> **Runtime observado:** WordPress en Kinsta, Ohio `3.7.0`, `ohio-child`, Elementor `4.1.3`, Elementor Pro `4.1.1`, Ohio Extra `3.7.0`
> **Repositorio runtime:** `efeoncepro/efeonce-public-site-runtime`
> **Bridge runtime repo actual:** `wp-content/plugins/greenhouse-wp-bridge` v0.3.1 foundation con endpoints read-only Elementor/Gutenberg/Ohio, contrato HMAC draft-only y provisioning WP-CLI sin tocar `wp-config.php`. Las rutas draft/private firmadas quedan default-disabled hasta provisionar shared secret, flag de writes, staging/preview y permisos minimos.
> **Relacionados:** [Inventario Ohio + Elementor](./wordpress-ohio-elementor-widget-inventory.md), [Playbook de landings Ohio + Elementor](../../manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md), [Landing Control Plane](../../architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md)

## Objetivo

Definir como Greenhouse y los agentes deben extender `efeoncepro.com` cuando Ohio + Elementor no cubran una necesidad de landing o interaccion, sin convertir el sitio publico en una SPA ni depender de patches fragiles sobre el theme vendor.

Este documento cubre dos vias:

1. **Widgets custom de Elementor** para componentes visuales/operativos reutilizables dentro del builder actual.
2. **React en WordPress** solo en carriles nativos de WordPress: editor/admin, bloques Gutenberg y frontend acotado mediante Interactivity API.

## Modelo modular observado

WordPress builders comparten una idea operativa: contenido compuesto por módulos. En Gutenberg el módulo inspeccionable es el `blockName`; en Elementor el equivalente práctico es el `widgetType` dentro de `_elementor_data`.

Discovery read-only del 2026-06-14 contra los últimos posts publicados confirma que los posts editoriales de Efeonce no usan Elementor: `elementorDataPresent=false` y `hasBlocks=true`. Ejemplo: post `249766` (`GLITCH #02`) devuelve 81 bloques parseados por `parse_blocks()`: `core/paragraph`, `core/heading`, `core/image`, `core/separator` y muchos `core/freeform` heredados. Otros posts recientes usan además `core/group`, `core/columns`, `core/gallery`, `core/list`, `core/quote`, `yoast-seo/table-of-contents` y `essential-blocks/testimonial`.

Contrato operativo:

- posts/blog: inspeccionar primero `post_content` con `parse_blocks()` y modelar por `blockName`;
- landings Ohio/Elementor: inspeccionar `_elementor_data` y modelar por `widgetType`;
- Greenhouse puede normalizar ambos como "content modules", pero debe conservar el campo nativo (`blockName` o `widgetType`) para evitar patches ambiguos;
- no asumir que una pagina sin bloques Gutenberg no tiene estructura: puede estar gobernada por Elementor widgets.

## Fuentes y postura oficial usada

- WordPress Interactivity API: `https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/`
- WordPress `@wordpress/element`: `https://developer.wordpress.org/block-editor/reference-guides/packages/packages-element/`
- WordPress Block Editor Handbook: `https://developer.wordpress.org/block-editor/`
- WordPress create-block: `https://developer.wordpress.org/block-editor/reference-guides/packages/packages-create-block/`
- Elementor deprecations / registro moderno de widgets: `https://developers.elementor.com/docs/deprecations/advanced-example/`
- Elementor custom widget JavaScript handlers: `https://developers.elementor.com/building-a-simple-custom-widget-with-javascript/`

Lectura operativa: WordPress expone React mediante `@wordpress/element` y usa React en el editor de bloques. Para frontend publico, WordPress recomienda el modelo de bloques server-rendered y la Interactivity API para comportamientos declarativos y compatibles con HTML renderizado por PHP. Elementor permite widgets PHP custom y handlers JavaScript propios, pero esos widgets deben vivir en un plugin propio, no en el parent theme Ohio.

## Decision operativa

### Si necesitamos un modulo visual reutilizable en las landings actuales

Usar **widget custom de Elementor en plugin propio**.

Ruta recomendada. El skeleton ya existe en el repo runtime, pero hoy solo expone inspeccion read-only; los widgets custom son una etapa posterior:

```text
wp-content/plugins/greenhouse-wp-bridge/
  includes/elementor-widgets/
```

Alternativa si se separa el bridge de UI:

```text
wp-content/plugins/eo-elementor-widgets/
```

El plugin debe versionarse en `efeoncepro/efeonce-public-site-runtime`, desplegarse por el rail GitOps/Kinsta y ser gobernado por Greenhouse como source of truth operativo. No debe implementarse dentro de `wp-content/themes/ohio/` ni depender de editar archivos del parent theme.

### Si necesitamos una experiencia editorial/admin rica

Usar **React con paquetes WordPress**:

- `@wordpress/element`
- `@wordpress/components`
- `@wordpress/data`
- `@wordpress/api-fetch`
- `@wordpress/scripts` o scaffold `@wordpress/create-block`

Casos naturales:

- panel admin de Greenhouse Bridge dentro de WordPress;
- inspector de manifests/landing versions para usuarios internos;
- Gutenberg blocks o patrones editables;
- herramientas de validacion/preview dentro del editor.

### Si necesitamos interaccion frontend ligera

Preferir **server-rendered PHP + Interactivity API**.

Casos naturales:

- acordeones/FAQ con estado compartido;
- filtros simples de contenido;
- tabs;
- counters interactivos;
- formularios enriquecidos con feedback;
- tracking de CTA;
- progressive disclosure;
- instant search acotado;
- pequenas microinteracciones declarativas.

Evitar montar una app React completa sobre una pagina Ohio/Elementor publicada salvo que exista un ADR nuevo que cambie la arquitectura publica.

## Custom Elementor widgets

### Cuando crear uno

Crear un widget custom cuando se cumplan una o mas condiciones:

- el modulo se repetira en varias landings;
- Ohio/Elementor tiene controles insuficientes o demasiado fragiles para el caso;
- necesitamos conectar datos Greenhouse/HubSpot de forma tipada;
- se requiere tracking/auditoria consistente;
- se necesita un contrato estable de clases `gh-*`;
- el componente debe ser manipulable por agentes sin depender de selectores frontend;
- el mismo patron hoy se resuelve con CSS ad hoc o combinaciones de widgets demasiado delicadas.

No crear un widget custom si:

- basta con `ohio_heading`, `ohio_button`, `ohio_service_table`, `ohio_icon_box`, `ohio_counter`, `ohio_clients_logo`, `ohio_recent_projects` u otro widget Ohio maduro;
- el problema se resuelve con controles nativos `layout`, `content_width`, padding, gap, background, hover o metas Ohio;
- es un caso unico sin reutilizacion probable;
- el cambio no tiene QA visual desktop/mobile.

### Widgets candidatos para Efeonce

> **✅ Piloto ENTREGADO (2026-06-23, TASK-1224): `Comparison Table` (`greenhouse_comparison_table`).** Primera primitiva custom canonica del sitio publico. Plugin propio `eo-elementor-widgets` (separado de `greenhouse-wp-bridge`), categoria `Greenhouse`, LIVE en `/agencia-creativa/`. Demuestra el contrato completo: render PHP de `<table>` semantica, theming por preset + override de color administrable desde Elementor con `theme_schema()` como SSOT (preparado para gobernanza por agente/manifest = TASK-1225), microinteracciones compositor-only detras de `prefers-reduced-motion`, reflow responsive sin segundo asset. Docs: funcional `comparison-table-widget.md`, manual `../../manual-de-uso/public-site/comparison-table-widget.md`, detalle operativo en la skill `efeonce-public-site-wordpress`.

| Widget custom | Necesidad | Por que no basta siempre Ohio |
| --- | --- | --- |
| `Comparison Table` ✅ **entregado** | Tabla comparativa 2 columnas (versus) accesible, editable y reusable; preset + override de color + microinteracciones | Ohio `service_table` es pricing 1-producto; no cubre versus 2-col con ribbon, theming gobernable ni reflow sin segundo asset. |
| `Greenhouse Hero` | Hero de landing con headline, subheadline, CTA, media/background, variante visual y tracking | Ohio page headline y Elementor hero no comparten contrato; los titulos largos ya generaron regresiones. |
| `Partner Proof` | Badges tipo HubSpot Gold, logos, claims, metricas y evidencias | Hoy se arma con secciones/widgets sueltos y es sensible a spacing/hover. |
| `Feature Grid` | Cards de beneficios con iconos, texto, layout boxed/full y variants | Ohio cubre partes, pero Greenhouse necesita manifest semantico y controles seguros. |
| `HubSpot Form Block` | Embed/form con attribution, fallback, styling y estados | HubSpot/Leadin funciona, pero necesitamos contratos de tracking/UTM y preview. |
| `CTA Band` | Pre-footer o CTA intermedio coherente con marca | Evita repetir combinaciones de secciones + botones con hover inconsistente. |
| `Case Study Rail` | Casos/proyectos vinculados a CPT o datos Greenhouse | Ohio recent projects es util, pero puede requerir filtros/curadoria Greenhouse. |

### Plugin contenedor multi-widget (como agregar otro widget)

El plugin `eo-elementor-widgets` es el **hogar canonico de TODOS los widgets custom del sitio publico** — NO es de un solo widget. Para incorporar otro (Hero, Partner Proof, Feature Grid, CTA Band, etc.) NO se crea un plugin nuevo: se agrega al existente.

Receta:

1. Crear la clase en `includes/widgets/class-eo-<nombre>-widget.php` (extiende `\Elementor\Widget_Base`, `get_categories()` retorna `array( 'greenhouse' )`).
2. Registrar una linea en el array `EO_Widgets_Loader::$widgets` (`'class-eo-<nombre>-widget.php' => 'EO_<Nombre>_Widget'`). El loader solo registra archivos que existen.
3. Cada widget declara sus propios assets via `get_style_depends()` / `get_script_depends()` y los registra (Elementor los encola solo cuando el widget esta en la pagina). A medida que crezcan los widgets, generalizar `register_styles`/`register_scripts` a un handle por widget (hoy estan acoplados al `comparison-table`; refactor menor pendiente cuando entre el 2do widget).
4. Si el widget es theme-able/administrable por agente, exponer su propio `theme_schema()` (mismo patron SSOT que `Comparison Table`) + markers `data-gh-schema`/`data-gh-plugin-version`, para que su gobernanza por manifest (familia TASK-1225) sea homogenea.
5. La categoria `Greenhouse` ya esta registrada (compartida); no se duplica.

### Contrato tecnico minimo

Cada widget custom debe incluir:

- registro via hook moderno de Elementor `elementor/widgets/register`;
- clase PHP propia extendiendo `\Elementor\Widget_Base`;
- controles agrupados por contenido, layout, estilo, estados y tracking;
- render server-side en PHP;
- CSS/JS encolado solo cuando el widget se usa;
- clases semanticas `gh-*` estables;
- compatibilidad responsive de Elementor;
- sanitizacion/escape de todos los valores;
- fallback cuando faltan assets o HubSpot IDs;
- version de schema/manifest del widget;
- compatibilidad con preview/editor.

Ejemplo de shape conceptual:

```text
GreenhousePartnerProofWidget
  name: greenhouse_partner_proof
  category: greenhouse
  controls:
    content: title, subtitle, partner_logo, badge, proof_items[]
    layout: boxed/full, content_width, spacing, alignment
    style: brand_variant, colors from tokens, typography bindings, radius, shadow
    behavior: hover_state, reduced_motion_safe
    tracking: cta_id, campaign_id, hubspot_context
  render:
    <section class="gh-owned gh-widget-partner-proof ...">
```

### Ubicacion en repo

El codigo debe vivir en el repo runtime:

```text
/Users/jreye/Documents/efeonce-public-site-runtime
```

Ruta sugerida:

```text
wp-content/plugins/greenhouse-wp-bridge/
  greenhouse-wp-bridge.php
  includes/
    class-greenhouse-elementor-widgets.php
    elementor-widgets/
      class-greenhouse-partner-proof-widget.php
      class-greenhouse-hubspot-form-widget.php
  assets/
    css/
    js/
```

Greenhouse repo (`greenhouse-eo`) debe guardar:

- manifests de versiones;
- readers/commands;
- validadores;
- preview metadata;
- drift status;
- docs y tasks.

## React en WordPress

### Carriles permitidos

| Carril | React permitido | Uso recomendado |
| --- | --- | --- |
| WordPress admin/editor | Si, con `@wordpress/element` y paquetes WP | Paneles internos, settings, inspectors, validaciones, preview tools. |
| Gutenberg blocks | Si, en `edit`; frontend preferentemente PHP render o Interactivity API | Bloques Greenhouse-owned si el sitio evoluciona hacia Gutenberg/patterns. |
| Elementor editor | Solo si Elementor lo requiere indirectamente; widgets custom siguen siendo PHP + Elementor controls | No montar una app React dentro del panel de Elementor salvo necesidad fuerte. |
| Frontend publico | Evitar React app completa; usar Interactivity API o JS pequeno | Tabs, filters, counters, CTA tracking, instant search acotado. |
| Greenhouse portal | Si, Next.js/Vuexy actual | Control plane, approvals, manifests, previews, audit y deploy. |

### Casos donde React si aporta

1. **Admin UI del bridge en WordPress**
   - Estado de conexion con Greenhouse.
   - Validacion de Application Password / abilities.
   - Lista de landings gobernadas.
   - Drift/dry-run visible para administradores.

2. **Editor tooling**
   - Panel lateral para seleccionar un manifest Greenhouse.
   - Selector de template/patron aprobado.
   - Validacion de campos antes de guardar.
   - Preview de variantes sin publicar.

3. **Bloques Gutenberg Greenhouse-owned**
   - Si futuras landings se hacen con bloques en vez de Elementor.
   - `edit` en React, `render.php` server-side.
   - `viewScriptModule` e Interactivity API para frontend.

4. **Interacciones frontend acotadas**
   - Filtros de casos o recursos.
   - Busqueda rapida de contenidos.
   - FAQs/tabs/accordions.
   - Calculadoras simples o pasos guiados.
   - Progressive disclosure en forms.

5. **Analytics/tracking UI**
   - Debug panel admin para confirmar HubSpot form IDs, UTM, CTA IDs y eventos.
   - No necesariamente visible al publico.

### Casos donde React no conviene

- Rehacer el sitio publico como SPA sin ADR.
- Solucionar problemas de margen, breadcrumb, wrapper, footer o page headline.
- Reemplazar controles nativos Ohio/Elementor por estado React.
- Insertar bundles React por pagina para una microinteraccion que CSS/Interactivity API resuelve.
- Montar componentes React sobre DOM Elementor sin contrato de ownership.

## Arquitectura recomendada por etapas

### Etapa 1 — Bridge foundation signed/draft-only

Objetivo: inspeccionar el runtime real y preparar el contrato draft-only sin cambiar el modelo editorial ni tocar produccion publicada.

- Plugin `greenhouse-wp-bridge` creado en `efeoncepro/efeonce-public-site-runtime` y desplegado/activo en Kinsta primero en modo read-only.
- Endpoints read-only actuales: `health`, `inspection/elementor-document/{id}`, `inspection/block-document/{id}` y `inspection/ohio-widget-catalog`.
- Foundation v0.3.x agrega contrato HMAC, body hash, timestamp window, replay guard y rutas `draft/private` default-disabled.
- Foundation v0.3.1 agrega fallback operacional por WP options (`autoload=no`) y comando `wp greenhouse-bridge ...` para provisionar sin editar `wp-config.php`.
- No hay writes operativos, publish, cache clear, backups ni Abilities registration todavia. El HMAC/replay guard y las rutas draft-only existen en codigo, pero no deben ejecutarse en runtime real hasta completar secret, flag y least-privilege.

### Etapa 2 — Widget custom PHP Elementor ✅ COMPLETADA (TASK-1224, 2026-06-23)

Objetivo: cubrir necesidades visuales reutilizables sin cambiar el modelo editorial.

- ✅ Registrar categoria `Greenhouse` (plugin `eo-elementor-widgets`).
- ✅ Implementar 1 widget piloto: se entrego **`Comparison Table`** (`greenhouse_comparison_table`) en lugar de `Partner Proof` — surgio como necesidad real (la comparativa GLOBE vs Agencia era imagen). `Partner Proof` / `HubSpot Form Block` quedan como siguientes candidatos.
- ✅ Exponer controles (contenido + repeater de filas + preset + override de color via `theme_schema()` SSOT).
- ✅ QA visual desktop/mobile con Playwright (sitio publico) + a11y (`<table>`/scope/caption/aria).
- ✅ Drift/deploy por repo runtime (`efeoncepro/efeonce-public-site-runtime`).

### Etapa 3 — Greenhouse manifest -> Elementor widget

Objetivo: que Greenhouse cree/configure landings sin hardcodear.

- Manifest Greenhouse declara widget type, props, tracking y tokens.
- Bridge valida props contra schema.
- Bridge crea/actualiza draft usando `Document::save()`.
- WordPress renderiza con widget custom.
- Greenhouse guarda version, diff, preview, publish y rollback.

### Etapa 4 — Admin React en WordPress

Objetivo: dar soporte operativo local en WordPress sin desplazar Greenhouse.

- Pantalla admin `Greenhouse Bridge`.
- React via `@wordpress/element`.
- Lectura de status: connection, abilities, last drift, last deploy, cache state.
- Acciones peligrosas deshabilitadas o redirigidas a Greenhouse.

### Etapa 5 — Blocks / Interactivity API solo si conviene

Objetivo: preparar una via WordPress-native mas moderna si se decide migrar ciertas landings a Gutenberg/patterns.

- Bloques server-rendered.
- `block.json` + `render.php`.
- `viewScriptModule` para frontend cuando haya interaccion.
- Interactivity API para estado declarativo.
- No mezclar con Elementor en la misma seccion sin una regla clara.

## Guardrails

- No tocar parent theme Ohio.
- No poner widgets custom en `ohio-child` salvo emergencia documentada; preferir plugin.
- No copiar internals privados de Ohio Extra.
- No depender de selectores frontend como source of truth.
- No publicar cambios live sin backup, preview y rollback.
- No asumir que Elementor Kit es fuente visual de marca; validar computed CSS.
- No asumir compatibilidad React futura sin smoke en staging.
- Mantener `prefers-reduced-motion` cuando haya JS/motion custom.
- Mantener Greenhouse como control plane.

## Decision matrix rapida

| Necesidad | Mejor via |
| --- | --- |
| Ajustar ancho/spacing de una seccion existente | Controles Elementor/Ohio, no widget custom. |
| Crear modulo repetible con UI rica y tracking | Widget custom Elementor. |
| Crear panel interno de configuracion del bridge | React admin con `@wordpress/element`. |
| Crear contenido editorial reusable tipo bloque | Gutenberg block server-rendered. |
| Agregar interaccion frontend simple | Interactivity API o JS ligero. |
| Crear app publica compleja | Nueva ADR; no dentro del runtime Ohio/Elementor actual. |

## Proximo experimento recomendado

Piloto: `Greenhouse Partner Proof`.

Motivo:

- ya existe un caso real en `/servicios-contratar-hubspot/`;
- tiene branding HubSpot/Efeonce, badge, claims y cards;
- hoy depende de estructura Elementor legacy y clases semanticas;
- permitiria probar controles, render, QA visual y Greenhouse manifest sin tocar hero ni forms criticos.

Contrato minimo del piloto:

- plugin propio en repo runtime;
- widget draft-only al inicio;
- props: `title`, `subtitle`, `partnerBadge`, `proofItems[]`, `contentWidth`, `padding`, `brandVariant`;
- controles de hover/radius/shadow alineados a tokens public-site;
- render PHP;
- CSS scoped;
- no React frontend en la primera iteracion.
