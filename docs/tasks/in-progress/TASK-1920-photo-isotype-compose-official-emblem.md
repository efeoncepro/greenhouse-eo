# TASK-1920 — `foto:isotipo`: componer el isotipo oficial sobre prendas generadas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Status real: `Implementación completa; cierre documental pendiente (Handoff/changelog con TASK-1919)`
- Rank: `TBD`
- Domain: `creative|brand`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`pnpm foto:isotipo` (commit `f3f93c926`) compone el isotipo oficial de `@efeoncepro/axis-brand-assets` sobre el pecho
de una prenda generada cuando `pnpm foto:emblema` muestra un emblema distinto al de Efeonce. Falta blindarlo con
pruebas y dejar el orden de uso escrito en la regla, el canon de fotografía y la skill.

## Why This Task Exists

Gap: el comando existe sin pruebas y sin lugar en el flujo documentado; el canon ya dice que el emblema «se compone
después», pero no nombra el comando ni el orden (referencias del kit → `foto:emblema` → `foto:isotipo`).

## Goal

- Pruebas del comando que fallan si deja de limpiar la marca inventada, de componer el isotipo oficial o de validar
  sus argumentos.
- El orden de uso queda escrito donde los agentes lo leen: `.claude/rules/brand-photography.md`, el canon de
  fotografía y la skill de diseño.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

No architectural impact. Reglas que se respetan:

- El isotipo sale siempre de `@efeoncepro/axis-brand-assets` (nunca de una copia a mano) y queda con procedencia
  (versión del paquete y SHA-256 del SVG).
- Las referencias del kit en la ficha siguen siendo el primer paso; `foto:isotipo` es la corrección, sólo cuando
  `foto:emblema` muestra que el emblema difiere (`.claude/rules/brand-photography.md`, «El emblema bordado NO se
  genera… componerlo después»).

## Normative Docs

- `.claude/rules/brand-photography.md`
- `docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`
- `docs/operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md` [verificar] sección de vestuario y
  emblema al tocarla

## Dependencies & Impact

### Depends on

- `scripts/foto/isotipo.mjs` y el script `foto:isotipo` en `package.json` (commit `f3f93c926`).
- `@efeoncepro/axis-brand-assets` 0.3.2 (isotipo negativo y positivo).
- `scripts/foto/emblema.mjs` (`pnpm foto:emblema`), que es el paso previo.

### Blocks / Impacts

- Hermana de `TASK-1918` (foto:prompt y chequeos de la lente): ambas tocan el flujo `foto:*` pero no el mismo
  archivo ni la misma regla; sin solape.
- Toda pieza de marca propia con uniforme (polo, softshell, hoodie) en primer plano.

### Files owned

- `scripts/foto/isotipo.mjs`
- `scripts/foto/isotipo.test.mjs`
- `.claude/rules/brand-photography.md` (entrada del emblema)
- `docs/operations/brand-photography/README.md` o el documento del canon que fije el orden [verificar]
- `.claude/skills/design-studio/**` (referencia del lenguaje fotográfico) y su espejo `.codex/`

## Current Repo State

### Already exists

- `scripts/foto/isotipo.mjs`: limpia la zona midiendo el tono de la tela, rasteriza el isotipo oficial (negativo en
  prenda oscura, positivo en clara), lo compone con rotación y brillo, y escribe `<plate>-isotipo.png` más un `.json`
  de procedencia. Hoy corre su lógica a nivel de módulo leyendo `process.argv`, sin exportar funciones.

### Gap

- Sin pruebas; la lógica no es importable para probarla.
- La regla y el canon no nombran el comando ni el orden de uso.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `scripts/foto/isotipo.mjs` (CLI local)
- Future candidate home: `remain-shared`
- Boundary: comando local `pnpm foto:isotipo`; no tiene consumers de código
- Server/browser split: `n/a — herramienta de línea de comandos`
- Build impact: `none`
- Extraction blocker: `none`

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

### Slice 1 — Comando (hecho)

- `scripts/foto/isotipo.mjs` y script `foto:isotipo` en `package.json` (commit `f3f93c926`).

### Slice 2 — Pruebas del comando

