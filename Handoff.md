# Handoff activo

> Cabina de mando para continuidad inmediata. No es changelog, arquitectura ni memoria completa.
> Ventana máxima: 20 sesiones. Historia íntegra e índice: [Handoff.archive.md](Handoff.archive.md).

## Estado activo ahora

- Branch compartida: `develop`. Antes de editar, ejecutar `git status --short` y no asumir árbol limpio.
- El checkout contiene trabajo paralelo de Campaign Layout Compiler / producción creativa que fue preservado
  exactamente en el snapshot del corte; no revertir ni reescribir esos cambios.
- Estado de producto, arquitectura y rollout: usar las tasks/epics/issues y documentos canónicos enlazados por
  cada sesión. Una entrada histórica nunca prevalece sobre código, schema o runtime verificados.
- Colas canónicas de trabajo: [tasks](docs/tasks/README.md), [epics](docs/epics/README.md),
  [mini-tasks](docs/mini-tasks/README.md) e [issues](docs/issues/README.md). La ventana de sesiones no reemplaza
  esos índices ni debe ocultar trabajo activo más antiguo.

## Riesgos abiertos

- Trabajo local concurrente: coordinar ownership antes de tocar archivos ya modificados.
- Las sesiones archivadas pueden describir estados superseded. Revalidar cualquier conclusión histórica.

## Pendientes inmediatos

- EPIC-028 avanza en tres carriles paralelos gobernados íntegramente por Greenhouse. `TASK-1456…1485` viven
  en `docs/tasks/to-do/`, pasan por hooks/lint/QA/handoff de este repo y pueden poseer paths de implementación
  en el repositorio hermano. Globe conserva sólo arquitectura, runtime y evidencia técnica; no tiene registry
  ni namespace de tasks propio. `TASK-1456` cerró esta corrección; próxima wave: `TASK-1457`, `TASK-1458`
  y `TASK-1464`; `TASK-1459` puede integrar/probar still models apenas cierre el Lab gate, sin esperar ledger/workbench.
  Las specs separan ahora ownership: `TASK-1464` posee IaC/WIF/IAM/budgets/observabilidad y `TASK-1457` el
  runtime/policy del Lab. `TASK-1460`, `1468`, `1470` y `1474` mantienen Seedance 2.5 fail-closed hasta una ruta
  verificable y exigen mostrar provider/modelo/version propuestos versus ejecutados, incluidos fallbacks.
  Producción, clientes externos, precios y checkout siguen fuera de alcance.
  **Full API Parity correction:** `TASK-1481` es ahora el primer gate P0 antes de cualquier provider call:
  separa trusted actor/workspace de payload no confiable y entrega schemas, private API/SDK, coverage matrix y
  conformance harness. `TASK-1457` ejecuta el primer canary real por ese spine; `TASK-1473` sólo
  empaqueta/certifica SDK/MCP, no crea parity tardía. El runtime actual es parity-aware, no parity-complete:
  SDK sólo expone health y `CommandEnvelope` bootstrap todavía debe endurecerse durante TASK-1481.
  `TASK-1468` fue reforzada como kernel: allocation shadow, catálogo/rates, balance reconstruible,
  reserve/settle/release/expire/adjust, posting source-ref único, funding pinning y BudgetPolicyPort
  transaccional. `TASK-1482` posee pools/grants/project budgets/policies/forecast sin segundo saldo;
  `TASK-1483` posee `/studio/credits` como Runway Control Plane; `TASK-1474` conserva sólo credits del run.
  `TASK-1484` queda bloqueada para packages/billing/tax/revenue/payments después del decision record de
  `TASK-1480`. `TASK-1485` crea el Design System propio de Globe: Greenhouse gobierna registry/lifecycle/QA,
  Globe posee patterns/components/motion/runtime; compartir color no implica heredar UI Greenhouse.
