# Sample Sprints comerciales

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.1
> **Creado:** 2026-05-07
> **Ultima actualizacion:** 2026-05-09 por Claude (TASK-835 — runtime projection canonica + degraded honest)
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

## Runtime projection (TASK-835)

A partir de TASK-835, toda la surface `/agency/sample-sprints` consume un mismo payload server-side llamado **runtime projection**. Es lo que la portada y los wizards leen para mostrar progreso, costo real, equipo y senales — antes esos numeros se calculaban en el navegador con reglas locales y no coincidian con la fuente canonica.

Que devuelve la projection:

- Por cada sprint visible en el command center: progreso real (desde el ultimo snapshot), costo real (CLP del periodo, desde la VIEW canonica de cost attribution), severidad de la senal y dias desde el ultimo snapshot.
- Por el sprint seleccionado: equipo propuesto enriquecido con `display_name` y `role_title` reales del directorio, y evaluacion de capacidad (ok / atencion / critico) cuando hay equipo + fechas suficientes.
- Las 6 senales canonicas de Salud Comercial mapeadas 1 a 1: `overdue-decision`, `budget-overrun`, `zombie`, `unapproved-active`, `stale-progress`, `conversion-rate-drop`. Operan con el mismo motor que `/admin/operations`, scoped al tenant.
- Conversion rate trailing 6 meses con el threshold canonico.
- Lista de razones de degradacion honest cuando alguna fuente esta caida — la UI las muestra en un banner Alert sin bloquear la operacion.

Reglas honest aplicadas:

- Costo no disponible -> `—` con tooltip "Sin costo registrado para el periodo actual". Nunca `$0` silente.
- Progreso sin snapshot -> texto "Sin progreso" en lugar de barra al 0%. Nunca un porcentaje inventado.
- Capacidad no evaluable -> banner degraded; el campo queda vacio en lugar de mostrar disponibilidad falsa.
- Equipo con miembros no resolubles -> los miembros se renderizan con flag `unresolved=true` y un banner explica que algunos no estan en el directorio activo.

Convencion canonica de progreso:

- El porcentaje de avance vive en `engagement_progress_snapshots.metrics_json.deliveryProgressPct` como numero entre 0 y 100.
- El wizard de progreso (`/agency/sample-sprints/[serviceId]/progress`) ya escribe esa key.
- Future tasks que registren progreso DEBEN respetarla. La projection acepta `metrics.progressPct` como fallback compat pero el camino canonico es `deliveryProgressPct`.

Cache + invalidacion:

- La projection cachea por (subjectId, tenantId) con TTL 30 segundos in-memory.
- Cuando un operador declara, aprueba, rechaza, registra progreso o cierra outcome, un consumer reactivo escucha el evento outbox y dropea el cache scoped al `service_id` afectado. El siguiente render trae datos frescos sin esperar al TTL.

Salud de la propia projection:

- El reliability dashboard expone `commercial.sample_sprint.projection_degraded` bajo Salud Comercial. Steady = 0. Si emite > 0, alguna fuente downstream (cost attribution, health helpers, capacity checker) esta degradando frecuente.

> Detalle tecnico: spec en `docs/tasks/complete/TASK-835-sample-sprints-runtime-projection-hardening.md`. Pattern fuente: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (TASK-611). Helper canonico: `src/lib/commercial/sample-sprints/runtime-projection.ts`. Reactive consumer: `src/lib/sync/projections/sample-sprint-runtime-cache-invalidation.ts`. Reliability signal: `src/lib/reliability/queries/sample-sprint-projection-degraded.ts`.
