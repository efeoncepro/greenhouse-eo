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

### 3.1 🔴 El fetcher de probes promete un límite de redirects que no implementa — **Clase A**

`src/lib/growth/ai-visibility/probes/safe-fetch.ts:10` afirma en su docstring:
*«`redirect: 'follow'` acotado al mismo registrable host (no se persigue cross-host)»*.

El código pasa `redirect: 'follow'` (línea 100) y usa `const finalUrl = response.url || target` (109)
**solo como etiqueta en el valor de retorno**. Nunca revalida el host final contra el base ni contra
`isNonPublicHost`, que corre únicamente sobre la URL inicial (línea 70). Un target que responda 302
hacia una IP interna sería seguido.

**Riesgo hoy:** bajo — el target es el dominio del propio cliente, cargado por un operador.
**Riesgo mañana:** `TASK-1697` promueve este archivo a primitive compartido de tres consumidores.

Es exactamente el patrón *«una guarda es una afirmación hasta que el mecanismo la sostenga»*.
Contraste: OpenSEO revalida SSRF **en cada salto** y hace DNS-over-HTTPS sobre la URL de arranque
(Clase B).

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

**Clase B, del mismo eje:** descartamos entero `summary.domain_info` de OnPage, que ya recibimos y
parseamos —trae soft-404, redirect www/https, canonicalización, directory browsing y expiración del
certificado SSL—; y persistimos `crawled_pages` pero no `crawl_stop_reason`, así que con techo de
100 páginas **el reporte no puede decir que describe una muestra**.

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

Tres olas. **Ninguna task fue creada ni modificada al escribir este documento.** Los IDs nuevos se
reservan al ejecutar, barriendo el registry por dominio y superficie (el más alto hoy es
`TASK-1779`).

### Ola 0 — Correcciones de contrato y seguridad

Va **antes** de que arranque el trabajo de hallazgos de sitio, porque dos de estos son bloqueadores
de `TASK-1670` y uno toca un archivo que está por volverse primitive compartido.

| # | Qué | Dónde | Dueño |
|---|---|---|---|
| 0.1 | Hacer real la guarda de redirects: revalidar host y `isNonPublicHost` en cada salto, o pasar a `redirect: 'manual'` con validación explícita | `ai-visibility/probes/safe-fetch.ts` | Task nueva, o `TASK-1697` si absorbe el sustrato |
| 0.2 | Override de User-Agent en `ProbeFetchInit` + **decisión de postura** sobre presentarse como crawler de un tercero | `ai-visibility/probes/{contracts,safe-fetch}.ts` | Ampliar `TASK-1697`; desbloquea `TASK-1670` |
| 0.3 | Resolver el sitemap cross-host (`www` vs apex) en `resolveProbeUrl` | mismo | `TASK-1670` |
| 0.4 | Corregir la etiqueta del servidor MCP interno: renombrar y reescribir instructions declarando las cuatro escrituras y el gasto | `src/mcp/greenhouse/server.ts` | Task nueva (chica) |
| 0.5 | Confirmar en Vercel Production el estado real de los flags de probes del AEO y corregir el ledger | `FEATURE_FLAG_STATE_LEDGER.md` | Higiene, sin task |

**Evidencia de cierre:** test que ejercite un 302 hacia host distinto y hacia IP privada; el
chequeo de borde implementable; `vercel env ls` contrastado contra el ledger.

### Ola 1 — Producto: lo que más retorno da por unidad de esfuerzo

