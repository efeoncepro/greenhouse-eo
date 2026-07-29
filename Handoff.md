# Handoff activo

## 2026-07-29 — PR #164: release hardening en curso

Se corrigió la instalación de los paquetes privados `@efeoncepro/axis-*` en los workflows que ejecutan
`pnpm install`: cada workflow declara `packages: read` y crea un `.npmrc` efímero en `$RUNNER_TEMP` usando
`GITHUB_TOKEN`; el archivo se vacía al terminar y no entra al artefacto ni al runtime. El proyecto Vercel correcto
es `efeonce-7670142f/greenhouse-eo`; se configuró `NPM_RC` cifrado para Preview de `develop` y Production para
permitir el build de AXIS. La credencial actual es temporal/operator-owned según el runbook y debe reemplazarse por
una identidad de máquina read-only antes del rollout externo.

`CLAUDE.md` quedó en 34.945 tokens y la auditoría de contenido reporta cero huérfanas; el contrato completo del
Design System quedó en `docs/architecture/ui-platform/README.md`. Validaciones locales verdes: instalación privada,
`ops:lint --changed`, `task:lint --changed`, `docs:closure-check` advisory, `qa:gates --changed` advisory y
`git diff --check`. Pendiente: push de los fixes, checks del PR #164, preflight y promoción canónica develop→main.
Los artefactos locales ajenos de SKY Blog y `.vercel/project.json` no se tocaron.

## 2026-07-29 — CEO conditional-go para primer rollout comercial de Globe

El CEO autorizó un `conditional-go` para un primer `Managed Creative Production Sprint powered by Globe`: un cliente,
un workflow, una ruta promovida y operación `efeonce-managed`, sin acceso directo del cliente al runtime. El contrato
operativo vive en [`EFEONCE_GLOBE_MANAGED_CREATIVE_PRODUCTION_SPRINT_V1.md`](docs/services/creative-studio/EFEONCE_GLOBE_MANAGED_CREATIVE_PRODUCTION_SPRINT_V1.md)
y la decisión en `TASK-1480`. Antes del primer run todavía deben comprobarse rights, budget cap/settlement, canary de la
ruta, entrega segura, rollback owner y SOW/factura. No es un go para SaaS, self-serve, client-operated ni expansión.

Verificación local del repo hermano 2026-07-29: `cd ../efeonce-globe && pnpm check` pasa completo (typecheck y tests).
Se corrigió el narrowing TypeScript del preset `Ninguno` en `ProducerComposer`; el resto de cambios preexistentes del
archivo se preservó.

Corrección crítica: el primer cliente es **SKY Agencia Creativa**, no SKY Blog. La base de verdad identifica a SKY como
cliente creativo vigente con módulos `agencia_creativa` + `globe`; el Blog/Wherex es una licitación SEO/contenido no
adjudicada y queda fuera. El brief correcto vive en
`docs/services/creative-studio/SKY_GLOBE_DESIGN_PARTNER_PILOT_BRIEF_V1.md`; falta convertirlo en SOW con sponsor,
workflow creativo vigente, derechos, ruta/modelo y budget cap aprobados.

## 2026-07-29 — EPIC-028: workstreams comerciales activados

Se incorporaron cinco tasks policy al epic, sin abrir un programa paralelo: `TASK-1593` Enterprise ICP/design partners,
`TASK-1594` Agency Workflow Sprint, `TASK-1595` Campaign Variant Workflow, `TASK-1596` Distribution/Activation y
`TASK-1597` Packaging/Unit Economics. La secuencia recomendada es `1595 → 1594`; `1593`, `1596` y `1597` pueden avanzar
en paralelo documental.

Globe es un producto comercial de Efeonce; `internal-only` describe únicamente el estadio técnico actual de rollout.
Enterprise marketing organizations queda como ICP estratégico; enterprise unit/mid-market como beachhead operativo;
agencias/productoras como canal; e-commerce/DTC/retail como wedge; creators/SMB como distribución/aprendizaje. Las
tasks mantienen el rollout fail-closed mientras preparan la salida comercial, consumen `TASK-1476…1480`, `TASK-1521`,
`TASK-1535` y `TASK-1484`, y no autorizan un bypass de pricing, checkout, reseller rights, co-selling ni clientes
externos.

## 2026-07-29 — EPIC-028: alineación con la visión de mercado de Globe

La revisión de [`EPIC_028_MARKET_VISION_ALIGNMENT_REVIEW_2026-07-29.md`](docs/audits/commercial/EPIC_028_MARKET_VISION_ALIGNMENT_REVIEW_2026-07-29.md)
concluye: `product-foundation-aligned | commercial-architecture-incomplete`. EPIC-028 refleja bien la plataforma
agentic gobernada, provider-neutral, con memory/workflows, rights, lineage, review, modes y enterprise controls.
Todavía no convierte en contrato de programa el ICP estratégico enterprise marketing organizations, el beachhead por
unidad enterprise/mid-market, agencias como canal multiplicador, e-commerce/DTC como vertical wedge y creators/SMB como
distribución/aprendizaje.

La recomendación es añadir una capa comercial dentro del mismo epic —sin crear otro epic ni duplicar owners técnicos—
con workstreams para enterprise design partners, Agency Workflow Sprint, Campaign Variant Workflow, distribution/
activation y packaging/economics. Estado honesto: el runtime es una buena fundación; el GTM aún está incompleto.

## 2026-07-29 — Globe: estrategia de mercado, distribución y monetización V1

Se añadió [`EFEONCE_GLOBE_MARKET_DISTRIBUTION_AND_MONETIZATION_STRATEGY_V1.md`](docs/strategy/EFEONCE_GLOBE_MARKET_DISTRIBUTION_AND_MONETIZATION_STRATEGY_V1.md), integrando los benchmarks de Higgsfield y Magnific en una arquitectura comercial completa.
Enterprise marketing organizations queda como ICP estratégico; mid-market o una unidad enterprise funcionan como
beachhead operativo; agencias/productoras son canal multiplicador; e-commerce/DTC es vertical wedge; creators y SMB
son adquisición/aprendizaje.
La secuencia es `contenido/demo → primer resultado → segundo run/workflow → Sample Sprint pagado → workspace/pod → managed/co-operated → enterprise`.

Se documentaron loops de artifact, template, creator, referral, content, integration y agency; separación software,
Product Service, managed/co-operated y channel; revenue architecture; cost-to-serve; margin gate de validación ≥45%;
y pilotos de 90 días. Estado honesto: `approved_for_validation`; no se autoriza pricing público, checkout, reseller
rights, co-selling ni venta general.

## 2026-07-29 — Globe Producer: craft, densidad y despliegue a internal (TASK-1552 Slice 3, ABIERTA)

Sesión completa sobre el composer del Producer, **desplegada** a `globe-studio-internal`
(revisiones `00095`→`00097`, imagen `:494caa0dfe2e`, tráfico 100 %, verificado en Cloud Run).
23 commits en `efeonce-globe`; `main` avanzó de `5d64c5d` a `494caa0` por push directo —el repo
está en plan **free**, así que `main` no tiene branch protection y CI corre DESPUÉS del push.

**Estado vigente y racional:** [Style Reference §Delta 2026-07-29](docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md)
· [ADR-016 §Delta](docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md)
· [TASK-1552 §Delta](docs/tasks/in-progress/TASK-1552-globe-producer-composer-focused-creation.md).

**Lo desplegado:** glow con reposo propio y rampa invertida · pozo único sin el borde UA del textarea ·
ocho miniaturas de globo (`aspect-video`) · anillo de créditos devuelto al header · header 121→67 px ·
riel `sticky` funcionando bajo `lg` · bloque de referencias sin promesas falsas y con miniatura real ·
bloque de modelo+formato 471→302 px · slot de preset propio · gate nuevo de namespace vacío del theme.

**⚠️ Tres bugs sólo aparecieron al desplegar**, con todos los gates verdes:
1. `.npmrc` no llegaba al `pnpm deploy --prod` → primer deploy falló en build (nada llegó a producción).
2. Las miniaturas daban **404**: `assets.ts` es un allowlist explícito y nunca las tuvo — el canary usa
   su propio allowlist, así que ahí se veían.
3. El feed montaba el MP4 en un `<img>` → `alt` desparramado sobre las cards de video.

**Pendiente con dueño:**
- **TASK-1552 Slice 3 sigue abierta.** Nada de esta sesión la cierra; su doc lo pide explícitamente.
- **Dos puntos ciegos de verificación sin guardián**: no hay test del registro de `assets.ts`, ni aserto
  que compare el ancho de un control contra sus hermanos. Siete hallazgos en
  [la auditoría](docs/audits/globe/GLOBE_PRODUCER_VERIFICATION_BLIND_SPOTS_2026-07-29.md).
- **Feed, viewer y share nunca se auditaron** por regresiones del port (`TASK-1558`/`TASK-1559`); el bug
  del `<img>` salió justamente de ahí, por observación directa y no por barrido.
- Multiplicador de costo en Calidad/Cantidad (`TASK-1532`) · dirección de la animación del popover
  (`TASK-1523`) · «Durable» en Estilo · preset.

## 2026-07-29 — Magnific: Go-to-Market, workflows y expansión de plataforma

Se añadió [`MAGNIFIC_GO_TO_MARKET_AND_PLATFORM_EXPANSION_RESEARCH_2026-07-29.md`](docs/audits/commercial/MAGNIFIC_GO_TO_MARKET_AND_PLATFORM_EXPANSION_RESEARCH_2026-07-29.md).
La investigación documenta la secuencia `upscaling wedge → suite multiproveedor → workflow → plugins/API/MCP → Business → Enterprise`,
separa ecosystem distribution de partnership contractual y registra conflictos/unknowns de pricing, créditos, rights y retención.
Para Globe, la lección transferible es `builder experto → workflow parametrizado → runner → pod/workspace`, con intención,
provenance, QA, aprobación y accountability Efeonce. Se descartan créditos, unlimited, logos y claims de escala como unidad de valor.

Estado honesto: `approved_for_validation`; no se autoriza pricing, checkout, reseller rights, co-selling ni rollout externo.

## 2026-07-29 — Higgsfield: Go-to-Market, partnerships y vertical expansion

Se añadió [`HIGGSFIELD_PARTNERSHIP_AND_VERTICAL_EXPANSION_RESEARCH_2026-07-29.md`](docs/audits/commercial/HIGGSFIELD_PARTNERSHIP_AND_VERTICAL_EXPANSION_RESEARCH_2026-07-29.md).
La investigación concluye que Higgsfield usa Advertising como beachhead de alta frecuencia y feedback rápido, y combina
PLG/self-serve, content-led education, agency-led adoption, Team/Enterprise y partnerships de distribución/enablement.
La evidencia no permite
llamar partner comercial a cada logo ni afirmar reseller, co-selling, affiliate revenue share o campañas producidas por
Higgsfield. Globe debe conservar dirección, producción, QA, derechos y accountability; el siguiente experimento recomendado
es un piloto pagado de seis semanas con dos design partners, usando Higgsfield como capability provider-neutral.

El patrón transferible quedó incorporado en las skills espejo de `gtm-architect`, `efeonce-business-model-operator` y
`research-benchmark-operator`: cuña → activación → workflow → multiplicador de agencia/pod → enterprise → expansión,
con clasificación estricta de partners, owner, economics, rights y evidencia. No se adoptan créditos públicos,
“unlimited”, claims de views, verticales amplias ni logos como estrategia.

Estado honesto: `approved_for_validation`; claims de escala, performance, revenue share y conversión enterprise siguen
sin evidencia independiente.

## 2026-07-29 — Creator Influence & Content: documentación canónica

Se documentó el modelo agnóstico a marca de Influencers, Creators & UGC dentro de Media & Distribution. Nuevos
artefactos: business model específico, ficha de servicio, arquitectura operativa no-runtime, documentación funcional
y manual de operación. La skill `social-media-studio` incorpora la taxonomía de cinco ofertas, el flujo y el scorecard
de vetting. Estado honesto: `Approved for validation`; quedan pendientes validación de cost-to-serve, pricing,
capacity, derechos y evidencia de cohortes antes de venta general.

Validación ejecutada pendiente de cierre documental: `pnpm docs:closure-check`, `pnpm docs:context-check:strict` y
revisión de enlaces/rutas.

## 2026-07-29 — Creator Influence & Content: pricing en validación

Se añadió [`CREATOR_INFLUENCE_CONTENT_PRICING_INTEGRITY_PACK_V1.md`](docs/business-models/media-distribution/CREATOR_INFLUENCE_CONTENT_PRICING_INTEGRITY_PACK_V1.md).
La hipótesis recomendada es fee fijo de estrategia/operación + pass-through transparente; coordinación de terceros sólo
cuando Efeonce administra pagos/riesgo, y performance fee únicamente con tracking y atribución aceptados. Las bandas
en USD son internas y no autorizan pricing público. Pendientes: cost-to-serve real, piso de margen, cash exposure,
derechos y validación comercial.

## 2026-07-29 — Creator Influence & Content: benchmark de mercado

Se añadió [`CREATOR_INFLUENCE_CONTENT_MARKET_RESEARCH_2026-07-29.md`](docs/audits/commercial/CREATOR_INFLUENCE_CONTENT_MARKET_RESEARCH_2026-07-29.md),
con revisión de Aspire, NeoReach, Upfluence, CreatorIQ, Influentials y referencias públicas de pricing. La decisión
es adoptar un servicio end-to-end modular con rights at signing, paid amplification, affiliate condicionado,
transparencia y memoria portable; descartar per-post, performance-only, porcentaje de media spend y comisiones opacas.
La propuesta queda aún en `Approved for validation`.

## 2026-07-29 — Creator Influence & Content: bandas de pricing sincronizadas

El Pricing Integrity Pack pasó a V1.1 y las skills Codex/Claude quedaron sincronizadas con bandas monetarias y
porcentajes de validación: 10–15% coordinación de terceros, 15% management medio, 5–15% affiliate del creator,
2–5% success fee Efeonce, 15–35% paid usage por 30 días y 15–30% exclusividad. Se mantiene la regla de no doble
cobro y ningún monto está aprobado como tarifario público.

## 2026-07-29 — Creator Influence & Content: caso de simulación end-to-end

Se documentó [`CREATOR_INFLUENCE_PERFUME_ATHLETES_CHILE_SIMULATION_2026-07-29.md`](docs/audits/commercial/CREATOR_INFLUENCE_PERFUME_ATHLETES_CHILE_SIMULATION_2026-07-29.md),
un caso sintético de perfume masculino con Alexis Sánchez, Joaquín Niemann y Nicolás Jarry como shortlist provisional.
El artefacto cubre brief, scorecard, vetting, contacto, negociación, derechos, producción, medición, presupuesto y
go/no-go. Los nombres, disponibilidad y rangos de talento quedan explícitamente como hipótesis hasta validación con
representantes; la skill Codex/Claude de Creator/UGC enlaza el caso como patrón reusable.

## 2026-07-29 — TASK-1591: AXIS adapters pilot

El piloto de adapters AXIS quedó implementado y verificado como canary opt-in en Greenhouse y Globe.
AXIS `v0.1.4` está publicado; ambos consumers fijan `axis-tokens`, `axis-ui-contracts` y
`axis-ui-registry` en esa versión. Greenhouse expone `AxisStatus` y `AxisProgress` con MUI/Vuexy;
Globe expone equivalentes nativos con Tailwind/token classes. Fixtures: `/design-system/axis-adapters`
y `/_axis-pilot`.

Evidencia: build Vite de Globe, typecheck/ESLint de los archivos Greenhouse, design-contract gate
6/6, Playwright a 1440/390 px sin overflow, foco por Tab, 3 pasos ordenados y reduced motion `0s`.
La promoción a superficies productivas sigue pendiente; rollback documentado en `TASK-1591` y el
runbook de consumo privado. El PAT operator-owned expira el 2026-08-27.

## 2026-07-28 — Contrato para producción visual social de reportes

Se documentó el aprendizaje de la exploración del post de Brand Visibility/SKY en
[`GREENHOUSE_SOCIAL_VISUAL_REPORT_PRODUCTION_V1.md`](docs/operations/GREENHOUSE_SOCIAL_VISUAL_REPORT_PRODUCTION_V1.md),
con capas técnica, funcional y manual. Las skills Codex/Claude de diseño, social media y generación de imágenes
ahora exigen evidencia editorial proof-first, crop vertical nativo, logo único y composición determinística.
La pieza visual continúa pendiente: las iteraciones exploratorias no aprobaron el gate de calidad y no deben
considerarse entregables finales.

## 2026-07-28 — HISTÓRICO SUPERSEDIDO — TASK-1588: plataforma UI compartida iniciada

Se formalizó `EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1`: Greenhouse conserva gobierno,
registry, lifecycle, QA y evidencia; `../axis-design-system` es el nuevo home local de la
foundation portable y el Lab independiente; Greenhouse y Globe quedan como consumers con adapters
MUI/Tailwind, sin herencia automática de Vuexy/MUI.

Se crearon `TASK-1588` y child tasks `TASK-1589…1592`. El repositorio privado
`efeoncepro/axis-design-system` ya existe, el Lab está desplegado en
`https://axis-design-system-lab.vercel.app` y los packages privados
`@efeoncepro/axis-tokens`, `@efeoncepro/axis-ui-contracts` y `@efeoncepro/axis-ui-registry` están
publicados en GitHub Packages como `0.1.2`. La foundation compila y pasa build/test:
tokens semanticamente nombrados, contracts con lifecycle/evidence, registry inicial `efeonce.status` y
Lab navegable con búsqueda, preview, contract metadata y evidence checklist. Todavía no hay consumer
runtime conectado; estado honesto: foundation y distribución completas, integración de Greenhouse/Globe
pendiente por `TASK-1591` y configuración segura de auth del registry en cada runtime.

La distribución privada ya tiene sus precondiciones operativas verificadas: Greenhouse y Globe tienen acceso
`Read` a los tres packages en GitHub Packages; el Lab tiene `NPM_RC` en Vercel Production y Preview; y Globe
tiene el secreto `axis-packages-read-token` en Secret Manager con `roles/secretmanager.secretAccessor` para el
service account de Cloud Build. El procedimiento y la evidencia no sensible viven en
[`AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`](docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).
Estado histórico de ese corte: **foundation/distribution completas; consumer runtime pendiente**. El PAT actual es operator-owned
y vence el 2026-08-27; antes del rollout externo se debe reemplazar por una identidad de máquina dedicada.

