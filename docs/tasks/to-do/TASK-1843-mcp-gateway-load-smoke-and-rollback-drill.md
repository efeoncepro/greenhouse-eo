# TASK-1843 — Gateway MCP: carga mínima y rollback ejercitado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Especificación. El gateway sirve en producción; la revisión, el SHA, el tráfico y la capacidad deben resolverse al ejecutar la task. Snapshot 2026-09-07T12:20:25Z: efeonce-mcp-gateway-00046-6n2 Ready/100 % y SHA igual a origin/main. No existe mecanismo de prueba de carga en el repo hermano — grep de load-test/autocannon/k6/artillery sobre scripts, test y .github devuelve cero — y el rollback está documentado sin ejercitar, con el marcador [verificar] literal en el runbook.`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; el código vive en el repo hermano efeonce-mcp (main, PR); checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar el último criterio abierto de `TASK-1626` con trabajo real en vez de un tilde: una prueba de carga
mínima contra el gateway `mcp.efeonce.org` y un ensayo de rollback con evidencia. Hoy ninguna de las dos
existe — no como evidencia pendiente de correr, sino como mecanismo ausente.

## Why This Task Exists

`TASK-1626` declara `Smokes live cubren protocolo, auth, provider, DNS/cert, carga mínima y rollback`. Cuatro
de esos seis están cubiertos por canarios reales (`oauth-canary.mjs`, `greenhouse-seo-canary.mjs`,
`greenhouse-hiring-canary.mjs`) y por el front door respondiendo. Los otros dos no.

El discovery del 2026-09-06 lo verificó en vez de asumirlo:

- **Carga**: `grep -rilE "load.?test|autocannon|k6|artillery"` sobre `scripts/`, `test/` y `.github/` del repo
  `efeonce-mcp` devuelve **cero coincidencias**. No hay con qué medir.
- **Rollback**: el runbook lo describe (`EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`, mover el tráfico a la revisión
  previa) pero la línea 646 trae el marcador `**[verificar]**` literal — el propio documento declara que ese
  paso nunca se comprobó.

Y el número que habría que validar ya se movió solo: el runbook dice `maxScale=5 efectivo` (línea 690) y el
runtime hoy corre en **20**. Nadie midió qué aguanta antes ni después del cambio.

Mientras esto siga abierto, `TASK-1626` no puede cerrar, y `TASK-1626` es U00 — la fundación de `EPIC-044`.

## Goal

- Un script de carga mínima, repetible y barato, que mida el transporte del gateway sin gastar presupuesto de
  proveedor y sin que Cloud Armor contamine la medición.
- Una línea base publicada: latencia p50/p95/p99, tasa de error y comportamiento de autoescalado bajo la
  capacidad declarada hoy (`concurrency=80`, `maxScale=20`).
- Un ensayo de rollback ejecutado sobre el servicio real, con tiempos medidos y evidencia, que retire el
  `[verificar]` del runbook.
- El criterio de `TASK-1626` tildado con evidencia, o declarado bloqueado con razón.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **NUNCA** dirigir carga a una tool que compra datos de proveedor. Las tools SEO gastan presupuesto real por
  llamada (DataForSEO); una prueba de carga contra `get_seo_keyword_market_data` o similar convierte un smoke
  en una factura. La carga se dirige sólo a superficie de transporte: `health`, la metadata pública,
  `POST /mcp` sin token (401) y, autenticado, `efeonce.gateway.status` / `tools/list`.
- **NUNCA** medir desde una sola IP sin considerar Cloud Armor: la política `efeonce-mcp-gateway-edge`
  limita a **600 requests / 60 s por IP** (verificado 2026-09-06). Una corrida ingenua mide el throttle del
  edge, no el gateway. Declarar explícitamente si la medición es bajo el techo de Armor o si se coordina una
  excepción temporal — y si se coordina, revertirla en el mismo turno.
- **NUNCA** ejecutar el ensayo de rollback sin confirmar antes que la revisión destino está `Ready` y sirve la
  misma superficie: rodar hacia atrás a una revisión con menos tools cambia el contrato del agente en vivo.
