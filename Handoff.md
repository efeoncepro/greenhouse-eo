# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

**Globe, 2026-09-03:** caller externo pausado; protección deploy sólo local, sin commit/push/deploy.
Platform debe promoverla y medir ahorro. Reactivación/evidencia:
[runbook TASK-1807](docs/operations/creative-studio/GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md).

**EPIC-044 (2026-09-03) — authorization server PROPIO, decidido por el operador; WorkOS descartado.** ADR aceptado
`docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`; epic `in-progress` con TASK-1626/1631/1813 y las
nuevas TASK-1828…1834 (runtime · OAuth/CIMD/tokens · personas sin contraseña · gateway multi-issuer · canaries · pentest ·
convergencia login). Emisor como segundo host del front door del gateway (≈ USD 15/mes medidos). DNS `auth.efeonce.org` →
`34.111.78.237` creado y verificado. Excepción EPIC-027 para `services/auth-server` **APROBADA** por el operador (Build Unit
ADR Delta 2026-09-03, fila Accepted en DECISIONS_INDEX); **TASK-1828 EN EJECUCIÓN (sesión Claude greenhouse-eo-a3, `/implement-task 1828`, 2026-09-03/04)**: Slice 0 (KMS HSM `auth-server-es256` v1 + SA) y Slice 1 (schema `greenhouse_auth`, `src/lib/auth-server/keys`, `services/auth-server`, workflow, gates; commit `765ff0ca7`) HECHOS; token real firmado por HSM y verificado con el JWKS de PG. Slice 2 HECHO: `https://auth.efeonce.org` vivo (cert ACTIVE; rev `auth-server-00002-gfh`, `AUTH_SERVER_ENABLED=true`): `/readyz` 200 (postgres/kms/activeKey ok), JWKS publicado; rotación ejercitada (KMS v2 activa, v1 `retiring` — retiro pendiente tras 1 h: `pnpm auth-server:rotate-key --retire VjbDUgwc5bd1zj5olC8VndMXKk_G60tLF8xRw945nI8` + `gcloud kms keys versions disable 1`); `tofu apply` en `efeonce-mcp` `6a144a5` (pusheado), allowlist + orquestador + señales `auth.*` + runbook. Producción del emisor = `code complete, rollout pendiente` (release control plane). Otra sesión tiene WIP sin commit de TASK-1631 (`src/lib/identity/external-access/`, `reliability/registry.ts`, `event-catalog.ts`, entitlements): no acoplar; señales del emisor se agregan después de que ese WIP se commitee. Task ui-ux de login sin ID hasta
tener wireframe/flow reales. Siguiente ID libre `TASK-1835` / `EPIC-045`.
**TASK-1631 (U04) Slice 1, 2026-09-04 — code complete, rollout pendiente.** Binding aplicado en PG, dominio
`src/lib/identity/external-access/**`, rutas admin, reader del gateway `GET /api/platform/ecosystem/identity/binding` y 4
señales; smoke `pnpm identity:external-access:smoke`. **Staging verificado 2026-09-04** (develop `02dc5d987` pusheado coordinado con TASK-1828): 4 señales en `/api/admin/reliability`, rutas admin 200, lane ecosystem 401 sin consumer. **Próximo paso:** release a `main` junto con TASK-1828 (decisión del operador); luego TASK-1831.
Paridad registry↔catálogo roja por 11 capabilities ajenas sin seed (task aparte).

Maggie/María Fernanda: cierre 4/4, unresolved=0; agosto ready. Método documentado en runbook/manual y
skills Payroll/Talent Codex/Claude; Finance histórico pendiente de conciliación. [Evidencia 03/09](docs/audits/payroll/MAGGIE_MARIA_FERNANDA_OFFBOARDING_CLOSURE_2026-09-03.md).

Valentina (03/09): misma persona/usuario/member, correo nuevo y elegibilidad SSO verificados; login
interactivo no probado. Último día anterior 30/05/2026, EO-CENG-0001 ending; EO-CENG-0002 activo desde
20/08, bruto mensual 530.973 (450.000 líquidos). Agosto 12/31: EO-CPAY-0002 pending_readiness,
neto 174.193,55, única falta boleta; sin obligación/orden nueva. Recuperación y evidencia abajo.

TASK-1349 **EN PRODUCCIÓN + recovery aplicada** (2026-09-03; release `62356c9b7fd4`, run `33779259694`, flag
`WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` ON prod+staging). Recovery por los commands canónicos, autorizada
en chat: **Felipe** revisado `relationship_ended` con causal `termination` declarada por el operador → approved →
scheduled → executed; member inactivo, compensación cerrada al 02/06, mayo `full_period`, junio `exclude_from_cutoff`,
julio+ `exclude_entire_period`. **Luis Reyes y María Camila Hoyos**: lifecycle cerrado (relación employee terminada
al LWD real, member inactivo) y stubs SCIM cerrados como `access_only`. Snapshot inicial, sustituido por el cierre Maggie/María Fernanda de arriba: unresolved **1** (Maria Fernanda,
draft 07-29, decisión manual de HR), executed_member_still_active **0**, deprovisioned_without_case 0.

🔴 **«Colaboradores fantasma» (2026-09-03 ~17:50Z, resuelto):** la pre-nómina de septiembre mostró seis
`Colaborador <uuid>` sin contrato: sujetos sintéticos de mi live test con compensación abierta, que `derivePolicy`
trataba como salida decidida (`identity_only` ejecutado → `full_period`). Compensaciones cerradas por command,
`hasDecidedExitFact` ya excluye `identity_only`, el live test limpia al terminar; fix en PR #220 (`main`).