## 2026-07-28 — Globe: payload React en pipeline Tailwind v4

En `../efeonce-globe` se completó la migración del payload React de Producer: composer, shell, diálogos, feed,
viewer, share board, primitives y capas base/motion ya no importan hojas CSS de superficie. Los estilos de
componentes viven en `studio-client/src/styles/tailwind.css` y el theme sigue generado desde `tokens.ts`.
Build, lint, tests del cliente (118/118), gates de diseño, reduced-motion y Tailwind engine canary están verdes.

La frontera vanilla permanece deliberadamente en `producer-ui.ts`/`producerStyles` para el fallback cuando la
ruta React no está habilitada; su retiro pertenece a `TASK-1560` y no debe declararse como parte de esta
migración. La evidencia browser de share requiere repetir el harness específico: la verificación manual del
DOM pasó, pero el driver automatizado expiró esperando el selector.

## 2026-07-28 — TASK-1552: flujo integrado verificado en `efeonce-globe`

La continuación se ejecutó en el repo hermano correcto, `/Users/jreye/Documents/efeonce-globe`; Greenhouse
queda como control plane documental. El composer ya verifica en browser el camino prompt → estimate vigente →
stale inmediato → cambio de modalidad → `prepare/execute`, con doble activación sin duplicación y la misma clave
de idempotencia para ambos commands.

Cambios runtime relevantes: proporción visible en Video, dock bloqueado alcanzable por teclado con razón
audible (`aria-disabled`/`aria-describedby`) y `data-opening` explícito para el contrato popover/panel; el canary
de fixture registra commands reales para comprobar estas garantías.

Evidencia: `pnpm --filter @efeonce-globe/studio-client test` verde (118 tests), build/lint/gates verdes y
composer browser canary verde a 1440/390/320 px, incluida pasada `prefers-reduced-motion`. Estado no cerrado:
faltan estados browser de error/cancelación, revisión premium humana y verificación operativa live/internal-only.
No promover ni marcar `TASK-1552` como completa todavía.

## 2026-07-28 — Contrato transversal operator-first y RESEARCH-010

Se documentó [`Efeonce Operator-First Product & Growth Contract V1`](docs/strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md).
El contrato fija que Wave, Reach, Globe y futuras Product Services son las superficies operatorias; Greenhouse
soporta la superficie ejecutiva, memoria, assurance y coordinación. El motion esperado es
`operador → operator-champion → sponsor/director → compra recurrente → evangelista`.

Se creó [`RESEARCH-010`](docs/research/RESEARCH-010-client-operating-system-primary-validation.md) para validar
el contrato con operadores-champions reales. Estado: brief listo; faltan 5 entrevistas piloto y luego una muestra
de 12–15 participantes. No abrir tareas de producto hasta obtener evidencia primaria.

Se sincronizaron context pack, `project_context.md` y skills Codex/Claude de agency, business model, customer model
y research. Los cambios no alteran runtime, schema, API, entitlements ni rollout. Siguiente paso: reclutar los
primeros candidatos y registrar episodios de dolor, influencia y evidencia de champion.

Se añadió al contrato y a las skills la regla de que los dolores de agencia siguen vigentes: identificar al operador
no los resuelve, sino que convierte cada dolor en una capacidad que debe reducir fricción y producir evidencia para
el sponsor. También se registraron los nuevos riesgos de adopción sin presupuesto, champion sin influencia y valor
operativo sin evidencia ejecutiva.

Con la skill `efeonce-customer-experience` se creó [`Efeonce Operator Pain & Journey Failure Map V1`](docs/strategy/EFEONCE_OPERATOR_PAIN_AND_JOURNEY_FAILURE_MAP_V1.md). El artefacto cubre lifecycle, failure moments, causas backstage,
service blueprint mínimo, recovery, métricas y señales para Greenhouse. La evidencia externa reciente de ANA/4As,
WFA, Gartner e IAB refuerza confianza, transparencia, procurement/coordinación y governance de IA como dolores
estructurales; RESEARCH-010 debe validar frecuencia y severidad en Chile/LatAm.

Se propagó la conexión con el Why de Efeonce: el contrato operator-first y el mapa de dolores ahora explicitan que
las capacidades deben dejar al cliente más capaz, preservar memoria y mejorar cada ciclo. Se añadió la regla de
evaluación `capacidad + memoria, no dependencia + opacidad` en marca, experiencia, negocio, customer model y skills.

Se creó [`Efeonce Content-to-Capability Loop V1`](docs/strategy/EFEONCE_CONTENT_TO_CAPABILITY_LOOP_V1.md) para
conectar Glitch, blog, YouTube, microcapacitaciones, Product Services y Greenhouse. Incluye el `Learn Moment
Contract`: trigger, JTBD, pain, intervención, acción, límite humano, evidencia, memoria y siguiente paso.

## 2026-07-27 — TASK-1552: los cinco bloques existen, y convertir a Tailwind resultó ser **tokenizar**

`efeonce-globe` `5b7cb3f` (1e) + `512dcbc` (1f) + `a37d105` (1g). **Slice 1 sigue abierto**: van tres
regiones convertidas de las ~doce.

**Los cinco bloques por pregunta creativa.** El contenido ya estaba; faltaba nombrarlo. Cada bloque
declara su pregunta con su icono. **Modo subió al bloque 1** —cambia qué capability se despacha, o sea
qué operación se pide— y con eso «¿Cómo se ve?» deja de contener una decisión que no es de apariencia.

**El canary afirmaba algo falso.** `producer-advanced-settings` nombraba el `<details>` que el Slice 1d
retiró, y el marcador sobrevivió sobre un `div`: el canary imprimía cada corrida un `KNOWN` sobre un
disclosure ausente. Se invirtió — ahora mide que **no exista** cajón de sastre, que los cuatro bloques
tengan encabezado con icono y que la jerarquía de encabezados no salte niveles.

### 🔴 La medición que cambió el método — y su corrección

Primer cuadro sobre las **299 reglas** del legacy que visten la superficie: 36 tamaños de fuente,
83 espaciados, 78 colores; conclusión, *el diff visual a cero de ADR-016 no es alcanzable*.

**Parcialmente equivocado.** Al aplicarlo se re-midió contra la escala **real** de Tailwind —medios
pasos, 2 px, no 4:

| | contra 4 px | real |
|---|---:|---:|
| espaciado fuera de escala | 63 de 83 | **0 de 82** (error medio 0,40 px) |

Y los 78 colores son **29 bases**: el 76% son alfas del mismo azul, que `bg-action/13` expresa sin
token. **Espaciado y color se traducen sin tokenizar.** Lo que faltaba era tipografía.

**Decisión del operador: tokenizar, no normalizar.** Ejecutado con un token por decisión y no por
valor —los 34 tamaños son seis escalones funcionales—: `--text-micro` (9 px), `--text-meta` (11 px, el
escalón entre `2xs` y `xs`, el más poblado), `--text-lg` (18,8 px, el `h1` de un **panel**),
`--accent-ink-bright` (la hoja tenía tres valores indistinguibles para ese rol) y `--field`/`--white`
como bases para modificador de opacidad.

### 🔴 El peso 700 no tenía utilidad, con el build en verde

`--font-display` (Poppins) y `--weight-display` (700) aspiran ambos a `font-display`. **La familia
gana** —medido en el CSS compilado— así que el peso era inalcanzable y el texto salía en 400 sin que
ninguna regla estuviera mal. Ahora se publica como `--font-weight-bold` y un guardrail **lanza** ante
otra colisión familia/peso. Escalado a `TASK-1485`.

### 🔴 Cuarta regla que colgaba del ancestro

`.modality-pill` no declara `text-transform`: las mayúsculas venían de `.section-heading>span`. Al
convertir la cabecera el pill pasó de «IMAGEN» a «Imagen», **con el canary verde**. Se vio mirando.
Cuarta vez en esta task. **Regla: al convertir una región, listar primero qué le llegaba POR ANCESTRO.**

También dos sondas dejaron de ser ciertas al crecer el SSOT: el canary del motor usaba `text-lg` como
ejemplo de «escala ajena que no existe», y `text-lg` pasó a existir. Apunta ahora a `text-4xl`.

### Slice 1h — `capability-button` pasa a componente (`9118117`)

Los ocho callsites a `composer/CapabilityButton.tsx`. **Componente y no `@utility`** porque lo que se
repetía no era un aspecto sino un **contrato**: una utilidad reproduce padding y `:disabled`, pero no
puede garantizar que el punto de estado exista ni que la razón viaje en el `title` — las dos son
criterios de aceptación. Y `@utility` habría reintroducido el acoplamiento estructural que ADR-016 vino
a matar (*«un botón que tiene un dot adentro»*).

`state` es un tipo discriminado —`ready` o `blocked` **con su razón**— así que «deshabilitado y sin
explicar por qué» es irrepresentable. `stateFromGate` concentra además el colapso de los cuatro estados
del gate a dos, que antes ocurría en ocho lugares sin que nadie lo decidiera.

**🔴 El orden dentro del `className` no decide nada.** Con `rounded-sm` en la base y `rounded-full` en
la variante, el botón circular rindió **9,28 px** — con build y typecheck verdes. Gana la utilidad que
la hoja emite después, que es un orden del framework. **Regla: una propiedad se declara en UNA sola
capa**; si una variante necesita otro valor, la propiedad entera baja a la variante.

Tres correcciones gratis al unificar: «Usar propuesta» gana su icono (era la única acción sin glifo),
mención y sus candidatos ganan punto de estado, y `aria-disabled` acompaña a `disabled` en los ocho.
No se portan el tooltip por `data-gate-reason` ni la animación por `data-capability-state`: **ningún
callsite emite esos atributos** (medido 0 y 0) — promesas muertas.

### Slices 1i/1j — el bloque 1 queda entero en Tailwind (`7ebcdda`, `5310d23`)

Campo de prompt con su glow, acciones, sugerencias y prompt negativo. Los tres compuestos del glow se
tokenizaron **enteros** (`--glow-rest|hover|focus`): el efecto es el anillo más el halo juntos, y
separarlos permitiría combinar el anillo de foco con el halo de hover, que no es un estado que exista.
`--duration-field` (220 ms) es token nuevo. `motion-reduce:transition-none` es **nuevo**: el original no
declaraba el corte, y el estado encendido **se conserva** — es información de foco.

**🔴 Dos trampas de medición, las dos hacían parecer roto código que estaba bien.** Quedan escritas
dentro del canary: (1) **no truncar el `boxShadow`** — Tailwind lo compone en cinco capas y las cuatro
primeras están vacías e idénticas en todo estado, así que comparar los primeros N caracteres da «no
cambia» siempre; (2) **no medir en `t=0`** — la transición dura 220 ms y `getComputedStyle` justo
después de `focus()` devuelve el valor de partida. **Tercera vez en esta task que la medición estaba
rota y el runtime no.**

El canary gana por fin el **aserto del glow** que el `STYLE_REFERENCE` §9 pedía desde el principio, con
su variante bajo reduced-motion (transición `0s`, estado conservado).

El gate empujó al idiom correcto dos veces: `grid-cols-[minmax(0,1fr)]` → **`grid-cols-1`, que en
Tailwind ES exactamente eso**, y `transition-[…]` → `transition-all`.

### Slices 1k/1l — 🔴 el gate de motion no miraba el `className` (`6ec39c9`, `ad0e4e8`)

**El hallazgo mayor de la sesión.** El gate de reduced-motion lee `.css`. Con Tailwind una animación se
escribe `animate-*` en un `className`, y **el gate no la veía en absoluto** — ni siquiera la reportaba,
no existía para él. Es el agujero que **ADR-016 condición 2** describe para los otros tres gates
(*«dejar de morder al cambiar de motor»*); aquéllos se reescribieron al instalar el motor y **éste quedó
fuera de esa pasada**. Se descubrió al convertir la primera superficie con animación, y se cerró
**antes** de crearla: toda `animate-*` exige `motion-safe:`. Verificado mordiendo.

**El generador ahora resuelve referencias entre tokens.** `--overlay-rise` se escribe con
`var(--duration-overlay)` para seguir a la escala de motion, pero el `@theme` **no puede contener
referencias** —es la regla que viene de la circular que dejó `text-xs` en 16 px— y el gate mordió. El
SSOT conserva la referencia; lo emitido son valores.

Otros hallazgos: `--overlay-fill` estaba declarado **dos veces** con dos ángulos sobre los mismos
elementos (tocar una y no la otra dejaba overlays hermanos distintos); el seed reservaba **tres
columnas** de grilla para un control con dos hijos, siendo las otras dos del seed fijo que no tiene
contrato; y «Descartar» es el **tercer** control de la superficie sin ninguna regla, renderizándose con
el gris del sistema dentro de un panel de la paleta.

Una decisión que conviene no re-litigar: el punto de color de un preset reusa `--dot-glow`, pero es
**cuadrado** (`--radius-xs`, nacido acá) mientras el de capability es un círculo. **Un círculo de color
ya significa «disponibilidad» en esta superficie, y dos cosas distintas no pueden compartir forma.**

### Slice 1m — referencias, y tres defectos que se escondían entre sí (`3ab6015`)

**El fixture no podía producir una ficha**, así que esa región —78 menciones de `reference` en el TSX—
**nunca se había renderizado en el canary**: verde sobre una superficie inexistente. Al poblarlo
aparecieron tres defectos:

1. **«Mencionar del feed» estaba bloqueado por omisión**, no por el gate: el mapa de gates consulta
   tres capabilities y `copyAsReference` no era una. Le decía al operador que **la plataforma** no lo
   soporta cuando la pantalla nunca preguntó. **Una negación falsa manda a pedir algo que ya existe.**
2. El botón de quitar y la etiqueta de derechos son `absolute` **sin ancestro posicionado**: se
   anclaban al composer, así que el botón de cada ficha aterrizaba en la esquina del panel.
3. El port usó `.reference-source` (badge para un glifo) donde el diseño tenía `.reference-detail p`
   (prosa truncada).

**Los defectos 2 y 3 se cancelaban.** El badge sin ancestro flotaba lejos en vez de verse mal en su
sitio; al arreglar el 2, el texto aterrizó sobre la miniatura y la tapó entera. **Arreglar uno hizo
visible el otro** — es lo que la conversión encuentra y ninguna lectura del CSS encuentra.

⚠️ El mapa de gates es una lista explícita: **toda capability que la superficie despache hay que
agregarla ahí**, y el síntoma de olvidarla es un control bloqueado con una razón que suena plausible.

### Slices 1n/1o — **SLICE 1 CERRADO** (`e2af8a3`, `96548b3`)

**Cero clases de la hoja legacy en el composer**: se cumple la regla dura de ADR-016 (una superficie
está en un motor, no a medias). El shell sigue inyectando `producerStyles` porque viste **otras**
superficies del payload — se retira con `TASK-1560`.

**🔴 Una utilidad de Tailwind puede colisionar POR NOMBRE con una clase del legacy, y las capas no lo
resuelven.** `text-action` es utilidad válida (color) **y** clase del legacy
(`min-height:2.75rem;padding;border;cursor`). Las utilidades ganan el color; **las propiedades que la
utilidad no declara pasan intactas**. Medido: el marco del icono de un encabezado rindió **30,8 × 44 px**
en vez de 28 × 28 — y **estuvo así en varias capturas que revisé sin notarlo**. Cerrado con un guardrail
que cruza las clases usadas contra los selectores de la capa `legacy`, leyendo `document.styleSheets`.

⚠️ **El guardrail tenía dos bugs, los dos visibles sólo al probar que mordiera**: (1) `CSSStyleRule`
moderna **puede** tener `cssRules` —anidamiento nativo de v4— así que `if (rule.cssRules) { …; continue }`
se saltaba todos los selectores y devolvía cero siempre; (2) la segunda versión leía todas las hojas y
reportaba la superficie como colisión consigo misma. **Un guardrail que nunca falla se ve idéntico a uno
que pasa.**

**La atenuación del estimado ya existe** — el motion que el contrato llama el más importante y que nunca
se había pintado (el TSX decidía `stale` y `stale` aparecía cero veces en la hoja). No se apaga bajo
reduced-motion: se apaga la interpolación, no el estado.

**Tercer aserto que apuntaba a una clase** (`.estimate-summary`, tras `.model-disclosure`). Regla ya
escrita en el canary: **los asertos apuntan a `data-*`, nunca a clases.**

El selector se convirtió con su forma **congelada** y sus 11 asertos lo prueban. `--model-menu-fill`
**no** se consolida con `--overlay-fill`: unificarlos le corresponde a la dueña de esa región.

### Slice 2 — el tool dock, con su frontera declarada en vez de simulada (`a631f7c`)

El negativo y el seed **vivían en el flujo** y cada uno costaba una fila de la columna. Ahora cuestan un
icono, que es la única propiedad que justifica el dock.

**🔴 El criterio «derivado del catálogo, nunca de una lista» NO es alcanzable hoy, y el límite es del
contrato.** `/v1/capabilities` publica `{capability, coverage}`: dice qué está **disponible** y **nada**
sobre cómo se presenta — sin icono, sin etiqueta, sin afordancia. Lo que sí se cumple es la mitad que
importa: **el servidor decide la disponibilidad y la UI no la adivina nunca**; una capability que el
servidor empieza a publicar se habilita sin tocar layout. **Gap escalado al API Contract Spine
(`TASK-1481`)**, y la frontera queda escrita en el componente en vez de simulada con una lista que finge
derivarse.

**El retoque regional no existía ni como ausencia** — ni habilitado ni bloqueado, o sea la capacidad se
leía como *inexistente* en vez de *pendiente*. Su copy ya estaba en la capa sin usarse: tercera de esta
task.

⚠️ **Al mover una región, su `data-capture` se mueve con ella.** `producer-seed` desapareció del DOM con
su sección: es la deriva de `producer-advanced-settings` en su forma inversa — allá el marcador
sobrevivió a su referente, acá el referente casi sobrevive sin su marcador.

**Siguiente:** lo que reste de Slice 3 (estados de ejecución y evidencia premium). La atenuación del
estimado, los 3 marcadores y el canary ya están.

## 2026-07-27 — TASK-1552 Slices 1a y 1c: **el CTA volvió al fold**

`efeonce-globe` `4cd4aee` + `cf5555e`. **El Slice 1b —la recomposición en cinco bloques— NO está hecho.**

