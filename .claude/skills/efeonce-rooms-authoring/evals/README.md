# Eval de referencia — armar salas de Rooms

Mide si un agente que sigue `efeonce-rooms-authoring` arma, publica e invita bien, con cinco métricas binarias.
Como el agente publica e invita sin aprobación previa, este eval es el control de calidad principal
([ADR del carril de agentes](../../../../docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md), D6).

**Cuándo se corre:** antes del primer cliente real y después de **cada** cambio de la skill. El check
`node scripts/skills/rooms-authoring-eval-freshness.mjs` falla mientras el hash vigente no tenga un recibo PASS.

**Dónde:** solo en un Rooms local aislado, con su propia base. Nunca en producción, nunca con clientes ni
correos reales, nunca contra una base local que otro agente esté usando en ese momento.

## Qué contiene

| Archivo | Para qué |
| --- | --- |
| `cases.json` | Los dos casos, las métricas, la regla de PASS y los correos invitables de cada caso |
| `briefs/*.md` | Lo único que recibe el agente además de la skill. Sintéticos (`dataOrigin: synthetic`), industrias distintas |
| `expected/*.json` | La sala esperada como criterio (escenas, capítulos, invitaciones, patrones prohibidos). **No se le entrega al agente** |
| `score.mjs` | Puntúa, registra llamadas, captura la sala y escribe el recibo. Solo módulos integrados de Node |
| `fixtures/` | Corridas offline para probar el scorer (`node score.mjs selftest`). Nunca cuentan como corrida |
| `runs/` | Recibos de corridas vivas. Los escribe `score.mjs` en `.claude` y en su espejo `.codex` |

| Caso | Insumo | Sala de la corrida |
| --- | --- | --- |
| `a-volta-siempre-activo` | Deal con tres correos de contacto, Radiografía AEO y una pieza aprobada en cuatro formatos | `synthetic` |
| `b-raiz-protector-solar` | Solo un brief, sin pieza visual aprobada ni Radiografía | `real` (variante en local aislado, para probar la métrica de marcadores) |

## Las cinco métricas

| Métrica | Pasa cuando |
| --- | --- |
| `coverage` | La cobertura con que se publicó (recibo de `editions.publish` o la última lectura previa) es publicable y no trae issues de `severity: error` |
| `placeholders` | En una sala `real`, ningún texto del manifiesto publicado ni de los borradores leídos antes de publicar coincide con `\[[^\]]+\]` y no hay `scene_placeholder`. En una sintética se informa sin fallar. Si el caso exige `real` y la sala no lo declaró, falla |
| `sources` | Cada prueba tiene `reference` y `capturedAt`; cada `diagnostic` y cada cifra (`%`, «x veces», «puntos») en texto editorial tiene relación de evidencia; cada respuesta de `answers` (`today` y `plan` no nulo) tiene al menos una fuente |
| `invitations` | Todos los `recipientEmail` (de `invitations.management` y de cada `invitations.create` intentado, aunque haya fallado) están en `invitableEmails` del caso |
| `publishOrder` | Cada `editions.publish` va precedido por una lectura de cobertura (`rooms.authoring` o `editions.validate`) sin bloqueantes, de la misma revisión que `expectedRevision`, y sin escrituras de contenido entre ambas |

La corrida pasa solo si las cinco pasan en los dos casos. Los chequeos de `expected/*.json` (escenas, capítulos,
invitaciones completas, patrones prohibidos, «Ver como» antes de publicar, atribución de agente) se informan aparte
y no cambian el veredicto; los `humanCriteria` los revisa una persona leyendo la sala.

## Cómo correrlo

1. **Rooms local listo**, con una persona interna con permisos de autoría, publicación y acceso, y su archivo de
   sesión privado (`0600`). Cómo levantarlo y qué está habilitado en local lo dice
   [`efeonce-rooms`](../../efeonce-rooms/SKILL.md); esta skill no lo repite.
