# 03 · CRO + Optimización de sitios web ⭐

> El módulo más denso. Convertir el tráfico que ya tienes y optimizar el sitio.
> **Regla raíz:** el 80% del lift viene de **mensaje, relevancia y confianza** — no
> del color del botón. Diagnostica el mensaje antes de tocar píxeles.

## 0. Orden de trabajo CRO (no saltes pasos)

`research → hipótesis → priorizar (PXL) → test/implementar → medir → iterar`

1. **Research primero** (cuali + cuanti): dónde caen (analytics/funnel), qué hacen
   (heatmaps/session replay), qué piensan (encuestas on-site, reviews, voz del
   cliente). Nunca optimices a ciegas.
2. **Diagnostica con un framework heurístico** (LIFT/MECLABS/Fogg) para convertir
   observaciones en hipótesis con causa.
3. **Prioriza con PXL** (no ICE puro — reduce el sesgo optimista).
4. **Testea si hay tráfico**; si no, aplica cambios de alta confianza + research
   cualitativo (→ `04` para el umbral de tráfico).
5. **Mide** contra la métrica primaria + guardrails de calidad de lead/revenue.

## 1. Frameworks de diagnóstico (elige según el problema)

### LIFT Model (Chris Goward) — auditar una página
6 factores. La **propuesta de valor** es la base; los otros la potencian o frenan:

| Factor | Pregunta | Sube/baja |
|---|---|---|
| **Value Proposition** | ¿el beneficio > costo percibido, y es claro? | base |
| **Relevance** | ¿la página matchea la intención/fuente del visitante? | ↑ |
| **Clarity** | ¿la propuesta y el CTA se entienden en segundos? | ↑ |
| **Anxiety** | ¿hay dudas/miedos sin resolver (riesgo, privacidad, "¿y si…?")? | ↓ resta |
| **Distraction** | ¿elementos que compiten con la acción deseada? | ↓ resta |
| **Urgency** | ¿razón (interna o externa) para actuar ahora? | ↑ |

Úsalo como checklist de teardown (→ `templates/landing-page-teardown.md`).

### MECLABS Conversion Sequence Heuristic — dónde poner el esfuerzo
`C = 4m + 3v + 2(i−f) − 2a` (relativa, no literal): **motivación (m)** y **claridad
de la propuesta de valor (v)** son las palancas de mayor peso; incentivo (i),
fricción (f) y ansiedad (a) pesan menos. Lección: casi siempre rinde más **clarificar
la propuesta y hablarle a la motivación existente** que agregar incentivos o quitar un
campo. No puedes crear motivación en la página; puedes *canalizar* la que ya trae el
visitante (por eso la relevancia fuente→página es crítica).

### Fogg Behavior Model — por qué no actúan
`B = MAP`: la conducta ocurre cuando convergen **Motivación, Ability (facilidad) y
Prompt (disparador)**. Si no convierten: o falta motivación (mensaje/oferta), o
sobra fricción (baja Ability → simplifica), o falta un prompt claro (CTA visible en
el momento correcto). Diagnóstico rápido de un paso muerto.

## 2. Anatomía de una landing/página que convierte

De arriba hacia abajo, cada bloque con su trabajo:

1. **Above the fold (los primeros ~50ms deciden confianza):**
   - **Headline = propuesta de valor** clara y específica (qué, para quién, por qué
     mejor). No lema poético; claridad > creatividad.
   - **Sub-headline** que aterriza el cómo/beneficio.
   - **CTA primario** visible, con copy de acción y de valor ("Ver mi diagnóstico
     gratis" > "Enviar").
   - **Trust signal inmediato** (rating, cliente reconocido, dato de resultado).
   - **Imagen/visual** que muestra el producto/valor, no stock decorativo.
   - **Relevancia con la fuente:** el mensaje continúa el del anuncio/email que trajo
     al visitante (message match). Un mismatch aquí mata la conversión antes del H1.
2. **Prueba y credibilidad:** social proof (ver §4), casos, números de resultado.
3. **Cómo funciona / beneficios:** beneficios (no features) mapeados al problema.
4. **Manejo de objeciones (reduce ansiedad):** FAQ, garantía, seguridad/privacidad,
   "sin tarjeta", política de cancelación.
5. **CTA de cierre** repetido, mismo verbo, sin nuevas distracciones.

**Un objetivo por página.** Una landing con 5 CTAs distintos no convierte a ninguno.
Quita navegación y links de fuga en landings de campaña (distraction del LIFT).

## 3. Copy y CTA

- **Claridad sobre ingenio.** El visitante escanea; escribe para escaneo (F-pattern):
  headline > subhead > bullets de beneficio > CTA.
- **Beneficios, no features.** "Sabe en 60s cómo te ve la IA" > "motor de scoring
  multi-proveedor".
- **CTA = acción + valor + primera persona** cuando aplique. Reduce ansiedad al lado
  del botón ("gratis, sin tarjeta, 2 min").
- **Especificidad convierte.** Números, nombres, resultados concretos > adjetivos.
- Copy visible del portal/sitio se valida con **`greenhouse-ux-writing`** (tono es-CL);
  aquí decides el *ángulo de mensaje*, esa skill el *wording final*.

## 4. Trust signals & social proof (palanca de primer orden en 2026)

Los juicios de confianza se forman en ~50ms; si faltan above-the-fold, pierdes al
visitante antes del headline. **El placement importa tanto como la presencia** — la
misma señal puede subir conversión en una página y bajarla en otra.

**Cinco familias de trust signals** (coloca cada una donde vive la duda):
1. **Reviews/ratings** (Google, Trustpilot, G2). Ojo: rating percibido óptimo **4.2–4.5**,
   no 5.0 (el "perfecto" parece falso). Reviews con crítica constructiva convierten
   mejor que perfección artificial.
2. **Seguridad de pago** (logos de medios, SSL, PCI) — inline con los campos de pago.
   Trust signals junto al campo de pago → +18% de completación.
3. **Certificaciones/membresías** del sector.
4. **Social proof / UGC:** testimonios (video/foto > texto: hasta +80%; foto/video se
   confían ~12× más que texto), casos con nombre, menciones de prensa, contadores
   *reales*.
5. **Trust técnico:** contacto visible, pricing transparente, política de cancelación clara.

**Regla de autenticidad 2026:** prueba verificable, con nombre y específica > pared de
logos genéricos + score perfecto. Reseñas fabricadas = riesgo legal (FTC) y de marca.
Escasez/urgencia solo si es **real** (scarcity falsa = dark pattern, ver `ANTIPATTERNS`).

## 5. Velocidad = conversión (no es "solo SEO")

Impacto directo en negocio (*as-of 2026, reverificar*):
- **+100ms de carga ≈ −1% conversión**; **1s de delay ≈ −7%**. Casos: LCP bueno →
  +33% conversión / +53% revenue/visitante (Rakuten 24); prerender → +101% conversión
  mobile en PDP (Ray-Ban con Speculation Rules API).
- **Core Web Vitals 2026:** LCP umbral bajó a **2.0s** (mar-2026), INP **<200ms** (señal
  plena; es el vital más fallado, ~43% no pasa), CLS estable. Solo ~42% de sites mobile
  pasan los tres. **Mobile = ~62% del tráfico e-commerce** → el gap mobile es el de
  mayor costo.

La **implementación técnica** de CWV (bundle, imágenes, lazy-load, prerender) es de las
skills de frontend/`seo-aeo`; aquí el punto es **priorizar velocidad como palanca de
conversión de primer orden**, con un número de negocio detrás.

## 6. Formularios (cada campo cuesta conversión)

- **Menos campos.** 4→3 campos ≈ **+50%**. Pide solo lo que usarás hoy; enriquece el
  resto después (progressive profiling, enrichment).
- **Un pensamiento por pantalla** en flujos largos: multi-step con progreso reduce
  la carga percibida y sube completación en formularios complejos.
- **Reduce fricción:** autofill (`autocomplete`), address autocomplete, máscaras
  (RUT/teléfono/moneda), validación inline (onBlur tras el primer intento, no onChange
  agresivo), errores accionables al lado del campo.
- **Ansiedad:** micro-copy de privacidad junto a email/teléfono, "sin spam",
  gate de email corporativo solo si el negocio lo exige (no como fricción gratuita).
- La *construcción* del formulario en el repo se hace con **`forms-ux`** + el forms
  engine (`efeonce/GROWTH_FORMS_LEAD_CAPTURE.md`). Aquí decides qué pedir y cuándo.

## 7. Checkout (e-commerce / self-serve)

- Promedio ~5.1 pasos / 11.3 campos; **22% abandona por complejidad**. Objetivo: 6–8
  campos, guest checkout, address autocomplete.
- **Extra costs = 39% del abandono** (impuestos/fees/envío que aparecen tarde).
  Muestra el total real temprano; sin sorpresas.
- **1-click / wallets** (+16–21%): Apple/Google Pay, BNPL cuando aplique.
- **Mobile:** diseño para una mano, thumb-zone, botones ≥44px, carga <1.2s.
- Trust signals inline con el pago (§4). Digital wallets + guest + autocomplete son el
  trío de mayor rendimiento.

## 8. Personalización & IA en CRO (2026)

- Personalización adaptativa (headline/oferta/CTA por intención/comportamiento/contexto)
  → **+10–20% conversión** reportado (B2B y B2C, *reverificar*).
- Post-cookie: **zero-party data** (el usuario comparte preferencias a cambio de valor,
  a menudo vía IA conversacional como "value-exchange broker").
- IA acelera el *análisis* (síntesis de sesiones, generación de hipótesis, variantes)
  — úsala para el trabajo analítico, reserva el juicio estratégico para humanos. La
  personalización no sustituye message-market fit: si el mensaje base no convierte,
  personalizar ruido da ruido personalizado.
- **Guardrail:** personalización ≠ dark pattern ni discriminación de precio opaca;
  respeta consentimiento y PII (→ `ANTIPATTERNS`, Ley 21.719 en overlay).

## 9. Priorización CRO con PXL (CXL)

En vez de "Impact" subjetivo, PXL puntúa evidencia + potencial:
- ¿El cambio está **above the fold**? ¿Es **notable en <5s**? ¿**Agrega/quita** un
  elemento (no solo mueve)? ¿Corre en **página de alto tráfico**? ¿Ataca **motivación**?
  ¿Respaldado por **research** (heatmap/survey/analytics)?
Suma binaria/ponderada → ordena el backlog de tests. Menos sesgo optimista que ICE.

## Checklist de salida (CRO / web)

- [ ] Research cuali+cuanti hecho (no optimización a ciegas).
- [ ] Diagnóstico con LIFT/MECLABS/Fogg → hipótesis con causa.
- [ ] Above-the-fold: propuesta de valor clara + trust + message match con la fuente.
- [ ] Un objetivo por página; distracciones/navegación de fuga eliminadas en campañas.
- [ ] Trust/social proof auténtico, colocado donde vive la duda.
- [ ] Velocidad tratada como palanca de conversión (número de negocio detrás).
- [ ] Formularios/checkout con mínimo de campos + fricción reducida + costos temprano.
- [ ] Backlog priorizado con PXL; plan de test/medición (→ `04`, `07`).

## Cross-links

- Diseñar el experimento del cambio → `04_EXPERIMENTATION.md`
- Medir el resultado / instrumentar → `07_MEASUREMENT_ANALYTICS.md`
- Implementar en el repo/sitio → `forms-ux`, `modern-ui`, `greenhouse-ux`,
  `state-design`, `greenhouse-ux-writing`, `motion-design` + GVC
- CWV/schema técnico y "ser hallado por IA" → skill `seo-aeo`
- Caso del sitio público Efeonce → `efeonce/CRO_PUBLIC_SITE.md`
- Artefactos → `templates/landing-page-teardown.md`, `templates/cro-audit-checklist.md`
