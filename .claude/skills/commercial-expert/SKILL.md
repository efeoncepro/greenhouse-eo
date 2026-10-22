name: commercial-expert-greenhouse-overlay

description: Greenhouse-specific pinned decisions that OVERRIDE the global commercial-expert skill defaults. Load this first whenever commercial-expert is invoked inside the greenhouse-eo repo. Specializes in ASaaS doctrine (Manifesto V1), Bow-tie alignment with Greenhouse runtime, 3 client_kind playbooks (Active/Self-Serve/Project), Globe clients ICP (enterprise marketing teams), 4-product positioning (servicio agencia / Kortex / Verk / Greenhouse portal), HubSpot portal 48713323 operations, Nubox billing implications, ICO health score integration.
type: overlay
overrides: commercial-expert
user-invocable: true
argument-hint: "[area or specific question]"
---


## Partnerships, distribuidores y expedientes externos

Para recuperar membresías, completar altas/crédito o preparar documentos para distribuidores, cargar el
[manual de operación](../../../docs/manual-de-uso/comercial/operar-partnerships-y-distribuidores.md) y el registro de partnerships. Cruzar cuenta, razón social/RUT e ID antes
de registrar, formar o pedir un upgrade; no crear duplicados ni usar una membresía de otra empresa.
Separar estado del programa, curso, distribución, Marketplace, crédito y capacidad de ordenar.
Los formularios externos sólo llevan datos pertinentes: notas de búsqueda, pendientes y QA quedan en el
expediente interno. No inventar datos ni aplicar la firma del correo como firma contractual. Revisar todas
las páginas y la lista exacta de adjuntos; comprobar Enviados, archivos y CRM por separado.
Los estados variables viven en el registro/auditoría; los correos y rutas de contacto viven en el
[directorio de personas y equipos](../../../docs/operations/EFEONCE_PARTNER_CONTACT_DIRECTORY_V1.md).
Leerlo antes de localizar destinatarios; contiene funciones, fuentes, fechas, reemplazos y rebotes.
Índice nominal de recuperación (no implica cargo vigente ni autorización de envío):
- Google/Ingram: Joelvis Sarmiento, Víctor Escárate, Nicolás Santibáñez, Cristian Faúndez;
  Google for Education: Arthur Guedes y Carlos Jimenez.
- Microsoft/LOL: Geraldine Vanessa Gonzalez Moreno, Camila Orellana, Reinel Bejarano,
  Diana Jaimes y Daniela Sedlacek. Alta/crédito LOL: Lucia Gabriela Tovar.
- AWS/LOL: José Manuel Quezada, Valentina Egaña, Macarena Hein, Víctor Ledezma y Jorge Noguera;
  AWS directo: Julieth Vanessa Castillo y Daniel López.
- Adobe/Nexsys: Jean Sánchez, Francisco Araya, Constanza Moya, Javiera Castro, José Orellana
  y Vicente Ulloa. Adobe/Ingram: Melissa Danae Santos y Marco Seferino.
No confundir ambos Víctor, ni Ingram con Nexsys. Cristian, Vicente y Marco tienen rebotes registrados;
consultar la evidencia antes de reutilizarlos. María Berrios pertenece a una membresía ajena;
Jose Menezes es fuente del anuncio, no contacto operativo acreditado. No copiar ni inferir sus correos.


## Nombres de negocios y leads Efeonce

Antes de preparar o escribir `dealname` / `hs_lead_name`, aplicar la
[convención canónica](../../../docs/operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md), aceptada el 15/10/2026:
Deal = marca/cuenta, país, iniciativa, referencia; Lead = marca/cuenta, país, necesidad, persona,
separados por ` | `. La marca del alcance precede al holding; conservar Company legal y asociaciones.
El formato no autoriza altas, calificación ni renombrados masivos. Nuevas altas autorizadas lo adoptan;
registros existentes sólo cambian nombre dentro del mandato expreso, con antes/después y readback.

Para el modelo transversal de cliente —ICP, JTBD, buying group, stakeholder map, decision/paper process y evidence— cargar
`efeonce-customer-model-operator`. Para arquitectura transversal de packaging, pricing, billing, descuentos, credits y guardrails cargar
`efeonce-pricing-operator`. Esta skill conserva la ejecución comercial: discovery, negociación, pipeline, proposal,
win/loss y deal tactics.

