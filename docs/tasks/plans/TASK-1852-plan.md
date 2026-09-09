# Plan — TASK-1852: habilitación común de servicios

## Autoridad y estado

- Goal aprobado por el operador el 2026-09-09: mecanismo común para clientes; Berel/Sky como primera cohorte.
- Hook ejecutado: `pnpm codex:task-hook TASK-1852 --develop`.
- Checkout compartido: `develop`; limpio al iniciar. Sin subagentes, worktrees ni cambio de rama.
- **Estado: plan aprobado («Vamos»), código local verificado; rollout pendiente.**
- `TASK_PROCESS.md` §Phase 3 exige aprobación del plan para P1. La aprobación previa del goal se conserva;
  no se vuelve a pedir sobre ese alcance. Checkpoint P1 aprobado el 2026-09-09; hook revalidado en develop.
- Sin commit/push/deploy, asignaciones live, invitaciones, envíos ni migración de datos de clientes.
  La instrucción del goal prevalece sobre los commits automáticos descritos en el proceso general.

## Discovery summary

[Auditoría y matriz inicial](../../audits/client-portal/TASK-1852_SERVICE_ENABLEMENT_DISCOVERY_2026-09-09.md).

1. Catálogo/asignaciones/audit/outbox y commands canónicos existen. No hace falta otra plataforma.
2. `resolve-org-business-line.ts` une `module_code` con `module_id`, contra la FK real: el helper sirve
   `[]` para Sky aunque su línea canónica es `globe`. Corregir causa raíz y probar el join real.
3. El índice único evita duplicados físicos. Falta concurrencia controlada y ligar apply al estado revisado.
4. Preview genérico y sus adapters API Platform/MCP aún no existen. El script de Sky no es un contrato común.
5. Berel tiene módulos/SEO/GSC, pero cero servicios en `services`; Sky tiene diseño digital y fuentes Notion.
   Los usuarios activos y los bundles no acreditan login humano, preferencias o entrega por canal.
6. `notion_workspaces` tiene su propia identidad: consumir el bridge por client_id; no igualar sus IDs a `spaces`.
7. TASK-1687 conserva la ruta faltante de Sky. TASK-1834 conserva identidad nativa/selector y su rollout.
8. Baseline: 5 archivos, 68 tests passed; typecheck sin errores; lint con 0 errores y 26 advertencias
   preexistentes. Los tests existentes no certifican el JOIN porque está mockeado.

## Access model

| Plano | Decisión |
|---|---|
| Principal | Resolver en servidor desde sesión o identidad delegada válida; nunca aceptar `actorUserId` arbitrario del request |
| Target | ID canónico de organización explícito, activo y autorizado; servicios, personas, fuentes y asignaciones deben pertenecer al target |
| Entitlements | Reutilizar read_assignment/read para inventario, enable/create para altas, pause/update para compensación y override específico cuando aplique; verificar grants efectivos sin ampliarlos |
| Vistas | Consumir primitive de visibilidad + revocaciones existentes; sin grants por callbacks, roles ni deep links |
| Route groups | Entrada operativa interna con authority administrativa existente; la sesión cliente no administra sus módulos por contratar un servicio |
| Startup/login | No cambia. Matriz legacy/native/0/1/N consume TASK-1834; native requiere sus gates |
| Replays | Reautorizar principal/target antes de devolver resultado idempotente; una revocación prevalece sobre un resultado guardado |

## Architecture decision

Gobiernan el ADR `GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md`, el dominio Client Portal,
Full API Parity y el ADR de entrada/consentimiento Efeonce ID. La propuesta añade el contrato operativo
acotado bajo esos dueños, sin nuevo schema compartido, login, catálogo, sender, cola ni runtime.

- Reuse: DB central, resolvers de identidad/visibilidad, commands de módulos, audit/outbox y API command runtime.
- Extend: resolución correcta de business lines; composición transaccional y concurrencia de commands.
- New: contrato de preview/apply/compensación e inventario de readiness; adapters del mismo primitive.
- Variantes por cliente viven en el manifiesto de cohorte y las referencias de datos, nunca en reglas por nombre.
- Futuro cliente con servicios soportados: nuevo manifiesto/preview y certificación propia. Un nuevo tipo de
  servicio/fuente exige su adapter y evidencia; esta task no promete provisión automática general de TASK-828/829.

