# Channel & Commerce — Roadmap por fases y asignación de capital V1

> **Status:** `Proposed`
> **Owner de la línea:** Julio Reyes (interino, decisión 2026-09-10) · Finance (caja y margen) · Legal (figura y contratos) · Operations (capacidad)
> **Date:** 2026-09-10
> **Decisión que registra:** ofrecer el servicio completo desde el día uno y llegar a tecnología propia por fases
> **Relacionado:** [`CHANNEL_COMMERCE_BUSINESS_MODEL_V1`](CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md) · [`CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10`](../../audits/commercial/CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10.md) · [`EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1`](../EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md) · [`EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1`](../EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md)

---

## 0. La decisión tomada

El benchmark chileno recomendó `re-scope` hacia una oferta acotada. **La decisión de negocio fue otra y queda
registrada como tal:** Efeonce ofrece el servicio completo —diagnóstico, auditoría, remediación en tienda,
activación, producción y orquestación— desde el primer contrato, y avanza por fases hasta operar con tecnología
propia. Hay capital disponible para financiar el arranque.

Esta decisión es coherente con la evidencia del propio benchmark: el estándar chileno es llave en mano y una
oferta parcial se lee incompleta frente a incumbentes que resuelven todo. Lo que el roadmap agrega es la
disciplina para que "ofrecer todo" no signifique "ejecutar todo desde el día uno".

### El principio que sostiene las tres fases

```text
La oferta al cliente es completa y estable desde la fase 1.
Lo que cambia por fase es cuánto de esa oferta ejecuta Efeonce
con capacidad propia en vez de con un proveedor gobernado.
```

El cliente ve un solo responsable y un solo contrato en las tres fases. El mix build/partner es una decisión
interna que se mueve con la evidencia, y **nunca** es un tema del cliente.

### La regla que protege la promesa

Ofrecer llave en mano sin capacidad instalada traslada todo el riesgo de ejecución a proveedores mientras la
responsabilidad queda en Efeonce. Eso se sostiene con una sola condición, y es innegociable:

> **Back-to-back o no se firma.** Todo compromiso que Efeonce asuma ante el cliente —cobertura, plazo, calidad,
> reposición, montaje— debe estar respaldado por un compromiso equivalente y exigible del proveedor que lo
> ejecuta, con penalidad y plan de reemplazo.

Sin back-to-back, el primer contrato que falle consume el capital y quema la única referencia que la línea tiene.
En un mercado donde el comparison set son actores de 15-20 años, la primera referencia vale más que el margen del
primer año.

---

## 1. Fase 1 — Integrador con accountability total

**Horizonte estimado:** meses 0 a 9 · **Objetivo:** vender, entregar completo y aprender los costos reales.

### Qué ejecuta Efeonce con capacidad propia

- Diagnóstico, arquitectura de canal y diseño del modelo de scoring.
- Traducción del dato a decisión: priorización, lectura de ciclo, recomendación de reasignación.
- **La conexión digital**: retail media de la cadena, digital shelf, visibilidad en motores de respuesta IA,
  contenido de canal. Es lo único que hoy ya tienes instalado y lo único que el peer set no cubre.
- Gobierno del delivery, relación con el cliente y accountability completa.

### Qué ejecuta un proveedor gobernado

| Capa | Por qué no se internaliza todavía |
|---|---|
| Captura por misiones | Existen redes regionales con una década y cobertura multi-país; construirla es competir por una capacidad contratable |
| Personal de terreno | Mercado consolidado y commoditizado; contratar antes de conocer el volumen real fija costo sin demanda |
| Producción física, montaje y logística | Capital intensivo, margen bajo y ajeno al core |

### Qué se aprende en esta fase, y que no se puede aprender de otra forma

1. El costo real por misión, por punto remediado y por día de activación **en Chile**.
2. Qué falla en la ejecución y con qué frecuencia — el input que después justifica internalizar.
3. Qué pide el cliente que nadie está resolviendo.
4. Cuánto margen deja cada capa realmente, no en el modelo.

Sin estos cuatro datos, cualquier decisión de internalizar o de construir plataforma es una apuesta.

### Criterio de salida de la fase 1

Dos cuentas entregando ciclos completos, costos reales medidos con dispersión (p50 y p95), y al menos una
renovación. Sin renovación no hay fase 2: significa que el servicio se vendió pero no se sostuvo.

---

## 2. Fase 2 — Internalización selectiva

**Horizonte estimado:** meses 9 a 24 · **Objetivo:** capturar margen y control donde importa, sin cargar la
estructura.

### El criterio de qué se internaliza

Se internaliza una capa sólo si cumple **las tres** condiciones:

1. **Margen:** el spread contra el proveedor justifica el costo fijo y el riesgo laboral.
2. **Data propietaria:** ejecutarla genera información que hoy se queda en el proveedor.
3. **Calidad:** es donde se decide que el cliente renueve o no.

