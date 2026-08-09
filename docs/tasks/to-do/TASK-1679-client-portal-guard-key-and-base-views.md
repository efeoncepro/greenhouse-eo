# TASK-1679 — Que las páginas del portal cliente vuelvan a abrir

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
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
- Blocked by: `TASK-1678`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

**Nueve páginas del portal cliente no abren hoy.** Fallan por dos causas independientes: el guard usa
`session.user.clientId` donde el resolver espera un `organizationId` (`ISSUE-146`, afecta 3), y seis
viewCodes de rutas vivas no están declarados en ningún módulo, lo que en un resolver sin allowlist
transversal significa denegar siempre. Esta task cierra las dos.

## Why This Task Exists

El síntoma es lo que lo mantuvo invisible: ninguna de las nueve produce un error. Todas redirigen a
`/home?denied=<slug>` con el empty state `ModuleNotAssignedEmpty`, una pantalla honesta y bien escrita
que dice que la organización no tiene ese módulo. **Un fallo de plataforma se ve exactamente igual que
una decisión comercial**, y nadie escala eso.

Dos de las nueve son especialmente caras. `/notifications` cuelga de la campanita del header, o sea la
ruta con más probabilidad de click accidental de todo el portal. Y `/settings` significa que un cliente
no puede entrar a su propia configuración de cuenta.

Va después de `TASK-1678` y no es preferencia: hoy el fail-open del claim está **contenido** por este
fail-closed. Arreglar el guard primero abre una ventana en la que el cliente ve el ítem y además entra.

## Goal

- Las 9 páginas abren para un cliente cuya organización corresponde.
- Una organización sin el módulo sigue viendo el empty state — el fail-closed legítimo no se toca.
- El guard deja de poder confundir espacios de identificadores, y eso queda fijado por un test.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (§12.1 menú module-driven, §12.2 guard)
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md`

Reglas obligatorias:

- **NUNCA** aflojar el fail-closed para "destrabar" una página: si una organización no tiene el módulo,
  el empty state es el comportamiento correcto y se conserva.
- **NUNCA** resolver la allowlist de vistas base leyendo `role_view_assignments`: sería reintroducir
  el carril viejo por la puerta que esta familia de tasks vino a cerrar.
- **NUNCA** escribir `module_assignments` desde el guard: es read-only.
- **SIEMPRE** que el guard cambie de llave, cubrir que la llave nueva es nullable (ver §Detailed Spec).

## Normative Docs

- `docs/issues/open/ISSUE-146-client-portal-view-code-guard-passes-client-id-as-organization-id.md` — la llave equivocada, con su corrección de alcance
- `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md` — las 9 páginas, sus dos causas y el orden
- `docs/tasks/complete/TASK-1675-client-portal-menu-module-driven.md` — cerró el mismo desencuentro en el menú

## Dependencies & Impact

### Depende de

- `TASK-1678` — **bloqueante**, por el orden de contención
- `hasViewCodeAccess` / `resolveClientPortalModulesForOrganization` en `src/lib/client-portal/readers/native/module-resolver.ts` — existen
- `session.user.organizationId` — existe, pero es nullable y best-effort (ver §Detailed Spec)

### Impacta a

- Las 9 páginas cliente que usan `requireViewCodeAccess`
- `TASK-1675` — su cableado del menú asume que la página abre cuando el ítem aparece; hoy esa promesa está rota para todas menos `/growth/seo`
- `TASK-1388` (vertical menu restructure) — toca el menú que ofrece estas rutas
- `TASK-286` (client view catalog expansion) — su modelo de capabilities finas sobre el carril de views compite con la dirección de esta task; coordinar antes de tomar cualquiera de las dos

### Files owned

- `src/lib/client-portal/guards/require-view-code-access.ts`
- `src/lib/client-portal/readers/native/module-resolver.ts` (la allowlist transversal)
- `src/lib/admin/view-access-catalog.ts` (el desencuentro `cliente.revisiones` / `cliente.reviews`)
- `src/lib/reliability/queries/` (signal de organización no resuelta)
- Tests de los anteriores [verificar paths reales]

## Current Repo State

### Already exists

- `requireViewCodeAccess` con su redirect canónico y `mapViewCodeToPublicSlug`
- `hasViewCodeAccess(organizationId, viewCode)` resolviendo contra `module_assignments`
- El patrón de signal `identity.workforce.unlinked_internal_user`
- `/growth/seo` como prueba de que el camino correcto funciona: usa `organizationId` y no este guard

### Gap

- `require-view-code-access.ts:63` asigna `session.user.clientId` a una variable llamada
  `organizationId`. Los espacios no se solapan: `cli-*`, `hubspot-company-*` y
  `greenhouse-demo-client` contra `org-*`. Medido contra `session_360`.
- `hasViewCodeAccess` resuelve con `modules.some(m => m.viewCodes.includes(viewCode))` y **no tiene
  allowlist transversal**: un viewCode que ningún módulo declara deniega siempre.
- Seis viewCodes de rutas vivas están en esa situación: `cliente.ciclos`, `cliente.revisiones`,
  `cliente.analytics`, `cliente.actualizaciones`, `cliente.notificaciones`, `cliente.configuracion`.
- `cliente.revisiones` y `cliente.reviews` son dos viewCodes distintos apuntando a `/reviews` en el
  `VIEW_REGISTRY`; el guard pide el primero y los módulos declaran el segundo.
- `session.user.organizationId` es nullable y best-effort: sale de `session_360` por el puente
  `spaces` (activo) → `organizations` (activa), sin backfill ni señal, y el carril de fallback
  BigQuery ni siquiera selecciona la columna.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/client-portal/**`, runtime Vercel