## Backend/data contract

`backend-critical`, API/domain compartido, sin UI nueva. Hogar actual `src/lib/client-portal/`; BFF hoja.
DTOs browser-safe separados de readers/commands server-only. Sin packages/apps/dependencias nuevas.

### Inventario y preview

- Entrada acotada: organización, servicios/módulos propuestos y personas/destinos a verificar; límites de tamaño
  y enums cerrados. Una llamada opera una organización; CLI de cohorte itera sin fingir atomicidad global.
- Salida versionada: referencias de evidencia, instante de lectura, estado por servicio/persona/fuente/canal,
  asignaciones previas, cambios exactos, precondiciones, blockers y fingerprint del snapshot relevante.
- Distinguir contratado/asignado/operativo; ausencia de fuente, cero, degradación, no asignado y no autorizado.
- Cada cambio conserva servicio/evidencia comercial y versión de catálogo. No convertir un archivo JSON
  aportado por el caller en prueba de contrato, pertenencia, permiso o disponibilidad.
- El preview no persiste propuestas, audit de negocio, módulos ni mensajes. La telemetría ordinaria del
  transporte se distingue de efectos de negocio y no se usa como aprobación.
- Servicios sin registro o mapping sustentado y destinos no materializados producen blockers, conservando
  acceso previo; no inventar filas de servicio ni completar TASK-1687 desde aquí.

### Apply y compensación

- Nueva entrada mutante deshabilitada por defecto; registrar el control de activación en el ledger si requiere
  flag nueva. Ningún alta de flag/grant en runtime está autorizada por esta ejecución.
- Require input exacto aprobado, fingerprint previo e idempotency key. Releer y validar en transacción;
  snapshot cambiado → conflicto accionable y nuevo preview, sin aplicar parcialmente una lista de módulos.
- Ajustar commands existentes para compartir transacción y protocolo de lock; audit/outbox sólo una vez;
  invalidar cache después del commit exterior. No anidar transacciones ni duplicar INSERTs en el orquestador.
- Reutilizar idempotencia de transporte y persistir correlación/fingerprint en evidencia del command.
  Probar caída entre commit y respuesta, duplicado concurrente y retry con payload diferente.
- Preservar bundles ajenos; aplicar sólo altas explícitas sustentadas. Sin resume de pausas antiguas ni
  sobrescritura de overrides, preferencias, roles o contratos.
- Receipt auditable identifica únicamente altas propias. Compensación vuelve esas altas a `paused` mediante
  command canónico, con versión esperada y rechazo si hubo una transición posterior ajena. No tocar una
  asignación preexistente devuelta como no-op ni usar churn para representar rollback técnico.
- Probar rollback el mismo día: el CHECK `effective_to > effective_from` impide asumir expire(hoy) universal.
- Write targets: `module_assignments`, `module_assignment_events`, outbox canónico; API command audit/idempotency
  existentes según transporte. Ningún write de `services`, identidades, catálogo, preferencias o providers.

### Paridad y canales

- App/Product, API Platform, CLI, MCP y Nexa consumen los mismos primitives; no lógica de habilitación en rutas.
- Preview programático read-only con scope y DTO mínimo. Writes exigen actor humano atribuible y authority de
  administración efectiva; binding interno de una máquina o scope base no bastan para inventar `approved_by_user_id`.
- App opera el command; Nexa lo invoca por `propose → confirm → execute`. MCP conserva contrato de lectura y
  camino mutante gobernado, fail-closed mientras falte autoridad o activación. No federar nuevas tools desde este repo.
- Si el adapter vigente no puede representar autoridad de escritura, conservar la denegación explícita y
  registrar ese bloqueo de paridad; no declarar parity-complete ni elevar scopes/grants como arreglo.
- Persona destinataria por primitives existentes. Inventario de preferencias/defaults y disponibilidad de
  email/in-app/Teams separado de consentimiento, cadencia, instalación y entrega efectiva. Sin dispatch.

