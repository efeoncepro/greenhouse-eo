# GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1 — Canonicalización de identidad del intake de candidatos: evidencia inmutable, display person-first y remediación gobernada

- **Status**: Accepted (2026-08-17 — decisión autorizada por el CEO el 2026-08-16 e **implementada**: Slices 1–4 mergeados, `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` creada ON en staging el 2026-08-16 y la remediación histórica **ejecutada** con 3 personas reales corregidas + 2 perfiles QA podados. Producción sigue OFF hasta el canary del runbook)
- **Date**: 2026-08-16
- **Deciders**: CEO (autorización ejecutiva 2026-08-16, sesión de operador — misma figura que `TASK-1734`; ver su `## Delta 2026-08-16`) · agente ejecutor Slice 0 `TASK-1736` (skill `arch-architect`)
- **Tags**: hiring, ats, identity, privacy, data-quality, governance
- **Task owner**: [`TASK-1736`](../tasks/in-progress/TASK-1736-candidate-identity-intake-canonicalization-remediation.md) (EPIC-011)
- **Extiende**: `TASK-1367` (careers apply intake service) · `TASK-1688` (contact completeness) · `TASK-1318` (growth forms full-name split) · `TASK-353` (hiring ATS domain foundation)

---

## Decisión (resumen ejecutivo)

Greenhouse separa la identidad del candidato en **tres capas con contratos distintos**: la **evidencia
submitted** (lo que la persona escribió, application-scoped e **inmutable**), el **display person-first**
(normalizado de forma culturalmente segura, **corregible** con actor/reason/audit) y la **search key**
(derivada, versionada, invisible, **jamás** usada sola para fusionar personas). La normalización mecánica
se limita a lo estructuralmente seguro (Unicode NFC, whitespace, controles/bidi) más un casing conservador
**sólo** cuando la policy lo clasifica `high_confidence`; todo lo ambiguo queda `needs_review` para un
humano. El "sticky name" de `identity_profiles` se cierra con un command de reconciliación compare-and-set:
un intake posterior puede refrescar el display sólo bajo condiciones estrechas y auditadas, nunca por
last-write-wins. La remediación de los registros históricos (4/53 nombres con casing anómalo, caso
sintomático real: los emails salieron "valentina, tu postulación…" / "Test completado: valentina villa")
ocurre exclusivamente vía `dry-run → allowlist humana → apply con compare-and-set + audit + rollback
ensayado`, detrás de un flag default OFF. Ningún dato authored se pierde, ninguna persona se fusiona por
representación, y ningún log/evento/reporte lleva PII.

Las seis sub-decisiones:

### D1 — Modelo de tres capas: evidencia · display · search key

| Capa | Ámbito | Mutabilidad | Contrato |
|---|---|---|---|
| `submitted` (evidencia) | por `hiring_application` | **Inmutable** (append-only) | Lo que la persona escribió, tras rechazar/remover únicamente controles no representables/peligrosos (controles C0/C1, bidi overrides, zero-width de riesgo). Conserva Unicode, diacríticos, casing y autoría. Es el registro histórico y probatorio del intake. |
| `display` | person-first (`identity_profiles.full_name` + representación versionada) | **Derivada y corregible** | NFC + whitespace Unicode colapsado + casing sólo `high_confidence`. Una corrección humana exige application/identity exactas, before-value conocido, actor, reason/purpose y queda en audit append-only. |
| `searchKey` | derivada de display | **Regenerable** | Casefold + normalización de diacríticos con algoritmo/`normalizationVersion` explícitos. No visible en UI. **Nunca** decide sola una fusión de Person: email/`identity_profile_id` siguen siendo lo authoritative. |

- La evidencia vive en una **tabla application-scoped dedicada nueva** en `greenhouse_hiring`
  (nombre exacto y shape en la migración de Slice 2), anclada por FK a
  `greenhouse_hiring.hiring_application`, junto al audit append-only de reconciliación/corrección.
  Se descarta reutilizar un JSON genérico o duplicar columnas de Person: `greenhouse_core.identity_profiles`
  sigue siendo la única Person canónica (invariante TASK-353: no existe root candidato paralelo).
- Cada representación lleva `normalizationVersion` + `reviewState`
  (`normalized | needs_review | corrected`) con provenance. Cambiar el algoritmo produce una versión
  nueva; jamás reescribe la evidencia ni pisa una corrección humana.
