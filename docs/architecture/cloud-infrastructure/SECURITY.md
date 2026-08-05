# Cloud Infrastructure — Security quick-reference

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)
> **La postura completa, estrategia de secrets y plan de hardening viven en
> [`GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`](../GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md) —
> ese doc es el authoritative.** Esta página es sólo referencia rápida (as-of auditoría live
> 2026-04-23).

## Current gaps

| Issue | Severity | Current state | Recommendation |
| --- | --- | --- | --- |
| Public Cloud Run invokers | **High** | `hubspot-greenhouse-integration` y `notion-bq-sync` exponen `roles/run.invoker` a `allUsers` | revisar y cerrar exposure donde no sea requisito explícito de producto |
| Default compute SA on legacy services | **High** | varias integraciones legacy corren con la default compute SA y permisos amplios | migrar a service accounts dedicadas por servicio |
| Plaintext secrets in runtime configs | **High** | `ico-batch-worker` mantiene password PostgreSQL en env plano; varias Functions legacy también | mover a Secret Manager y eliminar env plano residual |
| PostgreSQL runtime grant drift | **High** | `greenhouse_app` puede hacer `CREATE` en `greenhouse_serving` y `greenhouse_payroll` | reconciliar grants con `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` |
| Shared staging / production topology | **High** | workers y Cloud SQL compartidos para staging y production | la topología compartida es canónica hoy ([TOPOLOGY.md](TOPOLOGY.md) §1); el aislamiento progresivo por DB/workers/contratos sigue siendo la dirección de hardening cuando el roadmap lo permita |
| Cloud SQL connector enforcement | **Medium** | sin red abierta, pero `connectorEnforcement=NOT_REQUIRED` | endurecer hacia connector-first cuando el tooling legacy esté listo |
| Cloud SQL deletion protection | **Medium** | `deletionProtection=false` | activar protection y revisar runbook break-glass |
| GitHub Actions deployer breadth | **Medium** | SA deployer mantiene `secretmanager.admin`, `run.admin`, `cloudscheduler.admin`, etc. | reducir permisos o separar responsabilidades deploy vs IAM |

## Resolved / materially improved

- Cloud SQL ya no expone `authorizedNetworks=0.0.0.0/0` (lista vacía)
- `sslMode=ENCRYPTED_ONLY` activo
- El patrón Scheduler → OIDC → Cloud Run funciona en la capa nueva
- Los workers nuevos usan la SA `greenhouse-portal@...` y Secret Manager como baseline
- WIF implementado para CI/CD y runtime Vercel (sin SA keys persistentes en el camino moderno)

## Priority actions

1. **Cerrar servicios públicamente invocables** donde no sean requisito real.
2. **Migrar servicios legacy fuera de la default compute SA.**
3. **Eliminar secretos sensibles en env plano**, empezando por `ico-batch-worker` y Functions
   legacy.
4. **Reconciliar grants runtime de PostgreSQL** y rerun de `pg:doctor`.
5. **Endurecer Cloud SQL restante** (`connectorEnforcement`, `deletionProtection`, IP pública).
6. **Separar staging y production** en DB/workers/secrets cuando el roadmap lo permita.
