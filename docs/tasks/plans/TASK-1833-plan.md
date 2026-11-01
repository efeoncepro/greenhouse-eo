# TASK-1833 — plan de assurance actualizado, 2026-10-25

> Estado posterior26Oct: consultar la [task vigente](../in-progress/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md) y sus criterios/evidencias. Este plan conserva la secuencia e hipótesis de su fecha; sus pendientes históricos no sustituyen el estado actual. Auth retenido en PR; interfaz Claude Design y activación general separadas.

Goal autorizado por Julio: producción controlada Auth + Rooms, infraestructura/deploy necesarios y correo
real únicamente a `jreyes@efeoncepro.com`. Coordinador raíz posee release, entornos y comunicaciones;
este slice de discovery no autoriza ni ejecuta cambios cloud. No se usan modelos adicionales ni API pagadas. Julio sustituyó expresamente la contratación externa: la evaluación ofensiva la ejecutamos nosotros, con otro agente refutando y retest reproducible; no certificación de tercero.

## Baseline y desbloqueo documental

TASK-1829/TASK-1830 no son ausencia de superficie: sus Status real y la
[evidencia consolidada1836/1831](../../audits/2026-09-06-task-1836-1831-consolidated-evidence.md) acreditan
OAuth, personas, sesión, step-up y canaries autenticados. Sus matrices pendientes mantienen sus propios
criterios abiertos. Quitar el bloqueo genérico permite auditar; no completa esas tasks.

La [evidencia local Rooms/Auth](../../audits/identity/2026-10-25-auth-rooms-first-local.md) registra571tests,
SQL6+3, Chrome+PG ambos runtimes para OIDC y OTP guest. Eso acredita implementación local y regresión,
no instalación productiva ni correo recibido. Las [pruebas2067](../../audits/identity/TASK-2067-email-otp-local-qa-2026-10-25.md)
registran HMAC, anti-abuso, proof scoped, token_sensitive y fragmento canónico. No se suman suites solapadas.

Readback independiente2026-10-25T21:55Z, sólo lectura:

| Superficie | Evidencia actual | Límite |
|---|---|---|
| Cloud Run Auth | `auth-server-00165-kn4`, Ready/100%; `/healthz` SHA `ba15711d022cb0450e2e9d185e692d02631fc306` | No sirve cambios1834/2067; metadata sigue sólo MCP |
| `/readyz` |200; postgres/kms/activeKey ok | No prueba correo, nueva sesión ni consumer |
| JWKS público |2kids: `xjjMaYxidu3Vk57K5py6w6WGDN41T0WMeOtHMEyppKc` y `VjbDUgwc5bd1zj5olC8VndMXKk_G60tLF8xRw945nI8` | No acredita por sí solo estado SQL/uso de cada llave |
| KMS metadata |v1/v2 HSM ENABLED, creadas04Sep | No se hizo firma/rotación ni se leyó privada |
| Scheduler GC |`ops-auth-ephemeral-gc` ENABLED; `13 * * * *`, America/Santiago; lastAttempt21:13:03Z | Último intento no prueba counts; leer evento del worker |
| Scheduler rotación |`ops-auth-key-rotate` NOT_FOUND en us-east4 | Gap real; no se infiere ausencia en otra región |
| CLI registro keys |`pnpm auth-server:rotate-key -- --status` falla por AUTH_SERVER_KMS_KEY local ausente | No modificó nada; root debe aportar config pública y leer registro |

## Revisión A1–A7

La auditoría04Sep era de diseño. Revisión25Oct contrasta cada requisito; ningún estado histórico se presenta
como prueba fresca de producción.

| Caso | Implementación/evidencia posterior | Pendiente aplicable ahora |
|---|---|---|
| A1 procedencia/assurance |`internal/oidc.ts`, `postgres-sessions.ts`, `subject-port.ts`, `context.ts`: tenant/oid firmado, evidence corporativa, session-bound step-up y auth_time conservado; canary1836. `first-party/identity.ts` revalida link/profile/enrollment/evidence; OTP no crea sesión SSO ni claimsub | Canary real Rooms conserva sujeto, freshness y revocación; no declarar upstream MFA como factor local; ACR/AMR first-party no anunciado |
| A2 discovery/coexistencia |TASK1831/1832 multiissuer y matrices externas sintéticas; TASK1844 producción con clientes reales. Metadata actual MCP200. Perfil first-party local agregaopenid/IDtoken y audRP separados | Verificar metadata/JWKS/callback/iss/nonce en issuer nuevo y RP destino; regresión MCP autenticada proporcional sin ampliar cohorte |
| A3 confused deputy |Login upstream OIDC puro, consentimiento por cliente/contexto MCP; first-party registry exclusivo, prefijo reservado, sin consentimiento falso; pruebaRP A/B y scopesMCP rechazados | Pruebas HTTP deployed con credentials propias; DCR/CIMD no elevan clase; consentimiento MCP nuevo/scopes elevados no se omite por sesión Auth |
| A4 listado/directa/cursors/concurrencia |TASK1844 registra A/Bpermitido,Cdeny, cursor revocado, revocación selectiva/familia/contexto y rollback en clientes; first-party PGlocks/replay y Rooms0/1/N/cross-org local | El canary Rooms debe medir deny después de revocación con token aún vigente y permitir el control autorizado; no extrapolar p95reader ni cobertura total gateways |
| A5 rollout |Despliegue compatible OFF, migraciones, readback, RP/secret exactos, canary y rollback descritos en ADR/plan1834; versionesactuales leídas | Root ejecuta y registra secuencia en infraestructura compartida; staging no significa aislamientoSQL |
| A6 decisiónupstream |ADR `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` Accepted; Entra implementado y ejercitado | No decisión abierta; verificar configuración/secret vigente, no crear otro proveedor |
| A7 referencia659 |Task corregida y matriztraza actual | Sin gap técnico; no vuelve como blocker |

