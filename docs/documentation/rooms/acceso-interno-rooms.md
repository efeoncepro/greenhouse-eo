# Rooms — Acceso interno del equipo Efeonce

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-10-31 por Claude (TASK-2082/2083)
> **Ultima actualizacion:** 2026-10-31 por Claude
> **Documentacion tecnica:** [ADR acceso interno durable](../../architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md)

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

Ver el manual [Administrar el acceso interno](../../manual-de-uso/rooms/administrar-acceso-interno.md).
