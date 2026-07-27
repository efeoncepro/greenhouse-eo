# Contexto del cliente y JTBD

Antes de mapear un journey declara: cuenta, segmento, ICP, buyer group, sponsor, decisor económico, usuario operativo, influenciadores, oferta, modelo de delivery, trigger, job-to-be-done, resultado esperado, restricciones, riesgo y definición de éxito.

## No mezclar journeys

- **Buyer journey:** cómo se evalúa y compra.
- **Customer journey:** cómo se obtiene valor a lo largo del lifecycle.
- **User journey:** cómo una persona ejecuta una tarea.
- **Buying group journey:** cómo se alinean varios roles.
- **Service journey:** cómo se produce y entrega el servicio.

Una cuenta puede tener varios journeys simultáneos. Usa `efeonce-customer-model-operator` para ICP, JTBD, buying group, segmentación y economía; esta skill gobierna la experiencia que resulta de ese contexto.

## Contrato de contexto

```yaml
account: ""
segment: ""
roles: [{role: sponsor, need: "", authority: "", evidence: ""}]
offer: ""
job: ""
desired_outcome: ""
trigger: ""
lifecycle_stage: ""
constraints: []
success_definition: ""
confidence: medium
source_date: ""
```
