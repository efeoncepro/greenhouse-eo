# Menu dinamico y acceso a modulos del Portal Cliente

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-13 por Claude (TASK-827)
> **Ultima actualizacion:** 2026-05-13 por Claude
> **Documentacion tecnica:** [GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md), [GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md)

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

## Las 5 situaciones que el cliente puede ver

Cuando un cliente entra al portal, el sistema verifica que modulos tiene activos y decide que mostrarle. Hay cinco situaciones canonicas:

### 1. Funcionamiento normal

El cliente tiene sus modulos activos. El menu izquierdo muestra solo los items correspondientes a sus modulos. Cada click lleva a la pagina real.

Ejemplo Globe full bundle: el cliente ve **Pulse, Proyectos, Ciclos, Equipo, Revisiones, Campanas** + el grupo "Modulos" con sus addons + "Mi Cuenta" con Notificaciones y Settings.

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

---

## Por que las paginas tienen guardia (page guards)

Antes de TASK-827, algunas paginas como `/notifications` y `/campanas` no tenian validacion: cualquiera que conociera la URL podia entrar directo. Otras paginas validaban con un sistema legacy que se basaba en grupos de rutas, no en modulos especificos.

Ahora cada pagina cliente tiene una **guardia canonica** (`requireViewCodeAccess`) que valida acceso server-side antes de renderizar:

1. Si el usuario es admin interno de Efeonce, pasa sin restriccion (acceso de soporte legitimo)
2. Si el usuario es cliente, el sistema consulta el resolver con su `organizationId`
3. Si el cliente tiene el modulo que provee esa pagina, entra normalmente
4. Si NO lo tiene, redirige al Home con el mensaje contextual (situacion #3 arriba)
5. Si el resolver falla, redirige al Home con el modo error (situacion #5 arriba)

Las 9 paginas con guardia canonica hoy son: `/proyectos`, `/sprints`, `/equipo`, `/campanas`, `/reviews`, `/analytics`, `/updates`, `/notifications`, `/settings`.

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

- **Algunas paginas son placeholder forward-looking**: la base de datos declara modulos como `creative_hub_globe_v1` con superficies como `/creative-hub`, `/brand-intelligence`, etc. — pero las paginas reales todavia no existen como views. Si comercial activa esos modulos hoy, el cliente vera el menu item pero al hacer click obtendra una pagina vacia. La task derivada `client-portal-pages-placeholder-materialization` (V1.1) crea las views.
- **El menu vertical legacy coexiste**: el componente `VerticalMenu` que renderiza el menu izquierdo todavia usa el sistema viejo (`canSeeView('cliente.*', true)`). Las paginas SI usan el resolver nuevo, asi que el gating real esta vivo. La refactor full del menu para consumir el resolver vive en task derivada V1.1.
- **El email del account manager es generico**: los botones "Solicitar acceso" usan `support@efeoncepro.com` como destino por ahora. La resolucion canonical (leer del campo `organizations.account_manager_user_id`) vive en task derivada V1.1.
- **Sin self-service del cliente**: el cliente no puede solicitar un modulo desde su portal todavia. Si quiere uno, escribe al account manager via el mailto. El flow self-service con aprobacion operativa vive en V1.1.

---

## Para equipo comercial y account: que cambia para ti

- Tu account ahora puede tener una matriz real de modulos contratados. Ya no es "Globe vs Wave vs CRM Solutions" como dimensiones binarias — cada modulo (incluyendo addons) se activa o desactiva individualmente.
- Para vender un addon a un cliente Globe existente: activalo desde `/admin/client-portal/organizations/[orgId]/modules` y avisa al cliente que en su proxima sesion lo va a ver.
- Si un cliente reporta que "no veo X cosa" o "me sale un mensaje raro": revisa que modulos tiene activos en su organization. El portal solo le muestra lo que su comercial le encendio.

> Detalle operativo paso a paso: [Manual de uso del portal cliente — menu dinamico y empty states](../../manual-de-uso/client-portal/menu-dinamico-y-empty-states.md)

---

## Para equipo de operaciones: como saber si esto esta funcionando

En `/admin/operations` el subsystem **Identity & Access** ahora incluye un signal nuevo: `client_portal.composition.resolver_failure_rate`. Hoy emite estado `unknown` (V1.0 scaffold); cuando TASK-829 cierre, va a reportar el porcentaje real de fallas del resolver y va a alertar si pasa del 1%.

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
| **Page guard** | Helper server-side `requireViewCodeAccess` que valida acceso ANTES de renderizar la pagina |
| **Empty state honesto** | Pantalla con mensaje claro cuando el cliente intenta ver algo que no tiene, en vez de error 404 o pantalla blanca |
| **Cascade desde lifecycle** | Mecanismo automatico (TASK-828, pendiente) que materializa modulos cuando se completa el onboarding del cliente |
| **Bundle** | Conjunto de modulos incluidos en un `engagement_commercial_terms` (lo que comercial declara que el cliente compro) |
| **Addon** | Modulo individual que NO esta en el bundle base. Requiere activacion explicita por admin |
