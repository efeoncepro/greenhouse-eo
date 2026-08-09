# ISSUE-147 — La derivación de `authorizedViews` otorga por defecto, no filtra vigencia, y ante esquema no disponible entrega el registry completo

> **Tipo:** Incidente de runtime (autorización / portal cliente)
> **Ambiente:** Producción + staging + local
> **Detectado:** 2026-08-09, midiendo el carril de acceso del portal cliente
> **Estado:** ✅ **resolved 2026-08-09** por `TASK-1678` — ver §Resolución al final
> **Severidad:** **alta** — es fail-**open**, y hoy sólo está contenido por otro bug (`ISSUE-146`)

## Resumen

`resolveAuthorizedViewsForUser` (`src/lib/admin/view-access-store.ts`) construye el claim
`session.user.authorizedViews` desde `role_view_assignments` ∪ permission sets, menos overrides de
usuario. Un `grep module_assignments` sobre todo ese camino da **cero**: el carril rol→vista no sabe
que existe el carril canónico de módulos contratados.

Eso por sí solo sería tolerable —son dos carriles para dos cosas distintas— si el carril viejo negara
por defecto. **Hace lo contrario**, en tres puntos que se encadenan.

## Defecto 1 — el default otorga

`computeRoleCanAccessViewFallback` se usa cuando un rol **no tiene fila** en `role_view_assignments`
para una vista. Abre así:

```ts
if (role.routeGroups.includes(view.routeGroup)) {
  return true
}
```

Un rol `client_*` tiene routeGroup `client`. Las 25 vistas `cliente.*` del `VIEW_REGISTRY` también.
Conclusión: **toda vista `cliente.*` nueva se auto-otorga a los tres roles cliente** salvo que alguien
se acuerde de seedear un `granted=FALSE` explícito en la misma migración.

De los 25 viewCodes `cliente.*`, **18 están gobernados por un módulo contratado**. El default del
carril viejo es exactamente el opuesto al del canónico, donde nada existe hasta que se contrata.

## Defecto 2 — el `SELECT` no filtra vigencia

```sql
SELECT role_code, view_code, granted
FROM greenhouse_core.role_view_assignments
```

Sin `WHERE`. Ni `active`, ni `effective_to`. Una asignación revocada sigue contando, a diferencia del
predicado canónico que el resto del dominio aplica (`effective_to IS NULL AND status IN (...)`).

## Defecto 3 — el fallback de esquema entrega el registry completo

```ts
if (error instanceof ViewAccessStoreError && error.code === 'SCHEMA_NOT_READY') {
  return {
    authorizedViews: VIEW_REGISTRY.filter(view => fallbackRouteGroups.includes(view.routeGroup)).map(view => view.viewCode),
    routeGroups: fallbackRouteGroups
  }
}
```

Ante esquema no disponible devuelve **todas** las vistas del routeGroup del usuario. Para un tenant
`client` eso son las 25 `cliente.*`, incluidos los 5 con denial explícito y los 18 module-gated.

Y hay un agravante de diseño: como la lista sale **no vacía**, ningún consumidor lo nota. Varios
callsites tienen un guard del estilo `if (authorizedViews.length === 0) return fallback`, que existe
justamente para detectar el estado degradado. Este camino lo esquiva por construcción.

## El amplificador: el fallback permisivo del helper compartido

`hasAuthorizedViewCode` y `canSeeView` deciden con el `fallback` del caller cuando la lista viene
vacía. Los callsites del portal cliente pasan `fallback = routeGroups.includes('client')`, o sea
**`true` para todo usuario cliente**.

Y el estado "lista vacía" no es hipotético: lo produce un `catch` de la propia derivación, que ante un
fallo deja la sesión viva con `authorizedViews: []` y un `console.warn` — sin `captureWithDomain`, sin
señal de reliability.

Cadena completa: falla PG en la derivación → claim vacío → `canSeeView(code, true)` → el cliente ve
superficies module-gated que no contrató.

## Por qué hoy no explota, y por qué eso es peligroso

