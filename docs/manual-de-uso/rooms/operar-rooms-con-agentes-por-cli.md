# Operar Rooms con agentes por CLI (login una vez)

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-11-01 por Claude (TASK-2087, TASK-2095)
> **Ultima actualizacion:** 2026-11-02 por Claude (páginas de fin del login, `--organization`, carril encendido en producción, aceptación, lecciones y apagado)
> **Documentacion tecnica:** [ADR del carril de agentes, enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01) · [contrato OAuth de Efeonce ID](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md)

## Para qué sirve

Que un agente (Claude Code, Codex) arme, publique e invite en Rooms **sin pedirte MFA en cada acción**. Funciona
como `gh` o `gcloud`: entras una vez con Efeonce ID en el navegador y la CLI guarda una credencial privada en tu
equipo que se renueva sola. El agente actúa con **tu** autoridad, ni más ni menos, y cada acción queda atribuida a
él («publicado por claude-code para ti») con su aviso y su reversa.

**Estado al 2026-11-02:** el carril está **encendido en producción** (`efeonce-rooms.vercel.app`) y aceptado. Efeonce
ID ya emite tokens para Rooms y Rooms los verifica. El gateway MCP remoto (un agente sin CLI local) sigue pendiente.

## Antes de empezar

- Tener acceso interno vigente en el espacio de Rooms donde vas a trabajar (si no, Rooms responde 401 aunque el
  login funcione).
- Estar en el repo `efeonce-rooms` (`pnpm install` hecho).
- El carril debe estar encendido en ese Rooms: `curl -s https://efeonce-rooms.vercel.app/.well-known/oauth-protected-resource`
  responde 200 con la audiencia, el emisor y el cliente. Si responde 404, está apagado (`ROOMS_AGENT_LANE_ENABLED`).
- Conocer el id del espacio de trabajo (organización) donde vas a operar, por ejemplo
  `org-2df565fb-98aa-42f7-b324-ea9a2209017f` para «Efeonce». Lo pasas con `--organization`.

## Paso a paso

