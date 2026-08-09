# ISSUE-147 — La derivación de `authorizedViews` otorga por defecto, no filtra vigencia, y ante esquema no disponible entrega el registry completo

> **Tipo:** Incidente de runtime (autorización / portal cliente)
> **Ambiente:** Producción + staging + local
> **Detectado:** 2026-08-09, midiendo el carril de acceso del portal cliente
> **Estado:** open — tres defectos verificados en código; fix no aplicado
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

## Relacionado

- `ISSUE-146` — el guard con la llave equivocada. **Va primero**, por el orden explicado arriba.
- `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md` — la medición completa de la que salió
  esta issue, con la clasificación de las 82 ocurrencias y el orden propuesto.
- `TASK-827` — introdujo el carril canónico y dejó el viejo en paralelo.
- `TASK-1675` — cerró el desencuentro en el menú.
