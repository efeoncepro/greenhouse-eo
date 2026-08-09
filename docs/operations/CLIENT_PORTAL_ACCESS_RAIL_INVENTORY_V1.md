# Inventario del carril de acceso del portal cliente — medición 2026-08-09

> **Tipo de documento:** Inventario de deuda (medición puntual, no contrato)
> **Medido:** 2026-08-09 por Claude, con cuatro análisis paralelos sobre el código y contra PG
> **Motivo:** responder con números a *"llevamos task tras task sobre esto y no termina — ¿qué tanto falta?"*
> **Estado:** los hallazgos están verificados en código y en datos; el plan es propuesta

## La respuesta corta

**El trabajo es mucho más chico de lo que parecía. El impacto es mucho más grande.**

No hay que migrar 82 llamadas. De las 82 ocurrencias de `authorizedViews`, **63 son transporte** (tipos,
copias entre JWT y sesión, builders de subject) y **~86 puntos de decisión son legítimos** — el carril
rol→vista gobierna correctamente las superficies internas, que es para lo que existe.

Los defectos reales son **tres**, y dos de ellos son una función y una línea:

| # | Defecto | Tamaño | Consecuencia | Estado |
|---|---|---|---|---|
| 1 | La derivación de `authorizedViews` otorga por defecto y no conoce módulos | 1 función + 1 fallback | fail-**open**: un cliente puede recibir en sesión los 18 viewCodes module-gated | ✅ **cerrado 2026-08-09** por `TASK-1678` (`ISSUE-147` resuelta) |
| 2 | El guard de acceso usa `clientId` donde el resolver espera `organizationId` | 1 línea | fail-**closed**: 3 páginas cliente deniegan siempre | ✅ **cerrado 2026-08-09** por `TASK-1679` (`ISSUE-146` resuelta) |
| 3 | Seis viewCodes de rutas cliente vivas no están declarados en ningún módulo | dato, no código | fail-**closed**: otras 6 páginas deniegan siempre, y el fix de #2 **no** las arregla | ✅ **cerrado en código 2026-08-09**: 3 pasaron a allowlist base; las otras 3 (+ las Creative) son **assignment de módulo pendiente**, no código |

> **Corrección de la medición (2026-08-09, al implementar `TASK-1678`).** Dos números y un
> diagnóstico de este inventario estaban mal, y conviene no heredarlos:
>
> - **Los denials cliente son 9, no 5.** `TASK-1310` agregó 6 sobre `cliente.growth_seo_dashboard` y
>   `cliente.growth_seo_report` para los tres roles.
> - **El "SELECT sin predicado de vigencia" no era un defecto:** `role_view_assignments` no tiene
>   columnas de vigencia. El hueco real era el merge de `toRegistryRows`, que reponía desde el
>   registry TS las vistas que la DB había desactivado.
> - 🔴 **El defecto 2 desbloquea 0 páginas, no 3.** Este inventario estimaba que corregir la llave
>   abriría las 3 «cuyo viewCode está declarado en algún módulo». Cierto a nivel de catálogo, falso a
>   nivel de datos: los módulos que las declaran (`creative_hub_globe_v1`, `equipo_asignado`) **no
>   están asignados a ninguna organización**. `module_assignments` tiene 7 filas en toda su historia,
>   todas de SEO / AI Visibility / Proposal Studio. Es la lección más transferible de esta medición:
>   **contar lo que el catálogo declara no es contar lo que los datos permiten.**
> - **Y por lo tanto los defectos 2 y 3 eran, sobre todo, un bug de mensaje.** Antes las 9 rutas
>   decían "el servicio no está disponible" cuando el servicio estaba bien, y ensuciaban Sentry con el
>   funcionamiento normal. Después dicen la verdad: 3 abren y 6 dicen "no tienes este módulo".
> - **El fail-open costaba mucho menos de lo que parecía.** Medido con
>   `scripts/identity/client-view-fallback-audit.ts`: invertir el default apaga **un** viewCode por
>   rol cliente, y es module-gated. Las 72 filas de assignment ya eran explícitas — el default
>   permisivo casi no cargaba peso. Lo que sí era grave es el camino degradado, no el happy path.

**Nueve de las páginas del portal cliente no abren hoy.** Ese era el titular al medir, y no estaba en
ningún issue antes de esta medición.

> **Estado al 2026-08-09, después de `TASK-1678` + `TASK-1679`:** las nueve **dejaron de mentir**, que
> es una cosa distinta de abrir. Tres abren (las vistas base) y seis muestran el empty state honesto
> porque su módulo no está asignado a ninguna organización. La parte que queda no es código: es
> decidir y asignar módulos. El titular corregido sería *"nueve páginas reportaban una falla de
> servicio para decir seis cosas distintas, y ninguna de las seis era una falla"*.

## Lo que se midió

