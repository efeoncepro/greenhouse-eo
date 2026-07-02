# ANAM HubSpot Portal Access - Kortex Runtime

> **Fecha:** 2026-07-02
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
granted_scope_count: 108
installed_at: 2026-07-02T22:14:40Z
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
- Para `hs upload` / `hs project upload` hacia ANAM se requiere agregar una cuenta CLI con Personal Access Key:

```bash
hs account auth --account anam-19893546
```

- Cualquier publish/schedule/archive/delete requiere aprobacion explicita.