- Future candidate home: `remain-shared`
- Boundary: el guard sigue consumiendo el resolver canónico por su primitive pública; la allowlist de
  vistas base vive junto al resolver, no en cada página
- Server/browser split: server-only puro; el guard corre en server components
- Build impact: `none`
- Extraction blocker: `routing` — el guard se invoca desde el árbol de rutas de Next.js

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_client_portal.module_assignments` (solo lectura) + `session_360`
- Consumidores afectados: las 9 páginas cliente que usan el guard
- Runtime target: `local` + `staging` + `production`

### Contract surface

- Contrato existente a respetar: `requireViewCodeAccess(viewCode): Promise<void>` — la firma no cambia
- Contrato nuevo o modificado: la allowlist de vistas base del portal, junto al resolver
- Backward compatibility: `compatible` en forma; **cambia el comportamiento** de denegar a permitir
  para clientes con organización resuelta. Ése es el objetivo.
- Full API parity: la allowlist es dato del dominio consumido por una primitive server-side, no una
  condición repetida en cada página

### Data model and invariants

- Entidades afectadas: `greenhouse_client_portal.module_assignments` (SELECT), `greenhouse_serving.session_360` (SELECT)
- Invariantes que no se pueden romper:
  - el guard es read-only sobre `module_assignments`
  - una organización sin el módulo sigue viendo el empty state
  - la allowlist de vistas base **no** se resuelve leyendo `role_view_assignments`
  - un cliente sin `organizationId` resuelto no obtiene acceso por omisión
- Tenant/space boundary: `session.user.organizationId` → `module_assignments.organization_id`
- Idempotency/concurrency: read-only puro
- Audit/outbox/history: `none` para el read path; la señal nueva es el rastro

### Migration, backfill and rollout

- Migration posture: `none` si la allowlist vive en código. Si se decide que las vistas base sean un
  módulo base sembrado, pasa a `seed` — ver §Open Questions.
- Default state: `enabled with rationale` — es un fix de disponibilidad de páginas hoy rotas; un flag
  default-OFF dejaría el portal roto con un interruptor más que recordar.
- Backfill plan: `n/a` salvo que se elija la variante de módulo base
- Rollback path: `revert PR + redeploy`
- External coordination: ninguna

### Security and access

- Auth/access gate: `requireServerSession` + el resolver per-org; el bypass interno (`tenantType === 'efeonce_internal'`) se conserva
- Sensitive data posture: `no sensitive data` — identificadores y viewCodes
- Error contract: `captureWithDomain` en el camino degradado del resolver
- Abuse/rate-limit posture: `none with rationale` — superficie autenticada

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/client-portal`, `pnpm local:check`
- DB/runtime checks: verificar contra PG que la persona de Berel tiene `organizationId` resuelto y su assignment vigente
- Integration checks: `pnpm fe:capture` navegando cada una de las 9 rutas con la persona de Berel
- Reliability signals/logs: señal nueva de cliente activo sin `organizationId` resuelto, steady 0
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