### El orden recomendado

| Prioridad | Capa | Razón |
|---|---|---|
| **1** | **Field leads y supervisores**, no el ejército de reposición | Son quienes deciden la calidad de la ejecución y quienes ven lo que ningún reporte captura. Es headcount pequeño, alto impacto y utilización combinable con activación |
| **2** | Captura por misiones | Sólo si el volumen la hace más barata que el partner **y** el partner deja de escalar o de dar acceso al dato crudo |
| **3** | Ejecutores de terreno de cuentas ancla | Sólo con contrato plurianual que amortice el costo fijo |
| **Nunca** | Montaje, carpintería, mobiliario, bodega, transporte | Capital de trabajo y margen bajo; se gobierna, no se opera |

### Lo que activa el gate de Talent Assurance

Cualquier internalización de personas entra por el feasibility gate completo: cost snapshot fechado, composición,
continuidad, backup, recruitability, margen y sensibilidad, con decisión `go | re-scope | re-price | no-go`. La
jornada de 42 horas y su baja a 40 en 2028 se proyectan en todo escenario.

---

## 3. Fase 3 — Tecnología propia

**Horizonte:** por tracción, **no por fecha**.

### La regla que evita el error más caro

> **La plataforma se construye sobre data que ya tienes, no para conseguirla.**

Construirla antes de operar produce un dashboard sin data, que es exactamente lo que un incumbente con años de
histórico desarma en una reunión. El competidor de referencia llegó a su plataforma después de más de una década
operando: la secuencia importa más que la ambición.

### Gates para abrir la fase 3

| # | Condición |
|---|---|
| 1 | Volumen acumulado de ciclos y puntos de venta suficiente para que el histórico produzca un insight que el proveedor no entrega |
| 2 | Un costo anual de licencia o fee de partner que la plataforma pueda amortizar en un horizonte definido |
| 3 | Una capacidad demostrada que el mercado no tiene — el candidato natural es cruzar ejecución física con inversión digital y visibilidad en motores de IA |
| 4 | Un cliente que pague por esa capacidad, no que la reciba incluida |

### La ventaja que sí es real, y que conviene no malgastar

Efeonce no construye desde cero. Greenhouse ya opera contractor engagements y payables, costo cargado full
absorption, y el motor de métricas de delivery. Una plataforma de canal se construye como **un dominio más dentro
de un sistema que ya existe**, no como producto nuevo. Eso cambia el orden de magnitud de la inversión frente a
cualquier competidor que parta de cero.

Esa ventaja se malgasta si se usa como excusa para adelantar la fase 3. Sigue siendo la última.

---

## 4. Asignación del capital

> Este documento no autoriza emisión de capital, deuda, transferencia de IP ni estructura societaria. Registra el
> criterio de uso de capital propio ya disponible. Cualquier instrumento financiero se decide con Finance y
> asesoría legal.

### El capital financia capacidad de responder y aprendizaje, no activos

**En qué sí:**

| Uso | Por qué |
|---|---|
| **Working capital** | Es el destino principal. Ver §5 |
| Primer field lead o líder de operación de la línea | Sin dueño operativo, la promesa llave en mano no tiene quién la sostenga |
| Radiografías de Ejecución para prospectar | El activo comercial más barato y más convincente que la línea puede producir sin clientes |
| Material comercial y las respuestas a las objeciones con nombre propio | Sin esto no se sale a la calle |
| **Reserva para el primer contrato que salga mal** | No es pesimismo: es el costo de aprender con la responsabilidad puesta |

**En qué no, todavía:**

- Construir plataforma (fase 3, y sólo con los cuatro gates).
- Mobiliario, bodega, vehículos o cualquier activo físico.
- Contratar equipo de terreno antes del primer contrato firmado.
- Licencias anuales caras de software antes de conocer el volumen.
- Cobertura o capacidad "para estar listos" — capacidad ociosa es la forma más rápida de consumir capital en este
  modelo.

---

## 5. El riesgo que mata este modelo, y no es el comercial

**El working capital.** El modelo llave en mano paga antes de cobrar:

```text
Efeonce paga:  proveedores y planilla → mensual, sin excepción
Efeonce cobra: marcas grandes → 30, 60 o 90 días, después de aprobar la factura
```

Cada contrato grande que se gana **consume caja antes de generarla**. Es la paradoja del crecimiento en servicios
con pass-through: vender más acelera el problema en vez de resolverlo.

### El factoring reduce el problema, no lo elimina

Efeonce puede financiar con factoring, y Greenhouse ya lo opera contablemente (módulo canónico de factoring +
reconciliación del settlement con factoring y retenciones). Eso sube el tamaño de contrato financiable y hace
viable tomar una cuenta grande que sin factoring habría que rechazar.

