# Search & App Visibility — extensión de Search Visibility 360 V1

> **Status:** `Proposed` · **Verdict económico:** `hypothesis_only`
> **Owner:** Wave/Search Visibility 360 + SEO/AEO Practice + Commercial + Finance
> **Versión:** V1.0 · 2026-09-10
> **Tipo:** extensión por superficie de un Product Service existente, más composición con Reach,
> Globe y Measurement & Analytics. **No es un Product Service nuevo ni una línea contractual aparte.**
> **Oficio:** [`seo-aeo/modules/10_ASO_APP_DISCOVERY.md`](../../../.claude/skills/seo-aeo/modules/10_ASO_APP_DISCOVERY.md) ·
> **Venta:** [`seo-aeo-practice/modules/14_ASO_COMPLEMENTARIO.md`](../../../.claude/skills/seo-aeo-practice/modules/14_ASO_COMPLEMENTARIO.md)
> **Evidencia de mercado:** [`ASO_SERVICE_MARKET_RESEARCH_2026-09-10.md`](../../audits/commercial/ASO_SERVICE_MARKET_RESEARCH_2026-09-10.md)
> **Oportunidad viva, sin oferta:** [`berel-app-movil`](../../commercial/tenders/berel-app-movil/README.md)
> **Próxima revisión:** después del primer diagnóstico con acceso a consolas o de dos oportunidades calificadas.

## 1. Decisión propuesta

Search Visibility 360 se extiende a las tiendas de apps (App Store y Google Play) y al
descubrimiento de apps por IA, para clientes que tienen app. Se registra como **expansión por
superficie** —la capa Expansion del [Pricing Integrity Pack](SEARCH_VISIBILITY_360_PRICING_INTEGRITY_PACK_V1.md)
§3— y no como Product Service nuevo, porque:

- **el oficio base es el mismo.** Entre 2025 y 2026 las tiendas adoptaron lo que cambió la búsqueda
  web: interpretan la metadata con LLM (App Store tags), responden en vez de listar (Ask Play) y
  personalizan (Personalized Collections). Entidad, intención, contenido y medición son el mismo
  trabajo sobre otra superficie;
- **no hay todavía owner único, pricing, cost-to-serve ni un solo caso;**
- **partes esenciales las entregan otras capabilities**: paid → Reach; creativos → Globe;
  instrumentación de la app → Measurement & Analytics; App Intents y deep links → ingeniería del
  cliente o Web Experience 360.

Nombre comercial provisional para discovery: **Search & App Visibility** (decisión abierta D1).

## 2. Problema del cliente

La persona que termina instalando una app pasa por varias superficies: pregunta en un asistente
de IA, busca en Google, llega a la ficha y decide. Cada superficie la opera un equipo distinto:

- el equipo web o la agencia SEO no mira la tienda;
- el equipo de la app o la agencia de ASO optimiza la ficha sin mirar la web;
- el equipo de UA compra instalaciones sin que la ficha esté preparada para convertirlas;
- los reportes comparan métricas incomparables: el "Search" de Google Play solo cuenta búsquedas de
  la marca, y el "App Store Search" de Apple incluye anuncios.

Resultado: la app se describe distinto en cada lugar, los asistentes la recomiendan mal o no la
recomiendan, y nadie sabe qué parte de las instalaciones viene de gente que no conocía la marca.

## 3. JTBD, resultados controlables y claims no autorizados

> Cuando mi app compite por ser encontrada en Google, en los asistentes de IA y dentro de las
> tiendas, quiero que se describa y se encuentre de forma coherente en todas esas superficies, para
> que más personas con la intención correcta lleguen a la ficha y la instalen, sin operar cada
> superficie como un silo.

### Resultados controlables

- metadata, creativos y CPP/CSL coherentes por tienda, idioma y país;
- mapa de intención medido con datos de tienda, no con volúmenes de Google;
- experimentos nativos con muestra suficiente y resultado reportado con su confianza;
- operación de reseñas: solicitud nativa, respuesta y temas recurrentes derivados a producto;
- puente web→tienda medible (links de campaña, UTM, landing de la app);
- presencia de la app en respuestas de asistentes para un panel de preguntas de categoría, con fecha;
- especificación de qué acciones y entidades exponer con App Intents o Engage SDK.

### Claims no autorizados

