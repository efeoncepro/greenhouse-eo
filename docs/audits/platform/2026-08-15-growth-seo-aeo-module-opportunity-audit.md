# Auditoría de oportunidad — Growth SEO/AEO (EPIC-021 + EPIC-022)

> **Tipo de documento:** Auditoría consolidada de oportunidad y economía de plataforma
> **Fecha:** 2026-08-15
> **Alcance:** módulo Growth SEO (`src/lib/growth/seo/**`) + motor AEO Grader
> (`src/lib/growth/ai-visibility/**`) + su economía de proveedor y de modelo
> **Método:** siete análisis independientes con skills especializadas, cada uno obligado a
> inventariar lo ya construido y lo ya comprometido en task antes de proponer
> **Documentación técnica:** `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` ·
> `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` · `EPIC-021` · `EPIC-022`

---

> ## ⚠️ Estado de verificación — LEER ANTES DE TOMAR UNA TASK DERIVADA
>
> **2026-08-15:** este documento se escribió consolidando siete análisis y **se descubrió al menos
> una afirmación falsa después de publicarlo** (el re-grade recurrente: decía "apagado en
> producción, prenderlo es rollout" y la verdad es que `deploy.sh` lo declara `true` en ambos
> ambientes y el blocker real es un command que no existe — ver §1.4, ya corregido).
>
> **La pasada de verificación adversarial terminó** (4 auditores, 58 afirmaciones). Balance:
>
> | Bloque | Resistió | Falló | Confianza |
> |---|---|---|---|
> | Código SEO | 9 de 15 | 2 refutadas, 4 mal encuadradas | **Alta** |
> | Motor AEO | 8 de 15 | 1 refutada, 5 parciales, 1 hipótesis vendida como hecho | **Media** |
> | **Economía** | **4 de 13** | **5 refutadas, 4 parciales** | 🔴 **Baja para el grader**, media-alta para el proveedor |
>
> **Las cifras del grader tenían una sola causa de error, repetida cinco veces:** se consultó
> `provider_observations` **sin distinguir el tráfico de prueba del real** — 96 observaciones de
> adapters `fake-*` con costo cero y 28 de 45 runs de tipo `smoke`, todos dentro de los
> denominadores. Es la misma clase de fallo que el del re-grade: **leer una fuente sin verificar qué
> representa**. Antes fue un ledger documental en vez del `deploy.sh`; acá, una tabla sin filtrar.
>
> Todo lo refutado está corregido en línea con su bloque `🔴 CORREGIDO`. Reglas que quedan:
>
> - **Ninguna cifra de acá se cita hacia afuera** (propuesta, SOW, reporte a cliente) sin
>   re-verificarla contra el código o la base.
> - **Toda task derivada verifica su propia premisa en Discovery** antes de escribir código. Si el
>   código dice otra cosa que este documento, **manda el código** y se corrige el documento.
> - Las afirmaciones marcadas explícitamente como *hipótesis* o *no verificado* nunca fueron
>   hechos: no promoverlas por repetición.
>
> El origen del error importa para calibrar la confianza: nació de leer el
> `FEATURE_FLAG_STATE_LEDGER` en vez del `deploy.sh`, o sea de **confiar en un documento en lugar
> del runtime** — exactamente el anti-patrón que este repo ya tiene canonizado.

## Veredicto

**El módulo mide muy bien y actúa poco, y el dinero está mal asignado.** Los siete análisis, desde
lentes distintas y sin coordinarse, convergen en ese diagnóstico.

Ninguno de los hallazgos invalida lo construido: la calidad del núcleo —separación `◑` estimado /
`●` medido sostenida de punta a punta, barrera de enlaces derivada server-side, degradación honesta
con `score: null ≠ 0`, Full API Parity real, idempotencia en los writes— es alta y está verificada.
Lo que falta es **capacidad de acción** y **visibilidad del gasto propio**.

### El reencuadre que ordena todo lo demás

**El presupuesto no es la restricción activa. La instrumentación sí.**

> 🔴 **CIFRAS CORREGIDAS 2026-08-15 (verificación adversarial contra la base real).** La primera
> versión de este párrafo decía *"~USD 4,51 de DataForSEO + ~USD 3 de grader; se usa el 15%; sobran
> ~USD 42"*. **Los USD 3 del grader estaban inventados.** Lo medido:
>
> | | Medido | Lo que decía |
> |---|---|---|
> | DataForSEO, cliente `berel.com` | ~USD 4,51/mes (extrapolado de **9 días, 1 org**) | "10 días, 2 orgs" |
> | Grader, esa misma org | **USD 0,70 histórico** y **cero desde 2026-07-17** | ~USD 3/mes |
> | Gasto del grader sin org atribuida | **85% del total** | no mencionado |
>
> **El grader está dormido desde julio.** No hay costo mensual por cliente que reportar. El
> consumo real es **~9%** del presupuesto, no 15%, y sobran ~USD 45.
>
> La conclusión cualitativa **se refuerza** (el presupuesto no es la restricción), pero el *sizing*
> que alimentaba el tope de `TASK-1696` no valía y se corrigió allá.

La pregunta correcta no es "¿cómo ahorramos?" sino "¿en qué invertimos lo que sobra, y cómo nos
aseguramos de verlo?".

---

## Método y trazabilidad

