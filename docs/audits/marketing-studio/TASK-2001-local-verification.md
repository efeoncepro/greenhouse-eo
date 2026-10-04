# QA Release Audit - TASK-2001

## Verdict

BLOCK para cierre operativo; implementación local verificada.

Closure state: code complete, rollout pendiente (Studio). El puerto owned HubSpot de Greenhouse y el carril delegado de TASK-2003 siguen pendientes: no se declara completa la integración ni se mueve TASK-2001 a complete.

## Scope

- Studio: migraciones aditivas, contratos/registro/manifiesto, commands/readers, tracking, evidencia, adapters y jobs, compatibilidad/import, API. UI aprobada de TASK-2002 usada como contrato; no se implementó ni cambió.
- Greenhouse: task/plan, arquitectura, skills espejo, manuales/artefacto servido, ledger de flags y handoff. CLI HTTP existente verificada sin modificar su código.
- Entorno: Postgres 18 descartable en loopback, todas las migraciones aplicadas; Studio production build local en loopback. Sin credenciales, consultas o escrituras a proveedores reales.
- Excluidos: cambios ajenos de AXIS, línea gráfica, SEO TASK-1690 y ai-generations presentes en el checkout compartido. Sin push, CI remoto, deploy ni migraciones remotas.

## Risk Classification

| Risk | Level | Why |
| --- | ---: | --- |
| Aislamiento y autoridad | Alto | Evidencia/cuentas por organización; persona obligatoria en confirmación, slug y backfill. Negativos probados. |
| Datos y coexistencia | Alto | Import no debe reescribir planes ni evidencia; cinco migraciones aditivas, legacy conservado y probado con flags ON/OFF. |
| Evidencia externa | Alto | Fechas observadas/confirmadas nunca inferidas del plan; URL 200 sola no publica. Proveedores reales todavía sin canary. |
| Tracking y reintentos | Alto | Snapshot congelado, revisión de ambos recursos, dry-run y replay sin duplicados. |
| Integración/runtime | Alto | Flags OFF, bindings, endpoint HubSpot, scheduler y federación pendientes; tests locales no prueban despliegue. |

## Injected Skills

- `efeonce-marketing-studio`: fronteras del producto, API-first, runtime y documentación en Greenhouse.
- `software-architect-2026` y `efeonce-mcp-platform`: dominio, comandos reutilizados, registro, paridad y superficie delegada.
- `greenhouse-task-execution-hook`: preflight con goal confirmado; sin develop ni subagentes.
- `efeonce-public-site-wordpress`: lectura pública; el delta generaliza al CMS/sitio owned del cliente, no al sitio de Efeonce.
- `greenhouse-secret-hygiene`: entorno local aislado, token en archivo 0600, sin credenciales remotas ni tokens en evidencias.
- `greenhouse-documentation-governor` y `greenhouse-qa-release-auditor`: cierre proporcional, evidencia y límites explícitos.

## Evidence

### Slices y commits locales

| Corte | Commit Studio | Resultado antes de avanzar |
| --- | --- | --- |
| Schema + Always On | `39a74c0` | 255 tests + 7 gates; migración up/down/up real |
| Commands/estados | `78205fb` | 259 + 7; PG real, dry-run, replay, revisiones y ocho estados |
| Descubrimiento/evidencia | `af608a8` | 264 + 7; fixtures externos + PG real, migración frescura reversible |
| Readers/calendario/avisos | `9bc974e` | 264 + 7; filtros, permisos, zona local, previews exactos y convivencia |
| Delta blog | `acdf30f` | 268 + 7; fecha humana, fallback público y draft Notion; up/down/up |
| Tracking | `946fda4` | 273 + 7; determinismo, destino, auto-tagging, slug y freeze; up/down/up |
| Backfill/CLI/contrato final | `4094da0` | 276 + 7, build, seis fixtures legacy y CLI contra PG real |

Greenhouse `3316eb2d7` preservó el primer delta del operador y `e26a29d62` registró avance. El delta adicional de SV360/clúster/gate quedó preservado por el otro chat en `3b5c97091`; no se sobreescribió ni se incluyó en el alcance de código de esta task.

