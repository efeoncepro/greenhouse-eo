# Teardown competitivo — OpenSEO frente a Growth SEO/AEO

> **Tipo de documento:** Auditoría competitiva de un producto externo + auditoría de brechas propias
> **Fecha:** 2026-08-26
> **Sujeto externo:** `every-app/open-seo` (MIT, TypeScript, 13.599 ★, 1.623 forks, v0.1.6,
> creado 2026-02-27, HEAD 2026-08-24) — sitio `openseo.so`
> **Alcance propio:** `src/lib/growth/seo/**` · `src/lib/growth/ai-visibility/**` ·
> `src/mcp/greenhouse/**` · repo hermano `efeonce-mcp` · `src/lib/growth/search-console/**` ·
> `src/lib/growth/ga4/**`
> **Método:** lectura del código del sujeto vía API de GitHub (nunca su README ni su marketing),
> contrastada contra nuestro runtime en `develop`; ocho análisis independientes en dos vueltas;
> los hallazgos sobre nuestro repo, verificados a mano contra el código
> **Antecedente directo:** [`2026-08-15-growth-seo-aeo-module-opportunity-audit.md`](2026-08-15-growth-seo-aeo-module-opportunity-audit.md)
> **Documentación técnica:** `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` ·
> `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` ·
> `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` · `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`

---

> ## ⚠️ Estado de verificación — LEER ANTES DE TOMAR UNA TASK DERIVADA
>
> La auditoría del 2026-08-15 sobre este mismo dominio publicó afirmaciones falsas y tuvo que
> corregirlas con una pasada adversarial. Su lección fue **leer una fuente sin verificar qué
> representa**. Este documento aplica esa lección por adelantado separando dos clases de afirmación.
>
> **Clase A — verificado a mano contra el código o contra el servicio en vivo.** Se puede tomar como
> base de una task sin re-verificar la existencia del hecho (sí re-verificar que no haya cambiado).
>
> **Clase B — proviene de un subagente que leyó el repo externo y no fue verificado
> independientemente.** Sirve para decidir dirección; **no se cita hacia afuera** (propuesta, SOW,
> reporte a cliente) ni se convierte en premisa de implementación sin comprobarlo.
>
> Todo hallazgo de §3 lleva su clase. Los números de OpenSEO (conteo de tools, taxonomía, costos)
> son **Clase B en bloque**: describen un repo ajeno en movimiento, con 79 commits en 30 días.
>
> **Regla heredada del antecedente:** si el código dice otra cosa que este documento, manda el
> código y se corrige el documento.

> ### 🔴 Correcciones a la v1 de este documento (2026-08-26, misma fecha)
>
> Una pasada de reconciliación contra las **76 tasks** del carril —no las ~35 que estimé— encontró
> cuatro errores en la primera versión. Se corrigen en línea; se listan acá para que nadie cite la
> versión vieja:
>
> 1. **§3.1 no es un hallazgo nuevo.** La guarda de redirects ya estaba archivada como `ISSUE-164`
>    (`open`, detectada el mismo día) con `TASK-1778` como fix, que además cubre más: tope de saltos
>    con revalidación de cada `Location`, y resolución DNS.
> 2. **§3.7 afirmaba que el reporte «no puede decir que describe una muestra». Es falso.**
>    `SiteAuditView.tsx:440,566` ya lo declara desde `TASK-1309` (`complete`), con copy dedicado. Lo
>    que falta es precisión: descansa en el proxy `crawledPages === crawlPageCap`, que da falso
>    positivo con un sitio de exactamente 100 páginas y falso negativo si el crawl paró por otra razón.
> 3. **Medir móvil ya está implementado.** `SUPPORTED_DEVICES` incluye `mobile` y el batch acepta el
>    parámetro; `DEFAULT_DEVICES = ['desktop']` es una **decisión de gasto** (cada device duplica el
>    costo), no un gap de ingeniería.
> 4. **El techo de gasto server-side ya existe para SEO.** `enforceSeoRunEntitlement` valida
>    `estimatedCostUsd` contra `budgetRemainingUsd`, y dos callers re-consultan el gate dentro del
>    bucle. El hueco real es otro, y está en §3.10.

---

## 1. Por qué se hizo esta auditoría

OpenSEO se viralizó a fines de agosto de 2026 como «la alternativa open source a Semrush y Ahrefs».
Es MIT, es MCP-native y cubre la misma superficie que nuestro módulo Growth SEO. La pregunta no era
si compite —no compite— sino **qué resolvió mejor que nosotros y qué destapa de nuestro propio
producto al ponerlo al lado**.

