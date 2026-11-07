# Rooms — Agentes por CLI (carril directo)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-11-02 por Claude (TASK-2087, TASK-2095)
> **Ultima actualizacion:** 2026-11-02 por Claude
> **Documentacion tecnica:** [ADR del carril de agentes, enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01) · [contrato OAuth de Efeonce ID](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md)

## Qué es

El carril CLI de agentes permite que un agente de código (Claude Code, Codex) arme, revise y publique salas de Rooms
desde la terminal, **con tu autoridad y sin pedirte el segundo factor en cada acción**. Funciona como `gh` o
`gcloud`: entras una vez con Efeonce ID (`pnpm rooms login`), la CLI guarda una credencial privada en tu equipo y la
renueva sola.

Está **encendido en producción** desde el 2026-11-02 y fue aceptado ese día con una sala real de prueba. El gateway
MCP remoto, para agentes que no corren una CLI local, sigue pendiente: este carril es el primer paso («CLI primero,
gateway después»).

> Detalle técnico: [ADR, enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01) · [manual de operación](../../manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md).

## Quién puede usarlo

| Persona | ¿Puede? | Por qué |
| --- | --- | --- |
| Persona interna de Efeonce con acceso vigente al espacio de Rooms | Sí | El agente hereda exactamente su acceso. |
| Persona interna sin acceso a ese espacio | No | El login funciona, pero Rooms responde 401 hasta que le den acceso. |
| Cliente, invitado o persona externa | No | Efeonce ID rechaza el pedido (`rooms_requires_internal`). |

El agente elige el espacio de trabajo con `--organization`. No existe una «cuenta del agente»: siempre actúa como la
persona que hizo el login.

> Detalle técnico: [ADR, enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01) · [manual, Antes de empezar](../../manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md#antes-de-empezar).

## Qué puede y qué no puede hacer un agente

Al entrar, aceptas clases de permiso. Cada operación exige la suya; sin ella, Rooms responde 403.

| Clase | Qué permite | Al consentirla |
| --- | --- | --- |
| Lectura (`read`) | Ver salas, actividad e imágenes. | Sin segundo factor extra. |
| Autoría (`author`) | Crear y editar salas, subir y adjuntar imágenes. | Pide el segundo factor. |
| Publicación (`release`) | Publicar una edición. | Pide el segundo factor. |
| Acceso (`access`) | Invitar y administrar quién entra. | Pide el segundo factor. |

**No puede:**

- leer los textos e invitados del cliente (`read.client`): esa clase no está concedida a la CLI hasta la revisión de
  gobierno de datos IA;
- hacer más de lo que tú puedes: si pierdes acceso, el agente lo pierde en ese mismo momento;
- operar para personas externas.

Ejemplo real (2026-11-02): con un solo `login` del operador, el agente creó la sala «Campaña «Llega antes»» en el
espacio «Efeonce», subió 5 imágenes, la revisó con «Ver como» comprador y publicó la edición. No invitó a nadie:
invitar a una persona real sigue siendo una decisión humana.

> Detalle técnico: [ADR, enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01) · [manual, Qué hace un agente solo](../../manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md).

## Cómo se atribuye y cómo se revierte

Cada acción queda en la actividad de la sala atribuida al agente que la hizo, por ejemplo `cli/claude-code`, a tu
nombre («publicado por claude-code para ti»). Toda acción trae su aviso y su reversa, igual que si la hubieras hecho
tú desde el navegador. En la prueba del 2026-11-02 fueron 17 acciones, todas con aviso y reversa disponibles.

Para quitarle el acceso al agente de tu equipo: `pnpm rooms logout`. Revoca la credencial en Efeonce ID y la borra del
equipo.

> Detalle técnico: [ADR, enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01) · [manual, Paso a paso](../../manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md#paso-a-paso).

## Seguridad

La comodidad tiene un costo aceptado: una credencial de larga vida en tu equipo. Lo compensan estas medidas:

- **Acceso corto:** cada token de acceso dura 5 minutos; la CLI lo renueva sola.
- **Renovación que se quema si se copia:** si alguien reusa una renovación (por ejemplo, copiando el archivo a otro
  equipo), toda la cadena deja de valer y hay que volver a entrar.
- **Revocación en menos de 30 s:** Rooms consulta a Efeonce ID si el token sigue vivo y guarda esa respuesta como
  máximo 30 s. Un `logout`, un consentimiento revocado o un cliente suspendido cortan en ese plazo.
- **Solo personas internas** y clases restringidas: un cliente cualquiera de Efeonce ID no puede pedir permisos de
  Rooms; solo los clientes registrados para la CLI.
- **`read.client` fuera:** los datos del cliente no están al alcance del agente.
- **La CLI nunca imprime tokens**, y las páginas de fin del login no llevan códigos ni tokens en su dirección.

Si hace falta cortar a todos, hay tres interruptores: apagar el carril en Rooms, suspender el cliente de la CLI en
Efeonce ID o quitar la audiencia de Rooms en Efeonce ID. Ninguno afecta el acceso de las personas por navegador.

> Detalle técnico: [ADR, enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01) · [manual, Apagar el carril](../../manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md#apagar-el-carril) · [operar producción, paso 3b](../../manual-de-uso/rooms/operar-produccion-rooms.md).

## Relacionados

- Las páginas «Listo» y «Casi» del login: [login de la CLI](login-de-la-cli.md).
- Qué ve cada persona: [quién ve qué en Rooms](quien-ve-que-en-rooms.md).
- Cómo se da el acceso del equipo: [acceso interno](acceso-interno-rooms.md).
- La audiencia Rooms y los clientes de la CLI en Efeonce ID: [autorizador de Efeonce](../identity/autorizador-efeonce.md).
