# AI Visibility Grader — reconciliación de costo por run

**Fecha:** 2026-07-27  
**Alcance:** Greenhouse staging/dev, `efeonce-group`, `greenhouse_growth`, Cloud Run `ops-worker`  
**Tipo:** auditoría operativa de costo  
**Estado:** evidencia parcial; no habilita todavía un precio comercial fijo por run

## Veredicto

El valor `grader_runs.estimated_cost_usd` es un **estimador de observaciones principales**, no una contabilidad all-in.
No debe comunicarse como costo real ni como garantía de que un run público cuesta US$0,50.

En el run público real auditado `grun-324ed1d5-c67b-4768-9d6d-0272fd9ca67b`:

- `mode=light`, `run_kind=public_diagnostic`.
- 24 observaciones persistidas: 18 exitosas y 6 `google_ai_overview` omitidas.
- `estimated_cost_usd` persistido: **US$0,2767**.
- Recálculo con usage persistido y el pricing actualmente usado por el runtime:
  - OpenAI GPT-4.1: **US$0,257534**.
  - Gemini: **US$0,014638**.
  - Perplexity Sonar: **US$0,034510**, incluyendo seis request fees.
  - DataForSEO: **US$0**, porque las seis observaciones fueron omitidas.
- Subtotal observado/recalculado de providers principales: **US$0,3067**.
- Hubo 18 intentos de extracción de prosa con Anthropic. El contrato actual persiste estado/provider, pero no tokens ni costo de esas llamadas; por eso el total all-in es superior al subtotal y todavía no está medido.

El estimador subvalora este run en aproximadamente **US$0,0300** solo por no reflejar el request fee de Perplexity. El gap restante corresponde a extracción LLM, search/grounding no incluido y overhead de infraestructura.

## Evidencia histórica

Sobre 13 runs públicos `light` con estado terminal:

| Métrica | Resultado |
|---|---:|
| Promedio `estimated_cost_usd` | US$0,2627 |
| Mínimo registrado | US$0,1916 |
| Máximo registrado | US$0,3237 |
| Duración promedio | 2,99 min |

Estos valores son útiles como distribución del **estimador actual**, no como costo contable.

## Cloud Run

El export de billing de GCP está en CLP. Entre 2026-06-12 y 2026-07-27, `ops-worker` acumuló:

- costo bruto: **CLP 9.035,72**;
- créditos: **CLP -5.522,50**;
- costo neto: **CLP 3.513,22**;
- tipo de cambio del export: **922,525 CLP/USD**;
- equivalente neto: **aprox. US$3,85**.

Este monto no puede dividirse por grader: `ops-worker` atiende grader, outbox, forms, reactive processing y otros handlers. La atribución por run requiere duración/uso de request y un ledger de allocation; no se debe cargar el total del worker a los runs del grader.

## Contrato operativo vigente

Hasta que exista instrumentación completa:

```text
costo observado mínimo del run público ≈ US$0,3067
costo all-in = providers + extracción LLM + DataForSEO + probes + Cloud Run asignado
```

No publicar ni usar en pricing la frase “el grader cuesta US$0,50 por run”. La formulación permitida es:

> El grader tiene un techo aproximado de US$0,50 para la estimación de observaciones principales del modo `light`; el costo total todavía depende de extracción, herramientas, providers e infraestructura.

## Gaps que deben cerrarse

1. Persistir usage y `costEstimateUsd` de cada extracción LLM dentro de un ledger por run.
2. Registrar request/tool/search/grounding fees por provider, no solo tokens.
3. Persistir costo real de DataForSEO incluso cuando la observación termina `skipped` después de una request cobrable.
4. Separar `estimated_provider_cost_usd`, `observed_provider_cost_usd`, `extraction_cost_usd`, `infra_allocated_cost_usd` y `total_cost_usd`.
5. Asignar Cloud Run por request/run sin imputar el costo total del worker compartido.
6. Ejecutar tres o más canaries reales, con autorización presupuestaria, y reconciliarlos contra invoices/provider dashboards antes de fijar un costo comercial.

## Fuentes

- [`src/lib/growth/ai-visibility/cost.ts`](../../../src/lib/growth/ai-visibility/cost.ts)
- [`src/lib/growth/ai-visibility/normalization/prose-extraction/router.ts`](../../../src/lib/growth/ai-visibility/normalization/prose-extraction/router.ts)
- [`docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`](../../manual-de-uso/growth/ai-visibility-grader-smoke.md)
- [`docs/audits/cloud-cost/README.md`](README.md)
- Pricing oficial de [Perplexity](https://docs.perplexity.ai/docs/getting-started/pricing)
