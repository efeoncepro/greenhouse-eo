# QA Release Audit - TASK-1844

## Verdict

**PASS para la cohorte inicial de una persona interna.** Producción, matriz de clientes, refresh/revocación, rollback/restore y retiro de fixtures verificados.

Closure state: **complete; producción ON para una identidad, sin ampliación de cohorte**

## Scope

- Changed files reviewed: contexto/consentimiento/emisión/refresh, reader canónico, permisos efectivos,
  resolver de relación, API Platform, gateway `1.3.0`, deployment config y SQL expand/contract aplicadas mediante migrador canónico.
- Runtime or environment reviewed: checkouts compartidos Greenhouse `develop` y efeonce-mcp `main`;
  PostgreSQL real con pruebas TEMP serializadas; renderer local y lecturas Cloud Run de baseline.
- Out of scope / unrelated worktree changes: no worktrees. Se preservó el commit concurrente
  `2ce2167aa` de EPIC-045, incluidos Handoff/changelog. No se operó sobre sus features.

## Risk Classification

| Risk | Level | Why |
| --- | ---: | --- |
| Auth / aislamiento organizacional | Alto | El mismo actor selecciona targets distintos por llamada |
| Consentimiento y refresh | Alto | Una familia anterior nunca puede elevarse a v2 por flags |
| Schema / deploy parcial | Alto | El writer anterior depende del índice que retira contract |
| UI | Bajo | Copy/DTO sobre renderer existente, sin nuevo layout |

## Injected Skills

- `efeonce-mcp-platform`, `mcp-craft`: contrato reader/tool y continuidad base-only.
- `software-architect-2026`, `greenhouse-secret-hygiene`: límites, snapshot, DB y config.
- `greenhouse-ai-design-studio`, `greenhouse-ux-content-accessibility`, `copywriting`: delta ui-lite.
- `greenhouse-browser-diagnostics`, `greenhouse-gvc-playwright`, `greenhouse-ui-enterprise-review`: renderer/GVC.
- `greenhouse-production-release`, `vercel-operations`: config durable, orquestador y estado servido.
- `greenhouse-qa-release-auditor`, `greenhouse-documentation-governor`: evidencia y cierre honesto.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Greenhouse unit/integration | PASS | 528 pruebas, 42 archivos; comando focal de la task. 25 pruebas live de otras suites quedan skipped en este modo y no se cuentan como verificadas |
| PG live TASK-1844 | PASS | `pnpm test:live src/lib/auth-server/internal/multi-org-migration.live.test.ts src/lib/identity/internal-access/target-authority.live.test.ts`: 2 archivos, 2 passed, 0 skipped, 60.58 s |
| SQL real | PASS limitado | Los dos SQL pendientes se ejecutaron sobre tablas TEMP con shape real: expansión, colisión entre versiones, writer compatible, contract, trigger inmutable y down rechazado. Esta prueba inicial no modificó el esquema compartido; el apply posterior tiene evidencia propia abajo |
| Autoridad real sin mutación | PASS limitado | Snapshot read-only: 14 organizaciones autorizadas, 2807 ms. No prueba el endpoint desplegado ni el token v2 completo |
| Gateway | PASS | `pnpm check`: 164 passed, 0 skipped; formato, typecheck, build y baseline de superficie `1.3.0` correctos |
| Greenhouse types/build | PASS | `pnpm exec tsc --noEmit` y `pnpm build`; bundle real de auth-server validado también por runtime-deps gate |
| Lint | PASS con baseline | 0 errores, 26 warnings previos `greenhouse/no-opacity-on-text`; no warnings propios añadidos |
| Config-only deploy | PASS | Test ejecuta el step real `worker-drift`: mismo SHA con cambio de gate/cohorte solicita deploy; estado idéntico lo omite; CSV preservado |
| Manifest / workers / rutas | PASS | `mcp:manifest:check`, `worker:build-contract-gate`, `worker:runtime-deps-gate`; route reachability 233 rutas, 0 huérfanas |
| Consentimiento visual | PASS local | [Revisión y cuatro PNG](../../ui/reviews/TASK-1844/review.md); 1440 y 390 px, teclado/reduced motion, 0 findings GVC |
| Higiene local de secrets | Diagnóstico | Loader canónico: 6 configuraciones healthy y 2 unconfigured (`NEXTAUTH_URL`, `CRON_SECRET`) en el entorno de tooling local. No se interpreta como estado productivo ni exige cambios ajenos; ningún secreto nuevo |
| Readback PG inicial | PASS histórico | Antes del rollout: CHECK versión 1, índice no versionado, 6 contextos v1; las pruebas TEMP no alteraron ese baseline |
| Runtime baseline Cloud Run | Verificado al inicio | Auth `00043-ndg` SHA `fb5fc082aa92`; gateway `00047-8b5` SHA `cd229069ee9e`; Ready/100 %, gates multiorg ausentes. No acredita las revisiones nuevas |
| Reader Vercel / clientes v2 | PASS | Producción reader ON; consentimiento v2 y dispatch reales nativos/hospedado registrados en JSON. Rollback/restore servido verificado; Claude Code requiere login tras OFF |
| Task / ops / docs | PASS local | TASK-1844 0 errores/0 warnings; ops 0 errores y 13 advertencias preexistentes de otros epics. docs:closure-check, flag audit (0 sin registrar), cron gate y cobertura deploy de los cuatro workers correctos |

