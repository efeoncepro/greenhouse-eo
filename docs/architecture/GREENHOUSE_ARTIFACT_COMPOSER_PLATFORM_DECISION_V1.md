# GREENHOUSE — Artifact Composer: primitive de plataforma + catálogos + `Proposal` (ADR)

> **Status:** `Accepted`
> **Date:** 2026-07-12
> **Owner:** Platform (Artifact Composer) + Commercial (Proposal) + Growth/Social (catálogo social)
> **Scope:** `src/lib/commercial/tenders/deck/**` → `src/lib/artifact-composer/**` · `src/lib/commercial/tenders/**` → `src/lib/commercial/proposals/**` · `greenhouse_commercial.tenders` → `proposals` · TASK-1391 · TASK-1392 · catálogo social (carrusel) · AXIS design tokens
> **Reversibility:** `two-way` **hoy** — no existe tabla, ni API, ni UI, ni segundo consumer. **`one-way-ish` en cuanto TASK-1392 cree la tabla o alguien copie el motor.** Esa es la razón de decidir ahora.
> **Confidence:** `high` (la extracción está verificada contra el código, no supuesta)
> **Validated as of:** 2026-07-12 — verificado en el repo: el motor **no importa nada** de `commercial/`; `ContentType`/`TemplateName` son `string` (registry-driven, no uniones cerradas); el `viewport` sale del contrato de cada plantilla. Un canvas 1080×1350 funciona hoy sin tocar el motor.

---

## Context

Dos hechos aparecieron el mismo día y apuntan a la misma decisión:

1. **El motor ya es genérico.** El composer de decks (`selector → validate → slot-fill → resolvers →
   geometría → render`) **no sabe qué es una licitación**. Verificado: cero imports del dominio
   commercial, content-types abiertos resueltos contra el `registry.json`, y canvas por plantilla. Está
   viviendo en una carpeta con forma de licitación **por accidente histórico**, no por acoplamiento.
2. **Ya hay un segundo consumer real.** Los carruseles de Instagram (y otros formatos sociales) necesitan
   exactamente lo mismo: plantillas + slots + render determinista. **Codex ya está adaptándolo.** Ese es
   el momento exacto en que un primitive se bifurca en dos motores divergentes — y la bug class de
   geometría que acabamos de cerrar habría que arreglarla dos veces.

Y una tercera observación, del dominio comercial: **no toda propuesta es una licitación.** El mismo motor
sirve para cualquier propuesta técnica de venta. El aggregate llamado `Tender` es demasiado estrecho.

**La ventana:** no existe la tabla, ni la API, ni la UI, ni el segundo catálogo. Decidir ahora cuesta
**cero**. Después de TASK-1392 cuesta una migración; después de que Codex copie el motor, cuesta un
merge de dos motores que ya divergieron.

---

## Decision

### 1. Tres capas, y no se contaminan

| Capa | Qué es | Sabe de… | Home |
|---|---|---|---|
| **Artifact Composer** (primitive) | selector · validate · slot-fill · resolvers · **geometría** · render | plantillas y slots. **NADA de dominio.** | `src/lib/artifact-composer/**` |
| **Catálogo** (dato, no código) | plantillas + `registry.json` + resolvers + canvas + **output target** | su superficie visual | `catalogs/<nombre>/` |
| **Dominio consumidor** | quién lo usa y por qué | su negocio | `commercial/proposals/**` · `growth/social/**` |

**El catálogo es DATO, no una rama del motor.** Agregar el carrusel **no debe tocar una línea del
Composer**: es un directorio con plantillas, un registry, sus resolvers y un `outputTarget`.

```
Artifact Composer  (un motor, domain-free)
        ├── catalogs/deck-axis        16:9 1920×1080  → PDF de N páginas (pdf-lib)
        └── catalogs/social-carousel   4:5 1080×1350  → PNG set (1 por lámina)
                    ▲                                   ▲
        consumer: Proposal (commercial)      consumer: Social (growth)
```

- **Un carrusel NO es una propuesta.** Es un asset de marketing; su dominio es growth/social y su
  distribución es Metricool. Lo único que comparte con una licitación es **el motor**.
- **`outputTarget`** entra al contrato del catálogo: `pdf-merged` (deck) | `png-set` (carrusel). El merge
  `pdf-lib` deja de estar cableado en `compose.ts` y pasa a ser **un target**, no *el* final.

