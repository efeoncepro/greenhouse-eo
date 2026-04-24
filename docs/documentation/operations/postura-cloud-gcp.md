# Postura Cloud GCP

Resumen operativo del estado cloud real de Greenhouse a partir de una auditoria live en GCP del `2026-04-23`.

Este documento explica la situacion en lenguaje simple. Para detalle tecnico, inventario exhaustivo y contratos de seguridad, ver:

- [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](../../architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md)
- [GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md](../../architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md)
- [GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md](../../architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md)

## Foto Rapida

Hoy Greenhouse opera con esta base cloud:

- `1` instancia Cloud SQL compartida: `greenhouse-pg-dev`
- `13` servicios serverless en total:
  - `5` Cloud Run custom
  - `8` servicios legacy / Cloud Functions Gen 2
- `16` jobs activos de Cloud Scheduler
- `29` secretos en GCP Secret Manager
- `13` datasets en BigQuery
- PostgreSQL live:
  - `261` tablas base
  - `18` views
  - tamano actual `148 MB`

## Que Esta Bien Encaminado

La capa nueva esta mejor resuelta que la legacy.

- `ops-worker` y `commercial-cost-worker` ya usan:
  - service account dedicada `greenhouse-portal@...`
  - invocacion OIDC desde Cloud Scheduler
  - secretos montados desde Secret Manager
- Cloud SQL ya no esta abierto por red:
  - `authorizedNetworks` esta vacia
  - `sslMode=ENCRYPTED_ONLY`
- PostgreSQL no muestra hoy un problema de tamano o capacidad.
- BigQuery tampoco se ve desbordado; el storage esta concentrado principalmente en `notion_ops` y `hubspot_crm`.

## Que Sigue En Riesgo

El problema actual no es falta de infraestructura. Es convivencia entre un estandar nuevo y otro legado.

- Parte de los servicios legacy todavia corre con la default compute service account, que tiene permisos demasiado amplios.
- Al menos `hubspot-greenhouse-integration` y `notion-bq-sync` estan publicamente invocables.
- `ico-batch-worker` todavia mantiene `GREENHOUSE_POSTGRES_PASSWORD` en variable de entorno plana.
- Varias integraciones legacy siguen usando tokens sensibles desde env plano en lugar de Secret Manager.
- Staging y production todavia comparten la misma Cloud SQL y parte del runtime batch/reactivo.
- El runtime PostgreSQL todavia tiene drift de permisos: `greenhouse_app` puede crear en schemas donde no deberia por contrato.

## Que Significa Operativamente

Greenhouse ya tiene una base moderna sobre la cual crecer, pero todavia no tiene una postura cloud homogenea.

En la practica eso significa:

- la parte nueva del stack es razonablemente sana
- la parte legacy sigue concentrando el mayor riesgo
- el riesgo principal ya no es "Cloud SQL abierto a Internet", sino:
  - exposicion publica innecesaria de algunos servicios
  - identidades demasiado amplias
  - secretos sensibles fuera del carril canonico
  - poca separacion entre staging y production

## Prioridades Recomendadas

1. Cerrar servicios publicamente invocables que no deban ser publicos.
2. Mover servicios legacy fuera de la default compute service account.
3. Eliminar secretos sensibles en env plano, empezando por `ico-batch-worker`.
4. Reconciliar grants reales de PostgreSQL con el modelo canonico.
5. Endurecer lo que queda pendiente en Cloud SQL:
   - `connectorEnforcement`
   - `deletionProtection`
   - revision de necesidad real de IP publica
6. Separar staging y production de forma progresiva en DB, workers y secretos.

## Lectura Rapida Por Dominio

- **Cloud Run / Functions:** mixto. Lo nuevo esta bien; lo legacy es la mayor deuda.
- **Secret Manager:** existe y se usa, pero todavia no es el carril universal.
- **Cloud SQL / PostgreSQL:** buena base tecnica, pero con drift de permisos y topologia compartida.
- **BigQuery:** footprint contenido; foco en gobernanza y lifecycle, no en capacidad.

## Regla Practica

Cuando se hable de "la postura cloud de Greenhouse", no asumir un unico estandar.

Siempre distinguir:

- capa moderna
- capa legacy

Esa diferencia explica casi todos los riesgos abiertos que sigue mostrando la auditoria.
