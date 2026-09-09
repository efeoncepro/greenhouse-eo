# TASK-1852 — Discovery de habilitación común de servicios

- Fecha: 2026-09-09; consultas 21:04–21:07 UTC.
- Estado: discovery verificado; implementación y certificación cliente pendientes.
- Owner: Codex, ejecución secuencial en el checkout compartido `develop`.
- Autoridad: goal aprobado en conversación. Mecanismo reutilizable; primera cohorte Berel/Sky.
- Límites: sin commit/push/deploy, asignaciones, invitaciones, envíos, migraciones ni cambios de permisos.
- Método: `pnpm pg:doctor --profile=runtime`; helpers DB canónicos con transacciones `READ ONLY`.
  No se exportó `.env.local` al shell. Artefactos auxiliares en `.captures/task-1852/`, ignorados.

## Hallazgos que gobiernan el plan

| Hallazgo | Evidencia | Consecuencia |
|---|---|---|
| La foundation de catálogo/asignaciones/audit existe | Schema, FK, índices y triggers de `greenhouse_client_portal` leídos en PostgreSQL | Reutilizarla; no crear otro catálogo ni ledger |
| El resolver de business lines une columnas de identidades distintas | `resolve-org-business-line.ts` une `sm.module_code = csm.module_id`; FK real apunta a `service_modules.module_id` | Corregir el helper compartido antes de usarlo en preview/apply |
| Defecto reproducido sin writes | Helper real devuelve `[]` para Sky; join por FK devuelve `globe` | El alta omite su comprobación de aplicabilidad cuando interpreta el resultado como ausencia de datos |
| Los tests existentes no detectan ese defecto | 68/68 tests de commands pasan; `enable-module.test.ts` sustituye `resolveOrganizationCanonicalBusinessLines` por un mock | Agregar prueba funcional del join real con fixture técnico y lectura live separada |
| Alta idempotente sólo por estado existente | `enable-module.ts` hace SELECT → INSERT; índice único `(organization_id,module_key) WHERE effective_to IS NULL` | El índice evita duplicados, pero falta resultado controlado ante carrera y comparación con el preview; carrera aún no ensayada |
| El rollback terminal inmediato requiere cuidado | CHECK real `effective_to > effective_from`; `expire-churn.ts` usa hoy por defecto | Para revertir acceso recién otorgado usar pausa gobernada y verificada; no inventar una fecha ni simular churn comercial |
| No hay preview común ni adapter de esta capacidad en API Platform/MCP | Inventario `src/lib/client-portal/`, rutas admin y búsqueda en `src/lib/api-platform/`, `src/app/api/platform/`, `src/mcp/greenhouse/` | Primitive único y adapters tipados dentro de TASK-1852 |

## Identificación de la cohorte

Los nombres se usaron exclusivamente para discovery. Ningún command debe resolver un target por nombre.

| Cuenta | Organización canónica observada | Vínculo operativo |
|---|---|---|
| Grupo Berel | `org-32333527-02a8-487b-819e-6f76a761777d` | `space-cli-0863869c-eaac-4630-9bd0-af283c56f7fb` → `cli-0863869c-eaac-4630-9bd0-af283c56f7fb`; módulos y targets SEO ligados a esa org |
| Sky Airlines | `org-b9977f96-f7ef-4afb-bb26-7355d78c981f` / `EO-ORG-0011` | `spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9` → `hubspot-company-30825221458`; servicio activo y usuarios ligados a esa org |

También existen `Pinturas Berel` (`EO-ORG-0244`) y `skyairlinedocs.onmicrosoft.com` (`EO-ORG-0383`),
sin spaces ni servicios encontrados en estas consultas. No fusionar, trasladar ni asignar por similitud.

## Matriz inicial: contratado, asignado y operativo