- Retención: la evidencia y el audit siguen la retención del expediente Hiring/Privacy; los snapshots de
  remediación son cifrados/restringidos y con custodia declarada (spec §Backfill).

### D2 — Policy de normalización culturalmente segura (qué se normaliza y qué JAMÁS)

**Normalización estructural determinista (siempre, ambas entradas públicas):**

1. Unicode NFC.
2. Colapso de whitespace Unicode interno a un espacio simple; trim exterior.
3. Rechazo/remoción de caracteres de control, overrides bidireccionales y zero-width peligrosos
   (posture exacta por carácter en la policy versionada de Slice 1).

**Casing mecánico — sólo `high_confidence`, con reglas conservadoras:**

- Elegible únicamente el patrón degenerado evidente: nombre **completamente en minúsculas** o
  **completamente en mayúsculas**, en escritura latina, sin señales de ambigüedad. Ejemplo canónico:
  `valentina villa` → `Valentina Villa`.
- Reglas conservadoras para partículas y prefijos: `de`, `del`, `de la`, `de los`, `van`, `van der`,
  `von`, `der`, `da`, `di`, `la`, `le` permanecen en minúscula en posición interior
  ("María de los Ángeles", "van der Meer"); `Mc`/`Mac` y `O'` re-capitalizan la letra siguiente
  ("McDonald", "O'Neill"); apóstrofes rectos y curvos y guiones se preservan y capitalizan cada
  segmento compuesto ("Ana-María"). El corpus multicultural de Slice 1 es el contrato ejecutable de
  estas reglas; los tests **no pueden** imponer "primera letra mayúscula" como criterio universal.

**JAMÁS se auto-muta sin humano (`needs_review`):**

- Casing mixto intencional o cualquier patrón que no sea el degenerado evidente (`dEsiree`, `LaTonya`,
  `iRene`): la política no adivina.
- Orden apellido/nombre: nunca se reordena ni se re-segmenta; `firstName`/`lastName` son declaración
  del candidato.
- Escrituras no latinas (CJK, árabe, cirílico, etc.): sólo normalización estructural; el casing no aplica
  y no se translitera.
- Nombres de una letra, mononímicos o con cardinalidad inusual de tokens.
- Cualquier discrepancia sustantiva entre el nombre nuevo y el existente de la Person (ver D3).

**Texto libre nunca se canonicaliza semánticamente**: `message` y respuestas abiertas son
candidate-authored; sólo límites de tamaño/seguridad, sin reescritura de ortografía, casing, saltos de
línea o estilo.

### D3 — Fix del "sticky name" de `identity_profiles` (cuándo refresca un intake posterior)

Runtime actual verificado: `createIdentityProfile` (`src/lib/account-360/organization-store.ts`) hace
dedupe email-first y, si el correo ya existe, **devuelve el perfil previo sin reconciliar `full_name`** —
la primera entrada defectuosa queda pegada. Además su `ON CONFLICT (profile_id) DO UPDATE` sobreescribe
`full_name` verbatim en colisión de `profile_id`. Ambos caminos se estrangulan:

- El intake deja de entregar el nombre crudo: `submitPublicHiringApplication` invoca primero el primitive
  canónico `normalizeCandidateIdentityInput` y Person recibe el **display** (no el verbatim).
- Se introduce `reconcileCandidateIdentityDisplayName` (command idempotente, compare-and-set sobre
  before-value) como **único** camino para refrescar el display de una identidad existente.

**Un intake posterior SÍ puede refrescar el display cuando se cumplen todas:**

1. La Person se resolvió por email/`identity_profile_id` authoritative (nunca por nombre ni searchKey).
2. El `full_name` vigente **no tiene corrección humana registrada** (`reviewState != corrected`); una
   corrección humana siempre gana sobre cualquier automatismo.
3. El nombre nuevo clasifica `high_confidence` y difiere del vigente **sólo** en casing/whitespace/NFC
   (misma cardinalidad y contenido de tokens bajo searchKey), **o** el vigente está vacío/placeholder.
4. El compare-and-set sobre el before-value exacto tiene éxito; un conflicto concurrente deriva a
   `needs_review`, nunca last-write-wins.

**Un intake posterior NO refresca (queda `needs_review` + señal, sin mutar `full_name`):**

- El nombre nuevo difiere sustantivamente del vigente (tokens distintos, posible cambio de nombre real,
  posible typo nuevo, posible homónimo con correo compartido): decide un humano.
