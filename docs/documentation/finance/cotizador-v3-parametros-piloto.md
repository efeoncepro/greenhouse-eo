# Cotizador V3: parámetros del catálogo piloto

[Flujo local vigente hasta TASK-2022](cotizador-v3-superficie-implementada.md) y [manual de agentes](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). Este documento conserva el caso/piloto y sus supuestos históricos: las nuevas herramientas, fuentes y reglas no recalculan sus artefactos ni habilitan una tarifa comercial.

- Fecha: 2026-10-09.
- Estado: catálogo de revisión preparado; costos y políticas operativos pendientes. Motor local separado implementado; [manual](../../manual-de-uso/finance/cotizar-v3-por-cli.md).
- Owner: Commercial/Finance, con Operations para capacidad, kits y Talent Assurance.
- Datos para agentes: [parámetros](../../../data/pricing/v3-pilot/parameters.json) y [cálculos de referencia](../../../data/pricing/v3-pilot/reference-calculations.json).
- Diseño: [modelo V3](cotizador-cli-modelo-propuesto.md) y [contrato/pruebas](cotizador-v3-contrato-y-validacion.md).

## Procedencia y estados

Fuente histórica: [libro original](../../../data/pricing/efeonce-pricing-model-v1.xlsx), SHA-256 `68a0c361e7ec3b188419cc5d5c7b758419e4d4d499eba5d9242b3f78a1c78d1b`. Lectura directa de celdas cacheadas y reconciliación decimal de los componentes el 2026-10-09. Archivo intacto. Su fecha de modificación no determina la fecha efectiva de costos.

| Estado                     | Interpretación                                                                 |
| -------------------------- | ------------------------------------------------------------------------------ |
| Confirmado por el operador | Significado específico que confirmó; no extender la confirmación a otros datos |
| Histórico                  | Valor verificado en el libro; sin validación de vigencia comercial             |
| Propuesto                  | Clasificación, kit o política que se presenta para revisión                    |
| Pendiente                  | Dato ausente o decisión abierta; nunca equivale a cero                         |

Confirmación directa del operador el 2026-10-09: USD 10.400 en `Precios personal!F28` representa **costo mensual de una persona**. Se registra ese significado; no se reinterpreta como tarifa de consultoría a partir de `D28=Servicio`. La respuesta no fecha el costo ni confirma país, bonos, cargas, fee o precio de venta. Tampoco se extiende automáticamente al consultor premium.

## Perfiles y escalas conservados

Se amplió el piloto para conservar las variantes CRM que el operador pidió considerar. No se reducen a un consultor genérico.

| Perfil                    | ID                         | Base histórica USD | Bonos históricos USD | Previsionales en el libro | Fee plataforma USD | Total registrado USD/mes | Fuente                                 |
| ------------------------- | -------------------------- | -----------------: | -------------------: | ------------------------: | -----------------: | -----------------------: | -------------------------------------- |
| Senior Visual Designer    | ECG-002                    |                950 |                  360 |                         0 |                 49 |                    1.359 | Precios personal, F3:M3                |
| Implementador HubSpot     | ECG-025                    |              7.200 |                  600 |                         0 |                 49 |                    7.849 | Precios personal, F26:M26              |
| Desarrollador HubSpot     | ECG-026                    |              3.000 |                  625 |                         0 |                 49 |                    3.674 | Precios personal, F27:M27              |
| Consultor HubSpot         | ECG-027                    |             10.400 |                  775 |                         0 |                 49 |                   11.224 | Precios personal, F28:M28              |
| Consultor HubSpot Premium | ECG-032                    |             23.140 |                    0 |                         0 |          **Vacío** |                   23.140 | Precios personal, F33:M33              |
| Consultor Salesforce      | ID provisional de revisión |          Pendiente |            Pendiente |                 Pendiente |          Pendiente |                Pendiente | Sin registro en el libro inspeccionado |

Los valores previsionales de cero se conservan como históricos para revisar aplicabilidad; no prueban ausencia de obligaciones. La celda vacía del fee premium exige costo o condición que no aplica confirmada. No se completa con 49 por similitud ni con cero por comportamiento de SUM.