La respuesta corta: nos llevó a ocho hallazgos sobre nosotros mismos, de los cuales **dos son
defectos de contrato, uno es de seguridad y tres son valor comprado y no entregado**. El sujeto
externo terminó siendo menos interesante que el espejo.

## 2. Qué es OpenSEO, en frío

| Señal | Valor | Lectura |
|---|---|---|
| Estrellas / forks | 13.599 / 1.623 | Viral real |
| Contribuidores | `bensenescu` 449 commits; el segundo, 6 | **Bus factor de 1** |
| Versión | v0.1.6 | Seis meses de vida, sin API estable |
| Actividad | 79 commits en 30 días | Vivo y moviéndose rápido |
| Backlog | 45 issues abiertos, **68 PRs sin mergear** | Las estrellas trajeron colaboradores que el mantenedor no absorbe |

Stack real (Clase B): Cloudflare Workers edge-first, TanStack Start, Drizzle con doble dialecto
(D1 SQLite por defecto, Postgres opt-in vía Hyperdrive), Cloudflare Workflows + Durable Objects para
jobs, R2/KV como capa de caché, billing en Autumn con markup 1,28× hardcodeado en código compartido.
Su README no menciona nada de esto.

**Conclusión de aptitud:** vitrina de ideas excelente, dependencia pésima. No se adopta su código ni
se depende de su MCP. Se le roban decisiones de diseño, que es legal y gratis.

## 3. Hallazgos sobre Greenhouse

Ocho. Ninguno depende de OpenSEO; aparecieron al mirar nuestra superficie con los mismos ojos.

### 3.1 🔴 El fetcher de probes promete un límite de redirects que no implementa — **Clase A** · *ya archivado*

`src/lib/growth/ai-visibility/probes/safe-fetch.ts:10` afirma en su docstring:
*«`redirect: 'follow'` acotado al mismo registrable host (no se persigue cross-host)»*.

El código pasa `redirect: 'follow'` (línea 100) y usa `const finalUrl = response.url || target` (109)
**solo como etiqueta en el valor de retorno**. Nunca revalida el host final contra el base ni contra
`isNonPublicHost`, que corre únicamente sobre la URL inicial (línea 70). Un target que responda 302
hacia una IP interna sería seguido.

🔴 **CORREGIDO 2026-08-26 — mi evaluación de riesgo era falsa.** Escribí *«riesgo bajo, el target es
el dominio del propio cliente cargado por un operador»*. La sesión dueña de `ISSUE-164` lo refutó y
verifiqué su cadena en código: **el input es anónimo, no de operador.**

1. El intake público está **vivo en producción**: `create-public-run.ts:67` evalúa el flag y devuelve
   `disabled` (→404) **antes** de validar en `:71` (→400), así que un `400` sólo es alcanzable con el
   flag encendido — y eso es lo que responde `greenhouse.efeoncepro.com` a un POST con cuerpo vacío.
2. Esa ruta es **sin sesión** y acepta un `websiteUrl` arbitrario. Su propio docblock la declara
   *«Único WRITE público del dominio. SIN sesión»*.
3. `run-engine.ts:332` llama `gatherRunProbes` como post-step **incondicional**, sin filtro por
   profundidad: un run público `light` pasa por el mismo gatherer.

Cadena real: **POST anónimo → run encolado → ops-worker → `gatherRunProbes` → `createProbeFetcher` →
redirect seguido sin revalidar → destino elegido por el emisor, fetcheado desde dentro del worker de
producción.** La fricción que queda —captcha, rate-limit, presupuesto global— es fricción de bot, no
control de acceso.

**Consecuencia para el alcance del fix:** con target semi-confiable, revalidar cada salto se siente
opcional. Con input anónimo, los Slices 1–2 de `TASK-1778` son la prioridad y el resto puede esperar.

**Riesgo mañana, además:** `TASK-1697` promueve este archivo a primitive compartido de tres consumidores.

Es exactamente el patrón *«una guarda es una afirmación hasta que el mecanismo la sostenga»*.
Contraste: OpenSEO revalida SSRF **en cada salto** y hace DNS-over-HTTPS sobre la URL de arranque
(Clase B).

**Ya tiene dueño, y no es de esta auditoría.** `ISSUE-164` lo documenta con la misma evidencia y
`TASK-1778` es su fix, con alcance mayor: tope de saltos revalidando cada `Location`, más resolución
DNS. Esta auditoría lo redescubrió; el crédito es de la pasada que lo archivó primero. Lo que falta
es **ejecución, no alcance**.

### 3.2 🔴 El servidor MCP interno se anuncia como read-only y escribe — **Clase A**

