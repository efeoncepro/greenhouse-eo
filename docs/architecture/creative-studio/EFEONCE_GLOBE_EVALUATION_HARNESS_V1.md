# Efeonce Globe — Golden Briefs & Evaluation Harness V1

- Status: Aceptada e implementada — fake canary (TASK-1458)
- Validated: 2026-07-19
- Confidence: Alta para los fixtures versionados, las rúbricas, el motor de checks objetivos, el comando `evaluate`, los reports versionados y su scoping por workspace, todos ejercitados por tests; la fidelidad creativa real (juicio humano) y la corrida contra una ruta de proveedor real quedan intencionalmente sin materializar hasta que aterrice el canary live de SPEC-002
- Reversibility: Mixta — los fixtures y rúbricas son **dato** (dos vías: se agregan/versionan sin tocar el motor); los schemas versionados (`GoldenBriefFixtureV1`, `EvaluationRubricV1`, `EvaluationReportV1`, `EvaluateAttemptPayloadV1`) son costosos de reemplazar una vez que hay reports persistidos; el vocabulario de `FidelityContract` y de `ObjectiveCheckId` es difícil de cambiar sin re-versionar reports
- Related: [`EFEONCE_GLOBE_MODEL_LAB_V1.md`](EFEONCE_GLOBE_MODEL_LAB_V1.md) (el Lab que este harness **consume**, SPEC-002), [`EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`](EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md) (el spine que ambos extienden, SPEC-001), [`PLATFORM_FOUNDATION_V1.md`](PLATFORM_FOUNDATION_V1.md) (invariantes 6, 9, 12), [`DECISIONS_INDEX.md`](DECISIONS_INDEX.md) (SPEC-003)
- Task: TASK-1458 (golden briefs + evaluation harness), sobre el spine TASK-1481 y el Model Lab TASK-1457

## Contexto y decisión

El invariante 9 de [`PLATFORM_FOUNDATION_V1.md`](PLATFORM_FOUNDATION_V1.md) separa la *ejecución del Model Lab* de la *promoción de una ruta a producción*: promover exige, entre otras cosas, **evals**. Pero un modelo no es "mejor" en abstracto — es mejor **para un contrato de fidelidad concreto** (continuidad de set, acción humana, texto exacto, estilo flexible, foley). Este documento describe el **Golden Briefs & Evaluation Harness**: la capa versionada que convierte un **intento del Model Lab** en **evidencia repetible y comparable por contrato de fidelidad**.

No reinventa transporte, autenticación, conformance, spend fence ni provider seam. **Consume el Model Lab** (SPEC-002) para correr un golden brief por el camino real de comando (`prepare → execute`) vía el helper `runModelLabExperiment`, y **extiende el `CapabilityRegistry`** del spine con una capability nueva (`globe.lab.evaluation.run`) siguiendo el "contrato de extensión por capability" de SPEC-001.

Dos decisiones gobiernan el diseño:

1. **Separar la métrica objetiva del juicio creativo humano.** El harness corre *checks automáticos y reproducibles* sobre el manifest del intento (¿hay output?, ¿respetó el cap?, ¿el lineage de inputs quedó intacto?, ¿la ruta real coincidió con la propuesta?, ¿el outcome es candidato?). El *juicio de oficio* (¿el foley es sonido-de-contacto o un tap genérico?, ¿el key visual funciona como ancla de marca?) se **declara como criterios humanos, nunca se auto-puntúa**.
2. **El verdict nunca es un "passed" creativo.** Sólo hay dos verdicts: `objective_fail` (algún check objetivo falló) u `objective_pass_pending_human` (los checks objetivos pasaron y el intento **queda pendiente de revisión humana obligatoria**). El harness no declara un modelo globalmente mejor ni aprueba craft por su cuenta.

Y como todo lo del Lab: no habilita producción. Un report es **evidencia técnica**, nunca una aprobación de ruta (invariante 9) ni de artefacto (invariante 6).

Código canónico:

- Contratos versionados (fidelity vocab, fixture/rubric/report, payload, capability/command/reader names): `packages/contracts/src/index.ts`
- Motor de evaluación (fixtures como dato, rúbricas, checks objetivos, `evaluate` command, readers, registro, store in-memory): `packages/domain/src/evaluation.ts`
- Helper programático que reusa el camino real del Lab: `runModelLabExperiment` en `packages/domain/src/model-lab.ts`
- Wiring del runtime (reusa las deps del Lab + report store + grant del service principal): `apps/studio-web/src/app.ts`
- Métodos SDK tipados: `packages/sdk/src/index.ts`
- Tests: `packages/domain/src/evaluation.test.ts`

## Los golden briefs (dato, versionado, con derechos declarados)

Un `GoldenBriefFixtureV1` es un caso de prueba creativo **versionado** con sus derechos declarados: `license`, `consent`, `permittedUse`. Hoy hay tres, uno por medio, todos con inputs sintéticos/internos (cero derechos de terceros, cero riesgo de consentimiento):

