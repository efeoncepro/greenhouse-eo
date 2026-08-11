# Menu dinamico y acceso a modulos del Portal Cliente

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-05-13 por Claude (TASK-827)
> **Ultima actualizacion:** 2026-08-11 por Claude (TASK-1685: menu y puerta comparten una sola regla; la lista base dejo de mostrarse por rol)
> **Documentacion tecnica:** [GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md), [GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md)

---

## Delta 2026-08-11 — menu y puerta responden con una sola regla (TASK-1685)

Desde el 2026-08-10, **todo** el menu del cliente —incluida la lista base heredada que hasta entonces
se mostraba por rol— decide su visibilidad con la misma regla que la puerta de cada pagina: **modulos
contratados de la organizacion, menos revocaciones por persona**. Consecuencias practicas:

- **Ya no existe el caso "veo el enlace y al entrar me dice que el modulo no esta activado".** Antes
  del cierre se midieron 36 enlaces asi, sobre 8 de 8 usuarios cliente. Si el enlace esta, la pagina abre.
- **Ciclos y Analytics ya no aparecen en el menu de nadie**, porque ningun modulo del catalogo las
  declara. Nadie perdio acceso: tampoco podian abrirlas antes — eran enlaces muertos.
- **El rol del usuario cliente no agrega ni quita enlaces.** Los tres roles de cliente se diferencian
  en que puede hacer una persona dentro de una pantalla, no en que pantallas ve.
- **A una persona concreta se le puede revocar una pantalla especifica** (caso de soporte o
  verificacion); la revocacion cierra a la vez menu, puerta y buscador ⌘K.
- Una senal nueva en `/admin/operations` (`identity.client_portal.menu_gate_divergence`, estado sano
  cero) vigila que menu y puerta no vuelvan a divergir.

Las secciones historicas de este documento que describen la lista base "mostrada por rol" quedaron
marcadas abajo como cerradas.

---

## Delta 2026-08-09 — las paginas del portal volvieron a responder

Hasta este dia, **nueve paginas del portal cliente devolvian el mismo mensaje de error**
("el servicio no esta disponible") para seis situaciones distintas, y ninguna de las seis era una
falla del servicio. Ahora cada situacion dice lo que realmente pasa. Tres cambios que conviene
conocer si operas el portal:

**1. Hay tres paginas que abren siempre, sin contratar nada.** Notificaciones, Configuracion y
Novedades son parte del portal, no un producto: un cliente no contrata "poder ver sus
notificaciones". Se llaman **vistas base** y estan disponibles para cualquier organizacion.

**2. El resto sigue dependiendo del modulo contratado, y ahora lo dice bien.** Cuando una
organizacion no tiene el modulo que gobierna una pagina, ve el empty state que explica que ese
modulo no esta activado y a quien pedirlo — antes veia el banner de degradacion, que invita a
reintentar algo que nunca iba a funcionar.

**3. Si un usuario cliente no tiene organizacion resuelta, el mensaje es distinto.** No es lo mismo
"no tienes este modulo" que "no puedo saber que modulos tienes". El segundo caso es un problema de
datos del onboarding, no del contrato comercial, y tiene su propia senal en `/admin/operations`
(`identity.client_portal.client_without_organization`, que en estado sano marca cero).

### Que significa esto cuando un cliente reporta que no ve algo

| Lo que ve el cliente | Que significa | Que hacer |
|---|---|---|
| La pagina abre | Es vista base, o su organizacion tiene el modulo | nada |
| "Este modulo no esta activado para tu cuenta" | El fail-closed correcto: no tiene el modulo | decision comercial: asignar el modulo si corresponde |
| Banner de degradacion | El resolver fallo de verdad | revisar `/admin/operations` |
| Vuelve a `/home` sin mensaje claro | Su organizacion no esta resuelta | revisar el onboarding de ese cliente (`spaces` → `organizations`) |

