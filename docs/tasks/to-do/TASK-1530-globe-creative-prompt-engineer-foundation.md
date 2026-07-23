# TASK-1530 — Globe Creative Prompt Engineer Foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Foundation diseñada; runtime actual sólo aplica una reescritura genérica`
- Rank: `TBD`
- Domain: `creative|ai|platform`
- Blocked by: `none`
- Branch: `task/TASK-1530-globe-creative-prompt-engineer-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir el enhancer existente de Globe en un **Creative Prompt Engineer** gobernado: un agente especialista
capaz de comprender intención creativa, preservar restricciones, razonar sobre medio y operación, y compilar una
propuesta específica para la ruta/modelo generativo elegido. El LLM es un motor sustituible; la competencia vive
en contratos, perfiles versionados, herramientas, validadores, evals y políticas de promoción.

## Why This Task Exists

El command actual `globe.lab.prompt.enhance` termina en `VertexPromptEnhancer`, con `gemini-2.5-flash` y una
instrucción genérica. El browser envía sólo `{ input: { kind: 'text', prompt } }`; por tanto el enhancer no conoce
la ruta, modalidad, operación, referencias, formato, estilo ni restricciones efectivas del composer. Puede producir
texto más largo sin producir una instrucción creativa mejor para Seedream, Recraft, Veo, un modelo de audio o una
operación edit/refine.

“Mejorar” no debe significar adornar texto. Debe significar traducir una intención humana a una especificación
creativa deliberada, compatible con el target y auditable, sin inventar hechos, derechos, marcas o decisiones
irreversibles.

## Goal

- Formalizar el rol, competencias y límites del `CreativePromptEngineer`.
- Separar análisis de intención, estrategia creativa y compilación técnica por target.
- Seleccionar el LLM default mediante evals comparables, no mediante preferencia de proveedor.
- Entregar una propuesta estructurada que TASK-1531 pueda presentar sin reinterpretar lógica en UI.
- Mantener propose→accept/reject, spend fence, trusted context, aislamiento tenant y Full API Parity.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas:

- Globe es plataforma hermana: runtime/código en `../efeonce-globe`; gobierno documental en Greenhouse.
- El browser declara contexto creativo client-safe; route/profile/provider authority se resuelve server-side.
- El agente propone. Nunca reemplaza el original ni ejecuta media sin aceptación/acción humana separada.
- No se promete “garantizar mejores resultados”: se prueba utilidad probable, fidelidad y compatibilidad.
- No se captura chain-of-thought. Sólo intención resumida, decisiones observables, advertencias, evidencia y output.
- Si el nuevo contrato convierte profiles/evals en source of truth compartido, Discovery propone ADR antes de código.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `.codex/skills/software-architect-2026/SKILL.md`
- `.codex/skills/software-architect-2026/references/16-agentic-systems-assurance.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1493` — structured briefs, recipes, prompt history y enhancement existentes.
- `TASK-1500` — catálogo versionado y `referenceRoute`.
- `TASK-1501` — contrato discriminado por modalidad.
- `TASK-1519` — bridge humano BFF→API privada.

### Blocks / Impacts

- Bloquea `TASK-1531`, consumer UI rico del outcome estructurado.
- Afecta Image, Video y Audio sin cambiar los adapters de generación.
- `TASK-1493` figura `to-do` aunque su foundation existe en runtime; reconciliar lifecycle es follow-up documental.

### Files owned

- `../efeonce-globe/packages/contracts/src/structured-briefs.ts`
- `../efeonce-globe/packages/domain/src/structured-briefs.ts`
- `../efeonce-globe/packages/domain/src/producer-catalog.ts`
- `../efeonce-globe/apps/creative-runner/src/prompt-enhancer.ts`
- Tests/fixtures/evals focales y scripts explícitos de esos packages
- Arquitectura/handoff Creative Studio en Greenhouse si Discovery confirma delta normativo

## Current Repo State

### Already exists

- Commands `globe.lab.prompt.enhance`, `.enhancement.accept`, `.enhancement.reject` y reader `.prompt.history`.
- `PromptEnhancerPort`, spend fence de un crédito, idempotencia, proposal evidence y store durable.
- Catálogo con rutas, capabilities, modelos públicos, modalidades, constraints e input modes.
- Vertex keyless y `gemini-2.5-flash` como implementación actual.

### Gap

- No existe contrato explícito de `CreativePromptEngineer`.
- No existe pipeline separado `understand → strategize → compile → validate`.
- No hay profiles por target/operación ni policy de campos que se pueden inferir.
- No hay candidate router/fallback ni eval gate para escoger GPT, Claude, Gemini u otro.
- El outcome no distingue intención, restricciones preservadas, decisiones creativas, propuesta y advertencias.
- Faltan golden sets multimodales, ataques de prompt injection y señales de calidad/costo/latencia.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe packages/contracts + packages/domain + apps/creative-runner`
- Future candidate home: `remain-shared`
- Boundary: `CreativePromptEngineerPort behind globe.lab.prompt.*; UI/HTTP/SDK/CLI/worker/E2E consume the same governed capability`
- Server/browser split: `browser supplies redacted creative context; intent analysis, profile resolution, LLM routing, provider transport, policy and evidence remain server-only`
- Build impact: `strict NodeNext packages; no heavy framework; every new test registered in package scripts`
- Extraction blocker: `trusted actor/workspace, catalog pin, spend fence, proposal durability and model transport must remain coherent`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `PRODUCER_ROUTE_CATALOG + CreativePromptEngineerPort + globe.lab.prompt.*`
- Consumidores afectados: `UI|HTTP|SDK|CLI|worker|E2E`
- Runtime target: `local|internal Cloud Run API/worker|production`

