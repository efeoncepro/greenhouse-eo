# TASK-899 — VOICE.md Agent Contract Adoption (3-layer workflow: registry / craft / brand voice)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseño aprobado por arch-architect overlay Greenhouse 2026-05-16; updated para alpha.3 mismo día`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (paquete `@efeonce/voice.md@0.1.0-alpha.3` publicado a npm 2026-05-16)
- Branch: `task/TASK-899-voice-md-agent-contract`
- Legacy ID: `TASK_VOICE_002_Greenhouse_Voice_Infrastructure`
- ADR requerido: `docs/architecture/GREENHOUSE_VOICE_CONTRACT_V1.md` (entregable de Slice 8, redactable en paralelo desde Slice 2)

## Summary

Adoptar **VOICE.md** —innovación canónica de Efeonce para reglas de voz, tono, estilo, personalidad **y UX writing**— como **contrato agent-facing** en Greenhouse. Funciona igual que `DESIGN.md` (Google) pero para texto: cualquier agente que implemente (Claude Code, Codex, Cursor, futuros) lee VOICE.md ANTES de escribir cualquier texto user-facing y valida con el linter del paquete `@efeonce/voice.md` antes de commitear. **Alpha.3 trae enforcement de ~85% del spec** (vs ~30% en alpha.1) incluyendo 8 UX writing rules built-in (NN/g + Polaris + Mailchimp), Spanish stemmer (atrapa flexión "potenciar/-án/-ada"), sanitización Markdown/placeholders, capability `exception` audience-aware, y 75 surfaces de ejemplo (incluye 26 `portal-*` que necesitábamos en Greenhouse).

El delivery primario es **el contrato 3-layer + las reglas operativas para agentes** (VOICE.md en raíz + secciones nuevas en AGENTS.md y CLAUDE.md + skills invocables + scripts CLI + helpers de test + CODEOWNERS guard). La telemetría runtime (`POST /api/voice/observe` + tabla BigQuery + outbox) y Nexa como primer consumer productivo son **delivery secundario** que verifica cumplimiento en runtime. Diseño 8-slice validado por arch-architect (overlay Greenhouse) con 4-pillar score Safety 9 / Robustness 9 / Resilience 9 / Scalability 10.

## Why This Task Exists

VOICE.md es invención de **Efeonce** para resolver un gap que la industria todavía no estandariza: cómo declarar voz/tono/estilo/personalidad de marca + UX writing rules de forma que tanto humanos como agentes LLM puedan **leerlo, respetarlo y validarlo mecánicamente**. Es la contraparte de voz a lo que Google formalizó con `DESIGN.md` para identidad visual.

Hoy en Greenhouse pasa lo siguiente:

- **Cuando un agente (Claude Code, Codex, Cursor) implementa una feature**, no tiene un contrato canónico que diga "esta marca habla así, no usa estas palabras, esta es su personalidad, así se escribe microcopy de calidad". El agente cae en defaults del LLM y produce copy off-brand u mal escrito sin que el sistema lo detecte hasta que un humano lo lee.
- La regla canónica de microcopy TASK-265 (`src/lib/copy/`, `greenhouse-nomenclature.ts`, skill `greenhouse-ux-writing`) cubre **qué** strings reutilizar y **cómo** se llaman las cosas (Pulse, Spaces, Ciclos…), pero **no** cubre el contrato de voz upstream ni las reglas universales de UX writing (filler words, system-as-actor, performative apologies, generic CTAs, error prefix anti-pattern, passive voice, microcopy density).
- Nexa genera narrativa LLM a clientes Globe sin contrato verificable; cada generación puede derivar en tono distinto.

VOICE.md cierra los tres gaps simultáneamente:

1. **Brand voice contract** — beliefs + personality + lexicon protegido/prohibido específicos de Efeonce.
2. **UX writing rules built-in** (alpha.3) — 8 rules sourced from NN/g + Polaris + Mailchimp, language-tagged es-419/en-US/pt-BR.
3. **Surface taxonomy** — 75 surfaces declaradas en el ejemplo del paquete incluyendo 26 `portal-*` para Greenhouse runtime.

Adoptar VOICE.md ataca los 3 problemas en orden de prioridad:

1. **PRIMARIO — Contrato agent-facing 3-layer.** AGENTS.md y CLAUDE.md instruyen a todo agente futuro a pasar por 3 layers cuando produce texto: (1) Registry (TASK-265 `src/lib/copy/`), (2) Craft (UX writing rules del paquete + skill `greenhouse-ux-writing` existente), (3) Brand voice (VOICE.md + `pnpm voice:lint-string`). **Esto es lo que cambia el comportamiento de Claude Code / Codex / Cursor desde el primer momento.**
2. **SECUNDARIO — Telemetría runtime.** Endpoint canónico `POST /api/voice/observe` + tabla BigQuery + outbox permite que Nexa hoy + Verk/Kortex/futuros agentes Efeonce mañana reporten violaciones detectadas en su propio output para audit y dashboards.
3. **TERCIARIO — Nexa wiring.** Nexa Phase 1 + 2 prefijan el bloque de voz a su system prompt y hacen self-observation post-generación. Primer consumer productivo que demuestra el contrato en runtime real con A/B 5 casos pre-merge.

## Goal

**Agent-facing 3-layer contract (PRIMARIO)**:

- `VOICE.md` vive en la raíz del repo como source of truth de la voz Efeonce **owned por Greenhouse** (no es mirror del paquete; el paquete provee schema + linter + UX writing rules + ejemplo con 75 surfaces, Greenhouse owns el contenido).
- `AGENTS.md` y `CLAUDE.md` tienen secciones nuevas que instruyen el workflow 3-layer canonical (registry → craft → brand voice), incluyendo **tabla "enforcement gradient" que declara honestamente qué reglas valida el linter (~85% en alpha.3) y qué requiere revisión humana (~15% — tones, components, gaps de craft puntuales)**.
- `CODEOWNERS` (o pre-commit hook) protege `VOICE.md` de edits por agentes sin review humana.
- `CONTRIBUTING.md` tiene checklist 3-líneas de PR review para PRs que tocan copy.
- Skill `voice-contract` invocable disponible en `.claude/skills/` y `.codex/skills/`.
- Cualquier agente o developer puede correr `pnpm voice:lint` y `pnpm voice:lint-string <surface> "<text>"`.
- Helper Vitest `expectCompliesWithVoice(text, surface)` reusable en tests, con sweep adicional sobre `src/lib/copy/*` (TASK-265) que reporta violations pre-existentes como warnings.

**Runtime infrastructure (SECUNDARIO)**:

- Cualquier surface de Greenhouse que invoque un LLM puede importar `voicePromptBlock` y prefijarlo al system prompt en una línea.
- Existe `greenhouse_audit.voice_violations` en BigQuery con schema versionado, partition por fecha y cluster por `space_id`/`source`/`surface`.
- Existe endpoint `POST /api/voice/observe` que valida payload con Zod, requiere capability granular `voice.observe.write` (least privilege), y persiste a BigQuery vía outbox pattern (NO inserción directa) con **idempotency key** anti-dupe en re-tries.

**Runtime consumer demostrativo (TERCIARIO)**:

- Nexa Phase 1 + Phase 2 consumen el bloque de voz vía Vertex AI, behind flag `NEXA_VOICE_PREFIX_ENABLED`.
- Nexa hace self-observation **violations-only** (NO log de todas las generaciones); counter separado para "total generations".
- A/B explícito con 5 casos productivos (3 cliente-facing + 2 técnicos internos) valida que el prefix NO degrada registro inapropiado.

**Restricciones**:

- Greenhouse no rompe ningún test existente.
- **NO** activa ESLint sobre código existente (queda como follow-up; primero acumular ≥30 días de telemetría productiva post-merge).
- **Package version pineada exacta** (`"@efeonce/voice.md": "0.1.0-alpha.3"`, sin caret) hasta que pase alpha.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — OLTP/OLAP split
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — patrón outbox Postgres → BigQuery
- `docs/architecture/GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md` — Nexa Phase 1 + 2 architecture (afecta solo a Slice 7)
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` — anatomía de prompts Nexa
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — patrón canónico Cloud Run workers
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md` — runtime operacional outbox publisher
- `docs/architecture/MULTITENANT_ARCHITECTURE.md` — boundary `space_id`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — capability registry triple-layer canonical
- `docs/architecture/GREENHOUSE_VOICE_CONTRACT_V1.md` — **ADR canónico de esta task** (placeholder en Slice 2; completado en Slice 8)
- `CLAUDE.md` § "Microcopy / UI copy — regla canónica (TASK-265)" — regla existente que VOICE.md complementa en el layer Registry del 3-layer workflow
- `AGENTS.md` (raíz del repo) — donde vive el contrato canónico para agentes que tocan el repo

