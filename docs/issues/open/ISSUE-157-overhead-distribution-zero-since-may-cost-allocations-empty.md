# ISSUE-157 — La distribución de overhead está en cero desde mayo y `cost_allocations` está vacía: el margen de todos los clientes es bruto sin absorción, en silencio

- **Ambiente:** producción
- **Detectado:** 2026-08-15, verificando si el margen de Berel era computable (auditoría Growth SEO/AEO)
- **Estado:** `open`
- **Dominio:** Finance / contabilidad de gestión — invocar `greenhouse-finance-accounting-operator`
- **Relacionado:** `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` (spec raíz del modelo económico) ·
  `TASK-806` (GTM investment P&L, dueña de las VIEWs) · `EPIC-022` (lo destapó al pedir el margen
  de un cliente)

---

## Síntoma

Todo margen de cliente que hoy muestra la plataforma es **margen bruto sin absorción de overhead**, y
nada lo declara como tal. El full absorption costing que el modelo económico canónico promete no es
computable para **ningún** cliente.

## Evidencia

Dos hechos medidos contra la base real:

1. **`member_capacity_economics.shared_overhead_target` promedia 0** en mayo, junio, julio y agosto de
   2026 — contra **759.543 CLP/FTE en abril** y 337.414 en febrero. La distribución dejó de
   computarse en algún punto entre abril y mayo.
2. **`greenhouse_finance.cost_allocations` está completamente vacía**: 0 filas, todos los períodos.
   Es la tabla de la que `computeClientEconomicsSnapshots` lee `directCosts`
   (`src/lib/finance/postgres-store-intelligence.ts:487-500`).

## Por qué importa

- **El margen que se reporta es más alto que el real, para todos.** Sin overhead absorbido, un cliente
  que rinde 60% bruto puede estar bastante más abajo en margen completo. Y el piso duro de la práctica
  (45%) se evalúa contra un número que hoy no incluye la carga indirecta.
- **La diferencia entre los dos umbrales no es cosmética.** En el análisis de Berel, el punto de
  quiebre del piso de 45% pasa de **1,93 FTE** (bruto) a **0,98 FTE** (con overhead al último nivel
  conocido de abril). Es la mitad. Cualquier decisión de pricing tomada sobre el número bruto está
  usando el umbral equivocado.
- **Falla en silencio.** No hay señal, no hay degradación visible, y la UI no puede distinguir "sin
  overhead porque no aplica" de "sin overhead porque el cálculo dejó de correr".

## Lo que SÍ funciona y conviene no romper

La degradación honesta del lado de la presentación está bien resuelta:
`sanitizeSnapshotForPresentation` (`src/lib/finance/client-economics-presentation.ts:11-14`) detecta
`revenue > 0 && totalCosts <= 0` y **anula el margen** en vez de mostrar un 100% falso. Por eso el
"100%" de Berel nunca llegó a una pantalla. El mecanismo de honestidad opera; lo que falta es el
insumo.

## Causa raíz

**No investigada.** Este issue documenta el síntoma con evidencia; el diagnóstico es trabajo de
Finance. Tres hipótesis a descartar en orden:

1. Una política de distribución (`overhead_distribution_policy` del spec) que nunca se creó o quedó
   sin período vigente — el spec raíz la declara como tabla nueva y **ninguna de sus 6 tablas existe
   en `migrations/`**, así que la V0 puede estar apoyada en otro mecanismo que se apagó.
2. Un job o proyección que dejó de correr entre abril y mayo de 2026 (buscar en el changelog y en el
   ledger de flags qué cambió en esa ventana).
3. Un cambio de datos aguas arriba: si el overhead se derivaba de gastos clasificados por
   `economic_category`, una reclasificación pudo dejar el pool en cero.

## Verificación al cerrar

- `shared_overhead_target` vuelve a ser distinto de cero para los períodos con actividad.
- `cost_allocations` deja de estar vacía, o se declara explícitamente que ese no es su camino y se
  documenta cuál es.
- **Señal de reliability nueva**: overhead distribuido en cero para un período con costos y gastos
  registrados debe ser un `error` visible, no un silencio. Es exactamente el tipo de fallo que este
  repo canoniza como inaceptable — un número que se ve sano porque le falta un sumando.
- Y una nota para quien lo tome: al recomputar, **los márgenes históricos de todos los clientes van a
  bajar**. Eso no es una regresión: es la corrección. Conviene comunicarlo antes de que alguien lo
  lea como deterioro del negocio.

## Cómo se descubrió

Nadie lo estaba buscando. Salió de preguntar si el margen de un cliente puntual era computable: el
motor respondió que sí, y al mirar de qué está hecho ese número apareció que le falta un sumando
desde hace cuatro períodos.
