# Pibank Perú · Anexo técnico del programa SEO/AEO 2027

**Corte:** 06-10-2026. **Estado:** propuesta candidata basada en lectura pública; sin accesos de cliente ni aprobación de implementación. **Entidad:** Banco Pichincha Perú; **marca/superficie:** Pibank / `pibank.pe`. Esta observación no reutiliza como baseline los resultados de `pichincha.pe`.

La ejecución propuesta conecta descubrimiento y confianza con apertura, primer fondeo y saldo mantenido. La capacidad técnica es verificable por entregables; su contribución comercial se estima en el [caso de negocio](../BUSINESS-CASE-2027.md) y se valida con datos del banco. El [costeo interno](ALCANCE-Y-COSTEO-INTERNO.md) no constituye cotización.

## 1. Alcance y método de la observación pública

GET de URLs públicas, extracción del HTML inicial, metadatos, enlaces, JSON-LD y sitemaps. Sin autenticación, formularios, transacciones, pruebas de seguridad, API privada ni evasión de controles. La muestra incluye home, producto, identidad, ayuda, documentos y tres FAQ; es una revisión selectiva, no censo del sitio ni auditoría del onboarding.

| Superficie | Respuesta observada | Lectura verificable |
|---|---|---|
| [Home](https://pibank.pe/) | 200; HTML | Contenido comercial entregado sin JS; dos canonical iguales; JSON-LD custom y Yoast |
| [Cuenta Soles](https://pibank.pe/cuenta-soles-pibank/) | 200; HTML | H1 de producto, calculadora, documentos y FAQ en HTML; dos canonical iguales |
| [Quiénes somos](https://pibank.pe/quienes-somos/) | 200; HTML | Identidad y relación con Banco Pichincha; dos canonical iguales |
| [Centro de ayuda](https://pibank.pe/centro-de-ayuda/) | 200; HTML | Canales y preguntas; dos canonical iguales; grafos ContactPage y WebPage |
| [Documentos](https://pibank.pe/documentos/) | 200; `noindex, follow` | Índice de documentos contractuales públicos; decisión de indexación por revisar, no error asumido |
| [Qué es la cuenta](https://pibank.pe/faq/what-is-the-pibank-savings-account/) | 200; `index, follow` | Texto en español pese al slug inglés; grafo WebPage/BreadcrumbList/WebSite/Organization |
| [Cómo abrir](https://pibank.pe/faq/como-abrir-una-cuenta-en-pibank/) | 200; `index, follow` | Explica el inicio del registro y validación de identidad |
| [Requisitos y apertura](https://pibank.pe/faq/que-necesito-y-como-puedo-abrir-una-cuenta-en-pibank/) | 200; `index, follow` | Complementa la anterior; coexistencia no demuestra canibalización |
| [Registro](https://registro.pibank.pe/) | 403 al cliente HTTP utilizado | No se evaluó el recorrido. El 403 no demuestra indisponibilidad para personas ni para buscadores |

[Robots](https://pibank.pe/robots.txt) permite el sitio comercial y bloquea zonas técnicas; declara `sitemap.xml` y `Crawl-delay: 10`. [Sitemap declarado](https://pibank.pe/sitemap.xml) redirige al [índice](https://pibank.pe/sitemap_index.xml), que entrega 200. Sus hijos [page](https://pibank.pe/page-sitemap.xml) y [faq](https://pibank.pe/faq-sitemap.xml) enumeraron **8 URLs de páginas y 51 FAQ**, respectivamente. Es inventario declarado, no URLs indexadas ni cobertura de demanda. El header `X-Robots-Tag: noindex, follow` del XML no implica que las páginas listadas tengan noindex.

**No medido mediante este diagnóstico HTML:** GSC, rankings de Pibank, impresiones/clics, GA4, conversiones, sesiones, CWV de campo, velocidad de app, exactitud de consentimiento en ejecución, tasa de fondeo y saldos. SERP/demanda se investigan en un carril separado del expediente; no se deducen del HTML ni se usan observaciones del banco anterior. Tampoco se atribuyen penalizaciones, impacto de ranking ni pérdidas históricas a los hallazgos siguientes.

## 2. Diagnóstico específico y efecto esperado

| ID | Observación pública | Recomendación candidata | Qué podría mejorar; qué falta demostrar |
|---|---|---|---|
| PT-01 | Home custom usa `https://www.pibank.pe/#organization`; Yoast usa `https://pibank.pe/#organization`. El custom declara parentOrganization «Pibank Perú» | Unificar IDs según host canónico, marca y entidad legal; acordar owner del grafo custom/Yoast | Coherencia de identidad y mantenimiento. No demuestra por sí solo pérdida de citas |
| PT-02 | FinancialProduct de producto usa `www` y `//#financialproduct`; provider dice «Pibank Perú» | Corregir ID estable y representar al proveedor legal con contenido visible y aprobación de producto | Representación semántica verificable; no prometer rich result bancario ni ranking |
| PT-03 | Cuatro páginas examinadas emiten dos canonical idénticos | Eliminar emisión duplicada en plantilla/plugin preservando URL actual | Reduce fuentes de drift; hoy los valores coinciden, no hay conflicto canónico probado |
| PT-04 | Producto ofrece «sin comisiones»; tarifario distingue servicios adicionales con cargos | Explicar la condición junto a beneficios y mantener una única versión de datos financieros | Claridad para la decisión; exactitud necesita revisión bancaria, no dictamen legal del agente |
| PT-05 | FAQ de apertura distribuida en varias URLs y producto; existe respuesta en el sitio | Inventariar cuerpos, agrupar intenciones y decidir ampliar/consolidar/enlazar tras GSC/SERP | Cobertura y recorrido; no crear veinte nuevas páginas ni redirigir a ciegas |
| PT-06 | Homepage contiene destinos de registro HTTP y HTTPS | Homogeneizar enlaces a HTTPS tras validar destino aprobado | Higiene del handoff; no inferir que HTTP actual expone una sesión o falla al usuario |
| PT-07 | Documentos está noindex por configuración pública | Revisar por intención: índice contractual, PDFs y fuentes que respaldan la decisión | Descubrimiento de información útil; conservar noindex si esa es la política acordada |
| PT-08 | Ayuda y producto enlazan apertura/app; fondeo no puede reconciliarse públicamente | Instrumentar handoff y recibir resultados agregados del banco | Medición de activación. Depende de permisos y equipo onboarding/core |
| PT-09 | Copy del modal de cookies observado incluye «Pibank US» y descripciones en inglés | Revisar localización y fuente de ese texto con responsables de privacidad/tecnología | Consistencia editorial. No acredita incumplimiento legal ni comportamiento real de consentimiento |

La base comercial ya existe: página de producto, FAQ, calculadora y documentación. El primer trabajo es mejorar coherencia y evaluar el recorrido, aprovechando lo existente. La [muestra editorial Pibank](../demo/PIBANK-XRAY-CONTENT.md) propone resolver «¿Cómo ahorro y uso mi dinero si mi cuenta no tiene tarjeta?», como hipótesis de decisión; no se presenta como consulta con volumen o cita IA medidos.

## 3. Backlog y RICE provisional

RICE se completa con Reach (usuarios/visitas del periodo), Impact (efecto plausible en el resultado), Confidence (fuente y confianza) y Effort (horas de trabajo). **Reach está pendiente y no se calcula score numérico**: contar URLs como si fueran usuarios daría precisión falsa. El esfuerzo es estimación de planificación, revisable tras accesos; la confianza del impacto comercial sigue pendiente aunque el hallazgo técnico esté verificado.

| Prioridad / ID | Trabajo | R | I: hipótesis | C | E inicial | Dependencia |
|---|---|---|---|---|---:|---|
| Precondición / B-01 | Definir eventos y conciliación apertura/fondeo/saldo | Pendiente | Alto para evaluar inversión | Sin baseline privada | 32 h | Analítica + onboarding + datos banco |
| P1 / B-02 | Inventario de fuentes, condiciones y owner de revisión | Pendiente | Alto para exactitud y confianza | Hallazgo público; impacto sin medir | 16 h | Producto + revisión bancaria |
| P1 / B-03 | Grafo de identidad/producto e higiene canonical/HTTPS | Pendiente | Medio para coherencia técnica | HTML observado; resultado sin medir | 24 h | CMS/plantillas y staging |
| P1 / B-04 | Producto + guía para uso/fondeo, aprovechando FAQ | Pendiente | Alto para decisión y activación | Ángulo candidato | 36 h | Corpus + demanda + aprobación editorial |
| P2 / B-05 | Cluster FAQ, arquitectura interna y duplicaciones | Pendiente | Medio | Inventario parcial | 24 h | Corpus completo, GSC y SERP |
| P2 / B-06 | CWV/accesibilidad y fricciones observadas en móvil | Pendiente | Por determinar | Aún no medido | 24 h diagnóstico | CrUX/GSC, lab, dispositivos y staging |
| P2 / B-07 | Panel fijo de preguntas SEO/AEO y exactitud | Pendiente | Medio para aprendizaje | Metodología, sin baseline Pibank | 20 h | Mercado, motores, presupuesto tools |
| P2 / B-08 | Fuentes de confianza/off-page y oportunidades de distribución | Pendiente | Por determinar | Sin auditoría de enlaces | 20 h diagnóstico | Fuentes y permisos de contacto |

El backlog suma estimaciones por actividad, no un compromiso de ejecutar todo en el mes 1. Producto/Finance valida la relevancia; el equipo prioriza dependencias antes de ordenar por score. Recalcular RICE tras baseline, sin convertir las estimaciones en promesas de visitas.

## 4. Plan de seis meses y aceptación

| Ventana | Entregables candidatos | Aceptación verificable |
|---|---|---|
| M1 · diagnóstico y primera intervención | Corpus e inventario, mapa del embudo, estado de accesos, versión del modelo, backlog y primer paquete de cambios | Cada hallazgo tiene URL/fecha/evidencia/owner; eventos definidos o brecha documentada; modelo separa observados/supuestos; primer cambio se acepta en staging si hay acceso |
| M2 · fundamento | Fuente única de condiciones, grafo alineado, cambios de plantilla prioritarios y primer lote editorial | HTML y schema congruentes, sin canonical/links conflictivos; revisión bancaria; lectura live de URLs implementadas |
| M3 · cobertura priorizada | Producto y contenido complementario, enlaces internos, pruebas del handoff y primera conciliación de datos | Registro oficial y datos agregados coherentes; contenido exacto; pipeline no cuenta clic como apertura |
| M4 · expansión y optimización | Segundo cluster basado en evidencia, rendimiento/accesibilidad priorizados y panel SEO/AEO repetible | Mejoras implementadas y verificadas; lectura por superficie; no agregación falsa de motores |
| M5 · cohortes y experimentos | Lectura de fondeo/saldos por cohortes disponibles; experimentos sujetos a muestra y plataforma | Denominador, ventana y metodología visibles; resultados inconclusos conservan ese estado |
| M6 · evaluación y continuidad | Evaluación del programa, economía actualizada, documentación transferible y recomendación siguiente ciclo | Resultados conciliados o límites explícitos; capacidad y backlog remanente; decisión de continuidad humana |

**Hito al cierre de M1:** decidir continuar, recalibrar alcance/objetivos o detener la expansión según demanda real, embudo, acceso, velocidad de implementación y economía. Acordar criterios con el banco antes de evaluar. La investigación pública inicial y la duración candidata no prueban que exista demanda suficiente para una contribución determinada; seis meses es la base provisional de diseño, no compromiso de persistir sin viabilidad.

Los meses se cuentan desde el inicio contractual y la disponibilidad de condiciones de ejecución, no desde una fecha inferida. La meta anual 2027 y el horizonte de seis meses mantienen denominadores distintos. Un mes 1 de consultoría no consume automáticamente una séptima mensualidad: estructura contractual por acordar.

## 5. RACI y accesos mínimos

R = ejecuta; A = acepta/decide; C = consulta; I = informado. Los roles bancarios son propuestos, sin personas ni autoridad inventadas.

| Actividad | R | A | C | I |
|---|---|---|---|---|
| Diagnóstico, briefs y backlog | Efeonce SEO/AEO | Dueño digital Pibank | Tecnología, producto, analítica | Sponsor |
| Condiciones financieras y lenguaje | Efeonce redacta; banco valida | Dueño producto/cumplimiento banco | Legal/atención | Digital |
| Plantillas y publicación CMS | Efeonce o proveedor web, según acceso | Owner tecnología/CMS banco | SEO/AEO y producto | Digital |
| Eventos web | Analítica Efeonce + equipo banco | Owner analítica banco | Privacidad, tecnología | Sponsor |
| Onboarding y app | Equipo banco/proveedor autorizado | Owner onboarding banco | Efeonce analítica, seguridad | Digital |
| Fondeo/saldos agregados | Datos/Finanzas banco | Dueño de dato banco | Analítica, Efeonce | Sponsor |
| Valor económico y ROI | Finanzas banco | Owner económico banco | Efeonce pricing/analítica | Digital |
| Aceptación y cambios de alcance | Efeonce prepara; banco revisa | Responsable contrato | Tecnología/producto/compras | Equipos de trabajo |

- GSC de `pibank.pe` con permisos adecuados; leer estado real y antigüedad de la serie.
- Analítica web/GTM con permisos mínimos; first-party IDs y consentimiento bajo política del banco.
- CMS, plantilla y staging del proveedor real; backups, revisión y rollback antes de publicación.
- Acceso de test autorizado a onboarding/app, sin usar datos o dinero reales para demostrar una conversión.
- Export agregado/pseudonimizado aprobado de aperturas, fondeo y saldos por cohorte; Efeonce no necesita credenciales de core bancario ni DNI en reportería.
- Responsable y ventana de revisión de producto/seguridad/privacidad; aprobación de servicios terceros y presupuesto de herramientas.

## 6. Medición y operación

Definir `visit → apertura_click → solicitud_inicio → apertura_completada → primer_fondeo → saldo_cohorte`. Los nombres se adaptan al stack real. Apertura completada, fondeo y saldo requieren fuente bancaria; el browser no los certifica. Acordar conciliación mensual, deduplicación, ventana de atribución, exclusión de pruebas y corte temporal.

Separar brand/non-brand, SEO/paid/direct/referral y campañas; la serie anterior al programa no elimina efectos de lanzamiento/tasa. La presencia de IA se observa con preguntas fijas, motor/modo, mercado/idioma, fecha, fuente y exactitud; no se suma a aperturas. Un resultado causal requiere diseño y muestra suficientes.

Ritual candidato: coordinación semanal de backlog/bloqueos, revisión editorial por lote y lectura mensual de embudo/cohortes/modelo. En información cambiante, producto mantiene fecha efectiva y fuente única; reverificar tasa/documentos antes de publicar o distribuir cualquier demo.

## 7. Evidencia reproducible y límites de entrega

Lecturas del 06-10-2026, cliente HTTP `Efeonce-public-proposal-review/1.0`, sin cookies autenticadas. Hashes SHA-256 de bytes recibidos de la muestra:

| URL abreviada | SHA-256 |
|---|---|
| `/robots.txt` | `8c01e1a752f7983420d225aac83f38e80445ec9a9e56028e3dd62cf954bb6b04` |
| `/sitemap_index.xml` | `d6d7441ae48f8c9a0fdfb939bb012dcdef3904e52eaad8a815d90a37fb264a96` |
| `/` | `7789c5bb23d9a77811fc7e0caa40f9198534bf4f58f3f0da43884a797e090041` |
| `/cuenta-soles-pibank/` | `b0e34143dd991239961ed5f10df15f37a1d819d4d8e9ff7f6be11a926795dc39` |
| `/centro-de-ayuda/` | `f89d96387aa9b26212f967e953f812b0c862426c3bac40c7b22b9ca588024285` |
| `/documentos/` | `d597497246548e31c87cbe7d356a1acfb1d8f37fa25d21a2062c954d2dad0e62` |

WordPress/Yoast se observan en recursos y salida pública; no se conocen contratos, versiones internas, arquitectura completa ni permisos. No se requieren migración de CMS, implementación custom de onboarding, redesign completo, compra de backlinks ni nueva app como condición de este programa. Sus necesidades eventuales se evalúan con alcance propio.

Fuentes financieras consultadas: [tarifario](https://prdpistdoceastus2.blob.core.windows.net/documentos1/Web/Tarifario_CuentaSolesPibank.pdf) y [cartilla](https://prdpistdoceastus2.blob.core.windows.net/documentos1/ONBOARDING/CartillaInformacion_CuentaSolesPibank.pdf), ambos actualizados 28-09-2026, leídos 06-10-2026. SHA-256: tarifario `a8f73fb22dcbc195716e0be109075ee5b14ced5bdf337443668c0ae7cd63fa78`; cartilla `2453acd97a429c5a3cf258160dbf23a51e1756101673d229c3dbd2fccde191d8`. [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features) documenta que AI Overviews/AI Mode comparten fundamentos SEO y no requieren un schema especial; esto no garantiza indexación ni aparición.

**Estado:** investigación pública y diseño técnico preparados; aceptación bancaria, accesos, estimaciones definitivas, implementación y resultados pendientes. Este documento no autoriza publicación, contactos, gasto, contratación ni cambios de producción.
