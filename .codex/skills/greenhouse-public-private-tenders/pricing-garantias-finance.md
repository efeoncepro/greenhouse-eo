# Pricing, Garantías y Finance del Bid

Cómo poner precio a una licitación, dimensionar las garantías, y no ganar un contrato que te descapitaliza. El detalle contable/tesorería fino se delega a **`greenhouse-finance-accounting-operator`**; acá está el método aplicado al bid.

## Principio: el precio se modela hacia la fórmula, sobre el costo real

Dos verdades que conviven:

1. **El precio se modela hacia la fórmula de evaluación de las bases.** Si precio pesa 40% con fórmula "precio mínimo = 100 pts, proporcional", tu precio compite en ese 40%; bajar 5% puede no valer la pena si sacrifica margen y solo te da 2 pts. Si pesa 70%, es guerra de costos.
2. **El piso lo pone el loaded cost, no el deseo de ganar.** Nunca cotices bajo el costo cargado (horas cargadas + overhead + costo de garantías + costo de capital por el desfase de pago). Regla ASaaS: **nunca SOW sin loaded cost + margen proyectado**.

## Estructura de costo de una oferta (checklist)

- **Costo directo de delivery**: horas del equipo × costo cargado por rol (loaded cost, no tarifa de venta). Fuente: `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`.
- **Costos de terceros**: producción, medios, licencias, freelance, viáticos.
- **Overhead / absorción**: según política de la firma.
- **Costo de garantías**: comisión bancaria de la boleta / prima de la póliza / costo del certificado de fianza (ver abajo).
- **Costo de capital por desfase de pago**: el Estado paga a 30/45/60+ días desde recepción conforme; ese dinero inmovilizado tiene costo (o costo de factoring).
- **Costo de preparar la oferta**: horas de bid desk + emisión de documentos (hunde antes de ganar; entra al bid/no-bid, no al precio del contrato).
- **Contingencia/riesgo**: multas por incumplimiento, scope creep, indexación.

## Cost-plus vs valor

- **Cost-plus** (costo + margen objetivo): default seguro en público donde el precio es fórmula y la comparación es directa. Da un piso defendible.
- **Value-based** (precio por el valor/resultado): tiene más recorrido en **privado** (RFP corporativo) donde puedes diferenciar por outcome, y en público solo donde la técnica pesa mucho más que el precio. Requiere una narrativa de valor sólida (→ `propuesta-tecnica-economica.md` + `commercial-expert`).

En público con precio dominante, cost-plus disciplinado gana más que "adivinar" un precio agresivo.

## Indexación: UF y UTM

- **UF** (Unidad de Fomento): reajuste diario por IPC. Contratos plurianuales o con costos que suben conviene expresarlos/reajustarlos en UF para no perder margen con inflación. Verifica si las bases lo permiten.
- **UTM** (Unidad Tributaria Mensual): unidad de los umbrales de procedimiento (L1/LE/LP) y de algunas multas/garantías. Se reajusta mensual.
- **Regla:** si el contrato es largo y las bases lo permiten, **indexa a UF**. Si cotizas en pesos nominales a 12+ meses, estás asumiendo la inflación tú.

## Garantías: instrumentos, costo y timing

| Instrumento | Qué es | Costo típico | Timing de emisión | Nota |
|---|---|---|---|---|
| **Boleta de garantía bancaria** | El banco garantiza; congela línea/fondos | Comisión + eventual inmovilización de línea de crédito | Días (según banco/línea) | La más pedida históricamente; consume línea |
| **Vale vista** | Documento del banco con fondos propios inmovilizados | Bajo, pero inmoviliza tu caja | Rápido | Descapitaliza mientras dure |
| **Póliza de seguro de garantía** | Aseguradora cubre; pagas prima | Prima (% del monto) | Días | No consume línea bancaria; buena para no ahogar caja |
| **Certificado de fianza** | Entidad de garantía recíproca (IGR) afianza | Comisión | Días | Alternativa a boleta que preserva línea |
| **Depósito a la vista** | Depósito directo | Inmoviliza caja | Rápido | |

Reglas de bid:

- El **costo de la garantía entra al costo de la oferta**, no lo absorbas gratis.
- El **tiempo de emisión entra al plazo**: si el cierre es en 3 días y la boleta tarda 4, no llegas → NO-BID o cambiar de instrumento.
- **Vigencia**: las bases exigen que la garantía cubra cierto período (p. ej. seriedad hasta X días post-adjudicación; fiel cumplimiento hasta el fin del contrato + margen). Emitir con vigencia corta = oferta inadmisible.
- Prefiere instrumentos que **no ahoguen la caja** (póliza / certificado de fianza) si vas a tener varias licitaciones vivas a la vez.

## Cashflow y el desfase de pago del Estado

- Público suele pagar **contra recepción conforme + factura**, con plazos que en la práctica se estiran. Modela el ciclo caja-a-caja real, no el nominal.
- Si el contrato exige **anticipo**, ojo: suele venir con **garantía de anticipo** (costo adicional).
- Un contrato grande con pago a 60+ días y garantías caras puede tener **margen contable positivo pero cashflow negativo** por meses. Eso es una decisión de tesorería, no solo de pricing.

## Factoring: cuándo tiene sentido

- **Factoring** = vender la factura/derecho de cobro a un tercero para adelantar caja (con descuento).
- Útil cuando el margen aguanta el costo del factoring y necesitas la caja para operar otras licitaciones/proyectos.
- El **costo del factoring** debe restarse del margen al decidir el bid/no-bid, no descubrirse después.
- Delega el modelado (tasa, elegibilidad de la factura, impacto en margen) a `greenhouse-finance-accounting-operator`.

## Puente al bid/no-bid

El output de este companion alimenta la **puerta económica** del gate (`bid-lifecycle-go-no-go.md`):

```text
margen_proyectado = precio_oferta
                  − loaded_cost_delivery
                  − costo_terceros
                  − costo_garantias
                  − costo_capital(desfase_pago | factoring)
                  − costo_preparacion_oferta(prorrateado)
GO económico  ⇔  margen_proyectado / precio_oferta ≥ umbral_margen_BU
```

Si el margen no pasa el umbral con un precio que aún sea competitivo en la fórmula, es **NO-BID**, por muy alto que sea el fit.

## Hand-off

- Modelado contable/tesorería/factoring/impuestos → `greenhouse-finance-accounting-operator`.
- Umbral de margen por BU y estrategia de precio/packaging → `commercial-expert` (overlay Efeonce).
- Cómo se traduce el precio en la oferta económica y sus anexos → `propuesta-tecnica-economica.md`.
