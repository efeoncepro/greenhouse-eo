# Greenhouse Management Accounting Architecture V1

> Version: 1.0
> Created: 2026-04-13
> Audience: product owners, finance owners, backend engineers, agents implementing finance and cost features

---

## Objetivo

Definir la decision arquitectonica para el siguiente modulo financiero que Greenhouse realmente necesita a partir del runtime actual del repo.

La conclusion canonica es:

- Greenhouse NO debe abrir primero un modulo de contabilidad financiera/legal
- Greenhouse SI debe consolidar un modulo de `management accounting`
- en lenguaje de negocio, ese modulo puede presentarse como:
  - `Contabilidad de costos`
  - `Economia operativa`
  - `Control de gestion`

Este documento fija el boundary, la taxonomia y el orden de evolucion correcto para esa capability.

Usar junto con:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

---

## Decision arquitectonica

### Decision principal

Si Greenhouse institucionaliza un nuevo modulo en este dominio, el modulo correcto es:

- **Capability canonica:** `management_accounting`
- **Lectura funcional recomendada:** `contabilidad de costos`
- **Surface product actual recomendada:** `Finance > Economia operativa`

### Decision complementaria

Esta capability debe crecer como una profundizacion de `Finance + Cost Intelligence`, no como un modulo paralelo desconectado.

Implicancia:

- no crear una segunda raiz financiera al costado de `Finance`
- no mover el ownership transaccional fuera de `greenhouse_finance`
- no introducir un subledger legal artificial solo para "que suene a contabilidad"
- si la surface necesita identidad propia, debe vivir como lane interna de `Finance`, anclada inicialmente en `/finance/intelligence`

### Decision negativa explicita

Greenhouse no debe modelar todavia:

- partida doble
- plan de cuentas legal
- libro diario
- libro mayor
- balance general legal
- estados financieros SII
- cierre contable tributario formal

Ese boundary solo deberia abrirse si Efeonce decide que Greenhouse tambien sera owner de contabilidad legal, o si se integra un sistema externo contable con contrato formal equivalente.

---

## Por que esta decision existe

El repo ya tiene una base fuerte de finanzas operativas y de costo:

- `Finance` ya posee CRUD y runtime para ingresos, egresos, clientes, proveedores, reconciliacion, caja, tesoreria y FX
- `Cost Intelligence` ya materializa cierre de periodo y `operational_pl`
- `commercial_cost_attribution` ya resuelve labor cost comercial vs carga interna
- `member_capacity_economics` ya sirve como base loaded-cost por miembro
- `client_economics` ya da una vista derivada de rentabilidad por cliente

El problema no es ausencia total de modulo. El problema es que esa capacidad todavia esta repartida entre varios dominios y le faltan piezas clasicas de management accounting para comportarse como sistema de control de gestion completo.

Preguntas que el repo ya intenta responder o deberia responder mejor:

- cuanto ganamos o perdimos por cliente, space, organizacion o BU
- cuanto del costo laboral es realmente comercial, interno o overhead
- si el periodo esta listo para cerrar
- si una cuenta o un instrumento ya refleja caja real o solo documento/devengo
- cuanto deberiamos haber ganado contra lo que efectivamente ganamos

Eso es contabilidad de costos y management accounting. No es contabilidad legal.

---

## Tesis operativa

### Nubox y Greenhouse no juegan el mismo partido

- `Nubox` sigue siendo la verdad tributaria y documental para DTEs
- `Greenhouse` es la verdad operativa para costos, margenes, asignaciones, cierre y explicabilidad interna

### Finance y Management Accounting tampoco juegan exactamente el mismo partido

- `Finance` registra hechos transaccionales y operativos
- `Management Accounting` consolida, explica, compara y gobierna decisiones

Una formula util:

```text
Finance = documents + payments + treasury + reconciliation
Payroll = labor cost source
Team Capacity = loaded cost / overhead source
Management Accounting = actual + attribution + closure + plan + variance + forecast
```

---

## Nombre y taxonomia recomendada

### Capa arquitectonica

- nombre canonico: `Management Accounting`

Se usa este nombre a nivel arquitectura porque es mas preciso que `Accounting` y mas amplio que `Cost Intelligence`.

