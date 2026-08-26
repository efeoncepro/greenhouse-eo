# TASK-1718 — Hiring Candidate Review Packet and Delegated MCP Reader

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `targeted`
- UI ready: `no`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-011`
- Status real: `Operativa en producción para uso interno delegado: reader/proyección/provider ON, App API exacta y dos tools MCP verificadas con OAuth real sobre una application exacta; chunks/hash y deny no autenticado verdes. Permanece in-progress hasta documentar sign-offs Privacy/Security/Talent/Identity/MCP, prueba revoked/base-only y rollback/revocación ejercitados. H-10 CERRADO el 2026-08-26: el filtro stage se valida contra HIRING_APPLICATION_STAGES en el READER (no en la ruta, para que lo hereden todos los consumidores) y una etapa inexistente devuelve 400 hiring_application_stage_invalid nombrando las válidas, fallando ANTES de consultar la base. B2B continúa fuera de alcance.`
- Rank: `TBD`
- Domain: `hr|platform|identity|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; Efeonce MCP main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea una superficie interna, read-only y agent-safe para revisar una postulación completa —incluido el
texto minimizado de su CV— desde Codex, Claude u otro host compatible con MCP, sin automatizar el
navegador ni eludir Vercel. Greenhouse conserva el source of truth, autorización y auditoría; el gateway
`mcp.efeonce.org` sólo federa dos tools sobre readers canónicos mediante identidad humana delegada.

No asigna tests, no envía correos, no puntúa, no mueve etapas y no decide sobre candidatos. El CV y el
portafolio son evidencia no confiable: se entregan como datos, nunca como instrucciones para el agente.

## Why This Task Exists

La Application 360 ya permite a un operador autorizado abrir el CV dentro del portal (`TASK-1715`), pero
un agente que debe comparar candidatos no dispone de un contrato programático equivalente. Intentar
resolverlo con una sesión de browser crea tres defectos estructurales: acopla la operación al challenge de
Vercel, no preserva de forma demostrable la identidad y capability del humano en cada lectura, y obliga al
agente a interpretar HTML/PDF sin un DTO gobernado ni evidencia durable de acceso.

El atajo de entregar al gateway un token fijo de sistema tampoco es admisible. Un bearer compartido
convertiría al agente en un principal omnipotente, perdería atribución humana y ampliaría el blast radius de
los datos personales de candidatos. La vía correcta ya existe en forma embrionaria para sister platforms:
token exchange delegado, App API lane y reautorización downstream. Esta task lo extiende de manera
estrecha y preserva el contrato financiero existente sin reutilizar su scope.

Finalmente, `TASK-1608` y `TASK-1610` cubren agentes/read models de **Talent Assurance**, no el acceso
base a una postulación y su CV. Esta task crea esa fundación de Hiring sin emitir claims de “Verificado por
Efeonce”, sin calidad de contratación, sin outcome 30/60/90 y sin depender de las decisiones aún propuestas
de EPIC-038.

## Goal

- Exponer un reader canónico `candidate review packet` por `applicationId`, minimizado, paginado,
  reconstruible y consistente con Application 360.
- Materializar texto seguro del CV sólo después del scan limpio, con lineage por asset/hash/versión y sin
  persistir una segunda copia cruda o convertir la proyección en source of truth.
- Federar `hiring.applications.review.list` y `hiring.application.review_packet.get` en
  `mcp.efeonce.org` con identidad humana delegada, autorización fina y auditoría de cada lectura.
- Probar allow/deny/fault, anti-IDOR, no mezcla entre postulaciones, prompt injection, revocación y
  rollback antes de habilitar una vacante real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-22 — ADR del vocabulario de etapas y desenlace

