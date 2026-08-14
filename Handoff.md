# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

### TASK-1659 COMPLETE — intención declarada de una keyword (2026-08-14)

Salió de intentar tomar **TASK-1665** (workbench `Descubrir`): la auditoría destapó que dos de
sus cinco acciones de candidato — `Declarar objetivo` / `Seguir oportunidad` — citaban
`trackKeywords(intent=...)` **que no existía**. El operador eligió parar 1665 e implementar 1659
primero, así que el workbench queda con su contrato completo cuando se retome.

Los 3 slices en `develop` (SIN push): migración `20260814221022082` (aplicada — base compartida,
migrar desde local ES el cambio productivo), command y las 3 lanes. **16/16 contra PG real**
(incluido el invariante de las DOS filas tras un cambio de intención) + suite **10.747 verde**.

**Diseño load-bearing:** `intent` (`target|opportunity`, CHECK cerrado) es ortogonal a `source`
(procedencia del write) y va en columna propia con autoría separada — `intent_declared_by` ≠
`created_by` porque un agente puede declarar por encargo, y un CHECK acopla ambas a la existencia
de `intent`. **Sin backfill y sin default**: la ausencia se propaga hasta la UI, y es el *caller*
quien declara (la lente Oportunidades manda `intent: 'opportunity'` explícito). **Cambiar la
intención cierra la membresía y abre otra** con `clock_timestamp()` — el dato de reporte es "es
objetivo desde marzo, y en marzo estaba en la 45" —, **no consume cupo** y emite outbox aunque
`activeKeywordCount` no se mueva. Outcome propio `intent_changed`. `[verificar]` de capability
resuelto: reusa `growth.seo.target.configure`. Sin flags, sin scope nuevo en Entra.

**Desbloquea TASK-1660** (lente Objetivos) — `Blocked by: none`, con delta de lo que puede dar por
sentado.

**TASK-1665 queda con su auditoría escrita en el archivo** (cinco supuestos que no resistieron el
repo). Los tres que más cuestan si se descubren tarde: no existe ningún `?view=` en el dashboard,
así que el conmutador de lentes hay que **crearlo**; "Dificultad ◑ N/100" está **superseded por
ISSUE-152** (va "Barrera de enlaces" en niveles, y el filtro `maxDifficulty` sale del contrato de
URL); y `Objetivos` sigue en `to-do`, así que `Descubrir` es la **segunda** lente y el link "Ver en
Objetivos" no tiene destino. Además `Motion: none` es incorrecto: falta el contrato de motion.

**Rollout cerrado:** `pnpm build` verde, push a `develop` hecho y **CI 8/8 en verde**. No hay flags
que prender.

**Propagación documental (3 subagentes):** regla auto-load `growth-seo.md` (4.ª cláusula del write),
skills `dataforseo-operator` + `efeonce-mcp-platform` (con sus espejos Codex, `skills:mirrors` verde),
arquitectura §7, API Platform, master flow EPIC-022 §5/§6, epic file, doc funcional y manual del MCP.

**Impacto cruzado detectado — dos cosas que valen más que el resto:**
- `TASK-1662` (keyword gap): su taxonomía es **binaria** ("no aparece" vs "aparece peor") y ahora es
  ternaria. Un `target` en la posición 60 cae en "no aparece" pero **no es un hallazgo, es un
  compromiso en curso**: presentarlo como gap en la reunión de primera vez le vende al cliente algo
  que ya le prometimos. El tercer estado va en el contrato del reader, no en la superficie.
- `TASK-1690` (superficie cliente): `selectFeaturedRankSeries` ordena por mejor posición y corta en 5,
  así que un objetivo en la 60 es **estructuralmente imposible de destacar** y entra al promedio como
  fracaso permanente.
- Menores, con delta escrito: `TASK-1667` (usa `objective` donde el valor canónico es `target`; funde
  intención declarada con search intent estimado en una columna; y cita "readers de 1659" que no
  existen — 1659 entregó un *command*) y `TASK-1669` (`intent` es homónimo dentro del mismo bundle de
  evidencia).

**Deuda documental declarada, NO cerrada:** el doc funcional y el manual del MCP no enumeran las tools
de TASK-1664/1666 (`get_seo_keyword_discovery`, `discover_seo_keywords`, `get_seo_grounded_query_draft`,
`prepare_seo_grounded_queries`); el manual sigue diciendo "10 de lectura + 2 de escritura". Se corrigió
la afirmación falsa de alcance ("nada que escriba"), pero el inventario le toca al cierre de esas tasks.
`TASK-1667` y `TASK-1669` están `legacy=1` en `task:lint` (les faltan markers ZONE) — preexistente.

### Auditoría SEO/AEO post-cierre 1664+1666 — CORREGIDA (2026-08-14)

