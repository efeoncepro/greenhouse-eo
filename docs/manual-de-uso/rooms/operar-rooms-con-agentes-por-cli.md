# Operar Rooms con agentes por CLI (login una vez)

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-11-01 por Claude (TASK-2087, TASK-2095)
> **Ultima actualizacion:** 2026-11-01 por Claude
> **Documentacion tecnica:** [ADR del carril de agentes, enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01) · [contrato OAuth de Efeonce ID](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md)

## Para qué sirve

Que un agente (Claude Code, Codex) arme, publique e invite en Rooms **sin pedirte MFA en cada acción**. Funciona
como `gh` o `gcloud`: entras una vez con Efeonce ID en el navegador y la CLI guarda una credencial privada en tu
equipo que se renueva sola. El agente actúa con **tu** autoridad, ni más ni menos, y cada acción queda atribuida a
él («publicado por claude-code para ti») con su aviso y su reversa.

## Antes de empezar

- Tener acceso interno vigente en el espacio de Rooms donde vas a trabajar (si no, Rooms responde 401 aunque el
  login funcione).
- Estar en el repo `efeonce-rooms` (`pnpm install` hecho).
- El carril debe estar encendido en ese Rooms: `curl -s https://efeonce-rooms.vercel.app/.well-known/oauth-protected-resource`
  responde 200. Si responde 404, está apagado (`ROOMS_AGENT_LANE_ENABLED`).

## Paso a paso

1. **Entrar una vez.** Abre el navegador, entras con Efeonce ID y MFA, y consientes las clases de Rooms (lectura,
   autoría, publicación y acceso; las tres últimas piden el segundo factor al consentir).

   ```bash
   pnpm rooms login --base-url https://efeonce-rooms.vercel.app
   ```

   Si el navegador no se abre solo, copia el enlace que imprime. Al terminar verás `"loggedIn": true`.

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

   El MCP stdio local también lo usa: omite `--session-file` y toma el login guardado.

4. **Cerrar.** Revoca la credencial en Efeonce ID (corta en menos de 30 s) y la borra del equipo:

   ```bash
   pnpm rooms logout --base-url https://efeonce-rooms.vercel.app
   ```

## Qué significan los estados

| Ves | Significa |
| --- | --- |
| `"loggedIn": true` | La credencial quedó en `~/.config/efeonce-rooms/credentials.json` (0600) |
| `401` en un comando | Tu acceso interno a ese espacio venció o fue revocado, o la credencial se revocó |
| `403` en un comando | El token no tiene la clase que exige esa operación (por ejemplo, publicar sin `release`) |
| `La sesión de la CLI de Rooms venció o fue revocada` | El refresh dejó de valer (revocado, reusado o > 90 días): vuelve a `login` |
| `Este Rooms todavía no acepta el carril de agentes` | `ROOMS_AGENT_LANE_ENABLED` está apagado en ese Rooms |

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
- **Perdí el equipo.** Revoca el consentimiento del cliente «Efeonce Rooms CLI» en Efeonce ID; Rooms deja de
  aceptarlo en menos de 30 s. Para cortar a todas las CLIs a la vez, se suspende el cliente `efeonce-rooms-cli`.
- **Dos agentes a la vez.** Está soportado: la renovación usa un candado de archivo para que nunca se reuse un
  refresh.

## Referencias técnicas

- Verificador en Rooms: `efeonce-rooms/src/server/agents/bearer.ts`; login de la CLI: `scripts/lib/rooms-cli-auth.ts`.
- Emisor: `src/lib/auth-server/oauth/resources.ts` y `registerRoomsAgentClients` (`clients.ts`).
- [TASK-2095](../../tasks/in-progress/TASK-2095-efeonce-id-rooms-audience-cli-first-party-client.md) ·
  [TASK-2087](../../tasks/in-progress/TASK-2087-rooms-delegated-bearer-verifier.md)
