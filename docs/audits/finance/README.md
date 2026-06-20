# Finance Audits

Auditorias tecnicas y operativas versionadas del dominio Finance, incluyendo caja, pagos, conciliacion, P&L operativo, cost attribution, cierre de periodo, tax/fiscal boundaries y controles.

## Auditorias

- [FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20](FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md) — refresh focal del hallazgo F9: 206 rutas Finance/Admin/Cost Intelligence revisadas por tenant context, metodos write y capability fina. Sin exposicion anonima general; riesgo principal en mutaciones de pagos, tesoreria, DTE, syncs y materializadores autorizadas por route-group amplio.
- [FINANCE_DOMAIN_AUDIT_2026-06-20](FINANCE_DOMAIN_AUDIT_2026-06-20.md) — revision end-to-end: rutas, syncs, reactive projections, BD viva. Finance transaccional sano (drift 0), pero management accounting/cost attribution degradado por handlers reactivos fallidos; foco en sync infra, rematerializacion, backlog de clasificacion, controles API e issues abiertos.
- [FINANCE_DOMAIN_AUDIT_2026-05-03](FINANCE_DOMAIN_AUDIT_2026-05-03.md)
- [TASK-557.1_LEGACY_QUOTES_AUDIT_2026-05-07](TASK-557.1_LEGACY_QUOTES_AUDIT_2026-05-07.md)