Tri-auditoría por subagentes con skills SEO (craft 1664 · AEO craft 1666 · economics DataForSEO).
Veredictos: economics LOW risk sin blockers de gasto; 1664 sólido con 4 defaults que congelaban
contrato; 1666 con 2 blockers de producto medidos en el smoke real. **Todo corregido y commiteado
en `develop` (SIN push): commits `3ada31d57` (Lote B/1666) + `522460b17` (Lote A/1664).**

- **1666 v2:** cerebro grounded `aeo-author.seo-grounded.v2` (cobertura obligatoria por seed,
  verificada con `computeSeoSeedCoverage` → `seedCoverage`/`coverageNotice` en el resultado);
  sanitizer normaliza competidor literal → `{{competitor}}` y marca literal fuerza
  `namesBrand=true`; pisos grounded (≥50% discovery + 4 fanOutTypes). `aeo-author.v1` intacto.
- **1664:** orden accionable (oportunidad medida ● primero; desempate por linkBarrier, no KD);
  idempotency key `auto-` con ciclo `YYYY-MM`; spend fence sobre el remanente real;
  `related_keywords` depth 2; `order_by relevance` de keywords_for_site verificado contra
  sandbox DataForSEO; DTO +`cpcUsd`/`competitionLevel`; `excludeTracked` en las 3 lanes.
- Gateway `efeonce-mcp@5ae17ab` (wording idempotencia mensual; deploy dispatch sigue diferido al
  próximo release develop→main). Deltas + backlog V1.1 en los dos task files.
- **Próximo paso: TASK-1665 (workbench UI)** — el contrato del reader ya quedó estable post-fix.

### TASK-1666 COMPLETE — puente SEO → grounded queries AEO (2026-08-14)

End-to-end en la misma sesión que 1664: suite completa **10.721 verde**, sanity PG real **16/16
con autoría LLM real** (1 llamada Gemini, centavos) sobre candidatos reales del smoke de 1664 —
draft baseline (USD 0, aviso obligatorio) + draft grounded v2 con **15 preguntas evaluadas a mano**
(naturales, seeds como tema — 0 copias 1:1 —, no-leading limpio), refs opacas verificadas en
`grounding_sources_json`, active intacto, cero grader runs, dedupe real USD 0.

**Diseño load-bearing:** authoring AEO extendido backward-compatible (cerebro grounded versionado
aparte `aeo-author.seo-grounded.v1`; `aeo-author.v1` **byte a byte intacto** — probado); bridge =
adapter con doble capability, anti-oracle, `contextRef` sha256 canónico e idempotencia por modo
esperado con `pg_advisory_xact_lock` en conexión fijada (un baseline previo NO bloquea re-generar
grounded). 🔴 **Write máquina (ecosystem/MCP) = `aeo_forbidden` FAIL-CLOSED hasta TASK-1631**: la
capability humana de prompt sets no se fabrica para la máquina (documentado en lane/tool/parity).

**Rollout:** el lane app/ecosystem viaja con el deploy de Vercel del próximo push de develop (este
cierre lo incluye); gateway federado (`efeonce-mcp@ac778e8`, 41/41 tests, canary con denies del
puente) — su **deploy dispatch va con el próximo release develop→main** (junto con el de 1664).
Cero flags nuevos. **Desbloqueada: TASK-1665 (`Blocked by: none`)** — el workbench ya tiene sus
dos dependencias completas.

### TASK-1664 COMPLETE — keyword discovery: code complete, rollout PENDIENTE (2026-08-14)

End-to-end autorizado y ejecutado en una sesión: 6 slices en `develop` (SIN push), suite completa
10.693 verde, sanity PG real 27/27 (tx abortada, cero filas de prueba), **smoke live con gasto
real**: corrida `seokdr-2e3e06e6-…` Berel MX (1 seed × `keyword_suggestions` × limit 10) →
`succeeded`, 10 candidatos, **USD 0.0132 ≤ 0.0612 estimado**, ledger labs atribuido, `keyword_info`
inline persistido en el store 1661 (top-up 0 llamadas), re-enqueue deduped USD 0, cero auto-track.

**Diseño load-bearing:** candidates guardan SOLO procedencia (la métrica vive en
`seo_keyword_market_data`, escrita por el writer canónico nuevo `persistKeywordMarketData` —
`captureKeywordMarketData` refactorizado para usarlo); despacho = Cloud Scheduler
`ops-seo-keyword-discovery-drain` (**nace PAUSADO**, declarativo en `deploy.sh`) → drain con claim
atómico; outbox = trazabilidad, no cola.

