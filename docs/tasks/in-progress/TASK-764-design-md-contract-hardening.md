# TASK-764 — DESIGN.md Contract Hardening (CI gate + spec sync + token hygiene + agent injection)

## Delta 2026-05-02 — Audit de Design Tokens completado

Antes de implementar la task, se ejecutó audit transversal de Design Tokens documentado en [docs/audits/design-tokens/DESIGN_TOKENS_AUDIT_2026-05-02.md](../../audits/design-tokens/DESIGN_TOKENS_AUDIT_2026-05-02.md). El audit detectó **14 drift items** entre `DESIGN.md` (raíz), `GREENHOUSE_DESIGN_TOKENS_V1.md` y runtime real:

- 🔴 **3 críticos** — conflicto de paleta primaria/secundaria/info entre los tres planos. Requiere ADR de decisión de producto antes de continuar (bloqueante).
- 🟡 **5 medios** — version header V1 desactualizado, 14 customColors no documentados, component contracts cuantitativos faltan en V1, 16 paleta tokens DESIGN.md ausentes en V1 (= los 16 warnings actuales del linter), color drift en charts.
- 🟢 **6 bajos** — variants semánticos sub-utilizados (TASK-021 follow-up), fontWeight hardcoded 140+ instances, naming snake-case ↔ camelCase, cross-ref asimétrico, info color ausente en DESIGN.md, DM Sans residual en zonas excluidas legítimamente.

**Plan de resolución** (5 fases, ~2.5 días bloqueantes + 1-3 días opcionales):

1. **Fase 1** — Decisión paleta (ADR) → bloquea todo. Recomendación: runtime es source-of-truth, V1 actualiza valores.
2. **Fase 2** — Reconciliación V1 docs (header bump 1.4, customColors §8.3, component contracts §4.2, info en DESIGN.md).
3. **Fase 3** — Cierre design:lint warnings (16 → 0) referenciando tokens en component contracts. Activar strict mode.
4. **Fase 4** — Cross-ref V1 ↔ DESIGN.md + actualizar nota TASK-567 en V1 §3.2.
5. **Fase 5** — Deuda de adopción → vive en TASK-021 (variants + fontWeight) y TASK-770 nueva (charts + customColors orphans).

Los Slices originales 1-6 de la task se mantienen pero con scope concreto:

- Slice 1 (CI gate) sigue igual.
- **Slice 2** (sync DESIGN.md ↔ V1) ahora cubre drift items #1-9, #13-14 con el plan de Fases 1-2-4.
- **Slice 3** (resolver 16 warnings) ahora se mapea 1:1 con drift item #7 (los 16 tokens DESIGN.md ausentes en V1).
- Slices 4-6 sin cambios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-764-design-md-contract-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurecer la adopción de `DESIGN.md` (formato Google Labs `@google/design.md` v0.1.0) que ya
está commiteado en raíz pero hoy es un contrato decorativo: no hay CI gate, los warnings de
lint no se resuelven, no hay sync verificada con la spec extensa de tokens y los agentes UI
no lo cargan automáticamente. La task convierte el archivo en un contrato vivo y
auto-protegido, en orden de robustez (gate antes que contenido).

## Why This Task Exists

`DESIGN.md` se adoptó el 2026-05-01 (`changelog.md`) y se commiteó el 2026-05-02 (commit
`f8fc7200`). Hoy está vigente como referencia agent-facing pero la adopción quedó incompleta:

- **Sin CI gate** — `pnpm design:lint` corre solo manualmente. Cualquier PR puede romper el
  contrato (token huérfano nuevo, referencia inválida, contraste WCAG fail) sin que nadie se
  entere hasta que un agente lo lea con datos rotos.
- **16 warnings activos** — tokens definidos en YAML pero nunca referenciados por componentes
  (`primary-light`, `surface-dark`, `success`, `warning`, `error`, `border-subtle`, etc.).
  Indican que la baseline declarada no está alineada al uso real, o que faltan contratos de
  componente para dark mode / status chips semánticos.
- **Sync no verificada con `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`** — el protocolo
  de mantenimiento dice que cambios estructurales se sincronizan en ambos. Hoy
  `DESIGN.md` declara tokens (`numeric-id`, `numeric-amount`, `kpi-value`) que conviene
  verificar que existen también en la spec extensa.
- **Agentes UI no lo cargan automáticamente** — `AGENTS.md:86` pide leer `DESIGN.md` antes de
  generar UI, pero los skills (`greenhouse-ux`, `greenhouse-ui-review`, `modern-ui`) no lo
  inyectan por default. Depende de memoria humana / agente.