Fuentes: [auditoríaoriginal](../../audits/2026-09-04-task-1836-mcp-design-audit.md),
[QA1844](../../audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md), código/tests1834/2067 y dossierslocales.
Los dos casos gateway originales restantes (roles sin scopes y equivalenteEntra) mantienen dueño1831;
no se tildan por esta revisión ni bloquean el hecho de iniciar assuranceRooms.

## Matriz de evidencia del piloto y cierre completo

| Gate | Piloto controlado Julio | Primera organización cliente pagando/cierre1833 |
|---|---|---|
| Cohorte y efectos |Sólo operador nominado; correo real exclusivamente al destinatario autorizado. Binding/principal/grants explícitos; ningún autoenrollment |Cohorte/contratos/privacidad aprobados y capacidad observada antes de expansión |
| Abuse cases |Negativos locales ya ejecutados, revisión independiente y verificación secuencial del alcance activado; sin hallazgos críticos/altos abiertos |Catálogo>=10 con refutación por agente separado, retest y sin críticos/altos abiertos; no tercero |
| Deployment |Migraciones/secret mounts/IAM/flags/callback y bundle exactos; fallback/rollback ensayables, evidence runtime |Release gobernado y observabilidad sostenida; no confundir canary con rollout general |
| Correo |Remitente real, token_sensitive, un correo enlace+código; trackingfragmento verificado; provideraccepted separado de recibido/abierto |Política delivery/retención y observación de fallos/abuso para cohorte |
| Sesión |OIDC login y guestproof independientes; callback exacto, roleslocales; revocación/expiry y crossorgdenial |Matrizconsumer completa, límites logoutglobal1840 explícitos |
| KMS/ops |Llave activa sana; verificar retiring/overlap; GC nuevo observado; señales de errores/replay/OTP consultables |Rotación programada con IAM mínimo y posverificación, steady7d, simulacroincidente |
| Privacidad |Minimización y retención técnica explicitadas para el ensayo autorizado; sin declarar cumplimientolegal completo |RevisiónV2/RAT y validaciónjurídica aplicable; evaluación propia y límites declarados |

Esta separación no concede una excepción silenciosa a Production: el coordinador debe cerrar los gates
aplicables del piloto y registrar el alcance aceptado antes de activar. TASK1833 permanece abierta.
No se contrata pentest ni se mantiene pareo histórico obligatorio de proveedores. La revisión separada de agentes disponibles cumple la instrucción humana actual; no se presenta como certificación comercial independiente. No se contratan servicios jurídicos ni se pagan APIs por inferencia.

## Gaps críticos y archivos para ejecución coordinada

1. **Observabilidad nueva:** `first-party/protocol.ts` registra replay como event_type `token` con
   `details.reason=first_party_code_reuse`; el reader actual sólo cuenta event_type `code_reuse`.
   OTP registra `authorize`/surface `invitation_email_otp`, sin reader específico. Proponer extensión de
   `src/lib/reliability/queries/auth-server-signals.ts` y sus tests con proyección agregada y negativas:
   first-party replay, OTP rate_limited/delivery_failed/unavailable. No leer email/link/code/proof en señales.
2. **GC observable:** `maintenance/gc.ts` ya integra helpers; `services/ops-worker/server.ts` loguea counts
   pero no `extensions`. Agregar estado de helpers al evento acotado para distinguir ran/not_migrated/
   retention_mismatch/lock_unavailable sin depender del body que Scheduler descarta. No cron nuevo.
3. **Rotación real:** reader `rotation_overdue` (edadúltimaactivación>80d), command idempotente por ventana y
   lock, endpointOIDC ops-worker y scheduler trimestralpaused inicial. Reusar register/retire, verifyJWKS,
   overlap>=TTLmax+margen y audit; nunca delegar createKeyVersion al SA del issuer por comodidad.
   Archivos propuestos `auth-server/maintenance/key-rotation.ts`, tests, ops-worker/server/deploy y runbook.
   Root asigna ownership antes de código; retirov1 requiere readbackSQL y evidence, no inferencia del JWKS.
   **Actualización 29-10:** este carril `ops-worker` fue reemplazado por el
   [Job aislado aceptado para implementación local](TASK-1833-key-rotation-proposal.md).
   El candidato está en `codex/auth-pr-develop-stack`; Scheduler/IAM/cloud siguen pendientes.
