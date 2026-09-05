# TASK-1836 — reparación de permisos y auditoría del release

Estado: reparación implementada, probada e integrada por PR #222 en main
`1086fe40a55396fc199ef2e446391c14a69b665d` el 2026-09-05 a las 16:11:11 UTC. El actor real ya fue
revalidado con permisos permitidos. CI, Deep, E2E y Production READY verificados; orquestador único `33978290957` en curso.
El readback de la auditoría persistida ya coincide con el motivo autorizado. No se ha usado bypass con una
comprobación de autoridad denegada.

## Evidencia

- PR integrado: https://github.com/efeoncepro/greenhouse-eo/pull/222.
- Preflight de `a9f16b89393cfb19995baf07f48616a139f6bffb`: `requires_break_glass` por schema,
  autenticación y deploy. Las 636 migraciones locales están aplicadas; no hay migraciones pendientes.
- El actor canónico `user-efeonce-admin-julio-reyes` tiene rol `efeonce_admin` activo, vigente desde
  2026-03-15 y sin fecha de término. Las capabilities existen en el registro y no están deprecadas.
- Antes de la reparación, `can()` devolvía false tanto para `platform.release.preflight.override_batch_policy` (`update/all`)
  como para `platform.release.bypass_preflight` (`bypass_preflight/all`); ambas carecen de entradas.
- `getTenantEntitlements()` sí agrega `platform.release.execute`; faltan las otras seis capabilities
  del contrato. El catálogo no concede acceso por sí solo. El mismo estado existe en el último release
  `9100bbd2765d7906331f3ccfa6a680f16e98c2d0`; TASK-1836 no eliminó estos permisos.
- Corrección del diagnóstico inicial: afirmar que faltaban las siete capabilities era incorrecto.
  Se contrastó el árbol del último release y el diff completo de runtime.ts; execute ya estaba presente.
- El workflow/CLI acepta las flags de excepción por motivo de al menos 20 caracteres, pero no llama
  a `can()` para verificar al humano. La denegación fue detectada por la comprobación explícita del
  operador de este rollout; no fue un rechazo emitido por GitHub o Vercel. Esto explica por qué los
  releases anteriores podían avanzar sin mostrar la discrepancia.

## Cambio implementado

Se restauró en `src/lib/entitlements/runtime.ts`, mediante `addEntitlement` y comprobación explícita
de rol, el contrato vigente de `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (TASK-935):

| Capability | Acción / scope | Roles |
| --- | --- | --- |
| `platform.release.execute` | `execute/all` | EFEONCE_ADMIN |
| `platform.release.rollback` | `rollback/all` | EFEONCE_ADMIN |
| `platform.release.bypass_preflight` | `bypass_preflight/all` | EFEONCE_ADMIN |
| `platform.release.watchdog.read` | `read/all` | EFEONCE_ADMIN |
| `platform.release.preflight.execute` | `execute/all` | EFEONCE_ADMIN |
| `platform.release.preflight.read_results` | `read/all` | EFEONCE_ADMIN, FINANCE_ADMIN |
| `platform.release.preflight.override_batch_policy` | `update/all` | EFEONCE_ADMIN |

Conservar motivo de al menos 20 caracteres, auditoría y gates CI/Production independientes.
No crear DEVOPS_OPERATOR, inferir permisos de un grupo de rutas ni otorgar permisos por usuario/email.

## Verificación exigida antes de retomar

Pruebas de comportamiento sobre `can()`: administrador permite las siete combinaciones; Finance sólo
lee resultados; colaborador, operaciones, cuenta, cliente y grupo `admin` sin rol no adquieren estos
permisos; acciones incorrectas son denegadas. Releer el actor real después de la reparación y volver a
ejecutar preflight. Una prueba textual del código no sustituye estas comprobaciones.

La autorización de reparación quedó explícita: «Ok lo que resuelvas hazlo de formó robusta y escalable
y documenta lo que hagas», tras presentar esta matriz. No se otorgan excepciones por email, usuario
particular ni GitHub login. La comprobación real del actor sigue siendo obligatoria en este rollout.

Límite: restaurar grants del evaluador no implementa por sí solo un enlace autenticado entre GitHub
actor y persona Greenhouse para el CLI. No se afirmará que el workflow hace esa comprobación ni se
inventará un mapping de identidad; GitHub conserva sus permisos y approvals, y este rollout conserva
el readback explícito de la persona canónica y la auditoría del motivo por separado.

## Reparación local y readback

Se conservó el grant existente `platform.release.execute` y se añadieron seis entradas explícitas para
EFEONCE_ADMIN. FINANCE_ADMIN recibe únicamente `preflight.read_results`. No se modificaron registros
de roles ni PostgreSQL. Las pruebas nuevas dieron 7 fallos antes del cambio y, junto a la suite existente,
28 passed después. Incluyen negativos por rol/grupo de rutas, acciones incorrectas y ausencia de
duplicados. El readback de la persona canónica devuelve ahora ambas excepciones `allowed:true`,
`source:role`; no se inyectaron grants en el sujeto de la prueba real.

También se detectó una segunda diferencia entre comentarios y ejecución: `BYPASS_REASON` se usaba
para activar las flags pero no llegaba al JSON preflight ni al audit row. La reparación del transporte
y persistencia del motivo se integra antes del release; no basta escribirlo en la consola del workflow.

Contrato reparado de auditoría: `--override-reason` obligatorio con cualquiera de las dos flags,
validación antes de ejecutar checks y al aceptar el artefacto para persistencia. `preflight.override`
contiene motivo normalizado, flags y actor declarado; el mismo objeto llega a metadata del audit row
en la transacción del manifest. El workflow usa un array Bash para preservar espacios y literales.
Un motivo inválido falla cerrado; un release sin excepción conserva su comportamiento anterior.

Validación integrada local: 46 passed en cinco archivos de pruebas y typecheck correcto. Pruebas
de persistencia recorren recordReleaseStarted y sus writes transaccionales con DB mock; el readback
PG de auditoría se verificará tras ejecutar el orquestador, no se cuenta como prueba live todavía.

## Readback de persistencia en producción

El run `33978290957` creó el manifest `1086fe40a553-2bdc070c-ead3-4f52-8100-708d63b6aa39`
a las 16:37:07 UTC. Lectura real de PG confirmó el mismo objeto override en `preflight_result` y
en metadata de la transición inicial: motivo completo y ambas flags `true`. El actor declarado por
GitHub es `cesargrowth11`; la comprobación de autoridad del usuario canónico Greenhouse se realizó
por separado. Esta evidencia no establece un enlace autenticado automático entre ambas identidades.
La ejecución final del release y los canaries de acceso siguen sujetos a sus verificaciones propias.