- **`design:diff` rompe sin baseline** — el script asume `DESIGN.prev.md` que no existe. Hoy
  no se puede usar para revisión de PRs.
- **Tailwind/DTCG export no se consume** — `pnpm design:export:tailwind` existe pero el
  output no entra en ningún build. Decisión arquitectónica pendiente.

Sin esto, el contrato se degrada en semanas: cualquier limpieza de tokens (punto 3) sin gate
(punto 1) se re-introduce con el primer PR siguiente.

## Goal

- CI gate automático que bloquea regresiones estructurales en `DESIGN.md` (errors block,
  warnings reportables sin bloquear)
- `DESIGN.md` y `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` alineados — toda divergencia
  es decisión consciente, no drift
- Cero warnings activos en `pnpm design:lint` con criterio (referenciar, mover a namespace
  `palette.*`, o eliminar token)
- Skills UI (`greenhouse-ux`, `greenhouse-ui-review`, `modern-ui`) inyectan `DESIGN.md` en su
  contexto por default
- `design:diff` operativo contra `git HEAD~1` (sin archivo paralelo `DESIGN.prev.md`)
- Decisión arquitectónica documentada sobre si MUI theme consume tokens generados desde
  `DESIGN.md` o si `DESIGN.md` sigue como reflejo del runtime

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — spec extensa canónica de tokens
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, librerías, patrones
- `DESIGN.md` (raíz) — contrato compacto agent-facing
- `AGENTS.md:86` — regla operativa que pide leer `DESIGN.md` para trabajos UI
- `CLAUDE.md` — sección "Charts" y otros contratos de UI vigentes

Reglas obligatorias:

- **Fuente de verdad runtime se mantiene**: `src/components/theme/mergedTheme.ts` y
  `src/app/layout.tsx` siguen siendo source-of-truth en runtime. `DESIGN.md` refleja runtime,
  no lo genera (al menos en V1 de esta task — el punto de inversión queda como Out of Scope o
  follow-up).
- **No inventar tokens nuevos en `DESIGN.md`** que no existan en runtime. Toda adición debe
  primero implementarse en theme.
- **No reintroducir DM Sans, Inter ni monospace** — el baseline activo es Poppins (display
  only) + Geist (todo lo demás).
- **CI gate debe ser fail-soft al inicio**: errors block, warnings report. Subir a "warnings
  block" solo cuando los 16 warnings actuales se hayan resuelto.
- **No tocar `DESIGN.md` en este orden roto**: nunca limpiar warnings (punto 3) antes de
  sync con spec V1 (punto 2), porque podés borrar tokens canónicos de la arquitectura.

## Normative Docs

- `DESIGN.md` (raíz) — contrato vigente, validado con `pnpm design:lint` (16 warnings, 0 errors)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — spec extensa canónica
- `package.json` — scripts `design:lint`, `design:diff`, `design:export:tailwind` y dep
  `@google/design.md@^0.1.1`
- `changelog.md` — entry del 2026-05-01 documentando la adopción
- `project_context.md` — Delta 2026-05-01 con regla operativa

## Dependencies & Impact

### Depends on

- `DESIGN.md` ya commiteado (commit `f8fc7200`, 2026-05-02)
- `@google/design.md@^0.1.1` instalado en `package.json`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` existe y es la spec canónica
- Skills UI presentes en `.claude/skills/`: `greenhouse-ux`, `greenhouse-ui-review`,
  `modern-ui`, `greenhouse-microinteractions-auditor`

### Blocks / Impacts

- **TASK-518 ApexCharts deprecation** — ECharts adoption necesita tokens de color/typography
  consistentes; esta task da el gate para que no se driftee.
- Cualquier task UI futura — el CI gate aplica transversal.
- Decisión arquitectónica de "MUI theme consume DESIGN.md tokens" queda como follow-up
  (TASK-765 si se aprueba la inversión de fuente de verdad).

### Files owned

- `DESIGN.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (sync, no ownership exclusiva)
- `.github/workflows/design-contract.yml` (nuevo)
- `package.json` (script `design:diff` actualizado)
- `.claude/skills/greenhouse-ux/SKILL.md`, `.claude/skills/greenhouse-ui-review/SKILL.md`,
  `.claude/skills/modern-ui/SKILL.md` (instrucciones de carga de DESIGN.md)
- `AGENTS.md` (refuerzo de la regla)
- `CLAUDE.md` (sección DESIGN.md hardening si aplica)

## Current Repo State

### Already exists

