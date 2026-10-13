# Pibank · Caso inverso de inversión y contribución

Preparación interna, 6 de octubre de 2026. El workbook plantea **qué debe cumplirse para sostener una inversión**, sin convertir hipótesis de conversión ni un panel limitado en un forecast. El programa propuesto conserva doce meses de 2027; su precio, costo real, disponibilidad y valor bancario siguen pendientes.

## Retirada y diagnóstico

**Los escenarios anteriores 10/50/147 cuentas del modelo anual quedan retirados del uso con cliente (`withdrawn_for_client_use`).** No eran un forecast defendible: combinaban una canasta manual de cinco consultas con tasas y una rampa arbitrarias, mientras se la usaba para discutir un alcance amplio. No establecen cuánto puede aportar todo SEO/AEO, ni justifican por sí solos la capacidad prevista. Se conserva la evidencia anterior intacta en `../../modelo-anual/` y `../../modelo/`; sus hashes se registran en `sources.json` y se verifican en `validation.json`.

La nueva investigación incluye familias completas y mecanismos de conversión/activación/confianza. Eso mejora la cobertura del plan; no permite sumar volúmenes como personas ni fabricar una nueva proyección positiva. El [inventario curado](../oportunidades-curadas.csv) y [análisis de cobertura](../OPORTUNIDAD-Y-COBERTURA.md) tienen 32 familias separadas. La suma de sus representantes no es TAM, demanda elegible o tráfico adquirido.

## Abrir y recalcular

`Pibank-decision-inversion-2027.xlsx` contiene Decision, Supuestos, Requisitos, Cohortes, Economia, Evidencia y Retrolanzamiento. Inputs azules sobre amarillo, referencias entre hojas verdes. Los inputs ausentes propagan **N/D**, sin convertirlos en cero. Las fórmulas y cachés se recalculan con LibreOffice; Excel Desktop no fue operado.

Controles principales en Supuestos:

- **D3:** banda contextual 1/5/10%. **G6:** Aperturas por defecto, o Fondeadas cuando esa sea la definición acordada.
- **D9/D10:** pruebas de conversión visita→apertura y apertura→fondeo. No son benchmarks ni tasas bancarias medidas.
- **D29:** Programa2027 (doce meses) o Retrolanzamiento. **D30/D35:** fecha y meses de ventana retrospectiva, inicialmente desconocidos.
- **D13/D14:** lag a primer fondeo y día supuesto de fondeo. **F34:Q34:** distribución mensual requerida. Los pesos distribuyen un requisito, sin afirmar una rampa de desempeño SEO.
- **F44:Q44:** origen externo de cada cohorte; permanece fijo durante su vida. **D37:D41:** retenciones de saldo hipotéticas por edad real.
- **D16/D17:** validación Finance y tasa neta anual por USD de saldo medio externo, pendiente. **D52:** un único método de valor, sin suma de beneficios duplicados.
- **D53/D54:** horizonte 12/24/36 meses y valor neto por fondeada aprobado por Finance, pendiente. Ese valor debe incluir costos, canibalización y descuento del horizonte comparable.
- **F32:Q32/D19:** inversión mensual y validación del quote, pendientes. **D20:D25:** costeo y margen internos, pendientes; horas candidatas son referencia de alcance, no fee.

```sh
/Users/jreye/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/jreye/Documents/greenhouse-eo/docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/economia/build_model.py --no-copy
/Users/jreye/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/jreye/Documents/greenhouse-eo/docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/economia/validate_model.py
```

Editar el XLSX permite explorar; reproducir una edición requiere trasladarla a `inputs.json`. Regenerar reemplaza el workbook. `results.json` corresponde al modo/inputs entregados, con escenarios de comparación matemática bajo los mismos drivers; no es un forecast independiente. El generador sin `--no-copy` copia a la carpeta de entrega autorizada de reconstrucción.

## Contribución y viabilidad

Las bandas **152 / 760 / 1.520 aperturas** representan 1/5/10% de las 15.200 cuentas mencionadas. No son objetivos acordados del canal. Con prueba de conversión 2%, exigen **7.600 / 38.000 / 76.000 visitas**. Con prueba de primer fondeo 65%, la calidad posterior sería **98,8 / 494 / 988 fondeadas**, si el calendario permite el primer fondeo dentro de la ventana. Si se elige Fondeadas como objetivo, los requisitos de visitas aumentan por esa tasa; el libro conserva la distinción.

La cifra de US$38 millones y el ticket US$2.500 son provisionales en el modelo. Jesús también mencionó S/10.000 como ticket equivalente; no se impone FX ni producto USD. La meta comercial no declaró un periodo 2027 ni definió cuentas fondeadas: el programa anual no cambia retroactivamente esas condiciones.

La contribución requerida debe ser incremental respecto a un contrafactual acordado; no todas las aperturas orgánicas ni multicanal son atribuibles al programa. El libro calcula el valor condicionado a que la banda incremental se logre, sin demostrar esa atribución. Finance debe validar definición, contrafactual y origen junto con el método neto; si el objetivo incluye cuentas que habrían ocurrido igualmente, no utilizar todo su valor como retorno de esta inversión.

El ratio contra el panel de **3.690 búsquedas estimadas/mes** es dependencia respecto a una canasta parcial, con overlap residual y elegibilidad hipotética. **No es penetración de mercado ni TAM.** Si supera 100%, prueba que ese panel no basta para ese requisito; no demuestra que el mercado o la oportunidad sean inviables. El libro no suma automáticamente marca, competencia, digital, educación o producto futuro USD para corregir el ratio.