Separación propuesta para resolver un pedido:

1. Familia de capacidad: diseño, HubSpot o Salesforce.
2. Función/variante: implementación, desarrollo, consultoría estándar o premium según catálogo y alcance.
3. Seniority: experiencia y responsabilidad, cuando esté definido.
4. Tier comercial: diferenciación/demanda y política de precio.

El libro no define requisitos verificables para la variante premium ni seniority para los perfiles HubSpot. Eso debe completarse. Compartir tier no vuelve equivalentes sus costos. Implementador/desarrollador no son versiones junior/mid del consultor. No se afirma disponibilidad o credenciales de personas a partir del catálogo.

El costo humano histórico sin fee resulta de los componentes F:K; el fee L queda separado. El total M es control de reconciliación, no otro costo para sumar. Los precios W son referencia de venta histórica, no costo interno.

## Tabla de parámetros para revisión

| Parámetro                  | Valor recuperado o propuesta                                                | Estado y cierre necesario                                                                                           |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Jornada base               | 180 h/mes, Datos!O3                                                         | Histórico; validar jornada vigente y capacidad vendible                                                             |
| Dedicación                 | FTE y horas mensuales explícitos                                            | Contrato definido; 50% de la base histórica equivale a 90 h, sin aprobarla como jornada vigente                     |
| Capacidad compartida       | Costo atribuible por capacidad vendible y cobertura explícita del remanente | Propuesto; medir reservas y definir reparto                                                                         |
| Capacidad dedicada         | Absorber costo de la capacidad comprometida                                 | Propuesto; definir capacidad/costo reservado para cada plan                                                         |
| Fee contratación/pagos     | USD 49/mes en varias filas; ETG-017 también muestra 49/4=12,25              | Histórico; definir factura real, cobertura y asignación por cuenta. No se prorratea automáticamente por FTE         |
| Tier de perfil             | Cuatro niveles del antecedente                                              | Propuesta de nombres: Generalista, Especializado, Estratégico, Alta especialización; asignación y precio pendientes |
| Recargo histórico por tier | 25%, 30%, 50%, 60%, Tier Datos!B2:B5                                        | Histórico, **markup sobre costo**, no margen objetivo; no adoptar automáticamente como política V3                  |
| País del talento           | No está localizado en los costos de perfil                                  | Pendiente por perfil; USD no significa talento en EEUU                                                              |
| Mercado de oferta          | Primer escenario: talento Colombia → mercado Chile                          | Combinación confirmada por operador; factores/tarifa pendientes, sin localizar históricos                           |
| Factor de costo            | Tabla separada o costo localizado específico                                | Pendiente; no convertir rangos de Factor País en factores salariales                                                |
| Factor de venta            | Tabla por perfil/tier/mercado y base elegible                               | Pendiente; tabla histórica mezcla mercados con PYME/licitación/estratégico                                          |
| Kits y planes              | Cuatro kits propuestos abajo                                                | Selección, unidad, tarifas y asignaciones pendientes de confirmar                                                   |
| Talent Assurance           | Costos explícitos por cobertura                                             | Alcance aceptado; tiempos/costos y límites pendientes                                                               |
| Gestión/QA/overhead        | Coberturas identificadas, atribuibles y sin duplicación                     | Pendiente de medir; no agregar porcentajes genéricos a costos ya cubiertos                                          |
| Setup                      | Onboarding/inmersión con costo y tratamiento único                          | Pendiente; no asumir un mes de talento como cargo automático                                                        |
| Margen objetivo/piso       | Política sobre venta y costo total                                          | Pendiente; no seleccionar bandas manuales como si ya estuvieran aplicadas                                           |
| Fee de transacción         | Unidad, base y tratamiento identificado                                     | Pendiente; separado de plataforma y licencias                                                                       |
| FX                         | Tasas del libro abajo                                                       | Histórico; fuente, fecha efectiva y antigüedad operativas pendientes                                                |
| Impuestos                  | Simulación neta con estado explícito                                        | Pendiente; no calcular IVA/retenciones por inferir país                                                             |