- [DESIGN.md](../../../DESIGN.md) en raíz, commiteado, 319 líneas, valida con 0 errors
- `@google/design.md@^0.1.1` en `package.json:229`
- Scripts `pnpm design:lint`, `pnpm design:diff`, `pnpm design:export:tailwind` en
  `package.json:11-13`
- Adopción documentada en `project_context.md` (Delta 2026-05-01) y `changelog.md`
- `AGENTS.md:86` ya menciona la regla operativa de leer `DESIGN.md`
- Skills UI (`greenhouse-ux`, `greenhouse-ui-review`, `modern-ui`) existen en
  `.claude/skills/`

### Gap

- **No CI workflow** que ejecute `pnpm design:lint` en PRs ni en push a `develop`/`main`
- **16 warnings activos** del linter, sin resolver:
  - Tokens de color huérfanos: `primary-light`, `primary-dark`, `secondary-light`,
    `secondary-dark`, `surface-dark`, `background-dark`, `text-primary-dark`,
    `text-secondary-dark`, `on-surface-dark`, `text-disabled`, `success`, `warning`,
    `error`, `border-subtle`, `neutral` (algunos)
  - Cada uno requiere decisión: referenciar en componente, mover a `palette.*` namespace
    no auditado, o eliminar
- **No verificada paridad** entre `DESIGN.md` y `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
  para los tokens nuevos (`numeric-id`, `numeric-amount`, `kpi-value`, `headline-display`,
  `page-title`, `section-title`, `overline`)
- **`pnpm design:diff` rompe** — el script apunta a `DESIGN.prev.md` que no existe en el
  repo
- **Skills UI no inyectan DESIGN.md** — depende de que el agente recuerde leerlo
- **No hay decisión arquitectónica** documentada sobre si `mergedTheme.ts` debe consumir
  tokens generados desde `DESIGN.md` (inversión de fuente de verdad)
- **Tailwind export no consumido** — `pnpm design:export:tailwind` no entra en build

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- A llenar por el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — CI gate (`design:lint` blocking en PRs)

- Crear `.github/workflows/design-contract.yml`:
  - Trigger: `pull_request` (paths: `DESIGN.md`, `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`,
    `package.json`) + `push` a `develop`/`main`
  - Job: instalar deps con `pnpm`, correr `pnpm design:lint --format json`, parsear summary
  - **Modo fail-soft inicial**: bloquea solo si `summary.errors > 0`. Si `summary.warnings > 0`
    publica un comment en el PR listando los warnings pero no bloquea.
  - **Modo strict** (post Slice 3): bloquea si `summary.warnings > 0` también.
- Agregar `pnpm design:lint` a checklist de pre-commit en `AGENTS.md` y `CLAUDE.md` si no
  está ya.
- Verificar que el workflow corre verde en una PR de prueba (touch en DESIGN.md sin cambio
  estructural).

### Slice 2 — Sync `DESIGN.md` ↔ `GREENHOUSE_DESIGN_TOKENS_V1.md`

- Generar matriz de tokens declarados en cada archivo:
  - Colores
  - Typography (sizes, weights, families)
  - Rounded
  - Spacing
  - Components contracts
- Para cada divergencia:
  - **Token en V1 pero no en DESIGN.md** → agregar a DESIGN.md si es canónico
  - **Token en DESIGN.md pero no en V1** → agregar a V1 (la spec extensa es la canónica
    completa) o eliminar de DESIGN.md si es accidental
  - **Token con valor distinto** → reconciliar con runtime (`mergedTheme.ts`) y tomar el
    valor de runtime como fuente de verdad
- Documentar la matriz en `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` como anexo
  "Mapping a DESIGN.md alpha" o sección equivalente.
- Confirmar contrastes WCAG AA en componentes nuevos si los agregamos.

### Slice 3 — Resolver 16 warnings con criterio

- Para cada warning:
  - **Tokens dark mode** (`surface-dark`, `background-dark`, `text-primary-dark`,
    `text-secondary-dark`, `on-surface-dark`): crear contratos `card-default-dark`,
    `input-default-dark`, `button-primary-dark` o moverlos a un namespace `palette.dark.*`
    documentado como "no auditado por contratos de componente" (decisión a tomar en
    Slice 2).
  - **Variantes de paleta** (`primary-light`, `primary-dark`, `secondary-light`,
    `secondary-dark`): referenciar en estados hover/active/disabled de los componentes
    existentes (e.g. `button-primary.hoverBackgroundColor: "{colors.primary-dark}"`).
  - **Estados disabled** (`text-disabled`): referenciar en `input-default.disabledTextColor`
    y `button-primary.disabledTextColor`.
  - **Status colors** (`success`, `warning`, `error`): crear contratos `status-chip-success`,
    `status-chip-warning`, `status-chip-error` o un solo `status-chip` parametrizado por
    variant token.
  - **Border** (`border-subtle`): referenciar en `card-default.borderColor`,
    `input-default.borderColor`.
  - **Neutral** (si emite warning): referenciar en backgrounds o eliminar si redundante.
- Cada cambio en `DESIGN.md` se verifica con `pnpm design:lint` (debe quedar 0 warnings).
- Sincronizar cambios estructurales en `GREENHOUSE_DESIGN_TOKENS_V1.md`.
- **Activar modo strict del CI gate** (Slice 1) — pasar de fail-soft a fail-hard en warnings.

### Slice 4 — Skills UI inyectan `DESIGN.md`

- Editar SKILL.md de cada skill UI relevante:
  - `.claude/skills/greenhouse-ux/SKILL.md`
  - `.claude/skills/greenhouse-ui-review/SKILL.md`
  - `.claude/skills/modern-ui/SKILL.md`
  - `.claude/skills/greenhouse-microinteractions-auditor/SKILL.md` (si aplica)
- Cada skill debe declarar en su preamble que carga `DESIGN.md` antes de tomar decisiones
  de UI, junto con `GREENHOUSE_DESIGN_TOKENS_V1.md` como spec extensa.
- Verificar invocando cada skill que el contexto incluye DESIGN.md.

### Slice 5 — `design:diff` operativo sin archivo paralelo

- Reemplazar el script `package.json:12`:
  - De: `"design:diff": "design.md diff DESIGN.md DESIGN.prev.md"`
  - A: script wrapper que extrae `DESIGN.md` de `git show HEAD~1:DESIGN.md` a un temp,
    corre `design.md diff` contra el actual, y limpia el temp.
- Alternativa si el CLI no soporta diff contra stdin: mantener `DESIGN.prev.md` como
  archivo regenerado por hook pre-commit (menos preferido — drift latente).
- Documentar el comando en `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`.

### Slice 6 — Decisión arquitectónica: ¿theme MUI consume DESIGN.md?

- **Producto de la slice**: documento de decisión en `docs/architecture/` que evalúa:
  - Opción A: `DESIGN.md` sigue como reflejo del runtime. Drift entre runtime y contrato se
    detecta vía CI gate + sync manual con spec V1. **Status quo robusto.**
  - Opción B: `pnpm design:export:tailwind` y/o un export a TS tokens consumido por
    `mergedTheme.ts`. Inversión de fuente de verdad. Más automático pero menos reversible.
- Si la decisión es B, abrir TASK-765 separada para implementarlo (no en esta task).
- Si la decisión es A, documentar explícitamente en `DESIGN.md` (sección Maintenance Protocol)
  y cerrar el punto.

## Out of Scope

- **Implementación de Opción B (theme consume DESIGN.md)** — vive en TASK-765 follow-up si se
  aprueba la inversión.
- **Refactor de runtime tokens** — esta task no toca `mergedTheme.ts` salvo para sincronizar
  contratos de componente añadidos en Slice 3.
- **Dark mode visual completo** — solo se asegura que los tokens dark están referenciados por
  contratos. Implementación visual de dark mode es task aparte.
- **Migración de ApexCharts a ECharts** (TASK-518) — convive con esta task; se beneficia del
  gate pero no es bloqueada por ella.
- **Auditoría visual de vistas existentes** — solo se hace el gate; el barrido de vistas que
  no respetan tokens es trabajo separado.

## Detailed Spec

### CI workflow (`.github/workflows/design-contract.yml`)

```yaml
name: Design Contract

