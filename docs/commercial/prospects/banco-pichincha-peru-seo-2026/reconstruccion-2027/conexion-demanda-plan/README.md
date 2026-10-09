# Pibank · Conexión entre demanda, ejecución y costo

**Capacidad editorial vigente:** hasta cinco artículos al mes incluidos en base US$4.500; máximo 60 al año, sin suplemento editorial. Las 24 piezas del plan anterior son backlog inicial. Ruta gradual US$79.200/año; integral US$89.200. Mayor capacidad no modifica automáticamente la demanda ni la captación proyectada. [Oferta y calendario actual](../oferta-hibrida/README.md).

**Actualización comercial:** [base US$4.500/mes + capacidades a demanda](../oferta-hibrida/OFERTA-PARA-PIBANK.md) sustituye el fee fijo de US$8.000 indicado como antecedente más abajo. Los cálculos de búsquedas y embudo de este anexo permanecen intactos. Usar el [selector híbrido](../oferta-hibrida/Pibank-Oferta-hibrida.xlsx) para presupuesto vigente; el Excel de conexión conserva la comparación integral anterior.

07-10-2026 · Anexo interno de planificación para Julio y preparación del deck.

**La base se conserva:** meta de 15.200 cuentas con fondos, ticket de referencia US$2.500 y equivalencia US$38 millones. Con las tasas existentes de 2% visita→apertura y 65% apertura→fondeo, el requisito permanece en **1.169.231 visitas**. Doce meses es el horizonte del programa; el periodo bancario y la interpretación monetaria se formalizan con el banco. No se vuelve a abrir la interpretación de «cuenta» como mero registro.

Este anexo conecta investigación ya hecha con recursos, calendario, escenarios de captación y costo. Los archivos originales de investigación, calendario y modelo permanecen intactos, con sus hashes en [fuentes preservadas](fuentes-preservadas.json). El borrador de recálculo v0.8 retirado no es una fuente de este anexo.

## 1. De las búsquedas ya calculadas al trabajo

| Familias del panel existente | Volumen mensual de representantes | Acción |
|---|---:|---|
| Seis directas | 3.740 | Pilar, requisitos, intereses, costos y comparación |
| Cuatro condicionales | 3.330 | Ahorro digital/rendimiento y elección según encaje |
| Cinco de productos rivales | 18.300 | Comparativas y alternativas de BCP, Interbank, Scotiabank y BBVA |
| Cuatro educativas/asistidas | 5.680 | TREA, respaldo, definición y hábitos de ahorro |

Son exactamente los representantes y volúmenes del [panel ya investigado](../../research/pibank-gap-closure-2026-10-06/plan-busquedas.csv). No se suman sus variantes ni se sustituyen por nuevas consultas. Las cuatro filas no representan audiencias disjuntas o un censo de mercado.

**Las búsquedas de cuentas de otros bancos son oportunidades de consideración.** No se les aplica una exclusión ni un porcentaje de reducción por ser de otra marca. La propuesta debe responder a la decisión real: rendimiento bajo condiciones comparables, disponibilidad, costos, requisitos y diferencia entre una cuenta para ahorrar y una para pagos. Producto/Cumplimiento valida fuentes, marcas y afirmaciones antes de publicación; esa revisión no elimina el frente del plan. Las búsquedas puramente operativas de acceso se trabajan por su función de asistencia cuando corresponda, sin equipararlas a intención de apertura.

[Conexión de las 19 familias](conexion-familias.csv): cada fila conserva fuente, fecha, posición observada y variantes, y añade activo, mes, acción, siguiente paso, responsable y medición. [Producción y oportunidades](produccion-y-oportunidades.csv) enlaza los 24 artículos; un artículo de apoyo sin volumen propio no recibe tráfico inventado.

## 2. Qué tráfico podría aportar cada grupo y cómo evoluciona

La hoja `Familias` del [anexo Excel](Pibank-Conexion-demanda-plan-costeo.xlsx) mantiene los volúmenes de fuente. `Trafico por mes` conecta cada familia con su recurso y mes de publicación previsto. `Aporte por familia` permite inspeccionar el detalle anual. Las hipótesis nuevas están en `Supuestos`, separadas del dato investigado.

```text
tráfico de prueba de una familia en un mes
  = volumen mensual de fuente × captura efectiva supuesta × madurez desde recurso listo
aperturas de prueba = tráfico de prueba × 2%
cuentas con fondos de prueba = aperturas de prueba × 65%
```

