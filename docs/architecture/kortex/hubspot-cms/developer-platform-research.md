# HubSpot Developer Platform Research - CMS, Landing Pages, Modules, React

> **Fecha:** 2026-07-02
> **Fuentes:** documentacion oficial HubSpot Developer Platform / CMS, mas validacion runtime Kortex contra ANAM.

## Resumen ejecutivo

HubSpot separa la operacion CMS en dos capas:

- **Content/Page APIs:** crear, leer, actualizar y publicar landing pages por API.
- **Developer assets:** themes, templates, modules, CMS React projects y serverless functions que se suben con HubSpot CLI / Developer Projects.

Para Kortex, eso implica que el OAuth portal-scoped puede bastar para crear landing pages como draft, pero no reemplaza el flujo de CLI para subir assets CMS nuevos.

## Landing Pages API

Endpoint actual observado en docs 2026-03:

```text
POST https://api.hubapi.com/cms/pages/2026-03/landing-pages
POST https://api.hubapi.com/cms/pages/2026-03/landing-pages/batch/create
```

Endpoint legacy/v3 aun documentado para operaciones especificas:

```text
POST https://api.hubapi.com/cms/v3/pages/landing-pages/schedule
POST https://api.hubapi.com/cms/v3/pages/landing-pages/{objectId}/draft/push-live
```

Campos importantes:

- `name`
- `htmlTitle`
- `slug`
- `state`
- `subcategory`
- `templatePath`
- `layoutSections`
- `widgets`
- `themeSettingsValues`
- `metaDescription`
- `domain`

Reglas practicas:

- Crear primero con `state: DRAFT`.
- Usar `subcategory: landing_page` cuando se incluya `subcategory`; evitar `site_page`.
- No publicar con el create inicial salvo aprobacion explicita.
- Manejar `409` como posible collision de slug.
- `templatePath` es critico; se obtiene desde Design Manager o de templates existentes.

## Themes, templates y modulos clasicos

HubSpot CMS usa:

- **templates** como wrappers de pagina;
- **modules** como componentes reutilizables;
- **fields** para que marketing configure contenido;
- **HubL** para templating;
- **drag-and-drop areas** para edicion visual.

Un modulo clasico vive normalmente como carpeta `.module` con:

```text
module.html
module.css
module.js
fields.json
meta.json
```

Buenas practicas:

- Crear modulos editables por campos, no hardcodear copy final dentro del template.
- Usar `dnd_area`, `dnd_section` y `dnd_module` en templates de landing page para que el editor pueda modificar estructura/contenido.
- Recordar que un modulo no puede contener `dnd_area`; para contenido repetible dentro de modulos usar repeatable fields/groups.

## CMS React

HubSpot CMS React permite construir themes y modules usando React, TypeScript, JSX y tooling moderno.

Caracteristicas documentadas:

- Developer Projects framework.
- Build/deploy via `hs project upload` y, si auto-deploy esta apagado, `hs project deploy`.
- Local dev con `@hubspot/cms-dev-server`.
- Vite, ESM, TypeScript, JSX, CSS modules, Tailwind, styled-components y otros CSS-in-JS compatibles SSR.
- `@hubspot/cms-components` para helpers CMS, campos, brand settings, menus, secrets server-side e islands.

Patron recomendado:

- SSR por defecto.
- Usar `<Island>` solo para partes interactivas.
- Elegir `hydrateOn="visible"` o `hydrateOn="idle"` para interacciones no criticas.
- No exponer secrets en islands/client-side.

## Serverless functions en CMS projects

Las serverless functions en Developer Projects viven bajo una carpeta `*.functions` dentro de `src/app/`.

Estructura:

```text
app.functions/
  function.js
  package.json
  serverless.json
```

Uso:

- endpoints bajo `/hs/serverless/<path>`;
- Node.js runtime 18+;
- secrets declarados en `serverless.json`;
- util para llamadas autenticadas que no deben exponerse en browser.

## CLI y autenticacion

El HubSpot CLI local actual tenia solo:

```text
kortex-dev 48713323 personalaccesskey
```

Para subir assets CMS a ANAM se debe agregar una cuenta CLI adicional, sin reemplazar la existente:

```bash
hs account auth --account anam-19893546
hs account list
```

Luego los uploads deben especificar account/portal destino cuando aplique:

```bash
hs upload --account anam-19893546 <src> <dest>
hs project upload --account anam-19893546
```

## Fuentes oficiales consultadas

- HubSpot CMS overview: `https://developers.hubspot.com/docs/cms/start-building/introduction/overview`
- CMS React overview: `https://developers.hubspot.com/docs/cms/start-building/introduction/react-plus-hubl/overview`
- CMS React quickstart: `https://developers.hubspot.com/docs/cms/start-building/introduction/react-plus-hubl/react-plus-hubl-quickstart`
- CMS React local development: `https://developers.hubspot.com/docs/cms/reference/react/local-development`
- CMS components library: `https://developers.hubspot.com/docs/cms/reference/react/cms-components-library`
- Islands: `https://developers.hubspot.com/docs/cms/reference/react/islands`
- Custom modules: `https://developers.hubspot.com/docs/cms/reference/modules/files`
- Drag and drop areas: `https://developers.hubspot.com/docs/cms/reference/hubl/tags/dnd-areas`
- Landing pages API: `https://developers.hubspot.com/docs/api-reference/latest/cms/pages/landing-pages/create-landing-page`
- Schedule landing page publishing: `https://developers.hubspot.com/docs/api-reference/legacy/cms/pages/landing-pages/schedule-landing-page`
