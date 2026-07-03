# TASK-1324 — AI Visibility report email link → 404 (repoint al hub público)

## Delta 2026-07-03 — DESBLOQUEADA por TASK-1325 (hub live)

El destino del repoint ya existe y está vivo: **`https://think.efeoncepro.com/brand-visibility/r/<token>`** responde 200 con token real (render enterprise, `noindex`, fetch server-side). TASK-1325 quedó **complete**. Esta task ya puede ejecutarse: fijar esa URL canónica como fuente única (correo + HubSpot `report_url`), repuntar `buildPublicReportUrl` vía env var dedicada, actualizar el ADR y opcionalmente agregar un redirect puente desde la ruta vieja `greenhouse.efeoncepro.com/grader/r/<token>` (404 hoy). Es el último paso para cerrar el loop del lead magnet (el correo llega con enlace roto hasta que esto se haga).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
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
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|integrations`
- Blocked by: `TASK-1325 (hub público live en think.efeoncepro.com — repo + proyecto Vercel + DNS)`
- Branch: `task/TASK-1324-ai-visibility-report-email-link-repoint-public-hub`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy **todo correo del AEO / AI Visibility Grader que se envía a un lead lleva un enlace roto**: el botón "Abrir informe seguro" y el "enlace seguro" apuntan a `https://greenhouse.efeoncepro.com/grader/r/<token>`, ruta que **no existe** en el portal → **404**. El token y el endpoint de datos funcionan; lo que falta es que el constructor del URL (`buildPublicReportUrl`) apunte al **render público real**, que por decisión de arquitectura (ADR 2026-06-28) **ya no vive en `greenhouse-eo`** sino en un hub público headless (`think.efeoncepro.com`). Esta task repunta el URL una sola vez a su forma final, una vez que ese hub esté vivo.

## Why This Task Exists

El render del informe público migró de este repo a un hub headless (`think.efeoncepro.com`, Astro), pero el helper que arma el link de los correos **nunca se re-apuntó** y sigue generando el path viejo `/grader/r/<token>` sobre el host del portal. Ese path fue eliminado/nunca construido en `greenhouse-eo`:

- No existe ningún `page.tsx` bajo `src/app/**/grader/**` (barrido completo del árbol de rutas: 0 resultados).
- Lo único que existe es el **endpoint de datos** `GET /api/public/growth/ai-visibility/report/[token]` ([route.ts](../../src/app/api/public/growth/ai-visibility/report/[token]/route.ts)), que devuelve JSON (el `ReportArtifactModel` + `header`, contrato de TASK-1280), **no** una página navegable.
- No hay `rewrites`/`redirects` en [next.config.ts](../../next.config.ts) ni middleware que mapeen `/grader/r/*`.

Resultado: el lead recibe el correo, hace clic y cae en un 404 del portal. Es un enlace muerto en cada entrega, con impacto directo en la experiencia y credibilidad del lead magnet (EPIC-020) que ya está live en producción.

La causa raíz es un **contrato de URL desactualizado tras una decisión de arquitectura**, no un bug de lógica:

- La premisa original (**TASK-1241**: "página pública Next.js en greenhouse-eo, path `/grader/r/...`") quedó **SUPERSEDED** por el ADR [`GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`](../../docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md) (Accepted 2026-06-28): el form + landing + render del informe viven en un hub público (Astro), consumiendo a Greenhouse **headless**.
- Greenhouse quedó como backend: sólo el endpoint API (TASK-1280) + el helper que arma el URL. El helper es lo que quedó apuntando al lugar equivocado.

