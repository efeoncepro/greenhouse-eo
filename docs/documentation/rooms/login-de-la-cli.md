# Rooms — Login de la CLI para agentes

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-11-02 por Claude
> **Ultima actualizacion:** 2026-11-02 por Claude
> **Documentacion tecnica:** [ADR del carril de agentes, § Fin del login en el navegador](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#fin-del-login-en-el-navegador-2026-11-02) · [Enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01)

## Qué resuelve

Los agentes (Claude Code, Codex) arman, publican e invitan en Rooms desde la terminal. Para hacerlo con tu
autoridad, entras **una vez** con Efeonce ID desde la CLI (`pnpm rooms login`). Después el agente trabaja sin
pedirte el segundo factor en cada acción, y todo lo que haga queda a tu nombre, con aviso y forma de revertirlo.

## Cómo funciona

1. Ejecutas `pnpm rooms login` y se abre el navegador en Efeonce ID.
2. Entras, completas el segundo factor y aceptas lo que el agente podrá hacer en Rooms.
3. Efeonce ID devuelve el navegador a tu propio equipo. La CLI termina el login por su cuenta y guarda una
   credencial privada en tu equipo.
4. Recién entonces el navegador pasa a una página de Rooms que te dice cómo terminó.

La credencial nunca pasa por la dirección de esa página: la página solo sabe si salió bien o por qué no.

> Detalle técnico: [ADR, § Fin del login en el navegador](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#fin-del-login-en-el-navegador-2026-11-02); código en `efeonce-rooms/scripts/lib/rooms-cli-auth.ts`.

## Las dos páginas de fin

Las dos páginas usan la órbita de la marca en reposo, rodeando una palabra, y muestran el logo oficial de Efeonce ID
en la fila «Acceso con». Son públicas porque el flujo de la CLI no tiene sesión de Rooms, y no aparecen en buscadores.

| Página | Palabra | Qué te dice |
| --- | --- | --- |
| Conectado | **Listo** | «Tu agente ya tiene acceso.» Ya puedes volver a la terminal. Para quitarle el acceso: `pnpm rooms logout`. |
| No se conectó | **Casi** | «No pudimos conectar tu agente.» y el motivo. Para intentarlo de nuevo: `pnpm rooms login`. |

La página «Listo» solo aparece cuando la credencial ya quedó guardada.

## Los motivos de «Casi»

La página solo muestra uno de estos cuatro motivos; nunca muestra texto que venga de afuera.

| Motivo | Qué pasó |
| --- | --- |
| Acceso cancelado (`denied`) | Cancelaste en Efeonce ID o el acceso no se autorizó. No se guardó nada. |
| Respuesta que no corresponde (`state`) | Lo que llegó no pertenece a este inicio de sesión, así que se descartó por seguridad. |
| Respuesta de otro emisor (`issuer`) | Lo que llegó no vino de Efeonce ID, así que se descartó por seguridad. |
| Algo falló (`failed`) | El login no se pudo completar. No se guardó nada. Es también el caso genérico. |

En todos los casos, lo que hay que hacer es volver a la terminal y repetir `pnpm rooms login`.

> Detalle técnico: páginas `efeonce-rooms/src/app/cli/conectado/page.tsx` y `src/app/cli/error/page.tsx`; copy en
> `src/lib/copy/invitations.ts` (`access.cli`); test `tests/agent-cli-login.test.ts`.

## Qué no hace

- No da acceso a Rooms por sí sola: si tu acceso interno a un espacio venció, el login sale «Listo» pero los
  comandos responden 401 hasta que te lo renueven.
- No sirve para personas externas o invitadas: el carril es solo para el equipo interno.

## Cómo operarlo

Paso a paso, estados y problemas comunes: [Operar Rooms con agentes por CLI](../../manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md).
