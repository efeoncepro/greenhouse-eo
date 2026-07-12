# Commercial / Tenders — invariantes operativos para agentes

> **Tipo:** Companion de invariantes (load-on-demand)
> **Versión:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Cargar al tocar:** `src/lib/commercial/tenders/**` · `docs/architecture/tender-deck-composer-prototypes/**` · `scripts/commercial/compose-tender-deck.ts` · cualquier oferta/deck/propuesta de licitación
> **Contrato completo:** `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` (el deck) · `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (el aggregate; **leer su §0 — estado real**) · `docs/research/RESEARCH-007-commercial-public-tenders-module.md` (discovery público)
> **Skills:** `greenhouse-public-private-tenders` (método) + `deck-studio` (argumento, composición y
> entrega del deck) + `deck-visual-system.md` (el deck) + `bid-construction-playbook.md` (las 10 fases)

---

## Estado real del dominio (2026-07-12) — no asumas de más

| Pieza | Estado |
|---|---|
| Deck composer (selector · validate · slot-fill · 15 resolvers · geometría · render · **PDF de N páginas**) | ✅ shipped, `src/lib/commercial/tenders/deck/**` |
| 25 plantillas con `data-slot` + `*.slots.json` + `registry.json` | ✅ 25/25 built |
| CLI `pnpm deck:compose <plan.json> [--out dir]` (outDir default `.captures/tender-deck`) | ✅ **único consumer hoy** |
| State machine (12 estados, 3 gates humanos) | ⚠️ **TS puro — NO hay tabla `tenders` en DB** |
| API routes · UI · migración · capability · outbox | ❌ **no existen** |
| Los 3 nodos de juicio (orquestador · chapter-authors · verifier) | ❌ no existen |
| Renderer productivo: Cloud Run Job + cola + artifact store + señales | 📋 **TASK-1391** (`to-do`, P1) — **bloqueada por EPIC-027** |

⚠️ **NUNCA** corras el render pesado (Chromium) en **Vercel** ni en el **`ops-worker`** — bloquearía el
publisher del outbox. Va en un **`tender-worker` dedicado**, y un deployable nuevo requiere la decisión de
frontera de **EPIC-027**: no se crea por conveniencia. Eso es exactamente lo que TASK-1391 protege.

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

El **Tender Intake Agent** es el molde de toda fase agéntica futura del dominio:

1. Recibe **contexto read-only allowlisted** (metadata + asset manifest + actor). No SQL, no storage.
2. Emite una **propuesta tipada** (`TenderIntakeProposal`) que **cita sus inputs**.
3. **El humano confirma.**
4. Recién entonces corre **el mismo command canónico** que usarían API, CLI, Nexa y MCP.

- **NUNCA** el LLM muta estado, adjunta un asset ni cruza un gate humano. **Propuesta ≠ ejecución.**
- **NUNCA** introduzcas LangChain, LangGraph, un Agents SDK ni memoria mutable propia: se reusa el
  cliente canónico `src/lib/ai/` y el patrón tool-use/telemetría de Nexa.
- **NUNCA** cierres algo como "agentic" si sólo hay un prompt: hace falta contexto tipado, tools sobre
  los primitives, propuesta trazable, eval fixture y confirmación humana real.

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
- **NUNCA** toques `src/lib/commercial/tenders/**` sin correr `pnpm vitest run src/lib/commercial/tenders`
  (las 5 suites cubren las bug classes que ya nos costaron un deck roto).

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