## Skills

- `software-architect-2026`: contrato, transacciones, autoridad, adapters y ADR existente.
- `greenhouse-task-planner`: estructura de task/plan; implementación a cargo del agente principal.
- `greenhouse-task-execution-hook`: preflight ya ejecutado.
- `greenhouse-secret-hygiene`: lectura PG con credenciales existentes y artefactos redactados.
- `efeonce-mcp-platform` + `mcp-craft`: cargar antes del slice de adapters/manifiesto MCP.
- `greenhouse-qa-release-auditor`: negativos, concurrencia, integridad de evidencia y estado runtime.
- `greenhouse-documentation-governor`: triple documentación proporcional, lifecycle y gates.
- `greenhouse-browser-diagnostics`: cargar antes de certificación de login/rutas. Sin JSX ni trabajo de diseño.

## Subagent strategy

`sequential`: dependencia causal inventario → commands → adapters → certificación, ownership compartido y
sin autorización de subagentes. Un editor conserva los archivos del dominio y del manifiesto.

## Execution order

| Slice | Reuso / cambios | Evidencia de salida |
|---|---|---|
| 1. Correctness + contrato | Corregir JOIN en resolver; tipos y reader de inventario/preview; mapear servicios y fuentes desde sus dueños | Prueba del join, ausencia frente a degradación, aislamiento en fixture de dos organizaciones; preview real sin writes |
| 2. Commands | Alta/pausa transaccionales y concurrentes; orquestación apply/compensación con snapshot y ownership del receipt | Un solo efecto por retry, conflicto por drift, rollback propio, ningún cambio ajeno, crash/retry y audit/outbox atómicos |
| 3. Adapters | App/Product y API Platform sobre el primitive; CLI y MCP/manual servido; camino Nexa gobernado | Misma semántica/errores, negativos por principal/organización, no actor inventado, manifest check; escrituras nuevas OFF |
| 4. Certificación y cierre | Matriz Berel/Sky, manual/runbook, evidencia y handoff a dueñas | Preview por cuenta, blockers con owner, paquete exacto para aprobación de rollout. Sin live apply ni mensajes |

## Files to create

Rutas implementadas localmente (evidencia de cierre abajo):

- `src/lib/client-portal/enablement/{types,validation,reader,preview,commands,access}.ts` y tests focales.
- `scripts/client-portal/service-enablement.ts` (preview por defecto, apply/rollback explícitos por contrato).
- `src/lib/api-platform/resources/{app,ecosystem}-client-service-enablement.ts` y tests.
- `src/app/api/platform/{app,ecosystem}/client-services/enablement/{preview,apply,rollback}/route.ts`:
  adapters acotados; publicación de writes depende de autoridad representable y gate descrito arriba.
- `docs/operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md` + manifiesto versionado de cohorte.
- `docs/documentation/client-portal/service-enablement.md` y `docs/manual-de-uso/client-portal/service-enablement.md`.

## Files to modify

- `src/lib/client-portal/commands/{resolve-org-business-line,enable-module,pause-resume}.ts` + tests;
  sólo ampliar `expire-churn.ts` si hace falta para compartir locks, sin cambiar semántica de churn.
- Consumers existentes `src/app/api/admin/client-portal/**` si hace falta reutilizar el mismo acceso/command;
  mantener compatibilidad de endpoints anteriores.
- Registro API y OpenAPI bajo sus dueños; `src/mcp/greenhouse/{tool-manifest,server,tools}.ts` y artefacto generado.
  Registrar camino Nexa dentro de su runtime existente, sin un ejecutor nuevo ni permisos implícitos.
- Ledger de flags si se incorpora control nuevo; sin cambiar valores desplegados.
- Arquitectura Client Portal/ADR acotado, documentación API, task, registry, README, EPIC-046, Handoff y changelog.

## Files to delete

Ninguno. Traslado de la task a `in-progress/` no elimina su historia.

## Risk flags y verificación