🔴 **El problema no era jerarquía.** La hoja del legacy declara el anclaje del panel
(`max-height:calc(100svh - 6.4rem)`) y **lo apaga más abajo sin media query**, en una pasada cosmética. Con
eso el panel no se acota en ningún ancho y el riel se va al fondo del documento. El diseño ya tenía la
solución; una línea la desactivaba. Restaurado desde la superficie con utilidades (las utilidades ganan por
capa) y con `--composer-max-block` en el SSOT.

| Medido | Antes | Después |
|---|---:|---:|
| Panel @1440×1000 | 1376 px | 898 px, con scroll interno |
| CTA @1440 / @390 / @320 | `y=1389` / `y=1460` / fuera | **`y=910` / `y=762` / `y=762` — los tres dentro** |

**Slice 1a — `@layer legacy`.** Precondición: la hoja se inyecta sin capa y le ganaba a toda utilidad
tipográfica (`text-sm font-semibold` sobre un `<button>` rendía 16px/400). ⚠️ **Ponerla como capa más baja
fue un error medido**: el reset de `base.css` pasó a ganarle a las reglas de clase del legacy y el panel
creció 98 px **con el canary verde**. Orden correcto: `theme, base, legacy, components, utilities`.
Verificado con A/B en la misma página: diferencias, ninguna.

**Decisión del operador:** ritmo vertical **opción A** — ajustar a la escala de Tailwind (`gap-8`/`mb-3.5`),
no tokenizar los 30/13,6 px medidos.

**Siguiente:** Slice 1b (los cinco bloques; ~550 líneas de JSX y 84 clases heredadas) y 1d (retirar
`advanced-controls`, que hoy es markup decorativo sin control para cerrarse).

## 2026-07-27 — `TASK-1555` cerrada: **el Slice 1 de `TASK-1552` queda desbloqueado**

Era el último bloqueo. Al ir a cerrarla se encontró que **su ficha mentía en tres campos** —y los tres se
detectaron midiendo el runtime, no leyendo el documento:

| Campo | Decía | Runtime |
|---|---|---|
| `Status real` | `Diseño` | el código existe desde hace días, en la forma **aceptada** |
| `Blocked by` | `TASK-1554` | esa task está `complete` |
| Criterios de aceptación | *«galería data-driven»*, *«cada tarjeta»*, *«radiogroup semántico»* | es un `listbox` compacto — **describían la forma que el operador rechazó** |
| Verificación | `pnpm fe:capture`, checks de `studio-web` | `fe:capture` es de Greenhouse; el código vive en `studio-client` |

Unos criterios que piden lo rechazado obligarían a **deshacer una decisión ya tomada** para poder marcarlos.
Se reescribieron contra el runtime, junto con el wireframe (que todavía dibujaba la grilla y decía que el
momento visual dominante era *«la galería de modelos, no un dropdown técnico»* — exactamente lo rechazado).

### El hueco de evidencia: el canary tenía UNA ruta

Sin lista que abrir, sin `gated`, sin `blocked` con razón y sin un modelo sin isotipo, el selector **no podía
probar ningún estado** — verde vacuo, el mismo argumento que `TASK-1552` hace sobre su propio gate de tokens.

Flota de 4 rutas, una por estado, y **11 asertos nuevos** verdes a 1440/390/320 y bajo reduced-motion:
apertura **por teclado**, `Tab` entra a la lista, anillo de foco, `aria-disabled` **nunca** `disabled`, razón
**en texto**, recomendado una sola vez, 44 px, sin fuga de modalidad ajena, menú abierto sin overflow.

### ⚠️ Casi se reporta un defecto de accesibilidad que no existía

La activación por teclado se midió primero con el panel de browser y dio «no abre con Enter ni con Space».
Ese panel entrega texto (verificado: 17 caracteres a un textarea) pero **no la acción nativa de un
`<summary>`**. Playwright confirma que Enter abre y Space alterna. **Un negativo de accesibilidad se confirma
con el harness real antes de escribirlo en ninguna parte.**

Cerrada con `pnpm task:lint` en cero y scorecard `PASS` (4.54) — verificado que está puntuado contra el
desplegable y no contra la galería: su propio texto mide *«la región pasó de 515px (galería) a 121px»*.

**Siguiente:** Slice 1 de `TASK-1552` — recomposición del composer en Tailwind. La región `producer-model-*`
es **baseline congelado**: se decide dónde vive, nunca su forma interna.

## 2026-07-27 — ADR-016 implementado: el motor está en Tailwind; **ninguna superficie migrada**

Ejecutados los **pasos 1-4** del orden de ADR-016 en `efeonce-globe` (`804b7d7`, `91432ed`). El paso 5 —migrar
por superficie— **no empezó**: el composer sigue bloqueado por `TASK-1555`.

**Estado honesto:** el composer renderiza exactamente igual que antes, con `producerStyles` inyectada por
`app.ts:2252`. **Cero utilidades de Tailwind en `ProducerComposer.tsx`.** Las únicas seis en el CSS compilado
son la sonda del seam que verifica el motor.

**Rama limpiada** como pedía el mensaje del WIP: `producer-composer.css` volvió a 2.202 B, `app.ts` recuperó
`extraStyles`, las exclusiones de los dos gates se retiraron. Se conservaron los tres `data-capture`,
`data-estimate-state`, el estimado `stale` y los canaries. **El tool dock se revirtió** (era Slice 2 adelantado
y su CSS vivía en la copia).

### 🔴 Lo que la implementación corrigió del propio ADR

El idiom de alias de la documentación de Tailwind —`@theme inline { --text-xs: var(--text-xs) }`— es una
**referencia circular** cuando el nombre coincide a ambos lados, y en Globe casi todos coinciden porque el SSOT
ya estaba escrito con los namespaces de Tailwind. Medido en browser: **`text-xs` a 16px, `rounded-sm` a 0px,
`font-display` en Times — con el build verde y las utilidades presentes en el CSS.** Ningún escaneo estático
puede verlo.

El theme pasa a **generarse** desde el SSOT con valores (`pnpm theme:generate`), y un gate afirma que el
archivo es exactamente lo que produce el generador.

### Los gates: cuatro, y verificados mordiendo

Regla común: **el único valor arbitrario permitido es una REFERENCIA a token.** Se agregó un cuarto para
espaciado y medidas. La otra mitad no es un escaneo: el theme **vacía los namespaces**, así que `text-red-500`
y `text-lg` no existen. `tailwind-engine-canary.mjs` lo prueba por **valor computado** en browser.

⚠️ **Para quien tome Slice 1:** el ritmo medido (30 px / 13,6 px) **no cae en la escala de 4 px** y el gate
rechaza `gap-[1.875rem]`. Hay que decidir: ajustar a `gap-8` o subir el ritmo al SSOT. Esa es la función del
gate — que la decisión no se postergue en silencio.

### Tres hallazgos que sólo aparecen mirando, no leyendo la salida

1. **El canary del composer servía la superficie SIN la hoja del legacy y daba todo verde.** Contención,
   `scrollWidth`, iconos y visibilidad del CTA dan igual con o sin CSS. Corregido. Las capturas previas no eran
   baseline de nada.
2. **`advanced-controls` no es un disclosure abierto: es inoperable.** `.advanced-controls > summary` tiene
   `display:none` (medido: altura 0). El `<details open>` no tiene control para cerrarse ni con teclado. El
   markup es decorativo — refuerza su retiro y quita el riesgo de regresión al reemplazarlo.
3. **El gate de literales los estaba emitiendo al CSS servido.** Tailwind lee los `.ts` como texto plano y no
   ignora comentarios: los ejemplos con los que el gate documenta lo que prohíbe se compilaban como clases
   reales. Cerrado con `@source not`. Regla: **documentar un anti-patrón dentro del árbol escaneado lo
   materializa.**

**Verificación:** `pnpm check` en la raíz de `efeonce-globe`, exit 0 — nul-byte gate, typecheck, 279 tests de
`studio-web`, suite de `studio-client` y los dos canaries de browser.

**Baseline de diff:** `apps/studio-client/.captures/task-1552-composer/` a 1440/390/320, **con la hoja
puesta**. Se regeneran con `pnpm test`.

⚠️ `TASK-1555` sigue siendo el único bloqueo de Slice 1, y sigue declarando `Status real: Diseño` con el código
ya escrito. Alinear antes de tomarla.

## 2026-07-27 — ADR-016 aceptado: el payload cliente de Globe adopta Tailwind v4

**Decisión de arquitectura, sin runtime tocado todavía.** Seis colisiones de CSS global medidas en una sesión
—cuatro donde la hoja legacy pisó markup nuevo (incluida `.estimate-rail>div` con cuatro reglas y dos
`!important` forzando grid), una donde renombrar clases desconectó el glow del prompt, y el hallazgo de que
**66 de 84 clases del composer vivían en `producerStyles`**— motivaron
[ADR-016](docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md), **aceptado**.

Dueño de implementación: **`TASK-1485`**. El **Slice 0 de `TASK-1552` se retira** (mover 272 reglas que se van a
reescribir es trabajo desechable) y `TASK-1560` se destraba por el mismo camino.

**Referencia para migrar sin reinterpretar:**
[`GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`](docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md) —
geometría, valores exactos (glow, ritmo vertical, alturas), estados, motion, los 23 iconos de piso y los asertos
de verificación, incluido el de **contención** que faltaba (altura y `scrollWidth` daban verde con el layout
roto).

🔴 **Pendiente de limpieza antes de arrancar:** la rama `task/TASK-1552-slice0-internalizar-css` de
`efeonce-globe` tiene **10 archivos sin commitear y 0 commits**. Hay que revertir **juntos** el CSS copiado
(151 KB), `app.ts` y las exclusiones de los dos gates —van acoplados: revertir uno sin el otro deja el composer
sin estilos— y conservar `data-capture`, el estimado `stale` (verificado: `canExecute` sigue bloqueando) y los
tres canaries. La copia de 151 KB se preserva **fuera del código** como baseline de diff.

⚠️ `TASK-1555` declara `Status real: Diseño` pero su código ya existe, y sus criterios describen una galería que
fue rechazada. Alinear antes de tomarla.

## 2026-07-27 — TASK-1552 Globe Composer: Slice 0 y canary local

Se retomó TASK-1552 sobre el trabajo funcional existente de Claude, sin cambiar la rama `main` de
`efeonce-globe` ni ampliar el alcance a TASK-1555. Slice 0 quedó aplicado: la hoja legacy completa se copia
verbatim a `apps/studio-client/src/surfaces/producer/composer/producer-composer.css`, la rama React de
`studio-web` dejó de inyectar `extraStyles: producerStyles`, y se conservaron los markers del composer más la
señal visual de `estimate stale`. Se agregó `apps/studio-client/scripts/producer-composer-canary.mjs`, que
sirve bundle, shell, assets y lectores fixtureados en `127.0.0.1:4324/producer`.

Se corrigió un defecto descubierto por el canary: la primera copia había internalizado sólo reglas del panel y
dejaba header/layout sin estilos al retirar `extraStyles`. Ahora la hoja React contiene los 147.479 B completos
de `producerStyles`; además, un guard scoped limita el composer al viewport, deja el riel y CTA visibles y hace
que sólo el cuerpo de la receta tenga scroll. En 1440×1000, 390×844 y 320×844: header 66 px, CTA visible,
`advanced-controls` cerrado y `scrollWidth === clientWidth`. El estimate anterior se conserva y se pinta como
`stale` atenuado durante el debounce. Esto estabiliza el primer fold, pero no cierra todavía el dock ni la
recomposición completa. TASK-1555 sigue siendo la dependencia para tocar `producer-model-*`.

La revisión de teclado confirmó que el disclosure permanece alcanzable y Enter lo abre sin robar el foco;
el selector de ruta no expone `routeId` en texto visible y el composer mantiene 26 iconos Tabler en el canary.

Se agregó el primer dock de herramientas en React: `producer-tool-dock[role=toolbar]` con disclosures separados
para negativo, estilo/presets y seed, cada uno con icono y target de 45 px. Los paneles pasan 390/320 px sin
overflow. El selector `producer-model-*` sigue intacto; la derivación completa desde capabilities publicadas y
la variante de panel lateral siguen pendientes antes del cierre final.

El canary browser quedó registrado en `apps/studio-client/package.json` y pasó build, 113 tests del client y la
matriz 1440/390/320/reduced-motion. La extracción/tokenización de `producer-composer.css` no se marcó como
resuelta: el artefacto de 34 KB referido por Claude no está en este worktree, así que la hoja compat completa y
sus excepciones de gates permanecen visibles como deuda temporal de TASK-1560.
El item Style del dock ya consulta `globe.producer.style.list` antes de mostrar disponibilidad; el canary publica
esa capability y volvió a pasar en las cuatro variantes.

Validado en Globe: client tests (113), client build, studio-web typecheck/tests (279), task lint, ops lint y
`git diff --check`. No hay commit ni push.

## 2026-07-27 — Reconciliación de Brand Visibility Grader en Think

Se verificó que `https://think.efeoncepro.com/brand-visibility` está live (`HTTP 200`) y contiene el
`<greenhouse-form>` gobernado `fdef-ai-visibility-grader`. Think consume el handoff `gh_form_submission_accepted`
→ `status_url` → reporte tokenizado `/brand-visibility/r/<token>`. Se actualizaron TASK-1246, TASK-1327, el índice
de tasks, la documentación funcional de Think y el feature-flag ledger: ya no debe describirse la superficie como
inexistente o pendiente de construcción. Pendiente: consolidar smoke E2E productivo fechado y sincronizar el
lifecycle formal de TASK-1335/TASK-1336; luego separar las brechas de producto (AIO, Fix-It, Lighthouse, SoV por
motor, re-grade y cost ledger).

## 2026-07-27 — Costo real del AI Visibility Grader

La reautenticación de `gcloud` y ADC mediante Playwright quedó verificada para `julio.reyes@efeonce.org`; Cloud SQL
conectó como `greenhouse_ops` y el export de billing estuvo disponible. La reconciliación documentada en
[`AI_VISIBILITY_GRADER_COST_RECONCILIATION_2026-07-27.md`](docs/audits/cloud-cost/AI_VISIBILITY_GRADER_COST_RECONCILIATION_2026-07-27.md)
confirma que el costo registrado del grader es parcial: un run público real recalculó ~US$0,3067 antes de extracción
LLM, frente a US$0,2767 persistidos. No ejecutar pricing ni paid con US$0,50 como costo garantizado.

Pendiente: ledger de costo por run para request/search/grounding, extracción LLM, DataForSEO e infraestructura Cloud Run;
canaries reales N≥3 reconciliados con invoices/provider dashboards; owner sugerido: Growth + Finance + Platform.

## 2026-07-27 — Ecosystem Work Registry y Federated Execution Harness

Se documentó [`GREENHOUSE_ECOSYSTEM_WORK_REGISTRY_FEDERATED_EXECUTION_DECISION_V1.md`](docs/architecture/GREENHOUSE_ECOSYSTEM_WORK_REGISTRY_FEDERATED_EXECUTION_DECISION_V1.md)
y se agregó al índice de decisiones. La decisión conserva Greenhouse como registro, visibilidad y coordinación global
del trabajo del ecosistema, mientras cada repo —Wave, Globe, Think, sitio público, Kortex y servicios auxiliares—
conserva ejecución, evidencia primaria, runtime y ownership local mediante manifests/adapters federados. Estado:
`Proposed — architecture direction accepted, implementation gated`; no se definieron aún transporte, schema, primer
adapter, mutaciones ni deploys cross-repo. Se agregó explícitamente que los gates de ESLint, `pnpm`, typecheck, tests,
build, deploy y smoke son propiedad de cada repo: Greenhouse agrega resultados y aplica policy, pero no impone una
toolchain común. El alcance incluye tanto `pnpm codex:task-hook` como `/implement-task` de Claude: ambos deben consumir
el mismo work contract, verification profile, autoridad, evidencia y semántica de cierre; los gates Greenhouse-specific
de `.claude/commands/implement-task.md` no son universales. Próximo paso: aceptar el ADR y abrir el epic transversal
de foundation del registry, comenzando por baseline de repos/owners/contracts/gates y paridad de entrypoints antes de
un adapter read-only.

## 2026-07-27 — Wave Product House, Greenhouse Admin y Agent Native

Se creó [`EPIC-037`](docs/epics/to-do/EPIC-037-wave-agentic-readiness-product-platform.md), el ADR propuesto
[`EFEONCE_WAVE_PRODUCT_PLATFORM_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`](docs/architecture/EFEONCE_WAVE_PRODUCT_PLATFORM_GREENHOUSE_ADMINISTRATION_DECISION_V1.md)
y la documentación funcional inicial de Agentic Readiness. La dirección queda: Wave posee la capa de producto y su
runtime; Greenhouse administra transversalmente todas las plataformas Efeonce y consume proyecciones gobernadas. Los
productos nuevos nacen Agent Native y con Full API Parity. La experiencia objetivo es una sola identidad/SSO de
Greenhouse, con enforcement local en cada plataforma. Experience LaunchOps queda documentado como Product Service
compuesto de Wave, no como sexta familia. El ADR sigue `Proposed`; no hay implementación, migración
del Brand Visibility Grader ni rollout autorizados. Próximo paso: iterar y aceptar el ADR, definir el primer product
slice y luego derivar tasks para el repositorio Wave.

## 2026-07-26 — Globe Governed Skill System

Se creó [`TASK-1587`](docs/tasks/to-do/TASK-1587-globe-governed-skill-system-and-orchestration.md) y se enlazó
con EPIC-028 para definir el contrato del Skill System de Globe: Skill Plan, Planner, Execution Coordinator,
evidence, evals, promoción, rollback y límites de autoridad. Es una task `policy` sin cambio de runtime; el
siguiente paso es producir el ADR/spec canónico antes de derivar implementación en `efeonce-globe`.

## 2026-07-26 — Foco comercial y beachheads V1

Se convirtió la evaluación del portafolio en [`EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md`](docs/strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md).
La amplitud se conserva para expansión, pero la adquisición se concentra en cuatro puertas: AI Visibility & Search;
Revenue Operations & HubSpot; Performance & Commerce; y Creative Velocity & Production. Vocería/PR y Web Velocity
permanecen como wedges secundarios condicionados por trigger.