Para prospección por cuenta, contactos y rutas frías/tibias/cálidas, cargar
[efeonce-b2b-prospecting](../efeonce-b2b-prospecting/SKILL.md). Esa skill conserva investigación, cobertura
objetivo + 2–3 adicionales como base ampliable por roles/riesgos de la oportunidad y entrega; Commercial conserva avance de venta. No cargar ambos recursivamente.

Para ABM/ABS, cargar el [módulo compartido](../efeonce-b2b-prospecting/references/abm-and-abs.md):
selección/intensidad por cuenta, mapas por iniciativa, consenso/proof y economía. Commercial conserva ABS;
Digital Marketing el plan ABM. 1:many puede ser válido si conserva selección/relevancia/coordinación;
no adoptar rangos ni resultados numéricos genéricos como metas Efeonce. Este método local gobierna si el
bundle global carece del módulo referenciado; no afirmar que se cargó un archivo ausente.

Para discovery y prueba por oferta/función, cargar [decision/proof](../efeonce-b2b-prospecting/references/discovery-and-proof.md)
con la práctica; para dimensionar preventa/seguimiento, [capacidad y economía](../efeonce-b2b-prospecting/references/capacity-and-economics.md)
con Pricing/Finance. Para win/loss/no decisión y vigencia, [aprendizaje](../efeonce-b2b-prospecting/references/experiments-and-learning.md).
Representación target/roles/readback pertenece al [adapter HubSpot](../hubspot-as-a-service/references/account-based-prospecting.md).
Antes de crear/calificar/cerrar Contact, Company, Lead o Deal, cargar su
[diccionario y captura por objeto](../hubspot-as-a-service/references/property-inventory.md);
el diseño Bow-tie histórico no prueba fields/pipelines efectivos ni requisitos UI/API.
Los módulos comparten método; no crean ofertas, presupuesto, schema, Deals ni nuevas automatizaciones.

Para preparar entrada por situación, usar [playbooks de entrada](../efeonce-b2b-prospecting/references/situation-entry-playbooks.md).
Cadencias y respuestas se coordinan con [cadencia de cuenta](../efeonce-b2b-prospecting/references/account-cadence.md)
y [tratamiento de respuestas](../efeonce-b2b-prospecting/references/response-handling.md); Commercial conserva
objeciones, calificación y negociación. Preparación del remitente/canal: [entregabilidad](../efeonce-b2b-prospecting/references/deliverability-operations.md),
sin convertir método en autorización de envío, enrollment, cambios DNS o pausas aplicadas.

# commercial-expert — Greenhouse Overlay

## Envíos desde el Outlook de Julio

Antes de preparar o enviar correos desde `jreyes@efeoncepro.com`, cargar la [política obligatoria](../../../docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md): firma gráfica oficial siempre y CCO `48713323@bcc.hubspot.com`, incluidos correos nuevos, respuestas, reenvíos y seguimientos manuales, programados o por secuencias (Julio, 21/10/2026). Usar Outlook UI o transporte HTML autorizado que conserve la firma; texto plano no es alternativa. Si la herramienta no la preserva, dejar el correo pendiente sin enviarlo. Verificar firma y BCC antes del envío, Enviados después y registro HubSpot por separado. Esta regla no autoriza envíos nuevos ni aplica la identidad de Julio a otros remitentes.


> **Ecosistema digital Efeonce — layering canónico** (SSOT: `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`; índice `docs/public-site/`). Dos ejes ortogonales: **superficies** front-of-house (por audiencia/etapa de funnel — **adquisición** como continuo bow-tie: `Think` = demand-gen + nurturing top-of-funnel [blog *Marketing con Manzanitas* → *Glitch* newsletter semanal IA/Marketing/Negocios + tools *AI Visibility Grader*/ebooks/webinars] · sitio `efeoncepro.com` = demand-capture + conversión; **experiencia** con dos caras: cliente [sky → `experiencia.efeoncepro.com`] y operador [cockpit Greenhouse]) que consumen **plataformas/backbones** (runtime Greenhouse PG+BQ/360, **Kortex** = CRM peer system + producto, Verk). El grader es la costura top→bottom. Cargar PDR-003 al razonar sobre superficies, capas, hosts o dónde nace una capacidad del ecosistema.

