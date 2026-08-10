# TASK-1685 — Un solo primitive para "¿esta persona puede ver esta vista?"

## Delta 2026-08-10

- **TASK-1388 entró primero** (code complete en develop): reestructuró la rama INTERNA de
  `VerticalMenu.tsx` en 3 zonas y consolidó el ⌘K. La rama no-interna quedó **intacta en visibilidad**
  (test de identidad verde); su único cambio es de forma: la sección "Mi Ficha" del colaborador ahora se
  construye con el builder compartido `src/lib/navigation/my-nav-items.ts` (mismos viewCodes, mismos
  fallbacks). Punto de extensión limpio para el Slice 2 de esta task: si el primitive de visibilidad
  reemplaza `canSeeView`, el builder recibe el predicado por parámetro en un solo lugar.
- El ⌘K consolidado (`GlobalCommandPalette`) filtra por `routeGroup + authorizedViews` client-side —
  consumidor natural del primitive cuando exista.
- **TASK-1686 ejecutada (2026-08-10, mismo día):** la rama no-interna ahora bifurca con
  `isPureCollaborator` (my && !internal && !client) — el colaborador puro tiene proyección propia
  (rail personal + avatar de 3 gestos) y el carril client quedó byte-equivalente (tests de control en
  `VerticalMenu.test.tsx` + `UserDropdown.test.tsx`). El Slice 2 de esta task hereda TRES consumers
  del predicado de visibilidad: la rama client, la rama collaborator (vía `buildMyNavItems`) y el ⌘K.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
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

Hoy no existe un primitive que responda **"¿esta persona puede ver esta vista?"**: la respuesta vive
repartida entre el menú (que aplica el rol para 6 enlaces) y el page guard (que aplica el módulo). La
puerta lee **uno de los tres** insumos disponibles, así que un denial de rol y un `revoke` per-persona
son ambos decorativos ahí. Esta task decide la semántica y la materializa en un solo lugar.

> ✅ **DECISIÓN TOMADA 2026-08-10** (operador, delegada a `arch-architect` + overlay del repo). Semántica
> **(a′)**: el módulo autoriza, el `revoke` per-persona cierra, y **el menú consume el mismo predicado que
> la puerta**. Rationale completo, medición y alternativas rechazadas en §Slice 1 más abajo.

## Why This Task Exists

Salió de una pregunta del operador el 2026-08-09, después de cerrar `TASK-1678`/`1679`/`1680`:
*"¿rol y módulo no son excluyentes? ¿por qué tienen que serlo?"*

