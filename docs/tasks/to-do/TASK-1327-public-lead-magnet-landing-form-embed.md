# TASK-1327 — Public lead-magnet landing + embed del form gobernado (think.efeoncepro.com/brand-visibility)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|forms`
- Blocked by: `TASK-1325 (hub live) + verificar render contract del grader form`
- Branch: `task/TASK-1327-public-lead-magnet-landing-form-embed`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la **Superficie B** del hub: la **landing pública `think.efeoncepro.com/brand-visibility`** donde un usuario nuevo deja sus datos para pedir su informe de visibilidad en IA. **El form NO es nuevo:** ya existe gobernado (`fdef-ai-visibility-grader`, formKey `69cd5269-5f97-4d32-99c4-0b23f41aa2f5`); la landing lo **embebe** con `<greenhouse-form>` (renderer portable), heredando validación, consent, Turnstile, telemetry y el path submission→outbox→pipeline. Cierra el loop self-serve: `landing → form → grader async → email con enlace → render del informe (Superficie A, TASK-1325)`.

> ⚠️ **Ejecución mayormente EXTERNA a `greenhouse-eo`** (repo `efeoncepro/efeonce-think`, Astro). En `greenhouse-eo` el único aporte posible es **verificar/publicar el render contract** del grader form para el renderer portable (si no está). Por eso `Execution profile: standard`, `UI impact: none`, `Backend impact: none`.

## Why This Task Exists

Hoy **no existe ninguna superficie pública donde llenar el grader self-serve** (verificado TASK-1246): el form del grader es un form gobernado del motor Growth Forms, pero no está embebido en ningún lado (no confundir con `/aeo-2/`, que es el form comercial `fdef-efeonce-aeo-diagnostic`, otro flujo). El ADR [`GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`](../../docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md) (Delta 2026-07-03) resolvió que la landing vive en el hub `efeonce-think` y **embebe el form gobernado** (no reconstruye) — el mismo web component `<greenhouse-form>` que `/aeo-2/` usa live en WordPress (TASK-1298). Sin esta landing, el lead magnet no tiene puerta de entrada self-serve.

## Goal

- Landing `think.efeoncepro.com/brand-visibility` (indexable) que presenta la herramienta y embebe el form gobernado del grader.
- El form se renderiza vía `<greenhouse-form form-key="69cd5269…">` (renderer portable) — cero lógica de form nueva.
- El submit corre el grader por el path gobernado (submission→outbox→pipeline); el usuario recibe el informe por email con enlace al render (Superficie A).
- Pantalla de estado/poll honesta mientras el grader corre (contrato TASK-1245), si el flujo lo requiere.
- Consistente con la Superficie A (misma marca AXIS del hub, misma URL base).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` (Delta 2026-07-03) — decisión del hub + 2 superficies + embed del form gobernado.
- `docs/architecture/growth-public-forms-runtime-contract.md` — contrato del renderer portable `<greenhouse-form>` + formKey.
- `docs/documentation/growth/motor-formularios-publicos.md` — motor Growth Forms.

Reglas obligatorias:

- **El form NO se reconstruye:** se embebe el gobernado (`fdef-ai-visibility-grader`, formKey `69cd5269…`) con `<greenhouse-form>`. Cero validación/consent/captcha propios.
- **NO confundir** con `/aeo-2/` (`fdef-efeonce-aeo-diagnostic`, form comercial → HubSpot, otro flujo que TASK-1321 puentea aparte).
- **Consent Ley 21.719** heredado del form gobernado (no reimplementar).
- **NO** meter MUI/AXIS-React al sitio público (Tailwind + tokens copiados, como Superficie A).

## Normative Docs

- `greenhouse.repo.json` de `efeonce-think` (surfaces) — registrar la nueva surface.
- TASK-1298 (AEO WordPress greenhouse-form migration) — precedente live del embed `<greenhouse-form>`.
- TASK-1231/1232 (renderer portable Growth Forms) — el mecanismo de embed.

## Dependencies & Impact

### Depends on

- **TASK-1325** — hub `efeonce-think` vivo (Superficie A + shell + marca). Esta landing es la segunda surface del mismo hub.
- **Render contract del grader form** publicado para el renderer portable: `fdef-ai-visibility-grader` tiene versión de submission (v2, resuelta por slug), pero **verificar en Discovery** que expone el render contract que `<greenhouse-form>` necesita para dibujar los campos. Si no, publicar la versión de render (Growth Forms).
- `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` (flag, TASK-1251) — el path convergente del intake del grader sobre el motor.
- Contrato de poll `GET /api/public/growth/ai-visibility/run/[handle]` (TASK-1245).

### Blocks / Impacts

- Cierra el loop self-serve de EPIC-020 (adquisición).
- Se relaciona con TASK-1321 (`/aeo-2/` auto-run): ambos alimentan el mismo pipeline del grader por caminos distintos (WordPress comercial vs hub self-serve). NO duplicar el pipeline.

### Files owned

- **[repo externo `efeonce-think`]** `src/pages/brand-visibility/index.astro` (landing) + estado/poll + embed `<greenhouse-form>` + assets.
- `greenhouse.repo.json` de `efeonce-think` (agregar la surface `/brand-visibility`).
- **[greenhouse-eo, condicional]** publicar/verificar el render contract del grader form si Discovery lo requiere.

## Current Repo State

### Already exists

- Form gobernado del grader (`fdef-ai-visibility-grader`, formKey `69cd5269…`, surface `fhsf-ai-visibility-grader`, consent policy v1, versión v2).
- Renderer portable `<greenhouse-form>` + embed live en `/aeo-2/` (TASK-1298).
- Fachada de intake convergente (`createPublicGraderRunViaFormsEngine`, TASK-1251) + poll (TASK-1245).
- Hub `efeonce-think` con Superficie A (TASK-1325).

### Gap

- No existe la landing `/brand-visibility` ni el embed del form en el hub.
- Verificar si el grader form tiene render contract publicado para el renderer portable (hoy su versión es anchor de submission).
- Site key Turnstile / config del embed en el hub.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Verificar/publicar el render contract del grader form

- Confirmar (Discovery) que `fdef-ai-visibility-grader` expone el render contract que `<greenhouse-form>` necesita. Si no, publicar la versión de render (Growth Forms) — sin tocar el submission path.

### Slice 2 — Landing `/brand-visibility` + embed del form

- Page Astro `brand-visibility/index.astro`: hero + propuesta de valor + embed `<greenhouse-form form-key="69cd5269…">`.
- Marca AXIS del hub (tokens copiados, Superficie A), Tailwind, indexable.

### Slice 3 — Estado/poll + cierre del loop

- Tras submit: pantalla de estado honesta (queued/processing/ready) consumiendo el poll (TASK-1245) si el flujo lo requiere, o confirmación "te llega por email" event-driven.
- Verificar end-to-end: submit real → grader corre → email → enlace → render (Superficie A).

## Out of Scope

- **NO** reconstruir el form (se embebe el gobernado).
- **NO** el render del informe (Superficie A, TASK-1325).
- **NO** el pipeline del grader ni el scoring (ya existe).
- **NO** el flujo comercial `/aeo-2/` (TASK-1321).

## Detailed Spec

Embed canónico (mirror `/aeo-2/`, TASK-1298):

```html
<greenhouse-form
  form-key="69cd5269-5f97-4d32-99c4-0b23f41aa2f5"
  surface="fhsf-ai-visibility-grader"
  locale="es-CL"
  color-scheme="light"
  appearance="bare"