- Skills: `efeonce-mcp-platform` (dueña del gateway), `greenhouse-qa-release-auditor` (veredicto de cierre),
  `cloud-run-basics` para el traffic split.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` (§rollback del provider, §capacidad)
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md` (dueña del criterio)

## Dependencies & Impact

### Depends on

- Gateway desplegado y sano en producción — cumplido en el snapshot 2026-09-07T12:20:25Z; vuelve a resolver
  revisión Ready, SHA, región y tráfico antes del ensayo.
- Acceso `gcloud run` al proyecto `efeonce-group` para el traffic split del ensayo.
- Un token Entra real si la carga incluye superficie autenticada (el canario OAuth ya requiere login humano).

### Blocks / Impacts

- `TASK-1626`: es su último criterio abierto propio. Sin esta task no puede declarar estado final.
- `TASK-1833`: el red-team hereda la línea base de carga para distinguir una degradación por abuso de una por
  capacidad.

### Files owned

- `../efeonce-mcp/scripts/load-smoke.mjs` (nuevo, repo hermano)
- `../efeonce-mcp/docs/` o el runbook de Greenhouse según dónde se publique la línea base `[verificar]`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` (retirar `[verificar]`, corregir capacidad)
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md` (tildar el criterio)

## Current Repo State

### Already exists

- Canarios funcionales en `../efeonce-mcp/scripts/`: `oauth-canary.mjs`, `greenhouse-seo-canary.mjs`,
  `greenhouse-hiring-canary.mjs` — cubren protocolo, auth y provider.
- Front door verificado el 2026-09-06: `oauth-protected-resource` 200, `POST /mcp` sin token 401, `health` 200.
- Política Cloud Armor `efeonce-mcp-gateway-edge` con throttle 600/60 s confirmado por `gcloud`.
- Procedimiento de rollback descrito en el runbook (mover tráfico a revisión previa verificada).
- `surface-baseline.json` con el inventario y `surfaceHash` vigentes, que permite verificar que una revisión
  destino sirve la misma superficie antes de rodar hacia atrás.

### Gap

- Cero mecanismo de carga: sin script, sin dependencia, sin job de CI, sin línea base publicada.
- Rollback nunca ejercitado; el runbook lo admite con `[verificar]`.
- Capacidad documentada desactualizada (`maxScale=5` en el runbook vs `20` en runtime).

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `../efeonce-mcp/scripts/` (repo hermano) + runbook en Greenhouse
- Future candidate home: `remain-shared`
- Boundary: script operativo de verificación; no toca el runtime del gateway ni sus providers
- Server/browser split: `n/a`
- Build impact: `none` — el script no entra al bundle del servicio; cualquier dependencia de carga va como
  devDependency del repo hermano
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: ninguno — la task no escribe datos; observa y manipula tráfico de Cloud Run
- Consumidores afectados: clientes MCP reales durante la ventana del ensayo de rollback
- Runtime target: `production` (el gateway no tiene entorno staging separado `[verificar]`)

### Contract surface

- Contrato existente a respetar: superficie declarada en `surface-baseline.json` (cuenta dinámica y
  `surfaceHash`);
  la revisión destino del rollback debe servir la misma o el ensayo se declara no ejecutable
- Contrato nuevo o modificado: ninguno — no se agregan tools, scopes ni endpoints
- Backward compatibility: `not applicable`
- Full API parity: `N/A — no capability`. La task no introduce ni modifica una capability de negocio; es
  verificación operativa de un runtime existente

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna
- Invariantes que no se pueden romper:
  - `La carga NUNCA toca una tool que compra datos de proveedor; sólo superficie de transporte.`
  - `El ensayo de rollback sólo rueda a una revisión Ready cuyo surfaceHash coincide con el vigente.`
  - `Cualquier excepción temporal de Cloud Armor se revierte en el mismo turno, verificada por lectura.`
- Write-target allowlist: `N/A — sin tablas nuevas`
- Tenant/space boundary: `n/a`
- Idempotency/concurrency: la corrida de carga es repetible y sin efecto persistente; el traffic split es
  idempotente por revisión destino
