# Manual — Operar descarga, vista previa y acciones de piezas en Efeonce Globe

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-22 por Claude (TASK-1503)
> **Ultima actualizacion:** 2026-07-23 (TASK-1503/TASK-1505/TASK-1519)
> **Doc funcional:** [efeonce-globe-producer-retrieval-assets.md](../../documentation/creative-studio/efeonce-globe-producer-retrieval-assets.md)
> **Doc tecnica:** [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)

## Estado actual (2026-07-23)

**La capacidad está ACTIVA en el runtime interno.** La revisión exacta es dato mutable y se consulta en
`GLOBE_RUNTIME_HANDOFF.md`/Cloud Run; no se opera desde un número congelado en este manual.
`GLOBE_PRODUCER_ASSETS_ENABLED=true`, el secreto gobernado y las migraciones están aplicados. Image, Video y Audio
se sirvieron desde el feed/viewer; los negativos tenant/private-ingest continúan fail-closed.

Quién puede usarla hoy: el service principal por vías internas y personas internal-only autorizadas a través del
BFF same-origin. Esto no abre MCP ni clientes externos.

Lo que sigue abajo es el procedimiento de operación: sirve para reproducir el rollout en otro
runtime, para diagnosticar, y para el rollback.

## Para qué sirve

Prender, verificar y diagnosticar el **lado de salida** del Creative Producer: descargar/previsualizar una
pieza generada, marcarla como favorita y certificarla como referencia reutilizable.

## Antes de empezar

Los bytes los sirve **`globe-api-internal`**; el browser entra por `studio-web`/BFF same-origin. La capability no se
duplica en el web: el bridge deriva autoridad humana y llama la API IAM-private con workload identity.

| Variable | Qué es | Default | Requisito |
|---|---|---|---|
| `GLOBE_PRODUCER_ASSETS_ENABLED` | Interruptor de la capacidad | `false` (variable `producer_assets_enabled`) | Prenderlo para operar |
| `GLOBE_PRODUCER_GRANT_SECRET` | Clave HMAC que firma los pases | ausente | **Obligatoria**: sin ella nada se sirve |
| `GLOBE_PRODUCER_GRANT_TTL_SECONDS` | Duración del pase | `300` | Opcional (rango 30-900) |

Además: `GLOBE_LAB_INPUT_BUCKET` ya está en el servicio y `api_runtime` ya tiene `objectAdmin` sobre
ese bucket; y la migración `0003_producer_asset_annotations.sql` debe estar aplicada (las marcas y
referencias son durables).

> ⚠️ `GLOBE_PRODUCER_GRANT_SECRET` **no es un flag de rollout**: es requisito de operación. Sin él el
> sistema no se rompe en silencio — responde `dependency_unavailable`, que es lo correcto: un servicio
> que no puede firmar no debe entregar algo con forma de pase.

## Paso a paso — prender en un runtime

1. **Contenedor del secreto + accessor, en Terraform** (`infra/terraform/secrets.tf`). El accessor va
   **solo** a `api_runtime`: `web_runtime` no tiene consumidor hasta el gate de `TASK-1505`.

2. **El valor del secreto, out-of-band.** Nunca a HCL, a state ni a git. Escalar crudo, sin salto de
   línea final (`printf %s`, no `echo`):

   ```bash
   printf %s "$(openssl rand -base64 48)" | \
     gcloud secrets versions add globe-producer-grant-secret --data-file=- --project efeonce-globe
   ```

   Verificá la forma sin revelar el valor: `… versions access latest | wc -c` (64) y que no tenga
   saltos de línea.

3. **Aplicar la migración** (corre como `globe_owner`; el migrator es un usuario IAM de Cloud SQL):

   ```bash
   cd packages/database && GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-globe:southamerica-west1:globe-pg \
     GLOBE_POSTGRES_DATABASE=globe GLOBE_MIGRATOR_USER=<tu-usuario-iam> node scripts/migrate.mjs
   ```

