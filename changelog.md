# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-07-29 — PR #164: promoción completa y release detenido por evidencia de smoke

- PR #164 promovió todo `develop` a `main` en `e711fe2560e3a7c2e7e8639e07a8a394e9582cdb`; no hubo cherry-picks ni
  release aislado de AXIS.
- CI/CI Deep, Vercel READY y los gates de governance pasaron. El orchestrator `30452322643` detuvo el proceso en
  preflight por falta de smoke asociado al SHA de `main`; el smoke manual `30452463889` pasó verde posteriormente.
- Queda pendiente reintentar el orchestrator sin bypass cuando la API de GitHub Actions responda. No hubo manifest,
  deploy de workers ni promoción parcial.

## 2026-07-29 — PR #164: bloqueo persistente del preflight Sentry

- Smoke manual `30452463889` pasó y staging fue recuperado a `READY` mediante redeploy del deployment existente del
  proyecto Greenhouse; Production permaneció READY.
- Los orchestrators `30452924614`, `30453278402` y `30453818726` fallaron antes del manifest por
  `sentry_critical_issues` timeout de 6 s; el último ya no tuvo bloqueos de smoke ni staging.
- El rollout queda pendiente. No se activó `bypass_preflight`; requiere `platform.release.bypass_preflight` y razón
  auditada de al menos 20 caracteres.

## 2026-07-29 — PR #164: autenticación de paquetes privados y gobierno de release

- Los workflows con instalación de dependencias privadas usan `GITHUB_TOKEN` con `packages: read` y un `.npmrc`
  efímero en `$RUNNER_TEMP`; no se versionan tokens ni se exponen credenciales en runtime o artefactos.
- Vercel `efeonce-7670142f/greenhouse-eo` recibió `NPM_RC` cifrado para Preview (`develop`) y Production, siguiendo
  el runbook de AXIS. La credencial operator-owned es temporal y requiere reemplazo por una identidad read-only antes
  del rollout externo.
- `CLAUDE.md` quedó bajo el techo estricto de 35k tokens (34.945) y la auditoría de contenido quedó sin huérfanas;
  el detalle del Design System vive en `docs/architecture/ui-platform/README.md`.

## 2026-07-29 — EPIC-028: cinco workstreams comerciales añadidos

- Se añadieron `TASK-1593`–`TASK-1597` como policy tasks dentro de EPIC-028: enterprise ICP/design partners, Agency
  Workflow Sprint, Campaign Variant Workflow, Distribution/Activation y Packaging/Unit Economics.
- Las tasks consumen los gates comerciales existentes sin duplicarlos y mantienen el runtime, pricing público,
  checkout, reseller rights, co-selling y clientes externos bloqueados.
- El orden recomendado es `TASK-1595 → TASK-1594`; `TASK-1593`, `TASK-1596` y `TASK-1597` avanzan en paralelo documental.

## 2026-07-29 — EPIC-028: revisión de alineación con la visión de mercado

- Se auditó lo construido y lo pendiente del epic frente a la estrategia de Globe: enterprise como ICP estratégico,
  beachhead operativo por unidad, agencias como canal, e-commerce/DTC como wedge y creators/SMB como distribución.
- Veredicto: la fundación de producto, gobernanza y operación está alineada; la arquitectura comercial, distribución,
  verticalización y exit criteria de negocio todavía están incompletos.
- Se recomendó añadir dentro del mismo epic workstreams de enterprise design partners, Agency Workflow Sprint,
  Campaign Variant Workflow, activation/distribution y packaging/economics, sin duplicar owners técnicos.

## 2026-07-29 — Globe: estrategia de mercado, distribución y monetización V1

- Se integraron los benchmarks de Higgsfield y Magnific en una estrategia de segmentos, oportunidades, distribución
  masiva, ventas B2B/enterprise, canales, packaging y validación.
- Se fijó enterprise marketing organizations como ICP estratégico; mid-market o una unidad enterprise como beachhead
  operativo; agencias/productoras como canal multiplicador; e-commerce/DTC como vertical wedge; creators y SMB como
  adquisición y aprendizaje inicial.
- Se documentaron loops de artifact/template/creator/referral/content/integration/agency, límites entre software,
  Product Service, managed/co-operated y canal, revenue architecture, cost-to-serve y pilotos de 90 días.

## 2026-07-29 — Globe Producer: craft, densidad y tres bugs que sólo vio el despliegue

- Composer del Producer desplegado a `globe-studio-internal` (`00095`→`00097`): glow con reposo propio y
  rampa de fondo **invertida** (`--field` es más oscuro que el panel, así que la rampa heredada oscurecía
  al interactuar), pozo único sin el borde de fábrica del navegador en el `<textarea>`, ritmo interno
  16/20/32, y bloque de modelo+formato de **471 a 302 px** con jerarquía por consecuencia.
- Miniaturas de Dirección: ocho stills con globo generados con `pnpm ai:image`, mismo sujeto y ocho
  tratamientos, `aspect-video`. Pendiente regenerarlas por el Still Model Lab para procedencia gobernada.
- Proporción pasa a **taxonomía por forma, no por plataforma** (corrección del operador: Globe no produce
  sólo para social). Calidad deja de mostrar el enum crudo `standard`/`high`.
- Header a una fila en la banda 768–1024: **121 → 67 px**. Riel `sticky` funcionando bajo `lg`
  (`overflow-hidden` lo anulaba). Anillo de créditos devuelto al trigger, que el port había perdido.
- Bloque de referencias: el menú ordena por disponibilidad, el copy deja de prometer influencia y anclaje
  —ninguna de las dos existe— y cada ficha muestra su miniatura real.
- **Gate nuevo**: `tailwind-theme.test.ts` falla si una utilidad consume un namespace que el theme vació y
  el SSOT no repobló. Verificado en ambos sentidos. Nació de seis `backdrop-blur-*` computando `none`.
- ⚠️ Tres defectos aparecieron **sólo al desplegar**, con gates verdes: el `.npmrc` que no llegaba al
  `pnpm deploy --prod`, las miniaturas dando 404 por no estar en `assets.ts`, y el feed montando un MP4 en
  un `<img>`. Registrados con su patrón en
  [`GLOBE_PRODUCER_VERIFICATION_BLIND_SPOTS_2026-07-29.md`](docs/audits/globe/GLOBE_PRODUCER_VERIFICATION_BLIND_SPOTS_2026-07-29.md).
- **TASK-1552 Slice 3 sigue abierta**; nada de esto la cierra.

## 2026-07-29 — Magnific: Go-to-Market, workflows y expansión de plataforma documentados

- Se añadió una auditoría comercial sobre el wedge de upscaling, PLG, content/community, Flows/Agents, plugins, API, MCP,
  Business, Enterprise, services y value capture.
- Se clasificaron adquisición, integración, contributors, affiliates, Creative Partners, casos de agencia y enterprise;
  la evidencia pública no permite llamar partnership formal a la mayoría de esas relaciones ni validar claims de escala.
- El patrón transferible para Globe queda definido como `builder experto → workflow → runner → pod/workspace`, con
  derechos, provenance, QA, aprobación, costos y accountability; no se copian créditos, unlimited ni logos.

## 2026-07-29 — Higgsfield: Go-to-Market, partnerships, advertising y expansión vertical documentadas

- Se añadió una auditoría comercial que analiza el GTM completo: PLG/self-serve, content-led education, agency-led
  adoption, enterprise sales y ecosystem distribution; además separa partnerships formales, proveedores,
  integraciones, workshops, creator programs y case studies.
- Se documentó Advertising como beachhead de alta frecuencia: URL-to-Ad, variantes, workflows de campaña y expansión
  hacia Team/Enterprise, con agencias como multiplicadores y enablement como acelerador de adopción.
- La implicancia para Globe queda en validación: wedge estrecho, partnership taxonomy explícita, memoria de workflow,
  derechos/provenance y accountability Efeonce; Higgsfield puede ser capability provider, no dueño del resultado.
- Las skills de GTM, business model y research incorporan el patrón transferible `cuña → activación → workflow →
  agencia/pod → enterprise → expansión`, con traducción `adoptar | adaptar | descartar` y anti-copia explícita.