`src/mcp/greenhouse/server.ts:17-22` declara `name: 'greenhouse-read-only'` con instructions que
dicen textualmente *«must not be used for writes»*. Registra **31 tools**, de las cuales **16 son
SEO** y **cuatro escriben**: `track_seo_keywords`, `untrack_seo_keywords`,
`prepare_seo_grounded_queries` y `discover_seo_keywords` — esta última compromete gasto real de
DataForSEO.

**Alcance acotado, y esto importa:** no llega a clientes externos. `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN`
no existe en Vercel (verificado con `vercel env ls`, ni Production ni staging), así que
`/api/mcp/greenhouse` devuelve 404. Su único consumidor vivo es el stdio local
(`pnpm mcp:greenhouse`). Es **una mina para el día que se prenda**, y mientras tanto le dice a un
agente local que ahí nada gasta plata.

**El gateway público está bien:** `mcp.efeonce.org` se declara `efeonce-mcp`, sin afirmación falsa.

### 3.3 🟡 Las tools SEO del gateway público no declaran su blast radius — **Clase A**

Los cinco bloques de `annotations` de `~/Documents/efeonce-mcp/src/mcp.ts` están **todos** en tools
de Globe y Hiring (líneas 154–355). Las 13 SEO federadas arrancan en la línea 421 y **ninguna lleva
annotations**. `discover_seo_keywords`, que quema presupuesto del proveedor, viaja sin
`readOnlyHint: false`.

El scope `efeonce.mcp.seo.write` sí las protege. Lo que falta es **decirle al cliente MCP qué cuesta
plata antes de llamarlo**.

### 3.4 🟡 Tres superficies MCP, y confundirlas cambia el diagnóstico — **Clase A**

| Superficie | Quién se conecta | Cómo llega al dominio | Estado |
|---|---|---|---|
| `mcp.efeonce.org` (`efeonce-mcp`) | Clientes externos, OAuth Entra + shim DCR | lane REST `/api/platform/ecosystem/**` | Vivo · 22 tools · 13 SEO federadas |
| `src/mcp/greenhouse` (stdio) | Agentes locales desde el repo | el mismo lane REST | Vivo en local · 31 tools · 16 SEO |
| `/api/mcp/greenhouse` (HTTP) | Nadie | — | **404**: token ausente en Vercel |

El gateway **no envuelve** al interno: son dos clientes paralelos del mismo contrato. Eso es
exactamente lo que pide Full API Parity, con un costo que conviene tener escrito: **una corrección
en uno no se propaga al otro**. De ahí el drift de `track_seo_keywords`, cuyo schema en el gateway
quedó anterior al del interno.

Además, tres tools vivas —`get_seo_overview_kpis`, `get_seo_performance`,
`get_seo_performance_catalog`— no están federadas **ni declaradas como exclusión**, que es lo que su
propio contrato exige. Dueño: `TASK-1658`, cuyo conteo está desactualizado (dice 8 de 11; hoy es
13 de 16).

### 3.5 🟡 Nexa no tiene ni una capacidad SEO — **Clase A**

Las 13 function declarations de `src/lib/nexa/nexa-tools.ts` no incluyen ninguna del dominio, y el
registry de acciones gobernadas tampoco. Por el criterio literal de nuestro propio ADR —*si el
contrato no existe a nivel capability, la feature no está completa*— **el módulo SEO no es
parity-complete**: tiene UI, tiene MCP, no tiene el consumer que declaramos como North Star.

Agravante: no existe ninguna skill que conozca las 16 tools por nombre. Nuestras skills SEO son
**oficio, no operación**.

### 3.6 🟡 El AEO no tiene lane ecosystem — **Clase A**

Bajo `src/app/api/platform/ecosystem/growth/` existe una sola carpeta: `seo/`. No hay
`ai-visibility/`. Un agente externo no puede correr un grade, leer un reporte AEO ni inspeccionar
prompts. Lo único que cruza a MCP es el score agregado dentro de `get_seo_visibility_360`.

**Nuestra capacidad más diferenciadora es la que menos superficie agéntica tiene.**

### 3.7 🟡 Valor comprado y no entregado — **Clase A (los tres)**

1. **La autoridad de dominio que pagamos no se muestra.** `backlinks/capture.ts:206` pide
   `rank_scale: 'one_hundred'` —comparable a DR/DA— y se persiste en
   `seo_backlink_snapshots.domain_rank`. `domainRank` aparece en seis archivos, **todos bajo
   `src/lib/`**. Cero en `src/views`, `src/components` o `src/app`.
2. **Dos receptáculos huérfanos.** `greenhouse_growth.seo_competitors` aparece **solo** en la
   migración que la creó (`20260805134439202`) y en `src/types/db.d.ts`: cero lectores, cero
   escritores. `seo_keyword_set_members.tags TEXT[]` está migrada y nadie la escribe.
