# TASK-1342 — Growth Forms WebMCP Agent Tools (browser-side capability exposure)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|platform`
- Blocked by: `none`
- Branch: `task/TASK-1342-growth-forms-webmcp-agent-tools`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Exponer cada `<greenhouse-form>` publicado como **tools WebMCP** (`navigator.modelContext`) para que agentes de IA que corren en el navegador puedan **leer** qué pide el formulario y **rellenarlo/enviarlo** por el mismo path público ya gobernado — sin tocar backend, DB, contrato de API ni re-autorar formularios. Es una capa aditiva, feature-detected y detrás de flag (`GROWTH_FORMS_WEBMCP_ENABLED` default OFF) dentro del bundle del renderer. WebMCP es un *consumer* más de contratos ya existentes (doctrina Full API Parity), no una capability nueva.

## Why This Task Exists

Hoy un agente que visita una superficie con un growth form embebido (WordPress/Elementor, `/aeo-2/`, `think.efeoncepro.com`, Astro) solo puede operar el formulario **actuando la UI a ciegas**: scrapear el DOM, adivinar campos, simular tipeo y clicks. Eso es frágil (se rompe con cualquier rediseño), lento y sin garantías de validación/consentimiento.

El sustrato para hacerlo bien **ya existe**: el custom element `<greenhouse-form>` descarga el render contract (que incluye el `field_schema_json` completo — tipos, labels, requeridos, opciones, validadores) y ya sabe enviar vía su `api-client` contra el submit público gobernado. Falta solo el eslabón que traduce ese schema a tools MCP y registra la capacidad al montar el elemento.

Además abre una ventaja estratégica de producto: si los propios growth forms de Efeonce exponen tools WebMCP, Greenhouse **puntúa en el techo de su propio rubric de "agentic-web readiness"** del AI Visibility Grader (dogfooding del lead magnet: *"¿te mencionan?" (AEO) vs "¿te pueden usar?" (agentic readiness)*).

## Goal