**Valentina Hoyos — restauración gobernada APLICADA por Codex a las 18:38:48Z:** member activo/status activo,
asignable y sin corte antiguo; asignación existente activa sin fecha final. Se verificaron alias Production hacia
`a824d073` y 100% del tráfico `ops-worker-00641-dl2` hacia el árbol corregido antes de aplicar. Las siete categorías
protegidas (relaciones, engagements, envíos, payables, usuario, obligación y orden) siguen idénticas; SSO elegible con
correo nuevo y rol collaborator. Clave `valentina-lifecycle-reentry-restore-2026-09-03`; no repetir ni usar el SQL retirado.
Eventos publicados 18:40:03Z y People completado 18:42:05Z; employee cerrado y datos protegidos idénticos.
**Release cerrado:** `33795564223` success, manifest `a824d073a5fb-c2cf99e9-1ba1-40b3-9d85-76ad0a8e8372`
released 19:30:49Z, health success y watchdog ok/4 de 4 workers. Dos intentos anteriores fueron abortados por
cancelaciones concurrentes; Claude se retiró y Codex cerró bajo un solo operador. La auditoría conserva el incidente
independiente de matching SHA/run ID. Readback final: recuperación y siete categorías protegidas intactas.
[Auditoría](docs/audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md) ·
[runbook](docs/operations/runbooks/workforce-reentry-recovery.md).
Finance de Felipe (obligación junio + SII) sigue como dependencia sin command de anulación. UI: TASK-1814.

**Delta Claude 19:40Z — PR #220 CERRADO por Codex** (run `33795564223`, manifest released 19:30:49Z; ver arriba).
Attempts 1 y 2 `aborted` por cancelaciones cruzadas: el webhook empareja por `target_sha` antes que por
`workflow_run_id`, así que cancelar un run duplicado aborta el manifest ajeno (bug a tasquear). **Purga sintética
APLICADA 18:37Z:** 12 members `TASK-1349 live …` (253 filas, `scripts/workforce/purge-task1349-live-subjects.sql`);
265→253 members, 8 activos, reales. Barrido documental 20:10Z + [TASK-1815](docs/tasks/to-do/TASK-1815-release-webhook-reconciler-run-id-matching.md).

Offboarding: la [auditoría inicial](docs/audits/payroll/OFFBOARDING_ROOT_CAUSE_AND_REMEDIATION_2026-09-03.md)
es antecedente, no estado vigente. [TASK-1349](docs/tasks/in-progress/TASK-1349-offboarding-member-lifecycle-writeback.md)
conserva pendientes Finance; [TASK-1814](docs/tasks/to-do/TASK-1814-offboarding-case-review-recovery-ui.md) posee
la UI aún sin implementar. No repetir las recoveries cerradas para probar ese recorrido.

Cierre documental 03/09: tres subagentes sincronizaron Workforce/Talent, Contractors/Finance y Release/QA;
root integró identidad, arquitectura, tareas e índices. [Cobertura y límites](docs/audits/payroll/VALENTINA_DOCUMENTATION_SKILLS_CLOSURE_2026-09-03.md).
Bug independiente de correlación de releases por SHA/run ID sigue pendiente; el runbook documenta mitigación
con un coordinador y lectura de intentos/eventos, sin declararlo corregido.

Seguimiento OAuth (2026-09-02): [TASK-1813](docs/tasks/to-do/TASK-1813-efeonce-mcp-oauth-client-interoperability.md)
creada `to-do`, sin implementar. Codex 0.152.0 rechazó discovery; metadata pública revalidada a las 22:51Z.
La [auditoría](docs/audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md) identifica scopes sin cualificar
al apagar shim, fallback de deploy que lo reactiva y canary directo que no prueba discovery. El plan B histórico
de abajo no basta sin esos gates. Próximo paso: plan humano aprobado y coordinación con dueños de archivos;
no push/deploy ni mutación de Entra autorizados por esta creación. Incidente Git/Berel separado.

## 2026-09-03 — EPIC-043: Payroll confiable y operable desde chat

[EPIC-043](docs/epics/to-do/EPIC-043-payroll-reliability-and-agentic-api-parity.md), `to-do`, P0: doce tasks
TASK-1816–TASK-1827, con contratos y dependencias por unidad. Por instrucción del operador, TASK-731/1214/1215/730
quedaron `complete` por supersesión documental hacia TASK-1820/1821/1825/1827; sin certificar implementación.
TASK-1625/ISSUE-129–134 conservan trazabilidad; OAuth TASK-1813 e identidad TASK-1631 son dependencias compartidas.
Primer paso: plan y ADR acotado de TASK-1816, cálculo atómico/aprobación de versión.
[Baseline](docs/audits/payroll/PAYROLL_RELIABILITY_API_PARITY_PROGRAM_BASELINE_2026-09-03.md).
Sólo planificación/documentación; sin código, migraciones, envíos, pagos ni deploy.

## 2026-09-03 — TASK-1806 seguimiento: alerta Teams determinista + rutina de recordatorio del cutover ETV

Después del cierre `complete` de TASK-1806 (ver entrada debajo, release `bda12be7e33a`), el operador preguntó
quién vigila la señal `seo.etv_methodology.drift` — hoy sólo es pull vía `/admin/operations`, nadie se entera
si no lo abre. Autorizado en chat ("las 3 formas de vigilar"), se desplegaron dos capas nuevas: (1) cron
`ops-seo-etv-drift-watch` (Cloud Scheduler, diario 12:00 America/Santiago, sin flag) que llama
`checkAndAlertSeoEtvMethodologyDrift()` (`src/lib/growth/seo/etv-methodology/drift-alert.ts`), lee la señal
existente sin tocarla y avisa a Teams sólo si `severity=error` — endpoint `POST /seo/etv-methodology-drift-watch`,
dispatcher `sendManualTeamsAnnouncement`, destino nuevo `growth-seo-reliability-alerts`
(`src/config/manual-teams-announcements.ts`), mismo canal físico "EO - Admin" que `production-release-alerts`.
Commit `79a1c3f74` en `develop`. Verificado en vivo (revisión `ops-worker-00637-2ww`): llamada real respondió
`{"severity":"warning","alerted":false}` — correcto, hoy es `warning` no `error`. 6/6 tests verdes. (2) Rutina
`trig_015zxhP1D4yXfTacUm5HqmQU`, dispara una vez el 2026-09-17 13:00 America/Santiago tras la primera captura
improved desatendida, sin credenciales locales: sólo recuerda verificar manualmente, no ejecuta verificación real.

## 2026-09-03 — TASK-1806 COMPLETE: Improved ETV en producción (release `bda12be7e33a`), rebaseline versionado

