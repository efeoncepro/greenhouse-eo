# PDR-008 — Posicionamiento de la landing "Agencia" (`/agencia`)

> **Tipo:** Product Decision Record (posicionamiento/GTM + IA de una superficie del sitio público).
> **Estado:** Accepted (posicionamiento + copy/CRO/SEO) — **§Arquitectura de información refinada por [PDR-010](PDR-010-home-es-el-pitch-agencia-se-pliega.md)**.

## Delta 2026-07-08 — el pitch de `/agencia` ES la Home (PDR-010)

Al escribir el copy quedó claro que el pitch de `/agencia` y el de la Home son **el mismo discurso**: una agencia tiene un solo trabajo de venta arriba del embudo. Decisión ([PDR-010](PDR-010-home-es-el-pitch-agencia-se-pliega.md)): **`/agencia` NO se construye como página separada; su contenido es el de la Home** (que absorbe posicionamiento de categoría + head term "agencia de marketing digital" en title/H1 + repartición a spokes). `/agencia` nunca existió (sin 301) → sin costo de plegado. **TASK-1358 se reorienta** de "crear `/agencia`" a "rework de la Home como el pitch". El material de identidad (4 unidades, ICO, ecosistema) se relocaliza al **About Us** (gap real). **Todo lo de abajo (dos capas, reencuadre no-es-X-es-Y, anti-ICP, casos citables, voz, JSON-LD, CRO, grader compartido) sigue vigente, aplicado a la Home** — solo cambia el contenedor.

## Delta 2026-07-09 — auditoría live del Home endurece el rework

La revisión del Home público live contra el Why y PDR-012 confirma que el contenido histórico de este PDR no debe ejecutarse como página nueva ni como simple "copy paste" a la Home. Debe aplicarse como **rework integral del pitch**:

- El Home actual ya contiene señales correctas (`ecosistema`, IA, creatividad, tecnología, resultados), pero todavía vende más una agencia creativa/digital competente que un **Growth Operating System / ASaaS**.
- El primer viewport debe liderar con el reencuadre de categoría: no otra agencia de marketing digital; un sistema operativo de crecimiento con operación visible, software, datos y memoria.
- El residuo de template/demo/theme en el Home live es blocker de confianza y debe eliminarse antes de declarar alineación con este PDR.
- PDR-010 y PDR-012 mandan sobre cualquier texto de este documento que suene a landing separada `/agencia`.

> **Skills:** `commercial-expert` (overlay GH), `growth-marketing-cro`, `copywriting`, `digital-marketing`, `seo-aeo`, `product-design-loop`, `efeonce-public-site-wordpress`.
> **Ejecución:** [`TASK-1358`](././tasks/to-do/TASK-1358-landing-agencia.md) (+ wireframe + flow + motion). Epic: `EPIC-019`.
> **No-duplicación:** el sustrato ya vive en el context pack — este PDR **cita**, no copia: `docs/context/09_marca-agencia.md` (masterbrand + categoría "growth partner"), `docs/context/05_voz-tono-estilo.md` (voz + clichés a evitar), `docs/context/13_icp-buyer-personas-jtbd.md` (ICP mid-market/enterprise + BPs), `docs/context/02_gtm.md`, `docs/context/14_modelo-negocio-asaas.md` (oferta productizada).

## Contexto

El sitio público tiene un about-us (`/about-us-efeonce/`, page_id 249770) que ya carga el posicionamiento masterbrand ("El crecimiento real no se compra por partes. Se orquesta." · eyebrow "Agencia de crecimiento integrada") y un conjunto de **spokes de servicio** decididas — SEO (`TASK-1343`), AEO (`/aeo-2`→`/servicios/aeo`), creativa (`PDR-004`), redes (`PDR-005`), HubSpot (`PDR-006`), desarrollo web (`TASK-1345`). **Falta la landing pillar que posiciona a Efeonce como agencia full-service** y captura la demanda de búsqueda de la **categoría** ("agencia de marketing digital"). Sin ella, alguien que busca la categoría completa no tiene puerta de entrada comercial: cae en spokes sueltas o en el about-us (que es nodo de confianza, no de conversión de tráfico frío).

