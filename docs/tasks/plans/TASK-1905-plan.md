# Plan — TASK-1905: catálogo de canales y referencias ICP

Fecha: 2026-10-04. Owner: Codex. Estado: discovery terminado; pendiente checkpoint humano del plan.
Goal confirmado por el operador en esta conversación. Discovery delegado a tres subagentes, sólo lectura.
No hay implementación, migración, seed, backfill, push ni deploy de esta task en esta sesión.

## Discovery summary

Fuentes: task vigente (incluidos los deltas del 04/10), ADR de estrategia §15, arquitectura de Studio,
ADR API-first, runtime handoff, AGENTS de ambos repos y skill `efeonce-marketing-studio`.
El código de Studio se inspeccionó en `c52eb4a`, checkout limpio. Greenhouse está en `develop`, con WIP
ajeno en la task y documentos del programa; se preserva. Este informe no certifica estado productivo.

| Hallazgo verificado | Consecuencia |
| --- | --- |
| `packages/contracts/src/operations.ts:60,112` ya exige `riskTier`; `packages/domain/src/commands/kernel.ts:74` lo lee del registro | Reusar TASK-1894; no reintroducir riesgo ni proposalDigest retirado |
| `apps/web/src/server/operations-parity.test.ts:21` sólo compara paths | Añadir método + path y negativos demostrados; un POST no puede quedar cubierto por un GET |
| `apps/web/src/client/studio-api.ts` aún no existe | Analizar consumidores reales y preparar guard para TASK-1895; no crear cliente ficticio para obtener verde |
| `packages/domain/src/channels/validator.ts` es un puerto neutral usado por seis familias | Reusar el puerto y conectar una sola composición de dependencias para API y CLI |
| Copy, anuncios, presupuesto y posts no persisten la versión devuelta por el validador | Persistir versión y hallazgos junto con la escritura en la misma transacción |
| `campaign_brief.channel_keys` y `channel_catalog_version` ya existen (`schema.ts:395`, migración `1790967435017`) | Expand no duplica columnas |
| `studio.audience` no tiene `revision` (`schema.ts:189`) | Añadir revisión antes de prometer If-Match |
| Kernel exige organización (`kernel.ts:125`) pero el catálogo es global | Scope global explícito y autorizado; nunca organización ficticia ni ampliación implícita |
| Atención vive en `packages/domain/src/readers/overview.ts:45` | Extender ese reader, no crear un segundo dueño |
| Delta 04/10 y ADR §15 sustituyen la semilla antigua | Cuatro modalidades, doce familias, compra y aparición separadas; perfil LinkedIn es cuenta; UGC no es canal |

Baseline reportada por el subagente Studio: 50 tests PASS (kernel, catálogo, plan, registro y permisos)
+ 1 test de paridad PASS. Las integraciones PostgreSQL no se ejecutaron: necesitan `STUDIO_IT_PG_URL`.
No se leyeron valores distintos de canales productivos ni se probaron triggers en DB.

## Dependencias y hook

`pnpm codex:task-hook TASK-1905 --subagents` fue ejecutado después de confirmar el goal y rechazó el
`Blocked by` heredado (TASK-1894 + dependencias del Slice 6). No se bypassó ni modificó el hook.

- TASK-1894: el kernel y commands necesarios existen. Sus entregables A/B están documentados en producción;
  la inspección local confirma la base para implementar, no repite la certificación del rollout.
- TASK-1899 está retirada. No implementar digest/aprobaciones MCP ni exigirla para construir.
- TASK-2003 posee autoridad delegada y federación de escrituras T1. No ampliar su scope ni implementarla
  implícitamente dentro de 1905. Declarar todas las tools y conectar federación cuando su carril esté listo.
- TASK-1906 y TASK-1892 Slice 3 condicionan la integración ICP real, no los slices independientes del catálogo.

Antes de código, reconciliar `Blocked by` como ausencia de bloqueo global de construcción, conservando
dependencias por slice y de cierre en Status real/Dependencies; mover task a in-progress, sincronizar README
y volver a ejecutar el hook. La task completa no se cierra mientras falten criterios y evidencia requerida.

## Access model

