# TASK-1005 — Client Onboarding Wizard AI Assistants

## Delta 2026-06-04 — desbloqueada (TASK-1006 complete)

TASK-1006 cerró: los campos financieros del wizard (billing_address/country, requires_po/hes, current_po/hes_number, special_conditions) + clients.country_code **ahora persisten** en `client_profiles`. El AI Preflight ya puede razonar/sugerir sobre esos campos sin que el runtime los descarte. `Blocked by` resuelto.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial|ai|finance|integrations|ui|api`
- Blocked by: `TASK-1006`
- Branch: `task/TASK-1005-client-onboarding-wizard-ai-assistants`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Agregar IA al wizard canonico de alta de cliente (`/agency/clients/new`) como capa advisory y de sugerencias editables: preflight en Confirmar, generador de fases comerciales, ranking de contactos financieros, smart match de origen/duplicados y quality check de Notion/Teams. La IA nunca debe ser el writer del alta ni reemplazar validaciones deterministicas; el commit sigue pasando por `provisionClientFromWizard`.

## Why This Task Exists

El wizard ya concentra el nacimiento del cliente, pero obliga al operador a interpretar notas comerciales, contactos HubSpot, fases, riesgos de setup y asociaciones externas de forma manual. La sesion de analisis 2026-06-04 identifico oportunidades de IA de alto valor siempre que se respeten los guardrails del flujo: `provisionClientFromWizard` es la unica puerta de write, Notion tokens no pueden exponerse a prompts y los items con evidencia requerida no pueden auto-completarse por IA.

## Goal

- Materializar un **AI Preflight** read-only en el paso Confirmar con riesgos, warnings, sugerencias y confidence.
- Agregar helpers IA editables para fases comerciales y clasificacion/ranking de contactos financieros.
- Agregar smart match y quality checks de origen, Notion y Teams sin mutar datos ni exponer secretos.
- Dejar contrato programatico interno para estas capacidades, alineado con full API parity y reutilizable por futuros agentes/Nexa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- IA es **advisory**: no crea clientes, no promueve lifecycle, no persiste secretos, no auto-completa evidencia requerida.
- El write final del alta sigue exclusivamente en `src/lib/client-lifecycle/commands/provision-client-from-wizard.ts`.
- Las reglas deterministicas siguen mandando: tax ID, moneda soportada, `space_type`, capabilities, duplicado exacto por tax ID y schema de Notion/Teams.
- Cualquier output IA debe ser JSON estructurado, sanitizado, con `confidence`, `evidenceRefs` y `appliedByUser=false` hasta que el operador acepte/edite.
- Full API parity: las sugerencias deben vivir en readers/commands server-side y rutas Product API internas; la UI no puede contener prompts o logica de negocio IA.
- Notion tokens y credenciales nunca entran al prompt ni a logs; solo metadata redacted ya descubierta.

## Normative Docs

- `DESIGN.md`
- `docs/tasks/in-progress/TASK-992-client-lifecycle-orchestrator-single-front-door.md`
- `docs/tasks/in-progress/TASK-1001-client-portal-people-provisioning-onboarding.md`
- `docs/tasks/to-do/TASK-997-wizard-canonical-external-reference-association.md`
- `docs/tasks/to-do/TASK-998-notion-teams-teamspace-linking-discover-register.md`
- `docs/tasks/to-do/TASK-1002-full-api-parity-first-wave-program.md`

## Dependencies & Impact

### Depends on

- `TASK-1006` — cerrar primero el drift UI→persistencia para que el AI Preflight no recomiende campos que el sistema descarta.
- `src/views/greenhouse/agency/clients/ClientOnboardingView.tsx`
- `src/lib/copy/client-onboarding.ts`
- `src/lib/client-lifecycle/commands/provision-client-from-wizard.ts`
- `src/app/api/admin/clients/lifecycle/provision/route.ts`
- `src/app/api/admin/clients/lifecycle/org-search/route.ts`
- `src/app/api/admin/clients/lifecycle/finance-contacts/route.ts`
- `src/app/api/admin/clients/lifecycle/notion/validate/route.ts`
- `src/app/api/admin/clients/lifecycle/teams/route.ts`
- `src/lib/client-onboarding/org-search.ts`
- `src/lib/client-onboarding/finance-contact-suggestions.ts`
- `src/lib/client-onboarding/notion-token-connect.ts`
- `src/lib/client-onboarding/teams-channels-reader.ts`
- Existing AI patterns: `src/lib/reliability/ai/**`, `src/lib/cloud/finops-ai/**`, `src/lib/nexa/**`, `src/lib/ai/google-genai.ts`

### Blocks / Impacts

- Mejora la ejecucion de `TASK-992` y reduce casos "media-cocidos".
- Puede alimentar `TASK-1002` como primer ejemplo de Client Lifecycle con AI/API parity.
- Puede alimentar un futuro adapter Nexa/MCP para preparar altas sin usar screen-scraping.
- Impacta UI visible; requiere skills de product design + GVC.

### Files owned

- `src/lib/client-onboarding/ai/**`
- `src/app/api/admin/clients/lifecycle/ai/**`
- `src/views/greenhouse/agency/clients/ClientOnboardingView.tsx`
- `src/lib/copy/client-onboarding.ts`
- `src/lib/client-onboarding/form-helpers.ts`
- `src/lib/client-onboarding/org-search.ts`
- `src/lib/client-onboarding/finance-contact-suggestions.ts`
- `src/lib/client-onboarding/notion-token-connect.ts`
- `src/lib/client-onboarding/teams-channels-reader.ts`
- `tests/e2e/smoke/**` or `scripts/frontend/scenarios/client-onboarding-wizard-ai*`
- `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md`
- `docs/documentation/commercial/**`
- `docs/manual-de-uso/**`

## Current Repo State

### Already exists

- Wizard runtime real en `/agency/clients/new` con 6 pasos y commit atomico.
- Prefill deterministico desde HubSpot/Nubox via `org-search`.
- Gate exacto por tax ID para duplicados.
- Sugerencias de contactos financieros desde HubSpot/proyeccion CRM.
- Validacion de token Notion y autoclasificacion deterministica de DBs por titulo.
- Reader de Teams read-only para seleccionar team/channel.
- Checklist de onboarding `standard_onboarding_v1` con 10 items.
- Patron IA existente en reliability/finops con JSON estricto, sanitizacion, kill-switch y persistencia opcional.

### Gap

- No existe AI Preflight del alta.
- No existe generador de fases comerciales editable.
- No existe ranking/explicacion IA para contactos de finanzas.
- La busqueda de orgs es literal (`ILIKE`) y el duplicado solo detecta tax ID exacto.
- Notion/Teams validan conectividad y shape basico, pero no hacen quality review de naming/template/canal equivocado.
- No existe contrato programatico para pedir sugerencias del wizard desde Nexa, agentes o futuras apps.

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

### Slice 1 — AI contract foundation

- Crear `src/lib/client-onboarding/ai/types.ts` con contratos para `OnboardingAiPreflight`, `OnboardingAiSuggestion`, `OnboardingAiRisk`, `OnboardingAiEvidenceRef`, `OnboardingAiConfidence`.
- Crear sanitizer/redactor para payload del wizard: remover tokens Notion, emails cuando no sean necesarios, IDs sensibles y campos no usados.
- Crear kill-switch `CLIENT_ONBOARDING_AI_ENABLED=false` default y model/provider resolver usando patrones existentes (`src/lib/reliability/ai/**` / `src/lib/ai/google-genai.ts`).
- Agregar tests unitarios de redaction y schema de salida.

### Slice 2 — AI Preflight API + deterministic guard composer

- Crear `POST /api/admin/clients/lifecycle/ai/preflight` con capability `client.lifecycle.case.read` o una capability granular nueva si Discovery lo justifica.
- Componer primero un preflight deterministico (`country/currency`, phases empty, no finance contacts, existing completeness gaps, Notion/Teams selection state, checklist blockers expected).
- Llamar IA solo si flag ON; si flag OFF o falla, devolver preflight deterministico con `aiStatus='disabled|degraded'`.
- Output JSON estricto con severidad `info|warning|blocker_suggestion` donde `blocker_suggestion` no bloquea el submit por si mismo.

### Slice 3 — UI advisory panel in Confirmar

- Agregar panel "Revision inteligente" en el paso Confirmar.
- Mostrar loading/degraded/ready honestos, confidence y evidencia por recomendacion.
- Permitir ir al step relacionado con CTA "Revisar" sin aplicar cambios automaticos.
- Copy en `src/lib/copy/client-onboarding.ts`; no strings reutilizables inline.
- GVC obligatorio para desktop/laptop/mobile.

### Slice 4 — Commercial phases suggestion

- Crear `POST /api/admin/clients/lifecycle/ai/suggest-phases`.
- Entradas: engagement kind, start/end, client country/name/industry, existing phases.
- Salida: fases editables con `name`, `start`, `end`, `reason`, `confidence`.
- UI: boton "Sugerir fases" en Comercial; aplicar solo al confirmar operador; nunca reemplazar fases existentes sin confirmacion.
- Tests para no generar fechas fuera del rango y para preservar timezone local.

### Slice 5 — Finance contacts ranking and role hints

- Extender `finance-contact-suggestions` con enrichment IA opcional sobre los contactos ya obtenidos por reader canonico.
- Clasificar contactos como `billing`, `approver`, `collections`, `unclear`, con reason y confidence.
- UI: chips/ordering de sugeridos; aceptar manual siempre disponible.
- Nunca inventar emails ni personas que no existen en HubSpot o fueron ingresadas manualmente por el operador.

### Slice 6 — Smart org match + Notion/Teams quality checks

- Agregar `POST /api/admin/clients/lifecycle/ai/match-organization` o integrar en el preflight para similitud nombre/dominio/tax partial sin desplazar el gate exacto por tax ID.
- Agregar quality check sobre DB titles/classification Notion y Teams team/channel names usando solo metadata redacted ya descubierta.
- Alertar si el canal/base parece de otro cliente, si faltan las 3 DBs o si el naming sugiere plantilla no canonica.

### Slice 7 — API parity, docs, manual and rollout

- Documentar los contratos internos en `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md`.
- Agregar doc funcional/manual para operadores explicando que IA sugiere, no confirma.
- Registrar cualquier capability nueva en entitlements catalog + grants + parity tests.
- Si el AI path queda Product API interno solamente, dejar follow-up explicito en `TASK-1002` para lane app/MCP si aplica.

## Out of Scope

- Crear clientes, lifecycle cases, spaces, Notion sources o Teams channels desde IA.
- Enviar tokens Notion, secretos, raw emails sensibles o credenciales a prompts.
- Auto-completar `confirm_legal_documents` o `provision_notion_workspace` sin evidencia.
- Reemplazar reglas deterministicas de validacion, capabilities o schema.
- Public API externa para alta de clientes; V1 es Product API interna.
- Persistencia de campos financieros visibles que hoy no viajan en el submit; eso vive en `TASK-1006`.

## Detailed Spec

Prioridad funcional:

1. AI Preflight en Confirmar.
2. Sugerir fases comerciales.
3. Ranking/clasificacion de contactos financieros.
4. Smart match de origen/duplicados.
5. Quality check Notion/Teams.

Shape sugerido:

```ts
type OnboardingAiSeverity = 'info' | 'warning' | 'blocker_suggestion'
type OnboardingAiStatus = 'disabled' | 'deterministic_only' | 'ready' | 'degraded'

interface OnboardingAiPreflight {
  status: OnboardingAiStatus
  generatedAt: string
  risks: Array<{
    code: string
    severity: OnboardingAiSeverity
    title: string
    description: string
    stepKey: 'origen' | 'identidad' | 'comercial' | 'finanzas' | 'space' | 'confirmar'
    confidence: 'high' | 'medium' | 'low'
    evidenceRefs: Array<{ kind: string; label: string; redactedValue?: string }>
    suggestedAction?: string
  }>
}
```

Preflight deterministico minimo:

- `country='MX'` y `currency!='MXN'` -> warning.
- `contacts.length===0` -> warning sobre setup de facturacion.
- `phases.length===0` -> info/warning segun engagement kind.
- `existingCompleteness.exists && !isStructurallyComplete` -> warning con gaps.
- `notionMode='link' && !notionConnect` -> warning.
- `teamsMode='link' && !teamsConnect` -> warning.
- `requiresPo=true && !currentPoNumber` despues de `TASK-1006` -> warning.
- `requiresHes=true && !currentHesNumber` despues de `TASK-1006` -> warning.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3.
- Slice 4 y Slice 5 pueden correr despues de Slice 2.
- Slice 6 despues de Slice 2 y despues de confirmar que no envia tokens/secretos a prompts.
- Slice 7 cierra cuando GVC + docs + flags + parity queden sincronizados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| IA sugiere dato incorrecto y operador lo acepta sin entender | UI/commercial | medium | Copy advisory, confidence, evidencia, aplicar solo con confirmacion humana | no signal — emerge en auditoria/checklist |
| Prompt leakage de token Notion o PII | integrations/security | medium | Redactor obligatorio + tests + denylist de campos + no raw token in payload | Sentry/captureWithDomain `client_onboarding_ai_redaction_failure` |
| LLM outage bloquea alta | commercial | medium | Preflight deterministico, degraded honesto, submit nunca depende de IA | no signal — endpoint status degraded |
| Overexposure API sin capability granular | identity/access | low | Capability review en Plan Mode; route auth con `authorizeLifecycle` | entitlement parity tests |
| UI se vuelve ruidosa en un wizard de alto riesgo | ui | medium | AI panel compacto, severidad, CTA a step, GVC + enterprise review | GVC/manual review |

### Feature flags / cutover

- `CLIENT_ONBOARDING_AI_ENABLED=false` default.
- Si el costo/token budget requiere control separado, agregar `CLIENT_ONBOARDING_AI_PROVIDER_ENABLED=false` o equivalente durante Plan Mode.
- Revert: flag OFF + redeploy si aplica. La UI debe caer a preflight deterministico o ocultar IA sin romper submit.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR o flag OFF si ya mergeado | <5 min flag / PR revert | si |
| Slice 2 | Flag OFF; endpoint devuelve deterministic-only | <5 min | si |
| Slice 3 | Ocultar panel via flag; revert UI | <5 min flag / PR revert | si |
| Slice 4 | Ocultar boton sugerir fases via flag | <5 min | si |
| Slice 5 | Volver ordering deterministic de contactos | <5 min | si |
| Slice 6 | Desactivar quality checks IA; conservar deterministico | <5 min | si |
| Slice 7 | Docs revert no afecta runtime | N/A | si |

### Production verification sequence

1. Staging with flag OFF: wizard behavior bit-for-bit en submit.
2. Staging with flag ON: ejecutar GVC `client-onboarding-wizard-runtime` y scenario nuevo AI.
3. Probar manual path: HubSpot, Nubox y Manual.
4. Probar degraded: provider IA fallando debe dejar submit operativo.
5. Validar que payloads a IA no contienen token Notion ni secretos.
6. Validar API auth/capability y sanitized errors.
7. Produccion: flag OFF deploy, luego allowlist/flag ON para operador interno, monitoreo 7 dias.

### Out-of-band coordination required

- Confirmar provider/model y presupuesto token con plataforma antes de flag ON.
- Si se usa Vertex AI/Gemini desde Vercel, validar credenciales/WIF/Secret Manager; si no, usar runtime ya soportado por patrones existentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `POST /api/admin/clients/lifecycle/ai/preflight` existe, esta autenticado y nunca bloquea el submit por fallo IA.
- [ ] El paso Confirmar muestra AI Preflight con estados ready/degraded/disabled y CTAs a steps relacionados.
- [ ] El generador de fases produce sugerencias editables y no sobreescribe fases existentes sin confirmacion.
- [ ] Contactos financieros sugeridos pueden mostrar rol/confidence sin inventar personas ni emails.
- [ ] Notion/Teams quality check no envia tokens ni secretos a ningun prompt.
- [ ] Con `CLIENT_ONBOARDING_AI_ENABLED=false`, el wizard conserva comportamiento actual.
- [ ] GVC revisado para desktop/laptop/mobile y `pnpm design:lint` 0/0.

## Verification

- `pnpm task:lint --changed`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm vitest run src/lib/client-onboarding src/lib/client-lifecycle`
- `pnpm design:lint`
- `pnpm fe:capture client-onboarding-wizard-runtime --env=local` or scenario equivalente con AI states
- Validacion manual de redaction: payload IA sin `token`, `secret`, `ntn_`, raw credentials.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md` documenta el contrato IA advisory.
- [ ] Manual/documentacion funcional explica al operador que IA sugiere y el humano confirma.

## Follow-ups

- Posible child task para MCP/Nexa client lifecycle assistant si `TASK-1002` prioriza la lane.
- Posible persistence/audit table para sugerencias IA aceptadas si compliance/producto lo requiere despues de V1.

## Open Questions

- ¿Provider runtime preferido para esta feature: Vertex/Gemini via patrones existentes o OpenAI server-side?
- ¿Debe existir una capability granular `client.lifecycle.ai.assist`, o basta `client.lifecycle.case.read/open` en V1?
- ¿Se persistiran las sugerencias aceptadas como audit trail, o basta el delta en los commands canonicos?