| Cuenta / servicio | Evidencia comercial | Acceso asignado | Evidencia operativa / falta |
|---|---|---|---|
| Berel / SEO | Servicio confirmado en ADR EPIC-046 y por el operador; 0 filas en `greenhouse_core.services` para su org | `seo_v2`, assignment `cpma-berel-seo-contracted:seo_v2` | Target `seot-berel-mx` activo, `berel.com`, MX, location 2484/es; GSC hasta 2026-09-06, materialización 2026-09-09 12:00:41Z. Reader cliente TASK-1690 sigue pendiente |
| Berel / marketing de contenidos | Prestación distinta confirmada en ADR; falta su registro de servicio en PG | No inferir otro bundle de las piezas producidas | No se encontró workspace Notion unido al client_id en el bridge consultado; esto no niega la existencia del Notion externo. Conciliación de fuente pendiente |
| Sky / diseño digital | `SVC-HS-551519372424`, activo, nombre `Sky Airline - Diseño digital`, línea `globe`, servicio específico `consulting` | `creative_hub_globe_v1`, assignment `cpma-ec0041f7-e416-442f-acab-73f645c06f56` | Workspace Notion y dos bindings activos; frescura/contenido externo y login real aún no certificados. `cliente.creative_hub` mantiene destino sin página local, dueño TASK-1687 |
| AEO existente / ambas | La asignación técnica no prueba una prestación contratada adicional | `ai_visibility_v1` activo en ambas | Preservar; no agregarlo ni retirarlo por inferencia |

No hay filas de `engagement_commercial_terms` asociadas a servicios de estas dos organizaciones.
No declarar cuotas, cadencias contractuales o `bundled_modules` a partir de ese vacío.
Sky tiene además un servicio `Paid Social Care` activo con fecha objetivo 2026-06-11 y dos seeds archivados;
no se interpreta ese estado como ampliación del alcance de diseño digital ni se modifica aquí.

## Personas, entrada y canales

| Cuenta | Estado en `session_360` / `client_users` | Límite de la evidencia |
|---|---|---|
| Berel | 1 usuario activo, ID `user-agent-berel-client-001`, credentials, sin `identity_profile_id`, sin login registrado | No acredita destinatario humano ni piloto; verificar procedencia y provisión por sus dueñas |
| Sky | 16 usuarios: 3 activos y 13 inactivos/invited; todos `password_reset_pending`, sin login registrado; los 3 activos tienen identity profile y un contexto activo cada uno | Activo no prueba login utilizable. No activar ni reinvitar por inferencia |
| Ambas | 0 filas de preferencias por usuario y 0 suscripciones enlazadas por user_id | El servicio actual usa defaults por categoría si falta preference; no equivale a preferencia explícita ni cadencia aceptada |
| Ambas | 0 destinos Teams enlazados a sus spaces o usuarios en las consultas realizadas | No acredita ausencia global de chats/grupos; audiencia, instalación y permisos de un destino concreto siguen pendientes |

El contrato 0/1/N de TASK-1834 se conserva: identidad, contexto y autorización separados. Este discovery no
certifica un login nativo ni modifica callbacks. El carril vigente requiere prueba E2E propia antes de apertura.

### Corrección de bridges durante discovery

`notion_workspace_source_bindings.space_id` referencia **`notion_workspaces.space_id`**, no
`greenhouse_core.spaces.space_id`. El primer join directo no encontró filas; el join correcto por
`spaces.client_id → notion_workspaces.client_id → bindings.space_id` encontró Sky. Se conserva esta
corrección para evitar convertir un join vacío en ausencia de integración.

Sky: workspace Notion `hubspot-company-30825221458`, database `15288d9b145940529acc75439bbd5470`,
roles `delivery_workspace` y `legacy_project_scope` activos. Esto verifica configuración PG, no salud del
provider ni cobertura del trabajo. No se consultó ni escribió Notion externo en este discovery.

## Access model y conexiones