3. **Medimos solo desktop.** `rank-capture.ts:87` fija `DEFAULT_DEVICES = ['desktop']`. En un
   cliente móvil-first medimos el SERP equivocado, y no hay palanca de cadencia (05:00 diarias para
   todos) para bajar costo.

**Clase A, corregido respecto de la v1:** descartamos entero `summary.domain_info` de OnPage, que ya
recibimos y parseamos —trae soft-404, redirect www/https, canonicalización, directory browsing y
expiración del certificado SSL; cero menciones en las 76 tasks del carril—. En cambio, la
declaración de muestra **sí existe** (`SiteAuditView.tsx:440,566`, desde `TASK-1309`): lo que falta
es reemplazar su proxy `crawledPages === crawlPageCap` por el `crawl_stop_reason` real, que hoy no
se persiste.

### 3.8 🟡 Divergencia de veredicto entre nuestros dos motores — **Clase A la frontera, Clase B los pesos**

El AEO ya mide señales estructurales y el audit SEO está por medir **las mismas con criterios
distintos**:

| Hecho medido | AEO `structural` hoy | Audit SEO post-`TASK-1670` |
|---|---|---|
| Robots para crawlers IA | Diez bots en una bolsa; bloquear uno resta readiness | Dos familias: *retrieval* crítico, *entrenamiento* postura declarada |
| Sitemap | `/sitemap.xml` 404 → puntaje 0 | 404 es aviso; problema solo si el declarado en robots está roto |
| `llms.txt` | Vale 15 puntos del eje | Fuera de alcance por doctrina |

Las dos posturas no pueden ser correctas a la vez, y **ambas llegan al mismo cliente**: el readiness
structural viaja en la proyección pública del informe AEO, y `TASK-1672/1673` sacan el audit SEO
como documento compartible.

**La salida no es fusionar los motores** —sus cadencias y sus versiones de score son
irreconciliables— **sino mover la frontera**: hoy está trazada abajo, en el fetch; debe estar al
medio, en el hecho. Que «estos bots están bloqueados», «el sitemap declarado responde 404» y «el
home tiene JSON-LD de tipo X» sean **evidencia compartida sin veredicto**, y que cada motor aplique
su severidad con su propia versión.

### 3.9 Bloqueadores concretos de `TASK-1670` — **Clase A**

- **`ProbeFetchInit` no acepta override de User-Agent.** El UA es constante de módulo
  (`COURTESY_USER_AGENT`, línea 25). El chequeo de bloqueo en el borde/WAF —titular de la task— **no
  es implementable**, y esa misma task declara fuera de alcance modificar el sustrato.
  Decisión previa: presentarse como el crawler de un tercero es suplantación, algunos WAF verifican
  por DNS inverso, y aparecer como evasor tiene costo reputacional.
- **`resolveProbeUrl` exige igualdad exacta de hostname** (línea 57). Un sitemap declarado como
  `https://www.ejemplo.com/sitemap.xml` con target `ejemplo.com` devuelve `blocked`. `www` vs apex
  es el caso probable, no el borde.

### 3.10 🔴 La señal que nueve tasks citan como mitigación del riesgo #1, y no existe — **Clase A**

`seo.provider.cost_over_budget` tiene **cero ocurrencias** en `src`, `services`, `migrations` y
`scripts`. Está citada en la columna de mitigación de la tabla de riesgos de **nueve tasks, ocho ya
cerradas**: `TASK-1300`, `1301`, `1302`, `1303`, `1304`, `1308`, `1309`, `1664` y `1651`. El riesgo
que dice mitigar es siempre el mismo, y es el #1 del módulo: *«Costo DataForSEO desbocado»*.

**La atribución es circular:** 1300 dice que la materializa 1303, 1301 dice que la materializa 1303,
1304 dice que la agrega 1303 — y 1303 dice que sus datos *«alimentan `seo.provider.cost_over_budget`
(TASK-1301/1300)»*. Cada una cerró apuntando a la otra.

**Y ya se detectó una vez sin cerrarse.** `TASK-1664` dice textualmente *«La señal
`seo.provider.cost_over_budget` citada por la spec no existe en código»*, y aun así cerró volviendo a
citarla en su propia tabla de riesgos.

**Matiz que evita sobrevenderlo:** el control duro sí existe. `enforceSeoRunEntitlement` bloquea
antes de gastar, y dos callers re-consultan el gate dentro del bucle, así que el sobregiro
intra-batch está cubierto. Lo que falta es la **detección temprana**: hoy el sobregiro se manifiesta
como corridas que empiezan a fallar con `budget_exhausted`, sin alarma previa. Las señales que sí
existen son otras cuatro: `seo.rank.capture_lag`, `seo.audit.stuck_tasks`,
`seo.market_data.freshness` y `seo.keyword_discovery.*`.

