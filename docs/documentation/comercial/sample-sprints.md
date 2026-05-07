# Sample Sprints comerciales

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-07
> **Modulo:** Comercial / Agencia
> **Ruta:** `/agency/sample-sprints`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`

## Para que sirve

Sample Sprints es la surface operativa para pilotos, trials, POCs y discovery comerciales antes de un servicio regular. No crea una entidad paralela: cada Sample Sprint es un `greenhouse_core.services` con `engagement_kind != 'regular'`, approval workflow, snapshots de progreso, outcome terminal, audit log y eventos outbox versionados.

## Subtipos visibles

| UI | Runtime |
| --- | --- |
| Operations Sprint | `pilot` |
| Extension Sprint | `trial` |
| Validation Sprint | `poc` |
| Discovery Sprint | `discovery` |

## Flujo funcional

1. El operador declara el Sample Sprint desde `/agency/sample-sprints/new`.
2. Greenhouse crea el service local en estado `pending_approval`, con `commitment_terms_json` que guarda criteria, deadline, costo esperado y equipo propuesto.
3. Un aprobador con `commercial.engagement.approve` aprueba. Si el equipo queda sobre capacidad, el helper exige motivo de override.
4. El operador registra snapshots semanales con `metrics_json` y notas cualitativas.
5. Al cierre, el operador registra outcome. Si el outcome es `converted`, la API llama `convertEngagement()` para outcome + lineage/terms opcionales + audit/outbox en una transaccion.

## Acceso

- `routeGroups`: la surface vive bajo `/agency` y es visible para `commercial`, `internal` y `admin` segun view/capability.
- `views`: `gestion.sample_sprints` controla menu y page guard.
- `entitlements`: `commercial.engagement.read`, `declare`, `record_progress`, `record_outcome`, `approve`.
- `startup policy`: sin cambios.

## Reglas importantes

- No se escribe a HubSpot al declarar un Sample Sprint. HubSpot p_services sigue siendo source of truth solo para engagements firmados.
- No existe tabla `sample_sprints`; el contrato canonico es `services.engagement_kind`.
- Reportes de cierre usan el uploader privado canonico con contextos `sample_sprint_report_draft` y `sample_sprint_report`.
- Los audit events y outbox events los emiten los helpers del dominio dentro de la misma transaccion de negocio.
- Un Sample Sprint activo por más de 120 días sin outcome ni lineage es rechazado por el guard DB `services_engagement_requires_decision_before_120d`. El signal `commercial.engagement.zombie` alerta antes, a los 90 días.