La capacidad de la base SEO/GEO conservada en este Excel v0.4 es **814 horas base +110 reserva =924**, propuesta bottom-up por raíz, sin roster ni disponibilidad verificados. Se limita a un dominio PE/es, doce entregas sustanciales (máximo seis nuevas y seis sobre activos existentes), 24 FAQ, doce paquetes CMS de hasta ocho horas y panel AEO reducido de 12 preguntas ×3 superficies ×1 réplica. CMS 102h cubre hasta 96h de paquetes y 6h de apoyo/onboarding; se verifica contra el plan de operaciones. Capacidades históricas de 2.044/2.896h quedan cuestionadas como referencias previas, sin usarse como mínimo requerido ni tarifa.

Mayor esfuerzo no produce automáticamente más cuentas. El costo fully loaded real, otros costos, margen autorizado y quote aún son N/D. No se vende la unidad comercial por horas. El modelo compara:

```text
Techo bancario condicionado = valor neto comparable / (1 + retorno mínimo exigido)
Costo interno = horas candidatas × costo real blended/h + otros costos explícitos
Piso comercial condicionado = costo interno / (1 − margen autorizado)
Horas compatibles = max(0, [techo × (1 − margen) − otros costos] / costo real/h)
```

El blended debe ser una media válida por rol, fully loaded según Finance/Operations y sin doble overhead. El modelo no autoriza un margen, precio o compromiso de horas. Si el piso supera el techo, revisar contribución, evidencia, alcance y responsabilidades; no inflar demanda, conversión o valor neto. Costos cero explícitos son distintos de inputs ausentes; costo/h cero no permite declarar capacidad ilimitada y la división de capacidad queda N/D.

## Valor y horizontes separados

**Saldo y depósito bruto no son beneficio.** Un método autorizado valora el saldo medio externo mensual × tasa anual neta /12 sólo dentro de la ventana. Se interpola retención por días entre 0/30/60/90/180/365. El promedio mensual aproxima extremos y pondera días activos del primer mes; no reemplaza saldos diarios reales. La cuenta de diciembre no recibe doce meses de valor en 2027. Fondeos posteriores a la ventana se muestran separados y no contribuyen a su saldo o valor.

**Servicio de doce meses y horizonte de valor 24/36 meses son distintos.** Para estos horizontes el libro permite el método alternativo de valor neto por fondeada aprobado por Finance. No proyecta automáticamente tres años de saldos, tasa plana, ingresos o cashflow. Mientras el banco no aporte ese valor comparable, queda N/D. Ese método no calcula ROI/payback dentro del año porque la distribución temporal de beneficios futuros sigue desconocida. El método por saldo sólo valora la ventana activa, aunque se explore un horizonte de valor mayor.

No sumar valor por cuenta, FTP y ahorro de fondeo si monetizan el mismo beneficio. Un método reemplaza al otro. La sensibilidad 1/2/4/6% es experimento aritmético del valor neto sobre saldos, no evidencia bancaria; **6% es un extremo no recomendado** y no justifica la propuesta. Las inversiones hipotéticas US$10.000/25.000/50.000 también son experimentos, no fee, presupuesto o quote.

Ejemplo de decisión: **760 aperturas →494 fondeadas** bajo prueba 65%. Una inversión hipotética de US$25.000 requiere **US$50,61 netos por fondeada** para equilibrio, en un horizonte comparable validado por Finance. Ese requisito no demuestra que el banco tenga dicho valor. Las rutas de valoración 24/36 meses ayudan a formular la pregunta sin atribuir beneficios futuros al primer año.

## Retrolanzamiento y otros mecanismos

Jesús solicitó qué aperturas habría podido cubrir SEO/GEO de haberse implementado desde el lanzamiento de este año. El selector retrospectivo honra esa pregunta con fecha/ventana editables; inicialmente quedan desconocidas. La fecha puede iniciar un mes parcial y el cálculo limita la maduración/valor a los meses elegidos. Las bandas son requisitos del contrafactual, no pérdidas históricas ni causalidad demostrada. Las condiciones históricas de oferta, indexación, exposición, baseline y funnel requieren validación. Al cambiar contexto, no trasladar validaciones de inversión/valor sin revisión.

La adquisición genérica, la protección de marca, la conversión de tráfico de otros canales, la educación/confianza, la activación y la retención/origen externo tienen recorridos distintos. Sus retornos permanecen N/D sin baseline, contrafactual y deduplicación por cuenta/cohorte. La misma apertura no se cuenta como ganancia separada de SEO e IA; una cita de IA no se transforma en conversión. El programa puede preparar y medir esos mecanismos sin prometer retornos inexistentes.

M1 valida accesos/datos/delivery, con optimizaciones M3/6/9/12. No es piloto ni corte por ROI a tres meses. La cotización se prepara con datos públicos y requisitos claros; datos privados opcionales refinan la precisión. Rankings, citas, aperturas y fondeo no se garantizan.

## Evidencia de verificación

`validation.json` contiene pruebas nativas y comparación independiente de fórmulas/cachés: bandas, apertura vs fondeo, diciembre, lag, origen por cohorte, saldos medios por días, horizonte retrospectivo, métodos Finance excluyentes, valor 24/36, costo/margen, gastos ausentes/cero/negativos y capacidad. `visual-qa.json` registra inspección del workbook real exportado a PDF. `delivery-manifest.json` coteja hashes de la copia entregada; los artefactos históricos anteriores permanecen intactos.

## Ampliación PR posterior

La propuesta v0.5 incluye PR editorial. La [matriz combinada](../capacidad-programa-con-pr.csv) suma 1.066 h base +150 reserva =1.216 h. Este workbook no ha cambiado: conserva 924 h para SEO/GEO y no es una cotización del alcance con PR. Antes de usarlo para valorar el costo total, Finance debe incorporar el dimensionamiento incremental y sus costos reales. Las fórmulas de requisitos desde la meta no dependen de esa ampliación.
