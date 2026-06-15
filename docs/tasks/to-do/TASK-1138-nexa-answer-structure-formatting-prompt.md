# TASK-1138 — Nexa Chat Answer Structure & Formatting (prompt V2)

## Delta 2026-06-15

- Las "snapshot tests" + "doc gate" que esta task menciona ahora son concretas (TASK-1126): hay un **golden snapshot del prompt ENTERO** (`src/lib/nexa/nexa-system-prompt.test.ts` + `__snapshots__/`) que esta task **debe regenerar** (`pnpm vitest run src/lib/nexa/nexa-system-prompt.test.ts -u`) al agregar el módulo de formato, y el **doc-gate** (`pnpm nexa:doc-gate --changed`) ahora **exige** bump de `version` + entrada de `changelog` cuando cambia `nexa-system-prompt.ts`. Tu bump `v2.0 → v2.1.0` + entrada de changelog lo satisface. Al bumpear: **congelá** la entrada histórica del changelog a su versión literal (ver `nexa-intelligence/system-prompt/versioning.md` §"Cómo cambiar el prompt"). — por trabajo en TASK-1126.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|platform|content|ai`
- Blocked by: `none`
- Branch: `task/TASK-1138-nexa-answer-structure-formatting-prompt`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Las respuestas del chat de Nexa salen como un bloque pesado de prosa corrida (sin párrafos, sin viñetas, sin negritas), aunque sean buenas en contenido. La causa NO es la UI: el chat flotante (`NexaThread`) ya renderiza Markdown vía assistant-ui (`MarkdownTextPrimitive` + `proseSx`, que estiliza `p`/`ul`/`ol`/`strong`/`h*`). La causa es que el **system prompt V2** (ya activo en local/staging) pide *conciso* pero **nunca pide estructura**. Esta task agrega al prompt V2 una **política explícita de estructura/formato de respuesta** (párrafos cortos, viñetas en enumeraciones, **negrita en el dato clave**, emojis semánticos moderados) como cambio de prompt versionado — cero cambio de UI, cero arquitectura.

## Why This Task Exists

TASK-1124 construyó el prompt modular V2 y subió la calidad de las respuestas de Knowledge (sintetizar en vez de pegar chunks) + higiene de Markdown crudo (`❌ NUNCA mostrar Markdown estructural crudo ## como texto` — bug del eco de headers de una fuente, **ya resuelto, no se toca**). El gap que queda para la **legibilidad general** del chat es uno solo:

**No hay regla positiva de estructura.** `placementPolicy` solo dice *"conciso, escaneable… el largo justo"* ([`nexa-system-prompt.ts`](../../../src/lib/nexa/nexa-system-prompt.ts) `buildNexaSystemPromptV2`, módulo `placementPolicy`). Nunca instruye "separa en párrafos cortos / usa viñetas para enumeraciones / resalta el dato clave en negrita". El `voiceContract` incluso empuja a lo minimalista (*"no decoras, no rellenas"*). Sin instrucción positiva, el LLM degrada al default: un párrafo corrido. El "patrón de respuesta aprobado" de la voz (*"La respuesta corta: X. El matiz importante es Y… el siguiente paso seguro es W"*) es conceptualmente escaneable pero **textualmente un solo párrafo** — no induce saltos ni viñetas.

Nota: la regla `##`-crudo de TASK-1124 NO bloquea esto — prohíbe *eco-pegar* Markdown de una fuente, no que el modelo use `**negrita**` o `- viñetas` en su propia respuesta. Este fix es **puramente aditivo**: agrega la instrucción positiva, sin reabrir ni editar esa regla.

Verificación de hechos (revisión profunda 2026-06-15, skill `greenhouse-nexa-conversational`):
- El chat flotante usa SIEMPRE Gemini (`/api/home/nexa` fuerza `requestedModel` → no alcanza el auto-router). El bloque pesado es output de V2 + Gemini.
- El render markdown del thread es capaz: si el modelo emite `**negrita**`, `- viñeta`, `\n\n`, lo pinta bien ([`NexaThread.tsx`](../../../src/views/greenhouse/home/components/NexaThread.tsx) `proseSx` + `NexaMarkdownText`). No hay nada que aplane (lo único que se limpia es `cleanNexaAnswer`: volcado "Fuentes:" + `[n]` colgante).
- La capa de expresión rica (`NexaExpressiveText` / `NexaAnswersCanvas`) NO está en el chat flotante — vive solo en `/knowledge`, flag-gated OFF. No es el lever para este fix.

## Goal