- Sesión/roles/routeGroups: resolver de `tenant/access.ts`, lifecycle vigente; sin cambios de login.
- Vistas cliente: `client-portal/visibility/` + revocación per-persona; no sembrar roles para abrir vistas.
- Administración: capabilities existentes `client_portal.module.read_assignment`, `.enable`, `.pause`,
  `.disable` y override específico. La nueva entrada debe revalidar principal y target antes de leer/escribir.
- Writes: commands actuales → assignment + evento append-only + outbox v1 en la misma transacción.
- Reads: `services`, términos, catálogo, asignaciones, sesión, bindings y preferencias desde sus dueños;
  DTO explícito, sin costos, credenciales, contactos en claro ni payload de conversación Teams.
- API Platform tiene `executeApiPlatformCommand`, `runEcosystemCommandRoute` y app auth. Reutilizar su
  idempotencia de transporte, sin confundirla con atomicidad del command ni devolver replay tras revocación.
- No se encontró una allowlist propia de tablas de escritura del BFF en la búsqueda focal; el plan declara
  targets explícitos y probará la dirección de imports y las escrituras efectivas.

## Verificación realizada

- `pnpm codex:task-hook TASK-1852 --develop`: pass, sin autorización de subagentes.
- `pnpm pg:doctor --profile=runtime`: pass; CLI/ADC vigentes, rol runtime sin CREATE en schemas examinados.
- `pnpm exec vitest run --project unit src/lib/client-portal/commands`: **5 archivos, 68 passed**, 0 skipped.
- Baseline completo antes de código: `pnpm typecheck` terminó con exit 0; `pnpm lint` terminó con
  exit 0, 0 errores y 26 advertencias preexistentes. La generación de iconos de prelint no dejó cambios.
- Readbacks READ ONLY: schema, cohortes, fuentes/canales, FK y ejecución real del resolver de business lines.
- Gates documentales: task lint focal `template=1`, 0 errores/0 warnings; `ops:lint --changed` 0 errores y 13
  warnings de paridad en épicas ajenas preexistentes; `docs:closure-check` 0 warnings, auditoría de flags sin
  consulta Vercel e índice Creative Studio OK. `git diff --check` y enlaces de los tres artefactos propios OK.
- Pendiente: código, tests nuevos, concurrencia/rollback con fixtures, HTTP/E2E y login humano,
  datos externos, preferencia/cadencia, apply autorizado y readback posterior. No hay certificación operativa.

## Integridad de artefactos locales

Los JSON son evidencia auxiliar ignorada; este documento conserva las conclusiones necesarias para retomar.
Queries y runners de discovery se conservan en `.captures/task-1852/` sin secretos.

| Artefacto | SHA-256 |
|---|---|
| schema-readback.json | e4d9e73df8ee865287f25758d930c1a0561701e09c301b873ed72ee819fcca01 |
| cohort-readback.json | 5f1c62833ed1f83b5ac221c31babb353cf65b1c2d410aa7cdd60b66ad73a7484 |
| readiness-readback.json | 32718707aa3e557ab84fed96b22bbfd4f1b730ee75cd8bde7a8deae431dab666 |
| bridge-readback.json | f05495cb3491b1cb21fa133f34d06ed026fbebaf7f3875a7aa7b541daf42968c |
| resolver-readback.json | 98599a854411666d85f6f95501e73b9c029aa4d9a4088cd2f43d0fd7d1ec0de5 |
| baseline-typecheck.log | 09eb98934865bb44174a1d31d652500e96c6b274232ea78044b30b73f93eb78c |
| baseline-lint.log | 3dd180dc73bcc48ee20994af06cc8bd30c7671d427afcc508067714e7df6555e |

## Continuidad de la implementación

Este discovery conserva el baseline anterior al código. La implementación autorizada posterior y sus
resultados están en [QA de TASK-1852](TASK-1852_IMPLEMENTATION_QA_2026-09-09.md). Sus pendientes históricos
no sustituyen el Status real de la task.
