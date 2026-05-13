# ISSUE-076 — Vercel CLI duplicate project recurrent bug class (closes recurrencia ISSUE-013)

> **Estado:** Resolved
> **Detectado:** 2026-05-13 vía email burst de Vercel a inbox personal del operador durante session intensiva de pushes (TASK-827 + ISSUE-075). Burst llamó la atención del usuario que reportó "este error me está llegando muchísimo".
> **Resuelto:** 2026-05-13 con defense-in-depth de 3 capas (delete duplicado + `.vercel/project.json` checked-in + regla canónica CLAUDE.md "Vercel CLI Scope Discipline").
> **Severidad:** Baja operacional (no afecta producción), Media documental (bug class recurrente sin defensa estructural canonizada).
> **Detectado por:** Usuario reportó email burst; Claude diagnosticó causa raíz analizando git history + Handoff archive del 14 abril.

## Ambiente

production (Vercel cloud), local (developer/agent machines corriendo `vercel` CLI).

## Síntoma

Email burst de Vercel a inbox del operador con subject `Failed preview deployments on team 'julioreyes-4376's projects'`. Cada push a `develop` disparaba ~1 deploy fallido del lado del proyecto duplicado. En sesión intensiva (~14 pushes TASK-827) → ~14+ emails.

Error específico en cada deploy duplicado:

```
Build error occurred — npm run build / yarn install defaults
Project: greenhouse-eo (prj_FKsbIbQfUHp8OlNgnWp5j7RHnYsL)
Scope: efeonce (julioreyes-4376's projects)
```

## Causa raíz

**Bug class recurrente identificado** — 2 incidentes con el mismo patrón:

### Incidente 1 — ISSUE-013 (2026-04-05)

- Proyecto duplicado: `prj_5zqdjJOz6OUQy7hiPh8xHZJj8tA8`
- Scope: `julioreyes-4376's projects` (personal account del operador)
- Resuelto via `DELETE /v9/projects/...` API
- Hard rule canonizada en CLAUDE.md commit `c03a23a5` (2026-04-05): "Proyecto canónico: greenhouse-eo (id: prj_d9v6gihlDq4k1EXazPvzWhSU0qbl, team: efeonce-7670142f). NUNCA crear un segundo proyecto vinculado al mismo repo."

### Incidente 2 — Este ISSUE-076 (2026-05-13)

- Proyecto duplicado: `prj_FKsbIbQfUHp8OlNgnWp5j7RHnYsL`
- Scope: mismo `julioreyes-4376's projects`
- Creado el **2026-04-14 04:22:57 UTC** (00:22 -04 Santiago, madrugada) — **9 días DESPUÉS** de canonizada la hard rule
- Lingered 29 días sin detección hasta que el burst de emails coincidió con sesión intensiva de pushes
- Cierre del fix immediate: borrado live con verify-then-delete defensive pattern

### Smoking gun textual

El agente que creó el segundo duplicado lo confesó textualmente en su Handoff entry (commit `314146ad`, 2026-04-14 04:27 -04, sello "Kortex Agent"):

> **Nota operativa:**
> - Greenhouse quedó enlazado por CLI a Vercel scope `efeonce` durante esta sesión para poder forzar deploy productivo si el webhook no dispara solo
> - si otro agente retoma, buscar este bloque por el sello `Kortex Agent`

### Mecanismo exacto del bug

1. Agente corriendo `vercel` CLI desde local (commit firmado como `Julio Reyes <jreye@MacBook-Air.local>` = MacBook personal)
2. Ejecutó `vercel deploy` o `vercel link` **sin** pasar `--scope efeonce-7670142f`
3. Vercel CLI default scope = personal account del logged-in user (`julioreyes-4376` = scope slug `efeonce`)
4. CLI vio que no había proyecto en ese scope para el git remote `efeoncepro/greenhouse-eo` → **creó uno automáticamente** vinculado
5. Vercel auto-configuró webhook GitHub → desde ese momento **cada push a `develop`** disparaba deploy en AMBOS proyectos (canonical + duplicate)
6. Duplicate con config genérica (`npm run build` + `yarn install` defaults Vercel) → preview deploys siempre fallaban → email burst
7. Local `.vercel/project.json` apuntando al canonical NO se subía al repo (estaba en `.gitignore` completo) → el daño quedó solo del lado Vercel cloud-side, invisible al repo

