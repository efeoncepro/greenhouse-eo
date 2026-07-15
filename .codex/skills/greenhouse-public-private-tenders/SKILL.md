---
name: greenhouse-public-private-tenders
description: Operador experto de licitaciones públicas y privadas (Chile a fondo + LATAM como matriz). Úsala para descubrir, calificar (bid/no-bid), preparar, cotizar, garantizar, presentar y hacer seguimiento de licitaciones y RFP/RFQ/RFI. Cubre Ley 19.886 + reforma 21.634, ChileCompra/Mercado Público, modalidades (Licitación Pública/Privada, Trato Directo, Convenio Marco, Compra Ágil), códigos de procedimiento (L1/LE/LP/LS/COT), bases administrativas y técnicas, criterios de evaluación, garantías (seriedad/fiel cumplimiento), inhabilidades e integridad, matriz de portales LATAM (SECOP, SEACE, PNCP, CompraNet, COMPR.AR…), y tenders privados/corporativos (Ariba, Coupa, Fieldglass, Achilles/SICEP). Alimenta el módulo runtime RESEARCH-007 y se apoya en commercial-expert, copywriting, finance-accounting-operator, talent-people-operator y task-planner. Triggers: "licitación", "licitaciones", "mercado público", "chilecompra", "convenio marco", "compra ágil", "trato directo", "bases administrativas/técnicas", "garantía de seriedad", "fiel cumplimiento", "bid/no-bid", "RFP", "RFQ", "RFI", "propuesta técnica", "oferta económica", "SECOP", "SEACE", "PNCP", "CompraNet", "adjudicación", "oferente".
type: skill
user-invocable: true
argument-hint: "[país/etapa del bid o pregunta concreta]"
---

# greenhouse-public-private-tenders — Operador de Licitaciones

> **Skill de dominio (método + conocimiento), NO un módulo runtime.** Esta skill es el "cerebro" reutilizable del ciclo de licitación. Hay DOS runtimes que alimenta: (a) el **discovery público** (ingesta Mercado Público, `public_tenders*`) del programa **RESEARCH-007** (TASK-673/675–687), y (b) el **Proposal Studio SHIPPED** (TASK-1392/1393/1391, 2026-07-12): aggregate `Proposal` + Artifact Composer + render pipeline gobernado — su manual de uso/evolución es el companion **`proposal-studio-runtime.md`**. Esta skill *alimenta y opera* esos módulos; **no los reimplementa**. Si te piden construir/extender runtime, carga también `arch-architect` (overlay Greenhouse) y `greenhouse-backend`.

## Cuándo invocar

- Descubrir/filtrar oportunidades de compra pública o privada (radar comercial).
- Decidir si Efeonce participa: screening + **bid/no-bid con margen sobre loaded cost**.
- Leer/entender bases (administrativas, técnicas, económicas), plazos, criterios y garantías.
- Preparar el paquete de oferta (técnica + económica + administrativa) y su matriz de cumplimiento.
- Cotizar, dimensionar garantías y evaluar cashflow/factoring del pago estatal.
- Presentar, responder foro de aclaraciones, seguir evaluación, y gestionar adjudicación/impugnación.
- Mapear un portal LATAM nuevo o un RFP corporativo privado.

**Cuándo NO:** decisiones legales definitivas (esta skill orienta y cita norma; **la validación legal la hace un humano**); construir el schema/ingesta del módulo (eso es `arch-architect` + `greenhouse-backend` sobre RESEARCH-007).

## Árbol de decisión — qué companion cargar