| # | Lente | Skill | Pregunta |
|---|---|---|---|
| 1 | Defectos de arquitectura | `arch-architect` | ¿qué está mal en lo implementado? |
| 2 | Defectos de dominio | `seo-aeo` + `dataforseo-operator` | ¿hay errores de oficio SEO/AEO? |
| 3 | Oportunidad SEO | `seo-aeo` | ¿qué le falta para que un SEO senior lo prefiera? |
| 4 | Oportunidad AEO/GEO | `seo-aeo` | ¿qué falta para ganar presencia real en motores de respuesta? |
| 5 | Capacidad del proveedor | `dataforseo-operator` | ¿qué capacidad pagada está ociosa? |
| 6 | Valor comercial | `seo-aeo-practice` | ¿qué le falta para ser activo comercial? |
| 7 | Motor propio | `seo-aeo` + `arch-architect` + economía | ¿qué hacemos nosotros que no se compra? |

Los análisis 1 y 2 (defectos) se cerraron el mismo día con 13 fixes aplicados; su registro vive en
el delta 2026-08-15 de `docs/tasks/complete/TASK-1665-growth-seo-keyword-discovery-workbench.md`.
Este documento consolida los análisis **3 a 7**, que son de oportunidad, no de defecto.

---

## 1. Defectos confirmados en producción

No son oportunidades: son cosas que hoy están mal y tienen consecuencia medible.

### 1.1 `message_alignment` se calcula contra un posicionamiento que nunca se entrega

`ProseExtractionInput` (`normalization/prose-extraction/contracts.ts:38`) lleva sólo `excerpt`,
`subjectBrand`, `subjectDomain` y `maxTokens`. El prompt de usuario (`prompt.ts:73`) pide
*"messageDriftClaims (afirmaciones donde la narrativa NO refleja el posicionamiento real)"*.

**Le pedimos al modelo que detecte desvío respecto de un posicionamiento que nunca recibe.** El
modelo está infiriendo cuál es ese "posicionamiento real".

Eso alimenta la dimensión `message_alignment`, que **pesa 10 puntos** (`scoring/config.ts:44`) y
cuya definición canónica es *"la narrativa de la IA coincide con el posicionamiento **deseado**"* —
un deseo que no está declarado en ningún input. El engine cuenta `messageDriftClaims.length > 0`
para puntuar (`scoring/engine.ts:221`).

**El dato ya existe y está cacheado:** `brand_intelligence.whatTheBrandDoes`, leído del propio sitio
del cliente, hoy usado sólo para clasificar categoría. Inyectarlo son ~300 tokens de input por
observación ≈ **USD 0,002 por run completo**, más un bump de `PROSE_EXTRACTION_VERSION` y re-correr
la eval, que ya tiene golden set.

### 1.2 El grader le compra a DataForSEO fuera del ledger de gasto

`seo_provider_spend_daily` está declarado como **fuente única de presupuesto** del módulo SEO. La
familia `serp` del ledger tiene exactamente 308 llamadas, que corresponden exactamente a los días de
rank capture. Las **35 observaciones AI Mode del grader (USD 0,0920) no aparecen en ninguna fila**.

Causa raíz: `postDataForSeoSerpLiveAdvanced` (`src/lib/ai/dataforseo.ts:303-313`) no pasa
`organizationId`, y el registro de gasto sólo ocurre si viene (`:260`).

Además **no existe presupuesto en dólares por organización para el grader**. El entitlement AEO
cuenta *runs/mes*, y el único tope en USD calcula `runs × costCeiling(light)` — cuenta corridas y
las multiplica por USD 0,50. Consecuencia medida: una org contratada puede hacer 20 runs `full` =
**USD 17,60/mes sin ningún gate de dinero**.

**La asimetría de fondo:** el lado comprado tiene un ledger que escribe el transporte en cada
llamada cobrada; el lado construido tiene un estimador que escribe el mismo código que gasta.

### 1.3 Deep imports cross-dominio contra una regla declarada, sin detector

`growth/seo` importa **14 símbolos internos desde 7 rutas** de `growth/ai-visibility` (`flags`,
`prompt-packs/prompt-set-store`, `prompt-packs/authoring`, `brand-intelligence/store`,
`ai-visibility/store`) desde `grounded-query-bridge.ts:23-37` y `grounded-query-reader.ts:15-19`.
Cero imports en reversa — el DAG es direccionalmente limpio, pero es *deep import*, no superficie
pública.

