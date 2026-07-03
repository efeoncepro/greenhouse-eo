# TASK-1325 — Public lead-magnet hub: repo + Vercel + render del informe en think.efeoncepro.com

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
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
- Domain: `growth|platform|public-site`
- Blocked by: `none`
- Branch: `task/TASK-1325-public-lead-magnet-hub-repo-vercel-report-render`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Levantar el **hub público del lead magnet** en `think.efeoncepro.com`: un **repo de GitHub nuevo + proyecto Vercel dedicado** donde se despliega una app que **renderiza el informe del AI Visibility Grader** consumiendo el endpoint headless que ya existe (TASK-1280). Con el proyecto Vercel arriba se **configura el DNS** del subdominio. Este hub es el destino real del enlace de los correos: es el **unblocker de TASK-1324** (repoint del link, que hoy da 404). Decisión de infra (operador, 2026-07-03): repo/proyecto **dedicado** al hub de lead magnets, **NO** dentro de `efeonce-web`; se converge en `efeonce-web` más adelante.

> ⚠️ **La ejecución de esta task ocurre mayormente FUERA de `greenhouse-eo`** (repo nuevo, stack propio). En `greenhouse-eo` NO hay cambio de código: el endpoint que alimenta el render ya existe (TASK-1280). Por eso `Execution profile: standard`, `UI impact: none`, `Backend impact: none` — los contratos UI/UX y Backend/Data de `greenhouse-eo` NO gobiernan el stack externo (Astro + Tailwind, sin Vuexy/MUI, sin GVC del portal). La task se trackea acá por coordinación de EPIC-020.

## Why This Task Exists

El render del informe público migró de `greenhouse-eo` a un hub headless por el ADR [`GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`](../../docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md) (Accepted 2026-06-28). Greenhouse quedó como backend (sirve el modelo del informe por token, TASK-1280), pero **el hub que lo renderiza no está construido**:

- El subdominio `think.efeoncepro.com` no tiene app desplegada (DNS por conectar).
- El correo del grader ya sale a leads reales con un link que apunta a ese destino inexistente → hoy 404 (TASK-1324).

El ADR contemplaba montar el hub dentro de `efeonce-web` (la migración Astro del sitio raíz). El operador **actualizó esa decisión (2026-07-03)**: el hub va en un **repo + proyecto Vercel dedicado**, para lanzar el lead magnet sin amarrarlo a la migración completa del sitio (que es más lenta), con **convergencia planificada** dentro de `efeonce-web` después. Para que ese merge futuro sea barato y no rompa links ya enviados, el hub debe nacer con: **mismo stack (Astro)**, **marca compartida** (paquete compartido, no duplicada) y la **URL pública en su forma final** desde el día uno.

Sin este hub, TASK-1324 no puede completarse: re-apuntar el correo solo cambiaría un 404 por otro.

## Goal

