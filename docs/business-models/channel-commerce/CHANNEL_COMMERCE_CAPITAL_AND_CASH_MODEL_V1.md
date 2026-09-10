# Channel & Commerce — Modelo de capital y ciclo de caja V1

> **Status:** `Draft` — modelo estructural con parámetros declarados; **no sustituye a Finance**
> **Owner:** Julio Reyes (owner de línea) · Finance (validación y cifras reales)
> **Date:** 2026-09-10
> **Capital asignado:** CLP 40.000.000 (decisión 2026-09-10)
> **Resuelve:** D8 del [`roadmap por fases`](CHANNEL_COMMERCE_PHASED_ROADMAP_V1.md)

---

## 0. Qué es esto y qué no

Es el modelo que responde **cuál es el contrato más grande que se puede tomar sin quedarse sin caja**. Ese número
es una herramienta de calificación comercial: permite decir que sí o que no a una oportunidad sin dudar.

**No es una proyección financiera ni asesoría.** Los parámetros de costo, tasas y plazos son supuestos declarados
en §1 y deben ser reemplazados por cifras reales de Finance y de los proveedores antes de firmar nada. La
estructura del modelo sí es correcta; los números son ilustrativos hasta que se validen.

## 1. Parámetros y su origen

| Parámetro | Valor usado | Origen | Confianza |
|---|---|---|---|
| Capital disponible | CLP 40.000.000 | Decisión del owner | **Dato** |
| Margen bruto objetivo | 45% | Piso de práctica vigente | Política, no medido |
| Concentración máxima por contrato | 60% del working capital | Criterio de riesgo propuesto acá | **Supuesto** |
| Ejecución antes de poder facturar | 1 mes (facturación mensual al cierre) | Ciclo operativo típico | **Supuesto** |
| Aprobación de factura por el cliente | 0,5 mes | Práctica de empresas grandes | **Supuesto** |
| DSO base | 60 días | Caso medio en cuentas corporativas | **Supuesto** |
| Días hasta el anticipo del factoring | ~6 días (0,2 mes) | Operación estándar | **Supuesto** |
| Tasa de factoring | 1,2% – 2,2% mensual + comisión | Rango ilustrativo | **Sin verificar — Finance debe confirmar** |

**No modelado y que hay que sumar antes de operar:** IVA y su desfase mensual (relevante cuando el pass-through de
proveedores es grande), impuestos, y una remuneración para el owner de la línea.

## 2. Asignación del capital

| Destino | Monto | % | Para qué |
|---|---|---|---|
| **Arranque comercial** | $5.000.000 | 13% | Radiografías de Ejecución, material comercial, revisión legal de la figura, viajes y reuniones |
| **Reserva de contingencia** | $8.000.000 | 20% | El primer contrato que salga mal. No es pesimismo: es el costo de aprender con la responsabilidad puesta |
| **Working capital** | **$27.000.000** | 68% | Financiar la operación entre el gasto y el cobro |

La reserva **no se toca** para financiar operación. Si se usa para tomar un contrato más grande, el modelo deja de
tener red y el primer incidente se vuelve existencial.

**Tope por contrato: $16.200.000 de capital comprometido** (60% del working capital). Ningún contrato puede atar
más que eso, aunque se gane.

## 3. El cálculo

```text
Capital que un contrato ata  =  costo directo mensual  ×  T

T = meses de ejecución antes de facturar
  + meses hasta que el cliente aprueba la factura
  + meses hasta cobrar (o hasta el anticipo del factoring)
```

| Escenario | T | Costo directo máx./mes | **Facturación máx./mes** |
|---|---|---|---|
| Sin factoring · factura mensual · DSO 30 | 2,50 | $6.480.000 | **$11.781.818** |
| Sin factoring · factura mensual · DSO 60 | 3,50 | $4.628.571 | **$8.415.584** |
| Sin factoring · factura mensual · DSO 90 | 4,50 | $3.600.000 | **$6.545.455** |
| **Con factoring · factura mensual · DSO 60** | 1,70 | $9.529.412 | **$17.326.203** |
| **Con factoring · factura quincenal · DSO 60** | 1,20 | $13.500.000 | **$24.545.455** |
| Con factoring · anticipo + quincenal | 0,95 | $17.052.632 | **$31.004.785** |

