# Efeonce Performance & Commerce Distribution — Offer Architecture Decision V1

## Architecture Decision 2026-09-10 — Performance como capability única con dos motions por comprador

- **Status:** Proposed
- **Date:** 2026-09-10
- **Owner:** Efeonce Strategy + Media & Distribution (owner comercial por confirmar)
- **Required partners:** Finance (cost-to-serve, piso de margen, retiro del SKU `EFG-003`, pass-through) · Legal/Privacy
  (datos first-party hacia plataformas, consentimiento, DPA, Ley 21.719) · Commercial (validación G1) · Wave Measurement &
  Analytics (instrumentación) · RevOps & CRM (señal de CRM en el motion B2B) · Creative Services (producción creativa)
- **Scope:** estructura de la solución Performance & Commerce Distribution de Media & Distribution; separación
  capability ↔ motion ↔ canal; modelo de compra programática; política de partnerships de plataforma; unidad de cobro;
  fronteras con Wave, RevOps & CRM, Creative Services y Channel & Commerce; invariantes comerciales
- **Reversibility:** two-way — documental; no hay runtime, schema ni contrato firmado. Revertir = volver a la sección
  única del catálogo de Media & Distribution
- **Confidence:** high para boundaries, taxonomía y el principio "canal = cobertura, no producto" · medium para el motion
  B2B como diferencial · **low para demanda, willingness-to-pay y cost-to-serve** · low para economics programáticos (partner
  seleccionado, fees desconocidos)
- **Validated as of:** 2026-09-10
- **Canonical model:** [`Media & Distribution — Business Model V1`](../business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md)
- **Service catalog:** [`Ficha de servicio`](../services/media-distribution/PERFORMANCE_COMMERCE_DISTRIBUTION_SERVICE_V1.md)
- **Pricing:** [`Performance & Commerce — Pricing Integrity Pack V1`](../business-models/media-distribution/PERFORMANCE_COMMERCE_PRICING_INTEGRITY_PACK_V1.md)
- **Evidence:** [market research 2026-07-26](../audits/commercial/PERFORMANCE_COMMERCE_DISTRIBUTION_MARKET_RESEARCH_2026-07-26.md)
  y [market update 2026-09-10](../audits/commercial/PERFORMANCE_MEDIA_CHANNELS_PARTNERS_PRICING_RESEARCH_2026-09-10.md)

### Contexto

Performance & Commerce Distribution existe desde 2026-07-26 como una de las tres soluciones de Media & Distribution,
con cinco módulos (Measurement & Signal Foundation, Performance Media Operations, Commerce Media Operations, Creative
Performance System y Algorithmic Media Governance) y una escalera de cuatro paquetes. La investigación de julio fijó la
tesis: Google y Meta automatizan la operación básica; el valor se mueve a la señal, la creatividad, el gobierno de los
algoritmos y la medición.

Al 2026-09-10 la solución tenía cinco huecos:

1. **Sin documentación propia.** Vivía como sección del catálogo de la línea; Creator Influence y Product Design 360
   ya tienen ficha, modelo y decisión propios.
2. **Sin arquitectura de precio.** No hay bandas, piso ni decisión entre fee fijo y porcentaje de inversión. El único
   artefacto de precio es el SKU legacy `EFG-003 · Servicio de Performance y Paid Ads` (USD 1.820/mes, 54 h de Paid
   Media Manager + 36 h de diseño), asignado a **Wave** —no a Media & Distribution—, con creatividad empaquetada dentro
   del fee y sin variables de complejidad.
3. **Un solo comprador modelado.** El beachhead es B2C/B2B2C. LinkedIn Ads no aparece en ningún documento, aunque
   Efeonce opera HubSpot y Salesforce: la conexión entre pauta y etapa de CRM es un activo que los competidores de
   performance puro no tienen.
4. **Canales y compra programática sin decidir.** TikTok, programmatic y CTV se nombran de forma genérica. Efeonce no
   tiene seat propio en un DSP; hoy compra vía partner o trading desk, sin términos de transparencia documentados.
5. **Partnerships de plataforma sin estado.** El registry sólo tiene Google Ads (bienvenida 2024, badge no verificado);
   nada de Meta, TikTok, LinkedIn, Amazon Ads ni Mercado Ads.

### Decisión

1. **Performance & Commerce Distribution sigue siendo una solución de Media & Distribution.** No se crea línea de
   negocio, product brand ni cuarta solución. Recibe ficha, pricing pack y decisión propios.