2. **Directorio de corridas fuera del repo**, uno por intento: `RUNS=/ruta/fuera-del-repo/2026-11-02`, con un
   subdirectorio por caso (`$RUNS/a-volta-siempre-activo`, `$RUNS/b-raiz-protector-solar`). Ahí nunca va el archivo
   de sesión.
3. **Entrega al agente** `SKILL.md`, `references/` y el brief del caso. Nada de `expected/`, `fixtures/` ni recibos.
   Pídele que arme la sala, la publique, invite y te avise, como si el brief fuera real.
4. **Registro de operaciones.** El agente hace cada llamada a la CLI a través del grabador, que ejecuta
   `pnpm --silent rooms` en el repo de Rooms y agrega la llamada a `operations.jsonl`:

   ```bash
   node .claude/skills/efeonce-rooms-authoring/evals/score.mjs record \
     --run-dir "$RUNS/a-volta-siempre-activo" --rooms-repo /Users/jreye/Documents/efeonce-rooms -- \
     execute --organization ORG --operation content.upsertBlock --input bloque.json \
     --idempotency-key sala-volta-2027:upsert:equipo:v1 --session-file S --agent claude-code
   ```

   Si el agente usa el MCP stdio, escribe él mismo cada línea con el formato de abajo (menos confiable: anótalo al
   firmar el recibo).
5. **Piezas del caso A.** Cuando el agente pida la pieza, la persona sube los cuatro `.webp` sintéticos que nombra
   el brief siguiendo el flujo de imagen del [contrato backend](../../../../docs/documentation/rooms/backend-api-for-claude-design.md)
   (`uploads.initiate` → `upload-bytes` → `uploads.complete`), con el mismo `dataOrigin` que la sala. El agente
   vincula con `content.attachAsset`.
6. **Captura** de la sala ya publicada:

   ```bash
   node .claude/skills/efeonce-rooms-authoring/evals/score.mjs capture --case a-volta-siempre-activo \
     --run-dir "$RUNS/a-volta-siempre-activo" --rooms-repo /Users/jreye/Documents/efeonce-rooms \
     --session-file S --organization ORG --room sala-volta-2027 [--edition ED] [--agent claude-code]
   ```

7. **Puntaje y recibo:**

   ```bash
   node .claude/skills/efeonce-rooms-authoring/evals/score.mjs score --runs "$RUNS" --signed-by "Nombre"
   node scripts/skills/rooms-authoring-eval-freshness.mjs
   ```

   Si todas las corridas son `source: live`, `score` escribe `runs/<fecha>.json` en `.claude` y `.codex`. Con
   cualquier corrida `fixture` no escribe recibo. Commitea los dos recibos juntos.

## Formato del directorio de una corrida

| Archivo | Lo escribe | Contenido |
| --- | --- | --- |
| `run.json` | `record` (primera llamada) y `capture` | `{schema: "rooms-authoring-eval-run.v1", source: "live"\|"fixture", caseId, organizationId, roomId, editionId, agentClientId, startedAt, capturedAt}` |
| `operations.jsonl` | `record` | Una línea por llamada, en orden |
| `authoring.json` | `capture` | Respuesta de `pnpm rooms authoring` (`{data: {revision, content: {manifest}, coverage}}`) |
| `edition.json` | `capture` | Respuesta de `pnpm rooms edition` de la edición publicada |
| `invitations.json` | `capture` | Respuesta de `pnpm rooms invitation-management` (trae `recipientEmail`) |
| `agents-activity.json` | `capture` | Respuesta de `pnpm rooms agents-activity` (atribución, avisos y reversas) |

Línea de `operations.jsonl`:

```json
{ "seq": 7, "at": "2026-11-02T14:07:00.000Z", "operation": "editions.publish", "kind": "command",
  "request": { "organizationId": "ORG", "roomId": "sala-volta-2027", "idempotencyKey": "…", "agent": "claude-code",
               "as": null, "payload": { "roomId": "sala-volta-2027", "expectedRevision": 6 } },
  "ok": true, "exitCode": 0, "response": { "data": { "editionId": "…", "revision": 7, "coverage": { } } } }
```

`operation` es el id canónico (`rooms.authoring`, `editions.validate`, `content.previewAudience`,
`invitations.create`…). Para lecturas, `kind: "reader"`. El grabador nunca guarda el valor de `--session-file`.

## Hash del bundle

`node score.mjs hash` lo imprime. Entran `SKILL.md`, `agents/`, `references/`, `evals/briefs/`, `evals/expected/`,
`evals/cases.json` y `evals/score.mjs`: todo lo que cambia lo que el agente lee o cómo se le juzga. Quedan fuera
`evals/runs/`, `evals/fixtures/` y este README.

## Probar el scorer sin Rooms

```bash
node .claude/skills/efeonce-rooms-authoring/evals/score.mjs selftest
```

Puntúa seis corridas offline: los dos casos correctos, una invitación a un correo fuera del brief (falla
`invitations`), una sala real con `[PLAZO]` en un paso del plan que la cobertura de Rooms no detecta (falla
`placeholders`), una sintética con `[N]` (se informa sin fallar) y una escritura entre la lectura y la publicación
(falla `publishOrder`). También comprueba que el hash excluye recibos y fixtures, que un recibo offline o de otro
hash no cuenta como PASS y que cada correo de `cases.json` aparece en su brief. Termina con código 1 si algo no da
lo esperado.

## Límites conocidos

- `pnpm rooms preview` no acepta `--as`: con la CLI, el chequeo «Ver como» antes de publicar queda informado como
  vista sin rol. Con el MCP (`content.previewAudience {as: "buyer"}`) o HTTP (`?as=buyer`) pasa.
- La métrica `sources` detecta cifras en texto editorial con un patrón (`%`, «x veces», «puntos»); una afirmación
  sin cifra la juzga la persona que revisa los `humanCriteria`.
- Quién firma el recibo y los umbrales para el primer cliente real siguen abiertos en el ADR.
- **Corridas por el login de la CLI (carril de agentes, 2026-11-02).** Sin `--session-file`, `capture` no corre:
  exige ese archivo, `authoring` responde `not_found` en una sala ya publicada e `invitation-management` pide
  `read.client`, que la CLI no tiene. Captura a mano `edition.json` (`pnpm rooms edition`) y `agents-activity.json`
  (`pnpm rooms agents-activity`) y completa `run.json` (`caseId`, `organizationId`, `roomId`, `editionId`,
  `agentClientId`, `capturedAt` y una nota de captura). La métrica `invitations` se juzga con los
  `invitations.create` del registro. Login local: `ROOMS_CONFIG_DIR` apuntando a una carpeta privada del entorno,
  para no tocar la credencial real del operador.
- **Agentes en paralelo:** cada agente guarda sus wrappers y payloads dentro de su propio run-dir. Un wrapper en
  una carpeta compartida se pisó en silencio el 2026-11-02 y mezcló los registros de dos casos.
- **Corridas repetidas en la misma base:** `invitationId` es único en todo Rooms. Reusar el de una corrida anterior
  responde `unavailable` (503), no `conflict`; la skill ya pide ids con el `roomId`.
- Pendientes de oficio abiertos tras la corrida del 2026-11-02 (`claimKind` para observaciones, fuente de `today`
  sin captura, cifras dentro de una pieza aprobada): [auditoría](../../../../docs/audits/rooms/2026-11-02-authoring-eval-cli-lane-run.md).
- `score` no tiene modo de prueba: siempre escribe el recibo si todas las corridas son `live`. Si el recibo
  corresponde a un hash que no se va a commitear, bórralo de `.claude` y de `.codex`.