La captura efectiva reúne exposición, posición y clic en una única hipótesis; no se vuelve a multiplicar por otro CTR ni se descuenta marca rival. Se prueban 2%, 5% y 10% de captura madura. La progresión por edad del recurso es 10%, 20%, 35%, 50%, 65%, 80% y 100% de esa captura. **Estos porcentajes son sensibilidades propuestas, no rankings, CTR medidos ni benchmarks.** El calendario original se conserva. Igual que en los inputs originales, el fondeo usa lag cero; es una simplificación que debe sustituirse por cohortes bancarias antes de comprometer un resultado anual.

| Sensibilidad del panel y calendario existentes | Visitas equivalentes en el año | Aperturas de prueba | Cuentas con fondos de prueba |
|---|---:|---:|---:|
| Captura madura 2% | 2.993,2 | 59,86 | 38,91 |
| Captura madura 5% | 7.483,0 | 149,66 | 97,28 |
| Captura madura 10% | 14.966,0 | 299,32 | 194,56 |

**Esta tabla sirve para revisar supuestos del panel; no se presenta como proyección del programa completo.** La suma es aritmética y conserva solapamiento residual de familias; no son personas únicas ni incrementalidad comprobada. La tasa del embudo se está probando sobre las visitas del panel, sin evidencia aún de que todas las intenciones conviertan igual. No permite fijar el aporte comercial final. No equivale a concluir que todo el SEO/AEO, PR, comunidad y conversión sólo puede producir esas cuentas.

Para pasar de sensibilidad a estimación sustentada, el especialista sustituye captura y curva por consultas/URL observadas en GSC y sesiones analíticas, documenta cambios de cobertura y contrasta conversiones por población. No usar la misma tasa media para ocultar diferencias entre comparación y educación. Conservar por separado datos, hipótesis y resultado; cada revisión deja fecha y razón.

## 3. Los 24 briefs como backlog inicial

**Mantenerlos como backlog inicial; la capacidad vigente es de hasta cinco artículos/mes y no prueba suficiencia para la meta.** El pilar, la calculadora, el comparador y los artículos cubren conjuntamente las 19 familias. Varios temas pueden resolverse en una sola URL útil; otros artículos atienden conversión, confianza o mantenimiento. Publicar más piezas no multiplica automáticamente la demanda.

La principal mejora de secuencia es adelantar las cuatro comparativas. La matriz ofrece una alternativa manteniendo dos artículos por mes y 24 al año: Interbank M3, BCP M4, Scotiabank M5 y BBVA M6. Intercambia sus slots con contenidos de apoyo; el calendario original M5/M6/M7/M8 permanece como referencia. [Sensibilidad del cambio de secuencia](sensibilidad-prioridad-calendario.csv) aísla el efecto del tiempo, usando los mismos volúmenes y la misma captura. Adelantar exige revisión de fuentes y aprobación de comparabilidad a tiempo; no declara publicaciones realizadas.

Reglas de capacidad propuestas para las revisiones mensuales:

- Si una familia prioritaria carece de destino, se reasigna el siguiente slot antes de agregar piezas.
- Si una URL tiene al menos 60 días desde indexación y acumula impresiones, revisar relevancia, presentación, enlaces y avance a producto antes de crear una URL equivalente. Sesenta días es una ventana de revisión operativa, no un plazo prometido de posicionamiento.
- Si hay cuatro o más briefs de intención distinta, con evidencia del corpus existente y revisión bancaria disponible, presupuestar un lote adicional. Cada artículo requiere inicialmente 12h de redacción, 3h de revisión y 1h de carga, más el QA/SEO que el lote necesite; no se aprueba producción ilimitada por el fee.
- Si el cuello de botella es registro o primer depósito, priorizar esa fricción con el banco. Aumentar artículos no corrige ese cuello de botella.

## 4. Contribución del programa: cuatro mecanismos que se concilian