Cuarto release del día: PR #218 squash (`main=bda12be7e33af93906805054146c5e17a8b9c328`, 12:42Z), orquestador
`33758619690` (13:01→13:14Z, un solo run, sin retry; los DOS gates `production` aprobados a 13:04:26Z/13:04:57Z),
manifest `released` (`bda12be7e33a-4bb99ca1-8077-451a-9611-5929f933a990`), watchdog `ok`, 3/4 workers en el
target y ops-worker change-gated en `d2ebdb8f3` (diff de árbol completo = sólo el ledger de flags). **Canary de
contrato 13:15:26Z:** lanes prod `domain-overview`/`url-visibility` de Berel sirven
`etvMethodology.version=improved_layout_clickstream_v2` `single_methodology`; `/health` del worker
(`00636-h6w`) improved en escritura y lectura; `/api/auth/health` 200. Vercel Production+staging con ambos
selectores improved (valores verificados por `env pull`); staging con cutover y **drill de rollback** ejercitado
(legacy → improved, 3 redeploys).

**Decisión:** el shadow (USD 1,095) mostró improved 6× mejor calibrado contra GSC en Berel (err. rel. 49 % vs
321 %), Jaccard 1,0 e historia continua; el operador aprobó `go_rebaseline` y el cutover. Rebaseline acotado:
historia improved de Berel 2025-09..2026-09 y de Comex 2025-09..2026-03 (backfill USD 0,2568, sembró 14 filas);
la de julio 2026 en adelante es `fully_recomputed`, antes `calibrated_approximation`; `breakpointDate=null`.
Efeonce se mide aparte (su org/CL/GSC); guard en `assertEtvShadowCohort` para que un bulk nunca mezcle
organizaciones; cohorte v2.

**Riesgos abiertos / pendientes con dueño:** (1) señal `seo.etv_methodology.drift` en `warning` hasta que las
filas contractuales del 27-29/08 salgan de la ventana de 7 días (≤ 2026-09-05); el cron del 16/17 será la
primera captura improved DESATENDIDA del worker — si escribiera otra cosa, es incidente. (2) Berel verá sus
cifras de tráfico estimado ≈ −60 % por cambio de fórmula, no por pérdida real: comunicarlo. (3) Sujetos sin fila
improved degradan `not_available_for_method` hasta su próxima captura (subfolder/url de Berel el día 17).
(4) Rollback a legacy sólo antes del 2026-11-01T00:00:00Z (selectores + deploy.sh + redeploy). Sin push de
docs de cierre hasta este commit; WIP ajeno en el árbol intacto.

## 2026-09-03 — Berel: cobertura temática y minería solicitadas por el operador

Fecha local 2026-09-02. [Estrategia](docs/operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md) y skills
Berel/SEO-AEO/DataForSEO sincronizadas; Playbook Notion ampliado y confirmado por nueva lectura.
[Research](docs/audits/seo/BEREL_CAPILLARY_KEYWORD_MINING_2026-09-02.md): 14 runs succeeded,
1.517 keywords distintas, 13 SERPs, 52 PAA, costo US$1,23572. 27 intenciones propuestas; 60 keywords
representativas revisadas, el resto del CSV es triage explícito. El tutorial público de baño aparece
#2 en SERP fuera de los 49 cuerpos del Hub: no crear duplicado. Priorizar elección/protección/aplicación.
Ese corte describe discovery, no las ediciones posteriores en Notion. Continuidad 2026-09-03: N29 pasó
a Berelex Semibrillante tras Wiki/página/PDF; tutorial, ALT paso 3, ficha N2 y nota de tarea releídos.
Artes y copies sociales aún pendientes; no asumir paquete aprobado ni publicación Drupal. La skill
incorpora [control técnico y QA](docs/audits/seo/BEREL_TUTORIAL_GUARDRAILS_2026-09-03.md) para futuras piezas.
Etiquetado: [auditoría](docs/audits/seo/BEREL_PIECE_COUNT_CLASSIFICATION_2026-09-03.md), 51 correcciones
Notion releídas (formato/canal/tipo), sin otros cambios. Nov/dic: 65 tareas visuales por mes, no archivos
ni entregas; rollups numéricos no expuestos por MCP. Operador confirma solo etiquetas, sin migración.
Relectura oct–dic: 221 tareas, 196 visuales etiquetadas y 25 principales excluidas; sin nuevas escrituras.
Skills espejo exigen tipo/canal desde la creación y en QA. Histórico fuera de esos meses y N31 pendientes.
Distribución selectiva: [auditoría y continuación](docs/audits/seo/BEREL_SELECTIVE_SOCIAL_DISTRIBUTION_2026-09-03.md).
Playbooks/skills y matrices de 17 slots + principales actualizados; 34/34 releídas e historial intacto.
Aplicación terminada: 193 páginas modificadas releídas, 128/128 registros sociales; octubre excluido. Cupos 8 artículos de 3.000–5.000 palabras,
50 gráficas y 3 videos/mes (cortesía mayo–octubre extendida a nov/dic). Operador confirmó: las 50
incluyen blog/RRSS; superficies Blog/Facebook/Instagram/Pinterest. Priorización N52→Navidad aprobada:
4 banners N52 Cancelada sin etiquetas de reserva, historial intacto; 4 banners y 2 sociales N59 creados.
Conteo vivo + briefs: 50 gráficas + 3 videos/mes (41/44 tareas estáticas); N45/N46 En curso, N50/N54 con gates.
Siguiente paso: conciliar derivados/assets de N29 y mantener bloqueos de sistemas no validados.
Commit local solicitado del trabajo editorial propio; sin push/cambio de branch/release.
Cambios ajenos de SEO y OAuth preservados; este trabajo no resuelve ese incidente Git/MCP.

Corrección de numeración verificada: [mapa y readback 179/179](docs/audits/seo/BEREL_EDITORIAL_NUMBERING_2026-09-03.md).
Noviembre N43–N51 (Navidad adicional), diciembre N52–N59; números de párrafos/auditorías anteriores
son históricos. Módulo 16 en skills espejo; no renombrar archivos ni reutilizar IDs por número.
Complemento autorizado: el método SEO/AEO y DataForSEO excluido de `1fcc2ade3` se incorpora por separado:
referencia 09 de minería, routers/espejos, priorización §2.3, brief, manual y funcional; sin nueva compra ni push.

