# QA Release Audit — TASK-1852

## Verdict

**BLOCK para apertura operativa.** **Closure state: `code complete, rollout pendiente`**. La task permanece `in-progress`. El goal autorizado excluye commit, push, deploy, asignaciones live, invitaciones y envíos.

## Scope

Mecanismo común por organización/persona/servicio, primera cohorte Berel/Sky. Checkout compartido
`develop`, un editor, sin subagentes. Sin cambios de schema, grants, identidad, contratos, preferencias,
proveedores ni workers. PostgreSQL compartido consultado en transacciones READ ONLY; mutaciones de prueba
exclusivamente en cluster local con socket privado y fixtures sintéticos.

Reuso: commands de catálogo, visibilidad por persona, DB central, audit/outbox, API command store,
MCP interno y confirmación Nexa. El ajuste del JOIN usa la FK `service_modules.module_id`, no el código.
Los commands comparten lock de organización y transacción. Apply revalida snapshot, crea sólo altas
explícitas y conserva no-ops; rollback pausa únicamente sus altas sin cambios posteriores. Receipt
y resultado quedan en la misma transacción; el audit conserva el receipt tras expirar el command store.

## Risk Classification

| Riesgo | Nivel | Verificación |
|---|---|---|
| Aislamiento/autoridad | alto | Sesión vigente, admin + capabilities, negativos por persona/servicio/binding, revocación antes de replay |
| Concurrencia/compensación | alto | PostgreSQL real local: llamadas concurrentes, outbox fallido, respuesta fallida, payload distinto, snapshot viejo, cambio posterior |
| Disponibilidad de cliente | alto | Preview de runtime separado de login humano, ruta, productor y canal; ninguna activación |
| API/MCP/Nexa | alto | Adapters únicos, protocolo MCP serializado, propuesta Nexa preparada server-side y confirmación reautorizada |

## Injected Skills

Codex: `greenhouse-task-execution-hook`, `software-architect-2026`, `efeonce-mcp-platform`, `mcp-craft`,
`greenhouse-nexa-conversational`, `greenhouse-secret-hygiene`, `vercel-operations`,
`greenhouse-browser-diagnostics`, `greenhouse-qa-release-auditor`, `greenhouse-documentation-governor`.
Revisión proporcional de copy/reuso: `greenhouse-ai-design-studio`, `greenhouse-ux-content-accessibility`,
`copywriting`. No JSX, layout, token ni pantalla nuevos; la acción consume la tarjeta Nexa vigente.

## Evidence

| Gate | Resultado | Evidencia |
|---|---|---|
| Hook | pass | `pnpm codex:task-hook TASK-1852 --develop`; goal + plan P1 aprobados («Vamos») |
| Suite integrada final | 290 passed, 28 archivos, sin skipped | `.captures/task-1852/integration-final.log`; incluye callbacks de sesión y wrapper de audit |
| PostgreSQL local | 14 passed, incluidos en la suite | `local-postgres.test.ts`, socket privado/55452; ningún test mutante contra Cloud SQL |
| Falsificación del JOIN | 1 failed esperado al reponer el defecto; 14 passed al restaurar | `.captures/task-1852/falsification-join.log`; el test observa resultado SQL, no texto del query |
| Preview real | ambas cuentas `canApply=false`; 0 cambios propuestos | [readback versionado](TASK-1852_PREVIEW_READBACK_2026-09-09.json); script usa el reader nuevo en READ ONLY |
| MCP protocolo | lista/llamadas serializadas, schemas/annotations/error y grounding | `service-enablement.test.ts`; provider HTTP sustituido, no certificación live de gateway |
| MCP artefactos | pass, 47 tools y 7 manuales | `pnpm mcp:manifest:check`, `pnpm mcp:skills:check` |
| Nexa | doc gate pass con aviso preexistente de `hiring-decision.ts` | `.captures/task-1852/nexa-doc-gate.log`; sin cambio a esa acción |
| Flag desplegada | ausente en configuración de staging y production | `vercel env ls <env> --scope efeonce-7670142f`, proyecto `greenhouse-eo`; no cambio de valores/revisión |
| Build | pass, seis rutas incluidas | `.captures/task-1852/build.log`; después se corrigieron dos líneas de auth/audit, verificadas con typecheck y HTTP finales sin cambio de grafo |
| Typecheck final | pass | `pnpm typecheck`, exit 0, `.captures/task-1852/typecheck-final.log` |
| Lint | 0 errores, 26 warnings preexistentes | `pnpm lint`; últimos ajustes auth/audit con lint focal, 0 errores |
| HTTP autenticado local | 7 casos pass | [HTTP y audit persistido](TASK-1852_HTTP_READBACK_2026-09-09.json); agente interno dedicado; ambas cuentas 200 con blockers, actor body 400, personas ajenas sin datos, organización inexistente 404, anónimo 401, write agent 403 |
| CLI HTTP | pass | `.captures/task-1852/cli-smoke.mjs`; preview predeterminado, body tipado y resultado estructurado; provider local sintético, token no impreso |
| OpenAPI | YAML válido, referencias locales resueltas | Seis rutas, schemas de entrada/resultado y errores; `public/docs/greenhouse-api-platform-v1.openapi.yaml` |
| Task/ops | 0 errores; task 0 warnings, ops 13 heredados | `pnpm task:lint --task TASK-1852`, `pnpm ops:lint --changed` |
| Cierre documental/contexto | pass | `docs:closure-check` exit 0 con avisos explicados abajo; rotación conserva 60 entradas y `docs:context-check:strict` 0 errores/0 warnings; logs bajo `.captures/task-1852/` |