Reglas obligatorias:

- **VOICE.md vive en raíz del repo OWNED por Greenhouse**, no en `docs/`. Artefacto first-class. NO es mirror del paquete — el paquete provee schema + tooling + UX writing rules + ejemplo; Greenhouse owns el contenido.
- **Workflow 3-layer canonical declarado en AGENTS.md/CLAUDE.md**: Registry (TASK-265) → Craft (`greenhouse-ux-writing` skill + UX rules del paquete) → Brand voice (VOICE.md + `pnpm voice:lint-string`). Ningún layer reemplaza otro.
- **Enforcement gradient declarado.** AGENTS.md/CLAUDE.md DEBEN incluir tabla literal que distingue rules validadas por linter vs rules que requieren revisión humana.
- **NUNCA editar VOICE.md desde un agente.** CODEOWNERS guard + regla dura explícita.
- **`space_id` en toda observación runtime.** Zod enforce 400 si falta.
- **Idempotency key en outbox insert.** Columna UNIQUE `idempotency_key = sha256(source + observed_at + surface + space_id + text_excerpt)`.
- **Capability granular least-privilege.** `voice.observe.write` es la única que autoriza POST /api/voice/observe. NO reusar `requireServiceAuth` solo.
- **Outbox para BigQuery, no inserción directa.** Mirror canónico TASK-773 publisher Cloud Scheduler.
- **ICO Engine no calcula nada de voz.** Vive en `greenhouse_audit`, NO en `greenhouse_marts`.
- **No tocar Nexa hasta tener `plan.md` aprobado.** P1 = checkpoint `human`.
- **A/B explícito con 5 casos productivos** antes de mergear Slice 7 (Nexa wiring). 3 cliente-facing + 2 técnicos internos.
- **El endpoint es non-blocking.** Si BigQuery indisponible, retorna 202 y persiste a outbox.
- **No usar Vertex AI para validar VOICE.md.** El linter es JavaScript determinista que corre en Node.
- **Sentry capture canonical.** `captureWithDomain(err, 'platform', { tags: { source: 'voice_*' } })`. Nunca `Sentry.captureException` directo.
- **Secret hygiene canonical.** `*_SECRET_REF` + `resolveSecret` para service tokens.
- **Self-observation Nexa STRICT violations-only.** Loggear todas las generaciones explota volumen sin valor.
- **Package version pineada exacta** (sin caret, sin tilde). Bumps alpha son breaking por diseño.
- **Retention canonical declarada al primer write.** 30d outbox post-publish, 365d BigQuery.

## Normative Docs

- `node_modules/@efeonce/voice.md/docs/spec.md` — qué cubre el linter (post `pnpm install`)
- `node_modules/@efeonce/voice.md/docs/rules.md` — reglas de validación
- `node_modules/@efeonce/voice.md/examples/VOICE.md` — VOICE.md canónico de Efeonce alpha.3 con 75 surfaces + `ux_writing` block + multi-language
- `node_modules/@efeonce/voice.md/README.md` — guía general del paquete

## Dependencies & Impact

### Depends on

- `@efeonce/voice.md@0.1.0-alpha.3` publicado en npm (DONE — publicado 2026-05-16 por `efeonceorg`)
- BigQuery dataset `greenhouse_audit` ya creado y operativo
- Patrón outbox Postgres → BigQuery operativo (publisher Cloud Scheduler TASK-773)
- `node-pg-migrate` canonical
- Kysely para queries tipadas
- Capability registry triple-layer canonical (per CLAUDE.md TASK-873)
- TASK-265 microcopy contract activo (complementario en layer Registry del 3-layer workflow)
- Skill `greenhouse-ux-writing` existente (consumido en layer Craft del 3-layer workflow)

### Blocks / Impacts

- **Cualquier task que produzca texto user-facing post-merge** — implícitamente obligada a respetar workflow 3-layer.
- **Verk integration (TASK-TBD)** — necesita endpoint productivo desde primer commit.
- **ESLint enforcement en Greenhouse (TASK-TBD)** — bloqueada por ≥30 días de telemetría productiva.
- **Dashboard Nexa sobre violaciones (TASK-TBD)** — depende de datos fluyendo a BigQuery.
- **Cleanup `src/lib/copy/*` violations pre-existentes (TASK-TBD)** — input del sweep de Slice 4.
- **Audit + extensión de skill `greenhouse-ux-writing` (TASK-TBD)** — para llenar gaps craft que el paquete no cubre (date/time es-CL formatting, inclusive language es-CL, a11y aria-label patterns, pluralización es-CL).
- **Nexa Phase 1 + Phase 2** — runtime productivo cambia comportamiento (prefijo system prompt).
- **TASK-265 microcopy contract** — no se modifica; es el layer Registry del 3-layer workflow.

### Files owned

**Foundation + agent contract (PRIMARIO):**

- `VOICE.md` (NEW — raíz del repo, source of truth owned por Greenhouse, partido del ejemplo alpha.3)
- `package.json` (MODIFY — agregar dependency PINEADA EXACTA `0.1.0-alpha.3` + scripts `voice:lint`, `voice:lint-string`, `voice:export-prompt`, hooks `prebuild`/`predev`)
- `.gitignore` (MODIFY — agregar `VOICE.prompt.md`)
- `AGENTS.md` (MODIFY — sección "Workflow 3-layer canonical para texto user-facing" + tabla enforcement gradient)
- `CLAUDE.md` (MODIFY — sección "Voice contract — VOICE.md (TASK-899)" + tabla enforcement gradient + complementariedad explícita con TASK-265)
- `CONTRIBUTING.md` (MODIFY o CREATE — checklist 3-líneas PR review para PRs que tocan copy)
- `CODEOWNERS` (MODIFY o CREATE — guard sobre `VOICE.md` requiriendo review humana)
- `scripts/build-voice-prompt.ts` (NEW)
- `scripts/voice-lint-string.ts` (NEW — wrapper user-friendly del CLI)
- `scripts/voice/replay-outbox.ts` (NEW — recovery script idempotente)
- `scripts/voice/sweep-copy-registry.ts` (NEW — sweep `src/lib/copy/*` contra VOICE.md)
- `.claude/skills/voice-contract/SKILL.md` (NEW)
- `.codex/skills/voice-contract/SKILL.md` (NEW)
- `src/test/voice-compliance.ts` (NEW — helper Vitest `expectCompliesWithVoice` + `getVoiceFindings`)
- `src/test/voice-compliance.test.ts` (NEW — self-tests)
- `src/test/voice-copy-registry-sweep.test.ts` (NEW — sweep test warning-mode contra src/lib/copy)

**Runtime infrastructure (SECUNDARIO):**

- `src/lib/voice/tokens.ts` (NEW — singleton voiceTokens + version guard alpha.3)
- `src/lib/voice/prompt-block.ts` (NEW — singleton voicePromptBlock)
- `src/lib/voice/observe-schema.ts` (NEW — Zod schema + idempotency_key computation)
- `src/lib/voice/persist-observation.ts` (NEW — outbox writer canonical + idempotency)
- `migrations/YYYYMMDDHHMMSS_voice-violations-outbox.sql` (NEW — `pnpm migrate:create`)
- `migrations/YYYYMMDDHHMMSS_voice-observe-capability.sql` (NEW — seed `voice.observe.write` en `capabilities_registry`)
- `src/config/entitlements-catalog.ts` (MODIFY — agregar entry triple-layer canonical TASK-873)
- `src/lib/entitlements/runtime.ts` (MODIFY — grant `voice.observe.write` a service principals)
- `src/types/db.d.ts` (MODIFY — regenerado post migración)
- `src/app/api/voice/observe/route.ts` (NEW)
- `bigquery/schemas/greenhouse_audit/voice_violations.sql` (NEW)
- `services/ops-worker/server.ts` (MODIFY — wire outbox al publisher genérico TASK-773)

**Runtime consumer demostrativo (TERCIARIO):**

- `src/lib/nexa/system-prompt.ts` (MODIFY — localizar en Discovery)
- `src/lib/nexa/observe-output.ts` (NEW — self-observation fire-and-forget violations-only)

**Reliability signals:**

- `src/lib/reliability/queries/voice-observation-rate.ts` (NEW — info-level observability)
- Wire-up en `src/lib/reliability/get-reliability-overview.ts` (MODIFY)

**Docs + ADR:**