- El chat de Nexa devuelve respuestas **escaneables**: párrafos cortos, viñetas para enumeraciones/pasos, **negrita en el dato/concepto clave**, emojis semánticos moderados (✓ ⚠ ✦) — sin volverse sticker-bot ni romper el contrato de voz Efeonce (dato primero, próxima acción al cierre).
- La política de formato vive como **módulo del prompt V2** (no inline en `nexa-service.ts`), versionada con bump + changelog + snapshot tests + QA matrix + doc gate.
- Cambio **puramente aditivo**: NO reabre ni edita la regla `##`-crudo de TASK-1124 (ya resuelta).
- **Cero cambio de UI** (el render ya es capaz) y cero solape con TASK-1112 (arquitectura) ni TASK-1132 (visual cues).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/nexa-intelligence/README.md` (índice de capas — SSOT de la inteligencia)
- `docs/architecture/nexa-intelligence/system-prompt/current.md` + `versioning.md` (qué tiene V2 hoy + cómo se versiona)
- `docs/architecture/nexa-intelligence/voice/voice-tone-style-personality.md` (contrato de voz Efeonce)
- `docs/architecture/nexa-intelligence/governance/dos-and-donts.md` (reglas duras consolidadas)
- `docs/architecture/GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`
- `DESIGN.md` (la regla es que la UI no cambia; aquí solo se valida que el render existente luce enterprise)

Reglas obligatorias:

- **Invocar la skill `greenhouse-nexa-conversational` ANTES de tocar nada** (es overlay de dominio del chat).
- El system prompt es un **artefacto de producto versionado**: editar SOLO en `nexa-system-prompt.ts` como módulos; NUNCA prompt inline en `nexa-service.ts`; NUNCA modificar V1 (rollback byte-equivalente).
- Toda edición = **clase de cambio** + **bump** de versión + entrada en `NEXA_PROMPT_GOVERNANCE.changelog` + snapshot tests + QA matrix. Esta task es clase `policy` (cambia cómo responde) → bump MINOR `v2.0 → v2.1.0`.
- **Doc gate** `pnpm nexa:doc-gate`: actualizar `system-prompt/current.md` (+ `governance/dos-and-donts.md` por la aclaración `##`) en el MISMO cambio, o el gate falla.
- NO tocar el contrato de voz para hacerlo juguetón: emojis siguen raros/semánticos; nada de 🍏 ni emoji-personalidad; tuteo es-CL neutro.
- NO cambiar UI/render, ni el endpoint, ni el provider, ni el contrato de error.

## Normative Docs

- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md` (separación canónica: el prompt gobierna *qué dice*; la experiencia gobierna *cómo se muestra* — esta task es del lado "qué dice", produciendo Markdown que la experiencia existente ya renderiza).

## Dependencies & Impact

### Depends on

- `TASK-1124` (complete) — construyó el prompt modular V2 + governance + snapshot tests. Esta task extiende ese artefacto.

### Blocks / Impacts

- Complementa `TASK-1112` (unificación chat↔answers con streaming/evidence/AST): mejora la legibilidad HOY sobre el render markdown actual; cuando 1112 llegue, las respuestas bien estructuradas siguen siendo correctas (el AST de citas envuelve el mismo texto). No se bloquean mutuamente.
- Coordina con `TASK-1126` (prompt governance hardening: golden snapshot + gate de bump de versión/changelog). Si 1126 ya shippeó, esta task debe pasar ese gate; si no, agrega su entrada de changelog igual.
- No solapa `TASK-1132` (visual cues / Fluent treatments) — esa es la capa visual rica; esta es texto/Markdown.

### Files owned

- `src/lib/nexa/nexa-system-prompt.ts` (módulo de formato en V2 + bump versión + changelog `NEXA_PROMPT_GOVERNANCE`)
- `src/lib/nexa/nexa-system-prompt.test.ts` (snapshot anchors del módulo nuevo + version)
- `docs/architecture/nexa-intelligence/system-prompt/current.md` (documentar el módulo + versión)
- (si aplica) el script de QA de voz/calidad (`pnpm qa:nexa-knowledge`) con un assert de estructura

## Current Repo State

### Already exists

- Prompt modular V2 activo (`NEXA_SYSTEM_PROMPT_V2_ENABLED=true` en local/staging; OFF en prod → V1) con módulos `identity / platformReality / userContext / toolRouting / knowledgePolicy / operationalPolicy / responseModes / voiceContract / placementPolicy`.
- Governance versionado (`NEXA_PROMPT_GOVERNANCE`, clases de cambio + changelog) y snapshot tests (`nexa-system-prompt.test.ts`).
- Render markdown del chat ya capaz (`proseSx`: `p` con `mb`, `ul/ol` con `pl`+`li mb`, `strong` weight 700, `h1-3`) — `NexaThread.tsx`.
- Doc gate `pnpm nexa:doc-gate` + QA `pnpm qa:nexa-knowledge`.

### Gap

- V2 no tiene una política positiva de estructura/formato de respuesta → el modelo emite prosa corrida.
- La regla `##`-crudo está redactada de forma que desincentiva Markdown estructural en general.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Módulo de formato en V2 + bump de versión