**Rollout EJECUTADO Y VERIFICADO (2026-08-14, autorización "termina todo lo que está pendiente"):**
push de develop → Ops Worker Deploy verde ×2 con verificación por paso — base (rev `00552`:
scheduler PAUSED + flag `false`) y flip (rev `00553`: flag `true` + scheduler **ENABLED**);
**primer tick del drain disparado y observado en logs** (`pending=0 processed=0`, no-op = costo
cero con cola vacía); flag en Vercel `Production` + `staging`; CI del push verde (incluye build).
**Gateway federado** (`efeonce-mcp@0a8c5e4`: provider `getKeywordDiscovery`/`discoverKeywords`,
puerta HTTP exige `efeonce.mcp.seo.write` para el write, parity 12 tools, canary ampliado, tests
40/40) y **canary contra staging COMPLETO VERDE** — la lectura de discovery sirvió la corrida real
del smoke y los denies 404/400 respondieron correcto. **Único pendiente externo:** dispatch del
deploy del gateway cuando el próximo release develop→main lleve el lane a producción (antes, las
tools federadas darían 404 upstream — lección TASK-1661). Sin enqueue automático: ON + cola vacía
= costo cero; cada corrida pasa preview + gate. Desbloqueadas: TASK-1666, TASK-1667
(`Blocked by: none`) y 1665 sólo espera 1666.

### Release a producción 2026-08-14 — `3754a17d3b1d` RELEASED

`release_id=3754a17d3b1d-4ae924ca-eb20-4c54-9ddb-e15a7ecfe26a`, run `31793370954`, PR #192.
**Manifest `released`** (verificado en `greenhouse_sync.release_manifests`, no sólo en GitHub).
Pasó a la primera: 0 retries, 0 runs quemados. E2E agente 1h04m; workflow 11m33s.

**Verificado en runtime, no asumido:** 4 workers Cloud Run `Ready=True` (3 con el target SHA;
`ops-worker` en `9edd4a0e1e0f` = **residual change-gated legítimo**, diff de rutas runtime vacío —
NO forzar redeploy, runbook §4.1) · watchdog 3/3 `ok` · `/api/auth/health` 200 · **canary del
gateway contra PRODUCCIÓN completo verde**, incluida la tool nueva
(`keyword-market-data: market=available found=2/2 asOf=2026-08-13 servedMarket=2484/es`).

**Break-glass usado con razón verificada** (no formulaica): `db_migrations` es dominio irreversible,
pero la migración `20260813171143226` ya figuraba en `pgmigrations` (2026-08-13 21:13Z) y hay UNA
sola instancia Cloud SQL — el dominio era reconciliación de archivos con un estado ya realizado.
Rollback = revert del PR #192, sin undo de schema.

**Gateway MCP:** deploy dispatchado (`efeonce-mcp` run `31794233777`, sha `c4e0fcd`) DESPUÉS de
confirmar el lane vivo en producción. Verificar que cierre y correr el canary contra
`mcp.efeonce.org`.

**Pendiente menor:** primer run del scheduler `ops-seo-keyword-market-data` el día 15 08:00 CLT
(esperado `already_fresh`, costo ~0).

### ISSUE-152 + ISSUE-153 resueltos — mercado de Berel corregido + contrato multi-mercado (2026-08-13)

