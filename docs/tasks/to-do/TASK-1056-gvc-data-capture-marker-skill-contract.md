# TASK-1056 — GVC data-capture marker skill contract

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
- Type: `policy`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|quality|agents`
- Blocked by: `none`
- Branch: `task/TASK-1056-gvc-data-capture-marker-skill-contract`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Formalizar en las skills y docs de UI/GVC la regla operativa de markers estables `data-capture` para nuevas superficies UI, estados capturables y flujos repetibles. El objetivo es que GVC pueda scrollear, recortar y validar secciones sin depender de offsets, texto visible, `nth-child` o estructura interna frágil.

## Why This Task Exists

Durante la revisión del bento `Nexa Insights` del Home se agregó `data-capture="home-nexa-insights-bento"` para que GVC pudiera capturar exactamente esa sección en desktop/mobile. La regla ya existe parcialmente en `GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1`, pero no está suficientemente presente en las skills que guían la construcción UI diaria. Sin esa regla en skills, cada agente puede olvidar los markers y crear scenarios frágiles.

## Goal

- Actualizar las skills UI relevantes (Codex y Claude cuando aplique) para exigir `data-capture` estable en wrappers capturables.
- Documentar el criterio de proporcionalidad: markers para secciones, states y flows verificables; no para cada nodo pequeño por reflejo.
- Alinear ejemplos de GVC/scenario para usar `scroll selector` + `clipSelector` contra `[data-capture="..."]`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`

Reglas obligatorias:

- `data-capture` debe ser estable, kebab-case, semántico y no derivar de copy cambiante.
- Los markers deben vivir en el wrapper de la sección/surface/state que GVC necesita capturar, no en nodos decorativos.
- Si una UI nueva tiene scenario GVC repetible, el scenario debe preferir `[data-capture="..."]` para `readiness.selector`, `scroll.selector`, `clipSelector` o `requiredRegions`.

## Normative Docs

- `scripts/frontend/scenarios/_README.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `docs/documentation/plataforma/captura-visual.md`

## Dependencies & Impact

### Depends on

- GVC V1.5 ya implementado por `TASK-1018`.
- Convención de scroll/clip por selector ya aceptada en `GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1`.

### Blocks / Impacts

- Mejora la calidad de futuras tasks UI que requieren GVC desktop/mobile.
- Reduce fragilidad en scenarios nuevos bajo `scripts/frontend/scenarios/`.
- Puede alimentar un follow-up mecánico para lint/review de escenarios sin markers.

### Files owned

- `.codex/skills/**/SKILL.md`
- `.claude/skills/**/SKILL.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `scripts/frontend/scenarios/_README.md`
- `AGENTS.md` / `CLAUDE.md` solo si la regla se promueve a standing rule cross-agent

## Current Repo State

### Already exists

- `GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1` ya recomienda `data-capture` para secciones repetidamente capturables.
- `scripts/frontend/scenarios/_README.md` ya muestra `clipSelector: '[data-capture="timeline"]'`.
- Skills Codex de UI ya contienen bloque GVC V1.5; la sesión de creación de esta task sembró la regla `data-capture` en las skills Codex principales para mejorar el comportamiento inmediato.
- Ejemplo runtime reciente: `src/views/greenhouse/home/v2/HomeAiInsightsBento.tsx` + scenario `scripts/frontend/scenarios/home-nexa-insights-bento.scenario.ts`.

### Gap

- Falta cerrar paridad Claude y docs vivas GVC/UI delivery para que el contrato sea cross-agent.
- Falta asegurar paridad Codex/Claude para skills UI equivalentes.

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

### Slice 1 — Skill contract update

- Actualizar skills Codex UI/GVC relevantes para incluir la regla `data-capture`:
  - `greenhouse-product-ui-architect`
  - `greenhouse-portal-ui-implementer`
  - `greenhouse-vuexy-ui-expert`
  - `greenhouse-ui-orchestrator`
  - `greenhouse-mockup-builder`
  - `greenhouse-ui-enterprise-review`
- Actualizar skills Claude equivalentes cuando existan, manteniendo paridad semántica.
- Incluir ejemplos concretos:
  - wrapper: `data-capture="home-nexa-insights-bento"`
  - scenario: `scroll selector` + `mark clipSelector`.

### Slice 2 — Docs alignment

- Reforzar en `GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1`, `GREENHOUSE_UI_DELIVERY_LOOP_V1` y `scripts/frontend/scenarios/_README.md` el criterio:
  - agregar marker a secciones principales, panels/cards revisables, estados importantes y flows repetibles;
  - evitar marker spam en cada botón/div;
  - preferir `data-capture` sobre copy visible o selectors posicionales.
- Actualizar `AGENTS.md` / `CLAUDE.md` solo si se decide promoverlo a regla cross-agent explícita.

### Slice 3 — Optional mechanical guardrail

