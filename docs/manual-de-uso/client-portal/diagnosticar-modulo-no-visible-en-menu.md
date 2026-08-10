# Diagnosticar un modulo contratado que no aparece en el menu del cliente

> **Tipo de documento:** Manual de uso
> **Version:** 1.2
> **Creado:** 2026-08-09 por Claude (TASK-1675)
> **Ultima actualizacion:** 2026-08-09 por Claude (los dos releases del dia ya estan en produccion, con Creative asignado a Sky Airlines)
> **Modulo:** Client Portal
> **Rutas en portal:** `/admin/client-portal/organizations/[organizationId]/modules`, `/admin/client-portal/catalog`
> **Documentacion relacionada:** [Menu del Portal Cliente — modulos contratados](../../documentation/client-portal/menu-portal-cliente-modulos.md), [Menu dinamico y empty states — operacion](menu-dinamico-y-empty-states.md), [GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md) §12.1

## Delta 2026-08-09 — ahora la pagina te dice cual de los cuatro casos es

Hasta este dia el diagnostico era ciego: las nueve paginas guardadas del portal cliente rebotaban con
el mismo mensaje de error ("el servicio no esta disponible") para situaciones distintas, asi que el
reporte del cliente no te daba informacion. Ahora **la URL a la que rebota dice el caso**, y eso
acorta el diagnostico a un paso:

| A donde rebota | Que significa | Que hacer |
|---|---|---|
| La pagina abre | Es vista base (Notificaciones, Configuracion, Novedades) o su organizacion tiene el modulo | nada |
| `/home?denied=<algo>` | El fail-closed correcto: no tiene el modulo que gobierna esa pagina | seguir el paso a paso de abajo; puede ser decision comercial |
| `/home?error=organization_unresolved` | Su usuario no tiene organizacion resuelta | **no es un problema de modulos**: es el onboarding de ese cliente. Escalar con la senal `identity.client_portal.client_without_organization` de `/admin/operations` |
| `/home?error=resolver_unavailable` | El resolver fallo de verdad | escalar: revisar `/admin/operations` |

**Como ver a donde rebota sin pedirle nada al cliente:** en el navegador, la barra de direcciones
muestra la URL final despues del rebote. Si el cliente te manda una captura, el parametro despues del
`?` es el que importa.

**Con tu propia sesion interna abres las nueve paginas cliente.** Es el bypass de soporte y no
necesitas ningun modulo. Si alguna te devuelve la pagina de no autorizado, eso es un defecto del portal
—no un problema del cliente ni de su modulo— y va a plataforma. Ocurrio con `/proyectos`, que era la
unica de las nueve que conservaba un candado viejo por grupo de rutas encima del canonico; quedo
corregido y verificado en produccion el 2026-08-09.

**Antes de diagnosticar, ten presente que dos paginas no abren para nadie hoy.** Ciclos (`/sprints`) y
Analytics (`/analytics`) quedaron dependiendo de un modulo y ningun modulo del catalogo las declara, asi
que muestran el empty state para todas las organizaciones. Si el reporte es sobre una de esas dos, no
hay nada que activar desde la pantalla de modulos: es deuda conocida y se cierra declarandolas en el
modulo que corresponda. Y las cuatro paginas Creative —Proyectos, Campanas, Equipo, Revisiones— hoy solo
abren para **Sky Airlines**, que es la unica organizacion con el modulo Creative Hub Globe.

## Para que sirve

Para atender el reporte mas frecuente del portal cliente: **"contrate X y no lo veo en el menu"**. Te lleva desde el reporte hasta una de cuatro conclusiones: falta activar el modulo, esta activado y el cliente solo necesita recargar, es una pantalla que por diseno no tiene enlace propio, o hay una falla que se escala.

Este manual cubre el **enlace en el menu**. Para activar un modulo por primera vez, pausarlo o darlo de baja con todo el detalle del formulario, usa [Menu dinamico y empty states — operacion](menu-dinamico-y-empty-states.md) (casos 1 y 2). Para los mensajes que ve el cliente cuando entra a una pantalla que no tiene, el caso 4 del mismo manual.

## Antes de empezar

Necesitas:

- Sesion de administrador de Efeonce con la capacidad de lectura de asignaciones del portal cliente (`client_portal.module.read_assignment`). Sin ella la pantalla de modulos te manda a `/401`.
- El identificador de la organizacion del cliente. Es el identificador de la organizacion canonica, no el del contacto ni el de la persona que reporta.
- Para las verificaciones en base de datos: `pnpm pg:connect:shell` (levanta el proxy y abre la consola SQL). Todo lo de este manual es de **solo lectura**.

Ten claro antes de empezar que **el menu no otorga acceso**. Cada pantalla vuelve a preguntar por su cuenta si la organizacion tiene el modulo. Si el cliente entra por direccion directa y la pantalla funciona, el modulo esta contratado y el problema es de navegacion, no de permisos.