`authorizedViews` aparece **82 veces en 40 archivos** de `src/`. Se clasificó cada ocurrencia contra un
criterio objetivo, no opinable: **18 viewCodes están gobernados por algún módulo** (medidos contra
`greenhouse_client_portal.modules.view_codes`), y 5 tienen `granted=FALSE` explícito para roles
`client_*`. Decidir sobre uno de esos 18 con `authorizedViews` es, por definición, el desencuentro de
carriles.

| Categoría | Qué significa | Cuántas |
|---|---|---|
| TRANSPORTE | Tipa, copia o propaga el claim. No decide nada | 63 |
| LEGÍTIMO-INTERNO | Decide sobre un viewCode que no es `cliente.*`. El carril viejo es la fuente correcta | ~86 puntos de decisión |
| LEGÍTIMO-CLIENTE | Decide sobre un `cliente.*` fuera de los 18 | 6 |
| **BUG fail-open** | Muestra u otorga de más | **10** |
| **BUG fail-closed** | Esconde o deniega | **9** |
| AMBIGUO | Mecanismo puro o carril inerte | 5 |

De los 25 viewCodes `cliente.*` del registry, 18 son module-gated: el **72%** del portal cliente
debería decidirse por módulo contratado.

## Defecto 1 — la derivación otorga por defecto (fail-open) — ✅ CERRADO 2026-08-09

> Cerrado por `TASK-1678`. El default se invirtió para el routeGroup `client`, el camino degradado
> pasó a devolver lista vacía para tenants `client`, el amplificador de lista vacía dejó de aplicar a
> sesiones cliente, el `console.warn` pasó a `captureWithDomain` y quedó la señal
> `identity.view_access.client_role_without_grants` en steady 0. La sección de abajo se conserva
> como el diagnóstico original; leerla junto a la corrección de medición de más arriba.

`resolveAuthorizedViewsForUser` (`src/lib/admin/view-access-store.ts`) construye el claim desde
`role_view_assignments` ∪ permission sets, menos overrides. Un `grep module_assignments` sobre todo ese
camino da **cero**: el carril viejo no sabe que existe el canónico.

Tres problemas encadenados, los tres verificados en el código:

1. **El default otorga.** Cuando un rol no tiene fila para una vista, cae en
   `computeRoleCanAccessViewFallback`, que abre con
   `if (role.routeGroups.includes(view.routeGroup)) return true`. Un rol `client_*` tiene routeGroup
   `client`; las 25 vistas `cliente.*` también. **Toda vista `cliente.*` nueva se auto-otorga a los
   tres roles cliente** salvo que alguien seedee un denial explícito. El default del carril viejo es
   exactamente el opuesto al del canónico, donde nada existe hasta que se contrata.
2. **El `SELECT` de `role_view_assignments` no tiene `WHERE`.** Ni `active`, ni `effective_to`. Una
   asignación revocada sigue contando.
3. **El fallback de esquema no disponible devuelve el registry entero.** Ante `SCHEMA_NOT_READY`
   retorna `VIEW_REGISTRY.filter(routeGroup).map(viewCode)`, o sea las 25 vistas `cliente.*` para
   cualquier usuario con routeGroup `client` — incluidos los 5 con denial explícito. Y como la lista
   sale **no vacía**, ningún guard de "lista vacía" se activa: los consumidores no notan nada.

A eso se suma que el fallback permisivo del helper compartido —`canSeeView(code, fallback)` con
`fallback = routeGroups.includes('client')`, o sea `true` para todo cliente— convierte el estado "lista
vacía" en "mostrar todo". Ese estado no es hipotético: lo produce un `catch` de la propia derivación
que deja la sesión viva con un `console.warn`, sin Sentry ni señal.

**Por qué hoy no explota:** el gate de cada página decide contra `module_assignments`, así que aunque el
menú muestre de más, la puerta no abre. Es decir: **el fail-open está contenido por un fail-closed que
también es un bug.** Arreglar el defecto 2 sin arreglar el 1 quita esa contención.

Ese orden importa y es la razón principal de que este inventario exista.

## Defecto 2 — el guard usa la llave equivocada (fail-closed)

> ✅ **CERRADO 2026-08-09** por `TASK-1679` (`ISSUE-146`). La llave pasa por el helper único
> `resolveClientPortalOrganizationId`, con test de contrato. Y de paso se cerró un tercer defecto que
> esta sección descubrió al verificar en producción: el `redirect()` del camino `denied` estaba dentro
> del `try`, así que su propio `catch` lo interceptaba.

`requireViewCodeAccess` asigna `session.user.clientId` a una variable llamada `organizationId` y la pasa
a un filtro sobre `module_assignments.organization_id`. Los espacios de ID no se solapan: `cli-*`,
`hubspot-company-*` y `greenhouse-demo-client` contra `org-*`. Detalle completo en `ISSUE-146`.

Alcance real: **3** de las 9 páginas (`/proyectos`, `/campanas`, `/equipo`). Las otras 6 fallan por otra
causa.