## 2026-09-03 — TASK-1805 en producción: la fórmula detrás de `etv` es identidad del hecho, todavía legacy

Tercer release del día (`5ec4cf769977-18572878-583b-43f0-aad0-01eb7b394aba`, run `33698245254`, target `5ec4cf76997722d5ae31621808b5ae967602bf0a`, PR #217): manifest `released`
00:20:29Z, watchdog `ok`, 3/4 workers en el target y ops-worker change-gated en `57abe3f1e` (diff de árbol
completo vacío: el `push:develop` ya lo había desplegado). Dispatch con bypass forense por `cloud_release`
(`deploy.sh`), sin runs quemados; coordinado con `Task-1804` para no pisar su release #216 (freeze de ~25 min).

**Verificado en producción (00:22Z):** lanes `domain-overview` y `url-visibility` de Berel MX sirven
`etvMethodology` (`legacy_static_v1`, evidencia `contract_default_pre_cutoff`, corte `2026-11-01T00:00:00Z`);
`/health` del ops-worker → `configuredWriteSource: env`, `policyVersion: etv-policy.v1`. Selectores
`GROWTH_SEO_ETV_METHODOLOGY_VERSION`/`_READ_` = `legacy_static_v1` en Vercel Production+staging (horneados por el
build del release) y en `deploy.sh`. Gateway `efeonce-mcp` con el manifest sincronizado desplegado
(`efeonce-mcp-gateway-00029-bwg`). `TASK-1805` → `complete/`.

**Riesgos abiertos / pendientes con dueño:** (1) el **contract** de schema sigue parqueado en
`docs/tasks/pending-migrations/TASK-1805-etv-methodology-contract.sql.pending`; su condición de 7 días sin filas con
evidencia contractual empieza a correr con este release y es precondición 4 de `TASK-1806` — sin él la coexistencia
legacy/improved por sujeto/día sigue cerrada a propósito. (2) La señal `seo.etv_methodology.drift` queda en
`awaiting_data` hasta la primera captura explícita del worker (cron `ops-seo-domain-overview`, día 16); si tras ese
run sigue en `awaiting_data`, el worker no está escribiendo evidencia explícita — investigar, no esperar.
(3) Improved ETV, shadow pagado, decisión histórica y cutover: **sólo `TASK-1806`**, con presupuesto aprobado.
Evaluador dry-run listo: `scripts/growth/_sanity-task-1805-etv-evaluator.ts`.

## 2026-09-02 (9) — DCR quedó deprecado en MCP `2026-07-28`: el shim de `mcp.efeonce.org` se mantiene, con dos hallazgos que la evaluación no buscaba

Evaluación de impacto pedida por el operador, **sin migración**. Verificada contra la spec en vivo.
Ya en producción vía release `375f56e24187` (commits `7788c8626` + `b4135f287`, verificados por blob
contra `origin/main`). **Cero cambios de código.**

**Veredicto:** el shim DCR sigue siendo correcto y no por inercia. La spec retiene DCR *"for backwards
compatibility with authorization servers that do not support Client ID Metadata Documents"* — que es
literalmente Entra, que no soporta **ni CIMD ni RFC 7591**. El shim es pre-registro (prioridad 1 de la
spec) por el único canal que los clientes MCP estándar consumen sin configuración manual. Earliest
removal de DCR: primera revisión publicada en o después de **2027-07-28**.

**Hallazgo estructural:** *"migrar el gateway a CIMD" no existe como trabajo.* CIMD es capacidad del
**authorization server**; el nuestro es Entra y el gateway **espeja** `authorize`/`token` en vez de
proxearlos. Soportarlo exige emitir los tokens = el broker de `TASK-1631`, cuyos invariantes **ya** lo
exigían al proveedor. No se abrió task paralela; esta evaluación es insumo de esa task.

**🔴 Riesgo más cercano que la deprecación, en la misma revisión:** la página nueva *Authorization
Server Discovery* (no existía en `2025-11-25`) exige `issuer` **idéntico** al identificador usado para
construir la well-known URL. **Los nuestros difieren** desde que el shim existe. Funciona sólo porque
los clientes todavía no lo aplican — empírico, no garantizado. **No se parchea** reclamando issuer
propio: rompería la validación `iss` de RFC 9207, que hoy pasamos *porque* espejamos el de Entra.

**Dos hallazgos que salieron de coordinar con otras sesiones, no de la evaluación:**

1. *Confused deputy* (aporte de `greenhouse-eo-1e`, adoptado a medias tras verificar): la letra del
   `MUST` no ata —no reenviamos— y el modo de la cookie de consentimiento quedó **refutado** leyendo
   `src/app.ts`. Pero el riesgo está por construcción: `client_id` estático compartido +
   `http://localhost` **sin puerto** + consentimiento cacheado por Entra = un proceso local toma un
   código en silencio. Acotado a lectura porque ese cliente **no lleva scopes de escritura**.
2. *La etiqueta miente:* `32617b87-…` se llama **"Efeonce MCP Local Canary Client"** siendo el cliente
   compartido de producción; el canary real es `66985833-…`. Quien lee "Local Canary" y asume radio de
   juguete es quien no auditará las redirect URIs.

**Plan B declarado, sin ejecutar:** si un cliente endurece cualquiera de las dos validaciones antes del
broker → pre-registro puro (apuntar `authorization_servers` a Entra, apagar `OAUTH_PUBLIC_CLIENT_ID`
—el shim ya está gateado por esa env— y `client_id` manual por usuario).

**Pendiente con dueño:** renombrar el cliente en Entra y decidir sobre las redirect URIs — **NO**
angostando `http://localhost` a secas, que es el loopback que Claude Code necesita. Opcional para quien
formalice `TASK-1654`: publicar `client_id_metadata_document_supported: false` explícito.

**Deuda de proceso, ajena a la task:** el worktree de esta sesión nació de `origin/main` (1490 commits
detrás de `develop`) porque `origin/HEAD` apunta a `main`. Le pasó igual al worktree
`busy-shirley-80edbf` del 2026-08-27. Fix propuesto y **no aplicado** (decisión del operador):
`git remote set-head origin develop` + borrar ambos worktrees.

## 2026-09-02 (8) — El release `375f56e24187` quedó huérfano y se recuperó; `main` vuelve a tener manifest

La promoción `develop→main` del 2026-09-02 entró a `main` por el PR #215 a las `20:51:04Z` (726 archivos,
1490 commits, 2 migraciones) y quedó **sin manifest de release**: la sesión que la promovía fue archivada por
accidente antes de dispatchar el orquestador. Un commit en `main` sin manifest es exactamente la condición que
la regla dura del control plane prohíbe dejar abierta, así que otra sesión lo retomó con autorización directa
del operador y cerró el ciclo.