| Mecanismo | Acción concreta | Resultado y forma de contar |
|---|---|---|
| Captación por búsquedas genéricas y rivales | Pilar, comparativas, satélites y tools; enlaces y distribución | Visitas y cuentas de esas cohortes, contabilizadas una vez |
| Conversión de tráfico que el banco ya recibe | Claridad móvil, requisitos, CTA, confianza y continuidad al registro | Diferencia frente a referencia comparable; no volver a sumar todas las cuentas del canal |
| Primer fondeo | Guía de transferencias, dudas frecuentes, continuidad y comunicaciones bancarias | Primer depósito de la misma cohorte; cuentas preexistentes activadas se reportan aparte |
| PR, AEO y comunidad | Ruta gradual: dos campañas, dos refuerzos, diez newsletters y escucha; integral detallada en oferta-hibrida | Referencias, retornos y asistencias observadas; sin convertir citas o audiencia editorial en visitas por fórmula |

Ejemplo con tasas explícitas, manteniendo el cálculo original como referencia: por cada **10.000 visitas existentes**, 2% de apertura y 65% de fondeo producen 130 cuentas con fondos. Si se alcanzaran 3% y 75%, serían 225: diferencia de 95. Es sensibilidad sobre una población hipotética, no tráfico bancario observado ni mejora causal acreditada. No sumar por separado las mejoras de apertura y fondeo a la diferencia conjunta. [Detalle](conversion-trafico-existente.csv).

La referencia de 1,17 millones corresponde al embudo completo. El programa busca ganar demanda nueva y mejorar el aprovechamiento de llegadas que ya generan otras acciones. Los resultados de SEM entran a la conciliación del banco; internamente se mantiene que Efeonce aporta análisis/recomendaciones de eficiencia y no opera campañas. En la narrativa cliente, explicar destinos, aprendizaje y eficiencia sin convertir esto en una lámina de exclusiones.

## 5. Responsabilidades y criterio de avance

| Trabajo | Efeonce | Banco / equipo habilitado | Evidencia de aceptación |
|---|---|---|---|
| Pilar, hub y herramientas | Especificación, diseño, desarrollo/QA y contenido del alcance | TI habilita entorno/release; Producto valida condiciones | URL implementada, cálculos probados, móvil y eventos verificados |
| Comparaciones | Fuentes, método, diferencias relevantes y mantenimiento | Producto/Cumplimiento revisa comparabilidad y claims | Fuentes fechadas, revisión registrada y destino publicado |
| Registro y depósito | Diagnóstico, diseño de hipótesis y QA de continuidad web | Dueño de onboarding/core implementa y decide comunicaciones | Cambio implementado y tasa por cohorte comparable |
| Medición | Diccionario, instrumentación web y conciliación agregada | Analítica entrega eventos agregados y definición bancaria | Aperturas y primer fondeo conciliados con total del banco |
| PR y comunidad | Recursos, guiones, gestión y moderación del alcance | Comunicaciones valida vocero/mensajes/canales | Gestiones, referencias y participación verificables |
| Eficiencia SEO–SEM | Recomendaciones de intención y destinos | Marketing evalúa/aplica y comparte resultados autorizados | Cambio, periodo y población comparables documentados |

Antes del inicio, el banco identifica una persona por función y acuerda un plazo de revisión propuesto de cinco días hábiles. La demora desplaza el hito dependiente; no convierte una pieza pendiente de aprobación en entregada. No se han asignado nombres ni accesos sin confirmación.

Datos mínimos para cerrar un aporte global: mes/cohorte, canal y landing; sesiones elegibles; aperturas validadas; primer depósito por ventana; saldo/ticket según definición y maduración; cambios simultáneos de producto, campañas y onboarding. Preferir agregados, sin datos personales para este caso. Dueños: Analítica + Marketing + Producto del banco. Efeonce entrega el diccionario y concilia una sola vez el resultado. El banco confirma periodo y referencia monetaria; no se reinterpreta «con fondos» como registro.

## 6. Antecedente histórico de capacidad y costo — sustituido por oferta híbrida

**La recomendación histórica era evaluar US$8.000 mensuales durante doce meses para el alcance integrado definido, antes de impuestos que correspondan.** Es un fee de programa, con implementación de hub/tools distribuida en el año; no se suma un setup duplicado. Propuesta para revisión interna, no oferta económica aprobada ni enviada.

Costeo basado en trabajo: **2.216h base + 332,4h de reserva = 2.548,4h anuales**. Reemplaza el dimensionamiento de alcance cuando se evalúa esta ampliación; no se suma a las 1.216h del Excel histórico. [Trabajo por mes](capacidad-por-mes.csv), [asignación](asignacion-equipo.csv) y [costeo](costeo-interno.csv).