## Defecto 3 — seis viewCodes que ningún módulo declara (fail-closed)

> ✅ **CERRADO EN CÓDIGO 2026-08-09** por `TASK-1679`, con una decisión de producto de por medio:
> sólo **3** de las 6 son portal base (`notificaciones`, `configuracion`, `actualizaciones`) y pasaron
> a una allowlist transversal. `cliente.ciclos` y `cliente.analytics` quedaron module-gated —son
> superficies de delivery y Creative pertenece a un solo cliente— y `/reviews` se unificó en
> `cliente.reviews`. Las que siguen cerradas lo están por **assignment de módulo pendiente**, que es
> una decisión comercial, no un bug.

`hasViewCodeAccess` resuelve con `modules.some(m => m.viewCodes.includes(viewCode))`. No hay allowlist
transversal: **un viewCode que ningún módulo declara deniega siempre**, con o sin el fix del defecto 2.

Seis rutas cliente vivas están en esa situación:

| Ruta | viewCode que pide el guard | En módulos |
|---|---|---|
| `/reviews` | `cliente.revisiones` | los módulos declaran `cliente.reviews` — **otro string** |
| `/sprints` | `cliente.ciclos` | no |
| `/analytics` | `cliente.analytics` | no |
| `/updates` | `cliente.actualizaciones` | no |
| `/notifications` | `cliente.notificaciones` | no |
| `/settings` | `cliente.configuracion` | no |

`/reviews` es el caso más nítido: dos strings distintos para la misma ruta, uno en el guard y otro en el
catálogo de módulos. `/notifications` es el más caro por frecuencia — cuelga de la campanita del header,
o sea la ruta con más probabilidad de click accidental del portal. Y `/settings` significa que **un
cliente no puede entrar a su propia configuración de cuenta.**

## Lo que esto implica para el orden del trabajo

1. **Primero el defecto 1**, porque el 2 lo destapa. Hoy el fail-open del menú está contenido por el
   fail-closed del guard; invertir ese orden abre una ventana en la que el cliente ve *y* entra.
2. **Después decidir el defecto 3**, que no es código sino una pregunta de producto: esas 6 vistas
   ¿son parte del portal base (y entonces necesitan una allowlist transversal o un módulo base que las
   declare) o son module-gated (y entonces falta el módulo)? Nadie puede escribir ese fix sin la
   decisión.
3. **El defecto 2 es una línea**, pero va después de la decisión anterior para no desplegar dos veces.
4. **Cerrar la canilla**: el lint `no-untokenized-business-line-branching` está en `warn` desde mayo.
   Mientras siga así, el carril viejo puede crecer mientras se limpia. Nota: su override block exime 7
   paths, uno de ellos `VerticalMenu (1).tsx`, un archivo muerto.

## Lo que NO hay que hacer

**No hay que migrar las 82.** Sesenta y tres son transporte y unas ochenta y seis decisiones son
legítimas: el carril rol→vista es la fuente correcta para las superficies internas y no se toca. Tratar
esto como "una task por callsite" es exactamente lo que hizo que pareciera infinito.

## Hallazgos laterales que conviene no perder

- **Los denials `granted=FALSE` son anulables.** La derivación hace `roleCodes.some(...)`: un usuario
  con dos roles recibe la vista si *alguno* la otorga. Un cliente con `client_manager` +
  `client_specialist` obtiene `cliente.campanas` pese al denial de specialist. Eso define qué significan
  realmente los 5 denials explícitos: menos de lo que parecen.
- **Dos carriles inertes.** El gate por `viewCode` de los shortcuts nunca se ejecuta (ninguna entrada
  del catálogo declara `viewCode`) y el de deep links tampoco (ningún caller productivo pasa el
  contexto de acceso). Hay que decidir si se cablean o se retiran, antes de que alguien registre un
  shortcut `cliente.*` y reabra el agujero por esa puerta.
- **El shortcut `client-portal` ofrece `/proyectos`** —superficie module-gated— con un gate derivado de
  roles. Es el mismo bug que `TASK-1675` cerró en el menú, por otra puerta, y no usa `authorizedViews`,
  así que no aparece en el conteo de 82.
- **`cliente.pulse` y `cliente.home` comparten `routePath: '/home'`.** Si el ítem base se filtra por
  rol, el dedup por ruta del merge no los ataja y pueden salir dos entradas a `/home`.
- **El gate de alcanzabilidad de rutas es role-blind**: prueba que el `href` existe en el código, no que
  un cliente pueda verlo ni entrar.

## Método

Cuatro análisis read-only en paralelo, con lanes de archivos disjuntas (transporte/derivación,
navegación/shell, contratos programáticos + guard, dominios de negocio), un criterio de clasificación
común y los 18 viewCodes module-gated obtenidos de PG como referencia objetiva. Los tres hallazgos del
defecto 1 se releyeron en el código antes de escribirlos acá.