`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §17.3 dice **"NUNCA importar desde otros dominios salvo
primitives transversales canónicas"**, y `ai-visibility` no lo es. La única lint rule cross-domain
del repo (`eslint.config.mjs:333`) protege al client-portal; nada vigila `growth/*`.

**Impacto de planificación:** la premisa de `TASK-1670` ("`growth/seo` consume EXCLUSIVAMENTE la
superficie pública, nada de deep import") describe una aspiración, no el repo. Y su risk matrix pone
"revisión de código" como mitigación, que es exactamente lo que el patrón canónico #7 prohíbe: un
deep import lo crea un commit, así que el detector es de CI.

### 1.4 Otros defectos menores confirmados

- ✅ **RESUELTO 2026-08-15.** `docs/context/06_glosario-metricas.md:77,224` **y `13_icp-buyer-personas-jtbd.md:133`** (la auditoría vio 2 de 3) declaraban **Otterly.ai** como "fuente de verdad"
  del AEO Citation Rate. Es la herramienta de un competidor, no está integrada, y tenemos el Grader.
  Ese contrato de métricas viaja a propuestas y SOWs.
- **El re-grade recurrente no corre, y el motivo NO es el flag.** *(Corregido 2026-08-15 durante la
  redacción de `TASK-1707`: la primera versión de esta auditoría decía "apagado en producción, es
  rollout no construcción". Es falso en las dos mitades.)* El flag se lee **sólo** en el ops-worker,
  y `services/ops-worker/deploy.sh` lo declara `true` con `SCHEDULER_PAUSED=false` en **ambas** ramas
  de entorno —staging (`:473-474`) y production (`:513-514`), desde TASK-1321— mientras la fila 161
  del ledger sigue diciendo "prod OFF / scheduler pausado". **El ledger está stale en la dirección
  contraria a la que se supuso.**
  El blocker real es otro: **`recurring_regrade_enabled` no tiene ningún writer** en `src/` (6
  menciones, todas de lectura: el tipo, un mapeo en `store.ts` y el `WHERE` del scheduler). La
  capability `growth.ai_visibility.regrade.manage` existe y está granteada **sin command** — brecha
  de Full API Parity. Por eso el scheduler corre y reporta `skipped=no_due_profiles`: no hay forma
  gobernada de inscribir un perfil. **Prender el flag es un no-evento; el entregable es el command
  que falta.**
- **`validate_micromarkup: true` se setea y `/v3/on_page/microdata` nunca se llama.** *Corregido
  2026-08-15:* el flag **no tiene costo listado** (no está entre los multiplicadores de OnPage) y su
  rollup `has_micromarkup_errors` **sí se consume** (`findings-map.ts:59` ← `collect.ts:48`). O sea:
  sabemos *si hay* errores de schema por página y no *cuáles*. Es oportunidad gratis no capturada,
  **no dinero tirado** — `TASK-1705` se scopea sobre el detalle faltante, no sobre un ahorro.
- **`seo_competitors` existe en el schema y no tiene un solo consumidor** en `src/` (única aparición:
  `src/types/db.d.ts`).
- **El 36% de las observaciones del grader terminan `skipped` o `failed`.** *Cifra corregida
  2026-08-15: la primera versión decía «32% (242 de 767)» — mal por dos motivos, el conteo omitía los
  3 `failed` de anthropic (son 245, no 242) y el denominador incluía **102 observaciones de adapters
  `fake-*`**. Limpio de tráfico de prueba: **239 de 665 = 35,9%**, y `google_ai_overview`
  **84/107 = 78,5%**, no 71%.* Más de un tercio de la matriz no produce evidencia y no está en ningún
  tablero — misma causa raíz que los demás errores de esta sección.

---

## 2. Economía medida

Todas las cifras de esta sección salen de consultas de solo lectura contra la base real, salvo lo
marcado como estimado.

### 2.1 Lado proveedor (DataForSEO)

`seo_provider_spend_daily`, 10 días, 2 organizaciones:

| familia | llamadas | USD | USD/llamada |
|---|---:|---:|---:|
| serp (rank capture) | 308 | 1,3440 | **0,004364** |
| backlinks | 8 | 0,1923 | 0,024 |
| labs | 17 | 0,1697 | 0,010 |
| onpage | 4 | 0,0465 | 0,012 |

**Mes completo del stack para el cliente real (`berel.com`, 31 keywords):**

```
rank capture 31 kw × 30 días   USD 4,06
backlinks semanal              USD 0,21
site audit onpage semanal      USD 0,07
keyword market data mensual    USD 0,17
                               ─────────
TOTAL                          USD 4,51 / mes / cliente
```

**El rank capture es el ~90% de la factura variable** (*corregido: la primera versión decía 98%*; con el modelo del propio documento es 4,06/4,51 = **90,0%**, y contra dólares medidos en el ledger 1,3440/1,7525 = **76,7%**). Todo lo demás junto suma USD 0,45 — que sobre 4,51 es exactamente el 10% que el «98%» negaba. **Consecuencia:** las otras familias pesan el doble de lo que se creía, lo que aumenta el retorno relativo de `TASK-1705` (OnPage gratis) y `TASK-1708`.

**Techo mal calibrado:** el tope de keywords seguidas es 200 por target. A 200 keywords la misma
corrida diaria cuesta **USD 26,18/mes** a tarifa medida (USD 48/mes a tarifa de lista con los
multiplicadores) contra un budget `contracted` de USD 50. El techo de keywords y el techo de
presupuesto están calibrados uno contra otro **por accidente, no por diseño**. Y seguir una keyword
es un write que **no pasa por ningún gate de presupuesto**, aunque compromete gasto recurrente.

**Multiplicadores silenciosos:** el rank capture paga `base × 2 (load_async_ai_overview) × 2
(depth 20)`. El `depth 20` está bien justificado —la posición útil vive entre 8 y 20—, pero el
multiplicador ya pagado también compra las filas de todos los competidores del top-20, y
`parseSerpRankObservation` (`rank-capture.ts:171-221`) las recorre y **las descarta**. El AIO corre
en todas las keywords todos los días, cuando la presencia de AI Overview no es señal diaria.

### 2.2 Lado motor propio (grader)

Vida completa: **45 runs, 767 observaciones, USD 9,4222** de `estimated_cost_usd`.

| modo / run_kind | runs | promedio USD |
|---|---:|---:|
| `light` / `public_diagnostic` | 13 | 0,2627 |
| `full` / `internal_audit` | 3 | 0,8813 |
| `light` / `smoke` | 25 | 0,0673 |

**Costo por observación, por motor.**

> 🔴 **TABLA CORREGIDA 2026-08-15.** La primera versión dividía el gasto por un denominador que
> incluía **96 observaciones de adapters `fake-*` con costo CERO**, y mezclaba los 28 de 45 runs que
> son `run_kind='smoke'`. **Cuatro de las cinco filas estaban mal.** Los valores por llamada
> realmente pagada son: openai **0,038417** (no 0,0323) · anthropic 0,084487 (correcto, es el único
> sin fakes) · gemini **0,005242** (no 0,0040; y son tres modelos distintos, no uno) ·
> google_ai_overview **0,004000** (no 0,0026) · perplexity **0,000670** (no ~0,0055 — ese número no
> se reproduce desde ninguna cifra del repo; si viene del cargo de búsqueda de Perplexity, entonces
> `cost.ts` **subcuenta ese proveedor ~10×** y sería un hallazgo mayor que este error de tabla).
>
> **Efecto en las conclusiones:** gemini deja de estar a la par de una medición SERP (0,9×) y queda
> **1,2×**, o sea 20% por encima. La dirección del arbitraje sobrevive con holgura —gemini sigue
> siendo 7,3× más barato que openai—, pero las comparaciones de §2.3 y la tabla comprar-vs-construir
> se leen con estos números, no con los de abajo.
>
> **Causa raíz, y es la misma de otros cuatro errores de esta sección:** se consultó
> `provider_observations` **sin filtrar el tráfico de prueba**. Regla que queda: toda consulta de
> costo del grader excluye `model LIKE 'fake-%'` y declara si incluye `run_kind='smoke'`.

(valores originales, conservados para trazabilidad — **no usar**):

| provider | modelo real | obs OK | USD/obs |
|---|---|---:|---:|
| anthropic | `claude-sonnet-4-6` | 30 | **0,0845** |
| openai | `gpt-4.1` | 189 | **0,0323** |
| perplexity | `sonar` | 111 | ~0,0055 |
| gemini | `gemini-3-flash-preview` | 157 | **0,0040** |
| google_ai_overview | DataForSEO AI Mode | 35 | 0,0026 |

**El gasto se concentra brutalmente:** OpenAI USD 6,11 + Anthropic USD 2,53 = **USD 8,64 de USD 9,43
(92%)**, con sólo 219 de 522 observaciones exitosas. Gemini hizo 157 observaciones por USD 0,63.

> **Nota de cobertura.** El grader mide **cinco motores en dos superficies**: `answer_engines`
> (OpenAI/ChatGPT, Anthropic/Claude, Perplexity, Gemini — cuatro adapters propios contra sus APIs)
> y `ai_search` (Google AI Overview / AI Mode, vía DataForSEO porque Google no expone API). El
> modelo registrado para ese último es `dataforseo/google-ai-mode-live-advanced`. La elección de
> Gemini como extractor de prosa es un eje distinto: es la **herramienta** de extracción, no la
> cobertura de motores.

### 2.3 La comparación que ordena la decisión

| Comparación | Resultado |
|---|---|
| 1 run `full` (USD 0,88) vs mes completo del stack proveedor (USD 4,51) | **19,6% — casi 6 días** |
| 1 run `full` expresado en mediciones de ranking | **202 posiciones SERP** |
| 1 observación OpenAI vs 1 medición SERP | **7,4× más cara** |
| 1 observación Anthropic vs 1 medición SERP | **19,4× más cara** |
| 1 observación Gemini vs 1 medición SERP | **paridad (0,9×)** |

### 2.4 El N=3 no cabe en su propio techo

La calibración (`GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` §5.bis) midió que las señales
intermitentes (colisión de entidad) aparecen 1/3 y 2/3 de las veces, y recomienda **N≥3** para esas
dimensiones. Costo: USD 0,88 × 3 = **USD 2,64**, que **rompe el techo de USD 2 del modo `full`**.

El muestreo que la propia calibración exige es hoy estructuralmente imposible. Con Gemini como
modelo por defecto sí cabe.

---

## 3. Brechas de capacidad, por eje

### 3.1 Oficio SEO

| # | Brecha | Tamaño |
|---|---|---|
| S1 | **No existe una cola priorizada única.** ~~discovery ordena por `captured_at DESC`~~ 🔴 **REFUTADO 2026-08-15:** discovery tiene un sort compuesto de 8 llaves (`reader.ts:395-434`, mergeado en `522460b17` el 2026-08-14, **un día antes de esta auditoría**) donde `capturedAt` es el 7.º desempate. **La brecha es real y el argumento correcto es más fuerte:** hay *cuatro* criterios de orden, cada uno bien pensado y **ninguno comparable con los otros** — nadie puede decir cuál de los cuatro #1 va primero. Y `TASK-1669` se prohíbe resolverlo, dejando el modelo huérfano. | L |
| S2 | **El SERP completo se paga y se tira.** Costo marginal cero para persistir el top-N; **costo de oportunidad diario** porque no se recupera hacia atrás sin volver a comprarlo. Es sustrato de S3 y S4. | M |
| S3 | **Estacionalidad.** La serie de 12 meses viene dentro del `keyword_info` que ya se compra; se guarda como escalar plano. Sin ella, "¿qué escribo en agosto para el pico de noviembre?" no se puede responder. | S |
| S4 | **Clustering propio.** `coreKeyword` **no agrupa nada** (cero `GROUP BY`), pero *corregido:* no es dato inerte — tiene 4 consumidores (llave #4 del orden de discovery, contexto del LLM autor, `coverageTokens` de la verificación determinista de TASK-1666, y UI). Una task que lo trate como campo muerto **rompe el orden del inbox y la cobertura de seeds**. Discovery devuelve 500 candidatos sin decir cuántas páginas son: el módulo fabrica la canibalización que la otra pantalla detecta. | M |
| S5 | **SERP features capturadas y colapsadas a un booleano de AI Overview.** PAA, video, local pack, shopping: capturados, invisibles. Cambian el formato ganador, no sólo el CTR. | S–M |
| S6 | **Valor comercial por keyword.** `cpc_usd` se captura y sólo se pinta en el drawer. `src/lib/growth/ga4/` **sí tiene consumidores** (*corregido:* dos scripts en `scripts/ga4/`, con auth por impersonación **ya verificada**); lo que falta es consumer de runtime y superficie. El trabajo pendiente es menor de lo estimado. | M |
| S7 | **Nada avisa.** El módulo es 100% pull. Las señales de reliability vigilan el pipeline, no al cliente. | M |
| S8 | **Consolidación no es una acción del sistema.** La canibalización se detecta y se etiqueta; no hay camino para "estas dos URLs se fusionan, 301 de A a B". | S–M |
| S9 | **Linking interno.** Única señal de estructura: `is_orphan_page`. El endpoint `links` es gratis post-crawl. | M |
| S10 | **GSC en 2 de 5 dimensiones.** Falta `country` (crítico multi-mercado, caso Berel) y `device`. 🔴 **Sizing REFUTADO:** no es «cuota de filas, no dinero» ni tamaño `S`. `UNIQUE (organization_id, capture_date, query, page)` hace que las filas país×device **colapsen sobre la misma clave y el UPSERT sobrescriba en silencio**. Es migración + cambio de clave única + backfill. | **M/L** |

### 3.2 AEO / GEO

| # | Brecha | Tamaño |
|---|---|---|
| A1 | **No existe capa de citabilidad de contenido. El módulo mide el envase, nunca el texto.** Ni una señal sobre H2 como pregunta, respuesta autocontenida, densidad de datos, citas a fuentes, tabla/lista, `dateModified`, byline. Es la palanca con **mejor evidencia primaria** del oficio. | M |
| A2 | **La recomendación nunca aterriza en una URL.** 6 plantillas fijas por dimensión driver; el content brief nace con `target_url` en `pendingFields` y la línea literal *"URL destino: pendiente de definir."* | M |
| A3 | **Query Fan-Out está etiquetado, no modelado.** `fanOutType` es un tag plano sobre 12–16 preguntas; no hay estructura raíz → sub-consultas ni cobertura por raíz. | M |
| A4 | **Se sabe QUIÉN gana, no POR QUÉ ni DÓNDE.** El breakdown agrega a dominio registrable; falta el nivel URL de terceros y la lista de páginas que forman la respuesta de la categoría. | S–M |
| A5 | **El loop no cierra: la verificación se ancla al score, no a la pregunta.** No hay reader de trayectoria por `(prompt, motor)`. El score agregado se mueve por varianza de muestreo. | M |
| A6 | **Probes de entidad sin modelo de entidad.** El JSON-LD entregable nace con `sameAs: []`. `message_alignment` se mide contra nada declarado (ver §1.1). | M |
| A7 | **Tráfico y crawl reales de IA fuera del radar.** No se mide referral de `chatgpt.com`/`perplexity.ai`, ni hits de `GPTBot`/`OAI-SearchBot` en logs. `TASK-1284` está `to-do` con `Epic: none`, huérfana. | S–M |

### 3.3 Capacidad ociosa del proveedor

| Endpoint | Costo | Qué desbloquea |
|---|---|---|
| `on_page/microdata`, `duplicate_tags`, `links`, `redirect_chains`, `non_indexable` | **USD 0** (gratis 30d post-crawl) | Validación de calidad del JSON-LD, duplicados, cadenas de redirect, grafo de enlaces internos. Leemos 2 de ~13 endpoints. |
| `dataforseo_labs/ranked_keywords` con `item_types: ai_overview_reference` | **USD 0,132**/target/corrida | Toda la superficie ranqueada + momentum + `estimated_paid_traffic_cost` + **en qué keywords el AI Overview nos cita**. 1% de lo que cuesta el rank capture. |
| `backlinks/competitors` + `domain_intersection` | **USD 0,05**/corrida | Link gap: dominios que enlazan a la competencia y no a nosotros. Brief de outreach. |
| `historical_keyword_data` | precio **no verificado** | "¿bajé yo o bajó la demanda?" |
| `people_also_ask_click_depth` | USD 0,00015/click | Árbol PAA sobre la misma llamada SERP. |
| `content_parsing/live` con `markdown_view` | **USD 0,00015/pág** | Chunking natural para citabilidad **sin construir scraper propio**. |
| `competitors_domain` / `serp_competitors` / `bulk_traffic_estimation` | ~USD 0,03 | Descubrir *quién* es el competidor (`TASK-1662` asume que ya lo conoces). |