- `TASK-1454` completó su runtime interno en `develop`, sin push ni Production: broker OAuth multiproducto,
  migración aditiva aplicada a `greenhouse-pg-dev/greenhouse_app`, client/binding Globe internal-only,
  callback `globe-studio-internal`, API privada `globe-api-internal`, SDK y WIF/ADC sin llaves. Los smokes live
  cubren acceso humano interno, denegación de tenant cliente, PKCE/replay, revocación convergente, audience
  correcto/incorrecto y Vercel OIDC → WIF → Cloud Run. Globe queda activo sólo como piloto interno por
  instrucción del operador; rollback = suspender client/binding y retirar IAM/WIF. No existen Production,
  clientes externos, providers creativos, base Globe ni buckets. El repo hermano `efeonce-globe` permanece
  `main` local, sin push; la distribución por tarballs vendorizados es temporal hasta registry privado.
  Incidente contenido: un JWT OIDC efímero apareció en un log diagnóstico y se retiraron deployments/binding
  Preview; una credencial operativa existente de DB apareció durante diagnóstico local y requiere rotación en
  checkpoint separado, sin repetirla ni rotarla unilateralmente.
  `TASK-1455` cerró la lane UI separada: Globe está live en Cloud Run revision `globe-studio-internal-00006-445`
  con root branded, callback→`/studio`, sesión/recovery, assets canónicos y GVC premium desktop/mobile. Score visual
  4,73/5, cero overflow y cero errores Globe. El próximo slice debe especificar el workbench real; projects, runs,
  providers, clientes y Production siguen ausentes. No renombrar el typo histórico `goble` sin revisar consumers.
- Para continuar trabajo activo, partir desde las sesiones recientes de abajo y el artefacto formal aplicable.
- Para investigar decisiones anteriores, buscar primero task/issue/ADR y después los snapshots históricos.

## Recuperación histórica

- Índice: [Handoff.archive.md](Handoff.archive.md).
- Snapshot íntegro pre-migración: [`docs/operations/agent-context-history/2026-07-19/Handoff.legacy.md`](docs/operations/agent-context-history/2026-07-19/Handoff.legacy.md).
- Modelo operativo: [`docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`](docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md).

## Sesión 2026-07-19 — Studio Credits y Design System Globe cerrados como backlog formal

> Se registraron `TASK-1482` (pools/grants/budgets), `TASK-1483` (credits operations UI), `TASK-1484`
> (monetización bloqueada) y `TASK-1485` (Design System Globe). `TASK-1468` sigue siendo el único kernel/ledger;
> `TASK-1469` liga approvals a funding/policy; `TASK-1478` calibra percentiles/five-line economics; `TASK-1480`
> produce el commercial decision record. Greenhouse gobierna el Design System, pero Globe no hereda sus
> patterns: construye los propios incrementalmente. Siguiente ID libre: `TASK-1486`. No hubo runtime/rollout.

## Sesión 2026-07-19 — Creative Studio Business Model V1 formalizado

> Se creó la categoría `docs/business-models/` y el primer modelo formal del repo. Creative Studio separa
> delivery model, engagement form y operating mode; Managed Squad deja de confundirse con Staff Augmentation o
> `efeonce-managed`. Studio Credits miden operaciones generativas gobernadas y excluyen capacidad humana,
> finishing determinístico y derechos. Provider-neutral no significa provider-oculto: estimate, approval y
> run history muestran provider/modelo/version, readiness y fallbacks reales, sin revelar costo vendor, margen,
> keys ni prompt/IP interno. El estado es `Approved for validation`: faltan shadow ledger, 30–50
> runs instrumentados, entrevistas, Sample Sprints y sign-off Finance/Legal antes de precio público o clientes
> externos. El contrato se propagó a 20 skills comerciales, productivas y transversales en `.codex/.claude`,
> con módulos específicos para credits comerciales, visuales, motion, audio y HyperFrames; Finance, Legal,
> Talent, Tenders, GTM, Research y Digital Marketing preservan sus boundaries. Los 20 routers Codex pasan `quick_validate`; la
> matriz de adopción registra también dominios auditados sin cambio. Canon: `docs/business-models/creative-studio/`.

## Sesión 2026-07-19 — Contexto de agentes migrado a router con preservación íntegra

> Se separó bootstrap, estado vigente y memoria histórica sin borrar contexto. Los cuatro archivos previos al
> corte quedaron preservados byte-for-byte bajo `docs/operations/agent-context-history/2026-07-19/`, con SHA-256 y conteos en
> `manifest.json`. `AGENTS.md` ahora enruta por dominio; `project_context.md` conserva solo contratos
> durables; este archivo mantiene una ventana máxima de 20 sesiones. El fallback obligatorio ante una duda es
> buscar por keyword en `AGENTS.legacy.md` o los snapshots de contexto y contrastar contra arquitectura,
> task, código y runtime vigentes. `CLAUDE.md` y su CI quedaron fuera de alcance por instrucción del operador;
> su pointer existente, `.claude/commands/implement-task.md` y el governor espejo enseñan el nuevo protocolo y
> el gate estricto verifica que sigan alcanzables. La rotación indexa shards mensuales con hash y aborta ante
> una edición concurrente del handoff.