- Cada form publicado, al montarse en un navegador con WebMCP, registra tools MCP derivadas de su render contract, sin cambios server-side.
- Una tool **read-only** (`readOnlyHint:true`) que describe los campos del form, y una tool **write** que rellena el DOM real y envía por el mismo submit público gobernado (Turnstile + consent + surface auth + re-validación server + cifrado PII intactos).
- Todo feature-detected (`'modelContext' in navigator`) + flag-gated (`GROWTH_FORMS_WEBMCP_ENABLED` default OFF) → cero impacto cuando el navegador/flag no lo soporta.
- Verificación en Chrome EPP (DevTools → Application → WebMCP) + auditoría Lighthouse `registered-webmcp-tools`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` — SoT del dominio (render contract = leak boundary, 5 identificadores no conflacionables, `formGuid` server-only, delivery async at-most-once).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — WebMCP es "otro consumer de contratos gobernados", no algo WebMCP-específico.
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — runtime de acción gobernada `propose → confirm → execute` (el LLM nunca escribe directo).

Reglas obligatorias:

- **La tool es una fachada de invocación, NO el source of truth de la capability.** Cero lógica de dominio dentro de `execute`: solo mapear input → rellenar DOM → llamar al `api-client`/submit existente.
- **No cruzar el leak boundary.** La tool solo consume lo que el render contract ya expone al browser. NUNCA leer/exponer `formGuid`, `mapping_json`, `form_id` (`fdef-*`), destinos ni cualquier campo server-only.
- **El write respeta el path gobernado completo.** No se puede saltar Turnstile, consent gate, surface authorization ni la re-validación server-side. El `execute` de write termina en el mismo `POST /api/public/growth/forms/{ref}/submit`.
- **Experimental → detrás de flag default OFF.** WebMCP es pre-estándar (origin trial). Nada de dependencia productiva sin flag + verificación EPP.
- **Budgets de la spec WebMCP**: descripción de tool ≤500 chars, de param ≤150, nombre ≤30, output ≤1.5K.

## Normative Docs

- Skill `.claude/skills/webmcp` (WebMCP reference + guía de implementación + mapeo de seguridad + rubric agentic-readiness). Cargar antes de implementar.
- Skill `.claude/skills/greenhouse-growth-forms/SKILL.md` (+ `references/SUCCESS_CARD_AND_GRADER_ON_SUBMIT.md`). Cargar antes de tocar el renderer/contrato.

## Dependencies & Impact

### Depends on

- `src/growth-forms-renderer/element.ts` — custom element `<greenhouse-form>` (punto de registro/desregistro de tools; ciclo de vida `connectedCallback`/`disconnectedCallback`).
- `src/growth-forms-renderer/contract.ts` — mirror browser-side del `RenderContract` (fuente del schema de campos que se traduce a `inputSchema`).
- `src/growth-forms-renderer/api-client.ts` — cliente de submit ya existente (la tool de write lo reusa, no crea uno nuevo).
- `src/growth-forms-renderer/validation.ts`, `conditions.ts`, `mask.ts` — validación/condiciones cliente reusadas antes de enviar.
- Endpoints públicos existentes: `GET /api/public/growth/forms/[formSlug]` (contrato) y `POST /api/public/growth/forms/[formSlug]/submit` (write). Gateados por `GROWTH_FORMS_PUBLIC_API_ENABLED`.

### Blocks / Impacts

- No bloquea a nadie. Habilita (a futuro) que Nexa u otros agentes en navegador operen growth forms como consumer WebMCP.
- Alimenta la dimensión "agentic-web readiness" del AI Visibility Grader (dogfooding) — relación conceptual, sin dependencia de código.

### Files owned

- `src/growth-forms-renderer/webmcp/tools.ts` `[nuevo]` — mapeo `field_schema → inputSchema` + factory de las 2 tools por form.
- `src/growth-forms-renderer/webmcp/register.ts` `[nuevo]` — registro/desregistro feature-detected + flag-gated + `AbortController` atado al ciclo de vida.
- `src/growth-forms-renderer/element.ts` `[modificar]` — invocar register/unregister en connect/disconnect.
- `src/growth-forms-renderer/flags.ts` o equivalente `[verificar]` — declarar `GROWTH_FORMS_WEBMCP_ENABLED` (verificar dónde viven las flags del renderer durante Discovery).
- Tests bajo `src/growth-forms-renderer/**/__tests__/` para el mapper y el leak boundary.
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` `[modificar]` — sección de consumers (agregar WebMCP como consumer client-side).

## Current Repo State

### Already exists

- `<greenhouse-form>` custom element sirviendo el render contract en light DOM (`src/growth-forms-renderer/element.ts`).
- Render contract browser-safe con `field_schema` completo, compilado por `policy-compiler.ts` server-side y espejado en `contract.ts` (parity garantizada por tests).
- `api-client.ts` que envía al submit público gobernado; validación/condiciones/máscaras cliente.
- Path de submit gobernado end-to-end: Turnstile, consent gate, surface authorization (origin + slug allowlist), re-validación server-side, cifrado PII, persist `accepted` + outbox → delivery async.
- CORS/authorization data-driven vía `form_host_surface` (`listActivePublicFormOrigins`, TASK-1335).

### Gap

- El renderer no expone ninguna capacidad a `navigator.modelContext`. Un agente en navegador no tiene tools; solo puede actuar el DOM a ciegas.
- No existe traducción `field_schema_json` → JSON Schema `inputSchema`.
- No existe flag para gobernar la exposición WebMCP experimental.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: **ninguno nuevo** — se consume el render contract y el submit públicos ya existentes. No hay tabla/reader/command nuevo.
- Consumidores afectados: nuevo consumer **WebMCP (agente en navegador)** de contratos existentes; UI humana sin cambios.
- Runtime target: `local` + `staging` + `production` (client bundle `public/growth-forms/renderer-latest.js`), verificado en Chrome EPP.

### Contract surface