### Contract surface

- Contrato existente a respetar: `packages/contracts/src/structured-briefs.ts` y API Contract Spine.
- Contrato nuevo o modificado: `CreativePromptBriefV1`, `CreativeTargetContextV1`,
  `CreativePromptProposalV2`, `CreativePromptEvidenceV2` y `CreativePromptEngineerPort`.
- Backward compatibility: `compatible`; caller legacy usa profile neutral explícito hasta retiro medido.
- Full API parity: toda semántica vive en contracts/domain/runner; consumers nunca replican perfiles/prompts.

### Data model and invariants

- Entidades/tablas/views afectadas: proposal/history existentes; migración sólo si evidence durable no admite V2.
- Invariantes:
  - El texto original es inmutable hasta `accept`.
  - Toda propuesta conserva restricciones explícitas o declara exactamente cuáles no pudo preservar.
  - El target se deriva de `referenceRoute + catalogVersion`, nunca de provider slug no confiable.
  - Campos inferidos se distinguen de campos aportados; facts, texto literal, identidad, rights y claims no se inventan.
  - La salida no expone system prompt, chain-of-thought, secretos, provider wire names ni operator-only evidence.
  - Un outcome es reproducible por policy/profile/catalog/model version, no necesariamente bit-identical.
- Tenant/space boundary: actor/workspace se derivan exclusivamente de trusted context.
- Idempotency/concurrency: una idempotency key + request fingerprint produce una propuesta/reserva; mismatch falla
  cerrado; retries y fallback no duplican spend.
- Audit/outbox/history: audit registra outcome/policy/profile/model/costo/latencia; history sólo incorpora propuesta
  aceptada y nunca prompt raw en señales.

### Migration, backfill and rollout

- Migration posture: `none` por defecto; cualquier columna V2 será aditiva, nullable y gated.
- Default state: profile `neutral-v1`; target profiles permanecen shadow hasta superar eval/canario.
- Backfill plan: none; no reescribir propuestas históricas.
- Rollback path: kill switch → neutral-v1 → revisión anterior; conservar evidence/history legibles.
- External coordination: deploy keyless; un provider nuevo exige config/secret/ADR/task independiente.

### Security and access

- Auth/access gate: sesión → BFF → IAM-private API → capability + trusted context.
- Sensitive data posture: el prompt puede contener contenido cliente; redacción, límites y no-retención en telemetry.
- Error contract: `validation_failed|policy_blocked|access_denied|dependency_unavailable|timeout|conflict` sanitizados.
- Abuse/rate-limit posture: spend fence, size limits, injection boundary, single-flight, timeout budget y circuit breaker.