## Sesión 2026-07-19 — Campaign Layout Compiler V1 implementado y validado

> Se convirtió Layout Design & Finishing en tooling reusable: `pnpm creative:layout` acepta un contrato
> `campaign-layout-compiler.v1` y opera `plan|compile|check` sin llamar a proveedores. Produce SVGs editables
> con capas reales, masters, manifests/hashes portables, contact sheet y QA; bloquea anchor/layout/finish
> pendientes y mantiene el release humano independiente. High Frequency se recompiló en `16:9`, `4:5` y
> `9:16` sin inferencia nueva: tests `2/2`, QA `3/3`, fidelity MAE `0,001096–0,001155` bajo `0,002`, contact sheet
> inspeccionado. Canon: `docs/architecture/GREENHOUSE_CAMPAIGN_LAYOUT_COMPILER_V1.md`; contrato de prueba:
> `ai-generations/2026-07-18_high-frequency-campaign-e2e/brief/layout-compiler-v1.yaml`. Los 84 binarios de la
> corrida (`148861636` bytes) están archivados en el bucket privado canónico y referenciados por
> `artifacts.remote.json`; Git conserva contratos, manifests, QA, scripts y SVG editables. No hay rollout,
> secrets, IAM, deploy ni media activation pendientes. La unidad queda cerrada en commit local, sin push.
>
> En la misma línea de **Efeonce Globe / Creative Studio** se consolidó un portfolio enterprise y un registry machine-readable de
> research. Google nativo queda directo GCP; Fal sólo no-Google exacto/allowlisted; OpenAI directo; finishing
> determinístico. Gemini Image se divide en Flash Lite/Flash/Pro; Imagen 4 está deprecado y el helper actual
> `src/lib/ai/image-generator.ts` conserva un P0 de migración que no se resolvió aquí porque el runtime del Studio
> debe nacer fuera de Greenhouse. Seedance 2.5 sigue bloqueado/no verificado. Todas las routes permanecen
> `research_verified`: no hay adapter, secrets, provisioning, bake-off/load test ni autorización de gasto.
> **Bootstrap ejecutado 2026-07-19:** existe el repositorio privado `efeoncepro/efeonce-globe` y el único proyecto
> GCP inicial `efeonce-globe` (billing + APIs base). El monorepo foundation compila y prueba domain contracts,
> provider boundary, artifact manifest, run gates, runner y media hash. No existen workloads, DB, buckets,
> service accounts de aplicación, secretos ni gasto de providers. Próximo paso: registrar las tasks en Globe y
> cerrar IaC/state + WIF + presupuesto antes de aprovisionar el primer vertical slice.

## Sesión 2026-07-18 — Campaña E2E “Alta frecuencia” (creative release completo)

> Se ejecutó y guardó el primer worked example durable de idea a campaña con la metáfora del
> colibrí: 3 territorios Seedream 5 Lite → selección `T02 Chromatic wake` → anchor Seedream 5 Pro →
> plates 4:5, 9:16 y 16:9 desde el mismo anchor con GPT Image 2 → composición determinista de
> 3 mensajes × 6 formatos. Resultado V3: 18 stills (digital, A2 y OOH), 2 heroes de 15 s,
> 2 masters Gemini Omni de 10 s y 2 bumpers de 6 s en 9:16/16:9, matriz/alt text, posters,
> contact sheets, manifests y ZIP. Los heroes extienden el clean shot ya aprobado con claims exactos,
> format wall y end card determinísticos; no hubo inferencia adicional.
> La primera composición fue rechazada por copy/safe zones; OOH perdió el support copy para lectura a
> distancia. El primer clip Omni de 3 s fue reclasificado correctamente como technical probe, no release.
> QA `18/18 + 6/6`, heroes medidos en `-16.3/-16.4 LUFS` y true peak `-2.0/-2.2 dBFS`, score
> visual `47.4/50`, costo release estimado `USD 2.9650`. El workflow reusable de single-shot a hero
> determinístico quedó espejado en la skill `motion-design-studio`; el QA mide loudness/peak en los seis
> MP4 y marca masters/bumpers para normalización por destino si se trafican. Seedance 2.0 queda sólo como
> fallback para toma/ángulo/continuidad física ausente, no como corrector de edición. Canon y reproducción:
> `ai-generations/2026-07-18_high-frequency-campaign-e2e/`. **Estado:** PASS para creative release;
> no hay activación de medios, spend, deploy ni cambio de secretos/IAM. Próximo gate real: campaña
> con human audio listen, normalización por destino, ICC/vendor spec, audience/offer/landing/UTM/conversión y una segunda ruta
> visual para medir performance/fatiga.

