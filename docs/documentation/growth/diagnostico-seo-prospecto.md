# Diagnóstico SEO de Prospecto — Carril de Adquisición

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-27 por Claude (TASK-1709)
> **Ultima actualizacion:** 2026-08-27 por Claude (TASK-1709)
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
| Tráfico orgánico mensual estimado | Cuánto vale esa superficie hoy |
| Competidores identificados | Quién compite de verdad por ese mercado |
| Dominios que enlazan a la competencia y no al sitio | El gap de autoridad |
| Evidencia del sitio (robots, datos estructurados, sitemap, legibilidad) | Si el sitio es legible para sistemas automatizados |

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
> `growth.seo.prospect_diagnostic.cost_overrun` en `/admin/operations`.