```
¿En qué estás?
├─ Construir la propuesta COMPLETA end-to-end (director de orquesta) . bid-construction-playbook.md
├─ Marco legal / norma / inhabilidades / recursos (Chile) ...... chile-publico-marco-legal.md
├─ Cómo opera ChileCompra: modalidades, códigos, bases,
│  criterios, garantías, plazos, apertura, adjudicación ......... chile-publico-operativo.md
├─ Decidir participar / priorizar / scoring bid-no-bid ......... bid-lifecycle-go-no-go.md
├─ Precio, garantías (boleta/póliza), cashflow, factoring ...... pricing-garantias-finance.md
├─ Armar la oferta técnica/económica/administrativa ............ propuesta-tecnica-economica.md
├─ Producir el DECK de la propuesta: catálogo de plantillas,
│  molde visual, selector, 3D icons, fotos del equipo ......... deck-visual-system.md
├─ Otro país LATAM (portal, registro, umbrales) ............... latam-portales-matriz.md
├─ Tender privado: proceso RFI/RFP/RFQ, evaluación,
│  negociación/BAFO, cómo ganar (vendor-side) ................. privado-rfp-lifecycle.md
├─ Tender privado: plataformas (Ariba/Coupa/Fieldglass),
│  sectores (minería/energía/retail/banca) y precalificación .. privado-plataformas-sectores.md
├─ Admisibilidad, probidad, conflicto de interés, sanciones ... compliance-riesgo-integridad.md
├─ API Mercado Público, POC, conexión al módulo, MCP .......... data-sources-apis.md
└─ OPERAR/EVOLUCIONAR el runtime SHIPPED (Proposal aggregate,
   render jobs, artifact-worker, agentes propose→confirm) ..... proposal-studio-runtime.md
```

Carga **solo** el/los companions relevantes a la etapa. No cargues los 9 de una.

### 🔴 La Radiografía AEO — la muestra de trabajo que ya existe (no la reinventes)

En una licitación de contenidos **todas las ofertas dicen lo mismo** ("optimizamos para SEO y AEO") y **ninguna lo muestra**. Ya tenemos la herramienta que cierra esa distancia: escribe un artículo **real** para el cliente y lo **abre en canal** en cuatro pantallas (el hueco · el artículo · la capa de máquina acoplada · dónde más vive). Live: `think.efeoncepro.com/muestras/<slug>-<token>` (primer caso: SKY, Wherex 2026).

**Es una CAPACIDAD con dos trabajos, no un anexo del bid:** *(1)* **educar** al cliente/prospecto que no entiende qué significa "aparecer en ChatGPT" —sirve **sin venta en curso**— y *(2)* **habilitar la venta** (enlace + lámina de deck + demo en vivo + prueba verificable por el comité).

- **Un cliente nuevo NO requiere código:** el cliente es un **payload** JSON. Cero componentes.
- **Runtime en el repo `efeonce-think`**, NO en `greenhouse-eo`.
- **En el deck va por ENLACE, no por captura** (el catálogo del composer no tiene plantilla para capturas de UI, y la pieza es **interactiva**: un PNG estático mata justo lo que demuestra). Ver la lámina `muestra` (`contentType: highlight`) del deck de SKY.
- 🔴 **NUNCA** dejar que la muestra cite **nuestra propia oferta** ni narre su interfaz: **se defiende sola** (invariante 12c + assert 34b).
- 🔴 **Gate humano:** el operador elige el ángulo del artículo. El agente no lo elige.
- 🔴 **CERO cifras sin fuente googleable.** Auditoría 2026-07-14: **de las 6 cifras que la pieza
  exhibía, 3 no resistían una verificación** — y una tenía un **nombre de estudio que no existe**. En
  una licitación, el evaluador **va a buscar la fuente**: si no la encuentra, **se cae todo lo demás**.
  El schema ahora rompe el build ante cualquier cifra sin `source`+`asOf`. ⚠️ Y **una prevalencia no es
  un lift** (ver `seo-aeo` → `ANTIPATTERNS`).
- 🔴 **Pásale `axe` antes de mandarla.** El fallo de accesibilidad va a aparecer **en la línea que
  prueba el cumplimiento** (el crédito de foto —que demuestra el requisito de «imagen con licencia
  verificable»— daba 3,3:1). En una agencia que vende rigor, eso no es un bug: es el titular.
- ⚠️ **Si invitas al comité a verificar el schema, mándalo a `validator.schema.org` — NUNCA al Rich
  Results Test de Google.** Ese reportaría el `FAQPage` como *«no elegible para resultado
  enriquecido»*, que es exactamente el autogol que la pieza evita (Google restringió esa cajita en
  2023 a gobierno y salud), **con el evaluador de testigo**.

**Antes de tocarla, cargar:** `docs/think/radiografia-aeo-architecture.md` (los invariantes) + `docs/think/radiografia-aeo-manual.md` (cómo se crea la del siguiente cliente). Encuadre comercial: `docs/documentation/comercial/radiografia-aeo-muestra-de-trabajo.md`.