></greenhouse-form>
```

El script del renderer + la resolución del render contract vienen de greenhouse-eo (mismo mecanismo que WordPress). Confirmar el origin del script y CORS del contrato de render para el host `think.efeoncepro.com`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (render contract) → Slice 2 (embed) → Slice 3 (loop).** Sin render contract publicado, el `<greenhouse-form>` no dibuja.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El grader form no tiene render contract publicado | growth / forms | medium | Slice 1 lo verifica/publica antes del embed | `<greenhouse-form>` vacío |
| CORS del script/contrato de render bloquea `think.efeoncepro.com` | growth / public-site | medium | Confirmar allowlist del origin (como `/aeo-2/`) | consola del browser |
| Dos intakes (hub + `/aeo-2/`) divergen | growth | low | Ambos usan el pipeline gobernado; no duplicar lógica | conteos de runs |

### Feature flags / cutover

- El intake convergente ya está detrás de `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` (TASK-1251). Confirmar su estado antes del launch. Revert = despublicar la landing.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | no publicar / revert versión de render | <10 min | sí |
| Slice 2 | despublicar la ruta en el repo del hub | <5 min | sí |
| Slice 3 | quitar el poll / volver a confirmación event-driven | <5 min | sí |

### Production verification sequence

1. Slice 1: render contract del grader form resuelve para `<greenhouse-form>`.
2. Slice 2: la landing renderiza el form embebido en `think.efeoncepro.com/brand-visibility`.
3. Slice 3: submit real → run encolado → email con enlace → render del informe (Superficie A) correcto.

### Out-of-band coordination required

- Config del embed en el hub (script origin + CORS del render contract para `think.efeoncepro.com`). Turnstile site key (ya provisionada, TASK-1241 Delta).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `think.efeoncepro.com/brand-visibility` (indexable) con el form del grader embebido vía `<greenhouse-form>`.
- [ ] El form es el gobernado (`fdef-ai-visibility-grader`, formKey `69cd5269…`) — cero lógica de form nueva.
- [ ] Un submit real corre el grader por el path gobernado y termina en email con enlace al render (Superficie A).
- [ ] Consent/Turnstile/telemetry heredados del form gobernado (no reimplementados).
- [ ] La landing usa la misma marca/URL base del hub (consistente con Superficie A).

## Verification

- Verificación runtime en el repo `efeonce-think` (su build/deploy Vercel).
- Submit end-to-end real → run → email → enlace → informe.
- En greenhouse-eo: solo (condicional) la publicación/verificación del render contract del grader form.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento observable
- [ ] chequeo de impacto cruzado sobre TASK-1325 (hub), TASK-1321 (intake `/aeo-2/`), TASK-1251 (convergencia)
- [ ] `greenhouse.repo.json` de `efeonce-think` con la surface `/brand-visibility`

## Follow-ups

- Medición GTM del loop (landing → submit → informe).
- Convergencia del hub en `efeonce-web` (conservar rutas).

## Open Questions

- **¿El grader form ya tiene render contract publicado** para el renderer portable, o hay que publicarlo? (Slice 1.)
- **¿Poll en pantalla vs confirmación event-driven** ("te llega por email")? Depende de la latencia del grader y de la decisión de UX.
- **¿El intake self-serve del hub reemplaza o coexiste** con el path `/aeo-2/` (TASK-1321)? Coexisten hoy; alinear estrategia comercial.