### Runtime evidence

- Local checks: `pnpm check && pnpm build`; tests registrados explícitamente.
- DB/runtime checks: proposal/evidence/history e idempotency readback si existe migración.
- Integration checks: candidate bake-off y canario por Image/Video/Audio sin ejecutar media.
- Reliability signals/logs: latency p50/p95, outcome, fallback, preservation violations, accept/reject y costo; cero raw.
- Production verification sequence: enhance→reconcile→accept/reject→history/audit/spend; repetir target y fallo.

### Acceptance criteria additions

- [ ] Source of truth, contracts, consumers y versiones quedan explícitos.
- [ ] Tenant/access, idempotencia, retry/fallback y spend mantienen invariantes bajo concurrencia.
- [ ] Rollout/rollback y cualquier migración aditiva tienen evidencia.
- [ ] Errores, audit y señales no filtran prompt raw ni internals.

### Capability Definition of Done — Full API Parity

- [ ] La lógica vive en contracts/domain/runner, nunca en UI ni transport.
- [ ] Enhance/accept/reject/history conservan command/reader transport-neutral.
- [ ] Registry, grant, ocho surfaces y conformance son machine-readable.
- [ ] SDK/CLI/worker/E2E usan el mismo contrato; MCP conserva gate explícito.
- [ ] Propose→confirm→execute separa propuesta, aceptación y generación.

<!-- ZONE 2 — se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Creative Prompt Engineer contract

- Definir un brief estructurado con intención, deliverable, audiencia, subject, action, environment, composition,
  aesthetic, camera/light/material, timing/audio, literals, constraints, exclusions, references y unknowns.
- Definir outcome V2 con `proposal`, `intentSummary`, `preservedConstraints`, `creativeDecisions`,
  `assumptions`, `warnings`, `targetFit` y evidence client-safe.
- Clasificar cada campo como `user-supplied|derived-from-composer|inferred|unknown`; nunca disfrazar inferencia.

### Slice 2 — Target profile and tool registry

- Versionar profiles por modalidad, capability, operación y familia de modelo, no por copy disperso.
- Cada profile declara supported controls, ordering/verbosity guidance, negative-prompt semantics, literal-text
  policy, reference behavior, incompatibilities y validation rules.
- Exponer al agente herramientas determinísticas read-only para consultar catálogo/profile; no acceso libre a red.

### Slice 3 — Agent pipeline and model routing

- Implementar `understand → strategize → compile → validate` con structured outputs.
- Mantener `CreativePromptEngineerPort` vendor-neutral y adapters candidatos intercambiables.
- Definir timeout, retry owner, fallback compatible y circuit breaker; nunca encadenar LLMs sin presupuesto.
- Resistir prompt injection dentro del prompt/referencias: contenido del usuario es data, no policy.

### Slice 4 — Evaluation and promotion

- Golden sets separados para Image, Video y Audio, incluyendo edit/refine, texto literal, personajes/productos,
  restricciones negativas, prompts mínimos, contradictorios y multilingües.
- Rubric: intent fidelity, constraint preservation, target compatibility, creative specificity, non-invention,
  usefulness, latency y cost. Quality judge calibrado con revisión humana y checks determinísticos.
- Comparar candidatos por la misma suite; promote/rollback por profile con evidencia y threshold explícito.
- Registrar fallos de regresión y dataset version sin almacenar contenido cliente como eval fixture.

### Slice 5 — Runtime hardening and handoff

- Conformance, spend/idempotency, redaction, load/timeout/fallback y canario humano.
- Documentar model card operacional: intended use, límites, known failures, owner, revisión y rollback.
- Entregar el contrato V2 estable a TASK-1531; no implementar su UI.

## Out of Scope

- UI de revisión o cambios visibles al Producer (TASK-1531).
- Agente conversacional multi-turn o memoria personal.
- Auto-cambiar ruta/modelo, generar media o autoaceptar.
- Fine-tuning/LoRA del enhancer sin evidencia posterior.
- Exponer selector GPT/Claude/Gemini al usuario final.

## Detailed Spec