## Paso a paso

### 1. Confirma de que organizacion habla el reporte

Una persona puede ser contacto de mas de una empresa. Confirma con que cuenta inicio sesion antes de mirar nada mas. Si el cliente tiene varias, pidele que cierre sesion y vuelva a entrar con la correcta.

### 2. Mira las asignaciones vigentes de esa organizacion

Entra a `/admin/client-portal/organizations/<identificador-de-la-organizacion>/modules`.

La tabla lista **todas** las asignaciones historicas de esa organizacion, no solo las vigentes. Busca la fila del modulo y lee tres columnas juntas: el **estado**, la fecha de **fin de vigencia** y la fecha de **vencimiento**.

- No existe la fila → el modulo nunca se activo. Ve al paso 3.
- Existe y esta vigente → ve al paso 4.
- Existe pero esta pausada, expirada o dada de baja → el menu esta correcto. Confirma con comercial si corresponde reactivarla.

### 3. Si falta, habilitalo desde esa misma pantalla

Usa el boton de habilitar modulo de la pantalla de modulos de la organizacion. El formulario te pide el modulo del catalogo, el estado inicial, el origen de la activacion y un motivo. El paso a paso completo del formulario esta en el caso 1 de [Menu dinamico y empty states — operacion](menu-dinamico-y-empty-states.md).

Nunca insertes la fila con SQL: la accion de la pantalla ademas deja auditoria, emite el evento correspondiente y limpia la memoria temporal del portal. Un `INSERT` a mano no hace nada de eso.

### 4. Si esta vigente, pide una carga completa

El menu del cliente se calcula al entrar al portal. **Moverse entre pantallas no lo vuelve a calcular.** Pidele al cliente que recargue la pagina o que vuelva a entrar.

Si acabas de activarlo recien, espera hasta alrededor de un minuto antes de concluir que algo falla: el portal recuerda la respuesta por un rato corto y corre en varias instancias.

### 5. Si sigue sin verse, separa "no hay enlace" de "no hay acceso"

Pidele al cliente que abra la direccion de la pantalla directamente.

| Lo que pasa | Que significa | Que hacer |
|---|---|---|
| La pantalla abre con sus datos | El modulo esta bien contratado; falta el enlace | Ve al paso 6 |
| Le avisa que el modulo no esta disponible en su cuenta (como tarjeta en la pantalla o devolviendolo al inicio) | La pantalla no encuentra el modulo vigente para esa organizacion | Vuelve al paso 2. Si en el paso 2 y en el paso 7 la asignacion SI aparece vigente, la pantalla y el menu estan leyendo cuentas distintas: escala a plataforma con el identificador de la organizacion |
| Lo devuelve al inicio con un aviso de problema temporal | Falla de lectura de modulos | Escala a plataforma; revisa alertas del dominio `client_portal` |

### 6. Comprueba si esa pantalla tiene enlace propio por diseno

Hay pantallas que son **hijas** de otra: no tienen linea en el menu y se alcanzan desde su pantalla padre. El caso vivo hoy es el informe SEO, que se abre con el boton "Ver informe" del encabezado del panel SEO.

Si el cliente esta buscando una pantalla hija, el menu esta correcto: explicale la ruta de acceso. Si es una pantalla que deberia tener enlace propio y no lo tiene, es un caso para plataforma: falta su descriptor de navegacion.

### 7. Verificacion en base de datos (solo lectura)

Cuando necesites evidencia dura de que ve el portal para esa organizacion:

```sql
-- En psql via pnpm pg:connect:shell
SELECT a.module_key, a.status, a.effective_to, a.expires_at, m.view_codes, m.tier
FROM greenhouse_client_portal.module_assignments a
JOIN greenhouse_client_portal.modules m ON m.module_key = a.module_key
WHERE a.organization_id = '<identificador-de-la-organizacion>'
  AND a.effective_to IS NULL
  AND m.effective_to IS NULL
  AND (a.expires_at IS NULL OR a.expires_at > now())
  AND a.status IN ('active','pilot')
ORDER BY m.tier, m.display_label;
```

Esas filas son exactamente las que alimentan el menu y las puertas de las pantallas. La columna de codigos de vista dice que pantallas habilita cada modulo.

## Que significan los estados

| Estado de la asignacion | Se ve en el menu | Que significa |
|---|---|---|
| `active` | Si | Modulo contratado y en uso |
| `pilot` | Si, hasta la fecha de vencimiento | Piloto o prueba con fecha de termino |
| `pending` | No | Registrada pero todavia sin efecto para el cliente |
| `paused` | No | Suspension temporal; la asignacion se conserva |
| `expired` | No | Un piloto que llego a su fecha de vencimiento |
| `churned` | No | Baja definitiva |