La pregunta desarmó el framing con que se cerró esa familia de tasks. Rol y módulo **no** son
alternativas: son dimensiones ortogonales —organización vs. persona— y el sistema tiene tablas para las
dos. Lo que se escribió ("la puerta es el módulo", "`role_view_assignments` no es el carril de una vista
cliente") es demasiado fuerte, y al presentarlas como alternativas **tapó** que ninguna de las dos se
aplica de punta a punta.

Vale registrar por qué esta task existe y no se resolvió en el momento: la medición mostró que el fix
intuitivo —sumar el `AND` en la puerta— es **el peor de los caminos disponibles**, porque cambia un
control decorativo por un cliente bloqueado en silencio. Eso convirtió un "arreglo de una línea" en una
decisión de producto, y el operador decidió tomarla en sesión fresca en vez de al final de una sesión
larga. La decisión es de él; esta task le deja el análisis hecho.

## Goal

- Existe **un** primitive que responde la pregunta, y tanto el menú como la puerta lo consumen.
- Lo que el menú muestra y lo que la puerta abre **coinciden**, con una señal cuando divergen.
- La dimensión persona es enforceable, no sólo presentacional.
- **Ningún cliente pierde una superficie que su organización contrató.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (§12.1 menú, §12.2 guard)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (§8.2)
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (VIEW+helper+signal)

Reglas obligatorias:

- **NUNCA** cerrar una vista que la organización contrató para "ganar coherencia": el modo de fallo
  aceptable es que alguien vea algo de más, **nunca** que un cliente pierda lo pagado.
- **NUNCA** exigir un **grant** per-rol en la puerta sin sembrar antes: convierte cada assignment
  comercial en un cambio de dos tablas, y eso deriva (el default permisivo de `role_view_assignments`
  existía justamente porque la gente olvida sembrar).
- **NUNCA** dejar la respuesta repartida entre menú y guard: si el resultado del Slice 2 no es un solo
  primitive consumido por los dos, la task no cumplió su goal.
- **SIEMPRE** medir contra PG antes de cambiar la semántica de la puerta: hay 24 pares usuario × vista
  concedidos por módulo hoy y la lista cambia con cada assignment.

## Normative Docs

- `docs/issues/open/ISSUE-148-client-portal-role-and-module-neither-enforced-end-to-end.md` — el hallazgo completo, con la medición y el mapa de qué se aplica dónde
- `docs/tasks/complete/TASK-1678-authorized-views-derivation-fails-closed.md` — §Slice 5, la decisión de la unión entre roles (sigue vigente; su rationale es el que esta task revisa)
- `docs/tasks/complete/TASK-1679-client-portal-guard-key-and-base-views.md` — el guard y las vistas base

## Dependencies & Impact

### Depende de

- `src/lib/client-portal/guards/require-view-code-access.ts` — el guard; lee sólo el módulo
- `src/lib/client-portal/readers/native/module-resolver.ts` — `hasViewCodeAccess` + `CLIENT_PORTAL_BASE_VIEW_CODES`
- `src/lib/tenant/authorization.ts` — `hasAuthorizedViewCode` (el carril de rol del menú)
- `src/lib/admin/view-access-store.ts` — `resolveAuthorizedViewsForUser`, donde se aplican los `user_view_overrides`
- `src/components/layout/vertical/VerticalMenu.tsx` + `src/app/(dashboard)/layout.tsx` — las dos fuentes del menú

### Impacta a

- Las 9 páginas guardadas del portal cliente
- `TASK-286` (client view catalog expansion) — su modelo de capabilities finas sobre el carril de views
  se solapa con esta decisión; **coordinar antes de tomar cualquiera de las dos**
- `TASK-1388` (vertical menu restructure) — toca `VerticalMenu.tsx`
- El follow-up sin ID `capability-modules-resolver-migration`

### Files owned

- `src/lib/client-portal/guards/require-view-code-access.ts`
- el primitive nuevo (ubicación a decidir en el Slice 1; candidato: `src/lib/client-portal/composition/`)
- `src/lib/reliability/queries/` (señal de divergencia menú↔puerta)
- `project_context.md` + los 2 companions + `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12.2 +
  `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` §8.2 — corregir el framing de "un carril gana"
- los docs funcionales y manuales del portal cliente que heredaron ese framing

## Current Repo State

### Already exists

- Los tres insumos: `module_assignments`, `role_view_assignments`, `user_view_overrides` (este último con `reason` y `expires_at`)
- El resolver canónico de módulos con cache per-org
- El merge aditivo del menú (`TASK-1675`) y la allowlist de 3 vistas base (`TASK-1679`)
- La medición completa de los 24 pares y los 6 en conflicto (`ISSUE-148`)

### Gap

- La puerta lee **uno** de los tres insumos. Un denial de rol y un `revoke` per-persona no la cierran.
- No hay primitive único; la respuesta está repartida entre menú y guard.
- No hay señal de divergencia menú↔puerta, que es el invariante que hoy no se sostiene.
- La intención de los 9 denials de rol **no está registrada** en ninguna parte. La evidencia sugiere
  curación de menú, pero es inferencia (ver `ISSUE-148` §"Qué intención tenían").

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/client-portal/**` + `src/lib/tenant/authorization.ts`, runtime Vercel
- Future candidate home: `remain-shared`
- Boundary: el primitive nuevo es la **única** respuesta a la pregunta; menú y guard pasan a ser
  consumers. No se crea un tercer carril ni se duplica la lógica en la UI.
- Server/browser split: server-only puro
- Build impact: `none`
- Extraction blocker: `routing` — el guard se invoca desde el árbol de rutas de Next.js

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader`
- Source of truth afectado: `module_assignments` + `role_view_assignments` + `user_view_overrides` (los tres, solo lectura)
- Consumidores afectados: las 9 páginas guardadas + el menú del portal cliente
- Runtime target: `local` + `staging` + `production`

### Contract surface

- Contrato existente a respetar: `requireViewCodeAccess(viewCode): Promise<void>` — la firma no cambia
- Contrato nuevo: el primitive de visibilidad; su forma la decide el Slice 1
- Backward compatibility: **`gated`** — cambia quién puede abrir qué. Es lo que obliga a medir antes.
- Full API parity: el primitive es server-side y compartido; el menú y la puerta son dos consumers del
  mismo, no dos implementaciones

### Data model and invariants

- Entidades afectadas: las tres tablas, SELECT only
- Invariantes que no se pueden romper:
  - ningún cliente pierde una superficie que su organización contrató
  - lo que el menú muestra y lo que la puerta abre coinciden
  - `role_view_assignments` sigue append-only; los denials se marcan, no se borran
  - el bypass interno (`tenantType === 'efeonce_internal'`) se conserva
- Tenant/space boundary: `session.user.organizationId` → `module_assignments.organization_id`
- Idempotency/concurrency: read-only puro
- Audit/outbox/history: `none` para el read path; la señal nueva es el rastro

### Migration, backfill and rollout

- Migration posture: `none` si la decisión es "el rol no gatea la puerta"; **`seed`** si es la conjunción
  (habría que sembrar los grants de los 6 pares medidos ANTES de activar)
- Default state: a decidir en el Slice 1. Un flag default-OFF es defendible acá —al contrario que en
  `TASK-1678`— porque el cambio puede **quitar** acceso y conviene un shadow mode que mida antes de
  cerrar.
- Backfill plan: depende de la decisión; si es conjunción, seed explícito de los 6 pares
- Rollback path: `revert PR + redeploy`
- External coordination: ninguna

### Security and access

- Auth/access gate: es el propio gate
- Sensitive data posture: `no sensitive data` — viewCodes e identificadores
- Error contract: `captureWithDomain` en el camino degradado; los 4 destinos del guard no cambian
- Abuse/rate-limit posture: `none with rationale` — superficie autenticada

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/client-portal src/lib/tenant src/lib/admin`, `pnpm local:check`
- DB/runtime checks: la medición de los 24 pares, **antes y después**
- Integration checks: las 9 rutas × las personas agente contra staging **y** producción
  (`scripts/identity/client-portal-page-access-check.ts` ya deriva su expectativa de los datos)
- Reliability signals/logs: señal de divergencia menú↔puerta, steady 0
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

### Slice 1 — La decisión (TOMADA 2026-08-10)

> Lo que sigue es el registro de la decisión. El análisis previo de las tres opciones se conserva
> más abajo porque es la evidencia sobre la que se decidió, no historia muerta.

#### Medición de baseline (contra PG real, 2026-08-10)

Reproduce ISSUE-148 y agrega tres hechos que el hallazgo no tenía:

| Hecho | Valor | Consecuencia |
|---|---|---|
| Pares usuario × vista por módulo | 24 | idéntico a ISSUE-148 |
| Pares sin grant de rol | 6 | idéntico a ISSUE-148 |
| **Divergencia menú → puerta** (menú promete, puerta niega) | **36 pares, 8 de 8 usuarios** | el daño vivo |
| **Divergencia puerta → menú** (alcanzable sólo por URL) | **0** | el merge aditivo de `TASK-1675` repone todo ítem de módulo |
| Filas en `user_view_overrides` | **0** | el instrumento per-persona nunca se usó |
| Usuarios `client_specialist`-only | **0** | los 3 denials de `TASK-285` no afectan a nadie hoy |

Los 36 son la **lista base del menú**, que se gatea por rol e ignora el módulo: ANAM y Greenhouse Demo
no tienen ningún módulo y sus 4 usuarios ven 6 enlaces muertos cada uno; los 3 usuarios reales de Sky
Airlines ven "Ciclos" y "Analytics" muertos. Ninguno de los 36 es alcanzable: todos terminan en
`/home?denied=…`.

**Corrección a ISSUE-148:** el hallazgo dice que el hueco "va en las dos direcciones". Medido, la
segunda dirección es **0**. La dirección que existe y duele es la contraria a la que el hallazgo
enfatiza.

#### D1 — Semántica elegida: **(a′)** — (a) extendida al menú

```
acceso(persona, vista) =
    esSesiónInterna                                        → true          (bypass D1, se conserva)
  ∨ ( ¬revocadaParaLaPersona(vista)
      ∧ ( esVistaBase(vista) ∨ laOrgTieneUnMóduloQueLaDeclara(vista) ) )
```

Un solo predicado puro. El page guard, la lista base del menú y el ⌘K pasan a ser **consumers**;
ninguno vuelve a resolver por su cuenta.

**Por qué (a′) y no (a) literal.** (a) tal como estaba redactada arregla la puerta, pero la puerta ya
coincide con el menú en los 24 pares del módulo. Lo que diverge son los 36 de la lista base, que (a)
no toca. Implementar (a) literal dejaría la señal del Slice 3 naciendo en 36 y el criterio de
aceptación *"lo que el menú muestra y lo que la puerta abre coinciden"* incumplido. Extender el
predicado al menú **no es scope creep**: es textualmente el criterio de aceptación de esta task
(*"el guard y la composición del menú lo consumen"*).

**Rechazadas.** **(b) conjunción con grant per-rol** — cerraría los 6 pares medidos (superficies que
Sky y Berel contrataron), convierte cada assignment comercial en un cambio de dos tablas, y su modo
de fallo es *"el cliente pagó y no entra, en silencio"*; además no arregla ninguno de los 36.
**(c) statu quo** — deja 36 enlaces muertos vivos y conserva la ambigüedad que originó el hallazgo.

**Sin feature flag, y es decisión deliberada.** El patrón canónico *flag default-OFF + shadow + flip*
existe para cambios que pueden quitar acceso. Acá está medido que no lo hacen: el lado puerta sólo
agrega la condición de `revoke` sobre una tabla **vacía** (delta de acceso = 0 exacto), y el lado menú
sólo deja de mostrar enlaces que **ya no abrían**. Un flag agregaría un segundo camino de código y un
paso de rollout para un delta medido de cero. Rollback = `revert PR + redeploy`, <5 min.

**La lista base conserva su presentación.** Cambia **quién decide su visibilidad**, no cómo se ve:
label con subtítulo, icono y href siguen donde están. Reemplazarla por ítems del composer habría
perdido los subtítulos y habría dependido de que `VIEW_CODE_NAV_DESCRIPTOR` cubriera cada viewCode —
riesgo de que Sky **pierda** ítems, que es exactamente lo prohibido.

**Ubicación del primitive:** `src/lib/client-portal/visibility/` (no `composition/`, que es
presentación). El split puro/server replica el precedente canonizado
`menu-builder-shape.ts` ↔ `menu-builder.ts`: el menú y el ⌘K son Client Components y no pueden
importar `server-only`.

#### D2 — Los 9 denials de rol: retirados en efecto, ninguna fila borrada

**La intención estaba escrita**; no hizo falta inferirla ni preguntarla. Está en las propias
migraciones, y dice **dos cosas distintas** — conflatarlas es lo que hacía la pregunta difícil:

- **6 denials** (`migration:TASK-1310`, 2026-08-08, `growth_seo_dashboard` + `growth_seo_report` × 3
  roles) — la migración lo declara literalmente: *"Estos códigos son module-gated. Persistir denials
  explícitos evita que **el fallback del route group** los convierta en visibilidad por rol."* No son
  negación de acceso: son **plomería defensiva contra el default permisivo**. Ese default ya no
  existe — `TASK-1678` lo invirtió para el routeGroup `client`. Quedaron vestigiales por
  construcción: bajo el default invertido, `granted=FALSE` y *"sin fila"* son **semánticamente
  idénticos** para una vista `cliente.*`.
- **3 denials** (`migration:TASK-285`, 2026-04-16, `client_specialist` pierde `analytics`, `campanas`,
  `equipo`) — *"Differentiates client_specialist from client_executive / client_manager"*, con
  `revoke_role` en `view_access_log` y referencia a §12.5 de la arquitectura. Eso **sí** era intención
  de producto per-rol.

**Decisión:** bajo (a′) el carril de rol deja de gobernar `cliente.*` por completo. Verificado que
**ningún** API route ni reader gatea vistas cliente por `authorizedViews`, así que apagarlo no tiene
más consecuencias que el menú y el ⌘K, que pasan al primitive. Las 9 filas **no se borran**
(`role_view_assignments` es append-only por invariante de esta task); quedan inertes, y la intención
recuperada se escribe en `view_access_log` vía migración.

**Lo que Efeonce renuncia, dicho explícitamente para que no se pierda en silencio:** la
diferenciación per-rol del portal cliente (el intento de `TASK-285`) queda sin carril. Hoy no afecta a
nadie — no existe ningún usuario `client_specialist`-only. Cuando exista un caso real, el instrumento
es **`user_view_overrides` per-persona** (ya existe, con `reason` y `expires_at`, y la puerta lo honra
desde esta task), **NUNCA** un deny per-rol: un deny per-rol sobre una vista que el módulo concede
reintroduce la paradoja de que *ganar un rol te quita acceso*, porque el rol es un conjunto que se
acumula. El seam para agregarlo está nombrado en el primitive; no se implementa ahora porque no hay
un solo consumidor que lo ejercite y un input que nadie ejerce deriva.

#### D3 — `/creative-hub`: retirar el viewCode del bundle, en task hermana

No entra en esta task. `greenhouse_client_portal.modules` es append-only
(`modules_append_only_check`), así que retirar `cliente.creative_hub` exige un `creative_hub_globe_v2`
+ supersede de la asignación de SKY: es un cambio de **catálogo comercial**, no de semántica de
autorización. Mezclarlos haría que un revert de esta task tocara el bundle de un cliente. SKY conserva
`creative_hub_globe_v1` íntegro y sus otras 5 vistas — **nunca** se le quita el módulo. La señal
`identity.client_portal.assigned_view_without_route` lo sigue nombrando en 1 mientras tanto, que es el
comportamiento honesto que esa señal fue diseñada para dar.

#### Relación con `TASK-286` — resuelta, sin trabajo pendiente

Ya está coordinada: `TASK-286` tiene su `## Delta 2026-08-09` que la bloquea explícitamente hasta esta
decisión. Con (a′) tomada, la respuesta para esa task es: **el carril de views por rol no gobierna
vistas `cliente.*`**, así que registrar 10 viewCodes nuevos + sembrar grants per-rol no produce acceso.
Si esas 10 superficies deben ser alcanzables, el carril es **declararlas en el módulo que las vende**.
La decisión queda escrita en su Delta al cerrar esta task.

---

<details>
<summary>Análisis previo de las tres opciones (evidencia sobre la que se decidió)</summary>

Las tres opciones, con su análisis original:

**(a) El rol NO gatea la puerta; la dimensión persona se expresa con `revoke`.**

```
acceso = (vista base  O  laOrgTieneElMóduloQueLaDeclara)  Y  NO personaRevocada(vista)
```

El módulo autoriza (hecho de la organización); el `user_view_overrides` con `override_type='revoke'`
excluye a una persona concreta; el rol queda como **curación de menú**, explícitamente presentacional.
No cierra nada contratado y no exige sembrar nada. Obliga a retirar o convertir los 9 denials de rol,
porque prometen un control que no existe. **Recomendación del análisis de 2026-08-09**, por la asimetría
grant/deny: un grant obliga a sembrar en cada assignment y deriva; un deny no.

**(b) Conjunción con grant per-rol en la puerta.**

Preserva las dos dimensiones "de verdad", y es lo que un modelo de autorización clásico haría. Exige
sembrar los **6 pares medidos** antes de activarlo o dos clientes pierden superficies contratadas, y
convierte cada assignment futuro en un cambio de dos tablas. El modo de fallo pasa de "control
decorativo" a "cliente pagó y no entra, en silencio".

**(c) Statu quo documentado.**

Sólo corregir el framing y dejar los carriles como están. Barato; conserva la ambigüedad que originó
este hallazgo y deja 9 controles inertes en la base.

Salidas obligatorias del slice, además de la opción elegida — **las tres cerradas arriba**:

- la intención de los 9 denials de rol → recuperada del registro escrito en sus migraciones (D2);
- el instrumento correcto para la dimensión persona → `user_view_overrides`, per-persona (D2);
- la relación con `TASK-286` → resuelta, sin trabajo pendiente.

</details>

### Slice 2 — El primitive único

- Un solo helper server-side que responda la pregunta, con la semántica del Slice 1.
- El **guard** y la **composición del menú** pasan a consumirlo. Ninguno vuelve a resolver por su cuenta.
- Tests: los 4 destinos del guard se conservan; el bypass interno se conserva; menú y puerta coinciden.

### Slice 3 — La señal de divergencia

- Señal que cuente pares usuario × vista donde el menú y la puerta **no coinciden**. Steady 0.
- Es el invariante que hoy no se sostiene, y el que evita que este hallazgo vuelva en silencio.

### Slice 4 — Corregir el framing heredado

- `project_context.md`, `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12.2,
  `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` §8.2, los 2 companions de
  `agent-invariants/`, y los docs funcionales/manuales del portal cliente.
- Todos dicen o insinúan que "la puerta es el módulo" / "`role_view_assignments` no es el carril". Va en
  el **mismo cambio** que la decisión, para que la doc nunca describa un estado que no existe.

## Out of Scope

- Rediseñar el modelo de capabilities del portal cliente — es `TASK-286`, y hay que coordinar.
- `/creative-hub`, que no existe y el bundle de SKY declara — es su propia decisión (señal
  `identity.client_portal.assigned_view_without_route`).
- La lista base de 6 enlaces del menú y su migración al resolver — es
  `capability-modules-resolver-migration`, todavía sin ID.
- La postura de `AGENT_AUTH_ALLOW_PRODUCTION` — es `TASK-1684`.

## Detailed Spec

**Por qué el Slice 1 es la task y no un preámbulo.** El código de los Slices 2 y 3 es chico y directo
una vez elegida la semántica. Lo caro es la elección, porque las tres opciones tienen consecuencias
comerciales distintas: (a) le quita significado al rol, (b) puede bloquear a un cliente que pagó, (c)
deja controles que mienten. Ninguna es obviamente correcta y ninguna es reversible sin costo una vez que
alguien dependa de ella.

**La asimetría grant/deny es el corazón del análisis.** Exigir un *grant* per-persona o per-rol crea
carga operativa en cada assignment, y la carga operativa deriva: el default permisivo de
`role_view_assignments` existía precisamente porque la gente olvida sembrar, y la medición del Slice 1
de `TASK-1678` encontró un viewCode contratado sin grant para nadie. Honrar un *deny* no crea carga:
el caso normal no requiere nada, y la excepción se declara cuando existe. Con la puerta fail-closed, la
diferencia entre las dos es la diferencia entre "alguien ve algo de más" y "un cliente pierde lo pagado".

**Per-persona, no per-rol.** Un deny per-rol sobre una vista que el módulo concede reintroduce la
paradoja de que *ganar un rol te quita acceso* — el rol es un conjunto que se acumula. Un sujeto
singular no la tiene, y `user_view_overrides` ya es per-persona, con `reason` y `expires_at`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **Slice 1 antes que todo.** Implementar sin decidir produce la opción (b) por omisión, que es la de
  peor modo de fallo.
- Slice 3 puede ir antes del 2: tener la señal de divergencia **antes** de cambiar la semántica da un
  before/after medible.
- Slice 4 va en el mismo cambio que el 2.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Un cliente pierde una superficie contratada | Portal cliente | **Alta si se elige (b) sin sembrar** | Los 6 pares están medidos en `ISSUE-148`; sembrar antes, o elegir (a) | Señal de divergencia + los 2 scripts de verificación |
| El rol queda sin significado y alguien reinventa un control inline | Portal cliente | Media si se elige (a) | Retirar los 9 denials y escribir que el rol es presentacional; el lint de `TASK-1680` ya está en `error` | Suite de `src/lib/client-portal` |
| La decisión choca con `TASK-286` y se hace dos veces | Governance | Media | El Slice 1 exige resolver la relación antes de codificar | — |
| Se corrige el código y la doc queda describiendo el estado viejo | Documentación | Alta si el Slice 4 se difiere | Slice 4 en el mismo cambio que el 2 | `grep` del framing post-cambio |

### Feature flags / cutover

**Decidido 2026-08-10: sin flag.** El razonamiento de abajo (*"un flag default-OFF sí es defendible
acá… porque éste puede quitar acceso a un cliente real"*) era correcto **para la opción (b)**, que fue
descartada. Con (a′) el delta de acceso está medido en **cero**: el lado puerta agrega la condición de
`revoke` sobre una tabla vacía, y el lado menú sólo deja de mostrar enlaces que ya no abrían. Un flag
agregaría un segundo camino de código y un paso de rollout para un cambio que no puede quitar acceso.
El shadow mode que el flag habría dado ya lo entrega el **Slice 3, que va primero**: la señal mide 36
antes y 0 después.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | Nada que revertir: produce una decisión escrita | — | sí |
| 2 | revert PR + redeploy | <5 min | sí |
| 3 | revert PR (la señal se apaga) | <5 min | sí |
| 4 | revert PR | <5 min | sí |

### Production verification sequence

1. La medición de los 24 pares, **antes** del cambio, como baseline.
2. `scripts/identity/client-portal-page-access-check.ts` contra producción — ya deriva su expectativa
   de los datos, así que sobrevive al cambio de semántica.
3. Las 3 personas agente, y con una organización real por cada opción elegida.
4. La señal de divergencia en 0.
5. Confirmar con Sky Airlines y Grupo Berel que no perdieron ninguna superficie.

### Out-of-band coordination required

La decisión del Slice 1 es del operador. Y la intención de los 9 denials puede requerir preguntarle a
quien los sembró.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe decisión escrita entre (a), (b) y (c), con rationale y con la intención de los 9 denials resuelta.
- [ ] Existe **un** primitive que responde "¿esta persona puede ver esta vista?", y el guard y la
      composición del menú lo consumen — ninguno resuelve por su cuenta.
- [ ] Existe señal de divergencia menú↔puerta con steady 0 y reader propio.
- [ ] Un `user_view_overrides` con `override_type='revoke'` cierra la puerta, si la decisión lo incluye.
- [ ] **Ningún cliente perdió una superficie que su organización contrató**, verificado contra los 24 pares.
- [ ] El bypass interno se conserva (test de no-regresión).
- [ ] `project_context.md` y los 5 docs con el framing de "un carril gana" quedaron corregidos en el
      mismo cambio.
- [ ] La relación con `TASK-286` quedó resuelta por escrito.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/client-portal src/lib/tenant src/lib/admin`
- `pnpm test`
- La medición de los 24 pares antes y después
- `scripts/identity/client-portal-page-access-check.ts` contra staging y producción

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (`TASK-286`, `TASK-1388`, `TASK-1678`, `TASK-1679`)
- [ ] `ISSUE-148` movida a `resolved/` con su §Resolución
- [ ] §12.1 y §12.2 de `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` reflejan la semántica real

## Follow-ups

- Tipar los identificadores (`ClientId` / `OrganizationId` como branded types) — sigue pendiente desde
  `ISSUE-146`, y este primitive es otro lugar donde un `string` mal pasado no lo atrapa el compilador.
- El follow-up sin ID `capability-modules-resolver-migration`: mientras la lista base de 6 enlaces salga
  por rol, el menú puede prometer lo que la puerta niega, incluso con este primitive en su lugar.

## Open Questions

**Las tres cerradas el 2026-08-10 en el Slice 1.**

1. ~~¿Qué intención tenían los 9 denials de rol?~~ → **Resuelta con registro escrito, no inferencia.**
   Son dos grupos con intenciones opuestas: 6 son plomería anti-fallback ya vestigial
   (`migration:TASK-1310`), 3 son diferenciación de producto per-rol (`migration:TASK-285`). Ver D2.
2. ~~¿Efeonce necesita restringir vistas por persona dentro de una organización cliente?~~ → **Hoy no**
   (0 filas en `user_view_overrides`, 0 usuarios `client_specialist`-only). El instrumento queda
   habilitado y enforceable para cuando haga falta: `user_view_overrides` per-persona. Ver D2.
3. ~~¿Cómo se relaciona con `TASK-286`?~~ → **Resuelta, sin trabajo pendiente.** Ver §"Relación con
   `TASK-286`" en el Slice 1.

Lo que **deliberadamente NO se decidió**: si la diferenciación per-rol del portal cliente debe volver
algún día, y con qué instrumento concreto más allá de "per-persona". Se declara el seam, no se
construye. La renuncia está escrita en D2 para que sea una decisión visible y no una omisión.
