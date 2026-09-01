# TASK-1671 — Growth SEO: superficie de los hallazgos de sitio en la auditoría

## Delta 2026-09-01 — DESBLOQUEADA: `TASK-1670` cerró, y esta task es ahora el gate del agujero

`TASK-1670` está en `complete` con su motor verificado contra red real. Lo que hereda esta task:

1. 🔴 **El punto ciego lo cierra ESTA task, no aquélla.** El flag `GROWTH_SEO_SITE_FINDINGS_ENABLED`
   está OFF y su condición de encendido es que esta superficie esté desplegada. Hasta entonces un
   sitio que bloquea a los crawlers de IA **sigue** puntuando 95/100.
2. **El discriminador ya existe en el dato, no hay que inferirlo:** columna
   `seo_site_audit_findings.finding_scope` (`page` | `site`) y `SeoSiteAuditFindingView.findingScope`
   en el reader canónico. No hace falta heurística por `issue_type` ni por URL.
3. **Los 7 `issue_type` ya tienen ficha es-CL** en `GH_GROWTH_SEO_AUDIT_ISSUES`, con el test de drift
   corriendo contra la unión de ambos allowlists. La de `ai_training_crawlers_blocked` está redactada
   como POSTURA a propósito: no la conviertas en un defecto al renderizarla.
4. **La taxonomía de familias quedó fijada en código** (`AI_CRAWLER_FAMILIES`), con `ChatGPT-User`
   resuelto como retrieval — coincide con lo que el registry de esta task ya declaraba.
5. Existe `site_check_unverified`: es un estado, no un problema. La superficie tiene que poder
   mostrarlo como "no pudimos verificar" sin que se lea como hallazgo ni como sitio sano.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1671-growth-seo-site-findings-audit-surface.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseno aprobado; implementacion pendiente`
- Rank: `TBD`
- Domain: `growth|ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`/admin/growth/seo/audit` presenta los hallazgos como una lista priorizada donde cada grupo
se mide en **"N páginas afectadas"**. Los tres hallazgos que `TASK-1670` agrega —acceso de
crawlers de IA, ausencia de JSON-LD, salud de sitemap— **no son de página, son de dominio**:
renderizados con la maquinaria actual saldrían como "1 página afectada", que es falso y además
los hunde al fondo de una lista ordenada por alcance. Esta task les da tratamiento propio en la
pantalla y, con eso, **desbloquea el flip del flag de `TASK-1670`**.

## Why This Task Exists

Es el bloqueante real de que el agujero se cierre, no un pulido posterior.

`TASK-1670` nace con flag default OFF y su propia `### Slice ordering hard rule` dice, textual:
*"El flag **NO** se prende hasta que `TASK-1671` esté desplegada"*. Es decir: **1670 mergeada y
sin 1671 deja el detector apagado**, y el audit sigue declarando sano un sitio invisible para los
motores de IA. El trabajo de detección no vale nada hasta que exista dónde mostrarlo sin mentir.

Tres cosas concretas están rotas si no se resuelven acá:

1. **La unidad de medida no aplica.** `groupAuditIssues`
   (`src/views/greenhouse/admin/growth/seo/audit/group-audit-issues.ts`) agrupa por `issueType`,
   cuenta `affectedPages` (URLs distintas) y ordena por
   `severidad ▸ (affectedPages × valor ÷ esfuerzo)`. Un `robots.txt` no pertenece a una URL:
   pertenece al dominio. Con `affectedPages = 1` un hallazgo `critical` de sitio queda último
   dentro de su propio tier, debajo de cualquier problema de página con alcance masivo. El orden
   existe justamente para que "400 imágenes sin `alt` no entierren un 5xx" — y acá lo enterraría.

2. 🔴 **Retrieval y training son fallas distintas y el evaluador heredado las mezcla.**
   `AI_CRAWLERS` en `src/lib/growth/ai-visibility/probes/structural/robots-txt.ts:13-24` mete
   **diez** agentes en una sola bolsa y puntúa linealmente
   (`score = allowed.length / total`). Con esa lista, un sitio con **retrieval completamente
   abierto** que sólo bloquea `GPTBot` y `CCBot` —una postura de licenciamiento perfectamente
   legítima, y la que muchos medios adoptaron a propósito— saldría `critical`. Un `critical` falso
   en un documento que lleva nuestro nombre cuesta más que el hallazgo que gana.

3. **El copy no dice qué ni dónde.** Un cliente que lee "bloqueas crawlers de IA", abre su
   `robots.txt`, lo ve limpio y concluye que el informe está equivocado — perdemos el hallazgo
   *y* la credibilidad del resto del reporte. El bloqueo puede estar en el borde (WAF/CDN), que es
   donde más veces está, y el texto tiene que poder decirlo.

## Goal

- Los hallazgos de sitio tienen tratamiento propio en `/admin/growth/seo/audit`, **arriba** de la
  lista priorizada, y **nunca** se cuentan ni se rotulan como "páginas afectadas".
- Un solo sistema de hallazgos: se extiende `groupAuditIssues` y la lista existente con un eje de
  alcance, **no** nace una segunda lista con su propia lógica de orden.