Cierre: run `33683893124` **completed/success** en 11m50s, `release_id`
`375f56e24187-546f452b-c60f-4617-9974-9c87760c3ab9`, máquina de estados completa
`preflight → ready → deploying → verifying → released`. Los DOS gates `production` se aprobaron con 34 s de
diferencia (sin el stall del gotcha #6). Único bypass: `release_batch_policy`, inevitable por las 2 migraciones
—dominio irreversible por precedencia del clasificador, donde el marker `[release-coupled: …]` no aplica—, con
razón citando un hecho verificado y no un adjetivo: `migrate:status` en dry-run reporta cero migraciones
pendientes contra la única instancia Cloud SQL.

Verificación runtime, con la trampa del día atajada: el `ops-worker` cerró con un **skip de 51 s** y sirve
`c4c838dea9d1`, no el target. Se verificó con el **diff de árbol completo** (43 archivos, 5 de código, tres bajo
`src/mcp/**`) y con `pnpm worker:deploy-path-gate`, que confirma que los 1451 archivos del bundle caen bajo
prefijos declarados y que `src/mcp` no es uno: ese código lo sirve Vercel, que sí desplegó el target. Skip
legítimo. El watchdog reportó `data_missing=4`, que **no es drift**; la lectura autoritativa fue
`pnpm release:workers`: 3/4 workers en el target, `Ready=True`. Canary de contrato del lane MCP `skills` verde
**después** del `released`.

Flags: se prendió `GROWTH_SEO_SITE_FINDINGS_ENABLED` en el ops-worker con los dos pasos (revisión activa
`ops-worker-00631-jfw`), tras probar por blob que el evaluador desplegado es idéntico al de `main`. Quedan
pendientes sus verificaciones post-flip (3) y (4). La cadencia `ops-seo-keyword-discovery-drain` quedó
reconciliada: `main` ya declara `*/2`. **No** se prendió `HIRING_FAIRNESS_MONITOR_ENABLED`: su condición de
retiro sigue vigente hasta `TASK-1365` y prod carece de la policy row de privacidad, así que daría cero en
silencio en una métrica de equidad.

Aprendizaje operativo del día: **dos sesiones recibieron el mismo mandato y ninguna verificó peers vivos antes
de arrancar.** La colisión se detectó porque `origin/main` ganó un commit entre dos comandos consecutivos. Nadie
tocó el control plane durante el solapamiento. Regla que queda: anunciar no es coordinar — hay que preguntar con
`ListAgents` y esperar respuesta antes de tocar el árbol.

## 2026-09-02 (7) — Salesforce ya tiene oferta canónica y task de landing, sin implementación

La práctica Salesforce quedó canonizada por outcomes y lifecycle en cuatro fases: `Diagnose & Architect`,
`Implement & Integrate`, `Activate & Adopt` y `Operate & Evolve`; seis solution lanes cubren Revenue/Sales,
Service, Marketing/Lifecycle, Data/Identity/Consent, Agentforce/Automation y Experience/Integration/Analytics.
El mapa previo conserva el routing de producto y separa CRM, Marketing Cloud Engagement y Marketing Cloud Next.

Se registró `TASK-1812` para convertir esa oferta en una landing pública `Universo conectado`. Ya existen dirección
visual, wireframe 1440/390, flujo installed-base/evaluation y motion contract. Efeonce lidera; Salesforce aporta
reconocimiento referencial. Nubes/agentes son originales y cualquier logo, badge, screenshot, mascota o claim de
partnership queda bloqueado hasta rights y readback contractual. `TASK-1404` sigue dueña de la comparación HubSpot
vs Salesforce.

Estado honesto: documentación y contrato UI listos; no hay implementación, WordPress postId, CMS save, publicación,
cache purge, indexación, conversión ni live readback. La ejecución empieza con Discovery/VoC/SEO/rights/runtime,
continúa con un first fold `noindex` y se detiene para `ACCEPT FIRST FOLD` antes del below-fold.

## 2026-09-02 (6) — ANAM recibe un cierre documental premium y un soporte acotado a tres meses

El cierre de Emma quedó consolidado en dos entregables externos de cinco páginas: especificación técnica y guía
funcional. El sistema visual usa Poppins para display y Geist para lectura; Efeonce predomina como proveedor,
HubSpot aparece como partnership y ANAM como cliente. Los PDF son el master de envío, los HTML/CSS la fuente
editable y diez capturas rasterizadas la evidencia de revisión. Todos los pies incluyen sitio, correo, teléfono y
dirección de Efeonce. Las versiones Word supersedidas quedaron fuera del paquete versionado.

El correo para Óscar, María Paz, Pablo y Marco quedó listo, pero **no enviado**. Explica el rediseño de la landing,
la corrección generativa del bordado `ANÁLISIS AMBIENTALES S.A.`, la identidad live de Emma, la matriz de handoff,
las tres pruebas E2E y las validaciones humanas todavía pendientes. La captura final de la landing también quedó
versionada como adjunto. El SharePoint consolidado es un compromiso para esta semana y permanece pendiente hasta
verificar el enlace compartido.

El soporte quedó explícito para Customer Agent y KPI: **tres meses, del 2026-08-13 al 2026-11-12 inclusive**.
Cubre incidentes, correcciones, dudas operativas, comportamientos inesperados, recuperación de configuración y
documentación derivada de una corrección. No cubre nuevas funcionalidades, KPI, workflows, automatizaciones,
integraciones, rediseños ni innovación; toda evolución requiere alcance y aprobación separados. Este cierre sólo
actualiza documentación y entregables; no mutó HubSpot, no envió correo, no creó SharePoint y no hizo push.

## 2026-09-02 (6) — TASK-1804: el manual de uso viaja por el protocolo — code complete, rollout pendiente

Tres slices en Greenhouse (`ec89014e4`, `12c0ea85d`, `5a6ae57f4`) y uno en `efeonce-mcp` (`c588a1b`,
**local, sin push**: `main` auto-despliega a Cloud Run). Manifiesto de manuales
(`src/mcp/greenhouse/skill-manifest.ts`) + reader canónico + tres `SKILL.md` en `docs/mcp/skills/`
escritos de cero para el consumidor MCP; tool `get_greenhouse_skill` (44 tools en el artefacto),
recurso `skill://efeonce/<name>/SKILL.md`, lane `/api/platform/ecosystem/mcp/skills[/{name}]` con
404 anti-oráculo para bindings no-internal; las `instructions` rutean al manual en vez de contener
el procedimiento. Test de fuga sobre todo `docs/mcp/skills/**`. `next.config.ts` declara los `.md`
como `outputFileTracingIncludes` (primer uso en el repo).

🔴 **Pendiente de runtime, en este orden:** (1) push de `develop` y verificar la lane en staging con
binding real — `count` **exactamente 3**, cuerpo con frontmatter, `404` inexistente, `401` sin token,
catálogo `[]` + `404` con binding de cliente; (2) release a producción y repetir; (3) push del commit
local de `efeonce-mcp` → deploy de Cloud Run → `scripts/greenhouse-seo-canary.mjs` (ya trae los
asserts de skills). Sin Entra, flag ni secreto nuevos. `pnpm build` de producción no se corrió en
local (cuelga la máquina): lo prueba Vercel o se corre con autorización.

⚠️ El guard de paridad del gateway está anclado al dominio SEO y no veía una tool `platform`: nació
`EXPECTED_GREENHOUSE_PLATFORM_TOOLS` + `computeFederatedNonSeoToolFindings` (test con regresiones).

**Actualización (misma task, más tarde ese día):** el SHA `eed9992d5` rompió el build de staging —
*"api/mcp/greenhouse is 397.29mb (limit 250mb)"*. No era el tamaño de los manuales (el glob resuelve 3
archivos; `@vercel/nft` traza la ruta en 2,6 MB): una ruta con `outputFileTracingIncludes` propio deja de
agruparse y su función sola supera el techo. Se cerró la clase: `skill-catalog.generated.json` generado desde
`docs/mcp/skills/**` con `pnpm mcp:skills:generate`, gate `pnpm mcp:skills:check` en `local:check` y CI,
hashes re-verificados al cargar, cero `fs` en runtime, tracing retirado de `next.config.ts`.
🔴 **Decisión del operador: sin release a `main` en esta ventana; sólo el gateway.** `efeonce-mcp`
`c588a1b` desplegado (revisión `efeonce-mcp-gateway-00028-pmx`, CI + Deploy Cloud Run success, front door
200/200/401). Consecuencia declarada: `get_greenhouse_skill` responde `not_found` desde producción hasta que la
lane llegue a `main`. Pendiente: lane verificada en staging con el SHA nuevo de `develop` + canary del gateway
contra staging.

**Cierre de la ventana (verificado):** el build de staging `greenhouse-jr9hmjido` quedó **Ready** con
`4620875eb`: la causa real era el análisis estático de `fs` de Turbopack (no nft ni el tracing) —
`skill-catalog.ts` conservaba `readdirSync`/`readFileSync` alcanzables desde tres rutas y Turbopack incluía el
proyecto entero (397 MB). Todo `node:fs` vive ahora en `skill-catalog-fs.ts` (sólo generador y tests).
**Lane verificada en staging** con el binding interno del consumer del gateway: `count=3` exacto, ETag/304,
tres cuerpos byte-idénticos al artefacto, `404` inexistente, `401` sin token; canary del provider del gateway
contra staging 5/5. Contra producción el gateway responde `not_found` (la lane espera el release). Pendientes
reales: release `develop→main` (decisión del operador) y el camino de negación con binding de cliente en
runtime. ⚠️ `4620875eb` arrastró archivos que otra sesión tenía en el índice compartido (`mcp-craft/**`,
`.claude/rules/mcp-tool-surface.md`); esa sesión lo registró en `bd112e66a`.

**Cierre definitivo (21:27Z):** la lane salió a producción en el release `375f56e24` (release_id
`375f56e24187-546f452b-…`, run `33683893124`, llevado por `greenhouse-eo-ac`); canary de contrato contra
producción post-`released` verde (count=3 exacto, cuerpos byte-idénticos, ETag/304, 404/401, provider del
gateway 5/5). TASK-1804 → `complete`. Sin evidencia runtime: `tools/call` por el front door OAuth (login
Entra interactivo) y la negación con binding de cliente (sin consumer de cliente con token).

**Higiene Entra (21:40Z):** el cliente PKCE público `32617b87…` dejó de llamarse "Local Canary Client" y ahora es
"Efeonce MCP Public Client (Claude Code, claude.ai, Claude Desktop)"; sólo `displayName`, readback con redirect
URIs y scopes intactos. Queda abierta la revisión del loopback `http://localhost` sin puerto (ADR del gateway).

**Follow-up (22:10Z):** (a) evidencia por el front door: `claude mcp login efeonce-mcp` → `✔ Connected` y un
agente `claude -p` en sesión nueva llamó `get_greenhouse_skill` por `mcp.efeonce.org` con token Entra real, listó
el catálogo y resumió bien el manual de gasto — cerrado el único hueco de evidencia. (b) El catálogo pasa de 3 a 6
manuales, todos SEO federado (`seo-discovery-to-tracking`, `seo-technical-health`, `seo-prospect-diagnostic`); la
`description` de la tool no cambia (nombra el manual de gasto y remite al catálogo), así que el gateway no se
redespliega: los nuevos aparecen tras el release. Hiring/Globe quedan fuera: sus tools no están en el manifiesto de
Greenhouse y el contrato de manuales sólo gobierna ése. Techo "revisar al pasar de 6" alcanzado: la próxima adición
particiona por dominio.

**Segundo release del día (23:19Z), llevado por esta sesión:** PR #216 → `4379c495013f`, run `33693657365`
success, release_id `4379c495013f-2493cf4b-…`, manifest `released`; canary post-released: catálogo `count=6`,
cuerpos byte-idénticos, 304/404/401, provider del gateway 6/6; watchdog ok, 4/4 workers (ops-worker
change-gated con diff de árbol vacío). Incluyó TASK-1805 Slices 1–3 (sin flag; migración expand ya aplicada,
único bypass) y la reconciliación de **10 commits que `cesargrowth11` empujó directo a `main`** (skill Berel,
22:06–22:10Z) por cherry-pick + `-s ours`. Playbook gana el anti-patrón #15. Ledger de tiempos actualizado.

**Barrido documental por subagentes (23:45Z):** dos agentes actualizaron lo que el cierre manual no cubría —
`api-platform-ecosystem.md` (lane de manuales), `efeonce-mcp-gateway.md` (provider `greenhouse-skills`, 36 tools),
arquitectura API Platform (delta), ADR del gateway (delta provider + guard no-SEO), patrones canónicos (segundo
uso del patrón manifiesto+artefacto+hash), `docs/api` (pointer), arquitectura SEO §7 (manuales obligatorios por
task), manuales de uso del inventario/gateway/provider SEO, doc funcional SV360 por MCP, skills
`dataforseo-operator` y `seo-aeo-practice` (espejadas), README y AGENTS del repo `efeonce-mcp` (cifras 28/36/6).
Regla auto-cargada `.claude/rules/mcp-tool-surface.md` gana el invariante de manuales.

## 2026-09-02 (5) — TASK-1784: el eval de selección MCP refutó su propia hipótesis, y eso es el entregable

Se midió la selección de tools SEO antes de tocar una descripción: **tool 94.5% / mercado 98.2% / gasto 100%**
sobre 55 preguntas de operador en los cinco mercados productivos, con piso de ruido cero (dos corridas
idénticas). Después se probaron cuatro variantes de descripción, cada una determinista.

🔴 **Los bloques de ruteo `Use when · Prefer X if · Do NOT use for` NO mejoraron la selección de tool.** La
banda 92.7–96.4% no tiene dirección, y una variante hizo regresar a `prepare_seo_grounded_queries`, una tool que
nadie tocó: alargar siete descripciones degrada la selección de sus vecinas. Se aplicó la variante SIN bloques.

Lo que sí movió el número fue corregir dos afirmaciones falsas. La cláusula de mercado decía *"pass market when
the organization has more than one"* —una instrucción de elegir—, y el modelo la obedecía justificándose con
*"the operator is in Santiago"*: `ISSUE-152` en su propio razonamiento. Ahora nombra la clase de señal que NO es
una declaración. **Mercado 98.2% → 100%.** Tool bajó a 92.7% y se reporta sin declarar mejora: su regresión es
léxica y ninguna descripción le gana al nombre de su propia tool.

**Hallazgo lateral, el más caro:** al hacer que el guard de paridad comparara `description`, aparecieron
**21 de 27 tools federadas ya divergentes** — el gateway servía, entre otras, la instrucción que causa
`ISSUE-152`. Se cerró **derivando** el texto del artefacto (`greenhouseToolDescription`) en vez de copiarlo.

✅ **Gateway desplegado.** `mcp.efeonce.org` corre la revisión `efeonce-mcp-gateway-00027-6pj` desde el commit
`3d09e152`, con la postura intacta (`internal-and-cloud-load-balancing` + invoker `allUsers`), `health=200` y
`/mcp` desafiando 401. En ese commit hay **cero** ocurrencias de la instrucción vieja. Lo que NO se verificó:
leer el `tools/list` servido exige login Entra interactivo y no es automatizable — la cadena
commit→imagen→revisión es fuerte, pero no reemplaza leer el texto servido.

⚠️ **Corrección: la "otra superficie" NO existe.** Se afirmó acá que la ruta `/api/mcp/greenhouse`
(Vercel) seguía sirviendo las descripciones viejas. Es **falso**: su token
`GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN` no existe en ningún environment (`vercel env ls`) y la ruta responde
`404 — "Greenhouse MCP remote gateway is not configured."`, comprobado en vivo contra staging. No sirve
texto viejo porque no sirve nada. **El gateway era la única superficie MCP viva y ya está corregida.**

`develop` empujado (`0a68d92c`) con los 9 workflows en `success` — CI, Playwright E2E smoke y los cuatro
deploys de workers Cloud Run incluidos. Producción queda pendiente del release `develop→main`, que no
cambia nada servido por MCP. Único seguimiento real: `seo_provider_spend_daily` a 7 días — la disciplina de
gasto dio 100% en el eval, pero eso se confirma en la factura, no en la medición.

## 2026-09-02 (4) — Globe queda en hibernación profunda, reversible y documentada

Por decisión del operador, Globe dejó de consumir trabajo productivo mientras todavía no genera ingresos. El
estado live verificado a `2026-09-02T10:30:38Z` es: Cloud SQL `globe-pg` `STOPPED/NEVER`; schedulers Producer,
Media y Governance `PAUSED`; cero ejecuciones activas; API `00216-wmm` y Studio `00150-m2m` listas, con
`minInstances=0` y `GLOBE_PRODUCTIVE_LANES_ENABLED=false`. Se preservaron el disco SQL con deletion protection,
backups/PITR, 10 buckets, 17 secretos, Artifact Registry, servicios/jobs, IAM, front door, budgets,
observabilidad y Terraform. Ningún apply destruyó o reemplazó recursos; el post-plan quedó `No changes`.

El Terraform de `efeonce-globe` gobierna ahora `active -> draining -> hibernated`. `draining` es obligatorio en
ambos sentidos: mantiene SQL encendido mientras publica y verifica revisiones fail-closed. Un primer apply dejó
una revisión API sin startup al apagar SQL demasiado pronto; la revisión anterior conservó tráfico, SQL se
restauró temporalmente y se corrigió la secuencia antes del stop final, sin pérdida de datos.

Baseline previo: ~CLP 348.152 netos/30 días. Residual hibernado modelado: CLP 20.000–30.000; reducción modelada:
CLP 318.000–328.000. No es ahorro realizado hasta Billing Export a 24 h, 7 días y cierre mensual. Encender de
nuevo requiere autorización explícita de gasto y seguir sin saltos
`docs/operations/creative-studio/GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md`: `hibernated -> draining`, integridad y
readback no facturable, luego `draining -> active`; ante falla se vuelve primero a `draining`.

Las skills espejo `greenhouse-globe` y `greenhouse-globe-model-fleet` ya bloquean deploys, migraciones,
generaciones, canarios y promociones mientras el estado siga hibernado. El ledger de modelos conserva evidencia
histórica de integración, pero deja explícito que `available` no significa ejecutable durante la hibernación.

## 2026-09-02 (3) — cada task ETV/cluster incluye tools y skills MCP

Las nueve tasks de la secuencia (`1805`, `1806`, `1312`, `1313`, `1314`, `1808`–`1811`) declaran ahora un
`MCP Tools & Skills Contract` exigible. Cada una debe crear o actualizar tools, lane ecosystem,
manifest/artefacto, federación o exclusión razonada y las skills `dataforseo-operator`/`seo-aeo` espejadas. Si el
registro de skills servidas de `TASK-1804` existe al ejecutarla, también actualiza ese recurso agent-facing.

Las tools read no compran datos on-read. Writes o gasto siguen bajo capability fina,
`propose → confirm → execute`, presupuesto, idempotencia y audit; el cliente PKCE público nunca recibe write
scope. El cierre requiere canaries allow/deny/fault y readback real del gateway. Cambio documental solamente:
sin código, tools creadas, gasto, deploy ni runtime mutation todavía.

## 2026-09-02 (2) — cinco endpoints Labs sin caller quedan repartidos en cuatro tasks

El operador confirmó que quiere usar las cinco familias que `TASK-1805` había dejado
`provider_supported_not_enabled`. Se registraron bajo `EPIC-022`: `TASK-1808` Category Market Intelligence
(`categories_for_domain` + `domain_metrics_by_categories`), `TASK-1809` SERP competitor market SoV,
`TASK-1810` Page Intersection y `TASK-1811` Historical Bulk. Todas son backend-critical, nacen sin UI y exigen
Improved ETV explícito, persistence append-only, reader/API/MCP y gates de gasto/rollout.

La taxonomía de DataForSEO es evidencia externa: nunca reemplaza ni crea `seo_topic_clusters`; cualquier binding
usa `propose → confirm → execute`. `TASK-1314` conserva cero provider calls y compone los readers de 1808/1810.
El runtime actual sigue con cero callers para estos cinco endpoints. Registrar las tasks no implementó código,
schema, llamadas, gasto, flags, deploy ni cutover. Próximo ID libre: `TASK-1812`.

## 2026-09-02 — DataForSEO confirma el corte irreversible de Improved ETV

La respuesta contractual de DataForSEO cerró las preguntas de `TASK-1805/1806`: 14 familias ETV-capable,
sin premium por improved, históricos recomputados completamente desde julio de 2026 y aproximados antes mediante
el ratio de julio por dominio. El corte global es `2026-11-01T00:00:00Z`; desde entonces `false` se ignora y no
existe fallback legacy. La respuesta no trae formula version, así que el contrato interno usa método solicitado,
instante UTC, policy version y método efectivo derivado.

`TASK-1805` queda P0 sin blocker contractual, target interno 2026-10-15. `TASK-1806` sube a P0 deadline-bound:
shadow/decisión objetivo 2026-10-23 y cutover 2026-10-28T00:00:00Z. El repo llama nueve familias: seis familias/
siete caminos consumen ETV, tres callers lo ignoran bajo guard y cinco familias permanecen no habilitadas.
Rollback legacy sólo existe antes del corte; después el safe mode congela capturas y sirve la última serie
coherente. Esta actualización fue documental: no hubo código, schema, llamadas, gasto, flags, deploy ni cutover.

## 2026-09-01 (16) — Emma distribuye handoffs por intención y disponibilidad

El Customer Agent `Emma` del portal ANAM `19893546` quedó conectado al workflow activo `1876744588`. La matriz
publicada es cotización/nuevo negocio: Pablo Puga → Maria Paz Haeger; seguimiento: Marco Jiménez Venegas → Pablo
Puga; Calidad, facturación y otros: Maria Paz Haeger → Marco Jiménez Venegas. El copy al visitante permanece
neutral.

La primera prueba pública (`48103382175`) encontró dos defectos: Emma ya era propietaria del ticket y bloqueaba
las asignaciones sin sobrescritura; además `PRUEBA QA INTERNA` sesgó el clasificador hacia Calidad. Se restauró
temporalmente el handoff directo a María Paz, se agregó el borrado de owner antes de la ramificación y se reforzó
el prompt para ignorar metadatos de prueba. Después se reactivó y reconectó el workflow.

La regresión E2E pasó con tickets reales de QA: `48103069613` cotización → Pablo; `48105602378` seguimiento →
Marco no disponible → Pablo; `48094218332` Calidad → María Paz. Los widgets mostraron los propietarios finales,
los action logs terminaron correctamente y los chats de prueba quedaron cerrados. Readback final: workflow activo,
sin problemas y seleccionado por Emma. Evidencia: `docs/audits/ANAM_CUSTOMER_AGENT_HANDOFF_E2E_QA_2026-09-01.md`.

La documentación separa ahora trigger, asignación y continuidad. La QA demostró routing y owner visible, pero no
una respuesta humana ni una segunda reasignación en el mismo chat. En live handoff, el owner humano puede
reasignar manualmente el ticket mientras el chat siga abierto; el workflow vigente no resuelve nombres escritos
libremente. No se requirió ADR: se documentó el comportamiento existente sin modificar runtime, ownership ni
arquitectura.