**Y el techo no cubre el AEO.** `TASK-1300` dejó declarado al cerrar que el gasto de perfiles AEO
ligados a un cliente **no entra en su presupuesto**, porque `ProviderAdapterContext` no transporta la
organización. El gate existe para SEO y no aplica al grader.

### 3.11 🟡 El snapshot del ledger de flags está estructuralmente invertido para el AEO — **Clase A**

La tabla `§ Snapshot` del `FEATURE_FLAG_STATE_LEDGER.md` se generó con `vercel env ls`, donde un flag
ausente se lee como «OFF en producción». Pero **casi todo el stack AEO se lee en el ops-worker, no en
Vercel**: su ausencia del listado de Vercel nunca significó OFF. La rama `production` de
`services/ops-worker/deploy.sh` los declara `"true"` con el comentario explícito *«PRODUCTION —
espeja staging … todo activo en prod»*.

Resultado: ~20 celdas que dicen «OFF en prod» son falsas. No son veinte errores sueltos: es **un solo
defecto de método replicado**. El caso más caro es `CATEGORY_GUARD`, que el ledger da por «OFF en
todos los environments» siendo un guard que **bloquea runs** y está ON en ambas ramas — leer mal esa
fila cambia la interpretación de un síntoma en vivo.

Corolario para cualquier rollout: **para un flag del ops-worker no existe «prod vs staging»** — es un
servicio único. `TASK-1270` describe una «Production verification sequence» con flip y cooldown que
esa topología no puede tener; alguien podría esperar ese flip indefinidamente mientras el re-grade ya
corre.

### 3.12 🟡 Defectos estructurales del backlog — **Clase A**

Salieron al construir el grafo de dependencias sobre las 59 tasks del carril (76 por grep amplio):

- **Un compromiso incumplido en una task cerrada.** `TASK-1659` (`complete`) declara *«Los 3 lanes
  aceptan el parámetro: app-lane, ecosystem y **las 2 tools MCP**»*. El `inputSchema` de
  `track_seo_keywords` en el gateway no tiene `intent`. Con `.strict()`, un agente externo que lo
  mande recibe error de validación; si no lo manda, escribe `NULL` — justo lo que esa task existe
  para evitar. Sus checkboxes de aceptación siguen sin marcar.
- **Una mina de migración.** `TASK-1662` afirma *«No hay modelo de competidor: ninguna tabla»* y
  planea `migrations/[nueva]-task-1662-seo-competitors.sql`. La tabla existe desde la migración de
  `TASK-1299`, creada con `CREATE TABLE IF NOT EXISTS`. Un `CREATE ... IF NOT EXISTS` nuevo haría
  **no-op en silencio**, la task cerraría en verde y `declared_by` nunca existiría.
- **Trabajo duplicado, no conflicto.** `TASK-1660` y `TASK-1690` declaran el mismo cambio sobre
  `select-featured-series.ts`: dejar de ordenar por mejor posición y ordenar por clics en juego.
- **Un ciclo declarado** entre `TASK-1700` y `TASK-1669` (artefacto ↔ código), con resolución escrita
  en el cuerpo pero campos de header que se contradicen: un ordenador automático se traba.
- **Diez colisiones de archivos owned**, incluida una donde `TASK-1269` está **en vuelo** y no sabe
  que colisiona con `TASK-1702` sobre `fix-it/**`.
- **Siete tasks con `Blocked by: none`** contradiciendo dependencias duras declaradas en su propio
  cuerpo. Y sólo **2 de 59** usan la disciplina de declarar «archivos que modifico sin poseer».

## 4. Lo adoptable

Ordenado por lo que resuelve hoy. Todo Clase B en cuanto a cómo lo hace OpenSEO.

1. **Techo de gasto como parámetro obligatorio verificado server-side.** Su tool de rank check exige
   `maxCostCredits` —el monto que el humano aprobó tras ver el estimador— y **el servidor re-estima
   al ejecutar y rechaza si el costo fresco lo excede**. Es nuestro loop `propose → confirm →
   execute` aplicado al dinero. Estamos a un paso: `discover_seo_keywords` ya tiene `preview: true`
   y una descripción que exige mostrar la fórmula y pedir confirmación, pero **eso es prosa que el
   modelo puede saltarse**.
2. **Memoria de proyecto compartida.** Cuatro tablas: contexto de negocio en prosa tipada,
   competidores con notas, páginas clave con rol (hub/spoke/money) y un **log de research** que
   registra qué se compró y qué concluyó. Cada fila con `updated_by: user | sam | mcp`. Es la mejor
   idea de su repo y la única de esta lista sin task nuestra.
