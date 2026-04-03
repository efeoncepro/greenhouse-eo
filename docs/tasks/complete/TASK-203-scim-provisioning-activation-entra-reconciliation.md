# TASK-203 — SCIM Provisioning Activation: Entra Config, Identity Reconciliation & Observability

## Delta 2026-04-02

Completed activation work:
- SCIM server deployed to production, test connection from Entra validated
- New Enterprise App "GH SCIM" created in Azure Portal (non-gallery) — the original "Greenhouse" app had a ghost provisioning job that blocked CLI/portal setup
- GH SCIM App ID: `4d89f061-eeb0-4aa8-ac94-df57d37e8c2a`, SP ID: `fe7a54ef-844f-4cbc-acee-3349d914f1ce`
- Job ID: `scim.a80bf6c17c454d70b04351389622a0e4.4d89f061-eeb0-4aa8-ac94-df57d37e8c2a`
- Group "Efeonce Group" assigned to GH SCIM app scope
- Provisioning job started — awaiting initial sync cycle (~40 min)
- SCIM bearer token stored in GCP Secret Manager (`scim-bearer-token`) with IAM for `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
- Direct token also set as `SCIM_BEARER_TOKEN` in Vercel production as fallback
- `SCIM_BEARER_TOKEN_SECRET_REF` set in Vercel production/staging/preview
- OID backfill: 10 users linked (7 internal Efeonce + 3 Sky guests)
- `auth_mode=both` enabled for 6 internal users (SSO ready)
- Identity source links (`azure-ad`) created for all 10 users with OID
- `efeonce.cl` added to SCIM tenant mapping allowed domains
- Integration registered in `greenhouse_sync.integration_registry` as `scim-entra-provisioning`
- Staging redirect URI added to Azure app registration
- `User.Read.All` application permission granted for Graph API client credentials
- Entra profile sync cron implemented (`/api/cron/entra-profile-sync`, daily 08:00 UTC)
- Job titles, country, city, phone synced from Entra to members + identity_profiles
- `requireScimAuth()` updated to resolve token from GCP Secret Manager

Remaining:
- Verify initial sync reconciliation after Entra completes first cycle
- Test SSO login with an internal user (not Julio)
- Consider cleaning up the old "Greenhouse" Enterprise App's ghost provisioning job

## Resumen

Activación end-to-end del server SCIM 2.0 implementado en TASK-037/TASK-018. Incluye configuración de Entra ID, generación y despliegue de credenciales, reconciliación con `identity_profiles`, y observabilidad operativa.

El server SCIM ya está implementado y deployado (`src/app/api/scim/v2/**`). Esta task cubre todo lo necesario para que el provisioning funcione en producción.

## Contexto

### Ya implementado (TASK-037/TASK-018)

- API Routes: `ServiceProviderConfig`, `Schemas`, `Users` CRUD
- Auth: bearer token con `timingSafeEqual`
- Provisioning: tenant mapping resolution, baseline role assignment, outbox events
- Schema: `scim_id`, `provisioned_by`, `provisioned_at`, `deactivated_at` en `client_users`
- Tablas: `scim_tenant_mappings` (con seed Efeonce), `scim_sync_log`
- Migración aplicada: `20260403002621463_scim-provisioning-tables`

### Pendiente (esta task)

1. **Credenciales y deploy** — generar token, configurar env vars en Vercel
2. **Configuración de Azure Entra** — provisioning job en la Enterprise App
3. **Identity reconciliation** — bridge SCIM → `identity_profiles`
4. **Backfill** — `scim_id` para usuarios existentes con `microsoft_oid`
5. **Tenant mappings de clientes** — seed de tenants cliente cuando se onboardeen
6. **Observabilidad** — dashboard o alerta sobre `scim_sync_log`
7. **Test E2E** — validación del ciclo completo

## Entregables

### E1. Credenciales y Vercel env vars

```bash
# Generar token SCIM
SCIM_TOKEN=$(openssl rand -base64 48)

# Agregar a Vercel para production y preview
echo "$SCIM_TOKEN" | vercel env add SCIM_BEARER_TOKEN production preview

# Agregar a .env.local para desarrollo local
echo "SCIM_BEARER_TOKEN=\"$SCIM_TOKEN\"" >> .env.local
```

Agregar a `.env.local.example`:
```bash
# SCIM Provisioning (Entra ID → Greenhouse)
SCIM_BEARER_TOKEN=<generar con: openssl rand -base64 48>
```

### E2. Configuración de Azure Entra

Usar `scripts/setup-entra-scim.sh` (documentado en TASK-037 spec) o configurar manualmente:

1. Azure Portal → Enterprise Applications → Greenhouse → Provisioning
2. Provisioning Mode: Automatic
3. Tenant URL: `https://greenhouse.efeoncepro.com/api/scim/v2`
4. Secret Token: el `SCIM_BEARER_TOKEN` generado
5. Test Connection → verificar 200
6. Attribute mappings (defaults de Entra funcionan):
   - `userPrincipalName` → `userName`
   - `mail` → `emails[type eq "work"].value`
   - `objectId` → `externalId`
   - `Switch([IsSoftDeleted]...)` → `active`
   - `displayName` → `displayName`
7. Asignar usuarios/grupos al scope de la app
8. Start provisioning

### E3. Identity Profile Reconciliation

Usuarios SCIM que ya tienen match en `identity_profiles` (por email o `microsoft_oid`) deben enlazarse:

- Extender `createUser()` en `src/lib/scim/provisioning.ts` para buscar `identity_profile` existente por `canonical_email` match
- Si existe match, poblar `client_users.identity_profile_id`
- Si no existe, dejar `identity_profile_id = null` — la reconciliación posterior lo resuelve
- Considerar agregar `'scim'` como `SourceSystem` en `src/lib/identity/reconciliation/types.ts`
- Crear source link via `applyIdentityLink()` pattern

### E4. Backfill de scim_id para usuarios existentes

Usuarios con `microsoft_oid` pero sin `scim_id` necesitan backfill para que Entra pueda reconciliarlos:

```sql
UPDATE greenhouse_core.client_users
SET scim_id = gen_random_uuid()::text,
    provisioned_by = 'backfill',
    updated_at = CURRENT_TIMESTAMP
WHERE microsoft_oid IS NOT NULL
  AND scim_id IS NULL;
```

### E5. Tenant mappings de clientes

Cuando se onboardee un cliente con provisioning SCIM:

```sql
INSERT INTO greenhouse_core.scim_tenant_mappings (
  scim_tenant_mapping_id,
  microsoft_tenant_id,
  tenant_name,
  client_id,
  default_role_code,
  allowed_email_domains,
  auto_provision
) VALUES (
  'scim-tm-<client-slug>',
  '<azure-tenant-id>',
  '<client-name>',
  '<greenhouse-client-id>',
  'client_executive',
  ARRAY['<domain.com>'],
  true
);
```

### E6. Observabilidad

- Crear alerta en Sentry para errores 500 en `/api/scim/v2/**`
- Considerar cron de health check que verifique `scim_sync_log` tiene actividad reciente
- Registrar integración en registry:

```typescript
await registerIntegration({
  integrationKey: 'scim-entra-provisioning',
  displayName: 'Microsoft Entra ID SCIM 2.0',
  integrationType: 'api_connector',
  sourceSystem: 'azure-ad',
  description: 'Automated user provisioning from Entra ID to Greenhouse',
  owner: 'Platform',
  consumerDomains: ['greenhouse_core'],
  authMode: 'bearer_token',
  syncCadence: 'real-time',
  syncEndpoint: '/api/scim/v2/'
})
```

### E7. Test end-to-end

Validación manual o con `az rest`:

1. **Test connection**: desde Entra, "Test Connection" → verificar 200
2. **Provision on demand**: crear usuario de prueba en Entra, provisionar manualmente
3. **Verificar en Greenhouse**: usuario aparece en `client_users` con `provisioned_by = 'scim'`
4. **Login**: el usuario provisionado puede hacer login con Microsoft SSO
5. **Deactivation**: desactivar usuario en Entra → verificar `active = false` en Greenhouse
6. **Deactivated login**: usuario desactivado no puede hacer login
7. **Sync log**: verificar que `scim_sync_log` tiene registros correctos

## Criterios de aceptación

- [ ] `SCIM_BEARER_TOKEN` configurado en Vercel (production + preview)
- [ ] `.env.local.example` actualizado con variable SCIM
- [ ] Provisioning job de Entra creado y corriendo
- [ ] Test connection exitoso desde Azure Portal
- [ ] Backfill de `scim_id` aplicado a usuarios existentes con `microsoft_oid`
- [ ] Creación de usuario vía Entra → aparece en Greenhouse activo
- [ ] Desactivación de usuario vía Entra → usuario desactivado en Greenhouse
- [ ] Usuario desactivado no puede hacer login
- [ ] `scim_sync_log` registra operaciones correctamente
- [ ] Integración registrada en `integration_registry`

## Lo que NO incluye

- UI de admin para gestionar tenant mappings (futuro)
- SCIM Groups (solo Users por ahora)
- Attribute mappings customizados (usar defaults de Entra)
- Rate limiting avanzado (Entra tiene ráfagas bajas)
- Reconciliación automática completa con `identity_profiles` (modo conservador en MVP)

## Dependencies & Impact

- **Depende de:**
  - TASK-037/TASK-018 (SCIM server — ya implementado)
  - Acceso admin a Azure Portal / Entra ID
  - Acceso a Vercel para configurar env vars
- **Impacta a:**
  - Módulo People — usuarios SCIM con `identity_profile_id` aparecen automáticamente
  - Auth — usuarios SCIM pueden hacer login con Microsoft SSO sin setup manual
  - Onboarding — automatiza alta de usuarios para cualquier tenant con provisioning configurado
- **Archivos owned:**
  - `.env.local.example` (agregar `SCIM_BEARER_TOKEN`)
  - `scripts/setup-entra-scim.sh` (Azure CLI automation)
  - Seed de `scim_tenant_mappings` por cliente