- `docs/architecture/GREENHOUSE_VOICE_CONTRACT_V1.md` (NEW — ADR canónico)
- `docs/architecture/DECISIONS_INDEX.md` (MODIFY — entry para V1 spec)
- `docs/voice-integration.md` (NEW — guía completa)

## Current Repo State

### Already exists

- `AGENTS.md` y `CLAUDE.md` en raíz — convenciones canónicas para agentes.
- TASK-265 microcopy contract activo (`src/lib/copy/`, `greenhouse-nomenclature.ts`).
- Skill `greenhouse-ux-writing` existente (layer Craft del 3-layer workflow).
- Patrón outbox canonical (TASK-773): tablas `greenhouse_sync.outbox_events` + `greenhouse_core.*_outbox` + publisher Cloud Scheduler.
- Endpoints HTTP en `src/app/api/` con middleware de auth + Zod schemas.
- BigQuery `greenhouse_audit` con tablas previas.
- Vertex AI client para Gemini bajo `src/lib/` (verificar path en Discovery).
- `services/ops-worker/` Cloud Run con `wrapCronHandler` canónico (TASK-775).
- Capability registry triple-layer canonical (per CLAUDE.md TASK-873).
- Convención de skills locales `.claude/skills/<name>/SKILL.md` y `.codex/skills/<name>/SKILL.md`.

### Gap

