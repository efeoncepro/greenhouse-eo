# Diagnóstico SEO de Prospecto — Carril de Adquisición

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-08-27 por Claude (TASK-1709)
> **Ultima actualizacion:** 2026-09-03 por Claude (TASK-1805: el tráfico estimado declara fórmula, muestra y si es un piso; la cita de AI Overview no suma ETV; el diagnóstico lleva `etvMethodology`; estado `seo_etv_methodology_rejected`)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (Delta 2026-08-27 + §9)

## Qué es

Una corrida única que responde **"¿qué está perdiendo este dominio en búsqueda?"** para un
prospecto con el que todavía no hay contrato — sin pedirle acceso a nada. Toda la evidencia sale
del proveedor de datos (DataForSEO) y de la lectura pública del sitio (portada, robots.txt,
sitemap), respetando las reglas de cortesía de cualquier rastreador serio.

## Qué entrega

Un conjunto de **hechos con fecha**, cada uno marcado como **estimado** (no existe Search Console
de un prospecto, así que no hay ningún dato medido):

| Hecho | Qué responde |
|---|---|
| Búsquedas donde el dominio aparece | Tamaño de su superficie orgánica |
| Búsquedas en primera página / a corta distancia | Qué tiene ganado y qué está a un empujón |
| Citas en AI Overviews de Google | Si la IA de Google ya lo cita, y dónde |
| Tráfico orgánico mensual estimado | Cuánto vale esa superficie hoy — con la fórmula usada, cuántas búsquedas entraron en la suma y si la suma es un piso (ver abajo) |
| Competidores identificados | Quién compite de verdad por ese mercado |
| Dominios que enlazan a la competencia y no al sitio | El gap de autoridad |
| Evidencia del sitio (robots, datos estructurados, sitemap, legibilidad) | Si el sitio es legible para sistemas automatizados |

## La fórmula detrás del tráfico estimado (TASK-1805, 2026-09-03)

El "tráfico orgánico mensual estimado" no se mide: se **suma** a partir de las búsquedas donde el
dominio aparece, usando la estimación de tráfico del proveedor (ETV). Desde el 2026-09-03 ese hecho
declara cómo se armó, para que nadie lo lea como más de lo que es:

| Campo del detalle | Qué dice |
|---|---|
| `etvMethodologyVersion` | Con qué fórmula del proveedor se calculó (hoy `legacy_static_v1`) |
| `sampleRows` | Cuántas búsquedas entraron en la suma |
| `rowLimit` | El máximo de filas que el diagnóstico compra por corrida |
| `truncated` | Si la lista llegó al límite. **Cuando es verdadero, la suma es un piso**, no el total del dominio |

Dos reglas que se desprenden de esto:

- **La cita en AI Overviews no suma tráfico.** El tráfico que el proveedor atribuye a una cita en la
  respuesta de IA de Google es un **reparto modelado** (uniforme entre los dominios citados), no un dato
  observado. El diagnóstico lo registra (`etvSummed: false`) y no lo agrega al tráfico estimado.
- **El diagnóstico entero lleva su fórmula.** Además del detalle por hecho, la cabecera trae
  `etvMethodology` (versión, evidencia y comparabilidad). Dos diagnósticos con versiones distintas **no se
  comparan**: la diferencia sería de fórmula, no del sitio. El cambio a la fórmula nueva del proveedor
  (corte 2026-11-01) lo decide `TASK-1806`, no una corrida.

Contexto completo de la fórmula y de su cambio: [Metodología detrás del tráfico estimado](modulo-seo-search-visibility-360.md).

## Qué NO hace (a propósito)

- **No emite un puntaje ni un veredicto de salud.** Un diagnóstico automatizado no puede
  certificar que un sitio "está sano" (un sitio que bloquea a los rastreadores de IA puede verse
  perfecto en todo lo demás). El contrato de salida no tiene campo para score, veredicto,
  benchmark de industria ni "lift".
- **No sigue al prospecto en el tiempo.** Una corrida por diagnóstico y se acabó: cero
  monitoreo recurrente sobre alguien que no es cliente. Repetir el mismo día devuelve el
  resultado existente sin gastar; repetir otro día es una decisión humana nueva.
- **No evade bloqueos.** Si el sitio bloquea el rastreo, eso se registra como hallazgo y se
  informa — nunca se rodea con proxies ni identidades falsas.

## Costos y frenos

- Costo por diagnóstico: **~USD 0,25** (tope duro configurable, default USD 1,00).
- El tope se valida **antes** de la primera consulta al proveedor: si no cabe, el diagnóstico
  se detiene con estado `cost_blocked` y **cero gasto**.
- Tope diario por operador (default 10 diagnósticos/día).
- Si la política de fórmula ETV rechaza la corrida (fórmula anterior configurada después del corte del
  proveedor, o configuración inválida), el diagnóstico se detiene **antes de reclamar cupo y antes de
  gastar** con el estado `seo_etv_methodology_rejected` (HTTP 409). No es un error del proveedor: es la
  plataforma negándose a producir un hecho sin fórmula válida.
- El gasto queda registrado como **costo de adquisición de Efeonce** en el libro único de gasto
  del módulo — separado del presupuesto de los clientes.

## Cómo se usa

- Operadores internos (roles admin y account) desde el contrato programático
  (`POST /api/admin/growth/seo/prospect-diagnostic` con `{ rootDomain, market }`).
- Agentes vía MCP (`run_seo_prospect_diagnostic`) — siempre con confirmación humana previa,
  porque cada corrida compromete dinero real. Ambas tools (`get_` y `run_`) están además
  federadas al gateway público `mcp.efeonce.org` desde 2026-08-27 (TASK-1658; deploy del
  gateway **desplegado el 2026-08-28**, revisión `efeonce-mcp-gateway-00024-8b8`): `run_` exige el scope `efeonce.mcp.seo.write`, que NO está
  cableado al cliente público — fail-closed hasta TASK-1631.
- Mercados habilitados: CL, MX, CO, PE, AR, ES, US.

> Detalle técnico: primitives en `src/lib/growth/seo/prospect/`, flag
> `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` (default OFF en código, **ON en Vercel Production
> desde el 2026-08-27**; corrida real sobre `skyairline.com`: previsto USD 0,2050 vs medido USD
> 0,1991 bajo tope de USD 1,00), señal
> `growth.seo.prospect_diagnostic.cost_overrun` en `/admin/operations`. Fórmula ETV: policy en
> `src/lib/growth/seo/etv-methodology/`, ADR
> [GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md](../../architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md).
