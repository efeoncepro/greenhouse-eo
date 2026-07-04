# TASK-1327 — Public lead-magnet landing + embed del form gobernado (think.efeoncepro.com/brand-visibility)

## Delta 2026-07-04 — handoff contract listo (desbloqueo parcial por TASK-1336)

El contrato del handoff submit→reporte quedó code-complete (TASK-1336). Think NO inventa polling ni cierra con email: consume el contrato gobernado de Greenhouse (SSOT del submit/status/token). Cómo:

1. Embeber `<greenhouse-form form-key="…" surface="…" locale="es-CL" color-scheme="light">` del grader (`fdef-ai-visibility-grader`, `successBehavior.kind="tokenized_report"`).
2. Escuchar el `CustomEvent` `gh_form_submission_accepted` en el elemento host. Su `detail` trae, además de `correlation_id`/`success_behavior`, el handoff cuando el form declara el behavior: `run_handle` (handle público del run) y `status_url` (URL absoluta del status endpoint, ya resuelta contra el origen del API). El `detail` **nunca** trae PII ni `reportToken`.
3. Con `status_url`, hacer poll (respetando `retryAfterSeconds` de la respuesta): `GET` devuelve `{ status, reportToken, message, retryAfterSeconds }` con `status ∈ queued|processing|ready|in_review|unavailable|not_found`. Mostrar loader honesto (sin inventar %), estados finales para `in_review`/`unavailable`.
4. Cuando `status="ready"`, `reportToken` aparece → navegar a `think.efeoncepro.com/brand-visibility/r/<reportToken>` (el hub ya conoce su path; short link `/s/<code>` cuando el flag esté ON, fallback al largo).

Delta operativo posterior (2026-07-04): el smoke browser real desde `https://think.efeoncepro.com/brand-visibility` ya carga el form gobernado y el handoff `tokenized_report` en producción. Evidencia: Greenhouse prod con renderer `renderer-latest.js` desplegado, Think prod desplegado, y verificación `pnpm verify:landing -- https://think.efeoncepro.com/brand-visibility task1327-form-dock-real-form-prod` OK. El contrato transversal vive en `docs/architecture/growth-public-forms-runtime-contract.md` → §Tokenized Report Handoff.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1327-public-lead-magnet-landing-form-embed.md`
- Flow: `docs/ui/flows/TASK-1327-public-lead-magnet-landing-form-embed-flow.md`
- Motion: `docs/ui/motion/TASK-1327-public-lead-magnet-landing-form-embed-motion.md`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|forms`
- Blocked by: `none`
- Branch: `task/TASK-1327-public-lead-magnet-landing-form-embed`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-07-04 — TASK-1335 desbloquea el CORS/surface allowlist de Think

- **TASK-1335 code-complete + data aplicada (dev PG).** El transporte CORS de Growth Forms dejó de ser
  un literal hardcodeado: ahora es la **unión gobernada de `origin_allowlist_json` de las surfaces
  `active`** (`src/app/api/public/growth/forms/cors.ts`). La surface `fhsf-ai-visibility-grader` ya
  incluye `https://think.efeoncepro.com` (migración `20260704131308632_task-1335-...`, additive/idempotente).
  Con eso `GET`/`OPTIONS`/`POST submit`/`POST verify-email` emiten `Access-Control-Allow-Origin:
https://think.efeoncepro.com` **sin ningún workaround local en Think**.
- **La landing NO carga la preocupación de plataforma.** No agregar hardcode de CORS ni bridge en el
  repo `efeonce-think`; el origin queda habilitado por DATA gobernada en greenhouse-eo.
- **Pendiente de rollout para levantar el blocker en runtime:** deploy a staging/producción de
  greenhouse-eo + aplicar la migración/seed en el PG del target + correr el curl matrix (ACAO para
  `think`, sigue ACAO para `efeoncepro.com`/`/aeo-2`, sin ACAO para origins desconocidos). Recién
  entonces `TASK-1335` pasa a `complete` y este blocker queda 100% levantado.

## Summary