### Slice 1 — La señal antes que el fix

- Signal de cliente activo sin `organizationId` resuelto (patrón `identity.workforce.unlinked_internal_user`).
- Va primero a propósito: el Slice 2 cambia el modo de fallo de "deniega a todos" a "deniega a los que
  no tienen la columna poblada". Sin la señal, ese segundo modo también es silencioso.

### Slice 2 — La llave correcta

- `requireViewCodeAccess` usa `session.user.organizationId`.
- Sin `organizationId`: redirect con estado honesto **y** la señal del Slice 1 lo registra.
- Test de contrato que falle si alguien vuelve a pasar un `clientId`: fijar que el valor pasado al
  resolver empieza con el prefijo del espacio correcto, o tipar los identificadores como branded types
  (ver §Follow-ups).

### Slice 3 — Allowlist transversal de vistas base

- Las cinco vistas que el operador declaró portal base —`cliente.ciclos`, `cliente.analytics`,
  `cliente.actualizaciones`, `cliente.notificaciones`, `cliente.configuracion`— pasan a resolverse por
  una allowlist transversal junto al resolver, no por módulo.
- La allowlist es dato declarativo y auditable, no un `if` esparcido por las páginas.
- Test: un cliente sin ningún módulo contratado abre las cinco.

### Slice 4 — El desencuentro `revisiones` / `reviews`

- `/reviews` falla porque el guard pide `cliente.revisiones` y los módulos declaran `cliente.reviews`.
- Decidir cuál es el canónico y unificar, sin borrar el viewCode retirado del registry (append-only:
  se marca, no se elimina).
- Test que fije que la ruta y el viewCode que la gatea coinciden con lo que declara el módulo.

### Slice 5 — Verificación de las nueve

- Recorrer las 9 rutas con la persona de Berel y con una persona cliente sin módulos.
- Evidencia GVC o smoke, con el resultado esperado por ruta declarado antes de correr.

## Out of Scope

- La derivación de `authorizedViews` — es `TASK-1678`, y va antes.
- Promover el lint a `error` — es `TASK-1680`.
- Rediseñar el modelo de capabilities del portal cliente (`TASK-286`).
- El menú: `TASK-1675` ya lo cableó; esta task arregla la puerta, no la vitrina.
- `capability-modules-resolver-migration`.

## Detailed Spec

**Por qué el fix de la llave no alcanza.** `ISSUE-146` proponía cambiar `clientId` por
`organizationId`, y eso desbloquea **3** de las 9 páginas: las únicas cuyo viewCode está declarado en
algún módulo (`cliente.proyectos`, `cliente.campanas`, `cliente.equipo`). Las otras 6 fallan porque
`hasViewCodeAccess` pregunta si **algún módulo declara** ese viewCode, y ninguno lo hace. Cambiar la
llave de la organización las deja exactamente igual de cerradas.

**Por qué la allowlist y no un módulo base.** Un cliente no contrata "poder ver sus notificaciones" ni
"entrar a su configuración de cuenta". Modelar eso como módulo obliga a asignárselo a cada organización
nueva y a que alguien se acuerde — y el día que alguien no se acuerde, el cliente pierde su
configuración. Una allowlist transversal declara lo que es cierto: hay superficies del portal que no
son un producto vendible. La variante de módulo base queda registrada en §Open Questions porque tiene
un argumento a favor (auditabilidad por organización) que merece discusión, no descarte silencioso.

