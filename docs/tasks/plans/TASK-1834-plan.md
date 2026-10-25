# TASK-1834 — plan de ejecución: Rooms primero

Fecha: 2026-10-25. Goal confirmado por Julio; subagentes y coordinación con Rooms autorizados.
Checkout compartido develop; sin worktrees ni push/deploy automáticos.

## Audit

- Issuer vivo: login, metadata y JWKS HTTP 200; PostgreSQL, KMS y llave activa saludables. Sólo scopes MCP.
- Baseline: 442 tests Auth PASS, 7 skip de integración; pg:doctor PASS. No valida el nuevo carril.
- El subject port interno crea contexto MCP: la identidad first-party necesita su propia resolución vigente.
- Las tablas OAuth actuales exigen gv; el nuevo carril usa persistencia separada, sin consentimientos ficticios.
- V4 de TASK-1964 es la fuente visual; Auth conserva su adapter HTML/CSS/JS, CSP y tokens AXIS.
- La peer conserva TASK-2062 y runtime Rooms. No editar sus archivos concurrentes.

## Decisiones y ownership

Canon: [Rooms primero y login V4](../../architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md).

- TASK-1834: foundation; auth_discovery implementa protocolo, registro, identidad, stores y wiring.
- TASK-2063: migración Greenhouse preservada; scope_discovery mueve criterios y dependencias.
- TASK-2064: login V4 Auth; login_discovery posee páginas, controladores, assets, CSS y QA visual.
- TASK-2065: consumer Rooms, propiedad de la peer; binding, entry/callback, sesión y permisos.
- TASK-2066/2067: invitaciones Rooms y método OTP issuer, separados y coordinados.
- Raíz: ADR, plan, CLI/API, índices, integración, verificación y handoff.

## Secuencia

1. Reorientar TASK-1834 y preservar el contrato completo de Greenhouse en TASK-2063.
2. Crear migración aditiva y tipos de RP/code/handle. Probar SQL aislado; no aplicar cambios a Cloud SQL
   compartido como si fuera una base local. Flag OFF no consulta tablas ausentes ni rompe MCP.
3. Implementar registro, identity port, authorize/token/introspect/revoke y metadata coherentes.
4. Exponer el command por CLI y API admin con capability existente; secreto en destino protegido, no logs.
5. Portar V4 y revisar first fold desktop/móvil; después estados, CSP, teclado y reduced motion.
6. Integrar Rooms contra el contrato congelado y un segundo RP sintético. Callback sin aprovisionamiento.
7. Verificar regresiones MCP, SQL/concurrencia, tipos/lint/build y contratos de workers; QA visual premium.
8. Sincronizar evidencia y criterios. Si falta configuración/migración/deploy/readback, mantener rollout pendiente.

## UI enterprise-ready guard

La fuente V4 ya está elegida; eso no acepta su port. TASK-2064 exige mapping/readiness, first fold revisado,
GVC desktop/390px, foco/teclado, reduced motion, CSP, ausencia de errores y overflow. Branding sólo desde registro
confiable. No copiar controles de contraseña o Google sin backend. La animación nunca retrasa navegación.

## Controles de cierre

Código, secreto, redirect y audiencia no cruzan RPs. First-party rechaza scopes y recursos MCP; DCR no eleva
clase. Revocar sesión, vínculo, perfil o enrollment entre authorize/token/introspect corta acceso.
Logout local no acredita TASK-1840. Los skips se reportan como pruebas no ejecutadas.

El steering posterior de Rooms define un solo correo con enlace y código y un formulario de código en Rooms.
TASK-2067 debe resolver esa prueba RP-scoped sin fabricar cookie SSO cross-host ni afirmar MFA; contrato separado.