This file **overrides** the global `commercial-expert` skill's defaults when working inside the `greenhouse-eo` repository. When there's a conflict, **this overlay wins**.

**Load order**: read global `commercial-expert/SKILL.md` first → then read this overlay → then apply rules.

## Why this overlay exists

The global commercial-expert is good for any modern B2B / SaaS / agency / ASaaS scenario. Greenhouse / Efeonce has specific commercial reality:

- **ASaaS as pinned doctrine** (`docs/strategy/ASAAS_MANIFESTO_V1.md`) defines the model
- **Bow-tie spec adopted** (`spec/Arquitectura_BowTie_Efeonce_v1_1.md` + `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`)
- **3 client_kinds canonical** (Active Account / Self-Serve Customer / Project Customer)
- **4 products** with specific positioning rules
- **Globe clients ICP** (enterprise marketing teams in airlines, banking, retail, telco, manufacturing)
- **Stack runtime**: HubSpot portal 48713323 + Greenhouse operational portal + Nubox billing + Notion delivery + Teams comms

This overlay pins those decisions so the global skill operates against Efeonce's specific runtime.

---

## Canonical authoritative sources (read first when relevant)

- **`docs/strategy/ASAAS_MANIFESTO_V1.md`** — doctrine canónica del modelo ASaaS Efeonce
- **`spec/Arquitectura_BowTie_Efeonce_v1_1.md`** — modelo comercial canónico (HubSpot CRM)
- **`docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`** — contrato puente Bow-tie ↔ Greenhouse
- **`docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md`** — operational case lifecycle
- **`docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`** — modelo canónico de identidad
- **`docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`** — economía unitaria por miembro
- **`docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`** — finance domain
- **`CLAUDE.md`** at repo root — operational contract for all agents

---

## Pinned decisions (OVERRIDES global commercial-expert)

### 1. ASaaS Manifesto es la doctrina vinculante

Cualquier recomendación comercial sobre el modelo de negocio (pricing, packaging, positioning, motion design) debe respetar el manifesto. Si la skill propone algo que contradice el manifesto, **el manifesto gana** salvo que el usuario explícitamente pida desafiarlo.

Hard rules del manifesto que tienen consecuencia comercial inmediata:

- **NUNCA** vender un retainer sin scope canónico documentado + telemetría + revisión trimestral
- **NUNCA** firmar SOW sin loaded cost actualizado + project margin proyectado
- **NUNCA** descontar sin obtener concesión recíproca documentada
- **NUNCA** cobrar pilot/discovery sin entry criteria de conversión
- **NUNCA** posicionar los 4 productos a la vez en pitch
- **NUNCA** llamar "ASaaS" a un servicio sin productización + telemetría + economía unitaria

Ver `greenhouse-overlay/asaas-positioning.md` para cómo aplicarlo en discovery + pitch + pricing.

### 2. 3 client_kind playbooks distintos

Los clientes Efeonce no son fungibles. Cada `client_kind` tiene motion, métrica, cadencia, owner role distintos. **NUNCA tratarlos uniformemente.**

| `client_kind` | Motion | Owner | Cadence | North star metric |
|---|---|---|---|---|
| `active` | Account-based, MEDDPICC + Challenger + JTBD | Account Lead | QBR trimestral formal | NRR > 110% |
| `self_serve` | PLG, lifecycle email + in-product | Automation + CSM (futuro) | Digital, in-product | Trial-to-paid + monthly active usage + tier upgrade rate |
| `project` | Hybrid, MEDDPICC light | PM + Account Lead light | Cierre proyecto + post-mortem | Project margin > 30% + conversion to Active or Self-Serve |

Detalle completo en `greenhouse-overlay/client-kind-playbooks.md`.

### 3. ICP Globe = enterprise marketing teams (estricto)

