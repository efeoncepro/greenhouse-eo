# TASK-1740 — Public Vacancy Content and Google JobPosting Foundation

## Delta 2026-08-17 (2) — Canon editorial v2 para todas las vacantes

El operador aprobó que la variación entre cargos viva en el contenido y no en la arquitectura de la página.
Esta task conserva ownership del contrato y evoluciona `PublicOpeningContent` a v2:

- diez regiones canónicas en orden estable: promesa/hero, rol, resultados, trabajo, encaje, evidencia, forma
  de trabajo, beneficios, proceso y compensación;
- `preferred` separado de `learnables`, colaboración operativa y proceso con propósito/timing/respuesta/
  accommodations como datos estructurados;
- contexto corporativo y beneficios globales de Efeonce resueltos desde una fuente central versionada, no
  copiados manualmente en cada opening;
- `additionalSections` limitado a tres bloques, con formatos `narrative|bullets|milestones`, sin HTML, CTA,
  layout, color ni posición arbitrarios;
- writes nuevos aceptan sólo v2 completo; el read path sigue entendiendo v1 y legacy. Un opening ya publicado
  con v1 queda grandfathered hasta su siguiente publicación, pero un publish/re-publish exige v2 y, para
  remoto, países elegibles explícitos;
- el operator/CLI deriva la prosa legacy desde v2 para que exista una sola verdad y el JSON-LD se construye
  desde el mismo contenido resuelto que aparece en HTML.

## Delta 2026-08-17 — Slices 1-4 code complete; rollout pendiente

**Estado: `code complete, rollout pendiente`.** Implementado local-first en `develop` (4 commits, sin push):

- **Slice 1** — `PublicOpeningContent` v1 (`src/lib/hiring/public-careers/public-content.ts`): write
  path estricto (422 `hiring_opening_public_content_invalid`) + read path leniente (corrupto/versión
  desconocida → `null` = fallback legacy). Compensación estructurada opcional (ISO 4217 + rango + unidad).
- **Slice 2** — Migración `20260817141406137` aplicada y verificada contra PG
  (`public_content_json` JSONB + `public_remote_eligible_countries` TEXT[] con CHECK alpha-2);
  `updateHiringOpening` re-valida siempre (países vía `isValidCountryCode`: `LATAM`/`Global` rechazados —
  verificado en vivo sobre draft `EO-OPN-0075` con cleanup); allowlist `buildPublicOpeningPayload`
  extendida (`content`, `remoteEligibleCountries`) con anti-leak test de set cerrado + sentinels.
  El `PATCH /api/hiring/openings/{id}` transporta los campos nuevos sin cambio de ruta (parity).
- **Slice 3** — `job-posting.ts` (server-only, puro, fail-closed): remota exige países elegibles
  (TELECOMMUTE + applicantLocationRequirements), híbrida/presencial exige city+country (jobLocation);
  baseSalary sólo estructurado; sin `directApply`/`validThrough`; `employmentType` mapeo exacto
  conservador; `hiringOrganization` desde brand SSOT (`EFEONCE_BRAND_NAME` nuevo). Canonical explícito
  en la leaf publicada (sin flag); schema detrás de `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED`
  (Vercel-only, default OFF, fila en ledger). Runtime local verificado: canonical presente, cero
  `ld+json` con flag OFF, vacante cerrada → 404.