- Contrato existente a respetar: `GET/POST /api/public/growth/forms/[formSlug]` (+ `contract.ts` mirror del `RenderContract`, `publicSubmitInputSchema`). Sin cambios.
- Contrato nuevo o modificado: **tools WebMCP** derivadas por form (superficie client-side, no server): `read` (`readOnlyHint:true`, describe campos) + `write` (rellena DOM + submit gobernado). Nombres estables por form (opacos, sin filtrar `form_id`).
- Backward compatibility: `compatible` (aditivo, feature-detected, flag OFF por default; navegadores sin WebMCP no ven cambio).
- Full API parity: WebMCP es un consumer más del MISMO primitive (render contract + submit command). Cero lógica de dominio duplicada en la tool; el write va por el command server-side existente (no click-handler nuevo).

### Data model and invariants

- Entidades/tablas/views afectadas: **ninguna** (no hay persistencia nueva).
- Invariantes que no se pueden romper:
  - La tool NUNCA expone datos server-only (`formGuid`, `mapping_json`, `form_id` `fdef-*`, destinos). Solo lo que el render contract ya publica al browser (leak boundary).
  - El write NUNCA muta estado desde `execute`: termina en el `POST /submit` gobernado (Turnstile + consent + surface auth + re-validación server + PII encrypt intactos).
  - `consent` se expone como boolean requerido y NUNCA se auto-acepta. Candidato a `requestUserInteraction()` cuando aterrice en el spec; entretanto, el patrón preferido es propose→fill→human-confirm (el humano hace el submit) o submit con captcha humano en el loop.
- Tenant/space boundary: derivado como hoy por `formKey` + `surfaceId` en el request público; la tool no introduce identidad nueva.
- Idempotency/concurrency: reusa `idempotencyKey` del submit existente (la tool puede setearlo). At-most-once de delivery ya vive server-side.
- Audit/outbox/history: sin cambios — el submit emite `growth.forms.submission_accepted` como hoy.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `flag OFF` (`GROWTH_FORMS_WEBMCP_ENABLED` default false) + feature-detected.
- Backfill plan: N/A (no data).
- Rollback path: `flag off` (o revert del PR del bundle). Cero cleanup de datos.
- External coordination: N/A server-side. La verificación requiere Chrome EPP/origin-trial local (herramienta de dev, no infra prod).

### Security and access

- Auth/access gate: hereda la sesión/cookies del usuario en el navegador (modelo WebMCP). El write pasa por el mismo gate público (surface authorization + Turnstile + consent). `exposedTo` de cada tool = **misma allowlist de orígenes** que gobierna el CORS (`form_host_surface` / `listActivePublicFormOrigins`), no una lista hardcodeada.
- Sensitive data posture: PII (`national_id`) sigue cifrándose server-side en el submit; la tool no persiste ni loggea valores. `untrustedContentHint:true` en cualquier tool que devuelva contenido de campos.
- Error contract: la tool devuelve el outcome del submit (`accepted|invalid|consent_required|...`) mapeado a texto corto; sin stack traces ni IDs internos. Nada de raw errors al agente.
- Abuse/rate-limit posture: reusa el rate-limit + honeypot + captcha del submit. El captcha Turnstile es un human-in-the-loop natural (un agente no lo resuelve solo).

### Runtime evidence