Construir la **Superficie B** del hub: la **landing pública principal `think.efeoncepro.com/brand-visibility`** donde un usuario nuevo deja sus datos para iniciar el lead magnet. **El form NO es nuevo:** ya existe gobernado (`fdef-ai-visibility-grader`, formKey `69cd5269-5f97-4d32-99c4-0b23f41aa2f5`); la landing lo **embebe** con `<greenhouse-form>` (renderer portable), heredando validación, consent, Turnstile, telemetry y el path submission→outbox→pipeline. Cierra el loop self-serve primario: `landing → form → grader async → loader/análisis → reporte en pantalla (Superficie A, TASK-1325)`. El email puede existir como refuerzo/recuperación, pero no es el cierre principal de UX para esta task.

> ⚠️ **Ejecución mayormente EXTERNA a `greenhouse-eo`** (repo `efeoncepro/efeonce-think`, Astro). En `greenhouse-eo` esta task mantiene el contrato documental/readiness y solo verifica el render contract del grader form si Discovery lo requiere. La landing visible vive en Think, pero sigue siendo una task `ui-ux` porque define una superficie pública, indexable y con flujo de conversión. El bloqueo de CORS/surface allowlist queda separado en TASK-1335 (`backend-data`) y el handoff submit→status→reporte en pantalla queda separado en TASK-1336 (`backend-data`).

## Why This Task Exists

Hoy **no existe ninguna superficie pública donde llenar el grader self-serve** (verificado TASK-1246): el form del grader es un form gobernado del motor Growth Forms, pero no está embebido en ningún lado (no confundir con `/aeo-2/`, que es el form comercial `fdef-efeonce-aeo-diagnostic`, otro flujo). El ADR [`GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`](../../docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md) (Delta 2026-07-03) resolvió que la landing vive en el hub `efeonce-think` y **embebe el form gobernado** (no reconstruye) — el mismo web component `<greenhouse-form>` que `/aeo-2/` usa live en WordPress (TASK-1298). Sin esta landing, el lead magnet no tiene puerta de entrada self-serve.

## Goal

- Landing `think.efeoncepro.com/brand-visibility` (indexable) que presenta el lead magnet con nivel enterprise y embebe el form gobernado del grader.
- El form se renderiza vía `<greenhouse-form form-key="69cd5269…">` (renderer portable) — cero lógica de form nueva.
- El submit corre el grader por el path gobernado (submission→outbox→pipeline); la experiencia espera el análisis y muestra el reporte en pantalla.
- Experiencia rica desde entrada hasta reporte: landing/form de alto nivel, loader del contrato del form, pending state, análisis async/report skeleton y transición al reporte.
- Poll/status/redirect solo pueden usar handles o tokens gobernados. Si el contrato actual no expone el handle necesario para llegar al reporte en pantalla, ese gap debe quedar bloqueado/derivado antes de implementar un workaround.
- Consistente con la Superficie A (misma marca AXIS del hub, misma URL base).

### Program state — no redescubrir

- `TASK-1325` esta **complete/live**: el hub Think y la Superficie A del reporte (`/brand-visibility/r/<token>`) ya existen, estan shippeados y son la base visual/editorial para esta landing. No es blocker de implementacion.
- `TASK-1330` esta **lista/shippeada como capacidad de short links**, con activacion de `GROWTH_AI_VISIBILITY_SHORT_LINKS_ENABLED` pendiente para el paso a produccion. No bloquea TASK-1327: el loop base debe funcionar con la URL canonica larga `/brand-visibility/r/<token>`, y los short links se prenden como mejora de sharing/correo en el cutover.
- Los blockers vivos para ejecutar esta landing son `TASK-1335` (browser puede cargar/enviar el form desde Think) y `TASK-1336` (submit del form entrega handoff gobernado hacia status/reporte).

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