on:
  pull_request:
    paths:
      - 'DESIGN.md'
      - 'docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md'
      - 'package.json'
      - '.github/workflows/design-contract.yml'
  push:
    branches: [develop, main]
    paths:
      - 'DESIGN.md'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Run design:lint
        run: pnpm design:lint --format json > design-lint.json
      - name: Parse and report
        run: |
          ERRORS=$(jq '.summary.errors' design-lint.json)
          WARNINGS=$(jq '.summary.warnings' design-lint.json)
          echo "errors=$ERRORS" >> $GITHUB_OUTPUT
          echo "warnings=$WARNINGS" >> $GITHUB_OUTPUT
          if [ "$ERRORS" -gt 0 ]; then
            jq '.findings[] | select(.severity=="error")' design-lint.json
            exit 1
          fi
          if [ "$WARNINGS" -gt 0 ]; then
            echo "::warning::DESIGN.md has $WARNINGS warnings (non-blocking in fail-soft mode)"
            jq '.findings[] | select(.severity=="warning")' design-lint.json
          fi
```

Post Slice 3: agregar `if [ "$WARNINGS" -gt 0 ]; then exit 1; fi` para modo strict.

### Token namespace decisión (Slice 3)

Si decidimos no crear contratos de componente para todos los tokens semánticos huérfanos
(success/warning/error/border-subtle), proponemos este patrón en `DESIGN.md`:

```yaml
palette:
  status:
    success: "{colors.success}"
    warning: "{colors.warning}"
    error: "{colors.error}"
  border:
    subtle: "{colors.border-subtle}"
  dark:
    surface: "{colors.surface-dark}"
    # ...