| Gate | Result | Evidence |
| --- | --- | --- |
| `pnpm check` Studio | PASS | 276 Vitest + 7 tests de gates, typecheck/lint/paridad/manifiesto; todos los carriles de PG habilitados, cero skips |
| `pnpm build` Studio | PASS | Build de producción local con entorno saneado; no carga credenciales de proveedores ni sube sourcemaps |
| Migraciones | PASS | `1791149145299`, `1791149983810`, `1791150800150`, `1791151430000`, `1791151780000`: up/down/up en PG local; base limpia adicional con todas las up |
| Integración backfill | PASS | Seis posts fixture conservan IDs/origen/fechas, no se activan automáticamente; apply/replay, revisión/persona, precarga y convivencia/import ON/OFF |
| CLI Greenhouse HTTP real | PASS | 31 checks: 2 preparación, 25 operaciones/negativos, 4 paginación/lectura; mismo servidor local compilado + PG real |
| `pnpm studio:test` Greenhouse | PASS | 18 tests de CLI |
| `vitest run src/mcp/greenhouse/__tests__/skill-manifest.test.ts` | PASS | 34 tests del manual servido |
| API/manifest | PASS local | API 1.7.0, 75 tools / 80 operaciones; hash `d9f5db8f7729255d59921dd591c2f9963f0abe8a637bf288c235fceb6fd1ccc2` |
| Documentación focal | PASS | task:lint TASK-2001 sin errores/avisos, skills:mirrors, mcp:skills:check, closure estricto sobre paths propios, flags strict sin Vercel y context-check:strict |
| Ops/QA router | PASS con límites | ops:lint --changed sin errores; 13 avisos históricos de child-parity en otras epics. qa:gates focal es advisory, no sustituye las pruebas anteriores |

La CLI ejercitó plan dry-run/apply/replay, lectura/listado, edición, reprogramación, link/unlink, precarga y creación desde ejecución, cancelación, calendario, atención, posts y páginas distintas de cuentas. Probó rechazo de organización ajena y de bearer de servicio en las tres operaciones que exigen persona. Detectó y permitió corregir schemas de entrada que hacían obligatorios los defaults de Zod: OpenAPI y MCP ahora usan `io: input`. No se añadió una excepción en la CLI.

Pruebas de proveedor usan fixtures y clientes controlados, no cuentas reales. La confirmación personal se probó con el command/kernel y PG real; por HTTP se probó el rechazo del servicio, no un login de persona inexistente.

Para repetir la suite Studio, usar cinco bases locales descartables y definir `STUDIO_IT_PG_URL`, `STUDIO_ACTIVATIONS_IT_PG_URL`, `STUDIO_CHANNEL_IT_PG_URL`, `STUDIO_CHANNEL_SEED_IT_PG_URL` y `STUDIO_CHANNEL_CONCURRENCY_IT_PG_URL` antes de `pnpm check`. No reutilizar la base con fixtures persistentes de la CLI: IDs de campañas pueden colisionar con fixtures de integración. Los logs de esta corrida están temporalmente en `/tmp/studio-task-2001/`; esta tabla es la evidencia durable, no contiene tokens.

## Blockers

1. Endpoint owned de emails Greenhouse, identidad de consumer, binding org/portal y canary HubSpot: adapter consumidor implementado en Studio; dueño de datos todavía no entregado/configurado. Config ausente falla cerrado. No se promete email operativo.
2. Migraciones/config/deploy/scheduler y bindings de proveedores requieren rollout autorizado; no se aplicaron remotamente. Cinco flags/configs constan en el [runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md#candidato-local-task-2001--2026-10-04).
3. Backfill de los seis posts reales requiere revisión personal; sólo se migraron fixtures locales. `scheduled_post` no se retira en este corte.
4. TASK-2003 debe entregar autoridad HTTP delegada y federación con canary MCP real. Registrar todas las tools no acredita que el gateway productivo ya las sirva. Coordinación enviada con commits, hash y ownership liberado.

## Conditional Follow-Ups

1. Dossier SEO/AEO, SV360 «Estimado» con fuente/fecha, prompts por clúster, gate consultivo y medición GSC/AI Visibility Grader/GA4: follow-up backend-data sin ID reservado; no bloquea TASK-2001.
2. Retiro contract de `scheduled_post` sólo después de readback/backfill y release estable; [registro de migraciones diferidas](../../tasks/pending-migrations/README.md).
3. TASK-2002 consume `activations`, `executionTools` y `activationItems` aditivos y los commands del registro. Las pantallas aprobadas no prueban la UI implementada.

## False-Closure Traps Checked

- Tests verdes pero runtime ausente: explícito; TASK continúa in-progress.
- UI screenshot/capture absent: no hubo implementación UI; referencias aprobadas `60ef4e26c`, renders v32 blog, sólo para contrato.
- Env/flag/redeploy/backfill pending: defaults OFF/[]/{}, sin inspección ni cambios remotos; rollback por flags OFF, sin eliminar evidencia.
- Docs/task lifecycle drift: status real, checks locales y pendientes separados; delta del usuario preservado y follow-up sin nuevo ID.
- Sentry/observability not verified: worker_run, frescura/health y eventos probados localmente; no se afirma ausencia de incidencias ni canary productivo.

## Final Call

El código de Studio y su operación por CLI están verificados localmente y listos para revisión en commits por slice. No corresponde declarar TASK-2001 operativa ni cerrada: faltan el puerto owned de Greenhouse, el carril delegado de TASK-2003 y el rollout/backfill/canary autorizados. No hubo push.