Pregunta del operador: *¿hacemos una landing que hable como "partner de crecimiento para mid-market" o como "agencia digital" (categoría que el mercado asocia)?* La disciplina de este espacio (los slugs se cierran con datos, ver [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md)) exigió verificar la demanda real antes de decidir.

### Datos que cerraron la decisión (Semrush, database `cl`, 2026-07-07)

| Keyword | Vol/mes | CPC | Comp. | Lectura |
| --- | --- | --- | --- | --- |
| **agencia de marketing** | **1.000** | 1.60 | 0.62 | Head term de categoría |
| agencia digital | 720 | 1.97 | 0.22 | Categoría, intención comercial |
| **agencia de marketing digital** | **720** | 2.93 | 0.49 | Categoría (CPC alto = alta intención) |
| agencia de publicidad | 480 | 1.08 | 0.56 | Categoría adyacente |
| growth marketing | 480 | 0.78 | 0.52 | Menor + riesgo de voz *startup-bro* (`05:32`) |
| **partner de crecimiento** | **~0** | — | — | **Nadie lo busca** → gran promesa, pésimo slug |
| agencia growth | 90 | 0.35 | 0.08 | Marginal |
| performance marketing | 140 | 1.22 | 0.37 | **Capability, no slug** (todo el cluster performance ≤480 e informacional) |
| paid media / agencia google ads | 480 / 50 | — | — | Servicio a listar, no cabecera |

**Hallazgo decisivo:** "partner de crecimiento" tiene **volumen cero** — es una *promesa*, no un término buscable. El cluster "agencia (de marketing) digital" junta **~2.400/mes** de demanda de categoría real. La dicotomía del operador es falsa: **posicionamiento** y **descubrimiento** son dos capas distintas.

## Decisión — `/agencia`: growth partner reencuadrando la categoría buscada

Crear `/agencia` como **pillar comercial de categoría**: **posiciona** como *growth partner con sistema operativo propio* (doctrina canónica `09:53`, NO "agencia digital" commodity) pero **captura** la demanda de la categoría buscada en la capa SEO. Es la resolución de dos capas que [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md) ya institucionalizó para las spokes: **el slug/title cargan la keyword que se busca; el hero/copy cargan la categoría diferenciada.**

### 1. Dos capas, una página (posicionamiento vs descubrimiento)

- **Capa de posicionamiento** (hero, promesa, lo que Efeonce reclama ser): **growth partner con software propio y visibilidad total**. Claim canónico de apertura: *"El crecimiento real no se compra por partes. Se orquesta."* (`09`). Enemigo declarado: **la fragmentación** — una agencia hace la marca, otra los ads, otra el sitio, otra el CRM, y nadie conecta nada.
- **Capa de descubrimiento** (slug `/agencia`, `<title>`, H1, meta, JSON-LD): target al cluster **"agencia de marketing digital" / "agencia de marketing"** (los ~2.400/mes reales), reencuadrado en la misma línea con la estructura *no-es-X-es-Y* (Do canónico de voz, `05:73`).
- **Titular puente** (candidato, ya vivo como eyebrow del about-us): **"Agencia de crecimiento integrada"** — usa *agencia* (categoría familiar y buscable) + *de crecimiento* (growth partner) + *integrada* (anti-fragmentación). Es el reencuadre exacto: findable **y** desmarcado del commodity.
- **Regla dura de copy:** el H1 puede contener "agencia de marketing digital" por SEO, pero el **remate de la misma sección** debe reencuadrar (*"No somos una agencia de marketing digital más. Somos tu partner de crecimiento — con software propio y visibilidad total."*). NUNCA dejar "somos una agencia digital" como promesa sin reencuadre.

### 2. Full-service como sistema integrado (no lista de servicios sueltos)

El scope es **full-service** — creatividad y contenido, **performance marketing / medios**, web/CRM/infraestructura, data — presentado como **un solo motor**, no un menú. Mapea a las capabilities masterbrand (`09`: Globe creatividad · Reach medios/amplificación · Wave infra digital), nombradas **descriptivamente** hacia el cliente, nunca como sub-marcas separadas.

