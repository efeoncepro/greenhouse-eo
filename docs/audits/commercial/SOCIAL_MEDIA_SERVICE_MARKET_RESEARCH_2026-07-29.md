# Social Media Service — Market Research V1

> **Fecha de corte:** 2026-07-29
> **Objeto:** tendencias del servicio, arquitectura de oferta y patrones comerciales de agencias grandes y LATAM/Chile
> **Uso:** insumo para el modelo de negocio de Efeonce Social Media
> **Estado:** evidencia de mercado; no autoriza claims, pricing ni venta
> **Método:** revisión de páginas comerciales oficiales, publicaciones de plataformas y pricing público; triangulación cualitativa

## 1. Pregunta de decisión

¿Cómo debe vender Efeonce un servicio de Social Media humano y recurrente, qué capacidades debe incluir en el core, qué módulos debe separar y qué señales de mercado deben influir en el packaging?

## 2. Resumen ejecutivo

El mercado está dividido en dos capas:

1. **Commodity mensual:** planes por cantidad de publicaciones, redes y formatos. Compite por presencia y volumen.
2. **Operación social gestionada:** equipo, estrategia, contenido nativo, publicación, comunidad, escucha, governance, reporting y aprendizaje. Compite por capacidad, relevancia, velocidad y accountability.

Las grandes agencias venden principalmente la segunda capa. No suelen publicar precios; venden propuestas configuradas por marca, mercados, equipo, complejidad, governance y módulos. En Chile y LATAM sí aparecen precios públicos, pero mezclan servicios no comparables y suelen anclar la conversación en volumen.

La oportunidad para Efeonce es construir una oferta intermedia-alta: suficientemente productizada para ser repetible, pero suficientemente humana para conservar criterio social, conversación y responsabilidad.

## 3. Peer set

### Agencias globales / enterprise

- VML
- Ogilvy / WPP
- Havas
- Dentsu
- Publicis
- Accenture Song

Se eligieron porque representan redes globales y modelos de operación para marcas grandes, multi-mercado y multi-capability.

### Agencias Chile/LATAM con pricing o packaging visible

- Mauka Estudio
- MILA Social
- Big Media Partners
- Publicitate
- Mazmedia Chile
- Mercaboom México
- Orbis México
- Sweetspot Argentina

Se eligieron porque exponen el patrón de entrada que un cliente chileno o latinoamericano puede comparar públicamente.

## 4. Benchmark de arquitectura comercial

| Peer | Arquitectura observada | Qué compra el cliente | Señal de modelo |
|---|---|---|---|
| VML | Strategy, Creative, Activation, Measurement | Operación end-to-end configurable | Solution-led / enterprise |
| Ogilvy | Social, content, influence, community, analytics, culture | Relevancia, comunidad y relación con consumidores | Capability network / multi-market |
| Havas | Strategy, content, community, paid, listening, reporting | Full-service social media retainer | Retainer gestionado |
| Dentsu | Social strategy, organic, paid, creators, production, reporting | Escala, velocidad y optimización | Hub / command center |
| Publicis | Audience, creators, native content, media, listening, measurement | Presencia diaria y activación integrada | Modular / plug-and-play |
| Accenture Song | Community, content, commerce, creators, data, measurement | Relevancia y crecimiento conectado a tecnología | Transformation-led |
| MILA Social | Estrategia, producción, calendario, aprobación, community, reportes | Operación completa de redes | Retainer paquetizado |
| Big Media | Social + Meta/Google Ads + photo/video + dashboard | Growth bundle | Paquete híbrido |
| Mauka | Instagram, reels, fotos, carruseles, stories, reportes | Presencia y producción mensual | Volume-led |
| Orbis | Estrategia, contenido, community; separa Social Ads | Marca y conversión | Anti-commodity positioning |

### Conclusión del benchmark

La estructura que más se repite en los referentes fuertes es:

```text
strategy → creative/content → activation/publishing → community/listening → measurement/learning
```

Paid, creators, commerce y producción especial se integran cuando corresponde, pero se pueden separar como capacidades, fees y owners distintos.

## 5. Tendencias verificadas y consecuencias de servicio

### 5.1 Social es una operación cultural, no sólo un canal

