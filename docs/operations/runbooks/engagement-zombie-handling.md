# Engagement Zombie Handling

> **Runbook:** TASK-810
> **Dominio:** Comercial / Sample Sprints
> **Guard DB:** `services_engagement_requires_decision_before_120d`
> **Ruta operativa:** `/agency/sample-sprints/[serviceId]/outcome`

## Cuando aplica

El guard se activa cuando un `greenhouse_core.services` cumple todo esto:

- `engagement_kind != 'regular'`
- `active = TRUE`
- `status = 'active'`
- `status != 'legacy_seed_archived'`
- `hubspot_sync_status IS DISTINCT FROM 'unmapped'`
- `start_date` tiene más de 120 días
- no existe outcome en `greenhouse_commercial.engagement_outcomes`
- no existe lineage en `greenhouse_commercial.engagement_lineage`

Si alguien intenta insertar o actualizar una fila en ese estado, PostgreSQL rechaza la operación con `check_violation`.

## Mensaje esperado

```text
services_engagement_requires_decision_before_120d: service=<id> lleva <n> dias activo sin outcome ni lineage; registra outcome en /agency/sample-sprints/<id>/outcome antes de actualizar
```

## Resolución operativa

1. Abre `/agency/sample-sprints/<serviceId>`.
2. Revisa el contexto del sprint, progreso, approval y reporte.
3. Acordar outcome real con el stakeholder comercial/operativo.
4. Registra outcome en `/agency/sample-sprints/<serviceId>/outcome`.
5. Usa uno de los outcomes canónicos:
   - `converted`
   - `adjusted`
   - `dropped`
   - `cancelled_by_client`
   - `cancelled_by_provider`
6. Adjunta reporte si aplica.
7. Reintenta el update original.

## Preflight

Antes de cambios operativos o deploys que toquen Sample Sprints, puedes correr:

```bash
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/preflight-zombie-check.ts
```

El estado sano es:

```text
violationCount=0
```

Si el conteo es mayor que cero, no hagas updates manuales sobre esos services. Primero registra outcomes o lineage legítimo.

## Qué no hacer

- No desactivar el trigger para "destrabar" una actualización normal.
- No cambiar `engagement_kind` a `regular` para esconder un sprint zombie.
- No marcar `hubspot_sync_status='unmapped'` si el service sí es operativo.
- No editar `engagement_outcomes` por SQL manual salvo remediación explícita con handoff.

## Evidencia esperada

- Reliability signal `commercial.engagement.zombie` vuelve a `ok`.
- Preflight `TASK-810` reporta `violationCount=0`.
- El service conserva audit/outbox de outcome vía helpers TASK-808.