## Sesión 2026-07-18 — Secondary Tidal Teal (code-complete local, sin push)

> Por instrucción del operador se retiró el secondary verde/lime. Se compararon Atlantic,
> Tidal y Harbor; quedó **Tidal Teal** porque separa supporting action de success emerald sin
> invadir Core Blue/info. SoT: `axisRamp.secondary` `#DDF9F5→#083F3D`, anchor `500 #12AFA2`,
> opacity scale derivada; semantic light `{main:700 #0B726C, light:500, dark:800, white}` y dark
> `{main:400 #3BCBBD, light:300, dark:500, Midnight}`. Contrastes críticos: 5.77:1 y 7.25:1.
> `mergedTheme`, Colors/Buttons/Chips labs, chart secondary/nomenclature y Careers consumen tokens;
> no se hizo sweep ciego de lime histórico/semántico (success/campaign artifacts permanecen fuera
> del rol secondary). ADR nuevo supersede sólo la cláusula secondary de TASK-1053; Figma AXIS queda
> pendiente de reconciliación code→upstream.
>
> **Hardening adicional:** Colors Lab pasó de 142 `aria-label` inválidos + 53 contrast findings a
> axe limpio; `ui:code-lint` ahora permite HEX en las tres fuentes canónicas de color y tests de
> drift, no en consumers. GVC PASS: `design-system-colors` desktop/mobile (4 frames), baseline
> durable `scripts/frontend/baselines/design-system.colors/`, rerun 0.00%; `design-system-buttons`
> desktop/mobile PASS; `design-system-chips` desktop/mobile PASS. Tests: 40 color tests PASS;
> `ui:quality:test`, `ui:code-lint --changed`, ESLint focal, tsc 8GB, design lint, flags audit,
> qa gates, docs closure y ops lint limpios/advisory; production build final PASS después del
> ajuste a11y. Flag nuevo registrado:
> `NEXT_PUBLIC_GREENHOUSE_SECONDARY_TEAL_ENABLED` default-on; unset en Vercel sigue significando
> teal, `false` revierte a azure. **No push/deploy**: el runtime remoto cambia sólo en el próximo build.

## Sesión 2026-07-18 — Producción visual híbrida Seedream 5 ↔ GPT Image 2

> Se investigaron y probaron en paralelo ambos relevos reales para la campaña del colibrí. GPT →
> Seedream preservó estructura (`edge correlation 0.9212`) y elevó cromaticidad `12.1%`; Seedream
> → GPT produjo un banner `3:1` seleccionado `4.67/5` con `48%` de copy field limpio, después de
> documentar tres correcciones fallidas útiles. El método durable ya vive en `design-studio`
> módulo 12 y en la referencia Seedream/GPT de `greenhouse-ai-image-generator`, con contrato YAML
> de relevo, topología estrella, anchors, gates de lote y composición determinista. Se sincronizaron
> espejos Codex/Claude y docs de arquitectura/operación/funcional/manual. Outputs experimentales:
> `.captures/concepts/hummingbird-high-frequency/hybrid-flows/` (gitignored). Sin cambios de IAM,
> runtime, deploy o secretos; el intento GCS privado falló por Token Creator, se borró el objeto y
> el puente seguro quedó resuelto con upload temporal Fal CDN.

## Sesión 2026-07-18 — TASK-1430 refactor visual enterprise + puente Claude Design (commits locales; push bloqueado por WIP de Codex)

> Post-mortem del "wireframe look" (feedback del operador): la estructura era correcta pero la
> piel salió de TRANSCRIBIR el mock .dc.html a sx ad-hoc en vez de COMPONER el sistema —
> violando 4 anti-patrones ya documentados (radii multiplicadores off-scale, Box+borde en vez de
> Card canónico, spacing arbitrario, íconos fuera de escala) + ALL-CAPS técnicos. Refactor en
> loop GVC (4 iteraciones, frames mirados desktop+mobile): Card+CardHeader+CardContent con
> sombras del theme, customBorderRadius como px strings, kpiValue para métricas, GreenhouseChip
> para trust tags/resumen/estado del motor, affordances neutras, evidencia fail-closed en el
> preview (el CTA smoke 1431 con destino inválido ya no parece bug: se explica). Guardrails
> sistémicos: `docs/architecture/ui-platform/CLAUDE_DESIGN_TO_GREENHOUSE_BRIDGE.md` (tabla
> mock→tokens + checklist pre-JSX, indexada en ui-platform/README), overlay modern-ui v1.2 con
> el gate, quality.layout/runtime/enterpriseRubric declarados en ambos scenarios del cockpit.
> **Push pendiente**: el pre-push falla por WIP SIN COMMITEAR de la sesión paralela de Codex
> (scripts/ci/ui-*-gate.mjs nuevos con errores de parse a medio escribir — está construyendo
> gates de calidad UI; ver también su edición del overlay §0 "Premium delivery contract" +
> GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1). Coordinar: los dos esfuerzos son complementarios
> (bridge doc = traducción de mocks; lo de Codex = orquestación/score). Commits locales seguros:
> `b109ffc…` refactor + `docs` + fix scenarios. Nota: `.env.local` reparado
> (GOOGLE_APPLICATION_CREDENTIALS_JSON re-serializado; pg:doctor healthy de nuevo).

