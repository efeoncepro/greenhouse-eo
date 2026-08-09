# TASK-1680 — Cerrar la canilla del carril viejo: el lint pasa a `error`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1679`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `client-portal-legacy-branching-sweep`
- GitHub Issue: `none`

## Summary

El lint `greenhouse/no-untokenized-business-line-branching` está en `warn` desde mayo de 2026. Detecta
exactamente el branching legacy que las tasks del carril vinieron a eliminar, y no bloquea nada: se
puede seguir escribiendo código del carril viejo sin que el CI se queje. Esta task lo promueve a
`error` y limpia el override block.

## Why This Task Exists

Tres meses de arreglar instancias mientras la puerta seguía abierta. Cuando `TASK-827` creó este lint
en `warn`, la intención era barrer primero y endurecer después; el barrido nunca se declaró terminado,
así que el `warn` se volvió permanente por omisión.

Va última de la familia a propósito: promoverlo antes de `TASK-1678` y `TASK-1679` volvería rojo el CI
por código que esas dos tasks van a reescribir de todos modos.

Cierra la deuda `client-portal-legacy-branching-sweep`, uno de los cinco follow-ups que `TASK-827`
dejó nombrados en prosa y sin ID. De esos cinco, el único que se ejecutó en tres meses fue el que
recibió un ID (`TASK-1675`). Registrar esta deuda es parte del arreglo, igual que allá.

## Goal

- El lint bloquea: escribir branching legacy nuevo falla el CI.
- El override block queda con los paths que realmente lo necesitan y con la razón escrita.
- Los markers `// client-portal-allowed:` que ya no aplican, retirados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (§12.1)
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`
- `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md`

Reglas obligatorias:

- **NUNCA** ampliar el override block para silenciar código nuevo: el override es para deuda declarada
  con dueño, no para esquivar la regla.
- **NUNCA** desactivar la regla con `// eslint-disable-next-line`. Si emerge un caso legítimo, va al
  override block con comentario que lo justifique.
- **SIEMPRE** que se exima un path, dejar escrito quién es el dueño de retirarlo.

## Normative Docs

- `docs/tasks/complete/TASK-827-client-portal-composition-layer-ui.md` — creó el lint en `warn` y nombró este sweep
- `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md` — mide lo que queda del carril viejo y cuánto es legítimo

## Dependencies & Impact

### Depende de

- `TASK-1678` y `TASK-1679` — **bloqueantes**: reescriben el código que hoy dispara el lint
- `eslint-plugins/greenhouse/rules/no-untokenized-business-line-branching.mjs` — existe, con su RuleTester

### Impacta a

- Todo PR futuro que toque el carril viejo
- `TASK-1388` (vertical menu restructure) — toca `VerticalMenu.tsx`, hoy exento
- `capability-modules-resolver-migration` — el bloque `businessLines`/`serviceModules` es uno de los
  motivos por los que `VerticalMenu.tsx` sigue exento

### Files owned

- `eslint.config.mjs` (la regla y su override block)
- `src/components/layout/vertical/VerticalMenu.tsx` (el marker `// client-portal-allowed:`)
- `src/app/(dashboard)/layout.tsx` (el marker agregado por `TASK-1675`)

## Current Repo State

### Already exists

- La regla `greenhouse/no-untokenized-business-line-branching` con su RuleTester
- El override block en `eslint.config.mjs`, con 7 paths exentos
- El mecanismo de marker inline `// client-portal-allowed: <razón>`

### Gap

- La regla está en `warn`: no bloquea.
- El override block exime `src/components/layout/vertical/VerticalMenu (1).tsx`, un archivo **muerto**
  —copia con espacio-paréntesis del componente real— que sigue trackeado en git. La gobernanza está
  protegiendo un archivo que no existe funcionalmente.
- El marker de `VerticalMenu.tsx` se actualizó en `TASK-1675`, pero su alcance real depende de que
  `capability-modules-resolver-migration` siga pendiente.
- No hay medición de cuántas violaciones quedarían al promover: es lo primero que hace el Slice 1.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `eslint.config.mjs` + `eslint-plugins/greenhouse/**`, ejecutado por `pnpm lint` y el CI
- Future candidate home: `remain-shared`
- Boundary: la regla es tooling de repo; no consume ni expone contratos de dominio
- Server/browser split: `n/a`
- Build impact: `none` — sin dependencias nuevas
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Medir antes de promover

- Correr la regla en modo `error` sobre el repo y listar cada violación con su archivo.
- Clasificar cada una: legítima (va al override con razón y dueño) o deuda a corregir en esta task.
- Si la lista es grande, es señal de que `TASK-1678`/`TASK-1679` no cerraron lo que se esperaba:
  reportar antes de seguir, no ampliar el override para llegar a verde.