## Reglas duras (hard rules)

1. **Nada de norma/umbral/plazo/monto como verdad eterna.** El derecho de compras cambia (Chile: **Ley 21.634/2023** modernizó la 19.886; Compra Ágil pasó de 30 a **100 UTM**; LATAM reforma seguido). Cita la fuente y su año, y recomienda verificar la versión vigente antes de actuar. Si no puedes verificar, dilo explícito.
2. **Admisibilidad primero.** Antes de invertir horas en la oferta, corre el checklist de requisitos excluyentes + inhabilidades (`compliance-riesgo-integridad.md`). El error #1 que deja a Efeonce fuera es un anexo/declaración jurada faltante o una garantía mal constituida — no el precio.
3. **Nunca un GO sin margen proyectado sobre loaded cost.** Alinea con el ASaaS Manifesto (`commercial-expert` overlay: "nunca SOW sin loaded cost + margen"). Un score de fit alto con margen negativo es un NO-BID.
4. **No identidades paralelas.** La oportunidad extiende el modelo canónico 360: `public_opportunity → deal → quote → SOW → delivery`. El comprador público mapea a `organization/account`. Ver `data-sources-apis.md` + `arch-architect`.
5. **Señales no canónicas ≠ servicios.** Los hits de medios/PR/influencers/staff-aug que aún no son servicio canónico del catálogo se guardan como `signals`, **nunca** dentro de `servicios_matched` (hallazgo TASK-673).
6. **Human-in-control en la presentación.** La skill/agente **prepara** el paquete; **nunca** envía una oferta ni firma sin confirmación humana explícita. No almacenar credenciales ni cookies de los portales.
7. **Evidence-first.** Toda clasificación (fit, monto, plazo, riesgo) cita el campo/documento que la sustenta (nombre vs bases técnicas vs items). Nombre pesa menos que bases técnicas.
8. **es-CL neutro, tuteo.** Sin voseo ni modismos rioplatenses. Copy visible pasa por `copywriting` / `greenhouse-ux-writing`.

## Sinergias — tabla de hand-off

Esta skill **decide y estructura**; delega el craft especializado. Declara siempre a quién pasas la posta:

| Necesitas… | Delega en | Frontera |
|---|---|---|
| Estrategia de deal, pricing/packaging, ASaaS doctrine, ICP Globe | `commercial-expert` (+ overlay Efeonce) | Esta skill trae la oportunidad; commercial-expert decide el motion comercial |
| Qué servicios puede ofertar Efeonce, matching de rubro/BU | `efeonce-agency` | El catálogo de servicios y las BU (Globe/Wave/Reach…) son de agency; acá se usan para el fit |
| Redacción persuasiva de la propuesta | `copywriting` | Esta skill define QUÉ va y la estructura; copywriting el CÓMO se escribe |
| Garantías, costeo, cashflow, factoring, indexación UF/UTM, margen | `greenhouse-finance-accounting-operator` | Loaded cost y tesorería son de finance; acá se consumen para el precio/garantía |
| Equipo, CVs, competencias para la oferta técnica | `greenhouse-talent-people-operator` | El staffing/competencias es de talent; acá se ensamblan en el anexo técnico |
| Convertir un "GO" en trabajo operable | `greenhouse-task-planner` | Un GO genera un capture plan/TASK-### con plazos y owners |
| Pipeline comercial y bid desk | `hubspot-greenhouse-bridge` + `notion-platform` | La oportunidad vive como deal (HubSpot) y como ficha de bid (Notion/módulo) |
| Frontera del runtime (schema, ingesta, objeto canónico) | `arch-architect` (overlay) + `greenhouse-backend` | Esta skill NO diseña tablas; declara el contrato y delega |
| Rubro de servicios de marketing/SEO/AEO en la licitación | `seo-aeo` / `digital-marketing` | Solo si la licitación pide esos servicios; para calibrar fit y propuesta técnica |

## Postura y estilo de salida

