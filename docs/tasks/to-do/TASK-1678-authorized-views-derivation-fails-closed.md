# TASK-1678 — Que la derivación de `authorizedViews` falle hacia cerrado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`resolveAuthorizedViewsForUser` falla hacia **abrir** en tres puntos encadenados: sin fila en
`role_view_assignments` otorga por routeGroup, el `SELECT` de assignments no filtra vigencia, y ante
`SCHEMA_NOT_READY` devuelve el `VIEW_REGISTRY` completo del routeGroup. Como 18 de las 25 vistas
`cliente.*` están gobernadas por módulo contratado, el default del carril viejo es el **opuesto** al
del canónico. Esta task lo invierte para el routeGroup `client` y le pone señal al camino degradado.

## Why This Task Exists

Un carril de autorización que ante la duda otorga no es un carril: es un default disfrazado de
control. Hoy `ISSUE-147` documenta tres formas de llegar ahí y las tres son silenciosas.

Lo que hace esta task urgente no es su gravedad aislada, sino un acoplamiento incómodo: **el
fail-open está contenido por otro bug**. El guard de cada página (`ISSUE-146`) deniega a todo cliente
por usar la llave equivocada, así que aunque el claim otorgue de más, la puerta no abre. En el momento
en que `TASK-1679` arregle el guard, esa contención desaparece.

Por eso esta task va primero. Invertir el orden abre una ventana —de la duración de un release— en la
que un cliente ve el ítem **y** entra a una superficie que no contrató.

Medición completa: `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md`.

## Goal

- Sin fila explícita en `role_view_assignments`, una vista `cliente.*` **no** se otorga.
- Una asignación no vigente deja de contar.
- El camino degradado (`SCHEMA_NOT_READY`, y el `catch` de la derivación) cierra en vez de abrir, y
  emite señal.
- El comportamiento del portal **interno** no cambia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (§12.1 menú module-driven, §12.2 guard)
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (§`Session access lifecycle`)
- `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md`

Reglas obligatorias:

- **NUNCA** borrar filas de `role_view_assignments`: es append-only. Esta task sólo cambia **cómo se
  lee**.
- **NUNCA** cambiar el default del routeGroup interno sin evidencia: el fallback permisivo es lo que
  hace usable el portal interno sin seedear cientos de filas. El alcance es `client`.
- **SIEMPRE** aplicar el mismo predicado de ciclo de vida que el resto del dominio de acceso
  (`IDENTITY_WORKFORCE_AGENT_INVARIANTS` §`Session access lifecycle`): un rol revocado o expirado
  nunca confiere acceso.
- **NUNCA** dejar que un camino degradado devuelva más permisos que el camino feliz.

## Normative Docs

- `docs/issues/open/ISSUE-147-authorized-views-derivation-grants-by-default.md` — los tres defectos con su evidencia en código
- `docs/issues/open/ISSUE-146-client-portal-view-code-guard-passes-client-id-as-organization-id.md` — la contención que esta task retira
- `docs/tasks/complete/TASK-827-client-portal-composition-layer-ui.md` — introdujo el carril canónico y dejó el viejo en paralelo

## Dependencies & Impact

### Depende de

- `greenhouse_core.role_view_assignments` — existe
- `VIEW_REGISTRY` en `src/lib/admin/view-access-catalog.ts` — existe
- El patrón de reliability signal de `src/lib/reliability/queries/` — existe

### Impacta a

- `TASK-1679` (guard + allowlist) — **debe ir después de ésta**. Es el orden completo del inventario.
- `TASK-286` (client view catalog expansion, P0 de abril 2026) — su premisa venció: dice "hoy hay 11
  view codes `cliente.*`" y hoy hay 25. Va en otra dirección (capabilities finas sobre el carril de
  views) que la que el inventario propone (module-gated + allowlist). Coordinar antes de tomarla.
- Todo consumidor de `session.user.authorizedViews`: 82 ocurrencias en 40 archivos, de las cuales ~86
  puntos de decisión son legítimos y no se tocan.

### Files owned

