# TASK-1483 — Globe Credits Operations Workbench Visual Direction

## Decision

Adoptar Runway Control Plane como dirección repo-native de Greenhouse: una lectura dominante de capacidad,
riesgo y evidencia con una sola acción gobernada, sin metáforas monetarias.

## Desktop target

A 1440×1000, capacidad y estado ocupan el first fold; operaciones/pools usan list-detail y el ledger conserva
densidad auditable debajo. El sidecar mantiene el contexto sin cubrir la cifra primaria.

## Mobile target

A 390×844, la cifra, estado y período siguen visibles; inventario y detalle se convierten en drawer temporal
con focus restore y sin overflow horizontal.

## Token mapping

Superficies, elevation, color semántico, typography, spacing y motion provienen de AXIS/Greenhouse. El runway
reusa `SurfaceRecipe operationalWorkbench`, primitives canónicas y copy centralizada.

## Anti-patterns

No usar wallets, monedas, tickers, donuts decorativos, card wallpaper, count-up desde null, raw errors, valores
desconocidos convertidos en cero ni actions sin capability/precondition.

## Benchmark and intent

Dirección Greenhouse-native para una capacidad de Globe: conserva el concepto Runway Control Plane, pero se
implementa con la shell y primitives del portal Greenhouse. Debe sentirse como capacidad creativa gobernada, no
banca, crypto ni un dashboard genérico de cards.

## Alternatives

1. **Finance Console:** densa y auditable, pero vuelve monetary lo que no es dinero.
2. **Token Wallet:** familiar, pero semánticamente falsa y riesgosa para pricing/derechos.
3. **Capacity Observatory / Runway Control Plane — selected:** un plano dominante de capacidad + horizonte, rail
   de riesgo y ledger. Runway Control Plane es la composición; Capacity es la identidad de suite.

## Selected composition

- Un runway horizontal dominante: available, reserved, consumed y, sólo con policy aprobada, expiring.
- Context rail con low balance, stuck hold, anomaly y projection drift; cada estado tiene evidence/recovery.
- Pools y sub-budgets como navegador jerárquico, no wallets separadas.
- Ledger denso debajo; sidecar explica un pool/grant/reservation/entry sin perder contexto.
- Una sola acción dominante según capability. Costo vendor/margen sólo en audience Finance autorizada.

## Capacity Observatory application

ADR-015 y TASK-1630 poseen el contrato de frontera y TASK-1586 los DTOs de operación. TASK-1485 sólo gobierna el
payload cliente de Globe y no es dependencia normativa de esta superficie Greenhouse. Aquí los créditos se
presentan como capacidad que conecta disponible, límite, reserva, consumo, proyección y evidencia.

El runway debe responder, en una sola lectura, cuatro preguntas:

1. ¿Cuánta capacidad está disponible ahora?
2. ¿Qué parte está comprometida por reservas y asignaciones?
3. ¿Qué consumo está confirmado y qué consumo sólo está proyectado?
4. ¿Qué evento, pool, grant, proyecto o run explica cada cambio?

El Workbench usa `Runway Plane`, `Risk Rail`, `Allocation Navigator`, `Evidence Ledger` y `Governed Command Dock`.
El `Credit Unit` nunca aparece sin fase; el `Credit Phase` nunca aparece sin ámbito; los valores `partial`, `stale`
o `unknown` nunca se representan como cero.

La firma visual se traduce en un horizonte de capacidad dentro de `CompositionShell`, segmentos tokenizados para
reservas/asignaciones y bandas discontinuas para forecast. El Workbench no usa wallet, coin, token, ticker, precio
ni lenguaje de checkout.

En esta superficie la densidad es operacional: los números usan tabular numerals, cada estado combina icono/label/texto
y el runway tiene una alternativa textual o tabular exacta. English y Español cambian copy, no geometría, fases,
jerarquía ni significado.

## Responsive and tokens

- Desktop: command-center + list-detail; rail in-flow.
- Mobile 390: summary sticky, lista->detalle, sidecar temporal; nunca tabla aplastada ni page overflow.
- Reusar tokens AXIS proyectados por Greenhouse, typography/spacing MUI/Vuexy y primitives canónicas del portal;
  status siempre icono+label+texto, no sólo color.
- Créditos como enteros formateados con label accesible completo; IDs copyable/wrappable.

## Signature and anti-patterns

Firma: el horizonte de runway conecta capacidad actual, riesgo y evidencia sin fingir equivalencia monetaria.
La navegación puede decir `Capacity`; `Studio Credits` queda reservado para contratos técnicos, documentación o
referencias explícitas a la unidad.
Evitar card wallpaper, counters animados desde null, donut decorativo, ticker financiero, brillo crypto,
provider logos como price units y actions sin reason/precondition.

## Fidelity and first-fold gate

- Implementar con `CompositionShell` recipe `operationalWorkbench`, `WorkbenchHeader`, `SignalStrip`,
  `OperationalSection`, `InventoryList`, `SelectionRow`, `AdaptiveSidecarLayout`, `ContextualSidecar`,
  `ContextCommandBar` y `Dialog`. El runway es composición route-local hasta demostrar un segundo consumer; no
  nace una primitive base por anticipación.
- Baseline: `greenhouse.admin.globe-credits-operations-workbench`, después de aceptar first fold healthy + low.
- Markers: `globe-credits-workbench`, `credits-runway`, `credits-risk-rail`, `credits-pools`,
  `credits-ledger`, `credits-detail`, `credits-command-preview`, `credits-state-*`.
