# Usar el Diagnóstico SEO de Prospecto en Venta

> **Tipo de documento:** Manual de uso (comercial)
> **Version:** 1.0
> **Creado:** 2026-08-27 por Claude (TASK-1709)
> **Ultima actualizacion:** 2026-08-27 por Claude (TASK-1709)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)
> **Documentacion funcional:** [diagnostico-seo-prospecto.md](../../documentation/growth/diagnostico-seo-prospecto.md)

## Para qué sirve

Convertir la sorpresa del Grader AEO en **tamaño de pérdida cuantificado**, con dato del
proveedor y sin pedirle nada al prospecto. Es el eslabón 2 del encadenamiento comercial:

1. **Grader AEO** mide si la IA lo menciona → produce la sorpresa que abre la conversación.
2. **Este diagnóstico** cuantifica la pérdida orgánica de ESE dominio → convierte la sorpresa
   en tamaño (superficie ranqueada, distancia a primera página, citas en AI Overviews, gap de
   enlaces contra su competencia real).
3. **Radiografía AEO** (`think.efeoncepro.com/muestras/…`) demuestra cómo se arregla → prueba
   de oficio, no promesa.
4. **La propuesta** cierra.

Cada eslabón alimenta al siguiente; ninguno se salta. Automatizar los saltos (crear lead,
adjuntar la Radiografía) es trabajo posterior — hoy los conecta el operador.

## Antes de empezar

- Necesitas rol admin o account (capability `growth.seo.prospect_diagnostic.run`).
- El flag `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` debe estar activo en el ambiente.
- Ten claro el **mercado** del prospecto (CL, MX, CO, PE, AR, ES o US): las posiciones de
  mercados distintos no son comparables.
- Cada corrida gasta ~USD 0,25 del presupuesto de adquisición. Hay tope por diagnóstico y tope
  diario por operador.

## Paso a paso

1. Dispara el diagnóstico con el dominio y el mercado (`rootDomain` + `market`). Si conoces
   competidores directos, decláralos (máximo 5) — mejoran el análisis de gap de enlaces.
2. Espera la corrida (segundos). El resultado trae los hechos con su fecha de captura.
3. Lee los hechos como **argumentos de conversación**, no como informe final: "apareces en N
   búsquedas, M están a un empujón de primera página, la IA de Google te cita en X y a tu
   competencia en Y".
4. Si repites el mismo dominio el mismo día, recibes el resultado existente sin gastar.

## Qué significan los estados

| Estado | Significado |
|---|---|
| `completed` | Corrida completa; hechos disponibles |
| `cost_blocked` | El costo previsto no cabe en el tope — cero gasto, cero consultas |
| `failed` | Las fuentes fallaron; se puede reintentar el mismo día |

## Qué NO hacer

- 🔴 **Nunca presentar una cifra del diagnóstico como dato medido del prospecto.** Todo es
  estimado por un proveedor externo y así se declara, con su fecha. Presentar un estimado sin
  marca es exactamente el defecto que este carril existe para impedir.
- 🔴 **Nunca decir que el sitio "está sano"** — ni siquiera con todas las señales en verde. El
  diagnóstico no detecta todo (por ejemplo, bloqueos a rastreadores de IA), y por eso no emite
  puntaje ni veredicto: enumera pérdida cuantificada.
- 🔴 **Nunca citar cifras de industria, estudios ni "lifts"** ("los sitios que hacen X ganan
  Y%"). Sólo dato de ESE dominio con su fecha. A cientos de diagnósticos por mes, una cifra
  prestada mal citada se multiplica por cientos.
- **No prometer monitoreo**: este carril es una foto única. El seguimiento continuo es el
  servicio contratado, no el diagnóstico gratuito.
- Si el sitio del prospecto bloquea el rastreo, **eso es un hallazgo para la conversación**
  ("hoy los sistemas automatizados no pueden leerte"), no algo que se rodea.

## Problemas comunes

- **`cost_blocked` inesperado**: el presupuesto mensual de Efeonce está casi agotado (el tope
  efectivo es el mínimo entre el tope por diagnóstico y lo que queda del mes). Revisar el gasto
  en `/admin/operations` o esperar el reset mensual.
- **`daily_cap_exceeded`**: alcanzaste el tope diario de diagnósticos por operador.
- **Mercado rechazado**: sólo están habilitados CL, MX, CO, PE, AR, ES, US. Un mercado nuevo es
  una decisión comercial (se agrega al vocabulario del carril, no se improvisa).

## Referencias técnicas

- Command/reader: `src/lib/growth/seo/prospect/{command,reader}.ts`
- Lane app: `POST/GET /api/admin/growth/seo/prospect-diagnostic`
- MCP: `get_seo_prospect_diagnostic` · `run_seo_prospect_diagnostic` — federadas también al
  gateway público `mcp.efeonce.org` (TASK-1658; **deploy ejecutado el 2026-08-28**, revisión `efeonce-mcp-gateway-00024-8b8`); `run_` requiere
  el scope `efeonce.mcp.seo.write`, fail-closed en el cliente público hasta TASK-1631
- Señal de sobrecosto: `growth.seo.prospect_diagnostic.cost_overrun` (steady 0)
