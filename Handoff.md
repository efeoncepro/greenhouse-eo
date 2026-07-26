# Handoff activo

> Cabina de mando para continuidad inmediata. No es changelog, arquitectura ni memoria completa.
> Ventana máxima: 20 sesiones. Historia íntegra e índice: [Handoff.archive.md](Handoff.archive.md).

## 2026-07-26 — Postulaciones de partners de IA generativa

Se consolidó el registro auditable en [`docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md`](docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md).
Quedaron confirmadas las postulaciones a **FLUX Creator Program**, **Runway Enterprise** y **ElevenLabs Commercial Partner**. **BytePlus Partner Network** está rellenado hasta reCAPTCHA; **AWS** requiere documento/selfie; **Salesforce** requiere crear/verificar el usuario; **Google Cloud** ya tiene una cuenta partner existente asociada a `efeonce.org` y requiere recuperar el perfil, no duplicarlo. Runway Creative Partners devolvió 504, por lo que se usó la vía enterprise.

**Siguiente acción humana:** completar los captchas/verificaciones y los pasos de identidad/acceso descritos en el audit antes de declarar cualquier programa como aprobado.

Las skills `efeonce-business-model-operator` y `efeonce-customer-model-operator` (Codex y companions de Claude) ya
incorporan la clasificación y los gates para evaluar partners/providers; el estado concreto sigue viviendo en el audit.

## 2026-07-26 — ESTADO VIGENTE de Globe (consolida el hilo del día; las entradas de abajo son narrativa superada)

> **Leer sólo esta para saber dónde está Globe.** Abajo hay 6 entradas del mismo hilo de hoy, escritas por dos
> agentes con convenciones de inserción distintas (una prepende, la otra ancló al vecino temático), y **se
> contradicen leídas de arriba hacia abajo**: una dice "fondeo bloqueado, no hubo grant" y otra "fondeo aplicado,
> grant 400 posted". Las dos fueron ciertas en su momento. **Esta entrada gana.**

**Resuelto y verificado hoy:**

- **Fondeo del mes: LISTO.** Grant `400` `posted`, `monthlyCap=400`, `policyAvailable=402`; `budget.evaluate`
  permite imagen `10` y video `16`. Sin `credits.allocate` (que no fondea) y sin SQL.
- **`ISSUE-126` — sangrado cerrado y verificado en runtime.** La reconciliación de tenancy llevaba 2 días fallando
  cada 5 min con su scheduler en `ENABLED` (`globe_tenancy_capability_invalid`: tarball `file:` vendorizado con 51
  capabilities vs 65 vivas, drift disparado por el rollout de scopes de ADR-010). Re-vendorizado + guard probado en
  rojo + `ops-worker` desplegado ⇒ dos reconciles consecutivos `done` (3776 ms y 1351 ms) contra fallos de 10-62 ms.
  **La proyección quedó verificada DIRECTAMENTE** (`brokerState=active`, `brokerExpiresAt=2026-07-26T11:42:00Z`,
  versión 4) — eso cierra lo que estaba declarado como inferido.
- **`globe-api-internal` en revisión `00097-s58`** (imagen `10fd5f14`, ancestría verificada, perímetro anónimo → 403):
  trae la **fase de negación de crédito** (TASK-1566 Slice A) y el **comando gobernado + signer port** (Slice B).