- La clasificación del nombre nuevo no es `high_confidence`.
- Cualquier fallo de precondición del CAS.

La evidencia submitted de cada aplicación se persiste **siempre**, refresque o no el display.

### D4 — Remediación histórica: sólo `dry-run → allowlist humana → apply → rollback`, flag OFF

- **Detector/dry-run read-only**: reporta cardinalidad, clasificación y hashes/IDs internos; **cero PII**
  en el output compartido; no escribe nada.
- **Allowlist humana exacta**: un operador revisa el reporte y aprueba pares
  `applicationId + identityProfileId` con before-value conocido. La allowlist no se asume estable: se
  regenera desde un dry-run vigente al momento del apply (los 4 casos observados el 2026-08-16 son punto
  de partida, no contrato).
- **Apply gobernado**: lotes de 1, compare-and-set sobre el before-value, actor + purpose obligatorios,
  audit append-only con versión/clasificación/hashes, readback y cooldown entre registros. Cualquier
  delta de cardinalidad o ambigüedad **aborta**.
- **Rollback ensayado**: compare-and-set inverso hacia el before-value exacto desde el ledger/snapshot,
  ensayado en staging **antes** del primer apply en producción. Evidencia raw y audit jamás se borran.
- **Flag** `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` default **OFF** gatea la materialización de
  display/search y la reconciliación; el flag **por sí solo nunca autoriza** el apply histórico (requiere
  además allowlist vigente). Se registra en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con runtime
  ownership mapeado por grep (`grep -rn` de los read-sites) **antes** de cualquier flip, en el mismo PR
  que lo declara.

### D5 — Field policy matrix (contrato por campo del intake)

Acciones canónicas: `validate` (rechaza inválido) · `normalize` (transformación determinista declarada) ·
`preserve` (authored, no se toca) · `reject` (payload inválido) · `needs_review` (humano decide).

| Campo | Capa evidencia | Capa display | Capa search | Acción canónica | Mutabilidad post-intake | Quién corrige | Qué preserva la historia |
|---|---|---|---|---|---|---|---|
| `firstName`/`lastName`/`fullName` | Sí — submitted application-scoped inmutable | Sí — NFC + whitespace + casing `high_confidence`; ambiguo `needs_review` | Sí — casefold + diacritic-fold versionada | `normalize` estructural + casing condicionado; ambiguo `needs_review` | Display corregible; evidencia y searchKey de la aplicación, no | Operador con capability fina (D6/Slice 2) vía command; automatismo sólo D3 | Evidencia por aplicación + audit append-only con before-value, actor, reason, versión |
| `email` | Sí (en la application) | Canonical lowercase (contrato vigente, sin cambio) | Es la clave de dedupe authoritative | `validate` + `normalize` determinista | No se corrige por este dominio (cambio de email = proceso de identidad aparte, fuera de alcance) | — | Fila de application + dedupe fingerprint |
| `phone` | Sí (valor entregado) | E.164 authoritative | No | `validate` + `normalize` E.164 desde calling-country **explícito** | Re-submit del candidato actualiza; omitir preserva (anti-wipe TASK-1688) | Candidato (re-submit) u operador con capability | `candidate_facet` conserva vigente; application conserva lo entregado |
| `phoneCountry` (calling code) | Sí | Selección explícita del campo teléfono | No | `validate`; **jamás** inferido de residencia | Igual que phone | Igual que phone | Igual que phone |
| `residenceCountryCode` | Sí | ISO 3166-1 alpha-2 uppercase | No | `validate` exacto (2 chars ISO) / `reject`; sin inferencia por IP/teléfono/correo | Re-submit actualiza; omitir preserva | Candidato u operador | Igual que phone |
| `portfolioUrl` / `linkedinUrl` | Sí (URL entregada) | HTTPS + hostname lowercase, sin credenciales embebidas; fragment y tracking params removibles sólo si el path/query significativo queda intacto (lista exacta en policy Slice 1) | No | `validate` (https browser-safe) + `normalize` conservador / `reject` insegura | Re-submit actualiza; omitir preserva | Candidato u operador | Evidencia conserva la URL original entregada |
| `availability` | Sí (valor entregado) | Valor del catálogo estable/versionado server-side | No | `validate` contra catálogo; unknown → `reject` con code canónico | Re-submit actualiza | Candidato u operador | Evidencia + catálogo versionado |
| `message` | Sí — candidate-authored | N/A (no hay representación derivada) | No | `preserve` — sólo trim exterior + límite de seguridad; saltos internos y estilo intactos | **Inmutable** (contexto de ESA postulación) | Nadie — jamás se reescribe | La application es la historia |