- garantizar ranking en la tienda, instalaciones o rating;
- atribuir instalaciones a recomendaciones de IA (no existe source type ni estudio público);
- citar "de 3 a 4 estrellas = +89% de conversión" (sin fuente original localizable);
- presentar el "65–70% de las descargas viene de búsqueda" como dato actual u orgánico (es de 2022,
  de Apple Ads, e incluye búsqueda pagada);
- vender Ask Play, Personalized Collections o App Store tags como activas en LATAM sin verificarlo
  en el país (las tags son hoy solo EE. UU.);
- comprar o incentivar reseñas o instalaciones, bajo cualquier forma.

## 4. Arquitectura

```text
CAPA 3 — Descubrimiento por IA
         Ask Play · Gemini · Personalized Collections/App Notes · Siri/Spotlight (App Intents)
CAPA 2 — ASO clásico
         rankear en la búsqueda de la tienda + convertir la ficha
CAPA 1 — Fundamentos compartidos  ← el aporte diferencial de Search Visibility 360
         UNA entidad: nombre, propuesta, categoría, features y precios iguales
         en la web, la ficha, las reseñas y el Knowledge Graph
```

La capa 1 es la que una práctica SEO/AEO ya domina y la que casi ninguna agencia de ASO cruza.
Las capas 2 y 3 son oficio que se ejecuta con rigor (módulo 10 del oficio).

## 5. Catálogo de líneas propuesto

| # | Línea | Engagement | Qué compra | Entregables y evidencia de aceptación | Borde |
|---|---|---|---|---|---|
| L0 | **App Visibility Diagnostic** | Diagnostic | Línea base y prioridades | Con acceso a consolas: línea base de 90 días por fuente, plataforma y país ●. Sin acceso: fichas públicas, datos de App Data (DataForSEO) y panel de prompts, marcados ◑ con fecha. Mapa de consistencia web↔ficha↔IA. Backlog priorizado con RICE | No es auditoría ilimitada ni promete resultado |
| L1 | **Store Foundation** | Sprint, precio fijo | La base de la ficha | Metadata por tienda, idioma y país · mapa de intención con datos de tienda · arquitectura de CPP/CSL con deep links · brief creativo (orden y captions de screenshots, video, ícono) · setup de solicitud nativa de reseñas · landing de la app en la web con schema de contenido visible · links de campaña y UTM · contrato de medición firmado | No incluye producción creativa (Globe) ni cambios de código |
| L2 | **Launch / Release Visibility Sprint** | Sprint | Un lanzamiento o release | Identidad del release por país · novedades · in-app events · CSL/CPP de lanzamiento · coordinación con el contenido web y, si hay paid, con Reach · readout a 30 días | La inversión en medios es de Reach |
| L3 | **Store Visibility Operations** | On-Going, lane | Operación recurrente | Iteración de metadata por release · experimentos PPO/SLE cuando haya volumen · operación de reseñas · calendario de CPP, CSL y eventos · readout mensual por fuente de adquisición con sus caveats | Capacidad declarada; nunca precio por keyword, CPP o reseña |
| L4 | **AI App Discovery** | Módulo de L3 o add-on | Que los asistentes describan y recomienden bien la app | Panel de prompts de categoría por mercado (ChatGPT, Gemini, Perplexity) con método de Share of Voice · auditoría de entidad · especificación de App Intents y Engage SDK · verificación trimestral de qué superficies de IA están activas en cada país | No promete instalaciones; la implementación de código queda fuera |
| L5 | **Expansión** | Cambio de alcance | + app · + plataforma · + país · + idioma | Mismo contrato, alcance ampliado | En iOS, CL/CO/MX/PE comparten la metadata en español de México: lo local se diferencia con CPP y creativos. En Play, con CSL por país |

### Composición con otras capabilities (fuera de esta extensión)

| Necesidad | Capability dueña | Borde |
|---|---|---|
| Apple Ads y Google App campaigns | Reach ([Media & Distribution](../../services/media-distribution/README.md)) | La extensión aporta CPP/CSL, keywords e intención; la inversión y las pujas son de Reach |
| Screenshots, video e íconos | Globe (Creative Services) | La extensión define brief y criterio; Globe produce |
| Eventos de app, atribución, SDK de medición | Measurement & Analytics (Wave) | La extensión define qué hay que medir |
| App Intents, deep links, Engage SDK, Smart App Banner | Ingeniería del cliente o Web Experience 360 | La extensión especifica; no programa |
| App o plugin dentro de ChatGPT | Agent Systems & Platforms (Wave) | No es ASO |
| Producto y UX de la app | Cliente o Product Design 360 (propuesta) | Los temas de las reseñas alimentan su backlog |