- Repo de GitHub nuevo (org `efeoncepro`) + proyecto Vercel dedicado (scope `efeonce-7670142f`) para el hub de lead magnets.
- App desplegada que renderiza el informe del grader por token, consumiendo el endpoint headless de TASK-1280 (fetch server-side, sin CORS, token no expuesto al browser).
- DNS de `think.efeoncepro.com` apuntando al proyecto Vercel, con la URL final del informe fijada y estable.
- Base lista para que TASK-1324 repunte el enlace de los correos al destino real.
- Nacer preparado para converger en `efeonce-web` (stack + marca compartida) sin re-trabajo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` — ADR raíz del render headless. **Actualizar** para reflejar: hub en repo/proyecto dedicado (no `efeonce-web`), convergencia planificada, URL final.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — arquitectura del grader público.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el hub es un **consumer** del modelo (contrato headless); NO re-implementa scoring/derivación.

Reglas obligatorias (guardrails de `greenhouse-eo` que aplican a la coordinación):

- **Vercel scope discipline (ISSUE-076):** el proyecto nuevo se crea en el team `efeonce-7670142f`, **NUNCA** en un scope personal. Pasar `--scope efeonce-7670142f` explícito en todo `vercel` command del repo nuevo. NO tocar el `.vercel/project.json` de `greenhouse-eo` (es de `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`).
- **Cross-repo action safety:** el repo nuevo tiene auto-deploy propio; sus commits no afectan `greenhouse-eo`. No mezclar con el pipeline del portal.
- **Fetch server-side (ADR §Transporte):** el hub fetchea el modelo **server-side** (Astro SSR), el `reportToken` NO se expone al browser, sin CORS abierto.
- **No-leak:** el hub sólo recibe el modelo público (TASK-1280 es no-leak por construcción de tipo); NUNCA recibe evidencia cruda de providers.
- **El informe per-lead es `noindex`** (ADR §SEO). Indexables son las landings de herramientas, no el informe individual.
- **Un primitive, muchos consumers:** el hub renderiza el `ReportArtifactModel` que entrega el endpoint; NO re-deriva niveles/severidad/gaps (drift). Cambio de shape = bump de `modelVersion` coordinado.

## Normative Docs

- `docs/tasks/complete/TASK-1280-growth-ai-visibility-public-report-model-contract.md` — contrato que el hub consume (`model` + `modelVersion` + `header`). Ya implementado.
- `docs/tasks/complete/TASK-1241-growth-ai-visibility-public-lead-magnet-page.md` — task superseded; sus Deltas (report artifact, poll contract TASK-1245, Turnstile keys) son la **referencia de implementación** para el hub.
- `docs/tasks/to-do/TASK-1324-ai-visibility-report-email-link-repoint-public-hub.md` — el repoint del correo; se destraba cuando este hub esté vivo.

## Dependencies & Impact

### Depends on

- `GET /api/public/growth/ai-visibility/report/[token]` — [route.ts](../../src/app/api/public/growth/ai-visibility/report/[token]/route.ts) (TASK-1280, ya existe): entrega `model` (variant `publicWeb`) + `modelVersion` + `header`.
- `GET /api/public/growth/ai-visibility/run/[handle]` — [route.ts](../../src/app/api/public/growth/ai-visibility/run/[handle]/route.ts) (TASK-1245, poll) — **sólo si** el hub incluye también el form/landing self-serve (ver Slice 4, opcional).
- Acceso administrativo a: org GitHub `efeoncepro`, team Vercel `efeonce-7670142f`, DNS del dominio `efeoncepro.com`.

### Blocks / Impacts

- **TASK-1324** — repoint del enlace de los correos: bloqueada por este hub. Al cerrar 1325 con la URL final fijada, 1324 puede completarse.
- **TASK-1321** — loop self-serve AEO `/aeo-2/`: entrega informes por correo; sin hub vivo, entrega links muertos.
- `efeonce-web` (futuro): al converger, este hub se pliega adentro; la URL pública debe conservarse.

### Files owned

- **[repo nuevo, externo a este workspace]** app del hub (Astro + Tailwind), página de render del informe, config Vercel, DNS.
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` (actualizar decisión de repo/URL — este SÍ vive en `greenhouse-eo`).

## Current Repo State

### Already exists

- Endpoint headless del informe por token (TASK-1280): `model` + `modelVersion` + `header`, no-leak, con rate-limit por IP.
- Contrato de poll (TASK-1245) para el flujo self-serve, si se incluye el form.
- ADR de render headless + Deltas de TASK-1241 con el detalle de implementación (report artifact, estados, Turnstile keys).

### Gap

- **No existe** app desplegada en `think.efeoncepro.com` (repo + Vercel + DNS por crear).
- **No existe** la página que renderiza el `ReportArtifactModel` en el stack del hub (Astro + Tailwind + blend AXIS).
- La **URL final** del informe dentro del hub no está fijada (`/ai-visibility/<handle>` u otra convención).
- Falta la **decisión de marca compartida** (paquete compartido vs duplicación temporal) para que el merge en `efeonce-web` no cree drift.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Repo + proyecto Vercel + skeleton

- Crear repo GitHub en org `efeoncepro` (nombre a definir, p.ej. `efeonce-hub` / `think-efeonce`).
- Crear proyecto Vercel **en el team `efeonce-7670142f`** (scope explícito) vinculado a ese repo.
- Skeleton de app **Astro** (mismo stack que `efeonce-web`, para converger después) con deploy verde en la URL `.vercel.app`.
- **Decidir la estrategia de marca compartida** (recomendado: paquete compartido con tokens blend AXIS + marca pública, consumible por el hub y por `efeonce-web`; alternativa: duplicación temporal documentada con plan de consolidación).

