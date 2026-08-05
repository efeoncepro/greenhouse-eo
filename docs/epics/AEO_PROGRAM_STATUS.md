# Programa AEO / AI Visibility — Estado y Qué Sigue

> **Tipo de documento:** Estado de programa + roadmap operativo (SSOT de "dónde estamos / qué sigue")
> **Versión:** 1.2
> **Creado:** 2026-07-16 por Claude (auditoría multi-agente del programa AEO)
> **Última actualización:** 2026-08-05 por Claude (Delta (b): reconciliación del registro — 27 childs huérfanas + correcciones de estado)
> **Documentación técnica:** [`../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`](../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
> **Epics que agrupa:** EPIC-020, EPIC-021, EPIC-022, EPIC-023, EPIC-024

Este documento existe para no volver a perder visibilidad de un programa que está repartido en **5 epics + tasks sueltas + 2 repos (greenhouse-eo y efeonce-think) + blockers de config multi-runtime**. Si quieres saber "qué sigue ahora", empieza acá. El detalle por epic vive en cada spec; este doc es el mapa.

---

## Veredicto en una línea

**El motor está terminado y en producción. La cara pública también está encendida y el cockpit del operador ya está construido. Lo que falta es evidencia de que el loop cierra, y 10 childs abiertas que el registro del epic nunca contó.**

> ⚠️ **Leer el Delta 2026-08-05 (b) al final ANTES de actuar sobre las §2, §4 y §5.** Ese delta corrige tres cosas que las secciones de abajo declaran mal: (1) `TASK-1276` está `complete`, no `to-do` — el "gap #1" ya no existe; (2) la entrada pública self-serve **está live** en `think.efeoncepro.com/brand-visibility`, verificada en runtime; (3) el conteo "12/13 childs" de EPIC-020 era una ficción contable — el alcance real declarado son **49 childs, 17 abiertas**. Las §2–§5 describen el snapshot del 2026-07-16 y se conservan como historia, no como estado.

---

## 1. Qué YA está live (no reconstruir)

- **Motor brand-aware en producción.** `EPIC-021` `complete` (2026-06-30, flags ON en prod y staging). Eliminó el falso-0 (caso Sky Airlines = 0): mide cualquier marca por su **categoría canónica + modelo de negocio real**, no solo el ICP de agencias. 7 dimensiones ponderadas, 5 providers (OpenAI / Anthropic / Perplexity / Gemini / Google AI Overview vía DataForSEO), 3 ejes de probes (answer-engine + site-readiness + entity: Knowledge Graph / Wikidata / Reddit).
- **Full API Parity de 3 consumers cerrada a nivel backend.** Un solo `buildGraderReport`; carriles público / cliente / operador-admin, todos gateados.
- **Runs async corriendo en prod** (`ops-worker` + Cloud Scheduler `ops-growth-grader-drain`) + re-grade recurrente.
- **Render del informe por token, live:** `think.efeoncepro.com/brand-visibility/r/<token>` (headless, `noindex`) + email transaccional ya apuntando a esa URL.
- **Landing de servicio `/aeo-2/`** publicada en WordPress → captura comercial a HubSpot.
- **Radiografía AEO** (muestra de venta viva) publicada — caso SKY, en `think.efeoncepro.com/muestras/…`.
- **Entitlement per-ORG** vía `greenhouse_client_portal.module_assignments` (módulo `ai_visibility_v1`, tiers `contracted`/`pilot`/`trial` con allowance mensual). Modelo bien construido.
- **UI cliente `/aeo`** (workbench por tier) construida — pero deep-link, ver §2.
- **Stack de flags AEO ON en producción** (verificado runtime 2026-07-16, no ledger): en Vercel prod `GRADER`/`OPERATOR_SEND`/`PORTAL_RUN`/`TRIAL`/`PUBLIC_INTAKE`/`LEAD_HANDOFF`/`REPORT_EMAIL` = `true`; en el `ops-worker` (rev. activa) los de write = `true`. El freno de las features no son los flags, es el rollout de superficie/binding (ver §2-§3).

---

## 2. Las tres brechas reales

### A. Que el CLIENTE lo VEA (visibilidad-para-cliente)

| Qué | Estado | Falta |
|---|---|---|
| UI cliente `/aeo` | Construida (TASK-1248 `complete`) | Es **deep-link, no está en el menú** — diferido en el reachability manifest "hasta que exista el monitor recurrente". El cliente no la encuentra navegando. |
| Binding de datos | — | Poblar `grader_profiles.organization_id` para que un cliente real vea su reporte. |
| Run self-serve del cliente (PLG) | Flags `PORTAL_RUN` / `TRIAL` **ON en Vercel prod** (verificado 2026-07-16) | Los flags NO son el freno. Falta el binding `organization_id` + entitlement per-ORG para que el botón aparezca a un cliente real. |
| Tiering + trial PLG | **En mockup**, no runtime | Teaser / Locked / upsell no shippeados como productivos. |
| Monitoreo recurrente + Plan AEO status | Re-grade paused en prod; TASK-1275 sin UI | El cliente contratado no ve avance de su plan mes a mes. |

### B. OPERARLO desde el portal (operabilidad interna) — **gap #1**

- **`TASK-1276` (cockpit operador `/growth/aeo` + facet "AEO" en Account 360) está `to-do`, no construida.** Sin ella el operador no puede, desde el portal: ver runs cross-cliente, correr el motor sobre un prospecto, ver la brecha competitiva, registrar el estado del Plan AEO, ni disparar "enviar informe + abrir oportunidad" con UI.
- Lo único interno que existe es `/admin/growth/ai-visibility`, que es **solo la cola de revisión pre-publicación** (gate humano YMYL), no un cockpit.
- **Su backend ya está completo:** readers scoped (`TASK-1287`), command de cross-sell (`TASK-1279`), status de recomendaciones (`TASK-1275`), `operator-run` — todos `complete`. **TASK-1276 es trabajo UI puro cableando cosas que ya existen**, y sus 3 dependencias están cerradas → desbloqueada.

### C. Herramienta de VENTA (cara pública + loop comercial)

- **No existe una entrada pública self-serve LIVE.** Un prospecto puede *ver* un informe si le mandas un token, pero **no hay puerta pública donde meta su dominio solo y reciba un score**. Las dos candidatas están code-complete sin encender: `/aeo-2/` auto-grader (`TASK-1321`, `in-progress`, el grader no está desplegado ahí) y la landing `think/brand-visibility` (`TASK-1327`, sin deploy). Hoy `/aeo-2/` promete diagnóstico y entrega lead comercial, no score automático → **0 tráfico self-serve real.**
- **Radiografía AEO: un solo caso (SKY) y payload 100% manual.** No hay pipeline Greenhouse→Radiografía; el JSON se escribe a mano en el repo `efeonce-think`. Por diseño no captura leads. Falta un segundo caso real y, si se quiere como activo de captación, una versión genérica indexable.
- **Cero casos citables / un solo cliente.** Solo Grupo Berel está contratado; ningún trial PLG provisionado. Sin volumen no hay proof social.

---

## 3. Config — verificado en runtime 2026-07-16: los "blockers" estaban stale

> **Los tres items que un audit doc-based reportó como blockers ya están resueltos en runtime.** El ledger/docs estaban desactualizados. Verificación en vivo:

1. 🟢 **Property HubSpot `aeo_check_result` — EXISTE** (verificado live 2026-07-16 en el portal `48713323`, objeto companies). Además existe el set completo `ai_visibility_score`, `ai_visibility_score_version`, `ai_visibility_primary_gap`, `ai_visibility_report_url`, `ai_visibility_recommended_motion`, `ai_visibility_last_run_at`, `ai_visibility_competitors_detected`. El doc previo decía "ausente al 2026-06-29" — stale. El write del handoff no está bloqueado por falta de property.
2. 🟢 **Flags AEO — ya están ON en prod (verificado runtime 2026-07-16); el ledger estaba desactualizado.** Verificación en vivo: Vercel Production tiene `GRADER`, `OPERATOR_SEND`, `PORTAL_RUN`, `TRIAL`, `PUBLIC_INTAKE`, `LEAD_HANDOFF`, `REPORT_EMAIL` = todos `true`; ops-worker (revisión activa `00490`) tiene `OPERATOR_SEND`/`GRADER`/`LEAD_HANDOFF`/`REPORT_EMAIL` = `true` (los request-path `PORTAL_RUN`/`TRIAL`/`PUBLIC_INTAKE` se leen en Vercel, correcto que no estén en el worker). El ledger afirmaba que `OPERATOR_SEND` estaba ausente en Vercel — falso, está presente y `true` en los 3 environments. **Acción restante: solo actualizar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` para que refleje el runtime real** — no hay flag que prender. Higiene: los flags son multi-runtime; la verdad es `vercel env ls`/`env pull` + revisión activa del `ops-worker`, nunca el ledger.
3. 🟢/🟡 **DataForSEO AIO — credenciales presentes en la revisión activa del ops-worker** (`00490`, verificado 2026-07-16): `DATAFORSEO_API_LOGIN` + `DATAFORSEO_API_PASSWORD_SECRET_REF` seteados. La causa que el doc citaba (`missing_secret` por login ausente) es stale. **Pendiente menor:** confirmar con un run real que el secret resuelve (grant `secretAccessor`) y que AIO devuelve data — `TASK-1341` sigue `to-do` como guard, pero el síntoma reportado no aplica a la revisión viva.
4. 🟠 **Rollout de la entrada pública (`TASK-1246`, único freno formal de EPIC-020):** sign-off legal de consent + secret Turnstile + resolver la decisión de ADR abierta (¿la cara pública se embebe con `<greenhouse-form>` o se hace en el repo público?) + smoke `form→run→status→report→email`.

---

## 4. Estado por EPIC

| EPIC | Título | Lifecycle | Lectura |
|---|---|---|---|
| **EPIC-020** | Public AI Visibility Lead Magnet Program | `to-do` (spec) · ~~12/13~~ → **49 childs reales: 32 `complete`, 17 abiertas** (reconciliado 2026-08-05) | El "12/13" contaba sólo el denominador original. Cara pública **live**; falta el smoke E2E + 17 childs abiertas. Ver Delta (b). |
| **EPIC-021** | AEO Brand-Aware Prompt Generation Engine | ✅ `complete` (2026-06-30) | Motor brand-aware live. Follow-up: UI de review del operador (no bloquea). |
| **EPIC-022** | Growth SEO Module (Search Visibility 360) | 🚧 en ejecución (2026-08-05) · **2/21 childs `complete`** | Arrancó: `TASK-1299` (schema) + `TASK-1301` (capabilities + entitlement per-org + chokepoint) `complete`, migraciones aplicadas. Prioridad **MCP-first** (operar por MCP antes que UI); `TASK-1645` nueva (parity/MCP, P1); destino Wave declarado. Ver Delta 2026-08-05 al final. |
| **EPIC-023** | Growth CTA & Popup CRO Engine | `to-do` | Adyacente. Vertical-slice ancla = follow-up CTA del reporte AI Visibility en Think. No arrancado. |
| **EPIC-024** | HubSpot Portal Grader | `to-do` | Segundo lead magnet (motor en Kortex). No arrancado; childs desde `TASK-1353`. Fase 2 (OAuth) depende del cutover prod de Kortex. |

---

## 5. Inventario de tasks abiertas del programa (lifecycle real por carpeta)

> Verificado 2026-07-16. La carpeta manda sobre el texto de cabecera.

### `in-progress`

| Task | Título | Faceta | Qué desbloquea / bloquea |
|---|---|---|---|
| `TASK-1246` | (H) Public Launch Readiness + Rollout | Venta pública | **Único freno formal de EPIC-020.** Legal consent + Turnstile + flags + smoke + release. |
| `TASK-1321` | `/aeo-2/` submit auto-runs grader + emails report | Venta pública | Candidato #1 para cerrar la entrada self-serve. El grader aún no está desplegado en esa ruta. |
| `TASK-1327` | Public lead magnet landing form embed (Think) | Venta pública | Candidato #2 (landing `brand-visibility`). Sin deploy. |
| `TASK-1251` | Growth Forms ↔ Grader convergence | Venta pública | Converge el intake sobre el motor Growth Forms (wiring del self-serve). |
| `TASK-1270` | Recurring SoV + scheduled re-grade | Operativa cliente | Cadencia recurrente. Staging aplicado; E2E cliente pendiente. |
| `TASK-1269` | Fix-It Artifacts (JSON-LD / llms.txt / briefs) | Operativa cliente | Entregables accionables del diagnóstico. |
| `TASK-1330` | AI Visibility report short links | Venta / distribución | Short links para compartir el reporte. |

### `to-do`

| Task | Título | Faceta | Nota |
|---|---|---|---|
| `TASK-1276` | **AEO Operator View (Growth + Account 360)** | **Operabilidad interna — gap #1** | **Desbloqueada** (deps `TASK-1275/1279/1287` `complete`). UI pura sobre backend listo. |
| `TASK-1341` | DataForSEO AIO runtime config guard | Config / calidad | Sube informes de `partial` a completos. |
| `TASK-1281` | Headless probe runtime (CWV + WebMCP en ops-worker) | Motor / agentic-readiness | Probes de Core Web Vitals + WebMCP. |

### Config sin task formal

- ✅ Property HubSpot `aeo_check_result` — **ya existe** (§3.1). Nada que hacer.
- ✅ Flags AEO — **ya ON en prod** (§3.2). Solo actualizar el ledger para que no mienta.
- ✅ DataForSEO creds — **presentes** en la revisión activa (§3.3). Solo confirmar con un run real.
- Poblar `grader_profiles.organization_id` + asignar entitlement per-ORG (los flags `PORTAL_RUN`/`TRIAL` ya están ON) — ver §2.A. **← esto sí queda pendiente.**
- Provisionar clientes/trials más allá de Berel (decisión comercial) — ver §2.C.

---

## 6. Qué sigue ahora — secuencia recomendada (en olas)

Ordenado por ratio impacto/esfuerzo, minimizando código nuevo:

**Ola 1 — Confirmar el loop end-to-end (verificación, no construcción; horas).** La config ya está (flags ON, property existe, DataForSEO con creds — todo verificado 2026-07-16). Lo que resta es **probar que el loop realmente corre** con un smoke real: (a) operador dispara "enviar informe + abrir oportunidad" sobre un prospecto → verificar que llega el Lead a HubSpot y que se escribe `aeo_check_result` + `ai_visibility_*`; (b) un run que ejercite Google AIO → confirmar que ya no queda `partial` por DataForSEO. Si pasan, el cross-sell está vivo. En paralelo, actualizar el `FEATURE_FLAG_STATE_LEDGER.md` para que refleje la realidad.

**Ola 2 — Cara operativa interna (`TASK-1276`, UI pura sobre backend listo).** Cockpit operador + facet AEO en Account 360. Es el gap #1 y el de mejor ratio: convierte el AEO en herramienta operativa y de venta *desde donde el AM ya trabaja al cliente*.

**Ola 3 — Puerta pública self-serve (decidir y rematar `TASK-1321` o `TASK-1327` + `TASK-1246`).** Una sola entrada donde el prospecto entre solo. Es lo que hoy da 0 tráfico y es el corazón del AEO-como-herramienta-de-venta.

**Ola 4 — Cara del cliente contratado.** Promover `/aeo` a item de nav, poblar `organization_id` + entitlement per-ORG, medir el costo del run self-serve (flags `PORTAL_RUN`/`TRIAL` ya ON — vigilar gasto), shippear tiering+trial fuera de mockup, activar re-grade recurrente (`TASK-1270`). En paralelo: segundo caso real de Radiografía + runbook del ciclo AEO recurrente (hoy inexistente; el conocimiento está disperso en 3 skills y 2 manuales).

**Diferido (no bloquea lo anterior):** EPIC-023 (CRO), EPIC-024 (HubSpot Portal Grader). EPIC-022 dejó de estar diferido: arrancó ejecución el 2026-08-05 con prioridad MCP-first (ver Delta al final).

---

## 7. Nota de higiene documental (corregida 2026-07-16)

La cabecera de `EPIC-020` y su one-liner en `docs/epics/README.md` describían las child tasks C–M como "planificadas", cuando el lifecycle real (carpeta) las tiene `complete` — el único abierto es `TASK-1246`. Corregido en esta pasada para que el estado sea legible sin re-auditar. Fuente del estado: auditoría multi-agente 2026-07-16 (motor/operabilidad, cara pública, backlog, comercial) + verificación de lifecycle por carpeta.

**Lección de método (2026-07-16):** la primera pasada de este doc fue una auditoría *doc-based* y arrastró el drift del `FEATURE_FLAG_STATE_LEDGER.md`. Al verificar contra runtime, **tres "blockers" reportados resultaron falsos**: flags OFF → en realidad ON (Vercel prod + ops-worker); property HubSpot ausente → existe; DataForSEO `missing_secret` → creds presentes en la revisión activa. Regla: el estado de flags/secrets/properties se verifica en el runtime vivo (`vercel env pull`, `gcloud run services describe`, HubSpot API), **nunca desde el ledger o docs**. El ledger describe el día que se escribió; el runtime describe hoy.

---

## Delta 2026-08-05 — EPIC-022 arrancó ejecución (MCP-first)

Este delta corrige el estado de EPIC-022 (§4 y §6); el resto del doc sigue describiendo el snapshot verificado del 2026-07-16.

- **EPIC-022 pasó de diseño a ejecución.** `TASK-1299` (schema time-series foundation) y `TASK-1301` (capabilities + entitlement per-org + chokepoint) están `complete` al 2026-08-05, con migraciones aplicadas en `greenhouse-pg-dev`, full suite (10076/0) y build de producción verdes. Specs: `docs/tasks/complete/TASK-1299-growth-seo-schema-timeseries-foundation.md` + `docs/tasks/complete/TASK-1301-growth-seo-capabilities-per-org-entitlement.md`.
- **Contrato durable vivo:** chokepoint canónico `enforceSeoRunEntitlement` (`src/lib/growth/seo/entitlement.ts`) + módulo per-org `seo_v1` en `greenhouse_client_portal.modules`. Ninguna org tiene assignment todavía.
- **Directivas del operador (2026-08-05):** (1) todo el módulo SEO nace **Full API Parity y usable por MCP** — nueva `TASK-1645` (lane ecosystem + MCP tools, P1) + exit criterion de parity en el epic; (2) **MCP-first**: operar SEO por MCP es la prioridad más alta, la UI va después — Ola B re-ordenada `1301 → 1302 → 1645 → 1300 → 1303 → UI`, con `TASK-1301`/`1302`/`1645` subidas a P1; (3) **destino Wave**: SV360 nace en Greenhouse pero eventualmente se habilita en `wave.efeonce.org` (EPIC-037) — seam de extracción contratado en `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §17.
- **Pendiente conocido:** `TASK-1302` requiere rollout real de la conexión GSC (`TASK-1282`/`TASK-1283` code-complete sin rollout).

---

## Delta 2026-08-05 (b) — reconciliación del registro: 27 childs huérfanas + tres correcciones de estado

Este delta es el resultado de un barrido del **corpus completo de tasks** (1.720 archivos en `docs/tasks/{to-do,in-progress,complete}`) buscando trabajo AEO que ningún epic estuviera contando. Supersede lo que digan §2, §4 y §5 sobre estado; esas secciones quedan como snapshot histórico del 2026-07-16.

**Método:** grep de señales AEO sobre todo el corpus (160 archivos candidatos) → diff contra el set registrado (childs de EPIC-020/021/022/023/024 + este doc) → 113 huérfanas candidatas → clasificación por 4 subagentes con evidencia literal → **verificación programática** del campo `Epic:` de cada archivo contra el `## Child Tasks` de su epic declarado. La verificación programática es la que manda: es la que convirtió una impresión ("faltan tasks") en un número.

### Hallazgo 1 — 27 tasks declaran un epic AEO y no están en su lista de hijos

No es que les falte dueño: **se declaran hijas de un epic que no las lista.** El campo `Epic:` de la task y el `## Child Tasks` del epic divergieron sin que nada lo detectara.

| Epic | Huérfanas | Estado |
|---|---|---|
| EPIC-020 | 25 → **22** (16 `complete`, 6 abiertas) | ✅ reconciliadas; 3 movidas a su dueño correcto (ver abajo) |
| EPIC-021 | 1 — `TASK-1390` (fix `ISSUE-120` del pipeline) | ✅ reconciliada |
| EPIC-022 | 1 — `TASK-1426` (GSC multi-property) | ✅ reconciliada |

**Consecuencia:** el "12/13 childs `complete`" de EPIC-020 era una **ficción contable** — contaba el denominador original (13) e ignoraba las 25 que se declaraban suyas. El alcance real es **49 childs: 32 `complete`, 17 abiertas** (conteo canónico por campo `Epic:`, con paridad verificada). El epic no estaba a una task de cerrar; está a diecisiete.

**Las 6 abiertas reconciliadas de EPIC-020:** `TASK-1336` (contrato submit→`reportToken`) · `TASK-1424`/`1425` (Share of Voice per-motor: foundation + panel) · `TASK-1332`/`1338` (hub Think: icon library + extracción del view-model) · `TASK-1293` (post-flag-rollout hardening, residuo de ops).

### Hallazgo 2 — 10 tasks AEO-core con `Epic: none`

Trabajo AEO real que ningún epic contabilizó nunca. Nueve están `complete` y quedaron registradas como anexo de trazabilidad en EPIC-020: `TASK-1227` (normalization + scoring engine V1), `TASK-1228` (discovery & eval spike), `TASK-1233` (provider Gemini), `TASK-1236` (tendencia temporal), `TASK-1237` (signal enrichment), `TASK-1296` (contrato Turnstile del form AEO), `TASK-1298` (migración `/aeo-2/` a `<greenhouse-form>`), `TASK-1410` (Radiografía AEO), `TASK-1415` (chapter-author de diagnóstico SEO/AEO — su dueño natural es el Tender Proposal Studio).

**La décima está abierta y sin dueño: `TASK-1284`** (conexión GA4 multi-tenant como nueva señal del grader). Es AEO-core, `to-do`, `Epic: none`. **Asignarla a EPIC-020 o a EPIC-022 es una decisión de alcance, no de higiene documental — queda abierta a propósito.**

### Hallazgo 3 — hay AEO dentro de EPIC-022 que este doc no cuenta como AEO

Siete hijas del módulo SEO son AEO de fondo, correctamente registradas en su epic pero invisibles como programa AEO: `TASK-1305` (gap SEO↔AEO), `TASK-1310` (quadrant 360), `TASK-1311` (atribución de citas IA por URL + grounded queries), `TASK-1313` (Visibility 360 unificado por página/cluster), `TASK-1314` (topical authority: ¿la pillar es la que cita la IA?), y el bloque E-E-A-T `TASK-1315`/`1316`/`1317` (extracción de señales, rúbrica de 4 pilares YMYL, scorecard).

**Implicación:** la frontera "EPIC-020 = AEO / EPIC-022 = SEO" no describe la realidad. El eje AEO ya cruza los dos epics; cualquier plan que trate a EPIC-022 como "diferido, es SEO" va a diferir trabajo AEO sin saberlo.

### Hallazgo 4 — 9 tasks AEO-consumer viven en EPIC-019

Landings y ebooks que usan el grader como puente comercial: `TASK-1343` (landing SEO), `TASK-1352` (pillar HubSpot), `TASK-1374`/`1375` (ebook web agéntica), `TASK-1386`/`1387` (ebook Surround Discovery), `TASK-1402` (artículo con citación medida por el grader — dogfooding), `TASK-1411` (stock sourcing, nace del caso SKY), `TASK-1414` (láminas de propuesta). Su dueño correcto **es** EPIC-019; se listan acá sólo para que el programa AEO sepa quién depende de él.

### Tres correcciones de estado

1. **`TASK-1276` está `complete`, no `to-do`.** El cockpit del operador (`/growth/aeo` + facet AEO en Account 360) que §2.B declara "gap #1 de operabilidad interna" **ya está construido**. La § Ola 2 de §6 quedó sin objeto.
2. **La entrada pública self-serve está LIVE.** Verificado en runtime 2026-08-05: `think.efeoncepro.com/brand-visibility` → HTTP 200 sirviendo el `<greenhouse-form>` gobernado; la definición pública del form responde 200 **en producción** con Turnstile `required` + site key real + `consentPolicyVersion: ai-visibility-grader-consent-v1`. §2.C ("no existe puerta pública donde un prospecto meta su dominio solo") es **stale**. `TASK-1246` dejó de ser "construir el lanzamiento": su residuo es el **smoke E2E** (`submit → run → status → token → informe → email → HubSpot`) y el gate de gobernanza (consent, PII/retención, signals de costo/abuso con tráfico real).
3. **Ojo con el consent:** la definición publicada del form trae `consent.checkboxes` **vacío**. Hay versión de política pero ningún checkbox renderizado. Puede ser por diseño (aviso implícito) o ser un hueco de cumplimiento — **no lo asumas, confírmalo con el sign-off legal que `TASK-1246` tiene pendiente.**

### Resuelto — nace EPIC-040 (Growth Public Forms Engine)

La decisión quedó tomada el mismo día por el operador: **el motor Growth Forms es dueño de sí mismo, no del AEO.** Se fundó [`EPIC-040`](to-do/EPIC-040-growth-public-forms-engine.md) y el barrido del corpus por señales del motor (`growth forms`, `greenhouse-form`, `form_definition`, `growth.forms`) encontró **21 tasks sin epic dueño** — no las 4 que se veían desde el AEO: `TASK-1229`/`1230`/`1231`/`1232` (foundation), `1256`, `1294`, `1297`, `1318`, `1319` (`complete`), y `1253`, `1254`, `1255`, `1258`, `1259`, `1261`, `1264`, `1295`, `1320`, `1335`, `1342`, `1359` (abiertas). Casi todas con `Epic: none` u `optional`.

**Reasignaciones aplicadas:**

| Task | De | A | Razón |
|---|---|---|---|
| `TASK-1335` (CORS/allowlist) | EPIC-020 | **EPIC-040** | Capacidad del motor; el AEO sólo fue su primer consumer. |
| `TASK-1359` (funnel → GA4) | EPIC-020 | **EPIC-040** | Íd. |
| `TASK-1326` (control plane Astro multi-repo) | EPIC-020 | **EPIC-019** | Es control plane del sitio público, no AEO. |

**Lo que el AEO conserva son sus propios formularios**, no el motor: `TASK-1251` (convergencia), `1257` (intake nombre), `1263` (gate corporativo del form del grader), `1296` (contrato Turnstile del form AEO), `1298` (migración `/aeo-2/`), `1327` (landing + embed), `1336` (contrato submit→token). `TASK-1293` se queda en EPIC-020 como residuo de ops (su alcance excede al AEO pero incluye sus flags).

**Frontera declarada:** EPIC-040 gobierna el **motor**; EPIC-035 gobierna la **distribución** del bundle; los epics de dominio (020/011/019) son **consumers** y no contienen tasks de motor.

### Falsos positivos descartados

33 de las 113 candidatas eran ruido del grep (landings HubSpot sin relación, careers/ATS, decks, Nexa, composition shell, axis color): `TASK-038`, `830`, `879`, `1089`, `1093`, `1101`, `1110`, `1114`, `1118`, `1123`, `1322`, `1337`, `1345`, `1350`, `1351`, `1358`, `1361`, `1367`, `1369`, `1372`, `1373`, `1392`, `1401`, `1403`, `1404`, `1405`, `1406`, `1417`, `1418`, `1419`, `1420`, `1598`, `1600`.

### Lección de método

El drift anterior (§7) fue **doc vs runtime**. Éste es **doc vs doc**: el campo `Epic:` de una task y el `## Child Tasks` de su epic son dos escrituras independientes que nada reconcilia, así que divergen en silencio y el epic reporta un avance que no es el suyo. Un `12/13 complete` se lee como "casi cerrado" y esconde 25 tasks.

**Regla:** el avance de un epic se calcula cruzando el campo `Epic:` de **todo** el corpus contra su lista de hijos, nunca leyendo la lista sola.

### Gate mecánico implementado — `epic-child-parity`

La regla dejó de depender de que alguien se acuerde. `pnpm epic:lint` incorpora el check **`epic-child-parity`** (`scripts/ci/ops-artifact-lint.mjs`): barre las ~1.720 tasks del corpus, lee el epic que cada una declara en su campo `Epic:` y verifica que su id aparezca en el `## Child Tasks` de ese epic. También detecta tasks que declaran un epic **inexistente**.

**Lo primero que hizo el gate fue probar que el problema es del repo, no del AEO:**

| | |
|---|---|
| Epics con drift | **15** |
| Tasks declaradas y no listadas | **193** |
| Peores casos | EPIC-028 (89) · EPIC-019 (21) · EPIC-013 (20) · EPIC-007 (14) · EPIC-011 (9) |

Y en la segunda pasada sobre el propio AEO encontró **15 más en EPIC-020** que la reconciliación manual no había visto: declaraban el epic pero sólo aparecían en la **prosa** (secciones de estado, olas, blockers), nunca en la lista. Once eran suyas y se registraron (`TASK-1275`/`1276`/`1287` `complete`; `1251`/`1269`/`1270`/`1281`/`1282`/`1283`/`1330`/`1341` abiertas); cuatro (`TASK-1266`/`1267`/`1279`/`1286`) eran de EPIC-021 con el campo mal y se corrigió el campo.

**Severidad: `warning` por defecto.** Con 193 violaciones preexistentes, hacerlo `error` hoy dejaría `pnpm epic:lint` rojo para todo el mundo por deuda ajena. Se enciende con **`pnpm epic:lint --strict-child-parity`** (exit 1), pensado para (a) verificar un epic recién reconciliado y (b) promoverse a gate de CI cuando el backlog esté limpio.

**Estado tras esta pasada:** `EPIC-020`, `EPIC-021` y `EPIC-040` pasan `--strict-child-parity` limpios. Los otros 12 epics con drift quedan **fuera del alcance de este trabajo**: cada uno necesita el juicio de su dueño para decidir, task por task, si se agrega a la lista o si el campo `Epic:` está mal. No se tocaron a ciegas.