## 6. Delivery y operating mode

- L0, L1 y L2 se entregan como **Productized Service**; L3 y L4 como **lane gestionada**.
- **Operating mode por defecto: `co-operated`.** La cuenta de developer es del cliente y publicar
  exige roles de App Store Connect y Play Console (Account Holder, Admin, App Manager o Marketing en
  Apple). Pasa a `efeonce-managed` solo si el cliente delega la publicación por escrito.
- **Prerequisito de intake:** acceso con rol Marketing o App Manager y cadencia de releases conocida.

## 7. RACI

| Actividad | Wave/Search | Cliente (equipo de la app) | Globe | Reach |
|---|---|---|---|---|
| Diagnóstico y línea base | A/R | C (acceso) | — | C si hay paid |
| Metadata y mapa de intención | A/R | Approve | — | C |
| Brief creativo | A/R | Approve | C | C |
| Producción de screenshots y video | C | Approve | A/R | — |
| Publicación en consolas | R (si hay delegación) | A | — | — |
| Experimentos nativos | A/R | Approve | C | — |
| Respuesta a reseñas | R | A (tono, escalamiento) | — | — |
| Temas de reseñas → producto | R | A | — | — |
| App Intents / deep links | C (especifica) | A/R | — | — |
| Apple Ads / App campaigns | C | Approve | C | A/R |
| Contrato de medición | R | A sobre datos | — | R en paid |

Cada SOW declara qué capability es prime, cuáles se componen y quién responde por cada outcome.

## 8. Operator & Buying Group Contract

| Campo | Contenido |
|---|---|
| **Operador (nombre funcional)** | Quien responde por la ficha y los releases de la app. Suele estar en growth móvil, product marketing o UA |
| **Workflow y JTBD del operador** | Prepara cada release: qué cambia, qué dice la ficha, qué creativos se suben, qué se responde a las reseñas, y reporta instalaciones a su jefatura |
| **Primer valor observable** | Un diagnóstico con la línea base por fuente leída con las definiciones correctas (por ejemplo, descubrir que su "Search" de Play solo cuenta búsquedas de la marca) y un backlog para el próximo release |
| **Condición de adopción** | Acceso a consolas con rol adecuado y fecha del próximo release |
| **Recorrido** | Release sin tracción o ficha desalineada → L0 o L2 alrededor de un lanzamiento → L1/L3 → el operador usa el readout para defender presupuesto → expansión por país, plataforma, app o composición con Reach |
| **Señales por rol** | Usuario = operador · operator-champion = quien lleva el readout a su comité · problem owner = jefatura de growth o digital · sponsor = CMO o gerencia digital · economic buyer = CMO o gerencia comercial · governance owner = legal/compliance (políticas de reseñas y datos) y dueño técnico de la cuenta de developer |
| **Buying group y decisión** | En un cliente SEO existente, el sponsor es el mismo del SEO; el equipo de la app entra como stakeholder nuevo y puede bloquear por acceso |
| **Paper process (separado)** | Change order sobre el contrato SEO vigente cuando es expansión; SOW nuevo cuando el sponsor es otro. En licitaciones, las bases del comprador mandan |
| **Métrica de capacidad desbloqueada** | Releases con ficha, creativos y respuestas actualizados sin carga del equipo interno; tiempo desde release hasta ficha actualizada; experimentos completados con muestra |
| **Evidencia para renovar** | Tendencia por fuente (Explore y Search en Play; App Store Search neto de Apple Ads), resultados de experimentos, conversión contra pares con los benchmarks nativos, presencia en asistentes con fecha |
| **Triggers de expansión** | País nuevo · plataforma nueva · app nueva · inicio de paid · llegada a LATAM de superficies de IA de tienda |
| **Unknowns** | Quién compra ASO en LATAM (no hay encuesta pública) · disponibilidad de las superficies de IA en español · disposición a pagar la tienda aparte del SEO · capacidad interna de ASO |
| **Next experiment** | Diagnóstico L0 en Berel con acceso a consolas, alrededor del lanzamiento de su app |
| **Condición de falsación** | Si en dos oportunidades el comprador no separa presupuesto para la tienda de lo que ya paga en SEO, o el equipo de la app no entrega acceso a consolas, la extensión se repliega a un módulo del diagnóstico SEO |