## 2026-07-29 — TASK-1591: adapters AXIS opt-in verificados

- AXIS publicó `0.1.4` con los contratos `efeonce.status` y `efeonce.progress` gobernados para Greenhouse y Globe.
- Greenhouse fija los tres paquetes privados y expone adapters MUI/Vuexy; Globe fija los mismos paquetes y expone adapters Tailwind/token classes.
- Se añadieron fixtures opt-in en `/design-system/axis-adapters` y `/_axis-pilot`, con evidencia desktop/mobile, teclado, reduced motion y sin overflow.
- El rollout productivo permanece separado; el PAT operator-owned vence el 2026-08-27 y debe rotarse antes de uso externo durable.

## 2026-07-29 — Creator Influence & Content: modelo operativo documentado

- Se documentó el submodelo de Influencers, Creators & UGC dentro de Media & Distribution, con cinco ofertas:
  Creator Intelligence, Influencer Activation, Creator Content & UGC, Creator Partnership Program y Amplification & Whitelisting.
- Se añadieron ficha de servicio, arquitectura operativa no-runtime, documentación funcional y manual de operación,
  separando audiencia, assets, derechos, pass-through, paid usage, RACI, gates y medición.
- La skill social de Creator/UGC quedó enlazada al modelo canónico; el estado permanece `Approved for validation` y
  no habilita pricing público ni venta general.

## 2026-07-29 — Creator Influence & Content: arquitectura de fees y comisiones

- Se añadió el `Pricing Integrity Pack V1` con bandas internas de validación, fee fijo, pass-through transparente,
  coordinación de terceros, performance fee condicionado, mínimos y condiciones de pago.
- Se fijó como hipótesis el modelo `fee base + pass-through`; las comisiones no pueden ser ocultas ni sustituir el
  delivery fee. Finance, Legal y Commercial deben validar cost-to-serve, derechos, atribución y willingness-to-pay.

## 2026-07-29 — Creator Influence & Content: benchmark de mercado y modelo escalable

- Se investigaron agencias y plataformas líderes, incluyendo Aspire, NeoReach, Upfluence, CreatorIQ e Influentials,
  además de referencias públicas de pricing y guidance de disclosure/rights.
- Se añadió el benchmark comercial con patrones adoptados y descartados: end-to-end modular, rights at signing,
  paid amplification, affiliate con tracking, transparencia y source of truth portable; fuera quedan per-post,
  performance-only, comisión oculta y porcentaje de media spend.
- El modelo propio queda orientado a capacidad gobernada por lane, no a volumen de publicaciones, y permanece en
  `Approved for validation`.

## 2026-07-29 — Creator Influence & Content: bandas y porcentajes de validación

- El Pricing Integrity Pack pasó a V1.1 con bandas por lane: Creator Fit Brief USD 500–1.000, Intelligence USD
  1.500–4.000, Activations USD 3.000–12.000, Content Engine USD 4.000–8.000/mes y Partnership USD 6.000–15.000/mes.
- Se fijaron como hipótesis operativas 10–15% para coordinación de pass-through, 15% para management medio,
  5–15% para creator affiliate, 2–5% para Efeonce success fee, 15–35% por 30 días de paid usage y 15–30% por exclusividad.
- Las skills Codex/Claude de Creator/UGC ahora incluyen las bandas, porcentajes, regla de no doble cobro y prohibición
  de presentar estos números como pricing público.

## 2026-07-29 — Creator Influence & Content: simulación end-to-end documentada

- Se añadió un caso comercial sintético para una campaña de perfume masculino con tres deportistas chilenos.
- El caso recorre intake, casting, vetting, contacto con representantes, negociación, derechos, producción,
  amplificación, medición, presupuesto de planificación y decisión go/no-go.
- Se enlazó desde la documentación funcional, el manual de operación, el índice de auditorías comerciales y las
  skills Codex/Claude de Creator/UGC. No constituye caso de éxito, disponibilidad confirmada ni cotización aprobada.

## 2026-07-29 — Globe: CEO conditional-go para primer servicio comercial gestionado

Se formalizó la autorización CEO para sacar Globe al mercado mediante un `Managed Creative Production Sprint powered by
Globe`: un cliente, un workflow y una ruta promovida, operado por Efeonce, con SOW/factura directa y sin acceso directo
del cliente al runtime. El contrato operativo queda en `docs/services/creative-studio/`; `TASK-1480` continúa
`in-progress` hasta reunir evidencia route-specific y ejecutar el primer sprint.

Corrección de fuente de verdad: el cliente inicial es **SKY Agencia Creativa**, con módulos `agencia_creativa` +
`globe`. La licitación SKY Blog/Wherex queda fuera del rollout; el brief correcto vive en
`docs/services/creative-studio/SKY_GLOBE_DESIGN_PARTNER_PILOT_BRIEF_V1.md`.

## 2026-07-28 — Contrato de producción visual social para reportes

- Se documentó el contrato técnico, funcional y operativo para producir posts de Instagram con reportes reales,
  incluyendo el patrón proof-first/score dominante, crop nativo 4:5, logo único, composición determinística y gates
  contra tarjetas azules, dashboards ilegibles, clipping y decoración genérica.
- Se sincronizaron las skills Codex/Claude de `design-studio`, `social-media-studio` y
  `greenhouse-ai-image-generator`.

## 2026-07-28 — HISTÓRICO SUPERSEDIDO — Plataforma UI compartida Efeonce: foundation local

- Se creó `EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1` para superseder parcialmente el modelo Globe-local y separar gobierno Greenhouse, packages portables, adapters por runtime y Lab independiente.
- Se registraron `TASK-1588` y `TASK-1589…1592`.
- Se inició `../axis-design-system` con tokens, contracts, registry y un Lab Vite navegable; build y tests pasan.
- Se creó `efeoncepro/axis-design-system`, se desplegó `axis-design-system-lab.vercel.app` y se publicaron
  `@efeoncepro/axis-tokens`, `@efeoncepro/axis-ui-contracts` y `@efeoncepro/axis-ui-registry` en GitHub Packages como `0.1.2`.
- En ese corte Greenhouse/Globe todavía no importaban los packages en runtime; la adopción quedó
  verificada como canary opt-in en `TASK-1591` el 2026-07-29.
- Se completaron las precondiciones de distribución privada: permisos GitHub Packages para Greenhouse/Globe,
  `NPM_RC` del Lab en Vercel y secreto/IAM de lectura para Cloud Build en `efeonce-globe`. El runbook operativo
  queda en `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`; el PAT operator-owned debe rotarse
  antes de cualquier rollout externo.

## 2026-07-28 — Globe: payload React migrado al pipeline Tailwind v4

- En `../efeonce-globe`, composer, shell, diálogos, feed, viewer, share board, primitives y base/motion dejaron
  de depender de hojas CSS de superficie; los estilos quedan en `studio-client/src/styles/tailwind.css`, con
  theme generado desde `tokens.ts`.
- Build, lint, 118 tests del cliente, gates de diseño, reduced-motion y Tailwind engine canary están verdes.
- `producerStyles` sigue únicamente en el fallback vanilla de `/producer`; su retiro continúa siendo el gate de
  `TASK-1560`, por lo que el rollout global aún no se declara cerrado.

## 2026-07-28 — Contrato operator-first y research primario

- Se canonizó `EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md`: las Product Services construyen la
  superficie operatoria; Greenhouse soporta assurance ejecutivo, memoria, coordinación y expansión.
- Se formalizó el ciclo `operador → operator-champion → sponsor/director → compra recurrente → evangelista` y se
  separaron los roles de usuario, problem owner, champion, sponsor, economic buyer y governance owner.
- Se creó `RESEARCH-010` con evidencia secundaria, hipótesis falsables, guion de entrevistas, scorecard y gates
  para validar la adopción primaria. No autoriza implementación ni venta general.
- Se sincronizaron `docs/context/*`, `project_context.md` y skills Codex/Claude relevantes.
- Se documentó que el mapa de dolores de agencia sigue vigente y debe traducirse, por oferta, en capacidades de
  memoria, consistencia, aprobaciones, evidencia, coordinación, governance y transferencia de capacidad; el
  operator-champion es señal de adopción, no sustituto de la solución.