- 🔴 El bloqueo de **retrieval** se presenta `critical`; el bloqueo de **training** se presenta
  `notice` y nombrado como postura de licenciamiento, nunca como falla.
- El copy nombra la **familia** bloqueada y el **lugar** donde se detectó, para que el cliente
  pueda verificarlo sin concluir que el informe miente.
- Con esta superficie desplegada, el flag de `TASK-1670` queda habilitado para el flip.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §1.1 (boundary SEO↔AEO),
  §3/§6 (site audit OnPage, degradación honesta), §10.6 (superficie de auditoría, TASK-1309).
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` — Composition Shell,
  Adaptive Card density, contención de scroll horizontal.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `.claude/skills/seo-aeo/modules/01_SEO_TECHNICAL.md` — §6 (crawlers IA), §5 (datos
  estructurados), §2 (indexación/sitemaps).

Reglas obligatorias:

- 🔴 **Retrieval y training NUNCA comparten severidad.** Bloquear `OAI-SearchBot`,
  `ChatGPT-User` o `PerplexityBot` te saca de la respuesta que el usuario final lee → `critical`.
  Bloquear `GPTBot`, `Google-Extended`, `CCBot` o `Applebot-Extended` es una decisión de
  licenciamiento de contenido → `notice`, jamás `critical`. Presentar la segunda como falla es un
  falso positivo con nuestra firma encima.
- 🔴 **Un hallazgo de sitio NUNCA se rotula ni se cuenta como "N páginas afectadas".** Ni en el
  conteo del grupo, ni en el detalle, ni en el ordenamiento.
- 🔴 **NO nace un segundo sistema de findings.** El alcance es un eje del hallazgo existente
  (`SeoAuditIssueGroup`), no un tipo paralelo con su propio reader, su propio orden y su propia
  ficha es-CL. Dos sistemas divergen y el segundo siempre queda peor mantenido.
- **El copy visible nombra familia y lugar.** El texto tiene que poder decir "no encontramos
  bloqueo en `robots.txt`; el bloqueo se observó al pedir la página" cuando esa es la evidencia.
  Prohibido un genérico tipo "bloqueas crawlers de IA" sin sujeto ni lugar.
- **La vista sigue siendo cliente puro** (contrato de TASK-1309): no calcula salud, no decide
  acceso y no deriva estado del crawl. La única regla con criterio que vive de este lado es la
  priorización, y por eso está extraída y testeada en `group-audit-issues.ts`.
- **Degradación honesta hacia la pantalla**: un hallazgo "no verificado" se ve distinto de
  "verificado y sano" y de "roto". Un fetch fallido jamás se pinta como estado bueno.
- El copy visible reusable vive en `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_AUDIT`,
  `GH_GROWTH_SEO_AUDIT_ISSUES`), nunca literal en JSX.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/to-do/TASK-1670-growth-site-probes-kernel-seo-audit.md` — la task que produce los
  hallazgos y cuyo flag esta task habilita.