### Nombre funcional interno

- nombre funcional recomendado: `Contabilidad de costos`

Sirve cuando el usuario interno necesita entender que el foco esta en:

- costos cargados
- margen
- cost centers
- variance
- budget
- forecast

### Surface product

- surface product vigente y recomendable: `Economia operativa`

Razon:

- ya existe en el repo como narrativa UI compatible con Greenhouse
- evita prometer contabilidad legal donde el sistema no la tiene
- deja espacio para crecer desde cierre + rentabilidad hacia budget + forecast

### Regla de nomenclatura

- `Finance` sigue siendo el dominio transaccional
- `Economia operativa` sigue siendo la surface visible
- `Management Accounting` queda como nombre de arquitectura/capability
- `Contabilidad de costos` puede usarse como descripcion funcional, no necesariamente como root label del sidebar

---

## Alcance del modulo

### Management Accounting SI es owner de

- cierre de periodo multi-modulo
- `actual` consolidado por scope
- P&L operativo por `client`, `space`, `organization` y `business_unit`
- capas de explainability de costo y margen
- budget operativo
- variance analysis
- forecast operativo
- alertas de margen, cobertura y salud semantica
- contratos de serving para consumers downstream

### Management Accounting consume, pero no posee

- `greenhouse_finance.*`
- `greenhouse_payroll.*`
- `greenhouse_serving.member_capacity_economics`
- `greenhouse_serving.commercial_cost_attribution`
- `greenhouse_finance.client_economics`
- `greenhouse_core.client_team_assignments`
- `greenhouse_core.organizations`
- `greenhouse_core.service_modules` / business lines

### Management Accounting NO debe poseer

- emision DTE
- CRUD de income/expenses
- reconciliacion bancaria transaccional
- calculo de payroll
- contract lifecycle HR
- ledger legal doble partida
- plan de cuentas
- impuestos legales

---

## Runtime actual sobre el que se monta

### Foundation ya existente

1. `Finance`
   - `income`, `expenses`, `income_payments`, `expense_payments`
   - caja, banco, conciliacion, settlement, instrumentos, FX

2. `Cost Intelligence`
   - `greenhouse_cost_intelligence`
   - `greenhouse_serving.period_closure_status`
   - `greenhouse_serving.operational_pl_snapshots`

3. `Commercial Cost Attribution`
   - `greenhouse_serving.commercial_cost_attribution`
   - reparto laboral comercial vs interno

4. `Client Economics`
   - snapshots derivados de revenue + labor + direct cost + indirect cost

5. `Team Capacity`
   - costo loaded por miembro y capacidad atribuible

### Lectura correcta del runtime

Greenhouse ya tiene mucho del "actual".

Lo que todavia no tiene cerrado como capability enterprise es:

- plan
- comparacion plan vs actual
- forecast
- P&L por BU terminado
- fully-loaded cost completo con provisiones
- una narrativa unica de modulo para estas piezas

---

## Modelo conceptual

### Capa 1 - Actual

Representa lo que realmente paso en el periodo.

Objetos base:

- revenue operativo
- cobros reales
- gastos documentados
- pagos reales
- costo laboral
- overhead
- costo comercial atribuido
- cierre de periodo

Sources principales:

- `greenhouse_finance`
- `greenhouse_payroll`
- `greenhouse_serving.member_capacity_economics`
- `greenhouse_serving.commercial_cost_attribution`

### Capa 2 - Explain

Representa por que un costo o margen dio ese valor.

Debe poder explicar:

- costo laboral comercial
- costo interno excluido
- overhead directo y compartido
- reglas de clasificacion
- source of truth usada
- periodo y version de materializacion

### Capa 3 - Plan

Representa lo que se esperaba.

Objetos esperados:

- budget mensual por scope
- versiones de budget
- estados `draft`, `approved`, `locked`
- templates desde actual

### Capa 4 - Control

Representa la lectura ejecutiva.

Objetos esperados:

- variance absoluta y porcentual
- YTD variance
- forecast de cierre anual
- alertas de sobrecosto
- alertas de under-revenue
- semaforos de salud economica

---

## Scopes canonicos