El gate de cada página decide contra `module_assignments`, así que aunque el menú muestre de más, la
puerta no abre. Pero ese gate está roto en la dirección contraria (`ISSUE-146`: deniega a todos).

O sea: **el fail-open está contenido por un fail-closed que también es un bug.**

Eso fija un orden que no es negociable: arreglar `ISSUE-146` **antes** que esta issue abre una ventana
en la que el cliente ve el ítem *y* entra. La secuencia correcta es al revés.

## Hallazgo adicional: los denials explícitos son anulables

La derivación hace `roleCodes.some(...)` sobre los roles del usuario: si **alguno** otorga la vista, la
recibe. Un cliente con `client_manager` + `client_specialist` obtiene `cliente.campanas` aunque
`client_specialist` tenga `granted=FALSE`.

Esto redefine qué significan los 5 denials explícitos sembrados: protegen menos de lo que aparentan, y
cualquier análisis que los tome como garantía está sobreestimando la protección.

## Fix propuesto

1. **Invertir el default** de `computeRoleCanAccessViewFallback` para vistas cuyo routeGroup sea
   `client`: sin fila explícita, no hay acceso. El caso interno puede conservar su default actual — es
   el que hace usable el portal interno sin seedear 200 filas.
2. **Agregar el predicado de vigencia** al `SELECT`, alineándolo con el resto del dominio.
3. **Cambiar el fallback de `SCHEMA_NOT_READY`**: ante esquema no disponible, un tenant `client`
   debería recibir lista vacía y una señal, no el registry completo. Degradar hacia cerrado, no hacia
   abierto.
4. **Reemplazar el `console.warn` del catch** por `captureWithDomain` + una reliability signal. Un
   claim de autorización que se vacía en silencio no puede ser sólo un log.
5. **Revisar el `fallback = true` de los callsites cliente.** Con los puntos anteriores resueltos, el
   estado "lista vacía" pasa a ser señal de degradación y no debería traducirse en "mostrar todo".

Los puntos 1 y 3 cambian comportamiento de autorización: necesitan verificarse con las tres personas
agente (cliente con módulo, cliente sin módulo, colaborador interno) antes de promover.

## Verificación al resolver

- Una vista `cliente.*` nueva sembrada en `VIEW_REGISTRY` **sin** fila en `role_view_assignments` no
  debe aparecer en el claim de ningún cliente.
- Una asignación revocada no debe contar.
- Con el esquema no disponible, un cliente debe recibir lista vacía y la señal en estado no-ok.
- Un cliente con dos roles, uno de los cuales tiene `granted=FALSE` para una vista, **no** debe
  recibirla.

## Resolución — 2026-08-09, `TASK-1678`

Los tres defectos quedaron cerrados, pero **dos de ellos no eran lo que esta issue decía**. Vale
dejarlo escrito porque el error de diagnóstico es reutilizable.

### Lo que se cerró tal como estaba descrito

- **Defecto 1.** `computeRoleCanAccessViewFallback` deja de otorgar por routeGroup cuando
  `view.routeGroup === 'client'`. El asimetría es deliberada: en las superficies internas "tu
  routeGroup te da acceso" es una regla de negocio razonable; en el portal cliente el acceso lo
  define un contrato comercial.
- **Defecto 3.** El fallback de `SCHEMA_NOT_READY` degrada a **lista vacía** para tenants `client`.
  El baseline interno se conserva a propósito: sin él, un esquema no provisionado dejaría a los
  operadores sin portal, o sea cambiaríamos un fail-open del portal cliente por una caída de
  disponibilidad interna.
- **El `console.warn`** del `catch` de `resolveTenantRuntimeAccess` pasó a `captureWithDomain`.

### Defecto 2 — la premisa era falsa

Esta issue decía que el `SELECT` de `role_view_assignments` "no filtra vigencia". **Esa tabla no
tiene columnas de vigencia.** Verificado contra `information_schema.columns`: sus 7 columnas son
`role_code`, `view_code`, `granted`, `granted_by`, `granted_at`, `updated_at`, `updated_by`. El
predicado se extrapoló de `user_role_assignments`, donde sí aplica.