Las pruebas incluyen roles futuros/vencidos/revocados y scopes acotados, todos los spaces de un target,
defaults y overrides aprobados/vigentes, A/B/C, cursor revocado, revocación selectiva/global, expiración durante
snapshot, aislamiento concurrente del wrapper SDK, errores de reader y JWT ES256 con continuidad v1/v2.
Las comprobaciones de SQL ejecutan PostgreSQL; no se usa una comparación textual de consultas como prueba.

Gateway publicado en `45ade9373`, revisión `00050-wlk`, tráfico 100%, v2 ON. Primera producción Greenhouse: PR 229/main `741e3a045`, orquestador `34272151054` success, manifest released y watchdog 5/5 sin deriva. El [dossier de publicación](TASK-1844_PRODUCTION_RELEASE_2026-09-08.md) conserva SHAs, digests, flags y límites.

## Evidencia productiva añadida

| Caso | Resultado y evidencia |
| --- | --- |
| Expand/contract | PASS: migrations `20260908184942851` y `20260908194829159`; CHECK 1/2 validado, trigger inmutable, sólo índice versionado, historia conservada. `CONTRACT_APPLY` / `CONTRACT_WRITER_READBACK` |
| Cohorte y fixtures | Perfil interno exacto, A/B autorizadas y C denegada; command canónico con expiry y ownership, sin módulos de gasto; nueve filas finalmente inactivas, cero overrides y discovery nativo de 14 organizaciones sin fixtures |
| Codex / Claude Code | Consentimiento v2, base-only, paginación, A/B, C/invalid y A posterior PASS; Codex también missing. Eventos reales por cliente; cero llamadas no cuenta |
| Concurrencia | PASS: eventos nativos A/B y test SDK intercalado; la UI hospedada por sí sola no acredita solapamiento |
| Refresh v1 | PASS: Codex renovó después del flip sin elevarse; control posteriormente retirado |
| Refresh v2 nativo | PASS: Codex después del expiry original; Claude renovación anticipada y A/B posteriores al expiry original. `NATIVE_V2_REFRESH_LEDGER` y eventos por cliente |
| Revocación selectiva nativa | PASS: B denegada dentro de 20.008 s Codex / 14.208 s Claude desde inicio de mutación, A accesible, restaura sin reconectar |
| Contexto/familia | PASS: proceso Claude abierto deniega A/B con JWT vigente tras revocar contexto; Codex familia revocada rechaza initialize/refresh, cero dispatch. Nuevas conexiones operativas |
| Claude hospedado | Consentimiento v2, 21 tools y nueve llamadas reales PASS. `CLAUDE_HOSTED_MATRIX`; familia CIMD compartida por web/Desktop, no DCR run-owned |
| Revocación selectiva hospedada | PASS: B deny/A allow observados dentro de 56.025 s desde inicio de mutación; restauración A/B PASS, sin reconectar |
| Claude Desktop | PASS: 1.46388.4, dos payloads A/B tras actualizar catálogo; comparte familia hospedada, no se cuenta como OAuth independiente. `CLAUDE_DESKTOP` |
| Refresh/global hospedados | PASS: renovación 20:57:38Z después del expiry 20:57:23Z; misma familia/contexto/base. Revocación del contexto 20:58:34.897Z con JWT válido hasta 21:12:38Z hace que A/B requieran autenticación. Familia antigua retirada y conexión nueva A/B PASS. `CLAUDE_HOSTED_REFRESH`, `CLAUDE_HOSTED_GLOBAL_REVOCATION`, `CLAUDE_HOSTED_RECONNECTED` |
| Rollback/restore | PASS con límite cliente: OFF/revisiones compatibles, denegación real, restore/health/PG conservados. Codex recupera la misma familia; Claude Code exige login y nueva familia tras OFF. Ronda needs-auth y cero tools se conserva sin contarse como dispatch. `ROLLBACK_RESTORE` y JSON por cliente |
| Compatibilidad CIMD | Fix reproducido red/green; metadata extendida registra sólo grants soportados, JWT bearer sigue rechazado. Revisión adicional rechaza whitespace; OAuth 150 passed/0 skipped, build/types y pre-push pasan |
| Regresión externa/Entra | PASS acotado: sin widening; sólo conexión hospedada Claude del canary retirada bajo excepción expresa. Legacy conserva scopes AllPrincipals preexistentes |
| Observabilidad | HTTP gateway: 123 POST, sin 5xx, p95 mixto 1467.852 ms; incluye initialize y errores intencionales, no es p95 del reader. Sentry issues API 200 sin eventos visibles; Explore 403 por scope de credencial, no se amplía acceso |