3. **Inspección de URL de Search Console.** No la inventaron ellos, pero la tienen y nosotros no
   (`urlInspection` no aparece en ningún archivo de `src/`). El scope que la API pide,
   `webmasters.readonly`, **es el que ya tenemos**.
4. **Una skill, dos superficies, adaptada por nota de superficie** en vez de bifurcada.
5. **`readOnlyHint: false` cuando la tool gasta dinero aunque solo lea.**
6. **Distinguir fallo cobrado de fallo no cobrado**, y nunca reintentar un POST facturable ante 5xx.
7. **Regla anti-recompra**: antes de gastar, revisar el log; si la misma consulta corrió en los
   últimos 30 días, reusar y decirlo.
8. **Concurrencia por índice parcial único** y **caps de fan-out en el schema**, no en la
   descripción.
9. **Higiene de auditoría:** excluir de los grupos de duplicados las páginas ya noindexadas o
   canonicalizadas; **truncado severity-first** para que lo que se caiga de una lista con tope sea
   siempre lo leve.

## 5. Lo que NO adoptamos, con razón

| Decisión suya | Por qué no |
|---|---|
| **Ahrefs DR público** | El endpoint **exige API key desde ~10-ago-2026**: sin llave `403`, con llave inválida `401` (**verificado en vivo, Clase A**). Su código es keyless y lleva semanas roto en silencio. Y la autoridad que necesitamos ya la pagamos y ya la capturamos: sumar Ahrefs sería **dos escalas lado a lado**, su propio defecto. **Veredicto: no.** Condición estrecha: solo si un cliente exige DR como métrica contractual, con key propia, atribución con enlace y el puerto completo |
| Un scope OAuth único que abre las 46 tools | Sin separación lectura/escritura ni por dominio. Nuestro `efeonce.mcp.seo.write` verificado por tool ya es mejor |
| 46 schemas cargados de golpe, sin descubrimiento | Insostenible con nuestro volumen de capabilities |
| Costo como prosa en la descripción | No es consultable, no se puede presupuestar, envejece en silencio |
| Lista de precios del proveedor hardcodeada | El día que cambien tarifas, el estimador miente con el build verde |
| Taxonomía de negocio derivada del path del proveedor | Los créditos de un producto no se llaman como el vendor llama a sus endpoints |
| Su AI Search como arquitectura | 2 plataformas, ChatGPT solo US, stateless, historial en `localStorage`. Copiarlo sería retroceder |
| Su «keyword clustering» | No existe: es un archivo de instrucciones al agente. Nuestra decisión de usar `core_keyword` está bien fundada — **no revisarla por envidia de una carpeta** |
| Rank grid local y negocios locales | Solo tools MCP, sin UI ni persistencia. Y **local SEO no es nuestro negocio** |
| Crawler propio | Corre sobre Cloudflare Workflows con checkpointing durable, primitivo que no tenemos. Nuestro crawl de 100 páginas cuesta centavos; ahorraría ~1,5% de la factura a cambio de un orden de magnitud más de código |
| Créditos prepagados con top-up | Convierte una conversación de servicio en una de saldo. Su clasificación path→feature sí vale; su modelo de cobro no |
| «Export to Sheets» como integración | Es copiar TSV al portapapeles y abrir una hoja en blanco |

## 6. Dónde somos mejores, y por qué importa comercialmente

1. **Multi-tenancy y entitlements reales** — vendemos el mismo motor a piloto y contrato anual sin
   bifurcar código, y el informe resiste un comité enterprise.
2. **Append-only forzado por la base**, con triggers — un informe de marzo dice hoy lo mismo que
   dijo en marzo. Eso sostiene un retainer y hace defendible una licitación.
3. **AEO como producto, no passthrough** — es el diferenciador que nadie más tiene empaquetado.
4. **El cruce SEO × AEO** (`readSeoAeoGap`) — no existe en OpenSEO, Semrush ni Ahrefs.
5. **Honestidad del dato como regla, no intención** — ausente ≠ NULL ≠ cero. En enterprise LATAM se
   pierde la cuenta el día que el cliente encuentra un número inventado.
6. **Multi-mercado que se niega a adivinar** — con dos mercados activos y sin selector devolvemos
   `multiple_markets`. Un cliente CL+MX+CO es nuestro ICP; ellos lo modelan como tres proyectos
   desconectados.
7. **Barrera de enlaces propia en vez del KD del proveedor** — el KD colapsa a 0 en SERPs en
   español. Vender una keyword como fácil y no rankearla en seis meses es cómo se pierde un cliente.
8. **Oportunidades calibradas al propio cliente** — curva de CTR derivada de su propio GSC.

## 7. El plan

