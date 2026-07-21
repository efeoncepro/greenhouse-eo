# TASK-1483 — Globe Credits Operations Workbench Visual Direction

## Benchmark and intent

Dirección repo-native basada en Orbital Threshold de Globe y en controles operativos enterprise: debe sentirse
como capacidad creativa gobernada, no banca, crypto ni un dashboard genérico de cards.

## Alternatives

1. **Finance Console:** densa y auditable, pero vuelve monetary lo que no es dinero.
2. **Token Wallet:** familiar, pero semánticamente falsa y riesgosa para pricing/derechos.
3. **Runway Control Plane — selected:** un plano dominante de capacidad + horizonte, rail de riesgo y ledger.

## Selected composition

- Un runway horizontal dominante: available, reserved, consumed y, sólo con policy aprobada, expiring.
- Context rail con low balance, stuck hold, anomaly y projection drift; cada estado tiene evidence/recovery.
- Pools y sub-budgets como navegador jerárquico, no wallets separadas.
- Ledger denso debajo; sidecar explica un pool/grant/reservation/entry sin perder contexto.
- Una sola acción dominante según capability. Costo vendor/margen sólo en audience Finance autorizada.

## Responsive and tokens

- Desktop: command-center + list-detail; rail in-flow.
- Mobile 390: summary sticky, lista->detalle, sidecar temporal; nunca tabla aplastada ni page overflow.
- Reusar color/typography/spacing de la shell Globe; status siempre icono+label+texto, no sólo color.
- Créditos como enteros formateados con label accesible completo; IDs copyable/wrappable.

## Signature and anti-patterns

Firma: el horizonte de runway conecta capacidad actual, riesgo y evidencia sin fingir equivalencia monetaria.
Evitar card wallpaper, counters animados desde null, donut decorativo, ticker financiero, brillo crypto,
provider logos como price units y actions sin reason/precondition.

## Fidelity and first-fold gate

- Implementar con patterns propios del stack Globe. `Runway Plane`, `Risk Rail`, `Pool Navigator`,
  `Evidence Ledger` y `Governed Command Panel` entran al registry gobernado desde Greenhouse como `candidate`
  y se promueven con evidencia; no heredan patterns Greenhouse.
- Baseline: `globe.credits-operations-workbench`, después de aceptar first fold healthy + low balance.
- Markers: `globe-credits-workbench`, `credits-runway`, `credits-risk-rail`, `credits-pools`,
  `credits-ledger`, `credits-detail`, `credits-command-preview`, `credits-state-*`.
