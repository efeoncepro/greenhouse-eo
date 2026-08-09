# TASK-1679 — Que las páginas del portal cliente vuelvan a abrir

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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

## Estado real 2026-08-09 — ✅ `complete`, EN PRODUCCIÓN
**Promovida a producción el 2026-08-09** en el mismo release que `TASK-1678`
(`2c87d71e2eca`, manifest `2c87d71e2eca-f444748c-92aa-484c-b118-02713ee63e06`, run
`31335921151`, `released`, watchdog `drift_count=0`) — van juntas a propósito, así que la
contención del fail-open se retiró en el mismo instante en que el fail-open se cerró y no
hubo ventana de exposición. Verificado post-release contra la base que lee producción:
`scripts/identity/client-portal-page-access-check.ts` → 4 orgs × 9 rutas, **0 desvíos**,
3 abren y 6 empty state.

**Lo que sigue abierto y NO es código:** asignar `creative_hub_globe_v1` a Sky Airlines es lo
único que abre las 4 páginas Creative. Decisión comercial.


Los 7 slices están implementados y verificados en local. ~~No se mueve a `complete/`~~ (cerrada tras la promoción) porque el
criterio de aceptación exige verificación de runtime antes de promover, y esto no está en `main`.
Además va **después de `TASK-1678`** en la promoción, por el orden de contención.

- Verificación local: `scripts/identity/client-portal-page-access-check.ts` — resultado esperado por
  ruta declarado ANTES de correr, 4 organizaciones × 9 rutas, **0 desvíos**: 3 abren, 6 empty state.
- Migración `20260809192408303` aplicada en dev: la persona `agent-client` pasó de `organization_id`
  NULL a Greenhouse Demo, y la señal del Slice 1 quedó en **0**.
- Gates: `pnpm test` 10437/0 · `pnpm lint` 0 · `pnpm typecheck` 0 · `route-reachability-gate` 0
  huérfanas · parity TS↔DB de viewCodes verde **contra PG real** · `flags:audit --strict` 0 sin registrar.
- **Falta para cerrar:** promover (después de 1678), aplicar la migración en staging/producción y
  repetir el page-access-check contra producción.
- **Fuera de alcance, y es la parte que abre las 6 restantes:** asignar `creative_hub_globe_v1` a Sky
  Airlines. Decisión comercial sobre datos productivos.

## Recalibración 2026-08-09 — medido contra PG antes de implementar

Discovery contra PG invalidó tres premisas. Se corrigen acá antes de escribir código.

### 1. El Goal no era alcanzable con código. Hoy NINGUNA organización abre NINGUNA de las 9.

La spec decía que arreglar la llave «desbloquea 3 de las 9: las únicas cuyo viewCode está declarado
en algún módulo». Eso es cierto **a nivel de catálogo** y falso **a nivel de datos**: los módulos que
declaran `cliente.proyectos` / `cliente.campanas` / `cliente.equipo` / `cliente.reviews` son
`creative_hub_globe_v1` y `equipo_asignado`, y **nadie los tiene asignados**.

`module_assignments` tiene 7 filas en toda su historia, 5 vigentes:

| Organización | Módulos vigentes | De las 9 alcanza |
|---|---|---|
| Grupo Berel | `ai_visibility_v1`, `seo_v2` | ninguna |
| Sky Airlines | `ai_visibility_v1` | ninguna |
| Efeonce (su propia org) | `proposal_studio_v1`, `seo_v2` | ninguna |
| Greenhouse Demo | — | ninguna |
| ANAM | — | ninguna |

Arreglar la llave desbloquea **0** páginas con los datos de hoy, no 3.

**Goal corregido:** las 3 vistas base abren para todo cliente con `organizationId` resuelto; las 6
module-gated muestran el empty state correcto hasta que su módulo se asigne. Abrir las Creative es
**asignar `creative_hub_globe_v1` a Sky Airlines** — decisión comercial sobre datos productivos, y
queda fuera de esta task por eso. Decisión del operador 2026-08-09: Creative es de SKY y de nadie más.

