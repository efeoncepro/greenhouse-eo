# Efeonce Social Media — Product Service Contract V1

> **Status:** `Approved for validation`
> **Owner:** Efeonce Social Media Practice + Strategy
> **Version:** V1.1 · 2026-07-29 · [delta 2026-10-10](#delta-2026-10-10--brochure-marketing-de-contenidos) (el contrato base no cambia)
> **Cliente visible:** Efeonce
> **Marca/producto habilitador:** Globe / Creative Studio sólo como capacidad futura no incluida por defecto
> **Modelo:** `On-Going + Managed Squad + efeonce-managed`
> **Subservices:** [`Social Media Subservices Catalog V1`](EFEONCE_SOCIAL_MEDIA_SUBSERVICES_CATALOG_V1.md)
> **Operating model:** [`Social Media Operating Model V1`](EFEONCE_SOCIAL_MEDIA_OPERATING_MODEL_V1.md)

---

## Delta 2026-10-10 — brochure «Marketing de Contenidos»

La decisión del operador, sus citas y lo que cubre están en el [delta del Business Model](../../business-models/creative-services/EFEONCE_SOCIAL_MEDIA_BUSINESS_MODEL_V1.md#delta-2026-10-10--brochure-marketing-de-contenidos-lo-que-entra-a-la-oferta). Este documento registra qué significa para el contrato de servicio. **El scope core, la lista «no incluye por defecto», los fences y el RACI no cambian.**

### Dos «seis» distintos

El brochure habla de **seis frentes** (social media management, influencer marketing, creadores y UGC, listening y trendjacking, social care, paid social). Este contrato habla de **seis bloques core** (§3). No son lo mismo: los seis bloques core se reparten entre el frente «social media management», el de listening y la parte de comunidad del frente «social care»; los demás frentes son composiciones o add-ons. En una propuesta, el frente se nombra como en el brochure y el alcance se escribe con los bloques y subservicios de este contrato.

La lámina de Social media del brochure agrupa el frente en estrategia y canales, sistema editorial, producción nativa, operación de canales, comunidad, y listening y tendencias. La medición y el aprendizaje, que aquí son un bloque core, aparecen en el brochure como láminas propias («Cómo sabes si funciona»).

### Qué queda dentro y qué queda fuera del contrato base

| Elemento del brochure | Tratamiento en este contrato |
|---|---|
| Social media management; series; adaptación nativa por formato; listening; trendjacking dentro de la reserva reactiva; social search | Core, con profundidad por nivel (§4) |
| Comunidad en canales (comentarios, menciones, mensajes) | Core dentro de la ventana contratada |
| Social care (atender y resolver), crisis y reputación, cobertura en vivo, lanzamientos | No incluido por defecto: add-on o proyecto con scope y SLA propios (§3, §7) |
| Influencer marketing, creadores y UGC, paid social, programa de creadores | No incluido: composición con Media & Distribution (§10) |
| Producción «pensada en vertical» | No incluido por defecto: producción especial con SOW (§10, Run & Gun) |
| Producción con IA | Entra a la oferta por decisión del operador; sin regla contractual todavía. Ver abajo |
| Comunidad en canales cerrados, voz ejecutiva, embajadores de marca | Entran a la oferta por decisión del operador; fuera del contrato base y sin unidad ni precio. Ver [catálogo](EFEONCE_SOCIAL_MEDIA_SUBSERVICES_CATALOG_V1.md#entradas-nuevas-código-provisional) |
| Social conectado al CRM | No incluido: composición con RevOps & CRM. Social entrega señales, identificadores y tráfico (§10) |

### Producción con IA: candidatos a quality gate

El brochure compromete cuatro cosas cuando una pieza se produce con IA. Si el operador y Legal/IP las confirman, pasan a §6 como gates de toda pieza que use IA generativa:

1. una persona dirige creativamente la pieza;
2. la marca y el producto que aparecen son los reales, nunca inventados;
3. los derechos y el uso comercial están revisados;
4. una persona revisa la pieza antes de publicar.

El cuarto ya está cubierto por la aprobación formal del cliente y por la regla de no publicar sin aprobación humana (§3, §6). Los otros tres son compromisos de servicio que este delta no contrastó con lo que Efeonce puede garantizar. Mientras tanto, el gate de disponibilidad de §9 sigue igual: el servicio es operable sin Globe y sin IA generativa.

### Composición humana: lo que muestra el brochure

El brochure muestra ocho roles con un solo interlocutor. La composición de referencia de §5 no cambia.

| Rol del brochure | Rol de §5 | Nota |
|---|---|---|
| Responsable de cuenta («tu único interlocutor») | Account / Delivery Lead | Mismo rol, nombre comercial |
| Estratega social | Social Strategist / Editor | El brochure no muestra por separado al Social Lead |
| Creativos de contenido (diseño, video y copy) | Copy / Content Specialist y Designer / Editor | |
| Community y social care | Community Manager | Social care sólo con el add-on correspondiente |
| Listening | Sin rol propio en §5; hoy es función de estrategia y community | |
| Analista | Sin rol propio en §5; está en el Operating Model como Insights / Analytics | |
| Especialista en creadores | No es de este servicio | Rol de Media & Distribution |
| Paid social | No es de este servicio | Rol de Media & Distribution |

Sigue valiendo que no se promete una persona full-time ni una cantidad de horas si el SOW no la define, y que el brochure dice lo mismo con otras palabras: «el equipo se dimensiona según tu plan».

### Superficies que el brochure le muestra al cliente

El brochure dice que el cliente ve su plan y sus resultados en Marketing Studio y que recibe el reporte de Efeonce Insights. Este contrato no los incluye como entregable. Se tratan con la misma regla que Globe en §9: el servicio debe poder operarse y reportarse sin ellos, y se declaran en el SOW sólo cuando el acceso de esa cuenta esté verificado. Arquitecturas dueñas: [Marketing Studio](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) y [Efeonce Insights](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md).

### Decisiones abiertas que tocan este contrato

Numeradas en el [Business Model §12](../../business-models/creative-services/EFEONCE_SOCIAL_MEDIA_BUSINESS_MODEL_V1.md#decisiones-abiertas-del-delta-2026-10-10): 8 (social care), 9 (producción con IA), 10 (un solo squad con seis frentes), 11 (Marketing Studio y métricas en vivo), 13 (voz ejecutiva y embajadores), 14 (contenido de los niveles) y 15 (entrada).

---

## 1. Qué compra el cliente

Una operación externa de Social Media dirigida por personas que convierte contexto de marca, señales de audiencia y prioridades de negocio en una presencia social consistente, relevante, conversada y capaz de aprender.

No compra una cantidad aislada de posts. Compra capacidad gobernada, continuidad, criterio, publicación, community management, escucha y evidencia de aprendizaje.

## 2. Cliente, operador y trigger

**Operador:** marketing, social, brand, content, ecommerce o communications.

**Trigger:** el equipo necesita sostener o mejorar redes, pero enfrenta falta de capacidad, consistencia, velocidad de respuesta, criterio nativo por plataforma o reporting accionable.

**Primer valor:** en las primeras semanas el cliente tiene prioridades sociales explícitas, pilares, calendario, responsables, flujo de aprobación y una primera lectura de señales.

## 3. Scope core

La oferta se organiza en seis bloques core: dirección/estrategia, sistema editorial/contenido, operación de canales, comunidad, listening/tendencias y medición/aprendizaje. El detalle contractual de cada subservicio, sus outputs y fronteras vive en el [Catálogo de subservicios V1](EFEONCE_SOCIAL_MEDIA_SUBSERVICES_CATALOG_V1.md).

### Incluye

- intake y diagnóstico inicial;
- estrategia social y pilares;
- series, formatos y calendario;
- copy y adaptación por plataforma;
- coordinación de diseño/video disponible en el scope;
- activación de Efeonce Run & Gun Studio para captura profesional cuando exista un SOW o módulo de producción aprobado;
- programación y publicación después de aprobación;
- community management en ventanas contratadas;
- escucha de conversación, tendencias y riesgos;
- reporte ejecutivo y learning log;
- recomendación del siguiente ciclo.

### Artefactos que recibe el cliente

- diagnóstico y mapa de oportunidades;
- social brief y sistema de pilares;
- calendario gobernado con estado de aprobación;
- briefs, copies, adaptaciones y assets incluidos;
- matriz de community y escalamiento;
- registro de publicaciones y cambios;
- reporte ejecutivo con learning log;
- roadmap del siguiente ciclo.

### No incluye por defecto

- inversión en medios o Paid Social;
- creators, influencers, UGC, derechos o whitelisting;
- jornadas de foto/video, talentos, música, viajes o producción especial;
- atención 24/7, crisis o customer care fuera de SLA;
- revenue, leads, ROAS o followers garantizados;
- Globe, Creative Studio Access o Studio Credits;
- rondas ilimitadas o publicación sin aprobación humana del cliente.

## 4. Packaging V1

Los nombres son hipótesis de validación; los límites exactos se cierran con capacidad real.

| Nivel | Para quién | Diferencia de valor |
|---|---|---|
| **Social Foundation** | Una marca con operación orgánica priorizada | estrategia base, una red primaria, calendario, contenido/adaptación, publicación, community acotada y reporte mensual |
| **Social Growth** | Marca que necesita consistencia, aprendizaje y más de una superficie | dos o tres plataformas, sistema de series, escucha periódica, mayor cadencia, community ampliada y learning review mensual |
| **Social Integrated** | Marca con mayor complejidad, mercados o governance | múltiples plataformas/mercados, social lead senior, coordinación multiárea, community intensiva, governance, reporting ejecutivo y planificación trimestral |

Los niveles no se diferencian sólo por número de piezas. El fence principal es capacidad, complejidad, cobertura, seniority, governance y velocidad.

### Matriz de fences

| Dimensión | Foundation | Growth | Integrated |
|---|---|---|---|
| Red primaria | 1 | 2–3 | multi-red / multi-mercado |
| Dirección | base mensual | social lead + learning review | social lead senior + governance trimestral |
| Editorial | pilares y calendario | series + reserva reactiva | sistema editorial multi-área |
| Community | ventana acotada | cobertura ampliada | cobertura intensiva y escalamiento |
| Listening | lectura básica | señales periódicas | social intelligence y riesgos |
| Reporting | mensual | mensual + learning | ejecutivo + planificación trimestral |
| Aprobaciones | flujo simple | varios stakeholders | governance/compliance formal |
| Complejidad | baja | media | alta |

Los límites numéricos de piezas, horas internas y ventanas se fijan en la cotización y SOW; no son públicos hasta validar capacidad.

## 5. Delivery y RACI

| Actividad | Efeonce | Cliente |
|---|---|---|
| Diagnóstico y estrategia | A/R | C/I |
| Calendario y propuesta de contenido | A/R | C/Approve |
| Producción/adaptación dentro del scope | R | C |
| Claims, promociones, datos de producto | C | A/R |
| Publicación | R después de aprobación | A/Approve |
| Community | R dentro de ventana | A para escalamiento |
| Crisis | R en diagnóstico/escalamiento | A/decisión institucional |
| Reporting y aprendizaje | A/R | C/Adopt |

`A/R` representa accountability y ejecución; el SOW debe convertirlo en nombres, ventanas, canales y tiempos concretos.

### Composición humana de referencia

| Rol | Responsabilidad | Puede ser compartido |
|---|---|---|
| Social Lead | dirección, prioridades, client counsel y learning | sí, según complejidad |
| Social Strategist / Editor | pilares, series, calendario y platform fit | sí |
| Copy / Content Specialist | hooks, captions, guiones y adaptación | sí |
| Designer / Editor | assets disponibles, versiones y QA | sí o por proyecto |
| Community Manager | inbox, comentarios, escalamiento y señales | sí, con cobertura explícita |
| Account / Delivery Lead | coordinación, riesgos, scope y cadence | sí, pero accountable nombrado |

No se promete una persona full-time ni una cantidad de horas si el SOW no la define. El cliente compra una combinación de capacidades con owner visible.

## 6. Quality gates

- brief completo y fuente de claims identificada;
- revisión de marca, tono, legibilidad y plataforma;
- aprobación formal del cliente;
- derechos y disclosures revisados cuando aplique;
- publicación verificable y registro de evidencia;
- learning log con decisión, no sólo métricas;
- escalamiento de incidentes y corrección trazable.

### Gate de contenido nativo

Cada pieza debe declarar plataforma, objetivo, audiencia, hook, acción esperada, fuente de claims, formato, derechos, estado de aprobación y versión final. No se considera adaptación nativa copiar el mismo asset y caption a todas las redes sin criterio.

## 7. Engagement y cambios

Recomendación de validación: mínimo inicial de tres meses. El SOW fija fee, alcance, ventanas de community, plataformas, mercados, rondas y fechas.

Cambios de dirección, nuevas plataformas, campañas, producción especial, urgencias, rondas adicionales y coberturas fuera de horario requieren change order o add-on.

### Dependencias del cliente

- acceso a cuentas y herramientas;
- guía de marca y voz;
- fuentes aprobadas para claims;
- inventario de producto, voceros o materia prima;
- owner de aprobación y backup;
- feedback consolidado dentro de la ventana acordada;
- disponibilidad de Legal/Compliance cuando aplique.

La ausencia de una dependencia se registra como bloqueo de cliente y puede mover fechas, reducir scope o activar una alternativa aprobada.

## 8. Expansión

Core → mayor cobertura de comunidad → Paid Social → Creator/UGC → producción especial → operación multi-mercado o measurement avanzado.

Ninguna expansión se activa sólo por satisfacción verbal: requiere problema confirmado, capacidad, economics, owner y siguiente compromiso bilateral.

## 9. Gate de disponibilidad

El servicio es operable sin Globe. Si Globe se incorpora en el futuro, deberá declararse como capability adicional con derechos, costo, fallback, approval humana y evidencia de mejora.

## 10. Fronteras de composición

| Necesidad | Dueño recomendado | Tratamiento |
|---|---|---|
| Mix de canales y media plan | Media & Distribution / digital marketing | no incluido en Social Media core |
| Paid Social | Media & Distribution | módulo separado |
| Creator/UGC | Media & Distribution / creator practice | derechos y fees separados |
| Funnel, attribution y CRM | Growth / HubSpot / Kortex | Social entrega señales y tráfico |
| Asset audiovisual especial | Creative Services | sprint o proyecto separado |
| Globe / producción generativa | Globe cuando esté disponible | futura capability opcional |

Una cuenta puede componerse de varias capacidades, pero cada una conserva owner, scope, pricing, rights y evidence.

### Run & Gun como capability componible

Efeonce Run & Gun Studio cuenta con equipos profesionales para producir contenido en terreno, entrevistas,
reels, liderazgo ejecutivo y piezas social-first. Esta capability fortalece Social Media, pero no convierte jornadas,
crew, movilidad, talentos, derechos o postproducción ampliada en parte ilimitada del fee recurrente. Cada activación
debe definir tratamiento, shot list, formatos, entregables, rondas, derechos, dependencias y SOW propio.