### Slice 2 — Página de render del informe por token

- Ruta del informe (URL final, ver Slice 3) que toma el token del path.
- **Fetch server-side** (Astro SSR) al endpoint `GET /api/public/growth/ai-visibility/report/[token]` de Greenhouse → lee `model` + `header`.
- Render del `ReportArtifactModel` (variant `publicWeb`) con Tailwind + blend AXIS + masthead desde `header`. NO re-derivar scoring.
- Estados honestos: cargando, informe listo, **token inexistente/expirado → página de "enlace no válido o expirado"** (el endpoint devuelve 404 sin distinguir), error de fetch, rate-limit (429) con backoff.
- `noindex` en el informe per-lead.

### Slice 3 — URL final + DNS + verificación

- Fijar el **host + path final** del informe (p.ej. `https://think.efeoncepro.com/ai-visibility/<token>`) y qué llave va en el path (`reportToken`).
- Configurar el dominio `think.efeoncepro.com` en el proyecto Vercel + registros DNS.
- Verificar end-to-end con un token real: el informe correcto se ve, sin leaks, `noindex` presente.
- **Actualizar el ADR** con repo/proyecto/URL final.

### Slice 4 — (Opcional / follow-up) Landing + form self-serve

- Landing del lead magnet + form (reusar `render_contract` del grader / renderer portable si aplica) + Turnstile (site key pública ya provisionada, TASK-1241 Delta) + poll (TASK-1245) + GTM.
- Puede diferirse: el objetivo mínimo de esta task es que **el link del correo abra el informe**. El form self-serve es la evolución (se cruza con TASK-1321).

## Out of Scope

- **NO** cambiar el scoring, el modelo, ni el endpoint headless de `greenhouse-eo` (TASK-1280 ya está).
- **NO** el repoint del enlace de los correos — eso es **TASK-1324** (se destraba con este hub vivo).
- **NO** la convergencia real dentro de `efeonce-web` — es un follow-up futuro; acá sólo se nace preparado para ella.
- **NO** migrar el sitio raíz `efeoncepro.com` (WordPress/Kinsta) — intacto.

## Detailed Spec

**Contrato que consume el hub (ya existe, TASK-1280):**

`GET https://greenhouse.efeoncepro.com/api/public/growth/ai-visibility/report/<token>` →
```json
{
  "report": { /* DTO público-safe (back-compat) */ },
  "model":  { /* ReportArtifactModel variant publicWeb — render-ready */ },
  "modelVersion": "…",
  "header": { "organizationName": "…", "reportDate": "…", "periodLabel": "…" }
}
```
- El hub pinta `model` + `header`. `report` crudo queda por compatibilidad.
- 404 = token inexistente o expirado (no distingue, por diseño). 429 = rate-limit por IP → backoff.
- No-leak garantizado por tipo: `publicWeb` no carga `providerFindings`/`accuracyFindings`/raw text. `engineSnapshot` (visibilidad por motor) SÍ va — es el headline público, no leak.

El resto (report artifact, disclosure matrix, estados, copy es-CL) está descrito en los Deltas de TASK-1241 y en el sistema `report-artifact` de `greenhouse-eo` como **referencia** (no se importa — el hub es otro stack; se replica el layout con Tailwind).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (repo + Vercel) → Slice 2 (render) → Slice 3 (URL final + DNS).** El DNS se conecta cuando hay algo desplegado que servir.
- **Slice 3 fija la URL final** — que es la que TASK-1324 va a usar. NO cerrar 1325 sin URL final acordada, o 1324 queda sin destino estable.
- Slice 4 (form) es independiente y opcional; no bloquea el desbloqueo de 1324.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Proyecto Vercel creado en scope personal (ISSUE-013/076) | Vercel / infra | medium | `--scope efeonce-7670142f` explícito; verificar owner tras crear | Deploy aparece en team equivocado |
| Se elige URL provisional y hay que re-apuntar al converger en efeonce-web | growth / integration | medium | Fijar URL **final** en Slice 3 (subdominio estable) | Re-trabajo en TASK-1324 |
| Marca duplicada → drift al converger | growth / brand | medium | Paquete compartido desde Slice 1 (no duplicar tokens) | Informe con marca desalineada vs portal |
| Token expuesto al browser | growth / seguridad | low | Fetch server-side (Astro SSR), token nunca al cliente | Token visible en HTML/red |
| Informe indexado por Google | growth / SEO | low | `noindex` en el informe per-lead | Aparece en resultados de búsqueda |