> Detalle tecnico: `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12.2 documenta el guard
> real y las tres vistas base; `docs/tasks/complete/TASK-1679-client-portal-guard-key-and-base-views.md`
> tiene la medicion contra las organizaciones reales.

### Las nueve paginas, una por una (estado al 2026-08-09)

Esta tabla es la respuesta corta a "por que este cliente ve esto y aquel no". Verificada contra la
base que lee produccion despues de los dos releases del dia.

| Pagina | Direccion | Que la gobierna | Quien la abre hoy |
|---|---|---|---|
| Notificaciones | `/notifications` | vista base | cualquier organizacion |
| Configuracion | `/settings` | vista base | cualquier organizacion |
| Novedades | `/updates` | vista base | cualquier organizacion |
| Proyectos | `/proyectos` | modulo Creative Hub Globe | solo Sky Airlines |
| Campanas | `/campanas` | modulo Creative Hub Globe | solo Sky Airlines |
| Equipo | `/equipo` | Creative Hub Globe **o** Equipo Asignado | solo Sky Airlines (nadie tiene Equipo Asignado) |
| Revisiones | `/reviews` | modulo Creative Hub Globe | solo Sky Airlines |
| Ciclos | `/sprints` | ningun modulo del catalogo la declara | nadie; desde TASK-1685 el menu tampoco la muestra (por URL directa: empty state) |
| Analytics | `/analytics` | ningun modulo del catalogo la declara | nadie; desde TASK-1685 el menu tampoco la muestra (por URL directa: empty state) |

Tres lecturas que conviene tener claras:

**Ciclos y Analytics estan asi a proposito, y es deuda declarada.** Son superficies de entrega y de
reporting: dependen del servicio contratado, no del portal. Se dejaron dependiendo de un modulo y hoy
ningun modulo las declara. Desde TASK-1685 (2026-08-10) el menu ya no las muestra a nadie —antes eran
enlaces muertos que el rol mostraba y la puerta negaba—; quien llegue por URL directa recibe el empty
state honesto. Abrirlas es declararlas en el modulo que corresponda —una decision de catalogo, no un
cambio de codigo—, no moverlas a vista base.

**Creative es de Sky Airlines y de nadie mas.** El 2026-08-09 se le asigno el modulo Creative Hub
Globe a Sky Airlines, y con eso sus usuarios abren Proyectos, Campanas, Equipo y Revisiones. El bundle
otorga dos superficies mas: Pulse y Creative Hub. Ninguna otra organizacion lo tiene, asi que para el
resto esas cuatro paginas siguen mostrando el empty state — que es lo correcto, no una falla.

**Cuidado con Creative Hub: el enlace existe, la pagina todavia no.** El modulo declara la superficie
`Creative Hub`, asi que aparece en el menu de Sky Airlines, pero esa direccion aun no existe en el
portal. Es la deuda de paginas placeholder que ya estaba anotada mas abajo; con el modulo asignado
dejo de ser hipotetica. Si un usuario de Sky reporta que ese enlace no lleva a ninguna parte, tiene
razon y no es un problema de contratacion.

### Por que un cliente podia ver un enlace y recibir el empty state (cerrado el 2026-08-10)

Era la confusion de soporte mas probable, y **desde TASK-1685 ya no pasa**.

El menu del cliente se armaba de **dos** partes que no compartian origen:

- **Los enlaces de modulo** se componian desde lo contratado (esto es lo que cerro TASK-1675). Si el
  enlace estaba, la pagina abria.
- **Una lista base heredada** de seis enlaces de cliente —Proyectos, Ciclos, Equipo, Revisiones,
  Analytics, Campanas— se mostraba segun el rol de la persona, no segun el modulo. Por eso una
  organizacion sin Creative Hub Globe podia ver esos enlaces y, al entrar, recibir "este modulo no
  esta activado para tu cuenta".

Nunca fue un agujero de seguridad: la puerta de cada pagina siempre decidio por modulo contratado, y
el menu nunca otorgo acceso. Eran enlaces que prometian de mas — 36 medidos, sobre 8 de 8 usuarios
cliente. Hoy la lista base decide su visibilidad con la misma regla que la puerta (modulos contratados
menos revocaciones por persona), asi que **si un enlace esta en el menu, la pagina abre**.

> Que NO hacer si algo parecido reaparece: no tocar los permisos de vista por rol — desde TASK-1685
> esa tabla no gobierna ninguna pantalla del portal cliente. Si un cliente reporta un enlace que no
> abre, revisa la senal `identity.client_portal.menu_gate_divergence` en `/admin/operations` y los
> modulos de su organizacion.

---

## La idea central

Antes, todos los clientes veian lo mismo en el portal Greenhouse: un menu fijo con las mismas opciones, sin importar si habian contratado un plan Globe completo o solo Wave basico. Si un cliente compraba un addon como "Brand Intelligence", no habia forma practica de "encenderle" ese modulo sin tocar codigo y hacer deploy.

Desde TASK-827 (mayo 2026), el portal cliente es **compositivo**: el menu y las paginas que cada cliente ve dependen de los **modulos** que tiene activos en su cuenta. Comercial puede vender modulos individuales, addons o bundles completos, y el portal refleja esa decision automaticamente.

---

## Los modulos: que ve cada cliente

Un **modulo** es un conjunto declarativo de superficies vendibles. Por ejemplo:

- **Creative Hub Globe** — bundle de 6 superficies (Pulse, Proyectos, Campanas, Creative Hub, Equipo, Revisiones)
- **Brand Intelligence** — addon de Globe que agrega 1 superficie nueva
- **CSC Pipeline** — addon de Globe que agrega 1 superficie nueva
- **Web Delivery (Wave)** — modulo basico Wave con 1 superficie
- **ROI Reports + Exports** — addon Globe Enterprise con 2 superficies
- **Pulse** — modulo transversal (todos los clientes activos lo tienen)

El catalogo completo vive en la base de datos en `greenhouse_client_portal.modules` y se gestiona desde el Admin Center (`/admin/client-portal/catalog`).

### Como se le asigna un modulo a un cliente

Cuando comercial vende un modulo a un cliente:

1. Un admin de Greenhouse va a `/admin/client-portal/organizations/[orgId]/modules`
2. Hace click en "Activar modulo" y elige cual del catalogo
3. El modulo queda asignado al cliente (fila en `module_assignments`)
4. En la proxima sesion del cliente, el portal refleja el cambio (hasta 60 segundos de delay por cache)

Tambien se puede activar automaticamente via **cascade desde el ciclo de vida del cliente** (TASK-828, pendiente): cuando se completa el onboarding de un cliente, los modulos que su `engagement_commercial_terms` declara como `bundled_modules[]` se materializan solos.

---

## Las 6 situaciones que el cliente puede ver

Cuando un cliente entra al portal, el sistema verifica que modulos tiene activos y decide que mostrarle. Hay seis situaciones canonicas: las cinco de siempre, mas la sexta que desde el 2026-08-09 dejo de disfrazarse de falla de servicio.

### 1. Funcionamiento normal

El cliente tiene sus modulos activos. El menu izquierdo muestra solo los items correspondientes a sus modulos. Cada click lleva a la pagina real.

Ejemplo Globe full bundle (el caso real es Sky Airlines): el cliente ve **Pulse, Proyectos, Campanas, Equipo, Revisiones y Creative Hub** + el grupo "Modulos" con sus addons + "Mi Cuenta" con Novedades, Notificaciones y Configuracion.

Ejemplo Wave standard: el cliente ve solo **Pulse + Web Delivery** + "Mi Cuenta". Nada mas.

### 2. Cliente recien activado (zero-state)

Un cliente acaba de ser dado de alta pero el account manager todavia no le configuro sus accesos. En vez de mostrar un menu vacio o un dashboard roto, el portal muestra un mensaje calido:

> **Bienvenido a Greenhouse**
> Tu cuenta esta activada. Tu account manager esta configurando tus accesos. Te avisaremos por email cuando este listo.
> [Hablar con mi account manager]  [Ver mi cuenta]

Operacionalmente este estado dura horas o dias. Si dura mas de 14 dias, el reliability signal `client_portal.assignment.lifecycle_module_drift` (TASK-829) avisa al equipo de operaciones.

### 3. El cliente intento acceder a un modulo que no tiene activo

Un cliente Globe sin addon Brand Intelligence intenta entrar a `/brand-intelligence` (porque alguien le mando el link o quiso explorar). En vez de un 404 o pantalla blanca, el portal lo redirige a su Home con un mensaje contextual:

> **Brand Intelligence aun no esta activo en tu cuenta**
> Brand Intelligence es un addon disponible para planes Globe. Si te interesa conocerlo, escribele a tu account manager.
> [Solicitar acceso]  [Volver al inicio]

El boton "Solicitar acceso" abre el cliente de email pre-rellenado con un mensaje al account manager solicitando informacion. El boton "Volver al inicio" lleva al Home normal.

### 4. Modo degradado (algo fallo parcialmente)

Si el resolver de modulos tiene un problema temporal (base de datos lenta, error transitorio), el portal sigue funcionando con lo que SI pudo resolver y muestra un banner explicativo arriba:

> **Portal en modo degradado**
> Algunos modulos no estan disponibles temporalmente. Estamos renderizando solo los que si estan disponibles. Si esto persiste, tu account manager te contactara.
> [Volver a intentar]

El cliente ve los modulos que SI resolvieron y puede usar el portal con esa funcionalidad parcial. NO hay pantalla blanca ni mensajes confusos.

### 5. Error completo (resolver fallo del todo)

Si el resolver no responde por completo, el portal redirige al Home con un mensaje claro y un boton para reintentar:

> **Algo salio mal de nuestro lado**
> Te llevamos al inicio mientras lo resolvemos. Si el problema persiste, escribele a tu account manager.
> [Ir al inicio]

El equipo de operaciones se entera del problema automaticamente porque el sistema emite un alerta a Sentry con el tag `domain=client_portal`.

### 6. El usuario cliente no tiene organizacion resuelta

El portal necesita saber a que organizacion pertenece la persona para poder preguntar por sus modulos.
Cuando ese vinculo no existe, no hay contra que evaluar nada: el portal no puede decir "no tienes este
modulo" porque tampoco sabe cuales tiene. Devuelve al inicio declarando ese caso aparte.

**No es un problema de contratacion y no se arregla activando modulos.** Es el onboarding del cliente:
la cuenta de la persona tiene que llegar hasta su organizacion pasando por un espacio activo. Hasta que
eso se reconcilie, ningun modulo se va a ver, se active lo que se active.

Se mide con la senal `identity.client_portal.client_without_organization` en `/admin/operations`, que en
estado sano marca cero. Cualquier valor distinto de cero es una persona que hoy no puede usar su portal.

---

## Por que las paginas tienen guardia (page guards)

Antes de TASK-827, algunas paginas como `/notifications` y `/campanas` no tenian validacion: cualquiera que conociera la URL podia entrar directo. Otras paginas validaban con un sistema legacy que se basaba en grupos de rutas, no en modulos especificos.

Ahora cada pagina cliente tiene una **guardia canonica** (`requireViewCodeAccess`) que valida acceso server-side antes de renderizar:

1. Si el usuario es un operador interno de Efeonce, pasa sin restriccion (acceso de soporte legitimo, las 9 paginas)
2. Si la pagina es una de las tres vistas base, abre sin consultar modulos
3. Si el usuario es cliente, el sistema resuelve su organizacion; si no tiene ninguna, devuelve al inicio declarando ese caso (situacion #6 arriba)
4. Si el cliente tiene el modulo que provee esa pagina, entra normalmente
5. Si NO lo tiene, devuelve al inicio con el empty state del modulo no activado (situacion #3 arriba)
6. Si el resolver falla de verdad, devuelve al inicio con el modo error (situacion #5 arriba)

Las 9 paginas con guardia canonica hoy son: `/proyectos`, `/sprints`, `/equipo`, `/campanas`, `/reviews`, `/analytics`, `/updates`, `/notifications`, `/settings`.

Los pasos 2 a 6 son el orden real, y ese orden es lo que hace que cada resultado tenga su propio
destino en vez de un unico mensaje de error. Un operador interno abre las nueve por el paso 1: si a un
interno alguna le devuelve la pagina de no autorizado, eso es un defecto del portal, no un problema del
cliente ni de su modulo.

> Detalle tecnico: [src/lib/client-portal/guards/require-view-code-access.ts](../../../src/lib/client-portal/guards/require-view-code-access.ts) — helper canonico. Spec: [TASK-827 spec](../../tasks/complete/TASK-827-client-portal-composition-layer-ui.md) seccion Slice 4.

---

## Como se compone el menu

El menu izquierdo del portal cliente se genera dinamicamente desde el resolver. No hay listas hardcoded por business line ni por tipo de cliente.

El componente `<ClientPortalNavigation>` corre server-side, consulta el resolver, y produce una lista de items con esta estructura:

| Campo | Que es |
|---|---|
| `label` | Texto visible en el menu (en espanol, sentence case) |
| `route` | Ruta destino (ej. `/proyectos`) |
| `icon` | Icono Tabler (ej. `tabler-folders`) |
| `group` | Seccion del menu: Operacion / Modulos / Mi cuenta |
| `tier` | Tipo de modulo: standard / addon / pilot |

Los items se ordenan en tres secciones canonicas:

1. **Operacion** (items principales del dia a dia): Pulse, Proyectos, Ciclos, Equipo, Revisiones, Campanas
2. **Modulos** (capacidades especializadas y addons): Creative Hub, Brand Intelligence, CSC Pipeline, ROI Reports, etc.
3. **Mi cuenta** (transversal, siempre accesibles): Notificaciones, Updates, Settings

Si el cliente tiene un item con tier `addon`, aparece con una etiqueta visual "Addon" naranja al lado.

> Detalle tecnico: [src/lib/client-portal/composition/menu-builder.ts](../../../src/lib/client-portal/composition/menu-builder.ts) — pure function determinista. Tests: 14 verdes.

---

## Que hizo posible esto: el resolver canonico

Toda esta composicion descansa sobre el **resolver** (TASK-825): una funcion server-side que dada una `organizationId` devuelve la lista de modulos activos del cliente. Lee de la base de datos, cachea por 60 segundos in-memory, y es la unica fuente de verdad para "que ve este cliente".

Cuando comercial activa un nuevo modulo via Admin Center, el cache se invalida automaticamente para esa organization, y la proxima sesion del cliente refleja el cambio.

> Detalle tecnico: [src/lib/client-portal/readers/native/module-resolver.ts](../../../src/lib/client-portal/readers/native/module-resolver.ts). Spec: [GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md) seccion 6.

---

## Limites conocidos V1.0

- **Algunas paginas son placeholder forward-looking, y desde el 2026-08-09 esto ya no es hipotetico**: la base de datos declara modulos como `creative_hub_globe_v1` con superficies como `/creative-hub`, `/brand-intelligence`, etc., pero esas direcciones todavia no existen en el portal. Con el modulo asignado a Sky Airlines, sus usuarios ven el enlace de Creative Hub y ese enlace no lleva a ninguna parte. La task derivada `client-portal-pages-placeholder-materialization` (V1.1) crea las paginas. Mientras tanto: si un cliente reporta ese enlace, tiene razon y no hay nada que activar.
- **Dos de las nueve paginas no tienen modulo que las declare**: Ciclos (`/sprints`) y Analytics (`/analytics`) quedaron dependiendo de un modulo y hoy ninguno las declara, asi que muestran el empty state para todas las organizaciones. Es deuda declarada, no un bug: se cierra declarandolas en el modulo que corresponda.
- ~~**La lista base heredada de seis enlaces cliente todavia se muestra por rol**~~ — **cerrado por TASK-1685 (2026-08-10)**. La lista base decide su visibilidad con el mismo origen que los enlaces de modulo y que la puerta de cada pagina (modulos contratados menos revocaciones por persona). Queda pendiente el bloque menor de linea de negocio/servicios de la cuenta (ver punto anterior).
- ~~**El menu vertical legacy coexiste**~~ — **cerrado por TASK-1675 (2026-08-09)**. El menu izquierdo ya suma los enlaces de los modulos contratados, resueltos en el servidor desde la misma fuente que gatea cada pagina. Lo que queda es un bloque menor que arma unos pocos enlaces desde la linea de negocio y los servicios de la cuenta, pendiente de migrar. Detalle funcional: [Menu del Portal Cliente — modulos contratados](menu-portal-cliente-modulos.md).
- **El email del account manager es generico**: los botones "Solicitar acceso" usan `support@efeoncepro.com` como destino por ahora. La resolucion canonical (leer del campo `organizations.account_manager_user_id`) vive en task derivada V1.1.
- **Sin self-service del cliente**: el cliente no puede solicitar un modulo desde su portal todavia. Si quiere uno, escribe al account manager via el mailto. El flow self-service con aprobacion operativa vive en V1.1.

---

## Para equipo comercial y account: que cambia para ti

- Tu account ahora puede tener una matriz real de modulos contratados. Ya no es "Globe vs Wave vs CRM Solutions" como dimensiones binarias — cada modulo (incluyendo addons) se activa o desactiva individualmente.
- Para vender un addon a un cliente Globe existente: actívalo desde `/admin/client-portal/organizations/[orgId]/modules` y avisa al cliente que en su proxima sesion lo va a ver.
- Si un cliente reporta que "no veo X cosa" o "me sale un mensaje raro": revisa que modulos tiene activos en su organization. El portal solo le muestra lo que su comercial le encendio.

> Detalle operativo paso a paso: [Manual de uso del portal cliente — menu dinamico y empty states](../../manual-de-uso/client-portal/menu-dinamico-y-empty-states.md)

---

## Para equipo de operaciones: como saber si esto esta funcionando

En `/admin/operations`, el subsystem **Identity & Access** tiene cuatro senales que juntas cubren este carril. Las tres ultimas deben marcar **cero** en estado sano:

| Senal | Que cuenta | Que hacer si no es cero |
|---|---|---|
| `client_portal.composition.resolver_failure_rate` | fallas reales del resolver | hoy emite `unknown` (scaffold V1.0); cuando TASK-829 cierre reportara el porcentaje y alertara sobre 1% |
| `identity.client_portal.client_without_organization` | usuarios cliente sin organizacion resuelta | reconciliar el onboarding de esa cuenta: sin organizacion, ningun modulo se va a ver |
| `identity.view_access.client_role_without_grants` | roles cliente que quedaron sin ningun permiso de vista | revisar los grants sembrados; con la lista vacia el carril cliente ahora cierra en vez de abrir |
| `identity.client_portal.menu_gate_divergence` (desde TASK-1685, 2026-08-11) | enlaces que el menu ofrece y la puerta niega, superficies alcanzables solo por URL, y superficies que ningun modulo del catalogo vende | menu y puerta divergieron: revisar los modulos de la organizacion afectada o el catalogo de navegacion; NUNCA "arreglarlo" agregando la vista al catalogo de navegacion |

La ultima existe por un cambio de criterio: hasta el 2026-08-09, si un rol cliente no tenia fila para una vista, el sistema **la otorgaba**. Ahora no. El default del carril de rol quedo alineado con el de modulos: nada se otorga hasta que este declarado.

Si emerge el warning `role_view_fallback_used` en Sentry (`domain=identity`), significa que alguien agrego un view code nuevo sin sembrar los grants correspondientes en `role_view_assignments`. Esto NO es un bug — es la senal de gobernanza funcionando. La solucion es una migracion de seed (ver regla canonica en `CLAUDE.md` seccion "View Registry Governance Pattern").

> Detalle tecnico: [Manual de uso del portal cliente — operacion y troubleshooting](../../manual-de-uso/client-portal/menu-dinamico-y-empty-states.md)

---

## Glosario

| Termino | Definicion |
|---|---|
| **Modulo** | Bundle declarativo (catalogo) de superficies vendibles del portal cliente. Vive en `greenhouse_client_portal.modules` |
| **Assignment** | Asignacion entre una organization y un modulo, con fechas efectivas. Vive en `greenhouse_client_portal.module_assignments` |
| **Resolver** | Funcion server-side que devuelve la lista de modulos activos de una organization. Unica fuente de verdad para "que ve un cliente" |
| **View code** | Identificador estable de una superficie del portal (ej. `cliente.proyectos`, `cliente.brand_intelligence`). Vive en `VIEW_REGISTRY` |
| **Vista base** | Superficie del portal que no es un producto vendible y por eso abre para cualquier organizacion, sin modulo: hoy Notificaciones, Configuracion y Novedades. Son tres a proposito; agregar una cuarta es una decision, no un atajo para destrabar una pagina |
| **Module-gated** | Pagina que solo abre si algun modulo vigente de la organizacion la declara. Son las otras seis de las nueve |
| **Page guard** | Helper server-side `requireViewCodeAccess` que valida acceso ANTES de renderizar la pagina |
| **Empty state honesto** | Pantalla con mensaje claro cuando el cliente intenta ver algo que no tiene, en vez de error 404 o pantalla blanca |
| **Cascade desde lifecycle** | Mecanismo automatico (TASK-828, pendiente) que materializa modulos cuando se completa el onboarding del cliente |
| **Bundle** | Conjunto de modulos incluidos en un `engagement_commercial_terms` (lo que comercial declara que el cliente compro) |
| **Addon** | Modulo individual que NO esta en el bundle base. Requiere activacion explicita por admin |