- Sin nuevas pantallas, routeGroups ni views en este alcance; UI de administración sigue en TASK-1912.
- Lecturas: capability `marketing_studio.campaign.read`, aislamiento por organización para hallazgos/ICP.
- Gestión global: `marketing_studio.catalog.manage`, sólo `efeonce_admin` y `efeonce_operations`.
  Capability, seed y coverage deben viajar juntos; `efeonce_account` y bearer de servicio no gobiernan catálogo.
- Extender `CommandSpec` con scope explícito del recurso. Scope global no concede autoridad por sí mismo.
  Auditoría e idempotencia conservan actor real; jamás un tenant inventado como sustituto de autorización.
- Hasta TASK-2003: las rutas pueden existir con denegación segura; operación de catálogo por CLI del operador.
  No habilitar `Actor.user` ni token de servicio como atajo. T2 conserva el carril humano CLI vigente.
- El adapter ICP usa ecosystem; organización solicitada intersecta autoridad y mantiene 404 anti-oráculo.

## Architecture decision

ADRs existentes: `EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (§§4–5,15),
`EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` y `EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`.
No nueva topología: contratos browser-safe en `packages/contracts`, dominio sin framework en
`packages/domain`, persistencia en `packages/database`; web, CLI y MCP son adaptadores.
Greenhouse conserva autoridad/ICP; gateway conserva transporte. No SQL cross-product ni SDK nuevo.

Precisiones a registrar en los dueños antes de implementación:

1. Inmutabilidad comprende INSERT/UPDATE/DELETE de filas hijas, cambio de versión y versiones superseded;
   publicar permite sólo la transición explícita de estado del padre, no modificar especificaciones históricas.
2. Publicación serializada evita dos versiones actuales; draft por persona y máximo global se verifican en DB.
3. Canal desconocido en warn conserva raw, clave canónica null y hallazgo hard. No viola FK ni finge validación.
4. Arrays de brief/derechos necesitan integridad por miembro: una FK escalar no protege un array.
5. Buying method y deal type pertenecen a anuncio/presupuesto; cuenta/voz y mercado a activaciones (TASK-2001).
6. Tracking se versiona por plataforma de aparición/placement cuando un canal compra múltiples inventarios.
   Un catálogo de Meta/DSP no puede inventar un `utm_source` único para todas las apariciones.
7. Especificaciones de copy admiten ámbito por formato y placement: los límites de single-image no se
   aplican a todos los formatos de una plataforma. PK propia + unicidad explícita resuelve ámbitos opcionales;
   no usar `placement_key NULL` dentro de una PK compuesta, que PostgreSQL convierte en NOT NULL.

## Backend/data contract

SSOT: tablas `studio.channel_catalog_version`, `channel`, `channel_placement`, `channel_format`,
`channel_copy_limit`, `channel_objective`, `channel_alias`, `channel_validation_finding` y columnas aditivas
de entidades consumidoras. Tracking de múltiples apariciones forma parte de esa versión y su integridad.
FKs y referencias preservan versiones históricas; findings append-only referencian entidad, revisión y versión.

Una ejecución selecciona una versión publicada exacta una vez. Validador puro + carga desde store + persistencia
transaccional permiten igual conducta en API/CLI/importador. Dry-run no escribe hallazgos ni datos.
Toda mutación reusa `runCommand`, idempotencia, If-Match y auditoría. Borrado de audiencia respeta anuncios consumidores.

Expand nullable; backfill sólo desde alias revisados por una persona, lotes de 500, dry-run por defecto,
idempotente y con `ops_run`. No normalizar un alias ambiguo por inferencia. No cambiar UTM existentes.
Contract (NOT NULL/retiro de raw) queda fuera. Rollback por modo off conserva raw e históricos;
cambiar env en Vercel exige redeploy, no es un toggle instantáneo.

## Medición y semilla

Semilla con modalidad, familia, plataforma de compra y apariciones, placements, límites duros/recomendados,
formatos, objetivos, fuente y fecha. Límites no verificables = null con razón; no reutilizar números de memoria.
ChatGPT Ads permanece paid search por decisión del operador, pero su elegibilidad se verifica por mercado.
Fuente editorial y canal no se confunden; content source de pieza conserva derechos y owner del contrato.

`expectedGa4Channel(source, medium)` debe declarar alcance **tráfico manual**. GA4 también utiliza nombre de
campaña y datos de integración para determinados canales: no presentarlo como réplica universal.
Auto-tagging se valida por política separada. Canal editorial y agrupación GA4 pueden diferir; categoría custom
explícita cuando corresponda. Mantener fuente/fecha del clasificador, sin hardcodear reputación de plataformas.
RESEARCH-012 requiere reconciliar la explicación de precedencia de auto-tagging con fuente oficial.

Fuentes oficiales consultadas por el subagente taxonomía el 2026-10-04:

- [Google, agrupaciones por defecto](https://support.google.com/analytics/answer/9756891?hl=en):
  clasificación manual e integrada son distintas; el test no debe prometer cobertura universal.
- [Google, etiquetado manual y automático](https://support.google.com/analytics/answer/11242870?hl=en):
  auto-tagging válido conserva precedencia; fallback UTM cuando identificadores no pueden usarse.
- [LinkedIn, single-image](https://www.linkedin.com/help/linkedin/answer/a426534/single-image-ads-advertising-specifications):
  separar máximo de recomendado, con alcance exacto del formato y evidencia por especificación.
- [OpenAI, referencias de búsqueda](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq):
  procedencia orgánica no equivale a un enlace publicitario creado por Studio.

Tracking no determinista devuelve null con razón (`appearance_required` o `publisher_inventory_required`)
hasta elegir aparición/inventario. Eso no declara correcto un UTM incompleto ni genera una URL;
TASK-2001 resuelve ese dato al preparar activaciones. Modo auto se valida separadamente.

## Skills

- `efeonce-marketing-studio`: todos los slices y contrato de mantenimiento.
- `greenhouse-task-execution-hook`: preflight y ejecución formal.
- `software-architect-2026`: scope global, migración, consistencia y fronteras.
- `efeonce-mcp-platform` + `mcp-craft`: autoridad, registro y federación, cuando se implemente esa superficie.
- `greenhouse-agent` y skills DB/secret-hygiene aplicables: grants y migraciones; cargar antes de ese slice.
- `greenhouse-qa-release-auditor` + `greenhouse-documentation-governor`: verificación/cierre.

## Subagent strategy

Discovery `fork` autorizado y ejecutado: Studio/schema/kernel; Greenhouse/MCP/ICP; taxonomía/UTM/fuentes.
Implementación principal secuencial en Studio por solapamiento de schema, kernel, registro y factories.
Después del checkpoint, workers independientes sólo con ownership asignado: Greenhouse capability/tests y
semilla/fuentes una vez congelado su contrato; el principal integra. Nunca dos escritores de operations/schema.
Revisión independiente de seguridad/inmutabilidad al terminar. Sin cambiar ramas ni crear worktrees.

## Execution order

| Unidad | Archivos/contratos | Reuso y evidencia |
| --- | --- | --- |
| 0. Reconciliación | Task, plan, ADR, RESEARCH-012, README | Deltas vigentes sobre spec antigua; hook pasa; evidencia de dependencias por slice |
| 1. Paridad | `operations-parity.test.ts`, registry/manifest tests | Método+path, riesgo, tool/exclusion, mutaciones web; cinco negativos inyectados vistos fallar |
| 2. Datos y contratos | Migraciones nuevas, `schema.ts`, `channels.ts`, DTO/errors/semantics | Catálogo/expand/revision/buying metadata; no duplicar brief; DB local aislada |
| 3. Catálogo global | `commands/kernel.ts`, `commands/channel-catalog.ts`, `channels/**` | Scope explícito, denegaciones, concurrencia, inmutabilidad, CLI seed |
| 4. Validación | Factories/commands de catálogo y plan, rights, routes y CLI | Misma composición transaccional, off/warn/enforce, versión única, límites y formatos |
| 5. Lectura/backfill | `readers/overview.ts`, `health/health-deep.ts`, import, CLIs channels | Findings/stale spec, alias humano, ops_run, revalidación parcial, dry-run sin efectos |
| 6. Superficie | Routes `/api/v1`, operations, manifiesto generado y minor API | 15 operaciones declaradas o dependencia explícita; tests de contrato y denegación |
| 7. Greenhouse/gateway | Capability/grants/migración, manifiesto sincronizado, policy | Coverage, riesgo desde artefacto; T1 write gated por TASK-2003; no scopes improvisados |
| 8. ICP | `customer-model/**`, referencia/reader, audience/campaign commands | Sólo contrato confirmado; disabled/pending honestos hasta 1906 + 1892 |
| 9. QA/documentación | Tests/build y docs dueñas/skills espejo | Evidencia local primero; rollout y backfill humano como etapas pendientes separadas |

## Files to create / modify / delete

Crear: contratos `channels.ts` y `customer-model.ts`; módulos `channels/**`, `customer-model/**` y commands
de catálogo/audiencias; migraciones, semilla, CLI seed/backfill, rutas y pruebas focales conforme ownership de task.
Modificar: schema existente, DTO/errors/semantics/operations, composición de commands, importer, atención/health,
grants Greenhouse y adaptadores/manifiesto gateway cuando estén disponibles sus dependencias.
Eliminar: ninguno. Regenerar artefactos mediante scripts, nunca editar manifiestos a mano.
Gobierno sólo en Greenhouse: arquitectura, funcional, manual, task/epic, handoff, flags y skills espejo.

## Risk flags y verificación

- Mayor riesgo: scope global accidentalmente accesible a bearer; test de denegación obligatorio.
- Inmutabilidad, publicación simultánea, arrays, warn+FK y borrado referenciado requieren DB real de pruebas.
- Count Unicode y límites exactos ±1; copy literal inalterado; formatos, placement, objetivos, retired.
- Revalidación no marca como válidas filas hard ni revalida silenciosamente por publicar otra versión.
- TASK-2003 podría trabajar en los mismos kernel/actor/exchange files: coordinar antes de editar.
- No activar enforce hasta backfill revisado y un release en warn sin hallazgos inesperados.
- Studio `pnpm check` + `pnpm build`; Greenhouse checks focales y grants/migration gates;
  gateway tests/parity/surface con bump cuando corresponda. Skips de DB se declaran, no equivalen a PASS.
- Staging/production: migración, seed, triggers, canary persona permitida/denegada y MCP real se registran
  únicamente cuando se ejecuten. No autorizados por el plan: push, deploy, cambios de permisos cloud o datos reales.

## Open questions y checkpoint

Cadencia propuesta: revisión trimestral de specs y ante cambio anunciado por proveedor; owner operaciones/admin,
sin crear automatización. Ambigüedades de alias sólo se resuelven por persona al revisar el dry-run.
Dependencias ICP/MCP y ausencia de inventario DB actual no impiden catálogo local, sí limitan cierre operativo.

Se solicita aprobación de este plan concreto antes de código por `TASK_PROCESS.md` Phase 3:
P1 y Effort Alto requieren checkpoint humano. El goal aprobado fija objetivo; este checkpoint revisa diseño.
Estado de salida antes de aprobación: **discovery/plan**, no code complete. Tras implementar, si faltan rollout
o dependencias: **implementación local verificada por slice; integración/rollout pendiente**, sin mover a complete.

## Verificación del discovery y plan

- `pnpm task:lint --task TASK-1905`: PASS, 0 errores/advertencias.
- `pnpm skills:mirrors`: PASS, incluidos los apuntes de sesión agregados a ambos espejos.
- `node scripts/check-documentation-closure.mjs -- docs/tasks/plans/TASK-1905-plan.md`: 0 warnings.
- `git diff --check`: PASS.
- `pnpm docs:context-check:strict`: FAIL por Handoff ~12046 tokens (tope 12000) y changelog 61 entradas
  (tope 60). Ambos archivos ya tenían WIP ajeno y no fueron modificados por este discovery; no se rotaron.
  El comando compuesto `pnpm docs:closure-check -- <path>` propagó el argumento sólo al último subcomando;
  su auditoría inicial alcanzó todo el WIP y produjo 2 warnings generales. Se repitió el helper directo
  con pathspec para aislar este plan; no presentar el check global como limpio.
