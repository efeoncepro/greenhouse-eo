# 12 · El arsenal — qué tenemos de verdad para vender

> 🔴 **Auditado contra el repo el 2026-07-13. No de memoria.**
> **Un vendedor que no sabe qué puede mostrar, improvisa. Y en esta categoría, improvisar es sonar como el que
> le falló.**

---

## 0. El resumen brutal

| | Estado |
|---|---|
| 🎯 **AEO** | **Producto real, live, con prescripción y entregables.** Es lo más fuerte que tenemos |
| 🔴 **SEO** | **NO existe como producto.** Vendemos el servicio; **no hay plataforma que lo respalde** |
| 🔴 **Prueba social** | **Cero casos citables.** Dos candidatos sin verificar |
| 🔴 **Propuesta** | **No existe una propuesta-tipo.** Cada una se arma de cero |

---

## 1. 🎯 El AI Visibility Grader — **el activo, y es más fuerte de lo que creíamos**

**Live en producción** desde 2026-06-30 (`src/lib/growth/ai-visibility/**`).

### Qué mide — 3 ejes que **NUNCA se promedian entre sí**

| Eje | Qué |
|---|---|
| **Percepción** *(7 dimensiones, pesos = 100)* | `ai_visibility` 25 · `entity_clarity` 15 · `category_ownership` 15 · `competitive_sov` 15 · `citation_quality` 15 · `message_alignment` 10 · `revenue_intent_coverage` 5 |
| **Probes técnicos** *(14 kinds, 3 ejes)* | **structural** (robots, JSON-LD, llms.txt, sitemap, CWV) · **agentic** (`.well-known/mcp`, API discoverability, DOM semantics, WebMCP) · **entity** (Knowledge Graph, Wikidata, Reddit) |
| **Motores** *(5)* | ChatGPT · Claude · Gemini · Perplexity · **Google AI Overview** *(vía DataForSEO)* |

### 🎯 Y lo que **NO** sabíamos: el Grader ya no da un score. Da la solución.

| Capa | Qué entrega |
|---|---|
| **Recomendaciones deterministas** *(no LLM)* | 6 gaps mapeados `gap → acción → motion`, **priorizados RICE** |
| 🎯 **Fix-It Artifacts** *(TASK-1269 · flag ON solo en staging)* | 🔴 **4 entregables DESCARGABLES:** `json_ld_starter` · `llms_txt_starter` · `content_brief_aeo` · `entity_action_brief` |
| **Tracking de ejecución** | Estado por gap: `not_started \| in_progress \| blocked \| done \| dismissed` |

> ## 🎯 No le damos un diagnóstico. Le damos el código para arreglarlo.
> **El `json_ld` listo para pegar. El `llms.txt` listo para subir. Gratis. Antes de cobrarle.**
>
> **Eso no es un lead magnet. Es "evidencia antes que promesa" llevada al límite —
> y ningún competidor en LATAM lo está haciendo.**

🔴 **Los Fix-It están detrás de flag y solo prendidos en staging.** **Prenderlos en producción es la acción de
producto con mejor ROI de la práctica.**

### Cómo usarlo *(→ `05_CUNA_GRADER.md`)*

- **Público:** `/api/public/growth/ai-visibility/run` · reporte en `think.efeoncepro.com/brand-visibility/r/<token>`
- **Operador:** `/admin/growth/ai-visibility` *(review, evidence, send-lead, assign-tier)*
- **Cliente:** `/aeo` en el portal *(entitlement per-ORG, no por rol)*
- ⚠️ **Gotcha:** verificar que el run sea **brand-aware** *(falso-0 histórico en marcas de consumo — SKY dio 0)*
- ⚠️ **Deuda viva:** Google AIO degrada a `skipped:missing_secret` en el **ops-worker de producción** (TASK-1341)

---

## 2. 🔴 SEO — el hueco

**EPIC-022 "Search Visibility 360": 19 tasks, TODAS en `to-do`. Cero código.**