- Agregar a `buildNexaSystemPromptV2` una política explícita de estructura de respuesta (módulo nuevo `answerFormatting`, o expandir `placementPolicy`) con, al menos:
  - separar en **párrafos cortos** (una idea por bloque), no un muro de texto;
  - **viñetas** para enumeraciones / pasos / listados (`-`), no comas encadenadas;
  - **negrita** (`**…**`) en el dato/concepto clave de cada bloque, para dirigir la mirada;
  - emojis semánticos moderados (✓ ⚠ ✦) ya permitidos por la voz — raros, nunca el único significado;
  - el largo justo para la pregunta (un dato rápido es breve; una explicación puede tener 2-4 bloques) — sin mutilar ni inflar.
  - **no usar headers (`#`/`##`)** en el panel flotante (pesan en un panel angosto): preferir negrita + viñetas + párrafos cortos. Esto es consistente con la regla `##`-crudo de TASK-1124 (que NO se toca).
- Mantener el contrato de voz intacto: dato primero, próxima acción al cierre cuando el usuario opera; tuteo es-CL neutro; nada juguetón.
- Bump `NEXA_SYSTEM_PROMPT_V2_VERSION` `v2.0 → v2.1.0` + entrada en `NEXA_PROMPT_GOVERNANCE.changelog` (clase `policy`).
- Snapshot tests: anclar el módulo nuevo + la nueva versión en `nexa-system-prompt.test.ts` (determinismo con `now` fijo).

### Slice 2 — Doc gate + QA

- Actualizar `system-prompt/current.md` (módulo + versión). NO editar `governance/dos-and-donts.md` — la regla `##` ya está vigente y no se toca.
- Agregar/ajustar un assert de estructura en la QA matrix (`pnpm qa:nexa-knowledge`) si el harness lo permite (ej. respuesta con enumeración → contiene viñetas; respuesta no es un único párrafo gigante). Si el harness no lo soporta hoy, declararlo como follow-up y dejar el assert de voz existente.
- `pnpm nexa:doc-gate --changed` verde.

### Slice 3 — Verificación visual (GVC)

- Capturar el chat flotante con 2-3 preguntas representativas (definición/identidad tipo "¿Qué es Efeonce?", un "cómo se hace X", y un dato corto) vía `pnpm fe:capture` con `NEXA_SYSTEM_PROMPT_V2_ENABLED=true` local → leer el frame → confirmar que la respuesta se ve escaneable (párrafos/viñetas/negrita) y enterprise, no un ladrillo. Ajustar el texto del módulo si hace falta y re-capturar.

## Out of Scope

- Streaming real, evidence packet, citation AST en el thread → **TASK-1112**.
- Registry de visual cues / Fluent treatments / `NexaExpressiveText` en el chat → **TASK-1132**.
- Llevar `NexaAnswersCanvas` (canvas rica) al chat flotante → decisión de producto mayor (norte conversacional, fuera de este fix).
- Cambios de UI/render, endpoint, provider, contrato de error (`TASK-1131`), telemetría de prompt (`TASK-1129`).
- Cambios al corpus de Knowledge.

## Detailed Spec

Pseudo del módulo (texto exacto a refinar en implementación + GVC; **mapear, no pegar literal**):

```
ESTRUCTURA Y FORMATO DE LA RESPUESTA:
- Estructura tu respuesta para que se escanee de un vistazo: párrafos cortos (una idea por bloque), no un muro de texto.
- Usa viñetas (-) para enumeraciones, pasos o listados; no encadenes todo en comas dentro de un párrafo.
- Resalta en **negrita** el dato o concepto clave de cada bloque para dirigir la mirada (sin abusar: lo importante, no todo).
- Emojis solo como marcador semántico ligero (✓ ⚠ ✦), raros, nunca el único significado.
- El largo justo: un dato rápido es breve; una explicación puede tener 2-4 bloques. Ni muro ni relleno.
- No uses headers (#, ##) — en este panel basta negrita + viñetas + párrafos cortos.
```