- Separar la lógica en funciones exportadas (parseo de argumentos, limpieza, composición) y dejar la ejecución CLI
  detrás de un guard de módulo principal, sin cambiar la conducta.
- `scripts/foto/isotipo.test.mjs` con `node:test`: un plate sintético (tela lisa con un emblema falso de alto
  contraste) queda con la zona limpia (diferencia de luminancia bajo el umbral fuera del isotipo) y con el isotipo
  oficial presente en la caja; la procedencia registra la versión del paquete y el SHA-256 del SVG.
- Validación de argumentos: `--centro` y `--ancho` fuera de 0–1, `--prenda` desconocida o plate inexistente fallan
  con mensaje y código distinto de cero.

### Slice 3 — Regla, canon y skill

- `.claude/rules/brand-photography.md`: en la entrada «El emblema bordado NO se genera», el orden explícito
  referencias del kit → `pnpm foto:emblema` → `pnpm foto:isotipo` sólo si difiere.
- Canon de fotografía: el mismo orden con el comando nombrado.
- Skill `design-studio` (referencia del lenguaje fotográfico): el mismo orden, espejado a `.codex/`.

## Out of Scope

- Simular bordado verosímil en primer plano (el comando compone plano; si la pieza lo pide, se rehace la foto).
- Detectar automáticamente la caja del emblema.
- `foto:prompt` y los chequeos de la lente (TASK-1918).

## Rollout Plan & Risk Matrix

N/A — additive change, no production runtime impact, no rollback needed: herramienta local de línea de comandos y
documentación; el refactor del Slice 2 no cambia la salida y lo cubren las pruebas nuevas.

### Slice ordering hard rule

- Slice 1 (hecho) → Slice 2 → Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El refactor para exportar funciones cambia la salida del comando | tooling fotográfico | low | prueba sobre plate sintético antes y después del refactor | prueba de `isotipo.test.mjs` roja |

### Feature flags / cutover

Sin flag — additive, cutover inmediato al commitear.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 2 | revertir el commit de `isotipo.mjs` y su prueba | minutos | si |
| Slice 3 | revertir el commit de regla, canon y skill | minutos | si |

### Production verification sequence

Sin producción (repo-only). Local: `node --test scripts/foto/isotipo.test.mjs` y una corrida real de
`pnpm foto:isotipo` sobre un plate con emblema inventado, revisada con `pnpm foto:emblema`.

### Out-of-band coordination required

Ninguna — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `pnpm foto:isotipo` existe y compone el isotipo de `@efeoncepro/axis-brand-assets` con procedencia (commit
      `f3f93c926`).
- [x] `scripts/foto/isotipo.test.ts` prueba que un emblema falso sintético desaparece de la zona y que el isotipo
      oficial queda en la caja (va en `.ts` para que lo corra la suite `vitest` de CI; los `.test.mjs` de `scripts/foto` no
      están en ningún runner).
- [x] La prueba verifica que la procedencia registra versión del paquete y SHA-256 del SVG.
- [x] Argumentos inválidos (`--centro`/`--ancho` fuera de 0–1, `--prenda` desconocida, plate inexistente) fallan con
      mensaje y código distinto de cero, con prueba (`IsotipoError`; el CLI sale con 1 e imprime el uso).
- [x] La salida del comando es idéntica antes y después del refactor: medido sobre el plate real M1 del polo
      (`web-movil/plates/M1-avanza-polo.png`), 0 bytes distintos de 7 340 032.
- [x] `.claude/rules/brand-photography.md`, el canon de fotografía (`EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md`) y la
      skill `design-studio` (`references/efeonce-photographic-language.md`) nombran el orden referencias del kit →
      `foto:emblema` → `foto:isotipo` sólo si difiere; espejo `.codex/` al día (`pnpm skills:mirrors` idéntico).

## Verification

- `node --test scripts/foto/isotipo.test.mjs`
- `pnpm lint`
- `pnpm skills:mirrors`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] la regla, el canon y la skill quedaron coherentes entre sí (mismo orden, mismo comando)

## Follow-ups

- Si el volumen lo justifica: detección asistida de la caja del emblema a partir de la ficha.
