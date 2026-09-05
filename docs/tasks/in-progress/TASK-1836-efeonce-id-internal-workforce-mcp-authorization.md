# TASK-1836 — Efeonce ID: acceso corporativo interno y autorización MCP delegada

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `2026-09-05 21:48 UTC: release PR224/main d551cf368 preservado. Diagnóstico e4977392b desplegado; nuevo callback rechazado por jwt_expired, sin token MCP. Emisor OFF en GitHub y auth-server-00019-4sg Ready100%. Corrección en validación local: prompt=login en lugar de max_age=0, auth_time firmado/fresco independiente de iat; exp sigue estricto. Publicación, nuevo canary, refresh/revocación/rollback pendientes.`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `develop; checkout compartido, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `—`

## Summary

Permitir que el equipo Efeonce se autentique en Efeonce ID y conecte clientes MCP usando el emisor propio.
Reutilizar OAuth de TASK-1829 y sesiones de TASK-1830; resolver identidad interna y permisos delegados sin
clasificar Efeonce como cliente ni conceder autoridad interna a todos los tokens del emisor nativo.

## Why This Task Exists

El binding actual en `src/lib/identity/external-access/commands.ts` exige organización `client|both` y
`active_client`. El grants port nativo en `src/lib/auth-server/oauth/grants.ts` usa ese resolver externo.
Por eso la identidad interna aprobada para la prueba no basta para completar el flujo nativo.
TASK-1829 cubre el motor OAuth base; esta task nueva posee el acceso corporativo interno. TASK-659 conserva su alcance histórico fuera de EPIC-044.

## Goal

- Autenticar al personal con identidad corporativa y resolver su identidad canónica sin duplicarla.
- Emitir tokens MCP nativos con permisos delegados, revocables y acotados a la autoridad del sujeto.
- Conservar acceso externo y transición reversible desde el carril Entra del gateway.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (formalización D1–D7).
- `docs/tasks/plans/TASK-1836-plan.md`

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`

Antes de implementar, registrar decisión ADR que distinga issuer, proveedor de autenticación upstream,
población del sujeto y autoridad efectiva. La dirección propuesta es Entra upstream para empleados y
Efeonce ID como emisor MCP común. La definición actual `issuer nativo = externo` debe evolucionar de forma
coordinada con TASK-1831; no se cambia su semántica silenciosamente ni se marca la propuesta como aceptada.

## Normative Docs

- `.codex/skills/efeonce-mcp-platform/SKILL.md` y `.codex/skills/mcp-craft/SKILL.md`; seguridad y matriz de verificación de ambas.
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/audits/2026-09-04-task-1836-mcp-design-audit.md`

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/audits/2026-09-04-epic-044-auth-rollout.md`

## Dependencies & Impact

### Depends on

- Contratos implementados de TASK-1829, TASK-1830 y TASK-1631; verificar estado real al ejecutar.
- Identidad y membresía workforce canónicas; resolver organización propia por su identificador canónico
  (ADR referencia `EO-ORG-0007`), no elegir una coincidencia de nombre entre organizaciones duplicadas.

### Blocks / Impacts

- TASK-1831: consumer del contrato de autoridad interna nativa; su slice externo puede avanzar aparte.
- TASK-1835: UI de entrada corporativa y consentimiento; depende de este contrato para el flujo interno.
- TASK-1832: canaries internos y externos; requiere backend, gateway y UI integrados.
- TASK-1813 conserva el carril Entra existente durante la transición.

### Files owned

- `src/lib/auth-server/**`: adapter upstream, subject/grants ports y sesión interna.
- `services/auth-server/**`: composición y configuración del runtime, coordinada con TASK-1835 en server/render.
- `src/lib/identity/external-access/**`: extensión mínima del contrato compartido coordinada con TASK-1631.
- ADRs de identidad/autorización citados y migraciones aditivas si el diseño las requiere.
- Gateway en repo hermano pertenece a TASK-1831; pantallas pertenecen a TASK-1835.

## Current Repo State

### Already exists

- OAuth/CIMD/DCR, tokens, refresh y revocación: `src/lib/auth-server/oauth/**`.
- Runtime propio: `services/auth-server/server.ts`; bindings/grants: `src/lib/identity/external-access/**`.
- Evidencia del rollout anterior registrada en la auditoría; revalidar runtime antes de ejecutar.

### Gap