Para implementación/desarrollo HubSpot, `Tiers!B31:B32` dice tier 3 mientras `Precios personal!E26:E27` dice tier 4. Se conserva el conflicto como antecedente; no hay dos autoridades de clasificación V3. El nombre histórico tier 4 «IP Propietaria» no se convierte en una declaración de IP propia sobre HubSpot/Salesforce.

## Kits propuestos

Los kits expresan necesidades y candidatos, no compras aprobadas. El precio completo/atribuido se decide según plan, unidad y asignación validados. Una suite existente puede cubrir varios requisitos; se registra su cobertura para no cobrarla dos veces.

| Kit                                | Núcleo propuesto                                                                               | Según alcance                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Diseño visual                      | Suite de diseño, colaboración/correo, seguimiento/documentación y asistencia AI                | Stock, generación de imágenes, plataforma de revisión o prototipado |
| HubSpot consultoría/implementación | Colaboración, documentación, AI y acceso suficiente al workspace/entorno de prueba del cliente | Automatización externa u otras integraciones                        |
| HubSpot desarrollo                 | Kit HubSpot + herramientas de desarrollo y pruebas                                             | Herramientas específicas según implementación                       |
| Salesforce                         | Colaboración, documentación, AI y entorno del producto Salesforce definido                     | Automatización/desarrollo y herramientas de ese producto            |

Los consultores estándar y premium pueden compartir requisitos de kit; sus permisos, complejidad y cobertura se precisan por alcance. El consultor Salesforce requiere producto/variante antes de cerrar un perfil, sin equiparar CRM core, Marketing Cloud Engagement y Marketing Cloud Next.

Referencias de costo históricas útiles para revisar planes:

| Herramienta          | Importe de proveedor USD/mes en el libro | Reparto registrado | Fuente               |
| -------------------- | ---------------------------------------: | ------------------ | -------------------- |
| Adobe Creative Cloud |                                       80 | 4 proyectos → 20   | Herramientas!F2:J2   |
| ChatGPT Plus         |                                       20 | 4 proyectos → 5    | Herramientas!F8:J8   |
| Gemini               |                                       23 | 4 proyectos → 5,75 | Herramientas!F19:J19 |
| Notion               |                                      144 | 6 usuarios → 24    | Herramientas!F16:J16 |
| Microsoft 365        |                                       80 | 5 clientes → 16    | Herramientas!F17:J17 |
| Frame.io             |                                       75 | 5 proyectos → 15   | Herramientas!F23:J23 |

Estos importes son referencias del archivo, no tarifas actuales verificadas ni autorización para compartir seats. No se heredan divisores por defecto. Si el cliente aporta herramientas, confirmar acceso/cobertura antes de excluir el costo Efeonce. HubSpot `F6=N/A` y la nota «Incluido como partner» no acreditan licencia gratuita ni acceso al cliente. El fee de plataforma se retiró del kit de herramientas, manteniendo su referencia histórica separada.

## Talent Assurance: datos necesarios para costearlo

Propuesta de desglose alineada a los [guardrails aceptados](../../business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md):

- Formación continua: tiempo reservado, formación externa/licencias y revisión de conocimientos.
- QA y supervisión: frecuencia, responsable, tiempo y costo interno por unidad.
- Gestión de capacidad: coordinación y cobertura del responsable de delivery.
- Continuidad: backup/bench identificado, condiciones de reemplazo y ramp-up.
- Inmersión inicial: actividades y costo de onboarding, separando setup de recurrencia.

Cada partida declara cobertura y unidad. Si el tiempo de formación propio ya está absorbido en sueldo/capacidad vendible, no se suma otra vez como salario adicional de Talent Assurance. Sí se identifican costos incrementales o capacidad atribuida que aún no estén cubiertos. Lo mismo aplica a QA/gestión ya incluidos en overhead y a bench ya reservado en asignación. No se fija un porcentaje de reserva sin evidencia ni se promete reemplazo ilimitado.

## Tres cálculos numéricos de referencia y un caso pendiente

Para comparar aritmética se fijó una persona al 50%, 90 h/mes según la base histórica y tres meses. No se asignó país a costos que el Excel no localiza. Estos son controles históricos de perfil; no son ofertas completas V3.

