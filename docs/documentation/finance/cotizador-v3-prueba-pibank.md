# Prueba V3 — equipo para Pibank Perú con talento Perú/Chile

[Flujo local vigente hasta TASK-2022](cotizador-v3-superficie-implementada.md) y [manual de agentes](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). Este documento conserva el caso/piloto y sus supuestos históricos: las nuevas herramientas, fuentes y reglas no recalculan sus artefactos ni habilitan una tarifa comercial.

Fecha: 2026-10-09. Estado: prueba histórica local ejecutada; costos y precio comercial no validados.
Unidad: [TASK-2018](../../tasks/complete/TASK-2018-pricing-v3-pibank-team-simulation.md).

> Nota 2026-10-11. Esta prueba conserva sus cifras y supuestos del 2026-10-09; nada se recalculó. Cuando se hizo no
> había factores de país con valor, y por eso dice que no agrega ajuste por Perú ni por Chile. Hoy el catálogo
> operativo tiene un factor de talento por país de la persona y un factor de mercado por país del cliente (los de
> Perú, todavía estimados), y por decisión del CEO el costo de las personas se lee como costo objetivo, no como
> nómina. Una simulación nueva de este caso daría otras cifras y seguiría sin ser un precio aprobado. El 40 % de
> esta prueba fue una sensibilidad del ensayo, no un margen de referencia ni un piso. Estado vigente:
> [superficie implementada](cotizador-v3-superficie-implementada.md#qué-versiones-se-usan-hoy-2026-10-11).

## Caso usado

El operador pidió usar lo necesario para la licitación de Pibank como otra prueba del motor.
Confirmó diseñador y redactor en Perú; Director de Arte y Account Manager en Chile;
SEO/AEO, WordPress/desarrollo, comunidad, automatización y PR también en Chile.

Se usa la ruta **gradual** del [expediente vigente](../../commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/cotizacion-detallada-2026-10-08/README.md):
programa anual, base SEO/AEO/contenidos, hub, mejora de calculadora, comparador,
diez meses de comunidad/mantenimiento, dos campañas PR y dos refuerzos. Máximo de cinco
espacios editoriales por mes, sujetos a fuentes y aprobación. El planificador queda en la
alternativa integral y no se suma a esta prueba. La ejecución SEM no forma parte de esta oferta.

La versión económica del 09-10 conserva USD 79.200 anuales, compromiso inicial de seis meses
con USD 42.500 presupuestados y renovación trimestral. Es una propuesta documental; esta prueba
no acredita aceptación bancaria ni modifica precio, alcance, compromiso o fechas de cobro.
El anexo híbrido del 07-10 aún menciona base anual: para compromiso contractual prevalece la
revisión económica del 09-10. Horizonte anual y compromiso inicial se mantienen separados.

## Equipo y atribución de costo

| Función                           | País de simulación | Reserva/FTE medio de costo | Costo anual USD del ensayo |
| --------------------------------- | ------------------ | -------------------------: | -------------------------: |
| Redactor                          | Perú               |                     100.0% |                   12420.00 |
| Diseñador                         | Perú               |                     23.68% |                    4216.32 |
| Director de Arte                  | Chile              |                       5.0% |                    1680.96 |
| Account Manager / Project Manager | Chile              |                      3.33% |                    1250.04 |
| Especialista SEO/AEO              | Chile              |                     100.0% |                   28340.04 |
| Desarrollador WordPress           | Chile              |                      9.07% |                    2581.20 |
| Desarrollador Full Stack          | Chile              |                      7.96% |                    2986.20 |
| Community Manager                 | Chile              |                      7.41% |                    1851.48 |
| Marketing Automation Specialist   | Chile              |                      0.93% |                     327.24 |
| Periodista / PR digital           | Chile              |                      7.04% |                    2244.48 |

Los valores de la tabla son **promedios económicos** y costo del perímetro modelado,
no un roster, dedicación contractual ofrecida ni comprobación de disponibilidad. Varias funciones
se activan por bolsas/proyectos. El costo SEO incluye la provisión general de otros costos de la
cuenta; ese importe no es salario del especialista. Los demás importes incluyen reserva de entrega
15% y fee atribuible cuando aparece en la referencia seed.

SEO y redactor conservan reserva de su costo mensual completo: USD 1.800 y USD 900,
respectivamente, antes de reserva de entrega. Provienen de USD 1.500 y USD 750 más provisión
20% del expediente. La contratación y cargas reales no están acreditadas.
El diseñador usa USD 1.075 más provisión 20%; su 30% original se pondera por las activaciones:
120/152 del trabajo de diseño de referencia, resultando 23,68% medio de costo. Esto reemplaza
el supuesto de diseñador al 50% de la prueba anterior; son casos de alcance distinto.

Dirección tiene 108 h de referencia anual (9 h/mes en promedio), y coordinación 72 h (6 h/mes).
El operador seleccionó Director de Arte: se vincula ECG-005 a esa función; el expediente antes
usaba ECG-001 Creative Operations Lead. Ambos tienen el mismo costo histórico seed, pero eso
no demuestra que un Director de Arte cubra toda la dirección estratégica del programa. Deben
validarse RACI, carga real y seniority, al igual que la suficiencia de 6 h promedio de Account Manager.
No se añadió otra capa de gestión para duplicar la coordinación ya costeada.

## Resultado de la CLI

| Comparación                                        |       USD |
| -------------------------------------------------- | --------: |
| Costo anual V3 del perímetro                       | 57.897,96 |
| Costo medio mensual                                |  4.824,83 |
| Precio documental anual existente                  | 79.200,00 |
| Promedio mensual del precio documental             |  6.600,00 |
| Margen sobre ese precio y costo modelado           |    26,90% |
| Precio anual del ensayo con objetivo de margen 40% | 96.496,32 |
| Promedio mensual del ensayo al 40%                 |  8.041,36 |

La aspiración de margen 40% aparece en los inputs originales y los acuerdos del expediente;
se usa como **sensibilidad**, no como nuevo piso aprobado o recomendación de tarifa. El ensayo
no decide aumentar la propuesta en USD 17.296,32. Tampoco reemplaza USD 4.500 de base más
activaciones por un retainer fijo de USD 8.041,36. Son promedios comparables para el mismo
perímetro anual de costo. Impuestos y total facturable permanecen pendientes.

El costeo anterior da USD 57.897,950657894726. V3 suma líneas de rol/mes redondeadas:
USD 57.897,96, diferencia USD 0,009342105274, aproximadamente un centavo.
El control decimal sin redondeo por línea concilia con los operandos del expediente dentro de
USD 0,000001. El precio del ensayo también suma líneas redondeadas; dividir el costo anual
ya redondeado por 0,6 puede producir unos centavos distintos.

## Qué hipótesis conserva

- Los países son la distribución elegida por el operador; los salarios/referencias se tratan
  como aplicables a esos países sólo para el ensayo. El expediente no prueba el país real de
  cada costo. No se agrega un descuento Perú ni recargo Chile sin política/benchmark validado.
- La provisión laboral 20%, reserva de entrega 15% y sensibilidad seed 1,25 del escenario central
  se conservan como supuestos de origen. No son cargas fiscales ni nómina fully loaded verificadas.
- Humano y fee de plataforma están separados. Los fees identificables del seed conservan una
  atribución explícita por FTE para reconciliar el modelo histórico; no se aprueba que un proveedor
  cobre fracciones de licencia o de fee. Antes de contratar se verifica unidad/precio real.
- La provisión de otros costos queda en la cuenta, separada de salarios. Incluye elementos sin
  planes/proveedores confirmados; no se añaden los placeholders de USD 25 de Assurance/gestión
  y USD 100 de onboarding de la prueba del diseñador. El presupuesto de proyectos ya incluye
  sus capacidades de implementación. Talent Assurance sigue como validación de costos/alcance;
  la reserva de entrega no acredita cobertura de formación, continuidad o reemplazo.
- Las horas BASE de SEO/redactor vienen de la capacidad fuente integral, cuyo costo está
  reservado completo. El ponderado económico mantiene ese costo al activar menos módulos;
  esas horas no certifican la cantidad real de trabajo de la ruta gradual ni su calendario.
- FTE medio anual no prueba picos mensuales ni tiempos de entrega. El kernel sólo admite
  staffing mensual constante por línea. Aquí se prueba la **economía de capacidad** del
  programa gestionado; proyectos/hitos, cuotas, activaciones y contrato no están implementados.

El [manifest de hipótesis y hashes](../../../data/pricing/v3-pilot/economics/pibank/assumptions.json)
conserva fuentes exactas, costos, países, reglas de normalización y selecciones. Las fechas source
son la ventana de evaluación del ensayo, sin afirmar vigencia real de salarios/proveedores.
Todos los registros son estimated y el snapshot historical, por lo que conservan revisión.

## Uso y evidencia para agentes

[Input del ensayo al 40%](../../../data/pricing/v3-pilot/scenarios/pibank-gradual-peru-chile.json).
[Resultados, conciliación y comparación](../../../data/pricing/v3-pilot/economics/pibank/results.json).
[Artefacto de costo](../../../data/pricing/v3-pilot/economics/pibank/cost-reconciliation.artifact.json).
[Artefacto al 40%](../../../data/pricing/v3-pilot/economics/pibank/margin-40-hypothesis.artifact.json).

```bash
pnpm --silent pricing:v3 calculate --input data/pricing/v3-pilot/scenarios/pibank-gradual-peru-chile.json
pnpm --silent pricing:v3 replay --input data/pricing/v3-pilot/economics/pibank/margin-40-hypothesis.artifact.json
pnpm --silent pricing:v3 compare --left data/pricing/v3-pilot/economics/pibank/cost-reconciliation.artifact.json --right data/pricing/v3-pilot/economics/pibank/margin-40-hypothesis.artifact.json
```

La variante de costo en el artefacto usa markup 0 sólo para verificar costo: su neto coincide
con costo y **no es un precio de venta**. El input principal usa target_margin 0,40 sobre all_costs.
No se reimplementan precios en un script de ensamblaje ni se consulta Excel para ejecutar V3.

Verificados dos calculate/calculated con requires_review (código 3), dos replay idénticos,
compare, export bloqueado para ambos sin crear archivo, control decimal y hashes de fuentes
sin modificaciones. El catálogo operativo, propuesta económica, CRM y archivos comerciales
permanecen intactos. Cierre de esta prueba local no certifica viabilidad o oferta comercial.