Nota de orden: este módulo debe quedar coherente con `voiceContract` (no contradecir "no decoras, no rellenas" — estructurar ≠ decorar) y con `placementPolicy` (compacto en panel flotante). La regla `##`-crudo de TASK-1124 (no eco-pegar Markdown de una fuente) sigue vigente sin cambios; este módulo no la repite ni la edita — solo evita headers en la respuesta propia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (módulo + bump + tests) → Slice 2 (doc gate + QA) → Slice 3 (GVC). El doc gate exige que el doc se mueva junto al código (Slice 2 no puede quedar atrás de Slice 1 al commitear).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El modelo sobre-estructura (viñetas/negritas excesivas, se ve sticker-bot) | UI/Nexa | medium | Texto del módulo prudente ("lo importante, no todo") + GVC en loop antes de cerrar | revisión GVC + QA voz |
| Regresión de voz (suena decorativo/juguetón) | Nexa | low | `voiceContract` intacto + QA `pnpm qa:nexa-knowledge` (asserta 🍏 + voseo) | QA matrix |
| Romper snapshot/governance gate (versión sin bump) | DX | low | Bump v2.1.0 + changelog + snapshot anchors en el mismo commit | `nexa-system-prompt.test.ts` + `pnpm nexa:doc-gate` |

### Feature flags / cutover

- Sin flag nuevo. El cambio vive dentro de V2, gobernado por el flag existente `NEXA_SYSTEM_PROMPT_V2_ENABLED` (ON local/staging; en prod sigue V1 hasta sign-off — comportamiento prod sin cambio). Revert = revertir el módulo + restaurar versión, o flag OFF (cae a V1). Tiempo de revert: <5 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit (prompt text only) o `NEXA_SYSTEM_PROMPT_V2_ENABLED=false` → V1 | <5 min | sí |
| Slice 2 | revert docs/QA | <5 min | sí |
| Slice 3 | N/A (solo evidencia) | — | — |

### Production verification sequence

1. Local con `NEXA_SYSTEM_PROMPT_V2_ENABLED=true`: GVC del chat flotante → respuestas escaneables.
2. `pnpm vitest run src/lib/nexa` + `pnpm qa:nexa-knowledge` + `pnpm nexa:doc-gate --changed` verdes.
3. Staging (V2 ON): smoke manual de 2-3 preguntas → confirmar legibilidad.
4. Prod sigue V1 hasta que el operador decida prender V2 (decisión separada); cuando se prenda, re-verificar legibilidad en prod.

### Out-of-band coordination required

- N/A — repo-only change. El flip de V2 en producción es una decisión del operador, separada de esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] V2 incluye un módulo explícito de estructura/formato de respuesta (párrafos cortos + viñetas + negrita en el dato clave + emojis semánticos moderados), coherente con el contrato de voz.
- [ ] El cambio es aditivo: la regla `##`-crudo de TASK-1124 queda intacta (no se edita `governance/dos-and-donts.md` por este motivo).
- [ ] `NEXA_SYSTEM_PROMPT_V2_VERSION` bumpeada a `v2.1.0` con entrada de changelog (clase `policy`) y snapshot tests actualizados.
- [ ] GVC del chat flotante muestra respuestas escaneables (no un bloque corrido), enterprise, sin lucir juguetón.
- [ ] La voz sigue intacta (tuteo es-CL, dato primero, próxima acción al cierre; sin 🍏 ni emoji-personalidad).
- [ ] Cero cambio de UI/render/endpoint/provider.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm vitest run src/lib/nexa` (incluye `nexa-system-prompt.test.ts`)
- `pnpm qa:nexa-knowledge`
- `pnpm nexa:doc-gate --changed`
- `pnpm fe:capture` del chat flotante (V2 ON) — frame mirado

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si hubo aprendizajes/deuda
- [ ] `changelog.md` actualizado (cambia comportamiento visible del chat)
- [ ] chequeo de impacto cruzado (TASK-1112 / TASK-1124 / TASK-1126 / TASK-1132)
- [ ] doc gate Nexa verde + capas `nexa-intelligence/` actualizadas + mirror Codex de la skill si aplica

## Follow-ups

- Si el harness de QA no soporta un assert de estructura, derivar un follow-up para agregarlo (ligado a TASK-1127 eval expansion).
- La legibilidad rica de verdad (la respuesta que *se arma*, énfasis semántico/citas inline en el thread) llega con TASK-1112 — esta task es el puente barato mientras tanto.

## Open Questions

- ¿El módulo de formato debe ser independiente (`answerFormatting`) o expandir `placementPolicy`? Decisión del agente que toma la task según legibilidad del prompt (recomendado: módulo propio, para anclarlo limpio en el snapshot test).
- ¿Headers (`##`) permitidos en el panel expandido (760px) aunque no en el compacto? V1 de esta task: no usar headers en ninguno (más simple + seguro con la higiene). Revisitar si la evidencia GVC lo pide.