4. **Runbooks:** ampliar `docs/operations/runbooks/auth-server.md` y crear incident/key-rotation con comandos
   exactos y pasos de simulacro; conservar revocación canónica por persona/organización/contexto. No SQL manual
   de emergencia que eluda auditoría/grants. Reconciliar el párrafo stale que todavía llama GC follow-up.
5. **Privacidad:** `EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V2.md` debe inventariar issuer/Rooms/Resend,
   claims/HMAC/emailledger y cada tabla con retención real; V1WorkOS no aplica. El agente técnico documenta
   hechos; validaciónjurídica requiere skilllegal y fuentes vigentes, no se afirma cumplimiento aquí.
6. **Readbacks de release:** root/peer aplican migraciones, registranRP, montan secretos separadosHMAC/
   authority/client, migranRooms y prueban recorrido. Revisar effectiveconfig sin imprimir valores. Herramientas:
   deploy.sh canónico, workflows/manifest/watchdog, pgdoctor/migrations, GC logs, correoledger y navegador.

## Catálogo mínimo reproducible por frontera

Casos ya cubiertos localmente, a trasladar selectivamente al entorno bajo control y correlación redactada:

1. PKCEplain/faltante/verificadorincorrecto →deny.
2. Redirect/client/audience exactos y códigoRP A contraB →deny sin consumir códigoA.
3. Replay código concurrente →invalidación y sin handleinsertado tardío.
4. RPsecond roundtrip independiente; tokenA no introspecta/revocaB.
5. Scope/resourceMCP sobreRP →deny; DCR/CIMD no elevan registro.
6. Estado/nonce/contexto/returnforjados →deny; templateproducto sólo registryserver.
7. promptlogin/max_age0 con sesión del mismo segundo →authnueva; promptnone→login_required.
8. Revocaciónperfil/link/session/enrollment entreauthorize/token/introspect→deny.
9. OTP staleversion/recipient/foreignRP/replay/bruteforce/resendbudget→deny sinreiniciarbudget.
10. OTP auditoutage incluyendo retry→unavailable sin doblecorreo; proof scoped sinsub/cookieSSO.
11. Canonical invitationfragment exacto y authorityfixedorigin/no redirects/boundedtimeout→deny si altera.
12. Rooms0/1/N, crossorg404, grantrevoked y controlválido después de deny; logoutlocal≠global.

Fixtures/harnesses usan PG efímero y correoRAM; límites/bruteforce concurrente nunca contra SQLcompartido.
La evidencia local se incorpora al catálogo, pero un segundo agente debe refutar y verificar los resultados antes de marcar el caso aprobado. No exige proveedor diferente tras el steering explícito.

## Secuencia y criterios de salida

1. Corregir Status/blockers sin cerrar1829/1830; ejecutarhook1833 y conservar diagnósticoQA.
2. Root asigna fixes concretos anteriores; evidenciapruebasnuevas red/green si corrigen bug.
3. Preparar migraciones/infra/config OFF; revisar materialesdecanary y rollback antes de write.
4. Root activa cohortenominada y verifica OIDC + OTPcorreoúnico + resourceaccess + revocación, secuencial.
5. Verificar GC/señales/logs sin payloads y capturar revisiones/envrefs redaccionadas.
6. Mantener1833 in-progress con evaluaciónofensiva/rotaciónprogramada/privacidad/steady abiertos cuando no probados;
   separar éxito del piloto de aceptaciónclientepagando. Actualizar criterios donde se leen.

QA discovery: `pnpm qa:gates --changed --agent codex --task TASK-1833 --runtime --auth --security --docs`
exit0 (router, no certificación). Worktree compartido137paths, no broadstage/commit ni modificación ajena.

## Ownership autorizado después del discovery

- auth_discovery: catálogo backend y señales `src/lib/reliability/queries/auth-server-signals.ts`, tests y registro.
- login_discovery: revisión adversarial independiente de protocolo, sin fixes concurrentes.
- raíz: rotación/runbooks/release; peer Rooms: hardening del consumer.
- Tiempo irreducible: ventana de solapamiento de llaves>=1h, steady7d si se mantiene como criterio de cierre, expiraciones TTL y recepción real del canary; no se sustituyen con tests ni se declaran retroactivamente.

## Resultado del slice de señales

Implementados `rotation_overdue` y cuatro indicadores first-party/OTP dentro del reader canónico. Pruebas17PASS, SQL aislado7PASS, sensibilidad por mutación comprobada y restaurada; typecheck y lint focal PASS. Evidencia y matriz de20casos en [evaluación ofensiva](../../audits/auth-server/AUTH_SERVER_RED_TEAM_2026-10-25.md). La refutación y el readback productivo permanecen separados.

## Propuesta posterior: rotación con privilegios aislados

Discovery25Oct identificó creación KMS previa al registro PG y ausencia de firma previa al cambio activo.
El [Job dedicado](TASK-1833-key-rotation-proposal.md) fue aceptado el 29-10
para implementación local: ledger, recuperación de resultado incierto y SA
exclusiva, sin ampliar `ops-worker`. El candidato local está construido y
probado; no existe Scheduler nuevo ni ensayo cloud acreditado.
