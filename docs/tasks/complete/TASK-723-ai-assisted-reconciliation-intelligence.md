# TASK-723 — AI-Assisted Reconciliation Intelligence

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Implementada y validada el 2026-04-29`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (`TASK-722` cerrada el 2026-04-29)
- Branch: `task/TASK-723-ai-assisted-reconciliation-intelligence`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Agregar una capa AI asistiva para conciliacion bancaria que proponga matches, agrupaciones, explicaciones de drift, normalizacion de extractos y revision previa al cierre. No es chat y no ejecuta writes automaticos: Greenhouse mantiene reglas deterministicas, auditoria y aprobacion humana; el LLM solo enriquece casos ambiguos con sugerencias estructuradas, explicables y versionadas.

## Why This Task Exists

`TASK-722` ya conecta Banco y Conciliacion como flujo operativo. Sobre esa columna vertebral aparecen casos donde reglas exactas no alcanzan:

- descripciones bancarias pobres o variables (`TRASPASO TERCEROS`, `COMPRA INTL`, `ABONO`, marcas abreviadas).
- cargos de tarjeta en hold que explican drift, pero no deben cerrarse como banco posted.
- 1 movimiento bancario que corresponde a varios registros internos, o varias filas internas que explican un drift.
- transferencias internas incompletas, refunds, reversas, fees y diferencias FX.
- periodos que parecen conciliados pero tienen matches debiles, legacy payment-only o evidencia insuficiente.

Greenhouse ya tiene infraestructura AI en otros dominios (`src/lib/finance/ai/*`, `src/lib/reliability/ai/*`, Nexa/Gemini). Esta task reutiliza el patron, pero crea una capability no conversacional y human-in-the-loop para reconciliacion.

## Goal

- Diseñar y construir `Reconciliation Intelligence` como capa asistiva sobre Banco + Conciliacion.
- Producir sugerencias JSON tipadas con confidence, evidence factors, proposed action, rationale y approval state.
- Mantener matching deterministico como autoridad; AI solo propone y explica.
- Persistir auditoria: prompt version, model id, input hash, output JSON, accepted/rejected user, timestamps y outcome.
- Permitir simulacion: "si aceptas estas sugerencias, el drift bajaria de X a Y".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- AI enriquece, no reemplaza reglas deterministicas.
- AI no concilia, no excluye, no cierra periodos y no crea payments sin aprobacion humana.
- Todo output del LLM debe ser JSON estructurado validado por schema runtime.
- Todo input enviado al modelo debe estar minimizado y sanitizado.
- Todo resultado debe guardar `modelId`, `promptVersion`, `promptHash`, `inputHash`, `confidence`, `status` y usuario que acepto/rechazo.
- Si AI esta apagada o falla, Conciliacion sigue funcionando igual.

## Normative Docs

- `docs/tasks/complete/TASK-722-bank-reconciliation-synergy-workbench.md`
- `docs/tasks/complete/TASK-721-finance-evidence-canonical-uploader.md`
- `docs/tasks/complete/TASK-708-nubox-documents-only-and-reconciliation-sot-cutover.md`
- `docs/tasks/complete/TASK-715-reconciliation-test-period-archive-ux.md`
- `docs/tasks/complete/TASK-638-reliability-ai-observer.md`

## Dependencies & Impact

### Depends on

- `TASK-722` para bridge Banco -> Conciliacion y estado combinado por cuenta/periodo. Estado real: `complete`.
- `TASK-721` para evidencia canonica (`evidence_asset_id`) usable como metadata de contexto.
- `greenhouse_finance.reconciliation_periods`
- `greenhouse_finance.bank_statement_rows`
- `greenhouse_finance.account_reconciliation_snapshots`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/reconciliation/snapshots.ts`
- `src/lib/finance/ai/llm-provider.ts`
- `src/lib/finance/ai/finance-signal-types.ts`
- `src/lib/ai/google-genai.ts`

### Blocks / Impacts

- Mejora velocidad y calidad de cierre mensual sin convertir AI en source of truth.
- Puede alimentar Nexa/Home despues como insight read-only: "3 sugerencias de conciliacion listas para revisar".
- Requiere cuidado de costos, PII y auditoria porque toca datos financieros y bancarios.

### Files owned

- `src/lib/finance/reconciliation-intelligence/*` (nuevo)
- `src/app/api/finance/reconciliation/[id]/intelligence/route.ts` (nuevo)
- `src/app/api/finance/reconciliation/[id]/intelligence/[suggestionId]/route.ts` (nuevo)
- `src/views/greenhouse/finance/ReconciliationDetailView.tsx`
- `src/views/greenhouse/finance/ReconciliationView.tsx`
- `src/views/greenhouse/finance/dialogs/ReconciliationMatchDialog.tsx`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/ledger-health.ts` (solo detector/readiness si aplica)
- `migrations/YYYYMMDDHHMMSS_task-723-reconciliation-ai-suggestions.sql` (nuevo)

## Current Repo State

### Already exists

- Matching transaccional en `src/lib/finance/postgres-reconciliation.ts`.
- UI de workbench en `src/views/greenhouse/finance/ReconciliationDetailView.tsx`.
- Dialog de match manual en `src/views/greenhouse/finance/dialogs/ReconciliationMatchDialog.tsx`.
- Capa AI financiera para señales agregadas en `src/lib/finance/ai/*`.
- Provider Gemini compartido en `src/lib/ai/google-genai.ts`.
- Patron AI auditado en `TASK-638`: prompt version, sanitizacion, JSON, dedupe/fingerprint, kill switch.

### Gap

- No existe AI para statement rows ni movimientos de conciliacion.
- No hay tabla de sugerencias AI aceptables/rechazables.
- No hay simulacion de impacto sobre drift antes de aplicar matches.
- No hay memoria operativa para aprender de aceptaciones/rechazos.
- No hay sanitizacion especifica para descripciones bancarias, referencias, RUTs, IDs bancarios o evidencia metadata.
- La tabla propuesta originalmente no declaraba `space_id`; la implementacion debe persistirlo denormalizado desde `reconciliation_periods` / `accounts` para aislamiento tenant y queries operativas.
- El canal canonico post TASK-708/TASK-722 es `matched_settlement_leg_id`; los `candidate_payment_ids` se mantienen solo como fallback legacy y deben bajar confianza o quedar marcados como `legacy_payment_only`.
- `listReconciliationCandidatesByDateRangeFromPostgres` debe corregirse/filtrarse antes de alimentar AI: el comentario dice que expense candidates filtran por `accountId`, pero el SQL actual de expense settlement/payment/fallback no lo hace completamente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Suggestion schema and lifecycle

- Crear tabla `greenhouse_finance.reconciliation_ai_suggestions`.
- Campos minimos:
  - `suggestion_id`
  - `space_id`
  - `period_id`
  - `account_id`
  - `suggestion_type`
  - `status`
  - `confidence`
  - `statement_row_ids`
  - `candidate_payment_ids`
  - `candidate_settlement_leg_ids`
  - `proposed_action_json`
  - `evidence_factors_json`
  - `rationale`
  - `simulation_json`
  - `model_id`
  - `prompt_version`
  - `prompt_hash`
  - `input_hash`
  - `tokens_in`
  - `tokens_out`
  - `latency_ms`
  - `generated_at`
  - `accepted_by_user_id`
  - `accepted_at`
  - `rejected_by_user_id`
  - `rejected_at`
  - `rejection_reason`
- Estados: `draft`, `proposed`, `accepted`, `rejected`, `expired`, `superseded`, `failed`.
- Tipos: `match`, `group_match`, `drift_explanation`, `import_mapping`, `closure_review`, `anomaly`.
- `candidate_settlement_leg_ids` es el target preferido. `candidate_payment_ids` solo existe para compatibilidad legacy y debe quedar explicitado en `evidence_factors_json`.

### Slice 2 — Deterministic pre-pass

- Construir `src/lib/finance/reconciliation-intelligence/prepass.ts`.
- Calcular factores deterministas antes de llamar al LLM:
  - monto exacto/cercano
  - ventana de fecha
  - moneda/cuenta
  - referencia/proveedor/cliente
  - settlement leg canonicity
  - match legacy payment-only
  - duplicados/reversas/refunds
  - hold de tarjeta
  - FX timing
  - transferencias internas incompletas
- Si una regla deterministica alcanza confianza alta, generar sugerencia sin LLM y marcar `model_id='rules-only'`.
- Antes de usar candidatos existentes, validar que cada target pertenece al `account_id` y `space_id` del periodo. No confiar solo en IDs enviados por UI o devueltos por LLM.
- Corregir o envolver el candidate resolver para que expense settlement/payment/fallback queden account-scoped; mientras eso no ocurra, AI no puede persistir sugerencias basadas en esos fallbacks.

### Slice 3 — Prompt builder + sanitization

- Crear `src/lib/finance/reconciliation-intelligence/sanitize.ts`.
- Redactar o minimizar:
  - RUTs
  - numeros de cuenta/tarjeta
  - emails
  - UUIDs largos cuando no aporten
  - referencias bancarias sensibles
  - nombres si el caso puede resolverse por provider/category/reference normalizada.
- Crear `build-prompt.ts` con respuesta JSON estricta.
- Definir `RECONCILIATION_AI_PROMPT_VERSION='reconciliation_intelligence_v1'`.
- Usar `responseMimeType='application/json'`, temperature baja y schema validation local.

### Slice 4 — Suggestion runner

- Crear runner server-side `generateReconciliationSuggestions({ periodId, mode })`.
- Modos:
  - `statement_rows`: sugiere matches fila a fila.
  - `drift`: explica drift y agrupa movimientos que lo reducen.
  - `closure_review`: revisa readiness antes de cerrar.
  - `import_mapping`: sugiere mapping de columnas/normalizacion si aplica.
- Deduplicar por `input_hash + prompt_version + period_id`.
- Kill switch: `FINANCE_RECONCILIATION_AI_ENABLED=false` por default.
- Budget:
  - max filas por batch.
  - max candidatos por fila.
  - skip si periodo ya cerrado.
  - timeout y degraded response.

### Slice 5 — API commands

- `POST /api/finance/reconciliation/[id]/intelligence` genera o refresca sugerencias.
- `GET /api/finance/reconciliation/[id]/intelligence` lista sugerencias actuales.
- `POST /api/finance/reconciliation/[id]/intelligence/[suggestionId]` acepta/rechaza.
- Aceptar una sugerencia no debe aplicar writes de conciliacion automaticamente en V1, salvo que el usuario confirme dentro del flujo existente de `ReconciliationMatchDialog`.
- Rechazar guarda razon opcional y entrena memoria operativa futura via audit trail.

### Slice 6 — UI assistive layer

- En `ReconciliationDetailView`, agregar panel "Sugerencias AI" no conversacional:
  - generar sugerencias
  - listar por confianza y tipo
  - explicar factores
  - mostrar simulacion de impacto en drift
  - CTA "Revisar match" que abre el dialog existente con candidato preseleccionado.
- En filas de extracto, mostrar indicador "Sugerencia disponible" sin ocultar estado real.
- En cierre de periodo, agregar `closure_review` como preflight opcional: "AI no encontro inconsistencias fuertes" o "revisa 2 matches debiles".
- No usar chat ni composer.

### Slice 7 — Learning without fine-tuning

- Crear helper de memoria operativa basado en aceptaciones/rechazos:
  - aliases de merchant/provider.
  - patrones de descripcion -> supplier/client/category.
  - reglas candidatas para `account_signal_matching_rules` o equivalente futuro.
- No hacer fine-tuning en V1.
- No auto-promover reglas; solo sugerirlas para revision humana/admin.

## Out of Scope

- Chat conversacional.
- Writes automaticos de matches/exclusions/period close.
- Fine-tuning de modelos.
- OCR completo de PDFs/screenshots.
- Entrenar con documentos bancarios completos sin sanitizacion.
- Sustituir el matcher deterministico actual.
- Ejecutar AI en Production sin kill switch y budget explicito.

## Detailed Spec

### Output contract

```ts
type ReconciliationAiSuggestion = {
  suggestionId: string
  suggestionType:
    | 'match'
    | 'group_match'
    | 'drift_explanation'
    | 'import_mapping'
    | 'closure_review'
    | 'anomaly'
  confidence: number
  proposedAction: {
    action:
      | 'open_match_dialog'
      | 'suggest_group'
      | 'explain_drift'
      | 'review_before_close'
      | 'normalize_import'
      | 'no_action'
    targetIds: string[]
    payload: Record<string, unknown>
  }
  evidenceFactors: Array<{
    factor: string
    weight: number
    observed: string
  }>
  rationale: string
  simulation?: {
    currentDifference: number | null
    projectedDifference: number | null
    affectedRows: string[]
  }
  requiresApproval: true
}
```

### Rules-first policy

Orden canonico:

1. reglas deterministicas y existing matcher.
2. heuristic pre-pass.
3. LLM solo si el caso sigue ambiguo o necesita explicacion.
4. schema validation.
5. persist suggestion.
6. humano revisa y acepta/rechaza.
7. flujo existente aplica el match o cierre.

### Access model

- `routeGroups`: `finance`.
- `views`: no crea vista nueva en V1; aparece dentro de `/finance/reconciliation` y `/finance/reconciliation/[id]`.
- `entitlements`:
  - `finance.reconciliation.ai_suggestions.read` — `{ action: 'read', scope: 'space' }`
  - `finance.reconciliation.ai_suggestions.generate` — `{ action: 'create', scope: 'space' }`
  - `finance.reconciliation.ai_suggestions.review` — `{ action: 'update', scope: 'space' }`
- La capacidad de generar AI no implica permiso para aplicar match ni cerrar periodo.

### Safety and privacy

- Sanitizar antes del prompt y testear sanitizacion.
- Loguear hashes y metadata, no prompt completo con datos sensibles.
- Persistir output JSON y rationale para auditoria.
- Si hay datos insuficientes, el LLM debe devolver `confidence <= 0.4` y `proposedAction.action='no_action'`.
- Nunca enviar archivos completos al LLM en V1; solo metadata de evidencia y filas parseadas/sanitizadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe tabla `greenhouse_finance.reconciliation_ai_suggestions` con lifecycle auditado.
- [x] La tabla persiste `space_id`, `period_id` y `account_id`; todas las queries filtran por tenant/scope derivado del periodo.
- [x] El candidate resolver usado por AI valida `account_id`/`space_id` y no usa expense fallbacks cross-account.
- [x] Pre-pass deterministico genera sugerencias `rules-only` sin LLM cuando corresponde.
- [x] Prompt builder produce JSON estable y validado por schema runtime.
- [x] Sanitizacion cubre RUT, emails, UUIDs largos, numeros de cuenta/tarjeta y referencias sensibles.
- [x] API permite generar, listar, aceptar y rechazar sugerencias.
- [x] UI muestra sugerencias no conversacionales en el workbench de conciliacion.
- [x] Aceptar una sugerencia no aplica writes automaticos fuera del flujo humano existente.
- [x] Kill switch `FINANCE_RECONCILIATION_AI_ENABLED` desactiva todo sin romper Conciliacion.
- [x] Sugerencias guardan `modelId`, `promptVersion`, `promptHash`, `inputHash`, tokens y latencia.
- [x] Se documenta access model en ambos planos: views + entitlements.

## Verification

- `pnpm pg:doctor`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/finance/reconciliation-intelligence`
- `pnpm test src/lib/finance/__tests__`
- Manual smoke en staging:
  - abrir periodo con statement rows.
  - generar sugerencias con kill switch ON.
  - revisar una sugerencia de match.
  - aceptar/rechazar.
  - confirmar que no se aplica write automatico sin confirmacion en el dialog.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre `TASK-722`, `TASK-721`, `TASK-708` y la capa `src/lib/finance/ai/*`
- [x] variables de entorno nuevas quedaron documentadas en `project_context.md` y `.env.example` si aplican

## Follow-ups

- OCR/Document AI para evidencia bancaria completa.
- Promocion de patrones aceptados a reglas declarativas administrables.
- Nexa/Home read-only insights sobre backlog de conciliacion.
- AI-assisted reconciliation para cuentas multi-moneda y FX settlement.

## Delta 2026-04-28

- Task creada como follow-up de `TASK-722` para modelar AI no conversacional en conciliacion: suggestions estructuradas, rules-first, human-in-the-loop, audit trail y fallback deterministico.

## Delta 2026-04-29

- Implementada capa `reconciliation-intelligence` advisory-only con migration, types, APIs, entitlements, UI no conversacional, sanitizacion y tests.
- Se corrigio el resolver de expense candidates para filtrar por `account_id` y excluir fallbacks sin anchor cuando el periodo esta scoped.
- Validado con `pnpm pg:doctor`, `pnpm migrate:up`, tests unitarios del modulo, `pnpm lint` y `pnpm build`.