- `VOICE.md` no existe en raíz del repo. Ningún agente tiene contrato canónico de voz ni de UX writing built-in.
- `AGENTS.md` y `CLAUDE.md` no mencionan VOICE.md ni el workflow 3-layer canonical.
- No hay tabla "enforcement gradient" que comunique qué valida el linter (alpha.3 ~85%) y qué requiere revisión humana.
- `CONTRIBUTING.md` no existe (o no tiene checklist PR review para copy).
- `CODEOWNERS` no protege VOICE.md.
- No hay skill `voice-contract` registrable.
- No hay pnpm scripts (`voice:lint`, `voice:lint-string`, `voice:export-prompt`) ni helper Vitest ni sweep.
- No hay endpoint para recibir observaciones runtime.
- No hay tabla BigQuery `voice_violations` ni outbox Postgres `voice_violations_outbox` con idempotency.
- No hay capability granular `voice.observe.write`.
- Nexa no respeta Brand Voice de forma sistemática hoy.
- No hay self-observation violations-only de output Nexa.
- No hay ADR canonical `GREENHOUSE_VOICE_CONTRACT_V1.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que tome esta task ejecuta Discovery y produce
     plan.md según TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

> **8 slices, ordering causal.** Validado por arch-architect overlay Greenhouse 2026-05-16 + actualizado para alpha.3 (Slice "extender surfaces" eliminado porque alpha.3 ya las trae upstream). Slices 1-4 son delivery primario + foundation (blast runtime cero, blast operacional declarado). Slices 5-7 requieren feature flags + human checkpoint. Slice 8 cierra con docs + ADR.

### Slice 1 — Foundation: instalar paquete alpha.3 pineado + VOICE.md base en raíz

- `pnpm add @efeonce/voice.md@0.1.0-alpha.3` (sin caret, sin tilde — alpha bumps son breaking)
- En `package.json` verificar entry literal `"@efeonce/voice.md": "0.1.0-alpha.3"`.
- Copiar `VOICE.md` a la raíz desde `node_modules/@efeonce/voice.md/examples/VOICE.md`. **Este ejemplo ya viene con 75 surfaces declaradas (incluye 26 `portal-*`) + bloque `ux_writing` con 8 rules + 5 principles + multi-language es-419/en-US/pt-BR**. No requiere extensión adicional para arrancar.
- Agregar `VOICE.prompt.md` al `.gitignore`.
- Crear `scripts/build-voice-prompt.ts`:

  ```typescript
  import { execSync } from 'node:child_process';
  import { writeFileSync } from 'node:fs';

  const output = execSync('npx @efeonce/voice.md export --format prompt VOICE.md', {
    encoding: 'utf8',
  });
  writeFileSync('VOICE.prompt.md', output);
  console.log('Generated VOICE.prompt.md');
  ```

- Crear `scripts/voice-lint-string.ts`:

  ```typescript
  import { lint, lintString } from '@efeonce/voice.md/linter';
  import { readFileSync } from 'node:fs';

  const [, , surface, ...textParts] = process.argv;
  if (!surface || textParts.length === 0) {
    console.error('Usage: pnpm voice:lint-string <surface-id> "<text>"');
    process.exit(2);
  }

  const text = textParts.join(' ');
  const voiceSource = readFileSync('VOICE.md', 'utf8');
  const { voiceSystem } = lint(voiceSource);
  const findings = lintString(voiceSystem, surface, text);

  if (findings.length === 0) {
    console.log(`OK — '${surface}' compliant with VOICE.md`);
    process.exit(0);
  }

  console.error(`Voice findings on surface '${surface}':`);
  for (const f of findings) {
    console.error(`  [${f.severity}] ${f.rule}: ${f.message}`);
  }
  process.exit(findings.some(f => f.severity === 'error') ? 1 : 0);
  ```

- Agregar scripts y hooks en `package.json`:

  ```json
  {
    "scripts": {
      "voice:lint": "voice-md lint VOICE.md",
      "voice:lint-string": "tsx scripts/voice-lint-string.ts",
      "voice:export-prompt": "tsx scripts/build-voice-prompt.ts",
      "prebuild": "pnpm voice:export-prompt && [resto del prebuild existente]",
      "predev": "pnpm voice:export-prompt"
    }
  }
  ```

- Verificar: `pnpm voice:lint` pasa. `pnpm voice:lint-string portal-button-primary "Crear cliente"` exit 0. `pnpm voice:lint-string portal-button-primary "Enviar"` exit 1 (generic-cta rule de alpha.3 lo atrapa).
- Commit: `chore(TASK-899): slice 1 — install @efeonce/voice.md@0.1.0-alpha.3 pinned + VOICE.md base + CLI scripts`

### Slice 2 — Contrato agent-facing 3-layer (AGENTS.md + CLAUDE.md + skills + CODEOWNERS + CONTRIBUTING)

> Es el delivery primario de la task. Cuando esté shippeado, cualquier agente (Claude Code, Codex, Cursor) que abra el repo verá el workflow 3-layer y lo respetará.

- Agregar a `AGENTS.md` (sección nueva):

  ```markdown
  ## Workflow 3-layer canonical para texto user-facing

  Antes de producir o modificar cualquier texto user-facing (labels, copy UI,
  emails, mensajes Teams, error messages, prompts LLM, narrativa generada,
  docs públicas, copy de marketing, microcopy de forms), el agente DEBE pasar
  por los 3 layers en este orden:

  ### Layer 1 — Registry: ¿ya existe?
  Buscar en `src/lib/copy/*` y `src/config/greenhouse-nomenclature.ts` si el
  texto ya está declarado. Si sí: reusar (no duplicar). Regla canónica TASK-265.

  ### Layer 2 — Craft: ¿cómo se escribe bien?
  Dos fuentes complementarias:
  - **UX writing rules del paquete `@efeonce/voice.md`** (alpha.3 trae 8
    rules built-in: filler-word, system-as-actor, performative-apology,
    generic-cta, generic-confirmation, error-prefix-redundant, passive-voice,
    microcopy-too-dense). Validación deterministic, language-tagged es-419/
    en-US/pt-BR. Se ejecutan automáticamente en `pnpm voice:lint-string`.
  - **Skill `greenhouse-ux-writing`** para reglas que el paquete no cubre
    aún (date/time es-CL formatting, inclusive language es-CL, a11y
    aria-label patterns, pluralización es-CL). Invocar antes de escribir.

  ### Layer 3 — Brand voice: ¿suena como Efeonce?
  Invocar skill `voice-contract` (`.codex/skills/voice-contract/SKILL.md`).
  Leer `VOICE.md` para personality + beliefs + lexicon. Validar el draft:

      pnpm voice:lint-string <surface-id> "<text>"

  Errores bloquean commit; warnings se discuten.

  ### Enforcement gradient (qué valida el linter, qué requiere vos)

  | Regla declarada en VOICE.md | Validada por linter alpha.3 | Responsabilidad humana |
  |---|---|---|
  | Forbidden phrases (lexicon.forbidden) | ✅ sí + Spanish stemmer (atrapa flexión) | revisar variantes no listadas |
  | Protected terms (variaciones never) | ✅ sí | revisar typos cercanos no listados |
  | max_length / min_length / unit | ✅ sí | — |
  | forbid_emoji | ✅ sí | — |
  | forbid_artificial_caps | ✅ sí | — |
  | too-many-exclamations | ✅ sí | — |
  | case: sentence-case | ✅ sí (detecta Title Case) | — |
  | requires_action_verb (CTA) | ✅ sí (lista 40+ verbs es-CL/en) | — |
  | blame_user: forbidden | ✅ sí (6 regex patterns) | — |
  | structure (alert-error, empty-state-portal) | ✅ sí (≥ N sentences) | revisar contenido semántico |
  | cta_count | ✅ sí | — |
  | hashtags: {min, max, mandatory} | ✅ sí | — |
  | forbidden[].exception por audience | ✅ sí (audience-aware) | — |
  | UX: filler-word | ✅ sí (multi-language) | — |
  | UX: system-as-actor | ✅ sí | — |
  | UX: performative-apology | ✅ sí | — |
  | UX: generic-cta | ✅ sí | — |
  | UX: generic-confirmation | ✅ sí | — |
  | UX: error-prefix-redundant | ✅ sí | — |
  | UX: passive-voice | ✅ sí (heurística — info-level) | revisar falsos positivos |
  | UX: microcopy-too-dense (>3 sentences) | ✅ sí | — |
  | Markdown / placeholders awareness | ✅ sí (`sanitize.js` strip antes de lintear) | — |
  | Multi-language (es-419, en-US, pt-BR, etc.) | ✅ sí | — |
  | Reserved motifs (con manzanitas 🍏🍏🍏) | ⚠️ parcial — substring case-sensitive | revisar surfaces institucionales |
  | tones[] (explain/condense/provoke/instruct/demonstrate) | ❌ no — Layer 3 LLM diferida | revisar manualmente |
  | components[] (pitch/report/thought-leadership) | ❌ no — declarativo | revisar manualmente |
  | Date/time es-CL formatting | ❌ no en el paquete | usar skill `greenhouse-ux-writing` |
  | Inclusive language es-CL | ❌ no en el paquete | usar skill `greenhouse-ux-writing` |
  | A11y aria-label patterns | ❌ no en el paquete | usar skill `greenhouse-ux-writing` |
  | Pluralización es-CL | ❌ no en el paquete | usar skill `greenhouse-ux-writing` |

  **Cobertura efectiva alpha.3: ~85% del spec validado deterministically.**
  El ~15% restante (tones, components, gaps craft) requiere humano + skill
  `greenhouse-ux-writing`.

  ### Anti-patterns
  - Saltar Layer 1 (registry) y duplicar copy ya existente.
  - Saltar Layer 2 (craft) y pasar directo a validar voz — produce copy que
    cumple brand voice pero está mal escrito gramaticalmente o a11y-roto.
  - Saltar Layer 3 (voice) y mergear sin lint — copy off-brand.
  - **NUNCA editar VOICE.md desde un agente.** Decisión humana de Efeonce.
    `CODEOWNERS` enforce.
  - **NUNCA asumir que pasar el linter = 100% compliance.** Ver enforcement
    gradient.

  Skill invocable: `voice-contract` (`.codex/skills/voice-contract/SKILL.md`).
  ```

- Agregar sección equivalente a `CLAUDE.md` cerca de TASK-265 microcopy. La misma tabla enforcement gradient + reglas duras:

  ```markdown
  ### Voice contract — VOICE.md (TASK-899, desde 2026-05-XX)

  `VOICE.md` (raíz del repo) es el contrato canónico de voz/tono/estilo/
  personalidad de Efeonce **+ UX writing rules built-in** (alpha.3 trae 8
  rules sourced from NN/g + Polaris + Mailchimp, language-tagged). Análogo
  a `DESIGN.md` para visual. Owned por Greenhouse. Forma el Layer 3 del
  workflow 3-layer canonical para texto user-facing — los Layers 1 (Registry,
  TASK-265 src/lib/copy) y 2 (Craft, skill `greenhouse-ux-writing` + UX
  rules del paquete) son complementarios.

  [tabla enforcement gradient idéntica a AGENTS.md]

  **⚠️ Reglas duras:**

  - **NUNCA** producir texto user-facing sin pasar por el workflow 3-layer
    (Registry → Craft → Brand voice). Skill canonical: `voice-contract`.
  - **NUNCA** mergear copy nuevo sin haber corrido `pnpm voice:lint-string
    <surface-id> "<text>"` y haber pasado (zero errors).
  - **NUNCA** editar `VOICE.md` desde un agente. CODEOWNERS guard.
  - **NUNCA** asumir que pasar el linter = 100% compliance. Ver enforcement
    gradient — el ~15% restante (tones, components, gaps craft) requiere
    humano + skill `greenhouse-ux-writing`.
  - **NUNCA** bumpear `@efeonce/voice.md` sin: (a) snapshot test re-corre
    verde; (b) shape de voiceTokens preserva campos críticos; (c) migration
    explícita si schema cambió. `package.json` PINEA versión exacta.
  - **NUNCA** reusar `requireServiceAuth` genérico para `/api/voice/observe`
    sin capability granular `voice.observe.write`.
  - **NUNCA** loggear todas las generaciones LLM al outbox. STRICT
    violations-only.
  - **SIEMPRE** que un nuevo product Efeonce adopte VOICE.md (Verk, Kortex,
    futuro), su VOICE.md vive OWNED en su repo extendiendo el ejemplo del
    paquete. NO mirror, NO acoplar release cycles.
  - **SIEMPRE** que se modifique src/lib/copy/* (TASK-265), test sweep
    `voice-copy-registry-sweep.test.ts` detecta drift y lo reporta como
    warning no-bloqueante (cleanup periódico TASK-TBD).

  Spec: `node_modules/@efeonce/voice.md/docs/{spec,rules}.md`. ADR:
  `docs/architecture/GREENHOUSE_VOICE_CONTRACT_V1.md`. Guía: `docs/voice-integration.md`.
  ```

- Crear skills invocables `.claude/skills/voice-contract/SKILL.md` y `.codex/skills/voice-contract/SKILL.md` con: decision tree (cuándo invocar), workflow 3-layer, anti-patterns, ejemplos buen vs mal copy por surface, referencia a `greenhouse-ux-writing` skill como Layer 2.

- Crear/extender `CONTRIBUTING.md`:

  ```markdown
  ## PR review checklist — copy y voz

  Para todo PR que introduce o modifica strings user-facing:

  - [ ] He verificado que el copy pasó por `pnpm voice:lint-string <surface> "<text>"` (evidencia en commit body o PR description).
  - [ ] He invocado la skill `greenhouse-ux-writing` para reglas craft que el linter no cubre (date/time, inclusive language, a11y, pluralización).
  - [ ] Si el PR introduce surfaces nuevas en VOICE.md o modifica VOICE.md: tiene aprobación humana explícita (NO fue editado por un agente sin review).

  Estos 3 puntos son load-bearing — sin ellos, el contrato VOICE.md es decorativo.
  ```

- Crear/extender `CODEOWNERS`:

  ```text
  # Voice contract canonical — humano debe aprobar cualquier edit
  /VOICE.md @<usuario-canonical-de-marca>
  /docs/architecture/GREENHOUSE_VOICE_CONTRACT_V1.md @<usuario-canonical-de-marca>
  ```

- Crear placeholder `docs/architecture/GREENHOUSE_VOICE_CONTRACT_V1.md` con TOC mínimo (completar en Slice 8).
- Commit: `feat(TASK-899): slice 2 — agent-facing 3-layer contract (AGENTS.md/CLAUDE.md + skills + CODEOWNERS + CONTRIBUTING + ADR placeholder)`

### Slice 3 — Singletons runtime (`voicePromptBlock`, `voiceTokens`) con version guard

- Crear `src/lib/voice/tokens.ts`:

  ```typescript
  import 'server-only';
  import { readFileSync } from 'node:fs';
  import path from 'node:path';
  import { lint } from '@efeonce/voice.md/linter';

  const PINNED_VERSION = '0.1.0-alpha.3';
  const VOICE_PATH = path.join(process.cwd(), 'VOICE.md');
  const result = lint(readFileSync(VOICE_PATH, 'utf8'));

  if (result.summary.errors > 0) {
    throw new Error(
      `VOICE.md has ${result.summary.errors} parse errors. Greenhouse cannot start.`,
    );
  }

  // Version guard — fail-fast si el shape cambió entre bumps
  const tokens = result.voiceSystem;
  for (const requiredField of ['audiences', 'surfaces', 'lexicon', 'ux_writing'] as const) {
    if (!tokens[requiredField]) {
      throw new Error(
        `VOICE.md missing required field "${requiredField}". Package version drift? Expected ${PINNED_VERSION}.`,
      );
    }
  }

  export const voiceTokens = tokens;
  ```

- Crear `src/lib/voice/prompt-block.ts`:

  ```typescript
  import 'server-only';
  import { readFileSync } from 'node:fs';
  import path from 'node:path';

  export const voicePromptBlock = readFileSync(
    path.join(process.cwd(), 'VOICE.prompt.md'),
    'utf8',
  );
  ```

- Commit: `feat(TASK-899): slice 3 — singletons voiceTokens + voicePromptBlock + version guard alpha.3`

### Slice 4 — Test helper Vitest + sweep contra src/lib/copy

- Crear `src/test/voice-compliance.ts`:

  ```typescript
  import 'server-only';
  import { lintString } from '@efeonce/voice.md/linter';
  import { voiceTokens } from '@/lib/voice/tokens';

  /**
   * Asserts that `text` complies with VOICE.md rules for `surface`.
   * Throws with helpful diagnostic if it does not.
   */
  export function expectCompliesWithVoice(
    text: string,
    surface: string,
    options?: { audienceId?: string },
  ): void {
    const findings = lintString(voiceTokens, surface, text, options);
    const errors = findings.filter(f => f.severity === 'error');
    if (errors.length > 0) {
      const messages = errors.map(e => `  [${e.rule}] ${e.message}`).join('\n');
      throw new Error(
        `Voice violations on surface '${surface}':\n${messages}\n\nText: ${text}`,
      );
    }
  }

  /**
   * Returns findings without throwing — useful when warnings/info acceptable.
   */
  export function getVoiceFindings(
    text: string,
    surface: string,
    options?: { audienceId?: string },
  ) {
    return lintString(voiceTokens, surface, text, options);
  }
  ```

- Crear `src/test/voice-compliance.test.ts` con self-tests (passes clean / throws on forbidden / returns findings / audience-aware exception works / snapshot pin shape voiceTokens).
- Crear `scripts/voice/sweep-copy-registry.ts` (sweep helper canonical): itera exports string-valued de `src/lib/copy/*` y valida contra VOICE.md inferiendo surface por contexto (mapping declarativo namespace → surface más cercana). Output: array de violations pre-existentes.
- Crear `src/test/voice-copy-registry-sweep.test.ts` que invoca el sweep y reporta violations como **warnings** (no fail) en CI inicial.
- Commit: `feat(TASK-899): slice 4 — Vitest helper expectCompliesWithVoice + sweep contra src/lib/copy`

### Slice 5 — Telemetría runtime: migración Postgres + BigQuery schema + capability + publisher wiring

- Migración 1 — `pnpm migrate:create voice-violations-outbox`:

  ```sql
  -- Up Migration

  CREATE TABLE IF NOT EXISTS greenhouse_core.voice_violations_outbox (
    id              bigserial PRIMARY KEY,
    idempotency_key text NOT NULL UNIQUE,
    observed_at     timestamptz NOT NULL,
    source          text NOT NULL CHECK (source IN ('verk-agent','nexa','kortex','manual','claude-code','codex')),
    surface         text NOT NULL,
    space_id        uuid NOT NULL,
    client_id       uuid,
    text_excerpt    text NOT NULL CHECK (length(text_excerpt) <= 500),
    errors          integer NOT NULL CHECK (errors >= 0),
    warnings        integer NOT NULL CHECK (warnings >= 0),
    rules_violated  text[] NOT NULL,
    voice_version   text NOT NULL,
    payload_json    jsonb NOT NULL,
    published_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS voice_violations_outbox_unpublished_idx
    ON greenhouse_core.voice_violations_outbox (published_at)
    WHERE published_at IS NULL;

  CREATE INDEX IF NOT EXISTS voice_violations_outbox_space_id_idx
    ON greenhouse_core.voice_violations_outbox (space_id);

  CREATE INDEX IF NOT EXISTS voice_violations_outbox_source_observed_idx
    ON greenhouse_core.voice_violations_outbox (source, observed_at DESC);

  -- Anti pre-up-marker check
  DO $$
  DECLARE table_exists boolean;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'greenhouse_core' AND table_name = 'voice_violations_outbox'
    ) INTO table_exists;
    IF NOT table_exists THEN
      RAISE EXCEPTION 'TASK-899: voice_violations_outbox was NOT created. Markers may be inverted.';
    END IF;
  END $$;

  ALTER TABLE greenhouse_core.voice_violations_outbox OWNER TO greenhouse_ops;
  GRANT SELECT, INSERT, UPDATE ON greenhouse_core.voice_violations_outbox TO greenhouse_runtime;
  GRANT USAGE, SELECT, UPDATE ON SEQUENCE greenhouse_core.voice_violations_outbox_id_seq TO greenhouse_runtime;

  -- Retention: 30d outbox post-publish (cron cleanup TASK-TBD); 365d BigQuery.

  -- Down Migration

  DROP TABLE IF EXISTS greenhouse_core.voice_violations_outbox;
  ```

- Migración 2 — `pnpm migrate:create voice-observe-capability`:

  ```sql
  -- Up Migration
  INSERT INTO greenhouse_core.capabilities_registry
    (capability_key, module, description, created_by)
  VALUES
    ('voice.observe.write', 'platform', 'Permite enviar observaciones de voz al endpoint POST /api/voice/observe', 'migration:TASK-899')
  ON CONFLICT (capability_key) DO UPDATE
    SET description = EXCLUDED.description,
        deprecated_at = NULL,
        updated_at = NOW();

  DO $$
  DECLARE cap_exists boolean;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM greenhouse_core.capabilities_registry
      WHERE capability_key = 'voice.observe.write' AND deprecated_at IS NULL
    ) INTO cap_exists;
    IF NOT cap_exists THEN
      RAISE EXCEPTION 'TASK-899: voice.observe.write capability NOT seeded';
    END IF;
  END $$;

  -- Down Migration
  UPDATE greenhouse_core.capabilities_registry
  SET deprecated_at = NOW()
  WHERE capability_key = 'voice.observe.write';
  ```

- Extender `src/config/entitlements-catalog.ts` con entry `voice.observe.write` (triple-layer canonical per TASK-873).
- Extender `src/lib/entitlements/runtime.ts` con grant a service principals canónicos.
- Crear schema BigQuery `bigquery/schemas/greenhouse_audit/voice_violations.sql` (mirror del INSERT, incluye `idempotency_key`, retention 365d, cluster por space_id/source/surface).
- Aplicar migraciones + regenerar tipos Kysely + crear tabla BigQuery.
- Wire al publisher genérico TASK-773 (extender `publishPendingOutboxEvents`).
- Crear reliability signal `voice.violations.observation_rate` (`src/lib/reliability/queries/voice-observation-rate.ts`): kind=info, no severity threshold. Wire-up en `getReliabilityOverview`.
- Commit: `feat(TASK-899): slice 5 — outbox table + capability + BigQuery schema + publisher wiring + observation rate signal`

### Slice 6 — Endpoint `POST /api/voice/observe` con capability granular + idempotency

- Crear `src/lib/voice/observe-schema.ts` (Zod + `computeIdempotencyKey`).
- Crear `src/lib/voice/persist-observation.ts` con idempotency (catch UNIQUE violation, return `{idempotent: true}`).
- Crear handler `src/app/api/voice/observe/route.ts`:
  - `requireServiceAuth` → 401 si falla.
  - `can(authResult.subject, 'voice.observe.write', 'write', 'tenant')` → 403 si falta capability.
  - `ObservePayloadSchema.parse` → 400 con Zod details.
  - `persistVoiceObservation` → 202 con `{ ok, idempotent }`.
  - Errores via `captureWithDomain(err, 'platform', ...)` + `redactErrorForResponse`.
- Tests Vitest: schema unit + idempotency key + integration (202, 400, 401, 403, 202 idempotent en re-envío).
- Commit: `feat(TASK-899): slice 6 — POST /api/voice/observe + capability + idempotency + tests`

### Slice 7 — Nexa wiring + A/B 5 casos (TERCIARIO, requires human checkpoint)

> **Checkpoint humano obligatorio antes de mergear este slice.** Toca Nexa productivo. A/B con 5 casos debe pasar review humana.

- Localizar archivo canónico del system prompt Nexa Phase 1 (Discovery output).
- Modificar para prefijar con bloque de voz behind flag `NEXA_VOICE_PREFIX_ENABLED`.
- Repetir wiring para Nexa Phase 2.
- Verificar token budget Gemini 2.5 Flash (~3KB prefix / ~750 tokens estimado; alpha.3 puede ser mayor por las 75 surfaces + UX writing block).
- Crear self-observation helper `src/lib/nexa/observe-output.ts` (STRICT violations-only, fire-and-forget). Pasa `opts.audienceId` al `lintString` para que exception context-aware funcione.
- Llamar `observeNexaOutput()` post-generación Nexa Phase 1 + 2 sin `await`.
- **A/B explícito mandatory** con 5 casos productivos en preview env:
  - **Grupo cliente-facing (3 casos)**: narrativa a stakeholder Globe (Sky Airline u otro), summary ejecutivo Q3, propuesta insight comercial. Esperado: voz Efeonce SE APLICA.
  - **Grupo técnico interno (2 casos)**: summary técnico pipeline interno, debug narrativo para developer. Esperado: voz Efeonce NO degrada registro técnico apropiado.
  - Si A/B regresiona grupo técnico: **scope del prefix solo a casos cliente-facing** y documentar en plan.md.
- Tests: snapshot prompt con flag ON/OFF + smoke productivo con review humano.
- Commit: `feat(TASK-899): slice 7 — Nexa prefix + self-observation violations-only + A/B 5 casos verificado`

### Slice 8 — Documentación + ADR canonical + recovery script

- Completar `docs/architecture/GREENHOUSE_VOICE_CONTRACT_V1.md` (ADR canónico) con 7 secciones:
  1. Contexto y problema (gap actual).
  2. Decisión: adoptar `@efeonce/voice.md@0.1.0-alpha.3` con VOICE.md local owned por Greenhouse + workflow 3-layer canonical.
  3. Alternativas rechazadas: (a) build custom (NIH); (b) docs/style guide markdown sin enforcement; (c) duplicar reglas en greenhouse-ux-writing skill (drift garantizado); (d) bumpear paquete para extender surfaces (innecesario — alpha.3 ya las trae).
  4. Composición con TASK-265 microcopy (layer Registry) + skill `greenhouse-ux-writing` (layer Craft) — boundary explícito.
  5. Hard rules invariantes.
  6. Roadmap: V1 = alpha.3 adoption, V1.1 = surfaces específicas Greenhouse si emergen, V2 = ESLint enforcement post-30d, V3 = multi-tenant VOICE.md (Globe clients en-US).
  7. Entry en `docs/architecture/DECISIONS_INDEX.md`.
- Crear `docs/voice-integration.md` (7 secciones: agent-facing 3-layer / developer workflow / runtime infra / consumers externos / Nexa wiring / versionado / troubleshooting + recovery).
- Crear `scripts/voice/replay-outbox.ts` (recovery script idempotente, args `--from-date YYYY-MM-DD [--source X] [--dry-run]`).
- Verificar skills `.claude/skills/voice-contract/SKILL.md` y `.codex/skills/voice-contract/SKILL.md` completas.
- Commit: `docs(TASK-899): slice 8 — ADR GREENHOUSE_VOICE_CONTRACT_V1 + integration guide + recovery script`

## Out of Scope

- **ESLint enforcement sobre código existente** — TASK-TBD. Bloqueada por ≥30 días de telemetría productiva.
- **Modificar `GH_LABELS` / `GH_MESSAGES` / emails / copy hardcodeado** — TASK-TBD post telemetría + sweep output.
- **Dashboard Nexa sobre `voice_violations`** — TASK-TBD.
- **Kortex / Verk integration** — TASK-TBD; esperan esta task cerrada.
- **Retroactivo: validar todo el copy productivo contra VOICE.md** — TASK-TBD post-cierre.
- **Cambio del modelo de Nexa o parámetros** — solo prefija el system prompt.
- **Multi-tenant VOICE.md** (VOICE.md por cliente Globe en-US) — V3 roadmap.
- **Modificación de `src/lib/copy/*` (TASK-265)** — no se toca; es el layer Registry del 3-layer.
- **Bumpear `@efeonce/voice.md` a alpha.4 o posterior** — fuera de scope hasta que pase alpha.
- **Cron de cleanup retention 30d outbox** — declarada política; implementación TASK-TBD.
- **Audit + extensión skill `greenhouse-ux-writing`** — TASK-TBD separada (cubrir date/time es-CL, inclusive language, a11y aria, pluralización es-CL).

## Detailed Spec

### Sobre el workflow 3-layer canonical

VOICE.md NO es el único contrato para texto user-facing. Forma el Layer 3 (brand voice) de un sistema 3-layer:

| Layer | Qué cubre | Dónde vive | Quién owns | Cuándo invocar |
|---|---|---|---|---|
| **1 — Registry** | QUÉ strings concretas reutilizar | `src/lib/copy/*` + `greenhouse-nomenclature.ts` | TASK-265 | Primero: ¿ya existe el texto? |
| **2 — Craft** | CÓMO se escribe bien microcopy (universal) | UX rules del paquete `@efeonce/voice.md` (8 built-in) + skill `greenhouse-ux-writing` (date/time, a11y, etc.) | Paquete + skill | Segundo: estructura/anatomía/forma |
| **3 — Brand voice** | CÓMO SUENA la marca Efeonce (específico) | `VOICE.md` + `pnpm voice:lint-string` | Efeonce humano via VOICE.md | Tercero: lint final pre-commit |

Los 3 son ortogonales y complementarios. Ningún layer reemplaza otro.

### Sobre la analogía con DESIGN.md

| Aspecto | DESIGN.md (visual) | VOICE.md (voz + UX writing) |
|---|---|---|
| Artefacto | Markdown en raíz | Markdown en raíz |
| Quién lo lee | Agentes que tocan UI | Agentes que producen texto |
| Cómo se valida | Lint de tokens visuales | Lint de strings contra reglas (~85% en alpha.3) |
| Telemetría | (no aplica al spec original) | Endpoint runtime para violaciones |
| Versionado | Git + bump explícito | Git + bump del paquete (pineado exacto) |
| Owner del contenido | Cada adopter | Cada adopter (paquete provee schema + ejemplo) |

### Greenhouse OWNS su VOICE.md (no es mirror)

El paquete `@efeonce/voice.md` provee: schema, linter, exporters, CLI, 8 UX writing rules built-in (alpha.3), y un EJEMPLO con 75 surfaces declaradas. Cada adopter copia el ejemplo a su raíz. Si necesita surfaces adicionales específicas, las agrega. Esto desacopla Greenhouse adoption del package release cadence.

### Outbox → BigQuery publisher

Publisher canónico TASK-773 (Cloud Scheduler + ops-worker). Extender `publishPendingOutboxEvents` con `voice_violations_outbox`. Volumen estimado ~20 rows/día no justifica handler dedicado.

### Auth del endpoint — capability granular

`requireServiceAuth` + `can(subject, 'voice.observe.write', 'write', 'tenant')`. Triple-layer canonical per TASK-873.

### Idempotency canonical

`idempotency_key = sha256(source + observed_at + surface + space_id + text_excerpt).slice(0, 32)`. UNIQUE en DB. Re-tries retornan 202 con `idempotent: true`.

### Orden del bloque en el prompt + A/B obligatorio

Bloque de voz va **antes** del prompt operativo de Nexa (precedencia más alta). A/B Slice 7 valida que no degrada registros técnicos. Si regresiona: scope a casos cliente-facing.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (foundation) → Slice 2 (agent contract 3-layer — PRIMARY DELIVERY) → Slice 3 (singletons) → Slice 4 (test helper + sweep) → Slice 5 (migration + capability + schema + publisher) → Slice 6 (endpoint) → Slice 7 (Nexa + A/B) → Slice 8 (docs + ADR + recovery).
- **Slice 3 MUST ship BEFORE Slice 4** — helper Vitest importa `voiceTokens` desde singleton.
- **Slice 5 MUST ship BEFORE Slice 6** — endpoint depende de tabla + capability + publisher.
- **Slice 6 MUST ship BEFORE Slice 7** — observer Nexa reusa `persistVoiceObservation`.
- **Slice 7 MUST ship con review humano explícito + A/B 5 casos verde antes del merge**.
- Slice 8 puede correr en paralelo con Slice 7 una vez que Slice 6 cerró.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Contrato agent-facing declarativo sin enforcement humano en PR review | governance / process | high | checklist PR review canonical en CONTRIBUTING.md + reviewer humano sistemático + skill `voice-contract` invocable | retroactive: drift detectado en sweep src/lib/copy contra VOICE.md (Slice 4 test) |
| Agente modifica VOICE.md sin aprobación humana | governance | medium | CODEOWNERS guard + regla dura "NUNCA editar VOICE.md desde un agente" | git log review en code review + CODEOWNERS rechaza merge sin approval |
| Falsa confianza por enforcement parcial (~85% en alpha.3) | quality / process | medium | tabla "enforcement gradient" en AGENTS.md/CLAUDE.md declara qué se valida y qué requiere humano + skill `greenhouse-ux-writing` para gaps craft | post-merge: revisión humana sample de copy nuevo |
| Nexa prefix degrada registro técnico interno | nexa runtime | medium | A/B 5 casos (3 cliente + 2 técnico) + scope opcional solo cliente-facing si A/B regresiona | logs Nexa + Sentry domain platform |
| voice_violations explota si observer log-ea todas las generaciones | data / cost | low (mitigado by design) | STRICT "violations only" enforced en `observeNexaOutput` + counter separado total generations | BQ table size growth monitor + signal `voice.violations.observation_rate` |
| Re-tries de agentes/Nexa generan dupes en outbox | data quality | medium | UNIQUE `idempotency_key` + return idempotent silently OK | test integration re-envío mismo payload |
| Bump del paquete a alpha.4+ introduce schema breaking | data / runtime | medium | versión PINEADA exacta + snapshot test pin shape voiceTokens + version guard tokens.ts fail-fast | snapshot test rompe build si shape cambia |
| Outbox publisher falla y voice_violations no propaga a BigQuery | sync / observability | low | reusar TASK-773 + state machine + signals heredados | `sync.outbox.unpublished_lag` |
| Schema drift entre outbox Postgres y BigQuery | data | low | un solo SQL + columnas mirror exacto + test integration | falla loud en publish |
| Endpoint sin rate limiting permite flood | platform / cost | low | capability check granular + middleware service auth | logs Vercel |
| Service token filtrado | secrets | low | `*_SECRET_REF` + `redactErrorForResponse` | `secrets.env_ref_format_drift` |
| Bloque de voz excede max_tokens Gemini 2.5 Flash | nexa runtime | low | verificar token count en Discovery + smoke pre-merge | error explícito Vertex AI |
| Self-observer Nexa bloquea response path | nexa runtime | low | fire-and-forget enforcement (no await) + try/catch interno + captureWithDomain | latencia P95 Nexa monitoreada |
| BigQuery cuota o IAM mal configurado | data | low | endpoint retorna 202 + outbox persiste local | `sync.outbox.dead_letter` |

### Feature flags / cutover

- **`NEXA_VOICE_PREFIX_ENABLED`** (env var, default `false`). Revert: env var a `false` + redeploy Vercel (~5 min).
- **`VOICE_OBSERVE_ENDPOINT_ENABLED`** (env var, default `true`). Permite desactivar sin redeploy si emerge abuso.
- **`NEXA_SELF_OBSERVE_ENABLED`** (env var, default `false`). Controla self-observation Nexa. Aislada del prefix flag.
- **Slices 1-4 NO requieren feature flag.** Blast runtime cero. Blast OPERACIONAL declarado: crea expectativa de PR review humana.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm remove @efeonce/voice.md` + `rm VOICE.md VOICE.prompt.md` + revert PR | 5 min | sí |
| Slice 2 | revert PR AGENTS.md/CLAUDE.md/skills/CODEOWNERS/CONTRIBUTING | 5 min | sí |
| Slice 3 | revert PR singletons (no consumer aún) | 5 min | sí |
| Slice 4 | revert PR helper Vitest + sweep | 5 min | sí |
| Slice 5 | `pnpm migrate:down` 2 migraciones + `bq rm voice_violations` + revert wiring | 15 min | sí (outbox vacía, sin data loss) |
| Slice 6 | `VOICE_OBSERVE_ENDPOINT_ENABLED=false` o revert PR | <5 min flag | sí |
| Slice 7 | `NEXA_VOICE_PREFIX_ENABLED=false` + `NEXA_SELF_OBSERVE_ENABLED=false` o revert | <5 min flag | sí |
| Slice 8 | revert PR docs + ADR (sin runtime impact) | 5 min | sí |

### Production verification sequence

1. Merge Slices 1-4 a `develop` → CI verde → `pnpm voice:lint` pasa, sweep reporta violations pre-existentes como warnings.
2. Deploy staging: zero runtime impact. Verify VOICE.md accesible, `pnpm voice:lint-string portal-drawer-title "Test"` exit 0.
3. `pnpm migrate:up` (2 migraciones) en staging + verify tabla + capability.
4. Crear tabla BigQuery staging con retention 365d.
5. Deploy Slices 5-6 a staging con `VOICE_OBSERVE_ENDPOINT_ENABLED=true`.
6. Smoke endpoint staging con service token autorizado: 202 + fila outbox. Re-enviar mismo payload → 202 idempotent. Token sin capability → 403.
7. Verify propagación a BigQuery ≤10 min.
8. Deploy Slice 7 a staging con `NEXA_VOICE_PREFIX_ENABLED=true` + **A/B 5 casos productivos** + review humano side-by-side.
9. Si A/B regresiona grupo técnico: scope prefix solo cliente-facing + documentar.
10. Deploy Slice 8 + `NEXA_SELF_OBSERVE_ENABLED=true` + inducir violación intencional + verify outbox + BQ.
11. Repetir pasos 3-10 en producción con cooldown 24h.
12. Monitor signals 7d post-prod.

### Out-of-band coordination required

- **Secret Manager**: generar y subir service token a GCP Secret Manager + `*_SECRET_REF` env var Vercel ANTES de Slice 6.
- **Capability grant**: confirmar service principal canónico tiene `voice.observe.write`.
- **CODEOWNERS**: definir usuario humano canonical para VOICE.md guard.
- **Comunicación equipo Nexa**: anunciar endpoint + auth + ejemplo payload. Coordinar window smoke Slice 7.
- **BigQuery quotas**: verificar headroom (esperado ~20 rows/día).
- **Comunicación a agentes humanos (vos + equipo)**: post-merge Slice 2, anunciar que workflow 3-layer está activo. Sin esa comunicación, agentes nuevos pueden ignorar la regla.

### 4-Pillar Score (post-alpha.3 update, validated by arch-architect overlay Greenhouse)

#### Safety — 9/10

- **What can go wrong**: agente modifica VOICE.md sin aprobación; agente bypasea linter; copy productivo viola gap del 15% no enforced (tones, components, craft puntual); service token endpoint filtrado; Nexa prefix degrada output cliente.
- **Gates**: capability granular `voice.observe.write` + Service auth + Zod + `*_SECRET_REF` + `redactErrorForResponse` + CODEOWNERS guard + checklist PR review humana + 3 feature flags revert <5min + A/B 5 casos pre-merge.
- **Blast radius if wrong**: copy off-brand visible a clientes Globe (reputacional) + degradación output Nexa (revertible <5min).
- **Verified by**: snapshot test prompt + smoke A/B 5 casos con review humano + reliability signals heredados + tests integration capability check + 88 tests upstream del paquete.
- **Residual risk**: contrato 3-layer es operacional, no técnico — depende de discipline humana en PR review. ESLint enforcement (TASK-TBD) cierra este gap post-telemetría.

#### Robustness — 9/10

- **Idempotency**: ✅ UNIQUE `idempotency_key`.
- **Atomicity**: single INSERT atómico.
- **Race protection**: UNIQUE constraint gana race.
- **Constraint coverage**: CHECK `source` enum + CHECK `errors/warnings >= 0` + CHECK `length(text_excerpt) <= 500` + UNIQUE idempotency_key + NOT NULL críticos.
- **Verified by**: test re-envío mismo payload (espera idempotent=true) + Zod schema unit + concurrent write tests.

#### Resilience — 9/10

- **Retry policy**: heredado TASK-773.
- **Dead letter**: heredado TASK-773.
- **Reliability signal**: `sync.outbox.unpublished_lag` + `sync.outbox.dead_letter` heredados + `voice.violations.observation_rate` nuevo (info-level).
- **Audit trail**: outbox row ES el audit. Append-only.
- **Recovery procedure**: `pnpm tsx scripts/voice/replay-outbox.ts --from-date <YYYY-MM-DD>` idempotente.
- **Degradation honesty**: endpoint retorna 202 (no 200).

#### Scalability — 10/10

- **Hot path Big-O**: O(1) INSERT con UNIQUE index check.
- **Index coverage**: 3 indexes complementarios.
- **Async paths**: outbox publisher genérico TASK-773.
- **Cost at 10x**: ~73K rows/año worst-case. Trivial. STRICT violations-only previene explosión.
- **Pagination**: N/A (endpoint write-only).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

**Agent-facing 3-layer contract (PRIMARIO):**

- [ ] `VOICE.md` vive en raíz copiado del ejemplo alpha.3 (75 surfaces + ux_writing block + multi-language).
- [ ] `pnpm voice:lint` pasa sin errores.
- [ ] `pnpm voice:lint-string <surface> "<text>"` funciona con exit codes correctos (0/1/2) para surfaces marketing Y portal-* Y nexa-* Y email-transactional-* Y teams-message.
- [ ] `pnpm prebuild` regenera `VOICE.prompt.md` sin errores.
- [ ] `AGENTS.md` tiene sección "Workflow 3-layer canonical" con tabla enforcement gradient detallada.
- [ ] `CLAUDE.md` tiene sección "Voice contract — VOICE.md" con reglas duras + tabla enforcement gradient + complementariedad explícita con TASK-265 (layer Registry) y skill `greenhouse-ux-writing` (layer Craft).
- [ ] `CONTRIBUTING.md` tiene checklist 3-líneas PR review.
- [ ] `CODEOWNERS` protege `VOICE.md`.
- [ ] Skills `.claude/skills/voice-contract/SKILL.md` y `.codex/skills/voice-contract/SKILL.md` existen con decision tree + workflow 3-layer + anti-patterns + ejemplos.
- [ ] Helper Vitest `expectCompliesWithVoice` y `getVoiceFindings` exportados desde `src/test/voice-compliance.ts` + self-tests verdes (incluye audience-aware exception test).
- [ ] Sweep test `src/test/voice-copy-registry-sweep.test.ts` reporta violations pre-existentes en `src/lib/copy/*` como warnings.
- [ ] Snapshot test pin-ea shape de `voiceTokens` (presencia de `audiences`, `surfaces`, `lexicon.forbidden`, `lexicon.protected_terms`, `ux_writing` con count > 0).
- [ ] `package.json` pinea versión exacta `"@efeonce/voice.md": "0.1.0-alpha.3"` (sin caret).

**Runtime infrastructure (SECUNDARIO):**

- [ ] Migración `voice-violations-outbox` aplicada en staging + tipos Kysely regenerados + CHECK constraints activos.
- [ ] Migración `voice-observe-capability` seedea `voice.observe.write` triple-layer.
- [ ] Tabla `greenhouse_audit.voice_violations` creada con partition + cluster + retention 365d.
- [ ] `POST /api/voice/observe` con payload válido + auth + capability → 202 + fila outbox con idempotency_key.
- [ ] Re-envío mismo payload → 202 `{idempotent: true}`.
- [ ] `POST` con payload inválido → 400 Zod details.
- [ ] `POST` sin auth → 401.
- [ ] `POST` con auth sin capability → 403.
- [ ] `POST` sin `space_id` → 400.
- [ ] Pipeline outbox → BigQuery ≤10 min.
- [ ] Reliability signal `voice.violations.observation_rate` operativo en `/admin/operations` (info-level).

**Runtime consumer demostrativo (TERCIARIO):**

- [ ] Snapshot test prompt incluye bloque `--- BRAND VOICE CONTRACT ---` cuando `NEXA_VOICE_PREFIX_ENABLED=true`, NO cuando `false`.
- [ ] **A/B 5 casos productivos verde**: 3 cliente-facing + 2 técnicos. Review humano documentado en plan.md.
- [ ] Si A/B regresiona técnico: scope prefix restringido a cliente-facing + documentado.
- [ ] Self-observation Nexa violations-only: generación con violación → fila outbox; generación clean → NO fila.

**Documentación + governance:**

- [ ] `docs/architecture/GREENHOUSE_VOICE_CONTRACT_V1.md` completo (7 secciones).
- [ ] `docs/voice-integration.md` completo (7 secciones).
- [ ] `scripts/voice/replay-outbox.ts` documentado.
- [ ] 3 feature flags operativas staging + prod.
- [ ] `Handoff.md` actualizado.
- [ ] Retention declarada: 30d outbox + 365d BigQuery.

## Verification

- `pnpm install`
- `pnpm voice:lint`
- `pnpm voice:lint-string portal-button-primary "Crear cliente"` (exit 0)
- `pnpm voice:lint-string portal-button-primary "Enviar"` (exit 1 — generic-cta rule de alpha.3)
- `pnpm voice:lint-string portal-snackbar-error "El sistema no pudo guardar"` (exit 1 — system-as-actor rule de alpha.3)
- `pnpm voice:lint-string portal-tooltip "Lo sentimos, no encontramos resultados"` (exit 1 — performative-apology rule de alpha.3)
- `pnpm voice:lint-string linkedin-post "potenciamos tu marca"` (exit 1 — Spanish stemmer atrapa "potenciar" flexionado)
- `pnpm pg:connect:migrate` (2 migraciones)
- `pnpm db:generate-types`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (incluye self-tests helper + endpoint integration + idempotency + capability check + sweep src/lib/copy + snapshot tokens)
- `pnpm build` (production Turbopack — gate canonical CLAUDE.md)
- Smoke endpoint manual (ver Production verification sequence § paso 6).
- **A/B Nexa 5 casos productivos en preview env con review humano (paso 8-9).**

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] archivo en carpeta correcta.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado: "VOICE.md activo como Layer 3 del workflow 3-layer canonical (Registry/Craft/Brand voice). Agentes (Claude Code, Codex, Cursor) DEBEN seguir el workflow. Tabla enforcement gradient declarada (~85% alpha.3). Endpoint `/api/voice/observe` productivo con capability granular. Nexa Phase 1+2 consumen `@efeonce/voice.md@0.1.0-alpha.3` (pineado) con A/B verde. Integradores externos pueden apuntar."
- [ ] `changelog.md` actualizado.
- [ ] `docs/architecture/GREENHOUSE_VOICE_CONTRACT_V1.md` + entry en `DECISIONS_INDEX.md`.
- [ ] Chequeo de impacto cruzado: TASK-265 microcopy (Layer 1 complementario), skill `greenhouse-ux-writing` (Layer 2 complementario), Verk integration (desbloqueada), ESLint enforcement (preparada).
- [ ] PR contra `develop` con review humano (NO merge directo).
- [ ] 3 casos reales validados pre vs post-cambio (parte del A/B Slice 7).
- [ ] Notificación canal ingeniería: contrato + URL + ejemplo payload + skill `voice-contract`.
- [ ] Comunicación equipo humano: anuncio explícito workflow 3-layer activo + checklist PR review.
- [ ] Tasks follow-up declaradas.

## Follow-ups

- TASK-TBD — Verk integration (desbloqueada).
- TASK-TBD — ESLint enforcement + cleanup `GH_LABELS` / `GH_MESSAGES` / emails (bloqueada por ≥30d telemetría).
- TASK-TBD — Dashboard Nexa sobre voice_violations.
- TASK-TBD — Retention cron 30d outbox cleanup (política declarada, implementación pendiente).
- TASK-TBD — Cleanup `src/lib/copy/*` violations pre-existentes (input: sweep output Slice 4).
- TASK-TBD — Audit + extensión skill `greenhouse-ux-writing` para gaps craft que el paquete no cubre (date/time es-CL formatting, inclusive language es-CL, a11y aria-label patterns, pluralización es-CL).
- TASK-TBD — Multi-tenant VOICE.md (V3 roadmap, Globe clients en-US).
- TASK-TBD — Kortex integration (espera Kortex platform ready).
- TASK-TBD — Actualizar skill canónica `greenhouse-ux-writing` para referenciar VOICE.md como Layer 3 del workflow 3-layer.

## Open Questions (deferidas a Discovery del agente que toma la task)

1. **¿`expectCompliesWithVoice` sweep sobre src/lib/copy es warning o error en CI?** Recomendación arch: warning inicial, promote a error post 30d cleanup.
2. **¿Capability granular es solo `voice.observe.write` o se diferencia por source (`voice.observe.from_nexa`)?** Recomendación arch: por action V1 + scope source via metadata.
3. **¿Multi-tenant VOICE.md por cliente Globe (Sky en-US, banco-X es-AR)?** Diferido a V3.
4. **¿Bloque de voz antes o después del prompt operativo Nexa?** Recomendación: antes (precedencia más alta), A/B Slice 7 valida.
5. **¿Scope del prefix solo a casos cliente-facing si A/B regresiona técnico?** Decisión post-A/B en plan.md.
6. **¿Hook pre-commit que corre `pnpm voice:lint-string` automáticamente sobre strings nuevas detectadas en el diff?** Si Discovery determina factible, agregarlo como Slice 4b.