## 2026-07-28 — Mapa de dolores y fallas del journey

- Se aplicó `efeonce-customer-experience` para convertir el mapa de dolores en un artefacto operativo de CX.
- Se creó `EFEONCE_OPERATOR_PAIN_AND_JOURNEY_FAILURE_MAP_V1.md` con lifecycle, moments of truth, causas backstage,
  service blueprint mínimo, recovery, métricas y señales de Greenhouse.
- La investigación externa reciente refuerza confianza/transparencia, procurement/coordinación y governance de IA;
  la validación primaria en Chile/LatAm permanece pendiente.

## 2026-07-28 — Operator-first como mecanismo del Why

- Se documentó la relación entre el Why de Efeonce y el contrato operator-first en estrategia, marca, experiencia,
  ecosistema, Greenhouse y skills.
- Se fijó la regla transversal: el valor debe ganarse por `capacidad + memoria`, nunca por dependencia u opacidad.
- Se conectó cada dolor del operador con la promesa de dejar al cliente más capaz y mejorar cada ciclo.

## 2026-07-28 — Content-to-Capability Loop y learn moments

- Se creó `EFEONCE_CONTENT_TO_CAPABILITY_LOOP_V1.md` para conectar Glitch, blog, YouTube, microcapacitaciones,
  Product Services y Greenhouse como un sistema de aprendizaje y autoridad.
- Se definió el `Learn Moment Contract` para convertir contenido en aprendizaje contextual, acción, evidencia y
  memoria dentro de los productos.

## 2026-07-27 — Globe: motor de estilos en Tailwind v4 y cierre de `TASK-1555`

- **ADR-016 implementado (pasos 1-4).** `apps/studio-client` adopta Tailwind v4 con el SSOT de tokens como
  theme. **Ninguna superficie migrada todavía**: el composer sigue con `producerStyles` y cero utilidades.
- **El theme se GENERA desde el SSOT, no se aliasea.** El idiom de la documentación de Tailwind
  (`@theme inline { --text-xs: var(--text-xs) }`) es una referencia circular cuando el nombre coincide a ambos
  lados —y en Globe casi todos coinciden—. Medido en browser: `text-xs` a 16px, `rounded-sm` a 0px,
  `font-display` en Times, **con el build verde**.
- **Cuatro gates de diseño**, no tres: cada uno cubre ahora la forma CSS y la forma `className`, con una regla
  común (el único valor arbitrario permitido es una referencia a token) y uno nuevo para espaciado y medidas.
  Verificados mordiendo. La escala ajena (`text-red-500`, `text-lg`) se cierra vaciando los namespaces.
- **Regla nueva:** en Tailwind, documentar un anti-patrón dentro del árbol escaneado **lo materializa** como
  clase real — el gate de literales los estaba emitiendo a la hoja servida.
- **`TASK-1555` (selector de modelo) cerrada.** Su ficha declaraba `Diseño` con el código vivo, un bloqueo ya
  resuelto y criterios que describían la galería rechazada. Reescritos contra el runtime; el canary pasó de 1
  ruta a una flota de 4 y ganó 11 asertos de browser. **Desbloquea el Slice 1 de `TASK-1552`.**
- **Dos hallazgos de runtime:** el canary servía el composer **sin la hoja del legacy** y daba todo verde; y
  `.advanced-controls > summary` tiene `display:none`, así que ese `<details open>` **no tiene control para
  cerrarse** — la progressive disclosure no existe, el markup es decorativo.

## 2026-07-27 — Reconciliación de costo del AI Visibility Grader

- Se documentó que `grader_runs.estimated_cost_usd` es un guard parcial, no costo all-in ni base suficiente para pricing.
- La auditoría de un run público real recalculó ~US$0,3067 en providers principales antes de extracción LLM; el valor persistido US$0,2767 omitía request fees de Perplexity.
- Se documentaron los 18 intentos de extracción LLM sin tokens/costo persistidos y la imposibilidad de asignar directamente el costo del `ops-worker` compartido.
- Se sincronizaron la documentación funcional, el runbook de smoke y las skills Codex/Claude; la instrumentación completa queda pendiente.

## 2026-07-27 — Brand Visibility Grader: Think live reconciliado

- Se verificó que `https://think.efeoncepro.com/brand-visibility` está publicado y sirve el form gobernado del grader.
- Se actualizaron TASK-1246/TASK-1327, el índice de tasks, el ledger de flags, la documentación funcional de Think y el handoff para retirar el estado histórico “superficie inexistente”.
- El loop base queda documentado como submit → run → status → reporte tokenizado; resta consolidar evidencia E2E fechada y sincronizar el lifecycle de TASK-1335/TASK-1336.

## 2026-07-27 — Ecosystem Work Registry y Federated Execution Harness

- Se formalizó el ADR propuesto que extiende el harness Greenhouse-local hacia una arquitectura de ecosistema: Greenhouse conserva registro, visibilidad y coordinación global; cada repo conserva ejecución y evidencia primaria.
- Se definieron work contracts, Repo Capability Manifests, adapters federados, estados de freshness y una transición read-only antes de habilitar mutaciones cross-repo.
- Se fijó que ESLint, `pnpm`, typecheck, tests, build, deploy y smoke se declaran por repo mediante verification profiles; Greenhouse agrega sus resultados y aplica policy sin imponer una toolchain común.
- Se aclaró que el contrato debe gobernar tanto `pnpm codex:task-hook` como `/implement-task` de Claude; los gates actuales del command de Claude pasan a ser un perfil Greenhouse-specific, no requisitos universales del ecosistema.
- No se autorizó todavía schema, transporte, adapter concreto, ejecución remota, deploy ni segundo task registry.

## 2026-07-27 — Wave Product House, Greenhouse Admin y Agent Native

- Se formalizó `EPIC-037` y el ADR propuesto para que Wave sea la casa de producto de sus Product Services, con Greenhouse como admin/control plane transversal de todas las plataformas Efeonce.
- Se documentaron Agentic Readiness y Experience LaunchOps como Product Services compuestos de Wave sobre las cinco familias base; Agentic Readiness incluye Snapshot público, Audit/Grader, workbench interno, superficie cliente y monitoreo.
- Se explicitó el contrato de identidad: una sesión/SSO de Greenhouse para entrar a las plataformas habilitadas, con subject, tenant, capabilities y entitlements verificados localmente en cada runtime.
- Se estableció Agent Native + Full API Parity como requisito de nacimiento para los nuevos productos; no se autorizó runtime, migración del Brand Visibility Grader actual, pricing ni rollout.

## 2026-07-26 — Foco comercial: beachheads, entrada y expansión

- Se creó `EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md` para convertir el portfolio amplio en una máquina comercial secuenciada.
- Se priorizaron cuatro beachheads: AI Visibility & Search; RevOps & HubSpot; Performance & Commerce; y Creative Velocity & Production.
- Se definieron ofertas de entrada, rutas de expansión, motions, proof system, campos de cross-sell y validación de 90 días.
- La amplitud del catálogo queda para expansión; no se autoriza presentar todo el portfolio como paquete inicial ni convertir los umbrales de validación en KPI de runtime.

## 2026-07-26 — Partner & Provider Layer transversal

- Se formalizó el modelo transversal de partnerships y providers de Efeonce.
- Se separaron las capas vendibles: licencia/acceso, advisory, implementación, managed operations, Product Services e IP propia.
- Se clasificaron HubSpot, OpenAI, Claude, Google Cloud, Microsoft AI Cloud, AWS, Salesforce, Adobe, Lovable y providers creativos sin confundir provider, partnership aprobado, product brand o business line.
- Se sincronizaron arquitectura, business models, GTM, context pack y skills; el estado de programas permanece en la auditoría fechada y no habilita claims comerciales por sí solo.

## 2026-07-26 — HubSpot: brochure histórico convertido en input gobernado

- Se revisaron los brochures Efeonce x HubSpot de 2024/2025 y se documentó qué capacidades se absorben en RevOps & CRM.
- El catálogo adopta el recorrido diagnóstico → arquitectura → implementación modular → enablement → operación,
  con ofertas diferenciadas y HubSpot explícitamente como plataforma/provider.