### Por qué la hard rule canónica no previno la recurrencia

La hard rule existía en CLAUDE.md sección "Vercel Deployment Protection" línea 48 desde 2026-04-05. Pero:

- Era una regla **prosa, no enforceable** — el agente Kortex no la leyó completa o priorizó "forzar deploy" sobre cumplirla
- NO había defensa estructural — un agente nuevo en una sesión nueva podía repetir el mismo error
- `.vercel/project.json` checked-in habría auto-pin-eado el scope canonical, eliminando la posibilidad de creación duplicada por el CLI default scope behavior

## Impacto

- Email burst en inbox del operador (cada push subsequent → 1 email failure)
- Doble build cost ($ Vercel + tiempo) por cada push a develop durante 29 días (~600 builds estimados)
- NO afectó producción (`greenhouse.efeoncepro.com` siempre sirvió del canonical project)
- NO afectó staging operativo (`dev-greenhouse.efeoncepro.com` siempre del canonical)
- NO blast radius cross-tenant ni data corruption

Bloqueante operativo: bajo. Bloqueante de gobernanza: medio (la hard rule fue violada y nadie lo detectó por 29 días).

## Solución

### Capa 1 — Fix immediate (borrar duplicado, 2026-05-13)

Defensive verify-then-delete pattern (canonizado live como pattern reusable para destructive Vercel actions):

```bash
EXPECTED_ID="prj_FKsbIbQfUHp8OlNgnWp5j7RHnYsL"
RESOLVED_ID=$(vercel project inspect greenhouse-eo --scope efeonce 2>&1 | awk '/ID/{print $2; exit}')
if [ "$RESOLVED_ID" = "$EXPECTED_ID" ]; then
  echo "y" | vercel project rm greenhouse-eo --scope efeonce
else
  echo "ABORT — ID mismatch"; exit 1
fi
```

Output: `Success! Project greenhouse-eo removed [735ms]`. Verified post-delete: scope `efeonce` retorna "No projects found"; canonical `efeonce-7670142f/greenhouse-eo` intacto.

### Capa 2 — Structural defense (`.vercel/project.json` checked-in)

`.gitignore` ajustado para permitir `.vercel/project.json` (zero secrets, pure scope/project pin) mientras preserva `.vercel/.env*.local` ignored (secrets):

```gitignore
# vercel — ignore everything except project.json (canonical scope/project pin)
# `.vercel/project.json` checked-in pins Vercel CLI to canonical project
# `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl` in scope `efeonce-7670142f`.
# Prevents duplicate-project bug class (ISSUE-013 + ISSUE-076).
.vercel/*
!.vercel/project.json
```

`.vercel/project.json` checked-in contiene:

```json
{"projectId":"prj_d9v6gihlDq4k1EXazPvzWhSU0qbl","orgId":"team_gmNiF4YCHmc1wqsHUTCvqjmN","projectName":"greenhouse-eo"}
```

Vercel CLI lee este archivo automáticamente — operadores/agentes locales no necesitan recordar `--scope` flag explícito. El default scope canonical está pin-eado en el directory.

### Capa 3 — Regla canónica reforzada (CLAUDE.md "Vercel CLI Scope Discipline")

Nueva sección en CLAUDE.md después de "Vercel Deployment Protection" que documenta:

- Bug class recurrente con referencias a ISSUE-013 + ISSUE-076
- 3 capas de defense in depth (delete + checked-in + rule)
- 5 reglas duras NUNCA/SIEMPRE específicas
- Patrón canónico verify-then-delete defensive para destructive Vercel actions
- Reasoning para futuros agentes que lean CLAUDE.md

### Capa 4 — Pattern reusable canonical