## 9. Hipótesis de pricing (`hypothesis_only`)

**Métrica de valor candidata:** sobre app × plataforma × país + lane de operación gobernada.
Coherente con la métrica de SV360 ("property + mercados/superficies + lane").

| Línea | Unidad de cobro candidata | Frecuencia | Driver de costo |
|---|---|---|---|
| L0 | Fee fijo, o incluido como cuña para clientes SV360 vigentes (D2) | Una vez | Horas de especialista, datos de tienda |
| L1 | Fee fijo por alcance y aceptación | Una vez | Horas de especialista; producción creativa aparte (Globe) |
| L2 | Fee fijo por lanzamiento | Por evento | Coordinación con Reach y Globe |
| L3 | Fee mensual por lane con capacidad declarada | Mensual | Releases por mes, plataformas, países |
| L4 | Incluido en L3 o add-on | Mensual | Corridas del panel de prompts |
| L5 | Change order | Por expansión | Idem L3 |

**Reglas:**

- Cotizador y piso de 45% de margen bruto, como todo SV360.
- Nunca precio por keyword, screenshot, CPP o reseña respondida.
- L1 nunca va gratis.
- Medios (Reach) y producción creativa (Globe) se facturan por su dueño o como pass-through
  declarado; nunca escondidos dentro de la lane.
- Herramientas: los datos de tienda cuestan poco (DataForSEO, fracciones de centavo por ficha ✅;
  AppTweak desde ~USD 79/mes ⚠️). Incluirlas en la lane o pasarlas como pass-through es la decisión D3.
- **No se cobra la línea de plataforma o transparencia por el alcance de tienda** mientras
  Greenhouse no mida tiendas (§11).
- **Referencia de mercado, solo orden de magnitud ⚠️:** retainers de ASO de USD 2.000–10.000/mes y
  auditorías de USD 2.000–15.000, en fuentes secundarias sin metodología. ❌ Ninguna agencia LATAM
  publica tarifas.

**Sensibilidad:** no calculable todavía. Falta el cost-to-serve de un especialista de ASO y la
capacidad por release. Bloquea el paso a `approved_for_validation`.

## 10. Métricas

| Métrica | Definición y fuente | Caveat obligatorio |
|---|---|---|
| Visitas por búsqueda de categoría (Play) | Visitantes de ficha con fuente Explore, Play Console | Explore también incluye navegación |
| Visitas por búsqueda de marca (Play) | Visitantes con fuente Search, Play Console | Solo cuenta búsquedas del nombre de la app o de la marca |
| Descargas por búsqueda (Apple) | App Store Search menos lo atribuido a Apple Ads | Dos consolas con métodos distintos |
| Puente web→tienda | Web Referrer (Apple), Google Search orgánico y UTM (Play) | En iOS, Web Referrer solo cuenta Safari |
| Conversión de ficha | Descargas ÷ impresiones únicas (Apple); conversión con comparación contra pares (Play) | No mezclar con benchmarks de vendors, que usan otra definición |
| Resultado de experimento | Diferencia y confianza reportadas por PPO o Store Listing Experiments | Sin muestra, no es hallazgo |
| Rating | Rating por territorio | Apple permite resetearlo al lanzar una versión |
| Presencia en asistentes | Menciones en un panel fijo de prompts, por motor, mercado y fecha | Mide presencia, no instalaciones |
| Delivery | Tiempo desde release hasta ficha actualizada; experimentos completados; OTD | Por lane |

## 11. Estado de runtime (Greenhouse)

- **Greenhouse no mide tiendas.** El allowlist de DataForSEO (`src/lib/ai/dataforseo-families.ts`)
  tiene `serp`, `labs`, `backlinks`, `onpage` y `domain`, sin `app_data`. Agregarla requiere familia
  nueva, migración del CHECK del ledger de gasto y test de paridad (skill `dataforseo-operator`).
- **Cobertura del proveedor:** la App Data API de App Store incluye CL, CO, MX y PE; la búsqueda en
  la base de fichas funciona solo en EE. UU.; la cobertura por país de Google Play no está verificada.