Management Accounting debe consolidar sobre estos scopes:

- `client`
- `space`
- `organization`
- `business_unit`

Regla:

- `client` y `space` siguen siendo los scopes de lectura operativa mas usados
- `organization` es el scope ejecutivo consolidado
- `business_unit` es el scope de control de gestion por linea de negocio

No abrir scopes nuevos sin necesidad real.

En particular, no promover como primera clase:

- `member` como P&L completo
- `campaign`
- `service`

Esos pueden existir como explain surfaces o follow-ons, pero no como foundation inicial del modulo.

---

## Ownership por dominio

| Dominio | Ownership principal |
|--------|----------------------|
| `Finance` | documentos, pagos, tesoreria, conciliacion, FX |
| `Payroll` | costo laboral base, deducciones, cargas empleador |
| `Team Capacity` | loaded cost reusable, overhead policy |
| `Commercial Cost Attribution` | asignacion comercial del costo laboral |
| `Management Accounting` | actual consolidado, cierre, budget, variance, forecast |

Regla de oro:

`Management Accounting` no recalcula desde cero lo que otro modulo ya resolvio de forma canonica.

Debe consumir, consolidar y materializar.

---

## Gaps reales que justifican el modulo

### 1. Budget no existe como foundation canonica

Sin budget, la capa de management accounting queda incompleta.

Consecuencia:

- no hay variance analysis
- no hay forecast serio
- no hay benchmark para pricing o staffing

### 2. Fully-loaded labor cost todavia tiene gap de provisiones

Mientras no entren provisiones laborales y componentes faltantes, el margen puede quedar artificialmente alto.

### 3. BU P&L sigue incompleto

La dimension `business_unit` ya existe conceptualmente, pero falta institucionalizarla como slice canonico de `operational_pl`.

### 4. La narrativa de modulo sigue partida

Hoy el usuario ve varias piezas:

- dashboard financiero
- caja
- banco
- rentabilidad
- cierre
- asignaciones de costo

pero no una capability nombrada y gobernada explicitamente como sistema de control de gestion.

---

## Consideraciones adicionales obligatorias

Ademas de la decision base de modulo, Greenhouse todavia debe considerar estos frentes para que `Management Accounting` funcione como capability enterprise real y no solo como agregacion parcial de metricas financieras.

### 1. Budget, variance y forecast

El modulo no queda completo mientras no exista una capa formal de:

- budget por scope
- variance contra actual
- variance year-to-date
- forecast de cierre

Regla:

- `actual` sin `plan` produce lectura historica
- `management accounting` exige `actual + plan + control`

Implicancia:

- el budget debe quedar modelado como objeto canonico del modulo
- la variance no debe calcularse ad hoc en la UI
- el forecast debe colgarse del mismo contrato de scopes y periodos que usa `operational_pl`

### 2. Fully-loaded labor cost completo

El costo laboral no debe detenerse en payroll base + overhead ya conocido.

Todavia debe contemplar:

- provisiones de vacaciones
- provisiones de indemnizacion
- SIS
- mutual
- cualquier otro componente empleador que afecte el costo real del periodo

Regla:

- si el costo laboral fully-loaded queda subestimado, el margen operativo queda artificialmente alto
- `Management Accounting` no debe certificar margen "real" mientras ese gap siga abierto

### 3. P&L por business unit

`business_unit` debe pasar de ser un follow-on util a una dimension canonica del modulo.

Razon:

- muchas decisiones de control de gestion no ocurren solo por cliente
- la comparacion entre lineas de negocio exige una capa de P&L consistente y materializada

Regla:

- `business_unit` debe usar la taxonomia canonica de business lines ya definida en Greenhouse
- no se debe crear una taxonomia nueva ni paralela para control de gestion

### 4. Contrato de cierre de periodo mas fuerte

El cierre no debe depender solo de disponibilidad de datos. Debe tener una politica canonica.

Ese contrato debe declarar explicitamente:

- que precondiciones bloquean cierre
- que gaps solo generan warning
- quien puede cerrar
- quien puede reabrir
- que evidencia queda persistida al cerrar
- como se comportan budget, factoring, FX y reconciliacion dentro del cierre

Regla:

- `period closure` es una ceremonia de gobierno, no solo un flag tecnico

### 5. Postgres-first real para consumers criticos

Mientras existan readers criticos en dual-mode o apoyados en carriles legacy, el modulo corre riesgo de drift semantico.

Regla:

- las surfaces de management accounting deben converger a una fuente serving canonica y estable
- los fallbacks legacy pueden existir como resiliencia temporal, pero no como contrato permanente

Implicancia:

- dashboards y summaries ejecutivos no deben depender indefinidamente de lectura mezclada entre BigQuery y Postgres
- cualquier fallback debe quedar documentado y con criterio claro de retiro

### 6. Factoring y financial costs como parte del actual real

Factoring, fees financieros, costos por cesion, settlement fees, bank fees y FX no son ruido accesorio.

Son parte del margen real del negocio.

Regla:

- `Finance` sigue siendo owner del hecho transaccional
- `Management Accounting` debe absorber ese hecho en:
  - costo financiero del periodo
  - explainability del margen
  - impacto sobre caja
  - lectura neta real por cliente / organization / BU cuando aplique

Implicancia:

- factoring no debe quedar como lane aislada de treasury
- tampoco debe quedar invisible dentro de P&L o variance

### 7. Explainability ejecutiva y auditabilidad

No alcanza con materializar numericamente el resultado.

El modulo debe poder explicar:

- por que el costo subio o bajo
- que reglas de atribucion intervinieron
- que parte vino de override manual
- que parte vino de FX, fees o factoring
- que cambió entre una version y otra del periodo

Regla:

- todo monto relevante debe poder trazarse a source, rule, actor o materialization reason

### 8. Gobierno de overrides manuales

Toda correccion manual del sistema debe ser tratada como hecho de gobierno.

Aplica a:

- cost allocations manuales
- reclasificaciones
- ajustes de budget
- locks y approvals
- reaperturas de periodo

Minimo esperado:

- actor
- timestamp
- motivo
- evidencia o nota
- objeto impactado
- reversibilidad o historial de cambios

Regla:

- sin governance de overrides, el modulo pierde confianza ejecutiva rapidamente

### 9. RBAC y separacion de funciones

No todos los perfiles deben operar todas las acciones del modulo.

Como minimo debe distinguirse entre:

- operador financiero
- analista
- finance admin
- owner ejecutivo

Y separar permisos para:

- registrar hechos
- ajustar atribucion
- aprobar budget
- cerrar periodo
- reabrir periodo
- ver detalle sensible de explainability

Regla:

- `Management Accounting` necesita separacion de funciones aunque `Finance` ya tenga acceso base compartido

### 10. Surface funcional mas explicita

La capability necesita una bajada UX coherente.

Hoy varias piezas existen, pero todavia debe decidirse con mayor precision:

- que ve un ejecutivo primero
- que ve un analista primero
- donde viven los drilldowns
- donde viven los CRUD

Regla:

- la home del modulo debe ser un cockpit de control, no una lista de tablas
- el usuario no deberia tener que "componer mentalmente" cierre, margen, budget y alerts desde pantallas separadas sin narrativa comun

---

## Enterprise hardening y escalabilidad

Para que esta capability no quede solo correcta en tesis, sino tambien enterprise, robusta y escalable, Greenhouse debe contemplar ademas los siguientes frentes.

### 11. Separacion por legal entity

No basta con `organization`, `client` y `business_unit`.

El modulo debe distinguir explicitamente:

- que legal entity soporta el ingreso
- que legal entity absorbe el gasto
- que legal entity paga la nomina
- que legal entity controla la caja o el instrumento

Razon:

- sin esa separacion, el margen puede verse correcto por `organization` pero incorrecto desde la contraparte economica y societaria real
- `factoring`, `shareholder_account`, `payroll` y `treasury` se vuelven especialmente sensibles a este punto

Regla:

- `legal entity` no reemplaza los scopes canonicos actuales
- se agrega como dimension de gobierno y explainability cuando la realidad economica lo exija

### 12. Intercompany y related parties

El modulo debe reconocer que no toda transaccion entre partes del ecosistema se comporta como costo operativo ordinario.

Debe existir politica explicita para:

- servicios intercompany
- cruces entre sociedades del grupo
- related-party balances
- cruces entre empresa y socios/accionistas

Regla:

- esos flujos no deben distorsionar el margen comercial como si fueran costo externo normal
- cuando participen en `Management Accounting`, deben hacerlo con clasificacion y trazabilidad propia

### 13. Restatements y versionado de cierre

Una capability enterprise necesita poder reexpresar el pasado de forma gobernada.

El modulo debe poder responder:

- que version del periodo estaba vigente
- que cambió despues del cierre
- si el cambio es una correccion retroactiva o una nueva lectura prospectiva
- que snapshots quedan supersedidos
- que consumers deben releer resultados

Regla:

- reabrir un periodo no puede significar "pisar silenciosamente" la historia
- debe existir versionado o evidencia clara de restatement

### 14. Inmutabilidad parcial del periodo

No todos los objetos del periodo deberian seguir editables una vez que se avanza en el lifecycle.

El modulo debe distinguir al menos entre:

- editable libremente
- bloqueado salvo override autorizado
- reabrible con permiso
- ajustable solo mediante mecanismo formal de correccion

Regla:

- un periodo enterprise no es simplemente `open` o `closed`
- necesita una politica de mutabilidad proporcional al riesgo

### 15. Politica formal de reclasificaciones

Reclasificar no es lo mismo que editar.

Debe existir contrato para:

- mover un gasto entre categorias
- cambiar `service_line`
- alterar una atribucion comercial
- cambiar tratamiento de `factoring`, FX o fees
- corregir clasificaciones historicas

Regla:

- cada reclasificacion debe indicar si es:
  - retroactiva
  - prospectiva
  - solo explicativa
- y debe dejar evidencia del antes y despues

### 16. Data quality como capability de negocio

No alcanza con checks tecnicos sueltos.

`Management Accounting` necesita data quality de negocio sobre:

- revenue sin anclas canonicas suficientes
- payroll sin costo fully-loaded confiable
- allocaciones incompletas o superpuestas
- gaps entre documento, pago y settlement
- FX faltante o inconsistente
- drift entre readers legacy y serving canonico
- scopes sin costo explicado

Regla:

- la data quality debe formar parte del cockpit del modulo, no vivir escondida solo en tooling de operaciones

### 17. Observabilidad financiera

El modulo necesita observabilidad orientada a control, no solo logs.

Indicadores minimos deseables:

- periodos cerrables vs cerrados
- periodos reabiertos
- porcentaje de costo explicado
- delta no explicado
- cantidad de overrides manuales
- latencia de materializacion
- freshness de snapshots
- cantidad de restatements

Regla:

- sin observabilidad operativa y semantica, el modulo escala solo en volumen, no en confianza

### 18. Escalabilidad de materializacion

El crecimiento de volumen no deberia obligar a recomputar todo en cada cambio.

La arquitectura debe contemplar:

- materializacion incremental
- rematerializacion por periodo
- rematerializacion por scope
- invalidacion selectiva
- snapshots versionados
- ejecucion de cargas pesadas fuera de limites serverless cuando corresponda

Regla:

- `Management Accounting` debe escalar por diseño de materializacion, no por tolerancia a jobs mas lentos

### 19. Driver model para budget

Un budget enterprise no deberia quedar solo como captura manual de montos agregados.

Debe evaluarse soporte para drivers como:

- headcount
- fee rate
- utilization
- mix de servicios
- spend category
- burn esperado por capacidad

Regla:

- el primer corte puede aceptar budget directo por monto
- pero la arquitectura debe reservar espacio para budget basado en drivers sin romper el contrato inicial

### 20. Forecast mas rico que extrapolacion lineal

La extrapolacion simple sirve como primer corte, pero no como destino final enterprise.

El modulo debe poder evolucionar hacia forecast que distinga:

- revenue committed
- revenue probable
- pipeline
- contratos recurrentes
- one-off work
- estacionalidad
- burn esperado restante

Regla:

- `forecast` no debe quedar amarrado para siempre a una sola heuristica lineal

### 21. Seguridad y sensibilidad de datos

El modulo cruza informacion especialmente sensible:

- salarios
- margenes
- fee splits
- shareholder balances
- rentabilidad por cliente
- decisiones de repricing o ajuste

Regla:

- la explainability detallada no necesariamente debe ser visible para todos los perfiles que pueden ver el summary agregado
- el modelo de acceso debe contemplar detalle vs agregado como decision explicita

### 22. Exportabilidad y trazabilidad externa

Una capability enterprise necesita poder salir del portal sin perder contrato.

Debe considerarse soporte para:

- export por periodo
- export por scope
- export de variance
- export de cierre
- paquetes reproducibles para auditoria interna o BI

Regla:

- exportar no debe requerir recomponer manualmente datasets desde multiples pantallas

### 23. Escalabilidad de dimensiones

Los scopes core actuales son suficientes para foundation, pero el modulo debe declarar como crecera si aparecen nuevas dimensiones.

Dimensiones futuras posibles:

- `campaign`
- `service`
- `country`
- `delivery_pod`
- `provider`
- `partner`

Regla:

- el modulo debe distinguir entre:
  - dimensiones core
  - dimensiones derivadas
  - dimensiones ad hoc
- no toda dimension nueva merece convertirse en scope canonico del serving principal

### 24. Contrato multi-moneda mas fuerte

No alcanza con conversion simple a CLP.

Debe definirse mejor:

- moneda funcional del modulo
- tasa canonica del periodo
- tasa del pago
- reconocimiento de ganancia o perdida cambiaria
- tratamiento de budget y forecast multi-moneda

Regla:

- multi-moneda no debe quedar repartido entre helpers locales sin politica de negocio declarada

### 25. Runbooks operativos del modulo

La robustez enterprise tambien depende de como se opera el modulo cuando algo falla.

Deben existir runbooks para:

- cierre fallido
- materializacion atrasada
- drift de allocations
- inconsistencia FX
- correccion de factoring
- reapertura controlada
- re-sync de snapshots

Regla:

- la operacion del modulo no debe depender de memoria conversacional o conocimiento tribal

### 26. Suite de pruebas orientada a negocio

No alcanza con tests de helpers aislados.

El modulo necesita escenarios de negocio cubiertos para:

- cierre normal
- reapertura y re-cierre
- payroll + expenses sin doble conteo
- factoring fee impact
- multi-moneda
- overrides manuales
- BU P&L
- budget vs actual
- forecast basico

Regla:

- la robustez del modulo debe medirse en semantica de negocio, no solo en cobertura tecnica

### 27. Mapa explicito de politicas economicas

Hay decisiones de negocio que no deberian quedar implícitas en código disperso.

Deben quedar institucionalizadas reglas como:

- que es `direct cost`
- que es `overhead`
- cuando un costo es atribuible
- como se reparte `shared overhead`
- como entra `factoring` al margen
- como se trata carga interna vs comercial

Regla:

- si una politica afecta el margen o el cierre, debe existir como decision documental explicita del modulo

### 28. Roadmap de madurez del modulo

La capability necesita un modelo de madurez visible para no mezclar fases de foundation con fases avanzadas.

Madurez sugerida:

1. foundation
2. reliable actual
3. controlled close
4. planning
5. variance and forecast
6. executive control tower

Regla:

- cada nueva lane debe poder ubicarse claramente dentro de ese roadmap
- asi se evita inflar el backlog con features valiosas pero fuera de secuencia

---

## Reliable Actual Foundation

Esta seccion formaliza la fase `reliable actual` del roadmap de madurez y define que significa, operativamente, que el `actual` de Management Accounting sea **confiable**. Cualquier capability downstream (planning, variance, forecast, control tower) debe construirse sobre un actual que cumpla estos criterios; no sobre snapshots parcialmente reconciliados o calculos sin cobertura de pruebas.

### Definicion de "actual confiable"

Un periodo contable es `actual-reliable` cuando sus numeros cumplen, simultaneamente, los cinco criterios siguientes:

1. **Reconciled.** Los movimientos bancarios del periodo estan matcheados contra sus `income_payments` / `expense_payments`. La conciliacion no depende exclusivamente del cierre mensual manual: el matching continuo debe mantener `is_reconciled = true` con lag maximo de 24 horas para movimientos con `payment_account_id` asignado.

