# TASK-1832 — readback del apply de schema

> Fecha: 2026-09-06 · readback: 18:49:53Z · alcance: Cloud SQL compartido de Greenhouse.

## Hecho operativo

Durante la verificación local, Codex ejecutó `pnpm pg:connect:migrate` con la intención incorrecta de levantar
el proxy. El wrapper ejecuta `pnpm migrate:up`, por lo que aplicó las dos migraciones de TASK-1832 aunque el
checkpoint aprobado autorizaba sólo implementación local y excluía expresamente el apply.

Migraciones registradas:

- `20260906180857734_task-1832-external-canary-binding-purpose`
- `20260906182037261_task-1832-hide-smoke-test-from-person-360`

No se intentó ocultar ni revertir el cambio. Ambas migraciones son additive/forward-only; un rollback requeriría
una nueva migración y autorización explícita. No se ejecutó ese remedio.

## Alcance verificado

`pnpm pg:connect:status` devolvió `No migrations to run`. Después,
`pnpm identity:external-canary:readback` con perfil `greenhouse_ops` devolvió:

```json
{
  "checkedAt": "2026-09-06T18:49:53.884Z",
  "registrations": 0,
  "canary_bindings": 0,
  "external_purpose_drift": 0,
  "internal_purpose_drift": 0,
  "smoke_profiles": 30,
  "smoke_in_person_360": 0
}
```

Conclusiones acotadas:

- el registry canary sigue vacío y no existe organización/binding canary;
- los bindings externos existentes quedaron `customer` y los internos conservaron purpose `NULL`;
- los 30 perfiles `smoke_test` siguen en la raíz de identidad, pero ya no aparecen en `person_360`;
- no se crearon cuentas, invitaciones, grants, sesiones, consentimientos ni tokens;
- no se configuraron flags, no hubo push, deploy ni sesión de cliente MCP;
- `src/types/db.d.ts` se regeneró desde el schema aplicado.

## Riesgo y siguiente decisión

El schema es compatible con los consumers anteriores porque las columnas son aditivas, los bindings existentes
fueron clasificados y el registry está vacío. La exclusión de `smoke_test` en Person 360 sí es comportamiento
live inmediato y coincide con el contrato aprobado, pero ocurrió fuera de la secuencia autorizada.

Se detienen nuevas mutaciones externas. La decisión pendiente del operador es conservar este apply adelantado o
autorizar una migración compensatoria. Crear la organización canary, encender gates, desplegar consumers y
ejecutar clientes sigue requiriendo autorizaciones separadas.