### D6 — Sign-off matrix: resuelta por autorización ejecutiva

La matriz Talent/Identity/Privacy/Security/Data quedó **resuelta por autorización explícita del CEO el
2026-08-16** (sesión de operador; **misma figura que `TASK-1734`** — ver su `## Delta 2026-08-16`, punto 1,
y la D5 del ADR `GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`). Este ADR la registra como
**autorización otorgada** — ninguna firma adicional bloquea el avance. Sin rebaja:

- Los **gates técnicos NO se rebajan**: corpus multicultural + property tests, staging shadow, canary de
  ambas entradas, rollback rehearsal obligatorio pre-producción, no-PII gate, flag default OFF.
- Las **obligaciones regulatorias de privacidad siguen intactas como actividades** de la task (ya
  autorizadas, no eliminadas): retención del expediente y de snapshots de before-values, custodia
  restringida/cifrada, ventana de apply de PII aprobada por operador, revisión Privacy/Security del
  no-PII gate y del detector, y cualquier deber de información al titular que Legal/Privacy determine por
  jurisdicción.

---

## Alternativas rechazadas

- **`Title Case` ciego global**: dañaría "María de los Ángeles", "van der Meer", "McDonald", "O'Neill" y
  todo casing intencional — sería una segunda falla de datos, ahora sistemática y sobre las 53 filas. La
  propia spec lo prohíbe. Rechazada.
- **Normalizar en el parser mutando la evidencia**: si `parsePublicHiringApplication` reescribiera el
  nombre antes de persistir, el dato authored desaparecería y nada sería contestable ni reversible; el
  parser sigue siendo validación pura y la evidencia se conserva verbatim (post saneamiento de
  controles). Rechazada.
- **Dejar todo como está (statu quo)**: el síntoma es real y visible al candidato — emails
  "valentina, tu postulación…" y "Test completado: valentina villa" — y el defecto se re-alimenta con
  cada intake nuevo; el sticky name además impide que la persona corrija su propio nombre aplicando de
  nuevo. Rechazada.
- **`UPDATE` masivo directo sobre `identity_profiles.full_name`**: SQL manual sin evidencia, sin CAS, sin
  audit y sin rollback sobre PII; exactamente la clase de remediación que este ADR prohíbe. Rechazada.
- **Parsear el nombre en given/family con una librería de name-parsing**: re-segmentar u ordenar nombres
  es anglocéntrico y destruye la declaración del candidato; `firstName`/`lastName` son evidencia, no
  hipótesis a corregir. Rechazada.
- **searchKey como criterio de merge de personas**: fusionar por representación normalizada puede unir
  homónimos; email/`identity_profile_id` siguen siendo lo único authoritative. Rechazada.
- **Root candidato paralelo o copia de identidad a una ficha propia de Hiring**: viola el modelo
  person-first de TASK-353 y el 360 canónico; la evidencia es application-scoped pero la Person es una.
  Rechazada.
- **Last-write-wins en la reconciliación**: un intake nuevo que pisa siempre el nombre vigente reintroduce
  el defecto en sentido inverso (un typo nuevo destruiría un nombre correcto o una corrección humana).
  Rechazada.

---

## 4-Pillar Score

### Safety

- **What can go wrong**: un casing automático daña un nombre culturalmente válido; dos personas se
  fusionan por representación; PII de candidatos aparece en logs/reportes/eventos; el backfill pisa una
  corrección humana reciente.
- **Gates**: casing sólo `high_confidence` con corpus multicultural ejecutable; evidencia raw siempre
  preservada; email/ID authoritative para identidad (searchKey jamás fusiona); no-PII gate con tests
  negativos (logs/eventos/métricas/errores sólo IDs/hashes/códigos); apply histórico sólo allowlist
  exacta + CAS + lotes de 1 + actor/purpose; corrección humana siempre gana sobre automatismo; flag
  default OFF.
- **Blast radius if wrong**: una representación de una Person/aplicación (lineage exacto por
  applicationId + identityProfileId); la evidencia inmutable garantiza reconstrucción total.