- Local checks: unit tests del mapper `field_schema → inputSchema` (todos los `FIELD_TYPES`, `options`, `required`, `visibleWhen`/`requiredWhen`, budgets de chars) + **test de leak boundary** (ningún campo server-only aparece en las tools) + parity test contra `contract.ts`.
- DB/runtime checks: N/A (sin DB).
- Integration checks: registrar el bundle en Chrome EPP; DevTools → Application → WebMCP muestra las 2 tools con description + inputSchema sanos; probar manualmente (Run tool) el read y el write contra un form de staging → submit `accepted`.
- Reliability signals/logs: sin signal nuevo server-side (el submit ya observa). Telemetría cliente opcional via `telemetry.ts` para invocaciones de tool (respetando privacidad).
- Production verification sequence: ver Zone 3.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales (arriba).
- [ ] Invariantes (leak boundary, no-mutate-en-execute, consent no auto), tenant boundary e idempotencia explícitos.
- [ ] Rollout posture explícito (flag OFF, feature-detected, revert = flag/PR).
- [ ] Evidencia runtime listada (unit + leak test + EPP smoke).
- [ ] Sin leaks de datos sensibles; errores sanitizados; captcha/rate-limit reusados.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability nueva.` Esta task NO introduce ni modifica una capability de negocio: expone un **consumer client-side (WebMCP)** de capabilities/contratos ya gobernados (render contract + submit command). La lógica sigue en el primitive server-side; la tool es fachada. No hay registry/grant nuevo. El write ya es apto para `propose → confirm → execute` por construcción (usa el submit gobernado + captcha humano). Si durante Discovery emerge que se necesita un command server-side nuevo, escalar a task `backend-data` separada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Mapper `field_schema → inputSchema` + leak test

- `src/growth-forms-renderer/webmcp/tools.ts`: función pura que toma el `RenderContract` (browser-safe) y produce el `inputSchema` JSON Schema.
- Mapeo por tipo: `text|email|tel|url|textarea|national_id → {type:'string', maxLength}`; `number → {type:'number'}`; `checkbox|consent → {type:'boolean'}`; `select|radio → {type:'string', enum: options[].value}`; `multiselect → {type:'array', items:{enum}}`; `date → {type:'string', format:'date'}`; `hidden → omitir del schema agente-facing`.
- `description` desde `label`/`placeholder` (recortada a ≤150 chars); `required[]` desde flags; `visibleWhen`/`requiredWhen` descritos como condicionales (la validación real sigue server-side).
- Unit tests cubriendo todos los `FIELD_TYPES`, budgets de chars, y **leak test**: ningún campo/valor server-only (`formGuid`, `form_id`, `mapping`, destinos) aparece en la salida.

### Slice 2 — Factory de las 2 tools por form

- En `tools.ts`: `buildFormTools(contract, { fillDom, submit })` devuelve `[readTool, writeTool]` (shape `ModelContextTool`).
- `readTool` (`readOnlyHint:true`, `untrustedContentHint:true`): describe campos requeridos/opcionales + opciones; output ≤1.5K chars.
- `writeTool` (`readOnlyHint:false`): valida input contra el schema → rellena inputs del DOM (usando helpers del renderer, el humano ve el fill) → corre validación/condiciones/máscaras cliente → llama al `api-client`/submit existente → devuelve outcome mapeado a texto corto. `consent` requerido explícito, nunca auto.
- Nombres de tool opacos y estables por `formKey`/slug (≤30 chars), sin filtrar `form_id`.

### Slice 3 — Registro feature-detected + flag-gated en el ciclo de vida

- `src/growth-forms-renderer/webmcp/register.ts`: `registerFormTools(element, contract)` que, si `GROWTH_FORMS_WEBMCP_ENABLED` y `'modelContext' in navigator`, llama `navigator.modelContext.registerTool(tool, { signal, exposedTo })` para cada tool.
- `signal` de un `AbortController` atado al elemento; `exposedTo` = allowlist de orígenes gobernada (misma fuente que CORS; resolver desde el contrato/host surface — `[verificar]` cómo llega el origin allowlist al browser).
- `element.ts`: invocar register en `connectedCallback` (post-carga del contrato) y abortar en `disconnectedCallback`. Manejar `provideContext` vs `registerTool` según drift de API (canónico `navigator.modelContext`; anotar equivalente `document.modelContext` del spec).
- Declarar la flag y su default OFF; documentar en el ledger de flags si aplica al bundle.

### Slice 4 — Verificación EPP + docs

- Registrar el bundle en Chrome EPP; validar en DevTools → Application → WebMCP (Available/Invoked Tools) + Lighthouse `registered-webmcp-tools`.
- Documentar el consumer WebMCP en `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` (+ manual de uso corto si aplica).

## Out of Scope

- **Cualquier cambio server-side**: nuevas rutas, columnas, migraciones, readers, commands, capabilities, grants. Si emerge la necesidad, es otra task `backend-data`.
- Re-autoría de formularios o cambios en el `field_schema` de forms existentes.
- La **API declarativa** de WebMCP (anotar HTML forms). Este task usa la API imperativa vía el custom element; la declarativa queda como follow-up opcional.
- Construir la dimensión "agentic-web readiness" del grader o probes Lighthouse en el run engine (es otro dominio; acá solo se *habilita* que el propio portal puntúe).
- Integración Nexa-específica: Nexa (u otro agente) opera las tools por construcción como consumer; no se construye nada Nexa-only.
- Cambiar el default de `GROWTH_FORMS_WEBMCP_ENABLED` a ON en producción (queda como decisión de rollout separada tras verificación EPP).

## Detailed Spec

Forma ilustrativa del write tool (no vinculante, ajustar a la API vigente de Chrome en Discovery):

```js
{
  name: 'submit_lead_form',            // ≤30 chars, opaco por form
  title: 'Enviar formulario',
  description: 'Rellena y envía este formulario. Requiere consentimiento explícito.', // ≤500
  inputSchema: { type: 'object', properties: /* derivado de field_schema */, required: [...] },
  annotations: { readOnlyHint: false, untrustedContentHint: true },
  async execute(input) {
    fillDom(input)                     // el humano ve poblarse los campos
    const errors = validateClient(input)
    if (errors) return { content: [{ type:'text', text: 'Revisa: ' + errors }] }
    const outcome = await apiClient.submit(input)  // MISMO submit gobernado
    return { content: [{ type:'text', text: mapOutcome(outcome) }] }  // ≤1.5K
  }
}
```

Referencias de mapeo, seguridad (budgets, `exposedTo`, `untrustedContentHint`, bypass de extensiones) y DevTools/Lighthouse: skill `.claude/skills/webmcp`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (mapper + leak test) → Slice 2 (tools factory) → Slice 3 (registro en ciclo de vida) → Slice 4 (verificación EPP + docs).
- El **leak test de Slice 1 DEBE estar verde antes** de que Slice 2/3 expongan cualquier tool. Sin leak test, una tool podría filtrar `formGuid`/mapping.
- Slice 3 no se prende en prod (flag OFF) hasta que Slice 4 verifique en EPP.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Tool filtra dato server-only (`formGuid`, mapping) al agente | growth-forms / leak boundary | low | Mapper puro que solo consume el `RenderContract` browser-safe + leak test bloqueante | test rojo en CI |
| Write muta/envía sin consentimiento o saltando captcha | growth-forms / public submit | low | `execute` termina en el submit gobernado existente (consent gate + Turnstile fail-closed server-side); consent boolean requerido, nunca auto | outcome `consent_required`/`captcha_failed` server-side |
| API WebMCP cambia de forma/nombre (pre-estándar) | browser integration | medium | Feature-detected + aislado en `webmcp/`; canónico `navigator.modelContext`, anotar `document.modelContext`; verificar en Chrome del momento | falla en EPP smoke |
| Extensión con host_permission ejecuta tools saltando `exposedTo` | browser security | medium | Documentar el límite conocido; el write igual pasa por el gate público server-side (surface auth + captcha), no confiar en `exposedTo` como frontera absoluta | outcome `surface_unauthorized` |
| Bundle crece / regresión en render humano | renderer perf | low | Código aislado tras feature-detect; sin efecto si `!('modelContext' in navigator)` | build size check / GVC del form humano sin cambio |

### Feature flags / cutover

- `GROWTH_FORMS_WEBMCP_ENABLED` (default `false`) gobierna todo el registro de tools. Doble puerta con feature-detect (`'modelContext' in navigator`). Cutover: flip a `true` post-EPP smoke. Revert: flag a `false` (o revert del PR del bundle). Tiempo de revert: inmediato en el próximo build del bundle.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (código puro, sin efecto runtime) | inmediato | sí |
| Slice 2 | revert PR (factory no invocada hasta Slice 3) | inmediato | sí |
| Slice 3 | flag `GROWTH_FORMS_WEBMCP_ENABLED=false` / revert PR | inmediato (rebuild bundle) | sí |
| Slice 4 | revert doc | inmediato | sí |

### Production verification sequence

1. Slices 1-2 con tests verdes (mapper + leak + parity) en local/CI.
2. Deploy del bundle con flag OFF → verificar que el form humano no cambió (GVC del renderer lab / superficie real) y que no hay tools registradas.
3. En Chrome EPP local con flag ON: cargar una superficie de staging con form embebido → DevTools → Application → WebMCP muestra 2 tools por form con description + inputSchema sanos.
4. Probar manualmente (Run tool) el read → describe campos; el write con consent=true → submit `accepted` en staging + delivery async como hoy.
5. Lighthouse `registered-webmcp-tools` (Node API con flag WebMCP) reporta las tools.
6. Decisión de rollout de prod (flip flag) separada, tras sign-off.

### Out-of-band coordination required

`N/A — repo-only change.` La verificación usa Chrome EPP/origin-trial local (herramienta de dev). No requiere secrets, env vars server, ni config de terceros.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El mapper produce un `inputSchema` válido para todos los `FIELD_TYPES` del render contract, respetando budgets de chars.
- [ ] Leak test verde: ninguna tool expone `formGuid`, `form_id` (`fdef-*`), `mapping_json`, destinos ni valores server-only.
- [ ] Cada form montado registra exactamente 2 tools (read `readOnlyHint:true` + write) cuando `GROWTH_FORMS_WEBMCP_ENABLED` y WebMCP está presente; **cero** tools cuando la flag está OFF o el navegador no soporta WebMCP.
- [ ] El write ejecuta a través del `api-client`/submit público existente (Turnstile + consent + surface auth + re-validación server intactos); `consent` es requerido y nunca auto-aceptado; `execute` no muta estado directamente.
- [ ] `exposedTo` de cada tool se resuelve desde la allowlist de orígenes gobernada (misma fuente que CORS), no hardcodeada.
- [ ] Tools desregistradas al desmontar el elemento (via `AbortController`/`unregisterTool`).
- [ ] Verificado en Chrome EPP (DevTools → Application → WebMCP) + Lighthouse `registered-webmcp-tools` en staging.
- [ ] El formulario humano no cambia de comportamiento con la flag ON u OFF.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (mapper + leak + parity + registro)
- `pnpm build` (bundle del renderer sano)
- Manual: Chrome EPP + DevTools WebMCP panel + Lighthouse `registered-webmcp-tools` contra staging.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] Archivo en la carpeta correcta.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado con lo verificado (incl. estado real de la flag en cada environment).
- [ ] `changelog.md` actualizado (nuevo consumer WebMCP client-side).
- [ ] Chequeo de impacto cruzado.
- [ ] Flag `GROWTH_FORMS_WEBMCP_ENABLED` registrada en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (default OFF; fila en "Pendientes de acción" si queda code-complete sin prender).
- [ ] `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` documenta el consumer WebMCP.

## Follow-ups

- API **declarativa** de WebMCP (anotar el `<form>` renderizado) como camino más liviano para hosts sin el bundle imperativo.
- Dimensión "agentic-web readiness" del AI Visibility Grader (probes Lighthouse/`.well-known`/`llms.txt`) — dominio grader, task separada; esta task hace que el propio portal puntúe alto.
- Exponer otras superficies gobernadas (más allá de forms) como tools WebMCP siguiendo el mismo patrón facade (Full API Parity).
- `requestUserInteraction()` para consent/acciones sensibles cuando aterrice en el spec de Chrome.

## Open Questions

- ¿Cómo llega el origin allowlist (fuente de `exposedTo`) al browser hoy? El CORS se resuelve server-side; hay que confirmar si el contrato ya expone los orígenes autorizados de la surface o si basta con `exposedTo` = origin propio de la surface. `[verificar]` en Discovery.
- ¿Dónde viven las flags del bundle del renderer (`src/growth-forms-renderer/flags.ts` u otra vía de inyección al build)? Confirmar el mecanismo de flag client-side antes de Slice 3.
- ¿Una sola tool write (con consent en el schema) o el patrón fill-only + human-submit como default más seguro? Decidir en Discovery según postura de consentimiento (recomendado: fill + human-confirm por default).