| Equipo principal | Costo mensual indicado por Julio | Asignación candidata | Horas base anuales requeridas |
|---|---:|---:|---:|
| Redacción / revisión editorial | US$600–900 | 50% | 520 |
| Diseño / experiencia | US$950–1.200 | 30% | 152 |
| Especialista SEO, analítica y CRO web | ~US$1.500 | 100% del costo de contratación reservado | 512 |

La asignación propuesta supone 160h pagadas/mes y 75% de disponibilidad productiva. La prueba mensual cubre el trabajo con reserva; no confirma disponibilidad real o competencias. El perfil SEO debe cubrir medición y experimentación de este plan; si requiere especialistas adicionales se recalcula el presupuesto antes de comprometer alcance. El diseñador debe cubrir UX de herramientas o recibir apoyo presupuestado. Valentina y los dos diseñadores existentes son una opción de asignación; no se declara su agenda disponible.

Se costean además **WordPress, desarrollo y QA de herramientas, PR, comunidad, producción ligera de sesiones, automatización, dirección y coordinación**, con horas propias. Sus tarifas toman el catálogo interno como referencia provisional y prueban multiplicadores 1/1,25/1,5. No son cotizaciones de terceros ni roles ya asignados. Para los tres costos dados por Julio se agrega una provisión de 20% por cargas; se usa reserva laboral de 15% y herramientas/otros de US$200/300/500 mensuales. Cargas, reserva y tarifas se validan con Finance; no duplicar costos ya incluidos al reemplazarlos por costos reales.

| Escenario de costo interno | Costo mensual equivalente | Margen bruto al fee US$8.000 |
|---|---:|---:|
| Bajo | US$4.085 | 48,9% |
| Central | US$4.592 | 42,6% |
| Alto | US$5.200 | 35,0% |

Fórmula: margen = (fee − costo) / fee. A margen objetivo 40%, el costo central requiere ~US$7.654/mes; por eso se propone US$8.000. El escenario alto requiere ~US$8.666 para conservar 40%; si las cotizaciones se acercan a ese costo hay que revisar fee o alcance. No tratar el fee propuesto como un techo incondicional.

**Caja y costo económico:** si redacción y diseño ya están contratados y tienen capacidad, la contratación adicional por esos puestos puede ser cero, pero el proyecto consume su tiempo. El costo económico incluye esa asignación. Reservamos el costo completo del SEO; no suponemos clientes adicionales que financien su contratación. Herramientas, producción especial, viajes, medios pagados o incentivos no quedan cubiertos sin límite por la provisión. PR es gestión editorial con objetivos de cobertura, sin garantía de publicaciones ni compra de enlaces.

Propuesta comercial: fee fijo mensual por alcance/cadencia anual, factura anticipada mensual como condición a negociar; sin componente por performance ni comisión de pauta. Una ampliación de piezas/tools/canales exige dimensionar y acordar el cambio. Descuentos se evalúan contra costo actualizado y margen, no contra salario aislado. Este archivo no contrata personas, aprueba pagos ni modifica catálogos.

## 7. Qué quedó preparado y qué requiere evidencia externa

Quedan preparados: conexión de las 19 familias, escenarios mensuales/familia, cruce de los 24 artículos, propuesta de prioridad, dimensionamiento completo, responsabilidades y fee con sensibilidad. Permanecen por validar: tasas/captura reales, volumen del banco, aporte incremental global, periodo monetario, personas disponibles y costos fully loaded/terceros. Cada pendiente tiene responsable y efecto explícito; no se inventan para declarar el caso cerrado.

Para Claude: usar [lectura para el deck](PARA-CLAUDE.md) antes de seleccionar números. Preservar el headline de meta completa. No trasladar el cuadro de costos internos ni la sensibilidad parcial como resultado prometido al banco.

Fuentes de oficio consultadas 07-10-2026: [Google, contenido útil](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) para priorizar utilidad, originalidad y confianza; [Google Ads, nivel de calidad](https://support.google.com/google-ads/answer/6167118?hl=es) para separar diagnóstico de resultados económicos. Esas fuentes no validan los porcentajes de captura ni costos de este anexo.

Reproducción local: ejecutar `build.py`, luego `build_excel.py` con Python que incluya xlsxwriter y finalmente `validate.py`. Escriben sólo dentro de esta carpeta; no consultan proveedores ni recalculan el Excel original.
