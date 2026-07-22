# Manual — Operar descarga, vista previa y acciones de piezas en Efeonce Globe

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-22 por Claude (TASK-1503)
> **Ultima actualizacion:** 2026-07-22 por Claude (TASK-1503)
> **Doc funcional:** [efeonce-globe-producer-retrieval-assets.md](../../documentation/creative-studio/efeonce-globe-producer-retrieval-assets.md)
> **Doc tecnica:** [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)

## Para qué sirve

Prender, verificar y diagnosticar el **lado de salida** del Creative Producer: descargar/previsualizar una
pieza generada, marcarla como favorita y certificarla como referencia reutilizable.

## Antes de empezar

Estado de fábrica: **apagado**. Para operarlo hacen falta tres cosas en el servicio Cloud Run
`globe-studio-internal` (y, si se opera por la vía workload, también en `globe-api-internal`):

| Variable | Qué es | Default | Requisito |
|---|---|---|---|
| `GLOBE_PRODUCER_ASSETS_ENABLED` | Interruptor de la capacidad | `false` | Prenderlo para operar |
| `GLOBE_PRODUCER_GRANT_SECRET` | Clave HMAC que firma los pases de descarga | ausente | **Obligatoria**: sin ella nada se puede servir |
| `GLOBE_PRODUCER_GRANT_TTL_SECONDS` | Duración del pase | `300` | Opcional (rango 30-900) |

Además:

- El bucket ya existe (`GLOBE_LAB_INPUT_BUCKET`); confirmá que la service account de runtime tiene
  **lectura** (`storage.objects.get`) sobre él.
- La migración `0003_producer_asset_annotations.sql` debe estar aplicada (las marcas y referencias son
  durables; sin ella los comandos fallan al escribir).

> ⚠️ `GLOBE_PRODUCER_GRANT_SECRET` **no es un flag de rollout**: es requisito de operación. Sin él el sistema
> no se rompe silenciosamente — responde `dependency_unavailable`, que es lo correcto: un servicio que no
> puede firmar no debe entregar algo que parezca un pase.

## Paso a paso — prender en staging

1. **Crear el secreto** (valor aleatorio, escalar crudo, sin comillas ni saltos de línea):

   ```bash
   openssl rand -hex 32 | tr -d '\n' | \
     gcloud secrets create globe-producer-grant-secret --data-file=- --project efeonce-globe
   gcloud secrets add-iam-policy-binding globe-producer-grant-secret \
     --member "serviceAccount:globe-web-runtime@efeonce-globe.iam.gserviceaccount.com" \
     --role roles/secretmanager.secretAccessor --project efeonce-globe
   ```

2. **Aplicar la migración** (como cualquier migración de Globe, corre como `globe_owner`).

3. **Declarar las variables en Terraform** (`infra/terraform/cloud_run_services.tf`) y aplicar.

   > ⚠️ Desde `TASK-1508` la configuración de los servicios Cloud Run vive en Terraform. Moverla con
   > `gcloud run services update --update-env-vars` funciona **hasta el próximo `tofu apply`, que la borra en
   > silencio**. Si por urgencia lo hacés con `gcloud`, reflejalo en HCL **antes** del siguiente apply.
   > Y **nunca** uses `--set-env-vars`: reemplaza el set completo.

4. **Verificar el contrato antes de prender.** Con la capacidad todavía apagada, `/v1/capabilities` ya debe
   listar las cuatro entradas nuevas con `ui` y `mcp` en `policy-blocked`:

   ```bash
   pnpm --dir ../efeonce-globe exec node scripts/smoke-private-api.mjs   # o el equivalente autenticado
   ```

5. **Prender** `GLOBE_PRODUCER_ASSETS_ENABLED=true` y correr el canary (abajo).

## Verificación (canary)

Con una pieza real ya generada (un golden brief que haya retenido su salida):

1. **Pedir la ficha** — reader `globe.producer.output.get` con `{ experimentId, sha256 }`.
   Esperado: descriptor + `retrievalGrant` + `grantExpiresAt`. **Sin bytes.**
2. **Canjear el pase** — `GET /v1/outputs/<sha256>?experiment=…&grant=…&disposition=inline`.
   Esperado: `200`, `Content-Type` real del archivo, `Content-Disposition: inline`,
   `Cache-Control: private, no-store`.