- Se sincronizaron `hubspot-as-a-service` y `hubspot-solutions-partner` en `.codex` y `.claude`; claims, precios,
  bundles y disponibilidad del brochure quedan fuera del canon hasta verificación primaria fechada.
- Auditoría: [`HUBSPOT_BROCHURE_REVIEW_2026-07-26.md`](docs/audits/commercial/HUBSPOT_BROCHURE_REVIEW_2026-07-26.md).

## 2026-07-26 — TASK-1566 COMPLETE: fondeo gobernado de créditos de Globe vivo, ejercido y con la autoridad vieja retirada

- **Primer fondeo real de Globe punta a punta sin break-glass**: `propose` (plan legible con el delta
  completo) → `confirm` en 905 ms con atribución humana real; grant +100 `posted`, tope 400→800 y
  asiento de ledger en **una** transacción; `pg_locks` 0/0/0 después. En el camino se cerraron los
  7 defectos en cadena de la sesión (incluida la federación WIF Vercel→Globe que **nunca** había
  funcionado y el self-deadlock del store transaccional — regla nueva: dentro de la transacción,
  ningún port abre conexión propia).
- **Retiro ejecutado (ADR-015 §10)**: el caller genérico (y el broker de tenancy) perdió las 4
  capabilities de credit-admin; señal anti-regreso en dos capas (evento
  `globe.credit_admin.caller_authority_drift` + test de disyunción); scripts de firma cliente
  eliminados.
- **Triple documentación**: manual `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`
  (con las dos correcciones de runbook medidas: clave de idempotencia propia para el confirm;
  anti-replay del broker por propuesta), funcional
  `docs/documentation/creative-studio/fondeo-gobernado-creditos-globe.md`, ADR-015 delta + skill.
- **Hardening restante como tasks nuevas**: `TASK-1584` (KMS + identidades disjuntas),
  `TASK-1585` (break-glass gobernado + retiro del HMAC), `TASK-1586` (desambiguador de negación al
  operador — cierra ISSUE-124).

## 2026-07-26 — Media & Distribution: catálogo y reubicación de servicios Reach

- Se revisó el brochure 2026 de Reach y se formalizó `Media & Distribution` como línea de negocio de Efeonce.
- Se documentaron las siete familias de servicio, la separación entre Influencer Marketing y UGC, la capa operativa
  IMO, las modalidades On-Going/On-Demand/Staff Augmentation y los boundaries con Creative Services, Wave, Kortex y
  Growth Strategy & Measurement.
- Reach queda como product brand habilitadora; no se presenta como agencia, unidad comercial principal ni equivalente
  a toda la línea. El catálogo queda en `docs/services/media-distribution/README.md` con estado `Approved for validation`.
- Se profundizó el packaging: tres soluciones comerciales —Distribution Strategy & Media Architecture; Performance
  & Commerce Distribution; e Influence, Earned & Partnership Distribution— y Managed Media Operations como capa de
  delivery. Se agregó beachhead, JTBD, buying group, criterios de calificación, métricas y guardrails de revenue.
- Se creó el business model canónico `docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md`
  y se sincronizaron context pack, estrategia de capital, Creative Practice, public/private tenders y squad design.
- Se agregó el benchmark [`PERFORMANCE_COMMERCE_DISTRIBUTION_MARKET_RESEARCH_2026-07-26.md`](docs/audits/commercial/PERFORMANCE_COMMERCE_DISTRIBUTION_MARKET_RESEARCH_2026-07-26.md) y se robusteció Performance & Commerce alrededor de señales first-party, medición, commerce, creative performance y governance algorítmico. MMM e incrementality quedan como escalera avanzada y no como promesa general.

## 2026-07-26 — Creative Services: catálogo y skills sincronizados

- Se formalizó el catálogo de Creative Services como línea de negocio de Efeonce: Creative Strategy & Brand
  Systems, Campaign & Creative Platform Systems, Content & Social Operations, Audiovisual/Motion/Audio Production,
  Run-and-Gun Production, Managed Creative Capacity y AI Creative Operations/Studio Access.
- Se sincronizaron las skills gemelas de `creative-practice`, incluyendo el hand-off a studios, la frontera
  Run-and-Gun Studio/capability versus Run-and-Gun Production/servicio y las composiciones con Wave, Reach y
  Search Visibility.
- Globe conserva el rol de product brand habilitante; no se convierte en la línea creativa completa. No hubo cambios
  de runtime ni de pricing aprobado.

## 2026-07-26 — Portfolio Efeonce: marca paraguas, líneas y product brands

- Se canonizó la separación entre **Efeonce** como marca paraguas/relación comercial, líneas de negocio/prácticas,
  product brands/platform brands, ofertas, delivery models y engagements en
  [`EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`](docs/architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md).
- Se corrigió el lenguaje de contextos, business models, catálogo de servicios y skills: Creative Services no se
  reduce a Globe; Digital Services & Engineering no se reduce a Wave; RevOps & CRM no es una quinta unidad; Reach,
  Wave, Globe, Kortex y Verk nombran productos/sistemas cuando corresponde; Greenhouse es el control plane.
- No hubo cambios de runtime, schema, catálogo productivo ni configuración externa.

## 2026-07-26 — Globe genera de verdad: Producer React vivo y carril de fondeo gobernado

- **Generación desbloqueada.** Las tres modalidades producen desde la UI con principal humano por el BFF:
  imagen (Seedream 5 Pro), video (Seedance 2.0) y audio (ElevenLabs Multilingual v2). Lo que lo bloqueaba
  era un falso positivo del sanitizador, que leía `"Key visual…"` —término de dirección de arte— como una
  credencial (`ISSUE-127` capa 8). Se corrigió el **control**, no el prompt: una credencial serializada es
  un token opaco, no una frase.
- **Producer React en runtime** (`globe-studio-internal` rev `00094-pr8`). El código ya estaba desplegado;
  lo tapaba `GLOBE_CLIENT_PRODUCER_ENABLED=false`, con su gate de paridad ya verde. Se corrigieron además
  el viewer (la pieza no llenaba su celda por una herencia del share board), las acciones muertas en una
  corrida fallida y los enums crudos (`with-audio`/`silent`) que salían como copy visible.
- **Carril gobernado de fondeo de crédito vivo** (`globe-api-internal` rev `00106-b6w`, 176 capabilities).
  La atribución humana pasó de convención de payload a control exigible: tabla append-only en Greenhouse
  con trigger en la base que rechaza que un principal de servicio figure como el humano que aprueba. La
  mutación (grant + asiento + política) corre en **una** transacción.
- **El segundo confirmador humano quedó como política por workspace** (default OFF en el interno) más
  techo por operación, no como invariante — coherente con ADR-015. Un control que su único usuario no
  puede satisfacer no protege: desvía al break-glass.
- Pendiente para cerrar `TASK-1566`: ejercer `propose`→`confirm` con Greenhouse desplegado. El ADC local
  no puede impersonar al workload caller, por diseño.

## 2026-07-26 — Routing económico y creativo de modelos generativos

- Las skills de diseño/motion y Business Model Operator documentan la selección por caso de uso entre Seedance 2.0,
  Gemini Omni y FLUX 3, además de la comparación de consumo directo vs. Fal.
- FLUX 3 queda explícitamente como early access sin API pública general ni precio público al corte; no entra en
  compromisos de producción ni en unit economics aprobados.
- Se sincronizaron las fuentes `.codex`/`.claude` correspondientes; no hubo cambios de runtime.

## 2026-07-26 — Registro de postulaciones a partners de IA generativa

- Se creó [`docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md`](docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md) con el mapa, evidencia, estados y próximos pasos de Anthropic/Claude, Lovable, OpenAI, Google Cloud, AWS, Salesforce, Runway, FLUX, BytePlus/ByteDance, ElevenLabs y HeyGen.
- Se confirmaron envíos a FLUX, Runway Enterprise y ElevenLabs; BytePlus quedó bloqueado únicamente por reCAPTCHA.
- Se incorporó a las skills de business model y customer model la clasificación de partners por función y los gates de oferta, ownership, economics, derechos, procurement, continuidad, fallback y evidencia de demanda; los companions de Claude quedaron sincronizados.

