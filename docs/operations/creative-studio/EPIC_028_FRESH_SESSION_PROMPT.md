# Fresh-session prompt — EPIC-028 first parallel wave

Copy the block below into a new Codex session.

```text
Estamos construyendo Efeonce Globe / Creative Studio como plataforma hermana de Greenhouse.

Gobernanza obligatoria:
- trabaja desde `/Users/jreye/Documents/greenhouse-eo`, branch compartida `develop`, como control plane;
- Greenhouse es el único dueño de EPICs, `TASK-###`, task hooks, Plan Mode, lint, QA, lifecycle, changelog y handoff;
- `/Users/jreye/Documents/efeonce-globe` posee código, infraestructura, datos, runtime creativo y evidencia técnica;
- no crees un namespace, registry, carpeta de tasks ni harness paralelo en Globe;
- no cambies ninguna branch compartida ni hagas push sin instrucción explícita.

Goal recomendado: continuar la wave abierta. La base ya está cerrada y **no se rehace** — `TASK-1456`
(gobierno), `TASK-1481` (API Contract Spine + conformance harness), `TASK-1457` (safe Model Lab + primer
provider canary), `TASK-1458` (fixtures/evals), `TASK-1464` (IaC/keyless), el stack real de providers
(`TASK-1486/1487/1488`), los model labs still/motion/audio (`TASK-1459/1460/1461`) y el edit cross-model
(`TASK-1490`). Lo abierto es `TASK-1467` (provenance/rights/private ingest) y el carril de plataforma
gobernada. Confirma el estado vigente en el `Handoff.md` de cada repo antes de elegir goal.
Globe permanece internal-only, no productivo y sin clientes externos.

Antes de ejecutar una task:
1. Lee `/Users/jreye/Documents/greenhouse-eo/AGENTS.md`, `project_context.md` y `Handoff.md`.
2. Lee `docs/tasks/TASK_PROCESS.md`, la spec exacta bajo `docs/tasks/to-do/TASK-###-*.md` y EPIC-028.
3. Lee `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`,
   `docs/architecture/EFEONCE_CREATIVE_STUDIO_ENTERPRISE_MODEL_PORTFOLIO_V1.md`,
   `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md` y
   `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`.
4. Lee en Globe `AGENTS.md`, `Handoff.md`, `docs/architecture/PLATFORM_FOUNDATION_V1.md`,
   `docs/architecture/GREENHOUSE_CONNECTIVITY_V1.md` y
   `docs/operations/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`.
5. Si el operador confirmó el goal, ejecuta desde Greenhouse
   `pnpm codex:task-hook TASK-### --develop` antes de implementar. Si autoriza subagentes, añade `--subagents`.

Estado que no debes rehacer:
- `TASK-1454` y `TASK-1455` están completas: identity/SDK bridge keyless y brand/session shell internal-only
  están live en Cloud Run no productivo.
- Existe un único proyecto GCP `efeonce-globe`, repo privado y monorepo Node 24.
- Las specs `TASK-1456…1481` se gobiernan en Greenhouse; ver arriba las que ya cerraron.
- El seam creativo es real y verificado en vivo: `VertexCreativeAdapter`, `FalCreativeAdapter`,
  `VertexVideoAdapter`, `VertexOmniAdapter` y `CompositeProviderAdapter`, detrás de `GLOBE_LAB_PROVIDER`
  (default `fake`).
- Refinar un candidato ya es **cross-model** y no necesita command nuevo: `editFrom = { experimentId }`, el
  runner elige stateful vs reference-based y lo declara en `ExperimentAttemptManifestV1.editMode`.
  `previousInteractionId` está deprecado y es mutuamente excluyente con `editFrom`.
- Los outputs de un run **se retienen** content-addressed bajo el mismo `sha256` del manifest
  (`outputsRetained`), que es lo que hace posible el edit por referencia. No asumas que un adapter sólo
  devuelve hashes. Detalle: `docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md` → §"Edit / refine cross-model".
- No existen Cloud SQL creativo, asset bucket definitivo, providers creativos promovidos, Production ni clientes.

Contrato parallel-first:
- Model Lab/craft, plataforma gobernada y validación comercial avanzan en paralelo.
- Probar modelos no espera Cloud SQL, wallet ni workbench si pasó el Lab execution gate.
- Lab gate: credential path keyless/Secret Manager, hard spend cap por run/día, input autorizado, private ingest,
  manifest inmutable, correlation, aprobación humana y kill switch.
- Promoción a UI/MCP exige además tenancy, idempotencia, estimate/reservation, approval token, rights policy,
  eval calificada, observabilidad y rollback.
- Un HTTP 200 o provider `completed` nunca equivale a `production_approved`.

Full API Parity by birth:
- cada capability nace con schema versionado, trusted actor/workspace context, command/reader, private API/SDK
  path, errores/audit/idempotencia, coverage matrix y conformance tests;
- el primer provider canary ya fluye por API/SDK o harness → command → adapter → runner;
- UI, MCP, CLI, task scripts y E2E nunca llaman un provider SDK directamente;
- una surface deshabilitada se registra `policy-blocked`; no se deja sin contrato;
- `TASK-1473` empaqueta/certifica SDK y MCP, pero no crea parity ni business logic tardía;
- actor/workspace se derivan server-side; body/query/headers del caller no pueden suplantarlos.

Provider policy:
- Google-native sólo directo por Google Cloud/Vertex en proyecto `efeonce-globe`;
- Fal sólo para modelos no-Google allowlisted;
- OpenAI directo;
- composición/layout/copy/logo/legal/color/codecs/prepress determinísticos bajo ownership Globe;
- nunca exponer una tool genérica `endpoint + arbitrary JSON`.

Business boundaries:
- Studio Credits son operaciones generativas gobernadas, no piezas, horas, tokens, moneda ni derechos;
- el Lab registra costo real/shadow, pero no crea precio público, packages, top-ups, checkout o expiración;
- el primer movimiento vendible es un Sample Sprint Efeonce-managed; Studio Access sigue bloqueado hasta
  calibración y aprobación Finance/Legal/Security/Leadership.

Cloud/safety:
- pasa siempre `--project=efeonce-globe`; no cambies el proyecto global;
- usa los flujos `gcloud auth login` y `gcloud auth application-default login` cuando se requiera acceso local;
- no service-account keys, default service accounts ni secretos en logs;
- Terraform open-source + backend GCS; no HCP Terraform salvo decisión futura;
- no aprovisiones gasto material sin budget envelope y checkpoint aprobados;
- no habilites Production, audiencia externa ni publicación autónoma.

Verificación y cierre:
- desde Greenhouse: `pnpm task:lint --task TASK-###`, `pnpm ops:lint --changed`,
  `pnpm qa:gates --changed` y `pnpm docs:closure-check`;
- en Globe, cuando cambie runtime: `pnpm check && pnpm build` y smoke real proporcional;
- actualiza lifecycle/registry/EPIC/changelog/Handoff en Greenhouse y arquitectura/evidencia técnica en Globe;
- haz commits locales separados por repositorio; no push sin instrucción;
- reporta `complete`, `code complete / rollout pendiente` o `bloqueado` con evidencia.

No conviertas el programa en waterfall y no traslades el harness a Globe: integra modelos al cerrar el Lab gate,
mientras tenancy, ledger y run lifecycle avanzan en su carril propio.
```