Las agencias grandes hablan de relevancia cultural, comunidades, advocacy y relaciones sostenidas. La implication es que el equipo debe decidir cuándo participar, cuándo adaptar y cuándo no subirse a una tendencia.

**Capacidad requerida:** social strategy, cultural monitoring, trend response y governance.

### 5.2 El calendario rígido pierde frente al sistema editorial flexible

TikTok recomienda reservar capacidad para conversaciones emergentes, formatos nativos e interacción en tiempo real. El calendario sigue siendo necesario, pero debe tener una capa planificada y una capacidad reactiva gobernada.

**Capacidad requerida:** 70–80% de cadencia planificada + 20–30% de reserva estratégica, sujeto a validación de cada cuenta.

### 5.3 La autenticidad y la utilidad ganan al pulido genérico

La saturación de contenido producido con IA aumenta el valor de personas, expertos, demos, testimonios, escenas reales y puntos de vista específicos.

**Capacidad requerida:** acceso a expertos, briefing de voceros, social-first craft, edición ágil y disclosure de IA cuando corresponda.

### 5.4 Social search es una capa de contenido

Las personas consultan TikTok, Instagram y YouTube para descubrir, comparar y validar. Hooks, captions, texto en pantalla, comentarios y perfiles deben trabajar como superficies de búsqueda.

**Capacidad requerida:** social query research, arquitectura de temas, keywords nativas, captions indexables y lectura de preguntas recurrentes.

### 5.5 Community management se convierte en community engagement

La operación madura no se limita a responder. Escucha, clasifica, reconoce, deriva, participa, detecta riesgos y devuelve insights a estrategia y contenido.

**Capacidad requerida:** matriz de respuesta, escalamiento, social care boundary, SLA, listening y learning log.

### 5.6 Creators se vuelven una línea de distribución

Creators, UGC, whitelisting y paid usage tienen economics, rights y workflows propios. No deben esconderse dentro del fee core.

**Decisión Efeonce:** Creator/UGC es módulo separado, aunque pueda componerse en una cuenta Social Media.

### 5.7 La medición se desplaza hacia señales conectadas

Las plataformas y agencias intentan conectar contenido, viewers, búsquedas de marca, CRM, pipeline, commerce y revenue. Pero Social Media no controla por sí sola la atribución final.

**Capacidad requerida:** reporting por objetivo, learning agenda y handoff a Growth/Media/CRM cuando el claim pase de señal social a resultado de negocio.

## 6. Qué es commodity y qué diferencia

### Commodity

- calendario mensual;
- grilla de contenidos;
- posts estáticos, carruseles, stories y reels como inventario;
- copy genérico;
- programación;
- reporte de alcance, impresiones y likes;
- Instagram/Facebook/TikTok como lista de redes;
- “contenido que conecta” sin mecanismo ni evidencia.

### Diferenciadores observables

- personas senior y responsables nombrados;
- community coverage con ventanas, SLA y escalamiento;
- sistema de aprendizaje y decisiones, no sólo reporte;
- contenido nativo por plataforma;
- capacidad reactiva y trend governance;
- social search y social listening;
- approval workflow visible;
- conexión disciplinada con paid, creators, commerce y CRM;
- memoria acumulada de formatos, hooks, preguntas, riesgos y decisiones.

## 7. Pricing público observado

Los precios publicados en Chile y México son direccionales, no comparables como benchmark estadístico:

| Mercado / oferta | Señal pública observada |
|---|---:|
| Chile, oferta básica de contenido | aproximadamente CLP 300.000–700.000 mensuales |
| Chile, operación con equipo, video, community y reporting | aproximadamente CLP 1.200.000–4.500.000+ mensuales |
| México, planes de una a tres redes | desde MXN 4.500–8.500 en algunas ofertas públicas |

El precio sube cuando aparecen equipo senior, video, community coverage, dashboards, UGC, influencers, paid o mayor complejidad. El mercado rara vez publica horas, margen, derechos, rondas o SLA completos.

## 8. Cómo compran las grandes cuentas

La evidencia pública sugiere una compra por:

- scope de capability;
- equipo y seniority;
- mercados, marcas y plataformas;
- nivel de governance;
- cadencia y velocidad;
- módulos de paid, creators, commerce o production;
- reporting y measurement;
- capacidad de coordinar hubs, proveedores y equipos internos.