Ademas de estos estados, dos fechas apagan el enlace aunque el estado se vea bien: una **fecha de fin de vigencia** ya puesta (la asignacion fue reemplazada por otra) y una **fecha de vencimiento** ya pasada.

## Que no hacer

- **No toques la tabla de permisos de vista por rol para "arreglar" esto.** No agrega enlaces de modulo, y en las pantallas que dependen de un modulo esta escrita a proposito con el permiso en "no": ponerlo en "si" convierte el acceso en visibilidad por rol para **todos** los clientes con ese rol, hayan contratado o no. Esa tabla ademas solo se agrega, nunca se borra.
- **No edites asignaciones con SQL.** Ni `INSERT`, ni `UPDATE`, ni `DELETE`. Las acciones de la pantalla de administracion dejan auditoria, emiten evento y refrescan el portal; el SQL a mano deja el sistema inconsistente y sin rastro de quien lo hizo.
- **No pidas agregar el enlace al codigo del menu.** El enlace tiene que salir de lo contratado. Un enlace escrito a mano se ve para clientes que no compraron el modulo y hay que repetirlo en cada cliente nuevo.
- **No dejes la direccion directa como solucion.** Es un parche de una conversacion, no un arreglo: el cliente no la va a recordar y el resto de su equipo nunca la va a tener.
- **No concluyas que "no tiene acceso" porque no ve el enlace.** Comprueba primero con la direccion directa (paso 5): son dos cosas distintas.

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| Activaste el modulo y el cliente sigue sin verlo | El cliente esta navegando dentro del portal sin recargar | Pidele que recargue la pagina o vuelva a entrar |
| Lo ve un usuario del cliente y otro no | Estan en organizaciones distintas | Confirma con que cuenta inicio sesion cada uno (paso 1) |
| El menu se ve como siempre pero falta un modulo que si esta vigente | La lectura de modulos fallo y el portal degrado al menu base | Revisa alertas del dominio `client_portal`; escala a plataforma |
| El cliente no ve **ningun** enlace de modulo, y alguna pantalla le dice que su cuenta no tiene una organizacion asociada | Su usuario quedo sin organizacion resuelta; sin ella el portal ni siquiera consulta los modulos | No es un problema de contratacion. Escala a plataforma: hay que reconciliar la organizacion del cliente antes de que cualquier modulo se vea |
| Un usuario interno de Efeonce no ve el modulo del cliente | Es lo esperado: los internos no arman su menu desde modulos contratados | Para dar soporte, los internos entran a las pantallas de cliente por direccion directa |
| La pantalla existe y funciona, pero nunca tuvo linea propia en el menu | Es una pantalla hija | Explica desde donde se alcanza (paso 6) |
| Se ve un enlace de un modulo que no aparece en la tabla de asignaciones | Viene del bloque antiguo que arma unos pocos enlaces desde la linea de negocio y los servicios de la cuenta | Deuda conocida, pendiente de migrar; no la "arregles" borrando asignaciones |
| El cliente ve el enlace (Proyectos, Ciclos, Equipo, Revisiones, Analytics o Campanas) pero al entrar le dice que el modulo no esta activado | Esos seis enlaces todavia se muestran por rol, no por lo contratado. El enlace promete de mas; la puerta esta bien | Explicale que la pantalla depende del modulo y confirma en el paso 2 si corresponde activarlo. **No** le quites permisos de vista al rol para ocultar el enlace: apagarias enlaces legitimos de otros clientes con ese rol. Deuda conocida, pendiente de migrar |
| Un cliente con Creative Hub Globe reporta que el enlace "Creative Hub" no lleva a ninguna parte | Tiene razon: el modulo declara esa superficie y la direccion todavia no existe en el portal | No hay nada que activar. Es la deuda de paginas placeholder; registra el reporte y sigue |

## Referencias tecnicas

- Contrato canonico del menu: [GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md) §12.1
- Invariantes para agentes: [ORG_CLIENT_AGENT_INVARIANTS.md](../../architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md)
- Resolver de modulos: [src/lib/client-portal/readers/native/module-resolver.ts](../../../src/lib/client-portal/readers/native/module-resolver.ts)
- Composicion de los items del menu: [src/lib/client-portal/composition/menu-builder.ts](../../../src/lib/client-portal/composition/menu-builder.ts)
- Suma de los items al menu: [src/components/layout/vertical/VerticalMenu.tsx](../../../src/components/layout/vertical/VerticalMenu.tsx)
- Puerta de cada pantalla cliente: [src/lib/client-portal/guards/require-view-code-access.ts](../../../src/lib/client-portal/guards/require-view-code-access.ts)
- Acciones de activacion / pausa / baja: [src/lib/client-portal/commands/](../../../src/lib/client-portal/commands/)
