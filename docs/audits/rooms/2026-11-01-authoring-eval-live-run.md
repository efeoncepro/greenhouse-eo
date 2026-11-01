# Rooms: corrida viva del eval de oficio (TASK-2091, slice 4)

- Fecha: 2026-11-01 (corrida iniciada el 2026-10-31).
- Entorno: Rooms local (copia del repo en el scratchpad, `next dev` propio en 3240, perfil `local`, PG local 55432,
  emisor de identidad de prueba sin correo). Nunca producción; no salió ningún correo.
- Agente: Claude (`--agent claude-code`, canal `cli`), siguiendo la skill `efeonce-rooms-authoring` sin cambios.
- Recibo: `.claude/skills/efeonce-rooms-authoring/evals/runs/2026-11-01.json` (espejo en `.codex`), `kind: live`,
  `verdict: PASS`, hash `sha256:07e05622d3cef1b977cc0ad823821f6e5c7b5fe088399949b514806b0465d2d6`, `signedBy: null`.

## Resultado

| Caso | Cobertura | Marcadores | Fuentes | Invitaciones | Orden de publicación |
|---|---|---|---|---|---|
| A `a-volta-siempre-activo` (sintética) | PASS | PASS (sintética) | PASS | PASS (3 de 3 del deal) | PASS |
| B `b-raiz-protector-solar` (variante `real`) | PASS | PASS (cero `[…]`, sin `scene_placeholder`) | PASS | PASS (solo la persona permitida) | PASS |

## Atribución, avisos y reversas

- `rooms.audit`: 15 filas `agent`/`claude-code`/`cli`; 8 `person`/`cli` (subidas hechas como persona) y 4
  `person`/`system` (worker de medios). `command_receipts`: 15 de agente. `agent_action_notices`: 8 avisos.
- Reversas ejecutadas desde el descriptor de `agents.activity` (sala B): `invitations.revoke` (invitación `revoked`) y,
  por ser primera edición, `rooms.archive` (`lifecycle=archived`, lector `room` → `not_found`). Ambos descriptores
  pasaron de `available` a `done`.

## Salvedades

- `score.mjs capture` falla en una sala publicada sin borrador (`authoring` responde `not_found`). La captura se hizo a
  mano con los lectores `room`, `edition`, `invitation-management` y `agents-activity`, y la cobertura salió de la
  última lectura antes de publicar (anotado en `run.json`). Corregir el scorer cambia el hash y exige otra corrida.
- `score.mjs record` guarda la respuesta completa de la CLI, incluido el `transfer.url` firmado de `uploads.initiate`
  (local, fuera del repo). Debe ocultarse.
- La skill no advierte que una invitación no puede vencer después del acceso de quien invita (un `forbidden` en la
  corrida).
- Quién firma el recibo sigue abierto (ADR del carril de agentes).