## Cierre productivo y retiro

- PR 230/main `45f6910e3`: CI `34279119607`, Deep `34279119795` y Playwright `34279847615` success sobre el SHA exacto.
- Orquestador [34281143424](https://github.com/efeoncepro/greenhouse-eo/actions/runs/34281143424) success; manifest `45f6910e3ae3-418c7895-89ad-4373-a21e-34a8bfe91929` released a las 21:44:22Z. [Runtime final](TASK-1844_FINAL_RUNTIME_2026-09-08.json), [manifest](TASK-1844_FINAL_RELEASE_MANIFEST_2026-09-08.json) y [watchdog](TASK-1844_FINAL_WATCHDOG_2026-09-08.json): cinco workers sincronizados, cero deriva/faltantes, health público 200.
- Vercel `dpl_2uGoEoujQLnsnR8UogFye5x9JjSL` sirve el SHA main exacto. Auth `00048-4vq` y Ops `00671-jj8` conservan `76ed9ca20`, árbol íntegro idéntico a main; sus rutas no cambiaron. Los otros tres workers sirven `45f6910e3`. Gateway `00050-wlk` conserva `45ade9373`. Readback servido 21:45:09Z.
- [Clientes definitivos](TASK-1844_FINAL_CLIENTS_2026-09-08.json): Codex discovery/A/B, Claude Code A/B y Claude hospedado A/B con tres familias v2/base activas. La primera ronda nativa final tuvo cero tools por resolución DNS local transitoria; se conserva y excluye. DNS recuperado sin cambiar registros ni credenciales, repetición nativa exitosa: [observación](TASK-1844_FINAL_DNS_OBSERVATION_2026-09-08.json).
- [Retiro verificado](TASK-1844_FIXTURES_RETIRED_2026-09-08.json): command canónico 21:45:39Z; PG 21:48:48Z confirma nueve filas inactivas, cero overrides/módulos/usuarios. Codex lista las 14 organizaciones autorizadas sin A/B/C y deniega A/B; canary externo aún responde `no_entitlement`, sin gasto. Se conservan las conexiones internas definitivas.
- Preflight final: once checks OK y excepción batch explícita por contract ya aplicada; conserva `degraded`/`readyToDeploy=false`. [Auditoría](TASK-1844_FINAL_RELEASE_AUDIT_2026-09-08.json) registra la excepción declarada en manifest/transiciones; no acredita por sí sola el mapeo humano de GitHub.
- Gates finales: `task:lint`, `ops:lint --changed`, router `qa:gates` auth/integration/runtime/release/docs, `docs:closure-check` y último `docs:context-check:strict`. El router QA es un diagnóstico de riesgo; la evidencia de pruebas y runtime está separada arriba.

## Conditional Follow-Ups

1. Medir latencia/error rate del snapshot en runtime antes de ampliar la cohorte; presupuesto 4 s / reader 5 s.
2. Mantener rollback sólo hacia writer compatible después de contract; conservar historia v1/v2.

## Integridad de evidencia

- Código, UI Connected, respuestas del modelo y HTTP 200 no equivalen a dispatch exitoso. Se leen eventos o Request/Response/Error reales.
- Rondas nativas sin tools y Desktop con catálogo antiguo quedan excluidas; no se imputan al gateway.
- La revocación/restauración de B fue una mutación controlada: la especulación del modelo sobre inestabilidad no es evidencia.
- El control v1 y familias revocadas permanecen como historia; nuevas familias activas no se retiran por confusión de ownership.
- `internal_revoked_still_dispatching` global y p95 exclusivo del reader no se declaran cero/medidos. Ampliar cohorte exige observabilidad proporcional; baseline de transporte general tiene dueña TASK-1843.
- El reader de manifest no rellena URL/revisiones/health en esta fila; no se infieren desde campos vacíos. Readbacks independientes de Vercel, Cloud Run y watchdog acreditan esos estados.
