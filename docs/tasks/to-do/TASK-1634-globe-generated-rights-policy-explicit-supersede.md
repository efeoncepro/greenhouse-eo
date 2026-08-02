# TASK-1634 — Globe Generated Rights Policy Explicit Supersede

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El sistema publica por diseño el estado que su propio lector rechaza: promover una ruta con una atestación
corregida **agrega** una policy en el mismo scope, mientras `resolveExact` **falla cerrado ante cualquier
multiplicidad**. Cada re-atestación mata su ruta. Esta task hace la supersesión explícita, replicando el
patrón append-only + VIEW efectiva que la migración `0048` ya canonizó en la tabla vecina.

## Why This Task Exists

El 2026-08-02 Globe dejó de generar durante ~11 horas. Causa: dos versiones de la misma policy
(`producer-rights-v1` y `v1`) con `valid_from` **idéntico** en tres rutas, producto de un seed corrido dos
veces en julio. El resolver falla cerrado ante el empate y negaba con
`generated_rights_policy_not_authorized`, sin cobrar un crédito.

La ruta `ref/motion/reference-v1` (Omni) llevaba así **desde el 31 de julio** — tres días —, tapada porque
esa ruta estaba desactivada. `62337b4` la activó y el problema salió a la luz.

Se restauró el servicio publicando cada policy con `validFrom` de hoy, para romper el empate. **Eso fue una
restauración, no un arreglo**: mientras el contrato de escritura pueda dejar dos filas válidas en el mismo
scope, el defecto se reproduce solo, ruta por ruta, cada vez que alguien re-atesta. Y el TTL de 365 días
garantiza el solapamiento.

## Goal

Que la cardinalidad «exactamente una policy vigente por scope» sea un **invariante del schema** y no una
esperanza del desempate por fecha, sin perder un byte de historia de derechos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Aplica el patrón **VIEW canónica + helper + señal** ya aceptado por este equipo en `0048`
(`generated_asset_rights_authority_corrections` + `..._effective`), en la tabla de al lado. No se inventa
primitive: se replica la que existe, en el dominio contiguo.

## Normative Docs

- `docs/architecture/creative-studio/` — arquitectura de Globe.
- `packages/database/migrations/0048_generated_asset_lineage_corrections.sql` (Globe) — el patrón a replicar.
- `packages/database/src/stores/generated-rights-policy-store.ts` (Globe) — `resolveExact`.
- `packages/domain/src/commercial-promotion-lane.ts` (Globe) — el lado escritura.
- `HANDOFF-GLOBE-RIGHTS-INCIDENT.md` — evidencia del incidente.

## Dependencies & Impact

- **Depende de:** nada. Es autocontenida.
- **Impacta a:** toda promoción de ruta (`fa286db` y su lane), el compiler de rutas de producción, y
  cualquier canary futuro. `ISSUE-135` comparte familia pero es independiente.
### Files owned

Todos en `efeonce-globe`:

- `packages/database/migrations/00XX_generated_rights_policy_supersede.sql` (nueva)
- `packages/database/src/stores/generated-rights-policy-store.ts`
- `packages/domain/src/commercial-promotion-lane.ts`
- `scripts/globe-operator-lane.mjs` y `.github/workflows/globe-operator-lane.yml`

## Current Repo State

- `generated_rights_policies` es append-only con trigger anti-UPDATE/DELETE (migración `0019`), workspace en
  la llave (`0026`) y `purpose` (`0040`).
- `resolveExact` hace `LIMIT 2` y devuelve `undefined` si hay empate en el `valid_from` más nuevo
  (`eae839b`, 2026-08-02) — antes devolvía `undefined` ante **cualquier** par de filas (`d7e1881`, 31-jul).
- La UNIQUE incluye `policy_version`, así que dos versiones del mismo scope conviven legalmente.
- `globe.model-rights.list` existe en la API y el `auto-lane` tiene la capability, pero el modo **no está
  expuesto** en el carril de operador: hoy no se pueden enumerar atestaciones.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `efeonce-globe` — `packages/database` (migración, store, VIEW), `packages/domain`
  (promotion lane), `scripts/globe-operator-lane.mjs` (modo de lectura).
- Future candidate home: `remain-shared`
- Boundary: la autoridad de rights se resuelve **sólo** por `generated-rights-policy-store`; consumidores
  autorizados: el compiler de rutas de producción y el promotion lane. Ningún callsite lee la tabla directo.
- Server/browser split: `n/a` — nada de esto cruza al payload cliente.
- Build impact: `none` — migración SQL + TypeScript existente, sin dependencias nuevas.
- Extraction blocker: la supersesión y la publicación deben ocurrir en la **misma transacción**; separar
  escritura y supersesión en runtimes distintos reintroduce exactamente la ventana de ambigüedad que esta
  task cierra.

## Backend/Data Contract

Migración aditiva + VIEW + cambio de lectura. Sin borrar filas, sin UPDATE sobre historia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Enumerar antes de tocar

- Modo `rights-list` en `scripts/globe-operator-lane.mjs` → `globe.model-rights.list`, lane `auto-lane`,
  payload `{limit, providerId?, cursor?}`, más su par en la validación del workflow y la opción del `choice`.
- Auditoría de **todas** las rutas con `policy-list`: cuáles tienen ≥2 filas vigentes en el mismo scope.
  Va primero porque sin esta vista los otros slices se diagnostican a ciegas — y porque puede haber rutas
  hoy desactivadas que morirían al activarse, como pasó con Omni.

### Slice 2 — Supersesión explícita