**Delta 2026-07-26 (b) — CAPA 8: la causa del bloqueo, encontrada LEYENDO (commit `4eee1cc`, sin desplegar).**
Se hizo la lectura que pedía la capa 7 y apareció la causa sin gastar un deploy. **`Key visual` no es una credencial:**
el prompt del canary de imagen (`producer-ui-canary-lib.mjs:10`) empieza con `'Key visual editorial para Efeonce
Globe: ...'`, y el sanitizador marcaba como credencial **cualquier** string que empezara con `Key `/`Bearer ` (la regla
era `^(?:Bearer|Key)\s+`, prefijo y nada más). **Ese falso positivo era todo el bloqueo del `execute`**, y explica la
capa 7: llegaba etiquetado `endpoint_url_not_permitted`, que mandaba a revisar un endpoint que nunca estuvo involucrado.
**Dos hipótesis murieron leyendo, no desplegando:** (a) los cuatro sospechosos de la capa 7 asumían `placeholder(input)`,
y el `buildBody` de `text-to-image` **no lo llama** — su body son cuatro escalares; (b) un `vertexProject` vacío habría
roto el regex de vertex en el **constructor** (valida las 12 entries, no 3) y bloqueado toda ruta, pero
`GLOBE_LAB_VERTEX_PROJECT` está sin setear → default `'efeonce-globe'`. **El fix es al control, NO al prompt**: una
credencial es un token opaco, no una frase, así que ahora se exige token único sin espacios anclado al final (`Bearer
eyJ…` y `Key <id>:<secret>` siguen atrapados; la prosa no). Cambiar el prompt habría desbloqueado el canary
**escondiendo** el bug para el próximo usuario real que escriba el término estándar del oficio.
**Capa 8b — el patrón otra vez adentro del propio fix:** `globe.production_route.compilation_failed` nombraba la clase
y **tiraba la razón**; ya emite `reason` (enum cerrado, sin `message`/`stack`).
🔴 **Pendiente: desplegar `324be6b` + `4eee1cc` y correr el canary con gasto real.** Gates verdes (`pnpm check` +
`pnpm build` exit=0). Revisión viva sigue siendo **`00100-drb`**.

**Delta final del canary — SIETE capas, y la séptima corrige a la sexta (`ISSUE-127`).** Corrido **4 veces con gasto real, CERO créditos perdidos** (el fence liberó cada reserva). **No generó.** Bloqueo vigente **acotado con precisión**: el `execute` de imagen (`ref/still/rrss-v1` → `fal.seedream.text-to-image`) lo rechaza el **sanitizador del body snapshot**, NO la config del endpoint — las tres entries del allowlist pasan sus aserciones, verificado leyéndolas. Sospechosos por cómo `buildBody` arma referencias con `placeholder(input)`: `snapshot_body_inline_data_uri`, `snapshot_body_too_large` (>256 KB), `snapshot_body_binary_key`, `snapshot_body_credential_like`.
🔴 **El próximo paso NO es otro deploy.** Es leer `buildBody` de `fal.seedream.text-to-image` (`governed-production-composition.ts:205`) contra los 12 chequeos de `safeSnapshotBody` (`production-route-composition.ts:133-167`). Revisión viva: **`00100-drb`**; el fix de etiquetado (`324be6b`) está **commiteado y SIN desplegar** — desplegarlo sólo mejora el label del próximo intento, no desbloquea.
🔴 **Error propio a registrar (capa 7):** etiqueté las 28 razones con heurística y usé `endpoint_url_not_permitted` como bucket por defecto; 12 de esos sitios son del **body snapshot**, no de URL, así que **el label me mandó a mí mismo a leer la config equivocada**. Corregido a `snapshot_body_*`. **Un bucket por defecto que abarca 17 sitios no es una razón nombrada: es una razón inventada.**

**Delta del canary — 6 fixes de observabilidad, y el sexto explica los cinco anteriores (`ISSUE-127`).** Corrido 4 veces con gasto real, **cero créditos perdidos** (el fence liberó cada reserva, `spentCredits=0`). Cadena: `runner_error` mudo → instrumentado (`00098-45x`) → destapó `ProductionRouteDependencyError` con `reasonShape=absent` → 28 sitios de throw pasan a **12 razones nombradas** (`00099-t89`) → el canary reportó **`route_compilation_failed`**, el catch-all, **con las razones ya desplegadas**.
🔴 **Y ahí está la causa raíz, encontrada LEYENDO el compile en vez de persiguiéndolo con otro deploy** (decisión del operador, y fue la correcta): `deny()` lanza `ProductionRouteDeniedError`, que el catch **sí** re-lanza — pero `#requests.compile` y `assertCompiledProviderRequest` lanzan **`ProductionRouteDependencyError`**, que el catch **no** contemplaba, así que caía en el catch-all y **le reemplazaba la razón**. Las 12 razones existían y **ese catch las destruía** justo en los dos caminos que más importan. Cerrado con un `instanceof` re-throw (`40ed85a`, desplegando).
**Lección de método, y vale más que los seis fixes:** perseguir un error por deploy encuentra síntomas en serie; leer el camino completo encuentra el que los explica. Cinco capas se arreglaron a un deploy por capa; la sexta se vio en treinta líneas.
**Tres huecos del canary, encontrados usándolo** (no leyéndolo): descartaba el `failureReason` que el reader acababa de entregar (**arreglado**); `GLOBE_CANARY_RUN_LABEL` se exige en la rama `--execute` y no arriba del archivo, así que el dry-run pasa y el execute muere (**abierto**); y el dry-run reporta `withinHardCap` pero **no `withinDayCap`**, que es la señal que de verdad decide (**abierto**).

