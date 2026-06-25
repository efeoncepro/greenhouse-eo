# TASK-1253 — Growth Forms Validator Registry + Server-Side Authority + national_id multi-país

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `task/TASK-1253-growth-forms-validator-registry-server-authority`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El motor de formularios growth valida por tipo **solo en el cliente** (`src/growth-forms-renderer/validation.ts`, marcado "UX, no autoridad"), pero `submitForm` (server) **NO re-valida por tipo**: cualquier POST directo al endpoint público inyecta datos sin formato. Esta task crea un **validator registry canónico** con validadores nombrados (core puro browser-safe + extensión server-only) consumido por el renderer (UX) **y** por `submitForm` (autoridad), cierra el gap de re-validación server-side, normaliza al persistir (canónico + raw) y agrega el tipo de campo `national_id` multi-país reusando el módulo-11 de `person-legal-profile`.

## Why This Task Exists

El header de `validation.ts` afirma que "el backend re-valida". **Es falso.** `submitForm` (`src/lib/growth/forms/commands.ts`) solo hace zod-shape-check laxo (`publicSubmitInputSchema` acepta cualquier `Record<string, string|number|boolean|string[]>`), honeypot, captcha, origin/slug allowlist, consent, rate-limit y dedupe. No hay re-validación de email/tel/url/required/RUT por tipo. Es una **violación de contrato documentado que ya existe en runtime** (registrar como `ISSUE` además de esta task) y la causa raíz de por qué "integridad de datos para análisis posterior" hoy no se sostiene: el dedup usa hash de email pero los campos no se normalizan, así que el mismo lead entra con 4 formatos. Además, los tipos `url` y `tel` ya existen en `FIELD_TYPES` pero su validación es cosmética y `tel` solo cubre Chile (`PHONE_CL_RE = /^\+?56\d{8,9}$/`), insostenible para clientes Globe multi-país.

## Goal

- Un **validator registry canónico** (`src/lib/growth/forms/validators/`) con validadores nombrados, cada uno con core puro browser-safe + extensión server-only opcional, retornando `{ valid, normalized, formatted, reasonCode }`.
- `submitForm` re-valida **por tipo** usando el mismo registry que el renderer (autoridad server-side), con **test de paridad** que garantiza que cliente y servidor no divergen.
- Normalización canónica al persistir (E.164, RUT canónico, email lowercased, trim/collapse) — guardar `normalized` + `raw`; **normalizar antes de hashear** para dedup.
- Tipo de campo `national_id` parametrizado por país, alimentado por un core **browser-safe compartido** (`src/lib/identity-documents/`) extraído del módulo-11 de `person-legal-profile/normalize.ts`; CL=RUT implementado, AR/BR/MX como ranuras.
- La columna inerte `validation_schema_json` (hoy escrita como `'{}'`, nunca leída) pasa a ser la **referencia declarativa a validadores nombrados + params**, leída por ambos lados. Sin `new RegExp(inputDelAdmin)` jamás (anti-ReDoS).

**Full API Parity (nace gobernado):** el validator registry es un primitive canónico en `src/lib/**`; la validación NO vive en el componente. Renderer (UX), `submitForm` (autoridad), futuro Nexa form-fill y MCP lo consumen por construcción — un primitive, muchos consumers, cero validación duplicada. El submit público ya es un contrato gobernado; esta task lo lleva a autoridad real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la UI/renderer es un cliente del primitive, no la autoridad
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — patrón VIEW/helper/signal + SSOT-reader (acá: un registry, muchos consumers)
- `CLAUDE.md` §"Canonical API error response contract" + §"SQL Signal Reader Schema Validation Gate"

Reglas obligatorias:

- La autoridad de validación vive **server-side**; el renderer es ayuda UX. Cliente y servidor consumen el **mismo** registry (un primitive, muchos consumers).
- **NUNCA** ejecutar regex provisto por el admin (`new RegExp(userInput)`) — solo validadores nombrados del catálogo curado + params declarativos (anti-ReDoS).
- **NUNCA** acoplar `src/lib/growth/forms/**` → `src/lib/person-legal-profile/**`. El core de national_id se extrae a `src/lib/identity-documents/` (browser-safe, sin `server-only`, sin throw como control de flujo) y ambos dominios lo consumen.
- Normalizar **antes** de hashear para dedup; persistir `normalized` + `raw` sin perder el payload entregable.
- Errores client-facing vía `canonicalErrorResponse` (es-CL), `reasonCode` estable snake_case; nunca prosa inglesa cruda.

## Normative Docs

- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` — patrón del registry multi-país de documentos legales
- `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/growth/forms/contracts.ts` — `FIELD_TYPES`, `fieldDefinitionSchema`, `publicSubmitInputSchema`, `FIELD_DATA_CLASSES` (ya existen)
- `src/lib/person-legal-profile/normalize.ts` — `CL_RUT_VALIDATOR`, `computeClRutCheckDigit`, `normalizeDocument`, `VALIDATORS` registry multi-país (a extraer core browser-safe)
- `greenhouse_growth.form_submission` (columnas `normalized_fields_json`, `validation_schema_json`) [verificar shape exacto con `information_schema`]

### Blocks / Impacts

- **TASK-1254** (email verification) — el validador `corporate_email` vive en este registry; B depende de A.
- **TASK-1255** (PII hardening) — consume la clasificación de campos sensibles que esta task formaliza.
- **TASK-1256** (UI máscaras + gate) — el renderer consume el registry; D depende de A.
- **TASK-1246** (lanzamiento público del Grader / lead magnet) — **bloquea su cutover**: el lead magnet captura PII pública vía el motor de formularios (convergencia TASK-1251); no se puede lanzar sin validación server-side real. Esta task es prerrequisito de 1246.
- ⚠️ **Colisión con TASK-1229/1231/1232** (motor de formularios, Codex in-flight): esta task modifica `contracts.ts`, `commands.ts`, `store.ts`, `validation.ts`. **Coordinar merge order con Codex antes de tomar** — secuenciar después de que TASK-1232 cierre, o rebasear.

### Files owned

- `src/lib/growth/forms/validators/` (NUEVO — registry + validadores nombrados + tests de paridad)
- `src/lib/identity-documents/` (NUEVO — core browser-safe national_id, módulo-11)
- `src/lib/growth/forms/contracts.ts` (extender `FIELD_TYPES` con `national_id`; tipar `validation_schema_json`)
- `src/lib/growth/forms/commands.ts` (`submitForm` re-valida + normaliza)
- `src/lib/growth/forms/store.ts` (`persistAcceptedSubmission` guarda normalized + raw)
- `src/growth-forms-renderer/validation.ts` (re-cablear a registry compartido)
- `src/lib/person-legal-profile/normalize.ts` (re-exportar desde el core compartido, sin duplicar)
- `migrations/` (si `validation_schema_json` necesita ajuste de default/shape)
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` (delta validator registry)

## Current Repo State

### Already exists

- `FIELD_TYPES = ['text','email','tel','url','textarea','select','multiselect','checkbox','radio','number','date','hidden','consent']` en `contracts.ts` — `url`/`tel` existen, `national_id`/`rut` NO.
- `validateField` (cliente) en `src/growth-forms-renderer/validation.ts:35-74` con `EMAIL_RE`, `PHONE_CL_RE`, `URL_RE` (Chile-only, débil).
- `CL_RUT_VALIDATOR` módulo-11 completo en `src/lib/person-legal-profile/normalize.ts` (server-only, throw-based, registry multi-país `VALIDATORS`).
- `FIELD_DATA_CLASSES` (clasificación PII) en `contracts.ts`.
- Columna `validation_schema_json` en `greenhouse_growth.form_submission` escrita como `'{}'` y **nunca leída** por ningún validador (`store.ts`).

### Gap

- `submitForm` no re-valida por tipo → POST directo inyecta basura.
- No hay normalización canónica al persistir → dedup por hash de email miente con formatos heterogéneos.
- `tel` solo Chile; sin E.164/multi-país.
- El módulo-11 de RUT es `server-only`, no reusable en el renderer (browser).
- No existe `src/lib/identity-documents/`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `submitForm` (autoridad de validación) + validator registry + `form_submission.normalized_fields_json`
- Consumidores afectados: `renderer (UX), submitForm (autoridad), TASK-1254 email gate, TASK-1256 UI`
- Runtime target: `production` (endpoint público) + `local`

### Contract surface