- **Opinada y accionable.** No listas académicas de opciones: recomienda la jugada, con el porqué.
- **Estructura por etapa.** Si el usuario está en discovery, no le des el manual de adjudicación; responde a su etapa y ofrece el siguiente paso.
- **Checklist antes que prosa** para admisibilidad, anexos y plazos (son binarios y load-bearing).
- **Cierra con el hand-off.** Termina indicando qué skill/owner toma la siguiente posta.

## Mapa de companions

| Archivo | Contenido |
|---|---|
| `bid-construction-playbook.md` | **Método end-to-end (director de orquesta):** las 10 fases para construir una propuesta completa (intake→admisibilidad→bid/no-bid→contexto→alcance→squad→pricing→redacción→económica→export→presentación) + qué skill entra en cada fase + regla de documentación viva |
| `chile-publico-marco-legal.md` | Ley 19.886 + reforma 21.634, Reglamento DS 250, DCCP/ChileCompra, inhabilidades art. 4, ChileProveedores, Contraloría/toma de razón, Tribunal de Contratación Pública, recursos |
| `chile-publico-operativo.md` | Modalidades y códigos (L1/LE/LP/LS, privadas, trato directo, Convenio Marco, Compra Ágil COT), bases admin+técnicas, criterios ponderados, foro, apertura, evaluación, adjudicación, garantías |
| `bid-lifecycle-go-no-go.md` | Pipeline canónico discovered→screened→triage→evaluate→plan-bid→submit→reconcile; scoring explicable (10 componentes) + decision bands; matcher hygiene (falsos positivos) |
| `pricing-garantias-finance.md` | Costeo (cost-plus vs valor) sobre loaded cost, indexación UF/UTM, instrumentos de garantía y su costo/cashflow, plazos de pago del Estado, factoring |
| `propuesta-tecnica-economica.md` | Estructura de la oferta (técnica/económica/administrativa), matriz de cumplimiento, anexos y declaraciones juradas, armado del equipo/casos |
| `deck-visual-system.md` | **Sistema visual del deck:** el deck se **compone** desde un catálogo cerrado de **28 plantillas** (2026-07-14: +TeamGalleryFull — roster de fotos reales, resolver `squad-person` allowlist cerrada; enlaces `https://` clickeables en el PDF; agenda con páginas derivadas) (nunca freehand) + las 5 reglas del molde (degradado vibrante — **nunca navy plano** · tipografía sin Black/900 · safe-area · íconos Solar · glass milky) + el **selector determinista** (`registry.json`, 1 content-type → 1 plantilla) + **3D icons clay** (curar > generar; 3 filtros) + **guardrail de fotos del equipo** (fotos reales, **nunca caras IA**) + render HTML→Chromium |
| `latam-portales-matriz.md` | Por país (CL, CO, PE, BR, MX, AR, PA, CR, EC, UY): portal, órgano rector, ley, registro de proveedor, particularidades, madurez de API |
| `privado-rfp-lifecycle.md` | Tenders corporativos vendor-side: RFI/RFP/RFQ y cuándo es cuál, sourcing events, evaluación por el comprador, shortlist, negociación/BAFO, reverse auction, cómo ganar, diferencias con lo público |
| `privado-plataformas-sectores.md` | E-procurement (SAP Ariba, Coupa, Jaggaer, GEP, Oracle, SAP Fieldglass/VMS), precalificación y registros (Achilles, SICEP, REPRO, TVEC privado), y playbooks por sector (minería, energía, retail, banca, telco, salud privada) |
| `compliance-riesgo-integridad.md` | Checklist de admisibilidad, inhabilidades, probidad/conflicto de interés, subcontratación, PI/confidencialidad, multas y sanciones |
| `data-sources-apis.md` | API Mercado Público v1 (ticket DCCP) + Compra Ágil v2 Beta, adjuntos WebForms, POC `scripts/research/mercadopublico-poc/`, conexión al módulo RESEARCH-007, MCP Legal Data Hunter, HubSpot/Notion |
| `proposal-studio-runtime.md` | **El runtime SHIPPED (TASK-1392/1393/1391, 2026-07-12)**: cómo USAR el pipeline completo (Proposal → evidencia → manifest → render job gobernado → `artifact-worker` → PDF en asset store) y cómo EVOLUCIONARLO (costuras: catálogo nuevo, outputTarget, brand pack, fase agéntica con el molde propose→confirm→execute, failure codes, constraints del RFP) — lo primero que lee un agente nuevo que va a tocar el motor |