### Lo que la tabla dice

**El factoring y los hitos de facturación no son optimización financiera: deciden si puedes tomar la cuenta.**
Entre el peor escenario ($6,5M/mes) y el mejor ($31M/mes) hay un factor de casi cinco, **con el mismo capital**.
Nada de eso depende de vender mejor: depende de cómo se estructura el contrato.

De ahí salen tres reglas de negociación que valen más que cualquier descuento:

1. **Anticipo al inicio de cada ciclo.** Es lo que más mueve la aguja.
2. **Facturación quincenal, no al cierre del trimestre.** Acortar el tramo pre-factura es capital propio liberado.
3. **Plazo de pago a proveedores no peor que el de cobro al cliente.** Un proveedor a 30 con un cliente a 90 abre
   60 días de hueco por ciclo, y ese hueco no lo cubre el factoring.

## 4. El costo del factoring, y dónde tiene que ir

| Tasa mensual | Costo sobre nominal (2 meses + comisión) | Margen efectivo desde 45% |
|---|---|---|
| 1,2% | ~2,9% | **42,1%** |
| 1,7% | ~3,9% | **41,1%** |
| 2,2% | ~4,9% | **40,1%** |

Entre 3 y 5 puntos de margen. **Ese costo va dentro del precio de la propuesta**, calculado sobre el plazo real de
cobro de esa cuenta. Un contrato priceado sin costo financiero y cobrado a 90 días no entrega el margen modelado —
entrega entre 3 y 5 puntos menos, y el piso de 45% deja de cumplirse.

## 5. La conclusión que ordena la fase 1

**CLP 40.000.000 financia una cuenta ancla a la vez, no un portafolio.**

El working capital total no cambia si se reparte: con factoring y facturación mensual, es una cuenta de ~$17M/mes
**o** dos de ~$8,7M/mes. Dos cuentas medianas no duplican la capacidad; la dividen, y además duplican el riesgo de
que una pague tarde.

De ahí la regla operativa de la fase 1:

> **La segunda cuenta entra sólo cuando la primera esté cobrando de forma estable.** Estable significa dos ciclos
> consecutivos cobrados dentro del plazo, no un cobro puntual.

Y una validación del diseño: la fase 1 con proveedores en vez de planilla propia **es lo que hace que 40 millones
alcancen**. Si el terreno se internalizara desde el inicio, el costo fijo mensual empezaría antes del primer cobro
y el capital se consumiría en meses, sin contrato que lo justifique.

## 6. Reglas de calificación comercial

Con este modelo, una oportunidad se califica así:

| Situación | Decisión |
|---|---|
| Contrato ≤ el tope del escenario aplicable | Se puede tomar |
| Contrato mayor, pero negociable a anticipo + quincenal | Se toma **condicionado** a esa estructura de pago |
| Contrato mayor, cliente no negocia plazos, sin factoring aprobado para ese deudor | **No se toma.** Ganar un contrato que no se puede financiar es peor que perderlo |
| Cliente mediano sin factoring aprobado | Se evalúa sólo contra capital propio, con tope mucho menor |

**Antes de cotizar una cuenta grande:** confirmar con la institución de factoring si ese deudor específico es
elegible y a qué tasa. El factoring se aprueba por el riesgo del cliente, no por el de Efeonce, así que esa
respuesta cambia el tope aplicable a esa oportunidad.

## 7. Qué recalcular y cuándo

Este modelo se rehace cuando:

- Finance entregue el costo real por misión, por punto remediado y por día de activación;
- se conozcan las tarifas y plazos reales de los proveedores calificados;
- se confirme la tasa de factoring y las líneas disponibles;
- se firme el primer contrato, con su DSO y su estructura de pago reales.

Hasta entonces los topes de §3 son órdenes de magnitud para calificar oportunidades, no compromisos.
