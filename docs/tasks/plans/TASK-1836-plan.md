# TASK-1836 — plan de ejecución 2026-09-05

Objetivo aprobado por operador; `pnpm codex:task-hook TASK-1836` ejecutado en develop. Subagentes autorizados expresamente por el operador; hook repetido con `--subagents`.
Ownership paralelo: OAuth/consent, OIDC/HTTP, identidad/enrolamiento; integración y persistencia a cargo del agente principal. WIP ajeno documental preservado. ADR de
contexto interno formaliza D1–D7 de la task corregida; cambios locales reversibles antes de aplicar runtime.

1. Contratos/ADR y migrations aditivas: contexto interno, transacciones upstream, procedencia de sesión y
   contexto/authTime en OAuth. Reutilizar DB wrapper, stores y primitives de identidad; no nuevo deployable.
2. Resolver/contextos + enrolamiento gobernado: pruebas de grant, identidad, ambiente, cliente y revocación.
   Auth-server no escribe core; identity commands poseen esa frontera. Contextos inicialmente sin cache positivo.
3. OIDC upstream: state/nonce/PKCE/cookie de transacción, consumo de un uso, issuer/tenant/aud/firma,
   enlace canónico y sesión primary; flags OFF. Config Entra/secret sólo mediante mechanisms existentes.
4. OAuth y reader: contexto inmutable en code/refresh/consent y token firmado; refresh preserva auth_time;
   revalidación en cada frontera. Tests de contaminación entre sesiones/clientes y falle cerrado.
5. Integración de consumers 1831/1835 dentro del contrato; leer instrucciones del repo hermano antes de editar.
   No asumir que gateway desplegado soporta multiissuer. UI requiere sus skills/gates antes de implementación.
6. QA focal + PG/schema real mediante tooling canónico, typecheck, build inputs y QA gates. Live tests sin
   sourcing global de .env. Registrar passed, no skipped como evidencia.
7. Rollout canónico con readbacks, canary usuario real y rollback. No habilitar emisores contra verifier
   incompatible. Preservar Entra directo y externos; public URL metadata no sustituye login autenticado.

Checkpoint de ejecución: objetivo aprobado después de corrección/auditoría de la task; no se solicita
reaprobación para las ediciones reversibles autorizadas. Cambios de arquitectura fuera D1–D7, efectos
irreversibles o release main requieren alcance concreto y revisión proporcional.

Cierre: no completar hasta evidencia consumers/rollout. Si sólo backend está listo, declarar code complete,
rollout pendiente con bloqueador y siguiente acción exacta. Cada slice actualiza Status real y checkboxes.