- Migración: tabla de correcciones append-only con trigger anti-UPDATE/DELETE, referenciando la policy
  superseded por su digest, replicando `0048`.
- VIEW `generated_rights_policies_effective`: corrección `UNION ALL` original-sin-corregir.
- `resolveExact` lee la VIEW. La cardinalidad ≤1 por scope pasa a ser propiedad del schema.

### Slice 3 — Cerrar el lado escritura

- `commercial-promotion-lane` declara a quién supersede al publicar en un scope ocupado, en la misma
  transacción. Publicar sin declararlo falla.

### Slice 4 — Señal

- `globe.rights.policy_ambiguity` (steady = 0): cuántos scopes tienen más de una policy vigente. Habría
  gritado el 31 de julio en vez de dejarlo tres días.

## Detailed Spec

**El patrón a replicar** (`0048_generated_asset_lineage_corrections.sql`, tabla vecina):

```sql
CREATE TABLE generated_rights_policy_corrections (
  workspace_id  text NOT NULL,
  scope_digest  text NOT NULL,   -- sha256(workspace, route, provider, model, version, purpose, appliesTo)
  correction_id text NOT NULL,
  previous_policy_version text NOT NULL,   -- a quién supersede, explícito
  policy        jsonb NOT NULL,
  reason_code   text NOT NULL,
  actor_id      text NOT NULL,
  recorded_at   timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, scope_digest),   -- ← UNA corrección vigente por scope, por schema
  FOREIGN KEY (workspace_id, previous_policy_version) REFERENCES generated_rights_policies (...)
);
-- + trigger anti-UPDATE/DELETE, + RLS por workspace, igual que 0048

CREATE VIEW generated_rights_policies_effective AS
  SELECT ... FROM generated_rights_policy_corrections
  UNION ALL
  SELECT ... FROM generated_rights_policies p
   WHERE NOT EXISTS (SELECT 1 FROM generated_rights_policy_corrections c
                      WHERE c.workspace_id = p.workspace_id AND c.scope_digest = scope_digest_of(p));
```

**La clave del diseño:** `PRIMARY KEY (workspace_id, scope_digest)` en la tabla de correcciones. Eso hace
que dos correcciones vigentes del mismo scope sean **imposibles**, que es justo lo que el desempate por
`valid_from` no puede garantizar. La historia original queda intacta y consultable.

**`resolveExact` pasa a leer la VIEW.** Su `LIMIT 2` + `length === 1` se conserva como red de seguridad —
si alguna vez devolviera dos, sigue fallando cerrado. Lo que cambia es que ahora **no puede** devolver dos.

**Equivalencia obligatoria antes del cutover:** correr ambas resoluciones sobre las tuplas reales de las 12
rutas con policy vigente y exigir resultado idéntico. Una VIEW mal construida que devuelva 0 filas produce
exactamente el incidente que esta task existe para prevenir.

## Out of Scope

- `ISSUE-135` (reintento infinito de la outbox). Misma familia, dueño distinto.
- Decidir si una corrección de rights exige **atestación nueva** o puede reafirmar la existente — ver
  Open Questions.
- Tocar `generated_asset_rights_authority` (lineage por asset): ya tiene su patrón desde `0048`.

## Rollout Plan & Risk Matrix

Slice 1 es lectura pura, sin riesgo. Slice 2 es aditivo: la VIEW convive con la tabla hasta que
`resolveExact` cambie de fuente, y ese cambio es el único punto reversible por revert de código. Slice 3
puede romper una promoción legítima si el lane no encuentra a quién superseder — mitigación: primero
observar (Slice 4), después exigir.

**Riesgo mayor:** una VIEW mal construida devuelve 0 filas y **niega todo**, exactamente el síntoma del
incidente. Mitigación dura: antes del cutover, correr `resolveExact` viejo y nuevo sobre las mismas tuplas
y exigir resultado idéntico en las 12 rutas con policy vigente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Dos policies vigentes en el mismo scope son **imposibles** por schema, no por convención.
- [ ] Publicar en un scope ocupado exige declarar a quién supersede, en la misma transacción.
- [ ] Ni un `UPDATE` ni un `DELETE` sobre historia de derechos: la supersesión es una fila nueva.
- [ ] `resolveExact` viejo y nuevo devuelven lo mismo en las 12 rutas con policy vigente.
- [ ] `rights-list` enumera atestaciones desde el carril gobernado.
- [ ] `globe.rights.policy_ambiguity` existe, lee de la VIEW y está en 0.
- [ ] `pnpm check` y `pnpm build` salen 0 en Globe.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Equivalencia vieja/nueva resolución sobre las tuplas reales, con la salida en el transcript.
- `pnpm task:lint --task TASK-1634` y `pnpm ops:lint --changed`.

## Closing Protocol

- [ ] Lifecycle, carpeta, registry y README sincronizados.
- [ ] `HANDOFF-GLOBE-RIGHTS-INCIDENT.md` actualizado con el cierre.
- [ ] Documentation governor y QA release auditor ejecutados.

## Follow-ups

- Retirar las policies `producer-rights-v2-dedupe` publicadas el 2026-08-02 para restaurar servicio, una vez
  que la supersesión explícita exista: quedaron como desempate, no como corrección atestada.

## Open Questions

- **¿Una corrección de rights exige atestación nueva, o puede reafirmar la existente?** El 2026-08-02 se
  hizo lo segundo para restaurar servicio, y fue defendible porque los términos del proveedor no cambiaron.
  Como política permanente es una decisión de gobernanza, no técnica. **Bloqueante para Slice 3.**