- Contrato existente a respetar: `publicSubmitInputSchema` (`contracts.ts:318-333`), `fieldDefinitionSchema` (`contracts.ts:203-218`), `greenhouse-growth-public-forms.v1`
- Contrato nuevo o modificado: validator registry (`validateFormField(fieldDef, rawValue) -> { valid, normalized, formatted, reasonCode }`), `submitForm` re-validación + normalización
- Backward compatibility: `gated` — submissions existentes no se re-validan retroactivamente; forward-only desde el deploy. Forms sin `validation_schema_json` declarado caen al validador por tipo default (compatible)
- Full API parity: el registry es el primitive; renderer, submitForm, Nexa (futuro form-fill) y MCP lo consumen igual. Sin lógica de validación duplicada por consumer

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_submission`
- Invariantes que no se pueden romper:
  - Cliente y servidor producen el **mismo** veredicto para el mismo input (test de paridad)
  - `normalized` es idempotente: `normalize(normalize(x)) === normalize(x)`
  - El dedup hashea el valor **normalizado**, no el raw
  - El raw entregable a destinos (HubSpot) se preserva intacto junto al normalized
- Tenant/space boundary: el form define su tenant/surface; sin cambio al modelo de tenancy
- Idempotency/concurrency: validación es pura (sin side-effect); `submitForm` mantiene su dedupe_fingerprint actual (ahora sobre valor normalizado)
- Audit/outbox/history: sin cambio al outbox `growth.forms.submission_accepted`; el normalized se agrega al payload persistido

### Migration, backfill and rollout

- Migration posture: `additive` (a lo sumo ajuste de default/comment de `validation_schema_json`; sin destructiva)
- Default state: `enabled with rationale` — la re-validación server nace ON pero **degradación honesta**: si un validador nombrado no existe para un form legacy, cae al check por tipo default y emite signal, NO rechaza en silencio
- Backfill plan: `none` — forward-only; submissions existentes no se re-normalizan (documentar; backfill opcional en follow-up)
- Rollback path: `flag off` (`GROWTH_FORMS_SERVER_VALIDATION_ENABLED`, default ON tras staging) + `revert PR`
- External coordination: `none — repo-only` (coordinar merge con Codex/TASK-1232)

### Security and access

- Auth/access gate: endpoint público (sin sesión); el registry no cambia el modelo de acceso
- Sensitive data posture: `PII` — national_id/email/tel; esta task NO cifra (eso es TASK-1255), pero clasifica con `FIELD_DATA_CLASSES` y normaliza
- Error contract: `canonicalErrorResponse` + `reasonCode` estable; `captureWithDomain(err, 'growth', ...)`
- Abuse/rate-limit posture: reusa rate-limit/abuse-guard existente de `submitForm`; la validación adicional no abre superficie de abuso (es pura, bounded, sin red)

### Runtime evidence

- Local checks: `pnpm test` (registry + paridad cliente/servidor + golden cases RUT incl. dígito K, E.164 edge, url normalize)
- DB/runtime checks: verificar shape de `validation_schema_json` vía `information_schema`; smoke de `submitForm` con payload malformado → rechazo canónico
- Integration checks: POST directo al endpoint con email inválido → 4xx canónico (no 200)
- Reliability signals/logs: `growth.forms.validation_fallback_used` (form sin validador nombrado → cayó a default), `growth.forms.server_validation_rejected` (tasa de rechazo por reasonCode)
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Registry, `submitForm` y consumers nombrados con paths reales.
- [ ] Invariante de paridad cliente/servidor cubierto por test.
- [ ] Migration additive + rollback por flag explícito.
- [ ] Evidencia runtime: POST malformado rechazado server-side.
- [ ] PII clasificada; sin regex libre del admin; errores canónicos.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica de validación en el primitive (`validators/`), no en el renderer.
- [ ] Modelada como reader/validador puro reusable, no como handler de pantalla.
- [ ] Read (validación) expuesta como función canónica; el write (`submitForm`) re-valida con authz pública + errores canónicos + observabilidad.
- [ ] Capability: `N/A — no nueva capability` (validación es parte del submit público existente). Declarar en Plan.
- [ ] Camino programático: el registry sirve a renderer + submitForm + futuro Nexa form-fill + MCP por construcción.
- [ ] Un primitive, muchos consumers: cero validación duplicada.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Core browser-safe de national_id

- Crear `src/lib/identity-documents/` con el core módulo-11 extraído de `person-legal-profile/normalize.ts` (browser-safe, sin `server-only`, retorno `{ valid, normalized, formatted, reasonCode }` en vez de throw).
- `person-legal-profile/normalize.ts` re-exporta desde el core (sin duplicar la lógica); preservar su API pública actual.
- Golden tests: RUTs válidos/ inválidos, dígito verificador `K`, formatos con/sin puntos y guion.

### Slice 2 — Validator registry canónico

- `src/lib/growth/forms/validators/` con validadores nombrados: `text`, `email_syntax`, `e164_phone` (multi-país, default país por form), `url`, `national_id` (param country), `number`, `date`, `consent`.
- Cada validador: core puro browser-safe + (opcional) extensión `server-only`. Contrato uniforme `validateFormField`.
- `FIELD_TYPES` += `national_id`; `validation_schema_json` tipado como referencia declarativa `{ validator: <named>, params: {...} }`. **Sin** `new RegExp` de input del admin.

### Slice 3 — Re-cablear renderer al registry (paridad)

- `src/growth-forms-renderer/validation.ts` consume el registry compartido (elimina `EMAIL_RE`/`PHONE_CL_RE`/`URL_RE` locales).
- Test de paridad cliente↔servidor: mismo input → mismo veredicto y mismo `normalized`.

### Slice 4 — Autoridad server-side + normalización en submitForm

- `submitForm` re-valida cada campo por su validador nombrado; rechaza con `canonicalErrorResponse` + `reasonCode` si falla.
- `persistAcceptedSubmission` guarda `normalized` + `raw`; dedupe_fingerprint sobre normalizado.
- Flag `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` (default ON tras staging) + degradación honesta + signals.

## Out of Scope

- Verificación de email en tiempo real / deliverability / gate corporativo → **TASK-1254**.
- Cifrado de PII / masking admin / retención → **TASK-1255**.
- Máscaras de input en el renderer, submit-gating UI, builder admin de validadores → **TASK-1256**.
- Backfill de normalización sobre submissions históricas (forward-only; follow-up opcional).
- Validadores de país distintos a CL implementados end-to-end (AR/BR/MX quedan como ranuras, no implementados).

## Detailed Spec

Veredicto de arquitectura (arch-architect, Greenhouse overlay): un registry, validadores nombrados con core browser-safe + extensión server-only, consumido por renderer y `submitForm`. `validateFormField(fieldDef, rawValue): { valid: boolean; normalized: string|number|boolean|string[]; formatted: string; reasonCode: string|null }`. El `reasonCode` es snake_case estable mapeable a copy es-CL en `src/lib/copy/*`. `national_id` reusa el módulo-11 vía core compartido. La columna `validation_schema_json` deja de ser inerte y declara `{ validator, params }` por campo, leída por ambos lados; el admin nunca inyecta regex.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (core national_id) → Slice 2 (registry) → Slice 3 (renderer paridad) → Slice 4 (autoridad server).
- Slice 4 NO puede shippear sin Slice 3 verde (paridad), o cliente y servidor divergen y se rechazan submissions legítimas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Re-validación server rechaza leads legítimos (validador más estricto que el cliente) | UI / growth | medium | Test de paridad obligatorio + flag default ON solo tras staging + degradación honesta | `growth.forms.server_validation_rejected` (spike) |
| Form legacy sin validador nombrado deja de aceptar | growth | medium | Fallback a check por tipo default + signal, nunca rechazo silencioso | `growth.forms.validation_fallback_used` |
| Acoplamiento forms→person-legal-profile | migration | low | Core extraído a `identity-documents/` browser-safe; lint de import boundary | no signal — emerge en build |
| Colisión de merge con TASK-1232 (Codex) | growth | high | Coordinar order; rebasear; tomar tras cierre de 1232 | no signal — emerge en review |

### Feature flags / cutover

- `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` (env var, default `false` en deploy inicial → `true` tras smoke staging). Revert: flag a `false` + redeploy (<5 min Vercel). Registrar fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (additive, nuevo módulo) | <5 min | sí |
| Slice 2 | revert PR (additive) | <5 min | sí |
| Slice 3 | revert PR (renderer vuelve a regex local) | <5 min | sí |
| Slice 4 | flag `GROWTH_FORMS_SERVER_VALIDATION_ENABLED=false` + redeploy | <5 min | sí |

### Production verification sequence

1. `pnpm migrate:up` staging (si aplica ajuste de `validation_schema_json`) + verify vía `information_schema`.
2. Deploy staging con flag=false + verify forms existentes no cambian.
3. Flip flag=true staging + POST malformado → rechazo canónico; POST válido → 200 + normalized persistido.
4. Verify paridad: mismo input desde renderer y desde curl → mismo veredicto.
5. Repetir 2-4 en prod con cooldown 24h.
6. Monitor signals 7d.

### Out-of-band coordination required

- Coordinar merge order con Codex (TASK-1229/1231/1232 tocan los mismos archivos del motor). Repo-only fuera de eso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `src/lib/growth/forms/validators/` con validadores nombrados y contrato uniforme.
- [ ] `submitForm` rechaza un POST con email/tel/url/national_id malformado con error canónico es-CL + reasonCode (verificado con curl directo, no solo unit).
- [ ] Test de paridad cliente↔servidor verde para todos los validadores.
- [ ] `national_id` con country=CL valida dígito verificador (incl. `K`) y persiste RUT canónico.
- [ ] Persistencia guarda `normalized` + `raw`; dedup hashea el normalizado.
- [ ] No existe `new RegExp(<input del admin>)` en ningún path; el admin solo referencia validadores nombrados.
- [ ] `src/lib/growth/forms/**` no importa `src/lib/person-legal-profile/**`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- curl directo al endpoint público de submit con payloads malformados (evidencia runtime)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1254/1255/1256 + TASK-1232)
- [ ] fila del flag agregada a `FEATURE_FLAG_STATE_LEDGER.md`
- [ ] `ISSUE` abierto/cerrado por el gap de re-validación server-side documentado

## Follow-ups

- Implementar validadores AR/BR/MX en `identity-documents/` cuando entre el primer cliente fuera de CL.
- Backfill opcional de normalización sobre `form_submission` históricas.

## Open Questions

- ¿Se toma después del cierre de TASK-1232 o se rebasea en paralelo? (coordinación con Codex)
