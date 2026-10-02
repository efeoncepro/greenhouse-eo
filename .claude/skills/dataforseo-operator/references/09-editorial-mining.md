# Minería editorial orientada al negocio

> Procedimiento de operador, 2026-09-02. No amplía familias, permisos ni capacidades runtime.
> Contrato: 07-contrato-greenhouse.md. Estrategia de contenido: skill seo-aeo.

## Antes de comprar

- Resolver cliente/mercado/idioma y matriz categoría → subproblema → superficie/exposición → decisión.
- Identificar categorías por contribución al negocio, no por el menor número de artículos.
- Leer inventario completo y gap competitivo existente. Semilla manual es hipótesis; keyword devuelta
  es evidencia del proveedor; una idea del agente nunca recibe volumen inventado.
- Usar previewKeywordDiscovery y queueKeywordDiscovery, con runner canónico. Para una exploración
  amplia, dividir en lotes homogéneos dentro de límites sin usarlos para eludir presupuesto agregado.
- Registrar previsión del conjunto y costo real por run. Mantener intactos entitlements y flags; no
  habilitar runtime compartido ni tracking como efecto de minar.

## Enriquecer una URL propia antes de expandir

Para preparar o revisar un brief desde el contenido de una URL, la CLI local ofrece
`quick keywords-for-site` y `site-keywords` (paginación/checkpoint). Procedimiento canónico:
[Keywords for Site por URL](02-labs.md#21a-keywords-for-site-por-url--contrato-verificado-2026-09-30).
Verificar mercado/idioma/propiedad, seleccionar ruido y distinguir intención local de comparativas antes
de ampliar el gasto. Conservar JSON/CSV y cruzar con corpus/GSC; este carril no persiste automáticamente
una cola editorial ni sustituye su runner. La relevancia por categoría no demuestra posiciones o demanda
propia, y un total grande del proveedor no exige adquirir todo el universo.

## Expansión y control

1. Suggestions para variantes léxicas; related para relaciones semánticas; ideas sólo por familia
   homogénea sin marcas que arrastren otra categoría. Nunca llamar overview a esto: overview enriquece,
   no descubre.
2. Respetar límites de contracts.ts y el orden presupuestado. Candidatos persistidos y métricas vigentes
   se leen antes de recomprar. Persistir procedencia de cada seed/método.
3. Inspeccionar calidad por lote y parar deriva de categoría. NULL/cero/ausente son distintos;
   competition es paid; barrera de enlaces no equivale a dificultad general.
4. Declarar límites por llamada, truncamiento y paginación. Alcanzar un límite no demuestra exhaustividad.
   Dedupe por normalización e intención, sin sumar variantes como demanda adicional. core_keyword
   es una sugerencia revisable: un agrupamiento erróneo del proveedor no debe fusionar temas.
5. Bajar a SERP orgánica las intenciones finalistas, no todo el universo. Mantener task ID, fecha,
   posiciones, páginas competidoras, PAA y referencias AIO con procedencia independiente.
6. Las PAA observadas no prueban frecuencia de prompts en LLMs. Una grounded query propuesta para research
   se etiqueta propuesta; observar LLMs requiere un carril permitido y evidencia propia.
7. El mapa editorial decide cubierto/parcial/nuevo candidato/fuera de foco/bloqueado técnico por lectura
   de cuerpo, no por slug ni ausencia en GSC. La ausencia de ranking no prueba ausencia de contenido.
   Contrastar el inventario editorial con URLs propias fuera de él; Notion no necesariamente agota el sitio.
8. No registrar ni retirar competidores, promover tracking, crear grounded-query drafts, ejecutar
   research LLM ni modificar calendarios salvo pedido explícito adicional.

## Salida

CSV de keywords con mercado, volumen/fecha, fuente/run/seed, categoría y cluster editorial; matriz de
intenciones con contenido propio, destino recomendado, gate técnico, preguntas observadas vs propuestas,
prioridad/razón, esfuerzos estimados y huecos de evidencia. No prometer cubrir todo el mercado.

Caso cliente: docs/operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md.
