# Pibank · partir de la meta hacia atrás

06-10-2026. Análisis interno solicitado por Julio. **Calcula los requisitos para llegar a una meta; no pronostica que el programa los alcanzará.** Los PDFs/XLSX anteriores conservan sus versiones. Este análisis incorpora el 100% del objetivo monetario, que el último workbook sólo exploraba mediante bandas de cuentas.

## 1. La primera decisión cambia todo el cálculo

Usamos provisionalmente **US$38 millones** y **US$2.500 por cuenta**, interpretación autorizada por el operador y coherente con 15.200 × 2.500. Moneda y período siguen sin confirmación bancaria. Para comparar escala usamos doce meses de planificación; no asignamos retroactivamente 2027 a la meta declarada en la reunión.

Si el objetivo monetario representa primeros depósitos acumulados de nuevas cuentas, hacen falta **15.200 cuentas con depósito**. No bastan 15.200 aperturas si una fracción queda sin dinero. Con la hipótesis de fondeo 65%, 15.200 aperturas producirían 9.880 cuentas con depósito y US$24,7 millones de depósitos iniciales, sin valorar retiros ni dinero interno.

Si US$38m representa saldo a una fecha, el ticket debe ser saldo por cuenta a esa misma fecha. Un ticket de primer depósito no puede sustituirlo. Si además la meta exige dinero externo neto al grupo, hay que separar migraciones internas. Estas alternativas permanecen escenarios de interpretación, no definiciones confirmadas.

## 2. Funnel desde el objetivo monetario

Primera hipótesis de trabajo: US$38m de primeros depósitos, ticket US$2.500, visita elegible→apertura 2%, apertura→primer depósito 65%. Las tasas son pruebas sin datos bancarios; no benchmarks. Todos los resultados son incrementales **sólo si se contrasta una referencia y se demuestra esa condición**.

```text
Meta monetaria / ticket = cuentas con depósito necesarias
Cuentas con depósito / tasa de fondeo = aperturas necesarias
Aperturas / tasa de apertura = visitas elegibles necesarias
```

| Parte de la meta explorada | Depósitos iniciales requeridos | Cuentas con depósito | Aperturas necesarias | Visitas elegibles necesarias |
|---|---:|---:|---:|---:|
| 100% | US$38.000.000 | 15.200 | 23.385 | 1.169.231 |
| 10% | US$3.800.000 | 1.520 | 2.339 | 116.924 |
| 5% | US$1.900.000 | 760 | 1.170 | 58.462 |
| 1% | US$380.000 | 152 | 234 | 11.693 |

Conteos necesarios redondeados hacia arriba sólo para presentación; el cálculo conserva valores exactos. Cada cuenta abierta debe completarse y cada fondeo ocurrir dentro de la ventana escogida. La hipótesis simple permite fondeo sin demora; el workbook existente modela lag y fondeo posterior por separado. Promedios mensuales equivalentes no son una rampa SEO: 100% exige ~97.436 visitas/mes; 5% exige ~4.872/mes si se distribuyera en doce meses. Si el canal madura después, la carga requerida de los meses posteriores aumenta.

**Corrección respecto de la banda anterior:** 760 *aperturas* requerían 38.000 visitas a 2% y daban 494 fondeadas a 65%. El 5% de US$38m requiere 760 *fondeadas*, unas 1.170 aperturas y 58.462 visitas. Ambas cadenas son correctas para objetivos diferentes; la segunda responde al objetivo monetario bajo la interpretación de primeros depósitos.

## 3. Qué palancas reducen el requisito

| Visita elegible→apertura de prueba | Visitas para 100% de US$38m | Visitas para 5% de US$38m |
|---|---:|---:|
| 1% | 2.338.462 | 116.924 |
| 2% | 1.169.231 | 58.462 |
| 4% | 584.616 | 29.231 |

Se mantiene fondeo de prueba 65%. Duplicar conversión reduce a la mitad las visitas requeridas; no demuestra que podamos duplicarla. Tampoco es lícito elegir la tasa que hace encajar la oferta. Mejorar el ticket reduce el número de cuentas necesario para una meta monetaria, pero no satisface una meta independiente de 15.200 cuentas: sería cambiar el objetivo comercial.

Para saldo de corte, usando el ticket como **depósito inicial**, una sensibilidad agregada da:

- Retención de saldo 100% y origen externo 100%: 1,169m visitas para US$38m.
- Retención 80% y origen externo 100%: 1,462m visitas.
- Retención 80% y origen externo 70%: 2,088m visitas.

Son pruebas, sin curva de edad ni saldos diarios. El factor de retención agregado debe sustituirse por cohortes reales antes de una proyección. Si ticket ya es saldo medio mantenido, **no volver a multiplicarlo por retención**. Los depósitos/saldos no son utilidad bancaria ni justifican solos el fee; la valoración neta pertenece a Finance del banco.

## 4. La prueba de demanda: partir de la meta no crea audiencia