- **TASK-1325** — hub `efeonce-think` vivo/shippeado (Superficie A + shell + marca). Base ya disponible; no redescubrir ni tratar como blocker.
- **Render contract del grader form** publicado para el renderer portable: `fdef-ai-visibility-grader` tiene versión de submission (v2, resuelta por slug), pero **verificar en Discovery** que expone el render contract que `<greenhouse-form>` necesita para dibujar los campos. Si no, publicar la versión de render (Growth Forms).
- **TASK-1335** — transporte CORS + surface allowlist gobernados para que `https://think.efeoncepro.com` pueda cargar y enviar el `<greenhouse-form>` del grader en browser. No resolverlo con workaround local en Think.
- **TASK-1336** — contrato Growth Forms `tokenized_report` / success-status para que el submit del `<greenhouse-form>` entregue `runHandle`, `statusUrl`, `reportToken`, `reportUrl` o equivalente gobernado. No resolverlo con polling inventado ni con email como cierre principal.
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
- Short links de TASK-1330 estan listos para activacion por flag en el paso a produccion; el fallback canonico largo `/brand-visibility/r/<token>` sigue siendo valido.

### Gap

- No existe la landing `/brand-visibility` ni el embed del form en el hub.
- Verificar si el grader form tiene render contract publicado para el renderer portable (hoy su versión es anchor de submission).
- Site key Turnstile / config del embed en el hub.

## UI/UX Contract

### UX brief

- UI rigor: `ui-standard+`
- Usuario primario: decisor de marketing/growth/founder que evalúa si vale la pena entregar datos para correr el análisis AI Visibility / Brand Visibility.
- Momento: primer contacto con la oferta pública; todavía no hay análisis ni diagnóstico, solo una promesa clara del lead magnet.
- Resultado esperado: entiende qué recibirá, confía en que el flujo es serio/gobernado, completa el `<greenhouse-form>`, espera el análisis con un loader premium y llega al reporte en pantalla.
- Restricción editorial: la landing debe sentirse como el primer paso natural hacia el informe actual de Think. No debe parecer una landing genérica, inflada, de lead-gen tradicional ni una página de promesas SEO.
- Tesis visible: lead magnet enterprise, sobrio y premium que explica qué analizará el grader después del submit.
- Principio de experiencia: antes del submit es una entrada clara al lead magnet; después del submit se convierte en una experiencia de espera/análisis y entrega de reporte. No presentar diagnóstico como si ya existiera antes de capturar datos.

### Surface contract

- Surface: `think.efeoncepro.com/brand-visibility`.
- Route owner: repo externo `efeonce-think` (`src/pages/brand-visibility/index.astro`).
- Indexability: landing indexable; reportes por token (`/brand-visibility/r/<token>`) siguen `noindex`.
- Access: público, sin auth ni capability Greenhouse.
- Composition Shell: no aplica como primitive Greenhouse/MUI porque la implementación vive en Astro Think. Debe reutilizar el shell visual de Think y la dirección editorial del reporte final.
- Primitive decision: reuse de `BaseLayout`/lenguaje visual de Think + `<greenhouse-form>` gobernado. No crear form local, iframe, endpoint propio, primitive paralela ni validación duplicada.
- Form contract:
  - `form-key="69cd5269-5f97-4d32-99c4-0b23f41aa2f5"`
  - `surface="fhsf-ai-visibility-grader"`
  - `locale="es-CL"`
  - `appearance="bare"`

### State inventory

| State              | Requirement                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `landing.ready`    | Primera pantalla vende el lead magnet + form host; no hero vacío ni diagnóstico fingido.                           |
| `form.loading`     | Skeleton/host estable mientras carga el renderer/contract.                                                         |
| `form.ready`       | El form gobernado dibuja los campos; la landing no agrega campos propios.                                          |
| `form.submitting`  | Submit/disabled/validación los controla el renderer.                                                               |
| `analysis.waiting` | Estado rico post-submit con report skeleton y pasos de análisis; sin fake progress si no hay status real.          |
| `analysis.ready`   | El contrato gobernado entrega token/URL listo y la UI abre o enlaza el reporte en pantalla.                        |
| `form.accepted`    | Estado transitorio hacia `analysis.waiting`, no cierre final tipo gracias/email.                                   |
| `form.error`       | Mensaje seguro sin filtrar CORS/API/stack traces.                                                                  |
| `form.denied`      | Estado bloqueante pre-launch si TASK-1335 no está resuelto; no se parchea en Think.                                |
| `report.opened`    | Usuario llega a `/brand-visibility/r/<token>` o surface equivalente de reporte en pantalla; la ruta sigue noindex. |

### Copy and content contract

