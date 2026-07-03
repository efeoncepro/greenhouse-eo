# Landing Page Runbook - Kortex + HubSpot CMS

> **Scope:** crear o preparar landing pages HubSpot desde Kortex/Greenhouse-side operators.
> **Default:** lectura primero, draft primero, publish separado.

## No tocar sin aprobacion

Antes de cualquier write:

- no publicar;
- no schedule;
- no archive/delete;
- no reemplazar templates;
- no modificar assets globales;
- no cambiar dominios.

## Preflight de solo lectura

1. Confirmar portal objetivo:

```text
hubspot_portal_id=19893546
portal_name=www.anam.cl
install_status=active
app_uid=kortex
```

2. Confirmar scopes concedidos:

```text
content
files
forms
forms-uploaded-files
cms.domains.read
cms.domains.write
```

3. Leer inventario antes de crear:

```text
GET /cms/pages/2026-03/landing-pages
GET /cms/v3/domains
GET forms/templates/assets segun el caso
```

4. Identificar `templatePath`.

Opciones:

- copiar path desde Design Manager;
- leerlo de una landing page existente;
- subir un template/theme propio por CLI si el portal ya esta autenticado en `hs`.

## Draft minimo por API

Payload conceptual seguro:

```json
{
  "name": "DRAFT - Kortex test landing",
  "htmlTitle": "DRAFT - Kortex test landing",
  "slug": "kortex-test-landing",
  "state": "DRAFT",
  "subcategory": "landing_page",
  "templatePath": "<templatePath>",
  "useFeaturedImage": false,
  "layoutSections": {
    "dnd_area": {}
  }
}
```

Notas:

- Mantener `domain` y `url` vacios/null al primer smoke si no se quiere resolver URL publica.
- No usar `publishImmediately: true` en el primer create.
- Registrar el ID devuelto.
- Si hay `409`, tratarlo como collision de slug y reintentar con sufijo.

## Publish / schedule

Publicar o programar es un paso separado:

```text
POST /cms/v3/pages/landing-pages/{objectId}/draft/push-live
POST /cms/v3/pages/landing-pages/schedule
```

Solo ejecutar despues de:

- revision visual;
- aprobacion humana explicita;
- confirmacion de dominio/slug final;
- confirmacion de formulario/conversion path;
- rollback plan.

## Cuando usar CLI en vez de API

Usar CLI / Developer Projects si hay que:

- crear o subir un theme;
- crear templates con `dnd_area`;
- crear modulos clasicos `.module`;
- construir CMS React modules/themes;
- subir serverless functions;
- versionar assets CMS complejos.

Comandos base:

```bash
hs account auth --account anam-19893546
hs upload --account anam-19893546 <src> <dest>
hs project upload --account anam-19893546
hs project deploy --account anam-19893546
```

Para el proyecto CMS React de ANAM se uso perfil explicito para no cambiar el default Kortex/Efeonce:

```bash
hs project validate --profile anam
hs project upload --profile anam
hs project info --account 19893546 --json
```

Regla: no cambiar el default account de la CLI si el objetivo es solo operar ANAM adicionalmente. Usar perfiles/cuentas explicitas por comando.

## Caso ANAM chat landing

La landing `https://anam-2.hubspotpagebuilder.com/agente-anam` quedo publicada desde Developer Projects / CMS React:

```text
projectName: kortex-cms-react
projectId: 103589049
component UID: kortex-anam-cms-react-theme
deployedBuildId: 19
```

Documentacion especifica: [`anam-chat-landing.md`](anam-chat-landing.md).

Lecciones operativas:

- HubSpot puede mostrar `deployedBuildId` nuevo antes de que la pagina publica sirva los assets nuevos; verificar la URL publica buscando `kortex-cms-react/<build>`.
- La copy visible no debe mencionar `widget de HubSpot`; usar lenguaje de accion del usuario final.
- El endpoint `draft/push-live` de Pages API requiere scopes `content` y `content.landing_pages.write`; si faltan, el refresh/publicacion debe hacerse desde editor o con un token nuevo autorizado para ese scope.

## Evidencia esperada de cierre

- Portal y account usados.
- Endpoint usado.
- Payload revisado sin secrets.
- ID de landing page draft.
- URL de preview o dashboard si existe.
- Estado final: `DRAFT`, `PUBLISHED`, `SCHEDULED` o `blocked`.
- Riesgo residual si no se pudo verificar visualmente.