- Audit/outbox/history: `none` — la evidencia vive en el reporte de la corrida y en el historial de revisiones
  de Cloud Run

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: el script nace fuera de CI, de ejecución manual y explícita
- Backfill plan: `none`
- Rollback path: antes del ensayo, captura la revisión Ready vigente y su `surfaceHash`; vuelve exactamente a
  ella sólo si sigue compatible. Para el script, revert del PR.
- External coordination: ventana acordada con el operador antes del ensayo de rollback, por ser una
  degradación deliberada de una superficie pública

### Security and access

- Auth/access gate: `gcloud` con el proyecto `efeonce-group`; token Entra real para la porción autenticada
- Sensitive data posture: `no sensitive data` — nunca loggear el token ni cuerpos de respuesta
- Error contract: el reporte registra códigos y latencias, nunca payloads
- Abuse/rate-limit posture: la propia prueba es tráfico sintético; se mantiene bajo el techo de Armor salvo
  excepción coordinada y revertida

### Runtime evidence

- Local checks: `pnpm check` en `../efeonce-mcp`
- DB/runtime checks: `n/a`
- Integration checks: corrida de carga contra la revisión viva con reporte p50/p95/p99 + tasa de error;
  ensayo de rollback con timestamps de ida y vuelta
- Reliability signals/logs: métricas de Cloud Run (instancias, latencia, 5xx) durante la ventana
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist — N/A, sin tablas nuevas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 — PLAN MODE: lo produce el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Script de carga mínima

- `../efeonce-mcp/scripts/load-smoke.mjs`: concurrencia y duración parametrizables, objetivo por defecto la
  superficie de transporte, tope por defecto bajo el umbral de Cloud Armor.
- Reporte con p50/p95/p99, tasa de error por código, y conteo de instancias observado.
- Guardarraíl duro en el propio script: lista blanca de endpoints permitidos; si el objetivo no está en ella,
  aborta antes de emitir tráfico.

### Slice 2 — Línea base publicada

- Corrida contra la revisión viva, en ventana de bajo tráfico, con el reporte versionado.
- Reconciliar la capacidad real en el runbook: `concurrency`, `maxScale` y throttle de Armor con los valores
  leídos del runtime, no los de 2026-08-01.

### Slice 3 — Ensayo de rollback

- Verificar que la revisión destino está `Ready` y su `surfaceHash` coincide.
- Mover el tráfico, verificar front door (metadata 200, `POST /mcp` sin token 401, health 200), volver.
- Medir tiempo de ida, de vuelta y ventana total de exposición; retirar el `[verificar]` del runbook con la
  evidencia.

### Slice 4 — Cierre del criterio en TASK-1626

- Tildar el criterio con la evidencia de los slices 1-3 o declarar el bloqueo con razón.
- Chequeo de impacto cruzado sobre `TASK-1626` y `TASK-1833`.

## Out of Scope

- Prueba de carga de los providers downstream (Greenhouse, Globe). Esta task mide el transporte del gateway;
  la capacidad de cada provider es de su dueño.
- Ajustar `maxScale`, `concurrency` o la política de Armor. Esta task **mide**; cambiar la capacidad es una
  decisión con su propia evidencia.
- Automatizar la carga en CI. Una corrida periódica contra producción es una decisión de costo y ruido aparte.
- El gate de Full API Parity de `TASK-1626`, que pertenece a `TASK-1473`.

## Detailed Spec

La medición honesta tiene una trampa conocida: con Cloud Armor a 600/60 s por IP, una corrida de una sola
máquina satura el edge antes que el servicio y produce un número que describe la política, no el gateway. Dos
salidas legítimas, ambas aceptables si quedan declaradas: mantener la corrida bajo el techo y reportar que la
medición es de latencia y no de techo de capacidad; o coordinar una excepción temporal para la IP de origen y
revertirla en el mismo turno con lectura de confirmación.