4. **Desplegar la imagen que trae el código.** Terraform ignora el campo `image` a propósito; sin
   este paso el flag apunta a un binario que no conoce la capacidad. Es image-only: **ningún** otro
   flag de configuración (ver `deploy-internal.yml`).

5. **Declarar los env en Terraform con el flag en `false`** y aplicar. Verificá el contrato *antes*
   de prender: `/v1/capabilities` debe listar las 4 entradas con `ui`/`mcp` en `policy-blocked`, y
   todo path debe responder `policy_blocked`.

6. **Prender**: `producer_assets_enabled = true` en `variables.tf` — **en git**, no en un
   `terraform.tfvars` gitignoreado. Un flag cuyo estado real vive en un archivo sin trackear es el
   mismo problema de estado efímero que moverlo con `gcloud`, mejor disfrazado. Comprobalo planeando
   sin `terraform.tfvars`: debe dar `No changes`.

7. **Canario** (abajo). Requiere impersonar la caller SA; si es un grant temporal, revocalo al
   terminar y verificá el corte.

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
- **No** inferir que MCP o clientes externos están habilitados porque la UI internal-only funciona; cada surface
  mantiene su gate y grants propios.
- **No** darle a esta capacidad la autoridad del Model Lab (`globe.lab.experiment.run`): es de **gasto**, y
  descargar no debe implicar poder facturar.
- **No** "arreglar" un `dependency_unavailable` devolviendo `not_found`: manda a cazar un problema de datos
  que no existe.
- **No** mover la configuración con `gcloud --set-env-vars` (destructivo) ni asumir que un
  `--update-env-vars` sobrevive al próximo `tofu apply`.

## Problemas comunes

| Síntoma | Causa probable | Diagnóstico |
|---|---|---|
| Todo responde `policy_blocked` | Interruptor apagado en la revisión activa | `gcloud run services describe globe-api-internal --region southamerica-west1` y mirar la revisión **activa**, no el último deploy |
| La ficha responde `dependency_unavailable` | Falta el secreto, su versión, o el `secretAccessor` de `api_runtime` | `gcloud secrets versions list globe-producer-grant-secret` + el binding IAM |
| El canje responde `dependency_unavailable` con la ficha OK | El bucket no responde o falta `storage.objects.get` | Probar la lectura del objeto con la SA de runtime |
| La marca de favorito "se va" entre recargas | Migración `0003` no aplicada, o el servicio corriendo sin `GLOBE_POSTGRES_*` (cae a memoria) | Revisar `globe._migrations` y las variables de Postgres del servicio |
| El `referenceId` cambia en cada intento | Se está leyendo un servicio sin persistencia durable | Igual que arriba: sin DB, cada réplica responde distinto |
| El viewer falla pero el objeto existe | `/v1/session` devuelve `401`, o reader `403` tras perder sesión | Reautenticar y repetir sólo el reader; no regenerar ni reintentar un command de gasto |
| La alerta de queue age persiste con runs completos | Eventos `reconcile` terminales quedaron `pending` aunque ya no son reclamables | Aplicar reconciliación/backfill gobernado y corregir la métrica; nunca `UPDATE` manual |

## Rollback

`producer_assets_enabled = false` en `variables.tf` + `tofu apply` (< 5 min). No hay estado que revertir:
las anotaciones son aditivas y el depósito es de sólo lectura en este camino. Rotar el secreto invalida
los pases vivos, pero el radio está acotado por el TTL (300 s): las redenciones fallan a lo sumo esa
ventana y se recupera pidiendo una ficha nueva.

## Referencias técnicas

- Contrato: `efeonce-globe/packages/contracts/src/producer-assets.ts`
- Autorización + comandos: `efeonce-globe/packages/domain/src/producer-assets.ts`
- Lectura del depósito: `efeonce-globe/apps/creative-runner/src/output-retrieval.ts`
- Ruta + pase firmado: `efeonce-globe/apps/studio-web/src/{app.ts,retrieval-grant.ts}`
- Persistencia: `efeonce-globe/packages/database/{migrations/0003_producer_asset_annotations.sql,src/stores/producer-asset-store.ts}`