## Sesión 2026-07-18 — TASK-1430 Growth CTA cockpit CODE-COMPLETE (develop local, SIN push)

> `/implement-task 1430` ejecutada completa en `develop` local-first. **Shipped:** cockpit
> master-detail en `/growth/ctas` (CompositionShell `split` + prop nueva `splitTemplateColumns`),
> autoría gobernada de 8 pasos (metadata del registry TASK-1431, cero enum paralelo), preview
> harness del renderer canónico (scrubber density 560/400, claro/oscuro, hosts, matriz pairwise;
> degradación bloquea revisión), kill switches global/surface con reason auditado, y métricas de
> marketing server-side (`getCtaMarketingMetrics`: CTR/tasas con trust tags + guard
> `impressions_undercounted` — instrucción explícita del operador) wired a `CtaDetailVm.metrics`;
> `authorDraftCta` acepta `suppressionPolicy`. GETs admin + POST author des-gateados del engine
> flag (gobierna exposición pública, no gobernanza). Autoridad visual: proyecto Claude Design
> «Cockpit de CTAs» (el operador autorizó primitives/estética nuevas; contrato > mock donde
> divergen). SQL vivo verificado (gate TASK-893, `_sanity-cta-metrics-sql.ts`). GVC
> `task-1430-growth-cta-cockpit` (1440, 17 frames) + `-mobile` (390, 9 frames) mirados en loop.
> Docs: arch §28, funcional, manual, skill (ambos espejos), changelog. **Rollout: push ejecutado
> (`787f594ed`) + staging VERIFICADO** — deploy `dpl_CF21oKbss8x5…` READY, smoke API (list/detail
> con métricas reales y coverage guard live, kill-switch con audit, POST author 201 con
> `suppressionPolicy` round-trip en draft de smoke) y GVC staging 1440/390 OK. Producción llega
> con el próximo release train (la task queda `in-progress` como TASK-1431). Nota ambiente local:
> ADC gcloud vencida + `GOOGLE_APPLICATION_CREDENTIALS_JSON` corrupto en `.env.local` (línea
> multiline rompe dotenv de fe:capture) — pendiente `gcloud auth login` + ADC del operador.

## Sesión 2026-07-18 — EPIC-032 Notion Work Management Control Plane registrado

> Se creó el programa compacto `EPIC-032` con sólo cuatro tasks: `TASK-1449` (ADR, reconciliación de
> `TASK-880`/`TASK-577`, registry/fingerprint y Enhanced Markdown), `TASK-1450` (commands de delegación,
> subtasks recursivas y reparenting), `TASK-1451` (estado live, deadlines, progreso, resultados e historia
> observada) y `TASK-1452` (CLI, adopción Codex/Claude y rollout multi-space). No hay runtime implementado ni
> writes externos: todo queda `to-do`. Validación: las cuatro tasks `template=1 errors=0 warnings=0`,
> `pnpm epic:lint` y `pnpm ops:lint --changed` limpios. Siguiente ID: `TASK-1453`; siguiente ejecución
> recomendada: `TASK-1449` con goal/hook y ADR aceptado antes de construir el control plane.

## Sesión 2026-07-18 — notion-platform V1.1 enriquecida para work management

> Por pedido del operador se investigó en paralelo la gramática oficial de Enhanced Markdown, la skill local y
> los patrones de proyectos/tareas. Se versionaron espejos Codex/Claude con renderer/linter y templates para
> proyecto, tarea, subtarea recursiva, cierre y estado; registry multi-space; consultas live de vencimiento,
> progreso, resultado e historial observado. Se eliminó la falsa seguridad por prefijos de ID y se actualizó MCP
> para async/tool portability. Este cambio documenta el contrato para la futura CLI/API; todavía no implementa
> el runtime ni crea la EPIC/tasks de ejecución.