**Reescrito tras la reconciliación.** La v1 repartía trabajo sobre tasks cuyo cuerpo no se había
leído. Esta versión sale de leer las 59 tasks del carril y su grafo de dependencias declarado.
**Ninguna task fue creada ni modificada.**

### 7.1 Lo que NO hay que hacer, porque ya tiene dueño

| Ítem de la v1 | Dueño real | Estado |
|---|---|---|
| Guarda de redirects del fetcher | `ISSUE-164` + `TASK-1778` | Archivado con más alcance. Falta ejecución |
| Sitemap cross-host `www` ↔ apex | `TASK-1778` Slice 1 | Ya especificado, con el porqué de no usar eTLD+1 |
| Adoptar `seo_competitors` | `TASK-1699` (P0) | Ya la reclama por nombre y le pone el primer consumer |
| Inspección de URL de GSC | `TASK-1426` | En alcance con contrato de función — pero sin mecanismo de cuota (ver 7.3) |
| Lane ecosystem del AEO | Deuda declarada en `TASK-1645` | *«task hermana si se prioriza»*; sin task creada |
| Medir móvil | — | Ya implementado. Es decisión de gasto (2× por device), no ingeniería |
| Techo de gasto server-side (SEO) | `TASK-1301` | Ya existe con presupuesto por tier y fence intra-batch |

### 7.2 La secuencia, justificada por el grafo y no por opinión

El criterio de orden es **irreversibilidad y conteo de desbloqueo**, no prioridad declarada. Un
reader malo se arregla con un deploy; un snapshot append-only malo ya viajó.

| # | Unidad | Por qué va acá |
|---|---|---|
| 1 | **`TASK-1778`** — endurecer el fetcher | Raíz de **9** tasks, y habilita el flip a producción de dos flags del grader. Único orden declarado como load-bearing en dos direcciones |
| 2 | **`TASK-1696`** — dimensión consumer + gate USD | P0, raíz de **8**. Seis tasks encienden gasto recurrente detrás de ella. Su gate nace en shadow, así que no frena a nadie mientras se calibra |
| 3 | **`TASK-1697` slices 1–2** — `git mv` del sustrato | Horas de trabajo, y sólo después de 1778. Abre el carril de auditoría entero |
| 4 | **`TASK-1694`** — contrato de candidato | **Irreversible si llega tarde**: sin dedup, el primer snapshot de 1700 congela la misma keyword hasta cuatro veces |
| 5 | **`TASK-1692`** — writers del ledger de decisiones | Segundo bloqueador de 1700 y comparte cuatro archivos con 1694: encadenarla evita el rebase |
| 6 | **`TASK-1699`** — persistir el top-N ya pagado | P0, raíz de 6. Debe preceder a 1704 (mismo `rank-capture.ts`) y le da a 1662 su supuesto más frágil medido |
| 7 | **`country` + `device` en GSC, como slice de `TASK-1655`** | Mismo argumento de irreversibilidad: cambia la unique key de la tabla que 1700 snapshotea. Después es re-backfill de 16 meses |
| 8 | **`TASK-1670`** — hallazgos de sitio | Desbloqueado por (3). Esfuerzo bajo, raíz de la cadena de auditoría |
| 9 | **`TASK-1671`** — superficie de hallazgos | Es la condición del flip del flag de 1670. **Van juntas o no van** |
| 10 | **`TASK-1700`** — cola priorizada | Cierra el carril con sus tres bloqueadores resueltos y resuelve el ciclo con 1669 en la dirección correcta |

### 7.3 Ampliaciones concretas a tasks existentes

| Task | Qué agregarle |
|---|---|
| `TASK-1778` | El override de User-Agent en `ProbeFetchInit` (aditivo, default actual). **Y la postura**: sirve para variar *nuestro propio* token, nunca para presentarse como el crawler de un tercero |
| `TASK-1670` | Corregir su chequeo de borde: como está escrito hace `GET` con UA de un bot de retrieval, lo que **contradice la postura de 1778**. Es decisión, no implementación |
| `TASK-1426` | El mecanismo de cuota que hoy no tiene: ledger por `(organization_id, site_url, día)` con techo bajo las 2.000/día, preview obligatorio y fence |
| `TASK-1705` | Cosechador de `summary.domain_info` — costo incremental cero, cero menciones en las 76 tasks |
| `TASK-1658` | Recontar (15 tools por nombre hoy, no 11) y agregar un slice de **paridad de schema**, no sólo de nombre |
| `TASK-1631` | Declarar a Growth SEO/AEO como consumer: hoy no menciona «seo» ni «aeo» una sola vez, y podría cerrarse sin desbloquear `prepare_seo_grounded_queries` |
| `TASK-1775` | Desambiguar las **dos autoridades de dominio** que van a coexistir: el `domain_rank` semanal vivo y el authority mensual estimado que esa task crea |