**Berel migrado a México** (autorización del operador: "Berel es de México" + "solucionalo
end-to-end"): `seot-berel-mx` activo con 31 keywords, `seot-berel-fase0` (CL) pausado con sus 238
snapshots íntegros. Verificado con capturas reales (USD ~0.14): 31/31 rankings MX — **#1 en sus
términos de marca** —, mercado 30/31, ledger atribuido. El cron diario toma MX solo desde el
próximo ciclo (itera targets `active`).

**Contrato multi-mercado shipped** (`bc7cafe77`): helper canónico `resolve-target.ts` (los 4
`LIMIT 1` copy-pasteados migrados), lane con `?market=` + 409 `multiple_markets`/`market_not_found`,
`meta.servedMarket` en toda respuesta, 9 MCP tools con `market` opcional. Suite 10.629 verde.

**Pendientes que dejaron estos cierres (no bloqueantes):**
- Selector de mercado en la UI admin (cockpit/keywords) — producto, para cuando una org
  multi-mercado se materialice; declarado en ISSUE-153 §Follow-up.
- Guardrail de alta de target (contrastar volumen del nombre de marca vs mercados vecinos) —
  ISSUE-152 §4.
- `keyword_difficulty`: RESUELTO, y desde `fc0019e43` ya **no gobierna la presentación**. La UI
  muestra **Barrera de enlaces: Baja/Media/Alta** derivada por `deriveLinkBarrier`
  (`src/lib/growth/seo/keyword-market-data.ts`) desde el perfil de enlaces del top-10 real
  (`avg_backlinks_info`), ponderando **diversidad de dominios referentes + page rank, nunca el
  conteo de enlaces** — explícitamente NO la KD. `classifyLinkBarrier` fue eliminada.

### TASK-1661 — datos de mercado por keyword: code complete, rollout PENDIENTE (2026-08-13)

`greenhouse_growth.seo_keyword_market_data` **ya existe en la base** (migración `20260813171143226`
aplicada; base compartida dev/staging/prod). `readKeywordOpportunities` ya no cablea
`market: 'unavailable'`. Commits: `261b2919a` (schema) · `739734512` (fetch) · `efc76b8b0` (reader,
worker, MCP, señal + fix). Suite completa 10.616 verde; sanity PG 13/13.

**Rollout EJECUTADO Y VERIFICADO EN RUNTIME (2026-08-13 noche):** push de develop (14 commits) →
8 workflows verdes incl. Ops Worker Deploy; revisión `ops-worker-00551-pc2` con el flag `true`;
scheduler `ops-seo-keyword-market-data` **ENABLED** (`0 8 15 * *`). **Canary del gateway contra
staging: COMPLETO VERDE** — la tool federada respondió `market=available found=2/2 asOf=2026-08-13
servedMarket=2484/es` (México, el mercado corregido) + deny anti-oracle OK. Gateway pusheado
(`efeonce-mcp@c4e0fcd`; su deploy es `workflow_dispatch`, NO automático). **Pendientes:** (1) el
próximo release develop→main lleva el lane a producción → recién entonces **dispatch del deploy
del gateway** para que la tool federada viva en `mcp.efeonce.org` sin 404 upstream; (2) verificar
el primer run del scheduler el día 15 (esperado: `already_fresh`, costo ~0).

**Riesgo de la KD 0: CERRADO por `fc0019e43`.** La KD dejó de gobernar la presentación: se persiste
verbatim, pero la barrera se deriva del perfil de enlaces del top-10, no de ella. Verificado contra el
proveedor: `pintura` y `pintura para piso` (ambas KD=0) ahora separan en `high` y `low`.

**Gasto real ya incurrido en verificación: USD ~0.05** (dry-run gratis + corrida real + una llamada
de diagnóstico + la corrida con el defecto que se corrigió).

**Desbloqueadas por este cierre:** `TASK-1662` y `TASK-1664` pasaron a `Blocked by: none`. 1664 tiene
además su spec recalibrada (commit `a98aaf4c7`): entitlement `seo_v2`, IDs `TEXT`, despertador por
Cloud Scheduler y el boundary de ownership del dato de mercado.

### Credencial de partner en el deck + los aprendizajes documentados (2026-08-13)

**Sin commitear todavía: conviven con el WIP del deck ANAM/HubSpot en el árbol.** El badge de HubSpot
rompía `catalog-portability.test.ts` (apuntaba a `public/` con `../../../../../`). Corregido: el asset
vive en `catalogs/deck-axis/assets/partners/` y el slot resuelve por clave cerrada
(`partner-badge-asset`, espejo de `client-logo-asset`). Suite del composer verde: 18 archivos, 223 tests.

**Lo que necesita quien siga:**

1. 🔴 **`pnpm composer:visual-gate` sigue rojo en DOS láminas, y ninguna es regresión.**
   `BackCoverFull` (1.787 px) driftea porque **declarar un slot mueve el frame del probe**: el gate
   compone con slots sintéticos y para cualquier `asset` usa `assets/url-lum.svg` — por eso aparece una
   burbuja de URL dentro de la caja del badge. Es delta intencional del carril ANAM, a declarar en
   `BASELINE_DELTAS.md`. `NarrativeSplit` (58.846 px) es **baseline viejo en `HEAD`**: su plantilla está
   commiteada desde `f7761988f` y limpia en el árbol. **No congelé**: el runbook prohíbe `--freeze` con
   el composer sucio por otro agente, y lo está.
2. **El dueño del carril ANAM decide si mis cambios viajan con su commit o van aparte.** Son 4 archivos:
   el SVG copiado, `back-cover-full.html`, `back-cover-full.slots.json` y `resolvers.ts`.
3. **Queda una duplicación de asset por decidir:** el badge existe ahora en `public/branding/partners/…`,
   en `src/lib/brand-assets/` (módulo TS, untracked) y dentro del catálogo. Tres hogares para un SVG.

### TASK-1310 CERRADA — portal SEO del cliente completo; su propio scorecard estaba equivocado (2026-08-12)

**`complete`, promoción `develop → main` pendiente.** Con ella el módulo SEO tiene sus dos caras
(4 tabs de operador + portal cliente) y la pata visible del exit criterion de parity queda cubierta.
Los 4 gates UI en verde: `design-contract:lint` · `ui:code-lint` · `ui:visual-gate` · `ui:quality`
**PASS 4.52**. Verificado con **sesión de cliente real de la organización contratada**: 3 superficies
× 2 viewports, `qualityFindings` **vacío** en las seis corridas.

**Lo que necesita quien siga:**

1. 🔴 **Un scorecard es una foto con fecha, no un estado.** El de esta task bloqueaba con 2.29 sobre
   capturas de las 10:25 del 08-08, y el commit `5f622386d` de las 19:29 ya había ejecutado los 7
   lotes premium. Cuatro días el veredicto vigente describió una UI inexistente. **Ante una task con
   auditoría abierta: medir antes de rehacer.** Acá casi rehago trabajo terminado.
2. **Los gates no ven contradicciones de contenido.** El informe anunciaba "Aún no hay una posición
   media para leer" con `#13.3` al lado, con `exitCode 0` y axe limpio. Causa: tres renders del mismo
   modelo derivando cada uno su regla. Ahora se deriva una vez (`resolveSeoLeadTitle`) con test de
   regresión. **Mirar el frame no es opcional.**
3. **Para verificar una superficie client-gated hace falta la persona de ESA organización.** La
   genérica `agent-client@…` recibe la card de bloqueo y se lee como defecto de producto. La de Berel
   ya existía: `agent-berel-client@greenhouse.efeonce.org`. El mapeo usuario↔organización **no** está
   en `client_users`/`clients`/`organizations` — está en `greenhouse_serving.session_360`, que es
   donde el runtime mismo lo resuelve. La sonda `scripts/growth/_sanity-seo-client-population.ts`
   deja esa consulta lista.
4. **Fix global de paso:** el FAB "volver arriba" del layout `(dashboard)` no tenía nombre accesible
   (`button-name`, *critical*) en **todas** las rutas del portal. Cerrado con label del namespace
   `aria` canónico (`756d9970d`).
5. 🔴 **`pnpm test` está rojo en el árbol por trabajo AJENO:** `catalog-portability.test.ts` falla por
   un `../../../../../public/branding/...` en `deck-axis/back-cover-full.html`, WIP no commiteado del
   deck ANAM/HubSpot (en HEAD hay cero ocurrencias). El guardrail hace su trabajo: ese path escapa del
   catálogo. 10.588 tests pasan. No lo toqué — no es mío, y quien lo tenga en curso debe verlo.
6. **Follow-up con dato, sin task todavía:** la superficie cliente tiene **una sola organización**
   (Efeonce tiene assignment pero es tenant interno y `requireClientTenantContext()` lo excluye). Con
   N=1 nadie delata que `connection.state` se decide con **GSC** mientras el Resumen deriva de **rank
   snapshots**: un cliente con Search Console conectado y captura de rank sin correr —**el día 1 de
   todo cliente nuevo**— ve el KPI principal en "sin dato" con el Quadrant poblado debajo.

### CIERRE END-TO-END TASK-1688/1689 — segundo release del día, cero pendientes (2026-08-12)

Release `950f5bdb4` (PR #191) → manifest `950f5bdb4043-71cc7e1a-…` en **`released`** (run `31639297861`, sin
bypass: batch sin migraciones). Cierra TODO lo que quedaba: **flip expand→contract** del país (requerido en
parser; verificado en staging con POST sin país → `invalid`), país en «01 Tus datos» del form nativo, **fix del
select premium** (placeholder real — mostraba la primera opción como elegida con valor vacío), **email
`selected` ejercitado live** (supersede controlado sobre EO-APP-0090, `sent`; re-decidida rejected), **scorecard
GVC PASS** (avg 4.6, capturas 1440+390 de ambas superficies), **revisión de privacidad documentada**
(`docs/operations/hiring/2026-08-12-revision-privacidad-contacto-careers.md`; 2 recomendaciones no bloqueantes:
completitud del aviso público en efeoncepro.com/privacy + purga del mensaje en la política de retención) y fila
del flag movida a §Snapshot (los 6 tipos con evidencia live). **Hallazgo de CI:** el run de `main` quedó rojo con
10.582 tests verdes por un flake pre-existente (timer del email-verify del renderer dispara post-teardown sin el
global `CSS` → unhandled rejection); rerun verde + guard commiteado en develop (`a349d0088`, viaja en el próximo
release). `ops-worker` en `63625ccdd` = residual change-gated (diff runtime 0). Único follow-up humano restante:
las 2 recomendaciones de la revisión de privacidad.

### ROLLOUT COMPLETO TASK-1688/1689 — emails de hiring LIVE + contacto Careers en producción (2026-08-12)

Release `393144e9f` (PR #190) → manifest `393144e9fb3b-8d17b9bc-…` en **`released`** (run `31593198609`,
workflow 9m54s, ambos gates `production` aprobados por loop, bypass forense por `db_migrations` ya aplicadas en
la instancia única + `cloud_release` ya aplicado en vivo). Verificación: health 3 providers `ready`, watchdog
`ok`, 3 workers en target + `ops-worker` residual change-gated con diff runtime 0 (su SHA `e8078fe08` ya contiene
los consumers). **Emails LIVE**: flag ON (rev `ops-worker-00548-x52` + default true en deploy.sh), ejercicio E2E
real EO-APP-0090 con 5 tipos `sent` (interno a people@efeoncepro.com con contacto completo + acuse + Preselección
+ evaluación + rechazo, asuntos personalizados). **Contacto Careers LIVE**: campo país en el form custom de prod
(curl verificado) y Growth Form v4 publicado (paridad nativa; el campo cae en «Datos adicionales» del renderer —
deuda visual menor). La postulación de prueba `EO-APP-0090` (Prueba TASK-1689 NO CONTACTAR) queda en el Desk para
descarte de HR. **Pendientes menores:** revisión Legal/Privacy de los 3 campos; flip país→requerido-en-parser
tras ventana de observación; scorecard GVC formal; sacar la fila del flag de §Pendientes del ledger tras la
primera postulación real con emails verificados.

### Sika México LIC-1120 — paquete de bid preparado, sin precio ni envío (2026-08-12)

Se creó [`docs/commercial/tenders/sika-lic-1120/`](docs/commercial/tenders/sika-lic-1120/): originales en OneDrive, evidencia Wherex, admisibilidad, blueprint interno, técnica, estructura económica y deck de taller. La propuesta se enfoca en continuidad comercial: Search por intención y ubicación → landing/ficha de destino → canal de atención → medición y optimización; **no** promete transferir 50% de ventas. El deck técnico de ocho láminas pasó slots y revisión visual local, pero sigue siendo taller (sin `Proposal`/render gobernado). La pregunta propia continúa en **0/1 respondidas** al 12-08 11:14: faltan fecha/destino/stock por cierre, línea base/fuente de ventas y canal autorizado. **Corrección 2026-08-13:** el brief confirma MXN 100–150 mil para desarrollo y ejecución, pero no dice explícitamente que incluya pauta; una lectura anterior atribuye creatividad/pauta/fee a la respuesta del comprador, y debe revalidarse antes de fijar precio. No existe cotización aprobada. Wherex muestra 45 días, pero también condiciona el crédito a lo convenido con Sika: no asumirlo como término cerrado. La oferta Wherex sigue en edición, sin adjuntos, términos aceptados ni envío; tab queda en handoff.

### TASK-1688 CERRADA — contacto completo en postulaciones Careers: code complete, rollout pendiente (2026-08-12)

ADR aceptado y registrado (Delta en la arquitectura Hiring + `DECISIONS_INDEX`): `phone_e164` y
`residence_country_code` (autodeclarado, ISO, CHECK) viven en `candidate_facet` con upsert anti-wipe;
`candidate_message` (≤4000) en `hiring_application`. Migración `20260812094000000` aditiva aplicada y verificada
contra PG real — su timestamp es 09:40 porque la migración de ISSUE-151 (nombrada a mano con hora futura 09:30) ya
estaba aplicada y node-pg-migrate rechaza timestamps anteriores. El parser único valida el país contra el SSOT
`countries.ts` SIN truncar (`'Chile'`→`'CH'` habría sido Suiza — atrapado por test) y lo usa sólo como hint de
formato del teléfono; el command persiste los tres campos (test anti-regresión del bug class "el form acepta y el
command descarta"). Paridad: select de país requerido en `CareersApplyClient` + contrato del native Growth Form,
copy es-CL/en-US tokenizado; Application 360 muestra Teléfono completo / País (nombre textual) / Mensaje, con "No
informado" para legacy. Suite completa 10.585 tests + lint/typecheck 0; `design-contract:lint` y `ui:code-lint`
PASS. **Rollout pendiente:** ejercicio en staging + GVC premium 1440/390 (el preview harness local no levantó el
dev server esta sesión), revisión Legal/Privacy de retención/aviso, y el flip expand→contract que hace el país
requerido a nivel parser tras verificar ambas superficies en producción.

### TASK-1689 CERRADA — emails del ciclo de Hiring: code complete, rollout pendiente (2026-08-12)

Los 6 emails (aviso interno a People + acuse al candidato en `hiring.application.created`, test asignado en
`hiring.assessment.assigned` sólo `candidate_test`, avance de etapa allowlisted en `stage_changed`, decisión
selected/rejected anti-stale en `decided`) quedaron cableados como 4 consumers reactivos domain `notifications`
(lane existente `ops-reactive-notifications`), con política en `src/lib/hiring/notifications/**`, dedupe
`wasEmailAlreadySent` y re-emisión canónica del token del test (`reissueCandidateTestTokenForEmail` — el token
nunca viaja por el outbox). Gates: 10.577 tests verdes, lint/typecheck 0, worker gates OK; el `pnpm build` de
producción NO se corrió por la preferencia del operador (memoria: build cuelga la máquina) — el CI lo cubre al
push. **Rollout pendiente:** flag `HIRING_LIFECYCLE_EMAILS_ENABLED` default OFF en `deploy.sh` (seed
`email_type_config` YA aplicado en la DB compartida, benigno con flag OFF); el flip exige deploy del ops-worker
+ ejercicio end-to-end en staging + revisión de Talent del copy (especialmente `hiring_decision_rejected`,
pausable aparte). Ledger actualizado. El seed se aplicó selectivamente con `pnpm migrate:up 1` para no adelantar la migración de
ISSUE-151, que en ese momento exigía código desplegado primero (la sesión de ISSUE-151 la aplicó después por su
propio carril — ver su entrada).

### ISSUE-151 RESUELTA — bridge Facebook, grant Globe y smoke de identidad verificados (2026-08-12)

`d139726ff` llegó a `main` por PR #189 y el release de producción terminó correctamente. El filtro Sentry para
`JAVASCRIPT-NEXTJS-8W` descarta sólo el bridge Facebook Android `Java object is gone`; Careers siguió respondiendo
200 con `<greenhouse-form>` y sin `postMessage`/iframe. La migration
`20260812093000000_issue-151-seed-globe-credits-view-access.sql` quedó aplicada en Cloud SQL: registry activo y
único grant `efeonce_admin → administracion.globe_credits` con `granted=true`.

Se cerró además el falso positivo `JAVASCRIPT-NEXTJS-4S`: el `ops-worker` compartido consultaba el portal staging,
que responde 302 por su SSO; quedó apuntando al portal público. Dos ejecuciones consecutivas de
`ops-identity-auth-smoke` pasaron 5/5, incluido `portal_auth_health`, y la health pública devolvió `ready`. 8W no
recibió eventos tras el rollout. Los dos tickets remotos siguen *unresolved* sólo porque la sesión de Sentry no está
autenticada y el token API disponible es read-only (403 al resolver); hace falta una sesión/token con escritura para
marcarlos en Sentry. El artefacto interno vive en `docs/issues/resolved/ISSUE-151-…`.

### TASK-1378 CERRADA + ISSUE-150 RESUELTA — scanner LIVE en producción, verificado en 3 capas (2026-08-12 06:10Z)

**Cierre completo, autorizado por el operador ("terminemos todo lo que falte"):** (1) redeploy
`greenhouse-aivcug5f5` con el flag horneado; (2) diagnóstico post-flip EN producción: `flagEnabled=true`,
`credentialPlan=service_account_key`, `mint.ok` (94 ms), `probe.ok` (147 ms); (3) **camino completo de upload
productivo**: postulación de prueba por el formulario público REAL (`PRUEBA TASK-1378 / NO CONTACTAR`,
`task-1378-postflip-prod@efeonce.org`, Turnstile real auto-verificado, CV inyectado vía DataTransfer) →
`scan_id ascan-e6a62b39-de96-4279-87ba-172587040068`, `scanner=structural+clamav-http`, `verdict=clean`,
asset `attached`, 129 ms. **HR descarta esa postulación en el Desk** (tercera de prueba identificada).

ISSUE-150 movida a `resolved/` (índice actualizado); TASK-1378 movida a `complete/` con sección de cierre;
flag ledger con Production ON en el snapshot; delta de impacto cruzado en TASK-1423. Gates de cierre (full
test + build) corridos en el commit de cierre. El bloqueo del clasificador de permisos sobre
`vercel env/redeploy` resultó transitorio.

### (histórico) TASK-1378 — RELEASE HECHO + diagnóstico VERDE en producción; falta SOLO el flip del flag (2026-08-11 23:15Z)

**Actualización de la misma fecha, sesión "avanza con lo necesario":** la promoción develop→main se ejecutó
completa y A LA PRIMERA por el control plane: PR #188 → squash `a90951dba` → orquestador run `31544667630` →
manifest `a90951dba3b7-73da976e-f460-4241-8708-5772421fa49d` en `released` (workflow 11m45s, ambos gates
`production` aprobados por el loop, Azure no-op esperado, 4 workers success, post-release health verde). Watchdog
local: `drift_count=0` con `data_missing_count=4` — la sesión gcloud expiró a mitad de release; NO es drift, la
evidencia autoritativa son los jobs de deploy del run. Pre-empción completa: merge canónico verificado (verif 1 y
2 vacías), `decision=ship` sin marker ni bypass, smoke producido sobre `main` (run `31543221610`), staging READY.

**El diagnóstico nuevo respondió VERDE desde el runtime de producción** (`greenhouse.efeoncepro.com`,
`version=a90951d`): `credentialPlan=service_account_key`, `mint.ok=true` (53 ms,
`email=greenhouse-portal@efeonce-group.iam.gserviceaccount.com`, `aud` del scanner), `probe.ok=true`
(`scanStatus=ok`, 100 ms). Las condiciones (1) y (2) de ISSUE-150 están CUMPLIDAS.

**Único paso restante — REDEPLOY de Production, EN MANOS DEL OPERADOR:** la env var
`ASSET_MALWARE_SCAN_ENABLED="true"` YA quedó en Production (verificada ~23:25Z vía `env pull`), pero el
deployment activo (`greenhouse-asy9c5esa`, build 22:37Z) se construyó ANTES de la var — Vercel congela env al
build. El clasificador de permisos del agente bloqueó `vercel redeploy`. Comando:
`vercel redeploy https://greenhouse-asy9c5esa-efeonce-7670142f.vercel.app --scope efeonce-7670142f` (o botón
Redeploy del dashboard). Verificación post-redeploy: endpoint de diagnóstico con `flagEnabled=true` + primera
postulación real con `scanner=structural+clamav-http`. Pendiente menor aparte: `gcloud auth login` para
refrescar la sesión local (watchdog/`release:workers` en `data_missing`, sin impacto).

### TASK-1378 — causa raíz del 2.º fallo del flag CERRADA EN CÓDIGO; flag OFF en prod hasta verificar desde el runtime (2026-08-11, sesión anterior)

Estado real: **staging ON y operativo** (gate E2E con postulaciones reales); **Production OFF** — el flag falló
DOS veces el 2026-08-11 (ISSUE-150) y quedó revertido. Todos los CV afectados (5+1) recuperados.

**Causa raíz del 2.º fallo, encontrada y corregida esta sesión:** Production corre con
`GCP_AUTH_PREFERENCE=service_account_key` (postura transicional, TASK-800) y `resolveGoogleIdTokenProvider`
(`src/lib/google-credentials.ts`) no tenía rama de service account key — caía a impersonación ambiente sin ADC
en Vercel → excepción en 21 ms → fail-closed `scanner_auth_failed`. Staging pasó su gate porque sin la
preferencia toma la rama WIF. **Fix:** rama `service_account_key` enrutada por `getGoogleIdTokenProviderPlan()`
(exportado, 6 tests con los shapes exactos de prod/staging) + **endpoint de diagnóstico
`GET /api/internal/health/scanner-auth`** (`?probe=scan`; guard `CRON_SECRET` o tenant agency) que acuña el
token EN el runtime donde corre. Sanity honesto ejecutado: con la SA key REAL de producción (no la ADC del
operador), mint 120 ms + Cloud Run aceptó (clean `ok` / EICAR `found`).

**Condición vigente para re-prender en Production** (la anterior — "código en main" — se cumplió y NO bastó):
(1) fix + endpoint promovidos a `main` vía release control plane; (2) `?probe=scan` contra
`greenhouse.efeoncepro.com` con `mint.ok=true` + `probe.ok=true`; (3) flip mirando la primera postulación real
(~13/día por la campaña de Facebook de `EO-OPN-0061`/`EO-OPN-0009`). Rollback <10 min.

Docs sincronizados: ISSUE-150 (§Segundo fallo), flag ledger, timing ledger del release `64c80f61d4a4`
(run `31530324227`), task file, runbook `operar-scanner-malware-assets.md` (paso 5 nuevo + troubleshooting).
`recover-scanner-403-quarantined-cvs.ts` generalizado a `scanner_auth_failed`/`scanner_unreachable`.
TASK-1378 sigue `in-progress` (no se cierra con el flag OFF en prod).

Nota histórica: la afirmación previa de este Handoff — "ambos caminos de credencial verificados por separado" —
era falsa: la prueba local usó la ADC del operador (que tiene `serviceAccountTokenCreator`), un camino que
Vercel no tiene. Detalle en ISSUE-150 §Prevención.

Servicio: **un solo `clamav`** en us-east4 (2 GiB, `min=1`, IAM-only, ≈USD 19/mes). Quedan dos postulaciones de
prueba identificadas (`PRUEBA TASK-1378 / NO CONTACTAR`) en el Hiring Desk para que HR las descarte.

### ISSUE-149 RESUELTA — drift TS↔DB de route_group_scope (2026-08-11)

El avatar vacío que reportó el operador tras TASK-1388 era drift de DATOS: 3 filas de
`greenhouse_core.roles.route_group_scope` (efeonce_admin/operations/hr_payroll) drifteadas del mapeo
TS que es solo fallback. Migration de paridad aplicada + verificada; las sesiones vivas se auto-sanaron
por el refresh de claims (5 min) sin re-login — verificado en la sesión real del operador. El fix del
trigger ⌘K (lenguaje topbar) salió en el mismo lote. Deuda señalada en la issue: 2 roles fantasma en DB
(`employee`, `finance_manager`) y falta un drift-guard mecánico TS↔DB de route groups.

### Campaña de vacantes en grupos de Facebook (2026-08-11)

Se difundieron los openings públicos `EO-OPN-0061` (Content Creator) y `EO-OPN-0009`
(Account Manager) en grupos ya unidos y afines. La expansión cerró con diez envíos adicionales por rol:
nueve visibles y uno enviado a moderación en cada caso. El detalle de copy, beneficios aprobados, grupos,
estados y decisión de publicar sin imágenes vive en
`docs/operations/hiring/2026-08-11-facebook-vacancy-distribution.md`. No cambió el runtime ni el estado
de Hiring, por lo que no requiere ADR. Pendiente operativo opcional: revisar las dos publicaciones en
moderación antes de contarlas como visibles.