### Slice 2 — Limpiar el override block

- Retirar `VerticalMenu (1).tsx` del override (y evaluar borrar el archivo, que es código muerto).
- Cada path que quede exento se queda con una razón escrita y el nombre de quién lo retira.

### Slice 3 — Promover a `error`

- La regla pasa a `error` en `eslint.config.mjs`.
- `pnpm lint` en verde con el override ya depurado.

## Out of Scope

- Migrar `capabilityModules` al resolver — es `capability-modules-resolver-migration`, todavía sin ID.
- Los ~86 puntos de decisión legítimos del carril rol→vista: la regla no los toca y no deben tocarse.
- Cambiar la lógica de la regla o su detección: sólo cambia su severidad y su override.

## Detailed Spec

**Por qué esta task va última y no primera.** Intuitivamente conviene cerrar la puerta antes de limpiar
la pieza. Pero la regla detecta el branching que `TASK-1678` y `TASK-1679` van a reescribir: promoverla
antes vuelve rojo el CI por código que está a punto de desaparecer, y la salida más fácil sería ampliar
el override — o sea, dejarla más floja que ahora.

**Por qué el Slice 1 puede detener la task.** Si al medir aparecen muchas violaciones legítimas, la
conclusión no es "ampliemos el override": es que el carril viejo tiene más superficie de la que el
inventario midió, y eso merece volver al inventario antes que a `eslint.config.mjs`. Un override que
crece para que el lint pase verde es exactamente el mecanismo que dejó la regla en `warn` tres meses.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **La task entera va después de `TASK-1678` y `TASK-1679`.** Ver §Detailed Spec.
- Slice 1 antes que 2 y 3: sin la medición, promover es a ciegas.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| El CI queda rojo y se destraba ampliando el override | Gobernanza del carril | Media | El Slice 1 obliga a clasificar antes de eximir; una lista grande detiene la task en vez de inflar el override | Diff de `eslint.config.mjs`: si crece, es la señal |
| Se borra `VerticalMenu (1).tsx` y algo lo importaba | Portal | Baja | Verificar importadores antes de borrar; si algo lo usa, no se borra y se reporta | `pnpm build` |
| Bloquea PRs de terceros que tocan el carril legítimamente | Velocidad del equipo | Media | El override conserva los paths legítimos con razón escrita | PRs rojos por esta regla |

### Feature flags / cutover

`N/A — cambio de tooling de repo, sin runtime de producción.` La regla afecta al CI y al pre-push, no
al comportamiento del producto. El rollback es una línea.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | Nada que revertir: sólo mide y produce una lista | — | sí |
| 2 | revert PR (vuelven los paths al override) | <5 min | sí |
| 3 | revert PR (la regla vuelve a `warn`) | <5 min | sí |

### Production verification sequence

`N/A — la task no cambia runtime de producción.` La verificación es `pnpm lint` en verde y un PR de
prueba que introduzca branching legacy y falle el CI como se espera.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La regla `greenhouse/no-untokenized-business-line-branching` está en `error`.
- [ ] `pnpm lint` pasa en verde en `develop`.
- [ ] `VerticalMenu (1).tsx` ya no está en el override block (y se decidió si el archivo se borra).
- [ ] Cada path que queda exento tiene razón escrita y dueño nombrado.
- [ ] El Slice 1 dejó por escrito la lista de violaciones y su clasificación.
- [ ] Un PR de prueba con branching legacy nuevo **falla** el CI.
- [ ] El override block no creció respecto del estado inicial (o si creció, cada adición está justificada).

## Verification

- `pnpm lint`
- `pnpm local:check`
- PR de prueba que introduzca branching legacy y confirme que el CI lo rechaza

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si el cambio de severidad afecta el flujo de trabajo del equipo
- [ ] chequeo de impacto cruzado (`TASK-1388`, `capability-modules-resolver-migration`)
- [ ] `CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md` actualizado: la canilla queda cerrada

## Follow-ups

- `capability-modules-resolver-migration` — migrar el bloque `businessLines`/`serviceModules` del menú cliente al resolver. Sigue sin ID desde mayo de 2026, y es uno de los motivos por los que `VerticalMenu.tsx` sigue exento.
- Borrar `src/components/layout/vertical/VerticalMenu (1).tsx` si el Slice 2 confirma que nadie lo importa.

## Open Questions

1. ¿`VerticalMenu.tsx` puede salir del override después de `TASK-1678`/`TASK-1679`, o su exención sobrevive hasta `capability-modules-resolver-migration`? Depende de si el branching que queda ahí es sólo el de `capabilityModules`. El Slice 1 lo responde con datos.