### 7.4 Tasks nuevas, con su forma

| Qué | Perfil | Notas |
|---|---|---|
| Señal `seo.provider.cost_over_budget` + atribución de gasto del AEO | `backend-data` | Cierra §3.10. La atribución AEO es la mitad más grande |
| Etiqueta honesta del servidor MCP interno | `backend-data`, chica | No la absorbe 1658: distinto repo, distinto gate |
| Annotations en las 13 tools SEO del gateway | chica, repo `efeonce-mcp` | Tampoco va en 1658: mezcla dos contratos y rompe su orden de slices |
| `crawl_stop_reason` + `pages_in_queue` | `backend-data`, chica | Reemplaza el proxy, no crea la declaración |
| Pintar `domainRank` | **`ui-ux`** | 1775 y 1777 son `backend-data` con out-of-scope duro sobre superficie |
| Preview obligatorio y atado a la corrida | `backend-data` | El gate ya valida; falta que el preview sea mecanismo y que lo ejecutado quede atado a lo aprobado |
| Lane ecosystem del AEO | partir en **A lectura** (Medio) y **B escritura** (Alto) | B bloqueada por `TASK-1696` y `TASK-1631` |
| Tools SEO para Nexa | `backend-data` | **No** es una skill: Nexa no lee `.claude/skills/` |

### 7.5 Higiene documental, sin task

Ordenada por cuánto engaña a quien la lea:

1. **La columna de `§ Snapshot` del ledger** — separar por **runtime**, no por environment (§3.11).
2. **`CATEGORY_GUARD`** — dice «OFF en todos los environments» siendo un guard que bloquea runs.
3. **`EPIC-022`** — `to-do` / `Diseño` / `Owner: unassigned` con 21 hijas completas y 7 crons activos.
4. **`TASK-1270`** — borrar la secuencia de flip a prod: describe un gate que la topología de servicio único no puede tener.
5. **`TASK-1282` y `TASK-1283`** — live en producción desde el 7 de agosto con `Status real: Diseño`.
6. **`TASK-1662`** — su §Gap y su migración `[nueva]` son la mina de §3.12.
7. **`TASK-1708`** — bloqueada por nada real; su `Blocked by` es stale.
8. **`TASK-1660` vs `TASK-1690`** — decidir cuál hace el cambio; hoy lo declaran las dos.
9. **La nota de inventario de tools** en la skill del gateway dice «9 reads + 2 writes»; son 16.

### 7.6 Decisiones que no son de código

- **Token de operador vs grant per-cliente en Search Console.** Hoy un solo refresh token de una
  persona es la llave de todas las propiedades conectadas. Si esa persona se va o revoca, caen todas
  las orgs juntas. La variante per-org está escrita y sin usar. Decidir **antes** de `TASK-1426`.
- **Postura de User-Agent** (§7.3).
- **`TASK-1269` vs `TASK-1702`** sobre `fix-it/**`: 1269 está en vuelo y no sabe que colisiona.
- **Dónde vive la memoria de proyecto.** No pertenece a EPIC-020/021/022: meterla ahí le pone un
  epic prestado. Si es para el carril agéntico, cuelga de `TASK-1669`, después de `TASK-1700`.

## 8. Lo que quedó fuera del plan, a propósito

- **Ahrefs DR** — §5.
- **Crawler propio** — §5. La única excepción legítima es lo que el proveedor no vende (acceso de
  crawlers IA, bloqueo en el borde), y son **dos requests por dominio**, no un crawler. Mantener esa
  distinción explícita para que no se convierta por acreción en un crawler.
- **Paridad de checks de auditoría** — nuestro allowlist de 34 ya es más ancho que sus 27.
- **Local SEO** — no es nuestro negocio.
- **`llms.txt`** — pendiente de reconciliar: hoy vale 15 puntos del eje structural del AEO y está
  fuera del audit SEO por ROI marginal. **Una de las dos posturas está mal**; si la doctrina del
  audit es correcta, esos 15 puntos son puntaje regalado. Entra en 2.2.

## 9. Referencias

- Sujeto: `github.com/every-app/open-seo` · `openseo.so` · licencia MIT
- Licencia de Domain Rating de Ahrefs: `ahrefs.com/legal/domain-rating-license` — atribución con
  hyperlink obligatoria, **revocable sin aviso**, prohibido re-empaquetar
- Antecedente: [`2026-08-15-growth-seo-aeo-module-opportunity-audit.md`](2026-08-15-growth-seo-aeo-module-opportunity-audit.md)
- Página de trabajo con la versión navegable de esta auditoría: artifact privado de la sesión
