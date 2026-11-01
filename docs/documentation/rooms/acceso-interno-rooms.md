# Rooms — Acceso interno del equipo Efeonce

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-10-31 por Claude (TASK-2082/2083)
> **Ultima actualizacion:** 2026-11-01 por Claude (TASK-2085)
> **Documentacion tecnica:** [ADR acceso interno durable](../../architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md) · [API y acceso: espacio de trabajo y entrada sin sesión](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md#acceso-interno-y-espacio-de-trabajo--vigente-al-2026-11-01)

## Qué resuelve

El 2026-10-31 el dueño de Rooms no pudo entrar: su acceso de prueba duraba dos horas y había vencido sin aviso, y
la pantalla mostró un mensaje técnico. Desde ahora el acceso del equipo se administra dentro de Rooms, dura hasta un
año, avisa antes de vencer y nunca puede quedar sin nadie que lo administre.

## Cómo funciona

| Paso | Qué pasa |
|---|---|
| 1. La persona entra con Efeonce ID | Efeonce ID confirma quién es. No dice qué puede hacer en Rooms. |
| 2. Si no tiene acceso | Rooms muestra «Casi.» y un código de solicitud de 8 caracteres, válido por 7 días. |
| 3. La persona comparte el código | Se lo pasa a quien administra Rooms en Efeonce. |
| 4. El administrador da acceso | Con el código, elige rol (operador o administrador), permisos y vigencia (máximo un año). |
| 5. La persona vuelve a entrar | Llega a su espacio. |

> Detalle técnico: comandos `members.grantInternal`, `members.renewInternal`, `members.revokeInternal` y lectura
> `members.list` en `efeonce-rooms` `src/server/access/**`.

## Si entras sin haber iniciado sesión

Si abres la casa del equipo (`/rooms`) o la actividad de una sala sin una sesión de Rooms, vas directo a Efeonce ID,
que muestra «Entra a Rooms». No ves una pantalla de carga antes. Rooms guarda la página que habías abierto (y, si
venías desde el aviso de una acción de agente, esa acción) para devolverte ahí cuando terminas de entrar. El recorrido
completo con una persona real todavía no se ha verificado.

Si tu sesión venció, Rooms igual abre la página y ahí te pide entrar de nuevo: quien decide si puedes pasar es Rooms,
no el atajo de la entrada.

> Detalle técnico: el proxy de Rooms responde 307 a `/login?returnTo=…` cuando no hay ninguna cookie de sesión
> (interna o de invitado) y sólo conserva `?accion=`. Antes la página mostraba «Cargando la sala…» y redirigía sin
> 307 ([ISSUE-188](../../issues/resolved/ISSUE-188-rooms-anonymous-entry-rsc-redirect-flash.md)). Código:
> `efeonce-rooms` `src/proxy.ts` y `src/server/agents/anonymous-entry.ts`.

## El nombre del espacio de trabajo

Cada organización de Rooms puede tener un nombre legible, por ejemplo «Efeonce». Aparece en el encabezado y en el
selector de espacio, en lugar del identificador técnico. Si un espacio todavía no tiene nombre, o Rooms no puede
leerlo en ese momento, se muestra «Espacio de trabajo» y puedes entrar igual.

- Sólo quien administra miembros puede cambiar el nombre. Para cualquier otra persona, el espacio «no existe» a
  efectos de ese cambio.
- El nombre va de 1 a 80 caracteres; los espacios al inicio y al final se quitan.
- Cada cambio queda registrado con quién lo hizo: una persona o un agente, y por qué canal.

> Detalle técnico: comando `organization.rename` (capacidad `members.manage`), tabla
> `rooms.organization_profiles` y lectura `profile.get.organizationName`. Cómo hacerlo:
> [Nombrar el espacio de trabajo](../../manual-de-uso/rooms/nombrar-espacio-de-trabajo.md).

## Reglas

- Un rol en Greenhouse o en Efeonce ID no da acceso a Rooms. El acceso se da en Rooms.
- Sólo un administrador con el permiso de administrar miembros puede dar, renovar o quitar acceso.
- Nadie puede dar un permiso que no tiene.
- Todo acceso vence. Se avisa 30 días antes y se renueva con un comando. Quien tenga la renovación automática
  (el dueño la tiene) recupera un año completo cada vez que entra, así que no vence mientras use Rooms.
- La organización nunca puede quedar sin administrador por un cambio: Rooms lo rechaza y la base de datos también.
- Si no hay ningún administrador, el primero se crea con una herramienta administrativa que exige la credencial de la
  base y una autorización humana escrita.

## Cuando el ingreso falla

En vez de un mensaje técnico, Rooms muestra una página con la palabra del motivo, qué pasó y qué hacer:

| Motivo | Lo que ve la persona |
|---|---|
| Sin acceso a Rooms | «Casi.» y el código de solicitud |
| El intento venció | «Otra vez.» y «Volver a entrar» |
| Muchos intentos | «Pausa.» y esperar cinco minutos |
| Falla de nuestro lado | «Espera.» y «Reintentar» |
| Rooms no está abierto en ese entorno | «Aún no.» sin botón |

> Detalle técnico: `/auth/error` (TASK-2083), copy en `src/lib/copy/rooms.ts` (`ACCESS_ISSUE_COPY`).

## Cómo operarlo

Ver los manuales [Administrar el acceso interno](../../manual-de-uso/rooms/administrar-acceso-interno.md) y
[Nombrar el espacio de trabajo](../../manual-de-uso/rooms/nombrar-espacio-de-trabajo.md).
