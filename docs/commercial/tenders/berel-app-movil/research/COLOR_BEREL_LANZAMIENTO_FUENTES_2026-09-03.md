# Color Berel · Evidencia para el lanzamiento

> **Consulta:** 2026-09-03 · **Audiencia:** interna · **Método:** fuentes públicas primarias + contexto del operador.

## Conclusión de investigación

Julio confirma un próximo lanzamiento de una nueva Color Berel. Existe una app pública previa en ambas tiendas
y una página oficial que ya emplea el término «nueva». Esa página no permite fechar el próximo lanzamiento ni
identificar sus novedades. El plan debe separar **antecedente público**, **nueva versión anunciada por el
operador** y **funciones del próximo release aún sin validar**. No se instaló ni se probó la nueva app.

## Fuentes y límites

| ID | Fuente primaria | Observación al corte | Uso y límite |
| --- | --- | --- | --- |
| P1 | [Berel: página de la app](https://berel.com/articulos/app-color-berel) | Describe visualización con IA, perfil con favoritos/proyectos, inspiración, recomendador y calculadora | Sustenta hipótesis de valor. No prueba que estas funciones sean nuevas en el próximo release, ni su calidad real |
| P2 | [Color Berel en Google Play](https://play.google.com/store/apps/details?id=com.berel.color&hl=es_MX) | Package `com.berel.color`; editor Pinturas Berel; indicador público `100 k+` descargas; descripción centrada en producto y tienda. La ficha mostrada indica actualización 8 jun 2026 | Señal de historia de distribución, no de MAU ni audiencia contactable. La consulta termina con pie de región Estados Unidos y lenguaje es-MX: confirmar ficha México en consola antes de diagnosticar diferencias regionales |
| P3 | [Color Berel en App Store México](https://apps.apple.com/mx/app/app-color-berel/id1666427473) | ID `1666427473`; editor Pinturas Berel SA de CV. Presenta funciones de color, producto, inspiración y visualización | Antecedente iOS. Reseñas visibles sugieren utilidad para elegir, pero son una muestra no representativa; no se calculó satisfacción |
| P4 | [Berel: privacidad de la app](https://berel.com/avisos/app-color-berel) | Existe solicitud de eliminación para cuenta y contenido del usuario | Insumo para acordar límites de datos y uso de material. No es una auditoría legal ni prueba de configuración de SDKs |
| P5 | [Berel: colores de temporada](https://berel.com/articulos/colores-de-temporada) | Contenido editorial existente ya conecta inspiración con el uso de la app | Reutilizar el puente editorial como hipótesis; no afirmar tráfico o conversiones sin GA4/GSC |
| P6 | [BEHR México: herramientas de color](https://www.behrpaint.com.mx/pro/colors/color-tools/) | Presenta ColorSmart como herramienta para visualizar, combinar y coordinar | Benchmark limitado de promesa. Visualizar color no es por sí solo una propuesta exclusiva de Berel; no se comparó UX ni rendimiento |
| P7 | [ColorSmart México en Google Play](https://play.google.com/store/apps/details?id=com.behr.colorsmartmexico&hl=es_MX) | La ficha describe funciones para proyectos y advierte diferencias entre color de pantalla y muestra física | Referencia de categoría; no copiar claims ni convertir reseñas de terceros en prueba de superioridad |

Las descripciones de tienda y web son afirmaciones de sus editores, no verificación funcional de la app.
No se usaron agregadores de descargas para inferir usuarios, ingresos o cuotas de mercado.

## Contratos de plataforma que informan el plan

| ID | Fuente | Aplicación concreta |
| --- | --- | --- |
| T1 | [Apple: App Store search](https://developer.apple.com/app-store/search/) | Separar relevancia de metadatos de persuasión de ficha; no tratar el texto promocional como campo de ranking. Investigar términos específicos sin usar nombres de competidores en keywords |
| T2 | [Apple: Product Page Optimization](https://developer.apple.com/app-store/product-page-optimization/) | Evaluar variantes de assets elegibles de la ficha; no presentarlo como una prueba de todos los campos textuales |
| T3 | [Google Play: Store Listing Experiments](https://play.google.com/console/about/store-listing-experiments/) | Probar assets/texto admitido por la consola; definir hipótesis, volumen y métrica antes de interpretar ganadores |
| T4 | [Google Ads: campañas de apps por objetivo](https://support.google.com/google-ads/answer/6167156?hl=en) | Elegir instalación o acción interna según señal disponible. La guía recomienda presupuesto diario de al menos 50× tCPI para volumen de instalaciones y 10–15× tCPA para acciones internas; son recomendaciones de planificación del proveedor, no precios ni garantía de resultados |
| T5 | [Apple Ads: búsqueda](https://ads.apple.com/es/app-store/help/ad-placements/0082-search-results) | Canal posible para demanda en App Store; su asignación depende de elegibilidad, demanda y economía observadas |
| T6 | [Firebase: eventos](https://firebase.google.com/docs/analytics/ios/events) y [eventos automáticos GA4](https://support.google.com/analytics/answer/9234069) | El marcaje de una app requiere eventos de producto. `first_open` y `app_update` tienen semánticas distintas; una primera apertura no equivale a una persona nueva verificada |
| T7 | [Apple: privacidad y uso de datos](https://developer.apple.com/app-store/user-privacy-and-data-use/) | Evaluar ATT cuando exista tracking sujeto a ese permiso; no reconstruir identidad mediante fingerprinting |
| T8 | [Apple: AdAttributionKit](https://developer.apple.com/documentation/AdAttributionKit) | Atribución mediante postbacks con límites de privacidad y sin IDs individuales. No exigir ATT como condición universal para esta atribución agregada |
| T9 | [Firebase: fin de Dynamic Links](https://firebase.google.com/support/dynamic-links-faq) | No diseñar enlaces nuevos sobre Firebase Dynamic Links; la fecha de retirada publicada es 25 agosto 2025 |
| T10 | [Android: deep links/App Links](https://developer.android.com/training/app-links) | Diseñar enlaces verificados y probar destinos; conservar contexto después de instalar es un problema adicional que debe validarse por plataforma |

## Información privada necesaria para cerrar la estrategia

1. Demo/build y matriz de diferencias frente a la app pública; continuidad o cambio de IDs, cuentas y proyectos.
2. Fecha de lanzamiento por OS, disponibilidad en México, fases de rollout y responsable de aprobación de tienda.
3. Objetivo comercial prioritario: uso, registros, demanda a tiendas, ventas u otro; geografía de atención.
4. Embudo y cohortes por versión/OS; usuarios existentes con canales consentidos; no estimarlos desde descargas públicas.
5. Stack real de analítica, atribución, campañas, CRM y notificaciones, y equipo desarrollador responsable.
6. Presupuesto de medios separado de honorarios, producción, creators, tecnología y cambios de producto.
7. Brief de Fernanda, criterios de evaluación y convivencia con otros equipos/agencias.

## Skills aplicadas

- `digital-marketing`: campaña integrada, mensaje, medios y creatividad.
- `growth-marketing-cro`: activación, retención por proyecto, modelo de costos, CRO y experimentación.
- `seo-aeo`: puente editorial y disciplina de búsqueda; ASO contrastado directamente con Apple/Google.
- `social-media-studio`: demostración social, creators, comunidad y handoff.
- `copywriting` + `berel-content-production`: conceptos exploratorios, voz es-MX, claims y contexto del cliente.
- `greenhouse-ai-creative-rights-governance`: propuestas de uso de fotos, talentos y demos fieles a la app.
- `efeonce-agency`: continuidad con el enfoque comercial acordado; `greenhouse-documentation-governor`: cierre del workspace.

Las reglas de artículos mensuales no se extrapolan automáticamente a anuncios de una nueva campaña. Formatos,
derechos y aprobadores específicos deben quedar en su brief. No se requirió producción visual, implementación,
publicación ni una tool pagada de keywords para este análisis.