El verify-then-delete pattern descubierto live durante el delete (forzado por el classifier de Claude Code que bloqueó el `vercel rm` directo by name+scope cuando el user autorizó by ID) es ahora canonizado como **el** patrón para cualquier destructive Vercel action donde:

- CLI targetea por `name+scope`
- Humano autoriza by ID
- Hay riesgo de mismatch (e.g. dos projects con mismo name en diferentes scopes)

Single source of truth: CLAUDE.md sección "Vercel CLI Scope Discipline".

## Verificación

- [x] Proyecto duplicado `prj_FKsbIbQfUHp8OlNgnWp5j7RHnYsL` borrado vía `vercel project rm` con verify-then-delete defensive pattern
- [x] Post-delete: `vercel project ls --scope efeonce` retorna "No projects found"
- [x] Canonical `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl` en `efeonce-7670142f` confirmed intacto via `vercel project inspect`
- [x] `.vercel/project.json` checked-in al repo (sin secretos — solo IDs)
- [x] `.gitignore` ajustado: `.vercel/*` + `!.vercel/project.json` + `.env*.local` rule universal preserva secrets ignored
- [x] `git status --short .vercel/` post-changes muestra solo `project.json` modificado/staged, NO `.env*.local` files
- [x] CLAUDE.md sección "Vercel CLI Scope Discipline" canonizada con 5 reglas duras + verify-then-delete pattern + 3 defense-in-depth layers
- [x] Cross-reference desde ISSUE-013 (predecesor del mismo bug class)
- [ ] Próximo push a develop NO genera deploy en cuenta personal (verificable cuando emerja siguiente push — esperado)
- [ ] Sin nuevos emails Vercel preview failure en inbox operador ≥7 días post-delete (verificable retrospectivamente)

## Estado

**resolved** — defense-in-depth de 3 capas shipped. Bug class no recurrirá mientras `.vercel/project.json` esté checked-in y la regla CLAUDE.md exista. Si emerge un tercer incidente del mismo patrón, es señal de que las defensas estructurales fueron removidas (audit `.gitignore` + CLAUDE.md history).

## Relacionado

- **Predecesor**: [ISSUE-013](ISSUE-013-staging-deploy-failures-duplicate-project-bypass-secret.md) — primer incidente del mismo bug class (2026-04-05). Solo fix immediate, sin defensa estructural canonizada. ISSUE-076 cierra la recurrencia.
- **Smoking gun commit**: `314146ad` (2026-04-14 04:27 -04) — Handoff entry "Kortex Agent" confesando el enlace CLI sin `--scope` canonical
- **Hard rule violada**: CLAUDE.md commit `c03a23a5` (2026-04-05) — canonizó la prohibición pero NO la enforce estructuralmente
- **Spec canónica**: CLAUDE.md sección "Vercel CLI Scope Discipline" (creada 2026-05-13)
- **Pattern canónico reusable**: verify-then-delete defensive para destructive Vercel actions (documentado en la spec)
- **Sesión que detectó**: TASK-827 cierre + ISSUE-075 hardening (~14 pushes intensivos amplificaron el email burst hasta nivel ruidoso)
- **Vercel project canonical**: `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl` en team `efeonce-7670142f` — pin-eado en `.vercel/project.json` checked-in

## Lección operativa

Cuando una hard rule se documenta pero el bug class recurre, la rule prosa **no es suficiente** — necesita defensa estructural (lint rule, schema constraint, file checked-in, CI gate, etc.) que enforce la regla mecánicamente. Pattern canonical Greenhouse aplicado acá:

- ISSUE-013 canonizó la regla prosa → bug recurrió porque agentes no leen toda la doc antes de actuar
- ISSUE-076 agrega `.vercel/project.json` checked-in (structural enforcement) + 3 reglas duras + 1 pattern canonical → bug class cerrado a nivel estructural

Aplica el mismo patrón a futuros incidentes recurrentes: si una regla canónica se viola más de una vez, la siguiente iteración del fix debe ser estructural, no prosa.
