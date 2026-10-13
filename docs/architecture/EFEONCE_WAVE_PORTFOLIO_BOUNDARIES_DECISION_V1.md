# ADR — Wave como productora de ingeniería digital, visibilidad y sistemas de agentes

> **Status:** Accepted direction · 2026-07-25 · cartera de **seis familias**: la sexta (Product Design 360) fue aprobada por el operador el 2026-10-09 ([delta](#delta-2026-10-09--product-design-360-aprobada)) y la aprobación se extendió a todo Product Design 360 el 2026-10-10 ([delta](#delta-2026-10-10--aprobación-total-de-product-design-360))
> **Scope:** Portfolio / Commercial / Wave / Search Visibility 360 / Web / Measurement / Agent systems / CRM / Globe / Reach
> **Canonical business model:** [`docs/business-models/wave/WAVE_BUSINESS_MODEL_V1.md`](../business-models/wave/WAVE_BUSINESS_MODEL_V1.md)
> **Related:** [`EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md`](../business-models/EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md) · [`GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md`](GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md)

## Contexto

Wave es una **marca de producto de Efeonce** para servicios digitales productizados. La documentación
existente la reducía a infraestructura digital y mezclaba parcialmente CRM, SEO/AEO, analytics y agentes con
Efeonce Digital. La decisión de portfolio necesita distinguir con claridad quién vende/gobierna cada capability
sin fragmentar la relación del cliente: la cara, relación contractual y confianza frente al cliente siempre las
lidera Efeonce; Wave nombra el producto/capability que se entrega.

También se definió que **Search Visibility 360** es un producto 360 que integra SEO y AEO, pero no agota el
territorio de Wave. Wave además diseña, desarrolla, arquitecta y despliega web para humanos, buscadores y agentes;
construye measurement/analytics; y entrega sistemas de agentes propios o sobre plataformas administradas.

## Decisión

Wave queda definido como la productora de servicios de **ingeniería digital, visibilidad, medición y sistemas de
agentes**. Su cartera canónica tiene cinco familias:

1. **Search Visibility 360** — SEO + AEO, arquitectura de información y entidades, autoridad, search intelligence,
   optimización continua, recovery, migraciones y expansión internacional.
2. **Web Experience 360** — diseño, arquitectura, desarrollo y despliegue de experiencias web para humanos,
   buscadores y agentes; incluye performance, accesibilidad, conversión, datos estructurados y operaciones web.
3. **Measurement & Analytics** — tagging plans, data layer, GTM, GA4, eventos/conversiones, server-side tracking,
   dashboards, attribution, funnel analytics y governance de medición.
4. **Agent Systems & Platforms** — estrategia, arquitectura, construcción desde cero, integraciones, knowledge/RAG,
   orchestration, evaluación, observabilidad, guardrails y despliegue/operación sobre plataformas administradas de
   agentes. Los proveedores concretos son implementaciones posibles, no la taxonomía de Wave.
5. **Digital Automation & Integrations** — APIs, webhooks, workflows, data pipelines, automatización e integración
   entre web, analytics, agentes y sistemas empresariales.

> **Vigente desde el 2026-10-09:** la cartera tiene **seis familias**. La sexta es **Product Design 360** —research,
> UI/UX, design system, accesibilidad, validación y design ops; *decide cómo debe ser la experiencia*—, aprobada por
> el operador. La lista de arriba conserva el texto aceptado el 2026-07-25; los deltas del
> [2026-10-09](#delta-2026-10-09--product-design-360-aprobada) y del
> [2026-10-10](#delta-2026-10-10--aprobación-total-de-product-design-360) son los que rigen para el conteo y el
> alcance de la aprobación.

## Boundaries de ownership

| Capability | Owner primario | Participación de Wave |
|---|---|---|
| Growth strategy, RevOps y CRM | Efeonce Digital | Integra web, datos o agentes cuando el scope lo requiere |
| Kortex / implementación CRM | Efeonce Digital + Kortex | Adaptadores técnicos o superficies conectadas, sin ownership comercial de CRM |
| Search Visibility 360 | Wave como productora | Coordina Globe/Reach cuando el plan lo requiere |
| Web, performance y arquitectura digital | Wave | Owner de diseño técnico, delivery y operación |
| Measurement & Analytics | Wave | Implementa y opera instrumentación bajo el contrato de medición |
| Sistemas de agentes | Wave | Owner de ingeniería y operación técnica; Efeonce Digital define el outcome de negocio cuando aplica |
| Contenido y producción creativa | Globe | Capability de Efeonce con plataforma, especialistas, Managed Squad y Staff Augmentation; partner de Wave cuando el plan necesita assets o producción |
| Medios, PR y amplificación | Reach | Partner de distribución cuando el plan lo necesita |

**CRM enablement no es una familia de Wave.** Puede existir una integración CRM dentro de una entrega Wave, pero la
estrategia, solución, contrato y ownership de CRM permanecen en Efeonce Digital/Kortex.

## Agent Systems & Platforms

La categoría incluye dos formas de delivery:

- **Custom Agent Systems:** agentes y runtimes diseñados y construidos desde cero.
- **Managed Agent Deployments:** arquitectura, configuración, integraciones, seguridad, evaluación y operación sobre
  plataformas gestionadas de terceros.

El término paraguas es **Agent Systems & Platforms**; no se crea una línea pública por proveedor. Copilot Studio,
Gemini Enterprise, Claude managed agents y equivalentes se documentan como adapters/providers dentro de una entrega,
no como marcas de portfolio.

## Consecuencias

- Wave deja de ser una etiqueta genérica de infraestructura y adquiere una cartera de productized services clara y
  nombrable como marca de producto.
- Search Visibility 360 es la propuesta 360 de SEO+AEO, no una capability separada de dos productos rivales.
- Globe conserva contenido/producción, personas y operación creativa; Wave conserva estrategia de visibilidad,
  ingeniería y medición.
- Efeonce Digital conserva CRM, RevOps y la decisión de negocio; Wave puede ejecutar la capa técnica conectada.
- Hacia el cliente Efeonce lidera la relación y Wave puede nombrar el producto/capability; Wave, Globe, Reach y
  Efeonce Digital no se presentan como agencias/proveedores contractuales separados.
- Un product service de Wave puede entregarse como Productized Service, Managed Squad, Staff Augmentation,
  Implementation, Advisory o Platform-enabled Service. No confundir la oferta con el delivery model.

## Taxonomía comercial obligatoria

Para cualquier propuesta de Wave se deben registrar por separado:

1. **Product service:** qué resultado/alcance compra el cliente.
2. **Delivery model:** cómo se aporta capacidad y quién responde por el delivery.
3. **Engagement:** duración y cadencia (`On-Going`, `On-Demand`, `Sample Sprint`).
4. **Operating mode:** quién opera cada lane (`efeonce-managed`, `co-operated`, `client-operated` cuando aplique).
5. **Ecosystem composition:** qué capabilities de Efeonce participan y cuáles son sus boundaries.

Wave puede operar una entrega sola o junto a Efeonce Digital/Kortex, Globe, Reach y Greenhouse. Un delivery
compuesto no cambia automáticamente el ownership del product service ni crea una nueva marca contractual.

## No decisiones

- Este ADR no aprueba pricing, claims públicos, ARR, margen, checkout ni venta self-serve.
- No convierte los proveedores de plataformas de agentes en partnerships, endorsements ni dependencias obligatorias.
- No crea un runtime nuevo ni cambia ownership técnico de Kortex, Globe, Greenhouse o Reach.

## Seguimiento

- El modelo económico y de packaging vive en `docs/business-models/wave/`.
- La taxonomía comercial derivada vive en `docs/services/README.md` y el context pack.
- Las skills de agencia y business model deben cargar este ADR antes de razonar sobre Wave.

## Delta 2026-09-10 — Product Design 360 propuesta como sexta familia

**Estado: `Proposed`. Este delta NO modifica la decisión aceptada del 2026-07-25.** Las cinco familias siguen
siendo las aceptadas; la sexta queda registrada como propuesta pendiente de aprobación.

**Hueco detectado.** Este ADR le entregó a Wave el *diseño técnico, delivery y operación* de la web dentro de
**Web Experience 360**. Eso cubre construir y operar. No cubre **decidir cómo debe ser la experiencia**: research,
arquitectura de información, flujos, prototipado, interfaz, design system, accesibilidad, validación y design ops.
Esa disciplina no tenía dueño en el portfolio — cae entre Wave (ingeniería web) y Globe (producción creativa), y
ninguno de los dos la reclamaba. Tampoco estaba modelada en `docs/services/` ni en `docs/business-models/`.

**Propuesta.** Registrar **Product Design 360** como sexta familia de Wave, con esta frontera interna:

> Product Design 360 **decide cómo debe ser la experiencia**.
> Web Experience 360 **la construye, la despliega y la opera**.

Su alcance incluye superficies que no son web —app, portal de cliente, SaaS, herramienta interna, experiencia
conversacional—, razón por la cual no puede vivir subordinada a Web Experience 360.

**Motion primario (delta V1.1 del modelo, 2026-09-10): extensión de capacidad, no sustitución.** Las empresas mid y
grandes normalmente ya tienen product design in-house. La familia se vende como **lanes de capacidad gobernada** que
extienden a ese equipo —feature delivery, research, design system, accesibilidad, deuda de diseño, design ops—, con un
contrato anti-desplazamiento explícito y la distinción dura Managed Squad ≠ Staff Augmentation. El diseño integral de
producto queda como motion secundario, para clientes sin equipo.

**Relación con Web Experience 360 (delta 2026-09-10): capability única, dos ofertas.** El oficio de diseño es el
mismo para un producto y para un sitio público; lo que cambia es el comprador. Product Design 360 posee la
**capability** —método, gente, quality gates, práctica de design system, telemetría— y vende la **superficie de
producto** (Head of Design → CPO/CTO). **Web Experience 360 conserva la superficie de sitio público** (CMO → Head
of Digital) y consume esta capability dentro de su oferta. Accesibilidad y design system/tokens son lanes
compartidas: se contratan una sola vez por cliente. **NUNCA dos ofertas de Efeonce compitiendo por la capacidad de
diseño de la misma cuenta**: una sola propuesta, con owner declarado por lane.

**Frontera con Globe, sin cambios de ownership.** Globe conserva contenido, marca y producción creativa. Product
Design 360 diseña la interfaz y el sistema con el que alguien opera algo. *Un brandbook no es un design system.*

**Lo que este delta no hace.** No aprueba la sexta familia, ni pricing, ni claims públicos, ni el nombre público
"Product Design 360" (decisión abierta D1 del modelo). No cambia el ownership de ninguna capability existente.

**Condición de resolución.** El gate G1 del modelo económico —demanda externa verificada— decide si la sexta
familia se acepta en un ADR V2 o si se repliega a capability dentro de Web Experience 360.

**Decisión propia:** [`EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md`](EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md) (`Proposed`) — capability, dos ofertas, lanes e invariantes.

**Fuentes:** [`Product Design 360 — Business Model V1`](../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md) ·
[`Ficha de servicio`](../services/wave/product-design-360.md)

## Delta 2026-10-09 — Product Design 360 aprobada

**Estado: aprobada por el operador.** El 2026-10-09, al cerrar el brochure «Servicios web y digitales», el operador
dijo sobre Product Design 360, textual: «Si, incluyela como algo definitivo por qué está aprobado». Con eso la
cartera canónica de Wave pasa de cinco a **seis familias**: las cinco aceptadas el 2026-07-25 más **Product Design
360**. El delta del 2026-09-10 queda como registro histórico de la propuesta y no se reescribe.

**Qué resuelve.** La decisión abierta D6 del modelo económico («¿se aprueba la sexta familia en el ADR de Wave, o se
repliega a capability?») queda resuelta a favor de la sexta familia. La frontera interna, la relación con Web
Experience 360 (capability única, dos ofertas) y la frontera con Globe del delta 2026-09-10 pasan de propuesta a
decisión vigente, sin cambios de contenido.

**Cómo se resolvió, dicho con honestidad.** El delta anterior ataba la aceptación al gate G1 del modelo económico
(demanda externa verificada) y a un ADR V2. La aprobación llegó por **decisión explícita del operador**, no por
cierre de G1: este delta no registra evidencia nueva de demanda, de willingness-to-pay ni de cost-to-serve. Los
gates G1–G5 siguen siendo la validación pendiente del modelo, ya no la condición para que la familia exista en el
portfolio.

**Qué no dice la aprobación** *(lectura del 2026-10-09, superada por el
[delta 2026-10-10](#delta-2026-10-10--aprobación-total-de-product-design-360): la aprobación sí cubre el modelo, el
nombre público y la venta)*. La frase del operador no menciona precios, piso de margen por lane, posición de
Legal/IP ni claims de resultado; esos puntos siguen gobernados por el
[modelo económico](../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md) y no se dan por
aprobados aquí. El nombre «Product Design 360» ya aparece en collateral aprobado (lámina 13 del brochure), lo que
en la práctica lo usa como nombre público; la decisión D1 del modelo no se cerró por separado.

**Evidencia.** Brochure «Servicios web y digitales» (29 láminas, aprobado el 2026-10-09): Product Design 360 es la
lámina 13, presentada como definitiva y sin «Próximamente». Ficha y pendientes del brochure en
[`docs/services/wave/README.md`](../services/wave/README.md#collateral-comercial).

**Sincronización: cerrada el 2026-10-10.** El ADR propio, el modelo económico y las filas de `DECISIONS_INDEX.md`
quedaron alineados; ver el delta siguiente. Las secciones «Decisión» y «Consecuencias» de este ADR conservan el
texto del 2026-07-25 (cinco familias), con una nota que remite a los deltas, que son los que rigen para el conteo.

## Delta 2026-10-10 — aprobación total de Product Design 360

**Estado: aprobado por el operador, sin reservas de alcance.** El delta del 2026-10-09 leyó la aprobación de forma
estrecha: registró la sexta familia como aprobada, pero dejó escrito que el modelo económico y el ADR propio seguían
`Proposed` y que precios, piso de margen, Legal y gates «no se daban por aprobados». El 2026-10-10, al ver esos
documentos todavía en `Proposed`, el operador ordenó, textual: «Todo product design hay que ponerlo aprobado».

**Qué cubre la aprobación.**

- La **familia** en la cartera de Wave: seis familias, sin condición pendiente.
- Su **ADR propio**: [`EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md`](EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md) pasa a
  `Accepted`.
- Su **modelo de negocio**:
  [`Product Design 360 — Business Model V1.1`](../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md)
  pasa a `Approved`.
- Su **ficha de servicio**: [`product-design-360.md`](../services/wave/product-design-360.md).
- El **nombre público «Product Design 360»**: la decisión D1 del modelo queda resuelta.
- Su **venta**: ya no es «sólo pilotos gobernados por SOW».

**Qué queda superado.** Del delta 2026-09-10: «No aprueba la sexta familia, ni pricing, ni claims públicos, ni el
nombre público» y la «Condición de resolución» atada a G1 y a un ADR V2. Del delta 2026-10-09: el párrafo «Qué no
dice la aprobación» y la «Sincronización pendiente». Ambos deltas se conservan como registro; no se reescriben.

**Qué pasa con los gates.** G1–G6 del modelo económico son validación posterior a la aprobación: miden si la oferta
funciona, no si existe.

**Qué no cambia, porque es evidencia y no estado.** La aprobación es una decisión del operador; este delta no
registra una revisión de Legal ni de Finance, no fija precios y no agrega evidencia de demanda, de
willingness-to-pay ni de cost-to-serve. Siguen en pie las advertencias del modelo: comparables que no son evidencia
neutral, loaded cost local sin verificar (D7), persona BP9 en `hypothesis_only` y claims de resultado sujetos a la
lista de «Claims prohibidos». El ownership de las demás capabilities tampoco cambia.

**Documentos alineados el mismo día:** el ADR propio, el modelo, la ficha, [`DECISIONS_INDEX.md`](DECISIONS_INDEX.md),
[`docs/services/README.md`](../services/README.md), [`docs/services/wave/README.md`](../services/wave/README.md),
[`Wave Business Model V1`](../business-models/wave/WAVE_BUSINESS_MODEL_V1.md),
[`docs/business-models/README.md`](../business-models/README.md) y el context pack (`03` y `13`).