- **Performance marketing es capability listada, no cabecera** (dato: cluster performance ≤480/mes, informacional). Se muestra como una de las manos del motor (demand capture: paid media, Google/Meta ads, retargeting, medios), no como el título de la página.
- **Brand + performance como sistema** (doctrina `digital-marketing`): demand *creation* (creatividad/contenido/social, futuro) + demand *capture* (performance/medios/CRM, hoy) como dos velocidades de un mismo motor. Ese framing ES el anti-fragmentación hecho oferta.
- Cada capability enlaza a su **spoke** cuando existe (`/servicios/posicionamiento-seo`, `/servicios/aeo`, creativa, redes, web, hubspot): `/agencia` es el **pillar que reparte hacia las spokes** (link equity + wayfinding), no las reemplaza.

### 3. Audiencia mid-market/enterprise + prueba que ninguna agencia da

- Comprador: equipos de marketing **mid-market/enterprise** (ICP `13`). Decisores primarios (comité de compra `13`): **CMO bajo presión de revenue** (BP1), **Dir. Marketing / Head of Growth** (BP2), **CEO/GM** (BP3); validador Compras (BP-procurement). El dolor núcleo es **fragmentación de proveedores + falta de visibilidad de retorno** (no "necesito otra agencia").
- **Anti-ICP explícito por copy** (mitiga el riesgo #1 de `PDR-001`): sin señales de precio commodity ("desde $X/mes"), sin lenguaje SMB. El posicionamiento premium repele al comprador que el modelo ASaaS no sirve con margen.
- **Diferenciador que se *demuestra*, no se afirma:** el ecosistema de producto (Greenhouse + Kortex + Verk) y la operación medible en vivo (ICO: RpA/OTD%/FTR, Revenue Enabled) — *"las agencias te entregan informes; nosotros te damos login a tres plataformas donde ves tu operación en tiempo real"* (`09` variante ASaaS). La transparencia operativa como **mínimo, no diferenciador** (`05` creencia 7).
- **Solo casos citables:** Sky (+127% tráfico orgánico), Bresler (+180% ventas digitales), Pinturas Berel (retainer SEO+AEO). **** (`13`).

### 4. Marca, conversión y CRO

- **Lidera la masterbrand Efeonce.** Globe/Reach/Wave nunca solos; capabilities descritas, no siglas en los primeros 30s (`09` regla cardinal: beneficios antes que nombres). Tuteo es-CL neutro.
- **CTA primario: "Agenda una reunión"** + UTM/atribución preservada; fallback `/contacto/` + WhatsApp/mailto. **Mecanismo a decidir en ejecución** (ninguna landing viva lo tiene aún): HubSpot Meetings embed (net-new, sin precedente gobernado) **vs** `<greenhouse-form>` de solicitud de reunión in-page (patrón gobernado ya vivo en SEO/desarrollo-web, menor riesgo). Preferencia por el path gobernado salvo decisión explícita del operador. **CTA secundario de bajo compromiso** (dos escalones, patrón `PDR-004/005/006`): *"Mira cómo operamos"* (video/tour del ecosistema) o el grader como diagnóstico gratis.
- **CRO (doctrina `growth-marketing-cro`):** el 80% del lift es **message-market fit + confianza**, no micro-ajustes. Orden: claridad de propuesta → prueba (casos citables + logos + 4 países + 90+ clientes) → objeciones (miedo a tercerizar = perder control → lo resuelve la visibilidad total) → CTA. **Velocidad/CWV y trust signals son palancas de conversión de primer orden** (cada +100ms ≈ −1% conversión; juicio de confianza en ~50ms). El grader es la **costura** top→bottom (nodo compartido, `PDR-003`), no se reconstruye.
- **Web agéntica:** la landing nace con datos estructurados / JSON-LD `Organization`+`Service` y citabilidad (skill `seo-aeo`) para ser recuperada por motores de respuesta, no solo por humanos.

## Arquitectura de información (IA/URL)

`/agencia` es un **pillar de nivel superior** (apex, `efeoncepro.com/agencia`), distinto de sus vecinos:

```text
efeoncepro.com/ (home) marca + ecosistema ASaaS · entrada primaria
├── /agencia PILLAR de categoría · "agencia de marketing digital" · growth partner · full-service
│ └── reparte ↓ hacia las spokes (link equity + nav)
├── /servicios hub navegacional (SEO-neutro · PDR-002)
│ ├── /servicios/posicionamiento-seo spoke SEO (TASK-1343)
│ ├── /servicios/aeo spoke AEO (← 301 /aeo-2)
│ └── … creativa · redes · web · hubspot
├── /about-us-efeonce/ nodo de confianza / E-E-A-T (identidad, no captura de categoría)
└── think.efeoncepro.com → AI Visibility Grader NODO de conversión compartido (costura del funnel)
```

- **`/agencia` ≠ `/servicios`:** `/servicios` se decidió **navegacional/SEO-neutro** (`PDR-002`); cargarle el head-term "agencia de marketing digital" + la narrativa full-service rompería su rol de directorio. `/agencia` es el **pillar narrativo + puerta SEO de la categoría**, canonical limpio y linkeable; `/servicios` queda como hub funcional. Cross-link explícito entre ambos.
- **`/agencia` ≠ about-us:** intención de búsqueda distinta (comercial vs marca/navegacional). Un about-us compitiendo por "agencia de marketing digital" pierde ranking por *mismatch* de intención y convierte mal el tráfico frío. El about-us queda como **respaldo E-E-A-T** que `/agencia` enlaza para confianza.
- **Slug:** `/agencia` (simple, memorable, evergreen) sobre `/agencia-de-marketing-digital` (más literal para SEO pero frágil/largo); el head-term se carga en `<title>`/H1/meta, no en el path (mismo patrón que las spokes: slug categoría, keyword en title). Preferencia del operador confirmada.
- **Canonical/301:** `/agencia` es página **nueva** → sin 301 entrante. Registrar en el [route-ownership matrix](././operations/public-site-route-ownership-matrix-20260616.md) (fila service/pillar pages) + SEO preflight (crawl inventory, canonical apex, HubSpot IDs/UTM, GVC desktop+mobile) antes de indexar. Preparar `hreflang`-ready (es-LATAM neutro) para la fase EEUU/mundo (`PDR-002` §alcance regional).
- **Alcance regional:** copy **es-LATAM neutro** (tuteo, sin voseo, sin chilenismos) — "agencia de marketing digital" es head-term pan-LATAM (gana en EC/MX/CO/PE/AR además de CL). NO hardcodear referencias Chile-only.

## Consecuencias

- Cierra el gap del **pillar de masterbrand/categoría**: el sitio pasa de "spokes de servicio sueltas + about-us" a tener una puerta comercial para la demanda de categoría completa.
- Captura ~2.400/mes de intención de categoría sin ceder al commodity, alimentando el mismo embudo gobernado (grader → HubSpot 48713323).
- Coherencia con `PDR-002/003/004`: nodo de la capa de adquisición (demand-capture) en `efeoncepro.com`; reparte hacia spokes; grader como nodo único.
- El bloque diferenciador usa cifras **ilustrativas** del modelo de operación (no data live del portal); conectar data real sería task aparte.
- **4 pilares:** Safety = riesgo commodity mitigado por el reencuadre framework + anti-ICP; página nueva, sin 301 riesgoso. Robustez = la demanda de categoría sostiene aunque las spokes evolucionen. Resiliencia = es una landing, reversible; registrada en el matrix para port 1:1 a Astro. Escalabilidad = admite más capabilities/spokes sin refactor; `hreflang`-ready.

## Alternativas descartadas

- **Landing "somos una agencia digital"** (categoría como *promesa*) — viola la doctrina masterbrand (`09:53` la marca explícita como commodity a evitar) y mete a Efeonce en el balde indiferenciado que el 68% de compradores B2B ya percibe.
- **Landing "partner de crecimiento"** (posicionamiento como *slug*) — volumen de búsqueda cero; sería invisible en descubrimiento. Gran promesa, pero no es puerta SEO.
- **Que el about-us haga este trabajo** — mismatch de intención (marca/navegacional vs comercial) → pierde ranking de categoría y convierte mal tráfico frío. Son dos jobs distintos.
- **Que `/servicios` sea el pillar** — `/servicios` se decidió navegacional/SEO-neutro (`PDR-002`); recargarlo rompe su rol y confunde directorio con narrativa.
- **Liderar con "performance marketing" / "growth marketing"** — cluster de bajo volumen (≤480), y "growth" está señalado como riesgo *startup-bro* en la voz (`05:32`). Van como capability listada, no como cabecera.
- **Slug `/agencia-de-marketing-digital`** — literal pero largo/frágil; el head-term se carga en title/H1/meta, no en el path (patrón PDR-002).

## No-goals

- No es un about-us (ese ya existe y hace su propio job de confianza/E-E-A-T).
- No es self-serve, no expone el portal ni datos de cliente.
- No reemplaza las spokes de servicio ni el hub `/servicios` — las **reparte** y cross-linkea.
- No lidera con "somos ágiles/rápidos/una agencia digital" sin la prueba medible y el reencuadre.
- No migra a Astro ni cambia de host (build = WordPress code-custom o Ohio/Elementor según decida la task; no bloquea este PDR).
- No nombra sub-marcas (Globe/Reach/Wave) como proveedores separados al cliente.

## Reglas duras

- **NUNCA** dejar "somos una agencia de marketing digital" como promesa sin el reencuadre *no-es-X-es-Y* en la misma sección — el H1 captura la keyword; el remate desmarca del commodity.
- **NUNCA** liderar con siglas/metodologías (ICO/RpA/FTR/Loop) en los primeros 30s — beneficios primero, nombres en el bloque de prueba (`09`).
- **NUNCA** poner señales de precio commodity ("desde $X/mes") ni lenguaje SMB — repele al ICP mid-market/enterprise.
- **NUNCA** inflar cifras — solo casos citables (Sky/Bresler/Berel).
- **NUNCA** reconstruir/duplicar el nodo grader — se enlaza como diagnóstico compartido (`PDR-002/003`).
- **NUNCA** nombrar Globe/Reach/Wave solos ni como proveedores separados — masterbrand Efeonce lidera, capabilities descriptivas.
- **SIEMPRE** copy es-LATAM neutro (tuteo, sin voseo/chilenismos) + `hreflang`-ready.
- **SIEMPRE** CTA primario "Agenda una reunión" (HubSpot Meetings + UTM) + secundario de bajo compromiso; preservar atribución por origen.
- **SIEMPRE** ejecutar vía `efeonce-public-site-wordpress`, validar copy con `greenhouse-ux-writing` (es-CL, sin exponer marca del portal interno), y verificar con GVC (desktop+mobile) antes de indexar.
- **SIEMPRE** registrar `/agencia` en el route-ownership matrix + SEO preflight antes de que llegue a producción indexable.

## Enlaces

- Posicionamiento/GTM: `docs/context/09_marca-agencia.md`, `05_voz-tono-estilo.md`, `13_icp-buyer-personas-jtbd.md`, `02_gtm.md`, `14_modelo-negocio-asaas.md`.
- PDR hermanos: [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md) (IA/dos capas), [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md) (ecosistema), [PDR-004](PDR-004-landing-agencia-creativa-posicionamiento.md) (creativa · patrón de landing de marca).
- IA/rutas: [route-ownership matrix](././operations/public-site-route-ownership-matrix-20260616.md).
- Ejecución: [`TASK-1358`](././tasks/to-do/TASK-1358-landing-agencia.md) bajo `EPIC-019`.
- Skills: `commercial-expert`, `growth-marketing-cro`, `copywriting`, `digital-marketing`, `seo-aeo`, `product-design-loop`, `efeonce-public-site-wordpress`, `greenhouse-ux-writing`.
