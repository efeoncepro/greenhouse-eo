# Commercial / Tenders — invariantes operativos para agentes

> **Tipo:** Companion de invariantes (load-on-demand)
> **Versión:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Cargar al tocar:** `src/lib/commercial/tenders/**` · `docs/architecture/tender-deck-composer-prototypes/**` · `scripts/commercial/compose-tender-deck.ts` · cualquier oferta/deck/propuesta de licitación
> **Contrato completo:** `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` (el deck) · `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (el aggregate; **leer su §0 — estado real**) · `docs/research/RESEARCH-007-commercial-public-tenders-module.md` (discovery público)
> **Skills:** `greenhouse-public-private-tenders` (método) + `deck-studio` (argumento, composición y
> entrega del deck) + `deck-visual-system.md` (el deck) + `bid-construction-playbook.md` (las 10 fases)

---

## Estado real del dominio (2026-07-12, post TASK-1393 Slices 0-4) — no asumas de más

| Pieza | Estado |
|---|---|
| **Artifact Composer** (selector · validate · slot-fill · dispatch de resolvers · geometría · render hermético · output targets) | ✅ shipped, **`src/lib/artifact-composer/**`** — primitive domain-free package-shaped; frontera mecánica (allowlist test + eslint); **cero Next-isms** (sin `server-only`/shim) |
| **Catálogo `deck-axis`** (28 plantillas + registry + contratos + 18 resolvers + validadores semánticos + timeline/agenda hooks + molde compilado + assets) | ✅ **`src/lib/artifact-composer/catalogs/deck-axis/`** — 28/28 componibles (2026-07-14: +`TeamGalleryFull`, +2 en la sesión previa); **cero HEX de marca** (todo sale de `deck-tokens.css`); recipes de gradiente como dato; fuentes locales del pack |
| **Brand pack `axis`** (snapshot Figma PPT + ledger 78 bases + roles + font pack OFL + guard WCAG advisory) | ✅ `src/lib/artifact-composer/brand-packs/axis/` — compilado por `pnpm composer:brand-pack`; ⚠️ **71 altas `figma.status=proposed`** pendientes de validación del operador en `Sistema Axis - PPT` |
| **Gate estético**: baseline 51 frames (28 sintéticos + deck SKY 23) + `pnpm composer:visual-gate` a **0 píxeles** + `BASELINE_DELTAS.md` dos-vías | ✅ `scripts/frontend/baselines/artifact-composer/**` — corre en cada cambio del dominio |
| `ResolvedCompositionManifest` (input + hashes de catálogo/contratos/brand pack/fuentes + validadores) | ✅ **se emite junto al PDF/PNG** (`<artifactId>.manifest.json`); es lo único que TASK-1391 debe aceptar |
| CLI `pnpm deck:compose <plan.json> [--out dir]` (outDir default `.captures/tender-deck`) | ✅ shipped — **ya NO es el único consumer** (ver renderer productivo abajo); no depende de ningún flag: es el camino local y el modo degradado |
| State machine (12 estados, 3 gates humanos) | ✅ **PERSISTIDA** (TASK-1392): matriz en `proposal_state_matrix` + trigger de enforcement + historial append-only; TS ↔ DB con test de paridad. Terminales `won`/`lost` |
| Aggregate `Proposal` · API routes · migración · capabilities · entitlement per-ORG · outbox | ✅ **existen** (TASK-1392): `greenhouse_commercial.proposal*`, `/api/commercial/proposals/**`, `commercial.proposal.{read,manage,gate,render}`, módulo `proposal_studio_v1`, 9 eventos `commercial.proposal.*` |
| UI · Nexa/MCP surface | ❌ **no existen** (F5) |
| Los 3 nodos de juicio (orquestador · chapter-authors · verifier) | ❌ no existen (F1/F2) |
| **Renderer productivo**: Cloud Run **Job** `artifact-worker` + cola con prioridad + asset store + 2 signals | ✅ **TASK-1391 `complete`** — **staging E2E verificado en Cloud Run** (15 láminas 25,2 s / 3,16 MB · bench 25 láminas 32,3 s / 5,56 MB). **Producción explícitamente gateada** (release control plane + sign-off). Spec: **`GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`** |

⚠️ **NUNCA** corras el render pesado (Chromium) en **Vercel** ni en el **`ops-worker`** — bloquearía el
publisher del outbox. Va en el Cloud Run **Job** dedicado **`artifact-worker`** (**NO** `tender-worker`:
renderiza catálogos, no un dominio), frontera autorizada por **excepción documentada de EPIC-027**. Un
deployable nuevo no se crea por conveniencia.

⚠️ **Lo único renderizable productivo es el `ResolvedCompositionManifest` sellado.** El worker lo
**re-resuelve** contra su copia del catálogo y compara hash: si una plantilla/contrato/brand pack cambió
desde el enqueue → `manifest_drift` y **no se publica**. Gates fail-closed **al encolar** (audience por
referencia · accesibilidad · deadline vencido · validadores) y **en el worker** (geometría · missing_asset ·
font_fallback · blank_slide · peso · páginas). **El PDF NO es PDF/UA**: si el RFP exige accesibilidad, el
render se rechaza al encolar (`accessibility_unsupported`) — *mejor no ofertar que entregar un artefacto
inadmisible*.

---

## Delta 2026-07-14 — enlaces clickeables · anti-fuga de prototipo · hooks con plan · fotos del squad

Capacidades nuevas del motor/catálogo (nacidas iterando la oferta SKY; TODAS domain-free y con gate):

1. **Enlaces clickeables en el PDF.** El sanitizador de rich-strings admite `<a href>` (**sólo**
   `https://` o ancla interna; todo otro atributo se sigue borrando). `deck-mold.css` estila el anchor
   (color heredado + subrayado — el default UA azul sobre navy era ilegible). Y `mergeSlidePdfs`
   **re-crea las anotaciones `/Link → /URI`** sobre la página copiada, porque `copyPages` de pdf-lib
   las **descarta** (medido: Chromium emite la anotación, el merge llegaba con 0). ⚠️ Al verificar
   anotaciones, **NUNCA grep sobre los bytes del PDF**: `deck.save()` usa object streams comprimidos y
   el regex no ve adentro — se cuenta **vía API pdf-lib** (`page.node.Annots()`). **La agenda además
   SALTA**: el resolver `chapter-anchor` emite el sentinel `https://deck.internal/<slideId>` (Chromium
   sólo imprime anotaciones para URLs absolutas) y el merge lo convierte en **GoTo a la página real**
   del slideId — coherente por construcción con los chips «pág. NN» (ambos derivan del plan). Un
   sentinel sin destino se **DESCARTA**: jamás llega al PDF entregado.
2. **Anti-fuga de prototipo (la garantía de reutilización entre licitaciones).** Los prototipos están
   escritos contra un cliente real («Propuesta técnica · SKY»). Un slot **opcional no provisto** ahora
   **se limpia** en el render (`absent-optional` en `fillDom`) — antes el copy de ejemplo viajaba al
   PDF de la siguiente licitación. Guard mecánico: `template-composability` incluye un probe por
   plantilla que la llena **sólo con los required** y falla si un slot opcional conserva texto/imagen
   del prototipo. **NUNCA** escribas copy de cliente en un prototipo esperando que "nadie lo va a ver".
3. **Hooks con acceso al plan.** `CatalogLayoutHook` recibe `deckPlan` opcional (3er parámetro): el
   chrome que depende de OTRAS láminas se **deriva** — `agenda-hooks.ts` pinta el número de página real
   de cada capítulo desde la posición viva de su `targetSlideId`. **NUNCA** autorar números de página
   (un deck reordenado se contradice solo). Render standalone sin plan → el hook no pinta, jamás inventa.
4. **`TeamGalleryFull`** (contentType `team-gallery`): roster de **FOTOS REALES** del squad vía resolver
   `squad-person` — allowlist **cerrada** (`andres, daniela, humberly, julio, luis, maria-fernanda,
   melkin, valentina` → `assets/squad/squad-<nombre>.png`); nombre desconocido →
   `UnknownResolverValueError`, una cara IA no puede entrar ni por error. El binding foto↔nombre↔rol
   **lo confirma el operador humano, nunca lo asume un agente**. Persona nueva = foto real (recorte con
   alpha) + entrada en la allowlist + enum del contrato. Desambiguación: roles con glifo → `TeamSplit`;
   caras reales → `TeamGalleryFull`.
5. **`dual-concept-icon`** (DualTextSplit): el autor declara la **semántica** de la columna
   (`search|ai|data|users|target`) y el catálogo pinta el Solar; ausente → glifo neutro del prototipo;
   typo → error. **NUNCA** autorar nombres de ícono.
6. **`ArtifactShowcaseFull.lead`** es rich-string (`em/strong/a`) — el patrón «pieza viva» es captura
   real con **chrome de navegador y la URL horneada en la barra** (assets `radiografia-sky-xray.png`,
   `informe-grader-sky.png`) + enlace clickeable en el lead. La pieza interactiva se muestra Y se
   enlaza; el screenshot solo, sin URL, no es verificable por el comité.

---

## ⚠️ Dirección canónica (ADR `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`, Accepted 2026-07-12)

**El motor NO es del dominio comercial.** Se extrae como primitive de plataforma y las superficies pasan a
ser **catálogos (= DATO)**. El aggregate deja de llamarse `Tender`.

| Antes | Ahora |
|---|---|
| `src/lib/commercial/tenders/deck/**` | **`src/lib/artifact-composer/**`** (domain-free) |
| "el deck" | **catálogo** `deck-axis` (16:9 → PDF) · **catálogo** `social-carousel` (4:5 → PNG set) |
| aggregate `Tender` | aggregate **`Proposal`** · `origin ∈ {public_tender, private_rfp, direct_sales}` |
| AXIS horneado en las plantillas | **brand pack como INPUT** (AXIS = el brand pack **de Efeonce**) |

- **NUNCA** el Composer importa de un dominio. **NUNCA** lo copies para una superficie nueva — **un
  catálogo, no un fork**. Si agregar el catálogo te obliga a tocar el motor, el motor está mal.
- **NUNCA** llames `TechnicalProposal` al aggregate: nombra **una de las tres partes** (técnica /
  económica / administrativa). **No toda propuesta es una licitación** — la licitación es un `origin`.
- **NUNCA** hornees AXIS/Efeonce como constante ni hardcodees un HEX de marca: **mata el as-a-service**.
  Nace **multi-tenant** (org scoping + **entitlement per-ORG**, nunca por rol — un rol no se factura).
- **NUNCA** el `Proposal` calcula precio (eso es `quote-to-cash` sobre loaded cost).
- **NUNCA** FIFO ciego en la cola de render: un batch social **no puede hambrear** el deck de un bid que
  vence mañana (perfiles de carga opuestos).

## Los 3 principios que gobiernan todo

Una oferta de licitación es un **documento contractual que evalúa un comité** y que pasa a formar parte
del contrato si se adjudica. De ahí salen los tres principios; todo lo demás son sus consecuencias.

1. **Anti-fabricación.** Nada que el deck muestre puede ser inventado — ni una cifra, ni una barra, ni
   una cara. Fabricar en una licitación no es un bug estético: es **tergiversación**.
2. **Fail-closed, nunca silencioso.** Un entregable que sale mal **pareciendo bien** es peor que un
   fallo, porque nadie lo revisa dos veces. Todo lo que el composer no pueda garantizar, **aborta**.
3. **Human-in-control.** El agente **prepara**; el humano **decide, firma y sube**. Siempre.

---

## Anti-fabricación (principio 1)

- **NUNCA** compongas una cifra sin `evidenceRef`. `validate.ts` lo rechaza: una métrica cuantificada sin
  su fuente **no se compone**. Si el dato no está medido, no va — o va **marcado como ilustrativo**.
- **NUNCA** dibujes geometría a mano. Las barras, spans y posiciones **se derivan del dato** vía los 5
  resolvers de geometría. Si el resolver falta, el deck **aborta**. Un "de 12 a 14" pintado con la barra
  gigante del prototipo es **fabricación gráfica**: el evaluador ve una mejora que no ocurrió.
- **NUNCA** generes una cara del squad con IA. El evaluador cruza el CV contra la persona. Si falta la
  foto de alguien, **se pide la foto**. No se fabrica. (Fotos reales: `assets/squad/squad-<nombre>.png`.)
- **NUNCA** afirmes un negativo sin medirlo. Decir "la IA no cita a la marca" sin correr el AI Visibility
  Grader es afirmar algo falso en un documento contractual. **Mide, no infieras** (caso SKY: la primera
  versión afirmó un negativo que el grader desmintió).
- `consumer: validation-only` (p. ej. `evidenceRef`) **NUNCA** se pinta: es munición interna, no copy
  para el comité.

## Fail-closed (principio 2) — las 3 bug classes que ya nos mordieron

- **NUNCA** agregues un `default:` silencioso ni un `continue` que deje pasar un slot sin escribir.
  **Bug class 1 (el fallo silencioso):** la lámina salía con el **copy de relleno del prototipo** y nadie
  se enteraba — un deck llegando al comité diciendo "Inteligencia de ejecución ×4", o un KPI que decía
  "3/3" cuando el dato era "4/4". Cualquier tipo o campo que el filler no sepa llenar **aborta el deck**.
- **NUNCA** `grid-template-columns` en `%` si la grilla tiene `gap`. Usa `minmax(0, Nfr)`.
  **Bug class 2 (el contrato que miente sobre lo que cabe):** los porcentajes de Grid **no descuentan el
  gap**, así que los tracks se salían 20px del lienzo y `.slide{overflow:hidden}` **amputaba una palabra
  en silencio** (`…se vuelve sosteni|`). El copy había pasado validación con holgura. El test
  `template-geometry.test.ts` lo prohíbe en las 25 plantillas.
- **NUNCA** asumas que "pasó `maxCharacters`" significa "cabe". El contrato declara **intención**; el
  único juez de la geometría es el **layout real**. `assertSlideFitsCanvas` (`render.ts`) mide cada nodo
  del contrato contra su ventana visible real **antes de imprimir** y aborta con `SlideGeometryError`.
- **NUNCA** trunques copy que no cabe (`overflow: reject` es el **único** modo). Se reescribe más corto,
  o se corrige la geometría. El renderer no amputa.
- **NUNCA** emitas un PDF parcial. `compose.ts` **valida TODO antes de renderizar NADA**: un PDF a medio
  producir de una oferta parece completo, y eso es exactamente el fallo que no se detecta.
- **NUNCA** asumas que una plantilla es usable porque tiene `slots.json`. **Bug class 3:** el catálogo se
  declaraba "25/25 con contrato ✅" y **7 de 25 no componían** — se descubrió con la primera oferta real, a
  tres días de entregar. El gate es `pnpm vitest run src/lib/commercial/tenders` (intenta llenar las 25).
- **NUNCA** ignores `itemSelector` o `fixedChildren` de un contrato de array ni tomes el primer hijo por
  casualidad como blueprint. El filler preserva el chrome fijo y repite sólo el nodo declarado; si un
  contrato no matchea el DOM, aborta. Un `.gap`/callout que el dato no sostiene se **remueve** mediante
  una op explícita del resolver, nunca queda como residuo del blueprint.
- **NUNCA** cierres un deck porque "los tests pasan". Cuatro pasos numerados todos como "01" y unos
  párrafos aplanados con comas **pasaban todos los tests**. **MIRA LOS FRAMES, TODOS.**
- **SIEMPRE** la firma de URL vive **dentro** del `.slide`. **Bug class 4:** `mix-blend-mode` se mezcla con
  el backdrop de **su** contexto de apilamiento — si la burbuja es hermana del `.slide`, **no tiene con qué
  fundirse y se pinta plana**. 21 de 22 plantillas la tenían fuera. (No era el PDF: el blend sobrevive al
  `print-to-pdf`.)
- **NUNCA** rotules un hito de timeline con una fecha que no sea la que el eje pinta. `at` es el **FIN de
  la unidad**: un hito "Semana 1" con `at: 1` cae en el **cierre del Mes 1** → la lámina **afirma una fecha
  falsa**. Es fabricación, no un bug de layout.
- **NUNCA** edites manualmente porcentajes, grilla o conectores de `TimelineFull`. El `DeckPlan` declara
  `timeUnit`, `timeAxis` (3..8), rangos enteros de fases e hitos; el compiler deriva la geometría desde ese
  único schedule. `barLabel` es copy editable de barra sólida o punteada, incluso de una unidad: se conserva
  y se mide contra la geometría real; si se recorta, se rechaza. No se borra para hacer pasar el render.
- **NUNCA** escribas un guard que chequee **texto** cuando puedes chequear el **DOM**. El primer guard de la
  firma buscaba `</main>` y daba por buenas las plantillas que usan `<div class="slide">`: **un check que
  miente es peor que no tenerlo**.
- **NUNCA** ignores el gate de peso (`maxPdfMb`). No es estética: los portales **rechazan** adjuntos sobre
  su límite. Un deck de 40 MB que el portal no acepta es un deck que no existe.

## `audience` — la regla que impide filtrarle munición al comprador (TASK-1392)

Cada `tender_asset` nace **`internal`** o **`client_facing`**. **Sólo un entregable `client_facing` y
aprobado puede empaquetarse.** En una licitación esto no es una regla de permisos: lo interno contiene
**tu estructura de costos y tu piso de negociación**.

| Artefacto | `audience` | Por qué |
|---|---|---|
| Oferta técnica · económica · deck · anexos | `client_facing` | Es lo que evalúa el comité |
| **Squad blueprint** | **`internal`** | Lleva el **loaded cost** por rol |
| **Diagnóstico interno** (lente técnica del Be X) | **`internal`** | Al cliente va sólo la lente **medida** |
| Scoring bid/no-bid · walk-away · margen | **`internal`** | Revela tu piso de negociación |

- **NUNCA** promuevas `internal → client_facing` por default ni "porque parece útil". Es una decisión
  humana explícita, auditada.
- **NUNCA** subas un RFP, anexo o entregable fuera del **asset store canónico**
  (`src/lib/storage/greenhouse-assets.ts`): nada de bucket, uploader, URL pública ni carpeta paralela.
  El scan/quarantine/ownership no es opcional — son documentos confidenciales.

## El agente NUNCA escribe: `propose → confirm → execute` (TASK-1392)

El **Proposal Intake Agent** (shipped: `src/lib/commercial/tenders/proposals/intake-agent.ts`) es el molde de toda fase agéntica futura del dominio:

1. Recibe **contexto read-only allowlisted** (metadata + asset manifest + actor). No SQL, no storage.
2. Emite una **propuesta tipada** (`ProposalIntakeProposal`) que **cita sus inputs** y se valida **fail-closed contra el contexto** (org/asset/duplicado fuera del allowlist → se rechaza completa).
3. **El humano confirma.**
4. Recién entonces corre **el mismo command canónico** que usarían API, CLI, Nexa y MCP.

- **NUNCA** el LLM muta estado, adjunta un asset ni cruza un gate humano. **Propuesta ≠ ejecución.**
- **NUNCA** introduzcas LangChain, LangGraph, un Agents SDK ni memoria mutable propia: se reusa el
  cliente canónico `src/lib/ai/` y el patrón tool-use/telemetría de Nexa.
- **NUNCA** cierres algo como "agentic" si sólo hay un prompt: hace falta contexto tipado, tools sobre
  los primitives, propuesta trazable, eval fixture y confirmación humana real.
- **NUNCA** toques el prompt o el schema del intake agent sin correr su eval fixture
  (`proposals/__tests__/intake-agent-eval.test.ts`) — es EL gate del contrato.
- **La proyección de render es allowlisted** (`proposals/render-projection.ts`): un artefacto
  `client_facing` que cite UNA evidencia `internal` **falla cerrado**
  (`assertEvidenceAllowedForAudience`). **NUNCA** el renderer/autoría lee `proposal_evidence`
  directo ni recibe `external_source_snapshot`, costos o URLs de storage.

### El dominio se opera desde Nexa (TASK-1399) — y sigue siendo el MISMO primitive

El ciclo completo es operable desde el chat: **`register_proposal` → `attach_proposal_rfp` →
`record_proposal_evidence` → `request_proposal_render`** (`src/lib/nexa/actions/proposal-studio.ts`) +
el tool read-only **`proposal_status`** (sobre `proposals/operator-view.ts`, el MISMO read model del
día a día que consume la UI). Todo detrás de **`NEXA_PROPOSAL_ACTIONS_ENABLED`** (default OFF, además
del master `NEXA_ACTION_RUNTIME_ENABLED`). Nexa **no es un camino paralelo**: cada acción delega en el
command canónico y cruza la MISMA puerta que las rutas.

- **UNA PUERTA, DOS ENTRADAS.** El núcleo del gate es
  **`assertProposalStudioAccessForSubject({ subject, ownerOrgId, need })`** (entitlement per-ORG
  `proposal_studio_v1` + capability del actor); `assertProposalStudioAccess({ tenant, … })` es el
  adapter de las rutas. **NUNCA** escribas un segundo gate para un consumer nuevo (UI, MCP, cron): una
  puerta duplicada es el drift que termina dejando pasar una org sin módulo contratado.
- **EL SCOPE SALE DE LA SESIÓN, NUNCA DEL MODELO.** Ninguna acción recibe `ownerOrgId`: se deriva del
  entitlement (`resolveProposalStudioOwnerOrg`) y el cliente entra **por nombre**, resuelto fail-closed
  (`resolveClientOrganizationByName`: cero → no inventa; varias → pregunta). **NUNCA** agregues un id de
  organización a un `inputSchema` de agente — dejar que el LLM *proponga* un UUID es una superficie de
  ataque (nombrar la org de otro y confiar en que el gate la atrape). Los únicos ids que un agente pasa
  son los que el sistema acabó de emitir (`proposalId`, `assetId`, `evidenceId`).
- **UN PREVIEW QUE PROMETE LO QUE VA A FALLAR ES UNA MENTIRA.** Los gates de admisibilidad del render
  viven en **`assertProposalRenderAdmissible`** (read-only) y los corren **el preview y el command**.
  **NUNCA** reimplementes esas reglas en un preview/afordance de UI: una copia es drift garantizado (el
  día que se agregue un gate, el preview miente). Si el estado real bloquea la acción, se lanza
  `NexaActionBlockedError` → gap `unavailable`: **la acción no se propone, se explica**. Consecuencia:
  una evidencia `internal` citada en un artefacto `client_facing` **nunca llega a ser una tarjeta de
  confirmar**.
- **EL AGENTE NO RE-CLASIFICA VISIBILIDAD.** `attach_proposal_rfp` **no acepta `audience`**: se respeta
  el default seguro por kind. El `audience` de una evidencia SÍ es explícito y obligatorio — y su
  preview lo declara de forma inequívoca (título + métrica + consecuencia), porque una evidencia interna
  lleva loaded cost, o sea el piso de negociación.
- **EL MANIFEST SE VALIDA, NO SE REESCRIBE.** El schema Zod del render usa `.passthrough()` a propósito:
  Zod **borra las claves que no declara**, y el `ResolvedCompositionManifest` lleva campos que el schema
  no enumera (`input` = su procedencia). Strippearlos cambia el `manifestHash` → el MISMO deck pedido por
  la API y por Nexa produciría **DOS jobs** en vez de uno idempotente. **NUNCA** re-tipes el manifest sin
  passthrough.

## Human-in-control (principio 3)

- **NUNCA** un agente **envía** una oferta, la **firma**, ni confirma declaraciones juradas. Prepara el
  paquete; **el humano lo sube** y guarda el comprobante.
- **NUNCA** un GO sin **margen sobre loaded cost**. Fit 10/10 con margen negativo es **NO-BID**.
- **Admisibilidad ANTES que fit.** Un excluyente faltante deja fuera aunque la propuesta sea perfecta.

---

## Composición del deck (reglas duras)

- **NUNCA** dibujes una lámina freehand. El deck **se compone** desde el catálogo cerrado de **25
  plantillas** (selector determinista sobre `registry.json`, 1 content-type → 1 plantilla). Si nada calza:
  **falta una plantilla** → se abre el gap, **no se improvisa**.
- **NUNCA** vuelvas al **raster de Figma como fondo** (`get_screenshot` → `background: url(panel.png)`).
  Fue evaluado y **rechazado**: no responde a tokens, no se adapta al contenido, pesa, y ata cada lámina a
  un PNG. El fondo es un **degradado tokenizado en CSS**. (El Apéndice B del ADR del Studio todavía
  describe esa táctica: está marcado **SUPERSEDED** — manda el composer.)
- **NUNCA** mezcles dos content-types en una lámina. Se divide en dos.
- **NUNCA** toques `src/lib/artifact-composer/**` ni `src/lib/commercial/tenders/**` sin correr
  `pnpm vitest run src/lib/artifact-composer src/lib/commercial/tenders` (las suites cubren las bug
  classes que ya nos costaron un deck roto) **y `pnpm composer:visual-gate`** (0 píxeles contra el
  baseline; rebaseline sólo declarado en `BASELINE_DELTAS.md` + `--freeze`).
- **ANTES de cualquier `--freeze`, leé el runbook `docs/operations/runbooks/composer-visual-gate.md`**
  (fuente única del proceso — cualquier agente lo carga al tocar el composer). Bug class `ISSUE-122`, dos
  reglas duras: **(a)** el `--freeze` es **SINGLE-OWNER, serializado y atómico** (freeze + commit juntos);
  **NUNCA** congeles con el composer sucio por otro agente (co-mingla su WIP → baseline corrupto). **(b)**
  las láminas con **fotos** (`TeamGalleryFull`/equipo) driftean píxeles entre corridas/entornos aunque no
  las toques; el `--selftest` de 2 corridas juntas NO lo atrapa. Si el gate flagea SOLO el área de foto de
  una lámina que no cambiaste, **es `ISSUE-122`, NO tu regresión — NO la rebaselines** (oculta el bug).
- **NUNCA** reintroduzcas un HEX/rgb de marca, un `@import` de Google Fonts o `'Poppins'/'Geist'`
  literal en una plantilla: color = `deck-tokens.css` (brand pack), gradientes = recipes/inventario
  ratchet, tipografía = `var(--axis-deck-type-display|text)` + font pack local (render bloquea red).
- **NUNCA** un autor/agente declara `template`: declara `contentType` + slots; el selector del
  catálogo resuelve (`TemplateAuthorityError` si contradice). Lo único persistible/renderizable
  productivo es el `ResolvedCompositionManifest` emitido junto al artefacto.

## Registro y copy

- **Registro formal ("de usted"), NUNCA tuteo**, en todo lo **client-facing** (técnica + económica + deck).
  Es un documento que evalúa procurement. Formal ≠ frío. Los documentos internos (diagnóstico, squad,
  matriz) dan igual. Caso fuente: SKY 2026-07-11.
- El copy visible pasa por `copywriting`; nada de AI-slop, claim → mecanismo.

---

## Fronteras del dominio

- **El composer NO decide el precio.** El monto real lo emite el **cotizador** (`quote-to-cash`). En el
  deck, las cifras de pricing van **reales o marcadas como ilustrativas**, nunca inventadas.
- **El Studio ≠ RESEARCH-007 — ownership ARBITRADO (ADR `GREENHOUSE_TENDER_DISCOVERY_OWNERSHIP_BOUNDARY_DECISION_V1.md`, Accepted 2026-07-12):**
  - El **Studio es dueño de `greenhouse_commercial.tenders`** (+ `tender_state_transitions`,
    `tender_assets`, `tender_requirements`): el aggregate de **la oferta que Efeonce construye, pública o
    privada**.
  - **RESEARCH-007 es dueño de `public_tender*`**: el **espejo re-sincronizable** del radar Mercado
    Público.
  - **NUNCA** el discovery escribe/actualiza/borra `tenders`. La promoción es un **command con
    confirmación humana** — `createTender(origin='public_discovery', public_opportunity_id)` — y **el GO
    del bid/no-bid ES ese momento**. Un cron no decide participar en una licitación.
  - **NUNCA** guardes estado del bid (fase, decisión, entregables, assets) en `public_tender*`: un
    re-sync desde Mercado Público **pisaría** el estado de una oferta en vuelo.
  - **NUNCA** crees una tabla paralela de licitaciones ni "improvises sobre `public_tenders`".
  - Una licitación **privada** (SKY/Wherex) nace con `origin=manual` y **sin FK** — es válido y esperado,
    no un caso borde. Es justamente lo que decidió el ADR.
- **El dominio tenders NO escribe** payroll, finance ni HR. Consume `loaded cost` para el pricing; no lo
  calcula ni lo muta.

## Aprendizajes ISSUE-121 — el primer deploy del artifact-worker (2026-07-12)

Cinco bugs invisibles en local, todos de la clase *"la nube difiere de la máquina del autor"*.
Los invariantes que dejaron:

- **NUNCA** declarar "listo" un deployable nuevo sin ejecutarlo en su runtime real; **SIEMPRE**
  la imagen se prueba a sí misma en el pipeline (selftest de Cloud Build del artifact-worker:
  catálogo completo + fuentes por checksum + Chromium + render probe — falla ⇒ no hay deploy).
- **NUNCA** un gate de calidad juzga estado asíncrono sin esperar su settlement determinista
  (`img.decode()` + techo, jamás un juicio inmediato ni un sleep). Un gate que depende de la
  velocidad del disco es una moneda.
- **NUNCA** hashear con `JSON.stringify` contenido que viaja por JSONB (Postgres reordena claves):
  el hash del manifest usa serialización canónica (`hashResolvedManifest`).
- **SIEMPRE** preferir rediseñar para necesitar MENOS privilegio antes que escalar IAM: el worker
  claim-ea su job (`FOR UPDATE SKIP LOCKED`) en vez de darle `runWithOverrides` al dispatcher.
- **Un catálogo es DATO portable o no es un catálogo**: `catalog-portability.test.ts` prohíbe
  `file://`, paths absolutos y referencias que escapen del árbol en TODA plantilla.
- Chromium en contenedor como root exige `--no-sandbox` — vive en el launch canónico UNIFORME
  (es aislamiento de proceso, no rasterización; visual gate 0 px lo prueba).