2. **Una capability, dos motions.** El oficio (señal, operación de medios, creatividad de performance, gobierno
   algorítmico, medición) es uno; los compradores, las señales de optimización y la métrica de valor son dos:

   | | **Motion A · Demand & Commerce** | **Motion B · B2B Pipeline** |
   |---|---|---|
   | Cliente | B2C, B2B2C, DTC, e-commerce, retail, servicios masivos | B2B con ciclo consultivo, ticket alto y CRM operativo |
   | Comprador | CMO, Head of Growth, Head of E-commerce | CMO / VP Marketing, Head of Demand Gen; Sales/RevOps valida |
   | Operador | Performance Lead, E-commerce Manager | Demand Gen Manager, Marketing Ops |
   | Señal de optimización | compra, valor, margen, catálogo, click-to-WhatsApp calificado | etapa de CRM: lead calificado → oportunidad → cierre (conversiones offline) |
   | Canales core | Meta, Google, TikTok, retail media | LinkedIn, Google Search, retargeting en Meta, ABM programático vía partner |
   | Métrica de valor | eficiencia combinada (MER/CAC combinado), margen de contribución, revenue incremental cuando hay diseño | costo por oportunidad calificada, pipeline con fuente CRM, velocidad |
   | Composición típica | Creative Services, Channel & Commerce, Wave | RevOps & CRM (HubSpot/Salesforce), Wave, Search Visibility 360 |

   El motion B se vende sólo cuando el cliente tiene CRM con etapas confiables o acepta instrumentarlas; sin eso se
   degrada a Motion A con objetivo de lead, y la propuesta lo dice.

3. **Los canales son cobertura, no productos.** Ningún SKU, paquete ni página vende "gestión de Meta Ads" o "agencia de
   Google Ads". La matriz de cobertura por canal —`core`, `selectivo`, `vía partner`, `no ofrecido`— vive en la ficha y
   se revisa cuando cambia una plataforma.

4. **Los cinco módulos siguen siendo la estructura de lanes.** El motion cambia su contenido, no crea módulos nuevos.
   No se introduce una tercera taxonomía.

5. **Frontera de la señal:** Performance es dueño de la **especificación de la señal de optimización** —qué evento
   optimiza cada campaña, reglas de valor, mapeo de etapas de CRM a conversiones offline, deduplicación exigida—.
   **Wave Measurement & Analytics** implementa y opera la instrumentación (GTM, GA4, server-side, APIs de conversión)
   bajo el contrato de medición del [ADR de Wave](EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md). **RevOps & CRM**
   es dueño del lado CRM (etapas, calidad de datos, sync). Con un solo cliente y un solo engagement, la propuesta nombra
   owner por lane.

6. **Programmatic se compra vía Real Audiences.** El partner programático seleccionado por el CEO el 2026-09-10 es
   **Real Audiences**, un DSP con operación en los cinco países de Efeonce. Se usa en dos modos y en secuencia: primero
   **managed por briefing** (Real Audiences opera; Efeonce define objetivo, audiencias y exclusiones, audita y lee
   resultados) y después **autogestionado**, con un trader de Efeonce certificado por Real Audiences, una vez pasado el
   gate de la ficha. La cláusula de transparencia es obligatoria antes de la primera campaña: fees de plataforma, datos y
   servicio declarados; reporte por dominio/app/placement; listas de exclusión de brand safety y sitios MFA; y ningún
   markup no declarado. Un seat en otro DSP sólo se evalúa si Real Audiences no cubre una necesidad —CTV o ABM B2B— con
   volumen que lo justifique. MiQ y TenX quedan como alternativas.

7. **Los partnerships de plataforma habilitan la ejecución; no son el diferencial.** Se persiguen cuando existe volumen
   gestionado y owner que cumpla los requisitos de cada programa. Ningún badge se comunica antes de verificarlo en el
   portal del programa. Estado y requisitos viven en el [Partnership Registry](../operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md).

8. **Unidad de cobro: fee de operación mensual por complejidad**, calculado sobre motion × canales × mercados × madurez
   de señal, separado de la inversión en medios. La inversión es pass-through transparente, idealmente facturada por la
   plataforma directo al cliente. El porcentaje de inversión existe sólo como componente de un híbrido con piso; nunca
   como métrica única. La producción creativa se cotiza en Creative Services.

9. **El SKU `EFG-003` queda en conflicto con esta decisión** (línea de negocio equivocada, creatividad empaquetada, sin
   complejidad). Se solicita a Finance su retiro o reemplazo por la gobernanza del catálogo; esta decisión no edita el
   seed.

10. **Operación AI-native con autoridad humana.** Lectura de cuentas por API o MCP oficial de cada plataforma, detección
    de anomalías, control de pacing, minería de términos de búsqueda y detección de fatiga creativa se diseñan como
    capacidades estructurales. Todo cambio de presupuesto, puja o estado de campaña requiere confirmación humana. Hoy no
    existe integración de plataformas publicitarias en Greenhouse: el nivel de madurez declarado es **1 · Structured**
    en la escalera de [2028](../strategy/EFEONCE_2028_PRODUCTIZED_AI_NATIVE_SERVICES_STRATEGIC_DIRECTION_V1.md).

### Invariantes duros

- **NUNCA** vender, cotizar ni titular una página por plataforma. El canal es cobertura dentro de un motion.
- **NUNCA** usar el porcentaje de inversión como única métrica de cobro, ni cobrar markup no declarado sobre medios.
- **NUNCA** acumular dos markups sobre el mismo peso (partner programático + Efeonce) sin disclosure en la cotización y
  aprobación de Finance.