ICP target principal: equipos de marketing enterprise en aviación, banking, retail, telco, manufacturing, services. NO empresas que buscan agencia barata. NO SMBs sin team marketing in-house. NO compañías culture procurement-first.

Detalle ICP completo + anti-ICP en `greenhouse-overlay/globe-clients-icp.md`.

### 4. 4 productos con regla de positioning

| Producto | Cuándo es eje | Cuándo es soporte |
|---|---|---|
| Servicio agencia | Active Account | N/A — corazón ASaaS |
| Kortex | Self-Serve standalone | Componente data CRM en Active |
| Verk | Self-Serve standalone | Componente analítico en Active |
| Greenhouse portal | N/A — siempre soporte | Plumbing en Active y Project |

**Regla**: nunca pitch los 4 a la vez. Decision tree completo en `greenhouse-overlay/product-suite-positioning.md`.

### 5. Métricas Bow-tie computadas Greenhouse-side

Las 6 métricas Bow-tie (NRR, GRR, Expansion Rate, Logo Retention, Time-to-Expansion, Renewal Rate) se computan en `greenhouse_serving.bowtie_metrics_monthly` (TASK-833). HubSpot recibe via projection (TASK-831).

Cualquier discusión sobre métricas dentro del repo debe referenciar la VIEW canónica + helper TS, no fórmulas inventadas. Lint rule `greenhouse/no-untokenized-bowtie-metric-math` rompe build.

Detalle en `metrics/bowtie-metrics-engine.md` (global skill).

### 6. ICO health score integrado al `is_at_risk`

El motion property `is_at_risk` (Bow-tie §7.1) se computa Greenhouse-side con 3 triggers (TASK-832), uno de los cuales es ICO health score en rojo. La integración es bidireccional:

- ICO score afecta `is_at_risk` → projection a HubSpot
- Renewal motion responde a `is_at_risk` → priorización dashboard

Detalle en `greenhouse-overlay/ico-health-score-integration.md`.

### 7. HubSpot portal 48713323 es el CRM canónico

Toda operación CRM (deals, properties, pipeline) vive en HubSpot portal 48713323. Compositions, stages custom, properties contractuales, motion properties: configurados via runbook TASK-830.

Skill defers a:

- `hubspot-solutions-partner` para **vender/implementar/retener HubSpot como línea de negocio** (licencias, referral fee, tier points, deal registration, battlecards, managed CRM ops). Esta skill aporta el **método** de venta; esa aporta el **dominio** HubSpot.
- `hubspot-greenhouse-bridge` para mecánica del bridge Cloud Run
- `hubspot-ops` para CLI ops del portal
- claude.ai HubSpot MCP para fetching live data

⚠️ **Distingue los dos HubSpot:** (a) HubSpot **como CRM interno** de Efeonce — es esta sección; (b) HubSpot **como producto que Efeonce vende** siendo Solutions Partner — es `hubspot-solutions-partner`. No las mezcles.

### 8. Nubox billing reality

Facturación cliente vive en Nubox (no HubSpot, no Greenhouse). Cualquier discusión de pricing / billing / invoicing debe respetar:

- Tax compliance Chile SII (DTE, IVA, retenciones)
- LATAM multi-tax para clientes Globe internacionales
- Currency: CLP primary, USD/EUR para Globe internacional con FX awareness (TASK-766 reader)
- Greenhouse no factura — refleja state Nubox via sync

Detalle en `greenhouse-overlay/nubox-billing-implications.md`. Para profundizar finance, defer to `greenhouse-finance-accounting-operator`.

### 9. Bow-tie alignment es non-negotiable

Cualquier decisión comercial dentro del repo (pricing, motion, comp plan, dashboard) debe alinear con el Bow-tie spec. Si no alinea, primero se actualiza el Bow-tie (proceso formal), luego se ejecuta la decisión.

Esto evita drift entre commercial decisions ad-hoc y la arquitectura canónica.

Detalle en `greenhouse-overlay/bowtie-alignment.md`.

### 10. Stack runtime adoptado

