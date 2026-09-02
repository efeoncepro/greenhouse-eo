# Greenhouse Reliability Control Plane V1

> Spec canónica del `Reliability Control Plane` de Greenhouse EO. Define el registry por módulo, el modelo unificado de señales, el contrato de evidencia y cómo `Admin Center`, `Ops Health` y `Cloud & Integrations` consumen la lectura consolidada sin duplicar fuentes.
>
> Versión: `1.17`
> Estado: `vigente`
> Creada: `2026-04-25` por TASK-600
> Última actualización: `2026-09-02` por TASK-1805 (signal de drift de metodología ETV cross-runtime bajo el módulo `growth`)

## Delta 2026-09-02 — TASK-1805: `seo.etv_methodology.drift` (configurado vs. solicitado, Vercel + ops-worker)

Una señal nueva bajo el rollup `growth` (`kind='drift'`, **steady = 0**), reader
`src/lib/reliability/queries/seo-etv-methodology-drift.ts` (en `filesOwned`). Cubre un plano que ninguna
señal veía: DataForSEO cambia la fórmula detrás del mismo campo `etv` y **no devuelve la versión aplicada**, así
que la única evidencia de qué se pidió es lo que cada runtime persistió (`etv_methodology_version` +
`etv_requested_at` + `etv_policy_version`).

| `signalId` | `kind` | Qué mide | Steady |
| --- | --- | --- | --- |
| `seo.etv_methodology.drift` | `drift` | Lo configurado en este runtime (`GROWTH_SEO_ETV_METHODOLOGY_VERSION`, con `source` env/default) vs. la última request explícita persistida por el **ops-worker** (fotos/visibilidad) y por **Vercel** (prospecto); legacy configurado desde el corte `2026-11-01T00:00:00Z` (safe mode); legacy solicitado post-corte; evidencia contractual reciente junto a explícita (runtime viejo) | **0** divergencias |

Decisiones no obvias: `awaiting_data` mientras no exista evidencia explícita (foundation sin rollout no es
drift); las filas de sanity (`*.invalid`) se excluyen; configuración fuera del vocabulario es `error` sin tocar
la base (la policy ya falla cerrado — acá se ve). El readback complementario vive en `GET /health` del
ops-worker (`etvMethodology`).

## Delta 2026-08-29 — TASK-1700: 3 signals de la cola priorizada de trabajo SEO

Tres señales nuevas bajo el rollup `growth` (`kind='data_quality'`, **steady = 0 las tres**), con sus
tablas en `dependencies` del módulo y su reader en `filesOwned`
(`src/lib/reliability/queries/growth-seo-work-queue-signals.ts`). Cubren un plano que **ninguna señal
SEO existente cubría**: las de hoy vigilan el pipeline de **CAPTURA** (¿llegaron los datos?), y éstas
vigilan si el operador está mirando un **PLAN** válido. Las tres degradan a `unknown` con
`captureWithDomain(error, 'growth')` — no poder leer una señal es indistinguible de una que nunca se
cableó, así que el error se reporta **antes** de devolver.

| `signalId` | `kind` | Qué mide | Steady |
| --- | --- | --- | --- |
| `growth.seo.work_queue.stale_snapshot` | `data_quality` | Targets **elegibles** cuyo plan vigente pasó su `expires_at` — o que **nunca** materializaron uno | **0** |
| `growth.seo.work_queue.origin_degraded` | `data_quality` | Orígenes en `degraded`/`down` dentro del `origin_health_json` del snapshot **vigente** de cada target | **0** |
| `growth.seo.work_queue.score_version_drift` | `data_quality` | Snapshots vigentes calculados con una `priority_score_version` distinta de la activa | **0** |

Cada una tiene una decisión que no es obvia:

- 🔴 **`stale_snapshot`: el denominador son los targets ELEGIBLES, no los que ya tienen snapshot.**
  Contar sólo sobre los que ya tienen cola haría invisible el caso peor —un target elegible que
  **nunca** materializó—, que es exactamente lo que produce el flag prendido en un solo runtime: ese
  modo de falla no deja un snapshot viejo, deja **ninguno**. Por eso la elegibilidad se resuelve
  contra `module_assignments` (`seo_v2` vigente, `status IN ('active','pilot')`) con `LEFT JOIN` al
  último snapshot, y por eso las severidades están invertidas respecto de la intuición:
  `never_materialized > 0` es **`error`** (bug class documentada del ledger de flags) y
  `stale > 0` es **`warning`** (un cron perdido). Con TTL de 26 h sobre cadencia diaria, una corrida
  perdida vence **antes** de que llegue la siguiente — el vencimiento es la forma en que se nota.
- 🔴 **`origin_degraded` es la señal que impide que un plan parcial se lea como completo.** Un origen
  caído **no** produce filas vacías ni ceros: sus filas simplemente **no existen**, así que la
  pantalla se ve perfectamente normal y el operador trabaja sobre una lista a la que le falta
  trabajo. `down` es `error` (un motor que falló); `degraded` es `warning` (suele ser una capacidad
  que esa organización no tiene encendida — discovery apagado, cero competidores declarados). Esa
  distinción es del contrato de los colectores, no del lector: un módulo apagado a propósito no debe
  alertar como una falla.
- 🔴 **`score_version_drift` recibe la versión activa POR PARÁMETRO y no la hardcodea en el SQL.**
  Hardcodearla dejaría la señal verde por comparar contra sí misma después de un bump. Su complemento
  en CI es el test de huella congelada de `score-versions.ts` (`fingerprintPriorityScoreConfig`), que
  detecta el cambio de peso **sin** bump; esta señal cubre el otro lado: una versión nueva desplegada
  cuyos snapshots todavía no se rematerializaron, o sea planes vigentes que dicen una cosa y una
  config que dice otra. Es `warning`, no `error`: comparar recomendaciones de dos versiones distintas
  es un problema de interpretación, no una falla del pipeline.

Las tres leen el snapshot **vigente** por target con `DISTINCT ON (seo_target_id) … ORDER BY
computed_at DESC`, sobre tablas que son append-only por trigger **y** por GRANT — el aggregate no
tiene fila «actual» mutable, así que «vigente» es siempre una derivación de lectura.

⚠️ **Steady 0 hoy es trivialmente cierto**: `GROWTH_SEO_WORK_QUEUE_ENABLED` está **OFF en los dos
runtimes** y el scheduler `ops-seo-work-queue-materialize` **PAUSADO**, así que no hay targets con
snapshot. La primera lectura no trivial de `stale_snapshot` llega con el flip, y su primer valor
esperado **no es 0**: hasta que la primera corrida cubra todos los targets elegibles,
`never_materialized` contará los que faltan. Cualquier valor distinto de 0 después de un ciclo
completo es investigación, no ruido.