**Bloqueo vigente — el canary, y ya no es por créditos ni por tenancy:** el `execute` de imagen terminó
`state=failed`, `failureReason=runner_error`, `spentCredits=0`, reserva de 10 liberada, cero output (experimento
`64a32bfd-d46f-4724-b8a0-8e6db5d0db78`). Video no se ejecutó, correctamente, para no gastar a ciegas.
**Y la ventana de logs del API estaba VACÍA.** Arreglado en `efeonce-globe` (`adebdb0`, local sin desplegar): el
fallo no-clasificable ahora se reporta al servidor por un port inyectado, con `reasonShape` distinguiendo "el
adapter no puso `reason`" de "puso uno malformado" — sin filtrar `message`, `stack` ni body. **El próximo canary sí
va a dejar rastro; hace falta desplegar el API para que aplique.**

🔴 **Corrección de seguridad a lo que dice la entrada de abajo:** el corte del break-glass **NO** falla porque
`roles/owner` confiera impersonación. `julio.reyes@efeonce.org` tiene `roles/owner` en `efeonce-globe` **y aun así
`iam.serviceAccounts.getAccessToken` fue DENEGADO** — verificado dos veces hoy. Owner no confiere ese permiso; lo
que confiere es `setIamPolicy`, o sea la capacidad de **auto-otorgarse** el binding. La diferencia cambia la
conclusión: **el corte SÍ sirve** — retira el permiso permanente, y cualquier re-otorgamiento es un cambio de IAM
nuevo, logueado y atribuible. El control es **detección y atribución**, no prevención. Es el mismo patrón que el
maker-checker de ADR-015: cuando el aprobador es el dueño, la prevención se cambia por detección.
**Anomalía sin resolver:** el binding se aplicó, Owner existe, y `getAccessToken` igual falló tras 5 reintentos.
Si hay una deny policy o restricción de organización activa, **es buena noticia** — es la aplicación real del "la
llave nunca sale del runtime". Verificarlo antes de asumir propagación.

**Pendiente inmediato, en orden:**
1. **Desplegar `globe-api-internal`** con `adebdb0` (observabilidad del runner) y repetir el canary. Sin eso el
   próximo `runner_error` vuelve a ser mudo.
2. **TASK-1566 Slice B**, lo que falta: cablear `registerCreditFundingCapabilities` + el signer en `app.ts`/`main.ts`
   (hoy los comandos existen en el dominio pero **no están registrados**: despacharlos da `capability_not_found`),
   store durable + migración (el in-memory **no sirve a `maxScale=3`**), y la **transacción única** (hoy son cuatro).
3. **`ISSUE-126`, los tres puntos abiertos**: señal de frescura de la proyección, degradación por-capability, y bump
   de versión del tarball + ensanche del peer exacto del SDK.
4. **Slice C** — broker + superficie de confirmación en Greenhouse. ⚠️ Re-vendorizar el vocabulario **ANTES** de
   mover los scopes de funding al broker, o se reproduce `ISSUE-126`.

**Riesgo abierto:** `tenancy_mode = enforced` **sigue bloqueado** hasta que exista la señal de frescura. Ese flip es
prerrequisito de las capabilities por usuario (ADR-015 Slice G), y hacerlo con la reconciliación frágil es un outage
de todo el acceso humano a Globe.

**Patrón que se confirmó tres veces hoy y vale más que cualquiera de los tres fixes:** el bloqueo real fue siempre
*una causa accionable escondida detrás de un código genérico* — `409 conflict` (arreglado), `authentication_required`
(clase de credencial vs `--include-email` vs audiencia) y `runner_error` (arreglado). Es el mismo defecto de
observabilidad en tres dominios distintos.