| fixtureId | medio | capability | fidelity contract | hard cap |
| --- | --- | --- | --- | --- |
| `rrss-key-visual-still` | still | `image-generate` | `flexible-style` | 30 |
| `product-motion-loop` | motion | `video-generate` | `flexible-style` | 60 |
| `glitch-microphone-foley` | audio | `audio-generate` | `audio-foley` | 20 |

El foley del micrófono es el fixture canónico del ADR de Creative Studio: se juzga como **sonido-de-contacto** (golpe-y-rebote práctico), no como un SFX de tap genérico. Los fixtures son **dato**: agregar o versionar uno no toca el motor.

## Las rúbricas (checks objetivos + criterios humanos)

Un `EvaluationRubricV1` está indexado por `FidelityContract` y declara dos cosas separadas:

- `objectiveChecks: ObjectiveCheckId[]` — los checks automáticos a correr sobre el manifest. Los cinco vigentes: `output_present`, `within_hard_cap`, `input_lineage_intact`, `route_stable`, `outcome_candidate`.
- `humanCriteria: HumanCriterionV1[]` — las preguntas de oficio para el revisor. Cada criterio es `{ criterionId, question }` — **sin campo `pass` ni `score`**: el harness nunca las responde.

### `input_lineage_intact`: `authorizedInputHashes` es declaración pura del caller (delta TASK-1490)

`input_lineage_intact` es el más estricto de los cinco checks: compara los `sha256` de
`fixture.authorizedInputs` contra `attempt.authorizedInputHashes`, ambos ordenados, exigiendo
**igualdad exacta de conjunto** — misma cantidad y mismo elemento en cada posición
(`packages/domain/src/evaluation.ts`). No es "contiene" ni subconjunto: un hash de más o de menos lo
reprueba.

Eso funciona porque `authorizedInputHashes` significa **una sola cosa**: lo que el caller declaró y
estaba autorizado a usar. El runner lo puebla exclusivamente desde
`experiment.request.authorizedInputs` (`apps/creative-runner/src/index.ts`), y la base de un edit
—derivada por la plataforma, nunca declarada— **no** se pliega ahí: viaja como
`LabEditSourceV1.parentOutput` → `CreativeProviderRequestV1.editReference`, y su rastro en el manifest
son `lineage` y `editMode`.

**Por qué es load-bearing para el harness.** El diseño alternativo —meter la base del edit en
`authorizedInputs`— habría roto este check para **todo** fixture de edit: el attempt llevaría N+1
hashes contra los N del fixture, la igualdad fallaría por longitud y el harness reportaría
`objective_fail` sobre corridas correctas. La salida habría sido enseñarle al check a restar la base,
es decir, hacer que la capa de evaluación aprenda semántica de edit del Model Lab. El campo también es
la razón de derechos: la base lleva `derived-internal`, una postura que un caller —y por lo tanto un
fixture— no puede declarar (`GoldenBriefFixtureV1.authorizedInputs` sólo admite `LabInputRights`).

**Qué implica si alguna vez se agrega un golden brief de edit.** Hoy no es expresable:
`GoldenBriefFixtureV1` no tiene intención de edit y `evaluateAttempt` arma el `prepare` sólo con
`capability`/`referenceRoute`/`authorizedInputs`/`hardCapCredits`/`prompt`. Agregarlo exige:

1. Extender el schema del fixture con la intención de edit y **re-versionarlo** (los reports embeben
   `fixtureVersion`).
2. Que el fixture declare **únicamente sus propios** inputs autorizados. La base del padre no se
   declara nunca — con eso `input_lineage_intact` sigue sirviendo **sin tocarlo**, con igualdad exacta.
3. Certificar la evidencia propia del edit con un **`ObjectiveCheckId` nuevo** (`editMode` presente,
   `outputsRetained`, `lineage` encadenado al padre), **no** relajando `input_lineage_intact`. El
   report ya embebe el manifest completo, así que esos campos viajan sin cambiar `EvaluationReportV1`.
4. Aceptar que un brief de edit necesita un candidato padre real. El fake que cablea el runtime es
   storage-free (`LabRunner` sin resolver ni ingest), así que sus attempts registran
   `outputsRetained: false` y un edit por referencia sobre un candidato fake se rechaza en `prepare`.
   El adapter fake sí emite `outputs` cuyos bytes hashean al digest que reporta, de modo que la cadena
   generate → ingest → edit por referencia es ejercitable con dobles de store en tests, pero no por el
   camino que corre la eval hoy.

## El comando `evaluate` (corre el brief por el Lab, puntúa el manifest)

`globe.lab.evaluation.evaluate` recibe `{ fixtureId, rubricId }` (payload no confiable, validado server-side) y:

1. Resuelve el fixture y la rúbrica; **falla `not_found`** si alguno no existe.
2. Exige que la rúbrica sea del **mismo contrato de fidelidad** que el fixture; si no, **`invalid_request`** (una rúbrica sólo evalúa su propio contrato, nunca cross-contrato).
3. Corre el golden brief por el Model Lab con `runModelLabExperiment` — el **mismo** camino `prepare → execute` con sus guardrails (kill switch, spend fence, private-ingest, provider seam). El harness **no** reimplementa ejecución de experimentos.
4. Corre cada check objetivo sobre el `ExperimentAttemptManifestV1` resultante.
5. Deriva el verdict: `objective_pass_pending_human` si todos los checks pasan, `objective_fail` si alguno falla.
6. Emite un `EvaluationReportV1` versionado (con `fixtureVersion` + `rubricVersion`), con los resultados objetivos, los criterios humanos declarados, el manifest del intento, y las **limitaciones declaradas** (proveedor fake → sólo checks técnicos; muestra única → no significativa estadísticamente).

Los readers: `globe.lab.evaluation.fixtures` (lista fixtures + rúbricas versionados) y `globe.lab.evaluation.report` (lee un report **scopeado al workspace del caller**; cross-workspace → `not_found`).

## Cobertura por superficie

Idéntica al Model Lab: `ui` y `mcp` en `policy-blocked` (declaradas, gobernadas, apagadas); `http`, `sdk`, `cli`, `worker`, `e2e` en `available`; `sister-platform` en `not-applicable`. La capability nace con Full API Parity: schema versionado + command/reader transport-neutral + trusted context + path HTTP/SDK + coverage + conformance.

## 4 pilares

| Pilar | Cómo lo cumple |
| --- | --- |
| **Safety** | El verdict nunca auto-aprueba craft (`objective_pass_pending_human` exige revisión humana). Los fixtures declaran derechos; los inputs son sintéticos/internos. Reusa el kill switch + spend fence del Lab (una eval no puede gastar fuera del cap). Reports scopeados al workspace. |
| **Robustness** | Checks objetivos deterministas sobre el manifest; separación dura objetivo/humano; rúbrica atada a su contrato de fidelidad (mismatch → `invalid_request`); fixture/rúbrica desconocidos → `not_found`; el store in-memory aísla por `workspace::reportId`. |
| **Resilience** | El harness degrada con el Lab: si el kill switch está OFF, `runModelLabExperiment` falla cerrado y la eval devuelve el error canónico. Las limitaciones se declaran en cada report (nada se presenta como más de lo que es). |
| **Scalability** | Fixtures y rúbricas son dato: nuevos briefs/contratos no tocan el motor. El `EvaluationReportStorePort` abstrae la persistencia (in-memory hoy, durable después sin tocar el dominio). El motor de checks es una lista extensible de `ObjectiveCheckId`. |

## Reglas duras (NUNCA / SIEMPRE)

- **NUNCA** el harness declara un modelo globalmente mejor; evalúa **por contrato de fidelidad**, siempre.
- **NUNCA** un check automático puntúa el juicio creativo humano; los `humanCriteria` se declaran, nunca se responden.
- **NUNCA** el verdict es un "passed" creativo: sólo `objective_fail` u `objective_pass_pending_human` (pendiente de humano).
- **NUNCA** un fixture sin `license` + `consent` + `permittedUse` declarados; **NUNCA** inputs con derechos de terceros no declarados.
- **NUNCA** una rúbrica evalúa un fixture de otro contrato de fidelidad (mismatch → `invalid_request`).
- **NUNCA** el harness reimplementa la ejecución de experimentos, sus guardrails o el provider seam: **SIEMPRE** corre por `runModelLabExperiment` (el camino real del Lab).
- **NUNCA** relajar `input_lineage_intact` ni plegar la base de un edit en `authorizedInputs`: ese campo es declaración pura del caller y su significado no cambia entre generate y edit. La evidencia propia de un edit se certifica con un `ObjectiveCheckId` nuevo, no aflojando un check existente.
- **NUNCA** un report cruza el boundary de workspace del caller.
- **SIEMPRE** el report es versionado (`fixtureVersion` + `rubricVersion` + `schemaVersion`) y declara sus limitaciones (proveedor fake, muestra única).
- **SIEMPRE** el mismo fixture+rúbrica (misma versión) sobre el fake determinístico produce evidencia objetiva comparable (reproducible).

## Lo que queda deliberadamente sin decidir

- El **juicio humano** en sí (la UI/flujo donde un revisor responde los `humanCriteria`) — hoy sólo se declaran; la surface `ui` está `policy-blocked`.
- La corrida contra una **ruta de proveedor real** — depende del canary live de SPEC-002; hasta entonces los reports declaran la limitación "proveedor fake".
- El **store durable** de reports por tenencia (hoy in-memory); el port ya está abstraído.
- Un **golden brief de edit** (refinar un candidato como caso de prueba versionado) — el fixture no expresa intención de edit y el fake que corre la eval no retiene outputs; la receta para agregarlo está en `input_lineage_intact` más arriba.
- **Agregación multi-muestra** / significancia estadística — hoy cada report es una muestra única y lo declara como limitación.