| Lo que se vende | Lo que existe en el portal |
|---|---|
| Rank tracking | 🔴 **Nada** |
| Site audit | 🔴 **Nada** |
| Backlinks | 🔴 **Nada** |
| E-E-A-T scoring | 🔴 **Nada** |
| Topic clusters / topical authority | 🔴 **Nada** |
| Reportería SEO | 🔴 **Nada** |
| **Search Console** | ⚠️ **Panel de conexión OAuth** (TASK-1282/1283) — **staging ON, prod OFF.** Read-through, **sin histórico** |

> 🔴 **Consecuencia dura para la venta:**
> **La "capa 3 — plataforma" de `03_OFERTA` (el ancla que nunca se descuenta) SOLO existe para AEO.**
>
> **Cuando vendes un retainer de SEO y dices *"puedes entrar al portal y ver todo"*, para SEO eso todavía no
> es cierto.** 🔴 **No lo prometas.** Promételo para AEO, que sí lo tienes — y **declara que el SEO viene.**

🎯 **Y esto también es una oportunidad de venta honesta:**
*"Hoy te doy transparencia total en visibilidad de IA. En SEO, te doy el reporte del equipo. La capa de
autoservicio de SEO está en construcción — y cuando salga, la tienes sin costo adicional."*

---

## 3. Las landings de venta

| Landing | URL | Estado | Form | 🔴 Problema |
|---|---|---|---|---|
| **AEO** | `/aeo-2/` *(WP 250265)* | ✅ **Live** | `efeonce-aeo-diagnostic` → **HubSpot** ✅ + **auto-grader** *(TASK-1321)* | ⚠️ La URL es rara *(`/aeo-2/`, sin hub)*. **El copy usa el −27% de HubSpot cuando el dato verificado es −58% de CTR y −68% en paid** |
| **SEO** | `/servicios/posicionamiento-seo/` *(WP 251078)* | ✅ **Live** | `efeonce-seo-diagnostic` v3, 11 campos, Turnstile | 🔴🔴 **`deliveryMode = disabled` — LOS LEADS NO LLEGAN AL CRM** |

### 🔴🔴 La hemorragia

> **La landing de SEO está capturando leads que nadie ve. Desde que se publicó.**
> **`efeonce-seo-diagnostic` tiene la entrega a HubSpot DESHABILITADA.**
>
> 🔴 **Es el bug más caro de la práctica, y es de una línea de configuración.**

### ⚠️ Y la landing de AEO está **infravendiendo**

| Lo que dice hoy | Lo que el dato verificado permite decir |
|---|---|
| *"HubSpot perdió el 27% de su tráfico orgánico"* | 🎯 **"El #1 pierde el 58% de sus clics donde hay AI Overview — y hace 8 meses perdía el 34%"** |
| *"1 de cada 2 consumidores usa búsqueda con IA"* | 🎯 **"Y tus anuncios perdieron el 68% del CTR"** ← **el dato que hace entrar al CFO** |
| — | 🎯 **"Las marcas citadas reciben +35% orgánico y +91% pagado"** ← **el puente** |

🔴 **Estamos usando datos más viejos y más débiles que los que tenemos verificados.**
**Y no estamos usando el argumento del paid, que es el que abre el presupuesto grande.**

---

## 4. Lead magnets y contenido *(Think)*

| Activo | Estado |
|---|---|
| **Reporte público del Grader** | ✅ **Live** — `think.efeoncepro.com/brand-visibility/r/<token>` + **short links** ON en prod |
| **Landing `/brand-visibility`** | ✅ Live *(la task figura `in-progress` — drift doc↔runtime)* |
| **Ebook "El fin de la web solo para humanos"** | ✅ **Live** en `/web-agentica` — form + descarga + email ON en prod |
| **Ebook "Surround Discovery"** | ✅ Live en `/seo-surround-discovery` *(falta smoke humano)* |
| **Escalera de madurez 5-Be** | ✅ En el reporte *(Ser encontrada / legible / correcta / accionable / intrínseca)* |
| **Blog + newsletter Glitch** | ✅ Live |

🎯 **Dos ebooks + el reporte público + la escalera 5-Be = munición de nurturing que hoy casi no usamos en
outbound.** *(→ `09_CANALES_OUTBOUND`.)*

---

## 5. Prueba social — lo que hay y lo que le falta

### 🔴 Casos citables hoy: **CERO** *(las 3 condiciones: métrica verificada + relación sana + autorización)*