- **Slice 4** — Fixture canónica para TASK-1741 (`editorial-opening.fixture.ts`, self-verificada por
  test), ADR delta 2026-08-17 en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`, doc funcional
  `careers-publicas.md` §Contenido estructurado y SEO técnico, manual
  `operar-careers-publicas.md` §Contenido estructurado y schema (incluye runbook de decisión
  sitemap/Indexing API), delta en TASK-1741.

**Open Questions resueltas:** (1) `hiringOrganization` = marca Efeonce (`EFEONCE_BRAND_NAME` +
`EFEONCE_URL_HTTPS` del SSOT), no la razón social; (2) remota sin países normalizados → **omitir
schema, no bloquear publicación** (bloquear rompería re-publicar los 2 openings vivos, ambos `LATAM`);
(3) `validThrough` → se omite (no existe expiración real; el retiro es el 404 del unpublish).

**Rollout pendiente (requiere push/deploy y un checkout compartido sin cambios ajenos):**

1. ~~Confirmar países elegibles~~ **CUMPLIDO 2026-08-17**: el CEO (máxima autoridad de decisión)
   aprobó **20 países** — toda Latinoamérica **excepto Cuba** (AR BO BR CL CO CR DO EC SV GT HN MX NI
   PA PY PE UY VE) + `US` + `ES` — y precisó la **vía contractual**: Chile con contrato laboral local
   y, fuera de Chile, vía internacional con **pago directo de Efeonce** (contract type
   `international_internal`, sin EOR). Ambas vacantes publicadas quedaron seteadas vía
   `updateHiringOpening` con los 20 países y con `content.remoteModel` declarando esa vía en el
   contenido visible (para `EO-OPN-0009` incluye husos/idioma que su demand ya traía; `EO-OPN-0061`
   no los declara y no se inventaron).
   **Evidencia de artefacto real (flag prendido temporalmente en local, luego restaurado a OFF):** el
   JSON-LD renderizado de ambas vacantes valida — `@type: JobPosting`, `TELECOMMUTE`, 20 países sin
   Cuba, `hiringOrganization: Efeonce`, canonical correcto, `employmentType: FULL_TIME` en 0009 y
   omitido en 0061 ("Contrato indefinido" no declara jornada), **cero campos requeridos faltantes**,
   sin `directApply`/`validThrough`/`baseSalary`, escape anti-cierre de script presente. Con el flag
   de vuelta en OFF el gate cierra (0 `ld+json`).
   **Bug cazado y corregido con ese caso real:** un bloque estructurado PARCIAL (sólo `remoteModel`,
   sin narrativa núcleo) hacía que `buildDescriptionHtml` dejara de usar la prosa legacy y la
   descripción del schema quedara reducida a ese único párrafo. Ahora un bloque parcial
   **complementa** la prosa y sólo un bloque con narrativa núcleo (`promise`/`intro`/`outcomes`/
   `workItems`) la reemplaza; si el bloque ya cubre habilidades, los requisitos legacy se omiten para
   no duplicar. Con test propio en ambas direcciones (descripciones reales: 1365 y 3296 caracteres).
2. Push/release conjunto; prender primero `CAREERS_DETAIL_EDITORIAL_V2_ENABLED` en staging, verificar
   HTML visible y después prender `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` → Rich Results Test →
   producción (secuencia en el manual §Prender el schema JobPosting). **La precondición de código ya
   quedó cumplida por TASK-1741:** el view model y el renderer consumen `publicContent` v2 y muestran
   la misma evidencia usada por JSON-LD. El interlock técnico conserva el orden fail-closed: el schema
   nunca retorna ON si el renderer editorial está OFF.
3. Smoke lifecycle en runtime desplegado: validar HTML/schema/canonical → pausar → 404 sin schema.
4. ~~`pnpm build` de producción~~ **autorizado y ejecutado 2026-08-17** (resultado en el delta de
   evidencia).

Evidencia local: `pnpm test` full **1522 files / 11498 tests verdes** (2026-08-17); `pnpm local:check`
verde por slice; suite `public-careers` 71 passed.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Code complete; migraciones aplicadas; rollout conjunto con TASK-1741 pendiente`
- Rank: `TBD`
- Domain: `hr|growth|data`
- Blocked by: `none`
- Branch: `develop (checkout compartido; sin worktrees)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Modelar la información pública de una vacante como contenido candidato-facing verificable y usar esa misma proyección allowlist-safe para emitir JSON-LD `JobPosting` correcto. La base elimina el parser frágil de texto libre como única fuente, protege datos internos y deja al render editorial de TASK-1741 consumir un contrato estable.

## Why This Task Exists

La página pública hoy deriva casi toda su narrativa desde párrafos y listas heurísticas (`view-model.ts`), limita chips y no puede distinguir una promesa, resultados, condiciones remotas o beneficios aprobados. Tampoco publica `JobPosting` JSON-LD, canonical explícito ni una estrategia verificable para publicar/retirar URLs de empleo ante Google. Resolverlo en el renderer mezclaría persistencia, publicación e indexación con UI; por eso esta es la fundación backend/data separada.

## Goal

- Definir una proyección pública estructurada, mínima y extensible para contenido de vacantes, sin ampliar por accidente el allowlist público.
- Generar `JobPosting` desde la misma evidencia visible y cumplir las reglas de Google para empleo remoto, salario y lifecycle.
- Entregar readers, publicación y pruebas que permitan a TASK-1741 renderizar el contenido sin heurísticas nuevas ni fuga de información interna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- La única salida candidata-facing es una proyección explícita allowlist-safe; nunca serializar `hiring_opening` ni el brief interno hacia el navegador.
- El HTML visible y el JSON-LD nacen del mismo reader/proyección. No existe un segundo texto SEO que pueda prometer hechos distintos.
- `JobPosting` sólo se publica en la URL leaf de una vacante publicada; al cerrar/pausar, la URL deja de exponer schema y conserva el lifecycle público honesto actual (404), sin TTL inventado.
- Una vacante `100% remote` declara elegibilidad por país concreto para schema. `Global`, `LATAM` o una región sin país no habilitan `jobLocationType: TELECOMMUTE` hasta resolver datos admisibles.
- No marcar `directApply` mientras el flujo tenga un paso intermedio detail → formulario; no inventar `baseSalary`, beneficios, país, compensación ni condiciones de contrato.

## Normative Docs

- `docs/documentation/hr/careers-publicas.md`
- `docs/tasks/complete/TASK-1371-hiring-vacancy-publication-desk.md`
- `docs/tasks/complete/TASK-354-public-careers-portal.md`
- [Google: JobPosting structured data](https://developers.google.com/search/docs/appearance/structured-data/job-posting)
- [Google: Indexing API for JobPosting](https://developers.google.com/search/apis/indexing-api/v3/using-api)

## Dependencies & Impact

### Depends on

- Publicación, allowlist y rollback ya materializados en `src/lib/hiring/publication.ts` y `src/lib/hiring/vacancy-publication-operator.ts`.
- DTO público `PublicOpeningPayload` en `src/types/hiring.ts` y reader `src/lib/hiring/public-careers/view-model.ts`.
- `TASK-1371` conserva el desk/command de publicación; esta task lo extiende, no crea un publish paralelo.

### Blocks / Impacts

- Bloquea `TASK-1741`, que sólo consume el nuevo contrato y no escribe esquema ni JSON-LD.
- Impacta la URL pública `/public/careers/[publicId]`, su metadata/canonical y el ciclo published → paused/closed.
- No modifica el formulario `/public/careers/[publicId]/apply`, sus campos ni su submit path.

### Files owned

- `src/lib/hiring/publication.ts`
- `src/lib/hiring/public-careers/**`
- `src/lib/hiring/vacancy-publication-operator.ts`
- `src/types/hiring.ts`
- `src/app/public/careers/[publicId]/page.tsx`
- `migrations/**` y tests focales de Hiring/Careers, sólo si discovery confirma persistencia nueva
- `docs/documentation/hr/careers-publicas.md`

## Current Repo State

### Already exists

- `PublicOpeningPayload` contiene título, resumen, descripción, requisitos, ubicación, modalidad, seniority, compensación opcional, proceso y URL de postulación; `buildPublicOpeningPayload` opera como allowlist.
- `CareersDetailView` y `view-model.ts` obtienen `descriptionParagraphs`, listas y chips a partir de texto público. El máximo actual de chips es cuatro y la extracción de responsabilidades es heurística.
- La despublicación usa `unpublishOpening`, cambia visibilidad a `internal_only` y el reader público devuelve `null`, que el route convierte en 404.

### Gap

- No hay campos/contrato para promesa al candidato, resultados esperados, modelo remoto operativo, evidencia/portafolio, beneficios publicados ni secciones separadas de must-have/learnable.
- No hay JSON-LD `JobPosting`, canonical explícito, prueba de equivalencia HTML/schema ni decisión documentada de sitemap/notificación a Google.
- La elegibilidad remota está hoy como texto libre (`public_hiring_region`), insuficiente para representar de forma fiable `applicantLocationRequirements`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/hiring/public-careers/view-model.ts`.
- Future candidate home: `public`
- Boundary: `buildPublicOpeningPayload` y el reader público son el único contrato entre opening privado, página, metadata y futuros consumers de indexación.
- Server/browser split: schema, allowlist, URLs y datos de publicación se resuelven sólo en server; el navegador recibe únicamente el payload público tipado.
- Build impact: `none` — no introducir SDK de Google, crawler ni dependencia pesada.
- Extraction blocker: transacción de publicación, políticas de visibilidad y el mismo DB/runtime de Hiring exigen permanecer en el dominio actual.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration|reader|command`
- Source of truth afectado: `hiring_opening` y su proyección pública allowlist-safe
- Consumidores afectados: `public UI|metadata/JSON-LD|Hiring Publication Desk|sitemap/operación SEO`
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `src/types/hiring.ts` (`PublicOpeningPayload`), `src/lib/hiring/publication.ts`, `src/lib/hiring/public-careers/view-model.ts` y `src/app/public/careers/[publicId]/page.tsx`.
- Contrato nuevo o modificado: un bloque tipado de contenido público, un builder de `JobPosting` server-only y, si discovery lo valida, extensión versionada del command/DTO de publicación.
- Backward compatibility: `gated` — campos nuevos opcionales al inicio; openings previos conservan fallback de contenido legado y no se publica schema inválido.
- Full API parity: la extensión de contenido viaja por el command canónico `updateHiringOpening`/publicación y por readers; no se permite un write desde el renderer ni una tabla leída ad hoc.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_opening` y la proyección pública derivada; nombres/forma final se deciden tras discovery de schema/migraciones existentes.
- Invariantes que no se pueden romper:
  - Todo dato nuevo público entra por allowlist explícito y posee test negativo contra sentinels internos (`budget_band`, `risk_notes`, owner, referencias de cliente y notas internas).
  - Cada propiedad requerida por `JobPosting` refleja contenido visible y factual de la misma vacante publicada.
  - Remote-only usa `TELECOMMUTE` sólo si es 100% remoto y tiene uno o más países elegibles normalizados; de otro modo omite el schema remoto o bloquea la publicación hasta corrección, según decisión de discovery documentada.
  - `baseSalary` se omite salvo rango monetario aprobado, estructurado y aplicable; beneficios no son compensación salarial.
- Tenant/space boundary: la apertura se identifica por `public_id` sólo después de pasar las reglas de publicación; el reader no acepta un ID interno como bypass.
- Idempotency/concurrency: el update de contenido usa el command canónico y las precondiciones/versión del opening ya vigentes; el builder schema es puro y determinista por payload.
- Audit/outbox/history: las mutaciones conservan el audit/outbox existente de Hiring; no emitir evento nuevo para serialización read-only salvo que discovery pruebe la necesidad de un consumer de sitemap.

### Migration, backfill and rollout

- Migration posture: `additive` — preferir JSON estructurado validado o columnas explícitas según patrón real del schema; nunca reinterpretar/destruir el copy legado.
- Default state: `read-only` para openings existentes; contenido nuevo es opcional y el renderer conserva fallback hasta el rollout de TASK-1741.
- Backfill plan: no backfill automático de copy semántico. Inventariar openings publicados, aplicar sólo una revisión humana/allowlist y conservar el texto original como fallback.
- Rollback path: revertir consumer/flag de lectura y mantener columnas/campos aditivos; revertir publication draft si la validación rechaza schema o contenido.
- External coordination: confirmar con SEO/People los países elegibles, entidad empleadora/brand y datos de compensación antes de habilitar propiedades correspondientes. La notificación mediante Indexing API requiere autorización, quota y decisión posterior; no se implementa en esta task.

### Security and access

- Auth/access gate: las mutaciones siguen las capabilities de `hiring.opening.write`/publicación existentes; lectura pública sólo de `publication_status` publicado y visibilidad pública.
- Sensitive data posture: PII y datos internos no salen de la proyección; no se exponen secretos ni datos de postulaciones.
- Error contract: mantener códigos canónicos de publicación y `notFound` público; logging interno con IDs, sin volcar el payload completo ni errores raw en HTML.
- Abuse/rate-limit posture: `none with rationale` — es una lectura pública SSR existente; no agregar endpoint de escritura ni integración externa en V1.

### Runtime evidence

- Local checks: unit tests de allowlist, normalizador/validador, JSON-LD, metadata y casos negativos de leakage; typecheck/lint.
- DB/runtime checks: migración aditiva en staging y lectura de una vacante publicada existente + una sin campos nuevos; confirmar que pausada/cerrada responde 404 y no imprime JSON-LD.
- Integration checks: Rich Results Test sobre staging y producción tras deploy; inspección de HTML server-rendered, canonical y schema, sin asumir que Google indexará de inmediato.
- Reliability signals/logs: errores de publicación/validación existentes; añadir telemetría sólo si el patrón actual tiene nombre/casa canónica, sin crear tracking paralelo.
- Production verification sequence: publicar una vacante de prueba aprobada → validar HTML/schema/canonical → pausar/despublicar → validar 404 y ausencia schema → restaurar sólo mediante command canónico. Evaluar sitemap/Indexing API como follow-up autorizado.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk. _(aditiva, sin backfill de copy, Down completo)_
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling. _(information_schema + write→read vivo + curl local)_
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks. _(422 canónico + anti-leak sentinels)_

## Capability Definition of Done — Full API Parity gate

`N/A — no capability nueva para el candidato.` La task extiende una capability de publicación existente: cualquier write de contenido usa su command/authorization/audit actual; la serialización `JobPosting` es una proyección server-side pura y no una acción de negocio nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Evidence and public content contract

- Confirmar el schema, el command, los permisos y el conjunto mínimo de datos operacionalmente verificables para una vacante remota.
- Diseñar la extensión public-safe con validación: promesa/intro, resultados, trabajo, essential/learnable skills, evidencia, modelo remoto, proceso y beneficios aprobados cuando apliquen.

### Slice 2 — Publication/read model and legacy compatibility

- Implementar la migración/DTO/command/read model y sus pruebas de allowlist, acceso y fallback para openings actuales.
- Añadir validación de elegibilidad por país para el uso remoto de schema, sin convertir texto regional libre en un hecho legal.

### Slice 3 — Metadata, structured data and lifecycle validation

- Generar canonical y `JobPosting` sólo para leaf pages publicadas desde el mismo payload visible.
- Probar requisitos/casos negativos de Google, HTML seguro de descripción, salario opcional, ausencia de `directApply` y retiro de schema al despublicar.

### Slice 4 — Operational handoff

- Documentar la operación de sitemap/validación y un runbook de decisión para Indexing API; dejar esa integración externa fuera hasta contar con autorización y quota.
- Entregar fixture/lectura apta para el renderer de TASK-1741 y declarar los campos que requieren aprobación humana antes de publicación.

## Out of Scope

- Rediseño visual, JSX, CSS o CTA de `/public/careers/[publicId]` (TASK-1741).
- Cualquier modificación del formulario de postulación, sus campos, submit, consentimientos o journey.
- Indexing API, service accounts, quotas, credenciales Google o promesa de indexación/rich result.
- Copiar texto inventado desde IA o hacer backfill automático de condiciones, beneficios, compensación, países o modalidad contractual.
- Analytics nuevo de view-to-apply; requiere contrato de tracking y task propia.

## Detailed Spec

La taxonomía pública se debe decidir desde evidencia real, no como un segundo ATS. Priorizar un bloque versionable cuya presencia sea explícita y que el Publication Desk pueda validar: `candidate promise`, `intro/mission`, `outcomes`, `work/deliverables`, `essentials`, `learnables`, `evidence ask`, `remote working model`, `process` y `benefits`. Cada campo debe definir si es obligatorio, opcional u omitible; el renderer no debe convertir su ausencia en huecos.

Para JSON-LD, implementar un builder server-only y testeado. Debe usar el `title`, descripción completa visible con HTML seguro, `datePosted`, `hiringOrganization`, URL canónica, ubicación válida y condiciones remote/salary sólo cuando procedan. El escape/normalización de HTML no puede volver la descripción visible distinta de la declarada. Si la aplicación sigue una navegación adicional, no emitir `directApply: true`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4.
- No habilitar consumo editorial de campos nuevos ni publicar JSON-LD remoto antes de que Slice 2 pruebe allowlist, fallback y elegibilidad.
- El renderer de TASK-1741 depende del contrato/fallback de Slice 2; el rollout visual puede correr sólo después de la evidencia de Slice 3.

### Risk matrix

| Riesgo                                      | Sistema           | Probabilidad | Mitigation                                                                    | Signal de alerta                            |
| ------------------------------------------- | ----------------- | ------------ | ----------------------------------------------------------------------------- | ------------------------------------------- |
| Fuga de datos internos por extensión de DTO | API / UI pública  | medium       | allowlist campo a campo + sentinels negativos + revisión de HTML SSR          | test de leakage o propiedad no esperada     |
| Schema inválido o contradictorio            | SEO / UI pública  | medium       | builder puro desde payload visible + fixtures Google + Rich Results Test      | error de Rich Results / mismatch HTML       |
| Remote global sin país elegible             | publicación / SEO | high         | validación explícita y bloqueo/omisión documentada; confirmación People/Legal | fallo de publicación o campo remote omitido |
| Regresión de opening legado                 | Careers           | medium       | fields opcionales + fallback probado + feature flag del consumer UI           | snapshot/GVC o reader vacío                 |
| URL cerrada aún indexable con schema        | SEO               | low          | prueba lifecycle published/paused/closed y 404                                | HTML/schema accesible tras unpublish        |

### Feature flags / cutover

- Schema y campos nuevos se introducen de forma aditiva. La decisión de un flag server-side para activar `JobPosting` se toma en Discovery, reutilizando la infraestructura de flags existente si está disponible; no inventar un mecanismo nuevo.
- TASK-1741 define su propio flag de renderer. Revertir ese flag no borra campos ni cambia el lifecycle de publicación.

### Rollback plan per slice

| Slice | Rollback                                                                                                | Tiempo            | Reversible? |
| ----- | ------------------------------------------------------------------------------------------------------- | ----------------- | ----------- |
| 1     | Abandonar el draft de contrato sin migration; conservar evidencia de discovery                          | inmediato         | sí          |
| 2     | Revertir reader/command consumer y dejar estructura aditiva sin lectura pública                         | < 15 min + deploy | sí          |
| 3     | Desactivar emisión de JSON-LD/canonical nuevo por flag o revert puntual; la URL y apply siguen operando | < 15 min + deploy | sí          |
| 4     | Revertir documentación/operación sin efecto runtime                                                     | inmediato         | sí          |

### Production verification sequence

1. Aplicar migration aditiva y tests en staging; confirmar payload de una vacante existente sin contenido nuevo.
2. Publicar una fixture revisada con países/condiciones reales; inspeccionar HTML SSR, canonical y JSON-LD.
3. Ejecutar Rich Results Test; comprobar que faltas de país/salario no generan propiedades falsas.
4. Pausar o cerrar la fixture con el command existente; confirmar 404 y ausencia de schema.
5. Repetir el smoke en producción sólo con vacante autorizada; guardar evidencia en task/handoff.

### Out-of-band coordination required

- People/Legal: países elegibles, entidad/relación contractual y aplicabilidad de beneficios.
- Growth/SEO: propiedad canónica del sitemap y autorización explícita si más adelante se habilita Indexing API.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El contenido público estructurado tiene owner, validación, fallback y pruebas de no leakage; no depende de heurísticas como única fuente. _(public-content.ts + anti-leak test extendido)_
- [x] Una vacante publicada genera canonical y JSON-LD válido desde el mismo contenido visible; vacantes legacy y sin datos remotos completos degradan sin schema falso ni páginas vacías. _(canonical verificado en runtime local; JSON-LD por tests — Rich Results en staging/prod pendiente de rollout)_
- [x] `JobPosting` remoto sólo se emite con países elegibles explícitos y no declara salario/directApply/beneficios como hechos cuando no existe aprobación estructurada. _(job-posting.test.ts 14 casos)_
- [x] Pausar/cerrar deja la vacancy fuera del reader público y sin schema; la aplicación y el formulario no fueron modificados. _(EO-OPN-0050 cerrada → 404 verificado; cero cambios en apply)_
- [x] TASK-1741 recibe contrato, fixture y fallback suficientes para implementar una UI sin tocar DB/publication. _(editorial-opening.fixture.ts + delta en su spec)_
- [x] `PublicOpeningContent` v2 exige el esqueleto editorial completo, acepta máximo tres extensiones tipadas y conserva lectura leniente de v1/legacy sin reinterpretar una versión desconocida.
- [x] El contexto corporativo y los beneficios estándar provienen de una fuente pública central; el monto de equipo permanece excluido y cada opening sólo puede añadir beneficios específicos aprobados.
- [x] El command de publicación rechaza publish/re-publish sin v2 completo y deriva summary/description/requirements/preferred/process legacy desde el mismo bloque, sin dos verdades editables.
- [x] Una vacante remota v2 no publica sin países elegibles ISO y el HTML/JobPosting incluyen la misma evidencia visible, incluidos bloques adicionales y beneficios resueltos.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- tests focales de `publication`, `public-careers`, DTO y metadata/JSON-LD
- migración/read smoke staging + prueba de lifecycle published → unpublished
- Rich Results Test e inspección HTML/canonical en staging y producción autorizada

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] La evidencia de Rich Results y el resultado real de lifecycle se adjuntaron sin afirmar indexación no verificada.

## Follow-ups

- Autorización/quota e implementación separada de Indexing API si Growth la aprueba.
- Analytics gobernado de detalle → apply, tras definir evento, consentimiento y owner.
- Perfiles de país/engagement si la estrategia global requiere mayor precisión legal/operativa.

## Open Questions

- ¿Qué entidad/brand debe poblar `hiringOrganization` y cuál es su URL/canonical final aprobada?
- ¿La publicación debe bloquear o simplemente omitir schema cuando una vacante remota no tiene países normalizados?
- ¿Qué campo de expiración real, si alguno, puede sostener `validThrough` sin engañar al candidato?