## 2026-07-26 — ADR-015: Greenhouse administra Globe (créditos y capabilities de usuarios)

- Se creó `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` (**ADR-015**,
  Proposed) y se registró en `creative-studio/DECISIONS_INDEX.md` + `README.md`. Greenhouse es la **superficie** de
  administración; Globe la **autoridad**: la llave de aprobación nunca sale de su runtime y ningún actor obtiene
  aprobación y ejecución a la vez.
- Se creó **`TASK-1566`** (backend-data/command, backend-critical) como su implementación, con el registry y el
  índice de tasks sincronizados. Siguiente ID libre: `TASK-1567`.
- Se corrigieron dos afirmaciones de los deltas del 2026-07-26 de ADR-014, con evidencia de código: la autoridad de
  crédito **ya está** concedida al principal genérico `globe:service:internal-caller` junto con el gasto (no falta
  una capability, **sobra**), y el maker-checker de crédito es **vacuo** para cualquier caller de workload porque
  compara contra un `principalId` que es constante por clase. De ahí que la disyunción de actores viva en Greenhouse
  y no en Globe.
- Se corrigió el diseño objetivo del Delta (4): grant + asiento de ledger + política van en **una** transacción
  Postgres, no en una saga — los tres agregados viven en la misma base.
- Se actualizó `ISSUE-124` con la causa localizada: `dispatch.ts` colapsa **tres** clases de error de crédito en
  `conflict` (incluido `maker_checker_required`, indistinguible de `pool_paused`) y el desambiguador
  `budget.evaluate` está `policy-blocked` en `ui`. Solución = Slice 1 de `TASK-1566`.
- **Cambio de contrato para agentes:** la skill `greenhouse-globe` (`.claude/` y `.codex/`) pasa de 5 a 8 reglas en
  `Gasto y crédito en Globe`, y nace `.claude/rules/globe-administration.md` (auto-load por `src/lib/globe/**` +
  `src/lib/sister-platforms/**`). El pointer **no** se agregó a `CLAUDE.md`: el router estaba a 27 tokens del techo
  y el routing ya existe vía la skill y el índice de `creative-studio`.

## 2026-07-26 — Experience LaunchOps + Globe: producción creativa para experiencias launch-ready

- Se creó `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GLOBE_CREATIVE_PRODUCTION_INTEGRATION_V1.md`.
- La frontera queda explícita: Globe produce `CreativeAssetPack`, `AssetManifest` y `AssemblyManifest`; Wave conserva
  `LaunchContract`, ensamblaje, Search/AEO, Measurement, governance, release y evidencia.
- Se distinguen `asset-ready`, `experience-ready` y `launch-ready`, y se agregan los modos client-assets,
  Globe-assisted, Globe-managed y full Efeonce.
- Las skills gemelas `.codex/skills/greenhouse-globe/SKILL.md` y `.claude/skills/greenhouse-globe/SKILL.md` incorporan
  el `Creative Production Contract`, la composición con Wave y la regla de no pasar secretos ni integrar ad hoc.

## 2026-07-26 — Efeonce Product Service Operating Model transversal

- Se creó `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` para definir `Product Service` y
  separar oferta, productización, delivery model, operating mode y engagement.
- El contrato cubre scope, outputs, roles, plataformas, Workers, quality gates, pricing architecture, economics,
  legal/IP, evidence, expansion y stop conditions.
- Business Model y Pricing Operators de Codex/Claude ahora deben cargar este modelo antes de diseñar packaging o
  pricing; Wave, Globe y Experience LaunchOps quedan referenciados a él.

## 2026-07-26 — Directriz corporativa 2028: todos los servicios Productized y AI-native

- Se creó `docs/strategy/EFEONCE_2028_PRODUCTIZED_AI_NATIVE_SERVICES_STRATEGIC_DIRECTION_V1.md`.
- La directriz aplica a todo servicio client-facing y exige Product Service Contract, workflow repetible, IA
  estructural, autoridad humana, plataforma/memoria, gates, economics, governance y evidencia.
- ASaaS Manifesto, modelo ASaaS, contexto corporativo y skills de agencia, business model, pricing y customer model
  quedaron alineados. AI-native no se interpreta como SaaS puro, self-service, autonomía total ni reducción de personas.

## 2026-07-26 — Customer Model Operator para Codex y Claude

- Se creó la skill transversal `efeonce-customer-model-operator` en `.codex/skills/` y `.claude/skills/`.
- Se cubrieron ICP, segmentación, beachhead, JTBD, triggers, WTP, buyer personas, buying group, stakeholder map,
  decision/paper process, procurement readiness, qualification, evidence, adopción, retención, expansión y gates.
- Se añadió el `Customer Model Integrity Pack` reusable, con evidence ledger, confidence, owners, falsadores y handoffs.
- Business model, GTM, commercial, research, pricing y agency quedaron conectados a la nueva capa; las ofertas concretas
  siguen siendo responsables de aportar evidencia y mantener sus boundaries.

## 2026-07-26 — Customer Model Integrity Pack para Search Visibility 360

- Se creó `SEARCH_VISIBILITY_360_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md` aplicado a la oferta SEO+AEO integrada de Wave.
- El alcance comercial queda explícitamente en mid-market y enterprise; SMB queda fuera salvo decisión posterior.
- El pack separa ICP estratégico/oportunidad/delivery y califica de forma independiente diagnostic, implementation,
  managed operation, ecosystem/providers y renewal.
- Se documentan jobs secuenciales, buying group por fase, decision/paper process, provider governance, transition gates,
  evidence ledger y experimentos. Verdict: `model_incomplete` / `hypothesis_only`.

## 2026-07-26 — EPIC-022 incorpora readiness de producto-servicio

- Se añadió al epic la madurez actual de AEO, la diferencia entre arquitectura SEO y runtime SEO, y los gaps para cerrar
  el loop diagnóstico → acción → implementación → verificación → renovación.
- Se fijó mid-market y enterprise como alcance; SMB queda fuera salvo decisión explícita.
- Se agregaron gates independientes para diagnostic, commercial qualification, implementation, managed operation,
  renewal/expansion y enterprise readiness, además de la secuencia por olas AEO → SEO mínimo → 360 → authority/enterprise.

## 2026-07-26 — Pricing transversal para Codex y Claude

- Se creó la skill agnóstica `efeonce-pricing-operator` en `.codex/skills/` y `.claude/skills/`.
- Se consolidaron patrones investigados de value-based/cost-floor pricing, productized services, capacity,
  managed delivery, T&M/fixed/milestone/usage/outcome/hybrid, credits, AI cost controls, margin waterfall,
  discount governance, versionado y validación.
- Business model, GTM, commercial, Finance, Creative Practice y SEO/AEO Practice quedaron enrutados al companion;
  sus reglas específicas siguen siendo dueñas de sus respectivas líneas.

## 2026-07-26 — Primera aplicación de pricing a Wave

- Se probó `efeonce-pricing-operator` sobre las cinco familias de Wave y sus seis delivery models.
- Se creó `docs/business-models/wave/WAVE_PRICING_INTEGRITY_PACK_V1.md` con métricas candidatas, revenue
  architecture, economics, experimentos y gates de aprobación.
- El resultado es `hypothesis_only`: no se aprobaron tarifas, claims, márgenes ni venta general.

## 2026-07-26 — Pricing específico para Search Visibility 360

- Se creó `SEARCH_VISIBILITY_360_PRICING_INTEGRITY_PACK_V1.md` como aplicación específica de la skill general de
  pricing a Search Visibility 360.
- El pack separa diagnóstico, foundation, operación, transparencia/plataforma, capacidad de contenido y expansión;
  evita usar artículos como unidad pública y trata SEO+AEO como producto integrado.
- Verdict: `hypothesis_only`, pendiente de Finance, evidencia de willingness-to-pay, capacidad y aprobación comercial.

## 2026-07-26 — Business Model Integrity Pack para Search Visibility 360

