# Marketing Studio — cierre documental de la sesión 2026-10-04

## Alcance y estado

Petición del operador: documentar todo lo construido durante la sesión, con subagentes. Se revisan la
implementación TASK-1905, su release exclusivo de Studio y la CLI HTTP creada en Greenhouse. Tres
subagentes cubrieron arquitectura/manuales, operación/lifecycle y skills; el coordinador reconcilió routers,
índices, contexto y artefactos generados. La actualización documental no aplica datos ni habilita permisos.

**Studio está desplegado; la CLI está disponible localmente en Greenhouse; TASK-1905 sigue parcial.**
No se confunden operación HTTP disponible, tool declarada, federación MCP, autoridad de persona ni acceso
a una organización. No hay push/deploy nuevo de Greenhouse o del gateway por este cierre.

## Todo lo construido y dónde se lee

| Entrega/decisión | Estado acreditado | Fuente canónica y evidencia |
| --- | --- | --- |
| Catálogo versionado de canales, formatos, placements, límites, objetivos y tracking | Studio main `74073de`, API 1.6.0; versión 1 publicada con 52 canales | [Arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md), [contrato funcional](../../documentation/marketing-studio/catalogo-canales-y-referencias-icp.md), [release](TASK-1905-release-2026-10-04.md) |
| Separación modalidad/familia, plataforma de compra y plataformas de aparición; UTM/GA4 | Contrato canónico implementado, mercados fuera de `channelKey`; no inferir aliases | [Decisión de estrategia](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md), [gobierno de catálogo](../../manual-de-uso/marketing-studio/gobernar-catalogo-canales.md) |
| Inmutabilidad de versiones publicadas, borradores, revisiones y publicación serializada | Migraciones `1791144092031`/`1791144092429` aplicadas a staging/producción; negativos DB verificados | [Dossier local](TASK-1905-local-verification.md), [dossier release](TASK-1905-release-2026-10-04.md) |
| Validación transaccional de referencias/límites, snapshots, findings y revalidación explícita | `STUDIO_CHANNEL_VALIDATION_MODE=warn` en web/worker; warnings no certifican conformidad; enforcement no activado | [Contrato funcional](../../documentation/marketing-studio/catalogo-canales-y-referencias-icp.md), [runtime](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md) |
| Atención/UI existente para canales sin mapear | Implementación y QA local desktop/mobile; release Studio y readback de atención documentados | [Verificación local](TASK-1905-local-verification.md), [release](TASK-1905-release-2026-10-04.md) |
| Backfill revisable y aliases con evidencia | Herramienta probada localmente; inventario productivo de 134 registros, cinco aliases; apply histórico no ejecutado | [Manual de gobierno](../../manual-de-uso/marketing-studio/gobernar-catalogo-canales.md), [inventario/owner](TASK-1905-release-2026-10-04.md#backfill-pendiente-de-revisión-humana) |
| Capability `marketing_studio.catalog.manage` de Greenhouse | Código local para admin/operations; no release Greenhouse acreditado por esta sesión; bearer global de catálogo sigue denegado | [TASK-1905](../../tasks/in-progress/TASK-1905-marketing-studio-channel-catalog-risk-tiers-icp-reference.md), [runtime](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md) |
| Referencias versionadas ICP/customer model por organización | Contratos/audiencias preparados; `STUDIO_CUSTOMER_MODEL_ENABLED=false`, sin modelo real inventado ni rollout ICP | [Contrato funcional](../../documentation/marketing-studio/catalogo-canales-y-referencias-icp.md), TASK-1906/1892 en [TASK-1905](../../tasks/in-progress/TASK-1905-marketing-studio-channel-catalog-risk-tiers-icp-reference.md) |
| Paridad HTTP y manifiesto de operaciones | 59 tools de negocio, 64 operaciones OpenAPI; fuente única en Studio; gateway no se actualizó con ellas | [ADR API-first](../../architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md), [runbook MCP](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md#provider-marketing-studio-efeonce-marketing-studio) |
| Sonda routable del worker | `/health` agregado tras 404 de infraestructura en `/healthz`; misma imagen promovida staging→producción | [Release, imagen/revisiones y rollback](TASK-1905-release-2026-10-04.md) |
| CLI HTTP `pnpm studio` en Greenhouse | Local, sin dependencia del checkout Studio/SQL; list/describe/call/doctor, cuerpo JSON/stdin, dryRun/apply, idempotencia/If-Match, T2 con intención explícita | [Manual CLI](../../manual-de-uso/marketing-studio/operar-por-cli-api.md), [QA de implementación](2026-10-04-studio-api-cli.md) |
| Cargas y descargas por API | Hash streaming, derechos, reserva/transferencia/confirmación, duplicate/pending/resume; descarga con SHA-256/tamaño y recibos redactados | [Manual](../../manual-de-uso/marketing-studio/operar-por-cli-api.md), [18 pruebas y canary dryRun](2026-10-04-studio-api-cli.md) |
| TASK-1899 retirada como requisito de construcción | Decisión vigente: API/CLI/UI avanzan; T1 delegado tiene owner TASK-2003 en paralelo, aún sin runtime; T2/proposalDigest de TASK-1899 no se reanudan | [ADR API-first](../../architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md), [TASK-1899](../../tasks/to-do/TASK-1899-marketing-studio-mcp-writes-approvals.md) |

## Documentos y skills reconciliados

- Arquitectura técnica y ADRs de API-first, estrategia, ingest/SSOT y agentes; documentación funcional del
  producto y catálogo; manuales de gobierno, operación general y CLI.
- Runtime handoff con release, migraciones, seed, flags, worker, canarios, rollback y pendientes; TASK-1905,
  plan, índices y EPIC-049 con estado real y criterios de aceptación respaldados.
- Skills espejo Codex/Claude de Marketing Studio (entrada + mapa, contratos, operaciones, ledger y lecciones),
  campaign-planning y MCP Platform; referencias de planificación de medios donde la autoridad estaba obsoleta.
  El manual servido por MCP conserva su alcance de conexión real; describir una tool no la federa.
- Registro de campañas y runbook del provider MCP; `AGENTS.md`, `CLAUDE.md`, router machine-readable,
  `project_context.md`, `Handoff.md`, changelog e índice de docs apuntan al flujo correcto.
- El historial previo permanece consultable: [snapshots íntegros con SHA-256](../../operations/agent-context-history/2026-10-04-studio-closure/README.md)
  y [changelog mensual](../../changelog/internal/2026-09.md). No se sustituyó historia por afirmaciones actuales.

Se corrigieron estados activos que decían «sólo local», «ninguna función en runtime» o «17 operaciones»
cuando ya existían release y contratos posteriores. Las fechas de pruebas anteriores permanecen como
historia, con un estado vigente explícito. El enfoque es un dueño canónico por contrato, con enlaces desde
sus consumidores; no copiar el dossier completo dentro de cada skill.

## Verificación del cierre

**PASS documental focal**, sin convertirlo en cierre de runtime pendiente. [Readout machine-readable](2026-10-04-session-documentation-checks.json).

| Gate | Resultado |
| --- | --- |
| Closure documental con paths del dominio, continuidad, skills y artefactos | 0 warnings |
| `pnpm docs:context-check:strict` | 0 errores / 0 warnings; Handoff, project_context y changelog dentro de presupuesto |
| `pnpm task:lint --task TASK-1905` | 0 errores / 0 warnings; lifecycle in-progress conservado |
| `pnpm ops:lint --changed` | Tasks: 0/0; épicas: 0 errores / 13 warnings históricos de child-parity en otras épicas, ninguno de EPIC-049 |
| `pnpm skills:mirrors` | PASS, incluidas Studio, Campaign Planning, MCP Platform, Media Planner y SEO/AEO |
| `pnpm mcp:skills:generate` + `mcp:skills:check` | 9 manuales, catálogo regenerado y consistente; Studio appliesTo limita a 14 lecturas, no amplía federación |
| `pnpm mcp:manifest:check` | PASS: 67 tools del servidor Greenhouse, inventario distinto de las 59 tools de Studio |
| Vitest focal `skill-manifest.test.ts` + `tool-manifest.test.ts` | 55/55 pruebas PASS |
| `pnpm studio:test` | 18/18 PASS, repetidas durante este cierre |
| `pnpm studio doctor` contra API real | API 1.6.0, 59 tools/64 operaciones, database reachable |
| Enlaces Markdown relativos del alcance | 57 archivos revisados, 1101 enlaces, 0 destinos faltantes; snapshots históricos excluidos porque preservan bytes originales |
| Integridad de snapshots | 3/3 archivos coinciden en SHA-256 y tamaño |
| `git diff --check` focal | PASS |

En el índice ADR se actualizaron las cuatro decisiones Studio y ocho enlaces de tasks antiguas cuyo
archivo ya estaba en `complete/`; no se cambió el estado ni el contenido de esas tasks.

La evidencia de migraciones, worker, canarios y release proviene de los dossiers fechados. Este cierre
reverificó el contrato/salud HTTP y los gates locales; no repitió la promoción, el rollback, la carga
aplicada ni el canary con persona. Tampoco corrió build/CI global de Greenhouse por un cambio documental.
Las 13 advertencias operativas ajenas quedan registradas, sin reescribir sus épicas como parte de Studio.

## Pendientes operativos que la documentación no oculta

1. `efeonce_operations`: decidir los cinco aliases y revisar/aplicar el backfill de 134 registros; mantener
   valores raw y modo warn hasta resolverlos. Publicar el seed no autoriza asignación automática.
2. Dominio customer model/Studio: TASK-1906/1892, disponibilidad de referencias reales y activación explícita
   del reader. Vacío/deshabilitado no equivale a ICP resuelto.
3. Autoridad de catálogo y scopes: la CLI existente de cargas sólo tiene sus permisos; escritura general
   requiere `studio:write`; catálogo global y aprobaciones requieren la autoridad aceptada por el servidor.
4. Greenhouse: código/capabilities/documentación locales no acreditan push, CI ni deploy. Gateway: sin nueva
   federación de escrituras, sin sincronización indiscriminada del manifiesto completo; T1 delegado pendiente de
   TASK-2003, ya decidido en paralelo, y T2/proposalDigest retirado con TASK-1899. Ninguno se convierte en requisito retroactivo de la CLI.
5. La CLI tiene pruebas de aplicación/transferencia con fixtures controladas y lectura/dryRun reales; esta
   entrega no demuestra una carga nueva aplicada en producción, ni una aprobación, publicación o gasto.

No se actualiza `CLIENT_CHANGELOG.md` como anuncio comercial: este corte registra contratos, operación de
Studio y herramientas del operador; no acredita habilitación de un nuevo cohort cliente ni envío de anuncio.
No se escribieron documentos de gobernanza en el repo hermano, no se actualizaron memorias personales y no
se cambió infraestructura ni autorización a través de esta tarea documental.