### 2. El aggregate es `Proposal`, no `Tender` — y **NO** "TechnicalProposal"

**`TechnicalProposal` está mal, y lo dice el vocabulario del propio dominio:** en una licitación la
**"oferta técnica" es UNA de las TRES partes** (técnica / económica / administrativa — Fases 7-8-9 del
`bid-construction-playbook`). Nombrar el **todo** con el nombre de **una parte** colisiona con el lenguaje
que ya usamos con clientes y evaluadores.

```
greenhouse_commercial.proposals
  origin ∈ { public_tender, private_rfp, direct_sales }
```

**"Licitación" pasa a ser un ORIGEN, no la identidad.** Lo que decide que esto es correcto —y no una
generalización de escritorio— es que **la state machine ya generaliza sola**: los 12 estados mapean a una
propuesta de venta directa casi 1:1 (`fit_review` también aplica: también decides si persigues un deal o
no). **No hay que inventar nada; sólo cambia el vocabulario visible.**

- Lo **exclusivo de licitación** (matriz de admisibilidad, requisitos excluyentes, boletas de garantía,
  portal de submission) es una **extensión opcional**, no la definición del aggregate.
- `origin` es **una sola dimensión** (de dónde viene). **NUNCA** agregar un `kind` paralelo que la
  duplique — mezclar dimensiones ortogonales en un enum es la vía rápida a las columnas siempre nulas.
- El ADR de ownership (`GREENHOUSE_TENDER_DISCOVERY_OWNERSHIP_BOUNDARY_DECISION_V1.md`) **sigue vigente
  tal cual**: RESEARCH-007 sigue dueño de `public_tender*`; la promoción ahora crea un **`Proposal` con
  `origin=public_tender`**.

### 3. Frontera con Finance (quote-to-cash) — el Proposal **no fija el precio**

- La `Proposal` **contiene** la oferta económica; **NO la calcula**. El monto real lo emite el
  **cotizador** (`src/lib/commercial/quote-to-cash/**`) sobre **loaded cost**. **NUNCA** reimplementar
  pricing dentro del dominio de propuestas.
- **Nunca un GO sin margen sobre loaded cost.** Ese gate vive en `fit_review`, no en el renderer.
- El **squad blueprint lleva loaded cost** → `audience=internal`, **siempre**. Filtrarlo al comprador es
  entregarle tu estructura de costos y tu piso de negociación.

### 4. El contrato de brand pack se comparte; la paleta **no se copia**

**Hallazgo:** las 25 plantillas hardcodean **51 HEX distintos**, con la paleta **re-declarada en cada
archivo**. Hoy es deuda; **con un segundo catálogo es un multiplicador de brand drift** — y viola la regla
canónica del repo (**un SoT declarado por superficie: se cambia el token y todo deriva**).

