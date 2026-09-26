# Ads — Capítulo 3 «Lo que la IA dice de ti» → Brand Visibility Grader

> Narrativa: `EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md` · Destino: `think.efeoncepro.com/brand-visibility`
> Nivel de consciencia (Schwartz): **problem-aware al borde de unaware** — el comprador sabe que la IA
> responde por él, no sabe que puede medirlo. Framework: **PAS** (problema → agitación → salida).

## La gran idea

**Antes de hablar con tu equipo, ya te evaluó una IA.** Una sola por set. Todo lo demás la sirve.

## Copy por pieza

### b1 · 4:5 · Meta feed + LinkedIn · registro B
- **Titular (sobre el soffit):** Tu próximo cliente ya preguntó por ti.
- **Bajada:** No a tu equipo. A una IA.
- **CTA:** Mide qué responde
- **Caption:** Los motores de respuesta ya describen tu marca: qué haces, para quién y contra quién compites.
  A veces con precisión. A veces mezclando tu categoría con la del competidor. El Brand Visibility Grader mide
  presencia, citabilidad, exactitud y operabilidad, y te entrega el informe en pantalla. Privado.

### b2 · 9:16 · Stories/Reels · registro B
- **Titular (banda 10–32%):** La IA ya respondió por ti.
- **CTA:** Mira qué dijo
- **Caption:** Diagnóstico en cinco capas: que te encuentre, que te entienda, que te describa bien, que pueda
  actuar y que te prefiera. Sin conectar nada tuyo.

### b3 · 16:9 · Display / YouTube · registro B
- **Titular (columna izquierda 42%):** Antes de hablar con tu equipo, ya te evaluó una IA.
- **CTA:** Pide tu informe
- **Caption:** Mide dónde se corta la cadena entre presencia, comprensión, exactitud y recomendación.

### a1 · 4:5 · registro A · pieza MUDA (sólo foto + firma)
- **Caption:** Un hallazgo del informe: la fila donde el motor describe mal la categoría. Eso es lo que corregimos.
- Sin titular en la pieza. El copy vive en el caption. Es el descanso visual del set.

### a2 · 4:5 · registro A · pieza MUDA (sólo foto + firma)
- **Caption:** Esto es lo que un asistente responde hoy sobre una empresa. No lo escribió nadie de la empresa.

## Qué NO se promete (regla de honestidad — lo dice el propio grader)

El informe **orienta decisiones; no garantiza posiciones, menciones ni resultados comerciales.** Ningún copy
del set puede prometer ranking, aparición garantizada ni leads. «Mide», «diagnostica», «muestra» — nunca
«posiciona» ni «te hace aparecer».

## Medición

**Convención de evento (house style `gh_<object>_<action>`, dueña `growth-marketing-cro`):**
la conversión del set es la entrega del informe, no el clic.

| Paso | Evento | Dónde |
|---|---|---|
| Clic en el ad | `campaign_click` (auto por UTM) | GA4 |
| Abre el grader | `gh_grader_view` | GA4 / GTM `GTM-NGHPGRLZ` |
| Envía paso 1 (correo) | `gh_grader_lead_submit` | form → HubSpot |
| Informe en pantalla | `gh_grader_report_view` | GA4 |

**UTMs** — una por pieza, para poder leer registro y formato por separado:

```
utm_source=meta|linkedin|google
utm_medium=paid_social|display
utm_campaign=aeo_lo-que-la-ia-dice-de-ti_2026q4
utm_content=b1-reflejo-45 | b2-larga-916 | b3-larga-169 | a1-marcado-45 | a2-proyeccion-45
utm_term=documental|escena
```

`utm_term` separa los **dos registros fotográficos**: es la única forma de saber si el documental o la puesta
en escena trae mejor lead, que es la pregunta que este set puede responder y nadie ha medido todavía.

**HubSpot:** el lead entra por el form del grader; la atribución de campaña se lee en
`get_campaign_attribution_reports`. Portal `48713323`.

## Hipótesis a testear (ICE)

| Hipótesis | I | C | E | ICE |
|---|---|---|---|---|
| El registro documental (a1/a2, mudas) genera mejor CTR que la puesta en escena porque no parece un ad | 3 | 50% | alto | probar primero |
| El titular con «tu próximo cliente» (b1) supera al genérico (b3) por especificidad | 2 | 80% | alto | segundo |

Regla de la skill: sin tráfico para significancia en ≤4 semanas, esto NO es un A/B — es lectura direccional.