El panel previo contiene **3.690 búsquedas estimadas/mes** de cinco representantes, con solapamiento residual. En doce meses equivaldría a 44.280 búsquedas proxy; con elegibilidad hipotética 75%, 33.210. No son visitas, personas únicas, mercado total ni una proyección del sitio.

La exigencia de 58.462 visitas para 5% es **1,76 veces esa canasta elegible**. Incluso esa comparación no mide la oportunidad completa: muestra que dicho panel no basta para sostener ese requisito. Las 32 familias de la nueva auditoría amplían cobertura, pero no deben sumarse automáticamente; marca propia y demanda actual siguen desconocidas. No concluir que todo el mercado es inviable, ni que todo el volumen rival se puede captar.

Si todo ese 5% procediera de visitas orgánicas nuevas y probáramos una captura efectiva de 10% de búsquedas elegibles, harían falta ~584.616 búsquedas elegibles/año. Dividir además por elegibilidad 75% exige ~779.488 búsquedas brutas proxy/año: **~64.958 por mes**. La captura efectiva no es CTR medido: incorpora exposición/ranking/clic y no se vuelve a multiplicar por otro CTR. Estos volúmenes son requisitos, no demanda observada ni garantía de clic.

Google distingue búsquedas observadas como consultas, impresiones del sitio, clics y CTR. La validación del canal requiere sus propios datos de exposición y clic; no reemplazar visitas por el volumen estimado del proveedor. [Definiciones oficiales de Search Console](https://support.google.com/webmasters/answer/7576553?hl=es), consultadas 06-10-2026.

## 5. El caso comercial debe cubrir tres mecanismos

1. **Personas nuevas por búsqueda.** Aportar visitas elegibles adicionales y convertirlas en aperturas y fondeo. Se valida demanda por decisión/producto, alcance capturable y maduración; los contenidos se eligen desde la brecha que exige la meta.
2. **Mejor decisión sobre tráfico que el banco ya genera.** Mejorar claridad, condiciones, confianza y continuidad. Ejercicio: por cada 10.000 visitas elegibles de referencia, pasar apertura de 2% a 3% implicaría 100 aperturas adicionales y 65 fondeadas si permanece 65% de fondeo. Eso equivaldría a US$162.500 de primeros depósitos al ticket de prueba. No sabemos si ese volumen ni lift existen.
3. **Activar cuentas abiertas sin depósito.** Explicar primer fondeo y resolver fricciones junto a Onboarding/TI. Ejercicio: en 10.000 aperturas de referencia, pasar fondeo de 65% a 75% implicaría 1.000 fondeadas adicionales y US$2,5m de primeros depósitos. No es evidencia de efecto de contenido ni un compromiso de Efeonce sobre sistemas bancarios.

**No sumar estos ejemplos como forecast.** Las visitas nuevas no pertenecen al tráfico de referencia; las aperturas de referencia excluyen las incrementales del punto 1/2. Fondeo adicional sobre referencia se calcula sobre cuentas distintas de las ya contadas. Retención agrega saldo/tiempo, no otra cuenta. AEO participa donde se observe tráfico o asistencia; una cita no genera por fórmula otro cliente. Para monetizar, usar un único resultado reconciliado por cuenta/cohorte y una referencia comparable.

## 6. Recomendación

**Usar la meta monetaria para dimensionar la propuesta y fijar responsabilidades.** Primero mostrar la cadena completa del banco; después elegir una contribución de canal económicamente significativa, contrastarla con demanda y tráfico elegible, y dimensionar el alcance que pueda sostenerla. No elegir 1/5/10% por conveniencia ni tratar doce meses/24 FAQ como una cuota de resultados.

El 5% sirve aquí como ejemplo de escala, **no como recomendación de meta viable**. La investigación actual no demuestra que 58.462 visitas nuevas sean alcanzables. Un caso más amplio puede incorporar conversión y activación sobre tráfico de otros canales, con responsables del banco y medición acordada; esos aportes no se atribuyen íntegramente a SEO ni se duplican.

La propuesta técnica actual permite preparar estas intervenciones. Su alcance fijo se debe contrastar con el resultado requerido y la carga del banco; si no sostiene el objetivo, reestimar trabajo/canales o contribución. El retorno se decide con costo/fee y valor neto por cuenta/saldo comparables, no con US$38m como ingresos.

Este enfoque permite negociar **una meta y un camino para llegar**, con condiciones de ejecución y revisión. Para convertirlo en forecast se necesita el contraste de capacidad/captura/embudo y un escenario de maduración; invertir las divisiones por sí solo no aporta esa evidencia. La preparación avanza sin un nuevo discovery obligatorio; los supuestos se hacen visibles y reemplazables.

## Evidencia reproducible

[Resultados](resultados.json) · [cálculo](analizar.py) · [inputs previos](../economia/inputs.json) · [cobertura](../OPORTUNIDAD-Y-COBERTURA.md). Siete identidades aritméticas verificadas; ningún redondeo realimentado. No hay nuevas llamadas pagadas, cambios de tarifas, envío, actualización CRM/Notion ni modificación de PDFs/XLSX cliente.