- **Verified by**: property tests Unicode/multiculturales, parity tests Careers/Growth Forms sobre el
  mismo input, tests de no-PII, rollback rehearsal en staging, readback post-apply.
- **Residual risk**: el umbral `high_confidence` puede clasificar mal un caso fuera del corpus — mitigado
  porque el fallo degrada a `needs_review` (fail-closed a humano) y el display es corregible sin pérdida.

### Robustness

- **Idempotency**: dedupe por `applicationId + identityProfileId + normalizationVersion + input digest`;
  retry del mismo command es no-op; replay de submit reconcilia la misma Person/facet (contrato TASK-1367
  intacto).
- **Atomicity**: evidencia + representación se persisten en la tx del intake; reconciliación y corrección
  son commands CAS transaccionales.
- **Race protection**: compare-and-set sobre before-value; conflicto concurrente → `needs_review`, nunca
  last-write-wins; el apply histórico corre en lotes de 1 con cooldown.
- **Constraint coverage**: FKs de lineage exacto a `hiring_application`/`identity_profiles`; audit
  append-only (anti-UPDATE/DELETE); `reviewState` con dominio cerrado.
- **Verified by**: tests de concurrencia/replay contra PG real (invariante SQL live-testing ISSUE-071),
  migration up/down en DB efímera, queries de cardinalidad antes/después.

### Resilience

- **Failure handling**: clasificación fallida o ambigua nunca bloquea el submit público — el intake
  persiste evidencia y deriva a `needs_review`; el candidato jamás ve un error por casing.
- **Signals**: `hiring_candidate_identity_normalization_needs_review`,
  `hiring_candidate_identity_reconciliation_conflict`, `hiring_candidate_identity_remediation_failed` —
  sólo conteos/IDs internos, steady definido por señal.
- **Recovery**: flag OFF + redeploy revierte el writer nuevo (<15 min); rollback por registro vía CAS al
  before-value exacto desde ledger/snapshot; filas aditivas quedan inertes y auditables.
- **Audit trail**: evidencia por aplicación + audit append-only de toda reconciliación/corrección/apply
  con actor, reason, versión y hashes.

### Scalability

- **Hot path Big-O**: O(1) por intake (normalización local + un CAS); sin llamadas externas ni provider.
- **Volumen**: 53 aplicaciones hoy; el diseño es lineal por intake y el backfill es bounded por
  allowlist — 10x cohortes no cambia el diseño.
- **Index coverage**: lookup por `applicationId`/`identityProfileId` cubierto por FKs/índices de la
  migración Slice 2; searchKey indexable para búsqueda interna futura sin tocar evidencia.
- **Versionado**: `normalizationVersion` permite evolucionar el algoritmo re-derivando display/search sin
  migrar evidencia ni re-escribir historia.

---

## Consecuencias

### Positivas

- Los emails y superficies internas dejan de mostrar "valentina villa": display digno por construcción,
  sin destruir lo que la persona escribió.
- El sticky name queda cerrado con reglas explícitas y auditables; una persona puede mejorar su propio
  nombre re-aplicando (camino `high_confidence`).
- Full API Parity desde el nacimiento: Careers, Growth Forms, CLI/App API y futuros agentes consumen el
  mismo primitive; la corrección es compatible con `propose → confirm → execute`.

### Negativas

- Más superficie de estado (evidencia + representaciones + audit) que mantener consistente con
  `identity_profiles`.
- El corpus multicultural y los property tests son trabajo real y permanente: cada regla nueva de casing
  exige casos ejecutables.

### Neutrales / estructurales

- La UI de corrección manual (Application 360 / People 360) queda deliberadamente fuera: follow-up
  `ui-ux` consumer del mismo command.
- El hardening genérico de Growth Forms fuera de los campos Hiring y el filename del CV siguen siendo
  follow-ups separados.

---

## Hard rules

- **NUNCA** mutar, reescribir ni borrar la evidencia submitted de una aplicación; display y searchKey son
  las únicas capas derivadas y siempre versionadas. **NUNCA** un `Title Case` ciego ni reglas
  anglocéntricas como fuente de verdad.
- **NUNCA** aplicar casing automático fuera de la clasificación `high_confidence` de la policy versionada;
  ambigüedad = `needs_review`, no adivinanza. **NUNCA** reordenar apellido/nombre, re-segmentar tokens ni
  transliterar escrituras no latinas.