```

`palette.*` se documenta como "tokens semánticos disponibles para uso programático en
runtime, no auditados como parte de contratos de componente". El linter de `@google/design.md`
no debería emitir warning sobre tokens dentro de `palette.*` (verificar comportamiento — si
emite, escalar a opción de crear contratos por componente).

### Skills UI injection pattern (Slice 4)

Cada SKILL.md debe incluir en su preamble (sección de "Mandatory reading"):

```markdown
## Mandatory context (load before any UI decision)

1. `DESIGN.md` (raíz) — contrato visual compacto agent-facing
2. `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — spec extensa canónica
3. `src/components/theme/mergedTheme.ts` — fuente de verdad runtime

If a token decision conflicts: runtime > spec V1 > DESIGN.md.
If `DESIGN.md` lint emits warnings, surface them to the user before proceeding.
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `.github/workflows/design-contract.yml` existe, corre en PRs y push a develop/main
- [ ] Workflow falla si `pnpm design:lint --format json` reporta `summary.errors > 0`
- [ ] Workflow reporta warnings sin bloquear hasta que Slice 3 cierre; luego bloquea también
- [ ] `pnpm design:lint` retorna 0 errors y 0 warnings al cerrar Slice 3
- [ ] `DESIGN.md` y `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` tienen mapping
  documentado y valores reconciliados con runtime
- [ ] `.claude/skills/greenhouse-ux/SKILL.md`, `greenhouse-ui-review/SKILL.md`, y
  `modern-ui/SKILL.md` declaran carga obligatoria de `DESIGN.md`
- [ ] `pnpm design:diff` corre sin error contra `git HEAD~1` (o equivalente robusto)
- [ ] Decisión arquitectónica Opción A vs B documentada en `docs/architecture/` con fecha y
  rationale
- [ ] Si la decisión es B, TASK-765 creada en `to-do/` con scope claro
- [ ] `AGENTS.md` y `CLAUDE.md` actualizados si la regla operativa cambió
- [ ] `changelog.md` actualizado con el cierre

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm design:lint` (debe retornar 0/0)
- `pnpm design:diff` (debe correr sin error)
- Crear PR de prueba modificando `DESIGN.md` con un token roto a propósito; verificar que el
  workflow falla. Revertir.
- Invocar skill `greenhouse-ux` en una task UI dummy; verificar que carga `DESIGN.md`.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real
- [ ] archivo en carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` actualizado con TASK-764
- [ ] `Handoff.md` actualizado con cambios y aprendizajes
- [ ] `changelog.md` actualizado con la finalización del hardening de DESIGN.md
- [ ] chequeo de impacto cruzado sobre TASK-518 (ApexCharts deprecation) y otras tasks UI
  activas
- [ ] decisión arquitectónica Opción A/B publicada
- [ ] si decisión es B, TASK-765 creada y enlazada

## Follow-ups

- TASK-765 (condicional) — implementar inversión de fuente de verdad: theme MUI consume
  tokens generados desde `DESIGN.md`
- Audit transversal de vistas existentes que no respetan tokens (separado, no bloquea)
- Hook de pre-commit local opcional que corre `pnpm design:lint` antes de permitir commits
  que tocan `DESIGN.md`
- Integración con Figma MCP para sincronizar variables Figma ↔ DESIGN.md tokens (largo plazo)

## Open Questions

- ¿El linter de `@google/design.md` audita tokens dentro de namespaces custom (e.g.
  `palette.*`)? Si sí, no podemos usar el patrón de namespace para tokens semánticos
  huérfanos y hay que crear contratos de componente.
- ¿Mantenemos el script `design:diff` o lo eliminamos hasta que el CLI soporte diff contra
  git nativamente?
- ¿La inversión de fuente de verdad (Opción B) requiere bumpear DESIGN.md a un release
  candidate más estable que alpha 0.1.0? El formato puede cambiar.