- Se creó `SEARCH_VISIBILITY_360_BUSINESS_MODEL_INTEGRITY_PACK_V1.md` para completar customer/value, oferta, delivery,
  revenue, economics, data/IP, evidence, scale y capital sin convertir hipótesis en decisiones.
- El modelo canónico ahora enlaza su Integrity Pack y mantiene `Draft`; el verdict actual es `model_incomplete`.

## 2026-07-25 — Wave portfolio y boundaries documentados

- Se formalizó Wave como marca de producto de Efeonce para cinco familias: Search Visibility 360, Web Experience 360,
  Measurement & Analytics, Agent Systems & Platforms y Digital Automation & Integrations.
- Se fijó que CRM/RevOps pertenece a Efeonce Digital/Kortex; Wave sólo entrega capas técnicas conectadas.
- Se documentó la frontera con Globe (contenido/producción) y Reach (medios/distribución), manteniendo Efeonce como
  masterbrand externa.
- Canon: `docs/architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md` y
  `docs/business-models/wave/WAVE_BUSINESS_MODEL_V1.md`.
- Se separaron product service, delivery model, engagement, operating mode y composición del ecosistema; Wave puede
  operar Managed Squad, Staff Augmentation y otros modelos sin cambiar el ownership de la oferta.

## 2026-07-25 — Globe: el payload de browser deja de ser un string (ADR-014, foundation)

`TASK-1556` cerrada. Nació `apps/studio-client` en `efeonce-globe` (Vite + React + React Router, SSR
apagado) compilando a assets estáticos que sirve el **mismo** `studio-web`; host, BFF, sesión SSO, CSP por
nonce, ALB y API privada sin tocar. Con el flag `client_app_enabled` en `false` **ningún comportamiento
cambia**: es fundación, no superficie.

Globe estrena SSOT de tokens con drift ledger, capa de copy locale-keyed, ESLint acotado (jsx-a11y +
rules-of-hooks) y 3 gates de diseño como tests — los 6 verificados **mordiendo**. React Compiler activado.
Las dos compuertas de la ADR cerraron verdes, así que el fallback a `vite@7.3.x` se retira.

El share board, la única superficie que ve un cliente, se separó a `TASK-1558`: necesita dirección visual
aprobada y no existe.

## 2026-07-25 — Globe: `/assets/*` sale por CDN (TASK-1557)

Carril CDN acotado a `/assets/*` sobre el ALB existente, aplicado y verificado en vivo con hits del
edge. El backend del shell SSO conserva `enable_cdn = false` y el path matcher es un allowlist cuyo
default apunta al backend sin caché: si una regla no matchea, el request cae hacia el lado seguro.
La política de caché la sigue declarando el origen (`USE_ORIGIN_HEADERS`), para no crear una segunda
fuente de verdad. Nada autenticado se cachea, verificado path por path.

## 2026-07-25 — Globe: /producer convertido a React y el bug que dejaba todo command inoperante

- Header y composer de `/producer` convertidos 1:1 reutilizando `producerStyles` verbatim: selector de flota
  con isotipo real y filtrado por modalidad, formato de salida con chips y stepper, Sugerencias, presets,
  Seed y Modo. `/producer` sigue en legacy (flag en `false`).
- Causa raíz: el transporte inventaba la cabecera `x-globe-idempotency-key`; la plataforma usa
  `x-idempotency-key`. El BFF rechazaba todos los commands sin lanzar, así que el fallo no dejaba rastro.
  Ni `Generar` ni `Mejorar` funcionaban. Corregido y verificado en vivo.
- La API (`globe-api-internal`) estaba desfasada del web varios commits, y el dispatch de commands ocurre
  ahí. Ambos servicios al día.
- Observabilidad: se otorgó `roles/logging.logWriter` a las runtime SAs (sin él el servicio corre mudo) y se
  agregó la señal de arranque. Localización de rechazos en handler y envelope, con el nombre del campo.
- Un rechazo de la salida del enhancer ya no se reporta como `invalid_request` del caller.
- La skill `greenhouse-globe` (Claude y Codex) suma siete reglas duras nuevas: cabeceras al portar,
  `idempotencyKey` en el cuerpo, el deploy por servicio, `textPayload` vs logs JSON, `logging.logWriter`,
  el estilado por atributo de la hoja legacy y los controles de salida sin `<select>`.

## 2026-07-25 — Globe: regresión del feed cerrada y mecanismo de conversión de `/producer` a React

- Se cerró la regresión visual de `/producer/feed` portándola del legacy (autoridad de lo ya probado en
  producción, no del prototipo): grid con filas parejas, reposo de card con su sombra, guard de `<img>` sin
  `src`, toggle de selección, clamp del título, fecha en el pie y washes de vuelta a la familia azul.
  Desplegado y verificado: revisión `globe-studio-internal-00078-5gs`.
- Dos bugs que sólo se ven con la obra cargada: `.pf__badge` sin `z-index` (el thumbnail tapaba "Destacada")
  y su relleno dependiente de un media oscuro para ser legible.
- Se montó el mecanismo para convertir `/producer` **sin recrear**: `renderShell` acepta
  `extraStyles`/`extraStylesheets` y la rama React sirve `producerStyles` del legacy **verbatim** + iconos
  Tabler, con flag propio `GLOBE_CLIENT_PRODUCER_ENABLED` (default off, cableado).
- `/v1/session` publica `identity {name,email}` hermana del `principal` (presentación, no autoridad).
- `/producer` sigue sirviendo el legacy: la conversión de la superficie está pendiente. Decisión en ADR-014
  § Delta 2026-07-25 (2); checkpoint en `TASK-1505`.

## 2026-07-25 — Skills de investor readiness y business model

- Se crearon `.codex/skills/efeonce-investor-readiness/` y `.codex/skills/efeonce-business-model-operator/`
  con operating loops, gates, templates, fuentes verificadas, escenarios de evaluación y validadores locales.
- Se actualizó el routing de `AGENTS.md`, `CLAUDE.md`, `efeonce-agency`, `project_context.md` y
  `docs/business-models/README.md`. El cambio no autoriza instrumentos financieros, emisiones, spinouts,
  pricing, ventas ni transferencia de IP.
- Se endurecieron los artefactos: templates del pack de inversión, source catalogs, validadores de ledger y
  data room, acceptance criteria/protocol de evals, y drafts `Draft` de Efeonce Group, Growth Platform, AEO
  y Search Visibility 360 sin inventar datos financieros o de tracción.
- Se redactó la arquitectura canónica de modelos de negocio: corporativo, plataforma, capability/oferta,
  packaging y submodelos, con ownership, gates y reglas de consolidación.

## 2026-07-25 — Cutover del share board de Globe: LIVE, y las dos precondiciones que faltaban (TASK-1558 Slice 3 + TASK-1562)

- **El share board nuevo esta sirviendo.** `client_app_enabled` en `true`, revision
  `globe-studio-internal-00071-6vp`, imagen `85dac33b03b1`. La pagina paso de 6.095 bytes de HTML
  concatenado a 2.446 de shell, el rotulo interno `Producer` desaparecio del DOM servido, y el footer
  existe por primera vez.
- **Precondicion 1: el flag estaba declarado y conectado a NADA.** `grep -rn client_app_enabled
  infra/terraform/*.tf` devolvia **una sola linea**, su propia declaracion. Cambiar su default a `true`
  habria producido un **plan vacio**: el env var nunca llegaba al contenedor, y el cutover habria quedado
  como un commit que dice "prendido" con produccion sirviendo lo viejo — el modo de falla de
  `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`, donde el ledger decia ON y la realidad era OFF.
  **Heuristica reutilizable:** si el grep de un flag devuelve una sola linea, esa linea es su declaracion
  y no esta cableado; un flag conectado aparece al menos dos veces.
- **Precondicion 2: la imagen desplegada era anterior incluso a TASK-1556**, o sea sin bundle y sin leer
  esa variable. Otra sesion habia reportado que "lo unico que quedaba era el flip"; verificado contra el
  runtime, faltaban tres cosas.