### 2. La allowlist base baja de 5 a 3 vistas

Decisión del operador 2026-08-09, a la luz de que Creative es sólo de SKY: un cliente sin Creative no
tiene ciclos ni analytics que mostrar, así que dejarlos base sería darle páginas permanentemente
vacías.

| Vista | Antes | Ahora | Por qué |
|---|---|---|---|
| `cliente.notificaciones` | base | **base** | nadie contrata ver sus notificaciones |
| `cliente.configuracion` | base | **base** | configuración de la propia cuenta |
| `cliente.actualizaciones` | base | **base** | comunicación transversal, no producto |
| `cliente.ciclos` | base | **module-gated** | un ciclo de entrega es superficie de delivery |
| `cliente.analytics` | base | **module-gated** | reporting depende del servicio contratado |

Consecuencia: `cliente.ciclos` y `cliente.analytics` quedan sin módulo que las declare. Es el mismo
estado que las Creative — empty state honesto — y se resuelve declarándolas en el módulo que
corresponda, no en código.

### 3. La persona `agent-client` no servía, y ahora se construye para servir

`agent-client@greenhouse.efeonce.org` tiene `organization_id = NULL`: su `client_id`
(`agent-client-sandbox`) no tiene fila en `spaces`, y `session_360` deriva la organización por
`client_users.client_id → spaces (active) → organizations (active)`. Después del fix seguiría sin
entrar, pero por el camino "sin organización" — un tercer resultado distinto del empty state.

Decisión del operador 2026-08-09: que la persona pueda tomar la organización de cualquier cliente.
Se implementa con **cuatro condiciones independientes fail-closed** (flag env default-OFF · bloqueo
duro si `NODE_ENV=production` · allowlist de `user_id` de personas agente · `captureWithDomain` en
cada uso), y con un `space` propio que la resuelve por defecto a **Greenhouse Demo** (0 módulos), que
es la organización correcta para el caso empty state.

Riesgo aceptado y declarado: la credencial de esta persona está documentada en `CLAUDE.md`, así que
con el flag encendido esa credencial lee el portal de cualquier organización. Por eso el flag es
default-OFF, nunca producción, y cada uso queda en Sentry.

## Summary

**Nueve páginas del portal cliente no abren hoy.** Fallan por tres causas independientes, las tres en
el mismo guard: el `redirect()` del camino `denied` está dentro del `try`, así que su propio `catch` lo
intercepta; el guard usa `session.user.clientId` donde el resolver espera un `organizationId`
(`ISSUE-146`, afecta 3); y seis viewCodes de rutas vivas no están declarados en ningún módulo, lo que
en un resolver sin allowlist transversal significa denegar siempre. Esta task cierra las tres.

## Why This Task Exists

El síntoma es lo que lo mantuvo invisible. Verificado en producción el 2026-08-09 con la sesión real de
Grupo Berel: las nueve redirigen a `/home?error=resolver_unavailable`, o sea el banner de degradación
—"el servicio no está disponible"—, que es algo que un usuario reintenta en vez de reportar.

Y ese síntoma es en sí mismo un tercer defecto: el camino `denied` es **inalcanzable**, porque
`redirect()` de Next.js señaliza lanzando y la llamada está dentro del `try`. El empty state
`ModuleNotAssignedEmpty` que `TASK-827` diseñó con su anatomía de cinco elementos está muerto en
runtime, y **cada denegación legítima se reporta a Sentry como error del resolver**.

Dos de las nueve son especialmente caras. `/notifications` cuelga de la campanita del header, o sea la
ruta con más probabilidad de click accidental de todo el portal. Y `/settings` significa que un cliente
no puede entrar a su propia configuración de cuenta.

Va después de `TASK-1678` y no es preferencia: hoy el fail-open del claim está **contenido** por este
fail-closed. Arreglar el guard primero abre una ventana en la que el cliente ve el ítem y además entra.