**El modo de fallo se mueve, no desaparece.** `session.user.organizationId` es nullable: sale de
`session_360` por el puente `spaces` (activo) → `organizations` (activa), sin backfill ni señal, y el
carril de fallback BigQuery ni siquiera selecciona la columna. Después del Slice 2, un cliente sin esa
columna poblada sigue sin entrar — sólo que ahora por una razón distinta y más acotada. Por eso el
Slice 1 va primero: convierte ese caso en algo observable en vez de otro fallo mudo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **La task entera va después de `TASK-1678`.** Ver §Why.
- Slice 1 **antes** que Slice 2: la señal tiene que existir cuando el modo de fallo se mueve.
- Slices 3 y 4 pueden ir en paralelo entre sí, pero después del 2.
- Slice 5 al final, sobre el estado ya construido.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Se abre una página a quien no corresponde | Portal cliente | Baja | La allowlist es explícita y acotada a 5 vistas declaradas por el operador; el resto sigue module-gated | Verificación con persona sin módulos |
| Un cliente sin `organizationId` sigue sin entrar y nadie lo nota | Portal cliente | Media | Slice 1 primero | Señal de organización no resuelta |
| El desencuentro `revisiones`/`reviews` se resuelve borrando un viewCode | Governance de vistas | Media | El registry es append-only: se marca, no se elimina | Parity test del registry |
| Se rompe el bypass interno y un operador pierde acceso | Portal interno | Baja | El bypass `tenantType === 'efeonce_internal'` no se toca; test de no-regresión | Suite de `src/lib/client-portal` |
| Llega antes que `TASK-1678` y abre la ventana de exposición | Portal cliente | Media | `Blocked by` declarado; verificar en el preflight del release que 1678 ya está en `main` | Orden de los manifests |

### Feature flags / cutover

Sin flag. Son páginas rotas hoy: un flag default-OFF las dejaría rotas y agregaría un interruptor que
recordar. La verificación va antes de promover, con las dos personas cliente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert PR (la señal se apaga) | <5 min | sí |
| 2 | revert PR (vuelve a `clientId`, o sea al estado roto conocido) | <5 min | sí |
| 3 | revert PR (las 5 vuelven a denegar) | <5 min | sí |
| 4 | revert PR | <5 min | sí |
| 5 | Nada que revertir: sólo produce evidencia | — | sí |

### Production verification sequence

1. Confirmar que `TASK-1678` ya está en `main`.
2. Persona cliente de Grupo Berel: las 9 rutas abren.
3. Persona cliente sin módulos: las 5 base abren; las module-gated siguen mostrando el empty state.
4. Persona colaborador interno: el bypass sigue funcionando.
5. La señal de organización no resuelta en `0`.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 9 páginas abren para un cliente cuya organización corresponde, verificado en runtime.
- [ ] Una organización sin el módulo sigue viendo el empty state en las module-gated.
- [ ] Las 5 vistas base abren para un cliente sin ningún módulo contratado.
- [ ] `/reviews` abre, y el viewCode que la gatea coincide con el que declara su módulo.
- [ ] El guard usa `organizationId`, y existe un test que falla si alguien vuelve a pasar un `clientId`.
- [ ] Un cliente sin `organizationId` resuelto no obtiene acceso por omisión, y la señal lo registra.
- [ ] La allowlist de vistas base no consulta `role_view_assignments`.
- [ ] Ningún viewCode se borró del `VIEW_REGISTRY` (append-only).
- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] `TASK-1678` está en `main` antes de promover ésta.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/client-portal`
- `pnpm test`
- `pnpm route-reachability-gate`
- Recorrido de las 9 rutas con las dos personas cliente

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (`TASK-1675`, `TASK-1678`, `TASK-1680`, `TASK-1388`, `TASK-286`)
- [ ] `ISSUE-146` movida a `resolved/` con su §Resolución
- [ ] §12.2 de `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` refleja el guard real y la allowlist
- [ ] `CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md` actualizado con los defectos 2 y 3 cerrados

## Follow-ups

- Tipar los identificadores (`ClientId` / `OrganizationId` como branded types). Cierra la clase entera de bug en el compilador en vez de en un test, y esta task es la evidencia de que hace falta.
- Reforzar el gate de alcanzabilidad de rutas: hoy es role-blind — prueba que el `href` existe en el código, no que un cliente pueda verlo ni entrar.
- El shortcut `client-portal` ofrece `/proyectos` con un gate derivado de roles: el mismo bug que `TASK-1675` cerró en el menú, por otra puerta.

## Open Questions

1. ¿Las 5 vistas base van a allowlist transversal en código o a un módulo base sembrado por organización? El operador decidió que son portal base; falta elegir la forma. La allowlist es más simple y no puede olvidarse; el módulo base es auditable por organización y encaja con el resto del modelo. Propuesta: allowlist, y si más adelante hace falta auditar por organización, se migra.
2. ¿Cuál es el viewCode canónico de `/reviews`: `cliente.revisiones` o `cliente.reviews`? Los módulos declaran el segundo; el guard y el menú usan el primero. Propuesta: `cliente.reviews`, porque cambiar el dato sembrado es más caro que cambiar dos referencias en código.