Se aceptó `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (`Accepted`), primer ADR del vocabulario del pipeline. Fija **dos ejes**:
`stage` = dónde va la persona en el recorrido (6 valores, uno por columna; `closed` se queda y **es
escribible**) y **desenlace** = cómo terminó (`selected`, `backup_selected`, `not_selected`, `rejected`,
`withdrawn`, `unresponsive`) + **causa gobernada** obligatoria en `not_selected` (`capacity_filled`,
`opening_closed`, `process_cancelled`). Invariante como `CHECK`: **`stage='closed'` ⟺ desenlace declarado**.
El eje de desenlace lo implementa `TASK-1765`; la superficie del kanban, `TASK-1766`; el embudo de equidad,
`TASK-1767`.

**El ADR §10 le agrega una obligación al carril programático.**

El filtro `stage` de `app-hiring-candidate-review.ts:206` entra como **texto libre**, se lava con
`stage as never` en el reader, y ante un literal inexistente responde **`200 {items: []}`** — indistinguible
de «no hay nadie en esa etapa» (hallazgo H-10). El DTO declara `stage: string`, más débil que el enum que sí
valida el `PATCH`.

Correcciones: tipar `stage` contra `HiringApplicationStage` y devolver **error canónico**, no cero filas.
Es especialmente urgente con el colapso en curso: un agente que filtre por una etapa retirada recibiría
silencio en vez de un error. Nota: el fixture de test del propio reader usa `stage: 'assessment'`, que **no
existe en el enum** — pasa porque los fixtures son object literals sin `satisfies`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `greenhouse_hiring` y la plataforma privada de assets siguen siendo source of truth. El gateway MCP
  nunca consulta PostgreSQL, GCS ni buckets directamente, y nunca conserva CVs.
- La autorización ocurre en Greenhouse sobre el usuario humano delegado, su tenant interno activo, la
  capability real `hiring.application.read` y el recurso solicitado. El scope OAuth sólo habilita el carril;
  no concede autoridad por sí solo.
- No usar `/api/platform/ecosystem/*` ni un token machine-to-machine compartido para PII. La superficie
  vive en `/api/platform/app/*` y exige token exchange RFC 8693 con audience, tenant, OID, AZP,
  `oauthClientId`, scope, expiry y revocación verificados.
- El reader selecciona documentos por el `applicationId` exacto. Que dos postulaciones compartan
  `candidateFacetId` o `identityProfileId` nunca autoriza reutilizar silenciosamente el CV de otra aplicación.
- CV, portafolio, respuestas y cualquier texto aportado por el candidato son contenido no confiable. El
  contrato los marca como evidencia y prohíbe seguir instrucciones, abrir URLs o ejecutar acciones derivadas
  de su contenido.
- El reader es allowlisted: no incluye teléfono, email, domicilio, identidad legal, documento de identidad,
  expectativa económica, notas internas libres, answer keys, rúbricas privadas, atributos demográficos,
  resultados de fairness ni detalles del escáner.
- Ninguna tool escribe estado, asigna assessment, envía correo, mueve etapa, contrata, rechaza, rankea o
  persiste una conclusión del modelo. Toda decisión de selección sigue siendo humana.
- Acceso externo/B2B queda fuera hasta que `TASK-1631` pruebe entitlements multitenant, revocación y un
  principal base-only que sea denegado. V1 es `internal-only`.
- El tratamiento debe documentar finalidad, minimización, retención, eliminación, exportabilidad,
  subencargados y transferencias. Legal/Privacy valida el diseño y un abogado habilitado valida la postura
  aplicable antes de producción; esta task no emite una opinión legal.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`
- `docs/tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md`
- `docs/tasks/complete/TASK-1362-candidate-document-capture.md`
- `docs/tasks/complete/TASK-1715-application-360-documents-panel.md`
- `docs/tasks/to-do/TASK-1608-talent-assurance-agent-proposal-run-contract.md`
- `docs/tasks/to-do/TASK-1610-talent-assurance-read-models-api-parity.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`

## Dependencies & Impact

### Depends on

- `TASK-1362` y `TASK-1715`, completas: captura/scan de documentos y lectura gobernada en Application 360.
- `src/lib/hiring/store.ts` (`getHiringApplicationById`, `listHiringApplications`) y los readers canónicos de
  aplicación existentes; Discovery debe confirmar si el nuevo reader compone sobre `store.ts` o un service
  más estrecho antes de editar.
- `src/lib/hiring/documents/resolve.ts` (`resolveCandidateDocuments`) y
  `src/lib/hiring/documents/access.ts` (`canAccessHiringCandidateDocument`).
- `src/app/api/assets/private/[assetId]/route.ts`, sólo como contrato de bytes privado de Greenhouse; el
  gateway MCP no lo llama ni recibe URLs firmadas reutilizables.
- `src/lib/sister-platforms/mcp-token-exchange.ts` y
  `src/app/api/integrations/v1/sister-platforms/oauth/token/route.ts` como patrón de delegación existente.
- `src/lib/api-platform/core/app-auth.ts` y `runAppReadRoute` como boundary de la App API.
- `../efeonce-mcp/src/providers/types.ts`, `../efeonce-mcp/src/mcp.ts` y
  `../efeonce-mcp/src/config.ts` como contrato del gateway.

### Blocks / Impacts

- `TASK-1608`: puede consumir este packet para `Candidate Evidence Analyst`, pero no amplía sus permisos ni
  adelanta su contrato de claims/agentes.
- `TASK-1610`: debe reutilizar el reader/proyección de esta task en vez de crear otra lectura MCP de CV.
- `TASK-1631`: acceso futuro de clientes necesitará otro slice/decisión; esta task no lo declara resuelto.
- Application 360: se usa como fuente de paridad semántica; no se cambia UI ni se crea otro reader browser.
- `efeonce-mcp`: agrega un provider sensible, deshabilitado por defecto, sin cambiar su rol de gateway neutral.

### Files owned

- `src/lib/hiring/candidate-review/**` *(nuevo; reader, DTO, policy y chunk contract)*
- `src/lib/api-platform/resources/app-hiring-candidate-review.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/applications/review/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/applications/[applicationId]/review-packet/route.ts` *(nuevo)*
- `src/lib/sister-platforms/mcp-token-exchange.ts`
- `src/lib/hiring/documents/resolve.ts` *(sólo si extraer un primitive compartido evita duplicación)*
- `src/lib/sync/projections/**` *(consumer/materializador; ruta exacta se resuelve en Discovery)*
- `scripts/hiring/backfill-candidate-review-projections.ts` *(nuevo, dry-run por defecto)*
- `migrations/*candidate_document_review_projection*.sql` *(nuevo; nombre/orden real en Plan Mode)*
- `../efeonce-mcp/src/providers/greenhouse-hiring.ts` *(nuevo)*
- `../efeonce-mcp/src/config.ts`
- `../efeonce-mcp/src/mcp.ts`
- arquitectura, runbook, OpenAPI/contratos y manuales afectados en ambos repos

## Current Repo State

> Baseline de discovery preservado para explicar el gap original. El estado vigente de implementación está en
> `## Status` y `## Verification`; este bloque no debe usarse como readback de runtime.

### Already exists

- `resolveCandidateDocuments` compone archivos, links e identidad documental de un candidato, y
  `canAccessHiringCandidateDocument` exige usuario interno + `hiring.application.read`; los clientes son
  denegados.
- El upload público de CV acepta PDF, máximo 10 MB, y la plataforma de assets bloquea descargas mientras
  el archivo está pendiente o en cuarentena.
- Application 360 ya compone postulación, assessments, scorecards y documentos con lectores server-side.
- `GET /api/hiring/candidate-facets/[candidateFacetId]/documents` es un reader interno de portal, protegido por
  `hiring.application.read`; devuelve archivos/links y la identidad documental enmascarada. No extrae texto de CV,
  no es App API y no puede federarse.
- La revelación de documento de identidad usa un command separado, auditado, con
  `hiring.candidate.reveal_identity`; un provider no hereda esa capacidad. El panel/document reader de
  `TASK-1714`/`TASK-1715` fue incluido en production por `0fe2420ed894`, sin convertirlo en superficie agentic.
- El gateway MCP ya implementa OAuth/Streamable HTTP y providers read-only, pero no tiene provider Hiring.
- Greenhouse ya intercambia el token Entra de un usuario por un grant acotado para una sister platform. Ese
  código está estrechamente ligado al scope de fondeo de Globe y debe ampliarse sin romperlo ni generalizar
  autoridad.

### Gap

- No existe DTO agent-safe que permita leer una postulación completa sin filtrar PII/campos sensibles en el
  cliente MCP.
- No existe proyección de texto extraído del CV con lineage, redacción, chunking, freshness y propagación de
  eliminación. El PDF privado sólo puede abrirse como bytes.
- No existe scope delegado de lectura Hiring, App API resource ni provider MCP para esta capacidad.
- No hay audit trail que responda qué agente/usuario leyó qué postulación, con qué finalidad y qué clases de
  campos fueron expuestas.
- No hay tests adversariales que traten instrucciones incrustadas en CV/portafolio como prompt injection.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Greenhouse conserva readers, auth, datos y materialización; `../efeonce-mcp` conserva
  transporte, OAuth, discovery y routing MCP
- Future candidate home: `domain-package`
- Boundary: `listHiringApplicationsForReview` y `getHiringCandidateReviewPacket` son readers canónicos;
  App API los expone al provider `greenhouse-hiring`; sólo los dos tools declarados pueden consumirlos
- Server/browser split: la ejecución completa es `server-only`; DB, assets, subject tokens, texto del CV, secretos y policy no
  cruzan a bundles browser ni a HTML público
- Build impact: parser PDF server-side/worker por seleccionar en Slice 0; debe estar pinneado, entrar al
  lockfile y al build context de cada runtime consumidor; el gateway no incorpora parser ni SDK de storage
- Extraction blocker: autorización y transacción viven en Greenhouse; materialización depende del estado de
  scan y del asset privado; identidad OAuth y transporte viven en el gateway sister platform

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_hiring.hiring_application` + `greenhouse_core.assets` y relaciones
  documentales existentes; la proyección nueva es derivada, no autoritativa
- Consumidores afectados: Application/API parity, Codex, Claude y hosts MCP internos autorizados
- Runtime target: portal/Vercel, `ops-worker`, PostgreSQL y `mcp.efeonce.org`/Cloud Run

### Contract surface

- Contrato existente a respetar: readers Hiring/documentos, App API auth, sister-platform token exchange,
  MCP provider contract y capability `hiring.application.read`
- Contrato nuevo o modificado: dos readers, dos rutas App API, un scope delegado sensible, una proyección
  derivada/audit log y dos tools MCP read-only
- Backward compatibility: `gated`; todo es aditivo, provider y rutas sensibles nacen deshabilitados
- Full API parity: portal, Nexa/agentes y MCP consumen el mismo reader server-side; ningún consumer consulta
  tablas, bucket o parser directamente

### Data model and invariants

- Entidades/tablas/views afectadas: relaciones existentes de aplicación/documento/asset; nueva proyección
  `greenhouse_hiring.candidate_document_review_projection` y nuevo audit append-only
  `greenhouse_hiring.candidate_review_access_audit` — nombres finales sujetos a ADR/Discovery, sin crear
  aliases paralelos si ya existe un primitive equivalente
- Invariantes que no se pueden romper:
  - La aplicación sigue siendo el grain de revisión. `applicationId` y `assetId` deben corresponder
    exactamente; no hay fallback por persona/candidate facet.
  - La proyección se identifica por `asset_id + content_hash + extraction_version + redaction_policy_version`.
    Un hash distinto invalida el cursor y produce `review_packet_stale`, nunca mezcla versiones.
  - Sólo un asset en estado descargable/limpio puede producir texto. `pending`, `quarantined`,
    `legacy_unscanned` y `deleted` nunca exponen bytes ni detalle del scanner.
  - Se persiste sólo texto minimizado/redactado; no una copia cruda durable. El PDF original permanece en la
    plataforma privada de assets y conserva su lifecycle.
  - Eliminación/retención del asset invalida y elimina/tombstonea la proyección según policy; ningún índice,
    cache, log o trace puede conservar el contenido por fuera de ese lifecycle.
  - El DTO es allowlist estable; agregar un campo sensible exige cambio de contrato, threat model y negative test.
  - Un assessment/score es evidencia advisory; el packet no produce ranking, recomendación adversa ni decisión.
- Tenant/space boundary: el token exchange resuelve un usuario Greenhouse real; el downstream exige tenant
  interno activo y autoriza `hiring.application.read` contra el recurso. No se acepta tenant/account desde input.
- Idempotency/concurrency: materialización dedupe por clave de versión; consumer at-least-once e idempotente;
  lectura con `expectedContentHash`; audit de cada intento con correlation id único
- Audit/outbox/history: audit append-only de allow/deny con actor, workload, aplicación/asset opacos, purpose,
  clases de campos, policy/version, outcome y timestamp; nunca CV, PII, subject token, prompt ni respuesta del modelo

### Migration, backfill and rollout

- Migration posture: `additive` + backfill derivado, expand-first; no altera ni reescribe assets/aplicaciones
- Default state: `flag OFF`, worker en shadow/dry-run y provider MCP `disabled`
- Backfill plan: script dry-run por defecto, allowlist de opening/aplicación, batch acotado, checkpoint y reporte
  por estado; apply sólo tras aprobar muestras sintéticas y retención
- Rollback path: deshabilitar provider/rutas/consumer, revocar scope y detener backfill; conservar audit y tablas
  para investigación. La contracción/drop es follow-up posterior a la ventana de retención
- External coordination: Entra app/scopes/consent, secrets/redeploy del gateway, configuración del worker,
  revisión Talent + Identity + Platform + Security/Privacy y validación jurídica aplicable

### Security and access

- Auth/access gate: token exchange RFC 8693 exacto + `oauthClientId=efeonce-mcp-gateway` + scope propuesto
  `efeonce.mcp.hiring.read` → grant Greenhouse `hiring.candidate.review.read`; downstream además exige
  `hiring.application.read`, tenant interno y usuario activo. Los nombres se fijan en ADR antes de código
- Sensitive data posture: PII restringida de candidatos; salida minimizada y propósito obligatorio
- Error contract: `invalid_request | unauthorized | forbidden | not_found | document_unavailable |
  extraction_pending | ocr_required | review_packet_stale | rate_limited | dependency_unavailable`; sin raw
  errors, existencia ajena, scanner verdict, stack, token, bucket path ni SQL
- Abuse/rate-limit posture: rate limit por usuario/workload y opening, límite de filas/chunks/bytes por llamada,
  timeout end-to-end, sin retries sobre 4xx, circuit breaker ante fallos del provider y revocación inmediata

### Runtime evidence

- Local checks: unit/contract tests de DTO, auth, hash/cursor, parser, redaction y MCP schemas; fixtures PDF
  sintéticos sin datos reales
- DB/runtime checks: migration verify, dry-run/apply sobre fixtures, consulta de lineage/audit, eliminación y
  reintento idempotente con rol no-owner real
- Integration checks: initialize MCP real desde Codex y Claude, listar una opening de prueba, paginar un packet
  completo y comprobar deny con usuario interno sin capability y cliente externo
- Reliability signals/logs: `hiring.candidate_review_projection_failed`,
  `hiring.candidate_review_access_denied`, `hiring.candidate_review_packet_stale`,
  `mcp.greenhouse_hiring_provider_unavailable`; todas sin PII
- Production verification sequence: definida en rollout; no se usa PII en capturas, fixtures ni evidencia de CI

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] La lógica vive en readers/policy server-side, no en el provider MCP ni en una UI.
- [ ] La lectura está modelada como recurso por aplicación, no como fetch libre de assets o personas.
- [ ] Capability y grant a al menos un rol interno real se entregan juntos, con coverage y revocación probadas.
- [ ] El camino programático oficial es App API delegada → provider MCP; ecosystem token y acceso DB directo
  fallan por diseño.
- [ ] Un mismo primitive sirve Application/API parity, Nexa futuro y MCP sin duplicar reglas por consumer.
- [ ] `Parity check = SI`: el contrato gobernado incluye auth fina, purpose, audit, errores, límites y lifecycle.

## Hybrid Execution Justification

- Why not split: el cambio UI es una integración acotada del visor privado ya existente dentro del sidecar del
  Banco; separarlo dejaría el reader exacto implementado pero mantendría el defecto funcional que originó la
  auditoría —obligar al operador a abandonar el banco para comprobar el CV— y duplicaría el gate anti-mezcla.
- Primary execution profile: `backend-data`.
- Contract boundary: el portal sólo consume el reader exacto por `applicationId`; no interpreta assets, no extrae
  texto y no comparte el DTO agent-safe. App API/MCP permanecen como carril separado y minimizado.
- Risk controls: autorización server-side en cada lectura, anti-oracle, viewer privado reutilizado, flags MCP OFF,
  tests multi-application y GVC sin capturar texto ni PII de un CV real.

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

### Slice 0 — ADR, threat model y contrato de tratamiento

- Identificar/proponer ADR que extienda Hiring + App API + sister-platform bindings + MCP gateway sin crear
  source of truth, auth ni storage paralelo. Actualizar `DECISIONS_INDEX.md` sólo al aceptar la decisión.
- Registrar stakeholders y owners: Talent/People, Platform API, Identity, MCP Platform, Security/Privacy,
  Operations y asesoría jurídica aplicable.
- Completar STRIDE y abuse cases: token theft/passthrough, confused deputy, IDOR, candidate mixing, prompt
  injection, bulk enumeration, log leakage, stale grants, deletion gaps, parser bomb y cross-tenant access.
- Fijar purpose enum, field classification/allowlist, base/finalidad de tratamiento, retención, eliminación,
  exportabilidad, subencargados, residencia/transferencia y quién puede habilitar una opening.
- Evaluar parser PDF con fixtures hostiles y licencia/SBOM. OCR queda fuera de V1 salvo decisión separada con
  proveedor, DPA, región y retención aprobados.
- Gate: sin ADR aceptada, privacy/security sign-off, owner y contrato de deny no se inicia Slice 1.

### Slice 1 — Reader canónico de aplicaciones y review packet

- `listHiringApplicationsForReview({ openingId, stage?, cursor?, limit? })`: opening obligatoria, limit
  allowlisted y cursor opaco; devuelve sólo `applicationId`, display name mínimo, etapa, appliedAt, freshness y
  disponibilidad del packet.
- `getHiringCandidateReviewPacket({ applicationId, purpose, chunkIndex?, expectedContentHash? })`: compone
  opening/application facts, evidencia estructurada, links HTTPS allowlisted, assessment summaries existentes y
  un chunk de CV; no agrega evaluación ni inferencia.
- Estados documentales públicos al consumer: `pending | ready | unavailable | blocked | stale | ocr_required`.
  Nunca exponer proveedor, signature, malware name, finding code o ruta de storage.
- Filtrar CV por `document.applicationId === requestedApplicationId`. Si sólo hay CV de otra aplicación, retornar
  `unavailable` y dejar señal; jamás hacer fallback por candidato.
- Tests de allowlist campo a campo y snapshot que falla ante propiedades nuevas no clasificadas.

### Slice 2 — Proyección de texto de CV y lifecycle

- Migration additive para proyección versionada y audit append-only; índices concurrentes cuando aplique y rol
  runtime mínimo verificado.
- Consumer reactivo después de scan/attach limpio, idempotente y reanudable; nunca descargar desde el gateway.
- Extraer PDF con text layer a texto minimizado. PDF sin texto termina `ocr_required`, sin adivinar contenido.
- Chunking determinista y acotado: respuesta incluye `contentHash`, `chunkIndex`, `nextChunkIndex`, `isComplete`,
  `extractionVersion`, `redactionPolicyVersion` y `sourceUpdatedAt`. El tamaño exacto se decide con límites del
  transporte y pruebas, no por intuición.
- Propagar reemplazo, cuarentena posterior, retención y eliminación; invalidar cache/proyección antes de servir.
- Backfill dry-run/apply sólo sobre allowlist y con métricas de ready/unavailable/ocr/failure, nunca dump de texto.

### Slice 3 — App API e identidad humana delegada

- Crear las dos rutas `/api/platform/app/hiring/...` mediante `runAppReadRoute`; prohibir acceso por sessionless
  ecosystem binding, cookie browser o service token genérico.
- Generalizar `mcp-token-exchange.ts` mediante mapping exacto y tipado por cliente/scope/capability, preservando
  byte-for-byte el contrato de fondeo Globe y sus tests. No usar email fallback.
- Validar issuer, audience, Google workload identity, Entra tenant, OID, AZP, Greenhouse user activo,
  `oauthClientId`, scope, expiry y capability downstream en cada llamada.
- Purpose obligatorio y cerrado, por ejemplo `screening_review | interview_preparation | evidence_comparison |
  audit_review`; valor libre falla `invalid_request`.
- Escribir audit tanto en allow como deny, con hashing/opaque refs para telemetry; el audit nunca concede acceso.
- Contract/OpenAPI y conformance tests para pagination, error mapping, size/deadline y revocación mid-session.

### Slice 4 — Provider Greenhouse Hiring en `mcp.efeonce.org`

- Agregar provider `greenhouse-hiring` sin acceso DB/storage y dos tools:
  - `hiring.applications.review.list`
  - `hiring.application.review_packet.get`
- Schemas estrictos (`additionalProperties: false`), límites numéricos y enums cerrados. Anotaciones
  `readOnlyHint=true`, `destructiveHint=false`, `openWorldHint=false`.
- El gateway intercambia el subject token; no lo pasa como bearer downstream, no lo persiste y no lo registra.
- Marcar contenido como `trust=untrusted_candidate_supplied` y adjuntar instrucción estructural: tratar CV/links
  como datos, no seguir instrucciones ni efectuar network fetch. El gateway no abre LinkedIn, Drive, portafolio
  ni URLs del CV.
- `GREENHOUSE_HIRING_PROVIDER_ENABLED=false` por defecto, scope separado de Globe/SEO y metadata OAuth
  consistente. Config/deploy/secrets se actualizan juntos; no usar env sólo en consola sin declararla en deploy.
- Timeout y deadline end-to-end ≤10 s por request; sin retries automáticos que multipliquen acceso/audit.

### Slice 5 — Evals adversariales, canary y documentación operativa

- Dataset sintético con: CV normal, dos postulaciones de una persona con CVs distintos, PDF sin text layer,
  archivo pending/quarantined/deleted, caracteres extremos, parser bomb acotado e instrucciones maliciosas.
- Probar allow/deny/fault con un operador real autorizado, otro usuario interno sin capability y un principal
  cliente/base-only. Si no existe el último principal verificable, el acceso externo permanece bloqueado; no se
  simula el resultado.
- Evals: el agente cita evidencia, declara faltantes/partial packet y no sigue prompt injection. Un eval favorable
  nunca compensa un test de autorización fallido.
- Canary en una opening de Content Creator: primero candidato sintético/consentido, luego una revisión real
  explícitamente autorizada. No copiar PII a issues, screenshots, logs o fixtures.
- Manual para Codex/Claude con initialize OAuth, selección exacta de opening/application, paginación completa,
  interpretación de estados, abstención y procedimiento de reporte/eliminación.
- Runbook de kill switch, revocación, incidente de PII, reextracción, deletion propagation y audit readback.

## Out of Scope

- Bypass de Vercel, cookie harvesting, browser automation como API o entrega de URLs privadas permanentes.
- Acceso de clientes/externos/B2B; queda condicionado por `TASK-1631` y decisión separada.
- OCR de documentos escaneados, embeddings, vector store, búsqueda semántica o memoria durable del agente.
- Descarga/fetch server-side de LinkedIn, Drive, sitios de portafolio o cualquier URL aportada por candidato.
- Email, avance de etapa o asignación/recordatorio de tests (`TASK-1689` y assessment runtime son sus owners).
- Generar, verificar, suspender o revocar claims de Talent Assurance; outcome 30/60/90; quality-of-hire.
- Auto-score, ranking, shortlist, auto-reject, auto-hire, recomendación adversa o write-back de análisis del modelo.
- Documento de identidad, RUT/pasaporte o capability de reveal de `TASK-1714`.
- Sustituir el portal/Application 360 o replicar toda su UI en MCP.

## Detailed Spec

### DTO agent-safe V1

El packet usa allowlist positiva. Los nombres finales se fijan en Slice 0, pero la semántica mínima es:

```ts
type CandidateReviewPacketV1 = {
  contractVersion: 'v1'
  application: {
    id: string
    openingId: string
    openingTitle: string
    stage: string
    appliedAt: string
  }
  candidate: {
    displayName: string
  }
  evidence: {
    portfolioLinks: Array<{ label: string; url: string; trust: 'untrusted_candidate_supplied' }>
    assessmentSummaries: Array<{
      assessmentId: string
      templateVersion: string
      status: string
      score?: number
      reviewedByHuman: boolean
    }>
  }
  cv: {
    status: 'pending' | 'ready' | 'unavailable' | 'blocked' | 'stale' | 'ocr_required'
    trust: 'untrusted_candidate_supplied'
    contentHash?: string
    chunkIndex?: number
    nextChunkIndex?: number
    isComplete: boolean
    text?: string
    extractionVersion?: string
    redactionPolicyVersion?: string
    sourceUpdatedAt?: string
  }
  freshness: {
    assembledAt: string
    applicationUpdatedAt: string
  }
}
```

`displayName` es el único identificador humano admitido en V1 porque el trabajo es comparar postulaciones y el
operador debe poder distinguirlas. Email/teléfono no son necesarios para esa finalidad. Si una automatización
futura necesita contacto, debe usar otro command/capability y no ampliar este packet.

### Trust transition

```text
Codex/Claude (usuario Entra)
  -> mcp.efeonce.org valida OAuth + scope del provider
  -> RFC 8693 token exchange preserva sujeto humano y workload
  -> Greenhouse App API valida usuario interno + capability + recurso + purpose
  -> reader compone DTO allowlisted desde Hiring + proyección derivada
  -> gateway devuelve data no confiable, sin reautorizar ni reinterpretar
```

Ningún tramo acepta un tenant, candidate facet, asset path o capability declarado por el modelo. El único
selector sensible es `applicationId`, y Greenhouse resuelve todas sus relaciones server-side.

### Quality scenarios

- **Acceso válido:** un operador con capability solicita una postulación de una opening permitida; recibe el
  primer chunk en ≤10 s, pagina contra el mismo hash y cada intento aparece en audit sin contenido.
- **Revocación:** se revoca el rol durante una sesión MCP; la siguiente llamada falla `forbidden` aunque el access
  token siga vigente.
- **IDOR:** un usuario sin acceso presenta un `applicationId` conocido; recibe error no enumerable y ningún dato,
  mientras el deny queda auditado.
- **Staleness:** el CV se reemplaza entre chunks; el siguiente request con hash antiguo falla
  `review_packet_stale`, sin concatenar documentos.
- **Prompt injection:** un CV pide revelar secretos o abrir una URL; la tool lo marca como evidencia no confiable,
  el host no llama otras tools y el eval falla si la instrucción altera el comportamiento.
- **Deletion:** se elimina/expira el asset; la proyección deja de servirse dentro del SLA definido en Slice 0 y
  el test prueba que cache, reader y gateway no retienen texto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 → Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- Slice 0 **MUST** aceptar ADR, treatment contract, threat model y owners antes de schema, parser o scope OAuth.
- Slice 2 puede desplegar migration/worker con reader deshabilitado; ningún texto real se backfillea antes de
  pruebas sintéticas, deletion propagation y sign-off Privacy/Security.
- Slice 3 **MUST** probar allow/deny/revocation antes de conectar el gateway.
- Slice 4 nace disabled y no se habilita en producción antes del canary completo de Slice 5.
- `TASK-1608/1610` sólo pueden consumir este reader después del cierre; no bloquean esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Token fijo o scope amplio convierte al gateway en confused deputy | identity / MCP | high | delegación humana, audience/scope exactos, reauth downstream, provider OFF | `hiring.candidate_review_access_denied` + auth con actor ausente |
| IDOR o mezcla de CV entre postulaciones de la misma persona | Hiring / PII | medium | join exacto application↔document↔asset, 404/no-enumeration, fixture multi-application | `candidate_review_application_document_mismatch` |
| CV contiene prompt injection y provoca exfiltración/acciones | agent runtime | high | trust label, sin URL fetch, tools read-only, egress/tool evals | eval crítico `candidate_cv_prompt_injection` |
| Texto/PII aparece en logs, traces, audit o errores | observability | medium | content capture OFF, allowlist, hash refs, sentinel tests | PII sentinel gate / DLP alert |
| Parser consume memoria/CPU o procesa PDF hostil | worker | medium | size/page/time limits, aislamiento, dependency review, circuit breaker | `hiring.candidate_review_projection_failed` + resource saturation |
| Proyección sobrevive eliminación/retención del asset | privacy / DB | medium | lifecycle consumer, tombstone/delete test, reconciliation | `candidate_review_deletion_lag` |
| Documento cambia entre chunks y el agente mezcla versiones | API / correctness | medium | `expectedContentHash`, cursor versionado, fail stale | `hiring.candidate_review_packet_stale` |
| Consent/scope del cliente MCP concede lectura a principal no previsto | Entra / gateway | medium | scope dedicado, persona allow/deny real, review de grants | OAuth scope coverage canary |
| El análisis se interpreta como decisión automática | Hiring / governance | medium | tools read-only, no write-back, disclaimers y human-only decision | audit detecta intento de command inexistente |
| Dependencia gateway/Greenhouse falla y el host reintenta en bucle | reliability / cost | low-medium | deadlines, no retry 4xx, bounded retry 5xx, rate limit | `mcp.greenhouse_hiring_provider_unavailable` |

### Feature flags / cutover

- `HIRING_CANDIDATE_REVIEW_READER_ENABLED=false` controla rutas/reader en Greenhouse.
- `HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED=false` controla materialización/backfill en `ops-worker`.
- `GREENHOUSE_HIRING_PROVIDER_ENABLED=false` controla registro/exposición de tools en el gateway.
- Flags se registran en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` y en los deploy contracts de cada
  runtime en el mismo slice. `NODE_ENV` no distingue staging/production; Vercel usa `VERCEL_ENV`.
- Cutover: projection shadow → App API staging → provider policy-blocked → canary allow/deny → una opening
  allowlisted → internal general. No existe flip global inicial.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | superseder/rechazar ADR; no runtime | inmediato | sí |
| 1 | reader flag OFF + revert; sin writes | <5 min + redeploy | sí |
| 2 | detener worker/backfill; conservar proyección/audit para investigación; contracción posterior | <10 min | sí, datos derivados |
| 3 | reader flag OFF + revocar mapping/scope + redeploy; preservar contrato Globe | <10 min | sí |
| 4 | provider flag OFF + redeploy gateway | <5 min | sí |
| 5 | retirar allowlist/canary y volver a Application 360 manual | inmediato | sí |

### Production verification sequence

1. Aceptar ADR/owners/privacy contract y congelar field allowlist + error contract.
2. Aplicar migration en staging con rol migrator; verificar grants/índices y que runtime no puede escribir fuera
   de sus primitives.
3. Ejecutar extracción sólo sobre fixtures sintéticos; probar idempotencia, limits, OCR-required, quarantine,
   replacement y deletion propagation.
4. Deploy Greenhouse con ambas flags OFF; comprobar que Hiring/Application 360 vigente no cambia.
5. Activar projection en staging para allowlist sintética; verificar lineage, freshness y ausencia de PII en logs.
6. Activar reader; llamar App API con usuario allow y deny, luego revocar el allow y repetir.
7. Deploy gateway con provider OFF; verificar que tools Hiring no aparecen en discovery.
8. Activar provider en staging; initialize MCP real desde Codex y Claude, listar y paginar un packet completo.
9. Ejecutar suite prompt-injection/IDOR/stale/PII sentinel. Cualquier critical fail detiene promoción.
10. Producción: provider OFF, migration, worker shadow, reader OFF; repetir read-only verifies.
11. Canary de una opening Content Creator con autorización explícita; monitor 7 días y revisar audit/denies/costo.
12. Expandir sólo a usuarios internos con role grant verificado; acceso externo permanece OFF.

### Out-of-band coordination required

- Entra: registrar/consentir scope dedicado y verificar grants reales; no reutilizar scope base o de Globe.
- Legal/Privacy: validar finalidad, notice/base aplicable, retención, subencargados y transferencias con abogado
  habilitado en las jurisdicciones aplicables antes de tratar CVs reales por este nuevo carril.
- Talent/People: aprobar purpose enum, allowlist, opening de canary y manual de decisión humana.
- Platform/Identity/MCP owners: aceptar ADR, on-call, kill switch y responsabilidad de incidente por boundary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] ADR aceptada define source of truth, trust boundaries, identidad delegada, owners y acceso internal-only.
- [x] Reader lista sólo dentro de una opening exacta y entrega packet por application exacta, con DTO allowlisted.
- [x] CV de otra aplicación del mismo candidato nunca se sirve; existe test de regresión multi-application.
- [x] Proyección sólo procesa assets limpios, conserva lineage/versiones y propaga reemplazo/eliminación.
- [x] Packet se pagina por chunks/hash y no puede concatenar versiones distintas.
- [x] App API exige purpose, usuario interno activo, scope exacto, `hiring.application.read` y `hiring.candidate.review.read` en cada request.
- [x] Audit allow/deny registra actor/workload/purpose/field classes sin CV, PII, tokens ni prompts.
- [x] Gateway expone exactamente dos tools read-only y no accede a DB, storage ni URLs del candidato.
- [ ] Provider y reader nacen OFF; rollback y revocación fueron ejercitados, no sólo documentados.
- [ ] Allow/deny/revoked/base-only se prueban con identidades reales en staging.
- [x] Fixtures adversariales prueban IDOR, prompt injection, PII sentinel, parser limits, quarantine y stale hash.
- [ ] Codex y Claude leen todos los chunks de un packet sintético y abstienen si falta evidencia.
- [x] Ningún análisis produce write-back, ranking, decisión, stage move, assessment assignment o email.
- [x] Manuales, OpenAPI/contracts, runbooks, architecture, feature flag ledger y provider catalog quedan alineados.
- [ ] Security/Privacy, Talent, Identity y MCP Platform dejan sign-off trazable; la postura jurídica aplicable es
  validada por abogado habilitado antes del canary con CV real.

## Verification

Evidencia local 2026-08-16:

- Greenhouse: build y TypeScript verdes; 197/197 pruebas focales de documentos exactos, parser/redacción, packet,
  App API, OAuth, cursor firmado, policy, self-service y tipografía.
- Gateway MCP: `pnpm test` verde, 56/56; schemas estrictos, cliente OAuth separado, purpose cerrado y tools MCP.
- `pnpm pg:connect:migrate` aplicó `20260816123000000_task-1718-candidate-review-packet.sql` al Cloud SQL
  compartido; no ejecutó backfill ni materializó texto de CV.
- El Banco reutiliza `GreenhouseDocumentPreview`; el deep-link secundario abre `?tab=documents`.
- GVC premium desktop/390 pasó sobre `/agency/hiring/talent-pool/mockup`, harness sintético que responde 404 en
  producción: siete frames, cero PII real, cero errores de consola/hydration/red, cero findings axe y teclado/reduced
  motion verdes. Evidencia: `.captures/2026-08-16T12-22-58_hiring-talent-pool-desk`.
- Activación productiva 2026-08-18: Greenhouse reader/proyección y provider documental quedaron habilitados para
  el cliente interno dedicado; el gateway conserva el acceso read-only y exacto por application.
- Canary OAuth/MCP real sobre `happ-031318c2-02ce-4623-8ada-6970cf4a8fb4`: initialize `200`, review `200`,
  un chunk, `expectedContentHash` ligado y gateway sin autenticación `401`. No se expusieron tokens ni CV en logs.
- El canary técnico no sustituye los sign-offs nominales ni prueba todavía revocación/base-only end-to-end; por eso
  la task conserva lifecycle `in-progress` aunque la superficie interna esté operativa.

- `pnpm task:lint --task TASK-1718`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm lint`
- `pnpm tsc --noEmit`
- tests focales de Hiring/App API/token exchange/projections en Greenhouse
- tests focales de provider/auth/discovery en `../efeonce-mcp`
- `pnpm worker:build-contract-gate`
- `pnpm worker:runtime-deps-gate`
- smoke de migración ya aplicada + grants/access negatives con rol runtime real
- MCP initialize/list/call allow/deny/fault desde dos hosts reales
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate documental

## Closing Protocol

- [x] `Lifecycle` del markdown queda sincronizado con el estado real (`in-progress` durante implementación; rollout real de
  CV/provider permanece OFF hasta los gates documentados)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `EPIC-011`, `TASK-1608`, `TASK-1610`, provider catalog y MCP runbook reflejan el contrato final sin duplicarlo
- [ ] flags/env/secrets/deploys fueron verificados en cada runtime; “code complete” no se reporta como operativo
- [ ] evidencia de cierre usa sólo fixtures o identificadores redactados, nunca PII de candidatos

## Follow-ups

- Acceso B2B/multitenant después de `TASK-1631`, con decisión y evidence gate independientes.
- OCR gobernado sólo si el volumen `ocr_required` lo justifica y existe contrato de proveedor/retención/región.
- Integración de Talent Assurance (`TASK-1608`/`TASK-1610`) consumiendo este packet sin ampliar su autoridad.
- Export/delete self-service de candidato si el programa de derechos del titular requiere nueva capability.

## Delta 2026-08-15

- Task creada tras verificar que `TASK-1715` resuelve lectura humana del CV en Application 360, mientras
  `TASK-1608`/`TASK-1610` cubren Talent Assurance y no una fundación MCP de Hiring. Se reserva `TASK-1718`
  como cross-runtime read-only con identidad humana delegada; se rechaza explícitamente el bypass browser y el
  token fijo de sistema.

## Open Questions

- Ninguna bloquea registrar la task. Slice 0 debe cerrar, con owners, el parser PDF, SLA de propagación de
  eliminación, tamaño de chunk, retention exacta, enum final de purpose y nombres definitivos de scopes/tablas.