## 2026-07-26 — Canary real Globe: bloqueado en runner y corte IAM incompleto  ⟨superada por la entrada de arriba⟩

El dry-run autenticado con el caller quedó `ready=true`: `globe.tenancy.workspace.get` mostró proyección fresca
(`brokerExpiresAt=2026-07-26T11:42:00.878Z`, versión 4), y los estimados fueron imagen `10` y video `16`, ambos
`withinHardCap=true`. El canary de imagen sí ejecutó `prepare`/`execute`, pero el run
`64a32bfd-d46f-4724-b8a0-8e6db5d0db78` terminó `state=failed`, `failureReason=runner_error`, `spentCredits=0`;
la reserva de 10 fue liberada y no se produjo output. Video no se ejecutó para evitar gasto a ciegas.

La evidencia de logs alrededor de `11:32:51Z` muestra `globe_tenancy_shadow_drift` y el worker
`globe-producer-worker` terminó con `claimed=0`; queda bloqueado el diagnóstico del runner antes de reintentar.
El binding break-glass específico fue revocado y la policy del service account ya no contiene al usuario. La prueba
de corte global no pasó porque `julio.reyes@efeonce.org` conserva `roles/owner` a nivel de proyecto `efeonce-globe`,
que sigue permitiendo impersonación; no se retiró ese acceso permanente sin autorización separada. Estado:
`operativamente bloqueado`; no mover TASK-1566.

## 2026-07-26 — CLI local multi-proyecto para Globe

`gcloud` conserva `default` activo con `julio.reyes@efeonce.org` / `efeonce-group` y tiene la
configuración nombrada `globe` para la misma cuenta / `efeonce-globe`. Preferir
`gcloud --configuration=globe ... --project=efeonce-globe`; activar perfiles no concede IAM ni cambia
la postura runtime. Si se activa `globe` interactivamente, restaurar `default` al cerrar el acto.
La fuente operativa es [`GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md#cli-local-multi-proyecto).

## 2026-07-26 — Acto operativo Globe: fondeo bloqueado y break-glass revocado  ⟨superada por «ESTADO VIGENTE de Globe»⟩

Se intentó fondear el mes del workspace interno `greenhouse-org:efeonce` para habilitar generación real de imagen
y video. El dry-run previo confirmó pool activo y plan `CAP=400`/`GRANT=400`, pero no se ejecutó ninguna mutación:
la cuenta humana pudo leer `globe-credit-approval-secret` (`exit 0`, valor nunca impreso), mientras la impersonación
de `greenhouse-globe-caller@efeonce-globe.iam.gserviceaccount.com` siguió devolviendo
`iam.serviceAccounts.getAccessToken` denegado aun con el binding exacto aplicado y tras cinco reintentos.

El binding break-glass se eliminó y el corte se verificó con un intento posterior de impersonación fallido. No hubo
grant, cambio de política, `credits.allocate`, generación de imagen ni generación de video. La revisión viva del API
era `globe-api-internal-00096-99x`, imagen `48de228e7106`. Este fue el cuarto intento de esta clase: queda como
`operativamente bloqueado`; no mover TASK-1566 ni sus slices.

## 2026-07-26 — Acto operativo Globe: fondeo aplicado; generación pendiente por tenancy stale  ⟨superada por «ESTADO VIGENTE de Globe»⟩

Después del bloqueo de impersonación humana se ejecutó el acto legacy separando identidades: `greenhouse-portal@`
emitió el ID token del caller y `julio.reyes@efeonce.org` leyó/firma el secreto, sin imprimirlo. Resultado: grant
`400` `posted`, `monthlyCap=400`, `policyAvailable=402`, `effectiveAvailable=402`; `budget.evaluate` permite
imagen `10` y video `16`. No se usó `credits.allocate`.

El criterio final todavía **no está cumplido**: el canary de imagen/video se detiene antes de `prepare` porque la
proyección de tenancy del workspace está stale (`brokerExpiresAt=2026-07-24T13:17:00Z`). No se saltó el guard ni se
crearon runs parciales. El siguiente paso es renovar la proyección mediante el broker Greenhouse y repetir el canary
punta a punta; el checkout de `efeonce-globe` tiene cambios paralelos de TASK-1566 y no se modificó.

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