2. **Fully-loaded.** El costo laboral refleja compensacion + social security + provisiones legales (vacaciones, indemnizacion, mutual variable). Un actual sin provisiones subestima el costo real en ~12.5% y rompe el contrato de margen operativo.

3. **Period-aware.** Las transacciones estan asignadas al periodo correcto segun reglas de cierre documentadas. Mutaciones fuera de ventana estan gobernadas por un lifecycle formal (open → calculated → reconciled → closed) con locking y state machine explicito.

4. **Traceable.** Cada linea del P&L puede explicarse en fuentes aguas arriba: invoice → payment → bank row, o expense → allocation rule → cost center. No hay agregaciones opacas que impiden la auditoria inversa.

5. **Tested & transactional.** El nucleo de persistencia (income/expense CRUD, reconciliation, payment ledger) tiene cobertura de tests sobre sus code paths criticos y opera dentro de transacciones atomicas con idempotency keys para prevenir doble escritura por retry.

### Pre-requisitos (foundation block)

Los cinco criterios anteriores descansan en un bloque fundacional explicito:

| Criterio | Fundacion requerida | Task owner |
|---|---|---|
| Reconciled | Postgres-only reconciliation cutover + continuous auto-match | `TASK-179`, `TASK-401` |
| Fully-loaded | Labor provisions en `member_capacity_economics` y `operational_pl` | `TASK-176` |
| Period-aware | Locking + state machine en `reconciliation_periods` | `TASK-174` (slice reconciliation) |
| Traceable | Scope organization en `operational_pl_snapshots` + tracing de allocations | `TASK-167` (superseded by `TASK-192`) |
| Tested & transactional | Test coverage sobre `postgres-store-slice2`, `postgres-reconciliation`, `payment-ledger` + bulk atomicity + idempotency | `TASK-174`, `TASK-175` |

### Gate de readiness para capabilities downstream

Una capability de Management Accounting enterprise (planning, variance, forecast, control tower, financial costs integration) **no puede declararse ready** mientras alguno de los siguientes items siga pendiente:

- [x] `TASK-174` — Finance data integrity: bulk atomicity, idempotency keys, SELECT FOR UPDATE NOWAIT en reconciliation period, payment ledger transactional
- [x] `TASK-175` — Finance core test coverage: 64+ tests sobre `postgres-store-slice2`, `postgres-reconciliation`, `payment-ledger`, P&L E2E
- [x] `TASK-179` — Finance reconciliation Postgres-only cutover: zero dual-write BigQuery en reconciliation paths
- [x] `TASK-401` — Bank reconciliation continuous matching: motor standalone + cron diario para lag sub-24h
- [x] `TASK-167` / `TASK-192` — Operational P&L con scope `organization` (superseded, efectivamente cerrado en runtime)
- [ ] `TASK-176` — Labor provisions fully-loaded cost (Chile: vacaciones 4.17%, indemnizacion 8.33%, mutual variable ~1.5%)

Mientras el ultimo item siga abierto, el `actual` tecnicamente sigue subestimando costo laboral. Las fases posteriores del roadmap (`controlled close`, `planning`, `variance and forecast`) pueden prepararse y disenarse en paralelo, pero su corte de ready depende de cerrar este gate en su totalidad.

### Secuencia recomendada de cierre

La secuencia canonica para llevar el modulo a `reliable actual` — y que siente precedente para como debe abrirse cualquier nueva lane que toque el nucleo economico — es:

1. **Integridad transaccional primero** (`TASK-174`). Sin locking ni idempotency, cualquier refactor posterior introduce riesgo de double-entry.
2. **Test coverage sobre el nucleo** (`TASK-175`). Ninguna refactorizacion del layer de persistencia debe hacerse sin red de seguridad.
3. **Cutover Postgres-only** (`TASK-179`). Un actual con dual-write es un actual con dos verdades potenciales.
4. **Continuous matching** (`TASK-401`). Sin auto-match, el lag del actual sigue siendo mensual, incompatible con dashboards intra-periodo.
5. **Fully-loaded labor cost** (`TASK-176`). Cierra la ultima fuente de subestimacion material en el P&L.