El propio código lo avisa en [report-link.ts:11](../../src/lib/growth/ai-visibility/hubspot/report-link.ts#L11): *"El path público lo posee TASK-1241; acá se construye con la base del portal — contrato a alinear con esa task."* Ese alineamiento nunca ocurrió.

**Decisión de infra vigente (operador, 2026-07-03):** el hub público se levanta en un **repo + proyecto Vercel nuevos y dedicados** (hub de lead magnets), **NO** en `efeonce-web` (que es la migración eventual del sitio raíz). Es una separación intencional y temporal: **se converge dentro de `efeonce-web` más adelante**. Por eso la URL pública debe fijarse **ya en su forma final** (host + path definitivos) para que el merge futuro NO obligue a re-apuntar el helper otra vez ni rompa links ya enviados.

## Goal

- Que el enlace de los correos del AEO Grader (botón + enlace de respaldo) abra el informe real, no un 404.
- Que el `report_url` que Greenhouse escribe en HubSpot (mismo helper) apunte también al informe real.
- Repuntar `buildPublicReportUrl` a la **URL canónica final** del hub público (host + path definitivos), configurable por env var — **una sola vez**, estable ante el futuro merge en `efeonce-web`.
- Dejar registrado el contrato de URL público como decisión, superseando la parte de TASK-1241/ADR que decía `greenhouse.efeoncepro.com/grader/r/...`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` — ADR que movió el render público a headless. **Actualizar/supersede la parte que nombra host/path** (define hoy `think.efeoncepro.com/ai-visibility/[publicId]` "u otra convención"; fijar el definitivo).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — arquitectura del grader público (EPIC-020/021).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el informe público se sirve como contrato headless (el modelo es el contrato; el hub es un consumer).

Reglas obligatorias:

- **NUNCA** re-crear una página `/grader/r/[token]` en `greenhouse-eo`: el ADR decidió headless; el portal no renderiza el informe público. Si se quiere un puente, es un `redirect`, no una página que duplique el render.
- La URL pública se resuelve por **env var** con un default seguro; no hardcodear el host del hub en el código.
- El helper `buildPublicReportUrl` es **fuente única** del URL público: lo consumen el correo **y** el handoff HubSpot. Un cambio, ambos consumers alineados.
- Fijar la URL **final** ahora (no un host provisional del repo nuevo): el hub se plegará en `efeonce-web` después y la URL debe sobrevivir ese merge sin re-apuntar (evita el mismo bug de nuevo y no rompe links ya enviados).

## Normative Docs

- `docs/tasks/complete/TASK-1280-growth-ai-visibility-public-report-model-contract.md` — contrato headless que el hub consume (`model` + `modelVersion` + `header`). Ya implementado.
- `docs/tasks/complete/TASK-1241-growth-ai-visibility-public-lead-magnet-page.md` — task superseded; sus Deltas (report artifact, poll contract, Turnstile keys) son referencia para el hub.

## Dependencies & Impact

### Depends on

- **[externo, bloqueante]** Hub público live y sirviendo el informe por token en `think.efeoncepro.com` (repo + proyecto Vercel nuevos + DNS del subdominio). Sin la página viva, no hay a dónde apuntar. La ruta final del informe dentro del hub (`/ai-visibility/[handle]` u otra) debe quedar **acordada** antes de repuntar.
- `GET /api/public/growth/ai-visibility/report/[token]` — [route.ts](../../src/app/api/public/growth/ai-visibility/report/[token]/route.ts) (TASK-1280, ya existe; el hub lo consume server-side).
- `buildPublicReportUrl` / `getLatestReportTokenForRun` — [report-link.ts](../../src/lib/growth/ai-visibility/hubspot/report-link.ts).

### Blocks / Impacts

- Entrega de correos `ai_visibility_grader_report` — [dispatch-report-email.ts:134](../../src/lib/growth/ai-visibility/public-delivery/email/dispatch-report-email.ts#L134).
- Handoff a HubSpot (`report_url` de la company) — [execute.ts:81](../../src/lib/growth/ai-visibility/hubspot/execute.ts#L81).
- TASK-1321 (AEO `/aeo-2/` submit auto-runs grader + emails report): al activar ese loop self-serve, esta corrección es **prerequisito de calidad** — sin ella el loop entrega links muertos a leads reales.

### Files owned

- `src/lib/growth/ai-visibility/hubspot/report-link.ts` (repoint del constructor de URL)
- `src/lib/growth/ai-visibility/hubspot/__tests__/*` y `src/lib/growth/ai-visibility/public-delivery/email/__tests__/dispatch-report-email.test.ts` (actualizar expectativas de URL)
- `src/emails/AiVisibilityGraderReportEmail.tsx` / `src/emails/AiVisibilityGraderReportEmail.test.tsx` / `src/lib/email/templates.ts` (defaults de preview del URL — cosmético, alinear con el nuevo host)
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` (fijar host/path final)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (si se introduce env var nueva del host)

## Current Repo State

### Already exists

- Endpoint headless del informe por token (TASK-1280) — devuelve `model` + `header`, no-leak por construcción de tipo.
- `buildPublicReportUrl(reportToken)` — arma `${NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/grader/r/<token>` ([report-link.ts:31-34](../../src/lib/growth/ai-visibility/hubspot/report-link.ts#L31-L34)).
- Correo `ai_visibility_grader_report` + PDF adjunto, ya enviándose en producción (evidencia: correo real recibido 2026-07-03).
- ADR de render headless (2026-06-28) con la decisión de subdominio Vercel.

### Gap

- **No existe página** que sirva `/grader/r/<token>` (ni en el portal, ni —confirmar— en el hub con ESE path). El helper apunta a un host+path muerto.
- El **host/path final** del informe en el hub no está fijado en el ADR (`/ai-visibility/[publicId]` "u otra convención" — abierto).
- No hay env var dedicada para el host del hub público; hoy cae al default del portal.
- El ADR aún nombra `greenhouse.efeoncepro.com/grader/r/...` como premisa histórica (TASK-1241) — desactualizado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `buildPublicReportUrl` (helper) → consumido por correo + HubSpot handoff
- Consumidores afectados: `correo ai_visibility_grader_report`, `HubSpot company.report_url`, `hub público (think.efeoncepro.com) como destino del link`
- Runtime target: `production` (email delivery) + `external` (hub + DNS)

### Contract surface

- Contrato existente a respetar: [report-link.ts](../../src/lib/growth/ai-visibility/hubspot/report-link.ts) (helper único), `GET /api/public/growth/ai-visibility/report/[token]` (TASK-1280), `ai_visibility_grader_report` email template.
- Contrato nuevo o modificado: `buildPublicReportUrl` cambia el host+path que retorna; opcional env var nueva `PUBLIC_GRADER_HUB_URL` (o equivalente) para el host del hub.
- Backward compatibility: `compatible` — misma firma `(reportToken) => string`; sólo cambia el valor. Los links ya enviados con el path viejo quedan muertos igual (considerar redirect puente, Slice opcional).
- Full API parity: el informe público sigue siendo el contrato headless (TASK-1280); el hub es un consumer del modelo. Esta task NO agrega capability nueva — sólo corrige el URL de un artefacto de entrega. `N/A — no capability` (no toca estado/permisos/aprobaciones).

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (sólo construcción de string de URL). `greenhouse_growth.grader_reports.report_token` se lee vía `getLatestReportTokenForRun` (sin cambio).
- Invariantes que no se pueden romper:
  - El `report_token` (256 bits, no enumerable) sigue siendo la autenticación del informe — el cambio de host no lo expone más.
  - Un cambio de host/path debe ser **estable ante el merge futuro en `efeonce-web`** (fijar la forma final, no un host provisional).
  - Fuente única: no duplicar la lógica de armado de URL en el correo o en HubSpot; sale sólo del helper.
- Tenant/space boundary: N/A — informe público por token, sin sesión.
- Idempotency/concurrency: N/A — función pura de construcción de URL.
- Audit/outbox/history: N/A.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `enabled with rationale` — el fix es aditivo/correctivo; una vez el hub esté vivo, se repunta y se despliega. Si se agrega env var, default = URL canónica del hub.
- Backfill plan: N/A. (Opcional: evaluar si vale un redirect puente para links ya enviados — ver Slice 3.)
- Rollback path: `revert PR + redeploy` (Vercel, <5 min). Si se usa env var, revert = restaurar valor previo.
- External coordination: **sí** — el hub (repo + proyecto Vercel + DNS `think.efeoncepro.com`) debe estar live antes de repuntar; si se agrega env var, `vercel env add` en los targets relevantes + redeploy.

### Security and access

- Auth/access gate: N/A (informe público por token; el hub aplica su propio rate-limit/no-index).
- Sensitive data posture: `no sensitive data` en el URL (sólo el token no enumerable, ya público por diseño).
- Error contract: N/A (no route handler nuevo). Si se agrega redirect puente, usar patrón canónico de redirect, no exponer prosa cruda.
- Abuse/rate-limit posture: sin cambio — la protección vive en el endpoint headless (rate-limit por IP, TASK-1245/1280) y en el hub.

### Runtime evidence

- Local checks: `pnpm test` sobre `report-link` + `dispatch-report-email` + `execute` (actualizar expectativas de URL); `pnpm lint`; `pnpm tsc`.
- DB/runtime checks: N/A (no DB change).
- Integration checks: enviar un correo de prueba (o inspeccionar el render del template con un token real) y confirmar que el link resuelve a un informe vivo en el hub (200, informe correcto). Verificar el `report_url` escrito en HubSpot apunta al mismo destino.
- Reliability signals/logs: N/A (no signal nuevo). Emerge en logs de email + navegación real.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth (helper `buildPublicReportUrl`), contract surface (correo + HubSpot) y consumers nombrados con paths reales.
- [ ] Host/path final del hub fijado y documentado (ADR actualizado); env var declarada si aplica.
- [ ] Rollback = revert PR + redeploy, explícito.
- [ ] Evidencia runtime: link de un correo real resuelve a informe vivo (no 404).
- [ ] Sin leaks: el URL sólo lleva el token no enumerable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Fijar la URL pública canónica (decisión + doc)

- Acordar y documentar el **host + path final** del informe en el hub (p.ej. `https://think.efeoncepro.com/ai-visibility/<handle>`), incluyendo **qué llave** va en el path (`reportToken` vs `publicId`) y que el hub la resuelve contra el endpoint headless de TASK-1280.
- Actualizar/supersede en el ADR [`GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`](../../docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md) la premisa vieja (`greenhouse.efeoncepro.com/grader/r/...`), dejando explícito que es hub dedicado que converge en `efeonce-web` después y que la URL es estable ante ese merge.

### Slice 2 — Repoint del helper `buildPublicReportUrl`

- Cambiar `PUBLIC_REPORT_PATH_PREFIX` + base en [report-link.ts](../../src/lib/growth/ai-visibility/hubspot/report-link.ts) para producir la URL final acordada.
- Resolver el host por **env var dedicada** (p.ej. `PUBLIC_GRADER_HUB_URL`) con default = URL canónica del hub; no reusar `NEXT_PUBLIC_APP_URL` (que es el portal). Si se introduce env var `*_ENABLED`/config, registrarla en `FEATURE_FLAG_STATE_LEDGER.md`.
- Actualizar tests que asertan el URL viejo (`report-link` tests, `dispatch-report-email.test.ts`, `property-mapper.test.ts`, `execute.test.ts`, `hubspot-cross-sell-mapper.test.ts`) + defaults cosméticos de preview en `AiVisibilityGraderReportEmail.tsx` / `templates.ts`.

### Slice 3 — (Opcional) Redirect puente para links ya enviados

- Evaluar si los correos ya enviados con `/grader/r/<token>` justifican un `redirect` 301/302 en Greenhouse (`/grader/r/[token]` → URL del hub) o en el hub. Decisión de producto: cuántos links vivos hay y si vale mantenerlos. Si se descarta, dejarlo documentado como decisión, no como olvido.

## Out of Scope

- **NO** construir el hub público, su render, su form, su landing ni su DNS — eso vive en el repo/proyecto Vercel nuevo (externo a este workspace).
- **NO** re-crear una página de render del informe en `greenhouse-eo` (viola el ADR headless).
- **NO** tocar el scoring, el modelo, el endpoint headless (TASK-1280) ni el pipeline del grader.
- **NO** conectar el submit de `/aeo-2/` al pipeline (eso es TASK-1321).

## Detailed Spec

El único cambio de código en `greenhouse-eo` es el helper:

URL final acordada (TASK-1325): **`https://think.efeoncepro.com/brand-visibility/r/<token>`** (repo `efeoncepro/efeonce-think`, llave del path = `report_token`).

```ts
// src/lib/growth/ai-visibility/hubspot/report-link.ts  (forma objetivo)
const PUBLIC_REPORT_PATH_PREFIX = '/brand-visibility/r' // ← path final del hub (TASK-1325)

export const buildPublicReportUrl = (reportToken: string): string => {
  const base = (process.env.PUBLIC_GRADER_HUB_URL?.trim() || 'https://think.efeoncepro.com').replace(/\/+$/, '')
  return `${base}${PUBLIC_REPORT_PATH_PREFIX}/${reportToken}`
}
```

Todo lo demás (correo, HubSpot handoff) hereda el cambio por ser el helper la fuente única. La única pieza no-código es la **coordinación externa**: que la página del hub resuelva ese path por token contra el endpoint de TASK-1280.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (fijar URL final) → Slice 2 (repoint).** Repuntar antes de acordar host/path final arriesga re-apuntar dos veces y romper links (el bug que se está corrigiendo).
- **Blocker externo antes de Slice 2:** el hub debe estar live sirviendo el token, o el repoint sólo cambia un 404 por otro. Verificar con un fetch real al hub antes de desplegar.
- Slice 3 (redirect puente) es independiente y opcional; puede correr después.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se repunta antes de que el hub esté vivo → sigue 404 | growth / email | medium | Gate manual: fetch real al hub (200 + informe correcto) antes de desplegar Slice 2 | Navegación real / reportes de leads |
| Se elige un host provisional del repo nuevo y hay que re-apuntar al converger en efeonce-web | growth / integration | medium | Fijar URL **final** en Slice 1 (subdominio estable que sobrevive el merge) | — |
| Links ya enviados quedan muertos | growth / email | high (ya ocurre) | Slice 3 (redirect puente) o aceptar y documentar | Reportes de leads |
| HubSpot `report_url` desincronizado del correo | integration / HubSpot | low | Fuente única (helper); ambos consumers heredan | Inspección de la company en HubSpot |

### Feature flags / cutover

- Sin flag `*_ENABLED` de comportamiento — el cambio es correctivo. El control gradual es la **env var del host** (`PUBLIC_GRADER_HUB_URL`): apunta a staging del hub primero, luego a producción. Revert = restaurar valor + redeploy (<5 min via Vercel).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (doc/ADR) | revert commit del doc | <5 min | sí |
| Slice 2 (repoint) | revert PR + redeploy, o restaurar env var previa | <5 min | sí |
| Slice 3 (redirect) | remover redirect + redeploy | <5 min | sí |

### Production verification sequence

1. Confirmar hub live: `curl -sI https://think.efeoncepro.com/<path-final>/<token-real>` → 200 y el informe correcto (no 404, no 500).
2. Deploy Slice 2 a staging (env var → staging del hub) + render del template con token real → link resuelve al informe.
3. Deploy a producción (env var → hub prod) + enviar un correo de prueba a una casilla propia → clic → informe vivo.
4. Verificar el `report_url` de la company en HubSpot apunta al mismo destino.
5. (Slice 3) Si aplica, probar que `/grader/r/<token-viejo>` redirige al hub.

### Out-of-band coordination required

- **Sí.** Depende de infra externa: repo + proyecto Vercel del hub, DNS de `think.efeoncepro.com`, y que la página resuelva el path por token contra TASK-1280. Coordinar host/path final con quien levante el hub **antes** de repuntar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El enlace del correo `ai_visibility_grader_report` (botón + enlace de respaldo) abre el informe real, no un 404.
- [ ] El `report_url` escrito en HubSpot apunta al mismo informe real.
- [ ] `buildPublicReportUrl` retorna la URL canónica final del hub, resuelta por env var con default seguro.
- [ ] El host/path final quedó documentado y el ADR de render headless quedó actualizado/superseded en su premisa vieja.
- [ ] La URL elegida es estable ante el futuro merge del hub en `efeonce-web` (no exige re-apuntar el helper otra vez).
- [ ] Si se introdujo env var, quedó registrada en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Tests de `report-link` / `dispatch-report-email` / `execute` / mappers actualizados y verdes.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (focal: `report-link`, `dispatch-report-email`, `execute`, mappers HubSpot)
- Validación manual: correo de prueba → clic → informe vivo; inspección del `report_url` en HubSpot.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/`, `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con lo aplicado/verificado y el estado del blocker externo
- [ ] `changelog.md` actualizado (cambia el destino del link de un correo productivo)
- [ ] chequeo de impacto cruzado sobre TASK-1321 (loop self-serve) y TASK-1241 (superseded)
- [ ] ADR `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` actualizado con host/path final

## Follow-ups

- TASK-1321 (AEO `/aeo-2/` auto-run + email report): esta corrección es prerequisito de calidad para no entregar links muertos a leads reales cuando ese loop se active.
- Convergencia del hub dentro de `efeonce-web`: al plegarlo, verificar que la URL pública se conserva (mismo subdominio/path) para no re-apuntar ni romper links.
- Evaluar un test/gate que falle si `buildPublicReportUrl` vuelve a apuntar al host del portal (`greenhouse.efeoncepro.com`) — anti-regresión del bug class.

## Open Questions

- ~~Host + path final del hub~~ **RESUELTO (2026-07-03):** `https://think.efeoncepro.com/brand-visibility/r/<token>`, llave = `report_token` (TASK-1325).
- **Redirect puente (Slice 3):** ¿cuántos links vivos ya enviados justifican mantenerlos con un 301, o se acepta que mueran?
- **Timing:** esta task espera a que TASK-1325 deje la URL final viva (repo + Vercel + DNS + render).