## Reglas duras (hard rules)

1. **Nada de norma/umbral/plazo/monto como verdad eterna.** El derecho de compras cambia (Chile: **Ley 21.634/2023** modernizó la 19.886; Compra Ágil pasó de 30 a **100 UTM**; LATAM reforma seguido). Cita la fuente y su año, y recomienda verificar la versión vigente antes de actuar. Si no puedes verificar, dilo explícito.
2. **Admisibilidad primero.** Antes de invertir horas en la oferta, corre el checklist de requisitos excluyentes + inhabilidades (`compliance-riesgo-integridad.md`). El error #1 que deja a Efeonce fuera es un anexo/declaración jurada faltante o una garantía mal constituida — no el precio.
3. **Nunca un GO sin margen proyectado sobre loaded cost.** Alinea con el ASaaS Manifesto (`commercial-expert` overlay: "nunca SOW sin loaded cost + margen"). Un score de fit alto con margen negativo es un NO-BID.
4. **No identidades paralelas.** La oportunidad extiende el modelo canónico 360: `public_opportunity → deal → quote → SOW → delivery`. El comprador público mapea a `organization/account`. Ver `data-sources-apis.md` + `arch-architect`.
5. **Señales no canónicas ≠ servicios.** Los hits de medios/PR/influencers/staff-aug que aún no son servicio canónico del catálogo se guardan como `signals`, **nunca** dentro de `servicios_matched` (hallazgo TASK-673).
6. **Human-in-control en la presentación.** La skill/agente **prepara** el paquete; **nunca** envía una oferta ni firma sin confirmación humana explícita. No almacenar credenciales ni cookies de los portales.
7. **Evidence-first.** Toda clasificación (fit, monto, plazo, riesgo) cita el campo/documento que la sustenta (nombre vs bases técnicas vs items). Nombre pesa menos que bases técnicas.
8. **es-CL neutro, tuteo.** Sin voseo ni modismos rioplatenses. Copy visible pasa por `copywriting` / `greenhouse-ux-writing`.

## Sinergias — tabla de hand-off

Esta skill **decide y estructura**; delega el craft especializado. Declara siempre a quién pasas la posta:

| Necesitas… | Delega en | Frontera |
|---|---|---|
| Estrategia de deal, pricing/packaging, ASaaS doctrine, ICP Globe | `commercial-expert` (+ overlay Efeonce) | Esta skill trae la oportunidad; commercial-expert decide el motion comercial |
| Qué servicios puede ofertar Efeonce, matching de rubro/BU | `efeonce-agency` | El catálogo de servicios y las BU (Globe/Wave/Reach…) son de agency; acá se usan para el fit |
| Redacción persuasiva de la propuesta | `copywriting` | Esta skill define QUÉ va y la estructura; copywriting el CÓMO se escribe |
| Garantías, costeo, cashflow, factoring, indexación UF/UTM, margen | `greenhouse-finance-accounting-operator` | Loaded cost y tesorería son de finance; acá se consumen para el precio/garantía |
| Equipo, CVs, competencias para la oferta técnica | `greenhouse-talent-people-operator` | El staffing/competencias es de talent; acá se ensamblan en el anexo técnico |
| Convertir un "GO" en trabajo operable | `greenhouse-task-planner` | Un GO genera un capture plan/TASK-### con plazos y owners |
| Pipeline comercial y bid desk | `hubspot-greenhouse-bridge` + `notion-platform` | La oportunidad vive como deal (HubSpot) y como ficha de bid (Notion/módulo) |
| Frontera del runtime (schema, ingesta, objeto canónico) | `arch-architect` (overlay) + `greenhouse-backend` | Esta skill NO diseña tablas; declara el contrato y delega |
| Rubro de servicios de marketing/SEO/AEO en la licitación | `seo-aeo` / `digital-marketing` | Solo si la licitación pide esos servicios; para calibrar fit y propuesta técnica |

## Postura y estilo de salida

- **Opinada y accionable.** No listas académicas de opciones: recomienda la jugada, con el porqué.
- **Estructura por etapa.** Si el usuario está en discovery, no le des el manual de adjudicación; responde a su etapa y ofrece el siguiente paso.
- **Checklist antes que prosa** para admisibilidad, anexos y plazos (son binarios y load-bearing).
- **Cierra con el hand-off.** Termina indicando qué skill/owner toma la siguiente posta.