**Advertencia sobre `TASK-1651`:** LLM Mentions cubre **sólo ChatGPT US/English + Google AI
Overview**. Para Berel (CL/MX) sólo aplica el lado google — **la mitad del valor prometido no existe
para el cliente que tenemos**. LLM Scraper sí funciona en es-LATAM y cuesta ~80× menos por
observación. Conviene revisar el orden de esa task.

### 3.4 Valor comercial

| # | Brecha | Tamaño |
|---|---|---|
| C1 | **El cliente ve estado, no trabajo.** No existe la cadena decisión → acción → resultado. El dato base ya existe: la membresía del set es append-only con `intent_declared_by` e `intent_declared_at`. | M |
| C2 | **El eje AEO del 360 es una foto, y en producción está vencida** (ver §1.4). ⚠️ **No es rollout: es construcción.** Falta el command que inscribe un perfil (`recurring_regrade_enabled` no tiene writer), no el flag. | M |
| C3 | **El informe no sale de la plataforma.** Ruta autenticada con `?print=1`; sin enlace compartible, caducidad, revocación ni señal de apertura. El patrón existe dos veces en el repo. | M |
| C4 | **Los clics existen y no llegan a la cara del cliente.** `read-overview-kpis.ts` ya los calcula; el cliente ve rank y quadrant. Primer escalón real desde posición hacia plata. | **S** |
| C5 | **Sin competencia no hay marco de renovación.** `seo_competitors` sin consumidores. | M/L |
| C6 | **De clics a leads:** cero conexión con GA4/HubSpot desde SEO, aunque `src/lib/growth/ga4/` ya tiene cliente con token provider inyectable y el patrón per-org corre en producción en Search Console. | L |
| C7 | **No hay carril de prospecto en SEO.** DataForSEO mide cualquier dominio sin acceso del cliente; Search Console no. El módulo puede diagnosticar a un prospecto sin pedirle nada. | M |
| C8 | **La auditoría no ve el punto ciego que más nos importa** (`TASK-1670`) ni sale de la pantalla (`1672`/`1673`). Orden crítico: publicar el artefacto antes de 1670 sería firmar un documento que declara sano un sitio invisible para la IA. | M |
| C9 | **La superficie sirve al cliente con historia, no al nuevo** (`TASK-1690`). El cliente #2 estrena el defecto. | S/M |
| C10 | **El cuello de botella humano sigue entero** (`TASK-1667`/`1668`/`1669`). Diferencia entre un operador con 3 cuentas y uno con 8. | L |

