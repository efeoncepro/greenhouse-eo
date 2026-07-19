# Business Models — índice y contrato documental

> **Estado:** categoría documental canónica
> **Owner:** Efeonce Strategy + Finance + Product + práctica dueña de cada modelo
> **Creado:** 2026-07-19

## Propósito

`docs/business-models/` contiene la lógica económica durable de una oferta, producto o plataforma Efeonce:
quién compra, qué valor recibe, cómo se entrega, qué unidades se cobran, qué costos y riesgos se absorben, cómo
se protege el margen y qué evidencia habilita escalar.

Un business model no es un tarifario. Es un sistema de decisiones comprobables que conecta propuesta de valor,
operación, monetización, unit economics, riesgo y validación.

## Fronteras con las demás categorías

| Categoría | Pregunta que responde | No debe contener como canon |
| --- | --- | --- |
| `docs/strategy/` | ¿Qué creemos y hacia dónde compite Efeonce? | Pricing o mecánica económica detallada de una oferta |
| `docs/context/` | ¿Qué contexto de negocio necesita un agente para decidir bien? | El modelo completo ni sus hojas de cálculo |
| `docs/business-models/` | ¿Cómo crea, entrega y captura valor esta oferta de forma sostenible? | Cotizaciones de clientes o contratos firmados |
| `docs/services/` | ¿Qué resultado asume Efeonce y con qué alcance operativo? | Unit economics internos, costos o pricing confidencial |
| `docs/architecture/` | ¿Qué contrato técnico y decisiones estructurales soportan el modelo? | La estrategia comercial completa |
| `docs/commercial/` | ¿Qué propuesta, licitación o investigación comercial concreta se ejecutó? | Una regla corporativa nacida de un solo deal |
| Finance/CPQ runtime | ¿Cuál es el costo, precio, margen y aprobación vigente de una cotización? | Narrativa estratégica no ejecutable |

## Estructura canónica

```text
docs/business-models/
  README.md
  BUSINESS_MODEL_TEMPLATE.md
  <oferta-o-producto>/
    <NOMBRE>_BUSINESS_MODEL_V<n>.md
    <NOMBRE>_<SUBMODELO>_V<n>.md       # sólo si merece contrato propio
    evidence/                          # research, experimentos y cohorts anonimizados
```

Reglas:

- una oferta tiene un solo business model vigente por versión;
- un submodelo —por ejemplo créditos, marketplace o revenue share— puede separarse si tiene lifecycle,
  riesgos o owners propios;
- costos, márgenes y pricing por cliente viven en sistemas financieros, propuestas o contratos; el modelo sólo
  conserva fórmulas, pisos, bandas autorizadas y gates;
- no guardar PII, secretos, credenciales, provider keys ni términos confidenciales de clientes en esta carpeta;
- toda cifra externa lleva fuente y fecha; toda cifra interna identifica su fuente de costo y nivel de confianza;
- una versión aprobada no se reescribe para ocultar una decisión material: se crea V2 o una decisión que la
  superseda.

## Estados

| Estado | Significado | Puede venderse |
| --- | --- | --- |
| `Draft` | Estructura incompleta; hipótesis no revisadas | No |
| `Proposed` | Lista para revisión de Strategy/Finance/Product/Legal | No, salvo piloto explícito |
| `Approved for validation` | Tesis y guardrails aprobados; faltan cohorts o parámetros comerciales | Sólo pilotos/SOW gobernados |
| `Commercially approved` | Pricing, costos, contrato, impuestos, soporte y controles aprobados | Sí, dentro del alcance declarado |
| `Deprecated` | No usar para negocio nuevo | No |
| `Superseded` | Reemplazado por otra versión enlazada | No |

`Approved for validation` no equivale a `Commercially approved`. Ningún documento puede habilitar checkout,
top-ups, facturación o clientes externos por sí solo.

## Taxonomía obligatoria del modelo

Todo business model debe separar al menos estas dimensiones:

1. **Oferta / value proposition:** problema, ICP, buyer, resultado y alternativa desplazada.
2. **Modelo de delivery:** quién dirige, quién aporta capacidad y quién responde por el outcome.
3. **Forma de engagement:** duración y forma contractual/comercial de la relación.
4. **Modo operativo:** asignación de autoridad en una ejecución concreta; no se infiere del contrato.
5. **Arquitectura de ingresos:** líneas recurrentes, variables, implementación, derechos y pass-through.
6. **Unidad de medición y cobro:** qué evento devenga valor y qué queda fuera.
7. **Costos y unit economics:** fully loaded cost, margen, riesgo, working capital y sensibilidad.
8. **Scope y accountability:** incluidos, exclusiones, SLA/telemetría, change order y refunds.
9. **Derechos, compliance y datos:** IP, licencias, consentimiento, privacidad, territorio y retención.
10. **Validación:** hipótesis, experimentos, cohortes, métricas, gates y condiciones de abandono.

## Gobierno y aprobaciones

| Plano | Owner mínimo | Gate |
| --- | --- | --- |
| Propuesta de valor y packaging | Strategy + práctica | ICP/JTBD y frontera de oferta claros |
| Delivery y SLA | Práctica + Operations | RACI, capacidad, estados degradados y medición |
| Costos, margen, créditos y refunds | Finance | fully loaded cost, reconocimiento y piso de margen |
| Derechos, privacidad y contrato | Legal/IP/Privacy | licencias, consentimiento, DPA y cláusulas aprobadas |
| Plataforma, ledger y entitlement | Product + Architecture + Security | ADR/spec/runtime y auditoría verificables |
| Lanzamiento comercial | Leadership + owners anteriores | todos los gates y rollback/stop conditions |

## Modelos disponibles

- [Efeonce Creative Studio](creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md) — `Approved for validation`.
- [Studio Credits](creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md) — política económica V1,
  todavía sin precio público ni venta self-serve.