El plan define oferta de entrada, core, expansión, motion, proof system, campos comerciales propuestos para cross-sell
y validación de 90 días. Estado: `Approved for validation`; no cambia pricing, CRM runtime ni autorización de venta
general. Próximo paso: crear los cuatro Offer Briefs y Pricing Integrity Packs, comenzando por RevOps/HubSpot y
Performance & Commerce.

## 2026-07-26 — Partner & Provider Layer transversal

Se formalizó [`EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md`](docs/business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md):
partnerships y providers son una capa habilitante transversal, no una línea de negocio ni una colección de logos. El
modelo separa licencia/acceso, advisory, implementación, managed operations, Product Services e IP propia, y exige
provider-neutral/provider-transparent, estado contractual, economics, derechos, soporte, fallback y evidencia de demanda.

Se sincronizaron arquitectura de portfolio, business models, GTM, context pack y skills de Efeonce/HubSpot. El registro
de postulaciones continúa en `docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md`; una postulación enviada
no se presenta como partnership aprobado. Estado: `Approved for validation`; no cambia runtime ni habilita pricing público.

## 2026-07-26 — Brochures HubSpot absorbidos como input de RevOps & CRM

Se revisó el brochure principal de Efeonce x HubSpot de octubre de 2025 y las versiones históricas de 2024/2025.
Se adoptó su secuencia útil —diagnóstico, arquitectura, implementación modular, enablement y operación/optimización—
en el catálogo de [`HubSpot as a Service`](docs/services/hubspot-as-a-service/README.md). La práctica queda presentada
como Efeonce → RevOps & CRM → Kortex cuando aplica → HubSpot como plataforma/provider, con ofertas de Diagnostic,
Architecture, Implementation, Data/Automation/Lifecycle, Managed CRM Operations y Customer Agent/AI Operations.

La auditoría [`HUBSPOT_BROCHURE_REVIEW_2026-07-26.md`](docs/audits/commercial/HUBSPOT_BROCHURE_REVIEW_2026-07-26.md)
deja fuera del canon cifras, precios, bundles, nombres de producto y disponibilidad no verificados. Estado: docs y
skills actualizados localmente; no hay cambio de runtime, pricing público ni rollout. Próximo paso: validar packaging,
economics, buyer journeys y claims con fuentes primarias antes de convertir ofertas en propuestas comerciales.

## 2026-07-26 — Media & Distribution y brochure histórico de Reach

Se revisó el brochure 2026 de Reach ubicado en `Alineación/4. Comercial/Brochures/2026/EO_Brochure_Reach-2026.pdf`.
El material confirma siete familias: Paid Media Digital; Retail Media & Commerce; ATL, OOH & DOOH; Influencers,
Creators & UGC; PR & Communications; Sponsorships & Strategic Partnerships; y Dark Channels & Organic Amplification.
Se documentaron en [`docs/services/media-distribution/README.md`](docs/services/media-distribution/README.md) como la
línea de negocio de Efeonce **Media & Distribution**. Reach queda explícitamente como product brand habilitadora,
no como agencia o unidad comercial principal. IMO queda como capa operativa, no como octava familia.

Estado: `Approved for validation`; no habilita pricing público ni venta self-serve. El siguiente paso es validar
demanda, economics, derechos de creadores/medios, RACI, proveedores y pricing por familia.

Se profundizó la arquitectura comercial: las siete familias se conservan como capacidades de delivery, pero la venta
se concentra en Distribution Strategy & Media Architecture; Performance & Commerce Distribution; e Influence, Earned
& Partnership Distribution. Managed Media Operations es una capa operativa recurrente, no una cuarta solución.
El beachhead queda como hipótesis: empresas B2C/B2B2C mid-market y enterprise en LATAM con inversión multicanal,
varios proveedores y presión por demostrar eficiencia, cobertura o contribución a demanda.
La lógica económica y de validación quedó en [`MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md`](docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md).

Se incorporó la investigación de mercado [`PERFORMANCE_COMMERCE_DISTRIBUTION_MARKET_RESEARCH_2026-07-26.md`](docs/audits/commercial/PERFORMANCE_COMMERCE_DISTRIBUTION_MARKET_RESEARCH_2026-07-26.md). Performance & Commerce queda robustecido alrededor de Measurement & Signal Foundation, Performance Media Operations, Commerce Media Operations, Creative Performance System y Algorithmic Media Governance. Incrementality/MMM queda como capability avanzada condicionada por escala, datos y experimentación; no se promete como estándar.

## 2026-07-26 — Catálogo inicial de Creative Services

Se creó [`docs/services/creative-services/README.md`](docs/services/creative-services/README.md) y se enlazó
desde [`docs/services/README.md`](docs/services/README.md). El catálogo separa la línea de negocio Creative
Services de la product brand Globe / Creative Studio, y define como primera cartera: Creative Capacity / Managed
Creative Squad, Brand & Identity Systems, Campaign & Key Visual Systems, Content & Social Operations, Audiovisual /
Motion & Audio Production y Creative Studio Access. Creative Diagnostic queda como cuña de entrada; Editorial
Content & SEO se mantiene como composición con Wave/Search Visibility hasta resolver boundary y pricing.

Estado: `Approved for validation`; no habilita precios públicos ni venta self-serve. Próximo paso: crear las fichas
completas por oferta, el Pricing Integrity Pack de Creative Services y los gates de Finance/Legal/evidencia antes de
declarar cualquier servicio `Commercially approved`.

## 2026-07-26 — Benchmark de Creative Services LatAm y global

Se completó el benchmark [`CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-26.md`](docs/audits/commercial/CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-26.md)
con referentes globales, latinoamericanos y modelos productizados. La recomendación ajusta el catálogo hacia
Creative Strategy & Brand Systems, Campaign & Creative Platform Systems, Content & Social Operations, Audiovisual /
Motion & Audio Production, Managed Creative Capacity y AI Creative Operations / Studio Access. Performance Creative
Lab, Wave, Reach, Kortex e Impact Narrative quedan como composiciones o hipótesis hasta cerrar ownership, ICP,
pricing y evidencia.

Conclusión: el posicionamiento defendible es capacidad creativa gobernada, sistemas reutilizables y aprendizaje
medible; no piezas ilimitadas, horas ni IA creativa aislada. El benchmark no autoriza pricing ni aprobación comercial.

## 2026-07-26 — Run-and-Gun Studio dentro de Creative Services

Se ubicó el estudio Run-and-Gun como capability de producción y se agregó `Run-and-Gun Production` como oferta
especializada bajo `Audiovisual, Motion & Audio Production` en el catálogo de Creative Services. La separación
vigente es: el cliente compra producción dirigida por Efeonce; el estudio/equipamiento es la capacidad habilitante.
Un futuro alquiler o acceso autónomo sería otra modalidad `Studio Access`, con RACI, liability, seguros y condiciones
de uso propios.

Los paquetes `Content Capture Day`, `Interview / Podcast Capture`, `Social-First Production Sprint` y `Brand Story /
Campaign Capture` quedan como candidatos de validación. Falta inventariar equipo, crew, movilidad, post, derechos,
seguros, tiempos y economics antes de aprobación comercial.

La taxonomía fue sincronizada en las skills gemelas de `creative-practice`: catálogo comercial, hand-off a studios,
frontera Run-and-Gun Studio versus Run-and-Gun Production y composiciones con Wave/Reach.

## 2026-07-26 — Taxonomía de portfolio Efeonce corregida

Se estableció el contrato [`EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`](docs/architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md): **Efeonce es la marca paraguas y relación comercial; Creative Services, Digital Services & Engineering, RevOps & CRM, Media & Distribution y Growth Strategy & Measurement son líneas de negocio/prácticas; Globe, Wave, Reach, Kortex y Verk son product brands o platform brands; Greenhouse es el control plane; las ofertas y delivery models viven debajo de esas capas**. Se sincronizaron context pack, business models, catálogo de servicios y skills Codex/Claude. Los labels históricos de runtime pueden permanecer donde sean identificadores técnicos; no deben usarse como taxonomía comercial nueva.

Estado: docs/skills actualizados localmente; no hay cambio de runtime ni rollout. Próximo paso si se implementa CRM: mapear `business_line`, `product_brand`, `offer`, `delivery_model` y `engagement` en el catálogo/HubSpot sin reutilizar `unit` como sustituto.

## 2026-07-26 — EPIC-028 master flow y creative workspace backlog

Se documentó el benchmark de Magnific, Higgsfield, Krea, Runway, Leonardo, Recraft y Firefly dentro de EPIC-028. La dirección vigente del Producer es `intención → Project → Collection → Session → Asset Workspace → lineage → review → Element/reuse`; no se crea un segundo feed, viewer, library ni motion engine.

Se agregaron los contratos maestros [`EPIC-028-globe-creative-studio-master-flow.md`](docs/ui/flows/EPIC-028-globe-creative-studio-master-flow.md) y [`EPIC-028-globe-creative-studio-master-motion.md`](docs/ui/motion/EPIC-028-globe-creative-studio-master-motion.md). `TASK-1523` conserva la autoridad transversal.

Se crearon `TASK-1580` (Project/Session/Element contract), `TASK-1581` (Creative Entry Hub + Session Feed), `TASK-1582` (Asset Workspace + contextual reuse) y `TASK-1583` (Review-to-Element + governed reuse), con wireframes y dependencias ancladas en EPIC-028. `TASK-1520` y `TASK-1523` recibieron deltas de integración.

Verificación: `ops:lint --changed`, task lint de 1580–1583, wireframe checks y `docs:closure-check` pasan; queda pendiente la implementación y GVC real de los consumers.

> Cabina de mando para continuidad inmediata. No es changelog, arquitectura ni memoria completa.
> Ventana máxima: 20 sesiones. Historia íntegra e índice: [Handoff.archive.md](Handoff.archive.md).

## 2026-07-26 — Iteración de identidad visual para Globe Capacity

La suite de Studio Credits se documentó como **Globe Capacity**: `Capacity` / `Capacidad` es la navegación,
`Studio Capacity` / `Capacidad del estudio` el título de suite y `credits` / `créditos` la unidad operativa.
`TASK-1485` gobierna la semántica multi-locale y el patrón `Capacity Observatory`; `TASK-1483` conserva el
Runway Control Plane como composición full-workbench. Producer y Creative Loop consumen variantes compactas
(`Credit Pulse`, `Runway Plane`, `Risk Rail`, `Evidence Ledger`, `Governed Command Dock`). La identidad Horizon +
Orbit separa capacidad de wallet, token, dinero y checkout; `TASK-1484` mantiene la frontera comercial. Cambios
documentales aplicados en EPIC-028, TASK-1483, TASK-1484, TASK-1485 y TASK-1523. Producer queda como consumidor
futuro, sin convertir TASK-1505 en dueño de esta identidad. Implementación y GVC
siguen pendientes.

Se creó [`TASK-1578`](docs/tasks/to-do/TASK-1578-globe-model-onboarding-credit-rate-promotion.md) para cerrar el
onboarding transversal de modelos: route → credit rate → binding → estimate/actual → canary → promotion, con
receipt auditable y coverage API/SDK/MCP/UI. `TASK-1468` conserva el rate catalog y ledger; `TASK-1553` conserva
catálogo/bindings/resolución; `TASK-1578` une y certifica el flujo.

Se creó [`TASK-1579`](docs/tasks/to-do/TASK-1579-globe-credit-rate-settlement-fallback-policy.md) como contrato
normativo previo: define la fórmula única de credits, estimate/actual/settlement, fallback, retries, batches,
equivalencia entre providers, lifecycle de rates, calibración y observabilidad. `TASK-1468` y `TASK-1578` quedan
dependientes de esta policy; implementación y rollout siguen pendientes.

## 2026-07-26 — Globe media review tasks ancladas en EPIC-028

La auditoría Playwright del `/producer` autenticado confirmó el estado real de audio y video: audio nativo de
7,13 s sin waveform y video nativo de 4,06 s sin timeline propia; ambos conservan focus restoration y no tienen
overflow en desktop/390px. Se actualizaron los deltas de [`TASK-1568`](docs/tasks/to-do/TASK-1568-globe-sonic-canvas-audio-experience.md)
y [`TASK-1570`](docs/tasks/to-do/TASK-1570-globe-cinematic-canvas-video-experience.md), y se anclaron junto con
`TASK-1567`, `TASK-1569` y [`TASK-1571`](docs/tasks/to-do/TASK-1571-globe-image-focus-compare-canvas.md) en
[`EPIC-028`](docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md). Estado: documentación y
tasks listas; implementación y GVC siguen pendientes. Próximo paso: ejecutar por dependencias derivative → UI.

## 2026-07-26 — Routing económico de modelos generativos

Se documentó en las skills gemelas de `design-studio` y `motion-design-studio`, y en el operador de business model,
la comparación directo vs. Fal, el routing de Seedance 2.0 / Gemini Omni / FLUX 3 y sus casos de uso. FLUX 3 queda
como early access sin API pública general ni precio público al corte; no es dependencia de producción. La matriz
canónica y sus fuentes fechadas están en `.codex/skills/*/SOURCES.md`; las copias Claude de diseño y motion están
sincronizadas. No hubo cambios de runtime ni consumo de APIs.

## 2026-07-26 — Postulaciones de partners de IA generativa

Se consolidó el registro auditable en [`docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md`](docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md).
Quedaron confirmadas las postulaciones a **FLUX Creator Program**, **Runway Enterprise** y **ElevenLabs Commercial Partner**. **BytePlus Partner Network** está rellenado hasta reCAPTCHA; **AWS** requiere documento/selfie; **Salesforce** requiere crear/verificar el usuario; **Google Cloud** ya tiene una cuenta partner existente asociada a `efeonce.org` y requiere recuperar el perfil, no duplicarlo. Runway Creative Partners devolvió 504, por lo que se usó la vía enterprise.

**Siguiente acción humana:** completar los captchas/verificaciones y los pasos de identidad/acceso descritos en el audit antes de declarar cualquier programa como aprobado.

Las skills `efeonce-business-model-operator` y `efeonce-customer-model-operator` (Codex y companions de Claude) ya
incorporan la clasificación y los gates para evaluar partners/providers; el estado concreto sigue viviendo en el audit.

## 2026-07-26 — ESTADO VIGENTE de generacion y fondeo de Globe (supersede TODO lo de abajo sobre estos dos temas)

> **Para generacion y fondeo de Globe, esta entrada gana.** Las de abajo son narrativa del mismo hilo y
> varias se contradicen entre si leidas de arriba hacia abajo — fueron ciertas en su momento. Las
> entradas de Codex que estan **arriba** cubren otros temas (identidad visual, routing economico,
> partners) y no compiten con esta.

**Runtime vigente (verificado, no inferido):**

| Servicio | Revision | Estado |
|---|---|---|
| `globe-api-internal` | **`00106-b6w`** (`b4c56a12ce65`) | `GLOBE_CREDIT_ADMIN_LANE_ENABLED='true'`, **176 capabilities** |
| `globe-studio-internal` | **`00094-pr8`** (`7cd0df363839`) | Producer **React** sirviendo, `GLOBE_CLIENT_PRODUCER_ENABLED='true'` |

**Generacion: RESUELTA.** Las tres modalidades generan desde la UI con principal `human` por el BFF —
imagen (Seedream 5 Pro, 10 cr, PNG 7,4 MB), video (Seedance 2.0, 16 cr, MP4 1,5 MB) y audio
(ElevenLabs Multilingual v2, 6 cr, MP3 114 KB). Lo que la bloqueaba era un falso positivo: el
sanitizador leia `"Key visual…"` como credencial (ISSUE-127 capa 8). Se arreglo el CONTROL, no el
prompt. Un video fallo por `provider_failed` **transitorio** (2 de 3), con `spentCredits=0`.

**Fondeo gobernado (TASK-1566): carril VIVO, falta el ultimo salto.** Slices 1/4/5 entregados. La
atribucion humana es exigible (tabla append-only + trigger en la BASE), el segundo confirmador es
POLITICA con default OFF en el interno, y la mutacion corre en UNA transaccion.
🔴 **Falta un unico paso: ejercer `propose`->`confirm` con Greenhouse DESPLEGADO.** Desde una laptop no
se puede y es por diseno — el ADC humano no puede impersonar al workload caller (`PERMISSION_DENIED`);
ese `tokenCreator` es de `greenhouse-portal@` (`iam.tf:16-20`). Hasta entonces NO se retira
`raise-credit-monthly-cap.mjs`: sacarlo dejaria cero caminos para subir el tope.

**Migraciones aplicadas hoy:** Globe `0032_credit_funding_proposals`; Greenhouse
`…164420386_task-1566-globe-credit-funding-intents` y `…171851162_task-1566-second-confirmer-is-policy-not-invariant`.

**Dos errores propios que conviene no repetir:**
1. Puse un `CHECK` duro exigiendo dos humanos donde ADR-015 ya habia decidido POLITICA con default OFF
   — y bloquee al operador, que es el unico con esa autoridad. Endurecer mas de lo que la decision pide
   no es conservador: es cambiar la decision sin discutirla.
2. **Novena aparicion de ISSUE-127**, en el broker escrito el mismo dia en que se cerraban las ocho
   anteriores: un `catch` que sanitizaba sin dejar rastro del servidor. La contramedida no es
   disciplina sino procedimiento — el `catch` y su linea de log, en el mismo commit.

**Sesion 2026-07-26 (cierre parcial) — detalle completo en TASK-1566 § Delta 2026-07-26 (4).**
El carril se ejercio DESPLEGADO por primera vez y aparecieron **SIETE defectos en cadena**, cada uno
tapando al siguiente: (1) cero `GLOBE_*` en Vercel, (2) audiencia OIDC que Vercel nunca emite —la
federacion Vercel→Globe **nunca funciono**—, (3) payload del broker sin `sourceId`/`reasonCode`/`at`,
(4) fingerprint de 248 chars validado con un `id()` de 200, (5) parametro SQL ambiguo (`42P08`),
(6) firma sobre el payload sin su propia `approval`, (7) `readState` usando el pool DENTRO de la
transaccion atomica → **cuelgue**.

**Seis corregidos y desplegados** (Greenhouse `d2e45dd33`; Globe `004b849`, `659c58d`, `5cb0720`,
`f268612`, `da8e4bc`). `propose` verde punta a punta con plan legible real; **`confirm` sigue sin
completar** por el (7).