---

## 4. Motor propio vs proveedor: la línea

**Regla de decisión adoptada** (directiva del operador, 2026-08-15): el motor propio es el default y
reutilizarlo al máximo es el objetivo, **pero sólo donde realmente se justifique** — si DataForSEO
mide algo mejor, se usa DataForSEO. El motor propio gana los empates y gana donde alcanza; el
proveedor gana donde mide mejor de verdad. Está prohibido elegir por inercia hacia cualquier lado.

| Capacidad | Motor propio | Proveedor | Decisión |
|---|---|---|---|
| Posición orgánica | no aplica (un LLM no da posición) | USD 0,004364 medido | **Comprar** |
| Volumen / dificultad / clickstream | imposible sin paneles | USD 0,012 + fila | **Comprar** |
| Backlinks de terceros | requiere crawler web-scale | USD 0,024 + fila | **Comprar** |
| AI Overviews / AI Mode | Google no expone API | USD 0,0026/obs | **Comprar** |
| Crawl + listado de URLs | fetcher secuencial bajo timeout | USD 0,00015/pág, reads gratis 30d | **Comprar** |
| **Parseo de contenido de 100 URLs** | USD 0,27 (gemini) a USD 6,30 (claude) | **USD 0,015** | **Comprar** (18×–420×) |
| **Juicio de citabilidad de esas 100 URLs** | USD 0,27–2,10 | **no existe producto** | **Construir** |
| Percepción de marca en 4 chatbots | USD 0,26 `light` / 0,88 `full` | LLM Responses (fuera de allowlist) | **Construir hoy**, evaluar comprar |
| Exactitud de lo que la IA dice de la marca | detector determinista + LLM | **no existe producto** | **Construir** |
| Core Web Vitals | headless propio = lab, caro | CrUX gratis (campo) | **Comprar/gratis** |

