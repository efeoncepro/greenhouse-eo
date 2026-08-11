# Operar Portal Cliente y Customer Experience

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-08-09 por Claude (orden de diagnostico y el estado "sin organizacion resuelta")
> **Modulo:** Portal Cliente / Customer Experience
> **Rutas:** `/home`, `/proyectos`, `/sprints`, `/equipo`, `/reviews`, `/analytics`, `/campanas`, `/updates`, `/notifications`, `/settings`, `/admin/client-portal/*`
> **Documentacion relacionada:** `docs/documentation/client-portal/portal-cliente-customer-experience-end-to-end.md`, `docs/manual-de-uso/client-portal/diagnosticar-modulo-no-visible-en-menu.md`, `docs/manual-de-uso/client-portal/menu-dinamico-y-empty-states.md`

## Para que sirve

Este manual sirve para operar la experiencia que ve un cliente en Greenhouse: que modulos aparecen, por que una ruta esta disponible o bloqueada, como diagnosticar empty states y como activar o pausar modulos sin saltarse permisos.

## Antes de empezar

Necesitas acceso admin con capabilities de Portal Cliente para gestionar catalogo/asignaciones. Si solo eres usuario cliente, puedes navegar tu portal y reportar problemas, pero no activar modulos.

Ten a mano:

- Organizacion cliente.
- Usuario afectado.
- Modulo o ruta reportada.
- Estado visible: normal, zero-state, not assigned, degraded o error.

## Activar un modulo para un cliente

1. Entra a la superficie admin de Portal Cliente.
2. Busca la organizacion cliente.
3. Revisa modulos disponibles en el catalogo.
4. Elige el modulo correcto.
5. Revisa si su `applicability_scope` calza con la business line del cliente.
6. Si no calza, usa override solo con razon operativa clara.
7. Guarda la asignacion.
8. Pide al cliente recargar sesion o espera la invalidacion de cache.
9. Verifica la ruta cliente relacionada.

## Pausar o deshabilitar un modulo

1. Identifica el modulo asignado.
2. Confirma si se trata de pausa temporal o baja.
3. Registra razon.
4. Aplica la accion desde Admin Center.
5. Verifica que el cliente ya no vea la ruta como activa.
6. Si corresponde, confirma que vea not assigned o estado informativo, no error generico.

## Diagnosticar "no veo una ruta"

El orden importa, y desde el 2026-08-09 empieza por el atajo: **pidele al cliente la direccion a la que
lo devolvio el portal.** El parametro despues del `?` dice cual de los cuatro resultados fue, y eso
descarta tres caminos de diagnostico de una sola vez. La tabla de parametros esta en
[Diagnosticar un modulo que no aparece en el menu](diagnosticar-modulo-no-visible-en-menu.md).

Con eso resuelto:

1. Confirma que el usuario sea el correcto y este en la organizacion correcta (una persona puede ser contacto de varias).
2. Si la pantalla es Notificaciones, Configuracion o Novedades, **no revises modulos**: son vistas base y abren para cualquier organizacion. Si esas no abren, el problema es la organizacion del usuario o una falla real.
3. Para el resto, revisa que el modulo que declara esa pantalla este asignado y vigente en la organizacion. **Este es el carril que decide.**
4. Revisa si la fuente de datos esta vacia o degradada (acceso correcto con cero datos es un estado valido).
5. Solo si el reporte es de una vista cliente que **no** depende de un modulo, revisa `view_registry` y los grants por rol.

**No empieces por `role_view_assignments`.** Para las pantallas que dependen de un modulo, ese carril no
decide el acceso: la puerta pregunta por el modulo contratado. Y ponerlas en otorgado convierte el acceso
en visibilidad por rol para todos los clientes con ese rol, hayan contratado o no.

## Que significan los estados

- **Normal:** acceso y datos listos.
- **Zero-state:** acceso correcto, pero aun no hay datos.
- **Not assigned:** el cliente no tiene comprado/activado ese modulo.
- **Sin organizacion resuelta:** la cuenta del usuario no llega a ninguna organizacion. No es contratacion: es onboarding, y activar modulos no lo arregla.
- **Degraded:** parte de la fuente falla o esta atrasada.
- **Error:** no se pudo resolver acceso o datos minimos. Desde el 2026-08-09 este estado **solo** aparece cuando la falla es real.

## Problemas comunes

### El cliente ve not assigned pero deberia ver el modulo

Revisa `module_assignments`. Si el modulo no esta asignado, actívalo por la UI admin. No edites la DB manualmente.

### El cliente ve zero-state y cree que es error

Explica que el modulo esta activo pero aun no hay datos. Revisa la fuente responsable antes de escalar.

### El cliente ve degraded

Revisa data source del modulo. Si depende de integraciones, mira `/admin/integrations` y runs recientes.

### El usuario tiene rol correcto pero no ve la vista

El rol no es el carril del portal cliente: revisa el **modulo asignado a la organizacion**. Desde el 2026-08-10 una sola respuesta gobierna el menu, el buscador rapido y la pagina, asi que si la pantalla no aparece en el menu tampoco va a abrir por URL — y al reves, si el modulo la incluye, aparece. Cambiar grants por rol para una vista cliente **no habilita nada**; lo que habilita es que el modulo contratado la declare.

Si lo que quieres es lo contrario —que una persona concreta **no** vea una pantalla que su organizacion si contrato— el instrumento es un override `revoke` para esa persona, que cierra la pagina y no solo esconde el enlace.

### El menu no muestra una pantalla que el cliente tenia antes

Antes del 2026-08-10 el menu se armaba por rol y la puerta decidia por modulo, asi que habia enlaces que se veian y no abrian (36 medidos, sobre los 8 usuarios cliente activos). Al alinearlos, esos enlaces dejaron de mostrarse. **Nadie perdio acceso**: no abrian antes tampoco. Si la pantalla deberia estar disponible, lo que falta es el modulo — revisa `/admin/...` la asignacion de la organizacion, no los grants por rol.

### El cliente no ve ningun enlace de modulo y alguna pantalla lo devuelve al inicio

Sospecha de la organizacion antes que del contrato. Si su cuenta no llega a ninguna organizacion, el portal no puede consultar modulos y activar cualquier cosa no cambia nada. Mira la senal `identity.client_portal.client_without_organization` en `/admin/operations` (steady cero) y escala a plataforma para reconciliar la cuenta.

### Un operador interno no puede abrir una pantalla de cliente

Con sesion interna se abren las nueve pantallas cliente por el bypass de soporte, sin necesitar ningun modulo. Si una devuelve la pagina de no autorizado, es un candado sobrante en esa pantalla y va a plataforma; no es un problema del cliente.

## Que no hacer

- No activar modulos insertando filas SQL sueltas.
- No cambiar route groups para "arreglar" un cliente.
- No dar rol admin a un usuario cliente.
- No ocultar un degraded como si fuera estado normal.
- No asumir que business line equivale automaticamente a modulo comprado.
- No tocar los permisos de vista por rol para destrabar una pantalla que depende de un modulo: le abre la pantalla a todos los clientes con ese rol.
- No presentar "no tienes este modulo" como una falla de servicio, ni al reves: son dos conversaciones distintas con el cliente.

## Referencias tecnicas

- `src/lib/client-portal/commands/enable-module.ts`
- `src/app/api/client-portal/modules/route.ts`
- `src/app/api/admin/client-portal/**`
- `greenhouse_client_portal.modules`
- `greenhouse_client_portal.module_assignments`
- `greenhouse_client_portal.module_assignment_events`