- **CRM**: HubSpot portal 48713323
- **Operational portal**: Greenhouse (este repo)
- **Billing**: Nubox
- **Delivery**: Notion (sync TASK-Notion-conformed-pipeline)
- **Comms cliente**: Teams + email
- **AI / ML**: Vertex AI + Gemini (use `gcp-vertex-ai` skill)
- **Data warehouse**: BigQuery `efeonce-group` + PostgreSQL `greenhouse-pg-dev`

Cualquier "necesitamos otro CRM / billing / portal" requiere ADR formal. **Boring tech preference**: lo que tenemos > lo nuevo, salvo justificación dura.

---

## Greenhouse-canonical patterns inventory

When advising commercial decisions inside this repo, the patterns below are pre-canonized:

| Need | Reference | Pattern |
|---|---|---|
| Pricing decision con margin transparency | TASK-MEMBER_LOADED_COST + ASaaS Manifesto §6.2 | Loaded cost model + margin breakdown post-MSA |
| Pipeline metric drift | Bow-tie spec §9 + TASK-833 | VIEW `bowtie_metrics_monthly` + helper + reliability signals |
| HubSpot config drift | TASK-830 | Runbook + verify script + reliability signal |
| HubSpot ↔ Greenhouse projection | TASK-831 | Reactive consumer + outbox + dead_letter |
| `is_at_risk` evaluation | TASK-832 | 3 triggers + Cloud Scheduler cron + projection |
| Operational case lifecycle | TASK-816..821 | DDL + commands + UI + cascade + HubSpot trigger |
| Client onboarding cascade | TASK-820 cascade | Outbox `client.lifecycle.case.completed` → reactive consumers |
| Capability-gated commercial action | TASK-403 + TASK-742 | Capability granular + audit log + reliability signal |

---

## Narrativa comercial vigente (Q4 2026 – Q3 2027)

El pitch del período es **«Tu IA no conoce tu negocio»**: Efeonce construye el contexto que hace que la IA trabaje
para el negocio. Canon, mapa a servicios y reglas: [`EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md`](../../../docs/strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md).

- **Capítulo según comprador:** gerencia general/dirección comercial → 1 (lo que tu IA no sabe); RevOps/finanzas/TI
  → 2 (datos) y 4 (equipo agéntico); marketing/digital/growth → 3 (lo que la IA dice de ti); marketing/marca → 5
  (campañas en días, con tu marca). La capa de resultados cierra toda conversación.
- **Cifras de HubSpot** (3,6× MQL, 3,2× deals, 81 % más campañas…): se usan atribuidas a HubSpot; en una propuesta
  concreta no se presentan como resultado garantizado por Efeonce.
- **Salesforce:** contraste agentic team vs. digital labor sólo en conversación u orgánico, con respeto; Efeonce es
  partner de ambos y el ángulo es provider-fit.
- **Entrada:** evaluación RevOps, chequeo de salud de datos, Radiografía AEO, taller de equipo agéntico o Creative
  Diagnostic; la expansión sigue el §4 del canon.
- **Inbound desde canales propios (operador, 2026-10-22):** sólo LinkedIn lleva directo a la landing de servicio con
  su diagnóstico; Instagram, Threads, YouTube y el blog llevan antes a Glitch, a una herramienta o al LinkedIn de
  Julio. En la primera reunión, pregunta cómo nos conoció el contacto y anota si mencionó Instagram o YouTube: es
  parte de la medición del puente fan → conversación, que en formularios y HubSpot todavía no existe. La línea «IA con
  contexto» (Engine) y nube no tienen landing al 2026-10-22. Canon:
  [estrategia de love brand §8.4 y §11](../../../docs/strategy/EFEONCE_LOVE_BRAND_AND_COMMUNITY_STRATEGY_V1.md).

## Hard rules (Greenhouse-specific commercial)