🔴 **Incidente causado y remediado en la sesion:** el cuelgue dejo el lock advisory
`credit:workspace:greenhouse-org:efeonce` retenido, lo que bloquea **toda** reserva de credito del
workspace —generacion incluida—. Se reciclaron las instancias de `globe-api-internal`; verificado
despues: cero locks, cero sesiones activas. **Si el (7) se vuelve a ejercer, el bloqueo se reproduce.**

**Sesion 2026-07-26 (pasada dedicada al 7) — code-complete, SIN desplegar. Detalle en TASK-1566
§ Delta 2026-07-26 (5).** El segundo acceso al pool que la hipotesis refutada exigia localizar era
`markGrantPosted`: usaba `this.pool.transaction` incondicional —ignoraba la `tx` inyectada del Slice
4c— y toma el advisory lock del workspace desde una conexion nueva; es exactamente el camino sin
`monthlyCap` (`confirm` → `issueCreditGrant` → grant tx ✓ → allocate tx ✓ → `markGrantPosted` pool →
cuelgue). `readState` era la MISMA clase pero nunca se alcanzaba. Fix `efeonce-globe@4eab6d3` (local,
main, sin push): todo metodo de `DurableCreditAdministrationStore` (run + 11 readers) y los 6 readers
del ledger honran la `tx` inyectada; `CreditFundingMutationPorts` gana `policyReader` y el `readState`
de mitad de mutacion corre por los ports del seam. Regresiones conductuales verificadas en rojo contra
el store viejo (2/2); `pnpm check` + `pnpm build` verdes.
**Desplegado el mismo dia ("avanza con todo"):** `globe-api-internal` rev **`00113-l8b`** desde
`4eab6d3` (target_sha verificado, run 30223326513), flag del carril `true` en la revision nueva,
`pg_locks` post-deploy **0/0/0**, y smoke `propose` → **200** por el puente staging→WIF→Globe contra
la revision nueva (plan legible real). Detalle vivo en `GLOBE_RUNTIME_HANDOFF.md` § Active state.
✅ **CRITERIO DE SALIDA CUMPLIDO el mismo dia (TASK-1566 § Delta (6)):** fondeo real `propose` →
`confirm` punta a punta SIN break-glass, con la sesion REAL del operador en Chrome (autorizacion
explicita "hazlo end to end"; el agente ejecuto la mecanica, la atribucion es humana de verdad).
`confirm` en **905 ms** — el paso que antes se colgaba. Grant 100 `posted` + cap 400→**800** + asiento
de ledger en una transaccion; intents `proposed`+`confirmed` con `user-efeonce-admin-julio-reyes`;
`pg_locks` **0/0/0 despues** del confirm. Dos correcciones de runbook: el confirm necesita clave de
idempotencia PROPIA (el broker 409ea el reuso), y el anti-replay del broker es POR PROPUESTA (ningun
segundo grant, verificado con dos replays → `count=1`).
✅ **Retiro EJECUTADO en la misma jornada (TASK-1566 Delta (7); rev `00114-k4t`,
`efeonce-globe@5d64c5d`):** el caller generico (y el broker de tenancy, misma clase) perdio las 4
capabilities de credit-admin; señal anti-regreso en dos capas (evento
`globe.credit_admin.caller_authority_drift` steady=0 verificado + test de disyuncion); scripts de
firma cliente `raise-credit-monthly-cap*` eliminados (Slice C). Smoke post-retiro: `propose` 200 con
cap 800/disponible 444. **Triple documentacion creada ANTES del retiro:** manual
`manual-de-uso/creative-studio/fondear-creditos-globe.md` + funcional
`documentation/creative-studio/fondeo-gobernado-creditos-globe.md` + ADR-015 Delta (3) + skill.
✅ **TASK-1566 CERRADA (2026-07-26)** con gates completos (`pnpm test` full + `pnpm build` prod
verdes; task:lint limpio) y el hardening restante creado como hijas nuevas de EPIC-028:
**TASK-1584** (ADR-015 D+E: KMS asimétrico + identidades disjuntas por unidad), **TASK-1585**
(Slice H: break-glass gobernado + retiro del HMAC; bloqueada por 1584) y **TASK-1586** (Slice F:
desambiguador de negación al operador vía broker lane — cierra ISSUE-124). La superficie ui-ux de
administración NO se creó como task a propósito: exige wireframe real (nada de stubs); nace vía
product-design-loop cuando se priorice, consumiendo los contratos de 1586.
Higiene pendiente: **3** propuestas en `confirmed` colgadas (pre-fix) + 1 `confirm_failed`; el TTL
solo vence las `proposed`, no se terminalizan solas (TASK-1469).

**Leccion que explica las siete:** *"funciona hasta el borde con Globe"* se habia medido en LOCAL,
donde el puente no se ejercita. Declararlo como estado es lo que hizo que se pagaran todas juntas.

**Bug class del NUL cerrado con gate en LOS DOS repos** (`pnpm nul-byte-gate`; en Greenhouse dentro de
`local:check`/pre-push, en Globe dentro de `check` — commit `076ca4b`). El barrido encontro 3 archivos
mas ademas del `credit-funding.ts` original. Detalle en el Delta (4) y en la skill `greenhouse-globe`.

**Pendientes vivos:** `authentication_required` (4.a fila de ISSUE-127, unica abierta) · los dos huecos
del canary (`RUN_LABEL` exigido solo en `--execute`; el dry-run no reporta `withinDayCap`) · reconcile
terminalization (TASK-1469) · `data-testid` estables en feed/tabs (el live feed invalida los refs de
a11y y vuelve flaky cualquier QA automatizado) · top-up de cliente (TASK-1484: el trigger exige actor
humano y hay que discriminar por `source`, no relajarlo).

## 2026-07-26 — CLI local multi-proyecto para Globe

