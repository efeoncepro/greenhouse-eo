# Pipeline comercial

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-05-07 por Codex
> **Modulo:** Comercial
> **Ruta en portal:** `/finance/intelligence/pipeline`
> **Documentacion relacionada:** [Pipeline Comercial](../../documentation/finance/pipeline-comercial.md), [Surfaces comerciales sobre rutas legacy Finance](../../documentation/comercial/surfaces-comerciales-sobre-rutas-finance.md)

## Para que sirve

Pipeline comercial muestra oportunidades activas, contratos standalone y pre-sales en una sola lane de forecast. Sirve para revisar cuanto hay en negociación y cuanto vale ponderado por probabilidad.

No es contabilidad ni revenue reconocido. Para cierre de período, P&L y resultado operativo usa Finanzas > Economía.

## Antes de empezar

- Necesitas acceso a la vista `comercial.pipeline` o acceso legacy `finanzas.inteligencia`.
- Si no ves el item `Comercial > Pipeline`, pide a Admin Center revisar tus vistas autorizadas.
- Los datos dependen de snapshots de HubSpot/deals y cotizaciones; si un cambio recién ocurrió en HubSpot, puede tardar hasta el siguiente sync.

## Paso a paso

1. Abre el sidebar.
2. Entra a **Comercial > Pipeline**.
3. Revisa los KPIs superiores: pipeline abierto, ponderado, ganado del mes y perdido del mes.
4. Usa filtros por categoría, etapa, cliente o business line para acotar la lectura.
5. Abre el detalle de una oportunidad solo cuando necesites revisar la cotización o el deal fuente.

## Vista compatible en Finanzas

Durante la convivencia, Finanzas > Economía mantiene una tab **Pipeline comercial** con un aviso de owner Comercial y link a la lane dedicada.

Usa esa tab solo como compatibilidad. Para trabajo comercial diario, usa Comercial > Pipeline.

## Que no hacer

- No trates el monto ponderado como revenue reconocido.
- No compares Pipeline directamente contra caja o facturación mensual sin pasar por cierre financiero.
- No crees `/commercial/pipeline` ni bookmarks nuevos fuera del path actual hasta que exista una task de normalización de URLs.
- No fuerces quotes legacy con `legacy_status` al pipeline. TASK-557.1 ya marcó históricas/limbo con `legacy_excluded`, y las recuperables requieren normalización humana antes de volver al forecast.

## Problemas comunes

### No veo Pipeline en el sidebar

Pide revisar si tienes `comercial.pipeline` o compat `finanzas.inteligencia`. La navegación no se muestra si ninguna vista está autorizada.

### Veo menos oportunidades de las esperadas

Revisa si la oportunidad viene de una quote legacy. Pipeline excluye `legacy_excluded=true` y también `legacy_status` para evitar limbos visibles en la lane comercial.

### El forecast no coincide con Finanzas

Es esperado: Pipeline usa forecast (`amount × probability`) y Finanzas usa hechos contables/materializados. Son planos distintos.

## Referencias tecnicas

- Page dedicada: `src/app/(dashboard)/finance/intelligence/pipeline/page.tsx`
- Vista reutilizada: `src/views/greenhouse/finance/CommercialIntelligenceView.tsx`
- Reader: `src/lib/commercial-intelligence/revenue-pipeline-reader.ts`
- Access registry: `src/lib/admin/view-access-catalog.ts`