- **NUNCA** proponer pricing change sin validar contra Loaded Cost Model + Bow-tie metrics impact
- **NUNCA** posicionar los 4 productos a la vez (regla del manifesto)
- **NUNCA** describir un servicio como "ASaaS" sin scope canónico + telemetría + economía unitaria documentadas
- **NUNCA** sugerir motion comercial sin alinear con `client_kind` correspondiente
- **NUNCA** computar NRR/GRR/Expansion Rate fuera de la VIEW canónica
- **NUNCA** asumir que HubSpot lifecyclestage es source of truth — Greenhouse manda (spec puente §3.1)
- **NUNCA** recomendar discount sin concesión recíproca documentable
- **NUNCA** crear capability comercial sin gate granular least-privilege
- **SIEMPRE** referenciar el manifesto ASaaS al hablar de positioning del modelo
- **SIEMPRE** distinguir las 3 client_kind audiences (Active/Self-Serve/Project) en motion + content + pricing decisions
- **SIEMPRE** invocar `arch-architect` cuando una decisión comercial fuerza arquitectura nueva
- **SIEMPRE** invocar `greenhouse-finance-accounting-operator` cuando pricing decision toca margin / FX / accounting

---

## Sales-enablement assets que YA existen (no los reinventes)

- **🔴 Radiografía AEO** — muestra de trabajo viva en `think.efeoncepro.com/muestras/<slug>-<token>`. Escribe un artículo **real** para el cliente y lo **abre en canal** en 4 pantallas (el hueco medido · el artículo · la capa técnica acoplada · dónde más vive). Hace **dos** trabajos: **educar** al cliente/prospecto que no entiende qué significa *"aparecer en ChatGPT"* (**sirve sin venta en curso**: educación, retención) y **habilitar la venta** (enlace + lámina de deck + demo en vivo + prueba que el comité **verifica solo**). En una categoría donde **todas las ofertas dicen lo mismo y ninguna muestra**, es la pieza que rompe el empate — y **el competidor de fondo es la indecisión**, no la otra agencia. **Un cliente nuevo = un payload JSON, cero código.** Cargar: `docs/documentation/comercial/radiografia-aeo-muestra-de-trabajo.md`; playbook comercial en `docs/manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md`; craft/invariantes en `docs/think/radiografia-aeo-*.md`; oficio: `seo-aeo`; venta: `seo-aeo-practice`.
- **🔴 Brochure oficial «Agencia de Marketing 360°»** (aprobado 2026-10-16) — el documento **por defecto** cuando alguien pregunta «¿qué hace Efeonce?»: la agencia completa con las cinco líneas. Completo (84 láminas) o corto (26, para presentar en reunión). PDF en OneDrive `Alineación/4. Comercial/Brochures/2026/Agencia de Marketing 360/` (`Efeonce-Brochure-Agencia-de-Marketing-360.pdf` y `…-Corto.pdf`). Casos: Berel (Engine), Sky (Brand), ANAM (Revenue, implementación HubSpot); Voice y Growth sin caso. **Antes de enviarlo afuera:** cifras de ANAM (no publicadas por ANAM) y el «12 meses» del caso Berel (cuenta ganada en mayo de 2026). Armado y pendientes: `deck-studio`.
- **🔴 Brochure y landing «Agencia de Medios»** (línea Voice, 2026-10-16) — material por defecto para cualquier conversación de medios (planificación, compra, programática, performance por plataforma, pantallas, medición). Brochure de 65 láminas en OneDrive `Alineación/4. Comercial/Brochures/2026/Agencia de Medios/Efeonce-Brochure-Agencia-de-Medios.pdf`; landing pública `https://efeoncepro.com/servicios/agencia-de-medios/`, cuyo formulario `efeonce-media-diagnostic` deja el lead en HubSpot («Lead Gen - Agencia de Medios»). **Claims:** la comisión o rebate es margen de Efeonce, nunca se promete declararla ni traspasarla; Basis/DV360/The Trade Desk/IAS/DoubleVerify son tecnología, no alianzas; sin caso Sky de medios; Eusari no se publica por ahora; «+120 empresas en 4 países» ≠ cinco países de operación. Detalle y pendientes antes de enviarlo: `docs/services/media-distribution/README.md#material-comercial-vigente`.

## Synergies with other skills

- `arch-architect` (greenhouse-pinned) — cuando commercial decision fuerza arquitectura
- `greenhouse-finance-accounting-operator` — pricing con margin transparency, deal economics, revenue recognition
- `hubspot-greenhouse-bridge` — operational mechanics of HubSpot integration
- `hubspot-ops` — HubSpot CLI / portal config operations
- `greenhouse-ux-writing` — cualquier microcopy comercial visible al cliente
- `greenhouse-payroll-auditor` — when pricing decision affects member loaded cost
- `claude-api` — when designing AI-assisted prospecting / conversation intelligence

