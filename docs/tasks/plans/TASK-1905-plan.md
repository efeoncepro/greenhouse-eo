# Plan — TASK-1905: catálogo de canales y referencias ICP

Fecha: 2026-10-04. Owner: Codex. Estado: plan aprobado; Studio desplegado y verificado; integración Greenhouse/MCP/ICP y backfill pendientes.
Goal confirmado por el operador en esta conversación. Discovery delegado a tres subagentes, inicialmente sólo lectura. Tras aprobación del plan, implementación por ownership independiente.
El discovery inicial no modificó runtime. Sus secciones y resultado local conservan esa evidencia histórica; el release posterior autorizado y el cliente CLI se registran al final, sin reinterpretar los checks iniciales.

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

Discovery de autoridad: gateway con checkout limpio; guard local
`src/providers/marketing-studio-tool-parity.ts:46` todavía rechaza writes sin clase de scope.
No se certificó su despliegue. Búsqueda focal del principal confirmó `.asset.write`/`.campaign.write` en
`src/config/entitlements-catalog.ts:2522` y grants en `src/lib/entitlements/runtime.ts:3224`; no encontró
`.catalog.manage` en esos archivos ni en `mcp-token-exchange.ts`. Tampoco encontró rutas/archivos
`customer-model` bajo `src/lib/commercial` y el lane ecosystem. Esto acredita gaps locales, no ausencia
de tablas ni de bindings en producción. No se consultaron grants efectivos, consumer o DB de Greenhouse.

## Dependencias y hook

`pnpm codex:task-hook TASK-1905 --subagents` fue ejecutado después de confirmar el goal y rechazó el
`Blocked by` heredado (TASK-1894 + dependencias del Slice 6). No se bypassó ni modificó el hook.

- TASK-1894: el kernel y commands necesarios existen. Sus entregables A/B están documentados en producción;
  la inspección local confirma la base para implementar, no repite la certificación del rollout.
- TASK-1899 está retirada. No implementar digest/aprobaciones MCP ni exigirla para construir.
- TASK-2003 posee autoridad delegada y federación de escrituras T1. No ampliar su scope ni implementarla
  implícitamente dentro de 1905. Declarar todas las tools y conectar federación cuando su carril esté listo.
- TASK-1906 y TASK-1892 Slice 3 condicionan la integración ICP real, no los slices independientes del catálogo.

Reconciliación documental realizada: `Blocked by: none` para construcción independiente; Status real y README
conservan las dependencias por slice y el checkpoint pendiente. El hook `--subagents` volvió a ejecutarse y pasó.
El operador aprobó el plan; task movida a in-progress y referencias sincronizadas. La task completa no se cierra mientras falten criterios y evidencia requerida.

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

Aprobación recibida explícitamente: «Aprobado», después de presentar este plan. Se cumple `TASK_PROCESS.md`
Phase 3 (P1 y Effort Alto). El goal y el plan están confirmados.
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

## Resultado de implementación local (2026-10-04)

- Studio: API 1.6.0, 59 tools (+15 operaciones); catálogo de 52 canales con taxonomía/UTM, writers/importador,
  snapshots/versiones inmutables, findings, revalidación, backfill y audiencias/adapter ICP. Metadata de compra
  y content source son campos separados. `pnpm check` y `pnpm build` PASS.
- PostgreSQL aislado: diez migraciones; suite domain completa con los cuatro envs de integración:
  **34 suites / 216 tests PASS, cero skips**. Pruebas fuerzan constraints diferidas antes de rollback.
  CLI seed publica 52 y replay no-op; backfill dry-run0, apply1, replay0, revert1 con auditoría/ops_run.
- Revisión independiente cerró: previews con metadata real; anuncios verifican medio y copy del destino;
  snapshots deduplicados/arrays parciales no se reescriben por backfill; operadores limitados a org no gobiernan
  mantenimiento global. Paridad15/15 validada por introspección y cinco negativos del gate.