### El hallazgo que reconcilia los dos lados

**El proveedor no compite con el motor propio: lo abarata.** Parsear 100 URLs con
`content_parsing/live` cuesta **USD 0,015** y ahorra entre **USD 0,42** (Gemini) y **USD 2,80**
(GPT-4.1) de tokens, porque evita mandarle HTML crudo al modelo. Retorno de **28× a 187×**.

> **Regla operativa:** nunca le mandes a un modelo un byte que un parseo de USD 0,00015 podía haber
> comprimido.

### Las tácticas con mejor evidencia son deterministas

Las tres del paper GEO con lift medido (citas textuales +41%, estadísticas +32%, fuentes enlazadas
+30%) y el predictor #1 de Ahrefs sobre 1,4M de prompts (relevancia semántica del H2 frente a la
sub-pregunta) **se miden extrayendo estructura del HTML — cero tokens**.

**Invariante que esto debe respetar:** el motor garantiza hoy que mismo `score_version` + mismos
findings = mismo score. Un score de citabilidad producido por un LLM rompe esa reproducibilidad, y
con ella la defensa del reporte ante un cliente que pregunta por qué bajó. Por lo tanto: **las
señales que puntúan son las deterministas; el LLM sólo produce el juicio cualitativo que acompaña, y
nunca mueve el número.**

### Dónde NO conviene motor propio

Dato de mercado agregado (imposible, no caro), crawl a escala, AI Overviews, Core Web Vitals,
cualquier número que se le muestre al cliente como score, y **fetchear el sitio de un competidor** —
`resolveProbeUrl` bloquea cross-host por diseño (`safe-fetch.ts:72`), y levantarlo es una decisión
legal y reputacional, no de implementación.

---

## 5. Decisiones de arquitectura

### 5.1 No hay "motor de medición canónico". Hay un sustrato de sitio.

**Veredicto: dominios separados para siempre.** Lo que se extrae es un primitive mucho más chico:
`site-substrate` = fetcher con guarda SSRF + parseo HTML/texto.

**Regla a grabar: se comparte cómo se OBTIENE la evidencia; nunca cómo se JUZGA.**

Lo compartible vive río arriba del juicio (`probes/safe-fetch.ts` es `server-only`, puro sobre HTTP,
sin una referencia a `grader_*`; `probes/html.ts` no importa nada). Lo que separa vive río abajo: un
score versionado episódico con review gate humano contra una serie temporal continua con ledger de
gasto. Fusionarlos obliga a reconciliar dos monedas y dos cadencias, y es **una puerta de una sola
dirección**: recalibrar SEO invalidaría reportes AEO ya entregados a clientes.

El tercer consumidor del sustrato ya existe dentro del propio grader: `fetch-site-content.ts:15`
reusa `createProbeFetcher` y su docstring declara *"el probe es TÉCNICO y no extrae prosa — this is
the missing piece"*. Tres consumidores = umbral de patrón canónico.

**Qué se comparte y qué no:**