| # | Qué | Cómo | Dónde | Dueño |
|---|---|---|---|---|
| 1.1 | **Inspección de URL de GSC, con cuota gobernada** | `inspectUrl` en el api-client + ledger de consumo por `(org, site_url, día)` con techo bajo los 2.000/día + preview + fence. Reader → lane ecosystem → tool MCP en el mismo PR | `growth/search-console/**`, `ecosystem/growth/seo/` | **Extraer de `TASK-1426`** como task propia; el paquete multi-property es Effort Alto y arrastra incógnitas |
| 1.2 | **Pintar la autoridad de dominio que ya capturamos** | El dato ya está en `seo_backlink_snapshots`; falta llevarlo al VM y a la vista | `growth/seo/backlinks/reader.ts` + vistas | Absorber en `TASK-1775` o `TASK-1777` — **no crear task propia** |
| 1.3 | **Cosechar `summary.domain_info`** (soft-404, redirect www/https, canonicalización, directory browsing, expiración SSL) | Ya lo recibimos y lo descartamos en el parser. Costo incremental cero | `growth/seo/site-audit/collect.ts` | Ampliar `TASK-1705`; alimenta el eje de sitio de `TASK-1671` |
| 1.4 | **Persistir `crawl_stop_reason` + `pages_in_queue`** y declarar la muestra en el reporte | Columnas nuevas + copy | `site-audit/**`, reporte | **Bloqueante moral de `TASK-1672/1673`**: un documento firmado que no declara que describe una muestra es peor que no tenerlo |
| 1.5 | **Techo de gasto obligatorio y verificado** encima del `preview` existente | Parámetro obligatorio, re-estimado en `enforceSeoRunEntitlement` al ejecutar | `growth/seo/entitlement.ts`, `keyword-discovery/**` | Task nueva; se relaciona con `TASK-1706` |
| 1.6 | **`country` + `device` en la serie GSC, y medir móvil** | Dimensión adicional en el request; evaluar tabla agregada aparte en vez de ampliar el grano (producto cartesiano sobre `query×page`). Y quitar el default de solo-desktop en rank capture | `gsc-daily-materializer.ts`, `rank-capture.ts` | Task nueva; «cómo nos va en MX vs CL» es pregunta semanal de cliente |
| 1.7 | **Annotations en las 13 tools SEO del gateway** | `readOnlyHint: false` en todo lo que compre datos | `efeonce-mcp/src/mcp.ts` | Absorber en `TASK-1658` junto al drift de federación |

### Ola 2 — Estructural

| # | Qué | Por qué ahora no antes |
|---|---|---|
| 2.1 | **Memoria de proyecto compartida** — contexto, competidores, páginas clave y log de research, con procedencia `user \| nexa \| mcp` | Es la pieza de mayor valor de todo el análisis, pero toca el modelo de datos y necesita decidir su frontera con `brand_intelligence` del AEO y con `competitors_declared`. Le da dueño canónico a `seo_competitors`, hoy huérfana |
| 2.2 | **Mover la frontera entre motores al hecho, no al fetch** — evidencia compartida sin veredicto, severidad propia por motor | Depende de que la Ola 0 desbloquee el sustrato. Extiende §5.3 de la auditoría del 2026-08-15, que hoy solo cubre análisis de contenido |
| 2.3 | **Lane ecosystem del AEO + federación de sus tools** | Es la brecha con más valor comercial, y la más grande en esfuerzo |
| 2.4 | **Skill de dominio con nota de superficie** que conozca las 16 tools por nombre y sirva igual al agente externo y a Nexa | Cierra la brecha de parity de §3.5 sin construir nada «Nexa-específico» |
| 2.5 | **Tercer eje de valor de negocio en oportunidades**: `estimatedClickGain × tasa de conversión` | Depende de GA4 a runtime (`TASK-1284`) |
| 2.6 | **GA4 a runtime, alcance cerrado** | Hoy GA4 es cero: existe `runRealtimeReport` pero **no `runReport` histórico**, y sus únicos consumidores son dos scripts CLI. Sin esto la cadena de valor termina en el clic y nunca llega al dinero, y el tráfico desde motores de IA no se mide en ningún lado. Reordenar `TASK-1284`: measurement health primero, que es lo más barato y valida todo lo demás |

### Higiene, sin task

- `EPIC-022` dice `Lifecycle: to-do` / `Status: Diseño` con **seis crons suyos en producción** desde
  el 6 de agosto. `TASK-1282` está `in-progress` con `Status real: Diseño` y el flag ON en Vercel
  prod y en el ops-worker.
- `TASK-1658` tiene el conteo desactualizado (dice 8 de 11; es 13 de 16).

### Decisión pendiente, que no es de código

Hoy conectamos Search Console con **un grant de operador interno de Efeonce**
(`command.ts:129` → `buildOperatorSearchConsoleSecretId`), reusado entre todas las orgs. La variante
per-org (`buildSearchConsoleSecretId`) está escrita y sin usar. Para clientes enterprise, hoy el
cliente **no puede otorgar con su propia cuenta ni revocarnos sin afectar a los demás**, y revocar
el grant del operador tumba a todos. Multi-property amplifica el riesgo, así que conviene decidirlo
antes de `TASK-1426`.

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