El hueco de vigencia **real** estaba en otro lado y era más interesante: `getPersistedViewRegistry`
filtra `active = TRUE`, así que una vista desactivada llegaba **ausente**… y caía justo en el
`missing` de `toRegistryRows`, que la **reponía desde el registry TS**. Desactivar una vista en DB
no tenía efecto ninguno sobre el claim mientras siguiera declarada en `VIEW_REGISTRY`. Cerrado para
el carril cliente; para el interno el merge conserva su razón legítima (hacer visible una vista
nueva antes de que corra su seed).

### El fix propuesto estaba incompleto — y su punto 5 era load-bearing

El punto 5 ("revisar el `fallback = true` de los callsites cliente") aparecía como limpieza
posterior. **Sin él, el fix del defecto 3 habría abierto todo.** Devolver `[]` para un cliente
degradado alimenta el `if (authorizedViews.length === 0) return fallback` de
`hasAuthorizedViewCode`, y los layouts cliente pasan `fallback: routeGroups.includes('client')`, que
para todo cliente es `true`. Degradar hacia cerrado sin cerrar el amplificador **crea** el estado
que el amplificador traduce a "mostrar todo".

Cerrado: el `fallback` de lista vacía no aplica cuando `tenant.tenantType === 'client'`. Se
discrimina por **tenant** y no por el prefijo `cliente.` del viewCode — la pregunta honesta es
"¿esta sesión es de cliente?", y ramificar sobre el string sería lógica stringly-typed sobre un
identificador que el schema declara libre.

### Los denials anulables: resueltos por decisión, no por implementación

**La unión sobre roles se queda.** Un `granted=FALSE` de rol significa "este rol no otorga esto", no
"este usuario no debe tenerlo". Lo decidió la medición de los 9 denials cliente: seis niegan a los
tres roles (unión ≡ intersección), y de los tres restantes dos son module-gated —el resolver de
módulos es el gate real— y el tercero (`cliente.analytics`) está destinado a la allowlist base de
`TASK-1679`. La intersección no protegería nada que la unión no proteja ya, y costaría que **ganar
un rol quite acceso**. El veto per-usuario vive donde corresponde: `user_view_overrides` con
`override_type='revoke'`. Rationale completo en
`GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` §8.2 → Delta TASK-1678.

### Señal

`identity.view_access.client_role_without_grants` (kind `data_quality`, steady 0, verificada contra
PG real). **No** es una señal de "claim degradado": el claim se deriva en login y no se persiste, así
que ninguna query DB lo puede contar y una señal de eso mentiría. El evento runtime va a Sentry
(dominio `identity`, `source=resolve_tenant_runtime_access`); la señal DB mide la precondición
estructural, que desde el defecto 1 cerrado es load-bearing: un rol cliente sin grants ya no degrada
a "ve su routeGroup" sino a "no ve nada".

Su SQL se corrigió **dos veces** por ejercitarlo contra PG antes de cablearlo: `greenhouse_core.roles`
no tiene columna `active`, y `'client' = ANY(route_group_scope)` habría arrastrado roles internos con
scope de soporte. El discriminador correcto es `tenant_type = 'client'`.

### Verificación

- `scripts/identity/client-view-fallback-audit.ts` contra PG: invertir el default cuesta un solo
  viewCode por rol (`cliente.ai_visibility_report`), y es module-gated → cero seed necesario.
- 9 tests nuevos entre `view-access-store.test.ts` y `authorization.test.ts`. Los 4 de comportamiento
  se verificaron **no vacuos**: fallan sin el fix. Los demás son guardas de no-regresión del portal
  interno y de la semántica de unión.
- Pendiente de rollout: verificación con las tres personas agente **antes** de promover, y
  `TASK-1679` va después de ésta por el orden de contención.

## Relacionado

- `ISSUE-146` — el guard con la llave equivocada. **Va primero**, por el orden explicado arriba.
- `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md` — la medición completa de la que salió
  esta issue, con la clasificación de las 82 ocurrencias y el orden propuesto.
- `TASK-827` — introdujo el carril canónico y dejó el viejo en paralelo.
- `TASK-1675` — cerró el desencuentro en el menú.
