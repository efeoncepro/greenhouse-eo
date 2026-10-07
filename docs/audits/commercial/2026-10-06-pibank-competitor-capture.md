# Pibank · Exploración de demanda competitiva

06-10-2026. Preparación local parcial de mercado; sin compra adicional, publicación o envío.

## Evidencia y resultado

- [Análisis y calendario anual](../../commercial/prospects/banco-pichincha-peru-seo-2026/research/pibank-competitor-capture-2026-10-06/ANALISIS-Y-PLAN.md).
- [Script reproducible](../../commercial/prospects/banco-pichincha-peru-seo-2026/research/pibank-competitor-capture-2026-10-06/analizar.py) procesa ocho respuestas reales existentes de ranked_keywords. Todas sus tasks tienen status 20000; los SHA-256 y task ID quedan en [resultados.json](../../commercial/prospects/banco-pichincha-peru-seo-2026/research/pibank-competitor-capture-2026-10-06/resultados.json).
- 1.476 observaciones: BCP 918 (917 dominio filtrado + una URL), BBVA 509 (500 dominio filtrado + nueve de producto), Interbank 24 (una URL), Scotiabank 25 (dos URLs). 1.286 consultas normalizadas distintas. Rankings de la base con actualizaciones entre 01-07 y 03-10; consulta de archivos 06-10, no todas las posiciones verificadas en vivo hoy.
- 68 consultas rankeadas seleccionadas en 19 familias; dos representantes adicionales de investigación temática sin ranking capturado. Selección/variantes y fuente por fila; no regla automática MAX ni suma como TAM.
- Proxies por familia: directo 3.740/mes, condicional 3.330, consideración de rival 18.300, asistencia 5.680. Canastas parciales con posible solapamiento residual, sin forecast. 83.400 es suma bruta diagnóstica de consultas seleccionadas, descartada como denominador de mercado.
- Reunión completa releída por MCP: BCP/Interbank literales; Scotiabank según resumen y normalización ASR. BBVA seleccionado para investigación. No atribuimos al banco objetivo de cuota 70%.
- Producto Pibank y páginas oficiales Interbank/Scotiabank verificados por web. Tasas no trasladadas a 2027. Recorrido de captación propone colocar parte del ahorro de otro banco en Pibank, conservando banco habitual para pagos.

## Límites y ejecución pendiente

No nueva llamada pagada. El ledger anterior conserva costo NULL de ranked-09-page2; no se reemplaza por cero ni por su estimación. Portal DataForSEO sin sesión autenticada; conciliación pendiente. Requests Interbank/Scotiabank de dominio pasaron dry-run, USD 0,072 estimados por primera página cada uno; no ejecutados. La muestra no acredita demanda completa ni suficiente para prometer 5% de la meta. No se modificaron PDFs/XLSX para convertirla en forecast.

## Validación proporcional

Script ejecutado y sus assertions de conteos, tasks, fuentes, asignaciones y volúmenes PASS. CSV/JSON y requerimientos aritméticos comprobados; enlaces locales PASS. Cierre documental estricto con pathspec de este análisis, expediente y continuidad PASS (cero warnings); `git diff --check` PASS. Se corrigió el recuento de familias a 19 antes del cierre. El gate estricto de contexto corre después de esta última edición. No se corrió suite de producto: no hay cambios de runtime.

Expediente/caso activo, Handoff y changelog enlazan el resultado. No nuevas escrituras CRM/Notion, correo, commits, pushes o despliegues.