- `docs/tasks/to-do/TASK-1672-growth-seo-audit-report-artifact.md` — el artefacto descargable, que
  aplica la misma regla de orden ("los hallazgos de SITIO van ANTES que la lista priorizada porque
  la invalidan").
- `docs/ui/wireframes/TASK-1672-growth-seo-audit-report-artifact.md` — wireframe vigente más
  cercano a esta superficie; declarado en `## Status` porque el tratamiento de los hallazgos de
  sitio debe ser el MISMO en pantalla y en el artefacto. Ver `## Open Questions` punto 1.
- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`

## Dependencies & Impact

### Depends on

- **`TASK-1670`** — **bloqueo duro**. Produce los hallazgos de sitio y decide cómo se marca el
  alcance (columna nueva en `greenhouse_growth.seo_site_audit_findings` o convención en `detail`;
  es su `## Open Questions` punto 2). Sin ese dato la pantalla no puede distinguir sitio de página
  y esta task no tiene qué renderizar.
- `TASK-1309` (`complete`) — `SiteAuditView.tsx`, `group-audit-issues.ts`, las fichas es-CL de
  `GH_GROWTH_SEO_AUDIT_ISSUES` y su test de drift bidireccional. Verificado con datos reales de
  Grupo Berel.
- `TASK-1304` (`complete`) — `readSiteAuditReport` con `run`/`findings`/`totals`/`previous`.

### Blocks / Impacts

- **El flip del flag de `TASK-1670`.** Es la dependencia que motiva esta task: el flag se prende
  sólo cuando esta superficie esté desplegada en producción.
- **`TASK-1672`** (artefacto descargable) — **no publica artefacto** hasta que esto esté ON en
  producción con una corrida real verificada. Un PDF que el cliente reenvía a su agencia
  declarando sano un sitio invisible para la IA es peor que no tener PDF. Además hereda de acá el
  vocabulario de alcance y la separación retrieval/training: los dos rendes deben decir lo mismo.
- `TASK-1673` (compartir/enviar el informe) — aguas abajo de 1672, hereda la misma restricción.

### Files owned

- `src/views/greenhouse/admin/growth/seo/audit/SiteAuditView.tsx`
- `src/views/greenhouse/admin/growth/seo/audit/group-audit-issues.ts`
- `src/views/greenhouse/admin/growth/seo/audit/__tests__/` — casos de alcance de sitio
- `src/lib/copy/growth.ts` — `GH_GROWTH_SEO_AUDIT` (bloque de hallazgos de sitio) y las fichas
  es-CL de los `issue_type` nuevos
- `scripts/frontend/scenarios/` — escenario GVC de la auditoría con hallazgos de sitio
- `docs/ui/wireframes/TASK-1671-growth-seo-site-findings-audit-surface.md` — a crear antes de
  escribir JSX; hoy no existe y por eso `UI ready: no`
- `docs/documentation/` y `docs/manual-de-uso/` — deltas proporcionales del módulo Growth SEO

## Current Repo State

### Already exists

- `src/views/greenhouse/admin/growth/seo/audit/SiteAuditView.tsx` (970 líneas): cliente puro con
  `WorkbenchHeader`, `SurfaceRecipe`, banda de severidad que además filtra
  (`?severity=`), lista priorizada de grupos, y un **drill inline anidado en la fila** del grupo
  (no es una superficie flotante: el comentario del código lo llama "costura, no card") con
  `DataTableShell`, techo de 200 URLs, copiar-al-portapapeles y retorno de foco al disparador.
- `src/views/greenhouse/admin/growth/seo/audit/group-audit-issues.ts`: `SeoAuditIssueGroup` con
  `issueType`, `label`, `hint`, `severity`, `effort`, `value`, `affectedPages`, `findings`,
  `uncatalogued`; `SEVERITY_RANK` absoluto y `priorityScore = affectedPages × VALUE_WEIGHT ÷
  EFFORT_WEIGHT`. Tiene test propio.
- `SEVERITY_PRESENTATION` en la vista: icono + label + tono por severidad, **nunca color solo**
  (8% de daltonismo). Es el molde a seguir para cualquier señal nueva.
- `GH_GROWTH_SEO_AUDIT` y `GH_GROWTH_SEO_AUDIT_ISSUES` en `src/lib/copy/growth.ts`, con el test de
  drift bidireccional contra `findings-map.ts`: un check sin ficha rompe el test, por diseño.
- `SeoSiteAuditFindingView` (`src/lib/growth/seo/contracts.ts:361-366`) = `url`, `issueType`,
  `severity`, `detail`. **Toda fila tiene una `url`** — de ahí sale el "1 página afectada".
- El evaluador heredado con la bolsa única: `AI_CRAWLERS` (10 agentes) y
  `evaluateRobotsForAiBots` en `ai-visibility/probes/structural/robots-txt.ts`.

### Gap

- No existe **eje de alcance** en `SeoAuditIssueGroup`: todo hallazgo se asume de página.
- `affectedPages` es el único indicador de tamaño del grupo, y también un factor del orden. No hay
  camino para un grupo que no se mide en páginas.
- No hay separación **retrieval vs training** en ninguna capa: el probe heredado puntúa los 10
  agentes por igual y no expone las dos familias.
- El copy no tiene vocabulario para "dónde se detectó el bloqueo" ni para "no verificado".
- No existe `docs/ui/wireframes/TASK-1671-growth-seo-site-findings-audit-surface.md`.
- No hay escenario GVC que cubra la auditoría con hallazgos de sitio presentes.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/admin/growth/seo/audit/` servido por `src/app/(dashboard)/admin/growth/seo/audit/page.tsx`
- Future candidate home: `portal`
- Boundary: consume `readSiteAuditReport` de `@/lib/growth/seo`; la vista no lee Postgres ni decide acceso
- Server/browser split: la page server resuelve sesión, acceso y reporte; el cliente sólo presenta y agrupa
- Build impact: `none` — sin dependencia nueva, sin input de filesystem, sin entrypoint global
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno de Growth con `growth.seo.observation.read` sobre el Space; en
  segunda instancia el cliente, vía el artefacto de `TASK-1672` que hereda este tratamiento.
- Momento del flujo: nodo S4 de EPIC-022 — el operador abre la auditoría para responder
  "¿qué ataco primero?" antes de una conversación con el cliente o su agencia.
- Resultado perceptible esperado: los problemas que afectan al **dominio entero** se leen primero
  y se entienden como tales; el operador puede repetir en voz alta qué familia de crawlers está
  bloqueada y dónde, sin abrir el `robots.txt`.
- Fricción que debe reducir: hoy el operador tendría que deducir que "1 página afectada" en un
  hallazgo de `robots.txt` significa "todo el sitio". Esa deducción no ocurre y el hallazgo se
  pierde en el fondo de la lista.
- No-goals UX: no se rediseña la lista priorizada, ni la banda de severidad, ni el drill. No se
  agrega un tablero nuevo ni una ruta nueva.

### Surface & system decision

- Surface: `/admin/growth/seo/audit` — la misma pantalla, con una región nueva por encima de la
  lista priorizada.
- Nav placement: `none` — no agrega destino de navegación visible; la ruta ya existe y está
  registrada.
- Composition Shell: `aplica` — la pantalla ya se compone con `WorkbenchHeader` + `SurfaceRecipe`;
  la región nueva es otra región de esa composición, no un grid ad-hoc.
- Primitive decision: `reuse` — `SurfaceRecipe`, `GreenhouseChip` para el chip de alcance,
  `EmptyState` para el caso "sin hallazgos de sitio", `DataTableShell` sólo donde ya se usa.
  El chip de alcance es una variante de uso de `GreenhouseChip`, no una primitive nueva.
- Adaptive density / The Seam: `aplica` — la región vive dentro del mismo contenedor que ya usa
  `useContainerDensity`; los hallazgos de sitio deben ser legibles en la densidad compacta.
- Floating/Sidecar/Dialog decision: no aplica — el detalle de un hallazgo de sitio reusa el drill
  inline existente, anidado en su propia fila. No se introduce ninguna superficie flotante.
- Copy source: `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_AUDIT`, `GH_GROWTH_SEO_AUDIT_ISSUES`)
- Access impact: `none` — misma capability, misma ruta, mismo `module_assignment`.

### State inventory

- Default: región de hallazgos de sitio con 1..n hallazgos, ordenados por severidad; debajo, la
  lista priorizada de página sin cambios.
- Loading: sin cambio — la page es server-rendered y el reporte llega resuelto.
- Empty: **dos vacíos distintos y visualmente distinguibles** — "sitio verificado y sin hallazgos"
  (positivo, con la marca de qué se verificó) vs "no se pudo verificar" (neutro, con la razón).
  Confundirlos es el modo de falla más caro de esta pantalla.
- Error: el reporte falla completo → el estado de error existente de la vista, sin cambio.
- Degraded / partial: parte de los hallazgos verificados y parte no. La región muestra ambos, cada
  uno con su marca; nunca se oculta lo no verificado.
- Permission denied: sin cambio — resuelto en la page server antes de renderizar.
- Long content: el tope de hallazgos de sitio es chico y acotado por el catálogo; no requiere
  virtualización. El drill de un hallazgo de sitio no lista URLs.
- Mobile / compact: a 390px la región apila; el chip de alcance no se trunca y no aparece scroll
  horizontal de página.
- Keyboard / focus: abrir y cerrar el drill de un hallazgo de sitio conserva el retorno de foco al
  disparador, igual que los grupos de página (`triggerId`).
- Reduced motion: hereda el `useReducedMotion` de la vista; sin efecto nuevo.

### Interaction contract

- Primary interaction: leer. La región es informativa; la acción secundaria es abrir el drill para
  ver la evidencia (qué agentes, dónde se observó, con qué fecha).
- Hover / focus / active: mismos estados del disparador de grupo existente.
- Pending / disabled: no aplica — la región no dispara comandos.
- Escape / click-away: cerrar el drill con `Escape`, igual que el comportamiento actual.
- Focus restore: al disparador del hallazgo, por `id` estable.
- Latency feedback: no aplica — sin fetch propio.
- Toast / alert behavior: el copiar-al-portapapeles del drill conserva su feedback actual.

### Motion & microinteracciones

- Motion primitive: `framer layout` — la existente de la vista, sin agregar nada.
- Enter / exit: hereda la apertura y cierre del drill ya implementada.
- Layout morph: ninguno nuevo.
- Stagger: ninguno.
- Timing / easing token: `MOTION_DURATION_S` / `MOTION_EASE` ya importados por la vista.
- Reduced-motion fallback: hereda `useReducedMotion`.
- Non-goal motion: no se anima la aparición de la región nueva ni los conteos de sitio.

### Implementation mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/audit/page.tsx` →
  `src/views/greenhouse/admin/growth/seo/audit/SiteAuditView.tsx`
- Primitive / variant / kind: `SurfaceRecipe` (región), `GreenhouseChip` (chip de alcance),
  `EmptyState` (los dos vacíos), `SEVERITY_PRESENTATION` (icono + label + tono, nunca color solo).
- Component candidates: región nueva dentro de `SiteAuditView`; el eje de alcance y la exclusión
  del hallazgo de sitio del cálculo de `priorityScore` van en `group-audit-issues.ts`, que ya tiene
  test propio.
- Copy source: `GH_GROWTH_SEO_AUDIT` (títulos, vacíos, etiquetas de alcance, lugar de detección) y
  `GH_GROWTH_SEO_AUDIT_ISSUES` (fichas de los `issue_type` nuevos, con su `effort` y `value`).
- Data reader / command: `readSiteAuditReport` — **sin cambio de shape**. Los hallazgos de sitio
  llegan como filas más de `seo_site_audit_findings`, con la marca de alcance que entrega
  `TASK-1670`.
- API parity: `N/A — no capability`. Esta task no introduce ni modifica una acción de negocio: es
  presentación de un reader existente. El contrato programático de los hallazgos ya existe y lo
  consumen por igual la UI, Nexa y el lane MCP (`site-audit-report`).
- Access / capability: `growth.seo.observation.read` + `module_assignment`, sin cambio.
- States to implement: default, los **dos** vacíos, degradado parcial, mobile 390px, foco/teclado.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-site-audit-site-findings.mjs`
- Route: `/admin/growth/seo/audit`
- Viewports: desktop 1440 + mobile 390
- Quality profile: `premium`
- Required steps: cargar el Space con hallazgos de sitio presentes; capturar el primer fold; abrir
  el drill de un hallazgo de sitio; capturar; cerrar y verificar el retorno de foco; cargar un
  Space sin hallazgos de sitio verificados para el vacío "no verificado".
- Required captures: primer fold desktop, primer fold mobile, drill de hallazgo de sitio, vacío
  positivo, vacío "no verificado".
- Required `data-capture` markers: `seo-audit-site-findings`, `seo-audit-site-finding-drill`,
  y los existentes `seo-audit-drill` de los grupos de página.
- Assertions: ningún nodo de la región de sitio contiene el texto de "páginas afectadas"; el
  hallazgo de retrieval muestra tono `error` y el de training tono `info`; el vacío positivo y el
  vacío "no verificado" tienen copy distinto.
- Scroll-width checks: sin scroll horizontal de página en 1440 ni en 390.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion` y evidencia del retorno de
  foco al cerrar el drill de un hallazgo de sitio.
- Review dossier: `pnpm fe:capture:review growth-seo-site-audit-site-findings`
- Baseline decision / surface ID: `seo-site-audit`; el fold cambia, así que se rebaselinea
  declarándolo en `BASELINE_DELTAS.md`.

### Design decision log

- Decision: los hallazgos de sitio son una **región propia por encima de la lista priorizada**,
  y el alcance es un **eje del hallazgo existente** (chip «sitio» / «página»), no un tipo nuevo.
- Alternatives considered: (a) dejarlos en la misma lista con un chip y sin región propia —
  rechazado porque el orden por `affectedPages` los hunde y el problema no es sólo de rótulo;
  (b) una lista separada con su propio reader y su propio orden — rechazado porque duplica el
  sistema de findings y el segundo siempre queda peor mantenido; (c) subirlos artificialmente el
  ranking con un `affectedPages` sintético igual al total de páginas — rechazado por deshonesto:
  inventa un dato para ganar una posición.
- Why this pattern: es el mismo criterio que `TASK-1672` ya fijó para el artefacto —los hallazgos
  de sitio van antes porque **invalidan** la lista priorizada—. Pantalla y documento cuentan la
  misma historia en el mismo orden.
- Reuse / extend / new primitive: `reuse` en todo; se **extiende** `SeoAuditIssueGroup` con el eje
  de alcance y se ajusta `priorityScore` para que no aplique a hallazgos de sitio.
- Open risks: la marca de alcance la define `TASK-1670`; si llega como convención dentro de
  `detail` en vez de columna, la vista queda leyendo un JSON no tipado. Ver `## Open Questions`.

### Visual verification

- GVC scenario: `growth-seo-site-audit-site-findings`
- Viewports: desktop 1440 + mobile 390
- Required captures: las cinco listadas en `### GVC scenario plan`
- Required `data-capture` markers: `seo-audit-site-findings`, `seo-audit-site-finding-drill`
- Scroll-width check: sí, en ambos viewports
- Accessibility/focus checks: contraste del tono `notice` sobre el fondo de la región; retorno de
  foco al disparador; severidad comunicada con icono + label además del tono
- Before/after evidence: `pnpm fe:capture:diff` contra la captura previa del mismo surface ID
- Known visual debt: ninguna declarada al crear la task
- Visual scorecard: `docs/ui/reviews/TASK-1671-growth-seo-site-findings-audit-surface.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

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

### Slice 1 — Wireframe y contrato de severidad hacia TASK-1670

- `docs/ui/wireframes/TASK-1671-growth-seo-site-findings-audit-surface.md` con
  `## Implementation Mapping`, `## GVC Scenario Plan` y `## Design Decision Log` sustantivos:
  regiones reales, los dos vacíos con su copy es-CL, el chip de alcance, y el tratamiento de las
  dos familias de crawlers. Doc robusto, no relleno para el gate.
- `## Delta` en `TASK-1670` con los criterios exigibles **como checkboxes en su
  `## Acceptance Criteria`**, no como prosa: (a) el bloqueo de retrieval y el de training se
  materializan como `issue_type` **distintos**, con severidad `critical` y `notice`
  respectivamente; (b) el `detail` del hallazgo transporta qué agentes se evaluaron, cuáles están
  bloqueados y **dónde** se observó el bloqueo; (c) la marca de alcance sitio/página es legible sin
  adivinar.
- `UI ready` pasa a `yes` sólo al cerrar este slice con `pnpm task:lint --task TASK-1671` limpio.

### Slice 2 — Eje de alcance en la agrupación

- `SeoAuditIssueGroup` gana el eje de alcance (`site` | `page`).
- `priorityScore` deja de aplicarse a hallazgos de sitio: se ordenan por severidad y no compiten
  por alcance con los de página.
- `affectedPages` no se calcula ni se expone para hallazgos de sitio.
- Tests en `group-audit-issues`: un hallazgo de sitio `critical` no queda detrás de un hallazgo de
  página `critical` con miles de URLs; un hallazgo de sitio nunca reporta conteo de páginas.

### Slice 3 — Región de hallazgos de sitio en la vista

- Región nueva en `SiteAuditView` por encima de la lista priorizada, con `data-capture`.
- Chip de alcance «sitio» en cada hallazgo, con icono + label (nunca color solo).
- Los dos vacíos distinguibles: verificado-y-sano vs no-verificado con razón.
- El drill de un hallazgo de sitio muestra la evidencia (familia de agentes, lugar de detección,
  fecha) y **no** muestra tabla de URLs.
- Copy nuevo en `GH_GROWTH_SEO_AUDIT` + fichas es-CL de los `issue_type` nuevos en
  `GH_GROWTH_SEO_AUDIT_ISSUES`, validado con la skill de UX writing.

### Slice 4 — Evidencia GVC y cierre documental

- Escenario GVC con las cinco capturas, desktop + mobile, `qualityProfile: premium`.
- Scorecard con el umbral declarado; revisar el frame real, no sólo el gate.
- Delta en la doc funcional y el manual del módulo Growth SEO.
- `FEATURE_FLAG_STATE_LEDGER.md`: la fila del flag de `TASK-1670` pasa a "habilitado para flip",
  con esta task nombrada como la condición cumplida.

## Out of Scope

- **Detectar** los hallazgos de sitio: eso es `TASK-1670`. Acá sólo se presentan.
- **Cambiar la severidad en el backend**: la separación retrieval/training la implementa
  `TASK-1670`; esta task la especifica como contrato y la verifica en pantalla.
- **El artefacto descargable** (`TASK-1672`) y su envío (`TASK-1673`).
- Rediseñar la lista priorizada de página, la banda de severidad o el drill existente.
- Tocar el scoring del grader AEO, sus ejes o el probe heredado en `ai-visibility/**`.
- Agregar ruta nueva, capability nueva o destino de navegación nuevo.
- `core_web_vitals` y `llms-txt`, fuera de alcance también en `TASK-1670`.

## Detailed Spec

### Las dos familias de crawlers, y por qué la lista heredada no sirve tal cual

`AI_CRAWLERS` (`robots-txt.ts:13-24`) contiene diez agentes tratados por igual. Para un score
agregado del grader eso es defendible; para un hallazgo client-facing con severidad, no.

| Familia | Agentes | Qué pasa si los bloqueas | Severidad |
|---|---|---|---|
| **Retrieval / on-demand** | `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `anthropic-ai`, `Bytespider` | El motor no puede traer tu página al momento de responder: quedas fuera de la respuesta que el usuario lee | `critical` |
| **Training / licenciamiento** | `GPTBot`, `Google-Extended`, `CCBot`, `Applebot-Extended` | El modelo no entrena con tu contenido. Es una postura de derechos, adoptada a propósito por muchos publishers | `notice` |

Con la bolsa única, un sitio que bloquea sólo `GPTBot` y `CCBot` —retrieval intacto— puntúa
`8/10 permitidos` y, con un umbral ingenuo, sale `critical`. El operador lo lleva a una reunión, el
cliente responde "eso lo decidimos nosotros y a propósito", y todo lo demás del informe pierde peso.
El caso inverso también importa: bloquear `PerplexityBot` y nada más es **un solo agente** de diez
y aún así es la falla más cara del sitio.

La regla operativa: **la severidad la decide la familia, nunca el conteo.**

### Cuál familia y dónde — el copy que evita que nos desmientan

El hallazgo debe poder decir tres cosas por separado, porque son tres verdades distintas:

1. **Qué familia** está bloqueada (retrieval o licenciamiento) y **qué agentes** concretos.
2. **Dónde se observó**: directiva en `robots.txt`, o respuesta del borde (WAF/CDN) al pedir la
   página con ese User-Agent. Un cliente con `robots.txt` limpio que lee "bloqueas crawlers de IA"
   concluye, razonablemente, que el informe está equivocado.
3. **Cuándo** se midió, porque un bloqueo de borde puede cambiar sin que nadie toque el repo.

Si `TASK-1670` sólo puede evidenciar `robots.txt`, el copy lo dice así y no generaliza. Prometer
menos y ser exacto es la única postura sostenible en un documento que se reenvía.

### Por qué región propia y no sólo un chip

El chip resuelve el rótulo; no resuelve el **orden**. `priorityScore` multiplica por
`affectedPages`, así que un hallazgo de dominio con alcance 1 se hunde dentro de su tier aunque sea
`critical`. Y subirle un `affectedPages` sintético para que gane posición sería inventar un dato.
La salida honesta es sacarlo de esa competencia: los hallazgos de sitio se ordenan sólo por
severidad, viven arriba, y la lista priorizada sigue siendo exactamente lo que era.

Es además la regla que `TASK-1672` ya escribió para el documento: los hallazgos de sitio van antes
porque **invalidan** la lista priorizada. Pantalla y PDF deben coincidir; si divergen, el cliente
va a creerle al PDF.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1670` mergeada (con su flag OFF) → Slice 1 (wireframe + contrato de severidad) →
  Slice 2 (eje de alcance) → Slice 3 (región en la vista) → Slice 4 (GVC + cierre).
- El Slice 1 **precede** al código: el `## Delta` en `TASK-1670` fija la severidad por familia, y
  si ese contrato se decide después, la pantalla queda presentando un `critical` que no debía serlo.
- **El flip del flag de `TASK-1670` ocurre después del Slice 4**, con la evidencia GVC mirada. No
  antes, ni "en paralelo para probar".
- `TASK-1672` no publica artefacto hasta que este flag esté ON en producción con una corrida real
  verificada contra un dominio conocido.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un bloqueo de training se presenta como `critical` y el informe pierde credibilidad ante el cliente | UI / reputación | **high si no se cuida** | Dos `issue_type` distintos con severidad fija por familia, contratados con `TASK-1670` en el Slice 1; assertion GVC de que el hallazgo de training rinde tono `info` | Revisión del frame GVC; feedback de operador tras la primera corrida real |
| Un hallazgo de sitio se rotula o se cuenta como "N páginas afectadas" | UI | high | `affectedPages` no se calcula para alcance de sitio; assertion GVC de ausencia del texto en la región | Assertion del escenario GVC |
| Un hallazgo de sitio `critical` queda debajo de uno de página por el `priorityScore` | UI | medium | Se excluye del cálculo y se ordena sólo por severidad; test en `group-audit-issues` | Test unitario en CI |
| El vacío "no verificado" se lee como "sitio sano" | data quality / UI | **high si no se cuida** | Dos vacíos con copy e iconografía distintos, ambos capturados en GVC | Captura GVC del vacío neutro |
| Nace un segundo sistema de findings paralelo al existente | UI / mantenibilidad | medium | El alcance es un eje de `SeoAuditIssueGroup`; revisión de que no aparece un reader ni un orden nuevo | Revisión del diff del Slice 2 |
| La marca de alcance llega como convención dentro de `detail` y la vista queda leyendo JSON no tipado | contrato | medium | Se pide columna en el `## Delta` a `TASK-1670`; si el plan decide `detail`, se tipa y valida en el borde de la vista | `pnpm typecheck` y el test de la agrupación |
| El copy generaliza y el cliente desmiente el hallazgo con su `robots.txt` abierto | reputación | medium | Copy que nombra familia y lugar de detección; validado con la skill de UX writing antes de escribirlo en JSX | Revisión de copy en el Slice 3 |
| Scroll horizontal de página a 390px por el chip de alcance | UI | low | Chip que no trunca ni fuerza ancho; `scroll-width check` en ambos viewports | Escenario GVC |

### Feature flags / cutover

- Esta task **no introduce flag propio**. Su cutover es el del flag de `TASK-1670`: la superficie
  se despliega con el flag todavía OFF (la región simplemente no tiene hallazgos que mostrar y cae
  en el vacío positivo), y el flip ocurre después, cuando la evidencia GVC está mirada.
- Revert: `revert PR` + redeploy. Como el flag de 1670 sigue siendo el interruptor real, apagarlo
  restituye el comportamiento previo aunque el código de esta task ya esté desplegado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `revert PR` — doc-only más el delta en `TASK-1670` | ~5 min | si |
| Slice 2 | `revert PR` — el eje de alcance es aditivo y nadie más lo consume todavía | ~5 min | si |
| Slice 3 | `revert PR` + redeploy; o flag de `TASK-1670` a OFF, que vacía la región sin tocar código | ~10 min | si |
| Slice 4 | `revert PR` — evidencia y docs, sin efecto de runtime | ~5 min | si |

### Production verification sequence

1. Desplegar con el flag de `TASK-1670` en **OFF**: confirmar que la auditoría se ve igual que
   antes y que la región nueva cae en el vacío correcto sin ruido visual.
2. Flag ON en staging contra un dominio conocido: comparar cada hallazgo de sitio con el
   `robots.txt` y el sitemap reales del sitio, uno por uno.
3. Verificar el vacío "no verificado" contra un dominio inalcanzable.
4. Capturar GVC desktop + mobile en staging y **mirar los frames**, no sólo el gate.
5. Verificar que ningún nodo de la región dice "páginas afectadas".
6. Revisión humana del copy con un caso real donde el bloqueo sea de training: confirmar que se lee
   como postura, no como falla.
7. Recién entonces, flip del flag en producción y corrida real verificada.
8. Después de eso, y sólo después, `TASK-1672` queda habilitada para publicar artefacto.

### Out-of-band coordination required

- Coordinación con quien ejecute `TASK-1670` para el contrato de severidad por familia y la marca
  de alcance. Es la única dependencia externa y es interna de planificación.
- El flip del flag toca env vars del **ops-worker** (`services/ops-worker/deploy.sh` + aplicación en
  vivo) y es propiedad de `TASK-1670`; esta task sólo declara la condición cumplida.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: layout`.
- [ ] Existe `docs/ui/wireframes/TASK-1671-growth-seo-site-findings-audit-surface.md` con
      `## Implementation Mapping`, `## GVC Scenario Plan` y `## Design Decision Log` sustantivos, y
      `## Status` apunta a él.
- [ ] `UI ready` permanece `no` hasta que ese wireframe y el `## UI/UX Contract` estén completos;
      si pasa a `yes`, `pnpm task:lint --task TASK-1671` sale sin findings.
- [ ] `SeoAuditIssueGroup` tiene un eje de alcance con dos valores y los hallazgos de sitio no
      calculan ni exponen `affectedPages`.
- [ ] Un hallazgo de sitio `critical` se lista **antes** que cualquier hallazgo de página, sin
      importar cuántas URLs afecte el de página — cubierto por test en `group-audit-issues`.
- [ ] Ningún nodo renderizado de la región de sitio contiene el texto de "páginas afectadas",
      verificado por assertion en el escenario GVC.
- [ ] El bloqueo de **retrieval** se presenta `critical` y el de **training** se presenta `notice`,
      con `issue_type` distintos y copy que los nombra como cosas distintas.
- [ ] El copy de un hallazgo de bloqueo nombra la **familia** de agentes y el **lugar** donde se
      detectó; no existe un texto genérico sin sujeto ni lugar.
- [ ] Los dos vacíos —verificado-y-sano y no-verificado-con-razón— tienen copy e iconografía
      distintos y ambos están capturados en GVC.
- [ ] El copy visible nuevo vive en `src/lib/copy/growth.ts` y el test de drift bidireccional de
      `TASK-1309` pasa.
- [ ] La severidad se comunica con icono + label además del tono, nunca color solo.
- [ ] No nació un reader nuevo, ni una lista paralela, ni una ruta nueva, ni una capability nueva.
- [ ] GVC desktop 1440 + mobile 390 capturado y **mirado**, con las cinco capturas declaradas y el
      scorecard sobre el umbral.
- [ ] Sin scroll horizontal de página en desktop ni en 390px.
- [ ] El retorno de foco al cerrar el drill de un hallazgo de sitio funciona con teclado.
- [ ] `TASK-1670` recibió su `## Delta` con los criterios de severidad por familia **como
      checkboxes en su `## Acceptance Criteria`**.
- [ ] Está declarado, en esta task y en `TASK-1672`, que el artefacto no se publica hasta que este
      flag esté ON en producción con una corrida real verificada.
- [ ] `pnpm task:lint --task TASK-1671` reporta `template=1 errors=0`.

## Verification

- `pnpm local:check`
- `pnpm local:check:ui`
- `pnpm vitest run src/views/greenhouse/admin/growth/seo src/lib/copy`
- `pnpm fe:capture growth-seo-site-audit-site-findings --env=staging`
- `pnpm fe:capture:review growth-seo-site-audit-site-findings`
- `pnpm ui:quality` y `pnpm ui:visual-gate`
- `pnpm task:lint --task TASK-1671` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `pnpm test` (suite completa) + `pnpm build` (producción) como gate de cierre, **con autorización
  explícita del operador antes de correr el build**.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §10.6 actualizado con el tratamiento de alcance
      sitio vs página en la superficie de auditoría.
- [ ] `FEATURE_FLAG_STATE_LEDGER.md`: la fila del flag de `TASK-1670` declara que la condición de
      flip quedó cumplida, con la fecha y la evidencia.
- [ ] `TASK-1672` recibió un `## Delta` con la restricción de no publicar artefacto antes del flip
      verificado, y con el vocabulario de alcance que hereda de esta superficie.

## Follow-ups

- Detección del bloqueo de borde (WAF/CDN) además de `robots.txt`: si `TASK-1670` entrega sólo la
  directiva, el hallazgo queda incompleto para los sitios donde el bloqueo vive en el borde. Task
  aparte, con su propio presupuesto de fetch.
- Serie de tiempo del acceso de crawlers: el módulo se vende como serie, y "bloqueado desde el
  crawl del 12" es más accionable que "bloqueado".

## Open Questions

1. **¿El wireframe declarado en `## Status` se reemplaza por el propio?** Hoy apunta a
   `docs/ui/wireframes/TASK-1672-growth-seo-audit-report-artifact.md`, que es el doc vigente más
   cercano y comparte el criterio de orden, pero no describe esta pantalla. El Slice 1 crea
   `docs/ui/wireframes/TASK-1671-growth-seo-site-findings-audit-surface.md` y `## Status` debe
   apuntar ahí antes de escribir JSX. Se deja declarado explícito para que nadie lo lea como que la
   superficie ya tiene wireframe propio.
2. **¿El chip de alcance aparece también en los hallazgos de página?** Marcar sólo los de sitio es
   más limpio visualmente; marcar ambos hace el eje explícito y evita que el chip se lea como una
   etiqueta especial de un caso raro. Propuesta: sólo en los de sitio, porque «página» es el caso
   por defecto y rotularlo es ruido en cientos de filas.
3. **¿`Bytespider` cuenta como retrieval?** Es el crawler de ByteDance y su uso real es ambiguo
   entre entrenamiento y alimentación de producto. Propuesta: dejarlo en retrieval y decirlo en la
   ficha, porque el costo de subestimarlo es quedar fuera de una respuesta y el de sobreestimarlo
   es un `critical` discutible. Decidir en Discovery junto con `TASK-1670`.
4. **¿La marca de alcance llega como columna o dentro de `detail`?** Es la `## Open Questions`
   punto 2 de `TASK-1670`. La columna es lo que esta superficie necesita; si el plan elige
   `detail`, esta task tiene que tipar y validar en el borde de la vista y eso cambia el Slice 2.
