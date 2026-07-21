# TASK-1474 — Globe Studio Workbench Flow

## Primary flow

1. Operador abre o crea campaña y completa brief/referencias autorizadas.
2. El sistema valida rights, responsabilidades y template antes de estimar.
3. Operador revisa ruta propuesta, límites y Studio Credits shadow.
4. Un actor autorizado aprueba el estimate; el approval queda ligado a versión y expiración.
5. El command de ejecución entra al submission fence y expone attempts/progreso.
6. Candidates aparecen en el dock; el operador compara, anota, ramifica o rechaza.
7. Candidate aprobado pasa QA/rights/release gates.
8. El sistema emite artifact manifest y delivery package; Globe publica sólo la proyección autorizada.

## Recovery branches

- Estimate expired: recalcular; jamás reutilizar approval viejo.
- Rights blocked: volver a assets/consent sin perder brief.
- Budget blocked: cambiar scope/ruta y crear estimate nuevo.
- Provider failed: mostrar attempt; retry/fallback requiere policy y conserva ruta real.
- Review rejected: crear branch/candidate nuevo; no sobrescribir evidencia.
- Release revoked: invalidar acceso futuro y conservar manifest/audit.

## Accessibility and navigation

- Orden de foco: header → canvas actions → context trigger/rail → candidate dock → review/release.
- Sidecar móvil devuelve foco al trigger y no deja acciones críticas detrás de un overlay.
- Cambios async importantes usan live region moderada; el progreso visual no es la única señal.

## Access and evidence branches

- Audience redactada: conserva provider/model/version y credits del run permitidos, oculta cost/margin/IP.
- Capability denied: explica quién puede aprobar o revisar sin filtrar datos cross-workspace.
- Scenario markers y baseline se definen en la visual direction; first-fold se acepta antes de cableado total.