- Señal exigida por Slice3 conectada a tarjeta existente Hoy (ui-lite); clasificación corregida a copy, sin editor
  ni nueva composición. Runtime local1440/390 sin overflow/JS/HTTPerrors y CTA correcto.
- Greenhouse: capability33tests PASS; SQL parqueado para reactivación en release. Las modificaciones ajenas
  de docs/skills permanecen en el checkout; no se hace staging masivo.
- Gateway rama ajena preservada. ICP real (1906/1892), federación T1 (2003), migración/seed/backfill/canary en
  staging y producción siguen pendientes; TASK-1905 permanece in-progress. Ningún push/deploy/cambio cloud.

[Dossier de evidencia y límites](../../audits/marketing-studio/TASK-1905-local-verification.md).

Commits locales de implementación: Studio `5036d94`, Greenhouse `7d5dc100f`. Greenhouse TypeScript PASS con heap de 12 GB (default de 4 GB agotó memoria). Dossier registra los presupuestos globales de contexto excedidos y preserva el WIP ajeno.

Auditoría documental complementaria: manual MCP y appliesTo actualizados (34 tests PASS, 27 referencias
verificadas contra manifiesto Studio); skill de planificación espejada, ledger de flags y arquitectura §3.1
alineados con el contrato local. La federación y el canary siguen pendientes; manual y manifiesto deben
promoverse coordinadamente. Evidencia ampliada en el dossier local.

Release Studio autorizado y ejecutado posteriormente: main 74073de, Vercel/worker y catálogo verificados. Ver `docs/audits/marketing-studio/TASK-1905-release-2026-10-04.md`. Greenhouse/gateway/ICP y backfill siguen pendientes.


## Readout posterior al release y entrega CLI (2026-10-04)

Este readout sustituye las afirmaciones de rollout pendiente de la fase local anterior, sin borrarlas como historia.
Studio main `74073de1188f` desplegado: Vercel Ready, API 1.6.0/59 tools; migraciones staging/prod aplicadas, seed v1
52 canales published. Worker staging 00006-p8q/prod 00004-j4h, misma imagen, health 200. Flags warn/ICP false.
Canary positivo de copy/warnings/replay en CMP-900 staging; producción lectura+negativos (org 404/bearer 401/catalog
service write 403), atención 200 y 44/44 thumbs 200. Backfill productivo sólo dry-run: 134 unmapped, revisión de cinco
aliases por efeonce_operations. Greenhouse capability SQL sigue pendiente; gateway y consumer ICP sin release.

La CLI API-only nueva en Greenhouse (`scripts/marketing-studio`, `pnpm studio`) descubre 59 tools/64 operaciones;
18 tests/lint PASS y lectura autenticada/upload dry-run real sin ticket. Upload/download/applies se ensayaron con
servidor local controlado; no transferencia aplicada productiva ni nuevo release Greenhouse. Este cliente conserva
los permisos/scopes y controles de OneDrive del servidor. `--confirm` no suple autoridad de T2.

Verificación local final: Greenhouse tsc con 12 GB PASS exit 0 (default de 4 GB OOM), Studio check final PASS: 243 Vitest PASS
(206 domain; 10 tests DB omitidos en esa invocación), 7 gates PASS; la suite PG aislada separada de 34 archivos/216 tests cero
skips cubre esos casos de dominio. No sumar ambos conteos. Build PASS; docsclosure focal 0 warnings/tasklint 0/0.
El gate de contexto global conserva excesos de WIP ajeno; la auditoría CLI posterior registra sus tres warnings.

Fuentes: [release](../../audits/marketing-studio/TASK-1905-release-2026-10-04.md),
[checks](../../audits/marketing-studio/TASK-1905-release-2026-10-04-checks.json),
[CLI](../../audits/marketing-studio/2026-10-04-studio-api-cli.md). TASK-1905 permanece in-progress. TASK-1899 retirada
no bloquea API/CLI/UI; TASK-2003 posee T1 delegado en paralelo, sin afirmar federación por esta entrega.
