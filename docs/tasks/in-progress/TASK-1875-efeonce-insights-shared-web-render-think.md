# TASK-1875 — Efeonce Insights: vista web compartida renderizada en Think (efeonce-think)

## Delta 2026-09-28 (arranque)

- Diseño aprobado por el operador en el canvas «Insights en vivo» (<https://claude.ai/artifact/EGh8K8eyKA8XNhETCQ1W4T>):
  portada navy con la órbita que mide, resumen, capítulo con figura + tabla + límites, plan, metodología, descargas y
  cierre con el eslogan en bloque oficial; tipografía Bricolage + Poppins del sistema «La órbita». Marca y lockup
  canónicos: `axis-brand-assets` 0.4.0 (`insights-lockup-*`). El diseño usa campos editoriales v2 que
  `InsightWebModelV1` todavía no proyecta: el render los toma como opcionales y su proyección en Greenhouse queda como
  follow-up backend.

## Delta 2026-09-28 (rate limit)

- TASK-1876: `/api/public/**` queda detrás de un rate limit del Firewall de Vercel (20 req/10 s por IP; enforce en staging/preview, observe en producción). **Criterio transferido desde TASK-1876 (2026-09-28): esta task debe demostrar que el tráfico server-side de Think al lector público no es bloqueado por el guard** — excepción explícita en `src/lib/security/public-burst-guard/firewall-rules.ts` + `pnpm security:public-burst-guard --apply`; verificar en staging, donde la regla ya está en `enforce`. Si Think lee el reader público server-side desde pocas IPs de runtime, **exceptuarlo con una condición explícita** (cabecera/credencial de Think) en `src/lib/security/public-burst-guard/firewall-rules.ts` y aplicar con `pnpm security:public-burst-guard --apply`; nunca subir el límite para todos.

## Delta 2026-09-26

- TASK-1888 complete y en producción con `INSIGHTS_EDITORIAL_V2_ENABLED` ON: las ediciones nuevas ya sellan planes v2,
  así que tratar sus campos como opcionales al proyectarlos a `InsightWebModelV1` deja de ser hipotético. — por trabajo en TASK-1888

## Delta 2026-09-25 (TASK-1888 code complete)

- **Construido (flag ON desde 2026-09-26, ver delta de arriba):** los campos v2 existen en `EditorialPlanV1` como opcionales (`essentials`, `scopeLines`,
  `cover`, `chapter.opening`, `chapter.readings[]` con `keyFigure`/`meaning`/`nextStep`), los gráficos `bullet`
  (`data`) y `line`, y `channelId` en series/dimensiones. Un plan sin ellos es v1. `InsightWebModelV1` todavía no los
  proyecta: al hacerlo, trátalos como opcionales. Contrato en arquitectura §6 y §14.8. — por trabajo en TASK-1888

## Delta 2026-09-25 (rediseño Insights)

- **Planificado, no construido.** El contrato editorial v2 de TASK-1888 hará que `InsightWebModelV1` reciba campos
  **opcionales**: lectura por figura («Lo que significa / Próximo paso»), cifra principal con su bajada y `channelId`
  en las series o dimensiones que representan un canal. Son aditivos: un modelo sin ellos sigue siendo válido y el
  render debe funcionar igual; su llegada sigue las reglas de `modelVersion` de esta task.
- El render web respeta los **mismos roles de color de datos** que los PDF de TASK-1889: actual = navy en papel / teal
  en navy; anterior o referencia = teal profundo / periwinkle; oportunidad = coral; ausencia = rayado, nunca un color.
  Teal y coral no pueden ser lo único que separa dos series. Referencia:
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md` (valores como tokens, nunca HEX
  literal). — por trabajo en TASK-1888/TASK-1889

## Delta 2026-09-28 — activación productiva

- WAF de Vercel aplicado y releído sin drift: ambas reglas conservan la condición privada negada
  `x-efeonce-think-key` y el límite 20 req/10 s por IP (`enforce` fuera de producción, `observe` en producción).
- `INSIGHTS_SHARING_ENABLED` quedó en valor exacto `true` en Vercel Production. Redeploy Ready
  `greenhouse-cssemzyzb` (`dpl_Adau69P3EwsUCoLh6J8bTNKhQqbr`) sirve el alias `greenhouse.efeoncepro.com`.
- Canary secuencial por el lane ecosystem sobre `EO-INS-000014`: create 201; Think 200 con `private, no-store`,
  `noindex, nofollow`, `no-referrer` y token ausente del HTML; `deck_pdf` de 329 874 B con magic `%PDF` por el proxy;
  revoke 200; página 410 sin nombre de organización ni código; descarga 303. El grant
  `ishr-df4a4ffa-20f6-475f-b0bb-2d2da51fc188` quedó revocado.
- Producción sigue sirviendo `InsightWebModelV1` 1.0, que Think soporta. El modelo 1.1 queda en staging; no se hizo
  release de Greenhouse. La task permanece in-progress sólo por la prueba automatizada de major no soportada.

## Delta 2026-09-18

- **Desbloqueada por TASK-1848** (en producción 2026-09-18, release `bda1cf2cd938`): el resolver público `GET /api/public/insights/shared/[token]` → `InsightWebModelV1` (`modelVersion '1.0'`, proyección client-facing) y el proxy de descarga `GET …/outputs/[output]` (re-chequea revocación) existen en producción, **con `INSIGHTS_SHARING_ENABLED` OFF** (con el flag OFF responde 404). Respuestas: 404 desconocido/expirado/flag OFF/org suspendida/módulo ausente; 410 revocado/retirado; 429 rate limit (IP 300/60 s, grant 60/20); cabeceras `private, no-store`, noindex, no-referrer, CSP. En staging el flag está ON y el canary sintético corrió completo en la org sandbox (`EO-INS-000015`). **El encendido en producción de sharing/delivery/schedules espera a esta task.** No probar límites con ráfagas concurrentes contra el resolver: una ráfaga de 64 requests dejó 86–88 conexiones ociosas en la base compartida (ISSUE-174 → TASK-1876). — por TASK-1848

## Delta 2026-09-15

- **Rollout 2026-09-15 (TASK-1845):** la foundation de la que deriva `InsightWebModelV1` (contratos `EditorialPlanV1`/`ChartSpecV1`/`EvidenceFactV1` y la proyección por audiencia) ya corre **en producción** con `INSIGHTS_GENERATION_ENABLED=true` en staging y producción (emisión e IA OFF); ediciones sintéticas (org sandbox «Greenhouse Demo»; «producción» nombra el runtime, no el dato) `EO-INS-000012/13` (staging) y `EO-INS-000014` (producción) quedaron `ready_for_review`. El gateway `efeonce-mcp` 1.5.0 federa las 4 tools (47 tools, 8 clases de scope) y el scope `efeonce.mcp.insights.write` existe en Entra (sin cliente que lo porte ⇒ `insufficient_scope` al crear). Detalle: arquitectura §14. Sigue bloqueada por TASK-1848 (resolver público); no hay edición emitida ni grant, así que el primer render se hace sobre fixture del modelo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1875-efeonce-insights-shared-web-render-think.md`
- Flow: `docs/ui/flows/TASK-1875-efeonce-insights-shared-web-render-think-flow.md`
- Motion: `docs/ui/motion/TASK-1875-efeonce-insights-shared-web-render-think-motion.md`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `Think y sharing de Greenhouse operativos en producción: Think bbf8522; WAF sin drift a 20 req/10 s/IP; INSIGHTS_SHARING_ENABLED=true exacto en deployment Ready greenhouse-cssemzyzb; canary ecosystem 201→200/PDF→revoke→410/303, grant revocado. Producción sirve InsightWebModelV1 1.0 soportado; 1.1 sigue en staging y no se hizo release de Greenhouse. Falta la prueba automatizada de major no soportada.`
- Rank: `TBD`
- Domain: `ui|platform|public-site`
- Blocked by: `none`
- Branch: `efeonce-think main (repo hermano, auto-deploy Vercel); documentación y contratos en Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializa la salida `web` de una edición de Efeonce Insights **compartida por token** como página pública
`think.efeoncepro.com/insights/r/<token>` en el hub Astro `efeoncepro/efeonce-think`, render "tonto" de
`InsightWebModelV1` (TASK-1848) con tokens AXIS, gráficos desde `ChartSpecV1`, descargas por proxy y
pantallas seguras para enlace desconocido/expirado/revocado. Greenhouse conserva dato, token y revocación;
Think sólo presenta. Es la decisión del operador del 2026-09-15 (delta del ADR de Insights) hecha task.

## Why This Task Exists

La arquitectura Insights proponía la vista compartida dentro de Greenhouse. El operador decidió renderizarla
en Think, como ya ocurre con el informe del AI Visibility Grader (`/brand-visibility/r/<token>`, TASK-1325),
por libertad editorial y de marca sin heredar MUI ni el chrome del portal, y porque es una pieza que el
cliente reenvía a terceros. TASK-1849 quedó dueña de la experiencia compartida pero su runtime vive en otro
repo con otro stack, otros gates y otro deploy: sin una task propia, ese slice no tiene ID, evidencia GVC
propia ni criterios verificables donde se construye. La pieza además tiene un requisito que el informe del
Grader NO tiene: **revocar debe revocar**, así que el patrón de cache del Grader no se puede copiar sin cambio.

## Goal

- Una edición emitida y compartida se abre en `think.efeoncepro.com/insights/r/<token>` con las MISMAS cifras
  del snapshot sellado (identidad `EO-INS-…`, versión, período, corte por fuente), sin re-derivar nada.
- Revocación, expiración y retirada cortan el acceso en la siguiente lectura; el token nunca llega al browser
  ni a un cache compartido; la página no se indexa ni filtra referrer.
- Descargas de PDF (cuando TASK-1846 exista) sólo por el proxy autorizado de Greenhouse, nunca por URL de storage.
- Acabado enterprise verificado con GVC desktop 1440 + mobile 390 en el repo hermano, con los cuatro estados
  seguros (`not_found`, `gone`, `rate_limited`, `error`) reutilizando el `StatusScreen` de Think.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md` (delta 2026-09-15: render en Think).
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§4, 6, 7.1, 8 (acceso web compartido: resolver por
  request, `InsightWebModelV1`, cabeceras), §10 (gates web: desktop+390px, teclado, reduced motion, contraste,
  `scrollWidth === clientWidth`), §14 (estado real de la foundation).
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` (patrón headless del Grader:
  Greenhouse = dueño del dato/modelo; Think = render tonto; fetch server-side; sin iframe, sin MUI).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (Think es un consumer más del contrato público;
  ninguna lógica de negocio en la página).
- `docs/think/architecture-ui-patterns.md` y `docs/think/reuse-ui-patterns-manual.md` (primitivas y patrones del hub).

Reglas obligatorias:

- **Render tonto.** La página no calcula, no compara, no interpola, no consulta productores ni Greenhouse
  autenticado: sólo dibuja `InsightWebModelV1`. Un dato ausente se muestra como ausencia con su motivo.
- **Resolución por request, sin pre-render ni cache.** `export const prerender = false`; el fetch a Greenhouse
  ocurre en SSR en cada visita; `Cache-Control: private, no-store` (a diferencia del Grader, que cachea 5 min).
- **Token server-side.** El token viaja en la URL y en el fetch SSR; jamás en HTML, `dataLayer`, logs ni analytics.
- **Sin marca cruda.** Colores/tipografía desde `src/lib/report-tokens.ts` (AXIS); nunca HEX inline ni fuentes ad hoc.
- **Sin nuevo transporte de secretos.** El token es el único credencial; no se mintean otros ni se guardan.
- **Repo hermano con Codex concurrente:** stagear rutas explícitas, nunca `git add -A`; Vercel scope `efeonce-7670142f`.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md` y `docs/tasks/TASK_UI_UX_ADDENDUM.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` (norma de marca de informes: URL bubble,
  contacto, eslogan, footer).
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` (scorecard y umbrales; aplica al hub aunque el stack sea Astro).
- `docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md` (master flow del programa; esta superficie es su nodo S6).
- `docs/mcp/skills/efeonce-insights/SKILL.md` y `docs/manual-de-uso/insights/operar-efeonce-insights-api-mcp.md`
  (cómo se produce lo que esta página muestra).
- Repo hermano: `efeonce-think/src/components/primitives/README.md` (catálogo de primitivas: `StatusScreen`,
  `MaturityLadder`, `EngineAvatarGroup`, `ReportIcon`).

## Dependencies & Impact

### Depends on

- **TASK-1848** (bloqueante): endpoint público `GET /api/public/insights/shared/[token]` → `InsightWebModelV1`
  versionado + `GET /api/public/insights/shared/[token]/outputs/[output]` (proxy de descarga con chequeo de
  revocación) + los grants por token. Sin ese contrato no hay nada que renderizar.
- **TASK-1845** (hecha, en develop): `EditorialPlanV1`, `ChartSpecV1`, `EvidenceFactV1` y la proyección por
  audiencia (`src/lib/efeonce-insights/readers/projection.ts`) de los que TASK-1848 deriva el modelo web.
- **TASK-1846** (parcial): sólo para el bloque de descargas; la página debe funcionar sin PDF disponible
  (descargas en `unavailable` declarado), así que NO bloquea el render.
- **TASK-1847** (coordinación): mismas familias `ChartSpecV1` (barras/líneas/pie/donut/dispersión) que el
  catálogo PDF; esta task las dibuja con ECharts en Think, fidelidad semántica, no de píxel.
- Repo `efeoncepro/efeonce-think` (existe, `main`, Astro 7 + Tailwind 4 + GSAP + ECharts; Vercel
  `prj_F4gvS8jmWjvdJ8cTwM6k60R1XydV`, team `efeonce-7670142f`); `GREENHOUSE_API_BASE` ya configurado.

### Blocks / Impacts

- **TASK-1849**: deja de construir la vista compartida; conserva biblioteca/builder/detalle del portal y la
  presentación email. El botón "Copiar enlace" del portal apunta a la URL de esta task.
- **TASK-1848**: el correo con ShareGrant enlaza a `think.efeoncepro.com/insights/r/<token>`; su contrato de
  `InsightWebModelV1` es el que esta task consume (cambios = bump de `modelVersion`).
- **EPIC-046 P09**: los deep links autenticados NO pasan por aquí (van al portal); sólo el ShareGrant.
- `docs/think/README.md` y `architecture-ui-patterns.md`: nuevo patrón "informe compartido revocable".

### Files owned

- **Repo hermano `efeonce-think`** (fuera de este workspace): `src/pages/insights/r/[token].astro`,
  `src/lib/insights.ts` (cliente headless del modelo + clasificación de estado), `src/lib/primitives/*`
  y `src/components/primitives/*` nuevos que nazcan (p.ej. `ChartFigure`, `FactCallout`, `EditionMasthead`),
  `src/components/insights/*`, `scripts/verify-insights-report.mjs` (fixtures del modelo + no-leak), captura
  GVC con `scripts/capture.mjs`.
- En Greenhouse: `docs/ui/wireframes/TASK-1875-efeonce-insights-shared-web-render-think.md`,
  `docs/ui/flows/TASK-1875-efeonce-insights-shared-web-render-think-flow.md`,
  `docs/ui/motion/TASK-1875-efeonce-insights-shared-web-render-think-motion.md`,
  `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/` (dossier GVC copiado desde el hub),
  `docs/think/README.md` + `docs/think/architecture-ui-patterns.md` (patrón nuevo), arquitectura Insights §8/§14.

## Current Repo State

### Already exists

- Greenhouse: dominio `src/lib/efeonce-insights/**` (contratos `EditorialPlanV1`/`ChartSpecV1`/`EvidenceFactV1`,
  `readers/projection.ts` con `projectPlan`/`projectSnapshot`, `canViewEvidence` = sólo emitidas para clientes),
  evento `insights.edition.issued` con `issuedHash`, puerto `InsightSharePort` declarado (TASK-1845).
- Greenhouse: precedente completo del patrón headless — `src/app/api/public/growth/ai-visibility/report/[token]/route.ts`
  (404 indistinto, 429 por IP con `checkPublicReadAllowed`, 502 sanitizado) y
  `src/lib/growth/ai-visibility/report/public-report-response.ts` (`modelVersion` + `header`).
- Think: `src/pages/brand-visibility/r/[token].astro` (SSR, `prerender = false`, fetch server-side vía
  `src/lib/report.ts`, estados por `StatusScreen`), primitivas `StatusScreen` (`not_found|gone|rate_limited|error`
  con personaje 3D de Nexa), `MaturityLadder`, `EngineAvatarGroup`, `ReportIcon`; tokens `src/lib/report-tokens.ts`;
  `scripts/capture.mjs` (GVC desktop+mobile) y `scripts/verify-report.mjs` (fixtures + no-leak).

### Gap

- No existe `InsightWebModelV1` ni el resolver público (TASK-1848) — esta task no puede empezar JSX real hasta
  tener al menos el contrato tipado y un fixture del modelo.
- Think no tiene ninguna página con `no-store` + revalidación por request: el Grader cachea 5 min público;
  copiar ese header rompería la revocación de Insights.
- Think no tiene primitiva de gráfico desde `ChartSpecV1` ni de "hecho con procedencia" (valor + unidad + corte +
  método + ausencia declarada); hoy sus figuras son específicas del Grader.
- No existe el master UI flow de EPIC-045 (se crea con esta task: `docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`).

## Modular Placement Contract

- Topology impact: `public`
- Current home: repo hermano `efeoncepro/efeonce-think` (Astro SSR en Vercel, `think.efeoncepro.com`), ruta
  `src/pages/insights/r/[token].astro`; en Greenhouse sólo contratos y docs (ningún código de render).
- Future candidate home: `public`
- Boundary: consume ÚNICAMENTE `GET /api/public/insights/shared/{token}` (→ `InsightWebModelV1`) y el proxy de
  descarga, ambos de TASK-1848; no importa nada de `src/lib/**` de Greenhouse ni del BFF; el modelo se copia
  como tipo (misma disciplina que `ReportArtifactModel` público: `modelVersion` semver, additive-safe).
- Server/browser split: fetch y clasificación de estado en el frontmatter Astro (SSR); al browser sólo llega HTML
  render-ready + islands de motion/gráficos con datos ya serializados del modelo (nunca el token, nunca URLs de storage).
- Build impact: ECharts ya está en el hub; sin SDK nuevo. Un renderer SVG server-side para gráficos es opcional y,
  si entra, nace como primitiva del hub, no como dependencia pesada.
- Extraction blocker: `none` — es un consumer público sin transacción ni sesión; su única costura es la URL
  del endpoint y el `modelVersion`.

## UI/UX Contract

> Reescrito el 2026-09-28 para describir lo construido y aprobado (dirección A, «tablero de respuestas», web
> nativa). La versión anterior (página editorial con índice lateral y primitivas `EditionMasthead`/`FactCallout`)
> fue rechazada por el operador al verla y no se construyó. Contratos: wireframe, flow y motion declarados en
> `## Status`, reescritos el mismo día.

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: destinatario de un enlace compartido (cliente, jefe del cliente, socio) sin sesión Greenhouse;
  no es el operador ni el cliente autenticado (esos leen en el portal, TASK-1849).
- Momento del flujo: llega desde el correo de entrega (TASK-1848) o desde un enlace copiado (del portal o de esta
  misma página, incluso a un hallazgo puntual); lee la respuesta, abre la evidencia de lo que le importa, la
  presenta en una reunión, descarga el PDF si existe y vuelve días después (o encuentra que expiró).
- Resultado perceptible esperado: en el primer pliegue sabe cuál es la respuesta del mes, para quién es, qué
  período cubre, con qué corte de datos y hasta cuándo vale el enlace; cada cifra trae su procedencia (Medido o
  Estimado, fuente, fecha de corte) y su evidencia está a un toque.
- Fricción que debe reducir: abrir un PDF pesado en el móvil; leer todo para encontrar la conclusión; no saber si el
  dato es medido o estimado; no saber si el enlace sigue vigente; buscar la tabla detrás de un gráfico; armar una
  presentación aparte para la reunión.
- No-goals UX: dashboard vivo, filtros por período, comparar otra edición, editar, comentar, pedir un informe
  nuevo, identificar al visitante, login, selector de cuentas, CTA comercial.

### Surface & system decision

- Surface: página pública SSR `think.efeoncepro.com/insights/r/<token>` con modo presentación en diálogo y estados
  seguros a pantalla completa en la misma ruta.
- Nav placement: `none` — no agrega destino de navegación en Greenhouse; en Think la página no tiene menú (patrón
  del Grader). La navegación interna es la barra fija del propio informe.
- Composition Shell: `no aplica` — Think no usa el shell del portal; composición propia del hub (`BaseLayout` +
  portada, barra fija, tablero de hallazgos, escenas por módulo, plan, metodología, descargas y pie).
- Primitive decision: `new` (feature-local del hub) + `reuse` — nuevos `ChartFigure` (15 familias + tabla
  equivalente + interruptor), `ModuleScene` (escena narrada por capítulo) y `FactMark` (Medido/Estimado por forma)
  en `efeonce-think/src/components/insights/`; reuse `StatusScreen`. No nacen como primitivas compartidas del hub:
  se promueven si otro informe las necesita.
- Adaptive density / The Seam: `no aplica` — no es una card del portal; responsive por quiebres del hub (1000 px y
  720 px), con dock móvil.
- Floating/Sidecar/Dialog decision: un solo diálogo, el modo presentación (`role="dialog"`, `aria-modal`, foco
  atrapado y devuelto). La evidencia de un hallazgo se abre dentro de su tarjeta, no en un modal. Toast de copia
  sin interacción.
- Copy source: `local one-off` del hub en `efeonce-think/src/lib/insights-copy.ts`, con diccionarios es-CL (tuteo)
  y en-US elegidos por `model.locale`; lo editorial viene escrito en el modelo y no se reescribe en Think.
- Access impact: `none` — el token es la autorización; ningún claim, view ni capability en el hub.

### State inventory

- Default: portada con la respuesta del mes y la órbita de acento → barra fija → «Lo esencial del mes» → decisión
  → una escena por capítulo → plan de acción → «Cómo se midió» → descargas → pie compacto.
- Loading: sin spinner; SSR entrega el HTML completo y final. El motion sólo arma lo que ya está; si el script no
  monta en 3 s, se retira y la página queda completa.
- Empty: capítulo sin cifras → una línea con el motivo del modelo; hallazgo sin figura propia → «Este hallazgo no
  tiene una figura propia en esta edición.»; hecho con valor nulo → «Sin dato», nunca un cero.
- Error: Greenhouse 5xx, red caída o `modelVersion` mayor no soportada → `StatusScreen` `error`, HTTP 502, sin nombre
  del cliente ni código.
- Degraded / partial: período abierto → banda navy bajo la portada; descarga sin archivo → «No disponible en esta
  edición» (sin botón) y, si se pide igual por URL, 303 de vuelta al informe; modelo v1 sin campos editoriales v2 →
  hallazgos desde las afirmaciones del resumen, sin decisión ni lecturas.
- Permission denied: `not_found` (desconocido, expirado, malformado o flag OFF, 404 indistinguible) y `gone`
  (revocado o retirado, 410) → `StatusScreen` con Nexa y la marca, sin identidad del cliente, con «Escribir a
  Efeonce»; `rate_limited` (429) → `StatusScreen` con espera.
- Long content: hasta tres módulos con varias figuras cada uno; filtros por módulo en la barra; órbita de avance; el
  fixture extremo (textos y cifras largas, nueve hallazgos) no desborda en 1440 ni 390.
- Mobile / compact: 390 px, portada a `100svh` con órbita reducida, barra de 56 px con filtros desplazables, dock
  inferior con «Copiar enlace» y «Descargar», escenas en una columna con los pasos de corrido, tablas con scroll
  interno; sin scroll horizontal de página.
- Keyboard / focus: skip link a «Lo esencial del mes»; hallazgos con `aria-expanded` y Escape; filtros e
  interruptores con `aria-pressed`; tooltips de barras también al enfocar; presentación con flechas, Re Pág/Av Pág,
  Espacio, Inicio/Fin y Esc, foco atrapado y devuelto al botón. 64–71 paradas de Tab, todas con foco visible.
- Reduced motion: sin órbita en movimiento, reveals, conteo, escenas narradas, entrada de figuras, View Transitions
  ni deslizamiento de láminas; contenido e interacción idénticos.

### Interaction contract

- Primary interaction: leer la respuesta y abrir un hallazgo para ver su evidencia en el lugar; recorrer las escenas
  por módulo (con filtro opcional); presentar; descargar.
- Hover / focus / active: tarjetas de hallazgo, pastillas de filtro, interruptor gráfico/tabla, botones de barra y
  dock con estados visibles (150 ms); grupos de barras atenúan a sus vecinos y muestran su detalle al pasar o
  enfocar; acciones del plan suben 3 px al pasar.
- Pending / disabled: no hay estados pendientes (todo es lectura); una descarga no disponible se muestra como texto,
  nunca como botón deshabilitado; sin descarga disponible, la barra y el dock no muestran «Descargar».
- Escape / click-away: Escape cierra el hallazgo abierto y sale de la presentación; clic en el escenario de la
  presentación avanza; no hay click-away en hallazgos (se cierran con su botón, «Cerrar» o Escape).
- Focus restore: al cerrar un hallazgo, el foco vuelve a su botón; al salir de la presentación, al botón
  «Presentar» (repetido dos cuadros después por la salida de pantalla completa).
- Latency feedback: ninguno en cliente (SSR completo); la descarga responde el archivo o vuelve al informe con 303.
- Toast / alert behavior: «Enlace copiado» en `role="status"` durante 2,2 s (sobre el dock en móvil); la banda de
  período abierto y los límites son estáticos y siempre visibles.

### Motion & microinteractions

- Motion primitive: `CSS` + script propio del hub (`efeonce-think/src/scripts/insights-report.ts`, sin GSAP), con
  View Transitions API como mejora al abrir hallazgos y filtrar.
- Enter / exit: portada — anillo (350 ms), recorrido de la esfera con estela de 50° (1100 ms tras 200 ms), halo,
  anillo «en vivo» en bucle (2400 ms desde 1600 ms) y cuerpo que sube escalonado (900 ms); reveals de 700 ms / 18 px;
  láminas de presentación 500/600 ms con ±40 px.
- Layout morph: la órbita de la portada se aleja al bajar y reaparece pequeña en la barra (`is-stuck`); el hallazgo
  abierto pasa a ancho completo con View Transitions; la figura narrada cambia de estado por paso (`data-step`).
- Stagger: grupos `data-stagger` con 70 ms entre hijos (620 ms); barras con 70 ms entre grupos; celdas del waffle
  con 6 ms entre celdas.
- Timing / easing token: `axisMotion` vía `efeonce-think/src/lib/insights-tokens.ts` — `easeEmphasized`
  `cubic-bezier(0.2, 0, 0, 1)`, `easeStandard` `cubic-bezier(0.4, 0, 0.2, 1)`, 150 ms y 300 ms, `orbitMs`; las
  duraciones de coreografía larga viven en `insights.css` (detalle en el contrato de motion).
- Reduced-motion fallback: `prefers-reduced-motion: reduce` no agrega `.ins-motion`, no monta reveals ni escenas y
  anula toda transición y animación dentro de la página; fail-safe de 3 s (`window.__insMounted`) si el JS no monta.
- Non-goal motion: tablas, metodología, descargas, pie, estados seguros e impresión; ningún parallax ajeno a la
  órbita.

### Implementation mapping

- Route / surface: `efeonce-think/src/pages/insights/r/[token].astro` (SSR, `prerender = false`; `Cache-Control:
  private, no-store`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`; `BaseLayout` con
  `analytics={false}`, canonical genérico e imagen OG sin datos del informe); estados vía `StatusScreen`
  (404/410/429/502).
- Primitive / variant / kind: `ChartFigure` (15 familias: `bar`, `bar_grouped`, `bar_stacked`, `line`, `pie`,
  `donut`, `scatter`, `bullet`, `gauge`, `waterfall`, `funnel`, `heatmap`, `waffle`, `venn_two`, `upset`; tema
  `light|dark`, variante `compact`), `ModuleScene`, `FactMark`, `StatusScreen` (reuse).
- Component candidates: `efeonce-think/src/components/insights/{ChartFigure,ModuleScene,FactMark}.astro`; la portada,
  la barra, el tablero, el plan, las descargas, el pie, el dock y la presentación viven en la página.
- Copy source: `efeonce-think/src/lib/insights-copy.ts` (`INSIGHTS_COPY` es-CL + `INSIGHTS_COPY_EN`,
  `getInsightsCopy(model.locale)`); `<html lang>` sigue al modelo.
- Data reader / command: `efeonce-think/src/lib/insights.ts` → `fetchSharedInsightEdition(token)` contra Greenhouse
  `GET /api/public/insights/shared/[token]` (TASK-1848, `modelVersion` 1.x; 1.1 suma `essentials`, `decision`,
  `measurement`, `ask`, `scopeLines`, `chapter.opening`, `chapter.readings`, `chart.derived.funnelStepRates` y
  `header.clientLogo`), con `x-efeonce-think-key` (excepción del WAF, TASK-1876) y `x-vercel-protection-bypass`
  sólo en staging; `fetchSharedInsightOutput` (`?descargar=`) y `fetchSharedInsightLogo` (`?logo=1`) por la misma
  URL. Vista: `insights-view.ts`; geometría: `insights-chart-geometry.ts`; tokens: `insights-tokens.ts`;
  interacción: `src/scripts/insights-report.ts`; estilos: `src/styles/insights.css`. Sin commands.
- API parity: la misma edición se lee en el portal (TASK-1849) desde los readers autenticados; el modelo web es una
  proyección de los mismos DTOs, así que cifras e identidad coinciden por construcción. La página no expone
  acciones de negocio (lectura, copia de enlace y descarga por proxy gobernado en Greenhouse).
- Access / capability: ninguna en el hub; el grant se valida en Greenhouse en cada request, también en la descarga
  y el logo.
- States to implement: ready, período parcial, capítulo vacío, hallazgo sin figura, descarga no disponible, v1,
  en-US, extremo, not_found, gone, rate_limited, error, móvil, movimiento reducido, presentación e impresión de
  respaldo — todos implementados y cubiertos por fixtures de `astro dev`.

### GVC scenario plan

- Scenario file: `efeonce-think/scripts/capture-insights-report.mjs` (capturas) +
  `efeonce-think/scripts/verify-insights-report.mjs` (estados, cabeceras, no-leak, cifras, desborde, interacción,
  presentación, impresión) + `efeonce-think/scripts/audit-insights-a11y.mjs` (contraste y teclado) +
  `efeonce-think/tests/insights.test.ts` (14 pruebas). El hub no usa el DSL GVC de Greenhouse.
- Route: `/insights/r/fixture-{completo,extremo,en,parcial,v1,sin-descargas,no-existe,retirado,limite,error}` en
  `astro dev` (puerto 4331); los fixtures sólo existen con `import.meta.env.DEV`.
- Viewports: desktop 1440×900 y mobile 390×844 (impresión emulada a 794×1123).
- Quality profile: `premium`
- Required steps: cargar el fixture completo → portada, «Lo esencial», abrir `#h-ess-1`, figura narrada SEO, pasar a
  tabla, capítulos AEO e ICO, descargas, pie; fixture parcial → portada y límites; fixture sin descargas; los cuatro
  estados; abrir la presentación y avanzar.
- Required captures: `first-fold`, `summary`, `finding-open`, `chapter-figure`, `chapter-table-open`, `chapter-aeo`,
  `chapter-ico`, `partial-first-fold`, `limits`, `downloads`, `downloads-unavailable`, `status-not-found`,
  `status-gone`, `status-rate-limited`, `status-error`, `footer` × 2 viewports + `present-cover` y
  `present-finding` en desktop (34 archivos).
- Required `data-capture` markers: `masthead`, `summary`, `chapter-seo|aeo|ico`, `limits`, `methodology`,
  `downloads`, `footer`.
- Assertions: HTTP por fixture; `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, `Referrer-Policy:
  no-referrer`; el HTML nunca contiene el token ni la ruta del lector; sin GTM; cifras del modelo tal cual («16,5 %»,
  «1.284», «#7,4»…); «Sin dato» en vez de cero; tasas del embudo «pasa el 53,7 %»; v1 y en-US; descarga sin archivo →
  303; logo 200/404; hallazgo abre con `aria-expanded`; filtro por módulo; presentación «1 de N» → «2 de N» y Esc con
  foco devuelto; impresión sin controles, con logos en positivo y tablas visibles.
- Scroll-width checks: `scrollWidth - clientWidth === 0` en 1440 y 390, con y sin movimiento reducido, antes y
  después de interactuar, con el fixture extremo y en impresión.
- Reduced-motion / focus evidence: capturas con `reduce`; con `reduce` ningún reveal ni barra queda oculto y la raíz
  no lleva `.ins-motion`; recorrido de Tab (64–71 paradas, todas con foco visible) en 1440 y 390.
- Review dossier: `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/` (README con la reproducción
  y las 34 capturas).
- Baseline decision / surface ID: `think.insights.shared`, superficie nueva; el dossier del 2026-09-28 es la primera
  baseline. Se compara con el Grader sólo por consistencia de marca.

### Design decision log

- Decision: dirección A, «tablero de respuestas», web nativa — portada que responde, hallazgos que se abren como
  evidencia en su lugar, barra fija con filtros por módulo y órbita de avance, una escena narrada por módulo, modo
  presentación y estados seguros a pantalla completa.
- Alternatives considered: (a) vista en el portal con sesión (descartada por el operador el 2026-09-15: peor para
  reenviar); (b) PDF embebido (no responsive ni revocable en vivo); (c) dashboard con filtros de período (la edición
  es congelada); (d) página editorial con índice lateral (construida en canvas y rechazada por el operador el
  2026-09-28: «el PDF con vida»).
- Why this pattern: el destinatario necesita la respuesta y su evidencia, no un documento lineal; el operador pidió
  más impacto (portada a pantalla completa con la órbita, cifras grandes, scrollytelling), todas las familias de
  gráfico en la narrativa y un pie compacto. Cumple §8 de la arquitectura (revocación por lectura, no-leak,
  no-index).
- Reuse / extend / new primitive: reuse `StatusScreen`; nuevos feature-local `ChartFigure`, `ModuleScene` y
  `FactMark`. Reglas de marca aplicadas: una sola órbita por pieza (de acento, porque el modelo no declara cifra de
  portada), acento nunca en texto bajo 24 px (etiquetas de familia en tinta suave), etiquetas de segmentos apilados
  sólo en series oscuras y la del segmento superior sobre la columna (AA); Poppins recortada a siete archivos
  (123 KB). Una descarga ausente en un fixture es deliberada (la edición no la trae), no una capacidad faltante. La
  impresión es respaldo: el PDF descargable es el camino para imprimir.
- Open risks: falta la prueba contra una edición real de staging con un grant sintético (necesita autorización del
  operador); iconografía todavía fuera del set «Trazo» de AXIS; el script de la órbita escribe dos duraciones
  literales (halo 900 ms contra 800 ms del token); rate limit por IP compartida en oficinas, mitigado del lado de
  Think por la llave del WAF.

### Visual verification

- GVC scenario: `capture-insights-report.mjs` + `verify-insights-report.mjs` («Todo verde») +
  `audit-insights-a11y.mjs` (todo AA) + `node --test tests/insights.test.ts` (14 verdes), contra `astro dev` con los
  fixtures del modelo 1.1.
- Viewports: 1440×900 y 390×844.
- Required captures: las 34 del plan, miradas en hoja de contactos y por archivo.
- Required `data-capture` markers: `masthead`, `summary`, `chapter-seo|aeo|ico`, `limits`, `methodology`,
  `downloads`, `footer`.
- Scroll-width check: 0 px en 1440 y 390, con y sin movimiento reducido, tras interactuar y con el fixture extremo.
- Accessibility/focus checks: contraste AA contra el fondo real en 1440 y 390 (fixtures completo y extremo); Tab con
  foco visible en todas las paradas; hallazgos y presentación con foco devuelto; skip link.
- Before/after evidence: sin «before» en runtime (superficie nueva); la versión rechazada con índice lateral quedó
  sólo en el canvas. Dossier con las capturas observadas en
  `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/`.
- Known visual debt: iconografía fuera del set «Trazo» de AXIS (misma deuda que los catálogos PDF, tarea propia);
  tokens de «La órbita» copiados en `insights-tokens.ts` mientras Think no consuma los paquetes privados de AXIS;
  falta la captura contra una edición real de staging.
- Visual scorecard: `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think.scorecard.json` (promedio
  4,56; piso 4,3 en iconografía; fidelidad 4,5; resistencia a plantilla 4,6; veredicto `pass-local`).
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cliente headless + ruta + estados seguros (hub)

- `src/lib/insights.ts`: `fetchSharedInsightEdition(token)` → `{ status: 'ok', model, modelVersion } |
  not_found | gone | rate_limited | error`, mapeando 404/410/429/5xx del endpoint de TASK-1848; valida
  `modelVersion` soportado (major) y trata una major desconocida como `error` con log.
- `src/pages/insights/r/[token].astro`: `prerender = false`; cabeceras `Cache-Control: private, no-store`,
  `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`; `StatusScreen` para los cuatro estados con
  status HTTP correcto; `<meta name="robots" content="noindex">`.
- `scripts/verify-insights-report.mjs`: fixtures del modelo (completo / parcial / capítulo vacío / sin descargas)
  + prueba de no-leak (el HTML renderizado no contiene el token, `actorUserId`, prompts ni URLs de storage).

### Slice 2 — Render editorial del modelo (hub)

- Primitivas `EditionMasthead` (código `EO-INS-…`, título, organización, período con zona, versión, corte máximo
  por fuente), `FactCallout` (valor formateado tal cual viene, unidad, observado/estimado, corte, método, o motivo
  de ausencia) y `ChartFigure` (`ChartSpecV1` → ECharts con baseline 0 en barras, leyenda accesible, y `<table>`
  equivalente desde `tabularEquivalent` resolviendo `factId` → valor).
- Secciones: resumen ejecutivo (claims), capítulo por módulo (claims → figuras → tabla → límites), acciones (sólo
  si el plan las trae), metodología y referencias, descargas (con `unavailable` declarado), footer institucional
  según la norma de marca de informes.
- Copy del chrome en `src/lib/insights-copy.ts` (es-CL) revisado con `greenhouse-ux-writing`.

### Slice 3 — Motion, accesibilidad y responsive (hub)

- Reveal y count-up self-contained con `prefers-reduced-motion` y fail-safe; índice pegajoso desktop / `<details>`
  mobile; skip link; `focus-visible`; contraste AA verificado; `scrollWidth === clientWidth` en 1440 y 390.

### Slice 4 — Evidencia, deploy y documentación (hub + Greenhouse)

- GVC desktop+mobile de los 9 escenarios, dossier + scorecard copiados a `docs/ui/reviews/TASK-1875-…/`.
- Deploy a `main` del hub (auto-deploy Vercel) y verificación live con un token real de staging/producción
  cuando TASK-1848 lo emita; comprobación de revocación en vivo (revocar → siguiente lectura 410).
- Greenhouse: `docs/think/README.md` + `architecture-ui-patterns.md` (patrón "informe compartido revocable"),
  arquitectura Insights §8/§14 (URL final), TASK-1848/1849 (URL de destino), master flow EPIC-045 (nodo S6 = live).

## Out of Scope

- Grants, expiración, revocación, proxy de descarga, correo y recurrencia (TASK-1848); render PDF (TASK-1846/1847);
  biblioteca/builder/detalle autenticados y presentación del correo (TASK-1849).
- Cualquier cálculo, comparación o filtro sobre los datos; identificación del visitante; analytics con token;
  comentarios; login; selector de cuentas; PPTX/DOCX.
- Cambios de código en `greenhouse-eo` (sólo docs); cambios al `InsightWebModelV1` (si el render necesita un
  campo, se pide a TASK-1848 y se bumpea `modelVersion`).

## Detailed Spec

**Contrato que consume (definido por TASK-1848; esta task lo tipa en el hub, no lo inventa):**

```text
GET {GREENHOUSE_API_BASE}/api/public/insights/shared/{token}
  200 → { modelVersion: "1.x", header: { organizationName, reportCode, editionVersion, periodLabel,
          timeZone, issuedAt, asOfMax }, model: InsightWebModelV1, downloads: [{ output, status:
          'available'|'unavailable', href? }] }
  404 → token desconocido o expirado (indistinto, anti-oracle)   410 → revocado/retirado
  429 → rate limit por IP                                        5xx → error sanitizado
GET {GREENHOUSE_API_BASE}/api/public/insights/shared/{token}/outputs/{output}
  200 application/pdf (proxy con chequeo de revocación) | 404/410/429 como arriba
```

`InsightWebModelV1` = proyección client-facing de `EditorialPlanV1` + `EvidenceSnapshot` (hechos ya
formateados por locale con unidad, procedencia y `absentReason`; `ChartSpecV1` con `tabularEquivalent`
resuelto; límites y metodología como texto). Nunca trae `authoringMode`, `modelId`, prompts, historial ni ids de actor.

**Diferencia deliberada con el Grader:** el informe del Grader sirve `Cache-Control: public, max-age=300`;
Insights sirve `private, no-store` y resuelve en cada request porque un grant se revoca. Documentarlo en el
código y en `architecture-ui-patterns.md` para que nadie "unifique" los dos headers.

**Fidelidad de cifras:** el hub imprime `fact.display` (string) tal cual; jamás re-formatea números del modelo.
La prueba `verify-insights-report.mjs` compara el DOM con el fixture, no con cálculos propios.

**Anti-oracle:** los estados `not_found`/`gone` no muestran nombre de organización ni código de reporte.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (cliente + ruta + estados) → Slice 2 (render) → Slice 3 (motion/a11y/responsive) → Slice 4 (evidencia + deploy + docs).
- Slice 1 puede empezar con un **fixture** del modelo antes de que TASK-1848 esté en producción, pero Slice 4
  (verificación live y revocación en vivo) exige TASK-1848 desplegada; no cerrar la task sin ese paso.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se copia el header de cache del Grader y un enlace revocado sigue abriendo | Think / acceso | medium | `no-store` explícito + prueba de revocación en vivo en Slice 4 + comentario en código | Lectura 200 tras revocar (prueba manual) |
| Token o URL de storage filtrados al HTML/analytics | Think / seguridad | low | fetch SSR, no-leak en `verify-insights-report.mjs`, sin `dataLayer` con token | Token visible en HTML/red |
| Drift de `modelVersion` entre repos rompe el render en silencio | Contrato cross-repo | medium | Validar major soportada; major desconocida ⇒ `error` visible, nunca render parcial | 502 con log `unsupported modelVersion` |
| Cifras re-formateadas en el hub difieren del PDF | Fidelidad | medium | Imprimir `display` tal cual; prueba DOM==fixture | Diferencia detectada por el verify |
| Informe indexado o referrer filtra el token | SEO / privacidad | low | `noindex` + `no-referrer` + verificación con `curl -sI` | Aparece en buscadores |
| Proyecto Vercel en scope personal | Infra | low | Ya existe en `efeonce-7670142f`; no crear otro | Deploy en team equivocado |

### Feature flags / cutover

- Sin flag en el hub: la ruta sólo tiene algo que mostrar cuando existe un grant válido (los grants nacen tras
  `INSIGHTS_ISSUANCE_ENABLED` y el sharing de TASK-1848). Publicar la ruta antes de eso sólo produce 404 honestos.
- Cutover = merge a `main` del hub (auto-deploy). Revert = revert del commit en el hub (<5 min vía Vercel).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit en `efeonce-think` (la ruta deja de existir → 404 del hub) | <5 min | sí |
| Slice 2 | revert del commit; el cliente headless queda sin consumer | <5 min | sí |
| Slice 3 | revert del commit | <5 min | sí |
| Slice 4 | revert de docs en Greenhouse + revert del deploy del hub; los grants siguen válidos en Greenhouse | <10 min | sí |

### Production verification sequence

1. Hub en `pnpm dev` con fixtures: verify + GVC desktop/mobile de los 9 escenarios; `pnpm build` verde.
2. Deploy preview del hub apuntando a staging de Greenhouse (bypass Vercel) con un grant sintético de TASK-1848:
   200 con cifras iguales al snapshot, cabeceras correctas (`curl -sI`), descargas `unavailable` o proxy OK.
3. Revocar el grant en staging → siguiente lectura 410; expirar → 404; token inventado → 404 sin identidad.
4. Merge a `main` → verificación live en `think.efeoncepro.com/insights/r/<token>` con un grant de producción
   emitido por un humano autorizado; repetir el paso 3 en producción.
5. Copiar dossier/scorecard a Greenhouse; actualizar docs; comunicar la URL final a TASK-1848 (correo) y
   TASK-1849 (botón "Copiar enlace").

### Out-of-band coordination required

- Repo hermano `efeoncepro/efeonce-think`: commits en `main` disparan deploy productivo del hub — coordinar con
  Codex concurrente (stagear rutas explícitas). Sin DNS ni Vercel nuevos (ya existen desde TASK-1325).
- Un grant real de staging/producción lo emite un humano con `insights.edition.issue` + sharing (TASK-1848);
  esta task no mintea tokens.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

> Evidencia 2026-09-28: `verify-insights-report` «Todo verde» (estados 200/404/410/429/502, cabeceras, no-leak del
> token y sin GTM, cifras del modelo, banda parcial, v1, 303 sin archivo, en-US, caso extremo, ruta del logo, tasas del
> embudo, desborde 1440/390, movimiento reducido, interacción, presentación, impresión); `audit-insights-a11y` todo AA
> y foco visible en 1440/390 (completo, extremo y muestra); 15 pruebas unitarias; canary real en staging con la
> edición sintética `EO-INS-000014` (200 con cabeceras, PDF de 329 874 B por el proxy, 410 tras revocar, 404
> desconocido). El canary productivo por el lane ecosystem confirmó create 201, Think 200, PDF por proxy, revoke 200,
> lectura 410 y descarga 303; el grant quedó revocado. Sin tildar sólo queda la `modelVersion` con major no soportada:
> está en código (`isSupportedModelVersion` ⇒ `error` 502) pero sin prueba automatizada. `EditionMasthead` y
> `FactCallout` no existen como tales: la portada es el `header.ins-hero` de `InsightReport` y el callout quedó como
> `FactMark`; así está documentado en el README de primitivas.

- [x] Se declaro `Execution profile: ui-ux` y `UI impact: layout`; `UI ready` permanece `no` hasta que wireframe,
      flow, motion y `## UI/UX Contract` tengan mapping, GVC plan y decision log materializados con el contrato
      real de TASK-1848; si pasa a `yes`, `pnpm task:lint --task TASK-1875` no reporta findings.
- [x] `think.efeoncepro.com/insights/r/<token>` responde 200 para un grant válido con: código `EO-INS-…`, versión,
      período con zona, corte máximo, resumen, capítulos, figuras con tabla equivalente, límites, metodología y
      descargas; todas las cifras del DOM son iguales al fixture/snapshot (prueba automatizada), sin re-formatear.
- [x] La página se resuelve en cada request (`prerender = false`), sirve `Cache-Control: private, no-store`,
      `X-Robots-Tag: noindex, nofollow` y `Referrer-Policy: no-referrer`; el token no aparece en el HTML, en
      `dataLayer` ni en logs del hub (prueba de no-leak).
- [x] Revocar un grant produce 410 en la siguiente lectura; expirado y desconocido producen 404 indistinto; 429 y
      5xx muestran `StatusScreen`; ninguno de los cuatro estados revela nombre de organización ni código de reporte.
- [x] Un capítulo sin hechos muestra su motivo de ausencia (texto del modelo) y ninguna figura vacía ni cero;
      `period.partial` muestra la banda de período abierto; descargas no disponibles no muestran botón muerto.
- [x] Descargar un PDF disponible pasa por el proxy de Greenhouse (URL relativa al endpoint público), nunca por
      una URL de storage; un grant revocado deja de descargar.
- [ ] Una `modelVersion` con major no soportada produce `error` visible (502 + log), nunca un render parcial.
- [x] Reduced motion elimina count-up, reveal y dibujo progresivo con contenido idéntico; recorrido de teclado
      completo con `focus-visible`; contraste AA; `scrollWidth === clientWidth` en 1440 y 390 (evidencia GVC).
- [x] GVC desktop + mobile de los 9 escenarios capturado, mirado y copiado a
      `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/` con scorecard `average >= 4.5`,
      `floor >= 4`, fidelidad y resistencia a template `>= 4.5`.
- [x] Copy del chrome en `src/lib/insights-copy.ts` (es-CL, revisado); el contenido editorial proviene del modelo
      sin reescritura en el hub.
- [x] `EditionMasthead`, `FactCallout` y `ChartFigure` documentadas en `efeonce-think/src/components/primitives/README.md`
      como primitivas del hub reutilizables.
- [x] `docs/think/README.md`, `architecture-ui-patterns.md`, arquitectura Insights §8/§14, TASK-1848/1849 y el
      master flow EPIC-045 registran la URL final y el estado live.

## Verification

- Hub: `pnpm build` (verdad del hub; ignorar falsos del tsserver), `node scripts/verify-insights-report.mjs`,
  `node scripts/capture.mjs <url> <label>` desktop+mobile por escenario, `curl -sI` de cabeceras.
- Greenhouse: `pnpm task:lint --task TASK-1875`, `pnpm ui:wireframe-check --task TASK-1875`,
  `pnpm ui:flow-check --task TASK-1875`, `pnpm ui:motion-check --task TASK-1875`, `pnpm ops:lint --changed`,
  `pnpm docs:closure-check`.
- Live: token real en staging y producción, revocación en vivo (paso 3 y 4 de la secuencia).

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (TASK-1848 URL del correo, TASK-1849 botón copiar enlace, EPIC-045 nodo S6)
- [x] dossier GVC + scorecard copiados a Greenhouse; docs de Think actualizados; commit del hub referenciado en el Delta de cierre
- [x] Actualizar la skill viva `efeonce-insights` (`references/program-ledger.md`, `architecture-map.md`, `contracts.md`, `operations.md`, `lessons.md`) y espejar a `.codex/` con `pnpm skills:mirrors` verde — contrato de EPIC-045; sin esto la task no pasa a complete.

## Follow-ups

- Renderer SVG compartido para `ChartSpecV1` (PDF y web idénticos) — sólo si la fidelidad semántica resulta
  insuficiente para el operador; no crear preventivamente.
- Consolidar `report-tokens.ts` del hub con el paquete AXIS publicado (deuda desde TASK-1325).
- Medición de consulta útil (entrada → lectura → acción) es de EPIC-046 P09 / TASK-694, sin píxeles ni tokens.

## Open Questions

Sin preguntas que bloqueen el registro. `InsightWebModelV1` y las rutas públicas son propuestas hasta que
TASK-1848 las materialice; el agente que tome esta task confirma el contrato real en Discovery y no inventa
campos. Ruta `/insights/r/<token>` propuesta; si el operador prefiere otro segmento, se fija antes del Slice 4.
