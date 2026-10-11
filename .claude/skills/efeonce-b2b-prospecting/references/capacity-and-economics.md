# Capacidad y economía de prospección

Cargar para dimensionar inversión/preventa o una cartera ABM. Usar [plantilla](../templates/account-economics.md).
Pricing/Finance poseen tarifas, FX, margen y emisión; este módulo asigna esfuerzo y registra supuestos.
No requiere calcular una oferta para preparar una primera conversación ni modifica gates económicos ICP.

## Reservar esfuerzo sin prometer disponibilidad

Definir ventana y alcance por cuenta/iniciativa: investigación/enrichment, coordinación, contacto autorizado,
discovery, proof/preventa y seguimiento. Para cada owner, registrar horas disponibles confirmadas, compromisos
existentes, horas estimadas y reserva. Un pool total no compensa la falta de un especialista o una semana.
Capacidad aprobada, estimación de demanda y horas efectivamente usadas son estados distintos.

Comprobar por owner y período: `disponible neto = disponible confirmado − compromisos − reserva`.
Entradas nuevas caben cuando su esfuerzo más seguimiento abierto no supera ese neto en ningún recurso
crítico. No descontar seguimiento dos veces si ya figura en compromisos. Separar horas de trabajo y plazo
calendario; una espera de comprador no equivale a trabajo ni libera una plaza que exige atención continua.

Ejemplo sintético, sin defaults: 20 h disponibles; 8 h comprometidas fuera del plan; reserva 2 h;
seguimiento abierto requiere 4 h. Quedan 6 h para nuevas entradas de 3 h cada una: caben dos ese período,
si los demás owners también tienen disponibilidad. Presupuesto de horas no prueba que exista disponibilidad
real; sin confirmación, mantener el plan condicionado y proponer validar el cuello de botella.

Reusar proof reduce esfuerzo sólo con evidencia de reutilización y permiso; no presupuestar cero revisión.
Si se excede capacidad, reducir alcance/entradas, escalonar o posponer y conservar seguimiento acordado.
Definir owner y esfuerzo posterior a la ventana; no abandonar cuentas para cumplir una cuota de nuevas.

## Costos y decisión económica

Cada partida necesita cantidad/unidad, tarifa/costo, moneda, fuente/fecha, estado estimado/aprobado/real y
asignación. Trabajo = horas × tarifa cargada pertinente; no salario crudo ni tarifa de venta. Cotizador V3
usa costos objetivo de catálogo: no presentar su simulación como costo real de nómina. Incluir herramientas
existentes asignadas, créditos previstos/usados, terceros y materiales; evitar doble contar licencias ya
incluidas en una tarifa cargada. Exponer qué cubre la tarifa y el criterio de reparto compartido.

Costo total atribuido y caja incremental responden preguntas distintas. Una licencia ya contratada tiene
costo asignable aunque no genere pago adicional; un crédito comprado puede consumirse en otra ventana.
Separar comprometido, consumido y pendiente; no aplicar importes de otro portal/plan ni asumir créditos gratis.
Sin tarifa o moneda comparable, reportar horas y costo incompleto: el subtotal conocido es un piso, no total.
FX requiere fuente/fecha y owner; no sumar monedas ni Spot, MRR y ARR como unidades equivalentes.

Medir costo por cuenta trabajada y por resultado con ventana/cohorte/denominador. Con cero resultados,
el costo por resultado no está definido: reportar gasto y cero resultados, no costo cero ni tasa inventada.
Preventa es costo de adquisición/expansión asignado; no descontarla dos veces del margen de delivery.
La política vigente de Pricing decide cómo atribuirla y conserva margen del trabajo propio separado del
margen total con terceros. Sin precio/aceptación no afirmar rentabilidad o recuperación de inversión.

Entregar alternativas de esfuerzo, restricciones, datos faltantes y siguiente decisión del operador. Este
cálculo no reserva personas, compra créditos, aprueba presupuesto ni confirma capacidad comercial/delivery.