- No hay camino nativo interno normal probado de identidad corporativa a grants y tools MCP.
- `issuer_class` por environment no basta para distinguir poblaciones bajo un mismo emisor.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/auth-server/**` y `services/auth-server/**`
- Future candidate home: `remain-shared`
- Boundary: subject/grants ports server-side; gateway consume contrato de autoridad verificado.
- Server/browser split: secretos, validación Entra, DB y resolución de grants exclusivamente server-side.
- Build impact: declarar cualquier SDK/input nuevo en build del auth-server y gates de worker.
- Extraction blocker: identidad, sesión y grants comparten contratos y revocación; no extraer otro servicio.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: identidad/workforce canónicas, `greenhouse_auth`, external-access y grants.
- Consumidores afectados: auth-server, gateway MCP y pantallas de TASK-1835.
- Runtime target: `staging`, `production`, `external`.

### Contract surface

- Contrato existente a respetar: OAuth contract y ports en `src/lib/auth-server/oauth/grants.ts`.
- Contrato nuevo o modificado: subject interno, binding upstream y contexto de autoridad delegado verificable.
- Backward compatibility: `gated`; conservar sujetos externos y Entra directo.
- Full API parity: login/callback y consumers usan los mismos commands/readers; ninguna regla en UI.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_auth`, identidad canónica, membresías y grants de external-access.
- Invariantes: issuer no confiere población; email/dominio/rol textual no confieren autoridad; empleado inactivo
  pierde acceso; token externo del emisor común nunca adquiere tools internas.
- Write-target allowlist: registrar tablas nuevas en boundary tests del dominio cuando existan, en el mismo PR.
- Tenant/space boundary: resolver contexto desde identidad y membresía verificadas; nunca desde formulario libre.
- Idempotency/concurrency: binding único por issuer/tenant/subject upstream; callback de un uso; transacciones
  e idempotencia en asociación de identidad; rechazar colisiones, sin merge automático por correo.
- Audit/outbox/history: auditar binding, login, denegación, grant y revocación sin tokens ni PII innecesaria.

### Migration, backfill and rollout

- Migration posture: `additive` si el ADR requiere persistencia nueva; inventario exacto antes del apply.
- Default state: flag interno OFF, separado de las flags OAuth/personas existentes.
- Backfill plan: dry-run y allowlist de sujetos reales, sin convertir organizaciones ni backfill masivo.
- Rollback path: apagar carril interno nuevo, revocar sus sesiones/grants y conservar Entra directo.
- External coordination: Entra app/redirects/tenant, secrets y deploy auth-server; gateway vía TASK-1831.

### Security and access

- Auth/access gate: validar issuer/tid/oid Entra, audiencia, nonce/state/PKCE y elegibilidad workforce vigente.
- Sensitive data posture: identidad y sesión; nunca registrar cookies, códigos ni tokens upstream.
- Error contract: errores canónicos sanitizados de auth/identity, sin raw errors.
- Abuse/rate-limit posture: límites existentes, replay guards, expiración y step-up según acción.

### Runtime evidence

- Local checks: tests de subject/grants/callback y revocación, typecheck y build gates.
- DB/runtime checks: readback de identidad/membresía/grant y revocación del sujeto seleccionado.
- Integration checks: login Entra real, token nativo, refresh y llamada MCP autorizada/denegada.
- Reliability signals/logs: contadores sanitizados de login fallido, binding conflictivo y denegación de grants.
- Production verification sequence: contrato -> backend/gateway/UI compatibles con flags OFF -> cohorte interna -> canaries TASK-1832.

### Acceptance criteria additions

- [ ] Contratos, tablas exactas y consumidores documentados; nuevas tablas en allowlist cuando corresponda.
- [ ] Invariantes de identidad/tenant, concurrencia, errores y auditoría verificadas por comportamiento.
- [ ] Migración y rollback probados con readback; evidencia DB/runtime redactada adjunta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato de identidad y autoridad

- Resolver ADR y organización propia canónica; separar pertenencia interna de condición comercial del cliente.
- Definir contexto confiable de población/autoridad y semántica de `gv` por contexto para emisor y gateway.
- Acordar con TASK-1831 la migración de policy; no habilitar por issuer común solamente.

### Slice 2 — Autenticación corporativa y grants

- Tras aprobar Entra upstream en Slice 1, implementar adapter y binding seguro a identidad existente, subject/grants ports y sesión. Si el ADR elige otra alternativa, actualizar este slice y consumers antes de código.
- Reutilizar audience, azp, scopes, consentimiento, refresh y revocación del servidor nativo.
- Limitar acceso a intersección de permisos vigentes, scopes solicitados/consentidos y policy de herramienta.
- Exponer contrato programático para TASK-1835 sin implementar pantallas en esta task.

### Slice 3 — Rollout y evidencia

- Verificar con `jreyes@efeoncepro.com` y organización Efeonce canónica, sujeto indicado por el operador.
- Probar identidad desactivada, grant revocado con token vigente, cliente externo y tenant desconocido.
- Entregar a TASK-1831/1835/1832 contrato y matriz de prueba; no cerrar EPIC-044 sólo con backend verde.

## Out of Scope

- Reclasificar Efeonce como cliente, crear personas ficticias o excepciones temporales de canary.
- Reemplazar login del portal, rehacer OAuth, retirar Entra directo o implementar tools nuevas.
- Implementación del gateway o UI: conservan sus dueñas 1831 y 1835.

## Detailed Spec

### 1. Evidencia y límites de la conclusión

| Evidencia revisada al redactar | Qué demuestra | Qué no demuestra |
|---|---|---|
| `src/lib/identity/external-access/commands.ts`, `bindExternalOrganization` | El binding exige `client|both` + `active_client` | Que cualquier fila llamada Efeonce sea la organización propia |
| `src/lib/auth-server/oauth/grants.ts`, `createExternalAccessGrantsPort` | El emisor usa memberships externas y calcula `gv` como máximo de sus versiones | Que una revocación de una membership con versión menor cambie ese máximo |
| `src/lib/auth-server/oauth/authorize.ts` y `token.ts` | Authorize, intercambio y refresh consumen ports de sujeto/grants | Que exista ya un adapter upstream para personal interno |
| `src/lib/auth-server/persons/subject-port.ts` | Hay una frontera reutilizable de sesión/sujeto | Que una sesión de portal o token Entra pueda aceptarse sin validación específica |
| ADR nativo, apartado Open questions | Uso del issuer propio para internos está expresamente sin decidir | Que el cambio de arquitectura ya esté aprobado |
| Auditoría de rollout del 2026-09-04 | Evidencia histórica de activación y bloqueo encontrado | Estado live al iniciar implementación: debe revalidarse |

El registro de esta task no aplica bindings ni otorga acceso. No se hizo una nueva prueba de login en esta
redacción. El correo del operador identifica el caso de aceptación solicitado; no es una llave de confianza.

### 2. Propuesta técnica para el ADR — corrección 2026-09-05

Esta tabla fija la solución recomendada de la task y reemplaza el listado de decisiones sin propuesta.
Formalizada en el ADR `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` tras aprobación de ejecución.
El Slice 1 contrasta schema/policy antes de migraciones. No modifica por
sí misma los ADRs aceptados ni autoriza despliegue. Una desviación debe justificar alternativa, impacto y
pruebas antes de modificar código; no hace falta redescubrir el problema ni reasignar su ownership.

| Decisión | Solución propuesta | Criterio de rechazo / comprobación |
|---|---|---|
| D1: rol de Entra | Upstream OIDC de autenticación corporativa; Efeonce ID emite el access token MCP. Sin proxy a Graph ni scopes upstream de negocio. Se mantiene Entra directo durante transición. | Ningún token Entra/ID token se acepta como bearer nativo ni se reenvía a providers. |
| D2: identidad | Enlace verificado por issuer + tenant + identificador estable upstream a perfil canónico; `sub` nativo opaco separado. El source link nativo y el upstream referencian la misma persona sin reemplazarse. | Email coincidente con subject diferente denegado; vínculo conflictivo no fusiona identidades. |
| D3: población y autoridad | Contexto de autorización explícito por persona + organización + relación elegible. La clase interna reside en contexto server-side y no en `issuer_class` global. Cada token opera un contexto; no agrega permisos de otras organizaciones. | Token externo del mismo issuer o parámetro de organización manipulado no puede seleccionar autoridad interna. |
| D4: contrato con gateway | Agregar referencia opaca de contexto firmada y versionada al token nativo. El reader confiable la resuelve y coteja issuer/sub/client/aud, relación vigente, permisos y procedencia. Tokens previos sin contexto nunca se promueven a internos. | Firma válida sin contexto válido es insuficiente; contexto de otra persona/cliente denegado. |
| D5: assurance | Login Entra validado crea sesión corporativa `primary`. V1 no traduce claims Entra a MFA local. Escrituras que requieran step-up usan TOTP o passkey UV canónicos, ejecutados sobre esa sesión corporativa y dentro de su frescura vigente. | Sin `totp`/`uv` sintético; completar factor en sesión externa no crea procedencia corporativa. |
| D6: permisos y revocación | Reader del contexto reevalúa elegibilidad y grants efectivos. `gv` corresponde al binding del contexto seleccionado, sin máximo entre organizaciones; la igualdad de gv nunca reemplaza leer permisos vigentes. Cohorte inicial interna sin caché de autorización positiva. | Baja/grant revocado deniega con token vigente; A=10/B=2->3 no se oculta. Optimizar caché requiere prueba ≤60 s e invalidación. |
| D7: coexistencia y rollout | Backend, reader, verifier y UI compatibles se despliegan con acceso interno nuevo OFF. Cohorte se activa sólo después de verificar discovery, deny y contexto. Entra directo y externos conservan sus políticas. | Verifier viejo rechaza token nuevo; flag OFF deniega contexto interno nuevo en emisión y dispatch, no sólo oculta botón. |

**Campos nuevos propuestos, todavía no existentes:** referencia JWT `authorization_context_id` opaca y
`authorization_context_version: 1`. El Slice 1 confirma nombres/compatibilidad y los registra en el contrato
OAuth; no implementarlos como convención privada de un consumer. `gv` se conserva con semántica explícita
por contexto. El reader devuelve contexto resuelto, población, persona/organización, elegibilidad,
capabilities efectivas, versión y fecha de resolución. Un resultado desconocido/malformado falla cerrado.
El modelo de persistencia exacto se decide contra schema; no se inventan tablas existentes en esta task.

**Contrato de freshness:** refresh conserva el instante y procedencia de autenticación originales;
no modifica `auth_time` a la hora de refresh para afirmar autenticación reciente. La frescura del step-up
controla nueva concesión/elevación de scopes, según el contrato OAuth; no se impone re-MFA en cada refresh
sin cambiar explícitamente esa política. Si una operación de negocio exige factor reciente al ejecutarse,
el provider aplica ese requisito por separado. Refresh nunca aumenta scope, población ni contexto.

**Elegibilidad:** cuenta Entra válida + perfil canónico activo + relación corporativa vigente + grant
autorizado. `guest`, contratista o empleado no confieren permiso por etiqueta; la matriz workforce vigente
resuelve la relación. Si la relación no puede comprobarse, denegar y dejar diagnóstico al operador. El
canary no amplía el modelo de HR ni convierte prospectos en clientes.

**Límites de la elección:** se elige OIDC corporativo sobre login nativo independiente para conservar la
procedencia empresarial. Se evita depender de interpretación MFA upstream en V1 a cambio de un step-up
local adicional. Entra directo por sí solo no cubre el objetivo del emisor propio; se conserva como
compatibilidad, no como criterio de cierre. El contexto explícito agrega contrato/lectura por request,
pero permite aislamiento y revocación verificables; caché es optimización posterior medida.

**Aceptación y prerrequisitos separados:** el único gate de diseño es formalizar/aceptar D1–D7 conforme al
proceso ADR. Aplicación/redirects Entra, enlace del operador, organización propia y credenciales son valores
operativos que se verifican antes del apply; no son motivos para dejar arquitectura sin propuesta.


### 3. Flujo backend a implementar

1. El cliente inicia authorize en el emisor nativo con su registro, redirect y PKCE ya validados por OAuth.
2. Se preserva una transacción de login server-side asociada al request OAuth original, sin aceptar return URLs
   arbitrarias. Se elige el método corporativo desde la UI consumidora de TASK-1835.
3. El adapter inicia el flujo upstream de Entra con tenant y aplicación configurados. `state`, `nonce` y PKCE
   pertenecen a esa transacción; el verifier nunca viaja al browser ni se reutiliza entre logins.
4. El callback valida la respuesta upstream antes de usar sus atributos. Verificar firma/algoritmo/kid, issuer,
   tenant, audience, exp/nbf, nonce y correlación de state; validar `azp` cuando corresponda al contrato elegido.
   El token upstream no se reenvía al MCP ni se convierte directamente en token nativo.
5. Resolver el vínculo canónico con tenant + identificador estable upstream. Comprobar identidad activa,
   ausencia de merge pendiente/conflictivo y relación workforce elegible en la fecha efectiva.
6. Si no hay binding confiable, denegar o requerir enrolamiento por command gobernado. La búsqueda por email
   puede informar al operador, pero no crea el vínculo ni fusiona personas automáticamente.
7. Crear/rotar sesión nativa con procedencia y contexto verificados. Reutilizar stores/session primitives;
   no leer cookies del portal como prueba de autenticación. Cookie y CSRF conservan el contrato de TASK-1830.
8. Resolver la organización propia y permisos del sujeto, obtener consentimiento específico para cliente,
   audiencia, contexto y scopes; volver al authorize original. El login por sí solo no otorga capabilities.
9. Intercambio de código y refresh revalidan elegibilidad y grants del mismo contexto antes de emitir.
10. TASK-1831 valida el token y revalida el contexto para dispatch; el provider aplica sus propios permisos.
    El token de servicio downstream identifica al gateway y nunca sustituye al actor humano delegado.

### 4. Contrato de identidad, pertenencia y permisos

| Concepto | Fuente permitida | Prohibido inferirlo de |
|---|---|---|
| Persona | Identidad canónica y source link verificado | Coincidencia de nombre/correo |
| Procedencia de login | Resultado upstream validado y transacción de sesión | Query string `provider` o cookie no validada |
| Organización/contexto | Relaciones canónicas activas, verificadas server-side | Dominio del email o organizationId libre |
| Elegibilidad interna | Política workforce efectiva definida en ADR | Booleano `internal` aportado por cliente o simple cuenta en tenant |
| Capability | Reader/grants vigentes por persona y contexto | Rol textual incluido en token o DCR |
| Scope delegado | Registro de cliente + solicitud + consentimiento válido | Unión automática `roles`, `scp`, `scope` |
| Tool autorizada | Intersección de scope, autoridad, capability y policy del provider | Pertenencia al equipo o issuer permitido por sí solos |

La organización `EO-ORG-0007` se menciona en el ADR como propia; comprobar su correspondencia con
`organization_id` y relaciones reales. Un lookup sin resultados o con ambigüedad bloquea el apply, no autoriza
crear otra organización. No alterar `organization_type`, `lifecycle_stage`, datos comerciales ni payroll.

Usuarios invitados al tenant, cuentas de servicio, exempleados y contratistas deben tener outcomes explícitos.
No asumir que todo miembro Entra es empleado ni que todo contratista debe quedar excluido: la política de
personas elegibles se define con el canon workforce existente. Las cuentas app-only quedan fuera de este
flujo humano delegado. Una persona con acceso a más de una organización conserva contexto separado,
seleccionado entre sus relaciones autorizadas y sujeto a nuevo consentimiento cuando cambie la autoridad.

### 5. Binding y persistencia

El diseño produce un inventario antes de cualquier SQL: objetos actuales reutilizados, columnas nuevas,
constraints, índices, permisos DB y migraciones exactas. No se prescribe un nombre de tabla inexistente.

- Unicidad del vínculo upstream por proveedor/issuer, tenant y subject estable; idempotencia bajo dos callbacks
  concurrentes. El mismo upstream no puede apuntar a dos identidades activas.
- Los subjects nativos siguen opacos/estables; nombres, emails y cambios de dominio no cambian el sujeto.
- Una relación ya existente incompatible produce conflicto auditado. Resolver identidad fusionada usando el
  primitive canónico, sin reactivar perfiles inactivos ni reasignar credenciales automáticamente.
- Enrolamiento: command con capability fina, actor, motivo, dry-run y readback; grant al rol operador legítimo
  y tests de acceso si se introduce capability. No exponer sólo un botón ni usar privilegio admin genérico.
- Dos requests de enrolamiento equivalentes producen la misma relación. Un retry después de timeout debe
  poder distinguir escritura confirmada de operación no aplicada sin duplicar registros.
- Nuevo acceso empieza sin capabilities por defecto; grants explícitos, con alcance y vigencia. Un grant
  organizacional sólo aplica a sujetos elegibles dentro de ese contexto según el contrato de resolución.
- Historial de revocación append-only y razón auditada. Evitar borrar evidencia de sesiones/consents/grants.

### 6. Contrato de tokens, consentimiento y revocación

Conservar `iss`, `sub`, `aud`, `azp`, `scope`, expiración y `gv` del contrato OAuth; los nuevos campos y la
forma de vincular contexto se fijan en ADR antes de que emisor y gateway los consuman. No inventar claims
compatibles sólo por compartir nombres con Entra. Tokens previos sin el contexto requerido nunca se tratan
como internos por default.

- Consentimiento se ata a persona + cliente + audiencia + contexto + scopes; retirar permiso o cambiar
  contexto no se salva reutilizando un consent anterior. Elevar scopes requiere autorización nueva.
- Request de refresh no cambia población, organización ni usuario y no amplía permisos.
- Deshabilitar persona, revocar vínculo o retirar grant provoca denegación en authorize/code/refresh y en
  dispatch de access tokens vigentes, conforme a la ventana de caché publicada.
- El máximo de versiones de memberships puede ocultar cambios: fixture A=10, B=2; revocar B y subirlo a 3
  deja max=10. Debe probarse el comportamiento real y elegir invalidación por contexto/versionado que detecte
  esa revocación. Nunca cerrar con un test que sólo compare el texto de `Math.max` o de una consulta SQL.
- Medir ≤60 s desde revocación confirmada en el source of truth consultado hasta denegación en todas las
  instancias del gateway. Para baja remota Entra, informar además latencia hasta ingestión local.
- Reader caído o respuesta inválida no concede acceso; definir máximo de staleness y fallo cerrado. Cache key
  incluye issuer, subject, cliente y contexto cuando afecten permisos; no compartir por email/issuer solamente.
- Revocar una familia de refresh por reuso no revoca silenciosamente otras personas; revocación global del
  sujeto sí invalida todas sus familias/contextos cuando sea el comando solicitado.
- Diferenciar logout local, cierre de sesión upstream y revocación de grants/tokens; UI/runbook no prometen
  que uno realiza los otros si el backend no lo garantiza.

### 7. Integraciones y contrato de entrega

| Dueña | Entrega que recibe | Prueba exigida | No absorbido por esta task |
|---|---|---|---|
| TASK-1831 gateway | Schema de autoridad versionado, resolver, caché, mapping de errores y fixtures | Interno permitido, externo mismo issuer denegado, revocación con token vigente | Transporte, configuración verifier y policy por tool |
| TASK-1835 UI | Endpoints start/callback/session, estados sanitizados y contrato de consentimiento | Inicio corporativo, retorno, cancelar, no elegible, conflicto, sesión vencida | Wireframe/flow/motion, copy y componentes |
| TASK-1832 canaries | Cohorte validada, configuración cliente, procedimiento y evidencia backend | Cliente real login->token->tool->refresh->revocación | Matriz completa Codex/Claude/ChatGPT |
| TASK-1833 assurance | ADR, threat cases, evidencia allow/deny, rollback | Cobertura del cambio de frontera interno/externo | Pentest externo y cierre de hallazgos |
| TASK-1631 identity | Delta mínimo de bindings/grants y compatibilidad | Flujos externos actuales continúan aislados | Modelo comercial y administración B2B |
| TASK-1813 Entra | Contrato de coexistencia, sin retirar rutas por anticipado | Login/dispatch legado permitido donde corresponda | Interoperabilidad del carril legado |

La implementación backend puede quedar `code complete, rollout pendiente` cuando entregue los contratos.
El cierre operativo requiere evidencia de consumers; no declarar la task completa sólo por tener un PR o tests
unitarios. Las dependencias de integración no bloquean circularmente el diseño/backend inicial.

### 8. Matriz de pruebas de comportamiento

| Caso | Resultado verificable | Nivel / dueña |
|---|---|---|
| Personal elegible, tenant confiable, grant vigente | Un subject, sesión y token nativo; tool autorizada | Integración 1836 + 1831/1832 |
| Mismo usuario sin grant | Puede autenticar si política permite; no obtiene permiso/tool no concedidos | Backend + gateway |
| Cliente externo bajo mismo issuer | Acceso sólo a su contexto y tools permitidas | Backend + 1831 |
| Externo solicita contexto Efeonce en payload | Denegado, sin cambiar binding | Backend |
| Rol presente y scope delegado ausente | Denegado | 1831 |
| Token válido con aud/client equivocado | Denegado | Backend + 1831 |
| Tenant ajeno, guest o app-only | Outcome conforme política; nunca privilegio por email corporativo | Adapter + resolver |
| Dos callbacks simultáneos/replay | Máximo un consumo/una sesión nueva; no duplicar binding | Backend + PG |
| Nonce/state inválido, expirado o return URL alterada | Rechazo sin redirect abierto ni fuga | Backend |
| Email coincide, oid distinto | No enlace automático ni suplantación | Identity |
| Perfil fusionado/inactivo, relación vencida | Resolución canónica o rechazo explícito; no reactivación implícita | Identity |
| Cambio de contexto con consent anterior | Sin heredar scopes/autoridad; requiere consentimiento aplicable | OAuth |
| Revocación mientras token no expira | Tool denegada dentro del objetivo medido | Live 1831/1832 |
| Membership versión baja revocada bajo máximo alto | Revocación detectada | Backend + gateway |
| Grants reader lento/caído/malformed | Error sanitizado y sin dispatch no autorizado | Fault injection |
| Refresh reusado o elevación de scope intentada | Familia/solicitud rechazada según contrato vigente | OAuth |
| Entra upstream no disponible | Login interno falla de forma controlada; no fallback automático a email | Integración |
| Flag interna OFF | Flujo interno nuevo apagado; externos y Entra legado no degradados | Rollback |
| Login/logout repetidos en dos clientes | Sesión, grants y consent mantienen aislamiento por contrato | 1832 |

Las pruebas con coste, writes de negocio o datos sensibles requieren elegir una operación proporcional y
su autorización; para el primer canary usar read permitido y un negativo sin efectos laterales. Un listado
vacío de tools o un 200 de metadata no prueban autorización útil. Guardar versión exacta de cliente, request
redactado, outcome esperado/real y contexto; nunca copiar tokens ni códigos al documento.

### 9. Artefactos concretos que deja cada slice

- Slice 1: ADR con decisiones D1–D7 anteriores, inventario de fuentes canónicas, policy de elegibilidad,
  contrato de autoridad versionado y fixtures de compatibility/deny list; nombres definitivos de endpoints/flags.
- Slice 2: adapter upstream, commands/readers de binding, ports integrados, migraciones aditivas si aplican,
  tests de concurrencia, revocación y fallos, harness de smoke con salida redactada.
- Slice 3: runbook enrolar/deshabilitar/revocar/rollback, inventario de configuración Entra/Cloud Run,
  readbacks pre/post, evidencia del canary y handoff por consumer con pendientes explícitos.

### 10. Datos operativos que se deben resolver en Discovery

No rellenar con inferencias: tenant ID corporativo, aplicación upstream, redirect URI exacta, método de
credencial permitido, organización canónica, source link Entra del sujeto, reader workforce vigente,
capability administrativa y actor autorizado. Revisar configuración sin imprimir secretos. Si falta una
relación confiable, dejar dry-run con explicación y resolver por el command gobernado antes del canary.

`jreyes@efeoncepro.com` es el sujeto inicial solicitado. Su aprobación como caso de prueba no autoriza a
crear una identidad duplicada, seleccionar cualquier organización homónima o conceder todas las capabilities.
La prueba debe elegir un permiso mínimo real y registrar quién lo otorga y cómo retirarlo.

### 11. Autenticación corporativa, assurance y procedencia de sesión — audit MCP

`src/lib/auth-server/oauth/subject.ts` exige `authLevel` y `authTime`; `persons/sessions.ts` sólo deriva
`step_up` de factor fuerte y reciente. `persons/types.ts` no representa aún un método Entra. Por tanto,
reutilizar sesiones exige un cambio de contrato explícito, no etiquetar un login Entra como `totp`/`uv`.

- D5 fija V1: login corporativo validado como `primary`, sin mapping de MFA upstream; TOTP/UV local
  reciente sobre sesión corporativa para step-up. Ausencia de claims no prueba MFA. `iat`, callback reciente y refresh no
  equivalen a autenticación fuerte reciente. Si no hay evidencia suficiente, sesión `primary` y challenge
  de step-up por el camino aprobado; nunca elevar implícitamente.
- Fijar la política para nuevos grants de escritura y para continuidad de grants ya consentidos. Mantener
  separado consentimiento de scope, frescura MFA y autorización de cada operación de negocio.
- Revisar `oauth/token.ts`: el refresh hoy pasa `authTime: now` al firmador. No reutilizar ese timestamp
  como prueba de MFA o login reciente; D5 exige preservar procedencia/frescura y probar el token resultante.
- La misma persona puede tener más de un método de login. Sesión magic-link/recovery externa no habilita
  autoridad interna sólo porque su `profileId` también tenga relación workforce. Resolver procedencia y
  assurance del contexto en authorize, intercambio, refresh y dispatch; cambiar método/contexto exige el
  flujo correspondiente, sin blanqueo de autoridad entre sesiones.
- Documentar representación de source link: `createPersonSubjectPort` exige `external_idp:<environment>`.
  El binding Entra estable es procedencia upstream; no sustituirlo directamente por un source link nativo
  incompatible ni crear dos personas. Definir relación entre ambos y revocación coherente.

### 12. Descubrimiento MCP, scopes y superficie efectiva — audit MCP

TASK-1831 posee la implementación del gateway. Su entrega debe incluir el camino de entrada completo:

- URL canónica del recurso `https://mcp.efeonce.org/mcp`; metadata protegida root/path, desafío 401 y
  `authorization_servers` conducen al emisor elegido sin mismatch de issuer ni selección basada en email.
  Probar configuración nueva y coexistencia Entra con cada cliente objetivo; validar comportamiento
  observado si un cliente no permite elegir entre emisores. No resolverlo creando recursos alias.
- Clientes envían `resource` en authorize/token y reciben audiencia canónica; recursos ajenos se rechazan.
  Registrar comportamiento para parámetro ausente según contrato vigente, sin cambiar OAuth base de manera
  implícita. CIMD/registro previo/DCR conservan su owner TASK-1829 y la compatibilidad probada por TASK-1832.
- Metadata del recurso anuncia permisos mínimos de entrada; elevación de scopes por clase de acción,
  mediante desafío HTTP 403 `insufficient_scope` con permisos necesarios. No crear un scope por capability
  ni usar listado de roles como permisos delegados. La semántica exacta de errores sigue la versión cliente.
- Inventario, exclusiones y annotations conservan su fuente canónica `src/mcp/greenhouse/tool-manifest.ts`.
  No crear ni renombrar tools en esta task. TASK-1831 prueba listado y llamada directa: que una tool no
  aparezca no basta para impedir invocarla; tampoco debe filtrarse información de tenants por caché de listado.
- Cada request y cualquier handle/cursor reutilizable conserva su contexto autorizado. Probar dos usuarios
  y dos clientes concurrentes en una misma instancia. No usar estado mutable global de SDK/transporte para
  identidad, ni confiar en parámetros de negocio como fuente de autoridad.
- Declarar revisión MCP y versión real de cada cliente; no migrar transporte/handshake por seguir el radar
  sin evidencia de compatibilidad. La sesión web de login es distinta de una sesión de transporte MCP.

### 13. Consentimiento upstream y fronteras de OAuth — audit MCP

D1 selecciona login OIDC corporativo puro; proxy OAuth a APIs de terceros queda fuera de alcance. Por tanto, no solicitar scopes Graph de negocio ni custodiar tokens de acceso a APIs
si no hay un caso autorizado. Tokens upstream nunca viajan al cliente MCP o provider downstream.

- En login OIDC puro, aprobar scopes MCP después de identificar a la persona es posible, pero SSO Entra
  nunca equivale a consentimiento del `client_id` MCP. Nuevo cliente, redirect o contexto se revalida; no
  emitir código nativo hasta aprobación explícita. Consent rechazado/cancelado no persiste autorización.
- Si el diseño incorpora proxy OAuth con client ID upstream fijo y clientes dinámicos, aplicar la
  preaprobación por cliente antes de autorización upstream descrita en la guía MCP. El ADR debe resolver
  sus precondiciones y orden; no copiar el flujo OIDC puro para un proxy de APIs.
- Separar state/nonce/PKCE upstream del estado OAuth downstream. Fijar emisor/endpoints por configuración
  confiable; un request no puede elegir discovery/JWKS/redirect de upstream ni dirigir codes a otro issuer.
- Probar atacante con cliente B y SSO/consent previo del cliente A, callback forjado y cancelación. Ningún
  cookie de aprobación nace antes de aprobar; CSRF, frame protection y redirect exacto conservan contrato.
- Entra y nativo validan cada audiencia en su frontera. No tratar ID token como access token MCP, ni enviar
  bearer nativo al provider; el gateway combina credencial de servicio propia con contexto delegado validado.

### 14. Pruebas adicionales exigibles por auditoría

| Caso | Resultado verificable | Dueña |
|---|---|---|
| Entra login sin evidencia fuerte / MFA vencido | primary o challenge; sin inventar totp/uv | 1836 |
| Refresh y nueva cookie con autenticación vieja | No rejuvenecen assurance ni eluden step-up | 1836 |
| Misma persona workforce autenticada por magic link externo | No adquiere autoridad interna | 1836 + 1831 |
| Cliente B aprovechando SSO/consent de A | No recibe código/grants sin aprobación de B | 1836 + 1835 |
| 401 desde recurso canónico en cliente instalado | Descubre issuer correcto y completa OAuth real | 1831 + 1832 |
| Scope insuficiente, recurso ajeno, ID token usado como bearer | Rechazo antes de dispatch con error apropiado | 1831 + 1832 |
| Dos usuarios/clientes simultáneos, tool directa y cursor ajeno | Sin contaminación de listado, datos o autoridad | 1831 |
| Gateway viejo recibe token nuevo / flag interna OFF | Denegación; rollback no promueve tokens ni contexts | 1831 + 1836 |


## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 ADR/contrato -> Slice 2 backend gated -> Slice 3 evidencia backend. El flujo completo requiere
TASK-1831 + TASK-1835 -> TASK-1832; no bloquear el diseño de TASK-1836 esperando sus consumers.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Externo obtiene autoridad interna | MCP | medium | Contexto confiable y tests negativos mismo issuer | Denegaciones/decisiones auditadas |
| Cuenta duplicada o tenant incorrecto | Identity | medium | Binding por tenant/subject; sin merge por correo | Conflictos de binding |
| Baja mantiene token útil | Auth/MCP | medium | Revocación coherente por contexto, caché acotada | Prueba token vigente tras baja |
| Cutover deja equipo sin acceso | Auth | medium | Flag independiente, Entra directo conservado | Login/canary fallido |

### Feature flags / cutover

Flags propuestas: `AUTH_SERVER_INTERNAL_AUTH_ENABLED=false` en emisor y
`MCP_NATIVE_INTERNAL_AUTH_ENABLED=false` en gateway (nombres nuevos, no configuración ya existente).
Cada consumer debe comprobar su gate en requests y en refresh/dispatch según su frontera. Activar sólo tras tests y readback del
contrato gateway; no reutilizar OAuth/personas para apagar todo el servicio. Auth-server comparte servicio
entre staging y producción según rollout registrado: verificar destino y revisión antes de cada despliegue.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revertir propuesta documental antes de implementación | Inmediato | Sí |
| 2 | Gates emisor/gateway OFF, revocar contextos/sesiones internos antes de revisión anterior; conservar migración aditiva | Medir en staging | Sí |
| 3 | Retirar cohorte interna, revocar grants/sesiones creados y comprobar Entra directo | Medir en staging | Sí |

### Production verification sequence

1. Verificar identidad, organización, contrato y configuración reales; dry-run de binding.
2. Deploy canónico con flag OFF; comprobar que externos y Entra directo mantienen su comportamiento.
3. Verificar gateway/UI compatibles, metadata y rechazos con flag OFF; no exponer emisión interna contra verifier antiguo.
4. Activar cohorte interna y ejecutar matriz de clientes en TASK-1832: sesión/token/refresh/revocación y aislamiento; registrar SHA, revisión y readbacks.
5. Probar rollback antes de ampliar cohorte. Promoción main sigue el control plane de release.

### Out-of-band coordination required

Configurar aplicación Entra y redirects exactos; reconciliar secretos/env por mecanismo canónico. Login
interactivo del sujeto real cuando corresponda. No enviar correos ni mensajes sin autorización específica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] D1–D7 del §2 formalizadas en ADR, con fixtures y contratos compartidos; ninguna queda sólo como “resolver después”.
- [x] Contexto firmado de otra persona/cliente y token previo sin contexto no acceden a autoridad interna. Evidencia backend: OAuth flow, context, subject-port y ecosystem reader tests; dispatch real sigue pendiente en 1831.
- [ ] Flag de gateway OFF deniega contextos internos nativos ya emitidos; flag de emisor OFF deniega login, authorize y refresh internos nuevos.

- [ ] Casos de auditoría §14 pasan; assurance Entra, procedencia de sesión y refresh no elevan autoridad implícitamente.
- [ ] Discovery 401->issuer->OAuth y challenges de scopes funcionan en clientes reales según su revisión MCP, con evidencia de TASK-1831/1832.
- [ ] Listado, dispatch directo y handles/cursors mantienen autorización por request sin fuga concurrente entre usuarios/clientes.
- [ ] Consent por client_id y perfil OIDC/proxy están resueltos en ADR; SSO previo no autoriza un cliente MCP nuevo.

- [ ] Cada caso de la matriz §8 tiene evidencia de comportamiento y outcome esperado/real; casos live sin ejecutar quedan pendientes, nunca verdes por skip.
- [ ] Inventario de configuración Entra, redirects, secrets y flags verificado sin valores sensibles; callback real corresponde al runtime desplegado.
- [x] Enrolamiento idempotente y auditado, con capability fina y camino programático; ningún vínculo nace por coincidencia de email. Reapertura de integridad resuelta: writers transaccionales compartidos, población inmutable y recuperación cruzada protegida; 20 live + recuperación externa live adicional passed. Migración aplicada y reconciliación explícita del piloto con audit/outbox canónicos correlacionados, publicados; repetición 0/0 sin cambiar gv3 ni expiración original. Evidencia en §Integridad aplicada y §Release de integridad.
- [x] Consentimiento y refresh no permiten cambiar persona, contexto ni elevar permisos; tokens previos no adquieren autoridad interna por default. OAuth JWT ES256 y pruebas PG de consentimiento/rotación verificadas.
- [ ] Baja remota y baja canónica tienen latencias declaradas separadamente; revocación multicontexto pasa el caso A=10/B=2->3.
- [ ] Rollback ensayado registra duración real, revocación selectiva y comprobación de externos/Entra legado; no depende de apagar todo OAuth.

- [x] ADR aceptado define proveedor upstream, población y autoridad independientemente del issuer. `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`, D1–D7.
- [x] Efeonce e identidad interna se resuelven canónicamente sin cambiar organización a cliente ni duplicar persona. Reader real devuelve perfil autorizado + EO-ORG-0007; test PG de enrolamiento usa clones temporales y rollback. Posteriormente se enroló el piloto real sobre esa identidad canónica; la prueba de login humano sigue pendiente.
- [ ] Login corporativo produce sesión y token MCP nativo con audiencia, azp, scopes y gv correctos. Intento real21:15:25Z volvió de Microsoft y fue rechazado por jwtVerify (`jwt_validation_failed`). No se emitió token MCP; diagnóstico específico en preparación.
- [ ] Refresh y revocación funcionan; baja efectiva en el source of truth o retiro de grant invalida autorización con token vigente en ≤60 s,
  verificado junto al gateway, sin afirmar cierre por expiración natural del token.
- [ ] Token externo del mismo issuer, tenant desconocido y roles sin scopes no acceden a tools internas.
- [ ] Tests cubren replay/callback, colisión de binding y límites de autorización; Entra directo sigue disponible.
- [ ] Consumers TASK-1831/1835 reciben contrato estable y TASK-1832 registra prueba real interna y externa.

## Verification

- `pnpm task:lint --task TASK-1836`
- Tests de comportamiento focalizados auth/identity, typecheck y gates de worker si cambian build inputs.
- `pnpm qa:gates --changed` al implementar; pruebas live vía `pnpm test:live` cuando correspondan.
- `git diff --check`, `pnpm docs:closure-check`, `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] Lifecycle, ubicación, registry y README sincronizados con evidencia real.
- [ ] ADR, manual, runbook y Handoff actualizados; runtime/rollback verificados.
- [ ] Dependencias y evidencia integradas con TASK-1831/1835/1832; pendientes sin marcar completos.

## Origin and scope decision — 2026-09-04

Task nueva solicitada explícitamente por el operador. El intento previo de reasignar TASK-659 se retira:
esa task conserva identidad, alcance e historia, sin convertirse en hija de EPIC-044. Se reutiliza el motor
de TASK-1829; no su ID ni su ownership. TASK-1836 es U11 y entrega contratos a 1831/1835/1832.

## Implementation prerequisites

- Formalizar/aceptar D1–D7; comprobar schema y nombres de campos propuestos antes de migración.
- Verificar aplicación/redirects upstream, organización propia y relación workforce del sujeto; no inferir valores.
- Medir propagación Entra -> canon local y publicar esa latencia separada de revocación local <=60 s.
- Contratos de UI/gateway deben recibir estas decisiones antes de implementar sus slices internos.


## Audit record — 2026-09-04

Auditoría de diseño MCP incorporada: seis hallazgos materiales y una referencia residual corregidos en
el contrato de ejecución. Evidencia, severidad y límites en la auditoría enlazada. Esto no acepta el ADR,
no acredita implementación y no representa un pentest del runtime. Registro de tools/transportes intacto.

## Correction trace — 2026-09-05

| Hallazgo | Solución de diseño | Prueba de cierre |
|---|---|---|
| A1 | D2/D5: procedencia corporativa, primary por defecto, factor local fuerte reciente | §14: MFA ausente/vencido, refresh viejo y magic link externo |
| A2 | D4/D7 + §12: discovery/reader/verifier compatibles antes de emisión | Cliente real desde URL canónica, recurso ajeno y scope insuficiente |
| A3 | D1 + §13: OIDC puro, consentimiento por cliente; proxy API fuera de alcance | Cliente B no hereda consentimiento de A |
| A4 | D3/D4 + §12: contexto por request/handle/cursor | Dos usuarios/clientes simultáneos, llamada directa y cursor ajeno |
| A5 | D7: gates de emisión y dispatch, readback previo a cohorte | Token emitido antes de OFF denegado y rollback sin degradar externos |
| A6 | §2: alternativa propuesta concreta, Slice 2 dependiente de su aceptación | ADR y consumers describen el mismo diseño |
| A7 | ID TASK-1836 en secuencia; TASK-659 sólo contexto histórico | Registro/epic/referencias consistentes |

Corrección documental terminada; checkboxes de implementación permanecen abiertos.


## Evidencia de implementación — 2026-09-05

Tres subagentes autorizados, ownership OAuth, OIDC y Identity; integración revisada por agente principal.
Plan y hook repetidos con `--subagents`. [Runbook](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md)
y [manual funcional](../../manual-de-uso/identity/efeonce-id-interno.md).

- Migraciones `20260905124526557` y `20260905130319708` aplicadas en PG compartido. Tipos regenerados
  después de la primera; la segunda añade función, no shape de tablas.
- Persistencia PG: 3 passed, exit 0, cleanup completo. Un primer intento tuvo 3 tests passed pero suite
  fallida por permiso de teardown; corregido con perfil ops y preflight de DELETE antes de fixtures.
- Identidad PG: 1 passed, clones temporales del caso autorizado + rollback. Elegibilidad, tenant inválido,
  perfil inactivo, idempotencia, grant personal y revocación; no writes persistidos del usuario.
- GC PG: 1 passed sobre cuerpo de función instalado, clones con FKs y rollback. Conserva familias
  refresh vigentes y evidencia; privilegios SECURITY DEFINER comprobados. Dry-run real: cero candidatos.
- El reporte de Claude sobre SubjectSessionPort motivó pruebas de composición real; detectaron ausencia
  de evidencia corporativa con fallback indebido y dimensiones vacías. Corregidos, seis pruebas pasan.
- Ampliación autorizada por operador: límites de las cuatro ceremonias passkey y GC de datos vencidos.
  Transport tests cubren prefijos XFF falsos; ingress GCP real `internal-and-cloud-load-balancing`.
- No se desplegaron estos cambios. Revisión viva releída `auth-server-00007-cxb` / `3f68e8875`, 100% tráfico.
  Login Entra real/canaries/GC programado siguen pendientes. GC se declara PAUSED y flag OFF hasta rollout verificado.

Los checkboxes de integración y rollback permanecen abiertos. Los tests y la elegibilidad no acreditan
login Entra, consentimiento visible, llamada MCP autorizada ni propagación real de baja <=60 segundos.


### Gate final del backend

- 263 pruebas unitarias/integración local passed. Los seis casos live aparecen skipped en esa invocación
  hermética y se ejecutaron por separado: 4 persistencia/UV, 1 identidad y 1 GC, todos passed/exit 0.
- `pnpm build` exit 0. Typecheck, lint focal, build-contract/runtime-deps de workers y task lint sin errores.
- GC real dry-run y apply: cero candidatos/cero borrados en las once tablas; scheduler aún no desplegado.
- Lectura de autoridad estricta PG sin fallback BigQuery; fallos de vistas/overrides/permission sets deniegan.
- Cierre documental y context-check strict ejecutados; migraciones registradas no equivalen a código desplegado.


### Preparación upstream — 2026-09-05

Aplicación Entra de un tenant creada, callback exacto y `auth_time` verificados; service principal exige
asignación y sólo tiene al usuario canónico autorizado. Se prepararon secreto con expiración 2026-12-04,
llave HSM dedicada con rotación de 90 días e IAM de recurso para el SA del emisor. Identificadores y
readbacks sanitizados en el runbook. No hay enrolamiento/grant MCP real ni activación del flag interno.
Las referencias se conservan en deploy.sh; esta preparación no verifica el callback ni constituye despliegue.


### Verificación adicional de revocación — 2026-09-05

`oauth/internal-multicontext.test.ts` emite y verifica JWT ES256 para dos contextos del mismo sujeto.
A conserva `gv=10`; B pasa de 2 a 3 y su token previo es denegado, sin afectar A. Apagar el flag interno
deniega ambos tokens y el refresh HTTP sin invocar el resolver externo. Una petición legacy explícita
sí usa dicho resolver. Diez pruebas focales passed y typecheck exit 0. Esto prueba comportamiento local;
no mide aún latencia ni dispatch del gateway desplegado. Se corrigió el nombre de una prueba anterior
que mencionaba A/B aunque sólo ejercitaba B.


### Cierre del segundo factor ligado a sesión — 2026-09-05

La revisión D5 encontró que el login passkey normal crea otra sesión y no puede acreditar procedencia
corporativa. Se añadieron comandos/rutas de step-up explícitos con reto ligado a sesión, sujeto, propósito
y environment, UV criptográfico obligatorio y consumo único. No crean cookie ni copian evidencia Entra.
El UPDATE final de UV y TOTP verifica vínculo/sesión vigentes: si la revocación gana, no devuelve éxito.
La migración aditiva `20260905132652846` se aplicó y se regeneraron tipos; mantiene inserts anteriores.
Pruebas: 81 personas passed; PG persistence/UV 4 passed, exit 0, cleanup completo. Incluyen firma real de
otra persona, otro propósito, replay, ausencia UV y revocación; éxito mantiene `auth_time` y evidencia
corporativa originales. GC ahora conserva conteos agregados por ejecución en Cloud Logging al desplegar.


### Auditoría de integración visible — 2026-09-05

El primer fold TASK-1835 está materializado sólo como preview local con fixtures, GVC desktop/mobile
y revisión independiente; aprobación visual solicitada. No hay login real ni nuevo despliegue.
Durante la integración se detectó consentimiento ofrecido antes de revalidar binding y POST allow
sin revalidación de binding/step-up; se endurecen esas puertas antes de persistir aprobación.
El reader externo compartido ahora filtra grants vencidos manteniendo `NULL` legacy; prueba PG real
sobre tabla temporal 1 passed/exit 0, más 9 unitarias existentes. No se modificaron datos reales.
El DTO de nombres de organización/contexto está implementado en `oauth/consent-context.ts` y compuesto
por `internal/runtime.ts`: valida autoridad vigente, binding y versión, obtiene nombres canónicos y
mantiene capabilities separadas por organización. Sus 24 pruebas verifican aislamiento y denegación
sin fallback interno→externo. Authorize y POST de consentimiento ya lo consumen como dependencia
obligatoria; el renderer escapa nombres y conserva permisos por organización. No se infiere desde correo.

Suite ampliada posterior a estos fixes: 306 passed / 6 skipped en la invocación hermética (incluye
27 pruebas de captura y 9 del resolver externo). Los skips son live ya ejecutados aparte; la prueba
nueva de caducidad PG también pasó separadamente. Esto no acredita rollout.

Revalidación local posterior a integrar DTO y retorno de login: 342 passed / 6 skipped,
typecheck canónico de 8 GB y `pnpm build` exit 0.
El gateway pasa 114 pruebas y build/typecheck; incluye corrección de `market` en query de discovery,
que antes sólo viajaba en body. No hubo consultas facturables ni nuevo despliegue.

Authorize sin sesión enlaza a login conservando PKCE, cliente, audiencia y estado; el login ofrece
Microsoft sólo con flag interno ON y retorno relativo al authorize. `prompt=none` mantiene el error
OAuth sin interacción. Pruebas incluyen flag OFF, retorno manipulado y recuperación de email inválido.
Code y refresh revalidan también `allowedScopes` actuales del cliente antes de emitir: retirar write
impide renovarlo, mientras pedir explícitamente el subconjunto read sigue permitido. Dos pruebas
verifican firma/persistencia/rotación y ausencia de elevación. Esto no revoca access tokens anteriores:
para retiro inmediato se conserva el command de revocación; no se redefine la semántica del registro.

### Auditoría de origen y assets — 2026-09-05

Se cierran CSRF de mutaciones con cookie y login CSRF de magic link/passkey: origen hostil se rechaza
antes de consumir el reto/token o crear sesión, aun sin cookie entrante. Regresiones usan enlace y
firma WebAuthn válidos; el mismo material funciona después desde el origen permitido. El canary
envía Origin explícito. Suite ampliada: 363 passed / 6 skipped; typecheck de 8 GB y bundle esbuild del
emisor correctos. No se volvió a ejecutar el canary productivo ni se modificó el runtime desplegado.

Generador de marca incluye CSS canónico y fuentes/licencias, con rutas estáticas exactas y pruebas
de integridad/transporte. El shell ya consume CSS/fuentes y enlaza avisos bajo CSP estricta.
TASK-1835 integra segundo factor TOTP/UV y alta TOTP con QR local y confirmación de respaldo.
GVC de los renderers reales en harness ficticio pasa para login, consentimiento, segundo factor y
alta en desktop/móvil. Verificación Playwright: seis checks, cero violaciones, factores simulados.
Suite ampliada: 382 passed / 6 skipped; después, corrección de tipos WebAuthn/JSDOM con 15/15
pruebas focales y artifact drift check correcto. Typecheck global canónico de 8 GB final correcto.
UI completa, aprobación visual y recorrido operativo real siguen pendientes; evidencia en revisión
TASK-1835 y runbook. No hubo despliegue ni enrolamiento/grant real adicional.

### Preparación del piloto y recuperación — 2026-09-05

Errores internos de navegador tienen página segura y recuperación sin reflejar datos del callback;
JSON/status/Retry-After se conservan. GVC 1440/390 correcto y seis checks browser con mocks correctos.
Build completo, bundle del emisor y gates worker/manifest pasan. Suite enfocada final: 253 passed /
6 skipped; los omitidos no equivalen a ejecución live. Detalles y alcance de la publicación propuesta
en runbook §Preparación del piloto de lectura. Microsoft + scope read no requiere terminar login
passkey ni el resto de UI para probar el piloto; siguen abiertos rollout, canary y rollback reales.
Readback 15:02:44 UTC mantiene auth ready y gateway anunciando sólo el shim existente.


### Release y activación parcial — 2026-09-05

La evidencia anterior conserva el estado de cada etapa; esta sección actualiza el estado operativo.
Main `1086fe40a55396fc199ef2e446391c14a69b665d` fue publicado mediante PR 222 y el orquestador
único `33978290957`. Manifiesto `1086fe40a553-2bdc070c-ead3-4f52-8100-708d63b6aa39` en
`released`, completado a las 16:46:02.837 UTC; watchdog 5/5 correcto. CI, Deep Verification,
smoke y Production READY verificados. El motivo del override y `bypassWarnings=true` /
`overrideBatchPolicy=true` quedaron coincidentes en manifiesto y auditoría. El actor GitHub
`cesargrowth11` es una etiqueta de ejecución; la autoridad Greenhouse fue verificada aparte mediante
`can()`, sin inferir que ambos identificadores son la misma identidad.

- Reader Production: flag interno `true`, redeploy `dpl_4Ytq4GHm6rCSoDXAxK2vM5Br6gQ9` READY.
- Emisor: `auth-server-00011-xkj` con acceso interno `true`, READY, 100% del tráfico y health PG/KMS correcto.
- GC: flag durable `true`, revisión `ops-worker-00652-x8t`, scheduler `ENABLED`. Ejecución manual a
  las 16:47:28.755 UTC y log de las 16:47:29.331 UTC: `dryRun=false`, `locked=true`, once tablas,
  cero filas borradas. Esto prueba la invocación y sus guardas, no la necesidad de borrar filas.
- Gateway: código `fa1ee` en revisión `00031`, flags internos restaurados a `false`. La activación
  `33979293155` falló al intentar reconstruir un tag inmutable. El workflow fue corregido para reutilizar
  el digest fijado; 125 pruebas correctas y revisión de root aprobada. Su publicación está en curso;
  no se acredita todavía activación del gateway ni acceso MCP del piloto.
- Login humano: iniciado con Microsoft para el piloto, pero el proveedor solicita contraseña reciente.
  El usuario fue informado. Aún no se obtuvo sesión/token corporativo ni se completó el canary autenticado.

La reversión del intento de activación del gateway no sustituye el ensayo de rollback completo:
continúan sin marcar los criterios de tokens/canaries reales, latencia de revocación, coexistencia y
rollback medido. TASK-1836 conserva `in-progress`.

### Follow-up del primer login corporativo real

Microsoft completó MFA y devolvió code/state sin error; PG confirma consumo de transacción dentro
de vigencia a las 17:02:43.698 UTC y rechazo `upstream_rejected` a las 17:02:44.085 UTC. No se
acredita causa exacta con ese código agregado. Se corrigieron dos defectos reproducibles/contractuales:
OIDC solicita `openid profile` para disponer de `oid`, y el reloj JWT se lee después del intercambio.
Diagnósticos internos limitados a enum, sin datos secretos ni exposición HTTP adicional. 65 pruebas
integradas y typecheck correctos; emisor OFF durante publicación, reader/gateway preparados.


## Corrección de integridad del writer compartido — 2026-09-05

Hallazgo comunicado por Claude TASK-1631/1831 y confirmado independientemente por Codex. El operador
confirmó que Claude no modifica el módulo y asignó la corrección a Codex. Binding
`xob-139e3fe2-f897-4eff-83c6-39c29193d934` y grant
`xcg-a6de7627-f57f-4686-9d70-ef850b62a526` tienen cero audit externo canónico. Sí existen audit interno
enrolled/capability_granted y ambos eventos internos publicados. Cero access tokens emitidos para el
binding. No afirmar ausencia total de auditoría ni exposición demostrada.

El detector nuevo, ejecutado read-only sobre PG antes de reconciliar, devuelve
`identity.external_binding.unaudited_write`, severity error, `unaudited_write_count=2`.
Tests focales: 9 unitarios y 1 live de SQL pasaron; el live usa tablas TEMP y rollback, no muta datos reales.
La reconciliación válida exige evento aplicado, IDs correlacionados y metadata interna/version numérica1;
auditoría ajena, denegada o metadata incorrecta no oculta la anomalía. Implementación local, aún no publicada.

Decisión A registrada en ADR: primitives canónicas compartidas y población persistida; enrollment interno
es la membership interna, `linked` se conserva para externos. No crear invitaciones ficticias ni cambiar
lifecycle comercial de Efeonce. EO-ORG-0007 tiene `status=active`, `active=true`, `is_operating_entity=true`
y `lifecycle_stage=inactive`; se exige también status activo para no ignorar una suspensión administrativa.

Pendiente: finalizar y revisar migración/clasificación y command de reconciliación, comprobar atomicidad,
recuperación cruzada y conflictos, aplicar con dry-run/evidencia, repetir smoke y live, publicar y recién
entonces repetir login/MCP/revocación/rollback. El release OIDC223 completado no cierra esta corrección.


### Revisión independiente de continuidad — 2026-09-05

Objetivo y rollout autorizados conservados del traspaso; hook `pnpm codex:task-hook TASK-1836 --subagents`
ejecutado en develop compartido. Ownership separado: resolver/gateway, señales y reconciliación; root
posee migración, integración y publicación. El operador autorizó después el commit completo
`7d704f483` que Claude creó con TASK-1836 y Berel; el WIP UI posterior queda separado.

Auditoría: núcleo usa el mismo PoolClient para estado/audit/outbox/gv y serializa por environment/binding.
Se corrigen clasificación interna como unbound, falta de detector permanente y migración manual. La revisión
adicional halló grants internos NULL aceptados por reader y reconciliación que no verificaba capability,
vencimiento y pareja audit/outbox. Son condiciones de integridad previas a aplicar, no aprobaciones heredadas.

PG leído en esta sesión: ninguna migración authority-populations registrada, columna population ausente,
última migración `20260905132652846`. Cloud Run `auth-server-00013-jhz` con acceso interno false.
`pnpm migrate:create task-1836-authority-populations` generó `20260905183812333`; el SQL anterior se trasladó
byte-for-byte (SHA256 `13f6eb700192fa102dd4558abd3b9a6f935d7d657206414e3a3a3f3ae5dbabc7`) antes de retirar el
archivo manual no aplicado. Después se amplió CHECK de outcomes, validación del grant y guard final.

Down es forward-only: eliminar población fusionaría contratos de autoridad y no restauraría el historial
ni los tokens invalidados por gv. Rollback operativo apaga emisión/dispatch interno y conserva estructura;
una corrección de datos posterior exige nueva migración/command, nunca deshacer historia.

Plan restante: SQL live final y pruebas de reconciliación -> smoke externo -> gates locales -> apply de
migración/regularización con readbacks -> release gobernado -> canary humano, refresh, revocación y rollback.
No se marca aceptación por pruebas anteriores al diff final.


### Integridad aplicada y publicación en espera — 2026-09-05

- Runner: sólo una migración pendiente; `pnpm migrate:up` exit 0, registro y columna releídos,
  tipos PG regenerados (una columna population). Piloto gv 2 → 3. Emisor OFF antes del cambio.
- Reconciliación autorizada con actor canónico y razón explícita: dry-run 1 binding/1 grant,
  apply 1/1, nueva revisión dry-run 0/0, gv 3. No amplía capability ni vencimiento original
  2026-09-12T15:00:00Z. Audit/outbox actuales correlacionados; historia interna original conservada.
- Readback de SQL real: `unaudited_write_count=0`, `mixed_population_count=0`, ambas severity ok.
- Suites finales: 118 unitarias / 12 archivos; 20 live / 4 archivos; recuperación externa live
  adicional 1 passed (segunda invitación, subject viejo invalidado y vínculo interno protegido).
  Typecheck previo y gates worker/build-inputs, manifest y mirrors correctos; gateway 126 pruebas.
- Build compartido compila pero falla TypeScript en WIP UI ajeno: `render.ts` importa `ICON_LOCK`
  inexistente en `icons.ts`. El operador eligió esperar a Claude; no se modifica ese WIP ni se
  declara build verde. No se ejecutó push, release ni activación por esta reparación todavía.

- Smoke externo read-only y apply completados: alta/invitación/aceptación/bound/revocación,
  fixture final revocada; audit e idempotencia correctos. La señal unbound conserva warnings
  por los probes negativos de las últimas 24h; no se eliminaron logs para ocultarlos.
- Readback del piloto verifica ambos pares canónicos y reconciliationId
  `41659bc7-c6f0-4eb0-8c46-6dafb80e562b`, actor y motivo, dos IDs originales y expiración sin cambio.
- Claude añadió posteriormente ICON_LOCK; esto no acredita que terminara la UI ni un build nuevo.
  Se respeta la instrucción de esperar su cierre antes de repetir build/publicar.
- `task:lint` template=1, errors=0, warnings=0; `docs:closure-check` exit 0 con advertencias
  documentales preexistentes/de revisión. Lifecycle sigue in-progress; no se mueve la task.


### Reanudación después de Claude — 2026-09-05 19:51 UTC

El operador confirmó cierre de Claude y autorizó avanzar con todo. Se revisaron los commits UI
eec90bf10…dcb299cb7 y la reparación 0fc7a4bc5, con árbol limpio al retomar. Dirección visual aprobada
A/Nocturno editorial; los criterios integrales de TASK-1835 siguen en su task y no se declaran completos
por este piloto. 407 pruebas unitarias y 6 checks de renderers/controladores locales pasaron.
La nota de Claude sobre flags de main estaba stale: origin/main a68662508 ya declara OAuth/person true;
se corrigió la nota. GitHub internalAuth false y permisos del operador de excepción batch revalidados.
Preflight configurado: PG/migraciones/WIF/Sentry correctos; faltan SHA publicado/CI y excepción batch
por migración ya aplicada. Ningún bypass de evidencia CI/readiness. Gateway d7469d7, CI33988476298
con contenedor success; deploy33988521730 en curso.


### Release de integridad y activación — 2026-09-05

PR224 integra el commit mixto autorizado, UI Claude y reparación0fc7a4bc5. Claude añadió
25f3db5f9 (ayuda de uso del reconciliador); se revisó y probó antes de publicar. Main:
`d551cf3689db54989552ebfe701c65afba94bc33`, merge20:32:57Z. CI33990441436,
Deep33990441433 y smoke33990452162 success; Vercel Production
`dpl_E6xpKi4XsYFKGduwL7MqVxHhPHsQ` READY para ese SHA.

Preflight final12 checks: todos status ok, única severity warning por batch con migración ya
aplicada. Excepción autorizada con capability del actor humano revalidada; no se exceptuaron CI,
readiness ni el timeout transitorio del primer chequeo (reintento correcto). Orquestador único
33991304002 success20:50:47→21:04:59Z, ambos gates Production aprobados. Manifest
`d551cf3689db-8a4af809-0c28-496d-82c9-a17ed7593ce3` released21:04:51.013Z;
PG conserva razón y actor GitHub cesargrowth11 como transporte, autorización humana Julio explícita.
Health21:03:32Z; watchdog21:05:11Z severity ok,5/5 sincronizados. Auth/ops sirven ace63705e:
diff completo contra main sólo `scripts/identity/reconcile-internal-authority.ts` (CLI, fuera de
rutas runtime); no se afirma igualdad de árboles completos.

Gateway sibling d7469d72085b894e364ff7fedb8fbfc34204e49f, deploy33988521730 success,
revisión efeonce-mcp-gateway-00033-597100%; digest
sha256:4408d4b5362e7bb78b523b5c771a7f95f02375388678dc3f652e6ab095dbd8b8.
Reader Production: identidad interna por contrato externo devuelve200/internal_population,
memberships[]; sin credencial401/invalid_token y contexto incompleto400/bad_request.
Señales unaudited_write y mixed_population0; eventos de reconciliación publicados18:54:03.284Z.

Tras release/readbacks, GitHub internal flag true y auth-server-00015-jrc Ready100% con
AUTH_SERVER_INTERNAL_AUTH_ENABLED=true, OAuth/person true y misma imagen validada
sha256:46bbc001c57335b6177b62f9a184d07f772900c5a7ce0f40d1139ed4fe0bebcd.
Browser verificó UI Claude, selector Equipo Efeonce y Continuar con Microsoft dentro del flujo
OAuth. /login directo no presenta ese botón porque no tiene return_to válido; no es un cambio visual
introducido durante este release. Microsoft requiere contraseña reciente de la cuenta corporativa;
operador solicitado en navegador, sin pedir ni capturar credenciales por chat. Sesión/token/canary,
refresh, revocación y rollback siguen sin acreditar al corte21:09Z.

### Callback real rechazado y diagnóstico específico — 2026-09-05 21:20 UTC

Audit PG ocurrido21:15:25.036Z, stage consume, outcome rejected, reason upstream_rejected,
diagnostic jwt_validation_failed. La solicitud21:15:08.701Z fue aceptada. Esto sitúa el fallo en
JOSE tras el intercambio, sin demostrar todavía firma, claim o reloj específicos. No reutilizar el
código consumido ni acreditar un token a partir de la aprobación Authenticator.

Contención: GitHub internalAuth false y auth-server-00016-srj Ready100%, flag false verificado.
El operador autorizó subagentes y Azure CLI: app/SP/tenant/redirect/optionalClaims correctos,
auth_time esencial, sin claimsMappingPolicies ni tokenIssuancePolicies aplicadas; discovery y JWKS
públicos corresponden al código. Graph aún no devuelve sign-ins de21:15; registros17:02 no prueban
este intento. requestedAccessTokenVersion null sólo afecta access tokens, no justifica cambiar ID-token.
Fuentes: [Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/apiapplication?view=graph-rest-1.0),
[ID token claims](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference),
[OIDC max_age](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest).

La ampliación local clasifica causas JOSE en enum cerrado (firma, clave, algoritmo, claims requeridos,
issuer/audience, nbf y exp). No retiene payload/cause ni modifica respuesta pública o validadores.
20 pruebas focales y suite106 passed;4 live skipped no constituyen evidencia nueva. Revisión independiente
sin hallazgos materiales; fixture deliberadamente malformada tipada explícitamente. TypeScript directo y bundle del emisor (opciones del Dockerfile) exit0. Build Next compiló, pero fue
interrumpido tras aproximadamente14min en su fase de tipos; no cuenta como build completo aprobado.
Publicación, nuevo canary y corrección de causa real pendientes.

Azure adicional: tokenLifetimePolicies de app y SP vacías, inventario global0; sin política de duración
configurable que explique el fallo. OIDC no prescribe auth_time<=iat y MSAL oficial valida frescura
contra now, pero ese guard posterior a JOSE no explica este diagnóstico; sin cambio especulativo.

## Follow-up 21:48 UTC — expiración confirmada, solicitud OIDC en corrección

Audit real: request21:47:13.951Z ok, callback21:48:03.553Z upstream_rejected / jwt_expired.
No hubo token MCP. Diagnóstico servido SHA e4977392b, rev17; intento en rev18; apagado rev19.
Revisión independiente avala prompt=login con auth_time obligatorio/fresco contra transacción
y presente, exp estricto, sin exigir orden auth_time<=iat. Regresiones firmadas cubren iat
retrospectivo, auth_time futuro/ausente/antiguo, exp vencido y límite start−60s/start−61s.
La comparación con NextAuth Greenhouse muestra tolerancia10s y ausencia de max_age; no se
copia esa tolerancia ni su resolución de identidad. Ver ADR/runbook para fuentes y límites.
