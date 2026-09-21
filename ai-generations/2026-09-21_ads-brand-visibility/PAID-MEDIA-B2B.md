# Embudo de Paid Media B2B — SEO/AEO

> **Gobierna:** `seo-aeo-practice` §9 (canales y la aritmética) · `digital-marketing` (ejecución de canal) ·
> `growth-marketing-cro` (medición) · **Destino:** Brand Visibility Grader → Search Visibility 360

## La regla que ordena toda la pauta

> ## En paid NO se vende SEO. En paid se REGALA el Grader.
> Nadie hace clic en «contrata nuestra agencia de SEO». Sí hace clic en «¿tu marca aparece cuando le
> preguntan a ChatGPT por tu categoría? Averígualo gratis».

Y de ahí sale el guardrail de copy: **la palabra «SEO» no aparece arriba del embudo.** Está quemada y carga la
cicatriz. Arriba se habla de **motores de respuesta**; «SEO» entra abajo, con evidencia delante.

---

## Las cinco etapas de pauta

### E1 · Instalar el problema — *cold, sin pedir nada*

| | |
|---|---|
| **Plataforma** | LinkedIn (alcance / video views) · YouTube 16:9 como refuerzo |
| **Audiencia** | Cargo: CMO · Head of Growth · Director Digital · **CFO** · tamaño de empresa; mid-market y enterprise |
| **Pieza** | `d1-la-respuesta` (4:5) — la sala vacía, la máquina de pie |
| **CTA** | Ninguno |
| **Mide** | Alcance único, retención de video, coste por alcance. **No leads.** |
| **Por qué** | Sin esta etapa, la etapa 2 le habla a gente que no sabe que tiene el problema |

### E2 · Capturar al que ya tiene el incendio — *cold calificado*

| | |
|---|---|
| **Plataforma** | **LinkedIn** (el comprador está ahí; CPC USD 8–15, pero el lead califica solo) + **Google Ads al DOLOR** |
| **Google: pujar por el problema, NUNCA por la categoría** | «por qué bajó mi tráfico orgánico» · «aparecer en ChatGPT» · «AI Overviews tráfico» · «mi web perdió visitas» |
| **Piezas** | Las cinco capas: `b1` `c1` `b3` `c2` `b2` — una por capa, rotando |
| **CTA** | **Ver qué dicen de ti** → Grader |
| **Mide** | Coste por informe entregado — **métrica intermedia, no el objetivo** |

🔴 **NUNCA pujar por «agencia SEO»**: CPC alto, intención comoditizada, compites con freelancers — y el CTR
pagado de esa categoría cayó 68%.

### E3 · Recuperar al que miró y no completó — *retargeting*

| | |
|---|---|
| **Plataforma** | **Meta** — aquí sí, y sólo aquí. Es malísimo para prospección fría B2B y excelente para retargeting |
| **Audiencia** | Visitó el Grader, `/aeo-2/`, `/servicios/posicionamiento-seo` o Think, y no completó |
| **Pieza** | 🔴 **FALTA** — la descalificación honesta («te decimos para qué NO te sirve») |
| **CTA** | Terminar el diagnóstico |
| **Por qué esa pieza** | Quien abandonó a mitad duda de nosotros, no del tema. La honestidad es la que lo recupera |

### E4 · Mover al comité — *warm, el argumento del CFO*

| | |
|---|---|
| **Plataforma** | LinkedIn (retargeting de quienes vieron el informe) + Meta lookalike sobre clientes |
| **Pieza** | 🔴 **FALTA** — la eficiencia de medios |
| **Ángulo** | La citación no es un canal nuevo: es la condición para que el canal que ya pagas siga rindiendo |
| **CTA** | **Agendar en `/agenda/`** o pedir cotización en la landing del servicio |
| **Por qué** | Es lo único que hace entrar al CFO, y casi nadie en la categoría lo está diciendo |

### E5 · Expansión y prueba — *post-venta*

| | |
|---|---|
| **Plataforma** | Meta lookalike sobre la lista de clientes · LinkedIn a cuentas objetivo (ABM) |
| **Pieza** | 🔴 **FALTA** — transparencia como producto |
| **Nota** | El cross-sell **no se pautea**: se corre el Grader a la cartera actual y se lleva al QBR. Es el pipeline más barato que existe y tiene fricción cero |

---

## 🔴 La conversión es la reunión, no el informe [operador, 2026-09-21]

El Grader es el **medio**: se regala para ganarse el derecho a pedir la reunión. **El fin es reunión agendada o
cotización solicitada** en `/aeo-2/` (AEO) o `/servicios/posicionamiento-seo/` (SEO).

| Métrica | Papel |
|---|---|
| Coste por informe entregado | **Intermedia.** Dice si la cuña funciona |
| **Coste por reunión agendada** | **La norte.** Es la que decide si se escala |
| Coste por cotización solicitada | La norte, en la rama de demanda caliente |