- **NUNCA** refrescar `identity_profiles.full_name` por last-write-wins: sólo
  `reconcileCandidateIdentityDisplayName` con email/ID authoritative, before-value CAS y las
  precondiciones de D3; una corrección humana (`corrected`) siempre gana sobre cualquier automatismo.
- **NUNCA** usar searchKey (ni ninguna representación de nombre) sola para fusionar o resolver una
  Person; email/`identity_profile_id` son lo único authoritative. Casing o whitespace jamás crean otra
  identidad.
- **NUNCA** ejecutar remediación histórica sin dry-run vigente + allowlist humana exacta + before-value
  CAS + actor/purpose + lotes bounded + rollback ensayado en staging; **NUNCA** un `UPDATE` SQL manual
  sobre PII como camino operativo. El flag por sí solo no autoriza backfill.
- **NUNCA** incluir nombres, correos, teléfonos, URLs ni payloads crudos en logs, eventos, métricas,
  errores, fixtures compartidos o reportes de dry-run; sólo IDs internos, hashes, conteos y códigos.
- **NUNCA** canonicalizar semánticamente texto libre (`message`, respuestas abiertas): candidate-authored,
  sólo límites de tamaño/seguridad. **NUNCA** inferir calling code desde el país de residencia ni país
  desde IP/teléfono/correo; **NUNCA** truncar un país a 2 chars (`'Chile'.slice(0,2)` = Suiza).
- **SIEMPRE** persistir la evidencia de cada aplicación aunque el display no se refresque; **SIEMPRE**
  derivar a `needs_review` (fail-closed a humano) ante conflicto, clasificación dudosa o fallo de CAS,
  sin bloquear el submit público.
- **SIEMPRE** registrar `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` (default OFF) en el ledger con
  runtime ownership en el mismo PR que lo declara, y mapear los read-sites por grep antes de cualquier
  flip.
- **SIEMPRE** que el algoritmo de normalización cambie, incrementar `normalizationVersion` y re-derivar;
  jamás editar in-place una representación histórica ni el audit.

---

## Delta 2026-08-16 — Enmiendas por auditoría doble (TASK-1736)

Correcciones y notas registradas tras la auditoría doble del código de Slices 1-4; ninguna cambia las
sub-decisiones D1-D6, sólo las precisan contra el runtime real:

1. **D5 `availability` — enmienda (fallback tolerante implementado, rechazo duro diferido).** La matriz
   D5 declara `unknown → reject con code canónico`, pero la implementación de Slice 1
   (`src/lib/hiring/candidate-intake/availability.ts`) aplica deliberadamente un **fallback tolerante
   documentado en el propio código**: "un valor fuera del catálogo se CONSERVA como texto acotado y NO
   rechaza la postulación — el intake público jamás pierde una application por esto. El rechazo duro
   queda diferido a cuando exista la evidencia application-scoped (Slice 2) para no perder el dato
   authored". Este delta es la posture vigente; promover el `reject` duro es un follow-up explícito, no
   un default.

2. **Semántica del primitive 360 `createIdentityProfile` — cambio para TODOS los consumers (A3).** El
   estrangulamiento del sticky name cambió el `ON CONFLICT (profile_id) DO UPDATE` a
   `full_name = COALESCE(full_name existente, EXCLUDED.full_name)`: **preserva** el nombre vigente y
   sólo llena vacíos. Esto aplica a **todos** los consumers del primitive — HubSpot contacts, finance
   suppliers, org memberships, no sólo Hiring: un rename en el sistema externo **ya no refresca**
   `full_name` por esa vía. El refresh legítimo requiere un camino de reconcile propio por dominio
   (hoy sólo existe el de Hiring, `reconcileCandidateIdentityDisplayName`); extenderlo a los demás
   dominios queda declarado como follow-up.

3. **Riesgo residual aceptado (procedimental): `plan → apply` encadenable sin revisión.** El contrato
   programático no impide que un operador encadene el output del dry-run directo al apply sin podar la
   allowlist: la revisión humana línea a línea es un **gate procedimental** (runbook + manual), no un
   gate mecánico. Mitigado por: apply exige actor + reason persistidos en el audit, lotes de 1, CAS,
   re-derivación de la propuesta (drift ⇒ `needs_review`) y rollback per-record. Aceptado como riesgo
   procedimental; un gate mecánico (p. ej. firma humana del archivo) sería follow-up si el volumen crece.

