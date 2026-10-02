# Efeonce AEO — señal de búsqueda para naming (2026-09-29)

## Alcance

Consulta exploratoria, no estimación de demanda total. Se ejecutó con la CLI gobernada de DataForSEO (`consumer=seo`, organización Efeonce), cuatro solicitudes de Google Keyword Overview en español para Chile y México y una expansión `research` de tres seeds en México. El costo reportado por el proveedor fue US$0,14964. La expansión llegó a `awaiting_finalist_approval` después de descubrir y enriquecer 60 candidatos; no se ejecutó la fase SERP. Fuente metodológica: [DataForSEO Keyword Overview](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/).

| Consulta | Chile (búsquedas/mes estimadas) | México (búsquedas/mes estimadas) | Interpretación |
| --- | ---: | ---: | --- |
| `aeo` | 320 | 1.600 | La sigla tiene demanda observable, pero no toda pertenece a la categoría: la expansión mexicana quedó dominada por American Eagle. |
| `ai search` | 70 | 260 | Término explicativo de categoría; no equivale a intención comercial. |
| `generative engine optimization` | sin fila | 140 | Vocabulario técnico; la ausencia de fila no es volumen cero. |
| `posicionamiento en ia` | 10 | 10 | Expresa el problema en lenguaje natural, con volumen estimado bajo. |
| `visibilidad de marca en ia` | sin fila | `null` | DataForSEO detectó intención comercial en MX, pero no entregó un volumen numérico. `null` no es cero. |
| `aeo grader` | no consultado en expansión | 40 | Variante encontrada en la expansión MX; no representa demanda exclusiva de un producto Efeonce. |

`geo` devolvió 4.400 en Chile y 8.100 en México, pero la sigla también designa otros conceptos; no se atribuye ese volumen a Generative Engine Optimization. Variantes largas sobre ChatGPT y visibilidad en IA a menudo no devolvieron fila: no se infiere ausencia de interés. Estos números provienen de búsquedas en **Google** y no miden preguntas formuladas dentro de asistentes de IA. No se suman términos como si fueran audiencias únicas.

## Implicación para la decisión

Mantener **Efeonce** al frente del nombre acumula la exposición de la marca madre. Usar **AEO**, **AI visibility**, **GEO** y preguntas sobre ChatGPT en el contenido de descubrimiento comunica la categoría sin confiar en que una sigla ambigua identifique por sí sola la capacidad. La decisión de nombre se registra en [EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md](../architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md).