Comando de suite reproducible, después de levantar el cluster local descrito en el runbook:

```sh
TASK1852_LOCAL_PG_SOCKET="$PWD/.captures/task-1852/pg-socket" pnpm exec vitest run --project unit \
  src/lib/client-portal/enablement src/lib/client-portal/commands \
  src/lib/api-platform/core/idempotency.test.ts src/lib/api-platform/core/app-auth.test.ts \
  src/lib/auth/agent-session-refresh.test.ts src/lib/auth/sign-agent-session-in-process.test.ts \
  src/lib/api-platform/resources/client-service-enablement.test.ts \
  src/lib/nexa/actions src/mcp/greenhouse
```

## Defectos encontrados mediante HTTP y falsificados

1. El callback JWT rehidrataba `authMode` desde la cuenta y borraba `agent`, aunque `provider` firmado
   seguía siendo agent. El primer smoke recibió 503 por flag OFF, no el 403 esperado. Se corrigió
   únicamente la conservación de procedencia en refresh; roles/vistas siguen refrescándose. Test real
   del callback: 1 failed / 2 passed sin fix, 3 passed con fix; HTTP posterior 403.
2. El wrapper App intentaba persistir `clientId=''` de una sesión interna y fallaba la FK del request log.
   Normaliza esa ausencia a NULL; un clientId real queda igual. Test: 1 failed / 4 passed sin fix,
   5 passed con fix. Readback real: seis solicitudes autenticadas persistidas con `client_id=null`
   entre 21:45:46 y 21:45:59 UTC. Comandos de negocio `client-services.enablement.*`: **0**.

No se confunde esta sesión técnica con login humano. El cluster PostgreSQL privado y el servidor Next
de prueba se detuvieron al terminar; no se instaló un servicio del sistema ni se tocó Cloud SQL con fixtures.
El schema local es mínimo y derivado del real; las FK/constraints/triggers del runtime se comprobaron
read-only en discovery. No representa una copia integral de producción.

## Matriz de certificación por servicio

| Cuenta/servicio | Comercial | Asignado/configurado | Estado operativo y dueño |
|---|---|---|---|
| Berel / SEO | Sin fila de servicio ni términos | `seo_v2` activo; target `seot-berel-mx` activo | Commercial concilia contrato; Growth certifica cobertura, mercado y frescura; Identity certifica persona/login |
| Berel / marketing de contenidos | Sin fila ni mapping propio | No se propone Creative por inferencia; sin binding Notion en el bridge canónico | Commercial/Delivery identifican servicio, fuente y capacidad; conservar Notion/Drupal como dueños |
| Sky / diseño digital | `SVC-HS-551519372424` activo, sin términos | `creative_hub_globe_v1` activo; línea `globe`; dos bindings Notion activos | Commercial concilia términos; TASK-1687 posee catálogo/ruta; Delivery certifica cobertura |
| Ambas / AEO | Contratación por conciliar fuera de la propuesta | `ai_visibility_v1` activo | Se conserva: ninguna alta, baja ni conclusión contractual por inferencia |

### Personas y canales