- **La cadena se ejecuto en el orden que importa:** cablear (revision `00069`, flag en `false`) → hidratar
  la proyeccion → desplegar (revision `00070`, **share board todavia legacy con el flag OFF**, o sea el
  strangler verificado en vivo y no afirmado) → flip (revision `00071`). Los dos planes: `0 to add,
  1 to change, 0 to destroy`, sin replace de Cloud Run.
- **TASK-1562 — la proyeccion del share dejaba el panel vacio en produccion.** `resolveForShare` devolvia
  `{ target, mediaType }`, y `project()` solo emite un field si el grant lo autoriza **y** la fuente lo
  trae: `modelLabel`, `reviewStatus` y `comments` se descartaban en **todos** los shares, aunque el
  Producer pide los cuatro fields y el operador puede crear los comentarios. Nada fallaba y nada loggeaba.
- **El nombre del modelo sale del catalogo, no del intento.** `attempt.model` es el modelId —el valor que
  `model-readiness` compara contra `route.modelId`— y es un identificador de wire; `RouteModelIdentityV1`
  del catalogo es el ancla publica con drift guards que rechazan cualquier cosa con forma de slug. Leerlo
  del intento habria shippeado el slug a una superficie cliente, que es lo que ADR-003 prohibe.
- **Reglas de audiencia client:** los comentarios borrados se descartan (`getThread` sirve el hilo interno,
  donde un borrado es historial; para un cliente es algo que alguien retiro); orden ascendente por
  `createdAt` y tope de 20 conservando el **comienzo**, porque los ultimos veinte de un hilo largo son
  decisiones sin premisa; y el hilo degrada solo — store caido cuesta el panel, nunca la pieza.
- **Verificacion en vivo contra el front door real**, 3 anchos (1440, 390 y **320**, el piso de WCAG
  1.4.10): estado terminal correcto, un solo `role="alert"`, Reintentar ausente donde no aplica, fuentes de
  Globe cargadas, `scrollWidth <= clientWidth`, cero fuga en el DOM servido, axe **0 violations**, y la CSP
  de produccion sin rechazar nada.
- **Lo que NO se verifico, y por que importa:** el estado `ready` con un **grant real**. Crear uno exige
  sesion interna en el Producer sobre un output existente y no es alcanzable headless. Es el unico punto
  pendiente del runbook, y es exactamente la razon por la que `TASK-1560` (retiro de `public-share-ui.ts`)
  sigue bloqueada: ADR-014 exige cobertura equivalente en runtime antes de retirar lo viejo.
- Rollback vigente: `default = false` + `tofu apply`, <10 min, y vuelve `public-share-ui.ts` intacto
  porque no se retiro.

## 2026-07-25 — Globe: el CDN de assets es lo único que cambió en runtime; el payload cliente NO está servido