3. **Descargar** — lo mismo con `disposition=attachment` (hay que pedir una ficha nueva: el pase está atado a
   la modalidad). Esperado: `attachment; filename="globe-<12 hex>.<ext>"`.
4. **Negativos obligatorios** (los tres deben fallar):
   - `experimentId` de otro espacio de trabajo → `not_found`
   - un hash que solo fue **referencia de entrada** → `not_found`
   - pase vencido o alterado → `access_denied`
5. **Acciones** — `favorite` dos veces con `favorite: true` (debe quedar una sola marca, con el timestamp
   original), `copyAsReference` dos veces (debe devolver **el mismo** `referenceId`), y `asset.list` debe
   reflejar ambas.

## Qué significan las señales

| Código | Significado | Acción |
|---|---|---|
| `not_found` | No es tuyo, no existe, es solo referencia de entrada, o no quedó retenido | Verificar propiedad y que el run haya retenido salida (`outputsRetained`) |
| `access_denied` | Pase inválido/vencido, o el principal no está ligado a ese espacio de trabajo | Pedir ficha nueva |
| `policy_blocked` | `GLOBE_PRODUCER_ASSETS_ENABLED=false` | Decisión operativa, no un fallo |
| `dependency_unavailable` | Falta `GLOBE_PRODUCER_GRANT_SECRET`, el bucket no responde, o la integridad no cuadró | Revisar secreto e IAM del bucket |
| `invalid_request` | Hash mal formado, falta `experiment`/`grant`, `disposition` desconocida | Corregir la llamada |

## Qué NO hacer

- **No** loggear el `retrievalGrant` (ni en query, ni en audit, ni en un ticket). Es un bearer de vida corta.
- **No** prender `ui` ni `mcp` en el coverage: eso es el gate de `TASK-1505`, que además exige que el broker
  otorgue `globe.producer.assets.operate` a personas web.
- **No** darle a esta capacidad la autoridad del Model Lab (`globe.lab.experiment.run`): es de **gasto**, y
  descargar no debe implicar poder facturar.
- **No** "arreglar" un `dependency_unavailable` devolviendo `not_found`: manda a cazar un problema de datos
  que no existe.
- **No** mover la configuración con `gcloud --set-env-vars` (destructivo) ni asumir que un
  `--update-env-vars` sobrevive al próximo `tofu apply`.

## Problemas comunes

| Síntoma | Causa probable | Diagnóstico |
|---|---|---|
| Todo responde `policy_blocked` | Interruptor apagado en la revisión activa | `gcloud run services describe globe-studio-internal --region southamerica-west1` y mirar la revisión **activa**, no el último deploy |
| La ficha responde `dependency_unavailable` | Falta el secreto o el `secretAccessor` | Verificar el binding IAM de la SA de runtime |
| El canje responde `dependency_unavailable` con la ficha OK | El bucket no responde o falta `storage.objects.get` | Probar la lectura del objeto con la SA de runtime |
| La marca de favorito "se va" entre recargas | Migración `0003` no aplicada, o el servicio corriendo sin `GLOBE_POSTGRES_*` (cae a memoria) | Revisar `globe._migrations` y las variables de Postgres del servicio |
| El `referenceId` cambia en cada intento | Se está leyendo un servicio sin persistencia durable | Igual que arriba: sin DB, cada réplica responde distinto |

## Rollback

`GLOBE_PRODUCER_ASSETS_ENABLED=false` + redeploy (< 5 min). No hay estado que revertir: las anotaciones son
aditivas y el depósito es de solo lectura en este camino.

## Referencias técnicas

- Contrato: `efeonce-globe/packages/contracts/src/producer-assets.ts`
- Autorización + comandos: `efeonce-globe/packages/domain/src/producer-assets.ts`
- Lectura del depósito: `efeonce-globe/apps/creative-runner/src/output-retrieval.ts`
- Ruta + pase firmado: `efeonce-globe/apps/studio-web/src/{app.ts,retrieval-grant.ts}`
- Persistencia: `efeonce-globe/packages/database/{migrations/0003_producer_asset_annotations.sql,src/stores/producer-asset-store.ts}`
