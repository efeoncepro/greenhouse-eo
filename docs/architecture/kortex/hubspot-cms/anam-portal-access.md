# ANAM HubSpot Portal Access - Kortex Runtime

> **Fecha:** 2026-07-02
> **Ultima verificacion:** 2026-07-16
> **Portal:** ANAM / `19893546`
> **Sistema de acceso:** Kortex OAuth runtime install

## Estado confirmado

Kortex OAuth quedo instalado y activo en ANAM:

```text
hubspot_portal_id: 19893546
portal_name: www.anam.cl
portal_id Kortex: af9faacf-9f28-495e-a7e9-0f94eb37b615
installation_id: bfe1bc8b-84f8-4af3-99c9-86b155e7d62e
install_status: active
app_uid: kortex
granted_scope_count: 109
installed_at: 2026-07-02T22:14:40Z
```

El 16 de julio de 2026 se reconfirmo la instalacion desde el proyecto Kortex y
se agrego el scope condicional `crm.schemas.custom.write`. El scope no se movio
a `requiredScopes`: permanece en `conditionallyRequiredScopes` para no bloquear
instalaciones en portales sin capacidad Enterprise. El token de ANAM quedo en
version 3, con estado `active` y 109 scopes concedidos.

El 16 de julio de 2026 se desplegaron en el proyecto Kortex los builds `#12`
y `#13` para agregar Product Library con minimo privilegio:
`crm.objects.products.read` requerido y `crm.objects.products.write`
condicional. Tres intentos de reautorizacion en ANAM fueron rechazados por
HubSpot antes del callback con un error generico de instalacion, incluso al
solicitar solo lectura. La instalacion vigente no se altero: sigue activa con
109 scopes, sin Products read/write, y las APIs de propiedades y busqueda de
Products siguen respondiendo `403`. No se debe reintentar ni sumar el scope
obsoleto `e-commerce` sin diagnostico focal del portal/app.

La API de limites confirmo capacidad para objetos personalizados:

```text
custom object type limit: 10
custom object type usage: 0
custom object type percentage: 0%
```

La lectura posterior al consentimiento confirmo:

```text
custom object schemas: 0
Service properties: 72
Ticket properties: 215
Invoice properties: 145
```

## CMS / Content scopes relevantes

Scopes observados:

```text
content
files
forms
forms-uploaded-files
cms.domains.read
cms.domains.write
cms.knowledge_base.articles.read
cms.membership.access_groups.read
cms.membership.access_groups.write
```

## Lectura live validada

El control plane Kortex pudo leer schema live:

```text
contacts: 405 properties
companies: 292 properties
deals: 262 properties
tickets: 213 properties
```

Pipelines detectados:

```text
deals:
  - Crecimiento - Nuevos Negocios
  - Fidelizacion - Renovaciones
tickets:
  - Support Pipeline
```

## Nota sobre Kortex console login

La redireccion a `kortex-kappa.vercel.app/login` despues del OAuth no bloquea la instalacion HubSpot. Es la consola operativa de Kortex. El acceso OAuth quedo persistido y validado por el control plane.

## Limites actuales

- El OAuth runtime permite API operations, pero no autentica automaticamente el HubSpot CLI para subir CMS assets.
- El OAuth runtime de Kortex es el carril para operaciones CRM amplias; su
  instalacion ANAM incluye `crm.schemas.custom.write`, Service, Ticket, Invoice,
  Deal, Company, line items, workflows y propiedades.
- Para `hs upload` / `hs project upload` hacia ANAM se requiere una cuenta CLI con Personal Access Key. En la sesion ANAM quedo agregada como cuenta adicional:

```text
anam-19893546 [standard] (19893546)
Auth Type: personalaccesskey
```

- El default CLI se mantuvo en `kortex-dev [standard] (48713323)` para no perder acceso a Efeonce/Kortex.
- Para operar ANAM usar `--profile anam` o `--account 19893546`.
- La Personal Access Key de ANAM fue rotada el 16 de julio de 2026 y el perfil
  `anam-19893546` fue reautenticado y validado con una lectura de Company. La
  PAK sigue limitada a los permisos de desarrollo seleccionables por usuario;
  no sustituye el OAuth del proyecto para Service, Ticket, Invoice o custom
  schemas.
- Cualquier publish/schedule/archive/delete requiere aprobacion explicita.

## Landing CMS React publicada

La primera landing ANAM creada por este carril esta documentada en [`anam-chat-landing.md`](anam-chat-landing.md).

Estado final:

```text
URL publica: https://anam-2.hubspotpagebuilder.com/agente-anam
Developer Project: kortex-cms-react
Project ID: 103589049
Theme UID: kortex-anam-cms-react-theme
Build live: 22
```

Limitacion observada: el endpoint `POST /cms/pages/2026-03/landing-pages/{objectId}/draft/push-live` requiere scopes `content` y `content.landing_pages.write`; el PAK usado para Developer Projects no los tenia al momento de la prueba.