- Copy source: copy local de Think para esta landing, alineado a `docs/context/05_voz-tono-estilo.md`, `docs/context/09_marca-agencia.md` y al módulo `seo-aeo/efeonce/AI_VISIBILITY_GRADER.md`.
- Mantener lenguaje de lead magnet, análisis y reporte; evitar presentar diagnóstico/evidencia como si ya existiera antes del submit.
- Evitar promesas como "te posicionamos", "ranking garantizado" o "resultado definitivo".
- El primer viewport debe contener:
  - oferta literal (`Brand Visibility Grader`);
  - promesa concreta del análisis que se ejecutará después del submit;
  - form host visible o inmediatamente alcanzable;
  - señal visual del universo del informe (motores, citabilidad, categoría, operabilidad) sin datos falsos;
  - nota breve de alcance/metodología sin bloquear la conversión.
- El preview del reporte puede usar cards/labels, pero no números, scores ni evidencia simulada.
- El post-submit debe sentirse diseñado: report skeleton, pasos del análisis, loader honesto y transición al reporte en pantalla. No usar un simple "gracias" plano ni cerrar la experiencia solo con email.

### Form UX decision — premium progressive intake

- El form actual del grader mantiene sus **14 campos gobernados** y se organiza como **3 pasos breves**:
  `Tu marca` → `Contexto opcional` → `Envío del informe`.
- No se reducen campos ni se crean inputs locales en Think. La reducción de fricción ocurre dentro del renderer portable:
  stepper con nombres de valor, resumen vivo sin PII, paso 2 saltable, botones con targets/focus/disabled accesibles y copy de validación específico por campo.
- El paso 2 queda explícitamente opcional. El CTA primario dice `Continuar con este contexto` y el affordance secundario dice `Omitir por ahora`; esto conserva data útil para el análisis sin castigar al usuario que todavía no tiene competidores o contexto interno claro.
- El renderer muestra una `Vista previa del informe` basada en estados de completitud (`listo`, `opcional`, `falta N`), nunca en valores capturados. No debe exponer email, nombre, marca ni competidores en el resumen visual.
- El contrato publicado del form debe usar placeholders enterprise concretos (`LatAm B2B`, `educacion superior`, `competidor regional`) y errores calmados con recuperación clara (`Indica el mercado donde quieres evaluar la visibilidad.`), evitando mensajes genéricos como único feedback.
- El cierre posterior al submit es ceremonial y honesto: `Solicitud recibida. Estamos consultando motores, citabilidad y contexto competitivo para preparar tu informe en pantalla.` El destino principal sigue siendo el reporte en pantalla.

### Report-derived landing content contract

Fuente revisada: reporte actual de Think en `efeonce-think/src/pages/brand-visibility/r/[token].astro` + capturas finales TASK-1331 (`task1331-final-local-desktop-1440.png`, `task1331-final-local-mobile-390.png`). La landing debe anticipar la experiencia del reporte sin renderizar resultados antes de que exista el run.

