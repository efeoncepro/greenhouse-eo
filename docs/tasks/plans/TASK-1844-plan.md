# Plan — TASK-1844: autoridad interna multiorganización

- Fecha: 2026-09-08.
- Estado: **aprobado por el operador el 2026-09-08**. **Complete: producción, clientes, rollback y retiro de fixtures verificados el 2026-09-08**. [QA](../../audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md) y [runbook](../../operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md).
- Goal: confirmado por el operador («Ok vamos»). Implementación y evidencia A/B/C, revocación,
  concurrencia, refresh y rollback en Greenhouse y efeonce-mcp; clientes Codex/Claude reales para cierre.
- Checkout: Greenhouse `develop`, gateway `main`, ambos compartidos; sin worktrees ni subagentes.
- Límite: scope base, externos/canary y Entra sin ampliación. Rollout preparado para aprobación final.
- [Task](../complete/TASK-1844-efeonce-mcp-internal-multi-organization-authority.md) ·
  [Delta ADR Accepted](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md#delta-task-1844--autoridad-interna-multiorganización-accepted).

## Discovery summary

```text
=== AUDIT: TASK-1844 ===
SUPUESTOS CORRECTOS:
- Contexto interno v1, reader machine-only y policy gateway existen y se pueden extender.
- El consentimiento acepta una colección; el scope base no equivale a acceso a organizaciones.
SUPUESTOS DESACTUALIZADOS:
- No basta cambiar el DTO: PG exige context_version=1 y su unicidad no incluye versión.
- canDelegateInternalCapability usa permisos base, sin defaults/overrides persistidos.
- session_360/relationship-resolver no filtran todos los estados y fechas de los roles.
- UI impact none omite el texto necesario para consentir autoridad organizacional dinámica.
- El test de resource indicado en la spec no existe; el real termina en .internal.test.ts.
ARQUITECTURA / DOCS OBLIGATORIOS:
- Autoridad interna, OAuth, entitlements, entrada/consentimiento y gateway; ver enlaces de la task.
CÓDIGO EXISTENTE PARA REUTILIZAR:
- Context service, relationship-resolver, runtime entitlements y merger de admin governance.
- Identity binding resource, authorized-tools wrapper y renderer del consentimiento.
SCHEMA / RUNTIME REAL:
- PG y revisiones Cloud Run leídos; evidencia y límites detallados abajo.
ACCESS MODEL:
- Actor interno estricto + relación canónica + entitlement efectivo + objetivo explícito.
SKILLS A USAR:
- efeonce-mcp-platform, mcp-craft, software-architect-2026, secret-hygiene, UI-lite, QA y docs.
SUBAGENTES:
- sequential; el goal los excluye y los contratos entre slices son dependientes.
RIESGOS / BLAST RADIUS:
- Persistencia/contextos OAuth, permisos por space, dos consumidores y rollout con varios writers.
OPEN QUESTIONS RESUELTAS:
- Discovery será una tool read-only; gv identifica el ancla, no una lista de targets.
- Contexto inmutable v2 obliga a consentimiento nuevo; nada promueve v1 durante refresh.
- No habrá caché positiva; siguiente request tras revocación comprometida debe denegar.
```

### Evidencia obtenida antes de editar

| Superficie | Observación del 2026-09-08 | Qué prueba / límite |
|---|---|---|
| Git Greenhouse | `6ad00d5740839cae0938bb5159bbc0be73cabc8a`, `develop`, limpio | Base de discovery; no corresponde al SHA servido por auth-server |
| Git gateway | `cd229069ee9e7f0d1f75d56d08d9dd93833eadd1`, `main`, limpio | Coincide con la revisión observada; no hubo edición del gateway |
| `pnpm pg:doctor` | acceso CLI/ADC y rol runtime correctos | Conexión canónica; no se ejecutó migrador |
| PG, transacción READ ONLY, 17:38:50Z | CHECK `context_version = 1`; índice único `(session_hash, client_id, binding_id, issuer, audience)` para contextos no revocados | Necesita evolución coordinada del writer y del índice |
| PG | seis contextos, todos v1; consentimiento tiene unicidad por `authorization_context_id` | No existen contextos v2; nuevo contexto ya separa el consentimiento |
| PG / SQL | roles tienen `status`, `effective_from`, `effective_to`, `scope_level`; defaults/overrides tienen `space_id`; overrides tienen aprobación y vencimiento | El reader debe usar esos hechos; `session_360` omite `effective_from` y `status` en roles |
| auth-server Cloud Run | `00043-ndg`, Ready/100 %, SHA `fb5fc082aa92f6b65d0be0ff9e519ce648752f2f`; OAuth/interno ON; flag multiorg ausente | Estado del servicio consultado; no recertifica login/token ni Vercel |
| gateway Cloud Run | `00047-8b5`, Ready/100 %, SHA `cd229069ee9e7f0d1f75d56d08d9dd93833eadd1`; native/internal/canary ON; flag multiorg ausente | Baseline operativo; el canary ajeno continúa bajo su owner |
| Vitest focal | 4 archivos / 39 pruebas + resource real 1 archivo / 13 pruebas, todos passed | 52 pruebas existentes; no prueban v2 ni PG live ni clientes |

Lecturas PG usaron el loader/driver canónicos, `BEGIN READ ONLY`, timeout y `ROLLBACK`; sólo se
imprimieron constraints, columnas y conteos. No hubo modificación de permisos, sesiones ni datos.
La primera invocación Vitest incluía una ruta inexistente que el filtro ignoró; la segunda ejecutó
explícitamente `ecosystem-identity-binding.internal.test.ts`. No se contabiliza una prueba omitida como verde.

## Access model

1. Resolver persona/enrollment/sesión corporativa/contexto con los stores internos actuales. Mantener
   validación de emisor, audiencia, cliente, entorno, sujeto, `jti`, expiración y `gv` del ancla.
2. Resolver exactamente un usuario interno activo por perfil. Ambigüedad, actor externo, persona inactiva,
   sesión revocada, contexto incorrecto o datos ausentes deniegan. No usar `LIMIT 1` para ocultar colisiones.
3. Cargar roles vigentes con estado activo, `effective_from <= now`, `effective_to > now` y alcance
   aplicable. Las routeGroups/views son requisitos del módulo, nunca permiso por sí solas.
4. Componer la relación canónica: asignación interna vigente al cliente/space de esa organización o
   relación administrativa canónica vigente. La segunda además exige entitlement efectivo de lectura
   organizacional con alcance global. Un nombre de rol aislado no concede targets.
5. Reutilizar `base -> role defaults -> approved user overrides` mediante un merger canónico extraído de
   admin governance, sin recorrer el overview administrativo ni usar su proyección cacheada. Mantener
   claves capability/action/scope, precedencia y vencimiento; no inventar una regla deny global diferente.
6. Evaluar el contexto plataforma y los spaces canónicos de la organización. La lectura que agrega toda
   una organización requiere permiso en todos sus spaces aplicables, no la unión de un space privilegiado
   con otro denegado. Relaciones/space ambiguos deniegan. Un caso sin space sólo puede habilitarse cuando
   el contrato del módulo soporte explícitamente ese caso; para SEO no se inventa un fallback.
7. La capability objetivo usa sus acciones/defaultScope del catálogo. Por ejemplo SEO read tiene alcance
   `tenant`, incluso para un administrador; no exigir artificialmente `all` a esa capability.
8. El provider conserva su propio recheck. Antes de certificar A/B, verificar que cada tool cubierta
   alcance el mismo objetivo y no derive el tenant del contexto ancla.

No crear grants de targets en `external_capability_grants`. El vínculo interno legacy sigue sirviendo
como ancla de identidad/versionado; v2 obtiene authority de targets desde relaciones y permisos efectivos.
V1 conserva su interpretación original. El allowlist inicial v2 es `growth.seo.observation.read`, la clase
de lectura ya soportada por el gateway. No se habilitan nuevas escrituras ni providers sin adapter delegado.

## Architecture decision

- ADR existente Accepted: autoridad interna v1. Se preserva su historia.
- ADR propuesto: delta TASK-1844 en ese mismo dueño, referenciado desde DECISIONS_INDEX.
- Antes de código: aprobación de este plan y del delta; no confundirla con aprobación de deploy/apply.
- Placement: `remain-shared`; reader server-only en `src/lib/identity/internal-access`, extracción
  pequeña de entitlements en `src/lib/entitlements`, consumers OAuth/API Platform/gateway. Sin nuevo
  package, nueva app, dependencia pesada ni SQL en gateway.

## Backend/data contract

### DTO y autorización por request

- Contexto v2 mantiene ancla y `gv`; el JWT sólo agrega su versión correcta, sin targets ni wildcard.
- Extender el resource existente con intenciones discriminadas `catalog | target | organizations`.
  Las dimensiones del token siguen siendo obligatorias y se comparan con ledger y contexto vigente.
- `catalog`: contexto válido + capabilities delegables actualmente. Sirve para visibilidad de tools,
  nunca como decisión de dispatch ni autorización de una organización implícita.
- `target`: `organizationId` exacta + capability allowlisted; devuelve sólo ese target autorizado o deny.
  Rechaza target ausente, duplicado, inválido o ajeno antes del provider, incluso si sólo existe uno.
- `organizations`: página minimizada de `{organizationId, organizationName, capabilities}` autorizadas.
  Límite 50, sin total global. Keyset mediante `afterOrganizationId` de una organización previamente
  visible: reautorizar ese ID antes de usarlo; si fue revocado, el cliente reinicia el listado. Nunca
  devolver un cursor que codifique IDs de candidatos no autorizados. La paginación no concede autoridad.
- DTO interno v2 separado del DTO externo/v1: actor/contexto ancla y `targets`; no fabricar `bindingId`
  por objetivo ni exigir `target.version === jwt.gv`.
- `authorityRevision` de cada target será un digest opaco de sus hechos efectivos de autorización
  normalizados. Sólo evidencia de cambio; no firma de permiso ni invalidación cruzada A/B. No incluir
  timestamps de consulta, nombres o filas de otro target en ese digest.
- Una transacción de lectura consistente por resolución compone identidad, roles, relación y permisos.
  Parametrizar los readers canónicos con el queryable de la transacción; no copiar consultas al consumer.
- `no-store`, sin caché positiva, body máximo 128 KiB y timeout acotado al presupuesto vigente del reader
  (5 s por defecto). DB/timeout/DTO desconocido/gate OFF deniegan sin fallback de población.

### Consentimiento, emisión y refresh

- `authorization_contexts.context_version` inmutable admite 1/2. Crear un contexto v2 distinto para la
  misma sesión/cliente/ancla; la unicidad nueva incorpora versión.
- El FK de consentimiento al nuevo contexto impide reutilizar consentimiento v1. No hace falta duplicar
  una columna de versión en `client_consents`, códigos o refresh si se deriva del contexto inmutable.
- Propagar versión desde el contexto a subject/grants, token builder/verifier, introspection y resource;
  no escribir constantes `1` ni inferirla a partir de una flag al refrescar una familia existente.
- El formulario actual no lleva context ID/versión: agregar ambos como expectativas del contexto
  mostrado en GET y compararlos exactamente con el contexto resuelto desde la sesión/DB en POST,
  además de las comprobaciones vigentes de origen, cliente, scope y retorno. Los campos del browser
  no eligen ni conceden autoridad. Un cambio de flag, sesión o contexto obliga a reiniciar la ceremonia;
  un formulario legacy sin estos campos nunca puede aprobar v2. No se asume una transacción de
  consentimiento persistida que el código actual no posee ni se añade una tabla sólo para este enlace.
- El texto v2 explica acceso a organizaciones que Greenhouse autorice mientras el permiso esté activo,
  y presenta las actuales como fotografía, no como lista fija. Nuevas clases de scopes/authority requieren
  nuevo consentimiento; alta/baja de targets dentro de esa clase no requiere reconectar.
- Cohorte inicial sólo base read. Scopes de escritura incrementales y su step-up no se amplían por v2.

### Migración y compatibilidad entre writers

El writer actual usa `ON CONFLICT (session_hash, client_id, binding_id, issuer, audience)` y depende
del índice sin versión. Cambiar sólo el índice rompería el writer previo con `42P10`.

1. Preparar SQL de expansión: CHECK admite 1/2 y nuevo índice único con `context_version`; conservar
   temporalmente el índice anterior. No cambiar registros ni backfillear consentimiento.
2. Desplegar writers compatibles, todavía v1/OFF: insert idempotente sin inferencia del índice anterior
   (`ON CONFLICT DO NOTHING`) y recuperación por clave exacta incluyendo versión. Resolver carreras,
   expiración y colisión con contexto de otra versión sin adoptar un ID ajeno.
3. Verificar que todos los writers servidos son compatibles (auth-server y cualquier consumer Greenhouse).
   Sólo entonces aplicar la fase contractual que retira el índice único anterior. La nueva unicidad sigue
   protegiendo los datos. Esta fase requiere aprobación de apply y readback por su incompatibilidad binaria.
4. Activar v2 sólo después de ambas fases, readers y gateway compatibles y cohortes preparadas.

Estado final: ambos SQL se aplicaron como `20260908184942851` y `20260908194829159`; los archivos pending quedaron sustituidos por migraciones canónicas. No reaplicar. No usar
`pg:connect:migrate` como comando de conexión. Rollback posterior a la fase 3 sólo hacia una revisión con
writer compatible: volver al binario antiguo ya no es seguro. Retener schema/contextos/consentimientos para
auditoría; no borrar ni restaurar a ciegas un índice incompatible con v1/v2 coexistentes.

### Flags, revocación y señales

- `AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED=false`: creación y refresh v2 OFF.
- `IDENTITY_INTERNAL_MULTI_ORG_ENABLED=false`: resolución reader v2 OFF.
- `MCP_NATIVE_INTERNAL_MULTI_ORG_ENABLED=false`: consumo gateway v2 OFF.
- `AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS`: cohorte interna explícita para el primer rollout;
  vacío deniega v2. No nombres/emails ni wildcard. Registrar configuración por entorno y ledger antes de deploy.
- Rollback: detener emisión/refresh v2, apagar consumo gateway, apagar reader; mantener v1 sólo con policy
  explícita. Restauración sigue reader -> gateway -> issuer. Auth-server es compartido: no confundir staging
  Vercel con un servicio Cloud Run separado.
- Revocación comprometida debe reflejarse desde la siguiente resolución nueva; demostrar latencia <=60 s
  con reloj y request nuevos. No prometer cancelación retroactiva de un request autorizado antes del commit.
- Señales sanitizadas: `internal_target_denied`, `internal_reader_unavailable`, `internal_context_version_drift`.
  Usar logger/audit existentes con enums y correlación, sin org names, tokens, claims o roles brutos.
- `internal_revoked_still_dispatching` pertenece al harness de certificación y compara deny con invocación
  real del provider. Sin una corrida controlada su estado es no medido, nunca cero por falta de datos.

## Skills

- Discovery/ADR/reader: `greenhouse-task-execution-hook`, `efeonce-mcp-platform`, `software-architect-2026`.
- Gateway y nueva tool: `mcp-craft` + `efeonce-mcp-platform`; reglas del repo hermano.
- Consentimiento: `greenhouse-ai-design-studio` (`ui-lite`), `greenhouse-ux-content-accessibility`,
  `copywriting`; reutilizar renderer existente, sin rediseño. QA visual con `greenhouse-browser-diagnostics`.
- PG/config: `greenhouse-secret-hygiene`, canon Database Tooling y Postgres Access; release sólo cuando
  corresponda con `greenhouse-production-release` y runbooks dueños.
- Verificación/cierre: `greenhouse-qa-release-auditor`, `greenhouse-documentation-governor`.

## Subagent strategy

`sequential`: único editor en ambos checkouts compartidos, sin cambiar branch. Verificar git status antes
de cada slice y commit; cualquier solapamiento ajeno se preserva y obliga a resolver ownership.

## Execution order

1. Aprobar delta y plan; actualizar ADR a Accepted. Baseline completo de lint/tipos antes del primer cambio.
2. Extraer merger efectivo reusable, endurecer el reader estricto de roles/relación y agregar reader
   v2 con snapshot consistente, target exacto/discovery paginado y contratos de DB. Preparar SQL pendientes.
3. Adaptar writer a ambas unicidades y propagar versión por todo OAuth; consentimiento fresco y texto
   v2 usando renderer actual. Gates OFF. Completar contrato UI-lite antes de copy/runtime.
4. Adaptar verifier/resolver/wrapper gateway a DTO v2. Cada call obtiene resolución propia; no capturar
   authority mutable en global ni reutilizar la respuesta de tools/list. Agregar `efeonce.organizations.list`
   con schema de entrada/salida y cuatro annotations read-only; únicamente población interna v2/base read.
   El wrapper entrega el resultado de esa misma petición al callback, sin otra resolución divergente.
5. Verificar matrices unitarias/integración/local y preparar certificación PG. La instancia PG compartida conserva CHECK v1; los SQL/readers v2 se probaron con tablas TEMP y rollback
   mediante pnpm test:live. La prueba del schema servido sigue dependiendo del apply aprobado; no equiparar
   TEMP con migración aplicada ni llamar passed a skipped. Preparar PR/release y evidencia para aprobación final de rollout.
6. Con rollout aprobado: expansión, writers compatibles, contrato de unicidad, gateway OFF, readbacks,
   activación controlada, consentimiento y clientes reales, revocación/rollback y restauración acordada.
7. Actualizar evidencia en task, arquitectura, TASK-1836/1831, runbooks, índices y handoff; cierre sólo con
   runtime/clientes completos. Si falta rollout: `code complete, rollout pendiente`.

## Files to create

- `src/lib/identity/internal-access/target-authority.ts` y tests: primitive objetivo/discovery v2.
- `src/lib/entitlements/effective.ts` y tests: merger reusable con precedencia vigente.
- Tests PG `*.live.test.ts` focales y fixture run-owned separado del canary TASK-1832; manifiesto de cleanup.
- Dos SQL de migración en `docs/tasks/pending-migrations/` (IDs asignados por tooling al implementar).
- `../efeonce-mcp/src/tools/organizations.ts` y tests, si el patrón del registro exige módulo propio.
- Auditoría de implementación/rollout en `docs/audits/mcp/` y delta de contrato UI-lite previo al slice 3.

## Files to modify

- `src/lib/identity/internal-access/{store,delegation}.ts`: ancla vs target y permisos efectivos estrictos.
- `src/lib/organization-workspace/relationship-resolver.ts`: roles vigentes/alcance y queryable compartido.
- `src/lib/admin/entitlements-governance.ts`: consumir el merger extraído sin alterar precedencia del admin.
- `src/lib/tenant/{access,identity-store}.ts`: ruta estricta sin ocultar duplicados ni heredar roles futuros.
- `src/lib/auth-server/internal/{context,postgres-store,runtime,subject-port,consent-context,grants}.ts`.
- `src/lib/auth-server/oauth/{subject,grants,token,tokens,verify,authorize,consent-endpoint,revoke-introspect}.ts`
  y stores/tests relacionados que propaguen context ID/versión; delimitar cada diff al contrato v2.
- `src/lib/auth-server/oauth/pages/render.ts`, `src/lib/copy/auth-server.ts`: disclosure v2 server-owned.
- `src/lib/api-platform/resources/ecosystem-identity-binding.ts` y su `.internal.test.ts`; ruta thin
  adapter sólo si cambia su contrato de entrada, sin lógica duplicada.
- Config/env schemas y workflows dueños de auth-server/Greenhouse: tres gates y cohortes, default OFF;
  regenerar derivados mediante scripts canónicos, no editar bundles generados a mano.
- `../efeonce-mcp/src/auth/{auth-context,token-verifier,binding-resolver,tool-policy,authorized-tools}.ts`.
- `../efeonce-mcp/src/{mcp,config}.ts`, tests, surface baseline, package/lock/version y deploy/config:
  bump minor desde 1.2.0 a 1.3.0 por tool nueva; reconciliar la versión vigente antes del commit.
- Docs OAuth/ADR/runbooks, task/índices/epic/handoff/changelog y QA proporcional.

## Files to delete

Ningún archivo de producto. Sólo mover la task de to-do a in-progress durante el plan. No eliminar
contextos, consentimientos, grants, historia ni artefactos de otras tasks.

## Verification matrix

| Capa | Casos obligatorios | Evidencia exigida |
|---|---|---|
| Autoridad | 0/1/N; relación vigente; rol futuro/expirado/revocado; override aprobado/pendiente/expirado; multi-space con un deny | Pruebas de comportamiento, incluidos fixtures PG reales después del apply |
| OAuth | v1 nunca v2; GET/POST con cambio de gate/contexto; code y refresh mantienen versión; carreras idempotentes; token/contexto cruzados | Unit/integration y constraints ejercidas realmente, sin guards de texto SQL |
| Gateway | un token A/B; C/missing/duplicado deny; A después de C; cap global revocada; B revocada con A vigente | Spy/harness demuestra cero dispatch en deny y args exactos en allow |
| Concurrencia | requests A/B intercalados, cambio de permisos, expiry durante reader, ningún resultado/handle cruzado | Barreras deterministas y correlación request/provider; sin resolver global mutable |
| Discovery | paginado 0/1/N, sin org ajena, límite, target revocado entre páginas, filtro desconocido | Schema estricto y respuesta estructurada observada en tools/list/call |
| UI | texto de clase dinámica, nombres actuales, largas listas/nombres, v1/external intactos | Renderer real + desktop/390 px, teclado, overflow, capturas revisadas; no prueba tokens |
| Runtime | flags OFF y activación/rollback por revisión; readback PG/Cloud Run/Vercel | SHA/revisión/flags y pruebas reales fechadas; Ready no equivale a autorización |
| Clientes | Codex, Claude Code y Claude hospedado; consentimiento, lista, A/B/C, refresh post-TTL y revoke | Familias separadas donde corresponde, evidencia sin secretos; sin nuevos DCR artificiales |

Comandos: `pnpm task:lint --task TASK-1844`; Vitest focal auth-server/internal-access/resource real;
`pnpm test:live` serializado; `pnpm mcp:manifest:check`; `pnpm check` del gateway; gates de build/auth
del repo hermano; `pnpm ops:lint --changed`; QA auth/integration/runtime/release con cobertura declarada.
El cierre documental termina con `pnpm docs:closure-check`, rotación si se requiere y
`pnpm docs:context-check:strict` después de la última edición documental.

## Risk flags

- La transición de unicidad tiene compatibilidad binaria: es obligatorio conservar una revisión de rollback
  con writer nuevo. Ningún deploy/aplicación queda autorizado por la aprobación del plan.
- Permisos efectivos por space y roles vigentes amplían el ownership técnico respecto a la spec inicial;
  se exige regresión del admin y del relationship resolver, sin refactor del resto de TenantAccess.
- La UI de consentimiento es sólo un cambio de copy/DTO inseparable de la semántica de autorización;
  no crear un nuevo selector de organización ni un rediseño bajo esta task.
- PG/auth-server son compartidos; datos de prueba y operaciones de revocación pertenecen a fixture/cohorte
  TASK-1844 explícitos. No usar EO-ORG-0050 ni los assets activos del canary TASK-1832.

## Open questions

Diseño y checkpoint P1/Alto aprobados por el operador («Aprobado»), 2026-09-08.
Antes de la aprobación final de rollout se presentará la cohorte/fixture exacta y el manifiesto de cambios
con comandos, recursos y rollback. No se requieren IDs de clientes ni permisos nuevos para empezar el código.

## Validación del checkpoint documental

Baseline de comportamiento: cinco archivos / 52 pruebas passed. El gate de cierre documental pasó
sin warnings. La primera pasada de ops lint terminó sin errores y señaló 13 advertencias de paridad
en otros epics y una advertencia heurística de motion en esta task; se enlazó el contrato existente
de TASK-1835 para declarar su reutilización, sin agregar motion al alcance. Los resultados finales
de task/ops/context se comprueban después de esta edición y antes del commit del plan.

### Baseline completo previo a implementación — 2026-09-08

Ejecutado sobre Greenhouse `4b57716c9` y gateway `cd229069ee9e7f0d1f75d56d08d9dd93833eadd1`,
sin cambios de producto. Son verificaciones del comportamiento v1 existente; no acreditan v2.

| Comando | Resultado |
|---|---|
| Greenhouse `pnpm lint` | Exit 0; 0 errores y 26 warnings previos `greenhouse/no-opacity-on-text`, en 15 archivos UI fuera del ownership de TASK-1844 |
| Greenhouse `pnpm typecheck` | Exit 0; TypeScript sin errores |
| Gateway `pnpm check` | Exit 0; Prettier, tipos, 154 pruebas passed / 0 skipped y build correctos |

Los warnings de opacidad están en Nexa, primitives/Lab, NotAuthorized, Globe credits, mockups,
agency/sample-sprints, Finance, CTA y Hiring/People; no se corrigen dentro de esta task. El prelint
regeneró el CSS de iconos sin producir cambios versionados. Tampoco el build del gateway dejó diff.

La revisión adicional de `oauth/consent-endpoint.ts` confirmó que el formulario actual sólo trae
cliente/scopes/retorno/decisión y no posee una transacción persistida GET/POST de consentimiento.
Se precisó el plan: agregar ID/versión mostrados como expectativas y compararlos con la autoridad
server-side resuelta en POST; campos ausentes o contexto cambiado nunca pueden consentir v2.
El operador aprobó el plan después de este baseline; el ajuste pasa al slice de implementación.