El pricing exacto es una inferencia de mercado, no evidencia pública uniforme. Efeonce debe validarlo mediante propuestas, pilotos y cost-to-serve.

## 9. Implicaciones para Efeonce

### Adoptar

- operación recurrente por personas;
- cuatro o cinco capas conectadas;
- core mensual + módulos explícitos;
- community como capacidad de valor, no soporte residual;
- reporting como learning system;
- pricing por capacidad y complejidad;
- Globe como futura aceleración, no fundamento actual.

### Adaptar

- reservar capacidad reactiva sin prometer trend-jacking ilimitado;
- usar tiers como fences de capacidad, no como menú artificial;
- conectar social con negocio sólo cuando exista owner y tracking suficiente;
- ofrecer una entrada diagnóstica pagada antes del retainer cuando la cuenta esté inmadura.

### Descartar

- competir por precio por post;
- prometer viralidad o revenue;
- incluir creators, paid y derechos en una bolsa opaca;
- vender una plataforma aún no disponible;
- convertir IA en el argumento principal del servicio.

## 10. Fuentes

### Agencias

- [VML Social Media](https://www.vml.com/expertise/social-media), revisado 2026-07-29.
- [Ogilvy](https://www.ogilvy.com/about), revisado 2026-07-29.
- [Havas Social](https://hk.havas.com/social-media/), revisado 2026-07-29.
- [Dentsu Boost Camp](https://www.dentsu.com/es/en/boost-camp/boost-camp/boost-camp), revisado 2026-07-29.
- [Ogilvy APAC Connected Social](https://www.ogilvy.com/ap/ideas/ogilvy-apac-unites-social-expertise-under-socialogilvy-banner), publicado 2025-05-20.
- [Publicis UNIT3C](https://www.publicisgroupe.com/en/news/press-releases/publicis-media-launches-unit3c-a-unique-end-to-end-social-marketing-solution), revisado 2026-07-29.

### Plataformas y tendencias

- [TikTok Next 2026](https://newsroom.tiktok.com/introducing-tiktok-next-2026-our-trend-forecast-for-marketers-for-the-year-ahead-ca?lang=en-CA), publicado 2026-01-14.
- [LinkedIn — The Art & Science of Video](https://business.linkedin.com/content/dam/business/marketing-solutions/global/en_US/site/pdf/wp/2025/the-art-and-science-of-video.pdf), revisado 2026-07-29.
- [YouTube — Search Profiles for Creators](https://blog.youtube/news-and-events/google-search-profiles-for-creators/), publicado 2026-06-04.
- [IAB Creator Economy Ad Spend & Strategy Report](https://www.iab.com/insights/2025-creator-economy-ad-spend-strategy-report/), publicado 2025-11-20.
- [Meta — Inspiring Creativity](https://about.fb.com/news/2025/06/inspiring-creativity-that-brings-people-together/), publicado 2025-06-12.

### Chile y LATAM

- [Mauka Estudio](https://www.agenciamauka.cl/), revisado 2026-07-29.
- [MILA Social](https://www.agenciaredessociales.cl/), revisado 2026-07-29.
- [Big Media Partners](https://bigmediapartners.cl/tarifario-y-planes-2026/), revisado 2026-07-29.
- [Mazmedia](https://mazmedia.cl/precios-y-planes/), revisado 2026-07-29.
- [Mercaboom](https://mercaboom.mx/servicios/redes-sociales), revisado 2026-07-29.
- [Orbis](https://orbis.agency/servicios/redes-sociales/), revisado 2026-07-29.
- [Sweetspot](https://www.sweetspot.com.ar/servicios/social-media/), revisado 2026-07-29.

## 11. Confidence y limitaciones

- **Alta:** arquitectura de capacidades declarada por las agencias y separación entre estrategia, contenido, community, paid, creators y measurement.
- **Media-alta:** dirección de tendencias de social search, community engagement, creator-led distribution y medición conectada.
- **Media:** rangos de pricing, porque las ofertas públicas mezclan alcance y no exponen cost-to-serve ni condiciones contractuales.
- **Limitación:** no se realizaron entrevistas con compradores ni análisis de propuestas privadas; la willingness-to-pay de Efeonce sigue siendo una hipótesis.