| Bloque actual del reporte                                        | Qué debe llevar la landing                                                                                                                                                   | Qué NO puede mostrar pre-submit                                                                    |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Hero navy con marca Efeonce, score, organización, fecha y estado | Hero premium con Efeonce/Think, nombre literal `Brand Visibility Grader`, promesa clara del análisis y form visible. Debe sentirse como la puerta del mismo producto visual. | Score, severidad, organización analizada, fecha de evidencia, run ID o badges de resultado.        |
| Resumen ejecutivo de evidencia                                   | Preview de "lo que mediremos": presencia, motores, citabilidad, capacidad de acción. Usar lenguaje de reporte, no métricas.                                                  | `58/100`, porcentajes, "motor con mejor presencia", "mayor brecha" o cualquier lectura específica. |
| Share of Model por motor                                         | Módulo preview de motores muestreados: ChatGPT, Gemini, Claude, Perplexity, Google AI Overview/AI Mode según roster real.                                                    | Barras con porcentajes, menciones/respuestas resueltas, estado por motor.                          |
| Share of Voice competitivo                                       | Explicar que el reporte compara cuota de conversación frente a competidores cuando hay evidencia suficiente.                                                                 | Ranking de competidores, líder, brechas, múltiplos o nombres no derivados de un run.               |
| Tono de mención                                                  | Explicar que el análisis distingue menciones favorables, neutrales, mixtas o negativas si hay muestra calificable.                                                           | Donut/saldo con valores, counts o afirmaciones de tono.                                            |
| Mapa de citabilidad                                              | Prometer mapa de fuentes agregadas: sitio propio, terceros, UGC/comunidad y competidores.                                                                                    | Dominios, porcentajes de citabilidad propia, citas totales, URLs completas o proveedor/raw text.   |
| Operabilidad del sitio                                           | Anticipar el eje "te pueden usar, no solo citar": lectura estructural y agentic readiness.                                                                                   | Puntajes de base técnica, capacidad de acción, brechas o pruebas completadas.                      |
| Categoría percibida                                              | Explicar que el reporte puede leer industria, sector, oferta, caso de uso, mercado y comprador cuando existe evidencia.                                                      | Categoría detectada, señales totales, ambigüedades o narrativa inferida.                           |
| Escalera de visibilidad                                          | Mostrar el framework de 5 niveles como marco educativo: Be Found, Readable, Correct, Actionable, Intrinsic.                                                                  | Peldaño actual, score por nivel, "Empieza aquí" o severidad del usuario.                           |
| Brecha prioritaria y recomendaciones                             | Explicar que el reporte termina con una prioridad operativa y secuencia de acciones.                                                                                         | Recomendaciones concretas, prioridad, severidad o claims personalizados.                           |
| Detalle técnico/radar                                            | Mencionar que el reporte explica qué sostiene el puntaje con dimensiones medibles.                                                                                           | Radar, dimension scores, fortalezas/brechas específicas o "sin dato" por dimensión.                |
| Share/PDF/CTA final                                              | Anticipar que el reporte se puede compartir/guardar cuando esté listo.                                                                                                       | Share copy personalizada, PDF link, short link o CTA con token antes del run.                      |

La landing debe ordenar esos contenidos como una experiencia de conversión, no como una réplica larga del reporte:

1. `Hero + form`: promesa del lead magnet y captura gobernada visible.
2. `Report promise`: cards breves con los módulos que aparecerán en el reporte.
3. `How it works`: form → análisis async → loader → reporte en pantalla.
4. `Framework`: escalera de 5 niveles como educación de valor, sin resultado del usuario.
5. `Trust and method`: muestra acotada, no garantía, no raw prompts/provider text/full URLs, no inferencias si falta evidencia.
6. `Post-submit state`: report skeleton + etapas del análisis + transición al reporte cuando el token/status esté listo.

### On-screen report completion contract

- TASK-1327 necesita verificar en Discovery qué devuelve el submit del `<greenhouse-form>` para conducir al reporte en pantalla.
- Contratos aceptables: `run handle + status URL`, `report token`, `report URL`, o `successBehavior` gobernado equivalente.
- Si el renderer solo puede mostrar success card/email sin handle para llegar al reporte en pantalla, TASK-1327 queda bloqueada por un gap de contrato. No resolver con polling inventado en Think ni cerrar la UX con email como destino principal.
- El loader post-submit puede mostrar etapas narrativas del análisis (`solicitud recibida`, `preparando run`, `consultando motores`, `armando reporte`) solo como orientación. Marcar una etapa como completada requiere status real.

### Implementation mapping

- Wireframe: `docs/ui/wireframes/TASK-1327-public-lead-magnet-landing-form-embed.md`
- Flow: `docs/ui/flows/TASK-1327-public-lead-magnet-landing-form-embed-flow.md`
- Motion: `docs/ui/motion/TASK-1327-public-lead-magnet-landing-form-embed-motion.md`; entrada, loader de form, pending, análisis wait y reduced-motion están gobernados antes de escribir Astro/JS.
- Data/command boundary: Think no escribe submissions directamente; todo submit pasa por el renderer portable y APIs públicas gobernadas de Greenhouse. Think solo puede leer status/token de reporte si el contrato gobernado lo expone para esta superficie.
- GVC/captura esperada:
  - desktop 1440, laptop 1280, mobile 390;
  - first fold + full page + form loader + analysis wait + reduced-motion;
  - markers `brand-visibility-landing`, `brand-visibility-hero`, `brand-visibility-signal-preview`, `brand-visibility-form`, `brand-visibility-form-loader`, `brand-visibility-analysis`, `brand-visibility-report-preview`, `brand-visibility-flow`, `brand-visibility-trust`;
  - check `scrollWidth <= clientWidth` en desktop y mobile;
  - verificación SEO: landing indexable, report token noindex.