### Feature flags / cutover

- Sin flag en `greenhouse-eo` (no hay cambio de código acá). El "cutover" es de infra: deploy del hub + DNS. Revert = despublicar el dominio / revert del deploy en el repo nuevo (<5 min via Vercel).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (repo + Vercel skeleton) | borrar proyecto Vercel (patrón verify-then-delete ISSUE-076) / archivar repo | <15 min | sí |
| Slice 2 (render) | revert deploy en el repo nuevo | <5 min | sí |
| Slice 3 (DNS + URL) | remover dominio del proyecto / revertir registro DNS | <30 min (propagación) | sí |
| Slice 4 (form) | deshabilitar la ruta del form | <5 min | sí |

### Production verification sequence

1. Slice 1: proyecto Vercel confirmado en team `efeonce-7670142f` (no personal) + deploy skeleton verde en `.vercel.app`.
2. Slice 2: en la URL `.vercel.app`, cargar un token real → informe correcto, sin leaks, `noindex` presente, estados (expirado/error) OK.
3. Slice 3: `think.efeoncepro.com/<path-final>/<token-real>` → 200 + informe correcto. `curl -sI` confirma resolución + header `noindex`.
4. Handoff a TASK-1324: comunicar la URL final para el repoint del correo.

### Out-of-band coordination required

- **Sí, es el núcleo de la task:** creación de repo GitHub (org `efeoncepro`), proyecto Vercel (team `efeonce-7670142f`), y **registros DNS** del subdominio `think.efeoncepro.com`. Todo requiere acceso administrativo del operador. Coordinar la URL final con quien tome TASK-1324.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe repo GitHub nuevo (org `efeoncepro`) + proyecto Vercel dedicado en team `efeonce-7670142f` (verificado, no scope personal).
- [ ] La app renderiza el informe del grader por token, consumiendo el endpoint de TASK-1280 **server-side** (token no expuesto al browser).
- [ ] El render NO re-deriva scoring: pinta `model` + `header` tal como los entrega el endpoint.
- [ ] Estados honestos cubiertos: cargando, listo, token inexistente/expirado (404), error, rate-limit (429).
- [ ] El informe per-lead responde con `noindex`.
- [ ] `think.efeoncepro.com` resuelve al proyecto Vercel y la URL final del informe está fijada y documentada.
- [ ] La estrategia de marca compartida quedó decidida (paquete compartido recomendado) para no crear drift al converger en `efeonce-web`.
- [ ] El ADR `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` quedó actualizado (repo/proyecto/URL final).
- [ ] La URL final fue comunicada a TASK-1324 para el repoint del correo.

## Verification

- Verificación runtime en el repo nuevo (su propio lint/build/deploy Vercel) — fuera de los gates de `greenhouse-eo`.
- `curl -sI` a la URL final: 200 + `noindex` + informe correcto con un token real.
- En `greenhouse-eo`: sólo la actualización del ADR (revisión manual de doc).

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/`, `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con el estado del hub (repo, proyecto Vercel, DNS, URL final)
- [ ] `changelog.md` actualizado (nueva superficie pública operativa)
- [ ] chequeo de impacto cruzado sobre **TASK-1324** (destrabada) y TASK-1321
- [ ] ADR de render headless actualizado con la decisión de repo/proyecto/URL

## Follow-ups

- **TASK-1324** — repoint del enlace de los correos al hub (se toma apenas la URL final esté fijada).
- Convergencia del hub dentro de `efeonce-web` (futuro): plegar el hub conservando el subdominio/URL para no romper links ni re-apuntar.
- Landing + form self-serve del lead magnet (Slice 4 si se difiere) — se cruza con TASK-1321.

## Open Questions

- **Nombre del repo/proyecto** del hub.
- **Marca compartida:** ¿paquete compartido npm desde ya, o duplicación temporal documentada?
- **URL final del informe:** ¿`think.efeoncepro.com/ai-visibility/<token>`? ¿La llave es `reportToken` o un `publicId`?
- **¿El form self-serve (Slice 4) entra en esta task o se difiere** a un follow-up / TASK-1321?