- **Consecuencia:** hasta que exista runtime, la extensión se opera con las consolas del cliente y
  herramientas externas, y **no se promete transparencia de tienda en el portal**. La inversión en
  runtime es la decisión D4; si se aprueba, nace como task `backend-data` separada.

## 12. Plan de validación

| Hipótesis | Experimento | Threshold inicial | Stop condition |
|---|---|---|---|
| Clientes SEO con app pagan por la extensión | 3 conversaciones con clientes o prospectos SV360 con app | 2 describen el problema y aceptan el diagnóstico | Lo ven como trabajo de su agencia de medios |
| El cruce web↔ficha↔IA encuentra problemas que una agencia de ASO pura no ve | 2 diagnósticos | ≥5 inconsistencias accionables con owner por cuenta | Ninguna inconsistencia relevante |
| El acceso a consolas se consigue | 2 cuentas | Acceso con rol Marketing o App Manager en menos de 2 semanas | Sin acceso: solo se ofrece el diagnóstico ◑ |
| Las superficies de IA de tienda llegan a LATAM | Verificación trimestral por país | Alguna de Ask Play, Collections o tags activa en español | Ninguna: L4 queda como panel de presencia en asistentes |
| El margen sostiene el piso | Primera propuesta con cotizador | ≥45% con la lane L3 | Bajo 45%: reducir alcance o no ofrecer |

## 13. Gates

**Para pasar a `approved_for_validation`:**

- decisiones D1 a D6 tomadas;
- cost-to-serve estimado por Finance;
- capacidad de ASO identificada (interna o partner);
- cláusula contractual contra reseñas incentivadas, compra de instalaciones y keyword stuffing;
- alcance del piloto con Berel acordado.

**Para convertirse en Product Service propio** (mismos gates que la composición Search + Social):
buyer y JTBD confirmados · owner único y RACI estable · dos casos con delivery repetible · pricing y
cost-to-serve reconciliados · contrato de medición y evidence pack · derechos, datos y handoffs
definidos · renovación o expansión observada · decisión explícita de Strategy, Commercial, Finance y
Wave.

## 14. Decisiones abiertas

| # | Decisión | Opciones | Dueño |
|---|---|---|---|
| D1 | Nombre comercial | "Search & App Visibility" provisional · otro | Commercial + Wave |
| D2 | El diagnóstico L0 | Gratis como cuña para clientes SV360 · pagado siempre | Commercial + Finance |
| D3 | Herramientas | Solo DataForSEO + consolas · sumar una herramienta de ASO (AppTweak u otra) · pass-through o incluida | SEO/AEO Practice + Finance |
| D4 | Runtime en Greenhouse | Invertir en la familia `app_data` y lecturas · operar fuera del portal hasta tener dos clientes | Product + Wave |
| D5 | Piloto con Berel | Diagnóstico L0 · sprint L2 alrededor del lanzamiento · ambos | Owner de la cuenta |
| D6 | Capacidad de ASO | Especialista interno · formar al equipo SEO · partner | Wave + People |

## 15. Fuentes

- Oficio y datos verificados: [`seo-aeo/modules/10_ASO_APP_DISCOVERY.md`](../../../.claude/skills/seo-aeo/modules/10_ASO_APP_DISCOVERY.md) y [`seo-aeo/SOURCES.md`](../../../.claude/skills/seo-aeo/SOURCES.md) §5
- Mercado, precios, comprador y riesgos: [`ASO_SERVICE_MARKET_RESEARCH_2026-09-10.md`](../../audits/commercial/ASO_SERVICE_MARKET_RESEARCH_2026-09-10.md)
- [`Search Visibility 360 Business Model V1`](SEARCH_VISIBILITY_360_BUSINESS_MODEL_V1.md) · [`Pricing Integrity Pack`](SEARCH_VISIBILITY_360_PRICING_INTEGRITY_PACK_V1.md) · [`Search + Social Composition`](SEARCH_SOCIAL_VISIBILITY_COMPOSITION_V1.md)
- [`ADR Wave Portfolio Boundaries`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md) · [`Product Service Operating Model`](../EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md)
- Oportunidad viva: [`berel-app-movil`](../../commercial/tenders/berel-app-movil/README.md)

Estado honesto: `Proposed` y `hypothesis_only`. Es una hipótesis de extensión, no un producto
aprobado, y no autoriza a publicar precios ni a declarar la capacidad como vigente.