Los pasos 1-4 ya cerraron (ver TASK-392 en `complete/`). El paso 5 es el unico gap activo del gate.

---

## Checklist de completitud enterprise

Un modulo de `Management Accounting` no deberia considerarse enterprise-complete mientras falte alguno de estos bloques:

- actual consolidado confiable
- fully-loaded labor cost completo
- P&L por BU
- cierre gobernado con versionado y mutabilidad clara
- budget con estados y versionado
- variance y forecast
- factoring y costos financieros absorbidos en margen real
- explainability y auditabilidad
- overrides gobernados
- RBAC por accion critica
- data quality y observabilidad propias
- runbooks operativos
- testing de escenarios de negocio

Regla final:

- `enterprise` no significa "muchas pantallas"
- significa que el modulo puede escalar en volumen, confianza, gobierno y trazabilidad sin romper su semantica

---

## Orden recomendado de evolucion

### Fase 1 - Cerrar la base del actual

1. fully-loaded cost completo
2. P&L por BU
3. consolidar explainability y health semantica
4. endurecer contrato de cierre de periodo
5. empujar consumers criticos a serving Postgres-first

### Fase 2 - Abrir la capa plan

1. budgets por `organization`, `business_unit` y `client` grande
2. versionado y estados del budget
3. template desde actual
4. RBAC de plan / approve / lock

### Fase 3 - Abrir la capa control

1. variance mensual
2. variance YTD
3. forecast year-end
4. alertas ejecutivas
5. absorcion explicita de factoring y financial costs dentro del margen real

### Fase 4 - Elevar el modulo

1. consolidar la surface como capability formal de `Management Accounting`
2. si hace falta, dar identidad UI mas clara dentro de `Finance`
3. solo despues evaluar si necesita root navegable propio
4. consolidar cockpit ejecutivo + workspace analitico como dos capas legibles

---

## Rutas y surface recomendadas

### Regla de routing

No abrir un route group top-level nuevo mientras la capability siga dependiendo de `Finance`.

Recomendacion:

- mantener root en `/finance/intelligence`
- permitir crecimiento a sub-surfaces especializadas:
  - `/finance/intelligence`
  - `/finance/intelligence/budgets`
  - `/finance/intelligence/variance`
  - `/finance/intelligence/forecast`
  - `/finance/intelligence/business-units`

### Regla UX

La home del modulo debe responder primero:

- como cerro el periodo
- donde ganamos o perdimos
- contra que plan vamos
- que alertas requieren accion

No debe empezar por CRUD.

---

## Relacion con factoring y otros financial costs

Factoring, fees financieros, FX y settlement no convierten el modulo en contabilidad legal.

Al contrario:

- son inputs legitimos del costo financiero operativo
- deben alimentar `Finance` como hecho transaccional
- y luego entrar a `Management Accounting` como parte del actual y del margen real

Regla:

- `factoring` pertenece primero a `Finance`
- su impacto en margen, caja y costo financiero pertenece a `Management Accounting`

---

## Criterio para no abrir todavia contabilidad legal

Solo deberia abrirse una lane separada de `financial accounting` si aparece alguno de estos gatillos:

1. Greenhouse debe emitir o persistir asientos contables formales
2. Greenhouse debe mantener plan de cuentas como source of truth
3. Greenhouse debe producir balance general o estados financieros legales
4. Greenhouse reemplaza o absorbe parte del rol de un ERP contable
5. Nubox u otro sistema pasa a ser integrado como subledger/GL formal y no solo como documento tributario

Mientras eso no ocurra, abrir un modulo "Accounting" seria sobre-modelar el sistema y confundir el boundary.

---

## Definicion final

La capability financiera que Greenhouse necesita institucionalizar ahora es:

- **Arquitectura:** `Management Accounting`
- **Lectura funcional:** `Contabilidad de costos`
- **Surface recomendada:** `Finance > Economia operativa`

Su trabajo es transformar hechos financieros, laborales y operativos ya existentes en:

- costo real explicable
- margen real por scope
- cierre gobernado
- plan vs actual
- forecast y alertas para decision

No debe convertirse todavia en contabilidad legal.
