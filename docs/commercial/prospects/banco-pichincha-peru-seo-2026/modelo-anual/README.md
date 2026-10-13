# Modelo anual de caso de negocio Pibank — 2027

Estado: preparación interna al 6 de octubre de 2026. Programa propuesto de doce meses, con calendario ilustrativo enero–diciembre de 2027. No es una proyección validada por Banco Pichincha ni una oferta aprobada. La versión anterior de seis meses permanece intacta en `../modelo/`.

## Archivos y uso

- `Pibank-caso-negocio-anual-2027.xlsx`: workbook editable y recalculado; abrir en Excel o LibreOffice. El selector único está en **Supuestos D4** (1 conservador, 2 base, 3 favorable). Los inputs editables son azules sobre amarillo; las referencias entre hojas son verdes.
- `inputs.json`: inputs reproducibles y naturaleza de cada supuesto. `build_model.py` genera el XLSX, recalcula con LibreOffice y emite `results.json`.
- `source-demand.json`: snapshot normalizado de investigación ampliada, con IDs, archivos de origen, historia mensual, carriles y SHA-256 del dataset fuente. La hoja Historia permanece separada del forecast.
- `validate_model.py` y `validation.json`: verificación independiente de fórmulas, cachés, controles y cohortes mediante LibreOffice; no importa el generador ni sustituye la inspección visual del archivo final.
- `delivery-manifest.json`: hashes de las copias revisadas, después de completar QA.

Ejecutar desde cualquier directorio con el Python incluido en Codex:

```sh
/Users/jreye/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/jreye/Documents/greenhouse-eo/docs/commercial/prospects/banco-pichincha-peru-seo-2026/modelo-anual/build_model.py --no-copy
/Users/jreye/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/jreye/Documents/greenhouse-eo/docs/commercial/prospects/banco-pichincha-peru-seo-2026/modelo-anual/validate_model.py
```

El generador sin `--no-copy` copia a la carpeta de entrega autorizada. Una edición del XLSX permite explorar libremente; para reproducirla también debe trasladarse a `inputs.json`. Regenerar reemplaza el XLSX con esos inputs. El libro mantiene recálculo automático. Las cachés entregadas se calcularon con LibreOffice; no se operó Excel Desktop.

## Demanda observada y límites

La fuente es `../research/pibank-expanded-2026-10-06/monthly-demand-inputs.json`, DataForSEO PE/es, al 6 de octubre. El panel manual de adquisición directa contiene cinco representantes y suma **3.690 búsquedas estimadas mensuales** como proxy de trabajo. La investigación tiene mayor cobertura que este panel; no debe sumarse el universo de variantes ni marcas competidoras para fabricar demanda adquirible. La agrupación utiliza familias del proveedor y elección de representantes según intención y producto, con solapamiento residual entre ellos.

Los carriles **condicional (1.690/mes)**, **educación asistida (4.070/mes)** y **producto futuro USD (480/mes)** figuran como evidencia separada; no se convierten ni suman al funnel actual. Ampliar el panel exige revisar intención, producto y solapamiento, y editar explícitamente los drivers. No hay baseline actual de marca, GSC, aperturas, fondeo ni conversiones observadas de Pibank. Una cita de IA no equivale a una visita o conversión adicional.

La serie de la misma canasta directa va de septiembre de 2025 a agosto de 2026, con media **4.015/mes**, distinta del bucket promedio de 3.690. Historia conserva los doce valores por mes calendario. El modo inicial **Plano** usa factor 1 como hipótesis neutral; **Historia** aplica el patrón pasado normalizado a media 1 como sensibilidad para 2027. Ninguno es forecast bancario, ni multiplica crecimiento por dos automáticamente. El crecimiento inicial 1,00 tampoco afirma que la demanda permanecerá constante.

## Dos trayectorias y cohortes

Cada mes calcula demanda del panel × patrón × crecimiento × relevancia/eligibilidad; después captura de referencia y captura adicional del programa, visitas, aperturas y cuentas potencialmente fondeadas. El diferencial es programa menos referencia. Las dos capturas y todas las tasas del funnel son hipótesis ilustrativas; la referencia no demuestra pérdidas históricas. Los escenarios usan una rampa anual creciente para probar requisitos y sensibilidad, no estimaciones de probabilidad ni promesas de captura. La rampa favorable de hasta 45% adicional es deliberadamente exigente y carece de respaldo de analytics del banco.