## Sesión 2026-07-18 — ISSUE-123: alias env-staging pinneado — causa raíz + tooling resiliente + des-pin

> Derivado del smoke de TASK-1431: el alias `greenhouse-eo-env-staging` servía código de la mañana
> (3ª recurrencia; Handoff registra fixes manuales `vercel alias set` el 07-17 y 07-18 AM — **ese
> fix manual ES la causa**: pinnea el alias fuera de la gestión automática). Shipped: resolver
> canónico del deployment staging READY vigente vía Vercel API en `vercel-staging-access.mjs`
> (staging-request lo usa por default; alias = fallback con warning), CLI `pnpm staging:url`,
> GVC con `STAGING_URL` + storageState por host, unit tests del picker (shape API real), ISSUE-123
> + delta §10 en `GREENHOUSE_STAGING_ACCESS_V1.md` con la regla **NUNCA `vercel alias set`**.
> Alias des-pinneado con `vercel alias rm` (autorización explícita del operador; el classifier
> bloquea mutaciones Vercel a agentes — 2 denials previos documentados). Pendiente de cierre:
> verificar re-atado automático del alias en los próximos 2 deploys staging (el push de esta misma
> sesión es el ciclo 1). Verificado E2E: `staging:request` sin override → auth + 200 contra el
> deployment vigente (`dpl_GoK4Tz…`).

## Sesión 2026-07-18 — TASK-1431 Growth CTA Action Registry (CODE COMPLETE, rollout pendiente)

> `/implement-task 1431` — develop local-first, SIN push. **Slices 1-3 implementados y commiteados**
> (`registry + metadata browser-safe` → `resolvers de navegación gobernada` → `executor por familia
> con <a href> real`). Registry en `action-registry.ts` (server-only; fachada `resolveCtaAction`
> intacta para publish gate + render path, fail-closed ante kind sin entry); kinds V1:
> `open_growth_form` (sin cambios) + `link_url`/`open_think_tool`/`book_meeting` con validación
> anti open-redirect (https/root-relative, sin credenciales, Think = path sobre hub gobernado +
> UTM strict, booking = hosts HubSpot Meetings + env). Renderer `1.2.0-preview.1`: navigate =
> anchor nativo (rel seguro, `target=_blank` opt-in + sr-only hint, clicked ANTES de navegar con
> keepalive, pending accesible + recovery 4s `navigation_stalled`, fail-closed `action_unsupported`).
> **Evidencia**: 122 tests focales + 9728 full suite verdes, build prod OK, lint/tsc OK,
> `task:lint`/`ui:*-check` limpios, GVC `task-1431-growth-cta-actions` 1440/390 MIRADO (frames +
> aria: rol link nativo, affordance pestaña nueva, pending `[disabled]`+status). Docs: arch §27 +
> funcional 1.6 + manual 1.3 + TRACKING-PLAN §CTAs + skill 2 espejos. Sin migración; sin flag nuevo.
> **Preview local**: `pnpm dev` → `http://localhost:3000/growth/ctas` (fixtures navigate + pending
> demo inerte). **Rollout pendiente** (por eso la task sigue in-progress): push/release, bundle
> 1.2.0 desplegado en hosts ANTES de publicar cualquier CTA con action nueva, smoke staging de
> destinos reales. Ninguna CTA nueva publicada.

## Sesión 2026-07-18 — EPIC-031 Delta Daily/Flash/Weekly + Glitch Desk

> Corrección del operador incorporada: Daily y Flash son modos internos de discovery/staging y **nunca escriben WordPress**; sólo Weekly produce private draft programado. Una candidata Daily/Flash puede transformarse en una noticia única `glitchFlash` sólo por promoción `propose→confirm→execute` con actor humano; no consume número y tampoco autoriza publish público. Se agregaron `TASK-1448` (contract backend de promoción) y `TASK-1447` (Glitch Desk, queue+evidence inspector) con wireframe/flow/motion completos; `TASK-1444` queda bloqueada también por 1448 y `TASK-1446` por 1447. Siguiente ID `TASK-1449`.

## Sesión 2026-07-18 — EPIC-031 Glitch Agentic Editorial Pipeline registrado