### Readiness status

- `UI ready: no` hasta completar Discovery de TASK-1327, confirmar que TASK-1335 desbloquea el origin `https://think.efeoncepro.com`, confirmar que TASK-1336 entrega el handoff submit→status→reporte, verificar el render contract del form y registrar el plan de captura contra Think local/staging.
- La implementación puede empezar solo después de confirmar un `/goal`, correr `pnpm codex:task-hook TASK-1327 --develop` y aplicar el hook de ejecución correspondiente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Readiness UI y contrato visual

- Usar el wireframe y flow de esta task como contrato antes de escribir Astro/JSX.
- Usar el motion contract como requisito de experiencia: entrada rica, form loader, pending, análisis wait, transición a reporte y reduced-motion.
- Verificar el reporte actual de Think como referencia visual/editorial obligatoria.
- Confirmar que la primera pantalla vende el lead magnet y conduce al form, no a una explicación larga ni a un diagnóstico prematuro.

### Slice 1 — Verificar render contract y desbloqueo de origin

- Confirmar (Discovery) que `fdef-ai-visibility-grader` expone el render contract que `<greenhouse-form>` necesita.
- Confirmar que TASK-1335 resolvió CORS + surface allowlist para `https://think.efeoncepro.com` y `surfaceId=fhsf-ai-visibility-grader`.
- Confirmar que TASK-1336 resolvió el handoff publico del submit del renderer hacia status/reporte en pantalla.
- Si el render contract falta, documentar el gap y abrir/coordinar el ajuste Growth Forms sin tocar el submission path ni duplicar lógica en Think.

### Slice 2 — Landing `/brand-visibility` + embed del form

- Page Astro `brand-visibility/index.astro`: hero + propuesta de valor + embed `<greenhouse-form form-key="69cd5269…">`.
- Marca AXIS/Efeonce del hub (tokens/lenguaje del reporte actual), Tailwind/Astro, indexable.
- Experiencia completa de entrada: señal visual del futuro informe, report-preview, loader de contrato del form y estados rich-ready.
- Registrar la surface `/brand-visibility` en `greenhouse.repo.json` de Think.

### Slice 3 — Estado/poll + cierre del loop

- Tras submit: analysis wait panel enterprise con report skeleton y pasos de análisis.
- Pantalla de estado/poll/redirect solo si el renderer, TASK-1245 y TASK-1336 exponen un handle seguro para esta superficie; no inventar polling local, porcentajes, motores completados ni estados no gobernados.
- Verificar end-to-end: submit real → grader corre → loader/análisis → reporte en pantalla (Superficie A). Email queda como soporte secundario, no como destino principal.

## Out of Scope

- **NO** reconstruir el form (se embebe el gobernado).
- **NO** el render del informe (Superficie A, TASK-1325).
- **NO** el pipeline del grader ni el scoring (ya existe).
- **NO** scoring, probes, normalizer ni `executeClaimedGraderRun`.
- **NO** el flujo comercial `/aeo-2/` (TASK-1321).
- **NO** resolver CORS/surface allowlist con hardcode local ni bridge en Think (eso es TASK-1335).
- **NO** mockear producción, números de reporte, evidencia, estados del grader, progreso porcentual, motores completados ni datos del backend.
- **NO** usar animaciones pesadas, scroll-jacking, canvas full-screen o loaders sin texto accesible.

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

La implementación debe incluir fallback `noscript`/degraded alrededor del host, pero ese fallback no puede contener campos propios ni un endpoint alternativo. Ejemplo de host esperado:

```html
<script defer src="https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js"></script>

<section data-capture="brand-visibility-form" aria-labelledby="brand-visibility-form-title">
  <h2 id="brand-visibility-form-title">Inicia tu analisis</h2>
  <greenhouse-form
    form-key="69cd5269-5f97-4d32-99c4-0b23f41aa2f5"
    surface="fhsf-ai-visibility-grader"
    locale="es-CL"
    color-scheme="light"
    appearance="bare"
  ></greenhouse-form>
  <noscript>Activa JavaScript para cargar el formulario gobernado de Greenhouse.</noscript>
</section>
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 0 (readiness UI) → Slice 1 (render contract + TASK-1335 + TASK-1336) → Slice 2 (embed) → Slice 3 (loop).** Sin render contract publicado, origin autorizado y handoff submit→status→reporte, el `<greenhouse-form>` no puede cerrar la experiencia en pantalla.

### Risk matrix

| Riesgo                                                | Sistema               | Probabilidad | Mitigation                                                                                 | Signal de alerta                                  |
| ----------------------------------------------------- | --------------------- | ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| El grader form no tiene render contract publicado     | growth / forms        | medium       | Slice 1 lo verifica/publica antes del embed                                                | `<greenhouse-form>` vacío                         |
| CORS/surface allowlist bloquea `think.efeoncepro.com` | growth / public-site  | high         | Resolver TASK-1335 antes del launch; no bridge local                                       | consola del browser / falta de ACAO               |
| Landing se siente separada del reporte                | product / public-site | medium       | Usar wireframe, reporte actual y GVC antes de implementar                                  | primera pantalla generica                         |
| Experiencia rica inventa progreso o datos             | product / trust       | medium       | Motion/flow permiten skeleton narrativo, pero solo statuses reales si hay handle gobernado | progreso falso / claims no respaldados            |
| Flujo cierra por email en vez de reporte en pantalla  | product / conversion  | high         | Completar TASK-1336 y requerir handle/token/redirect gobernado como parte de Discovery     | success "te avisamos por email" como cierre final |
| Motion degrada performance o accesibilidad            | public-site / SEO     | medium       | CSS compositor-only, reduced-motion, LCP/INP check y GVC mobile                            | INP alto / foco perdido                           |
| Dos intakes (hub + `/aeo-2/`) divergen                | growth                | low          | Ambos usan el pipeline gobernado; no duplicar lógica                                       | conteos de runs                                   |

### Feature flags / cutover

- El intake convergente ya está detrás de `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` (TASK-1251). Confirmar su estado antes del launch. Revert = despublicar la landing.
- `GROWTH_AI_VISIBILITY_SHORT_LINKS_ENABLED` (TASK-1330) se prende en el paso a produccion si entra al release; no es requisito para implementar ni validar TASK-1327 porque el reporte por `/brand-visibility/r/<token>` ya es el fallback canonico.

### Rollback plan per slice

| Slice   | Rollback                                                   | Tiempo  | Reversible? |
| ------- | ---------------------------------------------------------- | ------- | ----------- |
| Slice 0 | revertir docs/readiness                                    | <5 min  | sí          |
| Slice 1 | no publicar / revert versión de render o no activar origin | <10 min | sí          |
| Slice 2 | despublicar la ruta en el repo del hub                     | <5 min  | sí          |
| Slice 3 | quitar el poll / volver a confirmación event-driven        | <5 min  | sí          |

### Production verification sequence

1. Slice 0: wireframe/flow/motion/readiness revisados y aceptados.
2. Slice 1: render contract del grader form resuelve para `<greenhouse-form>`, TASK-1335 permite GET/OPTIONS/submit desde `https://think.efeoncepro.com` y TASK-1336 entrega el handoff publico submit→status→reporte.
3. Slice 2: la landing renderiza el form embebido en `think.efeoncepro.com/brand-visibility`, sin overflow y con ruta indexable.
4. Slice 3: submit real → run encolado → loader/análisis → reporte en pantalla (Superficie A) correcto; email secundario si aplica.

### Out-of-band coordination required