---

## Competitive baseline (Chile) — leer al posicionar/competir

El **baseline competitivo de la agencia** (contra quién compite Efeonce en Chile, benchmark de industria del **Barómetro del Marketing Chileno 2026 de La Vulca**, gap y ruta para ser reconocida) vive en **`docs/context/15_panorama-competitivo-benchmark-industria.md`** (producido con `research-benchmark-operator`). Cárgalo al trabajar posicionamiento, battlecards, pitch o diferenciación. Claves para el motion comercial:

- Efeonce es **full-service digital/growth** (Paid Media, CRO, Marketing de Contenidos, SEO/AEO, performance, CRM) operado como **Growth OS / ASaaS** → diferenciador = **integración del stack**, no un servicio suelto. Ataca el dolor #1 del mercado (82% de anunciantes quiere proveedores coordinados; solo 32% siente tener su combinación ideal).
- Competidores directos (Frente 1, digital/growth): **Milimetrix** (mismo ángulo AEO/integración — el más cercano, hacer battlecard), **Muller y Pérez, Bigbuda, Loup, Rompecabeza, Cebra, Moov, Relevant, Nexbu**. Frente 2 (creativas/Effie, juego largo): **BBDO Chile, 10:10**.
- El ranking del Barómetro es **recall + rating** (percepción), no postulación → entrar es notoriedad + prensa gremial + participación, no "subir la agencia a una lista". Casos duros (Sky +127%, Bresler +180%, Berel) son la prueba a empaquetar.

---

## Output convention

Commercial deliverables generated within this repo go to:

- **Strategic docs**: `docs/strategy/` (manifesto, ICP refinements, motion designs, pricing strategy)
- **Operational playbooks**: `docs/playbooks/` (sales playbooks, onboarding playbooks, QBR templates per client_kind)
- **Battlecards / Win-loss / ICP canvases**: `docs/sales-enablement/`
- **ADRs comerciales**: `docs/adr/` if introduced (consult user before introducing pattern broadly)

Ad-hoc deal reviews / MEDDPICC cards / forecasts: discutir vía conversation, no commit a repo (transient operational data).

---

## File map (Greenhouse overlay)

```
.claude/skills/commercial-expert/
├── SKILL.md                           # this file
└── greenhouse-overlay/
    ├── bowtie-alignment.md            # alineación spec Bow-tie + spec puente
    ├── client-kind-playbooks.md       # 3 playbooks (Active / Self-Serve / Project)
    ├── globe-clients-icp.md           # ICP Globe + anti-ICP
    ├── asaas-positioning.md           # narrative + pitch + pricing ASaaS
    ├── product-suite-positioning.md   # decision tree 4 productos
    └── (futuros: ico-health-score-integration.md, nubox-billing-implications.md)
```

V1.0 prioriza los 5 archivos arriba. V1.1 agrega los 2 que faltan según necesidad.

**Nota (2026-07-13):** el antiguo pendiente `hubspot-portal-operations.md` quedó **resuelto fuera de este overlay**: el negocio HubSpot (vender/implementar/retener como Solutions Partner) vive ahora en la skill **`hubspot-solutions-partner`**, y la operación técnica del portal en `hubspot-ops`.

## Ofrecer medios de forma integral

Cargar el [manual programático](../../../docs/manual-de-uso/comercial/ofrecer-publicidad-programatica.md) y el
[método compartido](../digital-marketing/references/programmatic-media-operations.md). Partir del problema de
mix/inversión y presentar una responsabilidad Efeonce con alcance, owners, honorarios y externos claros. Proveedores
permanecen en el expediente interno. Una demo, entrenamiento declarado o ejemplo de fee no prueba licencia,
crédito, ahorro ni capacidad activa. Mapear retainer y cotizar sólo alcance incremental; no duplicar planificación,
setup, coordinación o reportes ni sumar fees completos por canal. Preservar la aprobación acotada del servicio.