- Evaluar un check liviano, warning-first, para scenarios nuevos:
  - si un scenario usa `clipSelector`/`scroll.selector` posicional o texto frágil, sugerir `data-capture`;
  - no bloquear legacy sin baseline.
- Si se implementa, documentar cómo promover warning→error.

## Out of Scope

- No agregar `data-capture` retroactivamente a todo el portal.
- No crear un lint rule que bloquee todo JSX visible sin marker.
- No reemplazar GVC ni cambiar el DSL base.
- No cambiar diseño visual ni behavior de superficies existentes salvo markers no visibles.

## Detailed Spec

### Marker naming

- Usar kebab-case: `home-nexa-insights-bento`, `workforce-contracting-studio`, `confirmar-finanzas`.
- Nombre semántico por surface/state, no por layout transitorio (`left-card-2`) ni por copy visible.
- Evitar IDs de datos reales o PII en el valor.

### Marker placement

- Wrapper de sección o state completo:
  - `<Card component="section" data-capture="home-nexa-insights-bento">`
  - `<Stack data-capture="notion-connect-panel">`
- Para flows, marcar tanto el shell como los states importantes:
  - `data-capture="client-onboarding-wizard"`
  - `data-capture="notion-picker-degraded"`

### GVC usage

```ts
{
  kind: 'scroll',
  selector: '[data-capture="home-nexa-insights-bento"]',
  scrollBlock: 'center'
},
{
  kind: 'mark',
  label: 'nexa-insights-bento',
  clipSelector: '[data-capture="home-nexa-insights-bento"]'
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (skills) puede ejecutarse antes de Slice 2 para mejorar comportamiento inmediato de agentes.
- Slice 2 debe cerrar la paridad documental.
- Slice 3 es opcional y debe ir warning-first después de que el contrato humano esté claro.

### Risk matrix

| Riesgo                                    | Sistema | Probabilidad | Mitigation                                  | Signal de alerta           |
| ----------------------------------------- | ------- | ------------ | ------------------------------------------- | -------------------------- |
| Marker spam vuelve el JSX ruidoso         | UI      | medium       | Criterio de proporcionalidad en skills/docs | Review visual/código       |
| Agentes usan nombres inestables o con PII | UI/GVC  | low          | Naming rules + examples                     | Review de PR/task          |
| Guardrail mecánico bloquea legacy         | Quality | medium       | Warning-first + legacy tolerant             | `harness:lint`/lint output |

### Feature flags / cutover

Sin flag — cambio de contrato documental/skills. Cualquier guardrail mecánico futuro debe nacer warning-first.

### Rollback plan per slice

| Slice   | Rollback                                   | Tiempo  | Reversible? |
| ------- | ------------------------------------------ | ------- | ----------- |
| Slice 1 | Revertir cambios en skills                 | <10 min | si          |
| Slice 2 | Revertir cambios docs                      | <10 min | si          |
| Slice 3 | Deshabilitar warning/check o revertir rule | <15 min | si          |

### Production verification sequence

N/A — repo-only contract/docs/skills. Si se agrega guardrail mecánico, verificar local con fixtures/scenarios antes de activar en CI.

### Out-of-band coordination required

N/A — repo-only change. Si se actualizan skills Claude, coordinar paridad con `CLAUDE.md`/skills locales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Skills Codex UI/GVC relevantes incluyen la regla `data-capture` y el criterio de proporcionalidad.
- [ ] Skills Claude equivalentes quedan sincronizadas o se documenta por qué no aplican.
- [ ] Docs GVC/UI delivery explican marker placement, naming y uso con `clipSelector`.
- [x] Al menos un ejemplo de scenario usa `[data-capture="..."]` como selector estable.
- [ ] `pnpm ops:lint --changed` pasa para la task/docs.

## Verification

- `pnpm ops:lint --changed`
- `pnpm docs:closure-check --changed`
- `pnpm exec prettier --check .codex/skills .claude/skills docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md scripts/frontend/scenarios/_README.md`
- Revisión manual de paridad Codex/Claude para skills UI tocadas.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Si se agrego guardrail mecánico, quedó warning-first o con baseline documentado.

## Follow-ups

- Evaluar task separada para agregar markers a superficies UI existentes de alto valor GVC.
- Evaluar integración con `TASK-1055` Harness Coverage Matrix para clasificar `data-capture` como evidencia Tier UI.

## Delta 2026-06-08

Task creada a partir de la decisión operativa tomada durante la revisión del bento `Nexa Insights` del Home. La misma sesión sembró el contrato en las skills Codex UI/GVC y dejó la paridad Claude/docs como scope pendiente de la task.

## Open Questions

- ¿La regla debe promoverse a `AGENTS.md`/`CLAUDE.md` como hard rule cross-agent, o basta con skills + docs GVC?
- ¿El guardrail mecánico debe vivir en `pnpm harness:lint` de `TASK-1055` o como lint separado de scenarios?