- Config del embed en el hub (script origin + CORS del render contract para `think.efeoncepro.com`). Turnstile site key (ya provisionada, TASK-1241 Delta).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `UI ready` solo pasa a `yes` después de confirmar wireframe/flow, render contract, TASK-1335, TASK-1336 y plan de captura.
- [ ] Motion contract aplicado: page entry, form loader, submit pending, analysis wait, report skeleton y reduced-motion verificados.
- [ ] Existe `think.efeoncepro.com/brand-visibility` (indexable) con el form del grader embebido vía `<greenhouse-form>`.
- [ ] El form es el gobernado (`fdef-ai-visibility-grader`, formKey `69cd5269…`) — cero lógica de form nueva.
- [ ] El origin `https://think.efeoncepro.com` carga y envía el form con CORS/surface allowlist gobernados (TASK-1335), sin hardcode ni bridge local.
- [ ] El submit del form entrega un handoff gobernado (TASK-1336) para loader/status/reporte en pantalla; no hay polling privado ni cierre principal por email.
- [ ] Un submit real corre el grader por el path gobernado y termina mostrando el reporte en pantalla (Superficie A); email es secundario/recuperación.
- [ ] Consent/Turnstile/telemetry heredados del form gobernado (no reimplementados).
- [ ] La landing conversa visual/editorialmente con el reporte final Think: tono enterprise, sobrio, AXIS/Efeonce, promesa seria de análisis, sin hero genérico ni promesas infladas.
- [ ] La experiencia completa se siente enterprise desde entrada hasta submit: no hay estados planos, spinners sin contexto ni éxito genérico.
- [ ] El preview del reporte no contiene datos, scores ni evidencia mockeada.
- [ ] El análisis wait state no muestra porcentajes, motores completados, citas ni scores salvo que provengan de un status/handle gobernado.
- [ ] El flow no se cierra con email como destino principal si el usuario puede esperar el reporte en pantalla.
- [ ] La landing usa la misma marca/URL base del hub (consistente con Superficie A).
- [ ] `/brand-visibility` es indexable; `/brand-visibility/r/<token>` conserva `noindex`.
- [ ] Capturas desktop/mobile demuestran first fold, form host, secciones clave y ausencia de overflow horizontal.

## Verification

- En `greenhouse-eo`:
  - `pnpm task:lint --task TASK-1327`
  - `pnpm ui:wireframe-check --task TASK-1327`
  - `pnpm ui:flow-check --task TASK-1327`
  - `pnpm ui:motion-check --task TASK-1327`
  - `pnpm ui:readiness-check --task TASK-1327`
  - verificación runtime del render contract/CORS si TASK-1335 ya está listo.
- En `efeonce-think`:
  - type-check/build del repo Think;
  - captura Playwright/GVC equivalente desktop 1440/1280 y mobile 390;
  - captura de form loader, submit pending/accepted, analysis wait y reduced-motion;
  - check `scrollWidth <= clientWidth`;
  - performance sanity para LCP/INP/JS payload de la landing;
  - SEO check de `index` para landing y `noindex` para token route;
  - submit end-to-end real → run → loader/análisis → informe en pantalla, solo con confirmación de rollout;
  - email secundario/recuperación si el pipeline lo envía.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento observable
- [ ] chequeo de impacto cruzado sobre TASK-1325 (hub), TASK-1321 (intake `/aeo-2/`), TASK-1251 (convergencia)
- [ ] `greenhouse.repo.json` de `efeonce-think` con la surface `/brand-visibility`
- [ ] wireframe/flow/motion conservan evidencia de la decisión visual y GVC

## Follow-ups

- Medición GTM del loop (landing → submit → informe).
- Convergencia del hub en `efeonce-web` (conservar rutas).

## Open Questions

- **¿El grader form ya tiene render contract publicado** para el renderer portable, o hay que publicarlo? (Slice 1.)
- **¿Qué contrato devuelve el submit del `<greenhouse-form>` para conducir al reporte en pantalla?** TASK-1336 lo separa como backend-data blocker: debe verificar/extender `run handle`, `report token`, `status URL`, `report URL` o un `successBehavior` gobernado suficiente.
- **¿El renderer portable expone un callback/evento de success suficiente** para reemplazar el form host por loader/análisis y luego navegar al reporte, o hay que ampliar el contrato gobernado antes de implementar?
- **¿El intake self-serve del hub reemplaza o coexiste** con el path `/aeo-2/` (TASK-1321)? Coexisten hoy; alinear estrategia comercial.