- Riesgo principal: habilitar una cuenta/servicio/persona incorrectos o reutilizar un snapshot después de drift.
- No mezclar snapshot de configuración PG con prueba del provider o un login humano.
- Tests conductuales, no asserts sobre texto SQL/YAML. Fixture técnico independiente de clientes.
- Antes de código: baseline lint/typecheck; después tests focales y `pnpm qa:gates --changed --agent codex --task TASK-1852`,
  lint/typecheck, `pnpm mcp:manifest:check`; ampliar sólo ante riesgo/fallo pertinente.
- `pnpm test:live` serializado para lectura real; ensayos mutantes sólo con fixture técnico y alcance permitido,
  nunca asignaciones de la cohorte. Si requieren nueva autorización live, preparar el ensayo antes de solicitarla.
- Cierre documental: task lint, ops lint, closure-check y context-check:strict último.

## Open questions resueltas y dependencias operativas

- ¿Sólo dos clientes? Mecanismo común; aplicación/certificación real inicial sólo Berel/Sky.
- ¿Falta otra tabla? No prevista: reusar assignments/audit/outbox y comando/idempotencia existentes.
- ¿Se asigna Creative a Berel? No: su contenido no prueba contratación del bundle de Sky.
- ¿Se modifica AEO? No, se conserva como asignación existente con contratación por conciliar.
- ¿Se exige OIDC nuevo para empezar? No. Se consume contrato TASK-1834 y se certifica login vigente por separado.
- ¿Qué bloquea la apertura real? Servicios y fuente de Berel, destinatarios/login, mapping/términos, ruta de Sky
  (TASK-1687), preferencias/cadencias y destinos autorizados. Cada falta queda en la matriz, sin frenar el código común.
- ¿Qué se aprueba ahora? Este plan de implementación local. Activación, provisión, federación, mensajes y rollout
  mantienen los límites del goal y necesitarán propuesta exacta con evidencia.

## Estado de cierre esperado

Código y pruebas completos dentro del scope autorizado → `code complete, rollout pendiente` si faltan
activación/datos/login/canales. Mientras no exista código probado, conservar `in-progress`; no marcar complete
ni presentar el discovery como implementación.

## Resultado de implementación local — 2026-09-09

Los cuatro slices de código/documentación se implementaron secuencialmente. 290 tests integrados,
14 con PostgreSQL local real; JOIN falsificado en rojo antes de restaurar el arreglo. La primera cohorte
produce `canApply=false` en ambas cuentas y preserva sus asignaciones. Se añadieron códigos 409 por causa,
fechas civiles sin dependencia del TZ de Node y reautorización Nexa antes de replay.

La tarjeta Nexa se reutiliza sin cambios visuales estructurales; el servidor prepara su fingerprint/input.
Sesiones agent no pueden aprobar writes. API/MCP mutante delegado conserva 403; el default admin no
concede pause. Sin ampliar grants ni federar tools. [QA/matriz y blockers](../../audits/client-portal/TASK-1852_IMPLEMENTATION_QA_2026-09-09.md)
y [runbook](../../operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md). Apertura cliente sin certificar.

El smoke HTTP exigió dos fixes mínimos adicionales dentro de los invariantes aprobados: preservar la
procedencia firmada de sesiones agent al refrescar permisos y normalizar a NULL el clientId vacío en
request audit. Se probaron fallos antes del arreglo y lectura posterior del audit persistido; no se
modifican login, roles ni grants. Fuente: QA de implementación.

## Continuación de rollout autorizada — 2026-09-09

El operador confirmó los servicios y ordenó «Haz el rollout». Preparar commit/push/promoción por el control plane, verificar compensación EFEONCE_ADMIN y desplegar la capacidad común. Mantener checkout develop, sin subagentes. Los registros comerciales siguen en Commercial/HubSpot; no introducir escrituras SQL para satisfacer el preview ni convertir al equipo interno en destinatarios cliente. La evidencia local privada conserva alcance, cantidades, responsabilidades y equipo confirmado. Certificar por separado deployment, flags, datos y entrada humana.

Rollout: al conciliar Berel se verificó el servicio HubSpot existente. Fix acotado del intake: reusar resolver de credencial TASK-1230 y preservar montos ausentes NULL. Pruebas y readback incluidos; sin nuevo writer, migration, precios o contratos.