1. **Entrar una vez.** Abre el navegador, entras con Efeonce ID y MFA, y consientes las clases de Rooms (lectura,
   autoría, publicación y acceso; las tres últimas piden el segundo factor al consentir).

   ```bash
   pnpm rooms login --base-url https://efeonce-rooms.vercel.app
   ```

   Si el navegador no se abre solo, copia el enlace que imprime. Al terminar, la terminal muestra
   `"loggedIn": true` y el navegador cae en una página de Rooms que dice **«Listo»** (ver
   [Qué ves en el navegador al terminar](#qué-ves-en-el-navegador-al-terminar)).

2. **Comprobar.** No imprime tokens: solo quién eres, qué clases tienes y cuándo vence el acceso corto.

   ```bash
   pnpm rooms whoami --base-url https://efeonce-rooms.vercel.app
   ```

3. **Dejar que el agente trabaje.** El agente usa los mismos comandos de siempre, sin `--session-file`, y se
   declara con `--agent`:

   ```bash
   pnpm rooms list --base-url https://efeonce-rooms.vercel.app --organization ORG --agent claude-code
   pnpm rooms execute --base-url https://efeonce-rooms.vercel.app --organization ORG --agent claude-code \
     --operation rooms.create --input sala.json --idempotency-key sala:rooms.create:v1
   ```

   `--organization` elige el espacio de trabajo en que actúa el agente (la CLI lo envía como encabezado
   `X-Rooms-Organization`). Tu acceso interno se evalúa en ese espacio: si no lo tienes ahí, Rooms responde 401 aunque
   el login sea válido. `--agent` solo da nombre a la atribución (`cli/claude-code`); no amplía permisos.

   El MCP stdio local también lo usa: omite `--session-file` y toma el login guardado. `--session-file` (cookie de una
   sesión humana) sigue funcionando; si mandas las dos cosas, gana la cookie.

4. **Cerrar.** Revoca la credencial en Efeonce ID (corta en menos de 30 s) y la borra del equipo:

   ```bash
   pnpm rooms logout --base-url https://efeonce-rooms.vercel.app
   ```

## Qué hace un agente solo: la sala Volta (aceptación del 2026-11-02)

El operador corrió `pnpm rooms login` **una vez**. Sin pedirle nada más, el agente:

1. creó la sala `demo-volta` («Campaña «Llega antes»», marcada `synthetic`/`fixture`) en el espacio «Efeonce»;
2. subió 5 imágenes y dejó la cobertura en cero;
3. revisó la sala con «Ver como» comprador;
4. publicó la edición.

No invitó a nadie: invitar a una persona real sigue siendo una decisión tuya. Fueron 17 acciones, todas atribuidas a
`cli/claude-code`, cada una con su aviso y su reversa. Después se probó `logout` (`revoked: true`) y un segundo
`login` que terminó en «Listo»; el agente siguió leyendo con la credencial nueva.

## Qué ves en el navegador al terminar

Cuando Efeonce ID te devuelve, la CLI termina el login por su cuenta y recién entonces manda el navegador a una de
dos páginas públicas de Rooms. Las dos usan la órbita de la marca y muestran el logo de Efeonce ID en la fila
«Acceso con». La dirección de la página no lleva códigos ni tokens: solo el resultado.

| Página | Qué dice | Qué significa | Qué hacer |
| --- | --- | --- | --- |
| `/cli/conectado` | **«Listo»** · «Tu agente ya tiene acceso.» | La credencial ya quedó guardada en tu equipo. Esta página solo aparece después de guardarla. | Vuelve a la terminal. Para quitarle el acceso al agente: `pnpm rooms logout`. |
| `/cli/error` | **«Casi»** · «No pudimos conectar tu agente.» + el motivo | No se conectó. El motivo sale de una lista cerrada (abajo). | Vuelve a la terminal y repite `pnpm rooms login`. |

Los motivos de «Casi»:

| Motivo | Qué pasó, en simple | Qué hacer |
| --- | --- | --- |
| `denied` | Cancelaste en Efeonce ID o el acceso no se autorizó. No se guardó nada. | Repite `pnpm rooms login` y acepta el consentimiento. |
| `state` | La respuesta que llegó no corresponde a este inicio de sesión (por ejemplo, un enlace viejo o de otra terminal), así que se descartó por seguridad. | Empieza de nuevo desde la terminal y usa solo el enlace que acaba de imprimir. |
| `issuer` | La respuesta no vino de Efeonce ID, así que se descartó por seguridad. | Empieza de nuevo. Si se repite, avisa a Plataforma. |
| `failed` | Algo falló al conectar (por ejemplo, Efeonce ID rechazó el canje del código o no se pudo guardar la credencial). No se guardó nada. | Repite `pnpm rooms login`. La terminal muestra el detalle del error. |

Si la página recibe un motivo que no está en la lista, muestra el caso genérico (`failed`).

## Qué significan los estados

| Ves | Significa |
| --- | --- |
| `"loggedIn": true` | La credencial quedó en `~/.config/efeonce-rooms/credentials.json` (0600) |
| `401` en un comando | Tu acceso interno a ese espacio venció o fue revocado, o la credencial se revocó |
| `403` en un comando | El token no tiene la clase que exige esa operación (por ejemplo, publicar sin `release`) |
| `La sesión de la CLI de Rooms venció o fue revocada` | El refresh dejó de valer (revocado, reusado o > 90 días): vuelve a `login` |
| `Este Rooms todavía no acepta el carril de agentes` | `ROOMS_AGENT_LANE_ENABLED` está apagado en ese Rooms |

## Lecciones para el agente

- **Crea la sala con `assetRefs` vacío** y adjunta las imágenes después. Si la creas con `assetRefs` que traen versiones
  `av-*`, `attachAsset` responde `conflict`.
- **Ante un 409, relee y reintenta con una clave de idempotencia nueva.** La revisión de la sala avanza sola en segundo
  plano (derivados de las imágenes); reintentar con la misma clave repite el conflicto.
- **El reader `media` devuelve una lista**, no un objeto: recórrela.
- Trabaja desde una ruta corta. Un checkout bajo `/private/tmp` rompe la base local (el socket supera 103 bytes) y la
  resolución de `@swc`.

## Apagar el carril

Hay tres interruptores, de lo más acotado a lo más amplio. Cualquiera corta a los agentes en menos de 30 s (es el
tiempo máximo de caché de la introspección en Rooms) y ninguno toca el acceso de las personas por navegador.

| Interruptor | Dónde | Qué corta |
| --- | --- | --- |
| `ROOMS_AGENT_LANE_ENABLED=false` | Vercel, proyecto `efeonce-rooms` (redeploy y alias manual) | Rooms deja de aceptar bearers de la CLI; la metadata responde 404. |
| Suspender el cliente `efeonce-rooms-cli` | Efeonce ID | Todas las CLIs de todas las personas a la vez; los refresh dejan de valer. |
| Vaciar `AUTH_SERVER_ROOMS_AUDIENCE` | Efeonce ID (variable de repo GitHub + deploy gobernado) | Efeonce ID deja de emitir tokens para Rooms (`rooms_audience_disabled`). |

Para quitarle el acceso solo a tu equipo, basta `pnpm rooms logout`. El detalle operativo de cada interruptor está en
[Operar Rooms en producción](operar-produccion-rooms.md) y en el
[manual del autorizador](../identity/operar-autorizador-efeonce.md).

## Qué no hacer

- No copies `credentials.json` a otro equipo: el primer uso doble del refresh quema la familia en ambos lados y
  tendrás que volver a entrar. Cada equipo hace su propio `login`.
- No pegues tokens en un prompt, un log ni un commit; la CLI nunca los imprime.
- No uses el carril para personas externas o invitadas: solo funciona con personas internas.
- La clase `read.client` (textos e invitados del cliente) no está disponible para la CLI hasta su revisión de
  gobierno de datos IA.

## Problemas comunes

- **El navegador no vuelve a la CLI.** El enlace apunta a `127.0.0.1` en un puerto libre; un proxy o VPN que
  intercepte loopback lo rompe. Repite `login` con `--no-browser` y abre el enlace a mano.
- **El navegador quedó en «Casi».** Lee el motivo en la página y sigue la tabla de
  [Qué ves en el navegador al terminar](#qué-ves-en-el-navegador-al-terminar). En todos los casos basta con volver
  a la terminal y repetir `pnpm rooms login`; ninguno de estos motivos guarda una credencial nueva.
- **La página dice «Listo» pero un comando responde 401.** El login funcionó; lo que falta es tu acceso interno a
  ese espacio de Rooms (venció o lo revocaron). Pídelo según [Administrar el acceso interno](administrar-acceso-interno.md).
- **Pasaron más de 5 minutos.** La terminal avisa que el inicio de sesión expiró y deja de escuchar; el navegador
  ya no llega a ninguna de las dos páginas. Vuelve a ejecutar `pnpm rooms login`.
- **Perdí el equipo.** Revoca el consentimiento del cliente «Efeonce Rooms CLI» en Efeonce ID; Rooms deja de
  aceptarlo en menos de 30 s. Para cortar a todas las CLIs a la vez, se suspende el cliente `efeonce-rooms-cli`.
- **Dos agentes a la vez.** Está soportado: la renovación usa un candado de archivo para que nunca se reuse un
  refresh.

## Referencias técnicas

- Verificador en Rooms: `efeonce-rooms/src/server/agents/bearer.ts`; login de la CLI: `scripts/lib/rooms-cli-auth.ts`
  (`roomsCliLandingUrl`).
- Páginas de fin del login: `efeonce-rooms/src/app/cli/conectado/page.tsx` y `src/app/cli/error/page.tsx`; copy en
  `src/lib/copy/invitations.ts` (`access.cli`). Contrato: [ADR, § Fin del login en el navegador](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#fin-del-login-en-el-navegador-2026-11-02).
- Emisor: `src/lib/auth-server/oauth/resources.ts` y `registerRoomsAgentClients` (`clients.ts`).
- [TASK-2095](../../tasks/in-progress/TASK-2095-efeonce-id-rooms-audience-cli-first-party-client.md) ·
  [TASK-2087](../../tasks/in-progress/TASK-2087-rooms-delegated-bearer-verifier.md)