| Pieza | Veredicto | Costo de equivocarse |
|---|---|---|
| `safe-fetch.ts` | **Compartir**, un solo dueño | Divergencia silenciosa de una guarda SSRF. Alto y no observable |
| `html.ts` + `htmlToReadableText` | **Compartir** | Bajo, pero gratuito de evitar |
| Cliente LLM (`src/lib/ai/*`) | Ya compartido, mantener | — |
| Patrón de router cheap-first | Compartir el **patrón**, no el módulo | Un 4.º router copiado diverge en fallback |
| **Scoring versionado** | **Duplicar deliberadamente** | **Máximo**: un `score_version` compartido hace que recalibrar SEO invalide reportes AEO entregados |
| Autoría de prompts | **No mover.** Queda en AEO, SEO la consume vía command | Alto: el sanitizer no-leading evita que el grader se autoconfirme |
| Review gates | **No compartir** | Medio: agregaría aprobación humana a un flujo continuo, y alguien la desactivaría |
| Entitlement / gate de gasto | **No compartir el resolver. Sí la FORMA** | **Alto y silencioso**: el análisis de contenido dentro de AEO gastaría fuera de `seo_provider_spend_daily` |

### 5.2 La cola priorizada: aggregate persistido, no reader en vivo

**Veredicto:** `greenhouse_growth.seo_work_queue_{snapshots,items}` append-only, materializado por
job en ops-worker, con score versionado en columna.

Tres razones, en orden de peso:

1. **Un origen no se puede unir por SQL.** `readSeoAeoGap` son dos queries unidas en memoria por
   diseño; el propio archivo declara que unirlas por SQL *"es la violación más cara posible acá"*.
   Una VIEW queda descartada de entrada. El gap entra como filas con `origin='aeo_gap'` y una
   `evidence_ref` **opaca** — nunca FK, nunca JOIN.
2. **`TASK-1669` pide reproducibilidad.** Exige `inputSnapshotHash`, `expiresAt` y detección de
   `stale`. Un reader que reordena en cada llamada hace que "la recomendación #1 de la mañana" sea
   inauditable a las 3 pm.
3. **El score de prioridad ya existe y NO está versionado.** `keyword-opportunities-reader.ts:44-52`
   tiene `DEFAULT_TARGET_POSITION = 5`, percentil 0.75 y piso de 10 impresiones como constantes de
   módulo. Cambiar cualquiera mueve el ranking histórico sin dejar rastro.

**Contrato único para los 4 consumidores** (UI, Nexa, MCP, portal cliente):

```
readSeoWorkQueue({ seoTargetId, origins?, limit, cursor })
  → { snapshot, items, originHealth, priorityScoreVersion, asOf, staleness }
materializeSeoWorkQueue({ seoTargetId, actor })   → command idempotente
recordSeoWorkQueueDecision({ itemId, decision })  → log append-only, NO ejecuta el command
```

**Invariantes:** vocabulario cerrado de `origin` con CHECK; un origen caído se declara en
`origin_health_json` y no baja el score de los demás; **nunca se promedian orígenes** (un objetivo
declarado en posición 60 es distancia por recorrer, no urgencia); recomputar = fila nueva, jamás
UPDATE; cambiar un peso obliga a `priority_score_version` nueva.

### 5.3 El análisis de contenido nace en `site-substrate` y emite hechos, no veredictos

La pregunta "¿es citable este texto?" suena AEO, pero su shape la delata: es **por URL y continua**,
y el grader es **por dominio y episódico**. Y `seo/site-audit` es un passthrough de DataForSEO
("encolar, esperar, cosechar"), no "fetch propio + parse + LLM".

```ts
analyzeUrlContent(url) → {
  fetch:     { ok, status, finalUrl, errorCode },
  structure: { headings[], questionHeadings[], wordCount, jsonLdTypes[], lastModified },
  readable:  { text, truncated },
  prose?:    { answerCapsulePresent, claimsWithoutEvidence[], entityMentions[] }  // LLM, gated
}
```

**Cero score.** SEO los convierte en `priority_score` con su config versionada; AEO en evidencia de
`citation_quality` con la suya. Mismo dato, dos veredictos.

### 5.4 Sobre TASK-1670

Midió bien y decidió bien (23 archivos dependen del sustrato; moverlo como refactor es re-apuntar la
fundación de un motor verde por estética). **Que shippee como está**, con dos correcciones:

- **La superficie no va en `probes/public.ts`.** El barrel de dominio ya existe
  (`ai-visibility/index.ts`); y lo que SEO consume no es "el probe layer" sino el sustrato —
  exportarlo con nombres que lo digan (`SiteFetcher`, `analyzeDomSemantics`), no `Probe`.
- **El follow-up "extracción a `search-visibility/`" está sobredimensionado** y por eso no va a pasar
  nunca. Mover 2 archivos puros + 3 tipos a `growth/site-substrate/` con re-export shim (los 23
  archivos no cambian una línea) es una tarde. El disparo de ese movimiento es el tercer consumidor,
  que es el análisis de contenido.

### 5.5 Red-team: el modo de falla más probable

**No es técnico: es que la cola se construya y `TASK-1669` la ignore.** 1669 tiene su propio
`context-reader` y su propio "Priority ordering V1" en sus archivos owned. Si avanzan en paralelo sin
contrato firmado, quedan **dos ordenamientos que discrepan** —uno por score versionado, otro por
`reason_code`— y el operador ve un #1 en la pantalla y otro en el plan del día.

*Mitigación:* la cola llega antes; el `context-reader` de 1669 se reduce a envoltorio de
`readSeoWorkQueue`; su "Priority ordering V1" deja de ser código y pasa a ser la config versionada de
la cola. Más un test de paridad de orden.

