# Brand Visibility Grader · ejecución

Run EO-GRUN-00056 (`grun-9c7f0041-26fe-4ef3-8d9c-e5c0990481ac`), aceptado HTTP 202 el 28-09-2026 08:16:54 UTC.
Ruta: `pnpm staging:request POST /api/admin/growth/ai-visibility/runs`, endpoint → command → worker async → score → publicación gobernada.

Modo full / internal_audit; Perú, es-PE; categoría canónica banca de personas; pichincha.pe. Proveedores solicitados: OpenAI, Anthropic, Perplexity, Gemini y Google AI Mode (id técnico google_ai_overview). Su presencia solicitada no acredita ejecución exitosa.

Pack estándar archetype-generic.v1: siete preguntas; descubrimiento de banca, alternativas a BCP, reseñas, quejas, identidad de Banco Pichincha Perú y líderes de categoría. No se alteró el prompt pack, flags, scoring ni publicación. La muestra no es una auditoría exhaustiva ni un panel específico de captación de ahorro.

## Resultado verificado

El worker terminó la recolección el 28-09-2026 y publicó automáticamente el snapshot. Estado público `ready`, gate del reporte `partial`. 35 observaciones: 28 succeeded (7 de cada proveedor OpenAI, Anthropic, Perplexity y Gemini) y 7 failed de Google AI Mode. Score global 46,2/100; dimensión AI Visibility 12,5/100. Son métricas diferentes: no presentar 46,2 como score específico de AI Visibility.

Web y JSON: HTTP 200; título identifica Banco Pichincha Perú. PDF canónico: HTTP 200 application/pdf, cinco páginas A4, texto seleccionable. El enlace tokenizado y el PDF están en la carpeta local de Documentos. No se forzó score, publicación, flags ni revisión.

## QA de entrega: NO APROBADO PARA ENVÍO

1. Portada del PDF afirma “5 de 5 motores respondieron”, pero sólo cuatro tuvieron respuestas exitosas. El quinto está en el reporte como 0 de 0. El conteo de proveedores intentados no equivale a cobertura efectiva.
2. La página 3 corta la sección inferior de sentimiento; no se ve su pie completo. La página 5 contiene sólo el cierre, con gran espacio vacío.
3. La frase “los líderes de tu categoría superan 85” de la portada no está sustentada por un panel de runs de estos competidores en este caso. No usarla como conclusión medida.
4. Las respuestas de reputación incluyen fuentes de otras geografías; por ejemplo HelpMyCash en OpenAI. No convertir esas opiniones generadas en hechos peruanos. Las recomendaciones de precios/implementación del pack genérico necesitan traducción al negocio bancario.

Se inspeccionaron visualmente las cinco páginas. Se preserva el PDF original bajo `04-Grader-pendiente-de-correccion`, no bajo la carpeta de envío. El informe existe y es accesible, pero no está aprobado como adjunto comercial. No se cambió el snapshot ni se editó el PDF para ocultar el defecto.

## Google AI Mode: causa reproducida

El adapter transforma un mercado ISO PE en location_code 2604, pero deja un nombre completo como location_name sin normalizar. La entrada canónica de esta corrida fue “Perú” siguiendo el manual de mercado como nombre. DataForSEO no acepta esa cadena acentuada.

Prueba aislada con el cliente canónico postDataForSeoTask, mismo keyword, idioma en y desktop, 28-09-2026 08:27 UTC:

| Localización | HTTP | Task | Resultado | Costo USD |
|---|---|---|---|---|
| location_name: Perú | 200 | 40501 | Invalid Field: location_name | 0 |
| location_code: 2604 | 200 | 20000 | Ok; un resultado | 0,004 |

El error no es ausencia de la marca, falta de saldo ni fallo del parser. La prueba demuestra un defecto de normalización entre el mercado usado en prompts y la localización del proveedor. Fuente de contrato: https://docs.dataforseo.com/v3/serp-google-ai_mode-live-advanced/

Dueño de corrección: src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts, locationFromMarket. La corrección robusta debe conservar Perú en los prompts y resolver un código de ubicación validado para el proveedor; no sustituirlo por un fallback silencioso a Estados Unidos. Revisar además language_code en fijo; no es la causa del 40501 demostrado.

La prueba es independiente: no completa, reescribe ni recalcula EO-GRUN-00056. No se implementó ni desplegó un fix de producto como parte de esta operación comercial.


## Uso posterior a discovery — 06-10-2026

La [reunión](../MEETING-2026-10-06.md) precisa Pibank como necesidad real. Este Grader de **Banco Pichincha**, con alcance/QA históricos descritos arriba, conserva valor de antecedente. No es baseline Pibank ni evidencia de aperturas, saldo o retorno. Una evaluación Pibank requiere identidad, producto, consultas y cobertura propios. Esta edición no reejecutó ni corrigió/publicó el run o PDF.
