# Efeonce ID — autoridad interna nativa

- Status: Accepted
- Date: 2026-09-05
- Owner: Identity / MCP Platform
- Scope: TASK-1836; auth-server, sesiones, OAuth, contexto delegado y reader del gateway.
- Reversibility: two-way-but-slow
- Confidence: medium
- Validated as of: 2026-09-05, código y contratos locales; runtime nuevo no desplegado.
- Authorization: ejecución de TASK-1836 corregida D1–D7 solicitada por el operador y objetivo aprobado
  en esta conversación. Formalización técnica dentro de ese alcance; no implica aprobación de release main.

## Context

El emisor nativo usa bindings B2B que requieren cliente activo. Personal Efeonce tiene identidad corporativa
pero no un camino propio a tokens nativos. Hacer a Efeonce cliente o clasificar todo el issuer como interno
rompería fronteras. La auditoría TASK-1836 A1–A7 mostró también gaps de assurance, discovery y rollout.

## Decision

1. Entra se usa sólo como upstream OIDC de login; auth-server emite el token MCP. No hay proxy Graph ni
   passthrough de tokens. Entra directo sigue disponible durante transición.
2. Identidad por tenant/oid verificados y source link canónico; `sub` nativo opaco estable separado. Email
   no crea ni fusiona identidad. La relación laboral elegible y los permisos son controles independientes.
3. Cada autorización interna usa un contexto server-side ligado a issuer/environment, subject, perfil,
   cliente, audiencia, organización, binding interno y sesión corporativa de procedencia. La población
   no se infiere de `issuer_class`; el registro externo actual conserva sus invariantes comerciales.
4. Token nativo interno incluye `authorization_context_id` y `authorization_context_version=1` firmados.
   Reader revalida las mismas dimensiones, elegibilidad, grants, revocación y versión. Contexto ajeno o
   ausente no autoriza. `gv` es la versión del binding seleccionado, no máximo entre organizaciones.
5. Login Entra crea nivel primary. V1 no traduce MFA upstream; step-up usa TOTP/passkey UV real y reciente
   de TASK-1830 sobre sesión corporativa. Método externo no habilita contexto interno. Refresh preserva
   instante/procedencia de autenticación; no rejuvenece MFA ni amplía contexto/scopes.
6. Consentimientos y familias OAuth quedan ligados al contexto. Los registros externos legacy sin
   contexto mantienen su semántica; jamás se promueven a internos. La resolución inicial interna no cachea
   permisos positivos. Revocación confirmada local debe impedir dispatch en ≤60 s; demora de ingestión
   de baja upstream se mide y documenta separadamente.
7. Gates separados OFF por defecto: emisor `AUTH_SERVER_INTERNAL_AUTH_ENABLED`, gateway
   `MCP_NATIVE_INTERNAL_AUTH_ENABLED`. Apagarlos deniega también refresh/dispatch de contextos emitidos.
   Backend/reader/gateway/UI compatibles y pruebas negativas preceden activación de cohorte.

## Alternatives Considered

- Sólo Entra directo: sirve como compatibilidad pero no entrega acceso mediante el autorizador propio.
- Login nativo independiente para empleados: duplicaría procedencia/recuperación corporativa.
- Promover `issuer_class` del emisor: concede autoridad a externos por compartir emisor; descartado.
- Interpretar claims MFA de Entra en V1: más casos de compatibilidad y riesgo de sobreafirmar assurance;
  diferido. El coste es un factor local adicional para elevar permisos.
- Tokens con permisos autosuficientes hasta expirar: no cumple revocación local acotada; descartado.

## Consequences

Se añade persistencia/lectura por contexto y transacciones de login. Esa lectura tiene coste y dependencia
operativa, a cambio de poder retirar acceso sin esperar expiración JWT. El gateway sigue siendo adapter:
no obtiene acceso DB ni inventa reglas workforce. La autorización final de negocio sigue en el provider.
El rollout es multicomponente y no puede cerrarse sólo desplegando auth-server.

## Runtime Contract

- Auth-server escribe sólo `greenhouse_auth`; commands de identidad poseen writes de source links/core.
- Store de contexto y upstream transacción: módulo `src/lib/auth-server/internal/` nuevo en TASK-1836.
- Sesiones: extensión aditiva de `persons` con procedencia corporativa real y source link nativo coherente.
- OAuth: code/refresh/consent/contexto preservados de authorize a dispatch; schema y tipos versionados.
- Reader interno: autenticado por lane ecosystem; devuelve contexto resuelto, nunca tokens upstream.
- TASK-1831 aplica verifier y policy por tool; TASK-1835 consume rutas; TASK-1832 verifica clientes reales.
- Cambios aditivos gateados; no reclasificar organizaciones ni reabrir payroll/relaciones workforce.
- Claims o contexto no soportados fallan cerrado. No alterar el inventario MCP ni el transporte en esta task.

Esta decisión amplía sólo el carril interno nativo de las decisiones nativa/federación anteriores. Entra
legado y acceso externo mantienen sus contratos hasta la activación específica de sus consumers.

## Revisit When

- Clientes no pueden descubrir/seleccionar el emisor de forma interoperable.
- Latencia del reader requiere caché: demostrar invalidación y ventana ≤60 s antes de introducirla.
- Se requiere MFA upstream o APIs Graph: revisión separada de assurance/consentimiento y token custody.
- No hay relación canónica verificable para una población: resolver política explícita, no bypass.