- **Cambio real en runtime — `TASK-1557` (cerrada):** Cloud CDN path-scoped sobre `/assets/*` en
  `globe.efeoncepro.com`, **aplicado y verificado en vivo** (hits del edge). Nada autenticado se cachea, y el
  invariante quedó como test (`front-door-contract.test.ts`) en vez de comentario. Detalle:
  [`GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
- 🔴 **El share board y el payload cliente NO cambiaron nada para ningún usuario.** `TASK-1556` (foundation) y
  `TASK-1558` Slices 1-2 están en `main` de `efeonce-globe`, pero **ninguna superficie sirve sobre el payload
  nuevo**: el cliente externo sigue viendo `public-share-ui.ts`, el template viejo. Es construcción, no entrega.
- **Se corrigió una creencia equivocada: el cutover no es "un `tofu apply`".** `client_app_enabled` no estaba
  cableado a ningún recurso (aparecía sólo en su propia declaración) y la imagen desplegada del shell
  (`45235ccb62ca`) es anterior a `TASK-1556`, así que no lee la variable. El flip solo habría dado plan vacío y
  producción idéntica — el modo de falla de `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`. La cadena real (cablear →
  `TASK-1562` → deploy con **autorización humana** → flip + apply → verificar con grant real → retirar legacy)
  vive en [`operar-share-board-globe.md`](docs/manual-de-uso/creative-studio/operar-share-board-globe.md) **v1.1**;
  la v1.0 afirmaba lo contrario.
- **`TASK-1562` reclasificada:** `resolveForShare` descarta en silencio `modelLabel`/`reviewStatus`/`comments`
  en todos los shares de producción, aunque el grant los pide y el dominio los proyecta. Es un bug con impacto
  de cliente, no una condición estética del cutover.
- **Cierres documentales:** `TASK-1554` (reader de flota de modelos) cerró con doc funcional
  [`efeonce-globe-producer-flota-modelos.md`](docs/documentation/creative-studio/efeonce-globe-producer-flota-modelos.md)
  y manual [`operar-flota-modelos-producer-globe.md`](docs/manual-de-uso/creative-studio/operar-flota-modelos-producer-globe.md).
  `TASK-1561` cerró el gate de diseño (tipografía + frontera declarada). El selector de modelo del Producer
  (`TASK-1555`) quedó como desplegable compacto con isotipo real: la galería se implementó y el operador la
  rechazó al verla. Nuevas: `TASK-1559`, `TASK-1560`, `TASK-1562`.

## 2026-07-25 — TASK-1558: el share board de Globe, la cara del cliente, reconstruida (ADR-014 Slice 1)

- **La única superficie que un cliente externo ve de Globe deja de ser 15 líneas con 3.071 caracteres de CSS
  en una sola línea.** Reconstruida como componentes tipados sobre el SSOT de tokens del payload cliente
  (`efeonce-globe` `a336ff5`). Nacen las primeras primitives de Globe —`Chip`, `Eyebrow`, `FactList`,
  `CommentList`, `MediaStage`, `StateBlock`— sirviendo a esta superficie; su promoción a plataforma se
  **propone**, no se asume. `Surface` NO se entregó: la dirección elegida no la necesita y una primitive con
  un solo consumer y ningún rol visual es una hipótesis.
- **Dirección visual aprobada: B "lámina montada"** (passepartout + riel de líneas). Tres direcciones
  renderizadas con los tokens y las fuentes reales y miradas en los dos targets, no comparadas en prosa.
  **A se rechazó por descalificante**: `object-fit: cover` recorta la pieza y la viñeta le altera el color, o
  sea corrompe el artefacto que el cliente vino a juzgar. **C** degradaba la pieza a ilustración de documento
  y su fila de chips prometía filtros en una superficie read-only.
- **Cuatro defectos verificados en la línea base, arreglados:** cards anidadas en el panel (card-on-card, que
  el estándar de entrega trata como fallo de diseño); valores crudos al cliente (`changes_requested` y
  `2026-08-01T18:00:00.000Z` iban directo a `textContent`); el rótulo interno `Producer`; y la ausencia total
  de footer. La línea base "antes" se capturó antes de tocar nada — no existía.
- **El estado que no existía y es el que ADR-005 pide de verdad: `partial`.** Si fallan los bytes, el
  `.catch(fail)` de hoy tira **también** los hechos y los comentarios ya recibidos y pinta un mensaje
  genérico — que es exactamente el "preview roto genérico" que la Delta prohíbe. Ahora el riel sobrevive
  legible y sólo el stage degrada, con un Reintentar acotado a los bytes.
- **Recalibración de la spec: los cuatro códigos de error NO son distinguibles, y es correcto.**
  `publicShareError` (`app.ts:4143`) colapsa inválido/vencido/revocado/de-otro-target/denegado en **un 404 no
  enumerable a propósito**, y sólo deja el 503 aparte para que el cliente pueda reintentar. Enumerarlos en la
  UI reconstruiría el oráculo de grants que el colapso existe para evitar; además el `Out of Scope` de la
  task prohíbe tocar el BFF. La regla de ADR-005 que se citaba gobierna el **feed del Producer**
  (autenticado), no el share público. La unión discriminada real tiene 5 miembros.
- **Tipografía al SSOT, con escala.** `--font-display`/`--font-body`, cuatro pasos sin huérfanos, leading,
  pesos limitados a los tres cuts cargados, tracking y measure. La base sube a **16px**: el producer pone el
  texto de lectura en ~13.6px, bajo el piso de 14px supplementary, y eso es defendible en una consola interna
  donde el operador vive todo el día — no en la superficie que un cliente lee una vez, en un dispositivo
  desconocido, para juzgar trabajo creativo. El riel se ensanchó a 22-27rem porque 52ch a 16px lo exige: a
  24rem daban ~40 caracteres por línea, bajo el piso de 45.
- **El gate de diseño pasa de 6 a 8 reglas y ahora camina `.css`.** Era el único lugar donde un hex, una
  duración o una fuente podían seguir tipeándose a mano — un gate que deja de aplicar en cuanto el payload
  gana su primer `.css` no es un gate. Reglas nuevas: tipografía literal, y **peso sin `@font-face`** (faux
  bold renderiza, shippea y pasa todos los demás gates). Las cuatro verificadas rompiéndolas a propósito.
  Y una lección de método: la primera versión de la regla de tipografía usaba un lookahead negativo cuyo
  `\s*` retrocedía a ancho cero, así que **reportaba toda línea correctamente tokenizada**; una regla que
  enrojece código compliant se apaga sola.
- **`/legal/terms` retirado — y no estaba donde la spec decía.** El link roto que devolvía JSON crudo a un
  browser vivía en el footer del **Producer** (`producer-ui.ts:82`), no en el share board, que no tiene ni
  footer ni un solo `<a>`. Se retiró (ADR-014 lo prohíbe explícitamente) y el test que **fijaba su presencia**
  quedó invertido, no borrado: un assert sobre la presencia de algo perpetúa el defecto cuando nadie pregunta
  si debería estar.
- **Primer canary visual de la superficie: 6 estados × 3 anchos** (1440, 390 y **320**, el piso de WCAG
  1.4.10), con assertions de no-fuga sobre el HTML servido, overflow medido **por panel** y no sólo en el
  documento, y Reintentar/`role=alert` verificados por estado. Encontró dos bugs reales antes del commit: el
  chip "Sólo lectura" decidía el ancho de la página a 320px, y el bloque de estado de `partial` quedaba pegado
  arriba en vez de centrado. Scorecard 4,71 promedio, piso 4.
- **Estado honesto: code complete, rollout pendiente.** `client_app_enabled` sigue en `false` y el payload
  viejo responde idéntico — **con test**, no como afirmación. Faltan el `terraform apply` del flip y el retiro
  de `public-share-ui.ts`, que va después del flip verificado con un grant real.
- **Brechas declaradas, no silenciadas:** no hay captions de video/audio porque `CreativeShareBoardV1` no
  transporta pista (WCAG 1.2.2; `eslint-disable` justificado, cerrarlo es cambio de contrato); el `h1` usa un
  fallback para toda pieza y los comentarios van sin autor porque la proyección no tiene esos campos, y
  inventarlos en la superficie donde un cliente juzga trabajo sería fabricar evidencia.

## 2026-07-24 — Globe flota multi-modelo: principio en EPIC-028 + TASK-1553 + canary real Nano Banana Pro

- **EPIC-028 corregido:** se plantó el principio (faltaba) del **catálogo multi-modelo extensible** — Globe corre los
  mejores modelos coexistiendo y creciendo, sin sustituir; **update** (bump de versión, reemplaza) ≠ **add** (modelo/tier
  nuevo, coexiste); compatible con el non-goal "no mejor global" (el catálogo ofrece, la selección es explícita o por
  contrato de fidelidad). Delta + Outcome nuevos.
- **`TASK-1553` (to-do, backend-data):** vehículo del principio — **resolución de modelo por-ruta** en los adapters (hoy
  resuelven por-capacidad → dos modelos del mismo proveedor no coexisten). Selector UI = consumer `TASK-1552`.
- **Defaults frontier actualizados** (updates legítimos, sin borrar Seedream): OpenAI `gpt-image-1→gpt-image-2`
  (`acb0776`), Vertex Nano Banana `gemini-2.5-flash-image→gemini-3-pro-image` (`46ab5ab`).
- **Canary real (TASK-1535):** Nano Banana Pro (`gemini-3-pro-image`) genera **imágenes reales** en el proyecto Globe
  vía endpoint `global`; Nano Banana 2 (`gemini-3.1-flash-image`) 404 (falta allowlist del proyecto, ask a Google).
  Provider flip revertido a `composite`; sin IAM break-glass sucio.
- **Skill `greenhouse-globe` actualizada** (.claude + .codex): sección "Flota de modelos" (roster, seam route→model,
  gotchas del canary) + 2 fixes de drift (composite rutea imagen→Fal, no "default Vertex"; Vertex image default es
  `gemini-3-pro-image`). Bloqueo para implementar: el classifier del entorno bloquea ediciones de código en Globe.

## 2026-07-24 — Globe: promoción comercial por atestación (ADR-010) — golden briefs + docs (TASK-1535)

- **Slice 5 (fleet enablement) — golden briefs para las 6 rutas reference-conditioned pendientes:**
  `ref/still/reference-v1`, `ref/motion/reference-v1`, `ref/video/frames-v1`, `ref/video/motion-v1`,
  `ref/voice/change-v1`, `ref/voice/translate-v1`. Se agregaron 3 rúbricas (`preserve-set-v1`,
  `voice-transform-v1`, `voice-translation-v1`) y 2 contratos de fidelidad aditivos (`voice-transform`,
  `voice-translation`) al enum — todos los consumers validan membresía, ninguno hace switch exhaustivo. Cada
  fixture lleva una referencia sintética `rights: 'test-fixture'` (aceptada sin puerto de assets, el caso del
  harness). El test del **segundo consumidor** corre las 6 end-to-end y asserta que la referencia autorizada
  **sobrevive** al manifiesto puntuado (`input_lineage_intact`). Globe `pnpm check` (domain 337/0) + build verde.
  Commit Globe `f62c2e4`.
- **Slice 6 (docs closure):** doc funcional [`efeonce-globe-promocion-comercial-atestacion.md`](docs/documentation/creative-studio/efeonce-globe-promocion-comercial-atestacion.md)
  + manual [`operar-promocion-comercial-atestacion-globe.md`](docs/manual-de-uso/creative-studio/operar-promocion-comercial-atestacion-globe.md),
  ambos indexados. Triple documentación completa (ADR-010 técnica + funcional + manual).
- **Pendiente (único gate abierto de TASK-1535):** el **canary facturable** (acceptance criterion de evidencia
  runtime) implica **gasto real** de proveedor y/o promoción comercial a un workspace de cliente real — requiere
  autorización explícita del operador; no se ejecuta de forma autónoma. La lane ya se probó en vivo con proveedor
  interno (canary de lane + 2 atestaciones comerciales firmadas por el CEO). Task sigue `in-progress` por este gate.

## 2026-07-24 — Globe formaliza Storyboard Studio y Narrative Preproduction

- ADR-012/SPEC-012 establecen Storyboard Studio como surface propia, no como capability aislada de Producer o
  Video Effectiveness. Narrative Preproduction posee Brief/Script/Storyboard/revisiones/review/handoffs; media
  generation, análisis, asset governance, scheduling y delivery conservan sus dueños.
- La experiencia seleccionada es Editorial Sequence Desk: Brief, Outline, Guion, Storyboard y Review sobre un
  Structured Sequence Canvas responsive. Comentarios y markup vectorial se anclan a revisiones exactas; un mask
  crea una intención de edición que Producer estima/ejecuta, sin mutar assets desde Storyboard.
- Los shots pueden combinar contribuciones capturadas, grabadas, generativas, licenciadas, de archivo y
  determinísticas como `mixed-origin realization`; no se reutiliza el término comercial `Hybrid`. La IA propone
  diffs y humanos aplican, aprueban, ejecutan e incorporan.
- `TASK-1542` cerró el contrato documental y `TASK-1543…1550` registran dominio durable, colaboración, propuestas,
  handoffs, canvas, exports, rollout cliente y el Realization Orchestrator que coordinará ProductionPlans con
  Producer sin mutar Storyboard. El grafo quedó parallel-first: el primer fold avanza con fixtures, Video
  Effectiveness y paquetes de export se habilitan por slice, y exports `policy-blocked` no frenan el primer piloto.
  No hubo cambios de runtime ni habilitación externa.
