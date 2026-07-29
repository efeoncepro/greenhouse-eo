# Efeonce Globe — Modos operativos y responsabilidades

> **Tipo:** documentación funcional
> **Versión:** 1.0
> **Actualizado:** 2026-07-21 (TASK-1466)

## Qué resuelve

Globe registra quién responde por cada decisión de una producción creativa sin convertir esa responsabilidad en un
permiso. Una asignación puede ser el default del workspace o una excepción para un run y siempre queda versionada.

Los modos son:

- `client-operated`: el cliente opera y es dueño de la entrega;
- `co-operated`: cliente y Efeonce comparten responsabilidades explícitas;
- `efeonce-managed`: Efeonce opera y es dueño de la entrega.

## Qué debe declarar una asignación

Cada snapshot identifica autoridad de brief, operador, aprobadores creativo y de presupuesto, autoridad de templates y
derechos, y responsables de entrega y aprobación. También conserva la forma de delivery y engagement mediante una
referencia opaca; nunca guarda pricing, margen ni costo de proveedor.

Un cambio crea una versión nueva y una auditoría correlacionada. Repetir la misma petición con la misma llave devuelve
el resultado previo; reutilizar la llave para una intención distinta o cambiar desde una versión stale falla cerrado.
Para un run, la lectura efectiva usa primero su override y luego el default del workspace. Si ninguno existe, no inventa
un modo.

## Límites

- La asignación no agrega membership, role, entitlement ni capability.
- Workspace y actor provienen del contexto autenticado, no del payload.
- Greenhouse gobierna TASK/EPIC; Globe posee el contrato, los datos y la auditoría en su Postgres.
- La capacidad desplegada es internal-only. UI, MCP, clientes externos y producción comercial siguen bloqueados por sus
  gates posteriores.

## Estado verificado

El 2026-07-21 se aplicó la migración `0002_operating_responsibilities.sql` en Cloud SQL y se desplegó el runtime interno.
El smoke autenticado probó assign v1, replay estable, conflicto, change v2, readers y rechazo cross-workspace; el
readback confirmó dos versiones y dos auditorías en `greenhouse-org:efeonce`.

## Referencias

- [Contrato técnico](../../architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md)
- [Manual operativo](../../manual-de-uso/creative-studio/operar-modos-responsabilidad-globe.md)
- [TASK-1466](../../tasks/complete/TASK-1466-globe-operating-modes-responsibility-contract.md)