### 🎯 Pero hay **dos candidatos**, y no partimos de cero

| Candidato | El número | 🔴 Qué le falta |
|---|---|---|
| **Sky** | **+127% de tráfico orgánico** *(vs LATAM)* | ⚠️ **Es tráfico, no AEO.** Falta: **verificar contra su GSC · declarar el denominador y la ventana · pedir autorización** |
| **Bresler** | **+180% de ventas digitales** | ⚠️ Falta lo mismo — **y la atribución al SEO** |
| **Berel** | Retainer SEO+AEO adjudicado *(licitación wherEX #5234, may-2026)* | 🔴 **Sin métrica de resultado.** Es el candidato natural para construirlo bien desde el baseline |

🔴 **La regla no cambia: sin las 3 condiciones, NO se usa.** Ni "ilustrativo", ni redondeado.
🎯 **Pero el trabajo pendiente no es "conseguir un caso": es VERIFICAR dos números que ya tenemos.**

### Logos *(sin métrica, pero usables)*

`docs/assets/public-site/aeo-brand-logos/` — **Sky · ANAM · Berel · Carozzi · Bresler · Marca Chile ·
Aguas Andinas · BeFUN · Gobierno de Santiago · Universidad de Temuco.**

🎯 **Un muro de logos no prueba resultados, pero prueba que empresas serias nos dejan entrar.**
**En una categoría con déficit de confianza, eso vale.**

### 🔴 Testimoniales: **no existe ninguno en el repo.**

---

## 6. Propuestas y decks

| | Estado |
|---|---|
| **Licitación SKY** *(`docs/commercial/tenders/sky-blog-2026/`)* | ✅ **El único artefacto real.** Oferta técnica + económica + `deck-plan.json` + benchmark competitivo + squad blueprint |
| 🔴 **Propuesta-tipo de SEO/AEO** | 🔴 **NO EXISTE.** Cada propuesta se arma de cero |
| 🔴 **Catálogo del Artifact Composer para SEO/AEO** | 🔴 **NO EXISTE** *(solo `deck-axis`)* |

🎯 **Lo bueno del deck de SKY, y hay que reusarlo:** **usa el Grader corrido sobre SKY como diagnóstico** y
**linkea el informe público live**. **Esa es la estructura de la propuesta-tipo.** → `templates/propuesta-tipo.md`

---

## 7. 🔴 Drifts que hay que saber antes de hablar

| Drift | Qué pasa |
|---|---|
| 🔴 **Otterly.ai como fuente de verdad del `ACR`** | El contrato de métricas ICO *(`docs/context/06_glosario-metricas.md`)* declara **una herramienta de la competencia** como fuente de verdad del *AEO Citation Rate* — **y no está integrada, teniendo nosotros el Grader.** **Corregir el doc: la fuente es el Grader** |
| 🔴 **Form SEO sin entrega** | `deliveryMode=disabled`. **Leads al vacío** |
| ⚠️ **Google AIO en prod** | Degrada a `skipped:missing_secret` en el ops-worker (TASK-1341) |
| ⚠️ **Credenciales expuestas** | Perplexity + DataForSEO — **rotar** *(ledger de flags)* |
| ⚠️ **`/servicios/` no es un hub real** | Y **no existe `/servicios/aeo`** — el AEO vive en `/aeo-2/` |

---

## 8. Las cinco acciones que este inventario ordena

| # | Acción | Por qué |
|---|---|---|
| **1** | 🔴🔴 **Prender la entrega del form SEO a HubSpot** | **Una línea de config. Los leads están cayendo al vacío** |
| **2** | 🎯 **Prender los Fix-It Artifacts en producción** | **Es el arma de venta más fuerte que tenemos y está apagada** |
| **3** | 🎯 **Actualizar el copy de la landing AEO** *(−58% CTR · −68% paid · +35%/+91%)* | **Estamos infravendiendo con datos viejos** |
| **4** | 🎯 **Verificar los casos de Sky y Bresler** *(no "conseguir" — VERIFICAR)* | **Ya tenemos los números. Falta el rigor** |
| **5** | ⚠️ **Corregir el drift de Otterly** | **Declaramos la herramienta de un competidor como nuestra fuente de verdad** |