Contrato: [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §18
(§18.9 `origin_health_json`, §18.4 versionado del score, §18.10 los tres frenos del carril async).
Task dueña: `TASK-1700` (EPIC-022).

## Módulo `growth` — el gasto de proveedor y su presupuesto (TASK-1696)

Tres señales bajo el rollup `growth` (mismo módulo del registry; `dependencies` incorpora
`greenhouse_growth.seo_provider_spend_daily` y `filesOwned` sus readers). Cubren el plano que hasta
ahora el módulo no observaba: **el dinero**. Las tres degradan honestamente a `unknown` con
`captureWithDomain(error, 'growth')` si su query falla — no poder evaluar el gasto no es evidencia de
que esté sano.

| `signalId` | `kind` | Qué mide | Steady |
| --- | --- | --- | --- |
| `growth.dataforseo.spend_ledger_drift` | `data_quality` | Observaciones de AI Mode del período que le pagaron al proveedor y **no** dejaron llamada contabilizada con `consumer='aeo'` en el ledger. Reader: [`growth-dataforseo-spend-ledger-drift.ts`](../../src/lib/reliability/queries/growth-dataforseo-spend-ledger-drift.ts) | **0** |
| `growth.ai_visibility.observation_yield` | `data_quality` | Rendimiento `succeeded / total` de `provider_observations` en ventana móvil de 30 días, **cortado por proveedor**. Reader: [`growth-ai-visibility-observation-yield.ts`](../../src/lib/reliability/queries/growth-ai-visibility-observation-yield.ts) | — (umbrales de degradación) |
| `seo.provider.cost_over_budget` | `cost_guard` | Organizaciones cuyo gasto **facturado** del mes se acerca al tope de su tier: `warning` al 80%, `error` al 100%. Reader: [`seo-provider-cost-over-budget.ts`](../../src/lib/reliability/queries/seo-provider-cost-over-budget.ts) | **0** |

Notas de contrato, porque cada una tiene una decisión que no es obvia:

- **`spend_ledger_drift` separa dos causas que no son lo mismo.** Un perfil **público sin
  organización** es una ausencia legítima —el ledger tiene FK a `greenhouse_core.organizations` y
  forzar una organización sintética sería peor que el hueco— y sale `warning`. Un perfil **con
  organización** sin llamada contabilizada es un bug del camino de atribución (se le está gastando
  plata a un cliente sin cargarla a su presupuesto) y sale `error`. Compara **conteo de llamadas, no
  dólares**: el `cost` que devuelve DataForSEO es del **batch**, no de la tarea, así que comparar
  montos sería aritmética sobre la unidad equivocada. Declarado en el docstring de la query para que
  nadie la "corrija" mal.
- **`observation_yield` corta por proveedor porque el agregado esconde el problema.** Un 68% global
  se lee como aceptable mientras un proveedor concreto está en 29%. Un proveedor sin observaciones en
  la ventana reporta **`unknown`, nunca 0%**: "no se intentó" no es "salió mal". Límite declarado:
  mide sobre las observaciones que **existen**, así que no ve los pares `(prompt, proveedor)` que
  nunca se intentaron.
- **`cost_over_budget` es detección temprana, no control.** El control duro ya existía
  (`enforceSeoRunEntitlement` bloquea antes de gastar); lo que faltaba era el aviso **antes** de que
  el gate empiece a rechazar corridas con `budget_exhausted`. Sólo mira dólares **facturados**, que
  son los únicos que el gate consume: mezclar los estimados inflaría el consumo con una cifra de otra
  naturaleza. Nueve tasks (`1300`, `1301`, `1302`, `1303`, `1304`, `1308`, `1309`, `1651`, `1664`) la
  citaban como mitigación construida del riesgo #1 del módulo sin que existiera, cada una
  atribuyéndosela a otra.

Ejercitadas contra PostgreSQL real al crearse (`scripts/growth/_sanity-task-1696-signals.ts`): las
tres corren y ya dicen algo — el drift reportó 7 observaciones de agosto compradas desde perfiles
públicos, con 0 de drift atribuible.

Contrato: [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §6/§9/§13
+ [`GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`](GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md) §8.2.1/§15.1/§17.1.
Task dueña: `TASK-1696` (EPIC-022).

## Delta 2026-08-19 — TASK-1739: signal de deriva de la procedencia derivada de una postulación

Una señal nueva bajo `moduleKey='hiring'` (`kind='data_quality'`), que hace observable la única pieza
frágil del modelo de procedencia de datos: la copia. `hiring_application.data_origin` no es un hecho
declarado sino una **derivación denormalizada** que mantiene un trigger `BEFORE INSERT OR UPDATE` desde
sus dos raíces —la persona (`identity_profiles`) y la vacante (`hiring_opening`)—, y es por esa copia
que el desk filtra. Marcar una raíz **no toca la fila de la postulación**, así que el trigger no dispara
solo: el command de marcado (`applySyntheticOriginMarking`) debe provocar la re-derivación en la misma
transacción. Si esa propagación falla o alguien la olvida, la copia queda obsoleta **en silencio** — el
desk sigue mostrando fantasmas ya marcados y el gold set sigue contaminado, sin un solo error visible.
Compuesta en `get-reliability-overview.ts` con `.catch(() => null)`, como el resto.

| `signalId` | Qué mide | Severidad | Steady |
| --- | --- | --- | --- |
| `hiring.data_quality.data_origin_derivation_drift` | Postulaciones cuyo `data_origin` **persistido** difiere del que se deriva hoy de sus dos raíces. Reporta el conteo de postulaciones divergentes y cuántas vacantes distintas tocan. Reader: [`hiring-data-origin-drift.ts`](../../src/lib/reliability/queries/hiring-data-origin-drift.ts) | `0 → ok`; `1-5 → warning`; `>5 → error` | **0** |

Notas de contrato:

- La señal **reproduce la regla del trigger en su propio SQL** (gana el no-real; entre dos no-real gana
  la más protectora) y la compara contra el valor persistido. Es deliberadamente una aserción
  independiente y no una llamada al mismo helper: compartir implementación haría que un error de la
  regla saliera verde a ambos lados. La contrapartida asumida es que la regla vive en dos lugares y
  cambiarla obliga a moverla en los dos.
- **PII-free por construcción**: sólo counts (`drifted_applications`, `affected_openings`). Ni nombres,
  ni correos, ni identificadores de personas — el dominio de candidatos es de PII restringida y una
  señal de observabilidad no es lugar para volcarla.
- La spec de procedencia citaba esta divergencia en su matriz de riesgo con probabilidad `low` y sin
  construir el detector. Es **probabilidad 1 si nadie propaga**: ocurre en cada marcado. Por eso la
  señal se construye, no se anota.
- Remediación: **NUNCA** un `UPDATE` manual sobre `hiring_application.data_origin`. Repara la fila y
  deja intacta la causa —la propagación faltante—, así que la señal vuelve a encenderse en el siguiente
  marcado. Re-derivar por el command de marcado.
- Degrada honestamente a `unknown` si la query falla (`captureWithDomain(error, 'hiring')`): no poder
  evaluar la divergencia no es evidencia de que no exista.

Ejercitada contra PostgreSQL real al crearse: `ok`, 0 divergencias.
Contrato: [`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`](GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
§`Delta 2026-08-18 — Procedencia de datos (TASK-1739)`.
Runbook: `docs/manual-de-uso/hr/operar-procedencia-de-datos-hiring.md`.
Task dueña: `TASK-1739` (EPIC-011), en producción desde `2026-08-19`.

### Inventario del módulo `hiring` (al 2026-08-20)

El módulo acumula **17 señales** emitiendo `moduleKey: 'hiring'`, repartidas en ocho tasks dueñas. Se
deja el inventario explícito porque hasta esta entrega el único delta del módulo era el de TASK-356, que
declaraba 2 señales propias + 2 migradas: quien leyera esta spec para saber qué observa `hiring` veía un
cuarto del módulo real.

| Señal(es) | Task dueña | Delta en esta spec |
| --- | --- | --- |
| `hiring.handoff_blocked_stale`, `hiring.internal_hire_awaiting_onboarding` | `TASK-356` | 2026-07-10 |
| `hiring.candidate_document.retention_overdue`, `storage.asset_scan.open_quarantine` | `TASK-1362` (migradas a `hiring` por `TASK-356`) | 2026-07-10 |
| `storage.asset_scan.signature_freshness` | `TASK-1378` | 2026-08-11 |
| `hiring.talent_pool.integrity` | `TASK-1748` (procedencia) | 2026-08-22 — `facets_without_membership` cuenta **sólo población real**: desde que la projection no materializa personas sintéticas a propósito, una ficha sintética sin membresía dejó de ser un atraso y la señal habría quedado en `warning` permanente. Los contadores de consentimiento y retiro **no** se filtran, a propósito: la procedencia gobierna la visibilidad, jamás el consentimiento. |
| `hiring.assessment.template_module_without_questions` | — (sin task declarada en el reader) | **sin delta** |
| `hiring.assessment.assignment_health` | `TASK-1719` | **sin delta** |
| `hiring.assessment_ai.run_backlog_stuck`, `.provider_failure_rate`, `.abstention_rate`, `.override_delta`, `.orphan_reconciliation` | `TASK-1734` Slice 6 | **sin delta** |
| `hiring.candidate_identity.needs_review_backlog`, `.evidence_coverage_gap` | `TASK-1736` Slice 4 | 2026-08-18 (esta entrega) |
| `hiring.data_quality.data_origin_derivation_drift` | `TASK-1739` | 2026-08-19 |
| `hiring.assessment.access_recovery.rotation_unnotified` | `TASK-1757` | registrada abajo |

Las 8 filas marcadas **sin delta** son deuda documental de este control plane, no señales ausentes del
runtime: todas están wired en `get-reliability-overview.ts` y visibles en `/admin/operations`. Registrar
una señal aquí es parte de entregarla — una señal que nadie sabe que existe no gatea nada.

#### `hiring.assessment.access_recovery.rotation_unnotified` (TASK-1757)

| `signalId` | Qué mide | Severidad | Steady |
| --- | --- | --- | --- |
| `hiring.assessment.access_recovery.rotation_unnotified` | Rotaciones por `secure_link` de las últimas 24 h que debían avisar al candidato y no produjeron fila de `email_deliveries`. Evidencia: `rotations_24h` y `unnotified`. Reader: [`hiring-assessment-rotation-notice-signals.ts`](../../src/lib/reliability/queries/hiring-assessment-rotation-notice-signals.ts) | `0 → ok`; `1-2 → warning`; `≥3 → error` | **0** |

Por qué existe: la señal preexistente `hiring.assessment.access_never_exchanged` joinea contra
`email_deliveries`, y una recuperación por `secure_link` **no produce fila de delivery** (`delivery_id` es
`NULL` por CHECK de schema). El único canal donde la entrega puede fallar en silencio —el operador se
distrae, copia mal, la persona no contesta— era precisamente el que ninguna señal podía ver, por
construcción. Un candidato que no rinde por eso no entra al pool como "no evaluado": entra como ausencia
de evidencia, que se lee de facto como descarte.

Notas de contrato:

- La población se acota a rotaciones con la credencial **todavía viva**: una ya vencida no tiene remedio
  disponible, y contarla dejaría la señal en un número permanente distinto de cero — una señal cuyo estado
  estable no es cero deja de leerse.
- El SQL **excluye los mismos motivos de omisión** que la función pura `decideAssessmentAccessRotationNotice`
  (entrega declarada fallida por el operador, sin correo del candidato, buzón bloqueado por el proveedor):
  una rotación que no debía avisar no es una rotación sin aviso. Hay **test de paridad** sobre
  la unión de motivos ([`hiring-assessment-rotation-notice-parity.test.ts`](../../src/lib/reliability/queries/hiring-assessment-rotation-notice-parity.test.ts)) porque SQL y TS son dos implementaciones del mismo juicio y ya se sabe cómo divergen.
- El predicado de buzón bloqueado sale de la fuente única `provider-block.ts`, que exporta tanto el `Set` de
  estados como sus generadores SQL. **NUNCA** re-escribir el literal.
- PII-free por construcción: sólo counts. El dominio de candidatos es de PII restringida.
- Degrada a `unknown` con `captureWithDomain(error, 'hiring')` si la query falla: no poder evaluar el hueco
  no es evidencia de que no exista.
- Remediación: **NUNCA** insertar a mano una fila de `email_deliveries` para apagarla. El aviso se emite por
  el consumer o no se emite; una fila fabricada borra la única evidencia de que alguien quedó sin acceso.

Contrato: [`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`](GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
§`Acceso al test del candidato`. Task dueña: `TASK-1757` (EPIC-011); flag ON desde `2026-08-20`.

## Delta 2026-08-18 — TASK-1736: 2 signals de la identidad del intake de candidatos

Dos señales nuevas bajo `moduleKey='hiring'` (`kind='data_quality'`), que hacen observable la
canonicalización de la identidad del candidato en el intake público (ADR
`GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1`, §Resilience). Una vigila la **cola
humana** que el automatismo genera cuando deriva fail-closed; la otra vigila que el **write path** siga
dejando su rastro con el flag prendido. Reader único
[`hiring-candidate-identity-signals.ts`](../../src/lib/reliability/queries/hiring-candidate-identity-signals.ts),
compuesto en `get-reliability-overview.ts` con `.catch(() => null)`; cada getter degrada a `unknown` por
su cuenta y el agregador nunca lanza.

| `signalId` | Qué mide | Severidad | Steady |
| --- | --- | --- | --- |
| `hiring.candidate_identity.needs_review_backlog` | Filas de `greenhouse_hiring.candidate_identity_display_audit` con `outcome='needs_review'` (discrepancia sustantiva, conflicto CAS o drift de allowlist) cuya identidad **no** tiene una fila `source='human'` + `outcome='applied'` posterior. Cada una es una decisión humana pendiente: el automatismo derivó fail-closed y nadie resolvió | `0 → ok`; `1-5 → warning`; `>5 → error` (backlog sistemático: o el clasificador deriva de más, o nadie drena la cola) | **0** |
| `hiring.candidate_identity.evidence_coverage_gap` | Applications **del intake público** (`source='public_careers'`) sin fila en `candidate_identity_intake_evidence` con el flag `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` en ON. Ventana: desde la primera evidencia observada, o las últimas 24 h si aún no existe ninguna, con 5 min de gracia por submissions en vuelo. Detecta el silent-skip del write path (el degrade a Sentry existe, pero no debe volverse régimen) | `0 → ok`; `1-3 → warning`; `>3 → error`. Flag OFF `→ ok` explícito, sin consultar la DB | **0** con flag ON |

Notas de contrato:

- **El filtro `source='public_careers'` no es cosmético** (corregido el `2026-08-18`, hallado corriendo
  el canary del runbook). La evidencia sólo la escribe `submitPublicHiringApplication`, así que una
  application `manual` —cargada por un operador desde el desk— jamás puede tener fila, y contarla era un
  falso positivo **permanente**: como la ventana arranca en la primera evidencia y nunca se cierra, cada
  carga manual dejaba la señal en `warning` para siempre. Es el modo exacto de entrenar al operador a
  ignorar la señal que gatea este rollout. Regla general para cualquier señal de cobertura: **acotar el
  denominador a las filas que el write path realmente puede cubrir**, no a la tabla entera.
- Con el flag OFF el estado es `ok` **explícito con nota**, no un hallazgo: no escribir evidencia es el
  comportamiento esperado antes del flip, y la señal ni siquiera consulta la DB.
- **PII-free por hard rule del ADR**: sólo counts (`missing_applications`, `evidence_rows_total`,
  `pending_rows`, `pending_profiles`). Jamás nombres, correos ni el before/after del display name — esa
  PII vive en las tablas restringidas y en la revisión humana local, nunca en observabilidad.
- Remediación del backlog: el command `correctCandidateIdentityDisplayName` (capability
  `hiring.candidate.correct_display`), **nunca** SQL manual; la corrección humana es justamente la fila
  que la señal busca para dar por resuelto el caso.
- El summary de `evidence_coverage_gap` distingue **cero evidencias totales** (flag recién prendido, o
  write path silencioso desde el flip) de **gap posterior a la primera evidencia** (degrade silencioso
  ya en régimen), porque la acción difiere: correr el canary vs. revisar Sentry dominio `hiring`.

Contrato: `docs/architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`
§Resilience. Runbook de rollout/canary: `docs/operations/runbooks/candidate-identity-rollout.md`.
Task dueña: `TASK-1736` Slice 4.

## Delta 2026-08-11 — TASK-1378: signal de frescura de firmas del escáner de malware

Una señal nueva bajo `moduleKey='hiring'` (`kind='freshness'`), hermana de
`storage.asset_scan.open_quarantine`. Existe porque aquella detecta el scanner **caído** —se llena de
veredictos `error`— y esta detecta el scanner **vivo pero ciego**: un ClamAV con firmas viejas responde,
devuelve `clean` y no produce ningún veredicto de error, así que su falla es invisible por definición.
Un scanner con firmas de hace seis meses es peor que no tener scanner, porque nadie lo sabe.

| `signalId` | Qué mide | Severidad | Steady |
| --- | --- | --- | --- |
| `storage.asset_scan.signature_freshness` | Edad de la base de firmas del servicio Cloud Run `clamav`, leída de su `/health` (`clamd`, `signatureAgeHours`). Reader: [`asset-scan-signature-freshness.ts`](../../src/lib/reliability/queries/asset-scan-signature-freshness.ts) | `>168 h → error` (falsa confianza); `>24 h → warning` (`freshclam` chequea cada 2 h, así que a las 24 h algo ya está fallando); `clamd` caído o sin base cargada `→ error`; flag ON sin `ASSET_MALWARE_SCAN_ENDPOINT` `→ error` (fail-closed: toda subida gateada está bloqueada); flag OFF `→ ok` explícito | **`ok`** |

Notas de contrato:

- **La fuente NO es PostgreSQL**, a diferencia del resto de las señales: la edad de la base vive en el
  filesystem del contenedor y sólo el propio servicio la conoce. Se consulta su `/health` con timeout de
  5 s y un ID token OIDC, para no colgar la página de operaciones contra un contenedor lento. Compuesta
  en `get-reliability-overview.ts` con `.catch(() => null)`, como el resto.
- Si no se puede consultar el `/health` (timeout, red, cuerpo no interpretable), degrada a **`unknown`,
  no a `error`**: no poder preguntar no prueba que el scanner esté mal. Quien sí lo probaría es
  `open_quarantine`, que se llenaría de veredictos `error` reales.
- Con el flag apagado el estado es `ok` **explícito**, no un hallazgo: el único escáner activo es
  `structural`, que no usa base de firmas y no tiene nada que envejecer.

Servicio: [`cloud-infrastructure/CLOUD_RUN.md`](cloud-infrastructure/CLOUD_RUN.md) §`clamav`.
Runbook: `docs/manual-de-uso/plataforma/operar-scanner-malware-assets.md`. Task dueña: `TASK-1378`.

## Delta 2026-08-11 — TASK-1685: signal de divergencia menú ↔ puerta del portal cliente

Una señal nueva bajo `moduleKey='identity'` (`kind='data_quality'`), hermana de las dos de
TASK-1678/1679. Existe porque `ISSUE-148` demostró que menú y page guard pueden divergir por **dato**
(no por código): antes del primitive único de visibilidad, el menú aplicaba el rol sobre su lista base
y la puerta aplicaba el módulo contratado — 36 pares divergentes en 8 de 8 usuarios cliente, todos
enlaces muertos. Desde TASK-1685 ambos lados consumen `resolve-client-portal-visibility.ts`, y esta
señal es la aserción explícita de que siguen coincidiendo. Compuesta en `get-reliability-overview.ts`
con `.catch(() => null)`, como sus hermanas.

| `signalId` | Qué mide | Severidad | Steady |
| --- | --- | --- | --- |
| `identity.client_portal.menu_gate_divergence` | Divergencia entre lo que el **menú** del portal cliente ofrece y lo que la **puerta** (`requireViewCodeAccess`) abre, evaluada por usuario cliente activo × superficie guardada del catálogo de navegación. Cuenta tres cosas: enlaces que el menú promete y la puerta niega, superficies alcanzables sólo por URL (el menú las esconde pero la puerta abre — problema de acceso, no de UX), y superficies del catálogo de navegación que **ningún módulo del catálogo comercial vende** (nadie puede alcanzarlas jamás). Reader: [`client-portal-menu-gate-divergence.ts`](../../src/lib/reliability/queries/client-portal-menu-gate-divergence.ts) | `0 → ok`, `>0 → warning`; sube a `error` si hay superficies alcanzables sólo por URL | **0** |

Notas de contrato:

- La rama "menú promete, puerta niega" es 0 **por construcción** desde que ambos lados consumen el
  mismo primitive; se sigue evaluando porque es barata y porque detecta la reintroducción de una
  segunda fuente en el camino del menú. Lo que la señal **no** ve es una regresión a nivel JSX — eso
  lo cubren el test de `VerticalMenu` y el lint `greenhouse/no-client-portal-view-visibility-bypass`.
- Techo de 500 usuarios por corrida; si se alcanza, el summary declara la evaluación como **parcial**
  en vez de reportar un piso como si fuera un total.
- Remediación: **NUNCA** resolver una divergencia agregando el viewCode al catálogo de navegación
  (mueve el problema de lugar). Para superficies que ningún módulo vende hay dos salidas honestas:
  declararlas en el módulo que las vende, o retirarlas del catálogo de navegación y de sus rutas.

Contrato: [`GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`](GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md) §12 +
[`GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`](GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md) §8.2.
Task dueña: `TASK-1685`.

## Delta 2026-08-09 — TASK-1678/1679: 2 signals del carril de acceso del portal cliente

Dos señales nuevas bajo `moduleKey='identity'` (rollup `Identity & Access`, `kind='data_quality'`), que
hacen observable el **carril de acceso** del portal cliente: sesión → vista otorgada → organización →
módulo contratado. Las dos existen porque el carril pasó a **fallar hacia cerrado** (`TASK-1678`): antes
un hueco de seed o de datos se compensaba con un default permisivo, y ahora produce un portal vacío
**sin error visible**. Readers separados, ambos compuestos en `get-reliability-overview.ts` con
`.catch(() => null)`.

| `signalId` | Qué mide | Severidad | Steady |
| --- | --- | --- | --- |
| `identity.view_access.client_role_without_grants` | Roles cliente (`greenhouse_core.roles` con `tenant_type='client'`) sin **ninguna** vista otorgada en `role_view_assignments`. Desde que el default por routeGroup no aplica al carril `client`, el seed es load-bearing: un rol sin grants deja a sus usuarios en un portal vacío. Reader: [`client-role-without-view-grants.ts`](../../src/lib/reliability/queries/client-role-without-view-grants.ts) | `0 → ok`, `>0 → error` | **0** |
| `identity.client_portal.client_without_organization` | `client_users` activos **sin organización resuelta**. Se loguean bien y no pueden abrir NINGUNA página del portal, porque no hay organización contra la que evaluar módulos contratados. Es la señal detrás de `/home?error=organization_unresolved`. Reader: [`client-user-without-organization.ts`](../../src/lib/reliability/queries/client-user-without-organization.ts) | `0 → ok`, `>0 → error` | **0** |

Notas de contrato que valen para cualquier señal futura de este dominio:

- **Los roles cliente NO se enumeran literalmente**: salen por `tenant_type='client'`, así que un rol
  `client_*` nuevo entra a la señal sin tocar el reader. Y **no** por
  `'client' = ANY(route_group_scope)`: el scope es un conjunto y un admin interno que da soporte puede
  incluir `client` legítimamente, lo que arrastraría roles internos a una señal que no habla de ellos.
- `greenhouse_core.roles` **no tiene columna `active`** (verificado contra `information_schema`): no
  agregar un predicado de vigencia sin comprobar primero que la columna exista.
- Los 5 archivos del carril rol→vista (`view-access-store.ts`, `view-access-catalog.ts`,
  `tenant/access.ts`, `tenant/authorization.ts`, `tenant/role-route-mapping.ts`) quedaron declarados en
  `filesOwned` del módulo `identity` del registry — antes no tenían owner pese a ser el gate de acceso
  de toda sesión autenticada, así que sus incidents Sentry no correlacionaban a ningún módulo.

Contrato: [`GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`](GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md) §8.2 (`Delta TASK-1678`) + [`GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`](GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md) §12.2 y §13.

## Delta 2026-07-12 — TASK-1391: 2 signals de la cola de render de artefactos

Dos señales nuevas bajo `moduleKey='commercial'` (`source='proposal_studio'`, `kind='data_quality'`),
que hacen observable el **pipeline de render gobernado** (`greenhouse_commercial.proposal_render_jobs` →
Cloud Run Job `artifact-worker`). Se suman a las 2 de TASK-1392 en el mismo reader:
[`src/lib/reliability/queries/commercial-proposal-signals.ts`](../../src/lib/reliability/queries/commercial-proposal-signals.ts).

| `signalId` | Qué mide | Severidad | Steady |
| --- | --- | --- | --- |
| `artifact.render.queue.starvation` | Render jobs en `queued` (con deadline vivo o sin deadline) hace más de **20 minutos**. El dispatcher corre cada 2 min: 20 min en cola = **dispatcher caído o inanición de prioridad** (la cola prioriza por deadline + aging, nunca FIFO ciega) | `0 → ok`, `>0 → error` | **0** |
| `artifact.render.dead_letter` | Render jobs que llegaron a `dead_letter` en los últimos **7 días** — agotaron `max_attempts` o su `failure_code` no es reintentable. **Requieren humano**: retry del dominio (`POST …/render-jobs/[id]/retry`) o corrección del plan/evidencia y un render nuevo | `0 → ok`, `>0 → error` | **0** |

Ambas degradan honestamente a `unknown` si la query falla (`captureWithDomain('commercial')`). El estado
de negocio del render vive en `proposal_render_jobs`, **no** en Cloud Run: una ejecución exitosa del Job
no implica un render exitoso (un fallo gobernado sale con exit 0 y su `failure_code`).

Spec: [`GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`](GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md) §5.

## Delta 2026-07-10 — TASK-356: módulo `hiring` + 2 signals + migración de señales desde `documents`

Nuevo `ReliabilityModuleKey: 'hiring'` (domain `hr`, `incidentDomainTag: 'hiring'`, prioridad de incident-mapping 18 — por encima de `documents` para que un incident `hiring_*` rutee al dueño del dominio). Señales:

- `hiring.handoff_blocked_stale` (kind `lag`, steady=0): handoffs `blocked` >48h sin resolución; supersede/revocación post-aprobación escala a `error`.
- `hiring.internal_hire_awaiting_onboarding` (kind `lag`, steady=0): handoffs `internal_hire` `approved|in_setup` >72h sin pickup de HRIS/770 (SLA de no perder un hire).
- **Migradas desde `documents` (mismo PR, anti-drift):** `hiring.candidate_document.retention_overdue` + `storage.asset_scan.open_quarantine` (ambas de TASK-1362, candidate docs) ahora emiten `moduleKey: 'hiring'`.

Fuera de alcance por decisión (5-lentes 2026-07-10): `coverage_risk`/`opening_stalled` NO son reliability signals — una vacante sin llenar es estado de negocio (workforce planning / ICO), no falla de sistema.

## Delta 2026-06-28 — Playwright API smoke contract + lane-scoped publishing

El smoke de staging protege contratos funcionales; no debe convertir latencia de un endpoint JSON pesado en falla de producto ni propagar un spec platform/tooling a lanes de dominio no dueñas. La investigacion de los runs develop `fd50bea`, `0bd03e9` y `4a66fc0` encontro que `platform.cron.staging_drift` estaba sano (`count=0`), pero `cron-staging-parity.spec.ts` agotaba el budget al navegar con Chromium a `/api/admin/reliability`.

Contrato vigente:

- Los smoke specs API-only que validan endpoints JSON deben usar el request context autenticado (`getAuthenticatedJson()` en `tests/e2e/fixtures/auth.ts`) en vez de `page.goto()`. El contrato debe validar status `<400`, `content-type: application/json` y tener un timeout explicito acorde al endpoint.
- Los smoke specs de navegacion/UI siguen usando `gotoAuthenticated()` o `gotoWithTransientRetries()`; no se deben mezclar helpers de UI para probar JSON API-only.
- `pnpm sync:smoke-lane <lane-key>` debe filtrar el reporte Playwright compartido por lane antes de computar `total_tests`, `failed_tests`, `flakyCount` y `status` para `greenhouse_sync.smoke_lane_runs`.
- Specs platform/tooling sin ownership de dominio no deben marcar rojos `finance.web`, `delivery.web` ni `identity.web`. Si se agrega un lane nuevo, debe declararse su mapping en `scripts/lib/smoke-lane-report.ts`; lanes desconocidas conservan fallback full-report hasta quedar mapeadas.

## Delta 2026-06-22 — TASK-845: Node 24 app/test/build runtime

TASK-607 resolvio el runtime interno de GitHub Actions; TASK-845 completa el segundo plano: el runtime de app, tests, build y smoke lanes del portal. El contrato vigente del repo es Node.js `24.x` para Greenhouse web runtime, expresado en `package.json#engines.node`, `.nvmrc`, `.node-version` y los workflows que ejecutan app/tests/builds.

Contratos operativos:

- `node-version: 24` es obligatorio en workflows GitHub que ejecutan Next.js, lint/typecheck, tests, Playwright o scripts del repo.
- `package.json#engines.node = "24.x"` es el source of truth portable para Vercel builds/functions; evita depender solo de Project Settings externos.
- `.nvmrc` es el archivo humano canonico local; `.node-version` existe solo como espejo para herramientas compatibles y debe mantenerse en `24`.
- GitHub Actions runtime interno y app runtime siguen siendo planos distintos: actions versionadas (`checkout`, `setup-node`, `upload-artifact`, `pnpm/action-setup`, Google auth/gcloud) deben mantenerse compatibles con Node 24, pero eso no reemplaza `node-version: 24`.
- Cloud Run worker Dockerfiles que usan `node:22-slim` (`services/ops-worker`, `services/commercial-cost-worker`, `services/ico-batch`) son runtime container separado. No bloquean el portal/Vercel y requieren follow-up propio si se homogeneizan.

---

## Delta 2026-06-20 — TASK-1189: signal `finance.ppm.position_drift`

Nuevo signal de drift en el módulo `finance` (línea PPM del F29). PPM es un agregado
(base ventas netas × tasa), sin ledger per-documento, así que el drift se mide a nivel
posición: una `ppm_monthly_positions` cuya `base_amount_clp` almacenada difiere (>1 CLP) de
las ventas netas recomputadas en vivo (`income.subtotal` CLP del período) → la cifra PPM quedó
stale (p.ej. entró una factura a un período ya materializado sin re-materializar). `kind=drift`,
severidad `error` si count > 0, steady = `0`. Reader `getPpmPositionDriftSignal`
(`src/lib/reliability/queries/ppm-position-drift.ts`), wired en `get-reliability-overview.ts`
con degradación honesta. Completa el trío de signals de las 3 líneas del F29
(`finance.vat.position_drift`, `finance.retention.position_drift`, `finance.ppm.position_drift`).

## Delta 2026-06-20 — TASK-1188: signal `finance.retention.position_drift`

Nuevo signal de drift en el módulo `finance` (mirror de `finance.vat.position_drift`):
detecta boletas de honorarios (BHE, `expenses.withholding_amount > 0`) de períodos ya
materializados que no tienen su asiento `counted` en `retention_ledger_entries` — la línea
de retenciones del F29 quedaría incompleta. `kind=drift`, severidad `error` si count > 0,
steady = `0`. Reader `getRetentionPositionDriftSignal` (`src/lib/reliability/queries/retention-position-drift.ts`),
wired en `get-reliability-overview.ts` con degradación honesta (`unknown` si la query falla).
Límite conocido (igual que IVA): documentos con retención y período NULL son invisibles a
este drift — se cubrirían con un signal de data-quality aparte (follow-up).

## Delta 2026-06-17 — TASK-1167: signal `public_site.astro_ci_failed`

Nuevo signal canonical de observabilidad para el repo GitHub del rail objetivo Astro del sitio publico Efeonce.

- `signalKey`: `public_site.astro_ci_failed`
- `moduleKey`: `platform` en V1, rollup operativo Cloud/Public Site hasta que el dominio acumule mas signals.
- `kind`: `runtime`
- Reader: `src/lib/reliability/queries/public-site-astro-ci-failed.ts`
- Fuente: `composePublicSiteGithubControlPlanePacket()` (`public-site-github-control-plane.v1`) y ultimo run `CI` en `main` de `efeoncepro/efeonce-web`.

Severidad:

- latest `CI` en `main` `success` + correlation matched -> `ok`;
- latest `CI` `success` pero deploy va detras/mismatch -> `warning`;
- latest `CI` `failure`/`cancelled`/`timed_out`/`action_required` -> `error`;
- run en progreso, token ausente o GitHub degradado -> `unknown` honesto.

Estado real 2026-06-17: el repo `efeoncepro/efeonce-web` tiene `CI` rojo en `main` (`run_id=27657858751`, SHA `4d050fbf7baf4097684f131d4ac31e1d6148ff02`, `conclusion=failure`). El steady-state del control-plane es reportar `error` hasta que ese CI se corrija fuera de Greenhouse. La signal no ejecuta deploy, rollback ni cutover.

## Delta 2026-06-17 — TASK-1161: signal `public_site.astro_deploy_failed`

Nuevo signal canonical de observabilidad para el rail objetivo Astro/Vercel del sitio público Efeonce.

- `signalKey`: `public_site.astro_deploy_failed`
- `moduleKey`: `platform` en V1, rollup operativo Cloud/Public Site hasta que el dominio acumule más signals.
- `kind`: `incident`
- Reader: `src/lib/reliability/queries/public-site-astro-deploy-failed.ts`
- Fuente: `readPublicSiteAstroBinding()` (`public-site-astro-binding.v1`) y último deployment production de Vercel para `efeonce-web`.

Severidad:

- latest production deployment `READY` -> `ok`;
- latest production deployment `ERROR` -> `error`;
- `BUILDING`/`QUEUED` -> `unknown` honesto;
- sin deployment -> awaiting-data style note, no falso error;
- error del reader -> `unknown` + `captureWithDomain(error, 'cloud', ...)`.

Steady state esperado = production deploy listo y sin error. La signal no ejecuta deploy, rollback ni cutover.

## Delta 2026-06-12 — TASK-1085: Nexa Knowledge retrieval signals

Tres signals canonical bajo `moduleKey='knowledge'` hacen observable el **retrieval de Nexa sobre Knowledge** (TASK-1085, behind flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`). Se leen de `greenhouse_ai.nexa_messages.tool_invocations` (jsonb) — el `KnowledgeRetrievalPacket` ya viaja en `result.raw.packet`, así que **no hay writes nuevos**; un solo scan `jsonb_array_elements` filtrando `toolName='search_knowledge'` produce las métricas de ventana 30 días. Reader: `src/lib/reliability/queries/nexa-knowledge-retrieval-signals.ts`.

- `knowledge.nexa.no_source_answer_rate` (kind `data_quality`): tasa de búsquedas con `confidence='none'` (Nexa respondió gap honesto, sin documentación). Tasa alta sostenida = huecos de cobertura del corpus. Severity: `warning` si rate ≥ 30% **y** volumen ≥ 10 (muestra suficiente), `ok` en otro caso. Coverage metric (no steady=0).
- `knowledge.nexa.stale_source_retrievals` (kind `drift`): búsquedas apoyadas en fuentes `stale`/`deprecated` — responder desde docs vencidos es un problema real. Steady state esperado = 0; `warning` si > 0.
- `knowledge.retrieval.low_citation_rate` (kind `data_quality`): tasa de respuestas donde el packet no trae fragmentos/citationLabel renderizables para la UI. Severity: `warning` si rate ≥ 20% **y** volumen ≥ 10. Este signal se activó con la mitad UI porque la experiencia real ya renderiza evidencia desde `raw.packet`.

Con el flag OFF no hay invocaciones → `total=0` → las tres señales quedan `ok` (steady). Degradación honesta a `unknown` si el query falla (`captureWithDomain(error, 'knowledge', ...)`). El scan protege filas legacy/no-array antes de expandir JSONB.

## Delta 2026-06-01 — TASK-797: signal `hr.contractor_engagement.closed_with_open_payables`

Nuevo signal canonical bajo `moduleKey='identity'` (rollup `Identity & Access`, kind `data_quality`). Defense-in-depth del cierre contractor (TASK-797): cuenta engagements en estado terminal (`ended`/`cancelled`) que TODAVÍA tienen ≥1 payable NO terminal (`status NOT IN ('paid','cancelled')`). Steady state esperado = 0. Severity: 0 → ok, >0 → warning, query falla → unknown. Aparece > 0 cuando un cierre se ejecutó reconociendo (acknowledge) payables abiertos que aún deben liquidarse fuera del flujo, o ante un bypass del flujo de cierre. NUNCA es finiquito — solo integridad de payables del cierre.

- Reader: [`src/lib/reliability/queries/contractor-engagement-closed-with-open-payables.ts`](../../src/lib/reliability/queries/contractor-engagement-closed-with-open-payables.ts). Wire-up en [`get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts). Mirror de `hr.contractor_engagement.classification_risk_open` (TASK-790).

## Delta 2026-06-01 — TASK-981: signal `finance.contractor_remittance_email.dead_letter`

Nuevo signal canonical bajo `moduleKey='finance'` (kind `dead_letter`). Mide los pagos a contractor cuyo **comprobante (TASK-960) no se pudo entregar por email** tras agotar reintentos: cuenta filas `outbox_reactive_log` con `handler='contractor_payable_paid_email:workforce.contractor_payable.paid'`, `result='dead-letter'`, sin acknowledge ni recovery.

- **Remediación canónica**: revisar el motivo (Resend caído, fallo de render, destinatario persistentemente inválido) y reintentar; el contratista igual puede descargar el comprobante en el portal mientras tanto.
- **Severidad**: count=0 → `ok`; count>0 → `error`; query falla → `unknown`. Steady state = 0.
- **No alerta** por skips honestos: si el payable no está `paid` o el contratista no tiene email, el consumer **skipea** (no throw) → nunca llega a dead-letter.
- Reader: [`src/lib/reliability/queries/contractor-remittance-email-dead-letter.ts`](../../src/lib/reliability/queries/contractor-remittance-email-dead-letter.ts). Wire-up en [`get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) (source `contractorRemittanceEmailDeadLetter`). Sibling de `finance.contractor_payable.bridge_dead_letter` (TASK-793).

## Delta 2026-05-31 — TASK-979: signal `finance.contractor_payable.unbatched_overdue`

Nuevo signal canonical bajo `moduleKey='finance'` (kind `drift`). Mide la **brecha de cobertura específica de la corrida mensual**: obligations `provider_payroll` (source_kind `contractor_payable`) aún batcheables (`generated`/`partially_paid`), NO incluidas en ninguna payment order viva (`LEFT JOIN payment_order_lines` line NULL), con `due_date` ya vencido.

- **Remediación canónica**: disparar la corrida mensual (`POST /api/finance/contractor-payables/monthly-run`). Es el failure mode "la corrida no corrió / no cubrió", distinto de `payment_sla_overdue` (TASK-978, más amplio → aprobar/pagar) y de `ready_without_obligation` (TASK-793, tramo anterior → bridge). Tres signals, tres remediaciones.
- **Severidad**: count=0 → `ok`; count>0 & máx atraso ≤10 días → `warning`; máx atraso >10 días → `error`; query falla → `unknown`. Steady state = 0.
- Date arithmetic `CURRENT_DATE - o.due_date` = integer (gate TASK-893). Reader: [`src/lib/reliability/queries/contractor-payable-unbatched-overdue.ts`](../../src/lib/reliability/queries/contractor-payable-unbatched-overdue.ts). Wire-up en [`get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) (source `contractorPayableUnbatchedOverdue`). Live PG smoke: steady=0.

## Delta 2026-05-31 — TASK-978: signal `finance.contractor_payable.payment_sla_overdue`

Nuevo signal canonical bajo `moduleKey='finance'` (kind `lag`). Hace observable el **compromiso de Efeonce de pagar a contractors dentro de los 5 días hábiles posteriores al cierre de mes** (TASK-978 deriva `contractor_payables.due_date = cierre del mes operativo + 5 días hábiles` vía el helper canónico `addBusinessDays` del calendario operativo).

- **Qué mide**: payables **comprometidos a Finanzas** (`status IN ('ready_for_finance','obligation_created','payment_order_created')`), aún NO `paid`/`cancelled`, con `due_date < CURRENT_DATE`.
- **Severidad**: count=0 → `ok` · count>0 & máx atraso ≤10 días → `warning` · máx atraso >10 días → `error` · query falla → `unknown` (degradación honesta). Steady state = 0.
- **Es observabilidad, no gate**: NUNCA bloquea la creación ni el pago del payable. Los payables bloqueados/pendientes los cubren las señales de readiness/blocker (TASK-793/977), no esta.
- **Distinción crítica**: mide el **pago NETO al contractor**. La **remesa de la retención SII** (honorarios CL) es una obligación DISTINTA con su propio deadline **F29 (día 12/20 del mes siguiente)** y otro beneficiario (el SII) — fuera de scope (invariante TASK-977).
- **Aritmética de fechas**: `CURRENT_DATE - due_date` = integer (ambos DATE), NUNCA `EXTRACT(EPOCH FROM (date - date))` (gate TASK-893). Validado con live PG smoke (severity=ok, count=0).

Reader: [`src/lib/reliability/queries/contractor-payable-payment-sla-overdue.ts`](../../src/lib/reliability/queries/contractor-payable-payment-sla-overdue.ts). Wire-up en [`get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) (source `contractorPayablePaymentSlaOverdue`). Sibling del signal `finance.contractor_payable.expense_unmaterialized` (TASK-977).

## Delta 2026-05-28 — TASK-941: signal `nexa.insights.stale_with_eligible_signals`

Nuevo signal canonical bajo `moduleKey='delivery'` que compara el plano BigQuery de Nexa AI signals contra el serving PostgreSQL de enrichments. Cierra el bug class de falso-sano de `ISSUE-082`: un worker vivo o un run `succeeded` no prueba que haya insights frescos si existen señales elegibles sin enrichments servibles.

Contrato:

- BQ `ico_engine.ai_signals` es la fuente de señales elegibles por período.
- PG `greenhouse_serving.ico_ai_signal_enrichments` es la fuente servida para Home/Agency/Person 360.
- Si hay señales elegibles frescas y el serving está vacío/stale para el último período relevante, el signal escala.
- Si no hay período con señales elegibles, el signal degrada honestamente a `awaiting_data`/`ok` según evidencia, no a falso error.
- Query throws → `unknown` + `captureWithDomain('delivery', ...)`.

Severity matrix:

- eligible=0 → `ok`/awaiting-data honesto según contexto del reader
- eligible>0 y served=0 → `error`
- eligible>served o serving stale → `warning`/`error` según SLA
- eligible=served y latest serving fresco → `ok`

Reader canonical: `src/lib/reliability/queries/nexa-insights-freshness.ts`. Wire-up en `getReliabilityOverview` via source `nexaInsightsFreshness`. Verificación de cierre TASK-941: `2026-05` con 20 señales elegibles y 20 enrichments servidos, `severity=ok`.

## Delta 2026-06-20 — TASK-927: signals `notion.metrics.otd_writeback_dead_letter` + `otd_writeback_lag`

Dos signals nuevos (subsystem `delivery`) del writeback del bucket OTD freeze-aware a Notion (`[GH] OTD`, daily batch). Clone del patrón RpA/FTR writeback signals, reapuntado a `greenhouse_delivery.task_otd_writeback_snapshots`. Thresholds adaptados al modelo **batch diario** (no reactivo 5-min): `otd_writeback_dead_letter` (kind `drift`, error si > 0) = snapshots writable pending con error persistente > 3 días (≥3 ciclos diarios); `otd_writeback_lag` (kind `lag`, ok/warning≤5/error) = snapshots writable pending sin escribir > 26 h (≥1 ciclo diario perdido: batch caído, flag apagado tras estar ON, o gate ISSUE-098 bloqueando). **steady=0** pre-flip (tabla vacía con `NOTION_OTD_WRITEBACK_ENABLED` default OFF). Cero `EXTRACT(EPOCH)` sobre date-subtraction (`computed_at` TIMESTAMPTZ → interval; gate TASK-893). Reader: `src/lib/reliability/queries/notion-metrics-otd-writeback-signals.ts`. Wire-up en `getReliabilityOverview` via el array `notionMetricsOtdWriteback` (5 touchpoints). Verificación live 2026-06-20: ambos `ok`. Display-only, NO toca el bono. Spec: TASK-927.

## Delta 2026-06-19 — TASK-1174: signal `delivery.attributable_lateness.shadow_terminal_open`

Signal nuevo (subsystem `delivery`, kind `data_quality`) que vigila el **invariante de terminalidad** del M2 shadow por-tarea (`task_attributable_lateness_shadow`): una tarea TERMINAL (`Aprobado`/`Archivado`) NUNCA debe tener un bucket abierto (`overdue`/`carry_over`). El compute M2 es event-driven y congelaba un bucket abierto cuando el row de `greenhouse_delivery.tasks` laggeaba la transición terminal (no hay transición futura que recompute — ISSUE-098, 250/337 filas). **Steady=0** (warning 1-10 = carrera transitoria de sync, error >10). Es el **gate del writeback `[GH] OTD` (TASK-927)**: con > 0 escribiría "atrasada" sobre tareas entregadas, visible al cliente. Reader: `src/lib/reliability/queries/attributable-lateness-signals.ts` (3er signal del archivo). Wire-up en `getReliabilityOverview` via el array `attributableLateness`. Target preciso = status terminal (no `completed_at` como proxy). Cero date-math (gate TASK-893). Verificación live 2026-06-19 post-backfill: `severity=ok`, `count=0`. Fix completo (estado efectivo desde el log de transiciones + barrido idempotente): TASK-1174 / ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16.12.

## Delta 2026-06-19 — TASK-1169: signal `delivery.attributable_lateness.member_month_paridad`

Signal nuevo (subsystem `delivery`, kind `drift`) que vigila la **comparabilidad de cohorte** del OTD imputable corregido a nivel member×month: lee `greenhouse_delivery.otd_attributable_member_month_shadow` del período más reciente y mide el % de member-months `cohort_mismatch` (la enumeración de candidatos NO reproduce el legacy del bono). **Steady=0** (warning >0%, error >10%, unknown si no hay data). Es el **detector upstream** del bug class de cohorte 2026-06-19 (leer el M2 shadow por-tarea como si fuera el OTD mensual del bono → cohortes incomparables, shadow 0-50% vs bono 66-100%) que se encontró a mano; ahora tiene signal antes de que lo encuentre una UI/decisión rota. Reader: `src/lib/reliability/queries/otd-attributable-member-month-parity.ts`. Wire-up en `getReliabilityOverview` via source `otdAttributableMemberMonthParity` (5 touchpoints). Cero `EXTRACT(EPOCH)`/date-math (gate SQL Signal Reader TASK-893). Verificación live 2026-06-19: `severity=ok`, `cohort_mismatch_pct=0`, `2026-06` 7/8 reproducen el legacy. Todo shadow / flag OFF — no toca el bono (el cutover es TASK-1170).

## Delta 2026-05-18 — TASK-900: signal `delivery.ico_materializer.skipped_safety`

Nuevo signal canonical bajo `moduleKey='delivery'` que cuenta corridas del materializer ICO con `status='skipped_safety'` en `greenhouse_sync.ico_materialization_runs` ventana 24h. Complementario al `identity.notion_bridge.coverage_drift` (TASK-877 follow-up): este último detecta el síntoma upstream (bridge regresión), el nuevo `delivery.ico_materializer.skipped_safety` confirma que el gate canonical activó la defensa anti-bug-class antes de destruir downstream.

Severity matrix:

- count = 0 → `ok` (gate confía en upstream, steady state)
- 1 ≤ count ≤ 5 → `warning` (gate protegió data; operador resuelve signal fuente)
- count > 5 en 24h → `error` (upstream NO resolviéndose; intervención humana)
- query throws → `unknown` + `captureWithDomain('delivery', ...)`

Reader canonical: `src/lib/reliability/queries/ico-materializer-skipped-safety.ts`. Wire-up en `getReliabilityOverview` via source `icoMaterializerSkippedSafety`. Subsystem rollup automático bajo módulo `delivery` (registry.ts:147 — `incidentDomainTag='delivery'` ya existe).

Spec arquitectónica completa: `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`. Reglas duras canonicalizadas en CLAUDE.md § "ICO Materializer Hardening Pattern (TASK-900, desde 2026-05-18)".

---

## Delta 2026-05-09 — ISSUE-073 follow-up: smoke navigation contract

Los smoke specs Playwright son probes de staging/preview, no benchmarks de latencia. Deben distinguir fallas funcionales reales (`4xx/5xx`, redirects de auth indebidos, asserts de UI/API) de cold starts, saturacion transitoria o latencia de red. La solucion canonica no es subir timeouts ad hoc por spec: toda navegacion de smoke debe pasar por la primitive compartida.

Decision aceptada:

- `tests/e2e/fixtures/auth.ts` es la capa canonica de navegacion robusta para smoke specs.
- `gotoWithTransientRetries(page, path, options?)` absorbe solamente errores transitorios de `page.goto` con retries acotados y backoff.
- `gotoAuthenticated(page, path)` debe usarse cuando el test espera sesion valida y debe fallar loud ante redirect a login/auth denied.
- Queda prohibido usar `page.goto(...)` directo dentro de `tests/e2e/smoke/*.spec.ts`.
- La regresion `scripts/lib/e2e-smoke-navigation-contract.test.ts` enforcea el contrato y debe permanecer en CI.
- No se deben silenciar errores HTTP, auth redirects ni asserts funcionales con retries: si la ruta responde con `>=400` o cae en login cuando no corresponde, el smoke debe fallar.

Contexto de decision:

- El commit documental `d5f57755` de TASK-845 paso CI y Playwright.
- Un commit posterior de TASK-844 (`5857c283`) dejo Playwright rojo por `page.goto: Timeout 15000ms exceeded` en specs que aun usaban navegacion cruda (`/my/profile`, `/my/payment-profile`, `/home` shortcuts).
- El fix canonico `33bb09cf` migro los `page.goto` restantes en smoke specs al helper compartido, agrego la regresion de contrato y verifico smoke lane GitHub en verde (`failed=0`, `flaky=0`).

Steady state esperado:

- `rg "page\\.goto\\(" tests/e2e/smoke` no retorna resultados.
- `pnpm test scripts/lib/e2e-smoke-navigation-contract.test.ts` pasa.
- El smoke lane puede marcar `flaky` solo cuando un intento fallido termina pasando; fallas finales siguen reportadas como `failed`.

## Delta 2026-05-09 — ISSUE-073 / TASK-607 flaky semantics + GitHub Actions runtime

El resultado canónico de un smoke lane Playwright se deriva del outcome final de cada spec, no del primer intento. Playwright puede reportar `flaky` cuando un intento falla y un retry pasa; ese estado no debe contarse como `failed_tests` porque el lane terminó recuperado y el workflow sigue siendo verde.

Contrato vigente:

- `scripts/lib/smoke-lane-report.ts` es el parser canónico reusable para reportes Playwright publicados por CI.
- `failed_tests` cuenta solo specs cuyo último intento terminó en `failed | timedOut | interrupted`.
- `summary_json.flakyCount` cuenta specs con intento fallido previo y último intento `passed`.
- `status='failed'` solo si existe al menos una falla final; si no hay fallas finales y hay flaky specs, `status='flaky'`.
- El log esperado incluye `flaky=<n>`: `[smoke-lane-publish] lane=<lane> status=<passed|failed|flaky> total=<n> passed=<n> failed=<n> flaky=<n> skipped=<n>`.
- Las navegaciones E2E autenticadas deben usar `gotoAuthenticated()` o `gotoWithTransientRetries()` para absorber cold-start/red transitoria con retries acotados. HTTP 4xx/5xx, redirects de auth y asserts funcionales siguen fallando loud.
- Los workflows GitHub usan actions compatibles con runtime Node.js 24: `actions/checkout@v5`, `actions/setup-node@v5`, `actions/upload-artifact@v7`, `pnpm/action-setup@v6`, `google-github-actions/auth@v3`, `google-github-actions/setup-gcloud@v3`.

Steady state esperado:

- Una suite Playwright con `33 passed, 3 flaky` publica `failed_tests=0`, `summary_json.flakyCount=3` y `status='flaky'`.
- No quedan referencias a las actions target antiguas (`checkout/setup-node/upload-artifact@v4`, `pnpm/action-setup@v4`, `google-github-actions/auth/setup-gcloud@v2`) en `.github/workflows/`.
- Los warnings de GitHub Actions por Node.js 20 de actions desaparecen. Desde TASK-845, los jobs de app/tests/builds tambien usan `node-version: 24`; mantenerlos en `20` vuelve a abrir deuda de runtime.

## Delta 2026-05-09 — ISSUE-072 smoke-lane publisher reliability

Los smoke lanes Playwright publican su resultado en `greenhouse_sync.smoke_lane_runs` mediante `pnpm sync:smoke-lane <lane-key>`. Esa publicación es best-effort respecto del resultado E2E, pero no debe fallar de forma cotidiana ni generar ruido permanente en GitHub Actions.

Contrato vigente:

- `pnpm sync:smoke-lane` carga `scripts/lib/server-only-shim.cjs` porque importa primitives server-side (`src/lib/postgres/client.ts`, Secret Manager).
- El workflow Playwright autentica con WIF y usa `github-actions-deployer@efeonce-group.iam.gserviceaccount.com`.
- El service account GitHub debe tener `roles/cloudsql.client` para Cloud SQL Connector.
- `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF` debe ser nombre canónico de Secret Manager o ruta completa; no `secret:version`.
- El publisher usa `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=1`.
- La primitive Postgres compartida reintenta con backoff acotado errores transitorios de conexión (`53300`, `080xx`, `57P0x`, TLS/reset/too many connections).

Steady state esperado en CI:

- Playwright puede pasar o fallar por razones funcionales del producto.
- El paso `Publish smoke-lane results to PG` debe terminar OK y registrar logs `[smoke-lane-publish] lane=<lane> status=<passed|failed|flaky>`.
- No deben aparecer annotations `sync:smoke-lane <lane> failed (non-blocking)`.
- Si reaparecen, se debe tratar como incidente operacional nuevo y revisar en este orden: server-only shim, secret ref, WIF/IAM, Cloud SQL saturation, schema/grants.

## Delta 2026-05-03 — TASK-768 subsystem `Finance Data Quality` (2 signals nuevos para economic_category)

Cierra ISSUE-065 (KPI Nómina sub-counted ~$3M abril 2026 por mis-clasificación). Agrega 2 signals al subsystem existente para detectar filas en `expenses` / `income` con `economic_category IS NULL` (pre-cutover legacy o trigger bypass).

### Signals nuevos

- `finance.expenses.economic_category_unresolved`
  - Kind: `drift`
  - Severity rule: `count > 0 → error`; `count === 0 → ok`
  - Steady value: `0` post-cleanup manual queue + VALIDATE atomic
  - Reader: `getExpensesEconomicCategoryUnresolvedSignal` (`src/lib/reliability/queries/economic-category-unresolved.ts`)
  - Query: `SELECT COUNT(*) FROM greenhouse_finance.expenses WHERE economic_category IS NULL`

- `finance.income.economic_category_unresolved`
  - Kind: `drift`
  - Severity rule: idem
  - Reader: `getIncomeEconomicCategoryUnresolvedSignal`

### Builder canónico

`buildFinanceEconomicCategoryUnresolvedSignals` en `src/lib/reliability/signals.ts:1029-1041` — `Promise.all` sobre los 2 readers, retorna `ReliabilitySignal[]`. Mismo pattern que `buildFinanceClpDriftSignals` (TASK-766).

### Subsystem rollup

Subsystem: `Finance Data Quality` (existente). Cualquiera de los 2 signals con `count > 0` flips el subsystem a `error`, lo que escala al rollup `Finance` y al payload de `/api/admin/platform-health` con `safeMode.financeReadSafe=false`.

### Reclassification path documentado

El AI Observer (TASK-638) capta el signal y enlaza a los endpoints admin canónicos:

```http
PATCH /api/admin/finance/expenses/{id}/economic-category
PATCH /api/admin/finance/income/{id}/economic-category
Body: { economicCategory, reason (min 10 chars), bulkContext? }
Capabilities: finance.expenses.reclassify_economic_category | finance.income.reclassify_economic_category
              (FINANCE_ADMIN + EFEONCE_ADMIN, least-privilege)
```

Los endpoints atómicamente: UPDATE economic_category + INSERT audit log + UPDATE manual_queue → resolved + outbox event v1.

### Steady state esperado

Post-backfill (Slice 3): drift inicial = 161 expenses + 19 income en manual queue (esperado, son Nubox imports con `expense_type='supplier'` sin metadata para auto-resolve).

Post-cleanup manual queue (UI Slice 6 + operador): drift = 0. Migration follow-up hace `VALIDATE CONSTRAINT expenses_economic_category_required_after_cutover` atomic.

Post-cutover (CHECK NOT NULL VALIDATED): cualquier reaparición de count > 0 indica trigger bypass o admin override SQL directo. AI Observer alerta.

**Spec canónica**: `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`.

---

## Delta 2026-05-03 — TASK-766 module `finance.payment_orders` (2 signals nuevos para CLP drift)

Cierra el incidente 2026-05-02 (KPIs en `/finance/cash-out` inflados 88× por anti-patrón `SUM(ep.amount × exchange_rate_to_clp)` aplicado a payments con `currency != document.currency`). Agrega 2 signals al subsystem `Finance Data Quality` para detectar payments con `currency != 'CLP' AND amount_clp IS NULL` — la condición que el anti-patrón explotaba.

### Signals nuevos

| `signalKey` | Kind | Severity rule | Steady value | Reader |
| --- | --- | --- | --- | --- |
| `finance.expense_payments.clp_drift` | `drift` | `count > 0 → error`; `count === 0 → ok` | `0` | `getExpensePaymentsClpDriftSignal` (`src/lib/reliability/queries/expense-payments-clp-drift.ts`) |
| `finance.income_payments.clp_drift` | `drift` | `count > 0 → error`; `count === 0 → ok` | `0` | `getIncomePaymentsClpDriftSignal` (`src/lib/reliability/queries/income-payments-clp-drift.ts`) |

Ambos consultan la VIEW canónica `expense_payments_normalized` / `income_payments_normalized` con `WHERE has_clp_drift = TRUE`. Reusan los helpers `getExpensePaymentsClpDriftCount` / `getIncomePaymentsClpDriftCount` para no duplicar SQL.

### Builder + wiring

- `buildFinanceClpDriftSignals` en `src/lib/reliability/signals.ts` — `Promise.all` sobre los 2 readers, retorna `ReliabilitySignal[]`.
- `getReliabilityOverview` extendido en `src/lib/reliability/get-reliability-overview.ts` con `ReliabilityOverviewSources.financeClpDrift?: { expense, income }`. Pre-fetch `.catch(() => null)` para no romper rollup si la VIEW está en degradación.
- Subsystem rollup: `Finance Data Quality` (existente). Cualquiera de los 2 signals con `count > 0` flips el subsystem a `error`, lo que escala al rollup `Finance` y al payload de `/api/admin/platform-health` con `safeMode.financeReadSafe=false`.

### Repair path documentado

El AI Observer (TASK-638) capta el signal y enlaza al endpoint admin canónico:

```http
POST /api/admin/finance/payments-clp-repair
Body: { kind: 'expense_payments' | 'income_payments', dryRun?: true, ... }
Capability: finance.payments.repair_clp (FINANCE_ADMIN + EFEONCE_ADMIN)
```

El endpoint resuelve rate histórico al `payment_date` desde `greenhouse_finance.exchange_rates` y pobla `amount_clp + exchange_rate_at_payment + requires_fx_repair=FALSE` per-row atomic. Idempotente. Outbox audit `finance.payments.clp_repaired` v1.

### Steady state esperado

Post-backfill (Slice 2 migration `20260503015255538`): **drift = 0** en producción.

Post-cutover (2026-05-03): el CHECK constraint `payments_amount_clp_required_after_cutover` (NOT VALID + VALIDATE) impide INSERT/UPDATE de non-CLP sin `amount_clp`. Cualquier reaparición de `count > 0` significa: (a) supersede activo en una fila legacy, (b) bug en `recordExpensePayment` o `recordIncomePayment` (helpers canónicos), o (c) bypass directo del helper. AI Observer alerta con runbook al endpoint repair.

**Spec canónica**: `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`.

---

## Delta 2026-05-02 — TASK-765 module `finance.payment_orders` (3 signals nuevos)

Cierra el incidente 2026-05-01 (payment_orders zombie sin impacto en banco). Agrega 3 signals al subsystem `Finance Data Quality` para detectar el path payment_order → expense_payment → settlement_leg → account_balances cuando se rompe.

### Module entry

```ts
{
  moduleKey: 'finance.payment_orders',
  label: 'Payment Orders → Bank Settlement',
  description: 'Path canónico payroll → expenses → payment_orders → expense_payments → settlement_legs → account_balances',
  domain: 'finance',
  subsystemId: 'finance_data_quality',
  incidentDomainTag: 'finance',
  expectedSignalKinds: ['drift', 'dead_letter', 'lag', 'incident'],
  filesOwned: [
    'src/lib/finance/payment-orders/**',
    'src/lib/finance/payroll-expense-reactive.ts',
    'src/lib/sync/projections/record-expense-payment-from-order.ts',
    'src/lib/sync/projections/finance-expense-reactive-intake.ts',
    'src/app/api/admin/finance/payroll-expense-rematerialize/**',
    'src/app/api/admin/finance/payment-orders/[orderId]/recover/**'
  ]
}
```

Rolea al subsystem existente `Finance Data Quality` — no crea nuevo subsystem. La severidad agregada del módulo se computa con la regla canónica: peor severidad concreta entre los 4 signals esperados.

### Signal 1 — `finance.payment_orders.paid_without_expense_payment`

| Campo | Valor |
| --- | --- |
| Kind | `drift` |
| Severidad cuando count > 0 | `error` |
| Steady state | `0` |
| Source | `getPaidOrdersWithoutExpensePaymentSignal` |
| Reader | [`src/lib/reliability/queries/payment-orders-paid-without-expense-payment.ts`](../../src/lib/reliability/queries/payment-orders-paid-without-expense-payment.ts) |

Query canónica:

```sql
SELECT COUNT(*)::int AS n
FROM greenhouse_finance.payment_orders po
WHERE po.state = 'paid'
  AND po.paid_at < NOW() - INTERVAL '15 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_finance.payment_order_lines pol
     WHERE pol.order_id = po.order_id
       AND pol.expense_payment_id IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_sync.outbox_events oe
     WHERE oe.aggregate_id = po.order_id
       AND oe.event_type = 'finance.payment_order.settlement_blocked'
       AND oe.occurred_at > NOW() - INTERVAL '7 days'
  );
```

**Qué representa**: orders en `state='paid'` hace > 15 minutos cuya line(s) NO tienen `expense_payment_id` y que NO han emitido un evento `settlement_blocked` reciente (últimos 7 días). Es la divergencia exacta del incidente 2026-05-01: la order quedó "Pagada" en UI sin impacto en `account_balances` y nadie alertó.

**Bajo qué condiciones se prende**:

- Path no-atómico falla post-Slice 5 (recovery legacy o bug futuro en `markPaymentOrderPaidAtomic`).
- Proyector reactivo `record_expense_payment_from_order` skipea silenciosamente (no debería ocurrir post-Slice 4 — es safety net del safety net).
- Una migración o seed manual setea `state='paid'` directo en DB bypass del trigger.

**Por qué excluye orders con `settlement_blocked` reciente**: ese caso ya está señalado por `payment_orders_dead_letter` + el banner del DetailDrawer. Doble-conteo crearía ruido.

### Signal 2 — `finance.payment_orders.dead_letter`

| Campo | Valor |
| --- | --- |
| Kind | `dead_letter` |
| Severidad cuando count > 0 | `error` |
| Steady state | `0` |
| Source | `getPaymentOrdersDeadLetterSignal` |
| Reader | [`src/lib/reliability/queries/payment-orders-dead-letter.ts`](../../src/lib/reliability/queries/payment-orders-dead-letter.ts) |

Query canónica:

```sql
SELECT COUNT(*)::int AS n
FROM greenhouse_sync.outbox_reactive_log
WHERE handler = ANY(ARRAY[
    'record_expense_payment_from_order:finance.payment_order.paid',
    'finance_expense_reactive_intake:payroll_period.exported'
  ])
  AND result = 'dead-letter'
  AND acknowledged_at IS NULL
  AND recovered_at IS NULL;
```

**Qué representa**: dead-letters NO acknowledged y NO recovered en los 2 handlers críticos del path:

- `record_expense_payment_from_order:finance.payment_order.paid` — proyección que materializa expense_payments + settlement_legs cuando una order pasa a `paid`.
- `finance_expense_reactive_intake:payroll_period.exported` — proyección que materializa expenses desde payroll exportado (root cause del incidente 2026-05-01).

Alineado con el partial index `outbox_reactive_log_active_dead_letters_idx` (TASK 2026-04-26).

**Bajo qué condiciones se prende**:

- Resolver throw post-Slice 4 con `expense_unresolved`, `out_of_scope_v1`, `cutover_violation` o `materializer_dead_letter`.
- Materializer payroll falla con error no recuperable (drift de columnas, FK violation).
- Reactor agotó retries (`maxRetries=1` para `finance_expense_reactive_intake`, `maxRetries=2` para `record_expense_payment_from_order`).

**Cómo se apaga**: operador hace `acknowledged_at` (issue conocido sin fix) o `recovered_at` (post-fix vía `/api/admin/finance/payroll-expense-rematerialize` o `/api/admin/finance/payment-orders/[orderId]/recover`).

### Signal 3 — `finance.payroll_expense.materialization_lag`

| Campo | Valor |
| --- | --- |
| Kind | `lag` |
| Severidad cuando count > 0 | `warning` (no error) |
| Steady state | `0` |
| Source | `getPayrollExpenseMaterializationLagSignal` |
| Reader | [`src/lib/reliability/queries/payroll-expense-materialization-lag.ts`](../../src/lib/reliability/queries/payroll-expense-materialization-lag.ts) |

Query canónica:

```sql
SELECT COUNT(*)::int AS n
FROM greenhouse_payroll.payroll_periods pp
WHERE pp.status = 'exported'
  AND pp.exported_at < NOW() - INTERVAL '1 hour'
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_finance.expenses e
     WHERE e.payroll_period_id = pp.period_id
       AND e.expense_type = 'payroll'
       AND e.source_type = 'payroll_generated'
  );
```

**Qué representa**: períodos payroll exportados hace > 1 hora que aún no tienen filas en `greenhouse_finance.expenses` con `expense_type='payroll' AND source_type='payroll_generated'`. Captura precisamente la falla upstream del incidente 2026-05-01: el reactor falló, el período quedó sin expenses, y las payment_orders downstream se aprobaron y cerraron como zombie sobre vacío.

**Bajo qué condiciones se prende**:

- Reactor `finance_expense_reactive_intake` en dead-letter (signal 2 también prende).
- Outbox `payroll_period.exported` no se publicó (bug en payroll export path).
- Cloud Run `ops-worker` caído (signal cloud también prende).

**Severidad warning, no error**: el path es asincrónico — un período recién exportado puede tardar minutos en materializar. Solo después de 1h el lag se vuelve sospechoso. Si signal 2 (dead_letter) prende junto, el operador sabe que es bug, no propagación normal.

### Por qué los 3 signals juntos

Los 3 cubren capas distintas del mismo path:

- **Lag (signal 3)** detecta el problema **upstream** — el período payroll no llegó a `expenses` aún.
- **Dead-letter (signal 2)** detecta el problema **a mitad de pipeline** — el reactor agotó retries.
- **Drift (signal 1)** detecta el problema **downstream** — la order ya está `paid` pero el ledger no refleja el movimiento.

Si los 3 = 0, el path está sano. Si 1 prende y los otros no, es señal de un bug específico en esa capa. Si los 3 prenden simultáneos, el path está roto end-to-end (caso del incidente 2026-05-01).

### Wiring en `RELIABILITY_REGISTRY`

Registrados en [`src/lib/reliability/registry.ts`](../../src/lib/reliability/registry.ts) bajo el moduleKey `finance.payment_orders`. Composición vía `buildReliabilityOverview()` en [`src/lib/reliability/get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) — los 3 signals aparecen automáticamente en el snapshot consumido por `/api/admin/reliability`, Admin Center, Ops Health y AI Observer (TASK-638).

### Spec canónica

[`docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md`](../tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md) Slice 7. Contrato del path atómico documentado en [`GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`](./GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) Delta 2026-05-02.

---

## 1. Por qué existe

Greenhouse ya tenía señales útiles, pero aisladas:

- `getOperationsOverview()` agregaba subsistemas, backlog reactivo, webhooks, cloud posture, observabilidad y data quality Notion.
- `GET /api/internal/health` exponía postura cloud y checks runtime.
- Sentry, `source_sync_runs`, Playwright smoke y Billing Export viven en planos distintos.

Faltaba una capa estructural que dijera **qué módulos son críticos**, **qué señales les pertenecen** y **cómo se normaliza su estado**. Sin esa base, cada nueva feature de observabilidad agrega más cards, no un sistema de confianza.

El Reliability Control Plane se sienta **encima** de las fuentes existentes — no las reemplaza, las normaliza.

## 2. Principios de diseño

1. **Registry-first.** Empezar declarando qué módulos críticos existen y qué señales les pertenecen, antes de cualquier UI o LLM.
2. **Evidence-first.** Cada señal normalizada apunta a evidencia real: endpoint, helper, incidente, test, run, doc, SQL, métrica.
3. **Module-oriented.** La lectura final responde tres preguntas por módulo: ¿qué está afectado? ¿cuán confiable está hoy? ¿por qué?
4. **Integración incremental.** TASK-586 agrega cost cloud y notion-bq-sync sin redefinir contratos. TASK-599 agrega smoke/component/route sin tocar el modelo.
5. **No duplicar contracts existentes.** `getOperationsOverview()` y `GET /api/internal/health` siguen siendo dueños de su lectura técnica; el control plane consume de ellos.

## 3. Contracts canónicos

Todos los tipos viven en [`src/types/reliability.ts`](../../src/types/reliability.ts).

### 3.1 `ReliabilityModuleDefinition` (registry estático)

Cada entrada del registry declara:

| Campo | Descripción |
|---|---|
| `moduleKey` | Identificador estable del módulo (`finance`, `integrations.notion`, `cloud`, `delivery`). |
| `label` | Nombre visible. |
| `description` | Una línea explicando el alcance operativo. |
| `domain` | Dominio macro (`platform`, `integrations`, `finance`, `delivery`). |
| `routes` | Rutas críticas que operadores esperan navegables. |
| `apis` | APIs críticas. |
| `dependencies` | Dependencias operativas que, si fallan, propagan al módulo. |
| `smokeTests` | Specs de Playwright que protegen el módulo hoy. |
| `filesOwned` | Glob patterns (minimatch) que declaran qué archivos pertenecen al módulo. Consumido por TASK-633 (change-based verification matrix). |
| `expectedSignalKinds` | Tipos de señal que se esperan vivos para este módulo. |

El seed inicial vive en [`src/lib/reliability/registry.ts`](../../src/lib/reliability/registry.ts) y persiste como código estático. Persistencia DB se evaluará si Discovery posterior demuestra necesidad.

### 3.2 `ReliabilitySignal` (modelo unificado)

| Campo | Descripción |
|---|---|
| `signalId` | Identificador estable (`cloud.runtime.postgres`, `integrations.notion.data_quality`). |
| `moduleKey` | Módulo al que pertenece. |
| `kind` | `runtime` \| `posture` \| `incident` \| `freshness` \| `data_quality` \| `cost_guard` \| `subsystem` \| `test_lane` \| `billing`. |
| `source` | Helper origen (`getCloudHealthSnapshot`, `getCloudSentryIncidents`, etc). |
| `label` | Etiqueta visible. |
| `severity` | `ok` \| `warning` \| `error` \| `unknown` \| `not_configured` \| `awaiting_data`. |
| `summary` | Resumen humano de lo observado. |
| `evidence[]` | Array de pointers a evidencia real (kind + label + value). |
| `observedAt` | Timestamp de la observación. |

`severity` separa explícitamente `not_configured` y `awaiting_data` de `unknown` para que la señal nunca se asuma sana cuando no está plomada.

### 3.3 `ReliabilityModuleSnapshot` (vista por módulo)

Combina la definición + las señales agregadas + el estado computado:

- `status`: peor severidad agregada de las señales del módulo.
- `confidence`: `high` \| `medium` \| `low` \| `unknown` según ratio de señales esperadas que tienen evidencia concreta.
- `summary`: lectura humana en una línea.
- `signalCounts`: histograma por severidad.
- `missingSignalKinds`: tipos esperados sin plomar (boundary explícito para tasks futuras).

### 3.4 `ReliabilityIntegrationBoundary`

Declara qué task futura va a plomar qué señal:

| Campo | Descripción |
|---|---|
| `taskId` | TASK-586, TASK-599, TASK-103. |
| `moduleKey` | Módulo destino. |
| `expectedSignalKind` | Tipo de señal que se espera. |
| `expectedSource` | Helper que se espera implementar. |
| `status` | `pending` \| `partial` \| `ready`. |
| `note` | Cómo se enchufa al runtime. |

## 4. Reader consolidado

[`src/lib/reliability/get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) compone:

1. Subsistemas de `OperationsOverview.subsystems` → señales `kind=subsystem` (mapeadas por nombre a su módulo).
2. `OperationsOverview.cloud.health.runtimeChecks` → señales `kind=runtime` (módulo `cloud`).
3. `OperationsOverview.cloud.health.postureChecks` → señales `kind=posture` (módulo `cloud`).
4. `OperationsOverview.cloud.observability.incidents` → señales `kind=incident` (módulo `cloud`, top 3 abiertos).
5. `OperationsOverview.cloud.observability.posture` → señal posture observabilidad.
6. `OperationsOverview.cloud.bigquery.blockedQueries` → señal `kind=cost_guard` (módulo `cloud`).
7. `OperationsOverview.notionDeliveryDataQuality` → señales `kind=data_quality` para `integrations.notion` y `delivery`.

El reader **no hace fetches propios**: consume el `OperationsOverview` que el caller ya construyó. Si el caller no lo trae, el reader hace un fallback a `getOperationsOverview()`.

## 5. Surfaces consumidoras

| Surface | Rol |
|---|---|
| `Admin Center` (`/admin`) | Lectura ligera "Confiabilidad por módulo" — 1 card por módulo + chips de totales + boundaries pendientes. Foundation visible. |
| `Ops Health` (`/admin/ops-health`) | Detalle técnico de subsystems, reactive backlog, webhooks. **Sigue siendo dueño** de la lectura técnica. |
| `Cloud & Integrations` (`/admin/integrations`) | Detalle de syncs, posture cloud, secret refs. **Sigue siendo dueño** de la lectura cloud. |
| `GET /api/admin/reliability` | Endpoint protegido `requireAdminTenantContext()`. Reusable por agentes, synthetic monitors y change-based verification. |
| GitHub Action `reliability-verify` (TASK-633) | Job de CI que en cada PR lee el diff, deriva módulos afectados via `filesOwned` y corre solo los smoke specs relevantes. Ver `docs/operations/PLAYWRIGHT_E2E.md` §"Change-Based Verification Matrix". |

La spec impone separación explícita: la nueva surface **no reemplaza** a las especialistas. Es complemento.

## 6. Severidad y aggregation

Mapeos canónicos (`src/lib/reliability/severity.ts`):

| Source | Source value | ReliabilitySeverity |
|---|---|---|
| `CloudHealthStatus` | `ok`/`degraded`/`error`/`not_configured` | `ok`/`warning`/`error`/`not_configured` |
| `CloudPostureStatus` | `ok`/`warning`/`unconfigured` | `ok`/`warning`/`not_configured` |
| `OperationsHealthStatus` | `healthy`/`degraded`/`down`/`not_configured`/`idle` | `ok`/`warning`/`error`/`not_configured`/`awaiting_data` |
| `IntegrationDataQualityStatus` | `healthy`/`degraded`/`broken`/`unknown` | `ok`/`warning`/`error`/`unknown` |
| `CloudSentryIncidentLevel` | `fatal`/`error`/`warning`/`info`/`unknown` | `error`/`error`/`warning`/`ok`/`unknown` |

Aggregation por módulo: peor severidad concreta. Estados pendientes (`not_configured`, `awaiting_data`, `unknown`) **nunca** ocultan un `warning` o `error` real.

Confidence:

- `high` ≥ 80% de señales esperadas tienen evidencia concreta (`ok`/`warning`/`error`).
- `medium` ≥ 50%.
- `low` < 50%.
- `unknown` 0 señales presentes.

### Sentry incident → module attribution (TASK-634)

A partir de TASK-634, los incidentes Sentry NO se atribuyen masivamente al módulo `cloud`. El correlador determinista `correlateIncident()` en [`src/lib/reliability/incident-mapping.ts`](../../src/lib/reliability/incident-mapping.ts) decide:

1. **Path matching**: `incident.location` se evalúa contra los globs `filesOwned` declarados en `RELIABILITY_REGISTRY` (TASK-633). Single source of truth — cuando `filesOwned` cambia, el correlador lo recoge automáticamente.
2. **Title matching**: si no hay match por path, busca substrings (lowercase) en `incident.title` por módulo: `finance` (quote, expense, payroll, nubox, …), `integrations.notion` (notion, notion-bq-sync, delivery_tasks), `delivery` (ico-engine, sprint, reactive worker), `cloud` (cloud sql, bigquery, sentry, vercel cron).
3. **Tie-break por priority**: `finance` > `integrations.notion` > `delivery` > `cloud`. Especializado siempre gana al fallback.
4. **Fallback honesto**: incidentes que no matchean ningún módulo se etiquetan `cloud` con `signalId` con sufijo `.uncorrelated.<id>` para auditarlos como huérfanos.

`buildSentryIncidentSignals` (en `signals.ts`) cap-ea a `MAX_SENTRY_INCIDENTS_PER_MODULE=3` por módulo (no global), de modo que finance siempre ve sus 3 top incidentes incluso cuando cloud tiene muchos uncorrelated.

LLM-assisted enrichment para huérfanos queda como follow-up (Slice 4 del spec). V1 es solo rules-first determinista — input → output reproducible sin estado externo.

## 7. Cómo enchufar TASK-586 y TASK-599

Cada upstream debe:

1. Implementar su helper de fetch (ej. `getGcpBillingOverview`, `getFinanceSmokeLaneStatus`).
2. Agregar un adapter en [`src/lib/reliability/signals.ts`](../../src/lib/reliability/signals.ts) que normalice su output a `ReliabilitySignal[]`.
3. Componer el adapter en `buildReliabilityOverview()`.
4. Mover el `ReliabilityIntegrationBoundary` correspondiente de `pending` → `ready`.

No requiere cambios al contrato ni al UI: las nuevas señales aparecen automáticamente en el módulo correspondiente y el conteo `missingSignalKinds` se reduce.

## 7.1 AI Observer (TASK-638, V1.2)

**Qué es.** Capa narrativa opcional sobre el Reliability Control Plane. Toma el snapshot canónico (`getReliabilityOverview()`), lo sanitiza (PII redaction), y llama a Gemini Flash via Vertex AI con un prompt determinista que produce JSON estricto:

```json
{
  "overviewSummary": "...",
  "overviewSeverity": "ok|warning|error|...",
  "modules": [
    { "moduleKey": "finance", "severity": "warning", "summary": "...", "recommendedAction": "..." }
  ]
}
```

**Por qué existe.** El RCP determinístico ya cubre health, signals, y boundaries. El AI Observer agrega:

- Resumen ejecutivo en lenguaje neutro (un párrafo) para el Admin Center.
- Recomendaciones contextuales por módulo cuando hay error/warning.
- Detección de patrones cross-módulo que no caben en una regla simple.

**No reemplaza** señales determinísticas. Cada `kind='ai_summary'` queda visible junto al resto de signals — el operador puede contrastar la lectura IA con la evidencia bruta.

**Host: ops-worker (NO Vercel cron).** Decisión 2026-04-25:

| Criterio                              | Vercel cron     | Cloud Function | ops-worker (Cloud Run)        |
| ------------------------------------- | --------------- | -------------- | ----------------------------- |
| Timeout safety (Gemini + DB writes)   | 60s cap         | OK             | 540s cap                      |
| WIF nativo para Vertex AI             | ❌ (rotar ADC)  | ✅             | ✅                            |
| Cloud Logging audit (prompt+respuesta)| logs Vercel     | ✅             | ✅                            |
| Setup overhead                        | bajo            | medio          | mínimo (servicio ya existe)   |
| Cloud Scheduler retries               | manual          | ✅             | ✅                            |

ops-worker gana por: ya corre 7+ jobs Scheduler, WIF nativo evita rotar Vertex AI ADC en Vercel, y captura prompt + respuesta en Cloud Logging para audit.

**Kill-switch.** Default OFF (opt-in). Activación explícita: `RELIABILITY_AI_OBSERVER_ENABLED=true` en el Cloud Run service. Sin esto, cada llamada al endpoint `POST /reliability-ai-watch` retorna `skippedReason` con costo cero. Convención **opuesta** a synthetic (default ON) porque cada llamada gasta tokens, dedup-skipped o no.

**Dedup por fingerprint.** Cada observation lleva un fingerprint sha256 truncado del estado relevante (`status`, `confidence`, `signalCounts`, `missingSignalKinds` ordenados). Si el último fingerprint persistido coincide, la observation se descarta — esto evita inflar la tabla cuando el portal está estable durante días.

**Anti-feedback loop.** El runner llama `getReliabilityOverview()` SIN incluir `aiObservations` (default OFF). El consumer de Admin Center lo llama explícitamente con `includeAiObservations=true`. Así el snapshot que entra al prompt nunca contiene resúmenes IA previos.

**Schema.** `greenhouse_ai.reliability_ai_observations` (TASK-638 migration `20260425211608760`):

- PK `observation_id` (`EO-RAI-{uuid8}`)
- `sweep_run_id` (`EO-RAS-{uuid8}`)
- `(scope, module_key, observed_at)` para reads ordenados
- `fingerprint` para dedup lookup
- `summary`, `recommended_action`, `model`, token counts

**Cloud Scheduler.** Job `ops-reliability-ai-watch` cada 1h (`0 */1 * * *`, timezone `America/Santiago`), `triggeredBy=cloud_scheduler`. Frecuencia conservadora porque cada llamada cuesta tokens regardless of dedup.

## 8. Roadmap de follow-ups

- Synthetic monitoring periódico que ejecute las rutas críticas declaradas en el registry.
- Change-based verification matrix: cuando un PR toca un archivo `owned` por un módulo, correr el smoke + signal correspondiente.
- Correlador explicativo (LLM o reglas) que correlacione incidentes Sentry con módulos por path/title.
- Persistencia DB del registry si aparece necesidad de overrides por tenant o de SLOs configurables.

## 9. Cosas que NO hace V1

- No define entitlements nuevos. Reusa `requireAdminTenantContext()`.
- No persiste señales históricas. Cada lectura es snapshot.
- ~~No persiste el registry~~ → **TASK-635 (V1.1)**: registry persistido en `greenhouse_core.reliability_module_registry` + overrides per-tenant en `greenhouse_core.reliability_module_overrides`. Seed estático sigue siendo source of truth para defaults (idempotente al boot vía `INSERT ... ON CONFLICT DO UPDATE`).
- No automatiza remediaciones.
- No implementa synthetic monitoring real (TASK-632 lo implementa con cron Vercel + Agent Auth).
- No reemplaza Sentry, `source_sync_runs`, Playwright ni Billing Export.
- No implementa Admin Center CRUD UI para overrides per-tenant (queda follow-up de TASK-635 cuando aparezca primer caso de uso real).
- No implementa SLO breach detector (solo persiste `sloThresholds` para forward-compat).

## 10. Archivos canónicos

- Tipos: [`src/types/reliability.ts`](../../src/types/reliability.ts)
- Registry estático (defaults): [`src/lib/reliability/registry.ts`](../../src/lib/reliability/registry.ts) — exporta `STATIC_RELIABILITY_REGISTRY` y alias compat `RELIABILITY_REGISTRY`.
- **Registry store DB-backed (TASK-635)**: [`src/lib/reliability/registry-store.ts`](../../src/lib/reliability/registry-store.ts) — `ensureReliabilityRegistrySeed()`, `getReliabilityRegistry(spaceId?)`, `setReliabilityModuleOverride()`, `clearReliabilityModuleOverride()`. Cache TTL 60s + fallback a `STATIC_RELIABILITY_REGISTRY` cuando DB falla.
- **Migration TASK-635**: [`migrations/20260425204554656_task-635-reliability-registry-tables.sql`](../../migrations/20260425204554656_task-635-reliability-registry-tables.sql)
- Severity helpers: [`src/lib/reliability/severity.ts`](../../src/lib/reliability/severity.ts)
- Signal adapters: [`src/lib/reliability/signals.ts`](../../src/lib/reliability/signals.ts)
- Incident correlator: [`src/lib/reliability/incident-mapping.ts`](../../src/lib/reliability/incident-mapping.ts)
- Reader: [`src/lib/reliability/get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) — acepta `options.spaceId` y resuelve registry per-tenant via `registry-store.ts`.
- API: [`src/app/api/admin/reliability/route.ts`](../../src/app/api/admin/reliability/route.ts)
- UI primitive: [`src/components/greenhouse/ReliabilityModuleCard.tsx`](../../src/components/greenhouse/ReliabilityModuleCard.tsx)
- Surface entrypoint: sección en [`src/views/greenhouse/admin/AdminCenterView.tsx`](../../src/views/greenhouse/admin/AdminCenterView.tsx)
- **AI Observer (TASK-638)**:
  - Sanitizer: [`src/lib/reliability/ai/sanitize.ts`](../../src/lib/reliability/ai/sanitize.ts)
  - Prompt builder: [`src/lib/reliability/ai/build-prompt.ts`](../../src/lib/reliability/ai/build-prompt.ts)
  - Kill-switch: [`src/lib/reliability/ai/kill-switch.ts`](../../src/lib/reliability/ai/kill-switch.ts)
  - Persist: [`src/lib/reliability/ai/persist.ts`](../../src/lib/reliability/ai/persist.ts)
  - Reader: [`src/lib/reliability/ai/reader.ts`](../../src/lib/reliability/ai/reader.ts)
  - Runner: [`src/lib/reliability/ai/runner.ts`](../../src/lib/reliability/ai/runner.ts) — host-agnostic
  - Adapter (signals): [`src/lib/reliability/ai/build-ai-summary-signals.ts`](../../src/lib/reliability/ai/build-ai-summary-signals.ts)
  - ops-worker endpoint: `POST /reliability-ai-watch` en [`services/ops-worker/server.ts`](../../services/ops-worker/server.ts)
  - Cloud Scheduler job: `ops-reliability-ai-watch` en [`services/ops-worker/deploy.sh`](../../services/ops-worker/deploy.sh)
  - UI: [`src/components/greenhouse/admin/ReliabilityAiWatcherCard.tsx`](../../src/components/greenhouse/admin/ReliabilityAiWatcherCard.tsx)
  - Migration: [`migrations/20260425211608760_task-638-reliability-ai-observations.sql`](../../migrations/20260425211608760_task-638-reliability-ai-observations.sql)

## Delta 2026-05-03 — TASK-769 Billing como señal esperada de Cloud

TASK-769 promueve `billing` a señal esperada del módulo `cloud` y agrega drivers FinOps con evidencia:

- `STATIC_RELIABILITY_REGISTRY.cloud.expectedSignalKinds` ahora incluye `billing`.
- `buildGcpBillingSignals()` eleva la severidad de `cloud.billing.gcp_export` cuando los drivers determinísticos traen `warning` o `error`.
- Cada driver no-OK se proyecta como señal `cloud.billing.driver.<driverId>` con threshold, share y evidencia de Billing Export.
- La IA FinOps no define severidad del RCP. Solo agrega narrativa persistida y auditable para Admin Center; las alertas y RCP siguen siendo determinísticos.
- Steady state esperado: `cloud.billing.gcp_export` existe siempre que el reader Billing se ejecute; drivers adicionales deberían tender a 0 en operación optimizada.

Artefactos canónicos nuevos:

- Alert sweep: [`src/lib/cloud/gcp-billing-alerts.ts`](../../src/lib/cloud/gcp-billing-alerts.ts)
- FinOps AI runner/persist: [`src/lib/cloud/finops-ai/`](../../src/lib/cloud/finops-ai/)
- Migration: [`migrations/20260503115518831_task-769-cloud-cost-ai-observations.sql`](../../migrations/20260503115518831_task-769-cloud-cost-ai-observations.sql)
- ops-worker endpoint: `POST /cloud-cost-ai-watch` en [`services/ops-worker/server.ts`](../../services/ops-worker/server.ts)

## Delta 2026-06-24 — módulo `growth` (AI Visibility Grader, TASK-1226)

Nuevo módulo de reliability **`growth`** (domain `growth`, incidentDomainTag `growth`) registrado en `registry.ts`. 4 signals nuevos sobre el evidence ledger `greenhouse_growth` (lecturas de 7 días, reader `src/lib/reliability/queries/growth-ai-visibility-signals.ts`, wired en `get-reliability-overview.ts`):

- `growth.ai_visibility.provider_error_rate` (data_quality) — % de observaciones failed/rate_limited; steady=0/ok.
- `growth.ai_visibility.provider_latency_p95` (runtime) — p95 latencia de observaciones exitosas.
- `growth.ai_visibility.cost_budget_used` (cost_guard) — max(estimated/ceiling) por run.
- `growth.ai_visibility.provider_call_skipped` (posture) — skips esperados pre-launch (grader OFF); nunca error por sí mismo.

DB vacía / grader OFF → todos en estado sano (`ok`/`awaiting_data`), steady esperado mientras los flags `GROWTH_AI_VISIBILITY_*_ENABLED` estén OFF. Cada signal degrada honestamente (`unknown` + `captureWithDomain('growth')`) si su query falla.

## Delta 2026-06-24 — módulo `growth`: signals de normalización/scoring (TASK-1227)

5 signals adicionales del motor de normalización/scoring (reader `src/lib/reliability/queries/growth-ai-visibility-scoring-signals.ts`, wired en `get-reliability-overview.ts`):

- `growth.ai_visibility.insufficient_data_rate` (data_quality) — fracción de `grader_scores` con `score_status=insufficient_data` (30 días).
- `growth.ai_visibility.report_review_required_rate` (posture) — fracción `review_required` (comportamiento de seguridad esperado, severity ok).
- `growth.ai_visibility.prompt_pack_eval_regression` (test_lane) — corre el golden eval (1228) sobre el normalizer determinista; `error` si hay divergencias deterministas vs el baseline.
- `growth.ai_visibility.archetype_coverage_gap` (test_lane, TASK-1292) — corre `runArchetypeCoverageEval` sobre la matriz `archetype-coverage-eval.v1.json` (Capa A determinista de EPIC-021); `error` si un arquetipo deja de cubrir su contrato de buyer-intent (etapas mínimas archetype-aware, amplitud de fan-out, sin fuga de framing de agencia, framing category-noun). Steady = 0 gaps. Red de no-regresión del falso-0 de ISSUE-110.
- `growth.ai_visibility.normalization_failed` + `growth.ai_visibility.score_recompute_failed` (runtime) — **stub** (sin failure-ledger todavía; los fallos van a Sentry domain=growth). Follow-up: tabla de intentos (patrón `auth_attempts`).

Módulo `growth` `expectedSignalKinds` ahora incluye `test_lane`. DB vacía → todos en estado sano.

## Delta 2026-06-24 — módulo `growth`: signals de ejecución async (TASK-1234)

2 signals adicionales de salud de la ejecución async del grader (worker Cloud Run), en el mismo reader `src/lib/reliability/queries/growth-ai-visibility-signals.ts` (auto-wired vía el array de `getGrowthAiVisibilitySignals`):

- `growth.ai_visibility.run_execution_lag` (lag) — runs en `pending` desde hace > `GROWTH_AI_VISIBILITY_PENDING_LAG_THRESHOLD_MINUTES` (20 min) ⇒ el worker `ops-growth-grader-drain` no está drenando. steady=0; 1-2 → warning, >2 → error.
- `growth.ai_visibility.run_stuck_running` (runtime) — runs en `running` desde hace > `GROWTH_AI_VISIBILITY_STUCK_RUNNING_THRESHOLD_MINUTES` (90 min) ⇒ crash/timeout mid-run; `recoverStuckRunningRuns` los finaliza con la evidencia ya persistida. steady=0; >0 → error.

Date-math segura (timestamptz − timestamptz vía `make_interval`, nunca `EXTRACT(EPOCH FROM (date−date))`); SQL ejercitada contra PG real. Detección live 2026-06-24: 1 run huérfano real (`running`) del timeout inline de TASK-1233 → `run_stuck_running=1` hasta el primer drain.

## Delta 2026-06-25 — módulo `growth`: signals de entrega pública (TASK-1245)

3 signals nuevos sobre la entrega pública del run del AI Visibility Grader (`src/lib/reliability/queries/growth-ai-visibility-public-delivery-signals.ts`, wired en `get-reliability-overview.ts`):

- `growth.ai_visibility.public_status_read` (posture) — volumen de reads públicos (status + report token) en 24 h; visibilidad de tráfico/DoS. steady = cualquiera (informativo).
- `growth.ai_visibility.public_delivery_pending` (data_quality, steady=0) — runs terminales (succeeded/partial) cuyo finalizador NO materializó la entrega (`public_delivery_state='pending'`) >15 min después de terminar: auto-publish estancado/caído. 1-3 → warning, >3 → error.
- `growth.ai_visibility.public_delivery_inconsistent` (data_quality, steady=0) — invariante `public_delivery_state='ready' ⟹ existe snapshot publicable`; una fila `ready` sin snapshot es corrupción del estado materializado.

DB vacía / pre-launch → steady ok. Error de lectura → degradación honesta (severity unknown). Spec: `docs/tasks/complete/TASK-1245-growth-ai-visibility-public-run-status-delivery-orchestrator.md`.