- `src/lib/admin/view-access-store.ts`
- `src/lib/admin/__tests__/` [verificar el path real de sus tests]
- `src/lib/reliability/queries/` (signal nueva)
- `src/lib/tenant/access.ts` (el `catch` que vacía el claim en silencio)

## Current Repo State

### Already exists

- `resolveAuthorizedViewsForUser` en `src/lib/admin/view-access-store.ts`
- `computeRoleCanAccessViewFallback` en el mismo archivo — el default permisivo
- El patrón de signal `identity.workforce.unlinked_internal_user`, espejo del que hace falta acá
- Los 5 denials `granted=FALSE` sembrados para roles `client_*`

### Gap

- El default otorga con `role.routeGroups.includes(view.routeGroup)`; un rol `client_*` y una vista
  `cliente.*` comparten routeGroup `client`, así que toda vista nueva se auto-otorga.
- El `SELECT` de `role_view_assignments` no tiene `WHERE`: ni `active`, ni `effective_to`.
- El fallback de `SCHEMA_NOT_READY` devuelve `VIEW_REGISTRY.filter(routeGroup).map(viewCode)` — las 25
  `cliente.*`, incluidos los 5 con denial. Y como la lista sale **no vacía**, los guards de "lista
  vacía" de los consumidores no se activan.
- El `catch` de `src/lib/tenant/access.ts` deja el claim en `[]` con un `console.warn`: sin
  `captureWithDomain`, sin señal.
- Los denials son anulables: la derivación hace `roleCodes.some(...)`, así que un usuario con dos roles
  recibe la vista si alguno la otorga.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/admin/view-access-store.ts` + `src/lib/tenant/access.ts`, runtime Vercel y CLI
- Future candidate home: `remain-shared`
- Boundary: la derivación sigue siendo la primitive única del carril rol→vista; esta task no la
  fusiona con el resolver de módulos ni crea un tercer carril
- Server/browser split: server-only puro; el claim viaja al cliente ya resuelto dentro de la sesión
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_core.role_view_assignments` (solo lectura) + `VIEW_REGISTRY`
- Consumidores afectados: toda sesión autenticada — UI, API lane `app`, Nexa, shortcuts
- Runtime target: `local` + `staging` + `production`

### Contract surface

- Contrato existente a respetar: `session.user.authorizedViews: string[]` (`src/types/next-auth.d.ts`)
- Contrato nuevo o modificado: ninguno en la forma; **cambia el contenido** para tenants `client`
- Backward compatibility: `gated` — la shape no cambia, pero un cliente puede pasar a recibir menos
  viewCodes de los que recibía. Ése es el objetivo, y es lo que obliga a la verificación con personas
  reales antes de promover.
- Full API parity: sin superficie nueva; la derivación ya es una primitive server-side compartida

### Data model and invariants

- Entidades afectadas: `greenhouse_core.role_view_assignments` (SELECT)
- Invariantes que no se pueden romper:
  - append-only: la task **no** escribe ni borra filas
  - un rol revocado o expirado nunca confiere acceso
  - un camino degradado nunca devuelve más permisos que el camino feliz
  - el portal interno conserva su comportamiento actual
- Tenant/space boundary: la decisión se toma por `routeGroup` de la vista y los `roleCodes` de la
  sesión; el alcance del cambio es el routeGroup `client`
- Idempotency/concurrency: read-only puro
- Audit/outbox/history: `none` para el read path; la señal nueva es el rastro observable

### Migration, backfill and rollout

- Migration posture: `none` en schema. **Pero puede requerir seed**: al invertir el default, cualquier
  vista `cliente.*` que hoy dependa del fallback permisivo se apaga. Parte del Slice 1 es medir cuáles
  y decidir si se seedean sus `granted=TRUE` explícitos.
- Default state: `enabled with rationale` — un flag que hay que acordarse de prender repetiría el
  problema. El cambio se verifica antes de promover, no después.
- Backfill plan: si el Slice 1 detecta vistas que dependen del fallback, migración de seed aditiva con
  `granted=TRUE` explícito para los roles que hoy las reciben
- Rollback path: `revert PR + redeploy`
- External coordination: ninguna

### Security and access