- **Dos SoT existentes no se deben confundir.** `src/@core/theme/axis-tokens.ts` es el mirror del AXIS de UI
  (Figma `Design System | Vuexy → AXIS`); el primer pack de presentación `deck-axis` deriva de Figma
  `Sistema Axis - PPT`, [`Color Primitives` `33:2`](https://www.figma.com/design/GXYeJaRjotmFuczfnd8hLi/Sistema-Axis---PPT?node-id=33-2). Coinciden parcialmente, pero no son intercambiables:
  `blue/500` es `#0375D9` en PPT y `#0375DB` en UI; `blue/900` es `#022A4E` y `#00284D` respectivamente.
- **Los catálogos comparten el contrato de brand pack**, no una copia ciega de la paleta UI: CSS custom
  properties se generan desde la fuente declarada por el pack. `deck-axis` usa las primitivas PPT; un
  crosswalk a `axis-tokens.ts` sólo es válido cuando el valor coincide exactamente. Todo literal actual del
  deck debe mapear a una variable/node del mismo Sistema Axis-PPT antes de tokenizarse; no se aproxima,
  normaliza ni atribuye a otra fuente.
- **NUNCA** un catálogo nuevo re-declara la paleta. **NUNCA** una plantilla nueva hardcodea un HEX de
  marca.
- El **molde visual** (degradado, tipografía, safe-area, íconos, glass) **es del catálogo**, no del motor.
  Cada superficie tiene el suyo — un carrusel de IG **no** usa el molde del deck — pero **ambos beben de
  los mismos tokens**.

**Tokenización de gradientes.** Un gradiente no es un color: es una receta visual de catálogo. `deck-axis`
declara recipes versionadas (`cover.hero`, `richContent`, `backCover`, `lightSurface`) como capas ordenadas
`linear|radial|grain`, con geometría, stops, opacidad y blend. Los stops referencian roles del `BrandPack`;
las templates sólo seleccionan la recipe y el CSS compilado la resuelve. Así un cambio de marca puede variar
el pack sin alterar la geometría del deck, y un catálogo social crea su propio molde sin copiar el renderer.

### 5. Nace para Efeonce, pero **nace multi-tenant** (fundaciones ASaaS)

**La capability se construye para uso interno de Efeonce, pero con las costuras para operar
as-a-service.** No se construye el producto cliente hoy; se construye de modo que **no haya que
reescribirlo** cuando llegue. La regla que lo hace posible es una sola:

> **La marca es un INPUT del motor, no una constante.** El día que un cliente Globe componga sus propias
> propuestas o sus propios carruseles, lo único que cambia es **su brand pack + su catálogo** — nada del
> motor.

**Las 4 costuras que hay que dejar puestas desde el día 1** (cuestan poco ahora, son un rewrite después):

| Costura | Hoy (Efeonce) | Mañana (as-a-service) | Si NO se deja hoy |
|---|---|---|---|
| **Brand pack** — tokens de marca como parámetro | AXIS (Efeonce) | El brand pack del cliente | **AXIS horneado = imposible servir a un cliente.** Es la costura crítica. |
| **`owner_org_id` en el catálogo** — catálogo global vs per-org | catálogos de Efeonce | catálogo propio del cliente + los heredados | Catálogos globales sin dueño = no se pueden aislar después |
| **Tenant scoping** — toda lectura/escritura del `Proposal` y sus assets va scopeada por org | una sola org | N orgs aisladas | Un `WHERE org_id` agregado tarde **siempre** deja un reader sin filtrar |
| **Entitlement por-ORG** — la capability se contrata, no se hereda por rol | interno | módulo contratable | Un gate por rol no se convierte en producto vendible |

**Reglas duras de esta sección:**

- **NUNCA** el motor ni una plantilla referencia "AXIS" o "Efeonce" como constante. El motor recibe un
  **brand pack**; AXIS es **el brand pack de Efeonce**, no *el* brand pack. (Esto convierte el hallazgo de
  los 51 HEX hardcodeados de "deuda de marca" en **un bloqueador del modelo de negocio**.)
- **NUNCA** un catálogo, plantilla, asset o `Proposal` sin dueño de org resoluble. "Global" es un valor
  explícito, no la ausencia de dato.
- **NUNCA** gatees esta capability por rol. Va por **entitlement per-ORG** (`module_assignments`) — el
  mismo modelo que ya usa el AI Visibility Grader, por la misma razón: **un rol no se factura; un módulo
  sí.**
- **NUNCA** dejes que el catálogo social de un cliente pueda montar assets de otro (el aislamiento de
  scope de la sección Safety **es** el aislamiento multi-tenant; no son dos mecanismos).

**Lo que explícitamente NO se construye ahora** (YAGNI — pero con la costura puesta): UI de cliente,
billing/créditos por render, editor de plantillas para el cliente, y el lane `api/platform/ecosystem/*`
para consumo externo. **Se declara el camino, no se implementa.**

> **Coherencia con la doctrina ASaaS:** esto es exactamente el patrón Greenhouse — *"lo que Efeonce opera
> a mano se vuelve producto instrumentado"*. El deck de la licitación de SKY es el caso interno que
> financia el motor; el motor es el que después se vende.

### 6. Frontera con **Efeonce Creative Studio (EPIC-028)** — resuelta

`TASK-1392` ruteaba *"la composición cross-format"* a **Creative Studio**, la plataforma hermana
(control plane propio, workers propios, créditos, proveedores; ADR `Accepted (direction)`, **sin una sola
línea de código hoy**). No era un error: su ADR menciona *"set de RRSS"* como flujo curado. **Pero son
cosas distintas**, y confundirlas produce el fork que este ADR existe para evitar:

| | **Artifact Composer** | **Creative Studio / Media Foundry** |
|---|---|---|
| Qué hace | **Compone** el frame: slots → layout → geometría → render | **Genera** el pixel: IA, proveedores, créditos |
| Naturaleza | **Determinista** (mismos slots → mismo artefacto) | **Generativa** (no determinista) |
| "Plantilla" significa | contrato de slots + canvas + output target | flujo curado (still-to-video, audio/foley) |
| Falla si… | el copy no cabe (`overflow: reject`) | el proveedor falla / no hay créditos |

**Decisión (operador, 2026-07-12):** el Composer es un **primitive de Greenhouse**
(`src/lib/artifact-composer/**`), **extraction-ready**. Razón: **hoy tiene un consumer real (el deck) y
otro inmediato (el carrusel); Creative Studio todavía no tiene código.** Bloquear el motor esperando una
plataforma que aún no existe forzaría un fork temporal — exactamente lo que no queremos.

⚠️ **Pero Creative Studio SÍ va a existir — se está construyendo ahora** (operador, 2026-07-12). Eso hace
que la extracción sea **near-term, no hipotética**, y agrega una obligación **desde el día 1**:

- **El motor nace `package-shaped`**, aunque viva en el monolito: API pública explícita (barrel), **cero
  deep-imports** desde consumers, dependencias declaradas y **cero Next-isms**.
- ⚠️ **Blocker concreto ya detectado:** `solar-icons.ts` hace `import 'server-only'` — un **Next-ism que no
  resuelve fuera de Next**. El CLI ya lo esquiva con un shim (`--require server-only-shim.cjs`), y **ese
  shim viajaría a Creative Studio**. Se saca del motor: el boundary server/client se marca en el
  **consumer**, no en un primitive portable. Prueba de portabilidad: **el motor debe correr en Node puro,
  sin Next y sin shim**.
- Cuando **EPIC-027** autorice la frontera, el Composer se extrae a `packages/artifact-composer` y
  **Creative Studio lo CONSUME como paquete**. **NUNCA** lo reimplementa.
- Un carrusel puede usar **los dos**: Creative Studio/Foundry **genera** la imagen; el Composer **compone**
  el frame con ella. **NO** se fusionan, **NO** se duplican.
- **NUNCA** EPIC-028 construye un segundo motor de composición de slots. Si lo necesita, **extrae éste**.

**Task:** `TASK-1393` (extracción + catálogos + brand pack), predecesora de TASK-1391.

---

## Alternatives Considered

| Alternativa | Por qué NO |
|---|---|
| **Dejar el motor donde está y que social lo importe desde `commercial/tenders/deck`** | Un dominio de marketing importando del dominio comercial es una dependencia invertida: acopla growth a licitaciones para siempre. El DAG queda al revés. |
| **Copiar el motor a `social/` y adaptarlo** (lo que pasaría por defecto) | **Dos motores que divergen.** La bug class de geometría se arregla dos veces, o peor: se arregla una. Es el fork que este ADR existe para evitar. |
| **Un solo aggregate `Artifact` que sirva a propuestas y a posts** | Colapsa dos negocios distintos. Una propuesta tiene bid/no-bid, margen, admisibilidad y un comité; un carrusel tiene cadencia, hook y algoritmo. **No comparten ciclo de vida, solo motor.** |
| **`TechnicalProposal` como nombre del aggregate** | Nombra **una de las tres partes** (técnica/económica/administrativa) para referirse al **todo**. Choca con el vocabulario del dominio y con lo que el cliente lee. |
| **Mantener `Tender` y meter las ventas directas como "licitación privada"** | Fuerza a llamar "licitación" a algo que el cliente nunca llamó así. El vocabulario mentiría, y el vocabulario es contrato en un documento comercial. |
| **Posponer hasta tener el segundo catálogo funcionando** | Es la única opción cuyo costo **crece**: hoy vale cero; después vale una migración + un merge de motores. |

---

## 4 pilares

### Safety

- **El abuso #1 es el leak de `audience`.** El squad blueprint (loaded cost) y el diagnóstico interno son
  `internal`. Gate: sólo un asset `client_facing` **aprobado** se empaqueta; DB + command + capability.
- **Aislamiento entre catálogos:** un catálogo declara **qué scopes de asset puede consumir**. El catálogo
  social **NUNCA** puede montar un asset de una propuesta (ni al revés). Sin esa regla, un post de
  Instagram podría renderizar la lámina económica de una licitación.
- **Blast radius del motor compartido:** un bug del Composer afecta a **todos** los catálogos. Es el
  trade-off aceptado — y se compra al revés: **el guard de geometría y sus tests también son compartidos**,
  así que un fix protege a todos. Un fork tendría el peor lado de ambos.
- **propose → confirm → execute** en los dos consumers: la oferta la **sube un humano**; el post lo
  **programa un humano** (la doctrina de `social-media-studio` es idéntica a la del bid — no es
  coincidencia, es la misma regla).

### Robustness

- `overflow: reject` y `assertSlideFitsCanvas` son del **motor** → valen para el carrusel desde el día 1,
  gratis. Un texto que no cabe en un 4:5 **no se recorta**: falla.
- `auditRegistry()` (cierre referencial) corre **por catálogo**: un content-type sin plantilla revienta.
- **Determinismo:** el `Plan` (slots) es el artefacto auditable en ambos catálogos. Deuda abierta y
  compartida: **las fuentes se piden por red** → el render **no es hermético** hasta embeberlas.

### Resilience

- El render pesado (Chromium) va al **worker dedicado** (TASK-1391), **NUNCA** en Vercel ni `ops-worker`
  (bloquearía el publisher del outbox). Vale igual para el carrusel.
- Retries acotados + dead-letter + replay desde el `Plan` fijado. El PDF/PNG es **derivado**, no source of
  truth: siempre se puede re-componer.

### Scalability

- **Agregar un catálogo es DATO, no código.** Ese es el test de la decisión: si añadir el carrusel obliga
  a tocar el motor, el diseño está mal.
- ⚠️ **Los perfiles de carga son opuestos y la cola debe saberlo.** Un deck de licitación es **raro y con
  deadline duro** (si no entra hoy, pierdes el proceso). Un lote de 30 carruseles es **frecuente y sin
  urgencia**. **NUNCA** dejes que un batch social hambree el deck de un bid que vence mañana: la cola
  necesita **prioridad por catálogo/deadline**, no FIFO ciego.

---

## Runtime Contract

| Concepto | Dueño | Dónde |
|---|---|---|
| Motor de composición | **Platform** | `src/lib/artifact-composer/**` (domain-free) |
| Catálogo deck AXIS (16:9 → PDF) | Commercial | `catalogs/deck-axis/` |
| Catálogo social (4:5 → PNG set) | Growth/Social | `catalogs/social-carousel/` |
| Tokens de marca | **Brand-pack SoT declarado** | `deck-axis`: Figma PPT `33:2` → CSS custom props generado; `axis-tokens.ts` queda como mirror UI con crosswalk exacto |
| Aggregate de la oferta | Commercial | `greenhouse_commercial.proposals` (`origin`) |
| Precio | **quote-to-cash** | `src/lib/commercial/quote-to-cash/**` — el Proposal **no** calcula |
| Radar público | RESEARCH-007 | `greenhouse_commercial.public_tender*` (ADR de ownership, sin cambios) |
| Distribución social | Growth | Metricool (`social-media-studio`), con confirmación humana |

**Modular Placement Contract (EPIC-027):** todo esto vive **en el monolito**, extraction-ready. El
Composer es el candidato natural a `domain-package` el día que EPIC-027 lo autorice — **este ADR no crea
`packages/*` ni un deployable**. El único deployable nuevo previsto es el `tender-worker` de TASK-1391, y
**sigue gateado por EPIC-027**.

---

## Hard rules (NUNCA / SIEMPRE)

- **NUNCA** el Composer importa nada de un dominio (`commercial`, `growth`, …). Si lo necesita, no es del
  motor: es del catálogo. Es la regla que hace que el primitive siga siendo primitive.
- **NUNCA** copies el motor para una superficie nueva. **Un catálogo, no un fork.** Si agregar el catálogo
  te obliga a tocar el motor, para y arregla el motor **una vez**.
- **NUNCA** el motor ni una plantilla hornea "AXIS"/"Efeonce" como constante: **la marca es un input**
  (brand pack). AXIS es *el brand pack de Efeonce*, no *el* brand pack. Hornearlo **mata el as-a-service**.
- **NUNCA** un catálogo re-declara la paleta ni hardcodea un HEX de marca. Los tokens salen del brand pack.
- **NUNCA** un catálogo, plantilla, asset o `Proposal` sin **org dueña resoluble** ("global" es un valor
  explícito, no la ausencia de dato). **NUNCA** gatees esta capability por rol: va por **entitlement
  per-ORG** — un rol no se factura, un módulo sí.
- **NUNCA** un catálogo consume assets de otro dominio (social ⇄ propuestas). El scope se declara.
- **NUNCA** llames `TechnicalProposal` al aggregate (nombra una de sus tres partes).
- **NUNCA** agregues un `kind` que duplique `origin`.
- **NUNCA** el Proposal calcula precio (eso es `quote-to-cash` sobre loaded cost). **NUNCA** un GO sin
  margen.
- **NUNCA** FIFO ciego en la cola de render: un batch social no puede hambrear un bid con deadline.
- **SIEMPRE** el `Plan` (slots) es el artefacto auditable; el PDF/PNG es derivado y re-componible.
- **SIEMPRE** `propose → confirm → execute` para publicar/enviar, en los dos consumers.

---

## Roadmap por slices

| # | Slice | Depende de | Costo si se pospone |
|---|---|---|---|
| **0** | **Congelar la dirección** (este ADR) + avisar a Codex **antes** de que el carrusel forkee el motor | — | **Un fork.** Es lo urgente. |
| **1** | Extraer el motor → `src/lib/artifact-composer/**`; el deck pasa a ser `catalogs/deck-axis`; `outputTarget` al contrato del catálogo | Slice 0 | Crece con cada consumer |
| **2** | **Brand pack como input**: capa de tokens generada desde el SoT declarado del pack, consumida por toda plantilla. `deck-axis` parte de Figma PPT `33:2`; las 25 dejan de hardcodear la paleta. AXIS pasa a ser *un* brand pack | Slice 1 | Brand drift × N catálogos **+ bloquea el as-a-service** |
| **3** | `Tender → Proposal` (dominio + tabla + `origin`) + **org scoping y entitlement per-ORG desde la primera migración** — **debe entrar ANTES de que TASK-1392 cree la tabla** | Slice 0 | **Una migración** (y un `WHERE org_id` agregado tarde siempre deja un reader sin filtrar) |
| **4** | Catálogo `social-carousel` (4:5 → PNG set) + su molde visual + su consumer en growth | Slices 1-2 | — |
| **5** | *(diferido, no ahora)* Lane `api/platform/ecosystem/*`, UI de cliente, billing por render | Slices 1-4 | — (las costuras ya están puestas) |

---

## Open Questions (deliberadamente no decidido)

- **Nombre final del home del motor.** Propuesto `src/lib/artifact-composer/**` (evita colisión con el
  **Composition Shell** de UI Platform, que es otra cosa). No es una decisión irreversible.
- **¿Los estados `awarded`/`not_awarded` se renombran a `won`/`lost`?** Son vocabulario de licitación. Hoy
  cuesta ~nada (no hay DB); después, una migración de enum. **Recomendación:** renombrar y resolver el
  copy visible por `origin` ("Adjudicada" si `public_tender`, "Ganada" si `direct_sales`). **No lo doy por
  decidido** — es el tipo de cosa que el operador debe vetar o confirmar.
- **¿El carrusel necesita generación de imagen (Media Foundry) además de composición?** Son primitives
  **distintos y complementarios**: Foundry **genera** el pixel (IA), el Composer **compone** el frame. Un
  carrusel puede usar los dos. **NO** se fusionan.
- **Prioridad de cola concreta** (pesos, clases, starvation guard): se define con datos reales de carga en
  TASK-1391, no a ojo.

---

## Revisit When

- Aparece un **tercer catálogo** cuyo `outputTarget` no sea `pdf-merged` ni `png-set` (p. ej. video/MP4, o
  PPTX editable). El contrato de `outputTarget` debería extenderse, **no** el motor bifurcarse.
- El volumen social crece hasta que el worker compartido deja de absorber ambos perfiles de carga →
  revisar si el catálogo social merece su propia cola (no su propio motor).
- Un catálogo necesita un resolver que **no** sea derivable del dato (hoy todos lo son: ícono, ordinal,
  geometría). Eso sería la señal de que se está colando lógica de dominio al catálogo.
