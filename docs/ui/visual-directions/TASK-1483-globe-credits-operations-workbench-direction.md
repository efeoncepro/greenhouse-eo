# TASK-1483 — Globe Credits Operations Workbench Visual Direction

## Benchmark and intent

Dirección repo-native basada en Orbital Threshold de Globe y en controles operativos enterprise: debe sentirse
como capacidad creativa gobernada, no banca, crypto ni un dashboard genérico de cards.

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

TASK-1485 posee el contrato normativo de Credit Unit, Credit Phase y Capacity Context. Este Workbench es su
composición operacional completa: aquí los créditos dejan de ser metadata y se convierten en el plano de capacidad
que conecta disponible, límite, reserva, consumo, proyección y evidencia.

El runway debe responder, en una sola lectura, cuatro preguntas:

1. ¿Cuánta capacidad está disponible ahora?
2. ¿Qué parte está comprometida por reservas y asignaciones?
3. ¿Qué consumo está confirmado y qué consumo sólo está proyectado?
4. ¿Qué evento, pool, grant, proyecto o run explica cada cambio?

El Workbench usa `Runway Plane`, `Risk Rail`, `Allocation Navigator`, `Evidence Ledger` y `Governed Command Dock`.
El `Credit Unit` nunca aparece sin fase; el `Credit Phase` nunca aparece sin ámbito; los valores `partial`, `stale`
o `unknown` nunca se representan como cero.

La firma visual **Horizon + Orbit** se traduce aquí en un horizonte de capacidad, segmentos orbitales para reservas y
asignaciones, pulso breve durante consumo y bandas discontinuas para forecast. El Workbench no usa wallet, coin,
token, ticker, precio ni lenguaje de checkout.

En esta superficie la densidad es operacional: los números usan tabular numerals, cada estado combina icono/label/texto
y el runway tiene una alternativa textual o tabular exacta. English y Español cambian copy, no geometría, fases,
jerarquía ni significado.

## Responsive and tokens

- Desktop: command-center + list-detail; rail in-flow.
- Mobile 390: summary sticky, lista->detalle, sidecar temporal; nunca tabla aplastada ni page overflow.
- Reusar color/typography/spacing de la shell Globe; status siempre icono+label+texto, no sólo color.
- Créditos como enteros formateados con label accesible completo; IDs copyable/wrappable.

## Signature and anti-patterns

Firma: el horizonte de runway conecta capacidad actual, riesgo y evidencia sin fingir equivalencia monetaria.
La navegación puede decir `Capacity`; `Studio Credits` queda reservado para contratos técnicos, documentación o
referencias explícitas a la unidad.
Evitar card wallpaper, counters animados desde null, donut decorativo, ticker financiero, brillo crypto,
provider logos como price units y actions sin reason/precondition.

## Fidelity and first-fold gate

- Implementar con patterns propios del stack Globe. `Runway Plane`, `Risk Rail`, `Pool Navigator`,
  `Evidence Ledger` y `Governed Command Panel` entran al registry gobernado desde Greenhouse como `candidate`
  y se promueven con evidencia; no heredan patterns Greenhouse.
- Baseline: `globe.credits-operations-workbench`, después de aceptar first fold healthy + low balance.
- Markers: `globe-credits-workbench`, `credits-runway`, `credits-risk-rail`, `credits-pools`,
  `credits-ledger`, `credits-detail`, `credits-command-preview`, `credits-state-*`.
