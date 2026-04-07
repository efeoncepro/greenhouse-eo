# ISSUE-029 — HubSpot sync falla por columnas incorrectas en identity_profiles INSERT

## Ambiente

staging + production

## Detectado

2026-04-07, usuario (error toast al hacer sync HubSpot en Organization Detail de Sky Airline)

## Síntoma

Dos errores secuenciales al presionar el botón de sincronización HubSpot:

1. `column "source_system" of relation "identity_profiles" does not exist`
2. `null value in column "profile_type" of relation "identity_profiles" violates not-null constraint`

El sync de campos de la organización (nombre, industria, país) funcionaba, pero el sync de contactos fallaba al intentar crear identity profiles nuevos.

## Causa raíz

La función `createIdentityProfile()` en `src/lib/account-360/organization-store.ts` tenía dos problemas en el INSERT a `greenhouse_core.identity_profiles`:

1. **Columnas renombradas**: usaba `source_system`, `source_object_type`, `source_object_id` pero las columnas reales son `primary_source_system`, `primary_source_object_type`, `primary_source_object_id` (prefijo `primary_` agregado durante la migración del identity model).

2. **Columna NOT NULL faltante**: `profile_type` es NOT NULL sin default, pero el INSERT no la incluía. Para contactos de HubSpot, el valor correcto es `'external_contact'` (convención existente en el 97% de los registros de ese tipo).

## Impacto

- **HubSpot sync** roto para cualquier organización que tuviera contactos nuevos en HubSpot no presentes en Greenhouse (el sync de contactos existentes y la actualización de campos de la org sí funcionaban).
- Afecta solo el flujo de creación de identity profiles desde HubSpot sync, no la lectura ni otros flujos de creación de perfiles.

## Solución

Dos commits en `src/lib/account-360/organization-store.ts`:

1. `ff167095` — Renombrar columnas a `primary_source_system`, `primary_source_object_type`, `primary_source_object_id`
2. `b89ced8d` — Agregar `profile_type = 'external_contact'` al INSERT

## Verificación

```bash
pnpm staging:request POST '/api/organizations/org-b9977f96-f7ef-4afb-bb26-7355d78c981f/hubspot-sync' --pretty
# → HTTP 200: { "synced": true, "fieldsUpdated": [], "contactsSynced": 1, "contactsSkipped": 16 }
```

## Estado

resolved

## Relacionado

- Archivo modificado: `src/lib/account-360/organization-store.ts` (función `createIdentityProfile`)
- Endpoint: `src/app/api/organizations/[id]/hubspot-sync/route.ts`
- ISSUE-028 (token HubSpot expirado — resuelto en la misma sesión, prerrequisito para encontrar este bug)