- Auth/access gate: es el propio gate; corre dentro de la resolución de sesión
- Sensitive data posture: `no sensitive data` — viewCodes y roleCodes
- Error contract: `captureWithDomain` en los caminos degradados, reemplazando el `console.warn`
- Abuse/rate-limit posture: `none with rationale` — sin superficie pública

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/admin src/lib/tenant`, `pnpm local:check`
- DB/runtime checks: ejercitar la derivación contra PG real con las tres personas agente y comparar
  el claim resultante contra el esperado, antes y después
- Integration checks: `pnpm fe:capture` de una ruta cliente con la persona de Berel, para confirmar
  que el menú no pierde ítems legítimos
- Reliability signals/logs: la señal nueva del claim degradado, en estado `ok` esperado
- Production verification sequence: ver §Rollout

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Medir qué se apaga antes de apagarlo

- Script de medición (read-only, contra PG) que, para cada rol `client_*`, compare el claim actual
  contra el que produciría el default invertido.
- Salida esperada: la lista de viewCodes `cliente.*` que hoy llegan **sólo** por el fallback permisivo.
- Si la lista no está vacía, decidir por cada una: seed explícito `granted=TRUE`, o apagado
  intencional. Esa decisión se documenta en la task antes del Slice 2.

### Slice 2 — Invertir el default para el routeGroup `client`

- `computeRoleCanAccessViewFallback` deja de otorgar por routeGroup cuando `view.routeGroup === 'client'`.
- El comportamiento interno queda intacto.
- Tests: una vista `cliente.*` sin fila no se otorga; una vista interna sin fila sigue otorgándose.

### Slice 3 — Vigencia en el `SELECT`

- Agregar el predicado canónico de ciclo de vida al `SELECT` de `role_view_assignments`.
- Test con una fila no vigente que hoy cuenta y después no.

### Slice 4 — Degradar hacia cerrado, con señal

- El fallback de `SCHEMA_NOT_READY` deja de devolver el `VIEW_REGISTRY` para tenants `client`.
- El `catch` de `src/lib/tenant/access.ts` emite `captureWithDomain` en vez de `console.warn`.
- Signal nueva de claim degradado (patrón `identity.workforce.unlinked_internal_user`), steady = 0.
- Test: en modo degradado, un tenant `client` no recibe viewCodes module-gated.

### Slice 5 — Los denials anulables

- Decidir y documentar: ¿un `granted=FALSE` de un rol debe vencer sobre el `granted=TRUE` de otro rol
  del mismo usuario?
- Si la respuesta es sí, implementarlo. Si es no, dejar escrito en la spec del dominio qué significan
  realmente los denials, para que nadie los vuelva a tomar como garantía.

## Out of Scope

- El guard `requireViewCodeAccess` y las 6 vistas huérfanas — son `TASK-1679`.
- Promover el lint `no-untokenized-business-line-branching` a `error` — es `TASK-1680`.
- Migrar los ~86 puntos de decisión legítimos: el carril rol→vista es la fuente correcta para
  superficies internas y no se toca.
- `capability-modules-resolver-migration` (el bloque `businessLines`/`serviceModules` del menú).
- Rediseñar el modelo de capabilities del portal cliente (`TASK-286`).

## Detailed Spec

**Por qué el alcance es el routeGroup `client` y no el default entero.** El fallback permisivo existe
por una razón legítima: sin él, el portal interno exigiría seedear cientos de filas para que un rol vea
lo que su routeGroup ya implica. Para las superficies internas, "tu routeGroup te da acceso" es una
regla de negocio razonable. Para el portal cliente **no lo es**, porque ahí el acceso lo define un
contrato comercial y no una pertenencia organizacional.

**Por qué el Slice 1 va antes que el 2.** Invertir el default es una línea; saber a quién se le apaga
qué, no. Sin la medición, este cambio se despliega a ciegas sobre un carril que hoy otorga por omisión,
y el modo de fallo sería que un cliente pierda una superficie que venía usando legítimamente. La
medición convierte eso en una lista revisable.

**El orden respecto de `TASK-1679` no es preferencia.** Está explicado en §Why: hoy el fail-open está
contenido por el fail-closed del guard.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 **antes** que Slice 2: sin la medición, el apagado es a ciegas.
- Slices 2, 3 y 4 pueden ir juntos en un release, pero cada uno con su test.
- Slice 5 es independiente y puede diferirse si su decisión no está tomada.
- 🔴 **Esta task va antes que `TASK-1679`.** Ver §Why.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Un cliente pierde una superficie que usaba legítimamente | Portal cliente | Media | Slice 1 mide la lista antes de apagar; seed explícito donde corresponda | Reporte del script + verificación con personas |
| El cambio toca sin querer el portal interno | Portal interno | Media | El alcance es `view.routeGroup === 'client'`; test de no-regresión interno | Suite de `src/lib/admin` |
| El modo degradado deja a un cliente sin nada y nadie lo nota | Portal cliente | Baja | Señal nueva + `captureWithDomain` | Signal de claim degradado |
| Se rompe el login por un error en la derivación | Toda sesión | Baja | La derivación ya tiene `catch`; se conserva, cambia lo que devuelve | `/api/auth/health` |

### Feature flags / cutover

Sin flag. Un flag default-OFF sobre un fix de autorización crea un interruptor que hay que acordarse
de prender, y mientras esté OFF el fail-open sigue vivo con la falsa sensación de estar cerrado. La
verificación va **antes** de promover, con las tres personas agente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | Nada que revertir: el slice sólo lee y produce un reporte, no cambia runtime | — | sí |
| 2 | revert PR | <5 min | sí |
| 3 | revert PR | <5 min | sí |
| 4 | revert PR | <5 min | sí |
| 5 | revert PR | <5 min | sí |

### Production verification sequence

1. Persona cliente de Grupo Berel: su menú conserva los ítems que tenía, y `/growth/seo` sigue abriendo.
2. Persona cliente sin módulos: no gana ninguna superficie.
3. Persona colaborador interno: menú y accesos idénticos.
4. La señal de claim degradado en `0`.
5. `/api/auth/health` en 200.

### Out-of-band coordination required

Ninguna: sin secretos, sin env vars, sin redeploy de workers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una vista `cliente.*` sin fila en `role_view_assignments` **no** aparece en el claim de ningún cliente.
- [ ] Una vista interna sin fila sigue otorgándose por routeGroup (no-regresión del portal interno).
- [ ] Una asignación no vigente no cuenta.
- [ ] En modo degradado (`SCHEMA_NOT_READY`), un tenant `client` no recibe viewCodes module-gated.
- [ ] El `catch` de la derivación emite `captureWithDomain`, no `console.warn`.
- [ ] Existe una señal de claim degradado con steady = 0 y reader propio.
- [ ] El Slice 1 dejó por escrito qué viewCodes dependían del fallback permisivo y qué se decidió con cada uno.
- [ ] La decisión sobre los denials anulables quedó documentada, se implemente o no.
- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Verificado en runtime con las tres personas agente antes de promover.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/admin src/lib/tenant src/lib/entitlements`
- `pnpm test`
- Script de medición del Slice 1 contra PG real
- Verificación con las tres personas agente

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (`TASK-1679`, `TASK-1680`, `TASK-286`)
- [ ] `ISSUE-147` movida a `resolved/` con su §Resolución
- [ ] `CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md` actualizado con el defecto 1 cerrado

## Follow-ups

- `capability-modules-resolver-migration` — el bloque `businessLines`/`serviceModules` del menú cliente sigue derivando de la sesión y no del resolver. Sin ID desde mayo 2026.
- Tipar los identificadores (`ClientId` / `OrganizationId` como branded types) para cerrar la clase de bug de `ISSUE-146` en el compilador y no en un test.

## Open Questions

1. ¿Un `granted=FALSE` de un rol debe vencer sobre el `granted=TRUE` de otro rol del mismo usuario? Hoy no vence. Afecta qué significan los 5 denials sembrados. Propuesta: que venza, porque un denial explícito es una declaración más fuerte que un default heredado — pero es decisión del operador.
2. Si el Slice 1 encuentra vistas que dependen del fallback permisivo, ¿se seedean con `granted=TRUE` o se apagan? Depende de caso por caso y de si alguien las está usando hoy.