4. **Nota A7 — qué compara realmente el CAS del apply.** El compare-and-set del reconcile compara
   contra el `full_name` **vigente en DB bajo `FOR UPDATE`**, no contra el `beforeFullName` del
   dry-run: si el nombre cambió entre dry-run y apply hacia otra forma del MISMO nombre (mismos tokens
   bajo searchKey), el guard de discrepancia sustantiva no dispara y el apply puede materializar la
   propuesta re-derivada. El riesgo queda acotado por el searchKey guard (tokens distintos ⇒
   `needs_review`), por la re-derivación de la propuesta desde el before aprobado
   (`allowlist_proposal_drift`) y porque una corrección humana intermedia siempre gana.

5. **Remediación — contrato completado (A1/A2/A6).** (a) El apply persiste `actor_user_id` y el motivo
   operativo en la fila de audit del reconcile (fuente `reconcile`; el CHECK lo permite) — el "quién/por
   qué" del backfill histórico queda auditado, no sólo validado. (b) Existe
   `rollbackCandidateIdentityRemediation({auditId, actorUserId, reason})` (CLI `--rollback <auditId>`):
   CAS que restaura el `before_full_name` del audit `reconcile`+`applied` SOLO si el vigente sigue
   siendo su `after_full_name`; la reversión se registra como corrección humana (`source='human'`) y
   una discrepancia deriva `needs_review` sin mutar. (c) El retry de un apply exitoso es idempotente:
   `skipped (already_canonical)` cuenta como estado prometido y no aborta.

6. **Edge del display vacío (A5).** Si la normalización estructural deja el nombre vacío (input sólo
   controles/zero-width), el display materializa el placeholder neutro del dominio (`Candidato`) con
   clasificación `needs_review` — jamás el submitted crudo (display invisible). La evidencia raw se
   conserva intacta.

## Open Questions (deliberadamente no decidido)

1. **Capability de corrección operador**: si la corrección manual reusa una capability existente de
   identidad o necesita una capability fina nueva (nunca un rol admin-coarse como contrato); la resuelve
   el discovery de Slice 2 contra el catálogo real de entitlements, con registry + grants + coverage test
   en el mismo PR si nace una nueva.
2. **Shape exacto de la tabla de evidencia** (nombre, columnas, si las representaciones viven en la misma
   fila o en tabla hermana): lo fija la migración de Slice 2 dentro del placement ya decidido
   (application-scoped en `greenhouse_hiring`, FK a `hiring_application`, audit append-only separado).
3. **Evento outbox IDs-only vs sólo audit local** para reconciliaciones/correcciones: se decide en
   Slice 2 según si algún consumer downstream real lo necesita; el default es audit local sin evento.
4. **Umbral y corpus final `high_confidence`**: las reglas conservadoras de D2 son el contrato; el corpus
   ejecutable exacto (casos, partículas adicionales por idioma, límites de longitud) se fija en Slice 1 y
   cualquier ampliación de elegibilidad es una versión nueva de la policy, no una edición.
5. **Adapter del backfill** (CLI operator-authenticated vs App API interna): lo confirma el discovery de
   Slice 3; el contrato gobernado (dry-run/apply/rollback con allowlist) es el mismo en ambos casos.

## Referencias

- [`TASK-1736`](../tasks/in-progress/TASK-1736-candidate-identity-intake-canonicalization-remediation.md) — spec + auditoría read-only 2026-08-16 (4/53 nombres anómalos; 53/53 emails canónicos)
- [`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`](GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
- [`GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`](GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md)
- [`GREENHOUSE_360_OBJECT_MODEL_V1.md`](GREENHOUSE_360_OBJECT_MODEL_V1.md)
- [`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
- [`agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`](agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md)
- [`GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`](GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md) — D5 (misma figura de autorización ejecutiva, `TASK-1734`)
- Runtime verificado: `src/lib/hiring/public-careers/schema.ts` (`parsePublicHiringApplication`) ·
  `src/lib/hiring/public-careers/submit-application.ts` · `src/lib/account-360/organization-store.ts`
  (`createIdentityProfile`) · `migrations/20260707235655376_task-353-hiring-ats-domain-foundation.sql`
- `docs/tasks/complete/TASK-1367-careers-apply-intake-service.md` · `TASK-1688` · `TASK-1318` ·
  `docs/tasks/to-do/TASK-1728-person-professional-profile-canonical-foundation.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