El [manifiesto](../../operations/client-service-enablement/berel-sky.v1.json) declara IDs exactos. El usuario
Berel seleccionado es técnico: activo, sin identity link ni login. No es un piloto humano. Las tres
personas Sky están activas y vinculadas; ninguna tiene `last_login_at` en el snapshot. Esto no certifica
una sesión humana ni implica que se haya ejecutado un login de ellas durante esta task.

En las cuatro selecciones no hay preferencias explícitas. `emailDeliverable` sólo refleja email presente
sin marca de indeliverable; no acredita consentimiento, entrega ni dominio verificado. In-app, email y
Teams requieren audiencia/categoría/cadencia/destino por dueño Notifications (TASK-690/693/1848).
No hay canal Teams asociado mediante space canónico, bridge Notion o Graph ID en el readback.
No se envió mensaje de prueba ni se fabricó preferencia, member, identidad o suscripción.

### Entrada y rutas

El preview consume el contexto vigente y los vetos por persona; identidad no añade módulos. Registra
rutas declaradas con `verification=unverified`, nunca convierte un registro de catálogo en una página
existente. El contrato 0/1/N contextos, login nativo, callback y retorno lo conserva TASK-1834; no se
implementa selector paralelo. Login humano y retorno 0/1/N quedan sin certificar aquí. El login vigente
puede habilitar el piloto cuando se pruebe; no depende del cierre total de la convergencia nativa.

## Blockers

1. **Commercial/Delivery:** registros/términos/mapping faltantes de la matriz; resolverlos antes de un apply.
2. **Identity:** elegir destinatario humano Berel, certificar login/retorno y permisos de cada persona;
   sólo invitar/provisionar dentro de un rollout autorizado (TASK-1012/1839 cuando aplique).
3. **Client Portal:** certificar destinos con sesión propia/ajena; TASK-1687 conserva el destino Sky.
4. **Notifications/Insights:** preferencias, audiencia, cadencia y destino por canal. No hay entrega certificada.
5. **Platform authority:** `module.pause` existe en catálogo pero el default admin actual de `entitlements/runtime.ts`
   no lo concede. Certificar autoridad de compensación antes de activar; no se añadió grant por inferencia.
6. **API/MCP authority:** ecosystem autentica máquina, no aprobación humana. Preview interno disponible;
   apply/rollback devuelven `403 invalid_delegated_context`. El lane App rechaza writes de sesiones agent y
   tokens delegados; Nexa rechaza agent. Paridad de escritura delegada pendiente, nunca `parity-complete`.
7. **Release:** código nuevo no desplegado, flag sin activar. Smoke live del nuevo HTTP/MCP y del consumer
   outbox pendiente del rollout. Los tests locales no certifican worker ni entregas externas.

## Conditional Follow-Ups

Preparar un paquete por cuenta con servicio/término, persona, vistas, fuentes y canales certificados;
revisar preview fresco y compensación atribuible antes de solicitar activación. El
[runbook](../../operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md) contiene payloads y recuperación.
No ampliar cohortes ni federar las nuevas tools automáticamente.

## False-Closure Traps Checked

- Tests verdes no equivalen a rollout ni a login humano; ensayos locales clasificados separadamente.
- Sin cambio visual estructural; la tarjeta nueva no tiene GVC de runtime desplegado con flag activada.
- No migración/backfill, flag configurada ni deploy de esta implementación.
- Task abierta y criterios operativos sin tildar; discovery previo queda como evidencia histórica.
- No se declaró incidente Sentry resuelto ni salud/entrega del worker sin observación live.

## Documentation closure

Actualizados ADR/dominio, API Platform/OpenAPI, Identity (procedencia ya contratada), Nexa,
flag ledger, triple documentación, task/plan/registry/epic, Handoff y changelog. `project_context.md`,
AGENTS/CLAUDE y harness revisados sin cambio: los routers vigentes ya llevan a esos dueños; no se añade
una regla transversal ni un comando pnpm. Los avisos de monolito API/Identity corresponden a estructura
histórica existente; se editaron secciones vigentes, sin añadir un diario ni hacer un refactor documental
ajeno. El aviso heurístico de project_context se resuelve con esta decisión explícita.
Rotación de changelog conserva historia en `docs/changelog/internal/`; strict final sin warnings.

## Final Call

El código común queda listo para revisión local sin abrir ningún cliente. El cierre operativo
requiere resolver los blockers y ejecutar el rollout autorizado con evidencia de acceso y canales.