**Segundo modo de falla:** `site-substrate` se vuelve un dominio por acreción. *Mitigación:* regla
dura verificable por lint — **no importa nada de `growth/*` y no persiste nada**. Cero Postgres,
cero outbox, cero flags de dominio. Mismo patrón que `artifact-composer` ya tiene.

**Lo único irreversible** es el `priority_score_version` desde que un cliente vea un plan basado en
él. Por eso el versionado y el `score_breakdown_json` van en el **primer** slice de la cola.

---

## 6. Lo que no se debe construir todavía

- La reorganización `search-visibility/` con SEO y AEO como sub-motores (mover ~70 archivos por
  estética; el gatillo legítimo es extraer AEO a paquete propio o un tercer motor).
- **Cualquier fusión de scores.** Ni un "Search Visibility Score" único ni promediar cuadrantes. La
  ortogonalidad **es** lo que se vende: rankear #1 sin ser citado es la señal.
- Ejecución autónoma de recomendaciones de la cola. La cola propone, el humano confirma.
- Análisis de contenido a escala de sitio completo antes de que exista el gate de tokens per-org.
- Headless / Core Web Vitals (`TASK-1281`).
- Federar la cola al gateway MCP externo antes del read tool interno.

---

## 7. Lo que no se debe prometer todavía

> ⚠️ **Añadido 2026-08-15 tras corrección del operador — sobreventa competitiva.**
> Este documento afirmó que la métrica de clics incrementales verificable en Search Console era algo
> que *"ninguna herramienta del mercado puede decir porque no tiene los datos del cliente"*. **Es
> falso.** Semrush, Ahrefs, SEOClarity, Conductor y BrightEdge **conectan Search Console**, y varias
> ya exponen *quick wins* / *striking distance* con ganancia proyectada de clics desde esa misma
> fuente. La métrica es **table stakes**, no diferenciación.
>
> Lo que sí es defendible, dicho con precisión: **(a)** la curva de CTR se deriva del **propio sitio**
> y no de una tabla de industria, lo que absorbe la depresión de clic por AI Overviews en ese
> vertical sin tener que estimarla ni discutirla; **(b)** el **mismo score ordena cuatro orígenes**
> —incluido el gap AEO—, que es una integración que las suites no hacen porque no miden el eje AEO
> con motor propio; y **(c)** la decisión, la acción y su resultado viven en la **misma plataforma**
> donde se opera la cuenta: una herramienta entrega una lista, no registra quién decidió qué ni qué
> pasó después.
>
> **Nunca usar "ninguna herramienta puede" en material comercial.** Es la misma clase de error que
> Otterly.ai: una afirmación cómoda que un evaluador desmonta en una búsqueda, y que en esta
> categoría —donde el comprador ya salió escaldado— cuesta la credibilidad de todo lo demás.


- **Comparativa competitiva** (`seo_competitors` sin consumidores).
- **Tendencia de citación IA** — no porque el re-grade esté "pausado" (**no lo está**, ver §1.4) sino porque **nadie puede inscribir un perfil**: `recurring_regrade_enabled` no tiene writer. Sin inscripción no hay serie.
- **"Tu sitio está sano"** apoyado en el audit (no detecta bloqueo a crawlers de IA:
  un sitio invisible para los motores puede puntuar 95/100).
- **Atribución de ingresos a citación en IA** (no existe el modelo; los estudios se contradicen en
  el signo).
- **Autoservicio SEO completo en el portal** (backlinks y site audit no tienen cara cliente).
- **Casos con número** (Sky +127%, Bresler +180% están sin verificar).
- **Berel en Chile** — se mide en México (`ISSUE-152`); y la dificultad de keyword no se le muestra a
  un cliente.
- **Search Visibility 360 como producto autónomo** — el propio `EPIC-022` lo declara
  `validation_only`.

Y una nota de honestidad técnica: la **cápsula de 40–60 palabras** que nuestro propio fix-it escribe
cita un base rate **sin grupo de control**, y la fuente original define la cápsula en ~20–25
palabras. Está bien hacerlo como craft; está mal presentarlo como probado. Igual con los lifts del
paper GEO (medidos sobre GPT-3.5 + top-5 de Google, con métrica de proporción de palabras
atribuibles): sirven para ordenar tácticas, no para prometer resultados.

---

## 8. Higiene documental pendiente

- ✅ `docs/context/06_glosario-metricas.md:77,224` + `13_icp-buyer-personas-jtbd.md:133` — Otterly.ai retirado el 2026-08-15, reemplazado por el motor propio con su cobertura real (5 motores, 2 superficies) y la advertencia de que la cadencia recurrente no está operativa.
- `FEATURE_FLAG_STATE_LEDGER.md` — resolver el conflicto aparente de `REGRADE` y `FIX_IT`
  verificando con `vercel env ls` **y** con la revisión activa del ops-worker (son runtimes
  distintos; el flip del 2026-06-30 tocó Vercel, el flag se lee en el worker).
- `TASK-1670` — corregir la premisa de "cero deep imports" y el nombre de la superficie.
- `TASK-1651` — declarar la limitación de cobertura es-LATAM de LLM Mentions.
- `TASK-1669` — agregar la cola a `Depends on` y retirar su ordenamiento propio.
- `EPIC-022` — el margen de Berel sigue sin medirse pese a que el costo variable por org se conoce
  al dólar.

---

## Referencias

- Delta de defectos ya corregidos: `docs/tasks/complete/TASK-1665-growth-seo-keyword-discovery-workbench.md` (§Delta 2026-08-15)
- Arquitectura SEO: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- Arquitectura AEO: `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- Calibración del grader: `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md`
- Patrones canónicos: `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