`gcloud` conserva `default` activo con `julio.reyes@efeonce.org` / `efeonce-group` y tiene la
configuración nombrada `globe` para la misma cuenta / `efeonce-globe`. Preferir
`gcloud --configuration=globe ... --project=efeonce-globe`; activar perfiles no concede IAM ni cambia
la postura runtime. Si se activa `globe` interactivamente, restaurar `default` al cerrar el acto.
La fuente operativa es [`GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md#cli-local-multi-proyecto).

## 2026-07-26 — Experience LaunchOps: governance y compliance como capacidad de producto

Se documentó `Experience LaunchOps` como product service independiente de Wave, en `EPIC-036`, separado de
`EPIC-019` (que sigue siendo el control plane interno del sitio propio de Greenhouse). Se agregó modelo de negocio,
customer model, ADR de plataforma agéntica y roadmap.

La nueva preocupación enterprise quedó formalizada en
`docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GOVERNANCE_COMPLIANCE_OPERATING_MODEL_V1.md`: Launch Policy Pack,
clasificación de riesgo L0-L3, segregation of duties, control library, findings/exceptions con expiry, evidence
pack, límites de agents y autoridad del cliente. Governance/compliance/assurance son capacidades explícitas y
drivers de qualification, staffing, lead time, delivery model y pricing; no son un checklist final ni un claim de
certificación. El estado es `Proposed`; requiere piloto real y validación legal/compliance por jurisdicción.

## 2026-07-26 — Experience LaunchOps: enterprise readiness companions

Se agregaron companions de stack/reference architecture, security/threat model, cloud/deployment, operations/SRE
support, legal/contract/data processing, agent assurance/evaluation y enterprise readiness/procurement. El ADR y
`EPIC-036` los enlazan; el roadmap incluye `Assure` antes de package/specify/build. Todos están en estado `Proposed`
y no representan certificación, cumplimiento legal, runtime productivo ni selección definitiva de vendors.

## 2026-07-26 — Experience LaunchOps: augmentation-first product thesis

Se formalizó el Launch Operator como héroe del producto y se creó
`docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_HUMAN_AUGMENTATION_PRODUCT_OPERATING_MODEL_V1.md`. La tesis es que
LaunchOps entrega una “armadura” de contexto, dependencias, patrones, preflight, diffs, evidencia, simulación y
recuperación: no reemplaza UI/UX designers, UX Content, developers ni especialistas, sino que reduce coordinación
repetitiva y preserva autoría, criterio y calidad. El piloto deberá medir operator leverage, craft quality, human
value y trust, no sólo velocidad o headcount.

## 2026-07-26 — Experience LaunchOps: Agent Fabric y Worker architecture

Se creó `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_AGENT_FABRIC_ARCHITECTURE_V1.md`. La capa agentic queda
separada en Control Plane, Agent Fabric, Tool/MCP Gateway y Client Execution Plane. Los agents se operacionalizan
como Workers gobernados: roles de razonamiento, workers acotados, skills/recipes y adapters tienen fronteras
distintas. Se define catálogo de Core Workers, Client/Partner/Provider Workers, composición de Custom Workers sin
fork del core, Worker Manifest, lifecycle, Provider Gateway, memoria y deployment modes. La recomendación inicial es
un provider principal + fallback validado; Vertex/Foundry quedan como enterprise rails según el cliente. Estado:
`Proposed`, sujeto a piloto y evaluación real.

## 2026-07-26 — Experience LaunchOps: multi-transport integration strategy

La arquitectura de Agent Fabric documenta que LaunchOps no será MCP-first: API es la columna vertebral
determinística; MCP es interfaz agentic/discovery; CLI/Job Runner es brazo operacional sandboxed; webhooks/events
sincronizan estados; browser automation queda como fallback legacy. Workers solicitan capabilities de negocio y el
Capability Registry/Transport Resolver selecciona el adapter/transport según policy, ambiente, riesgo y evidencia.

## 2026-07-26 — Experience LaunchOps: cloud placement decision

Se creó `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_CLOUD_PLACEMENT_DECISION_V1.md`. La decisión propuesta es
GCP dedicado para el Control Plane/Agent Fabric de Wave, separado de Greenhouse, con Cloud Run/Jobs, Cloud SQL
dedicado, storage privado, Secret Manager, WIF y observabilidad. Azure y AWS quedan como execution/deployment rails
para clientes Microsoft/AWS-first mediante Client Execution Runner y futuros modos client-controlled/private. No se
propone active-active multi-cloud en V1; la portabilidad vive en contratos, containers y adapters.

## 2026-07-26 — Experience LaunchOps: federated identity and access

Se creó `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_IDENTITY_ACCESS_ARCHITECTURE_V1.md`. La decisión es una capa
federada basada en OIDC/SAML, SCIM 2.0, JIT opcional y mapping gobernado de grupos/claims a roles/entitlements.
Entra y Google tienen paths preconfigurados; Okta/Auth0/Ping/OneLogin/Keycloak entran por adapters estándar. El IdP
es source of truth de identidad/lifecycle; LaunchOps es source of truth de membership, autorización, approvals y
policies. La identidad estable es `(issuer, subject)`, no email. Se separan views de entitlements y se revocan
sesiones/acciones privilegiadas ante deprovisioning.

## 2026-07-26 — Experience LaunchOps: product promise and search-native readiness

Se creó `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_PRODUCT_PROMISE_AND_SEARCH_NATIVE_ARCHITECTURE_V1.md`.
La promesa queda operacionalizada como reducción de lead time mediante Launch Contracts, trabajo paralelo,
reutilización gobernada, preflight determinístico, aprobaciones explícitas, release controlado y evidencia
post-launch. Cada experiencia debe incluir Experience, Brand, Search, Measurement, Delivery y Governance Contracts.
Search/AEO y agent readability son requisitos desde el diseño, no una revisión posterior; el producto promete
readiness y evidencia, nunca rankings, indexación, tráfico o citaciones garantizadas por terceros.

## 2026-07-26 — Experience LaunchOps + Globe: creative production integration

Se creó `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GLOBE_CREATIVE_PRODUCTION_INTEGRATION_V1.md`. Globe queda
formalizado como capability composable, no como dependencia obligatoria: puede entregar `CreativeAssetPack`,
`AssetManifest` y `AssemblyManifest` para llevar una experiencia de asset-ready a experience-ready. Wave conserva
la responsabilidad de launch-ready: ensamblaje, CMS/DXP, Search/AEO, Measurement, governance, release y evidencia.
El modelo comercial queda expresado como `Experience Production Pack by Globe` dentro de Experience LaunchOps,
con modos client-assets, Globe-assisted, Globe-managed y full Efeonce.

La aclaración posterior queda incorporada: Globe no es sólo plataforma/producción de assets. Es un product service
que combina plataforma, especialistas y capacidad de delivery. Puede entregarse como Studio Access, Creative
Production, Managed Squad o Staff Augmentation. Managed Squad conserva dirección y accountability de Efeonce/Globe;
Staff Augmentation queda bajo dirección cotidiana del cliente y no hereda automáticamente el SLA del squad.

## 2026-07-26 — Efeonce 2028: todos los servicios Productized y AI-native

Se creó `docs/strategy/EFEONCE_2028_PRODUCTIZED_AI_NATIVE_SERVICES_STRATEGIC_DIRECTION_V1.md` como directriz
corporativa propuesta. Para 2028, todo servicio client-facing debe pasar los gates de Product Service y AI-native:
oferta y scope definidos, workflow repetible, IA estructural, autoridad humana, plataforma/memoria, quality gates,
economics, governance y evidencia. No implica SaaS puro, self-service, autonomía total ni reducción de personas.
Se actualizaron ASaaS, Product Service Operating Model, business models, context y skills de agencia, negocio,
pricing y customer model.

## 2026-07-26 — Efeonce Product Service Operating Model

Se creó `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` como contrato transversal para toda
oferta Efeonce. Define `Product Service` como una oferta orientada a resultado que combina método, personas,
plataformas y ejecución gobernada. Obliga a separar product service, nivel de productización, delivery model,
operating mode y engagement, y a declarar scope, roles, quality gates, pricing architecture, economics, evidencia,
IP, expansión y stop conditions. Wave y Globe quedan conectados al modelo, y las skills de business model/pricing
de Codex y Claude ahora lo referencian antes de diseñar packaging o pricing.

## 2026-07-26 — Experience LaunchOps: brand/UI/UX consistency quality model

Se creó `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_BRAND_UI_UX_CONSISTENCY_QUALITY_MODEL_V1.md`. La consistencia
de marca queda modelada como artifact chain versionado —Brand DNA, Experience System, UI/UX System, Content System,
recipes/templates, golden set, Experience Artifact y Quality Evidence Pack— con Gates 0–8: intake, brief, system
readiness, content/claims, visual/interaction, technical/search/measurement, human release, post-launch/drift. Los
agents detectan y proponen; checks determinísticos validan; UI/UX, UX Content/Brand, Technical, Measurement y
Compliance conservan la autoridad humana.

## 2026-07-26 — Customer Model Operator transversal

Se creó `.codex/skills/efeonce-customer-model-operator/` y su companion `.claude/skills/efeonce-customer-model-operator/`.
La skill cubre ICP, segmentación, beachhead, JTBD, teoría de valor, triggers, buyer personas, buying group, stakeholder
map, decision process, paper/procurement process, qualification, evidencia, validación/WTP, adopción, retención y
expansión. Incluye método detallado y `Customer Model Integrity Pack` reusable. No reemplaza las skills de GTM,
Commercial, Research, Pricing, Finance, Legal u Operations: define sus handoffs y ownership.

El modelo queda agnóstico a Wave, Globe, Search Visibility 360 o cualquier otra línea. Las ofertas concretas deben
aplicarlo con evidencia real; la skill no convierte hipótesis en ICP aprobado, venta, renovación ni escala.

Aplicación inicial: `docs/business-models/search-visibility-360/SEARCH_VISIBILITY_360_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md`.
Search Visibility 360 queda explícitamente acotado a clientes mid-market y enterprise; el pack mantiene `model_incomplete`
porque todavía faltan beachhead, cuentas reales, buying groups, WTP, economics y señales de adopción/retención.

## 2026-07-26 — EPIC-022 actualizado con product/service readiness

EPIC-022 ahora distingue madurez AEO, arquitectura SEO y runtime SEO, e incorpora los gaps de producto-servicio:
action loop, integración de contenido/Globe, medición de negocio, customer success, enterprise operations y provider
governance. También fija mid-market + enterprise como alcance, gates de diagnostic/commercial qualification/
implementation/managed operation/renewal/enterprise y la secuencia de olas recomendada. El epic permanece en diseño.

## 2026-07-26 — Pricing Integrity Pack aplicado a Wave

Se probó `efeonce-pricing-operator` sobre las cinco familias de Wave y sus delivery models. El resultado vive en
`docs/business-models/wave/WAVE_PRICING_INTEGRITY_PACK_V1.md`: la separación de capas es coherente, pero el verdict
permanece `hypothesis_only` hasta completar métricas de valor, cost-to-serve, margen, capacidad, rights/providers,
evidencia de repetibilidad y aprobaciones. No se aprobaron tarifas, claims ni venta general.

## 2026-07-26 — Pricing Integrity Pack aplicado a Search Visibility 360

Se creó `docs/business-models/search-visibility-360/SEARCH_VISIBILITY_360_PRICING_INTEGRITY_PACK_V1.md`.
Es un artefacto exclusivamente de pricing: métrica property/market/surface/lane, foundation, recurring operations,
transparency/platform, content capacity, expansion, FX, margen y validación. SEO y AEO siguen integrados en Search
Visibility 360; el pack no redefine Wave ni el oficio SEO/AEO. Verdict: `hypothesis_only`.

## 2026-07-26 — Business Model Integrity Pack para Search Visibility 360

Se creó `docs/business-models/search-visibility-360/SEARCH_VISIBILITY_360_BUSINESS_MODEL_INTEGRITY_PACK_V1.md`.
El documento completa el mapa de customer/value, ICP, oferta, delivery, revenue, economics, data/IP, evidencia,
escala y capital. El estado sigue siendo `model_incomplete`: hay tesis y boundaries, pero faltan cohortes, economics
reconciliados, contrato de datos/IP, repeatability y señales de renovación.

## 2026-07-25 (4) — Wave portfolio y boundaries documentados

Se formalizó Wave como marca de producto de Efeonce con cinco familias: Search Visibility 360, Web Experience
360, Measurement & Analytics, Agent Systems & Platforms y Digital Automation & Integrations. CRM/RevOps queda en
Efeonce Digital/Kortex; Globe conserva contenido/producción; Reach conserva medios/distribución. Canon:
`docs/architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md` y
`docs/business-models/wave/WAVE_BUSINESS_MODEL_V1.md`. Pricing, claims, costos y aprobación comercial siguen
pendientes; no hay rollout runtime.

La cartera de Wave separa ahora product service de delivery model: una misma oferta puede operar como Productized
Service, Managed Squad, Staff Augmentation, Implementation, Advisory o Platform-enabled Service, y componerse con
otras capabilities del ecosistema bajo RACI/SOW explícitos.

## 2026-07-26 — Pricing transversal para Codex y Claude

Se creó `efeonce-pricing-operator` como companion agnóstico a la línea de negocio. Gobierna value metric,
packaging, delivery/pricing mechanism, híbridos, capacity, usage/credits, cost-to-serve, margin waterfall,
descuentos, versionado, validación y approval gates. Se sincronizó en `.codex/skills/` y `.claude/skills/` y se
conectó con business model, agency, GTM, commercial, Finance, Creative Practice y SEO/AEO Practice. La skill no
fija tarifas: los precios vigentes siguen siendo responsabilidad de Finance, catálogo y contrato aprobado.

## 2026-07-25 (3) — Globe: /producer convertido a React, y la razon por la que NINGUN command funcionaba

**Runtime:** `globe-studio-internal` y `globe-api-internal` desplegados al mismo SHA. Dueña de la superficie:
**`TASK-1505`**. Decisiones: **ADR-014 § Delta 2026-07-25 (2)/(3)/(4)**.

⚠️ **`/producer` sigue sirviendo el legacy**: `GLOBE_CLIENT_PRODUCER_ENABLED` está en `false` (ahora explícito
en el spec). Lo convertido se ve en local con el harness, no en el portal.

### Lo convertido (1:1, reutilizando `producerStyles` verbatim)

Header completo (marca, banda de modalidad funcional, créditos reales `500008 disp.`, ⌘K, Guía, avatar con
perfil y switcher) y composer completo (prompt con acciones dentro, Sugerencias por modalidad, Referencias con
contador y tile, Excluir del resultado, Estilo·preset con Style DNA, Seed, Modo, selector de flota con
**isotipo real y filtrado por modalidad**, y formato de salida con **chips + stepper**). El feed ya portado se
reutiliza tal cual.

### 🔴 La causa raíz de que ningún command funcionara

El transporte inventaba la cabecera **`x-globe-idempotency-key`**; la plataforma entera usa
**`x-idempotency-key`**. El BFF la EXIGE igual al `idempotencyKey` del envelope y rechaza con
`return denied('invalid_request', 400)` — **sin lanzar**, así que sin `catch`, sin audit de handler y sin
rastro en logs. Ni `Generar` ni `Mejorar` podían funcionar. Verificado tras el arreglo: `Mejorar` devuelve
propuesta real.

**Cuatro tests afirmaban la cabecera inventada.** Tercera vez que este transporte falla así — el harness
validando la suposición de quien lo escribió.

### 🔴 La API estaba DESFASADA del web

`deploy-internal.yml` toma el servicio como input: desplegar el web **no** despliega la API. La API corría
`45235cc` mientras el web iba adelante, y **el dispatch de commands ocurre en la API** — toda instrumentación
que agregué al web era invisible para el fallo. Ambos servicios quedan al día; verificar la imagen de CADA
servicio antes de diagnosticar.

### Observabilidad, cerrada

Faltaba `roles/logging.logWriter` en las runtime SAs (aplicado por IaC: un servicio sin ese rol corre **mudo**
y no lo dice) y la app no tenía **línea de arranque**, así que el silencio era indistinguible de un canal
roto. Ahora emite `globe.studio_web.listening`. Trampa de consulta registrada: **`textPayload:` no matchea
logs JSON**.

Localización de rechazos instrumentada en los **dos** caminos (handler y envelope), con el nombre del campo
—nunca su valor— al log del servidor.

**Siguiente:** aplicar preset y cambiar de Modo en el composer, que además arregla **"Excluir del resultado"**,
hoy entrada muerta que no viaja a ningún lado. Después panel de créditos completo y ⌘K + Guía.

## 2026-07-25 (2) — Globe: regresión del feed cerrada y desplegada; `/producer` empieza a convertirse a React

**Runtime:** revisión viva `globe-studio-internal-00078-5gs`, imagen `03a4beb`. `pnpm check` + `pnpm build`
verdes. Dueña de la superficie: **`TASK-1505`** (ahí está el checkpoint completo). Decisión: **ADR-014
§ Delta 2026-07-25 (2)**.

**Desplegado y verificado en producción.** La regresión visual de `/producer/feed` está cerrada: rejilla con
filas parejas, reposo de card (borde/radio/**sombra que era `none`**), guard de `<img>` sin `src` (el `alt` se
pintaba sobre la forma de onda de las cards de audio), toggle de selección de vuelta a la derecha con glifo de
círculo, título con clamp de 2 líneas, fecha en el pie y washes de vuelta a la familia azul (`mediaWashFor`
recorría la rueda de tonos completa). **Dos bugs vivos que sólo se ven con la obra cargada:** `.pf__badge` sin
`z-index` mientras `.pf__thumb` declara `1` — el thumbnail tapaba "Destacada" y en el frame desplegado no
aparecía nunca —, y su relleno dependía de un media oscuro para ser legible.

**Causa raíz de esa regresión, y la regla que deja:** el feed se **reconstruyó contra el prototipo** en vez de
portarse del legacy. Es la misma clase de error que el transporte en la sesión anterior. Para lo ya probado en
producción, **la autoridad es el legacy**.

⚠️ **`/producer` en React NO es todavía una conversión.** El flag `GLOBE_CLIENT_PRODUCER_ENABLED` está
**apagado** y ausente del entorno de la revisión viva, así que `/producer` sirve el legacy completo (verificado
con sesión real: marca, créditos, avatar, perfil, switcher, ⌘K, Guía, 12 chips). Lo que existe en React es un
**placeholder** heredado de otra sesión: 4 `<select>` nativos, 4 botones todos deshabilitados, 0 chips, 5 de 14
capabilities del composer. **No presentarlo como la conversión** — hacerlo costó una sesión de confusión.

**Lo montado para poder convertir SIN recrear:** flag propio cableado (`variables.tf` + `cloud_run_services.tf`
+ `app.ts`); `renderShell` acepta `extraStyles`/`extraStylesheets` y la rama React de `/producer` sirve
**`producerStyles` verbatim** + iconos Tabler, así el markup se traduce 1:1 conservando clases y la deriva visual
es imposible; `/v1/session` publica `identity {name,email}` **hermana del `principal`** (sin esto el avatar y el
perfil no tenían contrato por donde cruzar).

**Siguiente:** header 1:1 (créditos **gateados antes de despachar**, como el legacy) → composer 1:1 con sus
chips → comportamiento desde `producer-controller.ts` (5.172 líneas) → tokenizar la hoja legacy y ampliar el
gate de diseño (`TASK-1560` Slice 2) antes de retirar.

⚠️ **Coordinación:** otra sesión estaba escribiendo estas mismas superficies en el mismo árbol. Se tomó la
conversión en una sola cabeza por decisión del operador; verificar que esa sesión esté detenida antes de seguir.

## 2026-07-25 — payload cliente de Globe (ADR-014): 4 superficies avanzadas, 5 tasks duplicadas retiradas

**Handoff completo:** `docs/operations/creative-studio/GLOBE_CLIENT_PAYLOAD_SESSION_HANDOFF_2026-07-25.md`
— leerlo antes de retomar; este bloque es sólo el índice.

**Runtime:** revisión `globe-studio-internal-00076-z2x` (`c453d7de`). ⚠️ **1 commit sin desplegar**: `0fd28ab`
(fill-mode + lift de hover). `pnpm check` verde, 98/98, build verde, ambos repos limpios.

**Vivo y verificado con sesión real:** `/producer/feed` sirve el payload cliente con **datos de producción** (15
piezas, thumbnails por `blob:`, isotipo respirando, aurora); **`/producer` intacto con su composer**; el payload
nuevo **no filtra `routeId`** (el legacy sí, 45 veces).

**Lo que hay que saber antes de tocar código:**

1. **El transporte se REESCRIBIÓ cuando debía PORTARSE.** `producer-client.ts` ya tenía las 4 respuestas (rutas
   separadas, `apiVersion`, desenvolver `.data`, retrieval en 2 pasos con grant). Costó 5 deploys. Es clase 2 de
   la regla de reconciliación: **invariantes de runtime = autoridad del legacy**.
2. **98 tests verdes no atraparon nada** porque los dobles devolvían `{ ok: true }` desnudo y el canary servía
   la ruta inventada: **el harness probaba suposiciones, no el contrato.** Ya corregido con guards.
3. **`TASK-1526` (dueña del feed, `complete`) ya tenía contrato de motion** y no se leyó: prohibía
   `fill-mode: both` (lo usaba) y ya especificaba la entrada una-vez-por-key. Además faltaba el lift de hover
   del prototipo.
4. **5 tasks duplicadas** por barrer el registry por nombre en vez de por dominio; `1563/1564/1565` retiradas
   con su contenido **y criterios** devueltos a las 8 dueñas. Regla escrita en `TASK_PROCESS.md` + 4 skills.

**Motion tiene TRES dueñas, no una:** `TASK-1523` (suite: isotipo, aurora, skeleton, tokens, gate) ·
`TASK-1526` (feed/viewer: entrada, lift, reveal) · `TASK-1552` (composer: estimado atenuado, progreso).

**Siguiente:** desplegar `0fd28ab` → 2 defectos chicos del frame (el `<img>` se renderiza en cards de audio; 3
de 15 thumbnails en 6s por resolución secuencial) → las 3 cosas del legacy sin portar (`gateFor`,
reautenticación, cobertura de epoch) → composer.

## Estado activo ahora

- **2026-07-25 — Skills de investor readiness y business model creadas y validadas.** Nuevas skills:
  `.codex/skills/efeonce-investor-readiness/` y `.codex/skills/efeonce-business-model-operator/`. Incluyen
  operating loops, gates, templates, fuentes, eval scenarios y validadores locales. `AGENTS.md`, `CLAUDE.md`,
  `efeonce-agency` y `docs/business-models/README.md` ya enrutan hacia ellas. No declaran una ronda, instrumento,
  spinout ni pricing aprobado. Ver los SKILL.md y `docs/strategy/EFEONCE_CAPITAL_AND_INVESTMENT_STRATEGY_V1.md`.

- **2026-07-25 — Hardening de skills completado.** Investor Readiness ahora incluye templates de deck,
  financial review, use of funds, data room, pipeline, diligence, applications, videos, demo y post-close;
  source catalog; validadores de evidence ledger/data room; y protocolo/evidencia de evals. Business Model
  incluye eval protocol, source catalog, portfolio model contract y drafts explícitos para Efeonce Group,
  Growth Platform, AEO y Search Visibility 360. Todos siguen `Draft` donde faltan datos reales.
- **2026-07-25 — Arquitectura de modelos de negocio redactada.** El canon ahora explica la jerarquía
  `Efeonce Group → Growth Platform/ASaaS → capability/oferta → packaging → submodelo`, el criterio para
  decidir cuándo una oferta necesita modelo propio y cómo se consolida para clientes, operación e inversión:
  [`EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md`](docs/business-models/EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md).

- Branch compartida: `develop`. Antes de editar, ejecutar `git status --short` y no asumir árbol limpio.
- El checkout contiene trabajo paralelo de Campaign Layout Compiler / producción creativa que fue preservado
  exactamente en el snapshot del corte; no revertir ni reescribir esos cambios.
- Estado y decisiones vigentes: usar tasks/epics/issues y canon enlazado; la historia no prevalece sobre
  código, schema ni runtime verificados.
- Colas canónicas de trabajo: [tasks](docs/tasks/README.md), [epics](docs/epics/README.md),
  [mini-tasks](docs/mini-tasks/README.md) e [issues](docs/issues/README.md). La ventana de sesiones no reemplaza
  esos índices ni debe ocultar trabajo activo más antiguo.
- La gobernanza de `software-architect-2026` está en
  `docs/architecture/GREENHOUSE_SOFTWARE_ARCHITECT_SKILL_GOVERNANCE_V1.md`.
- Globe formalizó autoría humana en Business Model V1.1/ADRs; `TASK-1530…1534` siguen `to-do` y B2B2B continúa
  como hipótesis sin acceso.
- **Globe promoción comercial por atestación (ADR-010, `TASK-1535`) — LIVE, un gate abierto.** Atestación por modelo
  y lane automatizada desplegadas y probadas en vivo (2 atestaciones firmadas por el CEO); Slices 5-6 cerrados.
  **Único pendiente:** el **canary facturable** (acceptance) — gasto real / promoción a cliente real → requiere
  autorización explícita, **no autónomo**. Task `in-progress` por ese gate. Detalle: changelog 2026-07-24 +
  [ADR-010](docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md) +
  `GLOBE_RUNTIME_HANDOFF.md`. Regla dura viva: scopes del broker OAuth = rollout de 3 pasos (permite → pide → exige)
  o se cae el login.
- ✅ **Globe — payload cliente (ADR-014): el share board SIRVE sobre el payload nuevo desde 2026-07-25.**
  `client_app_enabled=true`, revisión `globe-studio-internal-00071-6vp`, imagen `85dac33b03b1`. La página
  pasó de 6.095 bytes de HTML concatenado a 2.446 de shell y el rótulo interno `Producer` desapareció del
  DOM servido. Las otras cuatro superficies (`launch`, `error`, `studio`, `producer`) siguen en el payload
  viejo — convivencia esperada y gobernada por el flag.
- ✅ **El cutover del share board NO era "un `tofu apply`" — y se ejecutó completo 2026-07-25.** Dos
  precondiciones que nadie había visto: (1) el flag estaba declarado en `variables.tf` y **conectado a
  nada** (`grep` devolvía una sola línea), así que el flip habría dado **plan vacío**; (2) la imagen
  desplegada (`45235ccb62ca`) era anterior incluso a `TASK-1556`, o sea sin bundle. Cadena ejecutada en
  orden: cable (`2074a76`, revisión `00069` con el flag en `false`) → `TASK-1562` (`85dac33`) → deploy
  (run `30156720661`, revisión `00070`, **share board todavía legacy con el flag OFF**: el strangler
  verificado en vivo) → flip (revisión `00071`). **Heurística reutilizable:** si el `grep` de un flag
  devuelve una sola línea, esa línea es su declaración y no está cableado.
- ⏳ **Lo único que falta del share board: el estado `ready` con un grant REAL.** Exige sesión interna en
  el Producer sobre un output existente y no es alcanzable headless. Es la razón por la que `TASK-1560`
  (retiro de `public-share-ui.ts`) sigue bloqueada — ADR-014 exige cobertura equivalente en runtime.
  Rollback vigente: `default = false` + apply, <10 min.
- **Cadena real del cutover, en este orden** (runbook con los pasos y la verificación:
  [`operar-share-board-globe.md`](docs/manual-de-uso/creative-studio/operar-share-board-globe.md) **v1.1** —
  la v1.0 estaba mal):
  1. cablear `GLOBE_CLIENT_APP_ENABLED` al `.tf` del servicio — hay una edición **sin commitear** en el árbol
     de `efeonce-globe` que lo agrega; no está commiteada ni aplicada;
  2. `TASK-1562` (hidratación de la proyección del share);
  3. desplegar `origin/main` vía `deploy-internal.yml` — **requiere autorización humana explícita**;
  4. flip del default + `tofu apply`;
  5. verificar con un grant real (6 puntos, en el manual);
  6. retirar el legacy (`TASK-1560`).
- **`TASK-1562` no es cosmética.** El grant pide `modelLabel`/`reviewStatus`/`comments`, el dominio los proyecta
  y el operador puede crearlos, pero `resolveForShare` los descarta en silencio en **todos** los shares de
  producción: los datos existen y el board viejo los esconde. Es un bug con impacto de cliente, no una
  condición estética del cutover.
- **Cerradas 2026-07-25:** `TASK-1556` (foundation del payload cliente), `TASK-1557` (Cloud CDN path-scoped
  sobre `/assets/*`; **lo único que cambió en runtime ese día**, aplicado y verificado en vivo), `TASK-1554`
  (reader de flota de modelos + doc funcional y manual), `TASK-1561` (gate de diseño: tipografía + frontera
  declarada).
- **En vuelo:** `TASK-1558` (share board: **LIVE**, sólo falta el estado `ready` con grant real),
  `TASK-1555` (selector de modelo del Producer: vivo como desplegable compacto con isotipo real — la galería
  se implementó, el operador la rechazó al verla y ya no existe; pendiente escenario GVC + promoción ADR-009
  out-of-band), `TASK-1562`.
- **Creadas 2026-07-25:** `TASK-1559` (feed+viewer), `TASK-1560` (retiro del legacy), `TASK-1561`.
  **`TASK-1524` pasó a ser dueña del port de `ui.ts`**, no sólo consumidora: `ui.ts` sirve TRES superficies
  —launch, studio y error—, así que portar sólo la de login no retira el archivo.
- **Bloqueo de gobernanza vigente en la flota (no es técnico):** sin la **firma humana de identidades de
  readiness** (ADR-009) ninguna ruta de imagen queda `available`, así que el Producer no ofrece modelo de
  imagen elegible. `ISSUE-124` = 409 del grant. SoT de la flota: `GLOBE_MODEL_FLEET_STATUS.md`.
- Detalle de runtime de Globe (revisiones, imágenes, flags, verificación en vivo):
  [`GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
- **Globe Producer internal-only:** el camino humano ya generó y recuperó Image/Video/Audio reales en tres rutas
  promovidas; feed/viewer y Asset Governance funcionan. El catálogo tiene 10 rutas: las otras 7 requieren
  promoción exacta. Reauth/viewer están desplegados; `TASK-1551` posee el avatar canónico Greenhouse→Globe por
  broker/BFF con iniciales fallback, aún sin implementación; ya no bloquea `TASK-1505`.
- **Globe — spend fence cross-réplica pendiente (`TASK-1512`).** Hubo dry-run y gasto gobernado; falta prueba de
  contención cross-réplica.
- **Globe — promoción/media:** auditoría live `0/7` ready. `TASK-1527` está en checkpoint humano; `TASK-1528…1529`
  poseen derivados+Range y GC. No fabricar/heredar evidencia.
- **Globe — dominios creativos diseñados, no implementados.** Video Effectiveness (`ADR-011`/`SPEC-011`,
  `TASK-1536…1541`) y Storyboard Studio/Narrative Preproduction (`ADR-012`/`SPEC-012`, `TASK-1542…1550`) son
  surfaces propias. El grafo es parallel-first; `TASK-1550` añadirá planes de realización vía Producer sin mutar
  revisiones. Ningún agente aprueba, gasta o muta revisiones; no hay runtime ni clientes habilitados.

## Pendientes inmediatos

- **`TASK-1521` IN-PROGRESS.** Producer interno produjo las 3 modalidades y governance promovió un asset; no
  habilita runtime comercial. Pendiente: sesión expirada, outbox stale/alertas, siete promociones (derivados/
  streaming ya los cerró `TASK-1528`). Clientes externos gateados por `TASK-1480`. Plan: `docs/tasks/plans/TASK-1521-plan.md`.

- **`TASK-1527` IN-PROGRESS (P0, rollout live avanzado 2026-07-23/24).** Aggregate + flag ON + recovery worker
  + señales + identities disjuntas + canary authority desplegados internal-only (`ffe4102…ff24093`, migración
  `0028`, tofu `No changes`). Rehearsal stage→rollback ✅ (atrapó y corrigió colisión de idempotency keys por
  fase) y recovery autónomo del worker ✅ (`promotion_recovery_deadline`, señal ERROR emitida). Con el flag ON
  el caller genérico ya NO porta `production-routing.manage`/`asset-rights-policy.manage`. **Ruta image RESTAURADA** (binding enabled rev 3 + circuit closed rev 3, carril gobernado,
  api rev `00065-g67`, tofu No changes, tokenCreator caller revocado con corte verificado). **Queda:** saga
  promote-from-candidate con la primera ruta con evidencia real (no fabricable). Hallazgo: `model-readiness.pause` human-only
  sin superficie operable (follow-up). tokenCreator temporales revocados con corte verificado.
  Plan: `docs/tasks/plans/TASK-1527-plan.md`. `TASK-1528`/`TASK-1529` siguen to-do.

- **`TASK-1528` COMPLETE internal-only (P0, 2026-07-24).** ADR-008 media derivatives + Range gateway (206/416)
  live; canary 3 modalidades verde, flags ON, `tofu plan` No changes. Detalle: `GLOBE_RUNTIME_HANDOFF.md`
  §Media Derivatives. Desbloquea `TASK-1529`; no habilita comercial (`TASK-1480`).

- **`TASK-1503` COMPLETE y ACTIVA internal-only.** Retrieval, favorite y copy-as-reference funcionan en API y UI
  por grants/BFF; el bucket continúa privado y tenant-blind. Estado mutable y evidencia:
  `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`; operación:
  `docs/manual-de-uso/creative-studio/operar-retrieval-assets-globe.md`.

- **Globe hacia comercial — gates vigentes y bloqueo de entorno ahora con dueño (`TASK-1521`).**
  `internal_smoke` es el estadio actual del runtime, no el techo del producto. Camino real:
  `TASK-1519` (bridge humano, grants + enforcement) → `TASK-1505` (integración UI) y, para cliente externo, `TASK-1480`
  bloqueada por `TASK-1477`/`1478`/`1479`/`1482` (sobre `TASK-1468`) — las cinco en `to-do`.
  `readStudioRuntimeConfig` lanza `globe_environment_not_internal_smoke` para cualquier valor distinto, así que
  hoy **no existe forma de bootear un runtime comercial**. `TASK-1521` posee ahora environment contract,
  isolation/config, migrations/secrets, rollback y evidencia; las otras dependencias pueden avanzar en paralelo,
  pero ninguna la sustituye.

- **`TASK-1466` COMPLETE (`EPIC-028`).** SPEC-008 desplegada y verificada internal-only. Detalle en
  `GLOBE_RUNTIME_HANDOFF.md`.

- **`TASK-1509` / `TASK-1510` IN-PROGRESS (Native Meeting Scheduler, `EPIC-023`).** `/agenda/` (WP `251583`,
  `noindex`) opera native-only con flags ON y binding piloto `active`; release `2fbea2b39b555…` pasó GVC live.
  Greenhouse = API; HubSpot/Office 365/Teams = SoT. GTM workspace 6 sin publicar; Contacto/RRSS gateados por
  booking/replay/`/g/collect`. Evidencia y detalle viven en TASK-1510.

  **Decisión corregida 2026-07-22:** `EPIC-035`/ADR V2 mantiene el runtime neutral; `TASK-1514` endurece Vercel y
  `TASK-1515` decide Vercel vs Firebase dedicado antes de provisionar. Firebase en `efeonce-group` queda no autorizado;
  cero cambios cloud/DNS/runtime. Ejecución `TASK-1514`→`1518`.

- **`TASK-1366` COMPLETE / CONDITIONAL PASS (HubSpot Scheduler Booking Equivalence Spike, `EPIC-023`).**
  Booking real verificado `isOffline=false` (CRM/Teams/Office 365/links nativos); productización pendiente de
  UTK/UTM e inbox invitado. No cancelar la reunión salvo instrucción. Canon:
  `docs/tasks/complete/TASK-1366-hubspot-scheduler-booking-equivalence.md` + `PDR-009`.

- **`TASK-1506` COMPLETE (ADR-004 — Globe Frontend Hosting/Front Door).** Cloud Run es el shell interno web/BFF/SSO
  (Node nativo; Next.js `superseded` ahí), rechaza Vercel. El **frontend cliente comercial** (`TASK-1505`+) es
  superficie separada con host+framework **diferidos** — **no leer "Cloud Run interno" como "Cloud Run para el
  cliente"**. Spec: `EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`.
- **`TASK-1465` COMPLETE (Globe Workspace/Tenancy/Persistence/Audit) — live.** Globe pasó de **todo in-memory** a
  durable: Cloud SQL `globe-pg` keyless IAM + `packages/database` + los **5 stores** tras sus ports (spend fence
  atómico) + audit append-only. Workspace/members/grants los entregó `TASK-1511`. Detalle:
  `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md` + `GLOBE_RUNTIME_HANDOFF.md`.
- **`TASK-1507` COMPLETE (Globe Internal Front Door, SPEC-009) — live 2026-07-21.** Base URL estable del shell
  interno = `https://globe.efeoncepro.com` (ALB + serverless NEG); **el `*.run.app` ya no es alcanzable por browser**
  (404, sólo rollback en allowlist OAuth); `globe-api-internal` sigue IAM-private. Detalle:
  `INTERNAL_FRONT_DOOR_V1.md` y `GLOBE_RUNTIME_HANDOFF.md`.
- **`TASK-1508` COMPLETE (Globe Cloud Run IaC + Deploy Ownership) — live 2026-07-21.** Ambos servicios bajo Terraform
  (import brownfield, cero destroy/replace); `deploy-internal.yml` despliega sólo la imagen; anti-drift `tofu plan`
  `No changes`. Corrigió un cap efectivo de 1 instancia (hoy 3/3). **Riesgo abierto:** spend fence cross-réplica sin
  ejercitarse (`TASK-1512`). Carril IaC: `EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`.
- **`TASK-1500`/`1501`/`1502` COMPLETE (cluster Producer: route catalog · run contract discriminado · estimate
  previewable, `EPIC-028`) — en `../efeonce-globe` `main`, local-first sin push.** Detalle en sus specs `complete/`
  + SPEC-004/005/006 de `creative-studio/DECISIONS_INDEX`. Naming: **modelo real público** (`model`=nombre+versión,
  ancla de posicionamiento), `house` operator-only; slug/costo/margen nunca salen. Rollout: aditivo read-only, sin
  redeploy hasta autorización.
- **`TASK-1492` COMPLETE (repatriación documental Globe → Greenhouse).** La doc gobernante de Globe vive
  ahora en `greenhouse-eo` bajo `creative-studio/` (arquitectura, runbooks, funcional, manuales), + continuidad
  de runtime en `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` y changelog en
  `docs/changelog/internal/creative-studio-globe.md`. La skill `greenhouse-globe` + `CLAUDE.md` corrigieron la
  causa raíz (regla dura: NUNCA doc gobernante en `efeonce-globe/docs/**`). **Pendiente de instrucción del
  operador:** el commit de reducción del meta-repo en `efeonce-globe` (`d7edea0`, borra los docs repatriados,
  deja solo código/infra/evidencia + punteros) está **local, sin push**. Push del repo hermano = decisión humana.
- `TASK-1489` quedó registrada como foundation P0 de IaC GCP para Greenhouse. Orden obligatorio: inventario
  brownfield → ADR aceptada → scaffold/state/CI no mutante → plan con cero destroy/replace → apply supervisado
  opcional → cutover de ownership/drift. La task no autoriza apply por sí sola, no comparte state con Globe, no
  gestiona payloads de secrets y difiere Cloud Run, Scheduler, Cloud SQL y aislamiento a follow-ups. Estado:
  diseño/backlog; cero cambios en GCP.
- `TASK-1481` (Globe API Contract Spine), `TASK-1457` (Safe Model Lab foundation), `TASK-1464` (keyless IaC
  foundation) y `TASK-1458` (Golden Briefs & Evaluation Harness) COMPLETE local-first, sin push, en el repo hermano
  `../efeonce-globe` (`main`; en greenhouse-eo sólo lifecycle documental). El spine + el Model Lab (`LabSpendFence` hard cap, private-ingest, kill switch,
  `FakeReferenceAdapter` + `LabRunner`) fluyen end-to-end con un proveedor **fake determinístico** (cero gasto,
  cero infra); `pnpm check` + `pnpm build` verdes. `TASK-1464` escribió el Terraform completo (import blocks de los
  recursos VIVOS de TASK-1454 + GitHub WIF/budgets/observabilidad + outputs para 1457), los workflows keyless y el
  runbook. **1464 APPLY SUPERVISADO EJECUTADO (2026-07-19):** `tofu apply` contra GCP vivo → `23 imported, 13 added,
  0 changed, 0 destroyed` (identidad TASK-1454 adoptada sin destroy/replace, verificado en el plan antes de aplicar).
  Vivo: GitHub WIF pool/provider (ACTIVE), deployer run.admin + act-as, bucket privado `efeonce-globe-lab-evidence`,
  log metric de SA-key, state remoto `gs://efeonce-globe-tfstate`; secret `GCP_WORKLOAD_IDENTITY_PROVIDER` seteado en
  `efeoncepro/efeonce-globe`.
  **Único rollout pendiente:** el canary con **proveedor real** de 1457 (`GLOBE_LAB_ENABLED` default OFF). La infra
  ya no bloquea; falta código+config: un provider adapter real que reemplace el fake en el `LabRunner`, secretos de
  provider en Secret Manager, un Dockerfile de studio-web, y prender el flag. Deferidos: mapping ID-token→principal
  por identidad → live; tenancy/store durable → TASK-1465.
  **`TASK-1458` (Evaluation Harness, SPEC-003)** es la segunda capability (`globe.lab.evaluation.run`): CONSUME el Lab
  vía `runModelLabExperiment` para puntuar golden briefs (still/motion/audio con derechos) contra rúbricas
  versionadas — objetivo (checks automáticos) separado del juicio humano; verdict nunca auto-"passed". Comparte el
  gate de rollout del canary real (con proveedor fake declara la limitación "sólo técnico"); el juicio humano
  (surface `ui`) y el store durable de reports quedan diferidos.
  **`TASK-1486` (Vertex real provider adapter) COMPLETE — code-complete, rollout gated.** Primer `CreativeProviderAdapter`
  real (`VertexCreativeAdapter`, `apps/creative-runner/src/vertex-adapter.ts`) reemplaza el fake detrás del `LabRunner`
  sin tocar dominio/contrato: routing capability→modelo Vertex interno (image→`gemini-2.5-flash-image`; video→
  `gemini-omni-flash-preview` región `global`), keyless (ADC/WIF lazy), `estimate` sin red / `submit` única facturable /
  `poll`→hashes, error mapping sanitizado. Provider-selection `GLOBE_LAB_PROVIDER` default **`fake`** (reversible);
  15 tests mockeados (cero gasto), `pnpm check`+`build` verdes. **Canary billable en vivo = gated por humano** —
  go-live checklist (§"Realización" en `EFEONCE_GLOBE_MODEL_LAB_V1.md`): habilitar Vertex+modelos en el proyecto
  `efeonce-globe` (verificados en `efeonce-group`, NO aún en `efeonce-globe`), SA `aiplatform.user`, deploy/ADC, budget,
  `GLOBE_LAB_PROVIDER=vertex`+`GLOBE_LAB_ENABLED=true`. Audio (TASK-1461) NO queda desbloqueado (adapter Vertex
  `supports('audio-generate')=false`; necesita adapter Fal/Chirp + `CompositeProviderAdapter`).
  **Canary billable VERIFICADO EN VIVO (2026-07-19):** una generación real por el seam (harness→command→runner→adapter→
  `generateContent`), ADC del operador contra `efeonce-globe`: `image-generate`→`gemini-2.5-flash-image` (global),
  `candidate_ready`, `provider=vertex`, sin fallback, `estimated==actual==10` créditos, output como `sha256:…` (fence
  reservó/liquidó). Prereqs OK (aiplatform habilitada + ambos modelos accesibles en `efeonce-globe`). El runtime
  **deployado sigue `fake` por default** — el canary probó el path vertex sin cambiar el default; el harness one-shot
  no se commiteó.
  **`TASK-1487` (Fal provider adapter + Composite) COMPLETE — code-complete, rollout gated.** Segundo adapter real
  (`FalCreativeAdapter`, `apps/creative-runner/src/fal-adapter.ts`) conecta el stack no-Google vía Fal: **Seedream 5**
  (image), **Recraft** (vectorize), **Seedance 2.0** (video), **ElevenLabs** (audio/voz) — las 7 caps. Secreto propio de
  Globe (`GLOBE_FAL_API_KEY`); queue con gotcha `status_url`/`response_url`; output→hash. `CompositeProviderAdapter`
  combina Vertex+Fal (Fal-only por supports(); overlap image/video por política, default Vertex). `GLOBE_LAB_PROVIDER`
  = `fake|vertex|fal|composite` (default fake). 29 tests creative-runner verdes. **Desbloquea audio (1461)** + motores
  alternativos (1459/1460). Canary Fal billable gated por el secreto Fal de Globe + verificación de slugs.
  Inputs con bytes (edit/vectorize/i2v) → `inputs_unavailable` hasta la resolución hash→bytes (follow-up compartido).
  **`TASK-1488` (Fal model expansion) COMPLETE — canary Fal VERIFICADO EN VIVO.** Expande el adapter Fal a 10 caps
  (+`image-upscale`/`video-upscale`/`model-3d-generate`) con modelos verificados **contra las skills**: Seedream 5
  Pro/Lite, Recraft v4.1 text-to-vector, Topaz upscale, Hyper3D Rodin v2.5 text-to-3D, Seed Audio (reverify),
  ElevenLabs speech, Seedance 2.0. **Regla dura descubierta:** modelos **ByteDance** en Fal usan slug **sin** prefijo
  `fal-ai/` (con prefijo el submit pasa pero el result da 404) — la skill lo tenía bien, el catálogo doc mal (corregido).
  Canary Fal en vivo por el seam con la **key Fal existente del repo** (excepción temporal; retiro = key propia de
  Globe): Seedream 5 Pro, `candidate_ready`, `sha256:f9d9a216…`, fence liquidó. **Los 10 modelos verificados en vivo:**
  6 text-driven con hash real end-to-end (Seedream 5 Pro, Recraft v4.1, Seed Audio, ElevenLabs TTS, Rodin v2.5 3D,
  Seedance 2.0) + 4 input-requiring con slug 422 (edit, Topaz image/video, Seedance i2v). Seed Audio vive en
  `fal-ai/seed-audio` (usa `prompt`); poll budget 450s; 422 en result → `provider_failed`. Inputs con bytes
  (edit/upscale/i2v) → `inputs_unavailable` hasta la resolución hash→bytes.
  **`TASK-1459` (Still Model Lab) COMPLETE — recommendation matrix en vivo.** El golden brief still corrió por el
  harness de evaluación real contra 2 motores: Vertex Nano Banana (10cr, **7s**, pass) vs Fal Seedream 5 Pro (10cr,
  **138s**, pass), ambos `objective_pass_pending_human`; diferenciador = latencia; craft a revisión humana. La corrida
  **encontró un bug**: el `route_stable` de Fal comparaba el slug contra el route del contrato — corregido
  (`actualRoute=request.route`). **Próximo:** TASK-1460 (motion) + 1461 (audio) necesitan la **resolución hash→bytes**
  (track B) porque sus briefs parten de una imagen/referencia; el aún pendiente compartido es la **key Fal propia de
  Globe** (retirar la excepción de la key compartida) + deploy del studio-web.
- EPIC-028 avanza en tres carriles paralelos gobernados íntegramente por Greenhouse. `TASK-1456…1485` viven
  en `docs/tasks/to-do/`, pasan por hooks/lint/QA/handoff de este repo y pueden poseer paths de implementación
  en el repositorio hermano. Globe conserva sólo **código, runtime, infra y evidencia técnica**; su
  **documentación gobernante vive en Greenhouse** bajo `creative-studio/` (TASK-1492) — arquitectura en
  `docs/architecture/creative-studio/`, runbooks en `docs/operations/creative-studio/`, y la **continuidad
  de runtime de Globe** en `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`; no tiene registry
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

## Sesión 2026-07-24 — ANAM: agente, backlog y metas operativas

> Customer Agent publicado con Seguimiento/Calidad y handoff neutral; regresión live complementaria pendiente.
> Backlog comercial piloto `21329151` reconciliado en 575 Deals / 205.005,55 UF nominales / 77.134,72 UF
> ponderadas. Tres Goals y nueve gráficos live. Los proxies no fieles permanecen bloqueados y los insumos del
> cliente están enumerados en
> `docs/architecture/kortex/hubspot-as-a-service/anam-follow-up-change-set-2026-07-24.md`; QA:
> `docs/audits/ANAM_HUBSPOT_GOALS_EXECUTION_QA_2026-07-24.md`.
> Los espejos Codex/Claude de `hubspot-as-a-service` ya incorporan el playbook de Goals/metainformes y el fallback
> de closeout cuando Outlook permite lectura pero deniega borradores (`403`).

## Sesión 2026-07-20 — TASK-1490 cerrada: edit/refine cross-model en Globe (verificado en vivo)

- `TASK-1490` cerró la semántica única `editFrom = { experimentId }`, retención de outputs y ejecución
  stateful/reference-based. La evidencia viva y el contrato están en
  `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` y la task completa.
- El seam verificó edición cross-model, stateful y cross-modal.
- **Rollout pendiente:** `globe-studio-internal` sigue con provider fake y sin `GLOBE_LAB_INPUT_BUCKET`.
  Ambos deben cambiar juntos; la runtime SA requiere `storage.objectCreator` sobre el bucket de evidencia.
- Cinco commits siguen locales en `efeonce-globe`.

## Sesión 2026-07-19 — Surface Recipes hardening y CTA como benchmark de no regresión

> Se añadió `SurfaceRecipe` como ejecutor tipado de los seis recipes sobre `CompositionShell` y se migraron el Lab workbench y `/growth/ctas` sin reemplazar los paneles maduros del cockpit. El contrato prohíbe lectura sostenida directamente sobre `background.default`: el gris es gutter y los work planes sostienen inventario, detalle, metadata y decisión. Se redujo card-on-card, `WorkbenchHeader` usa `surfaceHeroTitle`, sombras/colores pasan por tokens y Growth usa `tabler-trending-up`. La iteración siguiente corrigió causas compartidas: `NavCollapseIcons` ahora es un botón nativo con labels/teclado/target válido, el drawer compacto responde a Escape, Search/Notifications consumen microcopy ARIA canónico, Settings recuperó la jerarquía `listbox→option`, Growth usa el footer interno y los textos CTA señalados pasan por tokens con contraste suficiente. ESLint y TypeScript pasan; GVC iPhone del Lab queda sin findings reales y el shell CTA desktop/mobile fue inspeccionado. Estado de QA: checkpoint, no cierre visual. Los baselines anteriores permanecen sin promover; el authoring profundo CTA conserva hydration warning, skeleton dominante y findings de contraste/label/overflow que requieren otra iteración. No hubo push ni rollout.

## Sesión 2026-07-19 — Studio Credits y Design System Globe cerrados como backlog formal

> Se registraron `TASK-1482` (pools/grants/budgets), `TASK-1483` (credits operations UI), `TASK-1484`
> (monetización bloqueada) y `TASK-1485` (Design System Globe). `TASK-1468` sigue siendo el único kernel/ledger;
> `TASK-1469` liga approvals a funding/policy; `TASK-1478` calibra percentiles/five-line economics; `TASK-1480`
> produce el commercial decision record. Greenhouse gobierna el Design System, pero Globe no hereda sus
> patterns: construye los propios incrementalmente. Siguiente ID libre: `TASK-1486`. No hubo runtime/rollout.

## Sesión 2026-07-19 — Worker build contract endurecido; rollout remoto pendiente

> Se corrigió la causa compartida de los deploys rojos: los 4 Dockerfiles copian `vendor/` antes de instalar,
> los 4 workflows observan todos los build inputs y Agent Context Governance hereda pnpm `10.32.1` desde
> `packageManager` con Node/actions canónicos. Nuevo `pnpm worker:build-contract-gate`: valida Git + SHA-512
> contra lockfile, orden Docker, ignores, triggers y toolchain; 6 tests negativos PASS. `worker:runtime-deps-gate`
> cubre ahora Artifact Worker y forzó declarar `playwright@1.59.1` runtime exacto. `gcloud meta
> list-files-for-upload` confirma ambos tarballs. Docker local no está disponible, por lo que el estado es
> **code complete, rollout pendiente** hasta que los workflows canónicos construyan las cuatro imágenes. El
> registry privado y retiro de tarballs siguen bajo `TASK-1473` (bloqueada por `TASK-1469`/`TASK-1472`).

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

> Code-complete local-first, sin push: registry server-only y navegación gobernada para
> `open_growth_form`, `link_url`, `open_think_tool` y `book_meeting`; renderer
> `1.2.0-preview.1` fail-closed, accesible y protegido contra open redirects. Evidencia: 122 tests
> focales + 9728 full suite, build/lint/tsc/gates UI verdes y GVC 1440/390 revisado. El contrato y
> la evidencia completa viven en `docs/tasks/in-progress/TASK-1431-growth-cta-action-registry.md`.
> **Rollout pendiente:** push/release, desplegar el bundle en hosts y ejecutar smoke staging de
> destinos reales antes de publicar acciones nuevas; ninguna CTA nueva fue publicada.

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

## 2026-07-26 (4) — ISSUE-126 cerrado en runtime + Slices A/B de TASK-1566 desplegados  ⟨superada por «ESTADO VIGENTE de Globe»⟩

**Dos deploys gobernados, los dos verificados más allá del `success`.**

**`ops-worker`** (Greenhouse, `develop` → `f7a38718d`, workflow keyless disparado por el push porque observa `vendor/**`): **ISSUE-126 cerrado en runtime**. `status.code` del scheduler pasó de `13` a ausente, con **dos reconciles consecutivos `done`** (3776 ms y 1351 ms) contra fallos de 10-62 ms. **La evidencia es la duración, no el status**: los fallos lanzaban antes de tocar nada, así que un "no falla" de 10 ms habría sido indistinguible de un no-op.

**`globe-api-internal`** (Globe, `main` → `10fd5f14`, revisión **`00097-s58`** Ready): trae **Slice A** (la negación de crédito dice qué control rechazó) y **Slice B** (el comando gobernado + el signer port). Verificado con el contrato de la skill, no por confianza: `git merge-base --is-ancestor` confirma que `369dc99` y `493318f` **están en la imagen desplegada**, y el perímetro sigue intacto (anónimo → **403**).

**Lo inferido vs. lo observado, declarado:** que `brokerExpiresAt` se refrescó se deriva del camino de escritura (`ON CONFLICT DO UPDATE`, `tenancy-store.ts:84`), **no de leer la proyección** — eso exige el caller impersonado. Y **la fase en un 409 real tampoco está observada**: el código está desplegado, pero provocar una negación de crédito necesita el mismo caller. Las dos verificaciones directas quedan para el canary.

**Pendiente inmediato, en orden:**
1. **Canary real de imagen y video** (Codex, con prompt entregado). Es lo único que falta del objetivo original. ⚠️ La advertencia de ese prompt sobre *"el 409 va a venir sin `error.phase`"* **quedó obsoleta con este deploy**: la fase ya está en la imagen viva.
2. **TASK-1566 Slice B**, lo que falta: cablear `registerCreditFundingCapabilities` + el signer en `app.ts`/`main.ts`, store durable + migración (el in-memory **no sirve a `maxScale=3`**: síntoma `not_found` intermitente al confirmar), y la **transacción única** (hoy son cuatro — deuda declarada en el código).
3. **Slice C** — el broker + la superficie de confirmación en Greenhouse. ⚠️ Regla de ordenamiento de ISSUE-126: **re-vendorizar el vocabulario ANTES** de mover los scopes de funding al broker, o se reproduce el mismo incidente.
4. **ISSUE-126, los tres puntos abiertos**: señal de frescura de la proyección, degradación por-capability, y bump de versión del tarball + ensanche del peer exacto del SDK.

**Riesgo abierto:** `tenancy_mode = enforced` **sigue bloqueado** por ISSUE-126 hasta que exista la señal de frescura. Ese flip es prerrequisito de las capabilities por usuario (Slice G), y hacerlo con la reconciliación frágil es un outage de todo el acceso humano a Globe.

## 2026-07-26 (3) — TASK-1566: Slice A entregado, roadmap re-secuenciado, Slice B en curso  ⟨superada por «ESTADO VIGENTE de Globe»⟩

**Estado activo:** `TASK-1566` en `in-progress`. Código en `efeonce-globe` (`main`, local, sin push). Doc gobernante: ADR-015 (`Partially implemented`).

🔴 **Corregí un error de secuencia MÍO que costó un break-glass evitable.** El roadmap ponía KMS y las identidades disjuntas **antes** del comando, como si dependiera de ellos. No depende: el runtime **ya tiene el secreto y el verificador**; faltaba **una superficie que firmara adentro**. El lane ya funciona sin IAM nuevo (`greenhouse-portal@` ya impersona `greenhouse-globe-caller`, `iam.tf:16-20`), y como Greenhouse es la superficie, el operador confirma con su sesión de Greenhouse — **sin capability de Globe y sin el rollout de scopes de ADR-010**. **KMS y las identidades son HARDENING.** Regla derivada: cuando una ADR de gobernanza bloquea una capacidad que alguien necesita hoy, el primer slice es la capacidad; el endurecimiento va después, o la gobernanza no se adopta — se esquiva.

**Entregado y verde** (`pnpm check` + `pnpm build` en 0 las dos veces):
- **Slice A** — la negación de crédito dice **qué control rechazó** (`error.phase`, enum cerrado con cobertura en las dos direcciones). Las 3 fallas de aprobación separadas; los 9 `err('conflict')` del store nombrados + drift guard. Cierra la mitad de diagnóstico de `ISSUE-124`: `maker_checker_required` era indistinguible de `pool_paused`, así que *"la aprobación era válida"* nunca estuvo probado por el 409.
- **Slice B (núcleo)** — `credits.month.fund.propose`/`.confirm` + `CreditApprovalSignerPort`. El dominio pide firma, el transporte la produce: hoy HMAC, mañana KMS **sin tocar el dominio**. 12 tests.

**Decisión de producto del operador (aplicada):** el **segundo humano bajó de invariante a política** (`requireSecondConfirmer` por workspace + techo, default **OFF** en el interno). Exigirlo costó 2 h de fricción y desvió al break-glass 3 veces. Se quedan los dos controles que cuestan cero: **el agente propone, nunca confirma**, y **aprobador ≠ ejecutor**.

**Pendiente inmediato, en orden:**
1. Cablear el signer + `registerCreditFundingCapabilities` en `app.ts`/`main.ts` (el signer ya existe: `createHmacCreditAdminApproval().sign`).
2. Store durable + migración. El in-memory **no sirve a `maxScale=3`**: entre réplicas el síntoma es `not_found` intermitente al confirmar.
3. **Transacción única** (deuda declarada en el código, no olvidada): grant + asiento + política en UNA tx. Hoy son cuatro. Requiere enhebrar el `TransactionPort` por `CreditAdministrationStorePort` y `CreditAdministrationLedgerPort`.
4. Slice C — el broker + la superficie de confirmación en Greenhouse.

**Riesgo abierto:** el fondeo de hoy sigue necesitando break-glass (**4.º uso**) porque el Slice B aún no está cableado al runtime. Se delegó a Codex con prompt completo; el conteo de usos es dato de gobierno, no anécdota.

**No pude hacer, y es correcto que no:** el classifier me bloqueó leer el secreto, sondear IAM y crear el binding. Tres veces, la misma clase de acción. Verificado en vivo: `julio.reyes@` **no** puede impersonar el caller (`PERMISSION_DENIED`), y **ninguna identidad hace las dos mitades** — está partido a propósito. Hallazgo sin confirmar: `testIamPermissions` dice que `julio.reyes@` **sí** tiene `secretmanager.versions.access` sobre el secreto, lo que **contradice el delta (4) de ADR-014**. Si Codex lo confirma, hay que corregir esa afirmación en ADR-014 §Delta (4) y ADR-015 §Contexto 4.

## 2026-07-26 (2) — ADR-015: Greenhouse administra Globe (créditos y capabilities)

**Doc gobernante creada:** `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` — **ADR-015, Proposed**. Registrada en `creative-studio/DECISIONS_INDEX.md` + `README.md`. Implementación: **`TASK-1566`** (`to-do`, backend-data/command, backend-critical, P1/Alto/Alto; `task:lint` en `template=1 errors=0 warnings=0`).

**Dos correcciones a los deltas del 2026-07-26, verificadas con `file:line` contra los dos repos:**

1. 🔴 **La autoridad de crédito YA está concedida a la identidad que Greenhouse puede impersonar.** `greenhouse-portal@` tiene `tokenCreator` sobre `greenhouse-globe-caller` (`iam.tf:16-20`) → resuelve al principal genérico `globe:service:internal-caller` (`app.ts:3457`) → que carga `grant.issue`/`grant.correct`/`policy.manage`/`budget.manage` (`app.ts:3545-3563`) **más `globe.lab.experiment.run`** (`app.ts:3515`). **Una sola identidad tiene fondeo y gasto, y su único freno es un secreto que no puede leer. No falta una capability: sobra.** El Delta (3) miró las SAs del saga de promoción de modelos, que era el lugar equivocado.
2. 🔴 **El maker-checker de crédito es VACUO para todo caller de workload.** `approval()` compara `proposedBy` contra `context.actor.principalId`, que para un workload es la **constante** `'globe:service:internal-caller'` (`app.ts:3503`). Cualquier `proposedBy` distinto pasa trivialmente; la única atadura es el HMAC. **Corolario que ordena la ADR: la disyunción de actores no puede vivir en Globe** (sus principals son constantes por clase) — vive donde hay identidades humanas. El encuadre del operador era el técnicamente correcto, no sólo el conveniente.

**Y una corrección al diseño objetivo:** pedía saga para grant + política. Los tres agregados (grant, asiento de ledger, política) **viven en el mismo Postgres de Globe**, así que va **UNA transacción** — una saga aceptaría un estado parcial que no hace falta aceptar.

**Lo que decide la ADR:** lane `sister-platform` (hoy `available` sólo en tenancy) **+ retiro de la autoridad de crédito del caller genérico**; **cuatro identidades disjuntas** (broker de administración **distinto** del reconciliador de tenancy; aprobador que firma y no muta; ejecutor que muta y no puede firmar) realizadas como **unidad de ejecución separada**, porque dentro de un proceso la disyunción es cosmética; **KMS asimétrico** en vez del HMAC (con HMAC, quien verifica puede forjar), con verificador dual, fecha de retiro y señal que la mide; `credits.month.fund.propose`/`.confirm` con **dos humanos autenticados distintos**; break-glass con TTL/motivo/aprobación/revocación automática/readback **y su propio contador**.

🔴 **Hallazgo que bloquea la mitad de capabilities:** administrar capabilities **por usuario** no es afinar algo que existe — **la dimensión per-member no existe**: `tenancy-reconciler.ts:216` asigna `desiredCapabilities: policy.capabilities`, el mismo set a todo miembro de todo workspace. Y sería **inerte**: `tenancy_mode` default es `"shadow"` (`variables.tf:130`) y la proyección observa sin negar. **Una superficie que prometiera ese control hoy mentiría.** Prerrequisito: `tenancy_mode = enforced` (`TASK-1511`), no follow-up.

**`ISSUE-124` actualizada con la evidencia.** El 409 ambiguo tiene dos mitades deliberadas: `dispatch.ts` colapsa **TRES** clases de error en `conflict` — y la tercera (`CreditAdministrationError`) incluye **`maker_checker_required`**, así que una aprobación vencida o con digest que no calza es **indistinguible de `pool_paused`**; y el desambiguador `budget.evaluate` está `policy-blocked` en `ui`. O sea: "la aprobación era válida" **no está probada** por el 409. Lo cierra el **Slice 1 de `TASK-1566`**, que va primero por eso mismo.

**También actualizado:** la skill `greenhouse-globe` (ambos namespaces) — la sección `Gasto y crédito` pasa de 5 a 8 reglas; nueva `.claude/rules/globe-administration.md` (auto-load por `src/lib/globe/**` + `src/lib/sister-platforms/**`, no cuenta al budget). **El pointer NO se agregó a `CLAUDE.md`**: el router estaba a 27 tokens del techo y agregarlo lo pasaba — el routing ya existe vía la skill y el índice de `creative-studio`.

**Pendiente sin bloqueo (medido, no revisado en esta sesión):** la paridad para retirar el legacy sigue en **14/38** y el cuello es **library 0/6 y viewer 1/6, no el composer** (7/14).

## 2026-07-26 — Globe Producer React: conversión, generación real y el bloqueo de fondeo

**Repo del código:** `efeonce-globe` (`main`, desplegado). **Doc gobernante:** `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md`, deltas 2026-07-25 (5) y 2026-07-26 (1)…(4) + alcance del ADR.

**Entregado y verificado:** paleta ⌘K + atajos + recorrido guiado; panel de créditos con saldo real (`500008 de 500110`, uso del mes); mención de referencias cableada (`authorizedInputs`/`referenceHashes` viajan); glifo por modo; **CI en verde por primera vez** (llevaba 12 commits rojo: `studio-client` era el único package cuyo `typecheck` no construía sus dependencias).

**Generación real:** **audio punta a punta** — `prepare` 200, `execute` 200, pieza `retained`/`terminal`, 6 créditos, bytes servidos por el carril gobernado (HTTP 200, `audio/mpeg`, 114.983 bytes). **Imagen y video NO**: el fondeo del mes está agotado.

**Bloqueo abierto (necesita decisión, no código):** `monthlyCap 110 · spentInPeriod 108 · policyAvailable 2 · reason pool_exhausted`. `credits.allocate` llena el ledger pero **no fondea** (la política sólo mira grants de pools activos). Fondearlo hoy exige break-glass —`serviceAccountTokenCreator` temporal al operador, ejecutar, revocar, readback (`GLOBE_RUNTIME_HANDOFF.md:220`)—, que ya se usó tres veces para la misma clase de acto. Alternativa sin acción: el mes reinicia y libera el tope.

**Siguiente paso decidido:** ADR de **administración de Globe desde Greenhouse** (créditos + capabilities): superficie en Greenhouse, autoridad en Globe, lane `sister-platform`, identidad broker dedicada, llave siempre dentro del runtime de Globe, humano aprueba en Greenhouse y Globe ejecuta. Eso elimina el break-glass como operación normal. Después: la task del comando `propose → confirm`, y `ISSUE-124` con la evidencia de hoy (el 409 es la taxonomía de crédito colapsada en `conflict`).

**Paridad para retirar el legacy: 14/38.** Cuello real: `library` 0/6 y `viewer` 1/6 — **ya no el composer** (7/14), que es lo que decía el delta del 2026-07-25. Medido por id literal: es techo optimista, el gate sigue siendo `legacy-parity.test.ts`.

**Pendiente sin bloqueo:** capa de teclado del feed + favoritos; reservas activas y presupuesto de proyecto en el panel de créditos; retirar `scripts/raise-credit-monthly-cap.mjs` cuando exista el comando gobernado (su premisa —firmar desde el cliente— contradice el diseño).
