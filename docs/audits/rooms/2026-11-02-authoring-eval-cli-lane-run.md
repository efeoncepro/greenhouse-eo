# Rooms: eval de oficio por el carril CLI de agentes (2026-11-02)

- Fecha: 2026-11-02.
- Motivo: la skill `efeonce-rooms-authoring` se actualizó con el carril CLI (enmienda D1-bis, TASK-2087/TASK-2095)
  y con lo aprendido al publicar la sala Volta en producción. Todo cambio de la skill exige una corrida nueva con
  recibo PASS (TASK-2091, ADR del carril de agentes D6).
- Entorno: Rooms local aislado (`pnpm integration:up` en el worktree `rooms-agent-cli`, `main@3434ea8`), origen
  `http://127.0.0.1:3216`, PG local propia (55433), emisor fixture, sin correo. Nunca producción.
- Canal: **login de la CLI** (bearer del carril de agentes), no `--session-file`. Credencial local en una carpeta
  privada (`ROOMS_CONFIG_DIR`), sin tocar la del operador. Persona «administrator» con `read`, `author`, `release` y
  `access`.
- Agente: un subagente Claude por caso, que solo recibió la skill, `references/` y el brief; sin acceso a
  `expected/`, `fixtures/`, `runs/` ni `cases.json`. Cada llamada pasó por `score.mjs record`.
- Recibo: `.claude/skills/efeonce-rooms-authoring/evals/runs/2026-11-02.json` (espejo en `.codex`), `kind: live`,
  `verdict: PASS`, hash `sha256:9ff2aff505f551bcf72e5f19c7ea89c8414bc6d6366f4c7509863f30afc8e487`.

## Rondas

Se hicieron cuatro rondas. Cada una destapó algo que la skill afirmaba mal o no decía; se corrigió la skill y se
volvió a correr con agentes nuevos. Solo el recibo de la última ronda queda en el repo.

| Ronda | Qué destapó | Cambio en la skill |
| --- | --- | --- |
| 1 | El enlace no dura 24 h: el contrato fija 30 días por defecto y 90 de tope, acotado por el acceso de quien invita. `invitation-management` pide `read.client`, que la CLI no tiene. `authoring` responde `not_found` después de publicar. `validate-import` no valida antes de crear. | Vencimiento real, confirmación de invitaciones por login, `room` para la revisión tras publicar, etiquetas de formatos y `validate-import`. |
| 2 | Las dos invitaciones fallaron con `unavailable` (503). Causa: `invitationId` es clave primaria global y el ejemplo de la skill (`inv-carla-mendez`) chocaba con la ronda anterior. Además, un wrapper en carpeta compartida mezcló los registros de los dos casos. | `invitationId` con el `roomId`; qué hacer ante `unavailable`; el `editionId` sale del recibo. Wrappers solo en el run-dir del agente. |
| 3 | `agents-activity` lista cada invitación con su `invitationId` y su reversa, pero no el correo. La revisión también avanza entre dos `uploads.complete`. | Cómo confirmar destinatarios sin `read.client`; releer la revisión antes de cada `uploads.complete`; `where` sin horarios que el brief no declara. |
| 4 | Sin contradicciones nuevas en la skill. | Ninguno. Ronda del recibo. |

## Resultado de la ronda 4

| Caso | Sala | Cobertura | Marcadores | Fuentes | Invitaciones | Orden de publicación |
|---|---|---|---|---|---|---|
| A `a-volta-siempre-activo` (sintética) | `sala-volta-2027-d` | PASS | PASS (sintética) | PASS | PASS (3 de 3 del deal) | PASS |
| B `b-raiz-protector-solar` (variante `real`) | `raiz-mineral-2027-d` | PASS | PASS (cero `[…]`) | PASS | PASS (solo la persona permitida) | PASS |

Chequeos informados, sin efecto en el veredicto: `previewBeforePublish` (`pnpm rooms preview` no pasa `--as`) e
`invitationsComplete` (sin `invitations.json`, porque con el login no se puede leer `invitation-management`).

## Salvedades

- La captura se hizo a mano: `score.mjs capture` exige `--session-file`. Se usaron los lectores `edition` y
  `agents-activity`; la cobertura sale del recibo de `editions.publish` (anotado en cada `run.json`).
- El acceso interno de la persona fixture vencía el mismo día, así que las invitaciones quedaron de horas. Es una
  propiedad del entorno local, no de producción, donde el acceso dura hasta un año.

## Pendientes que la skill no resuelve (para una próxima versión, con su corrida)

- `claimKind` no tiene un valor para una observación o captura (`hypothesis | proposal | simulation`): los agentes
  usaron `hypothesis`, y uno `simulation` para la Radiografía. Hace falta una decisión de contrato o de oficio.
- Qué fuente usar en `today` de una escena `answers` ilustrativa sin captura.
- Qué lector usar para releer la revisión antes de publicar: `authoring` sirve, `room` responde `not_found` en un
  borrador nunca publicado.
- Cifras que vienen dentro de una pieza aprobada sin fuente en el brief («80 km por carga»).
- Con el login de la CLI no se puede leer el tope de vencimiento de una invitación.
- `pnpm rooms preview` sigue sin `--as`.
- Runtime de Rooms: un `invitationId` repetido responde `unavailable` en vez de `conflict`. Conviene mapear la
  violación de unicidad a `conflict`.
