# GREENHOUSE_DASHBOARD_UX_GAPS_V1

## Brechas detectadas
- `Capacity` tiene buena data pero mala distribución: la versión actual fragmenta summary, roster e insights en una composición que ocupa demasiado alto y deja aire poco útil.
- El dashboard usa grids demasiado rígidos en varias capas. Cuando sobra espacio o falta espacio, las cards no siempre se ensanchan o compactan con naturalidad.
- El template actual funciona mejor con spaces ricos como `Efeonce`, pero todavía no define un contrato claro de densidad para spaces `snapshot`, `standard` y `rich`.
- Algunas secciones siguen compitiendo por el mismo peso visual aunque no todas merecen la misma jerarquía en todos los spaces.
- `Delivery`, `Quality`, `Tooling` y `Capacity` ya son reutilizables en data, pero no lo son del todo en layout. Cada una resuelve su grid por separado.
- El dashboard general sigue siendo demasiado largo para algunos spaces; falta una regla explícita para cuándo condensar, agrupar o redistribuir superficies.

## Matriz de soluciones

### Brecha 1: Capacity sobredisuida
- Opcion A: Mantener dos cards separadas y solo pulir estilos.
  - Pros: cambio barato.
  - Contras: no resuelve la distribución raíz.
  - Esfuerzo: 2/5
  - Impacto: 2/5
- Opcion B: Unificar `Capacity` en una sola card reusable con summary strip, roster responsive en grid y insights compactos al pie.
  - Pros: reduce altura, mejora lectura, escala a cualquier cantidad de miembros.
  - Contras: exige refactor del componente.
  - Esfuerzo: 3/5
  - Impacto: 5/5

### Brecha 2: Grids rígidos
- Opcion A: Seguir con `repeat(n, 1fr)` según breakpoints.
  - Pros: simple.
  - Contras: sigue generando cards apretadas o aire muerto.
  - Esfuerzo: 1/5
  - Impacto: 2/5
- Opcion B: Migrar a grids con `auto-fit / minmax` en cards KPI, focus y bloques operativos.
  - Pros: responde mejor al espacio real disponible y hace el dashboard más reusable.
  - Contras: requiere recalibrar varios `minmax`.
  - Esfuerzo: 3/5
  - Impacto: 5/5

### Brecha 3: Falta contrato de densidad por space
- Opcion A: Mantener solo `snapshot` vs `non-snapshot`.
  - Pros: ya existe parcialmente.
  - Contras: es insuficiente para spaces ricos como `Efeonce`.
  - Esfuerzo: 1/5
  - Impacto: 3/5
- Opcion B: Introducir `layoutMode = snapshot | standard | rich` en el orquestador.
  - Pros: hace explícita la estrategia de layout y permite crecer sin hardcodes por cliente.
  - Contras: requiere revisar algunos grids y pesos.
  - Esfuerzo: 3/5
  - Impacto: 5/5

### Brecha 4: Peso visual homogéneo
- Opcion A: Ajustar spacing y typography sin cambiar orden.
  - Pros: rápido.
  - Contras: mejora poco la lectura.
  - Esfuerzo: 2/5
  - Impacto: 2/5
- Opcion B: Reordenar por jerarquía: hero, indicadores rápidos, operación, señales de delivery/calidad, capacity/tooling, cartera bajo atención.
  - Pros: la lectura ejecutiva mejora inmediatamente.
  - Contras: obliga a tocar layout general.
  - Esfuerzo: 3/5
  - Impacto: 4/5

### Brecha 5: Reutilización parcial del layout
- Opcion A: dejar que cada sección siga definiendo su propio grid.
  - Pros: menos cambios inmediatos.
  - Contras: mantiene divergencia visual.
  - Esfuerzo: 1/5
  - Impacto: 2/5
- Opcion B: mover la lógica de composición al orquestador y usar patrones de grid compartidos en el dashboard.
  - Pros: escala mejor para cualquier space y cualquier densidad de data.
  - Contras: requiere disciplina de implementación.
  - Esfuerzo: 4/5
  - Impacto: 5/5

## Solución recomendada
- Combinar `B` en todas las brechas críticas: `CapacityOverviewCard` unificada, grids `auto-fit/minmax`, `layoutMode` explícito y jerarquía más clara desde el orquestador.
- Esta combinación supera al resto porque ataca la causa estructural, no solo el síntoma visual. Además deja un contrato reusable para cualquier space sin depender de la cantidad de datos que tenga hoy.

## Plan final listo y documentado y empieza a ejecutar
1. Rediseñar `CapacityOverviewCard` como una sola card reusable con:
   - summary strip arriba
   - roster en grid responsive
   - insights compactos abajo
   - estado de cobertura visible en header
2. Introducir `layoutMode = snapshot | standard | rich` en el orquestador.
3. Migrar grids del dashboard a `auto-fit / minmax` para que las cards se ensanchen o compacten según el espacio libre.
4. Ajustar el orden visual del dashboard para spaces ricos:
   - hero
   - top stats
   - KPIs/focus
   - operación
   - delivery + quality
   - capacity + tooling
   - projects
5. Validar en `space-efeonce` como benchmark y mantener compatibilidad con spaces de baja densidad.