## Goal

> Corregido 2026-08-09 — ver §Recalibración. El goal original («las 9 abren») no era alcanzable con
> código: 6 de las 9 dependen de módulos que ninguna organización tiene asignados.

- Las **3 vistas base** (`notificaciones`, `configuracion`, `actualizaciones`) abren para todo cliente
  con `organizationId` resuelto.
- Las **6 module-gated** muestran el empty state correcto en vez de el banner de degradación. Abrirlas
  es asignar su módulo, no cambiar código.
- El camino `denied` deja de ser inalcanzable, y una denegación legítima deja de reportarse a Sentry
  como falla del resolver.
- El guard deja de poder confundir espacios de identificadores, y eso queda fijado por un test.
- Existe una persona de verificación que puede recorrer el portal de cualquier organización, con el
  acceso gated por flag default-OFF, bloqueado en producción y auditado.

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

### Slice 2 — El `redirect()` fuera del `try`

- `redirect()` de Next.js señaliza lanzando `NEXT_REDIRECT`, y en `requireViewCodeAccess` la llamada
  del camino `denied` está **dentro** del `try`, así que el propio `catch` la intercepta. Verificado en
  producción el 2026-08-09: las páginas rebotan con `?error=resolver_unavailable`, nunca con `?denied=`.
- Consecuencias que este slice cierra: el empty state `ModuleNotAssignedEmpty` está muerto en runtime,
  y **cada denegación legítima se reporta a Sentry como error del resolver**.
- Va antes que el cambio de llave: mientras el `catch` se coma los redirects, no se puede distinguir
  "denegó" de "falló", que es justo lo que hay que observar al cambiar la llave.
- Revisar de paso el volumen acumulado en el dominio `client_portal` de Sentry — si hay ruido, ésta es
  la fuente.

### Slice 3 — La llave correcta

- `requireViewCodeAccess` usa `session.user.organizationId`.
- Sin `organizationId`: redirect con estado honesto **y** la señal del Slice 1 lo registra.
- Test de contrato que falle si alguien vuelve a pasar un `clientId`: fijar que el valor pasado al
  resolver empieza con el prefijo del espacio correcto, o tipar los identificadores como branded types
  (ver §Follow-ups).

### Slice 4 — Allowlist transversal de vistas base

- Las cinco vistas que el operador declaró portal base —`cliente.ciclos`, `cliente.analytics`,
  `cliente.actualizaciones`, `cliente.notificaciones`, `cliente.configuracion`— pasan a resolverse por
  una allowlist transversal junto al resolver, no por módulo.
- La allowlist es dato declarativo y auditable, no un `if` esparcido por las páginas.
- Test: un cliente sin ningún módulo contratado abre las cinco.

### Slice 5 — El desencuentro `revisiones` / `reviews`

- `/reviews` falla porque el guard pide `cliente.revisiones` y los módulos declaran `cliente.reviews`.
- Decidir cuál es el canónico y unificar, sin borrar el viewCode retirado del registry (append-only:
  se marca, no se elimina).
- Test que fije que la ruta y el viewCode que la gatea coinciden con lo que declara el módulo.

### Slice 6 — Verificación de las nueve

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

> Corregidos 2026-08-09 — ver §Recalibración.

- [ ] Las **3** vistas base abren para un cliente sin ningún módulo contratado, verificado en runtime.
- [ ] Las **6** module-gated muestran el empty state (`ModuleNotAssignedEmpty`), no el banner de
      degradación, y no emiten incidente a Sentry al denegar.
- [ ] El viewCode que gatea `/reviews` coincide con el que declara su módulo (`cliente.reviews`).
      Que la página **abra** depende de asignar `creative_hub_globe_v1`, fuera de alcance.
- [ ] La persona de verificación puede tomar la organización de cualquier cliente, y ese acceso está
      gated por flag default-OFF + bloqueo en producción + allowlist de persona + auditoría.
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