🔴 **Antes de pautear al agendamiento hay que cerrar la atribución.** PDR-009: la Scheduler API **no preserva
por sí sola UTK/UTM**. Sin la mitigación (GTM + Forms API con `context.hutk`), **se puede gastar y no saber qué
campaña trajo la reunión** — que es el peor escenario posible para un test de canal.

| | Destino | Verificado 2026-09-21 |
|---|---|---|
| **AEO** | **`/aeo-2/`** (`/servicios/aeo` redirige ahí) | ✅ 200 |
| **SEO** | **`/servicios/posicionamiento-seo/`** | ✅ 200 |
| **Contenidos** | **`/servicio-marketing-de-contenidos/`** | ✅ 200 |
| **Agendar** | **`/agenda/`** — scheduler nativo (PDR-009) | ✅ 200 |

🔴 **Las rutas NO siguen un patrón único: hay cuatro.** `/aeo-2/` sin prefijo · `/servicio-marketing-de-contenidos/`
singular con guión · `/servicios-contratar-hubspot/` plural con guión · `/servicios/posicionamiento-seo/` en
subcarpeta. **Inferir una ruta es adivinar** — seis variantes del patrón `/servicios/` dieron 404 mientras la
página existía. El inventario sale del REST de WordPress (`/wp-json/wp/v2/pages`), no de suposición.

✅ **La canónica de agendamiento es `/agenda/`** [operador, 2026-09-21]. El REST devuelve también `/agendar/`
(«¡Habla con un experto!»), que **no es destino de pauta**: no se usa en campañas ni se cuenta como conversión.

## Veredicto por plataforma (de la práctica, no de mi opinión)

| Canal | Veredicto | Para qué |
|---|---|---|
| **LinkedIn** | ✅ | Prospección fría por cargo. El comprador está ahí |
| **Meta** | ✅ **sólo** retargeting + lookalike | Mal targeting B2B en frío; el Grader sí es una oferta que Meta sabe mover |
| **Google al DOLOR** | ✅ y casi nadie lo hace | Queries de problema: el que las busca ya tiene el incendio |
| **Google a «agencia SEO»** | 🔴 **NO** | Intención comoditizada + CTR pagado −68% |

## La aritmética — por qué esto no es una apuesta

LTV: USD 3.000/mes × 18 meses × 55% margen = **USD 29.700 de margen bruto**.

| Coste por Grader | CAC | LTV:CAC |
|---|---|---|
| USD 30 | 500 | 59:1 |
| USD 100 | 1.667 | 18:1 |
| USD 150 | 2.500 | 12:1 |

⚠️ **Son HIPÓTESIS, no data** (supuesto: 30% acepta reunión, 20% de ésas cierra). **La lectura correcta no es
«vamos a hacer 59:1»** — es que incluso con los supuestos inflados 3×, el canal sigue funcionando. En el peor
escenario razonable (10% reunión, 10% cierre, lead a USD 100) queda en ~3:1, que es el umbral.

## 🔴 Dos guardrails antes de escalar

**1. El Grader cuesta plata real.** Cada corrida consume presupuesto: un run público real medido dio
**US$0,3067** de providers principales *antes* de extracción LLM, y el costo all-in suma extracción, DataForSEO
e infraestructura. **No usar «US$0,50 por run» como claim contable ni comercial** hasta que haya ledger
reconciliado. Un lead magnet gratis para el prospecto no es gratis para nosotros.

**2. Se testea antes de escalar.** USD 500–1.000 en LinkedIn + retargeting Meta durante 3 semanas, midiendo
coste por Grader, % que acepta reunión y % que cierra. **Recién con esos tres números se decide el escalado** —
los de la tabla son supuestos.

## Formatos por plataforma

| Plataforma | Formato | Receta |
|---|---|---|
| LinkedIn feed | **4:5** | `RECETA-POR-FORMATO.json` → `4:5` (el 1:1 está `sinValidar`) |
| Meta feed | 4:5 | idem |
| Stories / Reels | 9:16 | → `9:16` |
| YouTube / Display | 16:9 | → `16:9` |

## Lo que falta para poder lanzar

| # | Falta | Bloquea |
|---|---|---|
| 1 | Las 3 piezas de E3, E4 y E5 | Las etapas que convierten |
| 2 | Eventos `gh_grader_*` en GTM | Medir coste por informe, no por clic |
| 3 | Audiencias de retargeting creadas (Meta pixel + LinkedIn insight tag) | E3 y E4 completas |
| 4 | **Atribución del scheduler** (GTM + Forms API con `context.hutk`) | 🔴 **Medir reuniones por campaña** |

| 6 | Presupuesto y ventana de test aprobados | Todo |