- **NUNCA** reportar costo por lead como métrica de valor del motion B2B cuando existe señal de CRM: la métrica es costo
  por oportunidad calificada y pipeline con fuente CRM.
- **NUNCA** prometer ROAS, CAC, pipeline ni revenue. Platform ROAS no es incrementalidad; cada propuesta declara qué
  capa de la escalera de medición compra el cliente.
- **NUNCA** crear cuentas publicitarias, píxeles/datasets, audiencias o catálogos del cliente como propiedad de Efeonce.
  El cliente es dueño; Efeonce accede como partner con el menor privilegio que sirva. Al salir, el cliente conserva
  cuentas, datos, historial y aprendizajes.
- **NUNCA** subir datos personales a una plataforma (Customer Match, Conversions API, audiencias por lista) sin base de
  licitud, consentimiento cuando corresponda y DPA revisados por Legal.
- **NUNCA** conectar un agente con permisos de escritura sobre cuentas de clientes con un rol de administrador, ni dejar
  que un agente mueva presupuesto sin confirmación humana.
- **NUNCA** incluir producción creativa dentro del fee de performance. Performance diseña el test y lee el aprendizaje;
  Creative Services produce.
- **NUNCA** publicar un badge o claim de partner no verificado en el portal del programa.
- **NUNCA** vender un anuncio en ChatGPT u otro asistente de IA como visibilidad orgánica o AEO, ni prometer "aparecer en
  la respuesta": el anuncio aparece debajo, rotulado como patrocinado. Los canales emergentes entran como `selectivo`
  sólo donde la plataforma los habilita para la entidad y la audiencia del cliente.
- **SIEMPRE** comprar programmatic y CTV con cláusula de transparencia firmada por el partner.
- **SIEMPRE** separar en la cotización: fee Efeonce, inversión en medios, fees de partner/tecnología, producción,
  derechos e impuestos.

### Fronteras — sin cambio de ownership

| Capability | Qué hace aquí | Qué no hace |
|---|---|---|
| **Wave · Measurement & Analytics** | implementa GTM/GA4, server-side, APIs de conversión y consentimiento | decidir qué señal optimiza la pauta |
| **RevOps & CRM** (HubSpot/Salesforce) | etapas, calidad de datos, sync de conversiones offline desde el CRM | operar campañas |
| **Creative Services / Globe** | produce piezas, variantes, UGC y Run-and-Gun | diseñar el test ni leer el aprendizaje de medios |
| **Creator Influence & Content** | derechos, whitelisting y gobierno del creador | la compra de medios del anuncio amplificado, que opera Performance |
| **Channel & Commerce** | ejecución en tienda, trade y BTL; lee retail media junto a la góndola | operar la inversión en redes de retail media |
| **Search Visibility 360** | orgánico y AEO; comparte inteligencia de keywords y de prompts | pauta en buscadores ni anuncios en respuestas de IA |
| **Growth Strategy & Measurement** | MMM y medición cross-línea cuando el engagement lo compra | operación de medios |

### Lo que esta decisión NO hace

- No aprueba precios, bandas públicas, claims ni venta general: el pricing pack queda `hypothesis_only` hasta la revisión
  de Finance.
- No firma términos con Real Audiences: registra la selección del CEO; fees, cláusula y alcance siguen por cerrar.
- No cambia las tres soluciones de Media & Distribution ni el rol de Reach como product brand habilitadora.
- No construye integración de plataformas en Greenhouse ni federa tools de Ads en el gateway MCP: eso requiere su
  propia TASK con contrato gobernado.
- No publica ninguna landing: la decisión de superficie pública vive en su PDR.

### Condición de aceptación

Pasa a `Accepted` cuando se cumplan:

1. **G1 — demanda por motion:** al menos dos Performance Diagnostics pagados en 90 días, con al menos uno por motion.
2. **Finance:** cost-to-serve por nivel de complejidad medido en el primer piloto, piso de margen fijado y `EFG-003`
   resuelto.
3. **Legal/Privacy:** posición sobre envío de datos first-party a plataformas bajo la Ley 21.719, con plantilla de DPA.
4. **Programmatic:** cláusula de transparencia firmada con Real Audiences y primera campaña managed auditada contra ella.

Si G1 falla sólo en el motion B, se retira el motion B y el resto se mantiene.

### Alternativas rechazadas

| Alternativa | Por qué se rechaza |
|---|---|
| Un SKU por plataforma ("gestión de Meta", "gestión de Google") | Commoditiza, compite por tarifa con freelancers y con incumbentes que dominan esa SERP, y contradice la automatización de las plataformas |
| Mantener un solo motion B2C | Deja fuera el diferencial que la competencia no tiene: la pauta conectada a la etapa del CRM que Efeonce ya opera |
| Mover la pauta B2B a RevOps & CRM | Parte el oficio de medios en dos prácticas; RevOps vende plataformas y procesos, no compra de medios |
| Seat programático propio ahora | Costo fijo y mínimos de inversión sin volumen que los justifique |
| Pricing por performance puro | Efeonce no controla precio, oferta, stock, sitio, CRM ni ventas |