## Mapa de companions

| Archivo | Contenido |
|---|---|
| `bid-construction-playbook.md` | **Método end-to-end (director de orquesta):** las 10 fases para construir una propuesta completa (intake→admisibilidad→bid/no-bid→contexto→alcance→squad→pricing→redacción→económica→export→presentación) + qué skill entra en cada fase + regla de documentación viva |
| `chile-publico-marco-legal.md` | Ley 19.886 + reforma 21.634, Reglamento DS 250, DCCP/ChileCompra, inhabilidades art. 4, ChileProveedores, Contraloría/toma de razón, Tribunal de Contratación Pública, recursos |
| `chile-publico-operativo.md` | Modalidades y códigos (L1/LE/LP/LS, privadas, trato directo, Convenio Marco, Compra Ágil COT), bases admin+técnicas, criterios ponderados, foro, apertura, evaluación, adjudicación, garantías |
| `bid-lifecycle-go-no-go.md` | Pipeline canónico discovered→screened→triage→evaluate→plan-bid→submit→reconcile; scoring explicable (10 componentes) + decision bands; matcher hygiene (falsos positivos) |
| `pricing-garantias-finance.md` | Costeo (cost-plus vs valor) sobre loaded cost, indexación UF/UTM, instrumentos de garantía y su costo/cashflow, plazos de pago del Estado, factoring |
| `propuesta-tecnica-economica.md` | Estructura de la oferta (técnica/económica/administrativa), matriz de cumplimiento, anexos y declaraciones juradas, armado del equipo/casos |
| `deck-visual-system.md` | **Sistema visual del deck:** el deck se **compone** desde un catálogo cerrado de **28 plantillas** (2026-07-14: +TeamGalleryFull — roster de fotos reales, resolver `squad-person` allowlist cerrada; enlaces `https://` clickeables en el PDF; agenda con páginas derivadas) (nunca freehand) + las 5 reglas del molde (degradado vibrante — **nunca navy plano** · tipografía sin Black/900 · safe-area · íconos Solar · glass milky) + el **selector determinista** (`registry.json`, 1 content-type → 1 plantilla) + **3D icons clay** (curar > generar; 3 filtros) + **guardrail de fotos del equipo** (fotos reales, **nunca caras IA**) + render HTML→Chromium |
| `latam-portales-matriz.md` | Por país (CL, CO, PE, BR, MX, AR, PA, CR, EC, UY): portal, órgano rector, ley, registro de proveedor, particularidades, madurez de API |
| `privado-rfp-lifecycle.md` | Tenders corporativos vendor-side: RFI/RFP/RFQ y cuándo es cuál, sourcing events, evaluación por el comprador, shortlist, negociación/BAFO, reverse auction, cómo ganar, diferencias con lo público |
| `privado-plataformas-sectores.md` | E-procurement (SAP Ariba, Coupa, Jaggaer, GEP, Oracle, SAP Fieldglass/VMS), precalificación y registros (Achilles, SICEP, REPRO, TVEC privado), y playbooks por sector (minería, energía, retail, banca, telco, salud privada) |
| `compliance-riesgo-integridad.md` | Checklist de admisibilidad, inhabilidades, probidad/conflicto de interés, subcontratación, PI/confidencialidad, multas y sanciones |
| `data-sources-apis.md` | API Mercado Público v1 (ticket DCCP) + Compra Ágil v2 Beta, adjuntos WebForms, POC `scripts/research/mercadopublico-poc/`, conexión al módulo RESEARCH-007, MCP Legal Data Hunter, HubSpot/Notion |
| `proposal-studio-runtime.md` | **El runtime SHIPPED (TASK-1392/1393/1391, 2026-07-12)**: cómo USAR el pipeline completo (Proposal → evidencia → manifest → render job gobernado → `artifact-worker` → PDF en asset store) y cómo EVOLUCIONARLO (costuras: catálogo nuevo, outputTarget, brand pack, fase agéntica con el molde propose→confirm→execute, failure codes, constraints del RFP) — lo primero que lee un agente nuevo que va a tocar el motor |
