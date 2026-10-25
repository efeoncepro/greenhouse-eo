# TASK-2067 — ejecución del núcleo OTP por invitación

Decisión autorizada en sesión por Julio, coordinada por root con peer Rooms. La implementación sigue el ADR
`docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md`. La primera propuesta issue-on-open fue
reemplazada antes del código por correo único con enlace+OTP; esa propuesta no se implementó.

1. Congelar contrato con root/peer: S2S, canonical invitation, email único, proof ES256 limitado sin SSO global.
2. Core por puertos y store transaccional: HMAC, generación, cooldown, budgets e idempotencia; entrega fuera de
   transacción con CAS de generación; comparación/consumo atómico; recheck authority antes de firma.
3. Store memoria y PostgreSQL; migración creada por tooling; permisos y GC SECURITYDEFINER bounded; seed correoOFF.
4. Adapter de correo con sendEmail token_sensitive, template/copy propios y preview sintético.
5. Verificación focal, SQL efímero con cleanup, render1280/390 y regresión delivery; documentar evidencia.
6. Root integra HTTP authority, RP authentication, KMS, flags y router; peer2066 integra consumer guest.
7. E2E real y promoción sólo con configuración/autorización y receipts. Task permanece in-progress hasta eso.

Delegación: esta unidad es el subagente scope_discovery de la sesión Auth; root y los agentes auth/UI trabajan
paralelo con ownership explícito. No se abre otro subagente ni worktree para un core acoplado transaccionalmente.
No se modifican tablas identity/Rooms. No hay envío real ni cloudapply en esta ejecución.