El ensayo de rollback es una degradación deliberada de una superficie pública. La ventana debe ser corta,
acordada, y con la verificación del front door en ambos extremos: si la revisión previa no responde, la
recuperación es volver a la revisión vigente, no seguir diagnosticando con el tráfico apuntando a la mala.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. El ensayo de rollback (Slice 3) va **después** de la línea base
  (Slice 2): sin saber cómo se comporta el gateway sano, un número raro durante el rollback no es
  interpretable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La carga golpea una tool que compra datos y genera gasto real | finance | medium | lista blanca de endpoints con abort en el script; sólo superficie de transporte | ledger de costo del proveedor |
| La medición describe Cloud Armor y no el gateway | ops | high | corrida bajo el techo declarada como tal, o excepción coordinada y revertida | tasa de 429 en el reporte |
| El rollback rueda a una revisión con superficie distinta y cambia el contrato en vivo | identity | low | verificar `surfaceHash` y estado `Ready` antes de mover tráfico | `surface-baseline.json` |
| La ventana de rollback pega a un cliente MCP real | ops | medium | ventana corta, de bajo tráfico, acordada; verificación de front door en ambos extremos | health / 401 del front door |

### Feature flags / cutover

Sin flag — el script es una herramienta de ejecución manual y no entra a ningún path productivo. El ensayo de
rollback usa el traffic split nativo de Cloud Run, reversible por el mismo mecanismo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR en `efeonce-mcp` | < 5 min | sí |
| Slice 2 | revert del PR de docs | < 5 min | sí |
| Slice 3 | devolver el tráfico a la revisión vigente | < 2 min | sí |
| Slice 4 | destildar el criterio | < 5 min | sí |

### Production verification sequence

1. Slice 1 en local: el script aborta ante un objetivo fuera de la lista blanca.
2. Corrida corta de humo (baja concurrencia) contra el front door; confirmar cero 429.
3. Corrida de línea base en ventana de bajo tráfico; publicar reporte.
4. Verificar revisión destino `Ready` + `surfaceHash` idéntico.
5. Mover tráfico, verificar front door, volver, verificar front door.
6. Publicar tiempos y retirar el `[verificar]` del runbook.

### Out-of-band coordination required

Ventana acordada con el operador para el Slice 3, por ser una manipulación deliberada del tráfico de una
superficie pública. Si se opta por la excepción temporal de Cloud Armor, también requiere su autorización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `../efeonce-mcp/scripts/load-smoke.mjs`, parametrizable, y aborta ante un objetivo fuera de su
      lista blanca de endpoints.
- [ ] Hay un reporte de línea base versionado con p50/p95/p99, tasa de error por código y conteo de instancias.
- [ ] El reporte declara explícitamente si la medición corrió bajo el techo de Cloud Armor o con excepción
      coordinada, y en el segundo caso consta la reversión verificada por lectura.
- [ ] El ensayo de rollback quedó ejecutado con timestamps de ida y vuelta y verificación del front door en
      ambos extremos.
- [ ] El marcador `**[verificar]**` del rollback salió del runbook, reemplazado por la evidencia.
- [ ] `concurrency`, `maxScale` y el throttle de Armor en el runbook coinciden con el runtime leído ese día.
- [ ] El criterio de smokes de `TASK-1626` quedó tildado con evidencia, o declarado bloqueado con razón.
- [ ] Cero gasto de proveedor atribuible a la corrida.

## Verification

- `pnpm check` en `../efeonce-mcp`
- corrida real del script contra el front door productivo
- `gcloud run services describe efeonce-mcp-gateway --region southamerica-west1` antes y después del ensayo
- `pnpm qa:gates --changed` y veredicto del QA release auditor

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado si cambió comportamiento o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-1626` y `TASK-1833`
- [ ] la línea base quedó donde alguien la vuelva a leer, no sólo en el reporte de la corrida

## Follow-ups

- Decidir si la carga se vuelve periódica en CI, con su costo y su ruido evaluados aparte.
- Revisar si `maxScale=20` es la capacidad correcta una vez que exista la línea base.

## Open Questions

- ¿El gateway tiene un entorno de staging separado donde ensayar el rollback sin tocar producción?
  El discovery no encontró uno `[verificar]`.
- ¿Dónde vive la línea base: repo hermano o runbook de Greenhouse?
