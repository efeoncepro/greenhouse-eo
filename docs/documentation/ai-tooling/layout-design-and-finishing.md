# Layout Design & Finishing para campañas visuales

> **Tipo de documento:** Documentación funcional
>
> **Estado:** Operativo para producción creativa out-of-band
>
> **Última actualización:** 2026-07-19
>
> **Canon técnico:** [Greenhouse Multimodal Campaign Production V1](../../operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md)
>
> **Manual:** [Producir un set con Layout Design & Finishing](../../manual-de-uso/ai-tooling/producir-layout-design-y-finishing.md)

## Qué resuelve

Layout Design & Finishing permite producir familias estáticas con más control que un prompt full-frame y más
riqueza visual que una composición puramente mecánica. Separa las decisiones que deben ser exactas de aquellas
en las que un modelo generativo agrega valor.

La capacidad no promete que una grilla por sí sola cree una pieza premium. El estándar surge de cinco capas de
trabajo: composición, integración, finishing, mastering y QA.

## Cómo funciona

```text
anchor aprobado
  → layout nativo por ratio
  → clean plate sin texto/marca
  → finish generativo acotado
  → composición exacta
  → mastering por destino
  → QA + aprobación humana
```

El director de arte define tesis, jerarquía, grilla, campos de copy, hook y locks. Seedream 5 Pro o GPT Image 2
reciben sólo el delta visual que les corresponde. La herramienta de composición —Figma, Adobe, Sharp/fontkit u
otra declarada— conserva autoridad sobre tipografía, logo, CTA, legal, localización y export.

## División de responsabilidades

| Necesidad                                                       | Responsable               |
| --------------------------------------------------------------- | ------------------------- |
| materialidad, luz, color, atmósfera y cohesión del plate        | Seedream 5 Pro Edit       |
| geometría, escala, recomposición, safe zones o región protegida | GPT Image 2 Edit          |
| grilla, hook gráfico, copy, logo, CTA, legal y locale           | compositor determinístico |
| decisión de anchor, excepción y release                         | persona responsable       |

El router no constituye un ranking estable de modelos. Se elige la mano según el delta restante y se reverifica
el contrato del proveedor antes de presupuestar.

## Reglas de producto creativo

- Cada ratio recibe una composición nativa; no es un crop automático de un master universal.
- El finish generativo recibe un raster limpio. Nunca recibe el anuncio final con copy y marca.
- Un pase cambia una sola variable dominante y repite todos los locks.
- La composición final usa activos oficiales y contenido exacto.
- Las capas operativas son archivos/autoridades separadas; “regiones/capas” de Seedream sigue siendo edición
  semántica de un raster plano.
- El release creativo y la activación en medios son estados independientes.

## Qué se validó

El piloto `high-frequency-layout-design` reutilizó el anchor de la campaña High Frequency y produjo tres
formatos —`16:9`, `4:5`, `9:16`— con plates por ratio, finish Seedream 5 Pro y composición determinística con
Sharp/fontkit. El set obtuvo `47/50`, pasó QA técnico `3/3` y costó aproximadamente `USD 0,27` de inferencia
incremental. El copy y el logo nunca entraron al modelo.

Estas cifras son evidencia de método, no SLA. La dirección, prompts, manifests, métricas y paquete están en
[`ai-generations/2026-07-18_high-frequency-campaign-e2e/`](../../../ai-generations/2026-07-18_high-frequency-campaign-e2e/).

## Límites

- No sustituye criterio humano de arte, marca, claims, derechos o release.
- No entrega PSD/SVG generado por Seedream ni localidad pixel-perfect.
- No vuelve press-ready una prueba sin tamaño físico, sustrato, bleed e ICC del proveedor.
- No garantiza performance de campaña; eso exige activación, tracking y aprendizaje por `asset_id`.