Con tres límites que deben estar en el modelo de caja:

1. **No cubre el tramo pre-factura.** Se anticipa una factura ya emitida; todo el gasto del ciclo ocurre antes de
   poder emitirla. Ese tramo se financia con capital propio, siempre. **Se acorta con hitos de facturación
   cortos** —anticipo al inicio del ciclo y saldo al cierre, o quincenal— y eso se negocia en el contrato.
2. **Cuesta, y el costo sale del margen.** Interés y comisión de asesoría sobre el plazo real de cobro deben estar
   dentro del precio de la propuesta, no absorbidos después.
3. **Depende del deudor.** Se aprueba según el riesgo del cliente, no el de Efeonce: accesible con marcas grandes
   —las cuentas objetivo—, incierto con medianas. Y si es con responsabilidad, no transfiere riesgo de crédito,
   sólo tiempo.

Detalle en [`CHANNEL_COMMERCE_SUPPLIER_REGISTRY_V1`](CHANNEL_COMMERCE_SUPPLIER_REGISTRY_V1.md) §4.

**Lo que hay que hacer antes del primer contrato grande:**

1. Modelar el ciclo de caja completo con el DSO real esperado, no el contractual.
2. Negociar plazos de pago a proveedores que no sean peores que los de cobro al cliente. Un proveedor que cobra a
   30 con un cliente que paga a 90 abre un hueco de 60 días por ciclo.
3. Definir el **tamaño máximo de contrato** que la caja disponible más la línea de factoring soportan, y no
   aceptar uno mayor aunque se gane. Ganar un contrato que no se puede financiar es peor que perderlo.
4. Pedir anticipo o hito inicial en el primer contrato de cada cuenta.

Esta sección es la que Finance debe revisar antes que cualquier otra de todo el cuerpo documental de la línea.

---

## 6. Cómo se ve la oferta al cliente en cada fase

Igual en las tres. Es el punto.

| Lo que el cliente ve | Fase 1 | Fase 2 | Fase 3 |
|---|---|---|---|
| Un responsable único | Sí | Sí | Sí |
| Diagnóstico, auditoría, remediación, activación, producción | Sí | Sí | Sí |
| Conexión con su inversión digital | Sí | Sí | Sí |
| Reporte y decisión | Sí | Sí | Sí + histórico propietario |
| Quién ejecuta cada capa | Mix gobernado | Mix con capas propias | Mayoría propia |

El cliente nunca compra "la fase". Compra el resultado.

---

## 7. Decisiones que este roadmap cierra y las que deja abiertas

**Cierra:**

| Decisión | Resolución |
|---|---|
| D3 · red propia vs partner | **Partner en fase 1**, internalización evaluada en fase 2 con los tres criterios |
| D4 · plataforma | **No se construye hasta fase 3**, con los cuatro gates |
| D6 · escalón de terreno | **Se ofrece desde fase 1** vía proveedor gobernado con back-to-back |
| D7 · producción física | **Efeonce responde por ella y la gobierna; no la ejecuta**, en ninguna fase |

**Deja abiertas:**

| # | Decisión | Quién |
|---|---|---|
| ~~D1~~ | **Resuelta 2026-09-10:** owner interino de la línea = Julio Reyes. Revisar cuando la fase 1 tenga dos cuentas operando | Leadership |
| ~~D8~~ | **Resuelta 2026-09-10:** capital asignado CLP 40.000.000. Modelo, asignación y topes por contrato en [`CHANNEL_COMMERCE_CAPITAL_AND_CASH_MODEL_V1`](CHANNEL_COMMERCE_CAPITAL_AND_CASH_MODEL_V1.md); pendiente validación de Finance y confirmación de líneas de factoring | Julio Reyes + Finance |
| D9 | Con qué proveedores se firma back-to-back en cada capa — estructura y candidatos en [`CHANNEL_COMMERCE_SUPPLIER_REGISTRY_V1`](CHANNEL_COMMERCE_SUPPLIER_REGISTRY_V1.md) | Julio Reyes + Legal |
| D10 | Si la fase 2 arranca por field leads o por captura | Operations + Finance, con los datos de fase 1 |

---

## 8. Lo que hay que vigilar en cada fase

| Fase | La señal de que algo va mal |
|---|---|
| 1 | El margen real por capa es menor que el modelado, o un proveedor falla sin penalidad exigible |
| 1 | Se cierra un contrato mayor al que la caja soporta |
| 2 | Se internaliza una capa que no cumple las tres condiciones, y aparece costo fijo sin data ni control |
| 2 | La capacidad propia queda ociosa entre picos porque no se combinó auditoría con activación |
| 3 | Se empieza a construir plataforma con los gates incompletos, o para igualar a un competidor en vez de por una capacidad propia |