`CreativePromptEngineerPort` recibe trusted target context, un brief estructurado y un budget policy. El pipeline
primero normaliza la intención sin target-specific wording, después decide una estrategia creativa observable,
compila según el profile y finalmente valida invariantes. Los validators determinísticos bloquean pérdida de
literals/constraints, mismatch de route/catalog y outputs inválidos; un validator no pretende juzgar gusto.

El router elige una revisión promovida por modalidad/profile. Puede usar GPT, Claude, Gemini u otro adapter, pero
el contrato no conoce marcas. La promoción exige eval offline, canario humano, costo/latencia dentro de presupuesto
y rollback probado. Un modelo fuerte generalista sin profiles/evals no constituye el agente experto.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Evidencia |
|---|---|---|
| Cambia la intención | preservation validator + accept humano + adversarial evals | violation/reject rate |
| Inventa detalles o claims | field provenance + policy + blocked categories | non-invention score |
| Perfil queda stale | catalog pin + compatibility gate | load-time drift test |
| Inyección altera policy | delimitación/structured input + adversarial suite | injection pass rate |
| Fallback duplica costo | single spend envelope + retry owner | concurrency/readback |
| Judge favorece su familia | deterministic checks + blinded human calibration | inter-rater report |
| Prompt sensible se filtra | redaction tests + telemetry allowlist | log scan |

- Cutover: neutral shadow → Image canary → Video canary → Audio canary → promoted profiles.
- Rollback: profile/model revision anterior o neutral-v1 sin borrar proposals/history.
- Revisit trigger: cambio material de catálogo/modelo, fidelity regression, p95/cost breach o incident.

### External coordination

- Operador autoriza canario y presupuesto por proposal.
- No se agrega provider/secret fuera de su task/ADR gobernada.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Existe contrato explícito `CreativePromptEngineer` vendor-neutral y versionado.
- [ ] El outcome V2 separa intención, propuesta, decisiones, provenance, preservación y advertencias.
- [ ] Profiles cubren Image/Video/Audio y operaciones promovidas con compatibilidad de catálogo.
- [ ] Pipeline y validators preservan literals/constraints y bloquean injection/policy leakage.
- [ ] Al menos dos candidatos comparables pasan la misma suite antes de decidir default, o se documenta por qué
  sólo uno es operativo y el estado permanece no promovido.
- [ ] Evals incluyen checks determinísticos, judge calibrado y revisión humana ciega proporcional.
- [ ] Idempotency/spend/retry/fallback no duplican reserva ni outcome.
- [ ] Proposal/history/audit mantienen aislamiento y compatibilidad legacy.
- [ ] Telemetry no contiene prompt raw, chain-of-thought, secretos ni provider errors.
- [ ] TASK-1531 recibe un fixture estable de cada estado sin depender del LLM real.
- [ ] `pnpm check && pnpm build` pasan y todo test nuevo está registrado en scripts.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- contract/domain/runner conformance + adversarial/eval suite registrada
- concurrency/spend/readback y redaction scan
- canario humano Image/Video/Audio sin ejecutar media
- `pnpm task:lint --task TASK-1530`
- `pnpm ops:lint --changed`

## Closing Protocol

- [ ] Lifecycle, ruta, README y registry coinciden.
- [ ] Architecture/ADR se actualiza si cambia source of truth o agent boundary.
- [ ] `Handoff.md` y `GLOBE_RUNTIME_HANDOFF.md` registran revisión promovida y estado real.
- [ ] `changelog.md` cambia sólo cuando cambia comportamiento visible.
- [ ] Impact check sobre TASK-1493, TASK-1500, TASK-1501, TASK-1519 y TASK-1531.
- [ ] QA usa `greenhouse-qa-release-auditor`; cierre documental usa `greenhouse-documentation-governor`.

## Follow-ups

- `TASK-1531` — Creative Prompt Studio Experience.
- Memoria/preferencias creativas sólo con privacy model y evidencia de necesidad.

## Open Questions

- El modelo default se decide por benchmark; la arquitectura no presupone GPT, Claude o Gemini.
- Discovery confirma si evidence V2 cabe en storage actual o requiere migración aditiva.