> Discovery de `/Users/jreye/Documents/glitch-context/`, sitio público Glitch y calendarios Notion Q3/Q4 formalizado como programa ejecutable. Se creó ADR Proposed `GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`, delta Proposed en PDR-003, `EPIC-031` y `TASK-1440`…`TASK-1446`. Decisión propuesta: Greenhouse controla estado/runs/evidencia; Notion es calendario/proyección; Content Factory es único write Gutenberg; autonomía termina en WordPress `private`; publish público sigue humano; `weeklyEdition` y `tacticalGlitch` son tipos distintos. `TASK-1441` protege la #16 como piloto controlado para el lunes 2026-07-20. Validación: cada task reporta `template=1 errors=0 warnings=0`; `pnpm ops:lint --changed` limpio. Siguiente: ejecutar `TASK-1440` con goal/hook, aceptar ADR/PDR y luego tomar el piloto #16.

## Sesión 2026-07-18 (cont. 3) — RELEASE A PRODUCCIÓN: TASK-1428 + TASK-1429 released + enforcement ON

> Orden del operador: "implementa 1429, enciende enforcement, paso a producción" — COMPLETO.
> **Release `d5db8b568849-a1ae09c1-f6a6-4c35-a427-4e92ca8ca517`** (target `d5db8b568`, PR #159
> release + PR #160 fix CI, orquestador run `29651461496`, 12m01s, manifest `released` 16:23Z,
> ambos gates `production` aprobados por el watcher sin stall). **Enforcement
> `GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` ON en staging Y Production**, verificado E2E en
> ambos (dismiss → exclusión por visitor; fresco ve; sin identidad = embedded eligible). Incidente
> real del release: el CI de `9f00a1715` murió SIN summary — diagnóstico: los steps Test (8 min) y
> Coverage (10 min) morían exactamente en start+timeout con la suite (~9.8k tests) verde; fix de
> raíz en #160 (14/17/25 min) validado en el mismo release. Watchdog: residual conocido
> `ops-worker` (gh=d5db8b56 vs run=c9f3041b4 de develop; diff rutas runtime VACÍO + Ready=True →
> label, sin redeploy — gotcha #4). **TASK-1428 y TASK-1429 → complete/** (README/registry/ledger/
> timing ledger sincronizados). Queda: ventana monitor 7d `growth.cta.*` (comparte 2026-07-25 con
> TASK-1427) y la primera campaña `slide_in` real (decisión de negocio: surface/copy/trigger).

## Sesión 2026-07-18 (cont. 2) — TASK-1429 Slices 1-3: slide_in interruptivo + Experience System (code complete, GVC mirado)

> `/implement-task 1429` (+orden: luego enforcement + producción). **Code-complete en develop
> local**: `SlideInController` no modal (trigger gobernado dwell 8s/scroll 35%, apertura pasiva,
> Escape+focus return, dismiss persistido pre-salida con `@starting-style`+`allow-discrete`),
> density `full|condensed|peek` por container query keyed por placement attr (paridad
> overlay↔preview), identidad pseudónima consent-aware enviada por headers (cierra el loop con el
> visitor state de TASK-1428) + guard local de sesión, `viewed` visibility-gated (IO ≥50% +
> dwell; corte en TRACKING-PLAN) + Tier B, tokens 2026 (`light-dark()`/`color-mix(in oklch)`/
> `linear()` con `@supports`; `--gh-cta-*` intactos), morph card→form con View Transition,
> preview con matriz de density + demo vivo. **GVC 1440+390 mirado** (frames en
> `.captures/2026-07-18T14-57-05_task-1429-*`); el loop cazó 2 bugs pre-merge (destroy
> cross-instance StrictMode; density anclada a la clase del overlay). 90 tests verdes; bundle
> `1.1.0-preview.1` (33.7KB). Ningún CTA slide_in publicado aún (decisión de campaña del
> operador). Siguiente en esta misma sesión: push → staging → enforcement ON → producción.

## Sesión 2026-07-18 (cont.) — TASK-1428 rollout staging: shadow + kill switch VERIFICADOS live; bug real cazado y cerrado

> Continuación por orden del operador ("termina todo lo pendiente"). **Push a develop hecho** (staging
> auto-deploy) + smoke live contra el deployment staging con visitor sintético: dismiss 202 →
> `cta_visitor_state` (visitor+session) → render post-dismiss INTACTO (shadow) + rollup
> `suppressed/dismissed enforced=false` · `viewed` 202 → rollup browser · **kill switch per-surface sin
> redeploy**: engage → `engineState:"killed"` + vacío → release → CTA restaurado + audit (ventana <60s en
> la página de prueba noindex; Think intacta). **El smoke cazó un 502 real**: `SELECT … FOR UPDATE` exige
> UPDATE y `greenhouse_runtime` es SELECT/INSERT-only en la tabla append-only → fix `3bb0d0779`
> (`pg_advisory_xact_lock` por scope, grants intactos), re-verificado. **Bloqueado para el agente**: el
> flip staging del enforcement (`vercel env add GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED staging` +
> redeploy) — permiso denegado en la sesión; queda como 1 comando del operador + smoke enforcement + prod
> gradual (ledger §Pendientes actualizado). Con el renderer actual (sin visitor keys) el flip no altera
> tráfico real.

