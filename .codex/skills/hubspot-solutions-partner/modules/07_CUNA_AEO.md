# 07 · La cuña AEO — la entrada diferenciada de Efeonce

> **La jugada:** no vendas HubSpot donde HubSpot es Niche Player. Entra por donde es Leader hace cinco años,
> con un diagnóstico que **solo tú puedes hacer**, sobre un problema que el mercado ya está sufriendo.

---

## 1. Por qué existe esta cuña — tres hechos que se cruzan

| Hecho | Fuente |
|---|---|
| **HubSpot lanzó AEO como producto** (abr-2026): mide visibilidad de marca en ChatGPT, Gemini y Perplexity, con benchmark competitivo y análisis de citaciones. **$50/mo standalone — incluido en Marketing Pro/Enterprise** | ✅ Spring 2026 Spotlight |
| **Su propio dato de justificación:** tráfico orgánico **−27% interanual**; tráfico de referencia desde IA **×3** | ✅ HubSpot |
| **Efeonce ya tiene el diagnóstico construido**: el **AI Visibility Grader** (`src/lib/growth/ai-visibility/**`), 7 dimensiones, multi-motor, brand-aware | Repo Greenhouse |
| **En los mercados de Efeonce la búsqueda de categoría casi no existe** — Chile: `crm para empresas` = **20/mes** | ✅ Semrush 2026-07-13 |

**El cruce:** el problema que HubSpot AEO resuelve **es exactamente el que tus mercados están sufriendo**, y
tú tienes el instrumento para *demostrárselo* al cliente antes de venderle nada. Dudo que otro partner de la
región tenga esta combinación armada.

---

## 2. La cuña, en cinco movimientos

```
1. DIAGNÓSTICO GRATIS   →  Corres el AI Visibility Grader sobre su marca y sus competidores
2. EL GAP, DEMOSTRADO   →  "Cuando tu comprador le pregunta a ChatGPT quién hace X, aparece tu
                            competidor. Tú no. Acá está el output, motor por motor."
3. EL MARCO             →  Loop Marketing, etapa AMPLIFY: "distribuir donde buscan humanos Y bots"
4. EL PRODUCTO          →  HubSpot AEO — que viene INCLUIDO en Marketing Hub Pro/Enterprise
5. LA IMPLEMENTACIÓN    →  Lo operas tú. Y desde ahí expandes a Sales, Service y Data.
```

**Por qué funciona y no es un truco:**
- Es **un diagnóstico, no un pitch**. Empiezas dándole algo verdadero y verificable, no una promesa.
- El gap **no es opinable**: le muestras el output real de los motores.
- El producto que lo cierra **no es un add-on que hay que justificar**: viene **incluido** en un tier que
  probablemente ya deberían tener. **Es un argumento de upgrade, no de compra nueva.**
- Y aterriza justo donde HubSpot es **Leader del MQ de B2B Marketing Automation por 5.º año** ✅ — no en el
  cuadrante donde es Niche Player.

---

## 3. El giro de precio que cierra la conversación

**HubSpot AEO cuesta $50/mes standalone. Viene incluido desde Marketing Hub Professional.** ✅

Eso convierte una conversación de compra en una conversación de **aritmética**:

> *"AEO suelto son $50 al mes. Marketing Hub Pro son $800 y lo trae adentro, más automation, más
> atribución, más el CRM. La pregunta no es si compras AEO. Es si tiene sentido comprarlo suelto."*

Y para un cliente que **ya tiene Marketing Hub Pro**: *"ya lo estás pagando. No lo estás usando."*
Eso es una conversación de **adopción**, que es gratis para ti y valiosa para él — y es exactamente el tipo
de gesto que te gana el derecho a proponer el siguiente Hub. → `modules/03_MOTOR_LIBRO.md` § 5.

---

## 4. A quién se la aplicas — por orden de facilidad