El primer fondeo se fecha con un **lag mensual editable** y un **día supuesto 1–28** (inicialmente 15). Las cuentas cuyo primer fondeo cae después de diciembre de 2027 se muestran como programadas fuera del horizonte: no suman cuentas fondeadas, depósito inicial, saldo ni valor de 2027. Los conteos fraccionarios representan expectativas aritméticas; no son personas observadas ni objetivos comerciales redondeados.

La hoja Cohortes conserva el origen externo del mes de apertura durante toda la vida de cada cohorte. Cambiar el origen de diciembre no repondera dinero anterior. El dinero trasladado internamente no es fondeo externo nuevo para el grupo. Las retenciones de saldo por cuenta original contienen retiros y abandono; no se añade otro multiplicador de supervivencia. Se interpola linealmente por edad real en días entre 0/30/60/90/180/365. El hito 365 días se muestra fuera de 2027 cuando corresponde; ese supuesto sirve para interpolar dentro del año y no contabiliza ingresos futuros.

El saldo medio mensual aproxima la media entre cierres consecutivos. En el primer mes parte del depósito inicial y del cierre, ponderados por días activos. Esta aproximación trapezoidal no reemplaza saldos diarios del banco ni modela movimientos intra mes, depósitos adicionales, remuneración compuesta o FX. Las cifras de ticket y saldo son **USD equivalentes provisionales**: el producto público examinado es Cuenta Soles y no se inventa una cuenta USD disponible.

## Valor, inversión y escala

La inferencia **15.200 × US$2.500 = US$38 millones** procede de la reunión y del supuesto del operador; no es un objetivo bancario confirmado. Autorizar un programa anual no confirma la anualidad o definición de esa meta. Las bandas 1/5/10% son comparaciones aritméticas para revisar tamaño, no cuotas prometidas. En el caso base ilustrativo resultan 50,37 primeras cuentas fondeadas en 2027, aproximadamente 0,331% de esa meta provisional; el modelo no fuerza un ROI positivo.

**Inversión cliente**, **coste interno Efeonce** y **valor económico del banco** son inputs separados. La inversión mensual está vacía y CAC continúa N/D hasta inversión completa y validada. ROI y payback requieren además validación de Finance y una tasa neta anual por USD de saldo medio externo, calculada con un único método: no sumar FTP y ahorro de fondeo si remuneran el mismo beneficio. La tasa anual se divide por doce y se aplica a cada saldo medio mensual externo dentro del año. Una cohorte de diciembre no recibe doce meses de valor.

La sensibilidad de inversión total de US$10.000/25.000/50.000 es un experimento independiente para mostrar el valor mínimo requerido por cuenta; no es tarifa, presupuesto u oferta. Cero es un dato explícito y no sustituye a un input ausente. El equilibrio por cuenta no demuestra que el banco tenga ese valor neto.

Capacidad anual: **2.560 horas base + 336 de reserva = 2.896 horas**, según `../propuesta-anual/CAPACIDAD-Y-COSTEO-INTERNO.md`. Es estimación de planificación por roles y entregables, con Operations/Finance pendientes; no roster, coste monetario, fee o capacidad aprobada.

## Programa y próximos refinamientos

M1 valida accesos, datos, medición y delivery. No funciona como piloto ni juicio temprano sobre viabilidad SEO. M3/6/9/12 revisan prioridades, implementación y optimización del programa completo; no prometen ROI a tres meses. La caracterización técnica y ejecución no garantizan rankings ni citas de IA.

Para refinar sin bloquear la preparación: confirmar definición y periodo de meta; sustituir la referencia por GSC/analytics; conectar aperturas, primer fondeo y cohortes a datos bancarios; medir elegibilidad y captura por carril; validar ticket/moneda, origen externo y saldos diarios; acordar inversión y método neto con Finance. Los datos privados son opcionales para mejorar precisión y no se publican como reglas generales.

## Verificación

El validador contrasta las cachés del XLSX con cálculo independiente: los tres escenarios, trayectorias, diciembre, fondeo después del horizonte con lag 1/2/12, hitos de maduración, origen por cohorte, día de fondeo, estacionalidad, datos ausentes y ceros, sensibilidad y gates Finance. El registro definitivo y SHA están en `validation.json`. La QA visual utiliza PDF exportado por LibreOffice del XLSX real; verifica resumen, tablas mensuales, inputs, cohortes y ledger. Esto no certifica aprobación comercial ni operación en Excel Desktop.