| Caso                              | Costo mensual registrado al 50% USD | Markup histórico | Precio de perfil USD/mes | Tres meses USD | Tres meses CLP con FX histórico |
| --------------------------------- | ----------------------------------: | ---------------: | -----------------------: | -------------: | ------------------------------: |
| REF-01: diseñador senior          |                              679,50 |              30% |                   883,35 |       2.650,05 |                       2.650.050 |
| REF-02: consultor HubSpot         |                            5.612,00 |              60% |                 8.979,20 |      26.937,60 |                      26.937.600 |
| REF-03: consultor HubSpot Premium |                           11.570,00 |              60% |                18.512,00 |      55.536,00 |                      55.536.000 |
| REF-04: consultor Salesforce      |                           Pendiente |        Pendiente |                Pendiente |      Pendiente |                       Pendiente |

La cuenta independiente es `M × 0,5 × (1 + markup)`, después `×3` por duración y `×1.000` para CLP histórico. Se reconciliaron M y W de los perfiles contra los componentes del libro. Para premium, M omite el fee vacío por el comportamiento histórico de SUM; V3 no lo admite como costo cero.

Los márgenes sobre los costos de perfil registrados son 23,0769% para el diseñador y 37,5% para ambos consultores. No son margen total del servicio: faltan herramientas, operación, Talent Assurance y otras coberturas.

Control adicional de fee no lineal, **hipótesis de imputación completa a una cuenta**: diseñador humano `1.310 ×0,5=655`; fee histórico completo 49 → subtotal conocido 704 USD. Consultor estándar humano `11.175 ×0,5=5.587,50`; fee completo 49 → subtotal conocido 5.636,50 USD. Estos subtotales aún no incluyen herramientas/reservas; no son nuevo precio. Si la factura se comparte entre cuentas, su criterio de atribución debe quedar explícito.

Todos los casos conservan resultado esperado V3 `needs_input`, precio/margen final `null`. Los tres números anteriores son controles completos de la aritmética histórica, no una declaración de que el costeo comercial esté completo. Salesforce no se rellena con el costo de otro perfil.

## FX histórico conservado

| Par       | Unidades destino por USD | Fecha del libro |
| --------- | -----------------------: | --------------- |
| USD → CLP |                    1.000 | 2025-11-09      |
| USD → COP |                    4.200 | 2025-11-09      |
| USD → MXN |                     18,5 | 2025-11-09      |
| USD → PEN |                      3,8 | 2025-11-09      |
| USD → CLF |                    0,024 | 2025-11-10      |
| USD → USD |                        1 | 2025-11-10      |

Fuente `Tipos de Cambio!B2:E7`. No se refrescaron contra mercado ni se adoptaron como tasas contractuales.

## Orden para cerrar el piloto

1. Confirmar país, vigencia y cobertura de costo de las variantes elegidas; completar premium y Salesforce cuando se habiliten. Definir requisitos de nivel/variante.
2. Validar jornada vendible y asignación compartida/dedicada, kits y facturas reales.
3. Costear operación/Talent Assurance/setup y resolver duplicaciones.
4. Seleccionar política de tier, factores de mercado y margen objetivo/piso sobre costos completos.
5. Seleccionar FX operativo y recalcular controles; revisión de economics por Commercial/Finance.

No es necesario activar los seis perfiles al mismo tiempo. Un caso puede entrar a construcción cuando sus parámetros estén completos, con el resto del catálogo expresamente no habilitado. El prototipo puede usar fixtures históricos/sintéticos para desarrollar pruebas, pero eso no habilita cotizaciones vigentes de perfiles incompletos.

Preparación realizada: referencias extraídas, variantes preservadas, kits y políticas presentados para revisión, tres controles numéricos y un caso de datos faltantes. Motor local construido bajo [ADR](../../architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md) y [manual](../../manual-de-uso/finance/cotizar-v3-por-cli.md). Pendiente: cierre de valores operativos e integración canónica. Primer escenario confirmado: talento Colombia → mercado Chile; no define el origen de los costos históricos.