| Segmento | Por qué | Punto de entrada |
|---|---|---|
| 🥇 **Tus propios clientes con Sales Hub y sin Marketing Hub** | Ya eres su partner admin. Ya te dieron acceso. Cero fricción | Cross-sell de Marketing Hub Pro = **80 pts sourced**. Es la motion más barata que existe |
| 🥈 **Clientes tuyos con Marketing Hub que no usan AEO** | Ya lo pagan | Adopción → confianza → el siguiente Hub |
| 🥉 **La base instalada de HubSpot que vendió otro partner** | Bajo el **deal-based model**, comisionas igual ✅ | Outbound con el grader como carta de presentación → `modules/08` |
| 4️⃣ **Prospectos sin HubSpot, con marca visible y tráfico cayendo** | El dolor es real y medible | El grader como lead magnet → `modules/09` |

---

## 5. Cómo se ejecuta el diagnóstico

**Dueño del método: `seo-aeo`.** Esta skill lo **consume**, no lo reimplementa.

1. **Corre el grader** — camino canónico: `POST /api/admin/growth/ai-visibility/runs` en staging, todos los
   motores. Modo `full` es async → drenar el cron → leer el score.
2. **Léelo con criterio, no con fe.** Dos gotchas conocidos: la categoría debe resolver a la taxonomía (si no,
   cae al arquetipo genérico de agencia); y hay drift de extracción en prosa — si `sentiment` o `brandMentioned`
   salen `unknown`, **ese run no es confiable**. Vuelve a correrlo antes de mostrárselo a nadie.
3. **Compáralo contra sus competidores reales**, no contra un ideal. El gap relativo es lo que duele.
4. **Preséntalo como evidencia, no como reporte de marketing.** Motor por motor, prompt por prompt.
   → `deck-studio` para la lámina; **Assertion-Evidence**, no bullets.

🔴 **Regla dura:** **NUNCA** muestres un run con `unknown` en las dimensiones clave. Un dato malo en una
reunión enterprise cuesta más que no tener dato.

---

## 6. El guion (versión corta, para una primera llamada)

> *"Antes de venderte nada quiero mostrarte algo. Le preguntamos a ChatGPT, a Gemini y a Perplexity quién
> hace [tu categoría] en [tu mercado]. Estas son las respuestas.*
>
> *Apareces en cero de los tres. [Competidor] aparece en dos.*
>
> *Esto no es un problema de SEO. Tu SEO puede estar bien. Es que el 27% del tráfico orgánico se evaporó
> este año —el dato es de HubSpot, no mío— y se fue a las respuestas de IA, donde tú no estás.*
>
> *Hay un producto que mide y cierra esa brecha, y ya viene incluido en el plan de marketing que
> probablemente deberías tener. Lo que no viene incluido es alguien que lo opere. Eso es lo que hacemos."*

**Registro:** en cliente enterprise, **trato formal de usted**. Formal ≠ frío. → `feedback_tender_formal_register`.

---

## 7. Sinergias — quién hace qué

| Pieza | Dueño |
|---|---|
| El método AEO/GEO, las 7 dimensiones, la doctrina de citabilidad | **`seo-aeo`** |
| El motor del diagnóstico (`src/lib/growth/ai-visibility/**`) | El producto Greenhouse. **Entitlement per-ORG** — no es rol → `project_aeo_entitlement_model` |
| La narrativa y la lámina | **`deck-studio`** (+ `copywriting`) |
| El copy visible | **`greenhouse-ux-writing`** |
| Los assets de captura (comparador, calculadora, ebook) | **`content-marketing-studio`** |
| El canal por mercado | `modules/06_MAPA_DE_DEMANDA.md` + `markets/` |
| La cotización de Marketing Hub | `modules/11_PROPUESTA_PRICING.md` |

---

## 8. Anti-patrones de la cuña

| Anti-patrón | Por qué |
|---|---|
| **Mostrar el grader como reporte de marketing** | Es **evidencia forense**. En cuanto huele a folleto, pierde todo su poder |
| **Correrlo y no mostrar a los competidores** | El número absoluto no duele. **El gap relativo, sí** |
| **Mostrar un run con `unknown`** | Un dato malo en una reunión enterprise cuesta más que no tener dato |
| **Vender AEO suelto** | $50/mo es un ticket que no paga tu implementación. **La cuña es la entrada a Marketing Hub**, no el destino |
| **Reimplementar el método AEO acá** | Es de `seo-aeo`. Esta skill lo consume |
| **Prometer posiciones en LLM** | Nadie controla lo que responde un LLM. Prometes **medición, método y mejora relativa** — jamás un ranking |