## Sesión 2026-07-18 — TASK-1428 Slices 1-3: suppression + Tier B + kill switches (code complete, rollout pendiente)

> `/implement-task 1428`. **Code-complete en develop local, SIN push** (2 commits feat + 1 docs).
> Migración aditiva `20260718131956294` APLICADA a la instancia (DO-block verde + tipos regenerados):
> `cta_visitor_state` (hash-only, visitor durable consent-gated / session fallback 48h, fila
> `cta_id NULL` = ventana global interruptiva), `cta_exposure_rollup` (Tier B agregado horario —
> jamás 1 fila OLTP por pageview, §9.4 opción 3) y `cta_kill_switch_event` (append-only §16.3).
> Runtime: decisión pura de suppression (taxonomía completa, policy zod defaults conservadores,
> fail-closed) integrada al arbiter en SHADOW (`GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` OFF =
> registra `enforced=false` sin alterar renders); claim atómico interruptivo FOR UPDATE (multi-tab
> determinista); dismiss persiste al aceptar el ingest; `already_converted` SOLO con submission
> verificada vía `isSubmissionServerAccepted` (forms/readers, boundary intacto); `viewed` browser →
> rollup tras la misma cadena de defensa; kill switch global/per-surface con estado en DB + API
> `GET/POST /api/admin/growth/ctas/kill-switch` (capability `growth.cta.pause`, cero capabilities
> nuevas) + outbox `growth.cta.kill_switch_changed` + `engineState ok|killed` aditivo al público;
> headers de visitor context en render (CORS extendido). Signals nuevos: `kill_switch_active`,
> `priority_collision`, `event_ingest_backpressure`. Evidencia: `pnpm test` full 9684 verdes +
> `pnpm build` prod OK + SQL vivo contra PG real (`_sanity-cta-suppression-sql.ts`: claim
> `[true,true,false]`, writes limpiados). Docs sincronizados: arch §24, EVENT_CATALOG, ledger
> (fila + §Pendientes), manual (runbook kill switch + ventana compuesta), doc funcional 1.3, skill
> ambos espejos, Deltas cruzados a TASK-1429/1430. **Rollout pendiente** (por eso sigue
> `in-progress`): push → shadow-compare staging → enforcement staging + smoke kill switch live sin
> redeploy → prod gradual 7d. El renderer aún no envía visitor keys (TASK-1429).

## Sesión 2026-07-18 — TASK-1427 Slices 1–2: CTA live en WordPress (página de prueba) + E2E ambos hosts

> `/implement-task 1427`. El operador decidió **página de prueba primero** para el placement WP:
> se creó `efeoncepro.com/greenhouse-cta-prueba/` (id `251561`, noindex, sin sidebar, no enlazada)
> vía `pnpm public-website:wpcli` — solo un bloque HTML con el snippet canónico
> (`cta-location=wp_test_page`); cero cambios de tema/plugin, rollback = borrar la página.
> Evidencia E2E mirada: WP 1440 (card ready + click → form 5 pasos inline, CSS Ohio sin fugas) y
> 390 (condensed, sin overflow); dataLayer `viewed/clicked/form_opened`; ingest 2×202; ledger
> `browser_reported/accepted`; `/g/collect` con los 3 eventos; **`greenhouse_cta_viewed` visible en
> GA4 realtime** (sesión UA real + engagement + consent, LEARNINGS §7c); forja → 403
> `surface_unauthorized`. Think control re-verificado live. Hallazgo documentado: **ningún host
> tiene CMP/consent-mode defaults** (los tags disparan sin gate; postura pre-existente del sitio —
> LEARNINGS 2026-07-18; candidato a task de measurement governance). Capturas en
> `.captures/task-1427-wp-test/`; scripts `scripts/growth/_sanity-task1427-*.mjs`. Docs sincronizados:
> task Delta, TRACKING-PLAN, LEARNINGS, manual, doc funcional, skill (ambos espejos). **Slice 3
> abierto**: ventana steady-state `growth.cta.*` hasta 2026-07-25 + decisión de placement amplio
> (recomendado: posts del blog) → la task sigue `in-progress` por diseño.
